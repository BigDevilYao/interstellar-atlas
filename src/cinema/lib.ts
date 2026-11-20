import * as THREE from 'three';
import { NOISE } from './glsl';

/** Shared helpers for building cinematic scenes. */

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};
export const easeInOut = (t: number) => {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
export const seg = (k: number, a: number, b: number) => clamp01((k - a) / (b - a));

export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── value noise in JS (terrain) ──
function hash2(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
export function vnoise(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi);
  const b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1);
  const d = hash2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x: number, y: number, oct = 5): number {
  let s = 0;
  let a = 0.5;
  for (let i = 0; i < oct; i++) {
    s += a * vnoise(x, y);
    x = x * 2.03 + 17.1;
    y = y * 2.03 + 9.7;
    a *= 0.5;
  }
  return s;
}
export function ridged(x: number, y: number, oct = 5): number {
  let s = 0;
  let a = 0.5;
  for (let i = 0; i < oct; i++) {
    const n = 1 - Math.abs(vnoise(x, y) * 2 - 1);
    s += a * n * n;
    x = x * 2.1 + 3.3;
    y = y * 2.1 + 7.7;
    a *= 0.5;
  }
  return s;
}

/** Displaced terrain plane (XZ) with normals. */
export function terrain(size: number, seg: number, height: (x: number, z: number) => number, depth = size): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(size, depth, seg, Math.round(seg * (depth / size)));
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) p.setY(i, height(p.getX(i), p.getZ(i)));
  g.computeVertexNormals();
  return g;
}

/** Gradient sky dome with sun glow and horizon haze. */
export function skyDome(o: {
  top: string;
  horizon: string;
  bottom?: string;
  sunDir?: THREE.Vector3;
  sunColor?: string;
  sunSize?: number;
  sunIntensity?: number;
  hazeHeight?: number;
  stars?: number;
  radius?: number;
  intensity?: number;
}): THREE.Mesh {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTop: { value: new THREE.Color(o.top) },
      uHorizon: { value: new THREE.Color(o.horizon) },
      uBottom: { value: new THREE.Color(o.bottom ?? o.horizon) },
      uSunDir: { value: (o.sunDir ?? new THREE.Vector3(0, 0.3, -1)).clone().normalize() },
      uSunColor: { value: new THREE.Color(o.sunColor ?? '#fff1d6') },
      uSunSize: { value: o.sunSize ?? 0.02 },
      uSunIntensity: { value: o.sunIntensity ?? 6 },
      uHaze: { value: o.hazeHeight ?? 0.25 },
      uStars: { value: o.stars ?? 0 },
      uIntensity: { value: o.intensity ?? 1 },
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww;
      }
    `,
    fragmentShader: /* glsl */ `
      ${NOISE}
      uniform vec3 uTop, uHorizon, uBottom, uSunDir, uSunColor;
      uniform float uSunSize, uSunIntensity, uHaze, uStars, uIntensity, uTime;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 col = h > 0.0 ? mix(uHorizon, uTop, pow(smoothstep(0.0, 1.0, h), 0.55)) : mix(uHorizon, uBottom, smoothstep(0.0, -0.3, h));
        col = mix(col, uHorizon * 1.15, exp(-abs(h) / max(uHaze, 0.001)) * 0.6);
        float s = max(dot(d, uSunDir), 0.0);
        col += uSunColor * (pow(s, 600.0 / max(uSunSize * 50.0, 0.1)) * uSunIntensity + pow(s, 8.0) * 0.35 + pow(s, 64.0) * 0.6);
        if (uStars > 0.0) {
          vec3 p = d * 300.0;
          float st = step(1.0 - 0.0025 * uStars, hash31(floor(p)));
          col += vec3(st) * smoothstep(0.0, 0.25, h) * 1.5;
        }
        gl_FragColor = vec4(col * uIntensity, 1.0);
      }
    `,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(o.radius ?? 900, 48, 24), mat);
  m.frustumCulled = false;
  m.renderOrder = -10;
  return m;
}

/** Glowing particle cloud (dust, spray, stars). */
export function particles(o: {
  count: number;
  pos: (i: number, r: () => number) => [number, number, number];
  color: string | ((i: number, r: () => number) => [number, number, number]);
  size: [number, number];
  seed?: number;
  opacity?: number;
  twinkle?: number;
  drift?: THREE.Vector3;
  box?: THREE.Vector3;
  additive?: boolean;
}): THREE.Points {
  const r = rng(o.seed ?? 1);
  const n = o.count;
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const size = new Float32Array(n);
  const seed = new Float32Array(n);
  const base = typeof o.color === 'string' ? new THREE.Color(o.color) : null;
  for (let i = 0; i < n; i++) {
    pos.set(o.pos(i, r), i * 3);
    if (base) col.set([base.r, base.g, base.b], i * 3);
    else col.set((o.color as (i: number, r: () => number) => [number, number, number])(i, r), i * 3);
    size[i] = o.size[0] + (o.size[1] - o.size[0]) * Math.pow(r(), 2);
    seed[i] = r();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uScale: { value: 1 },
      uOpacity: { value: o.opacity ?? 1 },
      uTwinkle: { value: o.twinkle ?? 0 },
      uDrift: { value: o.drift ?? new THREE.Vector3() },
      uBox: { value: o.box ?? new THREE.Vector3() },
    },
    vertexShader: /* glsl */ `
      attribute vec3 aColor; attribute float aSize; attribute float aSeed;
      uniform float uTime, uScale, uTwinkle; uniform vec3 uDrift, uBox;
      varying vec3 vColor; varying float vA;
      void main() {
        vec3 p = position + uDrift * uTime * (0.6 + aSeed * 0.8);
        p += vec3(sin(uTime * 0.3 + aSeed * 40.0), cos(uTime * 0.23 + aSeed * 31.0), sin(uTime * 0.27 + aSeed * 17.0)) * 0.08;
        if (uBox.x > 0.0) p = mod(p + uBox * 0.5, uBox) - uBox * 0.5;
        vColor = aColor;
        vA = 1.0 - uTwinkle * (0.5 + 0.5 * sin(uTime * (1.0 + aSeed * 3.0) + aSeed * 50.0));
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * uScale * (300.0 / max(-mv.z, 0.1));
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity; varying vec3 vColor; varying float vA;
      void main() {
        vec2 d = gl_PointCoord - 0.5; float r = length(d) * 2.0;
        float a = (smoothstep(1.0, 0.0, r) * 0.5 + smoothstep(0.35, 0.0, r)) * vA * uOpacity;
        if (a < 0.01) discard;
        gl_FragColor = vec4(vColor * a, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: o.additive === false ? THREE.NormalBlending : THREE.AdditiveBlending,
  });
  const p = new THREE.Points(g, m);
  p.frustumCulled = false;
  return p;
}

