import { easeIn, easeInOut, easeOut, lerp, seg, smooth, win } from '../../lib/ease';
import { INK, glowDot, micro, title, v3, type V3, ZONE } from '../../lib/wire3d';
import type { SeqFrame } from '../types';
import { drawBlackHole2D, drawEndurance, drawRanger, drawSphere, drawStars } from './shared';

/**
 * TH·D  Endurance → Saturn → Wormhole → Miller's Planet
 * Transit, landmark, fold, crossing, arrival, separation, descent.
 */

function drawSaturn(f: SeqFrame, a: number, t: number) {
  const { wire } = f;
  const c: V3 = [3.2, -0.2, -6];
  drawSphere(wire, c, 2.3, INK.white, a * 0.55, t * 0.02, 12, 9);
  wire.begin();
  const tilt = 0.42;
  const u: V3 = [Math.cos(0.18), Math.sin(0.18), 0];
  const vv: V3 = v3.norm([0, Math.sin(tilt), Math.cos(tilt)]);
  for (const r of [3.0, 3.3, 3.5, 3.9, 4.5, 4.7]) wire.circle(c, u, vv, r, 120);
  wire.stroke(INK.white, a * 0.5, 0.7);
}

function drawWormholeSphere(f: SeqFrame, x: number, y: number, r: number, a: number, t: number) {
  const { ctx } = f;
  ctx.save();
  // Gravitational lensing: rings compress toward the rim.
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#000';
  ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  for (let i = 1; i <= 14; i++) {
    const k = Math.pow(i / 14, 0.55);
    ctx.globalAlpha = a * (0.12 + 0.35 * (i / 14));
    ctx.strokeStyle = i % 4 === 0 ? INK.gold : INK.white;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.ellipse(x + Math.sin(t * 0.4 + i) * r * 0.02, y, r * k, r * k * (0.92 + 0.06 * Math.sin(t * 0.3 + i * 0.7)), 0.2, 0, Math.PI * 2);
    ctx.stroke();
  }
  // A distant galaxy seen through the sphere.
  ctx.globalAlpha = a * 0.8;
  ctx.strokeStyle = INK.gold;
  for (let arm = 0; arm < 2; arm++) {
    ctx.beginPath();
    for (let s = 0; s < 60; s++) {
      const th = s * 0.12 + arm * Math.PI + t * 0.1;
      const rr = (s / 60) * r * 0.35;
      const px = x - r * 0.25 + Math.cos(th) * rr;
      const py = y + r * 0.1 + Math.sin(th) * rr * 0.45;
      if (s === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = a;
  ctx.strokeStyle = INK.white;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  const g = ctx.createRadialGradient(x, y, r * 0.95, x, y, r * 1.5);
  g.addColorStop(0, 'rgba(240,201,143,0.25)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.5, 0, Math.PI * 2);
  ctx.arc(x, y, r, 0, Math.PI * 2, true);
  ctx.fill();
  ctx.restore();
}

/** The classic folded-sheet diagram: two distant points brought together. */
function drawFold(f: SeqFrame, a: number, fold: number, tube: number) {
  const { wire, ctx } = f;
  wire.camera({ pos: [0, 1.6, 6.2], target: [0, -0.9, 0], fov: 42 });
  const phiMax = Math.max(0.0001, fold * Math.PI * 0.94);
  const rho = 2.6 / phiMax;
  const P = (u: number, vz: number): V3 => {
    const phi = u * phiMax;
    return [rho * Math.sin(phi), -rho * (1 - Math.cos(phi)), vz];
  };
  wire.begin();
  const NU = 26;
  const NV = 8;
  for (let i = 0; i <= NU; i++) {
    const u = -1 + (2 * i) / NU;
    const pts: V3[] = [];
    for (let j = 0; j <= NV; j++) pts.push(P(u, -1.2 + (2.4 * j) / NV));
    wire.poly(pts);
  }
  for (let j = 0; j <= NV; j++) {
    const vz = -1.2 + (2.4 * j) / NV;
    const pts: V3[] = [];
    for (let i = 0; i <= 60; i++) pts.push(P(-1 + (2 * i) / 60, vz));
    wire.poly(pts);
  }
  wire.stroke(INK.white, a * 0.35, 0.7);
  const A = P(-0.82, 0);
  const B = P(0.82, 0);
  const sa = wire.project(A);
  const sb = wire.project(B);
  if (sa) {
    glowDot(ctx, sa[0], sa[1], 3, INK.gold, a);
    micro(ctx, 'SATURN', sa[0] - 12, sa[1] - 16, { alpha: a, align: 'right' });
  }
  if (sb) {
    glowDot(ctx, sb[0], sb[1], 3, INK.gold, a);
    micro(ctx, 'GARGANTUA SYSTEM', sb[0] + 12, sb[1] - 16, { alpha: a });
  }
  if (tube > 0 && sa && sb) {
    // Throat between the two points.
    wire.begin();
    const n = 8;
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      const c = v3.lerp(A, B, k);
      const pinch = 0.18 + 0.4 * Math.pow(Math.abs(k - 0.5) * 2, 2);
      const r = pinch * smooth(tube);
      const axis = v3.norm(v3.sub(B, A));
      const u = v3.norm(v3.cross(axis, [0, 0, 1]));
      wire.circle(c, u, [0, 0, 1], r, 32);
    }
    wire.stroke(INK.gold, a * 0.8 * tube, 0.9);
    micro(ctx, 'WORMHOLE · THE DISTANCE IS FOLDED AWAY', f.w / 2, ZONE.low(f.h), { align: 'center', alpha: a * tube });
  }
}

function drawTunnel(f: SeqFrame, a: number, t: number, prog: number) {
  const { wire, ctx, w, h } = f;
  wire.camera({ pos: [Math.sin(t * 3) * 0.08, Math.cos(t * 2.3) * 0.06, 0], target: [0, 0, -10], fov: 70, roll: Math.sin(t * 0.9) * 0.3 });
  const speed = 18;
  for (let i = 0; i < 26; i++) {
    const z = -((i * 1.6 + t * speed) % 41.6) - 0.5;
    const r = 2.2 + Math.sin(i * 1.7 + t) * 0.25;
    const wob = Math.sin(z * 0.3 + t * 2) * 0.35;
    const alpha = a * Math.min(1, -z / 6) * Math.max(0, 1 + z / 41);
    wire.begin();
    wire.circle([wob, Math.cos(z * 0.2) * 0.25, z], [1, 0, 0], [0, 1, 0], r, 56);
    wire.stroke(i % 5 === 0 ? INK.gold : INK.white, alpha * 0.7, i % 5 === 0 ? 1.4 : 0.8);
  }
  drawStars(ctx, w, h, t, a * 0.7, { seed: 99, streak: 0.6 + prog * 1.2 });
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.min(w, h) * 0.18);
  g.addColorStop(0, `rgba(255,236,205,${0.5 * a * (0.5 + 0.5 * Math.sin(t * 6))})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

export function drawEnduranceMiller(f: SeqFrame) {
  const { ctx, w, h, p, t, wire } = f;

  // 1 · Transit + Saturn
  const transitA = 1 - seg(p, 0.27, 0.32);
  if (transitA > 0) {
    drawStars(ctx, w, h, t, transitA * 0.8, { seed: 4 });
    const camX = lerp(-1.2, 0.4, easeInOut(seg(p, 0, 0.28)));
    wire.camera({ pos: [camX, 0.4, 6], target: [camX + 0.4, 0, 0], fov: 46 });
    const sat = easeOut(seg(p, 0.1, 0.22));
    if (sat > 0) drawSaturn(f, sat * transitA, t);
    const ex = lerp(-2.4, 1.0, easeInOut(seg(p, 0, 0.28)));
    const scale = lerp(0.55, 0.12, easeInOut(seg(p, 0.08, 0.24)));
    drawEndurance(wire, [ex, 0.15, 0], scale, t * 0.4, { tilt: 1.1, alpha: transitA });
    micro(ctx, p < 0.14 ? 'TRANSIT · ≈ 2 YEARS' : 'SATURN · SCALE REFERENCE', w / 2, ZONE.low(h), { align: 'center', alpha: transitA * 0.8 });
  }

  // 2 · The spherical door
  const sphA = win(p, 0.27, 0.42, 0.04);
  if (sphA > 0) {
    drawStars(ctx, w, h, t, sphA * 0.6, { seed: 4 });
    const grow = easeInOut(seg(p, 0.27, 0.4));
    const r = lerp(Math.min(w, h) * 0.08, Math.min(w, h) * 0.3, grow);
    drawWormholeSphere(f, w * 0.55, h * 0.48, r, sphA, t);
    micro(ctx, 'A SPHERE, NOT A HOLE · REFLECTING ANOTHER GALAXY', w / 2, ZONE.low(h), { align: 'center', alpha: sphA * 0.8 });
  }

  // 3 · Folding the sheet
  const foldA = win(p, 0.4, 0.55, 0.03);
  if (foldA > 0) {
    drawFold(f, foldA, easeInOut(seg(p, 0.41, 0.5)), seg(p, 0.48, 0.53));
  }

  // 4 · Crossing
  const tunA = win(p, 0.54, 0.71, 0.025);
  if (tunA > 0) {
    drawTunnel(f, tunA, t, seg(p, 0.54, 0.7));
  }

  // 5 · Another galaxy: Gargantua (distinct from the wormhole)
  const galA = win(p, 0.7, 0.92, 0.03);
  if (galA > 0) {
    drawStars(ctx, w, h, t, galA * 0.7, { seed: 61 });
    const bh = easeOut(seg(p, 0.7, 0.8));
    const bx = lerp(w * 0.72, w * 0.78, seg(p, 0.7, 0.92));
    drawBlackHole2D(ctx, bx, h * 0.34, Math.min(w, h) * lerp(0.03, 0.06, bh), galA, t);
    micro(ctx, 'GARGANTUA', bx, h * 0.34 + Math.min(w, h) * 0.14, { align: 'center', alpha: galA * 0.7 });

    // Ranger separation from the ring.
    wire.camera({ pos: [0, 0.6, 7], target: [0, 0, 0], fov: 44 });
    const sep = easeInOut(seg(p, 0.79, 0.9));
    drawEndurance(wire, [-1.0, 0.2, 0], 1.0, t * 0.3, { tilt: 1.05, alpha: galA * (1 - seg(p, 0.88, 0.92)) });
    const rp: V3 = [lerp(-1.0, 2.2, sep), lerp(0.2, -1.4, easeIn(sep)), lerp(0, 1.2, sep)];
    drawRanger(wire, rp, 0.22, -0.6 - sep * 0.4, { alpha: galA * win(p, 0.79, 0.92, 0.02), roll: sep * 0.7, color: INK.gold });
    if (p < 0.8) micro(ctx, 'ANOTHER GALAXY', w / 2, ZONE.low(h), { align: 'center', alpha: galA * 0.8 });
    else micro(ctx, 'RANGER SEPARATES FROM ENDURANCE', w / 2, ZONE.low(h), { align: 'center', alpha: galA * 0.8 });
  }

  // 6 · Descent to the ocean
  const desA = seg(p, 0.89, 0.93);
  if (desA > 0) {
    const d = easeInOut(seg(p, 0.9, 1));
    const horizon = lerp(h * 0.85, h * 0.52, d);
    ctx.save();
    ctx.strokeStyle = INK.white;
    for (let i = 0; i < 16; i++) {
      const k = i / 16;
      const y = horizon + Math.pow(k, 1.8) * (h - horizon);
      ctx.globalAlpha = desA * (0.2 + k * 0.5);
      ctx.lineWidth = 0.6 + k * 0.6;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 12) {
        const yy = y + Math.sin(x * (0.02 - k * 0.012) + t * (1 + k) + i) * (1 + k * 4);
        if (x === 0) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    ctx.restore();
    drawBlackHole2D(ctx, w * 0.78, horizon - h * 0.2, Math.min(w, h) * 0.06, desA * 0.9, t);
    wire.camera({ pos: [0, 0, 6], target: [0, 0, 0], fov: 44 });
    drawRanger(wire, [lerp(-0.5, 0.2, d), lerp(1.6, -0.2, d), 0], lerp(0.15, 0.32, d), 0.2, { alpha: desA, color: INK.white });
    if (d > 0.4) title(ctx, 'MILLER’S PLANET', w / 2, ZONE.title(h), Math.min(34, w * 0.034), seg(d, 0.4, 0.9));
  }
}
