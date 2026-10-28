import * as THREE from 'three';
import { NOISE } from '../glsl';
import { disposeScene, easeInOut, handheld, particles, ridged, skyDome, std, terrain } from '../lib';
import type { SceneBuilder } from '../types';
import { createRanger } from './parts';

/**
 * MANN'S PLANET — a landscape of ice under clouds frozen in mid-air.
 */
export const buildMann: SceneBuilder = (ctx) => {
  const hi = ctx.quality === 'high';
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#aebfcc', 150, 2600);
  const camera = new THREE.PerspectiveCamera(46, 1, 0.5, 8000);

  const sunDir = new THREE.Vector3(-0.45, 0.35, -0.82).normalize();
  scene.add(skyDome({ top: '#3d5a78', horizon: '#c9d6df', bottom: '#93a6b4', sunDir, sunColor: '#f4f8ff', sunSize: 0.05, sunIntensity: 4, hazeHeight: 0.2, radius: 7000 }));

  // Ice terrain.
  const H = (x: number, z: number) => {
    const r = ridged(x * 0.004, z * 0.004, 5) * 120 + ridged(x * 0.02 + 3, z * 0.02, 3) * 14;
    return r - 40;
  };
  const geo = terrain(2400, hi ? 320 : 200, H);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const nor = geo.attributes.normal as THREE.BufferAttribute;
  const cols = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const slope = 1 - nor.getY(i);
    const y = pos.getY(i);
    const snow = Math.max(0, Math.min(1, 1 - slope * 5.0 + y * 0.002));
    const ice = [0.28, 0.42, 0.55];
    const wh = [0.82, 0.86, 0.9];
    for (let c = 0; c < 3; c++) cols[i * 3 + c] = ice[c] + (wh[c] - ice[c]) * snow;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const ice = new THREE.Mesh(geo, std('#ffffff', { vertexColors: true, roughness: 0.32, metalness: 0.0 }));
  ice.receiveShadow = true;
  scene.add(ice);

  const sun = new THREE.DirectionalLight('#f2f6ff', 3.0);
  sun.position.copy(sunDir).multiplyScalar(400);
  scene.add(sun, new THREE.HemisphereLight('#bcd0e4', '#5a6a7a', 1.1));

  // Frozen clouds: stacked translucent slabs with crisp edges.
  const cloudMat = (seed: number) =>
    new THREE.ShaderMaterial({
      uniforms: { uSeed: { value: seed }, uSun: { value: sunDir }, uFog: { value: new THREE.Color('#aebfcc') } },
      vertexShader: /* glsl */ `varying vec2 vUv; varying float vD; varying vec3 vW; void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mv = viewMatrix * w; vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: /* glsl */ `
        ${NOISE}
        uniform float uSeed; uniform vec3 uFog; varying vec2 vUv; varying float vD; varying vec3 vW;
        void main() {
          vec2 p = vUv * 3.0 + uSeed;
          float n = fbm2(p) + 0.35 * fbm2(p * 3.0);
          float edge = smoothstep(0.5, 0.54, n);
          float body = smoothstep(0.52, 0.9, n);
          float fade = smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x) * smoothstep(0.0, 0.15, vUv.y) * smoothstep(1.0, 0.85, vUv.y);
          float a = edge * fade;
          if (a < 0.02) discard;
          float lit = 0.55 + 0.45 * smoothstep(0.52, 0.75, n);
          vec3 col = mix(vec3(0.42, 0.52, 0.62), vec3(0.95, 0.97, 1.0), body) * lit;
          float f = smoothstep(150.0, 2600.0, vD);
          gl_FragColor = vec4(mix(col, uFog, f * 0.8), a * 0.95);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  const clouds = new THREE.Group();
  const placements: [number, number, number, number, number][] = [
    [-180, 70, -420, 520, 1],
    [220, 95, -650, 700, 2],
    [-40, 130, -900, 900, 3],
    [380, 55, -300, 420, 4],
    [-420, 110, -700, 600, 5],
  ];
  placements.forEach(([x, y, z, s, seed]) => {
    for (let layer = 0; layer < 10; layer++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s * 0.7), cloudMat(seed + layer * 0.07));
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, y + layer * 2.6, z);
      clouds.add(m);
    }
  });
  scene.add(clouds);

  // Mann's shelter and the Ranger.
  const hab = new THREE.Group();
  const habM = std('#d8d6cf', { roughness: 0.6 });
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 8, 24), habM);
  cyl.rotation.z = Math.PI / 2;
  hab.add(cyl);
  const glow = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.6, 0.1), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 2.6, 1.2) }));
  glow.position.set(0, 0.6, 3.05);
  hab.add(glow);
  hab.position.set(30, H(30, -140) + 3, -140);
  scene.add(hab);
  const ranger = createRanger();
  ranger.scale.setScalar(2.2);
  scene.add(ranger);

  const snow = particles({
    count: hi ? 2000 : 1000,
    seed: 3,
    pos: (_, r) => [(r() - 0.5) * 300, r() * 120, (r() - 0.5) * 300],
    color: '#ffffff',
    size: [0.3, 0.9],
    drift: new THREE.Vector3(6, -1, 2),
    box: new THREE.Vector3(300, 120, 300),
    opacity: 0.5,
  });
  scene.add(snow);

  const look = new THREE.Vector3();
  return {
    scene,
    camera,
    exposure: 0.72,
    bloom: { strength: 0.4, radius: 0.5, threshold: 1.4 },
    focus: new THREE.Vector3(0, 40, -400),
    anchors: [
      { at: new THREE.Vector3(-180, 80, -420), label: 'Frozen cloud deck' },
      { at: hab.position.clone().add(new THREE.Vector3(0, 5, 0)), label: 'Mann’s shelter' },
      { at: new THREE.Vector3(200, 40, -500), label: 'Ammonia ice ridges' },
    ],
    update(t, _dt, k, free) {
      (snow.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
      const e = easeInOut(k);
      // Ranger descends between the cloud decks.
      ranger.position.set(60 - e * 30, 150 - e * 100, -260 + e * 60);
      ranger.rotation.set(0.1, Math.PI * 0.75, -0.2 + e * 0.2);
      snow.position.copy(camera.position);
      if (!free) {
        camera.position.set(-40 + e * 60, 260 - e * 150, 80 - e * 140);
        look.copy(ranger.position).lerp(new THREE.Vector3(0, 40, -600), 0.4);
        camera.lookAt(look);
        handheld(camera, t, 1.2);
      }
    },
    dispose() {
      disposeScene(scene);
    },
  };
};
