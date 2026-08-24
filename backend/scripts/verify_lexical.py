"""
Verification for lexical.py. Reuses the same persistent test course as
verify_dense.py — run that first (or this one, either creates it) so
there's real content to search.

    python scripts/verify_lexical.py "your query"
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.retrieval.lexical import lexical_search
from scripts.verify_dense import get_or_create_test_course, PERSISTENT_COURSE_NAME


def main():
    if len(sys.argv) != 2:
        print('Usage: python verify_lexical.py "your query"')
        sys.exit(1)

    query = sys.argv[1]
    course_id = get_or_create_test_course()

    results = lexical_search(course_id, query, k=5)

    print(f"Query: \"{query}\"  (course: {PERSISTENT_COURSE_NAME})")
    print(f"Top {len(results)} results:\n")

    if not results:
        print("No results — either no chunks in the test course yet "
              "(run verify_dense.py first) or the query has no keyword matches.")
        return

    for i, r in enumerate(results, 1):
        print(f"{i}. [{r.filename} p.{r.page_number}] score={r.score:.4f}")
        print(f"   {r.content[:200]}")
        print()


if __name__ == "__main__":
    main()