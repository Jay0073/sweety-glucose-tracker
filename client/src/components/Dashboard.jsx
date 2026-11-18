import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, LogOut } from 'lucide-react';
import { apiRequest } from '../api.js';
import { formatDisplayDate, localToday, SLOTS } from '../readingConfig.js';
import { Brand } from './Brand.jsx';
import { DayRail } from './DayRail.jsx';
import { ReadingForm } from './ReadingForm.jsx';
import { ReadingList } from './ReadingList.jsx';

export function Dashboard({ session, onLogout }) {
  const today = useMemo(localToday, []);
  const [date, setDate] = useState(today);
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState('morning');
  const [deletingId, setDeletingId] = useState(null);

  const loadReadings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await apiRequest(`/readings?date=${date}`, { token: session.token });
      setReadings(result.data);
      const nextSlot = SLOTS.find((slot) => !result.data.some((reading) => reading.slot === slot.value));
      setSelectedSlot(nextSlot?.value ?? '');
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [date, session.token]);

  useEffect(() => {
    setEditing(null);
    loadReadings();
  }, [loadReadings]);

  function selectRailSlot(slot, reading) {
    if (reading) {
      setEditing(reading);
      setSelectedSlot(reading.slot);
    } else {
      setEditing(null);
      setSelectedSlot(slot);
    }
  }

  function editReading(reading) {
    setEditing(reading);
    setSelectedSlot(reading.slot);
    window.scrollTo({ top: 250, behavior: 'smooth' });
  }

  async function deleteReading(reading) {
    if (!window.confirm('Delete this reading? This action cannot be undone.')) return;
    setDeletingId(reading.id);
    setError('');
    try {
      await apiRequest(`/readings/${reading.id}`, { method: 'DELETE', token: session.token });
      if (editing?.id === reading.id) setEditing(null);
      await loadReadings();
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setDeletingId(null);
    }
  }

  const firstName = session.user.name.split(' ')[0];

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <Brand compact />
        <nav aria-label="Main navigation"><button className="is-active" type="button">Readings</button><button disabled type="button">Reports</button></nav>
        <div className="dashboard-header__user"><span>Hi, {firstName}</span><button type="button" onClick={onLogout} aria-label="Log out"><LogOut size={18} /></button></div>
      </header>

      <div className="dashboard-content">
        <section className="day-heading">
          <div><p className="eyebrow">Daily journal</p><h1>{date === today ? `Good day, ${firstName}.` : formatDisplayDate(date)}</h1><p>{date === today ? 'A quick check-in keeps your day on track.' : 'Review or update the readings saved for this date.'}</p></div>
          <label className="date-control"><CalendarDays size={18} /><span>Date</span><input max={today} type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
        </section>

        {error && <p className="page-error" role="alert">{error}</p>}

        <section className="daily-progress" aria-labelledby="progress-title">
          <div className="daily-progress__title"><div><p className="eyebrow">Today at a glance</p><h2 id="progress-title">{loading ? 'Loading readings…' : `${readings.length} of 4 check-ins complete`}</h2></div><strong>{readings.length}<span>/4</span></strong></div>
          <DayRail readings={readings} selectedSlot={editing?.slot ?? selectedSlot} onSelect={selectRailSlot} />
        </section>

        <div className="dashboard-grid">
          {!loading && (readings.length < 4 || editing) ? (
            <ReadingForm date={date} editing={editing} readings={readings} selectedSlot={selectedSlot} token={session.token} today={today} onSaved={() => { setEditing(null); return loadReadings(); }} onCancel={() => setEditing(null)} />
          ) : (
            <section className="entry-card entry-card--complete"><span><span>4</span>/4</span><div><p className="eyebrow">Day complete</p><h2>All four readings are saved.</h2><p>Select a completed slot above if you need to make a change.</p></div></section>
          )}
          <ReadingList readings={readings} onEdit={editReading} onDelete={deleteReading} deletingId={deletingId} />
        </div>
      </div>
    </main>
  );
}

