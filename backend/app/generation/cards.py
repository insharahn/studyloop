"""
Flashcard generation: for each concept, retrieves relevant chunks via
dense search, then generates a small set of MCQ/cloze cards grounded in
that material. Distractors are drawn from real sibling concepts in the
same course, not generic wrong answers.

Same TPM discipline as concepts.py -- small max_tokens, low reasoning
effort, deliberate spacing between calls -- since this iterates over
many concepts and can otherwise hit Groq's free-tier rate limit fast.
A single concept's generation failing doesn't abort the whole batch.
"""

from __future__ import annotations

import json
import logging
import os
import random
import re
import time
from dataclasses import dataclass

from app.generation.groq_client import call_groq_with_fallback

from app.db import pool
from app.retrieval.dense import dense_search
from app.ingestion.embedder import embed_query

logger = logging.getLogger(__name__)

CARDS_MODEL = "openai/gpt-oss-120b"
CARDS_PER_CONCEPT_DEFAULT = 3
CONTEXT_CHUNK_COUNT = 3
SIBLING_CONCEPT_SAMPLE = 5
DELAY_BETWEEN_CONCEPTS_SECONDS = 3


@dataclass
class GeneratedCard:
    concept_id: str
    type: str  # "mcq" | "cloze"
    question: str
    options: list[str] | None
    answer: str
    explanation: str
    source_document_id: str | None
    source_page: int | None


def generate_cards(course_id: str, concept_ids: list[str] | None = None, per_concept: int = CARDS_PER_CONCEPT_DEFAULT) -> dict:
    """
    Generates cards for the given concepts (or all concepts in the course
    if concept_ids is None), writes them to the database. Returns
    {"created": int}. Concepts that fail to generate are skipped, not
    fatal to the whole call.
    """
    concepts = _fetch_concepts(course_id, concept_ids)
    if not concepts:
        logger.warning("No concepts found for course %s, nothing to generate", course_id)
        return {"created": 0}

    all_names = [c["name"] for c in concepts]
    total_created = 0

    for i, concept in enumerate(concepts):
        siblings = _sample_siblings(all_names, exclude=concept["name"])

        try:
            context_chunks = dense_search(
                course_id,
                embed_query(f"{concept['name']}: {concept['description']}"),
                k=CONTEXT_CHUNK_COUNT,
            )
            cards = _generate_cards_for_concept(concept, context_chunks, siblings, per_concept)
            cards = [c for c in cards if _is_valid_card(c)]
            total_created += _write_cards(course_id, cards)
        except Exception as e:
            logger.warning("Card generation failed for concept '%s', skipping: %s", concept["name"], e)

        if i < len(concepts) - 1:
            time.sleep(DELAY_BETWEEN_CONCEPTS_SECONDS)

    return {"created": total_created}


def _fetch_concepts(course_id: str, concept_ids: list[str] | None) -> list[dict]:
    with pool.connection() as conn:
        if concept_ids:
            rows = conn.execute(
                "select id, name, description, source_document_id, source_page "
                "from concepts where course_id = %s and id = any(%s)",
                (course_id, concept_ids),
            ).fetchall()
        else:
            rows = conn.execute(
                "select id, name, description, source_document_id, source_page "
                "from concepts where course_id = %s",
                (course_id,),
            ).fetchall()

    return [
        {
            "id": str(r[0]),
            "name": r[1],
            "description": r[2] or "",
            "source_document_id": str(r[3]) if r[3] else None,
            "source_page": r[4],
        }
        for r in rows
    ]


def _sample_siblings(all_names: list[str], exclude: str) -> list[str]:
    candidates = [n for n in all_names if n != exclude]
    if len(candidates) <= SIBLING_CONCEPT_SAMPLE:
        return candidates
    return random.sample(candidates, SIBLING_CONCEPT_SAMPLE)


def _generate_cards_for_concept(concept: dict, chunks: list, siblings: list[str], count: int) -> list[GeneratedCard]:
    context = "\n\n".join(
        f"[{c.filename} p.{c.page_number}]: {c.content[:400]}" for c in chunks
    ) or concept["description"]

    prompt = (
        f"Create {count} study flashcards testing understanding of this concept:\n"
        f"Concept: {concept['name']}\n"
        f"Description: {concept['description']}\n\n"
        f"Course material for grounding:\n{context}\n\n"
        f"Other concepts in this course (use ONLY these as multiple-choice "
        f"wrong-answer options where relevant, don't invent unrelated ones): "
        f"{json.dumps(siblings)}\n\n"
        "Mix of MCQ (4 options) and cloze (fill-in-the-blank) cards. "
        "The question must not contain the answer verbatim. Ground every "
        "card in the material above, don't test anything not covered.\n\n"
        'Respond with ONLY a JSON array, no other text: '
        '[{"type": "mcq", "question": "...", "options": ["...", "...", "...", "..."], '
        '"answer": "...", "explanation": "..."}, '
        '{"type": "cloze", "question": "... ___ ...", "options": null, '
        '"answer": "...", "explanation": "..."}]'
    )

    response = call_groq_with_fallback(
        model=CARDS_MODEL,
        max_tokens=1200,
        reasoning_effort="low",
        messages=[{"role": "user", "content": prompt}],
    )
    if response is None:
        logger.warning("Card generation failed on both Groq keys for concept '%s', skipping", concept["name"])
        return []

    raw = response.choices[0].message.content
    cleaned = _strip_fences(raw)
    if not cleaned:
        logger.warning(
            "Card generation returned empty content for concept '%s'. finish_reason=%s",
            concept["name"], response.choices[0].finish_reason,
        )
        return []

    parsed = json.loads(cleaned)

    source_doc = concept["source_document_id"]
    source_page = concept["source_page"]
    if chunks:
        # Prefer the top retrieved chunk's source over the concept's
        # original extraction source -- it's more likely to be the best
        # single citation for THIS specific card's content.
        source_doc = chunks[0].document_id
        source_page = chunks[0].page_number

    cards = []
    for item in parsed:
        card_type = item.get("type")
        if card_type not in ("mcq", "cloze"):
            continue
        cards.append(GeneratedCard(
            concept_id=concept["id"],
            type=card_type,
            question=item.get("question", "").strip(),
            options=item.get("options") if card_type == "mcq" else None,
            answer=str(item.get("answer", "")).strip(),
            explanation=item.get("explanation", "").strip(),
            source_document_id=source_doc,
            source_page=source_page,
        ))
    return cards


def _is_valid_card(card: GeneratedCard) -> bool:
    if not card.question or not card.answer:
        return False
    if card.answer.lower() in card.question.lower():
        return False  # answer appears verbatim in the question -- lazy/broken card
    if card.type == "mcq" and (not card.options or len(card.options) < 2):
        return False
    return True


def _write_cards(course_id: str, cards: list[GeneratedCard]) -> int:
    if not cards:
        return 0

    with pool.connection() as conn:
        with conn.transaction():
            conn.cursor().executemany(
                """
                insert into cards
                    (course_id, concept_id, type, question, options, answer,
                     explanation, source_document_id, source_page)
                values (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                [
                    (
                        course_id, c.concept_id, c.type, c.question,
                        json.dumps(c.options) if c.options else None,
                        c.answer, c.explanation, c.source_document_id, c.source_page,
                    )
                    for c in cards
                ],
            )
    return len(cards)


def _strip_fences(text: str) -> str:
    text = text.strip()
    return re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.MULTILINE).strip()