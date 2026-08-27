"""
Grounded tutor: answers a student's question using only retrieved chunks
from their own course material, via Groq (Llama). Refuses when retrieval
confidence is too low rather than guessing -- this refusal gate is the
core differentiator, so it runs BEFORE any LLM call, not after.

Falls back to a secondary Groq key if the primary is rate-limited. If
both are exhausted, returns a clear "server is busy" message rather
than a generic error -- this is a distinct failure mode from "not in
your notes" and should read differently to the student.
"""

from __future__ import annotations

import logging
import os
import re
from dataclasses import dataclass

from app.retrieval.dense import RetrievedChunk
from app.generation.groq_client import call_groq_with_fallback

logger = logging.getLogger(__name__)

TUTOR_MODEL = "openai/gpt-oss-120b"
CONFIDENCE_THRESHOLD = 0.35

REFUSAL_TEMPLATE = (
    "I couldn't find anything about this in your uploaded notes for {course_name}. "
    "This might be outside what you've uploaded so far -- try adding more material, "
    "or rephrasing the question."
)

BUSY_MESSAGE = (
    "The tutor is under heavy load right now and can't answer at the moment. "
    "Please try again in a minute."
)


@dataclass
class Citation:
    doc_id: str
    filename: str
    page: int
    snippet: str


@dataclass
class TutorAnswer:
    answer: str
    grounded: bool
    confidence: float
    citations: list[Citation]


def answer_doubt(
    query: str,
    chunks: list[RetrievedChunk],
    confidence: float,
    course_name: str = "this course",
) -> TutorAnswer:
    """
    Answers a question using only the given chunks. If confidence is
    below threshold, skips the LLM call entirely and returns a fixed
    refusal -- this is the confidence gate.
    """
    if confidence < CONFIDENCE_THRESHOLD or not chunks:
        return TutorAnswer(
            answer=REFUSAL_TEMPLATE.format(course_name=course_name),
            grounded=False,
            confidence=confidence,
            citations=[],
        )

    prompt = _build_prompt(query, chunks)

    choice = _call_with_fallback(prompt)
    if choice is None:
        # Both keys exhausted (or both failed for any reason) -- this is
        # a distinct, honest "we're overloaded" state, not the confidence
        # gate's "not in your notes" refusal. grounded=False either way
        # since no real grounded answer was produced.
        return TutorAnswer(
            answer=BUSY_MESSAGE,
            grounded=False,
            confidence=confidence,
            citations=[],
        )

    raw_answer = choice.message.content
    was_truncated = choice.finish_reason == "length"

    if was_truncated:
        raw_answer = _trim_to_last_sentence(raw_answer) + "\n\n*(Answer was long and got cut short -- ask a follow-up if you need the rest.)*"

    clean_answer, citations = _extract_citations(raw_answer, chunks)

    return TutorAnswer(
        answer=clean_answer,
        grounded=True,
        confidence=confidence,
        citations=citations,
    )


def _call_with_fallback(prompt: str):
    response = call_groq_with_fallback(
        model=TUTOR_MODEL,
        max_tokens=1000,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.choices[0] if response else None


def _trim_to_last_sentence(text: str) -> str:
    """
    Trims text back to the last complete sentence, so a truncated LLM
    response ends cleanly rather than mid-word or mid-list-item. Falls
    back to the original text if no sentence boundary is found at all.
    """
    matches = list(re.finditer(r"[.!?](?:\s|$)", text))
    if not matches:
        return text
    last_end = matches[-1].end()
    return text[:last_end].rstrip()


def _build_prompt(query: str, chunks: list[RetrievedChunk]) -> str:
    lines = [
        "Answer the student's question using ONLY the numbered passages below. "
        "Do not use any outside knowledge. If the passages don't fully answer "
        "the question, say what's missing rather than filling gaps yourself.",
        "",
        "Cite passages inline using their number in plain square brackets "
        "exactly like this: [1] -- not full-width or stylized brackets -- "
        "right after the claim they support.",
        "",
        "Passages:",
    ]
    for i, c in enumerate(chunks, start=1):
        lines.append(f"[{i}] ({c.filename}, p.{c.page_number}): {c.content}")

    lines.append("")
    lines.append(f"Question: {query}")
    return "\n".join(lines)


def _extract_citations(
    raw_answer: str, chunks: list[RetrievedChunk]
) -> tuple[str, list[Citation]]:
    """
    Finds [N] markers in the raw answer, maps them back to real chunks,
    and drops any marker that doesn't correspond to a real chunk.
    """
    found_numbers = {
        int(n) for n in re.findall(r"[\[【](\d+)[\]】]", raw_answer)
    }
    citations = []
    seen_chunk_ids = set()
    for n in sorted(found_numbers):
        idx = n - 1
        if 0 <= idx < len(chunks):
            chunk = chunks[idx]
            if chunk.chunk_id not in seen_chunk_ids:
                citations.append(Citation(
                    doc_id=chunk.document_id,
                    filename=chunk.filename,
                    page=chunk.page_number,
                    snippet=chunk.content[:200],
                ))
                seen_chunk_ids.add(chunk.chunk_id)

    return raw_answer, citations