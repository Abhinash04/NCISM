# Internal NCISM Assessment Portal — Architecture Blueprint & Roadmap

**Audience:** UI/UX, frontend, backend, database, API developers.
**Status:** design blueprint (approved). Supersedes the public-SaaS scope of `docs/srs/` for the
build; the SRS remains the **reference superset**, not the build target.

> **This is the design target, not a description of the current code.** For what is actually built,
> read the **Implementation status** section immediately below, then [ARCHITECTURE.md](ARCHITECTURE.md)
> (as-built reference) and [../HANDOFF.md](../HANDOFF.md) (cold-start handoff). Sections below marked
> **[Planned]** are not yet implemented.

---

## Implementation status — as-built through Phase 2 (2026-07)

Phases 0–2 are built on branch `abhi-dev`. **Three notable divergences** from the original blueprint:

1. **Role model expanded.** The blueprint's 4 roles (§1) were kept, but the actual NCISM
   organizational hierarchy was layered on top as **primary** roles: `president`, `board_member`,
   `senior_consultant`, `junior_consultant` (+ `admin`, and the retained `reviewer`/`analyst`/
   `viewer`) — **8 roles total**. Reporting chain stored via `users.supervisor_id`.
2. **Routing is role-prefixed.** Actual routes are `/:role/*` (per-tier portal) + `/admin/*`
   (console), not the flat `/uploads`/`/assessments` scheme in §5. The legacy `/documents/*`
   pipeline UI is retained.
3. **Schema is auth + registry only.** Built tables: `users`(+`supervisor_id`), `roles`,
   `permissions`, `role_permissions`, `user_roles`, `refresh_tokens`, `institutions`,
   `staff_allotments`. The `assessments`/`assessment_*`/`validation_issues`/`audit_log`/
   `ruleset_versions` tables in §7 are **[Planned]**.

| Blueprint section | Status |
|---|---|
| §1 User roles (4) | **Built, expanded** to 8 (org hierarchy is primary) |
| §2 RBAC hierarchy | **Built** (role→permission, `requirePermission`/`requireRole`, live per-request perms). `allowedActions`/workflow-state guard = **[Planned]** |
| §3 Application state machine | **[Planned]** — no assessment records/transitions yet |
| §4 Portal per role | **Built (partial):** shell, role-filtered nav, institutions, admin console. Uploads/validation/review screens = **[Planned]** |
| §5 Routing | **Built, changed** to `/:role/*` + `/admin/*` |
| §6 Roadmap | Phases **0, 1, 2 = DONE**; 3+ **[Planned]** |
| §7 Database | **Built:** auth/RBAC + `institutions` + `staff_allotments`. Assessment/audit/ruleset tables = **[Planned]** |
| §8 Backend services | **Built:** auth, user/org, institution. workflow-guard/upload/processing.worker/validation/audit/report/ruleset/notification = **[Planned]** |
| §9 Frontend modules | **Built:** auth, institutions, admin, (legacy documents/workspace). uploads/reports/audit = **[Planned]** |
| §10 API grouping | **Built:** Auth, Institutions, Admin (users/roles/permissions). Uploads/Assessments-transitions/Reports/Audit/Rulesets = **[Planned]** |

> **Phase 3 = the post-visitation lifecycle** (assessment review → clarification → hearing → board
> → decision → dispatch → compliance) plus the dropped roles (visitor, secretariat, hearing
> committee, college portal, commission observer) and a pipeline routing change. Everything below
> describing that lifecycle is the **[Planned]** design, not current code.

---

## 0. Scope & guiding decisions

**What this is:** an **internal enterprise web application** for ~10–20 authorized staff,
admin-provisioned (no public registration, no college/applicant/field portals). It wraps a
**governed multi-user review portal** around the already-built document pipeline.

**What already exists (reuse, do not rebuild):**
- `backend/src/engines/extraction/` — OpenDataLoader → CDM → structured markdown (see
  `backend/docs/CDM-RECONSTRUCTION.md`).
