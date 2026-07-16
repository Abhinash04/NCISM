# NCISM Assessment Portal — Developer Handoff (end of Phase 3)

> Cold-start context for a new developer or AI agent. Describes **only what exists in the codebase
> today** (Phases 0–3 — the full post-visitation case lifecycle is built). Items tagged **Planned**
> are not yet implemented (Phase 3d/4/5/6). Companion docs: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) (as-built reference),
> [docs/INTERNAL-PORTAL-BLUEPRINT.md](docs/INTERNAL-PORTAL-BLUEPRINT.md) (design blueprint + roadmap),
> [AuthCred.md](AuthCred.md) (mock logins), [backend/src/engines/extraction/cdm/](backend/src/engines/extraction/cdm/)
> (pipeline internals; a `CDM-RECONSTRUCTION.md` write-up exists on `main`), [docs/srs/](docs/srs/)
> (regulatory reference superset).

---

## 1. Project overview

An **internal** review/validation web portal for NCISM's Medical Assessment & Rating Board (MARB-ISM)
for Indian Systems of Medicine (Ayurveda, Unani, Siddha, Sowa-Rigpa). It wraps a **governed
multi-user portal** (auth, RBAC, org hierarchy, institution registry, and the **full case
lifecycle** — visitor upload → junior processing → senior/board review → clarification cycle →
hearings → board meetings → final-order dispatch → Closed) around an already-complete
**document-processing + assessment engine** (PDF → structured markdown → deterministic MARB
assessment report). Not the public 9-role regulatory SaaS described in `docs/srs/` — that is the
reference superset, not the build target.

- **Backend:** Node.js + Express, PostgreSQL via Knex. Prefix `/api/v1`, port 3000.
- **Frontend:** React 19 + Vite + react-router + TanStack Query + shadcn/ui + Tailwind. Port 5173.
- **DB:** PostgreSQL 16 via `docker-compose.yml`.
- **Branch:** `abhi-dev`.

## 2. Current implementation status

| Area | Status |
|---|---|
| Document extraction pipeline (OpenDataLoader → CDM → structured markdown) | ✅ Built (pre-portal) |
| Deterministic assessment engine (extractors → evaluator → punitive → MARB report) | ✅ Built (pre-portal) |
| PostgreSQL + Knex migrations/seeds | ✅ Phase 0 |
| JWT auth (access + refresh) + bcrypt | ✅ Phase 1 |
| RBAC (roles, permissions, guards) | ✅ Phase 1 |
| Role-prefixed portal shell + admin console | ✅ Phase 1/2 |
| Institutions master registry (672) + import | ✅ Phase 2 |
| NCISM org hierarchy (supervisor chain, allotments) | ✅ Phase 2 |
| Case model + workflow guard + review chain (upload→process→senior→board) | ✅ Phase 3a |
| Clarification cycle + college role | ✅ Phase 3b |
| Hearings + board meetings + final-order dispatch → Closed | ✅ Phase 3c |
| 13 roles incl. visitor/college/hearing_committee/secretariat/observer | ✅ Phase 3 |
| Compliance/penalty tracking + template validation | 🔜 Phase 3d — Planned |
| Audit log / reports / ruleset editor DB tables | 🔜 Phase 4–6 — Planned |

## 3. Completed phases

- **Phase 0 — Foundation:** Postgres + Knex, config/env, `db/index.js` singleton. (The disk-based
  `job.repository` is retained for the document workflow; it was **not** migrated to DB.)
- **Phase 1 — Auth + RBAC + shell:** `users`/`roles`/`permissions`/`user_roles`/`role_permissions`/
  `refresh_tokens`; local login (bcrypt, JWT access+refresh); `authenticate` + `requirePermission`/
  `requireRole`; React `AuthContext`/`ProtectedRoute`/`RoleGate`, app shell.
- **Phase 2 — Institutions + Org hierarchy + role portal:** `institutions` (672) + `staff_allotments`
  + `users.supervisor_id`; markdown import w/ exception queue; org tiers seeded; 17 org users (mock
  creds) + reporting chain; `/:role/*` portal + `/admin/*` console.
