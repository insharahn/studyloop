"""
Exam-date-aware review planner for StudyLoop.
FSRS gives due dates assuming an infinite horizon; this layer
compresses the schedule to fit the student's actual exam date.
"""

from datetime import date, datetime, timezone


def _days_until(due_at_iso: str) -> float:
    """Days from now until a card's due date. Can be negative (overdue)."""
    due = datetime.fromisoformat(due_at_iso)
    if due.tzinfo is None:
        due = due.replace(tzinfo=timezone.utc)
    now = datetime.now(timezone.utc)
    delta = (due - now).total_seconds() / 86400
    return delta


def compute_priority(due_at_iso: str, mastery: float, days_to_exam: int | None) -> float:
    """
    Priority score for ordering the review queue, descending.
    urgency: inverse of days until due, floored so it can't blow up
    weakness: 1 - mastery
    exam_pressure: clamped ratio of 30 / days_remaining
    """
    days_until_due = _days_until(due_at_iso)
    urgency = 1 / max(days_until_due, 0.1)  # floor prevents division blow-up

    weakness = 1 - mastery

    if days_to_exam is not None and days_to_exam > 0:
        exam_pressure = min(30 / days_to_exam, 10)  # clamp so it can't dominate absurdly
    else:
        exam_pressure = 1.0  # no exam date set, or exam passed: neutral pressure

    return urgency * weakness * exam_pressure


def build_review_plan(cards_with_state: list[dict], days_to_exam: int | None, cards_remaining_total: int) -> dict:
    """
    cards_with_state: list of dicts, each with at least
        { 'due_at': iso str, 'mastery': float, ... }
    Returns the plan object per docs/API.md:
        { days_to_exam, cards_today, cards_remaining_total, on_track }
    """
    if days_to_exam is not None and days_to_exam > 0:
        cards_today = max(-(-cards_remaining_total // days_to_exam), 10)  # ceil division, floor of 10
        on_track = cards_remaining_total <= cards_today * days_to_exam
    else:
        cards_today = max(cards_remaining_total, 10) if cards_remaining_total else 10
        on_track = True  # no exam date means no deadline pressure

    return {
        "days_to_exam": days_to_exam,
        "cards_today": cards_today,
        "cards_remaining_total": cards_remaining_total,
        "on_track": on_track,
    }


def order_cards_by_priority(cards_with_state: list[dict], days_to_exam: int | None) -> list[dict]:
    """
    Takes a list of card dicts, each needing 'due_at' and 'mastery' keys,
    and returns them sorted by priority score, descending (highest priority first).
    """
    for card in cards_with_state:
        card["_priority"] = compute_priority(card["due_at"], card.get("mastery", 0), days_to_exam)

    ordered = sorted(cards_with_state, key=lambda c: c["_priority"], reverse=True)

    for card in ordered:
        card.pop("_priority", None)

    return ordered