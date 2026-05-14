from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import json
import os
import uuid
from datetime import datetime, timezone
from PIL import Image
import io

from database import get_db, User, UserDisabilityProfile, DisabilityScheme, ApplicationStatus
from .users import get_current_user
from pydantic import BaseModel
from schemas import DisabilityProfileUpdateRequest
from services.groq_service import generate_ai_content, get_sahayak_guidance
from services.scheme_search import get_scheme_search_engine

# Defer OCR dependency import and model initialization to request time.
ocr_predictor = None
DocumentFile = None
ocr_model = None


def get_ocr_dependencies():
    global ocr_predictor, DocumentFile
    if ocr_predictor is None or DocumentFile is None:
        try:
            from doctr.models import ocr_predictor as doctr_ocr_predictor
            from doctr.io import DocumentFile as doctr_document_file
            ocr_predictor = doctr_ocr_predictor
            DocumentFile = doctr_document_file
        except ImportError:
            return None, None
    return ocr_predictor, DocumentFile

router = APIRouter(prefix="/sahayak", tags=["sahayak"])

class SchemeResponse(BaseModel):
    id: Optional[int] = None
    name: str
    description: str
    benefit_type: str
    ease_score: int
    category: str
    match_score: float
    missing_documents: List[str]
    eligibility_summary: Optional[str] = None

    class Config:
        from_attributes = True

class SearchResponse(BaseModel):
    answer: str
    schemes: List[SchemeResponse]
    sources: List[dict]
    query: str


def _parse_disability_types(raw_value: Optional[str]) -> list[str]:
    if not raw_value:
        return []
    text = raw_value.strip()
    if not text:
        return []

    if text.startswith("["):
        try:
            parsed = json.loads(text)
            if isinstance(parsed, list):
                return [str(item).strip() for item in parsed if str(item).strip()]
        except Exception:
            pass

    return [text]


def _normalized_types(types: Optional[List[str]]) -> list[str]:
    if not types:
        return []
    seen: set[str] = set()
    out: list[str] = []
    for row in types:
        value = str(row).strip()
        if not value:
            continue
        key = value.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(value)
    return out


def _build_search_profile(profile: UserDisabilityProfile) -> dict:
    disability_types = _parse_disability_types(profile.disability_type)
    primary_type = ", ".join(disability_types) if disability_types else (profile.disability_type or "")
    return {
        "disability_type": primary_type,
        "disability_types": disability_types,
        "disability_percentage": profile.disability_percentage,
        "income_annual": profile.income_annual,
        "state": profile.state,
    }

