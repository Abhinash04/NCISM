/**
 * MARB-ISM assessment report layout for MESAR (UG) Sowa-Rigpa 2023.
 *
 * Generic, findings-driven layout (same approach as the Unani template): the
 * criteria block lists each non-staff finding by section, staff shortfalls come
 * from the staff-table/roster rows, and the punitive summary reflects what the
 * punitive engine decided. Deterministic (golden-testable).
 */
const MANUAL = 'manual verification required';

function fmt(v) {
  return v === null || v === undefined ? '—' : String(v);
}

function findingById(findings, id) {
  return findings.find((f) => f.ruleId === id) || null;
}

function buildVisitorsTable(visitors) {
  let table = '| **S. No.** | **Visitor’s Name** | **Visitor ID** |\n| --- | --- | --- |\n';
  if (!visitors || visitors.length === 0) {
    return `${table}| 1 | — (${MANUAL}) | — |\n`;
  }
  visitors.forEach((v, idx) => { table += `| ${idx + 1} | ${v.name} | ${v.id} |\n`; });
  return table;
}

const SECTION_ORDER = [
  ['land', 'Land'],
  ['clinical-departments', 'Clinical Departments'],
  ['herbal-garden', 'Herbal Garden'],
  ['equipment', 'Equipment & Instruments'],
  ['biometric-attendance', 'Biometric Attendance (AEBAS)'],
  ['hospital-functionality', 'Hospital Functionality'],
];

function buildCriteria(findings) {
  const staffSections = new Set(['teaching-staff', 'non-teaching-staff', 'hospital-staff']);
  let n = 0;
  let out = '';
  for (const [section, heading] of SECTION_ORDER) {
    const items = findings.filter((f) => f.section === section && !staffSections.has(f.section));
    if (items.length === 0) continue;
    out += `\n**${heading}:**\n`;
    for (const f of items) {
      n += 1;
      const text = f.status === 'insufficient-data' ? `${f.renderedText || MANUAL}` : f.renderedText;
      out += `${n}. ${f.title} — ${text}\n`;
    }
  }
  return out;
}

function buildStaffSection(finding, label) {
  if (!finding || finding.status === 'insufficient-data') {
    return `**${label}:-** ${finding ? finding.renderedText : MANUAL}\n`;
  }
  const deficient = (finding.rows || []).filter((r) => (r.shortfall ?? 0) > 0);
  let section = `**${label}:- ${finding.renderedText}**\n`;
  if (deficient.length > 0) {
    section += `\n| **Department / Post** | **Required** | **Existing** | **Shortfall** | **Punitive** |\n| --- | --- | --- | --- | --- |\n`;
    deficient.forEach((r) => {
      section += `| ${fmt(r.dept ?? r.post)} | ${fmt(r.required ?? r.requirementText)} | ${fmt(r.existing ?? r.existingDisplay)} | ${fmt(r.shortfall ?? r.shortText)} | ${fmt(r.punitiveText)} |\n`;
    });
  }
  if (finding.total !== null || finding.absent !== null) {
    section += `\nOut of ${fmt(finding.total)} ${label.toLowerCase()}, ${fmt(finding.absent)} were absent on the day of visitation.\n`;
  }
  return section;
}

function buildPunitiveSummary(punitiveSummary, intake) {
  const outcomeText = {
    compliant: 'No punitive action attracted. The college is compliant with the assessed criteria.',
    'seat-reduction': `Cumulative seat reduction of **${punitiveSummary.totalSeatReduction} seats** (${punitiveSummary.percentOfIntake}% of the sanctioned intake of ${intake}).`,
    denial: '**Denial of permission** for the academic session as per the punitive policy.',
  }[punitiveSummary.outcome];

  let section = `**Punitive Action Summary (Punitive Policy 2026-27, approved in the 160th Board Meeting)**\n\n`;
  if (punitiveSummary.contributions.length > 0) {
    section += `| **Deficiency** | **Consequence** | **Seats** |\n| --- | --- | --- |\n`;
    punitiveSummary.contributions.forEach((c) => {
      section += `| ${c.detail} | ${c.type === 'denial' ? 'Denial of permission' : 'Seat reduction'} | ${c.type === 'denial' ? '—' : c.seats} |\n`;
    });
    section += '\n';
  }
  section += `${outcomeText}\n`;
  return section;
}

function build(result, options = {}) {
  const { institution, findings, punitiveSummary } = result;
  const generatedDate = options.generatedDate
    || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const fileNo = institution.fileNo || '____';
  const locationClause = institution.location ? `, ${institution.location}` : '';
  const visitDates = `${institution.visitDates.start || '—'} and ${institution.visitDates.end || '—'}`;

  const teaching = buildStaffSection(findingById(findings, 'staff.teaching'), 'Teaching staff');
  const nonTeaching = buildStaffSection(findingById(findings, 'staff.non-teaching'), 'Non-teaching staff');
  const hospitalStaff = buildStaffSection(findingById(findings, 'staff.hospital'), 'Hospital staff');

  return `**Medical Assessment and Rating Board for Indian System of Medicine**

**National Commission for Indian System of Medicine, New Delhi**

**Assessment Report of Sowa-Rigpa Medical Colleges for the Academic Session ${institution.academicYear}**

**File no. ${fileNo}**

**Dated:-${generatedDate}**

It is submitted that **${institution.name}${locationClause} (Inst. ID-${institution.id})** was visited on **${visitDates}** to assess the available facilities of teaching and practical training for **${institution.purpose} with intake capacity of ${institution.intake} seats in ${institution.course} course for the academic session ${institution.academicYear} under section 28/29 of NCISM Act, 2020** by the visitors namely:-

${buildVisitorsTable(institution.visitors)}
Further, after examination of the visitation report along with all the annexures, the following compliance/shortcomings have been observed against MESAR (UG) Sowa-Rigpa 2023:-
${buildCriteria(findings)}
${teaching}
${nonTeaching}
${hospitalStaff}
${buildPunitiveSummary(punitiveSummary, institution.intake)}`;
}

module.exports = { build };