- `backend/src/engines/assessment/` — deterministic markdown → Assessment Report JSON.
- Backend clean architecture (`routes → controllers → services → repositories`), disk-based job
  store (`job.repository.js`), extraction/assessment/job/retention services.
- Frontend React 19 + Vite + react-router v7 + TanStack Query, `features/` folders, reusable
  viewers (`components/viewers` PdfViewer/JsonViewer/structured, markdown).

**What is missing (this blueprint adds):** authentication, users/roles/RBAC, a real database,
institution registry, the assessment **review/validation lifecycle**, audit history, reports.

**Pipeline (given, complete):** upload → OpenDataLoader extract → CDM structured markdown →
deterministic parse → **Assessment Report JSON = single source of truth**.

**Confirmed decisions:**
- **Maker-checker approval** — the validator ≠ the approver → **4 roles**.
- **Full master institution registry seeded upfront** (~672 institutes, with data cleanse).

**Design tenets:** modular monolith now, service-extractable later; backend-driven permissions
(frontend never decides); every mutation audited; the approved report JSON is immutable; systems of
medicine / levels are configuration, not new code.

---

## 1. User roles

Old SRS had **9** roles for the full regulatory lifecycle. Internal scope needs **4**.

| Role | Merged from (old) | Core responsibility |
|---|---|---|
| **Administrator** | R8 SysAdmin | Users & roles, master data (institutions, rulesets/standards), system config, retention, audit access. **No business approval** (segregation of duties). |
| **Reviewer** *(Approver)* | R2 Board Member + R3 President | The **checker** — reviews validated assessments, **approves/rejects**, archives. Read-all. |
| **Analyst** *(Uploader/Validator)* | R1 Dealing Staff + validation work | The **maker** — uploads reports, runs processing, validates extracted data, resolves extraction issues, submits for review. |
| **Viewer** *(Auditor)* | R9 Commission Observer | Read-only across assessments, reports/analytics, audit. |

**Dropped (unnecessary for an internal tool):**
- **R5 Visitor** — no field capture; data arrives as an uploaded PDF, not a tablet PWA.
- **R4 Hearing Committee**, **R6 Secretariat**, **R7 College portal** — no hearings, board meetings,
  letters, or external portals in scope.
- Rating (M9), appeals, penalties, fee module — out of scope (revisit if the platform grows).

**Multiple roles per user, SoD by ownership.** A user may hold several roles (e.g. a senior is both
Analyst and Reviewer). Separation of duties is enforced by an **ownership check
(`approvedBy ≠ submittedBy`)**, never by removing a role — so that senior can review *others'*
uploads but never approve their own.

---

## 2. RBAC hierarchy

**Model:** `role → permission` where a permission = **`action` on `resource`**, further constrained
by **ownership** (own vs all) and **workflow state**.

**The governing rule:** the **backend computes `allowedActions`** for each `(role × workflow-state ×
ownership)` and the frontend renders **only** those. No role literals in the UI. Every transition
endpoint independently re-checks the same guard (defense in depth). One shared function
`can(role, action, state, ownership)` powers both the middleware and the `allowedActions` endpoint.

**Permission matrix** (C create · R read · U update · A approve/transition · *own* = own-scope only):

| Resource | Administrator | Reviewer | Analyst | Viewer |
|---|---|---|---|---|
| Institutions (master) | C R U D | R | R | R |
| Assessments | R | R (all) · A (approve/reject/archive) | C · R · U *(own, pre-approval)* · A *(submit)* | R |
| Validation issues | R | R | C · R · U *(resolve, own)* | R |
| Users & roles | C R U D | – | – | – |
| Rulesets / standards | C R U D *(draft)* · A *(activate w/ ref)* | R | R | R |
| Reports / analytics | R | R | R *(own + all)* | R |
| Audit log | R | R | R *(own actions)* | R |
| Settings (self) | R U | R U | R U | R U |

