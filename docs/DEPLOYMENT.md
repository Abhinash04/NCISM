# Deployment Guide — NCISM Assessment Portal

> **⚠️ Scope (TCS boundary):** the 20–50pp Regulatory Report is **TCS-generated**; the platform starts at report receipt (production: TCS API; interim: Visitor manual upload). The **bundled OpenDataLoader CLI stays** — it processes the *received* report PDF. When the TCS API delivers pre-structured data instead of a PDF, revisit whether the CLI is still needed.

Single Docker host. Three services via `docker-compose.prod.yml`:

```
Internet ─▶ frontend (nginx :80)  ──proxy /api/v1──▶  backend (Node + pg-boss worker + bundled
                │  serves the built SPA                 opendataloader-pdf CLI: JRE 17 + Python)
                                                                     │
                                                            db (postgres:16)
```

The browser only ever calls `/api/v1` (same origin) — nginx proxies it to the backend, so **no CORS
config is required**. The backend spawns the extraction CLI **inside its own container** (fast mode,
native Java engine — no Docling, no GPU).

---

## 1. Prerequisites (on the VPS)

- Docker Engine + Compose v2 (`docker compose version`).
- A domain pointed at the host (for TLS).
- ~2 GB RAM free for the backend JVM (20–50-page PDFs).

## 2. Configure environment

```bash
git clone <repo> && cd NCISM
cp backend/.env.production.example backend/.env.production
```

Edit `backend/.env.production` and set:

| Var | Set to |
|---|---|
| `JWT_SECRET` | `openssl rand -hex 48` output (**required** — never keep the placeholder) |
| `POSTGRES_PASSWORD` + the password inside `DATABASE_URL` | the same strong password |
| `CORS_ORIGIN` | `https://your-domain` |

Leave `OPENDATALOADER_CLI_PATH=/opt/odl/bin/opendataloader-pdf` (matches the image),
`EXTRACTION_MODE=fast`, and `KEEP_JOBS=true` (keeps uploaded reports so the in-app PDF viewer /
Documents tab keeps working for older cases).

`backend/.env.production` and `frontend/.env.production` are git-ignored — only the `*.example`
templates are committed.

## 3. Build

```bash
docker compose -f docker-compose.prod.yml build
```

### ⚠ Verify the extraction CLI (do this once)

The backend image installs `opendataloader-pdf` from PyPI, which is expected to ship the built Java
JAR. Confirm it actually runs:

```bash
docker compose -f docker-compose.prod.yml run --rm --no-deps backend /opt/odl/bin/opendataloader-pdf --help
```

- **Prints usage** → good, extraction will work.
- **Errors about a missing JAR / class** → the PyPI wheel didn't bundle the JAR. Build it from source
  and copy it in: add a first stage to `backend/Dockerfile`
  ```dockerfile
  FROM maven:3-eclipse-temurin-17 AS odljar
  RUN git clone https://github.com/opendataloader-project/opendataloader-pdf.git /src \
      && cd /src/java && mvn -q -DskipTests package
  # …then COPY --from=odljar the built JAR to where the Python wrapper expects it
  ```
  (see the upstream README "Build the Java CLI" for the JAR path), rebuild, and re-verify.

## 4. Database — migrate (and decide on seeds)

Start Postgres and run migrations:

```bash
docker compose -f docker-compose.prod.yml up -d db
docker compose -f docker-compose.prod.yml run --rm backend npm run db:migrate
```

**Seeds carry demo credentials.** `npm run db:seed` inserts the bootstrap admin **plus** demo org /
college users with the shared password `Password123` (seeds 002/005/009 …). For a real deployment:

- To stand up a demo/UAT box with all the sample data: `... run --rm backend npm run db:seed`, then
  **rotate every password immediately**.
- For a clean production DB: run only the admin bootstrap you need and create real users through the
  admin UI. Do **not** run the full seed set unchanged.

pg-boss creates and manages its own `pgboss` schema in this same database automatically — no separate
step.

## 5. Launch

```bash
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml logs -f backend
```

Healthy startup logs show `Database connection OK` and `Worker listening on "case-process".`

## 6. Verify end-to-end

