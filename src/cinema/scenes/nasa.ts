import * as THREE from 'three';
import { box, canvasTexture, disposeScene, easeInOut, handheld, lightShaft, particles, rng, seg, std } from '../lib';
import type { SceneBuilder } from '../types';

/**
 * NASA · SECRET FACILITY — a concrete launch silo: catwalks, a gantry, steam,
 * and the launch vehicle with a Ranger on top, lit from below and from the sky above.
 */

function concrete() {
  return canvasTexture(512, 512, (c) => {
    c.fillStyle = '#5c5f62';
    c.fillRect(0, 0, 512, 512);
    const r = rng(8);
    for (let i = 0; i < 2600; i++) {
      c.fillStyle = `rgba(${r() < 0.5 ? 20 : 200},${r() < 0.5 ? 20 : 200},${r() < 0.5 ? 20 : 200},0.05)`;
      c.fillRect(r() * 512, r() * 512, 2 + r() * 6, 2 + r() * 6);
    }
    c.strokeStyle = 'rgba(15,15,18,0.65)';
    c.lineWidth = 3;
    for (let y = 0; y < 512; y += 128) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(512, y);
      c.stroke();
    }
    for (let x = 0; x < 512; x += 170) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, 512);
      c.stroke();
    }
    for (let i = 0; i < 18; i++) {
      const g = c.createLinearGradient(0, 0, 0, 512);
      g.addColorStop(0, 'rgba(20,18,15,0)');
      g.addColorStop(1, 'rgba(20,18,15,0.25)');
      c.fillStyle = g;
      c.fillRect(r() * 512, 0, 3 + r() * 10, 512);
    }
  });
}

function hull() {
  return canvasTexture(256, 1024, (c) => {
    c.fillStyle = '#e9e7e2';
    c.fillRect(0, 0, 256, 1024);
    for (let y = 0; y < 1024; y += 64) {
      c.fillStyle = 'rgba(60,60,64,0.35)';
      c.fillRect(0, y, 256, 2);
    }
    c.fillStyle = '#1d1f22';
    c.fillRect(0, 120, 256, 26);
    c.fillRect(0, 700, 256, 40);
    c.fillStyle = '#9a2a1e';
    c.fillRect(30, 420, 40, 140);
  });
}

