import { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import { apiRequest } from './api.js';
import { AuthScreen } from './components/AuthScreen.jsx';
import { Brand } from './components/Brand.jsx';

const TOKEN_KEY = 'sweety_token';

export default function App() {
  const [session, setSession] = useState({ loading: true, token: null, user: null });

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setSession({ loading: false, token: null, user: null });
      return;
    }

    apiRequest('/auth/me', { token })
      .then(({ user }) => setSession({ loading: false, token, user }))
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setSession({ loading: false, token: null, user: null });
      });
  }, []);

  function authenticated({ token, user }) {
    localStorage.setItem(TOKEN_KEY, token);
    setSession({ loading: false, token, user });
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setSession({ loading: false, token: null, user: null });
  }

  if (session.loading) {
    return <main className="loading-screen"><Brand /><span className="spinner" aria-label="Loading" /></main>;
  }

  if (!session.user) return <AuthScreen onAuthenticated={authenticated} />;

  return (
    <main className="app-shell">
      <header className="app-header">
        <Brand compact />
        <div className="app-header__user">
          <span>Hi, {session.user.name.split(' ')[0]}</span>
          <button className="icon-button" type="button" onClick={logout} aria-label="Log out"><LogOut size={19} /></button>
        </div>
      </header>
      <section className="welcome-card">
        <p className="eyebrow">Account ready</p>
        <h1>Your private glucose journal is ready.</h1>
        <p>Daily readings are coming in the next milestone.</p>
      </section>
    </main>
  );
}

