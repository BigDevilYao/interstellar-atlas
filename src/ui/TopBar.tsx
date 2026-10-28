import { actions, useAtlas, type Mode } from '../state/store';

const MODES: { id: Mode; label: string }[] = [
  { id: 'explore', label: 'Explore' },
  { id: 'journey', label: 'Guided Journey' },
  { id: 'analysis', label: 'Analysis' },
];

export function TopBar() {
  const mode = useAtlas((s) => s.mode);
  return (
    <header className="topbar">
      <button type="button" className="brand" onClick={() => { actions.setMode('explore'); actions.clearSelection(); }} aria-label="INTERSTELLAR — return to the World Map">
        <span className="brand__title">INTERSTELLAR</span>
        <span className="brand__subtitle">An Atlas of Spatial &amp; Temporal Thresholds</span>
      </button>
      <nav className="modes" aria-label="Modes">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`modes__item ${mode === m.id ? 'is-on' : ''}`}
            aria-pressed={mode === m.id}
            onClick={() => actions.setMode(m.id)}
          >
            {m.label}
          </button>
        ))}
      </nav>
    </header>
  );
}
