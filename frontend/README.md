# NCISM Portal — Frontend

React 19 + Vite SPA for the MARB-ISM assessment portal. Role-prefixed routing (`/:role/*`),
TanStack Query for server state, shadcn/ui + Tailwind for UI. Talks to the backend API at
`/api/v1` (Bearer access token + silent refresh).

See the repo root **[README.md](../README.md)** for the full-stack setup, and
**[../HANDOFF.md](../HANDOFF.md)** / **[../demo.md](../demo.md)** for architecture and a
follow-along walkthrough.

## Prerequisites

- **Node.js 20+**
- The **backend API running on `http://localhost:3000`** (see the root README) — the SPA is useless
  without it (login, cases, reports all hit the API).

## Setup

```bash
npm install
```

Create `frontend/.env` pointing at the local API:

```
VITE_API_URL=http://localhost:3000/api/v1
```

## Commands

```bash
npm run dev      # Vite dev server + HMR on http://localhost:5173
npm run build    # production build → dist/
npm run preview  # serve the production build locally
npm run lint     # eslint
```

Log in with a mock account from **[../AuthCred.md](../AuthCred.md)** (org/portal users `Password123`,
admin `Admin123`).

## Structure

```
src/
  app/          router, layouts (DashboardLayout nav is role-driven), providers
  features/     one folder per domain (api + hooks): auth, applications, meetings,
                audit, compliance, institutions, reports, …
  pages/        route screens grouped by domain
  components/ui shadcn/ui primitives + local widgets (BarList, Tabs, …)
  lib/          apiClient (axios + refresh), utils
```

The dashboard nav and every case action bar are **driven by the backend** (permissions +
`allowed-actions`) — there are no role literals gating UI actions, so RBAC stays server-authoritative.
