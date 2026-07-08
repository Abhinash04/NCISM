"""Response schemas for the extraction pipeline.

Field names are camelCase on the wire because the frontend persists the
payload verbatim into its Dexie `extractions` table.
"""

from typing import Optional

from pydantic import BaseModel, Field


class PageExtraction(BaseModel):
    page: int
    text: str
    charCount: int
    wordCount: int
    tableCount: int
    engine: str = Field(description="Engine whose text won the merge for this page")


class ExtractionMetadata(BaseModel):
    extractionMethod: str
    pdfType: str  # digital | scanned | mixed | docx | xlsx
    pages: Optional[int] = None  # None for Office formats (not paginated)
    characters: int
    words: int
    language: str
    # opendataloader | structurer | markitdown — engine that produced the
    # Final Structured Markdown, chosen by the validation stage.
    structuredBy: Optional[str] = None
    stageTimings: dict[str, float] = Field(default_factory=dict)
    engines: dict[str, str] = Field(default_factory=dict)
    # Validation-stage report: which structured-markdown candidate won and why.
    validation: Optional[dict] = None
    # Reserved extension slots — populated by future phases, never removed.
    ocr: Optional[dict] = None          # future OCR engine output
    parameters: Optional[dict] = None   # future rule-engine parameter extraction


class StageArtifact(BaseModel):
    """One preserved pipeline-stage output.

    Every stage records its result here so no intermediate output is ever
    overwritten. Content-bearing stages populate `content` (text/markdown) or
    `data` (structured: classification result, OpenDataLoader element JSON,
    per-page stats). Stages that could not run are kept with a `skipped` /
    `failed` status so the pipeline history stays complete and traceable.
    """

    stage: str  # classification | pdfplumber | pymupdf | normalized | merged
    #             | markitdown | structurer | opendataloader | final
    engine: Optional[str] = None
    status: str = "produced"  # produced | skipped | failed
    format: str  # classification | text | markdown | json
    content: Optional[str] = None  # text / markdown payloads
    data: Optional[object] = None  # structured payloads (dict or list)
    charCount: Optional[int] = None
    wordCount: Optional[int] = None
    tableCount: Optional[int] = None
    timingMs: Optional[float] = None
    error: Optional[str] = None


class ExtractionResult(BaseModel):
    rawText: str
    markdown: str  # the Final Structured Markdown (== the `final` artifact)
    pageWiseExtraction: list[PageExtraction]
    processingTime: float  # milliseconds, whole pipeline
    metadata: ExtractionMetadata
    # Ordered, complete record of every stage output (never overwritten).
    artifacts: list[StageArtifact] = Field(default_factory=list)
    status: str  # completed | failed | requires_ocr
    error: Optional[str] = None
