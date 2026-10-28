import { useSyncExternalStore } from 'react';
import type { Layer, NodeId, ThresholdId } from '../data/types';

/**
 * Tiny dependency-free global store (useSyncExternalStore).
 * UI and 3D components subscribe with selectors; actions are plain functions.
 */

export type Mode = 'explore' | 'journey' | 'analysis';
export type View = 'map' | 'threshold' | 'scene';
export type Quality = 'high' | 'low';

export type CameraCommand =
  | { kind: 'home'; nonce: number }
  | { kind: 'focus-node'; node: NodeId; nonce: number }
  | { kind: 'focus-connection'; connection: string; nonce: number }
  | { kind: 'zoom'; factor: number; nonce: number };

export interface ThresholdRequest {
  id: ThresholdId;
  reverse: boolean;
  /** Called by guided journey to continue automatically. */
  autoplay: boolean;
}

export interface AtlasState {
  mode: Mode;
  view: View;
  hoveredNode: NodeId | null;
  selectedNode: NodeId | null;
  hoveredConnection: string | null;
  selectedConnection: string | null;
  layers: Record<Layer, boolean>;
  camera: CameraCommand;
  threshold: ThresholdRequest | null;
  sceneNode: NodeId | null;
  journeyIndex: number;
  journeyPlaying: boolean;
  reducedMotion: boolean;
  quality: Quality;
  sound: boolean;
  ready: boolean;
}

const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

let state: AtlasState = {
  mode: 'explore',
  view: 'map',
  hoveredNode: null,
  selectedNode: null,
  hoveredConnection: null,
  selectedConnection: null,
  layers: { physical: true, spacetime: true, information: true },
  camera: { kind: 'home', nonce: 0 },
  threshold: null,
  sceneNode: null,
  journeyIndex: 0,
  journeyPlaying: false,
  reducedMotion: !!prefersReducedMotion,
  quality: 'high',
  sound: false,
  ready: false,
};

const listeners = new Set<() => void>();
let nonce = 1;

export function getState(): AtlasState {
  return state;
}

export function setState(patch: Partial<AtlasState> | ((s: AtlasState) => Partial<AtlasState>)): void {
  const next = typeof patch === 'function' ? patch(state) : patch;
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Subscribe to a slice of state. Selectors should return primitives or stable references. */
export function useAtlas<T>(selector: (s: AtlasState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(state),
  );
}

// ───────────────────────── actions ─────────────────────────

export const actions = {
  hoverNode(id: NodeId | null) {
    if (state.hoveredNode !== id) setState({ hoveredNode: id });
  },
  hoverConnection(id: string | null) {
    if (state.hoveredConnection !== id) setState({ hoveredConnection: id });
  },
  selectNode(id: NodeId | null, focus = true) {
    setState({
      selectedNode: id,
      selectedConnection: null,
      camera: id && focus ? { kind: 'focus-node', node: id, nonce: nonce++ } : state.camera,
    });
  },
  selectConnection(id: string | null, focus = true) {
    setState({
      selectedConnection: id,
      selectedNode: null,
      camera: id && focus ? { kind: 'focus-connection', connection: id, nonce: nonce++ } : state.camera,
    });
  },
  clearSelection() {
    setState({ selectedNode: null, selectedConnection: null, camera: { kind: 'home', nonce: nonce++ } });
  },
  resetCamera() {
    setState({ camera: { kind: 'home', nonce: nonce++ } });
  },
  zoom(factor: number) {
    setState({ camera: { kind: 'zoom', factor, nonce: nonce++ } });
  },
  toggleLayer(layer: Layer) {
    setState((s) => ({ layers: { ...s.layers, [layer]: !s.layers[layer] } }));
  },
  setMode(mode: Mode) {
    if (mode === 'journey') {
      setState({ mode, journeyIndex: 0, journeyPlaying: true, selectedConnection: null, view: 'map', threshold: null, sceneNode: null });
    } else {
      setState({ mode, journeyPlaying: false, view: 'map', threshold: null, sceneNode: null });
    }
  },
  openThreshold(id: ThresholdId, reverse = false, autoplay = false) {
    setState({ view: 'threshold', threshold: { id, reverse, autoplay }, sceneNode: null, hoveredNode: null, hoveredConnection: null });
  },
  openScene(id: NodeId) {
    setState({ view: 'scene', sceneNode: id, threshold: null, hoveredNode: null, hoveredConnection: null });
  },
  backToMap() {
    setState({ view: 'map', threshold: null, sceneNode: null });
  },
  setJourney(index: number, playing?: boolean) {
    setState((s) => ({ journeyIndex: index, journeyPlaying: playing ?? s.journeyPlaying }));
  },
  setQuality(q: Quality) {
    setState({ quality: q });
  },
  toggleReducedMotion() {
    setState((s) => ({ reducedMotion: !s.reducedMotion }));
  },
  toggleSound() {
    setState((s) => ({ sound: !s.sound }));
  },
  setReady() {
    if (!state.ready) setState({ ready: true });
  },
};
