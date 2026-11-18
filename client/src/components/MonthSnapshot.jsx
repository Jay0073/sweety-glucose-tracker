import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarDays } from 'lucide-react';
import { apiRequest } from '../api.js';

function activeDayCount(readings) {
  return new Set(readings.map((reading) => reading.readingDate)).size;
}

export function MonthSnapshot({ date, isToday, refreshKey, token, onOpenReport }) {
  const [state, setState] = useState({ key: '', report: null, error: '' });
  const key = `${date}:${token}:${refreshKey}`;
  const report = state.key === key ? state.report : null;
  const daysLogged = useMemo(() => activeDayCount(report?.readings ?? []), [report]);

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
          <div><dt>Readings</dt><dd>{report.count}</dd></div>
          <div><dt>Days logged</dt><dd>{daysLogged}</dd></div>
        </dl>
      )}
      <button type="button" onClick={onOpenReport}>View month report <ArrowRight size={16} /></button>
    </section>
  );
}
