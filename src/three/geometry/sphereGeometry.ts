import * as THREE from 'three';
import { R, circlePoints, newBuffer, pushPolyline, toGeometry } from './space';
import { RGB } from '../materials';

/**
 * Pure three.js builders for the spherical World Map linework
 * (no React — reused by the R3F components and by the verification harness).
 */

export const X = new THREE.Vector3(1, 0, 0);
export const Y = new THREE.Vector3(0, 1, 0);
export const Z = new THREE.Vector3(0, 0, 1);
export const O = new THREE.Vector3();

/** Front-weighted alpha: lines on the near hemisphere read stronger (depth cue). */
const depthAlpha = (front: number, back: number) => (_: number, p: THREE.Vector3) => {
  const k = THREE.MathUtils.clamp(p.z / R, -1, 1) * 0.5 + 0.5;
  return back + (front - back) * k;
};

/** Meridians and latitudes of the spherical World Map. */
export function buildGrid(): THREE.BufferGeometry {
  const buf = newBuffer();
  // Meridians: great circles through the poles.
  const meridians = 12;
  for (let i = 0; i < meridians; i++) {
    const lon = (i / meridians) * Math.PI;
    const u = new THREE.Vector3(Math.cos(lon), 0, Math.sin(lon));
    pushPolyline(buf, circlePoints(O, u, Y, R, 160), RGB.white, depthAlpha(0.12, 0.035));
  }
  // Latitudes.
  for (const lat of [-62, -40, -20, 20, 40, 62]) {
    const phi = THREE.MathUtils.degToRad(lat);
    const c = new THREE.Vector3(0, Math.sin(phi) * R, 0);
    pushPolyline(buf, circlePoints(c, X, Z, Math.cos(phi) * R, 160), RGB.white, depthAlpha(0.1, 0.03));
  }
  // Equator, slightly stronger.
  pushPolyline(buf, circlePoints(O, X, Z, R, 200), RGB.white, depthAlpha(0.2, 0.05));
  return toGeometry(buf);
}

/** Large sweeping orbital arcs that cross the sphere, echoing the reference. */
export const ORBITS: { u: THREE.Vector3; v: THREE.Vector3; r: number; c: THREE.Vector3 }[] = (() => {
  const make = (rx: number, ry: number, rz: number, r = R, c = new THREE.Vector3()) => {
    const e = new THREE.Euler(rx, ry, rz);
    return { u: X.clone().applyEuler(e), v: Z.clone().applyEuler(e), r, c };
  };
  return [
    make(1.28, 0.0, 0.42), // steep, upper-left → lower-right
    make(1.36, 0.0, -0.5), // mirrored
    make(0.32, 0.0, 0.16), // shallow, through the upper band
    make(-0.36, 0.0, -0.12), // shallow, lower band
    make(1.05, 0.0, 0.05, R * 0.82, new THREE.Vector3(0, 0.08 * R, 0)),
    make(0.18, 0.0, -0.08, R * 0.9, new THREE.Vector3(0, 0.42 * R, 0)),
    make(-0.2, 0.0, 0.1, R * 0.86, new THREE.Vector3(0, -0.46 * R, 0)),
  ];
})();

export function buildOrbits(): THREE.BufferGeometry {
  const buf = newBuffer();
  ORBITS.forEach((o, i) => {
    const pts = circlePoints(o.c, o.u, o.v, o.r, 220);
    pushPolyline(buf, pts, RGB.white, depthAlpha(i < 4 ? 0.24 : 0.17, 0.05));
  });
  return toGeometry(buf);
}

/**
 * Horizontal wormhole-like funnels: a hyperboloid of revolution around the x-axis.
 * They flare toward Endurance (left) and Miller's Planet (right) and narrow into Gargantua.
 */
export function funnelRadius(s: number): number {
  const t = THREE.MathUtils.clamp((s - 0.24) / 0.56, 0, 1);
  return (0.07 + 0.37 * Math.pow(t, 1.7)) * R;
}

export function buildFunnels(): THREE.BufferGeometry {
  const buf = newBuffer();
  const ringS = [0.8, 0.735, 0.665, 0.595, 0.525, 0.455, 0.39, 0.33];
  for (const side of [-1, 1]) {
    ringS.forEach((s, i) => {
      const c = new THREE.Vector3(side * s * R, 0, 0);
      const a = 0.42 - i * 0.042;
      pushPolyline(buf, circlePoints(c, Y, Z, funnelRadius(s), 128), RGB.white, depthAlpha(a, a * 0.35));
    });
    // Concentric "portal" rings at the mouth.
    for (const k of [0.74, 0.5, 0.28]) {
      const c = new THREE.Vector3(side * 0.8 * R, 0, 0);
      pushPolyline(buf, circlePoints(c, Y, Z, funnelRadius(0.8) * k, 96), RGB.white, depthAlpha(0.2, 0.08));
    }
    // Longitudinal lines.
    const lines = 22;
    for (let j = 0; j < lines; j++) {
      const th = (j / lines) * Math.PI * 2;
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k <= 40; k++) {
        const s = 0.8 - (k / 40) * (0.8 - 0.26);
        const r = funnelRadius(s);
        pts.push(new THREE.Vector3(side * s * R, Math.cos(th) * r, Math.sin(th) * r));
      }
      pushPolyline(buf, pts, RGB.white, (i, p) => {
        const s = Math.abs(p.x) / R;
        const fade = THREE.MathUtils.smoothstep(s, 0.27, 0.55);
        const front = THREE.MathUtils.clamp(p.z / R, -1, 1) * 0.5 + 0.5;
        return fade * (0.05 + 0.13 * front) * (i >= 0 ? 1 : 1);
      });
    }
  }
  return toGeometry(buf);
}

/** Gravity well: a polar spacetime sheet in the disk plane, dipping into Gargantua. */
export function buildWell(): THREE.BufferGeometry {
  const buf = newBuffer();
  const depth = (r: number) => -0.26 * R * Math.pow((0.17 * R) / r, 1.25);
  const rings = [0.19, 0.23, 0.28, 0.34, 0.41, 0.49, 0.58, 0.68, 0.79, 0.9];
  rings.forEach((rr) => {
    const r = rr * R;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 160; i++) {
      const t = (i / 160) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(t) * r, depth(r), Math.sin(t) * r));
    }
    const a = 0.16 * (1 - THREE.MathUtils.smoothstep(rr, 0.55, 0.92));
    pushPolyline(buf, pts, RGB.white, a);
  });
  const radials = 40;
  for (let j = 0; j < radials; j++) {
    const t = (j / radials) * Math.PI * 2;
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k <= 36; k++) {
      const rr = 0.18 + (k / 36) * (0.9 - 0.18);
      const r = rr * R;
      pts.push(new THREE.Vector3(Math.cos(t) * r, depth(r), Math.sin(t) * r));
    }
    pushPolyline(buf, pts, RGB.white, (_, p) => {
      const rr = Math.hypot(p.x, p.z) / R;
      return 0.13 * (1 - THREE.MathUtils.smoothstep(rr, 0.5, 0.9));
    });
  }
  return toGeometry(buf);
}

