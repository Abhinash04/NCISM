# PROJECT HANDOFF, KT & GAP ANALYSIS

**Project:** MARB-ISM Assessment & Permission Management System (NCISM college assessment, permission & rating workflow digitization)
**Prepared:** 2026-07-04 · **Audience:** developers, team leads, manager
**Project stage (verified):** **Documentation / specification stage.** The repository contains the 18 client source documents (`markdown/`) and a complete 15-file SRS suite (`docs/srs/`). **No application code exists yet** — no backend, frontend, database, or tests. Throughout this handoff, "implemented" means *specified in the SRS*; every code-level artifact is honestly marked **❌ Not Started**. Nothing is assumed beyond the documents.

**Status legend used everywhere:**
✅ Fully specified in SRS · 🟡 Partially specified (open client question) · ❌ Not started (code/build) · ❓ Unclear (needs client input)

---

# Deliverable 1: Complete Handoff File

## 1. Project Summary

**What the system solves.** The National Commission for Indian System of Medicine (NCISM), through its Medical Assessment and Rating Board (MARB-ISM), regulates **672 medical colleges** across four systems of medicine — Ayurveda (590), Unani (58), Siddha (17), Sowa-Rigpa (7). Every year MARB must scrutinize new-college/course applications, physically or virtually inspect ("visitation") existing colleges, compare findings against gazette minimum standards (MESAR regulations), issue clarification letters and hearing notices, place cases before numbered Board meetings, apply a Board-approved punitive policy (seat reductions, denials, ₹25-lakh ghost-faculty penalties), and issue permission/denial decisions at least 60 days before student counselling. Today this runs on Word letters, Excel registers and e-mail — error-prone, slow, and hard to defend in appeals. The system digitizes this entire lifecycle.

**Users / roles (9):** MARB Dealing Staff (state-wise file processors), Board Members, President MARB, Hearing Committee Members, Visitors (field inspectors), Board Secretariat, College Users (Principal/Dean), System Administrator, NCISM Commission Observer. Full definitions: [docs/srs/07-roles-permissions.md](docs/srs/07-roles-permissions.md).

**Major modules (9):** M1 Registries & Master Data · M2 Applications & Scrutiny (Section 29) · M3 Visitation Management · M4 Assessment & Punitive Engine · M5 Board Meetings & Hearings · M6 Letters & Notifications · M7 Documents & Evidence · M8 Reporting & Dashboards · M9 Rating (later phase). Full detail: [docs/srs/09-modules.md](docs/srs/09-modules.md).

**Expected workflows (9):** WF-1 New proposal application & scrutiny → LOI → LOP → renewals; WF-2 Visitation (physical/virtual/hybrid/surprise) with per-visitor certification; WF-3 Assessment & punitive computation; WF-4 Clarification cycle; WF-5 Board meeting; WF-6 Hearing (virtual, 2-member committee); WF-7 Decision & letters (+ appeals); WF-8 Ghost-faculty/fraud handling; WF-9 Annual rating. Full detail with Mermaid diagrams: [docs/srs/08-workflows.md](docs/srs/08-workflows.md).

**What the current implementation (= SRS) achieves.** The SRS converts all 18 client documents into: ~45 business rules (BR-xxx), ~60 functional requirements (FR-xxx), ~30 NFRs, a 9-role permission matrix with segregation-of-duties rules, 9 step-by-step workflows, a ~35-entity data model, an integration inventory (NCISM portal, AEBAS, e-mail, NEFT/RTGS, VC, CCTV), 20 open client questions, a risk register, and a phased roadmap.

**Business rules that matter most:** hearing is mandatory before any seat reduction/denial (natural justice, reg. 55(14) MESAR UG Ayurveda 2024); punitive seat-reduction arithmetic is additive with a >50% cumulative denial trigger; AEBAS absence or a zero-faculty department means outright denial; punitive policy is Board-approved per session and must be versioned config, not code; decisions must reach colleges ≥60 days before counselling; a college denied 5 consecutive sessions (UG) / 3 (PG) is deemed closed.

**Data/document flow:** college submits Part-I (college) / Part-II (hospital) proformas + fees → visitors verify on site and certify → rules engine computes deficiencies + punitive ledger → assessment report → clarification letter → Board meeting → (if adverse) hearing → decision letter, copied to Chairperson NCISM and President MARB — every step evidence-linked and auditable.

**Approvals/reviews:** dealing staff draft; Board Members finalize/sign; President appoints hearing committees and approves; the Board collectively decides in numbered meetings; minutes are confirmed at the next meeting; appeals go to the Commission, then Ministry of Ayush.

**Final expected output:** every academic-session permission decision produced in-system, with generated (never hand-edited) statutory letters, a reproducible punitive computation traceable to regulation clause + policy version, and complete audit trail from decision back to field evidence.

## 2. Client Documents Studied / Knowledge Source

All 18 client files under `markdown/` were read/digested in full. The 15 SRS files under `docs/srs/` are the produced knowledge artifacts. "Implementation Status" reflects the documentation-stage reality: knowledge is ✅ specified in SRS; code is ❌ not started for all rows.

| Document / Source | Knowledge Extracted | Module Impacted | Workflow / Role Impacted | Implementation Status | Remarks |
|---|---|---|---|---|---|
| `Master data of institute .md` | Registry of 672 institutes; 8-column schema (Institute ID, system, state, name+address, file no., e-mail, contact); ID scheme AYU####/UNI#### | M1 | All workflows key on Institute ID; R1/R8 | ✅ Specified (SRS 10 § Institute; FR-011/012) · ❌ code | Data quality issues (misspelled headers, merged address) logged as CON-007; migration+cleansing required (Q-015) |
| `Work Allotment in Staff.md` | State × system → named dealing-staff routing; load imbalance (Maharashtra 155 vs 1-college states) | M1, M8 | Case routing; R1 | ✅ Specified (BR-103, FR-002/004) · ❌ code | Purpose inferred (ASM-006); confirms staffing model |
| `clarification letter format .md` | Clarification letter structure: ref/date conventions, subject, shortcoming list, deadline (observed 1 day), signatory, copy-to | M6 | WF-4; R1 draft, R2 sign, R7 receive | ✅ Specified (BR-501, FR-051) · ❌ code | Contains internal session-year contradiction → CON-002; template validation requirement derived from it |
| `Hearing letter with clarification format .md` | Hearing notice after clarification: cites reg. 55(14), 134th Board meeting, show-cause text, VC mode, submission deadline/e-mail | M5, M6 | WF-6; R3/R4/R7 | ✅ Specified (BR-502/503, FR-071) · ❌ code | Hearing date precedes notice date → CON-003; drove date-ordering validation |
| `Hearing letter  without clarification format  .md` | Direct hearing notice variant; staff % formulas (75.55%), HF/LF department tables, AEBAS "suspicious" flags | M4, M5, M6 | WF-3/WF-6; R2 signatory | ✅ Specified (FR-041/045/071) · ❌ code | Source of the staff-availability formula and HF/LF notation (ASM-004) |
| `PUNITIVE POLICY ADOPTED... 2026.md` | Complete session punitive matrix: 5%/faculty, per-post hospital-staff reductions, OPD/occupancy/functionality rules, >50% denial, ghost-faculty ₹25L + code revocation ladder, visitation-denial rule, notes (i)–(v) | M4, M1 | WF-3/WF-8; rules engine | ✅ Specified (BR-401…412, FR-016/042) · ❌ code | Board-approved per session (160th meeting) → versioned rule-set design; interaction with % thresholds open (Q-004) |
| `Assessment of Sardar PAtel... 60 seats .md` | Internal assessment report template with live "Or" branches; punitive-policy columns; "Other observations" block (rating eligibility, COA, fees) | M4 | WF-3; R1 | ✅ Specified (FR-043) · ❌ code | Proof the current process is manual Word drafting → letter/report generation requirement |
| `Board meeting Agenda (0).md` | 160th meeting agenda; full scrutinization checklist for a new college (forms 29A/C/E, certificates, fees NEFT ₹14.16L, 2 clarification passes); a fraud-heavy visitation report | M2, M5, M7 | WF-1/WF-5; R1/R2/R6 | ✅ Specified (BR-202/204, FR-021…027, FR-061) · ❌ code | Best single source for the document checklist and scrutiny loop |
| `Board meeting Agenda (1) Minutes.md` | Hearing-committee minutes format (shortcoming vs clarification vs observation); AEBAS proxy-marking fraud case; "submission not considered" verdicts | M5 | WF-6/WF-8; R4 | ✅ Specified (BR-505, FR-073/074) · ❌ code | Drove the per-shortcoming minute-line model and fraud workflow |
| `Minimum Essential Standards... Undergraduate Ayurveda... 2024.md` (~1.1 MB gazette) | 10 chapters, Schedules I–XXXI, Forms 29A–E: intake slabs, land/area/library/hospital norms, Extended vs Yearly permission, LOI→LOP→renewals, rating A–D, fees, penalties ≤₹1 crore, digital mandates (portal, AEBAS, CCTV, LMS/HIMS) | M1–M9 (standards backbone) | All workflows; all roles | ✅ Specified (BR-30x/60x, FR-015) · ❌ code | Schedules are OCR-mangled → re-keying is a critical-path task (RSK-021) |
| `Minimum Essential standards... UG Unani... 2023.md` | Parallel Unani UG rules: 7 chapters, Schedules I–XXIII, Forms A–E; differing fees (₹2–5L visitation), 40→60% bed occupancy | M1, M4 | Parameterization per system | ✅ Specified (comparative tables in SRS 03/08) · ❌ code | Confirms single-skeleton/parameterized design (ASM-003) |
| `Minimum Essential standards... UG Sowa-Rigpa... 2023.md` | Sowa-Rigpa variant: intake ≤15/16–30, conditional 1-yr permission (decision by 30 June), rating A/B/C scored /400 with scoring proforma Annexure-VI/VI-A | M1, M4, M9 | WF-7/WF-9 variants | ✅ Specified (BR-301/603) · ❌ code | Only system with an itemized rating scoresheet in corpus |
| `NCISM(...Postgraduate...Ayurveda)-Regulations-2024.md` | PG rules: ≤12 seats/programme, guide ratios 3:1/2:1/1:1, LOI→LOP lifecycle, appeals (15d Commission / 7d Ministry), per-department rating, **explicit AI-based online system mandate** | M2, M4, M9 | PG variants of WF-1/3/9 | ✅ Specified (BR-2xx/6xx; AI grounding in SRS 14) · ❌ code | AI mandate anchors roadmap AI proposals |
| `Minimum Essential Standards... PG Siddha... 2024.md` | Parallel PG Siddha (Forms A–G, named Schedules); Board of Unani, Siddha & Sowa-Rigpa governs | M1, M2 | PG parameterization | ✅ Specified · ❌ code | UG Siddha regulation missing from corpus (GAP-003) |
| `Minimum Essential Standards... PG Unani... 2024.md` | Parallel PG Unani; near-identical process constants (fees, grades, penalty caps) | M1, M2 | PG parameterization | ✅ Specified · ❌ code | Confirms cross-system uniformity of process skeleton |
| `AYU0659  100 intake capacity .md` | Filled visitation/assessment report: sections 1–8 structure, Required/Actual/Shortcoming/Observation/Disagreement columns, 20% area relaxation, equipment Essential/General mean (97.59), per-visitor certification | M3, M4 | WF-2/WF-3; R5 | ✅ Specified (FR-033…036/041; ProformaLine entity) · ❌ code | Primary template for the digital proforma |
| `AYU0038 Gaur Bhramin haryana PRINTED.md` | Second filled report; "Part-1 found true" language; hybrid-mode inspection; AEBAS footage requests | M3, M4 | WF-2; R5 | ✅ Specified · ❌ code | Confirms Part-I/II two-part evidence model (BR-304) |
| `AYU0265,  60 intake .md` | Third filled report; deficiency phrasing ("short by 2", "shortcoming of 69 books"), register/BMW/certificate defects, per-parameter Yes/No commission grid | M3, M4 | WF-2/WF-3 | ✅ Specified (Shortcoming taxonomy) · ❌ code | Verdict-token vocabulary source |
| `~$Master data of institute .md` | None — MS Word lock file artifact | — | — | ❓ N/A | Ignore; exclude from any migration |
| **Produced:** `docs/srs/README.md` + `01`–`14` | Full SRS: overview, domain, BR/FR/NFR, architecture, roles, workflows, modules, data model, integrations, gaps, risks, roadmap | All | All | ✅ Complete as documents · ❌ all code Not Started | The implementation-to-date; single source of truth for the build |

