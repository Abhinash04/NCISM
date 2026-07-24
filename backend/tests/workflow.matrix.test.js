/**
 * Phase 6c — RBAC guard matrix. A golden table over (status × role × ownership)
 * that locks workflow.service's SoD guarantees: any regression in allowedActions
 * or assertCan (403 ACTION_NOT_ALLOWED / 423 CASE_FINALIZED) fails loudly here.
 * Pure — no DB; the ownership ctx is passed in exactly as buildContext produces it.
 */

const test = require('node:test');
const assert = require('node:assert');

const workflow = require('../src/services/workflow.service');

const user = (...roles) => ({ id: 'u1', roles });
// Every ownership flag defaults false; callers flip only the ones under test.
const ctx = (over = {}) => ({
  isAssignedconsultant: false, isAllottedconsultant: false, supervisesSubmitter: false,
  isCollegeOwner: false, isHearingMember: false, isUploader: false, ...over,
});
const app = (status) => ({ id: 'AYU0001', status });
const sorted = (a) => [...a].sort();
// assert.throws returns undefined, so capture the thrown error to inspect it.
const thrown = (fn) => { try { fn(); } catch (e) { return e; } return null; };

// --- Positive matrix: the right actor, correctly owning the case, sees exactly
// these actions. Each row is one authorized (status, role, ownership) cell. ---
const ALLOWED = [
  ['uploaded',                user('consultant'), ctx({ isAllottedconsultant: true }),               ['process']],
  ['failed',                  user('consultant'), ctx({ isAllottedconsultant: true }),               ['process']],
  ['uploaded',                user('visitor'),           ctx({ isUploader: true }),                     ['delete']],
  ['processed',               user('consultant'), ctx({ isAssignedconsultant: true }),               ['process', 'submit']],
  ['under_validation',        user('consultant'), ctx({ isAssignedconsultant: true }),               ['process', 'submit']],
  ['clarification_responded', user('consultant'), ctx({ isAssignedconsultant: true }),               ['process', 'submit']],
  ['senior_review',           user('senior_consultant'), ctx({ supervisesSubmitter: true }),            ['forward', 'return']],
  ['board_review',            user('board_member'),      ctx(),                                         ['approve', 'reject', 'request_clarification', 'request_hearing']],
  ['board_review',            user('president'),         ctx(),                                         ['approve', 'reject', 'request_clarification', 'request_hearing']],
  ['clarification_open',      user('college'),           ctx({ isCollegeOwner: true }),                 ['respond']],
  ['hearing_requested',       user('president'),         ctx(),                                         ['appoint_committee']],
  ['hearing_scheduled',       user('hearing_committee'), ctx({ isHearingMember: true }),                ['record_minutes']],
  ['approved',                user('secretariat'),       ctx(),                                         ['dispatch_order']],
  ['rejected',                user('consultant'), ctx({ isAllottedconsultant: true }),               ['revise']],
];

test('allowedActions — authorized actors see exactly their actions', () => {
  for (const [status, u, c, expected] of ALLOWED) {
    assert.deepStrictEqual(
      sorted(workflow.allowedActions(app(status), u, c)), sorted(expected),
      `${status} × ${u.roles.join(',')}`,
    );
    // assertCan must pass for every action the matrix grants.
    for (const action of expected) {
      assert.doesNotThrow(() => workflow.assertCan(app(status), u, c, action),
        `assertCan should allow ${action} on ${status} for ${u.roles.join(',')}`);
    }
  }
});

// --- Ownership negatives: correct role, wrong ownership → nothing. ---
test('allowedActions — role without ownership is denied', () => {
  const cases = [
    ['uploaded',           user('consultant'), ctx(/* not allotted */)],
    ['processed',          user('consultant'), ctx({ isAllottedconsultant: true /* allotted ≠ assigned owner */ })],
    ['senior_review',      user('senior_consultant'), ctx(/* does not supervise submitter */)],
    ['clarification_open', user('college'),           ctx(/* wrong college */)],
    ['hearing_scheduled',  user('hearing_committee'), ctx(/* not a member of this hearing */)],
    ['uploaded',           user('visitor'),           ctx(/* not the uploader */)],
  ];
  for (const [status, u, c] of cases) {
    assert.deepStrictEqual(workflow.allowedActions(app(status), u, c), [],
      `${status} × ${u.roles.join(',')} without ownership should allow nothing`);
  }
});

// --- Role negatives: a consultant can't decide, only the President appoints, only
// Secretariat dispatches — the SoD gates. ---
test('allowedActions — wrong role for the state is denied', () => {
  assert.deepStrictEqual(workflow.allowedActions(app('board_review'), user('consultant'), ctx({ isAssignedconsultant: true })), []);
  assert.deepStrictEqual(workflow.allowedActions(app('board_review'), user('senior_consultant'), ctx({ supervisesSubmitter: true })), []);
  // A board_member may decide but may NOT appoint the committee (President-only).
  assert.deepStrictEqual(workflow.allowedActions(app('hearing_requested'), user('board_member'), ctx()), []);
  // Only Secretariat dispatches an approved case.
  assert.deepStrictEqual(workflow.allowedActions(app('approved'), user('president'), ctx()), []);
});

test('assertCan — disallowed action throws 403 ACTION_NOT_ALLOWED', () => {
  const err = thrown(() =>
    workflow.assertCan(app('board_review'), user('consultant'), ctx(), 'approve'));
  assert.strictEqual(err.status, 403);
  assert.strictEqual(err.code, 'ACTION_NOT_ALLOWED');
});

// --- Finalized cases are immutable: closed is fully terminal; approved accepts
// only the secretariat's dispatch. Both throw 423 CASE_FINALIZED. ---
test('assertCan — closed case is fully immutable (423)', () => {
  for (const action of ['process', 'submit', 'approve', 'dispatch_order', 'revise']) {
    const err = thrown(() => workflow.assertCan(app('closed'), user('admin'), ctx(), action));
    assert.strictEqual(err.status, 423, `closed × ${action}`);
    assert.strictEqual(err.code, 'CASE_FINALIZED');
  }
});

test('assertCan — approved rejects everything except dispatch_order (423)', () => {
  for (const action of ['approve', 'reject', 'process', 'request_hearing']) {
    const err = thrown(() => workflow.assertCan(app('approved'), user('secretariat'), ctx(), action));
    assert.strictEqual(err.status, 423, `approved × ${action}`);
    assert.strictEqual(err.code, 'CASE_FINALIZED');
  }
  // dispatch_order is the one permitted transition on an approved case.
  assert.doesNotThrow(() => workflow.assertCan(app('approved'), user('secretariat'), ctx(), 'dispatch_order'));
});

// --- Admin override: may delete any non-finalized case, but not approved/closed. ---
test('allowedActions — admin may delete non-finalized cases only', () => {
  for (const status of ['uploaded', 'processing', 'board_review', 'hearing_scheduled', 'rejected']) {
    assert.ok(workflow.allowedActions(app(status), user('admin'), ctx()).includes('delete'),
      `admin should be able to delete a ${status} case`);
  }
  for (const status of ['approved', 'closed']) {
    assert.ok(!workflow.allowedActions(app(status), user('admin'), ctx()).includes('delete'),
      `admin must NOT delete a finalized (${status}) case`);
  }
});
