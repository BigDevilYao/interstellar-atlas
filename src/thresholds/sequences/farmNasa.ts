import { easeInOut, easeOut, lerp, mulberry, seg, smooth, win } from '../../lib/ease';
import { INK, glowDot, micro, title, ZONE } from '../../lib/wire3d';
import type { SeqFrame } from '../types';

/**
 * TH·A  Cooper's Farm → NASA Facility
 * Dust → binary → coordinates → route → fence → section through the hidden facility.
 */

const BITS = [1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0];

const PARTICLES = (() => {
  const r = mulberry(3);
  return Array.from({ length: 900 }, (_, i) => ({
    band: i % BITS.length,
    jx: r() - 0.5,
    ty: r(),
    sx: (r() - 0.5) * 0.25,
    sy: r() * 0.15,
    ph: r() * Math.PI * 2,
    delay: r() * 0.35,
  }));
})();

/** Route across the farm in map units (farmhouse at origin). */
const ROUTE: [number, number][] = [
  [0, 0],
  [0, 3],
  [6, 3],
  [9, 5],
  [16, 5],
  [19, 9],
  [26, 9.5],
  [30, 9.5],
];

function routeAt(t: number): [number, number] {
  const lens: number[] = [];
  let total = 0;
  for (let i = 0; i < ROUTE.length - 1; i++) {
    const l = Math.hypot(ROUTE[i + 1][0] - ROUTE[i][0], ROUTE[i + 1][1] - ROUTE[i][1]);
    lens.push(l);
    total += l;
  }
  let d = t * total;
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i]) {
      const k = d / lens[i];
      return [lerp(ROUTE[i][0], ROUTE[i + 1][0], k), lerp(ROUTE[i][1], ROUTE[i + 1][1], k)];
    }
    d -= lens[i];
  }
  return ROUTE[ROUTE.length - 1];
}

function drawFloor(f: SeqFrame, alpha: number, zoom: number) {
  const { ctx, w, h, p, t } = f;
  const S = Math.min(w, h) * 0.46 * zoom;
  const cx = w / 2;
  const cy = h * 0.46;
  const x0 = cx - S / 2;
  const y0 = cy - S / 2;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = INK.white;
  ctx.lineWidth = 1;
  // Room outline in plan, window gap on the top wall.
  ctx.beginPath();
  ctx.moveTo(x0 + S * 0.35, y0);
  ctx.lineTo(x0, y0);
  ctx.lineTo(x0, y0 + S);
  ctx.lineTo(x0 + S, y0 + S);
  ctx.lineTo(x0 + S, y0);
  ctx.lineTo(x0 + S * 0.65, y0);
  ctx.stroke();
  ctx.globalAlpha = alpha * 0.6;
  ctx.beginPath();
  ctx.moveTo(x0 + S * 0.35, y0 - 4);
  ctx.lineTo(x0 + S * 0.65, y0 - 4);
  ctx.moveTo(x0 + S * 0.35, y0 + 4);
  ctx.lineTo(x0 + S * 0.65, y0 + 4);
  ctx.stroke();
  // Bed and shelf in plan.
  ctx.globalAlpha = alpha * 0.35;
  ctx.strokeRect(x0 + 6, y0 + S * 0.42, S * 0.24, S * 0.5);
  ctx.strokeRect(x0 + S * 0.78, y0 + S * 0.05, S * 0.2, S * 0.08);
  ctx.restore();

  // Dust particles.
  const settle = (i: number) => easeInOut(seg(p, 0.16 + PARTICLES[i].delay * 0.12, 0.36 + PARTICLES[i].delay * 0.05));
  const bandW = (S * 0.84) / BITS.length;
  ctx.fillStyle = INK.gold;
  PARTICLES.forEach((q, i) => {
    const k = settle(i);
    const storm = 1 - k;
    // Storm: particles swirl in from the window.
    const life = (t * 0.12 + q.delay) % 1;
    const sx = cx + (q.sx + Math.sin(q.ph + t * 1.3) * 0.18 * life) * S;
    const sy = y0 + (q.sy + life * 0.95) * S;
    // Settled: binary bands.
    const thick = BITS[q.band] === 1;
    const tx = x0 + S * 0.08 + (q.band + 0.5) * bandW + q.jx * (thick ? bandW * 0.55 : bandW * 0.12);
    const ty = y0 + S * 0.1 + q.ty * S * 0.82;
    const x = lerp(sx, tx, k);
    const y = lerp(sy, ty, k);
    ctx.globalAlpha = alpha * (0.35 + 0.4 * storm * Math.random() + 0.45 * k);
    ctx.fillRect(x, y, 1.5, 1.5);
  });
  ctx.globalAlpha = 1;

  // Decoding read-out.
  const dec = seg(p, 0.34, 0.46);
  if (dec > 0) {
    const n = Math.floor(BITS.length * dec);
    BITS.slice(0, n).forEach((b, i) => {
      const bx = x0 + S * 0.08 + (i + 0.5) * bandW;
      micro(ctx, String(b), bx, y0 + S + 18, { align: 'center', alpha: alpha, color: INK.gold, size: 12 });
    });
    if (dec > 0.85) {
      micro(ctx, 'BINARY  →  COORDINATES', cx, y0 + S + 42, { align: 'center', alpha: alpha * seg(dec, 0.85, 1) });
    }
  }
}

