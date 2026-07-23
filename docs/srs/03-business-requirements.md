# 03 — Business Requirements

> Part of the [SRS suite](README.md). IDs `BR-xxx` are referenced from [04-functional-requirements.md](04-functional-requirements.md), [08-workflows.md](08-workflows.md) and [09-modules.md](09-modules.md). Assumptions cited as `ASM-xxx` live in [12-gaps-and-questions.md](12-gaps-and-questions.md).

## 1. Regulatory & compliance grounding

The system enforces rules whose authority is the **NCISM Act, 2020** (Sections 28, 29, 28(1)(f), 55) and the MESAR regulations made under it:

| Regulation | Applies to | File |
|------------|-----------|------|
| MESAR UG Ayurveda, 2024 | UG Ayurveda colleges + teaching hospitals | Minimum Essential Standards, Assessment and Rating for Undergraduate Ayurveda Colleges and Attached Teaching Hospitals Regulations, 2024.md |
| MESAR UG Unani, 2023 | UG Unani colleges | Minimum Essential standards assessment and rating for UG Unani colleges & attached teaching hospitals Regulations 2023.md |
| MESAR UG Sowa-Rigpa, 2023 | UG Sowa-Rigpa colleges | Minimum Essential standards assessment and rating for UG Sowa-Rigpa colleges & attached teaching hospitals Regulations 2023.md |
| MESAR PG Ayurveda, 2024 | PG Ayurveda institutions | NCISM(Minimum-Essential-Standards-Assessment-and-Rating-for-Postgraduate-Institutions-Minimum-Standards-for-Postgraduate-Education-in-Ayurveda)-Regulations-2024.md |
| MESAR PG Siddha, 2024 | PG Siddha institutions | Minimum Essential Standards... Postgraduate Education in Siddha Regulations, 2024.md |
| MESAR PG Unani, 2024 | PG Unani institutions | Minimum Essential Standards... Postgraduate Education in Unani Regulations, 2024.md |
| Punitive Policy AY 2026-27 | ASU colleges, session 2026-27 (Board-approved, 160th meeting) | PUNITIVE POLICY ADOPTED... 2026.md |

Note: UG Siddha regulation is referenced but absent from the corpus (GAP-003); Sowa-Rigpa PG unknown (GAP-004).

## 2. Business rules

### BR-100 series — Jurisdiction, masters & allotment

- **BR-101** Every regulated institute has exactly one permanent Institute ID whose prefix encodes the system of medicine (AYU/UNI/…); it is the join key for all cases, letters and reports (source: Master data of institute § All File Number; all letters § Subject).
- **BR-102** New applicants receive a **temporary ID** (e.g. `2023TA001` Ayurveda, `2023TU001` Unani) at application, replaced by a permanent Institute ID upon LOP (source: UG Ayurveda 2024 § 61, § 63; UG Unani 2023 § 18(6)).
- **BR-103** Each college file is processed by the MARB dealing staff allotted to its **state × system of medicine** combination (source: Work Allotment in Staff.md § Sheet1) `[INFERRED — ASM-006: the sheet's purpose as routing rule]`.
- **BR-104** Teachers are identified by unique **teacher codes** (e.g. `AYKC01861`); a code may be revoked for 1 year / 2 years / permanently under the ghost-faculty rule (source: PUNITIVE POLICY § 5; AYU0659 § 3).
- **BR-105** Visitors are empanelled assessors with **Visitor IDs** (`V#####`) and a home institution; PG visitations use assessors exclusive to PG (source: AYU0659 § Visitor Details; PG Ayurveda 2024 § Ch. VI 15).
- **BR-106** The official channels of record with a college are its registered official e-mail and mobile (source: UG Ayurveda 2024 § 6; letters § To/E-mail lines).

### BR-200 series — Applications & scrutiny (Section 29)

