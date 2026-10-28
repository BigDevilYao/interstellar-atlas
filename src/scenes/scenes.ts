import type { NodeId } from '../data/types';
import { INK, v3, type V3 } from '../lib/wire3d';
import { drawBedroomModel, drawTesseractModel } from '../thresholds/sequences/bedroomTesseract';
import { drawEndurance, drawRanger, drawSphere } from '../thresholds/sequences/shared';
import type { SeqFrame } from '../thresholds/types';

/**
 * SCENE ENVIRONMENTS
 * Modular, original stylised geometry for every location (no external models).
 * Each scene defines an orbit camera, a draw routine and architectural annotations.
 */

export interface SceneNote {
  at: V3;
  text: string;
}

export interface SceneDef {
  id: NodeId;
  view: string; // camera language used
  target: V3;
  dist: number;
  yaw: number;
  pitch: number;
  fov: number;
  minDist: number;
  maxDist: number;
  draw: (f: SeqFrame, opts: { alt: boolean }) => void;
  notes: SceneNote[];
  /** Optional alternative state toggle label (e.g. time states). */
  altLabel?: string;
}

function ground(f: SeqFrame, size: number, step: number, y = 0, alpha = 0.12) {
  const { wire } = f;
  wire.begin();
  for (let x = -size; x <= size; x += step) wire.line([x, y, -size], [x, y, size]);
  for (let z = -size; z <= size; z += step) wire.line([-size, y, z], [size, y, z]);
  wire.stroke(INK.white, alpha, 0.6);
}

function cylinder(f: SeqFrame, c: V3, r: number, hgt: number, seg = 32) {
  const { wire } = f;
  wire.circle(c, [1, 0, 0], [0, 0, 1], r, seg);
  wire.circle(v3.add(c, [0, hgt, 0]), [1, 0, 0], [0, 0, 1], r, seg);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    wire.line(v3.add(c, [Math.cos(a) * r, 0, Math.sin(a) * r]), v3.add(c, [Math.cos(a) * r, hgt, Math.sin(a) * r]));
  }
}

function house(f: SeqFrame, o: V3, wdt: number, dep: number, hgt: number, roof: number) {
  const { wire } = f;
  const [x, y, z] = o;
  wire.box([x, y, z], [x + wdt, y + hgt, z + dep]);
  const r0: V3 = [x, y + hgt + roof, z + dep / 2];
  const r1: V3 = [x + wdt, y + hgt + roof, z + dep / 2];
  wire.line(r0, r1);
  wire.line([x, y + hgt, z], r0);
  wire.line([x, y + hgt, z + dep], r0);
  wire.line([x + wdt, y + hgt, z], r1);
  wire.line([x + wdt, y + hgt, z + dep], r1);
}

const waveH = (x: number, z: number, t: number) =>
  Math.sin(x * 0.6 + t) * 0.05 +
  Math.sin(z * 0.8 - t * 0.7) * 0.04 +
  7.5 * Math.exp(-Math.pow(z + 12 - Math.sin(t * 0.15) * 2, 2) * 0.18) * (0.8 + 0.2 * Math.sin(x * 0.2));

