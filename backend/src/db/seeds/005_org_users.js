/**
 * Seeds the 17 MARB-ISM org users (President, 2 Board Members, 2 Senior
 * Consultants, 12 Junior/Dealing Staff) with MOCK credentials, wires the
 * reporting chain (supervisor_id), assigns org roles, and seeds staff_allotments
 * for the junior consultants by parsing markdown/Work Allotment in Staff.md.
 *
 * Mock password: MOCK_PASSWORD env (default 'Password123'). Idempotent by email.
 * These are placeholders — replace with real credentials before production.
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const ALLOTMENT_FILE = path.resolve(__dirname, '../../../../markdown/Work Allotment in Staff.md');

// email → { name, role, supervisor (email|null), alias (normalized name in the allotment sheet) }
const PRESIDENT = 'president@ncism.local';
const MEHRA = 'member.mehra@ncism.local';
const KANAUJIA = 'member.kanaujia@ncism.local';
const GAURAV = 'gaurav.bhandari@ncism.local';
const KRITIKA = 'kritika@ncism.local';

const ORG_USERS = [
  { email: PRESIDENT, name: 'Dr. Mukul Patel', role: 'president', supervisor: null },
  { email: MEHRA, name: 'B. L. Mehra', role: 'board_member', supervisor: PRESIDENT },
  { email: KANAUJIA, name: 'Dr. Sushrut Kanaujia', role: 'board_member', supervisor: PRESIDENT },
  { email: GAURAV, name: 'Dr. Gaurav Bhandari', role: 'senior_consultant', supervisor: MEHRA, alias: 'gaurav bhandari' },
  { email: KRITIKA, name: 'Dr. Kritika', role: 'senior_consultant', supervisor: KANAUJIA, alias: 'kritika' },
  // Team-1 (supervised by Gaurav Bhandari)
  { email: 'sunil@ncism.local', name: 'Dr. Sunil', role: 'junior_consultant', supervisor: GAURAV, alias: 'sunil' },
  { email: 'tanya@ncism.local', name: 'Dr. Tanya', role: 'junior_consultant', supervisor: GAURAV, alias: 'tanya' },
  { email: 'smarnika@ncism.local', name: 'Dr. Smarnika', role: 'junior_consultant', supervisor: GAURAV, alias: 'smarnika' },
  { email: 'akshay@ncism.local', name: 'Dr. Akshay', role: 'junior_consultant', supervisor: GAURAV, alias: 'akshay' },
  { email: 'shubhangi@ncism.local', name: 'Dr. Shubhangi', role: 'junior_consultant', supervisor: GAURAV, alias: 'shubhangi' },
  { email: 'mitali@ncism.local', name: 'Dr. Mitali', role: 'junior_consultant', supervisor: GAURAV, alias: 'mitali' },
  // Team-2 (supervised by Kritika)
  { email: 'pooja@ncism.local', name: 'Dr. Pooja', role: 'junior_consultant', supervisor: KRITIKA, alias: 'pooja' },
  { email: 'divesh.rana@ncism.local', name: 'Dr. Divesh Rana', role: 'junior_consultant', supervisor: KRITIKA, alias: 'divesh rana' },
  { email: 'dheeraj@ncism.local', name: 'Dr. Dheeraj', role: 'junior_consultant', supervisor: KRITIKA, alias: 'dheeraj' },
  { email: 'ritu.saini@ncism.local', name: 'Dr. Ritu Saini', role: 'junior_consultant', supervisor: KRITIKA, alias: 'ritu saini' },
  { email: 'abdulla@ncism.local', name: 'Dr. Abdulla', role: 'junior_consultant', supervisor: KRITIKA, alias: 'abdulla' },
  { email: 'steave@ncism.local', name: 'Dr. Steave', role: 'junior_consultant', supervisor: KRITIKA, alias: 'steave' },
];

/** Normalize a name for matching against the allotment sheet ("Dr. Divesh Rana" → "divesh rana"). */
function normName(s) {
  return String(s).toLowerCase().replace(/dr\.?/g, '').replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();
}

