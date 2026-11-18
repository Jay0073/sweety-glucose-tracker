import { Coffee, MoonStar, Pencil, Plus, Sunrise, SunMedium, Trash2 } from 'lucide-react';
import { formatDisplayDate, SLOTS } from '../readingConfig.js';

const SLOT_ICONS = {
  morning: Sunrise,
  after_breakfast: Coffee,
  after_lunch: SunMedium,
  after_dinner: MoonStar
};

export function DailyCheckins({ date, isToday, loading, readings, onSelect, onDelete, deletingId }) {
  return (
    <section className="checkins-card" aria-labelledby="checkins-title">
      <div className="checkins-card__heading">
        <div>
          <p className="eyebrow">{isToday ? 'Today' : formatDisplayDate(date)}</p>
          <h2 id="checkins-title">Your four check-ins</h2>
        </div>
        <div aria-label={`${readings.length} of 4 complete`} className="completion-mark" style={{ '--completion': `${readings.length * 25}%` }}>
          <strong>{readings.length}</strong><span>/4</span>
        </div>
      </div>

      <div className="checkin-list">
        {SLOTS.map((slot) => {
          const reading = readings.find((item) => item.slot === slot.value);
          const Icon = SLOT_ICONS[slot.value];
          return (
            <article className={`checkin-row ${reading ? 'is-complete' : ''}`} key={slot.value}>
              <span className={`checkin-row__moment checkin-row__moment--${slot.value}`} aria-hidden="true"><Icon size={20} /></span>
              <button className="checkin-row__main" disabled={loading} type="button" onClick={() => onSelect(slot.value, reading)}>
                <span><strong>{slot.label}</strong><small>{reading?.notes || (reading ? 'Saved reading' : 'No reading yet')}</small></span>
                {reading ? <span className="checkin-row__value"><strong>{reading.value}</strong><small>mg/dl</small></span> : <span className="checkin-row__add"><Plus size={16} /> Add</span>}
              </button>
              {reading && (
                <div className="checkin-row__actions">
                  <button aria-label={`Edit ${slot.label} reading`} type="button" onClick={() => onSelect(slot.value, reading)}><Pencil size={16} /></button>
                  <button aria-label={`Delete ${slot.label} reading`} disabled={deletingId === reading.id} type="button" onClick={() => onDelete(reading)}><Trash2 size={16} /></button>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {readings.length === 4 && <p className="checkins-card__complete">All four check-ins are saved for this day.</p>}
    </section>
  );
}
