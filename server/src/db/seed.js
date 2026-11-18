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

const SLOT_ORDER = ['morning', 'after_breakfast', 'after_lunch', 'after_dinner'];

function previousMonthInfo(today) {
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

  return { prefix, lastDay };
}

function contextualNote(day, slot) {
  if (slot === 'morning' && day % 6 === 0) return 'Slept well and checked before breakfast.';
  if (slot === 'after_breakfast' && day % 8 === 0) return 'Had oats and fruit for breakfast.';
  if (slot === 'after_lunch' && day % 9 === 0) return 'Walked for 20 minutes after lunch.';
  if (slot === 'after_dinner' && day % 10 === 0) return 'Dinner was later than usual.';
  return null;
}

function readingValue(day, slot, monthOffset = 0) {
  const morning = 92 + ((day * 3 + monthOffset) % 19);
  const offsets = {
    morning: 0,
    after_breakfast: 29 + (day % 7),
    after_lunch: 24 + ((day * 2) % 11),
    after_dinner: 34 + ((day * 3) % 13)
  };
  const occasionalLift = day % 11 === 0 && slot !== 'morning' ? 12 : 0;
  return morning + offsets[slot] + occasionalLift;
}

function currentMonthSample(today) {
  const [year, month, todayNumber] = today.split('-').map(Number);
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  const readings = [];

  for (let day = 1; day <= todayNumber; day += 1) {
    if (day === 3 || day === 12) continue;
    const readingCount = day === todayNumber ? 3 : day % 7 === 0 ? 1 : day % 5 === 0 ? 2 : day % 4 === 0 ? 3 : 4;
    SLOT_ORDER.slice(0, readingCount).forEach((slot) => {
      const date = `${prefix}-${String(day).padStart(2, '0')}`;
      let notes = contextualNote(day, slot);
      if (day === todayNumber && slot === 'morning') notes = 'Fasting reading before breakfast.';
      if (day === todayNumber && slot === 'after_breakfast') notes = 'Took the usual morning medicine.';
      if (day === todayNumber && slot === 'after_lunch') notes = 'A lighter lunch followed by a short walk.';
      readings.push([date, slot, readingValue(day, slot), notes]);
    });
  }

  return readings;
}

function previousMonthSample(today) {
  const { prefix, lastDay } = previousMonthInfo(today);
  const readings = [];

  for (let day = 1; day <= lastDay; day += 1) {
    if (day % 8 === 0 || day === 23) continue;
    const readingCount = day % 6 === 0 ? 2 : day % 4 === 0 ? 3 : 4;
    SLOT_ORDER.slice(0, readingCount).forEach((slot) => {
      const date = `${prefix}-${String(day).padStart(2, '0')}`;
      readings.push([date, slot, readingValue(day, slot, 5), contextualNote(day, slot)]);
    });
  }

  return readings;
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
    const currentMonthReadings = currentMonthSample(today);
    const previousMonthReadings = previousMonthSample(today);

    for (const [readingDate, slot, value, notes] of [...currentMonthReadings, ...previousMonthReadings]) {
      await client.query(
        `INSERT INTO readings (user_id, reading_date, slot, value, notes)
         VALUES ($1, $2, $3, $4, $5)`,
        [userResult.rows[0].id, readingDate, slot, value, notes]
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
