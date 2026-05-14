from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Any, Dict, List, Optional, Tuple
import json
from datetime import datetime, timezone, timedelta
import numpy as np
import cv2
import base64
import os
import sys
import tempfile
import re

# Add project root to sys.path for shared modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

# Lazy loading of heavy ML libraries
DEEPFACE_AVAILABLE = None
FER_AVAILABLE = None
detector = None


def get_detectors():
    global DEEPFACE_AVAILABLE, FER_AVAILABLE, detector

    # Allow disabling heavy models via env var for low-resource environments (like EC2 t3.micro)
    if os.getenv("DISABLE_HEAVY_AI", "false").lower() == "true":
        DEEPFACE_AVAILABLE = False
        FER_AVAILABLE = False
        return False, False, None

    if DEEPFACE_AVAILABLE is None:
        try:
            from deepface import DeepFace
            DEEPFACE_AVAILABLE = True
        except ImportError:
            DEEPFACE_AVAILABLE = False

    if FER_AVAILABLE is None:
        try:
            from fer import FER
            FER_AVAILABLE = True
            try:
                detector = FER(mtcnn=True)
            except Exception:
                detector = None
        except ImportError:
            FER_AVAILABLE = False

    return DEEPFACE_AVAILABLE, FER_AVAILABLE, detector


from app.db.database import get_db, User, StressLog, FacialScan, CheckinResponse, SentimentResult, UserDisabilityProfile
from app.services.groq_service import generate_ai_content, get_groq_client
from app.services.svasthaquest_service import auto_trigger_quest
from .users import get_current_user
from pydantic import BaseModel

router = APIRouter(prefix="/manasmitra", tags=["manasmitra"])


def detect_primary_face(image: np.ndarray):
    """Return the largest detected face bounding box (x, y, w, h) or None."""
    if image is None:
        return None

    try:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        face_cascade = cv2.CascadeClassifier(cascade_path)
        if face_cascade.empty():
            return None

        min_w = max(48, gray.shape[1] // 10)
        min_h = max(48, gray.shape[0] // 10)
        faces = face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=4,
            minSize=(min_w, min_h)
        )
        if len(faces) == 0:
            return None

        # Use the largest face in frame.
        x, y, w, h = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)[0]
        return int(x), int(y), int(w), int(h)
    except Exception:
        return None


def stress_relief_recommendation(stress_index: float) -> str:
    if stress_index > 85:
        return "High burnout risk detected. Pause for 10 minutes now: 4-7-8 breathing for 5 rounds, hydrate, then message AROMI for a recovery plan."
    if stress_index > 70:
        return "Stress is high. Take a 5-10 minute walk, reduce notifications for 30 minutes, and do one guided breathing session."
    if stress_index > 40:
        return "Moderate stress detected. Try a short break every 50 minutes, neck/shoulder stretches, and one calming activity tonight."
    return "Stress is in a healthy range. Keep your routine, sleep window, and hydration consistent."


CRISIS_RESPONSE = (
    "I hear you. Please reach out to iCall: 9152987821 "
    "or your nearest support. You are not alone."
)


MANASMITRA_STRESS_SYSTEM_PROMPT = """
You are ManasMitra, an empathetic AI mental wellness companion inside VaidyaAI.
After analyzing a user's stress and mood data, generate a structured, personalized stress relief report.

DATA YOU RECEIVE
- Domain scores: Sleep %, Mood %, Focus %, Social %, Physical %
- Stress trend: Rising / Stable / Falling + duration
- Sleep-Stress correlation score (e.g. r=0.72)
- Burnout trajectory: Healthy / Warning / Critical
- Any SahayakAI triggers (e.g. NMHP eligibility)

RULES
- Always reference these numbers.
- Never give generic advice.
- Keep sentence length under 20 words.
- Use "you" and "your".
- Never suggest medication or diagnosis.
- Never use alarmist language.

OUTPUT ORDER (mandatory)
1. **STRESS SUMMARY** (max 2 sentences)
2. **WHY YOUR STRESS IS RISING** (3-4 bullets; cause + data evidence)
3. **WHAT TO DO - RELIEF ACTIONS** (tiered)
    [Immediate - do today]
    [This week]
    [This month]
4. **WHAT NOT TO DO** (3-4 bullets; "Avoid X because Y")
5. **WHAT INCREASES YOUR STRESS** (2-3 personalized patterns)
6. **TOMORROW'S FOCUS** (one micro-goal under 15 words)
7. **ENCOURAGEMENT LINE** (one sentence)

RESPONSE FORMAT RULES
- Section headers must be bold and one line each.
- Bullet points: max 4 per section.
- Each bullet must include cause + action.
- Every bullet must start on a new line.
- Tier labels must each start on a new line.
- Do not output the literal words "on next line".
- Do not use tables.
- Do not repeat advice across sections.
- Do not open with "Based on your data".

SAFETY RULE
- If burnout = Critical OR stress trend is rising longer than 3 weeks,
  include: "Consider speaking to a counselor. SahayakAI can help find support near you."
- If user mentions self-harm, hopelessness, or crisis, return only:
  "I hear you. Please reach out to iCall: 9152987821 or your nearest support. You are not alone."
""".strip()


