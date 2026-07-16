# NCISM Assessment Portal — Developer Handoff (end of Phase 2)

> Cold-start context for a new developer or AI agent. Describes **only what exists in the codebase
> today** (Phases 0–2). Everything for the post-visitation lifecycle is **Phase 3 — Planned** and is
> tagged as such. Companion docs: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) (as-built reference),
> [docs/INTERNAL-PORTAL-BLUEPRINT.md](docs/INTERNAL-PORTAL-BLUEPRINT.md) (design blueprint + roadmap),
> [AuthCred.md](AuthCred.md) (mock logins), [backend/src/engines/extraction/cdm/](backend/src/engines/extraction/cdm/)
> (pipeline internals; a `CDM-RECONSTRUCTION.md` write-up exists on `main`), [docs/srs/](docs/srs/)
> (regulatory reference superset).

---

## 1. Project overview

An **internal** review/validation web portal for NCISM's Medical Assessment & Rating Board (MARB-ISM)
for Indian Systems of Medicine (Ayurveda, Unani, Siddha, Sowa-Rigpa). It wraps a **governed
multi-user portal** (auth, RBAC, org hierarchy, institution registry) around an already-complete
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
| NCISM org hierarchy (8 roles, supervisor chain, 17 users, allotments) | ✅ Phase 2 |
| Post-visitation lifecycle (cases, review, hearing, board, letters) | 🔜 Phase 3 — Planned |
| Visitor / secretariat / hearing-committee / college / observer roles | 🔜 Phase 3 — Planned |
| Assessment/validation/audit/report/ruleset DB tables | 🔜 Phase 3 — Planned |

## 3. Completed phases

- **Phase 0 — Foundation:** Postgres + Knex, config/env, `db/index.js` singleton. (The disk-based
  `job.repository` is retained for the document workflow; it was **not** migrated to DB.)
- **Phase 1 — Auth + RBAC + shell:** `users`/`roles`/`permissions`/`user_roles`/`role_permissions`/
  `refresh_tokens`; local login (bcrypt, JWT access+refresh); `authenticate` + `requirePermission`/
  `requireRole`; React `AuthContext`/`ProtectedRoute`/`RoleGate`, app shell.
- **Phase 2 — Institutions + Org hierarchy + role portal:** `institutions` (672) + `staff_allotments`
  + `users.supervisor_id`; markdown import w/ exception queue; 8 seeded roles incl. the NCISM org
  tiers; 17 org users (mock creds) + reporting chain; `/:role/*` portal + `/admin/*` console.

## 4. Remaining phases (Planned)

- **Phase 3 — Post-visitation lifecycle:** uploads-as-cases + assessment **state machine**
  (Draft→Uploaded→Processing→Processed→Validation→Review→Approved→Archived); maker-checker review
  (submit/approve/reject, `approvedBy ≠ submittedBy`); clarification + hearing letters; board
  meetings + decisions; compliance monitoring. **New roles:** visitor, secretariat, hearing_committee,
  college, commission_observer. **Pipeline routing change:** visitor uploads the 20–50pg report +
  selects region → routes to the allotted junior consultant via `staff_allotments`.
- **Phase 4 — Audit + history**, **Phase 5 — Reports/analytics**, **Phase 6 — Admin hardening**
  (ruleset editor + activation, RBAC matrix tests, E2E). See blueprint §6.

## 5. System architecture

```
Browser (React SPA, :5173)
   │  Bearer access JWT (memory) + httpOnly refresh cookie
   │  multipart PDF / JSON over /api/v1
   ▼
Express backend (:3000)
   ├─ authenticate → requirePermission/requireRole      (RBAC, live per-request perms)
   ├─ portal API: institutions registry+import, admin users/roles/permissions
   ├─ extraction engine → OpenDataLoader-PDF CLI (+ optional Docling hybrid :5002)
   ├─ assessment engine → data/rulesets/<id>/<version>/
   └─ job repository → backend/temp/job_<id>/
        │
        ▼
   PostgreSQL (:5432)  — auth/RBAC + institutions + org hierarchy (NOT the job/artifact store)
   Dexie (browser)     — local store for the legacy document workflow only
```

