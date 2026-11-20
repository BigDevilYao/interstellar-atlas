import { useCallback, useEffect, useRef, useState } from 'react';
import { MusicButton } from '../../ui/MusicButton';
import { getState } from '../../state/store';
import { REFERENCE_PHOTOS, assetUrl } from './assets';
import { branch, useBranch } from './branch';
import { StudioThresholdController, type HoverInfo, type Stage, type StudioView } from './controller';
import { setViewHandle } from './viewHandle';

/**
 * The Studio branch on screen. The scene logic is the Studio Threshold prototype's controller,
 * unchanged in behaviour; the frame around it uses the Atlas's own cinema HUD (brackets, kicker,
 * telemetry, crossing banner, transport bar), so the branch reads as part of the same instrument.
 */

const STAGES: { key: Stage; n: string; title: string; place: string; layer: string; cam: string; note: string }[] = [
  {
    key: 'printer',
    n: '01',
    title: 'The Printer',
    place: 'UCLA architecture studio · a 3D printer on a worktable',
    layer: 'Physical · object',
    cam: 'Locked-off close view · the touchscreen at the centre',
    note: 'A small screen is the threshold',
  },
  {
    key: 'studio',
    n: '02',
    title: 'UCLA Architecture Studio',
    place: 'Double-height studio · blue mezzanine and stair',
    layer: 'Physical · architectural interior',
    cam: 'Controlled look-around · five viewpoints',
    note: 'Railings repeat; the second printer leads on',
  },
  {
    key: 'murph',
    n: '03',
    title: "Murph's Room",
    place: 'Farmhouse · upstairs bedroom · reached through the bookshelf',
    layer: 'Domestic interior · threshold wall',
    cam: 'Arrival from behind the bookshelf',
    note: 'Back in the film’s first space',
  },
];

const VIEWS: { key: StudioView; label: string }[] = [
  { key: 'floor', label: 'Floor' },
  { key: 'stair', label: 'Stair' },
  { key: 'mezzanine', label: 'Mezzanine' },
  { key: 'windows', label: 'Windows' },
  { key: 'printers', label: 'Printers' },
];

const TOUCH = typeof window !== 'undefined' && window.matchMedia?.('(hover: none) and (pointer: coarse)').matches === true;

const HINTS: Record<Stage, string> = {
  printer: TOUCH ? 'Tap the small touchscreen to pass through it' : 'Hover the small touchscreen · click to pass through it',
  studio: 'Drag to look around · choose a viewpoint · the second printer’s screen leads on',
  murph: 'Drag to look around · continue in the Atlas, or go back through the bookshelf',
};

