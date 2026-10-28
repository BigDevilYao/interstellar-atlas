import { useEffect, useState } from 'react';
import { CONNECTION_MAP, LAYER_META } from '../data/connections';
import { NODE_MAP } from '../data/nodes';
import { useAtlas } from '../state/store';

/** Cursor-following tooltip for trajectories. */
export function ConnectionTooltip() {
  const id = useAtlas((s) => s.hoveredConnection);
  const view = useAtlas((s) => s.view);
  const [pos, setPos] = useState({ x: -999, y: -999 });

  useEffect(() => {
    const onMove = (e: PointerEvent) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  if (!id || view !== 'map') return null;
  const c = CONNECTION_MAP[id];
  const flip = pos.x > window.innerWidth - 300;
  return (
    <div
      className="ctip"
      style={{ left: pos.x + (flip ? -16 : 16), top: pos.y + 14, transform: flip ? 'translateX(-100%)' : undefined }}
      role="tooltip"
    >
      <span className="micro">{LAYER_META[c.layer].name}</span>
      <strong>
        {NODE_MAP[c.from].name} {c.bidirectional ? '↔' : '→'} {NODE_MAP[c.to].name}
      </strong>
      <span>{c.label}</span>
    </div>
  );
}
