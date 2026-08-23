"""
Batch text embedding using a local sentence-transformers model.

Runs entirely on-device — no API key, no billing, no rate limits, no
third party ever sees our corpus. Chosen deliberately over a hosted API
after repeated provider account/billing issues; the trade-off is a larger
deployed image (~2GB with torch) versus zero external dependency risk.

input_type matters: BGE models are trained with different prefixes for
queries vs documents ("query" prepends an instruction string; "document"
does not). Mixing them up doesn't error, it just quietly degrades
retrieval — callers must always pass one explicitly.
"""

from __future__ import annotations

import logging
from enum import Enum
from threading import Lock

from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

MODEL_NAME = "BAAI/bge-small-en-v1.5"
EXPECTED_DIMENSIONS = 384  # must match `embedding vector(384)` in the schema
QUERY_PREFIX = "Represent this sentence for searching relevant passages: "

_model: SentenceTransformer | None = None
_lock = Lock()


class TaskType(str, Enum):
    DOCUMENT = "document"
    QUERY = "query"


class EmbeddingError(Exception):
    """Raised for embedding failures (bad input, model load failure, etc)."""


def _get_model() -> SentenceTransformer:
    # Lazy-loaded and cached: the model is loaded from disk once per process,
    # not once per request. First call after a cold start takes a few
    # seconds; every call after that is fast.
    global _model
    if _model is None:
        with _lock:
            if _model is None:
                logger.info("Loading embedding model %s (first call only)...", MODEL_NAME)
                _model = SentenceTransformer(MODEL_NAME)
    return _model

def preload_model() -> None:
    """Load the embedding model into memory. Called once at app startup
    so the first real request doesn't pay the load cost."""
    _get_model()

def embed_batch(texts: list[str], task_type: TaskType) -> list[list[float]]:
    """
    Embed a list of texts. Runs locally — no network call, no batching
    limit imposed by an external API, though very large batches are still
    chunked here to keep memory use predictable.
    """
    if not texts:
        return []

    for i, t in enumerate(texts):
        if not t or not t.strip():
            raise EmbeddingError(f"Cannot embed empty/whitespace text at index {i}")

    if task_type == TaskType.QUERY:
        texts = [QUERY_PREFIX + t for t in texts]

    model = _get_model()

    try:
        embeddings = model.encode(
            texts,
            batch_size=32,
            show_progress_bar=False,
            convert_to_numpy=True,
            normalize_embeddings=True,
        )
    except Exception as e:
        raise EmbeddingError(f"Local embedding failed: {e}") from e

    vectors = embeddings.tolist()

    for v in vectors:
        if len(v) != EXPECTED_DIMENSIONS:
            raise EmbeddingError(
                f"Expected {EXPECTED_DIMENSIONS}-dim embeddings, got {len(v)}. "
                f"Check MODEL_NAME — schema is fixed at vector({EXPECTED_DIMENSIONS})."
            )

    return vectors


def embed_documents(texts: list[str]) -> list[list[float]]:
    """Convenience wrapper for embedding chunks going into the index."""
    return embed_batch(texts, TaskType.DOCUMENT)


def embed_query(text: str) -> list[float]:
    """Convenience wrapper for embedding a single user search query."""
    return embed_batch([text], TaskType.QUERY)[0]