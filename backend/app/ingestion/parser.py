"""
PDF parsing — extracts page-aware text from an uploaded document.

Page numbers are 1-indexed throughout this module and everything downstream,
since they're shown to users as citations ("Lecture 4, p.12"). PyMuPDF itself
is 0-indexed; the conversion happens once, here.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path

import fitz  # PyMuPDF

logger = logging.getLogger(__name__)

MIN_CHARS_PER_PAGE = 20  # below this, a page is flagged as likely-scanned


class PDFParseError(Exception):
    """Raised when a PDF cannot be opened or read at all."""


@dataclass
class Page:
    page_number: int      # 1-indexed
    text: str
    likely_scanned: bool  # True if extracted text was suspiciously short


def parse_pdf(path: str | Path) -> list[Page]:
    """
    Extract text from every page of a PDF.

    Raises:
        PDFParseError: if the file can't be opened (corrupted, encrypted
            with no password, not actually a PDF, etc). Callers should
            catch this and mark the document as failed rather than let
            it propagate — one bad upload shouldn't kill the ingestion
            worker.

    Never raises for individual bad pages — those are flagged via
    `likely_scanned` and returned with whatever text was extracted
    (often empty), so the caller can decide what to do (skip them,
    warn the user, run OCR later, etc).
    """
    path = Path(path)

    if not path.exists():
        raise PDFParseError(f"File not found: {path}")

    try:
        doc = fitz.open(path)
    except Exception as e:
        raise PDFParseError(f"Could not open PDF {path.name}: {e}") from e

    if not doc.is_pdf:
        doc.close()
        raise PDFParseError(
            f"{path.name} is not a PDF (PyMuPDF opened it as "
            f"{doc.metadata.get('format', 'an unknown format')})"
        )

    if doc.is_encrypted:
        # Try an empty password first — some "encrypted" PDFs just have
        # restricted permissions (no-print etc) with no actual open password.
        if not doc.authenticate(""):
            doc.close()
            raise PDFParseError(f"PDF {path.name} is password-protected")

    if doc.page_count == 0:
        doc.close()
        raise PDFParseError(f"PDF {path.name} has no pages")

    pages: list[Page] = []
    scanned_count = 0

    for i in range(doc.page_count):
        page_number = i + 1  # 1-indexed for humans
        try:
            raw_text = doc[i].get_text("text")
        except Exception as e:
            # A single corrupt page shouldn't kill the whole document.
            logger.warning("Failed to extract text on page %d of %s: %s",
                            page_number, path.name, e)
            raw_text = ""

        text = _clean_text(raw_text)
        likely_scanned = len(text) < MIN_CHARS_PER_PAGE

        if likely_scanned:
            scanned_count += 1

        pages.append(Page(
            page_number=page_number,
            text=text,
            likely_scanned=likely_scanned,
        ))

    doc.close()

    if scanned_count == len(pages):
        # Every single page looks scanned — this is very likely a pure
        # image-based PDF (photographed notes, scanned handout). We still
        # return the pages rather than raising, so the caller can decide
        # to surface a clear "this looks scanned, OCR isn't supported yet"
        # message to the user instead of a generic failure.
        logger.warning("All %d pages of %s appear to be scanned/image-based",
                        len(pages), path.name)

    return pages


def _clean_text(text: str) -> str:
    """Normalize whitespace without destroying paragraph structure."""
    lines = [line.strip() for line in text.splitlines()]
    lines = [line for line in lines if line]  # drop empty lines
    return "\n".join(lines)