Two storage planes: **Postgres** (identity, RBAC, registry) and the **disk job store + Dexie**
(document workflow). Assessment runs are not yet persisted as DB records (Phase 3).

## 6. RBAC hierarchy

**Model:** `role → permission` (`resource:action`); users hold ≥1 role; guards re-check on the
backend for every request. **8 roles seeded:**

| Role key | Tier | Users | Core responsibility |
|---|---|---|---|
| `president` | Apex | 1 (Dr. Mukul Patel) | Final authority, appointments, oversight |
| `board_member` | Signatory | 2 (B. L. Mehra, Dr. Sushrut Kanaujia) | Review/finalize assessments, sign letters |
| `senior_consultant` | Supervisory | 2 (Gaurav Bhandari, Kritika) | Supervise staff, verify assessments |
| `junior_consultant` | Dealing staff | 12 | Process allotted colleges (scrutiny, drafting) |
| `admin` | System | 1 bootstrap | Users, roles, master data; **no business approval** (SoD) |
| `reviewer`/`analyst`/`viewer` | Phase-1 coarse | — | Retained maker/checker/auditor roles |

**Org chart (`users.supervisor_id`):**
```
President (Mukul Patel)
├── Board Member: B. L. Mehra ──── Senior: Gaurav Bhandari ── Team-1: Sunil, Tanya, Smarnika,
│                                                                       Akshay, Shubhangi, Mitali
└── Board Member: Sushrut Kanaujia ─ Senior: Kritika ──────── Team-2: Pooja, Divesh Rana, Dheeraj,
                                                                        Ritu Saini, Abdulla, Steave
```

**Permission catalogue (21):** `institution:{create,read,update,delete}`, `assessment:{read,create,
update,submit,approve,reject,archive,reprocess}`, `issue:{read,resolve}`, `user:manage`, `role:read`,
`ruleset:{read,create,activate}`, `report:read`, `audit:read`. Per-role bundles seeded in
`003_org_roles.js` (org tiers) and `001_rbac.js` (Phase-1 roles). **[Planned]** fine-grained
lifecycle perms (hearings, letters, board) + a workflow-state `allowedActions` guard.

**Segregation of duties:** enforced by ownership (`approvedBy ≠ submittedBy`) at the workflow layer
(Phase 3), not by role removal. Admin holds no business-approval permissions.

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
  role): `dashboard`, `profile`, `settings`, `about`, `institutions`, `institutions/:id`.
- **`/admin/*`** (`ProtectedRoute roles={['admin']}`): `institutions` (registry),
  `institutions/import`, `institutions/:id`, `users`, `users/:userId`, `roles`, `permissions`.
- **Legacy documents (all roles):** `/documents`, `/documents/:id`, `/pdf|text|structure|metadata|
  pipeline|report`, `/documents/new`; `/history` + `/workspace/*` redirect. Folds under
  `/:role/application/:id/*` in Phase 3 (Planned).

`primaryRole` priority: `admin > president > board_member > senior_consultant > junior_consultant >
reviewer > analyst > viewer` (`features/auth/AuthContext.jsx`).

## 9. Backend module overview (`backend/src/`)

```
app.js / ../server.js   express assembly / bootstrap (asserts DB connection, starts retention)
config/index.js         only place env is read (adds auth: jwtSecret, TTLs, bcryptRounds)
db/index.js             singleton Knex; db/migrations (001–003); db/seeds (001–005)
routes/index.js         mounts /auth /(extract) /jobs /assessments /institutions /admin  (+ /health)
controllers/            auth · institution · org · assessments · extract · jobs · health
services/               auth · institution · job · extraction · assessment · retention
repositories/           user · token · institution · job (disk)
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
pages/admin/            UsersList · UserDetail · RolesList · PermissionsList
pages/documents/        legacy document workflow pages (retained)
features/auth/          AuthContext(+primaryRole) · ProtectedRoute · RoleGate · token-store · auth.api
features/institutions/  institution.api · hooks (useInstitutions/useInstitution/useInstitutionMeta/
                        useImportInstitutions)
features/admin/         admin.api · hooks (useOrgUsers/useOrgUser/useRoles/usePermissions)
features/documents/     + features/workspace/ (legacy Dexie-backed workflow + reusable viewers)
components/ui/          shadcn primitives (table, select, input, card, badge, …)
lib/api/                client (axios + Bearer + silent refresh) · endpoints
```

