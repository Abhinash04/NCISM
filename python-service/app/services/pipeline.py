"""Pipeline orchestrator.

Two stage lists share the ordered-stage architecture:

PDF:    Classification -> pdfplumber -> PyMuPDF -> Normalization -> Merge
        -> MarkItDown -> Structurer -> OpenDataLoader -> Validation -> Assemble
Office: MarkItDown -> Assemble          (docx / xlsx — MarkItDown is native)

Stages are (name, callable) pairs on ordered lists; future capabilities
(OCR engines, the rule engine) are inserted by adding a stage, not by
rewriting the runner. A stage may short-circuit the run (Phase 1: scanned
PDFs stop after classification with `requires_ocr`).

Every stage's output is preserved as an ordered `StageArtifact`; no
intermediate output is ever overwritten. The Validation stage selects the
Final Structured Markdown from the OpenDataLoader / structurer / MarkItDown
candidates and records why.
"""

import logging

from app.interfaces import rule_engine_hook
from app.schemas.extraction import (
    ExtractionMetadata,
    ExtractionResult,
    PageExtraction,
    StageArtifact,
)
from app.services import (
    markitdown_converter,
    normalizer,
    opendataloader_extractor,
    section_gap_fill,
    structurer,
    validator,
)
from app.services.classifier import classify
from app.services.merger import merge
from app.services.pdfplumber_extractor import PdfplumberExtractor
from app.services.pymupdf_extractor import PymupdfExtractor
from app.utils.stats import char_count, stage_timer, word_count

logger = logging.getLogger(__name__)

PDF_EXTRACTION_METHOD = "pdfplumber+pymupdf"
OFFICE_EXTRACTION_METHOD = "markitdown"

_pdfplumber = PdfplumberExtractor()
_pymupdf = PymupdfExtractor()


def _engine_versions() -> dict[str, str]:
    return {
        _pdfplumber.name: _pdfplumber.version(),
        _pymupdf.name: _pymupdf.version(),
        "markitdown": markitdown_converter.version(),
        "opendataloader-pdf": opendataloader_extractor.version(),
    }


def _detect_language(text: str) -> str:
    """Placeholder heuristic until multilingual support lands in Phase 2."""
    if not text.strip():
        return "unknown"
    ascii_ratio = sum(1 for ch in text if ord(ch) < 128) / len(text)
    return "en" if ascii_ratio > 0.8 else "unknown"


def _join_pages(pages) -> str:
    """Joins per-page text with page markers for readable artifacts."""
    return "\n\n".join(f"<!-- page {p.page} -->\n{p.text}" for p in pages)


# ---------------------------------------------------------------------------
# Stages
# ---------------------------------------------------------------------------

def _stage_classification(ctx: dict) -> None:
    ctx["classification"] = classify(ctx["path"])
    if ctx["classification"].pdf_type == "scanned":
        ctx["short_circuit"] = "requires_ocr"


def _stage_pdfplumber(ctx: dict) -> None:
    ctx["plumber_pages"] = _pdfplumber.extract(ctx["path"])


def _stage_pymupdf(ctx: dict) -> None:
    ctx["mupdf_pages"] = _pymupdf.extract(ctx["path"])


def _stage_normalize(ctx: dict) -> None:
    ctx["plumber_normalized"] = normalizer.normalize_pages(ctx["plumber_pages"])
    ctx["mupdf_normalized"] = normalizer.normalize_pages(ctx["mupdf_pages"])


def _stage_merge(ctx: dict) -> None:
    ctx["merged"] = merge(ctx["plumber_normalized"], ctx["mupdf_normalized"])


def _stage_markitdown(ctx: dict) -> None:
    ctx["markitdown_output"] = markitdown_converter.convert(ctx["path"])


def _stage_structurer(ctx: dict) -> None:
    """Builds proper structured markdown (headings + valid GFM tables) for
    PDFs. Produces a validation candidate; failures are recorded but do not
    stop the pipeline (OpenDataLoader / MarkItDown remain as candidates)."""
    try:
        ctx["structurer_output"] = structurer.build(ctx["path"])
    except Exception as exc:
        logger.exception("Structurer stage failed")
        ctx["structurer_output"] = ""
        ctx["structurer_error"] = str(exc)


def _stage_opendataloader(ctx: dict) -> None:
    # Merged raw text guides per-document table-strategy selection (struct tree
    # for well-tagged PDFs, cluster fallback for poorly-tagged ones).
    ctx["odl"] = opendataloader_extractor.extract(
        ctx["path"], ctx["merged"].raw_text
    )


