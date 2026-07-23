/**
 * Migration 012: Workflow & Board Meeting Enhancements
 * - Adds 'clarification_reviewed' to application_status enum
 * - Adds review columns to clarifications table
 * - Adds structured fields to board_meetings and board_meeting_items
 */

exports.config = { transaction: false };

exports.up = async function up(knex) {
  // 1. Enum value for application_status
  await knex.raw("ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'clarification_reviewed'");

  // 2. Add review columns to clarifications table
  const hasReviewRemarks = await knex.schema.hasColumn('clarifications', 'review_remarks');
  if (!hasReviewRemarks) {
    await knex.schema.alterTable('clarifications', (t) => {
      t.text('review_remarks');
      t.string('review_verdict'); // accepted | requires_revision
      t.uuid('reviewed_by').references('id').inTable('users').onDelete('SET NULL');
      t.timestamp('reviewed_at');
    });
  }

  // 3. Add structured fields to board_meetings table
  const hasAgendaText = await knex.schema.hasColumn('board_meetings', 'agenda_text');
  if (!hasAgendaText) {
    await knex.schema.alterTable('board_meetings', (t) => {
      t.text('agenda_text');
      t.text('participants');
      t.text('observations');
      t.text('action_items');
      t.text('recommendations');
    });
  }

  // 4. Add structured fields to board_meeting_items table
  const hasDiscussionNotes = await knex.schema.hasColumn('board_meeting_items', 'discussion_notes');
  if (!hasDiscussionNotes) {
    await knex.schema.alterTable('board_meeting_items', (t) => {
      t.text('discussion_notes');
      t.text('item_decision');
      t.text('item_observations');
    });
  }
};

exports.down = async function down(knex) {
  const hasDiscussionNotes = await knex.schema.hasColumn('board_meeting_items', 'discussion_notes');
  if (hasDiscussionNotes) {
    await knex.schema.alterTable('board_meeting_items', (t) => {
      t.dropColumn('discussion_notes');
      t.dropColumn('item_decision');
      t.dropColumn('item_observations');
    });
  }

  const hasAgendaText = await knex.schema.hasColumn('board_meetings', 'agenda_text');
  if (hasAgendaText) {
    await knex.schema.alterTable('board_meetings', (t) => {
      t.dropColumn('agenda_text');
      t.dropColumn('participants');
      t.dropColumn('observations');
      t.dropColumn('action_items');
      t.dropColumn('recommendations');
    });
  }

  const hasReviewRemarks = await knex.schema.hasColumn('clarifications', 'review_remarks');
  if (hasReviewRemarks) {
    await knex.schema.alterTable('clarifications', (t) => {
      t.dropColumn('review_remarks');
      t.dropColumn('review_verdict');
      t.dropColumn('reviewed_by');
      t.dropColumn('reviewed_at');
    });
  }
};
