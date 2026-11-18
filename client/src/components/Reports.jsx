import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowDown, ArrowUp, Download, Hash, Printer } from 'lucide-react';
import { apiRequest } from '../api.js';
import { downloadReadingsCsv } from '../exportUtils.js';
import { formatDisplayDate, localToday, SLOT_LABELS } from '../readingConfig.js';
import { ConsistencyCalendar } from './ConsistencyCalendar.jsx';
import { DateNavigator } from './DateNavigator.jsx';
import { GlucoseTrend } from './GlucoseTrend.jsx';

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

function Metric({ icon: Icon, label, value, unit }) {
  const hasValue = value !== null && value !== undefined;
  return (
    <article className="report-metric">
      <span><Icon size={18} /></span>
      <div><small>{label}</small><p><strong>{hasValue ? value : '—'}</strong>{hasValue && unit ? <em>{unit}</em> : null}</p></div>
    </article>
  );
}

export function Reports({ token, selectedDate, onDateChange }) {
  const today = useMemo(localToday, []);
  const [type, setType] = useState('daily');
  const requestKey = `${type}:${selectedDate}`;
  const [resource, setResource] = useState({ key: '', status: 'loading', report: null, error: '' });
  const isCurrent = resource.key === requestKey;
  const loading = !isCurrent || resource.status === 'loading';
  const report = isCurrent && resource.status === 'success' ? resource.report : null;
  const error = isCurrent && resource.status === 'error' ? resource.error : '';

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

  function exportCurrentReport() {
    if (!report) return;
    downloadReadingsCsv(report.readings, `sweety-${type}-${report.from}-to-${report.to}.csv`);
  }

  return (
    <div className="dashboard-content reports-view">
      <section className="day-heading reports-heading">
        <div>
          <p className="eyebrow">Reports</p>
          <h1>Your glucose,<br /> over time.</h1>
          <p>{REPORT_COPY[type]}</p>
        </div>
      </section>

      <DateNavigator label="Report date" max={today} value={selectedDate} onChange={onDateChange} />

      <div className="report-toolbar">
        <div className="report-type-switch" role="tablist" aria-label="Report range">
          {TYPES.map((option) => (
            <button aria-label={`${option.label}: ${option.description}`} className={type === option.value ? 'is-active' : ''} key={option.value} role="tab" aria-selected={type === option.value} type="button" onClick={() => setType(option.value)}>
              <strong><span className="report-label-full">{option.label}</span><span className="report-label-short">{option.shortLabel}</span></strong><small>{option.description}</small>
            </button>
          ))}
        </div>
        <div className="report-actions">
          <button disabled={!report?.readings?.length} type="button" onClick={exportCurrentReport}><Download size={17} /><span>Export CSV</span></button>
          <button disabled={!report} type="button" onClick={() => window.print()}><Printer size={17} /><span>Print / PDF</span></button>
        </div>
      </div>

      {error && <p className="page-error" role="alert">{error}</p>}
      {loading ? (
        <section className="report-loading"><span className="spinner" /><p>Calculating your report…</p></section>
      ) : report && (
        <>
          <section className="report-summary" aria-labelledby="report-range-title">
            <div className="report-summary__heading">
              <div><p className="eyebrow">Reporting period</p><h2 id="report-range-title">{formatRange(report.from, report.to)}</h2></div>
              <span>{report.count === 1 ? '1 reading' : `${report.count} readings`}</span>
            </div>

            {report.count === 0 ? (
              <div className="report-empty"><span><Activity size={25} /></span><div><strong>No readings in this period</strong><p>Add readings for this range and return here to see a summary and trend.</p></div></div>
            ) : (
              <div className="report-metrics">
                <Metric icon={ArrowUp} label="Highest" value={report.highest} unit="mg/dl" />
                <Metric icon={ArrowDown} label="Lowest" value={report.lowest} unit="mg/dl" />
                <Metric icon={Activity} label="Average" value={report.average.toFixed(1)} unit="mg/dl" />
                <Metric icon={Hash} label="Readings" value={report.count} />
              </div>
            )}
          </section>

          {report.count > 0 && <GlucoseTrend daily={type === 'daily'} readings={report.readings} />}

          {type !== 'daily' && (
            <ConsistencyCalendar currentRange={type === 'month-to-date'} from={report.from} readings={report.readings} to={report.to} />
          )}

          {type === 'daily' && report.readings.length > 0 && (
            <section className="daily-report-list" aria-labelledby="daily-detail-title">
              <div className="section-heading"><div><p className="eyebrow">Daily detail</p><h2 id="daily-detail-title">Each check-in</h2></div></div>
              <div className="daily-report-list__items">
                {report.readings.map((reading) => (
                  <article className="daily-report-row" key={reading.id}>
                    <span className={`slot-symbol slot-symbol--${reading.slot}`} />
                    <div><strong>{SLOT_LABELS[reading.slot]}</strong>{reading.notes && <small>{reading.notes}</small>}</div>
                    <p><b>{reading.value}</b> mg/dl</p>
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
