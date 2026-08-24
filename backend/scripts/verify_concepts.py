"""
Verification for concepts.py. Runs build_concepts on the persistent test
course (must already have ingested documents -- run verify_dense.py
first if needed), then checks the result for structural correctness.

    python scripts/verify_concepts.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db import pool
from app.generation.concepts import build_concepts
from scripts.verify_dense import get_or_create_test_course


def check(label, condition):
    print(f"[{'PASS' if condition else 'FAIL'}] {label}")
    return condition


def has_cycle(edges: list[tuple[str, str]]) -> bool:
    graph: dict[str, set[str]] = {}
    for prereq, concept in edges:
        graph.setdefault(prereq, set()).add(concept)
        graph.setdefault(concept, set())

    WHITE, GRAY, BLACK = 0, 1, 2
    color = {node: WHITE for node in graph}

    def visit(node):
        color[node] = GRAY
        for neighbor in graph[node]:
            if color[neighbor] == GRAY:
                return True
            if color[neighbor] == WHITE and visit(neighbor):
                return True
        color[node] = BLACK
        return False

    return any(color[n] == WHITE and visit(n) for n in graph)


def main():
    course_id = get_or_create_test_course()

    result = build_concepts(course_id)
    print(f"Result: {result}\n")

    with pool.connection() as conn:
        concept_rows = conn.execute(
            "select id, name, source_page from concepts where course_id = %s",
            (course_id,),
        ).fetchall()
        edge_rows = conn.execute(
            """
            select c1.name, c2.name
            from concept_edges e
            join concepts c1 on c1.id = e.prerequisite_id
            join concepts c2 on c2.id = e.concept_id
            where c1.course_id = %s
            """,
            (course_id,),
        ).fetchall()

    names = [r[1] for r in concept_rows]
    lower_names = [n.lower() for n in names]
    edges = [(r[0], r[1]) for r in edge_rows]

    print("Concepts extracted:")
    for n in names:
        print(f"  - {n}")
    print(f"\nEdges: {edges}\n")

    all_passed = True
    all_passed &= check(f"At least a few concepts extracted (got {len(names)})", len(names) >= 3)
    all_passed &= check("No case-insensitive duplicate names",
                         len(lower_names) == len(set(lower_names)))
    all_passed &= check("All concepts have a real source page (>=1)",
                         all(r[2] >= 1 for r in concept_rows))
    all_passed &= check("Concept graph has no cycles", not has_cycle(edges))

    print()
    print("ALL CHECKS PASSED" if all_passed else "SOME CHECKS FAILED")


if __name__ == "__main__":
    main()