- **Phase 3 — Post-visitation case lifecycle** (three slices):
  - **3a** — `applications` + `application_events`; `workflow.service` guard (allowedActions/
    assertCan); visitor upload → route to allotted junior → `process` (runs the engine, persists
    the report) → junior submit → senior forward/return → board approve/reject. Role `visitor`.
  - **3b** — clarification cycle: board `request_clarification` → college responds → junior
    re-examines → back up the chain. Role `college` (bound to an institution via
    `users.institution_id`); `clarifications` table.
  - **3c** — hearings (board `request_hearing` → President `appoint_committee` → committee
    `record_minutes` → board), board meetings (secretariat overlay: schedule + agenda + confirm),
    final-order `dispatch` → `closed`. Roles `hearing_committee`, `secretariat`,
    `commission_observer`; `hearings`/`hearing_members`/`board_meetings`/`board_meeting_items`.

## 4. Remaining phases (Planned)

- **Phase 3d (optional):** compliance/penalty tracking + letter/order **template validation** +
  dispatch log.
- **Phase 4 — Audit + history:** generalized append-only `audit_log` interceptor (the per-case
  `application_events` timeline already exists; this generalizes it system-wide).
- **Phase 5 — Reports/analytics:** compliance/punitive summaries, throughput, exports.
- **Phase 6 — Admin hardening:** ruleset version editor + activation (SoD); **non-Ayurveda rulesets**
  (Unani/Siddha/Sowa-Rigpa/PG); RBAC matrix tests, per-role E2E. See blueprint §6.

## 5. System architecture

```
Browser (React SPA, :5173)
   │  Bearer access JWT (memory) + httpOnly refresh cookie
   │  multipart PDF / JSON over /api/v1
   ▼
Express backend (:3000)
   ├─ authenticate → requirePermission/requireRole      (RBAC, live per-request perms)
   ├─ workflow.service                                  (case guard: status × role × ownership)
   ├─ portal API: institutions · admin · CASES (applications) · board meetings
   ├─ extraction engine → OpenDataLoader-PDF CLI (+ optional Docling hybrid :5002)
   ├─ assessment engine → data/rulesets/<id>/<version>/
   └─ job repository → backend/temp/job_<id>/          (transient extraction workspace)
        │
        ▼
   PostgreSQL (:5432)  — auth/RBAC + institutions + org hierarchy + CASE records
                         (applications, clarifications, hearings, board meetings)
   backend/data/applications/<id>.pdf  — raw uploaded case PDFs (gitignored)
   Dexie (browser)     — local store for the legacy /documents workflow only
```

A case runs the engine through a disk job, then persists `report_markdown`/`report_json` onto its
`applications` row (the source of truth, immutable once approved). Legacy `/documents` keeps its own
disk job + Dexie store.

## 6. RBAC hierarchy

**Model:** `role → permission` (`resource:action`); users hold ≥1 role; guards re-check on the
backend for every request; the **case** guard (`workflow.service`) further constrains by
status × ownership. **13 roles seeded:**

| Role key | Tier | Core responsibility |
|---|---|---|
| `president` | Apex | Final authority; appoints hearing committees; decides |
| `board_member` | Signatory | Review/finalize; approve/reject/request clarification or hearing |
| `senior_consultant` | Supervisory | Supervises dealing staff; forwards/returns cases |
| `junior_consultant` | Dealing staff | Processes allotted colleges; drafts + submits |
| `visitor` | External-ish | Uploads visitation reports → starts a case |
| `college` | External | Bound to one institution (`users.institution_id`); answers clarifications |
| `hearing_committee` | Panel | Conducts appointed hearings; records minutes |
| `secretariat` | Support | Assembles board meetings; dispatches final orders |
| `commission_observer` | Oversight | Read-only across all cases |
| `admin` | System | Users, roles, master data; **no business approval** (SoD) |
| `reviewer`/`analyst`/`viewer` | Phase-1 coarse | Retained maker/checker/auditor roles |

**Org chart (`users.supervisor_id`):**
```
President (Mukul Patel)
├── Board Member: B. L. Mehra ──── Senior: Gaurav Bhandari ── Team-1: Sunil, Tanya, Smarnika,
│                                                                       Akshay, Shubhangi, Mitali
└── Board Member: Sushrut Kanaujia ─ Senior: Kritika ──────── Team-2: Pooja, Divesh Rana, Dheeraj,
                                                                        Ritu Saini, Abdulla, Steave
```

**Permission catalogue (33):** `institution:{create,read,update,delete}`, `assessment:*` (legacy),
`application:{create,read,process,submit,review,decide}`, `clarification:{issue,respond}`,
`hearing:{appoint,conduct}`, `meeting:manage`, `order:dispatch`, `issue:{read,resolve}`,
`user:manage`, `role:read`, `ruleset:{read,create,activate}`, `report:read`, `audit:read`. Per-role
bundles seeded across `001_rbac`, `003_org_roles`, `006_application_rbac`, `008_college_rbac`,
`010_hearing_meeting_rbac`.

