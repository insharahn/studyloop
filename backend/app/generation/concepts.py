"""
Concept extraction: samples chunks across a course's documents, extracts
concept names + descriptions via Groq, deduplicates, then infers
prerequisite relationships in a second pass. Enforces the result is a
DAG -- any edge that would close a cycle is dropped, not just flagged.
"""

from __future__ import annotations

import json
import time
import logging
import os
import re

from openai import OpenAI

from app.db import pool

logger = logging.getLogger(__name__)

CONCEPTS_MODEL = "openai/gpt-oss-120b"
MAX_SAMPLE_CHUNKS = 60
BATCH_SIZE = 20
MIN_CONCEPTS = 15
MAX_CONCEPTS = 40

_client = OpenAI(
    api_key=os.environ["GROQ_API_KEY"],
    base_url="https://api.groq.com/openai/v1",
)

def build_concepts(course_id: str) -> dict:
    chunks = _sample_chunks(course_id)
    if not chunks:
        logger.warning("No chunks found for course %s, skipping concept extraction", course_id)
        return {"concepts_created": 0, "edges_created": 0}

    raw_concepts = _extract_concepts(chunks)
    deduped = _deduplicate(raw_concepts)

    if not deduped:
        logger.warning("Concept extraction produced nothing usable for course %s", course_id)
        return {"concepts_created": 0, "edges_created": 0}

    time.sleep(5)  # let the free-tier TPM window recover before the next call

    edges = _infer_prerequisites([c["name"] for c in deduped])
    acyclic_edges = _drop_cyclic_edges([c["name"] for c in deduped], edges)

    concepts_created, edges_created = _write_to_db(course_id, deduped, acyclic_edges)
    return {"concepts_created": concepts_created, "edges_created": edges_created}

