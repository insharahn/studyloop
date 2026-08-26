"""
Gap logging: classifies which existing course concepts a doubt-chat
question touched, and writes gap_events so recurring questions become
visible signal for the root-cause/mastery system.

Failure here never breaks the chat response -- a user should always get
their answer even if gap classification fails.
"""

from __future__ import annotations

import json
import logging
import os
import re

from app.generation.groq_client import call_groq_with_fallback

from app.db import pool

logger = logging.getLogger(__name__)

GAPS_MODEL = "openai/gpt-oss-120b"


def log_gap_from_doubt(user_id: str, course_id: str, query: str) -> list[str]:
    """
    Classifies which of the course's existing concepts this query touched,
    writes gap_events (source='doubt') and bumps times_asked for each.
    Returns the matched concept ids. Never raises -- logs and returns []
    on any failure.
    """
    try:
        concepts = _fetch_concept_names(course_id)
        if not concepts:
            return []

        touched_ids = _classify_touched(query, concepts)
        if touched_ids:
            _write_gap_events(user_id, course_id, touched_ids)
        return touched_ids
    except Exception as e:
        logger.warning("Gap logging failed for course %s, skipping: %s", course_id, e)
        return []


def _fetch_concept_names(course_id: str) -> list[dict]:
    with pool.connection() as conn:
        rows = conn.execute(
            "select id, name from concepts where course_id = %s",
            (course_id,),
        ).fetchall()
    return [{"id": str(r[0]), "name": r[1]} for r in rows]


def _classify_touched(query: str, concepts: list[dict]) -> list[str]:
    names = [c["name"] for c in concepts]
    prompt = (
        "Which of these course concepts does the student's question touch "
        "on? Only pick concepts genuinely relevant, don't force a match.\n\n"
        f"Concepts: {json.dumps(names)}\n\n"
        f"Question: {query}\n\n"
        'Respond with ONLY a JSON array of matching concept names (can be '
        'empty), no other text: ["...", ...]'
    )

    response = call_groq_with_fallback(
        model=GAPS_MODEL,
        max_tokens=300,
        reasoning_effort="low",
        messages=[{"role": "user", "content": prompt}],
    )
    if response is None:
        logger.warning("Gap classification failed on both Groq keys, skipping")
        return []

    raw = response.choices[0].message.content
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw.strip(), flags=re.MULTILINE).strip()
    if not cleaned:
        return []

    matched_names = set(json.loads(cleaned))
    return [c["id"] for c in concepts if c["name"] in matched_names]


def _write_gap_events(user_id: str, course_id: str, concept_ids: list[str]) -> None:
    with pool.connection() as conn:
        with conn.transaction():
            for concept_id in concept_ids:
                conn.execute(
                    """
                    insert into gap_events (user_id, course_id, concept_id, source)
                    values (%s, %s, %s, 'doubt')
                    """,
                    (user_id, course_id, concept_id),
                )
                conn.execute(
                    """
                    insert into user_concept_state (user_id, concept_id, times_asked)
                    values (%s, %s, 1)
                    on conflict (user_id, concept_id)
                    do update set times_asked = user_concept_state.times_asked + 1
                    """,
                    (user_id, concept_id),
                )