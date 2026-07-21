/**
 * Org reporting chain: a self-referential supervisor link on users
 * (president → board members → senior consultants → junior consultants).
 */

exports.up = async function up(knex) {
  await knex.schema.alterTable('users', (t) => {
    t.uuid('supervisor_id').references('id').inTable('users').onDelete('SET NULL');
    t.index('supervisor_id');
  });
};

exports.down = async function down(knex) {
  await knex.schema.alterTable('users', (t) => {
    t.dropColumn('supervisor_id');
  });
};
