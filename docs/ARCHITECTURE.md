# Architecture

Authoritative reference for the NCISM Assessment Platform foundation. Anything under
`docs/archive/` is historical and describes systems that no longer exist (or never did).

## System overview

```
Browser (React SPA, :5173)
   │  multipart PDF / JSON over /api/v1        Dexie (IndexedDB)
   ▼                                            ▲  documents, artifacts, assessments
Express backend (:3000)                         │  (survives backend retention purge)
   ├─ extraction engine ── OpenDataLoader-PDF CLI (Python wrapper → Java core)
   │                        └─ Docling hybrid server (:5002, optional, --hybrid-fallback)
   ├─ assessment engine ── data/rulesets/<id>/<version>/  (rules + punitive policy JSON)
   └─ job repository ───── backend/temp/job_<id>/  (input.pdf, manifest.json, output/*)
```

## Backend (`backend/`)

Layering: **routes → controllers → services → repositories / engines**. All `process.env`
reads live in `src/config/index.js` (dotenv, validated at boot). Central error middleware
returns `{success:false, error:{code, message}}` for every non-2xx.

```
src/
├── app.js / ../server.js      express assembly / bootstrap (starts retention service)
├── config/                    the only place env vars are read
├── routes/  controllers/      thin HTTP layer
├── services/
│   ├── job.service.js         business ops over the repository; owns toJobDto()
│   ├── extraction.service.js  dispatches to the pipeline registered for a mimetype
│   ├── assessment.service.js  orchestrates engine run + artifact persistence
│   └── retention.service.js   hourly purge of jobs older than JOB_RETENTION_HOURS
├── repositories/
│   └── job.repository.js      disk implementation of the job storage contract
├── engines/
│   ├── extraction/            mimetype-keyed pipeline registry
│   │   └── pdf/               opendataloader.stage → reconstruction.stage → collect.stage
│   └── assessment/            extractors → evaluator(+checks) → punitive → reporter
└── middlewares/ utils/        error handler, upload validation, ApiError, logger
```

### Job repository contract

Everything above `repositories/job.repository.js` speaks `jobId` + artifact `type`; nothing
else touches `temp/` paths. A Postgres/object-storage backend later is a new file implementing
the same functions:

```
create() → {jobId, jobDir, outputDir}
saveManifest(jobId, manifest) · getManifest(jobId)
getArtifactPath(jobId, type) · saveArtifact(jobId, type, filename, content)
list() → [{jobId, mtimeMs}] · remove(jobId)
```

`toJobDto()` in `job.service.js` is the **single place** artifact URLs and the canonical job
shape are built — manifest-internal disk paths never leave the server.

### Extraction engine

`engines/extraction/index.js` maps mimetype → pipeline (`application/pdf` today; DOCX/XLSX/
images register here later). The PDF pipeline stages:

1. **opendataloader.stage** — spawns the CLI (`-f markdown,json,html --hybrid docling-fast
   --hybrid-fallback --markdown-with-html`), parses stdout for partial-success and derives
   failed pages from the element JSON's page coverage. Also runs base-engine-only
   (`{hybrid:false}` drops the hybrid args).
2. **retry.stage** — when the hybrid (Docling) backend drops pages (e.g. `std::bad_alloc`
   on memory-heavy pages with constrained GPU/RAM), reruns the CLI with the base Java engine
   into `output/base-retry/` and splices the missing pages' elements into the primary JSON;
   status becomes `success` with a warning naming the recovered pages (the HTML artifact
   stays partial). Server-side mitigations for the OOM itself: cap Docling's max image size,
   disable OCR for born-digital PDFs — a 4 GB laptop GPU is the usual constraint.
3. **reconstruction.stage** — rebuilds the markdown from the (merged) element JSON:
   bounding-box key/value detection, form blocks, HTML tables with col/rowspans. Highest-value
   and most fragile asset; `tests/reconstruction.regression.test.js` pins its output to
   committed baselines for the three sample colleges.
4. **collect.stage** — loads produced artifacts from the output dir.

### Assessment engine (deterministic — no AI)

```
markdown ─ extractors ─→ ParameterSet ─ evaluator ─→ findings ─ punitive ─→ summary ─ reporter ─→ MARB report
                              │                                                            │
                    every parameter carries                                     renders only; never computes
                    {value, status: found|missing, source}
```

- **Extractors** (`extractors/`) are precision-first: a parameter is `found` (with provenance)
  or `missing` — never invented. Fields whose proforma labels sit next to MESAR *requirement*
  columns stay missing until row-context-aware extraction lands (see `extractors.test.js`
  misparse guards). Missing parameters surface as `insufficient-data` findings and render as
  "manual verification required" in the report.
- **Rulesets** live in `backend/data/rulesets/<id>/<version>/`: a `ruleset.json` manifest
  (ruleFiles, punitive policy, `supportedIntakes` — the evaluator rejects unsupported intakes
  loudly), rule files as JSON arrays, and the punitive policy transcribed verbatim from the
  Board-approved document. `rules/validate.js` fails structurally-broken rulesets at load.
- **Checks** (`evaluator/checks/`) form a handler registry keyed by `check.type`:
  `threshold` (byIntake expected values + tolerance), `boolean`, `staff-table` (Schedule IV
  HF/LF matrix math, parses both `1P And 1R +2L` and `1 HF + 1 LF` notations), `staff-roster`
  (per-post required/existing). New rule shapes = new handler + new `check.type`; `custom` is
  the escape hatch.
