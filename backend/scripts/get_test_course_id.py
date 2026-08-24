import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db import pool

with pool.connection() as conn:
    row = conn.execute(
        "select id from courses where name = 'Retrieval Verification Course'"
    ).fetchone()

if row:
    print(row[0])
else:
    print("No course found with that name.")