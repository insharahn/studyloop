"""
Lexical retrieval: Postgres full-text search over the pre-computed tsv
column on chunks.

Uses websearch_to_tsquery rather than plainto_tsquery or raw to_tsquery:
it tolerates natural user phrasing (multi-word questions, punctuation)
without throwing a syntax error, unlike to_tsquery, and handles phrases/
exclusions better than plainto_tsquery. Ranked with ts_rank_cd (cover
density) rather than plain ts_rank, since it rewards matched terms
appearing close together — relevant for multi-word technical queries.
"""

from __future__ import annotations

from app.db import pool
from app.retrieval.dense import RetrievedChunk  # shared shape with dense_search


def lexical_search(course_id: str, query: str, k: int = 20) -> list[RetrievedChunk]:
    """
    Top-k chunks by full-text rank, scoped to one course.
    Returns an empty list if the query has no searchable tokens (e.g.
    only stopwords/symbols) or the course has no chunks yet — never
    raises for either case.
    """
    if not query or not query.strip():
        return []

    with pool.connection() as conn:
        rows = conn.execute(
            """
            select
                c.id,
                c.document_id,
                d.filename,
                c.page_number,
                c.content,
                ts_rank_cd(c.tsv, websearch_to_tsquery('english', %(query)s)) as score
            from chunks c
            join documents d on d.id = c.document_id
            where c.course_id = %(course_id)s
              and c.tsv @@ websearch_to_tsquery('english', %(query)s)
            order by score desc
            limit %(k)s
            """,
            {
                "query": query,
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