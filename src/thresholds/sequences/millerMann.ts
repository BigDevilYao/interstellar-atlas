import { easeInOut, lerp, seg, smooth, win } from '../../lib/ease';
import { INK, micro, title, type V3, ZONE } from '../../lib/wire3d';
import type { SeqFrame } from '../types';
import { drawEndurance, drawRanger, drawStars } from './shared';

/**
 * TH·E  Miller's Planet → Endurance → Mann's Planet
 * Time dilation as split screen: one hour against seven years.
 */

function waveHeight(x: number, z: number, t: number, crest: number, crestZ: number): number {
  const ripple = Math.sin(x * 0.9 + t * 1.2) * 0.04 + Math.sin(z * 1.3 - t * 0.8) * 0.03;
  const dz = z - crestZ;
  const ridge = crest * 4.2 * Math.exp(-dz * dz * 0.35) * (0.85 + 0.15 * Math.sin(x * 0.25));
  return ripple + ridge;
}

function drawOcean(f: SeqFrame, a: number, crest: number, crestZ: number) {
  const { wire, t } = f;
  wire.camera({ pos: [0, 1.0 + crest * 0.4, 6], target: [0, 1.0 + crest * 1.5, -10], fov: 55 });
  wire.begin();
  for (let zi = 0; zi <= 26; zi++) {
    const z = 4 - zi * 1.6;
    const pts: V3[] = [];
    for (let xi = 0; xi <= 50; xi++) {
      const x = -30 + xi * 1.2;
      pts.push([x, waveHeight(x, z, t, crest, crestZ), z]);
    }
    wire.poly(pts);
  }
  wire.stroke(INK.white, a * 0.45, 0.7);
  wire.begin();
  for (let xi = 0; xi <= 50; xi += 2) {
    const x = -30 + xi * 1.2;
    const pts: V3[] = [];
    for (let zi = 0; zi <= 26; zi++) {
      const z = 4 - zi * 1.6;
      pts.push([x, waveHeight(x, z, t, crest, crestZ), z]);
    }
    wire.poly(pts);
  }
  wire.stroke(INK.white, a * 0.18, 0.6);
  drawRanger(wire, [1.5, 0.35 + waveHeight(1.5, -2, t, crest, crestZ) * 0.2, -2], 0.35, 2.4, { alpha: a });
}

function clockFace(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, ang: number, a: number, color: string) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 60; i++) {
    const t = (i / 60) * Math.PI * 2;
    const r0 = i % 5 === 0 ? r * 0.86 : r * 0.93;
    ctx.globalAlpha = a * (i % 5 === 0 ? 0.9 : 0.4);
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(t) * r0, y + Math.sin(t) * r0);
    ctx.lineTo(x + Math.cos(t) * r, y + Math.sin(t) * r);
    ctx.stroke();
  }
  ctx.globalAlpha = a;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(ang - Math.PI / 2) * r * 0.8, y + Math.sin(ang - Math.PI / 2) * r * 0.8);
  ctx.stroke();
  ctx.restore();
}

function drawDilation(f: SeqFrame, a: number, k: number) {
  const { ctx, w, h, t } = f;
  const mid = w / 2;
  ctx.save();
  ctx.globalAlpha = a * 0.5;
  ctx.strokeStyle = INK.white;
  ctx.beginPath();
  ctx.moveTo(mid, ZONE.label(h) + 16);
  ctx.lineTo(mid, h * 0.78);
  ctx.stroke();
  ctx.restore();

  const r = Math.min(w * 0.15, h * 0.17);
  // Miller: one tick ≈ 1.25 s — each tick is roughly a day elsewhere.
  const millerHours = k * 3.33;
  const ticks = Math.floor(t / 1.25);
  clockFace(ctx, mid - w * 0.22, h * 0.52, r, (ticks % 60) * ((Math.PI * 2) / 60), a, INK.white);
  micro(ctx, 'MILLER’S PLANET', mid - w * 0.22, h * 0.52 - r - 26, { align: 'center', alpha: a });
  const hh = Math.floor(millerHours);
  const mm = Math.floor((millerHours - hh) * 60);
  micro(ctx, `${String(hh).padStart(2, '0')} h ${String(mm).padStart(2, '0')} min`, mid - w * 0.22, h * 0.52 + r + 28, {
    align: 'center',
    alpha: a,
    size: 14,
  });

  // Distant observers: years fly.
  const years = millerHours * 7;
  clockFace(ctx, mid + w * 0.22, h * 0.52, r, years * Math.PI * 2 * 3, a, INK.gold);
  micro(ctx, 'EARTH · DISTANT OBSERVERS', mid + w * 0.22, h * 0.52 - r - 26, { align: 'center', alpha: a, color: INK.gold });
  micro(ctx, `${years.toFixed(1)} years`, mid + w * 0.22, h * 0.52 + r + 28, { align: 'center', alpha: a, size: 14, color: INK.gold });

  // Calendar strips peel past on the Earth side.
  ctx.save();
  ctx.globalAlpha = a * 0.25;
  ctx.strokeStyle = INK.gold;
  const off = (years * 60) % 18;
  for (let i = 0; i < 14; i++) {
    const y = h * 0.2 + i * 18 + off;
    if (y > h * 0.8) continue;
    ctx.beginPath();
    ctx.moveTo(mid + 20, y);
    ctx.lineTo(mid + 60, y);
    ctx.stroke();
  }
  ctx.restore();
  micro(ctx, '1 HOUR  ≈  7 YEARS', mid, ZONE.label(h), { align: 'center', alpha: a * 0.9, size: 12 });
}

