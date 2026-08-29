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

    name_clean = name.strip()
    code_clean = (payload.get("code") or "").strip() or None

    # Defense-in-depth against duplicate submissions (double-clicked
    # create button, retried request, etc.) -- if this user already has
    # a course with the same name (case-insensitive) and code, return
    # that one instead of creating a near-identical duplicate row.
    existing = (
        supabase.table("courses")
        .select("*")
        .eq("user_id", user_id)
        .ilike("name", name_clean)
        .execute()
    )
    for c in existing.data or []:
        existing_code = (c.get("code") or "").strip() or None
        if existing_code == code_clean:
            return {
                "id": c["id"],
                "name": c["name"],
                "code": c["code"],
                "exam_date": c["exam_date"],
                "doc_count": 0,
                "mastery_pct": 0,
            }

    row = {
        "user_id": user_id,
        "name": name_clean,
        "code": code_clean,
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
    from datetime import datetime, timezone
    now_iso = datetime.now(timezone.utc).isoformat()

    courses_result = supabase.table("courses").select("*").eq("user_id", user_id).execute()
    courses = []
    for c in courses_result.data:
        course_id = c["id"]
        doc_count = supabase.table("documents").select("id", count="exact").eq("course_id", course_id).execute().count or 0
        
        cards_result = supabase.table("cards").select("id").eq("course_id", course_id).execute()
        all_c_ids = [card_row["id"] for card_row in (cards_result.data or [])]
        card_count = len(all_c_ids)

        days_to_exam = None
        if c.get("exam_date"):
            from datetime import date
            exam = date.fromisoformat(c["exam_date"])
            days_to_exam = (exam - date.today()).days

        mastery_pct = 0.0
        due_today = 0

        if doc_count > 0 and all_c_ids:
            # SRS Due calculation: unreviewed cards + cards where due_at <= now_iso
            states_res = supabase.table("card_states").select("card_id, due_at").eq("user_id", user_id).in_("card_id", all_c_ids).execute()
            states_by_card = {s["card_id"]: s["due_at"] for s in (states_res.data or [])}

            for cid in all_c_ids:
                due_at = states_by_card.get(cid)
                if not due_at or due_at <= now_iso:
                    due_today += 1

            concepts_result = supabase.table("concepts").select("id").eq("course_id", course_id).execute()
            c_ids = [comp["id"] for comp in (concepts_result.data or [])]
            if c_ids:
                ucs_result = (
                    supabase.table("user_concept_state")
                    .select("mastery")
                    .eq("user_id", user_id)
                    .in_("concept_id", c_ids)
                    .execute()
                )
                if ucs_result.data:
                    m_vals = [row["mastery"] for row in ucs_result.data]
                    mastery_pct = round((sum(m_vals) / len(m_vals)) * 100, 1) if m_vals else 35.0
                else:
                    mastery_pct = 35.0
            else:
                mastery_pct = 25.0

        courses.append({
            "id": course_id,
            "name": c["name"],
            "code": c["code"],
            "exam_date": c["exam_date"],
            "days_to_exam": days_to_exam,
            "doc_count": doc_count,
            "card_count": card_count,
            "mastery_pct": mastery_pct,
            "due_today": due_today,
        })

    return {"courses": courses}


@router.delete("/courses/{course_id}")
def delete_course(course_id: str, user_id: str = Depends(get_current_user)):
    result = supabase.table("courses").delete().eq("id", course_id).eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Course not found")
    return {"deleted": True}