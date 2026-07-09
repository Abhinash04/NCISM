/**
 * MARB-ISM assessment report layout for MESAR (UG) Ayurveda 2024.
 * Section structure follows the reference report
 * "Assessment of Sardar Patel Ayurvedic Med. Coll., M.P for 60 seats".
 *
 * Fixed narrative lines (teaching pharmacy status, functional-block lines)
 * are template boilerplate carried over from the reference format; they
 * become parameter-driven when the corresponding extractors land.
 */
const MANUAL = 'manual verification required';

function fmt(v) {
  if (v === null || v === undefined) return '—';
  return String(v);
}

function pad2(n) {
  return n < 10 ? `0${n}` : String(n);
}

function pv(parameters, name) {
  const p = parameters[name];
  return p && p.status === 'found' ? p.value : null;
}

function disp(parameters, name) {
  const v = pv(parameters, name);
  return v === null ? `— (${MANUAL})` : String(v);
}

function availability(parameters, name) {
  const v = pv(parameters, name);
  if (v === null) return `Not verified (${MANUAL})`;
  return v ? 'Available' : 'Not Available';
}

function findingById(findings, id) {
  return findings.find((f) => f.ruleId === id) || null;
}

function buildVisitorsTable(visitors) {
  let table = '| **S. No.** | **Visitor’s Name** | **Visitor ID** |\n| --- | --- | --- |\n';
  if (!visitors || visitors.length === 0) {
    table += `| 1 | — (${MANUAL}) | — |\n`;
    return table;
  }
  visitors.forEach((v, idx) => {
    table += `| ${idx + 1} | ${v.name} | ${v.id} |\n`;
  });
  return table;
}

function buildLibrarySection(findings, parameters) {
  const ids = ['library.books', 'library.sitting-capacity', 'library.computers', 'library.seating-arrangement'];
  const libFindings = ids.map((id) => findingById(findings, id)).filter(Boolean);
  const anyFail = libFindings.some((f) => f.status === 'fail');
  const anyMissing = libFindings.some((f) => f.status === 'insufficient-data');

  let statusText;
  if (anyFail) {
    statusText = 'Not fulfilling the criteria as per regulation 17 (3) of MESAR (UG) Ayurveda 2024';
  } else if (anyMissing) {
    statusText = `Criteria as per regulation 17 (3) of MESAR (UG) Ayurveda 2024 could not be fully verified (${MANUAL})`;
  } else {
    statusText = 'fulfilling the criteria as per regulation 17 (3) of MESAR (UG) Ayurveda 2024';
  }

  const seating = pv(parameters, 'librarySeatingAdequate');
  const seatingText = seating === null ? `Not verified (${MANUAL})` : seating ? 'adequate' : 'Non-adequate';

  return `6. **Central Library:-** ${statusText} and details are as under-
    - Sitting arrangement – ${seatingText}
    - Sitting capacity-${disp(parameters, 'librarySittingCapacity')}
    - No. of computer available with internet facility- ${disp(parameters, 'libraryComputers')}
    - Total number of books -${disp(parameters, 'libraryBooks')}`;
}

function buildTeachingSection(findings, parameters) {
  const finding = findingById(findings, 'staff.teaching');

  const yoga = pv(parameters, 'yogaTeacherAvailable');
  const bio = pv(parameters, 'bioStatisticianAvailable');
  const yogaLine = yoga === null ? `Yoga teacher availability – ${MANUAL}.` : `Yoga teacher is ${yoga ? 'available' : 'not available'}.`;
  const bioLine = bio === null ? `Bio-statistician availability – ${MANUAL}.` : `Bio-statistician is ${bio ? 'available' : 'not available'}.`;

  if (!finding || finding.status === 'insufficient-data') {
    return `**11.Teaching staffs:-** ${finding ? finding.renderedText : MANUAL}\n\n1. ${yogaLine}\n2. ${bioLine}`;
  }

  if (finding.status === 'pass') {
    let section = `**11.Teaching staffs:- ${finding.renderedText}**\n\n`;
    section += `1. ${yogaLine}\n`;
    section += `2. ${bioLine}\n`;
    section += `3. There are no absent teachers on the day of visitation.\n`;
    return section;
  }

  const absent = finding.absent ?? 0;
  const absentStr = absent > 0 ? pad2(absent) : '0';
  let section = `**11.Teaching staffs:- ${finding.renderedText}**\n\n`;
  section += `1. ${yogaLine}\n`;
  section += `2. ${bioLine}\n`;
  section += `3. Out of ${fmt(finding.total)} teaching staffs, ${absentStr} staff was absent on the day of visitation.\n`;
  section += `4. **Shortcoming is as under-**\n\n`;
  section += `| **S. No.** | **Department** | **Minimum Requirement as per Regulations** | **No. Of Existing Teachers** | **Excess** | **Shortcomings of HF and LF** | **Punitive policy** |\n`;
  section += `| --- | --- | --- | --- | --- | --- | --- |\n`;

  finding.rows.forEach((row, idx) => {
    section += `| ${idx + 1} | ${row.dept} | ${row.requirementText} | ${row.existingDisplay} | ${row.excessText} | **${row.shortText}** | **${row.punitiveText}** |\n`;
  });

  return section;
}