function drawPlan(f: SeqFrame, alpha: number, tk: number, fence: number) {
  const { ctx, w, h, t } = f;
  const k = Math.min(w, h) / 13; // px per unit
  const [tx, ty] = routeAt(tk);
  const ox = w / 2 - tx * k;
  const oy = h / 2 + ty * k * 0.85;
  const X = (x: number) => ox + x * k;
  const Y = (y: number) => oy - y * k * 0.85;
  ctx.save();
  ctx.globalAlpha = alpha;
  // Fields with crop rows.
  const r = mulberry(9);
  for (let i = -2; i < 9; i++) {
    for (let j = -2; j < 5; j++) {
      const fx = i * 4.2 + (j % 2) * 1.2;
      const fy = j * 3.4;
      const fw = 3.6;
      const fh = 2.8;
      ctx.globalAlpha = alpha * 0.32;
      ctx.strokeStyle = INK.white;
      ctx.lineWidth = 0.8;
      ctx.strokeRect(X(fx), Y(fy + fh), fw * k, fh * k * 0.85);
      ctx.globalAlpha = alpha * 0.12;
      ctx.beginPath();
      const vertical = r() > 0.5;
      for (let s = 0.3; s < (vertical ? fw : fh); s += 0.3) {
        if (vertical) {
          ctx.moveTo(X(fx + s), Y(fy));
          ctx.lineTo(X(fx + s), Y(fy + fh));
        } else {
          ctx.moveTo(X(fx), Y(fy + s));
          ctx.lineTo(X(fx + fw), Y(fy + s));
        }
      }
      ctx.stroke();
    }
  }
  // Farmhouse and silo.
  ctx.globalAlpha = alpha * 0.9;
  ctx.strokeRect(X(-0.6), Y(0.6), 1.2 * k, 1.2 * k * 0.85);
  ctx.beginPath();
  ctx.arc(X(1.4), Y(0.2), 0.35 * k, 0, Math.PI * 2);
  ctx.stroke();
  micro(ctx, 'FARMHOUSE', X(-0.6), Y(-0.6), { alpha: alpha * 0.7, size: 9 });

  // Route — drawn progressively, dashed ahead.
  ctx.beginPath();
  ctx.strokeStyle = INK.white;
  ctx.globalAlpha = alpha * 0.25;
  ctx.setLineDash([4, 6]);
  ROUTE.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))));
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.globalAlpha = alpha;
  ctx.lineWidth = 1.4;
  const steps = 80;
  for (let s = 0; s <= steps; s++) {
    const [x, y] = routeAt((s / steps) * tk);
    if (s === 0) ctx.moveTo(X(x), Y(y));
    else ctx.lineTo(X(x), Y(y));
  }
  ctx.stroke();

  // Truck with headlight cone.
  const [ax, ay] = routeAt(Math.max(0, tk - 0.004));
  const ang = Math.atan2(-(ty - ay), tx - ax);
  ctx.save();
  ctx.translate(X(tx), Y(ty));
  ctx.rotate(ang);
  const g = ctx.createLinearGradient(0, 0, 80, 0);
  g.addColorStop(0, 'rgba(240,201,143,0.35)');
  g.addColorStop(1, 'rgba(240,201,143,0)');
  ctx.fillStyle = g;
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.moveTo(6, -3);
  ctx.lineTo(80, -22);
  ctx.lineTo(80, 22);
  ctx.lineTo(6, 3);
  ctx.fill();
  ctx.strokeStyle = INK.white;
  ctx.lineWidth = 1.1;
  ctx.strokeRect(-9, -4.5, 18, 9);
  ctx.beginPath();
  ctx.moveTo(1, -4.5);
  ctx.lineTo(1, 4.5);
  ctx.stroke();
  ctx.restore();

  // Fence and floodlight at the end of the route.
  if (fence > 0) {
    const fx = X(28.6);
    ctx.globalAlpha = alpha * fence;
    ctx.strokeStyle = INK.white;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(fx, Y(-4));
    ctx.lineTo(fx, Y(20));
    for (let y = -4; y < 20; y += 0.8) {
      ctx.moveTo(fx - 4, Y(y));
      ctx.lineTo(fx + 4, Y(y));
    }
    ctx.stroke();
    const flick = 0.85 + Math.sin(t * 9) * 0.05;
    const lg = ctx.createRadialGradient(fx + 20, Y(9.5), 0, fx + 20, Y(9.5), 160);
    lg.addColorStop(0, `rgba(255,248,235,${0.55 * fence * flick})`);
    lg.addColorStop(1, 'rgba(255,248,235,0)');
    ctx.fillStyle = lg;
    ctx.globalAlpha = alpha;
    ctx.fillRect(fx - 160, Y(9.5) - 160, 340, 320);
    micro(ctx, 'PERIMETER · NO SIGN', fx + 12, Y(13), { alpha: alpha * fence });
  }
  ctx.restore();
}

