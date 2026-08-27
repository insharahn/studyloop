"""
Orchestrates ingestion: download from Supabase Storage -> parse -> chunk
-> embed -> write to Postgres, updating documents.status/progress along
the way. Called from the document upload endpoint's background task.
"""

from __future__ import annotations

import logging
import os
import gc
import tempfile

from pathlib import Path

from supabase import create_client, Client

from app.db import pool
from app.ingestion.parser import parse_pdf, PDFParseError
from app.ingestion.chunker import chunk_pages
from app.ingestion.embedder import embed_documents, EmbeddingError

logger = logging.getLogger(__name__)

STORAGE_BUCKET = "documents"

_supabase: Client = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_KEY"],
)

CHUNK_BATCH_SIZE = 15  # process and write chunks in groups, not all-at-once

async def ingest(document_id: str) -> None:
    tmp_path: str | None = None
    try:
        storage_path, course_id = _fetch_document_meta(document_id)
        _update_status(document_id, status="processing", progress=0)

        tmp_path = _download_to_temp(storage_path)

        pages = parse_pdf(tmp_path)
        _update_status(document_id, status="processing", progress=10)

        chunks = chunk_pages(pages)
        if not chunks:
            _fail(document_id, "No extractable text found in this document")
            return
        _update_status(document_id, status="processing", progress=40)

        # Clear existing chunks once, up front, before the incremental writes
        with pool.connection() as conn:
            conn.execute("delete from chunks where document_id = %s", (document_id,))

        for i in range(0, len(chunks), CHUNK_BATCH_SIZE):
            batch = chunks[i:i + CHUNK_BATCH_SIZE]
            vectors = embed_documents([c.content for c in batch])
            _write_chunk_batch(document_id, course_id, batch, vectors)
            del vectors
            gc.collect()

        _update_status(document_id, status="processing", progress=80)
        _update_status(
            document_id,
            status="ready",
            progress=100,
            page_count=len(pages),
            chunk_count=len(chunks),
        )
        logger.info("Ingestion complete for document %s: %d pages, %d chunks",
                    document_id, len(pages), len(chunks))

    except PDFParseError as e:
        _fail(document_id, str(e))
    except EmbeddingError as e:
        _fail(document_id, f"Embedding failed: {e}")
    except Exception as e:
        logger.exception("Unexpected ingestion failure for document %s", document_id)
        _fail(document_id, f"Unexpected error: {e}")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)


def _download_to_temp(storage_path: str) -> str:
    """Download a file from Supabase Storage to a local temp file and
    return its path. Caller is responsible for deleting it afterward."""
    file_bytes = _supabase.storage.from_(STORAGE_BUCKET).download(storage_path)
    fd, tmp_path = tempfile.mkstemp(suffix=".pdf")
    with os.fdopen(fd, "wb") as f:
        f.write(file_bytes)
    return tmp_path


def _fetch_document_meta(document_id: str) -> tuple[str, str]:
    with pool.connection() as conn:
        row = conn.execute(
            "select storage_path, course_id from documents where id = %s",
            (document_id,),
        ).fetchone()
    if row is None:
        raise ValueError(f"No document found with id {document_id}")
    return row[0], row[1]


def _write_chunk_batch(document_id: str, course_id: str, chunks, vectors) -> None:
    with pool.connection() as conn:
        with conn.transaction():
            conn.cursor().executemany(
                """
                insert into chunks
                    (document_id, course_id, page_number, chunk_index,
                     content, token_count, embedding)
                values (%s, %s, %s, %s, %s, %s, %s)
                """,
                [
                    (document_id, course_id, c.page_number, c.chunk_index,
                     c.content, c.token_count, v)
                    for c, v in zip(chunks, vectors)
                ],
            )


def _update_status(document_id: str, **fields) -> None:
    set_clause = ", ".join(f"{k} = %s" for k in fields)
    with pool.connection() as conn:
        conn.execute(
            f"update documents set {set_clause} where id = %s",
            (*fields.values(), document_id),
        )


def _fail(document_id: str, error_message: str) -> None:
    logger.warning("Ingestion failed for document %s: %s", document_id, error_message)
    _update_status(document_id, status="failed", error=error_message)