"""
Review queue and submit endpoints for StudyLoop.
Combines FSRS scheduling with the exam-date-aware planner.
"""

from fastapi import APIRouter, Depends, HTTPException
from supabase import create_client, Client
from datetime import date, datetime, timezone
import os

from app.deps import get_current_user
from app.scheduling.fsrs_wrapper import init_card_state, advance_card_state
from app.scheduling.planner import build_review_plan, order_cards_by_priority
from app.scheduling.rootcause import find_root_cause

router = APIRouter()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

MASTERY_THRESHOLDS = {
    "solid": 0.8,
    "learning": 0.5,
    "shaky": 0.2,
}


def _status_from_mastery(mastery: float) -> str:
    if mastery >= MASTERY_THRESHOLDS["solid"]:
        return "solid"
    if mastery >= MASTERY_THRESHOLDS["learning"]:
        return "learning"
    if mastery >= MASTERY_THRESHOLDS["shaky"]:
        return "shaky"
    return "unseen"


@router.get("/review/due")
def review_due(course_id: str, limit: int = 20, user_id: str = Depends(get_current_user)):
    course = supabase.table("courses").select("*").eq("id", course_id).eq("user_id", user_id).execute()
    if not course.data:
        raise HTTPException(status_code=404, detail="Course not found")
    course_row = course.data[0]

    days_to_exam = None
    if course_row.get("exam_date"):
        exam = date.fromisoformat(course_row["exam_date"])
        days_to_exam = (exam - date.today()).days

    cards_result = supabase.table("cards").select("*, concepts(id, name)").eq("course_id", course_id).execute()
    all_card_ids = [c["id"] for c in cards_result.data]

    states_result = supabase.table("card_states").select("*").eq("user_id", user_id).in_("card_id", all_card_ids).execute()
    states_by_card = {s["card_id"]: s for s in states_result.data}

    ucs_result = supabase.table("user_concept_state").select("concept_id, mastery").eq("user_id", user_id).execute()
    mastery_by_concept = {u["concept_id"]: u["mastery"] for u in ucs_result.data}

    now_iso = datetime.now(timezone.utc).isoformat()
    due_cards = []
    for card in cards_result.data:
        state = states_by_card.get(card["id"])
        due_at = state["due_at"] if state else now_iso  # never-reviewed cards are due now
        mastery = mastery_by_concept.get(card["concept_id"], 0)

        if due_at <= now_iso:
            due_cards.append({
                "card_id": card["id"],
                "type": card["type"],
                "question": card["question"],
                "options": card.get("options"),
                "concept": {"id": card["concept_id"], "name": card.get("concepts", {}).get("name") if card.get("concepts") else None},
                "source": {"doc_id": card.get("source_document_id"), "filename": None, "page": card.get("source_page")},
                "due_at": due_at,
                "mastery": mastery,
            })

    ordered = order_cards_by_priority(due_cards, days_to_exam)
    limited = ordered[:limit]

    # Real pace check: how many reviews has the user actually done today,
    # used so plan.on_track reflects true behavior, not just self-consistent math.
    today_str = datetime.now(timezone.utc).date().isoformat()
    reviews_today_result = (
        supabase.table("reviews")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .gte("reviewed_at", today_str)
        .execute()
    )
    reviews_completed_today = reviews_today_result.count or 0

    plan = build_review_plan(
        due_cards,
        days_to_exam,
        cards_remaining_total=len(due_cards),
        reviews_completed_today=reviews_completed_today,
    )

    for c in limited:
        c.pop("due_at", None)
        c.pop("mastery", None)

    return {
        "session_id": None,
        "plan": plan,
        "cards": limited,
    }


@router.post("/review/submit")
def review_submit(payload: dict, user_id: str = Depends(get_current_user)):
    card_id = payload.get("card_id")
    grade = payload.get("grade")
    elapsed_ms = payload.get("elapsed_ms")

    if not card_id or grade not in (1, 2, 3, 4):
        raise HTTPException(status_code=422, detail="card_id and grade (1-4) are required")

    card_result = supabase.table("cards").select("*").eq("id", card_id).execute()
    if not card_result.data:
        raise HTTPException(status_code=404, detail="Card not found")
    card = card_result.data[0]

    # Get or create the user's card state
    state_result = supabase.table("card_states").select("*").eq("user_id", user_id).eq("card_id", card_id).execute()
    if state_result.data:
        existing_state = state_result.data[0]
    else:
        existing_state = init_card_state()
        existing_state["user_id"] = user_id
        existing_state["card_id"] = card_id
        insert_result = supabase.table("card_states").insert(existing_state).execute()
        existing_state = insert_result.data[0]

    new_state = advance_card_state(existing_state, grade)

    supabase.table("card_states").update({
        "stability": new_state["stability"],
        "difficulty": new_state["difficulty"],
        "due_at": new_state["due_at"],
        "reps": new_state["reps"],
        "lapses": new_state["lapses"],
        "state": new_state["state"],
        "last_review": new_state["last_review"],
    }).eq("user_id", user_id).eq("card_id", card_id).execute()

    # Log the review
    supabase.table("reviews").insert({
        "user_id": user_id,
        "card_id": card_id,
        "grade": grade,
        "elapsed_ms": elapsed_ms,
    }).execute()

    # Update mastery: exponential moving average, 70/30 weighted toward history
    ucs_result = supabase.table("user_concept_state").select("*").eq("user_id", user_id).eq("concept_id", card["concept_id"]).execute()
    correct = grade > 1
    outcome = 1.0 if correct else 0.0

    if ucs_result.data:
        ucs = ucs_result.data[0]
        old_mastery = ucs["mastery"]
        new_mastery = 0.7 * old_mastery + 0.3 * outcome
        times_asked = ucs["times_asked"] + 1
        times_wrong = ucs["times_wrong"] + (0 if correct else 1)
    else:
        old_mastery = 0
        new_mastery = 0.3 * outcome
        times_asked = 1
        times_wrong = 0 if correct else 1

    new_status = _status_from_mastery(new_mastery)

    if ucs_result.data:
        supabase.table("user_concept_state").update({
            "mastery": new_mastery,
            "status": new_status,
            "times_asked": times_asked,
            "times_wrong": times_wrong,
        }).eq("user_id", user_id).eq("concept_id", card["concept_id"]).execute()
    else:
        supabase.table("user_concept_state").insert({
            "user_id": user_id,
            "concept_id": card["concept_id"],
            "mastery": new_mastery,
            "status": new_status,
            "times_asked": times_asked,
            "times_wrong": times_wrong,
        }).execute()

    root_cause = None
    if not correct:
        supabase.table("gap_events").insert({
            "user_id": user_id,
            "course_id": card["course_id"],
            "concept_id": card["concept_id"],
            "source": "review_fail",
            "card_id": card_id,
        }).execute()
        root_cause = find_root_cause(user_id, card["concept_id"], new_mastery)

    return {
        "correct": correct,
        "answer": card["answer"],
        "explanation": card.get("explanation"),
        "next_due": new_state["due_at"],
        "new_mastery": new_mastery,
        "root_cause": root_cause,
    }