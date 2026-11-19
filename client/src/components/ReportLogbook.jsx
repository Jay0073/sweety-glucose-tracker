import { ChevronDown, NotebookPen } from 'lucide-react';
import { formatDisplayDate, SLOT_LABELS } from '../readingConfig.js';
import { SlotMomentIcon } from './SlotMomentIcon.jsx';

export function ReportLogbook({ readings }) {
  return (
    <details className="report-logbook">
      <summary>
        <span><NotebookPen size={18} /><span><small>Detailed history</small><strong>Readings and context notes</strong></span></span>
        <span>{readings.length} entries <ChevronDown size={17} /></span>
      </summary>
      <div className="report-logbook__body">
        <div className="report-logbook__header" aria-hidden="true"><span>Date</span><span>Check-in</span><span>Glucose</span><span>Context</span></div>
        {readings.map((reading) => (
          <article className="report-logbook__row" key={reading.id}>
            <p><strong>{formatDisplayDate(reading.readingDate, { weekday: 'short' })}</strong><small>{reading.readingDate}</small></p>
            <p className="report-logbook__slot"><SlotMomentIcon size={16} slot={reading.slot} /><span>{SLOT_LABELS[reading.slot]}</span></p>
            <p className="report-logbook__value"><strong>{reading.value}</strong><small>mg/dl</small></p>
            <p className={reading.notes ? '' : 'is-empty'}>{reading.notes || 'No note added'}</p>
          </article>
        ))}
      </div>
    </details>
  );
}
