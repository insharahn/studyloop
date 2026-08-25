"""
FSRS (Free Spaced Repetition Scheduler) wrapper for StudyLoop.
Wraps the `fsrs` package so the rest of the app never touches
spaced-repetition math directly.
"""

from fsrs import Scheduler, Card, Rating, State
from datetime import datetime, timezone

# One shared scheduler instance — FSRS parameters are algorithm defaults for now.
scheduler = Scheduler()

_GRADE_TO_RATING = {
    1: Rating.Again,
    2: Rating.Hard,
    3: Rating.Good,
    4: Rating.Easy,
}


def _state_to_str(state) -> str:
    return state.name if hasattr(state, "name") else str(state)


def init_card_state() -> dict:
    """
    Creates a brand-new FSRS card state (for a card a user has never reviewed).
    Returns a dict matching the card_states table columns.
    """
    card = Card()
    return {
        "stability": card.stability,
        "difficulty": card.difficulty,
        "due_at": card.due.isoformat(),
        "reps": card.step or 0,
        "lapses": 0,  # tracked ourselves; fsrs doesn't expose this directly
        "state": _state_to_str(card.state),
        "last_review": card.last_review.isoformat() if card.last_review else None,
    }


def advance_card_state(existing_state: dict, grade: int, review_datetime: datetime | None = None) -> dict:
    """
    Takes the current card_states row (as a dict) and a grade (1-4),
    advances it through FSRS, and returns the updated fields to persist.

    review_datetime: when this review is happening. Defaults to now
    (real production use). Verification/testing scripts can pass a
    simulated datetime (e.g. the card's own due date) to accurately
    exercise FSRS's interval growth, since FSRS bases growth on how
    much time actually elapsed since the last review.
    """
    if grade not in _GRADE_TO_RATING:
        raise ValueError(f"Invalid grade: {grade}. Must be 1-4.")

    if review_datetime is None:
        review_datetime = datetime.now(timezone.utc)

    # Reconstruct an FSRS Card object from our stored state
    stored_state_name = existing_state.get("state", "Learning")
    card = Card(
        state=State[stored_state_name] if stored_state_name in State.__members__ else State.Learning,
        step=existing_state.get("reps"),
        stability=existing_state.get("stability"),
        difficulty=existing_state.get("difficulty"),
        due=datetime.fromisoformat(existing_state["due_at"]) if existing_state.get("due_at") else datetime.now(timezone.utc),
        last_review=datetime.fromisoformat(existing_state["last_review"]) if existing_state.get("last_review") else None,
    )

    rating = _GRADE_TO_RATING[grade]
    updated_card, review_log = scheduler.review_card(card, rating, review_datetime=review_datetime)

    is_lapse = grade == 1
    new_lapses = existing_state.get("lapses", 0) + (1 if is_lapse else 0)

    return {
        "stability": updated_card.stability,
        "difficulty": updated_card.difficulty,
        "due_at": updated_card.due.isoformat(),
        "reps": (existing_state.get("reps") or 0) + 1,
        "lapses": new_lapses,
        "state": _state_to_str(updated_card.state),
        "last_review": updated_card.last_review.isoformat() if updated_card.last_review else review_datetime.isoformat(),
    }