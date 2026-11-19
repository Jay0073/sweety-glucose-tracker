import { useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { formatDisplayDate, localToday } from '../readingConfig.js';

function toDate(value) {
  return new Date(`${value}T12:00:00`);
}

function toIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shiftDate(value, amount) {
  const date = toDate(value);
  date.setDate(date.getDate() + amount);
  return toIsoDate(date);
}

function shiftMonth(value, amount) {
  const [year, month, day] = value.split('-').map(Number);
  const target = new Date(year, month - 1 + amount, 1, 12);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0, 12).getDate();
  target.setDate(Math.min(day, lastDay));
  return toIsoDate(target);
}

export function DateNavigator({ value, onChange, max = localToday(), label = 'Journal date', step = 'day' }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const selected = toDate(value);
  const isToday = value === max;
  const previousValue = step === 'month' ? shiftMonth(value, -1) : shiftDate(value, -1);
  const rawNextValue = step === 'month' ? shiftMonth(value, 1) : shiftDate(value, 1);
  const nextValue = rawNextValue > max ? max : rawNextValue;
  const stepLabel = step === 'month' ? 'month' : 'day';

  useEffect(() => {
    if (!open) return undefined;
    const scrollY = window.scrollY;
    const previousOverflow = document.body.style.overflow;
    const previousPosition = document.body.style.position;
    const previousTop = document.body.style.top;
    const previousWidth = document.body.style.width;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    function closeAndReturnFocus() {
      setOpen(false);
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    }
    function closeOnOutsideClick(event) {
      if (!rootRef.current?.contains(event.target)) closeAndReturnFocus();
    }
    function closeOnEscape(event) {
      if (event.key === 'Escape') closeAndReturnFocus();
    }
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.position = previousPosition;
      document.body.style.top = previousTop;
      document.body.style.width = previousWidth;
      window.scrollTo(0, scrollY);
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  function chooseDate(date) {
    if (!date) return;
    onChange(toIsoDate(date));
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  return (
    <div className="date-navigator" ref={rootRef}>
      <button aria-label={`Previous ${stepLabel}`} className="date-navigator__step" type="button" onClick={() => onChange(previousValue)}>
        <ChevronLeft size={19} />
      </button>
      <div className="date-navigator__picker">
        <button
          ref={triggerRef}
          aria-expanded={open}
          aria-haspopup="dialog"
          className="date-navigator__trigger"
          type="button"
          onClick={() => setOpen((current) => !current)}
        >
          <CalendarDays size={19} />
          <span><small>{isToday ? 'Today' : label}</small><strong>{formatDisplayDate(value, { weekday: 'short' })}</strong></span>
          <ChevronDown size={16} />
        </button>
        {open && (
          <div aria-label="Choose a date" className="calendar-popover" role="dialog">
            <DayPicker
              disabled={{ after: toDate(max) }}
              fixedWeeks
              mode="single"
              selected={selected}
              showOutsideDays
              onSelect={chooseDate}
            />
            {!isToday && <button className="calendar-today" type="button" onClick={() => chooseDate(toDate(max))}>Jump to today</button>}
          </div>
        )}
      </div>
      <button aria-label={`Next ${stepLabel}`} className="date-navigator__step" disabled={value >= max} type="button" onClick={() => onChange(nextValue)}>
        <ChevronRight size={19} />
      </button>
    </div>
  );
}
