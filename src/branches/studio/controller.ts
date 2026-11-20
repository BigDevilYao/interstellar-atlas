import * as THREE from 'three';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import { Bloom } from '../../cinema/bloom';
import { TONE } from '../../cinema/glsl';
import { buildMurph, type MurphWorld } from './murph';
import { PRINTER } from './printer';
import { buildPrinterWorld, type PrinterWorld } from './printerWorld';
import { buildStudio, STUDIO, type StudioWorld } from './studio';
import {
  clipPlane,
  createSurfaceMaterial,
  endCenter,
  frameAt,
  frameFrom,
  insideOpening,
  lookQuat,
  mapPose,
  ScreenThresholdTransition,
  signedDistance,
  transitionEase,
  type Pose,
  type ThresholdEnd,
} from './threshold';
import type { World, WorldKey } from './types';

/**
 * PROTOTYPE CONTROLLER — Printer → (touchscreen) → Studio → (touchscreen) → Murph's room.
 * One camera, three worlds, two threshold links. Only one transition can run at a time.
 */

/** Phones: a lighter render path for the branch (pixel ratio ≤ 1.5, 2× MSAA); desktop unchanged. */
const PHONE =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(hover: none) and (pointer: coarse)').matches === true &&
  Math.min(window.screen?.width ?? 1e4, window.screen?.height ?? 1e4) < 600;
const MSAA = PHONE ? 2 : 4;

export type Stage = 'printer' | 'studio' | 'murph';
export type StudioView = 'floor' | 'stair' | 'mezzanine' | 'windows' | 'printers';

export interface HoverInfo {
  label: string;
  x: number;
  y: number;
  kind: 'threshold' | 'feature';
}

export interface ControllerEvents {
  onStage?(stage: Stage): void;
  onBusy?(busy: boolean, label?: string): void;
  onHover?(h: HoverInfo | null): void;
  onView?(v: StudioView): void;
}

const D2R = Math.PI / 180;

const STUDIO_VIEWS: Record<StudioView, { pos: THREE.Vector3; look: THREE.Vector3; fov: number }> = {
  floor: { pos: new THREE.Vector3(2.55, 1.62, 4.6), look: new THREE.Vector3(2.2, 2.6, -5.0), fov: 62 },
  stair: { pos: new THREE.Vector3(5.4, 1.65, 3.6), look: new THREE.Vector3(-3.6, 1.95, -3.6), fov: 62 },
  mezzanine: { pos: new THREE.Vector3(10.6, STUDIO.DECK + 1.55, -4.5), look: new THREE.Vector3(0, 1.2, 3.5), fov: 64 },
  windows: { pos: new THREE.Vector3(-1.2, 1.6, -1.0), look: new THREE.Vector3(-5.6, 1.35, 8.6), fov: 62 },
  printers: { pos: new THREE.Vector3(3.08, 1.5, -2.95), look: new THREE.Vector3(3.0, 1.15, -4.6), fov: 52 },
};

const LOOK_LIMITS: Record<Stage, { yaw: number; pitch: number }> = {
  printer: { yaw: 9 * D2R, pitch: 6 * D2R },
  studio: { yaw: 55 * D2R, pitch: 28 * D2R },
  murph: { yaw: 45 * D2R, pitch: 22 * D2R },
};

const gradeFragment = /* glsl */ `
  ${TONE}
  uniform sampler2D tDiffuse; uniform sampler2D tBloom; uniform float uBloom, uExposure, uTime, uFade, uAspect;
  varying vec2 vUv;
  float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  void main() {
    vec2 c = vUv - 0.5;
    float r2 = dot(c * vec2(uAspect, 1.0), c * vec2(uAspect, 1.0));
    vec3 col = texture2D(tDiffuse, vUv).rgb;
    col += texture2D(tBloom, vUv).rgb * uBloom;
    col = acesFilm(max(col, 0.0) * uExposure);
    float l = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(col, col * vec3(0.94, 0.98, 1.05), (1.0 - l) * 0.22);
    col *= 1.0 - smoothstep(0.25, 1.0, r2 * 1.35) * 0.45;
    col = toSRGB(col);
    col += (h(vUv * 1000.0 + uTime) - 0.5) * 0.02;
    gl_FragColor = vec4(col * uFade, 1.0);
  }
`;

interface Active {
  kind: 'threshold' | 'move' | 'fade';
  t: number;
  dur: number;
  dir: 1 | -1;
  tr?: ScreenThresholdTransition;
  link?: 'L1' | 'L2';
  fromPose?: Pose;
  toPose?: Pose;
  fovFrom: number;
  fovTo: number;
  toStage?: Stage;
  toView?: StudioView;
  fadeAction?: () => void;
  done?: () => void;
  /** Match cut: railing lines as they were framed when the crossing began (viewport-normalised). */
  capture?: { verticals: number[][]; top: number[] | null; bottom: number[] | null };
}

