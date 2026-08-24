"""
Chat endpoint: runs the full retrieval + tutor pipeline (dense -> lexical
-> fusion -> rerank -> tutor), logs gap events, persists the conversation.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException

from app.deps import get_current_user
from app.db import pool
from app.retrieval.dense import dense_search
from app.retrieval.lexical import lexical_search
from app.retrieval.fusion import reciprocal_rank_fusion
from app.retrieval.rerank import rerank
from app.generation.tutor import answer_doubt
from app.generation.gaps import log_gap_from_doubt
from app.ingestion.embedder import embed_query

router = APIRouter()

DENSE_K = 20
LEXICAL_K = 20


@router.post("/chat")
def chat(payload: dict, user_id: str = Depends(get_current_user)):
    course_id = payload.get("course_id")
    message = payload.get("message")
    session_id = payload.get("session_id")

    if not course_id or not message:
        raise HTTPException(status_code=422, detail="course_id and message are required")

    course_name = _verify_course_ownership(course_id, user_id)
    session_id = session_id or _create_session(user_id, course_id)

    d = dense_search(course_id, embed_query(message), k=DENSE_K)
    l = lexical_search(course_id, message, k=LEXICAL_K)
    fused = reciprocal_rank_fusion([d, l])
    rr = rerank(message, fused)

    result = answer_doubt(message, rr.chunks, rr.confidence, course_name=course_name)

    touched_ids = log_gap_from_doubt(user_id, course_id, message)
    concepts_touched = _fetch_concept_summaries(touched_ids)

    message_id = _persist_messages(session_id, message, result)

    return {
        "session_id": session_id,
        "message_id": message_id,
        "answer": result.answer,
        "grounded": result.grounded,
        "confidence": result.confidence,
        "citations": [
            {"doc_id": c.doc_id, "filename": c.filename, "page": c.page, "snippet": c.snippet}
            for c in result.citations
        ],
        "concepts_touched": concepts_touched,
    }


@router.get("/chat/sessions")
def list_chat_sessions(course_id: str, user_id: str = Depends(get_current_user)):
    _verify_course_ownership(course_id, user_id)
    with pool.connection() as conn:
        rows = conn.execute(
            """
            select s.id, s.title, s.created_at, count(m.id)
            from chat_sessions s
            left join chat_messages m on m.session_id = s.id
            where s.course_id = %s and s.user_id = %s
            group by s.id
            order by s.created_at desc
            """,
            (course_id, user_id),
        ).fetchall()
    return {
        "sessions": [
            {"id": str(r[0]), "title": r[1], "created_at": r[2].isoformat(), "message_count": r[3]}
            for r in rows
        ]
    }


@router.get("/chat/sessions/{session_id}")
def get_chat_session(session_id: str, user_id: str = Depends(get_current_user)):
    with pool.connection() as conn:
        session = conn.execute(
            "select id from chat_sessions where id = %s and user_id = %s",
            (session_id, user_id),
        ).fetchone()
        if not session:
            raise HTTPException(status_code=404, detail="Chat session not found")

        rows = conn.execute(
            """
            select id, role, content, grounded, confidence, citations, created_at
            from chat_messages
            where session_id = %s
            order by created_at asc
            """,
            (session_id,),
        ).fetchall()

    return {
        "session_id": session_id,
        "messages": [
            {
                "id": str(r[0]), "role": r[1], "content": r[2],
                "grounded": r[3], "confidence": r[4],
                "citations": r[5] or [], "created_at": r[6].isoformat(),
            }
            for r in rows
        ],
    }


def _verify_course_ownership(course_id: str, user_id: str) -> str:
    with pool.connection() as conn:
        row = conn.execute(
            "select name from courses where id = %s and user_id = %s",
            (course_id, user_id),
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Course not found")
    return row[0]


def _create_session(user_id: str, course_id: str) -> str:
    session_id = str(uuid.uuid4())
    with pool.connection() as conn:
        conn.execute(
            "insert into chat_sessions (id, user_id, course_id) values (%s, %s, %s)",
            (session_id, user_id, course_id),
        )
    return session_id


def _fetch_concept_summaries(concept_ids: list[str]) -> list[dict]:
    if not concept_ids:
        return []
    with pool.connection() as conn:
        rows = conn.execute(
            "select id, name from concepts where id = any(%s)",
            (concept_ids,),
        ).fetchall()
    return [{"id": str(r[0]), "name": r[1]} for r in rows]


def _persist_messages(session_id: str, user_message: str, result) -> str:
    import json
    message_id = str(uuid.uuid4())
    with pool.connection() as conn:
        with conn.transaction():
            conn.execute(
                "insert into chat_messages (session_id, role, content) values (%s, 'user', %s)",
                (session_id, user_message),
            )
            conn.execute(
                """
                insert into chat_messages
                    (id, session_id, role, content, grounded, confidence, citations)
                values (%s, %s, 'assistant', %s, %s, %s, %s)
                """,
                (
                    message_id, session_id, result.answer, result.grounded,
                    result.confidence,
                    json.dumps([
                        {"doc_id": c.doc_id, "filename": c.filename, "page": c.page, "snippet": c.snippet}
                        for c in result.citations
                    ]),
                ),
            )
    return message_id