def _sample_chunks(course_id: str) -> list[dict]:
    """
    Samples up to MAX_SAMPLE_CHUNKS chunks, spread evenly across the
    course's documents rather than just taking the first N rows -- a
    course with several PDFs shouldn't only surface concepts from
    whichever document happened to be ingested first.
    """
    with pool.connection() as conn:
        doc_ids = [
            row[0] for row in conn.execute(
                "select id from documents where course_id = %s and status = 'ready'",
                (course_id,),
            ).fetchall()
        ]

        if not doc_ids:
            return []

        per_doc_limit = max(1, MAX_SAMPLE_CHUNKS // len(doc_ids))
        chunks = []
        for doc_id in doc_ids:
            rows = conn.execute(
                """
                select content, page_number, document_id
                from chunks
                where document_id = %s
                order by chunk_index
                limit %s
                """,
                (doc_id, per_doc_limit),
            ).fetchall()
            chunks.extend(
                {"content": r[0], "page_number": r[1], "document_id": str(r[2])}
                for r in rows
            )

    return chunks[:MAX_SAMPLE_CHUNKS]


def _extract_concepts(chunks: list[dict]) -> list[dict]:
    """Runs concept extraction in batches, returns the raw (not yet
    deduplicated) list across all batches."""
    all_concepts = []
    for i in range(0, len(chunks), BATCH_SIZE):
        batch = chunks[i:i + BATCH_SIZE]
        all_concepts.extend(_extract_concepts_batch(batch))
    return all_concepts


def _extract_concepts_batch(batch: list[dict]) -> list[dict]:
    lines = [
        "Extract the key concepts/topics taught in these course material "
        "excerpts. For each concept give a short name, a one-line "
        "description, and the passage number it's best explained in.",
        "",
        "Passages:",
    ]
    for i, c in enumerate(batch, start=1):
        snippet = c["content"][:400].replace("\n", " ")
        lines.append(f"[{i}] {snippet}")

    lines.append("")
    lines.append(
        'Respond with ONLY a JSON array, no other text: '
        '[{"name": "...", "description": "...", "passage": 1}, ...]'
    )
    prompt = "\n".join(lines)

    try:
        response = _client.chat.completions.create(
            model=CONCEPTS_MODEL,
            max_tokens=1200,
            reasoning_effort="low",
            messages=[{"role": "user", "content": prompt}],
        )
        raw = response.choices[0].message.content
        cleaned = _strip_fences(raw)
        if not cleaned:
            logger.warning("Concept extraction batch returned empty content")
            return []
        parsed = json.loads(cleaned)
    except Exception as e:
        logger.warning("Concept extraction batch failed, skipping: %s", e)
        return []
        parsed = json.loads(cleaned)
    except Exception as e:
        logger.warning("Prerequisite inference failed, returning no edges: %s", e)
        return []

    results = []
    for item in parsed:
        passage_idx = item.get("passage")
        if isinstance(passage_idx, int) and 1 <= passage_idx <= len(batch):
            source = batch[passage_idx - 1]
            results.append({
                "name": item.get("name", "").strip(),
                "description": item.get("description", "").strip(),
                "source_document_id": source["document_id"],
                "source_page": source["page_number"],
            })
    return [r for r in results if r["name"]]


def _deduplicate(concepts: list[dict]) -> list[dict]:
    """Case-insensitive dedup, keeps the first occurrence of each name."""
    seen: dict[str, dict] = {}
    for c in concepts:
        key = c["name"].lower()
        if key not in seen:
            seen[key] = c
    deduped = list(seen.values())

    if len(deduped) > MAX_CONCEPTS:
        deduped = deduped[:MAX_CONCEPTS]
    return deduped


def _infer_prerequisites(concept_names: list[str]) -> list[tuple[str, str]]:
    if len(concept_names) < 2:
        return []

    prompt = (
        "Given this list of course concepts, identify prerequisite "
        "relationships -- which concepts must be understood before "
        "others. Only use names from this exact list, do not invent "
        "new concept names. Focus on the clearest, most direct "
        "prerequisite relationships only -- you don't need to find "
        "every possible pair.\n\n"
        f"Concepts: {json.dumps(concept_names)}\n\n"
        'Respond with ONLY a JSON array, no other text: '
        '[{"prerequisite": "...", "concept": "..."}, ...]'
    )

    try:
        response = _client.chat.completions.create(
            model=CONCEPTS_MODEL,
            max_tokens=2000,
            reasoning_effort="low",
            messages=[{"role": "user", "content": prompt}],
        )
        choice = response.choices[0]
        raw = choice.message.content
        cleaned = _strip_fences(raw)
        if not cleaned:
            logger.warning(
                "Prerequisite inference returned empty content. "
                "finish_reason=%s, usage=%s",
                choice.finish_reason, response.usage,
            )
            return []
        parsed = json.loads(cleaned)
    except Exception as e:
        logger.warning("Prerequisite inference failed, returning no edges: %s", e)
        return []

    name_set = set(concept_names)
    edges = []
    for item in parsed:
        prereq = item.get("prerequisite", "").strip()
        concept = item.get("concept", "").strip()
        if prereq in name_set and concept in name_set and prereq != concept:
            edges.append((prereq, concept))
    return edges


def _drop_cyclic_edges(concept_names: list[str], edges: list[tuple[str, str]]) -> list[tuple[str, str]]:
    """
    Adds edges one at a time, running a topological sort after each
    addition; any edge that would close a cycle is dropped rather than
    added. Order-dependent (first-seen edges win over later ones that
    would create a cycle), which is an acceptable tradeoff for keeping
    this simple and deterministic.
    """
    accepted: list[tuple[str, str]] = []
    graph: dict[str, set[str]] = {name: set() for name in concept_names}

    for prereq, concept in edges:
        graph[prereq].add(concept)
        if _has_cycle(graph):
            graph[prereq].discard(concept)  # revert, this edge closes a cycle
            logger.info("Dropped edge %s -> %s: would create a cycle", prereq, concept)
        else:
            accepted.append((prereq, concept))

    return accepted


def _has_cycle(graph: dict[str, set[str]]) -> bool:
    """Standard DFS-based cycle detection (white/gray/black coloring)."""
    WHITE, GRAY, BLACK = 0, 1, 2
    color = {node: WHITE for node in graph}

    def visit(node: str) -> bool:
        color[node] = GRAY
        for neighbor in graph.get(node, ()):
            if color[neighbor] == GRAY:
                return True
            if color[neighbor] == WHITE and visit(neighbor):
                return True
        color[node] = BLACK
        return False

    return any(color[node] == WHITE and visit(node) for node in graph)


def _write_to_db(course_id: str, concepts: list[dict], edges: list[tuple[str, str]]) -> tuple[int, int]:
    """
    Upserts concepts by (course_id, name) rather than delete-and-recreate --
    preserves existing concept IDs across re-runs so cards attached to
    them (cards.concept_id has ON DELETE CASCADE) are never silently
    destroyed by regenerating the concept list.
    """
    with pool.connection() as conn:
        with conn.transaction():
            name_to_id: dict[str, str] = {}
            new_count = 0

            for c in concepts:
                row = conn.execute(
                    """
                    insert into concepts (course_id, name, description, source_document_id, source_page)
                    values (%s, %s, %s, %s, %s)
                    on conflict (course_id, name)
                    do update set
                        description = excluded.description,
                        source_document_id = excluded.source_document_id,
                        source_page = excluded.source_page
                    returning id, (xmax = 0) as was_inserted
                    """,
                    (course_id, c["name"], c["description"], c["source_document_id"], c["source_page"]),
                ).fetchone()
                name_to_id[c["name"]] = str(row[0])
                if row[1]:
                    new_count += 1

            # Prerequisite edges: clear and rewrite ONLY the edges (not
            # the concepts themselves) -- edges have no cards attached to
            # them, so this is safe to fully replace on every run.
            concept_ids = list(name_to_id.values())
            conn.execute(
                "delete from concept_edges where concept_id = any(%s)",
                (concept_ids,),
            )

            edges_created = 0
            for prereq_name, concept_name in edges:
                prereq_id = name_to_id.get(prereq_name)
                concept_id = name_to_id.get(concept_name)
                if prereq_id and concept_id:
                    conn.execute(
                        """
                        insert into concept_edges (prerequisite_id, concept_id)
                        values (%s, %s)
                        on conflict do nothing
                        """,
                        (prereq_id, concept_id),
                    )
                    edges_created += 1

    return len(concepts), edges_created


def _strip_fences(text: str) -> str:
    text = text.strip()
    return re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.MULTILINE).strip()