export class StudioThresholdController {
  private renderer: THREE.WebGLRenderer;
  private camera = new THREE.PerspectiveCamera(48, 1, 0.004, 140);
  private vcam = new THREE.PerspectiveCamera(48, 1, 0.004, 140);
  private printerW: PrinterWorld;
  private studioW: StudioWorld;
  private murphW: MurphWorld;
  private ends: Record<'A' | 'B' | 'B2' | 'C', ThresholdEnd>;
  private rtMain!: THREE.WebGLRenderTarget;
  private rtPortal = new Map<ThresholdEnd, THREE.WebGLRenderTarget>();
  private bloom = new Bloom();
  private grade: THREE.ShaderMaterial;
  private quad: FullScreenQuad;
  private overlay: CanvasRenderingContext2D | null;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2(2, 2);
  private pointerPx = { x: 0, y: 0 };
  private dragging = false;
  private dragMoved = 0;
  private hover: { end?: ThresholdEnd; feature?: 'stair' | 'mezzanine' | 'windows' } | null = null;
  private raf = 0;
  private clock = new THREE.Clock();
  private time = 0;
  private fade = 0;
  private fadeTarget = 1;
  /** Rendered frame count (diagnostics / tests). */
  frames = 0;
  private disposed = false;
  private w = 1;
  private h = 1;
  private pr = 1;
  private reducedMotion = false;
  private linework = 1;

  stage: Stage = 'printer';
  view: StudioView = 'floor';
  private world: World;
  private base: Pose = { pos: new THREE.Vector3(), quat: new THREE.Quaternion() };
  private yaw = 0;
  private pitch = 0;
  private fov = 48;
  private active: Active | null = null;
  private tmpPose: Pose = { pos: new THREE.Vector3(), quat: new THREE.Quaternion() };

  constructor(
    private host: HTMLElement,
    private overlayCanvas: HTMLCanvasElement,
    private events: ControllerEvents = {},
    o: { quality?: 'high' | 'low'; reducedMotion?: boolean; initialStage?: Stage } = {},
  ) {
    this.reducedMotion = !!o.reducedMotion;
    const quality = o.quality ?? 'high';
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.className = 'st-canvas';
    host.appendChild(this.renderer.domElement);
    this.overlay = overlayCanvas.getContext('2d');

    const hi = quality === 'high';
    this.printerW = buildPrinterWorld(this.renderer, hi);
    this.studioW = buildStudio(this.renderer, hi);
    this.murphW = buildMurph({ renderer: this.renderer, quality, width: 1, height: 1 });

    // Threshold ends: the printer's touchscreen (A) ↔ the arrival printer in the studio (B);
    // the second studio printer (B2) ↔ the opening at the back of Murph's bookshelf (C).
    const screenEnd = (world: World, screen: THREE.Mesh): ThresholdEnd => {
      screen.material = createSurfaceMaterial();
      return { world, frame: frameFrom(screen), width: PRINTER.screenW, height: PRINTER.screenH, surface: screen };
    };
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(this.murphW.opening.width, this.murphW.opening.height), createSurfaceMaterial({ idleHidden: true }));
    pane.position.copy(this.murphW.opening.center);
    pane.quaternion.copy(this.murphW.opening.quat);
    pane.renderOrder = 5;
    this.murphW.scene.add(pane);
    this.ends = {
      A: screenEnd(this.printerW, this.printerW.printer.screen),
      B: screenEnd(this.studioW, this.studioW.printers[0].screen),
      B2: screenEnd(this.studioW, this.studioW.printers[1].screen),
      C: { world: this.murphW, frame: frameAt(this.murphW.opening.center, this.murphW.opening.quat), width: this.murphW.opening.width, height: this.murphW.opening.height, surface: pane, hiddenWhenIdle: true },
    };

