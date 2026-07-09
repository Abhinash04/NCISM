const { missing } = require('./utils');

/**
 * Teaching / non-teaching / hospital staff tables.
 *
 * The Part-I/II visitation proformas carry these as large multi-page tables
 * whose layout varies college to college; reliable extraction needs the
 * element-JSON table structures rather than the flattened markdown. Until
 * that is built, these parameters are reported as missing so the evaluator
 * emits "insufficient-data - manual verification required" instead of
 * fabricating staff numbers (the legacy engine's fallback invented them).
 */
function extract() {
  return {
    teachingStaff: missing(),
    nonTeachingStaff: missing(),
    hospitalStaff: missing(),
    yogaTeacherAvailable: missing(),
    bioStatisticianAvailable: missing(),
    aebasImplemented: missing(),
    websiteFunctional: missing(),
  };
}

module.exports = { extract };
