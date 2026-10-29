import { INK, v3, type V3, type Wire } from '../../lib/wire3d';

/** The Endurance: a ring of 12 modules around a hub, drawn in wire. */
export function drawEndurance(
  wire: Wire,
  center: V3,
  radius: number,
  spin: number,
  opts: { tilt?: number; alpha?: number; color?: string; broken?: number[]; yaw?: number } = {},
): void {
  const tilt = opts.tilt ?? 0;
  const yaw = opts.yaw ?? 0;
  const a = opts.alpha ?? 1;
  const color = opts.color ?? INK.white;
  const T = (p: V3): V3 => v3.add(center, v3.rotY(v3.rotX(p, tilt), yaw));
  const n = 12;
  wire.begin();
  // Ring torus guide.
  for (const rr of [radius * 0.96, radius * 1.04]) {
    let prev: V3 | null = null;
    for (let i = 0; i <= 72; i++) {
      const t = (i / 72) * Math.PI * 2;
      const pnt = T([Math.cos(t) * rr, Math.sin(t) * rr, 0]);
      if (prev) wire.line(prev, pnt);
      prev = pnt;
    }
  }
  wire.stroke(color, a * 0.35, 0.7);
  wire.begin();
  for (let i = 0; i < n; i++) {
    if (opts.broken?.includes(i)) continue;
    const t = (i / n) * Math.PI * 2 + spin;
    const c: V3 = [Math.cos(t) * radius, Math.sin(t) * radius, 0];
    const tg: V3 = [-Math.sin(t), Math.cos(t), 0];
    const nr: V3 = [Math.cos(t), Math.sin(t), 0];
    const L = radius * 0.2;
    const W = radius * 0.11;
    const D = radius * 0.12;
    const corners: V3[] = [];
    for (const sx of [-1, 1])
      for (const sy of [-1, 1])
        for (const sz of [-1, 1]) {
          corners.push(T(v3.add(c, v3.add(v3.add(v3.mul(tg, (sx * L) / 2), v3.mul(nr, (sy * W) / 2)), [0, 0, (sz * D) / 2]))));
        }
    const e = [
      [0, 1], [2, 3], [4, 5], [6, 7],
      [0, 2], [1, 3], [4, 6], [5, 7],
      [0, 4], [1, 5], [2, 6], [3, 7],
    ];
    e.forEach(([i0, i1]) => wire.line(corners[i0], corners[i1]));
  }
  // Hub and spokes.
  for (let i = 0; i < 4; i++) {
    const t = (i / 4) * Math.PI * 2 + spin + Math.PI / 12;
    wire.line(T([Math.cos(t) * radius * 0.12, Math.sin(t) * radius * 0.12, 0]), T([Math.cos(t) * radius * 0.92, Math.sin(t) * radius * 0.92, 0]));
  }
  let prev: V3 | null = null;
  for (let i = 0; i <= 24; i++) {
    const t = (i / 24) * Math.PI * 2;
    const pnt = T([Math.cos(t) * radius * 0.12, Math.sin(t) * radius * 0.12, 0]);
    if (prev) wire.line(prev, pnt);
    prev = pnt;
  }
  wire.stroke(color, a, 0.9);
}

/** The Ranger as a simple wire wedge pointing along +x. */
export function drawRanger(wire: Wire, c: V3, s: number, yaw: number, opts: { alpha?: number; color?: string; roll?: number } = {}): void {
  const roll = opts.roll ?? 0;
  const T = (p: V3): V3 => v3.add(c, v3.rotY(v3.rotX(v3.mul(p, s), roll), yaw));
  const nose: V3 = [1.6, 0, 0];
  const lw: V3 = [-1, 0, -1.1];
  const rw: V3 = [-1, 0, 1.1];
  const top: V3 = [-0.6, 0.35, 0];
  const tail: V3 = [-1.1, 0.05, 0];
  wire.begin();
  wire.poly([T(nose), T(lw), T(tail), T(rw)], true);
  wire.line(T(nose), T(top));
  wire.line(T(lw), T(top));
  wire.line(T(rw), T(top));
  wire.line(T(tail), T(top));
  wire.stroke(opts.color ?? INK.white, opts.alpha ?? 1, 1);
}