**Pre-flagged guards to enforce (not just document):**
- `approve` requires `reviewer.id ≠ submitter.id` (maker-checker) → else **403**.
- `submit` requires all **blocking** validation issues resolved → else **422**.
- Approved assessment is immutable → edit attempts **423 Locked**.
- Ruleset activation requires a reference (Board/policy ref) → else **422**.
- Row-level scoping enforced in queries (Analyst "own" scope), not response filtering.

---

## 3. Application state machine → responsible role  **[Planned — Phase 3+]**

> Not implemented. No `assessments`/case records or transitions exist yet; the current build stops at
> the institutions registry. This is the target lifecycle for Phase 3.

```
Draft → Uploaded → Processing → Processed → Validation → Review → Approved → Archived
                       │                                    │
                       └──► Failed (retry)                  └──► Rejected ──► Validation
```

| State | Responsible actor | Action → next state | Guard / notes |
|---|---|---|---|
| **Draft** | Analyst | create upload record → **Uploaded** | optional; a save-before-file staging state |
| **Uploaded** | Analyst / system | file stored → auto-kick pipeline → **Processing** | file type/size validation |
| **Processing** | **System** (async worker) | extraction → CDM → assessment JSON → **Processed** · error → **Failed** | idempotent; progress events |
| **Failed** | Analyst | fix inputs / **reprocess** → **Processing** | error surfaced with logs |
| **Processed** | Analyst | open for validation → **Validation** | assessment JSON + structured view ready |
| **Validation** | Analyst *(owner)* | confirm fields, resolve issues, **submit** → **Review** | all blocking issues resolved |
| **Review** | Reviewer *(≠ owner)* | **approve** → **Approved** · **reject** → **Rejected** | maker-checker guard |
| **Rejected** | (transient) | routes back to **Validation** with reviewer notes | Analyst addresses feedback |
| **Approved** | Reviewer | lock report JSON = **source of truth** · **archive** → **Archived** | record immutable (423 on edit) |
| **Archived** | Reviewer / Admin | terminal | re-open = Admin only, audited |

Every transition writes an **audit event** (`from`, `to`, `actor`, `at`, `note`). Transitions are
transactional — a failed guard blocks with 409/422 and no partial state change.

---

## 4. Portal structure per role

**Shared app shell:** top bar (global search, notifications, profile menu), **role-filtered** left
nav, breadcrumb, content area. Every action button is rendered from `allowedActions` for the current
record — the same screen shows different actions to Analyst vs Reviewer automatically.

### 4.1 Analyst (maker)
- **Dashboard:** *My uploads*, *Needs validation (mine)*, *Rejected back to me*, *Failed jobs*,
  throughput tiles.
- **Nav:** Dashboard · Uploads · Assessments · Institutions *(read)* · Reports · Settings.
- **Pages / forms / tables:**
  - *Upload* — drag-drop form (PDF) + institution picker + session/year field.
  - *Upload queue* — table (file, institution, state, progress, uploaded-at, actions).
  - *Assessment list* — table with filters (state, institution, session, date), bulk select.
  - *Assessment detail* — tabs: **PDF · Structured view · Extracted JSON · Validation · History**.
  - *Validation workbench* — field-by-field confirm, extraction **issue list** (severity, location),
    inline edit **with reason**, "resolve issue", **Submit for review**.
- **Actions:** upload, reprocess, edit field, resolve issue, submit. **Reports:** own throughput /
  pending. **Settings:** profile, password, notification prefs.

### 4.2 Reviewer (checker)
- **Dashboard:** *Awaiting my review*, *Recently approved*, *Institution watchlist*, aging/deadline
  tiles.
- **Nav:** + **Review queue**, **Audit**.
- **Pages:** Review queue table; Assessment detail **+ Review tab** (diff of Analyst edits vs raw
  extraction, issue resolutions, **Approve / Reject with note**); Institution 360°.
