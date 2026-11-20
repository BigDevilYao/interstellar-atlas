import { useEffect, useState } from 'react';
import { useAtlas } from '../state/store';
import './mobile.css';

const PORTRAIT_PHONE = '(hover: none) and (pointer: coarse) and (orientation: portrait) and (max-width: 860px)';

/**
 * Mobile-only additions (v1.2). The stylesheet adapts layout behind touch-screen media queries;
 * this component only shows a small, optional "turn sideways" suggestion in the cinematic views
 * on phones held upright. It never blocks anything, disappears on its own, and is shown once.
 */
export function MobileLayer() {
  const view = useAtlas((s) => s.view);
  const [portrait, setPortrait] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem('atlas.rotateHint') === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const mq = window.matchMedia(PORTRAIT_PHONE);
    const on = () => setPortrait(mq.matches);
    on();
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);

  const show = portrait && !dismissed && (view === 'cinema' || view === 'branch');

  useEffect(() => {
    if (!show) return;
    const id = window.setTimeout(() => dismiss(), 7000);
    return () => window.clearTimeout(id);
  });

  function dismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem('atlas.rotateHint', '1');
    } catch {
      /* storage unavailable */
    }
  }

  if (!show) return null;
  return (
    <button type="button" className="rotate-hint" onClick={dismiss} aria-label="Tip: turn your phone sideways for a wider view. Tap to dismiss.">
      <span className="rotate-hint__icon" aria-hidden="true">
        ⟲
      </span>
      Turn sideways for a wider view
    </button>
  );
}
