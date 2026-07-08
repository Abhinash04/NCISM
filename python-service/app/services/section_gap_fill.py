"""Fill numbered-section gaps in OpenDataLoader markdown from a donor candidate.

OpenDataLoader's struct_tree mode can omit entire numbered sections while still
retaining most of the document text (high character coverage). This module
detects section IDs present in the structurer output but missing from the ODL
markdown and splices the donor blocks back in reading order before validation.
"""

from __future__ import annotations

import re

from app.services.structurer import classify_section_heading

_SECTION_HEADING_RE = re.compile(
    r"^(#{2,4})\s+(\d+(?:\.\d+)*)\.?\s+(.+)$",
    re.M,
)


def _normalize_section_id(section_id: str) -> str:
    return section_id.rstrip(".")


def _section_sort_key(section_id: str) -> tuple[int, ...]:
    return tuple(int(part) for part in section_id.split("."))


def _find_section_line(lines: list[str], section_id: str) -> int | None:
    for index, line in enumerate(lines):
        match = _SECTION_HEADING_RE.match(line)
        if match and _normalize_section_id(match.group(2)) == section_id:
            return index
        classified = classify_section_heading(line.strip())
        if classified and classified[0].rstrip(".)") == section_id:
            return index
    return None


def section_ids(markdown: str) -> set[str]:
    """Return numbered section IDs found as markdown or plain headings."""
    ids: set[str] = set()
    for match in _SECTION_HEADING_RE.finditer(markdown or ""):
        ids.add(_normalize_section_id(match.group(2)))
    for line in (markdown or "").splitlines():
        classified = classify_section_heading(line.strip())
        if classified:
            ids.add(classified[0].rstrip(".)"))
    return ids


def _content_already_present(base_md: str, block: str) -> bool:
    """True when distinctive lines from `block` already appear in `base_md`."""
    base = base_md or ""
    body_lines = [
        line.strip()
        for line in block.splitlines()[1:]
        if line.strip() and not line.startswith("<!--")
    ]
    for line in body_lines[:6]:
        if len(line) > 24 and line in base:
            return True
    return False


def missing_sections(base_md: str, donor_md: str) -> list[str]:
    """Section IDs present in `donor_md` but absent from `base_md`."""
    candidate = section_ids(donor_md) - section_ids(base_md)
    verified: list[str] = []
    for section_id in sorted(candidate, key=_section_sort_key):
        block = extract_section_block(donor_md, section_id)
        if not block:
            continue
        title = block.splitlines()[0].strip().lstrip("#").strip()
        if title and title in (base_md or ""):
            continue
        if _content_already_present(base_md, block):
            continue
        verified.append(section_id)
    return verified


def _section_end(lines: list[str], start: int, section_id: str) -> int:
    start_parts = _section_sort_key(section_id)
    for index in range(start + 1, len(lines)):
        match = _SECTION_HEADING_RE.match(lines[index])
        if match:
            other_id = _normalize_section_id(match.group(2))
            if _section_sort_key(other_id) > start_parts:
                return index
            continue
        classified = classify_section_heading(lines[index].strip())
        if classified:
            other_id = classified[0].rstrip(".)")
            if _section_sort_key(other_id) > start_parts:
                return index
    return len(lines)


def extract_section_block(donor_md: str, section_id: str) -> str:
    """Slice one numbered section block out of donor markdown."""
    lines = (donor_md or "").splitlines()
    start = _find_section_line(lines, section_id)
    if start is None:
        return ""
    end = _section_end(lines, start, section_id)
    return "\n".join(lines[start:end]).strip()


def _predecessor_id(section_id: str) -> str | None:
    parts = [int(part) for part in section_id.split(".")]
    if len(parts) > 1:
        parts[-1] -= 1
        if parts[-1] < 1:
            return None
        return ".".join(str(part) for part in parts)
    if parts[0] > 1:
        return str(parts[0] - 1)
    return None


def _insert_index(lines: list[str], section_id: str) -> int:
    """Line index where a missing section should be inserted."""
    predecessor = _predecessor_id(section_id)
    if predecessor:
        pred_start = _find_section_line(lines, predecessor)
        if pred_start is not None:
            return _section_end(lines, pred_start, predecessor)

    target_parts = _section_sort_key(section_id)
    for index, line in enumerate(lines):
        match = _SECTION_HEADING_RE.match(line)
        if match and _section_sort_key(_normalize_section_id(match.group(2))) > target_parts:
            return index
        classified = classify_section_heading(line.strip())
        if classified and _section_sort_key(classified[0].rstrip(".)")) > target_parts:
            return index
    return len(lines)


def splice_sections(base_md: str, donor_md: str, missing_ids: list[str]) -> str:
    """Insert missing donor section blocks into `base_md` in numeric order."""
    md = base_md or ""
    for section_id in missing_ids:
        block = extract_section_block(donor_md, section_id)
        if not block:
            continue
        lines = md.splitlines()
        index = _insert_index(lines, section_id)
        new_lines = lines[:index] + ["", block, ""] + lines[index:]
        md = "\n".join(new_lines)
    return md


def fill(base_md: str, donor_md: str) -> tuple[str, list[str]]:
    """Return gap-filled markdown and the list of spliced section IDs."""
    missing = missing_sections(base_md, donor_md)
    if not missing:
        return base_md, []
    return splice_sections(base_md, donor_md, missing), missing
