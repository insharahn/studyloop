import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db import pool

course_id = "80bf8bf3-8cd5-41cb-bae9-d87d0868ab18"

with pool.connection() as conn:
    row = conn.execute(
        "select id, question from cards where course_id = %s limit 1", (course_id,)
    ).fetchone()

if row:
    print("card_id:", row[0])
    print("question:", row[1])
else:
    print("No cards found — did generate-cards finish running?")