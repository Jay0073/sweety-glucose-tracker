import { pool } from '../db/pool.js';
import { ApiError } from '../utils/ApiError.js';
import { isValidDateString, todayInAppTimeZone } from '../utils/dates.js';

export const SLOTS = ['morning', 'after_breakfast', 'after_lunch', 'after_dinner'];

export const SLOT_LABELS = {
  morning: 'Morning (fasting)',
  after_breakfast: 'After breakfast',
  after_lunch: 'After lunch',
  after_dinner: 'After dinner'
};

function duplicateMessage(slot) {
  const article = slot === 'morning' ? 'a' : 'an';
  return `You already have ${article} ${SLOT_LABELS[slot]} reading for this date.`;
}

function parseReadingId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) throw new ApiError(404, 'Reading not found.');
  return id;
}

function toReading(row) {
  return {
    id: row.id,
    readingDate: row.reading_date,
    slot: row.slot,
    value: row.value,
    notes: row.notes ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function normalizeNotes(notes) {
  if (notes === undefined || notes === null) return null;
  if (typeof notes !== 'string') throw new ApiError(400, 'Notes must be text.');
  const normalized = notes.trim();
  if (normalized.length > 500) {
    throw new ApiError(400, 'Notes must be 500 characters or fewer.');
  }
  return normalized || null;
}

function validateFields({ readingDate, slot, value, notes }) {
  if (value === undefined || value === null || value === '') {
    throw new ApiError(400, 'Please enter a glucose value.');
  }

  const numericValue = Number(value);
  if (!Number.isInteger(numericValue) || numericValue < 40 || numericValue > 600) {
    throw new ApiError(400, 'Value must be between 40 and 600 mg/dl.');
  }
  if (!isValidDateString(readingDate)) {
    throw new ApiError(400, 'Please pick a valid date.');
  }
  if (readingDate > todayInAppTimeZone()) {
    throw new ApiError(400, 'Date cannot be in the future.');
  }
  if (!SLOTS.includes(slot)) {
    throw new ApiError(400, 'Please pick a time slot.');
  }

  return { readingDate, slot, value: numericValue, notes: normalizeNotes(notes) };
}

async function validateDayRules(database, userId, input, excludeId = null) {
  const result = await database.query(
    `SELECT id, slot
       FROM readings
      WHERE user_id = $1
        AND reading_date = $2
        AND ($3::integer IS NULL OR id <> $3)`,
    [userId, input.readingDate, excludeId]
  );

  if (result.rowCount >= 4) {
    throw new ApiError(409, 'You can add only 4 readings per day.');
  }
  if (result.rows.some((reading) => reading.slot === input.slot)) {
    throw new ApiError(409, duplicateMessage(input.slot));
  }
}

export async function listReadings(userId, { date, page = 1, limit = 20 }) {
  if (date !== undefined) {
    if (!isValidDateString(date)) throw new ApiError(400, 'Please pick a valid date.');
    const result = await pool.query(
      `SELECT id, reading_date::text, slot, value, notes, created_at, updated_at
         FROM readings
        WHERE user_id = $1 AND reading_date = $2
        ORDER BY CASE slot
          WHEN 'morning' THEN 1
          WHEN 'after_breakfast' THEN 2
          WHEN 'after_lunch' THEN 3
          WHEN 'after_dinner' THEN 4
        END`,
      [userId, date]
    );
    return { data: result.rows.map(toReading) };
  }

  const parsedPage = Number(page);
  const parsedLimit = Number(limit);
  if (!Number.isInteger(parsedPage) || parsedPage < 1) {
    throw new ApiError(400, 'Page must be a positive whole number.');
  }
  if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
    throw new ApiError(400, 'Limit must be a whole number between 1 and 100.');
  }

  const offset = (parsedPage - 1) * parsedLimit;
  const [readingsResult, countResult] = await Promise.all([
    pool.query(
      `SELECT id, reading_date::text, slot, value, notes, created_at, updated_at
         FROM readings
        WHERE user_id = $1
        ORDER BY reading_date DESC, CASE slot
          WHEN 'after_dinner' THEN 1
          WHEN 'after_lunch' THEN 2
          WHEN 'after_breakfast' THEN 3
          WHEN 'morning' THEN 4
        END
        LIMIT $2 OFFSET $3`,
      [userId, parsedLimit, offset]
    ),
    pool.query('SELECT COUNT(*)::integer AS count FROM readings WHERE user_id = $1', [userId])
  ]);

  const total = countResult.rows[0].count;
  return {
    data: readingsResult.rows.map(toReading),
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total,
      totalPages: Math.ceil(total / parsedLimit)
    }
  };
}

export async function exportReadings(userId) {
  const result = await pool.query(
    `SELECT id, reading_date::text, slot, value, notes, created_at, updated_at
       FROM readings
      WHERE user_id = $1
      ORDER BY reading_date ASC, CASE slot
        WHEN 'morning' THEN 1
        WHEN 'after_breakfast' THEN 2
        WHEN 'after_lunch' THEN 3
        WHEN 'after_dinner' THEN 4
      END`,
    [userId]
  );
  return { data: result.rows.map(toReading) };
}

export async function createReading(userId, body) {
  const input = validateFields(body);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await validateDayRules(client, userId, input);
    const result = await client.query(
      `INSERT INTO readings (user_id, reading_date, slot, value, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, reading_date::text, slot, value, notes, created_at, updated_at`,
      [userId, input.readingDate, input.slot, input.value, input.notes]
    );
    await client.query('COMMIT');
    return toReading(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      throw new ApiError(409, duplicateMessage(input.slot));
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function updateReading(userId, readingId, changes) {
  const id = parseReadingId(readingId);
  const client = await pool.connect();
  let input;

  try {
    await client.query('BEGIN');
    const currentResult = await client.query(
      `SELECT id, reading_date::text, slot, value, notes
         FROM readings
        WHERE id = $1 AND user_id = $2
        FOR UPDATE`,
      [id, userId]
    );
    if (!currentResult.rowCount) throw new ApiError(404, 'Reading not found.');

    const current = currentResult.rows[0];
    input = validateFields({
      readingDate: changes.readingDate ?? current.reading_date,
      slot: changes.slot ?? current.slot,
      value: changes.value ?? current.value,
      notes: changes.notes !== undefined ? changes.notes : current.notes
    });
    await validateDayRules(client, userId, input, id);

    const result = await client.query(
      `UPDATE readings
          SET reading_date = $1, slot = $2, value = $3, notes = $4, updated_at = NOW()
        WHERE id = $5 AND user_id = $6
        RETURNING id, reading_date::text, slot, value, notes, created_at, updated_at`,
      [input.readingDate, input.slot, input.value, input.notes, id, userId]
    );
    await client.query('COMMIT');
    return toReading(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      throw new ApiError(409, duplicateMessage(input?.slot ?? changes.slot));
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteReading(userId, readingId) {
  const id = parseReadingId(readingId);
  const result = await pool.query(
    'DELETE FROM readings WHERE id = $1 AND user_id = $2 RETURNING id',
    [id, userId]
  );
  if (!result.rowCount) throw new ApiError(404, 'Reading not found.');
}

