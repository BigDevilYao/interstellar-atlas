import * as THREE from 'three';
import { box, canvasTexture, disposeScene, easeInOut, handheld, lightShaft, particles, rng, seg, std } from '../lib';
import type { SceneBuilder } from '../types';
import { createWatch, createWatchStory, setTime, watchEnvironment } from './watch';

/**
 * MURPH'S ROOM — late-afternoon interior: dusty window light, a wall of books,
 * falling books and dust bands on the floor. Variant 'adult': evening, the watch.
 */

const W = 4.2;
const H = 2.7;
const D = 4.6;
const X0 = -W / 2;
const X1 = W / 2;
const Z0 = -D / 2;
const Z1 = D / 2;

function planks() {
  return canvasTexture(512, 512, (c) => {
    const r = rng(4);
    for (let i = 0; i < 8; i++) {
      const y = i * 64;
      let x = -r() * 200;
      while (x < 512) {
        const len = 160 + r() * 220;
        const l = 38 + r() * 18;
        c.fillStyle = `hsl(${26 + r() * 8}, ${32 + r() * 12}%, ${l}%)`;
        c.fillRect(x, y, len, 64);
        c.strokeStyle = 'rgba(40,24,12,0.18)';
        for (let g = 0; g < 7; g++) {
          c.beginPath();
          const gy = y + 6 + r() * 52;
          c.moveTo(x, gy);
          c.bezierCurveTo(x + len * 0.3, gy + (r() - 0.5) * 8, x + len * 0.7, gy + (r() - 0.5) * 8, x + len, gy);
          c.stroke();
        }
        c.fillStyle = 'rgba(20,12,6,0.55)';
        c.fillRect(x, y, 2, 64);
        x += len;
      }
      c.fillStyle = 'rgba(20,12,6,0.6)';
      c.fillRect(0, y, 512, 2);
    }
  });
}

function wallpaper(adult: boolean) {
  return canvasTexture(512, 512, (c) => {
    c.fillStyle = adult ? '#a9aeb0' : '#c9c1ad';
    c.fillRect(0, 0, 512, 512);
    for (let x = 0; x < 512; x += 32) {
      c.fillStyle = 'rgba(120,110,90,0.12)';
      c.fillRect(x, 0, 12, 512);
      c.fillStyle = 'rgba(255,250,235,0.06)';
      c.fillRect(x + 14, 0, 3, 512);
    }
    const r = rng(9);
    for (let i = 0; i < 40; i++) {
      const g = c.createRadialGradient(r() * 512, r() * 512, 0, r() * 512, r() * 512, 40 + r() * 80);
      g.addColorStop(0, 'rgba(110,90,60,0.08)');
      g.addColorStop(1, 'rgba(110,90,60,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, 512, 512);
    }
  });
}

export function skyOutsideCanvas(adult: boolean) {
  return canvasTexture(512, 256, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 256);
    if (adult) {
      g.addColorStop(0, '#2a3c5a');
      g.addColorStop(0.6, '#c97a4a');
      g.addColorStop(1, '#3a2a20');
    } else {
      g.addColorStop(0, '#d9c9a0');
      g.addColorStop(0.55, '#f6dfa6');
      g.addColorStop(1, '#8a6a3c');
    }
    c.fillStyle = g;
    c.fillRect(0, 0, 512, 256);
    // Corn horizon silhouette.
    c.fillStyle = adult ? '#1a140f' : '#5a4626';
    c.beginPath();
    c.moveTo(0, 256);
    for (let x = 0; x <= 512; x += 4) c.lineTo(x, 170 + Math.sin(x * 0.11) * 3 + Math.sin(x * 0.37) * 2);
    c.lineTo(512, 256);
    c.fill();
  });
}

function quilt() {
  return canvasTexture(256, 256, (c) => {
    const cols = ['#7d5a46', '#c9b48a', '#5f6e6a', '#a5543c', '#e3d8bd', '#46525e'];
    const r = rng(12);
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++) {
        c.fillStyle = cols[Math.floor(r() * cols.length)];
        c.fillRect(x * 32, y * 32, 32, 32);
        c.strokeStyle = 'rgba(255,255,255,0.15)';
        c.strokeRect(x * 32 + 2, y * 32 + 2, 28, 28);
      }
  });
}

