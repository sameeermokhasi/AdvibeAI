import sys
sys.path.insert(0, r"C:\Users\91807\OneDrive\Desktop\Advibe\backend")
from app.core.db import get_db_cursor

with open(r"C:\Users\91807\OneDrive\Desktop\Advibe\database\migrations\20261008000005_advibe_v8_agent_chat_persistence.sql", "r", encoding="utf-8") as f:
    sql = f.read()

with get_db_cursor(commit=True) as cur:
    cur.execute(sql)
    print("Migration V8 applied successfully.")
