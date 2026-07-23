# 02 — Business Domain

> Part of the [SRS suite](README.md). Glossary and acronyms in [README.md](README.md#glossary).

## 1. Domain explainer

### 1.1 The regulator

India regulates education in the traditional systems of medicine — **Ayurveda, Unani, Siddha and Sowa-Rigpa (ASU&SR)** — through the **NCISM Act, 2020**. The **National Commission for Indian System of Medicine (NCISM)** is the apex body; its operational arm for college oversight is the **Medical Assessment and Rating Board for Indian System of Medicine (MARB-ISM)** (source: clarification letter format § Copy to; Minimum Essential Standards... Undergraduate Ayurveda... Regulations, 2024 § Ch. I Definitions). Standards per system are set by the **Board of Ayurveda** and the **Board of Unani, Siddha and Sowa-Rigpa** (source: UG Unani 2023 § 17(2); UG Ayurveda 2024 § 2(s)).

Two statutory levers drive everything:

- **Section 28** — *existing* colleges: annual visitation/assessment and permission to admit for each academic session.
- **Section 29** — *new things*: establishing a new college, starting new PG courses, or increasing intake capacity (source: Board meeting Agenda (0) § Agenda Item 3; hearing letters § Subject).

### 1.2 The regulated universe

672 institutes: Ayurveda 590, Unani 58, Siddha 17, Sowa-Rigpa 7, each with a permanent **Institute ID** (`AYU0659`, `UNI0313`…) and a MARB file number (source: Master data of institute § All File Number). Colleges run UG courses (BAMS/BUMS/BSMS, intake slabs 60/100/150/200; Sowa-Rigpa ≤15 or 16–30) and PG programmes (≤12 seats each) with an attached teaching hospital whose beds, OPD volumes and staffing scale with intake (source: UG Ayurveda 2024 § 3, § 44 Tables 7–9; PG Ayurveda 2024 § Ch. II 3(10); UG Sowa-Rigpa 2023 § 4).

### 1.3 What gets measured

The MESAR regulations define, per system and level, schedules of minimum standards: land and constructed area, lecture halls, central library, herbal garden, teaching pharmacy & quality-testing lab, teaching/non-teaching/hospital staff by cadre and department, hospital functionality (OPD ≥ 1:2 student:patient ratio, bed occupancy targets, functional OT/labour room/Panchakarma/Ksharsutra blocks), equipment lists per department, AEBAS biometric attendance, CCTV, and a compliant college website (source: UG Ayurveda 2024 § Ch. II–IV & Schedules I–XXXI; AYU0659 §§ 2–7). Compliance is verified through a **two-part evidence model**: the college self-declares in **Part-I (college)** and **Part-II (hospital)** proformas; a **visitation team** verifies on site; the **Commission** then makes an overall parameter-by-parameter assessment (source: AYU0038 § 8.1; AYU0659 § 8.2).

### 1.4 Consequences

Deficiencies feed a Board-approved, session-specific **punitive policy**: e.g., 5% intake reduction per deficient teaching faculty; per-post seat reductions for hospital staff; 1 seat per 10% OPD-attendance deficiency; 1 seat per 1% bed-occupancy deficiency; 30% reduction for hospital non-functionality; **denial** when cumulative reduction exceeds 50%, when AEBAS is absent, when any teaching department has zero faculty, or when the college denies visitation; **₹25 lakh per ghost faculty** plus tiered teacher-code revocation (1 year / 2 years / permanent) (source: PUNITIVE POLICY §§ 1–13). Before any adverse order, the college gets a **clarification** opportunity and then a **hearing** — a natural-justice requirement written into the regulations (source: Hearing letter with clarification format § body, citing reg. 55(14) MESAR UG Ayurveda 2024).

Fully established, consistently compliant colleges earn **Extended Permission** (admit without annual approval) and become eligible for an annual **rating** (A ≥75 / B 50–74 / C 25–49 / D ≤24; Sowa-Rigpa A/B/C out of 400), computed 70% from online self-disclosed data and 30% from physical verification (source: UG Ayurveda 2024 §§ 54–56; UG Sowa-Rigpa 2023 § 14).

## 2. As-Is process (current state)

Reconstructed from the operational artefacts:

1. **Master keeping** — institutes tracked in an Excel master (672 rows, 8 columns); state × system work allotment to named MARB staff kept in another sheet (source: Master data of institute; Work Allotment in Staff.md § Sheet1).
2. **Proposal intake (Sec. 29)** — college submits forms (29-A/C/E or A–G), affidavits, certificates and NEFT fees; MARB staff manually build a **scrutinization report** table (submitted / not submitted / after clarification…), sending clarification letters between passes (source: Board meeting Agenda (0) § Agenda Item 2 — two scrutiny passes with clarifications).
3. **Visitation** — team of ~3 visitors assigned; visit conducted physical/virtual/hybrid, sometimes surprise re-visits; visitors fill the visitation proforma, take photo/video evidence, pull AEBAS reports, scan attendance registers, and sign per-visitor certifications (source: AYU0659 § Visitor Details & Certification; Board meeting Agenda (0) § Agenda Item 3).
4. **Assessment report drafting** — dealing staff compile a Word report from the visitation output against MESAR schedules; the template still contains "Or"-branches to strike out (source: Assessment of Sardar PAtel... §§ 5–9). Percentages (staff availability, equipment mean) and punitive consequences are computed manually (source: Assessment of Sardar PAtel... § 11 table "Punitive policy" column).
5. **Clarification** — shortcoming letter e-mailed to the college with a short window (observed: 1 day) (source: clarification letter format § closing).
6. **Board meeting** — reports and clarifications placed before a numbered Board meeting (124th, 134th, 160th observed); Board decides: grant / deny / give hearing (source: Hearing letter without clarification format § body; Board meeting Agenda (0)).
7. **Hearing** — 2-member committee appointed by the President; VC hearing; college submits scanned PDFs by e-mail deadline; committee records shortcoming-vs-clarification-vs-observation minutes ("submission … not considered"); minutes go back to a Board meeting (source: Hearing letter with clarification format; Board meeting Agenda (1) Minutes § Agenda Item 6).
8. **Decision & letters** — permission (full/reduced seats) or denial issued under Sections 28/29; copies to Chairperson NCISM and President MARB; guard file (source: letters § Copy to). Appeals lie to the Commission, then the Ministry of Ayush (source: UG Ayurveda 2024 § 65).

### As-Is pain points

| # | Pain point | Evidence |
|---|-----------|----------|
| P-01 | Manual letter drafting → date/session errors, leftover template branches | CON-002/003 in [file 12](12-gaps-and-questions.md); Assessment of Sardar PAtel... "Or" branches |
| P-02 | Institute master data quality (misspelled headers, addresses in name field, missing contacts) | Master data of institute § All File Number (CON-007) |
| P-03 | Manual punitive arithmetic across multiple additive rules with a 50% denial threshold | PUNITIVE POLICY §§ 2–11 |
| P-04 | Evidence assembly for fraud cases (multiple attendance registers, AEBAS logs, CCTV, QR-code photos) is ad hoc | Board meeting Agenda (1) Minutes § Agenda Item 6 |
| P-05 | Clarification windows as short as 1 day, tracked by e-mail only | clarification letter format § closing (CON-006) |
| P-06 | No single pipeline view: status lives across Word/Excel/e-mail; deadlines (60-day pre-counselling) tracked manually | UG Ayurveda 2024 § 55(7) |
| P-07 | Scrutiny checklists rebuilt per college though document lists are fixed per regulation | Board meeting Agenda (0) § Agenda Item 2 |
| P-08 | Same data re-requested from colleges though regulations promise reuse of self-disclosure | UG Ayurveda 2024 § 56(10) |

## 3. To-Be process (target state)

The same statutory sequence, executed in the system — **with the system boundary beginning at receipt of the TCS-generated Regulatory Report** (scope revision; ASM-002/GAP-011 in [file 12](12-gaps-and-questions.md)):

1. **Masters in-system** — institute, teacher, visitor, staff-allotment registries with audit trail; file/reference numbers generated by rule (pending Q-020).
2. **Structured intake** — proposal record with regulation-driven document checklist; per-document status (submitted / deficient / clarified / verified) replacing the hand-built scrutiny table; fee records with UTR references.
3. **Visitation & report authoring — upstream (TCS).** TCS conducts the visitation (team assignment, field capture, evidence, certification) and generates the complete 20–50-page Regulatory Report. **Production flow: TCS exposes the report through an API → this platform receives it (FR-038, I-11). Interim: the Visitor portal's manual upload is a temporary workaround until the TCS API is available.**
4. **Automated assessment** — from the **received Regulatory Report**, the rules engine computes staff percentages, HF/LF shortfalls, equipment means, hospital-functionality metrics and 20%-relaxation area checks; applies the versioned punitive policy and shows the seat-reduction ledger with the >50% denial trigger.
5. **Clarification cycle** — letter generated from the shortcoming list; portal/e-mail dispatch; deadline tracking; college response attached to the case.
6. **Board meeting module** — agendas assembled from ready cases; decisions recorded per agenda item; minutes generated and confirmed at the next meeting (mirroring Agenda Item 1 practice).
7. **Hearing module** — committee appointment, VC link/schedule, submission deadline, per-shortcoming minute capture (clarification given / committee observation / considered-or-not), outcome routing back to the Board.
8. **Decision & letters** — permission/denial/seat-reduction letters generated with validated dates, sessions and copy-to lists; dispatch logged; appeal status tracked.
9. **Dashboards & alerts** — pipeline by state/system/session; 60-day counselling countdown; overdue clarifications; hearing calendar.

## 4. Client-perspective workflow (the college's view)

1. Receive credentials with LOP on the existing NCISM portal (source: UG Ayurveda 2024 § 63(3)); submit Part-I/Part-II proformas and monthly self-disclosure by the 10th (source: UG Ayurveda 2024 § 55(2)).
2. Pay visitation + digitization fees (NEFT/RTGS) for the session (source: UG Ayurveda 2024 § 55 Table-11).
3. Host the visitation (any mode, possibly surprise); produce registers, AEBAS access, CCTV footage on demand (source: Board meeting Agenda (1) Minutes).
4. Receive clarification letter listing shortcomings; respond within the deadline with evidence (source: clarification letter format).
5. If unresolved, receive hearing notice; attend VC hearing; e-mail scanned original documents before the stated deadline; failure to attend forfeits further opportunity (source: Hearing letter without clarification format § closing).
6. Receive decision: permission (possibly with reduced seats), denial, and/or penalties; option of first appeal to the Commission and second appeal to the Ministry of Ayush (source: UG Ayurveda 2024 § 65; PG Ayurveda 2024 § Ch. VIII 44).
7. If Extended Permission / fully established: annual rating participation; grade A/B needed for expansion applications (source: UG Ayurveda 2024 § 56).

The To-Be system gives colleges (via the existing portal or a thin external interface — see Q-011) visibility of their case status, deadlines and letters, replacing e-mail-only communication. `[INFERRED — external-facing surface is a design choice; sources only mandate e-mail as the official channel (UG Ayurveda 2024 § 6)]`
