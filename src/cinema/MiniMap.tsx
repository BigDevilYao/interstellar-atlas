import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NODES, NODE_MAP } from '../data/nodes';
import type { NodeId } from '../data/types';
import { FlatMap, flatPoint } from '../modes/FlatMap';
import { CHAPTERS, chapterIndexForNode } from './chapters';
import './minimap.css';

/**
 * The cinema HUD's orbital minimap (bottom right), made navigable.
 *
 * Compact by default: the same <FlatMap size={150}> diagram and caption as before, untouched.
 * On hover (or focus, or a tap on touch screens) it scales up from its bottom-right corner, reveals
 * the scene names beside their nodes, and each node (or its name) opens that scene through the
 * cinema's existing navigation. When the pointer leaves, it settles back.
 *
 * Every navigable marker here is a real World Map node (data/nodes.ts) whose destination is the
 * chapter of the same node (chapters.ts → chapterIndexForNode). The Studio branch is not part of
 * this diagram, so it is not added.
 */

const BASE = 150; // the minimap's existing size (CinemaStage)
const MAX_SCALE = 1.45;
const MIN_SCALE = 1.12;
const LABEL_PX = 9.5; // on-screen label size, whatever the scale
const LABEL_PX_TOUCH = 10.5; // phones and tablets: a little larger
const CLOSE_DELAY = 240;
const NAV_LOCK_MS = 1400;

/** The scene name shown beside each node: the title of the chapter that node opens (shortened). */
function sceneName(id: NodeId): string {
  const title = CHAPTERS[chapterIndexForNode(id)]?.title ?? NODE_MAP[id].name;
  if (id === 'nasa') return 'NASA Facility';
  return title.replace(/^The /, '');
}

/** Shorter names, used only when the full names cannot be placed cleanly (small windows). */
function shortName(id: NodeId): string {
  const short: Partial<Record<NodeId, string>> = { farm: 'Farm', nasa: 'NASA', station: 'Station' };
  return short[id] ?? sceneName(id).replace(/'s Planet$|' Planet$/, '');
}

interface Target {
  id: NodeId;
  x: number;
  y: number;
  /** Visible radius of the marker (base units). */
  r: number;
  /** Invisible hit radius (base units), never reaching a neighbour's. */
  hit: number;
  name: string;
}

interface Placed {
  id: NodeId;
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  align: 'start' | 'end' | 'middle';
  /** Optional hairline from the node to the label (base units). */
  leader?: [number, number, number, number];
}

function targets(): Target[] {
  const list = NODES.map((n) => {
    const [x, y] = flatPoint(n.id, BASE);
    // Gargantua is drawn as the gold core circle at the centre of the diagram (FlatMap).
    const core = n.marker === 'core';
    return { id: n.id, x, y: core ? BASE / 2 + 0.04 * BASE * 0.42 : y, r: core ? BASE * 0.055 : 3.2, hit: 0, name: sceneName(n.id) };
  });
  for (const t of list) {
    let nearest = Infinity;
    for (const o of list) if (o !== t) nearest = Math.min(nearest, Math.hypot(o.x - t.x, o.y - t.y) - (o.id === 'gargantua' ? o.r : 0));
    t.hit = Math.max(t.r + 2, Math.min(t.id === 'gargantua' ? 11 : 9.5, nearest * 0.48));
  }
  return list;
}

let measureCtx: CanvasRenderingContext2D | null = null;
let labelPx = LABEL_PX;
function textWidth(s: string): number {
  measureCtx ??= document.createElement('canvas').getContext('2d');
  if (!measureCtx) return s.length * labelPx * 0.72;
  measureCtx.font = `500 ${labelPx}px "IBM Plex Mono", ui-monospace, monospace`;
  // + letter-spacing 0.12em per character (matches minimap.css)
  return measureCtx.measureText(s.toUpperCase()).width + s.length * labelPx * 0.12;
}

/**
 * Compact scale of the diagram: 1 on desktop (the original minimap); phones set a smaller one in
 * styles/mobile.css (--mm-c), so the compact map stays unobtrusive on a small screen.
 */
function compactScale(fig: HTMLElement | null): number {
  if (!fig) return 1;
  const v = parseFloat(getComputedStyle(fig).getPropertyValue('--mm-c'));
  return v > 0 && v <= 1 ? v : 1;
}

