"""
Semantic chunking of parsed pages into embedding-ready chunks.

Hard rule, load-bearing for the whole product: a chunk NEVER spans two
pages. Page-level citations ("Lecture 4, p.12") depend on every chunk
having exactly one page_number, so this is enforced structurally —
_pack_units only ever sees units from a single page, never the whole doc.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from app.ingestion.parser import Page

try:
    import tiktoken
    _ENCODER = tiktoken.get_encoding("cl100k_base")
except Exception:  # pragma: no cover - fallback if tiktoken unavailable
    _ENCODER = None

TARGET_TOKENS = 400
OVERLAP_TOKENS = 60
MAX_UNIT_TOKENS = 400  # a single semantic unit larger than this gets force-split


@dataclass
class Chunk:
    page_number: int
    chunk_index: int  # sequential across the whole document, 0-indexed
    content: str
    token_count: int


def count_tokens(text: str) -> int:
    if _ENCODER is not None:
        return len(_ENCODER.encode(text))
    return max(1, len(text) // 4)  # rough fallback: ~4 chars/token


def chunk_pages(pages: list[Page]) -> list[Chunk]:
    """
    Turn parsed pages into chunks, never crossing a page boundary.
    Empty/whitespace-only pages produce zero chunks, not an empty chunk.
    """
    chunks: list[Chunk] = []
    global_index = 0

    for page in pages:
        text = page.text.strip()
        if not text:
            continue

        for content, token_count in _chunk_single_page(text):
            chunks.append(Chunk(
                page_number=page.page_number,
                chunk_index=global_index,
                content=content,
                token_count=token_count,
            ))
            global_index += 1

    return chunks


def _chunk_single_page(text: str) -> list[tuple[str, int]]:
    whole_tokens = count_tokens(text)
    if whole_tokens <= TARGET_TOKENS:
        return [(text, whole_tokens)]  # short page -> exactly one chunk
    return _pack_units(_split_into_units(text))


def _split_into_units(text: str) -> list[str]:
    """
    Split into semantic units, largest boundary first:
    blank-line paragraphs / bullets -> sentences -> hard token slice.
    Every returned unit is guaranteed <= MAX_UNIT_TOKENS.
    """
    raw_units = re.split(r"\n\s*\n|(?=\n[•\-\*]\s)", text)
    raw_units = [u.strip() for u in raw_units if u.strip()] or [text]

    units: list[str] = []
    for unit in raw_units:
        units.extend(_ensure_within_limit(unit))
    return units


def _ensure_within_limit(unit: str) -> list[str]:
    if count_tokens(unit) <= MAX_UNIT_TOKENS:
        return [unit]

    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", unit) if s.strip()]
    if len(sentences) > 1:
        result: list[str] = []
        for s in sentences:
            result.extend(_ensure_within_limit(s))
        return result

    # One giant unbroken "sentence" (URL, code block, run-on text) —
    # mechanical fallback so this never crashes the pipeline.
    return _hard_token_slice(unit)


def _hard_token_slice(text: str) -> list[str]:
    if _ENCODER is None:
        char_limit = MAX_UNIT_TOKENS * 4
        return [text[i:i + char_limit] for i in range(0, len(text), char_limit)] or [text]

    tokens = _ENCODER.encode(text)
    slices = [_ENCODER.decode(tokens[i:i + MAX_UNIT_TOKENS])
              for i in range(0, len(tokens), MAX_UNIT_TOKENS)]
    return slices or [text]


def _pack_units(units: list[str]) -> list[tuple[str, int]]:
    """
    Greedily pack units up to TARGET_TOKENS, carrying up to OVERLAP_TOKENS
    of trailing text into the next chunk. Only ever called with units from
    one page, so overlap can never leak across a page boundary.
    """
    chunks: list[tuple[str, int]] = []
    current: list[str] = []
    current_tokens = 0

    def flush():
        if current:
            content = "\n\n".join(current)
            chunks.append((content, count_tokens(content)))

    for unit in units:
        unit_tokens = count_tokens(unit)

        if current_tokens + unit_tokens > TARGET_TOKENS and current:
            flush()
            overlap, overlap_tokens = [], 0
            for u in reversed(current):
                t = count_tokens(u)
                if overlap_tokens + t > OVERLAP_TOKENS:
                    break
                overlap.insert(0, u)
                overlap_tokens += t
            current, current_tokens = overlap, overlap_tokens

        current.append(unit)
        current_tokens += unit_tokens

    flush()
    return chunks