"""
Verification for cards.py. Generates cards for a couple of concepts in
the persistent test course and checks the results for structural
correctness and grounding.

    python scripts/verify_cards.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db import pool
from app.generation.cards import generate_cards
from scripts.verify_dense import get_or_create_test_course


def check(label, condition):
    print(f"[{'PASS' if condition else 'FAIL'}] {label}")
    return condition


def main():
    course_id = get_or_create_test_course()

    with pool.connection() as conn:
        concept_rows = conn.execute(
            "select id, name from concepts where course_id = %s limit 3",
            (course_id,),
        ).fetchall()

    if not concept_rows:
        print("No concepts found in test course -- run verify_concepts.py first.")
        sys.exit(1)

    concept_ids = [str(r[0]) for r in concept_rows]
    print(f"Generating cards for: {[r[1] for r in concept_rows]}\n")

    result = generate_cards(course_id, concept_ids=concept_ids, per_concept=3)
    print(f"Result: {result}\n")

    with pool.connection() as conn:
        card_rows = conn.execute(
            """
            select c.type, c.question, c.options, c.answer, c.explanation,
                   c.source_page, co.name
            from cards c
            join concepts co on co.id = c.concept_id
            where c.course_id = %s and c.concept_id = any(%s)
            """,
            (course_id, concept_ids),
        ).fetchall()

    all_passed = True
    all_passed &= check(f"At least some cards created (got {len(card_rows)})", len(card_rows) > 0)
    all_passed &= check("All cards have a real source page (>=1 or null)",
                         all(r[5] is None or r[5] >= 1 for r in card_rows))
    all_passed &= check("No card's answer appears verbatim in its question",
                         all(str(r[3]).lower() not in r[1].lower() for r in card_rows))
    mcqs = [r for r in card_rows if r[0] == "mcq"]
    all_passed &= check("Every MCQ has at least 2 options",
                         all(r[2] is not None and len(r[2]) >= 2 for r in mcqs))

    print("\nSample cards:")
    for r in card_rows[:6]:
        print(f"\n[{r[0]}] concept: {r[6]}  (p.{r[5]})")
        print(f"  Q: {r[1]}")
        if r[2]:
            print(f"  Options: {r[2]}")
        print(f"  A: {r[3]}")
        print(f"  Explanation: {r[4]}")

    print()
    print("ALL CHECKS PASSED" if all_passed else "SOME CHECKS FAILED")


if __name__ == "__main__":
    main()