# Internal NCISM Assessment Portal — Architecture Blueprint & Roadmap

**Audience:** UI/UX, frontend, backend, database, API developers.
**Status:** design blueprint (approved). Supersedes the public-SaaS scope of `docs/srs/` for the
build; the SRS remains the **reference superset**, not the build target.

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

## 3. Application state machine → responsible role

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

| Phase | Deliverable | Key work |
|---|---|---|
| **0 — Foundation** | Runnable DB-backed skeleton | PostgreSQL + migrations + ORM (Prisma or Knex), config/env, object storage for artifacts (local dir now, S3-ready), CI + test harness; migrate disk `job.repository` → DB repositories. |
| **1 — Auth + RBAC + Layout** | Login + guarded shell | users/roles/permissions tables; local auth (admin-provisioned, bcrypt, JWT access+refresh; MFA-ready for Reviewer/Admin); **`WorkflowGuard` + `allowedActions` endpoint + guard middleware**; protected React routing, app shell, role-filtered nav. |
| **2 — Institutions** | Master registry | seed ~672 institutes with cleanse + **exception queue**; registry grid; institution 360°. |
| **3 — Uploads + Processing** | Pipeline wired to records | `/uploads` → `assessments` row (Uploaded) → **async worker** runs existing extraction+assessment engines → persist artifacts + report JSON; state machine core (Processing/Processed/Failed). |
| **4 — Review workflow** | Maker-checker lifecycle | Validation workbench + issue resolution; submit; Review/approve/reject/archive; immutability lock; report JSON as source of truth. |
| **5 — Audit + History** | Traceability | append-only audit interceptor on every mutation; assessment + institution timelines. |
| **6 — Reports & Analytics** | Insight | compliance/punitive summaries, throughput, institution trends, exports. |
| **7 — Admin & hardening** | Config + safety | ruleset version editor + activation (SoD); retention; settings; **RBAC matrix tests**, E2E per role, perf/accessibility. |

Each phase ships an end-to-end vertical slice; Phase 1's guard is a hard prerequisite for every
later screen.

---

## 7. Database modules (PostgreSQL)

**Auth/RBAC:** `users` (email, hash, status, mfa), `roles`, `user_roles`, `permissions` /
`role_permissions`, `refresh_tokens`.
**Domain:** `institutions` (master: institute_id `AYU####`/`UNI####`, system, state, name, file_no,
contacts).
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
as-is** (`engines/extraction`, `engines/assessment`), invoked by services — never rewritten.

| Module | Responsibility |
|---|---|
| `auth.service` | login, token issue/refresh/revoke, password, MFA hook |
| `user.service` / `role.service` | admin user & role management |
| **`workflow-guard.service` (rbac)** | single `can(role, action, state, ownership)` + `allowedActions` |
| `institution.service` (+ import job) | master registry, bulk import/cleanse, exception queue |
| `upload.service` | file intake, storage, hashing |
| **`processing.worker`** | async queue wrapping extraction→assessment; emits state events |
| `assessment.service` | lifecycle/transitions (extends the current one), report persistence |
| `validation.service` | extraction issues, resolutions |
| `audit.service` | mutation interceptor + query/export |
| `report.service` | analytics aggregation, exports |
| `ruleset.service` | versioned standards/punitive config + activation (SoD) |
| `notification.service` | in-app "next action" feed |

**Cross-cutting middleware:** auth → RBAC guard → validation (JSON Schema per payload) → controller →
audit → error (existing). **Queue:** start in-process (`pg-boss`/BullMQ), swappable to a worker
process later.

---

## 9. Frontend module structure

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

| Group | Endpoints |
|---|---|
| Auth | `POST /auth/login` · `POST /auth/refresh` · `POST /auth/logout` · `GET /auth/me` |
| Admin | `GET/POST/PATCH/DELETE /users`, `/users/:id` · `GET /roles` |
| Institutions | `GET/POST /institutions` · `GET/PATCH /institutions/:id` · `POST /institutions/import` |
| Uploads | `POST /uploads` *(file → assessment in Uploaded)* |
| Assessments | `GET /assessments` · `GET /assessments/:id` · **transitions:** `POST /assessments/:id/{process,reprocess,validate,submit,approve,reject,archive}` · `GET/POST/PATCH /assessments/:id/issues` · `GET /assessments/:id/report` *(canonical JSON)* · `GET /assessments/:id/allowed-actions` · `GET /assessments/:id/history` |
| Reports | `POST /reports/:key/run` |
| Audit | `GET /audit` |
| Rulesets | `GET/POST /rulesets` · `POST /rulesets/:id/activate` |
| Self | `GET/PATCH /me/settings` |

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
