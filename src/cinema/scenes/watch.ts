import * as THREE from 'three';
import { canvasTexture, clamp01, easeInOut, lerp, rng, seg } from '../lib';

/**
 * THE WATCH — a modelled wristwatch (steel case, domed crystal, printed dial, hands, crown and
 * a leather strap looped behind it so it stands on the shelf), plus the animated "watch story"
 * used in Chapter 12. The story restates the line-diagram ideas in 3D:
 *
 *   gravity crosses time → the second hand holds for long and short intervals →
 *   the intervals are Morse (dots and dashes ring the dial) → they decode into quantum data →
 *   the data becomes the solution (a cylindrical habitat).
 *
 * Everything is original procedural geometry; no branding, no film imagery.
 */

// ───────────────────────── model ─────────────────────────

function dialTexture() {
  return canvasTexture(1024, 1024, (c) => {
    const S = 1024;
    const cx = S / 2;
    const g = c.createRadialGradient(cx, cx * 0.85, S * 0.05, cx, cx, S * 0.5);
    g.addColorStop(0, '#f4efe3');
    g.addColorStop(0.75, '#e6decb');
    g.addColorStop(1, '#cfc4ab');
    c.fillStyle = g;
    c.fillRect(0, 0, S, S);
    // fine sunburst brushing
    c.globalAlpha = 0.05;
    for (let i = 0; i < 360; i++) {
      const a = (i / 360) * Math.PI * 2;
      c.strokeStyle = i % 2 ? '#ffffff' : '#9a8f78';
      c.beginPath();
      c.moveTo(cx, cx);
      c.lineTo(cx + Math.cos(a) * S, cx + Math.sin(a) * S);
      c.stroke();
    }
    c.globalAlpha = 1;
    // minute track
    c.strokeStyle = '#2a2622';
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      const major = i % 5 === 0;
      const r0 = S * (major ? 0.385 : 0.44);
      const r1 = S * 0.47;
      c.lineWidth = major ? 14 : 4;
      c.beginPath();
      c.moveTo(cx + Math.sin(a) * r0, cx - Math.cos(a) * r0);
      c.lineTo(cx + Math.sin(a) * r1, cx - Math.cos(a) * r1);
      c.stroke();
    }
    c.beginPath();
    c.lineWidth = 3;
    c.arc(cx, cx, S * 0.475, 0, Math.PI * 2);
    c.stroke();
    // numerals 12 3 6 9
    c.fillStyle = '#1f1b18';
    c.font = '600 96px "Helvetica Neue", Arial, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const R = S * 0.3;
    [
      ['12', 0],
      ['3', 1],
      ['6', 2],
      ['9', 3],
    ].forEach(([t, q]) => {
      const a = ((q as number) / 4) * Math.PI * 2;
      c.fillText(t as string, cx + Math.sin(a) * R, cx - Math.cos(a) * R);
    });
    // small seconds register ring (decorative) and maker-free legend
    c.font = '500 30px "Helvetica Neue", Arial, sans-serif';
    c.fillStyle = '#5a5248';
    c.fillText('AUTOMATIC', cx, cx + S * 0.15);
    c.font = '400 22px "Helvetica Neue", Arial, sans-serif';
    c.fillText('· 21 JEWELS ·', cx, cx + S * 0.19);
  });
}

function handShape(len: number, w: number, tail = 0.18) {
  const s = new THREE.Shape();
  s.moveTo(-w * 0.5, -len * tail);
  s.lineTo(w * 0.5, -len * tail);
  s.lineTo(w * 0.32, len * 0.92);
  s.lineTo(0, len);
  s.lineTo(-w * 0.32, len * 0.92);
  s.closePath();
  return s;
}

export interface WatchModel {
  group: THREE.Group;
  second: THREE.Object3D;
  minute: THREE.Object3D;
  hour: THREE.Object3D;
  /** Radius of the dial (metres). */
  R: number;
  /** Dial centre in the group's local space. */
  center: THREE.Vector3;
  materials: THREE.MeshStandardMaterial[];
}

