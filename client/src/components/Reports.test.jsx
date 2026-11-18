import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../api.js';
import { Reports } from './Reports.jsx';

vi.mock('../api.js', () => ({ apiRequest: vi.fn() }));
vi.mock('./GlucoseTrend.jsx', () => ({ GlucoseTrend: () => <div>Trend chart</div> }));
vi.mock('./ConsistencyCalendar.jsx', () => ({ ConsistencyCalendar: () => <div>Consistency calendar</div> }));

const dailyReport = {
  type: 'daily',
  selectedDate: '2026-11-18',
  from: '2026-11-18',
  to: '2026-11-18',
  highest: 137,
  lowest: 101,
  average: 119,
  count: 2,
  readings: [
    { id: 1, readingDate: '2026-11-18', slot: 'morning', value: 101, notes: '' },
    { id: 2, readingDate: '2026-11-18', slot: 'after_breakfast', value: 137, notes: 'Oats for breakfast.' }
  ]
};

const monthReport = {
  ...dailyReport,
  type: 'month-to-date',
  from: '2026-11-01',
  count: 3,
  readings: [...dailyReport.readings, { id: 3, readingDate: '2026-11-10', slot: 'morning', value: 108, notes: '' }]
};

describe('Reports', () => {
  it('never renders a stale aggregate response as a daily report', async () => {
    let resolveSecondDaily;
    apiRequest
      .mockResolvedValueOnce({ report: dailyReport })
      .mockResolvedValueOnce({ report: monthReport })
      .mockImplementationOnce(() => new Promise((resolve) => { resolveSecondDaily = resolve; }));

    render(<Reports selectedDate="2026-11-18" token="test-token" onDateChange={vi.fn()} />);
    expect(await screen.findByRole('heading', { name: '18 Nov 2026' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /month to date/i }));
    expect(await screen.findByRole('heading', { name: '1–18 Nov 2026' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /daily/i }));
    expect(screen.getByText('Calculating your report…')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '1–18 Nov 2026' })).not.toBeInTheDocument();

    await act(async () => resolveSecondDaily({ report: dailyReport }));
    expect(await screen.findByRole('heading', { name: '18 Nov 2026' })).toBeInTheDocument();
  });
});
