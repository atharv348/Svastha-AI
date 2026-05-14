import io
import json
import re
from typing import Any, List, Optional

import pypdf
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from sqlalchemy.orm import Session

from app.db.database import ChatMessage, ClinicalPrediction, GrowthRecord, Prediction, User, get_db
from app.schemas import ChatMessageResponse
from app.services.groq_service import generate_ai_content

from .users import get_current_user

router = APIRouter(tags=["coach"])

AI_HUB_PROMPT = """
You are AI Hub for VaidyaAI.
Return valid JSON in a fenced ```json block only.
Detect intent as one of: combined, meal, workout, answer.

For combined: type, summary, workout, meal, coachNote.
For meal: type, summary, meal, coachNote.
For workout: type, summary, workout, coachNote.
For answer: type, answer, tips, followUp.

Keep guidance concise and practical. Use Indian meal/workout context.
"""

MEAL_KEYWORDS = {"meal", "diet", "nutrition", "food", "kcal", "calorie", "protein", "carb", "fat"}
WORKOUT_KEYWORDS = {"workout", "exercise", "training", "gym", "cardio", "strength", "sets", "reps", "muscle"}


def _json_load_maybe_list(raw_value: Any) -> list[str]:
    if raw_value is None:
        return []
    if isinstance(raw_value, list):
        return [str(v).strip() for v in raw_value if str(v).strip()]
    if not isinstance(raw_value, str):
        return [str(raw_value)]

    text = raw_value.strip()
    if not text:
        return []

    try:
        parsed = json.loads(text)
        if isinstance(parsed, list):
            return [str(v).strip() for v in parsed if str(v).strip()]
    except Exception:
        pass

    return [v.strip() for v in text.split(",") if v.strip()]


def _detect_intent(prompt: str) -> str:
    text = prompt.lower()
    meal_hits = any(k in text for k in MEAL_KEYWORDS)
    workout_hits = any(k in text for k in WORKOUT_KEYWORDS)
    if meal_hits and workout_hits:
        return "combined"
    if any(x in text for x in ["combined", "full plan", "meal and workout", "workout and meal", "both"]):
        return "combined"
    if meal_hits:
        return "meal"
    if workout_hits:
        return "workout"
    return "answer"


def _extract_json_payload(text: str) -> Optional[dict[str, Any]]:
    if not text:
        return None

    fenced = re.search(r"```json\s*([\s\S]*?)```", text, flags=re.IGNORECASE)
    if fenced:
        try:
            payload = json.loads(fenced.group(1).strip())
            return payload if isinstance(payload, dict) else None
        except Exception:
            pass

    raw = text.strip()
    if raw.startswith("{"):
        try:
            payload = json.loads(raw)
            return payload if isinstance(payload, dict) else None
        except Exception:
            pass

    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        try:
            payload = json.loads(text[start : end + 1])
            return payload if isinstance(payload, dict) else None
        except Exception:
            pass

    return None


def _fallback_payload(intent: str, user_name: str) -> dict[str, Any]:
    meal = {
        "totalCalories": "1900",
        "macros": {"protein": "30%", "carbs": "40%", "fats": "30%"},
        "meals": [
            {"label": "Breakfast", "food": "Vegetable oats upma + curd", "qty": "1 bowl", "calories": "380", "protein": "18"},
            {"label": "Lunch", "food": "Dal, roti, mixed sabzi, salad", "qty": "1 plate", "calories": "520", "protein": "24"},
            {"label": "Snack", "food": "Roasted chana + fruit", "qty": "1 serving", "calories": "220", "protein": "10"},
            {"label": "Dinner", "food": "Paneer bhurji + millet roti", "qty": "1 plate", "calories": "540", "protein": "30"},
        ],
    }

    workout = {
        "days": [
            {"day": "Mon", "focus": "Upper Body", "isRest": False, "rest": "60-90s", "exercises": [{"name": "Push-ups", "note": "Chest and triceps", "sets": "3x10"}, {"name": "Rows", "note": "Back", "sets": "3x12"}]},
            {"day": "Tue", "focus": "Lower Body", "isRest": False, "rest": "60-90s", "exercises": [{"name": "Squats", "note": "Quads and glutes", "sets": "3x12"}, {"name": "Lunges", "note": "Leg stability", "sets": "3x10"}]},
            {"day": "Wed", "focus": "Recovery", "isRest": True, "rest": "-", "exercises": []},
            {"day": "Thu", "focus": "Core + Cardio", "isRest": False, "rest": "45-60s", "exercises": [{"name": "Plank", "note": "Core", "sets": "3x40s"}, {"name": "Brisk walk", "note": "Cardio", "sets": "25 min"}]},
            {"day": "Fri", "focus": "Full Body", "isRest": False, "rest": "60-90s", "exercises": [{"name": "Overhead press", "note": "Shoulders", "sets": "3x10"}]},
        ]
    }

    if intent == "meal":
        return {
            "type": "meal",
            "summary": [{"value": "1900", "label": "kcal per day"}, {"value": "30%", "label": "Protein"}, {"value": "40%", "label": "Carbs"}, {"value": "30%", "label": "Fats"}],
            "meal": meal,
            "coachNote": ["Keep hydration around 2.5L/day.", "Prioritize protein at breakfast.", "Meal prep twice weekly."],
        }

    if intent == "workout":
        return {
            "type": "workout",
            "summary": [{"value": "5", "label": "Training days"}, {"value": "45 min", "label": "Session length"}, {"value": "2", "label": "Rest days"}],
            "workout": workout,
            "coachNote": [f"{user_name}, keep one day easy for recovery.", "Track reps weekly.", "Hydrate before and after sessions."],
        }

    if intent == "combined":
        return {
            "type": "combined",
            "summary": [{"value": "1900", "label": "kcal per day"}, {"value": "30%", "label": "Protein"}, {"value": "5", "label": "Workout days"}, {"value": "7", "label": "Day plan"}],
            "workout": workout,
            "meal": meal,
            "coachNote": [f"{user_name}, align protein meals near workouts.", "Sleep in a fixed window.", "Focus on consistency over perfection."],
        }

    return {
        "type": "answer",
        "answer": "You can improve your health with small, repeatable actions. Start with one consistent habit this week.",
        "tips": ["Sleep 7-8 hours with fixed timing.", "Aim for 20-30 minutes of daily movement.", "Prioritize protein in major meals."],
        "followUp": "Would you like a meal plan, workout plan, or both?",
    }


