# Internal NCISM Assessment Portal — Architecture Blueprint & Roadmap

**Audience:** UI/UX, frontend, backend, database, API developers.
**Status:** design blueprint (approved). Supersedes the public-SaaS scope of `docs/srs/` for the
build; the SRS remains the **reference superset**, not the build target.

> **This is the design target, not a description of the current code.** For what is actually built,
> read the **Implementation status** section immediately below, then [ARCHITECTURE.md](ARCHITECTURE.md)
> (as-built reference) and [../HANDOFF.md](../HANDOFF.md) (cold-start handoff). Sections below marked
> **[Planned]** are not yet implemented.

---

## Implementation status — as-built through Phase 6 (2026-07)

Phases 0–6 are built on branch `abhi-dev`. The **post-visitation lifecycle is implemented**
(3a case model + review chain · 3b clarification + college · 3c hearings + board meetings +
dispatch), plus **3d structured board outcomes + official letter/order generation**, **Phase 4 a
system-wide append-only `audit_log`**, **Phase 5a a compliance/penalty ledger + monitoring**,
**Phase 5b reports/analytics + CSV export**, and **Phase 6 admin hardening** (6a ruleset registry +
activation + per-case resolution · 6b async pg-boss worker · 6c RBAC-matrix + per-role E2E · 6d TOTP
MFA + code-splitting). **Notable divergences** from the original blueprint:

1. **Role model expanded to 13.** The blueprint's 4 roles were kept as legacy, but the real NCISM
   hierarchy + lifecycle actors are the **primary** roles: `president`, `board_member`,
   `senior_consultant`, `junior_consultant`, `visitor`, `college`, `hearing_committee`,
   `secretariat`, `commission_observer`, `admin` (+ retained `reviewer`/`analyst`/`viewer`).
2. **Routing is role-prefixed.** Actual routes are `/:role/*` (per-tier portal) + `/admin/*`, not
   the flat `/uploads`/`/assessments` scheme in §5. Legacy `/documents/*` is retained.
3. **Schema — 19 domain tables.** Auth/RBAC (with `users.mfa_secret`/`mfa_enabled`) + registry + the
   case lifecycle (`applications`, `application_events`, `clarifications`, `hearings`,
   `hearing_members`, `board_meetings`, `board_meeting_items`) + `letters` + `penalties` +
   `audit_log` + `ruleset_versions` (6a). Reports (5b) add **no** table — they aggregate live data.
   pg-boss adds its own `pgboss` job-queue schema (6b).
4. **State machine names differ** from §3 (uploaded→processing→processed→under_validation→
   senior_review→board_review→approved→closed, with clarification/hearing branches) and the
   maker-checker is the **org chain** (junior→senior→board), not a flat Analyst→Reviewer.

| Blueprint section | Status |
|---|---|
| §1 User roles (4) | **Built, expanded** to 13 (org hierarchy + lifecycle actors are primary) |
| §2 RBAC hierarchy | **Built** — incl. the `allowedActions`/workflow-state guard (`workflow.service`) |
| §3 Application state machine | **Built** (names differ; see status note above) |
| §4 Portal per role | **Built** — shell, role nav, institutions, admin, case queues/detail, meetings |
| §5 Routing | **Built, changed** to `/:role/*` + `/admin/*` (+ `/applications`, `/meetings`) |
| §6 Roadmap | Phases **0–4 + 5a + 5b + 6 = DONE**; 7+ **[Planned]** |
| §7 Database | **Built:** auth/RBAC + registry + cases + `letters` + `audit_log` + `penalties` + `ruleset_versions` (reports add no table) |
| §8 Backend services | **Built:** auth (+MFA), user/org, institution, workflow-guard, application (lifecycle), **letter, meeting, audit, penalty, report, ruleset, queue** (async pg-boss worker). notification = **[Planned]** |
| §9 Frontend modules | **Built:** auth (+MFA), institutions, admin (+rulesets), applications, meetings, **audit, compliance, reports**, (legacy documents/workspace) |
| §10 API grouping | **Built:** Auth (+MFA), Institutions, Admin, Applications (+transitions), **Letters, Meetings, Audit, Compliance, Reports, Rulesets** |

> **Phases 3d + 4 + 5a + 5b + 6 are done** (structured outcomes + official letters; audit log;
> compliance/penalty ledger; reports/analytics; ruleset registry + activation + per-case resolution;
> async worker; RBAC-matrix + E2E; MFA + code-splitting). **Phase 7a/7b** added UG Unani + UG
> Sowa-Rigpa rulesets (authored + active). Remaining: Phase 7 UG Siddha + PG content + non-Ayurveda
> extractor tuning, then notifications (8) + production readiness (9) + reports depth (10).
> Sections below still marked **[Planned]** describe those.

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

## 3. Application state machine → responsible role  **[Built — see note]**

