# NCISM Phase 1 — API Documentation

Persistence is client-side (Dexie/IndexedDB — POC decision), so the required
five-endpoint contract is implemented as the **`documentService` logical
API** in the frontend, with processing delegated to the **real HTTP API** of
the stateless Python service. A future server-side backend re-implements the
same contract behind real routes without touching feature components.

---

## 1. Logical API — `frontend/src/services/documentService.js`

### `POST /documents/upload` → `uploadDocument(file, onProgress?)`

Validates and stores one document (PDF, DOCX or XLSX).

- **Validation:** extension `.pdf`/`.docx`/`.xlsx` + magic bytes (`%PDF`
  for PDF, `PK` zip header for OOXML). Failure throws with a user-facing
  reason (shown as a toast).
- **Side effects (atomic Dexie transaction):** creates the `documents`
  record (page count read via pdf.js for PDFs; `pages: null` for Office
  files) and stores the Blob in `files`.
- **Returns:** the document record
  ```json
  {
    "id": "4913c070-…",
    "filename": "AYU0659 100 intake capacity.pdf",
    "size": 1031000,
    "pages": 20,
    "type": "pdf",
    "status": "uploaded",
    "uploadedAt": "2026-07-06T10:09:12.000Z"
  }
  ```

### `GET /documents` → `listDocuments()`

Returns all documents, newest first. Feature code consumes it live via
`useDocuments()` (Dexie liveQuery), so the list re-renders on every change.

### `GET /documents/:id` → `getDocument(id)`

Returns one document record or `undefined`.

### `GET /documents/:id/extraction` → `getExtraction(id)`

Returns the persisted extraction result (shape in [SCHEMA.md](SCHEMA.md))
or `undefined` when the document has not been processed.

### `POST /documents/:id/process` → `processDocument(id)`

Manual processing trigger:

1. sets document `status = processing`;
2. loads the Blob and POSTs it to the Python service (below);
3. persists the returned `ExtractionResult` into `extractions`;
4. sets document status from the extraction status
   (`completed → processed`, `requires_ocr → requires_ocr`, otherwise
   `failed`);
5. on any error, stores a failed extraction with the error message and sets
   the document to `failed`, then rethrows for the UI toast.

Re-processing is allowed from any terminal state and replaces the previous
extraction (`extractions` is keyed by `documentId`).

**Nothing more is implemented.**

---

## 2. HTTP API — python-service (FastAPI, `http://localhost:8000`)

OpenAPI docs are auto-served at `/docs` when the service runs.

### `GET /api/v1/health`

Used by the frontend header's health indicator (10 s poll).

```json
{ "status": "ok", "service": "ncism-extraction-service" }
```

### `POST /api/v1/extraction/process`

Runs one document through the pipeline (PDF pipeline or Office pipeline,
selected by extension). The service stores nothing.

- **Request:** `multipart/form-data` with a single `file` part
  (`.pdf`, `.docx` or `.xlsx`; content magic bytes are verified).
- **Errors:**
  - `422` — empty upload, unsupported extension, or magic-byte mismatch
    (`{"detail": "Only PDF, DOCX and XLSX files are supported"}`)
  - `500` — pipeline failure (details in service logs)
- **Response `200`** (`ExtractionResult`):

