import { describe, expect, it } from 'vitest';
import { slotForHour } from '../readingConfig.js';
import { aggregateDailyReadings } from './GlucoseTrend.jsx';
import { buildSlotAverages } from './SlotAverages.jsx';

const readings = [
  { readingDate: '2026-11-01', slot: 'morning', value: 100 },
  { readingDate: '2026-11-01', slot: 'after_breakfast', value: 140 },
  { readingDate: '2026-11-02', slot: 'morning', value: 110 },
  { readingDate: '2026-11-02', slot: 'after_breakfast', value: 150 }
];

describe('report insight calculations', () => {
  it('groups a period trend into comparable daily averages', () => {
    expect(aggregateDailyReadings(readings)).toEqual([
      { readingDate: '2026-11-01', label: '1', average: 120, lowest: 100, highest: 140, count: 2 },
      { readingDate: '2026-11-02', label: '2', average: 130, lowest: 110, highest: 150, count: 2 }
    ]);
  });

  it('calculates a separate average for each recorded time slot', () => {
    expect(buildSlotAverages(readings)).toEqual([
      { slot: 'morning', label: 'Morning', fullLabel: 'Morning (fasting)', average: 105, count: 2 },
      { slot: 'after_breakfast', label: 'Breakfast', fullLabel: 'After breakfast', average: 145, count: 2 }
    ]);
  });

  it('keeps a visible gap for dates with no readings', () => {
    expect(aggregateDailyReadings([
      { readingDate: '2026-11-01', slot: 'morning', value: 100 },
      { readingDate: '2026-11-03', slot: 'morning', value: 120 }
    ], '2026-11-01', '2026-11-03')).toEqual([
      { readingDate: '2026-11-01', label: '1', average: 100, lowest: 100, highest: 100, count: 1 },
      { readingDate: '2026-11-02', label: '2', average: null, lowest: null, highest: null, count: 0 },
      { readingDate: '2026-11-03', label: '3', average: 120, lowest: 120, highest: 120, count: 1 }
    ]);
  });

  it('selects the check-in that matches the current part of the day', () => {
    expect(slotForHour(6)).toBe('morning');
    expect(slotForHour(10)).toBe('after_breakfast');
    expect(slotForHour(15)).toBe('after_lunch');
    expect(slotForHour(21)).toBe('after_dinner');
  });
});
