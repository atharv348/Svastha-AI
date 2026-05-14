from backend.database import engine
import os
print(f"Database Absolute Path: {os.path.abspath(engine.url.database)}")
