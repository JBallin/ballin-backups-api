const request = require('supertest');
const { assert } = require('chai');
const app = require('../src/app');
const { seeds } = require('../seeds/001users');
const knex = require('../knex');
const { createToken } = require('../src/utils/auth');
const { formatErr } = require('./utils/errors');

const errors = {
  // ID
  uuid: id => `Invalid UUID '${id}'`,
  idDNE: id => `No user with ID '${id}'`,
  // POST
  noBody: 'No body',
  missing: fields => `Missing fields: ${fields.join(', ').trim(',')}`,
  unique: (field, key) => `User with ${field} '${key}' already exists`,
  extra: fields => `Extra fields: ${fields.join(', ').trim(',')}`,
  invalidEmail: email => `'${email}' is not a valid email`,
  invalidUsernameSpaces: 'Username cannot contain spaces',
  invalidUsernameLength: 'Username cannot exceed 36 characters',
  // GIST_ID
  gistDNE: id => `No gist with ID '${id}'`,
  invalidBSGist: 'Invalid ballin-scripts gist',
  // PUT
  invalid: fields => `Invalid fields: ${fields.join(', ').trim(',')}`,
  invalidCurrPwd: 'Invalid current password',
  missingCurrPwd: 'Missing current password',
  // TOKEN
  invalidJWT: 'Invalid token',
  unauthorized: 'Unauthorized',
  noToken: 'Missing token',
  demoDisabled: 'Updating or deleting the demo account is disabled',
};

const payload = {
  gist_id: 'f7217444324b91f926d01e1c02ce2755',
  username: 'super_coder',
  email: 'git_creator@gmail.com',
};
const [demoUser, testUser] = seeds;
const payloadWithPassword = { ...payload, password: 'hello' };
const invalidCurrPwd = 'invalid';
const validCurrPwd = 'hello';
const putPayloadWithCurrPassword = { ...payload, password: 'new', currentPassword: validCurrPwd };
const putPayloadWithInvalidCurrPassword = { ...payload, password: 'new', currentPassword: invalidCurrPwd };
const uuidThatDNE = 'de455777-255e-4e61-b53c-6dd942f1ad7c';
const badId = '1';
const testToken = createToken({ id: testUser.id });
const demoToken = createToken({ id: demoUser.id });
const invalidToken = createToken({ id: testUser.id }, 0);
const wrongUserToken = createToken({ id: uuidThatDNE });
const invalidGistId = '2';
const invalidBSGistId = '1';
const testUserInfoWithCurrPwd = {
  email: testUser.email,
  gist_id: testUser.gist_id,
  username: testUser.username,
  currentPassword: validCurrPwd,
};
const invalidEmail = 'invalid';
const usernameWithSpaces = 'user name';
const longUsername = 'ThisUsernameIsJustTooLongUnfortunately';

