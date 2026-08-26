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
def student_learning_report(course_id: str, user_id: str = Depends(get_current_user)):
    if not _is_uuid(course_id):
        raise HTTPException(status_code=404, detail="Course not found")
    course = supabase.table("courses").select("id, name, code, exam_date").eq("id", course_id).eq("user_id", user_id).execute()
    if not course.data:
        raise HTTPException(status_code=404, detail="Course not found")

    concepts_result = supabase.table("concepts").select("id, name, description").eq("course_id", course_id).execute()
    concepts_data = concepts_result.data or []

    pulse_concepts = []
    weak_count = 0
    solid_count = 0
    total_mastery_sum = 0.0
    total_correct = 0
    total_incorrect = 0
    topics_to_revise = []

    if concepts_data:
        concept_ids = [c["id"] for c in concepts_data]

        # Fetch prerequisite edges for concept map levels
        edges_res = supabase.table("concept_edges").select("prerequisite_id, concept_id").in_("concept_id", concept_ids).execute()
        prereqs_map = {}
        for edge in (edges_res.data or []):
            prereqs_map.setdefault(edge["concept_id"], []).append(edge["prerequisite_id"])

        # Fetch actual reviews for cards in this course
        cards_res = supabase.table("cards").select("id, concept_id").eq("course_id", course_id).execute()
        cards_data = cards_res.data or []
        card_concept_map = {card["id"]: card.get("concept_id") for card in cards_data}
        card_ids = list(card_concept_map.keys())

        concept_correct_map = {}
        concept_incorrect_map = {}

        if card_ids:
            reviews_res = (
                supabase.table("reviews")
                .select("card_id, grade")
                .eq("user_id", user_id)
                .in_("card_id", card_ids)
                .execute()
            )
            for r in (reviews_res.data or []):
                cid = card_concept_map.get(r["card_id"])
                if cid:
                    grade = int(r.get("grade", 1))
                    if grade >= 2:
                        concept_correct_map[cid] = concept_correct_map.get(cid, 0) + 1
                    else:
                        concept_incorrect_map[cid] = concept_incorrect_map.get(cid, 0) + 1

        # Query current user's concept state & mastery scores
        ucs_result = (
            supabase.table("user_concept_state")
            .select("concept_id, mastery, status, times_asked, times_wrong")
            .eq("user_id", user_id)
            .in_("concept_id", concept_ids)
            .execute()
        )
        user_state_map = {u["concept_id"]: u for u in (ucs_result.data or [])}

        for idx, c in enumerate(concepts_data):
            cid = c["id"]
            state = user_state_map.get(cid, {})
            mastery = float(state.get("mastery", 0.0))

            prereq_list = prereqs_map.get(cid, [])
            prereq_count = len(prereq_list)
            
            # Map into concept levels
            if prereq_count == 0:
                level = 1
                level_name = "Level 1: Fundamentals"
            elif prereq_count == 1:
                level = 2
                level_name = "Level 2: Core Concepts"
            else:
                level = 3
                level_name = "Level 3: Advanced Applications"

            correct = concept_correct_map.get(cid, 0)
            incorrect = concept_incorrect_map.get(cid, int(state.get("times_wrong", 0)))

            total_correct += correct
            total_incorrect += incorrect

            clarity_pct = round(mastery * 100, 1)
            total_mastery_sum += clarity_pct

            concept_total_reviews = correct + incorrect
            concept_accuracy_pct = round((correct / concept_total_reviews) * 100, 1) if concept_total_reviews > 0 else (clarity_pct if clarity_pct > 0 else 0.0)

            # Assign Topic Grade
            if clarity_pct >= 85:
                topic_grade = "GRADE A"
            elif clarity_pct >= 70:
                topic_grade = "GRADE B"
            elif clarity_pct >= 50:
                topic_grade = "GRADE C"
            elif clarity_pct > 0:
                topic_grade = "GRADE D"
            else:
                topic_grade = "UNREVIEWED"

            you_struggling = (mastery > 0 and mastery < 0.5) or incorrect > 0
            if you_struggling:
                weak_count += 1
                topics_to_revise.append(c["name"])
                status_label = "Needs Revision"
                revision_guidance = f"Low clarity ({clarity_pct}%). Review lecture slides & practice failed cards."
            elif mastery >= 0.5:
                solid_count += 1
                status_label = "Solid Understanding"
                revision_guidance = f"Good retention ({clarity_pct}% clarity). Maintain via scheduled review."
            else:
                status_label = "Unreviewed"
                revision_guidance = "Not yet reviewed. Practice flashcards to generate topic grade."

            pulse_concepts.append({
                "id": cid,
                "name": c["name"],
                "description": c.get("description", ""),
                "level": level,
                "level_name": level_name,
                "prerequisites": prereq_list,
                "clarity_pct": clarity_pct,
                "accuracy_pct": concept_accuracy_pct,
                "correct_count": correct,
                "incorrect_count": incorrect,
                "topic_grade": topic_grade,
                "status_label": status_label,
                "you_struggling": you_struggling,
                "revision_guidance": revision_guidance,
                "pct_of_class_struggling": round(max(0.1, 1.0 - mastery), 2),
            })

    # Sort concepts so topics needing urgent revision appear at the top
    pulse_concepts.sort(key=lambda x: (not x["you_struggling"], x["accuracy_pct"], x["clarity_pct"]))

    avg_clarity = round(total_mastery_sum / len(concepts_data), 1) if concepts_data else 0.0
    total_reviews = total_correct + total_incorrect
    overall_accuracy = round((total_correct / total_reviews) * 100, 1) if total_reviews > 0 else 0.0

    if total_reviews == 0 and avg_clarity == 0:
        level = "New Syllabus (Not Yet Graded)"
        letter_grade = "UNREVIEWED"
    elif avg_clarity >= 85 and overall_accuracy >= 80:
        level = "Exam Ready (Grade A)"
        letter_grade = "GRADE A"
    elif avg_clarity >= 70:
        level = "Good Conceptual Progress"
        letter_grade = "GRADE B+"
    elif avg_clarity >= 50:
        level = "Satisfactory Progress"
        letter_grade = "GRADE C"
    else:
        level = "Requires Urgent Revision"
        letter_grade = "GRADE F"

    return {
        "enabled": True,
        "overall_clarity_pct": avg_clarity,
        "overall_accuracy_pct": overall_accuracy,
        "correct_count": total_correct,
        "incorrect_count": total_incorrect,
        "letter_grade": letter_grade,
        "understanding_level": level,
        "needs_revision_count": weak_count,
        "solid_count": solid_count,
        "specific_topics_to_revise": topics_to_revise,
        "cohort_size": 1,
        "concepts": pulse_concepts,
        "your_rank_pct": avg_clarity,
    }