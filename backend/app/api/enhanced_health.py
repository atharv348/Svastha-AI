from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import User, get_db
from app.models import (
    DiagnosticRecord,
    Disease,
    EmergencyAlert,
    Medicine,
    Symptom
)
from app.schemas import EnhancedDiagnosisRequest, EnhancedEmergencyRequest, EnhancedMedicineRequest
from app.services.svasthaquest_service import auto_trigger_quest
from .users import get_current_user


router = APIRouter(prefix="/enhanced", tags=["enhanced-health"])


# Module-level cache for RAG instance
_RAG_INSTANCE: Any = None


class _FallbackRAG:
    """Safe fallback when optional RAG dependencies are unavailable."""

    def diagnose_with_context(
        self,
        symptoms: list[str],
        patient_info: dict[str, Any],
        selected_diseases: list[str] | None = None,
        severity: str = "moderate",
    ) -> dict[str, Any]:
        selected_diseases = selected_diseases or []
        age = patient_info.get("age", "unknown")
        symptom_text = ", ".join(symptoms) if symptoms else "not specified"
        disease_text = ", ".join(selected_diseases) if selected_diseases else "general differential"

        return {
            "diagnosis": (
                f"Fallback triage summary for age {age}: symptoms include {symptom_text}. "
                f"Likely considerations: {disease_text}. "
                "Hydrate, monitor warning signs, and consult a clinician for confirmation."
            ),
            "context_sources": ["fallback-rule-engine"],
            "confidence": "Low",
            "severity_assessment": severity,
        }

    def get_medicine_recommendations(
        self,
        diagnosis: str,
        patient_age: int,
        is_pregnant: bool = False,
        allergies: list[str] | None = None,
    ) -> str:
        allergies = allergies or []
        pregnancy_note = " Avoid non-prescribed medication in pregnancy." if is_pregnant else ""
        allergy_note = (
            f" Avoid known allergens: {', '.join(allergies)}." if allergies else ""
        )
        return (
            f"Fallback medicine guidance for diagnosis '{diagnosis}' (age {patient_age}). "
            "Use only clinician-approved treatment, consider symptom-relief OTC options where appropriate, "
            "and seek urgent care if red-flag symptoms appear."
            f"{pregnancy_note}{allergy_note}"
        )


def _resolve_knowledge_path() -> str:
    configured = os.getenv("MEDICAL_KNOWLEDGE_PATH")
    if configured:
        return configured

    backend_dir = Path(__file__).resolve().parents[1]
    fallback = backend_dir / "data" / "medical_knowledge"
    return str(fallback)


def _create_rag() -> Any:
    global _RAG_INSTANCE
    if _RAG_INSTANCE is not None:
        return _RAG_INSTANCE

    # Avoid heavy model initialization in environments where RAG is not explicitly enabled.
    rag_enabled = os.getenv("ENABLE_ENHANCED_RAG", "false").strip().lower() in {"1", "true", "yes"}
    if not rag_enabled:
        _RAG_INSTANCE = _FallbackRAG()
        return _RAG_INSTANCE

    try:
        from ai_models.medical_rag import VaidyaAIRAG
    except Exception as exc:
        print(f"RAG import warning, using fallback engine: {exc}")
        _RAG_INSTANCE = _FallbackRAG()
        return _RAG_INSTANCE

    groq_key = os.getenv("GROQ_API_KEY")
    persist_dir = os.getenv("MEDICAL_VECTOR_DB_PATH", "./vaidyaai_chroma_db")

    try:
        rag = VaidyaAIRAG(
            groq_api_key=groq_key,
            knowledge_base_path=_resolve_knowledge_path(),
            persist_directory=persist_dir,
        )
        _RAG_INSTANCE = rag
    except Exception as exc:
        print(f"RAG initialization warning, using fallback engine: {exc}")
        _RAG_INSTANCE = _FallbackRAG()
        return _RAG_INSTANCE

    # Prefer existing index for fast startup.
    try:
        loaded = rag.load_existing_index()
        if not loaded:
            knowledge_path = Path(_resolve_knowledge_path())
            if knowledge_path.exists():
                rag.load_medical_documents(include_indian_sources=True)
    except Exception:
        # Keep service usable even if indexing fails.
        pass

    return _RAG_INSTANCE


