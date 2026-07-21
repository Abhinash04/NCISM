# Architecture

Authoritative reference for the NCISM Assessment Platform foundation. Anything under
`docs/archive/` is historical and describes systems that no longer exist (or never did).

> **Scope note (2026-07):** the project is an **internal** review/validation portal wrapped around
> the completed extraction + assessment pipeline — NOT the public 9-role regulatory SaaS. Built
> **through Phase 6**: Postgres + JWT auth + RBAC (13 roles), the NCISM org hierarchy, the
> institutions master registry, the **full post-visitation case lifecycle** (visitor upload → allotted
> junior → engine → senior/board review → clarification (college) → hearings (President-appointed
> committee) → board meetings (secretariat) → final-order dispatch → Closed), **structured board
> outcomes + official letter/order generation** (3d), a **system-wide append-only audit log** (4),
> a **compliance/penalty ledger + monitoring** (5a), **reports/analytics + CSV export** (5b), a
> **multi-ruleset registry + activation + per-case resolution** (6a), an **async processing worker**
> (pg-boss, 6b), **RBAC-matrix + per-role E2E tests** (6c), and **TOTP MFA + frontend code-splitting**
> (6d). Design blueprint + roadmap:
> **[INTERNAL-PORTAL-BLUEPRINT.md](INTERNAL-PORTAL-BLUEPRINT.md)**; cold-start handoff:
> **[../HANDOFF.md](../HANDOFF.md)**. `docs/srs/` + `PROJECT_HANDOFF_KT_GAP_ANALYSIS.md` are the
> reference superset. **Phase 7a–7c:** UG Unani/Sowa-Rigpa + PG Ayurveda/Unani/Siddha rulesets
> authored/active (six with UG Ayurveda). **Remaining:** UG Siddha content + non-Ayurveda/PG extractor tuning.

## System overview

```
Browser (React SPA, :5173)
   │  Bearer JWT + httpOnly refresh cookie      Dexie (IndexedDB)
   │  multipart PDF / JSON over /api/v1         ▲  documents, artifacts, assessments
   ▼                                            │  (local store for the document workflow only)
Express backend (:3000)
   ├─ auth + RBAC ──────── authenticate → requirePermission/requireRole (per-request live perms)
   ├─ portal API ───────── institutions registry · admin console · CASE lifecycle + board meetings
   ├─ workflow guard ───── workflow.service (allowedActions / assertCan: status × role × ownership)
   ├─ extraction engine ── OpenDataLoader-PDF CLI (Python wrapper → Java core)
   │                        └─ Docling hybrid server (:5002, optional, --hybrid-fallback)
   ├─ assessment engine ── data/rulesets/<id>/<version>/  (rules + punitive policy JSON)
   └─ job repository ───── backend/temp/job_<id>/  (input.pdf, manifest.json, output/*)
        │
        ▼
   PostgreSQL (:5432, docker-compose)  ── auth/RBAC + institutions + org hierarchy + CASES
                                          (applications, clarifications, hearings, board meetings)
   backend/data/applications/<id>.pdf  ── raw uploaded case reports (gitignored; survives job purge)
```

Storage planes: **Postgres** holds identity, RBAC, the institution registry, and the **case
records** (applications + their events, clarifications, hearings, board meetings). The **disk job
repository** is the transient extraction workspace (a case runs the engine through a job, then
persists the resulting `report_markdown`/`report_json` onto the `applications` row — the source of
truth, immutable once approved). The legacy `/documents` workflow keeps its own disk job + **Dexie**
local store.

## Portal layer (Phases 0–5b)

