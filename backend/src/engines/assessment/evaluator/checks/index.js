/**
 * Check handler registry. Rules are data; each check.type maps to the code
 * that knows its math. New check types register here ("custom" is the escape
 * hatch for one-off logic a future ruleset version may need).
 */
const handlers = {
  threshold: require('./threshold.check'),
  boolean: require('./boolean.check'),
  'staff-table': require('./staff-table.check'),
  'staff-roster': require('./staff-roster.check'),
};

function getHandler(type) {
  const handler = handlers[type];
  if (!handler) {
    throw new Error(`No check handler registered for type "${type}"`);
  }
  return handler;
}

module.exports = { getHandler };
