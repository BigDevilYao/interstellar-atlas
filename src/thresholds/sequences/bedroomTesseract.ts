import { easeIn, easeInOut, easeOut, lerp, mulberry, seg, win } from '../../lib/ease';
import { INK, glowDot, micro, title, type V3, ZONE } from '../../lib/wire3d';
import type { SeqFrame } from '../types';

/**
 * TH·B  Murph's Bedroom ↔ Tesseract
 * The room is not exited through a door: its bookshelf is extruded beyond the walls, the room is
 * repeated as a lattice of moments, and the camera passes through the shelf into the Tesseract.
 */

const ROOM = { x0: -2, x1: 2, y0: 0, y1: 2.7, z0: -2, z1: 2 };
const SHELF = { x0: -0.9, x1: 0.9, y0: 0.2, y1: 2.3, z: -2, d: 0.34 };
const SHELVES = [0.2, 0.62, 1.04, 1.46, 1.88, 2.3];
const CELL = { x: 4.4, y: 3.0, z: 4.4 };

interface Book {
  x0: number;
  x1: number;
  y0: number;
  h: number;
}

const BOOKS: Book[] = (() => {
  const r = mulberry(21);
  const out: Book[] = [];
  for (let s = 0; s < SHELVES.length - 1; s++) {
    let x = SHELF.x0 + 0.04;
    while (x < SHELF.x1 - 0.08) {
      if (r() < 0.12) {
        x += 0.08 + r() * 0.12; // gaps — the openings Cooper reaches through
        continue;
      }
      const wdt = 0.03 + r() * 0.045;
      out.push({ x0: x, x1: x + wdt, y0: SHELVES[s], h: 0.22 + r() * 0.14 });
      x += wdt + 0.004;
    }
  }
  return out;
})();

interface Copy {
  o: V3;
  d: number;
  gold: boolean;
  label?: string;
}

const COPIES: Copy[] = (() => {
  const out: Copy[] = [];
  for (let i = -4; i <= 4; i++)
    for (let j = -3; j <= 3; j++)
      for (let k = 0; k <= 7; k++) {
        if (i === 0 && j === 0 && k === 0) continue;
        const o: V3 = [i * CELL.x, j * CELL.y, -k * CELL.z];
        const d = Math.hypot(i * 1.0, j * 1.2, k * 0.8);
        out.push({ o, d, gold: (i + j * 2 + k) % 3 === 0 });
      }
  out.sort((a, b) => a.d - b.d);
  const labels = ['t − 1', 't + 1', 't − 2', 't + 3', 't − 5', 't + 8'];
  out.slice(0, 18).forEach((c, idx) => {
    if (idx % 3 === 0) c.label = labels[(idx / 3) % labels.length];
  });
  return out;
})();

const DUST = (() => {
  const r = mulberry(5);
  const bands = [-0.62, -0.5, -0.24, -0.16, 0.08, 0.34, 0.44, 0.62];
  return Array.from({ length: 90 }, () => ({
    x: bands[Math.floor(r() * bands.length)] + (r() - 0.5) * 0.03,
    z: 0.1 + r() * 1.3,
    phase: r(),
    speed: 0.25 + r() * 0.3,
  }));
})();

function drawShelfFrame(f: SeqFrame, o: V3, ext: number, booksDetail: number) {
  const { wire } = f;
  const X0 = SHELF.x0 - ext * 40;
  const X1 = SHELF.x1 + ext * 40;
  const zBack = SHELF.z - ext * 30;
  const z = SHELF.z + SHELF.d;
  // Shelf boards (front edges) — extrude laterally.
  for (const y of SHELVES) {
    wire.line([o[0] + X0, o[1] + y, o[2] + z], [o[0] + X1, o[1] + y, o[2] + z]);
    if (booksDetail > 0) wire.line([o[0] + SHELF.x0, o[1] + y, o[2] + SHELF.z], [o[0] + SHELF.x1, o[1] + y, o[2] + SHELF.z]);
  }
  // Uprights and their extrusion into depth.
  for (const x of [SHELF.x0, SHELF.x1]) {
    wire.line([o[0] + x, o[1] + SHELF.y0, o[2] + z], [o[0] + x, o[1] + SHELF.y1, o[2] + z]);
    wire.line([o[0] + x, o[1] + SHELF.y0, o[2] + z], [o[0] + x, o[1] + SHELF.y0, o[2] + zBack]);
    wire.line([o[0] + x, o[1] + SHELF.y1, o[2] + z], [o[0] + x, o[1] + SHELF.y1, o[2] + zBack]);
  }
}

