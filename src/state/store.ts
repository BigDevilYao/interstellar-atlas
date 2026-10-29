import { useSyncExternalStore } from 'react';
import { chapterIndexForNode } from '../cinema/chapters';
import type { Layer, NodeId, ThresholdId } from '../data/types';

/**
 * Tiny dependency-free global store (useSyncExternalStore).
 * UI and 3D components subscribe with selectors; actions are plain functions.
 */

export type Mode = 'explore' | 'journey' | 'analysis';
export type View = 'map' | 'threshold' | 'cinema';
export type Quality = 'high' | 'low';

export type CameraCommand =
  | { kind: 'home'; nonce: number }
  | { kind: 'focus-node'; node: NodeId; nonce: number }
  | { kind: 'focus-connection'; connection: string; nonce: number }
  | { kind: 'zoom'; factor: number; nonce: number };

export interface ThresholdRequest {
  id: ThresholdId;
  reverse: boolean;
  autoplay: boolean;
  /** Return to the cinema stage (instead of the map) when closed. */
  fromCinema?: boolean;
}

/** What the cinema stage shows: the chaptered journey, or one scene in free-look. */
export interface CinemaRequest {
  mode: 'journey' | 'scene';
  /** Chapter index (see cinema/chapters). */
  index: number;
  nonce: number;
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
  cinema: CinemaRequest | null;
  /** Current journey chapter, mirrored from the cinema engine (for the HUD and the map). */
  chapter: number;
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
  cinema: null,
  chapter: 0,
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
    if (mode === 'journey') actions.startJourney(0);
    else setState({ mode, view: 'map', threshold: null, cinema: null });
  },
  /** Start the cinematic Guided Journey (chapter 0 = Murph's Room). */
  startJourney(index = 0) {
    setState({
      mode: 'journey',
      view: 'cinema',
      cinema: { mode: 'journey', index, nonce: nonce++ },
      chapter: index,
      threshold: null,
      hoveredNode: null,
      hoveredConnection: null,
    });
  },
  openThreshold(id: ThresholdId, reverse = false, autoplay = false) {
    const fromCinema = state.view === 'cinema' || (state.view === 'threshold' && !!state.threshold?.fromCinema);
    setState({ view: 'threshold', threshold: { id, reverse, autoplay, fromCinema }, hoveredNode: null, hoveredConnection: null });
  },
  closeThreshold() {
    if (state.threshold?.fromCinema && state.cinema) setState({ view: 'cinema', threshold: null });
    else actions.backToMap();
  },
  /** Open a location's cinematic scene in free-look mode. */
  openScene(id: NodeId) {
    setState({
      view: 'cinema',
      cinema: { mode: 'scene', index: chapterIndexForNode(id), nonce: nonce++ },
      threshold: null,
      hoveredNode: null,
      hoveredConnection: null,
    });
  },
  setChapter(index: number) {
    if (state.chapter !== index) setState({ chapter: index });
  },
  backToMap() {
    setState((s) => ({ view: 'map', threshold: null, cinema: null, mode: s.mode === 'journey' ? 'explore' : s.mode }));
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
