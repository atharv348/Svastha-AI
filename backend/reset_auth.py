from database import SessionLocal, User, init_db
from services.auth import get_password_hash

def reset_admin():
    init_db()
    db = SessionLocal()
    try:
        # Check if admin exists
        admin = db.query(User).filter(User.username == "admin").first()
        if admin:
            print(f"Admin user found: {admin.username}. Resetting password to 'admin123'...")
            admin.hashed_password = get_password_hash("admin123")
            db.commit()
            print("Password reset successful.")
        else:
            print("Admin user not found. Creating new admin user...")
            new_admin = User(
                username="admin",
                email="admin@vaidyaai.com",
                full_name="Admin User",
                hashed_password=get_password_hash("admin123"),
                fitness_level="intermediate",
                fitness_goal="maintenance"
            )
            db.add(new_admin)
            db.commit()
            print("Admin user created successfully with password 'admin123'.")
            
        # List all users for debugging
        users = db.query(User).all()
        print("\nCurrent Users in database:")
        for u in users:
            print(f"- Username: {u.username}, Email: {u.email}")
            
    finally:
        db.close()

if __name__ == "__main__":
    reset_admin()