**Case guard (`workflow.service`):** `allowedActions(app, user, ctx)` returns the actions a user may
take given `status × roles × ownership`; `assertCan` throws **403** (`ACTION_NOT_ALLOWED`) or **423**
(`CASE_FINALIZED`). The frontend renders action buttons **only** from `/allowed-actions` — no role
literals in the UI. **SoD** examples enforced: a junior can't decide; only the President appoints a
committee; only the Secretariat dispatches; a college can't touch another institution's case; admin
holds no business-approval perms.

## 7. Authentication flow

1. `POST /auth/login {email,password}` → bcrypt verify → returns `{ accessToken, user }` and sets an
   httpOnly refresh cookie. Access JWT TTL `15m`; refresh TTL `7d` (stored only as sha-256 hash in
   `refresh_tokens`).
2. SPA keeps the access token **in memory** (`features/auth/token-store`); axios `apiClient`
   attaches `Authorization: Bearer`.
3. On 401, the client does one silent `POST /auth/refresh` (bare axios, cookie-based), replays the
   original request; on failure it clears the token and redirects to `/login`.
4. `POST /auth/logout` revokes the refresh token. `GET /auth/me` returns identity + roles + perms.
5. `authenticate` middleware loads **live** roles+permissions from the DB every request (role changes
   take effect without re-login).

Files: `services/auth.service.js`, `controllers/auth.controller.js`, `middlewares/auth.middleware.js`,
`utils/jwt.js`, `repositories/{user,token}.repository.js`; frontend `features/auth/*`.

## 8. Routing architecture (frontend)

- **Public:** `/`, `/login`, `/403`.
- **`/dashboard`** → redirect to `/${primaryRole}/dashboard` (admin → `/admin/users`).
- **`/:role/*`** (`ProtectedRoute > RoleLayout`; RoleLayout redirects if URL role ≠ your primary
  role): `dashboard`, `profile`, `settings`, `about`, `institutions`, `institutions/:id`,
  `applications`, `applications/new`, `applications/:id`, `meetings`, `meetings/:id`. The
  `DashboardLayout` sidebar branches per role (secretariat → Meetings; committee → Hearings;
  college → own cases only; observer → read-only; board/president → Cases + Meetings).
- **`/admin/*`** (`ProtectedRoute roles={['admin']}`): `institutions` (registry),
  `institutions/import`, `institutions/:id`, `users`, `users/:userId`, `roles`, `permissions`.
- **Legacy documents (all roles):** `/documents`, `/documents/:id`, `/pdf|text|structure|metadata|
  pipeline|report`, `/documents/new`; `/history` + `/workspace/*` redirect. Retained for ad-hoc
  extraction alongside the case flow.

`primaryRole` priority: `admin > president > board_member > senior_consultant > junior_consultant >
secretariat > hearing_committee > commission_observer > visitor > college > reviewer > analyst >
viewer` (`features/auth/AuthContext.jsx`).

## 9. Backend module overview (`backend/src/`)

```
app.js / ../server.js   express assembly / bootstrap (asserts DB connection, starts retention)
config/index.js         only place env is read (adds auth: jwtSecret, TTLs, bcryptRounds)
db/index.js             singleton Knex; db/migrations (001–006); db/seeds (001–011)
routes/index.js         mounts /auth /(extract) /jobs /assessments /institutions /admin
                        /applications /meetings  (+ /health)
controllers/            auth · institution · org · application · meeting · assessments · extract · jobs · health
services/               auth · institution · workflow · application · meeting · job · extraction · assessment · retention
repositories/           user · token · institution · application · clarification · hearing · meeting · job (disk)
middlewares/            auth (authenticate) · rbac (requirePermission/requireRole) · upload (multer)
engines/                extraction (OpenDataLoader→CDM) · assessment (extractors→evaluator→punitive→reporter)
utils/                  jwt · api-error (ApiError) · master-data.parser · logger
```

- **Layering:** routes → controllers → services → repositories / engines.
- **Errors:** central middleware → `{ success:false, error:{ code, message, details? } }`.
  `ApiError.{badRequest(400),unauthorized(401),forbidden(403),notFound(404),conflict(409),…}`.
- **Engines are reused, never rewritten** by the portal layer.

## 10. Frontend module overview (`frontend/src/`)

