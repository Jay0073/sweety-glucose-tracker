import { SLOT_LABELS } from './readingConfig.js';

function csvCell(value) {
  const text = String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
}

export function downloadReadingsCsv(readings, filename) {
  const header = ['Date', 'Time slot', 'Glucose (mg/dl)', 'Notes'];
  const rows = readings.map((reading) => [
    reading.readingDate,
    SLOT_LABELS[reading.slot] ?? reading.slot,
    reading.value,
    reading.notes ?? ''
  ]);
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