def _serialize_medicine(med: Medicine) -> dict[str, Any]:
    return {
        "id": med.id,
        "name": med.name,
        "generic_name": med.generic_name,
        "category": med.category,
        "disease_id": med.disease_id,
        "dosage": med.dosage,
        "frequency": med.frequency,
        "duration": med.duration,
        "side_effects": med.side_effects,
        "contraindications": med.contraindications,
        "age_restrictions": med.age_restrictions,
        "pregnancy_safe": med.pregnancy_safe,
        "price_inr": med.price_inr,
        "prescription_required": med.prescription_required,
    }


def _seed_minimum_catalog(db: Session) -> dict[str, int]:
    disease_specs: list[dict[str, Any]] = [
        {
            "name": "Viral Fever",
            "category": "Infectious",
            "description": "Common viral fever with fatigue and body ache",
            "severity_level": "mild",
            "icd_10_code": "B34.9",
            "symptoms": ["Fever", "Headache", "Body Ache", "Fatigue"],
        },
        {
            "name": "Common Cold",
            "category": "Respiratory",
            "description": "Upper respiratory viral infection with mild symptoms",
            "severity_level": "mild",
            "icd_10_code": "J00",
            "symptoms": ["Runny Nose", "Nasal Congestion", "Sneezing", "Sore Throat", "Cough"],
        },
        {
            "name": "Influenza",
            "category": "Respiratory",
            "description": "Seasonal flu with fever, aches, and cough",
            "severity_level": "moderate",
            "icd_10_code": "J10.1",
            "symptoms": ["Fever", "Chills", "Body Ache", "Headache", "Cough", "Fatigue"],
        },
        {
            "name": "Allergic Rhinitis",
            "category": "Seasonal",
            "description": "Seasonal allergy causing sneezing and nasal irritation",
            "severity_level": "mild",
            "icd_10_code": "J30.9",
            "symptoms": ["Sneezing", "Runny Nose", "Nasal Congestion", "Itchy Eyes"],
        },
        {
            "name": "Seasonal Allergy",
            "category": "Seasonal",
            "description": "Pollen-related allergy symptoms during seasonal changes",
            "severity_level": "mild",
            "icd_10_code": "J30.2",
            "symptoms": ["Sneezing", "Runny Nose", "Itchy Eyes", "Nasal Congestion"],
        },
        {
            "name": "Acute Sinusitis",
            "category": "Respiratory",
            "description": "Inflammation of sinuses causing pressure and congestion",
            "severity_level": "moderate",
            "icd_10_code": "J01.9",
            "symptoms": ["Headache", "Nasal Congestion", "Sore Throat", "Cough"],
        },
        {
            "name": "Dengue",
            "category": "Infectious",
            "description": "Mosquito-borne viral disease",
            "severity_level": "severe",
            "icd_10_code": "A90",
            "symptoms": ["Fever", "Headache", "Body Ache", "Joint Pain", "Rash", "Nausea"],
        },
        {
            "name": "Malaria",
            "category": "Infectious",
            "description": "Mosquito-borne parasitic disease with cyclic fever",
            "severity_level": "severe",
            "icd_10_code": "B54",
            "symptoms": ["Fever", "Chills", "Headache", "Nausea", "Vomiting", "Fatigue"],
        },
        {
            "name": "Typhoid",
            "category": "Infectious",
            "description": "Bacterial infection often spread through contaminated food or water",
            "severity_level": "moderate",
            "icd_10_code": "A01.0",
            "symptoms": ["Fever", "Headache", "Abdominal Pain", "Diarrhea", "Fatigue", "Loss of Appetite"],
        },
        {
            "name": "Viral Gastroenteritis",
            "category": "Gastrointestinal",
            "description": "Stomach and intestine infection causing loose stools and vomiting",
            "severity_level": "moderate",
            "icd_10_code": "A08.4",
            "symptoms": ["Nausea", "Vomiting", "Diarrhea", "Abdominal Pain", "Fever"],
        },
        {
            "name": "Food Poisoning",
            "category": "Gastrointestinal",
            "description": "Illness caused by contaminated food or drink",
            "severity_level": "moderate",
            "icd_10_code": "A05.9",
            "symptoms": ["Nausea", "Vomiting", "Diarrhea", "Abdominal Pain", "Fever"],
        },
        {
            "name": "Conjunctivitis",
            "category": "Infectious",
            "description": "Eye infection or allergy causing redness and irritation",
            "severity_level": "mild",
            "icd_10_code": "H10.9",
            "symptoms": ["Red Eyes", "Eye Discharge", "Itchy Eyes"],
        },
        {
            "name": "Acute Bronchitis",
            "category": "Respiratory",
            "description": "Inflammation of bronchial tubes causing cough and chest discomfort",
            "severity_level": "moderate",
            "icd_10_code": "J20.9",
            "symptoms": ["Cough", "Chest Tightness", "Wheezing", "Fatigue", "Fever"],
        },
        {
            "name": "Asthma Exacerbation",
            "category": "Respiratory",
            "description": "Worsening asthma symptoms with breathing difficulty",
            "severity_level": "severe",
            "icd_10_code": "J45.901",
            "symptoms": ["Wheezing", "Shortness of Breath", "Chest Tightness", "Cough"],
        },
        {
            "name": "Heat Exhaustion",
            "category": "Seasonal",
            "description": "Heat-related condition with dehydration and weakness",
            "severity_level": "moderate",
            "icd_10_code": "T67.5",
            "symptoms": ["Dizziness", "Fatigue", "Excessive Thirst", "Muscle Cramps", "Headache"],
        },
        {
            "name": "Dehydration",
            "category": "Seasonal",
            "description": "Fluid depletion, often more common in hot weather",
            "severity_level": "moderate",
            "icd_10_code": "E86.0",
            "symptoms": ["Excessive Thirst", "Dizziness", "Fatigue", "Muscle Cramps"],
        },
        {
            "name": "Hypertension",
            "category": "Cardiovascular",
            "description": "Persistently elevated blood pressure",
            "severity_level": "moderate",
            "icd_10_code": "I10",
            "symptoms": ["Headache", "Dizziness"],
        },
        {
            "name": "Migraine",
            "category": "Neurological",
            "description": "Recurring severe headaches with sensitivity to light",
            "severity_level": "moderate",
            "icd_10_code": "G43.9",
            "symptoms": ["Headache", "Nausea", "Sensitivity to Light", "Dizziness"],
        },
    ]

    symptom_defaults: dict[str, dict[str, str]] = {
        "Fever": {"description": "Elevated body temperature", "body_part": "General"},
        "Headache": {"description": "Persistent head pain", "body_part": "Head"},
        "Body Ache": {"description": "Muscle and joint ache", "body_part": "General"},
        "Fatigue": {"description": "Unusual tiredness and low energy", "body_part": "General"},
        "Runny Nose": {"description": "Nasal discharge", "body_part": "Nose"},
        "Nasal Congestion": {"description": "Blocked or stuffy nose", "body_part": "Nose"},
        "Sneezing": {"description": "Repeated sneezing episodes", "body_part": "Nose"},
        "Sore Throat": {"description": "Pain or irritation in throat", "body_part": "Throat"},
        "Cough": {"description": "Persistent cough", "body_part": "Chest"},
        "Chills": {"description": "Feeling cold with shivering", "body_part": "General"},
        "Itchy Eyes": {"description": "Eye irritation with itching", "body_part": "Eyes"},
        "Joint Pain": {"description": "Pain in joints", "body_part": "General"},
        "Rash": {"description": "Skin irritation or eruptions", "body_part": "Skin"},
        "Nausea": {"description": "Feeling of wanting to vomit", "body_part": "Abdomen"},
        "Vomiting": {"description": "Forceful emptying of stomach", "body_part": "Abdomen"},
        "Abdominal Pain": {"description": "Pain in stomach area", "body_part": "Abdomen"},
        "Diarrhea": {"description": "Frequent loose stools", "body_part": "Abdomen"},
        "Loss of Appetite": {"description": "Reduced desire to eat", "body_part": "General"},
        "Red Eyes": {"description": "Eye redness", "body_part": "Eyes"},
        "Eye Discharge": {"description": "Sticky or watery eye discharge", "body_part": "Eyes"},
        "Wheezing": {"description": "Whistling sound while breathing", "body_part": "Chest"},
        "Shortness of Breath": {"description": "Difficulty breathing", "body_part": "Chest"},
        "Chest Tightness": {"description": "Pressure or tightness in chest", "body_part": "Chest"},
        "Dizziness": {"description": "Feeling lightheaded or unsteady", "body_part": "Head"},
        "Excessive Thirst": {"description": "Persistent and increased thirst", "body_part": "General"},
        "Muscle Cramps": {"description": "Sudden painful muscle contractions", "body_part": "General"},
        "Sensitivity to Light": {"description": "Discomfort in bright light", "body_part": "Head"},
    }

    existing_diseases = {item.name.lower(): item for item in db.query(Disease).all()}
    existing_symptoms = {item.name.lower(): item for item in db.query(Symptom).all()}

    for spec in disease_specs:
        disease_key = str(spec["name"]).lower()
        disease = existing_diseases.get(disease_key)

        if disease is None:
            disease = Disease(
                name=str(spec["name"]),
                category=str(spec.get("category") or "General"),
                description=str(spec.get("description") or ""),
                severity_level=str(spec.get("severity_level") or "moderate"),
                icd_10_code=str(spec.get("icd_10_code") or ""),
            )
            db.add(disease)
            existing_diseases[disease_key] = disease
        else:
            if not disease.category and spec.get("category"):
                disease.category = str(spec["category"])
            if not disease.description and spec.get("description"):
                disease.description = str(spec["description"])
            if not disease.severity_level and spec.get("severity_level"):
                disease.severity_level = str(spec["severity_level"])
            if not disease.icd_10_code and spec.get("icd_10_code"):
                disease.icd_10_code = str(spec["icd_10_code"])

        for symptom_name in spec.get("symptoms", []):
            symptom_key = str(symptom_name).lower()
            symptom = existing_symptoms.get(symptom_key)
            symptom_meta = symptom_defaults.get(str(symptom_name), {})

            if symptom is None:
                symptom = Symptom(
                    name=str(symptom_name),
                    description=str(symptom_meta.get("description") or ""),
                    body_part=str(symptom_meta.get("body_part") or "General"),
                )
                db.add(symptom)
                existing_symptoms[symptom_key] = symptom
            else:
                if not symptom.description and symptom_meta.get("description"):
                    symptom.description = str(symptom_meta["description"])
                if not symptom.body_part and symptom_meta.get("body_part"):
                    symptom.body_part = str(symptom_meta["body_part"])

            if symptom not in disease.symptoms:
                disease.symptoms.append(symptom)

    db.flush()

    medicine_specs = [
        {
            "name": "Paracetamol",
            "generic_name": "Acetaminophen",
            "category": "OTC",
            "disease_name": "Viral Fever",
            "dosage": "500 mg",
            "frequency": "Every 6-8 hours",
            "duration": "3-5 days",
            "side_effects": ["nausea"],
            "contraindications": ["liver disease"],
            "age_restrictions": "Above 12 years",
            "pregnancy_safe": True,
            "price_inr": 25.0,
            "prescription_required": False,
        },
        {
            "name": "ORS",
            "generic_name": "Oral Rehydration Salts",
            "category": "OTC",
            "disease_name": "Dengue",
            "dosage": "1 sachet in 1L water",
            "frequency": "Sips through the day",
            "duration": "As needed",
            "side_effects": [],
            "contraindications": [],
            "age_restrictions": "All ages",
            "pregnancy_safe": True,
            "price_inr": 20.0,
            "prescription_required": False,
        },
        {
            "name": "Amlodipine",
            "generic_name": "Amlodipine",
            "category": "Prescription",
            "disease_name": "Hypertension",
            "dosage": "5 mg",
            "frequency": "Once daily",
            "duration": "As prescribed",
            "side_effects": ["ankle swelling", "dizziness"],
            "contraindications": ["severe hypotension"],
            "age_restrictions": "Adult use",
            "pregnancy_safe": False,
            "price_inr": 70.0,
            "prescription_required": True,
        },
        {
            "name": "Cetirizine",
            "generic_name": "Cetirizine",
            "category": "OTC",
            "disease_name": "Allergic Rhinitis",
            "dosage": "10 mg",
            "frequency": "Once daily",
            "duration": "3-5 days",
            "side_effects": ["drowsiness"],
            "contraindications": ["severe kidney disease"],
            "age_restrictions": "Above 6 years",
            "pregnancy_safe": True,
            "price_inr": 35.0,
            "prescription_required": False,
        },
    ]

    existing_medicine_keys = {
        (item.name.lower(), item.disease_id) for item in db.query(Medicine).all()
    }

    for spec in medicine_specs:
        disease = existing_diseases.get(str(spec["disease_name"]).lower())
        if disease is None:
            continue

        med_key = (str(spec["name"]).lower(), disease.id)
        if med_key in existing_medicine_keys:
            continue

        db.add(
            Medicine(
                name=str(spec["name"]),
                generic_name=str(spec.get("generic_name") or ""),
                category=str(spec.get("category") or "OTC"),
                disease_id=disease.id,
                dosage=str(spec.get("dosage") or ""),
                frequency=str(spec.get("frequency") or ""),
                duration=str(spec.get("duration") or ""),
                side_effects=spec.get("side_effects") or [],
                contraindications=spec.get("contraindications") or [],
                age_restrictions=str(spec.get("age_restrictions") or ""),
                pregnancy_safe=bool(spec.get("pregnancy_safe")),
                price_inr=float(spec.get("price_inr") or 0.0),
                prescription_required=bool(spec.get("prescription_required", True)),
            )
        )
        existing_medicine_keys.add(med_key)

    db.commit()

    return {
        "diseases": db.query(Disease).count(),
        "symptoms": db.query(Symptom).count(),
        "medicines": db.query(Medicine).count(),
    }


