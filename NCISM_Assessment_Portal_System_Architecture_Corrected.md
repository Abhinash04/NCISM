# NCISM Assessment Portal — System Architecture & Workflow Summary

This document provides a high-level summary of how the NCISM Assessment Portal works. It maps the user hierarchy, reporting chain, and regulatory case flow specifically for **Gaur Brahmin Ayurvedic College & Hospital (AYU0038)** in Rohtak, Haryana.

---

## 1. User Hierarchy & Allotment Scoping

The NCISM organization enforces a strict hierarchical chain of reporting and supervision. 

* Case routing is determined by **allotments** (`staff_allotments` table) based on the **System of Medicine** (Ayurveda, Unani, Siddha, Sowa-Rigpa) and the **State** of the institution.
* **Gaur Brahmin Ayurvedic College & Hospital (AYU0038)** is an **Ayurveda** college in **Haryana**.
* **Dr. Dheeraj** is the allocated Junior Consultant (dealing staff) for Haryana/Ayurveda.

### Reporting Chain for Case `AYU0038`

```mermaid
graph TD
    classDef roles fill:#efe9de,stroke:#e6dfd8,stroke-width:1px,color:#141413;
    classDef apex fill:#cc785c,stroke:#cc785c,stroke-width:1px,color:#ffffff;
    
    President["President<br/>(Dr. Mukul Patel)"]:::apex
    BM2["Board Member (Team 2)<br/>(Dr. Sushrut Kanaujia)"]:::roles
    SC2["Senior Consultant<br/>(Dr. Kritika)"]:::roles
    JC_Dheeraj["Junior Consultant (Dealing Staff)<br/>(Dr. Dheeraj)<br/><i>Allotted: Haryana (Ayurveda)</i>"]:::roles
    
    BM1["Board Member (Team 1)<br/>(B. L. Mehra)"]:::roles
    SC1["Senior Consultant<br/>(Dr. Gaurav Bhandari)"]:::roles
    JC_Others1["Team 1 Juniors<br/>(Smarnika, Sunil, Tanya, etc.)"]:::roles
    
    President --> BM1
    President --> BM2
    BM1 --> SC1
    BM2 --> SC2
    SC1 --> JC_Others1
    SC2 --> JC_Dheeraj
    
    style President font-weight:bold;
    style BM2 font-weight:bold;
    style SC2 font-weight:bold;
    style JC_Dheeraj font-weight:bold;
```

---

## 2. End-to-End Case Workflow (Case `AYU0038`)

When a visitor uploads the visitation report for **AYU0038**, it drives a state-machine-guided maker-checker review lifecycle:

