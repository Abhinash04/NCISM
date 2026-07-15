/**
 * Institutions master registry + staff allotments (state × system routing that
 * becomes the analyst own-scope in later phases).
 */

exports.up = async function up(knex) {
  await knex.schema.createTable('institutions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('institute_id').notNullable().unique(); // AYU0001 / UNI#### / SI#### / SW####
    t.enu('system', ['ayurveda', 'unani', 'siddha', 'sowa_rigpa'], { useNative: true, enumName: 'medicine_system' })
      .notNullable();
    t.string('state').notNullable();
    t.text('name').notNullable(); // full college name (address embedded in source)
    t.string('file_number');
    t.string('email');
    t.string('contact');
    t.enu('status', ['active', 'inactive'], { useNative: true, enumName: 'institution_status' })
      .notNullable().defaultTo('active');
    t.string('source').defaultTo('master-data');
    t.timestamps(true, true);
    t.index(['system', 'state']);
    t.index('state');
  });

  await knex.schema.createTable('staff_allotments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.enu('system', ['ayurveda', 'unani', 'siddha', 'sowa_rigpa'], { useNative: true, enumName: 'medicine_system', existingType: true })
      .notNullable();
    t.string('state').notNullable();
    t.unique(['user_id', 'system', 'state']);
    t.index(['system', 'state']);
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('staff_allotments');
  await knex.schema.dropTableIfExists('institutions');
  await knex.raw('DROP TYPE IF EXISTS institution_status');
  await knex.raw('DROP TYPE IF EXISTS medicine_system');
};
