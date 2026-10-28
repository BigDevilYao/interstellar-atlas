import * as THREE from 'three';
import { NOISE } from '../glsl';
import { canvasTexture, rng, std } from '../lib';

/** Shared cinematic models: the Endurance, the Ranger, planets. Original stylised designs. */

function panelTexture(seed: number) {
  return canvasTexture(512, 256, (c) => {
    const r = rng(seed);
    c.fillStyle = '#c9c8c3';
    c.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 60; i++) {
      const w = 30 + r() * 120;
      const h = 20 + r() * 80;
      const l = 62 + r() * 22;
      c.fillStyle = `hsl(40, ${r() * 6}%, ${l}%)`;
      c.fillRect(r() * 512, r() * 256, w, h);
    }
    c.strokeStyle = 'rgba(30,30,32,0.55)';
    c.lineWidth = 2;
    for (let x = 0; x < 512; x += 64) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, 256);
      c.stroke();
    }
    for (let y = 0; y < 256; y += 42) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(512, y);
      c.stroke();
    }
    // Gold foil patches and dark radiators.
    for (let i = 0; i < 6; i++) {
      c.fillStyle = r() < 0.5 ? '#b08a3a' : '#2a2c30';
      c.fillRect(r() * 480, r() * 220, 20 + r() * 40, 14 + r() * 30);
    }
  });
}

function windowTexture(seed: number) {
  return canvasTexture(512, 256, (c) => {
    const r = rng(seed);
    c.fillStyle = '#000';
    c.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 26; i++) {
      if (r() < 0.45) continue;
      c.fillStyle = r() < 0.7 ? '#ffd9a0' : '#bfe0ff';
      c.fillRect(20 + i * 19, 112, 8, 12);
    }
  });
}

export interface EnduranceModel {
  group: THREE.Group;
  ring: THREE.Group;
  /** Radius of the ring. */
  radius: number;
  nav: THREE.Mesh[];
}

/** The Endurance: a ring of 12 modules around a docking hub. `broken` removes modules. */
export function createEndurance(opts: { broken?: number[]; detail?: 'high' | 'low' } = {}): EnduranceModel {
  const group = new THREE.Group();
  const ring = new THREE.Group();
  group.add(ring);
  const radius = 6;
  const panel = panelTexture(3);
  const win = windowTexture(5);
  const modMat = std('#ffffff', { map: panel, emissiveMap: win, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 2.2, metalness: 0.35, roughness: 0.55 });
  const dark = std('#2a2c30', { metalness: 0.6, roughness: 0.4 });
  const light = std('#bdbcb6', { metalness: 0.45, roughness: 0.45 });
  const modG = new THREE.BoxGeometry(2.7, 1.55, 1.9, 2, 1, 1);
  const n = 12;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    if (opts.broken?.includes(i)) continue;
    const m = new THREE.Mesh(modG, modMat);
    m.position.set(Math.cos(a) * radius, Math.sin(a) * radius, 0);
    m.rotation.z = a + Math.PI / 2;
    m.castShadow = true;
    m.receiveShadow = true;
    ring.add(m);
    // Small radiator fin on the outside.
    const fin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.9), dark);
    fin.position.set(Math.cos(a) * (radius + 0.95), Math.sin(a) * (radius + 0.95), 0);
    fin.rotation.z = a + Math.PI / 2;
    ring.add(fin);
    // Connecting tube to the next module.
    const b = a + Math.PI / n;
    if (!opts.broken?.includes((i + 1) % n)) {
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.9, 12), light);
      tube.position.set(Math.cos(b) * radius, Math.sin(b) * radius, 0);
      tube.rotation.z = b;
      ring.add(tube);
    }
  }
  // Hub and docking collar.
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 3.2, 24), light);
  hub.rotation.x = Math.PI / 2;
  ring.add(hub);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.14, 10, 32), dark);
  collar.position.z = 1.65;
  ring.add(collar);
  // Spokes.
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 12;
    const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, radius - 1.6, 8), light);
    sp.position.set(Math.cos(a) * (radius / 2 + 0.4), Math.sin(a) * (radius / 2 + 0.4), 0);
    sp.rotation.z = a - Math.PI / 2;
    ring.add(sp);
  }
  // Navigation lights.
  const nav: THREE.Mesh[] = [];
  [0, 3, 6, 9].forEach((i, j) => {
    const a = (i / n) * Math.PI * 2;
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), new THREE.MeshBasicMaterial({ color: j % 2 ? new THREE.Color(8, 0.6, 0.4) : new THREE.Color(0.5, 8, 2) }));
    l.position.set(Math.cos(a) * (radius + 0.8), Math.sin(a) * (radius + 0.8), 1);
    ring.add(l);
    nav.push(l);
  });
  return { group, ring, radius, nav };
}