def _stage_validate(ctx: dict) -> None:
    odl_md = ctx["odl"].markdown
    filled_md, spliced = section_gap_fill.fill(
        odl_md, ctx.get("structurer_output", "")
    )
    ctx["odl"].markdown = filled_md
    ctx["sections_spliced"] = spliced

    outcome = validator.select(
        {
            "opendataloader": filled_md,
            "structurer": ctx.get("structurer_output", ""),
            "markitdown": ctx["markitdown_output"],
        },
        ctx["merged"].raw_text,
    )
    if spliced:
        outcome.report["sections_spliced"] = spliced
        outcome.report["gap_fill_donor"] = "structurer"
    ctx["validation"] = outcome
    ctx["markdown"] = outcome.markdown
    ctx["structured_by"] = outcome.structured_by


#: Ordered pipelines. Future stages (OCR, rule engine) are appended/inserted here.
PDF_STAGES = [
    ("classification", _stage_classification),
    ("pdfplumber", _stage_pdfplumber),
    ("pymupdf", _stage_pymupdf),
    ("normalize", _stage_normalize),
    ("merge", _stage_merge),
    ("markitdown", _stage_markitdown),
    ("structurer", _stage_structurer),
    ("opendataloader", _stage_opendataloader),
    ("validate", _stage_validate),
]

OFFICE_STAGES = [
    ("markitdown", _stage_markitdown),
]


# ---------------------------------------------------------------------------
# Artifact assembly (every stage output preserved, in order)
# ---------------------------------------------------------------------------

def _pdf_artifacts(ctx: dict) -> list[StageArtifact]:
    timings = ctx["timings"]
    classification = ctx["classification"]
    plumber = ctx["plumber_pages"]
    mupdf = ctx["mupdf_pages"]
    plumber_norm = ctx["plumber_normalized"]
    merged = ctx["merged"]
    odl = ctx["odl"]
    validation = ctx["validation"]

    plumber_text = _join_pages(plumber)
    mupdf_text = _join_pages(mupdf)
    normalized_text = _join_pages(plumber_norm)

    artifacts: list[StageArtifact] = [
        StageArtifact(
            stage="classification",
            engine="pymupdf",
            format="classification",
            data={
                "pdfType": classification.pdf_type,
                "totalPages": classification.total_pages,
                "textPages": classification.text_pages,
            },
            timingMs=timings.get("classification"),
        ),
        StageArtifact(
            stage="pdfplumber",
            engine="pdfplumber",
            format="text",
            content=plumber_text,
            charCount=char_count(plumber_text),
            wordCount=word_count(plumber_text),
            tableCount=sum(len(p.tables) for p in plumber),
            timingMs=timings.get("pdfplumber"),
        ),
        StageArtifact(
            stage="pymupdf",
            engine="pymupdf",
            format="text",
            content=mupdf_text,
            charCount=char_count(mupdf_text),
            wordCount=word_count(mupdf_text),
            timingMs=timings.get("pymupdf"),
        ),
        StageArtifact(
            stage="normalized",
            engine="normalizer",
            format="text",
            content=normalized_text,
            charCount=char_count(normalized_text),
            wordCount=word_count(normalized_text),
            data={
                "pdfplumber": [
                    {"page": p.page, "characters": char_count(p.text)}
                    for p in plumber_norm
                ],
                "pymupdf": [
                    {"page": p.page, "characters": char_count(p.text)}
                    for p in ctx["mupdf_normalized"]
                ],
            },
            timingMs=timings.get("normalize"),
        ),
        StageArtifact(
            stage="merged",
            engine=PDF_EXTRACTION_METHOD,
            format="text",
            content=merged.raw_text,
            charCount=char_count(merged.raw_text),
            wordCount=word_count(merged.raw_text),
            tableCount=sum(p.table_count for p in merged.pages),
            data=[
                {
                    "page": p.page,
                    "engine": p.engine,
                    "characters": p.char_count,
                    "words": p.word_count,
                    "tables": p.table_count,
                }
                for p in merged.pages
            ],
            timingMs=timings.get("merge"),
        ),
        StageArtifact(
            stage="markitdown",
            engine="markitdown",
            format="markdown",
            content=ctx["markitdown_output"],
            charCount=char_count(ctx["markitdown_output"]),
            timingMs=timings.get("markitdown"),
        ),
        StageArtifact(
            stage="structurer",
            engine="structurer",
            status="failed" if ctx.get("structurer_error") else "produced",
            format="markdown",
            content=ctx.get("structurer_output", ""),
            charCount=char_count(ctx.get("structurer_output", "")),
            error=ctx.get("structurer_error"),
            timingMs=timings.get("structurer"),
        ),
        StageArtifact(
            stage="opendataloader",
            engine=f"opendataloader-pdf ({odl.mode})",
            status="produced" if odl.produced else "failed",
            format="markdown",
            content=odl.markdown,
            data=odl.elements,  # element JSON w/ bounding boxes (Phase-2 substrate)
            charCount=char_count(odl.markdown),
            error=odl.error,
            timingMs=timings.get("opendataloader"),
        ),
        StageArtifact(
            stage="final",
            engine=validation.structured_by,
            format="markdown",
            content=ctx["markdown"],
            charCount=char_count(ctx["markdown"]),
            data=validation.report,
            timingMs=timings.get("validate"),
        ),
    ]
    return artifacts


