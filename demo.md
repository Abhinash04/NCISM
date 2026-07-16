# NCISM Assessment Portal — Demo & Verification Guide (through Phase 4)

A follow-along tutorial to run the platform locally and walk the **entire post-visitation case
lifecycle** by hand: landing → login → visitor upload → junior processing → senior/board review →
clarification cycle → hearing → board meeting → **structured decision + auto-generated official
letters** → final-order dispatch → **Closed**, plus the **audit log**. Companion docs:
[HANDOFF.md](HANDOFF.md), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [AuthCred.md](AuthCred.md).

---

## 0. Does the diagram/narrative match the built system?

**Yes — aligned** with what is built (Phases 3a–3d + 4), with **two minor labelling caveats**:

1. **First-pass junior state is `processed`, not `under_validation`.** After the junior clicks
   **Process**, the case is `processed` (report generated) and the junior submits from there.
   `under_validation` is only reached when a senior **returns** a case or a **rejected** case is
   revised. Both are junior-owned pre-submit states, so the diagram's *"Junior Verification
   (under_validation)"* node is conceptually right but mislabels the first pass.
2. **A college response goes junior `submit` → `senior_review` directly.** In code,
   `clarification_responded` lets the junior re-**process** or **submit**; **submit** returns the
   case to `senior_review` (not to a separate "junior verification" node first).

**Now resolved (Phase 3d):** the four outcomes **are** structured — on Approve the board picks
`grant / grant-with-conditions / reduce-intake (+ seats) / deny` (pre-seeded from the punitive
summary), stored on the case; and the Clarification Letter, Hearing Notice (with/without prior
clarification), and Final Order are **auto-generated in the approved NCISM formats** from the
assessment result (institution + shortcoming tables + regulation + signatory) — the board edits and
issues them, and the college sees them on its case. (`reject` still loops to `revise`; a *denial* is
an Approve-path `deny` outcome that dispatches to Closed.)

Everything else matches: allotment-based routing, extraction → CDM → parameter extraction → rule
evaluation → punitive policy → Assessment Report, the junior → senior → board review chain, the
clarification → college → junior loop, the hearing (President appoints committee → minutes → board),
and approve → secretariat dispatch → **closed**.

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
The seed does **not** overwrite an existing user's password, so a database that was seeded earlier
can drift from the current `MOCK_PASSWORD`. For a predictable demo, start fresh:

```bash
docker compose down -v          # wipes the DB volume (safe for a demo)
docker compose up -d db         # Postgres 16 on :5432
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

> First `Process` run spawns the OpenDataLoader CLI (`OPENDATALOADER_CLI_PATH` in `backend/.env`);
> the golden-path fixture below is an Ayurveda report, and only the **Ayurveda-UG ruleset** exists —
> non-Ayurveda cases upload/route fine but `Process` fails loudly (a known limit).

---

## 2. Demo cast

Everyone below is wired for institution **AYU0140 — Maharashtra (Ayurveda)** so allotment routing
and the college binding line up. **Password for every org/portal user: `Password123`.** Admin uses
`ChangeMe123!`.

| Step role | Email | Password |
|---|---|---|
| Visitor | `visitor@ncism.local` | `Password123` |
| Junior Consultant *(allotted Maharashtra)* | `smarnika@ncism.local` | `Password123` |
| Senior Consultant *(supervisor)* | `gaurav.bhandari@ncism.local` | `Password123` |
| Board Member | `member.mehra@ncism.local` | `Password123` |
| President | `president@ncism.local` | `Password123` |
| College *(bound to AYU0140)* | `college.ayu0140@ncism.local` | `Password123` |
| Hearing Committee | `hearing1@ncism.local`, `hearing2@ncism.local` | `Password123` |
| Secretariat | `secretariat@ncism.local` | `Password123` |
| Commission Observer | `observer@ncism.local` | `Password123` |
| Administrator | `admin@ncism.local` | see [AuthCred.md](AuthCred.md) (currently `Admin123`) |

**Sample report PDF** (upload this in step 3.2):
`All data/Part-3 colleges/AYU0659 100 intake capacity.pdf`

> Log out between roles using the **logout icon** at the top-right of the sidebar shell.

---

## 3. Walkthrough

Each step lists **who logs in · what to click · the expected case status after**.

### 3.1 Landing → Login
Open `http://localhost:5173` → click **Open Dashboard** → you're redirected to `/login` (you're not
authenticated yet).

### 3.2 Visitor uploads the report → `uploaded`
Log in as **`visitor@ncism.local`**. In the sidebar open **My Uploads → New upload**:
- **Institution:** type `AYU0140` (or `Maharashtra`) in the search box, then pick it from the select.
- **Session/year:** `2026-27`; **Intake:** `100`; **Permission type:** `yearly`; **Visitation dates:**
  pick two dates. (These optional fields populate the generated letters — leave blank to fill later.)
- **Report PDF:** drag in the sample PDF.
- Click **Create case** → you land on the case, status **Uploaded**. Log out.

### 3.3 Junior processes + submits → `processed` → `senior_review`
Log in as **`smarnika@ncism.local`** (the dealing staff allotted Maharashtra). Open **Applications**
in the sidebar (the page is titled *My case queue*) → click the case:
- Click **Process (run engine)**. After a few seconds the status becomes **Processed** and the
  **Assessment report** tab is populated (the deterministic MARB report).
- Click **Submit for review** → status **senior_review**. Log out.