/** The Ranger: an angular lander. Points along +X. */
export function createRanger(): THREE.Group {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(3.2, 0);
  shape.lineTo(1.2, 0.55);
  shape.lineTo(-1.6, 0.6);
  shape.lineTo(-2, 0.3);
  shape.lineTo(-2, -0.25);
  shape.lineTo(1.4, -0.35);
  shape.closePath();
  const body = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, { depth: 1.5, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.12, bevelSegments: 1 }),
    std('#cfcdc6', { metalness: 0.35, roughness: 0.45 }),
  );
  body.position.z = -0.75;
  g.add(body);
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0.8, 0);
  wingShape.lineTo(-1.8, 2.1);
  wingShape.lineTo(-2.1, 2.1);
  wingShape.lineTo(-1.9, 0);
  wingShape.closePath();
  const wingG = new THREE.ExtrudeGeometry(wingShape, { depth: 0.08, bevelEnabled: false });
  const wingM = std('#9c9a94', { metalness: 0.4, roughness: 0.5 });
  const wl = new THREE.Mesh(wingG, wingM);
  wl.rotation.x = Math.PI / 2;
  wl.position.set(0, -0.1, 0.75);
  const wr = wl.clone();
  wr.rotation.x = -Math.PI / 2;
  wr.position.z = -0.75;
  g.add(wl, wr);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.18, 1.0), new THREE.MeshStandardMaterial({ color: '#0d1014', metalness: 0.9, roughness: 0.1 }));
  glass.position.set(1.7, 0.42, 0);
  glass.rotation.z = -0.25;
  g.add(glass);
  // Engine glow.
  const eng = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 1.1), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.5, 3.5, 6) }));
  eng.position.set(-2.12, 0.05, 0);
  eng.name = 'engine';
  g.add(eng);
  g.traverse((o) => ((o as THREE.Mesh).castShadow = true));
  return g;
}

