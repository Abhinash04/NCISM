const fs = require('fs');
const path = require('path');
const config = require('../../../config');
const { validateRuleset } = require('./validate');

const cache = new Map();

/**
 * Loads a ruleset directory (data/rulesets/<id>/<version>/) into
 * { manifest, rules, punitivePolicy }. Validates structurally on first load
 * and caches by id@version.
 */
function loadRuleset(rulesetId, version) {
  const cacheKey = `${rulesetId}@${version}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const dir = path.join(config.dataDir, 'rulesets', rulesetId, version);
  const manifestPath = path.join(dir, 'ruleset.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Ruleset not found: ${rulesetId}@${version} (expected ${manifestPath})`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  const rules = [];
  for (const ruleFile of manifest.ruleFiles) {
    const filePath = path.join(dir, ruleFile);
    const fileRules = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!Array.isArray(fileRules)) {
      throw new Error(`Rule file ${ruleFile} in ${cacheKey} must contain a JSON array`);
    }
    rules.push(...fileRules);
  }

  const punitivePolicy = JSON.parse(fs.readFileSync(path.join(dir, manifest.punitivePolicy), 'utf8'));

  const ruleset = { manifest, rules, punitivePolicy };
  validateRuleset(ruleset);

  cache.set(cacheKey, ruleset);
  return ruleset;
}

function listRulesets() {
  const rulesetsDir = path.join(config.dataDir, 'rulesets');
  if (!fs.existsSync(rulesetsDir)) return [];
  const result = [];
  for (const id of fs.readdirSync(rulesetsDir)) {
    const idDir = path.join(rulesetsDir, id);
    if (!fs.statSync(idDir).isDirectory()) continue;
    for (const version of fs.readdirSync(idDir)) {
      if (fs.existsSync(path.join(idDir, version, 'ruleset.json'))) {
        result.push({ id, version });
      }
    }
  }
  return result;
}

module.exports = { loadRuleset, listRulesets };