function drawSection(f: SeqFrame, a: number, depth: number) {
  const { ctx, w, h } = f;
  const gy = lerp(h * 0.5, h * 0.22, easeInOut(depth));
  ctx.save();
  ctx.globalAlpha = a;
  ctx.strokeStyle = INK.white;
  // Ground line with hatching.
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, gy);
  ctx.lineTo(w, gy);
  ctx.stroke();
  ctx.lineWidth = 0.7;
  ctx.globalAlpha = a * 0.35;
  ctx.beginPath();
  for (let x = -20; x < w; x += 12) {
    ctx.moveTo(x, gy + 1);
    ctx.lineTo(x + 10, gy + 11);
  }
  ctx.stroke();
  // Fence in elevation.
  ctx.globalAlpha = a * 0.8;
  ctx.beginPath();
  for (let x = w * 0.1; x < w * 0.45; x += 14) {
    ctx.moveTo(x, gy);
    ctx.lineTo(x, gy - 22);
  }
  ctx.moveTo(w * 0.1, gy - 18);
  ctx.lineTo(w * 0.45, gy - 18);
  ctx.stroke();

  // The cut reveals what lies beneath (draw in sequence).
  const k = Math.min(w, h) / 600;
  const reveal = seg(depth, 0.1, 1);
  const cx = w * 0.5;
  ctx.lineWidth = 1;
  ctx.globalAlpha = a * smooth(seg(reveal, 0, 0.3));
  // Entrance ramp + blast door.
  ctx.beginPath();
  ctx.moveTo(cx - 220 * k, gy);
  ctx.lineTo(cx - 140 * k, gy + 60 * k);
  ctx.lineTo(cx - 60 * k, gy + 60 * k);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx - 60 * k, gy + 40 * k, 20 * k, 0, Math.PI * 2);
  ctx.stroke();
  // Corridor.
  ctx.globalAlpha = a * smooth(seg(reveal, 0.2, 0.5));
  ctx.strokeRect(cx - 60 * k, gy + 50 * k, 220 * k, 22 * k);
  for (let i = 0; i < 9; i++) {
    ctx.beginPath();
    ctx.moveTo(cx - 50 * k + i * 24 * k, gy + 50 * k);
    ctx.lineTo(cx - 50 * k + i * 24 * k, gy + 72 * k);
    ctx.globalAlpha = a * 0.3 * smooth(seg(reveal, 0.2, 0.5));
    ctx.stroke();
  }
  // Main hall.
  ctx.globalAlpha = a * smooth(seg(reveal, 0.35, 0.65));
  ctx.strokeRect(cx + 160 * k, gy + 30 * k, 180 * k, 120 * k);
  ctx.beginPath();
  ctx.ellipse(cx + 250 * k, gy + 110 * k, 60 * k, 14 * k, 0, 0, Math.PI * 2);
  ctx.stroke();
  micro(ctx, 'CONTROL · LAZARUS', cx + 170 * k, gy + 44 * k, { alpha: a * smooth(seg(reveal, 0.4, 0.7)), size: 9 });
  // Launch silo with vehicle.
  ctx.globalAlpha = a * smooth(seg(reveal, 0.55, 0.9));
  ctx.beginPath();
  ctx.moveTo(cx + 380 * k, gy);
  ctx.lineTo(cx + 380 * k, gy + 280 * k);
  ctx.lineTo(cx + 460 * k, gy + 280 * k);
  ctx.lineTo(cx + 460 * k, gy);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + 420 * k, gy + 30 * k);
  ctx.lineTo(cx + 434 * k, gy + 60 * k);
  ctx.lineTo(cx + 434 * k, gy + 250 * k);
  ctx.lineTo(cx + 406 * k, gy + 250 * k);
  ctx.lineTo(cx + 406 * k, gy + 60 * k);
  ctx.closePath();
  ctx.stroke();
  micro(ctx, 'LAUNCH SILO', cx + 470 * k, gy + 140 * k, { alpha: a * smooth(seg(reveal, 0.6, 0.95)), size: 9 });
  ctx.restore();
  glowDot(ctx, cx - 60 * k, gy + 40 * k, 2.5, INK.gold, a * smooth(seg(reveal, 0, 0.3)));
  if (reveal > 0.7) title(ctx, 'NASA', w * 0.5, ZONE.low(h), Math.min(40, w * 0.04), a * seg(reveal, 0.7, 1));
}

