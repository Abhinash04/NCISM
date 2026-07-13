# NCISM : National Commission for Indian System of Medicine

Welcome to the project! As a new Software Developer on this team, it is important to first understand the nature of the documents you are dealing with.

**Important Clarification:** The uploaded documents are **not Technical Software Requirements (SRS) or Architecture Documents**. Instead, they are **legal and regulatory frameworks, meeting minutes, and punitive policies** published by the **National Commission for Indian System of Medicine (NCISM)**.

However, by analyzing these business and regulatory documents, we can clearly infer the IT system you will be building. **You are likely developing an enterprise Compliance, Assessment, and Rating Web Portal** to digitize and automate the regulation of Ayurveda, Siddha, Unani, and Sowa-Rigpa (ASU&SR) medical colleges across India.

Here is the complete breakdown of the project from both business and technical perspectives, translated into software development concepts.

---

### 1. What the project is, why it exists, and the problem it solves

* **What it is:** An online regulatory and compliance portal for the Medical Assessment and Rating Board for Indian System of Medicine (MARBISM).
* **Why it exists:** The NCISM is legally mandated to ensure that colleges teaching traditional Indian medicine maintain "Minimum Essential Standards" (MESAR) regarding land, hospital beds, staff, and equipment.
* **The Problem it Solves:** Currently, assessing colleges involves massive manual paperwork, physical inspections, and complex calculations for penalties and ratings. This project automates the workflow for college applications, schedules physical/virtual inspections, tracks daily biometric attendance to prevent fraud (e.g., "ghost faculties"), and automates the approval, denial, or penalization process.

### 2. The Complete Business Workflow and User Journey

The core workflow is a state machine that tracks a college's journey from application to final approval/rating:

1. **Application Submission:** A Trust, Society, or University applies online to establish a new college, increase seats, or add Postgraduate (PG) courses.
2. **Scrutinization:** MARBISM staff scrutinize the application and submitted fees.
3. **Inspection/Visitation:** Assigned inspectors (Visitors) conduct physical, virtual, or hybrid inspections of the college. They verify infrastructure and upload photos/videos and reports to the portal.
4. **Assessment & Deficiencies Identification:** The Board assesses the visitor's report against the minimum standards. Discrepancies (e.g., missing OPD numbers, missing staff) are flagged.
5. **Hearing & Clarification:** If rectifiable shortcomings are found, the portal automatically triggers a "Hearing Letter" to the college. The college submits clarifications and evidence online.
6. **Board Decision:** The Hearing Committee reviews the clarification. The Board issues either a **Letter of Intent (LOI)**, a **Letter of Permission (LOP)**, or denies the application.
7. **Punitive Action:** If the college is existing but non-compliant, the system calculates seat reductions or monetary penalties (e.g., 25 Lakhs for "ghost faculty").
8. **Annual Rating:** Fully established colleges are rated (Grade A, B, C, or D) based on their compliance score.

### 3. User Roles and Their Responsibilities

* **Applicant / College Administrator:** Submits detailed forms (Form-A, B, C) regarding land, hospital equipment, and staff. Responsible for uploading real-time data and responding to clarification notices.
* **Inspector / Visitor:** Travels to the college or conducts virtual visits. Uses the system to fill out standard proformas, verifying actual availability against required standards, and uploads video/photo evidence.
* **Scrutiny Team / MARBISM Staff:** Performs initial document and fee verification.
* **Hearing Committee Member:** Reviews clarifications submitted by colleges and conducts virtual hearings.
* **Board President / Competent Authority:** Gives final approval for permissions, seat intake numbers, and signs off on punitive actions.

### 4. Business Requirements and Reasoning

* **Eradicate Fake Infrastructure:** The business strictly requires monitoring of "Ghost Faculty" (teachers physically absent but present on paper). *Reasoning:* To ensure quality education and patient safety.
* **Hospital Functionality:** Hospitals must prove they are actually treating patients. They must maintain specific student-to-bed ratios (e.g., 3:2) and minimum bed occupancy rates (e.g., 30%, 40%, or 60% depending on the program). *Reasoning:* Medical students need real clinical exposure.
* **Phase-wise Establishment:** New colleges are not granted permanent status immediately. They undergo a 4-year phase-wise establishment, requiring yearly "Renewal of Permission".

### 5. Functional and Non-Functional Requirements

**Functional Requirements:**

