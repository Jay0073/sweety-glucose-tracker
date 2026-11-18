import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, BookOpen } from 'lucide-react';
import { apiRequest } from '../api.js';
import { downloadReadingsCsv } from '../exportUtils.js';
import { formatDisplayDate, localToday, SLOTS } from '../readingConfig.js';
import { Brand } from './Brand.jsx';
import { DailyCheckins } from './DailyCheckins.jsx';
import { DateNavigator } from './DateNavigator.jsx';
import { DeleteDialog } from './DeleteDialog.jsx';
import { ProfileMenu } from './ProfileMenu.jsx';
import { ReadingForm } from './ReadingForm.jsx';

const Reports = lazy(() => import('./Reports.jsx').then((module) => ({ default: module.Reports })));

export function Dashboard({ session, onLogout }) {
  const [activeView, setActiveView] = useState('readings');
  const today = useMemo(localToday, []);
  const [date, setDate] = useState(today);
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState('morning');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState('');
  const formRef = useRef(null);
  const requestRef = useRef(0);
  const noticeTimeoutRef = useRef(null);

  const showNotice = useCallback((message) => {
    setNotice(message);
    window.clearTimeout(noticeTimeoutRef.current);
    noticeTimeoutRef.current = window.setTimeout(() => setNotice(''), 2800);
  }, []);

  useEffect(() => () => window.clearTimeout(noticeTimeoutRef.current), []);

  const loadReadings = useCallback(async () => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setLoading(true);
    setError('');
    try {
      const result = await apiRequest(`/readings?date=${date}`, { token: session.token });
      if (requestId !== requestRef.current) return;
      setReadings(result.data);
      const nextSlot = SLOTS.find((slot) => !result.data.some((reading) => reading.slot === slot.value));
      setSelectedSlot(nextSlot?.value ?? '');
    } catch (loadError) {
      if (requestId === requestRef.current) setError(loadError.message);
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [date, session.token]);

  useEffect(() => {
    setEditing(null);
    loadReadings();
  }, [loadReadings]);

  function bringFormIntoView() {
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }));
  }

  function selectSlot(slot, reading) {
    setEditing(reading ?? null);
    setSelectedSlot(slot);
    bringFormIntoView();
  }

  async function readingSaved(message) {
    setEditing(null);
    await loadReadings();
    showNotice(message);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    setError('');
    try {
      await apiRequest(`/readings/${deleteTarget.id}`, { method: 'DELETE', token: session.token });
      if (editing?.id === deleteTarget.id) setEditing(null);
      setDeleteTarget(null);
      await loadReadings();
      showNotice('Reading deleted.');
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setDeletingId(null);
    }
  }

  const closeDeleteDialog = useCallback(() => setDeleteTarget(null), []);

  async function exportAllHistory() {
    setExporting(true);
    setError('');
    try {
      const result = await apiRequest('/readings/export', { token: session.token });
      downloadReadingsCsv(result.data, `sweety-complete-history-${today}.csv`);
      showNotice('Complete history exported.');
    } catch (exportError) {
      setError(exportError.message);
    } finally {
      setExporting(false);
    }
  }

  function goHome() {
    setActiveView('readings');
    setDate(today);
  }

  const firstName = session.user.name.split(' ')[0];
  const showForm = !loading && (readings.length < 4 || editing);

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <Brand compact onClick={goHome} />
        <nav aria-label="Main navigation">
          <button aria-current={activeView === 'readings' ? 'page' : undefined} className={activeView === 'readings' ? 'is-active' : ''} type="button" onClick={() => setActiveView('readings')}><BookOpen size={16} /><span>Readings</span></button>
          <button aria-current={activeView === 'reports' ? 'page' : undefined} className={activeView === 'reports' ? 'is-active' : ''} type="button" onClick={() => setActiveView('reports')}><BarChart3 size={16} /><span>Reports</span></button>
        </nav>
        <ProfileMenu exporting={exporting} user={session.user} onExportAll={exportAllHistory} onLogout={onLogout} />
      </header>

      {activeView === 'reports' ? (
        <Suspense fallback={<section className="report-loading"><span className="spinner" /><p>Opening reports…</p></section>}>
          <Reports selectedDate={date} token={session.token} onDateChange={setDate} />
        </Suspense>
      ) : (
        <div className="dashboard-content journal-view">
          <section className="day-heading">
            <div>
              <p className="eyebrow">Daily journal</p>
              <h1>{date === today ? `Good day, ${firstName}.` : formatDisplayDate(date)}</h1>
              <p>{date === today ? 'A few seconds now makes your patterns easier to understand later.' : 'Review, explain, or update the check-ins saved for this day.'}</p>
            </div>
          </section>

          <DateNavigator label="Selected date" max={today} value={date} onChange={setDate} />
          {error && <p className="page-error" role="alert">{error}</p>}

          <div className={`journal-layout ${showForm ? '' : 'is-complete'}`}>
            <DailyCheckins
              date={date}
              deletingId={deletingId}
              isToday={date === today}
              loading={loading}
              readings={readings}
              onDelete={setDeleteTarget}
              onSelect={selectSlot}
            />
            {showForm && (
              <div className="entry-column" ref={formRef}>
                <ReadingForm
                  date={date}
                  editing={editing}
                  readings={readings}
                  selectedSlot={selectedSlot}
                  token={session.token}
                  today={today}
                  onCancel={() => setEditing(null)}
                  onSaved={readingSaved}
                />
              </div>
            )}
          </div>
        </div>
      )}

      <DeleteDialog deleting={deletingId !== null} reading={deleteTarget} onCancel={closeDeleteDialog} onConfirm={confirmDelete} />
      {notice && <div className="toast" role="status">{notice}</div>}
    </main>
  );
}
