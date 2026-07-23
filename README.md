# NCISM Assessment Portal

Internal review/validation web portal for the **Medical Assessment and Rating Board (MARB-ISM)** of
the National Commission for Indian System of Medicine. It wraps a governed, role-based case workflow
around a deterministic document-processing + assessment engine.

> **⚠️ Scope (TCS boundary).** The **20–50-page Regulatory/Assessment Report is generated externally by TCS** (TCS runs the visitation). This platform's boundary **begins at report receipt** — production intake is the **TCS API**; until it exists, the **Visitor-portal manual upload is a temporary workaround**, not the production architecture. The engine and downstream workflow below are unchanged.

The platform **receives the TCS-generated Regulatory Report** (production: TCS API; interim: a visitor
manually uploads the report PDF), the assigned dealing staff runs extraction + a MARB-format compliance
assessment against the NCISM MESAR regulations, and the case moves through review → clarification →
hearing → board decision → official letters/orders → compliance monitoring → closure.

**Built through Phase 6** (13 roles, full post-visitation lifecycle, official letter/order
generation, audit log, compliance/penalty ledger, reports/analytics, multi-ruleset registry +
activation, async processing worker, TOTP MFA). Deep docs: **[HANDOFF.md](HANDOFF.md)** (cold-start
handoff), **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** (as-built reference),
**[docs/INTERNAL-PORTAL-BLUEPRINT.md](docs/INTERNAL-PORTAL-BLUEPRINT.md)** (design blueprint/roadmap),
**[demo.md](demo.md)** (follow-along walkthrough), **[AuthCred.md](AuthCred.md)** (mock logins).

## Stack

- **Backend** — Node.js / Express (`backend/`): clean architecture (routes → controllers → services →
  repositories), **PostgreSQL via Knex** (auth/RBAC + institutions + the case lifecycle), JWT auth,
  the staged extraction engine (OpenDataLoader-PDF CLI + optional Docling hybrid) and the
  deterministic assessment engine (rules-as-data). API prefix `/api/v1`, port **3000**.
- **Frontend** — React 19 + Vite (`frontend/`): TanStack Query, shadcn/ui + Tailwind, role-prefixed
  routing (`/:role/*`). Port **5173**.
- **Database** — PostgreSQL 16 via `docker-compose.yml`.

## Roles & lifecycle (short)

13 roles: `president`, `board_member`, `senior_consultant`, `junior_consultant` (dealing staff),
`visitor`, `college`, `hearing_committee`, `secretariat`, `commission_observer`, `admin` (+ retained
`reviewer`/`analyst`/`viewer`). Case states: `uploaded → processing → processed → under_validation →
senior_review → board_review → approved → closed`, with `clarification_*` and `hearing_*` branches
and `rejected → revise`. The workflow guard (`backend/src/services/workflow.service.js`) decides
which action each role may take.

---

## Prerequisites