@router.post("/catalog/seed")
def seed_catalog(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Ensure regular and seasonal disease catalog entries are present."""
    stats = _seed_minimum_catalog(db)
    return {"message": "Catalog ready", "stats": stats}


@router.get("/diseases")
def get_diseases(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    diseases = db.query(Disease).order_by(Disease.category.asc(), Disease.name.asc()).all()

    grouped: dict[str, list[dict[str, Any]]] = {}
    for disease in diseases:
        category = disease.category or "General"
        grouped.setdefault(category, []).append(
            {
                "id": disease.id,
                "name": disease.name,
                "severity_level": disease.severity_level,
                "icd_10_code": disease.icd_10_code,
                "description": disease.description,
            }
        )

    return grouped


@router.get("/symptoms")
def get_symptoms(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    symptoms = db.query(Symptom).order_by(Symptom.body_part.asc(), Symptom.name.asc()).all()
    return [
        {
            "id": symptom.id,
            "name": symptom.name,
            "description": symptom.description,
            "body_part": symptom.body_part,
        }
        for symptom in symptoms
    ]


@router.post("/diagnose")
def diagnose(
    payload: EnhancedDiagnosisRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    selected = (
        db.query(Disease).filter(Disease.id.in_(payload.selected_diseases)).all()
        if payload.selected_diseases
        else []
    )
    symptom_rows = (
        db.query(Symptom).filter(Symptom.id.in_(payload.symptoms)).all() if payload.symptoms else []
    )

    disease_names = [d.name for d in selected]
    symptom_names = [s.name for s in symptom_rows]
    if payload.symptom_labels:
        symptom_names.extend([name for name in payload.symptom_labels if name not in symptom_names])

    if not symptom_names:
        raise HTTPException(status_code=400, detail="Provide at least one symptom")

    rag = _create_rag()
    diagnosis_result = rag.diagnose_with_context(
        symptoms=symptom_names,
        patient_info=payload.patient_info,
        selected_diseases=disease_names,
        severity=payload.severity,
    )

    catalog_meds = (
        db.query(Medicine).filter(Medicine.disease_id.in_(payload.selected_diseases)).all()
        if payload.selected_diseases
        else []
    )

    record = DiagnosticRecord(
        user_id=current_user.id,
        selected_diseases=payload.selected_diseases,
        symptoms=payload.symptoms,
        severity=payload.severity,
        image_path=None,
        cnn_predictions=None,
        rag_diagnosis=diagnosis_result.get("diagnosis"),
        confidence_scores={"rag_confidence": diagnosis_result.get("confidence", "Medium")},
        suggested_medicines=[_serialize_medicine(med) for med in catalog_meds],
        lifestyle_advice="Maintain hydration, rest, and timely clinician follow-up.",
        followup_needed=payload.severity.lower() in {"severe", "critical"},
    )

    db.add(record)
    auto_trigger_quest(current_user.id, "diagnosis", db)
    db.commit()
    db.refresh(record)

    urgency_level = str(diagnosis_result.get("severity_assessment") or payload.severity or "moderate").lower()
    confidence_value = diagnosis_result.get("confidence", 0)
    try:
        confidence_numeric = float(confidence_value)
    except Exception:
        confidence_numeric = 0.0

    normalized_medicines = [_serialize_medicine(med) for med in catalog_meds]
    required_medicines = [med.get("name") for med in normalized_medicines if med.get("name")]
    context_sources = diagnosis_result.get("context_sources")
    if not isinstance(context_sources, list):
        context_sources = []

    recommended_actions = [
        "Monitor symptom progression for 24-48 hours.",
        "Use clinician guidance before starting any prescription medicine.",
    ]
    if urgency_level in {"severe", "critical"}:
        recommended_actions.insert(0, "Seek urgent in-person medical evaluation.")

    emergency_required = urgency_level == "critical"

    return {
        "record_id": record.id,
        "diagnosis": diagnosis_result,
        "catalog_medicines": normalized_medicines,
        "diagnosis_result": {
            "diagnosis": diagnosis_result.get("diagnosis"),
            "confidence": confidence_numeric,
            "urgency_level": urgency_level,
            "recommendations": context_sources,
            "required_medicines": required_medicines,
            "explanation": diagnosis_result.get("diagnosis"),
        },
        "recommended_actions": recommended_actions,
        "emergency_required": emergency_required,
    }


@router.get("/diagnostic/history")
def diagnostic_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        db.query(DiagnosticRecord)
        .filter(DiagnosticRecord.user_id == current_user.id)
        .order_by(DiagnosticRecord.timestamp.desc())
        .all()
    )

    return [
        {
            "id": row.id,
            "selected_diseases": row.selected_diseases,
            "symptoms": row.symptoms,
            "severity": row.severity,
            "rag_diagnosis": row.rag_diagnosis,
            "confidence_scores": row.confidence_scores,
            "suggested_medicines": row.suggested_medicines,
            "timestamp": row.timestamp,
        }
        for row in rows
    ]


@router.post("/medicines/recommendations")
def medicine_recommendations(
    payload: EnhancedMedicineRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Medicine)
    if payload.disease_ids:
        query = query.filter(Medicine.disease_id.in_(payload.disease_ids))

    medicines = query.order_by(Medicine.name.asc()).all()

    rag = _create_rag()
    try:
        ai_text = rag.get_medicine_recommendations(
            diagnosis=payload.diagnosis,
            patient_age=payload.patient_age,
            is_pregnant=payload.is_pregnant,
            allergies=payload.allergies,
        )
    except Exception as exc:
        print(f"medicine recommendations fallback triggered: {exc}")
        ai_text = _FallbackRAG().get_medicine_recommendations(
            diagnosis=payload.diagnosis,
            patient_age=payload.patient_age,
            is_pregnant=payload.is_pregnant,
            allergies=payload.allergies,
        )

    catalog_recommendations = [_serialize_medicine(med) for med in medicines]
    recommended_medicines = [
        {
            "medicine_name": med.get("name") or med.get("generic_name") or "Medicine",
            "generic_name": med.get("generic_name"),
            "category": med.get("category"),
            "dosage": med.get("dosage"),
            "frequency": med.get("frequency"),
            "duration": med.get("duration"),
            "side_effects": med.get("side_effects") or [],
            "contraindications": med.get("contraindications") or [],
            "pregnancy_safe": med.get("pregnancy_safe"),
            "price_inr": med.get("price_inr"),
            "prescription_required": med.get("prescription_required"),
            "notes": "Prescription required" if med.get("prescription_required") else "OTC option",
        }
        for med in catalog_recommendations
    ]

    safety_note = "AI guidance is assistive only; final prescription must be clinician-approved."
    warnings: list[str] = [safety_note]
    if payload.is_pregnant:
        warnings.append("Pregnancy reported. Avoid self-medication and consult an obstetric clinician first.")
    if payload.allergies:
        warnings.append(f"Allergy alert: avoid compounds related to {', '.join(payload.allergies)}.")
    if not recommended_medicines:
        warnings.append("No catalog medicines matched this condition; seek clinician advice for personalized treatment.")

    return {
        "catalog_recommendations": catalog_recommendations,
        "recommended_medicines": recommended_medicines,
        "ai_recommendations": ai_text,
        "safety_note": safety_note,
        "warnings": warnings,
    }


@router.post("/emergency/alert")
async def emergency_alert(
    payload: EnhancedEmergencyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from ai_models.emergency_system import VaidyaAIEmergencySystem

    system = VaidyaAIEmergencySystem(db_session=db, config=dict(os.environ))

    trigger_type = payload.trigger_type.upper().strip()
    if trigger_type == "MANUAL_SOS":
        result = await system.manual_sos(user_id=current_user.id, vitals=payload.vitals)
        return {"message": "Manual SOS dispatched", "result": result}

    monitor_result = await system.monitor_vitals(user_id=current_user.id, vitals=payload.vitals)
    return {"message": "Vitals processed", "result": monitor_result}


@router.get("/emergency/history")
def emergency_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        db.query(EmergencyAlert)
        .filter(EmergencyAlert.user_id == current_user.id)
        .order_by(EmergencyAlert.timestamp.desc())
        .all()
    )

    return [
        {
            "id": row.id,
            "alert_type": row.alert_type,
            "severity": row.severity,
            "status": row.status,
            "latitude": row.latitude,
            "longitude": row.longitude,
            "hospitals_notified": row.hospitals_notified,
            "contacts_notified": row.contacts_notified,
            "timestamp": row.timestamp,
        }
        for row in rows
    ]
