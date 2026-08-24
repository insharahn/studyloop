"""
End-to-end verification of the ingestion pipeline against the real
database AND real Supabase Storage — exercises the same path the real
/documents/upload endpoint does. Creates throwaway course/document rows
and a throwaway Storage object, runs ingest(), checks the result, then
cleans up everything after itself.

    python scripts/verify_ingestion.py path/to/some_lecture.pdf
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

TEST_USER_ID = "12d3e287-c6c2-4571-9aad-57d5f2a312ae"
STORAGE_BUCKET = "documents"

_supabase = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_KEY"],
)


def check(label, condition):
    print(f"[{'PASS' if condition else 'FAIL'}] {label}")
    return condition


async def main():
    if len(sys.argv) != 2:
        print("Usage: python verify_ingestion.py <path-to-pdf>")
        sys.exit(1)

    local_pdf_path = Path(sys.argv[1]).resolve()
    course_id = str(uuid.uuid4())
    document_id = str(uuid.uuid4())
    file_hash = str(uuid.uuid4())
    storage_path = f"{course_id}/{file_hash}_{local_pdf_path.name}"

    # 1. Upload the test PDF to real Storage, same as the real endpoint would
    with open(local_pdf_path, "rb") as f:
        _supabase.storage.from_(STORAGE_BUCKET).upload(
            storage_path, f.read(), {"content-type": "application/pdf"}
        )
    print(f"Uploaded test file to Storage at: {storage_path}")

    # 2. Insert course + document rows, storage_path points at Storage now,
    #    not a local file — matches what the real endpoint writes
    with pool.connection() as conn:
        conn.execute(
            "insert into courses (id, user_id, name) values (%s, %s, %s)",
            (course_id, TEST_USER_ID, "Verify Ingestion Test Course"),
        )
        conn.execute(
            """
            insert into documents (id, course_id, filename, storage_path, file_hash)
            values (%s, %s, %s, %s, %s)
            """,
            (document_id, course_id, local_pdf_path.name, storage_path, file_hash),
        )

    try:
        await ingest(document_id)

        with pool.connection() as conn:
            doc = conn.execute(
                "select status, error, page_count, chunk_count from documents where id = %s",
                (document_id,),
            ).fetchone()
            chunk_rows = conn.execute(
                "select page_number, embedding is not null from chunks where document_id = %s",
                (document_id,),
            ).fetchall()

        status, error, page_count, chunk_count = doc
        print(f"Status: {status}, pages: {page_count}, chunks: {chunk_count}, error: {error}")

        all_passed = True
        all_passed &= check("Document status is 'ready'", status == "ready")
        all_passed &= check(f"chunk_count matches actual rows (got {chunk_count}/{len(chunk_rows)})",
                             chunk_count == len(chunk_rows))
        all_passed &= check("All chunks have a non-null embedding",
                             all(has_emb for _, has_emb in chunk_rows))
        all_passed &= check("Chunks reference real page numbers",
                             all(pg >= 1 for pg, _ in chunk_rows))

        print()
        print("ALL CHECKS PASSED" if all_passed else "SOME CHECKS FAILED")

    finally:
        # Clean up: DB rows (cascade handles chunks) + the Storage object
        with pool.connection() as conn:
            conn.execute("delete from courses where id = %s", (course_id,))
        _supabase.storage.from_(STORAGE_BUCKET).remove([storage_path])
        print("Cleaned up test course/document/chunks and Storage file.")


if __name__ == "__main__":
    asyncio.run(main())