- **Actions:** approve, reject, archive, comment. **Reports:** all analytics.

### 4.3 Viewer (auditor)
- **Dashboard:** org-wide KPIs (throughput, compliance mix, backlog).
- **Nav:** Assessments *(read)* · Institutions *(read)* · Reports · Audit *(read)*.
- Read-only detail pages; export reports.

### 4.4 Administrator
- **Dashboard:** system health, processing stats, user activity.
- **Nav:** Admin (Users · Roles · Institutions master · Rulesets/Standards · Retention) · Audit ·
  Settings.
- **Pages / forms:** user CRUD + role assignment; role/permission viewer; **institution
  import/cleanse** (upload master sheet → validation → **exception queue** → commit); **ruleset
  version editor** (draft → activate with reference); system settings; retention policy.
- **Actions:** manage users/roles, import/cleanse masters, draft/activate rulesets, configure system.
  **Not** business approval (SoD).

---

## 5. Routing hierarchy

> **As-built differs:** actual routing is `/:role/*` (per-tier portal) + `/admin/*` (console) +
> legacy `/documents/*`. Only `/login`, role dashboards, `/institutions`, `/admin/{users,roles,
> permissions,institutions}`, `/403` exist today; `/uploads`, `/assessments*`, `/reports`, `/audit`,
> `/admin/rulesets` are **[Planned]**. See [ARCHITECTURE.md](ARCHITECTURE.md) → Frontend for the real map.

```
/login                              public
/                                   → role dashboard (redirect)
/uploads                            upload + queue                 Analyst, Admin
/assessments                        list (state/institution filters)
/assessments/:id                    detail — tabs via ?tab=pdf|structured|json|validation|review|history
/assessments/:id/validate           validation workbench           Analyst (owner)
/assessments/:id/review             review panel                   Reviewer
/institutions                       registry
/institutions/:id                   institution 360° + history
/reports                            analytics dashboards + export
/audit                              audit log (actor/entity/date filters)
/admin/users                        user admin                     Admin
/admin/roles                        role/permission view           Admin
/admin/institutions                 master import / cleanse        Admin
/admin/rulesets                     versioned standards/punitive    Admin
/settings                           profile, password, prefs
/403  /404
```
Route access is enforced by a `ProtectedRoute` (auth) + `RoleGate` (coarse role), with fine-grained
actions from `allowedActions`.

---

## 6. Development order (bottom-up)

> **As-built note:** Phases 0–2 are DONE. The **actual Phase 2** delivered more than the original
> row below — it also seeded the full NCISM org hierarchy (8 roles, `supervisor_id` chain, 17 org
> users) and the role-prefixed portal. Phase 1's `WorkflowGuard`/`allowedActions` was **descoped** to
> coarse `requirePermission`/`requireRole` (the workflow-state guard lands with the Phase-3 lifecycle).
> The **actual Phase 3** = the post-visitation lifecycle (below covers the review-workflow portion).

| Phase | Status | Deliverable | Key work |
|---|---|---|---|
| **0 — Foundation** | ✅ Done | DB-backed skeleton | PostgreSQL + Knex migrations, config/env. (Disk `job.repository` retained for the document workflow; not migrated to DB.) |
| **1 — Auth + RBAC + Layout** | ✅ Done | Login + guarded shell | users/roles/permissions tables; local auth (bcrypt, JWT access+refresh); `authenticate` + `requirePermission`/`requireRole`; protected React routing + app shell. `allowedActions`/workflow guard = **[Planned]**. |
| **2 — Institutions + Org** | ✅ Done | Master registry + org hierarchy | 672 institutes + exception queue; registry grid + detail; **org hierarchy (8 roles, supervisor chain, 17 users, staff_allotments)**; role-prefixed portal + admin console. |
| **3 — Post-visitation lifecycle** | 🔜 Planned | Cases + review/hearing/board | uploads-as-cases → `assessments` state machine; validation/submit/review/approve/reject/archive; clarification + hearing letters; board meetings + decisions; new roles (visitor/secretariat/hearing/college/observer); pipeline routing by allotment. |
| **4 — Audit + History** | 🔜 Planned | Traceability | append-only audit interceptor; assessment + institution timelines. |
| **5 — Reports & Analytics** | 🔜 Planned | Insight | compliance/punitive summaries, throughput, exports. |
| **6 — Admin & hardening** | 🔜 Planned | Config + safety | ruleset version editor + activation (SoD); RBAC matrix tests, E2E per role. |

