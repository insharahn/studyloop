"""
Document upload and status endpoints for StudyLoop.
Uses Supabase Storage for files, Postgres for metadata,
and schedules ingestion as a background task.
"""

import hashlib
from fastapi import APIRouter, Depends, HTTPException, UploadFile, Form, BackgroundTasks
from supabase import create_client, Client
import os

from app.deps import get_current_user

router = APIRouter()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

STORAGE_BUCKET = "documents"


def _run_ingestion_placeholder(doc_id: str):
    """
    Placeholder background task. Insharah's real ingestion pipeline
    (app/ingestion/pipeline.py) will replace/hook into this.
    For now, this just exists so the endpoint has something to schedule.
    """
    # TODO: replace with call to Insharah's ingestion pipeline once available
    pass


@router.post("/documents/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile,
    course_id: str = Form(...),
    user_id: str = Depends(get_current_user),
):
    # Confirm the course belongs to this user
    course = supabase.table("courses").select("id").eq("id", course_id).eq("user_id", user_id).execute()
    if not course.data:
        raise HTTPException(status_code=404, detail="Course not found")

    file_bytes = await file.read()
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

    background_tasks.add_task(_run_ingestion_placeholder, doc["id"])

    return {"doc_id": doc["id"], "filename": doc["filename"], "status": "processing"}


@router.get("/documents/{doc_id}/status")
def document_status(doc_id: str, user_id: str = Depends(get_current_user)):
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


@router.delete("/documents/{doc_id}")
def delete_document(doc_id: str, user_id: str = Depends(get_current_user)):
    doc = supabase.table("documents").select("storage_path").eq("id", doc_id).execute()
    if not doc.data:
        raise HTTPException(status_code=404, detail="Document not found")

    supabase.storage.from_(STORAGE_BUCKET).remove([doc.data[0]["storage_path"]])
    supabase.table("documents").delete().eq("id", doc_id).execute()
    return {"deleted": True}