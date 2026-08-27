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
    
@router.get("/courses/{course_id}/cards")
def list_course_cards(course_id: str, user_id: str = Depends(get_current_user)):
    _verify_course_ownership(course_id, user_id)
    with pool.connection() as conn:
        rows = conn.execute(
            """
            select c.id, c.type, c.question, c.options, c.answer, c.explanation,
                   c.source_document_id, c.source_page, co.id as concept_id, co.name as concept_name
            from cards c
            left join concepts co on co.id = c.concept_id
            where c.course_id = %s
            order by co.name, c.id
            """,
            (course_id,),
        ).fetchall()

    return {
        "cards": [
            {
                "card_id": str(r[0]),
                "type": r[1],
                "question": r[2],
                "options": r[3],
                "answer": r[4],
                "explanation": r[5],
                "source_document_id": str(r[6]) if r[6] else None,
                "source_page": r[7],
                "concept_id": str(r[8]) if r[8] else None,
                "concept_name": r[9] or "General",
            }
            for r in rows
        ]
    }