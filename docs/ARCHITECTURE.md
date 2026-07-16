# Architecture

Authoritative reference for the NCISM Assessment Platform foundation. Anything under
`docs/archive/` is historical and describes systems that no longer exist (or never did).

> **Scope note (2026-07):** the project is an **internal** review/validation portal wrapped around
> the completed extraction + assessment pipeline — NOT the public 9-role regulatory SaaS. The portal
> **foundation is built through Phase 2**: Postgres + JWT auth + RBAC, the NCISM org hierarchy as
> loginable users, the institutions master registry + import, and a role-prefixed (`/:role/*`)
> portal + admin console (see the **Portal layer** section below). The design blueprint + phased
> roadmap is **[INTERNAL-PORTAL-BLUEPRINT.md](INTERNAL-PORTAL-BLUEPRINT.md)**; a cold-start handoff is
> **[../HANDOFF.md](../HANDOFF.md)**. `docs/srs/` + `PROJECT_HANDOFF_KT_GAP_ANALYSIS.md` are the
> reference superset. The post-visitation lifecycle (uploads-as-cases, review/hearing/board workflow,
> visitor/secretariat/college roles) is **Phase 3 — Planned**, not built.

## System overview

```
Browser (React SPA, :5173)
   │  Bearer JWT + httpOnly refresh cookie      Dexie (IndexedDB)
   │  multipart PDF / JSON over /api/v1         ▲  documents, artifacts, assessments
   ▼                                            │  (local store for the document workflow only)
Express backend (:3000)
   ├─ auth + RBAC ──────── authenticate → requirePermission/requireRole (per-request live perms)
   ├─ portal API ───────── institutions registry + import · admin users/roles/permissions
   ├─ extraction engine ── OpenDataLoader-PDF CLI (Python wrapper → Java core)
   │                        └─ Docling hybrid server (:5002, optional, --hybrid-fallback)
   ├─ assessment engine ── data/rulesets/<id>/<version>/  (rules + punitive policy JSON)
   └─ job repository ───── backend/temp/job_<id>/  (input.pdf, manifest.json, output/*)
        │
        ▼
   PostgreSQL (:5432, docker-compose)  ── auth/RBAC + institutions registry + org hierarchy
                                          (knex migrations + seeds; NOT the job/artifact store)
```

Two storage planes coexist: **Postgres** holds identity, RBAC, and the institution registry
(Phase 0–2); the **disk job repository** + **Dexie** still back the original document-processing
workflow. Assessment runs are not yet persisted as DB records — that is Phase 3 (Planned).

## Portal layer (Phases 0–2)

A DB-backed governed multi-user layer wraps the pipeline. Built: authentication, RBAC, the NCISM
org hierarchy, and the institutions master registry. Not built (Phase 3, Planned): the assessment
review lifecycle, uploads-as-cases, audit log, reports.

### Authentication & session flow

Local accounts only (admin-provisioned; no public registration). `bcryptjs` password hashes
(`BCRYPT_ROUNDS`, default 12). On `POST /auth/login`: a short-lived **access JWT** (`15m`, sent as
`Authorization: Bearer`) + a **refresh token** (`7d`, set as an httpOnly cookie and stored only as a
sha-256 hash in `refresh_tokens`). The SPA keeps the access token in memory; a 401 triggers one
silent `POST /auth/refresh` and replays the request; `POST /auth/logout` revokes the refresh token.
`GET /auth/me` returns the identity + roles + permission set. `utils/jwt.js` exposes
`signAccess` / `verifyAccess` / `newRefreshToken`.

### RBAC model

`role → permission`, where a permission is `resource:action` (e.g. `institution:create`). Users hold
one or more roles (`user_roles`); `role_permissions` maps roles → permissions. The `authenticate`
middleware (`middlewares/auth.middleware.js`) verifies the access token and loads the user's **live**
role+permission set **on every request** (so role changes take effect without re-login), attaching
`req.user = { id, email, name, status, roles[], permissions[] }`. `middlewares/rbac.middleware.js`
provides `requirePermission(...perms)` (→ 403) and `requireRole(...roles)` (→ 403). The frontend
`RoleGate`/`ProtectedRoute` are cosmetic; the backend re-checks every call.

**Roles (8 seeded).** The NCISM org tiers plus the retained Phase-1 coarse roles:

