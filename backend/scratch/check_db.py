import sqlite3
import os

db_path = "svasthaai.db"
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM stress_logs")
    count = cursor.fetchone()[0]
    print(f"Stress logs count: {count}")
    
    cursor.execute("SELECT timestamp, stress_index FROM stress_logs LIMIT 10")
    logs = cursor.fetchall()
    for log in logs:
        print(log)
    conn.close()
else:
    print("Database not found")
