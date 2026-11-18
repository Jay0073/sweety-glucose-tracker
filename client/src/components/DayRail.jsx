import { Check, Plus } from 'lucide-react';
import { SLOTS } from '../readingConfig.js';

export function DayRail({ readings, selectedSlot, onSelect }) {
  return (
    <div className="day-rail" aria-label="Daily reading slots">
      <div className="day-rail__track" aria-hidden="true"><span style={{ width: `${Math.max(0, readings.length - 1) * 33.333}%` }} /></div>
      {SLOTS.map((slot, index) => {
        const reading = readings.find((item) => item.slot === slot.value);
        return (
          <button
            className={`day-rail__stop ${reading ? 'is-complete' : ''} ${selectedSlot === slot.value ? 'is-selected' : ''}`}
            key={slot.value}
            type="button"
            onClick={() => onSelect(slot.value, reading)}
            aria-label={reading ? `${slot.label}: ${reading.value} mg/dl. Edit reading.` : `${slot.label}: add reading.`}
          >
            <span className="day-rail__dot">{reading ? <Check size={17} /> : <Plus size={16} />}</span>
            <strong>{slot.shortLabel}</strong>
            <small>{reading ? `${reading.value} mg/dl` : index === readings.length ? 'Next' : 'Not added'}</small>
          </button>
        );
      })}
    </div>
  );
}

