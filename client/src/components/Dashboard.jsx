import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, BookOpen, Columns2 } from 'lucide-react';
import { apiRequest } from '../api.js';
import { downloadReadingsCsv } from '../exportUtils.js';
import { formatDisplayDate, localToday, slotForHour, SLOTS } from '../readingConfig.js';
import { Brand } from './Brand.jsx';
import { DailyCheckins } from './DailyCheckins.jsx';
import { DateNavigator } from './DateNavigator.jsx';
import { DeleteDialog } from './DeleteDialog.jsx';
import { MonthSnapshot } from './MonthSnapshot.jsx';
import { ProfileMenu } from './ProfileMenu.jsx';
import { ReadingForm } from './ReadingForm.jsx';

const Reports = lazy(() => import('./Reports.jsx').then((module) => ({ default: module.Reports })));
const ComparisonWorkspace = lazy(() => import('./ComparisonWorkspace.jsx').then((module) => ({ default: module.ComparisonWorkspace })));

export function Dashboard({ session, onLogout }) {
  const [activeView, setActiveView] = useState('readings');
  const [reportEntryType, setReportEntryType] = useState('daily');
  const today = useMemo(localToday, []);
  const currentSlot = useMemo(() => slotForHour(), []);
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
  const [reportRevision, setReportRevision] = useState(0);
  const formRef = useRef(null);
  const requestRef = useRef(0);
  const noticeTimeoutRef = useRef(null);

  const showNotice = useCallback((message) => {
    setNotice(message);
    window.clearTimeout(noticeTimeoutRef.current);
    noticeTimeoutRef.current = window.setTimeout(() => setNotice(''), 2800);
  }, []);

  useEffect(() => () => window.clearTimeout(noticeTimeoutRef.current), []);

  const loadReadings = useCallback(async (focusedReading = null) => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setLoading(true);
    setError('');
    try {
      const result = await apiRequest(`/readings?date=${date}`, { token: session.token });
      if (requestId !== requestRef.current) return;
      setReadings(result.data);
      const refreshedFocus = focusedReading
        ? result.data.find((reading) => reading.id === focusedReading.id)
        : null;
      if (refreshedFocus) {
        setEditing(refreshedFocus);
        setSelectedSlot(refreshedFocus.slot);
        return;
      }
      const nextSlot = date === today
        ? currentSlot
        : SLOTS.find((slot) => !result.data.some((reading) => reading.slot === slot.value))?.value ?? SLOTS[0].value;
      setSelectedSlot(nextSlot);
    } catch (loadError) {
      if (requestId === requestRef.current) setError(loadError.message);
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [currentSlot, date, session.token, today]);

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

  async function readingSaved(message, savedReading) {
    setEditing(savedReading);
    setSelectedSlot(savedReading.slot);
    await loadReadings(savedReading);
    setReportRevision((current) => current + 1);
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
      setReportRevision((current) => current + 1);
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

  function openReports(type = 'daily') {
    setReportEntryType(type);
    setActiveView('reports');
  }

  const firstName = session.user.name.split(' ')[0];
  const selectedReading = readings.find((reading) => reading.slot === selectedSlot);
  const showForm = Boolean(editing || (!loading && readings.length < 4 && !selectedReading));

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <Brand compact onClick={goHome} />
        <nav aria-label="Main navigation">
          <button aria-current={activeView === 'readings' ? 'page' : undefined} className={activeView === 'readings' ? 'is-active' : ''} type="button" onClick={() => setActiveView('readings')}><BookOpen size={16} /><span>Readings</span></button>
          <button aria-current={activeView === 'reports' ? 'page' : undefined} className={activeView === 'reports' ? 'is-active' : ''} type="button" onClick={() => openReports('daily')}><BarChart3 size={16} /><span>Reports</span></button>
          <button aria-current={activeView === 'compare' ? 'page' : undefined} className={activeView === 'compare' ? 'is-active' : ''} type="button" onClick={() => setActiveView('compare')}><Columns2 size={16} /><span>Compare</span></button>
        </nav>
        <ProfileMenu exporting={exporting} user={session.user} onExportAll={exportAllHistory} onLogout={onLogout} />
      </header>

      {activeView === 'reports' ? (
        <Suspense fallback={<section className="report-loading"><span className="spinner" /><p>Opening reports…</p></section>}>
          <Reports initialType={reportEntryType} selectedDate={date} token={session.token} user={session.user} onDateChange={setDate} />
        </Suspense>
      ) : activeView === 'compare' ? (
        <Suspense fallback={<section className="report-loading"><span className="spinner" /><p>Opening comparison…</p></section>}>
          <ComparisonWorkspace token={session.token} user={session.user} />
        </Suspense>
      ) : (
        <div className="dashboard-content journal-view">
          <section className="day-heading page-intro">
            <div>
              <p className="eyebrow">Daily journal</p>
              <h1>{date === today ? `Good day, ${firstName}.` : formatDisplayDate(date)}</h1>
              <p>{date === today ? 'A few seconds now makes your patterns easier to understand later.' : 'Review, explain, or update the check-ins saved for this day.'}</p>
            </div>
            <DateNavigator label="Selected date" max={today} value={date} onChange={setDate} />
          </section>

          {error && <p className="page-error" role="alert">{error}</p>}

          <div className={`journal-layout ${showForm ? '' : 'is-complete'}`}>
            {showForm && (
              <div className="entry-column" ref={formRef}>
                <ReadingForm
                  currentSlot={currentSlot}
                  date={date}
                  editing={editing}
                  readings={readings}
                  selectedSlot={selectedSlot}
                  singleSlot={date === today}
                  token={session.token}
                  today={today}
                  onCancel={() => { setEditing(null); setSelectedSlot(currentSlot); }}
                  onSaved={readingSaved}
                />
              </div>
            )}
            <DailyCheckins
              currentSlot={currentSlot}
              date={date}
              deletingId={deletingId}
              isToday={date === today}
              loading={loading}
              readings={readings}
              selectedSlot={selectedSlot}
              onDelete={setDeleteTarget}
              onSelect={selectSlot}
            />
          </div>
          <MonthSnapshot
            date={date}
            isToday={date === today}
            refreshKey={reportRevision}
            token={session.token}
            onOpenReport={() => openReports('month-to-date')}
          />
        </div>
      )}

      <DeleteDialog deleting={deletingId !== null} reading={deleteTarget} onCancel={closeDeleteDialog} onConfirm={confirmDelete} />
      {notice && <div className="toast" role="status">{notice}</div>}
    </main>
  );
}