* **Dynamic Form Builder:** Ability to capture massive amounts of data (Form Part I to VII) including land survey numbers, GPS links, bank details, and staff lists.
* **Rating & Scoring Engine:** An automated calculator that assigns scores based on infrastructure and issues Grades (A: $\ge$ 75, B: 50-74, C: 25-49, D: $\le$ 24).
* **Penalty Calculator:** An algorithm to calculate intake seat reductions (e.g., reduce intake by 5% for every deficient teaching faculty, or 1 seat per 2 deficient hospital medical officers).
* **Payment Gateway:** Processing of Application fees, Visitation fees (up to 5 Lakhs), and Digitization fees.

**Non-Functional Requirements:**

* **Data Security & Storage:** Needs robust storage for inspection videos, photos, and legal documents.
* **Auditability:** Every change in college data or assessment status must be logged, as this is a legal/regulatory platform.

### 6. Technical Requirements, Architecture, & Integrations

* **Aadhaar Enabled Biometric Attendance System (AEBAS):** The portal *must* integrate with AEBAS to verify the daily physical attendance of teaching and non-teaching staff.
* **Hospital Management Information System (HMIS):** The system must interface with or mandate colleges to use HMIS software that aligns with the National Ayush Morbidity and Standardized Terminologies Electronic Portal (NAMASTE) and the ABHA (Ayushman Bharat Health Account) registry.
* **Virtual Visitation Integrations:** The platform must support or integrate with video conferencing tools and CCTV feeds for virtual/hybrid inspections.
* **Database:** A highly relational database (like PostgreSQL) will be required to map Colleges $\to$ Departments $\to$ Faculty $\to$ Hospital Beds $\to$ Inspection Reports.

### 7. Modules, Features, and Interactions

1. **Institution Profile Module:** Where colleges maintain their master data (GPS location, affiliation consent, hospital registration).
2. **Application Processing Module:** Manages the submission of new schemes (Establishment, Seat Increase, PG courses), processing fees, and tracking the application status.
3. **Inspection/Visitation Module:** A mobile-friendly or tablet-friendly module for Inspectors to use on-site to verify parameters and upload media.
4. **Hearing & Compliance Module:** A communication hub where MARBISM sends deficiency notices and colleges upload clarification PDFs.
5. **Punitive & Rating Engine:** Interacts with the Inspection Module data to automatically flag colleges for seat reduction or calculate their A, B, C, D rating.

### 8. Dev Team Responsibilities Per Module (Expected)

* **Frontend Team:** Build complex, multi-step wizards for the application forms. Build interactive dashboards for MARBISM officials to view data visualizations of college compliance.
* **Backend Team:** Build the workflow state machine (Draft $\to$ Scrutiny $\to$ Inspection $\to$ Hearing $\to$ Approved/Denied). Develop the penalty and rating algorithms.
* **Integration/API Team:** Handle the highly critical integrations with the Government AEBAS biometric system and the payment gateways (NEFT/RTGS processing).
* **Database/DevOps:** Ensure secure, scalable cloud storage for large media files (inspection videos) and ensure high availability during annual application deadlines.

### 9. Business Rules, Workflows, and State Transitions

* **State Transition Example:** *Under Consideration* $\to$ *Letter of Intent (LOI) Issued* $\to$ *Institution Under Establishment* $\to$ *Letter of Permission (LOP) Issued* $\to$ *Fully Established (after 3 renewals)*.
* **Strict Timelines:** If a compliance report is not submitted by the deadline (e.g., before 12:00 Noon on a specific date), the system must auto-flag the application for Denial.
* **Punitive Business Rules:**
  * Missing AEBAS implementation = 100% Denial of Permission.
  * Deficiency of 1 Librarian = Reduction of 1 seat.
  * Deficiency in Hospital functionality = Intake reduced by 30%.
  * If total calculated seat reduction > 50% = Complete Denial of Permission.

### 10. Missing or Ambiguous Requirements to Clarify with the Client

Since these documents are legal regulations and not technical specs, you should ask the Product Owner / Client the following technical questions:

1. **AEBAS & HMIS APIs:** Does the government already have open APIs for the Biometric and Hospital Management systems we need to integrate with, or do we need to build middleware?
2. **Existing Data Migration:** Are we migrating data from an older system (like the erstwhile Central Council for Indian Medicine), or are we starting with a fresh database?.
3. **Offline Capabilities:** Do the Inspectors need an offline mobile app for visitations in remote areas where internet might be poor, or is a responsive web application sufficient?
4. **Hosting & Compliance:** Because this involves government data and healthcare institutions, are there specific Indian government cloud hosting (MeitY/NIC) and security audit requirements (CERT-In) we must adhere to?

*By understanding that you are building a **Government Compliance and Regulatory Engine** rather than a standard commercial app, you will be perfectly positioned to design the database architecture, plan the API integrations, and start estimating the development effort.*
