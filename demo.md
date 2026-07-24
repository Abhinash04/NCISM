# NCISM Assessment Portal — Demo & Verification Guide (through Phase 7)

A follow-along tutorial to run the platform locally and walk the **entire post-visitation case lifecycle** by hand: landing → login → visitor upload → consultant processing → senior/board review → clarification cycle → hearing → board meeting → **structured decision + auto-generated official letters** → final-order dispatch → **Closed**, plus the **audit log**, **document downloads/viewer**, and the **multi-ruleset registry**.

> **⚠️ Scope (TCS boundary).** The 20–50-page Regulatory Report is **generated externally by TCS**; the platform begins at report receipt. In this demo the **visitor upload (§3.2) stands in for the eventual TCS API** — a temporary workaround for walking the flow by hand. Everything after receipt is the real platform behaviour.
> Companion docs: [HANDOFF.md](HANDOFF.md), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [NCISM_Assessment_Portal_System_Architecture_Corrected.md](NCISM_Assessment_Portal_System_Architecture_Corrected.md) (AYU0038 case walk-through), [AuthCred.md](AuthCred.md).

---

## 0. Does the diagram/narrative match the built system?

**Yes — aligned** with what is built (Phases 3a–3d + 4), with **two minor labelling caveats**:

1. **First-pass consultant state is `processed`, not `under_validation`.** After the consultant clicks
   **Process**, the case is `processed` (report generated) and the consultant submits from there. `under_validation` is only reached when a senior **returns** a case or a **rejected** case is revised. Both are consultant-owned pre-submit states, so the diagram's _"consultant Verification (under_validation)"_ node is conceptually right but mislabels the first pass.
2. **A college response goes consultant `submit` → `senior_review` directly.** In code, `clarification_responded` lets the consultant re-**process** or **submit**; **submit** returns the case to `senior_review` (not to a separate "consultant verification" node first).

**Now resolved (Phase 3d):** the four outcomes **are** structured — on Approve the board picks `grant / grant-with-conditions / reduce-intake (+ seats) / deny` (pre-seeded from the punitive summary), stored on the case; and the Clarification Letter, Hearing Notice (with/without prior clarification), and Final Order are **auto-generated in the approved NCISM formats** from the assessment result (institution + shortcoming tables + regulation + signatory) — the board edits and issues them, and the college sees them on its case. (`reject` still loops to `revise`; a _denial_ is an Approve-path `deny` outcome that dispatches to Closed.)

Everything else matches: allotment-based routing, extraction → CDM → parameter extraction → rule evaluation → punitive policy → Assessment Report, the consultant → senior → board review chain, the clarification → college → consultant loop, the hearing (President appoints committee → minutes → board), and approve → secretariat dispatch → **closed**.

---

## 1. Prerequisites & one-time setup

Requires **Docker Desktop** (running) and **Node 18+**.

### 1a. Point the frontend at your local API — required

`frontend/.env` ships a placeholder that will make the SPA throw on boot. Set:

```
VITE_API_URL=http://localhost:3000/api/v1
```

### 1b. Backend env

`backend/.env` already has `DATABASE_URL` for the docker Postgres. Nothing to change for a local run.

### 1c. Start Postgres with a clean volume (uniform demo passwords)

The seed does **not** overwrite an existing user's password, so a database that was seeded earlier can drift from the current `MOCK_PASSWORD`. For a predictable demo, start fresh:

```bash
docker compose down -v # wipes the DB volume (safe for a demo)
docker compose up -d db # Postgres 16 on :5432
```

### 1d. Migrate + seed, then run both servers

```bash
# Terminal A — backend
cd backend
npm install
npm run db:setup                # migrate + seed → expect: 672 institutions, ~25 users
npm start                       # API on http://localhost:3000

# Terminal B — frontend
cd frontend
npm install
npm run dev                     # SPA on http://localhost:5173
```

CORS already allows `http://localhost:5173` by default.

