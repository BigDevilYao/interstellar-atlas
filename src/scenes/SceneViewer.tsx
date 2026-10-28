import { useEffect, useRef, useState } from 'react';
import { NODE_MAP } from '../data/nodes';
import { THRESHOLD_MAP } from '../data/thresholds';
import { Icon } from '../icons/Icons';
import { INK, Wire, glowDot, micro, type V3 } from '../lib/wire3d';
import { actions, getState, useAtlas } from '../state/store';
import { SCENES } from './scenes';

/**
 * SCENE VIEWER
 * An orbitable architectural wireframe environment for the selected location.
 * Controlled orbit (yaw/pitch limits), zoom, annotations and an optional alternate state.
 */
export function SceneViewer() {
  const id = useAtlas((s) => s.sceneNode);
  const view = useAtlas((s) => s.view);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [notes, setNotes] = useState(true);
  const [alt, setAlt] = useState(false);
  const cam = useRef({ yaw: 0, pitch: 0, dist: 10 });
  const flags = useRef({ notes: true, alt: false });

  const scene = id ? SCENES[id] : null;

  useEffect(() => {
    flags.current = { notes, alt };
  }, [notes, alt]);

  useEffect(() => {
    if (!scene) return;
    cam.current = { yaw: scene.yaw, pitch: scene.pitch, dist: scene.dist };
    setAlt(false);
  }, [scene]);

  useEffect(() => {
    if (!scene || view !== 'scene') return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let raf = 0;
    let t = 0;
    let last = performance.now();
    // Opening camera move: arrive from a wider shot.
    let intro = getState().reducedMotion ? 1 : 0;

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Pointer orbit.
    let dragging = false;
    let px = 0;
    let py = 0;
    const down = (e: PointerEvent) => {
      dragging = true;
      px = e.clientX;
      py = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      cam.current.yaw -= (e.clientX - px) * 0.005;
      cam.current.pitch = Math.max(-0.2, Math.min(1.2, cam.current.pitch + (e.clientY - py) * 0.004));
      px = e.clientX;
      py = e.clientY;
    };
    const up = () => (dragging = false);
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      cam.current.dist = Math.max(scene.minDist, Math.min(scene.maxDist, cam.current.dist * (1 + Math.sign(e.deltaY) * 0.08)));
    };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('wheel', wheel, { passive: false });

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const reduced = getState().reducedMotion;
      t += reduced ? dt * 0.2 : dt;
      intro = Math.min(1, intro + dt / 2.4);
      const ease = 1 - Math.pow(1 - intro, 3);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);

      const c = cam.current;
      const dist = c.dist * (1 + (1 - ease) * 0.8);
      const yaw = c.yaw + (1 - ease) * 0.6;
      const tg = scene.target;
      const pos: V3 = [
        tg[0] + Math.sin(yaw) * Math.cos(c.pitch) * dist,
        tg[1] + Math.sin(c.pitch) * dist,
        tg[2] + Math.cos(yaw) * Math.cos(c.pitch) * dist,
      ];
      const wire = new Wire(ctx, w, h).camera({ pos, target: tg, fov: scene.fov });
      const f = { ctx, w, h, p: 0, t, wire };
      try {
        scene.draw(f, { alt: flags.current.alt });
      } catch (err) {
        console.error('[scene] draw error', err);
      }

      if (flags.current.notes) {
        scene.notes.forEach((n, i) => {
          const s = wire.project(n.at);
          if (!s) return;
          const dx = s[0] < w / 2 ? -1 : 1;
          const lx = s[0] + dx * 46;
          const ly = s[1] - 28 - (i % 2) * 14;
          ctx.globalAlpha = 0.85 * ease;
          ctx.strokeStyle = INK.gold;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(s[0], s[1]);
          ctx.lineTo(lx, ly);
          ctx.lineTo(lx + dx * 24, ly);
          ctx.stroke();
          ctx.globalAlpha = 1;
          glowDot(ctx, s[0], s[1], 2, INK.gold, ease);
          micro(ctx, n.text.toUpperCase(), lx + dx * 30, ly, { align: dx > 0 ? 'left' : 'right', alpha: ease * 0.9, size: 10 });
        });
      }
      const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.4, w / 2, h / 2, Math.max(w, h) * 0.8);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.75)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('wheel', wheel);
    };
  }, [scene, view]);

  if (view !== 'scene' || !scene || !id) return null;
  const node = NODE_MAP[id];

  return (
    <section className="scene" aria-label={`Scene: ${node.name}`}>
      <canvas ref={canvasRef} className="scene__canvas" aria-hidden="true" />
      <header className="threshold__head">
        <div className="scene__id">
          <span className="panel__icon">
            <Icon id={node.icon} size={36} />
          </span>
          <div>
            <p className="micro">
              Scene · {node.category} · {scene.view}
            </p>
            <h2 className="threshold__title">{node.name}</h2>
          </div>
        </div>
        <button type="button" className="btn" onClick={() => actions.backToMap()}>
          ← Back to map
        </button>
      </header>
      <aside className="scene__side">
        <p className="panel__lede">{node.tagline}</p>
        <p className="panel__text">{node.analysis}</p>
        <dl className="meta">
          <div>
            <dt>Space</dt>
            <dd>{node.spaceType}</dd>
          </div>
          <div>
            <dt>Scale</dt>
            <dd>{node.scale}</dd>
          </div>
          {node.timeNote && (
            <div>
              <dt>Time</dt>
              <dd>{node.timeNote}</dd>
            </div>
          )}
        </dl>
        {node.thresholds.length > 0 && (
          <ul className="th-list">
            {node.thresholds.map((tid) => {
              const th = THRESHOLD_MAP[tid];
              const reverse = tid === 'bedroom-tesseract' && id === 'tesseract';
              return (
                <li key={tid}>
                  <button type="button" className="th-row" onClick={() => actions.openThreshold(tid, reverse)}>
                    <span className="th-row__code">{th.code}</span>
                    <span className="th-row__title">{th.title}</span>
                    <span className="th-row__play" aria-hidden="true">▸</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <p className="micro scene__disclaimer">Original stylised geometry — not production assets.</p>
      </aside>
      <footer className="scene__foot">
        <button type="button" className={`ctl ctl--text ${notes ? 'is-on' : ''}`} onClick={() => setNotes((v) => !v)} aria-pressed={notes}>
          Annotations
        </button>
        {scene.altLabel && (
          <button type="button" className={`ctl ctl--text ${alt ? 'is-on' : ''}`} onClick={() => setAlt((v) => !v)} aria-pressed={alt}>
            {scene.altLabel}
          </button>
        )}
        <button
          type="button"
          className="ctl ctl--text"
          onClick={() => {
            cam.current = { yaw: scene.yaw, pitch: scene.pitch, dist: scene.dist };
          }}
        >
          Reset view
        </button>
        <span className="micro hint--inline">Drag to orbit · Scroll to zoom</span>
      </footer>
    </section>
  );
}