function drawReturn(f: SeqFrame, a: number) {
  const { ctx, w, h, t, wire, p } = f;
  drawStars(ctx, w, h, t, a * 0.7, { seed: 27 });
  wire.camera({ pos: [0, 0.8, 6], target: [0, 0, 0], fov: 44 });
  drawEndurance(wire, [-0.8, 0, 0], 1.4, t * 0.3, { tilt: 1.0, alpha: a });
  // Accumulated messages: a stack of frames.
  const k = seg(p, 0.6, 0.74);
  const n = Math.floor(k * 23);
  ctx.save();
  for (let i = 0; i < n; i++) {
    const x = w * 0.62 + (i % 6) * 26;
    const y = h * 0.32 + Math.floor(i / 6) * 22;
    ctx.globalAlpha = a * (0.25 + 0.6 * (i === n - 1 ? 1 : 0.3));
    ctx.strokeStyle = i === n - 1 ? INK.blue : INK.white;
    ctx.strokeRect(x, y, 22, 15);
  }
  ctx.restore();
  micro(ctx, 'MESSAGES FROM EARTH', w * 0.62, h * 0.32 - 18, { alpha: a * 0.8, color: INK.blue });
  micro(ctx, '23 YEARS · 4 MONTHS · 8 DAYS', w / 2, ZONE.title(h), { align: 'center', alpha: a, size: 14, color: INK.gold });
  micro(ctx, 'ROMILLY HAS WAITED ON BOARD', w / 2, ZONE.title(h) + 24, { align: 'center', alpha: a * 0.7 });
}

function drawIce(f: SeqFrame, a: number, morph: number) {
  const { ctx, w, h, wire, t } = f;
  // Match cut: a wave crest line becomes an ice ridge.
  ctx.save();
  ctx.globalAlpha = a;
  ctx.strokeStyle = INK.white;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let i = 0; i <= 80; i++) {
    const x = (i / 80) * w;
    const wave = Math.sin(i * 0.25 + t) * h * 0.03;
    const saw = ((i % 8) / 8 - 0.5) * h * 0.12 * (i % 16 < 8 ? 1 : 0.6) - Math.abs(Math.sin(i * 0.7)) * h * 0.05;
    const y = h * 0.58 + lerp(wave, saw, morph);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();

  if (morph > 0.4) {
    const ma = seg(morph, 0.4, 1) * a;
    wire.camera({ pos: [0, 2.2, 8], target: [0, 0.3, -6], fov: 55 });
    // Faceted terrain.
    wire.begin();
    const H = (x: number, z: number) => Math.abs(Math.sin(x * 0.7) * Math.cos(z * 0.5)) * 1.4 + Math.abs(Math.sin(x * 0.23 + z * 0.4)) * 0.8;
    for (let zi = 0; zi < 12; zi++) {
      for (let xi = 0; xi < 22; xi++) {
        const x = -11 + xi;
        const z = 2 - zi * 1.3;
        const p00: V3 = [x, H(x, z), z];
        const p10: V3 = [x + 1, H(x + 1, z), z];
        const p01: V3 = [x, H(x, z - 1.3), z - 1.3];
        wire.line(p00, p10);
        wire.line(p00, p01);
        wire.line(p10, p01);
      }
    }
    wire.stroke(INK.white, ma * 0.4, 0.6);
    // Frozen cloud decks.
    for (let k = 0; k < 3; k++) {
      wire.begin();
      const y = 3 + k * 0.9;
      for (let i = 0; i < 9; i++) wire.line([-12, y, -i * 2], [12, y, -i * 2]);
      wire.stroke(INK.blue, ma * 0.18, 0.6, [6, 8]);
    }
    title(ctx, 'MANN’S PLANET', w / 2, ZONE.title(h), Math.min(34, w * 0.034), seg(morph, 0.6, 1) * a);
    micro(ctx, 'FROZEN CLOUDS · AMMONIA ATMOSPHERE', w / 2, ZONE.title(h) + 32, { align: 'center', alpha: seg(morph, 0.7, 1) * a * 0.75, color: INK.blue });
  }
}

export function drawMillerMann(f: SeqFrame) {
  const { ctx, w, h, p } = f;
  const oceanA = 1 - seg(p, 0.33, 0.37);
  if (oceanA > 0) {
    const crest = smooth(seg(p, 0.14, 0.34));
    const crestZ = lerp(-38, -6, easeInOut(seg(p, 0.14, 0.36)));
    drawOcean(f, oceanA, crest, crestZ);
    micro(ctx, p < 0.16 ? 'SHALLOW OCEAN · NO LANDMARKS' : 'THE MOUNTAINS ARE WAVES', w / 2, ZONE.label(h), { align: 'center', alpha: oceanA * 0.8 });
  }
  const dilA = win(p, 0.35, 0.59, 0.03);
  if (dilA > 0) drawDilation(f, dilA, seg(p, 0.36, 0.57));
  const retA = win(p, 0.57, 0.78, 0.03);
  if (retA > 0) drawReturn(f, retA);
  const iceA = seg(p, 0.76, 0.8);
  if (iceA > 0) drawIce(f, iceA, easeInOut(seg(p, 0.78, 0.92)));
}