/**
 * Greedy label placement with a small cost model: each label tries positions around its node
 * (right, left, above, below, diagonals), then a radial position just outside the disc with a
 * hairline leader; the cheapest position that overlaps no node, no placed label and stays inside the
 * allowed area wins. Base units (the 150-unit diagram); labels are sized for the current scale.
 */
function layout(
  ts: Target[],
  s: number,
  bounds: { l: number; t: number; r: number; b: number },
  linePts: [number, number][],
  nameOf: (id: NodeId) => string,
  obstacles: { x: number; y: number; w: number; h: number }[] = [],
): { placed: Placed[]; cost: number } {
  const c = BASE / 2;
  const R = BASE * 0.42;
  const h = (labelPx + 4) / s;
  const gap = 4 / s;
  const sep = 5 / s; // breathing room between neighbouring labels
  const area = (a: Placed, b: { x: number; y: number; w: number; h: number }) =>
    Math.max(0, Math.min(a.x + a.w + sep, b.x + b.w + sep) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  // Labels sitting on the diagram's lines read badly: count line samples under each candidate.
  const onLines = (p: Placed) => linePts.reduce((n, [x, y]) => n + (x > p.x && x < p.x + p.w && y > p.y && y < p.y + p.h ? 1 : 0), 0);
  const circleHit = (p: Placed, t: Target, margin: number) => {
    const cx = Math.max(p.x, Math.min(t.x, p.x + p.w));
    const cy = Math.max(p.y, Math.min(t.y, p.y + p.h));
    return Math.hypot(cx - t.x, cy - t.y) < t.r + margin;
  };
  const greedy = (order: Target[]): [Placed[], number] => {
  const placed: Placed[] = [];
  let total = 0;
  for (const t of order) {
    const text = nameOf(t.id);
    const w = textWidth(text) / s;
    const off = t.r + gap;
    const cands: [Placed, number][] = [
      [{ id: t.id, text, x: t.x + off, y: t.y - h / 2, w, h, align: 'start' }, 0],
      [{ id: t.id, text, x: t.x - off - w, y: t.y - h / 2, w, h, align: 'end' }, 0.2],
      [{ id: t.id, text, x: t.x - w / 2, y: t.y - off - h, w, h, align: 'middle' }, 0.8],
      [{ id: t.id, text, x: t.x - w / 2, y: t.y + off, w, h, align: 'middle' }, 0.9],
      [{ id: t.id, text, x: t.x + off * 0.7, y: t.y - off * 0.7 - h, w, h, align: 'start' }, 1.2],
      [{ id: t.id, text, x: t.x - off * 0.7 - w, y: t.y - off * 0.7 - h, w, h, align: 'end' }, 1.3],
      [{ id: t.id, text, x: t.x + off * 0.7, y: t.y + off * 0.7, w, h, align: 'start' }, 1.4],
      [{ id: t.id, text, x: t.x - off * 0.7 - w, y: t.y + off * 0.7, w, h, align: 'end' }, 1.5],
    ];
    // Radial, just outside the disc, with a hairline leader (several distances).
    const dx = t.x - c;
    const dy = t.y - c;
    const len = Math.hypot(dx, dy) || 1;
    // Gargantua is the centre of the diagram: its name sits directly above or below the core.
    if (t.id === 'gargantua') cands.splice(1);
    if (t.id === 'gargantua') cands[0] = [{ id: t.id, text, x: t.x - w / 2, y: t.y - off - h * 0.8 - 2 / s, w, h, align: 'middle' }, 0];
    if (t.id === 'gargantua') cands.push([{ id: t.id, text, x: t.x - w / 2, y: t.y + off + 1 / s, w, h, align: 'middle' }, 0.5]);
    else for (const extra of [10, 20, 30]) {
      const px = c + (dx / len) * (R + extra / s);
      const py = c + (dy / len) * (R + extra / s);
      const left = px < c;
      const lx = left ? px - gap / 2 - w : px + gap / 2;
      cands.push([{ id: t.id, text, x: lx, y: py - h / 2, w, h, align: left ? 'end' : 'start', leader: [t.x, t.y, px, py] }, 2.5 + extra / 20]);
    }
    let best: Placed | null = null;
    let bestCost = Infinity;
    for (const [p, pref] of cands) {
      let cost = pref;
      if (p.x < bounds.l || p.y < bounds.t || p.x + p.w > bounds.r || p.y + p.h > bounds.b) cost += 1000;
      for (const o of placed) cost += area(p, o) * 50;
      // Never on another node, and not close enough to one to be read as its label.
      for (const o of ts) if (o.id !== t.id && circleHit(p, o, 12 / s)) cost += circleHit(p, o, 2 / s) ? 400 : 40;
      if (t.id !== 'gargantua') cost += onLines(p) * 0.35;
      // Keep clear of the other HUD elements (subtitle, transport, telemetry).
      for (const o of obstacles) if (area(p, o) > 0) cost += 400;
      // Inside the core (Gargantua's ring) is reserved for the core's own label.
      if (t.id !== 'gargantua' && Math.hypot(p.x + p.w / 2 - c, p.y + p.h / 2 - c) < 14) cost += 6;
      if (cost < bestCost) {
        bestCost = cost;
        best = p;
      }
    }
    if (best) placed.push(best);
    total += bestCost;
  }
  return [placed, total];
  };
  // Crowded nodes first, then a handful of deterministic shuffles; keep the cheapest arrangement.
  const density = (t: Target) => ts.filter((o) => o !== t && Math.hypot(o.x - t.x, o.y - t.y) < 32).length;
  const orders: Target[][] = [[...ts].sort((a, b) => density(b) - density(a))];
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  for (let k = 0; k < 60; k++) orders.push([...ts].map((t) => [rnd(), t] as const).sort((a, b) => a[0] - b[0]).map((x) => x[1]));
  let bestPlaced: Placed[] = [];
  let bestTotal = Infinity;
  for (const o of orders) {
    const [p, cost] = greedy(o);
    if (cost < bestTotal) {
      bestTotal = cost;
      bestPlaced = p;
    }
  }
  // Last guard: whatever happened above, no label leaves the allowed area (the viewport).
  for (const p of bestPlaced) {
    p.x = Math.min(Math.max(p.x, bounds.l), bounds.r - p.w);
    p.y = Math.min(Math.max(p.y, bounds.t), bounds.b - p.h);
  }
  return { placed: bestPlaced, cost: bestTotal };
}

/** The diagram's compact box on screen (from the unscaled figure, so it is right even mid-transition). */
function stageBox(fig: HTMLElement) {
  const r = fig.getBoundingClientRect();
  return { left: r.left, top: r.top, right: r.left + BASE, bottom: r.top + BASE };
}

export function MiniMap({
  highlight,
  caption,
  onNavigate,
}: {
  highlight: NodeId;
  caption?: string;
  /** Open the scene for this node through the cinema's existing navigation. */
  onNavigate(id: NodeId): void;
}) {
  const ts = useMemo(targets, []);
  const figRef = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState(MAX_SCALE);
  const [hot, setHot] = useState<NodeId | null>(null);
  const [placed, setPlaced] = useState<Placed[]>([]);
  const [compact, setCompact] = useState(1);
  const [touchOpen, setTouchOpen] = useState(false);
  const closeTimer = useRef(0);
  const openedAt = useRef(0);
  const lastPointer = useRef<string>('mouse');
  const navLock = useRef(0);

  // Scale for the space actually available: up and to the left of the corner, below the telemetry.
  const fit = useCallback(() => {
    const fig = figRef.current;
    if (!fig) return MAX_SCALE;
    const svg = stageBox(fig);
    const cine = fig.closest('.cine');
    const tr = cine?.querySelector('.hud--tr')?.getBoundingClientRect();
    const c = compactScale(fig);
    if (c < 1) {
      // Phones: stay below the title block as well, and fit the screen's width.
      const tl = cine?.querySelector('.hud--tl')?.getBoundingClientRect();
      // The title only limits the map when it reaches across above it (portrait).
      const tlOver = tl && tl.height > 0 && tl.right > svg.right - BASE * 1.3 - 60;
      const top = Math.max(tr && tr.height > 0 ? tr.bottom : 0, tlOver ? tl!.bottom : 0) + 12;
      const byH = (svg.bottom - top - 8) / BASE;
      const byW = (svg.right - 12) / (BASE + 60);
      return Math.max(c * 1.3, Math.min(1.3, byH, byW));
    }
    const topLimit = (tr && tr.height > 0 ? tr.bottom : 0) + 18;
    const byHeight = (svg.bottom - topLimit - 16) / BASE;
    const byWidth = (svg.right - 24) / (BASE + 120);
    const cap = window.innerWidth < 1100 || window.innerHeight < 700 ? 1.3 : MAX_SCALE;
    return Math.max(MIN_SCALE, Math.min(cap, byHeight, byWidth));
  }, []);

  const doOpen = useCallback(() => {
    window.clearTimeout(closeTimer.current);
    if (open) return;
    labelPx = compactScale(figRef.current) < 1 ? LABEL_PX_TOUCH : LABEL_PX;
    const s = fit();
    const svg = figRef.current ? stageBox(figRef.current) : null;
    // Labels may use the room to the left of the disc (inside the viewport) and a little above it.
    const leftRoom = svg ? Math.min(150, svg.right - BASE * s - 16) : 120;
    const rightRoom = svg ? Math.max(0, Math.min(40, window.innerWidth - svg.right - 10)) : 0;
    // Sample the diagram's own lines (in diagram units) so labels avoid sitting on them.
    const linePts: [number, number][] = [];
    figRef.current?.querySelectorAll<SVGPathElement>('svg.flatmap path').forEach((path) => {
      const L = path.getTotalLength();
      for (let d = 0; d <= L; d += 2.5) {
        const q = path.getPointAtLength(d);
        linePts.push([q.x, q.y]);
      }
    });
    setScale(s);
    // Room above the expanded disc, inside the viewport (24 px at most).
    const upRoom = svg ? Math.max(0, Math.min(24, svg.bottom - BASE * s - 6)) : 24;
    const bounds = { l: -leftRoom / s, t: -upRoom / s, r: BASE + rightRoom / s, b: BASE + 2 / s };
    // Other HUD elements, in diagram units of the expanded map (anchored at its bottom-right corner).
    const obstacles: { x: number; y: number; w: number; h: number }[] = [];
    if (svg) {
      figRef.current?.closest('.cine')?.querySelectorAll('.subtitle, .hud--bottom .transport-bar, .hud--bottom .chapters, .hud--tr').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) return;
        obstacles.push({ x: BASE - (svg.right - r.left) / s, y: BASE - (svg.bottom - r.top) / s, w: r.width / s, h: r.height / s });
      });
    }
    // Touch: keep the corner free for the close control.
    if (lastPointer.current !== 'mouse') obstacles.push({ x: BASE - 24 / s, y: -28 / s, w: 26 / s, h: 30 / s });
    let best = layout(ts, s, bounds, linePts, sceneName, obstacles);
    // A collision left (small window): shorter names rather than smaller type.
    if (best.cost >= 300) {
      const alt = layout(ts, s, bounds, linePts, shortName, obstacles);
      if (alt.cost < best.cost) best = alt;
    }
    setPlaced(best.placed);
    openedAt.current = performance.now();
    setTouchOpen(lastPointer.current !== 'mouse');
    setOpen(true);
  }, [open, fit, ts]);

  const doClose = useCallback((delay = CLOSE_DELAY) => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      setOpen(false);
      setHot(null);
    }, delay);
  }, []);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  // Compact scale follows the layout (phone portrait / landscape / desktop).
  useEffect(() => {
    const update = () => setCompact(compactScale(figRef.current));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Close on resize (the layout is recomputed on the next open) and, for touch, on a tap elsewhere.
  useEffect(() => {
    if (!open) return;
    const onResize = () => doClose(0);
    const onDown = (e: PointerEvent) => {
      if (figRef.current && !figRef.current.contains(e.target as Node)) doClose(0);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        doClose(0);
        (document.activeElement as HTMLElement | null)?.blur?.();
      }
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('pointerdown', onDown, true);
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [open, doClose]);

  const go = useCallback(
    (id: NodeId) => {
      // On touch, the first tap only expands the map.
      if (lastPointer.current !== 'mouse' && performance.now() - openedAt.current < 450) return;
      const now = performance.now();
      if (now < navLock.current) return; // one navigation at a time
      navLock.current = now + NAV_LOCK_MS;
      doClose(0);
      if (id !== highlight) onNavigate(id);
    },
    [highlight, onNavigate, doClose],
  );

  // Bounding box of the labels: an invisible pad keeps the map open while the pointer crosses gaps.
  const pad = useMemo(() => {
    if (!placed.length) return null;
    let l = 0;
    let t = 0;
    for (const p of placed) {
      l = Math.min(l, p.x - 4);
      t = Math.min(t, p.y - 4);
    }
    return { l, t };
  }, [placed]);

  return (
    <figure
      ref={figRef}
      className={`hud hud--map mm ${open ? 'is-open' : ''}`}
      aria-label="Position on the World Map — scene navigation"
      onPointerEnter={(e) => {
        lastPointer.current = e.pointerType;
        if (e.pointerType === 'mouse') doOpen();
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === 'mouse') doClose();
      }}
      onPointerDown={(e) => {
        lastPointer.current = e.pointerType;
        if (e.pointerType !== 'mouse' && !open) doOpen();
      }}
      onFocus={doOpen}
      onBlur={(e) => {
        if (!figRef.current?.contains(e.relatedTarget as Node)) doClose();
      }}
      style={{ ['--mm-s' as string]: open ? scale : compact, ['--mm-label' as string]: `${labelPx / scale}px` }}
    >
      <div className="mm__stage">
        <FlatMap size={BASE} layers={['physical']} showLabels={false} highlight={highlight} title="Position on the World Map" />
        <div className="mm__layer" aria-hidden={!open}>
          {open && pad && (
            <span className="mm__pad" style={{ left: pad.l, top: pad.t, width: BASE - pad.l, height: BASE - pad.t }} />
          )}
          <svg className="mm__leaders" viewBox={`0 0 ${BASE} ${BASE}`} aria-hidden="true">
            {placed
              .filter((p) => p.leader)
              .map((p) => (
                <line key={p.id} x1={p.leader![0]} y1={p.leader![1]} x2={p.leader![2]} y2={p.leader![3]} className={hot === p.id ? 'is-hot' : ''} />
              ))}
            {hot && (() => {
              const t = ts.find((x) => x.id === hot)!;
              return <circle cx={t.x} cy={t.y} r={t.r + 1.6} className="mm__ring" />;
            })()}
          </svg>
          {ts.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`mm__hit ${hot === t.id ? 'is-hot' : ''} ${highlight === t.id ? 'is-here' : ''}`}
              style={{ left: t.x - t.hit, top: t.y - t.hit, width: t.hit * 2, height: t.hit * 2 }}
              data-node={t.id}
              aria-label={highlight === t.id ? `${t.name} (you are here)` : `Go to ${t.name}`}
              aria-current={highlight === t.id ? 'location' : undefined}
              tabIndex={0}
              onPointerEnter={() => setHot(t.id)}
              onPointerLeave={() => setHot((h) => (h === t.id ? null : h))}
              onFocus={() => setHot(t.id)}
              onClick={() => go(t.id)}
            />
          ))}
          {open && touchOpen && (
            <button
              type="button"
              className="mm__close"
              style={{ left: BASE - 22 / scale, top: -26 / scale, width: 26 / scale, height: 26 / scale, fontSize: 15 / scale }}
              aria-label="Close the map"
              onClick={(e) => {
                e.stopPropagation();
                doClose(0);
              }}
            >
              ×
            </button>
          )}
          {placed.map((p) => {
            return (
              <span
                key={p.id}
                className={`mm__label mm__label--${p.align} ${hot === p.id ? 'is-hot' : ''} ${highlight === p.id ? 'is-here' : ''}`}
                style={{ left: p.x, top: p.y, width: p.w, height: p.h }}
                data-label={p.id}
                onPointerEnter={() => setHot(p.id)}
                onPointerLeave={() => setHot((h) => (h === p.id ? null : h))}
                onClick={() => go(p.id)}
              >
                {p.text}
              </span>
            );
          })}
        </div>
      </div>
      <figcaption className="micro">{caption}</figcaption>
    </figure>
  );
}
