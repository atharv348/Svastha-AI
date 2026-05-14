from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import User, get_db
from services.svasthaquest_service import (
    auto_trigger_quest,
    get_achievement_catalog,
    get_leaderboard,
    get_trivia_questions,
    get_svasthaquest_state,
    submit_trivia_answer,
)
from .users import get_current_user

router = APIRouter(prefix="/svasthaquest", tags=["svasthaquest"])


class QuestActionTrigger(BaseModel):
    action: str = Field(..., min_length=1)
    amount: float = Field(default=1.0, gt=0)


class TriviaAnswerPayload(BaseModel):
    question_id: str = Field(..., min_length=1)
    selected_option: int = Field(..., ge=0)


@router.get("/state")
def get_state(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_svasthaquest_state(db, current_user.id)


@router.post("/trigger")
def trigger_quest_action(
    payload: QuestActionTrigger,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        result = auto_trigger_quest(
            user_id=current_user.id,
            action=payload.action,
            amount=payload.amount,
            db=db,
        )
        db.commit()
        return {
            "result": result,
            "state": get_svasthaquest_state(db, current_user.id),
        }
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to trigger action: {exc}")


@router.get("/trivia/questions")
def get_trivia_pool(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _ = current_user
    _ = db
    return {
        "questions": get_trivia_questions(),
        "total_questions": 15,
    }


@router.post("/trivia/answer")
def answer_trivia(
    payload: TriviaAnswerPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        answer_result = submit_trivia_answer(
            db=db,
            user_id=current_user.id,
            question_id=payload.question_id,
            selected_option=payload.selected_option,
        )
        db.commit()
        return {
            "answer": answer_result,
            "state": get_svasthaquest_state(db, current_user.id),
        }
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Trivia evaluation failed: {exc}")


@router.get("/leaderboard")
def leaderboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _ = current_user
    return {"leaderboard": get_leaderboard(db, limit=10)}


@router.get("/achievements")
def achievements(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_achievement_catalog(db, current_user.id)
