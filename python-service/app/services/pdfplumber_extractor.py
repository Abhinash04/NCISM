"""Stage 2a — pdfplumber extraction: per-page text plus table capture."""

import pdfplumber

from app.interfaces.base_extractor import BaseExtractor, RawPage


class PdfplumberExtractor(BaseExtractor):
    name = "pdfplumber"

    def extract(self, pdf_path: str) -> list[RawPage]:
        pages: list[RawPage] = []
        with pdfplumber.open(pdf_path) as pdf:
            for index, page in enumerate(pdf.pages, start=1):
                text = page.extract_text() or ""
                tables = page.extract_tables() or []
                pages.append(RawPage(page=index, text=text, tables=tables))
        return pages

    def version(self) -> str:
        return pdfplumber.__version__
