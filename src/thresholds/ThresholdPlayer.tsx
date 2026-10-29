import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NODE_MAP } from '../data/nodes';
import { THRESHOLD_MAP, THRESHOLDS } from '../data/thresholds';
import { Wire } from '../lib/wire3d';
import { SoundBridge } from '../lib/sound';
import { MusicButton } from '../ui/MusicButton';
import { actions, getState, useAtlas } from '../state/store';
import { SEQUENCES } from './registry';

/**
 * THRESHOLD PLAYER
 * Plays a threshold's unique sequence on a full-screen canvas with captions, beat markers,
 * scrubbing, pause/resume, reverse playback and an optional synthesised sound bridge.
 */
export function ThresholdPlayer() {
  const req = useAtlas((s) => s.threshold);
  const view = useAtlas((s) => s.view);
  const sound = useAtlas((s) => s.sound);
  const reducedMotion = useAtlas((s) => s.reducedMotion);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [reverse, setReverse] = useState(false);
  const [done, setDone] = useState(false);
  const elapsed = useRef(0);
  const clock = useRef(0);
  const sb = useRef<SoundBridge | null>(null);
  const doneFired = useRef(false);

  const th = req ? THRESHOLD_MAP[req.id] : null;
  const draw = req ? SEQUENCES[req.id] : null;
  const duration = th ? th.duration * (reducedMotion ? 1.6 : 1) : 1;

  // Reset on new request.
  useEffect(() => {
    if (!req) return;
    elapsed.current = 0;
    clock.current = 0;
    doneFired.current = false;
    setProgress(0);
    setDone(false);
    setReverse(req.reverse);
    setPlaying(true);
  }, [req]);

  // Sound bridge.
  useEffect(() => {
    if (!th || view !== 'threshold') return;
    if (!sound) {
      sb.current?.stop();
      return;
    }
    if (!sb.current) sb.current = new SoundBridge();
    sb.current.start(th.sound, duration * (1 - elapsed.current / duration));
    return () => sb.current?.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [th, sound, view]);

  useEffect(() => {
    if (!sb.current) return;
    if (playing && !done) sb.current.resume();
    else sb.current.pause();
  }, [playing, done]);

  // Render loop.
  useEffect(() => {
    if (!th || !draw || view !== 'threshold') return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    let raf = 0;
    let last = performance.now();
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = getState();
      const isPlaying = (canvas.dataset.playing ?? '1') === '1';
      if (isPlaying && elapsed.current < duration) elapsed.current = Math.min(duration, elapsed.current + dt);
      if (!s.reducedMotion || isPlaying) clock.current += dt;
      const raw = elapsed.current / duration;
      const p = canvas.dataset.reverse === '1' ? 1 - raw : raw;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
      const wire = new Wire(ctx, w, h);
      try {
        draw({ ctx, w, h, p, t: clock.current, wire });
      } catch (err) {
        console.error('[threshold] draw error', err);
      }
      // Vignette.
      const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.7)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      setProgress(raw);
      if (raw >= 1 && !doneFired.current) {
        doneFired.current = true;
        setDone(true);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [th, draw, view, duration]);

  // Mirror UI state into the canvas dataset (read inside the RAF loop without re-subscribing).
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.dataset.playing = playing ? '1' : '0';
      canvasRef.current.dataset.reverse = reverse ? '1' : '0';
    }
  }, [playing, reverse]);

  const close = useCallback(() => {
    sb.current?.stop();
    actions.closeThreshold();
  }, []);

  const seekTo = useCallback(
    (raw: number) => {
      elapsed.current = Math.max(0, Math.min(1, raw)) * duration;
      doneFired.current = elapsed.current >= duration;
      setDone(doneFired.current);
    },
    [duration],
  );

  const beats = th?.beats ?? [];
  const pShown = reverse ? 1 - progress : progress;
  const beatIndex = useMemo(() => {
    let idx = 0;
    beats.forEach((b, i) => {
      if (pShown >= b.at) idx = i;
    });
    return idx;
  }, [beats, pShown]);

  const jumpBeat = useCallback(
    (dir: 1 | -1) => {
      const target = Math.max(0, Math.min(beats.length - 1, beatIndex + (reverse ? -dir : dir)));
      const at = beats[target].at + 0.001;
      seekTo(reverse ? 1 - at : at);
    },
    [beats, beatIndex, reverse, seekTo],
  );

  // Keyboard.
  useEffect(() => {
    if (view !== 'threshold') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault();
        setPlaying((v) => !v);
      } else if (e.key === 'ArrowRight') jumpBeat(1);
      else if (e.key === 'ArrowLeft') jumpBeat(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, jumpBeat]);

  if (view !== 'threshold' || !th || !req) return null;

  const beat = beats[beatIndex];
  const idx = THRESHOLDS.findIndex((x) => x.id === th.id);
  const next = THRESHOLDS[(idx + 1) % THRESHOLDS.length];
  const route = reverse ? [...th.route].reverse() : th.route;
  const canReverse = th.id === 'bedroom-tesseract';

  return (
    <section className="threshold" aria-label={`Threshold ${th.title}`}>
      <canvas ref={canvasRef} className="threshold__canvas" aria-hidden="true" />

      <header className="threshold__head">
        <div>
          <p className="micro">
            {th.code} · Threshold · {th.types.join(' + ')}
          </p>
          <h2 className="threshold__title">{canReverse && reverse ? 'Tesseract ↔ Murph’s Bedroom' : th.title}</h2>
          <ol className="threshold__route" aria-label="Route">
            {route.map((n, i) => (
              <li key={n + i}>{NODE_MAP[n].name}</li>
            ))}
          </ol>
        </div>
        <div className="threshold__actions">
          <MusicButton variant="hud" />
          <button type="button" className="btn" onClick={close}>
            ← Back to map
          </button>
        </div>
      </header>

      <div className="threshold__caption" aria-live="polite">
        <p className="threshold__beat">{beat?.title}</p>
        <p className="threshold__text">{beat?.caption}</p>
      </div>

      <footer className="threshold__foot">
        <div className="transport">
          <button type="button" className="ctl" onClick={() => jumpBeat(-1)} aria-label="Previous beat">
            ‹
          </button>
          <button
            type="button"
            className="ctl ctl--wide"
            onClick={() => {
              if (done) {
                seekTo(0);
                setPlaying(true);
              } else setPlaying((v) => !v);
            }}
            aria-label={done ? 'Replay' : playing ? 'Pause' : 'Play'}
          >
            {done ? 'Replay' : playing ? 'Pause' : 'Play'}
          </button>
          <button type="button" className="ctl" onClick={() => jumpBeat(1)} aria-label="Next beat">
            ›
          </button>
          {canReverse && (
            <button
              type="button"
              className={`ctl ctl--text ${reverse ? 'is-on' : ''}`}
              onClick={() => {
                setReverse((r) => !r);
                seekTo(1 - progress);
              }}
              aria-pressed={reverse}
              title="Play the threshold backwards: Tesseract → Bedroom"
            >
              ⇄ Reverse
            </button>
          )}
        </div>

        <div
          className="scrub"
          role="slider"
          aria-label="Threshold timeline"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          tabIndex={0}
          onPointerDown={(e) => {
            const el = e.currentTarget;
            const rect = el.getBoundingClientRect();
            const set = (x: number) => seekTo((x - rect.left) / rect.width);
            set(e.clientX);
            el.setPointerCapture(e.pointerId);
            const move = (ev: PointerEvent) => set(ev.clientX);
            const up = () => {
              el.removeEventListener('pointermove', move);
              el.removeEventListener('pointerup', up);
            };
            el.addEventListener('pointermove', move);
            el.addEventListener('pointerup', up);
          }}
        >
          <div className="scrub__track" />
          <div className="scrub__fill" style={{ width: `${progress * 100}%` }} />
          {beats.map((b, i) => {
            const pos = reverse ? 1 - b.at : b.at;
            return (
              <button
                key={b.title}
                type="button"
                className={`scrub__beat ${i === beatIndex ? 'is-on' : ''}`}
                style={{ left: `${pos * 100}%` }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => seekTo(pos + (reverse ? -0.001 : 0.001))}
                title={b.title}
                aria-label={`Jump to: ${b.title}`}
              />
            );
          })}
        </div>

        <div className="threshold__meta">
          <ul className="chips">
            {th.techniques.map((tq) => (
              <li key={tq} className="tchip tchip--ghost">
                {tq}
              </li>
            ))}
          </ul>
          {done && !req.fromCinema && (
            <button type="button" className="btn btn--primary" onClick={() => actions.openThreshold(next.id)}>
              Next threshold · {next.code} →
            </button>
          )}
        </div>
      </footer>
    </section>
  );
}