/** Build a watch of dial radius R, facing +Z, standing on its looped strap (base at y = 0). */
export function createWatch(R = 0.03): WatchModel {
  const group = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: '#d9d6cf', metalness: 1, roughness: 0.22 });
  const steelSatin = new THREE.MeshStandardMaterial({ color: '#bdb8ae', metalness: 1, roughness: 0.42 });
  const leather = new THREE.MeshStandardMaterial({ color: '#4a2d1a', roughness: 0.62, metalness: 0 });
  const handMat = new THREE.MeshStandardMaterial({ color: '#1b1a1a', metalness: 0.6, roughness: 0.35 });
  const secMat = new THREE.MeshStandardMaterial({ color: '#b5482a', metalness: 0.3, roughness: 0.4 });
  const dialMat = new THREE.MeshStandardMaterial({ map: dialTexture(), roughness: 0.55, metalness: 0 });
  const glass = new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0, roughness: 0.04, transparent: true, opacity: 0.1, depthWrite: false });

  const yC = R * 1.32;
  const center = new THREE.Vector3(0, yC, 0);
  const watch = new THREE.Group();
  watch.position.copy(center);
  group.add(watch);

  // Case: a turned profile (lathe), axis along Z.
  const prof: THREE.Vector2[] = [
    new THREE.Vector2(0.0, -R * 0.22),
    new THREE.Vector2(R * 1.02, -R * 0.22),
    new THREE.Vector2(R * 1.14, -R * 0.12),
    new THREE.Vector2(R * 1.17, R * 0.02),
    new THREE.Vector2(R * 1.13, R * 0.14),
    new THREE.Vector2(R * 1.05, R * 0.2),
    new THREE.Vector2(R * 1.0, R * 0.2),
  ];
  const caseGeo = new THREE.LatheGeometry(prof, 72);
  caseGeo.rotateX(Math.PI / 2);
  const caseMesh = new THREE.Mesh(caseGeo, steel);
  watch.add(caseMesh);
  // Bezel ring
  const bezel = new THREE.Mesh(new THREE.TorusGeometry(R * 1.03, R * 0.055, 16, 96), steel);
  bezel.position.z = R * 0.2;
  watch.add(bezel);
  // Dial
  const dial = new THREE.Mesh(new THREE.CircleGeometry(R * 0.99, 96), dialMat);
  dial.position.z = R * 0.12;
  watch.add(dial);
  // Hands (pivot at dial centre, pointing +Y at angle 0)
  const mkHand = (shape: THREE.Shape, mat: THREE.Material, z: number) => {
    const g = new THREE.ExtrudeGeometry(shape, { depth: R * 0.012, bevelEnabled: false });
    const m = new THREE.Mesh(g, mat);
    const pivot = new THREE.Group();
    pivot.position.z = z;
    pivot.add(m);
    watch.add(pivot);
    return pivot;
  };
  const hour = mkHand(handShape(R * 0.52, R * 0.09), handMat, R * 0.13);
  const minute = mkHand(handShape(R * 0.8, R * 0.065), handMat, R * 0.145);
  const secShape = handShape(R * 0.9, R * 0.022, 0.25);
  const second = mkHand(secShape, secMat, R * 0.16);
  const counter = new THREE.Mesh(new THREE.CircleGeometry(R * 0.06, 24), secMat);
  counter.position.set(0, -R * 0.2, R * 0.012);
  second.add(counter);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.045, R * 0.045, R * 0.03, 24), steel);
  cap.rotation.x = Math.PI / 2;
  cap.position.z = R * 0.18;
  watch.add(cap);
  // Domed crystal
  const dome = new THREE.Mesh(new THREE.SphereGeometry(R * 1.6, 48, 12, 0, Math.PI * 2, 0, 0.68), glass);
  dome.rotation.x = Math.PI / 2;
  dome.position.z = R * 0.2 - R * 1.6 * Math.cos(0.68);
  watch.add(dome);
  // Crown at 3 o'clock
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.13, R * 0.13, R * 0.16, 20), steelSatin);
  crown.rotation.z = Math.PI / 2;
  crown.position.set(R * 1.24, 0, 0);
  watch.add(crown);
  // Lugs
  for (const sy of [1, -1])
    for (const sx of [1, -1]) {
      const lug = new THREE.Mesh(new THREE.BoxGeometry(R * 0.14, R * 0.32, R * 0.2), steelSatin);
      lug.position.set(sx * R * 0.42, sy * R * 1.14, -R * 0.05);
      lug.rotation.x = sy * 0.25;
      watch.add(lug);
    }
  // Strap: a leather loop behind the case so the watch stands upright.
  const sw = R * 0.72;
  const st = R * 0.07;
  const shape = new THREE.Shape();
  shape.moveTo(-st / 2, -sw / 2);
  shape.lineTo(st / 2, -sw / 2);
  shape.lineTo(st / 2, sw / 2);
  shape.lineTo(-st / 2, sw / 2);
  shape.closePath();
  const loop = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(0, yC + R * 1.28, -R * 0.08),
      new THREE.Vector3(0, yC + R * 1.45, -R * 0.7),
      new THREE.Vector3(0, yC + R * 0.6, -R * 1.65),
      new THREE.Vector3(0, R * 0.25, -R * 1.55),
      new THREE.Vector3(0, R * 0.04, -R * 0.7),
      new THREE.Vector3(0, R * 0.06, -R * 0.15),
      new THREE.Vector3(0, yC - R * 1.28, -R * 0.08),
    ],
    false,
    'centripetal',
  );
  const strap = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { steps: 80, extrudePath: loop, bevelEnabled: false }), leather);
  group.add(strap);
  // Buckle
  const buckle = new THREE.Mesh(new THREE.TorusGeometry(R * 0.36, R * 0.04, 8, 4), steelSatin);
  buckle.scale.set(1.1, 0.6, 1);
  buckle.rotation.set(0.9, 0, Math.PI / 4);
  buckle.position.set(0, R * 0.42, -R * 1.6);
  group.add(buckle);

  group.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });
  return { group, second, minute, hour, R, center, materials: [steel, steelSatin, leather, handMat, secMat, dialMat] };
}

