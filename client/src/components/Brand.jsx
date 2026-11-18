import { Droplets } from 'lucide-react';

export function Brand({ compact = false }) {
  return (
    <div className={`brand ${compact ? 'brand--compact' : ''}`}>
      <span className="brand__mark" aria-hidden="true"><Droplets size={22} strokeWidth={2.5} /></span>
      <span>
        <strong>Sweety</strong>
        {!compact && <small>Blood glucose tracker</small>}
      </span>
    </div>
  );
}

