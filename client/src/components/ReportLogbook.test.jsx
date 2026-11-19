import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ReportLogbook } from './ReportLogbook.jsx';

function makeReadings(count, prefix = '2026-11') {
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${index + 1}`,
    readingDate: `${prefix}-${String((index % 28) + 1).padStart(2, '0')}`,
    slot: 'morning',
    value: 101 + index,
    notes: index === 8 ? 'Visible on the second page.' : ''
  }));
}

describe('ReportLogbook', () => {
  it('paginates a long report history without losing the total count', () => {
    render(<ReportLogbook readings={makeReadings(25)} />);

    expect(screen.getByText('25 entries')).toBeInTheDocument();
    expect(screen.getByText('Showing 1–8 of 25')).toBeInTheDocument();
    expect(screen.queryByText('Visible on the second page.')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));

    expect(screen.getByText('Showing 9–16 of 25')).toBeInTheDocument();
    expect(screen.getByText('Visible on the second page.')).toBeInTheDocument();
    expect(screen.getByLabelText('Page 2 of 4')).toBeInTheDocument();
  });

  it('returns to the first page when the report period changes', () => {
    const { rerender } = render(<ReportLogbook readings={makeReadings(18)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByText('Showing 9–16 of 18')).toBeInTheDocument();

    rerender(<ReportLogbook readings={makeReadings(14, '2026-10')} />);

    expect(screen.getByText('Showing 1–8 of 14')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
  });
});