- **BR-201** Application types: (a) new UG college, (b) new PG programme in existing college, (c) standalone PG institution, (d) intake increase UG/PG, (e) DM super-speciality (source: Board meeting Agenda (0) § Agenda Items 2–3; PG Ayurveda 2024 § Ch. VIII 33–39; § Ch. XI).
- **BR-202** Each application type has a fixed, regulation-defined document checklist (forms, essentiality certificate, consent of affiliation, affidavits, land/lease deeds, hospital certificates, fee proofs, salary bank statements, etc.) (source: Board meeting Agenda (0) § Agenda Item 2 checklist; UG Ayurveda 2024 § 57–59 & Forms 29A–29E; UG Unani 2023 Forms A–E; PG Siddha 2024 Forms A–G).
- **BR-203** Applications cannot be withdrawn after the published last date; application fees are non-refundable (source: PG Ayurveda 2024 § Ch. VIII 34).
- **BR-204** Scrutiny classifies findings as *fulfilling MES*, *rectifiable shortcomings* (clarification allowed), or **non-rectifiable shortcomings** — hospital non-functionality, land non-availability/dispute, missing essentiality certificate or consent of affiliation, constructed-area deficiency — which cause disapproval without rectification opportunity (source: PG Ayurveda 2024 § Ch. VIII 41–42; UG Ayurveda 2024 § 62(8); UG Unani 2023 § 18(7)(D)).
- **BR-205** New-college prerequisites include: attached hospital functional ≥24 months with NABH entry-level accreditation; land owned or ≥30-year lease; ≥25 km distance between two colleges of the same trust; security deposit by intake slab (₹1–4 crore UG; ₹50 lakh/programme PG), with government-college exemptions on undertaking (source: UG Ayurveda 2024 §§ 57–59 Tables 14–15; UG Unani 2023 § 18; PG Ayurveda 2024 § Ch. VIII 35, 43(2)).
- **BR-206** Decision on a new-scheme application must be communicated within **6 months** of the last date of submission (source: PG Ayurveda 2024 § Ch. VIII 43(4); UG Ayurveda 2024 § 62).
- **BR-207** Permission lifecycle for new establishments: **LOI (29.0, no admissions) → LOP (29.1, first batch + permanent ID + portal login) → 1st/2nd/3rd Renewal (29.2–29.4) → fully established under Section 28**, after which rating eligibility begins (source: UG Ayurveda 2024 §§ 62–64 Table-16; PG Ayurveda 2024 § Ch. VIII Table-12).
- **BR-208** Fees are payable online via NEFT/RTGS to the *National Commission Fund for Indian System of Medicine*; amounts vary by regulation, intake slab and application type (see fee matrix, [09-modules.md § Fees](09-modules.md)) (source: UG Ayurveda 2024 Tables 11/13/14/17; UG Unani 2023 § 16(3)(c), § 18(5); UG Sowa-Rigpa 2023 § 3(1)(m); PG Ayurveda 2024 Table-11/14).

### BR-300 series — Annual assessment of existing colleges (Section 28)