/** Procedural planet with day/night shading, clouds and an atmosphere rim. */
export function createPlanet(o: {
  radius: number;
  kind: 'earth' | 'ice' | 'saturn' | 'rock';
  sunDir: THREE.Vector3;
  atmosphere?: string;
  seed?: number;
}): THREE.Group {
  const g = new THREE.Group();
  const kindIndex = { earth: 0, ice: 1, saturn: 2, rock: 3 }[o.kind];
  const mat = new THREE.ShaderMaterial({
    uniforms: { uSun: { value: o.sunDir.clone().normalize() }, uKind: { value: kindIndex }, uTime: { value: 0 }, uSeed: { value: o.seed ?? 1 } },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vP; varying vec3 vW;
      void main() { vP = position; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }
    `,
    fragmentShader: /* glsl */ `
      ${NOISE}
      uniform vec3 uSun; uniform int uKind; uniform float uTime, uSeed;
      varying vec3 vN; varying vec3 vP; varying vec3 vW;
      void main() {
        vec3 n = normalize(vN);
        vec3 p = normalize(vP);
        float lit = dot(n, normalize(uSun));
        float day = smoothstep(-0.12, 0.25, lit);
        vec3 col;
        if (uKind == 0) {
          float land = fbm3(p * 2.2 + uSeed);
          float isLand = smoothstep(0.47, 0.51, land);
          vec3 ocean = mix(vec3(0.005, 0.025, 0.08), vec3(0.015, 0.06, 0.16), fbm3(p * 6.0));
          vec3 ground = mix(vec3(0.2, 0.15, 0.07), vec3(0.08, 0.12, 0.05), fbm3(p * 8.0 + 3.0));
          col = mix(ocean, ground, isLand);
          float clouds = smoothstep(0.55, 0.8, fbm3(p * 4.5 + vec3(uTime * 0.004, 0.0, 0.0)));
          col = mix(col, vec3(0.7), clouds * 0.8);
          vec3 night = vec3(1.0, 0.7, 0.35) * step(0.72, noise3(p * 90.0)) * isLand * 0.6;
          col = col * (0.02 + 1.15 * max(lit, 0.0)) * day + night * (1.0 - day);
        } else if (uKind == 1) {
          float f = fbm3(p * 4.0 + uSeed);
          col = mix(vec3(0.38, 0.46, 0.56), vec3(0.78, 0.82, 0.88), f);
          col *= 0.03 + 0.95 * max(lit, 0.0);
        } else if (uKind == 2) {
          float band = sin(p.y * 38.0 + fbm3(p * vec3(2.0, 18.0, 2.0)) * 3.0);
          col = mix(vec3(0.72, 0.6, 0.42), vec3(0.9, 0.82, 0.62), band * 0.5 + 0.5);
          col = mix(col, vec3(0.55, 0.62, 0.66), smoothstep(0.75, 0.95, abs(p.y)));
          col *= 0.015 + 1.1 * max(lit, 0.0);
        } else {
          float f = fbm3(p * 5.0 + uSeed);
          col = mix(vec3(0.42, 0.26, 0.16), vec3(0.72, 0.52, 0.34), f);
          col *= 0.03 + 1.4 * max(lit, 0.0);
        }
        vec3 v = normalize(cameraPosition - vW);
        float rim = pow(1.0 - max(dot(n, v), 0.0), 3.0);
        col += vec3(0.35, 0.6, 1.0) * rim * smoothstep(-0.2, 0.4, lit) * (uKind == 2 ? 0.25 : 0.6);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(o.radius, 128, 64), mat);
  g.add(sphere);
  // Atmosphere shell.
  const atm = new THREE.Mesh(
    new THREE.SphereGeometry(o.radius * 1.025, 96, 48),
    new THREE.ShaderMaterial({
      uniforms: { uSun: { value: o.sunDir.clone().normalize() }, uColor: { value: new THREE.Color(o.atmosphere ?? '#6aa8ff') } },
      vertexShader: /* glsl */ `varying vec3 vN; varying vec3 vW; void main() { vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uSun; uniform vec3 uColor; varying vec3 vN; varying vec3 vW;
        void main() {
          vec3 v = normalize(cameraPosition - vW);
          float f = pow(1.0 - abs(dot(normalize(vN), v)), 2.5);
          float l = smoothstep(-0.3, 0.5, dot(normalize(vN), normalize(uSun)));
          float a = f * l;
          gl_FragColor = vec4(uColor * a * 1.3, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
    }),
  );
  if (o.kind !== 'saturn') g.add(atm);
  g.userData.material = mat;
  return g;
}

/** Bright sun disk + glow sprite. */
export function createSun(color = '#fff2dc', size = 30): THREE.Mesh {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; varying vec2 vUv;
      void main() {
        float r = length(vUv - 0.5) * 2.0;
        float core = smoothstep(0.12, 0.08, r) * 30.0;
        float glow = exp(-r * 5.0) * 3.0 + exp(-r * 14.0) * 6.0;
        float streak = exp(-abs(vUv.y - 0.5) * 140.0) * exp(-abs(vUv.x - 0.5) * 3.0) * 4.0;
        vec3 col = uColor * (core + glow + streak);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
  m.userData.billboard = true;
  return m;
}