```
app/App.jsx             router + providers (QueryClient, ThemeProvider, AuthProvider)
app/layouts/            DashboardLayout (role-branched nav) · RoleLayout (/:role guard) · LandingLayout
pages/                  Landing · Login · Forbidden · Dashboard · Profile · Settings · About · NotFound
pages/institutions/     InstitutionsList (filters+pagination) · InstitutionDetail · InstitutionImport
pages/applications/     ApplicationsList (role queue) · ApplicationUpload (visitor) · ApplicationDetail
                        (report + clarifications + hearings + timeline tabs; allowedActions bar)
pages/meetings/         MeetingsList (create) · MeetingDetail (agenda + confirm minutes)
pages/admin/            UsersList · UserDetail · RolesList · PermissionsList
pages/documents/        legacy document workflow pages (retained)
features/auth/          AuthContext(+primaryRole) · ProtectedRoute · RoleGate · token-store · auth.api
features/institutions/  institution.api · hooks
features/applications/  application.api · hooks (queue/detail/allowedActions/transitions/
                        clarifications/hearings/committee-members)
features/meetings/      meeting.api · hooks (list/get/create/addItem/confirm)
features/admin/         admin.api · hooks (useOrgUsers/useOrgUser/useRoles/usePermissions)
features/documents/     + features/workspace/ (legacy Dexie-backed workflow + reusable viewers)
components/ui/          shadcn primitives (table, select, input, card, badge, …)
lib/api/                client (axios + Bearer + silent refresh) · endpoints
```

- **Server data** (auth/institutions/admin) → axios `apiClient` + TanStack Query.
- **Local data** (legacy documents) → Dexie/IndexedDB `useDocuments`.
- **UI gating** via `RoleGate`/`ProtectedRoute` is cosmetic; backend re-checks all permissions.

## 11. Database overview

15 domain tables (Knex; + knex bookkeeping). Auth/RBAC + registry + case lifecycle.

```
users ──< user_roles >── roles ──< role_permissions >── permissions
  │  ├─ supervisor_id ──┐  (self-FK: org reporting chain)
  │  └─ institution_id ─→ institutions   (college users)
  ├──< refresh_tokens
  └──< staff_allotments   (user × system × state routing)
institutions ──1:N── applications ──1:N── application_events
                          ├──1:N── clarifications
                          └──1:N── hearings ──1:N── hearing_members
board_meetings ──1:N── board_meeting_items ──→ applications
```

| Group | Tables |
|---|---|
| Auth/RBAC (6) | `users` (+`supervisor_id`, `institution_id`) · `roles` · `permissions` · `role_permissions` · `user_roles` · `refresh_tokens` |
| Registry (2) | `institutions` (unique `institute_id`) · `staff_allotments` |
| Cases (7) | `applications` (institution_id, system, state, session, `status` enum, job_id, report_markdown/json, decision, actor FKs) · `application_events` · `clarifications` (round: letter+response) · `hearings` · `hearing_members` · `board_meetings` · `board_meeting_items` |

**[Planned — Phase 4+]:** `audit_log`, `ruleset_versions`, report tables.

## 12. Document-processing pipeline (built, pre-portal)

```
Upload → OpenDataLoader-PDF extraction (Java engine; optional Docling hybrid)
       → semantic reconstruction (Canonical Document Model)
       → canonical Markdown + JSON
       → parameter extraction (precision-first: found|missing + provenance)
       → rule evaluation (versioned rulesets + check handlers)
       → punitive policy engine (auditable contributions ledger)
       → MARB assessment report
```

- Deterministic (no AI). Extractors read structured data, not regex over markdown.
- Rulesets: `backend/data/rulesets/<id>/<version>/` (rules + punitive policy JSON).
- Golden tests: `npm test` (fixtures AYU0659/AYU0265/AYU0038 → asserted punitive totals + report
  snapshots). Pipeline internals: `backend/src/engines/extraction/cdm/` (CDM builder sub-stages).
- **Wired to the case flow (Phase 3):** `application.service.process` runs the engine synchronously
  (create job → extract → assess) and persists `report_markdown`/`report_json` onto the case. The
  legacy `/documents` route still runs the same engine ad-hoc. **Only the Ayurveda-UG ruleset exists**,
  so non-Ayurveda cases upload/route fine but `process` fails loudly (`status = failed`) — documented
  limit, not a bug.

## 13. API summary (`/api/v1`)

