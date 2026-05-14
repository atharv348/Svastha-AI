from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


# User schemas
class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    full_name: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)


class UserLogin(BaseModel):
    username: str
    password: str


class UserProfile(BaseModel):
    age: Optional[int] = None
    gender: Optional[str] = None
    height: Optional[float] = None
    current_weight: Optional[float] = None
    target_weight: Optional[float] = None
    fitness_level: Optional[str] = None
    health_conditions: Optional[List[str]] = []
    dietary_restrictions: Optional[List[str]] = []
    fitness_goal: Optional[str] = None


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    height: Optional[float] = None
    current_weight: Optional[float] = None
    target_weight: Optional[float] = None
    fitness_level: Optional[str] = None
    health_conditions: Optional[List[str]] = None
    dietary_restrictions: Optional[List[str]] = None
    fitness_goal: Optional[str] = None
    preferred_language: Optional[str] = None


class UserResponse(UserBase):
    id: int
    created_at: datetime
    age: Optional[int]
    gender: Optional[str]
    height: Optional[float]
    current_weight: Optional[float]
    target_weight: Optional[float]
    fitness_level: Optional[str]
    fitness_goal: Optional[str]
    preferred_language: Optional[str]
    streak_count: Optional[int]
    last_checkin: Optional[datetime]
    
    class Config:
        from_attributes = True


# Workout schemas
class WorkoutPlanCreate(BaseModel):
    prompt: str = Field(..., min_length=10)


class WorkoutPlanResponse(BaseModel):
    id: int
    title: Optional[str]
    prompt: str
    plan_content: str
    created_at: datetime
    is_active: bool
    
    class Config:
        from_attributes = True


# Meal plan schemas
class MealPlanCreate(BaseModel):
    prompt: str = Field(..., min_length=10)


class MealPlanResponse(BaseModel):
    id: int
    title: Optional[str]
    prompt: str
    plan_content: str
    created_at: datetime
    is_active: bool
    
    class Config:
        from_attributes = True


# Clinical Prediction schemas
class ClinicalPredictionCreate(BaseModel):
    # Diabetes parameters
    glucose: Optional[float] = None
    hb_a1c: Optional[float] = None
    
    # Hypertension parameters
    bp_systolic: Optional[int] = None
    bp_diastolic: Optional[int] = None
    
    # Anemia parameters
    hemoglobin: Optional[float] = None
    
    # General parameters
    age: int
    gender: str
    height_cm: float
    weight_kg: float
    family_history: bool = False


class DiseaseRisk(BaseModel):
    disease: str
    risk_percentage: float
    status: str  # High, Medium, Low
    recommendation: str


class ClinicalPredictionResponse(BaseModel):
    id: Optional[int] = None
    user_id: int
    risks: List[DiseaseRisk]
    bmi: float
    created_at: datetime

    class Config:
        from_attributes = True


# Growth schemas
class GrowthRecordCreate(BaseModel):
    age_months: int
    weight_kg: float
    height_cm: float
    muac_cm: Optional[float] = None


class GrowthRecordResponse(BaseModel):
    id: int
    user_id: int
    age_months: int
    weight_kg: float
    height_cm: float
    muac_cm: Optional[float]
    waz: Optional[float]
    haz: Optional[float]
    whz: Optional[float]
    status: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# Progress schemas
class ProgressEntryCreate(BaseModel):
    weight: float
    body_fat_percentage: Optional[float] = None
    measurements: Optional[dict[str, float]] = None
    notes: Optional[str] = None


class ProgressEntryResponse(BaseModel):
    id: int
    date: datetime
    weight: float
    body_fat_percentage: Optional[float]
    measurements: Optional[str]
    notes: Optional[str]
    
    class Config:
        from_attributes = True


# Chat schemas
class ChatRequest(BaseModel):
    prompt: str = Field(..., min_length=1)


class ChatMessageResponse(BaseModel):
    id: int
    role: str
    content: str
    timestamp: datetime
    rating: Optional[int]
    
    class Config:
        from_attributes = True


# Achievement schemas
class AchievementResponse(BaseModel):
    id: int
    achievement_type: str
    title: str
    description: Optional[str]
    points: int
    charity_contribution: float
    unlocked_at: datetime
    
    class Config:
        from_attributes = True


# Response wrappers
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class MessageResponse(BaseModel):
    message: str


class DisabilityProfileUpdateRequest(BaseModel):
    disability_type: Optional[str] = None
    disability_types: Optional[List[str]] = None
    disability_percentage: Optional[float] = None
    has_udid: Optional[bool] = None
    has_aadhaar: Optional[bool] = None
    income_annual: Optional[float] = None
    state: Optional[str] = None


# Enhanced health schemas
class EnhancedDiagnosisRequest(BaseModel):
    selected_diseases: List[int] = Field(default_factory=list)
    symptoms: List[int] = Field(default_factory=list)
    symptom_labels: List[str] = Field(default_factory=list)
    severity: str = "moderate"
    patient_info: Dict[str, Any] = Field(default_factory=dict)


class EnhancedMedicineRequest(BaseModel):
    diagnosis: str
    patient_age: int
    is_pregnant: bool = False
    allergies: List[str] = Field(default_factory=list)
    disease_ids: List[int] = Field(default_factory=list)


class EnhancedEmergencyRequest(BaseModel):
    trigger_type: str = "ABNORMAL_VITALS"
    vitals: Dict[str, Any] = Field(default_factory=dict)


# Medical Report Schemas (new format)
class ScanMeta(BaseModel):
    body_part: str
    scan_type: str
    scan_date: str
    specialist_needed: str


class Condition(BaseModel):
    rank: int
    rank_label: str
    condition: str
    local_name: str
    display_name: str
    common_name: str
    confidence: float
    risk_level: str
    what_it_means: str


class MedicalReport(BaseModel):
    scan_meta: ScanMeta
    conditions: list[Condition]
    overall_risk: str
    immediate_actions: list[str]
    watch_for_signs: list[str]
    ask_doctor: list[str]
    next_step: str
    disclaimer: str
