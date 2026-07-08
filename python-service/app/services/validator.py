"""Stage — Validation and Final Structured Markdown selection.

The pipeline produces up to three structured-markdown candidates for a PDF:
OpenDataLoader (preferred), the domain-tuned structurer, and MarkItDown. This
stage validates each and selects the Final Structured Markdown by precedence
`opendataloader -> structurer -> markitdown`, preferring the highest-precedence
candidate that passes basic quality checks (non-empty, carries structure, and
retains a sane share of the raw text). It emits a per-candidate report so the
decision is fully traceable in the artifacts inspector.

This is also the natural insertion point for future, rule-aware validation
(e.g. confirming required NCISM parameters are present) — Phase 1 keeps it to
structural checks only.
"""

import re
from dataclasses import dataclass, field

from app.services.section_gap_fill import section_ids

_HEADING_RE = re.compile(r"^#{1,6}\s+\S", re.MULTILINE)
#: A GFM table has exactly one header-separator row (e.g. `| --- | --- |`).
_TABLE_SEP_RE = re.compile(r"^\|[\s:|-]*-[\s:|-]*\|\s*$", re.MULTILINE)

#: Candidate precedence — highest fidelity first.
PRECEDENCE = ("opendataloader", "structurer", "markitdown")

#: A candidate must retain at least this share of the raw-text length to be
#: trusted (guards against a conversion that silently dropped most content).
MIN_LENGTH_RATIO = 0.2


@dataclass
class ValidationOutcome:
    markdown: str
    structured_by: str  # engine that produced the Final Structured Markdown
    report: dict = field(default_factory=dict)


def _count_headings(markdown: str) -> int:
    return len(_HEADING_RE.findall(markdown))


def _count_tables(markdown: str) -> int:
    return len(_TABLE_SEP_RE.findall(markdown))


def _evaluate(engine: str, markdown: str, raw_len: int, raw_text: str) -> dict:
    text = markdown or ""
    chars = len(text)
    headings = _count_headings(text)
    tables = _count_tables(text)
    has_structure = headings > 0 or tables > 0
    length_ok = raw_len == 0 or chars >= raw_len * MIN_LENGTH_RATIO
    
    # Check completeness of section extraction
    expected_sections = section_ids(raw_text)
    actual_sections = section_ids(text)
    completeness_ok = True
    if len(expected_sections) > 0:
        found_ratio = len(actual_sections.intersection(expected_sections)) / len(expected_sections)
        completeness_ok = found_ratio >= 0.70

    valid = chars > 0 and has_structure and length_ok and completeness_ok

    if chars == 0:
        reason = "empty output"
    elif not length_ok:
        reason = "too short relative to raw text"
    elif not has_structure:
        reason = "no headings or tables detected"
    elif not completeness_ok:
        reason = "missing too many sections from original text"
    else:
        reason = "passed structural checks"

    return {
        "engine": engine,
        "available": chars > 0,
        "characters": chars,
        "headings": headings,
        "tables": tables,
        "valid": valid,
        "chosen": False,
        "reason": reason,
    }


def select(candidates: dict[str, str], raw_text: str) -> ValidationOutcome:
    """Pick the Final Structured Markdown from the available candidates.

    `candidates` maps engine name -> markdown (missing/empty engines allowed).
    """
    raw_len = len(raw_text or "")
    reports = [
        _evaluate(engine, candidates.get(engine, ""), raw_len, raw_text)
        for engine in PRECEDENCE
    ]
    by_engine = {r["engine"]: r for r in reports}

    # First candidate (in precedence order) that passes all checks.
    chosen = next((r for r in reports if r["valid"]), None)
    if chosen is not None:
        decision = "passed structural checks"
    else:
        # Best-effort fallback: highest-precedence non-empty candidate.
        chosen = next((r for r in reports if r["available"]), None)
        decision = "best-effort fallback (no candidate passed all checks)"

    if chosen is None:
        return ValidationOutcome(
            markdown="",
            structured_by="none",
            report={
                "chosen": "none",
                "reason": "no structured markdown candidate produced output",
                "candidates": reports,
            },
        )

    by_engine[chosen["engine"]]["chosen"] = True
    return ValidationOutcome(
        markdown=candidates.get(chosen["engine"], ""),
        structured_by=chosen["engine"],
        report={
            "chosen": chosen["engine"],
            "reason": decision,
            "candidates": reports,
        },
    )
