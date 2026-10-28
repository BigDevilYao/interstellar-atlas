import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import { Bloom } from './bloom';
import { TONE } from './glsl';
import { SCENE_BUILDERS } from './registry';
import { TRANSITION_INDEX, createTransitionMaterial } from './transitions';
import type { Chapter, SceneInstance, SceneKey, TransitionKind } from './types';
import { starSphere } from './lib';

/**
 * CINEMA ENGINE
 * One WebGL renderer, two HDR render targets (outgoing / incoming scene), a transition pass,
 * bloom, and a filmic grade. A small director sequences chapters for the Guided Journey,
 * or holds a single scene in free-look mode.
 */

export interface EngineEvents {
  onChapter?: (index: number) => void;
  onTick?: (info: { index: number; k: number; transition: number | null; to: number | null; playing: boolean }) => void;
  onEnd?: () => void;
  onQualityDrop?: () => void;
}

interface Live {
  inst: SceneInstance;
  key: SceneKey;
  variant?: string;
}

const gradeVertex = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const gradeFragment = /* glsl */ `
  ${TONE}
  uniform sampler2D tDiffuse; uniform sampler2D tBloom; uniform float uBloom, uExposure, uTime, uFade, uAspect;
  varying vec2 vUv;
  float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  void main() {
    vec2 c = vUv - 0.5;
    float r2 = dot(c * vec2(uAspect, 1.0), c * vec2(uAspect, 1.0));
    // Subtle chromatic aberration toward the edges.
    vec2 off = c * 0.0035 * (0.3 + r2 * 2.0);
    vec3 col = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
    col += texture2D(tBloom, vUv).rgb * uBloom;
    col = max(col, 0.0) * uExposure;
    col = acesFilm(col);
    // Split toning: cool shadows, warm highlights.
    float l = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(col, col * vec3(0.92, 0.98, 1.06), (1.0 - l) * 0.25);
    col = mix(col, col * vec3(1.05, 1.0, 0.92), l * 0.2);
    // Vignette and film grain.
    col *= 1.0 - smoothstep(0.2, 0.95, r2 * 1.4) * 0.55;
    col = toSRGB(col);
    col += (h(vUv * 1000.0 + uTime) - 0.5) * 0.035;
    col *= uFade;
    gl_FragColor = vec4(col, 1.0);
  }
`;

function blankScene(): SceneInstance {
  const scene = new THREE.Scene();
  scene.add(starSphere(1500));
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 2000);
  return { scene, camera, exposure: 1, focus: new THREE.Vector3(0, 0, -1), update() {}, dispose() {} };
}

export class CinemaEngine {
  readonly renderer: THREE.WebGLRenderer;
  private host: HTMLElement;
  private rtA!: THREE.WebGLRenderTarget;
  private rtB!: THREE.WebGLRenderTarget;
  private rtMix!: THREE.WebGLRenderTarget;
  private bloom: Bloom;
  private transQuad: FullScreenQuad;
  private transMat: THREE.ShaderMaterial;
  private gradeQuad: FullScreenQuad;
  private gradeMat: THREE.ShaderMaterial;
  private controls: OrbitControls | null = null;
  private ro: ResizeObserver;
  private raf = 0;
  private clock = new THREE.Clock();
  private width = 1;
  private height = 1;
  private quality: 'high' | 'low';
  private reducedMotion: boolean;
  private events: EngineEvents;
  private anchorLayer: HTMLElement | null = null;
  private anchorEls: HTMLElement[] = [];

  // Director state
  private mode: 'journey' | 'scene' = 'journey';
  private chapters: Chapter[] = [];
  private index = 0;
  private chapterTime = 0;
  private time = 0;
  private playing = true;
  private current: Live | null = null;
  private next: Live | null = null;
  private nextIndex = -1;
  private transition: { kind: TransitionKind; t: number; dur: number; to: number; emitted: boolean } | null = null;
  private fade = 0;
  private exposure = 1;
  private perf = { frames: 0, time: 0 };
  private disposed = false;

