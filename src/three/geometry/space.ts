import * as THREE from 'three';
import { CONNECTIONS } from '../../data/connections';
import { NODE_MAP } from '../../data/nodes';
import type { AtlasConnection, NodeId, Vec2, Vec3 } from '../../data/types';

/** World radius of the spherical World Map. */
export const R = 10;
/** Apparent radius (composition units) around Gargantua where routes stop. */
export const CORE_RADIUS = 0.17;

/** Convert composition coords (x, y in sphere radii, depth 0..1) into world space. */
export function toWorld(p: Vec2 | Vec3, depth?: number): THREE.Vector3 {
  const [x, y] = p;
  const d = depth ?? (p.length === 3 ? (p as Vec3)[2] : 0);
  const zMax = Math.sqrt(Math.max(0, 1 - x * x - y * y));
  return new THREE.Vector3(x * R, y * R, d * zMax * R);
}

export function nodeWorld(id: NodeId): THREE.Vector3 {
  const n = NODE_MAP[id];
  return toWorld(n.position, n.depth);
}

function endpoint(id: NodeId, toward: THREE.Vector3): THREE.Vector3 {
  const n = NODE_MAP[id];
  const p = nodeWorld(id);
  if (n.marker === 'core') {
    const dir = new THREE.Vector3(toward.x - p.x, toward.y - p.y, 0).normalize();
    return p.clone().addScaledVector(dir, CORE_RADIUS * R);
  }
  return p;
}

/** Build a smooth curve for a connection from its data definition. */
export function buildCurve(c: AtlasConnection): THREE.Curve<THREE.Vector3> {
  const rawA = nodeWorld(c.from);
  const rawB = nodeWorld(c.to);
  const firstVia = c.via?.length ? toWorld(c.via[0]) : rawB;
  const lastVia = c.via?.length ? toWorld(c.via[c.via.length - 1]) : rawA;
  const a = endpoint(c.from, firstVia);
  const b = endpoint(c.to, lastVia);

  if (c.via && c.via.length) {
    const pts = [a, ...c.via.map((v) => toWorld(v)), b];
    return new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);
  }

  // Quadratic arc bowed away from the centre (so routes orbit Gargantua rather than cross it).
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const chord = b.clone().sub(a);
  const len = chord.length();
  const perp = new THREE.Vector3(-chord.y, chord.x, 0).normalize();
  if (perp.dot(mid) < 0) perp.negate();
  const bend = c.bend ?? 0.2;
  const ctrl = mid.clone().addScaledVector(perp, bend * len);
  ctrl.z += len * 0.08;
  return new THREE.QuadraticBezierCurve3(a, ctrl, b);
}

const curveCache = new Map<string, THREE.Curve<THREE.Vector3>>();
export function getCurve(id: string): THREE.Curve<THREE.Vector3> {
  let c = curveCache.get(id);
  if (!c) {
    const conn = CONNECTIONS.find((x) => x.id === id);
    if (!conn) throw new Error(`Unknown connection ${id}`);
    c = buildCurve(conn);
    curveCache.set(id, c);
  }
  return c;
}

/** Evenly spaced points (by arc length) along a curve. */
export function samplePoints(curve: THREE.Curve<THREE.Vector3>, n = 96): THREE.Vector3[] {
  return curve.getSpacedPoints(n);
}

/** Midpoint of a connection — used for camera focus and labels. */
export function connectionMidpoint(id: string): THREE.Vector3 {
  return getCurve(id).getPointAt(0.5);
}

// ───────────────────────── line geometry builders ─────────────────────────

export interface LineBuffer {
  positions: number[];
  colors: number[];
}

export function newBuffer(): LineBuffer {
  return { positions: [], colors: [] };
}

/** Push a polyline as line segments with per-vertex RGBA (alpha supports fades). */
export function pushPolyline(
  buf: LineBuffer,
  pts: THREE.Vector3[],
  color: [number, number, number],
  alpha: number | ((i: number, p: THREE.Vector3) => number),
  closed = false,
): void {
  const n = pts.length;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % n];
    const ap = typeof alpha === 'function' ? alpha(i, p) : alpha;
    const aq = typeof alpha === 'function' ? alpha((i + 1) % n, q) : alpha;
    buf.positions.push(p.x, p.y, p.z, q.x, q.y, q.z);
    buf.colors.push(color[0], color[1], color[2], ap, color[0], color[1], color[2], aq);
  }
}

export function toGeometry(buf: LineBuffer): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(buf.positions, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(buf.colors, 4));
  g.computeBoundingSphere();
  return g;
}

export function circlePoints(
  center: THREE.Vector3,
  u: THREE.Vector3,
  v: THREE.Vector3,
  radius: number,
  segments = 128,
  from = 0,
  to = Math.PI * 2,
): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = from + ((to - from) * i) / segments;
    pts.push(
      center
        .clone()
        .addScaledVector(u, Math.cos(t) * radius)
        .addScaledVector(v, Math.sin(t) * radius),
    );
  }
  return pts;
}

/** Deterministic pseudo random for reproducible compositions. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
