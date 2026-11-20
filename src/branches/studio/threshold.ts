import * as THREE from 'three';
import type { World } from './types';

/**
 * SCREEN THRESHOLD — a two-sided portal between two worlds, and the camera path that crosses it.
 *
 * Each end is a rectangle in its own world (a printer touchscreen, a bookshelf opening). Looking at one
 * end shows the other world, rendered from a camera mapped through the pair: the view through the
 * screen is exactly what the camera will see after it crosses. When the camera passes the plane it
 * simply continues in the other world — no cut, no fade. Ends may differ in size; the mapping scales.
 */

export interface ThresholdEnd {
  world: World;
  /** Rigid frame of the opening: origin at its centre, +Z = outward normal (the side you look from), +Y up. */
  frame: THREE.Matrix4;
  width: number;
  height: number;
  /** Surface that displays the other side (a touchscreen glass, or an invisible pane in a shelf). */
  surface: THREE.Mesh;
  /** Hide the surface when inactive (for openings that should look like ordinary geometry). */
  hiddenWhenIdle?: boolean;
}

export interface ThresholdLink {
  a: ThresholdEnd;
  b: ThresholdEnd;
}

export function frameFrom(obj: THREE.Object3D): THREE.Matrix4 {
  obj.updateWorldMatrix(true, false); // include ancestors (updateMatrixWorld only walks down)
  const p = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  obj.matrixWorld.decompose(p, q, s);
  return new THREE.Matrix4().compose(p, q, new THREE.Vector3(1, 1, 1));
}

export function frameAt(center: THREE.Vector3, quat: THREE.Quaternion): THREE.Matrix4 {
  return new THREE.Matrix4().compose(center, quat, new THREE.Vector3(1, 1, 1));
}

const FLIP = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);

/** Map a camera pose through the threshold (from → to). Returns the pose in the destination world. */
export function mapPose(from: ThresholdEnd, to: ThresholdEnd, pos: THREE.Vector3, quat: THREE.Quaternion, outPos = new THREE.Vector3(), outQuat = new THREE.Quaternion()) {
  const s = to.width / from.width;
  const inv = from.frame.clone().invert();
  const local = pos.clone().applyMatrix4(inv);
  local.set(-local.x * s, local.y * s, -local.z * s);
  outPos.copy(local.applyMatrix4(to.frame));
  const fq = new THREE.Quaternion().setFromRotationMatrix(from.frame);
  const tq = new THREE.Quaternion().setFromRotationMatrix(to.frame);
  const q = quat.clone(); // outQuat may alias quat
  outQuat.copy(tq).multiply(FLIP).multiply(fq.invert()).multiply(q);
  return { pos: outPos, quat: outQuat };
}

export function endCenter(e: ThresholdEnd): THREE.Vector3 {
  return new THREE.Vector3().setFromMatrixPosition(e.frame);
}

export function endNormal(e: ThresholdEnd): THREE.Vector3 {
  return new THREE.Vector3(0, 0, 1).applyQuaternion(new THREE.Quaternion().setFromRotationMatrix(e.frame));
}

/** Signed distance of a point from the end's plane (positive on the viewing side). */
export function signedDistance(e: ThresholdEnd, p: THREE.Vector3): number {
  return endNormal(e).dot(p.clone().sub(endCenter(e)));
}

/** True if the point projects inside the opening rectangle (with a margin factor). */
export function insideOpening(e: ThresholdEnd, p: THREE.Vector3, margin = 1): boolean {
  const local = p.clone().applyMatrix4(e.frame.clone().invert());
  return Math.abs(local.x) <= (e.width / 2) * margin && Math.abs(local.y) <= (e.height / 2) * margin;
}

/** Clipping plane that keeps only what lies in front of an end (used when rendering through it). */
export function clipPlane(e: ThresholdEnd, offset = 0.0005): THREE.Plane {
  const n = endNormal(e);
  return new THREE.Plane().setFromNormalAndCoplanarPoint(n, endCenter(e).add(n.clone().multiplyScalar(-offset)));
}

// ───────────────────────── display surface ─────────────────────────

