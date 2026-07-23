# 01 — Project Overview

> Part of the [SRS suite](README.md). See [12-gaps-and-questions.md](12-gaps-and-questions.md) for assumptions referenced as `ASM-xxx`.

## 1. Executive summary

The **National Commission for Indian System of Medicine (NCISM)**, through its **Medical Assessment and Rating Board for Indian System of Medicine (MARB-ISM)**, regulates **672 medical colleges** across the Ayurveda (590), Unani (58), Siddha (17) and Sowa-Rigpa (7) systems of medicine (source: Master data of institute .md § All File Number). Every year, MARB must: scrutinize proposals for new colleges, new PG courses and intake increases; conduct visitations of existing colleges; assess findings against the Minimum Essential Standards, Assessment and Rating (MESAR) regulations; issue clarification letters and hearing notices; place reports before numbered Board meetings; apply a Board-approved punitive policy (seat reductions, denials, monetary penalties); issue permission/denial decisions before counselling; and rate fully established colleges A–D (source: Board meeting Agenda (0) § Agenda Items 2–3; PUNITIVE POLICY § all; Minimum Essential Standards... Undergraduate Ayurveda... Regulations, 2024 § Chapter VI–VII).

Today this workflow runs on Word letters, Excel registers and e-mail (source: clarification letter format; Master data of institute; Work Allotment in Staff.md), even though the regulations themselves mandate a digital ecosystem — monthly online self-disclosure, AEBAS biometric feeds to a central server, CCTV integration, and even "an Artificial-Intelligence-based online system for transparency" (source: NCISM(...Postgraduate...Ayurveda)-Regulations-2024 § Ch. VIII 43(5); Minimum Essential Standards... Undergraduate Ayurveda... 2024 § 8–11, 55(2)).

This project specifies a **MARB-ISM Assessment & Permission Management System**: a workflow platform that digitizes the lifecycle **from the point the TCS-generated Regulatory Report is received** — report ingestion (API; interim manual upload) → assessment computation → clarification → Board meeting → hearing → decision → letters → rating — with a rules engine for deficiency computation and punitive policy, full traceability, and integration points to the existing NCISM portal, AEBAS and payment channels. Application scrutiny and the upstream visitation/report authoring (TCS) are documented as context. `[INFERRED — ASM-001/ASM-002 (as revised): system owner derived from the corpus; the TCS boundary is a client scope instruction]`

## 2. Problem statement

1. **Manual, error-prone correspondence.** Letters are drafted by hand from Word templates; the samples contain live template branches ("Or" alternatives left in), inconsistent session years within one letter, and hearing dates earlier than the notice date (source: Assessment of Sardar PAtel Ayurvedic Med. Coll. § 5–9 "Or" branches; clarification letter format § Subject vs closing; Hearing letter with clarification format § dates). See CON-002/003 in [file 12](12-gaps-and-questions.md).
2. **Fragmented records.** The institute master is an Excel sheet with misspelled headers, addresses embedded in name fields and missing contacts (source: Master data of institute § All File Number); work allotment is another sheet (source: Work Allotment in Staff.md § Sheet1); assessment reports, scrutiny checklists, agendas and minutes are separate Word files keyed only by Inst. ID and file numbers.
3. **Complex, high-stakes rule application.** Seat-reduction arithmetic (5% per deficient faculty, per-post hospital-staff tables, 1 seat per 10% OPD deficiency, 30% for hospital non-functionality, denial when cumulative reduction > 50%) is computed manually per college (source: PUNITIVE POLICY § 2–11). Errors invite appeals and litigation.
4. **Volume and deadlines.** Hundreds of colleges must each receive visitation, assessment, possible clarification (windows as short as 1 day), possible hearing, and a decision **at least 60 days before counselling** (source: clarification letter format § closing; Minimum Essential Standards... Undergraduate Ayurveda... 2024 § 55(7)).
5. **Fraud detection burden.** Ghost-faculty and fabricated-register cases require cross-checking AEBAS logs, CCTV, multiple attendance registers and salary statements — currently assembled manually into hearing evidence (source: Board meeting Agenda (1) Minutes § Agenda Item No. 6; Board meeting Agenda (0) § Agenda Item No. 3).

## 3. Goals & objectives

| # | Goal | Measure |
|---|------|---------|
| G-01 | Digitize the end-to-end permission workflow (Sections 28/29) for all four systems of medicine, UG and PG — **beginning at receipt of the TCS-generated Regulatory Report** | 100% of academic-session decisions processed in-system |
| G-02 | Automate deficiency computation and punitive-policy application from the **received Regulatory Report** (TCS-generated; ingested via API, interim manual upload) | Zero manual arithmetic in seat-reduction/denial calculations; every figure traceable to a rule version |
| G-03 | Generate all statutory correspondence (clarification, hearing, decision letters) from templates + structured data | No hand-edited letters; template validation blocks date/session inconsistencies |
| G-04 | Give MARB staff, Board and management real-time visibility of file status per college/session | Dashboard of pipeline states; decisions issued ≥60 days before counselling (source: UG Ayurveda 2024 § 55(7)) |
| G-05 | Maintain a clean single institute/teacher/visitor master with full audit trail | Institute master migrated and deduplicated; all edits audited |
| G-06 | Support evidence-heavy hearings (documents, AEBAS extracts, CCTV references, minutes) as structured case files | Hearing bundle assembled in-system; minutes captured against each shortcoming |
| G-07 | (Later phase) Support annual rating (70% online : 30% physical, grades A–D) | Rating scores computed from self-disclosure + visit data (source: UG Ayurveda 2024 § 56) |

