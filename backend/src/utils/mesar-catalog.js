/**
 * Regulation / course reference per (system, level), used to fill the letter
 * subject + regulation citations. The authoritative source for a processed case
 * is the ruleset manifest that produced its report (title + course); this
 * catalog is the fallback and the source of the hearing-regulation reference.
 * Ayurveda-UG is authoritative (matches the only shipped ruleset); other rows
 * are best-effort until their MESAR schedules are keyed.
 */

const SYS = {
  ayurveda: { name: 'Ayurveda', ug: 'BAMS', pg: 'MD/MS Ayurveda' },
  unani: { name: 'Unani', ug: 'BUMS', pg: 'MD/MS Unani' },
  siddha: { name: 'Siddha', ug: 'BSMS', pg: 'MD/MS Siddha' },
  sowa_rigpa: { name: 'Sowa-Rigpa', ug: 'BSRMS', pg: 'MD Sowa-Rigpa' },
};

/** e.g. get('ayurveda', 'UG') → { courseLabel:'UG (BAMS)', regulationTitle, regulationShort, hearingRegulation, section } */
function get(system, level = 'UG') {
  const s = SYS[system] || SYS.ayurveda;
  const lvl = String(level).toUpperCase() === 'PG' ? 'PG' : 'UG';
  const degree = lvl === 'PG' ? s.pg : s.ug;
  const lvlWord = lvl === 'PG' ? 'Postgraduate' : 'Undergraduate';
  return {
    courseLabel: `${lvl} (${degree})`,
    regulationTitle: `NCISM (Minimum Essential Standards, Assessment and Rating for ${lvlWord} ${s.name} Colleges and Attached Teaching Hospitals) Regulations, 2024`,
    regulationShort: `MESAR for ${lvlWord} ${s.name}, 2024`,
    hearingRegulation: '55(14)',
    section: '28/29',
  };
}

module.exports = { get };