/** Splits a markdown table row into trimmed cells (drops outer pipes). */
function splitRow(line) {
  return line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());
}

function positive(cell) {
  const n = parseFloat(cell);
  return Number.isFinite(n) && n > 0;
}

/**
 * Parses the allotment sheet into { alias → Set('system|state') }.
 * Columns (0-based after pipe strip): 1 State, 2 EmpAyu, 3 TotAyu, 4 EmpUnani,
 * 5 TotUnani, 6 EmpSiddha, 7 TotSiddha, 8 TotSowa.
 */
function parseAllotments(text) {
  const byAlias = {}; // alias → Set of "system|state"
  const add = (rawName, system, state) => {
    for (const part of String(rawName).split(/\band\b/i)) {
      const alias = normName(part);
      if (!alias) continue;
      (byAlias[alias] ||= new Set()).add(`${system}|${state}`);
    }
  };

  const lines = text.split(/\r?\n/).filter((l) => l.trim().startsWith('|'));
  for (const line of lines) {
    const c = splitRow(line);
    const state = c[1];
    if (!state || /^-+:?$/.test(state) || /^state$/i.test(state)) continue; // header/separator
    if (positive(c[3])) add(c[2], 'ayurveda', state);
    if (positive(c[5])) add(c[4], 'unani', state);
    if (positive(c[7])) add(c[6], 'siddha', state);
    if (positive(c[8])) add(c[6], 'sowa_rigpa', state); // Siddha staff also covers Sowa-Rigpa
  }
  return byAlias;
}

exports.seed = async function seed(knex) {
  const password = process.env.MOCK_PASSWORD || 'Password123';
  const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
  const passwordHash = await bcrypt.hash(password, rounds);

  // 1. Upsert users (idempotent by email; don't clobber an existing password).
  const emailToId = {};
  for (const u of ORG_USERS) {
    const existing = await knex('users').whereRaw('lower(email) = ?', [u.email]).first('id');
    if (existing) {
      await knex('users').where({ id: existing.id }).update({ name: u.name });
      emailToId[u.email] = existing.id;
    } else {
      const [row] = await knex('users')
        .insert({ email: u.email, name: u.name, password_hash: passwordHash })
        .returning('id');
      emailToId[u.email] = row.id;
    }
  }

  // 2. Reporting chain + roles.
  for (const u of ORG_USERS) {
    await knex('users').where({ id: emailToId[u.email] })
      .update({ supervisor_id: u.supervisor ? emailToId[u.supervisor] : null });
    await knex('user_roles')
      .insert({ user_id: emailToId[u.email], role_key: u.role })
      .onConflict(['user_id', 'role_key']).ignore();
  }

  // 3. Staff allotments for the junior consultants.
  let allotRows = [];
  if (fs.existsSync(ALLOTMENT_FILE)) {
    const byAlias = parseAllotments(fs.readFileSync(ALLOTMENT_FILE, 'utf8'));
    for (const u of ORG_USERS) {
      if (u.role !== 'junior_consultant' || !u.alias) continue;
      const set = byAlias[u.alias];
      if (!set) continue;
      for (const key of set) {
        const [system, state] = key.split('|');
        allotRows.push({ user_id: emailToId[u.email], system, state });
      }
    }
    if (allotRows.length) {
      await knex('staff_allotments').insert(allotRows).onConflict(['user_id', 'system', 'state']).ignore();
    }
  } else {
    // eslint-disable-next-line no-console
    console.warn(`[seed] Allotment file not found at ${ALLOTMENT_FILE} — skipping staff_allotments.`);
  }

  // eslint-disable-next-line no-console
  console.log(`[seed] Org users: ${ORG_USERS.length} upserted, ${allotRows.length} allotment rows.`);
  if (!process.env.MOCK_PASSWORD) {
    // eslint-disable-next-line no-console
    console.warn(`[seed] MOCK credentials — password for all 17 org users: "${password}"  (set MOCK_PASSWORD to override; replace before prod).`);
  }
};
