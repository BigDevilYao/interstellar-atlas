import { JOURNEY } from '../data/journey';
import { actions, getState, setState } from '../state/store';

/** Apply the journey step at `index` (camera focus or threshold playback). */
export function applyJourneyStep(index: number): void {
  const step = JOURNEY[index];
  if (!step) return;
  if (step.kind === 'node') {
    setState({ view: 'map', threshold: null, sceneNode: null });
    actions.selectNode(step.node);
  } else {
    setState({ selectedNode: null, selectedConnection: null });
    actions.openThreshold(step.threshold, !!step.reverse, true);
  }
}

export function journeyGo(index: number, playing?: boolean): void {
  const i = Math.max(0, Math.min(JOURNEY.length - 1, index));
  actions.setJourney(i, playing);
  applyJourneyStep(i);
}

export function journeyNext(): void {
  const s = getState();
  if (s.journeyIndex >= JOURNEY.length - 1) {
    // End of the journey: return to the full map.
    actions.setJourney(s.journeyIndex, false);
    actions.backToMap();
    actions.clearSelection();
    return;
  }
  journeyGo(s.journeyIndex + 1);
}

export function journeyPrev(): void {
  journeyGo(getState().journeyIndex - 1);
}