/** Simple wire sphere (meridians + parallels). */
export function drawSphere(wire: Wire, c: V3, r: number, color: string, alpha: number, rot = 0, mer = 10, par = 7): void {
  wire.begin();
  for (let i = 0; i < mer; i++) {
    const t = (i / mer) * Math.PI + rot;
    wire.circle(c, [Math.cos(t), 0, Math.sin(t)], [0, 1, 0], r, 48);
  }
  for (let j = 1; j < par; j++) {
    const phi = -Math.PI / 2 + (j / par) * Math.PI;
    wire.circle(v3.add(c, [0, Math.sin(phi) * r, 0]), [1, 0, 0], [0, 0, 1], Math.cos(phi) * r, 48);
  }
  wire.stroke(color, alpha, 0.8);
}

/** Starfield in screen space; `speed` > 0 streaks the stars radially (passage). */
export function drawStars(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  alpha: number,
  opts: { seed?: number; streak?: number; rotate?: number; count?: number } = {},
): void {
  const count = opts.count ?? 260;
  let s = opts.seed ?? 1;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const cx = w / 2;
  const cy = h / 2;
  const rot = opts.rotate ?? 0;
  const streak = opts.streak ?? 0;
  ctx.save();
  ctx.strokeStyle = INK.white;
  ctx.fillStyle = INK.white;
  for (let i = 0; i < count; i++) {
    let x = rnd() * w * 1.4 - w * 0.2;
    let y = rnd() * h * 1.4 - h * 0.2;
    const b = 0.25 + rnd() * 0.75;
    const sz = rnd() < 0.05 ? 1.6 : 1;
    if (rot) {
      const dx = x - cx;
      const dy = y - cy;
      x = cx + dx * Math.cos(rot) - dy * Math.sin(rot);
      y = cy + dx * Math.sin(rot) + dy * Math.cos(rot);
    }
    ctx.globalAlpha = alpha * b;
    if (streak > 0) {
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.hypot(dx, dy) + 1;
      const L = streak * (d / Math.max(w, h)) * 220;
      ctx.lineWidth = sz * 0.8;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (dx / d) * L, y + (dy / d) * L);
      ctx.stroke();
    } else {
      ctx.fillRect(x, y, sz, sz);
    }
  }
  ctx.restore();
  void t;
}

/** A 2D Gargantua glyph: shadow, disk band and lensed arc. */
export function drawBlackHole2D(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, alpha: number, t: number): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  const glow = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 3.2);
  glow.addColorStop(0, 'rgba(240,190,120,0.28)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
  // Back half of the disk lensed over the top.
  ctx.strokeStyle = '#f3d3a0';
  for (let i = 0; i < 6; i++) {
    ctx.globalAlpha = alpha * (0.5 - i * 0.07);
    ctx.lineWidth = 2.2 - i * 0.3;
    ctx.beginPath();
    ctx.ellipse(x, y, r * (1.25 + i * 0.09), r * (1.18 + i * 0.08), 0, Math.PI, Math.PI * 2);
    ctx.stroke();
  }
  // Shadow.
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fbe6c4';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.03, 0, Math.PI * 2);
  ctx.stroke();
  // Front disk band with moving streaks.
  for (let i = 0; i < 9; i++) {
    const k = i / 8;
    ctx.globalAlpha = alpha * (0.75 - k * 0.6);
    ctx.lineWidth = 1.6 - k;
    ctx.strokeStyle = i < 3 ? '#fff1d8' : '#e7b46e';
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.08, r * (1.5 + k * 2.4), r * (0.18 + k * 0.2), -0.04, 0, Math.PI * 2);
    ctx.setLineDash([r * (0.6 + k), r * (0.25 + k * 0.3)]);
    ctx.lineDashOffset = -t * r * (2.5 - k * 1.5);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();
}
