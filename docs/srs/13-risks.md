# 13 — Risks

> Part of the [SRS suite](README.md). Cross-references: gaps `GAP/CON/AMB/Q-xxx` in [12-gaps-and-questions.md](12-gaps-and-questions.md); rules `BR-xxx` in [03-business-requirements.md](03-business-requirements.md). Ratings: probability × impact (H/M/L). Mitigations are proposals.

## 1. Business & process risks

| ID | Risk | P | I | Mitigation |
|----|------|---|---|------------|
| RSK-001 | **Punitive computation disputes.** Seat reductions/denials computed by the system are challenged on appeal because the rule interpretation (per-faculty 5% vs percentage thresholds, rounding, additivity) differs from Board practice (CON-005, Q-004). | H | H | Resolve Q-004/Q-005 in writing before building M4; golden-test the engine against the corpus worked examples (SC-02); keep a Board-signed rule-interpretation memo per policy version; manual override with reason always available. |
| RSK-002 | **Natural-justice procedural defects.** A hearing skipped, a clarification deadline mis-set, or a letter sent to a wrong address could void a denial in appeal — the regulations make hearing mandatory before adverse orders (BR-502; source: UG Ayurveda 2024 § 55(14)). | M | H | Workflow engine hard-blocks adverse decisions without completed clarification+hearing states; letter validations (FR-082); dispatch to registered official e-mail only (BR-106). |
| RSK-003 | **Statutory deadline breaches at scale.** 672 institutes × annual cycle compressed ahead of counselling; missing the 60-day communication (BR-307) or 6-month application decision (BR-206) has legal consequences. | M | H | Deadline engine with escalation (FR-092); pipeline dashboards (FR-095); capacity planning per state/system using the allotment load report. |
| RSK-004 | **Change-resistance in a paper-native workflow.** Dealing staff and Board members currently work in Word/Excel; visitors are external faculty with varying digital comfort. | H | M | Proforma UI mirrors the paper form (NFR-060); phased rollout with a pilot state; parallel-run one session; training for visitors before visitation season. |
| RSK-005 | **Session policy churn.** The punitive policy is re-adopted per session and may change shape (new rules, not just parameters) after the system ships (C-02). | H | M | Rule model designed for expression-based rules, not hard-coded formulas (FR-016); policy activation gated on Board reference (SoD-04); regression suite per version. |
| RSK-006 | **College-side capacity/connectivity.** Colleges in rural areas may fail portal submissions or miss e-mail deadlines, generating disputes. | M | M | Multi-channel notifications; submission receipts with timestamps; e-mail remains the legal channel of record (BR-106) while the portal view is convenience. |
| RSK-007 | **Fraud arms race.** Sources show sophisticated evasion: proxy AEBAS marking via pre-recorded videos, multiple attendance registers, staged staff photos (source: Board meeting Agenda (1) Minutes; Board meeting Agenda (0) § Item 3). A digitized process may be gamed in new ways (e.g., fabricated uploads). | H | M | Evidence hashing + custody metadata (NFR-013); cross-checks (AEBAS vs registers vs salary statements) systematized (WF-8); randomized surprise re-visit support (FR-037); roadmap AI anomaly detection ([14](14-roadmap.md)). |
| RSK-008 | **Single point of institutional knowledge.** Work allotment shows individual doctors covering entire states (source: Work Allotment in Staff.md § Sheet1); their tacit rules aren't documented. | M | M | Capture decision conventions during UAT as configurable rules; delegation handling (FR-004). |

## 2. Technical risks