- **BR-301** Fully established Ayurveda/Unani colleges are categorized **Extended Permission** (permitted 3 consecutive preceding years; admit without annual permission) or **Yearly Permission** (annual permission required). Extended status is lost on §28(1)(f) action, pending legal/disciplinary action, admission violations, intake-increase application, or non-payment of annual visitation+digitization fee (source: UG Ayurveda 2024 § 54; UG Unani 2023 § 16). Sowa-Rigpa instead receives one-year **conditional permission** decided by 30 June after a suo-moto inspection between 1 January and 30 June (source: UG Sowa-Rigpa 2023 § 3(1), § 15).
- **BR-302** Colleges upload **self-disclosure data monthly by the 10th** for the preceding month on the Commission's platform; the same data is reused for permission and rating without re-submission (source: UG Ayurveda 2024 § 55(2), § 56(10)).
- **BR-303** MARB conducts annual suo-moto **inspection/visitation/assessment** in physical, virtual or hybrid mode; the assessment window is the **12 months preceding the visitation month**; MARB may re-visit any number of times and verify AEBAS online on any working day (source: UG Ayurveda 2024 § 55(6), (10), (11); UG Unani 2023 § 16(3)(e)-(f)). **Scope note:** visitation execution is performed upstream under the TCS-run report-generation process; this platform consumes the resulting Regulatory Report (ASM-002 revision, BR-311).
- **BR-304** Assessment evidence model: college's **Part-I (college) and Part-II (hospital)** proformas + visitor verification + Commission overall assessment; every checklist line carries Required / Actual / Shortcoming / Visitor observation / Reason-for-disagreement (source: AYU0659 §§ 2–8; AYU0038 § 8.1). **Scope note:** these structures arrive inside the TCS-generated Regulatory Report; the platform parses them, it does not capture them.
- **BR-311** Every case's assessment is grounded in a **received Regulatory Report** with recorded provenance: source (TCS API — production; Visitor-portal manual upload — interim workaround), receipt timestamp, submitter/system identity and content hash. The platform must not originate the report. `⚠️ Assumption — client scope instruction (TCS boundary); no corpus document describes the delivery channel (GAP-011/Q-021)`.
- **BR-305** Constructed-area compliance is evaluated **after a 20% relaxation** on shortcomings (source: AYU0659 § 2.2–2.3, § 5.1) `[AMB-002 — regulatory basis unconfirmed]`.
- **BR-306** Equipment compliance is measured as percentage availability per category, with the **mean of Essential and General** used for recommendation (source: AYU0659 § 7 note); the pass threshold is unconfirmed (AMB-003/Q-005).
- **BR-307** Assessment decisions must reach Yearly-Permission colleges **≥60 days before counselling** begins; Extended-Permission colleges hearing nothing 60 days out are presumed continued (source: UG Ayurveda 2024 § 55(7)-(8); UG Unani 2023 § 16(3)(h)-(i)).
- **BR-308** A college denied or not admitting for **5 consecutive sessions (UG)** / **3 consecutive sessions (PG)** is *deemed closed*; restart requires fresh Section-29 establishment (source: UG Ayurveda 2024 § 55(12); PG Ayurveda 2024 § Ch. VI 15) — see CON-001.
- **BR-309** If a college conducting both UG and PG is denied UG for a session, its PG courses for that session are deemed denied too (source: PUNITIVE POLICY § Note (iii)).
- **BR-310** A college visited *before* Part-I submission is assessed on that visit's observations; a college re-inspected after a permission/denial decision is re-assessed on the latest visit (source: PUNITIVE POLICY § Notes (i)-(ii)).

### BR-400 series — Punitive policy (session 2026-27, versioned)

The punitive policy is Board-approved per session (160th meeting for 2026-27) and must be implemented as a **versioned rule set** effective per academic session (source: PUNITIVE POLICY § final para).