    this.grade = new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: gradeFragment,
      uniforms: { tDiffuse: { value: null }, tBloom: { value: null }, uBloom: { value: 0.55 }, uExposure: { value: 1 }, uTime: { value: 0 }, uFade: { value: 0 }, uAspect: { value: 1 } },
      depthTest: false,
      depthWrite: false,
    });
    this.quad = new FullScreenQuad(this.grade);
    this.bloom.strength = 0.42;
    this.bloom.radius = 0.55;
    this.bloom.threshold = 1.15;

    this.world = this.printerW;
    this.setBase(this.printerW.start.pos, this.printerW.start.look);
    this.fov = 48;
    // Re-entering the branch part-way (e.g. browser Back from the Atlas) starts at that stage.
    if (o.initialStage && o.initialStage !== 'printer') this.place(o.initialStage);

    this.resize();
    this.bindInput();
    this.raf = requestAnimationFrame(this.loop);
  }

  // ───────────────────────── public API ─────────────────────────

  get busy(): boolean {
    return !!this.active;
  }

  /** Progress 0–1 of the running threshold crossing, or null (drives the HUD's crossing bar). */
  get crossing(): number | null {
    const a = this.active;
    return a && a.kind !== 'move' ? a.t / a.dur : null;
  }

  /** Step forward or back along Printer ↔ Studio ↔ Murph's room. */
  goTo(target: Stage) {
    if (this.active || target === this.stage) return;
    const order: Stage[] = ['printer', 'studio', 'murph'];
    const from = order.indexOf(this.stage);
    const to = order.indexOf(target);
    if (Math.abs(to - from) > 1) {
      // Non-adjacent: a quiet fade (the full journey is always available step by step).
      this.fadeTo(() => this.place(target), 'Returning');
      return;
    }
    if (this.stage === 'printer' && target === 'studio') this.crossL1(1);
    else if (this.stage === 'studio' && target === 'printer') this.stageThen('printers', () => this.crossL1(-1));
    else if (this.stage === 'studio' && target === 'murph') this.stageThen('floor', () => this.crossL2(1));
    else if (this.stage === 'murph' && target === 'studio') this.crossL2(-1);
  }

  restart() {
    if (this.active) return;
    if (this.stage === 'printer') return;
    this.fadeTo(() => this.place('printer'), 'Returning to the printer');
  }

  setStudioView(v: StudioView) {
    if (this.active || this.stage !== 'studio' || v === this.view) return;
    const target = STUDIO_VIEWS[v];
    this.move({ pos: target.pos.clone(), quat: lookQuat(target.pos, target.look) }, target.fov, 2.4, () => {
      this.view = v;
      this.events.onView?.(v);
    });
  }

  setLinework(on: boolean) {
    this.linework = on ? 1 : 0;
    this.studioW.setLinework(this.linework);
  }

  setReducedMotion(v: boolean) {
    this.reducedMotion = v;
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.unbindInput();
    this.printerW.dispose();
    this.studioW.dispose();
    this.murphW.dispose();
    this.rtMain?.dispose();
    this.rtPortal.forEach((r) => r.dispose());
    this.bloom.dispose();
    this.grade.dispose();
    this.quad.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  resize() {
    const r = this.host.getBoundingClientRect();
    this.w = Math.max(1, Math.round(r.width));
    this.h = Math.max(1, Math.round(r.height));
    this.pr = Math.min(window.devicePixelRatio || 1, PHONE ? 1.5 : 1.75);
    this.renderer.setPixelRatio(this.pr);
    this.renderer.setSize(this.w, this.h);
    this.camera.aspect = this.w / this.h;
    this.camera.updateProjectionMatrix();
    const W = Math.round(this.w * this.pr);
    const H = Math.round(this.h * this.pr);
    const opts = { type: THREE.HalfFloatType, samples: MSAA } as const;
    this.rtMain?.dispose();
    this.rtMain = new THREE.WebGLRenderTarget(W, H, opts);
    this.rtPortal.forEach((rt) => rt.setSize(W, H));
    this.bloom.setSize(W, H);
    this.grade.uniforms.uAspect.value = this.w / this.h;
    this.overlayCanvas.width = W;
    this.overlayCanvas.height = H;
    Object.values(this.ends).forEach((e) => ((e.surface.material as THREE.ShaderMaterial).uniforms.uRes.value as THREE.Vector2).set(W, H));
  }

  // ───────────────────────── stages and transitions ─────────────────────────

  private setBase(pos: THREE.Vector3, look: THREE.Vector3) {
    this.base.pos.copy(pos);
    this.base.quat.copy(lookQuat(pos, look));
    this.yaw = 0;
    this.pitch = 0;
  }

  private effectivePose(out: Pose): Pose {
    out.pos.copy(this.base.pos);
    out.quat.copy(this.base.quat).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ')));
    return out;
  }

  /** Jump (used behind a fade) to a stage's resting viewpoint. */
  private place(stage: Stage) {
    this.stage = stage;
    if (stage === 'printer') {
      this.world = this.printerW;
      this.setBase(this.printerW.start.pos, this.printerW.start.look);
      this.fov = 48;
    } else if (stage === 'studio') {
      this.world = this.studioW;
      const v = STUDIO_VIEWS.floor;
      this.setBase(v.pos, v.look);
      this.fov = v.fov;
      this.view = 'floor';
      this.events.onView?.('floor');
    } else {
      this.world = this.murphW;
      this.setBase(this.murphW.arrival.pos, this.murphW.arrival.look);
      this.fov = 52;
    }
    this.events.onStage?.(stage);
  }

  private begin(a: Active, label: string) {
    this.active = a;
    this.hover = null;
    this.events.onHover?.(null);
    this.events.onBusy?.(true, label);
  }

  private finish() {
    const a = this.active;
    this.active = null;
    this.events.onBusy?.(false);
    a?.done?.();
  }

  private fadeTo(action: () => void, label: string) {
    this.begin({ kind: 'fade', t: 0, dur: 1.1, dir: 1, fovFrom: this.fov, fovTo: this.fov, fadeAction: action }, label);
  }

  private move(to: Pose, fovTo: number, dur: number, done?: () => void) {
    const from = this.effectivePose({ pos: new THREE.Vector3(), quat: new THREE.Quaternion() });
    this.begin({ kind: 'move', t: 0, dur: this.reducedMotion ? 0.01 : dur, dir: 1, fromPose: from, toPose: to, fovFrom: this.fov, fovTo, done }, 'Moving');
  }

  /** In the studio, glide to a viewpoint first, then run `then`. */
  private stageThen(v: StudioView, then: () => void) {
    if (this.view === v && Math.abs(this.yaw) < 0.01 && Math.abs(this.pitch) < 0.01) {
      then();
      return;
    }
    const target = STUDIO_VIEWS[v];
    this.move({ pos: target.pos.clone(), quat: lookQuat(target.pos, target.look) }, target.fov, 2.0, () => {
      this.view = v;
      this.events.onView?.(v);
      then();
    });
  }

  /** Printer ↔ Studio through the touchscreen. dir 1 = enter the studio, −1 = return to the printer. */
  private crossL1(dir: 1 | -1) {
    const A = this.ends.A;
    const B = this.ends.B;
    const start = dir > 0 ? this.effectivePose({ pos: new THREE.Vector3(), quat: new THREE.Quaternion() }) : { pos: this.printerW.start.pos.clone(), quat: lookQuat(this.printerW.start.pos, this.printerW.start.look) };
    const fv = STUDIO_VIEWS.floor;
    const end = dir > 0 ? { pos: fv.pos.clone(), quat: lookQuat(fv.pos, fv.look) } : this.effectivePose({ pos: new THREE.Vector3(), quat: new THREE.Quaternion() });
    const tr = new ScreenThresholdTransition(A, B, start, end, { cross: 0.48, approach: 0.3 });
    const fovFar = dir > 0 ? fv.fov : this.fov;
    if (this.reducedMotion) {
      this.fadeTo(() => this.place(dir > 0 ? 'studio' : 'printer'), dir > 0 ? 'Entering the studio' : 'Returning to the printer');
      return;
    }
    this.begin(
      { kind: 'threshold', t: 0, dur: 4.6, dir, tr, link: 'L1', fovFrom: 48, fovTo: fovFar, toStage: dir > 0 ? 'studio' : 'printer', toView: 'floor' },
      dir > 0 ? 'Crossing the screen · into the studio' : 'Crossing the screen · back to the printer',
    );
  }

  /** Studio ↔ Murph's room through the second printer's touchscreen and the bookshelf opening. */
  private crossL2(dir: 1 | -1) {
    const B2 = this.ends.B2;
    const C = this.ends.C;
    // The crossing departs from (and returns to) the photo-06 framing: the printers under the blue
    // railing, so the railing's verticals are on screen to carry the match cut.
    const fv = STUDIO_VIEWS.floor;
    const start = dir > 0 ? this.effectivePose({ pos: new THREE.Vector3(), quat: new THREE.Quaternion() }) : { pos: fv.pos.clone(), quat: lookQuat(fv.pos, fv.look) };
    const end = dir > 0 ? { pos: this.murphW.arrival.pos.clone(), quat: lookQuat(this.murphW.arrival.pos, this.murphW.arrival.look) } : this.effectivePose({ pos: new THREE.Vector3(), quat: new THREE.Quaternion() });
    const tr = new ScreenThresholdTransition(B2, C, start, end, { cross: 0.55, approach: 0.85 });
    if (this.reducedMotion) {
      this.fadeTo(() => this.place(dir > 0 ? 'murph' : 'studio'), dir > 0 ? "Entering Murph's room" : 'Returning to the studio');
      return;
    }
    this.begin(
      {
        kind: 'threshold',
        t: 0,
        dur: 6.2,
        dir,
        tr,
        link: 'L2',
        fovFrom: fv.fov,
        fovTo: dir > 0 ? 52 : this.fov,
        toStage: dir > 0 ? 'murph' : 'studio',
        toView: 'floor',
        capture: dir > 0 ? this.captureRailing() : undefined,
      },
      dir > 0 ? "Crossing the screen · into Murph's room" : 'Crossing the bookshelf · back to the studio',
    );
  }

  /** The studio railing as framed right now: verticals and the fascia edges, in 0–1 viewport units. */
  private captureRailing(): Active['capture'] {
    this.camera.updateMatrixWorld();
    const L = this.studioW.lines;
    const norm = (p: THREE.Vector3) => {
      const v = p.clone().project(this.camera);
      return v.z < 1 ? [v.x * 0.5 + 0.5, 0.5 - v.y * 0.5] : null;
    };
    const segN = (s: [THREE.Vector3, THREE.Vector3]) => {
      const a = norm(s[0]);
      const b = norm(s[1]);
      if (!a || !b) return null;
      const onScreen = (q: number[]) => q[0] > -0.02 && q[0] < 1.02 && q[1] > -0.2 && q[1] < 1.2;
      return onScreen(a) && onScreen(b) ? [a[0], a[1], b[0], b[1]] : null;
    };
    const verticals = L.balusters
      .map(segN)
      .filter((x): x is number[] => !!x && Math.abs(x[3] - x[1]) > 0.02 && x[0] > 0 && x[0] < 1)
      .sort((p, q) => p[0] - q[0]);
    return { verticals, top: segN(L.fasciaTop), bottom: segN(L.fasciaBottom) };
  }

  /** Advance the running animation; sets the world, camera pose and field of view for this frame. */
  private step(dt: number) {
    const a = this.active;
    if (!a) {
      this.world = this.stageWorld(this.stage);
      return;
    }
    a.t = Math.min(a.dur, a.t + dt);
    const k = a.t / a.dur;
    if (a.kind === 'fade') {
      if (k < 0.45) this.fadeTarget = 0;
      else {
        if (a.fadeAction) {
          a.fadeAction();
          a.fadeAction = undefined;
        }
        this.fadeTarget = 1;
      }
      if (k >= 1) this.finish();
      return;
    }
    if (a.kind === 'move') {
      const e = transitionEase(k);
      this.base.pos.copy(a.fromPose!.pos).lerp(a.toPose!.pos, e);
      this.base.quat.copy(a.fromPose!.quat).slerp(a.toPose!.quat, e);
      this.yaw = 0;
      this.pitch = 0;
      this.fov = THREE.MathUtils.lerp(a.fovFrom, a.fovTo, e);
      if (k >= 1) this.finish();
      return;
    }
    // Threshold: u runs 0 → 1 (through) or 1 → 0 (back the same way).
    const u = transitionEase(a.dir > 0 ? k : 1 - k);
    const tr = a.tr!;
    const side = tr.pose(u, this.tmpPose);
    let world = side === 'from' ? tr.from.world : tr.to.world;
    // Just before the plane, show the far side directly (avoids the near plane clipping the screen).
    if (side === 'from' && signedDistance(tr.from, this.tmpPose.pos) < 0.012 && insideOpening(tr.from, this.tmpPose.pos, 1.2)) {
      mapPose(tr.from, tr.to, this.tmpPose.pos, this.tmpPose.quat, this.tmpPose.pos, this.tmpPose.quat);
      world = tr.to.world;
    }
    this.world = world;
    this.base.pos.copy(this.tmpPose.pos);
    this.base.quat.copy(this.tmpPose.quat);
    this.yaw = 0;
    this.pitch = 0;
    // Field of view: constant up to the crossing (both sides must match), then eases toward the far
    // side's value. fovFrom = screen side (u < cross), fovTo = the far end of the path (u = 1).
    this.fov = u < tr.cross ? a.fovFrom : THREE.MathUtils.lerp(a.fovFrom, a.fovTo, smooth((u - tr.cross) / (1 - tr.cross)));
    if (k >= 1) {
      const toStage = a.toStage!;
      this.stage = toStage;
      this.world = this.stageWorld(toStage);
      if (toStage === 'studio') {
        this.view = a.toView ?? 'floor';
        this.events.onView?.(this.view);
      }
      this.events.onStage?.(toStage);
      this.finish();
    }
  }

  private stageWorld(s: Stage): World {
    return s === 'printer' ? this.printerW : s === 'studio' ? this.studioW : this.murphW;
  }

  // ───────────────────────── rendering ─────────────────────────

  private loop = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const raw = this.clock.getDelta();
    const dt = Math.min(raw, 0.1); // motion: capped so a hitch never skips a transition
    this.time += dt;
    this.frames++;
    this.step(dt);
    // Fades follow wall-clock time, so a slow first frame never leaves the image veiled.
    this.fade += (this.fadeTarget - this.fade) * Math.min(1, Math.min(raw, 0.5) * (this.active?.kind === 'fade' ? 9 : 2.2));

    // Idle life: a slow breath in the printer view, subtle and only when nothing is happening.
    const pose = this.effectivePose(this.tmpPose);
    if (!this.active && this.stage === 'printer' && !this.reducedMotion) {
      pose.pos.x += Math.sin(this.time * 0.35) * 0.006;
      pose.pos.y += Math.sin(this.time * 0.27) * 0.004;
    }
    this.camera.position.copy(pose.pos);
    this.camera.quaternion.copy(pose.quat);
    this.camera.fov = this.fov;
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();

    this.updateHover();
    this.render(dt);
  };

  private portalMix(end: ThresholdEnd): number {
    const a = this.active;
    let mix = 0;
    if (a?.kind === 'threshold' && a.tr) {
      const u = transitionEase(a.dir > 0 ? a.t / a.dur : 1 - a.t / a.dur);
      if (end === a.tr.from) mix = smooth((u - 0.08) / (a.tr.cross - 0.14));
    }
    if (this.hover?.end === end) mix = Math.max(mix, 0.32);
    return mix;
  }

  private otherEnd(e: ThresholdEnd): ThresholdEnd {
    const { A, B, B2, C } = this.ends;
    return e === A ? B : e === B ? A : e === B2 ? C : B2;
  }

  private rtFor(e: ThresholdEnd): THREE.WebGLRenderTarget {
    let rt = this.rtPortal.get(e);
    if (!rt) {
      rt = new THREE.WebGLRenderTarget(Math.round(this.w * this.pr), Math.round(this.h * this.pr), { type: THREE.HalfFloatType, samples: MSAA });
      this.rtPortal.set(e, rt);
    }
    return rt;
  }

  private render(dt: number) {
    const W = this.world;
    W.update(this.time, dt);
    const r = this.renderer;
    // 1 · Through each active screen in this world, render the other side from the mapped camera.
    for (const e of Object.values(this.ends)) {
      const mat = e.surface.material as THREE.ShaderMaterial;
      mat.uniforms.uTime.value = this.time;
      mat.uniforms.uHover.value += (((this.hover?.end === e && !this.active) ? 1 : 0) - mat.uniforms.uHover.value) * Math.min(1, dt * 6);
      if (e.world !== W) continue;
      const mix = this.portalMix(e);
      mat.uniforms.uMix.value = mix;
      if (mix <= 0.002) continue;
      const o = this.otherEnd(e);
      mapPose(e, o, this.camera.position, this.camera.quaternion, this.vcam.position, this.vcam.quaternion);
      this.vcam.fov = this.camera.fov;
      this.vcam.aspect = this.camera.aspect;
      this.vcam.near = 0.004;
      this.vcam.updateProjectionMatrix();
      this.vcam.updateMatrixWorld();
      if (o.world !== W) o.world.update(this.time, 0);
      const wasVisible = o.surface.visible;
      o.surface.visible = false;
      r.clippingPlanes = [clipPlane(o)];
      r.setRenderTarget(this.rtFor(e));
      r.clear();
      r.render(o.world.scene, this.vcam);
      r.clippingPlanes = [];
      o.surface.visible = wasVisible;
      mat.uniforms.tPortal.value = this.rtFor(e).texture;
      mat.uniforms.uGain.value = o.world.exposure / W.exposure;
    }
    // 2 · This world, then bloom and the grade.
    r.setRenderTarget(this.rtMain);
    r.clear();
    r.render(W.scene, this.camera);
    r.setRenderTarget(null);
    this.bloom.render(r, this.rtMain.texture, this.rtMain.width, this.rtMain.height);
    this.grade.uniforms.tDiffuse.value = this.rtMain.texture;
    this.grade.uniforms.tBloom.value = this.bloom.texture;
    this.grade.uniforms.uExposure.value = W.exposure;
    this.grade.uniforms.uTime.value = this.time;
    this.grade.uniforms.uFade.value = this.fade;
    r.setRenderTarget(null);
    this.quad.render(r);
    // 3 · The architectural linework of the crossing.
    this.drawOverlay();
  }

  // ───────────────────────── match-cut linework ─────────────────────────

  private drawOverlay() {
    const g = this.overlay;
    if (!g) return;
    const W = this.overlayCanvas.width;
    const H = this.overlayCanvas.height;
    g.clearRect(0, 0, W, H);
    const a = this.active;
    if (!a || a.kind !== 'threshold' || !a.tr) return;
    const tr = a.tr;
    const u = transitionEase(a.dir > 0 ? a.t / a.dur : 1 - a.t / a.dur);
    const c = tr.cross;
    // The linework lives on the screen side of the crossing and is gone just after the plane.
    const env = smooth((u - 0.04) / 0.14) * (1 - smooth((u - (c - 0.035)) / 0.06));
    if (env <= 0.003) return;
    const here = this.world === tr.from.world ? tr.from : tr.to;
    // The screen's frame as it appears now (a quad; skip if any corner is behind the camera).
    const quad = [
      [-1, 1],
      [1, 1],
      [1, -1],
      [-1, -1],
    ].map(([sx, sy]) => new THREE.Vector3((sx * here.width) / 2, (sy * here.height) / 2, 0).applyMatrix4(here.frame).project(this.camera));
    if (quad.some((q) => q.z >= 1)) return;
    const [TL, TR, BR, BL] = quad.map((q) => [(q.x * 0.5 + 0.5) * W, (0.5 - q.y * 0.5) * H] as const);
    const lerp2 = (p: readonly [number, number], q: readonly [number, number], t: number) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t] as const;
    const line = (ax: number, ay: number, bx: number, by: number) => {
      g.beginPath();
      g.moveTo(ax, ay);
      g.lineTo(bx, by);
      g.stroke();
    };
    g.save();
    g.lineCap = 'round';
    g.shadowColor = 'rgba(255,255,255,0.55)';
    g.shadowBlur = 5 * this.pr;
    // Screen frame → threshold frame.
    g.strokeStyle = `rgba(255,255,255,${0.8 * env * smooth((u - 0.12) / 0.12)})`;
    g.lineWidth = 1.4 * this.pr;
    g.beginPath();
    [TL, TR, BR, BL].forEach((p, k) => (k === 0 ? g.moveTo(p[0], p[1]) : g.lineTo(p[0], p[1])));
    g.closePath();
    g.stroke();
    if (a.link === 'L2' && a.capture && a.capture.verticals.length) {
      // Match cut: the railing traced where it stood at departure; as the camera closes in, its
      // verticals fold into the screen frame as the bookshelf's dividers, and the fascia's top and
      // bottom edges become the frame's top and bottom: the planks above and below the opening.
      const k = smooth((u - 0.16) / Math.max(0.05, c - 0.26));
      const src = a.capture.verticals;
      const n = Math.min(18, src.length);
      g.lineWidth = 1.1 * this.pr;
      g.strokeStyle = `rgba(255,255,255,${0.6 * env})`;
      for (let i = 0; i < n; i++) {
        const sv = src[Math.round((i / Math.max(1, n - 1)) * (src.length - 1))];
        const t = (i + 0.5) / n;
        const top = lerp2(TL, TR, t);
        const bot = lerp2(BL, BR, t);
        line(
          sv[0] * W + (top[0] - sv[0] * W) * k,
          sv[1] * H + (top[1] - sv[1] * H) * k,
          sv[2] * W + (bot[0] - sv[2] * W) * k,
          sv[3] * H + (bot[1] - sv[3] * H) * k,
        );
      }
      g.lineWidth = 1.6 * this.pr;
      g.strokeStyle = `rgba(240,201,143,${0.85 * env})`;
      const edges: [number[] | null, readonly [number, number], readonly [number, number]][] = [
        [a.capture.top, TL, TR],
        [a.capture.bottom, BL, BR],
      ];
      for (const [e, p, q] of edges) {
        if (!e) continue;
        line(e[0] * W + (p[0] - e[0] * W) * k, e[1] * H + (p[1] - e[1] * H) * k, e[2] * W + (q[0] - e[2] * W) * k, e[3] * H + (q[1] - e[3] * H) * k);
      }
    }
    g.restore();
  }

  // ───────────────────────── input ─────────────────────────

  private onPointerMove = (e: PointerEvent) => {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.pointerPx = { x: e.clientX - r.left, y: e.clientY - r.top };
    if (this.dragging && !this.active) {
      // Deltas from positions (movementX/Y is not reported for touch on every browser).
      const dx = e.clientX - this.lastX;
      const dy = e.clientY - this.lastY;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      this.dragMoved += Math.abs(dx) + Math.abs(dy);
      const lim = LOOK_LIMITS[this.stage];
      this.yaw = THREE.MathUtils.clamp(this.yaw - dx * 0.0032, -lim.yaw, lim.yaw);
      this.pitch = THREE.MathUtils.clamp(this.pitch - dy * 0.0028, -lim.pitch, lim.pitch);
    }
  };

  private lastX = 0;
  private lastY = 0;

  private onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    this.dragging = true;
    this.dragMoved = 0;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.renderer.domElement.setPointerCapture?.(e.pointerId);
  };

  private onPointerUp = (e: PointerEvent) => {
    const wasClick = this.dragging && this.dragMoved < 6;
    this.dragging = false;
    this.renderer.domElement.releasePointerCapture?.(e.pointerId);
    if (!wasClick || this.active) return;
    // Pick at the release point: a touch has no hover before the tap.
    const r = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.pointerPx = { x: e.clientX - r.left, y: e.clientY - r.top };
    this.updateHover();
    const h = this.hover;
    if (!h) return;
    if (h.end === this.ends.A) this.goTo('studio');
    else if (h.end === this.ends.B) this.goTo('printer');
    else if (h.end === this.ends.B2) this.goTo('murph');
    else if (h.end === this.ends.C) this.goTo('studio');
    else if (h.feature) this.setStudioView(h.feature === 'stair' ? 'stair' : h.feature === 'mezzanine' ? 'mezzanine' : 'windows');
  };

  private onLeave = () => {
    this.pointer.set(2, 2);
  };

  private bindInput() {
    const el = this.renderer.domElement;
    el.addEventListener('pointermove', this.onPointerMove);
    el.addEventListener('pointerdown', this.onPointerDown);
    el.addEventListener('pointerup', this.onPointerUp);
    el.addEventListener('pointerleave', this.onLeave);
  }

  private unbindInput() {
    const el = this.renderer.domElement;
    el.removeEventListener('pointermove', this.onPointerMove);
    el.removeEventListener('pointerdown', this.onPointerDown);
    el.removeEventListener('pointerup', this.onPointerUp);
    el.removeEventListener('pointerleave', this.onLeave);
  }

  private labelFor(e: ThresholdEnd): string {
    if (e === this.ends.A) return 'Enter studio';
    if (e === this.ends.B) return 'Return · printer';
    if (e === this.ends.B2) return "Continue · Murph's room";
    return 'Return · studio';
  }

  private updateHover() {
    if (this.active || this.dragging) return;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const W = this.world;
    const targets: THREE.Object3D[] = [];
    const ends = Object.values(this.ends).filter((e) => e.world === W);
    ends.forEach((e) => targets.push(e.surface));
    // The screen's bezel counts as part of the target (a slightly larger, forgiving hit area).
    const bezels = W === this.printerW ? [this.printerW.printer.bezel] : W === this.studioW ? this.studioW.printers.map((p) => p.bezel) : [];
    targets.push(...bezels);
    const features = W === this.studioW ? this.studioW.features.map((f) => f.mesh) : [];
    targets.push(...features);
    // The bookshelf opening is invisible when idle; still let it be found.
    const hits = this.raycaster.intersectObjects(targets, false);
    let next: typeof this.hover = null;
    if (hits.length) {
      const o = hits[0].object;
      const end = ends.find((e) => e.surface === o) ?? (o === bezels[0] ? (W === this.printerW ? this.ends.A : this.ends.B) : o === bezels[1] ? this.ends.B2 : undefined);
      if (end) next = { end };
      else {
        const f = W === this.studioW ? this.studioW.features.find((x) => x.mesh === o) : undefined;
        if (f) next = { feature: f.key };
      }
    }
    const changed = next?.end !== this.hover?.end || next?.feature !== this.hover?.feature;
    this.hover = next;
    this.renderer.domElement.style.cursor = next ? 'pointer' : this.dragging ? 'grabbing' : 'grab';
    // Edge highlight on the bezel.
    if (this.printerW.printer.bezelMat) this.printerW.printer.bezelMat.emissiveIntensity = next?.end === this.ends.A ? 0.35 : 0;
    this.studioW.printers[0].bezelMat.emissiveIntensity = next?.end === this.ends.B ? 0.35 : 0;
    this.studioW.printers[1].bezelMat.emissiveIntensity = next?.end === this.ends.B2 ? 0.35 : 0;
    if (!next) {
      if (changed) this.events.onHover?.(null);
      return;
    }
    if (next.end) {
      // Anchor the label above the physical screen (it follows the screen through any resize).
      const e = next.end;
      const top = new THREE.Vector3(0, e.height / 2 + e.height * 0.35, 0).applyMatrix4(e.frame).project(this.camera);
      this.events.onHover?.({ label: this.labelFor(e), x: (top.x * 0.5 + 0.5) * this.w, y: (1 - (top.y * 0.5 + 0.5)) * this.h, kind: 'threshold' });
    } else if (next.feature) {
      const names = { stair: 'Staircase · view', mezzanine: 'Mezzanine · view from above', windows: 'Windows · worktables' };
      this.events.onHover?.({ label: names[next.feature], x: this.pointerPx.x, y: this.pointerPx.y - 18, kind: 'feature' });
    }
  }

  /** Screen position of a threshold end's centre (for tests and the HUD). */
  screenPoint(key: 'A' | 'B' | 'B2' | 'C'): { x: number; y: number; visible: boolean } {
    const e = this.ends[key];
    const p = endCenter(e).project(this.camera);
    return { x: (p.x * 0.5 + 0.5) * this.w, y: (1 - (p.y * 0.5 + 0.5)) * this.h, visible: e.world === this.world && p.z < 1 };
  }

  get currentWorld(): WorldKey {
    return this.world.key;
  }
}

function smooth(x: number): number {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}
