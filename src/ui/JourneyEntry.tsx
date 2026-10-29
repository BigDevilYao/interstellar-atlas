import { actions, useAtlas } from '../state/store';

/**
 * Homepage entry: one click starts the cinematic journey at Chapter 01 · Murph's Room.
 */
export function JourneyEntry() {
  const view = useAtlas((s) => s.view);
  const mode = useAtlas((s) => s.mode);
  const selected = useAtlas((s) => !!(s.selectedNode || s.selectedConnection));
  if (view !== 'map' || mode !== 'explore') return null;
  return (
    <aside className={`entry ${selected ? 'is-tucked' : ''}`} aria-label="Begin the cinematic journey">
      <span className="entry__corner entry__corner--tl" aria-hidden="true" />
      <span className="entry__corner entry__corner--br" aria-hidden="true" />
      <p className="entry__kicker">
        <span className="hud__live" /> Cinematic journey · 14 chapters
      </p>
      <button type="button" className="entry__cta" onClick={() => actions.startJourney(0)}>
        <span className="entry__play" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M8 5l12 7-12 7z" />
          </svg>
        </span>
        <span className="entry__text">
          <span className="entry__title">Begin the journey</span>
          <span className="entry__sub">Chapter 01 · Murph’s Room</span>
        </span>
      </button>
      <p className="entry__route">
        Bedroom → Farm → NASA → Endurance → Saturn → Wormhole → Miller → Mann → Gargantua → Tesseract → … → Edmunds
      </p>
    </aside>
  );
}
