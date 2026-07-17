# NCISM Assessment Portal

Internal review/validation web portal for the **Medical Assessment and Rating Board (MARB-ISM)** of
the National Commission for Indian System of Medicine. It wraps a governed, role-based case workflow
around a deterministic document-processing + assessment engine: a visitor uploads a college
inspection report (PDF), the assigned dealing staff runs extraction + a MARB-format compliance
assessment against the NCISM MESAR regulations, and the case moves through review → clarification →
hearing → board decision → official letters/orders → compliance monitoring → closure.

**Built through Phase 5a** (13 roles, full post-visitation lifecycle, official letter/order
generation, audit log, compliance/penalty ledger). Deep docs: **[HANDOFF.md](HANDOFF.md)** (cold-start
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
- **Java 11+** and the [OpenDataLoader-PDF](https://github.com/opendataloader-project/opendataloader-pdf)
  CLI (installed via pip; wraps the Java core) — only needed to *process* an uploaded report.

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

Wipe **everything** (all cases, penalties, letters, users, and the seeded data) and start fresh —
this also gives every mock user the same password again (`Password123`):

```bash
docker compose down -v         # deletes the Postgres volume
docker compose up -d db
cd backend && npm run db:setup
```

### Clear uploaded artifacts (without wiping the DB)

Visitor-uploaded case PDFs and the extraction job workspace live on disk (gitignored). To reclaim
space or clear test uploads while keeping the database:

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

Golden fixtures: `backend/tests/fixtures/` — three real colleges (AYU0659/AYU0265/AYU0038) with
hand-verified parameters + expected reports.

## Extraction modes

`EXTRACTION_MODE` in `backend/.env` selects the pipeline:

- **`fast` (default)** — native OpenDataLoader Java engine. Benchmarked on AYU0659: 3.2s, 20/20 pages,
  32/32 assessment parameters. Calibrated for born-digital NCISM reports; every golden test is keyed
  to this output.
- **`hybrid`** — routes complex pages through the Docling AI backend (scanned/borderless docs). Needs
  the Docling server on :5002. Slower and lower-fidelity on standard NCISM reports; re-validate with
  `npm run check:benchmark` before enabling.

> Only the **Ayurveda-UG** ruleset ships today, so `Process` (and the punitive figures/letters that
> depend on it) works for Ayurveda cases; non-Ayurveda cases upload and route fine but fail to process
> until their rulesets are added.

## API (`/api/v1`)

| Group | Endpoints |
| --- | --- |
| Health | `GET /health` |
| Auth | `POST /auth/{login,refresh,logout}` · `GET /auth/me` |
| Institutions | `GET /institutions[/meta/:id]` · `POST /institutions[/import]` · `PATCH /institutions/:id` |
| Admin | `GET /admin/{users,users/:id,roles,permissions}` |
| Cases | `GET /applications[/:id]` · `POST /applications` (visitor upload) · `/:id/{allowed-actions,events,hearings,clarifications,letters}` |
| Case transitions | `POST /applications/:id/{process,submit,review,decide,revise,request-hearing,appoint-committee,hearing/minutes,dispatch}` · `POST /:id/clarification[/respond]` |
| Compliance | `GET/POST /applications/:id/penalties` · `GET /penalties` · `PATCH /penalties/:id` |
| Meetings | `GET/POST /meetings` · `GET /meetings/:id` · `POST /meetings/:id/{items,confirm}` |
| Audit | `GET /audit` |
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
