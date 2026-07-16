const { db } = require('../db');

function record(evt) {
  return db('audit_log').insert(evt);
}

async function list({ entity, actorId, from, to, page = 1, limit = 50 } = {}) {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));

  const base = db('audit_log');
  if (entity) base.where('audit_log.entity', entity);
  if (actorId) base.where('audit_log.actor_id', actorId);
  if (from) base.where('audit_log.created_at', '>=', from);
  if (to) base.where('audit_log.created_at', '<=', to);

  const [{ count }, rows] = await Promise.all([
    base.clone().count({ count: '*' }).first(),
    base.clone().orderBy('audit_log.created_at', 'desc').limit(l).offset((p - 1) * l)
      .select('id', 'actor_id', 'actor_email', 'action', 'entity', 'entity_id', 'path', 'status', 'ip', 'created_at'),
  ]);
  return { rows, total: Number(count), page: p, limit: l };
}

module.exports = { record, list };