| ID | Risk | P | I | Mitigation |
|----|------|---|---|------------|
| RSK-020 | **Unknown integration contracts.** AEBAS, NCISM portal, payment channel and VC interfaces are all unconfirmed (GAP-006, Q-010–Q-013); building against assumptions invites rework. | H | M | All integrations phased with import/manual fallbacks first (file 11 phasing); interface-discovery workshop with NCISM IT in inception; backend's isolated behind ports. |
| RSK-027 | **TCS report-API boundary dependency.** The whole case pipeline now begins at a TCS-delivered Regulatory Report, but the API contract, payload schema, auth, delivery timing and correction/versioning semantics are unknown (GAP-011/ASM-012/Q-021); schema drift or API delays could stall intake at scale. | H | H | Interim Visitor-upload path is the guaranteed fallback (NFR-023/080) so no case blocks; ingestion isolated behind an adapter with a defined internal `RegulatoryReport` contract; idempotency on report ref/hash; TCS interface-discovery + payload-schema sign-off in inception; validate institute/session on receipt. |
| RSK-021 | **Standards-table re-keying errors.** MESAR schedules exist only as OCR-mangled gazette tables (C-06); a wrong Required value corrupts every assessment using it. | H | H | Dual-entry re-keying with reviewer sign-off; spot-verify against filled reports (AYU0659 Required columns); version freeze + checksum on go-live; discrepancy-report channel for staff. |
| RSK-022 | **Legacy master migration quality.** 672 records with structural defects (CON-007); mis-linked Institute IDs would attach cases to wrong colleges. | M | H | Cleansing with exception report (FR-012); ID cross-validation against letters/file numbers; client sign-off (Q-015, SC-06). |
| RSK-023 | **Offline field capture conflicts.** Multi-visitor offline edits on one proforma risk sync conflicts/data loss at the worst moment (during a visit). | M | M | Per-line ownership (each visitor edits own observation fields); conflict surfacing not silent merge (M3); local draft persistence; pre-visit connectivity checklist. |
| RSK-024 | **Evidence storage growth & integrity.** Videos/photos per visitation × hundreds of visits/season; a lost or altered evidence file undermines a legal case. | M | H | Object storage with WORM + hashes (NFR-013); lifecycle tiering; restore drills (NFR-050). |
| RSK-025 | **Template/letter regression.** A templating bug reproducing CON-002/003-class errors (wrong session/dates) at scale would be worse than the manual process. | M | H | Validation suite as release gate (FR-082); canary review queue (first N letters per template version require human review). |
| RSK-026 | **Performance during season peaks.** Assessment computation + document uploads spike pre-counselling (NFR-004). | L | M | Load testing against seasonal profile; horizontal media-path scaling. |

## 3. Compliance & legal concerns

| ID | Concern | Notes / mitigation |
|----|---------|--------------------|
| RSK-040 | **DPDP Act 2023 / Aadhaar-adjacent data.** AEBAS extracts identify individuals; penalties name faculty. Data-fiduciary responsibilities unresolved (Q-017). | Store minimum fields (NFR-040); access logging (NFR-031); privacy review before go-live. |
| RSK-041 | **Evidentiary admissibility.** Hearing/penalty decisions may reach courts; electronic records need IT Act §65B-style integrity discipline. | Hashing, WORM, audit trail (NFR-013/030); certified export function for legal proceedings `[INFERRED]`. |
| RSK-042 | **Regulation amendments.** Gazette amendments (new MESAR versions, like the 2016→2024 transition visible in the corpus) change standards mid-lifecycle. | Versioned standards tables keyed by regulation year (FR-015); cases pinned to the version in force for their session. |
| RSK-043 | **Missing Siddha UG / Sowa-Rigpa PG regulations** (GAP-003/004) — configuring these systems on assumed parameters risks wrong Required values. | Block go-live for those segments until source regulations are supplied (Q-018). |
| RSK-044 | **Publication errors.** Wrong permitted-intake published to counselling (I-09) directly affects student admissions. | Exports only from Board-decided records; dual-control release step (file 11 § 4). |

## 4. Bottlenecks (process choke points to design around)

| ID | Bottleneck | Evidence | Design response |
|----|-----------|----------|-----------------|
| RSK-060 | **Board meeting throughput** — every scrutiny report, assessment and hearing minute funnels through numbered meetings (BR-506). | Agendas bundling scrutiny + assessment + hearings (Board meeting Agenda (0)) | Board-ready queue with completeness checks so meetings decide, not rework; consent-agenda grouping for clean grants `[proposal]`. |
| RSK-061 | **Hearing committee capacity** — 2-member committees, President-appointed, per adverse case in season. | Board meeting Agenda (1) Minutes | Hearing calendar with utilization view; batched hearing days; complete pre-hearing bundles (M5/M7). |
| RSK-062 | **Visitor availability** — ~3 external faculty per visit across hundreds of colleges in a window. | AYU0659 § Visitor Details; visitation dates clustering (Mar–Apr 2025 letters) | Visitor engagement dashboard (FR-094); conflict-checked auto-suggestion; re-visit prioritization. |
| RSK-063 | **Dealing-staff load imbalance** — e.g., one pair covers Maharashtra's 155 Ayurveda colleges while another covers 3-college states. | Work Allotment in Staff.md § Sheet1 | Allotment load report; rebalancing support (FR-002/FR-004). |
| RSK-064 | **1-day clarification windows** create dispute-prone pressure both ways (CON-006). | clarification letter format § closing | Configurable windows with delivery-confirmed clocks (Q-002). |
