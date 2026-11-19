import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts';
import { formatDisplayDate, SLOT_LABELS } from '../readingConfig.js';
import { SLOT_COLORS } from './SlotMomentIcon.jsx';

function dailyLabel(reading) {
  const label = SLOT_LABELS[reading.slot].replace('After ', '').replace('Morning (fasting)', 'Morning');
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function datesBetween(from, to) {
  const dates = [];
  const cursor = new Date(`${from}T12:00:00Z`);
  const end = new Date(`${to}T12:00:00Z`);
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

export function aggregateDailyReadings(readings, from, to) {
  const groups = new Map();
  readings.forEach((reading) => {
    const group = groups.get(reading.readingDate) ?? { date: reading.readingDate, values: [] };
    group.values.push(reading.value);
    groups.set(reading.readingDate, group);
  });

  const sortedDates = [...groups.keys()].sort();
  const rangeFrom = from ?? sortedDates[0];
  const rangeTo = to ?? sortedDates.at(-1);
  if (!rangeFrom || !rangeTo) return [];

  return datesBetween(rangeFrom, rangeTo).map((date) => {
    const values = groups.get(date)?.values ?? [];
    return {
      readingDate: date,
      label: String(Number(date.slice(-2))),
      average: values.length ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10 : null,
      lowest: values.length ? Math.min(...values) : null,
      highest: values.length ? Math.max(...values) : null,
      count: values.length
    };
  });
}

function ReadingDot({ cx, cy, payload }) {
  if (cx === undefined || cy === undefined) return null;
  return <circle cx={cx} cy={cy} fill={SLOT_COLORS[payload.slot]} r="5" stroke="white" strokeWidth="2" />;
}

function AverageDot({ cx, cy }) {
  if (cx === undefined || cy === undefined) return null;
  return <circle cx={cx} cy={cy} fill="#0d6b62" r="4.5" stroke="white" strokeWidth="2" />;
}

function DailyTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const reading = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <small>{formatDisplayDate(reading.readingDate)}</small>
      <strong>{SLOT_LABELS[reading.slot]}</strong>
      <p><b>{reading.value}</b> mg/dl</p>
      {reading.notes && <span>{reading.notes}</span>}
    </div>
  );
}

function PeriodTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const day = payload[0].payload;
  if (day.average === null) {
    return <div className="chart-tooltip"><small>{formatDisplayDate(day.readingDate)}</small><strong>No readings saved</strong><span>The line pauses for this date.</span></div>;
  }
  return (
    <div className="chart-tooltip">
      <small>{formatDisplayDate(day.readingDate)}</small>
      <strong>Daily average</strong>
      <p><b>{day.average.toFixed(1)}</b> mg/dl</p>
      <span>{day.count} check-ins · {day.lowest}–{day.highest} mg/dl range</span>
    </div>
  );
}

export function GlucoseTrend({ readings, daily, from, to }) {
  const data = daily
    ? readings.map((reading) => ({ ...reading, label: dailyLabel(reading) }))
    : aggregateDailyReadings(readings, from, to);
  const dataKey = daily ? 'value' : 'average';
  const values = data.map((item) => item[dataKey]).filter((value) => value !== null);
  const loggedDays = data.filter((item) => item.average !== null).length;
  const minimum = Math.max(0, Math.floor(Math.min(...values) / 10) * 10 - 20);
  const maximum = Math.ceil(Math.max(...values) / 10) * 10 + 20;

  return (
    <section className="trend-card" aria-labelledby="trend-title">
      <div className="section-heading">
        <div><p className="eyebrow">{daily ? 'Daily pattern' : 'Day-by-day pattern'}</p><h2 id="trend-title">{daily ? 'Today’s glucose profile' : 'Daily average over time'}</h2></div>
        <span>{daily ? `${readings.length} check-ins` : `${loggedDays} logged days`}</span>
      </div>
      <p className="trend-card__intro">{daily
        ? 'The line follows the day’s saved check-ins in their natural order.'
        : 'Each point is one day’s average. A break in the line marks a day with no saved readings.'}</p>
      <div className="trend-chart" role="img" aria-label={daily ? `Glucose profile with ${readings.length} readings` : `Daily average glucose trend with ${loggedDays} logged days and visible gaps for missing days`}>
        <LineChart data={data} margin={{ top: 12, right: 15, bottom: 8, left: -8 }} responsive style={{ width: '100%', height: '100%' }}>
          <CartesianGrid stroke="#dce8e5" strokeDasharray="3 6" vertical={false} />
          <XAxis axisLine={false} dataKey="label" interval="preserveStartEnd" minTickGap={daily ? 22 : 28} tick={{ fill: '#617572', fontSize: 11 }} tickLine={false} />
          <YAxis axisLine={false} domain={[minimum, maximum]} tick={{ fill: '#617572', fontSize: 11 }} tickLine={false} width={48} />
          <Tooltip content={daily ? <DailyTooltip /> : <PeriodTooltip />} cursor={{ stroke: '#91bdb6', strokeDasharray: '3 4' }} filterNull={false} />
          <Line connectNulls={false} dataKey={dataKey} dot={daily ? <ReadingDot /> : <AverageDot />} isAnimationActive={false} stroke="#0d6b62" strokeWidth={2.5} type="monotone" />
        </LineChart>
      </div>
      {daily && (
        <div className="trend-legend" aria-label="Time slot colors">
          {Object.entries(SLOT_COLORS).map(([slot, color]) => <span key={slot}><i style={{ background: color }} />{SLOT_LABELS[slot]}</span>)}
        </div>
      )}
    </section>
  );
}
