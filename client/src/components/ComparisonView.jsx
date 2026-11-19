import { Bar, BarChart, CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts';
import { formatDisplayDate, SLOTS } from '../readingConfig.js';
import { buildReportInsights, daysInRange, formatReportRange } from '../reportUtils.js';
import { aggregateDailyReadings } from './GlucoseTrend.jsx';
import { buildSlotAverages } from './SlotAverages.jsx';

const CURRENT_COLOR = '#0d6b62';
const PREVIOUS_COLOR = '#6872a0';

function averageByDate(readings, from, to) {
  return aggregateDailyReadings(readings, from, to);
}

export function buildComparisonTrend(report, type) {
  const previous = report.comparison;
  const previousReadings = previous.readings ?? [];
  if (type === 'daily') {
    return SLOTS.map((slot) => ({
      label: slot.shortLabel,
      current: report.readings.find((reading) => reading.slot === slot.value)?.value ?? null,
      previous: previousReadings.find((reading) => reading.slot === slot.value)?.value ?? null,
      currentDate: report.from,
      previousDate: previous.from
    }));
  }

  const currentDays = averageByDate(report.readings, report.from, report.to);
  const previousDays = averageByDate(previousReadings, previous.from, previous.to);
  const length = Math.max(currentDays.length, previousDays.length);
  return Array.from({ length }, (_, index) => ({
    label: String(index + 1),
    current: currentDays[index]?.average ?? null,
    previous: previousDays[index]?.average ?? null,
    currentDate: currentDays[index]?.readingDate ?? null,
    previousDate: previousDays[index]?.readingDate ?? null
  }));
}

function formatValue(value, kind) {
  if (!Number.isFinite(value)) return 'No data';
  if (kind === 'average') return `${value.toFixed(1)} mg/dl`;
  if (kind === 'glucose') return `${value} mg/dl`;
  if (kind === 'coverage') return `${value}%`;
  if (kind === 'frequency') return value.toFixed(1);
  return String(value);
}

function formatDifference(current, previous, kind) {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return 'Not comparable';
  const difference = current - previous;
  if (difference === 0) return 'No difference';
  const amount = kind === 'average' || kind === 'frequency' ? Math.abs(difference).toFixed(1) : Math.abs(difference).toFixed(0);
  const suffix = kind === 'average' || kind === 'glucose' ? ' mg/dl' : kind === 'coverage' ? ' points' : '';
  return `${amount}${suffix} ${difference > 0 ? 'higher' : 'lower'}`;
}

function ComparisonTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="chart-tooltip comparison-tooltip">
      <strong>{row.label}</strong>
      <p><i className="is-current" /><span>Period A<small>{row.currentDate ? formatDisplayDate(row.currentDate) : 'Outside range'}</small></span><b>{Number.isFinite(row.current) ? `${row.current.toFixed(1)} mg/dl` : 'No reading'}</b></p>
      <p><i className="is-previous" /><span>Period B<small>{row.previousDate ? formatDisplayDate(row.previousDate) : 'Outside range'}</small></span><b>{Number.isFinite(row.previous) ? `${row.previous.toFixed(1)} mg/dl` : 'No reading'}</b></p>
    </div>
  );
}

