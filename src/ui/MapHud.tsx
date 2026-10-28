import { LAYER_META } from '../data/connections';
import type { Layer } from '../data/types';
import { actions, useAtlas } from '../state/store';

const LAYERS: Layer[] = ['physical', 'spacetime', 'information'];

function Swatch({ layer }: { layer: Layer }) {
  return (
    <svg className="swatch" viewBox="0 0 34 8" width={34} height={8} aria-hidden="true">
      {layer === 'physical' && <line x1="1" y1="4" x2="33" y2="4" stroke="#ece8e0" strokeWidth="1.2" />}
      {layer === 'spacetime' && <line x1="1" y1="4" x2="33" y2="4" stroke="#f0c98f" strokeWidth="1.2" strokeDasharray="5 3" />}
      {layer === 'information' && (
        <line x1="1" y1="4" x2="33" y2="4" stroke="#a9c3e6" strokeWidth="1.6" strokeDasharray="0.8 3.2" strokeLinecap="round" />
      )}
    </svg>
  );
}

export function LayerLegend() {
  const layers = useAtlas((s) => s.layers);
  return (
    <div className="legend" role="group" aria-label="Connection layers">
      <span className="micro legend__title">Layers</span>
      {LAYERS.map((l) => (
        <button
          key={l}
          type="button"
          className={`legend__item ${layers[l] ? 'is-on' : ''}`}
          aria-pressed={layers[l]}
          onClick={() => actions.toggleLayer(l)}
          title={LAYER_META[l].description}
        >
          <Swatch layer={l} />
          <span>{LAYER_META[l].name}</span>
        </button>
      ))}
    </div>
  );
}

export function CameraControls() {
  const quality = useAtlas((s) => s.quality);
  const reducedMotion = useAtlas((s) => s.reducedMotion);
  const sound = useAtlas((s) => s.sound);
  return (
    <div className="controls" role="group" aria-label="View controls">
      <button type="button" className="ctl" onClick={() => actions.zoom(0.8)} aria-label="Zoom in" title="Zoom in (+)">
        <svg viewBox="0 0 16 16" width="14" height="14"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.2" /></svg>
      </button>
      <button type="button" className="ctl" onClick={() => actions.zoom(1.25)} aria-label="Zoom out" title="Zoom out (−)">
        <svg viewBox="0 0 16 16" width="14" height="14"><path d="M3 8h10" stroke="currentColor" strokeWidth="1.2" /></svg>
      </button>
      <button type="button" className="ctl" onClick={() => actions.clearSelection()} aria-label="Reset camera" title="Reset view (R)">
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.1">
          <circle cx="8" cy="8" r="5.2" />
          <circle cx="8" cy="8" r="1.2" />
          <path d="M8 0.8v2.4M8 12.8v2.4M0.8 8h2.4M12.8 8h2.4" />
        </svg>
      </button>
      <span className="controls__sep" />
      <button
        type="button"
        className={`ctl ctl--text ${quality === 'high' ? 'is-on' : ''}`}
        onClick={() => actions.setQuality(quality === 'high' ? 'low' : 'high')}
        title="Rendering quality"
        aria-label={`Rendering quality: ${quality}`}
      >
        {quality === 'high' ? 'HQ' : 'LQ'}
      </button>
      <button
        type="button"
        className={`ctl ctl--text ${reducedMotion ? 'is-on' : ''}`}
        onClick={() => actions.toggleReducedMotion()}
        title="Reduced motion"
        aria-pressed={reducedMotion}
        aria-label="Reduced motion"
      >
        RM
      </button>
      <button
        type="button"
        className={`ctl ctl--text ${sound ? 'is-on' : ''}`}
        onClick={() => actions.toggleSound()}
        title="Synthesised sound effects (thresholds and scenes)"
        aria-pressed={sound}
        aria-label="Sound effects"
      >
        {sound ? 'FX ON' : 'FX OFF'}
      </button>
    </div>
  );
}

export function Hint() {
  const selected = useAtlas((s) => s.selectedNode || s.selectedConnection);
  const mode = useAtlas((s) => s.mode);
  if (selected || mode !== 'explore') return null;
  return <p className="hint micro">Drag to explore · Scroll to zoom · Select a location or a trajectory</p>;
}
