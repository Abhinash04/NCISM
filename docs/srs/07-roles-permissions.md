# 07 — Roles & Permissions

> Part of the [SRS suite](README.md). Enforced by FR-001/FR-002 ([file 04](04-functional-requirements.md)); module names per [09-modules.md](09-modules.md). Role definitions derive from actor evidence in the sources; where a role's system permissions are not directly documented, the mapping is `[INFERRED]` from their documented workflow actions.

## 1. Roles

### R1 — MARB Dealing Staff (Assessor/Section Staff)
Named doctors allotted states × system of medicine (e.g., "Dr. Sunil and Dr. Tanya — Arunachal Pradesh… Ayurveda") (source: Work Allotment in Staff.md § Sheet1).
**Responsibilities:** process allotted colleges' files end-to-end: scrutiny checklists, clarification drafting, assessment-report drafting, punitive computation review, agenda preparation inputs (source: Board meeting Agenda (0) § Agenda Item 2 scrutiny narrative; Assessment of Sardar PAtel... — internal drafting template).
**Modules:** Registries (read/update), Applications & Scrutiny, Visitation (schedule/read), Assessment, Clarification, Letters (draft), Reports/Dashboards (own allotment).
**Workflow ownership:** case progression from intake to board-ready.

### R2 — Board Member (MARB-ISM)
Members sign clarification and hearing letters and sit in Board meetings (source: clarification letter format § signature — "(B. L. Mehra) Member, Medical Assessment and Rating Board"; Hearing letter without clarification § "(Dr. Sushrut Kanaujia) Member").
**Responsibilities:** review/finalize assessment outcomes; approve and sign outbound letters; decide cases in Board meetings.
**Modules:** all case modules (read), Assessment (approve), Board Meetings (decide), Letters (sign/issue), Dashboards.
**Workflow ownership:** decision capture; letter issuance.

### R3 — President, MARB-ISM
Appoints Hearing Committees; supervises hearings; receives hearing submissions at president.marbism@ncismindia.org; competent authority behind letters (source: Hearing letter with clarification format § body; Board meeting Agenda (1) Minutes § Agenda Item 6).
**Responsibilities:** hearing-committee appointment; supervision of hearing outcomes; final approvals where designated.
**Modules:** all (read), Hearings (appoint/approve), Board Meetings (chair-level decisions), Letters (approve), Dashboards (full).
**Workflow ownership:** hearing governance.

### R4 — Hearing Committee Member
Two-member committees conduct VC hearings and record per-shortcoming observations, including "submission … not considered" verdicts (source: Board meeting Agenda (1) Minutes § Agenda Item 6).
**Responsibilities:** review case bundle (assessment, clarification, submissions); conduct hearing; record minutes and verdicts; flag new findings (e.g., AEBAS proxy-marking).
**Modules:** Hearings (own assigned cases: read bundle, write minutes); no other module access `[INFERRED — least privilege]`.
**Workflow ownership:** hearing minutes.

### R5 — Visitor (Visitation Team Member)
Empanelled assessors with Visitor IDs, typically 3 per UG visit, who verify facilities/staff and certify findings individually (source: AYU0659 § Visitor Details & Certification Details).
**Responsibilities:** capture the visitation proforma on site; attach evidence; record observations and reasons for disagreement; certify and sign off.
**Modules:** Visitation (assigned visitations only: write proforma, upload evidence, certify); read-only view of the college's Part-I/II for verification.
**Workflow ownership:** visitation report completion.

### R6 — Board Secretariat / Meeting Administrator `[INFERRED role]`
Someone assembles numbered agendas, records minutes and manages confirmation cycles (source: Board meeting Agenda (0) § structure); the sources don't name the function, so it is modelled as a distinct role.
**Responsibilities:** meeting creation, agenda assembly, minutes generation/confirmation, punitive-policy version activation upon Board approval (with R8).
**Modules:** Board Meetings (full), Letters (dispatch), Rules (activate policy versions), Reports.

### R7 — College User (Principal/Dean or authorized delegate)
External respondent: submits Part-I/II, clarifications and hearing documents; receives letters at the official e-mail (source: letters § To "The Principal"; Board meeting Agenda (0) § college submissions).
**Responsibilities:** submit proformas/documents; respond to clarifications by deadline; view own case status, letters, deadlines.
**Modules:** College Portal View (own institute only): submissions, letters, deadlines, decisions.
**Workflow ownership:** college-side submissions.

### R8 — System Administrator `[INFERRED role]`
**Responsibilities:** user/role management, work-allotment maintenance (with R1 supervisors), reference-table (MESAR schedules) maintenance, template management, integration configuration, audit review.
**Modules:** Administration, Rules (maintain drafts), Audit; no business-decision permissions (segregation of duties).