function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export default function StudioBranchView() {
  const initial = useBranch((s) => s.initial);
  const leaving = useBranch((s) => s.leaving);
  const hostRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const ctrl = useRef<StudioThresholdController | null>(null);
  const [stage, setStage] = useState<Stage>(initial);
  const [view, setView] = useState<StudioView>('floor');
  const [busy, setBusy] = useState<string | null>(null);
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const [lines, setLines] = useState(true);
  const [refs, setRefs] = useState(false);
  const [refIndex, setRefIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hostRef.current || !overlayRef.current) return;
    if (!webglAvailable()) {
      setError('This browser cannot run WebGL, so the Studio branch cannot be shown in 3D.');
      return;
    }
    let c: StudioThresholdController;
    try {
      c = new StudioThresholdController(
        hostRef.current,
        overlayRef.current,
        {
          onStage: (st) => {
            setStage(st);
            branch.arrived(st);
          },
          onView: setView,
          onBusy: (b, label) => setBusy(b ? label ?? '…' : null),
          onHover: setHover,
        },
        { reducedMotion: getState().reducedMotion, quality: getState().quality, initialStage: initial },
      );
    } catch (err) {
      console.error('[studio branch] renderer failed', err);
      setError('The 3D renderer could not start on this device.');
      return;
    }
    ctrl.current = c;
    setViewHandle({
      get stage() {
        return c.stage;
      },
      goTo(s: Stage) {
        if (c.busy) return false;
        c.goTo(s);
        return true;
      },
      back() {
        if (c.busy) return;
        if (c.stage === 'murph') c.goTo('studio');
        else if (c.stage === 'studio') c.goTo('printer');
        else branch.leave();
      },
    });
    (window as unknown as { __studioThreshold?: StudioThresholdController }).__studioThreshold = c;
    const onResize = () => c.resize();
    window.addEventListener('resize', onResize);
    const ro = new ResizeObserver(onResize);
    ro.observe(hostRef.current);
    // Crossing bar: read the controller's progress each frame (no React re-render per frame).
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const k = c.crossing;
      if (barRef.current) barRef.current.style.transform = `scaleX(${k ?? 0})`;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      setViewHandle(null);
      window.removeEventListener('resize', onResize);
      ro.disconnect();
      c.dispose();
      ctrl.current = null;
    };
    // Mount-only: one controller per branch session (the layer re-mounts this view per session).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => ctrl.current?.setReducedMotion(getState().reducedMotion));

  const go = useCallback((s: Stage) => ctrl.current?.goTo(s), []);
  const st = STAGES.find((s) => s.key === stage)!;
  const crossing = !!busy && busy !== 'Moving';

  if (error) {
    return (
      <section className="cine is-active cine--scene sb sb--fallback" role="dialog" aria-label="Studio branch">
        <header className="hud hud--tl">
          <span className="hud__bracket" aria-hidden="true" />
          <p className="hud__kicker">STUDIO BRANCH · OPTIONAL</p>
          <h1 className="hud__title">Studio Threshold</h1>
          <p className="hud__place">{error}</p>
        </header>
        <div className="sb-fallback__grid">
          {REFERENCE_PHOTOS.length > 0 && REFERENCE_PHOTOS.map((r) => (
            <figure key={r.file}>
              <img src={assetUrl(r.file)} alt={r.caption} loading="lazy" />
              <figcaption className="micro">{r.caption}</figcaption>
            </figure>
          ))}
        </div>
        <footer className="hud hud--bottom">
          <div className="transport-bar">
            <button type="button" className="hctl hctl--text" onClick={() => branch.leave()}>
              Return to the atlas
            </button>
          </div>
        </footer>
      </section>
    );
  }

  return (
    <section
      className={`cine is-active cine--scene sb sb--${stage} ${crossing ? 'is-crossing' : ''} ${leaving ? 'is-leaving' : ''}`}
      role="region"
      aria-label={`Studio branch — ${st.title}`}
    >
      <div ref={hostRef} className="cine__canvas sb__host" />
      <canvas ref={overlayRef} className="sb__overlay" aria-hidden="true" />
      <div className="cine__scan" aria-hidden="true" />

      <header className="hud hud--tl">
        <span className="hud__bracket" aria-hidden="true" />
        <p className="hud__kicker">
          <span className="hud__live" /> STUDIO BRANCH {st.n} <span className="hud__dim">/ 03</span>
        </p>
        <h1 className="hud__title" key={stage}>
          {st.title}
        </h1>
        <p className="hud__place">{st.place}</p>
      </header>

      <aside className="hud hud--tr" aria-label="Telemetry">
        <span className="hud__bracket hud__bracket--r" aria-hidden="true" />
        <dl className="telemetry">
          <div>
            <dt>Branch</dt>
            <dd>Studio threshold</dd>
          </div>
          <div>
            <dt>Space</dt>
            <dd>{stage === 'murph' ? 'Fictional · film set' : 'Physical · real studio'}</dd>
          </div>
          <div>
            <dt>Layer</dt>
            <dd>{st.layer}</dd>
          </div>
        </dl>
        <p className="telemetry__note">▲ {st.note}</p>
        <p className="telemetry__cam">CAM · {st.cam}</p>
      </aside>

      {crossing && (
        <div className="crossing" aria-live="polite">
          <p className="micro">Threshold · screen</p>
          <p className="crossing__label">{busy}</p>
          <div className="crossing__bar">
            <span ref={barRef} />
          </div>
        </div>
      )}

      {hover && !busy && (
        <div className={`sb-label sb-label--${hover.kind}`} style={{ left: hover.x, top: hover.y }}>
          <span className="sb-label__text">{hover.label}</span>
        </div>
      )}

      {!busy && (
        <p className="subtitle subtitle--hint" key={`hint-${stage}`}>
          {HINTS[stage]}
        </p>
      )}

      {refs && REFERENCE_PHOTOS.length > 0 && (
        <aside className="panel sb-refs" aria-label="Reference photographs">
          <p className="micro">Reference photographs · the studio and printer are modelled from these</p>
          <img src={assetUrl(REFERENCE_PHOTOS[refIndex].file)} alt={REFERENCE_PHOTOS[refIndex].caption} />
          <div className="sb-refs__thumbs">
            {REFERENCE_PHOTOS.map((r, i) => (
              <button key={r.file} type="button" className={i === refIndex ? 'is-on' : ''} onClick={() => setRefIndex(i)} title={r.caption}>
                <img src={assetUrl(r.file)} alt="" />
              </button>
            ))}
          </div>
          <p className="micro">{REFERENCE_PHOTOS[refIndex].caption}</p>
        </aside>
      )}

      <footer className="hud hud--bottom">
        <ol className="chapters sb-steps" aria-label="Studio branch">
          {STAGES.map((s, i) => (
            <li key={s.key}>
              <button
                type="button"
                className={`chapters__tick ${s.key === stage ? 'is-on' : ''} ${i < STAGES.findIndex((x) => x.key === stage) ? 'is-past' : ''}`}
                onClick={() => go(s.key)}
                disabled={!!busy || s.key === stage}
                aria-label={`${s.n} · ${s.title}`}
                aria-current={s.key === stage ? 'step' : undefined}
                title={`${s.n} · ${s.title}`}
              >
                <span className="chapters__fill" style={s.key === stage ? { transform: 'scaleX(1)' } : undefined} />
              </button>
            </li>
          ))}
        </ol>
        <div className="transport-bar">
          <button
            type="button"
            className="hctl"
            onClick={() => (stage === 'printer' ? branch.leave() : go(stage === 'murph' ? 'studio' : 'printer'))}
            disabled={!!busy}
            aria-label={stage === 'printer' ? 'Leave the branch' : 'Back through the previous threshold'}
            title={stage === 'printer' ? 'Leave the branch (Esc)' : 'Back through the previous threshold (Esc)'}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 5v14M19 5l-9 7 9 7z" />
            </svg>
          </button>

          {stage === 'printer' && (
            <button type="button" className="hctl hctl--text hctl--accent" onClick={() => go('studio')} disabled={!!busy}>
              ▸ Enter the touchscreen
            </button>
          )}

          {stage === 'studio' && (
            <>
              {VIEWS.map((v) => (
                <button key={v.key} type="button" className={`hctl hctl--text ${view === v.key ? 'is-on' : ''}`} onClick={() => ctrl.current?.setStudioView(v.key)} disabled={!!busy}>
                  {v.label}
                </button>
              ))}
              <span className="transport-bar__sep" />
              <button
                type="button"
                className={`hctl hctl--text ${lines ? 'is-on' : ''}`}
                onClick={() => {
                  setLines((v) => !v);
                  ctrl.current?.setLinework(!lines);
                }}
                aria-pressed={lines}
                title="Architectural linework"
              >
                Linework
              </button>
              <button type="button" className="hctl hctl--text hctl--accent" onClick={() => go('murph')} disabled={!!busy}>
                ▸ Through the screen · Murph’s Room
              </button>
            </>
          )}

          {stage === 'murph' && (
            <>
              <button type="button" className="hctl hctl--text hctl--accent" onClick={() => branch.handOff('journey')} disabled={!!busy || leaving}>
                ▸ Continue the journey · Ch 01
              </button>
              <button type="button" className="hctl hctl--text" onClick={() => branch.handOff('scene')} disabled={!!busy || leaving} title="Look around Murph's Room in the Atlas">
                Free look
              </button>
              <button type="button" className="hctl hctl--text" onClick={() => branch.handOff('diagram')} disabled={!!busy || leaving} title="Open the threshold diagram: Murph's Bedroom ↔ Tesseract">
                Diagram · TH·B
              </button>
            </>
          )}

          <span className="transport-bar__sep" />
          {REFERENCE_PHOTOS.length > 0 && (
            <button type="button" className={`hctl hctl--text ${refs ? 'is-on' : ''}`} onClick={() => setRefs((v) => !v)} aria-pressed={refs}>
              Photos
            </button>
          )}
          <MusicButton variant="hud" />
          <span className="transport-bar__sep" />
          <button
            type="button"
            className="hctl hctl--text"
            onClick={() => (stage === 'murph' ? branch.handOff('map') : branch.leave())}
            disabled={leaving}
            title={stage === 'murph' ? 'Return to the World Map' : 'Leave the branch and return to where you entered it'}
          >
            {stage === 'murph' ? 'Exit to atlas' : 'Leave branch'}
          </button>
        </div>
      </footer>
    </section>
  );
}
