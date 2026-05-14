import os
import sys
# Add both backend and project root to sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
sys.path.append(current_dir)
sys.path.append(project_root)

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api import users, token, workout, meals, coach, progress, predictions, sahayak, manasmitra, enhanced_health, svasthaquest, medical_report
from app.db.database import init_db, SessionLocal, User, Base, engine
from app.services.auth import get_password_hash
import json
# Updated SvasthaAI Backend
app = FastAPI(title="SvasthaAI API")

# Initialize database immediately
init_db()

# Create tables and users
Base.metadata.create_all(bind=engine)

db = SessionLocal()
try:
    if not db.query(User).filter(User.username == "admin").first():
        admin = User(
            username="admin",
            email="admin@svastha.ai",
            full_name="Admin User",
            hashed_password=get_password_hash("admin123")
        )
        db.add(admin)
        db.commit()
finally:
    db.close()

# Ensure storage directories exist
os.makedirs("storage/db", exist_ok=True)
os.makedirs("storage/uploads/svasthaai_predictions", exist_ok=True)

# CORS - Allow frontend from any origin for deployment flexibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for image previews - pointing to storage/uploads
app.mount("/uploads", StaticFiles(directory="storage/uploads"), name="uploads")


@app.on_event("startup")
def startup_event():
    """Create default admin user if not exists"""
    # Create default admin user if not exists
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            admin_user = User(
                username="admin",
                email="admin@svastha.ai",
                full_name="Admin User",
                hashed_password=get_password_hash("admin123"),
                fitness_level="intermediate",
                fitness_goal="maintenance"
            )
            db.add(admin_user)
            db.commit()
            print("Admin user created successfully")
    finally:
        db.close()


app.include_router(users.router)
app.include_router(token.router)
app.include_router(workout.router)
app.include_router(meals.router)
app.include_router(coach.router)
app.include_router(progress.router)
app.include_router(predictions.router)
app.include_router(sahayak.router)
app.include_router(manasmitra.router)
app.include_router(enhanced_health.router)
app.include_router(svasthaquest.router)
app.include_router(medical_report.router)

# Print all registered routes for debugging
for route in app.routes:
    methods = getattr(route, "methods", "MOUNT")
    print(f"Route: {route.path} - Methods: {methods}")

@app.get("/")
def read_root():
    return {"status": "ok", "message": "SvasthaAI Backend is running"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8002))
    uvicorn.run(app, host="0.0.0.0", port=port)