/** Background star sphere (points at infinity). */
export function starSphere(count = 2500, radius = 800, seed = 3): THREE.Points {
  return particles({
    count,
    seed,
    pos: (_, r) => {
      const u = r() * 2 - 1;
      const th = r() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      return [s * Math.cos(th) * radius, u * radius, s * Math.sin(th) * radius];
    },
    color: (_, r) => {
      const warm = r() < 0.25;
      const b = 0.5 + Math.pow(r(), 4) * 2.5;
      return warm ? [b, b * 0.85, b * 0.65] : [b * 0.85, b * 0.92, b];
    },
    size: [1.2, 4.5],
    twinkle: 0.25,
  });
}

export function std(color: string, o: Partial<THREE.MeshStandardMaterialParameters> = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.05, ...o });
}

export function box(w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

/** Inject a wind sway into a standard material (instanced foliage). */
export function addWind(mat: THREE.MeshStandardMaterial, uniforms: { uTime: { value: number } }, strength = 0.25): void {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec4 ip = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        #else
          vec4 ip = vec4(0.0);
        #endif
        float sway = sin(uTime * 1.6 + ip.x * 0.35 + ip.z * 0.21) + 0.5 * sin(uTime * 3.1 + ip.x * 0.9);
        transformed.x += sway * ${strength.toFixed(3)} * position.y * position.y * 0.4;
        transformed.z += sway * ${(strength * 0.6).toFixed(3)} * position.y * 0.3;`,
      );
  };
}

/** Smooth camera path through points (Catmull-Rom). */
export function path(points: [number, number, number][]): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'centripetal');
}

/** Gentle hand-held camera noise. */
export function handheld(cam: THREE.Camera, t: number, amt = 1): void {
  cam.rotation.z += Math.sin(t * 0.7) * 0.002 * amt;
  cam.rotation.x += Math.sin(t * 0.53 + 1.2) * 0.0015 * amt;
  cam.rotation.y += Math.sin(t * 0.41 + 2.1) * 0.0015 * amt;
}

export function disposeScene(scene: THREE.Object3D): void {
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    const kill = (x: THREE.Material) => {
      for (const v of Object.values(x)) if (v && (v as THREE.Texture).isTexture) (v as THREE.Texture).dispose();
      const u = (x as THREE.ShaderMaterial).uniforms;
      if (u) for (const k in u) if (u[k].value && u[k].value.isTexture) u[k].value.dispose();
      x.dispose();
    };
    if (Array.isArray(mat)) mat.forEach(kill);
    else if (mat) kill(mat);
  });
}

/** Canvas-generated texture (for small procedural details). */
export function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, srgb = true): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Additive light shaft (a soft beam) from `from` toward `to`. */
export function lightShaft(from: THREE.Vector3, to: THREE.Vector3, r0: number, r1: number, color: string, intensity = 0.6): THREE.Mesh {
  const len = from.distanceTo(to);
  const g = new THREE.CylinderGeometry(r0, r1, len, 32, 1, true);
  g.translate(0, -len / 2, 0);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uI: { value: intensity }, uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main() {
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      ${NOISE}
      uniform vec3 uColor; uniform float uI, uTime;
      varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main() {
        float edge = pow(abs(dot(vN, vV)), 2.5);
        float along = smoothstep(0.0, 0.15, vUv.y) * smoothstep(1.0, 0.55, 1.0 - vUv.y);
        float n = 0.65 + 0.35 * noise2(vec2(vUv.x * 18.0, vUv.y * 3.0 - uTime * 0.05));
        float a = edge * along * n * uI;
        gl_FragColor = vec4(uColor * a, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const m = new THREE.Mesh(g, mat);
  m.position.copy(from);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), to.clone().sub(from).normalize());
  return m;
}

// ───────────────────────── Free Look environment helpers ─────────────────────────

/**
 * A flat disc in the XZ plane whose rings get geometrically wider with distance: dense near the centre,
 * sparse at the horizon. Used for camera-following oceans and horizon-wide terrain.
 */
export function radialGrid(radius: number, rings: number, segments: number, firstRing = 1, maxStep = Infinity): THREE.BufferGeometry {
  // Ring radii grow geometrically (dense near the centre); `maxStep` caps the spacing in the middle
  // distance so features far away (ridges, waves) stay smooth.
  const ratio = Math.pow(radius / firstRing, 1 / Math.max(1, rings - 1));
  const radii: number[] = [];
  let rad = firstRing;
  while (rad < radius) {
    radii.push(rad);
    rad += Math.min(rad * (ratio - 1), maxStep);
  }
  radii.push(radius);
  const pos: number[] = [0, 0, 0];
  const idx: number[] = [];
  for (const r of radii) {
    for (let s = 0; s < segments; s++) {
      const a = (s / segments) * Math.PI * 2;
      pos.push(Math.cos(a) * r, 0, Math.sin(a) * r);
    }
  }
  for (let s = 0; s < segments; s++) idx.push(0, 1 + ((s + 1) % segments), 1 + s);
  for (let r = 0; r < radii.length - 1; r++) {
    const a0 = 1 + r * segments;
    const b0 = 1 + (r + 1) * segments;
    for (let s = 0; s < segments; s++) {
      const s1 = (s + 1) % segments;
      idx.push(a0 + s, a0 + s1, b0 + s, a0 + s1, b0 + s1, b0 + s);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Horizon-wide terrain: a radial grid displaced by a height function, centred on (cx, cz). */
export function radialTerrain(
  height: (x: number, z: number) => number,
  o: { radius: number; rings: number; segments: number; firstRing?: number; maxStep?: number; cx?: number; cz?: number },
): THREE.BufferGeometry {
  const g = radialGrid(o.radius, o.rings, o.segments, o.firstRing ?? 2, o.maxStep);
  const p = g.attributes.position as THREE.BufferAttribute;
  const cx = o.cx ?? 0;
  const cz = o.cz ?? 0;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + cx;
    const z = p.getZ(i) + cz;
    p.setXYZ(i, x, height(x, z), z);
  }
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

/** Colour of the sky dome's horizon band (what fog should fade to for a seamless horizon). */
export function horizonColor(hex: string): THREE.Color {
  return new THREE.Color(hex).multiplyScalar(1.09);
}

/** Keep a camera above a surface: y ≥ surface(x, z) + clearance. */
export function keepAbove(camera: THREE.Camera, surface: (x: number, z: number) => number, clearance: number): void {
  const min = surface(camera.position.x, camera.position.z) + clearance;
  if (camera.position.y < min) camera.position.y = min;
}

/**
 * Overcast cloud layer on a dome around the camera (Free Look skies): drifting fbm clouds that thin out
 * toward the horizon so they blend into the haze. Drawn behind everything (depth at the far plane).
 */
export function cloudDome(o: {
  light: string;
  shadow: string;
  coverage?: number;
  opacity?: number;
  scale?: number;
  speed?: number;
  sunDir?: THREE.Vector3;
}): THREE.Mesh {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    fog: false,
    uniforms: {
      uLight: { value: new THREE.Color(o.light) },
      uShadow: { value: new THREE.Color(o.shadow) },
      uCov: { value: o.coverage ?? 0.45 },
      uOpacity: { value: o.opacity ?? 0.8 },
      uScale: { value: o.scale ?? 1.6 },
      uSpeed: { value: o.speed ?? 0.004 },
      uSun: { value: (o.sunDir ?? new THREE.Vector3(0, 1, 0)).clone().normalize() },
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww;
      }
    `,
    fragmentShader: /* glsl */ `
      ${NOISE}
      uniform vec3 uLight, uShadow, uSun; uniform float uCov, uOpacity, uScale, uSpeed, uTime;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        if (d.y <= 0.0) discard;
        vec2 uv = d.xz / (d.y + 0.12) * uScale + vec2(uTime * uSpeed, uTime * uSpeed * 0.4);
        float n = fbm2(uv) * 0.7 + fbm2(uv * 2.7 + 3.1) * 0.3;
        float a = smoothstep(uCov, uCov + 0.28, n) * smoothstep(0.0, 0.22, d.y) * uOpacity;
        float lit = 0.55 + 0.45 * smoothstep(uCov, 1.0, n) + 0.25 * pow(max(dot(d, uSun), 0.0), 6.0);
        vec3 col = mix(uShadow, uLight, clamp(lit, 0.0, 1.0));
        gl_FragColor = vec4(col, a);
      }
    `,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(6000, 48, 24), mat);
  m.frustumCulled = false;
  m.renderOrder = -9;
  return m;
}