/** A small studio environment for metal reflections (applied to the watch materials only). */
export function watchEnvironment(renderer: THREE.WebGLRenderer, warm = true): THREE.Texture {
  const env = new THREE.Scene();
  const geo = new THREE.SphereGeometry(10, 32, 16);
  const cols: number[] = [];
  const pos = geo.attributes.position;
  const top = new THREE.Color(warm ? '#7a6a58' : '#5a6a80');
  const mid = new THREE.Color(warm ? '#3a2a1c' : '#1c2028');
  const bot = new THREE.Color('#120c08');
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 10;
    if (y > 0) c.copy(mid).lerp(top, y);
    else c.copy(mid).lerp(bot, -y);
    cols.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  env.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  // A window-like softbox and a lamp.
  const win = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(warm ? '#ffb070' : '#c8d8ff').multiplyScalar(3) }));
  win.position.set(8, 3, -2);
  win.lookAt(0, 0, 0);
  env.add(win);
  const lamp = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff2dc').multiplyScalar(4) }));
  lamp.position.set(-4, 5, 6);
  lamp.lookAt(0, 0, 0);
  env.add(lamp);
  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(env, 0.02);
  pm.dispose();
  geo.dispose();
  return rt.texture;
}

/** Normal timekeeping: the second hand steps once a second. */
export function setTime(w: WatchModel, seconds: number, base = 7 * 3600 + 41 * 60) {
  const s = base + seconds;
  w.second.rotation.z = -((Math.floor(s) % 60) / 60) * Math.PI * 2;
  w.minute.rotation.z = -(((s / 60) % 60) / 60) * Math.PI * 2;
  w.hour.rotation.z = -(((s / 3600) % 12) / 12) * Math.PI * 2;
}

// ───────────────────────── story ─────────────────────────

/** Total story length in seconds (must match the chapter duration). */
export const WATCH_STORY_SECONDS = 26;

/** Story beats as fractions of the chapter (k). */
export const WATCH_BEATS = {
  gravity: [0.16, 0.3],
  morse: [0.28, 0.7],
  data: [0.68, 0.85],
  solution: [0.83, 1],
} as const;

const MESSAGE: [string, string][] = [
  ['S', '...'],
  ['T', '-'],
  ['A', '.-'],
  ['Y', '-.--'],
  ['D', '-..'],
  ['A', '.-'],
  ['T', '-'],
  ['A', '.-'],
];
const DOT = 0.16;
const DASH = 0.48;
const GAP = 0.16;
const LETTER_GAP = 0.32;

interface Sym {
  t0: number; // seconds after the Morse beat begins
  hold: number;
  dash: boolean;
  letter: number;
  lastOfLetter: boolean;
}

const SYMS: Sym[] = (() => {
  const out: Sym[] = [];
  let t = 0.4;
  MESSAGE.forEach(([, code], li) => {
    code.split('').forEach((ch, i) => {
      const dash = ch === '-';
      const hold = dash ? DASH : DOT;
      out.push({ t0: t, hold, dash, letter: li, lastOfLetter: i === code.length - 1 });
      t += hold + GAP;
    });
    t += LETTER_GAP;
  });
  return out;
})();

function textTexture(text: string, px = 64, color = '#f0c98f', weight = 500) {
  const font = `${weight} ${px}px "IBM Plex Mono", ui-monospace, Consolas, monospace`;
  const meas = document.createElement('canvas').getContext('2d')!;
  meas.font = font;
  const w = Math.ceil(meas.measureText(text).width + px * 0.6);
  const h = Math.ceil(px * 1.5);
  const tex = canvasTexture(w, h, (c) => {
    c.font = font;
    c.fillStyle = color;
    c.textBaseline = 'middle';
    c.fillText(text, px * 0.3, h / 2);
  });
  return { tex, aspect: w / h };
}

