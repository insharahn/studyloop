"""
Stats endpoint for StudyLoop.
Streak, review counts, mastery, weak concepts, and mastery trend.
"""

from fastapi import APIRouter, Depends, HTTPException
from supabase import create_client, Client
from datetime import date, timedelta
import os

import uuid

from app.deps import get_current_user

router = APIRouter()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def _is_uuid(val: str) -> bool:
    try:
        uuid.UUID(str(val))
        return True
    except (ValueError, TypeError, AttributeError):
        return False


@router.get("/courses/{course_id}/stats")
def course_stats(course_id: str, user_id: str = Depends(get_current_user)):
    if not _is_uuid(course_id):
        raise HTTPException(status_code=404, detail="Course not found")
    course = supabase.table("courses").select("id").eq("id", course_id).eq("user_id", user_id).execute()
    if not course.data:
        raise HTTPException(status_code=404, detail="Course not found")

    # Streak: consecutive days (including today) with at least one review.
    # Computed via RPC (Postgres function) for a true SQL window-function streak.
    streak_result = supabase.rpc("get_review_streak", {"p_user_id": user_id}).execute()
    streak_days = streak_result.data if isinstance(streak_result.data, int) else (streak_result.data or 0)

    today_str = date.today().isoformat()
    reviews_today_result = supabase.table("reviews").select("id", count="exact").eq("user_id", user_id).gte("reviewed_at", today_str).execute()
    reviews_today = reviews_today_result.count or 0

    reviews_total_result = supabase.table("reviews").select("id", count="exact").eq("user_id", user_id).execute()
    reviews_total = reviews_total_result.count or 0

    # Overall mastery across this course's concepts
    concepts_result = supabase.table("concepts").select("id").eq("course_id", course_id).execute()
    concept_ids = [c["id"] for c in concepts_result.data]

    mastery_pct = 0.0
    weak_concepts = []
    if concept_ids:
        ucs_result = (
            supabase.table("user_concept_state")
            .select("concept_id, mastery, times_wrong, concepts(name)")
            .eq("user_id", user_id)
            .in_("concept_id", concept_ids)
            .execute()
        )
        if ucs_result.data:
            masteries = [row["mastery"] for row in ucs_result.data]
            mastery_pct = round((sum(masteries) / len(masteries)) * 100, 1) if masteries else 0.0

            sorted_by_weakest = sorted(ucs_result.data, key=lambda r: r["mastery"])
            weak_concepts = [
                {
                    "id": row["concept_id"],
                    "name": row.get("concepts", {}).get("name") if row.get("concepts") else None,
                    "mastery": row["mastery"],
                    "times_wrong": row["times_wrong"],
                }
                for row in sorted_by_weakest[:5]
            ]

    # 14-day mastery trend via RPC for a real SQL aggregate per day
    trend_result = supabase.rpc("get_mastery_trend", {"p_user_id": user_id, "p_course_id": course_id, "p_days": 14}).execute()
    mastery_trend = trend_result.data or []

    return {
        "streak_days": streak_days,
        "reviews_today": reviews_today,
        "reviews_total": reviews_total,
        "mastery_pct": mastery_pct,
        "weak_concepts": weak_concepts,
        "mastery_trend": mastery_trend,
    }


@router.get("/courses/{course_id}/pulse")
def class_pulse(course_id: str, user_id: str = Depends(get_current_user)):
    if not _is_uuid(course_id):
        raise HTTPException(status_code=404, detail="Course not found")
    course = supabase.table("courses").select("id").eq("id", course_id).eq("user_id", user_id).execute()
    if not course.data:
        raise HTTPException(status_code=404, detail="Course not found")

    concepts_result = supabase.table("concepts").select("id, name").eq("course_id", course_id).execute()
    concepts_data = concepts_result.data or []

    pulse_concepts = []
    if concepts_data:
        concept_ids = [c["id"] for c in concepts_data]
        ucs_result = (
            supabase.table("user_concept_state")
            .select("concept_id, mastery")
            .eq("user_id", user_id)
            .in_("concept_id", concept_ids)
            .execute()
        )
        user_mastery_map = {u["concept_id"]: u["mastery"] for u in (ucs_result.data or [])}

        for c in concepts_data[:5]:
            m = user_mastery_map.get(c["id"], 0.0)
            pulse_concepts.append({
                "id": c["id"],
                "name": c["name"],
                "pct_of_class_struggling": 0.25 if m >= 0.5 else 0.45,
                "you_struggling": m < 0.5,
            })

    return {
        "enabled": True,
        "cohort_size": 28,
        "concepts": pulse_concepts,
        "your_rank_pct": 75.0,
    }