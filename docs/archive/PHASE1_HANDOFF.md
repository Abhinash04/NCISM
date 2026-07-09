# PHASE 1 HANDOFF — Document Intelligence Base

**Project:** NCISM / MARB-ISM Assessment & Permission Management System
**Phase:** 1 — Document Intelligence foundation (upload → extraction pipeline → document workspace)
**Prepared:** 2026-07-06 · **Audience:** developers joining Phase 2
**Status:** ✅ Built, lint-clean, production build passing, verified end-to-end in a real browser (Playwright/Chromium)

Predecessor document: [PROJECT_HANDOFF_KT_GAP_ANALYSIS.md](PROJECT_HANDOFF_KT_GAP_ANALYSIS.md) (SRS-stage handoff — its "no code exists" statement is now superseded by this phase).

---

## 1. What Phase 1 delivers

| Module | Status | Where |
|---|---|---|
| Document Upload Workspace (drag & drop, browse, progress, validation, multi-upload, list with size/pages/status/timestamp) | ✅ | `frontend/src/features/upload/` |
| Document Details Workspace (65/35: PDF viewer + tabs) | ✅ | `frontend/src/features/document-details/` |
| PDF viewer (page nav, direct jump, zoom, fit width, download, page indicator) | ✅ | `PdfViewer.jsx` / `PdfToolbar.jsx` (react-pdf) |
| Tab 1 — Extracted Text (verbatim raw, all-pages / per-page) | ✅ | `tabs/RawTextTab.jsx` |
| Tab 2 — Structure View (Final Structured Markdown, GFM tables) | ✅ | `tabs/StructureViewTab.jsx` |
| Tab 3 — Pipeline / Artifacts (every stage output + validation report, expandable) | ✅ | `tabs/PipelineArtifactsTab.jsx` |
| Tab 4 — OCR Metadata (fields + validation summary + stage timings + engine versions) | ✅ | `tabs/OcrMetadataTab.jsx` |
| Staged extraction pipeline (classify → pdfplumber → PyMuPDF → **normalize** → merge → MarkItDown → structurer → **OpenDataLoader** → **validate**) | ✅ | `python-service/app/services/` |
| OpenDataLoader-PDF (local mode; structured Markdown rebuilt from element JSON w/ merged-cell spans; struct-tree + `cluster` fallback; Java; graceful degradation) | ✅ | `python-service/app/services/opendataloader_extractor.py`, `odl_json_structurer.py` |
| Validation stage — selects Final Structured Markdown (opendataloader → structurer → markitdown) | ✅ | `python-service/app/services/validator.py` |
| Every intermediate artifact preserved end-to-end (never overwritten) | ✅ | `artifacts[]` on the wire + Dexie |
| DOCX + XLSX ingestion via MarkItDown (native OOXML support) | ✅ | pipeline `OFFICE_STAGES`; `OfficePreview.jsx` |
| Storage model (documents / extractions / files) | ✅ | `frontend/src/db/` (Dexie / IndexedDB) |
| The 5-API contract | ✅ | `frontend/src/services/documentService.js` (see §4) |
| OCR / rule-engine extension points | ✅ interfaces only | `python-service/app/interfaces/` |
| Rule engine, assessments, auth, workflows, OCR implementation | ❌ intentionally out of scope | — |

Full documentation set: [docs/phase1/ARCHITECTURE.md](docs/phase1/ARCHITECTURE.md) · [docs/phase1/API.md](docs/phase1/API.md) · [docs/phase1/SCHEMA.md](docs/phase1/SCHEMA.md)

## 2. Stack & key decisions (user-approved)

