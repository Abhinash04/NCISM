# NCISM Document Intelligence — Phase 1

Base document-intelligence platform for the MARB-ISM assessment workflow:
upload NCISM visitation documents (PDF, DOCX, XLSX), run a staged extraction
pipeline (classification → pdfplumber + PyMuPDF → normalization → merge →
MarkItDown → structurer → OpenDataLoader-PDF → validation), and inspect the
results — including every preserved intermediate artifact — in a two-pane
document workspace.

Phase 1 scope only — no rule engine, no assessment generation, no
authentication, no OCR (extension points exist for all of them).
Full documentation: [docs/phase1/](docs/phase1/).

## Architecture

- **frontend/** — React 19 + JavaScript + Vite + shadcn/ui + Tailwind.
  All persistence is client-side in IndexedDB via Dexie (POC decision):
  document records, extraction results and the PDF blobs themselves.
- **python-service/** — stateless FastAPI extraction service. Receives a
  PDF, runs the pipeline, returns the extraction JSON (with every preserved
  stage artifact); stores nothing.

## Prerequisites

- Node 18+ and Python 3.10+.
- **Java 11+** (a JRE/JDK on `PATH`) — required by the OpenDataLoader-PDF
  stage. If Java is absent the pipeline still runs and degrades gracefully:
  the validation stage falls back to the structurer / MarkItDown markdown.

## Running locally

### 1. Extraction service (port 8000)

```powershell
cd python-service
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
.\.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
```

### 2. Frontend (port 5173)

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173, upload a PDF from `All data/Part-3 colleges/`
(or a DOCX/XLSX from `All data/`), open it and click **Process document**.
