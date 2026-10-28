import * as THREE from 'three';
import { NOISE } from '../glsl';
import { addWind, box, canvasTexture, disposeScene, easeInOut, handheld, particles, rng, seg, skyDome, std } from '../lib';
import type { SceneBuilder } from '../types';

/**
 * COOPER'S FARM — dust-season corn belt: an endless cornfield moving in the wind,
 * a white farmhouse, a barn and silo, and a wall of dust rolling in on the horizon.
 */

/** Merge simple non-indexed geometries (position + normal). */
function merge(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const parts = geos.map((g) => (g.index ? g.toNonIndexed() : g));
  let n = 0;
  parts.forEach((g) => (n += g.attributes.position.count));
  const pos = new Float32Array(n * 3);
  const nor = new Float32Array(n * 3);
  let o = 0;
  parts.forEach((g) => {
    pos.set(g.attributes.position.array as Float32Array, o * 3);
    nor.set(g.attributes.normal.array as Float32Array, o * 3);
    o += g.attributes.position.count;
  });
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return out;
}

function cornPlant(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const stalk = new THREE.CylinderGeometry(0.012, 0.022, 2.1, 4, 1, true);
  stalk.translate(0, 1.05, 0);
  parts.push(stalk);
  const r = rng(5);
  for (let i = 0; i < 6; i++) {
    const len = 0.6 + r() * 0.35;
    const leaf = new THREE.PlaneGeometry(0.075, len, 1, 5);
    const p = leaf.attributes.position as THREE.BufferAttribute;
    for (let v = 0; v < p.count; v++) {
      const y = p.getY(v) + len / 2; // 0..len
      const t = Math.max(0, Math.min(1, y / len));
      p.setX(v, p.getX(v) * (1 - t * 0.8));
      p.setY(v, y * 0.75);
      p.setZ(v, Math.pow(t, 1.6) * len * 0.55);
    }
    leaf.computeVertexNormals();
    leaf.rotateX(-0.35);
    leaf.rotateY(i * 2.4 + r() * 0.6);
    leaf.translate(0, 0.45 + i * 0.25, 0);
    parts.push(leaf);
  }
  const tassel = new THREE.ConeGeometry(0.03, 0.25, 4, 1, true);
  tassel.translate(0, 2.2, 0);
  parts.push(tassel);
  return merge(parts);
}

function siding() {
  return canvasTexture(256, 256, (c) => {
    c.fillStyle = '#e8e2d6';
    c.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 16) {
      c.fillStyle = 'rgba(80,70,55,0.25)';
      c.fillRect(0, y, 256, 2);
      c.fillStyle = 'rgba(255,255,255,0.25)';
      c.fillRect(0, y + 2, 256, 2);
    }
    const r = rng(3);
    for (let i = 0; i < 30; i++) {
      c.fillStyle = `rgba(120,100,70,${0.05 + r() * 0.08})`;
      c.fillRect(r() * 256, r() * 256, 20 + r() * 60, 6 + r() * 30);
    }
  });
}

