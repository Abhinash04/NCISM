# 11 — APIs & Integrations

> Part of the [SRS suite](README.md). Internal API conventions are in [06-technical-architecture.md §5](06-technical-architecture.md) and per-module in [09-modules.md](09-modules.md). This file covers the external landscape. **No integration contract (endpoint, format, auth) is documented in the sources** — the systems below are named/mandated by the regulations and letters, but their technical interfaces are unknown (GAP-006). Every integration therefore ships with a manual fallback (NFR-080), and interface details marked `[INFERRED]` are proposals pending Q-010–Q-014.

## 1. Integration inventory

| # | System | Class | Purpose | Data exchanged | Direction | Source grounding |
|---|--------|-------|---------|----------------|-----------|------------------|
| I-01 | **NCISM online portal / platform** | Government (NCISM-owned) | College logins issued with LOP; monthly self-disclosure (by 10th); Part-I/II proforma submission; data reused for permission & rating | institute credentials, self-disclosure datasets, proforma data | inbound | UG Ayurveda 2024 § 55(2), § 56(10), § 63(3); PUNITIVE POLICY Notes (i)-(ii) |
| I-02 | **AEBAS (Aadhaar Enabled Biometric Attendance System) portal / central server** | Government | staff attendance verification; online spot-checks any working day; suspicious-attendance analysis | per-employee in/out times, attendance %, device/registration status | inbound | UG Ayurveda 2024 § 9, § 55(11); Assessment of Sardar PAtel... § 9; Hearing letters § AEBAS |
| I-03 | **Official e-mail (NIC/SMTP)** | Government infra | statutory dispatch channel for letters; hearing submissions inbox (president.marbism@ncismindia.org) | letters (PDF), submissions, notifications | bidirectional | UG Ayurveda 2024 § 6; all letters § E-mail lines |
| I-04 | **NEFT/RTGS payment verification** (bank / PFMS / Bharatkosh — channel unconfirmed Q-012) | Financial | verify application/processing/visitation/rating fees & security deposits to the National Commission Fund | UTR refs, amounts, dates, payer | inbound | Board meeting Agenda (0) § Item 2 fee row; UG/PG fee tables |
| I-05 | **Video conferencing** (platform unconfirmed Q-013) | Third-party | virtual hearings; hybrid visitations | meeting links, schedules, (recordings?) | outbound links | Hearing letters § "virtually i.e., through video conferencing"; visits "on hybrid mode" |
| I-06 | **CCTV central-server feeds** | Government-mandated college infra | evidence for staff presence/hospital functionality; 6-month DVR + 3-yr backup at colleges | footage references/extracts on demand | inbound (on demand) | UG Ayurveda 2024 § 10; Board meeting Agenda (1) Minutes (footage demanded) |
| I-07 | **College HIMS / LMS → Commission command-and-control centre** | Government-mandated | real-time hospital/teaching data; patient authentication via ABHA; HPR/HFR/UHID; NAMASTE portal alignment | hospital KPIs (OPD/IPD/occupancy), LMS usage | inbound (future) | UG Ayurveda 2024 § 8, § 39 |
| I-08 | **Commission website publication** | Government | publish application deadlines; rating results before counselling | schedules, grade lists | outbound | PG Ayurveda 2024 § Ch. VIII 34; UG Ayurveda 2024 § 56 |
| I-09 | **AACCC counselling** | Government | consume permission decisions/seat matrices before counselling | permitted colleges + intake per session | outbound | UG Ayurveda 2024 § 55(7); README glossary AACCC |
| I-10 | **NCISM teacher-code registry** | Government (existence assumed) | teacher-code issuance/validation/revocation sync | codes, status, revocations | bidirectional | teacher codes throughout AYU reports; PUNITIVE POLICY § 5 `[INFERRED as a system — may be manual today: Q-014]` |

Integration phasing: I-03 and I-04 (manual verification screen) are MVP; I-01/I-02 begin as file-import (CSV/XLS extract upload with provenance) and graduate to APIs if contracts emerge; I-06/I-07 remain evidence-reference workflows (no live feeds) in the initial system; I-08/I-09 are export files. `[INFERRED phasing]`

## 2. Integration detail