```mermaid
flowchart TD

%% =========================
%% Styles
%% =========================
classDef visitor fill:#efe9de,stroke:#e6dfd8,color:#141413
classDef junior fill:#cc785c,stroke:#cc785c,color:#ffffff
classDef senior fill:#efe9de,stroke:#e6dfd8,color:#141413
classDef board fill:#efe9de,stroke:#e6dfd8,color:#141413
classDef college fill:#efe9de,stroke:#e6dfd8,color:#141413
classDef system fill:#181715,stroke:#181715,color:#faf9f5
classDef terminal fill:#181715,stroke:#cc785c,stroke-width:2px,color:#faf9f5

%% =========================
%% Workflow
%% =========================

Start([Start<br/>PDF Report Ready])

VisitorUploader["Visitor<br/>visitor@ncism.local<br/>Uploads AYU0038 PDF"]:::visitor

UploadedState{"uploaded"}

JuniorProcess["Junior Consultant<br/>Dr. Dheeraj<br/>Haryana • Ayurveda<br/>Clicks Process"]:::junior

subgraph AsyncPipeline ["Async Processing Engine (pg-boss Worker)"]

OpenDataLoader["1. OpenDataLoader CLI<br/>Extract PDF → JSON"]:::system

CDM["2. CDM Builder<br/>Section Tree + Tables"]:::system

Rules["3. Rule Evaluator<br/>Punitive Policy"]:::system

Reporter["4. Assessment Report<br/>Generate MARB JSON"]:::system

OpenDataLoader --> CDM
CDM --> Rules
Rules --> Reporter

end

ProcessedState{"processed"}

JuniorSubmit["Junior Consultant<br/>Reviews Findings<br/>Clicks Submit"]:::junior

SeniorReviewState{"senior_review"}

SeniorForward["Senior Consultant<br/>Dr. Kritika<br/>Forward to Board"]:::senior

BoardReviewState{"board_review"}

BoardApprove["Board Member<br/>Dr. Sushrut Kanaujia<br/>Approve Decision"]:::board

ClarificationBranch["Option A<br/>Clarification"]

ClarifyState{"clarification_open"}

CollegeRespond["College User<br/>Uploads Response + Evidence"]:::college

ResponseSubmitted{"clarification_responded"}

HearingBranch["Option B<br/>Hearing"]

HearingReq{"hearing_requested"}

PresidentAppoint["President<br/>Dr. Mukul Patel<br/>Appoint Committee"]:::board

HearingSched{"hearing_scheduled"}

CommitteeMinutes["Hearing Committee<br/>Submit Minutes"]:::visitor

ApprovedState{"approved"}

SecretariatMeeting["Secretariat<br/>Schedule Board Meeting"]:::senior

FinalOrder["Review Final Order<br/>Dispatch"]:::senior

ClosedState([Closed]):::terminal

ComplianceLedger["Junior Consultant<br/>Penalty & Compliance Ledger"]:::junior

CompliedState([Complied]):::terminal

%% =========================
%% Connections
%% =========================

Start --> VisitorUploader

VisitorUploader --> UploadedState

UploadedState -->|Assigned to Dr. Dheeraj| JuniorProcess

JuniorProcess --> AsyncPipeline

Reporter --> ProcessedState

ProcessedState --> JuniorSubmit

JuniorSubmit --> SeniorReviewState

SeniorReviewState -->|Reviewed| SeniorForward

SeniorForward --> BoardReviewState

BoardReviewState --> ClarificationBranch

ClarificationBranch -->|Request Clarification| ClarifyState

ClarifyState --> CollegeRespond

CollegeRespond --> ResponseSubmitted

ResponseSubmitted -->|Return to Junior| JuniorSubmit

BoardReviewState -->|Request Hearing| HearingBranch

HearingBranch --> HearingReq

HearingReq --> PresidentAppoint

PresidentAppoint -->|Issue Notice| HearingSched

HearingSched --> CommitteeMinutes

CommitteeMinutes -->|Submit Minutes| BoardReviewState

BoardReviewState -->|Approve| BoardApprove

BoardApprove --> ApprovedState

ApprovedState -->|Seat Reduction| SecretariatMeeting

SecretariatMeeting --> FinalOrder

FinalOrder --> ClosedState

ApprovedState -->|Compliance Monitoring| ComplianceLedger

ComplianceLedger --> CompliedState

%% =========================
%% Node Styling
%% =========================

style Start fill:#faf9f5,stroke:#141413,color:#141413
```

---

## 3. Detailed Walkthrough of the Case Lifecycle

### 3.1 Report Submission (`uploaded` State)

* **Actor:** Visitor (`visitor@ncism.local`).
* **Action:** Selects `AYU0038` (Gaur Brahmin Ayurvedic College & Hospital), enters basic parameters (visitation dates, intake = `60`), and uploads the raw PDF report.
* **Output:** Case is created in the database under `applications` with `status = 'uploaded'`.

### 3.2 Automated Document Parsing & Rule Processing (`processed` State)

* **Actor:** Junior Consultant (**Dr. Dheeraj**).
* **Action:** Opens the case from their queue (routed because Haryana is in their allotments) and triggers **Process**.
* **System Engine Steps (Async pg-boss Queue):**
  1. **OpenDataLoader CLI:** Runs extraction on the PDF to create a structured JSON.
  2. **Canonical Document Model (CDM):** Organizes elements, stitches cross-page tables, and flattens column/row spans.
  3. **Rule Evaluator:** Resolves the **active ruleset** for the case's `(system, level)` from the ruleset registry (Admin → Rulesets) — for `AYU0038` (Ayurveda, UG) that is `mesar-ug-ayurveda-2024/v1` — then computes teacher-student ratios, bed occupancy thresholds, and department requirements. Six rulesets are active (UG Ayurveda/Unani/Sowa-Rigpa + PG Ayurveda/Unani/Siddha); each case is assessed against its own system's ruleset, not a hardcoded one.
  4. **Punitive Engine:** Maps any deficiencies (e.g. ghost faculty, lack of AEBAS biometric compliance) to specific punitive outcomes (e.g. 5% seat reduction per missing faculty, or complete denial).
