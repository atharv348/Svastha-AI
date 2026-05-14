import sqlite3
from datetime import datetime, timedelta, timezone
import random

db_path = "svasthaai.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get user id 1
user_id = 1

# Generate logs for the last 7 days
now = datetime.now(timezone.utc)
for i in range(7, 0, -1):
    timestamp = now - timedelta(days=i)
    # Check if log already exists for this day (roughly)
    # But we can just add them
    stress_index = random.uniform(30, 60)
    
    cursor.execute("""
        INSERT INTO stress_logs (
            user_id, session_start_hour, session_duration, late_night_ratio, 
            app_switch_freq, idle_gap_mean, idle_gap_var, keystroke_cadence, 
            keystroke_var, scroll_velocity, click_rate, notif_response_lag, 
            unanswered_notif_count, work_app_ratio, screen_on_events, 
            weekend_delta, session_start_var_7d, consecutive_late_hours, 
            delta_from_30d_baseline, behavioral_score, subjective_score, 
            facial_score, stress_index, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        user_id, random.randint(8, 22), random.uniform(30, 120), random.uniform(0, 0.3),
        random.uniform(5, 20), random.uniform(1, 10), random.uniform(0.5, 5), random.uniform(40, 80),
        random.uniform(10, 20), random.uniform(100, 400), random.uniform(5, 15), random.uniform(60, 300),
        random.randint(0, 5), random.uniform(0.5, 0.9), random.randint(2, 10),
        False, random.uniform(0.5, 2.0), 0,
        0, random.uniform(30, 60), random.uniform(30, 60),
        random.uniform(30, 60), stress_index, timestamp.isoformat()
    ))

conn.commit()
conn.close()
print("Seeded 7 days of stress logs for user 1")
