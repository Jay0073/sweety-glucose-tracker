import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts';
import { formatDisplayDate, SLOT_LABELS } from '../readingConfig.js';

const SLOT_COLORS = {
  morning: '#58a99d',
  after_breakfast: '#d99b2c',
  after_lunch: '#c75f7c',
  after_dinner: '#6872a0'
};

function chartLabel(reading, daily) {
  if (daily) {
    const label = SLOT_LABELS[reading.slot].replace('After ', '').replace('Morning (fasting)', 'Morning');
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
  const day = Number(reading.readingDate.slice(-2));
  const slotInitial = { morning: 'M', after_breakfast: 'B', after_lunch: 'L', after_dinner: 'D' }[reading.slot];
  return `${day} ${slotInitial}`;
}

function ReadingDot({ cx, cy, payload }) {
  if (cx === undefined || cy === undefined) return null;
  return <circle cx={cx} cy={cy} fill={SLOT_COLORS[payload.slot]} r="5" stroke="white" strokeWidth="2" />;
}

function TrendTooltip({ active, payload }) {
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

export function GlucoseTrend({ readings, daily }) {
  const data = readings.map((reading, index) => ({ ...reading, index, label: chartLabel(reading, daily) }));
  const values = readings.map((reading) => reading.value);
  const minimum = Math.max(0, Math.min(...values) - 25);
  const maximum = Math.max(...values) + 25;

  return (
    <section className="trend-card" aria-labelledby="trend-title">
      <div className="section-heading">
        <div><p className="eyebrow">Reading history</p><h2 id="trend-title">Glucose trend</h2></div>
        <span>{readings.length} points</span>
      </div>
      <p className="trend-card__intro">Each point is one saved check-in. Hover or tap a point to see its date, time slot, and note.</p>
      <div className="trend-chart" role="img" aria-label={`Glucose trend with ${readings.length} readings`}>
        <LineChart data={data} margin={{ top: 12, right: 15, bottom: 8, left: -8 }} responsive style={{ width: '100%', height: '100%' }}>
          <CartesianGrid stroke="#dce8e5" strokeDasharray="3 6" vertical={false} />
          <XAxis axisLine={false} dataKey="label" interval="preserveStartEnd" minTickGap={22} tick={{ fill: '#617572', fontSize: 11 }} tickLine={false} />
          <YAxis axisLine={false} domain={[minimum, maximum]} tick={{ fill: '#617572', fontSize: 11 }} tickLine={false} width={48} />
          <Tooltip content={<TrendTooltip />} cursor={{ stroke: '#91bdb6', strokeDasharray: '3 4' }} />
          <Line dataKey="value" dot={<ReadingDot />} isAnimationActive={false} stroke="#0d6b62" strokeWidth={2.5} type="linear" />
        </LineChart>
      </div>
      <div className="trend-legend" aria-label="Time slot colors">
        {Object.entries(SLOT_COLORS).map(([slot, color]) => <span key={slot}><i style={{ background: color }} />{SLOT_LABELS[slot]}</span>)}
      </div>
    </section>
  );
}
