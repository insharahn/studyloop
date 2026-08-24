"""
Verification for rerank.py. Runs the full dense -> lexical -> fusion ->
rerank chain against the persistent test course, plus an isolated test
of the fallback path with a query designed to produce weak/no matches.

    python scripts/verify_rerank.py "your query"
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.retrieval.dense import dense_search
from app.retrieval.lexical import lexical_search
from app.retrieval.fusion import reciprocal_rank_fusion
from app.retrieval.rerank import rerank, RetrievedChunk
from app.ingestion.embedder import embed_query
from scripts.verify_dense import get_or_create_test_course


def check(label, condition):
    print(f"[{'PASS' if condition else 'FAIL'}] {label}")
    return condition


def main():
    if len(sys.argv) != 2:
        print('Usage: python verify_rerank.py "your query"')
        sys.exit(1)

    query = sys.argv[1]
    course_id = get_or_create_test_course()

    d = dense_search(course_id, embed_query(query), k=10)
    l = lexical_search(course_id, query, k=10)
    fused = reciprocal_rank_fusion([d, l])

    result = rerank(query, fused)

    print(f"Query: \"{query}\"")
    print(f"Confidence: {result.confidence:.3f}\n")
    for i, c in enumerate(result.chunks, 1):
        print(f"{i}. [p.{c.page_number}] {c.content[:150]}")
        print()

    all_passed = True
    all_passed &= check("Returns at most TOP_N (6) chunks", len(result.chunks) <= 6)
    all_passed &= check("Confidence is in [0, 1]", 0.0 <= result.confidence <= 1.0)

    # Fallback path test: an empty candidate list should return cleanly,
    # not crash -- this simulates a course with zero matching content.
    empty_result = rerank(query, [])
    all_passed &= check("Empty candidates returns empty result, not a crash",
                         empty_result.chunks == [] and empty_result.confidence == 0.0)

    print()
    print("ALL CHECKS PASSED" if all_passed else "SOME CHECKS FAILED")


if __name__ == "__main__":
    main()