export const buildBedroom: SceneBuilder = (ctx, variant) => {
  const adult = variant === 'adult';
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(adult ? '#0b0d12' : '#120d08');
  scene.fog = new THREE.FogExp2(adult ? '#2a2c34' : '#8a6a44', 0.018);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 100);
  const hi = ctx.quality === 'high';

  // ── Lights
  const sunPos = new THREE.Vector3(9, adult ? 3.2 : 5.5, -3.2);
  const sun = new THREE.DirectionalLight(adult ? '#ff9a5a' : '#ffc77a', adult ? 3 : 9);
  sun.position.copy(sunPos);
  sun.target.position.set(0, 0, 0.3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(hi ? 2048 : 1024, hi ? 2048 : 1024);
  sun.shadow.camera.left = -4;
  sun.shadow.camera.right = 4;
  sun.shadow.camera.top = 4;
  sun.shadow.camera.bottom = -4;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 25;
  sun.shadow.bias = -0.0008;
  sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);
  scene.add(new THREE.HemisphereLight(adult ? '#6a7a9a' : '#c9c2b4', adult ? '#2a1c12' : '#5a3e26', adult ? 0.8 : 1.05));
  const bounce = new THREE.PointLight(adult ? '#ffb070' : '#ffc890', adult ? 10 : 12, 9, 1.3);
  bounce.position.set(adult ? -1.2 : 0.5, adult ? 1.9 : 0.6, adult ? -1.2 : 0.6);
  scene.add(bounce);

  // ── Room shell
  const floorTex = planks();
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(2, 2);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), std('#ffffff', { map: floorTex, roughness: 0.62 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const wallTex = wallpaper(adult);
  wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
  wallTex.repeat.set(2, 1.3);
  const wallMat = std('#ffffff', { map: wallTex, roughness: 0.9 });
  const add = (m: THREE.Mesh, cast = true) => {
    m.castShadow = cast;
    m.receiveShadow = true;
    scene.add(m);
    return m;
  };
  add(box(W, H, 0.1, wallMat, 0, H / 2, Z0 - 0.05));
  add(box(0.1, H, D, wallMat, X0 - 0.05, H / 2, 0));
  add(box(W, H, 0.1, wallMat, 0, H / 2, Z1 + 0.05));
  add(box(W + 0.2, 0.1, D + 0.2, std('#d8d2c4', { roughness: 0.95 }), 0, H + 0.05, 0));
  // Window wall with an opening (z ∈ [-1.1, 0.5], y ∈ [0.9, 2.15]).
  const wz0 = -1.1;
  const wz1 = 0.5;
  const wy0 = 0.9;
  const wy1 = 2.15;
  add(box(0.1, H, wz0 - Z0, wallMat, X1 + 0.05, H / 2, (Z0 + wz0) / 2));
  add(box(0.1, H, Z1 - wz1, wallMat, X1 + 0.05, H / 2, (wz1 + Z1) / 2));
  add(box(0.1, wy0, wz1 - wz0, wallMat, X1 + 0.05, wy0 / 2, (wz0 + wz1) / 2));
  add(box(0.1, H - wy1, wz1 - wz0, wallMat, X1 + 0.05, (wy1 + H) / 2, (wz0 + wz1) / 2));
  // Window frame and mullions.
  const trim = std('#e9e4d8', { roughness: 0.6 });
  const wmz = (wz0 + wz1) / 2;
  add(box(0.14, 0.06, wz1 - wz0 + 0.1, trim, X1, wy0, wmz));
  add(box(0.14, 0.06, wz1 - wz0 + 0.1, trim, X1, wy1, wmz));
  add(box(0.14, wy1 - wy0, 0.06, trim, X1, (wy0 + wy1) / 2, wz0));
  add(box(0.14, wy1 - wy0, 0.06, trim, X1, (wy0 + wy1) / 2, wz1));
  add(box(0.08, wy1 - wy0, 0.03, trim, X1, (wy0 + wy1) / 2, wmz));
  add(box(0.08, 0.03, wz1 - wz0, trim, X1, (wy0 + wy1) / 2, wmz));
  // Baseboards.
  const base = std('#3a2a1e', { roughness: 0.7 });
  add(box(W, 0.1, 0.03, base, 0, 0.05, Z0 + 0.015), false);
  add(box(0.03, 0.1, D, base, X0 + 0.015, 0.05, 0), false);

  // Sky beyond the window (procedural HDR: dusty sky, corn horizon).
  const skyMat = new THREE.ShaderMaterial({
    uniforms: { uI: { value: adult ? 1.5 : 2.6 }, uAdult: { value: adult ? 1 : 0 } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uI, uAdult; varying vec2 vUv;
      void main() {
        float y = vUv.y;
        vec3 day = mix(vec3(0.95, 0.72, 0.42), vec3(0.78, 0.74, 0.62), smoothstep(0.35, 1.0, y));
        vec3 dusk = mix(vec3(1.0, 0.45, 0.2), vec3(0.15, 0.22, 0.4), smoothstep(0.3, 1.0, y));
        vec3 col = mix(day, dusk, uAdult);
        float horizon = 0.33 + sin(vUv.x * 70.0) * 0.004 + sin(vUv.x * 230.0) * 0.003;
        float corn = smoothstep(horizon + 0.004, horizon - 0.004, y);
        col = mix(col, mix(vec3(0.28, 0.2, 0.1), vec3(0.04, 0.03, 0.02), uAdult), corn);
        col *= 1.0 + smoothstep(0.5, 0.0, abs(y - 0.36)) * 0.6 * (1.0 - corn);
        gl_FragColor = vec4(col * uI, 1.0);
      }
    `,
    fog: false,
  });
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(9, 4.5), skyMat);
  sky.position.set(X1 + 2.5, 1.6, wmz);
  sky.rotation.y = -Math.PI / 2;
  scene.add(sky);

  // Sheer curtain.
  const cg = new THREE.PlaneGeometry(0.7, 1.45, 24, 1);
  const cp = cg.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < cp.count; i++) cp.setZ(i, Math.sin(cp.getX(i) * 22) * 0.025);
  cg.computeVertexNormals();
  const curtain = new THREE.Mesh(
    cg,
    std('#efe6d2', { transparent: true, opacity: 0.75, side: THREE.DoubleSide, emissive: new THREE.Color(adult ? '#3a2416' : '#7a5a34'), roughness: 1 }),
  );
  curtain.position.set(X1 - 0.08, 1.5, wz1 + 0.15);
  curtain.rotation.y = -Math.PI / 2;
  scene.add(curtain);

  // ── Bookshelf
  const shelfX = 0.35;
  const sw = 2.0;
  const sh = 2.3;
  const sd = 0.34;
  const sz = Z0 + sd / 2 + 0.02;
  const wood = std('#3b2618', { roughness: 0.55 });
  add(box(0.05, sh, sd, wood, shelfX - sw / 2, sh / 2, sz));
  add(box(0.05, sh, sd, wood, shelfX + sw / 2, sh / 2, sz));
  add(box(sw, 0.02, sd, wood, shelfX, sh, sz));
  add(box(sw, sh, 0.02, std('#24170e'), shelfX, sh / 2, Z0 + 0.03));
  const levels = [0.08, 0.5, 0.92, 1.34, 1.76];
  levels.forEach((y) => add(box(sw, 0.035, sd, wood, shelfX, y, sz)));

  const palette = ['#7a2e24', '#b08a4a', '#2e4a3a', '#23324a', '#d8ccb0', '#5a3a26', '#8a6a3a', '#3a3a3a', '#a4523a', '#6a7a6a'];
  const r = rng(adult ? 31 : 21);
  const books: { x: number; y: number; w: number; h: number; d: number; tilt: number; c: string }[] = [];
  levels.slice(0, 4).forEach((y, li) => {
    let x = shelfX - sw / 2 + 0.05;
    while (x < shelfX + sw / 2 - 0.08) {
      if (r() < 0.07) {
        x += 0.08 + r() * 0.1;
        continue;
      }
      if (li === 2 && x > shelfX + 0.45 && x < shelfX + 0.75) {
        x += 0.05; // space for the watch
        continue;
      }
      const w = 0.022 + r() * 0.04;
      const h = 0.2 + r() * 0.15;
      const tilt = r() < 0.06 ? (r() - 0.5) * 0.5 : 0;
      books.push({ x: x + w / 2, y: y + 0.018 + h / 2, w, h, d: 0.2 + r() * 0.08, tilt, c: palette[Math.floor(r() * palette.length)] });
      x += w + 0.003;
    }
  });
  const bookMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), std('#ffffff', { roughness: 0.7 }), books.length);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const col = new THREE.Color();
  books.forEach((b, i) => {
    q.setFromEuler(new THREE.Euler(0, 0, b.tilt));
    m4.compose(new THREE.Vector3(b.x, b.y, sz + 0.02), q, new THREE.Vector3(b.w, b.h, b.d));
    bookMesh.setMatrixAt(i, m4);
    bookMesh.setColorAt(i, col.set(b.c));
  });
  bookMesh.castShadow = true;
  bookMesh.receiveShadow = true;
  scene.add(bookMesh);

  // Falling books (two).
  const fallMat = std('#7a2e24');
  const fallA = add(box(0.04, 0.26, 0.22, fallMat, shelfX - 0.3, 1.34 + 0.15, sz + 0.03));
  const fallB = add(box(0.05, 0.3, 0.24, std('#23324a'), shelfX + 0.2, 1.76 + 0.17, sz + 0.03));
  const fallStartA = fallA.position.clone();
  const fallStartB = fallB.position.clone();

  // The watch — standing on its strap in the gap on the third shelf.
  const wm = createWatch(adult ? 0.03 : 0.024);
  const plankTop = 0.92 + 0.0175;
  wm.group.position.set(shelfX + 0.6, plankTop, sz + 0.02);
  wm.group.rotation.y = adult ? -0.42 : 0.3;
  scene.add(wm.group);
  const envTex = watchEnvironment(ctx.renderer, true);
  wm.materials.forEach((m) => {
    m.envMap = envTex;
    m.envMapIntensity = adult ? 0.9 : 0.7;
  });
  wm.group.updateMatrixWorld(true);
  const watchCenter = wm.center.clone().applyMatrix4(wm.group.matrixWorld);
  // A soft key light so the watch reads as an object, not a light source.
  const key = new THREE.SpotLight(adult ? '#ffd9a8' : '#fff0d8', adult ? 1.6 : 0.6, 2.4, 0.32, 0.8, 1.6);
  key.position.copy(watchCenter).add(new THREE.Vector3(-0.55, 0.5, 0.9));
  key.target.position.copy(watchCenter);
  key.castShadow = adult;
  key.shadow.mapSize.set(512, 512);
  key.shadow.bias = -0.0005;
  scene.add(key, key.target);
  const story = adult ? createWatchStory(wm, watchCenter, Z0 + 0.045, [shelfX + 0.46, shelfX + 0.76], [0.1, 2.25]) : null;
  if (story) scene.add(story.group);

  // ── Bed
  const bx = X0 + 0.55;
  add(box(1.0, 0.32, 2.0, std('#4a3220', { roughness: 0.6 }), bx, 0.16, 0.6));
  add(box(0.95, 0.18, 1.95, std('#e8e2d4', { roughness: 0.95 }), bx, 0.41, 0.6));
  add(box(1.0, 0.06, 1.5, std('#ffffff', { map: quilt(), roughness: 1 }), bx, 0.53, 0.82));
  const pillow = add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 16), std('#f1ece2', { roughness: 1 })));
  pillow.scale.set(1.25, 0.32, 0.7);
  pillow.position.set(bx, 0.58, -0.22);
  add(box(1.05, 0.9, 0.06, std('#4a3220', { roughness: 0.6 }), bx, 0.45, -0.42));

  // Rug and desk.
  const rug = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 1.1),
    std('#ffffff', {
      map: canvasTexture(256, 180, (c) => {
        c.fillStyle = '#6a3a2c';
        c.fillRect(0, 0, 256, 180);
        c.strokeStyle = '#c9a76a';
        c.lineWidth = 6;
        c.strokeRect(14, 14, 228, 152);
        c.strokeStyle = '#2e3a44';
        c.strokeRect(30, 30, 196, 120);
      }),
      roughness: 1,
    }),
  );
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0.5, 0.004, 0.9);
  rug.receiveShadow = true;
  scene.add(rug);
  add(box(1.0, 0.04, 0.5, wood, X1 - 0.35, 0.74, 1.35));
  add(box(0.04, 0.72, 0.46, wood, X1 - 0.83, 0.36, 1.35));
  add(box(0.04, 0.72, 0.46, wood, X1 + 0.13, 0.36, 1.35));
  // Model lander on the desk.
  const lander = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 4), std('#d8d8d8', { metalness: 0.5, roughness: 0.4 }));
  lander.rotation.z = Math.PI / 2;
  lander.position.set(X1 - 0.45, 0.82, 1.3);
  lander.castShadow = true;
  scene.add(lander);

  // ── Dust bands on the floor (binary)
  const bits = [1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1];
  const bandMat = new THREE.MeshStandardMaterial({ color: '#cdb48a', roughness: 1, transparent: true, opacity: 0, depthWrite: false });
  const bands = new THREE.Group();
  bits.forEach((b, i) => {
    const w = b ? 0.07 : 0.025;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.5), bandMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(-0.45 + i * 0.1, 0.006, 0.55);
    m.receiveShadow = true;
    bands.add(m);
  });
  scene.add(bands);

  // ── Light through the window
  const sunDir = new THREE.Vector3(0, 0, 0.3).sub(sunPos).normalize();
  const winC = new THREE.Vector3(X1 + 0.3, (wy0 + wy1) / 2 + 0.1, wmz);
  const hitT = winC.y / -sunDir.y;
  const floorHit = winC.clone().addScaledVector(sunDir, hitT);
  const shaft = lightShaft(winC, floorHit, 0.5, 0.8, adult ? '#ff9a5a' : '#ffd29a', adult ? 0.08 : 0.24);
  const shaft2 = lightShaft(winC.clone().add(new THREE.Vector3(0, 0.25, 0.35)), floorHit.clone().add(new THREE.Vector3(0.4, 0, 0.35)), 0.22, 0.4, adult ? '#ff9a5a' : '#ffe0b0', adult ? 0.05 : 0.11);
  scene.add(shaft, shaft2);

  const dust = particles({
    count: hi ? 1800 : 900,
    seed: 2,
    pos: (_, rr) => [X0 + rr() * W, rr() * H, Z0 + rr() * D],
    color: adult ? '#ffc890' : '#ffe2b0',
    size: [0.012, 0.04],
    twinkle: 0.4,
    drift: new THREE.Vector3(0.01, -0.006, 0.004),
    box: new THREE.Vector3(W, H, D),
    opacity: adult ? 0.5 : 0.9,
  });
  dust.position.set(0, H / 2, 0);
  scene.add(dust);

  // ── Camera script
  const camA = new THREE.Vector3(-1.75, 1.5, 2.05);
  const camB = new THREE.Vector3(-0.55, 1.38, 0.5);
  const camC = new THREE.Vector3(-0.55, 0.42, 2.05);
  const lookShelf = new THREE.Vector3(shelfX + 0.95, 1.15, Z0 + 0.6);
  const lookEnd = new THREE.Vector3(0.2, 0.15, 0.0);
  const shot = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
  const look = new THREE.Vector3();

  return {
    scene,
    camera,
    exposure: adult ? 1.2 : 1.1,
    bloom: adult ? { strength: 0.6, radius: 0.45, threshold: 1.35 } : { strength: 0.45, radius: 0.35, threshold: 1.1 },
    focus: lookShelf.clone(),
    anchors: [
      { at: new THREE.Vector3(shelfX, sh + 0.05, sz), label: 'Bookshelf · the threshold wall' },
      { at: new THREE.Vector3(X1, wy1, wmz), label: 'Window · the dust storm enters' },
      { at: watchCenter.clone(), label: adult ? 'The watch · data channel' : 'The watch' },
      { at: new THREE.Vector3(0.1, 0.01, 0.55), label: 'Dust in binary bands' },
    ],
    update(t, dt, k, free) {
      (dust.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
      (shaft.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
      (shaft2.material as THREE.ShaderMaterial).uniforms.uTime.value = t * 1.3;
      // Falling books.
      const fa = easeInOut(seg(k, 0.36, 0.44));
      fallA.position.set(fallStartA.x + fa * 0.05, fallStartA.y - fa * (fallStartA.y - 0.13), fallStartA.z + fa * 0.45);
      fallA.rotation.set(fa * 1.4, 0, fa * 1.57);
      const fb = easeInOut(seg(k, 0.47, 0.55));
      fallB.position.set(fallStartB.x - fb * 0.1, fallStartB.y - fb * (fallStartB.y - 0.15), fallStartB.z + fb * 0.6);
      fallB.rotation.set(-fb * 1.2, 0.3 * fb, fb * 1.57);
      if (adult) {
        fallA.visible = fallB.visible = false;
      }
      bandMat.opacity = adult ? 0.55 : 0.85 * seg(k, 0.55, 0.75);
      // Watch.
      if (story) story.update(k, t);
      else setTime(wm, t);

      if (!free) {
        if (story) {
          // Evening: walk to the shelf, then hand over to the watch story's framing.
          const a = easeInOut(seg(k, 0, 0.16));
          const b = easeInOut(seg(k, 0.12, 0.3));
          story.frame(k, shot);
          camera.position.copy(camA).lerp(camB, a).lerp(shot.pos, b);
          look.copy(lookShelf).lerp(shot.look, b);
          camera.lookAt(look);
          handheld(camera, t, 1 - 0.8 * b);
        } else {
          const a = easeInOut(seg(k, 0, 0.6));
          const b = easeInOut(seg(k, 0.6, 1));
          camera.position.copy(camA).lerp(camB, a).lerp(camC, b);
          look.copy(lookShelf).lerp(lookEnd, b);
          camera.lookAt(look);
          handheld(camera, t, 1);
        }
      }
    },
    dispose() {
      story?.dispose();
      envTex.dispose();
      disposeScene(scene);
    },
  };
};
