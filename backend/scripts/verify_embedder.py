"""
Verification for embedder.py. Runs entirely locally — no API key needed,
first run downloads the model (~130MB) so it'll pause before printing.

    python scripts/verify_embedder.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.ingestion.embedder import embed_documents, embed_query, EmbeddingError, EXPECTED_DIMENSIONS


def check(label, condition):
    status = "PASS" if condition else "FAIL"
    print(f"[{status}] {label}")
    return condition


def main():
    all_passed = True

    # 1. Normal batch
    texts = [f"This is test chunk number {i} about some course topic." for i in range(5)]
    vectors = embed_documents(texts)
    all_passed &= check(f"Returns one vector per input text (got {len(vectors)}/5)", len(vectors) == 5)
    all_passed &= check(f"Vectors have correct dimension (got {len(vectors[0])})",
                         all(len(v) == EXPECTED_DIMENSIONS for v in vectors))

    # 2. Larger batch — confirms internal batching doesn't choke on volume
    big_batch = [f"chunk {i}" for i in range(120)]
    big_vectors = embed_documents(big_batch)
    all_passed &= check(f"Batch of 120 returns 120 vectors (got {len(big_vectors)})", len(big_vectors) == 120)

    # 3. Empty string rejected before hitting the model
    try:
        embed_documents(["valid text", "   "])
        all_passed &= check("Empty/whitespace text raises EmbeddingError", False)
    except EmbeddingError:
        all_passed &= check("Empty/whitespace text raises EmbeddingError", True)

    # 4. Query vs document actually differ — BGE prepends a different
    #    instruction prefix for queries, so this should NOT be identical.
    #    If this ever fails, the query prefix logic broke silently.
    doc_vec = embed_documents(["What is a binary search tree?"])[0]
    query_vec = embed_query("What is a binary search tree?")
    all_passed &= check("Query embedding produces correct dimension", len(query_vec) == EXPECTED_DIMENSIONS)
    all_passed &= check("Query and document embeddings of same text are NOT identical "
                         "(confirms query prefix is actually being applied)",
                         doc_vec != query_vec)

    print()
    print("ALL CHECKS PASSED" if all_passed else "SOME CHECKS FAILED — do not merge until fixed")
    if not all_passed:
        sys.exit(1)


if __name__ == "__main__":
    main()