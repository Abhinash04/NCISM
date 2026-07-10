# NCISM Assessment Platform

Document assessment platform for the **Medical Assessment and Rating Board (MARB-ISM)** of the
National Commission for Indian System of Medicine. Upload a college inspection report (PDF),
extract it with structure preserved, and generate a deterministic MARB-format compliance
assessment against NCISM MESAR regulations.

This is the **foundation release**: extraction pipeline, rule-engine skeleton with versioned
rulesets, MARB report generation, and a document workspace UI. Authentication, organizations,
workflows and the other platform modules are designed-for extension points (see
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)).

## Stack

- **Backend** — Node.js / Express 5 (`backend/`): clean-architecture layers, disk-backed job
  repository, staged extraction engine (OpenDataLoader-PDF CLI + Docling hybrid + semantic
  reconstruction), deterministic assessment engine (rules-as-data).
- **Frontend** — React 19 + Vite (`frontend/`): TanStack Query data layer, Dexie (IndexedDB)
  persistence, shadcn/ui + Tailwind with the warm-canvas design system from `DESIGN.md`.

## Running the application

The full stack is **3 terminals** — one per service. Terminals 2 and 3 are required;
Terminal 1 is optional (extraction falls back to the base engine without it).

| Terminal | Service | Port | Required |
| --- | --- | --- | --- |
| 1 | Docling hybrid server (extraction quality booster) | 5002 | Optional, recommended |
| 2 | Backend API (Express) | 3000 | Yes |
| 3 | Frontend (Vite dev server) | 5173 | Yes |

### One-time setup

- **Node.js 20+** and **Java 11+** installed.
- [OpenDataLoader-PDF](https://github.com/opendataloader-project/opendataloader-pdf) CLI
  installed via pip (it wraps the Java core).
- Backend:
  ```bash
  cd backend
  cp .env.example .env     # set OPENDATALOADER_CLI_PATH if the CLI is not at
                           # D:\opendataloader-pdf\.venv\Scripts\opendataloader-pdf.exe
  npm install
  ```
- Frontend:
  ```bash
  cd frontend
  npm install              # VITE_API_URL is preset in .env.local
  ```

### Terminal 1 — Docling hybrid server (optional)

```powershell
cd D:\opendataloader-pdf\python\opendataloader-pdf
.\.venv\Scripts\activate
opendataloader-pdf-hybrid --port 5002
```

Wait for `Uvicorn running on http://0.0.0.0:5002`. Without this server, extraction still
works — the CLI falls back to the base engine and the app's status badge shows **Degraded**.
With it, extraction quality improves; if it drops pages on large scans (GPU out-of-memory),
the backend automatically re-extracts those pages with the base engine and merges them in.

### Terminal 2 — Backend API

```bash
cd backend
npm run dev
```

Wait for `[Server] Backend listening at http://localhost:3000`.

### Terminal 3 — Frontend

```bash
cd frontend
npm run dev
```

Open **http://localhost:5173**. The status badge in the header shows **Online** when all
three services are up, or **Degraded** when only the hybrid server is down (fully usable).

## Using the application

1. **Upload** — open the Dashboard and drag-and-drop a PDF inspection report into the
   upload zone (sample reports live in `All data/Part-3 colleges/`).
2. **Extraction** — OpenDataLoader extracts the document with structure preserved
   (headings, tables with merged cells, reading order). Takes a few seconds to about a
   minute, then the document opens in the 3-panel workspace: original PDF on the left,
   extracted content in the center, inspector (metadata, outline, stats, downloads) on
   the right.
3. **Structured View** — the center panel's default tab renders the extracted document as
   formatted markdown, with in-document search, font/width controls and reading mode. The
   JSON and Raw tabs show the machine-readable formats.
4. **Assessment Report** — switch to the Assessment Report tab and click **Generate
   Report**. The deterministic rule engine evaluates the extracted parameters against the
   MESAR (UG) Ayurveda 2024 ruleset and the Board-approved punitive policy, and renders
   the report in the official MARB-ISM format: institution header, visitors table,
   numbered compliance findings, teaching/non-teaching/hospital staff shortcoming tables
   with punitive actions, hospital functionality metrics, and a punitive action summary
   (seat reductions or denial of permission). Values the system cannot verify from the
   document are flagged "manual verification required" — never invented.
5. **Download & history** — download the report and other artifacts from the Inspector's
   Downloads tab (or the API below). Processed documents persist in the browser's local
   store, so History keeps working even after the server's 24-hour job retention purge.

## Test & checks

```bash
cd backend
npm test                     # golden assessment + extractor + reconstruction regression suites
npm run check:extraction     # full pipeline on a sample PDF (accepts a path argument)
npm run check:assessment     # engine on golden parameters or a markdown file
```

Golden fixtures live in `backend/tests/fixtures/` — three real colleges (AYU0659, AYU0265,
AYU0038) with hand-verified parameters, expected reports, and pre-refactor extraction baselines.

## API (`/api/v1`)

| Endpoint | Description |
| --- | --- |
| `GET /health` | `{status: ok\|degraded, services:{api, extractor}}` |
| `POST /extract` | multipart `file` (PDF) → `{success, job}` |
| `GET /jobs/:jobId` | canonical job DTO with artifact URLs |
| `GET /jobs/:jobId/artifacts/:type` | `pdf\|markdown\|json\|html\|report\|assessment`; `?download=1` for attachment |
| `POST /assessments` | `{jobId, rulesetId?, rulesetVersion?}` → `{assessment:{result, reportMarkdown}, job}` |

## Repository map

```
backend/            Express API, engines, rulesets (see docs/ARCHITECTURE.md)
frontend/           React SPA
docs/ARCHITECTURE.md   authoritative architecture reference
docs/srs/           domain SRS suite (entities, workflows, roles, gap analysis)
docs/archive/       superseded planning/handoff documents
All data/           source domain documents (regulations, filled reports, formats)
markdown/           extracted counterparts of All data/ (regulations, target report format)
DESIGN.md           visual design system the frontend theme derives from
```