  constructor(host: HTMLElement, opts: { quality: 'high' | 'low'; reducedMotion: boolean; events: EngineEvents }) {
    this.host = host;
    this.quality = opts.quality;
    this.reducedMotion = opts.reducedMotion;
    this.events = opts.events;
    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x000000, 1);
    const el = this.renderer.domElement;
    el.style.display = 'block';
    el.style.width = '100%';
    el.style.height = '100%';
    el.style.touchAction = 'none';
    host.prepend(el);

    this.bloom = new Bloom();
    this.transMat = createTransitionMaterial();
    this.transQuad = new FullScreenQuad(this.transMat);
    this.gradeMat = new THREE.ShaderMaterial({
      vertexShader: gradeVertex,
      fragmentShader: gradeFragment,
      uniforms: { tDiffuse: { value: null }, tBloom: { value: null }, uBloom: { value: 0.8 }, uExposure: { value: 1 }, uTime: { value: 0 }, uFade: { value: 0 }, uAspect: { value: 1 } },
      depthTest: false,
      depthWrite: false,
    });
    this.gradeQuad = new FullScreenQuad(this.gradeMat);
    this.createTargets();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(host);
    this.resize();
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  // ───────────────────────── setup ─────────────────────────

  private createTargets() {
    const samples = this.quality === 'high' ? 4 : 0;
    const opts = { type: THREE.HalfFloatType, samples, depthBuffer: true } as const;
    this.rtA?.dispose();
    this.rtB?.dispose();
    this.rtMix?.dispose();
    this.rtA = new THREE.WebGLRenderTarget(4, 4, opts);
    this.rtB = new THREE.WebGLRenderTarget(4, 4, opts);
    this.rtMix = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, depthBuffer: false });
  }

  private pixelRatio() {
    const dpr = window.devicePixelRatio || 1;
    return Math.min(dpr, this.quality === 'high' ? 1.5 : 1);
  }

  private resize() {
    this.width = Math.max(1, this.host.clientWidth);
    this.height = Math.max(1, this.host.clientHeight);
    const pr = this.pixelRatio();
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(this.width, this.height, false);
    const w = Math.round(this.width * pr);
    const h = Math.round(this.height * pr);
    this.rtA.setSize(w, h);
    this.rtB.setSize(w, h);
    this.rtMix.setSize(w, h);
    this.bloom.setSize(w, h);
    this.transMat.uniforms.uAspect.value = this.width / this.height;
    this.gradeMat.uniforms.uAspect.value = this.width / this.height;
    for (const l of [this.current, this.next]) if (l) this.fitCamera(l.inst);
  }

  private fitCamera(inst: SceneInstance) {
    inst.camera.aspect = this.width / this.height;
    inst.camera.updateProjectionMatrix();
    inst.resize?.(this.width, this.height);
  }

  setQuality(q: 'high' | 'low') {
    if (q === this.quality) return;
    this.quality = q;
    this.createTargets();
    this.resize();
  }

  setReducedMotion(v: boolean) {
    this.reducedMotion = v;
  }

  setAnchorLayer(el: HTMLElement | null) {
    this.anchorLayer = el;
    this.rebuildAnchors();
  }

  // ───────────────────────── scenes ─────────────────────────

  private build(key: SceneKey, variant?: string): Live {
    let inst: SceneInstance;
    try {
      inst = SCENE_BUILDERS[key]({ renderer: this.renderer, quality: this.quality, width: this.width, height: this.height }, variant);
    } catch (err) {
      console.error(`[cinema] failed to build scene "${key}"`, err);
      inst = blankScene();
    }
    this.fitCamera(inst);
    // Compile shaders up front to avoid a hitch at the cut.
    try {
      this.renderer.compile(inst.scene, inst.camera);
    } catch {
      /* compile is an optimisation only */
    }
    return { inst, key, variant };
  }

  private release(l: Live | null) {
    if (!l) return;
    try {
      l.inst.dispose();
    } catch (err) {
      console.warn('[cinema] dispose error', err);
    }
  }

  /** Start a chapter playlist at `index`. */
  playJourney(chapters: Chapter[], index = 0) {
    this.mode = 'journey';
    this.chapters = chapters;
    this.detachControls();
    this.release(this.current);
    this.release(this.next);
    this.next = null;
    this.nextIndex = -1;
    this.transition = null;
    this.index = Math.max(0, Math.min(chapters.length - 1, index));
    const ch = chapters[this.index];
    this.current = this.build(ch.scene, ch.variant);
    this.chapterTime = 0;
    this.playing = true;
    this.fade = 0;
    this.exposure = this.current.inst.exposure;
    this.rebuildAnchors();
    this.events.onChapter?.(this.index);
  }

  /** Hold one scene in free-look mode. */
  showScene(key: SceneKey, variant?: string, duration = 24) {
    this.mode = 'scene';
    this.release(this.current);
    this.release(this.next);
    this.next = null;
    this.transition = null;
    this.current = this.build(key, variant);
    this.chapters = [];
    this.chapterTime = 0;
    this.sceneDuration = duration;
    this.fade = 0;
    this.exposure = this.current.inst.exposure;
    // Start from a representative point of the scripted path, then hand over to orbit.
    this.current.inst.update(0, 0.016, 0.35, false);
    this.attachControls(this.current.inst);
    this.rebuildAnchors();
  }
  private sceneDuration = 24;

  private attachControls(inst: SceneInstance) {
    this.detachControls();
    const c = new OrbitControls(inst.camera, this.renderer.domElement);
    c.target.copy(inst.focus);
    c.enableDamping = true;
    c.dampingFactor = 0.08;
    c.enablePan = false;
    c.rotateSpeed = 0.45;
    const d = inst.camera.position.distanceTo(inst.focus);
    c.minDistance = d * 0.35;
    c.maxDistance = d * 2.2;
    c.update();
    this.controls = c;
  }

  private detachControls() {
    this.controls?.dispose();
    this.controls = null;
  }

  // ───────────────────────── director ─────────────────────────

  setPlaying(p: boolean) {
    this.playing = p;
  }

  /** Stop rendering entirely while another full-screen layer covers the stage. */
  suspend(v: boolean) {
    if (v === this.suspended || this.disposed) return;
    this.suspended = v;
    if (v) cancelAnimationFrame(this.raf);
    else {
      this.clock.getDelta();
      this.raf = requestAnimationFrame(this.loop);
    }
  }
  private suspended = false;

  /** Jump within the current chapter (0..1). */
  seek(k: number) {
    if (this.mode !== 'journey' || !this.chapters.length) return;
    this.chapterTime = Math.max(0, Math.min(1, k)) * this.chapters[this.index].duration;
  }

  /** Force a transition preview (testing / scrubbing): renders A→B at progress p. */
  previewTransition(to: number, p: number) {
    if (this.mode !== 'journey') return;
    this.ensureNext(to);
    const enter = this.chapters[to].enter;
    const dur = enter?.duration ?? 2.2;
    this.transition = { kind: enter?.kind ?? 'timelapse', t: p * dur, dur, to, emitted: true };
    this.playing = false;
    this.frozenTransition = true;
  }
  private frozenTransition = false;

  isPlaying() {
    return this.playing;
  }

  next_() {
    if (this.mode !== 'journey' || this.transition) return;
    if (this.index < this.chapters.length - 1) this.beginTransition(this.index + 1);
  }

  prev() {
    if (this.mode !== 'journey' || this.transition) return;
    if (this.index > 0) this.beginTransition(this.index - 1, 'timelapse', 1.2);
  }

  goto(i: number) {
    if (this.mode !== 'journey' || this.transition || i === this.index) return;
    if (i < 0 || i >= this.chapters.length) return;
    this.beginTransition(i, i === this.index + 1 ? undefined : 'timelapse', i === this.index + 1 ? undefined : 1.2);
  }

  private ensureNext(i: number) {
    if (this.next && this.nextIndex === i) return;
    this.release(this.next);
    const ch = this.chapters[i];
    this.next = this.build(ch.scene, ch.variant);
    this.nextIndex = i;
  }

  private beginTransition(to: number, kind?: TransitionKind, dur?: number) {
    this.ensureNext(to);
    const enter = this.chapters[to].enter;
    const d = this.reducedMotion ? 0.6 : dur ?? enter?.duration ?? 2.2;
    this.transition = { kind: kind ?? enter?.kind ?? 'timelapse', t: 0, dur: d, to, emitted: false };
  }

  private endTransition() {
    if (!this.transition) return;
    const to = this.transition.to;
    const carried = this.transition.dur;
    this.release(this.current);
    this.current = this.next;
    this.next = null;
    this.nextIndex = -1;
    this.index = to;
    this.chapterTime = Math.min(carried, this.chapters[to].duration * 0.3);
    this.transition = null;
    this.rebuildAnchors();
  }

  // ───────────────────────── frame ─────────────────────────

  private renderInto(l: Live, target: THREE.WebGLRenderTarget) {
    l.inst.preRender?.(this.renderer);
    this.renderer.setRenderTarget(target);
    this.renderer.clear();
    this.renderer.render(l.inst.scene, l.inst.camera);
  }

  private loop() {
    if (this.disposed || this.suspended) return;
    this.raf = requestAnimationFrame(this.loop);
    const raw = this.clock.getDelta();
    const dt = Math.min(raw, 0.05);
    this.time += dt;
    this.fade = Math.min(1, this.fade + Math.min(raw, 0.25) / 1.2);
    this.monitor(raw);

    if (!this.current) {
      this.renderer.setRenderTarget(null);
      this.renderer.clear();
      return;
    }

    let k = 0;
    if (this.mode === 'journey') {
      const ch = this.chapters[this.index];
      if (this.playing && !this.transition) this.chapterTime += dt;
      k = Math.min(1, this.chapterTime / ch.duration);
      // Prepare the next scene ahead of the cut.
      if (k > 0.55 && this.index < this.chapters.length - 1 && !this.next) this.ensureNext(this.index + 1);
      if (k >= 1 && this.playing && !this.transition) {
        if (this.index < this.chapters.length - 1) this.beginTransition(this.index + 1);
        else {
          this.playing = false;
          this.events.onEnd?.();
        }
      }
    } else {
      // Free-look: animations breathe back and forth.
      this.chapterTime += dt;
      k = 0.5 - 0.5 * Math.cos((this.chapterTime / this.sceneDuration) * Math.PI);
      this.controls?.update();
    }

    const motion = this.reducedMotion ? 0.25 : 1;
    this.current.inst.update(this.time, dt * motion, k, this.mode === 'scene');

    const tr = this.transition;
    let exposure = this.current.inst.exposure;
    if (tr && this.next) {
      if (!this.frozenTransition) tr.t += dt;
      const p = Math.min(1, tr.t / tr.dur);
      const kNext = Math.min(1, tr.t / this.chapters[tr.to].duration);
      this.next.inst.update(this.time, dt * motion, kNext, false);
      this.renderInto(this.current, this.rtA);
      this.renderInto(this.next, this.rtB);
      this.transMat.uniforms.tA.value = this.rtA.texture;
      this.transMat.uniforms.tB.value = this.rtB.texture;
      this.transMat.uniforms.uP.value = p;
      this.transMat.uniforms.uTime.value = this.time;
      this.transMat.uniforms.uKind.value = TRANSITION_INDEX[tr.kind];
      this.renderer.setRenderTarget(this.rtMix);
      this.transQuad.render(this.renderer);
      exposure = THREE.MathUtils.lerp(exposure, this.next.inst.exposure, p);
      if (!tr.emitted && p >= 0.5) {
        tr.emitted = true;
        this.events.onChapter?.(tr.to);
      }
      if (p >= 1 && !this.frozenTransition) this.endTransition();
    } else {
      this.renderInto(this.current, this.rtA);
      // Copy A into the mix target through the transition shader at p = 0 (cheap pass-through).
      this.transMat.uniforms.tA.value = this.rtA.texture;
      this.transMat.uniforms.tB.value = this.rtA.texture;
      this.transMat.uniforms.uP.value = 0;
      this.transMat.uniforms.uKind.value = 3;
      this.renderer.setRenderTarget(this.rtMix);
      this.transQuad.render(this.renderer);
    }

    this.exposure += (exposure - this.exposure) * Math.min(1, dt * 3);
    const bl = (tr && this.next && tr.t / tr.dur > 0.5 ? this.next.inst.bloom : this.current?.inst.bloom) ?? { strength: 0.85, radius: 0.6, threshold: 0.82 };
    this.bloom.strength += (bl.strength - this.bloom.strength) * Math.min(1, dt * 3);
    this.bloom.radius = bl.radius;
    this.bloom.threshold = bl.threshold;
    this.bloom.render(this.renderer, this.rtMix.texture, this.rtMix.width, this.rtMix.height);
    this.gradeMat.uniforms.tDiffuse.value = this.rtMix.texture;
    this.gradeMat.uniforms.tBloom.value = this.bloom.texture;
    this.gradeMat.uniforms.uBloom.value = this.bloom.strength;
    this.gradeMat.uniforms.uExposure.value = this.exposure;
    this.gradeMat.uniforms.uTime.value = this.time;
    this.gradeMat.uniforms.uFade.value = this.fade;
    this.renderer.setRenderTarget(null);
    this.gradeQuad.render(this.renderer);

    this.updateAnchors();
    this.events.onTick?.({ index: this.index, k, transition: this.transition ? this.transition.t / this.transition.dur : null, to: this.transition ? this.transition.to : null, playing: this.playing });
  }

  private monitor(raw: number) {
    if (this.quality !== 'high' || this.time < 3) return;
    this.perf.frames++;
    this.perf.time += raw;
    if (this.perf.time > 3) {
      if (this.perf.frames / this.perf.time < 28) {
        this.setQuality('low');
        this.events.onQualityDrop?.();
      }
      this.perf = { frames: 0, time: 0 };
    }
  }

  // ───────────────────────── annotations ─────────────────────────

  private rebuildAnchors() {
    this.anchorEls.forEach((e) => e.remove());
    this.anchorEls = [];
    if (!this.anchorLayer || this.mode !== 'scene' || !this.current?.inst.anchors) return;
    for (const a of this.current.inst.anchors) {
      const el = document.createElement('div');
      el.className = 'hud-anchor';
      el.innerHTML = `<span class="hud-anchor__dot"></span><span class="hud-anchor__line"></span><span class="hud-anchor__label">${a.label}</span>`;
      this.anchorLayer.appendChild(el);
      this.anchorEls.push(el);
    }
  }

  private v = new THREE.Vector3();
  private updateAnchors() {
    if (!this.anchorEls.length || !this.current?.inst.anchors) return;
    const cam = this.current.inst.camera;
    this.current.inst.anchors.forEach((a, i) => {
      const el = this.anchorEls[i];
      this.v.copy(a.at).project(cam);
      const vis = this.v.z < 1 && Math.abs(this.v.x) < 1.1 && Math.abs(this.v.y) < 1.1;
      el.style.opacity = vis ? '1' : '0';
      el.style.transform = `translate3d(${(this.v.x * 0.5 + 0.5) * this.width}px, ${(-this.v.y * 0.5 + 0.5) * this.height}px, 0)`;
    });
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.detachControls();
    this.release(this.current);
    this.release(this.next);
    this.anchorEls.forEach((e) => e.remove());
    this.rtA.dispose();
    this.rtB.dispose();
    this.rtMix.dispose();
    this.bloom.dispose();
    this.transQuad.dispose();
    this.gradeQuad.dispose();
    this.transMat.dispose();
    this.gradeMat.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
