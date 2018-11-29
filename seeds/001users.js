require('dotenv').config();

const seeds = [{
  id: '1ee370d1-2ef3-4c0e-b0f3-6ffccc697dd0',
  gist_id: process.env.GIST_ID || '5fb484f659ccc54a493d4295d6346a39',
  name: null,
  email: 'jballin@fake.com',
  username: 'JBallin',
  hashed_pwd: '$2b$10$fn09RI9qU6OHe6/89oNMn.q/VshQc8V3kzg6x81XvtNJYLUnSd79W',
}];

const seed = knex => (
  knex('users').del()
    .then(() => knex('users').insert(seeds))
);

module.exports = { seeds, seed };
