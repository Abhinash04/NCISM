# Auth Credentials — Development / Testing Only

> ⚠️ **MOCK credentials for the development phase only.** These are placeholders seeded by
> `backend/src/db/seeds/005_org_users.js` (org users) and `002_bootstrap_admin.js` (admin).
> Replace with real credentials before any non-local deployment. **Do not commit real secrets.**
> Consider adding `AuthCred.md` to `.gitignore`.

**Login:** frontend `/login` (or `POST /api/v1/auth/login` with `{ "email", "password" }`).
After login each user lands on their role-scoped landing route.

- Org-user password: `Password123` (override with `MOCK_PASSWORD` env before seeding)
- Admin password: `Admin123` (override with `ADMIN_PASSWORD` env before seeding)

---

## President (`president`) — landing `/president/dashboard`

| Name            | Email                   | Password      |
| --------------- | ----------------------- | ------------- |
| Dr. Mukul Patel | `president@ncism.local` | `Password123` |

## Board Members (`board_member`) — landing `/board_member/dashboard`

| Name                 | Email                         | Password      | Reports to |
| -------------------- | ----------------------------- | ------------- | ---------- |
| B. L. Mehra          | `member.mehra@ncism.local`    | `Password123` | President  |
| Dr. Sushrut Kanaujia | `member.kanaujia@ncism.local` | `Password123` | President  |

## Senior Consultants (`senior_consultant`) — landing `/senior_consultant/dashboard`

| Name                | Email                         | Password      | Reports to           | Supervises team |
| ------------------- | ----------------------------- | ------------- | -------------------- | --------------- |
| Dr. Gaurav Bhandari | `gaurav.bhandari@ncism.local` | `Password123` | B. L. Mehra          | Team-1          |
| Dr. Kritika         | `kritika@ncism.local`         | `Password123` | Dr. Sushrut Kanaujia | Team-2          |

## Junior Consultants / Dealing Staff (`junior_consultant`) — landing `/junior_consultant/dashboard`

Allotment = the system(s) × states this user is routed cases for (`staff_allotments`).

| Name            | Email                     | Password      | Supervisor      | System(s)          | # states          |
| --------------- | ------------------------- | ------------- | --------------- | ------------------ | ----------------- |
| Dr. Sunil       | `sunil@ncism.local`       | `Password123` | Gaurav Bhandari | ayurveda           | 9                 |
| Dr. Tanya       | `tanya@ncism.local`       | `Password123` | Gaurav Bhandari | ayurveda           | 9                 |
| Dr. Smarnika    | `smarnika@ncism.local`    | `Password123` | Gaurav Bhandari | ayurveda           | 1 (Maharashtra)   |
| Dr. Akshay      | `akshay@ncism.local`      | `Password123` | Gaurav Bhandari | ayurveda           | 1 (Maharashtra)   |
| Dr. Shubhangi   | `shubhangi@ncism.local`   | `Password123` | Gaurav Bhandari | ayurveda           | 1 (Karnataka)     |
| Dr. Mitali      | `mitali@ncism.local`      | `Password123` | Gaurav Bhandari | ayurveda           | 1 (Karnataka)     |
| Dr. Pooja       | `pooja@ncism.local`       | `Password123` | Kritika         | ayurveda           | 8                 |
| Dr. Divesh Rana | `divesh.rana@ncism.local` | `Password123` | Kritika         | ayurveda           | 8                 |
| Dr. Dheeraj     | `dheeraj@ncism.local`     | `Password123` | Kritika         | ayurveda           | 6                 |
| Dr. Ritu Saini  | `ritu.saini@ncism.local`  | `Password123` | Kritika         | ayurveda           | 1 (Uttar Pradesh) |
| Dr. Abdulla     | `abdulla@ncism.local`     | `Password123` | Kritika         | unani              | 16 (nationwide)   |
| Dr. Steave      | `steave@ncism.local`      | `Password123` | Kritika         | siddha, sowa_rigpa | 8 (nationwide)    |

## Administrator (`admin`) — landing `/admin/users`

| Name          | Email               | Password   |
| ------------- | ------------------- | ---------- |
| Administrator | `admin@ncism.local` | `Admin123` |

Admin console: `/admin/institutions` (registry), `/admin/institutions/import`, `/admin/users`,
`/admin/roles`, `/admin/permissions`.

---

## Notes

- **Reporting chain:** President → Board Members → Senior Consultants → Junior Consultants
  (`users.supervisor_id`). Team-1 = Sunil, Tanya, Smarnika, Akshay, Shubhangi, Mitali (→ Gaurav);
  Team-2 = Pooja, Divesh Rana, Dheeraj, Ritu Saini, Abdulla, Steave (→ Kritika).
- **Permissions:** analyst-equivalent for juniors; senior gets read/update review scope; board
  members/president get approve/finalize; admin manages users/roles/master data. Fine-grained
  lifecycle permissions (hearings, letters, board meetings) arrive in Phase 3.
- **Re-seed:** `cd backend && npm run db:setup` (idempotent — safe to re-run).
- **Change the mock password globally:** set `MOCK_PASSWORD` before seeding, e.g.
  `MOCK_PASSWORD='YourPass1!' npm run db:seed`.