function buildNonTeachingSection(findings) {
  const finding = findingById(findings, 'staff.non-teaching');

  if (!finding || finding.status === 'insufficient-data') {
    return `**12) Non-teaching staff:-** ${finding ? finding.renderedText : MANUAL}`;
  }

  const deficientRows = finding.rows.filter((r) => r.shortfall > 0);

  if (deficientRows.length === 0) {
    let section = `**12) Non-teaching staff: - ${finding.renderedText}**\n\n`;
    section += `1. Out of ${fmt(finding.total)} non-teaching staffs, ${fmt(finding.absent)} staff were absent on the day of visitation.\n`;
    return section;
  }

  let section = `**12) Non-teaching staff: - ${finding.renderedText}**\n\n`;
  section += `1. **Shortcoming is as under-**\n\n`;
  section += `| **Department** | **Post** | **Required as per MSR** | **Existing** | **Shortcomings** | **Punitive policy** |\n`;
  section += `| --- | --- | --- | --- | --- | --- |\n`;
  deficientRows.forEach((row) => {
    section += `| ${row.dept ?? ''} | ${row.post} | ${row.required} | ${row.existing} | ${row.shortfall} | ${row.punitiveText} |\n`;
  });
  section += `\n2. Out of ${fmt(finding.total)} non-teaching staffs, ${fmt(finding.absent)} staff were absent on the day of visitation.\n`;
  return section;
}

function buildHospitalStaffSection(findings) {
  const finding = findingById(findings, 'staff.hospital');

  if (!finding || finding.status === 'insufficient-data') {
    return `**13) Hospital staffs:-** ${finding ? finding.renderedText : MANUAL}`;
  }

  const deficientRows = finding.rows.filter((r) => r.shortfall > 0);

  if (deficientRows.length === 0) {
    let section = `**13) Hospital staffs:- ${finding.renderedText}**\n\n`;
    if (finding.absent > 0) {
      section += `1. Out of ${fmt(finding.total)} hospital staffs, ${fmt(finding.absent)} staff were absent on the day of visitation.\n`;
    }
    return section;
  }

  let section = `**13) Hospital staffs:- ${finding.renderedText}**\n\n`;
  section += `1. **Shortcoming is as under-**\n\n`;
  section += `| **Hospital Staff/Name of Post** | **Required as per MSR** | **Available Hospital Staff (Part II)** | **Shortcomings** | **Punitive policy** |\n`;
  section += `| --- | --- | --- | --- | --- |\n`;
  deficientRows.forEach((row) => {
    section += `| ${row.post} | ${row.required} | ${row.existing} | ${row.shortfall} | **${row.punitiveText}** |\n`;
  });
  section += `\n2. Out of ${fmt(finding.total)} hospital staffs, ${fmt(finding.absent)} staff were absent on the day of visitation.\n`;
  return section;
}

function buildHospitalInfraSection(findings, parameters) {
  const areaFinding = findingById(findings, 'infra.hospital-constructed-area');
  const opdTotal = findingById(findings, 'hospital.opd-total-patients');
  const opdAvg = findingById(findings, 'hospital.opd-average-daily');
  const registration = findingById(findings, 'hospital.central-registration');

  const deliveries = pv(parameters, 'deliveries');
  const deliveriesText = deliveries === null ? `— (${MANUAL})` : pad2(deliveries);

  const areaLine = areaFinding && areaFinding.status !== 'insufficient-data'
    ? areaFinding.renderedText
    : `**Constructed area of the hospital:** ${areaFinding ? areaFinding.renderedText : MANUAL}`;

  return `**14. Hospital Infrastructure details-**

${areaLine}

1. **Functionality of the hospital:-**
2. No. of OPD:- ${disp(parameters, 'opdCount')}
3. ${opdTotal ? opdTotal.renderedText : MANUAL}
4. ${opdAvg ? opdAvg.renderedText : MANUAL}
5. Total ${disp(parameters, 'ipdTotalPatients')} no. of patients admitted in IPD.
6. Average bed occupancy percentage is ${disp(parameters, 'bedOccupancyPercent')}%.
7. There were ${deliveriesText} deliveries conducted. Labour room is functional.
8. There were ${disp(parameters, 'operations')} operations conducted.
9. Clinical laboratory is functional.
10. Labour room is functional.
11. Ksharsutra block is functional.
12. OPD is functional
13. IPD is functional
14. ${registration ? registration.renderedText : MANUAL}
15. **Mean** of general and essential equipment’s/instruments availability is ${disp(parameters, 'equipmentMeanPercent')}%.`;
}

