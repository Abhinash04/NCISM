const { db } = require('../db');
const institutionRepo = require('../repositories/institution.repository');
const appRepo = require('../repositories/application.repository');
const letterRepo = require('../repositories/letter.repository');
const mesar = require('../utils/mesar-catalog');
const ApiError = require('../utils/api-error');

const PLACE = (label) => `[[${label}]]`; // clearly-marked editable placeholder
const COPY_TO = `**Copy to: -**

1. The Chairperson, National Commission for Indian System of Medicine, T-19, 1st Floor, Block-IV, Dhanwantri Bhawan, Road No.66, Punjabi Bagh (West), New Delhi-110026.
2. The President, Medical Assessment and Rating Board for Indian System of Medicine, National Commission for Indian System of Medicine, T-19, 1st Floor, Block-IV, Dhanwantri Bhawan, Road No.66, Punjabi Bagh (West), New Delhi-110026 for information.
3. Guard file.`;

function today() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}
function fmtDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}
function parseReport(app) {
  try { return typeof app.report_json === 'string' ? JSON.parse(app.report_json) : app.report_json; } catch { return null; }
}
function clean(s) { return String(s || '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim(); }
const SYS_ABBR = { ayurveda: 'Ay', unani: 'Un', siddha: 'Si', sowa_rigpa: 'SR' };

function signatory(actor) {
  const isPresident = (actor.roles || []).includes('president');
  const title = isPresident ? 'President' : 'Member';
  return `**(${actor.name})**

**${title}, Medical Assessment and Rating Board for Indian System of Medicine**

**(NCISM)**`;
}

function toBlock(inst) {
  return `To,
The Principal
${inst.name}
**(Inst. ID-${inst.institute_id})**

**Email:** ${inst.email || PLACE('email')}`;
}

/** Loads everything the letters need for a case. */
async function buildContext(appIn, actor) {
  const app = (await appRepo.getWithReport(appIn.id)) || appIn; // ensure report_json + all fields present
  const inst = (await institutionRepo.getById(app.institution_id)) || { name: app.institution_name, institute_id: app.institute_id, state: app.state };
  const cat = mesar.get(app.system, app.level);
  const report = parseReport(app);
  const findings = report?.findings || [];
  const punitive = report?.punitiveSummary || null;
  const intake = app.intake || PLACE('intake');
  const permission = app.permission_type || PLACE('permission type');
  const visFrom = app.visitation_from ? fmtDate(app.visitation_from) || app.visitation_from : PLACE('visitation date 1');
  const visTo = app.visitation_to ? fmtDate(app.visitation_to) || app.visitation_to : PLACE('visitation date 2');
  const mode = app.visitation_mode || 'hybrid';

  const meeting = await db('board_meeting_items')
    .join('board_meetings', 'board_meeting_items.meeting_id', 'board_meetings.id')
    .where('board_meeting_items.application_id', app.id)
    .orderBy('board_meetings.created_at', 'desc')
    .first('board_meetings.number', 'board_meetings.scheduled_at');
  const hearing = await db('hearings').where({ application_id: app.id }).orderBy('created_at', 'desc').first();
  const clarLetter = await db('letters').where({ application_id: app.id, kind: 'clarification' }).orderBy('created_at', 'desc').first();
  const clarResp = await db('clarifications').where({ application_id: app.id }).orderBy('round', 'desc').first();

  return { app, inst, cat, findings, punitive, intake, permission, visFrom, visTo, mode, meeting, hearing, clarLetter, clarResp, actor };
}

function subject(ctx, purpose) {
  const { inst, cat, intake, permission, app } = ctx;
  return `**Subject:- ${purpose} ${inst.name} (Inst. ID- ${inst.institute_id}) for issuance of ${permission} permission with intake capacity of ${intake} seats in ${cat.courseLabel} course under section ${cat.section} of NCISM Act, 2020 and relevant regulations thereunder for the academic session ${app.session || PLACE('session')} -reg.**`;
}

/** Deficient findings as a numbered prose list (clarification letter). */
function shortcomingList(findings) {
  const deficient = findings.filter((f) => f.status === 'fail');
  if (!deficient.length) return `1. ${PLACE('shortcomings — no deficiencies were recorded in the assessment report')}`;
  return deficient.map((f, i) => `${i + 1}. **${clean(f.renderedText || f.title || f.ruleId)}.**`).join('\n');
}

/** Teaching + hospital shortcoming tables (hearing notices), rebuilt from findings. */
function staffTables(findings) {
  const byId = (id) => findings.find((f) => f.ruleId === id);
  let out = '';

  const teaching = byId('staff.teaching');
  if (teaching && teaching.status !== 'insufficient-data') {
    out += `1. **Teaching staffs:-**\n2. ${clean(teaching.renderedText)}\n`;
    if (Array.isArray(teaching.rows) && teaching.rows.some((r) => r.shortText)) {
      out += `3. **Shortcoming is as under-**\n\n`;
      out += `| **S. No.** | **Department** | **Minimum Requirement as per Regulations** | **No. Of Existing Teachers** | **Excess** | **Shortcomings of HF and LF** | **Punitive policy** |\n`;
      out += `| --- | --- | --- | --- | --- | --- | --- |\n`;
      teaching.rows.forEach((r, i) => {
        out += `| ${i + 1} | ${r.dept} | ${r.requirementText} | ${r.existingDisplay} | ${r.excessText || ''} | ${r.shortText ? `**${r.shortText}**` : ''} | ${r.punitiveText || ''} |\n`;
      });
      out += '\n';
    }
  }

  const hospital = byId('staff.hospital');
  if (hospital && hospital.status !== 'insufficient-data') {
    out += `1. **Hospital staffs:-**\n2. ${clean(hospital.renderedText)}\n`;
    const def = (hospital.rows || []).filter((r) => r.shortfall > 0);
    if (def.length) {
      out += `3. **Shortcoming is as under:-**\n\n`;
      out += `| **Hospital Staff/Name of Post** | **Required as per MSR** | **Available Hospital Staff (Part II)** | **Shortcomings** | **Punitive policy** |\n`;
      out += `| --- | --- | --- | --- | --- |\n`;
      def.forEach((r) => { out += `| ${r.post} | ${r.required} | ${r.existing} | ${r.shortfall} | ${r.punitiveText || ''} |\n`; });
      out += '\n';
    }
  }

  return out || `1. ${PLACE('shortcomings from the assessment report')}\n`;
}

function renderClarification(ctx) {
  const { inst, cat, actor, visFrom, visTo, mode, permission, intake, app } = ctx;
  return `# CLARIFICATION LETTER

**Ref. No.:** ${ctx.refNo}
**Dated:** ${today()}

${toBlock(inst)}

${subject(ctx, 'Clarification in respect of shortcoming/defects observed in the assessment of')}

**Sir/Madam,**

This is with reference to the visitation of your college namely **${inst.name} (Inst. ID- ${inst.institute_id})** conducted **on ${visFrom} and ${visTo} on ${mode} mode** as a part of annual visitation by the visitation team of Medical Assessment and Rating Board, NCISM to process **the issuance of ${permission} permission with intake capacity of ${intake} seats in ${cat.courseLabel} course under section ${cat.section} of NCISM Act, 2020 and relevant regulations thereunder for the academic session ${app.session || PLACE('session')}.**

Further, the visitation report and all other related documents were assessed in terms of the enforced regulations, namely, "${cat.regulationTitle}", and provisions under the NCISM Act, 2020 and relevant Regulations there under. **On careful examination of the assessment report and as per the Visitor Observation following shortcomings/defects have been observed:-**

${shortcomingList(ctx.findings)}

Therefore, you are directed to submit the clarification on the aforementioned **shortcoming/defects** within ${PLACE('N')} day(s) for processing of **the issuance of ${permission} permission with intake capacity of ${intake} seats in ${cat.courseLabel} course under section ${cat.section} of NCISM Act, 2020 and relevant regulations thereunder for the academic session ${app.session || PLACE('session')}.**

${signatory(actor)}

${COPY_TO}

${signatory(actor)}`;
}

function hearingBody(ctx) {
  const { inst, cat, intake, app, meeting, hearing } = ctx;
  const meetingNo = meeting?.number || PLACE('Board meeting no.');
  const meetingDate = fmtDate(meeting?.scheduled_at) || PLACE('Board meeting date');
  const hearingDate = fmtDate(hearing?.scheduled_at) || PLACE('hearing date');
  return `In view of above, assessment report was placed in the **${meetingNo} Board meeting** of Medical Assessment and Rating Board for Indian System of Medicine (NCISM) held on **${meetingDate}.** On careful examination of the assessment report, **Board decided to provide an opportunity of hearing to your college** as per the regulation ${cat.hearingRegulation} of ${cat.regulationShort}.

Therefore, you are hereby given an opportunity of hearing on **${hearingDate}** to appear before the designated Hearing Committee as appointed by President, Medical Assessment and Rating Board, NCISM and present your case and clarify the above position and to show cause as to **why not the ${app.permission_type || 'permission'} to your college with intake capacity of ${intake} seats in ${cat.courseLabel} course for the academic session ${app.session || PLACE('session')} under section ${cat.section} of NCISM Act, 2020 be denied**.

**Hearing will be done virtually i.e., through video conferencing and the link, timing and other details of the same will be communicated separately.**

It is further directed that you may make oral as well as written submissions before the designated hearing committee and produce all relevant valid documents/records/proof in original (scanned format PDF) to substantiate your claims against all the deficiencies/shortcomings as indicated above and submit an authenticated copy for evidence/verifications to Medical Assessment and Rating Board for Indian System of Medicine on email i.e. president.marbism@ncismindia.org before ${PLACE('submission deadline')} as per necessity or in respect of shortcoming mentioned above only.

It may also be noted that no further hearing opportunity will be given in case you do not attend the hearing at the stipulated time and date. Further, it will be presumed that you have nothing to say and required necessary action in terms of the NCISM Act and the relevant regulations thereunder will be taken based on available records.`;
}

function renderHearingWithout(ctx) {
  const { inst, cat, actor, visFrom, visTo, mode, intake, app } = ctx;
  return `# Hearing Notice

**Ref. No.:** ${ctx.refNo}
**Dated:** ${today()}

${toBlock(inst)}

${subject(ctx, 'Matter related to grant of hearing in respect of issuance of permission to')}

**Sir/Madam,**

I am to here by state that, to verify the physical and other infrastructure facilities available in respect of issuance of permission to **${inst.name} (Inst. ID-${inst.institute_id}) with intake capacity of ${intake} seats in ${cat.courseLabel} course for the academic session ${app.session || PLACE('session')} under section ${cat.section} of NCISM Act, 2020**, your College was visited **on ${visFrom} and ${visTo} on ${mode} mode** by the visitation team of the Medical Assessment & Rating Board, National Commission for Indian System of Medicine.

Further, in view of above, the college has been assessed on the basis of concerned regulations. **On examining following shortcoming/defects were observed:-**

${staffTables(ctx.findings)}
${hearingBody(ctx)}

**This is issued with the approval of the competent authority.**
${signatory(actor)}

${COPY_TO}

${signatory(actor)}`;
}

function renderHearingWith(ctx) {
  const { inst, cat, actor, visFrom, visTo, mode, intake, app, clarLetter, clarResp } = ctx;
  const clarRef = clarLetter?.ref_no || PLACE('clarification letter ref');
  const clarDate = fmtDate(clarLetter?.created_at) || PLACE('clarification date');
  const respDate = fmtDate(clarResp?.responded_at) || PLACE('response date');
  const meetingNo = ctx.meeting?.number || PLACE('Board meeting no.');
  const meetingDate = fmtDate(ctx.meeting?.scheduled_at) || PLACE('Board meeting date');
  return `# Hearing Notice

**Ref. No.:** ${ctx.refNo}
**Dated:** ${today()}

${toBlock(inst)}

${subject(ctx, 'Matter related to grant of hearing in respect of issuance of permission to')}

**Sir/Madam,**

I am to here by state that, to verify the physical and other infrastructure facilities available at **${inst.name} (Inst. ID-${inst.institute_id}) for issuance of permission with an intake capacity of ${intake} seats in ${cat.courseLabel} course for the academic session ${app.session || PLACE('session')}, under section ${cat.section} of NCISM Act, 2020**, your College was visited **on ${visFrom} and ${visTo} on ${mode} mode** by the visitation team of the Medical Assessment & Rating Board, National Commission for Indian System of Medicine.

Further, in view of above, the college has been assessed on the basis of concerned regulations. **On examining following shortcoming were observed:-**

${staffTables(ctx.findings)}
Accordingly, the aforementioned shortcomings/defects found in the assessment report was informed to you vide letter ref. no. **${clarRef} dated ${clarDate}. In response of the same you have submitted the clarification** dated **${respDate}.**

In view of the clarification submitted by you, the assessment report has been carefully examined once again in terms of the concerned Regulation and provisions under the NCISM Act, 2020 and relevant regulations thereunder, and the report was again placed in the **${meetingNo} Board meeting** of Medical Assessment and Rating Board for Indian System of Medicine (NCISM) held on **${meetingDate}.** On careful examination, as per the regulation ${cat.hearingRegulation} of ${cat.regulationShort}, before issuing the order for seat reduction/denial of permission an opportunity of hearing shall be given to the institution. Therefore, **Board decided to provide an opportunity of hearing to your college for the observed shortcoming.**

${hearingBody(ctx).split('\n').slice(2).join('\n')}

${signatory(actor)}

${COPY_TO}

${signatory(actor)}`;
}

function renderFinalOrder(ctx) {
  const { inst, cat, actor, intake, app } = ctx;
  const outcome = app.outcome;
  const seats = app.approved_seats;
  let decisionLine;
  if (outcome === 'grant') decisionLine = `permission is **granted** with the full intake capacity of ${intake} seats.`;
  else if (outcome === 'grant_with_conditions') decisionLine = `permission is **granted with conditions** for the intake capacity of ${intake} seats, subject to compliance with the shortcomings noted below.`;
  else if (outcome === 'reduce_intake') decisionLine = `permission is granted with a **reduced intake capacity of ${seats ?? PLACE('approved seats')} seats** (reduced from ${intake} seats).`;
  else if (outcome === 'deny') decisionLine = `permission is **denied** for the academic session ${app.session || PLACE('session')}.`;
  else decisionLine = PLACE('board decision');

  const penalties = [];
  (ctx.punitive?.contributions || []).forEach((c) => {
    if (c.type === 'denial') penalties.push(`- Denial-class deficiency: ${clean(c.detail)}.`);
    else if (c.seats) penalties.push(`- Seat reduction: ${c.seats} seat(s) — ${clean(c.detail)}.`);
  });
  const penaltyBlock = penalties.length ? `\n**Punitive actions:-**\n\n${penalties.join('\n')}\n` : '';

  return `# FINAL ORDER

**Ref. No.:** ${ctx.refNo}
**Dated:** ${today()}

${toBlock(inst)}

**Subject:- Final order in respect of issuance of ${app.permission_type || 'permission'} to ${inst.name} (Inst. ID- ${inst.institute_id}) with intake capacity of ${intake} seats in ${cat.courseLabel} course under section ${cat.section} of NCISM Act, 2020 for the academic session ${app.session || PLACE('session')} -reg.**

**Sir/Madam,**

With reference to the assessment of your college and the decision of the Medical Assessment and Rating Board, NCISM, this is to inform you that, in accordance with the NCISM Act, 2020, the ${cat.regulationShort}, and the applicable punitive policy, ${decisionLine}
${penaltyBlock}
This order is issued with the approval of the competent authority.

${signatory(actor)}

${COPY_TO}

${signatory(actor)}`;
}

const RENDERERS = {
  clarification: renderClarification,
  hearing_without_clarification: renderHearingWithout,
  hearing_with_clarification: renderHearingWith,
  final_order: renderFinalOrder,
};

/** Generates a draft letter (not stored). */
async function render(kind, app, actor) {
  const fn = RENDERERS[kind];
  if (!fn) throw ApiError.badRequest('VALIDATION_ERROR', `Unknown letter kind "${kind}"`);
  const ctx = await buildContext(app, actor);
  const year = new Date().getFullYear();
  ctx.refNo = `${Math.floor(100 + Math.random() * 899)}/MARB/${year}-${SYS_ABBR[app.system] || 'Ay'}.`;
  return { refNo: ctx.refNo, contentMarkdown: fn(ctx) };
}

/** Stores an issued letter (content already finalized/edited by the actor). */
async function issue(app, { kind, content, refNo, actor, signedBy }) {
  let markdown = content;
  let ref = refNo;
  if (!markdown) { const drafted = await render(kind, app, actor); markdown = drafted.contentMarkdown; ref = drafted.refNo; }
  return letterRepo.create({
    application_id: app.id, kind, ref_no: ref || null, content_markdown: markdown,
    generated_by: actor.id, signed_by: signedBy || actor.id, status: 'issued',
  });
}

function list(applicationId) {
  return letterRepo.listForCase(applicationId);
}

module.exports = { render, issue, list };