export const buildNasa: SceneBuilder = (ctx) => {
  const hi = ctx.quality === 'high';
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#05070a');
  scene.fog = new THREE.FogExp2('#1b232c', 0.014);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 500);

  const R = 10;
  const Ht = 64;

  // Silo walls.
  const tex = concrete();
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 5);
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(R, R, Ht, 64, 1, true), std('#ffffff', { map: tex, side: THREE.BackSide, roughness: 0.92 }));
  wall.position.y = Ht / 2;
  wall.receiveShadow = true;
  scene.add(wall);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(R, 64), std('#2a2d30', { roughness: 0.8, metalness: 0.2 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Sky opening at the top (HDR).
  const opening = new THREE.Mesh(new THREE.CircleGeometry(R * 0.98, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.4, 2.7), fog: false }));
  opening.rotation.x = Math.PI / 2;
  opening.position.y = Ht;
  scene.add(opening);
  const shaftTop = lightShaft(new THREE.Vector3(0, Ht, 0), new THREE.Vector3(0, 6, 0), R * 0.85, R * 0.95, '#b9d4ff', 0.08);
  scene.add(shaftTop);

  // Ribs and catwalks.
  const steel = std('#3a3f45', { metalness: 0.6, roughness: 0.45 });
  const rail = std('#c9a03a', { metalness: 0.3, roughness: 0.5 });
  for (let y = 4; y < Ht; y += 8) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(R - 0.15, 0.18, 6, 64), steel);
    rib.rotation.x = Math.PI / 2;
    rib.position.y = y;
    scene.add(rib);
  }
  [10, 24, 40].forEach((y) => {
    const grate = new THREE.Mesh(new THREE.RingGeometry(R - 2.2, R - 0.2, 64), std('#2e3236', { metalness: 0.5, roughness: 0.6, side: THREE.DoubleSide }));
    grate.rotation.x = -Math.PI / 2;
    grate.position.y = y;
    grate.receiveShadow = true;
    grate.castShadow = true;
    scene.add(grate);
    const railM = new THREE.Mesh(new THREE.TorusGeometry(R - 2.2, 0.05, 6, 96), rail);
    railM.rotation.x = Math.PI / 2;
    railM.position.y = y + 1.1;
    scene.add(railM);
    // Bridge from the catwalk to the gantry.
    scene.add(box(5.5, 0.15, 1.4, std('#2e3236', { metalness: 0.5 }), -4.2, y, 0));
    // Sodium lamps on the catwalk.
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + y;
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 3.2, 1.2) }));
      lamp.position.set(Math.cos(a) * (R - 0.4), y + 2.2, Math.sin(a) * (R - 0.4));
      scene.add(lamp);
    }
  });

  // ── Launch vehicle
  const vehicle = new THREE.Group();
  const hullTex = hull();
  const white = std('#ffffff', { map: hullTex, roughness: 0.55, metalness: 0.15 });
  const booster = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 30, 40), white);
  booster.position.y = 15.5;
  const stage2 = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.7, 9, 40), white);
  stage2.position.y = 35;
  const fairingPts: THREE.Vector2[] = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    fairingPts.push(new THREE.Vector2(1.45 * Math.max(0, Math.cos(t * Math.PI * 0.5)) ** 0.7, 39.5 + t * 7));
  }
  const fairing = new THREE.Mesh(new THREE.LatheGeometry(fairingPts, 40), std('#e3e1dc', { roughness: 0.45, metalness: 0.2 }));
  // Engine bells.
  [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8], [0, 0]].forEach(([x, z]) => {
    const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, 1.3, 20, 1, true), std('#2a2522', { metalness: 0.8, roughness: 0.35, side: THREE.DoubleSide }));
    bell.position.set(x, 0.4, z);
    vehicle.add(bell);
  });
  // Fins.
  for (let i = 0; i < 4; i++) {
    const fin = box(0.12, 4, 2.2, std('#2c2f33', { metalness: 0.4 }), 0, 3, 0);
    fin.position.set(Math.cos((i * Math.PI) / 2) * 2.4, 3, Math.sin((i * Math.PI) / 2) * 2.4);
    fin.rotation.y = -(i * Math.PI) / 2;
    vehicle.add(fin);
  }
  vehicle.add(booster, stage2, fairing);
  vehicle.traverse((o) => {
    const m = o as THREE.Mesh;
    m.castShadow = true;
    m.receiveShadow = true;
  });
  scene.add(vehicle);

  // Gantry tower.
  const gantry = new THREE.Group();
  const red = std('#8a3a22', { metalness: 0.4, roughness: 0.6 });
  const gx = -6.2;
  for (const [x, z] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]) gantry.add(box(0.3, 52, 0.3, red, gx + x, 26, z));
  for (let y = 2; y < 52; y += 3.5) {
    gantry.add(box(2.7, 0.18, 0.18, red, gx, y, -1.2), box(2.7, 0.18, 0.18, red, gx, y, 1.2), box(0.18, 0.18, 2.7, red, gx - 1.2, y, 0), box(0.18, 0.18, 2.7, red, gx + 1.2, y, 0));
    const d = box(0.12, 4.4, 0.12, red, gx - 1.2, y + 1.75, 0);
    d.rotation.x = 0.66;
    gantry.add(d);
  }
  gantry.traverse((o) => ((o as THREE.Mesh).castShadow = true));
  scene.add(gantry);

  // ── Lights
  scene.add(new THREE.HemisphereLight('#7a93b0', '#1a1410', 0.55));
  const key = new THREE.SpotLight('#dbe8ff', 900, 90, 0.42, 0.6, 1.5);
  key.position.set(7, 14, 6);
  key.target.position.set(0, 26, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(hi ? 1024 : 512, hi ? 1024 : 512);
  scene.add(key, key.target);
  const key2 = new THREE.SpotLight('#ffd7a0', 600, 80, 0.5, 0.7, 1.5);
  key2.position.set(6, 40, -6);
  key2.target.position.set(0, 34, 0);
  scene.add(key2, key2.target);
  const sodium = new THREE.PointLight('#ff9a40', 260, 40, 1.6);
  sodium.position.set(0, 3, 4);
  scene.add(sodium);
  const top = new THREE.DirectionalLight('#cfe0ff', 1.6);
  top.position.set(2, 80, 1);
  scene.add(top);

  // Steam at the base and dust in the beams.
  const steam = particles({
    count: hi ? 500 : 250,
    seed: 9,
    pos: (_, r) => {
      const a = r() * Math.PI * 2;
      const d = 2 + r() * 7;
      return [Math.cos(a) * d, r() * 6, Math.sin(a) * d];
    },
    color: '#c9d2dc',
    size: [1.2, 3.5],
    drift: new THREE.Vector3(0, 0.6, 0),
    box: new THREE.Vector3(18, 9, 18),
    opacity: 0.12,
    additive: true,
  });
  steam.position.y = 4.5;
  scene.add(steam);
  const motes = particles({
    count: hi ? 1600 : 800,
    seed: 10,
    pos: (_, r) => [(r() - 0.5) * 18, r() * Ht, (r() - 0.5) * 18],
    color: '#dfe8ff',
    size: [0.04, 0.12],
    drift: new THREE.Vector3(0.05, -0.1, 0),
    box: new THREE.Vector3(18, Ht, 18),
    opacity: 0.6,
  });
  motes.position.y = Ht / 2;
  scene.add(motes);

  // ── Camera: vertical tracking up the vehicle.
  const look = new THREE.Vector3();
  const pos = new THREE.Vector3();

  return {
    scene,
    camera,
    exposure: 1.05,
    bloom: { strength: 0.55, radius: 0.35, threshold: 1.4 },
    focus: new THREE.Vector3(0, 22, 0),
    anchors: [
      { at: new THREE.Vector3(0, 46.5, 0), label: 'Ranger fairing' },
      { at: new THREE.Vector3(gx, 52, 0), label: 'Gantry' },
      { at: new THREE.Vector3(0, Ht, 0), label: 'Silo opening' },
      { at: new THREE.Vector3(R - 2, 24, 0), label: 'Catwalk' },
    ],
    update(t, _dt, k, free) {
      for (const p of [steam, motes]) (p.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
      (shaftTop.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
      if (!free) {
        const e = easeInOut(k);
        const a = 0.9 + e * 1.1;
        const rad = 7.2 - e * 1.2;
        pos.set(Math.cos(a) * rad, 2.2 + e * 38, Math.sin(a) * rad);
        camera.position.copy(pos);
        look.set(0, 14 + e * 34, 0);
        camera.lookAt(look);
        camera.rotation.z += (1 - seg(k, 0, 0.3)) * 0.05;
        handheld(camera, t, 0.8);
      }
    },
    dispose() {
      disposeScene(scene);
    },
  };
};