def _normalize_payload(payload: Optional[dict[str, Any]], intent: str, user_name: str) -> dict[str, Any]:
    if not isinstance(payload, dict):
        return _fallback_payload(intent, user_name)

    payload_type = str(payload.get("type", intent)).strip().lower()
    if payload_type == "question":
        payload_type = "answer"

    if payload_type not in {"combined", "meal", "workout", "answer"}:
        payload_type = intent

    if payload_type == "answer":
        answer = str(payload.get("answer", "")).strip()
        tips = payload.get("tips", []) if isinstance(payload.get("tips"), list) else []
        follow_up = str(payload.get("followUp", "")).strip()
        if not answer:
            return _fallback_payload("answer", user_name)
        clean_tips = [str(t).strip() for t in tips[:4] if str(t).strip()]
        if not clean_tips:
            clean_tips = ["Start with one habit you can maintain for 7 days."]
        if not follow_up:
            follow_up = "Would you like a meal plan, workout plan, or a combined plan?"
        return {"type": "answer", "answer": answer, "tips": clean_tips, "followUp": follow_up}

    fallback = _fallback_payload(payload_type, user_name)
    summary = payload.get("summary") if isinstance(payload.get("summary"), list) else fallback.get("summary", [])
    coach_note = payload.get("coachNote") if isinstance(payload.get("coachNote"), list) else fallback.get("coachNote", [])

    if payload_type == "meal":
        meal = payload.get("meal") if isinstance(payload.get("meal"), dict) else fallback["meal"]
        return {"type": "meal", "summary": summary, "meal": meal, "coachNote": coach_note}

    if payload_type == "workout":
        workout = payload.get("workout") if isinstance(payload.get("workout"), dict) else fallback["workout"]
        return {"type": "workout", "summary": summary, "workout": workout, "coachNote": coach_note}

    workout = payload.get("workout") if isinstance(payload.get("workout"), dict) else fallback["workout"]
    meal = payload.get("meal") if isinstance(payload.get("meal"), dict) else fallback["meal"]
    return {"type": "combined", "summary": summary, "workout": workout, "meal": meal, "coachNote": coach_note}


def _as_fenced_json(payload: dict[str, Any]) -> str:
    return f"```json\n{json.dumps(payload, indent=2)}\n```"


def _safe_metric(value: Any, digits: int = 2, fallback: str = "NA") -> str:
    try:
        if value is None:
            return fallback
        return f"{float(value):.{digits}f}"
    except Exception:
        return fallback


