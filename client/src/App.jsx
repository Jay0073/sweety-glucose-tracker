import { useEffect, useState } from 'react';
import { apiRequest } from './api.js';
import { AuthScreen } from './components/AuthScreen.jsx';
import { Brand } from './components/Brand.jsx';
import { Dashboard } from './components/Dashboard.jsx';

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

  return <Dashboard session={session} onLogout={logout} />;
}