| Tier / role | Key | Notes |
|---|---|---|
| President | `president` | Apex authority (1 user: Dr. Mukul Patel) |
| Board Member | `board_member` | Review/finalize, sign letters (2 users) |
| Senior Consultant | `senior_consultant` | Supervises dealing staff; verifies assessments (2) |
| Junior Consultant | `junior_consultant` | Dealing staff; processes allotted colleges (12) |
| Administrator | `admin` | Users, roles, master data; **no business approval** (SoD) |
| Reviewer / Analyst / Viewer | `reviewer`,`analyst`,`viewer` | Retained Phase-1 maker/checker/auditor roles |

**Org reporting chain** (`users.supervisor_id`, self-FK): President → 2 Board Members → 2 Senior
Consultants → Junior teams (Team-1 → Gaurav Bhandari; Team-2 → Kritika). 17 org users are seeded
with **mock credentials** (see [../AuthCred.md](../AuthCred.md)) + a bootstrap admin.

### Institutions registry

`institutions` holds the full 672-college master (590 Ayurveda / 58 Unani / 17 Siddha /
7 Sowa-Rigpa). `utils/master-data.parser.js` parses the markdown master table (tolerant of `-`
placeholders and header typos; IDs `^(AYU|UNI|SID|SWR)\d{4}$`), collecting malformed rows into an
**exception queue** rather than throwing. Import is idempotent (`bulkUpsert` on `institute_id`).
`staff_allotments` (user × system × state) routes colleges to their dealing staff — the basis for
Phase-3 case routing. `POST /institutions/import` accepts a `.md`/`.csv` file or `{ text }`.

## Backend (`backend/`)

Layering: **routes → controllers → services → repositories / engines**. All `process.env`
reads live in `src/config/index.js` (dotenv, validated at boot). Central error middleware
returns `{success:false, error:{code, message}}` for every non-2xx.

