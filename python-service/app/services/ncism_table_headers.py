"""Curated column headers for the standard NCISM visitation-report schedules.

The assessment PDFs tag each table's header *band* as a separate, concatenated
text block (no per-column boxes, and the label count often disagrees with the
reconstructed body), so headers cannot be aligned to columns automatically.
Because these schedules are fixed by the MSR/MESAR regulations and repeat across
every ASU college report, this module supplies the correct column labels keyed
by the table's (normalised) section title.

Two shapes are supported:

- a flat ``list[str]`` — one header row, rendered as a GFM table header;
- a structured multi-row spec (``STRUCTURED_HEADERS``) — a list of header rows,
  each a list of ``(label, colspan, rowspan)`` cells, for grouped/merged headers
  (e.g. 3.1 Teaching Staff) that GFM cannot express; these render as an HTML
  ``<thead>`` with real ``colspan``/``rowspan``.

Either shape is applied **only when its column count equals the reconstructed
table's column count**; on any mismatch (a template variant, or an unmapped
table) `odl_json_structurer` falls back to the inline-header heuristic / empty
header, so a change in the source layout can never silently misalign data.

Keys are produced by `normalize_title`: the section number/punctuation is
stripped and the text is lower-cased and space-collapsed, e.g.
"2.1 Constructed Area College Details" -> "constructed area college details".
"""

import re

_LEADING_NUMBER_RE = re.compile(r"^[\d.)\s]+")


def normalize_title(text: str) -> str:
    """Normalise a section title to a lookup key (drop number, lowercase)."""
    if not text:
        return ""
    stripped = _LEADING_NUMBER_RE.sub("", text).strip().lower()
    return re.sub(r"\s+", " ", stripped)


#: normalized section title -> ordered column headers. Column counts are
#: calibrated against the reconstructed grid (empty trailing columns that the
#: reconstruction drops are excluded so the lengths match).
NCISM_HEADERS: dict[str, list[str]] = {
    "visitor details": [
        "Sr. No.",
        "Visitor Name",
        "Visitor Id",
    ],
    "constructed area college details": [
        "Section",
        "Required as per MESAR",
        "Actual Availability",
        "Documents Verified",
        "Matches as per requirements as per Visitor's findings",
        "Visitor's Observation",
    ],
    "area of the common departments": [
        "Sr. No.",
        "Common Department Name",
        "Required as per MSR (SCHEDULE-II)",
        "Actual Availability in Sq.mt (Submitted by college)",
        "Shortcoming after 20% relaxation in total",
    ],
    "area of the teaching departments": [
        "Sr. No.",
        "Department Name",
        "Required as per MSR (SCHEDULE-II)",
        "Actual Availability in Sq.mt (Submitted by college)",
        "Shortcoming after 20% relaxation in total",
    ],
    "computer and printer availability in dean and superintendent offices": [
        "Sr. No.",
        "Department",
        "Computer/Printer Availability",
    ],
    "central library": [
        "Details",
        "Required as Per MSR",
        "Available",
        "Shortcomings",
    ],
    "herbal garden (schedule iii)": [
        "Section",
        "Required as per MSR (SCHEDULE-III)",
        "Actual Availability (Submitted by college)",
        "Shortcoming",
        "Visitor's Observation",
        "Reason for shortcoming",
    ],
    "visitors' reasons for college teaching staff absence": [
        "Sr. No.",
        "Name of Absent Teacher",
        "Department Name",
        "Designation",
        "Reason For Absence",
    ],
    "discrepancy of teaching staff": [
        "Sr. No.",
        "Name of Teacher",
        "Teacher Id",
        "Institute State",
        "Name of State Board",
        "Central Registration Number",
    ],
    "non-teaching staff verification": [
        "Sr. No.",
        "Department",
        "Post",
        "Required as per MSR",
        "Existing",
        "Shortcomings",
    ],
    "constructed area of the hospital": [
        "Section",
        "Required as per MSR (Schedule-I)",
        "Actual Availability (Submitted by college)",
        "Shortcomings after 20% relaxation",
    ],
    "functionality of the hospital": [
        "Details regarding the functioning of the Hospital",
        "Required as per MSR",
        "Available",
        "Shortcomings",
        "Visitor's Observation",
    ],
    "hospital staff verification": [
        "Sr. No.",
        "Hospital Staff/Name Of Post",
        "Required as per MSR",
        "Available Hospital Staff (Part II)",
        "Short Comings",
    ],
    "teaching pharmacy": [
        "Section",
        "Actual Availability (Submitted by college)",
        "Visitor's Observation",
    ],
    "student admission capacity details": [
        "Intake capacity",
        "Admitted Students",
    ],
    "observation by the visitors": [
        "Category",
        "Observation",
    ],
    "non-teaching staff(technical and other staff) - observation by the visitors": [
        "Observations During Visitation",
        "No. of occurrences",
    ],
    "hospital staff- observation by the visitors": [
        "Category",
        "Observation",
    ],
    "instruments / equipment in departments (schedule-vii)": [
        "Sr. No.",
        "Department",
        "Category",
        "Observation by Visitor",
    ],
}


