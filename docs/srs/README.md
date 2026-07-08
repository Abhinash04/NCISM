# SRS — MARB-ISM Assessment & Permission Management System

Software Requirements Specification suite for digitizing the **college assessment, permission, and rating workflow** of the **Medical Assessment and Rating Board for Indian System of Medicine (MARB-ISM)** under the **National Commission for Indian System of Medicine (NCISM)**, covering Ayurveda, Unani, Siddha and Sowa-Rigpa (ASU&SR) medical colleges under the NCISM Act, 2020 (sections 28/29).

> Sources: 18 client documents in [`markdown/`](../../markdown/) — six gazette regulations (UG/PG MESAR), institute master data, sample assessment reports, board meeting agenda/minutes, hearing/clarification letter formats, punitive policy, and staff work-allotment sheet. Every requirement in this suite carries a `(source: <filename> § <heading>)` citation; anything not explicit in a source is tagged `[INFERRED]` and registered in [12-gaps-and-questions.md](12-gaps-and-questions.md).

## Index

| # | File | Contents |
|---|------|----------|
| 01 | [Project Overview](01-project-overview.md) | Executive summary, problem statement, goals, stakeholders, business outcomes |
| 02 | [Business Domain](02-business-domain.md) | Domain explainer, As-Is vs To-Be process, pain points, client-perspective workflow |
| 03 | [Business Requirements](03-business-requirements.md) | Business rules (BR-xxx), compliance/regulatory grounding, approval workflows, constraints, success criteria |
| 04 | [Functional Requirements](04-functional-requirements.md) | FR-001… with rationale, actors, I/O, CRUD, validations, notifications, reports, dashboards, search, document management, auth |
| 05 | [Non-Functional Requirements](05-non-functional-requirements.md) | NFR-001…: performance, security, scalability, availability, audit, privacy, backup, browser/mobile |
| 06 | [Technical Architecture](06-technical-architecture.md) | Proposed stack `[INFERRED]`, architecture, APIs, DB, integrations, auth, storage, hosting, data flow |
| 07 | [Roles & Permissions](07-roles-permissions.md) | All roles, responsibilities, module access, workflow ownership, role × permission matrix |
| 08 | [Workflows](08-workflows.md) | Step-by-step workflows with Mermaid flowcharts and state diagrams |
| 09 | [Modules](09-modules.md) | Module objectives, features, I/O, dependencies, users, developer view (entities, APIs, validations, edge cases) |
| 10 | [Data Model](10-data-model.md) | Entities, Mermaid erDiagram, key fields, master vs transactional data, required documents |
| 11 | [APIs & Integrations](11-apis-integrations.md) | Internal/external/government APIs, third-party services, auth flows, data exchanged |
| 12 | [Gaps & Questions](12-gaps-and-questions.md) | Missing info, contradictions, ambiguities, assumptions (ASM-xxx), client questions (Q-xxx) |
| 13 | [Risks](13-risks.md) | Technical/business risks, compliance concerns, bottlenecks |
| 14 | [Roadmap](14-roadmap.md) | Implementation order, MVP scope, future enhancements, AI/ML opportunities (proposals) |

## How to read this suite

- **Business analysts / client** — start at 01 → 02 → 03, then 08 (workflows) and 12 (open questions).
- **Developers** — 04, 07, 09, 10, 11; architecture context in 06.
- **Project managers** — 01, 13, 14.
- Requirement IDs are stable across files: `BR-xxx` (file 03), `FR-xxx` (file 04), `NFR-xxx` (file 05); gaps/assumptions/questions `GAP/CON/AMB/ASM/Q-xxx` (file 12); risks `RSK-xxx` (file 13).

## Glossary

