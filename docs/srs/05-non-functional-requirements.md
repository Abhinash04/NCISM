# 05 — Non-Functional Requirements

> Part of the [SRS suite](README.md). Functional counterparts in [04-functional-requirements.md](04-functional-requirements.md). The sources are business/regulatory documents; quantitative NFR targets are therefore `[INFERRED]` engineering proposals sized from corpus facts (672 institutes, annual cycle, statutory deadlines) unless a source is cited. All inferred targets are subject to client confirmation.

## Performance

- **NFR-001 · Interactive response.** Standard screens (case view, registry search) render in ≤ 2 s at P95; global search ≤ 3 s. `[INFERRED — usability convention; no source states targets]`
- **NFR-002 · Computation latency.** Assessment/punitive computation for one college completes in ≤ 10 s and is run on demand (not batch), so dealing staff can iterate with clarification inputs. `[INFERRED — sized from single-college rule volume in PUNITIVE POLICY §§ 1–13 and AYU0659 report size]`
- **NFR-003 · Report/letter generation.** Any letter or assessment report PDF generates in ≤ 15 s. `[INFERRED]`
- **NFR-004 · Peak load.** The workload is seasonal: visitation/assessment/hearing waves cluster ahead of counselling (decisions due ≥60 days before counselling — source: Minimum Essential Standards... Undergraduate Ayurveda... 2024 § 55(7)). System must sustain ~200 concurrent internal users and burst document uploads during visitation season without degradation. `[INFERRED — staff counts from Work Allotment in Staff.md § Sheet1 (~10 named staff for Ayurveda alone) scaled with visitors, board and college users]`

## Scalability

- **NFR-005 · Data volume.** Support ≥ 672 institutes × multiple cases/session × ~10 sessions retention, tens of thousands of teachers/visitors, and evidence media per visitation (photos/videos/register scans) reaching multi-GB per case (source: Master data of institute § All File Number — 672 records; Board meeting Agenda (1) Minutes — video/photo evidence practice). Storage must scale horizontally for media.
- **NFR-006 · Regulatory extensibility.** Adding a system of medicine, a new regulation version, or a new session's punitive policy must require configuration (FR-015/FR-016), not code (source: PUNITIVE POLICY § final para — policy re-approved per session; C-02/C-03).

## Security

- **NFR-010 · Access control.** Enforce the role × permission matrix ([file 07](07-roles-permissions.md)); least privilege; college accounts see only their own institute's data. `[INFERRED from workflow separation in sources]`
- **NFR-011 · Authentication.** Strong password policy + MFA for internal roles with decision/approval powers (Board Member, President, Admin). `[INFERRED — decision integrity; attempts to pressurise/bribe are an anticipated threat per PG Ayurveda 2024 § Ch. XII 58]`
- **NFR-012 · Data protection.** Encrypt in transit (TLS) and at rest; special handling for Aadhaar-adjacent AEBAS data (store attendance outcomes/extracts, never Aadhaar numbers) (source: AEBAS mandated in UG Ayurveda 2024 § 9; DPDP applicability open — Q-017).
- **NFR-013 · Evidence integrity.** Visitation evidence and finalized reports are immutable (write-once) with cryptographic hashes, since they support hearings, penalties and potential criminal proceedings (source: PG Ayurveda 2024 § Ch. XII 58 — criminal proceedings for fabricated documents; Board meeting Agenda (1) Minutes — contested evidence).
- **NFR-014 · Non-repudiation of approvals.** Finalization, Board decisions and letter sign-offs capture the authenticated actor and are tamper-evident (supports BR-506/507).

## Availability & reliability

