"""Rule-engine extension point — intentionally a no-op in Phase 1.

The future flow is:

    Structured Markdown -> Rule Engine -> Parameter Extraction -> Assessment Generator

`post_markdown` is invoked by the pipeline after the MarkItDown stage. A later
phase replaces the body with real parameter extraction and returns a dict that
the pipeline stores in `metadata.parameters`. No business rules live here.
"""

from typing import Optional


def post_markdown(markdown: str, metadata: dict) -> Optional[dict]:
    """Hook called with the final structured markdown and pipeline metadata.

    Returns extracted parameters (future) or None (Phase 1).
    """
    return None
