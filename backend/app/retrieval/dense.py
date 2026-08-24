"""
Dense retrieval: cosine similarity search over chunk embeddings via pgvector.

Uses the <=> operator (cosine distance, 0=identical, 2=opposite) rather
than <-> (Euclidean) or <#> (negative inner product) — this only gives
correct results because embedder.py normalizes every vector to unit
length before storing it. If that normalization is ever removed, this
operator choice needs revisiting too.
"""

from __future__ import annotations

from dataclasses import dataclass

from app.db import pool


@dataclass
class RetrievedChunk:
    chunk_id: str
    document_id: str
    filename: str
    page_number: int
    content: str
    score: float  # similarity, 1.0 = identical, higher is better


def dense_search(course_id: str, query_embedding: list[float], k: int = 20) -> list[RetrievedChunk]:
    """
    Top-k chunks by cosine similarity, scoped to one course.
    Returns an empty list if the course has no chunks yet — never raises
    for that case, since "no notes uploaded" is a normal, expected state.
    """
    with pool.connection() as conn:
        rows = conn.execute(
            """
            select
                c.id,
                c.document_id,
                d.filename,
                c.page_number,
                c.content,
                1 - (c.embedding <=> %(query_embedding)s::vector) as score
            from chunks c
            join documents d on d.id = c.document_id
            where c.course_id = %(course_id)s
            order by c.embedding <=> %(query_embedding)s::vector
            limit %(k)s
            """,
            {
                "query_embedding": query_embedding,
                "course_id": course_id,
                "k": k,
            },
        ).fetchall()

    return [
        RetrievedChunk(
            chunk_id=str(row[0]),
            document_id=str(row[1]),
            filename=row[2],
            page_number=row[3],
            content=row[4],
            score=row[5],
        )
        for row in rows
    ]