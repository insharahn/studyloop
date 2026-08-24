"""
Verification for fusion.py. Fully offline -- no database, no embedding
model, just synthetic RetrievedChunk lists exercising RRF's core
guarantees.

    python scripts/verify_fusion.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.retrieval.dense import RetrievedChunk
from app.retrieval.fusion import reciprocal_rank_fusion


def make_chunk(chunk_id: str, score: float = 0.0) -> RetrievedChunk:
    return RetrievedChunk(
        chunk_id=chunk_id,
        document_id="doc-1",
        filename="test.pdf",
        page_number=1,
        content=f"content for {chunk_id}",
        score=score,
    )


def check(label, condition):
    print(f"[{'PASS' if condition else 'FAIL'}] {label}")
    return condition


def main():
    all_passed = True

    # 1. A chunk ranked #1 in BOTH lists should end up ranked #1 overall,
    #    and score strictly higher than anything appearing in only one list.
    dense = [make_chunk("A"), make_chunk("B"), make_chunk("C")]
    lexical = [make_chunk("A"), make_chunk("D"), make_chunk("E")]
    fused = reciprocal_rank_fusion([dense, lexical])
    all_passed &= check("Chunk ranked #1 in both lists is fused rank #1",
                         fused[0].chunk_id == "A")
    all_passed &= check("Double-appearing chunk scores higher than any single-list chunk",
                         fused[0].score > max(c.score for c in fused[1:]))

    # 2. A chunk appearing in only ONE list still appears in the fused
    #    output -- not zeroed out just for missing from the other list.
    dense_only = [make_chunk("X"), make_chunk("Y")]
    lexical_only = [make_chunk("Z")]
    fused2 = reciprocal_rank_fusion([dense_only, lexical_only])
    fused_ids = {c.chunk_id for c in fused2}
    all_passed &= check("Single-list chunks are all present in fused output",
                         fused_ids == {"X", "Y", "Z"})

    # 3. Empty lists don't crash -- e.g. a course with chunks but a lexical
    #    query that matched nothing.
    fused3 = reciprocal_rank_fusion([[make_chunk("only")], []])
    all_passed &= check("One empty list doesn't crash and other list still counts",
                         len(fused3) == 1 and fused3[0].chunk_id == "only")

    fused4 = reciprocal_rank_fusion([[], []])
    all_passed &= check("Two empty lists return an empty result, no crash",
                         fused4 == [])

    # 4. Rank position matters more than which list -- a chunk at rank 1
    #    in list A should outscore a chunk at rank 1 in list B only if
    #    it ALSO appears elsewhere; but with equal single appearances,
    #    same rank in either list should score identically (order-
    #    independence of which list is "first").
    listA = [make_chunk("P"), make_chunk("Q")]
    listB = [make_chunk("R"), make_chunk("S")]
    fused5 = reciprocal_rank_fusion([listA, listB])
    score_p = next(c.score for c in fused5 if c.chunk_id == "P")
    score_r = next(c.score for c in fused5 if c.chunk_id == "R")
    all_passed &= check("Same rank in either list produces the same RRF score",
                         abs(score_p - score_r) < 1e-9)

    print()
    print("ALL CHECKS PASSED" if all_passed else "SOME CHECKS FAILED — do not merge until fixed")
    if not all_passed:
        sys.exit(1)


if __name__ == "__main__":
    main()