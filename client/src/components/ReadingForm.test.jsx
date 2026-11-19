import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../api.js';
import { ReadingForm } from './ReadingForm.jsx';

vi.mock('../api.js', () => ({ apiRequest: vi.fn() }));

const baseProps = {
  date: '2025-01-15',
  editing: null,
  readings: [],
  selectedSlot: 'morning',
  token: 'test-token',
  today: '2025-01-20',
  onSaved: vi.fn(),
  onCancel: vi.fn()
};

beforeEach(() => {
  vi.clearAllMocks();
  baseProps.onSaved.mockResolvedValue();
});

describe('ReadingForm', () => {
  it('shows the required-value message without sending a request', () => {
    render(<ReadingForm {...baseProps} />);

    fireEvent.click(screen.getByRole('button', { name: /save reading/i }));

    expect(screen.getByRole('alert')).toHaveTextContent('Please enter a glucose value.');
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it('rejects a decimal value with the assignment range message', () => {
    render(<ReadingForm {...baseProps} />);

    fireEvent.change(screen.getByRole('spinbutton', { name: /glucose value/i }), {
      target: { value: '120.5' }
    });
    fireEvent.click(screen.getByRole('button', { name: /save reading/i }));

    expect(screen.getByRole('alert')).toHaveTextContent('Value must be between 40 and 600 mg/dl.');
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it('sends the selected slot and whole-number value', async () => {
    apiRequest.mockResolvedValue({ reading: { id: 1 } });
    render(<ReadingForm {...baseProps} />);

    fireEvent.click(screen.getByRole('button', { name: /lunch/i }));
    fireEvent.change(screen.getByRole('spinbutton', { name: /glucose value/i }), {
      target: { value: '128' }
    });
    fireEvent.change(screen.getByRole('textbox', { name: /notes/i }), {
      target: { value: 'Walked after lunch.' }
    });
    fireEvent.click(screen.getByRole('button', { name: /save reading/i }));

    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/readings', {
      method: 'POST',
      token: 'test-token',
      body: { readingDate: '2025-01-15', slot: 'after_lunch', value: 128, notes: 'Walked after lunch.' }
    }));
    expect(baseProps.onSaved).toHaveBeenCalledWith('Reading saved.', { id: 1 });
  });

  it('updates an existing reading through the same form', async () => {
    apiRequest.mockResolvedValue({ reading: { id: 7 } });
    const editing = {
      id: 7,
      readingDate: '2025-01-15',
      slot: 'after_breakfast',
      value: 132,
      notes: 'Ate fruit with breakfast.'
    };
    render(<ReadingForm {...baseProps} editing={editing} readings={[editing]} />);

    fireEvent.change(screen.getByRole('spinbutton', { name: /glucose value/i }), {
      target: { value: '140' }
    });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/readings/7', {
      method: 'PATCH',
      token: 'test-token',
      body: { readingDate: '2025-01-15', slot: 'after_breakfast', value: 140, notes: 'Ate fruit with breakfast.' }
    }));
  });
});
