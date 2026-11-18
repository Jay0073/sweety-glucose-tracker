import { Pencil, Trash2 } from 'lucide-react';
import { SLOT_LABELS } from '../readingConfig.js';

export function ReadingList({ readings, onEdit, onDelete, deletingId }) {
  return (
    <section className="reading-list" aria-labelledby="reading-list-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Saved today</p>
          <h2 id="reading-list-title">Your readings</h2>
        </div>
        <span>{readings.length} of 4</span>
      </div>

      {readings.length === 0 ? (
        <div className="empty-state">
          <strong>No readings for this date</strong>
          <p>Choose a time slot and add your first value.</p>
        </div>
      ) : (
        <div className="reading-list__items">
          {readings.map((reading) => (
            <article className="reading-row" key={reading.id}>
              <div>
                <span className={`slot-symbol slot-symbol--${reading.slot}`} aria-hidden="true" />
                <div><strong>{SLOT_LABELS[reading.slot]}</strong><small>Glucose reading</small></div>
              </div>
              <p><strong>{reading.value}</strong><span>mg/dl</span></p>
              <div className="reading-row__actions">
                <button type="button" onClick={() => onEdit(reading)} aria-label={`Edit ${SLOT_LABELS[reading.slot]} reading`}><Pencil size={16} /></button>
                <button disabled={deletingId === reading.id} type="button" onClick={() => onDelete(reading)} aria-label={`Delete ${SLOT_LABELS[reading.slot]} reading`}><Trash2 size={16} /></button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