### I-01 NCISM portal (self-disclosure & proformas)
- **Data in:** monthly self-disclosure datasets (staffing, hospital stats, admissions), Part-I (college) and Part-II (hospital) proformas per session.
- **Mode (proposed):** phase 1 — authorized staff upload portal-exported files against the institute+period with checksum + import log; phase 2 — pull API if NCISM exposes one (Q-011).
- **Failure/fallback:** missing month flagged on the college's compliance timeline (BR-302); assessment proceeds on visit-basis per BR-310.

### I-02 AEBAS
- **Data in:** attendance extracts per institute/date-range: employee code, name, designation, in-time, status — exactly the observed table shape (source: Board meeting Agenda (1) Minutes § faculty table).
- **Use:** FR-045 computes attendance %, flags "suspicious" per configurable rule (Q-006); extracts stored as evidence (WORM).
- **Auth (proposed):** if API — server-to-server credentials with per-institute scoping; else visitor-captured portal screenshots/exports with custody metadata. `[INFERRED]`
- **Privacy:** attendance outcomes only; no Aadhaar numbers/biometrics stored (NFR-040).

### I-03 Official e-mail
- **Out:** letters to institute official e-mail; copies per template copy-to (Chairperson NCISM, President MARB) (BR-507). Dispatch log with delivery status; bounce → blocked-deadline handling (M6 edge case).
- **In:** hearing submissions arrive at the President's mailbox today; proposed: submissions also uploadable by the college account with the e-mail as legal fallback; mailbox ingestion (IMAP pull) tags PDFs to the hearing case. `[INFERRED]`
- **Auth:** SMTP/IMAP service credentials via government e-mail infra (NIC) `[INFERRED]`.

### I-04 Payment verification
- **Data:** UTR/file no., amount (incl. GST), date, purpose — matching observed records ("NEFT vide file no. 20250711125341 Rs. 14,16,000 … via cheque no. 639226") (source: Board meeting Agenda (0) § Item 2).
- **Mode:** MVP — manual verification screen where staff confirm against bank statement, recording verifier + evidence; later — statement/API reconciliation once the channel is confirmed (Q-012, GAP-010).
- **Validation:** amount vs FeeMatrix (system × level × type × slab); duplicate-UTR detection.

### I-05 Video conferencing
- **Data:** hearing schedule → VC link; link "communicated separately" per current practice (source: Hearing letter with clarification format § body). System stores link, schedule, attendance record and (if permitted) recording reference. Platform choice + recording policy pending Q-013.

### I-06/I-07 CCTV, HIMS/LMS, command-and-control
- Regulation-mandated college-side systems wired to the Commission's central server (source: UG Ayurveda 2024 §§ 8–10). This SRS treats them as **evidence sources referenced in cases** (footage requests, HIMS printouts), not live feeds. Live integration is a roadmap item ([14-roadmap.md](14-roadmap.md)) — building the command-and-control centre itself is out of scope (ASM-002).

### I-08/I-09 Publication & counselling exports
- **Out:** signed CSV/PDF exports: (a) session permission list (institute, course, permitted intake, category) ≥60 days before counselling (BR-307); (b) rating grades before counselling (BR-604). Export events audited; content derived only from Board-decided records.

## 3. Auth flows summary

| Party | Flow |
|-------|------|
| Internal staff (R1–R6, R8, R9) | OIDC SSO / local + MFA ([06 §6](06-technical-architecture.md)); role claims → RBAC matrix (file 07) |
| Visitors (R5) | per-engagement activated accounts; scoped tokens to assigned visitations |
| Colleges (R7) | account bound to Institute ID + official e-mail (BR-106); credential issuance follows LOP practice (UG Ayurveda 2024 § 63(3)); possible federation with existing portal login (Q-011) |
| Server-to-server (AEBAS, mail, payment APIs) | service credentials/mTLS per provider; secrets vaulted; least-privilege scopes `[INFERRED]` |

## 4. Data-exchange principles

1. **Provenance on every import** — source system, extractor, period, checksum, importer identity (evidence-grade requirements, NFR-013).
2. **No hard dependency** — every statutory step completable with manual entry + document proof if an external system is down (NFR-080).
3. **Reuse over re-request** — self-disclosure data reused for permission and rating, honoring the regulation's no-re-submission promise (source: UG Ayurveda 2024 § 56(10)).
4. **Outbound = decided data only** — exports/publications draw exclusively from Board-decided, finalized records.
