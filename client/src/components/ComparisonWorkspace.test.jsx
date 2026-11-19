import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../api.js';
import { ComparisonWorkspace } from './ComparisonWorkspace.jsx';

vi.mock('../api.js', () => ({ apiRequest: vi.fn() }));
vi.mock('../exportUtils.js', () => ({ downloadReportWorkbook: vi.fn() }));
vi.mock('../readingConfig.js', async (importOriginal) => ({
  ...(await importOriginal()),
  localToday: () => '2026-11-19'
}));
vi.mock('./ComparisonView.jsx', () => ({ ComparisonView: ({ report }) => <div>Compared {report.from} with {report.comparison.from}</div> }));

const report = {
  from: '2026-11-01',
  to: '2026-11-19',
  highest: 150,
  lowest: 90,
  average: 120,
  count: 2,
  daysLogged: 2,
  completeDays: 0,
  readings: [],
  comparison: {
    from: '2026-10-01',
    to: '2026-10-19',
    highest: 145,
    lowest: 95,
    average: 121,
    count: 2,
    daysLogged: 2,
    completeDays: 0,
    readings: []
  }
};

beforeEach(() => {
  vi.clearAllMocks();
  apiRequest.mockResolvedValue({ report });
});

describe('ComparisonWorkspace', () => {
  it('starts with a useful comparison and accepts two custom ranges', async () => {
    render(<ComparisonWorkspace token="test-token" user={{ name: 'Demo Patient', email: 'demo@sweety.local' }} />);

    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith(
      '/reports/compare?fromA=2026-11-01&toA=2026-11-19&fromB=2026-10-01&toB=2026-10-19',
      { token: 'test-token' }
    ));

    fireEvent.change(screen.getByLabelText('Period A start date'), { target: { value: '2026-09-01' } });
    fireEvent.change(screen.getByLabelText('Period A end date'), { target: { value: '2026-10-31' } });
    fireEvent.change(screen.getByLabelText('Period B start date'), { target: { value: '2026-07-01' } });
    fireEvent.change(screen.getByLabelText('Period B end date'), { target: { value: '2026-08-31' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update comparison' }));

    await waitFor(() => expect(apiRequest).toHaveBeenLastCalledWith(
      '/reports/compare?fromA=2026-09-01&toA=2026-10-31&fromB=2026-07-01&toB=2026-08-31',
      { token: 'test-token' }
    ));
  });

  it('explains why identical ranges cannot be compared', async () => {
    render(<ComparisonWorkspace token="test-token" user={{ name: 'Demo Patient', email: 'demo@sweety.local' }} />);
    await screen.findByText(/Compared/);

    fireEvent.change(screen.getByLabelText('Period B start date'), { target: { value: '2026-11-01' } });
    fireEvent.change(screen.getByLabelText('Period B end date'), { target: { value: '2026-11-19' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update comparison' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Choose two different periods to compare.');
  });
});