- **BR-401** AEBAS not implemented / partially implemented / improperly functional → **denial of permission** for the session (source: PUNITIVE POLICY § 1).
- **BR-402** Each deficient teaching faculty → intake reduction of **5% of total intake capacity** (source: PUNITIVE POLICY § 2) — interaction with percentage thresholds unconfirmed (CON-005/Q-004).
- **BR-403** Non-teaching staff deficiency (excl. Group D): Librarian → 1 seat; Laboratory Technician → 1 seat per 2 deficient (source: PUNITIVE POLICY § 3).
- **BR-404** Any teaching department with **zero faculty** at assessment → denial for the session (source: PUNITIVE POLICY § 4).
- **BR-405** Ghost faculty ("physically absent but present only on paper"): **₹25 lakh penalty per faculty**, faculty not counted; teacher-code revocation ladder — 1st offence 1 year, 2nd +2 years, 3rd permanent, with matching employment bans (source: PUNITIVE POLICY §§ 4–5).
- **BR-406** Hospital-staff deficiencies (excl. Group D): DMS 1 seat; Matron 1 seat; EMO 1 seat per deficient; RMO/RSO/MO 1 per 2; Staff Nurse 1 per 3; Pharmacist 1 per 2; Lab Technician 1 per 2 (source: PUNITIVE POLICY § 7).
- **BR-407** No computerized central registration system → 1 seat; every 10% OPD average-attendance deficiency → 1 seat; every 1% bed-occupancy deficiency → 1 seat; hospital functionality deficiency (OPD/IPD counts, clinical lab, OT, labour room, Panchakarma, Ksharsutra) → **30% reduction** (source: PUNITIVE POLICY §§ 8–11).
- **BR-408** All applicable reductions are **additive**; if the cumulative reduction exceeds **50%**, the college is denied for the session (source: PUNITIVE POLICY § bullets after 11).
- **BR-409** Denial of visitation by a college → denial of permission + all faculty presumed ghost + §28(1)(f) action (source: PUNITIVE POLICY § 12).
- **BR-410** Non-compliance with Board/Commission instructions without valid justification → disciplinary action against the Head of Institution and the college under §28(1)(f) (source: PUNITIVE POLICY § 13).
- **BR-411** If permission was already issued and counselling notified before the adverse finding, punitive action shifts to the **subsequent academic year** (source: PUNITIVE POLICY § Note (v)).
- **BR-412** Regulation-level penalties remain available on top of the session policy: monetary penalty up to **₹1 crore per non-compliance**, warning, withholding new applications, seat reduction, admission stoppage, recommendation to withdraw recognition, rating withheld/withdrawn up to 5 years, criminal proceedings for fabricated data, and immediate halt for attempts to pressurise/bribe assessors (source: UG Ayurveda 2024 § 71; PG Ayurveda 2024 § Ch. XII 58).

### BR-500 series — Clarification, hearing & approval workflow

- **BR-501** Observed shortcomings must be communicated to the college by a **clarification letter** stating the visit dates/mode, purpose, regulation basis and an itemised defect list, with a response deadline (source: clarification letter format § all). Deadline must be configurable (CON-006/Q-002).
- **BR-502** Before any order of **seat reduction or denial**, the college must be offered a **hearing** (natural justice; e.g. reg. 55(14) MESAR UG Ayurveda 2024) (source: Hearing letter with clarification format § body).
- **BR-503** Hearings are conducted **virtually (VC)** before a Hearing Committee (observed: 2 members) appointed by the **President, MARB**; the college may make oral and written submissions and must e-mail scanned original documents (PDF) before the stated deadline; the notice covers only the listed shortcomings (source: Hearing letter without clarification format § body; Board meeting Agenda (1) Minutes § Agenda Item 6).
- **BR-504** Non-attendance at the scheduled hearing forfeits further opportunity; the case proceeds on available records (source: Hearing letter without clarification format § closing).
- **BR-505** Hearing minutes record, per shortcoming: the shortcoming, the college's clarification, and the committee's observation, including explicit "submission … not considered" verdicts; minutes are placed before the President/Board (source: Board meeting Agenda (1) Minutes § Agenda Item 6).
- **BR-506** Assessment reports, scrutiny reports and hearing minutes are decided in numbered **Board meetings**; each meeting confirms the previous meeting's minutes as Agenda Item 1 (source: Board meeting Agenda (0) § Agenda Item 1; Hearing letter with clarification format § "134th Board meeting").
- **BR-507** Outbound letters are signed by a **Board Member**, issued "with the approval of the competent authority", and copied to the Chairperson NCISM (and President MARB where applicable) plus guard file (source: letters § signature/Copy-to blocks) — see AMB-006.
- **BR-508** Appeals: first appeal to the **Commission** (window 15–30 days by regulation; hearing opportunity; decision in 15 days), second appeal to the **Central Government (Ministry of Ayush)** within 7–15 days (source: UG Ayurveda 2024 § 65; UG Unani 2023 § 16(3)(n); PG Ayurveda 2024 § Ch. VIII 44; UG Sowa-Rigpa 2023 § 3(1)(i)).

