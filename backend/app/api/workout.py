from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import json
import io
import pypdf

from app.services.groq_service import get_workout_plan
from app.services.svasthaquest_service import auto_trigger_quest
from .users import get_current_user
from app.db.database import get_db, WorkoutPlan, User, ChatMessage
from app.schemas import WorkoutPlanCreate, WorkoutPlanResponse, ChatMessageResponse

router = APIRouter()

@router.post("/workout/generate", response_model=WorkoutPlanResponse)
async def generate_workout(
    prompt: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate a new AI workout plan from prompt and/or PDF"""
    extracted_text = ""
    if file:
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are supported")
        
        try:
            content = await file.read()
            pdf_reader = pypdf.PdfReader(io.BytesIO(content))
            for page in pdf_reader.pages:
                extracted_text += page.extract_text() + "\n"
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to parse PDF: {str(e)}")

    final_prompt = prompt or ""
    if extracted_text:
        file_name = file.filename if file else "uploaded PDF"
        final_prompt = f"""[SYSTEM: The user has uploaded a health report named '{file_name}'. Analyze its content (extracted below) to create a personalized workout plan. If the user has specific questions about the report, answer them first, then provide the plan.]

EXTRACTED FILE CONTENT:
---
{extracted_text}
---

User Request: {prompt if prompt else 'Please analyze this health report and create a comprehensive 7-day workout plan based on it.'}"""
    
    if not final_prompt:
        raise HTTPException(status_code=400, detail="Either prompt or PDF file is required")

    # Save user message
    user_message = ChatMessage(
        user_id=current_user.id,
        chat_type="workout_plan",
        role="user",
        content=f"[Attached: {file.filename}] " + (prompt or "Analyzed health report for workout plan") if file else (prompt or "")
    )
    db.add(user_message)

    # Enhanced prompt with user profile context
    enhanced_prompt = f"""User Profile:
- Fitness Level: {current_user.fitness_level or 'Not specified'}
- Goal: {current_user.fitness_goal or 'general fitness'}
- Current Weight: {current_user.current_weight or 'Not specified'} kg
- Target Weight: {current_user.target_weight or 'Not specified'} kg
- Preferred Language: {current_user.preferred_language or 'English'}

User Request: {final_prompt}

Please create a detailed 7-day workout plan including:
1. Daily workout structure with warm-up, main exercises, and cool-down
2. Specific exercises with sets, reps, and rest periods
3. Modifications for different fitness levels
4. Safety tips and form guidance
5. Suggest relevant YouTube video keywords for demonstrations
6. Daily fitness tips

IMPORTANT: Respond ONLY in the user's preferred language ({current_user.preferred_language or 'English'}). If the user speaks in another language, respond in that language but keep the persona. Be professional, friendly, and user-friendly."""

    plan_content = get_workout_plan(enhanced_prompt)
    
    # Save assistant message
    assistant_message = ChatMessage(
        user_id=current_user.id,
        chat_type="workout_plan",
        role="assistant",
        content=plan_content
    )
    db.add(assistant_message)

    # Save to database
    workout_plan = WorkoutPlan(
        user_id=current_user.id,
        title=f"Workout Plan - {final_prompt[:50]}...",
        prompt=final_prompt,
        plan_content=plan_content,
        is_active=True
    )
    
    # Deactivate other plans
    db.query(WorkoutPlan).filter(
        WorkoutPlan.user_id == current_user.id,
        WorkoutPlan.is_active == True
    ).update({"is_active": False})
    
    db.add(workout_plan)
    auto_trigger_quest(current_user.id, "workout", db)
    db.commit()
    db.refresh(workout_plan)
    
    return workout_plan


@router.get("/workout/history/chat", response_model=List[ChatMessageResponse])
def get_workout_chat_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 50
):
    """Get workout plan chat history"""
    messages = db.query(ChatMessage).filter(
        ChatMessage.user_id == current_user.id,
        ChatMessage.chat_type == "workout_plan"
    ).order_by(ChatMessage.timestamp.desc()).limit(limit).all()
    
    return list(reversed(messages))


@router.delete("/workout/history/chat")
def clear_workout_chat_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Clear workout plan chat history"""
    db.query(ChatMessage).filter(
        ChatMessage.user_id == current_user.id,
        ChatMessage.chat_type == "workout_plan"
    ).delete()
    db.commit()
    return {"message": "Workout plan chat history cleared"}


@router.get("/workout/history", response_model=List[WorkoutPlanResponse])
def get_workout_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's workout plan history"""
    plans = db.query(WorkoutPlan).filter(
        WorkoutPlan.user_id == current_user.id
    ).order_by(WorkoutPlan.created_at.desc()).all()
    
    return plans


@router.get("/workout/{plan_id}", response_model=WorkoutPlanResponse)
def get_workout_plan_by_id(
    plan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific workout plan"""
    plan = db.query(WorkoutPlan).filter(
        WorkoutPlan.id == plan_id,
        WorkoutPlan.user_id == current_user.id
    ).first()
    
    if not plan:
        raise HTTPException(status_code=404, detail="Workout plan not found")
    
    return plan


@router.delete("/workout/{plan_id}")
def delete_workout_plan(
    plan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a workout plan"""
    plan = db.query(WorkoutPlan).filter(
        WorkoutPlan.id == plan_id,
        WorkoutPlan.user_id == current_user.id
    ).first()
    
    if not plan:
        raise HTTPException(status_code=404, detail="Workout plan not found")
    
    db.delete(plan)
    db.commit()
    
    return {"message": "Workout plan deleted successfully"}


@router.delete("/workout/history/all")
def clear_workout_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Clear all workout plan history for the user"""
    db.query(WorkoutPlan).filter(
        WorkoutPlan.user_id == current_user.id
    ).delete()
    db.commit()
    return {"message": "All workout plans deleted successfully"}
