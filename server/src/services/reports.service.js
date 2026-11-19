import { pool } from '../db/pool.js';
import { ApiError } from '../utils/ApiError.js';
import { isValidDateString, todayInAppTimeZone } from '../utils/dates.js';

const REPORT_TYPES = ['daily', 'month-to-date', 'monthly'];

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function dateRange(type, selectedDate) {
  if (!REPORT_TYPES.includes(type)) throw new ApiError(404, 'Report not found.');
  if (!isValidDateString(selectedDate)) throw new ApiError(400, 'Please pick a valid date.');
  if (selectedDate > todayInAppTimeZone()) {
    throw new ApiError(400, 'Date cannot be in the future.');
  }

  if (type === 'daily') return { from: selectedDate, to: selectedDate };
  if (type === 'month-to-date') {
    return { from: `${selectedDate.slice(0, 7)}-01`, to: selectedDate };
  }

  const [year, month] = selectedDate.split('-').map(Number);
  const firstOfSelectedMonth = new Date(Date.UTC(year, month - 1, 1));
  const lastOfPreviousMonth = new Date(firstOfSelectedMonth);
  lastOfPreviousMonth.setUTCDate(0);
  const firstOfPreviousMonth = new Date(Date.UTC(
    lastOfPreviousMonth.getUTCFullYear(),
    lastOfPreviousMonth.getUTCMonth(),
    1
  ));
  return { from: toIsoDate(firstOfPreviousMonth), to: toIsoDate(lastOfPreviousMonth) };
}

function rangeDays(range) {
  return Math.round((new Date(`${range.to}T12:00:00Z`) - new Date(`${range.from}T12:00:00Z`)) / 86400000) + 1;
}

function customRange(from, to, label) {
  if (!isValidDateString(from) || !isValidDateString(to)) {
    throw new ApiError(400, `Please pick valid dates for ${label}.`);
  }
  if (from > to) throw new ApiError(400, `${label} must start on or before it ends.`);
  if (to > todayInAppTimeZone()) throw new ApiError(400, 'Date cannot be in the future.');
  const range = { from, to };
  if (rangeDays(range) > 366) throw new ApiError(400, `${label} can cover up to 366 days.`);
  return range;
}

function toSummary(row) {
  return {
    highest: row.highest === null ? null : Number(row.highest),
    lowest: row.lowest === null ? null : Number(row.lowest),
    average: row.average === null ? null : Number(row.average),
    count: Number(row.count),
    daysLogged: Number(row.daysLogged),
    completeDays: Number(row.completeDays)
  };
}

async function getSummary(userId, range) {
  const result = await pool.query(
    `WITH daily_counts AS (
       SELECT reading_date, COUNT(*)::integer AS reading_count
       FROM readings
       WHERE user_id = $1 AND reading_date BETWEEN $2 AND $3
       GROUP BY reading_date
     )
     SELECT
       MAX(value)::integer AS highest,
       MIN(value)::integer AS lowest,
       ROUND(AVG(value)::numeric, 1) AS average,
       COUNT(*)::integer AS count,
       COUNT(DISTINCT reading_date)::integer AS "daysLogged",
       (SELECT COUNT(*)::integer FROM daily_counts WHERE reading_count = 4) AS "completeDays"
     FROM readings
     WHERE user_id = $1 AND reading_date BETWEEN $2 AND $3`,
    [userId, range.from, range.to]
  );
  return toSummary(result.rows[0]);
}

async function getReadings(userId, range) {
  const result = await pool.query(
    `SELECT id, reading_date::text AS "readingDate", slot, value, COALESCE(notes, '') AS notes
       FROM readings
      WHERE user_id = $1 AND reading_date BETWEEN $2 AND $3
      ORDER BY reading_date, CASE slot
        WHEN 'morning' THEN 1
        WHEN 'after_breakfast' THEN 2
        WHEN 'after_lunch' THEN 3
        WHEN 'after_dinner' THEN 4
      END`,
    [userId, range.from, range.to]
  );
  return result.rows;
}

export async function getReport(userId, type, selectedDate) {
  const range = dateRange(type, selectedDate);
  const [summary, readings] = await Promise.all([
    getSummary(userId, range),
    getReadings(userId, range)
  ]);
  return {
    type,
    selectedDate,
    ...range,
    ...summary,
    readings
  };
}

export async function getComparison(userId, query) {
  const range = customRange(query.fromA, query.toA, 'Period A');
  const comparisonRange = customRange(query.fromB, query.toB, 'Period B');
  if (range.from === comparisonRange.from && range.to === comparisonRange.to) {
    throw new ApiError(400, 'Choose two different periods to compare.');
  }

  const [summary, comparisonSummary, readings, comparisonReadings] = await Promise.all([
    getSummary(userId, range),
    getSummary(userId, comparisonRange),
    getReadings(userId, range),
    getReadings(userId, comparisonRange)
  ]);

  return {
    type: 'comparison',
    ...range,
    ...summary,
    readings,
    comparison: {
      ...comparisonRange,
      ...comparisonSummary,
      readings: comparisonReadings
    }
  };
}

