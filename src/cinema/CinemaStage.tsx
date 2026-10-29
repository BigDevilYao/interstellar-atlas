import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NODE_MAP } from '../data/nodes';
import { THRESHOLD_MAP } from '../data/thresholds';
import { SoundBridge } from '../lib/sound';
import { FlatMap } from '../modes/FlatMap';
import { MusicButton } from '../ui/MusicButton';
import { actions, getState, useAtlas } from '../state/store';
import { CHAPTERS } from './chapters';
import { CinemaEngine } from './engine';

/**
 * CINEMA STAGE
 * The full-screen cinematic layer: a WebGL scene engine plus a sci-fi heads-up display.
 * Journey mode plays the fourteen chapters in order, starting in Murph's room, with a unique
 * threshold transition into each. Scene mode holds one location for free look.
 */

const pad2 = (n: number) => String(n).padStart(2, '0');

interface Tick {
  k: number;
  transition: number | null;
  to: number | null;
  playing: boolean;
}

export default function CinemaStage() {
  const req = useAtlas((s) => s.cinema);
  const view = useAtlas((s) => s.view);
  const quality = useAtlas((s) => s.quality);
  const reducedMotion = useAtlas((s) => s.reducedMotion);
  const sound = useAtlas((s) => s.sound);

  const hostRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<CinemaEngine | null>(null);
  const soundRef = useRef<SoundBridge | null>(null);
  const lastTick = useRef(0);

  const [index, setIndex] = useState(req?.index ?? 0);
  const [tick, setTick] = useState<Tick>({ k: 0, transition: null, to: null, playing: true });
  const [ended, setEnded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hudHidden, setHudHidden] = useState(false);

  const active = view === 'cinema' && !!req;
  const journey = req?.mode === 'journey';
  const chapter = CHAPTERS[index] ?? CHAPTERS[0];

  // ── engine lifecycle ──
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let engine: CinemaEngine;
    try {
      engine = new CinemaEngine(host, {
        quality: getState().quality,
        reducedMotion: getState().reducedMotion,
        events: {
          onChapter: (i) => {
            setIndex(i);
            setEnded(false);
            actions.setChapter(i);
          },
          onTick: (info) => {
            const now = performance.now();
            if (now - lastTick.current < 90) return;
            lastTick.current = now;
            setTick({ k: info.k, transition: info.transition, to: info.to, playing: info.playing });
          },
          onEnd: () => setEnded(true),
          onQualityDrop: () => actions.setQuality('low'),
        },
      });
    } catch (err) {
      console.error('[cinema] could not start', err);
      setError('The cinematic renderer could not start on this device.');
      return;
    }
    engine.setAnchorLayer(anchorRef.current);
    engineRef.current = engine;
    return () => {
      engine.dispose();
      engineRef.current = null;
      soundRef.current?.stop();
    };
  }, []);

  // ── requests from the store ──
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !req) return;
    setEnded(false);
    setIndex(req.index);
    if (req.mode === 'journey') engine.playJourney(CHAPTERS, req.index);
    else {
      const ch = CHAPTERS[req.index];
      engine.showScene(ch.scene, ch.variant, ch.duration * 2);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req?.nonce]);

  useEffect(() => engineRef.current?.setQuality(quality), [quality]);
  useEffect(() => engineRef.current?.setReducedMotion(reducedMotion), [reducedMotion]);

  // Stop rendering while a diagram is open on top; resume on return.
  useEffect(() => {
    engineRef.current?.suspend(!active);
  }, [active]);

  // ── synthesised sound bed per chapter (original, Web Audio) ──
  useEffect(() => {
    if (!active || !sound) {
      soundRef.current?.stop();
      return;
    }
    if (!soundRef.current) soundRef.current = new SoundBridge();
    soundRef.current.start(chapter.sound, chapter.duration + 4);
    return () => soundRef.current?.stop();
  }, [active, sound, chapter]);

  // ── controls ──
  const togglePlay = useCallback(() => {
    const e = engineRef.current;
    if (!e) return;
    if (ended) {
      actions.startJourney(0);
      return;
    }
    e.setPlaying(!e.isPlaying());
    setTick((t) => ({ ...t, playing: e.isPlaying() }));
  }, [ended]);
  const next = useCallback(() => engineRef.current?.next_(), []);
  const prev = useCallback(() => engineRef.current?.prev(), []);
  const goto = useCallback((i: number) => engineRef.current?.goto(i), []);
  const exit = useCallback(() => actions.backToMap(), []);
  const freeLook = useCallback(() => actions.openScene(CHAPTERS[index].node), [index]);
  const resumeJourney = useCallback(() => actions.startJourney(index), [index]);
  const diagramId = chapter.enter?.threshold ?? CHAPTERS[index + 1]?.enter?.threshold;
  const openDiagram = useCallback(() => {
    if (!diagramId) return;
    engineRef.current?.setPlaying(false);
    actions.openThreshold(diagramId);
  }, [diagramId]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === ' ' && journey) {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowRight' && journey) next();
      else if (e.key === 'ArrowLeft' && journey) prev();
      else if (e.key === 'h' || e.key === 'H') setHudHidden((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, journey, togglePlay, next, prev]);

  // ── derived HUD content ──
  const caption = useMemo(() => {
    if (!journey) return null;
    let c: string | null = null;
    for (const cap of chapter.captions) if (tick.k >= cap.at) c = cap.text;
    return c;
  }, [journey, chapter, tick.k]);

  // Only a forward step crosses the target chapter's own threshold; jumps use a neutral time-lapse.
  const crossFrom = useRef<number | null>(null);
  if (tick.transition === null) crossFrom.current = null;
  else if (crossFrom.current === null) crossFrom.current = index;
  const incoming =
    tick.transition !== null && tick.to !== null && tick.to === (crossFrom.current ?? index) + 1 ? CHAPTERS[tick.to] : null;
  const node = NODE_MAP[chapter.node];
  const threshold = diagramId ? THRESHOLD_MAP[diagramId] : null;

  if (error) {
    return active ? (
      <section className="cine cine--error" role="dialog" aria-label="Cinematic view unavailable">
        <p className="micro">Signal lost</p>
        <p>{error}</p>
        <button type="button" className="btn btn--primary" onClick={exit}>
          Return to the atlas
        </button>
      </section>
    ) : null;
  }

  return (
    <section
      className={`cine ${active ? 'is-active' : ''} ${journey ? 'cine--journey' : 'cine--scene'} ${hudHidden ? 'is-clean' : ''} ${tick.transition !== null ? 'is-crossing' : ''}`}
      role="region"
      aria-label={journey ? 'Guided Journey' : `${chapter.title} — scene`}
      aria-hidden={!active}
    >
      <div ref={hostRef} className="cine__canvas" />
      <div ref={anchorRef} className="cine__anchors" aria-hidden="true" />
      {journey && <div className="cine__letterbox" aria-hidden="true" />}
      <div className="cine__scan" aria-hidden="true" />

      {/* top-left: chapter id */}
      <header className="hud hud--tl">
        <span className="hud__bracket" aria-hidden="true" />
        <p className="hud__kicker">
          {journey ? (
            <>
              <span className="hud__live" /> CH {pad2(index + 1)} <span className="hud__dim">/ {pad2(CHAPTERS.length)}</span>
            </>
          ) : (
            <>
              <span className="hud__live" /> FREE LOOK
            </>
          )}
        </p>
        <h1 className="hud__title" key={chapter.id}>
          {chapter.title}
        </h1>
        <p className="hud__place">{chapter.place}</p>
      </header>

      {/* top-right: telemetry */}
      <aside className="hud hud--tr" aria-label="Telemetry">
        <span className="hud__bracket hud__bracket--r" aria-hidden="true" />
        <dl className="telemetry">
          <div>
            <dt>Earth time</dt>
            <dd>{chapter.telemetry.earth}</dd>
          </div>
          <div>
            <dt>Mission</dt>
            <dd>{chapter.telemetry.mission}</dd>
          </div>
          <div>
            <dt>Layer</dt>
            <dd>{node?.spaceType ?? '—'}</dd>
          </div>
        </dl>
        {chapter.telemetry.note && <p className="telemetry__note">▲ {chapter.telemetry.note}</p>}
        <p className="telemetry__cam">CAM · {chapter.view}</p>
      </aside>

      {/* threshold crossing banner */}
      {journey && incoming?.enter && (
        <div className="crossing" aria-live="polite">
          <p className="micro">Threshold · {incoming.enter.kind}</p>
          <p className="crossing__label">{incoming.enter.label}</p>
          <div className="crossing__bar">
            <span style={{ transform: `scaleX(${tick.transition ?? 0})` }} />
          </div>
        </div>
      )}

      {/* subtitles */}
      {caption && !incoming && (
        <p className="subtitle" key={caption} aria-live="polite">
          {caption}
        </p>
      )}
      {!journey && (
        <p className="subtitle subtitle--hint">Drag to look around · scroll to move closer · labels mark what you are seeing</p>
      )}

      {/* minimap */}
      <figure className="hud hud--map" aria-label="Position on the World Map">
        <FlatMap size={150} layers={['physical']} showLabels={false} highlight={chapter.node} title="Position on the World Map" />
        <figcaption className="micro">{node?.name}</figcaption>
      </figure>

      {/* bottom: transport */}
      <footer className="hud hud--bottom">
        {journey && (
          <ol className="chapters" aria-label="Chapters">
            {CHAPTERS.map((c, i) => (
              <li key={c.id}>
                <button
                  type="button"
                  className={`chapters__tick ${i === index ? 'is-on' : ''} ${i < index ? 'is-past' : ''}`}
                  onClick={() => goto(i)}
                  aria-label={`Chapter ${i + 1}: ${c.title}`}
                  aria-current={i === index ? 'step' : undefined}
                  title={`${pad2(i + 1)} · ${c.title}`}
                >
                  <span className="chapters__fill" style={i === index ? { transform: `scaleX(${tick.k})` } : undefined} />
                </button>
              </li>
            ))}
          </ol>
        )}
        <div className="transport-bar">
          {journey ? (
            <>
              <button type="button" className="hctl" onClick={prev} disabled={index === 0} aria-label="Previous chapter" title="Previous (←)">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5v14M19 5l-9 7 9 7z" /></svg>
              </button>
              <button type="button" className="hctl hctl--main" onClick={togglePlay} aria-label={ended ? 'Replay' : tick.playing ? 'Pause' : 'Play'} title="Play / pause (space)">
                {ended ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 3-6.2M4 4v4h4" /></svg>
                ) : tick.playing ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4l13 8-13 8z" /></svg>
                )}
              </button>
              <button type="button" className="hctl" onClick={next} disabled={index === CHAPTERS.length - 1} aria-label="Next chapter" title="Next (→)">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 5v14M5 5l9 7-9 7z" /></svg>
              </button>
              <span className="transport-bar__sep" />
              <button type="button" className="hctl hctl--text" onClick={freeLook} title="Stop here and look around">
                Free look
              </button>
            </>
          ) : (
            <button type="button" className="hctl hctl--text hctl--accent" onClick={resumeJourney}>
              ▸ Play the journey from here
            </button>
          )}
          {threshold && (
            <button type="button" className="hctl hctl--text" onClick={openDiagram} title={`Open the threshold diagram: ${threshold.title}`}>
              Diagram · {threshold.code}
            </button>
          )}
          <MusicButton variant="hud" />
          <button type="button" className={`hctl hctl--text ${sound ? 'is-on' : ''}`} onClick={() => actions.toggleSound()} aria-pressed={sound} title="Original synthesised sound effects">
            FX {sound ? 'on' : 'off'}
          </button>
          <span className="transport-bar__sep" />
          <button type="button" className="hctl hctl--text" onClick={exit} title="Return to the World Map (Esc)">
            Exit to atlas
          </button>
        </div>
      </footer>

      {ended && journey && (
        <div className="endcard" role="dialog" aria-label="End of the journey">
          <p className="micro">End of transmission · 14 / 14</p>
          <h2 className="endcard__title">The journey continues without us.</h2>
          <p className="endcard__text">Fourteen places, fourteen thresholds — from a child’s room to a camp on a distant world.</p>
          <div className="endcard__actions">
            <button type="button" className="btn btn--primary" onClick={() => actions.startJourney(0)}>
              Replay from Murph’s Room
            </button>
            <button type="button" className="btn" onClick={exit}>
              Return to the atlas
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