A DB-backed governed multi-user layer wraps the pipeline. Built: authentication, RBAC (13 roles),
the NCISM org hierarchy, the institutions master registry, the **full case lifecycle**
(upload → review → clarification → hearing → board meeting → dispatch → Closed) driven by a
workflow-state guard, **structured board outcomes + official letter/order generation** (3d), a
**system-wide audit log** (4), a **compliance/penalty ledger + monitoring** (5a),
**reports/analytics + CSV export** (5b), a **multi-ruleset registry + activation + per-case
resolution** (6a), an **async pg-boss processing worker** (6b), **RBAC-matrix + per-role E2E** (6c),
and **TOTP MFA + code-splitting** (6d). **Phase 7a–7c:** UG Unani/Sowa-Rigpa + PG Ayurveda/Unani/Siddha
rulesets authored/active. Remaining (Planned): UG Siddha content + non-Ayurveda/PG extractor tuning.

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

**Roles (13 seeded).** The NCISM org tiers, the case-lifecycle actors, and the retained Phase-1
coarse roles:

| Role | Key | Responsibility |
|---|---|---|
| President | `president` | Apex authority; appoints hearing committees; decides |
| Board Member | `board_member` | Review/finalize; approve/reject/request clarification or hearing |
| Senior Consultant | `senior_consultant` | Supervises dealing staff; forwards/returns cases |
| Junior Consultant | `junior_consultant` | Dealing staff; processes allotted colleges, drafts, submits |
| Visitor | `visitor` | Uploads visitation reports → starts a case |
| College | `college` | External respondent (bound to one institution); answers clarifications |
| Hearing Committee | `hearing_committee` | Conducts appointed hearings; records minutes |
| Secretariat | `secretariat` | Assembles board meetings; dispatches final orders |
| Commission Observer | `commission_observer` | Read-only oversight across all cases |
| Administrator | `admin` | Users, roles, master data; **no business approval** (SoD) |
| Reviewer / Analyst / Viewer | `reviewer`,`analyst`,`viewer` | Retained Phase-1 maker/checker/auditor roles |

**Org reporting chain** (`users.supervisor_id`, self-FK): President → 2 Board Members → 2 Senior
Consultants → Junior teams (Team-1 → Gaurav Bhandari; Team-2 → Kritika). College users bind to an
institution via `users.institution_id`. ~25 users are seeded with **mock credentials** (see
[../AuthCred.md](../AuthCred.md)) + a bootstrap admin.

### Case lifecycle (workflow engine)

`services/workflow.service.js` is the single source of truth for **which action a user may take on a
case**, given `status × roles × ownership` — a pure `allowedActions(app, user, ctx)` + `assertCan`
(→ 403, or 423 when finalized). Both the transition endpoints and `GET /applications/:id/
allowed-actions` call it, so the UI (which renders action buttons **only** from `allowedActions`) and
the guard can never disagree. `application.service.buildContext` computes the ownership facts
(allotted/assigned junior, supervises submitter, college owner, hearing panel member).

**State machine** (`applications.status`):
```
uploaded → processing → processed → under_validation → senior_review → board_review
   │(err)                    ▲(return)          ▲(re-loop)     │
   └→ failed(retry)          └── clarification_open ─(college)→ clarification_responded
                                     ▲(board)                          │(junior submit)
board_review ─(board)→ request_hearing → hearing_requested ─(president)→ hearing_scheduled
                                                              (committee minutes)→ board_review
board_review ─(board)→ approved ─(secretariat dispatch)→ closed   ·   reject → rejected → revise
```
Ownership/scoping: junior queue = cases whose `(system,state)` ∈ their `staff_allotments`; senior =
cases submitted by a supervisee; board/president = board-review+decided; college = own institution;
committee = own hearing panel; secretariat = back-half cases; observer/admin = all. **SoD** is
enforced by the state→role guard (a junior can't decide; only the President appoints a committee;
only the Secretariat dispatches; a college can't touch another institution's case). Board meetings
are an **overlay** — the secretariat schedules a numbered meeting + agenda and confirms minutes; the
board decides cases with the normal actions.

