from database import SessionLocal, User
from services.auth import verify_password, get_password_hash

def check():
    db = SessionLocal()
    user = db.query(User).filter(User.username == "admin").first()
    if user:
        # Force re-hash with current primary scheme (argon2)
        print("Re-hashing password to ensure compatibility...")
        user.hashed_password = get_password_hash("admin123")
        db.commit()
        print("Re-hash successful.")
        
        is_correct = verify_password("admin123", user.hashed_password)
        print(f"Password 'admin123' correct? {is_correct}")
    else:
        print("User admin not found.")
    db.close()

if __name__ == "__main__":
    check()