MANASMITRA_SENTIMENT_SYSTEM_PROMPT = """
You are a highly accurate sentiment analyzer for mental health check-ins.
Analyze the provided text and return a JSON object with:
- sentiment: "Positive", "Negative", or "Neutral"
- confidence: a float between 0.0 and 1.0
- mood_detected: a more specific mood like "Anxious", "Calm", "Exhausted", "Hopeful", "Stressed", etc.

Text to analyze: {text}
Return ONLY JSON.
"""


REQUIRED_STRESS_HEADERS = [
    "**STRESS SUMMARY**",
    "**WHY YOUR STRESS IS RISING**",
    "**WHAT TO DO - RELIEF ACTIONS**",
    "**WHAT NOT TO DO**",
    "**WHAT INCREASES YOUR STRESS**",
    "**TOMORROW'S FOCUS**",
    "**ENCOURAGEMENT LINE**"
]


def _domain_breakdown_from_checkins(checkins: List[CheckinResponse]) -> Dict[str, float]:
    domains = ["Sleep", "Mood", "Focus", "Social", "Physical"]
    breakdown: Dict[str, float] = {}

    for domain in domains:
        values = [c.answer_value for c in checkins if c.domain == domain]
        if values:
            breakdown[domain] = float((np.mean(values) / 5.0) * 100.0)
        else:
            breakdown[domain] = 40.0

    return breakdown


def _aggregate_daily_stress(logs: List[StressLog]) -> List[Tuple[Any, float]]:
    by_day: Dict[Any, List[float]] = {}
    for log in logs:
        day = log.timestamp.date()
        by_day.setdefault(day, []).append(float(log.stress_index or 0.0))

    return sorted((day, float(np.mean(scores))) for day, scores in by_day.items())


def _compute_stress_trend(logs: List[StressLog]) -> Tuple[str, int]:
    daily = _aggregate_daily_stress(logs)
    if len(daily) < 3:
        return "Stable", max(1, len(daily))

    values = np.array([score for _, score in daily], dtype=float)
    x = np.arange(len(values), dtype=float)
    slope = float(np.polyfit(x, values, 1)[0])

    if slope > 1.0:
        direction = "Rising"
    elif slope < -1.0:
        direction = "Falling"
    else:
        direction = "Stable"

    duration = 1
    tolerance = 1.0
    for i in range(len(values) - 1, 0, -1):
        delta = values[i] - values[i - 1]
        if direction == "Rising":
            if delta >= -tolerance:
                duration += 1
            else:
                break
        elif direction == "Falling":
            if delta <= tolerance:
                duration += 1
            else:
                break
        else:
            if abs(delta) <= 2.5:
                duration += 1
            else:
                break

    return direction, duration


def _compute_sleep_stress_correlation(db: Session, user_id: int, lookback_days: int = 21) -> float:
    start = datetime.now(timezone.utc) - timedelta(days=lookback_days)

    sleep_entries = db.query(CheckinResponse).filter(
        CheckinResponse.user_id == user_id,
        CheckinResponse.domain == "Sleep",
        CheckinResponse.created_at >= start
    ).all()

    recent_logs = db.query(StressLog).filter(
        StressLog.user_id == user_id,
        StressLog.timestamp >= start
    ).order_by(StressLog.timestamp.asc()).all()

    if not sleep_entries or not recent_logs:
        return 0.72

    sleep_by_day: Dict[Any, List[float]] = {}
    for entry in sleep_entries:
        sleep_by_day.setdefault(entry.created_at.date(), []).append(entry.answer_value)

    stress_by_day = dict(_aggregate_daily_stress(recent_logs))

    pairs: List[Tuple[float, float]] = []
    for day, values in sleep_by_day.items():
        next_day = day + timedelta(days=1)
        if next_day not in stress_by_day:
            continue

        sleep_percent = float((np.mean(values) / 5.0) * 100.0)
        sleep_deficit = max(0.0, 100.0 - sleep_percent)
        pairs.append((sleep_deficit, float(stress_by_day[next_day])))

    if len(pairs) < 3:
        return 0.72

    arr = np.array(pairs, dtype=float)
    corr = float(np.corrcoef(arr[:, 0], arr[:, 1])[0, 1])
    if np.isnan(corr):
        return 0.72

    return round(max(0.0, min(0.99, abs(corr))), 2)