```json
{
  "rawText": "National Comission For Indian System Of\nMedicine,New Delhi\n…",
  "markdown": "…| Intake Capacity | … | Admitted Students |…",
  "pageWiseExtraction": [
    {
      "page": 1,
      "text": "…",
      "charCount": 1462,
      "wordCount": 231,
      "tableCount": 3,
      "engine": "pdfplumber"
    }
  ],
  "processingTime": 9640.82,
  "metadata": {
    "extractionMethod": "pdfplumber+pymupdf",
    "pdfType": "digital",
    "pages": 20,
    "characters": 36558,
    "words": 5819,
    "language": "en",
    "structuredBy": "opendataloader",
    "validation": {
      "chosen": "opendataloader",
      "reason": "passed structural checks",
      "candidates": [
        { "engine": "opendataloader", "available": true, "characters": 38349, "headings": 120, "tables": 14, "valid": true, "chosen": true, "reason": "passed structural checks" },
        { "engine": "structurer", "available": true, "characters": 40652, "headings": 30, "tables": 20, "valid": true, "chosen": false, "reason": "passed structural checks" },
        { "engine": "markitdown", "available": true, "characters": 60747, "headings": 0, "tables": 14, "valid": true, "chosen": false, "reason": "passed structural checks" }
      ]
    },
    "stageTimings": {
      "classification": 46.72,
      "pdfplumber": 2270.98,
      "pymupdf": 297.22,
      "normalize": 34.19,
      "merge": 0.4,
      "markitdown": 1735.04,
      "structurer": 2422.88,
      "opendataloader": 1832.83,
      "validate": 2.64
    },
    "engines": {
      "pdfplumber": "0.11.10",
      "pymupdf": "1.28.0",
      "markitdown": "0.1.6",
      "opendataloader-pdf": "2.4.7"
    },
    "ocr": null,
    "parameters": null
  },
  "artifacts": [
    { "stage": "classification", "engine": "pymupdf", "status": "produced", "format": "classification", "data": { "pdfType": "digital", "totalPages": 20, "textPages": 20 } },
    { "stage": "pdfplumber", "engine": "pdfplumber", "status": "produced", "format": "text", "charCount": 36891, "tableCount": 59 },
    { "stage": "pymupdf", "engine": "pymupdf", "status": "produced", "format": "text", "charCount": 88617 },
    { "stage": "normalized", "engine": "normalizer", "status": "produced", "format": "text", "charCount": 36889 },
    { "stage": "merged", "engine": "pdfplumber+pymupdf", "status": "produced", "format": "text", "charCount": 36558, "tableCount": 59 },
    { "stage": "markitdown", "engine": "markitdown", "status": "produced", "format": "markdown", "charCount": 60747 },
    { "stage": "structurer", "engine": "structurer", "status": "produced", "format": "markdown", "charCount": 40652 },
    { "stage": "opendataloader", "engine": "opendataloader-pdf", "status": "produced", "format": "markdown", "charCount": 38349, "data": { "…": "element JSON with bounding boxes" } },
    { "stage": "final", "engine": "opendataloader", "status": "produced", "format": "markdown", "charCount": 38349, "data": { "…": "validation report" } }
  ],
  "status": "completed",
  "error": null
}
```

- `artifacts[]` preserves **every** pipeline-stage output in order (see
  [SCHEMA.md](SCHEMA.md) `StageArtifact`); no intermediate is overwritten. The
  `opendataloader` artifact's `data` holds the element JSON with per-element
  bounding boxes; the `final` artifact's `data` holds the validation report.
- If the OpenDataLoader stage cannot run (no Java runtime / conversion error)
  its artifact is returned with `status: "failed"` and an `error`, and the
  Validation stage falls back to the structurer / MarkItDown markdown — the
  request still returns `200 completed`.

- **Scanned PDFs** (no extractable text layer) return `200` with
  `status: "requires_ocr"`, empty `rawText`/`markdown`, and an explanatory
  `error` message — OCR engines are a Phase 2 capability.
- **DOCX/XLSX** return the same shape with
  `pdfType: "docx" | "xlsx"`, `pages: null`,
  `extractionMethod: "markitdown"`, `structuredBy: "markitdown"`, and an
  empty `pageWiseExtraction` (Office documents are not paginated at
  extraction time); `rawText` and `markdown` both carry the MarkItDown
  conversion.

### Configuration

- Frontend base URL: `VITE_EXTRACTION_API_URL` env var
  (default `http://localhost:8000/api/v1`).
- CORS: any `localhost` / `127.0.0.1` origin (local POC posture).