#: normalized section title -> multi-row header spec. Each row is a list of
#: ``(label, colspan, rowspan)`` cells; the sum of the first row's colspans is
#: the table's column count. Rendered as an HTML ``<thead>`` (GFM cannot express
#: grouped headers). Column semantics follow the MSR/MESAR Schedule-V layout.
StructuredHeader = list[list[tuple[str, int, int]]]

STRUCTURED_HEADERS: dict[str, StructuredHeader] = {
    # 3.1 Teaching Staff Verification — three header levels over 19 columns.
    "teaching staff verification": [
        [
            ("Sr. No.", 1, 3),
            ("Department", 1, 3),
            ("No. of eligible teachers required as per MSR for UG", 3, 1),
            ("Additional Requirement for PG as per MSR", 2, 1),
            ("No. of eligible teachers", 4, 1),
            ("Excess", 4, 1),
            ("Short Comings", 4, 1),
        ],
        [
            ("Prof. (HF)", 1, 2),
            ("Assoc. Prof. / Reader (HF)", 1, 2),
            ("Asst. Prof. / lecturer (LF)", 1, 2),
            ("Prof. / Assoc. Prof. / Reader (HF)", 1, 2),
            ("Asst. Prof. / lecturer (LF)", 1, 2),
            ("Prof. (HF)", 1, 2),
            ("Asso. Prof. / Reader (HF)", 1, 2),
            ("Asst. Prof. / lecturer (LF)", 1, 2),
            ("Total no. of eligible teach.", 1, 2),
            ("UG", 2, 1),
            ("PG", 2, 1),
            ("UG", 2, 1),
            ("PG", 2, 1),
        ],
        [
            ("HF", 1, 1),
            ("LF", 1, 1),
            ("HF", 1, 1),
            ("LF", 1, 1),
            ("HF", 1, 1),
            ("LF", 1, 1),
            ("HF", 1, 1),
            ("LF", 1, 1),
        ],
    ],
}


def _spec_columns(spec: StructuredHeader) -> int:
    """Total column count of a structured header (sum of the top row's spans)."""
    return sum(colspan for _label, colspan, _rowspan in spec[0]) if spec else 0


def headers_for(title: str, ncols: int) -> list[str] | None:
    """Return flat curated headers for `title` only if they match `ncols`."""
    headers = NCISM_HEADERS.get(normalize_title(title))
    if headers and len(headers) == ncols:
        return headers
    return None


def structured_header_for(title: str, ncols: int) -> StructuredHeader | None:
    """Return a multi-row header spec for `title` only if it matches `ncols`."""
    spec = STRUCTURED_HEADERS.get(normalize_title(title))
    if spec and _spec_columns(spec) == ncols:
        return spec
    return None


def _collect_header_phrases() -> tuple[str, ...]:
    """All known column-label phrases (longest first) for header-band parsing."""
    phrases: set[str] = set()
    for headers in NCISM_HEADERS.values():
        phrases.update(headers)
    for spec in STRUCTURED_HEADERS.values():
        for row in spec:
            for label, _colspan, _rowspan in row:
                phrases.add(label)
    phrases.update(
        {
            "Sr. No.",
            "Sr.No.",
            "Sr No",
            "Department Name",
            "Name of Absent Teacher",
            "Name of Teacher",
            "Teacher Id",
            "Institute State",
            "Name of State Board",
            "Central Registration Number",
            "Designation",
            "Reason For Absence",
            "Required as per MSR",
            "Required as Per MSR",
            "Required as per MSR (Schedule-I)",
            "Actual Availability",
            "Actual Availability (Submitted by college)",
            "Shortcomings",
            "Short Comings",
            "Existing",
            "Post",
            "Department",
            "Computer/Printer Availability",
            "Observations During Visitation",
            "No. of occurrences",
            "Details regarding the functioning of the Hospital",
            "Hospital Staff/Name Of Post",
            "Available Hospital Staff (Part II)",
            "Category",
            "Observation",
        }
    )
    return tuple(sorted(phrases, key=len, reverse=True))


HEADER_PHRASES: tuple[str, ...] = _collect_header_phrases()


def headers_from_band(band: str, ncols: int) -> list[str] | None:
    """Parse a concatenated header band into column labels when count matches."""
    if not band or ncols < 1:
        return None
    text = " ".join(band.split())
    labels: list[str] = []
    pos = 0
    while pos < len(text):
        chunk = text[pos:].lstrip()
        if not chunk:
            break
        matched: str | None = None
        for phrase in HEADER_PHRASES:
            if chunk.lower().startswith(phrase.lower()):
                matched = phrase
                pos += len(text[pos:]) - len(chunk) + len(phrase)
                break
        if not matched:
            return None
        if not labels or labels[-1].lower() != matched.lower():
            labels.append(matched)
    if len(labels) == ncols:
        return labels
    return None
