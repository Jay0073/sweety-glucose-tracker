import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, ChevronDown, Columns2, Download, FileSpreadsheet, LayoutDashboard, Printer } from 'lucide-react';
import { apiRequest } from '../api.js';
import { downloadReadingsCsv, downloadReportWorkbook } from '../exportUtils.js';
import { formatDisplayDate, localToday, SLOT_LABELS } from '../readingConfig.js';
import { buildReportInsights } from '../reportUtils.js';
import { ComparisonView } from './ComparisonView.jsx';
import { ConsistencyCalendar } from './ConsistencyCalendar.jsx';
import { DateNavigator } from './DateNavigator.jsx';
import { GlucoseTrend } from './GlucoseTrend.jsx';
import { PixelAvatar } from './PixelAvatar.jsx';
import { ReportLogbook } from './ReportLogbook.jsx';
import { SlotAverages } from './SlotAverages.jsx';
import { SlotMomentIcon } from './SlotMomentIcon.jsx';

const TYPES = [
  { value: 'daily', label: 'Daily', shortLabel: 'Day', description: 'One day' },
  { value: 'month-to-date', label: 'Month to date', shortLabel: 'This month', description: 'Month through date' },
  { value: 'monthly', label: 'Previous month', shortLabel: 'Last month', description: 'Complete month' }
];

const REPORT_COPY = {
  daily: 'See each check-in and how the day moved.',
  'month-to-date': 'Follow every saved reading from the first of the month.',
  monthly: 'Review the complete previous month and its logging rhythm.'
};