function glowMat(map: THREE.Texture | null, color: THREE.ColorRepresentation, intensity = 2.2) {
  return new THREE.MeshBasicMaterial({
    map,
    color: new THREE.Color(color).multiplyScalar(intensity),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    opacity: 0,
  });
}

function capsuleTexture() {
  return canvasTexture(
    256,
    64,
    (c) => {
      const g = c.createLinearGradient(0, 0, 0, 64);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.5, 'rgba(255,255,255,1)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = '#fff';
      c.beginPath();
      c.roundRect(8, 18, 240, 28, 14);
      c.fill();
      c.globalAlpha = 0.35;
      c.fillStyle = g;
      c.fillRect(0, 0, 256, 64);
    },
    false,
  );
}

function glyphAtlas() {
  const chars = '0123456789ABCDEF';
  return canvasTexture(
    256,
    256,
    (c) => {
      c.fillStyle = '#fff';
      c.font = '500 48px "IBM Plex Mono", ui-monospace, Consolas, monospace';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      for (let i = 0; i < 16; i++) c.fillText(chars[i], (i % 4) * 64 + 32, Math.floor(i / 4) * 64 + 34);
    },
    false,
  );
}

export interface WatchStory {
  group: THREE.Group;
  /** Called every frame with the chapter progress k (0..1) and wall time t. */
  update(k: number, t: number): void;
  /** Recommended camera framing for the current k (relative to the dial centre). */
  frame(k: number, out: { pos: THREE.Vector3; look: THREE.Vector3 }): void;
  dispose(): void;
}

/**
 * Build the overlays around a watch whose dial centre is `c` (world space), facing +Z.
 * `backZ` is the depth of the wall behind the shelf (for the gravity strings).
 */
