# NCISM Portal — Information Architecture & Per-Role Page Plans

Enterprise IA for the MARB-ISM internal review portal. Every role gets a **focused, queue-first
portal** exposing only the pages, actions, and data relevant to its responsibilities in the real
assessment workflow. This document is the design source of truth; the implementation follows it in
phases (see [§ Rollout](#rollout)).

## The workflow (single source of truth)

```
Visitor ─upload→ Junior (process → submit) ─→ Senior (forward/return) ─→ Board
          Board ─decide→ approve(outcome) | reject(→revise)
          Board ─→ Clarification → College responds → Junior re-submits → Senior → Board
          Board ─→ Hearing requested → President appoints committee → Committee minutes → Board
          Board approve → Secretariat dispatches Final Order → CLOSED
          (post-decision) → Compliance / penalty monitoring → complied
```

State machine + who-may-act live in `backend/src/services/workflow.service.js` (`POLICY`). Role data
scoping lives in `backend/src/repositories/application.repository.js` (`queueFor`). The UI renders case
actions **only** from the backend `allowedActions` — never from role literals.

## IA principles

1. **Queue-first.** Each portal lands on the work waiting for that role, not an upload box.
2. **Only the Visitor uploads.** No upload affordance anywhere else.
3. **Nav = responsibility.** A role sees a nav item only if its duty needs it (and it holds the perm).
4. **One case, many lenses.** Shared case detail; tabs/actions a role can't use are hidden.
5. **Least surface.** Legacy/unused pages and roles are retired from the portal.

## Role → navigation matrix

| Role | Landing | Nav items |
|---|---|---|
| **Visitor** | My Uploads | Dashboard · My Uploads · Settings |
| **Junior Consultant** | My Case Queue | Dashboard · Cases · Compliance · Settings |
| **Senior Consultant** | Review Queue | Dashboard · Review Queue · Compliance* · Settings |
| **Board Member** | Board Queue | Dashboard · Board Queue · Meetings · Institutions* · Compliance* · Reports · Audit · Settings |
| **President** | President Queue | Dashboard · Board Queue · Hearings · Meetings · Institutions* · Compliance* · Reports · Audit · Settings |
| **Hearing Committee** | My Hearings | Dashboard · Hearings · Settings |
| **Secretariat** | Meetings + Dispatch | Dashboard · Meetings · Dispatch Queue · Reports · Settings |
| **College** | My Case | Dashboard · My Case · Settings |
| **Commission Observer** | Portfolio (Reports) | Dashboard · Cases · Meetings · Compliance · Reports · Audit · Settings |
| **Administrator** | Admin Overview | Institutions · Import · Users · Roles · Permissions · Cases · Compliance · Reports · Audit |

`*` = read-only. Retired from portal: **reviewer / analyst / viewer** (legacy, no org users) and the
ad-hoc `/documents` extraction workflow (reachable by URL only).

---

## Per-role page plans

Each plan: **Responsibilities · Landing · Nav · Widgets/KPIs · Queues · Pages · Actions ·
Sees / Must-not-see · Permissions→workflow · UX.**

### 1. Visitor
Perms: `application:create`, `application:read`, `application:delete`, `institution:read`.
- **Responsibilities:** upload the regulatory visitation report for an institution; track own cases;
  remove a mistaken upload before processing begins.
- **Landing:** *My Uploads* queue.
- **Nav:** Dashboard · My Uploads (+ New upload CTA) · Settings.
- **Widgets/KPIs:** uploaded · in review · decided/closed; recent uploads list.
- **Queues:** own cases (`queueFor` visitor = `uploaded_by = me`).
- **Pages:** My Uploads, New Upload (institution combobox + report PDF), Case detail (read-only:
  status stepper, timeline, issued Letters).
- **Actions:** create case; delete own case while `uploaded`/`failed`.
- **Sees:** only own cases + issued official letters. **Must-not-see:** assessment internals, other
  institutions' cases, staff notes, penalties.
- **Permissions→workflow:** `application:create` = the Upload step (case origin); `application:delete`
  = withdraw pre-processing.
- **UX:** status stepper ("Uploaded → Under review → Decided"); "what happens next" hint; guard against
  duplicate uploads for the same institution+session.

### 2. Junior Consultant (Dealing Staff)
Perms: `application:read/process/submit`, `compliance:read/manage`, `institution:read`, `ruleset:read`.
- **Responsibilities:** process **allotted** colleges (run the engine), scrutinize the extracted
  structure + assessment, submit up to the Senior; rework on return/reject; re-submit after a
  clarification is answered; own the compliance/penalty ledger during monitoring.
- **Landing:** *My Case Queue*, grouped by required action: **To process · To submit · Returned/Rejected
  · Clarification answered · Monitoring**.
- **Nav:** Dashboard · Cases · Compliance · Settings.
- **Widgets/KPIs:** awaiting process · awaiting submit · returned · avg turnaround · open penalties.
- **Queues:** allotted `(system,state)` cases (`queueFor` junior); cross-case compliance queue.
- **Pages:** Cases queue, Case detail (**Assessment report** + **Extracted structure** tabs + timeline
  + penalties tab), Compliance queue.
- **Actions (from `allowedActions`):** process, submit, revise; add/settle penalties.
- **Sees:** allotted cases + extracted document + assessment + penalty ledger. **Must-not-see:** upload,
  decision controls, clarification/hearing/dispatch actions, cases outside allotment.
- **Permissions→workflow:** `application:process` = run engine; `application:submit` = hand to Senior;
  `compliance:manage` = penalty monitoring.
- **UX:** action-grouped queue tabs; one-click Process with progress; extracted-structure beside the
  report; inline penalty status.

### 3. Senior Consultant
Perms: `application:read/review`, `compliance:read`, `institution:read`.
- **Responsibilities:** quality-control the junior's computations; forward to Board or return to Junior.
- **Landing:** *Review Queue* (cases submitted by supervised juniors).
- **Nav:** Dashboard · Review Queue · Compliance (read) · Settings.
- **Widgets/KPIs:** awaiting review · returned this week · forwarded · supervisee load.
- **Queues:** cases `submitted_by` a supervisee (`queueFor` senior).
- **Pages:** Review Queue, Case detail (report + structure + timeline + review panel).
- **Actions:** forward (→ board), return (→ junior) — note required.
- **Sees:** supervised juniors' submitted cases. **Must-not-see:** process/decide/upload; non-supervised
  juniors' cases.
- **Permissions→workflow:** `application:review` = the Senior gate between Junior and Board.
- **UX:** shortcoming + punitive summary up top; mandatory note on forward/return.

### 4. Board Member
Perms: `application:read/decide`, `clarification:issue`, `compliance:read`, `institution:read`.
- **Responsibilities:** decide the case — approve with a structured **outcome** (grant /
  grant-with-conditions / reduce-intake + seats / deny) or reject; request clarification; request a
  hearing; issue the official Clarification Letter.
- **Landing:** *Board Queue* (board_review + in-flight clarification/hearing + decided).
- **Nav:** Dashboard · Board Queue · Meetings · Institutions (read) · Compliance (read) · Reports ·
  Audit · Settings.
- **Widgets/KPIs:** awaiting decision · in clarification · in hearing · decided this session · seat
  reductions/denials.
- **Queues:** board-stage + decided (`queueFor` board).
- **Pages:** Board Queue, Case detail (report + structure + **Letters** + clarifications + hearings +
  timeline), Meetings, Reports, Audit.
- **Actions:** approve(+outcome/seats), reject, request_clarification (edit + issue letter),
  request_hearing.
- **Sees:** full case + assessment + letters + compliance. **Must-not-see:** process/submit/upload;
  appoint committee (President only); dispatch (Secretariat only).
- **Permissions→workflow:** `application:decide` = the Board decision; `clarification:issue` = the
  clarification branch.
- **UX:** decision dialog pre-seeded from the punitive summary; letter preview before issue; outcome
  badges on the case.

### 5. President (MARB-ISM)
Perms: board perms + `hearing:appoint`, `clarification:issue`.
- **Responsibilities:** apex authority — all Board decisions **plus** appoint the 2-member Hearing
  Committee (segregation of duties); portfolio oversight.
- **Landing:** *President Queue* = Board Queue **+ Hearings to constitute** (`hearing_requested`).
- **Nav:** Dashboard · Board Queue · Hearings · Meetings · Institutions · Compliance · Reports · Audit ·
  Settings.
- **Widgets/KPIs:** awaiting appointment · board decisions pending · hearings in progress · portfolio
  throughput.
- **Queues:** board-stage + decided; `hearing_requested` needing a committee.
- **Pages:** as Board + Hearings (appoint committee).
- **Actions:** approve/reject/request_clarification/request_hearing **+ appoint_committee** (exactly 2
  members).
- **Sees:** everything Board sees + hearing constitution. **Must-not-see:** conduct hearings; dispatch.
- **Permissions→workflow:** `hearing:appoint` = constitute the committee after a hearing is requested.
- **UX:** committee picker enforcing 2 conflict-free members; oversight KPIs.

### 6. Hearing Committee
Perms: `application:read`, `hearing:conduct`.
- **Responsibilities:** conduct the appointed hearing; record minutes + verdict → returns the case to
  the Board.
- **Landing:** *My Hearings* (`hearing_scheduled` where I'm a panel member).
- **Nav:** Dashboard · Hearings · Settings.
- **Widgets/KPIs:** hearings assigned · awaiting minutes · held.
- **Queues:** cases with an open hearing this user sits on (`queueFor` hearing_committee).
- **Pages:** Hearings queue, Case detail (report + structure + hearing panel; read-only review + minutes
  form).
- **Actions:** record_minutes(verdict).
- **Sees:** only cases for panels they're on. **Must-not-see:** decide/appoint/dispatch; other panels'
  hearings; the penalty ledger.
- **Permissions→workflow:** `hearing:conduct` = the hearing step between appointment and the Board's
  final decision.
- **UX:** hearing context (shortcomings + prior clarification) beside the minutes form; verdict presets.

### 7. Secretariat
Perms: `application:read`, `meeting:manage`, `order:dispatch`, `report:read`.
- **Responsibilities:** assemble Board meetings (agenda + confirm minutes); dispatch the Final Order →
  **Closed**.
- **Landing:** split — *Meetings* + *Ready to dispatch* (`approved`).
- **Nav:** Dashboard · Meetings · Dispatch Queue · Reports · Settings.
- **Widgets/KPIs:** upcoming meetings · unconfirmed agenda items · orders ready to dispatch · dispatched
  this week.
- **Queues:** board/meeting-relevant cases; `approved` awaiting dispatch (`queueFor` secretariat).
- **Pages:** Meetings list/detail (agenda, confirm minutes), Dispatch Queue, Case detail (Letters + final
  order), Reports.
- **Actions:** create meeting, add agenda items, confirm minutes, dispatch_order (edit final order).
- **Sees:** board-stage/decided cases + meetings + letters. **Must-not-see:** decide/appoint/process;
  editing assessments.
- **Permissions→workflow:** `meeting:manage` = the board-meeting overlay; `order:dispatch` = the final
  Closed transition.
- **UX:** meeting builder; final-order preview from outcome + punitive data before dispatch.

### 8. College (institution user)
Perms: `application:read`, `clarification:respond`.
- **Responsibilities:** view its own case; respond to a Board clarification (text + optional PDF).
- **Landing:** *My Case* (own institution).
- **Nav:** Dashboard · My Case · Settings.
- **Widgets/KPIs:** current status · open clarification (respond-by) · issued letters.
- **Queues:** own institution's case(s) (`queueFor` college).
- **Pages:** My Case detail (status + Letters received + respond panel when `clarification_open`).
- **Actions:** respond to clarification.
- **Sees:** own case status + official letters received. **Must-not-see:** assessment internals /
  punitive scoring, other institutions, staff notes, the penalty ledger, decide/process.
- **Permissions→workflow:** `clarification:respond` = the College reply in the clarification branch.
- **UX:** "Action required" banner; response upload; read-only official letters.

### 9. Commission Observer
Perms: `application:read`, `audit:read`, `compliance:read`, `report:read`.
- **Responsibilities:** read-only oversight across the whole pipeline.
- **Landing:** Portfolio overview (Reports).
- **Nav:** Dashboard · Cases · Meetings · Compliance · Reports · Audit · Settings.
- **Widgets/KPIs:** pipeline funnel by stage · decisions · penalties · throughput.
- **Queues:** all cases (read-only).
- **Pages:** Cases (read), Case detail (**no action bar**), Meetings (read), Compliance (read), Reports,
  Audit.
- **Actions:** none — view / filter / export only.
- **Sees:** everything, read-only. **Must-not-see:** any mutation control.
- **Permissions→workflow:** read grants across every stage = oversight without participation.
- **UX:** oversight dashboard = the Reports overview; every screen strictly read-only.

### 10. Administrator
Perms: `institution:*`, `user:manage`, `role:read`, `ruleset:*`, `report:read`, `audit:read`,
`application:read/delete`, `compliance:read/manage`.
- **Responsibilities:** platform administration — users/roles/permissions, institution registry +
  import, oversight of all cases, data correction (case-delete override), compliance, audit, reports.
- **Landing:** Admin Overview (system health + registry + user counts + pipeline).
- **Nav:** Institutions · Import · Users · Roles · Permissions · Cases · Compliance · Reports · Audit.
- **Widgets/KPIs:** institutions by system · users by role · cases by stage · last-import exceptions ·
  penalties.
- **Queues:** all cases (read + delete override).
- **Pages:** Users/Roles/Permissions, Institutions + Import, Cases + detail, Compliance, Reports, Audit.
- **Actions:** manage users/roles, import/edit institutions, delete any non-finalized case.
- **Sees:** everything administrative. **Must-not-see-as-actions:** business decisions
  (approve/decide/dispatch) — admin is **not** in the approval chain.
- **Permissions→workflow:** admin owns configuration + data integrity, deliberately outside the
  maker-checker approval flow.
- **UX:** admin-console tone; **no** upload box; legacy `/documents` retired from nav.

### 11–13. Retired from the portal
- **reviewer / analyst / viewer** — legacy assessment-workflow roles with **no org users assigned**.
  Removed from nav + routing; grants/rows kept for back-compat.
- Legacy **`/documents/*`** ad-hoc extraction workflow — kept in the router (URL-reachable) but off
  every role's nav; the case lifecycle is the only sanctioned path.

---

## Permission → workflow map (summary)

| Stage | Actor | Action perm | State transition |
|---|---|---|---|
| Upload | Visitor | `application:create` | → `uploaded` |
| Process | Junior (allotted) | `application:process` | `uploaded/failed` → `processed` |
| Submit | Junior (owner) | `application:submit` | `processed` → `senior_review` |
| Review | Senior (supervisor) | `application:review` | `senior_review` → `board_review` / `under_validation` |
| Decide | Board / President | `application:decide` | `board_review` → `approved` / `rejected` |
| Clarify | Board / President | `clarification:issue` | `board_review` → `clarification_open` |
| Respond | College (owner) | `clarification:respond` | `clarification_open` → `clarification_responded` |
| Hearing | Board / President | `application:decide` | `board_review` → `hearing_requested` |
| Appoint | President | `hearing:appoint` | `hearing_requested` → `hearing_scheduled` |
| Minutes | Hearing Committee | `hearing:conduct` | `hearing_scheduled` → `board_review` |
| Dispatch | Secretariat | `order:dispatch` | `approved` → `closed` |
| Monitor | Junior / Admin | `compliance:manage` | penalty ledger → `complied` |
| Delete | Visitor(own,pre-proc) / Admin | `application:delete` | removes non-finalized case |

## Recommendations (not changed without approval)
- **Grant hygiene:** Junior/Senior currently also hold `report:read` + `audit:read` (legacy from
  seed 003). Consider dropping these for a tighter portal (they aren't part of dealing-staff duties).
- **Legacy `assessment:*` perms** (from the document workflow) are vestigial for org roles — safe to
  leave, but they map to no portal page anymore.

## Rollout
- **Phase A:** this document + role dashboards (replace the shared upload "Command Center") + scoped
  nav for Visitor / Junior / Senior / Board; retire the "Documents" nav item.
- **Phase B:** President / Hearing Committee / Secretariat portals + dashboards (+ Dispatch Queue).
- **Phase C:** Commission Observer / College / Admin portals + dashboards; retire reviewer/analyst/
  viewer from nav + routing.

Data scoping (`queueFor`) and action gating (`allowedActions`) already enforce security server-side;
these phases scope **navigation, landing, dashboards, and affordances** — no new backend grants.