> First `Process` run spawns the OpenDataLoader CLI (`OPENDATALOADER_CLI_PATH` in `backend/.env`); the golden-path fixture below is an Ayurveda report. Six rulesets are active — UG **Ayurveda/Unani/Sowa-Rigpa** + PG **Ayurveda/Unani/Siddha**; only **UG Siddha** cases `Process`-fail (`NO_ACTIVE_RULESET`), and live non-Ayurveda/PG extraction still needs tuning (known limits).

---

## 2. Demo cast

Everyone below is wired for institution **AYU0140 — Maharashtra (Ayurveda)** so allotment routing and the college binding line up. **Password for every org/portal user: `Password123`.** Admin uses `ChangeMe123!`.

| Step role                           | Email                                          | Password                                              |
| ----------------------------------- | ---------------------------------------------- | ----------------------------------------------------- |
| Visitor                             | `visitor@ncism.local`                          | `Password123`                                         |
| Consultant _(allotted Maharashtra)_ | `smarnika@ncism.local`                         | `Password123`                                         |
| Senior Consultant _(supervisor)_    | `gaurav.bhandari@ncism.local`                  | `Password123`                                         |
| Board Member                        | `member.mehra@ncism.local`                     | `Password123`                                         |
| President                           | `president@ncism.local`                        | `Password123`                                         |
| College _(bound to AYU0140)_        | `college.ayu0140@ncism.local`                  | `Password123`                                         |
| Hearing Committee                   | `hearing1@ncism.local`, `hearing2@ncism.local` | `Password123`                                         |
| Secretariat                         | `secretariat@ncism.local`                      | `Password123`                                         |
| Commission Observer                 | `observer@ncism.local`                         | `Password123`                                         |
| Administrator                       | `admin@ncism.local`                            | see [AuthCred.md](AuthCred.md) (currently `Admin123`) |

**Sample report PDF** (upload this in step 3.2):
`All data/Part-3 colleges/AYU0659 100 intake capacity.pdf`

> Log out between roles using the **logout icon** at the top-right of the sidebar shell.

---

## 3. Walkthrough

Each step lists **who logs in · what to click · the expected case status after**.

### 3.1 Landing → Login

Open `http://localhost:5173` → the public **landing page** (hero, features, stats, CTA, footer; theme-aware — use the toggle in the nav; the hero illustration shows only ≥769px). Click **Sign In** (or **Get Started**) → `/login` (a redesigned, theme-aware auth page). Every auth screen has a **← Home** link back to the landing and a theme toggle. **Get Started** → `/register` (a design page — accounts are admin-provisioned); **Forgot password?** → `/forgot-password` (honestly directs you to the administrator; no reset email is sent). Real login is unchanged: an **MFA-enabled** user (Settings → Two-factor) gets a 6-digit code step-up after the password.

> **College logins:** besides `college.ayu0140`, the golden colleges **`college.ayu0038`**, **`college.ayu0265`**, **`college.ayu0659`** (`@ncism.local`, `Password123`) are seeded so their clarification/hearing cycles can be driven too.

### 3.2 Visitor uploads the report → `uploaded` _(interim workaround for the TCS API)_

> The report is TCS-generated; this manual upload is the temporary intake until the TCS API is wired (see scope note above).
> Log in as **`visitor@ncism.local`**. In the sidebar open **My Uploads → New upload**. The visitor only picks the institution and uploads the report — **no case-details entry**. Session, intake, permission type and visitation dates are **extracted from the report during processing** and used to populate the generated letters/orders (eliminating duplicate entry).

- **Institution:** type `AYU0140` (or `Maharashtra`) in the search box, then pick it from the select.
- **Report PDF:** drag in the sample PDF.
- Click **Create case** → you land on the case, status **Uploaded**. Log out.

