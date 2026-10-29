import { useEffect, useState } from 'react';
import { useAtlas } from '../state/store';

/** Minimal loading veil: a single thin circle drawing itself. */
export function Loader() {
  const ready = useAtlas((s) => s.ready);
  const [gone, setGone] = useState(false);
  useEffect(() => {
    if (!ready) return;
    const t = window.setTimeout(() => setGone(true), 1400);
    return () => window.clearTimeout(t);
  }, [ready]);
  if (gone) return null;
  return (
    <div className={`loader ${ready ? 'is-done' : ''}`} role="status" aria-live="polite">
      <svg viewBox="0 0 120 120" width="120" height="120" aria-hidden="true">
        <circle cx="60" cy="60" r="48" className="loader__ring" />
        <line x1="60" y1="4" x2="60" y2="116" className="loader__axis" />
      </svg>
      <span className="micro">{ready ? 'Calibrating spacetime' : 'Loading atlas'}</span>
    </div>
  );
}
