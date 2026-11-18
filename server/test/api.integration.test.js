import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, test } from 'node:test';
import bcrypt from 'bcrypt';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'integration-test-secret';
process.env.TEST_DATABASE_URL ??= 'postgresql://sweety:sweety@127.0.0.1:5433/sweety_test';

const { app } = await import('../src/app.js');
const { pool } = await import('../src/db/pool.js');
const { migrate } = await import('../src/db/migrate.js');

async function register({ name = 'Test Patient', email = 'patient@example.com' } = {}) {
  const response = await request(app)
    .post('/api/auth/register')
    .send({ name, email, password: 'Secret1!' });
  assert.equal(response.status, 201);
  return response.body;
}

function authenticated(token) {
  return { Authorization: `Bearer ${token}` };
}

async function addReading(token, readingDate, slot, value) {
  return request(app)
    .post('/api/readings')
    .set(authenticated(token))
    .send({ readingDate, slot, value });
}

before(async () => {
  await migrate();
});

beforeEach(async () => {
  await pool.query('TRUNCATE readings, users RESTART IDENTITY CASCADE');
});

after(async () => {
  await pool.end();
});

describe('authentication', () => {
  test('registers with a bcrypt hash and logs in without exposing the hash', async () => {
    const registration = await register();
    assert.equal(registration.user.email, 'patient@example.com');
    assert.ok(registration.token);
    assert.equal(registration.user.passwordHash, undefined);

    const stored = await pool.query(
      'SELECT password_hash FROM users WHERE email = $1',
      ['patient@example.com']
    );
    assert.notEqual(stored.rows[0].password_hash, 'Secret1!');
    assert.equal(await bcrypt.compare('Secret1!', stored.rows[0].password_hash), true);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'PATIENT@example.com', password: 'Secret1!' });
    assert.equal(login.status, 200);
    assert.equal(login.body.user.name, 'Test Patient');
  });

  test('rejects duplicate email addresses with a clear message', async () => {
    await register();
    const duplicate = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Another Patient', email: 'patient@example.com', password: 'Secret1!' });

    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.message, 'An account with this email already exists.');
  });
});

describe('readings', () => {
  test('returns the assignment validation messages', async () => {
    const { token } = await register();

    const missing = await addReading(token, '2025-01-15', 'morning', '');
    assert.equal(missing.status, 400);
    assert.equal(missing.body.message, 'Please enter a glucose value.');

    const decimal = await addReading(token, '2025-01-15', 'morning', 120.5);
    assert.equal(decimal.status, 400);
    assert.equal(decimal.body.message, 'Value must be between 40 and 600 mg/dl.');

    const future = await addReading(token, '2999-01-01', 'morning', 120);
    assert.equal(future.status, 400);
    assert.equal(future.body.message, 'Date cannot be in the future.');
  });

  test('prevents duplicate slots and limits a day to four readings', async () => {
    const { token } = await register();
    const date = '2025-01-15';

    assert.equal((await addReading(token, date, 'morning', 101)).status, 201);
    const duplicate = await addReading(token, date, 'morning', 105);
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.message, 'You already have a Morning (fasting) reading for this date.');

    await addReading(token, date, 'after_breakfast', 130);
    await addReading(token, date, 'after_lunch', 140);
    await addReading(token, date, 'after_dinner', 150);
    const fifth = await addReading(token, date, 'after_lunch', 160);
    assert.equal(fifth.status, 409);
    assert.equal(fifth.body.message, 'You can add only 4 readings per day.');
  });

  test('allows changing a value on a full day and protects another user’s data', async () => {
    const owner = await register({ email: 'owner@example.com' });
    const other = await register({ name: 'Other Patient', email: 'other@example.com' });
    const date = '2025-02-12';
    const created = await Promise.all([
      addReading(owner.token, date, 'morning', 100),
      addReading(owner.token, date, 'after_breakfast', 120),
      addReading(owner.token, date, 'after_lunch', 140),
      addReading(owner.token, date, 'after_dinner', 160)
    ]);
    const morningId = created[0].body.reading.id;

    const updated = await request(app)
      .patch(`/api/readings/${morningId}`)
      .set(authenticated(owner.token))
      .send({ value: 104 });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.reading.value, 104);

    const otherList = await request(app)
      .get(`/api/readings?date=${date}`)
      .set(authenticated(other.token));
    assert.equal(otherList.body.data.length, 0);

    const forbiddenUpdate = await request(app)
      .patch(`/api/readings/${morningId}`)
      .set(authenticated(other.token))
      .send({ value: 200 });
    assert.equal(forbiddenUpdate.status, 404);
  });

  test('paginates the newest readings when no date is supplied', async () => {
    const { token } = await register();
    await addReading(token, '2025-03-01', 'morning', 100);
    await addReading(token, '2025-03-02', 'morning', 110);
    await addReading(token, '2025-03-03', 'morning', 120);

    const page = await request(app)
      .get('/api/readings?page=1&limit=2')
      .set(authenticated(token));
    assert.equal(page.status, 200);
    assert.equal(page.body.data.length, 2);
    assert.equal(page.body.data[0].readingDate, '2025-03-03');
    assert.deepEqual(page.body.pagination, { page: 1, limit: 2, total: 3, totalPages: 2 });
  });
});

describe('reports', () => {
  test('calculates daily statistics and lists each slot', async () => {
    const { token } = await register();
    await addReading(token, '2025-01-15', 'morning', 101);
    await addReading(token, '2025-01-15', 'after_breakfast', 139);

    const response = await request(app)
      .get('/api/reports/daily?date=2025-01-15')
      .set(authenticated(token));
    assert.equal(response.status, 200);
    assert.deepEqual(
      {
        highest: response.body.report.highest,
        lowest: response.body.report.lowest,
        average: response.body.report.average,
        count: response.body.report.count
      },
      { highest: 139, lowest: 101, average: 120, count: 2 }
    );
    assert.deepEqual(response.body.report.readings.map((reading) => reading.slot), ['morning', 'after_breakfast']);
  });

  test('handles January rollover for the previous-month report', async () => {
    const { token } = await register();
    await addReading(token, '2024-12-05', 'morning', 110);
    await addReading(token, '2024-12-31', 'after_dinner', 150);

    const response = await request(app)
      .get('/api/reports/monthly?date=2025-01-15')
      .set(authenticated(token));
    assert.equal(response.status, 200);
    assert.deepEqual(
      {
        from: response.body.report.from,
        to: response.body.report.to,
        average: response.body.report.average,
        count: response.body.report.count
      },
      { from: '2024-12-01', to: '2024-12-31', average: 130, count: 2 }
    );
  });

  test('returns null statistics for an empty report', async () => {
    const { token } = await register();
    const response = await request(app)
      .get('/api/reports/month-to-date?date=2025-04-10')
      .set(authenticated(token));

    assert.deepEqual(
      {
        highest: response.body.report.highest,
        lowest: response.body.report.lowest,
        average: response.body.report.average,
        count: response.body.report.count
      },
      { highest: null, lowest: null, average: null, count: 0 }
    );
  });
});