Each phase ships an end-to-end vertical slice; Phase 1's guard is a hard prerequisite for every
later screen.

---

## 7. Database modules (PostgreSQL)

> **Built today:** the Auth/RBAC + Domain tables below, plus `staff_allotments` (user × system ×
> state routing) and `users.supervisor_id` (org chain). The **Assessments** and **Governance**
> groups below are **[Planned — Phase 3+]**.

**Auth/RBAC:** `users` (email, hash, status, **supervisor_id**), `roles`, `user_roles`, `permissions` /
`role_permissions`, `refresh_tokens`.
**Domain:** `institutions` (master: institute_id `AYU/UNI/SID/SWR####`, system, state, name, file_no,
contacts) · **`staff_allotments`** (user_id × system × state).
**Assessments:** `assessments` (id, institution_id, session/year, state, owner_id, submitted_by,
approved_by, timestamps), `assessment_artifacts` (kind: pdf|elements|markdown|report, storage_key,
hash, bytes), `assessment_report` (canonical parsed JSON — JSONB; immutable once Approved),
`validation_issues` (assessment_id, field_path, severity, status, resolution, resolved_by),
`assessment_events` (from_state, to_state, actor_id, at, note).
**Governance:** `audit_log` (append-only: actor, action, entity, entity_id, before, after, at, ip),
`ruleset_versions` (system, level, version, effective_session, payload, activated_by, ref, status),
`report_definitions` (optional saved reports).

Object storage holds the **raw PDF + extraction artifacts**; the DB holds **metadata + the canonical
report JSON**. Index on `assessments(state, institution_id, owner_id)` and `audit_log(entity, at)`.

### ER sketch
```
users ──< user_roles >── roles ──< role_permissions >── permissions
institutions ──1:N── assessments ──1:N── assessment_artifacts
                          │  ├─1:N── validation_issues
                          │  ├─1:N── assessment_events
                          │  └─1:1── assessment_report (JSONB, immutable when Approved)
users ──1:N── audit_log        ruleset_versions (versioned config)
```

---

## 8. Backend modules / services

Keep the existing `routes → controllers → services → repositories → db` layering. **Engines stay
as-is** (`engines/extraction`, `engines/assessment`), invoked by services — never rewritten. Status
column reflects the current code.

| Module | Status | Responsibility |
|---|---|---|
| `auth.service` | ✅ Built | login, token issue/refresh/revoke |
| `user`/`org` (user.repository + org.controller) | ✅ Built | admin user & role/permission read |
| `institution.service` (+ import) | ✅ Built | master registry, idempotent import, exception queue |
| **`workflow-guard.service` (rbac)** | 🔜 Planned | `can(role, action, state, ownership)` + `allowedActions` (today: coarse `requirePermission`/`requireRole`) |
| `upload.service` | 🔜 Planned | file intake, storage, hashing |
| **`processing.worker`** | 🔜 Planned | async queue wrapping extraction→assessment; emits state events |
| `assessment.service` (lifecycle) | 🔜 Planned | case transitions + report persistence (current `assessment.service` runs the engine only, disk/job-based) |
| `validation.service` | 🔜 Planned | extraction issues, resolutions |
| `audit.service` | 🔜 Planned | mutation interceptor + query/export |
| `report.service` | 🔜 Planned | analytics aggregation, exports |
| `ruleset.service` | 🔜 Planned | versioned standards/punitive config + activation (SoD) |
| `notification.service` | 🔜 Planned | in-app "next action" feed |

