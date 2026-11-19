import { Check, Pencil, Plus, Trash2 } from 'lucide-react';
import { formatDisplayDate, SLOT_LABELS, SLOTS } from '../readingConfig.js';
import { SlotMomentIcon } from './SlotMomentIcon.jsx';

function momentHeading({ isToday, isCurrentMoment, reading }) {
  if (!isToday) return reading ? 'Saved on this day' : 'Backfill this day';
  if (!isCurrentMoment) return reading ? 'Earlier check-in' : 'Backfill a missed check-in';
  return reading ? 'Current check-in saved' : 'Recommended right now';
}

export function DailyCheckins({
  currentSlot,
  date,
  deletingId,
  isToday,
  loading,
  readings,
  selectedSlot,
  onDelete,
  onSelect
}) {
  const focusedSlot = selectedSlot || currentSlot || SLOTS[0].value;
  const focusedReading = readings.find((item) => item.slot === focusedSlot);
  const slot = SLOTS.find((item) => item.value === focusedSlot) ?? SLOTS[0];
  const isCurrentMoment = isToday && focusedSlot === currentSlot;
  const completion = readings.length * 25;

  return (
    <section className={`checkins-card moment-card moment-card--${focusedSlot}`} aria-labelledby="checkins-title">
      <div className="moment-card__topline">
        <div>
          <p className="eyebrow">{isToday ? 'Today’s rhythm' : formatDisplayDate(date)}</p>
          <h2 id="checkins-title">{momentHeading({ isToday, isCurrentMoment, reading: focusedReading })}</h2>
        </div>
        <span className="moment-card__count"><strong>{readings.length}</strong>/4 saved</span>
      </div>

      <div className="moment-card__focus">
        <SlotMomentIcon size={28} slot={focusedSlot} />
        <div className="moment-card__focus-copy">
          <small>{isCurrentMoment ? 'Current time slot' : 'Selected time slot'}</small>
          <h3>{slot.label}</h3>
          {focusedReading?.notes && <p>{focusedReading.notes}</p>}
        </div>
        {focusedReading ? (
          <p className="moment-card__value"><strong>{focusedReading.value}</strong><span>mg/dl</span></p>
        ) : (
          <button className="moment-card__add" disabled={loading} type="button" onClick={() => onSelect(focusedSlot)}>
            <Plus size={17} /> Add reading
          </button>
        )}
      </div>

      {focusedReading && (
        <div className="moment-card__actions">
          <button type="button" onClick={() => onSelect(focusedSlot, focusedReading)}><Pencil size={16} /> Edit reading</button>
          <button disabled={deletingId === focusedReading.id} type="button" onClick={() => onDelete(focusedReading)}><Trash2 size={16} /> Delete</button>
        </div>
      )}

      <div className="day-strip" aria-label="Four daily check-ins">
        {SLOTS.map((slot) => {
          const reading = readings.find((item) => item.slot === slot.value);
          const active = slot.value === focusedSlot;
          return (
            <button
              aria-label={`${slot.label}: ${reading ? `${reading.value} mg/dl saved` : 'not logged'}`}
              aria-pressed={active}
              className={`day-strip__item ${active ? 'is-active' : ''} ${reading ? 'is-complete' : ''}`}
              disabled={loading}
              key={slot.value}
              type="button"
              onClick={() => onSelect(slot.value, reading)}
            >
              <SlotMomentIcon size={17} slot={slot.value} />
              <span><strong>{slot.shortLabel}</strong><small>{reading ? `${reading.value} mg/dl` : 'Not logged'}</small></span>
              {reading && <Check className="day-strip__check" size={14} />}
            </button>
          );
        })}
      </div>

      <div className="moment-card__progress" aria-label={`${readings.length} of 4 check-ins saved`}>
        <span><i style={{ width: `${completion}%` }} /></span>
        <small>{readings.length === 4 ? 'Day complete' : `${4 - readings.length} check-in${readings.length === 3 ? '' : 's'} remaining`}</small>
      </div>
      <span className="sr-only">Focused slot: {SLOT_LABELS[focusedSlot]}</span>
    </section>
  );
}
