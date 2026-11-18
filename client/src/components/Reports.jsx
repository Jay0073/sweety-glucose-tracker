import { useEffect, useState } from 'react';
import { Activity, ArrowDown, ArrowUp, CalendarDays, Hash } from 'lucide-react';
import { apiRequest } from '../api.js';
import { formatDisplayDate, localToday, SLOT_LABELS } from '../readingConfig.js';

const TYPES = [
  { value: 'daily', label: 'Daily', description: 'Selected date' },
  { value: 'month-to-date', label: 'Month to date', description: 'Month through date' },
  { value: 'monthly', label: 'Previous month', description: 'Full previous month' }
];

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
  return (
    <article className="report-metric">
      <span><Icon size={18} /></span>
      <div><small>{label}</small><p>{value ?? '—'}{value !== null && value !== undefined && unit ? <em>{unit}</em> : null}</p></div>
    </article>
  );
}

export function Reports({ token }) {
  const today = localToday();
  const [selectedDate, setSelectedDate] = useState(today);
  const [type, setType] = useState('daily');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    apiRequest(`/reports/${type}?date=${selectedDate}`, { token })
      .then((result) => { if (active) setReport(result.report); })
      .catch((loadError) => { if (active) setError(loadError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [selectedDate, token, type]);

  return (
    <div className="dashboard-content reports-view">
      <section className="day-heading reports-heading">
        <div><p className="eyebrow">Reports</p><h1>See the pattern,<br />one range at a time.</h1><p>Choose a date, then compare the day, month so far, or previous month.</p></div>
        <label className="date-control"><CalendarDays size={18} /><span>Selected date</span><input max={today} type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} /></label>
      </section>

      <div className="report-type-switch" role="tablist" aria-label="Report range">
        {TYPES.map((option) => (
          <button className={type === option.value ? 'is-active' : ''} key={option.value} type="button" role="tab" aria-selected={type === option.value} onClick={() => setType(option.value)}>
            <strong>{option.label}</strong><small>{option.description}</small>
          </button>
        ))}
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
              <div className="report-empty"><span><Activity size={25} /></span><div><strong>No readings in this period</strong><p>Add readings for this range and return here to see your summary.</p></div></div>
            ) : (
              <div className="report-metrics">
                <Metric icon={ArrowUp} label="Highest" value={report.highest} unit="mg/dl" />
                <Metric icon={ArrowDown} label="Lowest" value={report.lowest} unit="mg/dl" />
                <Metric icon={Activity} label="Average" value={report.average.toFixed(1)} unit="mg/dl" />
                <Metric icon={Hash} label="Readings" value={report.count} />
              </div>
            )}
          </section>

          {type === 'daily' && report.count > 0 && (
            <section className="daily-report-list" aria-labelledby="daily-detail-title">
              <div className="section-heading"><div><p className="eyebrow">Daily detail</p><h2 id="daily-detail-title">Each check-in</h2></div></div>
              <div className="daily-report-list__items">
                {report.readings.map((reading) => (
                  <article className="daily-report-row" key={reading.id}><span className={`slot-symbol slot-symbol--${reading.slot}`} /><strong>{SLOT_LABELS[reading.slot]}</strong><p><b>{reading.value}</b> mg/dl</p></article>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

