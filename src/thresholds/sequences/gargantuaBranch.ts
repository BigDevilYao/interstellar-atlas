import { easeIn, easeInOut, lerp, seg, smooth, win } from '../../lib/ease';
import { INK, glowDot, micro, title, ZONE } from '../../lib/wire3d';
import type { SeqFrame } from '../types';
import { drawBlackHole2D, drawSphere, drawStars } from './shared';

/**
 * TH·G  Endurance → Gargantua → branching routes
 * One trajectory splits: Cooper/TARS fall inward to the Tesseract; Brand/CASE are flung to Edmunds.
 */

const E = 1.55;
const TH_MAX = Math.acos(-1 / E) * 0.96;

/** Point on the slingshot hyperbola, s ∈ [-1, 1] (0 = periapsis). */
function hyper(s: number, cx: number, cy: number, scale: number, rot: number): [number, number] {
  const th = s * TH_MAX;
  const r = (scale * (E * E - 1)) / (1 + E * Math.cos(th));
  const x = Math.cos(th + rot) * r;
  const y = Math.sin(th + rot) * r;
  return [cx + x, cy + y];
}

function trajectoryPath(ctx: CanvasRenderingContext2D, from: number, to: number, cx: number, cy: number, sc: number, rot: number) {
  ctx.beginPath();
  for (let i = 0; i <= 80; i++) {
    const s = lerp(from, to, i / 80);
    const [x, y] = hyper(s, cx, cy, sc, rot);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
}

function spiral(ctx: CanvasRenderingContext2D, x0: number, y0: number, cx: number, cy: number, rEnd: number, k: number, a: number) {
  const dx = x0 - cx;
  const dy = y0 - cy;
  const r0 = Math.hypot(dx, dy);
  const a0 = Math.atan2(dy, dx);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.strokeStyle = INK.gold;
  ctx.lineWidth = 1.3;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  let last: [number, number] = [x0, y0];
  const n = Math.max(2, Math.floor(80 * k));
  for (let i = 0; i <= n; i++) {
    const u = (i / 80) ;
    const r = lerp(r0, rEnd, easeIn(u));
    const ang = a0 + u * 2.6;
    const x = cx + Math.cos(ang) * r;
    const y = cy + Math.sin(ang) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
    last = [x, y];
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
  glowDot(ctx, last[0], last[1], 2.6, INK.gold, a);
}

export function drawGargantuaBranch(f: SeqFrame) {
  const { ctx, w, h, p, t, wire } = f;
  const S = Math.min(w, h);

  const mainA = 1 - seg(p, 0.5, 0.54);
  const bhR = S * lerp(0.05, 0.1, easeInOut(seg(p, 0, 0.2)));
  const cx = w * 0.5;
  const cy = h * 0.5;
  // Periapsis stays well outside the shadow: r_p = sc·(E − 1).
  const sc = (S * 0.1 * 2.1) / (E - 1);
  const rot = Math.PI * 0.95;

  if (mainA > 0) {
    drawStars(ctx, w, h, t, mainA * 0.7, { seed: 8 });
    drawBlackHole2D(ctx, cx, cy, bhR, mainA, t);
    // Approach + slingshot.
    const prog = easeInOut(seg(p, 0.04, 0.42));
    const sNow = lerp(-1, 0.05, prog);
    ctx.save();
    ctx.globalAlpha = mainA * 0.25;
    ctx.strokeStyle = INK.white;
    ctx.setLineDash([3, 5]);
    trajectoryPath(ctx, -1, 1, cx, cy, sc, rot);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = mainA;
    ctx.lineWidth = 1.3;
    trajectoryPath(ctx, -1, sNow, cx, cy, sc, rot);
    ctx.stroke();
    ctx.restore();
    const [sx, sy] = hyper(sNow, cx, cy, sc, rot);
    glowDot(ctx, sx, sy, 3, INK.white, mainA);
    micro(ctx, 'ENDURANCE', sx + 12, sy - 12, { alpha: mainA * 0.8 });
    micro(ctx, p < 0.18 ? 'APPROACH' : p < 0.38 ? 'SLINGSHOT · HYPERBOLIC PATH' : 'SEPARATION', w / 2, ZONE.low(h), {
      align: 'center',
      alpha: mainA * 0.8,
    });

    // Separation at periapsis.
    const sep = seg(p, 0.38, 0.52);
    if (sep > 0) {
      ctx.save();
      ctx.globalAlpha = mainA;
      ctx.lineWidth = 1.3;
      ctx.strokeStyle = INK.white;
      trajectoryPath(ctx, 0.05, lerp(0.05, 0.6, sep), cx, cy, sc, rot);
      ctx.stroke();
      ctx.restore();
      spiral(ctx, sx, sy, cx, cy, bhR * 1.05, sep, mainA);
      micro(ctx, 'COOPER · TARS', sx - 16, sy + 22, { alpha: mainA * sep, color: INK.gold, align: 'right' });
      const [bx, by] = hyper(lerp(0.05, 0.6, sep), cx, cy, sc, rot);
      glowDot(ctx, bx, by, 3, INK.white, mainA);
      micro(ctx, 'BRAND · CASE', bx + 14, by + 4, { alpha: mainA * sep });
    }
  }

  // Split frame — cross-cutting between the two trajectories.
  const splitA = win(p, 0.5, 0.72, 0.03);
  if (splitA > 0) {
    const mid = w / 2;
    const k = seg(p, 0.52, 0.7);
    const cut = Math.floor(k * 6) % 2; // alternate emphasis
    // Left: Cooper falls.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, mid - 1, h);
    ctx.clip();
    drawStars(ctx, mid, h, t, splitA * 0.6, { seed: 44, streak: k * 0.8 });
    const lR = S * lerp(0.12, 0.3, easeIn(k));
    drawBlackHole2D(ctx, mid * 0.5, h * 0.5, lR, splitA * (cut ? 1 : 0.55), t * 1.4);
    glowDot(ctx, mid * 0.5 + lR * 1.6 * (1 - k), h * 0.5 - lR * 0.4 * (1 - k), 3, INK.gold, splitA);
    micro(ctx, 'COOPER · TARS → INWARD', mid * 0.5, ZONE.label(h), { align: 'center', alpha: splitA * (cut ? 1 : 0.5), color: INK.gold });
    ctx.restore();
    // Right: Brand flung outward.
    ctx.save();
    ctx.beginPath();
    ctx.rect(mid + 1, 0, w - mid, h);
    ctx.clip();
    ctx.translate(mid, 0);
    drawStars(ctx, w - mid, h, t, splitA * 0.6, { seed: 45 });
    drawBlackHole2D(ctx, (w - mid) * 0.2, h * 0.62, S * 0.05, splitA * (cut ? 0.55 : 1), t);
    ctx.globalAlpha = splitA * (cut ? 0.55 : 1);
    ctx.strokeStyle = INK.white;
    ctx.beginPath();
    ctx.moveTo((w - mid) * 0.2 + S * 0.08, h * 0.62);
    ctx.quadraticCurveTo((w - mid) * 0.5, h * 0.66, (w - mid) * lerp(0.4, 0.82, k), h * lerp(0.58, 0.32, k));
    ctx.stroke();
    ctx.globalAlpha = 1;
    glowDot(ctx, (w - mid) * lerp(0.4, 0.82, k), h * lerp(0.58, 0.32, k), 3, INK.white, splitA);
    micro(ctx, 'BRAND · CASE → OUTWARD', (w - mid) * 0.5, ZONE.label(h), { align: 'center', alpha: splitA * (cut ? 0.5 : 1) });
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = splitA * 0.6;
    ctx.strokeStyle = INK.white;
    ctx.beginPath();
    ctx.moveTo(mid, h * 0.08);
    ctx.lineTo(mid, h * 0.92);
    ctx.stroke();
    ctx.restore();
  }

  // Cooper through the horizon → dimensional cut.
  const coA = win(p, 0.7, 0.87, 0.02);
  if (coA > 0) {
    const k = seg(p, 0.7, 0.86);
    const R = S * lerp(0.3, 1.6, easeIn(seg(k, 0, 0.5)));
    drawBlackHole2D(ctx, w / 2, h / 2, R, coA * (1 - seg(k, 0.45, 0.55)), t * 2);
    const lat = seg(k, 0.5, 1);
    if (lat > 0) {
      wire.camera({ pos: [0, 0, lerp(2, -6, lat)], target: [0, 0, -20], fov: 70, roll: lat * 0.4 });
      wire.begin();
      for (let i = -4; i <= 4; i++)
        for (let j = -3; j <= 3; j++) {
          wire.line([i * 1.6, j * 1.4, 0], [i * 1.6, j * 1.4, -40]);
        }
      for (let z = 0; z > -40; z -= 2.2) {
        for (let i = -4; i <= 4; i++) wire.line([i * 1.6, -4.2, z], [i * 1.6, 4.2, z]);
        for (let j = -3; j <= 3; j++) wire.line([-6.4, j * 1.4, z], [6.4, j * 1.4, z]);
      }
      wire.stroke(INK.white, coA * lat * 0.4, 0.6);
      title(ctx, 'TESSERACT', w / 2, h / 2, Math.min(42, w * 0.042), coA * seg(lat, 0.3, 0.8));
    }
    micro(ctx, 'COOPER · THROUGH THE HORIZON', w / 2, ZONE.label(h), { align: 'center', alpha: coA * 0.85, color: INK.gold });
  }

  // Brand to Edmunds' Planet.
  const brA = seg(p, 0.86, 0.9);
  if (brA > 0) {
    const k = easeInOut(seg(p, 0.86, 1));
    drawStars(ctx, w, h, t, brA * 0.6, { seed: 70 });
    wire.camera({ pos: [0, 0.6, lerp(9, 5, k)], target: [0, 0, 0], fov: 45 });
    drawSphere(wire, [1.2, 0, 0], 1.6, INK.white, brA * 0.55, t * 0.05, 12, 8);
    ctx.save();
    ctx.globalAlpha = brA;
    ctx.strokeStyle = INK.white;
    ctx.beginPath();
    ctx.moveTo(w * 0.1, h * 0.75);
    ctx.quadraticCurveTo(w * 0.3, h * 0.45, w * lerp(0.25, 0.5, k), h * lerp(0.6, 0.48, k));
    ctx.stroke();
    ctx.restore();
    glowDot(ctx, w * lerp(0.25, 0.5, k), h * lerp(0.6, 0.48, k), 3, INK.white, brA);
    title(ctx, 'EDMUNDS’ PLANET', w / 2, ZONE.title(h), Math.min(32, w * 0.032), smooth(seg(k, 0.3, 0.8)) * brA);
    micro(ctx, 'BRAND DOES NOT ENTER THE TESSERACT', w / 2, ZONE.title(h) + 34, { align: 'center', alpha: brA * 0.8 });
  }
}