export const SCENES: Record<NodeId, SceneDef> = {
  bedroom: {
    id: 'bedroom',
    view: 'Axial section · front wall removed',
    target: [0, 1.2, 0],
    dist: 7.5,
    yaw: 0.35,
    pitch: 0.18,
    fov: 46,
    minDist: 3,
    maxDist: 14,
    altLabel: 'Time states',
    draw: (f, { alt }) => {
      drawBedroomModel(f, 1, alt ? 1 : 0);
    },
    notes: [
      { at: [0, 2.3, -1.66], text: 'Bookshelf · the threshold wall' },
      { at: [2, 1.5, -0.2], text: 'Window · dust storm enters' },
      { at: [-1.5, 0.5, 0.3], text: 'Bed' },
      { at: [0.3, 0.02, 1.2], text: 'Floor · dust settles in bands' },
    ],
  },
  farm: {
    id: 'farm',
    view: 'Long shot · horizon',
    target: [0, 1, 0],
    dist: 18,
    yaw: -0.5,
    pitch: 0.22,
    fov: 44,
    minDist: 8,
    maxDist: 40,
    draw: (f) => {
      const { wire, t } = f;
      ground(f, 24, 1, 0, 0.08);
      wire.begin();
      house(f, [-3, 0, -2], 4, 3, 2.6, 1.3);
      // porch
      wire.box([-3, 0, 1], [1, 0.25, 2]);
      for (let x = -3; x <= 1; x += 1) wire.line([x, 0.25, 2], [x, 2.6, 2]);
      wire.line([-3, 2.6, 2], [1, 2.6, 2]);
      cylinder(f, [4, 0, -3], 1, 6);
      // pickup truck
      wire.box([3, 0.4, 3], [6.2, 1.1, 4.4]);
      wire.box([3, 1.1, 3], [4.4, 1.9, 4.4]);
      wire.stroke(INK.white, 0.9, 0.9);
      // crop rows
      wire.begin();
      for (let z = -22; z < 22; z += 0.7) wire.line([8, 0, z], [24, 0, z + Math.sin(z) * 0.2]);
      for (let x = -24; x < -6; x += 0.7) wire.line([x, 0, 6], [x, 0, 24]);
      wire.stroke(INK.white, 0.22, 0.6);
      // dust drifting across
      const ctx = f.ctx;
      for (let i = 0; i < 160; i++) {
        const x = ((i * 7.3 + t * 2) % 48) - 24;
        const y = (i % 9) * 0.5 + Math.sin(t + i) * 0.2;
        const z = ((i * 3.1) % 40) - 20;
        const s = wire.project([x, y, z]);
        if (s) {
          ctx.globalAlpha = 0.35;
          ctx.fillStyle = INK.gold;
          ctx.fillRect(s[0], s[1], 1.2, 1.2);
        }
      }
      ctx.globalAlpha = 1;
    },
    notes: [
      { at: [-1, 3.9, -0.5], text: 'Farmhouse' },
      { at: [4, 6.2, -3], text: 'Silo' },
      { at: [4.6, 2, 3.7], text: 'Pickup truck · to the coordinates' },
      { at: [16, 0, 10], text: 'Corn · the last viable crop' },
    ],
  },
  nasa: {
    id: 'nasa',
    view: 'One-point perspective · corridor',
    target: [0, 1.5, -8],
    dist: 12,
    yaw: 0,
    pitch: 0.05,
    fov: 52,
    minDist: 4,
    maxDist: 24,
    draw: (f) => {
      const { wire } = f;
      wire.begin();
      for (let z = 4; z > -24; z -= 2) {
        wire.poly([[-2, 0, z], [-2, 3.2, z], [2, 3.2, z], [2, 0, z]]);
      }
      wire.line([-2, 0, 4], [-2, 0, -24]);
      wire.line([2, 0, 4], [2, 0, -24]);
      wire.line([-2, 3.2, 4], [-2, 3.2, -24]);
      wire.line([2, 3.2, 4], [2, 3.2, -24]);
      wire.stroke(INK.white, 0.6, 0.8);
      // Blast door at the entrance.
      wire.begin();
      wire.circle([0, 1.6, 4], [1, 0, 0], [0, 1, 0], 1.5, 64);
      wire.circle([0, 1.6, 4], [1, 0, 0], [0, 1, 0], 1.25, 64);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        wire.line([Math.cos(a) * 0.3, 1.6 + Math.sin(a) * 0.3, 4], [Math.cos(a) * 1.25, 1.6 + Math.sin(a) * 1.25, 4]);
      }
      wire.stroke(INK.gold, 0.8, 1);
      // Silo hall with vehicle beyond.
      wire.begin();
      wire.box([-8, -6, -40], [8, 14, -24]);
      wire.poly([[0, 10, -32], [0.8, 8, -32], [0.8, -4, -32], [-0.8, -4, -32], [-0.8, 8, -32]], true);
      wire.stroke(INK.white, 0.45, 0.8);
      // floor lights
      for (let z = 3; z > -24; z -= 2) {
        const s = wire.project([0, 0, z]);
        if (s) {
          f.ctx.globalAlpha = 0.6;
          f.ctx.fillStyle = INK.gold;
          f.ctx.fillRect(s[0] - 1, s[1] - 1, 2, 2);
        }
      }
      f.ctx.globalAlpha = 1;
    },
    notes: [
      { at: [1.5, 1.6, 4], text: 'Blast door · concealment' },
      { at: [2, 3.2, -10], text: 'Corridor · repetition and depth' },
      { at: [0.8, 9, -32], text: 'Launch vehicle in silo' },
    ],
  },
  endurance: {
    id: 'endurance',
    view: 'Orbit · rotating ring',
    target: [0, 0, 0],
    dist: 8,
    yaw: 0.3,
    pitch: 0.55,
    fov: 44,
    minDist: 3.5,
    maxDist: 18,
    draw: (f) => {
      drawEndurance(f.wire, [0, 0, 0], 2.4, f.t * 0.25, { tilt: Math.PI / 2 });
      drawRanger(f.wire, [0, 0.9, 0], 0.35, f.t * 0.25 + Math.PI / 2, { alpha: 0.8, color: INK.gold });
    },
    notes: [
      { at: [2.4, 0, 0], text: 'Module · one of twelve' },
      { at: [0, 0.4, 0], text: 'Central docking hub' },
      { at: [-1.2, 0, 1.6], text: 'Rotation → artificial gravity' },
    ],
  },
  saturn: {
    id: 'saturn',
    view: 'Long shot · scale contrast',
    target: [0, 0, 0],
    dist: 16,
    yaw: 0.6,
    pitch: 0.25,
    fov: 40,
    minDist: 8,
    maxDist: 30,
    draw: (f) => {
      const { wire, t } = f;
      drawSphere(wire, [0, 0, 0], 4, INK.white, 0.5, t * 0.02, 14, 10);
      wire.begin();
      const u: V3 = [1, 0, 0];
      const vv: V3 = v3.norm([0, Math.sin(0.4), Math.cos(0.4)]);
      for (const r of [5.2, 5.6, 5.9, 6.6, 7.6, 7.9]) wire.circle([0, 0, 0], u, vv, r, 140);
      wire.stroke(INK.white, 0.5, 0.7);
      drawEndurance(wire, [6, 2.5, 4], 0.15, t * 0.4, { tilt: 1.1 });
      // the wormhole nearby
      wire.begin();
      wire.circle([-7, 2, 3], [1, 0, 0], [0, 1, 0], 0.6, 40);
      wire.stroke(INK.gold, 0.8, 1);
    },
    notes: [
      { at: [6, 2.7, 4], text: 'Endurance · a speck' },
      { at: [-7, 2.6, 3], text: 'Wormhole' },
      { at: [0, 4, 0], text: 'Saturn' },
    ],
  },
  wormhole: {
    id: 'wormhole',
    view: 'Frontal · spherical threshold',
    target: [0, 0, 0],
    dist: 9,
    yaw: 0.2,
    pitch: 0.1,
    fov: 44,
    minDist: 4,
    maxDist: 20,
    draw: (f) => {
      const { wire, t } = f;
      drawSphere(wire, [0, 0, 0], 2.2, INK.white, 0.25, t * 0.05, 16, 12);
      wire.begin();
      for (let i = 1; i <= 10; i++) {
        const k = Math.pow(i / 10, 0.6);
        wire.circle([0, 0, 0], [1, 0, 0], [0, 1, 0], 2.2 * k, 72);
      }
      wire.stroke(INK.gold, 0.3, 0.7);
      // embedding funnel below
      wire.begin();
      for (let i = 0; i <= 8; i++) {
        const y = -4 + i * 0.25;
        const r = 0.4 + Math.pow(Math.abs(i - 8) / 8, 2) * 3;
        wire.circle([0, y, 0], [1, 0, 0], [0, 0, 1], r, 48);
        wire.circle([0, -8 - y + -0.0, 0], [1, 0, 0], [0, 0, 1], r, 48);
      }
      wire.stroke(INK.white, 0.3, 0.6);
    },
    notes: [
      { at: [2.2, 0, 0], text: 'Spherical aperture — seen from every side' },
      { at: [3, -4, 0], text: 'Embedding diagram · throat' },
    ],
  },
  miller: {
    id: 'miller',
    view: 'Low horizon · scale reveal',
    target: [0, 2.5, -6],
    dist: 14,
    yaw: 0.45,
    pitch: 0.1,
    fov: 52,
    minDist: 5,
    maxDist: 26,
    draw: (f) => {
      const { wire, t } = f;
      wire.begin();
      for (let zi = 0; zi <= 24; zi++) {
        const z = 6 - zi * 1.2;
        const pts: V3[] = [];
        for (let xi = 0; xi <= 40; xi++) {
          const x = -20 + xi;
          pts.push([x, waveH(x, z, t), z]);
        }
        wire.poly(pts);
      }
      wire.stroke(INK.white, 0.45, 0.7);
      // Cross-sections through the wave wall.
      wire.begin();
      for (let xi = 0; xi <= 40; xi += 2) {
        const x = -20 + xi;
        const pts: V3[] = [];
        for (let zi = 0; zi <= 48; zi++) {
          const z = 6 - zi * 0.6;
          pts.push([x, waveH(x, z, t), z]);
        }
        wire.poly(pts);
      }
      wire.stroke(INK.white, 0.22, 0.6);
      drawRanger(wire, [1, 0.4, 1], 0.5, 2.6, { color: INK.gold });
    },
    notes: [
      { at: [0, 7.6, -12], text: 'A 1.2 km wave' },
      { at: [1, 1, 1], text: 'Ranger · knee-deep water' },
      { at: [-10, 0.2, 2], text: '1 h here ≈ 7 years elsewhere' },
    ],
  },
  mann: {
    id: 'mann',
    view: 'High angle · isolation',
    target: [0, 1, -2],
    dist: 14,
    yaw: -0.3,
    pitch: 0.35,
    fov: 48,
    minDist: 6,
    maxDist: 30,
    draw: (f) => {
      const { wire } = f;
      const H = (x: number, z: number) => Math.abs(Math.sin(x * 0.7) * Math.cos(z * 0.5)) * 1.6 + Math.abs(Math.sin(x * 0.23 + z * 0.4)) * 0.9;
      wire.begin();
      for (let zi = 0; zi < 16; zi++)
        for (let xi = 0; xi < 22; xi++) {
          const x = -11 + xi;
          const z = 5 - zi * 1.2;
          wire.line([x, H(x, z), z], [x + 1, H(x + 1, z), z]);
          wire.line([x, H(x, z), z], [x, H(x, z - 1.2), z - 1.2]);
          wire.line([x + 1, H(x + 1, z), z], [x, H(x, z - 1.2), z - 1.2]);
        }
      wire.stroke(INK.white, 0.35, 0.6);
      for (let k = 0; k < 3; k++) {
        wire.begin();
        for (let i = 0; i < 10; i++) wire.line([-12, 4 + k, 4 - i * 2], [12, 4 + k, 4 - i * 2]);
        wire.stroke(INK.blue, 0.2, 0.6, [6, 8]);
      }
      wire.begin();
      wire.box([1, 1.5, -1], [2.2, 2.3, 0.2]);
      wire.stroke(INK.gold, 0.9, 1);
    },
    notes: [
      { at: [1.6, 2.4, -0.4], text: 'Mann’s shelter' },
      { at: [-8, 5, 0], text: 'Frozen cloud decks' },
      { at: [5, 2, 2], text: 'Ice ridges · unstable ground' },
    ],
  },
  gargantua: {
    id: 'gargantua',
    view: 'Orbital · disk plane',
    target: [0, 0, 0],
    dist: 14,
    yaw: 0.1,
    pitch: 0.16,
    fov: 44,
    minDist: 6,
    maxDist: 30,
    draw: (f) => {
      const { wire, ctx, t } = f;
      // Disk rings in the equatorial plane.
      for (let i = 0; i < 18; i++) {
        const r = 2.6 + i * 0.35;
        wire.begin();
        wire.circle([0, 0, 0], [1, 0, 0], [0, 0, 1], r, 96, t * (1.5 / Math.pow(r, 1.5)), t * (1.5 / Math.pow(r, 1.5)) + Math.PI * 1.85);
        wire.stroke(i < 4 ? '#fff1d8' : INK.gold, 0.75 - i * 0.035, i < 4 ? 1.2 : 0.8);
      }
      // Lensed arc (stylised).
      wire.begin();
      wire.circle([0, 0, 0], [1, 0, 0], [0, 1, 0], 2.4, 64, 0, Math.PI);
      wire.stroke('#fbe6c4', 0.7, 1.2);
      // Shadow.
      const s = wire.project([0, 0, 0]);
      const k = wire.scaleAt([0, 0, 0]);
      if (s) {
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(s[0], s[1], 2.0 * k, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fbe6c4';
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(s[0], s[1], 2.05 * k, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      // Trajectories: slingshot & fall.
      wire.begin();
      const pts: V3[] = [];
      for (let i = 0; i <= 60; i++) {
        const th = -1.9 + (i / 60) * 3.8;
        const r = 4.5 / (1 + 0.55 * Math.cos(th)) + 2;
        pts.push([Math.cos(th + Math.PI) * r, 0.4, Math.sin(th + Math.PI) * r]);
      }
      wire.poly(pts);
      wire.stroke(INK.white, 0.6, 1, [5, 5]);
    },
    notes: [
      { at: [0, 2.6, 0], text: 'Lensed disk over the shadow' },
      { at: [-8, 0.4, 0], text: 'Slingshot trajectory' },
      { at: [6, 0, 2], text: 'Accretion disk · Keplerian motion' },
    ],
  },
  edmunds: {
    id: 'edmunds',
    view: 'Eye level · settlement site',
    target: [0, 1, 0],
    dist: 14,
    yaw: 0.7,
    pitch: 0.18,
    fov: 46,
    minDist: 6,
    maxDist: 30,
    draw: (f) => {
      const { wire } = f;
      const H = (x: number, z: number) => Math.sin(x * 0.3) * 0.4 + Math.cos(z * 0.25) * 0.5 + (Math.abs(x) > 8 ? (Math.abs(x) - 8) * 0.6 : 0);
      wire.begin();
      for (let zi = 0; zi <= 20; zi++) {
        const z = 10 - zi;
        const pts: V3[] = [];
        for (let xi = 0; xi <= 30; xi++) pts.push([-15 + xi, H(-15 + xi, z), z]);
        wire.poly(pts);
      }
      wire.stroke(INK.white, 0.3, 0.6);
      wire.begin();
      house(f, [-1, H(0, 0), -1], 2.4, 1.6, 1.0, 0.6);
      wire.line([3, H(3, 1), 1], [3, H(3, 1) + 1.6, 1]);
      wire.poly([[3, H(3, 1) + 1.6, 1], [3.8, H(3, 1) + 1.3, 1], [3, H(3, 1) + 1.0, 1]]);
      wire.stroke(INK.gold, 0.9, 1);
    },
    notes: [
      { at: [0.2, 2.2, -0.2], text: 'Camp · Plan B begins' },
      { at: [3, 2, 1], text: 'Edmunds’ marker' },
    ],
  },
  tesseract: {
    id: 'tesseract',
    view: 'Inside the lattice · repetition',
    target: [0, 1.2, -6],
    dist: 7,
    yaw: 0.15,
    pitch: 0.05,
    fov: 62,
    minDist: 2,
    maxDist: 18,
    draw: (f) => drawTesseractModel(f, 6),
    notes: [
      { at: [0.9, 2.3, -1.66], text: 'The bookshelf, extruded through time' },
      { at: [1.3, 4, -1.36], text: 'Gravity threads' },
      { at: [4.4, 0, -4.4], text: 'Another moment of the same room' },
    ],
  },
  station: {
    id: 'station',
    view: 'Axial · inverted landscape',
    target: [0, 0, -12],
    dist: 14,
    yaw: 0.0,
    pitch: 0.0,
    fov: 64,
    minDist: 4,
    maxDist: 26,
    draw: (f) => {
      const { wire, t } = f;
      const R = 4;
      const rot = t * 0.05;
      wire.begin();
      for (let z = 4; z > -36; z -= 2.5) wire.circle([0, 0, z], [Math.cos(rot), Math.sin(rot), 0], [-Math.sin(rot), Math.cos(rot), 0], R, 64);
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2 + rot;
        wire.line([Math.cos(a) * R, Math.sin(a) * R, 4], [Math.cos(a) * R, Math.sin(a) * R, -36]);
      }
      wire.stroke(INK.white, 0.3, 0.6);
      wire.begin();
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2 + rot + 0.1;
        const z = -2 - (i % 8) * 4;
        const base: V3 = [Math.cos(a) * R, Math.sin(a) * R, z];
        const n: V3 = [-Math.cos(a) * 0.5, -Math.sin(a) * 0.5, 0];
        wire.line(base, v3.add(base, n));
      }
      wire.stroke(INK.gold, 0.8, 1);
    },
    notes: [
      { at: [0, 4, -6], text: 'The horizon curves overhead' },
      { at: [0, 0, -30], text: 'Axis of rotation' },
    ],
  },
};