function buildObservations(parameters) {
  const visitorObs = pv(parameters, 'visitorObservations') || [];
  const otherObs = pv(parameters, 'otherObservations') || [];

  let section = `16. **Observation by the visitors:-**\n`;
  if (visitorObs.length === 0) {
    section += `17. None recorded (${MANUAL}).\n`;
  } else {
    visitorObs.forEach((obs, idx) => {
      section += `${17 + idx}. ${obs}\n`;
    });
  }

  const base = 17 + Math.max(visitorObs.length, 1);
  section += `${base}. **Other Observation :-**\n`;
  if (otherObs.length === 0) {
    section += `${base + 1}. None recorded (${MANUAL}).\n`;
  } else {
    otherObs.forEach((obs, idx) => {
      section += `${base + 1 + idx}. ${obs}\n`;
    });
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
  const { institution, parameters, findings, punitiveSummary } = result;
  const generatedDate = options.generatedDate
    || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const lectureArea = findingById(findings, 'infra.lecture-hall-area');
  const lectureCount = findingById(findings, 'infra.lecture-hall-count');
  const herbal = findingById(findings, 'herbal.species');
  const aebas = findingById(findings, 'compliance.aebas');
  const website = findingById(findings, 'compliance.website');

  const lectureAreaLine = lectureArea && lectureArea.status !== 'insufficient-data'
    ? `Total Area of Lecture Halls is ${fmt(lectureArea.actual)}, against the minimum requirement of ${fmt(lectureArea.expected)}. So, there is a **${lectureArea.renderedText}**.`
    : (lectureArea ? lectureArea.renderedText : MANUAL);

  const fileNo = institution.fileNo || `— (${MANUAL})`;
  const location = institution.location || `— (${MANUAL})`;
  const visitDates = `${institution.visitDates.start || '—'} and ${institution.visitDates.end || '—'}`;

  return `**Medical Assessment and Rating Board for Indian System of Medicine**

**National Commission for Indian System of Medicine, New Delhi**

**Assessment Report of Ayurvedic Medical Colleges for the Academic Session ${institution.academicYear}**

**File no. ${fileNo}**

**Dated:-${generatedDate}**

It is submitted that **${institution.name}, ${location} (Inst. ID-${institution.id})** was visited on **${visitDates}** to assess the available facilities of teaching and practical training for **${institution.purpose} with intake capacity of ${institution.intake} seats in ${institution.course} course for the academic session ${institution.academicYear} under section 28/29 of NCISM Act, 2020** by the visitors namely:-

${buildVisitorsTable(institution.visitors)}

Further, it is submitted that after examination of the visitation report along with all the annexures submitted by the visitors following Compliance/shortcomings have been observed-

1. **Constructed Area :-** Constructed area of the college is ${disp(parameters, 'constructedAreaCollegeSqm')} sq.mt., constructed area of the hospital is ${disp(parameters, 'constructedAreaHospitalSqm')} sq.mt. And constructed area of the Herbal garden ${disp(parameters, 'constructedAreaHerbalSqm')} sq.mt are fulfilling as per schedule III of MESAR (UG) Ayurveda 2024.
2. **Area of the Common Departments :-** ${lectureAreaLine}
3. **Lecture Halls :- ${lectureCount ? lectureCount.renderedText : MANUAL}**
4. **Area of the Teaching Departments :- All departments are fulfilling/and shortcoming as per schedule III of MESAR UG Ayurveda,2024.**
5. **Teaching departments :-** Computer and printer are available in dean and MS office.
${buildLibrarySection(findings, parameters)}
7. **Herbal Garden:-** ${herbal ? herbal.renderedText : MANUAL}
8. **Teaching Pharmacy:-**
    - Functional status- Functional
    - Sitting arrangements- Satisfactory
    - Equipment status – Satisfactory
    - Infrastructure- Satisfactory
    - Quality testing lab is available as per Sub-regulation 7 & 8 of regulation 19 of MESAR (UG) Ayurveda 2024.
9. **Biometric attendance:- ${aebas ? aebas.renderedText : MANUAL}**
    - Aadhar enabled biometric System to track attendance of the teaching staff – ${availability(parameters, 'aebasTeaching')}
    - Aadhar enabled biometric System to track attendance of the **non-teaching staff** – ${availability(parameters, 'aebasNonTeaching')}
    - Aadhar enabled biometric System to track attendance of the **Hospital Staff –** ${availability(parameters, 'aebasHospital')}
10. **College website:-**
    - 1. Information uploaded on college website available as per Regulation 11 of MESAR (UG) Ayurveda 2024.
    - 2. College website:- ${website ? website.renderedText : MANUAL}

${buildTeachingSection(findings, parameters)}
${buildNonTeachingSection(findings)}
${buildHospitalStaffSection(findings)}

${buildHospitalInfraSection(findings, parameters)}

${buildObservations(parameters)}

${buildPunitiveSummary(punitiveSummary, institution.intake)}`;
}

module.exports = { build };