- **Node.js 20+**
- **Docker Desktop** (for PostgreSQL) — running
- **Java 11+** and the [OpenDataLoader-PDF](https://github.com/opendataloader-project/opendataloader-pdf) CLI (installed via pip; wraps the Java core) — only needed to *process* an uploaded report.

## One-time setup

```bash
# 1. Backend env — set OPENDATALOADER_CLI_PATH if the CLI is not at the default Windows path
cd backend
cp .env.example .env          # ensure DATABASE_URL points at the docker Postgres; set JWT_SECRET

# 2. Frontend env — point the SPA at the local API
cd ../frontend
# frontend/.env must contain:  VITE_API_URL=http://localhost:3000/api/v1

# 3. Install deps
cd ../backend  && npm install
cd ../frontend && npm install
```

## Database

Run from the **repo root** for docker, and from `backend/` for the `db:*` scripts.

```bash
docker compose up -d db        # start PostgreSQL 16 on :5432
cd backend
npm run db:setup               # migrate + seed (idempotent) → 672 institutions, ~27 mock users
```

Other DB scripts (`backend/`):

```bash
npm run db:migrate             # run pending migrations only
npm run db:seed                # re-run seeds (idempotent)
npm run db:rollback            # roll back the last migration batch
```

### Clean / reset the database

Wipe **everything** (all cases, penalties, letters, users, and the seeded data) and start fresh — this also gives every mock user the same password again (`Password123`):

```bash
docker compose down -v         # deletes the Postgres volume
docker compose up -d db
cd backend && npm run db:setup
```

### Clear uploaded artifacts (without wiping the DB)

Visitor-uploaded case PDFs and the extraction job workspace live on disk (gitignored). To reclaim space or clear test uploads while keeping the database:

```bash
rm -rf backend/data/applications/*   # raw uploaded case report PDFs
rm -rf backend/temp/*                # extraction job workspaces (input.pdf, artifacts)
```

(These directories are re-created automatically on the next upload/process.)

## Run the app

Two terminals (a third only for `EXTRACTION_MODE=hybrid`):

| Terminal | Command (cwd) | Service | Port |
| --- | --- | --- | --- |
| 1 | `npm run dev` (`backend/`) — or `npm start` | Backend API | 3000 |
| 2 | `npm run dev` (`frontend/`) | Frontend (Vite) | 5173 |
| 3 | `opendataloader-pdf-hybrid --port 5002` | Docling hybrid | 5002 (hybrid only) |

```bash
# Terminal 1
cd backend && npm run dev      # wait for: [Server] Backend listening at http://localhost:3000

# Terminal 2
cd frontend && npm run dev     # open http://localhost:5173
```

Log in with a mock account from **[AuthCred.md](AuthCred.md)** (org/portal users: `Password123`;
admin: `Admin123`). Follow **[demo.md](demo.md)** to walk the whole lifecycle by hand.

```bash
cd frontend && npm run build   # production build
cd frontend && npm run lint    # eslint
```

## Tests & checks

```bash
cd backend
npm test                       # golden assessment + extractor + reconstruction regression suites (does not need the DB)
npm run check:extraction       # full extraction pipeline on a sample PDF (accepts a path arg)
npm run check:assessment       # assessment engine on golden params or a markdown file
npm run check:benchmark        # fast-vs-hybrid extraction benchmark on the AYU0659 sample
```

Golden fixtures: `backend/tests/fixtures/` — three real colleges (AYU0659/AYU0265/AYU0038) with hand-verified parameters + expected reports.

# OpenDataLoader-PDF Local Setup Guide (Windows)

This guide explains how to set up and run the OpenDataLoader-PDF project from source on a Windows machine. Follow the steps in the given order. Once completed successfully, you will be able to run both the Java CLI and the Hybrid (Docling Fast Server) backend locally.

---

# Prerequisites

Before starting, ensure the following software is installed:

* Git
* Python 3.13 (or the project-supported Python version)
* JDK 17 or later
* Apache Maven
* Visual Studio Build Tools (recommended for Python native packages)
* NVIDIA CUDA Toolkit (optional, only if GPU acceleration is required)

Verify the installations:

```powershell
git --version
python --version
java -version
javac -version
mvn -version
```

All commands should execute successfully before proceeding.

---

# Clone the Repository

Clone the repository and navigate to the project.

```powershell
git clone https://github.com/opendataloader-project/opendataloader-pdf.git

cd opendataloader-pdf
```

The repository structure should look similar to:

```text
opendataloader-pdf/
│
├── java/
│   ├── opendataloader-pdf-cli/
│   ├── opendataloader-pdf-core/
│   └── pom.xml
│
├── python/
│   └── opendataloader-pdf/
│
└── node/
```

---

# Build the Java CLI

The Python package depends on the Java CLI JAR. Therefore, the Java project must be built before installing the Python package.

Navigate to the Java folder:

```powershell
cd java
```

Build the project:

```powershell
mvn clean package -DskipTests
```

After the build completes successfully, verify that the following file exists:

```text
java/
└── opendataloader-pdf-cli/
    └── target/
        └── opendataloader-pdf-cli-0.0.0.jar
```

If the JAR is missing, do not continue until the Java build succeeds.

---

# Install the Python Package

Navigate to the Python package.

```powershell
cd ../python/opendataloader-pdf
```

Install the base package:

```powershell
pip install -e .
```

Install the Hybrid dependencies:

```powershell
pip install -e ".[hybrid]"
```

This installs:

* OpenDataLoader-PDF CLI
* Hybrid Server
* Docling
* FastAPI
* Uvicorn
* OCR engines
* Required Python dependencies

---

# Configure Windows PATH

During installation, Windows installs the executables into the user's Python Scripts directory.

Typical location:

```text
C:\Users\<username>\AppData\Roaming\Python\Python313\Scripts
```

If this directory is not already present in the User PATH, add it.

PowerShell:

```powershell
$current = [Environment]::GetEnvironmentVariable("Path","User")
$new = $current + ";C:\Users\<username>\AppData\Roaming\Python\Python313\Scripts"
[Environment]::SetEnvironmentVariable("Path",$new,"User")
```

Close every PowerShell window and open a new terminal.

Verify:

```powershell
where opendataloader-pdf
where opendataloader-pdf-hybrid
```

Expected output:

```text
C:\Users\<username>\AppData\Roaming\Python\Python313\Scripts\opendataloader-pdf.exe

C:\Users\<username>\AppData\Roaming\Python\Python313\Scripts\opendataloader-pdf-hybrid.exe
```

---

# Verify the Installation

Verify the Java CLI:

```powershell
opendataloader-pdf --help
```

Verify the Hybrid Server:

```powershell
opendataloader-pdf-hybrid --help
```

If both commands display their respective help pages, the installation is complete.

---

# Start the Hybrid Server

Launch the Hybrid server.

For digital PDFs (recommended):

```powershell
opendataloader-pdf-hybrid --port 5002 --no-ocr
```

For scanned PDFs:

```powershell
opendataloader-pdf-hybrid --port 5002 --force-ocr
```

Typical startup logs:

```text
Loading plugin 'docling_defaults'

Registered ocr engines...

Starting Docling Fast Server...

Uvicorn running on:

http://0.0.0.0:5002
```

Keep this terminal running while processing documents.

---

# Extract a PDF Using Hybrid Mode

Open another terminal and run:

```powershell
opendataloader-pdf `
    --hybrid docling-fast `
    --hybrid-fallback `
    --format markdown `
    "<path-to-pdf>"
```

Example:

```powershell
opendataloader-pdf `
    --hybrid docling-fast `
    --hybrid-fallback `
    --format markdown `
    "D:\Documents\AYU0659.pdf"
```

---

# Recommended Configuration

For digitally generated PDFs (NCISM, ESIC, government reports, etc.):

```text
Hybrid Mode          : docling-fast
OCR                  : Disabled (--no-ocr)
Hybrid Fallback      : Enabled
Output Format        : Markdown
```

This configuration avoids unnecessary OCR while preserving document structure and improving performance.

---

# Common Issues and Solutions

### 1. README.md not found during installation

Error:

```text
README.md not found
```

Solution:

Ensure that `README.md` exists inside the Python package directory or update the `readme` path in `pyproject.toml`.

---

### 2. Could not find the JAR file

Error:

```text
Could not find the JAR file.
Please run 'mvn package'
```

Solution:

Build the Java project first:

```powershell
cd java

mvn clean package
```

---

### 3. 'opendataloader-pdf' is not recognized

Cause:

Python Scripts directory is not on PATH.

Solution:

Add:

```text
C:\Users\<username>\AppData\Roaming\Python\Python313\Scripts
```

to the User PATH and restart PowerShell.

---

### 4. Hybrid server not found

Verify:

```powershell
where opendataloader-pdf-hybrid
```

If not found, reinstall:

```powershell
pip install -e ".[hybrid]"
```

---

### 5. Maven not found

Verify:

```powershell
mvn -version
```

If Maven is missing, install Apache Maven and add its `bin` directory to the system PATH.

---

# Installation Checklist

A successful setup satisfies all of the following:

* Java installed
* Maven installed
* Java CLI builds successfully
* JAR file generated
* Python package installed
* Hybrid dependencies installed
* PATH configured
* `opendataloader-pdf --help` works
* `opendataloader-pdf-hybrid --help` works
* Hybrid server starts successfully
* Java CLI connects to the Hybrid server and extracts PDFs successfully

Once these checks pass, the local OpenDataLoader-PDF environment is fully configured and ready for development and document extraction.


## Extraction modes

`EXTRACTION_MODE` in `backend/.env` selects the pipeline:

- **`fast` (default)** — native OpenDataLoader Java engine. Benchmarked on AYU0659: 3.2s, 20/20 pages,
  32/32 assessment parameters. Calibrated for born-digital NCISM reports; every golden test is keyed
  to this output.
- **`hybrid`** — routes complex pages through the Docling AI backend (scanned/borderless docs). Needs
  the Docling server on :5002. Slower and lower-fidelity on standard NCISM reports; re-validate with
  `npm run check:benchmark` before enabling.

> Three **UG** rulesets are authored + active — **Ayurveda**, **Unani**, **Sowa-Rigpa** — so `Process`
> resolves and assesses cases for those systems. Siddha-UG and the PG levels have no active ruleset yet
> (`NO_ACTIVE_RULESET`). The parameter extractors are still tuned to the Ayurveda report layout, so live
> Unani/Sowa-Rigpa uploads mostly need manual verification until the extractors are tuned (Phase 7).

## API (`/api/v1`)

| Group | Endpoints |
| --- | --- |
| Health | `GET /health` |
| Auth | `POST /auth/{login,mfa/login,refresh,logout}` · `GET /auth/me` · `POST /auth/mfa/{enroll,verify,disable}` |
| Institutions | `GET /institutions[/meta/:id]` · `POST /institutions[/import]` · `PATCH /institutions/:id` |
| Admin | `GET /admin/{users,users/:id,roles,permissions}` |
| Cases | `GET /applications[/:id]` · `POST /applications` (visitor upload) · `/:id/{allowed-actions,events,hearings,clarifications,letters}` |
| Case transitions | `POST /applications/:id/{process,submit,review,decide,revise,request-hearing,appoint-committee,hearing/minutes,dispatch}` · `POST /:id/clarification[/respond]` |
| Compliance | `GET/POST /applications/:id/penalties` · `GET /penalties` · `PATCH /penalties/:id` |
| Meetings | `GET/POST /meetings` · `GET /meetings/:id` · `POST /meetings/:id/{items,confirm}` |
| Audit | `GET /audit` |
| Reports | `GET /reports/overview` · `GET /reports/export?dataset=cases\|penalties` (CSV) |
| Rulesets | `GET /rulesets[/:id]` · `POST /rulesets/:id/activate` `{boardRef}` |
| Extraction/Jobs | `POST /extract` · `GET /jobs/:id[/artifacts/:type]` · `POST /assessments` (engine run) |

Errors use `{ success:false, error:{ code, message } }`; codes include 401 (`NO_TOKEN`/`INVALID_TOKEN`),
403 (`ACTION_NOT_ALLOWED`/missing perm), 409 (`INSTITUTION_EXISTS`), 423 (`CASE_FINALIZED`).

## Repository map

```
backend/               Express API, engines, rulesets, Knex migrations/seeds
frontend/              React SPA (features/ + pages/ + app/)
docker-compose.yml     PostgreSQL 16
HANDOFF.md             cold-start developer handoff (as-built)
demo.md                follow-along verification walkthrough
AuthCred.md            mock login credentials (gitignored; dev only)
docs/ARCHITECTURE.md   authoritative architecture reference
docs/INTERNAL-PORTAL-BLUEPRINT.md   design blueprint + roadmap
docs/srs/              domain SRS suite (entities, workflows, roles, gap analysis)
All data/              source domain documents (regulations, filled reports, letter formats)
markdown/              extracted counterparts of All data/ + the master institute list
DESIGN.md              visual design system the frontend theme derives from
```
