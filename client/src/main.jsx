import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource-variable/manrope';
import '@fontsource-variable/newsreader';
import './styles.css';

function App() {
  return (
    <main className="launch-shell">
      <section className="launch-card">
        <div className="brand-mark" aria-hidden="true">S</div>
        <p className="eyebrow">Blood glucose, made easier</p>
        <h1>Sweety is getting ready.</h1>
        <p>The project foundation is running. Authentication and daily readings are the next milestone.</p>
        <a href="http://localhost:4000/api/health">Check API health</a>
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
);