```
src/
├── app.js / ../server.js      express assembly / bootstrap (starts retention service)
├── config/                    the only place env vars are read (incl. auth: jwt/bcrypt)
├── db/
│   ├── index.js               singleton Knex instance (+ assertConnection on boot)
│   ├── migrations/            001_auth_rbac · 002_institutions · 003_org_hierarchy
│   └── seeds/                 001_rbac · 002_bootstrap_admin · 003_org_roles ·
│                              004_institutions (672) · 005_org_users (17 + allotments)
├── routes/                    thin HTTP layer — index mounts:
│                              /auth · /(extract) · /jobs · /assessments · /institutions · /admin
├── controllers/               auth · institution · org (admin) · assessments · extract · jobs · health
├── services/
│   ├── auth.service.js        login / refresh / logout / me
│   ├── institution.service.js list/get/create/update · facets · importFromMarkdown (exception queue)
│   ├── job.service.js         business ops over the repository; owns toJobDto()
│   ├── extraction.service.js  dispatches to the pipeline registered for a mimetype
│   ├── assessment.service.js  orchestrates engine run + artifact persistence
│   └── retention.service.js   hourly purge of jobs older than JOB_RETENTION_HOURS
├── repositories/
│   ├── user.repository.js     users + roles + live permissions (findWithAccess, listUsers)
│   ├── token.repository.js    refresh-token hashing / lookup / revoke
│   ├── institution.repository.js  filter/paginate, facets, bulkUpsert
│   └── job.repository.js      disk implementation of the job storage contract
├── engines/
│   ├── extraction/            mimetype-keyed pipeline registry
│   │   └── pdf/               opendataloader.stage → reconstruction.stage → collect.stage
│   └── assessment/            extractors → evaluator(+checks) → punitive → reporter
├── middlewares/
│   ├── auth.middleware.js     authenticate (verify JWT + load live perms → req.user)
│   ├── rbac.middleware.js     requirePermission / requireRole (→ 403)
│   └── upload.middleware.js   multer PDF validation
└── utils/                     jwt, api-error (ApiError), master-data.parser, logger
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

**Extraction mode** (`EXTRACTION_MODE`, default `fast`): the native Java engine is the
default and recommended path for born-digital NCISM reports. Evidence
(`npm run check:benchmark`, AYU0659): fast = 3.2s, 20/20 pages, **32/32 assessment
parameters** vs the document-true fixture; hybrid = 34s, 15/20 pages (Docling *preprocess*
`std::bad_alloc` — every NCISM page carries a full-page background image, so triage routes
ALL pages to Docling and rasterization exhausts a 4 GB GPU), 16/32 parameters (its element
segmentation also differs from what the extractors are calibrated on). All fixtures,
reconstruction baselines and extractors are base-engine-calibrated — enabling hybrid for a
new document class requires re-validating via the benchmark check.

1. **opendataloader.stage** — spawns the CLI (`-f markdown,json,html --markdown-with-html`,
   plus `--hybrid docling-fast --hybrid-fallback` in hybrid mode), parses stdout for
   partial-success and derives failed pages from the element JSON's page coverage.
2. **retry.stage** (hybrid mode only) — when the Docling backend drops pages, reruns the CLI
   with the base Java engine into `output/base-retry/` and splices the missing pages'
   elements into the primary JSON; status becomes `success` with a warning naming the
   recovered pages (the HTML artifact stays partial).
3. **reconstruction.stage** — legacy markdown rebuild from the element JSON (kept for the
   regression baselines and `CDM_RENDERER=legacy`).
4. **cdm.stage** — builds the **Canonical Document Model** (`engines/extraction/cdm/`) and,
   by default (`CDM_RENDERER=cdm`), renders the structured markdown from it. The CDM is the
   semantic contract between extraction and the renderers/extractors — markdown/HTML are
   *views* of it, not the canonical format. Builder sub-stages (all generic, no NCISM
   specifics): **noise filter** (drops repeated page furniture and decorative duplicate
   headings — e.g. the off-page `3 T hi t ff` fragment that shadows `3. Teaching staff
   (Schedule-V)`), **section tree** (numbering-grammar hierarchy), **row regrouper**
   (flattened blocks → forms / pseudo-tables by y-band; refuses low-confidence
   reconstructions so pathological interleaved blocks render as readable paragraphs rather
   than garbage tables), **table normalizer** (expand row/colspans to a logical grid, flatten
   header paths to column names, cross-page stitching with rowspan carry-forward, note
   attachment). Persisted as the `cdm.json` artifact.
5. **collect.stage** — loads produced artifacts (`cdm.json` handled by name — it is also a
   `.json`).

Assessment extractors read structured data (element-JSON tables, functioning-table rows,
section-2.8/2.9 form fields, the assessment-parameter table for document-derived observations)
rather than regexing markdown, so the renderer choice never changes extracted values.

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
`EXTRACTION_FAILED`, `ASSESSMENT_FAILED`. Portal endpoints add auth errors — **401** (no/invalid
token, `NO_TOKEN`/`INVALID_TOKEN`), **403** (missing role/permission), **409** (`INSTITUTION_EXISTS`).

**Portal endpoint groups** (all under `/api/v1`, behind `authenticate` except login/refresh):

| Group | Endpoints | Guard |
|---|---|---|
| Auth | `POST /auth/login` · `POST /auth/refresh` · `POST /auth/logout` · `GET /auth/me` | public / cookie |
| Institutions | `GET /institutions` (system/state/q + page) · `GET /institutions/meta` · `GET /institutions/:id` | `institution:read` |
| Institutions (write) | `POST /institutions` · `PATCH /institutions/:id` · `POST /institutions/import` | `institution:create`/`:update` |
| Admin | `GET /admin/users` · `GET /admin/users/:id` · `GET /admin/roles` · `GET /admin/permissions` | `admin` + `user:manage`/`role:read` |

Institution list DTO: `{ success, rows[], total, page, limit }`. **Planned (Phase 3):** uploads,
assessment lifecycle transitions, issues, audit, reports endpoints (see the blueprint §10).

### Database (Postgres — high level)

10 tables via Knex migrations. Auth/RBAC + registry only; assessment/audit/ruleset tables are
Phase-3 Planned.

```
users ──< user_roles >── roles ──< role_permissions >── permissions
  │  └─ supervisor_id ─┐ (self-FK: org reporting chain)
  └──< refresh_tokens  │
  └──< staff_allotments (user × system × state routing)