function drawBooks(f: SeqFrame, o: V3, alpha: number, pullOut: number) {
  const { wire } = f;
  wire.begin();
  const z = SHELF.z + SHELF.d - 0.04;
  BOOKS.forEach((b, i) => {
    const dz = pullOut > 0 && i % 7 === 3 ? pullOut * 0.08 : 0;
    const p0: V3 = [o[0] + b.x0, o[1] + b.y0, o[2] + z + dz];
    wire.quad(p0, [b.x1 - b.x0, 0, 0], [0, b.h, 0]);
  });
  wire.stroke(INK.white, alpha * 0.55, 0.7);
}

function drawRoom(f: SeqFrame, alpha: number) {
  const { wire } = f;
  const { x0, x1, y0, y1, z0, z1 } = ROOM;
  // Walls and floor (front wall cut away — an architectural section).
  wire.begin();
  wire.poly([[x0, y0, z1], [x0, y0, z0], [x1, y0, z0], [x1, y0, z1]]);
  wire.poly([[x0, y1, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1]]);
  wire.line([x0, y0, z0], [x0, y1, z0]);
  wire.line([x1, y0, z0], [x1, y1, z0]);
  wire.line([x0, y0, z1], [x0, y1, z1]);
  wire.line([x1, y0, z1], [x1, y1, z1]);
  wire.stroke(INK.white, alpha * 0.9, 1);

  wire.begin();
  // Floorboards.
  for (let x = x0 + 0.25; x < x1; x += 0.25) wire.line([x, y0, z0], [x, y0, z1]);
  wire.stroke(INK.white, alpha * 0.12, 0.6);

  wire.begin();
  // Window on the right wall.
  const wz0 = -0.8,
    wz1 = 0.4,
    wy0 = 0.95,
    wy1 = 2.0;
  wire.poly([[x1, wy0, wz0], [x1, wy0, wz1], [x1, wy1, wz1], [x1, wy1, wz0]], true);
  wire.line([x1, wy0, (wz0 + wz1) / 2], [x1, wy1, (wz0 + wz1) / 2]);
  wire.line([x1, (wy0 + wy1) / 2, wz0], [x1, (wy0 + wy1) / 2, wz1]);
  // Door on the right wall.
  wire.poly([[x1, 0, 1.0], [x1, 2.1, 1.0], [x1, 2.1, 1.85], [x1, 0, 1.85]]);
  // Bed along the left wall.
  wire.box([x0, 0, -0.7], [x0 + 0.95, 0.45, 1.3]);
  wire.poly([[x0, 0.45, -0.7], [x0, 1.0, -0.7], [x0 + 0.95, 1.0, -0.7], [x0 + 0.95, 0.45, -0.7]]);
  wire.quad([x0 + 0.1, 0.45, -0.6], [0.75, 0, 0], [0, 0, 0.35]);
  wire.stroke(INK.white, alpha * 0.75, 0.9);
}

function drawLattice(f: SeqFrame, L: number, inside: number, camZ: number) {
  const { wire } = f;
  const n = Math.floor(COPIES.length * L);
  for (let idx = n - 1; idx >= 0; idx--) {
    const c = COPIES[idx];
    const dz = c.o[2] - camZ;
    const far = Math.hypot(c.o[0], c.o[1], dz);
    const a = Math.max(0, 1 - far / 34) * (0.5 + inside * 0.3);
    if (a < 0.02) continue;
    wire.begin();
    drawShelfFrame(f, c.o, 0, far < 10 ? 1 : 0);
    // Faint room edges for nearby copies: the room repeated in time.
    if (far < 14) {
      wire.box([c.o[0] + ROOM.x0, c.o[1] + ROOM.y0, c.o[2] + ROOM.z0], [c.o[0] + ROOM.x1, c.o[1] + ROOM.y1, c.o[2] + ROOM.z1]);
    }
    wire.stroke(c.gold ? INK.gold : INK.white, a * (c.gold ? 0.75 : 0.55), 0.7);
    if (far < 9) drawBooks(f, c.o, a * 0.8, 0);
    if (c.label && far < 16) {
      const s = wire.project([c.o[0] + SHELF.x1 + 0.1, c.o[1] + SHELF.y1, c.o[2] + SHELF.z + SHELF.d]);
      if (s) micro(f.ctx, c.label, s[0] + 6, s[1], { alpha: a * 0.9, color: c.gold ? INK.gold : INK.white, size: 10 });
    }
  }
}