export const buildFarm: SceneBuilder = (ctx) => {
  const hi = ctx.quality === 'high';
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#c8a877', 25, 420);
  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 2000);

  const sunDir = new THREE.Vector3(-0.55, 0.32, -0.75).normalize();
  const sky = skyDome({ top: '#7f93a3', horizon: '#e9cf9c', bottom: '#8a7048', sunDir, sunColor: '#fff0d0', sunSize: 0.04, sunIntensity: 9, hazeHeight: 0.18 });
  scene.add(sky);

  const sun = new THREE.DirectionalLight('#ffe2b0', 3.2);
  sun.position.copy(sunDir).multiplyScalar(80).add(new THREE.Vector3(6, 0, -45));
  sun.target.position.set(6, 0, -45);
  sun.castShadow = true;
  sun.shadow.mapSize.set(hi ? 2048 : 1024, hi ? 2048 : 1024);
  const sc = sun.shadow.camera;
  sc.left = -45;
  sc.right = 45;
  sc.top = 45;
  sc.bottom = -45;
  sc.far = 200;
  sun.shadow.bias = -0.0005;
  scene.add(sun, sun.target);
  scene.add(new THREE.HemisphereLight('#c9d0d4', '#6a5432', 1.25));

  // Ground.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600, 1, 1), std('#6e5636', { roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Far canopy: the corn continues to the horizon as a textured surface.
  const canopy = new THREE.Mesh(
    new THREE.PlaneGeometry(1600, 1600),
    new THREE.ShaderMaterial({
      uniforms: { uSun: { value: sunDir }, fogColor: { value: new THREE.Color('#c8a877') }, uTime: { value: 0 } },
      vertexShader: /* glsl */ `varying vec3 vW; varying float vD; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mv = viewMatrix * w; vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: /* glsl */ `
        ${NOISE}
        uniform vec3 fogColor; uniform float uTime; varying vec3 vW; varying float vD;
        void main() {
          // The real instanced plants grow inside this rectangle.
          if (abs(vW.x) < 37.0 && vW.z > -75.0 && vW.z < 15.0) discard;
          float rows = 0.5 + 0.5 * sin(vW.x * 5.5);
          float n = fbm2(vW.xz * 0.08 + vec2(uTime * 0.05, 0.0));
          vec3 col = mix(vec3(0.12, 0.15, 0.05), vec3(0.3, 0.3, 0.12), n);
          col *= 0.75 + 0.25 * rows;
          float f = clamp(pow(smoothstep(20.0, 420.0, vD), 0.7), 0.0, 1.0);
          gl_FragColor = vec4(mix(col, fogColor, f), 1.0);
        }
      `,
    }),
  );
  canopy.rotation.x = -Math.PI / 2;
  canopy.position.y = 1.9;
  scene.add(canopy);

  // Near cornfield (instanced, wind-blown).
  const windU = { uTime: { value: 0 } };
  const cornMat = std('#ffffff', { side: THREE.DoubleSide, roughness: 0.85 });
  addWind(cornMat, windU, 0.18);
  const geo = cornPlant();
  const pts: THREE.Matrix4[] = [];
  const cols: THREE.Color[] = [];
  const r = rng(11);
  const dx = hi ? 1.0 : 1.3;
  const dz = hi ? 0.55 : 0.75;
  for (let x = -38; x <= 38; x += dx) {
    for (let z = -76; z <= 16; z += dz) {
      if (Math.abs(x - 6) < 16 && z < -33 && z > -60) continue; // farmyard
      if (Math.abs(x - 1.5) < 1.6) continue; // dirt track
      const m = new THREE.Matrix4();
      const s = 0.8 + r() * 0.4;
      m.compose(
        new THREE.Vector3(x + (r() - 0.5) * 0.3, 0, z + (r() - 0.5) * 0.25),
        new THREE.Quaternion().setFromEuler(new THREE.Euler((r() - 0.5) * 0.12, r() * 6.28, (r() - 0.5) * 0.12)),
        new THREE.Vector3(s, s * (0.85 + r() * 0.25), s),
      );
      pts.push(m);
      const dry = r();
      cols.push(new THREE.Color().setHSL(0.2 - dry * 0.09, 0.5 - dry * 0.18, 0.27 + dry * 0.16));
    }
  }
  const corn = new THREE.InstancedMesh(geo, cornMat, pts.length);
  pts.forEach((m, i) => {
    corn.setMatrixAt(i, m);
    corn.setColorAt(i, cols[i]);
  });
  corn.receiveShadow = true;
  scene.add(corn);

  // Dirt track.
  const track = new THREE.Mesh(new THREE.PlaneGeometry(3, 120), std('#8a6c46', { roughness: 1 }));
  track.rotation.x = -Math.PI / 2;
  track.position.set(1.5, 0.01, -25);
  track.receiveShadow = true;
  scene.add(track);

  // ── Farmyard
  const yard = new THREE.Group();
  yard.position.set(6, 0, -46);
  const white = std('#ffffff', { map: siding(), roughness: 0.8 });
  const roofMat = std('#3e3e40', { roughness: 0.7 });
  const add = (m: THREE.Mesh) => {
    m.castShadow = true;
    m.receiveShadow = true;
    yard.add(m);
    return m;
  };
  add(box(10, 6, 7, white, 0, 3, 0));
  const roofG = new THREE.CylinderGeometry(0.01, 5.6, 3.2, 4, 1);
  roofG.rotateY(Math.PI / 4);
  const roof = add(new THREE.Mesh(roofG, roofMat));
  roof.scale.set(1.35, 1, 0.95);
  roof.position.set(0, 7.6, 0);
  // Porch.
  add(box(10.5, 0.25, 2.6, std('#d8d0c0'), 0, 0.4, 4.6));
  add(box(10.8, 0.15, 3, roofMat, 0, 3.1, 4.6));
  for (let i = -5; i <= 5; i += 2.5) add(box(0.18, 2.8, 0.18, std('#efe9dc'), i, 1.7, 5.8));
  // Windows with warm interior glow.
  const glass = new THREE.MeshStandardMaterial({ color: '#1c1a18', emissive: new THREE.Color('#ffb060'), emissiveIntensity: 0.12, roughness: 0.2 });
  [-3.2, 0, 3.2].forEach((x) => {
    yard.add(box(1.3, 1.6, 0.05, glass, x, 4.2, 3.53));
    yard.add(box(1.3, 1.6, 0.05, glass, x, 1.7, 3.53));
  });
  // Barn and silo.
  const barn = add(box(9, 7, 13, std('#7a3324', { roughness: 0.9 }), -22, 3.5, -10));
  barn.rotation.y = 0.2;
  const barnRoof = add(new THREE.Mesh(roofG.clone(), std('#4a4038')));
  barnRoof.scale.set(1.2, 0.8, 1.7);
  barnRoof.position.set(-22, 8.2, -10);
  barnRoof.rotation.y = 0.2 + Math.PI / 4;
  const silo = add(new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 14, 24), std('#b8b4aa', { metalness: 0.1, roughness: 0.6 })));
  silo.position.set(13, 7, -6);
  const dome = add(new THREE.Mesh(new THREE.SphereGeometry(2.4, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), std('#a8a49c', { metalness: 0.1, roughness: 0.5 })));
  dome.position.set(13, 14, -6);
  // Pickup truck.
  const truck = new THREE.Group();
  const paint = std('#5d6b74', { metalness: 0.4, roughness: 0.45 });
  truck.add(box(2.0, 0.8, 5.2, paint, 0, 0.9, 0), box(1.9, 0.75, 2.0, paint, 0, 1.65, -0.6), box(1.85, 0.6, 0.05, glass, 0, 1.7, 0.42));
  const wheelG = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 16);
  wheelG.rotateZ(Math.PI / 2);
  [[-1, -1.6], [1, -1.6], [-1, 1.6], [1, 1.6]].forEach(([x, z]) => {
    const w = new THREE.Mesh(wheelG, std('#1a1a1a'));
    w.position.set(x, 0.42, z);
    truck.add(w);
  });
  truck.traverse((o) => ((o as THREE.Mesh).castShadow = true));
  truck.position.set(-4, 0, 9);
  truck.rotation.y = 0.5;
  yard.add(truck);
  scene.add(yard);

  // ── Dust storm wall on the horizon
  const stormMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uK: { value: 0 } },
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      ${NOISE}
      uniform float uTime, uK; varying vec2 vUv;
      void main() {
        vec2 p = vec2(vUv.x * 9.0, vUv.y * 2.5);
        float n = fbm2(p + vec2(uTime * 0.02, -uTime * 0.04));
        float n2 = fbm2(p * 2.3 - vec2(uTime * 0.03, uTime * 0.02));
        float top = 0.55 + 0.25 * n + 0.1 * uK;
        float a = smoothstep(top, top - 0.18, vUv.y) * smoothstep(0.0, 0.05, vUv.x) * smoothstep(1.0, 0.95, vUv.x);
        vec3 dark = vec3(0.24, 0.16, 0.09);
        vec3 lit = vec3(0.86, 0.66, 0.42);
        vec3 col = mix(dark, lit, smoothstep(0.2, 0.9, vUv.y + n2 * 0.4));
        gl_FragColor = vec4(col * 1.1, a * (0.92));
      }
    `,
  });
  const storm = new THREE.Mesh(new THREE.CylinderGeometry(520, 520, 260, 64, 1, true, Math.PI * 0.75, Math.PI * 0.5), stormMat);
  storm.position.set(0, 110, -40);
  storm.material.side = THREE.BackSide;
  scene.add(storm);

  // Airborne dust.
  const dust = particles({
    count: hi ? 2200 : 1100,
    seed: 4,
    pos: (_, rr) => [(rr() - 0.5) * 120, rr() * 18, -rr() * 110 + 15],
    color: '#e6c58e',
    size: [0.05, 0.16],
    drift: new THREE.Vector3(1.2, 0.05, 0.4),
    box: new THREE.Vector3(120, 18, 125),
    opacity: 0.55,
    additive: true,
  });
  dust.position.set(0, 9, -47);
  scene.add(dust);

  // ── Camera: low drone glide over the corn toward the farmhouse, then rise to the storm.
  const P0 = new THREE.Vector3(-1.5, 2.4, 10);
  const P1 = new THREE.Vector3(1.0, 2.9, -12);
  const P2 = new THREE.Vector3(-14, 8, -6);
  const L0 = new THREE.Vector3(5, 3.5, -46);
  const L1 = new THREE.Vector3(10, 30, -260);
  const look = new THREE.Vector3();

  return {
    scene,
    camera,
    exposure: 1.0,
    bloom: { strength: 0.5, radius: 0.5, threshold: 1.6 },
    focus: new THREE.Vector3(6, 4, -46),
    anchors: [
      { at: new THREE.Vector3(6, 9.5, -46), label: 'Farmhouse' },
      { at: new THREE.Vector3(19, 15, -52), label: 'Silo' },
      { at: new THREE.Vector3(2, 2.2, -37), label: 'Pickup truck' },
      { at: new THREE.Vector3(-30, 40, -300), label: 'Dust storm' },
      { at: new THREE.Vector3(-8, 2.3, 0), label: 'Corn — the last viable crop' },
    ],
    update(t, _dt, k, free) {
      windU.uTime.value = t;
      stormMat.uniforms.uTime.value = t;
      stormMat.uniforms.uK.value = k;
      (canopy.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
      (dust.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
      storm.position.z = -40 + k * 60;
      if (!free) {
        const a = easeInOut(seg(k, 0, 0.7));
        const b = easeInOut(seg(k, 0.55, 1));
        camera.position.copy(P0).lerp(P1, a).lerp(P2, b);
        look.copy(L0).lerp(L1, b * 0.6);
        camera.lookAt(look);
        handheld(camera, t, 0.6);
      }
    },
    dispose() {
      disposeScene(scene);
    },
  };
};

