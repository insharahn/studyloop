"""
Reranking via a local cross-encoder model: scores each of the ~20 RRF-
fused candidates for relevance to the query, returns the top 6 plus a
confidence score (the top candidate's normalized score).

Runs entirely on-device -- no API key, no billing, consistent with the
embedder's local-first approach after repeated hosted-provider friction.

Confidence is what tutor.py's refusal gate depends on.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from threading import Lock

from sentence_transformers import CrossEncoder

from app.retrieval.dense import RetrievedChunk

logger = logging.getLogger(__name__)

RERANK_MODEL = "cross-encoder/ms-marco-MiniLM-L-6-v2"
CANDIDATE_TRUNCATE_CHARS = 500
TOP_N = 6

_model: CrossEncoder | None = None
_lock = Lock()


@dataclass
class RerankResult:
    chunks: list[RetrievedChunk]  # top TOP_N, reordered by relevance
    confidence: float             # normalized top score, in [0, 1]


def _get_model() -> CrossEncoder:
    global _model
    if _model is None:
        with _lock:
            if _model is None:
                logger.info("Loading rerank model %s (first call only)...", RERANK_MODEL)
                _model = CrossEncoder(RERANK_MODEL)
    return _model


def preload_model() -> None:
    """Load the rerank model into memory. Call at app startup alongside
    the embedder's preload, so the first real request isn't slow."""
    _get_model()


def rerank(query: str, candidates: list[RetrievedChunk]) -> RerankResult:
    """
    Score and reorder fused candidates by relevance to the query.
    Never raises -- an empty candidate list returns an empty result
    with confidence 0.0.
    """
    if not candidates:
        return RerankResult(chunks=[], confidence=0.0)

    model = _get_model()

    pairs = [
        (query, c.content[:CANDIDATE_TRUNCATE_CHARS])
        for c in candidates
    ]

    raw_scores = model.predict(pairs)  # cross-encoder logits, roughly -10 to 10

    scored = list(zip(candidates, raw_scores))
    scored.sort(key=lambda pair: pair[1], reverse=True)

    top = scored[:TOP_N]
    top_chunks = [chunk for chunk, _ in top]
    confidence = _normalize(top[0][1])

    return RerankResult(chunks=top_chunks, confidence=confidence)


def _normalize(raw_score: float) -> float:
    """
    Squash a cross-encoder logit into a rough [0, 1] confidence via a
    sigmoid. Not a calibrated probability -- ms-marco-MiniLM's raw score
    range varies -- but it's monotonic and bounded, which is all the
    confidence gate threshold needs.
    """
    import math
    return 1.0 / (1.0 + math.exp(-raw_score))