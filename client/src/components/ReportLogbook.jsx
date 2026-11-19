import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, NotebookPen } from 'lucide-react';
import { formatDisplayDate, SLOT_LABELS } from '../readingConfig.js';
import { SlotMomentIcon } from './SlotMomentIcon.jsx';

const PAGE_SIZE = 8;

export function ReportLogbook({ readings }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(readings.length / PAGE_SIZE));
  const startIndex = (page - 1) * PAGE_SIZE;
  const visibleReadings = useMemo(
    () => readings.slice(startIndex, startIndex + PAGE_SIZE),
    [readings, startIndex]
  );

  useEffect(() => setPage(1), [readings]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const visibleStart = readings.length === 0 ? 0 : startIndex + 1;
  const visibleEnd = Math.min(startIndex + PAGE_SIZE, readings.length);

  return (
    <details className="report-logbook">
      <summary>
        <span><NotebookPen size={18} /><span><small>Detailed history</small><strong>Readings and context notes</strong></span></span>
        <span>{readings.length} entries <ChevronDown size={17} /></span>
      </summary>
      <div className="report-logbook__body">
        <div className="report-logbook__header" aria-hidden="true"><span>Date</span><span>Check-in</span><span>Glucose</span><span>Context</span></div>
        {visibleReadings.map((reading) => (
          <article className="report-logbook__row" key={reading.id}>
            <p><strong>{formatDisplayDate(reading.readingDate, { weekday: 'short' })}</strong><small>{reading.readingDate}</small></p>
            <p className="report-logbook__slot"><SlotMomentIcon size={16} slot={reading.slot} /><span>{SLOT_LABELS[reading.slot]}</span></p>
            <p className="report-logbook__value"><strong>{reading.value}</strong><small>mg/dl</small></p>
            <p className={reading.notes ? '' : 'is-empty'}>{reading.notes || 'No note added'}</p>
          </article>
        ))}
      </div>
      {totalPages > 1 && (
        <nav className="report-logbook__pagination" aria-label="Detailed history pages">
          <p aria-live="polite">Showing {visibleStart}–{visibleEnd} of {readings.length}</p>
          <div>
            <button aria-label="Previous page" disabled={page === 1} type="button" onClick={() => setPage((current) => current - 1)}>
              <ChevronLeft size={16} /> Previous
            </button>
            <span aria-label={`Page ${page} of ${totalPages}`}>Page <strong>{page}</strong> of {totalPages}</span>
            <button aria-label="Next page" disabled={page === totalPages} type="button" onClick={() => setPage((current) => current + 1)}>
              Next <ChevronRight size={16} />
            </button>
          </div>
        </nav>
      )}
    </details>
  );
}
