from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime, timezone
import importlib
import importlib.util
import os
from pathlib import Path

# Database URL
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./svasthaai_default.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Database Models
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    full_name = Column(String(100))
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Profile fields
    age = Column(Integer)
    gender = Column(String(10))
    height = Column(Float)  # in cm
    current_weight = Column(Float)  # in kg
    target_weight = Column(Float)  # in kg
    fitness_level = Column(String(20))  # beginner, intermediate, advanced
    health_conditions = Column(Text)  # JSON string of conditions
    dietary_restrictions = Column(Text)  # JSON string of restrictions
    fitness_goal = Column(String(50))  # weight_loss, muscle_gain, maintenance, etc.
    preferred_language = Column(String(20), default="English")  # English, Hindi, Marathi
    streak_count = Column(Integer, default=0)
    last_checkin = Column(DateTime)
    
    # Relationships
    workouts = relationship("WorkoutPlan", back_populates="user", cascade="all, delete-orphan")
    meals = relationship("MealPlan", back_populates="user", cascade="all, delete-orphan")
    progress_entries = relationship("ProgressEntry", back_populates="user", cascade="all, delete-orphan")
    chat_history = relationship("ChatMessage", back_populates="user", cascade="all, delete-orphan")
    achievements = relationship("Achievement", back_populates="user", cascade="all, delete-orphan")
    predictions = relationship("Prediction", back_populates="user", cascade="all, delete-orphan")
    clinical_predictions = relationship("ClinicalPrediction", back_populates="user", cascade="all, delete-orphan")
    growth_records = relationship("GrowthRecord", back_populates="user", cascade="all, delete-orphan")
    conversations = relationship("AIConversation", back_populates="user", cascade="all, delete-orphan")
    stress_logs = relationship("StressLog", back_populates="user", cascade="all, delete-orphan")
    disability_profile = relationship("UserDisabilityProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    applications = relationship("ApplicationStatus", back_populates="user", cascade="all, delete-orphan")


class StressLog(Base):
    __tablename__ = "stress_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # 18 Behavioral Features
    session_start_hour = Column(Integer)
    session_duration = Column(Float)
    late_night_ratio = Column(Float)
    app_switch_freq = Column(Float)
    idle_gap_mean = Column(Float)
    idle_gap_var = Column(Float)
    keystroke_cadence = Column(Float)
    keystroke_var = Column(Float)
    scroll_velocity = Column(Float)
    click_rate = Column(Float)
    notif_response_lag = Column(Float)
    unanswered_notif_count = Column(Integer)
    work_app_ratio = Column(Float)
    screen_on_events = Column(Integer)
    weekend_delta = Column(Boolean)
    session_start_var_7d = Column(Float)
    delta_from_30d_baseline = Column(Float)
    consecutive_late_hours = Column(Integer)
    
    # Tri-Fusion Components (0-100)
    behavioral_score = Column(Float, default=0.0)
    subjective_score = Column(Float, default=0.0)
    facial_score = Column(Float, default=0.0)
    
    stress_index = Column(Float)  # Final Fused Index 0-100
    
    user = relationship("User", back_populates="stress_logs")


class FacialScan(Base):
    __tablename__ = "facial_scans"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    emotion_vector_json = Column(Text, nullable=False)  # Store 7 emotion probabilities
    dominant = Column(String(20)) # e.g. "happy", "sad"
    valence = Column(Float) # 0-100 stress weight
    captured_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    user = relationship("User")


class CheckinResponse(Base):
    __tablename__ = "checkin_responses"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    domain = Column(String(50), nullable=False)  # Sleep, Mood, Focus, Social, Physical
    question_id = Column(String(100), nullable=False)
    answer_value = Column(Float, nullable=False)
    free_text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    sentiment_result = relationship("SentimentResult", back_populates="checkin", uselist=False)
    user = relationship("User")


class SentimentResult(Base):
    __tablename__ = "sentiment_results"
    
    id = Column(Integer, primary_key=True, index=True)
    checkin_id = Column(Integer, ForeignKey("checkin_responses.id"), nullable=False)
    sentiment = Column(String(20), nullable=False)  # Positive, Neutral, Negative
    confidence = Column(Float, nullable=False)
    language_detected = Column(String(10), default="en")
    
    checkin = relationship("CheckinResponse", back_populates="sentiment_result")


class UserDisabilityProfile(Base):
    __tablename__ = "user_disability_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    disability_type = Column(String(100))
    disability_percentage = Column(Float)
    has_udid = Column(Boolean, default=False)
    has_aadhaar = Column(Boolean, default=False)
    income_annual = Column(Float)
    state = Column(String(50))
    
    # JSON string of uploaded documents/OCR results
    documents_json = Column(Text)
    
    user = relationship("User", back_populates="disability_profile")


class DisabilityScheme(Base):
    __tablename__ = "disability_schemes"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    eligibility_criteria = Column(Text)  # JSON string
    required_documents = Column(Text)    # JSON string
    benefit_type = Column(String(100))   # Scholarship, Subsidy, etc.
    ease_score = Column(Integer)         # 1-10 for prioritization
    category = Column(String(50))        # Central, State, NGO


class ApplicationStatus(Base):
    __tablename__ = "application_statuses"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    scheme_id = Column(Integer, ForeignKey("disability_schemes.id"), nullable=False)
    status = Column(String(50), default="pending")  # pending, documents_needed, submitted, approved
    last_updated = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    notes = Column(Text)
    
    user = relationship("User", back_populates="applications")
    scheme = relationship("DisabilityScheme")


class WorkoutPlan(Base):
    __tablename__ = "workout_plans"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(200))
    prompt = Column(Text, nullable=False)
    plan_content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    is_active = Column(Boolean, default=False)
    
    user = relationship("User", back_populates="workouts")