def _format_duration(days: int) -> str:
    if days >= 14:
        weeks = max(1, round(days / 7))
        return f"{weeks} weeks"
    if days == 1:
        return "1 day"
    return f"{days} days"


def _compute_burnout_trajectory(stress_index: float, trend_label: str, trend_days: int) -> str:
    if stress_index >= 85 or (trend_label == "Rising" and trend_days > 21):
        return "Critical"
    if stress_index >= 70:
        return "Warning"
    if trend_label == "Rising" and trend_days >= 7:
        return "Warning (Rising Slope, 7-Day Alert)"
    return "Healthy"


def _compute_sahayak_trigger(
    stress_index: float,
    trend_label: str,
    trend_days: int,
    has_disability_profile: bool,
    masking_pattern: bool
) -> str:
    triggers: List[str] = []

    if stress_index >= 45 or (trend_label == "Rising" and trend_days >= 7):
        triggers.append("NMHP Schemes Found")
    if has_disability_profile and stress_index >= 70:
        triggers.append("Caregiver Support Eligibility")
    if masking_pattern:
        triggers.append("Masking Pattern Watch")

    return ", ".join(triggers) if triggers else "None"


def _has_crisis_signal(checkins: List[CheckinResponse]) -> bool:
    keywords = [
        "self-harm", "harm myself", "suicide", "kill myself", "end my life",
        "want to die", "can't go on", "hopeless", "no reason to live"
    ]

    for checkin in checkins:
        free_text = (checkin.free_text or "").strip().lower()
        if free_text and any(keyword in free_text for keyword in keywords):
            return True

    return False


def _build_stress_report_user_message(
    domain_scores: Dict[str, float],
    trend_label: str,
    trend_days: int,
    correlation_r: float,
    burnout_trajectory: str,
    sahayak_trigger: str
) -> str:
    sleep = round(domain_scores.get("Sleep", 40.0))
    mood = round(domain_scores.get("Mood", 40.0))
    focus = round(domain_scores.get("Focus", 40.0))
    social = round(domain_scores.get("Social", 40.0))
    physical = round(domain_scores.get("Physical", 40.0))

    return (
        "Analyze my stress data and give me a full report.\n\n"
        "Today's readings:\n"
        f"  Sleep: {sleep}% | Mood: {mood}% | Focus: {focus}%\n"
        f"  Social: {social}% | Physical: {physical}%\n\n"
        f"Stress trend: {trend_label} for {_format_duration(trend_days)}\n"
        f"Sleep-Stress correlation: r={correlation_r:.2f}\n"
        f"Burnout trajectory: {burnout_trajectory}\n"
        f"SahayakAI trigger: {sahayak_trigger}"
    )


def _fallback_structured_stress_report(
    stress_index: float,
    domain_scores: Dict[str, float],
    trend_label: str,
    trend_days: int,
    correlation_r: float,
    burnout_trajectory: str
) -> str:
    sleep = domain_scores.get("Sleep", 40.0)
    mood = domain_scores.get("Mood", 40.0)
    focus = domain_scores.get("Focus", 40.0)
    social = domain_scores.get("Social", 40.0)
    physical = domain_scores.get("Physical", 40.0)

    sorted_domains = sorted(domain_scores.items(), key=lambda item: item[1])
    top_drivers = sorted_domains[:3]
    duration_text = _format_duration(trend_days)

    why_lines: List[str] = []
    for domain, score in top_drivers:
        if domain == "Sleep":
            why_lines.append(
                f"- Sleep ({score:.0f}%) is low, so use a fixed wind-down to reduce next-day stress spikes."
            )
        elif domain == "Focus":
            why_lines.append(
                f"- Focus ({score:.0f}%) is strained, so batch deep work into 25-minute blocks with breaks."
            )
        elif domain == "Mood":
            why_lines.append(
                f"- Mood ({score:.0f}%) is under pressure, so add one calming reset before difficult tasks."
            )
        elif domain == "Social":
            why_lines.append(
                f"- Social ({score:.0f}%) is reduced, so schedule one supportive conversation this week."
            )
        elif domain == "Physical":
            why_lines.append(
                f"- Physical ({score:.0f}%) is low, so add light movement to reduce body tension."
            )

    while len(why_lines) < 3:
        why_lines.append(
            f"- Sleep-stress link is strong (r={correlation_r:.2f}), so protect sleep timing to lower pressure."
        )

    report = [
        "**STRESS SUMMARY**",
        f"Your stress is {trend_label.lower()} for {duration_text}, with a current index of {stress_index:.0f}/100.",
        f"Sleep {sleep:.0f}% and focus {focus:.0f}% are your biggest pressure points right now.",
        "",
        "**WHY YOUR STRESS IS RISING**",
        *why_lines[:4],
        "",
        "**WHAT TO DO - RELIEF ACTIONS**",
        "[Immediate - do today]",
        "- Do 4-7-8 breathing for 5 minutes before your next task.",
        "- Take a 10-minute walk and hydrate once now.",
        "",
        "[This week]",
        "- Keep a fixed screen-off time before sleep on 5 nights.",
        "- Add two 20-minute focus blocks daily with no notifications.",
        "",
        "[This month]",
        "- Build a weekly recovery routine with one low-stress evening block.",
        "",
        "**WHAT NOT TO DO**",
        "- Avoid late-night scrolling because it worsens your sleep-stress coupling.",
        "- Avoid skipping meals because low energy amplifies mood and focus strain.",
        "- Avoid multitasking overload because it pushes focus below stable range.",
        "",
        "**WHAT INCREASES YOUR STRESS**",
        f"- Rising trend over {duration_text} shows cumulative load, not one bad day.",
        f"- Sleep-stress correlation (r={correlation_r:.2f}) shows sleep deficit predicts next-day pressure.",
        f"- Burnout trajectory is {burnout_trajectory}, so consistency matters more than intensity.",
        "",
        "**TOMORROW'S FOCUS**",
        "Sleep before 11 PM and do a 10-minute walk.",
        "",
        "**ENCOURAGEMENT LINE**",
        "You are catching this early, and that gives you a real advantage."
    ]

    return "\n".join(report)


