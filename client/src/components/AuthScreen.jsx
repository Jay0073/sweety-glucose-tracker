import { useState } from 'react';
import { ArrowRight, Check, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { apiRequest } from '../api.js';
import { Brand } from './Brand.jsx';

const EMPTY_FORM = { name: '', email: '', password: '' };

export function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isRegister = mode === 'register';

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setError('');
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setForm(EMPTY_FORM);
    setError('');
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const body = isRegister
        ? form
        : { email: form.email, password: form.password };
      const result = await apiRequest(`/auth/${isRegister ? 'register' : 'login'}`, {
        method: 'POST',
        body
      });
      onAuthenticated(result);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  function useDemo() {
    setMode('login');
    setForm({ name: '', email: 'demo@sweety.local', password: 'Sweety123!' });
    setError('');
  }

  return (
    <main className="auth-layout">
      <section className="auth-story" aria-labelledby="auth-story-title">
        <Brand />
        <div className="auth-story__copy">
          <p className="eyebrow">Four small check-ins</p>
          <h1 id="auth-story-title">A clearer picture of your day.</h1>
          <p>Record each glucose reading in moments, then see how your day and month are moving.</p>
        </div>
        <div className="day-preview" aria-hidden="true">
          {['Morning', 'Breakfast', 'Lunch', 'Dinner'].map((label, index) => (
            <div className={index < 2 ? 'day-preview__item day-preview__item--done' : 'day-preview__item'} key={label}>
              <span>{index < 2 ? <Check size={15} /> : index + 1}</span>
              <small>{label}</small>
            </div>
          ))}
          <div className="day-preview__line"><span /></div>
        </div>
      </section>

      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="auth-card">
          <div className="mode-switch" aria-label="Choose account action">
            <button className={!isRegister ? 'is-active' : ''} type="button" onClick={() => changeMode('login')}>Log in</button>
            <button className={isRegister ? 'is-active' : ''} type="button" onClick={() => changeMode('register')}>Create account</button>
          </div>

          <div className="auth-card__heading">
            <p className="eyebrow">{isRegister ? 'Start tracking' : 'Welcome back'}</p>
            <h2 id="auth-title">{isRegister ? 'Create your account' : 'Log in to Sweety'}</h2>
            <p>{isRegister ? 'Your readings stay private to your account.' : 'Your next check-in takes less than a minute.'}</p>
          </div>

          <form onSubmit={submit} noValidate>
            {isRegister && (
              <label className="field">
                <span>Name</span>
                <span className="field__control"><UserRound size={18} /><input autoComplete="name" name="name" onChange={updateField} placeholder="Your name" value={form.name} /></span>
              </label>
            )}
            <label className="field">
              <span>Email</span>
              <span className="field__control"><Mail size={18} /><input autoComplete="email" inputMode="email" name="email" onChange={updateField} placeholder="you@example.com" type="email" value={form.email} /></span>
            </label>
            <label className="field">
              <span>Password</span>
              <span className="field__control"><LockKeyhole size={18} /><input autoComplete={isRegister ? 'new-password' : 'current-password'} minLength={6} name="password" onChange={updateField} placeholder={isRegister ? 'At least 6 characters' : 'Your password'} type="password" value={form.password} /></span>
            </label>

            {error && <p className="form-error" role="alert">{error}</p>}

            <button className="primary-button" disabled={submitting} type="submit">
              <span>{submitting ? 'Please wait…' : isRegister ? 'Create account' : 'Log in'}</span>
              {!submitting && <ArrowRight size={18} />}
            </button>
          </form>

          {!isRegister && (
            <button className="demo-button" type="button" onClick={useDemo}>
              Fill demo account
              <span>demo@sweety.local</span>
            </button>
          )}
        </div>
      </section>
    </main>
  );
}

