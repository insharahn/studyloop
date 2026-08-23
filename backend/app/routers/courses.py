"""
Real Courses CRUD endpoints for StudyLoop.
Uses Supabase (service key) for data access and deps.py for auth.
"""

from fastapi import APIRouter, Depends, HTTPException
from supabase import create_client, Client
import os

from app.deps import get_current_user

router = APIRouter()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


@router.post("/courses")
def create_course(payload: dict, user_id: str = Depends(get_current_user)):
    name = payload.get("name")
    if not name:
        raise HTTPException(status_code=422, detail="name is required")

    row = {
        "user_id": user_id,
        "name": name,
        "code": payload.get("code"),
        "exam_date": payload.get("exam_date"),
    }
    result = supabase.table("courses").insert(row).execute()
    course = result.data[0]

    return {
        "id": course["id"],
        "name": course["name"],
        "code": course["code"],
        "exam_date": course["exam_date"],
        "doc_count": 0,
        "mastery_pct": 0,
    }


@router.get("/courses")
def list_courses(user_id: str = Depends(get_current_user)):
    courses_result = supabase.table("courses").select("*").eq("user_id", user_id).execute()
    courses = []
    for c in courses_result.data:
        doc_count = supabase.table("documents").select("id", count="exact").eq("course_id", c["id"]).execute().count or 0
        card_count = supabase.table("cards").select("id", count="exact").eq("course_id", c["id"]).execute().count or 0

        days_to_exam = None
        if c.get("exam_date"):
            from datetime import date
            exam = date.fromisoformat(c["exam_date"])
            days_to_exam = (exam - date.today()).days

        courses.append({
            "id": c["id"],
            "name": c["name"],
            "code": c["code"],
            "exam_date": c["exam_date"],
            "days_to_exam": days_to_exam,
            "doc_count": doc_count,
            "card_count": card_count,
            "mastery_pct": 0,
            "due_today": 0,
        })

    return {"courses": courses}


@router.delete("/courses/{course_id}")
def delete_course(course_id: str, user_id: str = Depends(get_current_user)):
    result = supabase.table("courses").delete().eq("id", course_id).eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Course not found")
    return {"deleted": True}