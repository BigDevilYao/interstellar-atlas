import { useSyncExternalStore } from 'react';
import { actions, getState, setState, type View } from '../../state/store';
import type { Stage } from './controller';

/**
 * STUDIO BRANCH — optional side branch of the Atlas:
 *   (end of the journey / World Map) → printer → touchscreen → UCLA studio → screen → Murph's room
 *   → back into the Atlas's own navigation (journey, free look, diagram, map).
 *
 * The branch keeps its own small state here and only touches the Atlas store through its existing
 * actions, plus one extra `view` value ('branch') that pauses the World Map and the cinema stage
 * while the branch is on screen. Remove this folder (and its four one-line hooks) and the Atlas is
 * exactly as before.
 *
 * Browser history: the Atlas itself does not use history. The branch records same-document entries
 * ({ sb: stage }) so Back / Forward step through the thresholds and, after the hand-off, back into the
 * branch. No URL changes; no reloads.
 */

export type BranchEntry = 'journey-end' | 'map';
export type HandOff = 'journey' | 'scene' | 'diagram' | 'map';

interface BranchState {
  open: boolean;
  /** Stage the branch (re)opens at. */
  initial: Stage;
  /** Increments on every (re)open, so the view re-mounts cleanly. */
  session: number;
  /** Fading out after a hand-off to the Atlas. */
  leaving: boolean;
  /** The user has crossed into the Atlas from the branch (enables the discreet return chip). */
  handedOff: HandOff | null;
}

type HistState = { sb?: Stage | 'atlas'; i?: number } | null;

let state: BranchState = { open: false, initial: 'printer', session: 0, leaving: false, handedOff: null };
let returnView: View = 'map';
let leaveTimer = 0;
const listeners = new Set<() => void>();

function set(patch: Partial<BranchState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function useBranch<T>(sel: (s: BranchState) => T): T {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => sel(state),
    () => sel(state),
  );
}

export function getBranch(): BranchState {
  return state;
}

// History is same-document state only (no URL change). Each entry carries an index so Back and
// Forward can be told apart. Some embedded frames refuse history: then Back is simply not wired to the
// branch, and the on-screen controls still work.
let histOk = true;
let cursor = 0;
let sessionStart = 0;
let rewindTo: number | null = null;
try {
  cursor = (history.state as HistState)?.i ?? 0;
} catch {
  /* no history */
}
export const hist = {
  get(): HistState {
    try {
      return history.state as HistState;
    } catch {
      return null;
    }
  },
  push(sb: Stage | 'atlas'): void {
    if (!histOk) return;
    try {
      history.pushState({ sb, i: cursor + 1 } satisfies HistState, '');
      cursor += 1;
    } catch {
      histOk = false;
    }
  },
  /** Step history back to before this branch session, so later Back presses don't land on stale steps. */
  rewind(): void {
    const n = cursor - sessionStart;
    if (!histOk || n <= 0) return;
    rewindTo = sessionStart;
    try {
      history.go(-n);
    } catch {
      rewindTo = null;
    }
  },
};

function open(initial: Stage) {
  window.clearTimeout(leaveTimer);
  const v = getState().view;
  if (v !== 'branch') returnView = v;
  sessionStart = cursor;
  // Pause the World Map / cinema underneath (both already stop rendering whenever view ≠ their own).
  setState({ view: 'branch', hoveredNode: null, hoveredConnection: null });
  set({ open: true, leaving: false, initial, session: state.session + 1 });
}

function close(restoreView: boolean) {
  window.clearTimeout(leaveTimer);
  if (restoreView && getState().view === 'branch') {
    // Back to exactly where the branch was entered (e.g. the journey's end card, or the map).
    const v = returnView === 'cinema' && !getState().cinema ? 'map' : returnView === 'threshold' && !getState().threshold ? 'map' : returnView;
    setState({ view: v });
  }
  set({ open: false, leaving: false });
}

export const branch = {
  /** Optional entrance: from the end of the journey or from the World Map. */
  enter(_from: BranchEntry) {
    if (state.open) return;
    open('printer');
    hist.push('printer');
  },
  /** Re-open at a stage (the return chip, or browser Back after the hand-off). */
  reopen(stage: Stage, record = true) {
    if (state.open && !state.leaving) return;
    open(stage);
    if (record) hist.push(stage);
  },
  /** The view reports each arrival; record it so Back retraces the thresholds. */
  arrived(stage: Stage) {
    if (hist.get()?.sb !== stage) hist.push(stage);
  },
  /** Leave the branch to where it was entered. */
  leave() {
    hist.rewind();
    close(true);
  },
  /**
   * Murph's room → the Atlas's own navigation. The Atlas scene starts underneath while the branch
   * still covers it, then the branch dissolves away and is disposed.
   */
  handOff(to: HandOff, record = true) {
    if (!state.open || state.leaving) return;
    if (to === 'journey') actions.startJourney(0);
    else if (to === 'scene') actions.openScene('bedroom');
    else if (to === 'diagram') actions.openThreshold('bedroom-tesseract');
    else actions.backToMap();
    if (record) hist.push('atlas');
    set({ leaving: true, handedOff: to });
    leaveTimer = window.setTimeout(() => close(false), 1300);
  },
  /** Browser Back / Forward. */
  onPop(st: HistState, view: { stage: Stage; goTo(s: Stage): boolean } | null) {
    const idx = st?.i ?? 0;
    const back = idx < cursor;
    cursor = idx;
    if (rewindTo !== null) {
      // The branch rewound history itself (on leaving); nothing else to do.
      if (idx === rewindTo) rewindTo = null;
      return;
    }
    const sb = st?.sb;
    if (sb === 'printer' || sb === 'studio' || sb === 'murph') {
      if (!state.open || state.leaving) branch.reopen(sb, false);
      // Mid-crossing the step is refused: re-record what is actually on screen.
      else if (view && !view.goTo(sb)) hist.push(view.stage);
      return;
    }
    if (sb === 'atlas') {
      if (!state.open || state.leaving) return;
      // Forward onto the hand-off: cross into the Atlas again. Back onto it: leave the branch.
      if (back) close(true);
      else branch.handOff(state.handedOff ?? 'journey', false);
      return;
    }
    // An entry from before the branch was entered.
    if (state.open) close(true);
  },
};
