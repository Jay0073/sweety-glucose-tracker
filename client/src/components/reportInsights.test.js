import { describe, expect, it } from 'vitest';
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
});