### BR-600 series — Rating (later phase; see Q-009)

- **BR-601** Only fully established **Extended-Permission** institutions/departments are rated, annually; PG is rated per department (source: UG Ayurveda 2024 § 56(3); PG Ayurveda 2024 § Ch. IX 46).
- **BR-602** Rating weightage: **70% online self-disclosed data : 30% physical verification**; conducted by MARB or an empanelled rating agency; parameters set by the Board of Ayurveda / Board of Unani, Siddha & Sowa-Rigpa (source: UG Ayurveda 2024 § 56(9); UG Unani 2023 § 17).
- **BR-603** Grade bands: Ayurveda/Unani/PG — A ≥75, B 50–74, C 25–49, D ≤24; Sowa-Rigpa — A 81–100, B 51–80, C ≤50, scored out of 400 (source: UG Ayurveda 2024 Table-12; UG Unani 2023 Table-10; UG Sowa-Rigpa 2023 § 14(5) Table-5).
- **BR-604** Consequences: Grade A may charge a 5% development fee; only A/B may apply for intake increase or new programmes; grade deemed withdrawn upon §28(1)(f) action; results published before counselling (source: UG Ayurveda 2024 § 56(4)-(7); PG Ayurveda 2024 § Ch. IX 46).

## 3. Constraints

| ID | Constraint | Source |
|----|-----------|--------|
| C-01 | Statutory deadlines are hard: 6-month application decision; ≥60-day pre-counselling communication; monthly self-disclosure by the 10th; Sowa-Rigpa decisions by 30 June | UG Ayurveda 2024 § 55; PG Ayurveda 2024 § Ch. VIII 43(4); UG Sowa-Rigpa 2023 § 15 |
| C-02 | The punitive policy changes per session and must be re-configurable without code changes | PUNITIVE POLICY § final para (session-specific, Board-approved) |
| C-03 | Six regulations with per-system parameters must be supported by one process skeleton | comparative analysis, files 08/09 `[INFERRED — ASM-003]` |
| C-04 | Official communication constrained to registered official e-mail/mobile; hearing submissions via president.marbism@ncismindia.org observed | UG Ayurveda 2024 § 6; Hearing letter without clarification format |
| C-05 | Existing systems (NCISM portal, AEBAS, CCTV central server) are externally owned; integration contracts unknown | GAP-006, Q-010/Q-011 |
| C-06 | Legacy data quality (institute master, OCR'd regulations) requires cleansing/re-keying before rule tables are trusted | CON-007; UG regs OCR note in [10-data-model.md](10-data-model.md) |
| C-07 | Decisions have legal consequences (appeals to Ministry; criminal proceedings for fraud) — every computation must be reproducible and evidence-linked | PG Ayurveda 2024 § Ch. XII 58; BR-412 |

## 4. Success criteria

| ID | Criterion |
|----|----------|
| SC-01 | 100% of session 2027-28 permission decisions processed through the system with generated (not hand-edited) letters |
| SC-02 | Punitive computations reproduce the worked examples in the corpus (e.g., AYU0659: staff 75.55%, hospital staff 97.14% → 1-seat RMO reduction; equipment mean 97.59%) exactly (source: Hearing letter without clarification format; Assessment of Sardar PAtel...) |
| SC-03 | Zero decision letters issued with date/session inconsistencies (regression against CON-002/003 error classes) |
| SC-04 | Dealing-staff pipeline dashboard covers all allotted states/systems; no case misses the 60-day counselling deadline for system-attributable reasons |
| SC-05 | Full audit trail: for any decided case, an auditor can trace decision → board minute → hearing minute → clarification → assessment lines → visitation evidence → regulation clause/policy version |
| SC-06 | Institute master migrated (672 records) with cleansing report accepted by MARB (Q-015) |
