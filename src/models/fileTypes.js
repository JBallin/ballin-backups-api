const knex = require('../../knex');
const errors = require('../utils/errors');

const getFileTypes = () => knex('file_types').catch(e => errors.fetchDB('file_types', e));

module.exports = { getFileTypes };