- `curl http://<host>/api/v1/health` → `200`.
- Open `http://<host>/` → SPA loads, login works.
- Upload a sample report → the case reaches **processed** (proves the bundled CLI ran inside the
  container).
- `docker compose -f docker-compose.prod.yml restart backend` → queued/in-flight jobs still settle
  (pg-boss state is persisted in Postgres).

## 7. TLS (production)

The compose file exposes plain `:80`. Terminate TLS with one of:

- **Caddy / Traefik** in front (automatic Let's Encrypt) — add it as a compose service proxying to
  `frontend:80`, or
- **certbot + nginx** on the host.

Then point `CORS_ORIGIN` at the `https://` origin and redirect `:80 → :443`.

## 8. Operations

- **Logs:** `docker compose -f docker-compose.prod.yml logs -f <service>`.
- **DB backup:** `docker exec ncism-db pg_dump -U ncism ncism > backup.sql`.
- **Update:** `git pull && docker compose -f docker-compose.prod.yml up -d --build`
  (re-run `npm run db:migrate` if new migrations landed).
- **Volumes:** `ncism_pgdata` (database) and `ncism_jobs` (uploaded reports + job artifacts) — include
  both in your backup routine.

---

# Alternative: split deploy — Vercel (frontend) + Render (backend + Postgres)

Fully managed, no VPS. **The backend still cannot run on Vercel** (it spawns the Java/Python CLI as a
subprocess, runs a long-lived pg-boss worker, and needs a persistent disk) — it goes on Render as a
Docker service. Frontend and backend are now **different origins**, so:

- Frontend `VITE_API_URL` = the **absolute** backend URL (`https://<svc>.onrender.com/api/v1`).
- Backend `CORS_ORIGIN` = the **Vercel domain** (`https://<app>.vercel.app`) — CORS is now enforced.

Files for this path: [render.yaml](../render.yaml) (backend + managed Postgres blueprint) and
[frontend/vercel.json](../frontend/vercel.json) (SPA build + routing). The same
[backend/Dockerfile](../backend/Dockerfile) is reused unchanged.

### Backend + DB on Render
1. Dashboard → **New → Blueprint** → select this repo. `render.yaml` provisions the Docker web
   service (`plan: standard` for JVM headroom), a 5 GB **Disk** at `/app/temp`, and a managed
   **Postgres** — with `DATABASE_URL` wired and `JWT_SECRET` auto-generated.
2. In the backend service's **Environment** tab set `CORS_ORIGIN=https://<your-app>.vercel.app`.
3. `preDeployCommand: npm run db:migrate` runs migrations on each release automatically. Seeds are
   **not** run — create real users via the admin UI (or run `npm run db:seed` once from the Render
   shell for a demo box, then rotate `Password123`).
4. Note the backend URL, e.g. `https://ncism-backend.onrender.com`.

### Frontend on Vercel
1. **New Project** → import this repo → set **Root Directory = `frontend`** (project setting; Vercel
   picks up `vercel.json` there).
2. Env var `VITE_API_URL = https://ncism-backend.onrender.com/api/v1`. Deploy.
3. Once the Vercel domain is known, make sure the backend's `CORS_ORIGIN` matches it exactly
   (scheme + host, no trailing slash), then redeploy the backend.

### Verify (split)
- `curl https://<backend>.onrender.com/api/v1/health` → `200`.
- Open the Vercel URL → login works, no CORS errors in the browser console.
- Upload a sample report → case reaches **processed** (bundled CLI ran on Render).

### Notes / gotchas
- **Render free tier has no disk and sleeps** — uploaded PDFs would vanish. Use a paid instance with
  the disk (the blueprint assumes this).
- **Cold JVM**: first extraction after idle is slower (JVM + Java engine warm-up).
- Managed Neon/Supabase Postgres also works — just point `DATABASE_URL` at it instead of the Render DB.

---

## Constraints

- **Single backend instance.** The pg-boss worker runs in-process and uploads live on a local volume,
  so you cannot horizontally scale the backend without shared object storage + an external queue.
  One VPS is the supported topology.
- **Fast mode only.** Scanned/borderless PDFs that need the Docling hybrid backend are out of scope
  for this deployment (would add a GPU-class ML service on `:5002`).
