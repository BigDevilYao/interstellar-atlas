/**
 * wire3d — a tiny perspective line renderer for Canvas 2D.
 * Used by the threshold sequences and scene environments to draw architectural
 * white-line geometry with hairline precision (and zero WebGL context churn).
 */

export type V3 = [number, number, number];

export interface Camera3 {
  pos: V3;
  target: V3;
  fov: number; // vertical, degrees
  roll?: number; // radians
  up?: V3;
}

export const v3 = {
  add: (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: (a: V3) => Math.hypot(a[0], a[1], a[2]),
  norm: (a: V3): V3 => {
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  },
  lerp: (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
  rotY: (a: V3, t: number): V3 => [a[0] * Math.cos(t) + a[2] * Math.sin(t), a[1], -a[0] * Math.sin(t) + a[2] * Math.cos(t)],
  rotX: (a: V3, t: number): V3 => [a[0], a[1] * Math.cos(t) - a[2] * Math.sin(t), a[1] * Math.sin(t) + a[2] * Math.cos(t)],
  rotZ: (a: V3, t: number): V3 => [a[0] * Math.cos(t) - a[1] * Math.sin(t), a[0] * Math.sin(t) + a[1] * Math.cos(t), a[2]],
};

const NEAR = 0.05;

export class Wire {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  private o: V3 = [0, 0, 0];
  private r: V3 = [1, 0, 0];
  private u: V3 = [0, 1, 0];
  private f: V3 = [0, 0, -1];
  private focal = 1;

  constructor(ctx: CanvasRenderingContext2D, w: number, h: number) {
    this.ctx = ctx;
    this.w = w;
    this.h = h;
  }

  camera(c: Camera3): this {
    const f = v3.norm(v3.sub(c.target, c.pos));
    let r = v3.norm(v3.cross(f, c.up ?? [0, 1, 0]));
    let u = v3.cross(r, f);
    if (c.roll) {
      const cr = Math.cos(c.roll);
      const sr = Math.sin(c.roll);
      const r2 = v3.add(v3.mul(r, cr), v3.mul(u, sr));
      const u2 = v3.add(v3.mul(u, cr), v3.mul(r, -sr));
      r = r2;
      u = u2;
    }
    this.o = c.pos;
    this.f = f;
    this.r = r;
    this.u = u;
    this.focal = this.h / 2 / Math.tan(((c.fov * Math.PI) / 180) / 2);
    return this;
  }

  /** Camera-space coordinates (x right, y up, z forward). */
  toCam(p: V3): V3 {
    const d = v3.sub(p, this.o);
    return [v3.dot(d, this.r), v3.dot(d, this.u), v3.dot(d, this.f)];
  }

  private screen(c: V3): [number, number] {
    return [this.w / 2 + (c[0] / c[2]) * this.focal, this.h / 2 - (c[1] / c[2]) * this.focal];
  }

  /** Project to screen; null if behind the camera. Third value is depth. */
  project(p: V3): [number, number, number] | null {
    const c = this.toCam(p);
    if (c[2] < NEAR) return null;
    const s = this.screen(c);
    return [s[0], s[1], c[2]];
  }

  /** Apparent scale (px per world unit) at a point. */
  scaleAt(p: V3): number {
    const c = this.toCam(p);
    return c[2] > NEAR ? this.focal / c[2] : 0;
  }

  /** Add a near-plane-clipped segment to the current path. */
  line(a: V3, b: V3): void {
    let ca = this.toCam(a);
    let cb = this.toCam(b);
    if (ca[2] < NEAR && cb[2] < NEAR) return;
    if (ca[2] < NEAR || cb[2] < NEAR) {
      const t = (NEAR - ca[2]) / (cb[2] - ca[2]);
      const m: V3 = [ca[0] + (cb[0] - ca[0]) * t, ca[1] + (cb[1] - ca[1]) * t, NEAR];
      if (ca[2] < NEAR) ca = m;
      else cb = m;
    }
    const sa = this.screen(ca);
    const sb = this.screen(cb);
    this.ctx.moveTo(sa[0], sa[1]);
    this.ctx.lineTo(sb[0], sb[1]);
  }

  poly(pts: V3[], closed = false): void {
    for (let i = 0; i < pts.length - 1; i++) this.line(pts[i], pts[i + 1]);
    if (closed && pts.length > 2) this.line(pts[pts.length - 1], pts[0]);
  }

  box(min: V3, max: V3): void {
    const [x0, y0, z0] = min;
    const [x1, y1, z1] = max;
    const c: V3[] = [
      [x0, y0, z0],
      [x1, y0, z0],
      [x1, y1, z0],
      [x0, y1, z0],
      [x0, y0, z1],
      [x1, y0, z1],
      [x1, y1, z1],
      [x0, y1, z1],
    ];
    const e = [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7],
    ];
    for (const [i, j] of e) this.line(c[i], c[j]);
  }

  /** Parallelogram from an origin and two edge vectors. */
  quad(o: V3, a: V3, b: V3): void {
    const p1 = v3.add(o, a);
    const p2 = v3.add(p1, b);
    const p3 = v3.add(o, b);
    this.poly([o, p1, p2, p3], true);
  }

  circle(c: V3, u: V3, v: V3, r: number, seg = 64, from = 0, to = Math.PI * 2): void {
    let prev: V3 | null = null;
    for (let i = 0; i <= seg; i++) {
      const t = from + ((to - from) * i) / seg;
      const p = v3.add(c, v3.add(v3.mul(u, Math.cos(t) * r), v3.mul(v, Math.sin(t) * r)));
      if (prev) this.line(prev, p);
      prev = p;
    }
  }

  /** Begin a path and stroke with style. */
  stroke(color: string, alpha = 1, width = 1, dash?: number[]): void {
    const ctx = this.ctx;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.setLineDash(dash ?? []);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  begin(): this {
    this.ctx.beginPath();
    return this;
  }
}

// ───────────────────────── palette & helpers ─────────────────────────

export const INK = {
  white: '#ece8e0',
  dim: '#8d8a85',
  gold: '#f0c98f',
  goldDeep: '#d9a35c',
  blue: '#a9c3e6',
  black: '#000000',
};

export function glowDot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color = INK.gold, alpha = 1): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
  g.addColorStop(0, color);
  g.addColorStop(0.25, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = alpha * 0.55;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r * 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function micro(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  opts: { color?: string; alpha?: number; size?: number; align?: CanvasTextAlign; tracking?: number } = {},
): void {
  const size = opts.size ?? 10;
  ctx.globalAlpha = opts.alpha ?? 0.8;
  ctx.fillStyle = opts.color ?? INK.white;
  ctx.font = `400 ${size}px "IBM Plex Mono", ui-monospace, Consolas, monospace`;
  ctx.textAlign = opts.align ?? 'left';
  ctx.textBaseline = 'middle';
  const tracking = opts.tracking ?? 0.12;
  if ('letterSpacing' in ctx) {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${tracking * size}px`;
  }
  ctx.fillText(text, x, y);
  if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px';
  ctx.globalAlpha = 1;
}

export function title(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, alpha = 1, align: CanvasTextAlign = 'center'): void {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = INK.white;
  ctx.font = `300 ${size}px Inter, "Helvetica Neue", Arial, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${size * 0.42}px`;
  ctx.fillText(text, x, y);
  if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px';
  ctx.globalAlpha = 1;
}

/** Safe text zones that never collide with the player's header (top-left) or caption band (bottom). */
export const ZONE = {
  label: (h: number) => Math.max(178, h * 0.215),
  title: (h: number) => Math.max(226, h * 0.275),
  low: (h: number) => h - 236,
};
