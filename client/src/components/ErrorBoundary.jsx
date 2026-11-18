import { Component } from 'react';
import { RefreshCw } from 'lucide-react';
import { Brand } from './Brand.jsx';

export class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, details) {
    console.error('Sweety interface error', error, details);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main className="recovery-screen">
        <Brand />
        <section>
          <p className="eyebrow">Something interrupted this view</p>
          <h1>Your data is still safe.</h1>
          <p>Reload Sweety to return to your journal. If the problem continues, restart the client.</p>
          <button className="primary-button" type="button" onClick={() => window.location.reload()}>
            <span>Reload Sweety</span><RefreshCw size={18} />
          </button>
        </section>
      </main>
    );
  }
}
