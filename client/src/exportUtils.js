import { SLOT_LABELS } from './readingConfig.js';
import { buildReportInsights } from './reportUtils.js';

function csvCell(value) {
  const text = String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
}

export function downloadReadingsCsv(readings, filename) {
  const header = ['Date', 'Day', 'Time slot', 'Glucose (mg/dl)', 'Notes'];
  const rows = readings.map((reading) => [
    reading.readingDate,
    new Intl.DateTimeFormat('en-IN', { weekday: 'long' }).format(new Date(`${reading.readingDate}T12:00:00`)),
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

const titleCell = { value: 'Sweety glucose report', fontSize: 20, fontWeight: 'bold', color: '#134943' };
const sectionCell = (value) => ({ value, fontWeight: 'bold', color: '#0d6b62', backgroundColor: '#d9eeea' });
const labelCell = (value) => ({ value, fontWeight: 'bold', color: '#617572' });
const headerCell = (value) => ({ value, fontWeight: 'bold', color: '#ffffff', backgroundColor: '#0d6b62', wrap: true });

function textCell(value) {
  return { value: String(value ?? ''), wrap: true };
}

function readingsSheetName(label) {
  return `${label} readings`.slice(0, 31);
}

export async function downloadReportWorkbook({
  report,
  typeLabel,
  user,
  filename,
  currentLabel = 'Selected period',
  comparisonLabel = 'Previous comparable period'
}) {
  const { default: writeExcelFile } = await import('write-excel-file/browser');
  const insights = buildReportInsights(report);
  const generatedAt = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date());
  const comparison = report.comparison;
  const comparisonInsights = comparison
    ? buildReportInsights({ ...comparison, readings: comparison.readings ?? [] })
    : null;
  const summary = [
    [titleCell],
    [],
    [sectionCell('Patient and report'), sectionCell('Details')],
    [labelCell('Patient'), textCell(user.name)],
    [labelCell('Email'), textCell(user.email)],
    [labelCell('Report type'), textCell(typeLabel)],
    [labelCell(currentLabel), textCell(`${report.from} to ${report.to}`)],
    [labelCell('Generated'), textCell(generatedAt)],
    [labelCell('Unit'), textCell('mg/dl')],
    [],
    [sectionCell('Summary'), sectionCell('Value')],
    [labelCell('Highest'), textCell(report.highest ?? 'No data')],
    [labelCell('Lowest'), textCell(report.lowest ?? 'No data')],
    [labelCell('Average'), textCell(report.average === null ? 'No data' : report.average.toFixed(1))],
    [labelCell('Readings'), { value: report.count, type: Number }],
    [labelCell('Days logged'), textCell(`${insights.daysLogged} of ${insights.totalDays}`)],
    [labelCell('Complete four-reading days'), { value: insights.completeDays, type: Number }],
    [labelCell('Readings per logged day'), textCell(insights.readingsPerLoggedDay.toFixed(1))],
    [labelCell('Most recorded slot'), textCell(insights.mostRecorded ? `${insights.mostRecorded.label} (${insights.mostRecordedCount})` : 'No data')],
    [labelCell('Entries with notes'), { value: insights.notesCount, type: Number }]
  ];

  if (comparison) {
    summary.push(
      [],
      [sectionCell(comparisonLabel), sectionCell('Value')],
      [labelCell('Period'), textCell(`${comparison.from} to ${comparison.to}`)],
      [labelCell('Highest'), textCell(comparison.highest ?? 'No data')],
      [labelCell('Lowest'), textCell(comparison.lowest ?? 'No data')],
      [labelCell('Average'), textCell(comparison.average === null ? 'No data' : comparison.average.toFixed(1))],
      [labelCell('Readings'), { value: comparison.count, type: Number }],
      [labelCell('Days logged'), textCell(`${comparisonInsights.daysLogged} of ${comparisonInsights.totalDays}`)],
      [labelCell('Coverage'), textCell(`${comparisonInsights.coverage}%`)],
      [labelCell('Complete four-reading days'), { value: comparisonInsights.completeDays, type: Number }],
      [labelCell('Readings per logged day'), textCell(comparisonInsights.readingsPerLoggedDay.toFixed(1))]
    );
  }

  const readings = [
    ['Date', 'Day', 'Time slot', 'Glucose (mg/dl)', 'Notes'].map(headerCell),
    ...report.readings.map((reading) => [
      textCell(reading.readingDate),
      textCell(new Intl.DateTimeFormat('en-IN', { weekday: 'long' }).format(new Date(`${reading.readingDate}T12:00:00`))),
      textCell(SLOT_LABELS[reading.slot] ?? reading.slot),
      { value: reading.value, type: Number },
      textCell(reading.notes ?? '')
    ])
  ];

  const comparisonReadings = comparison?.readings?.length ? [
    ['Date', 'Day', 'Time slot', 'Glucose (mg/dl)', 'Notes'].map(headerCell),
    ...comparison.readings.map((reading) => [
      textCell(reading.readingDate),
      textCell(new Intl.DateTimeFormat('en-IN', { weekday: 'long' }).format(new Date(`${reading.readingDate}T12:00:00`))),
      textCell(SLOT_LABELS[reading.slot] ?? reading.slot),
      { value: reading.value, type: Number },
      textCell(reading.notes ?? '')
    ])
  ] : null;

  const sheets = [
    {
      data: summary,
      sheet: 'Summary',
      columns: [{ width: 31 }, { width: 48 }],
      showGridLines: false,
      stickyRowsCount: 1
    },
    {
      data: readings,
      sheet: readingsSheetName(currentLabel),
      columns: [{ width: 14 }, { width: 14 }, { width: 24 }, { width: 18 }, { width: 58 }],
      stickyRowsCount: 1
    }
  ];

  if (comparisonReadings) {
    sheets.push({
      data: comparisonReadings,
      sheet: readingsSheetName(comparisonLabel),
      columns: [{ width: 14 }, { width: 14 }, { width: 24 }, { width: 18 }, { width: 58 }],
      stickyRowsCount: 1
    });
  }

  await writeExcelFile(sheets, { fontFamily: 'Aptos', fontSize: 11 }).toFile(filename);
}