| Group | Status | Endpoints |
|---|---|---|
| Health | ✅ | `GET /health` |
| Auth | ✅ | `POST /auth/login` · `POST /auth/refresh` · `POST /auth/logout` · `GET /auth/me` |
| Institutions | ✅ | `GET /institutions` (system/state/q + page) · `GET /institutions/meta` · `GET /institutions/:id` · `POST /institutions` · `PATCH /institutions/:id` · `POST /institutions/import` |
| Admin | ✅ | `GET /admin/users` · `GET /admin/users/:id` · `GET /admin/roles` · `GET /admin/permissions` |
| Cases | ✅ | `GET /applications` (role-scoped queue) · `POST /applications` (visitor upload) · `GET /applications/:id` · `/:id/{allowed-actions,events,hearings,clarifications}` · `GET /applications/committee-members` |
| Case transitions | ✅ | `POST /applications/:id/{process,submit,review,decide,revise,request-hearing,appoint-committee,hearing/minutes,dispatch}` · `POST /:id/clarification` · `POST /:id/clarification/respond` |
| Meetings | ✅ | `GET/POST /meetings` · `GET /meetings/:id` · `POST /meetings/:id/{items,confirm}` |
| Extraction/Jobs | ✅ | `POST /extract` · `GET /jobs/:id` · `POST /assessments` (engine run) |
| Reports / Audit / Rulesets | 🔜 Planned | Phase 4–6; see blueprint §10 |

**Guards:** institution read/write per `institution:*`; admin group per `admin` + `user:manage`/
`role:read`; case transitions per `application:*`/`clarification:*`/`hearing:*`/`order:dispatch`,
re-checked by the workflow guard. **Error codes:** 401 (`NO_TOKEN`/`INVALID_TOKEN`), 403
(`ACTION_NOT_ALLOWED` / missing perm), 404, 409 (`INSTITUTION_EXISTS`), 423 (`CASE_FINALIZED`), 400
(`VALIDATION_ERROR`).

## 14. Environment / configuration

Backend `.env` (loaded from `backend/.env`):

| Var | Default | Purpose |
|---|---|---|
| `PORT` | 3000 | API port |
| `DATABASE_URL` | — | Postgres connection (else POSTGRES_* fallbacks in `knexfile.js`) |
| `JWT_SECRET` | `dev-only-change-me` | JWT signing secret (**change in prod**) |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | `15m` / `7d` | token lifetimes |
| `BCRYPT_ROUNDS` | 12 | password hash cost |
| `CORS_ORIGIN` | `http://localhost:5173` | SPA origin |
| `EXTRACTION_MODE` | `fast` | `fast` (Java) or `hybrid` (Docling) |
| `CDM_RENDERER` | `cdm` | `cdm` or `legacy` markdown render |
| `OPENDATALOADER_CLI_PATH` | Windows path | extraction CLI |
| `HYBRID_SERVER_URL` | `http://localhost:5002` | Docling hybrid server (hybrid mode) |
| `JOB_RETENTION_HOURS` / `KEEP_JOBS` / `MAX_UPLOAD_MB` | 24 / false / 100 | job store |
| Seed-only: `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `MOCK_PASSWORD` | `admin@ncism.local` / `ChangeMe123!` / `Password123` | bootstrap admin + org-user mock creds (actual logins: [AuthCred.md](AuthCred.md)) |

Frontend: `VITE_API_URL` (e.g. `http://localhost:3000/api/v1`).

**Bring-up:**
```
docker compose up -d db          # Postgres 16
cd backend && npm install
npm run db:setup                 # migrate + seed (idempotent) → 672 institutions, ~25 users
npm start                        # API on :3000
cd ../frontend && npm install && npm run dev   # SPA on :5173
```
Logins: [AuthCred.md](AuthCred.md). Backend tests: `cd backend && npm test` (61 pass).

## 15. Known limitations

- **Only the Ayurveda-UG ruleset exists** — non-Ayurveda cases upload/route fine but `process` fails
  (`status = failed`). Adding Unani/Siddha/Sowa-Rigpa/PG rulesets is Phase 6.
- **Processing is synchronous inline** — `application.service.process` runs the engine in-request
  (~3–35s); no async worker/queue yet.
- **No generalized audit log** — every case transition writes an `application_events` row (per-case
  timeline), but a system-wide append-only `audit_log` is Phase 4.
- **Compliance/penalty tracking + letter/order template validation** not built (order/letter text is
  free-form) — Phase 3d.
