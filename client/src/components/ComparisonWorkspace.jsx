import { useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, CalendarRange, FileSpreadsheet, Printer } from 'lucide-react';
import { apiRequest } from '../api.js';
import { downloadReportWorkbook } from '../exportUtils.js';
import { localToday } from '../readingConfig.js';
import { daysInRange, formatReportRange } from '../reportUtils.js';
import { ComparisonView } from './ComparisonView.jsx';
import { PixelAvatar } from './PixelAvatar.jsx';

function toIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toDate(value) {
  return new Date(`${value}T12:00:00`);
}

function shiftDays(value, amount) {
  const date = toDate(value);
  date.setDate(date.getDate() + amount);
  return toIsoDate(date);
}

function completeMonth(today, offset) {
  const date = toDate(today);
  const first = new Date(date.getFullYear(), date.getMonth() + offset, 1, 12);
  const last = new Date(date.getFullYear(), date.getMonth() + offset + 1, 0, 12);
  return { from: toIsoDate(first), to: toIsoDate(last) };
}

function monthToDate(today, offset) {
  const date = toDate(today);
  const first = new Date(date.getFullYear(), date.getMonth() + offset, 1, 12);
  const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0, 12).getDate();
  const end = new Date(first.getFullYear(), first.getMonth(), Math.min(date.getDate(), lastDay), 12);
  return { from: toIsoDate(first), to: toIsoDate(end) };
}

export function comparisonPresets(today) {
  return [
    {
      id: 'month-to-date',
      label: 'Month to date',
      description: 'Against the same dates last month',
      a: monthToDate(today, 0),
      b: monthToDate(today, -1)
    },
    {
      id: 'completed-months',
      label: 'Completed months',
      description: 'Last month against the month before',
      a: completeMonth(today, -1),
      b: completeMonth(today, -2)
    },
    {
      id: 'rolling-30',
      label: 'Rolling 30 days',
      description: 'Latest 30 days against the prior 30',
      a: { from: shiftDays(today, -29), to: today },
      b: { from: shiftDays(today, -59), to: shiftDays(today, -30) }
    }
  ];
}

function validateRanges(a, b, today) {
  if (!a.from || !a.to || !b.from || !b.to) return 'Choose a start and end date for both periods.';
  if (a.from > a.to) return 'Period A must start on or before it ends.';
  if (b.from > b.to) return 'Period B must start on or before it ends.';
  if (a.to > today || b.to > today) return 'Date cannot be in the future.';
  if (daysInRange(a.from, a.to) > 366) return 'Period A can cover up to 366 days.';
  if (daysInRange(b.from, b.to) > 366) return 'Period B can cover up to 366 days.';
  if (a.from === b.from && a.to === b.to) return 'Choose two different periods to compare.';
  return '';
}

function RangeFields({ label, marker, range, today, onChange }) {
  const complete = Boolean(range.from && range.to);
  return (
    <fieldset className={`comparison-range-card comparison-range-card--${marker.toLowerCase()}`}>
      <legend><span>{marker}</span>{label}</legend>
      <p>{complete ? `${formatReportRange(range.from, range.to)} · ${daysInRange(range.from, range.to)} days` : 'Choose both dates'}</p>
      <div>
        <label>From<input required aria-label={`${label} start date`} max={today} type="date" value={range.from} onChange={(event) => onChange({ ...range, from: event.target.value })} /></label>
        <label>To<input required aria-label={`${label} end date`} max={today} type="date" value={range.to} onChange={(event) => onChange({ ...range, to: event.target.value })} /></label>
      </div>
    </fieldset>
  );
}