**Also recorded:** the task brief that produced the SRS referenced a `docs/analysis/implementation-checklist.md` which **does not exist** in the repo (GAP-001) — flagged, not invented.

## 3. Requirement-to-Implementation Mapping

"Current Implementation" = where the requirement is specified in the SRS. **No requirement has running code.** Status: ✅ = fully specified, ready to build · 🟡 = specified with an open client question blocking final rules · ❌ = code not started (applies to every row; noted once here rather than repeated).

| Requirement ID | Requirement from Client Document | Expected Behaviour | Current Implementation | Status | Gap / Issue |
|---|---|---|---|---|---|
| **Authentication & user management** | | | | | |
| FR-001 | Decisions carry statutory weight; approval separation observed in letters | Role-based authenticated access to all functions | SRS 04 § FR-000; SRS 06 §6 auth design | ✅ spec / ❌ build | No auth service, no login; endpoints missing (see §4) |
| FR-002/004 | Work-allotment sheet routes files by state × system | Admin manages users, roles, allotment; re-routing on staff change | SRS 04; BR-103 | ✅ spec / ❌ build | Allotment table not yet a DB artifact |
| FR-003 | Colleges receive portal credentials with LOP (UG Ay. 2024 §63(3)) | College account per Institute ID, scoped to own data | SRS 04; SRS 11 §3 | 🟡 | Q-011: federate with existing NCISM portal or standalone accounts? |
| NFR-011 | Bribery/pressure on assessors anticipated by regs (PG Ch. XII) | MFA for approval-capable roles | SRS 05 | ✅ spec / ❌ build | — |
| **Role-based access control** | | | | | |
| SRS 07 matrix + SoD-01…06 | Signature/approval practice; President-appointed committees | 9 roles; per-module C/R/U/A matrix; segregation of duties (drafter ≠ finalizer; visitor ≠ home college; admin ≠ business approver) | SRS 07 full matrix | ✅ spec / ❌ build | Backend guards + `allowedActions` API not yet designed in detail (HG-03) |
| **Dashboard** | | | | | |
| FR-095 | 60-day counselling deadline; allotment loads; hearing calendar | Role-scoped dashboards: my-cases, deadlines, board queue, watchlists | SRS 04; SRS 09 M8 | ✅ spec / ❌ build | Dashboard guidance cards (what-to-do-next per state) to be detailed at design time |
| **Main workflow lifecycle** | | | | | |
| BR-207, WF-1 | LOI (29.0) → LOP (29.1) → renewals (29.2–4) → fully established | State machine for establishment ladder | SRS 08 WF-1 stateDiagram | ✅ spec / ❌ build | — |
| BR-301…310, WF-2/3 | Annual Section-28 cycle: Part-I/II → visitation → assessment | Full annual assessment pipeline | SRS 08 WF-2/WF-3 | ✅ spec / ❌ build | — |
| BR-502…505, WF-6 | Hearing mandatory before adverse orders (reg. 55(14)) | Hard workflow guard: no denial/reduction without completed hearing | SRS 08 WF-6/WF-7 | ✅ spec / ❌ build | Highest-severity guard to test (TC-E2E-04) |
| BR-308 | Deemed closed after 5 (UG)/3 (PG) consecutive denials | Consecutive-denial counter + watchlist | SRS 04 FR-094; SRS 10 Institute | 🟡 | CON-001: confirm UG/PG asymmetry intended |
| **Form submission & data collection** | | | | | |
| FR-032/033 | Part-I/II proformas; AYU0659 sections 1–8 | Digital proforma with Required auto-fill, offline capture | SRS 04; SRS 09 M3 | 🟡 | GAP-002: blank Part-I/II templates absent — field lists reverse-engineered, need client confirmation |
| FR-034 | Per-teacher verification tables (AEBAS in-time, registers, ID) | Structured staff-verification capture | SRS 04 | ✅ spec / ❌ build | — |
| **Document upload** | | | | | |
| FR-091, FR-035 | Scrutiny checklist annexures; visit evidence (photos/QR/video) | Typed uploads, metadata, versioning, WORM after finalization, expiry alerts | SRS 04; SRS 09 M7 | ✅ spec / ❌ build | Object-storage + hashing infra not provisioned |
| **Approval / review process** | | | | | |
| FR-044, SoD-01 | "Issued with the approval of the competent authority" | Draft → review → finalize with role separation | SRS 04/07 | 🟡 | Q-003: who finalizes assessments (staff supervisor vs Member)? |
| FR-061…063 | Numbered board meetings; Item-1 minutes confirmation | Agenda assembly, per-item decisions, minutes cycle | SRS 04; SRS 09 M5 | ✅ spec / ❌ build | — |
| **Notifications** | | | | | |
| FR-092 | 1-day clarification windows; 60-day/6-month statutory clocks; self-disclosure by 10th | Deadline engine with escalations; in-app + e-mail | SRS 04 | 🟡 | Q-002: clarification window lengths configurable — values unconfirmed (CON-006) |
| **Reports** | | | | | |
| FR-094 | Board agenda summaries; allotment totals | Pipeline, decisions, punitive register, fees, watchlists, visitor engagement | SRS 04 | ✅ spec / ❌ build | — |
| **Audit logs** | | | | | |
| FR-096, NFR-030/031 | Appeals/criminal proceedings require evidence-grade records (PG Ch. XII 58) | Every action logged; read-audit on sensitive records; decision→evidence traceability | SRS 04/05 | ✅ spec / ❌ build | Append-only audit store to be provisioned |
| **Frontend pages** | | | | | |
| SRS 09 per-module frontend notes | Paper-form familiarity (AYU0659) | ~12 screens: registries, checklist workbench, proforma PWA, computation workbench, agenda builder, hearing bundle, letter console, dashboards, college view | SRS 09 M1–M8 | ✅ spec / ❌ build | Zero screens built; see §5 |
| **Backend APIs** | | | | | |
| SRS 06 §5 + SRS 09 | Resource + explicit-transition API style for RBAC/audit | ~40 endpoints across 8 modules | SRS 09 developer views | ✅ spec / ❌ build | Missing endpoint groups identified in §4 below |
| **Database models** | | | | | |
| SRS 10 | Master/transactional split; erDiagram | ~35 entities incl. versioned StandardsTable & PunitivePolicyVersion | SRS 10 | ✅ spec / ❌ build | No schema/migrations exist; MESAR schedule re-keying not begun (RSK-021) |
| **Validation rules** | | | | | |
| FR-082; M2/M3/M4 validations | CON-002/003 letter errors; fee matrix; certificate validity | Template validations (date ordering, session consistency); fee-vs-matrix; checklist validity windows; proforma ranges | SRS 04/09 | ✅ spec / ❌ build | — |
| **Error handling** | | | | | |
| M1–M8 "Errors" notes | Locked reports, WORM, SoD violations | Standard error semantics: 403 role, 409 state, 422 validation, 423 locked | SRS 09 per-module | ✅ spec / ❌ build | API error envelope standard to be fixed in Phase 1 freeze |
| **Admin actions** | | | | | |
| FR-002/015/016 | Punitive policy per session (160th meeting) | Reference-table maintenance; policy activation gated on Board reference (SoD-04) | SRS 04/07 | ✅ spec / ❌ build | — |
| **User-specific visibility** | | | | | |
| NFR-041; SoD-05 | Hearing evidence sensitivity; college scoping | College sees only own institute; penalties/hearing minutes restricted until decided; row-level scoping | SRS 05/07 | ✅ spec / ❌ build | Needs role-wise data projection in API layer (HG-05) |
| **AI / automation** | | | | | |
| SRS 14 §5 AI-01…07 | PG regs explicitly mandate "AI-based online system" (Ch. VIII 43(5)) | Proposals only: AEBAS anomaly detection, document intelligence, ghost-faculty network detection, triage, risk-scored visits, letter QA | SRS 14 (marked proposals) | 🟡 proposal | Not committed scope; requires client sign-off; assistive-only guardrail |
| **Payment module** | | | | | |
| FR-023, BR-208 | NEFT/UTR records in scrutiny (Agenda (0)) | Fee recording, matrix validation, manual verification screen; reconciliation later | SRS 04; SRS 11 I-04 | 🟡 | Q-012/GAP-010: verification channel (PFMS/Bharatkosh/bank) unknown |
| **Inspection / scheduling module** | | | | | |
| FR-031/037 | Visit modes, 3-visitor teams, surprise re-visits | Visitation scheduling with conflict screening | SRS 04 | 🟡 | GAP-009: visitor empanelment/assignment rules undocumented |
| **Rating module** | | | | | |
| FR-101…103, BR-601…604 | 70:30 weightage; grades A–D; publication before counselling | Eligibility, scorecards, grade banding, publication export | SRS 04; SRS 09 M9 | 🟡 deferred | Q-009 scope; GAP-005 parameter sheets missing |
| **Appeals** | | | | | |
| FR-084, BR-508 | Commission (15–30d) → Ministry (7–15d) | Status tracking with windows | SRS 04 | 🟡 | Q-008: track-only vs process in-system |

