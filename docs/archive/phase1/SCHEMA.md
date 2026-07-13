# NCISM Phase 1 — Storage Schema (Dexie / IndexedDB)

Database: **`ncism-document-intelligence`** — defined in
[`frontend/src/db/db.js`](../../frontend/src/db/db.js).
All access goes through the repositories in
`frontend/src/db/repositories/`; no other code touches Dexie tables.

```js
db.version(1).stores({
  documents:   'id, filename, status, uploadedAt',
  extractions: 'documentId, status, generatedAt',
  files:       'documentId',
});

// v2 — extraction records gain non-indexed `artifacts[]` +
// `metadata.validation`. Indexes are unchanged; the bump follows the
// "new fields via db.version(n+1)" convention and upgrades records in place.
db.version(2).stores({
  documents:   'id, filename, status, uploadedAt',
  extractions: 'documentId, status, generatedAt',
  files:       'documentId',
});
```

(Only indexed fields appear in `stores()`; records carry the full shapes
below.)

---

## Table: `documents`

One row per uploaded PDF — the document master record.

| Field | Type | Notes |
|---|---|---|
| `id` | string (UUID) | primary key, `crypto.randomUUID()` |
| `filename` | string | original file name (indexed) |
| `size` | number | bytes |
| `pages` | number \| null | read client-side via pdf.js at upload time; `null` for DOCX/XLSX |
| `type` | string | `pdf` \| `docx` \| `xlsx` (non-indexed; records created before this field default to `pdf`) |
| `status` | string | indexed; see state machine below |
| `uploadedAt` | string (ISO 8601) | indexed; list sort key (newest first) |

**Status state machine**

```
uploaded ──process──► processing ──► processed
                          │──► failed          (retryable)
                          └──► requires_ocr    (scanned PDF; Phase 2 OCR)
```

Re-processing re-enters `processing` from any terminal state.

## Table: `extractions`

One row per document (replaced on re-process) — the pipeline result,
persisted verbatim from the Python service plus a client `generatedAt`.

| Field | Type | Notes |
|---|---|---|
| `documentId` | string (UUID) | primary key, FK → `documents.id` |
| `rawText` | string | merged (normalized) pdfplumber+PyMuPDF text — **never overwritten by markdown** |
| `markdown` | string | the Final Structured Markdown (== the `final` artifact) |
| `pageWiseExtraction` | array | `{ page, text, charCount, wordCount, tableCount, engine }` per page |
| `artifacts` | array | ordered per-stage outputs (see `StageArtifact` below) — **no intermediate overwritten** |
| `processingTime` | number | whole pipeline, ms |
| `metadata` | object | see below |
| `status` | string | indexed; `completed` \| `failed` \| `requires_ocr` |
| `error` | string \| null | failure/OCR explanation |
| `generatedAt` | string (ISO 8601) | indexed |

**`metadata` object**

| Field | Notes |
|---|---|
| `extractionMethod` | `"pdfplumber+pymupdf"` (PDF) \| `"markitdown"` (DOCX/XLSX) \| `"none"` (requires_ocr) |
| `pdfType` | `digital` \| `scanned` \| `mixed` (classifier) \| `docx` \| `xlsx` |
| `pages`, `characters`, `words` | document totals (`pages: null` for Office formats) |
| `language` | placeholder heuristic (`en` / `unknown`) until Phase 2 |
| `structuredBy` | engine that produced the Final Structured Markdown: `opendataloader` \| `structurer` \| `markitdown` |
| `validation` | validation-stage report: `{ chosen, reason, candidates[] }` where each candidate is `{ engine, available, characters, headings, tables, valid, chosen, reason }` |
| `stageTimings` | ms per pipeline stage |
| `engines` | engine name → version (traceability); now includes `opendataloader-pdf` |
| `ocr` | **reserved `null`** — future OCR engine output |
| `parameters` | **reserved `null`** — future rule-engine parameter extraction |

**`StageArtifact` (each entry of `artifacts[]`)**

| Field | Notes |
|---|---|
| `stage` | `classification` \| `pdfplumber` \| `pymupdf` \| `normalized` \| `merged` \| `markitdown` \| `structurer` \| `opendataloader` \| `final` |
| `engine` | engine that produced the artifact (e.g. `opendataloader-pdf`) |
| `status` | `produced` \| `skipped` \| `failed` |
| `format` | `classification` \| `text` \| `markdown` \| `json` |
| `content` | text / markdown payload (when applicable) |
| `data` | structured payload: classification result, per-page merge stats, or the OpenDataLoader element JSON (with per-element bounding boxes — reserved as the Phase-2 Rule-Engine substrate) |
| `charCount`, `wordCount`, `tableCount` | per-artifact stats (when applicable) |
| `timingMs` | stage wall-clock time |
| `error` | populated when `status` is `failed` (e.g. OpenDataLoader unavailable) |

## Table: `files`

PDF blobs, isolated from `documents` so list queries never deserialize
binary data.

| Field | Type | Notes |
|---|---|---|
| `documentId` | string (UUID) | primary key, FK → `documents.id` |
| `blob` | Blob | the original uploaded PDF; source for viewer + processing |

---

## Entity relationship

```mermaid
erDiagram
    DOCUMENT ||--o| EXTRACTION : "has (after processing)"
    DOCUMENT ||--|| FILE : "stores blob"

    DOCUMENT {
        string id PK
        string filename
        number size
        number pages
        string status
        string uploadedAt
    }
    EXTRACTION {
        string documentId PK_FK
        string rawText
        string markdown
        array  pageWiseExtraction
        number processingTime
        object metadata
        string status
        string error
        string generatedAt
    }
    FILE {
        string documentId PK_FK
        blob   blob
    }
```

## Future expansion

- New tables (e.g. `parameters`, `assessments` for the rule engine) are
  added via `db.version(2).stores({...})` upgrades — never by mutating
  version 1.
- `metadata.ocr` / `metadata.parameters` are the designated slots for OCR
  and rule-engine outputs, so existing records stay valid.
- Migrating to a server database: the three tables map 1:1 onto
  `documents` / `extractions` collections plus object storage for blobs;
  `documentService` is the only seam to replace.