* **Output:** An immutable **Assessment Report JSON** is generated and stored. Case status becomes `processed`.

### 3.3 Maker-Checker Submission (`senior_review` State)

* **Actor:** Junior Consultant (**Dr. Dheeraj**).
* **Action:** Reviews the generated Assessment Report findings, logs notes, and clicks **Submit for Review**.
* **Output:** Case status changes to `senior_review`.

### 3.4 Supervisor Verification (`board_review` State)

* **Actor:** Senior Consultant (**Dr. Kritika**).
* **Action:** Reviews Dr. Dheeraj's submission.
  * If changes are needed, she returns it to Dr. Dheeraj (`under_validation`).
  * If clean, she clicks **Forward to Board**.
* **Output:** Case status changes to `board_review`.

### 3.5 Board Review & Intervention Cycles

The Board Member (**Dr. Sushrut Kanaujia**) reviews the case findings. The board has 4 actions available:

#### Option A: Clarification Cycle (`clarification_open` → `clarification_responded`)

1. **Board Member** clicks **Request Clarification**. The system automatically generates a formatted **Clarification Letter** containing the assessment shortcomings.
2. The case moves to `clarification_open`.
3. **College User** (`college.ayu0038@ncism.local`) sees the case in their queue, inputs a response text, attaches evidentiary PDFs, and clicks **Submit**.
4. The case moves to `clarification_responded` and returns to **Dr. Dheeraj** to start review again.

#### Option B: Hearing Cycle (`hearing_requested` → `hearing_scheduled` → `board_review`)

1. **Board Member** clicks **Request Hearing** (status: `hearing_requested`).
2. **President** (**Dr. Mukul Patel**) reviews the request, appoints a committee (e.g. `hearing1`, `hearing2`), sets a date, and sends the **Hearing Notice** (status: `hearing_scheduled`).
3. **Hearing Committee** conducts the session, records meeting minutes and a verdict, returning the case to `board_review`.

### 3.6 Structured Board Decision (`approved` State)

* **Actor:** Board Member (**Dr. Sushrut Kanaujia**).
* **Action:** Clicks **Approve (decide)**. The system pre-fills the dialog with the auto-derived outcome from the punitive engine (e.g., `reduce-intake` to `50` seats due to teacher deficiencies). The Board confirms/edits this decision.
* **Output:** Status changes to `approved`. Auto-derived penalties (seat reductions) are written to the database, and compliance monitoring is initialized.

### 3.7 Board Meeting & Final Dispatch (`closed` State)

* **Actor:** Secretariat (`secretariat@ncism.local`).
* **Action:** 
  1. Schedules a Board Meeting (e.g. `MARB/2026/08`) and adds `AYU0038` to the agenda.
  2. Opens `AYU0038` and reviews the **Final Order Letter**, which is auto-drafted containing the board's decision, shortcomings, and applicable regulations.
  3. Clicks **Dispatch Final Order**.
* **Output:** Case status reaches its terminal state: `closed`. The college can now read the official Final Order.

### 3.8 Penalty Enforcement & Compliance

* **Actor:** Junior Consultant (**Dr. Dheeraj**).
* **Action:** Manages the penalties ledger for the case. He reviews auto-derived seat reductions and adds any manual penalties (such as monetary fines for ghost faculty or teacher code revocations). He updates payment/compliance status.
* **Output:** When all penalties are resolved, the case compliance header automatically updates to `complied`.

---

## 4. Key Official Documents Generated

The system contains an automated **Letter Template Engine** (`letter.service.js`) that produces official NCISM-formatted PDF drafts. These drafts populate automatically from case data:

| Document Type | Triggers on State / Action | Source Data Included |
|---|---|---|
| **Clarification Letter** | Board requests clarification (`clarification_open`) | List of shortcomings extracted from the report, signatory info, and college contact details. |
| **Hearing Notice** | President schedules hearing (`hearing_scheduled`) | Shortcomings list, hearing committee panel, date/time, and instructions. |
| **Final Order** | Secretariat dispatches order (`closed`) | Board's final outcome decision, approved seats count, applied penalties, and relevant regulations. |

