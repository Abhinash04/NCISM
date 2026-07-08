"""NCISM Document Intelligence — extraction service entry point.

Run with:  uvicorn app.main:app --reload --port 8000
"""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import extraction, health

logging.basicConfig(level=logging.INFO)

# Local development frontend on any port (Vite may fall back from 5173).
ALLOWED_ORIGIN_REGEX = r"http://(localhost|127\.0\.0\.1)(:\d+)?"


def create_app() -> FastAPI:
    app = FastAPI(
        title="NCISM Extraction Service",
        description=(
            "Stateless document-extraction pipeline: classification, "
            "pdfplumber + PyMuPDF digital extraction, MarkItDown structuring."
        ),
        version="0.1.0",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=ALLOWED_ORIGIN_REGEX,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(health.router, prefix="/api/v1")
    app.include_router(extraction.router, prefix="/api/v1")
    return app


app = create_app()