def _build_unified_report(db: Session, user: User) -> str:
    clinical_context = "No clinical data available."
    latest_clinical = db.query(ClinicalPrediction).filter(ClinicalPrediction.user_id == user.id).order_by(ClinicalPrediction.created_at.desc()).first()
    if latest_clinical:
        try:
            risks = json.loads(latest_clinical.risks_json or "[]")
            risk_text = ", ".join(
                f"{r.get('disease', 'unknown')}: {r.get('risk_percentage', 0)}% ({r.get('status', 'unknown')})"
                for r in risks
                if isinstance(r, dict)
            )
            if risk_text:
                clinical_context = f"{risk_text} | BMI {latest_clinical.bmi:.1f}"
        except Exception:
            pass

    scan_context = "No recent scan data available."
    latest_scan = db.query(Prediction).filter(Prediction.user_id == user.id).order_by(Prediction.created_at.desc()).first()
    if latest_scan:
        scan_context = f"{latest_scan.body_part}: {latest_scan.predicted_name} ({latest_scan.confidence * 100:.1f}% confidence, {latest_scan.priority} priority)"

    growth_context = "No growth record available."
    latest_growth = db.query(GrowthRecord).filter(GrowthRecord.user_id == user.id).order_by(GrowthRecord.created_at.desc()).first()
    if latest_growth:
        growth_context = (
            f"Status {latest_growth.status or 'Unknown'}, "
            f"WAZ {_safe_metric(latest_growth.waz)}, "
            f"HAZ {_safe_metric(latest_growth.haz)}, "
            f"WHZ {_safe_metric(latest_growth.whz)}"
        )

    return "1) Clinical Risks: " + clinical_context + "\n2) Diagnostic Scan: " + scan_context + "\n3) Growth: " + growth_context


def _generate_ai_hub_output(prompt: str, unified_report: str, user: User) -> str:
    intent = _detect_intent(prompt)
    user_name = user.full_name or user.username or "User"

    health_conditions = ", ".join(_json_load_maybe_list(user.health_conditions)) or "None"
    dietary = ", ".join(_json_load_maybe_list(user.dietary_restrictions)) or "No restriction"

    system_prompt = AI_HUB_PROMPT + "\n\n" + (
        f"Profile: Name={user_name}, Age={user.age}, Gender={user.gender}, Height={user.height}, CurrentWeight={user.current_weight}, "
        f"TargetWeight={user.target_weight}, Goal={user.fitness_goal}, FitnessLevel={user.fitness_level}, "
        f"Diet={dietary}, Conditions={health_conditions}, Language={user.preferred_language}\n"
        f"Unified Report:\n{unified_report}"
    )

    raw_response = generate_ai_content(prompt=prompt, system_prompt=system_prompt)
    payload = _extract_json_payload(raw_response)
    normalized = _normalize_payload(payload, intent=intent, user_name=user_name)
    return _as_fenced_json(normalized)


@router.post("/coach/chat")
async def chat_with_coach(
    request_raw: Request,
    prompt: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resolved_prompt = (prompt or "").strip()
    if not resolved_prompt:
        try:
            json_payload = await request_raw.json()
            if isinstance(json_payload, dict):
                resolved_prompt = str(json_payload.get("prompt", "")).strip()
        except Exception:
            resolved_prompt = ""

    if not resolved_prompt:
        raise HTTPException(status_code=422, detail="Prompt is required")

    extracted_text = ""
    if file:
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are supported")
        try:
            content = await file.read()
            pdf_reader = pypdf.PdfReader(io.BytesIO(content))
            for page in pdf_reader.pages:
                extracted_text += (page.extract_text() or "") + "\n"
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Failed to parse PDF: {exc}")

    final_prompt = resolved_prompt
    if extracted_text:
        file_name = file.filename if file else "uploaded PDF"
        final_prompt = f"User uploaded file: {file_name}\nExtracted report text:\n{extracted_text}\nUser message: {resolved_prompt}"

    db.add(
        ChatMessage(
            user_id=current_user.id,
            chat_type="coach",
            role="user",
            content=f"[Attached: {file.filename}] {resolved_prompt}" if file else resolved_prompt,
        )
    )

    unified_report = _build_unified_report(db, current_user)
    response = _generate_ai_hub_output(final_prompt, unified_report, current_user)

    db.add(ChatMessage(user_id=current_user.id, chat_type="coach", role="assistant", content=response))
    db.commit()
    return {"response": response}


@router.get("/coach/history", response_model=List[ChatMessageResponse])
def get_chat_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 50,
):
    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.user_id == current_user.id, ChatMessage.chat_type == "coach")
        .order_by(ChatMessage.timestamp.desc())
        .limit(limit)
        .all()
    )
    return list(reversed(messages))


@router.delete("/coach/history")
def clear_chat_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.query(ChatMessage).filter(ChatMessage.user_id == current_user.id, ChatMessage.chat_type == "coach").delete()
    db.commit()
    return {"message": "Chat history cleared successfully"}


@router.post("/coach/rate/{message_id}")
def rate_chat_message(
    message_id: int,
    rating: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not 1 <= rating <= 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    message = db.query(ChatMessage).filter(ChatMessage.id == message_id, ChatMessage.user_id == current_user.id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    message.rating = rating
    db.commit()
    return {"message": "Rating updated successfully"}
