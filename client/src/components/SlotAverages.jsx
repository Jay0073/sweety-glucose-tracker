import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from 'recharts';
import { SLOTS } from '../readingConfig.js';
import { SLOT_COLORS } from './SlotMomentIcon.jsx';

export function buildSlotAverages(readings) {
  return SLOTS.map((slot) => {
    const values = readings.filter((reading) => reading.slot === slot.value).map((reading) => reading.value);
    const average = values.length ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10 : null;
    return { slot: slot.value, label: slot.shortLabel, fullLabel: slot.label, average, count: values.length };
  }).filter((item) => item.count > 0);
}

function daysInRange(from, to) {
  return Math.round((new Date(`${to}T12:00:00Z`) - new Date(`${from}T12:00:00Z`)) / 86400000) + 1;
}

function SlotTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <strong>{item.fullLabel}</strong>
      <p><b>{item.average.toFixed(1)}</b> mg/dl average</p>
      <span>{item.count} {item.count === 1 ? 'reading' : 'readings'}</span>
    </div>
  );
}

export function SlotAverages({ readings, from, to }) {
  const data = buildSlotAverages(readings);
  const mostRecorded = [...data].sort((a, b) => b.count - a.count)[0];
  const highestAverage = [...data].sort((a, b) => b.average - a.average)[0];
  const daysLogged = new Set(readings.map((reading) => reading.readingDate)).size;
  const totalDays = daysInRange(from, to);

  return (
    <section className="pattern-card" aria-labelledby="slot-pattern-title">
      <div className="section-heading">
        <div><p className="eyebrow">Time-of-day pattern</p><h2 id="slot-pattern-title">How the four check-ins compare</h2></div>
        <span>{daysLogged} days with data</span>
      </div>
      <div className="pattern-layout">
        <div className="slot-chart" role="img" aria-label="Average glucose by time slot">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 2, left: -10 }} responsive style={{ width: '100%', height: '100%' }}>
            <CartesianGrid stroke="#dce8e5" strokeDasharray="3 6" vertical={false} />
            <XAxis axisLine={false} dataKey="label" tick={{ fill: '#617572', fontSize: 11 }} tickLine={false} />
            <YAxis axisLine={false} tick={{ fill: '#617572', fontSize: 11 }} tickLine={false} width={48} />
            <Tooltip content={<SlotTooltip />} cursor={{ fill: '#edf6f4' }} />
            <Bar dataKey="average" radius={[9, 9, 3, 3]}>
              {data.map((item) => <Cell fill={SLOT_COLORS[item.slot]} key={item.slot} />)}
            </Bar>
          </BarChart>
        </div>
        <div className="pattern-notes">
          <article><small>Most often recorded</small><strong>{mostRecorded.fullLabel}</strong><span>{mostRecorded.count} check-ins in this period</span></article>
          <article><small>Highest slot average</small><strong>{highestAverage.fullLabel}</strong><span>{highestAverage.average.toFixed(1)} mg/dl across saved readings</span></article>
          <article><small>Days represented</small><strong>{daysLogged} of {totalDays}</strong><span>At least one check-in was saved</span></article>
        </div>
      </div>
      <p className="pattern-disclaimer">These are descriptive averages from the saved readings, not clinical target ranges.</p>
    </section>
  );
}
