import { Flame, Grid3X3 } from 'lucide-react';
import { localToday } from '../readingConfig.js';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function toDate(value) {
  return new Date(`${value}T12:00:00Z`);
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function datesBetween(from, to) {
  const dates = [];
  const cursor = toDate(from);
  const end = toDate(to);
  while (cursor <= end) {
    dates.push(toIsoDate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function longestCompleteRun(dates, counts) {
  let longest = 0;
  let current = 0;
  dates.forEach((date) => {
    current = counts.get(date) === 4 ? current + 1 : 0;
    longest = Math.max(longest, current);
  });
  return longest;
}

function currentCompleteRun(dates, counts, to) {
  let index = dates.length - 1;
  if (to === localToday() && counts.get(dates[index]) !== 4) index -= 1;
  let run = 0;
  while (index >= 0 && counts.get(dates[index]) === 4) {
    run += 1;
    index -= 1;
  }
  return run;
}

export function ConsistencyCalendar({ from, to, readings, currentRange }) {
  const dates = datesBetween(from, to);
  const counts = new Map(dates.map((date) => [date, 0]));
  readings.forEach((reading) => counts.set(reading.readingDate, (counts.get(reading.readingDate) ?? 0) + 1));
  const leadingBlanks = toDate(from).getUTCDay();
  const completeDays = dates.filter((date) => counts.get(date) === 4).length;
  const run = currentRange ? currentCompleteRun(dates, counts, to) : longestCompleteRun(dates, counts);

  return (
    <section className="consistency-card" aria-labelledby="consistency-title">
      <div className="consistency-card__copy">
        <p className="eyebrow">Logging consistency</p>
        <h2 id="consistency-title">A month of small check-ins</h2>
        <p>Darker days contain more of the four expected readings. This measures logging consistency, not whether a glucose value is good or bad.</p>
        <div className="consistency-stats">
          <span><Grid3X3 size={18} /><strong>{completeDays}</strong><small>complete days</small></span>
          <span><Flame size={18} /><strong>{run}</strong><small>{currentRange ? 'current run' : 'longest run'}</small></span>
        </div>
      </div>
      <div className="consistency-calendar">
        <div className="consistency-weekdays" aria-hidden="true">{WEEKDAYS.map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
        <div className="consistency-grid">
          {Array.from({ length: leadingBlanks }, (_, index) => <span className="consistency-day is-blank" key={`blank-${index}`} />)}
          {dates.map((date) => {
            const count = counts.get(date);
            return (
              <span className={`consistency-day intensity-${count}`} key={date} title={`${date}: ${count} of 4 readings`}>
                <span>{Number(date.slice(-2))}</span><small>{count}/4</small>
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}