### R9 — NCISM Commission Observer (Chairperson's office) `[INFERRED role]`
The Chairperson NCISM is copied on all letters and the Commission handles first appeals (source: letters § Copy to; UG Ayurveda 2024 § 65).
**Responsibilities:** read-only oversight; appeal-status updates if appeals are tracked (FR-084/Q-008).
**Modules:** all case modules read-only; Appeals (update) if in scope.

## 2. Role × Permission matrix

Legend: **C**reate / **R**ead / **U**pdate / **A**pprove-Finalize / **X**ecute-special / — none. "Own" = restricted to assigned/allotted records.

| Module → / Role ↓ | R1 Dealing Staff | R2 Board Member | R3 President | R4 Hearing Cmte | R5 Visitor | R6 Secretariat | R7 College | R8 Sys Admin | R9 Commission |
|---|---|---|---|---|---|---|---|---|---|
| Institute/Teacher/Visitor registries | R/U (own states) | R | R | — | R (assigned case) | R | R (own) | C/R/U | R |
| Work allotment | R | R | R/U | — | — | R | — | C/R/U | R |
| Applications & scrutiny | C/R/U (own) | R/A | R/A | — | — | R | C (submit)/R own | — | R |
| Visitation scheduling | C/R/U (own) | R | R/A | — | R (own) | R | R (own, notices) | — | R |
| Visitation proforma & evidence | R | R | R | R (bundle) | C/U/A-certify (own) | R | — | — | R |
| Assessment & punitive ledger | C/R/U (own) | R/A finalize | R/A | R (bundle) | — | R | — | — | R |
| Clarifications | C/R/U (own) | R/A | R | R (bundle) | — | R | C respond/R own | — | R |
| Board meetings & minutes | R (own items) | R/U decide | R/U/A | — | — | C/R/U | — | — | R |
| Hearings | R (own) | R | C appoint/A | C/U minutes (own) | — | R/U schedule | R own/C submit | — | R |
| Decisions & penalties | R (own) | C/A | A | — | — | R | R (own) | — | R |
| Letters — draft | C/U (own) | R | R | — | — | R | — | — | — |
| Letters — sign & dispatch | — | A/X sign | A | — | — | X dispatch | R (own received) | — | R (copies) |
| Appeals tracking (if in scope) | R | R | R | — | — | R/U | R own/C file | — | R/U |
| Rules: MESAR tables (drafts) | R | R | R | — | R | R | — | C/R/U | R |
| Rules: punitive policy activation | R | R/A | A | — | — | X activate (post-Board) | — | draft only | R |
| Documents (case files) | C/R/U (own) | R | R | R (bundle) | C (evidence) | R | C own/R own | — | R |
| Reports & dashboards | R (own scope) | R (all) | R (all) | — | — | R | R (own) | R (system) | R (all) |
| User & role administration | — | — | — | — | — | — | — | C/R/U | — |
| Audit log | — | R | R | — | — | — | — | R | R |

## 3. Segregation-of-duties rules

| # | Rule | Basis |
|---|------|-------|
| SoD-01 | The drafter of an assessment (R1) cannot finalize it; finalization requires R2/R3 (exact authority pending Q-003) | approval practice in letters — "issued with the approval of the competent authority" (source: Hearing letter without clarification format) |
| SoD-02 | A visitor (R5) cannot be assigned to a visitation of their home institute; further conflict rules pending GAP-009 | visitor records carry home college (source: AYU0659 § Visitor Details) `[INFERRED extension]` |
| SoD-03 | Hearing Committee members (R4) act only on cases they are appointed to by R3 | appointment by President (source: Hearing letter with clarification format § body) |
| SoD-04 | R8 (Sys Admin) holds no business-approval permissions; policy activation (R6) requires a recorded Board-approval reference | PUNITIVE POLICY § final para (Board approval precedes effect) |
| SoD-05 | College users (R7) can never see other institutes' cases or internal drafts/board materials | least privilege `[INFERRED]` |
| SoD-06 | Letter dispatch requires prior sign-off by an authorized signatory (R2/R3) | signature blocks on all letters |

## 4. Workflow-ownership summary

| Workflow (file 08) | Primary owner | Approver/decider |
|---|---|---|
| Application & scrutiny | R1 | R2/Board via meeting |
| Visitation | R5 (capture), R1 (scheduling) | R5 collective certification |
| Assessment & punitive computation | R1 | R2/R3 (Q-003) |
| Clarification cycle | R1 | R2 (letter sign-off) |
| Board meeting | R6 | R2/R3 collectively |
| Hearing | R4 | R3 → Board |
| Decision & letters | R2 | R3 / competent authority |
| Rating (later) | R1/agency | Board |