class MealPlan(Base):
    __tablename__ = "meal_plans"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(200))
    prompt = Column(Text, nullable=False)
    plan_content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    is_active = Column(Boolean, default=False)
    
    user = relationship("User", back_populates="meals")


class ProgressEntry(Base):
    __tablename__ = "progress_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    weight = Column(Float)
    body_fat_percentage = Column(Float)
    measurements = Column(Text)  # JSON string of measurements
    notes = Column(Text)
    
    user = relationship("User", back_populates="progress_entries")


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    chat_type = Column(String(50), default="coach")  # coach, meal_plan, workout_plan
    role = Column(String(20), nullable=False)  # user or assistant
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    rating = Column(Integer)  # 1-5 stars
    
    user = relationship("User", back_populates="chat_history")


class Achievement(Base):
    __tablename__ = "achievements"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    achievement_type = Column(String(50), nullable=False)  # workout_streak, weight_milestone, etc.
    title = Column(String(200), nullable=False)
    description = Column(Text)
    points = Column(Integer, default=0)
    charity_contribution = Column(Float, default=0.0)  # in rupees
    unlocked_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    user = relationship("User", back_populates="achievements")


class Prediction(Base):
    __tablename__ = "predictions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Prediction details
    body_part = Column(String(50), nullable=False, default="skin")  # skin, eye, oral, bone, lungs
    predicted_class = Column(String(100), nullable=False)
    predicted_name = Column(String(200), nullable=False)
    confidence = Column(Float, nullable=False)
    priority = Column(String(20), nullable=False)  # critical, high, medium, low
    ai_advice = Column(Text, nullable=True)
    
    # Image details
    image_path = Column(String(500), nullable=False)
    
    # Review details
    status = Column(String(20), default="pending")  # pending, reviewed, dismissed
    review_notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    user = relationship("User", back_populates="predictions")


class ClinicalPrediction(Base):
    __tablename__ = "clinical_predictions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Parameters
    glucose = Column(Float, nullable=True)
    hb_a1c = Column(Float, nullable=True)
    bp_systolic = Column(Integer, nullable=True)
    bp_diastolic = Column(Integer, nullable=True)
    hemoglobin = Column(Float, nullable=True)
    
    # Calculated results
    bmi = Column(Float, nullable=False)
    risks_json = Column(Text, nullable=False)  # JSON string of risks
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    user = relationship("User", back_populates="clinical_predictions")


