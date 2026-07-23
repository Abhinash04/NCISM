# 12 — Gaps, Ambiguities, Assumptions & Client Questions

> Part of the [SRS suite](README.md) for the **MARB-ISM Assessment & Permission Management System**.
> This file records everything the source documents do **not** settle. Every assumption made elsewhere in the SRS is registered here with an ID (`GAP-xxx`, `ASM-xxx`, `Q-xxx`) so it can be resolved with the client and traced back.

---

## 1. Missing source material

| ID | Item | Detail |
|----|------|--------|
| GAP-001 | Referenced analysis doc absent | The task brief references `docs/analysis/implementation-checklist.md`, but no `docs/` directory exists anywhere in the repository. The SRS was therefore written from the 18 client documents under `markdown/` alone. |
| GAP-002 | Part-I / Part-II proforma templates | Assessment reports repeatedly cite the college self-submitted **Part-I (college)** and **Part-II (hospital)** visitation proformas (source: Assessment of Sardar PAtel Ayurvedic Med. Coll., M.P for 60 seats § Teaching staffs; AYU0659 § 3.1), but the blank proforma templates themselves are not in the corpus. Field-level capture forms for FR specification are reverse-engineered from filled reports. |
| GAP-003 | Siddha UG regulation missing | The corpus has UG regulations for Ayurveda (2024), Unani (2023) and Sowa-Rigpa (2023), and PG regulations for Ayurveda, Siddha and Unani (2024) — but **no UG Siddha regulation**, although the punitive policy cites "regulation 60 (3)(k) of MESA&R UG Siddha regulations 2024" (source: PUNITIVE POLICY § Note (ii)). Siddha UG parameters (fees, slabs) are assumed parallel to Unani UG. |
| GAP-004 | Sowa-Rigpa PG regulation missing | PG regulations exist only for Ayurveda, Siddha, Unani. Whether PG Sowa-Rigpa programmes exist/are regulated is unknown. |
| GAP-005 | Rating scoring proforma detail | Ayurveda/Unani rating "Key Areas" are listed (source: UG Ayurveda 2024 § 56(8)) but the itemised scoring sheet is only present for Sowa-Rigpa (Annexure-VI/VI-A). The per-indicator scoring model for the other systems must come from the Board of Ayurveda / Board of Unani, Siddha & Sowa-Rigpa. |
| GAP-006 | Existing NCISM IT landscape | Letters and regulations imply existing digital assets — an NCISM portal issuing institution logins with the LOP, AEBAS portal, a "command and control centre", official e-mail conventions (source: UG Ayurveda 2024 § 8–11, § 63(3)) — but no technical documentation (APIs, data formats, hosting) for any of them is provided. See Q-010–Q-013. |
| GAP-007 | Hearing Committee composition rules | Sources show a 2-member committee "appointed by President, MARB" (source: Board meeting Agenda (1) Minutes § Agenda Item No. 6) but no standing rules for member selection, conflict-of-interest checks, or quorum. |
| GAP-008 | Letter numbering scheme | File/reference numbers appear in several formats — `4-74/MARB/2025-Ay. (PB)`, `3-4/MARB/2025-Ay.(53)`, `26-1/MARB/2026/College`, `11-58/2025-26/MARB/Unani` (source: clarification letter format; Master data of institute § All File Number) — with no documented generation rule. |
| GAP-009 | Visitor empanelment process | Visitors have IDs (`V01408`) and home colleges (source: AYU0659 § Visitor Details) but there is no document describing how visitors are empanelled, trained, assigned, paid, or rotated / checked for conflicts (e.g., same-state exclusion). |
| GAP-010 | Fee reconciliation | Fees are paid via NEFT/RTGS with cheque/UTR references (source: Board meeting Agenda (0) § Agenda Item No. 2 — "NEFT vide file no. 20250711125341 Rs. 14,16,000"), but there is no described process for verifying/reconciling payments against bank statements. |
| GAP-011 | TCS Regulatory-Report API specification unavailable | Per the revised project scope, the 20–50-page Regulatory/Assessment Report is generated externally by **TCS** and will be delivered to this platform through a TCS-exposed API. No API contract (endpoint, payload schema, auth, delivery semantics) exists yet. Until it is available, the **Visitor-portal manual upload is the interim intake mechanism** — a temporary workaround, not the production architecture. See ASM-012, Q-021, I-11 in [file 11](11-apis-integrations.md). |

