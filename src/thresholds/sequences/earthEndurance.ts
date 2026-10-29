import { easeInOut, easeOut, lerp, seg, smooth, win } from '../../lib/ease';
import { INK, glowDot, micro, title, ZONE } from '../../lib/wire3d';
import type { SeqFrame } from '../types';
import { drawEndurance, drawStars } from './shared';

/**
 * TH·C  NASA / Earth → Endurance
 * A scale transformation: ground line → horizon → curve → orbit → ring.
 */

function scaleLabel(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  if (m < 1e6) return `${Math.round(m / 1000).toLocaleString()} km`;
  return `${Math.round(m / 1000).toLocaleString()} km`;
}

export function drawEarthEndurance(f: SeqFrame) {
  const { ctx, w, h, p, t, wire } = f;
  const ascent = easeInOut(seg(p, 0.16, 0.46));
  const bend = easeInOut(seg(p, 0.4, 0.64));
  const orbit = easeInOut(seg(p, 0.6, 0.8));
  const ring = easeOut(seg(p, 0.76, 1));

  // Stars appear as the atmosphere thins.
  drawStars(ctx, w, h, t, smooth(seg(p, 0.3, 0.6)) * 0.8, { seed: 13 });

  // Altitude (log scale) and scale bar.
  const altitude = Math.pow(10, lerp(1, 6.6, smooth(seg(p, 0.12, 0.7))));
  const barA = 1 - seg(p, 0.74, 0.82);
  if (barA > 0) {
    const bx = Math.max(36, w * 0.06);
    const by0 = h * 0.3;
    const by1 = h * 0.74;
    ctx.save();
    ctx.globalAlpha = barA * 0.8;
    ctx.strokeStyle = INK.white;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx, by0);
    ctx.lineTo(bx, by1);
    for (let i = 0; i <= 10; i++) {
      const y = lerp(by1, by0, i / 10);
      ctx.moveTo(bx, y);
      ctx.lineTo(bx + (i % 5 === 0 ? 10 : 5), y);
    }
    ctx.stroke();
    ctx.restore();
    micro(ctx, 'ALTITUDE', bx, by0 - 18, { alpha: barA * 0.7 });
    micro(ctx, scaleLabel(altitude), bx + 16, lerp(by1, by0, 0.5), { alpha: barA, color: INK.gold, size: 12 });
    micro(ctx, scaleLabel(altitude * 0.1), bx + 16, by1, { alpha: barA * 0.5 });
    micro(ctx, scaleLabel(altitude * 10), bx + 16, by0, { alpha: barA * 0.5 });
  }

  // Ground → horizon → planet.
  const groundA = 1 - seg(p, 0.7, 0.8) * 0.4;
  {
    const S = Math.min(w, h);
    // Exponential interpolation: the curvature grows steadily as the scale changes.
    const R = S * Math.exp(lerp(Math.log(40), Math.log(0.24), smooth(bend)));
    const top = lerp(lerp(h * 0.74, h * 0.9, ascent), h * 0.62, bend);
    const cx = lerp(w / 2, w * 0.3, orbit);
    const cyTop = lerp(top, h * 0.56, orbit);
    const cy = cyTop + R;
    // Atmospheric haze above the horizon — thins as the camera climbs and the horizon curves.
    const hazeA = (0.35 + 0.65 * ascent) * (1 - smooth(seg(p, 0.5, 0.66)));
    if (hazeA > 0.01) {
      const hg = ctx.createRadialGradient(cx, cy, R, cx, cy, R + Math.min(h * 0.32, 260));
      hg.addColorStop(0, `rgba(169,195,230,${0.28 * hazeA})`);
      hg.addColorStop(0.35, `rgba(169,195,230,${0.1 * hazeA})`);
      hg.addColorStop(1, 'rgba(169,195,230,0)');
      ctx.fillStyle = hg;
      ctx.fillRect(0, Math.max(0, cyTop - Math.min(h * 0.32, 260)), w, Math.min(h * 0.32, 260) + 4);
    }
    ctx.save();
    ctx.globalAlpha = groundA;
    ctx.strokeStyle = INK.white;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();
    // Atmosphere strata.
    for (let i = 1; i <= 4; i++) {
      ctx.globalAlpha = groundA * (0.3 - i * 0.05) * (0.3 + bend);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(cx, cy, R * (1 + i * 0.012) + i * 3, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Planet graticule when small.
    if (bend > 0.6) {
      const ga = seg(bend, 0.6, 1) * 0.25 * groundA;
      ctx.globalAlpha = ga;
      for (let i = 1; i < 6; i++) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, R * Math.abs(Math.cos((i / 6) * Math.PI)), R, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      for (let j = 1; j < 5; j++) {
        const yy = cy - R + (j / 5) * 2 * R;
        const half = Math.sqrt(Math.max(0, R * R - (yy - cy) * (yy - cy)));
        ctx.beginPath();
        ctx.moveTo(cx - half, yy);
        ctx.lineTo(cx + half, yy);
        ctx.stroke();
      }
    }
    ctx.restore();

    // Launch tower and vehicle (elevation) while near the ground.
    const nearA = 1 - seg(p, 0.3, 0.42);
    if (nearA > 0) {
      const gy = top;
      const k = S / 700;
      const rise = ascent * h * 1.2;
      ctx.save();
      ctx.globalAlpha = nearA;
      ctx.strokeStyle = INK.white;
      ctx.lineWidth = 1;
      // Tower lattice.
      const tx = w / 2 - 40 * k;
      ctx.beginPath();
      ctx.moveTo(tx, gy);
      ctx.lineTo(tx, gy - 260 * k);
      ctx.moveTo(tx - 22 * k, gy);
      ctx.lineTo(tx - 22 * k, gy - 260 * k);
      for (let y = 0; y < 260; y += 20) {
        ctx.moveTo(tx - 22 * k, gy - y * k);
        ctx.lineTo(tx, gy - (y + 20) * k);
      }
      ctx.stroke();
      // Vehicle.
      const vx = w / 2;
      const vy = gy - rise;
      ctx.beginPath();
      ctx.moveTo(vx, vy - 250 * k);
      ctx.lineTo(vx + 12 * k, vy - 220 * k);
      ctx.lineTo(vx + 12 * k, vy - 10 * k);
      ctx.lineTo(vx - 12 * k, vy - 10 * k);
      ctx.lineTo(vx - 12 * k, vy - 220 * k);
      ctx.closePath();
      ctx.stroke();
      // Exhaust plume.
      if (ascent > 0) {
        const g = ctx.createLinearGradient(vx, vy, vx, vy + 220 * k);
        g.addColorStop(0, 'rgba(255,230,190,0.9)');
        g.addColorStop(1, 'rgba(240,201,143,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(vx - 10 * k, vy - 10 * k);
        ctx.lineTo(vx + 10 * k, vy - 10 * k);
        ctx.lineTo(vx + (24 + Math.sin(t * 40) * 3) * k, vy + 220 * k);
        ctx.lineTo(vx - (24 + Math.cos(t * 37) * 3) * k, vy + 220 * k);
        ctx.fill();
      }
      ctx.restore();
      micro(ctx, 'ELEVATION · LAUNCH STRUCTURE', w / 2, ZONE.label(h), { align: 'center', alpha: nearA * win(p, 0, 0.3) * 0.8 });
    }

    // Orbit and ship.
    if (orbit > 0) {
      const oR = R * 1.55;
      ctx.save();
      ctx.globalAlpha = orbit * 0.6;
      ctx.strokeStyle = INK.white;
      ctx.setLineDash([3, 5]);
      ctx.beginPath();
      ctx.ellipse(cx, cy, oR, oR * 0.32, -0.18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      const a = -Math.PI * 0.15 + t * 0.35;
      const sx = cx + Math.cos(a) * oR * Math.cos(-0.18) - Math.sin(a) * oR * 0.32 * Math.sin(-0.18);
      const sy = cy + Math.cos(a) * oR * Math.sin(-0.18) + Math.sin(a) * oR * 0.32 * Math.cos(-0.18);
      glowDot(ctx, sx, sy, 2.4, INK.gold, orbit * (1 - ring));
      micro(ctx, 'LOW EARTH ORBIT', cx + oR * 0.7, cy - oR * 0.5, { alpha: orbit * (1 - ring) * 0.8 });
    }
  }

  // The ring reveal (3D).
  if (ring > 0) {
    const roll = lerp(0.6, 0, easeInOut(seg(p, 0.78, 1)));
    wire.camera({ pos: [0, lerp(1.2, 0.6, ring), lerp(9, 5.2, ring)], target: [0, 0, 0], fov: 45, roll });
    drawEndurance(wire, [1.1, 0, 0], 1.5, t * 0.35, { tilt: lerp(1.25, 0.95, ring), alpha: ring, yaw: -0.35 });
    if (ring > 0.5) {
      title(ctx, 'ENDURANCE', w * 0.5, ZONE.title(h), Math.min(40, w * 0.04), seg(ring, 0.5, 1));
      micro(ctx, '12 MODULES · ROTATING · ARTIFICIAL GRAVITY', w * 0.5, ZONE.title(h) + 32, { align: 'center', alpha: seg(ring, 0.6, 1) * 0.75, color: INK.gold });
    }
  }
}
