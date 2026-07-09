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

## Prerequisites

- Node.js 20+
- [OpenDataLoader-PDF](https://github.com/opendataloader-project/opendataloader-pdf) CLI
  (pip-installed; the CLI wraps a Java 11+ core). Set `OPENDATALOADER_CLI_PATH` if it is not at
  the default path in `backend/.env.example`.
- Optional: the Docling hybrid server on port 5002 (`HYBRID_SERVER_URL`). Without it the CLI
  falls back to the base engine and the health endpoint reports `degraded`.

## Run

```bash
# backend (http://localhost:3000)
cd backend
cp .env.example .env      # adjust paths/ports
npm install
npm run dev

# frontend (http://localhost:5173)
cd frontend
npm install               # VITE_API_URL is set in .env.local
npm run dev
```

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