## 2. Contradictions & inconsistencies in sources

| ID | Contradiction | Detail |
|----|---------------|--------|
| CON-001 | Deemed-closure horizon differs UG vs PG | UG: closed after **5** consecutive denied/non-admitting sessions (source: UG Ayurveda 2024 § 55(12)); PG: after **3** consecutive sessions (source: PG Ayurveda 2024 § Ch. VI 15). Both are modelled, but the client should confirm this asymmetry is intended. |
| CON-002 | Session-year mismatch inside letters | The clarification letter's subject cites "academic session **2026-27**" while its final directive paragraph cites "**2025-26**" for the same renewal (source: clarification letter format § Subject vs closing paragraph). Assumed to be a drafting error the system should prevent via templating. |
| CON-003 | Hearing date vs notice date | The hearing letter dated **23.07.2025** grants a hearing "on **19.06.2025**" — a date in the past — with submissions due 24.07.2025 (source: Hearing letter with clarification format). Assumed copy-paste error; system-generated letters must validate date ordering. |
| CON-004 | Board meeting numbering/dates | Agenda titled "160th Board Meeting to be held on **18.04.2026**" while the inner heading says "**18.05.2026** at 03:00 PM", and Item 1 confirms the minutes of the "158th" meeting in one line and "159th" in the next (source: Board meeting Agenda (0) § header & Agenda Item No. 1). |
| CON-005 | Punitive policy vs assessment practice on seat-reduction basis | Punitive policy prescribes 5% intake reduction *per deficient teaching faculty* (source: PUNITIVE POLICY § 2) whereas hearing letters justify action from an overall staff-availability percentage (75.55%, 83.33%) plus department-wise HF/LF tables (source: Hearing letter without clarification format § Teaching staffs). The exact computation (per-head vs percentage-threshold) needs confirmation — see Q-004. |
| CON-006 | Clarification window | The clarification letter demands a response "**within 1 day**" (source: clarification letter format § closing) — operationally extreme and not traceable to any regulation clause in the corpus. Confirm the actual configurable window. |
| CON-007 | Master data spelling/quality | The institute master header spells "**Instutite ID**" and mixes name + full postal address in one cell, with `-` for missing e-mail/phone (source: Master data of institute § All File Number). Treated as data-cleansing scope, not a spec. |
| CON-008 | "Extended permission" terminology overload | Ayurveda UG §54 uses Extended vs Yearly permission categories, but one hearing letter uses "issuance of Extended permission … under section 28" as if it were a grantable permission type (source: Hearing letter with clarification format § Subject). The SRS models Extended Permission as a *status/category*, and treats the letter usage as loose drafting. |

## 3. Ambiguities

