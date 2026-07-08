"""Common contract for every text-extraction engine.

Digital engines (pdfplumber, PyMuPDF) implement this today; OCR engines
(Tesseract, cloud OCR, handwriting models) implement the same contract in a
later phase and slot into the pipeline without architectural changes.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class RawPage:
    """One page of extractor output, before merging."""

    page: int
    text: str
    tables: list[list[list[str | None]]] = field(default_factory=list)


class BaseExtractor(ABC):
    """A text-extraction engine that turns a PDF into per-page raw text."""

    #: Short identifier used in metadata (e.g. "pdfplumber", "pymupdf").
    name: str

    @abstractmethod
    def extract(self, pdf_path: str) -> list[RawPage]:
        """Extract every page of the PDF, preserving reading order."""

    @abstractmethod
    def version(self) -> str:
        """Engine version string for extraction metadata."""
