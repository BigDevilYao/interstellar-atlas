import { useEffect } from 'react';
import { JOURNEY } from '../data/journey';
import { actions, useAtlas } from '../state/store';
import { journeyGo, journeyNext, journeyPrev } from './journeyControl';

const NODE_DWELL_MS = 7500;

/** Guided Journey: a cinematic route through the atlas with Next / Previous / Pause / Resume / Skip / Return. */
export function JourneyBar() {
  const mode = useAtlas((s) => s.mode);
  const view = useAtlas((s) => s.view);
  const index = useAtlas((s) => s.journeyIndex);
  const playing = useAtlas((s) => s.journeyPlaying);

  // Enter the journey at the first step.
  useEffect(() => {
    if (mode === 'journey') journeyGo(0, true);
  }, [mode]);

  // Auto-advance node steps while playing.
  useEffect(() => {
    if (mode !== 'journey' || !playing || view !== 'map') return;
    const step = JOURNEY[index];
    if (step?.kind !== 'node') return;
    const id = window.setTimeout(() => journeyNext(), NODE_DWELL_MS);
    return () => window.clearTimeout(id);
  }, [mode, playing, view, index]);

  if (mode !== 'journey' || view !== 'map') return null;
  const step = JOURNEY[index];

  return (
    <div className="journey" role="region" aria-label="Guided Journey">
      <div className="journey__progress" aria-hidden="true">
        {JOURNEY.map((s, i) => (
          <button
            key={i}
            type="button"
            tabIndex={-1}
            className={`journey__dot ${i === index ? 'is-on' : ''} ${i < index ? 'is-past' : ''} ${s.kind === 'threshold' ? 'is-th' : ''}`}
            onClick={() => journeyGo(i)}
            title={s.title}
          />
        ))}
      </div>
      <div className="journey__body">
        <p className="micro">
          Guided Journey · {index + 1} / {JOURNEY.length}
        </p>
        <h2 className="journey__title">{step.title}</h2>
        <p className="journey__caption">{step.caption}</p>
      </div>
      <div className="journey__controls">
        <button type="button" className="ctl" onClick={journeyPrev} disabled={index === 0} aria-label="Previous">
          ‹
        </button>
        {playing ? (
          <button type="button" className="ctl ctl--wide" onClick={() => actions.setJourney(index, false)}>
            Pause
          </button>
        ) : (
          <button type="button" className="ctl ctl--wide" onClick={() => journeyGo(index, true)}>
            Resume
          </button>
        )}
        <button type="button" className="ctl" onClick={journeyNext} aria-label="Next / skip">
          ›
        </button>
        {step.kind === 'threshold' && (
          <button type="button" className="ctl ctl--text" onClick={() => journeyGo(index, playing)}>
            ▸ Play threshold
          </button>
        )}
        <button
          type="button"
          className="ctl ctl--text"
          onClick={() => {
            actions.setMode('explore');
            actions.clearSelection();
          }}
        >
          Return to map
        </button>
      </div>
    </div>
  );
}