## 4. Backend Endpoint Inventory

Everything below is **specified in [docs/srs/09-modules.md](docs/srs/09-modules.md) / [06 §5](docs/srs/06-technical-architecture.md) but NOT implemented** (no backend exists). Conventions: REST/JSON under `/api/v1`; workflow transitions are explicit sub-resources so guards + audit apply per transition. Roles per SRS 07 (R1 dealing staff, R2 board member, R3 president, R4 hearing cmte, R5 visitor, R6 secretariat, R7 college, R8 sysadmin, R9 commission observer). Every endpoint: audit log = **yes** (NFR-030) unless noted.

| Method | Endpoint | Purpose | Allowed Roles | Request Body | Response Body | Validation | Status Dependency | Notifications | Audit | Frontend Screen |
|---|---|---|---|---|---|---|---|---|---|---|
| POST | /institutes | Create institute (LOP event only) | R8 (system-triggered) | master fields | institute | ID regex; state enum | LOP issued | — | yes | Registry grid |
| GET/PATCH | /institutes/{id} | View/update master | all read; R1/R8 update | changed fields | institute | e-mail/phone format; edits audited | edit blocked if deemed-closed pending review | — | yes | Institute 360° |
| GET/POST/PATCH | /teachers, /teachers/{id} | Teacher registry + revocation status | R1/R8 write; read wide | teacher fields | teacher | code format `AY..####` | revocation ladder rules | — | yes | Teacher registry |
| GET/POST/PATCH | /visitors, /visitors/{id} | Visitor registry | R8 write | visitor fields | visitor | home-institute FK | active flag | — | yes | Visitor registry |
| GET/POST/PATCH | /allotments | State×system routing table | R3/R8 | allotment rows | routing config | state+system unique | open-case re-route on change | notify affected R1 | yes | Admin allotment |
| GET | /rules/standards | Versioned MESAR tables | all internal | query: system, level, version | standards lines | — | version pinned per session | — | read-audit no | Rules viewer |
| POST | /rules/policies/{id}/activate | Activate punitive policy version | R6 (post-Board) | boardMeetingRef | active version | Board ref mandatory (SoD-04) | draft → active | notify R1/R2 | yes | Policy admin |
| POST | /applications | Register Sec-29 proposal | R7 submit / R1 register | type, applicant, session, docs | application + temp ID | before last date (BR-203); fee attached | — → Received | ack to college | yes | Application intake |
| GET | /applications/{id}/checklist | Scrutiny checklist | R1/R2/R7(own) | — | checklist items | — | any | — | no | Checklist workbench |
| PATCH | /checklist-items/{id} | Set item status | R1 | status, remarks, docRef | item | status enum; validity dates | application in UnderScrutiny | — | yes | Checklist workbench |
| POST | /applications/{id}/scrutiny-reports | Freeze a scrutiny pass | R1 | — | versioned report | all items dispositioned | UnderScrutiny | — | yes | Checklist workbench |
| POST | /applications/{id}/clarifications | Raise scrutiny clarification | R1 | items, deadline | clarification + letter draft | cycle bound (AMB-007) | UnderScrutiny → ClarificationSought | e-mail college | yes | Checklist workbench |
| POST | /applications/{id}/decision | Record application decision | R2/R3 via board | outcome, boardRef | decision | board decision exists; 6-mo clock | board-ready state | letter pipeline | yes | Board console |
| POST | /fee-payments | Record fee/UTR *(missing from SRS sketches — added)* | R1/R7 | purpose, amount, UTR, date | payment | amount vs FeeMatrix; dup-UTR | linked case open | — | yes | Fee panel |
| POST | /fee-payments/{id}/verify | Manual verification *(missing — added)* | R1 | evidenceRef | verified payment | verifier ≠ recorder | recorded | — | yes | Fee panel |
| POST | /visitations | Create visitation | R1 | institute, purpose, mode, dates | visitation (A#####) | conflict screen (SoD-02) | case in VisitationOrdered/annual cycle | notify college (unless surprise) | yes | Visitation planner |
| POST | /visitations/{id}/assignments | Assign visitor team | R1/R3 | visitorIds | assignments | home-college conflict; PG-exclusive pool | Planned | notify visitors | yes | Visitation planner |
| POST | /visitations/{id}/part-submissions | Record Part-I/II *(missing — added)* | R7/R1 | proforma payload | submission | timestamped; basis flag (BR-310) | before/at visit | — | yes | College portal |
| PUT | /visitations/{id}/proforma/{section} | Capture proforma section | R5 (assigned) | lines: actual, obs, disagreement | section | numeric ranges; own-fields only | InProgress, not locked | — | yes | Proforma PWA |
| POST | /visitations/{id}/evidence | Attach evidence | R5 | file + link target + custody note | evidence item | type/size caps; AV scan | not locked | — | yes | Proforma PWA |
| POST | /visitations/{id}/certifications | Per-visitor certification | R5 | cert answers + disagreements | certification | all blocks answered | InProgress | — | yes | Certification wizard |
| POST | /visitations/{id}/lock | Lock visitation | R5 last certifier / system | — | locked visitation | all visitors certified | Certified → Locked | notify R1 | yes | Proforma PWA |
| POST | /assessments | Create from visitation | R1 | visitationId | assessment draft | visitation locked | Locked | — | yes | Computation workbench |
| POST | /assessments/{id}/compute | Run compliance + punitive engine | R1 | — | metrics + ledger | policy version matches session | Draft/Review | — | yes | Computation workbench |
| GET | /assessments/{id}/ledger | Seat-reduction ledger | R1/R2/R3/R4(bundle)/R9 | — | ledger lines + totals | — | computed | — | no | Computation workbench |
| POST | /assessments/{id}/finalize | Finalize report | R2/R3 (Q-003) | — | final version | SoD-01 drafter ≠ finalizer | Review → Final | notify R1/R6 | yes | Computation workbench |
| POST | /assessments/{id}/recompute | New version after re-visit/clarification | R1 | basisRef | new version | never mutates final | Final | — | yes | Computation workbench |
| POST | /clarifications *(assessment scope)* | Issue clarification | R1 draft → R2 sign | shortcomingIds, deadline | clarification + letter | deadline config (Q-002) | assessment Final w/ shortcomings | e-mail college + deadline timer | yes | Letter console |
| POST | /clarifications/{id}/response | Capture college response *(missing — added)* | R7/R1 | per-shortcoming text + docs | response | within deadline flag | ClarificationOpen | notify R1 | yes | College portal |
| POST | /board-meetings | Create numbered meeting | R6 | number, date | meeting | monotonic number | — | notify R2/R3 | yes | Agenda builder |
| POST | /board-meetings/{id}/agenda-items | Add agenda item | R6 | type, caseRef | item | case board-ready; Item-1 auto | Draft | — | yes | Agenda builder |
| POST | /agenda-items/{id}/decision | Record Board decision | R2/R3 | decision, text | decision | options constrained by case state | Convened | triggers letter/hearing flows | yes | Decision console |
| POST | /board-meetings/{id}/minutes/confirm | Confirm previous minutes | R2/R3 | comments? | confirmed minutes | next-meeting linkage (BR-506) | Circulated | — | yes | Agenda builder |
| POST | /hearings | Create hearing | R3 appoint / R6 schedule | committee, date, VC, deadline | hearing | board decision ref; date ordering (CON-003 guard) | Board granted hearing | notice to college | yes | Hearing scheduler |
| POST | /hearings/{id}/submissions | College submission intake | R7/R6 | PDFs + shortcoming links | submission | before deadline; PDF | Scheduled | notify R4 | yes | College portal |
| PUT | /hearings/{id}/minutes | Record minute lines | R4 (appointed only) | per-shortcoming lines, verdicts, new findings | minutes | SoD-03 scope | Held | — | yes | Hearing bundle viewer |
| POST | /decisions | Issue final decision *(missing — added; implied by FR-081)* | R2/R3 | outcome, intake, ledgerRef, effectiveSession | decision | hearing completed if adverse (BR-502 **hard guard**); BR-411 session shift | BoardFinal | letter pipeline; counselling export flag | yes | Decision console |
| POST | /decisions/{id}/penalties | Register penalty/revocation *(missing — added; FR-085)* | R2/R3 | type, amount, teacher(s) | penalty record | revocation ladder from offence count | Decided | notify college; teacher registry update | yes | Penalty register |
| POST | /decisions/{id}/appeals | Track appeal *(missing — added; FR-084/Q-008)* | R9/R6 | level, filedDate | appeal | window check (BR-508) | Decided | notify R2/R3 | yes | Appeals tracker |
| POST | /letters | Generate letter | R1 draft | templateId, caseId | letter + validation result | full validation suite (FR-082) | case state per template | — | yes | Letter console |
| POST | /letters/{id}/sign | Sign letter | R2/R3 only | — | signed letter | signatory authorized (SoD-06) | Validated | — | yes | Sign queue |
| POST | /letters/{id}/dispatch | Dispatch | R6 | — | dispatch log | signed; recipient e-mail present | Signed | e-mail college + copies; deadline timers start | yes | Dispatch console |
| GET | /notifications | User notification feed | all (own) | — | notifications | — | — | — | no | All dashboards |
| PATCH | /notifications/{id}/read | Mark read *(missing — added)* | owner | — | notification | ownership | — | — | no | All dashboards |
| GET | /deadlines | Deadline timers by scope | R1/R2/R3/R6 | scope query | timers | — | — | — | no | Dashboards |
| POST | /documents · GET /documents/{id} · POST /documents/{id}/versions | Upload/fetch/version docs | scoped per role | file + metadata | document | type metadata; hash; WORM | finalization sets immutability | expiry alerts | yes (read-audit on sensitive) | Doc manager |
| POST | /bundles | Assemble hearing bundle | R6/R1 | caseId, purpose | bundle | completeness check | pre-hearing | notify R4 | yes | Hearing bundle viewer |
| GET | /documents/expiring | Expiring certificates | R1/R6 | days | list | — | — | — | no | Dashboards |
| GET | /search | Global search | all (scoped) | q | results | scope filter per role | — | — | no | Global search |
| GET | /dashboards/{role} | Role dashboard data | own role | — | KPI payload | — | — | — | no | Dashboards |
| POST | /reports/{key}/run | Run standard report | R1(own)/R2/R3/R6/R9 | params | report file | visibility rules (NFR-041) | — | — | yes (exports) | Reports |
| POST | /auth/login · POST /auth/refresh · POST /auth/logout | Authentication *(missing — added; FR-001)* | public/authenticated | credentials | tokens + role claims | MFA for approval roles | — | — | login audited | Login |
| GET | /cases/{id}/allowed-actions | **Backend-driven action list** *(missing — added; mandated by handoff rule §7)* | all (scoped) | — | allowedActions[] per role+state+ownership | derived from workflow guard + RBAC | any | — | no | Every case screen |
| GET/POST | /users, /users/{id} | User admin *(missing — added; FR-002)* | R8 | user + roles | user | role validity | — | — | yes | Admin |
| POST | /rating/* (M9) | Rating cycle endpoints | deferred | — | — | — | — | — | — | Deferred (Q-009) |

**Endpoint issues identified (nothing implemented, so all findings are spec-level):**

- **Missing from SRS module sketches, added above:** `/auth/*`, `/users/*`, `/cases/{id}/allowed-actions`, `/fee-payments*`, `/visitations/{id}/part-submissions`, `/clarifications/{id}/response`, `/decisions` (+ `/penalties`, `/appeals`), `/notifications/{id}/read`. These are implied by FR-001/002/023/032/052/081/084/085 but had no explicit endpoint — carry them into the Phase-1 endpoint freeze.
- **Duplicate/overlap risk:** clarifications exist in two scopes (application/M2 vs assessment/M4). Standardize on one `/clarifications` resource with a `scope` discriminator to avoid parallel implementations.
- **Wrong-mapping risk:** letters must never be creatable outside a case context; enforce `caseId` mandatory to prevent free-standing letters (CON-002/003 class errors).
- **Weak-validation risk (to pre-empt):** `PATCH /checklist-items` and `PUT /proforma` accept semi-structured payloads — define JSON Schemas per document-type/section in Phase 1, not free-form JSON.
- **Role-control risk (to pre-empt):** `GET /assessments/{id}/ledger` and hearing evidence must apply NFR-041 restricted visibility — not just authentication.
- **Frontend/backend alignment:** no misalignment exists yet (nothing built); the `allowedActions` endpoint is the mechanism that prevents it — frontends must render actions only from it (see §7 rule).

## 5. Frontend Screen / Component Mapping

All screens are **specified (SRS 09 frontend notes) and ❌ Not Built**. "Current Gap" therefore = does not exist; the column records design gaps to close during build.

| Screen / Page | Purpose | Backend Endpoint Used | Allowed Roles | Actions Available | Current Gap | Recommended Fix |
|---|---|---|---|---|---|---|
| Login / MFA | Authenticate all users | /auth/* | all | login, MFA, reset | Not built; auth flow undefined beyond SRS 06 §6 | Build first; MFA for R2/R3/R6/R8 |
| Registry grids + Institute 360° | Masters: institutes, teachers, visitors; per-college history | /institutes, /teachers, /visitors, /search | R1/R8 edit; others read | search, view, edit (audited) | Not built; legacy migration UI (exception review) unspecified | Include migration-exception queue in M1 build |
| Admin: allotment & users | Routing table + user/role admin | /allotments, /users | R8 (+R3 allotment) | CRUD, re-route open cases | Not built | Re-route preview before commit |
| Application intake + Checklist workbench | Sec-29 proposals; scrutiny checklist with clarification history | /applications*, /checklist-items, /fee-payments | R1; R7 submit view | set status, raise clarification, freeze pass, record fees | Not built; per-doc-type field schemas pending Phase-1 | Tri-state chips + "after clarification" history mirroring Agenda (0) table |
| Visitation planner | Create visits, assign teams | /visitations, /assignments | R1/R3 | schedule, assign, mode select | Not built; visitor-conflict rules partial (GAP-009) | Enforce SoD-02 client- and server-side |
| **Proforma PWA (tablet)** | Field capture sections 1–8 + evidence + certification | /proforma, /evidence, /certifications, /lock | R5 (assigned only) | capture, camera upload, certify | Not built; offline sync design (RSK-023) needs prototype early | Per-line visitor ownership; local draft persistence; conflict surfacing |
| Computation workbench | Run engine, review ledger, finalize | /assessments/* | R1 draft; R2/R3 finalize | compute, review, override-with-reason, finalize | Not built; golden-test fixtures not created (SC-02) | Inline rule citations; ledger diff between versions |
| Letter console + Sign queue + Dispatch console | Generate/validate/sign/dispatch letters | /letters/* | R1 draft; R2/R3 sign; R6 dispatch | generate, preview validation failures, sign, dispatch | Not built; template library not authored | Validation-annotated preview; block dispatch until signed |
| Agenda builder + Decision console | Board meetings: agenda, decisions, minutes | /board-meetings/*, /agenda-items/* | R6 build; R2/R3 decide | assemble, decide per item, confirm minutes | Not built | Board-ready completeness checks before item add (RSK-060) |
| Hearing scheduler + Bundle viewer | Appoint, schedule, run hearings; 3-column minutes | /hearings/* , /bundles | R3 appoint; R4 minutes; R6 schedule | appoint, schedule VC, record minutes, verdicts | Not built; VC integration unknown (Q-013) | Side-by-side shortcoming/clarification/observation layout per Agenda (1) |
| Penalty & appeals register | Penalties, revocations, appeal statuses | /decisions/{id}/penalties, /appeals | R2/R3; R9 update appeals | register, track windows | Not built | Revocation ladder auto-computed from offence count |
| Role dashboards | My cases, deadlines, watchlists, calendars | /dashboards/{role}, /deadlines, /notifications | each role (own scope) | drill-through, mark-read | Not built; guidance-card content undefined | "Next action" guidance card per case state (see §6 notifications) |
| College portal view | Own cases, letters, deadlines; submit responses/Part-I/II/hearing docs | /part-submissions, /clarifications/{id}/response, /hearings/{id}/submissions, /letters (own) | R7 (own institute only) | view status, upload, respond | Not built; portal-vs-standalone open (Q-011) | Row-level scoping enforced server-side; e-mail remains legal channel |
| Reports | Standard reports + exports | /reports/{key}/run | R1 own; R2/R3/R6/R9 all | run, export (audited) | Not built | Restricted-data export rules (NFR-041) |

**Design mandates for every screen (from the handoff rules + SRS):** (a) actions render **only** from `GET /cases/{id}/allowed-actions` — no hardcoded role checks in frontend; (b) workflow status timeline visible on every case; (c) all error/success messages map to the standard API error envelope; (d) screens parameterized by system-of-medicine/level so future systems (e.g., Siddha UG) are config, not new screens.

## 6. Workflow / State Machine Handoff

**Single source of truth: [docs/srs/08-workflows.md](docs/srs/08-workflows.md).** Any future frontend/backend logic that deviates from these states must be flagged and reconciled against that file, not patched locally. Below is the consolidated master case lifecycle (annual Section-28 assessment, the volume driver), followed by the Section-29 ladder states. Dashboard-guidance text is the "what happens next" message each affected user should see.

### 6.1 Annual assessment case (Section 28)

| State / Stage | Allowed Role (act) | Allowed Action | Next State | Required Validation | Notification Required | Audit Required | Data Visibility Rule |
|---|---|---|---|---|---|---|---|
| CycleOpen | system/R1 | open session case per institute | AwaitingPartI | session + fee status check | College: "Submit Part-I/II; pay visitation fee" | yes | R1 (allotted), R2/R3/R9 view; R7 own |
| AwaitingPartI | R7 | submit Part-I/II | VisitationPlanned | proforma completeness; timestamps | R1: "Part-I received" | yes | as above |
| VisitationPlanned | R1 | create visit + assign team | VisitationInProgress | SoD-02 conflict; mode set | Visitors: assignment; College: schedule (unless surprise) | yes | R5 gains access to college Part-I/II |
| VisitationInProgress | R5 | capture proforma/evidence; certify | VisitationLocked | all visitors certified; ranges valid | R1: "Visitation locked" | yes | R5 own lines editable only |
| — (any visit stage) | R7 refuses visit | record refusal | DenialProposed | evidence of refusal | R2/R3 alerted | yes | BR-409 route |
| VisitationLocked | R1 | create assessment + compute | AssessmentDraft | policy version matches session | — | yes | ledger restricted (NFR-041) |
| AssessmentDraft | R1 | submit for review | AssessmentReview | computations complete; overrides have reasons | Reviewer: "Assessment awaiting finalization" | yes | internal only |
| AssessmentReview | R2/R3 (Q-003) | finalize | AssessmentFinal | SoD-01 (drafter ≠ finalizer) | R1/R6 | yes | internal only |
| AssessmentFinal (clean) | R6 | queue for Board | BoardReady | no open shortcomings | R2: agenda queue | yes | — |
| AssessmentFinal (shortcomings) | R1 draft, R2 sign | issue clarification letter | ClarificationOpen | letter validation suite; deadline set (Q-002) | College e-mail + deadline timer; dashboard: "Respond by <date>" | yes | R7 sees own shortcomings + letter |
| ClarificationOpen | R7 | submit response | ReExamination | per-shortcoming mapping; deadline flag | R1: "Response received" | yes | R7 own |
| ClarificationOpen (lapsed) | system | deadline lapse | ReExamination | — | R1 + escalation | yes | — |
| ReExamination | R1 | mark items resolved/unresolved | BoardReady (resolved) / HearingRecommended (adverse unresolved) | every shortcoming dispositioned | R6 queue | yes | — |
| HearingRecommended | R2/Board | grant hearing (BR-502 mandatory before adverse order) | HearingScheduled | Board decision recorded | — | yes | — |
| HearingScheduled | R3 appoint; R6 schedule | notice + VC + submission deadline | HearingHeld / DecidedOnRecords (no-show, BR-504) | date ordering (notice < deadline < hearing) | College notice; R4 bundle ready | yes | R4 gains bundle access |
| HearingHeld | R4 | record per-shortcoming minutes + verdicts | MinutesToBoard | every noticed shortcoming addressed | R3: minutes ready | yes | minutes restricted until Board |
| MinutesToBoard / BoardReady | R2/R3 | Board decision: grant / grant-reduced / deny | Decided | **hard guard: adverse decision requires completed hearing**; ledger attached for reductions | — | yes | — |
| Decided | R2 sign; R6 dispatch | generate + sign + dispatch decision letter | Closed (or AppealOpen) | letter validations; BR-411 session shift if counselling notified | College + Chairperson NCISM + President MARB copies; dashboard: outcome + appeal window | yes | decision public to case parties; penalties per NFR-041 |
| AppealOpen | R9/R6 | record appeal + outcome | Closed / BoardFinal (reconsideration) | window check (BR-508) | R2/R3 | yes | — |
| Closed (denied) | system | increment consecutive-denial counter | DeemedClosedWatch at 5 (UG)/3 (PG) | CON-001 confirm | management watchlist | yes | — |

**Entry condition:** institute active + session opened. **Exit conditions:** Decided→Closed, or DeemedClosed. **View-only:** R9 everywhere; R7 sees own case only (never internal drafts, ledgers pre-decision, or board materials). **Should never see actions:** R5 outside assigned visitations; R4 outside appointed hearings; R8 has no business actions. **On validation failure:** transition blocked with 409/422, actor notified, no partial state change (transitions transactional). **Dashboard notifications:** every state change produces a "next action" card for the responsible role and a status update for the college. **Audit:** every transition writes actor + timestamp + before/after state (NFR-030).

### 6.2 Section-29 establishment ladder (summary)

Received → UnderScrutiny → (ClarificationSought ↔ UnderScrutiny) → VisitationOrdered → Assessed → BoardDecision → **Disapproved** | **LOI (29.0)** → LOP (29.1, permanent ID + credentials) → Renewal1/2/3 (29.2–29.4) → FullyEstablished. Guards: non-rectifiable shortcomings (BR-204) skip clarification and route to disapproval; LOI→LOP requires compliance + security deposit verified; 6-month decision clock (BR-206) alarms at T-60/T-30 days. Full table & diagram: SRS 08 WF-1.

## 7. Role and Permission Matrix

Consolidated from [docs/srs/07-roles-permissions.md](docs/srs/07-roles-permissions.md) into the requested action columns. Since no code exists, there are **no mixed/incorrect permissions in a build yet** — this matrix is the design mandate the build must satisfy, and the "pre-flagged risks" list below records exactly where implementations typically get it wrong.

| Role | Can View | Can Create | Can Edit | Can Approve/Reject | Can Assign | Can Upload | Can Download | Can Comment | Can Administer | Restricted From |
|---|---|---|---|---|---|---|---|---|---|---|
| R1 Dealing Staff | own-allotment cases + masters | applications, visitations, assessments, letter drafts, clarifications | own-allotment case data | ❌ | visitor teams (propose) | case docs | own-scope reports | yes (case notes) | ❌ | finalizing own drafts (SoD-01); signing letters; other states' cases |
| R2 Board Member | all cases | decisions, penalties | agenda decisions | ✅ finalize assessments, sign letters, board decisions | ❌ | ❌ | all reports | yes | ❌ | policy activation without Board ref; system admin |
| R3 President | all | hearings (appoint) | approvals | ✅ competent-authority approvals | hearing committees, re-visits, allotment | ❌ | all | yes | allotment | drafting; system admin |
| R4 Hearing Cmte | appointed-case bundle only | hearing minutes | own minutes (until placed) | verdicts per shortcoming | ❌ | minute attachments | bundle | yes (observations) | ❌ | everything outside appointed cases |
| R5 Visitor | assigned visitation + college Part-I/II | proforma entries, evidence, certification | own observation fields only | own certification | ❌ | evidence | ❌ | observation/disagreement fields | ❌ | other visitations; assessments; own home college (SoD-02) |
| R6 Secretariat | all cases | meetings, agenda items, bundles | schedules, minutes docs | ❌ (records others' decisions) | hearing scheduling | minutes/agenda docs | reports | yes | policy activation (post-Board only) | making business decisions; signing |
| R7 College | **own institute only**: status, letters, deadlines, decisions | submissions (Part-I/II, responses, hearing docs, applications) | own drafts pre-submit | ❌ | ❌ | own case docs | own letters/decisions | clarification responses | ❌ | other institutes; internal drafts; ledgers pre-decision; board/hearing internals |
| R8 Sys Admin | system config, audit | users, allotment rows, reference-table drafts, templates | config | ❌ | roles | ❌ | audit exports | ❌ | ✅ full admin | **all business approvals/decisions** (SoD-04) |
| R9 Commission | all (read-only) | appeal records (if in scope) | appeal status | ❌ | ❌ | ❌ | all reports | ❌ | ❌ | any create/edit/approve on cases |

**The governing rule (must be enforced, not documented only):** *the frontend never decides permissions.* The backend computes `allowedActions` per (role × workflow state × record ownership) via `GET /cases/{id}/allowed-actions`, and the frontend renders only those. Every transition endpoint independently re-checks the same guard (defense in depth).

**Pre-flagged permission risks for the build (nothing violated yet — prevent these):**

- ❗ Drafter-finalizes-own-assessment (violates SoD-01) — guard must compare `finalizedBy ≠ draftedBy`.
- ❗ Visitor assigned to home college (SoD-02) — validate at `/visitations/{id}/assignments`, not just UI.
- ❗ Sys Admin acquiring approve permissions "temporarily for testing" — never; create role-specific test users instead (see §10).
- ❗ College account enumerating other institutes via search/list endpoints — enforce row-level scoping in queries, not response filtering.
- ❗ Letter dispatch without signature — middleware on `/letters/{id}/dispatch` (SoD-06).
- ❗ Hearing minutes editable after Board placement — 423 lock.
- ❗ Punitive policy activated without Board-meeting reference — 422 (SoD-04).

## 8. Gap Analysis

Gap IDs `HG-xxx` (handoff gaps) to avoid colliding with SRS knowledge-gap IDs (`GAP/CON/AMB/Q-xxx` in [docs/srs/12](docs/srs/12-gaps-and-questions.md)). Priority: P1 blocker · P2 high · P3 medium.

| Gap ID | Requirement | Current Gap | Business Impact | Technical Impact | Priority | Best Fix | Files / Modules to Update |
|---|---|---|---|---|---|---|---|
| HG-01 | Entire application (FR-001…103) | **No code exists** — backend, frontend, DB, infra all absent | Manual process continues; each season delay costs a full year (annual cycle) | Everything downstream | P1 | Execute build plan (Deliverable 3), MVP = annual-assessment cycle per SRS 14 | New repos/services per SRS 06; all modules |
| HG-02 | Punitive engine correctness (FR-041/042) | Rule interpretation unconfirmed: per-faculty 5% vs % thresholds (Q-004), equipment threshold (Q-005), AEBAS "suspicious" rule (Q-006) | Wrong seat reductions → appeals/litigation (RSK-001) | Engine cannot be finalized; golden tests unwritable | P1 | Client rules workshop; written sign-off; encode as versioned rules + golden tests vs corpus examples (SC-02) | M4 rules engine; docs/srs/12 Q-004/005/006 |
| HG-03 | Backend-driven permissions (§7 rule) | `allowedActions` endpoint + guard middleware exist nowhere (also absent from SRS API sketches — added in §4) | Role leakage, hardcoded frontend actions, unauditable decisions | Cross-cutting middleware needed before any screen is built | P1 | Build WorkflowGuard service + `/cases/{id}/allowed-actions` first; all transition endpoints consume it | M-core guard service; every controller |
| HG-04 | MESAR Required values (FR-015) | Regulation schedules exist only as OCR-mangled gazette text; zero re-keyed tables | Wrong Required values corrupt every assessment (RSK-021) | Standards DB empty; M4 blocked | P1 | Dual-entry re-keying (Ayurveda UG first) with reviewer sign-off; spot-check vs AYU0659 Required columns | StandardsTable/StandardsLine seed data |
| HG-05 | Data visibility (NFR-041, SoD-05) | Row-level scoping and restricted-visibility rules are prose, not enforced queries | Colleges/committees could see others' or pre-decision data | Query-layer scoping design needed | P1 | Role-wise data projection at repository layer; scoped list endpoints; read-audit on sensitive records | M-core data layer; all list/get endpoints |
| HG-06 | Statutory letters (FR-082) | No template library; no validation suite; observed error classes (CON-002/003) unguarded | Defective letters void decisions on appeal (RSK-002/025) | Template engine + validation gate to build | P1 | Author templates from the 3 letter formats; validation suite as release gate; canary human review | M6; letter templates + test fixtures |
| HG-07 | Institute master (FR-012) | 672-row Excel unmigrated; known defects (CON-007) | Cases attach to wrong colleges (RSK-022) | Migration + cleansing pipeline absent | P2 | Cleansing script + exception report + client sign-off (Q-015, SC-06) | M1 migration job |
| HG-08 | Part-I/II capture (FR-032/033) | Blank proforma templates missing (GAP-002); fields reverse-engineered | Wrong field capture invalidates verification baseline | Form schemas unconfirmed | P2 | Obtain blank Part-I/II from client; else confirm reverse-engineered schema in UAT | M3 form schemas |
| HG-09 | Workflow guards (WF tables §6) | No state machine implementation; hearing-before-adverse-decision guard (BR-502) unenforced | Natural-justice breach voids denials | State machine + transition guards to build | P1 | Explicit state-machine per case type; adverse decisions require `hearingCompleted` | M-core workflow engine |
| HG-10 | Notifications/deadlines (FR-092) | No deadline engine; statutory clocks (6-month, 60-day, 10th-of-month) untracked | Missed statutory deadlines (RSK-003) | Scheduler + escalation absent | P2 | Deadline timer service with escalation matrix; dashboard cards | M6 scheduler |
| HG-11 | Audit trail (FR-096) | No audit store | Decisions indefensible in appeal/court (RSK-041) | Append-only store + interceptors needed | P1 | Audit middleware on every mutation; append-only store; certified export | M-core audit; infra |
| HG-12 | Fee verification (FR-023) | Channel unknown (Q-012/GAP-010); no payment records | Fee-status errors block/mis-enable cases | Manual-verify screen minimum | P2 | Build manual verification with evidence; integrate channel when confirmed | M2 fee module; SRS 11 I-04 |
| HG-13 | Missing regulations | UG Siddha absent (GAP-003); Sowa-Rigpa PG unknown (GAP-004) | Those segments cannot be configured truthfully | Parameter tables incomplete | P2 | Obtain documents from client (Q-018); block those segments at go-live (RSK-043) | M1 standards seed |
| HG-14 | Offline field capture (NFR-022) | No PWA/offline design validated | Visit-day data loss at rural sites (RSK-023) | Sync/conflict model unproven | P2 | Early spike: offline proforma prototype before M3 build | M3 PWA |
| HG-15 | Source contradictions | 8 contradictions in client docs (CON-001…008: deemed-closure asymmetry, letter date errors, board numbering, seat-reduction basis, 1-day window, master spelling, terminology overload) | Ambiguous rules → inconsistent decisions | Rule tables can't be finalized where affected | P2 | Client confirmation session; record resolutions as BR amendments | docs/srs/12; affected BR rows |
| HG-16 | Tests | Zero tests of any kind | No safety net; punitive math unverifiable | Full pyramid needed | P1 (with build) | Test plan in §10; golden tests first (SC-02) | all modules |
| HG-17 | Dashboard guidance | Next-action guidance content per state not written | Users won't know what to do next; adoption risk (RSK-004) | Content + card component | P3 | Author guidance strings per §6 state table during M8 build | M8 |
| HG-18 | Integrations | AEBAS/portal/VC/e-mail contracts unknown (GAP-006, Q-010–Q-013) | Automation deferred; manual fallbacks needed | Adapter layer + fallbacks | P2 | Interface-discovery workshop; import/manual-first phasing per SRS 11 | M-integrations |
| HG-19 | Performance/accessibility evidence | No Lighthouse/perf/accessibility reports exist in shared files (none were provided) | Unknown UX quality at delivery | Baseline missing | P3 | Add Lighthouse + WCAG 2.1 AA (NFR-062) checks to CI once frontend exists | CI pipeline |
| HG-20 | Rating module (M9) | Parameter scoresheets missing for Ayurveda/Unani (GAP-005); scope unconfirmed (Q-009) | Rating undeliverable regardless of build | Deferred by design | P3 | Defer to Phase 5; obtain Board parameter sheets | M9 |

## 9. Best Solution / Recommended Technical Approach

| Gap ID | Recommended Approach | Backend Fix | Frontend Fix | Database Fix | Testing Required | Risk | Final Acceptance Criteria |
|---|---|---|---|---|---|---|---|
| HG-01 | Build per SRS 14 phasing: foundation (M1/M7) → annual cycle MVP (M3/M4/M6) → decision layer (M5) → Sec-29 (M2) | Stand up modular monolith (SRS 06): controllers/services/repos per module | SPA shell + role routing | PostgreSQL schema from SRS 10 erDiagram; migrations | Smoke + module tests per increment | Scope creep — hold MVP line | Annual-cycle case processable end-to-end in staging with demo data |
| HG-02 | Rules workshop → signed interpretation memo → versioned rule expressions | Rules engine evaluates DB-stored expressions; no hardcoded formulas | Ledger view shows rule citation per line | PunitivePolicyVersion/PunitiveRule tables + effective-session key | **Golden tests**: AYU0659 (75.55% staff, 97.14% hospital → 1-seat, 97.59% equip), Sardar Patel 5%-rows reproduce exactly | Client delays answering → engine blocked; escalate via manager | SC-02 golden suite green; memo on file |
| HG-03 | Central WorkflowGuard: `can(role, action, state, ownership)`; single source consumed by API guard middleware AND allowedActions endpoint | Guard middleware on every transition route; `GET /cases/{id}/allowed-actions` | Render actions exclusively from allowedActions; delete any hardcoded role checks in review checklist | permissions/transitions config tables | Authorization matrix tests: every (role × transition) allowed/denied per §7 | Guard logic drift between middleware & endpoint — share one function | Matrix test suite proves §7 exactly; no frontend role literals (lint rule) |
| HG-04 | Dual-entry re-keying pipeline with reviewer diff | Import validator (checksum, slab completeness) | Rules viewer for staff verification | StandardsTable/Line seeded + version frozen | Spot-check tests vs AYU0659/0038/0265 Required values | Silent transcription errors — dual entry mandatory | Ayurveda-UG tables signed off; assessment Required auto-fill matches corpus reports |
| HG-05 | Repository-layer scoping keyed by role claims | Scoped query builders; ownership predicates; read-audit interceptor | No client-side filtering relied upon | ownership/state columns indexed | Negative tests: R7 cross-institute 403/404; R4 outside appointment 403 | Perf cost of row filters — index properly | Pen-test style suite: zero cross-tenant reads |
| HG-06 | Template library authored from the 3 client letter formats; validation gate | Letter service: merge-only from case data; validation suite; ref-number generator (pluggable, Q-020) | Preview with inline failure annotations; sign queue | LetterTemplate versioned; Letter + DispatchLog | Template regression: CON-002 (session mismatch) & CON-003 (date order) must fail generation | New template variants post-launch — version templates | Generated samples match client formats; both error classes blocked by tests |
| HG-07 | ETL: parse → cleanse (split name/address, normalize states) → load → exception report | Migration job + exception queue API | Exception review screen | Institute schema + staging table | Row-count + ID-uniqueness + sample-verification tests | Ambiguous addresses need human calls | 672 rows migrated; exceptions dispositioned; client sign-off (SC-06) |
| HG-08 | Request blank Part-I/II; fall back to reverse-engineered schema flagged provisional | Form-schema service (JSON Schema per section) | Schema-driven form renderer | PartSubmission JSONB + schema version | Schema validation tests; UAT with real college data | Client template differs → rework; keep renderer schema-driven | Client confirms field list or provides templates; forms validate real submissions |
| HG-09 | Explicit state machine per case type; transitions as the only mutation path | State-machine module; adverse-decision guard requires hearingCompleted flag | Timeline component from state history | state + transition-history tables | Transition tests incl. forbidden jumps (e.g., AssessmentFinal→Denied without hearing must 409) | Hidden side-channels mutating state — repository encapsulation | No mutation path bypasses transitions (verified by test + code review) |
| HG-10 | Timer service: statutory clocks as first-class records | Scheduler + escalation matrix; timers start on dispatch-confirmed events | Deadline cards + countdowns per dashboard | DeadlineTimer table | Clock tests with simulated time (6-month, 60-day, lapse escalation) | Timezone/date bugs — IST server-side only (NFR-082) | All statutory clocks fire in simulation; escalations reach supervisor role |
| HG-11 | Audit interceptor + append-only store | Mutation interceptor capturing actor/before/after; certified export API | Audit viewer (R2/R3/R8/R9) | append-only audit table/stream | Audit presence tests: every mutating endpoint writes exactly one event | Volume growth — partitioning | For a demo case, full decision→evidence chain reconstructable from audit alone (SC-05) |
| HG-12 | Manual-verify first; adapter interface for future channel | FeePayment service + verify endpoint (verifier ≠ recorder) | Fee panel with matrix validation + dup-UTR warning | FeePayment + FeeMatrix tables | Matrix validation tests per system/level/slab; dup-UTR test | Channel confirmed later → adapter swap | Fees recorded/verified for demo cases; mismatches flagged |
| HG-13 | Client document request (Q-018); segment gating flag | Config flag blocks case creation for unconfigured segments | Segment-unavailable messaging | standards versions per segment | Gating test: Siddha-UG case creation blocked with clear error | Regulation arrives mid-build — config-only addition proves ASM-003 | Segments enabled only when signed standards exist |
| HG-14 | 2-week offline spike before M3 commitment | Sync API with per-line ownership merge | PWA with IndexedDB drafts; conflict banners | client-side draft store | Field-simulation test: airplane-mode capture → sync; two-visitor concurrent edit | Sync complexity — constrain to per-line ownership | Spike demo: full section captured offline, synced lossless |
| HG-15 | Contradiction-resolution session with client; outcomes appended to docs/srs/12 + BR amendments | Encode resolved values as config | — | affected reference values | Re-run affected rule tests after resolution | Client answers slowly — proceed with flagged defaults where safe | All 8 CON items have recorded resolutions or accepted defaults |
| HG-16 | Test pyramid per §10; golden tests first | unit + integration harness; CI | component + E2E harness (per role) | seeded demo data | see §10 | Test debt if deferred — CI gate from first PR | §10 checklist green in CI |
| HG-17 | Author guidance strings from §6 state table | guidance keyed by (state, role) | guidance card component | guidance config table | snapshot tests per state/role | Copy churn — config not code | Every state shows correct next-action text per role in E2E run |
| HG-18 | Discovery workshop; adapters behind ports; manual fallback always | import endpoints with provenance (checksum, period, importer) | import screens + provenance display | import-log tables | fallback tests: statutory step completes with manual entry when adapter down (NFR-080) | Contracts never materialize — manual mode is permanent fallback | Each integration demo-able in manual mode; adapter swap documented |
| HG-19 | CI quality gates once frontend exists | — | fix findings iteratively | — | Lighthouse budget + axe/WCAG scans in CI | — | Lighthouse ≥ agreed budget; zero critical WCAG violations |
| HG-20 | Defer; collect parameter sheets via client | — | — | RatingScorecard schema reserved | — | — | Re-scoped when Q-009/GAP-005 resolved |

## 10. Testing Handoff

**Current state: zero tests exist (nothing to test yet).** This is the checklist the build must satisfy; golden tests (SC-02) are written first, against the corpus worked examples, before the engine code.

### Backend Testing checklist

- [ ] Authentication: login/refresh/logout; MFA enforcement for R2/R3/R6/R8; lockout policy
- [ ] Authorization/role guards: full §7 matrix — every (role × endpoint × state) combination allowed/denied as specified; SoD-01…06 violations rejected
- [ ] API validation: JSON-schema per form section; fee-vs-matrix; certificate validity windows; letter validation suite (CON-002/003 classes)
- [ ] Workflow transitions: every legal transition in §6; every illegal jump rejected 409; **adverse decision without completed hearing rejected (BR-502)**
- [ ] Negative: expired tokens; cross-tenant access (R7→other institute 403/404); locked-record mutation 423; duplicate UTR; policy activation without Board ref 422
- [ ] Audit: one audit event per mutation; read-audit on sensitive records; decision→evidence chain reconstruction (SC-05)
- [ ] Notifications: deadline timers fire (simulated clock); escalations; dispatch-bounce handling blocks deadline start
- [ ] Database relations: FK integrity per SRS 10 erDiagram; consecutive-denial counter; revocation ladder arithmetic; policy/standards version pinning per session
- [ ] **Golden computation tests (SC-02):** AYU0659 staff 34/45=75.55%, hospital 68/70=97.14% → 1-seat RMO reduction, equipment mean 97.59; Sardar Patel report 5%-per-HF rows; >50% cumulative → denial; AEBAS-absent → denial

### Frontend Testing checklist

- [ ] Role-based dashboards: each of the 9 roles sees only its scope and correct guidance cards
- [ ] Button/action visibility: rendered exclusively from `allowedActions`; lint/test guard against hardcoded role literals
- [ ] Form validation: proforma ranges; required fields; per-doc-type metadata; inline errors
- [ ] Workflow timeline: state history renders correctly for every §6 state
- [ ] Error/success messages: standard envelope mapped; 403/409/422/423 distinct user messaging
- [ ] Responsive UI: proforma PWA on tablet; dashboards on mobile (NFR-071); offline capture + sync (HG-14)
- [ ] Performance/accessibility: Lighthouse budget; WCAG 2.1 AA (axe) — once screens exist (HG-19)

### End-to-End Testing checklist

- [ ] Complete lifecycle: CycleOpen → … → Decided → Closed with letters generated
- [ ] Each-role login pass: all 9 demo users reach their dashboard and complete one owned action
- [ ] Happy path: clean college → full permission, letter matches template
- [ ] Deficiency/correction path: shortcomings → clarification → resolved → grant
- [ ] Rejection path: unresolved → hearing → denial with ledger; appeal recorded
- [ ] Unauthorized access: every role attempts one forbidden action → blocked + audited
- [ ] Missing document/data: expired fire NOC flags deficient; missing Part-I switches basis flag (BR-310)
- [ ] Final approval/completion: board decision → signed → dispatched → college sees outcome

### Test cases

| Test Case ID | Scenario | Role | Steps | Expected Result | Status |
|---|---|---|---|---|---|
| TC-AUTH-01 | Valid login with MFA (approver) | R2 | login → TOTP → dashboard | Session with R2 claims; login audited | ❌ Not run (no build) |
| TC-AUTH-02 | College login scope | R7 | login → open institute list | Only own institute visible | ❌ Not run |
| TC-RBAC-01 | Drafter attempts self-finalize | R1 | draft assessment → POST /finalize as same user | 403; SoD-01 message; audit entry | ❌ Not run |
| TC-RBAC-02 | Visitor opens unassigned visitation | R5 | GET other visitation | 403/404 | ❌ Not run |
| TC-RBAC-03 | Sys Admin attempts board decision | R8 | POST /agenda-items/{id}/decision | 403 (SoD-04) | ❌ Not run |
| TC-WF-01 | Adverse decision without hearing | R2 | assessment w/ shortcomings → POST /decisions outcome=Denial | 409: hearing required (BR-502) | ❌ Not run |
| TC-WF-02 | Lock without all certifications | R5 | 2 of 3 visitors certify → POST /lock | 409: pending certifications | ❌ Not run |
| TC-WF-03 | Proforma edit after lock | R5 | PUT /proforma post-lock | 423 Locked | ❌ Not run |
| TC-CALC-01 | Golden: AYU0659 staff % | R1 | compute with corpus fixture | 75.55% (excl. excess); ledger matches | ❌ Not run |
| TC-CALC-02 | Golden: hospital-staff reduction | R1 | RMO 7/9 fixture | 1-seat reduction (BR-406) | ❌ Not run |
| TC-CALC-03 | Cumulative >50% | R1 | stacked-deficiency fixture | Denial triggered (BR-408) | ❌ Not run |
| TC-CALC-04 | AEBAS absent | R1 | AEBAS=not implemented fixture | Direct denial (BR-401) | ❌ Not run |
| TC-LET-01 | Session-mismatch template guard | R1 | force mismatched session fields | Generation blocked 422 (CON-002 class) | ❌ Not run |
| TC-LET-02 | Hearing date before notice | R6 | schedule hearing < notice date | 422 (CON-003 class) | ❌ Not run |
| TC-LET-03 | Dispatch unsigned letter | R6 | POST /dispatch pre-sign | 403/409 (SoD-06) | ❌ Not run |
| TC-NOTIF-01 | Clarification deadline lapse | system | simulate clock past deadline | Case → ReExamination; R1 escalation notification | ❌ Not run |
| TC-NOTIF-02 | 60-day counselling countdown | system | set counselling date; advance clock | Alerts at configured thresholds | ❌ Not run |
| TC-AUD-01 | Decision traceability | R9 | pick decided demo case → audit view | Chain letter→minute→hearing→clarification→assessment→evidence→rule version complete (SC-05) | ❌ Not run |
| TC-E2E-01 | Clean-college happy path | all | full lifecycle with demo data | Permission letter generated, dispatched, visible to R7 | ❌ Not run |
| TC-E2E-02 | Deficiency→clarification→grant | R1/R7/R2 | inject shortcoming, resolve via response | Grant after re-examination; no hearing needed | ❌ Not run |
| TC-E2E-03 | Denial + appeal | all | unresolved → hearing → deny → appeal | States per §6; appeal window enforced | ❌ Not run |
| TC-E2E-04 | Visitation refusal | R5/R2 | record refusal | BR-409 route: denial + ghost presumption flags | ❌ Not run |
| TC-E2E-05 | Missing Part-I basis switch | R1 | visit before Part-I | Assessment flagged basis=visit-only (BR-310) | ❌ Not run |
| TC-SEC-01 | Cross-tenant probe | R7 | attempt IDs of other institutes across endpoints | Zero leakage; attempts audited | ❌ Not run |

---

# Deliverable 2: Manager KT Script — What Knowledge We Got From Client Documents

*(Speaking script — read as-is or adapt.)*

## Opening

"We have completed a full review of every client-provided document — all eighteen files, including six gazette regulations of around a megabyte each, the institute master data, three filled assessment reports, board meeting agendas and minutes, hearing and clarification letter formats, the punitive policy, and the staff work-allotment sheet. We converted that knowledge into a fifteen-file specification suite covering business requirements, functional requirements, workflow states, user roles, permissions, backend endpoints, frontend screens, validation rules, notifications, audit requirements, a gap analysis, and a testing checklist. Everything is traceable — every requirement cites the exact client document and section it came from, and anything we inferred is explicitly tagged and registered as an assumption."

## Client Document Understanding

"What the client wants is a workflow system for NCISM's Medical Assessment and Rating Board — the body that regulates 672 Ayurveda, Unani, Siddha and Sowa-Rigpa medical colleges in India. The system is needed because the entire process runs today on Word letters, Excel sheets and e-mail, and the documents themselves show the cost of that: we found letters with the wrong academic session inside a single letter, and a hearing notice dated after the hearing itself.

The problem it solves is the annual regulatory cycle. Every college must be inspected, measured against detailed minimum standards — staff by department and cadre, hospital beds and patient volumes, infrastructure areas, equipment lists, biometric attendance — and then either permitted to admit students, permitted with reduced seats, or denied. There is a Board-approved punitive policy that converts each deficiency into seat reductions — for example five percent of intake per deficient teacher — with a rule that if cumulative reductions cross fifty percent, the college is denied outright. Ghost faculty — teachers present only on paper — attract a twenty-five lakh rupee penalty each and revocation of their teacher code.

The users are nine roles: MARB dealing staff who process files state-wise, Board Members who sign and decide, the President who appoints hearing committees, the hearing committees themselves, field visitors who inspect colleges, a board secretariat, the colleges as external submitters, a system administrator, and the Commission as read-only oversight.

The main workflow is: the college submits self-declared proformas and fees; a visitor team inspects — physically, virtually, or by surprise; the findings are assessed against the regulations; shortcomings go to the college as a clarification letter; unresolved cases go to a numbered Board meeting; before any adverse order the college legally must get a hearing — that's natural justice written into the regulations; then the decision letter is issued, at least sixty days before student counselling, with appeal routes to the Commission and then the Ministry of Ayush.

The data to collect includes the institute master, teacher and visitor registries, the full inspection proforma, evidence like photos, register scans and biometric extracts, and dozens of document types — essentiality certificates, consent of affiliation, fire and pollution certificates, salary bank statements. Notifications and dashboards matter because the deadlines are statutory — six months to decide an application, sixty days before counselling, clarification windows as short as one day. And the most important restriction is that every adverse decision must be evidence-linked and auditable, because these decisions get appealed and even litigated."

## Current Implementation Understanding

"To be completely transparent about status: **the project is at the specification stage. There is no application code yet** — no backend, no frontend, no database, no tests. What is complete is the documentation layer: the full SRS suite. That covers roughly forty-five business rules, sixty functional requirements, thirty non-functional requirements, nine workflows with state diagrams, a thirty-five-entity data model, a role-permission matrix with segregation-of-duties rules, an integration inventory, and a proposed architecture.

So in module terms: all nine modules are fully specified and zero are built. The specification itself has a few deliberately open areas — the technical stack is a tagged proposal since the client documents never name technology, the rating module is deferred pending scope confirmation, and about twenty questions are logged for the client where the documents were silent or contradicted themselves. Nothing needs 'correction' in a codebase yet — what needs work is turning the specification into a build, and closing the open questions before the rules engine is coded."

## Gap Analysis Explanation

"The gaps fall into two families. The first is simply the build gap: every endpoint, screen, guard, and test is still to be created — we've inventoried all of them so nothing is hidden.

The second family is knowledge gaps that could hurt us if ignored. The punitive seat-reduction arithmetic has two plausible readings in the documents and the equipment pass-threshold is never stated — we will not code the rules engine until the client signs off the interpretation. The regulation standards tables exist only as badly-OCR'd gazette text and must be re-keyed with dual entry, because a wrong 'required' value would corrupt every assessment. The blank self-declaration proforma templates were never shared — we reverse-engineered the fields from filled reports and need confirmation. One regulation — undergraduate Siddha — is referenced but missing entirely. The client documents also contradict each other in eight places, like different deemed-closure horizons for UG versus PG, which we've listed for confirmation rather than silently picking one. And none of the external system contracts — the biometric attendance portal, the NCISM portal, the payment channel — are documented, so every integration is designed with a manual fallback.

On the classic implementation risks — hardcoded role actions, missing endpoint guards, misaligned screens — we're in a good position precisely because nothing is built: we've pre-flagged all of them as design mandates instead of discovering them later in code review."

## Best Solution Explanation

"The recommended approach is: freeze the client workflow as the single source of truth — it's documented state-by-state, and any code that deviates gets flagged against that document, not patched. Build a dynamic role-permission matrix in the backend, and map every endpoint to a role plus a workflow state. The frontend never decides permissions — the backend returns the allowed actions for each case based on role, state, and ownership, and the frontend only renders those. Every workflow transition gets a backend guard, including the critical one: no denial or seat reduction can ever be issued without a completed hearing. Every stage change produces dashboard guidance so users always know the next action, notifications for every important event including the statutory clocks, and an audit log entry so any decision can be traced back through the board minute, the hearing, the clarification, the assessment, down to the field evidence and the exact rule version. Data visibility is restricted role-wise at the query layer, so a college can only ever see its own case. And we write the punitive-computation tests first — against the real worked examples in the client documents — so the engine provably reproduces the Board's own arithmetic before it decides anything."

## Closing Statement

"We are not doing patchwork. We are converting the client documents into a clean, scalable, role-based, workflow-driven system. The goal is to make every requirement traceable, every role action controlled, every workflow stage auditable, and every gap clearly documented with a proper technical solution."

---

# Deliverable 3: Next-Step Action Plan

Grounded in the SRS roadmap ([docs/srs/14-roadmap.md](docs/srs/14-roadmap.md)); gap IDs reference §8 above.

## Phase 1 — Requirement Freeze *(≈ 2–4 weeks, mostly client-facing)*

- Review all client documents with the client present; walk the SRS suite section by section (docs/srs/01–11).
- Create/confirm the requirement matrix — already drafted as §3 of this handoff; obtain client sign-off per BR/FR row.
- **Freeze workflow states** — SRS 08 + §6 tables become the contractual state machine; version it.
- **Freeze role-permission matrix** — §7 signed off, including SoD-01…06 and the backend-allowedActions rule.
- **Freeze endpoint list** — §4 inventory including the added missing endpoints (`/auth/*`, `/allowed-actions`, `/fee-payments`, `/decisions`, `/clarifications/{id}/response`, `/part-submissions`, `/penalties`, `/appeals`).
- **Freeze frontend screen list** — §5 fourteen screens; confirm college-portal approach (Q-011).
- **Identify missing business rules** — run the resolution session for Q-001…Q-020 and CON-001…008 (HG-02, HG-15); obtain blank Part-I/II templates (HG-08); request UG Siddha regulation (HG-13); start MESAR schedule dual-entry re-keying (HG-04 — critical path).

## Phase 2 — Backend Alignment *(build; ≈ 8–10 weeks)*

- Refactor/establish role-based access control: implement the WorkflowGuard service and `GET /cases/{id}/allowed-actions` (HG-03) **before** feature endpoints.
- Add workflow guard service: state machine per case type; adverse-decision-requires-hearing hard guard (HG-09, BR-502).
- Add missing endpoints: full §4 inventory, auth first (FR-001), then M1→M3→M4→M6 order per roadmap.
- Add request validation: JSON Schemas per proforma section/document type; fee-vs-matrix; letter validation suite (HG-06).
- Add status-transition validation: transactional transitions; 409 on illegal jumps; 423 on locked records.
- Add notification triggers: deadline timer service with statutory clocks (6-month, 60-day, 10th-of-month) and escalations (HG-10).
- Add audit logs: mutation interceptor + append-only store + certified export (HG-11).
- Add role-wise data projection: repository-layer scoping; read-audit on sensitive records (HG-05).
- Update database schema/models: implement SRS 10 erDiagram; seed StandardsTable (re-keyed Ayurveda UG first) and PunitivePolicyVersion for the target session; run institute-master migration with exception report (HG-07).

## Phase 3 — Frontend Alignment *(overlapping; ≈ 8–10 weeks)*

- Remove/never introduce hardcoded role actions — lint rule + review checklist from day one.
- Render buttons from backend `allowedActions` exclusively.
- Add dashboard guidance cards — content authored from the §6 state table (HG-17).
- Add workflow status timeline component on every case screen.
- Add role-specific screens per §5 (fourteen screens), starting with login, registries, proforma PWA (run the offline spike first — HG-14), computation workbench, letter console.
- Hide restricted data — rely on server scoping; verify with cross-tenant probes (TC-SEC-01).
- Improve form validation and error handling — schema-driven forms; standard error envelope mapped to clear user messages.

## Phase 4 — Document/Form Mapping *(with Phases 2–3)*

- Map all client document fields to database fields — checklist taxonomy from Board meeting Agenda (0) → DocumentType records; proforma sections from AYU0659 → form schemas.
- Map form sections to frontend screens — proforma sections 1–8 → PWA section navigator; scrutiny checklist → workbench.
- Map upload requirements to the document module — per-type required metadata (issuer, ref, validity dates), WORM-on-finalize, hashing.
- Add missing fields discovered during Part-I/II template confirmation (HG-08).
- Add required/optional validation per document type; validity-window logic (fire NOC, pollution, essentiality, COA).
- Add review status for each document/form section — Submitted / Deficient / Clarified / Verified lifecycle per checklist item.

## Phase 5 — Gap Fixing *(hardening; ≈ 4 weeks)*

- Fix high-priority role gaps — run the full §7 authorization matrix test; close any deviation.
- Fix workflow mismatch — reconcile implementation against frozen SRS 08; no local patches.
- Fix missing endpoints — sweep §4 inventory vs implemented routes.
- Fix frontend/backend mismatches — contract tests per endpoint↔screen mapping (§5).
- Fix notification gaps — verify every §6 row's notification fires; bounce handling.
- Fix audit gaps — TC-AUD-01 traceability reconstruction must pass on a real staged case.
- Fix dashboard instruction gaps — every state × role shows correct guidance.

## Phase 6 — Testing and Demo Readiness *(≈ 3–4 weeks)*

- Create demo users for every role — nine users (R1…R9) plus a second R1 for allotment-scope tests; **never grant admin users business roles** for convenience.
- Create demo data — 3 demo institutes (clean / deficient-recoverable / denial-path), seeded from anonymized corpus patterns (AYU0659-like fixtures).
- Test complete workflow — TC-E2E-01…05.
- Test negative cases — TC-RBAC/TC-WF/TC-LET/TC-SEC suites; unauthorized-access sweep for all nine roles.
- Test role restrictions — §7 matrix suite green.
- Test dashboards — guidance, countdowns, watchlists per role.
- Test reports — pipeline, punitive register, deemed-closure watchlist, fee report against demo data.
- Prepare final demo script — happy path + deficiency path + denial-with-hearing path, shown as the three demo institutes.
- Prepare manager KT explanation — Deliverable 2 above, updated with build-stage status.

---

*End of handoff. Companion documents: SRS suite in [docs/srs/](docs/srs/README.md) (single source of truth for requirements and workflow); open client questions in [docs/srs/12-gaps-and-questions.md](docs/srs/12-gaps-and-questions.md); risks in [docs/srs/13-risks.md](docs/srs/13-risks.md).*