- **Mock credentials:** org users use `MOCK_PASSWORD` (seed default `Password123`); bootstrap admin
  uses `ADMIN_PASSWORD` (code default `ChangeMe123!`). Note: pre-existing users keep their original
  hash (the seed doesn't clobber), so the actual value can drift from the default — the authoritative
  logins are in [AuthCred.md](AuthCred.md) (untracked). Placeholders — replace before any non-local use.
- **Institution `name` keeps the full address inline**; source-data quirks (typo state names) are
  preserved as-is (`/institutions/meta` surfaces exactly what's filterable).
- **No MFA** (config is MFA-ready). `JWT_SECRET` default is dev-only.
- **Frontend bundle** is a single large chunk (build warns >500 kB); code-splitting deferred.
- Phase-1 roles (`reviewer`/`analyst`/`viewer`) are retained but unused by org users.

## 16. Pending work (next: Phase 3d / Phase 4)

- **Phase 3d (optional):** compliance/penalty ledger; letter/order **template validation** (dates,
  session, copy-to) + a dispatch log.
- **Phase 4 — audit:** add an append-only `audit_log` interceptor over every mutation (generalize
  `application_events`); assessment + institution timelines/aggregate views.
- **Hardening backlog:** move processing to an **async worker/queue** (pg-boss/BullMQ); add
  **non-Ayurveda rulesets**; RBAC-matrix + per-role E2E tests; code-split the frontend bundle.
- **Ops:** replace mock credentials with real ones; rotate `JWT_SECRET`; consider MFA for
  board/admin. Reconcile the `AuthCred.md` password drift (reset the DB volume or update the file).

## 17. Assumptions & design decisions

- **Role-model reconciliation:** the client confirmed a 5-tier NCISM org hierarchy after Phase-1's
  4-role model; org roles were added **additively** and made primary, keeping the Phase-1 roles so
  nothing breaks. President↔Member authority nuance is intentionally collapsed (both approve) —
  captured in name/title, not a separate mechanism.
- **SoD via the workflow guard**, not role removal — enforced by `workflow.service` (status × role ×
  ownership): a junior can't decide their own case, only the President appoints a hearing committee,
  only the Secretariat dispatches, a college is scoped to its own institution.
- **Board meetings are an overlay** — the secretariat schedules a meeting + agenda and confirms
  minutes, but the board decides cases with the normal actions; meetings don't gate the decide.
- **Processing is synchronous inline** (engine ~3–35s) — deliberate for the internal MVP; an async
  worker is a later optimization.
- **Report JSON is the source of truth**, immutable once approved (`closed`/`approved` edits → 423).
- **Uploaded case PDFs live in `backend/data/applications/`** (gitignored) — outside `temp/` so job
  retention can't purge them before a junior processes the case.
- **Engines reused, not rewritten** — `application.service.process` calls the existing extraction +
  assessment services.
- **Idempotent seeds** — `db:setup` is safe to re-run; upserts on `institute_id`/email.
- **No-hardcoding constraint** on the extraction/CDM side (generic reconstruction).
- **Legacy `/documents/*` retained** for ad-hoc extraction alongside the case flow.

## 18. Implementation notes for future development

- **Adding a case action/transition:** add it to `POLICY[status]` in `workflow.service.js` (with a
  capability), implement the op in `application.service.js` (guard via `assertCan`, write an
  `application_events` row), expose a route/controller method, and add the button to `ACTION_DEFS`/
  `SPECIAL` in `ApplicationDetail.jsx` — it renders automatically from `allowedActions`.
- **Adding a role:** insert into `roles` + map `role_permissions` in a seed (see `010_hearing_meeting_
  rbac.js`); add a `hasCapability` case in `workflow.service` if it acts on cases; add to
  `ROLE_PRIORITY` + a `DashboardLayout` nav branch; seed mock users.
- **Adding an endpoint:** route → controller → service → repository; guard with `authenticate` +
  `requirePermission`. Keep the `{ success, ... }` / `ApiError` envelope.
- **Adding a migration/seed:** next numbers are migration `007_*`, seed `012_*`. Enum `ADD VALUE`
  needs `exports.config = { transaction: false }` (see `005`/`006`). Keep seeds idempotent.
- **Frontend server data:** TanStack Query hooks; build role-relative links from the current location
  (see `InstitutionsList`/`ApplicationsList`) so pages work under `/:role/*` and `/admin/*`.
- **Run the DB before backend tests/seed** (`docker compose up -d db`). `npm test` covers the engines
  (61 tests) and does not need the portal DB.