function drawThreads(f: SeqFrame, a: number, t: number) {
  if (a <= 0) return;
  const { wire } = f;
  wire.begin();
  for (let i = -3; i <= 3; i++) {
    for (let k = 0; k <= 5; k++) {
      const x = i * CELL.x + SHELF.x1 + 0.4;
      const z = -k * CELL.z + SHELF.z + SHELF.d + 0.3;
      wire.line([x, -12, z], [x, 14, z]);
    }
  }
  wire.stroke(INK.gold, a * 0.22, 0.6);
  // A plucked thread vibrates.
  wire.begin();
  const x = SHELF.x1 + 0.4;
  const z = SHELF.z + SHELF.d + 0.3;
  let prev: V3 | null = null;
  for (let s = 0; s <= 40; s++) {
    const y = -6 + (s / 40) * 18;
    const amp = Math.sin((s / 40) * Math.PI) * 0.05 * Math.sin(t * 22);
    const pnt: V3 = [x + amp, y, z];
    if (prev) wire.line(prev, pnt);
    prev = pnt;
  }
  wire.stroke(INK.gold, a * 0.9, 1.2);
}

function leader(f: SeqFrame, anchor: V3, dx: number, dy: number, text: string, a: number, color = INK.gold) {
  const s = f.wire.project(anchor);
  if (!s || a <= 0) return;
  const { ctx } = f;
  ctx.globalAlpha = a;
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(s[0], s[1]);
  ctx.lineTo(s[0] + dx, s[1] + dy);
  ctx.lineTo(s[0] + dx + (dx > 0 ? 40 : -40), s[1] + dy);
  ctx.stroke();
  ctx.globalAlpha = 1;
  glowDot(ctx, s[0], s[1], 2.2, color, a);
  micro(ctx, text, s[0] + dx + (dx > 0 ? 46 : -46), s[1] + dy, { color, alpha: a, align: dx > 0 ? 'left' : 'right' });
}