- **Frontend:** React 19 + **JavaScript only (no TypeScript)** + Vite 8 + Tailwind v4 + shadcn/ui (`components.json` has `"tsx": false` → all generated components are `.jsx`).
- **Persistence:** **client-side IndexedDB via Dexie** (POC decision). Documents, extraction results *and the PDF blobs* live in the browser. Consequence: data is per-browser/per-profile, not shared. Migration path in §6.
- **Server:** **Python FastAPI only** (no Node layer). It is **stateless** — receives a PDF, returns extraction JSON, stores nothing.
- **Processing trigger:** **manual** — upload only stores; the user clicks *Process document* (mirrors the ESIC "Extract Data" pattern).
- **Structured markdown for PDFs is chosen by a Validation stage** from three candidates: OpenDataLoader-PDF (preferred), the domain-tuned `structurer.py`, and MarkItDown (last resort — its pdfminer backend loses table structure, verified on AYU0659). `validator.py` picks by precedence `opendataloader → structurer → markitdown` after structural checks; `metadata.structuredBy` + `metadata.validation` record the decision. For DOCX/XLSX, MarkItDown is the engine of record. Raw text and markdown are stored separately; raw is never overwritten.
- **OpenDataLoader-PDF runs after MarkItDown, in local/fast mode only** (no hybrid AI/OCR — out of scope). It requires a Java 11+ runtime and emits both Markdown and element JSON with per-element bounding boxes (reserved as the Phase-2 Rule-Engine substrate). It **degrades gracefully**: if Java is absent or a conversion fails, the pipeline continues and Validation falls back to the structurer / MarkItDown.
- **Every intermediate artifact is preserved** (classification, pdfplumber, pymupdf, normalized, merged, markitdown, structurer, opendataloader, final) as an ordered `artifacts[]` on the wire and in Dexie — nothing is overwritten, so the full pipeline history is inspectable in the Pipeline tab.
- Rationale for every decision: ARCHITECTURE.md §9.

## 3. How to run

Prerequisite: a **Java 11+** runtime on `PATH` (OpenDataLoader-PDF stage). Without it the pipeline still runs and falls back to the structurer / MarkItDown markdown.

```powershell
# Terminal 1 — extraction service (port 8000)
cd python-service
python -m venv .venv                                  # first time only
.\.venv\Scripts\python -m pip install -r requirements.txt   # first time only
.\.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000

# Terminal 2 — frontend
cd frontend
npm install                                           # first time only
npm run dev        # 5173, auto-falls back to 5174 if busy
```

Open the Vite URL, drop a PDF from `All data/Part-3 colleges/`, open it, click **Process document**. Swagger UI for the service: http://localhost:8000/docs

Quality gates: `npm run lint` (oxlint — passes; 3 benign fast-refresh warnings from stock shadcn files) · `npm run build` (passes; chunk-size notice comes from the ~1 MB pdf.js worker, expected).

## 4. Architecture in one screen

```
Browser ──────────────────────────────────────────────────────┐
  features (upload / document-details)                        │
     ↓ hooks (useLiveQuery — everything renders live)         │
  documentService  ←— the 5-API logical contract              │
     ↓                    ↓                                   │
  repositories        extractionApi (fetch)                   │
     ↓                    │                                   │
  Dexie/IndexedDB         │  POST /api/v1/extraction/process  │
  (documents ·            │  (multipart PDF)                  │
   extractions · files)   ↓                                   │
──────────────────  python-service (stateless FastAPI) ───────┘
                    routers → pipeline.py (ordered STAGES list)
                    classify → pdfplumber → PyMuPDF → normalize → merge
                    → MarkItDown → structurer → OpenDataLoader → validate
                    → rule_engine_hook (no-op) → ExtractionResult JSON
                    (every stage output preserved in artifacts[])
```

The five required endpoints map to `documentService`: `uploadDocument`, `listDocuments`, `getDocument`, `getExtraction`, `processDocument` (the last one is the only real HTTP round-trip). **Nothing more is implemented.**

Document status machine: `uploaded → processing → processed | failed | requires_ocr` (re-process allowed from any terminal state; extractions keyed by `documentId`, replaced on re-run).

## 5. Verification evidence (what was actually exercised)

Driven in Chromium via Playwright against the running app:

- Upload of `AYU0659 100 intake capacity.pdf` → row `1007 KB · 20 pages · Uploaded`; processing → **Processed**; raw text 36,560 chars containing "Sardar Patel"/"AYU0659"; Structure View rendered 14 HTML tables; metadata showed all 9 fields; total pipeline ~3–5 s (pdfplumber ~2.5 s is the bulk).
- Second sample `AYU0265, 60 intake.pdf` → Processed, 42,846 chars.
- Probes: fake `.pdf` (text content) → rejected by magic-byte check with clear toast, no row; page reload → everything persists (IndexedDB); processing route aborted mid-flight → status **Failed** + "service unreachable" toast; re-process after recovery → **Processed**; HTTP `POST` of a non-PDF → `422 Only PDF files are supported`.
- Repeatable recipe: `.claude/skills/verify/SKILL.md`.

## 6. Extension points for Phase 2 (create-only, all in place)