function ComparisonTrend({ report, type }) {
  const data = buildComparisonTrend(report, type);
  const values = data.flatMap((row) => [row.current, row.previous]).filter(Number.isFinite);
  const minimum = values.length ? Math.max(0, Math.floor(Math.min(...values) / 10) * 10 - 20) : 0;
  const maximum = values.length ? Math.ceil(Math.max(...values) / 10) * 10 + 20 : 200;

  return (
    <section className="comparison-chart-card" aria-labelledby="comparison-trend-title">
      <div className="section-heading">
        <div><p className="eyebrow">Pattern comparison</p><h2 id="comparison-trend-title">{type === 'daily' ? 'Check-in by check-in' : 'Day by day'}</h2></div>
        <div className="comparison-legend" aria-label="Chart legend"><span><i className="is-current" />Period A</span><span><i className="is-previous" />Period B</span></div>
      </div>
      <p className="comparison-card-intro">{type === 'daily'
        ? 'Each position represents the same time-of-day check-in.'
        : 'Days align by position within each period. Missing readings remain visible as breaks in either line.'}</p>
      <div className="comparison-trend-chart" role="img" aria-label="Selected and previous period glucose comparison">
        <LineChart data={data} margin={{ top: 12, right: 15, bottom: 8, left: -8 }} responsive style={{ width: '100%', height: '100%' }}>
          <CartesianGrid stroke="#dce8e5" strokeDasharray="3 6" vertical={false} />
          <XAxis axisLine={false} dataKey="label" interval="preserveStartEnd" minTickGap={24} tick={{ fill: '#617572', fontSize: 11 }} tickLine={false} />
          <YAxis axisLine={false} domain={[minimum, maximum]} tick={{ fill: '#617572', fontSize: 11 }} tickLine={false} width={48} />
          <Tooltip content={<ComparisonTooltip />} cursor={{ stroke: '#91bdb6', strokeDasharray: '3 4' }} filterNull={false} />
          <Line connectNulls={false} dataKey="current" dot={{ fill: CURRENT_COLOR, r: 4, stroke: 'white', strokeWidth: 2 }} isAnimationActive={false} stroke={CURRENT_COLOR} strokeWidth={2.6} type="monotone" />
          <Line connectNulls={false} dataKey="previous" dot={{ fill: PREVIOUS_COLOR, r: 4, stroke: 'white', strokeWidth: 2 }} isAnimationActive={false} stroke={PREVIOUS_COLOR} strokeDasharray="7 6" strokeWidth={2.2} type="monotone" />
        </LineChart>
      </div>
    </section>
  );
}

function SlotComparisonTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="chart-tooltip comparison-tooltip">
      <strong>{row.fullLabel}</strong>
      <p><i className="is-current" />Period A <b>{formatValue(row.current, 'average')}</b></p>
      <p><i className="is-previous" />Period B <b>{formatValue(row.previous, 'average')}</b></p>
    </div>
  );
}

function SlotComparison({ report }) {
  const current = new Map(buildSlotAverages(report.readings).map((item) => [item.slot, item]));
  const previous = new Map(buildSlotAverages(report.comparison.readings ?? []).map((item) => [item.slot, item]));
  const data = SLOTS.map((slot) => ({
    label: slot.shortLabel,
    fullLabel: slot.label,
    current: current.get(slot.value)?.average ?? null,
    previous: previous.get(slot.value)?.average ?? null
  }));

  return (
    <section className="comparison-chart-card" aria-labelledby="comparison-slots-title">
      <div className="section-heading">
        <div><p className="eyebrow">Time-of-day comparison</p><h2 id="comparison-slots-title">The same check-ins across both periods</h2></div>
        <div className="comparison-legend" aria-label="Chart legend"><span><i className="is-current" />Period A</span><span><i className="is-previous" />Period B</span></div>
      </div>
      <p className="comparison-card-intro">Each pair uses the average of only the readings saved for that check-in.</p>
      <div className="comparison-slot-chart" role="img" aria-label="Time-of-day averages for selected and previous periods">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 2, left: -8 }} responsive style={{ width: '100%', height: '100%' }}>
          <CartesianGrid stroke="#dce8e5" strokeDasharray="3 6" vertical={false} />
          <XAxis axisLine={false} dataKey="label" tick={{ fill: '#617572', fontSize: 11 }} tickLine={false} />
          <YAxis axisLine={false} tick={{ fill: '#617572', fontSize: 11 }} tickLine={false} width={48} />
          <Tooltip content={<SlotComparisonTooltip />} cursor={{ fill: '#edf6f4' }} />
          <Bar dataKey="current" fill={CURRENT_COLOR} isAnimationActive={false} maxBarSize={34} radius={[7, 7, 2, 2]} />
          <Bar dataKey="previous" fill={PREVIOUS_COLOR} isAnimationActive={false} maxBarSize={34} radius={[7, 7, 2, 2]} />
        </BarChart>
      </div>
    </section>
  );
}

