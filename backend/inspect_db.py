from sqlalchemy import create_engine, inspect, text
import os
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL")
print(f"Inspecting DB: {db_url}")

engine = create_engine(db_url)
inspector = inspect(engine)

tables = inspector.get_table_names()
print(f"Tables: {tables}")

if 'facial_scans' in tables:
    cols = inspector.get_columns('facial_scans')
    print("Columns in 'facial_scans':")
    for c in cols:
        print(f"- {c['name']} ({c['type']})")
else:
    print("'facial_scans' table NOT FOUND")

if 'stress_logs' in tables:
    cols = inspector.get_columns('stress_logs')
    print("\nColumns in 'stress_logs':")
    for c in cols:
        print(f"- {c['name']} ({c['type']})")