describe('/users', () => {
  describe('GET', () => {
    it('should return users', (done) => {
      request(app)
        .get('/users')
        .expect(200)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) return done(formatErr(err, res));
          const { id, username } = testUser;
          assert.deepEqual(res.body[1], {
            id, username,
          });
          return done();
        });
    });
  });
  describe('POST', () => {
    it('should create user', (done) => {
      request(app)
        .post('/users')
        .send(payloadWithPassword)
        .expect(201)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) return done(formatErr(err, res));
          assert.equal(res.body.new_user, payload.username);
          return knex('users')
            .where('username', payload.username)
            .first()
            .then((user) => {
              assert.equal(user.email, payload.email);
            })
            .then(done);
        });
    });
    it('should error with missing fields', (done) => {
      request(app)
        .post('/users')
        .send(payload)
        .expect(400)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) return done(formatErr(err, res));
          assert.deepEqual(res.body.error, errors.missing(['password']));
          return done();
        });
    });
    it('should error with empty body', (done) => {
      request(app)
        .post('/users')
        .expect(400)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) return done(formatErr(err, res));
          assert.deepEqual(res.body.error, errors.noBody);
          return done();
        });
    });
    it('should error with extra fields', (done) => {
      request(app)
        .post('/users')
        .send({ ...payloadWithPassword, extra: 'hi' })
        .expect(400)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) return done(formatErr(err, res));
          assert.equal(res.body.error, errors.extra(['extra']));
          return done();
        });
    });
    it('should error with existing email', (done) => {
      request(app)
        .post('/users')
        .send({ ...payloadWithPassword, email: testUser.email })
        .expect(400)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) return done(formatErr(err, res));
          assert.equal(res.body.error, errors.unique('email', testUser.email));
          return done();
        });
    });
    it('should error with existing username', (done) => {
      request(app)
        .post('/users')
        .send({ ...payloadWithPassword, username: testUser.username })
        .expect(400)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) return done(formatErr(err, res));
          assert.equal(res.body.error, errors.unique('username', testUser.username));
          return done();
        });
    });
    it('should error with existing gist_id', (done) => {
      request(app)
        .post('/users')
        .send({ ...payloadWithPassword, gist_id: testUser.gist_id })
        .expect(400)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) return done(formatErr(err, res));
          assert.equal(res.body.error, errors.unique('gist_id', testUser.gist_id));
          return done();
        });
    });
    it('should error with invalid gist_id', (done) => {
      request(app)
        .post('/users')
        .send({ ...payloadWithPassword, gist_id: invalidGistId })
        .expect(400)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) return done(formatErr(err, res));
          assert.equal(res.body.error, errors.gistDNE(invalidGistId));
          return done();
        });
    });
    it('should error with invalid ballin-scripts gist_id', (done) => {
      request(app)
        .post('/users')
        .send({ ...payloadWithPassword, gist_id: invalidBSGistId })
        .expect(400)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) return done(formatErr(err, res));
          assert.equal(res.body.error, errors.invalidBSGist);
          return done();
        });
    });
    it('should error with invalid email', (done) => {
      request(app)
        .post('/users')
        .send({ ...payloadWithPassword, email: invalidEmail })
        .expect(400)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) return done(formatErr(err, res));
          assert.equal(res.body.error, errors.invalidEmail(invalidEmail));
          return done();
        });
    });
    it('should error with username that has spaces', (done) => {
      request(app)
        .post('/users')
        .send({ ...payloadWithPassword, username: usernameWithSpaces })
        .expect(400)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) return done(formatErr(err, res));
          assert.equal(res.body.error, errors.invalidUsernameSpaces);
          return done();
        });
    });
    it('should error with username longer than 36 characters', (done) => {
      request(app)
        .post('/users')
        .send({ ...payloadWithPassword, username: longUsername })
        .expect(400)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) return done(formatErr(err, res));
          assert.equal(res.body.error, errors.invalidUsernameLength);
          return done();
        });
    });
  });
});

