import * as THREE from 'three';
import { disposeScene, easeInOut, fbm, handheld, particles, rng, skyDome, std, terrain } from '../lib';
import type { SceneBuilder } from '../types';
import { createRanger } from './parts';

/**
 * EDMUNDS' PLANET — a dry, rocky, breathable world at dusk, and a small camp
 * with warm lights: the beginning of a settlement.
 */
export const buildEdmunds: SceneBuilder = (ctx) => {
  const hi = ctx.quality === 'high';
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#c7896a', 120, 2600);
  const camera = new THREE.PerspectiveCamera(44, 1, 0.3, 9000);

  const sunDir = new THREE.Vector3(0.75, 0.1, -0.65).normalize();
  scene.add(skyDome({ top: '#2c4a5e', horizon: '#f0a070', bottom: '#5a3426', sunDir, sunColor: '#ffd2a0', sunSize: 0.06, sunIntensity: 10, hazeHeight: 0.16, radius: 8000, stars: 0.6 }));

  const H = (x: number, z: number) => {
    const dunes = fbm(x * 0.006, z * 0.006, 4) * 40;
    const rocky = Math.pow(fbm(x * 0.02 + 5, z * 0.02, 4), 3) * 30;
    const mesa = Math.max(0, fbm(x * 0.0015 + 9, z * 0.0015, 3) - 0.55) * 1400;
    const camp = Math.exp(-((x - 10) ** 2 + (z + 120) ** 2) / 9000);
    return (dunes + rocky + Math.min(mesa, 260)) * (1 - camp * 0.9) - 20;
  };
  const geo = terrain(4000, hi ? 300 : 180, H);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const nor = geo.attributes.normal as THREE.BufferAttribute;
  const cols = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const slope = 1 - nor.getY(i);
    const n = fbm(pos.getX(i) * 0.05, pos.getZ(i) * 0.05, 2);
    const sand = [0.62 + n * 0.1, 0.42 + n * 0.08, 0.28];
    const rock = [0.36, 0.24, 0.18];
    const k = Math.min(1, slope * 2.5);
    for (let c = 0; c < 3; c++) cols[i * 3 + c] = sand[c] + (rock[c] - sand[c]) * k;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const ground = new THREE.Mesh(geo, std('#ffffff', { vertexColors: true, roughness: 0.95 }));
  ground.receiveShadow = true;
  ground.castShadow = true;
  scene.add(ground);

  const sun = new THREE.DirectionalLight('#ffc890', 3.4);
  sun.position.copy(sunDir).multiplyScalar(220).add(new THREE.Vector3(10, 0, -120));
  sun.target.position.set(10, 0, -120);
  sun.castShadow = true;
  sun.shadow.mapSize.set(hi ? 2048 : 1024, hi ? 2048 : 1024);
  const sc = sun.shadow.camera;
  sc.left = -120;
  sc.right = 120;
  sc.top = 120;
  sc.bottom = -120;
  sc.far = 600;
  scene.add(sun, sun.target, new THREE.HemisphereLight('#5a7a96', '#6a3a24', 0.9));

  // Rocks.
  const r = rng(13);
  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  const rocks = new THREE.InstancedMesh(rockGeo, std('#5a3c2c', { roughness: 0.9, flatShading: true }), hi ? 500 : 250);
  const mm = new THREE.Matrix4();
  for (let i = 0; i < rocks.count; i++) {
    const x = (r() - 0.5) * 500;
    const z = -r() * 500 + 60;
    const s = 0.4 + Math.pow(r(), 3) * 6;
    // keep the camera corridor (from the dolly start towards the camp) clear
    const ax = -50, az = -30, bx = 10, bz = -120;
    const tt = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (z - az) * (bz - az)) / ((bx - ax) ** 2 + (bz - az) ** 2)));
    const dx = x - (ax + (bx - ax) * tt), dz = z - (az + (bz - az) * tt);
    const keepOut = (tt < 0.75 ? 18 : 6) + s * 2;
    const hide = dx * dx + dz * dz < keepOut * keepOut;
    mm.compose(
      new THREE.Vector3(x, H(x, z) + (hide ? -400 : s * 0.05), z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 3, r() * 3, r() * 3)),
      new THREE.Vector3(s, s * (0.5 + r() * 0.6), s * (0.7 + r() * 0.5)),
    );
    rocks.setMatrixAt(i, mm);
  }
  rocks.castShadow = true;
  rocks.receiveShadow = true;
  scene.add(rocks);

  // The camp.
  const camp = new THREE.Group();
  const white = std('#e8e4dc', { roughness: 0.55 });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), white);
  const dome2 = dome.clone();
  dome2.scale.setScalar(0.7);
  dome2.position.set(11, 0, 4);
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 7, 16), white);
  tube.rotation.z = Math.PI / 2;
  tube.position.set(5.5, 1.4, 2);
  const glowM = new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 3.4, 1.4) });
  const w1 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.1), glowM);
  w1.position.set(0, 2.2, 4.9);
  const w2 = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.4, 0.1), glowM);
  w2.position.set(11, 1.4, 7.4);
  camp.add(dome, dome2, tube, w1, w2);
  // Solar panels.
  for (let i = 0; i < 4; i++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.08, 1.8), std('#1a2230', { metalness: 0.7, roughness: 0.25 }));
    p.position.set(-9 - i * 3.8, 1.3, 6);
    p.rotation.x = -0.5;
    camp.add(p);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.3, 6), std('#7a7a7a'));
    leg.position.set(-9 - i * 3.8, 0.65, 6);
    camp.add(leg);
  }
  // Edmunds' marker.
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.2, 6), std('#8a8a8a', { metalness: 0.6 }));
  pole.position.set(18, 1.6, 12);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.7), std('#d8d2c4', { side: THREE.DoubleSide }));
  flag.position.set(18.62, 2.8, 12);
  camp.add(pole, flag);
  camp.traverse((o) => {
    (o as THREE.Mesh).castShadow = true;
    (o as THREE.Mesh).receiveShadow = true;
  });
  camp.position.set(10, H(10, -120), -120);
  scene.add(camp);
  const lamp = new THREE.PointLight('#ffb070', 120, 40, 1.5);
  lamp.position.copy(camp.position).add(new THREE.Vector3(2, 3, 8));
  scene.add(lamp);
  const lander = createRanger();
  lander.scale.setScalar(2.2);
  lander.position.copy(camp.position).add(new THREE.Vector3(-22, 2.2, -10));
  lander.rotation.y = 0.8;
  scene.add(lander);

  const dust = particles({
    count: hi ? 900 : 450,
    seed: 8,
    pos: (_, rr) => [(rr() - 0.5) * 200, rr() * 20, (rr() - 0.5) * 200],
    color: '#ffcf9a',
    size: [0.1, 0.35],
    drift: new THREE.Vector3(2.5, 0.1, 0.5),
    box: new THREE.Vector3(200, 20, 200),
    opacity: 0.45,
  });
  dust.position.set(10, camp.position.y + 8, -100);
  scene.add(dust);

  const look = new THREE.Vector3();
  return {
    scene,
    camera,
    exposure: 1.0,
    bloom: { strength: 0.7, radius: 0.6, threshold: 1.2 },
    focus: camp.position.clone().add(new THREE.Vector3(0, 3, 0)),
    anchors: [
      { at: camp.position.clone().add(new THREE.Vector3(0, 6, 0)), label: 'Brand’s camp · Plan B' },
      { at: camp.position.clone().add(new THREE.Vector3(18, 3.6, 12)), label: 'Edmunds’ marker' },
      { at: lander.position.clone().add(new THREE.Vector3(0, 3, 0)), label: 'Lander' },
    ],
    update(t, _dt, k, free) {
      (dust.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
      flag.rotation.y = Math.sin(t * 1.4) * 0.25;
      if (!free) {
        const e = easeInOut(k);
        const cp = camp.position;
        const cx = cp.x - 60 + e * 30;
        const cz = cp.z + 90 - e * 45;
        // keep the line of sight to the camp clear of the terrain
        let cy = Math.max(H(cx, cz) + 4, cp.y + 10 - e * 3);
        for (let i = 1; i < 12; i++) {
          const f = i / 12;
          const gx = cx + (cp.x - cx) * f;
          const gz = cz + (cp.z - cz) * f;
          const need = (H(gx, gz) + 2.5 - (cp.y + 3) * f) / (1 - f);
          if (need > cy) cy = need;
        }
        camera.position.set(cx, cy, cz);
        look.set(cp.x + 8, cp.y + 3, cp.z - 6);
        camera.lookAt(look);
        handheld(camera, t, 0.8);
      }
    },
    dispose() {
      disposeScene(scene);
    },
  };
};