Every issued letter, the **Assessment Report**, and confirmed **meeting minutes** are **downloadable as Markdown, PDF, or Word (.docx)** (generated client-side from the stored markdown). The uploaded visitation report is served back for an in-app **PDF viewer** (case → **Documents** tab) and a one-click **Visitor Report** download via `GET /applications/:id/source.pdf` (`application:read`).

> **Access:** login supports optional **TOTP MFA** (Settings → Two-factor → 6-digit step-up). The `college.ayu0038@ncism.local` account (password `Password123`) is seeded so this case's clarification/hearing cycle can be driven end-to-end.

Below are the Mermaid diagrams explaining the reporting structure and workflow for the **Gaur Brahmin Ayurvedic College & Hospital (AYU0038)** case:

---

### 1. User Hierarchy & Allotment Scoping

Since `AYU0038` is an **Ayurveda** college in **Haryana**, the case is routed to **Dr. Dheeraj** (Junior Consultant allotted to Haryana). 

Here is the Mermaid code for the hierarchy:
```mermaid
graph TD
    classDef roles fill:#efe9de,stroke:#e6dfd8,stroke-width:1px,color:#141413;
    classDef apex fill:#cc785c,stroke:#cc785c,stroke-width:1px,color:#ffffff;
    
    President["President<br/>(Dr. Mukul Patel)"]:::apex
    BM2["Board Member (Team 2)<br/>(Dr. Sushrut Kanaujia)"]:::roles
    SC2["Senior Consultant<br/>(Dr. Kritika)"]:::roles
    JC_Dheeraj["Junior Consultant (Dealing Staff)<br/>(Dr. Dheeraj)<br/><i>Allotted: Haryana (Ayurveda)</i>"]:::roles
    
    BM1["Board Member (Team 1)<br/>(B. L. Mehra)"]:::roles
    SC1["Senior Consultant<br/>(Dr. Gaurav Bhandari)"]:::roles
    JC_Others1["Team 1 Juniors<br/>(Smarnika, Sunil, Tanya, etc.)"]:::roles
    
    President --> BM1
    President --> BM2
    BM1 --> SC1
    BM2 --> SC2
    SC1 --> JC_Others1
    SC2 --> JC_Dheeraj
    
    style President font-weight:bold;
    style BM2 font-weight:bold;
    style SC2 font-weight:bold;
    style JC_Dheeraj font-weight:bold;
```

---

### 2. End-to-End Case Workflow (Case `AYU0038`)

This diagram maps out how the regulatory report/case flows from the initial upload by a visitor, through the automated parsing engine (OpenDataLoader + CDM), maker-checker submissions, decision branches (Clarification/Hearings), structured board decisions, meeting agendas, and penalty monitoring.

