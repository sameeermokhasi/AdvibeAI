import sys
sys.path.insert(0, r"C:\Users\91807\OneDrive\Desktop\Advibe\backend")
from app.core.db import get_db_cursor

with open(r"C:\Users\91807\OneDrive\Desktop\Advibe\database\migrations\20261008000004_advibe_v7_backfill_unlocks.sql", "r") as f:
    sql = f.read()

with get_db_cursor(commit=True) as cur:
    cur.execute(sql)
    print("V7 migration executed successfully.")