- **Punitive engine** maps findings to policy entries (5%-per-deficient-teaching-faculty,
  per-post seat tables, per-deficiency-percent ratios, fixed seats, denial), annotates staff
  rows with their per-row punitive text, and aggregates: sum of all contributions, denial when
  any denial-class deficiency exists (AEBAS, empty teaching department) or the total exceeds
  50% of intake. Output keeps an auditable `contributions[]` ledger.
- **Reporter** (`reporter/templates/marb-ug-ayurveda-2024.js`) lays out the official MARB
  report; it never computes compliance.

**Golden tests** (`npm test`): fixture parameters for AYU0659/AYU0265/AYU0038 → asserted
punitive totals (36-seat + denial / 17.5-seat / compliant) and full report snapshots; extractor
accuracy is measured field-by-field with `todo` markers for not-yet-extractable fields.

### API contract (`/api/v1`)

One canonical **JobDto** returned by extract/getJob/assessments:

```jsonc
{
  "jobId": "job_ab12cd34ef56",
  "status": "completed" | "partial" | "failed",
  "filename": "…", "filesize": 123, "pageCount": 20, "processingTimeMs": 3670,
  "warnings": [], "failedPages": [], "createdAt": "…",
  "artifacts": { "pdf": "/api/v1/jobs/…/artifacts/pdf", "markdown": "…", "json": "…",
                 "html": "…", "report": null, "assessment": null }
}
```

Errors: `{success:false, error:{code, message, details?}}` with codes like
`UNSUPPORTED_FILE_TYPE`, `FILE_TOO_LARGE`, `JOB_NOT_FOUND`, `ARTIFACT_NOT_FOUND`,
`EXTRACTION_FAILED`, `ASSESSMENT_FAILED`.

## Frontend (`frontend/src/`)

Page-based document workflow (enterprise-DMS pattern):
`/documents` (list) → `/documents/:id` (Details: summary cards + artifacts table) →
dedicated pages `/pdf`, `/text`, `/structure`, `/metadata`, `/pipeline`, `/report`.
Upload runs through the transient `/documents/new` route and lands on Details.
Legacy `/history` and `/workspace/*` routes redirect.

```
app/                router root, providers (react-query, theme), DashboardLayout (sidebar:
                    Dashboard / Documents / Settings / About)
pages/              Landing, Dashboard, Settings, About, NotFound
pages/documents/    DocumentsList, DocumentDetails, PdfPage, ExtractedTextPage,
                    StructurePage (search + TOC), MetadataPage, PipelinePage,
                    ReportPage (generate/download/print), UploadProcessing
features/
├── documents/      DocumentPageLayout (breadcrumb + job resolution + skeleton),
│                   ArtifactsTable, WarningsBanner, upload zone, health widget,
│                   useDocuments (Dexie live query), doc stats util
└── workspace/      reusable viewers: PdfViewer, JsonViewer, DocumentOutline,
                    useJob / useArtifact, search-highlight rehype plugin
components/         shared: ui/ (shadcn), common/, markdown/MarkdownRenderer (THE one
                    markdown render map)
lib/                api client + endpoints, Dexie schema + documents repository,
                    format/download/slug helpers
hooks/              cross-feature hooks (useHealthCheck)
```

- **Data layer**: TanStack Query. `['artifact', jobId, type]` shares one fetch across all
  pages; `['health']` collapses every status indicator into one 30s poll; upload/assessment
  are mutations.
- **Persistence**: Dexie db `ncism-platform` (`documents`, `artifacts` `[documentId+type]`,
  `assessments`). After extraction, artifacts persist in the background (PDF Blob capped at
  50 MB). `useJob`/`useArtifact` are network-first with local fallback, so Documents keeps
  working after the backend's 24h purge (artifact availability on the Details page also
  checks the local store). Deletes cascade document → artifacts → assessments.
- **Theme**: shadcn HSL variables carry the DESIGN.md warm-canvas system (cream/coral/ink,
  warm dark surfaces); fonts self-hosted via @fontsource (Cormorant Garamond display, Inter
  body, JetBrains Mono code). Brand-literal tokens (`coral`, `cream`, `surface-dark`, …) exist
  for marketing surfaces.

## Extension points (future modules — designed for, not built)

| Module | Where it slots in |
| --- | --- |
| DOCX/XLSX/image extraction | register a pipeline in `engines/extraction/index.js` |
| Postgres / cloud storage | new implementation of the job repository contract |
| Rule management & versioning UI | rulesets are already versioned directories; add CRUD over `data/rulesets/` |
| New regulations (Unani, Siddha, PG…) | new ruleset directory + report template registration in `reporter/templater.js` |
| Auth / orgs / RBAC | Express middleware chain + a `features/auth` folder; API error envelope already uniform |
| Assessment history / analytics | Dexie `assessments` table already stores every run per document |
| Report export (DOCX/PDF) | consume the `report` artifact or `AssessmentResult` JSON |
| Notifications, audit logs, search | new services behind the existing route/controller pattern |

## Domain sources

- `docs/srs/` — authoritative SRS (entities, workflows, roles, business rules, gap analysis).
  Unresolved client questions that gate the full punitive engine (HG-02: 5%-rule
  interpretation, equipment threshold) are documented there.
- `markdown/` — MESAR regulations, the punitive policy, the target MARB report format
  ("Assessment of Sardar Patel Ayurvedic Med. Coll. …"), and three filled college reports that
  seed the golden tests.
