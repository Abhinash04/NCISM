/**
 * Phase 6c — per-role RBAC / SoD end-to-end. Drives one Ayurveda case through the
 * full lifecycle against a running server, asserting at every gate that the WRONG
 * role/owner is denied (403 / 423) and only the RIGHT one may act. Run on demand:
 *
 *   1. backend up + DB seeded:  npm run db:setup && npm start   (or ASYNC_PROCESSING=false)
 *   2. node scripts/e2e-rbac.mjs
 *
 * Env: API_BASE (default http://localhost:3000/api/v1), E2E_PDF (default the
 * bundled AYU sample), INSTITUTE (default AYU0140 — Ayurveda/Maharashtra, the
 * demo college its seeded users line up with).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { db } = require('../src/db'); // resolve the institution UUID + clean up

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.API_BASE || 'http://localhost:3000/api/v1';
const INSTITUTE = process.env.INSTITUTE || 'AYU0140';
const PDF = process.env.E2E_PDF
  || path.resolve(__dirname, '../../All data/Part-3 colleges/AYU0659 100 intake capacity.pdf');
const PW = process.env.MOCK_PASSWORD || 'Password123';
const ADMIN_PW = process.env.ADMIN_PASSWORD || 'Admin123';

const U = {
  visitor: ['visitor@ncism.local', PW],
  smarnika: ['smarnika@ncism.local', PW],   // junior allotted Maharashtra → the owner
  sunil: ['sunil@ncism.local', PW],          // another junior → never the owner
  gaurav: ['gaurav.bhandari@ncism.local', PW], // senior, supervises smarnika
  kritika: ['kritika@ncism.local', PW],      // senior, does NOT supervise smarnika
  president: ['president@ncism.local', PW],
  mehra: ['member.mehra@ncism.local', PW],   // board_member (cannot appoint)
  secretariat: ['secretariat@ncism.local', PW],
  hearing1: ['hearing1@ncism.local', PW],
  college0140: ['college.ayu0140@ncism.local', PW], // correct college
  college0001: ['college.ayu0001@ncism.local', PW], // wrong college
  admin: ['admin@ncism.local', ADMIN_PW],
};

let pass = 0; let fail = 0;
const ok = (msg) => { pass += 1; console.log(`  ✔ ${msg}`); };
const bad = (msg) => { fail += 1; console.error(`  ✗ ${msg}`); };

async function login(email, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`login ${email} failed: ${res.status} ${JSON.stringify(json)}`);
  return json.data.accessToken;
}

const tokens = {};
async function tokenFor(key) {
  if (!tokens[key]) tokens[key] = await login(...U[key]);
  return tokens[key];
}

/** Call the API as `who`; returns { status, json }. */
async function call(who, method, pathname, { body, form } = {}) {
  const token = await tokenFor(who);
  const headers = { authorization: `Bearer ${token}` };
  let payload;
  if (form) { payload = form; } // FormData sets its own content-type
  else if (body !== undefined) { headers['content-type'] = 'application/json'; payload = JSON.stringify(body); }
  const res = await fetch(`${BASE}${pathname}`, { method, headers, body: payload });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

const codeOf = (j) => j?.error?.code || j?.code || j?.message;

/** Assert an action is DENIED with the expected HTTP status (403 or 423). */
async function denied(label, who, method, pathname, opts, wantStatus = 403) {
  const { status, json } = await call(who, method, pathname, opts);
  if (status === wantStatus) ok(`${label} → ${status} ${codeOf(json) || ''}`.trim());
  else bad(`${label} → expected ${wantStatus}, got ${status} ${JSON.stringify(json)}`);
}

/** Assert an action SUCCEEDS (2xx); returns the response json. */
async function allowed(label, who, method, pathname, opts) {
  const { status, json } = await call(who, method, pathname, opts);
  if (status >= 200 && status < 300) { ok(`${label} → ${status}`); return json; }
  bad(`${label} → expected 2xx, got ${status} ${JSON.stringify(json)}`);
  return json;
}

async function pollUntil(id, target, timeoutMs = 60000) {
  const start = Date.now();
  for (;;) {
    const { json } = await call('smarnika', 'GET', `/applications/${id}`);
    const st = json.application?.status;
    if (st === target) return st;
    if (st === 'failed') throw new Error(`case ${id} went to failed: ${json.application?.error}`);
    if (Date.now() - start > timeoutMs) throw new Error(`timeout waiting for ${target}, stuck at ${st}`);
    await new Promise((r) => setTimeout(r, 1500));
  }
}

async function main() {
  if (!fs.existsSync(PDF)) throw new Error(`E2E PDF not found: ${PDF} (set E2E_PDF)`);
  const inst = await db('institutions').where({ institute_id: INSTITUTE }).first('id', 'system', 'state');
  if (!inst) throw new Error(`institution ${INSTITUTE} not seeded`);
  console.log(`RBAC E2E — ${INSTITUTE} (${inst.system}/${inst.state}) @ ${BASE}\n`);

  // 1. Upload (visitor). A junior cannot upload; the visitor can.
  console.log('uploaded:');
  await denied('junior cannot upload', 'smarnika', 'POST', '/applications', { body: {} }, 403);
  const form = new FormData();
  form.set('file', new Blob([fs.readFileSync(PDF)], { type: 'application/pdf' }), `${INSTITUTE}.pdf`);
  form.set('institutionId', inst.id);
  form.set('intake', '100'); form.set('level', 'UG');
  const created = await allowed('visitor uploads', 'visitor', 'POST', '/applications', { form });
  const id = created.application.id;
  console.log(`  case ${id}\n`);

  // 2. Process (only an allotted junior). Visitor lacks the permission entirely.
  console.log('process:');
  await denied('visitor cannot process', 'visitor', 'POST', `/applications/${id}/process`, {}, 403);
  await allowed('smarnika (allotted) processes', 'smarnika', 'POST', `/applications/${id}/process`, {});
  const settled = await pollUntil(id, 'processed');
  console.log(`  settled: ${settled}\n`);

  // 3. processed → submit is owner-only.
  console.log('processed:');
  await denied('non-owner junior cannot submit', 'sunil', 'POST', `/applications/${id}/submit`, {}, 403);
  await allowed('owner junior submits', 'smarnika', 'POST', `/applications/${id}/submit`, {});
  console.log('');

  // 4. senior_review → only the supervising senior forwards.
  console.log('senior_review:');
  await denied('non-supervising senior cannot forward', 'kritika', 'POST', `/applications/${id}/review`, { body: { action: 'forward' } }, 403);
  await allowed('supervising senior forwards', 'gaurav', 'POST', `/applications/${id}/review`, { body: { action: 'forward' } });
  console.log('');

  // 5. board_review → juniors/seniors cannot decide; board requests clarification.
  console.log('board_review:');
  await denied('junior cannot approve', 'smarnika', 'POST', `/applications/${id}/decide`, { body: { action: 'approve' } }, 403);
  await denied('senior cannot approve', 'gaurav', 'POST', `/applications/${id}/decide`, { body: { action: 'approve' } }, 403);
  await allowed('board requests clarification', 'president', 'POST', `/applications/${id}/clarification`, { body: { letterText: 'Please clarify the faculty shortfall.' } });
  console.log('');

  // 6. clarification_open → only the owning college responds.
  console.log('clarification_open:');
  await denied('wrong college cannot respond', 'college0001', 'POST', `/applications/${id}/clarification/respond`, { form: (() => { const f = new FormData(); f.set('responseText', 'x'); return f; })() }, 403);
  const respForm = new FormData(); respForm.set('responseText', 'Faculty gap now filled; see attached.');
  await allowed('owning college responds', 'college0140', 'POST', `/applications/${id}/clarification/respond`, { form: respForm });
  console.log('');

  // 7. back up the chain to the board.
  console.log('resubmit → board:');
  await allowed('junior resubmits', 'smarnika', 'POST', `/applications/${id}/submit`, {});
  await allowed('senior forwards', 'gaurav', 'POST', `/applications/${id}/review`, { body: { action: 'forward' } });
  console.log('');

  // 8. board requests a hearing → President-only appointment.
  console.log('hearing:');
  await allowed('board requests hearing', 'president', 'POST', `/applications/${id}/request-hearing`, { body: {} });
  await denied('board member cannot appoint committee', 'mehra', 'POST', `/applications/${id}/appoint-committee`, { body: { memberIds: [] } }, 403);
  const cm = await allowed('president lists committee members', 'president', 'GET', '/applications/committee-members', {});
  const memberIds = (cm.members || []).slice(0, 2).map((m) => m.id);
  await allowed('president appoints committee', 'president', 'POST', `/applications/${id}/appoint-committee`, { body: { memberIds } });
  console.log('');

  // 9. hearing_scheduled → only a committee member records minutes.
  console.log('hearing_scheduled:');
  await denied('junior cannot record minutes', 'smarnika', 'POST', `/applications/${id}/hearing/minutes`, { body: { minutes: 'x' } }, 403);
  await allowed('committee member records minutes', 'hearing1', 'POST', `/applications/${id}/hearing/minutes`, { body: { minutes: 'Heard; deficiencies partly cured.', verdict: 'grant-with-conditions' } });
  console.log('');

  // 10. board approves → secretariat-only dispatch.
  console.log('approve → dispatch:');
  await allowed('board approves', 'president', 'POST', `/applications/${id}/decide`, { body: { action: 'approve', outcome: 'grant', approvedSeats: 100 } });
  await denied('approved case is immutable to junior (423)', 'smarnika', 'POST', `/applications/${id}/process`, {}, 423);
  await denied('non-secretariat cannot dispatch', 'president', 'POST', `/applications/${id}/dispatch`, { body: {} }, 403);
  await allowed('secretariat dispatches order', 'secretariat', 'POST', `/applications/${id}/dispatch`, { body: { orderText: 'Final order: granted.' } });
  console.log('');

  // 11. closed is fully immutable — even to admin.
  console.log('closed:');
  await denied('closed case rejects junior process (423)', 'smarnika', 'POST', `/applications/${id}/process`, {}, 423);
  await denied('admin cannot delete a finalized case (423)', 'admin', 'DELETE', `/applications/${id}`, {}, 423);
  console.log('');

  // Cleanup: the case reached `closed`, which is un-deletable via the API by design;
  // remove it directly so the script is repeatable.
  await db('applications').where({ id }).del();
  console.log(`cleaned up case ${id}\n`);
}

main()
  .then(() => {
    console.log(`\nRBAC E2E: ${pass} passed, ${fail} failed.`);
    return db.destroy();
  })
  .then(() => process.exit(fail ? 1 : 0))
  .catch(async (err) => {
    console.error('\nE2E aborted:', err.message);
    await db.destroy().catch(() => {});
    process.exit(1);
  });
