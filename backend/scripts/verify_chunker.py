"""
Verification for chunker.py — synthetic pages covering every edge case,
plus an optional real-PDF pass at the end.

    python scripts/verify_chunker.py
    python scripts/verify_chunker.py path/to/some_lecture.pdf   # optional extra pass
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.ingestion.parser import Page, parse_pdf
from app.ingestion.chunker import chunk_pages, count_tokens


def check(label, condition):
    status = "PASS" if condition else "FAIL"
    print(f"[{status}] {label}")
    return condition


def main():
    all_passed = True

    # 1. Normal multi-paragraph page
    normal_text = "\n\n".join([f"Paragraph {i}. " + ("Lorem ipsum dolor sit amet. " * 15) for i in range(6)])
    page1 = Page(page_number=1, text=normal_text, likely_scanned=False)
    chunks = chunk_pages([page1])
    all_passed &= check(f"Normal page produces multiple chunks (got {len(chunks)})", len(chunks) > 1)
    all_passed &= check("All chunks under ~460 tokens (target+buffer)",
                         all(c.token_count <= 460 for c in chunks))

    # 2. Very short page -> exactly one chunk
    page2 = Page(page_number=2, text="Chapter 3: Recursion", likely_scanned=False)
    chunks2 = chunk_pages([page2])
    all_passed &= check(f"Short page -> exactly 1 chunk (got {len(chunks2)})", len(chunks2) == 1)

    # 3. Empty / whitespace-only page -> zero chunks
    page3 = Page(page_number=3, text="   \n   \n  ", likely_scanned=True)
    chunks3 = chunk_pages([page3])
    all_passed &= check(f"Empty page -> 0 chunks (got {len(chunks3)})", len(chunks3) == 0)

    # 4. Giant unbroken paragraph (no sentence breaks at all)
    giant = "word" * 3000  # one continuous token blob, no spaces/periods
    page4 = Page(page_number=4, text=giant, likely_scanned=False)
    chunks4 = chunk_pages([page4])
    all_passed &= check(f"Giant unbroken text still produces chunks (got {len(chunks4)})", len(chunks4) > 0)
    all_passed &= check("Hard-sliced chunks respect token limit",
                         all(c.token_count <= 460 for c in chunks4))

    # 5. Bullet-only page
    bullets = "\n".join([f"- Point number {i} about some topic in detail here." for i in range(20)])
    page5 = Page(page_number=5, text=bullets, likely_scanned=False)
    chunks5 = chunk_pages([page5])
    all_passed &= check(f"Bullet page chunks without crashing (got {len(chunks5)})", len(chunks5) > 0)

    # 6. Page boundary non-leakage: two distinct pages, check no chunk mixes markers
    pageA = Page(page_number=10, text="AAAA " * 200 + "UNIQUE_MARKER_A", likely_scanned=False)
    pageB = Page(page_number=11, text="UNIQUE_MARKER_B " + "BBBB " * 200, likely_scanned=False)
    mixed = chunk_pages([pageA, pageB])
    leaked = [c for c in mixed if "UNIQUE_MARKER_A" in c.content and "UNIQUE_MARKER_B" in c.content]
    all_passed &= check("No chunk contains content from both pages", len(leaked) == 0)
    all_passed &= check("Every chunk's page_number matches its source page",
                         all(c.page_number in (10, 11) for c in mixed))

    print()
    if all_passed:
        print("ALL SYNTHETIC CHECKS PASSED")
    else:
        print("SOME CHECKS FAILED — do not merge until fixed")
        sys.exit(1)

    # Optional: run against a real PDF if provided
    if len(sys.argv) == 2:
        print(f"\n--- Real PDF pass: {sys.argv[1]} ---")
        pages = parse_pdf(sys.argv[1])
        real_chunks = chunk_pages(pages)
        print(f"Pages: {len(pages)} -> Chunks: {len(real_chunks)}")
        avg = sum(c.token_count for c in real_chunks) / len(real_chunks)
        print(f"Avg tokens/chunk: {avg:.0f}")
        for c in real_chunks[:3]:
            print(f"\n[page {c.page_number}, idx {c.chunk_index}, {c.token_count} tok]")
            print(c.content[:150])


if __name__ == "__main__":
    main()