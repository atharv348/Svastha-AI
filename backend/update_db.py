from dotenv import load_dotenv
import os

# Load environment variables first
load_dotenv()

from database import engine, Base, Prediction
from sqlalchemy import inspect, text

def update_schema():
    inspector = inspect(engine)
    
    # Update predictions table
    columns = [col['name'] for col in inspector.get_columns('predictions')]
    if 'ai_advice' not in columns:
        print("Adding 'ai_advice' column to 'predictions' table...")
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE predictions ADD COLUMN ai_advice TEXT"))
            conn.commit()
        print("Column 'ai_advice' added successfully.")
    
    # Update users table
    user_columns = [col['name'] for col in inspector.get_columns('users')]
    if 'preferred_language' not in user_columns:
        print("Adding 'preferred_language' column to 'users' table...")
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN preferred_language VARCHAR(20) DEFAULT 'English'"))
            conn.commit()
        print("Column 'preferred_language' added successfully.")
    
    if 'streak_count' not in user_columns:
        print("Adding 'streak_count' column to 'users' table...")
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN streak_count INTEGER DEFAULT 0"))
            conn.commit()
        print("Column 'streak_count' added successfully.")
        
    if 'last_checkin' not in user_columns:
        print("Adding 'last_checkin' column to 'users' table...")
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN last_checkin DATETIME"))
            conn.commit()
        print("Column 'last_checkin' added successfully.")

    # Update chat_messages table
    chat_columns = [col['name'] for col in inspector.get_columns('chat_messages')]
    if 'rating' not in chat_columns:
        print("Adding 'rating' column to 'chat_messages' table...")
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE chat_messages ADD COLUMN rating INTEGER"))
            conn.commit()
        print("Column 'rating' added successfully.")

    # Update stress_logs table
    stress_columns = [col['name'] for col in inspector.get_columns('stress_logs')]
    new_stress_cols = {
        'delta_from_30d_baseline': 'FLOAT',
        'consecutive_late_hours': 'INTEGER',
        'behavioral_score': 'FLOAT DEFAULT 0.0',
        'subjective_score': 'FLOAT DEFAULT 0.0',
        'facial_score': 'FLOAT DEFAULT 0.0'
    }
    
    for col_name, col_type in new_stress_cols.items():
        if col_name not in stress_columns:
            print(f"Adding '{col_name}' column to 'stress_logs' table...")
            with engine.connect() as conn:
                conn.execute(text(f"ALTER TABLE stress_logs ADD COLUMN {col_name} {col_type}"))
                conn.commit()
            print(f"Column '{col_name}' added successfully.")

    # Update facial_scans table
    if 'facial_scans' in inspector.get_table_names():
        facial_columns = [col['name'] for col in inspector.get_columns('facial_scans')]
        if 'dominant' not in facial_columns:
            print("Adding 'dominant' column to 'facial_scans' table...")
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE facial_scans ADD COLUMN dominant VARCHAR(20)"))
                conn.commit()
            print("Column 'dominant' added successfully.")
        
        if 'valence' not in facial_columns:
            print("Adding 'valence' column to 'facial_scans' table...")
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE facial_scans ADD COLUMN valence FLOAT"))
                conn.commit()
            print("Column 'valence' added successfully.")
    
    # Create new tables if they don't exist
    print("Ensuring all tables exist...")
    Base.metadata.create_all(engine)
    print("Database sync complete.")

if __name__ == "__main__":
    update_schema()