> **Implemented, with different state names + actors.** The original design below (Analyst→Reviewer,
> Draft→…→Archived) was superseded by the NCISM org chain. The **as-built** machine on
> `applications.status` is: `uploaded → processing → processed → under_validation → senior_review
> (senior consultant) → board_review (board/president) → approved → closed (secretariat dispatch)`,
> with branches `board_review → clarification_open (college responds) → clarification_responded` and
> `board_review → hearing_requested (president appoints) → hearing_scheduled (committee minutes) →
> board_review`; `rejected → revise`. Every transition writes an `application_events` row; the guard
> is `workflow.service.assertCan` (403 / 423). See [ARCHITECTURE.md](ARCHITECTURE.md) → Case lifecycle
> for the real diagram. The generic design below is kept for its rationale.

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
> legacy `/documents/*`. Case + meeting screens live at `/:role/{applications,applications/new,
> applications/:id,meetings,meetings/:id}`; institutions at `/:role/institutions`; admin under
> `/admin/*`. `/reports` + `/audit` are **built** (`/:role/reports`, `/:role/audit`); `/admin/rulesets`
> is **built** (6a — versions table + Activate dialog). See
> [ARCHITECTURE.md](ARCHITECTURE.md) → Frontend for the real map.

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

> **As-built note:** Phases 0–3 are DONE. Phase 2 also seeded the full org hierarchy + role portal.
> Phase 1's `WorkflowGuard`/`allowedActions` landed in **Phase 3** (`workflow.service`). Phase 3 ran
> as three slices — 3a case model + review chain, 3b clarification + college, 3c hearings + board
> meetings + dispatch. Processing now runs on an **async pg-boss worker** (6b; `ASYNC_PROCESSING=false`
> keeps the inline path for tests).

| Phase | Status | Deliverable | Key work |
|---|---|---|---|
| **0 — Foundation** | ✅ Done | DB-backed skeleton | PostgreSQL + Knex migrations, config/env. |
| **1 — Auth + RBAC + Layout** | ✅ Done | Login + guarded shell | users/roles/permissions; local auth (bcrypt, JWT access+refresh); `authenticate` + `requirePermission`/`requireRole`; protected React routing + shell. |
| **2 — Institutions + Org** | ✅ Done | Master registry + org hierarchy | 672 institutes + exception queue; registry; **org hierarchy (supervisor chain, allotments)**; role-prefixed portal + admin console. |
| **3 — Post-visitation lifecycle** | ✅ Done | Cases + review/clarification/hearing/board/dispatch | `applications` state machine + `workflow.service` guard; upload→process(engine)→submit→senior→board approve/reject; **3b** clarification cycle + college; **3c** hearings, board meetings (secretariat overlay), final-order dispatch → Closed. Roles visitor/college/hearing_committee/secretariat/commission_observer added. |
| **3d — Outcomes + letters** | ✅ Done | Structured decisions + official documents | board `outcome` (grant/with-conditions/reduce-intake+seats/deny); `letter.service` generates the Clarification Letter, Hearing Notice (with/without prior clarification) and Final Order from the assessment result (`letters` table). |
| **4 — Audit** | ✅ Done | Traceability | app-wide `audit.middleware` → append-only `audit_log`; `GET /audit` + viewer. Generalizes the per-case `application_events`. |
| **5a — Compliance/penalty ledger** | ✅ Done | Punitive monitoring | `penalties` table; auto seat_reduction/denial from the punitive summary on approve + manual monetary/revocation; status workflow → `compliance_status`; a Penalties tab + cross-case Compliance queue. |
| **5b — Reports & Analytics** | ✅ Done | Insight | `report.service` read-only aggregations → KPIs (cases, avg days-to-decision, seat/monetary totals), status/outcome/compliance distributions, throughput, by-system, penalty ledger, top institutions; `GET /reports/overview` + CSV export (`report:read`); a Reports page (KPI tiles + BarList + tables). |
| **6 — Admin & hardening** | ✅ Done | Config + safety | **6a** `ruleset_versions` registry + activation (SoD, Board ref) + `resolveForCase` per case (engine stops hardcoding Ayurveda) + admin **Rulesets** page; **6b** async pg-boss worker (`ASYNC_PROCESSING`); **6c** RBAC-matrix test (`npm test`) + per-role E2E (`scripts/e2e-rbac.mjs`); **6d** TOTP MFA (self-enroll + login step-up) + frontend code-splitting. |
| **7 — Non-Ayurveda rulesets** | 🟡 In progress | Coverage | **7a** UG Unani + **7b** UG Sowa-Rigpa authored from `markdown/MESAR_*.md` (rules + punitive + report-template module + synthetic golden fixture) and **active**. Remaining: UG Siddha + PG content + tuning the parameter extractors to real non-Ayurveda report layouts. |
| **8 — Notifications** | 🔜 Planned | UX | in-app + email "next action" feed on queue hand-off. |
| **9 — Production readiness** | 🔜 Planned | Ops | real secrets/creds, CORS/HTTPS, rate-limiting, backups, CI/CD, deploy, observability. |
| **10 — Reports depth & doc polish** | 🔜 Planned | Insight+ | date-range/per-institution drill-down, report snapshots, PDF export, retire legacy Dexie `/documents`. |

