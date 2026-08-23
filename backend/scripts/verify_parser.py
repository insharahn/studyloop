"""
Manual verification for parser.py. Run against a real lecture PDF:

    python scripts/verify_parser.py path/to/some_lecture.pdf
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.ingestion.parser import parse_pdf, PDFParseError


def main():
    if len(sys.argv) != 2:
        print("Usage: python verify_parser.py <path-to-pdf>")
        sys.exit(1)

    path = sys.argv[1]

    try:
        pages = parse_pdf(path)
    except PDFParseError as e:
        print(f"PARSE FAILED (expected behavior for bad input): {e}")
        sys.exit(1)

    scanned = [p for p in pages if p.likely_scanned]

    print(f"Total pages: {len(pages)}")
    print(f"Likely-scanned pages: {len(scanned)}")
    print()

    for p in pages[:3]:
        print(f"--- Page {p.page_number} (scanned={p.likely_scanned}) ---")
        print(p.text[:200])
        print()


if __name__ == "__main__":
    main()