describe('/users/:id', () => {
  describe('GET', () => {
    it('should return user (without hashed_pwd)', (done) => {
      request(app)
        .get(`/users/${testUser.id}`)
        .set('Cookie', [`token=${testToken}`])
        .expect(200)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) return done(formatErr(err, res));
          assert.equal(res.body.name, testUser.name);
          assert.equal(res.body.username, testUser.username);
          assert.equal(res.body.email, testUser.email);
          assert.equal(res.body.gist_id, testUser.gist_id);
          assert.isString(res.body.updated_at);
          assert.isString(res.body.created_at);
          assert.notProperty(res.body, 'hashed_pwd');
          return done();
        });
    });
    it('should error with no token', (done) => {
      request(app)
        .get(`/users/${testUser.id}`)
        .expect(403)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) return done(formatErr(err, res));
          assert.equal(res.body.error, errors.noToken);
          return done();
        });
    });
    it('should error with invalid token', (done) => {
      request(app)
        .get(`/users/${testUser.id}`)
        .set('Cookie', [`token=${invalidToken}`])
        .expect(403)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) return done(formatErr(err, res));
          assert.equal(res.body.error, errors.invalidJWT);
          return done();
        });
    });
    it('should error with unauthorized token', (done) => {
      request(app)
        .get(`/users/${testUser.id}`)
        .set('Cookie', [`token=${wrongUserToken}`])
        .expect(403)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) return done(formatErr(err, res));
          assert.equal(res.body.error, errors.unauthorized);
          return done();
        });
    });
    it('should error with invalid ID', (done) => {
      request(app)
        .get(`/users/${badId}`)
        .expect(400)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) return done(formatErr(err, res));
          assert.equal(res.body.error, errors.uuid(badId));
          return done();
        });
    });
    it('should error with non-existent ID', (done) => {
      request(app)
        .get(`/users/${uuidThatDNE}`)
        .expect(400)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) return done(formatErr(err, res));
          assert.equal(res.body.error, errors.idDNE(uuidThatDNE));
          return done();
        });
    });
  });

  describe('PUT', () => {
    it('should update user password, gist_id, email, and username', (done) => {
      request(app)
        .put(`/users/${testUser.id}`)
        .set('Cookie', `token=${testToken}`)
        .send(putPayloadWithCurrPassword)
        .expect(200)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) return done(formatErr(err, res));
          return knex('users')
            .where('id', testUser.id)
            .first()
            .then((user) => {
              assert.equal(user.username, payload.username);
              assert.notEqual(user.username, testUser.username);
              assert.equal(user.gist_id, payload.gist_id);
              assert.notEqual(user.gist_id, testUser.gist_id);
              assert.equal(user.email, payload.email);
              assert.notEqual(user.email, testUser.email);
              assert.notEqual(user.hashed_pwd, testUser.hashed_pwd);
              assert.equal(user.name, testUser.name);
              assert.equal(user.id, testUser.id);
              assert.notDeepEqual(user.created_at, user.updated_at);
            })
            .then(done);
        });
    });
    it('should update username', (done) => {
      const newUsername = 'new_username';
      request(app)
        .put(`/users/${testUser.id}`)
        .set('Cookie', `token=${testToken}`)
        .send({ username: newUsername, currentPassword: validCurrPwd })
        .expect(200)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) return done(formatErr(err, res));
          const { password } = res.body;
          assert.isUndefined(password, 'password should not be returned if not edited');
          return knex('users')
            .where('id', testUser.id)
            .first()
            .then((user) => {
              assert.equal(user.username, newUsername);
              assert.notEqual(user.username, testUser.username);
              assert.equal(user.gist_id, testUser.gist_id);
              assert.equal(user.email, testUser.email);
              assert.equal(user.hashed_pwd, testUser.hashed_pwd);
              assert.equal(user.name, testUser.name);
              assert.equal(user.id, testUser.id);
              assert.notDeepEqual(user.created_at, user.updated_at);
            })
            .then(done);
        });
    });
    describe('should error with existing...', () => {
      beforeEach((done) => {
        request(app)
          .post('/users')
          .send(payloadWithPassword)
          .expect(201, done);
      });

      it('username', (done) => {
        request(app)
          .put(`/users/${testUser.id}`)
          .set('Cookie', `token=${testToken}`)
          .send({ username: payload.username, currentPassword: validCurrPwd })
          .expect(400)
          .expect('Content-Type', /json/)
          .end((err, res) => {
            if (err) return done(formatErr(err, res));
            assert.equal(res.body.error, errors.unique('username', payload.username));
            return knex('users')
              .where('id', testUser.id)
              .first()
              .then((user) => {
                assert.equal(user.username, testUser.username);
                assert.notEqual(user.username, payload.username);
                assert.equal(user.gist_id, testUser.gist_id);
                assert.notEqual(user.gist_id, payload.gist_id);
                assert.equal(user.email, testUser.email);
                assert.notEqual(user.email, payload.email);
                assert.equal(user.hashed_pwd, testUser.hashed_pwd);
                assert.equal(user.name, testUser.name);
                assert.equal(user.id, testUser.id);
                assert.deepEqual(user.created_at, user.updated_at);
              })
              .then(done);
          });
      });
      it('email', (done) => {
        request(app)
          .put(`/users/${testUser.id}`)
          .set('Cookie', `token=${testToken}`)
          .send({ email: payload.email, currentPassword: validCurrPwd })
          .expect(400)
          .expect('Content-Type', /json/)
          .end((err, res) => {
            if (err) return done(formatErr(err, res));
            assert.equal(res.body.error, errors.unique('email', payload.email));
            return knex('users')
              .where('id', testUser.id)
              .first()
              .then((user) => {
                assert.equal(user.username, testUser.username);
                assert.notEqual(user.username, payload.username);
                assert.equal(user.gist_id, testUser.gist_id);
                assert.notEqual(user.gist_id, payload.gist_id);
                assert.equal(user.email, testUser.email);
                assert.notEqual(user.email, payload.email);
                assert.equal(user.hashed_pwd, testUser.hashed_pwd);
                assert.equal(user.name, testUser.name);
                assert.equal(user.id, testUser.id);
                assert.deepEqual(user.created_at, user.updated_at);
              })
              .then(done);
          });
      });
      it('gist_id', (done) => {
        request(app)
          .put(`/users/${testUser.id}`)
          .set('Cookie', `token=${testToken}`)
          .send({ gist_id: payload.gist_id, currentPassword: validCurrPwd })
          .expect(400)
          .expect('Content-Type', /json/)
          .end((err, res) => {
            if (err) return done(formatErr(err, res));
            assert.equal(res.body.error, errors.unique('gist_id', payload.gist_id));
            return knex('users')
              .where('id', testUser.id)
              .first()
              .then((user) => {
                assert.equal(user.username, testUser.username);
                assert.notEqual(user.username, payload.username);
                assert.equal(user.gist_id, testUser.gist_id);
                assert.notEqual(user.gist_id, payload.gist_id);
                assert.equal(user.email, testUser.email);
                assert.notEqual(user.email, payload.email);
                assert.equal(user.hashed_pwd, testUser.hashed_pwd);
                assert.equal(user.name, testUser.name);
                assert.equal(user.id, testUser.id);
                assert.deepEqual(user.created_at, user.updated_at);
              })
              .then(done);
          });
      });
      it('should not error when given the updating users\' data', (done) => {
        request(app)
          .put(`/users/${testUser.id}`)
          .set('Cookie', `token=${testToken}`)
          .send(testUserInfoWithCurrPwd)
          .expect(200)
          .expect('Content-Type', /json/)
          .end((err, res) => {
            if (err) return done(formatErr(err, res));
            return knex('users')
              .where('id', testUser.id)
              .first()
              .then((user) => {
                assert.equal(user.username, testUser.username);
                assert.notEqual(user.username, payload.username);
                assert.equal(user.gist_id, testUser.gist_id);
                assert.notEqual(user.gist_id, payload.gist_id);
                assert.equal(user.email, testUser.email);
                assert.notEqual(user.email, payload.email);
                assert.equal(user.hashed_pwd, testUser.hashed_pwd);
                assert.equal(user.name, testUser.name);
                assert.equal(user.id, testUser.id);
                assert.notDeepEqual(user.created_at, user.updated_at);
              })
              .then(done);
          });
      });
    });
    it('should error with no token', (done) => {
      request(app)
        .put(`/users/${testUser.id}`)
        .send(putPayloadWithCurrPassword)
        .expect(403)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) return done(formatErr(err, res));
          assert.equal(res.body.error, errors.noToken);
          return knex('users')
            .where('id', testUser.id)
            .first()
            .then((user) => {
              assert.equal(user.username, testUser.username);
              assert.notEqual(user.username, payload.username);
              assert.equal(user.gist_id, testUser.gist_id);
              assert.notEqual(user.gist_id, payload.gist_id);
              assert.equal(user.email, testUser.email);
              assert.notEqual(user.email, payload.email);
              assert.equal(user.hashed_pwd, testUser.hashed_pwd);
              assert.equal(user.name, testUser.name);
              assert.equal(user.id, testUser.id);
              assert.deepEqual(user.created_at, user.updated_at);
            })
            .then(done);
        });
    });
    it('should error without current password', (done) => {
      request(app)
        .put(`/users/${testUser.id}`)
        .set('Cookie', `token=${testToken}`)
        .send(payload)
        .expect(401)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) return done(formatErr(err, res));
          assert.equal(res.body.error, errors.missingCurrPwd);
          return knex('users')
            .where('id', testUser.id)
            .first()
            .then((user) => {
              assert.equal(user.username, testUser.username);
              assert.notEqual(user.username, payload.username);
              assert.equal(user.gist_id, testUser.gist_id);
              assert.notEqual(user.gist_id, payload.gist_id);
              assert.equal(user.email, testUser.email);
              assert.notEqual(user.email, payload.email);
              assert.equal(user.hashed_pwd, testUser.hashed_pwd);
              assert.equal(user.name, testUser.name);
              assert.equal(user.id, testUser.id);
              assert.deepEqual(user.created_at, user.updated_at);
            })
            .then(done);
        });
    });
    it('should error with invalid current password', (done) => {
      request(app)
        .put(`/users/${testUser.id}`)
        .set('Cookie', `token=${testToken}`)
        .send(putPayloadWithInvalidCurrPassword)
        .expect(401)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) return done(formatErr(err, res));
          assert.equal(res.body.error, errors.invalidCurrPwd);
          return knex('users')
            .where('id', testUser.id)
            .first()
            .then((user) => {
              assert.equal(user.username, testUser.username);
              assert.notEqual(user.username, payload.username);
              assert.equal(user.gist_id, testUser.gist_id);
              assert.notEqual(user.gist_id, payload.gist_id);
              assert.equal(user.email, testUser.email);
              assert.notEqual(user.email, payload.email);
              assert.equal(user.hashed_pwd, testUser.hashed_pwd);
              assert.equal(user.name, testUser.name);
              assert.equal(user.id, testUser.id);
              assert.deepEqual(user.created_at, user.updated_at);
            })
            .then(done);
        });
    });
    it('should error with invalid token', (done) => {
      request(app)
        .put(`/users/${testUser.id}`)
        .set('Cookie', `token=${invalidToken}`)
        .send(putPayloadWithCurrPassword)
        .expect(403)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) return done(formatErr(err, res));
          assert.equal(res.body.error, errors.invalidJWT);
          return knex('users')
            .where('id', testUser.id)
            .first()
            .then((user) => {
              assert.equal(user.username, testUser.username);
              assert.notEqual(user.username, payload.username);
              assert.equal(user.gist_id, testUser.gist_id);
              assert.notEqual(user.gist_id, payload.gist_id);
              assert.equal(user.email, testUser.email);
              assert.notEqual(user.email, payload.email);
              assert.equal(user.hashed_pwd, testUser.hashed_pwd);
              assert.equal(user.name, testUser.name);
              assert.equal(user.id, testUser.id);
              assert.deepEqual(user.created_at, user.updated_at);
            })
            .then(done);
        });
    });
    it('should error with unauthorized token', (done) => {
      request(app)
        .put(`/users/${testUser.id}`)
        .set('Cookie', `token=${wrongUserToken}`)
        .send(putPayloadWithCurrPassword)
        .expect(403)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) return done(formatErr(err, res));
          assert.equal(res.body.error, errors.unauthorized);
          return knex('users')
            .where('id', testUser.id)
            .first()
            .then((user) => {
              assert.equal(user.username, testUser.username);
              assert.notEqual(user.username, payload.username);
              assert.equal(user.gist_id, testUser.gist_id);
              assert.notEqual(user.gist_id, payload.gist_id);
              assert.equal(user.email, testUser.email);
              assert.notEqual(user.email, payload.email);
              assert.equal(user.hashed_pwd, testUser.hashed_pwd);
              assert.equal(user.name, testUser.name);
              assert.equal(user.id, testUser.id);
              assert.deepEqual(user.created_at, user.updated_at);
            })
            .then(done);
        });
    });
    it('should error with empty body (but with current password)', (done) => {
      request(app)
        .put(`/users/${testUser.id}`)
        .set('Cookie', `token=${testToken}`)
        .send({ currentPassword: validCurrPwd })
        .expect(400)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) return done(formatErr(err, res));
          assert.equal(res.body.error, errors.noBody);
          return knex('users')
            .where('id', testUser.id)
            .first()
            .then((user) => {
              assert.equal(user.username, testUser.username);
              assert.notEqual(user.username, payload.username);
              assert.equal(user.gist_id, testUser.gist_id);
              assert.notEqual(user.gist_id, payload.gist_id);
              assert.equal(user.email, testUser.email);
              assert.notEqual(user.email, payload.email);
              assert.equal(user.hashed_pwd, testUser.hashed_pwd);
              assert.equal(user.name, testUser.name);
              assert.equal(user.id, testUser.id);
              assert.deepEqual(user.created_at, user.updated_at);
            })
            .then(done);
        });
    });
    it('should error with non-existent ID', (done) => {
      request(app)
        .put(`/users/${uuidThatDNE}`)
        .send(putPayloadWithCurrPassword)
        .expect(400)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) return done(formatErr(err, res));
          assert.equal(res.body.error, errors.idDNE(uuidThatDNE));
          return knex('users')
            .where('id', testUser.id)
            .first()
            .then((user) => {
              assert.equal(user.username, testUser.username);
              assert.notEqual(user.username, payload.username);
              assert.equal(user.gist_id, testUser.gist_id);
              assert.notEqual(user.gist_id, payload.gist_id);
              assert.equal(user.email, testUser.email);
              assert.notEqual(user.email, payload.email);
              assert.equal(user.hashed_pwd, testUser.hashed_pwd);
              assert.equal(user.name, testUser.name);
              assert.equal(user.id, testUser.id);
              assert.deepEqual(user.created_at, user.updated_at);
            })
            .then(done);
        });
    });
    it('should error with invalid fields', (done) => {
      request(app)
        .put(`/users/${testUser.id}`)
        .set('Cookie', `token=${testToken}`)
        .send({ ...putPayloadWithCurrPassword, bad: 'field' })
        .expect(400)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) return done(formatErr(err, res));
          assert.equal(res.body.error, errors.invalid(['bad']));
          return knex('users')
            .where('id', testUser.id)
            .first()
            .then((user) => {
              assert.equal(user.username, testUser.username);
              assert.notEqual(user.username, payload.username);
              assert.equal(user.gist_id, testUser.gist_id);
              assert.notEqual(user.gist_id, payload.gist_id);
              assert.equal(user.email, testUser.email);
              assert.notEqual(user.email, payload.email);
              assert.equal(user.hashed_pwd, testUser.hashed_pwd);
              assert.equal(user.name, testUser.name);
              assert.equal(user.id, testUser.id);
              assert.deepEqual(user.created_at, user.updated_at);
            })
            .then(done);
        });
    });
    it('should error with invalid gistId', (done) => {
      request(app)
        .put(`/users/${testUser.id}`)
        .set('Cookie', `token=${testToken}`)
        .send({ ...putPayloadWithCurrPassword, gist_id: invalidGistId })
        .expect(400)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) return done(formatErr(err, res));
          assert.equal(res.body.error, errors.gistDNE(invalidGistId));
          return knex('users')
            .where('id', testUser.id)
            .first()
            .then((user) => {
              assert.equal(user.username, testUser.username);
              assert.notEqual(user.username, payload.username);
              assert.equal(user.gist_id, testUser.gist_id);
              assert.notEqual(user.gist_id, payload.gist_id);
              assert.equal(user.email, testUser.email);
              assert.notEqual(user.email, payload.email);
              assert.equal(user.hashed_pwd, testUser.hashed_pwd);
              assert.equal(user.name, testUser.name);
              assert.equal(user.id, testUser.id);
              assert.deepEqual(user.created_at, user.updated_at);
            })
            .then(done);
        });
    });
    it('should error with invalid current password before checking gist', (done) => {
      request(app)
        .put(`/users/${testUser.id}`)
        .set('Cookie', `token=${testToken}`)
        .send({ ...putPayloadWithInvalidCurrPassword, gist_id: invalidGistId })
        .expect(401)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) return done(formatErr(err, res));
          assert.equal(res.body.error, errors.invalidCurrPwd);
          return knex('users')
            .where('id', testUser.id)
            .first()
            .then((user) => {
              assert.equal(user.username, testUser.username);
              assert.notEqual(user.username, payload.username);
              assert.equal(user.gist_id, testUser.gist_id);
              assert.notEqual(user.gist_id, payload.gist_id);
              assert.equal(user.email, testUser.email);
              assert.notEqual(user.email, payload.email);
              assert.equal(user.hashed_pwd, testUser.hashed_pwd);
              assert.equal(user.name, testUser.name);
              assert.equal(user.id, testUser.id);
              assert.deepEqual(user.created_at, user.updated_at);
            })
            .then(done);
        });
    });
    it('should error with invalid ballin-scripts gistId', (done) => {
      request(app)
        .put(`/users/${testUser.id}`)
        .set('Cookie', `token=${testToken}`)
        .send({ ...putPayloadWithCurrPassword, gist_id: invalidBSGistId })
        .expect(400)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) return done(formatErr(err, res));
          assert.equal(res.body.error, errors.invalidBSGist);
          return knex('users')
            .where('id', testUser.id)
            .first()
            .then((user) => {
              assert.equal(user.username, testUser.username);
              assert.notEqual(user.username, payload.username);
              assert.equal(user.gist_id, testUser.gist_id);
              assert.notEqual(user.gist_id, payload.gist_id);
              assert.equal(user.email, testUser.email);
              assert.notEqual(user.email, payload.email);
              assert.equal(user.hashed_pwd, testUser.hashed_pwd);
              assert.equal(user.name, testUser.name);
              assert.equal(user.id, testUser.id);
              assert.deepEqual(user.created_at, user.updated_at);
            })
            .then(done);
        });
    });
    it('should error with demo id', (done) => {
      request(app)
        .put(`/users/${demoUser.id}`)
        .set('Cookie', `token=${demoToken}`)
        .send({ ...putPayloadWithCurrPassword })
        .expect(403)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) return done(formatErr(err, res));
          assert.equal(res.body.error, errors.demoDisabled);
          return knex('users')
            .where('id', demoUser.id)
            .first()
            .then((user) => {
              assert.equal(user.username, demoUser.username);
              assert.notEqual(user.username, payload.username);
              assert.equal(user.gist_id, demoUser.gist_id);
              assert.notEqual(user.gist_id, payload.gist_id);
              assert.equal(user.email, demoUser.email);
              assert.notEqual(user.email, payload.email);
              assert.equal(user.hashed_pwd, demoUser.hashed_pwd);
              assert.equal(user.name, demoUser.name);
              assert.equal(user.id, demoUser.id);
              assert.deepEqual(user.created_at, user.updated_at);
            })
            .then(done);
        });
    });
  });
  describe('DELETE', () => {
    it('should delete user', (done) => {
      request(app)
        .delete(`/users/${testUser.id}`)
        .send({ currentPassword: validCurrPwd })
        .set('Cookie', `token=${testToken}`)
        .expect(204)
        .end((err, res) => {
          if (err) return done(formatErr(err, res));
          return knex('users')
            .where('id', testUser.id)
            .then((user) => {
              assert.lengthOf(user, 0);
            })
            .then(done);
        });
    });
    it('should error with invalid currPassword', (done) => {
      request(app)
        .delete(`/users/${testUser.id}`)
        .send({ currentPassword: invalidCurrPwd })
        .set('Cookie', `token=${testToken}`)
        .expect(401)
        .end((err, res) => {
          if (err) return done(formatErr(err, res));
          assert.equal(res.body.error, errors.invalidCurrPwd);
          return knex('users')
            .where('id', testUser.id)
            .then((user) => {
              assert.lengthOf(user, 1);
            })
            .then(done);
        });
    });
    it('should error without currPassword', (done) => {
      request(app)
        .delete(`/users/${testUser.id}`)
        .set('Cookie', `token=${testToken}`)
        .expect(401)
        .end((err, res) => {
          if (err) return done(formatErr(err, res));
          assert.equal(res.body.error, errors.missingCurrPwd);
          return knex('users')
            .where('id', testUser.id)
            .then((user) => {
              assert.lengthOf(user, 1);
            })
            .then(done);
        });
    });
    it('should error with no token', (done) => {
      request(app)
        .delete(`/users/${testUser.id}`)
        .send({ currentPassword: validCurrPwd })
        .expect(403)
        .end((err, res) => {
          if (err) return done(formatErr(err, res));
          assert.equal(res.body.error, errors.noToken);
          return knex('users')
            .where('id', testUser.id)
            .then((user) => {
              assert.lengthOf(user, 1);
            })
            .then(done);
        });
    });
    it('should error with invalid token', (done) => {
      request(app)
        .delete(`/users/${testUser.id}`)
        .set('Cookie', `token=${invalidToken}`)
        .send({ currentPassword: validCurrPwd })
        .expect(403)
        .end((err, res) => {
          if (err) return done(formatErr(err, res));
          assert.equal(res.body.error, errors.invalidJWT);
          return knex('users')
            .where('id', testUser.id)
            .then((user) => {
              assert.lengthOf(user, 1);
            })
            .then(done);
        });
    });
    it('should error with unauthorized token', (done) => {
      request(app)
        .delete(`/users/${testUser.id}`)
        .set('Cookie', `token=${wrongUserToken}`)
        .send({ currentPassword: validCurrPwd })
        .expect(403)
        .end((err, res) => {
          if (err) return done(formatErr(err, res));
          assert.equal(res.body.error, errors.unauthorized);
          return knex('users')
            .where('id', testUser.id)
            .then((user) => {
              assert.lengthOf(user, 1);
            })
            .then(done);
        });
    });
    it('should error with non-existent ID', (done) => {
      request(app)
        .delete(`/users/${uuidThatDNE}`)
        .send({ currentPassword: validCurrPwd })
        .expect(400)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) return done(formatErr(err, res));
          assert.equal(res.body.error, errors.idDNE(uuidThatDNE));
          return knex('users')
            .then((users) => {
              assert.lengthOf(users, seeds.length);
            })
            .then(done);
        });
    });
    it('should error with demo id', (done) => {
      request(app)
        .delete(`/users/${demoUser.id}`)
        .send({ currentPassword: validCurrPwd })
        .set('Cookie', `token=${demoToken}`)
        .expect(403)
        .expect('Content-Type', /json/)
        .end((err, res) => {
          if (err) return done(formatErr(err, res));
          assert.equal(res.body.error, errors.demoDisabled);
          return knex('users')
            .then((users) => {
              assert.lengthOf(users, seeds.length);
            })
            .then(done);
        });
    });
  });
});
