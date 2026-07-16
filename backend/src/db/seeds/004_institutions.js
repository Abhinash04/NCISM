/**
 * Imports the 672-row institute master (markdown/Master data of institute.md)
 * into the institutions table. Idempotent (upsert on institute_id).
 */

const fs = require('fs');
const path = require('path');
const { parseMasterData } = require('../../utils/master-data.parser');
const institutionRepo = require('../../repositories/institution.repository');

// backend/src/db/seeds → repo root is four levels up.
const MASTER_FILE = path.resolve(__dirname, '../../../../markdown/Master data of institute.md');

exports.seed = async function seed() {
  if (!fs.existsSync(MASTER_FILE)) {
    // eslint-disable-next-line no-console
    console.warn(`[seed] Master data file not found at ${MASTER_FILE} — skipping institutions import.`);
    return;
  }

  const text = fs.readFileSync(MASTER_FILE, 'utf8');
  const { rows, exceptions } = parseMasterData(text);
  const { inserted, updated } = await institutionRepo.bulkUpsert(rows);

  // eslint-disable-next-line no-console
  console.log(`[seed] Institutions: parsed=${rows.length} inserted=${inserted} updated=${updated} exceptions=${exceptions.length}`);
  if (exceptions.length) {
    // eslint-disable-next-line no-console
    console.warn('[seed] Exception rows:', exceptions.slice(0, 10));
  }
};
