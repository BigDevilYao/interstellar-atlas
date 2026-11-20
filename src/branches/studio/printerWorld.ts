import * as THREE from 'three';
import { canvasTexture, rng, std } from '../../cinema/lib';
import { createPrinter, type PrinterModel } from './printer';
import type { World } from './types';

/**
 * SCENE 01 — the printer on a white table against a painted block wall (reference photo 01).
 * Surroundings are deliberately simplified so the eye goes to the small touchscreen.
 */
export interface PrinterWorld extends World {
  printer: PrinterModel;
  /** Opening viewpoint (three-quarter view from the front left, slightly above, as in the photo). */
  start: { pos: THREE.Vector3; look: THREE.Vector3 };
}

function blockWallTexture(): THREE.Texture {
  const r = rng(17);
  const t = canvasTexture(512, 512, (c) => {
    c.fillStyle = '#ece9e1';
    c.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 6000; i++) {
      const v = 200 + Math.floor(r() * 50);
      c.fillStyle = `rgba(${v},${v - 2},${v - 8},0.25)`;
      c.fillRect(r() * 512, r() * 512, 2, 2);
    }
    c.strokeStyle = 'rgba(175,170,160,0.55)';
    c.lineWidth = 3;
    // Running-bond concrete block joints (≈ 40 × 20 cm blocks).
    for (let row = 0; row < 8; row++) {
      const y = row * 64;
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(512, y);
      c.stroke();
      for (let col = 0; col < 5; col++) {
        const x = col * 128 + (row % 2) * 64;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x, y + 64);
        c.stroke();
      }
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
  return t;
}

function cardboardTexture(): THREE.Texture {
  const r = rng(3);
  return canvasTexture(256, 256, (c) => {
    c.fillStyle = '#b08a5c';
    c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1200; i++) {
      c.fillStyle = `rgba(90,60,30,${r() * 0.12})`;
      c.fillRect(r() * 256, r() * 256, 2, 1);
    }
    c.fillStyle = 'rgba(210,190,150,0.6)';
    c.fillRect(0, 118, 256, 20);
  });
}

export function buildPrinterWorld(renderer: THREE.WebGLRenderer, hi: boolean): PrinterWorld {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0d0e10');
  scene.fog = new THREE.Fog('#0d0e10', 3.4, 8);

  const tableY = 0.75;
  // Table (white laminate) and the painted block wall behind it.
  const table = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.035, 0.9), std('#e9e8e2', { roughness: 0.45 }));
  table.position.set(0.2, tableY - 0.0175, 0.05);
  table.receiveShadow = true;
  table.castShadow = true;
  scene.add(table);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 3.2), std('#efece5', { map: blockWallTexture(), roughness: 0.92 }));
  wall.position.set(0.2, 1.4, -0.42);
  wall.receiveShadow = true;
  scene.add(wall);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), std('#3a3936', { roughness: 0.6 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  // Cardboard box to the right and a dark cable to the left (photo 01), kept quiet.
  const boxMesh = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.36, 0.48), std('#c4b49a', { map: cardboardTexture(), roughness: 0.9 }));
  boxMesh.position.set(0.55, tableY + 0.18, -0.1);
  boxMesh.rotation.y = -0.2;
  boxMesh.castShadow = true;
  boxMesh.receiveShadow = true;
  scene.add(boxMesh);
  const cable = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-0.42, tableY + 0.3, -0.38), new THREE.Vector3(-0.5, tableY + 0.1, -0.2), new THREE.Vector3(-0.62, tableY + 0.01, 0.1), new THREE.Vector3(-0.9, tableY + 0.01, 0.35)]), 40, 0.005, 6),
    std('#111214', { roughness: 0.5 }),
  );
  scene.add(cable);

  const printer = createPrinter({ seed: 1 });
  printer.group.position.set(0, tableY, 0);
  scene.add(printer.group);

  // Light: a soft overhead fluorescent key from the front left, a cool fill and a dark falloff.
  scene.add(new THREE.HemisphereLight('#f4f6f8', '#2a2826', 0.75));
  const key = new THREE.DirectionalLight('#fffaf2', 2.2);
  key.position.set(-1.2, 2.8, 1.8);
  key.target.position.set(0, tableY + 0.2, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(hi ? 2048 : 1024, hi ? 2048 : 1024);
  const sc = key.shadow.camera as THREE.OrthographicCamera;
  sc.left = -1.2;
  sc.right = 1.2;
  sc.top = 1.2;
  sc.bottom = -1.2;
  sc.near = 0.5;
  sc.far = 6;
  key.shadow.bias = -0.0003;
  key.shadow.radius = 4;
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight('#dfe8ff', 0.5);
  fill.position.set(1.5, 1.4, 1.2);
  scene.add(fill);
  // Spot falloff on the wall so the printer is the brightest thing in frame.
  const spot = new THREE.SpotLight('#fff4e6', 5, 4, 0.55, 0.9, 1.4);
  spot.position.set(-0.2, 2.4, 1.2);
  spot.target.position.set(0, tableY + 0.35, 0);
  scene.add(spot, spot.target);

  const pm = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color('#2a2c30');
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(4, 1.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 4, 3.8) }));
  panel.position.set(-0.5, 3, 1);
  panel.lookAt(0, 0, 0);
  envScene.add(panel);
  const env = pm.fromScene(envScene, 0.03).texture;
  pm.dispose();
  scene.environment = env;

  return {
    key: 'printer',
    scene,
    exposure: 1.02,
    printer,
    start: { pos: new THREE.Vector3(-0.5, 1.58, 1.02), look: new THREE.Vector3(0.0, 1.05, 0.12) },
    update() {},
    dispose() {
      env.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
      });
    },
  };
}
