"""Stage — Normalization.

Runs between the raw digital extractions (pdfplumber / PyMuPDF) and the merge.
Its job is conservative, structure-preserving cleanup so that the merge and the
downstream markdown engines see consistent text regardless of which extractor
produced it:

- Unicode NFC normalization (compose accents, canonicalize forms),
- removal of non-printable control characters (keeping tabs / newlines),
- normalization of line endings and trimming of trailing per-line whitespace,
- collapsing of runs of blank lines,
- cautious de-hyphenation of words split across a line break ("inter-\nnational"
  -> "international"), only when both fragments are alphabetic.

It is deliberately lossless-leaning: it never drops content lines (header /
footer stripping is left to the higher-fidelity layout engines) so the
normalized artifact remains a faithful, cleaned view of each engine's output.
"""

import re
import unicodedata

from app.interfaces.base_extractor import RawPage

_CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_TRAILING_WS = re.compile(r"[ \t]+(?=\n)")
_MULTI_BLANK = re.compile(r"\n{3,}")
# A word split by a hard hyphen at end of line: "inter-\nnational".
_HYPHEN_BREAK = re.compile(r"(?<=[A-Za-z])-\n(?=[a-z])")


def normalize_text(text: str) -> str:
    if not text:
        return ""
    text = unicodedata.normalize("NFC", text)
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = _CONTROL_CHARS.sub("", text)
    text = _HYPHEN_BREAK.sub("", text)
    text = _TRAILING_WS.sub("", text)
    text = _MULTI_BLANK.sub("\n\n", text)
    return text.strip("\n")


def normalize_pages(pages: list[RawPage]) -> list[RawPage]:
    """Returns normalized copies of the raw pages, tables carried through."""
    return [
        RawPage(page=page.page, text=normalize_text(page.text), tables=page.tables)
        for page in pages
    ]
