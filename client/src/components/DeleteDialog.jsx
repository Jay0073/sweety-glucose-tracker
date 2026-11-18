import { useEffect, useRef } from 'react';
import { Trash2, X } from 'lucide-react';
import { SLOT_LABELS } from '../readingConfig.js';

export function DeleteDialog({ reading, deleting, onCancel, onConfirm }) {
  const cancelRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!reading) return undefined;
    previousFocusRef.current = document.activeElement;
    cancelRef.current?.focus();
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function closeOnEscape(event) {
      if (event.key === 'Escape' && !deleting) onCancel();
    }
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', closeOnEscape);
      previousFocusRef.current?.focus?.();
    };
  }, [deleting, onCancel, reading]);

  if (!reading) return null;

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !deleting) onCancel(); }}>
      <section aria-labelledby="delete-title" aria-modal="true" className="confirm-dialog" role="dialog">
        <button aria-label="Close delete dialog" className="dialog-close" disabled={deleting} type="button" onClick={onCancel}><X size={18} /></button>
        <span className="confirm-dialog__icon"><Trash2 size={23} /></span>
        <p className="eyebrow">Remove check-in</p>
        <h2 id="delete-title">Delete {SLOT_LABELS[reading.slot]}?</h2>
        <p>The {reading.value} mg/dl reading and its note will be permanently removed.</p>
        <div className="confirm-dialog__actions">
          <button ref={cancelRef} disabled={deleting} type="button" onClick={onCancel}>Keep reading</button>
          <button className="danger-button" disabled={deleting} type="button" onClick={onConfirm}>{deleting ? 'Deleting…' : 'Delete reading'}</button>
        </div>
      </section>
    </div>
  );
}