> **Delete a mistaken upload:** while the case is still **uploaded** (or **failed**), the visitor sees a **trash icon** on the row in _My uploads_ and in the case header. Confirm → the case + its PDF are hard-deleted (a `DELETE` row is kept in the audit log). Once a consultant **Processes** it, the icon disappears — only **admin** can delete from then on (any case except an `approved`/`closed` one, which stays immutable → **423**).

### 3.3 consultant processes + submits → `processed` → `senior_review`

Log in as **`smarnika@ncism.local`** (the dealing staff allotted Maharashtra). Open **Applications** in the sidebar (the page is titled _My case queue_) → click the case:

- Click **Process (run engine)**. After a few seconds the status becomes **Processed** and the **Assessment report** tab is populated (the deterministic MARB report). Use **Download report** (Markdown / PDF / Word) at the top of the tab.
- Open the **Documents** tab: the uploaded visitation report renders in an in-app **PDF viewer** (page nav for 20–50-page reports) + a **Download Visitor Report (PDF)** button.
- Click **Submit for review** → status **senior_review**. Log out.

> **Ruleset resolution:** processing resolves the **active ruleset** for the case's (system, level) via the registry (Admin → **Rulesets**), not a hardcoded one. Six are active — UG Ayurveda/Unani/Sowa-Rigpa + PG Ayurveda/Unani/Siddha; a non-Ayurveda/PG upload assesses against its own ruleset (extraction fidelity still tuned for the Ayurveda proforma — see the limits note in §1d).

### 3.4 Senior reviews → `board_review`

Log in as **`gaurav.bhandari@ncism.local`** (smarnika's supervisor). Open **Applications** (titled _Review queue_) → the case → click **Forward to board** → status **board_review**. _(Return to consultant loops it back to the consultant instead.)_ Log out.

### 3.5 Board decides — do both branches to see the loop

Log in as **`member.mehra@ncism.local`**. Open **Cases** → the case. You'll see **Approve**, **Reject**, **Request clarification**, **Request hearing**.

**Branch A — Clarification cycle**

1. Click **Request clarification** → the dialog is **pre-filled with the drafted Clarification Letter** (real institution block, subject, the assessment shortcomings, signatory, copy-to) — review/edit it → Confirm → status **clarification_open**. The **Letters** tab now shows the issued letter (the college sees it too). Log out.
2. Log in as **`college.ayu0140@ncism.local`** → **My Cases** → the case shows a **Respond to clarification** panel → enter response text (+ optional PDF) → **Submit response** → status **clarification_responded**. Log out.
3. Log in as **`smarnika@ncism.local`** (the **Consultant**) → open the case → a **Clarification Review & Verdict** card appears: read the college's submitted text, download any attached PDF, add review remarks (AI Generate available), and record a verdict → status **clarification_reviewed**.
   - **Accepted** → **Submit for review** → **senior_review**; then log in as **`gaurav.bhandari@`** → **Forward to board** → back to **board_review**.
   - **Requires revision (R1)** → the case returns to **clarification_open** with the remarks; the college edits and resubmits, then the Consultant reviews again.

**Branch B — Hearing** (from board_review again as `member.mehra@`)

1. Click **Request hearing** → status **hearing_requested**. Log out.
2. Log in as **`president@ncism.local`** → open the case → **Appoint hearing committee** → tick **hearing1** and **hearing2**, set a date → status **hearing_scheduled**. Log out.
3. Log in as **`hearing1@ncism.local`** → **Hearings** queue → the case → **Record hearing minutes** → enter minutes + a verdict (e.g. _submission not considered_) → status returns to **board_review**. The **Hearings** tab now shows the panel, minutes, and verdict.

### 3.6 Board approves with a structured outcome → `approved`

Back as **`member.mehra@ncism.local`**, open the case → **Approve (decide)** → the dialog shows an **outcome** select pre-seeded from the punitive summary (e.g. _reduce-intake_); adjust seats if needed → Confirm → status **approved**, and the outcome shows in the case header. The **Penalties** tab now lists the **auto-derived** seat-reduction / denial penalties, and the header shows
`compliance: monitoring`.

### 3.7 Secretariat: board meeting + dispatch → `closed`

Log in as **`secretariat@ncism.local`**:

- **Meetings → New meeting** (number `MARB/2026/07`, pick a date) → open the meeting.
- The meeting record captures structured fields — **agenda, participants, per-case discussion / decision / observations, board observations, action items, recommendations** (each with an AI-Generate draft) — which compile into the official minutes.
- **Add a board-ready case** → select the case → it appears on the agenda.
- Open the case → **Dispatch final order**. This action is **blocked until `compliance = complied`** — while penalties are pending the button is hidden and a banner explains why (resolve them in §3.7b first). Once complied → the dialog is **pre-filled with the drafted Final Order** (outcome + seats + penalties) → review → Confirm → status **closed**; the **Letters** tab shows the Final Order (addressee now stacks in proper government-letter format).
- Back on the meeting → **Confirm minutes** → meeting status **confirmed**. Log out.

### 3.7b Compliance monitoring (dealing consultant)

Log in as **`smarnika@ncism.local`** → open the case → **Penalties** tab: the auto seat-reduction / denial rows are listed. Add a **Monetary penalty** — enter the **ghost-faculty count**; the amount auto-computes as _count × the ₹25 lakh rate read from the case's active punitive policy_ (`ghost-faculty` entry in the ruleset's `punitive-policy-*.json`, not a hardcoded constant) and stays editable. Add a **Teacher-code revocation** too; each row has a **Delete** action (with confirm). Move each penalty's status to **paid** — once none are pending/applied the header flips to `compliance: complied`, which **unblocks Final Order dispatch** (§3.7). Open **Compliance** in the sidebar for the cross-case penalty queue. Log out.

