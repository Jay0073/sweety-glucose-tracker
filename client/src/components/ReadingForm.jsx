import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, NotebookPen, X } from 'lucide-react';
import { apiRequest } from '../api.js';
import { SLOTS } from '../readingConfig.js';
import { SlotMomentIcon } from './SlotMomentIcon.jsx';

export function validateReadingForm({ value, readingDate, slot }, today) {
  if (value === '') return 'Please enter a glucose value.';
  const number = Number(value);
  if (!Number.isInteger(number) || number < 40 || number > 600) {
    return 'Value must be between 40 and 600 mg/dl.';
  }
  if (!readingDate) return 'Please pick a valid date.';
  if (readingDate > today) return 'Date cannot be in the future.';
  if (!slot) return 'Please pick a time slot.';
  return '';
}

export function ReadingForm({ currentSlot, date, editing, readings, selectedSlot, singleSlot = false, token, today, onSaved, onCancel }) {
  const [value, setValue] = useState('');
  const [slot, setSlot] = useState(selectedSlot ?? '');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);
  const slotDetails = SLOTS.find((option) => option.value === slot) ?? SLOTS[0];

  useEffect(() => {
    setValue(editing ? String(editing.value) : '');
    setSlot(editing?.slot ?? selectedSlot ?? '');
    setNotes(editing?.notes ?? '');
    setError('');
  }, [editing, selectedSlot, date]);

  function selectSlot(nextSlot) {
    setSlot(nextSlot);
    setError('');
    inputRef.current?.focus();
  }

  async function submit(event) {
    event.preventDefault();
    const message = validateReadingForm({ value, readingDate: date, slot }, today);
    if (message) {
      setError(message);
      return;
    }

    setSaving(true);
    setError('');
    try {
      const path = editing ? `/readings/${editing.id}` : '/readings';
      const result = await apiRequest(path, {
        method: editing ? 'PATCH' : 'POST',
        token,
        body: { readingDate: date, slot, value: Number(value), notes }
      });
      setValue('');
      setNotes('');
      await onSaved(editing ? 'Reading updated.' : 'Reading saved.', result.reading);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="entry-card" aria-labelledby="entry-title">
      <div className="entry-card__heading">
        <div>
          <p className="eyebrow">{editing ? 'Update check-in' : singleSlot ? 'Right now' : 'Quick check-in'}</p>
          <h2 id="entry-title">{editing ? 'Edit this reading' : `Add ${slotDetails.shortLabel.toLowerCase()} reading`}</h2>
        </div>
        {editing && <button className="text-button" type="button" onClick={onCancel}><X size={16} /> Cancel edit</button>}
      </div>

      <form onSubmit={submit} noValidate>
        {singleSlot ? (
          <div className="focused-slot-field">
            <SlotMomentIcon size={20} slot={slot} />
            <span><small>When did you measure?</small><strong>{slotDetails.label}</strong><em>{slot === currentSlot ? 'Suggested for the current time' : 'Selected from today’s check-ins'}</em></span>
          </div>
        ) : (
          <fieldset className="slot-picker">
            <legend>When did you measure?</legend>
            <div className="slot-picker__options">
              {SLOTS.map((option) => {
                const taken = readings.some((reading) => reading.slot === option.value && reading.id !== editing?.id);
                return (
                  <button
                    className={slot === option.value ? 'slot-option is-selected' : 'slot-option'}
                    disabled={taken}
                    key={option.value}
                    type="button"
                    onClick={() => selectSlot(option.value)}
                    aria-pressed={slot === option.value}
                  >
                    {slot === option.value && <Check size={15} />}
                    <span>{option.shortLabel}</span>
                    {taken && <small>Added</small>}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        <label className="value-field">
          <span>Glucose value</span>
          <span className="value-field__control">
            <input
              ref={inputRef}
              aria-describedby="value-hint"
              inputMode="numeric"
              max="600"
              min="40"
              name="value"
              onChange={(event) => { setValue(event.target.value); setError(''); }}
              placeholder="120"
              step="1"
              type="number"
              value={value}
            />
            <strong>mg/dl</strong>
          </span>
          <small id="value-hint">Whole number from 40 to 600</small>
        </label>

        <label className="notes-field">
          <span><NotebookPen size={16} /> Notes <small>Optional</small></span>
          <textarea
            maxLength={500}
            name="notes"
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Meal, medicine, activity, stress, illness, or anything that adds context…"
            rows={2}
            value={notes}
          />
          <small>{notes.length}/500 characters</small>
        </label>

        {error && <p className="form-error entry-error" role="alert">{error}</p>}

        <button className="primary-button entry-submit" disabled={saving} type="submit">
          <span>{saving ? 'Saving…' : editing ? 'Save changes' : 'Save reading'}</span>
          {!saving && <ArrowRight size={18} />}
        </button>
      </form>
    </section>
  );
}

