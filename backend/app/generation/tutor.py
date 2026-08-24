"""
Grounded tutor: answers a student's question using only retrieved chunks
from their own course material, via Groq (Llama). Refuses when retrieval
confidence is too low rather than guessing -- this refusal gate is the
core differentiator, so it runs BEFORE any LLM call, not after.
"""

from __future__ import annotations

import logging
import os
import re
from dataclasses import dataclass

from openai import OpenAI

from app.retrieval.dense import RetrievedChunk

logger = logging.getLogger(__name__)

TUTOR_MODEL = "openai/gpt-oss-120b"
CONFIDENCE_THRESHOLD = 0.35

_client = OpenAI(
    api_key=os.environ["GROQ_API_KEY"],
    base_url="https://api.groq.com/openai/v1",
)

REFUSAL_TEMPLATE = (
    "I couldn't find anything about this in your uploaded notes for {course_name}. "
    "This might be outside what you've uploaded so far -- try adding more material, "
    "or rephrasing the question."
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

    try:
        response = _client.chat.completions.create(
            model=TUTOR_MODEL,
            max_tokens=600,
            messages=[{"role": "user", "content": prompt}],
        )
        raw_answer = response.choices[0].message.content
    except Exception as e:
        logger.error("Tutor LLM call failed: %s", e)
        return TutorAnswer(
            answer="Something went wrong answering that -- please try again.",
            grounded=False,
            confidence=confidence,
            citations=[],
        )

    clean_answer, citations = _extract_citations(raw_answer, chunks)

    return TutorAnswer(
        answer=clean_answer,
        grounded=True,
        confidence=confidence,
        citations=citations,
    )


def _build_prompt(query: str, chunks: list[RetrievedChunk]) -> str:
    lines = [
        "Answer the student's question using ONLY the numbered passages below. "
        "Do not use any outside knowledge. If the passages don't fully answer "
        "the question, say what's missing rather than filling gaps yourself.",
        "",
        "Cite passages inline using their number in brackets, e.g. [1], "
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
    and drops any marker that doesn't correspond to a real chunk (e.g.
    a hallucinated [9] when only 6 passages were given).
    """
    found_numbers = {int(n) for n in re.findall(r"\[(\d+)\]", raw_answer)}

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