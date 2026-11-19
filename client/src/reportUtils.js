import { formatDisplayDate, SLOTS } from './readingConfig.js';

export function daysInRange(from, to) {
  return Math.round((new Date(`${to}T12:00:00Z`) - new Date(`${from}T12:00:00Z`)) / 86400000) + 1;
}

export function formatReportRange(from, to) {
  if (from === to) return formatDisplayDate(from);
  const start = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(end)}`;
  }
  return `${formatDisplayDate(from)} – ${formatDisplayDate(to)}`;
}

export function buildReportInsights(report) {
  const readings = report?.readings ?? [];
  const counts = Object.fromEntries(SLOTS.map((slot) => [slot.value, 0]));
  readings.forEach((reading) => { counts[reading.slot] = (counts[reading.slot] ?? 0) + 1; });
  const mostRecorded = readings.length
    ? [...SLOTS].sort((a, b) => counts[b.value] - counts[a.value])[0]
    : null;
  const daysLogged = report?.daysLogged ?? new Set(readings.map((reading) => reading.readingDate)).size;
  const totalDays = report ? daysInRange(report.from, report.to) : 0;

  return {
    completeDays: report?.completeDays ?? 0,
    coverage: totalDays ? Math.round((daysLogged / totalDays) * 100) : 0,
    daysLogged,
    latest: readings.at(-1) ?? null,
    mostRecorded,
    mostRecordedCount: mostRecorded ? counts[mostRecorded.value] : 0,
    notesCount: readings.filter((reading) => reading.notes?.trim()).length,
    readingsPerLoggedDay: daysLogged ? readings.length / daysLogged : 0,
    totalDays
  };
}
