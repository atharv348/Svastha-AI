from database import SessionLocal, DisabilityScheme, init_db
import json

def seed_data():
    init_db()
    db = SessionLocal()
    
    # Clear existing schemes to ensure fresh data
    db.query(DisabilityScheme).delete()
    db.commit()
    print("Cleared existing schemes.")

    schemes = [
        {
            "name": "UDID Card (Unique Disability ID)",
            "description": "A single document of identification and verification for persons with disabilities to avail various benefits. Recognized nationwide.",
            "eligibility_criteria": json.dumps({
                "min_percentage": 0,
                "state": "All"
            }),
            "required_documents": json.dumps(["disability_certificate", "aadhaar"]),
            "benefit_type": "Identification",
            "ease_score": 10,
            "category": "Central"
        },
        {
            "name": "National Scholarship for Students with Disabilities",
            "description": "Financial assistance for students with more than 40% disability pursuing higher education (Pre-matric, Post-matric, and Top Class Education).",
            "eligibility_criteria": json.dumps({
                "min_percentage": 40,
                "max_income": 250000,
                "state": "All"
            }),
            "required_documents": json.dumps(["disability_certificate", "aadhaar", "income_cert", "admission_proof"]),
            "benefit_type": "Scholarship",
            "ease_score": 8,
            "category": "Central"
        },
        {
            "name": "ADIP Scheme (Assistance to Disabled Persons)",
            "description": "Assistance for purchase/fitting of aids and appliances (wheelchairs, hearing aids, calipers) to promote rehabilitation.",
            "eligibility_criteria": json.dumps({
                "min_percentage": 40,
                "max_income": 180000,
                "state": "All"
            }),
            "required_documents": json.dumps(["disability_certificate", "aadhaar", "income_cert"]),
            "benefit_type": "Aids & Appliances",
            "ease_score": 7,
            "category": "Central"
        },
        {
            "name": "Indira Gandhi National Disability Pension Scheme (IGNDPS)",
            "description": "Monthly pension for BPL persons aged 18-79 years with severe or multiple disabilities (80% or more).",
            "eligibility_criteria": json.dumps({
                "min_percentage": 80,
                "max_income": 0, # BPL category
                "state": "All"
            }),
            "required_documents": json.dumps(["disability_certificate", "aadhaar", "bpl_card"]),
            "benefit_type": "Pension",
            "ease_score": 5,
            "category": "Central"
        },
        {
            "name": "Railway Concession for PwDs",
            "description": "Concession in passenger fares for persons with disabilities and one escort. Valid for various categories of disabilities.",
            "eligibility_criteria": json.dumps({
                "min_percentage": 40,
                "state": "All"
            }),
            "required_documents": json.dumps(["railway_concession_certificate", "aadhaar"]),
            "benefit_type": "Travel Concession",
            "ease_score": 9,
            "category": "Central"
        },
        {
            "name": "NHFDC Self-Employment Loan",
            "description": "Concessional loans for persons with disabilities to start or expand small businesses and self-employment ventures.",
            "eligibility_criteria": json.dumps({
                "min_percentage": 40,
                "max_income": 500000,
                "state": "All"
            }),
            "required_documents": json.dumps(["disability_certificate", "aadhaar", "income_cert", "project_report"]),
            "benefit_type": "Financial Loan",
            "ease_score": 4,
            "category": "Central"
        },
        {
            "name": "Niramaya Health Insurance (National Trust)",
            "description": "Affordable health insurance for persons with Autism, Cerebral Palsy, Mental Retardation, and Multiple Disabilities.",
            "eligibility_criteria": json.dumps({
                "disability_type": ["Autism", "Cerebral Palsy", "Mental Retardation", "Multiple Disabilities"],
                "state": "All"
            }),
            "required_documents": json.dumps(["disability_certificate", "aadhaar", "guardian_proof"]),
            "benefit_type": "Health Insurance",
            "ease_score": 8,
            "category": "Central"
        },
        {
            "name": "State Disability Pension (Maharashtra)",
            "description": "Financial assistance provided by the Maharashtra state government for residents with disabilities.",
            "eligibility_criteria": json.dumps({
                "min_percentage": 40,
                "max_income": 120000,
                "state": "Maharashtra"
            }),
            "required_documents": json.dumps(["disability_certificate", "aadhaar", "income_cert", "residence_proof"]),
            "benefit_type": "Pension",
            "ease_score": 6,
            "category": "State"
        }
    ]

    for scheme_data in schemes:
        scheme = DisabilityScheme(**scheme_data)
        db.add(scheme)
    
    db.commit()
    print(f"Successfully seeded {len(schemes)} real-world schemes.")
    db.close()

if __name__ == "__main__":
    seed_data()