/**
 * Deep-space backdrop for Free Look: dense faint stars, a Milky Way band with dust lanes and a little
 * nebular colour, drawn at the far plane behind everything (so there is no black void in any direction).
 */
export function milkyWay(o: { tilt?: THREE.Euler; intensity?: number; tint?: string } = {}): THREE.Mesh {
  const rot = new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().makeRotationFromEuler(o.tilt ?? new THREE.Euler(0.9, 0.2, 0.4)));
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { uRot: { value: rot }, uI: { value: o.intensity ?? 1 }, uTint: { value: new THREE.Color(o.tint ?? '#c8b8ff') } },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww;
      }
    `,
    fragmentShader: /* glsl */ `
      ${NOISE}
      uniform mat3 uRot; uniform float uI; uniform vec3 uTint;
      varying vec3 vDir;
      float stars(vec3 d, float scale, float density) {
        vec3 p = d * scale;
        vec3 c = floor(p);
        float h = hash31(c);
        vec3 f = fract(p) - 0.5;
        float s = step(1.0 - density, h) * smoothstep(0.32, 0.0, length(f));
        return s * (0.4 + 0.6 * hash31(c + 3.7));
      }
      void main() {
        vec3 d = normalize(vDir);
        vec3 g = uRot * d;
        float lat = g.y;
        float band = exp(-lat * lat / 0.035);
        float core = exp(-lat * lat / 0.006) * (0.6 + 0.4 * fbm3(g * 3.0));
        float dust = smoothstep(0.42, 0.7, fbm3(g * 7.0 + 2.0)) * exp(-lat * lat / 0.01);
        float glow = band * (0.35 + 0.65 * fbm3(g * 4.0)) * (1.0 - dust * 0.85);
        vec3 col = vec3(0.0);
        col += vec3(0.75, 0.72, 0.68) * glow * 0.06 + vec3(1.0, 0.9, 0.75) * core * 0.055 * (1.0 - dust);
        col += uTint * smoothstep(0.55, 0.85, fbm3(d * 2.2 + 9.0)) * 0.025;
        float st = stars(d, 420.0, 0.012 + band * 0.04) * 0.9 + stars(d, 900.0, 0.02 + band * 0.08) * 0.45;
        col += vec3(st) * mix(vec3(0.85, 0.9, 1.0), vec3(1.0, 0.88, 0.7), hash31(floor(d * 420.0) + 1.0));
        gl_FragColor = vec4(col * uI, 1.0);
      }
    `,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(5000, 48, 24), mat);
  m.frustumCulled = false;
  m.renderOrder = -11;
  return m;
}