export function createSurfaceMaterial(o: { idleHidden?: boolean } = {}): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      tPortal: { value: null },
      uRes: { value: new THREE.Vector2(1, 1) },
      uMix: { value: 0 },
      uGain: { value: 1 },
      uHover: { value: 0 },
      uIdleHidden: { value: o.idleHidden ? 1 : 0 },
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main() {
        vUv = uv;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vN = normalize(mat3(modelMatrix) * normal);
        vV = cameraPosition - w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D tPortal; uniform vec2 uRes; uniform float uMix, uGain, uHover, uIdleHidden, uTime;
      varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main() {
        if (uIdleHidden > 0.5 && uMix < 0.004 && uHover < 0.004) discard;
        vec2 suv = gl_FragCoord.xy / uRes;
        vec3 through = texture2D(tPortal, suv).rgb * uGain;
        // Dark glossy glass: a soft sheen that brightens at grazing angles and toward the top edge.
        float fres = pow(1.0 - clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0), 3.0);
        vec3 glass = vec3(0.006, 0.007, 0.009) + vec3(0.07, 0.075, 0.085) * (0.2 + 0.8 * fres) * (0.55 + 0.45 * vUv.y);
        glass += vec3(0.05, 0.055, 0.06) * uHover;
        vec3 col = mix(glass, through, uMix);
        // Soft white edge highlight on hover.
        vec2 e = min(vUv, 1.0 - vUv);
        float edge = 1.0 - smoothstep(0.0, 0.035, min(e.x * 1.6, e.y));
        col += vec3(1.2) * edge * uHover * (0.75 + 0.25 * sin(uTime * 2.4));
        float a = uIdleHidden > 0.5 ? clamp(max(uMix, uHover * 0.6), 0.0, 1.0) : 1.0;
        gl_FragColor = vec4(col, a);
      }
    `,
    transparent: !!o.idleHidden,
    depthWrite: !o.idleHidden,
  });
}

// ───────────────────────── camera paths ─────────────────────────

export interface Pose {
  pos: THREE.Vector3;
  quat: THREE.Quaternion;
}

export function lookQuat(pos: THREE.Vector3, target: THREE.Vector3, up = new THREE.Vector3(0, 1, 0)): THREE.Quaternion {
  const m = new THREE.Matrix4().lookAt(pos, target, up);
  return new THREE.Quaternion().setFromRotationMatrix(m);
}

function bezier(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, t: number, out: THREE.Vector3) {
  const u = 1 - t;
  return out
    .copy(p0)
    .multiplyScalar(u * u * u)
    .addScaledVector(p1, 3 * u * u * t)
    .addScaledVector(p2, 3 * u * t * t)
    .addScaledVector(p3, t * t * t);
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * ScreenThresholdTransition — a camera path from a pose in the source world, through the threshold,
 * to a pose in the destination world. u ∈ [0, 1]; the crossing happens at u = `cross`. Position,
 * direction and speed are continuous across the crossing (the destination half is scaled by the
 * threshold's size ratio). Play u forwards to go through, backwards to return the same way.
 */
export class ScreenThresholdTransition {
  readonly cross: number;
  private p: { s0: THREE.Vector3; s1: THREE.Vector3; s2: THREE.Vector3; s3: THREE.Vector3; d0: THREE.Vector3; d1: THREE.Vector3; d2: THREE.Vector3; d3: THREE.Vector3 };
  private qStart: THREE.Quaternion;
  private qIn: THREE.Quaternion;
  private cF: THREE.Vector3;
  private upF: THREE.Vector3;
  private qAim = new THREE.Quaternion();
  private qOut: THREE.Quaternion;
  private qEnd: THREE.Quaternion;

  constructor(
    readonly from: ThresholdEnd,
    readonly to: ThresholdEnd,
    start: Pose,
    end: Pose,
    o: { cross?: number; approach?: number; alignAt?: number } = {},
  ) {
    this.cross = o.cross ?? 0.46;
    const approach = o.approach ?? 0.32; // metres of straight approach along the normal
    const nF = endNormal(from);
    const cF = endCenter(from);
    const nT = endNormal(to);
    const cT = endCenter(to);
    const scale = to.width / from.width;
    // Bezier handles: the source half ends heading straight into the screen; the destination half
    // begins heading straight out of the exit, with the speed matched across the crossing.
    const L1 = approach;
    const L2 = (scale * L1 * (1 - this.cross)) / this.cross;
    const fwd0 = new THREE.Vector3(0, 0, -1).applyQuaternion(start.quat);
    const startToScreen = cF.distanceTo(start.pos);
    this.p = {
      s0: start.pos.clone(),
      s1: start.pos.clone().addScaledVector(fwd0, startToScreen * 0.25),
      s2: cF.clone().addScaledVector(nF, L1),
      s3: cF.clone(),
      d0: cT.clone(),
      d1: cT.clone().addScaledVector(nT, L2),
      // Arrive still drifting along the direction of travel (a pull-back reveal), never doubling back.
      d2: end.pos.clone().addScaledVector(end.pos.clone().sub(cT).normalize(), -end.pos.distanceTo(cT) * 0.3),
      d3: end.pos.clone(),
    };
    const upF = new THREE.Vector3(0, 1, 0).applyQuaternion(new THREE.Quaternion().setFromRotationMatrix(from.frame));
    const upT = new THREE.Vector3(0, 1, 0).applyQuaternion(new THREE.Quaternion().setFromRotationMatrix(to.frame));
    this.qStart = start.quat.clone();
    this.qIn = lookQuat(cF.clone().addScaledVector(nF, 1), cF, upF);
    this.cF = cF;
    this.upF = upF;
    this.qOut = lookQuat(cT, cT.clone().addScaledVector(nT, 1), upT);
    this.qEnd = end.quat.clone();
  }

  /** Camera pose at u, and which side of the threshold it is on. */
  pose(u: number, out: Pose): 'from' | 'to' {
    if (u < this.cross) {
      const s = u / this.cross;
      bezier(this.p.s0, this.p.s1, this.p.s2, this.p.s3, s, out.pos);
      // Alignment (phase A): turn until the screen sits dead centre, keep it centred while closing in,
      // and square up to the screen's own axis for the last stretch so the crossing is head-on.
      this.qAim.copy(out.pos.distanceToSquared(this.cF) > 1e-4 ? lookQuat(out.pos, this.cF, this.upF) : this.qIn);
      this.qAim.slerp(this.qIn, smoothstep(0.72, 0.97, s));
      out.quat.copy(this.qStart).slerp(this.qAim, smoothstep(0.0, 0.55, s));
      return 'from';
    }
    const s = (u - this.cross) / (1 - this.cross);
    bezier(this.p.d0, this.p.d1, this.p.d2, this.p.d3, s, out.pos);
    // Arrival: keep looking straight out of the opening at first, then settle (phases D–E).
    out.quat.copy(this.qOut).slerp(this.qEnd, smoothstep(0.08, 0.96, s));
    return 'to';
  }
}

/** Time warp for transitions: gentle start, steady through the crossing, long soft landing. */
export function transitionEase(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  // Smootherstep (C2) — slow alignment and arrival, fastest near the crossing.
  return x * x * x * (x * (x * 6 - 15) + 10);
}