| Term | Meaning |
|------|---------|
| **Academic session** | Indian academic year, e.g. 2026-27, for which permission is granted |
| **AEBAS** | Aadhaar Enabled Biometric Attendance System — mandatory staff attendance capture wired to the Commission's central server |
| **Annual/Yearly permission** | Permission to admit students for one academic session, granted after annual visitation (Section 28) |
| **Assessment report** | MARB's internal report comparing visitation findings against MESAR standards, producing shortcomings and punitive computations |
| **ASU&SR** | Ayurveda, Siddha, Unani & Sowa-Rigpa systems of medicine |
| **BAMS / BUMS / BSMS** | Bachelor degrees in Ayurveda / Unani / Siddha medicine & surgery (UG courses) |
| **Bed occupancy** | Average % of hospital beds occupied over the assessment period; a compliance metric with seat-reduction consequences |
| **Board meeting** | Numbered meeting of MARB-ISM (e.g., 160th) where assessment reports, scrutiny reports and hearing minutes are decided |
| **COA** | Consent of Affiliation — certificate from the affiliating university, a prerequisite document |
| **Clarification letter** | Letter to a college listing observed shortcomings and demanding a clarification within a deadline |
| **Deemed closed** | Status of a college denied/not admitting for 5 (UG) / 3 (PG) consecutive sessions; restart requires fresh Section-29 establishment |
| **Essentiality Certificate** | State/UT government certificate that a new college is needed (Form 29-C / Form-C etc.) |
| **Extended Permission** | Category of fully established college permitted 3 consecutive years — may admit annually without fresh permission |
| **Fully established** | College that has completed LOI → LOP → 3 renewals; governed by Section 28 |
| **Ghost / on-paper faculty** | Faculty "physically absent but present only on paper" — attracts ₹25 lakh/faculty penalty and teacher-code revocation |
| **Hearing** | Opportunity given (natural justice, e.g. reg. 55(14) UG Ayurveda) before seat reduction/denial; conducted virtually before a Hearing Committee |
| **HF / LF** | Higher Faculty (Professor/Reader cadre) / Lower Faculty (Lecturer cadre) shortfall notation `[INFERRED — ASM-004]` |
| **HIMS** | Hospital Information Management System, mandated and integrated with ABHA/HPR/UHID |
| **Inst. ID** | Permanent institute identifier, e.g. `AYU0659`, `UNI0313`; prefix encodes the system of medicine |
| **Intake capacity** | Sanctioned number of student seats (UG slabs 60/100/150/200; Sowa-Rigpa ≤15/16–30; PG ≤12 per programme) |
| **LOI / LOP** | Letter of Intent (29.0, no admissions) / Letter of Permission (29.1, first batch) in new-college establishment |
| **MARB / MARB-ISM / MARBISM** | Medical Assessment and Rating Board for Indian System of Medicine |
| **MESAR / MES / MSR** | Minimum Essential Standards, Assessment and Rating regulations / Minimum (Essential) Standards / Minimum Standard Requirements |
| **NCISM** | National Commission for Indian System of Medicine, New Delhi |
| **Part-I / Part-II** | College- and hospital-side self-declared visitation proformas submitted before/at visitation |
| **Punitive policy** | Session-specific Board-approved matrix converting deficiencies into seat reductions, denials and penalties |
| **Rating** | Annual A/B/C/D grading (Sowa-Rigpa A/B/C) of fully established Extended-Permission institutions; 70% online data + 30% physical verification |
| **ROP / Renewal** | Renewal of Permission (29.2/29.3/29.4) for 2nd/3rd/4th batches |
| **Scrutinization report** | Document-checklist review of a new proposal (forms, certificates, fees) before/alongside visitation |
| **Section 28 / 29** | NCISM Act 2020 sections: 28 = existing colleges (annual permission), 29 = new establishment / new courses / intake increase |
| **Teacher code** | Unique NCISM faculty identifier, e.g. `AYKC01861`; revocable under punitive policy |
| **Visitation** | Inspection visit (physical/virtual/hybrid/surprise) by an empanelled visitor team; identified by Visitation ID `A#####` |
| **Visitor** | Empanelled assessor (Visitor ID `V#####`), typically faculty of another ASU&SR college |

## Acronyms

| Acronym | Expansion |
|---------|-----------|
| ABHA | Ayushman Bharat Health Account |
| AACCC | Ayush Admissions Central Counselling Committee |
| AEBAS | Aadhaar Enabled Biometric Attendance System |
| BMW | Bio-Medical Waste |
| CCTV | Closed-Circuit Television |
| DM | Doctorate of Medicine (super-speciality, Ayurveda) |
| DMS | Deputy Medical Superintendent |
| EMO | Emergency Medical Officer |
| HFR / HPR | Health Facility Registry / Health Professional Registry |
| IPD / OPD | In-Patient Department / Out-Patient Department |
| LMS | Learning Management System |
| MoA | Ministry of Ayush |
| NABH | National Accreditation Board for Hospitals & Healthcare Providers |
| NEET / PGNET | National Eligibility cum Entrance Test (UG / PG) |
| NEFT / RTGS | National Electronic Funds Transfer / Real-Time Gross Settlement |
| NOC | No Objection Certificate |
| OT | Operation Theatre |
| RMO / RSO | Resident Medical Officer / Resident Surgical Officer |
| RPwD | Rights of Persons with Disabilities (Act, 2016) |
| UG / PG | Undergraduate / Postgraduate |
| UHID | Unique Health ID |
| VC | Video Conferencing |
