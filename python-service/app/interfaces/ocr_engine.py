"""OCR engine extension point — NOT implemented in Phase 1.

When scanned/handwritten/multilingual support arrives, an engine implements
this interface and the pipeline routes `scanned`/`mixed` classifications to it
instead of short-circuiting with `requires_ocr`.
"""

from abc import abstractmethod

from app.interfaces.base_extractor import BaseExtractor, RawPage


class OCREngine(BaseExtractor):
    """An extractor that rasterizes pages and recognizes text from images.

    Subclasses additionally report recognition confidence and detected
    language so `metadata.ocr` can be populated.
    """

    @abstractmethod
    def extract(self, pdf_path: str) -> list[RawPage]:
        """Run OCR over every page of the PDF."""

    @abstractmethod
    def confidence(self) -> dict[int, float]:
        """Per-page recognition confidence for the last extraction."""

    @abstractmethod
    def detected_languages(self) -> list[str]:
        """Languages detected in the last extraction."""