**Structured outcomes + official letters (Phase 3d).** The board decision carries a structured
`outcome` (grant / grant-with-conditions / reduce-intake + `approved_seats` / deny), pre-seeded from
`report_json.punitiveSummary`. The clarification/hearing/dispatch actions **auto-generate the official
NCISM letters** — `services/letter.service.js` reproduces the approved formats (Clarification Letter,
Hearing Notice with/without prior clarification, Final Order) driven by the case institution, the
ruleset manifest (regulation + course via `utils/mesar-catalog.js`), `report_json.findings` (the
staff-shortcoming **tables** + percentages, reusing the reporter's row fields) and `punitiveSummary`
(outcome/seats/penalties). The actor edits the draft, issues it (stored in `letters`), and the
college sees it on its case; uncaptured subject fields render as `[[editable]]` markers.

**Audit (Phase 4).** `middlewares/audit.middleware.js` records **every successful write** (path-derived
entity/action + actor + status) to the append-only `audit_log`; `GET /audit` powers the Audit viewer.
The per-case `application_events` timeline remains the case-level view.

**Compliance/penalty ledger (Phase 5a).** On a board **approve**, `services/penalty.service.js`
`deriveForCase` reads `report_json.punitiveSummary.contributions` → auto `seat_reduction`/`denial`
penalty rows; the dealing junior adds **manual** `monetary` (₹25-lakh ghost-faculty) +
`teacher_code_revocation` penalties (the engine doesn't compute those) and tracks status through to
`compliance_status='complied'`. `penalties` table; `compliance:{read,manage}` perms; a **Penalties**
tab + a cross-case **Compliance** queue (`GET /penalties`).

**Reports/analytics (Phase 5b).** `services/report.service.js` runs **read-only Knex group-by
aggregations** over the live tables — no schema change, no snapshot table. `overview()` bundles:
headline KPIs (total/decided cases, avg days-to-decision, total seat reduction + monetary penalty),
status/outcome/`compliance_status` distributions, throughput (approvals per month from
`application_events`, open vs decided), by-system counts, the penalty ledger by `type × status`, and
top institutions by penalty. `exportCsv(dataset)` generates a `cases` | `penalties` CSV string
(escaped inline; no library). `GET /reports/overview` + `GET /reports/export` are both `report:read`
(seed 013 extends it to observer + secretariat). Frontend: a **Reports** page — KPI tiles, a
dependency-free `BarList` for distributions, tables, and Cases/Penalties CSV export.

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
│   ├── migrations/            001_auth_rbac … 009_penalties · 010_ruleset_versions · 011_user_mfa
│   └── seeds/                 001_rbac … 015_rulesets · 016_activate_ug_systems · 017_activate_pg_systems
│                              (RBAC, 672 institutions, org + lifecycle mock users, 6 rulesets active: UG Ay/Un/SR + PG Ay/Un/Si)
├── routes/                    thin HTTP layer — index mounts: /auth · /(extract) · /jobs · /assessments
│                              · /institutions · /admin · /applications · /meetings · /audit · /penalties · /reports · /rulesets
├── controllers/               auth · institution · org · application · meeting · audit · penalty · report · assessments · extract · jobs · health
├── services/
│   ├── auth.service.js        login / refresh / logout / me
│   ├── institution.service.js list/get/create/update · facets · importFromMarkdown (exception queue)
│   ├── workflow.service.js    case guard — allowedActions / assertCan (status × role × ownership)
│   ├── application.service.js case lifecycle: upload · process · submit · review · decide (+outcome) ·
│   │                          clarification · hearing · dispatch · delete · letters · buildContext
│   ├── letter.service.js      generates + issues the official letters/orders from the assessment result
│   ├── meeting.service.js     board meetings (create / agenda / confirm minutes)
│   ├── penalty.service.js     compliance ledger: derive (auto) + manual penalties + status rollup
│   ├── report.service.js      read-only analytics aggregations + CSV export (no schema change)
│   ├── audit.service.js       append-only audit record + query
│   ├── job.service.js         business ops over the repository; owns toJobDto()
│   ├── extraction.service.js  dispatches to the pipeline registered for a mimetype
│   ├── assessment.service.js  orchestrates engine run + artifact persistence
│   └── retention.service.js   hourly purge of jobs older than JOB_RETENTION_HOURS
├── repositories/
│   ├── user · token · institution · application · clarification · hearing · meeting · letter · penalty · audit
│   └── job.repository.js      disk implementation of the job storage contract
├── engines/
│   ├── extraction/            mimetype-keyed pipeline registry
│   │   └── pdf/               opendataloader.stage → reconstruction.stage → collect.stage
│   └── assessment/            extractors → evaluator(+checks) → punitive → reporter
├── middlewares/
│   ├── auth.middleware.js     authenticate (verify JWT + load live perms → req.user)
│   ├── rbac.middleware.js     requirePermission / requireRole (→ 403)
│   ├── audit.middleware.js    records every successful write → audit_log
│   └── upload.middleware.js   multer PDF validation
└── utils/                     jwt · api-error (ApiError) · master-data.parser · mesar-catalog · logger
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
`UNSUPPORTED_FILE_TYPE`, `JOB_NOT_FOUND`, `EXTRACTION_FAILED`, `ASSESSMENT_FAILED`. Portal +
workflow errors — **401** (`NO_TOKEN`/`INVALID_TOKEN`), **403** (missing role/permission, or
`ACTION_NOT_ALLOWED` for a disallowed transition), **409** (`INSTITUTION_EXISTS`), **423**
(`CASE_FINALIZED` — editing an approved/closed case).

**Portal endpoint groups** (all under `/api/v1`, behind `authenticate` except login/refresh):

| Group | Endpoints | Guard |
|---|---|---|
| Auth | `POST /auth/login` · `POST /auth/refresh` · `POST /auth/logout` · `GET /auth/me` | public / cookie |
| Institutions | `GET /institutions` · `GET /institutions/meta` · `GET /institutions/:id` | `institution:read` |
| Institutions (write) | `POST /institutions` · `PATCH /institutions/:id` · `POST /institutions/import` | `institution:create`/`:update` |
| Admin | `GET /admin/users` · `GET /admin/users/:id` · `GET /admin/roles` · `GET /admin/permissions` | `admin` + `user:manage`/`role:read` |
| Cases | `GET /applications` (role-scoped queue) · `POST /applications` (visitor upload) · `GET /applications/:id` · `/:id/allowed-actions` · `/:id/events` · `/:id/hearings` · `/:id/clarifications` | `application:create`/`:read` |
| Case transitions | `POST /applications/:id/{process,submit,review,decide,revise}` · `/request-hearing` · `/appoint-committee` · `/hearing/minutes` · `/dispatch` · `/clarification` · `/clarification/respond` · `DELETE /applications/:id` (uploader pre-processing or admin override) (`decide` carries `outcome`+`approvedSeats`) | per-action perm (workflow guard re-checks state×role×ownership) |
| Letters | `GET /applications/:id/letters` · `POST /applications/:id/letters/preview` `{kind}` | `application:read` |
| Compliance | `GET/POST /applications/:id/penalties` · `GET /penalties` · `PATCH /penalties/:id` | `compliance:read`/`:manage` |
| Meetings | `GET/POST /meetings` · `GET /meetings/:id` · `POST /meetings/:id/{items,confirm}` | `meeting:manage` (writes) |
| Audit | `GET /audit` (entity/actor/date filters) | `audit:read` |
| Reports | `GET /reports/overview` · `GET /reports/export?dataset=cases\|penalties` (CSV) | `report:read` |
| Rulesets | `GET /rulesets[/:id]` · `POST /rulesets/:id/activate` `{boardRef}` | `ruleset:read`/`:activate` |
| MFA | `POST /auth/mfa/login` · authed `POST /auth/mfa/{enroll,verify,disable}` | authenticated |

Institution/case list DTO: `{ success, rows[], … }`.

### Database (Postgres — high level)

19 domain tables via Knex migrations (+ knex bookkeeping + pg-boss's own `pgboss` schema):
auth/RBAC (with `users.mfa_*`) + registry + case lifecycle + letters + penalties + audit +
`ruleset_versions`.

```
users ──< user_roles >── roles ──< role_permissions >── permissions
  │  ├─ supervisor_id ─┐ (self-FK: org reporting chain)
  │  └─ institution_id ─→ institutions  (college users)
  ├──< refresh_tokens
  └──< staff_allotments (user × system × state routing)
institutions ──1:N── applications ──1:N── application_events (case timeline)
                          ├──1:N── clarifications · hearings ──1:N── hearing_members
                          ├──1:N── letters (clarification / hearing notice / final order)
                          └──1:N── penalties (seat_reduction / denial / monetary / revocation)
board_meetings ──1:N── board_meeting_items ──→ applications (agenda overlay)
audit_log (append-only: actor · action · entity · entity_id · status · created_at)
```

- **Auth/RBAC (6):** `users` (+`supervisor_id`, `institution_id`) · `roles` · `permissions`
  (35: `institution:*`, `application:*`, `clarification:*`, `hearing:*`, `meeting:manage`,
  `order:dispatch`, `compliance:{read,manage}`, `audit:read`, …) · `role_permissions` · `user_roles`
  · `refresh_tokens`.
- **Registry (2):** `institutions` (unique `institute_id`) · `staff_allotments`.
- **Cases (9):** `applications` (+`outcome`, `approved_seats`, `compliance_status`, `intake`, `level`,
  `permission_type`, `visitation_*`) · `application_events` · `clarifications` · `hearings` ·
  `hearing_members` · `board_meetings` · `board_meeting_items` · `letters` · `penalties`.
- **Governance (1):** `audit_log` (append-only).

## Frontend (`frontend/src/`)

**Role-prefixed portal** wrapping the original document workflow. After login the SPA redirects to
`/${primaryRole}/dashboard` (admin → `/admin/users`). `AuthContext` derives `primaryRole` from the
user's roles by priority (`admin > president > board_member > senior_consultant > junior_consultant
> secretariat > hearing_committee > commission_observer > visitor > college > reviewer > analyst >
viewer`).

Routes:
- Public: `/`, `/login`, `/403`.
- `/:role/*` (via `ProtectedRoute > RoleLayout`, which redirects if the URL role ≠ your primary
  role): `dashboard`, `profile`, `settings`, `about`, `institutions`, `institutions/:id`,
  `applications`, `applications/new`, `applications/:id`, `meetings`, `meetings/:id`, `compliance`,
  `audit`. The `DashboardLayout` sidebar branches per role and hides items by permission (e.g.
  Compliance shows only for `compliance:read` holders; Audit for `audit:read`).
- `/admin/*` (`ProtectedRoute roles={['admin']}`): `institutions` (registry), `institutions/import`,
  `institutions/:id`, `users`, `users/:userId`, `roles`, `permissions`, `compliance`, `audit`.
- Legacy document workflow (all roles): `/documents` → `/documents/:id` → `/pdf`, `/text`,
  `/structure`, `/metadata`, `/pipeline`, `/report`; `/documents/new` upload; `/history` +
  `/workspace/*` redirect. Retained alongside the case flow (ad-hoc extraction).

```
app/
├── App.jsx             router root + providers (react-query, theme, AuthProvider)
└── layouts/            DashboardLayout (role-branched sidebar nav), RoleLayout (/:role guard),
                        LandingLayout
pages/                  Landing, Dashboard, Profile, Settings, About, Login, Forbidden, NotFound
pages/institutions/     InstitutionsList (search + system/state filters + pagination),
                        InstitutionDetail, InstitutionImport
pages/applications/     ApplicationsList (role-scoped queue), ApplicationUpload (visitor +
                        intake/permission/visitation fields), ApplicationDetail (report +
                        clarifications + hearings + letters + penalties + timeline tabs; allowedActions
                        bar + outcome select + auto-drafted letter dialogs)
pages/meetings/         MeetingsList (secretariat create), MeetingDetail (agenda + confirm minutes)
pages/compliance/       ComplianceQueue (cross-case penalty ledger + status)
pages/audit/            AuditLog (filterable, paginated write trail)
pages/admin/            UsersList, UserDetail, RolesList, PermissionsList
pages/documents/        legacy pipeline UI (retained)
features/
├── auth/               AuthContext (+ primaryRole), ProtectedRoute, RoleGate, token-store, auth.api
├── institutions/       institution.api + hooks — TanStack Query
├── applications/       application.api + hooks (queue, detail, allowedActions, transitions,
│                       clarifications, hearings, committee-members, letters, penalties/compliance)
├── meetings/           meeting.api + hooks (list/get/create/addItem/confirm)
├── audit/              audit.api + useAuditLog
├── admin/              admin.api + hooks (users/roles/permissions)
├── documents/          legacy Dexie-backed workflow (DocumentPageLayout, useDocuments)
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

**Built (Phases 0–3):**

| Module | Where it lives |
| --- | --- |
| Auth / RBAC (13 roles) | `middlewares/auth+rbac`, `db/` (users/roles/permissions), `features/auth` |
| Org hierarchy | `users.supervisor_id`, seeds `003/005/006/008/010`, `staff_allotments` |
| Institutions registry + import | `institution.*`, `utils/master-data.parser`, `features/institutions` |
| Admin console | `routes/org.routes`, `controllers/org`, `pages/admin/*` |
| Role-prefixed portal | `app/layouts/RoleLayout`, `AuthContext.primaryRole` |
| **Case lifecycle + workflow guard** | `workflow.service`, `application.{service,repository,controller}`, `features/applications` |
| **Clarification cycle + college** | `clarification.repository`, seeds `008/009`, `ApplicationDetail` |
| **Hearings + board meetings + dispatch** | `hearing.repository`, `meeting.{service,repository,controller}`, `features/meetings` |
| **Structured outcomes + letter/order generation** | `letter.service`, `utils/mesar-catalog`, `letters` table, `ApplicationDetail` Letters tab |
| **Audit log** | `audit.middleware`, `audit.{service,repository}`, `features/audit`, `pages/audit` |
| **Compliance / penalty ledger** | `penalty.{service,repository,controller}`, `penalties` table, `ApplicationDetail` Penalties tab, `pages/compliance` |

**Extension points (designed for, not built):**

| Module | Where it slots in |
| --- | --- |
| DOCX/XLSX/image extraction | register a pipeline in `engines/extraction/index.js` |
| Cloud/object storage | new implementation of the job repository contract |
| New regulations (UG Siddha…) | new ruleset directory + `ruleset_versions` row + activation + a report template module in `reporter/templates/` (`resolveForCase` routes it automatically). Six rulesets active (UG Ay/Un/SR + PG Ay/Un/Si); only UG Siddha has no active ruleset (`NO_ACTIVE_RULESET`) |

**Partially built (Phase 7a–7c):** UG **Unani** + UG **Sowa-Rigpa** + PG **Ayurveda/Unani/Siddha**
rulesets are authored, templated, golden-tested, and active (six with UG Ayurveda). PG uses a
flat-standards model (no engine changes); guide:student + per-dept bed ratios stay report-driven.
**Remaining:** UG Siddha ruleset content and tuning the parameter extractors to real non-Ayurveda/PG
report layouts (today those params resolve `insufficient-data`; golden fixtures are synthetic). Then
notifications (8), production readiness (9), reports depth (10). See
[INTERNAL-PORTAL-BLUEPRINT.md](INTERNAL-PORTAL-BLUEPRINT.md) and [../HANDOFF.md](../HANDOFF.md).

## Domain sources

- `docs/srs/` — authoritative SRS (entities, workflows, roles, business rules, gap analysis).
  Unresolved client questions that gate the full punitive engine (HG-02: 5%-rule
  interpretation, equipment threshold) are documented there.
- `markdown/` — MESAR regulations, the punitive policy, the target MARB report format
  ("Assessment of Sardar Patel Ayurvedic Med. Coll. …"), and three filled college reports that
  seed the golden tests.
