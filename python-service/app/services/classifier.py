"""Stage 1 — Document classification.

Decides whether a PDF is digital, scanned or mixed by measuring how many
pages carry an extractable text layer. Scanned documents are routed to the
(future) OCR engines; in Phase 1 they short-circuit as `requires_ocr`.
"""

from dataclasses import dataclass

import pymupdf

#: A page with fewer extractable characters than this is treated as image-only.
MIN_TEXT_CHARS_PER_PAGE = 25

#: At or above this ratio of text pages, the document counts as digital.
DIGITAL_RATIO = 0.8

#: Below this ratio of text pages, the document counts as scanned.
SCANNED_RATIO = 0.1


@dataclass
class Classification:
    pdf_type: str  # digital | scanned | mixed
    total_pages: int
    text_pages: int


def classify(pdf_path: str) -> Classification:
    with pymupdf.open(pdf_path) as doc:
        total_pages = doc.page_count
        text_pages = sum(
            1
            for page in doc
            if len(page.get_text("text").strip()) >= MIN_TEXT_CHARS_PER_PAGE
        )

    ratio = text_pages / total_pages if total_pages else 0
    if ratio >= DIGITAL_RATIO:
        pdf_type = "digital"
    elif ratio < SCANNED_RATIO:
        pdf_type = "scanned"
    else:
        pdf_type = "mixed"

    return Classification(pdf_type=pdf_type, total_pages=total_pages, text_pages=text_pages)
