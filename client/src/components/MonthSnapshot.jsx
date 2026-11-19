import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarDays } from 'lucide-react';
import { apiRequest } from '../api.js';
import { formatDisplayDate, SLOT_LABELS, SLOTS } from '../readingConfig.js';

export function MonthSnapshot({ date, isToday, refreshKey, token, onOpenReport }) {
  const [state, setState] = useState({ key: '', report: null, error: '' });
  const key = `${date}:${token}:${refreshKey}`;
  const report = state.key === key ? state.report : null;
  const insights = useMemo(() => {
    const readings = report?.readings ?? [];
    const daysLogged = report?.daysLogged ?? new Set(readings.map((reading) => reading.readingDate)).size;
    const counts = Object.fromEntries(SLOTS.map((slot) => [slot.value, 0]));
    readings.forEach((reading) => { counts[reading.slot] += 1; });
    const mostRecorded = [...SLOTS].sort((a, b) => counts[b.value] - counts[a.value])[0];
    return {
      daysLogged,
      readingsPerDay: daysLogged ? readings.length / daysLogged : 0,
      totalDays: report ? Number(report.to.slice(-2)) : 0,
      latest: readings.at(-1),
      mostRecorded: readings.length ? mostRecorded : null,
      mostRecordedCount: readings.length ? counts[mostRecorded.value] : 0
    };
  }, [report]);

  useEffect(() => {
    let active = true;
    apiRequest(`/reports/month-to-date?date=${date}`, { token })
      .then((result) => {
        if (active) setState({ key, report: result.report, error: '' });
      })
      .catch((error) => {
        if (active) setState({ key, report: null, error: error.message });
      });
    return () => { active = false; };
  }, [date, key, token]);

  if (state.key !== key) {
    return <section aria-label="Loading month summary" className="month-snapshot is-loading" />;
  }
  if (state.error || !report) return null;

  return (
    <section className="month-snapshot" aria-labelledby="month-snapshot-title">
      <div className="month-snapshot__title">
        <span><CalendarDays size={19} /></span>
        <div><p className="eyebrow">{isToday ? 'Month so far' : 'Month through this date'}</p><h2 id="month-snapshot-title">A quick look beyond today</h2></div>
      </div>
      {report.count === 0 ? (
        <p className="month-snapshot__empty">No readings have been saved in this month yet.</p>
      ) : (
        <dl className="month-snapshot__stats">
          <div><dt>Average</dt><dd>{report.average.toFixed(1)} <span>mg/dl</span></dd></div>
          <div><dt>Days logged</dt><dd>{insights.daysLogged}<span> / {insights.totalDays}</span></dd></div>
          <div><dt>Complete days</dt><dd>{report.completeDays}</dd></div>
          <div><dt>Readings / logged day</dt><dd>{insights.readingsPerDay.toFixed(1)}</dd></div>
        </dl>
      )}
      {report.count > 0 && (
        <div className="month-snapshot__context">
          <p><small>Latest saved</small><strong>{insights.latest.value} mg/dl</strong><span>{SLOT_LABELS[insights.latest.slot]} · {formatDisplayDate(insights.latest.readingDate)}</span></p>
          <p><small>Most consistent slot</small><strong>{insights.mostRecorded.label}</strong><span>{insights.mostRecordedCount} readings this period</span></p>
        </div>
      )}
      <button type="button" onClick={onOpenReport}>View month report <ArrowRight size={16} /></button>
    </section>
  );
}