### 3.4 Senior reviews → `board_review`
Log in as **`gaurav.bhandari@ncism.local`** (smarnika's supervisor). Open **Applications** (titled
*Review queue*) → the case → click **Forward to board** → status **board_review**. *(Return to junior
loops it back to the junior instead.)* Log out.

### 3.5 Board decides — do both branches to see the loop
Log in as **`member.mehra@ncism.local`**. Open **Cases** → the case. You'll see **Approve**,
**Reject**, **Request clarification**, **Request hearing**.

**Branch A — Clarification cycle**
1. Click **Request clarification** → the dialog is **pre-filled with the drafted Clarification
   Letter** (real institution block, subject, the assessment shortcomings, signatory, copy-to) —
   review/edit it → Confirm → status **clarification_open**. The **Letters** tab now shows the issued
   letter (the college sees it too). Log out.
2. Log in as **`college.ayu0140@ncism.local`** → **My Cases** → the case shows a **Respond to
   clarification** panel → enter response text (+ optional PDF) → **Submit response** → status
   **clarification_responded**. Log out.
3. Log in as **`smarnika@ncism.local`** → open the case → **Submit for review** → **senior_review**.
   Log in as **`gaurav.bhandari@`** → **Forward to board** → back to **board_review**.

**Branch B — Hearing** (from board_review again as `member.mehra@`)
1. Click **Request hearing** → status **hearing_requested**. Log out.
2. Log in as **`president@ncism.local`** → open the case → **Appoint hearing committee** → tick
   **hearing1** and **hearing2**, set a date → status **hearing_scheduled**. Log out.
3. Log in as **`hearing1@ncism.local`** → **Hearings** queue → the case → **Record hearing minutes**
   → enter minutes + a verdict (e.g. *submission not considered*) → status returns to
   **board_review**. The **Hearings** tab now shows the panel, minutes, and verdict.

### 3.6 Board approves with a structured outcome → `approved`
Back as **`member.mehra@ncism.local`**, open the case → **Approve (decide)** → the dialog shows an
**outcome** select pre-seeded from the punitive summary (e.g. *reduce-intake*); adjust seats if
needed → Confirm → status **approved**, and the outcome shows in the case header.

### 3.7 Secretariat: board meeting + dispatch → `closed`
Log in as **`secretariat@ncism.local`**:
- **Meetings → New meeting** (number `MARB/2026/07`, pick a date) → open the meeting.
- **Add a board-ready case** → select the case → it appears on the agenda.
- Open the case → **Dispatch final order** → the dialog is **pre-filled with the drafted Final Order**
  (outcome + seats + penalties) → review → Confirm → status **closed**; the **Letters** tab shows the
  Final Order.
- Back on the meeting → **Confirm minutes** → meeting status **confirmed**. Log out.

### 3.8 Commission Observer (read-only) + Audit
Log in as **`observer@ncism.local`** → **Cases** / **Meetings**: everything is viewable but there
are **no action buttons** (read-only oversight). Open **Audit** → the append-only trail shows a row
for every write in this run (login, process, submit, review, clarification, decide, dispatch, meeting
create/confirm) with actor, action, entity, and status; filter by entity/actor. Log out.

### 3.9 Administrator
Log in as **`admin@ncism.local`** (`ChangeMe123!`) → sidebar **Users / Roles / Permissions /
Institutions / Import** under `/admin`. Try **Import** with a `.md`/`.csv` master to see the
insert/update + exception-queue summary.

---

## 4. What to verify

- **Timeline tab** on the case shows the full chain, e.g.
  `uploaded → processing → processed → senior_review → board_review → clarification_open →
  clarification_responded → … → hearing_requested → hearing_scheduled → board_review → approved →
  closed`.
- **Clarifications** and **Hearings** tabs list each round (letter/response; panel/minutes/verdict).
- **Letters** tab lists every issued document (Clarification Letter, Hearing Notice, Final Order),
  rendered in the official format with the case's institution + shortcoming tables + signatory.
- **Audit** (admin/board/president/observer) records every write; GET browsing adds no rows.
- **Action buttons differ per role** — they render only from the backend `allowedActions`, never from
  role literals in the UI.
- **Segregation of duties** holds:
  - A junior **not** allotted the case's state doesn't see it in their queue.
  - A junior has no **Approve/Reject** (that's board-only) → backend returns **403** if forced.
  - Only the **President** can *Appoint committee*; only a member of that panel can *Record minutes*.
  - Only the **Secretariat** can *Dispatch* / manage meetings.
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
   └→ failed (retry)         └── clarification_open ─(college)→ clarification_responded ───┘(junior submit)
board_review ─(board)→ request_hearing → hearing_requested ─(president)→ hearing_scheduled
                                                             (committee minutes) → board_review
board_review ─(board)→ reject → rejected → revise → under_validation
approved ─(secretariat dispatch)→ closed        (closed = terminal, immutable; approved edits → 423)
```

- **Guard:** `backend/src/services/workflow.service.js` (`allowedActions` / `assertCan`).
- **Letters:** `backend/src/services/letter.service.js` (built — reproduces the NCISM formats from
  the assessment result). **Audit:** `backend/src/middlewares/audit.middleware.js` → `audit_log`.
- **Roles/logins:** [AuthCred.md](AuthCred.md). **Architecture:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) → *Case lifecycle*.
- **Next (Phase 5, not built):** compliance/penalty ledger + reports/analytics (compliance/punitive
  summaries, throughput, exports). Phase 6: ruleset editor + non-Ayurveda rulesets + async worker.