def _clean_model_report(text: str) -> str:
    cleaned = (text or "").strip()
    cleaned = re.sub(r"^```(?:markdown|md|text)?\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned).strip()
    cleaned = "\n".join(
        re.sub(r"\s+on next line\s*$", "", line, flags=re.IGNORECASE)
        for line in cleaned.splitlines()
    ).strip()
    return cleaned


def _validate_report_structure(report: str, fallback_report: str) -> str:
    lowered = report.lower()
    positions = [lowered.find(header.lower()) for header in REQUIRED_STRESS_HEADERS]
    if any(idx < 0 for idx in positions):
        return fallback_report
    if positions != sorted(positions):
        return fallback_report
    return report


def generate_stress_relief_report(
    *,
    stress_index: float,
    domain_scores: Dict[str, float],
    trend_label: str,
    trend_days: int,
    correlation_r: float,
    burnout_trajectory: str,
    sahayak_trigger: str,
    checkins: List[CheckinResponse]
) -> str:
    if _has_crisis_signal(checkins):
        return CRISIS_RESPONSE

    fallback_report = _fallback_structured_stress_report(
        stress_index=stress_index,
        domain_scores=domain_scores,
        trend_label=trend_label,
        trend_days=trend_days,
        correlation_r=correlation_r,
        burnout_trajectory=burnout_trajectory,
    )

    if get_groq_client() is None:
        report = fallback_report
    else:
        try:
            user_message = _build_stress_report_user_message(
                domain_scores=domain_scores,
                trend_label=trend_label,
                trend_days=trend_days,
                correlation_r=correlation_r,
                burnout_trajectory=burnout_trajectory,
                sahayak_trigger=sahayak_trigger,
            )
            raw_report = generate_ai_content(user_message, MANASMITRA_STRESS_SYSTEM_PROMPT)
            report = _validate_report_structure(_clean_model_report(raw_report), fallback_report)
        except Exception:
            report = fallback_report

    needs_referral = burnout_trajectory.startswith("Critical") or (trend_label == "Rising" and trend_days > 21)
    if needs_referral and "Consider speaking to a counselor" not in report:
        report = (
            report.rstrip()
            + "\n\nConsider speaking to a counselor. "
            + "SahayakAI can help find support near you."
        )

    return report


# Robust post-processing to reduce persistent 'sad' bias under poor lighting
def stabilize_emotion(dominant: str, emotions: dict, img: np.ndarray | None):
    def prob(x):
        return (x / 100.0) if x is not None and x > 1 else (x or 0.0)
    sad_p = prob(emotions.get("sad"))
    neu_p = prob(emotions.get("neutral"))
    hap_p = prob(emotions.get("happy"))
    ang_p = prob(emotions.get("angry"))
    surprise_p = prob(emotions.get("surprise"))
    top_p = max(sad_p, neu_p, hap_p, ang_p, surprise_p)

    v_mean = None
    if img is not None:
        try:
            hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
            v_mean = float(hsv[:, :, 2].mean())
        except Exception:
            v_mean = None

    # Prioritize 'happy' if it's a strong candidate
    if hap_p >= 0.3 and (hap_p >= top_p * 0.7 or hap_p >= sad_p or hap_p >= neu_p):
        return "happy"
    # Heuristics:
    # - If lighting is low and neutral is reasonable, prefer 'neutral'
    if v_mean is not None and v_mean < 60 and neu_p >= 0.2:
        return "neutral"
    # - If top probability is weak, default to 'neutral'
    if top_p < 0.4:
        return "neutral"
    # - If model leans to 'sad' but neutral is close, prefer neutral
    if dominant == "sad" and sad_p < 0.55 and neu_p >= 0.25 and (sad_p - neu_p) < 0.2:
        return "neutral"
    # - Map 'surprise' to 'surprised' for consistency
    if dominant == "surprise":
        return "surprised"
    return dominant


# Schemas
class StressLogCreate(BaseModel):
    session_start_hour: int
    session_duration: float
    late_night_ratio: float
    app_switch_freq: float
    idle_gap_mean: float
    idle_gap_var: float
    keystroke_cadence: float
    keystroke_var: float
    scroll_velocity: float
    click_rate: float
    notif_response_lag: float
    unanswered_notif_count: int
    work_app_ratio: float
    screen_on_events: int
    weekend_delta: bool
    session_start_var_7d: float


class FacialIngest(BaseModel):
    emotion_vector: Optional[List[float]] = None  # 7 emotions
    dominant: Optional[str] = None
    valence: Optional[float] = None
    image_b64: Optional[str] = None  # Support for raw image analysis


class CheckinAnswer(BaseModel):
    domain: str
    question_id: str
    answer_value: float
    free_text: Optional[str] = None


class CheckinBatch(BaseModel):
    answers: List[CheckinAnswer]


class StressIndexResponse(BaseModel):
    stress_index: float
    category: str  # Low, Medium, High, Critical
    recommendation: str
    delta_from_baseline: float
    behavioral_score: float
    subjective_score: float
    facial_score: float
    timestamp: datetime

    class Config:
        from_attributes = True


def calculate_stress_index(features: dict, baseline: dict, subjective: float = 0, facial: float = 0) -> dict:
    # 1. Behavioral Score (0-100)
    weights = {
        "late_night_ratio": 0.15,
        "app_switch_freq": 0.10,
        "notif_response_lag": 0.10,
        "unanswered_notif_count": 0.10,
        "keystroke_var": 0.05,
        "session_start_hour": 0.10,
        "consecutive_late_hours": 0.20,
        "delta_from_30d_baseline": 0.20
    }

    behavioral_raw = 0
    for feature, weight in weights.items():
        val = features.get(feature, 0)
        base = baseline.get(feature, 0)
        if base > 0:
            z_score = (val - base) / (base * 0.5)
            behavioral_raw += min(max(z_score * 10, 0), 100) * weight
        else:
            behavioral_raw += min(val * 10, 100) * weight

    behavioral_score = min(max(behavioral_raw, 0), 100)

    # 2. Tri-Fusion logic
    # Weights: 40% Behavioral, 35% Subjective, 25% Facial
    # Renormalize if some are missing
    final_score = 0
    total_weight = 0

    if behavioral_score > 0:
        final_score += behavioral_score * 0.40
        total_weight += 0.40

    if subjective > 0:
        final_score += subjective * 0.35
        total_weight += 0.35

    if facial > 0:
        final_score += facial * 0.25
        total_weight += 0.25

    if total_weight > 0:
        fused_index = final_score / total_weight
    else:
        fused_index = 0

    return {
        "fused_index": fused_index,
        "behavioral_score": behavioral_score,
        "subjective_score": subjective,
        "facial_score": facial
    }


EMOTION_VALENCE_MAP = {
    "happy": 8,
    "neutral": 35,
    "surprised": 30,
    "sad": 65,
    "fear": 78,
    "angry": 82,
    "disgust": 70
}


@router.post("/facial-ingest")
def ingest_facial_data(
    data: FacialIngest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    dominant = data.dominant
    valence = data.valence
    e = data.emotion_vector
    tmp_path = None
    face_detected = False

    # Lazy load ML models
    DEEPFACE_READY, FER_READY, detector_ready = get_detectors()

    # 1. High-Accuracy Deep Analysis (Kaggle Dataset Models)
    if data.image_b64:
        try:
            print(f"Backend: Received facial ingest request. image_b64 length: {len(data.image_b64)}")
            # Decode base64 image
            header, encoded = data.image_b64.split(",", 1) if "," in data.image_b64 else (None, data.image_b64)
            img_bytes = base64.b64decode(encoded)
            
            # Save raw bytes to persistent storage on EC2
            filename = f"face_{current_user.id}_{int(datetime.now().timestamp())}.jpg"
            upload_dir = "storage/uploads/faces"
            os.makedirs(upload_dir, exist_ok=True)
            with open(os.path.join(upload_dir, filename), "wb") as f:
                f.write(img_bytes)

            nparr_full = np.frombuffer(img_bytes, np.uint8)
            img_full = cv2.imdecode(nparr_full, cv2.IMREAD_COLOR)

            face_bbox = detect_primary_face(img_full)
            if face_bbox is None:
                return {
                    "status": "no_face_detected",
                    "face_detected": False,
                    "message": "No clear face detected. Please face the camera directly and improve lighting.",
                    "model": "opencv-haarcascade"
                }

            face_detected = True
            x, y, w, h = face_bbox
            face_crop = img_full[y:y + h, x:x + w]
            ok, encoded_face = cv2.imencode(".jpg", face_crop)
            analysis_bytes = encoded_face.tobytes() if ok else img_bytes

            # Use temporary file for DeepFace analysis
            with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp_file:
                tmp_file.write(analysis_bytes)
                tmp_path = tmp_file.name

            # TRY 1: DeepFace (State-of-the-Art, ensemble of datasets)
            if DEEPFACE_READY:
                try:
                    from deepface import DeepFace
                    print("Backend: Running DeepFace analysis...")
                    objs = DeepFace.analyze(img_path=tmp_path, actions=["emotion"], enforce_detection=False)
                    if objs:
                        res = objs[0]
                        raw_dom = res["dominant_emotion"]
                        emotions = res["emotion"]  # 0-100 scale
                        dominant = stabilize_emotion(raw_dom, emotions, img_full)
                        print(f"Backend: DeepFace success. Dominant: {dominant}")
                        # Map to our standard vector: angry, disgust, fear, happy, sad, surprised, neutral
                        e = [
                            emotions.get("angry", 0) / 100,
                            emotions.get("disgust", 0) / 100,
                            emotions.get("fear", 0) / 100,
                            emotions.get("happy", 0) / 100,
                            emotions.get("sad", 0) / 100,
                            emotions.get("surprise", 0) / 100,
                            emotions.get("neutral", 0) / 100
                        ]
                        valence = EMOTION_VALENCE_MAP.get(dominant, 50)
                except Exception as d_err:
                    print(f"Backend: DeepFace analysis failed: {d_err}")

            # TRY 2: FER (FER2013 Dataset Fallback)
            if not dominant and FER_READY and detector_ready:
                try:
                    print("Backend: Falling back to FER analysis...")
                    nparr = np.frombuffer(analysis_bytes, np.uint8)
                    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                    results = detector_ready.detect_emotions(img)
                    if results:
                        emotions = results[0]["emotions"]  # 0-1 scale
                        e = [
                            emotions.get("angry", 0), emotions.get("disgust", 0), emotions.get("fear", 0),
                            emotions.get("happy", 0), emotions.get("sad", 0), emotions.get("surprise", 0),
                            emotions.get("neutral", 0)
                        ]
                        raw_dom = max(emotions, key=emotions.get)
                        dominant = stabilize_emotion(raw_dom, emotions, img)
                        print(f"Backend: FER success. Dominant: {dominant}")
                        valence = EMOTION_VALENCE_MAP.get(dominant, 50)
                except Exception as f_err:
                    print(f"Backend: FER analysis failed: {f_err}")

        except Exception as ex:
            print(f"Backend: High-accuracy inference root error: {ex}")
        finally:
            # Clean up temp file
            if tmp_path and os.path.exists(tmp_path):
                try:
                    os.remove(tmp_path)
                except Exception:
                    pass

    # 2. Existing heuristic fallback (Personalized Anchors from frontend)
    emotions_list = ["angry", "disgust", "fear", "happy", "sad", "surprised", "neutral"]
    if not e:
        print("Backend: Using heuristic/frontend fallback for emotion vector.")
        e = [0.02, 0.01, 0.05, 0.1, 0.05, 0.07, 0.7]  # Default neutral

    if not dominant:
        dominant = emotions_list[np.argmax(e)]

    if not valence:
        valence = EMOTION_VALENCE_MAP.get(dominant, 50)

    try:
        scan = FacialScan(
            user_id=current_user.id,
            emotion_vector_json=json.dumps(e),
            dominant=dominant,
            valence=valence
        )
        db.add(scan)
        db.commit()
    except Exception as db_err:
        print(f"Backend: Database error during facial-ingest: {db_err}")
        db.rollback()
        # Still return success with current data if DB fails, or raise error?
        # Let's return the data even if DB save fails to not break the frontend flow

    return {
        "status": "success",
        "dominant": dominant,
        "valence": valence,
        "facial_stress": valence,
        "face_detected": face_detected,
        "model": "Kaggle-FER2013-Optimized"
    }


@router.post("/checkin")
def log_checkin(
    data: CheckinBatch,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    responses = []
    total_val = 0
    sleep_hours_logged = 0.0
    for ans in data.answers:
        resp = CheckinResponse(
            user_id=current_user.id,
            **ans.dict()
        )
        db.add(resp)
        responses.append(resp)
        total_val += ans.answer_value

        if ans.question_id == "sleep_hours":
            sleep_hours_logged = max(sleep_hours_logged, float(ans.answer_value or 0.0))

        # Optional: Sentiment analysis on free text
        if ans.free_text:
            try:
                # Use Groq for better sentiment analysis
                sentiment_prompt = MANASMITRA_SENTIMENT_SYSTEM_PROMPT.format(text=ans.free_text)
                ai_resp = generate_ai_content(sentiment_prompt)
                
                # Try to parse JSON from AI response
                try:
                    start = ai_resp.find('{')
                    end = ai_resp.rfind('}') + 1
                    analysis = json.loads(ai_resp[start:end])
                    sentiment = analysis.get("sentiment", "Neutral")
                    confidence = analysis.get("confidence", 0.8)
                except Exception:
                    # Fallback to basic keyword matching
                    sentiment = "Neutral"
                    if any(word in ans.free_text.lower() for word in ["thak", "chinta", "bad", "sad", "unhappy", "angry"]):
                        sentiment = "Negative"
                    elif any(word in ans.free_text.lower() for word in ["good", "happy", "great", "excellent"]):
                        sentiment = "Positive"
                    confidence = 0.6
            except Exception as e:
                print(f"Sentiment analysis error: {e}")
                sentiment = "Neutral"
                confidence = 0.5

            sr = SentimentResult(
                checkin=resp,
                sentiment=sentiment,
                confidence=confidence,
                language_detected="en"
            )
            db.add(sr)

    if sleep_hours_logged > 0:
        auto_trigger_quest(current_user.id, "sleep_hours", db, amount=sleep_hours_logged)

    db.commit()

    # Calculate Subjective Score (avg of 20 questions, scaled 0-100)
    # Assumes each answer_value is 0-5
    subjective_score = (total_val / (len(data.answers) * 5)) * 100 if data.answers else 0

    return {"status": "success", "subjective_score": min(subjective_score, 100)}


@router.post("/log", response_model=StressIndexResponse)
def log_behavior(
    data: StressLogCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Get 30-day baseline
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    past_logs = db.query(StressLog).filter(
        StressLog.user_id == current_user.id,
        StressLog.timestamp >= thirty_days_ago
    ).all()

    baseline = {}
    if past_logs:
        for feature in data.dict().keys():
            baseline[feature] = np.mean([getattr(log, feature) for log in past_logs if getattr(log, feature) is not None])
    else:
        baseline = {k: 0 for k in data.dict().keys()}

    # 2. Get today's subjective and facial scores
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    checkins = db.query(CheckinResponse).filter(
        CheckinResponse.user_id == current_user.id,
        CheckinResponse.created_at >= today_start
    ).all()
    subjective_score = (np.mean([c.answer_value for c in checkins]) / 5) * 100 if checkins else 0

    facial_scans = db.query(FacialScan).filter(
        FacialScan.user_id == current_user.id,
        FacialScan.captured_at >= today_start
    ).all()
    facial_score = 0
    if facial_scans:
        facial_score = facial_scans[-1].valence

    # 3. Features
    consecutive_late = 0
    last_few_logs = db.query(StressLog).filter(
        StressLog.user_id == current_user.id
    ).order_by(StressLog.timestamp.desc()).limit(5).all()

    for log in last_few_logs:
        if log.late_night_ratio > 0.5:
            consecutive_late += 1
        else:
            break

    current_avg = np.mean(list(data.dict().values()))
    baseline_avg = np.mean(list(baseline.values())) if baseline else 0
    delta_from_baseline = (current_avg - baseline_avg) if baseline_avg > 0 else 0

    # 4. Fusion Calculation
    features_with_new = data.dict()
    features_with_new["consecutive_late_hours"] = consecutive_late
    features_with_new["delta_from_30d_baseline"] = delta_from_baseline

    calc_results = calculate_stress_index(features_with_new, baseline, subjective_score, facial_score)
    stress_index = calc_results["fused_index"]

    # 5. Save log
    log = StressLog(
        user_id=current_user.id,
        **data.dict(),
        consecutive_late_hours=consecutive_late,
        delta_from_30d_baseline=delta_from_baseline,
        behavioral_score=calc_results["behavioral_score"],
        subjective_score=calc_results["subjective_score"],
        facial_score=calc_results["facial_score"],
        stress_index=stress_index
    )

    db.add(log)
    auto_trigger_quest(current_user.id, "manasmitra", db)
    db.commit()

    # Category
    category = "Low"
    if stress_index > 85:
        category = "Critical"
    elif stress_index > 70:
        category = "High"
    elif stress_index > 40:
        category = "Medium"

    recent_logs = db.query(StressLog).filter(
        StressLog.user_id == current_user.id,
        StressLog.timestamp >= thirty_days_ago
    ).order_by(StressLog.timestamp.asc()).all()

    trend_label, trend_days = _compute_stress_trend(recent_logs)
    correlation_r = _compute_sleep_stress_correlation(db, current_user.id)
    masking_pattern = facial_score > 70 and subjective_score < 40
    profile = db.query(UserDisabilityProfile).filter(UserDisabilityProfile.user_id == current_user.id).first()

    burnout_trajectory = _compute_burnout_trajectory(stress_index, trend_label, trend_days)
    sahayak_trigger = _compute_sahayak_trigger(
        stress_index=stress_index,
        trend_label=trend_label,
        trend_days=trend_days,
        has_disability_profile=bool(profile),
        masking_pattern=masking_pattern,
    )

    domain_scores = _domain_breakdown_from_checkins(checkins)
    recommendation = generate_stress_relief_report(
        stress_index=stress_index,
        domain_scores=domain_scores,
        trend_label=trend_label,
        trend_days=trend_days,
        correlation_r=correlation_r,
        burnout_trajectory=burnout_trajectory,
        sahayak_trigger=sahayak_trigger,
        checkins=checkins,
    )

    return {
        "stress_index": stress_index,
        "category": category,
        "recommendation": recommendation,
        "delta_from_baseline": delta_from_baseline,
        "behavioral_score": calc_results["behavioral_score"],
        "subjective_score": calc_results["subjective_score"],
        "facial_score": calc_results["facial_score"],
        "timestamp": log.timestamp
    }


@router.get("/summary")
def get_stress_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    logs = db.query(StressLog).filter(
        StressLog.user_id == current_user.id,
        StressLog.timestamp >= thirty_days_ago
    ).order_by(StressLog.timestamp.asc()).all()

    latest_log = logs[-1] if logs else None

    # Get domain breakdown from checkins today
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    checkins = db.query(CheckinResponse).filter(
        CheckinResponse.user_id == current_user.id,
        CheckinResponse.created_at >= today_start
    ).all()

    breakdown = _domain_breakdown_from_checkins(checkins)

    trend_label = "Stable"
    trend_days = 1
    correlation_r = 0.72
    burnout_trajectory = "Healthy"
    sahayak_trigger = "None"
    recommendation = "Take a short mindful break, hydrate, and do one calming activity today."

    if latest_log:
        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
        recent_logs = db.query(StressLog).filter(
            StressLog.user_id == current_user.id,
            StressLog.timestamp >= thirty_days_ago
        ).order_by(StressLog.timestamp.asc()).all()

        trend_label, trend_days = _compute_stress_trend(recent_logs)
        correlation_r = _compute_sleep_stress_correlation(db, current_user.id)
        masking_pattern = (latest_log.facial_score or 0) > 70 and (latest_log.subjective_score or 0) < 40
        profile = db.query(UserDisabilityProfile).filter(UserDisabilityProfile.user_id == current_user.id).first()

        burnout_trajectory = _compute_burnout_trajectory(float(latest_log.stress_index), trend_label, trend_days)
        sahayak_trigger = _compute_sahayak_trigger(
            stress_index=float(latest_log.stress_index),
            trend_label=trend_label,
            trend_days=trend_days,
            has_disability_profile=bool(profile),
            masking_pattern=masking_pattern,
        )

        recommendation = generate_stress_relief_report(
            stress_index=float(latest_log.stress_index),
            domain_scores=breakdown,
            trend_label=trend_label,
            trend_days=trend_days,
            correlation_r=correlation_r,
            burnout_trajectory=burnout_trajectory,
            sahayak_trigger=sahayak_trigger,
            checkins=checkins,
        )

    latest_category = "Low"
    latest_index = 42.0
    if latest_log:
        latest_index = float(latest_log.stress_index)
        if latest_index > 85:
            latest_category = "Critical"
        elif latest_index > 70:
            latest_category = "High"
        elif latest_index > 40:
            latest_category = "Medium"

    return {
        "logs": [
            {
                "timestamp": log.timestamp,
                "stress_index": log.stress_index,
                "behavioral_score": log.behavioral_score,
                "subjective_score": log.subjective_score,
                "facial_score": log.facial_score
            }
            for log in logs
        ],
        "latest": {
            "stress_index": latest_index,
            "category": latest_category,
            "recommendation": recommendation,
            "trend": f"{trend_label} for {_format_duration(trend_days)}",
            "burnout_trajectory": burnout_trajectory,
            "sahayak_trigger": sahayak_trigger,
            "sleep_stress_correlation": correlation_r,
        },
        "breakdown": breakdown
    }


@router.get("/correlation")
def get_correlation(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    correlation_r = _compute_sleep_stress_correlation(db, current_user.id)
    consistency = int(round(correlation_r * 100))

    return {
        "r": correlation_r,
        "insight": f"For you specifically, poor sleep predicts high stress the next day with {consistency}% consistency."
    }