export function drawBedroomTesseract(f: SeqFrame) {
  const { ctx, w, h, p, t, wire } = f;

  // Camera choreography: frontal axial view → dolly → through the shelf.
  const dolly = easeInOut(seg(p, 0.12, 0.36));
  const near = easeInOut(seg(p, 0.5, 0.74));
  const through = easeInOut(seg(p, 0.84, 1));
  let camZ = lerp(6.4, 1.2, dolly);
  camZ = lerp(camZ, -1.15, near);
  camZ = lerp(camZ, -10, through);
  const camY = lerp(1.45, 1.32, dolly);
  const roll = Math.sin(seg(p, 0.3, 1) * Math.PI) * 0.045;
  wire.camera({
    pos: [Math.sin(t * 0.3) * 0.04, camY, camZ],
    target: [0, 1.25, camZ - 8],
    fov: lerp(46, 64, seg(p, 0.45, 1)),
    roll,
  });

  const wallsA = (1 - 0.86 * seg(p, 0.33, 0.56)) * (1 - seg(p, 0.86, 0.95));
  const ext = easeInOut(seg(p, 0.33, 0.54));
  const L = easeOut(seg(p, 0.5, 0.74));
  const C = win(p, 0.68, 0.92, 0.04);
  const inside = seg(p, 0.84, 1);

  // 1 · Lattice behind everything (multiple time states).
  if (L > 0) drawLattice(f, L, inside, camZ);

  // 2 · Gravity threads.
  drawThreads(f, Math.max(C, inside * 0.8), t);

  // 3 · The room.
  if (wallsA > 0.01) drawRoom(f, wallsA);

  // 4 · Bookshelf — the membrane — extrudes beyond the room.
  wire.begin();
  drawShelfFrame(f, [0, 0, 0], ext, 1);
  wire.stroke(INK.white, 0.95, 1);
  drawBooks(f, [0, 0, 0], 1, C);

  // Shelf boundary highlight while approaching.
  const glowA = win(p, 0.14, 0.42, 0.06);
  if (glowA > 0) {
    wire.begin();
    wire.quad([SHELF.x0, SHELF.y0, SHELF.z + SHELF.d], [SHELF.x1 - SHELF.x0, 0, 0], [0, SHELF.y1 - SHELF.y0, 0]);
    wire.stroke(INK.gold, glowA * 0.8, 1.2);
  }

  // 5 · Information channels: books · dust · watch.
  if (C > 0) {
    // Falling book.
    const bt = seg(p, 0.7, 0.82);
    const by = lerp(1.46, 0.0, easeIn(bt));
    wire.begin();
    wire.quad([0.31, by, -1.5 + bt * 0.6], [0.05, 0, 0], [0, 0.3, 0]);
    wire.stroke(INK.gold, C, 1.2);
    // Dust bands on the floor (binary).
    DUST.forEach((d) => {
      const yy = 2.5 - ((t * d.speed + d.phase) % 1) * 2.5;
      const s = wire.project([d.x, yy, d.z]);
      if (s) glowDot(ctx, s[0], s[1], 1.1, INK.gold, C * 0.8);
    });
    wire.begin();
    [-0.62, -0.5, -0.24, -0.16, 0.08, 0.34, 0.44, 0.62].forEach((x, i) => {
      wire.line([x, 0.001, 0.1], [x, 0.001, 1.4]);
      if (i % 3 === 0) wire.line([x + 0.02, 0.001, 0.1], [x + 0.02, 0.001, 1.4]);
    });
    wire.stroke(INK.gold, C * 0.6, 1);
    // The watch on the shelf, its hand twitching in long and short intervals.
    const wc: V3 = [0.62, 1.12, SHELF.z + SHELF.d - 0.02];
    wire.begin();
    wire.circle(wc, [1, 0, 0], [0, 1, 0], 0.07, 40);
    const morse = [1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 1, 1, 1];
    const step = Math.floor(t * 3) % morse.length;
    const ang = -Math.PI / 2 + (step * Math.PI) / 15 + (morse[step] ? 0.25 : 0);
    wire.line(wc, [wc[0] + Math.cos(ang) * 0.06, wc[1] - Math.sin(ang) * 0.06, wc[2]]);
    wire.stroke(INK.gold, C, 1.2);

    leader(f, [0.33, 1.6, -1.6], -110, -60, 'BOOKS · GRAVITY', C);
    leader(f, [-0.24, 0.0, 0.8], -140, 30, 'DUST · BINARY', C);
    leader(f, wc, 120, -50, 'WATCH · QUANTUM DATA', C);
  }

  // 6 · Titles.
  const tA = win(p, 0.0, 0.16, 0.04);
  if (tA > 0) micro(ctx, 'MURPH’S BEDROOM  ·  SECTION, FRONT WALL REMOVED', w / 2, ZONE.label(h), { align: 'center', alpha: tA * 0.85 });
  if (inside > 0.35) {
    const a = seg(inside, 0.35, 0.8);
    title(ctx, 'TESSERACT', w / 2, h * 0.47, Math.min(52, w * 0.05), a);
    micro(ctx, 'TIME RENDERED AS SPACE', w / 2, h * 0.47 + Math.min(52, w * 0.05) * 0.95, { align: 'center', alpha: a * 0.8, color: INK.gold });
  }
}

// ───────────────────────── exports for scene environments ─────────────────────────

/** The bedroom as a standalone architectural model (used by the scene viewer). */
export function drawBedroomModel(f: SeqFrame, alpha = 1, timeStates = 0): void {
  if (timeStates > 0) {
    // Ghosted copies: the same room at other moments, offset in depth.
    for (const k of [1, 2]) {
      const o: V3 = [0, 0, -k * 0.35];
      f.wire.begin();
      drawShelfFrame(f, o, 0, 0);
      f.wire.box([ROOM.x0, ROOM.y0, ROOM.z0 + o[2]], [ROOM.x1, ROOM.y1, ROOM.z1 + o[2]]);
      f.wire.stroke(INK.gold, alpha * timeStates * (0.4 / k), 0.7);
    }
  }
  drawRoom(f, alpha);
  f.wire.begin();
  drawShelfFrame(f, [0, 0, 0], 0, 1);
  f.wire.stroke(INK.white, alpha, 1);
  drawBooks(f, [0, 0, 0], alpha, 0);
}

/** The Tesseract lattice as a standalone model. */
export function drawTesseractModel(f: SeqFrame, camZ: number): void {
  drawLattice(f, 1, 0.6, camZ);
  f.wire.begin();
  drawShelfFrame(f, [0, 0, 0], 0.35, 1);
  f.wire.stroke(INK.gold, 0.9, 1);
  drawBooks(f, [0, 0, 0], 1, 0);
  drawThreads(f, 0.8, f.t);
}