institutions  (672 master rows: institute_id, system, state, name, file_number, email, contact)
```

- `users` (email, name, password_hash, status, supervisor_id) · `roles` (key) · `permissions`
  (key = resource:action) · `role_permissions` · `user_roles` · `refresh_tokens` (token_hash,
  expires_at, revoked_at).
- `institutions` (unique `institute_id`, `system` enum, indexed by `(system,state)` + `state`).
- `staff_allotments` (user_id → system+state, unique per triple).

## Frontend (`frontend/src/`)

**Role-prefixed portal** wrapping the original document workflow. After login the SPA redirects to
`/${primaryRole}/dashboard` (admin → `/admin/users`). `AuthContext` derives `primaryRole` from the
user's roles by priority (`admin > president > board_member > senior_consultant > junior_consultant
> reviewer > analyst > viewer`).

Routes:
- Public: `/`, `/login`, `/403`.
- `/:role/*` (via `ProtectedRoute > RoleLayout`, which redirects if the URL role ≠ your primary
  role): `dashboard`, `profile`, `settings`, `about`, `institutions`, `institutions/:id`.
- `/admin/*` (`ProtectedRoute roles={['admin']}`): `institutions` (registry), `institutions/import`,
  `institutions/:id`, `users`, `users/:userId`, `roles`, `permissions`.
- Legacy document workflow (all roles): `/documents` → `/documents/:id` → `/pdf`, `/text`,
  `/structure`, `/metadata`, `/pipeline`, `/report`; `/documents/new` upload; `/history` +
  `/workspace/*` redirect. Folds under `/:role/application/:id/*` in Phase 3 (Planned).

```
app/
├── App.jsx             router root + providers (react-query, theme, AuthProvider)
└── layouts/            DashboardLayout (role-branched sidebar nav), RoleLayout (/:role guard),
                        LandingLayout
pages/                  Landing, Dashboard, Profile, Settings, About, Login, Forbidden, NotFound
pages/institutions/     InstitutionsList (search + system/state filters + pagination),
                        InstitutionDetail (identity card; assessment-history stub), InstitutionImport
pages/admin/            UsersList, UserDetail, RolesList, PermissionsList
pages/documents/        DocumentsList, DocumentDetails, Pdf/Text/Structure/Metadata/Pipeline/Report,
                        UploadProcessing (legacy pipeline UI, retained)
features/
├── auth/               AuthContext (+ primaryRole), ProtectedRoute, RoleGate, token-store, auth.api
├── institutions/       institution.api + hooks (useInstitutions/useInstitution/useInstitutionMeta,
│                       useImportInstitutions) — TanStack Query
├── admin/              admin.api + hooks (useOrgUsers/useOrgUser/useRoles/usePermissions)
├── documents/          DocumentPageLayout, ArtifactsTable, WarningsBanner, upload zone, health
│                       widget, useDocuments (Dexie live query)
└── workspace/          reusable viewers: PdfViewer, JsonViewer, DocumentOutline, useJob/useArtifact
components/             shared: ui/ (shadcn), common/, markdown/MarkdownRenderer
lib/                    api/client (axios + Bearer interceptor + silent refresh), api/endpoints,
                        Dexie schema + documents repository, format/download/slug helpers
hooks/                  cross-feature hooks (useHealthCheck)
```

Server data (auth, institutions, admin) goes through the axios `apiClient` + TanStack Query; the
legacy document workflow keeps its Dexie/IndexedDB local store.

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

## Built vs planned modules

**Built (Phases 0–2):**

| Module | Where it lives |
| --- | --- |
| Auth / RBAC | `middlewares/auth+rbac`, `db/` (users/roles/permissions), `features/auth` |
| Org hierarchy | `users.supervisor_id`, seed `005_org_users`, `staff_allotments` |
| Institutions registry + import | `institution.{repository,service,controller}`, `utils/master-data.parser`, `features/institutions` |
| Admin console | `routes/org.routes`, `controllers/org`, `pages/admin/*` |
| Role-prefixed portal | `app/layouts/RoleLayout`, `AuthContext.primaryRole` |

**Extension points (designed for, not built):**

| Module | Where it slots in |
| --- | --- |
| DOCX/XLSX/image extraction | register a pipeline in `engines/extraction/index.js` |
| Cloud/object storage for artifacts | new implementation of the job repository contract |
| Rule management & versioning UI | rulesets are already versioned directories; add CRUD over `data/rulesets/` |
| New regulations (Unani, Siddha, PG…) | new ruleset directory + report template registration in `reporter/templater.js` |
| Report export (DOCX/PDF) | consume the `report` artifact or `AssessmentResult` JSON |

**Planned — Phase 3 (post-visitation lifecycle; NOT built):** uploads-as-cases + an `applications`/
`assessments` DB state machine (Draft→…→Approved/Archived), the review workflow (maker-checker
submit/approve/reject), clarification + hearing letters, board meetings + decisions, audit log,
reports/analytics. New roles: **visitor, secretariat, hearing_committee, college,
commission_observer**. Pipeline routing change (visitor uploads the 20–50pg report + selects
region → routes to the allotted junior consultant via `staff_allotments`). See
[INTERNAL-PORTAL-BLUEPRINT.md](INTERNAL-PORTAL-BLUEPRINT.md) and [../HANDOFF.md](../HANDOFF.md).

## Domain sources

- `docs/srs/` — authoritative SRS (entities, workflows, roles, business rules, gap analysis).
  Unresolved client questions that gate the full punitive engine (HG-02: 5%-rule
  interpretation, equipment threshold) are documented there.
- `markdown/` — MESAR regulations, the punitive policy, the target MARB report format
  ("Assessment of Sardar Patel Ayurvedic Med. Coll. …"), and three filled college reports that
  seed the golden tests.
