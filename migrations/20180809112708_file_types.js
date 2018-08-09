exports.up = knex => (
  knex.schema.createTable('file_types', table => {
    table.increments();
    table.string('title').notNullable();
    table.string('extension').defaultTo('');
    table.integer('categories_id').references('categories_id');
  })
);

exports.down = knex => knex.schema.dropTable('file_types');
