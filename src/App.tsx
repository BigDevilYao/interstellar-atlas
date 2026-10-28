import { Component, lazy, Suspense, useEffect, useMemo, type ReactNode } from 'react';
import { AnalysisMode } from './modes/AnalysisMode';
import { FlatMap } from './modes/FlatMap';
import { JourneyBar } from './modes/JourneyBar';
import { SceneViewer } from './scenes/SceneViewer';
import { actions, getState, useAtlas } from './state/store';
import { ThresholdPlayer } from './thresholds/ThresholdPlayer';
import { ConnectionTooltip } from './ui/ConnectionTooltip';
import { InfoPanel } from './ui/InfoPanel';
import { Loader } from './ui/Loader';
import { CameraControls, Hint, LayerLegend } from './ui/MapHud';
import { TopBar } from './ui/TopBar';

// The 3D World Map is code-split so the shell paints immediately.
const WorldMap = lazy(() => import('./three/WorldMap'));

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Graceful fallback: a flat SVG atlas generated from the same data. */
function FlatFallback({ reason }: { reason: string }) {
  useEffect(() => actions.setReady(), []);
  return (
    <div className="fallback">
      <FlatMap size={640} layers={['physical', 'spacetime', 'information']} showIcons onNode={(id) => actions.openScene(id)} title="Flat World Map" />
      <p className="micro">{reason} · showing the flat atlas · select a location to open its scene</p>
    </div>
  );
}

class MapBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.error('[atlas] World Map failed', error);
  }
  render() {
    if (this.state.error) return <FlatFallback reason="The 3D renderer could not start" />;
    return this.props.children;
  }
}

function useKeyboard() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const s = getState();
      if (e.key === 'Escape') {
        if (s.view !== 'map') {
          if (s.mode === 'journey') actions.setJourney(s.journeyIndex, false);
          actions.backToMap();
        } else if (s.mode === 'analysis') actions.setMode('explore');
        else if (s.selectedNode || s.selectedConnection) actions.clearSelection();
        return;
      }
      if (s.view !== 'map') return;
      if (e.key === 'r' || e.key === 'R') actions.clearSelection();
      else if (e.key === '+' || e.key === '=') actions.zoom(0.8);
      else if (e.key === '-' || e.key === '_') actions.zoom(1.25);
      else if (e.key === '1') actions.toggleLayer('physical');
      else if (e.key === '2') actions.toggleLayer('spacetime');
      else if (e.key === '3') actions.toggleLayer('information');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

export default function App() {
  const view = useAtlas((s) => s.view);
  const mode = useAtlas((s) => s.mode);
  const reducedMotion = useAtlas((s) => s.reducedMotion);
  const webgl = useMemo(hasWebGL, []);
  useKeyboard();

  return (
    <div className={`app mode-${mode} view-${view} ${reducedMotion ? 'is-reduced' : ''}`}>
      <main className="stage">
        {webgl ? (
          <MapBoundary>
            <Suspense fallback={null}>
              <WorldMap />
            </Suspense>
          </MapBoundary>
        ) : (
          <FlatFallback reason="WebGL is not available in this browser" />
        )}
      </main>

      <TopBar />
      {view === 'map' && mode !== 'analysis' && (
        <>
          <LayerLegend />
          <CameraControls />
          <Hint />
        </>
      )}
      <InfoPanel />
      <ConnectionTooltip />
      <JourneyBar />
      <AnalysisMode />
      <ThresholdPlayer />
      <SceneViewer />
      <Loader />
    </div>
  );
}
