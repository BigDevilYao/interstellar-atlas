import * as THREE from 'three';
import { NOISE } from '../glsl';
import { disposeScene, easeInOut, handheld, particles, rng } from '../lib';
import type { SceneBuilder } from '../types';

/**
 * COOPER STATION — inside a rotating cylinder: fields, roads and houses curving
 * up and over the sky, a line of light along the axis, haze toward the far end.
 */
export const buildStation: SceneBuilder = (ctx) => {
  const hi = ctx.quality === 'high';
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#d9dccf');
  const camera = new THREE.PerspectiveCamera(58, 1, 0.5, 6000);

  const RAD = 220;
  const LEN = 3200;

  // Inner surface: procedural patchwork of fields, roads and water, lit from the axis.
  const landMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: { uRad: { value: RAD }, uHaze: { value: new THREE.Color('#d6dccf') } },
    vertexShader: /* glsl */ `varying vec3 vL; varying vec3 vW; varying float vD; void main() { vL = position; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mv = viewMatrix * w; vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `
      ${NOISE}
      uniform float uRad; uniform vec3 uHaze; varying vec3 vL; varying vec3 vW; varying float vD;
      void main() {
        float ang = atan(vL.x, vL.z);
        vec2 uv = vec2(ang * uRad, vL.y);
        vec2 cell = floor(uv / vec2(70.0, 110.0));
        float h = hash21(cell);
        vec3 crop = h < 0.3 ? vec3(0.26, 0.32, 0.15) : h < 0.55 ? vec3(0.5, 0.45, 0.26) : h < 0.75 ? vec3(0.33, 0.38, 0.2) : h < 0.9 ? vec3(0.38, 0.31, 0.2) : vec3(0.2, 0.26, 0.26);
        vec2 f = fract(uv / vec2(70.0, 110.0));
        float rows = 0.85 + 0.15 * sin(uv.x * (2.0 + h * 3.0));
        crop *= rows * (0.85 + 0.3 * noise2(uv * 0.05));
        float road = 1.0 - smoothstep(0.0, 0.012, min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y)));
        crop = mix(crop, vec3(0.7, 0.68, 0.62), road * 0.8);
        float lit = 0.75 + 0.25 * noise2(uv * 0.004);
        vec3 col = crop * lit * 1.1;
        float f2 = pow(smoothstep(40.0, 2400.0, vD), 0.8);
        gl_FragColor = vec4(mix(col, uHaze, f2), 1.0);
      }
    `,
  });
  const land = new THREE.Mesh(new THREE.CylinderGeometry(RAD, RAD, LEN, 160, 40, true), landMat);
  land.rotation.x = Math.PI / 2;
  land.position.z = -LEN / 2 + 200;
  scene.add(land);

  // Houses and trees on the inner surface (simple axis-lit shading).
  const instMat = new THREE.ShaderMaterial({
    uniforms: { uHaze: { value: new THREE.Color('#d6dccf') } },
    vertexShader: /* glsl */ `
      varying vec3 vC; varying vec3 vN; varying vec3 vW; varying float vD;
      void main() {
        vC = instanceColor;
        vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
        vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
        vW = w.xyz;
        vec4 mv = viewMatrix * w; vD = -mv.z;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uHaze; varying vec3 vC; varying vec3 vN; varying vec3 vW; varying float vD;
      void main() {
        vec3 toAxis = normalize(vec3(-vW.x, -vW.y, 0.0));
        float l = 0.45 + 0.75 * max(dot(normalize(vN), toAxis), 0.0);
        vec3 col = vC * l;
        gl_FragColor = vec4(mix(col, uHaze, smoothstep(100.0, 2600.0, vD)), 1.0);
      }
    `,
  });
  const r = rng(21);
  const placeOn = (geo: THREE.BufferGeometry, count: number, size: () => THREE.Vector3, color: () => THREE.Color, lift: (s: THREE.Vector3) => number) => {
    const inst = new THREE.InstancedMesh(geo, instMat, count);
    const mm = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    for (let i = 0; i < count; i++) {
      const a = r() * Math.PI * 2;
      const z = 150 - r() * (LEN - 200);
      const s = size();
      const radial = new THREE.Vector3(Math.cos(a), Math.sin(a), 0);
      const pos = radial.clone().multiplyScalar(RAD - lift(s));
      q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), radial.clone().negate());
      q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * Math.PI));
      mm.compose(pos.setZ(z), q, s);
      inst.setMatrixAt(i, mm);
      inst.setColorAt(i, color());
    }
    inst.frustumCulled = false;
    scene.add(inst);
  };
  const houseGeo = new THREE.BoxGeometry(1, 1, 1);
  houseGeo.translate(0, 0.5, 0);
  placeOn(
    houseGeo,
    hi ? 900 : 450,
    () => new THREE.Vector3(5 + r() * 4, 4 + r() * 3, 7 + r() * 5),
    () => new THREE.Color().setHSL(0.08 + r() * 0.05, 0.15, 0.7 + r() * 0.2),
    () => 0,
  );
  const roofGeo = new THREE.ConeGeometry(0.75, 0.5, 4);
  roofGeo.rotateY(Math.PI / 4);
  roofGeo.translate(0, 0.25, 0);
  const treeGeo = new THREE.ConeGeometry(0.5, 1, 7);
  treeGeo.translate(0, 0.5, 0);
  placeOn(
    treeGeo,
    hi ? 2600 : 1300,
    () => {
      const s = 4 + r() * 6;
      return new THREE.Vector3(s, s * 1.8, s);
    },
    () => new THREE.Color().setHSL(0.25 + r() * 0.06, 0.35, 0.22 + r() * 0.1),
    () => 0,
  );
  void roofGeo;

  // The axis light.
  const axis = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, LEN, 12, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 4.8, 4.2) }));
  axis.rotation.x = Math.PI / 2;
  axis.position.z = -LEN / 2 + 200;
  scene.add(axis);
  // Far end cap glowing through the haze.
  const cap = new THREE.Mesh(new THREE.CircleGeometry(RAD, 96), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.65, 1.55) }));
  cap.position.z = -LEN + 220;
  scene.add(cap);

  const clouds = particles({
    count: hi ? 400 : 200,
    seed: 7,
    pos: (_, rr) => {
      const a = rr() * Math.PI * 2;
      const d = 60 + rr() * 90;
      return [Math.cos(a) * d, Math.sin(a) * d, 100 - rr() * 2400];
    },
    color: '#ffffff',
    size: [20, 50],
    opacity: 0.12,
    additive: true,
  });
  scene.add(clouds);

  const look = new THREE.Vector3();
  return {
    scene,
    camera,
    exposure: 0.9,
    bloom: { strength: 0.6, radius: 0.7, threshold: 1.3 },
    focus: new THREE.Vector3(0, 0, -600),
    anchors: [
      { at: new THREE.Vector3(0, RAD - 20, -500), label: 'The horizon curves overhead' },
      { at: new THREE.Vector3(0, 0, -900), label: 'Axis light' },
      { at: new THREE.Vector3(60, -RAD + 20, -200), label: 'Fields and houses — the farm returns' },
    ],
    update(t, _dt, k, free) {
      (clouds.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
      if (!free) {
        const e = easeInOut(k);
        camera.position.set(14, -RAD + 9 + e * 6, 120 - e * 220);
        look.set(0, -RAD * 0.62 + e * RAD * 0.75, -600);
        camera.up.set(0, 1, 0);
        camera.lookAt(look);
        handheld(camera, t, 0.7);
      }
    },
    dispose() {
      disposeScene(scene);
    },
  };
};