### 3.8 Commission Observer (read-only) + Audit

Log in as **`observer@ncism.local`** → **Cases** / **Meetings**: everything is viewable but there are **no action buttons** (read-only oversight). Open **Audit** → the append-only trail shows a row for every write in this run (login, process, submit, review, clarification, decide, dispatch, meeting create/confirm) with actor, action, entity, and status; filter by entity/actor. Still as the observer, open **Reports** (next section). Log out.

### 3.8b Reports & analytics

Any `report:read` holder (board member, president, **commission observer**, secretariat, admin) sees **Reports** in the sidebar. Open it: **KPI tiles** (total / decided cases, avg days-to-decision, seat reductions, ₹ penalties, complied cases), **bar lists** for status / approvals-per-month / outcomes / compliance, and tables for **by-system**, the **penalty ledger** (type × status), and **top institutions** by penalty. Click **Cases CSV** and **Penalties CSV** — each downloads a CSV of the live data. (Figures reflect whatever cases you drove above; the approved case contributes the seat reduction + monetary penalty.)

### 3.9 Administrator

Log in as **`admin@ncism.local`** (`ChangeMe123!`) → sidebar **Users / Roles / Permissions / Institutions / Import** under `/admin`. Try **Import** with a `.md`/`.csv` master to see the insert/update + exception-queue summary.

---

## 4. What to verify

