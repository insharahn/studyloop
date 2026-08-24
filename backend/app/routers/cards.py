"""
Card generation endpoint.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.deps import get_current_user
from app.db import pool
from app.generation.cards import generate_cards

router = APIRouter()


@router.post("/courses/{course_id}/generate-cards")
def trigger_generate_cards(course_id: str, payload: dict | None = None, user_id: str = Depends(get_current_user)):
    _verify_course_ownership(course_id, user_id)

    payload = payload or {}
    concept_ids = payload.get("concept_ids")
    per_concept = payload.get("per_concept", 3)

    result = generate_cards(course_id, concept_ids=concept_ids, per_concept=per_concept)
    return {"created": result["created"]}


def _verify_course_ownership(course_id: str, user_id: str) -> None:
    with pool.connection() as conn:
        row = conn.execute(
            "select id from courses where id = %s and user_id = %s",
            (course_id, user_id),
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Course not found")