- **NFR-020 · Availability.** 99.5% during business hours; planned maintenance outside working hours. Statutory deadline days (counselling countdown, hearing dates) are blackout periods for maintenance. `[INFERRED — deadlines from UG Ayurveda 2024 § 55(7); hearing dates in letters]`
- **NFR-021 · Recovery.** RPO ≤ 24 h, RTO ≤ 8 h. `[INFERRED — annual-cycle business tolerates short outages but not data loss of finalized decisions]`
- **NFR-022 · ~~Graceful degradation offline capture~~ (moot under the TCS boundary).** Field proforma capture is now upstream (TCS); this NFR no longer applies to this platform. The corresponding platform requirement is **ingestion reliability** — see NFR-023. `[Superseded by scope revision — ASM-002/GAP-011]`
- **NFR-023 · Regulatory-report ingestion reliability.** Report intake (TCS API — production; Visitor upload — interim) must be idempotent (safe re-delivery on retry), record provenance + content hash, and never block a case if the TCS API is down — the interim manual-upload path is the guaranteed fallback (NFR-080, BR-311). `[INFERRED — TCS boundary; contract pending Q-021]`

## Audit logging

- **NFR-030 · Complete audit trail.** Every state change, edit, approval, dispatch, login and export is logged (actor, timestamp, before/after) and retained for the full retention period; supports SC-05 traceability from decision letter back to evidence and regulation clause.
- **NFR-031 · Read audit for sensitive records.** Access to hearing evidence and penalty records is itself logged. `[INFERRED — anti-tampering posture per NFR-013 rationale]`

## Privacy

- **NFR-040 · Personal data minimisation.** Teacher/staff records hold only regulatorily required fields (codes, designations, registrations, attendance outcomes); no biometric templates or Aadhaar numbers are stored (source: AEBAS is an external system; UG Ayurveda 2024 § 9) `[INFERRED handling; Q-017]`.
- **NFR-041 · Disclosure control.** Ghost-faculty findings, penalties and hearing minutes are restricted-visibility until Board-decided; published outputs (ratings) follow the regulation's publication mandate only (source: UG Ayurveda 2024 § 56 — results published before counselling).

## Backup & retention

- **NFR-050 · Backups.** Daily automated backups with periodic restore tests; media store versioned. `[INFERRED]`
- **NFR-051 · Retention.** Case files, letters, minutes and evidence retained ≥ 10 years (colleges' lifecycle spans LOI→fully-established ≈ 5 years plus appeal horizons); the regulations' own CCTV rule (6-month DVR + 3-year backup — source: UG Ayurveda 2024 § 10) sets a floor for related evidence; exact policy pending Q-016.

## Usability & accessibility

- **NFR-060 · Form ergonomics.** The visitation proforma UI mirrors the familiar paper structure (sections 1–8, Required/Actual/Observation columns — source: AYU0659 structure) to minimize retraining.
- **NFR-061 · Language.** UI and generated letters in English; letterhead elements bilingual (Hindi/English) as per the observed formats (source: letters § "Øekad/Ref. No. … fnukad/Dated"; ASM-008).
- **NFR-062 · Accessibility.** WCAG 2.1 AA for the web UI. `[INFERRED — government-adjacent system convention (GIGW); no source states it]`

## Browser & mobile support

- **NFR-070 · Browsers.** Current versions of Chrome, Edge and Firefox on desktop. `[INFERRED]`
- **NFR-071 · Mobile/tablet.** Visitation capture (FR-033–FR-036) must work on tablets/large phones in the field, including camera capture for evidence; approval/dashboard views responsive on mobile (source: visitors work on-site and capture photos/videos — Board meeting Agenda (1) Minutes) `[INFERRED device need]`.

## Interoperability & compliance posture

- **NFR-080 · Integration resilience.** External dependencies (AEBAS, e-mail, payment verification — [file 11](11-apis-integrations.md)) degrade to manual-entry fallbacks; no statutory step may hard-block on a third-party outage.
- **NFR-081 · Legal compliance.** IT Act 2000 (electronic records), DPDP Act 2023 (subject to Q-017), and CVC/audit norms for government decision systems. `[INFERRED — obligations follow from the system's governmental decision-making role]`
- **NFR-082 · Time discipline.** All timestamps in IST with server-side clocks; date arithmetic (deadlines, 60-day/6-month clocks, session boundaries) uses validated calendar logic (regression against CON-002/003 error classes).
