import logging
import os

from fastapi import APIRouter, HTTPException, UploadFile

from app.schemas.extraction import ExtractionResult
from app.services import pipeline
from app.utils.files import temporary_document

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/extraction", tags=["extraction"])

PDF_MAGIC = b"%PDF"
ZIP_MAGIC = b"PK\x03\x04"  # docx/xlsx are OOXML zip containers

SUPPORTED_TYPES = {".pdf": "pdf", ".docx": "docx", ".xlsx": "xlsx"}


def _detect_file_type(filename: str, content: bytes) -> str:
    extension = os.path.splitext(filename or "")[1].lower()
    file_type = SUPPORTED_TYPES.get(extension)
    if file_type is None:
        raise HTTPException(
            status_code=422, detail="Only PDF, DOCX and XLSX files are supported"
        )
    if file_type == "pdf" and not content.startswith(PDF_MAGIC):
        raise HTTPException(status_code=422, detail="File content is not a valid PDF")
    if file_type in ("docx", "xlsx") and not content.startswith(ZIP_MAGIC):
        raise HTTPException(
            status_code=422, detail=f"File content is not a valid {file_type.upper()}"
        )
    return file_type


@router.post("/process", response_model=ExtractionResult)
def process(file: UploadFile) -> ExtractionResult:
    """Runs one document through the extraction pipeline and returns the
    result. The service stores nothing — persistence is the client's job."""
    content = file.file.read()

    if not content:
        raise HTTPException(status_code=422, detail="Uploaded file is empty")
    file_type = _detect_file_type(file.filename, content)

    try:
        with temporary_document(content, suffix=f".{file_type}") as path:
            return pipeline.run(path, file_type)
    except Exception:
        logger.exception("Extraction pipeline failed for %s", file.filename)
        raise HTTPException(
            status_code=500,
            detail="Extraction pipeline failed — see service logs for details",
        )