**Cross-cutting middleware:** auth → RBAC guard → validation (JSON Schema per payload) → controller →
audit → error (existing). **Queue:** start in-process (`pg-boss`/BullMQ), swappable to a worker
process later.

---

## 9. Frontend module structure

> **Built today:** `features/auth`, `features/institutions`, `features/admin`, plus the legacy
> `features/documents` + `features/workspace`. `features/{dashboard,uploads,reports,audit}` and the
> assessment validation/review screens are **[Planned]**. Routing is `/:role/*` (see §5 note).

Build on the existing `features/` + reusable `components/viewers`.

```
src/
  app/          router, layouts (existing app/layouts), providers (TanStack Query, Auth)
  features/
    auth/          login, useAuth, token store, ProtectedRoute, RoleGate
    dashboard/     role-scoped widgets
    uploads/       upload form, queue
    assessments/   list, detail (tabbed), validation workbench, review panel, StateBadge
    institutions/  registry grid, 360°
    reports/       analytics, export
    audit/         audit log viewer
    admin/         users, roles, institutions-import, rulesets
    settings/      profile, password, prefs
  components/    ui, common, markdown, viewers (REUSE: PdfViewer, JsonViewer, structured markdown)
  lib/           api client, rbac helpers (useAllowedActions), cache (TanStack Query; Dexie for local drafts)
  hooks/
```
**Rule:** action buttons come from `useAllowedActions(assessmentId)` — **no hardcoded role checks**.
Reuse the workspace viewers for the PDF / structured / JSON detail tabs.

---

## 10. API grouping (`/api/v1`)

| Group | Status | Endpoints |
|---|---|---|
| Auth | ✅ Built | `POST /auth/login` · `POST /auth/refresh` · `POST /auth/logout` · `GET /auth/me` |
| Admin | ✅ Built (read) | `GET /admin/users` · `GET /admin/users/:id` · `GET /admin/roles` · `GET /admin/permissions` (user/role **write** = Planned) |
| Institutions | ✅ Built | `GET /institutions` · `GET /institutions/meta` · `GET/PATCH /institutions/:id` · `POST /institutions` · `POST /institutions/import` |
| Extraction/Jobs | ✅ Built (pre-portal) | `POST /extract` · `GET /jobs/:id` · `POST /assessments` (engine run — not the lifecycle) |
| Uploads | 🔜 Planned | `POST /uploads` *(file → assessment in Uploaded)* |
| Assessments (lifecycle) | 🔜 Planned | `GET /assessments` · `GET /assessments/:id` · **transitions** `POST /assessments/:id/{process,reprocess,validate,submit,approve,reject,archive}` · `/issues` · `/report` · `/allowed-actions` · `/history` |
| Reports | 🔜 Planned | `POST /reports/:key/run` |
| Audit | 🔜 Planned | `GET /audit` |
| Rulesets | 🔜 Planned | `GET/POST /rulesets` · `POST /rulesets/:id/activate` |
| Self | 🔜 Planned | `GET/PATCH /me/settings` |

**Conventions:** REST/JSON; **workflow transitions are explicit sub-resources** so guard + audit
apply per action; standard error envelope — **403** role, **404** row-scope miss, **409** wrong
state, **422** validation, **423** locked/immutable.

---

## Consistency checks (self-verified)

- Every route in §5 maps to a role in §4 and an API group in §10.
- Every state in §3 has exactly one responsible role; approved records immutable.
- Every DB module in §7 is consumed by a service in §8; engines reused, not rebuilt.
- No dropped regulatory lifecycle (hearings/board/letters/college portal/rating) leaks back in.

## Reference

- Superset spec (not the build target): `docs/srs/` + `PROJECT_HANDOFF_KT_GAP_ANALYSIS.md`.
- Pipeline internals: `backend/docs/CDM-RECONSTRUCTION.md`.
