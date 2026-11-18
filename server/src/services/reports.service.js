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

function toSummary(row) {
  return {
    highest: row.highest === null ? null : Number(row.highest),
    lowest: row.lowest === null ? null : Number(row.lowest),
    average: row.average === null ? null : Number(row.average),
    count: Number(row.count)
  };
}

export async function getReport(userId, type, selectedDate) {
  const range = dateRange(type, selectedDate);
  const summaryPromise = pool.query(
    `SELECT
       MAX(value)::integer AS highest,
       MIN(value)::integer AS lowest,
       ROUND(AVG(value)::numeric, 1) AS average,
       COUNT(*)::integer AS count
     FROM readings
     WHERE user_id = $1
       AND reading_date BETWEEN $2 AND $3`,
    [userId, range.from, range.to]
  );

  const readingsPromise = type === 'daily'
    ? pool.query(
      `SELECT id, reading_date::text AS "readingDate", slot, value
         FROM readings
        WHERE user_id = $1 AND reading_date = $2
        ORDER BY CASE slot
          WHEN 'morning' THEN 1
          WHEN 'after_breakfast' THEN 2
          WHEN 'after_lunch' THEN 3
          WHEN 'after_dinner' THEN 4
        END`,
      [userId, selectedDate]
    )
    : Promise.resolve({ rows: undefined });

  const [summaryResult, readingsResult] = await Promise.all([summaryPromise, readingsPromise]);
  return {
    type,
    selectedDate,
    ...range,
    ...toSummary(summaryResult.rows[0]),
    ...(readingsResult.rows ? { readings: readingsResult.rows } : {})
  };
}