- **Server data** (auth/institutions/admin) → axios `apiClient` + TanStack Query.
- **Local data** (legacy documents) → Dexie/IndexedDB `useDocuments`.
- **UI gating** via `RoleGate`/`ProtectedRoute` is cosmetic; backend re-checks all permissions.

## 11. Database overview

10 tables (Knex). Auth/RBAC + registry only.

```
users ──< user_roles >── roles ──< role_permissions >── permissions
  │  └─ supervisor_id ──┐  (self-FK: org reporting chain)
  ├──< refresh_tokens   │
  └──< staff_allotments │  (user × system × state routing)
institutions            (672 master rows)
```

| Table | Key columns |
|---|---|
| `users` | email (unique), name, password_hash, status, **supervisor_id** (self-FK), last_login_at |
| `roles` | key (pk), name, description |
| `permissions` | key (pk = resource:action), resource, action |
| `role_permissions` | role_key, permission_key |
| `user_roles` | user_id, role_key |
| `refresh_tokens` | user_id, token_hash (sha-256), expires_at, revoked_at |
| `institutions` | institute_id (unique), system (enum), state, name, file_number, email, contact, status, source |
| `staff_allotments` | user_id, system, state (unique triple) |

**[Planned — Phase 3+]:** `assessments`, `assessment_artifacts`, `assessment_report` (JSONB),
`validation_issues`, `assessment_events`, `audit_log`, `ruleset_versions`.

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
- **Not yet wired to the portal** — extraction/assessment run via `/extract` + `/assessments`
  (engine run) and the local document workflow; case-based routing is Phase 3.

## 13. API summary (`/api/v1`)

| Group | Status | Endpoints |
|---|---|---|
| Health | ✅ | `GET /health` |
| Auth | ✅ | `POST /auth/login` · `POST /auth/refresh` · `POST /auth/logout` · `GET /auth/me` |
| Institutions | ✅ | `GET /institutions` (system/state/q + page) · `GET /institutions/meta` · `GET /institutions/:id` · `POST /institutions` · `PATCH /institutions/:id` · `POST /institutions/import` |
| Admin | ✅ | `GET /admin/users` · `GET /admin/users/:id` · `GET /admin/roles` · `GET /admin/permissions` |
| Extraction/Jobs | ✅ | `POST /extract` · `GET /jobs/:id` · `GET /jobs/:id/artifacts/:type` · `POST /assessments` (engine run) |
| Uploads / Assessment lifecycle / Reports / Audit / Rulesets | 🔜 Planned | see blueprint §10 |

