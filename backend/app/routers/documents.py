"""
Document upload and status endpoints for StudyLoop.
Uses Supabase Storage for files, Postgres for metadata,
and schedules ingestion as a background task.
"""

import hashlib
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, Form, BackgroundTasks
from supabase import create_client, Client
import os

from app.deps import get_current_user
from app.ingestion.pipeline import ingest

router = APIRouter()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

STORAGE_BUCKET = "documents"

MAX_UPLOAD_SIZE_MB = 15


def _is_uuid(val: str) -> bool:
    try:
        uuid.UUID(str(val))
        return True
    except (ValueError, TypeError, AttributeError):
        return False


@router.post("/documents/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile,
    course_id: str = Form(...),
    user_id: str = Depends(get_current_user),
):
    if not _is_uuid(course_id):
        raise HTTPException(status_code=404, detail="Course not found")

    # Confirm the course belongs to this user
    course = supabase.table("courses").select("id").eq("id", course_id).eq("user_id", user_id).execute()
    if not course.data:
        raise HTTPException(status_code=404, detail="Course not found")

    file_bytes = await file.read()
    if len(file_bytes) > MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail=f"File too large (max {MAX_UPLOAD_SIZE_MB}MB). Please try again.",
        )
        
    file_hash = hashlib.sha256(file_bytes).hexdigest()

    # Reject duplicate within the same course
    existing = supabase.table("documents").select("id").eq("course_id", course_id).eq("file_hash", file_hash).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="This document has already been uploaded to this course")

    storage_path = f"{course_id}/{file_hash}_{file.filename}"

    supabase.storage.from_(STORAGE_BUCKET).upload(
        storage_path, file_bytes, {"content-type": file.content_type or "application/pdf"}
    )

    row = {
        "course_id": course_id,
        "filename": file.filename,
        "storage_path": storage_path,
        "file_hash": file_hash,
        "status": "processing",
        "progress": 0,
    }
    result = supabase.table("documents").insert(row).execute()
    doc = result.data[0]

    background_tasks.add_task(ingest, doc["id"])

    return {"doc_id": doc["id"], "filename": doc["filename"], "status": "processing"}


@router.get("/documents/{doc_id}/status")
def document_status(doc_id: str, user_id: str = Depends(get_current_user)):
    if not _is_uuid(doc_id):
        raise HTTPException(status_code=404, detail="Document not found")
    result = supabase.table("documents").select("*").eq("id", doc_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Document not found")
    doc = result.data[0]
    return {
        "doc_id": doc["id"],
        "status": doc["status"],
        "progress": doc["progress"],
        "page_count": doc.get("page_count") or 0,
        "chunk_count": doc.get("chunk_count") or 0,
        "error": doc.get("error"),
    }


@router.get("/courses/{course_id}/documents")
def list_course_documents(course_id: str, user_id: str = Depends(get_current_user)):
    if not _is_uuid(course_id):
        raise HTTPException(status_code=404, detail="Course not found")
    course = supabase.table("courses").select("id").eq("id", course_id).eq("user_id", user_id).execute()
    if not course.data:
        raise HTTPException(status_code=404, detail="Course not found")

    docs = supabase.table("documents").select("*").eq("course_id", course_id).execute()
    return {
        "documents": [
            {
                "doc_id": d["id"],
                "filename": d["filename"],
                "page_count": d.get("page_count") or 0,
                "chunk_count": d.get("chunk_count") or 0,
                "status": d["status"],
                "created_at": d["created_at"],
            }
            for d in docs.data
        ]
    }

@router.get("/documents/{doc_id}/view")
def get_document_view_url(doc_id: str, user_id: str = Depends(get_current_user)):
    if not _is_uuid(doc_id):
        raise HTTPException(status_code=404, detail="Document not found")

    doc_result = supabase.table("documents").select("*").eq("id", doc_id).execute()
    if not doc_result.data:
        raise HTTPException(status_code=404, detail="Document not found")
    doc = doc_result.data[0]

    # Ownership check via the parent course -- documents has no user_id column itself.
    course = supabase.table("courses").select("id").eq("id", doc["course_id"]).eq("user_id", user_id).execute()
    if not course.data:
        raise HTTPException(status_code=404, detail="Document not found")

    storage_path = doc.get("storage_path")
    if not storage_path:
        raise HTTPException(status_code=404, detail="File not available")

    signed = supabase.storage.from_(STORAGE_BUCKET).create_signed_url(storage_path, 3600)
    signed_url = signed.get("signedURL") or signed.get("signedUrl") or signed.get("signed_url")
    if not signed_url:
        raise HTTPException(status_code=500, detail="Could not generate file URL")

    return {"doc_id": doc_id, "filename": doc["filename"], "url": signed_url, "expires_in": 3600}

@router.delete("/documents/{doc_id}")
def delete_document(doc_id: str, user_id: str = Depends(get_current_user)):
    if not _is_uuid(doc_id):
        raise HTTPException(status_code=404, detail="Document not found")
    doc = supabase.table("documents").select("storage_path").eq("id", doc_id).execute()
    if not doc.data:
        raise HTTPException(status_code=404, detail="Document not found")

    storage_path = doc.data[0].get("storage_path")
    if storage_path:
        try:
            supabase.storage.from_(STORAGE_BUCKET).remove([storage_path])
        except Exception:
            pass

    supabase.table("documents").delete().eq("id", doc_id).execute()
    return {"deleted": True}