Each phase ships an end-to-end vertical slice.

---

## 7. Database modules (PostgreSQL)

> **Built today (18 domain tables):** Auth/RBAC + Domain + the **case lifecycle** + `letters` +
> `penalties` + `audit_log`. The `validation_issues`/`ruleset_versions`/report tables below are
> **[Planned — Phase 5b+]**. The as-built case schema differs from the generic "Assessments" group
> below: one `applications` table (with `report_markdown`/`report_json` inline) rather than separate
> assessment/artifact/report tables.

**Auth/RBAC:** `users` (email, hash, status, **supervisor_id**, **institution_id**), `roles`,
`user_roles`, `permissions` / `role_permissions`, `refresh_tokens`.
**Domain:** `institutions` (institute_id `AYU/UNI/SID/SWR####`, system, state, name, …) ·
**`staff_allotments`** (user_id × system × state).
**Cases (built):** `applications` (+`outcome`, `approved_seats`, `intake`, `level`, `permission_type`,
`visitation_*`) · `application_events` (timeline) · `clarifications` · `hearings` + `hearing_members`
· `board_meetings` + `board_meeting_items` · `letters` (generated Clarification/Hearing/Final Order).
**Compliance (built):** `penalties` (seat_reduction / denial / monetary / teacher_code_revocation;
status pending→applied→paid/waived; auto-derived or manual) + `applications.compliance_status`.
**Governance (built):** `audit_log` (append-only trail of every write).
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
| **`workflow.service` (guard)** | ✅ Built | `allowedActions(app,user,ctx)` + `assertCan` — status × role × ownership (403/423) |
| **`application.service` (lifecycle)** | ✅ Built | upload · process (runs the engine inline) · submit · review · decide · clarification · hearing · dispatch · buildContext |
| **`letter.service`** | ✅ Built | generates + issues the Clarification Letter / Hearing Notice / Final Order from the assessment result |
| **`meeting.service`** | ✅ Built | board meetings: create / agenda / confirm minutes (overlay) |
| **`penalty.service`** | ✅ Built | compliance ledger — auto seat_reduction/denial from the punitive summary + manual monetary/revocation + status rollup to `compliance_status` |
| **`audit.service` (+ audit.middleware)** | ✅ Built | append-only `audit_log` of every successful write; `GET /audit` |
| **`queue.service`** (processing worker) | ✅ Built | **async** pg-boss `case-process` queue runs the engine off-request; `application.service.process` enqueues (`ASYNC_PROCESSING=false` = inline) |
| **`report.service`** | ✅ Built | analytics aggregation + CSV exports (5b) |
| **`ruleset.service`** | ✅ Built | `ruleset_versions` registry + activation (SoD, Board ref) + `resolveForCase` per (system, level) |
| `validation.service` | 🔜 Planned | structured extraction-issue tracking (today: junior re-runs/edits inline) |
| `notification.service` | 🔜 Planned | in-app "next action" feed |

**Cross-cutting middleware:** auth → RBAC guard → validation (JSON Schema per payload) → controller →
audit → error (existing). **Queue:** start in-process (`pg-boss`/BullMQ), swappable to a worker
process later.

---

## 9. Frontend module structure

> **Built today:** `features/{auth,institutions,admin,applications,meetings}` + legacy
> `features/{documents,workspace}`. Case screens (`pages/applications/*`) and meetings
> (`pages/meetings/*`) render their action bar from `allowedActions` (no role literals).
> `features/{reports,audit}` are **[Planned]**. Routing is `/:role/*` (see §5 note).

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
| **Cases (lifecycle)** | ✅ Built | `GET /applications` (role-scoped) · `POST /applications` (visitor upload) · `GET /applications/:id` · `/:id/{allowed-actions,events,hearings,clarifications}` · **transitions** `POST /:id/{process,submit,review,decide,revise,request-hearing,appoint-committee,hearing/minutes,dispatch}` · `POST /:id/clarification[/respond]` |
| **Letters** | ✅ Built | `GET /applications/:id/letters` · `POST /applications/:id/letters/preview` |
| **Meetings** | ✅ Built | `GET/POST /meetings` · `GET /meetings/:id` · `POST /meetings/:id/{items,confirm}` |
| **Compliance** | ✅ Built | `GET/POST /applications/:id/penalties` · `GET /penalties` · `PATCH /penalties/:id` |
| **Audit** | ✅ Built | `GET /audit` (entity/actor/date filters) |
| Reports | ✅ Built | `GET /reports/overview` · `GET /reports/export?dataset=cases\|penalties` (CSV) |
| Rulesets | ✅ Built | `GET /rulesets[/:id]` · `POST /rulesets/:id/activate` `{boardRef}` |
| MFA | ✅ Built | `POST /auth/mfa/login` · authed `POST /auth/mfa/{enroll,verify,disable}` |
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
