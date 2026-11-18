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

export function DateNavigator({ value, onChange, max = localToday(), label = 'Journal date' }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const selected = toDate(value);
  const isToday = value === max;

  useEffect(() => {
    if (!open) return undefined;
    function closeOnOutsideClick(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    function closeOnEscape(event) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  function chooseDate(date) {
    if (!date) return;
    onChange(toIsoDate(date));
    setOpen(false);
  }

  return (
    <div className="date-navigator" ref={rootRef}>
      <button aria-label="Previous day" className="date-navigator__step" type="button" onClick={() => onChange(shiftDate(value, -1))}>
        <ChevronLeft size={19} />
      </button>
      <div className="date-navigator__picker">
        <button
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
      <button aria-label="Next day" className="date-navigator__step" disabled={value >= max} type="button" onClick={() => onChange(shiftDate(value, 1))}>
        <ChevronRight size={19} />
      </button>
    </div>
  );
}
