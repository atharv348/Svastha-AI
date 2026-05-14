from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import json
import io
import pypdf

from services.groq_service import get_meal_plan
from services.svasthaquest_service import auto_trigger_quest
from .users import get_current_user
from database import get_db, MealPlan, User, ChatMessage
from schemas import MealPlanCreate, MealPlanResponse, ChatMessageResponse

router = APIRouter()

@router.post("/meals/generate", response_model=MealPlanResponse)
async def generate_meals(
    prompt: str = Form(...),
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate a new AI meal plan from prompt and/or PDF"""
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

    final_prompt = prompt
    if extracted_text:
        file_name = file.filename if file else "uploaded PDF"
        final_prompt = f"""[SYSTEM: The user has uploaded a health report named '{file_name}'. Analyze its content (extracted below) to create a personalized meal plan. If the user has specific questions about the report, answer them first, then provide the plan.]

EXTRACTED FILE CONTENT:
---
{extracted_text}
---

User Request: {prompt if prompt else 'Please analyze this health report and create a comprehensive 7-day meal plan based on it.'}"""

    # Save user message
    user_message = ChatMessage(
        user_id=current_user.id,
        chat_type="meal_plan",
        role="user",
        content=f"[Attached: {file.filename}] " + (prompt or "Analyzed health report for meal plan") if file else prompt
    )
    db.add(user_message)

    # Parse dietary restrictions if exists
    dietary_restrictions = []
    if current_user.dietary_restrictions:
        try:
            dietary_restrictions = json.loads(current_user.dietary_restrictions)
        except:
            pass
    
    # Enhanced prompt with user profile context
    enhanced_prompt = f"""User Profile:
- Goal: {current_user.fitness_goal or 'general health'}
- Current Weight: {current_user.current_weight or 'Not specified'} kg
- Target Weight: {current_user.target_weight or 'Not specified'} kg
- Dietary Restrictions: {', '.join(dietary_restrictions) if dietary_restrictions else 'None'}
- Preferred Language: {current_user.preferred_language or 'English'}

User Request: {final_prompt}

Please create a detailed 7-day meal plan including:
1. Daily meal structure (Breakfast, Lunch, Dinner, Snacks)
2. Specific recipes with ingredients and preparation instructions
3. Macro breakdown for each meal (Calories, Protein, Carbs, Fats)
4. Total daily macros
5. Indian cuisine focus with local ingredients
6. Allergen information and substitution options
7. Meal prep tips

IMPORTANT: Respond ONLY in the user's preferred language ({current_user.preferred_language or 'English'}). If the user speaks in another language, respond in that language but keep the persona. Be professional, friendly, and user-friendly."""

    plan_content = get_meal_plan(enhanced_prompt)
    
    # Save assistant message
    assistant_message = ChatMessage(
        user_id=current_user.id,
        chat_type="meal_plan",
        role="assistant",
        content=plan_content
    )
    db.add(assistant_message)

    # Save to database
    meal_plan = MealPlan(
        user_id=current_user.id,
        title=f"Meal Plan - {prompt[:50]}...",
        prompt=prompt,
        plan_content=plan_content,
        is_active=True
    )
    
    # Deactivate other plans
    db.query(MealPlan).filter(
        MealPlan.user_id == current_user.id,
        MealPlan.is_active == True
    ).update({"is_active": False})
    
    db.add(meal_plan)
    auto_trigger_quest(current_user.id, "meal_log", db)
    db.commit()
    db.refresh(meal_plan)
    
    return meal_plan


@router.get("/meals/history/chat", response_model=List[ChatMessageResponse])
def get_meal_chat_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 50
):
    """Get meal plan chat history"""
    messages = db.query(ChatMessage).filter(
        ChatMessage.user_id == current_user.id,
        ChatMessage.chat_type == "meal_plan"
    ).order_by(ChatMessage.timestamp.desc()).limit(limit).all()
    
    return list(reversed(messages))


@router.delete("/meals/history/chat")
def clear_meal_chat_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Clear meal plan chat history"""
    db.query(ChatMessage).filter(
        ChatMessage.user_id == current_user.id,
        ChatMessage.chat_type == "meal_plan"
    ).delete()
    db.commit()
    return {"message": "Meal plan chat history cleared"}


@router.get("/meals/history", response_model=List[MealPlanResponse])
def get_meal_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's meal plan history"""
    plans = db.query(MealPlan).filter(
        MealPlan.user_id == current_user.id
    ).order_by(MealPlan.created_at.desc()).all()
    
    return plans


@router.get("/meals/{plan_id}", response_model=MealPlanResponse)
def get_meal_plan_by_id(
    plan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific meal plan"""
    plan = db.query(MealPlan).filter(
        MealPlan.id == plan_id,
        MealPlan.user_id == current_user.id
    ).first()
    
    if not plan:
        raise HTTPException(status_code=404, detail="Meal plan not found")
    
    return plan


@router.delete("/meals/{plan_id}")
def delete_meal_plan(
    plan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a meal plan"""
    plan = db.query(MealPlan).filter(
        MealPlan.id == plan_id,
        MealPlan.user_id == current_user.id
    ).first()
    
    if not plan:
        raise HTTPException(status_code=404, detail="Meal plan not found")
    
    db.delete(plan)
    db.commit()
    
    return {"message": "Meal plan deleted successfully"}


@router.delete("/meals/history/all")
def clear_meal_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Clear all meal plan history for the user"""
    db.query(MealPlan).filter(
        MealPlan.user_id == current_user.id
    ).delete()
    db.commit()
    return {"message": "All meal plans deleted successfully"}
