import { easeInOut, easeOut, lerp, mulberry, seg, smooth, win } from '../../lib/ease';
import { INK, glowDot, micro, title, type V3, ZONE } from '../../lib/wire3d';
import type { SeqFrame } from '../types';

/**
 * TH·H  Tesseract → Murph's Room → Cooper Station
 * Information, not travel: gravity → watch → data → solution → habitat.
 */

const MORSE = '.-.. --- ...- . / ... - .- -.-- / -.. .- - .-'.split('');

function drawLattice(f: SeqFrame, a: number, drift: number, highlight: number) {
  const { wire } = f;
  wire.camera({ pos: [0.8, 0.4, 4 - drift], target: [0, 0, -20], fov: 62, roll: 0.05 });
  wire.begin();
  for (let i = -3; i <= 3; i++)
    for (let j = -2; j <= 2; j++) {
      wire.line([i * 2.2, j * 1.6, 2], [i * 2.2, j * 1.6, -40]);
    }
  for (let z = 2; z > -40; z -= 2.4) {
    for (let i = -3; i <= 3; i++) wire.line([i * 2.2, -3.2, z], [i * 2.2, 3.2, z]);
    for (let j = -2; j <= 2; j++) wire.line([-6.6, j * 1.6, z], [6.6, j * 1.6, z]);
  }
  wire.stroke(INK.white, a * 0.35, 0.6);
  if (highlight > 0) {
    wire.begin();
    wire.box([0, 0, -7.2], [2.2, 1.6, -4.8]);
    wire.stroke(INK.gold, a * highlight, 1.3);
  }
}

function drawWatch(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, a: number, step: number) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.strokeStyle = INK.white;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, r * 1.08, 0, Math.PI * 2);
  ctx.globalAlpha = a * 0.4;
  ctx.stroke();
  ctx.globalAlpha = a;
  for (let i = 0; i < 60; i++) {
    const t = (i / 60) * Math.PI * 2;
    const r0 = i % 5 === 0 ? r * 0.84 : r * 0.92;
    ctx.globalAlpha = a * (i % 5 === 0 ? 0.9 : 0.35);
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(t) * r0, y + Math.sin(t) * r0);
    ctx.lineTo(x + Math.cos(t) * r, y + Math.sin(t) * r);
    ctx.stroke();
  }
  // Second hand twitches: long for dash, short for dot.
  const sym = MORSE[step % MORSE.length];
  const jitter = sym === '-' ? 0.12 : sym === '.' ? 0.05 : 0;
  const ang = (step / 60) * Math.PI * 2 - Math.PI / 2 + jitter;
  ctx.globalAlpha = a;
  ctx.strokeStyle = INK.gold;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x - Math.cos(ang) * r * 0.15, y - Math.sin(ang) * r * 0.15);
  ctx.lineTo(x + Math.cos(ang) * r * 0.86, y + Math.sin(ang) * r * 0.86);
  ctx.stroke();
  ctx.restore();
  glowDot(ctx, x, y, 3, INK.gold, a);
}

const GLYPHS = (() => {
  const r = mulberry(12);
  const chars = '0123456789ABCDEF∆∇';
  return Array.from({ length: 220 }, () => chars[Math.floor(r() * chars.length)]);
})();