- **Timeline tab** on the case shows the full chain, e.g. `uploaded → processing → processed → senior_review → board_review → clarification_open → clarification_responded → clarification_reviewed → … → hearing_requested → hearing_scheduled → board_review → approved → closed`, with generated content (e.g. the Final Order note) **rendered as formatted markdown**, not raw syntax.
- **Clarifications** and **Hearings** tabs list each round (letter / response / **Consultant review remarks + verdict**; panel / minutes / verdict).
- **Letters** tab lists every issued document (Clarification Letter, Hearing Notice, Final Order), rendered in the official format with the case's institution + shortcoming tables + signatory; the **addressee block stacks each line** (To, / The Principal / institution / address / Inst. ID) in proper government-letter format; each has a **Download** menu (Markdown / PDF / Word) that matches the on-screen layout.
- **Documents** tab renders the uploaded visitation report in the in-app PDF viewer and downloads the original **Visitor Report** PDF; the **Assessment report** tab and confirmed **meeting minutes** are downloadable (MD/PDF/DOCX). Downloads are generated client-side.
- **Penalties** tab: seat-reduction/denial auto-derived on approve; the consultant adds monetary/revocation and drives status to `paid` → case `compliance: complied`. **Compliance** queue lists penalties across cases. RBAC: senior/board/observer read; only consultant/admin manage.
- **Audit** (admin/board/president/observer) records every write; GET browsing adds no rows.
- **Reports** (`report:read` roles) show non-zero KPIs + grouped bar lists/tables after you drive a case to approval; the Cases/Penalties CSV buttons download live data. A visitor/college hitting `/reports/overview` gets **403**.
- **Delete is scoped:** a visitor deletes only their **own** `uploaded`/`failed` case (a second visitor gets **403**); admin deletes any non-finalized case; `approved`/`closed` → **423**. The `DELETE` is recorded in the audit log.
- **Action buttons differ per role** — they render only from the backend `allowedActions`, never from role literals in the UI.
- **Segregation of duties** holds:
  - A consultant **not** allotted the case's state doesn't see it in their queue.
  - A consultant has no **Approve/Reject** (that's board-only) → backend returns **403** if forced.
  - Only the **President** can _Appoint committee_; only a member of that panel can _Record minutes_.
  - Only the **Secretariat** can _Dispatch_ / manage meetings.
  - The **wrong college** can't open or respond to another institution's case.
  - Editing an **approved/closed** case is blocked with **423**.

---

## 5. Reset / re-run

```bash
docker compose down -v && docker compose up -d db && (cd backend && npm run db:setup)
```

…for a clean slate, or just upload another case (steps 3.2 onward) to run the flow again.

---

## Appendix — as-built state machine

```
uploaded → processing → processed → under_validation → senior_review → board_review → approved → closed
   │(err)                    ▲(return)          ▲(re-loop)      │                          ▲
   └→ failed (retry)         └ clarification_open ─(college)→ clarification_responded ─(consultant review)→ clarification_reviewed ─┘(submit)
                               ▲──────────────────(request_revision R1)──────────────────────────────────┘
board_review ─(board)→ request_hearing → hearing_requested ─(president)→ hearing_scheduled
                                                             (committee minutes) → board_review
board_review ─(board)→ reject → rejected → revise → under_validation
approved ─(secretariat dispatch, only when compliance=complied)→ closed   (closed = terminal, immutable; approved edits → 423)
```

- **Guard:** `backend/src/services/workflow.service.js` (`allowedActions` / `assertCan`).
- **Letters:** `backend/src/services/letter.service.js` (built — reproduces the NCISM formats from the assessment result).
- **Audit:** `backend/src/middlewares/audit.middleware.js` → `audit_log`.
- **Compliance:** `backend/src/services/penalty.service.js` (auto-derive + manual + status rollup).
- **Reports:** `backend/src/services/report.service.js` (read-only aggregations + CSV export).
- **Roles/logins:** [AuthCred.md](AuthCred.md).
- **Architecture:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) → _Case lifecycle_.
- **Phase 6 (built):** ruleset registry + activation (SoD) + per-case resolution (admin **Rulesets** page); async processing worker (pg-boss; `ASYNC_PROCESSING`); RBAC-matrix test + per-role E2E (`backend/scripts/e2e-rbac.mjs`); TOTP **MFA** (Settings → Two-factor; login step-up); frontend code-splitting.
- **Phase 7a–7c (built):** UG **Unani** + UG **Sowa-Rigpa** + PG **Ayurveda/Unani/Siddha** rulesets authored + active (six total; registry resolves them per case). **Remaining:** UG Siddha + tuning extractors to non-Ayurveda/PG report layouts; then notifications (8), production readiness (9), reports depth (10).