export function createWatchStory(w: WatchModel, c: THREE.Vector3, backZ: number, gapX: [number, number], shelfY: [number, number]): WatchStory {
  const R = w.R;
  const group = new THREE.Group();
  const gold = '#f0c98f';
  const disposables: { dispose(): void }[] = [];
  const track = <T extends { dispose(): void }>(x: T) => (disposables.push(x), x);

  // 1 · Gravity ripples on the face of the shelf, centred on the watch.
  const pulseTimes: number[] = [];
  for (let s = WATCH_BEATS.gravity[0] * WATCH_STORY_SECONDS; s < WATCH_BEATS.morse[0] * WATCH_STORY_SECONDS + 0.3; s += 0.85) pulseTimes.push(s);
  const morseStart = WATCH_BEATS.morse[0] * WATCH_STORY_SECONDS;
  SYMS.forEach((s) => pulseTimes.push(morseStart + s.t0));
  pulseTimes.sort((a, b) => a - b);

  const rippleMat = track(
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      uniforms: { uNow: { value: 0 }, uP: { value: new Array(6).fill(-99) }, uA: { value: 0 }, uR: { value: R } },
      vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform float uNow; uniform float uP[6]; uniform float uA; uniform float uR; varying vec2 vP;
        void main(){
          float d = length(vP);
          float a = 0.0;
          for (int i = 0; i < 6; i++) {
            float age = uNow - uP[i];
            if (age < 0.0 || age > 3.0) continue;
            float r = uR * 1.35 + age * 0.32;
            float w = 0.0012 + age * 0.0016;
            a += exp(-pow((d - r) / w, 2.0)) * exp(-age * 1.4);
          }
          a *= smoothstep(uR * 1.2, uR * 1.6, d) * (1.0 - smoothstep(0.32, 0.5, d));
          gl_FragColor = vec4(vec3(1.5, 1.1, 0.6) * a * uA, 1.0);
        }`,
    }),
  );
  const ripple = new THREE.Mesh(track(new THREE.PlaneGeometry(1.0, 1.0)), rippleMat);
  ripple.position.set(c.x, c.y, c.z + R * 0.9);
  group.add(ripple);

  // 2 · Gravity "strings" glimpsed behind the books, plucked on every pulse.
  const stringMat = track(
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      uniforms: { uT: { value: 0 }, uPluck: { value: 0 }, uA: { value: 0 } },
      vertexShader: `
        uniform float uT; uniform float uPluck; attribute float aSeed; varying float vY; varying float vS;
        void main(){
          vec3 p = position;
          float env = sin(clamp(uv.y, 0.0, 1.0) * 3.14159);
          p.x += sin(uv.y * 40.0 + uT * 60.0 + aSeed * 6.0) * 0.004 * uPluck * env;
          vY = uv.y; vS = aSeed;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0);
        }`,
      fragmentShader: `
        uniform float uA; uniform float uPluck; varying float vY; varying float vS;
        void main(){
          float a = (0.18 + 0.82 * uPluck) * uA * smoothstep(0.0, 0.15, vY) * smoothstep(1.0, 0.85, vY);
          gl_FragColor = vec4(vec3(1.3, 0.95, 0.5) * a, 1.0);
        }`,
    }),
  );
  const strings = new THREE.Group();
  const sr = rng(5);
  for (let i = 0; i < 4; i++) {
    const g = track(new THREE.PlaneGeometry(0.0012, shelfY[1] - shelfY[0], 1, 60));
    const seed = new Float32Array(g.attributes.position.count).fill(sr());
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    const m = new THREE.Mesh(g, stringMat);
    m.position.set(lerp(gapX[0], gapX[1], 0.12 + i * 0.25 + sr() * 0.05), (shelfY[0] + shelfY[1]) / 2, backZ);
    strings.add(m);
  }
  group.add(strings);

  // 3 · HUD bezel: 60 tick marks around the dial; the live second lights up.
  const tickGeo = track(new THREE.PlaneGeometry(R * 0.035, R * 0.16));
  const tickMat = track(glowMat(null, gold, 1.4));
  const ticks = new THREE.InstancedMesh(tickGeo, tickMat, 60);
  const tickColors = new Float32Array(60 * 3);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    const r = R * (i % 5 === 0 ? 1.62 : 1.58);
    const s = i % 5 === 0 ? 1.35 : 0.8;
    m4.compose(new THREE.Vector3(Math.sin(a) * r, Math.cos(a) * r, 0), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -a), new THREE.Vector3(1, s, 1));
    ticks.setMatrixAt(i, m4);
  }
  ticks.instanceColor = new THREE.InstancedBufferAttribute(tickColors, 3);
  const bezel = new THREE.Group();
  bezel.position.set(c.x, c.y, c.z + R * 0.45);
  bezel.add(ticks);
  // thin circle
  const ringGeo = track(new THREE.RingGeometry(R * 1.47, R * 1.485, 128));
  const ringMat = track(glowMat(null, gold, 1.2));
  bezel.add(new THREE.Mesh(ringGeo, ringMat));
  const ring2Geo = track(new THREE.RingGeometry(R * 2.64, R * 2.65, 160));
  const ring2 = new THREE.Mesh(ring2Geo, ringMat);
  bezel.add(ring2);
  group.add(bezel);

  // 4 · Morse ring: dots and dashes appear around the dial as the hand holds.
  const capTex = track(capsuleTexture());
  const symR = R * 2.2;
  const unit = R * 0.2; // arc length of a dot
  const symMeshes: { mesh: THREE.Mesh; sym: Sym; a0: number; len: number }[] = [];
  const letterMeshes: { mesh: THREE.Mesh; letter: number; at: number }[] = [];
  {
    let arc = 0;
    const totalArc = SYMS.reduce((s, x) => s + (x.dash ? unit * 3 : unit) + unit * 0.9 + (x.lastOfLetter ? unit * 1.6 : 0), 0);
    const scale = (Math.PI * 2 * symR * 0.94) / totalArc;
    let letterStart = 0;
    SYMS.forEach((s) => {
      const len = (s.dash ? unit * 3 : unit) * scale;
      const a0 = arc / symR;
      const mid = (arc + len / 2) / symR;
      const g = track(new THREE.PlaneGeometry(1, R * 0.16));
      const mat = track(glowMat(capTex, gold, 2.6));
      const mesh = new THREE.Mesh(g, mat);
      mesh.position.set(Math.sin(mid) * symR, Math.cos(mid) * symR, 0);
      mesh.rotation.z = -mid;
      mesh.scale.x = 0.0001;
      bezel.add(mesh);
      symMeshes.push({ mesh, sym: s, a0, len });
      arc += len + unit * 0.9 * scale;
      if (s.lastOfLetter) {
        const am = ((letterStart + arc - unit * 0.9 * scale) / 2) / symR;
        const { tex, aspect } = textTexture(MESSAGE[s.letter][0], 96, '#ffffff', 400);
        track(tex);
        const lg = track(new THREE.PlaneGeometry(R * 0.32 * aspect, R * 0.32));
        const lm = new THREE.Mesh(lg, track(glowMat(tex, '#ffe6bf', 1.5)));
        lm.position.set(Math.sin(am) * R * 2.95, Math.cos(am) * R * 2.95, 0);
        bezel.add(lm);
        letterMeshes.push({ mesh: lm, letter: s.letter, at: s.t0 + s.hold });
        arc += unit * 1.6 * scale;
        letterStart = arc;
      }
    });
  }

  // 5 · Labels (small sci-fi captions in space).
  const mkLabel = (text: string, h: number, x: number, y: number, z: number) => {
    const { tex, aspect } = textTexture(text, 56, '#f0c98f', 500);
    track(tex);
    const g = track(new THREE.PlaneGeometry(h * aspect, h));
    const mesh = new THREE.Mesh(g, track(glowMat(tex, '#ffffff', 1.25)));
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  };
  const lblGravity = mkLabel('GRAVITY · ACROSS TIME', R * 0.26, c.x - R * 2.6, c.y + R * 2.1, c.z + R * 3.0);
  const lblMorse = mkLabel('LONG / SHORT INTERVALS = · —', R * 0.17, c.x - R * 2.3, c.y + R * 2.05, c.z + R * 1.5);
  const lblData = mkLabel('QUANTUM DATA', R * 0.6, c.x, c.y + R * 8.2, c.z + R * 2.5);
  const lblSolve = mkLabel('THE SOLUTION · GRAVITY CONTROLLED', R * 0.7, c.x, c.y + R * 10.8, c.z + R * 4);

  // 6 · Quantum data: glyphs stream from the ring into columns, then into a habitat cylinder.
  const atlas = track(glyphAtlas());
  const N = 220;
  const glyphGeo = track(new THREE.PlaneGeometry(R * 0.28, R * 0.28));
  const aGlyph = new Float32Array(N);
  const aAlpha = new Float32Array(N);
  const gr = rng(9);
  for (let i = 0; i < N; i++) aGlyph[i] = Math.floor(gr() * 16);
  glyphGeo.setAttribute('aGlyph', new THREE.InstancedBufferAttribute(aGlyph, 1));
  const alphaAttr = new THREE.InstancedBufferAttribute(aAlpha, 1);
  alphaAttr.setUsage(THREE.DynamicDrawUsage);
  glyphGeo.setAttribute('aAlpha', alphaAttr);
  const glyphMat = track(
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      uniforms: { tAtlas: { value: atlas } },
      vertexShader: `
        attribute float aGlyph; attribute float aAlpha; varying vec2 vUv; varying float vA; varying float vG;
        void main(){
          vec2 cell = vec2(mod(aGlyph, 4.0), 3.0 - floor(aGlyph / 4.0));
          vUv = (uv + cell) / 4.0; vA = aAlpha; vG = aGlyph;
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform sampler2D tAtlas; varying vec2 vUv; varying float vA; varying float vG;
        void main(){
          float a = texture2D(tAtlas, vUv).a * vA;
          vec3 c = mod(vG, 5.0) < 1.0 ? vec3(2.6, 1.9, 1.0) : vec3(1.5, 1.45, 1.35);
          gl_FragColor = vec4(c * a, 1.0);
        }`,
    }),
  );
  const glyphs = new THREE.InstancedMesh(glyphGeo, glyphMat, N);
  glyphs.frustumCulled = false;
  group.add(glyphs);
  // start (on the Morse ring), column slot, cylinder slot
  const COLS = 22;
  const ROWS = 10;
  const start: THREE.Vector3[] = [];
  const colSlot: THREE.Vector3[] = [];
  const cylSlot: THREE.Vector3[] = [];
  const delay: number[] = [];
  const cylC = new THREE.Vector3(c.x, c.y + R * 4.6, c.z + R * 3.2);
  const cylR = R * 2.4;
  const cylL = R * 9;
  for (let i = 0; i < N; i++) {
    const a = gr() * Math.PI * 2;
    start.push(new THREE.Vector3(c.x + Math.sin(a) * symR, c.y + Math.cos(a) * symR, c.z + R * 0.5));
    const col = i % COLS;
    const row = Math.floor(i / COLS) % ROWS;
    colSlot.push(new THREE.Vector3(c.x + (col - (COLS - 1) / 2) * R * 0.42, c.y + R * 2.4 + row * R * 0.6, c.z + R * 2.2 + (gr() - 0.5) * R * 0.3));
    const ca = (i / N) * Math.PI * 2 * 7;
    const cx = ((i / N) - 0.5) * cylL;
    cylSlot.push(new THREE.Vector3(cylC.x + cx, cylC.y + Math.sin(ca) * cylR, cylC.z + Math.cos(ca) * cylR));
    delay.push(gr());
  }

  // Habitat hologram: rings + axial lines.
  const habPts: number[] = [];
  const NR = 9;
  for (let r = 0; r < NR; r++) {
    const x = (r / (NR - 1) - 0.5) * cylL;
    for (let s = 0; s < 64; s++) {
      const a0 = (s / 64) * Math.PI * 2;
      const a1 = ((s + 1) / 64) * Math.PI * 2;
      habPts.push(x, Math.sin(a0) * cylR, Math.cos(a0) * cylR, x, Math.sin(a1) * cylR, Math.cos(a1) * cylR);
    }
  }
  for (let s = 0; s < 16; s++) {
    const a = (s / 16) * Math.PI * 2;
    habPts.push(-cylL / 2, Math.sin(a) * cylR, Math.cos(a) * cylR, cylL / 2, Math.sin(a) * cylR, Math.cos(a) * cylR);
  }
  // axis
  habPts.push(-cylL / 2 - R, 0, 0, cylL / 2 + R, 0, 0);
  const habGeo = track(new THREE.BufferGeometry());
  habGeo.setAttribute('position', new THREE.Float32BufferAttribute(habPts, 3));
  const habMat = track(new THREE.LineBasicMaterial({ color: new THREE.Color(gold).multiplyScalar(1.8), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  const habitat = new THREE.LineSegments(habGeo, habMat);
  habitat.position.copy(cylC);
  group.add(habitat);

  const fade = (m: THREE.Mesh | THREE.LineSegments, a: number) => {
    const mat = m.material as THREE.MeshBasicMaterial;
    mat.opacity = a;
    m.visible = a > 0.002;
  };

  const tmp = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const scl = new THREE.Vector3();

  return {
    group,
    update(k, t) {
      const s = k * WATCH_STORY_SECONDS;
      const gA = seg(k, WATCH_BEATS.gravity[0], WATCH_BEATS.gravity[0] + 0.04) * (1 - seg(k, WATCH_BEATS.data[0] + 0.04, WATCH_BEATS.data[0] + 0.1));
      const mA = seg(k, WATCH_BEATS.morse[0] - 0.02, WATCH_BEATS.morse[0] + 0.02) * (1 - seg(k, WATCH_BEATS.data[0] + 0.05, WATCH_BEATS.data[0] + 0.1));

      // pulses
      let idx = -1;
      for (let i = 0; i < pulseTimes.length; i++) if (pulseTimes[i] <= s) idx = i;
      const arr = rippleMat.uniforms.uP.value as number[];
      for (let j = 0; j < 6; j++) arr[j] = idx - j >= 0 ? pulseTimes[idx - j] : -99;
      rippleMat.uniforms.uNow.value = s;
      rippleMat.uniforms.uA.value = gA;
      ripple.visible = gA > 0;
      const since = idx >= 0 ? s - pulseTimes[idx] : 9;
      stringMat.uniforms.uT.value = t;
      stringMat.uniforms.uPluck.value = Math.exp(-since * 5);
      stringMat.uniforms.uA.value = gA;
      strings.visible = gA > 0;

      // second hand: regular ticks, then held for long/short intervals during the Morse beat
      const ms = s - morseStart;
      let sec = Math.floor(s);
      let twitch = 0;
      let activeSym = -1;
      if (ms > 0) {
        let n = 0;
        for (let i = 0; i < SYMS.length; i++) {
          const y = SYMS[i];
          if (ms >= y.t0) n = i + 1;
          if (ms >= y.t0 && ms < y.t0 + y.hold) activeSym = i;
        }
        sec = Math.floor(morseStart) + n;
        if (activeSym >= 0) twitch = 0.09 + Math.sin(t * 90) * 0.012;
      }
      w.second.rotation.z = -((sec % 60) / 60) * Math.PI * 2 - twitch;
      const base = 7 * 3600 + 41 * 60 + s;
      w.minute.rotation.z = -(((base / 60) % 60) / 60) * Math.PI * 2;
      w.hour.rotation.z = -(((base / 3600) % 12) / 12) * Math.PI * 2;

      // bezel ticks
      const cur = ((sec % 60) + 60) % 60;
      for (let i = 0; i < 60; i++) {
        const lit = i === cur ? (activeSym >= 0 ? 2.2 : 1.4) : i < cur && ms > 0 ? 0.55 : 0.22;
        tickColors[i * 3] = tickColors[i * 3 + 1] = tickColors[i * 3 + 2] = lit;
      }
      ticks.instanceColor!.needsUpdate = true;
      tickMat.opacity = mA;
      ticks.visible = mA > 0;
      ringMat.opacity = mA * 0.7;

      // Morse ring
      symMeshes.forEach(({ mesh, sym }) => {
        const g = clamp01((ms - sym.t0) / sym.hold);
        mesh.scale.x = Math.max(0.0001, (sym.dash ? R * 0.6 : R * 0.2) * easeInOut(g));
        const flash = ms >= sym.t0 && ms < sym.t0 + sym.hold ? 1.6 : 1;
        fade(mesh, (g > 0 ? 1 : 0) * mA * flash);
      });
      letterMeshes.forEach(({ mesh, at }) => fade(mesh, clamp01((ms - at) / 0.4) * mA * 0.9));

      // labels
      fade(lblGravity, gA * (1 - seg(k, WATCH_BEATS.morse[0] + 0.05, WATCH_BEATS.morse[0] + 0.09)));
      fade(lblMorse, mA);
      const dA = seg(k, WATCH_BEATS.data[0], WATCH_BEATS.data[0] + 0.03) * (1 - seg(k, WATCH_BEATS.solution[0], WATCH_BEATS.solution[0] + 0.03));
      fade(lblData, dA);
      const sA = seg(k, WATCH_BEATS.solution[0] + 0.02, WATCH_BEATS.solution[0] + 0.06);
      fade(lblSolve, sA);

      // glyph flight
      const toCols = seg(k, WATCH_BEATS.data[0], WATCH_BEATS.data[0] + 0.1);
      const toCyl = seg(k, WATCH_BEATS.solution[0] - 0.01, WATCH_BEATS.solution[0] + 0.1);
      const glyphVis = toCols > 0;
      glyphs.visible = glyphVis;
      if (glyphVis) {
        for (let i = 0; i < N; i++) {
          const d = delay[i] * 0.45;
          const a = easeInOut(clamp01((toCols - d) / (1 - d)));
          const b = easeInOut(clamp01((toCyl - d * 0.5) / (1 - d * 0.5)));
          tmp.copy(start[i]).lerp(colSlot[i], a).lerp(cylSlot[i], b);
          // columns gently rain downward while hovering
          if (a > 0.99 && b < 0.01) tmp.y -= ((t * 0.02 + delay[i]) % 1) * R * 0.3;
          const sc = 1 - b * 0.45;
          m4.compose(tmp, q, scl.setScalar(sc));
          glyphs.setMatrixAt(i, m4);
          if (Math.random() < 0.02) aGlyph[i] = Math.floor(Math.random() * 16);
          aAlpha[i] = clamp01((toCols - d) * 6) * (0.4 + 0.6 * ((i * 7) % 11 === 0 ? 1 : 0.55)) * (1 - b * 0.4);
        }
        glyphs.instanceMatrix.needsUpdate = true;
        alphaAttr.needsUpdate = true;
        (glyphGeo.attributes.aGlyph as THREE.BufferAttribute).needsUpdate = true;
      }
      const hA = seg(k, WATCH_BEATS.solution[0] + 0.03, WATCH_BEATS.solution[0] + 0.1);
      habMat.opacity = hA * 0.9;
      habitat.visible = hA > 0;
      habitat.rotation.x = t * 0.35;
      habitat.scale.setScalar(0.85 + 0.15 * easeInOut(hA));
    },
    frame(k, out) {
      // Close on the dial for the Morse beat; pull back to reveal the data and the habitat.
      const close = new THREE.Vector3(c.x + R * 0.6, c.y + R * 0.4, c.z + R * 8.5);
      const closer = new THREE.Vector3(c.x + R * 0.2, c.y + R * 0.1, c.z + R * 7.0);
      const mid = new THREE.Vector3(c.x + R * 2, c.y + R * 4, c.z + R * 26);
      const wide = new THREE.Vector3(c.x - R * 3, c.y + R * 6, c.z + R * 36);
      const a = easeInOut(seg(k, WATCH_BEATS.morse[0], WATCH_BEATS.morse[1]));
      const b = easeInOut(seg(k, WATCH_BEATS.data[0] - 0.02, WATCH_BEATS.data[1]));
      const d = easeInOut(seg(k, WATCH_BEATS.solution[0], 1));
      out.pos.copy(close).lerp(closer, a).lerp(mid, b).lerp(wide, d);
      tmp.set(c.x, c.y + R * 0.1, c.z);
      out.look.copy(tmp).lerp(new THREE.Vector3(c.x, c.y + R * 4.2, c.z + R * 2), b).lerp(cylC, d);
    },
    dispose() {
      disposables.forEach((x) => x.dispose());
    },
  };
}
