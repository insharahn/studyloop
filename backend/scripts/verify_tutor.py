"""
Verification for tutor.py. Runs the full pipeline (dense -> lexical ->
fusion -> rerank -> tutor) against the persistent test course for both
an in-syllabus and an out-of-syllabus query, to confirm the confidence
gate actually gates.

    python scripts/verify_tutor.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.retrieval.dense import dense_search
from app.retrieval.lexical import lexical_search
from app.retrieval.fusion import reciprocal_rank_fusion
from app.retrieval.rerank import rerank
from app.generation.tutor import answer_doubt
from app.ingestion.embedder import embed_query
from scripts.verify_dense import get_or_create_test_course


def check(label, condition):
    print(f"[{'PASS' if condition else 'FAIL'}] {label}")
    return condition


def run_query(course_id: str, query: str):
    d = dense_search(course_id, embed_query(query), k=10)
    l = lexical_search(course_id, query, k=10)
    fused = reciprocal_rank_fusion([d, l])
    rr = rerank(query, fused)
    return answer_doubt(query, rr.chunks, rr.confidence, course_name="Test Course")


def main():
    course_id = get_or_create_test_course()

    print("--- In-syllabus query ---")
    good = run_query(course_id, "what is a compiled language")
    print(f"Grounded: {good.grounded}, Confidence: {good.confidence:.3f}")
    print(f"Answer: {good.answer}\n")
    print(f"Citations: {len(good.citations)}")
    for c in good.citations:
        print(f"  - {c.filename} p.{c.page}: {c.snippet[:80]}")

    all_passed = True
    all_passed &= check("In-syllabus query is grounded", good.grounded is True)
    all_passed &= check("In-syllabus answer has at least one citation", len(good.citations) > 0)
    all_passed &= check("Citation page numbers are real (>=1)",
                         all(c.page >= 1 for c in good.citations))

    print("\n--- Out-of-syllabus query ---")
    bad = run_query(course_id, "how do you bake a chocolate cake")
    print(f"Grounded: {bad.grounded}, Confidence: {bad.confidence:.3f}")
    print(f"Answer: {bad.answer}")

    all_passed &= check("Out-of-syllabus query is refused (not grounded)", bad.grounded is False)
    all_passed &= check("Refusal has zero citations", len(bad.citations) == 0)

    print()
    print("ALL CHECKS PASSED" if all_passed else "SOME CHECKS FAILED")


if __name__ == "__main__":
    main()