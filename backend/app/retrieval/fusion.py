"""
Reciprocal Rank Fusion: combines dense and lexical result lists into one
ranked list using rank position, not raw score.

Dense scores (cosine similarity, 0-1) and lexical scores (ts_rank_cd,
unbounded) are on incomparable scales -- summing or averaging them
directly would let dense dominate purely because its numbers are bigger.
RRF sidesteps this by using each chunk's RANK in each list rather than
its score, so both retrieval methods contribute on equal footing.

Standard formula: score(chunk) = sum over lists of 1 / (k + rank),
using the conventional constant k=60.
"""

from __future__ import annotations

from app.retrieval.dense import RetrievedChunk

RRF_K = 60


def reciprocal_rank_fusion(
    result_lists: list[list[RetrievedChunk]],
) -> list[RetrievedChunk]:
    """
    Merge any number of ranked result lists into one, ordered by combined
    RRF score. A chunk appearing in multiple lists gets a contribution
    from each; a chunk appearing in only one list still contributes from
    that one appearance rather than being zeroed out.

    Returns RetrievedChunk objects with `.score` overwritten to hold the
    RRF score (no longer the original cosine/ts_rank value -- that
    distinction doesn't survive fusion, and isn't needed downstream).
    """
    rrf_scores: dict[str, float] = {}
    chunk_by_id: dict[str, RetrievedChunk] = {}

    for result_list in result_lists:
        for rank, chunk in enumerate(result_list, start=1):
            rrf_scores[chunk.chunk_id] = rrf_scores.get(chunk.chunk_id, 0.0) + 1.0 / (RRF_K + rank)
            # Keep the first-seen copy of each chunk's metadata -- content/
            # page/filename are identical regardless of which list it came
            # from, so it doesn't matter which list's copy we keep.
            chunk_by_id.setdefault(chunk.chunk_id, chunk)

    ranked_ids = sorted(rrf_scores, key=lambda cid: rrf_scores[cid], reverse=True)

    fused: list[RetrievedChunk] = []
    for chunk_id in ranked_ids:
        original = chunk_by_id[chunk_id]
        fused.append(RetrievedChunk(
            chunk_id=original.chunk_id,
            document_id=original.document_id,
            filename=original.filename,
            page_number=original.page_number,
            content=original.content,
            score=rrf_scores[chunk_id],
        ))

    return fused