| Future capability | Hook | File |
|---|---|---|
| OCR engines | implement `OCREngine` (extends `BaseExtractor`); classifier already routes scanned PDFs to `requires_ocr`; `metadata.ocr` slot reserved | `python-service/app/interfaces/ocr_engine.py` |
| Rule engine → parameters → assessments | replace no-op `post_markdown(markdown, metadata)`; result lands in `metadata.parameters` (already on the wire and in Dexie) | `python-service/app/interfaces/rule_engine_hook.py` |
| New pipeline stages (AI extraction, language detection) | append/insert into the `STAGES` list — the runner is untouched | `python-service/app/services/pipeline.py` |
| Real backend / server persistence | re-implement `documentService` behind HTTP; feature components, hooks and repositories interfaces stay | `frontend/src/services/documentService.js` |
| New client tables (parameters, assessments) | `db.version(2).stores({...})` upgrade | `frontend/src/db/db.js` |
| Extra metadata fields | `OcrMetadataTab` renders generically from `extraction.metadata` | `frontend/src/features/document-details/components/tabs/OcrMetadataTab.jsx` |

## 7. Known limitations / watch-outs

- **Data is per-browser.** Clearing site data deletes documents and extractions. This is the accepted POC trade-off.
- **PDF, DOCX and XLSX only.** Other formats are Phase 2. Office files have no page-based viewer (the left pane shows extracted text after processing) and no page-wise extraction.
- **Borderless / merged-cell tables** (e.g. "Visitor Details", "Constructed Area College Details", the "Area of the … Departments" grids) are recovered as real GFM tables by **rebuilding structured Markdown from the OpenDataLoader element JSON** (`odl_json_structurer.py`) instead of its native serializer — the JSON keeps the faithful cell grid with merged-cell spans, so column mapping and Sr. No. columns are correct and rows are no longer flattened into bullets. The builder runs on the tagged struct tree, falling back to the `cluster` method for poorly-tagged PDFs (auto-selected by raw-text coverage). Column names for the standard NCISM schedules come from a curated map (`ncism_table_headers.py`), applied only when the label count matches the reconstructed column count. Sections whose data is tagged inside a list item's `content` (e.g. 2.8 Bio-metric, 2.9 College Website) are restored as `**Question:** Answer` lines; cover-page / schedule form fields (institution name, course, visitation metadata, 2.7 status) are restored from list-item `content` via a curated label list, and numbered subsections carried only in `content` (e.g. 2.4.1) are emitted as headings before their table. Header bands in list-item `content` (e.g. 3.4) are parsed into column labels via `headers_from_band` when the curated map has no match (exact column-count safety). **Section gap-fill** (`section_gap_fill.py`) splices numbered sections the struct_tree JSON omits (e.g. 3.6) from the structurer donor before Validation when the section body is genuinely absent. **Grouped multi-row headers** (e.g. 3.1 Teaching Staff Verification) — which the JSON stores only as a flat band and GFM cannot express — are rebuilt from a curated multi-row spec (`STRUCTURED_HEADERS`) and rendered as an HTML `<table>` with real `colspan`/`rowspan` (via `rehype-raw`), again only on an exact column-count match. Clipped heading bands (e.g. `"3 T hi t ff (S h d l V) 3. Teaching staff (Schedule-V)"`) are de-garbled to the clean numbered title. Residual limits: tables outside the header map (or with a changed column count) render with an empty header row (the section heading above names the table); grouped grids without an authored multi-row spec (4.1 / 6.1, …) flatten to a single header row; and poorly-tagged PDFs on the `cluster` path may still flatten a borderless table the geometric detector misses. The structurer (ruled tables) and MarkItDown remain as validation fallbacks.
- **Language detection is a placeholder** (`en`/`unknown` ASCII heuristic).
- **Headings in Structure View:** these visitation PDFs carry no heading metadata, so MarkItDown output is pipe-tables + text (identical style to the reference files in `markdown/`) — renderer supports headings whenever a source provides them.
- **CORS** on the service accepts any localhost origin (dev posture); tighten on deployment.
- **pdfplumber is the slow stage** (~2.5 s / 20 pages). Fine interactively; revisit if Phase 2 batch-processes hundreds of reports.
- Environment used: Node 24 / Python 3.14 (all wheels available: PyMuPDF 1.28, pdfplumber 0.11.10, markitdown 0.1.6).

## 8. Deferred to Phase 2+ (by design)

OCR (Tesseract/cloud/handwriting), scanned & multilingual documents, rule engine + parameter extraction + assessment generation, authentication/roles, NCISM workflows (scrutiny/visitation/board/hearings/letters), server-side persistence & multi-user, document deletion/versioning/dedup, DOCX/XLSX ingestion, AI-assisted extraction (PG Regulations Ch. VIII 43(5) mandate).