class GrowthRecord(Base):
    __tablename__ = "growth_records"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    age_months = Column(Integer, nullable=False)
    weight_kg = Column(Float, nullable=False)
    height_cm = Column(Float, nullable=False)
    muac_cm = Column(Float, nullable=True)  # Mid-Upper Arm Circumference
    
    # Z-scores (calculated)
    waz = Column(Float, nullable=True)  # Weight-for-age Z-score
    haz = Column(Float, nullable=True)  # Height-for-age Z-score
    whz = Column(Float, nullable=True)  # Weight-for-height Z-score
    
    status = Column(String(50))  # Normal, Stunting, Wasting, Underweight
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    user = relationship("User", back_populates="growth_records")


class AIConversation(Base):
    __tablename__ = "ai_conversations"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    session_id = Column(String(100), nullable=False, index=True)
    
    message_type = Column(String(20), nullable=False)  # user or assistant
    message = Column(Text, nullable=False)
    context = Column(Text, nullable=True)  # JSON string with additional context
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    user = relationship("User", back_populates="conversations")


class GameProfile(Base):
    __tablename__ = "game_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    total_xp = Column(Integer, default=0)
    level = Column(Integer, default=1)
    player_class = Column(String(50), default="Health Seeker")
    streak_days = Column(Integer, default=0)
    longest_streak = Column(Integer, default=0)
    last_active_date = Column(String(10), nullable=True)  # YYYY-MM-DD (UTC)
    total_actions = Column(Integer, default=0)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User")


class GameQuestProgress(Base):
    __tablename__ = "game_quest_progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    quest_code = Column(String(100), nullable=False, index=True)
    quest_date = Column(String(10), nullable=False, index=True)  # YYYY-MM-DD (UTC)
    progress_value = Column(Float, default=0.0)
    target_value = Column(Float, default=1.0)
    completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User")


class GameActionEvent(Base):
    __tablename__ = "game_action_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    action_type = Column(String(100), nullable=False, index=True)
    amount = Column(Float, default=1.0)
    xp_earned = Column(Integer, default=0)
    event_date = Column(String(10), nullable=False, index=True)  # YYYY-MM-DD (UTC)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User")


class GameAchievementUnlock(Base):
    __tablename__ = "game_achievement_unlocks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    achievement_code = Column(String(100), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    rarity = Column(String(20), nullable=False)
    description = Column(Text, nullable=True)
    xp_bonus = Column(Integer, default=0)
    unlocked_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User")


class GameTriviaAttempt(Base):
    __tablename__ = "game_trivia_attempts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    question_id = Column(String(100), nullable=False, index=True)
    attempt_date = Column(String(10), nullable=False, index=True)  # YYYY-MM-DD (UTC)
    selected_option = Column(Integer, nullable=False)
    correct = Column(Boolean, default=False)
    attempted_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User")


# Database initialization
def _load_enhanced_models_module():
    """Load enhanced model definitions so their tables are attached to Base.metadata."""
    candidates = [
        "models.enhanced_models",
        "backend.models.enhanced_models",
    ]

    for module_name in candidates:
        try:
            return importlib.import_module(module_name)
        except Exception:
            continue

    # Fallback to direct file import for non-package launch modes.
    enhanced_models_path = Path(__file__).resolve().parent / "models" / "enhanced_models.py"
    if not enhanced_models_path.exists():
        raise FileNotFoundError(f"Enhanced models file not found at {enhanced_models_path}")

    spec = importlib.util.spec_from_file_location("enhanced_models_runtime", str(enhanced_models_path))
    if spec is None or spec.loader is None:
        raise ImportError("Unable to create import spec for enhanced models")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def init_db():
    """Create all tables, including enhanced feature models."""
    try:
        # Import side effect: registers extra SQLAlchemy models with Base.metadata.
        _enhanced_models = _load_enhanced_models_module()

        _ = _enhanced_models
    except Exception as exc:
        print(f"Enhanced models import warning: {exc}")

    print("Creating all tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully.")


def get_db():
    """Dependency for getting database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