Here is the Mermaid code for the workflow:
```mermaid
flowchart TD
    %% Styling definitions
    classDef visitor fill:#efe9de,stroke:#e6dfd8,color:#141413;
    classDef junior fill:#cc785c,stroke:#cc785c,color:#ffffff;
    classDef senior fill:#efe9de,stroke:#e6dfd8,color:#141413;
    classDef board fill:#efe9de,stroke:#e6dfd8,color:#141413;
    classDef college fill:#efe9de,stroke:#e6dfd8,color:#141413;
    classDef system fill:#181715,stroke:#181715,color:#faf9f5;
    classDef terminal fill:#181715,stroke:#cc785c,stroke-width:2px,color:#faf9f5;

    %% Workflow Nodes
    Start([1. Start: PDF Report Ready])
    
    VisitorUploader["<b>Visitor</b> (visitor@ncism.local)<br/>Uploads AYU0038 PDF Report"]:::visitor
    UploadedState{"State: <b>uploaded</b>"}
    
    JuniorProcess["<b>Junior Consultant</b> (Dr. Dheeraj)<br/>Allotted Haryana/Ayurveda<br/>Clicks 'Process'"]:::junior
    
    subgraph AsyncPipeline ["Async Processing Engine (pg-boss Worker)"]
        OpenDataLoader["1. OpenDataLoader CLI<br/>(Extract PDF to element JSON)"]:::system
        CDM["2. CDM Builder Stage<br/>(Assemble section tree & normal tables)"]:::system
        Rules["3. Rule Evaluator & Punitive Policy<br/>(Compute threshold & staff penalties)"]:::system
        Reporter["4. Assessment Report Template<br/>(Generate MARB report JSON)"]:::system
        
        OpenDataLoader --> CDM --> Rules --> Reporter
    end
    
    ProcessedState{"State: <b>processed</b>"}
    
    JuniorSubmit["<b>Dr. Dheeraj</b> (Junior)<br/>Reviews findings, clicks 'Submit'"]:::junior
    SeniorReviewState{"State: <b>senior_review</b>"}
    
    SeniorForward["<b>Senior Consultant</b> (Dr. Kritika)<br/>Forwards to Board"]:::senior
    BoardReviewState{"State: <b>board_review</b>"}
    
    BoardDecide["<b>Board Member</b> (Dr. Sushrut Kanaujia)<br/>Reviews case & details"]:::board
    
    %% Branches from Board Review
    ClarificationBranch["<b>Option A: Clarification Cycle</b>"]
    ClarifyState{"State: <b>clarification_open</b>"}
    CollegeRespond["<b>College User</b> (college.ayu0038@ncism.local)<br/>Submits Response + Proofs"]:::college
    ResponseSubmitted{"State: <b>clarification_responded</b>"}
    
    HearingBranch["<b>Option B: Hearing</b>"]
    HearingReq{"State: <b>hearing_requested</b>"}
    PresidentAppoint["<b>President</b> (Dr. Mukul Patel)<br/>Appoints Hearing Committee & Date"]:::board
    HearingSched{"State: <b>hearing_scheduled</b>"}
    CommitteeMinutes["<b>Hearing Committee</b> (hearing1 & hearing2)<br/>Conducts hearing & records minutes"]:::visitor
    
    %% Outcomes
    BoardApprove["<b>Board Member</b> (Dr. Sushrut Kanaujia)<br/>Clicks 'Approve' & selects structured outcome"]:::board
    ApprovedState{"State: <b>approved</b>"}
    
    SecretariatMeeting["<b>Secretariat</b> (secretariat@ncism.local)<br/>Schedules Board Meeting & adds case to agenda"]:::senior
    FinalOrder["<b>Secretariat</b> reviews auto-drafted Final Order<br/>Clicks 'Dispatch'"]:::senior
    ClosedState([State: <b>closed</b>]):::terminal
    
    ComplianceLedger["<b>Dr. Dheeraj</b> (Junior)<br/>Logs manual penalties & tracks payments"]:::junior
    CompliedState([Compliance: <b>complied</b>]):::terminal

    %% Connections
    Start --> VisitorUploader
    VisitorUploader --> UploadedState
    UploadedState -->|Dr. Dheeraj owns case| JuniorProcess
    JuniorProcess --> AsyncPipeline
    Reporter --> ProcessedState
    ProcessedState --> JuniorSubmit
    JuniorSubmit --> SeniorReviewState
    SeniorReviewState -->|Dr. Kritika reviews| SeniorForward
    SeniorForward --> BoardReviewState
    
    %% Board Options
    BoardReviewState --> ClarificationBranch
    ClarificationBranch -->|"Request Clarification<br/>(Auto-drafts Clarification Letter)"| ClarifyState
    ClarifyState --> CollegeRespond
    CollegeRespond --> ResponseSubmitted
    ResponseSubmitted -->|Returns to Dr. Dheeraj| JuniorSubmit
    
    BoardReviewState -->|Request Hearing| HearingBranch
    HearingBranch --> HearingReq
    HearingReq --> PresidentAppoint
    PresidentAppoint -->|Auto-drafts Hearing Notice| HearingSched
    HearingSched --> CommitteeMinutes
    CommitteeMinutes -->|Minutes submitted| BoardReviewState
    
    BoardReviewState -->|Decide Case| BoardApprove
    BoardApprove -->|Pre-seeded punitive outcome| ApprovedState
    
    ApprovedState -->|Auto-derives seat reductions| SecretariatMeeting
    SecretariatMeeting --> FinalOrder
    FinalOrder -->|Dispatches Final Order Letter| ClosedState
    
    ApprovedState -->|Initiates Compliance Monitoring| ComplianceLedger
    ComplianceLedger -->|All penalties paid/waived| CompliedState

    %% Styling
    style Start fill:#faf9f5,stroke:#141413,color:#141413;
    style ClosedState fill:#181715,stroke:#cc785c,color:#faf9f5;
    style CompliedState fill:#181715,stroke:#cc785c,color:#faf9f5;
```