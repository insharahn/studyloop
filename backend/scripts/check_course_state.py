import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db import pool

course_id = "80bf8bf3-8cd5-41cb-bae9-d87d0868ab18"

with pool.connection() as conn:
    concept_count = conn.execute(
        "select count(*) from concepts where course_id = %s", (course_id,)
    ).fetchone()[0]
    card_count = conn.execute(
        "select count(*) from cards where course_id = %s", (course_id,)
    ).fetchone()[0]

print(f"Concepts: {concept_count}")
print(f"Cards: {card_count}")