## 4. Stakeholders

| Stakeholder | Interest / role | Source |
|-------------|-----------------|--------|
| NCISM Chairperson & Commission | Apex oversight; first-appeal authority; receives copies of all letters | clarification letter format § Copy to; UG Ayurveda 2024 § 65 |
| President, MARB-ISM | Appoints hearing committees; supervises hearings; competent authority for letters | Hearing letter without clarification format § body & signature |
| MARB Board Members | Sign letters; sit in numbered Board meetings deciding permissions | Board meeting Agenda (0); hearing letters § signature blocks |
| MARB dealing staff (assessors/section staff) | State-and-system-wise file processing per work allotment | Work Allotment in Staff.md § Sheet1 (ASM-006) |
| Hearing Committee members | Conduct virtual hearings, record observations per shortcoming | Board meeting Agenda (1) Minutes § Agenda Item No. 6 |
| Visitors / visitation teams | Conduct physical/virtual/hybrid visits; submit reports & certifications — **performed upstream under the TCS-run report-generation process (scope revision; ASM-002)** | AYU0659 § Visitor Details & Certification Details |
| TCS (external report generator) | Conducts the visitation and generates the 20–50-page Regulatory/Assessment Report; will deliver it to this platform via API (GAP-011/Q-021) | ⚠️ Assumption-free only as to existence — client scope instruction; no corpus document describes TCS |
| Colleges (Principal/Dean, management) | Applicants and respondents: submit Part-I/II, clarifications, hearing submissions, fees | hearing/clarification letters; Board meeting Agenda (0) § Agenda Item 2 |
| Affiliating universities & State/UT governments | Issue Consent of Affiliation and Essentiality Certificates consumed by scrutiny | Board meeting Agenda (0) § FORM-29C/29E rows |
| Ministry of Ayush (Central Government) | Second/final appellate authority | PG Ayurveda 2024 § Ch. VIII 44(g) |
| AACCC / counselling bodies | Consume permission decisions before counselling rounds | UG Ayurveda 2024 § 55(7) |
| Rating agencies (empanelled) | May conduct rating on MARB's behalf | UG Unani 2023 § 17–18 |
| Students & public | Ultimate beneficiaries of enforced standards; published ratings | UG Ayurveda 2024 § 56 |

## 5. Business outcome

- **Regulatory throughput**: all ~672 institutes × annual cycle handled within statutory timelines (decision ≥60 days pre-counselling; 6-month cap on new-scheme decisions) (source: UG Ayurveda 2024 § 55(7); PG Ayurveda 2024 § Ch. VIII 43(4)).
- **Defensibility**: every decision letter traceable to visitation evidence, regulation clause and punitive-policy rule version — reducing appeal reversals and litigation exposure.
- **Fraud deterrence**: systematic AEBAS/attendance cross-checks make ghost-faculty detection repeatable rather than ad hoc (source: PUNITIVE POLICY § 4–5; Board meeting Agenda (1) Minutes).
- **Institutional memory**: board agendas, minutes, hearing records and college histories searchable by Inst. ID, session, state and system of medicine.
- **Foundation for the regulation-mandated AI-based online system** (source: PG Ayurveda 2024 § Ch. VIII 43(5)) — see proposals in [14-roadmap.md](14-roadmap.md).

## 6. Scope

> **⚠️ Scope revision (client-directed — see ASM-002/GAP-011 in [file 12](12-gaps-and-questions.md)):** the system boundary **begins at receipt of the TCS-generated Regulatory Report**. Visitation execution and authoring of the 20–50-page Regulatory/Assessment Report are performed **externally by TCS** and are upstream of this platform.

**Upstream (TCS — outside this platform):** visitation scheduling & execution; field capture; authoring of the 20–50-page Regulatory/Assessment Report. Documented in this suite (WF-2, FR-030 series, module M3 field-capture) as domain context only.

**In scope (initial):** **Regulatory-report ingestion** (production: TCS API — FR-038/I-11; interim: Visitor-portal manual upload as a temporary workaround); institute/teacher/visitor masters; work allotment; new-proposal scrutiny; deficiency & punitive computation from the received report; clarification cycle; Board meeting agenda/minutes; hearing management; decision & letter generation; document management; dashboards; notifications; role-based access.

**Out of scope (initial), tracked in [14-roadmap.md](14-roadmap.md):** the college-facing self-disclosure portal replacement; rating computation; appeals processing beyond status tracking; LMS/HIMS/CCTV real-time command-centre; AI/ML features. `[INFERRED — scope boundary chosen because sources document the MARB-internal workflow in operational detail, while portal/rating/command-centre exist only as regulatory mandates; see ASM-002 and Q-009/Q-011]`