| ID | Ambiguity | Impact |
|----|-----------|--------|
| AMB-001 | "HF"/"LF" not defined anywhere in the corpus. From context (department staffing tables listing Professor / Associate Professor / Assistant Professor requirements) they denote **Higher Faculty** (Professor/Reader cadre) and **Lower Faculty** (Lecturer cadre) shortfalls (source: Hearing letter without clarification format § Shortcoming table). Needs confirmation. | Affects deficiency-engine rules (FR-040s). |
| AMB-002 | "20% relaxation" on constructed-area shortcomings appears in assessment reports (source: AYU0659 § 2.2) but its regulatory basis and whether it applies to all area line-items is unstated. | Affects auto-computation of infrastructure compliance. |
| AMB-003 | Equipment compliance metric: reports use "Mean of Essential + General availability" for recommendation (source: AYU0659 § 7) but no threshold value is stated (the clarification letter flags 47.67% as a defect; AYU0659's 97.59% passes). Cut-off unknown. | Threshold must be configurable; see Q-005. |
| AMB-004 | AEBAS "suspicious" attendance: letters cite "12 faculties found suspicious as per AEBAS records" (source: Hearing letter without clarification format § Aadhaar Enabled Biometric attendance) without a defined percentage/day-count rule. | Rule engine input needed. |
| AMB-005 | Visitation modes: "hybrid", physical, virtual, and surprise/re-visits all appear (source: hearing letters; UG Ayurveda 2024 § 55(10); Board meeting Agenda (0) § Agenda Item No. 3) but scheduling/notice rules per mode are not defined. | Affects visitation module workflow states. |
| AMB-006 | Which decisions require Board (collective) approval vs a single Member's sign-off is implicit: letters are signed by a Member "with the approval of the competent authority" (source: Hearing letter without clarification format § signature block). | Affects approval-workflow design (BR/FR). |
| AMB-007 | Scrutiny clarification cycles: Agenda (0) shows 1st scrutiny → clarification → 2nd scrutiny (source: Board meeting Agenda (0) § Agenda Item No. 2), but the maximum number of cycles / deadlines per cycle is unstated. | Workflow loop bound needed. |
| AMB-008 | The relationship between the **rating** outcome (A–D) and the **permission** outcome for the same college-year is only partially specified (rating eligibility requires Extended Permission; assessment report footer says "Rating 2025-26 – A/B/C not eligible" (source: Assessment of Sardar PAtel... § Other Observation)). | Cross-module state dependency to confirm. |

## 4. Assumptions made in this SRS

Each assumption is tagged where used in files 01–11 as `[INFERRED]` and registered here.

| ID | Assumption | Reasoning |
|----|-----------|-----------|
| ASM-001 | The client (system owner) is **NCISM / MARB-ISM** and primary users are MARB dealing staff, Board members, visitors, hearing committees, and colleges as external submitters. | All 18 documents are MARB-side artefacts (agendas, report templates, allotment sheets, letters). |
| ASM-002 | The system to be built is an internal **assessment & permission management workflow system** that complements (not replaces) the existing public NCISM portal and AEBAS. **Scope revision (client-directed):** the system boundary now begins at **receipt of the TCS-generated Regulatory Report** — visitation execution and report authoring are upstream (TCS-side), outside this platform (GAP-011, ASM-012). | Sources describe existing portal/AEBAS as operational systems the workflow consumes data from (GAP-006); the TCS boundary is a client scope instruction, not derived from the corpus. |
| ASM-003 | One unified data model parameterised by *system of medicine* (Ayurveda/Unani/Siddha/Sowa-Rigpa) and *level* (UG/PG) serves all regulations. | The six regulations share one process skeleton with differing parameters (slabs, fees, grade bands, forms). |
| ASM-004 | HF = Professor/Reader-cadre shortfall; LF = Lecturer-cadre shortfall (AMB-001). | Consistent with staffing-requirement notation "1P And 1R +2L". |
| ASM-005 | All monetary values are INR; academic sessions run per Indian academic year (e.g., 2026-27); dates in sources are DD.MM.YYYY. | Uniform in all documents. |
| ASM-006 | Work allotment (state × system → dealing staff) governs which MARB staffer processes a college's file. | Direct reading of Work Allotment in Staff.md; no other purpose is plausible for that sheet. |
| ASM-007 | Letters (clarification/hearing/decision) are today drafted manually in Word from templates; the system should generate them from structured data. | The templates contain live "Or"-branches and copy-paste errors (CON-002/003) typical of manual drafting. |
| ASM-008 | English is the working language of the system; Hindi appears only in gazette formalities and letterheads. | Operational documents are in English. |
| ASM-009 | The technology stack proposed in file 06 is entirely `[INFERRED]` (user-approved approach); no source names any implementation technology. | Client instruction during planning. |
| ASM-010 | Board meetings occur roughly fortnightly-to-monthly (124th → 134th between 29.05.2025 and 16.07.2025; 160th in 2026). | Dates in hearing letters and agendas. |
| ASM-011 | Visitation team size is typically 3 visitors for UG annual visits, 2-member committees for hearings. | AYU0659/AYU0038/AYU0265 visitor tables; Agenda (1) minutes. |
| ASM-012 | The TCS Regulatory-Report API delivers the raw 20–50-page report as a PDF plus a metadata envelope (institute ID, session, visitation dates, report reference); this platform then runs its own extraction, rule evaluation and punitive computation on the received report. | ⚠️ Assumption — revised scope statement only names TCS as the generator and an API as the channel; no contract exists (GAP-011). The payload shape mirrors what the interim Visitor upload provides today, keeping the downstream pipeline unchanged. |

## 5. Questions for the client

### Process
- **Q-001**: Confirm the end-to-end sequence and the points where MARB staff vs Board vs President act (our model: allotment → scrutiny → visitation → assessment → clarification → Board meeting → hearing → decision → letters → appeal).
- **Q-002**: How many clarification cycles are allowed at scrutiny stage and at assessment stage, and what are the response windows? (CON-006, AMB-007)
- **Q-003**: Who has authority to *finalise* an assessment report before it goes to the Board — the dealing staff, a section officer, or a Board Member?
- **Q-004**: Exact seat-reduction computation: per-deficient-faculty 5% (punitive policy) vs overall percentage thresholds — how do the two interact, and is the arithmetic additive with the hospital-staff and functionality reductions? (CON-005)
- **Q-005**: What is the pass threshold for the equipment-availability mean, and which categories (Essential/General/Miscellaneous) count? (AMB-003)
- **Q-006**: What rule flags an AEBAS attendance record as "suspicious"? (AMB-004)
- **Q-007**: Are hearing outcomes decided by the committee, the President, or the full Board? What happens after "submission not considered"?
- **Q-008**: Should appeals (1st to Commission, 2nd to Ministry of Ayush) be in scope for the system, or tracked only as statuses?
- **Q-009**: Is the rating process (annual A–D grading, 70:30 weightage, rating agencies) in the initial scope or a later phase?

### Integrations (see also file 11)
- **Q-010**: Is there API access to the **AEBAS portal** for attendance pulls, or is verification manual/CSV? Same question for CCTV central-server feeds.
- **Q-011**: Does the existing NCISM college-facing portal (which issues logins with LOP and receives monthly self-disclosure) expose APIs, and is this system expected to replace it, integrate with it, or import from it?
- **Q-012**: How are NEFT/RTGS payments to the National Commission Fund confirmed today (bank statement, PFMS, Bharatkosh)? Should the system integrate with that channel? (GAP-010)
- **Q-013**: Which video-conferencing platform is used for virtual hearings, and must the system schedule/record VC sessions or only store links and minutes?
- **Q-014**: Are teacher codes and visitor IDs mastered in an existing NCISM registry the system must sync with, or will this system become the master?
- **Q-021**: **TCS Regulatory-Report API contract** (GAP-011): endpoint(s), payload format (PDF + metadata envelope? structured JSON?), authentication (server-to-server credentials/mTLS?), delivery semantics (push vs pull, retries, acknowledgement), report versioning/corrections, and the expected availability date. Until answered, the Visitor-portal manual upload remains the documented interim intake.

### Data & compliance
- **Q-015**: Should the 672-row institute master be migrated as-is with cleansing (split name/address, fix nulls), and who owns master-data corrections thereafter? (CON-007)
- **Q-016**: Data-retention rules: regulations require CCTV 6-month DVR + 3-year backup (source: UG Ayurveda 2024 § 10) — what retention applies to assessment files, hearing recordings and letters?
- **Q-017**: Do DPDP Act 2023 obligations apply to faculty Aadhaar-linked attendance data held by this system, and is NCISM the data fiduciary?
- **Q-018**: Confirm Siddha UG parameters (GAP-003) and whether Sowa-Rigpa PG exists (GAP-004).
- **Q-019**: Confirm HF/LF expansion (ASM-004) and the "20% relaxation" scope (AMB-002).
- **Q-020**: Letter reference-number generation rules per section/system/year (GAP-008).

---

*Finalized (revised for the TCS scope change). Cross-references: assumptions surface as `[INFERRED]` tags in files [01](01-project-overview.md)–[11](11-apis-integrations.md); risks derived from these gaps are in [13-risks.md](13-risks.md); question resolutions gate the roadmap phases in [14-roadmap.md](14-roadmap.md) (Q-004/005/006 block the assessment engine; Q-009 gates rating; Q-018 blocks Siddha UG / Sowa-Rigpa PG segments; **Q-021 gates the TCS-API integration phase — the interim Visitor upload stands until it is resolved**).*