export function ComparisonWorkspace({ token, user }) {
  const today = useMemo(localToday, []);
  const presets = useMemo(() => comparisonPresets(today), [today]);
  const [draftA, setDraftA] = useState(presets[0].a);
  const [draftB, setDraftB] = useState(presets[0].b);
  const [submitted, setSubmitted] = useState({ a: presets[0].a, b: presets[0].b });
  const [resource, setResource] = useState({ key: '', status: 'loading', report: null, error: '' });
  const [validationError, setValidationError] = useState('');
  const [exporting, setExporting] = useState(false);
  const requestKey = `${submitted.a.from}:${submitted.a.to}:${submitted.b.from}:${submitted.b.to}`;
  const currentResource = resource.key === requestKey;
  const loading = !currentResource || resource.status === 'loading';
  const report = currentResource && resource.status === 'success' ? resource.report : null;
  const error = validationError || (currentResource && resource.status === 'error' ? resource.error : '');
  const hasDraftChanges = draftA.from !== submitted.a.from
    || draftA.to !== submitted.a.to
    || draftB.from !== submitted.b.from
    || draftB.to !== submitted.b.to;

  useEffect(() => {
    let active = true;
    setResource({ key: requestKey, status: 'loading', report: null, error: '' });
    const query = new URLSearchParams({
      fromA: submitted.a.from,
      toA: submitted.a.to,
      fromB: submitted.b.from,
      toB: submitted.b.to
    });
    apiRequest(`/reports/compare?${query}`, { token })
      .then((result) => {
        if (active) setResource({ key: requestKey, status: 'success', report: result.report, error: '' });
      })
      .catch((loadError) => {
        if (active) setResource({ key: requestKey, status: 'error', report: null, error: loadError.message });
      });
    return () => { active = false; };
  }, [requestKey, submitted, token]);

  function runComparison(a = draftA, b = draftB) {
    const nextError = validateRanges(a, b, today);
    setValidationError(nextError);
    if (nextError) return;
    setSubmitted({ a: { ...a }, b: { ...b } });
  }

  function applyPreset(preset) {
    setDraftA(preset.a);
    setDraftB(preset.b);
    runComparison(preset.a, preset.b);
  }

  function swapPeriods() {
    setDraftA(draftB);
    setDraftB(draftA);
    runComparison(draftB, draftA);
  }

  async function exportComparison() {
    if (!report) return;
    setExporting(true);
    try {
      await downloadReportWorkbook({
        report,
        typeLabel: 'Custom comparison',
        user,
        filename: `sweety-comparison-${report.from}-to-${report.to}.xlsx`,
        currentLabel: 'Period A',
        comparisonLabel: 'Period B'
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="dashboard-content comparison-workspace">
      <section className="day-heading comparison-heading">
        <p className="eyebrow">Compare</p>
        <h1>Choose two<br /> periods.</h1>
        <p>Pick any two days or date ranges. Sweety will align their patterns without deciding whether a change is good or bad.</p>
      </section>

      <section className="comparison-builder" aria-labelledby="comparison-builder-title">
        <div className="comparison-builder__heading">
          <div><p className="eyebrow">Build a comparison</p><h2 id="comparison-builder-title">Start quickly, then adjust any date</h2></div>
          <CalendarRange size={23} />
        </div>
        <div className="comparison-presets" aria-label="Comparison quick starts">
          {presets.map((preset) => (
            <button key={preset.id} type="button" onClick={() => applyPreset(preset)}><strong>{preset.label}</strong><small>{preset.description}</small></button>
          ))}
        </div>
        <div className="comparison-range-layout">
          <RangeFields label="Period A" marker="A" range={draftA} today={today} onChange={setDraftA} />
          <button className="comparison-swap" type="button" onClick={swapPeriods}><ArrowLeftRight size={18} /><span>Swap</span></button>
          <RangeFields label="Period B" marker="B" range={draftB} today={today} onChange={setDraftB} />
        </div>
        <div className="comparison-builder__footer">
          <p>{hasDraftChanges ? 'Dates changed. Update the comparison to refresh the results below.' : 'Ranges may have different lengths; the duration remains visible in the results.'}</p>
          <button className="comparison-run" type="button" onClick={() => runComparison()}>{hasDraftChanges ? 'Update comparison' : 'Compare periods'}</button>
        </div>
      </section>

      {error && <p className="page-error" role="alert">{error}</p>}
      {loading ? (
        <section className="report-loading"><span className="spinner" /><p>Comparing the two periods…</p></section>
      ) : report && (
        <>
          <div className="comparison-result-toolbar">
            <section className="report-identity comparison-identity" aria-label="Patient and comparison details">
              <div className="report-identity__patient"><PixelAvatar size={42} value={user.email} /><span><small>Prepared for</small><strong>{user.name}</strong><em>{user.email}</em></span></div>
              <dl>
                <div><dt>Period A</dt><dd>{daysInRange(report.from, report.to)} days</dd></div>
                <div><dt>Period B</dt><dd>{daysInRange(report.comparison.from, report.comparison.to)} days</dd></div>
                <div><dt>Unit</dt><dd>mg/dl</dd></div>
              </dl>
            </section>
            <div className="report-actions comparison-result-actions">
              <button disabled={exporting} type="button" onClick={exportComparison}><FileSpreadsheet size={17} /><span>{exporting ? 'Building…' : 'Excel'}</span></button>
              <button type="button" onClick={() => window.print()}><Printer size={17} /><span>Print / PDF</span></button>
            </div>
          </div>
          <ComparisonView report={report} />
        </>
      )}
    </div>
  );
}
