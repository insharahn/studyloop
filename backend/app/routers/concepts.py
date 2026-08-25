"""
Concept endpoints: trigger extraction, list concepts with per-user mastery.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.deps import get_current_user
from app.db import pool
from app.generation.concepts import build_concepts

router = APIRouter()


@router.post("/courses/{course_id}/build-concepts")
def trigger_build_concepts(course_id: str, user_id: str = Depends(get_current_user)):
    _verify_course_ownership(course_id, user_id)
    result = build_concepts(course_id)
    return {"concepts_created": result["concepts_created"], "edges_created": result["edges_created"]}


@router.get("/courses/{course_id}/concepts")
def list_concepts(course_id: str, user_id: str = Depends(get_current_user)):
    _verify_course_ownership(course_id, user_id)

    with pool.connection() as conn:
        concept_rows = conn.execute(
            """
            select c.id, c.name, c.description,
                   coalesce(u.mastery, 0) as mastery,
                   coalesce(u.status, 'unseen') as status
            from concepts c
            left join user_concept_state u on u.concept_id = c.id and u.user_id = %s
            where c.course_id = %s
            """,
            (user_id, course_id),
        ).fetchall()

        edge_rows = conn.execute(
            """
            select prerequisite_id, concept_id
            from concept_edges e
            join concepts c on c.id = e.concept_id
            where c.course_id = %s
            """,
            (course_id,),
        ).fetchall()

        card_rows = conn.execute(
            """
            select id, concept_id, question, answer, source_page
            from cards
            where course_id = %s
            """,
            (course_id,),
        ).fetchall()

    prereqs_by_concept: dict[str, list[str]] = {}
    for prereq_id, concept_id in edge_rows:
        prereqs_by_concept.setdefault(str(concept_id), []).append(str(prereq_id))

    cards_by_concept: dict[str, list[dict]] = {}
    all_course_cards: list[dict] = []
    for card_id, c_id, question, answer, page in card_rows:
        card_obj = {
            "id": str(card_id),
            "q": question,
            "a": answer,
            "source_page": page or 1
        }
        all_course_cards.append(card_obj)
        if c_id:
            cards_by_concept.setdefault(str(c_id), []).append(card_obj)

    concepts_data = []
    for r in concept_rows:
        c_id = str(r[0])
        matched_cards = cards_by_concept.get(c_id, [])
        if not matched_cards and all_course_cards:
            matched_cards = all_course_cards[:3]
        concepts_data.append({
            "id": c_id,
            "name": r[1],
            "description": r[2],
            "mastery": float(r[3]),
            "status": r[4],
            "prerequisites": prereqs_by_concept.get(c_id, []),
            "card_count": len(matched_cards),
            "sample_cards": matched_cards
        })

    return {"concepts": concepts_data}


def _verify_course_ownership(course_id: str, user_id: str) -> None:
    with pool.connection() as conn:
        row = conn.execute(
            "select id from courses where id = %s and user_id = %s",
            (course_id, user_id),
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Course not found")