# ---------------------------------------------------------------------------
# Result assembly
# ---------------------------------------------------------------------------

def _requires_ocr_result(ctx: dict) -> ExtractionResult:
    classification = ctx["classification"]
    artifacts = [
        StageArtifact(
            stage="classification",
            engine="pymupdf",
            format="classification",
            data={
                "pdfType": classification.pdf_type,
                "totalPages": classification.total_pages,
                "textPages": classification.text_pages,
            },
            timingMs=ctx["timings"].get("classification"),
        )
    ]
    return ExtractionResult(
        rawText="",
        markdown="",
        pageWiseExtraction=[],
        processingTime=sum(ctx["timings"].values()),
        metadata=ExtractionMetadata(
            extractionMethod="none",
            pdfType=classification.pdf_type,
            pages=classification.total_pages,
            characters=0,
            words=0,
            language="unknown",
            stageTimings=ctx["timings"],
            engines=_engine_versions(),
        ),
        artifacts=artifacts,
        status="requires_ocr",
        error=(
            "This PDF has no extractable text layer. OCR engines are a "
            "Phase 2 capability (see app/interfaces/ocr_engine.py)."
        ),
    )


def _finalize(metadata: ExtractionMetadata, raw_text: str, markdown: str,
              pages: list[PageExtraction], artifacts: list[StageArtifact],
              timings: dict) -> ExtractionResult:
    # Rule-engine extension point (no-op in Phase 1). The OpenDataLoader element
    # JSON is available in the artifacts for a future rule engine to consume.
    metadata.parameters = rule_engine_hook.post_markdown(
        markdown, metadata.model_dump()
    )
    return ExtractionResult(
        rawText=raw_text,
        markdown=markdown,
        pageWiseExtraction=pages,
        processingTime=sum(timings.values()),
        metadata=metadata,
        artifacts=artifacts,
        status="completed",
    )


def _run_stages(stages, ctx: dict) -> bool:
    """Runs the stage list; returns False when a stage short-circuited."""
    for stage_name, stage in stages:
        with stage_timer(ctx["timings"], stage_name):
            stage(ctx)
        if ctx.get("short_circuit"):
            return False
    return True


def _run_pdf(ctx: dict) -> ExtractionResult:
    if not _run_stages(PDF_STAGES, ctx):
        return _requires_ocr_result(ctx)

    merged = ctx["merged"]
    validation = ctx["validation"]
    metadata = ExtractionMetadata(
        extractionMethod=PDF_EXTRACTION_METHOD,
        pdfType=ctx["classification"].pdf_type,
        pages=ctx["classification"].total_pages,
        characters=char_count(merged.raw_text),
        words=word_count(merged.raw_text),
        language=_detect_language(merged.raw_text),
        structuredBy=ctx["structured_by"],
        validation=validation.report,
        stageTimings=ctx["timings"],
        engines=_engine_versions(),
    )
    pages = [
        PageExtraction(
            page=page.page,
            text=page.text,
            charCount=page.char_count,
            wordCount=page.word_count,
            tableCount=page.table_count,
            engine=page.engine,
        )
        for page in merged.pages
    ]
    return _finalize(
        metadata, merged.raw_text, ctx["markdown"], pages,
        _pdf_artifacts(ctx), ctx["timings"],
    )


def _run_office(ctx: dict, file_type: str) -> ExtractionResult:
    _run_stages(OFFICE_STAGES, ctx)
    markdown = ctx["markitdown_output"]

    metadata = ExtractionMetadata(
        extractionMethod=OFFICE_EXTRACTION_METHOD,
        pdfType=file_type,
        pages=None,  # Office documents are not paginated at extraction time
        characters=char_count(markdown),
        words=word_count(markdown),
        language=_detect_language(markdown),
        structuredBy="markitdown",
        stageTimings=ctx["timings"],
        engines={"markitdown": markitdown_converter.version()},
    )
    artifacts = [
        StageArtifact(
            stage="markitdown",
            engine="markitdown",
            format="markdown",
            content=markdown,
            charCount=char_count(markdown),
            timingMs=ctx["timings"].get("markitdown"),
        ),
        StageArtifact(
            stage="final",
            engine="markitdown",
            format="markdown",
            content=markdown,
            charCount=char_count(markdown),
        ),
    ]
    # MarkItDown is both raw and structured source for native Office formats.
    return _finalize(metadata, markdown, markdown, [], artifacts, ctx["timings"])


def run(path: str, file_type: str = "pdf") -> ExtractionResult:
    ctx: dict = {"path": path, "timings": {}}
    if file_type == "pdf":
        return _run_pdf(ctx)
    return _run_office(ctx, file_type)
