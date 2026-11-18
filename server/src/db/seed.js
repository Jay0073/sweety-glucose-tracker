import bcrypt from 'bcrypt';
import { env } from '../config/env.js';
import { pool } from './pool.js';
import { migrate } from './migrate.js';

const DEMO_EMAIL = 'demo@sweety.local';
const DEMO_PASSWORD = 'Sweety123!';

function dateInTimeZone(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: env.appTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);

  const value = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
  return `${value.year}-${value.month}-${value.day}`;
}

function addUtcDays(dateString, amount) {
  const date = new Date(`${dateString}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function previousMonthDates(today) {
  const [year, month] = today.split('-').map(Number);
  const firstOfThisMonth = new Date(Date.UTC(year, month - 1, 1));
  const previousYear = firstOfThisMonth.getUTCMonth() === 0
    ? firstOfThisMonth.getUTCFullYear() - 1
    : firstOfThisMonth.getUTCFullYear();
  const previousMonth = firstOfThisMonth.getUTCMonth() === 0
    ? 12
    : firstOfThisMonth.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, month - 1, 0)).getUTCDate();
  const prefix = `${previousYear}-${String(previousMonth).padStart(2, '0')}`;

  return [`${prefix}-05`, `${prefix}-15`, `${prefix}-${String(lastDay).padStart(2, '0')}`];
}

async function seed() {
  await migrate();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM users WHERE email = $1', [DEMO_EMAIL]);

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    const userResult = await client.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ['Demo Patient', DEMO_EMAIL, passwordHash]
    );

    const today = dateInTimeZone();
    const currentMonthReadings = [
      [addUtcDays(today, -4), 'morning', 104],
      [addUtcDays(today, -4), 'after_breakfast', 142],
      [addUtcDays(today, -2), 'morning', 98],
      [addUtcDays(today, -2), 'after_dinner', 151],
      [today, 'morning', 101],
      [today, 'after_breakfast', 137]
    ];
    const [previousEarly, previousMiddle, previousLast] = previousMonthDates(today);
    const previousMonthReadings = [
      [previousEarly, 'morning', 107],
      [previousEarly, 'after_lunch', 148],
      [previousMiddle, 'morning', 99],
      [previousMiddle, 'after_dinner', 156],
      [previousLast, 'after_breakfast', 139]
    ];

    for (const [readingDate, slot, value] of [...currentMonthReadings, ...previousMonthReadings]) {
      await client.query(
        `INSERT INTO readings (user_id, reading_date, slot, value)
         VALUES ($1, $2, $3, $4)`,
        [userResult.rows[0].id, readingDate, slot, value]
      );
    }

    await client.query('COMMIT');
    console.log('Demo data created.');
    console.log(`Email: ${DEMO_EMAIL}`);
    console.log(`Password: ${DEMO_PASSWORD}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

try {
  await seed();
} catch (error) {
  console.error('Database seed failed:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