@router.post("/profile")
def update_profile(
    data: DisabilityProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(UserDisabilityProfile).filter(UserDisabilityProfile.user_id == current_user.id).first()
    if not profile:
        profile = UserDisabilityProfile(user_id=current_user.id)
        db.add(profile)

    payload = data.dict(exclude_unset=True)
    incoming_types: Optional[list[str]] = None
    if "disability_types" in payload:
        incoming_types = _normalized_types(payload.pop("disability_types") or [])
    elif "disability_type" in payload:
        single = str(payload.pop("disability_type") or "").strip()
        incoming_types = _normalized_types([single]) if single else []

    if incoming_types is not None:
        profile.disability_type = json.dumps(incoming_types) if incoming_types else ""

    for key, value in payload.items():
        setattr(profile, key, value)
    
    db.commit()
    return {
        "status": "success",
        "message": "Profile updated",
        "disability_types": _parse_disability_types(profile.disability_type),
    }

@router.post("/scan-document")
async def scan_document(
    file: UploadFile = File(...),
    doc_type: str = "disability_certificate", # disability_certificate, aadhaar, income_cert
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Save file
    UPLOAD_DIR = os.path.join(os.getcwd(), "uploads", "disability_docs")
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    
    file_ext = file.filename.split(".")[-1]
    file_name = f"{uuid.uuid4()}.{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, file_name)
    
    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)
    
    # Perform OCR
    ocr_text = ""
    predictor, document_file_cls = get_ocr_dependencies()
    if predictor and document_file_cls:
        try:
            global ocr_model
            if ocr_model is None:
                ocr_model = predictor(pretrained=True)
            doc = document_file_cls.from_images([contents])
            result = ocr_model(doc)
            ocr_text = result.render()
        except Exception as e:
            print(f"OCR Error: {e}")
            ocr_text = ""
    else:
        # Mock OCR for demo if model not loaded
        ocr_text = f"Sample OCR text for {doc_type} of user {current_user.full_name}"

    # Use LLM to parse OCR text
    prompt = f"""
    Analyze this OCR text from a {doc_type} and extract key information in JSON format.
    OCR TEXT: {ocr_text}
    
    Required fields for disability_certificate: disability_type, percentage, certificate_number, issue_date.
    Required fields for aadhaar: name, aadhaar_number, dob, address.
    Required fields for income_cert: annual_income, name, financial_year.
    """
    
    parsed_info_str = generate_ai_content(prompt)
    try:
        # Extract JSON from LLM response
        start = parsed_info_str.find('{')
        end = parsed_info_str.rfind('}') + 1
        if start != -1 and end != -1:
            parsed_info = json.loads(parsed_info_str[start:end])
        else:
            parsed_info = {"raw_text": ocr_text, "error": "No JSON found in AI response"}
    except Exception as e:
        print(f"JSON Parsing Error: {e}")
        parsed_info = {"raw_text": ocr_text, "error": str(e)}

    # Update profile based on parsed info
    profile = db.query(UserDisabilityProfile).filter(UserDisabilityProfile.user_id == current_user.id).first()
    if not profile:
        profile = UserDisabilityProfile(user_id=current_user.id)
        db.add(profile)
    
    docs = json.loads(profile.documents_json) if profile.documents_json else {}
    docs[doc_type] = {
        "file_path": file_path,
        "parsed_info": parsed_info,
        "verified": True,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    profile.documents_json = json.dumps(docs)
    
    # Auto-fill profile fields if found
    if doc_type == "disability_certificate":
        if "disability_type" in parsed_info:
            existing_types = _parse_disability_types(profile.disability_type)
            merged_types = _normalized_types(existing_types + [str(parsed_info["disability_type"])])
            profile.disability_type = json.dumps(merged_types) if merged_types else profile.disability_type
        if "percentage" in parsed_info: profile.disability_percentage = float(parsed_info["percentage"])
    elif doc_type == "aadhaar":
        profile.has_aadhaar = True
    elif doc_type == "income_cert":
        if "annual_income" in parsed_info: profile.income_annual = float(parsed_info["annual_income"])

    db.commit()
    return {"status": "success", "parsed_info": parsed_info}

@router.get("/profile")
def get_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(UserDisabilityProfile).filter(UserDisabilityProfile.user_id == current_user.id).first()
    if not profile:
        profile = UserDisabilityProfile(user_id=current_user.id)
        db.add(profile)
        db.commit()
    
    disability_types = _parse_disability_types(profile.disability_type)
    return {
        "disability_type": disability_types[0] if disability_types else (profile.disability_type or ""),
        "disability_types": disability_types,
        "disability_percentage": profile.disability_percentage or 0,
        "income_annual": profile.income_annual or 0,
        "state": profile.state or "All"
    }

@router.get("/matches")
def get_scheme_matches(
    q: Optional[str] = None,
    realtime: bool = True,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    search_engine = Depends(get_scheme_search_engine)
):
    profile = db.query(UserDisabilityProfile).filter(UserDisabilityProfile.user_id == current_user.id).first()
    if not profile:
        return []

    user_profile = _build_search_profile(profile)

    if realtime:
        # 1. Try real-time search first
        search_results = search_engine.search_schemes(user_profile)
        if "schemes" in search_results and search_results["schemes"]:
            # Reformat to match SchemeResponse
            matches = []
            for s in search_results["schemes"]:
                matches.append({
                    "id": None,
                    "name": s["name"],
                    "description": s["description"],
                    "benefit_type": s["benefit_type"],
                    "ease_score": s["ease_score"],
                    "category": s["category"],
                    "match_score": (s["ease_score"] * 10), # Basic match score from ease_score
                    "missing_documents": s.get("required_documents", []),
                    "eligibility_summary": s.get("eligibility_summary", "")
                })
            return matches

    # 2. Fallback to static database logic if realtime is false or search fails
    query = db.query(DisabilityScheme)
    if q:
        query = query.filter(
            (DisabilityScheme.name.ilike(f"%{q}%")) | 
            (DisabilityScheme.description.ilike(f"%{q}%")) |
            (DisabilityScheme.category.ilike(f"%{q}%")) |
            (DisabilityScheme.benefit_type.ilike(f"%{q}%"))
        )
    
    schemes = query.all()
    user_docs = json.loads(profile.documents_json) if profile.documents_json else {}
    
    matches = []
    for scheme in schemes:
        # (Same eligibility logic as before...)
        criteria = json.loads(scheme.eligibility_criteria)
        required_docs = json.loads(scheme.required_documents)
        
        is_eligible = True
        # Simple eligibility logic
        if criteria.get("min_percentage") is not None:
            min_perc = float(criteria["min_percentage"])
            user_perc = float(profile.disability_percentage) if profile.disability_percentage is not None else 0.0
            if user_perc < min_perc:
                is_eligible = False
        
        if criteria.get("max_income") is not None:
            max_inc = float(criteria["max_income"])
            user_inc = float(profile.income_annual) if profile.income_annual is not None else 0.0
            if max_inc == 0 and user_inc > 0:
                is_eligible = False
            elif max_inc > 0 and user_inc > max_inc:
                is_eligible = False
        
        if criteria.get("state") and criteria["state"] != "All":
            if profile.state and profile.state != "All" and profile.state != criteria["state"]:
                is_eligible = False
        
        if not is_eligible:
            continue
            
        # Calculate Match Score and Missing Docs
        doc_count = 0
        missing = []
        for doc in required_docs:
            if doc not in user_docs:
                missing.append(doc)
            else:
                doc_count += 1
        
        match_score = (scheme.ease_score * 4) + (doc_count / len(required_docs) * 60) if required_docs else 100
        
        matches.append({
            "id": scheme.id,
            "name": scheme.name,
            "description": scheme.description,
            "benefit_type": scheme.benefit_type,
            "ease_score": scheme.ease_score,
            "category": scheme.category,
            "match_score": match_score,
            "missing_documents": missing
        })
        
    return sorted(matches, key=lambda x: x["match_score"], reverse=True)

@router.get("/guidance")
def get_sahayak_ai_guidance(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    search_engine = Depends(get_scheme_search_engine)
):
    profile = db.query(UserDisabilityProfile).filter(UserDisabilityProfile.user_id == current_user.id).first()
    if not profile:
        return {"guidance": "Please update your eligibility profile to get personalized guidance."}

    user_profile = _build_search_profile(profile)

    # Use the search engine to get a synthesized answer
    guidance_query = "Provide concise guidance for top disability schemes for this profile"
    results = search_engine.search_schemes(user_profile, question=guidance_query)
    
    if "answer" in results and results["answer"]:
        return {"guidance": results["answer"]}
    
    # Fallback to the old guidance logic if search engine fails
    matches = get_scheme_matches(current_user=current_user, db=db, realtime=False)
    guidance = get_sahayak_guidance(user_profile, matches)
    return {"guidance": guidance}

@router.post("/search", response_model=SearchResponse)
async def semantic_search(
    question: str = Form(...),
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    search_engine = Depends(get_scheme_search_engine)
):
    print(f"Received Sahayak search request: {question}")
    profile = db.query(UserDisabilityProfile).filter(UserDisabilityProfile.user_id == current_user.id).first()
    if not profile:
        print("Profile not found for Sahayak search")
        raise HTTPException(status_code=404, detail="Profile not found")

    user_profile = _build_search_profile(profile)
    print(f"User profile: {user_profile}")

    types_text = ", ".join(user_profile.get("disability_types", [])) or user_profile.get("disability_type", "disabled")
    final_query = f"{question} for a {user_profile['disability_percentage']}% {types_text} disabled person in {user_profile['state']}"
    
    try:
        results = search_engine.search_schemes(user_profile, question=question)
        print("Search engine results obtained")
    except Exception as e:
        print(f"Search engine error: {e}")
        raise HTTPException(status_code=500, detail=f"Search engine error: {str(e)}")
    
    # Reformat schemes to match SchemeResponse
    schemes = []
    if "schemes" in results:
        for s in results["schemes"]:
            required_docs = s.get("required_documents") or []
            if not isinstance(required_docs, list):
                required_docs = []

            # Support both legacy and new search engine payload shapes.
            ease_score = s.get("ease_score")
            if ease_score is None:
                match_score = float(s.get("match_score", 70.0))
                ease_score = max(1, min(10, int(round(match_score / 10))))
            else:
                match_score = float(s.get("match_score", ease_score * 10))

            schemes.append({
                "id": None,
                "name": s.get("name", "Unknown Scheme"),
                "description": s.get("description", "Description unavailable"),
                "benefit_type": s.get("benefit_type", "General"),
                "ease_score": ease_score,
                "category": s.get("category", "General"),
                "match_score": match_score,
                "missing_documents": required_docs,
                "eligibility_summary": s.get("eligibility_summary", "")
            })

    print(f"Returning {len(schemes)} schemes")
    
    answer = results.get("answer", "No specific guidance found.")
    if not answer or answer.strip() == "" or "No specific guidance found" in answer:
        answer = "I'm sorry, I couldn't find specific real-time details for your query right now. However, for the ADIP scheme, you generally need a disability certificate (40%+), income proof, and Aadhaar card. You can apply at your nearest District Disability Rehabilitation Centre (DDRC)."

    return {
        "answer": answer,
        "schemes": schemes,
        "sources": results.get("sources", []),
        "query": results.get("query", final_query)
    }

@router.post("/apply/{scheme_id}")
def apply_for_scheme(
    scheme_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check if already applied
    existing = db.query(ApplicationStatus).filter(
        ApplicationStatus.user_id == current_user.id,
        ApplicationStatus.scheme_id == scheme_id
    ).first()
    
    if existing:
        return {"status": "info", "message": "Already applied for this scheme"}
        
    application = ApplicationStatus(
        user_id=current_user.id,
        scheme_id=scheme_id,
        status="submitted",
        notes="Application started via SahayakAI"
    )
    db.add(application)
    db.commit()
    return {"status": "success", "message": "Application submitted"}