export function ComparisonView({ report }) {
  const currentInsights = buildReportInsights(report);
  const previousReport = { ...report.comparison, readings: report.comparison.readings ?? [] };
  const previousInsights = buildReportInsights(previousReport);
  const currentDuration = daysInRange(report.from, report.to);
  const previousDuration = daysInRange(report.comparison.from, report.comparison.to);
  const isDaily = currentDuration === 1 && previousDuration === 1;
  const metrics = [
    { label: 'Average glucose', kind: 'average', current: report.average, previous: report.comparison.average },
    { label: 'Highest reading', kind: 'glucose', current: report.highest, previous: report.comparison.highest },
    { label: 'Lowest reading', kind: 'glucose', current: report.lowest, previous: report.comparison.lowest },
    { label: 'Readings saved', kind: 'count', current: report.count, previous: report.comparison.count },
    { label: 'Days covered', kind: 'coverage', current: currentInsights.coverage, previous: previousInsights.coverage }
  ];
  const loggingMetrics = [
    { label: 'Days with data', kind: 'count', current: currentInsights.daysLogged, previous: previousInsights.daysLogged },
    { label: 'Complete days', kind: 'count', current: currentInsights.completeDays, previous: previousInsights.completeDays },
    { label: 'Readings / logged day', kind: 'frequency', current: currentInsights.readingsPerLoggedDay, previous: previousInsights.readingsPerLoggedDay }
  ];

  return (
    <div className="comparison-view">
      <section className="comparison-periods" aria-labelledby="comparison-periods-title">
        <div className="comparison-periods__heading"><p className="eyebrow">Chosen periods</p><h2 id="comparison-periods-title">{isDaily ? 'Daily check-ins, side by side.' : `${currentDuration}-day period beside ${previousDuration}-day period.`}</h2></div>
        <div className="comparison-period-pair">
          <article className="is-current"><span>A</span><div><small>Period A</small><strong>{formatReportRange(report.from, report.to)}</strong></div></article>
          <b aria-hidden="true">vs</b>
          <article className="is-previous"><span>B</span><div><small>Period B</small><strong>{formatReportRange(report.comparison.from, report.comparison.to)}</strong></div></article>
        </div>
      </section>

      <section className="comparison-ledger" aria-labelledby="comparison-snapshot-title">
        <div className="section-heading"><div><p className="eyebrow">Side-by-side snapshot</p><h2 id="comparison-snapshot-title">What changed between the periods</h2></div><span>Descriptive only</span></div>
        <div className="comparison-ledger__header" aria-hidden="true"><span>Measure</span><span>Period A</span><span>Period B</span><span>Difference</span></div>
        <dl>
          {metrics.map((metric) => (
            <div key={metric.label}>
              <dt>{metric.label}</dt>
              <dd><small>Period A</small>{formatValue(metric.current, metric.kind)}</dd>
              <dd><small>Period B</small>{formatValue(metric.previous, metric.kind)}</dd>
              <dd><small>Difference</small>{formatDifference(metric.current, metric.previous, metric.kind)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <ComparisonTrend report={report} type={isDaily ? 'daily' : 'range'} />

      <section className="comparison-logging" aria-labelledby="comparison-logging-title">
        <div className="section-heading"><div><p className="eyebrow">Logging consistency</p><h2 id="comparison-logging-title">How much context each period contains</h2></div></div>
        <div className="comparison-logging__header" aria-hidden="true"><span>Measure</span><span>Period A</span><span>Period B</span><span>Difference</span></div>
        <dl>
          {loggingMetrics.map((metric) => (
            <div key={metric.label}>
              <dt>{metric.label}</dt>
              <dd><small>Period A</small>{formatValue(metric.current, metric.kind)}</dd>
              <dd><small>Period B</small>{formatValue(metric.previous, metric.kind)}</dd>
              <dd><small>Difference</small>{formatDifference(metric.current, metric.previous, metric.kind)}</dd>
            </div>
          ))}
        </dl>
        <p>Differences describe the saved data only. They do not label a period as better or worse.</p>
      </section>

      <SlotComparison report={report} />
    </div>
  );
}
