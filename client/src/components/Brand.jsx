import { Droplets } from 'lucide-react';

export function Brand({ compact = false, onClick }) {
  const content = (
    <>
      <span className="brand__mark" aria-hidden="true"><Droplets size={22} strokeWidth={2.5} /></span>
      <span>
        <strong>Sweety</strong>
        {!compact && <small>Blood glucose tracker</small>}
      </span>
    </>
  );

  if (onClick) {
    return <button aria-label="Go to readings" className={`brand brand-button ${compact ? 'brand--compact' : ''}`} type="button" onClick={onClick}>{content}</button>;
  }
  return <div className={`brand ${compact ? 'brand--compact' : ''}`}>{content}</div>;
}