function formatRange(from, to) {
  if (from === to) return formatDisplayDate(from);
  const start = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(end)}`;
  }
  return `${formatDisplayDate(from)} – ${formatDisplayDate(to)}`;
}

export function Reports({ initialType = 'daily', token, selectedDate, user = { name: 'Patient', email: '' }, onDateChange }) {
  const today = useMemo(localToday, []);
  const [type, setType] = useState(initialType);
  const [viewMode, setViewMode] = useState('overview');
  const requestKey = `${type}:${selectedDate}`;
  const [resource, setResource] = useState({ key: '', status: 'loading', report: null, error: '' });
  const isCurrent = resource.key === requestKey;
  const loading = !isCurrent || resource.status === 'loading';
  const report = isCurrent && resource.status === 'success' ? resource.report : null;
  const error = isCurrent && resource.status === 'error' ? resource.error : '';
  const [exportOpen, setExportOpen] = useState(false);
  const [exportingWorkbook, setExportingWorkbook] = useState(false);
  const exportRef = useRef(null);
  const insights = useMemo(() => report ? buildReportInsights(report) : null, [report]);
  const generatedAt = useMemo(
    () => new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date()),
    [requestKey]
  );

  useEffect(() => setType(initialType), [initialType]);

  useEffect(() => {
    if (!exportOpen) return undefined;
    function close(event) {
      if (!exportRef.current?.contains(event.target)) setExportOpen(false);
    }
    function closeOnEscape(event) {
      if (event.key === 'Escape') setExportOpen(false);
    }
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [exportOpen]);

  useEffect(() => {
    let active = true;
    setResource({ key: requestKey, status: 'loading', report: null, error: '' });
    apiRequest(`/reports/${type}?date=${selectedDate}`, { token })
      .then((result) => {
        if (active) setResource({ key: requestKey, status: 'success', report: result.report, error: '' });
      })
      .catch((loadError) => {
        if (active) setResource({ key: requestKey, status: 'error', report: null, error: loadError.message });
      });
    return () => { active = false; };
  }, [requestKey, selectedDate, token, type]);

  function exportCurrentCsv() {
    if (!report) return;
    downloadReadingsCsv(report.readings, `sweety-${type}-${report.from}-to-${report.to}.csv`);
    setExportOpen(false);
  }

  async function exportCurrentWorkbook() {
    if (!report) return;
    setExportingWorkbook(true);
    try {
      const typeLabel = TYPES.find((option) => option.value === type)?.label ?? 'Report';
      await downloadReportWorkbook({
        report,
        typeLabel,
        user,
        filename: `sweety-${type}-${report.from}-to-${report.to}.xlsx`
      });
      setExportOpen(false);
    } finally {
      setExportingWorkbook(false);
    }
  }

  return (
    <div className="dashboard-content reports-view">
      <section className="day-heading reports-heading page-intro">
        <div>
          <p className="eyebrow">Reports</p>
          <h1>Your glucose,<br /> over time.</h1>
          <p>{viewMode === 'compare' ? 'Place this period beside the previous comparable one.' : REPORT_COPY[type]}</p>
        </div>
        <DateNavigator label="Report date" max={today} step={type === 'daily' ? 'day' : 'month'} value={selectedDate} onChange={onDateChange} />
      </section>

      <div className="report-toolbar">
        <div className="report-type-switch" role="tablist" aria-label="Report range">
          {TYPES.map((option) => (
            <button aria-label={`${option.label}: ${option.description}`} className={type === option.value ? 'is-active' : ''} key={option.value} role="tab" aria-selected={type === option.value} type="button" onClick={() => setType(option.value)}>
              <strong><span className="report-label-full">{option.label}</span><span className="report-label-short">{option.shortLabel}</span></strong><small>{option.description}</small>
            </button>
          ))}
        </div>
        <div className="report-actions">
          <div className="report-mode-switch" role="tablist" aria-label="Report view">
            <button aria-selected={viewMode === 'overview'} className={viewMode === 'overview' ? 'is-active' : ''} role="tab" type="button" onClick={() => setViewMode('overview')}><LayoutDashboard size={16} /><span>Overview</span></button>
            <button aria-selected={viewMode === 'compare'} className={viewMode === 'compare' ? 'is-active' : ''} role="tab" type="button" onClick={() => setViewMode('compare')}><Columns2 size={16} /><span>Compare</span></button>
          </div>
          <div className="export-menu" ref={exportRef}>
            <button aria-expanded={exportOpen} aria-haspopup="menu" disabled={!report?.readings?.length} type="button" onClick={() => setExportOpen((open) => !open)}><Download size={17} /><span>Export</span><ChevronDown size={15} /></button>
            {exportOpen && (
              <div className="export-popover" role="menu">
                <button role="menuitem" type="button" onClick={exportCurrentCsv}><Download size={17} /><span><strong>Readings CSV</strong><small>Portable raw history</small></span></button>
                <button disabled={exportingWorkbook} role="menuitem" type="button" onClick={exportCurrentWorkbook}><FileSpreadsheet size={17} /><span><strong>{exportingWorkbook ? 'Building workbook…' : 'Excel workbook'}</strong><small>Summary and Readings sheets</small></span></button>
              </div>
            )}
          </div>
          <button disabled={!report} type="button" onClick={() => window.print()}><Printer size={17} /><span>Print / PDF</span></button>
        </div>
      </div>

      {error && <p className="page-error" role="alert">{error}</p>}
      {loading ? (
        <section className="report-loading"><span className="spinner" /><p>Calculating your report…</p></section>
      ) : report && (
        <>
          <section className="report-identity" aria-label="Patient and report details">
            <div className="report-identity__patient"><PixelAvatar size={42} value={user.email} /><span><small>Prepared for</small><strong>{user.name}</strong><em>{user.email}</em></span></div>
            <dl>
              <div><dt>Period</dt><dd>{formatRange(report.from, report.to)}</dd></div>
              <div><dt>Generated</dt><dd>{generatedAt}</dd></div>
              <div><dt>Unit</dt><dd>mg/dl</dd></div>
            </dl>
          </section>

          {viewMode === 'compare' ? (
            <ComparisonView formatRange={formatRange} report={report} type={type} />
          ) : (
            <>
              <section className="report-summary" aria-labelledby="report-range-title">
                <div className="report-summary__heading">
                  <div><p className="eyebrow">Reporting period</p><h2 id="report-range-title">{formatRange(report.from, report.to)}</h2></div>
                  <span>{report.count === 1 ? '1 reading' : `${report.count} readings`}</span>
                </div>

                {report.count === 0 ? (
                  <div className="report-empty"><span><Activity size={25} /></span><div><strong>No readings in this period</strong><p>Add readings for this range and return here to see a summary and trend.</p></div></div>
                ) : (
                  <dl className="report-stat-list">
                    <div><dt>Average glucose</dt><dd>{report.average.toFixed(1)} <span>mg/dl</span></dd></div>
                    <div><dt>Highest</dt><dd>{report.highest} <span>mg/dl</span></dd></div>
                    <div><dt>Lowest</dt><dd>{report.lowest} <span>mg/dl</span></dd></div>
                    <div><dt>Readings</dt><dd>{report.count}</dd></div>
                  </dl>
                )}
              </section>

              {report.count > 0 && insights && (
                <section className="report-insights" aria-labelledby="report-insights-title">
                  <div className="section-heading"><div><p className="eyebrow">Coverage and context</p><h2 id="report-insights-title">What is behind the average</h2></div><span>{insights.coverage}% of days logged</span></div>
                  <dl>
                    <div><dt>Days with data</dt><dd>{insights.daysLogged}<small>of {insights.totalDays} days</small></dd></div>
                    <div><dt>Readings / logged day</dt><dd>{insights.readingsPerLoggedDay.toFixed(1)}<small>average frequency</small></dd></div>
                    <div><dt>Complete days</dt><dd>{insights.completeDays}<small>all four slots saved</small></dd></div>
                    <div><dt>Most recorded slot</dt><dd>{insights.mostRecorded.shortLabel}<small>{insights.mostRecordedCount} entries</small></dd></div>
                    <div><dt>Context notes</dt><dd>{insights.notesCount}<small>entries explained</small></dd></div>
                    <div><dt>Last saved</dt><dd>{insights.latest.value}<small>{SLOT_LABELS[insights.latest.slot]} · {formatDisplayDate(insights.latest.readingDate)}</small></dd></div>
                  </dl>
                </section>
              )}

              {report.count > 0 && <GlucoseTrend daily={type === 'daily'} from={report.from} readings={report.readings} to={report.to} />}

              {type !== 'daily' && (
                <>
                  <SlotAverages from={report.from} readings={report.readings} to={report.to} />
                  <ConsistencyCalendar currentRange={type === 'month-to-date'} from={report.from} readings={report.readings} to={report.to} />
                </>
              )}

              {type === 'daily' && report.readings.length > 0 && (
                <section className="daily-report-list" aria-labelledby="daily-detail-title">
                  <div className="section-heading"><div><p className="eyebrow">Daily detail</p><h2 id="daily-detail-title">Each check-in</h2></div></div>
                  <div className="daily-report-list__items">
                    {report.readings.map((reading) => (
                      <article className="daily-report-row" key={reading.id}>
                        <SlotMomentIcon slot={reading.slot} />
                        <div><strong>{SLOT_LABELS[reading.slot]}</strong>{reading.notes && <small>{reading.notes}</small>}</div>
                        <p><b>{reading.value}</b> mg/dl</p>
                      </article>
                    ))}
                  </div>
                </section>
              )}
              {type !== 'daily' && report.readings.length > 0 && <ReportLogbook readings={report.readings} />}
            </>
          )}
        </>
      )}
    </div>
  );
}
