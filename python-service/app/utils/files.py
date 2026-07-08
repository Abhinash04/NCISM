"""Temporary-file handling for uploaded documents.

The service is stateless: each upload is written to a temp file for the
duration of the pipeline run and always removed afterwards. The suffix must
match the real format — MarkItDown picks its converter by extension.
"""

import os
import tempfile
from contextlib import contextmanager


@contextmanager
def temporary_document(content: bytes, suffix: str = ".pdf"):
    """Writes upload bytes to a temp file with the given suffix and yields its path."""
    fd, path = tempfile.mkstemp(suffix=suffix)
    try:
        with os.fdopen(fd, "wb") as handle:
            handle.write(content)
        yield path
    finally:
        try:
            os.remove(path)
        except OSError:
            pass