**Guards:** read = `institution:read`; write = `institution:create`/`:update`; admin group = role
`admin` + `user:manage`/`role:read`. **Error codes:** 401 (`NO_TOKEN`/`INVALID_TOKEN`), 403 (missing
role/perm), 404 (`INSTITUTION_NOT_FOUND`/`USER_NOT_FOUND`), 409 (`INSTITUTION_EXISTS`), 400
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
npm run db:setup                 # migrate + seed (idempotent) → 672 institutions, 17 users
npm start                        # API on :3000
cd ../frontend && npm install && npm run dev   # SPA on :5173
```
Logins: [AuthCred.md](AuthCred.md). Backend tests: `cd backend && npm test` (61 pass).

## 15. Known limitations

- **Assessment runs are not persisted as DB records** — the review lifecycle, audit trail, and
  reports do not exist yet (Phase 3).
- **Mock credentials:** all 17 org users share a single mock password (seed default `Password123`,
  env `MOCK_PASSWORD`); the bootstrap admin uses `ADMIN_PASSWORD` (code default `ChangeMe123!`). The
  authoritative current logins are in [AuthCred.md](AuthCred.md) (untracked). Placeholders — replace
  before any non-local use.
- **Institution `name` keeps the full address inline** (not split into structured address fields) —
  best-effort from the source table.
- **Source-data quirks** preserved as-is: duplicate/typo state names ("Uttar Pardesh", "Himachal
  pradesh"); the `/institutions/meta` facet endpoint surfaces exactly what's filterable.
- **No MFA** (config is MFA-ready but not implemented). `JWT_SECRET` default is dev-only.
- **Coarse RBAC only** — no per-record ownership / workflow-state `allowedActions` guard yet.
- **Frontend bundle** is a single large chunk (build warns >500 kB); code-splitting deferred.
- Two Phase-1 roles (`reviewer`/`analyst`/`viewer`) are retained but unused by org users — kept so
  existing code/tests don't break.

## 16. Pending work before Phase 3

- Decide the **Phase-3 case model**: `applications`/`assessments` schema + state machine + which
  roles own which transitions (blueprint §3 is the target design).
- Add the **workflow-state guard** (`can(role, action, state, ownership)` + `allowedActions`
  endpoint) — Phase 1 descoped it to coarse guards.
- Add the **Phase-3 roles** (visitor, secretariat, hearing_committee, college, commission_observer)
  + fine-grained permissions to the RBAC seed.
- Wire the **pipeline to case records** (upload → case → async engine run → persisted report JSON)
  and route by `staff_allotments`.
- Replace mock credentials with real ones; rotate `JWT_SECRET`; consider MFA for board/admin.

## 17. Assumptions & design decisions

- **Role-model reconciliation:** the client confirmed a 5-tier NCISM org hierarchy after Phase-1's
  4-role model; org roles were added **additively** and made primary, keeping the Phase-1 roles so
  nothing breaks. President↔Member authority nuance is intentionally collapsed (both approve) —
  captured in name/title, not a separate mechanism.
- **SoD by ownership**, not role removal (`approvedBy ≠ submittedBy`) — lets a senior review others'
  work but not their own (enforced in Phase 3).
- **Engines reused, not rewritten** — the portal invokes the existing extraction/assessment engines.
- **Idempotent seeds** — `db:setup` is safe to re-run; upserts on `institute_id`/email.
- **No-hardcoding constraint** on the extraction/CDM side (generic reconstruction; see the CDM doc).
- **Legacy `/documents/*` retained** rather than migrated, to avoid breaking the working pipeline UI
  before the Phase-3 case model exists.
- **Two storage planes on purpose:** Postgres for identity/registry; disk+Dexie for the document
  workflow until the case model lands.

## 18. Implementation notes for future development

- **Phase-3 hooks already in place:** `staff_allotments` (state×system routing) and
  `users.supervisor_id` (report escalation chain) are seeded and ready to drive case routing and
  review escalation.
- **Adding a role:** insert into `roles` + map `role_permissions` in a seed (see `003_org_roles.js`);
  update the frontend `ROLE_PRIORITY` in `AuthContext.jsx` if it should affect landing.
- **Adding an endpoint:** follow route → controller → service → repository; guard with
  `authenticate` + `requirePermission`. Keep the `{ success, ... }` / `ApiError` envelope.
- **Adding a migration/seed:** next numbers are migration `004_*`, seed `006_*`; keep seeds
  idempotent (`onConflict().merge()/.ignore()`).
- **Frontend server data:** use TanStack Query hooks (mirror `features/institutions/hooks.js`); build
  role-relative links from the current location (see `InstitutionsList`/`InstitutionDetail`) so pages
  work under both `/:role/*` and `/admin/*`.
- **Do not document or ship Phase-3 features as built** until implemented — keep the blueprint's
  `[Planned]` markers honest.
- **Run the DB before backend tests/seed** (`docker compose up -d db`). `npm test` covers the
  engines and does not need the portal DB.
