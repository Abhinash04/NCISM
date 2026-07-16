const { db } = require('../db');

async function create(data) {
  const [row] = await db('letters').insert(data).returning('*');
  return row;
}

function listForCase(applicationId) {
  return db('letters')
    .leftJoin('users as gen', 'letters.generated_by', 'gen.id')
    .leftJoin('users as sig', 'letters.signed_by', 'sig.id')
    .where('application_id', applicationId)
    .orderBy('letters.created_at', 'asc')
    .select('letters.*', 'gen.name as generated_by_name', 'sig.name as signed_by_name');
}

module.exports = { create, listForCase };