export function drawFarmNasa(f: SeqFrame) {
  const { p } = f;
  const floorA = 1 - seg(p, 0.46, 0.54);
  const zoom = lerp(1, 0.25, easeInOut(seg(p, 0.44, 0.54)));
  if (floorA > 0) drawFloor(f, floorA, zoom);

  const planA = win(p, 0.48, 0.86, 0.05);
  if (planA > 0) {
    const tk = easeInOut(seg(p, 0.5, 0.76));
    const fence = easeOut(seg(p, 0.7, 0.8));
    drawPlan(f, planA, tk, fence);
  }

  const secA = seg(p, 0.82, 0.88);
  if (secA > 0) drawSection(f, secA, seg(p, 0.84, 1));

  if (p < 0.16) micro(f.ctx, 'PLAN · MURPH’S FLOOR · DUST STORM', f.w / 2, ZONE.label(f.h) - 40, { align: 'center', alpha: win(p, 0, 0.16) * 0.8 });
  if (planA > 0.2) micro(f.ctx, 'PLAN · NIGHT · TRACKING', f.w / 2, ZONE.label(f.h), { align: 'center', alpha: planA * 0.7 });
  if (secA > 0.2) micro(f.ctx, 'SECTION · BELOW THE LANDSCAPE', f.w / 2, ZONE.low(f.h) + 40, { align: 'center', alpha: secA * 0.7 });
}
