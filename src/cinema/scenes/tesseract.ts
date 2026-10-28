import * as THREE from 'three';
import { disposeScene, easeInOut, handheld, particles, rng } from '../lib';
import type { SceneBuilder } from '../types';

/**
 * THE TESSERACT — Murph's bookshelf repeated through time as an infinite amber lattice,
 * crossed by glowing threads of gravity.
 */
export const buildTesseract: SceneBuilder = (ctx) => {
  const hi = ctx.quality === 'high';
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0a0603');
  scene.fog = new THREE.FogExp2('#1c1006', 0.026);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.05, 400);

  const CX = 4.2;
  const CY = 3.0;
  const CZ = 4.2;
  const NI = hi ? 6 : 4;
  const NJ = hi ? 5 : 3;
  const NK = hi ? 14 : 9;

  // Beams of the lattice (instanced).
  const beamMat = new THREE.MeshStandardMaterial({ color: '#3a2412', roughness: 0.55, metalness: 0.2, emissive: new THREE.Color('#2a1404'), emissiveIntensity: 0.6 });
  const beamGeo = new THREE.BoxGeometry(1, 1, 1);
  const beams: THREE.Matrix4[] = [];
  const m = new THREE.Matrix4();
  for (let i = -NI; i <= NI; i++)
    for (let j = -NJ; j <= NJ; j++)
      for (let k = -2; k <= NK; k++) {
        const x = i * CX;
        const y = j * CY;
        const z = -k * CZ;
        beams.push(m.clone().compose(new THREE.Vector3(x, y, z - CZ / 2), new THREE.Quaternion(), new THREE.Vector3(0.09, 0.09, CZ)));
        beams.push(m.clone().compose(new THREE.Vector3(x + CX / 2, y, z), new THREE.Quaternion(), new THREE.Vector3(CX, 0.07, 0.07)));
        beams.push(m.clone().compose(new THREE.Vector3(x, y + CY / 2, z), new THREE.Quaternion(), new THREE.Vector3(0.07, CY, 0.07)));
      }
  const beamMesh = new THREE.InstancedMesh(beamGeo, beamMat, beams.length);
  beams.forEach((b, i) => beamMesh.setMatrixAt(i, b));
  scene.add(beamMesh);

  // Bookshelves in every cell (instanced books, warm colours).
  const r = rng(17);
  const bookM: THREE.Matrix4[] = [];
  const bookC: THREE.Color[] = [];
  const shelfM: THREE.Matrix4[] = [];
  const palette = ['#7a3a1e', '#a0703a', '#4a2a14', '#c49a5a', '#5a3a1a', '#8a5a2a', '#d8b07a'];
  for (let i = -2; i <= 2; i++)
    for (let j = -2; j <= 2; j++)
      for (let k = -1; k <= (hi ? 7 : 5); k += 1) {
        if (r() < 0.3) continue;
        const ox = i * CX + 0.3;
        const oy = j * CY + 0.25;
        const oz = -k * CZ - CZ + 0.15;
        for (let s = 0; s < 4; s++) {
          const sy = oy + s * 0.62;
          shelfM.push(m.clone().compose(new THREE.Vector3(ox + 1.8, sy, oz), new THREE.Quaternion(), new THREE.Vector3(3.6, 0.03, 0.3)));
          let x = ox + 0.05;
          while (x < ox + 3.5) {
            if (r() < 0.08) {
              x += 0.1 + r() * 0.15;
              continue;
            }
            const w = 0.05 + r() * 0.05;
            const h = 0.3 + r() * 0.2;
            bookM.push(m.clone().compose(new THREE.Vector3(x + w / 2, sy + h / 2 + 0.015, oz), new THREE.Quaternion(), new THREE.Vector3(w, h, 0.22)));
            bookC.push(new THREE.Color(palette[Math.floor(r() * palette.length)]));
            x += w + 0.004;
          }
        }
      }
  const books = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.7 }), bookM.length);
  bookM.forEach((b, i) => {
    books.setMatrixAt(i, b);
    books.setColorAt(i, bookC[i]);
  });
  scene.add(books);
  const shelves = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), beamMat, shelfM.length);
  shelfM.forEach((b, i) => shelves.setMatrixAt(i, b));
  scene.add(shelves);

  // Threads of gravity (glowing strings) running vertically through the lattice.
  const threadGeo = new THREE.CylinderGeometry(0.012, 0.012, CY * (NJ * 2 + 1), 4, 40, true);
  const threadMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      uniform float uTime; attribute vec3 aOff; attribute float aPhase; varying float vP;
      void main() {
        vec3 p = position;
        float vib = sin(p.y * 2.0 + uTime * 9.0 + aPhase * 30.0) * 0.03 * (0.5 + 0.5 * sin(uTime * 0.7 + aPhase * 10.0));
        p.x += vib; p.z += vib * 0.6;
        vP = aPhase;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p + aOff, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `varying float vP; void main() { gl_FragColor = vec4(vec3(1.0, 0.72, 0.38) * (2.2 + vP * 2.0), 1.0); }`,
  });
  const threadInst = new THREE.InstancedBufferGeometry().copy(threadGeo as unknown as THREE.InstancedBufferGeometry);
  const offs: number[] = [];
  const phases: number[] = [];
  for (let i = -NI; i <= NI; i++)
    for (let k = -1; k <= NK; k += 1) {
      if (r() < 0.55) continue;
      offs.push(i * CX + 0.5 + r() * 3, 0, -k * CZ - 0.6 - r() * 2.5);
      phases.push(r());
    }
  threadInst.setAttribute('aOff', new THREE.InstancedBufferAttribute(new Float32Array(offs), 3));
  threadInst.setAttribute('aPhase', new THREE.InstancedBufferAttribute(new Float32Array(phases), 1));
  threadInst.instanceCount = phases.length;
  const threads = new THREE.Mesh(threadInst, threadMat);
  threads.frustumCulled = false;
  scene.add(threads);

  // The bedroom on the other side of the central shelf: cool light through the gaps.
  const room = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.6), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 1.15, 1.5) }));
  room.position.set(1.95, 1.35, -CZ - 0.05);
  scene.add(room);

  scene.add(new THREE.HemisphereLight('#ffcf8a', '#2a1406', 0.7));
  const warm = new THREE.PointLight('#ffb060', 60, 30, 1.4);
  warm.position.set(2, 2, -3);
  scene.add(warm);
  const key = new THREE.DirectionalLight('#ffd9a0', 1.4);
  key.position.set(3, 8, 6);
  scene.add(key);

  const motes = particles({
    count: hi ? 2200 : 1100,
    seed: 6,
    pos: (_, rr) => [(rr() - 0.5) * 40, (rr() - 0.5) * 24, -rr() * 60 + 6],
    color: '#ffc880',
    size: [0.02, 0.07],
    drift: new THREE.Vector3(0.02, 0.03, 0.05),
    box: new THREE.Vector3(40, 24, 66),
    opacity: 0.8,
    twinkle: 0.5,
  });
  scene.add(motes);

  const look = new THREE.Vector3();
  return {
    scene,
    camera,
    exposure: 1.1,
    bloom: { strength: 0.8, radius: 0.6, threshold: 1.0 },
    focus: new THREE.Vector3(1.8, 1.3, -CZ),
    anchors: [
      { at: new THREE.Vector3(1.8, 2.7, -CZ), label: 'The bookshelf · Murph’s side' },
      { at: new THREE.Vector3(CX + 1, 4, -2 * CZ), label: 'Another moment of the same room' },
      { at: new THREE.Vector3(-CX + 1.5, -1, -3 * CZ), label: 'Threads of gravity' },
    ],
    update(t, _dt, k, free) {
      threadMat.uniforms.uTime.value = t;
      (motes.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
      if (!free) {
        const e = easeInOut(k);
        camera.position.set(1.2 + Math.sin(t * 0.2) * 0.4, 1.6 + e * 0.6, 6 - e * 8.5);
        look.set(1.9 - e * 0.4, 1.3, -CZ - 4);
        camera.lookAt(look);
        camera.rotation.z += Math.sin(t * 0.15) * 0.06 + e * 0.08;
        handheld(camera, t, 0.6);
      }
    },
    dispose() {
      disposeScene(scene);
    },
  };
};
