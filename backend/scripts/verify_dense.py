"""
Verification for dense.py. Ingests one real PDF into a persistent test
course (does NOT clean up — reused across retrieval verification scripts
for dense/lexical/fusion/rerank), then runs sample queries and prints
results for manual relevance inspection.

    python scripts/verify_dense.py path/to/some_lecture.pdf "your query"
"""
import asyncio
import os
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from supabase import create_client

from app.db import pool
from app.ingestion.pipeline import ingest
from app.ingestion.embedder import embed_query
from app.retrieval.dense import dense_search

TEST_USER_ID = "12d3e287-c6c2-4571-9aad-57d5f2a312ae"
STORAGE_BUCKET = "documents"
PERSISTENT_COURSE_NAME = "Retrieval Verification Course"  # reused across runs

_supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])


def get_or_create_test_course() -> str:
    with pool.connection() as conn:
        row = conn.execute(
            "select id from courses where name = %s and user_id = %s",
            (PERSISTENT_COURSE_NAME, TEST_USER_ID),
        ).fetchone()
        if row:
            return str(row[0])
        course_id = str(uuid.uuid4())
        conn.execute(
            "insert into courses (id, user_id, name) values (%s, %s, %s)",
            (course_id, TEST_USER_ID, PERSISTENT_COURSE_NAME),
        )
        return course_id


async def ensure_document_ingested(course_id: str, pdf_path: Path) -> None:
    with pool.connection() as conn:
        existing = conn.execute(
            "select id, status from documents where course_id = %s and filename = %s",
            (course_id, pdf_path.name),
        ).fetchone()
        if existing and existing[1] == "ready":
            print(f"'{pdf_path.name}' already ingested in test course, skipping re-upload.")
            return

    file_hash = str(uuid.uuid4())
    storage_path = f"{course_id}/{file_hash}_{pdf_path.name}"
    with open(pdf_path, "rb") as f:
        _supabase.storage.from_(STORAGE_BUCKET).upload(
            storage_path, f.read(), {"content-type": "application/pdf"}
        )

    document_id = str(uuid.uuid4())
    with pool.connection() as conn:
        conn.execute(
            """
            insert into documents (id, course_id, filename, storage_path, file_hash)
            values (%s, %s, %s, %s, %s)
            """,
            (document_id, course_id, pdf_path.name, storage_path, file_hash),
        )

    print(f"Ingesting '{pdf_path.name}'...")
    await ingest(document_id)


async def main():
    if len(sys.argv) != 3:
        print('Usage: python verify_dense.py <path-to-pdf> "your query"')
        sys.exit(1)

    pdf_path = Path(sys.argv[1]).resolve()
    query = sys.argv[2]

    course_id = get_or_create_test_course()
    await ensure_document_ingested(course_id, pdf_path)

    query_vec = embed_query(query)
    results = dense_search(course_id, query_vec, k=5)

    print(f"\nQuery: \"{query}\"")
    print(f"Top {len(results)} results:\n")
    for i, r in enumerate(results, 1):
        print(f"{i}. [{r.filename} p.{r.page_number}] score={r.score:.3f}")
        print(f"   {r.content[:200]}")
        print()


if __name__ == "__main__":
    asyncio.run(main())