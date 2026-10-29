import { easeInOut, easeOut, lerp, mulberry, seg, smooth, win } from '../../lib/ease';
import { INK, glowDot, micro, title, type V3, ZONE } from '../../lib/wire3d';
import type { SeqFrame } from '../types';
import { drawEndurance, drawRanger, drawStars } from './shared';

/**
 * TH·F  Mann's Planet → Endurance docking
 * A mechanical threshold: the frame itself rolls to match the spinning ring.
 */

const DUR = 12;
const OMEGA = 3.4; // visual rad/s (≈ 67–68 rpm in the film, slowed for legibility)

function spinRate(p: number): number {
  return smooth(seg(p, 0.2, 0.36)) * (1 - 0.85 * smooth(seg(p, 0.9, 1)));
}

/** Integral of the spin rate up to p — keeps the sequence scrubbable. */
function spinAngle(p: number): number {
  const N = 120;
  let s = 0;
  for (let i = 0; i < N; i++) {
    const q = (p * (i + 0.5)) / N;
    s += spinRate(q);
  }
  return (s / N) * p * DUR * OMEGA;
}

const DEBRIS = (() => {
  const r = mulberry(17);
  return Array.from({ length: 60 }, () => ({ a: r() * Math.PI * 2, s: 0.3 + r() * 1.2, z: (r() - 0.5) * 0.6, rot: r() }));
})();

export function drawMannDocking(f: SeqFrame) {
  const { ctx, w, h, p, t, wire } = f;

  // 1 · Departure from the frozen planet.
  const iceA = 1 - seg(p, 0.16, 0.22);
  if (iceA > 0) {
    const up = easeInOut(seg(p, 0, 0.2));
    wire.camera({ pos: [0, lerp(3, 9, up), 6], target: [0, 0, -2], fov: 50 });
    wire.begin();
    for (let zi = 0; zi < 14; zi++) {
      const z = 4 - zi * 1.2;
      const pts: V3[] = [];
      for (let xi = 0; xi <= 30; xi++) {
        const x = -15 + xi;
        pts.push([x, Math.abs(Math.sin(x * 0.6 + zi)) * 0.9 + (xi % 3 === 0 ? 0.4 : 0), z]);
      }
      wire.poly(pts);
    }
    wire.stroke(INK.white, iceA * 0.35, 0.6);
    drawRanger(wire, [0, lerp(1, 4.2, up), lerp(0, -1, up)], 0.4, -Math.PI / 2, { alpha: iceA, roll: 0.3 });
    micro(ctx, 'ASCENT FROM MANN’S PLANET', w / 2, ZONE.low(h), { align: 'center', alpha: iceA * 0.8 });
  }

  // 2–5 · The ring.
  const ringA = seg(p, 0.16, 0.22);
  if (ringA > 0) {
    const angle = spinAngle(p);
    const match = easeInOut(seg(p, 0.52, 0.66));
    const camRoll = angle * match;
    const starsRot = -camRoll;
    drawStars(ctx, w, h, t, ringA * 0.75, { seed: 31, rotate: starsRot });

    const approach = easeInOut(seg(p, 0.5, 0.88));
    wire.camera({
      pos: [0, 0, lerp(7.5, 3.2, approach)],
      target: [0, 0, 0],
      fov: 46,
      roll: camRoll,
    });
    const broken = p > 0.22 ? [2, 3] : [];
    drawEndurance(wire, [0, 0, 0], 1.6, angle, { tilt: 0, alpha: ringA, broken });

    // Explosion flash + debris.
    const ex = seg(p, 0.2, 0.34);
    if (ex > 0 && ex < 1) {
      const e = wire.project([Math.cos(Math.PI * 0.42 + angle) * 1.6, Math.sin(Math.PI * 0.42 + angle) * 1.6, 0]);
      if (e) {
        const g = ctx.createRadialGradient(e[0], e[1], 0, e[0], e[1], 180 * (1 - ex) + 20);
        g.addColorStop(0, `rgba(255,240,214,${0.9 * (1 - ex)})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = INK.white;
        DEBRIS.forEach((d) => {
          const rr = easeOut(ex) * d.s * 140;
          ctx.globalAlpha = (1 - ex) * 0.9;
          ctx.fillRect(e[0] + Math.cos(d.a) * rr, e[1] + Math.sin(d.a) * rr, 2, 2);
        });
        ctx.globalAlpha = 1;
      }
    }

    const rpmA = win(p, 0.34, 0.74, 0.03);
    if (rpmA > 0) {
      const rpm = Math.round(spinRate(p) * 68);
      micro(ctx, `${rpm} RPM`, w * 0.86, h * 0.2, { align: 'right', alpha: rpmA, size: 14, color: INK.gold });
      micro(ctx, match > 0.5 ? 'CAMERA ROLL = RING ROTATION' : 'RING SPINNING · STARS STREAK', w * 0.86, h * 0.2 + 22, {
        align: 'right',
        alpha: rpmA * 0.7,
      });
    }

    // Alignment overlay — concentric circles converge.
    const al = win(p, 0.72, 1.0, 0.03);
    if (al > 0) {
      const k = easeInOut(seg(p, 0.74, 0.88));
      const cx = w / 2;
      const cy = h / 2;
      const R0 = Math.min(w, h) * 0.08;
      const off = (1 - k) * Math.min(w, h) * 0.09;
      ctx.save();
      ctx.globalAlpha = al;
      ctx.strokeStyle = INK.gold;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(cx, cy, R0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = INK.white;
      ctx.beginPath();
      ctx.arc(cx + off * Math.cos(t * 2), cy + off * Math.sin(t * 2.6), R0 * lerp(1.6, 1.02, k), 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + off * 0.5 * Math.cos(t * 2), cy + off * 0.5 * Math.sin(t * 2.6), R0 * lerp(2.4, 1.3, k), 0, Math.PI * 2);
      ctx.globalAlpha = al * 0.5;
      ctx.stroke();
      ctx.globalAlpha = al * 0.8;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const a0 = (i * Math.PI) / 2;
        ctx.moveTo(cx + Math.cos(a0) * R0 * 1.15, cy + Math.sin(a0) * R0 * 1.15);
        ctx.lineTo(cx + Math.cos(a0) * R0 * 1.6, cy + Math.sin(a0) * R0 * 1.6);
      }
      ctx.stroke();
      ctx.restore();
      micro(ctx, `ALIGNMENT  Δ ${(off / 10).toFixed(2)}`, cx, cy + R0 * 2.8, { align: 'center', alpha: al, color: INK.gold });
      if (p > 0.88) {
        const d = seg(p, 0.88, 0.94);
        glowDot(ctx, cx, cy, 4, INK.gold, d);
        title(ctx, 'DOCKED', cx, ZONE.title(h), Math.min(36, w * 0.036), d);
      }
    }
  }
}