export function drawInformationLoop(f: SeqFrame) {
  const { ctx, w, h, p, t } = f;

  // 1 · Inside the Tesseract.
  const latA = 1 - seg(p, 0.34, 0.4);
  if (latA > 0) {
    const split = easeInOut(seg(p, 0.18, 0.26));
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, lerp(w, w / 2 - 1, split), h);
    ctx.clip();
    drawLattice(f, latA, t * 0.3, smooth(seg(p, 0.06, 0.16)));
    ctx.restore();
    micro(ctx, p < 0.18 ? 'TESSERACT · LOCATING THE MOMENT' : 'GRAVITY AS SIGNAL', w / 2, ZONE.low(h), { align: 'center', alpha: latA * 0.85 });

    // Cross-cut: the bedroom on the right; pulses travel across time.
    if (split > 0) {
      const ox = w / 2 + 1;
      ctx.save();
      ctx.globalAlpha = latA * split;
      ctx.strokeStyle = INK.white;
      ctx.lineWidth = 1;
      const bw = w * 0.32;
      const bh = h * 0.42;
      const bx = ox + (w / 2 - bw) / 2;
      const by = h * 0.3;
      ctx.strokeRect(bx, by, bw, bh);
      // shelf in elevation
      ctx.strokeRect(bx + bw * 0.55, by + bh * 0.1, bw * 0.3, bh * 0.8);
      for (let i = 1; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(bx + bw * 0.55, by + bh * (0.1 + i * 0.16));
        ctx.lineTo(bx + bw * 0.85, by + bh * (0.1 + i * 0.16));
        ctx.stroke();
      }
      ctx.restore();
      drawWatch(ctx, bx + bw * 0.7, by + bh * 0.42, Math.min(w, h) * 0.018, latA * split, Math.floor(t * 4));
      micro(ctx, 'MURPH’S ROOM · ADULT MURPH', bx, by - 16, { alpha: latA * split * 0.8 });
      // Pulses.
      for (let i = 0; i < 6; i++) {
        const u = (t * 0.5 + i / 6) % 1;
        const x = lerp(w * 0.25, bx + bw * 0.7, u);
        const y = lerp(h * 0.5, by + bh * 0.42, u) - Math.sin(u * Math.PI) * h * 0.08;
        glowDot(ctx, x, y, 2.2, INK.gold, latA * split * Math.sin(u * Math.PI));
      }
    }
  }

  // 2 · The watch, large.
  const wA = win(p, 0.36, 0.6, 0.03);
  if (wA > 0) {
    const step = Math.floor(seg(p, 0.38, 0.58) * MORSE.length * 1.2);
    const R = Math.min(w, h) * 0.17;
    drawWatch(ctx, w / 2, h * 0.47, R, wA, step);
    // Code strip.
    const n = Math.min(MORSE.length, step);
    let x = w / 2 - (MORSE.length * 14) / 2;
    ctx.save();
    ctx.globalAlpha = wA;
    ctx.strokeStyle = INK.gold;
    ctx.fillStyle = INK.gold;
    ctx.lineWidth = 2;
    for (let i = 0; i < n; i++) {
      const s = MORSE[i];
      if (s === '-') {
        ctx.beginPath();
        ctx.moveTo(x, h * 0.71);
        ctx.lineTo(x + 9, h * 0.71);
        ctx.stroke();
      } else if (s === '.') {
        ctx.beginPath();
        ctx.arc(x + 4, h * 0.71, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      x += 14;
    }
    ctx.restore();
    micro(ctx, 'THE SECOND HAND · LONG AND SHORT INTERVALS', w / 2, ZONE.label(h), { align: 'center', alpha: wA * 0.85 });
  }

  // 3 · Decoding → quantum data.
  const dA = win(p, 0.56, 0.74, 0.03);
  if (dA > 0) {
    const k = seg(p, 0.56, 0.72);
    const cols = 22;
    const rows = 10;
    const cw = Math.min(26, w / 30);
    const ox = w / 2 - (cols * cw) / 2;
    const oy = ZONE.label(h) + 34;
    for (let i = 0; i < cols * rows; i++) {
      const c = i % cols;
      const r = Math.floor(i / cols);
      const show = (c + r * 0.6) / (cols + rows * 0.6) < k * 1.3;
      if (!show) continue;
      micro(ctx, GLYPHS[i], ox + c * cw, oy + r * cw, {
        alpha: dA * (0.35 + 0.65 * ((i * 7) % 11 === 0 ? 1 : 0.4)),
        color: (i * 7) % 11 === 0 ? INK.gold : INK.white,
        size: 12,
        align: 'center',
      });
    }
    micro(ctx, 'QUANTUM DATA FROM INSIDE THE BLACK HOLE', w / 2, ZONE.label(h), { align: 'center', alpha: dA * 0.85 });
    micro(ctx, 'MURPH DECODES · CONCEPTUAL, NOT A REAL EQUATION', w / 2, oy + rows * cw + 18, { align: 'center', alpha: dA * 0.5, size: 9 });
  }

  // 4 · The solution: mass lifted off the planet.
  const sA = win(p, 0.72, 0.88, 0.03);
  if (sA > 0) {
    const k = easeOut(seg(p, 0.72, 0.86));
    const S = Math.min(w, h);
    const cx = w / 2;
    const cy = h * 0.95 + S * 0.9;
    ctx.save();
    ctx.globalAlpha = sA;
    ctx.strokeStyle = INK.white;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(cx, cy, S * 1.0, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    for (let i = 0; i < 5; i++) {
      const x = w * (0.3 + i * 0.1);
      const y0 = h * 0.72 - Math.abs(i - 2) * h * 0.02;
      const y = y0 - k * h * (0.3 + i * 0.05);
      ctx.strokeRect(x - 12, y - 30, 24, 30);
      ctx.globalAlpha = sA * 0.4;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = sA;
    }
    ctx.restore();
    micro(ctx, 'THE GRAVITY PROBLEM, SOLVED', w / 2, ZONE.label(h), { align: 'center', alpha: sA * 0.85 });
  }

  // 5 · Cooper Station: the inverted landscape.
  const cA = seg(p, 0.86, 0.9);
  if (cA > 0) {
    const k = easeInOut(seg(p, 0.86, 1));
    const { wire } = f;
    wire.camera({ pos: [0, 0, lerp(6, 2, k)], target: [0, 0, -30], fov: 70, roll: t * 0.05 });
    wire.begin();
    const R = 3;
    for (let z = 4; z > -40; z -= 2.5) wire.circle([0, 0, z], [1, 0, 0], [0, 1, 0], R, 64);
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      wire.line([Math.cos(a) * R, Math.sin(a) * R, 4], [Math.cos(a) * R, Math.sin(a) * R, -40]);
    }
    wire.stroke(INK.white, cA * 0.3, 0.6);
    // Houses and fields on the inner surface.
    wire.begin();
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + 0.3;
      const z = -4 - (i % 6) * 5;
      const n: V3 = [-Math.cos(a), -Math.sin(a), 0];
      const base: V3 = [Math.cos(a) * R, Math.sin(a) * R, z];
      const tg: V3 = [-Math.sin(a), Math.cos(a), 0];
      const s = 0.25;
      const p0: V3 = [base[0] - tg[0] * s, base[1] - tg[1] * s, base[2]];
      const p1: V3 = [base[0] + tg[0] * s, base[1] + tg[1] * s, base[2]];
      const up = (q: V3, m: number): V3 => [q[0] + n[0] * m, q[1] + n[1] * m, q[2]];
      wire.poly([p0, up(p0, 0.3), up(base, 0.48), up(p1, 0.3), p1]);
    }
    wire.stroke(INK.gold, cA * 0.8, 0.9);
    title(ctx, 'COOPER STATION', w / 2, h * 0.5, Math.min(36, w * 0.036), smooth(seg(k, 0.3, 0.8)) * cA);
    micro(ctx, 'THE FARM RETURNS · CURVED OVERHEAD', w / 2, h * 0.5 + 34, { align: 'center', alpha: smooth(seg(k, 0.4, 0.9)) * cA * 0.8, color: INK.gold });
  }
}
