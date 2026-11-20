import * as THREE from 'three';
import { canvasTexture, rng, std } from '../../cinema/lib';
import { createPrinter, type PrinterModel } from './printer';
import { assetUrl } from './assets';
import type { World } from './types';

/**
 * UCLA ARCHITECTURE STUDIO — a conservative reconstruction from reference photos 03–06.
 * The photographs are partial views, not a survey: dimensions are inferred (≈ 32 × 18 m floor,
 * ≈ 6.4 m ceiling, mezzanine deck ≈ 3 m), and unseen parts are kept simple.
 *
 * Frame: origin at floor centre, +Y up. The mezzanine runs along the back (−Z); the windows are on the
 * front wall (+Z). Units: metres.
 */

export const STUDIO = {
  X0: -16,
  X1: 16,
  Z0: -9,
  Z1: 9,
  CEIL: 6.4,
  DECK: 3.05, // mezzanine walking level
  FASCIA_Z: -4.1, // front edge of the main mezzanine
  WALL_Z: -5.0, // wall under the mezzanine
};

export interface StudioWorld extends World {
  /** The two printers on the table by the TV: [0] is where you arrive, [1] continues to Murph's room. */
  printers: [PrinterModel, PrinterModel];
  /** Hover targets for architectural features (invisible proxies). */
  features: { mesh: THREE.Mesh; key: 'stair' | 'mezzanine' | 'windows' }[];
  /** World-space segments for the match-cut line overlay. */
  lines: { balusters: [THREE.Vector3, THREE.Vector3][]; fasciaTop: [THREE.Vector3, THREE.Vector3]; fasciaBottom: [THREE.Vector3, THREE.Vector3] };
  setLinework(v: number): void;
}

const BLUE = '#4f7cab';

function tileTexture(): THREE.Texture {
  const r = rng(12);
  const t = canvasTexture(512, 512, (c) => {
    c.fillStyle = '#e7e3d8';
    c.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++) {
        const v = 226 + Math.floor(r() * 12);
        c.fillStyle = `rgb(${v},${v - 3},${v - 11})`;
        c.fillRect(i * 128 + 1, j * 128 + 1, 126, 126);
        for (let k = 0; k < 40; k++) {
          c.fillStyle = `rgba(150,140,120,${0.05 + r() * 0.08})`;
          c.fillRect(i * 128 + r() * 128, j * 128 + r() * 128, 2 + r() * 4, 1 + r() * 2);
        }
      }
    c.strokeStyle = 'rgba(160,152,135,0.55)';
    c.lineWidth = 2;
    for (let i = 0; i <= 4; i++) {
      c.beginPath();
      c.moveTo(i * 128, 0);
      c.lineTo(i * 128, 512);
      c.moveTo(0, i * 128);
      c.lineTo(512, i * 128);
      c.stroke();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(32 / 1.2, 18 / 1.2); // 30 cm tiles
  return t;
}

function plywoodTexture(): THREE.Texture {
  const r = rng(5);
  return canvasTexture(256, 256, (c) => {
    c.fillStyle = '#c9a56c';
    c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 70; i++) {
      c.strokeStyle = `rgba(${140 + r() * 40},${100 + r() * 30},${55 + r() * 20},${0.12 + r() * 0.15})`;
      c.lineWidth = 1 + r() * 2;
      const y = r() * 256;
      c.beginPath();
      c.moveTo(0, y);
      c.bezierCurveTo(80, y + (r() - 0.5) * 20, 170, y + (r() - 0.5) * 20, 256, y + (r() - 0.5) * 10);
      c.stroke();
    }
    for (let i = 0; i < 12; i++) {
      c.fillStyle = `rgba(90,60,30,${0.15 + r() * 0.2})`;
      c.beginPath();
      c.arc(r() * 256, r() * 256, 1 + r() * 2, 0, Math.PI * 2);
      c.fill();
    }
  });
}

function acousticTexture(): THREE.Texture {
  const r = rng(8);
  const t = canvasTexture(256, 256, (c) => {
    c.fillStyle = '#e8e7e2';
    c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2500; i++) {
      c.fillStyle = `rgba(120,120,115,${r() * 0.25})`;
      c.fillRect(r() * 256, r() * 256, 1, 1);
    }
    c.strokeStyle = 'rgba(170,170,165,0.6)';
    c.lineWidth = 2;
    c.strokeRect(0, 0, 256, 256);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Simple office chair: black mesh back, seat, column and a five-star base. */
function chair(mat: THREE.Material, steel: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.07, 0.46), mat);
  seat.position.y = 0.47;
  g.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.52, 0.04), mat);
  back.position.set(0, 0.8, -0.23);
  back.rotation.x = -0.12;
  g.add(back);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.36, 8), steel);
  col.position.y = 0.26;
  g.add(col);
  for (let i = 0; i < 5; i++) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 0.04), mat);
    const a = (i / 5) * Math.PI * 2;
    leg.position.set(Math.cos(a) * 0.15, 0.06, Math.sin(a) * 0.15);
    leg.rotation.y = -a;
    g.add(leg);
  }
  for (const sx of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.2, 0.04), mat);
    arm.position.set(sx * 0.25, 0.6, -0.02);
    g.add(arm);
  }
  return g;
}

/** Plywood worktable on a gray steel frame (the studio's tall work tables). */
function worktable(top: THREE.Material, frame: THREE.Material, w = 2.4, d = 1.2, h = 0.9): THREE.Group {
  const g = new THREE.Group();
  const t = new THREE.Mesh(new THREE.BoxGeometry(w, 0.035, d), top);
  t.position.y = h;
  g.add(t);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, h - 0.02, 0.05), frame);
      leg.position.set(sx * (w / 2 - 0.08), (h - 0.02) / 2, sz * (d / 2 - 0.08));
      g.add(leg);
    }
  const apron = new THREE.Mesh(new THREE.BoxGeometry(w - 0.12, 0.08, 0.04), frame);
  apron.position.set(0, h - 0.07, d / 2 - 0.08);
  g.add(apron);
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(w - 0.16, 0.04, 0.05), frame);
  shelf.position.set(0, 0.2, 0);
  shelf.scale.z = 12;
  shelf.scale.y = 0.6;
  g.add(shelf);
  return g;
}

export function buildStudio(renderer: THREE.WebGLRenderer, hi: boolean): StudioWorld {
  const { X0, X1, Z0, Z1, CEIL, DECK, FASCIA_Z, WALL_Z } = STUDIO;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#d9d8d2');
  const r = rng(33);

  const paint = std('#eceae4', { roughness: 0.88 });
  const paintShade = std('#dedcd5', { roughness: 0.9 });
  const blue = std(BLUE, { metalness: 0.35, roughness: 0.48 });
  const steel = std('#5d6267', { metalness: 0.6, roughness: 0.45 });
  const black = std('#18191b', { roughness: 0.55 });
  const blackGloss = std('#08090b', { metalness: 0.2, roughness: 0.1 });
  const ply = std('#cfae76', { map: plywoodTexture(), roughness: 0.62 });
  const chairMat = std('#1b1c1e', { roughness: 0.7 });
  const floorTex = tileTexture();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0, Z1 - Z0), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.2, metalness: 0.0, envMapIntensity: 0.9 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const edgeObjects: THREE.Object3D[] = [];
  const add = <T extends THREE.Object3D>(o: T, edges = false): T => {
    scene.add(o);
    if (edges) edgeObjects.push(o);
    return o;
  };
  const box = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, edges = false) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    return add(m, edges);
  };

  // ── Shell: walls and the ceiling with deep beams and long light panels.
  box(X1 - X0, CEIL, 0.2, paint, 0, CEIL / 2, Z0 - 0.1);
  box(0.2, CEIL, Z1 - Z0, paint, X0 - 0.1, CEIL / 2, 0);
  box(0.2, CEIL, Z1 - Z0, paint, X1 + 0.1, CEIL / 2, 0);
  const ceilTex = acousticTexture();
  ceilTex.repeat.set(32 / 0.6, 18 / 0.6);
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0, Z1 - Z0), std('#e6e5e0', { map: ceilTex, roughness: 0.95 }));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = CEIL;
  add(ceiling);
  const lightMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.6, 2.45) });
  for (let x = X0 + 1.6; x < X1; x += 3.2) {
    box(0.5, 0.75, Z1 - Z0, paintShade, x, CEIL - 0.375, 0, true);
    // Light panels between beams (alternating bays, long rectangles along the beams).
    for (let z = Z0 + 2; z < Z1 - 1; z += 4.2) {
      if ((Math.round(x * 10) + Math.round(z)) % 3 === 0) continue;
      const lp = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 2.2), lightMat);
      lp.rotation.x = Math.PI / 2;
      lp.position.set(x + 1.6, CEIL - 0.01, z);
      add(lp);
    }
  }

  // ── Front wall with large windows and dark roller blinds (photo 05).
  const viewTex = new THREE.TextureLoader().load(assetUrl('window-view.jpg'));
  viewTex.colorSpace = THREE.SRGBColorSpace;
  const outside = new THREE.MeshBasicMaterial({ map: viewTex, color: new THREE.Color(1.5, 1.5, 1.45) });
  const blindMat = new THREE.MeshBasicMaterial({ map: viewTex, color: new THREE.Color(0.14, 0.15, 0.16) });
  const sill = 1.05;
  const head = 3.55;
  const winXs = [-13, -8.2, -3.4, 1.4, 6.2, 11];
  const winW = 3.6;
  // Wall pieces around the window openings.
  box(X1 - X0, sill, 0.25, paint, 0, sill / 2, Z1 + 0.12);
  box(X1 - X0, CEIL - head, 0.25, paint, 0, (CEIL + head) / 2, Z1 + 0.12);
  let prev = X0;
  for (const wx of winXs) {
    const a = wx - winW / 2;
    if (a > prev) box(a - prev, head - sill, 0.25, paint, (a + prev) / 2, (sill + head) / 2, Z1 + 0.12);
    prev = wx + winW / 2;
    // Outside view, mullions and a blind pulled most of the way down.
    const view = new THREE.Mesh(new THREE.PlaneGeometry(winW, head - sill), outside);
    view.rotation.y = Math.PI;
    view.position.set(wx, (sill + head) / 2, Z1 + 0.45);
    add(view);
    const blindDrop = 0.62 + r() * 0.25;
    const bh = (head - sill) * blindDrop;
    const blind = new THREE.Mesh(new THREE.PlaneGeometry(winW - 0.1, bh), blindMat);
    blind.rotation.y = Math.PI;
    blind.position.set(wx, head - bh / 2 - 0.05, Z1 + 0.02);
    add(blind);
    box(0.06, head - sill, 0.12, std('#d6d4cd'), wx, (sill + head) / 2, Z1 + 0.05);
    box(winW, 0.06, 0.12, std('#d6d4cd'), wx, sill + (head - sill) * 0.33, Z1 + 0.05);
    box(winW + 0.1, 0.08, 0.2, std('#d6d4cd'), wx, head, Z1 + 0.02);
    box(winW + 0.1, 0.05, 0.3, paint, wx, sill, Z1 - 0.02);
  }
  if (prev < X1) box(X1 - prev, head - sill, 0.25, paint, (X1 + prev) / 2, (sill + head) / 2, Z1 + 0.12);

  // ── Main mezzanine (blue fascia beam, balusters, top rail) along the back.
  const mzX0 = -0.6;
  const mzX1 = 13.4;
  const slabT = 0.3;
  box(mzX1 - mzX0, slabT, FASCIA_Z - Z0, paintShade, (mzX0 + mzX1) / 2, DECK - slabT / 2, (FASCIA_Z + Z0) / 2);
  box(mzX1 - mzX0, 0.52, 0.14, blue, (mzX0 + mzX1) / 2, DECK - 0.04, FASCIA_Z, true);
  // Steel joists and track lights under the deck (photos 04, 06).
  for (let x = mzX0 + 0.6; x < mzX1; x += 1.6) box(0.08, 0.16, FASCIA_Z - Z0 - 0.3, black, x, DECK - slabT - 0.08, (FASCIA_Z + Z0) / 2);
  const track = std('#f2f2ee', { roughness: 0.4 });
  for (let x = mzX0 + 1.2; x < mzX1; x += 2.4) {
    const l = box(0.08, 0.14, 0.08, track, x, DECK - slabT - 0.2, FASCIA_Z - 0.35);
    l.rotation.x = 0.6;
  }
  // Wall under the mezzanine.
  box(mzX1 - mzX0 + 0.2, DECK - slabT, 0.2, paint, (mzX0 + mzX1) / 2, (DECK - slabT) / 2, WALL_Z - 0.1);
  box(mzX1 - mzX0, 0.12, 0.03, black, (mzX0 + mzX1) / 2, 0.06, WALL_Z + 0.01);
  // Railings: top rail and balusters.
  const railTop = DECK + 1.1;
  const balusters: [THREE.Vector3, THREE.Vector3][] = [];
  const balGeo = new THREE.BoxGeometry(0.028, 1, 0.028);
  const balList: THREE.Matrix4[] = [];
  const railRun = (x0: number, z0: number, x1: number, z1: number, base: number, top: number, record = false) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.05, 0.05), blue);
    rail.position.set((x0 + x1) / 2, top, (z0 + z1) / 2);
    rail.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
    rail.castShadow = true;
    add(rail, true);
    const n = Math.max(1, Math.round(len / 0.22));
    for (let i = 0; i <= n; i++) {
      const f = i / n;
      const x = x0 + (x1 - x0) * f;
      const z = z0 + (z1 - z0) * f;
      balList.push(new THREE.Matrix4().compose(new THREE.Vector3(x, (base + top) / 2, z), new THREE.Quaternion(), new THREE.Vector3(1, top - base, 1)));
      if (record) balusters.push([new THREE.Vector3(x, base, z), new THREE.Vector3(x, top, z)]);
    }
  };
  railRun(mzX0, FASCIA_Z, mzX1, FASCIA_Z, DECK + 0.22, railTop, true);
  railRun(mzX1, FASCIA_Z, mzX1, Z0 + 0.2, DECK, railTop);

  // Left platform (photo 03, left) at the same level, a stair landing and a switchback stair.
  const lpX0 = -13.2;
  const lpX1 = -6.2;
  const lpZ = -4.6;
  box(lpX1 - lpX0, slabT, lpZ - Z0, paintShade, (lpX0 + lpX1) / 2, DECK - slabT / 2, (lpZ + Z0) / 2);
  box(lpX1 - lpX0, 0.52, 0.14, blue, (lpX0 + lpX1) / 2, DECK - 0.04, lpZ, true);
  railRun(lpX0, lpZ, lpX1, lpZ, DECK + 0.22, railTop);
  railRun(lpX0, lpZ, lpX0, Z0 + 0.2, DECK, railTop);
  box(lpX1 - lpX0 + 0.2, DECK - slabT, 0.2, paint, (lpX0 + lpX1) / 2, (DECK - slabT) / 2, lpZ - 0.9);
  // Rear walkway joining the two decks behind the stairwell.
  box(mzX0 - lpX1, slabT, 2.4, paintShade, (lpX1 + mzX0) / 2, DECK - slabT / 2, Z0 + 1.2);
  box(mzX0 - lpX1, 0.52, 0.14, blue, (lpX1 + mzX0) / 2, DECK - 0.04, Z0 + 2.4, true);
  railRun(lpX1, Z0 + 2.4, mzX0 - 1.4, Z0 + 2.4, DECK + 0.22, railTop);

  const landY = 1.55;
  const ldX0 = -6.2;
  const ldX1 = -3.5;
  const ldZ0 = -4.5;
  const ldZ1 = -2.1;
  box(ldX1 - ldX0, 0.24, ldZ1 - ldZ0, blue, (ldX0 + ldX1) / 2, landY - 0.12, (ldZ0 + ldZ1) / 2, true);
  for (const [px, pz] of [[ldX0 + 0.15, ldZ1 - 0.15], [ldX1 - 0.15, ldZ1 - 0.15], [ldX0 + 0.15, ldZ0 + 0.15]]) box(0.1, landY - 0.24, 0.1, blue, px, (landY - 0.24) / 2, pz);
  railRun(ldX0, ldZ1, ldX1 - 1.0, ldZ1, landY, landY + 1.0);
  railRun(ldX0, ldZ0, ldX0, ldZ1, landY, landY + 1.0);
  // Lower flight: floor (x ≈ −0.4) up to the landing, on the front side.
  const flight = (xStart: number, y0: number, dir: number, zA: number, zB: number, steps: number, rise: number, run: number, railSide: number) => {
    for (let i = 0; i < steps; i++) {
      const x = xStart + dir * (i + 0.5) * run;
      const y = y0 + (i + 1) * rise;
      box(run + 0.02, 0.05, zB - zA, blue, x, y - 0.025, (zA + zB) / 2);
      box(0.02, rise, zB - zA, std('#41698f', { metalness: 0.35, roughness: 0.5 }), x - dir * run / 2, y - rise / 2, (zA + zB) / 2);
    }
    const len = steps * run;
    const h = steps * rise;
    const ang = Math.atan2(h, len);
    for (const z of [zA, zB]) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(len, h) + 0.2, 0.32, 0.06), blue);
      s.position.set(xStart + (dir * len) / 2, y0 + h / 2 - 0.12, z);
      s.rotation.z = dir * ang;
      s.castShadow = true;
      add(s, true);
    }
    // Inclined handrail with balusters on the open side.
    const zr = railSide < 0 ? zA : zB;
    const hr = new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(len, h), 0.045, 0.045), blue);
    hr.position.set(xStart + (dir * len) / 2, y0 + h / 2 + 0.95, zr);
    hr.rotation.z = dir * ang;
    add(hr, true);
    for (let i = 0; i <= steps; i += 1) {
      const x = xStart + dir * i * run;
      const y = y0 + i * rise;
      balList.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y + 0.48, zr), new THREE.Quaternion(), new THREE.Vector3(1, 0.95, 1)));
    }
  };
  flight(-0.4, 0, -1, -3.3, -2.1, 9, landY / 9, 0.34, 1);
  // Upper flight: landing up to a small deck extension of the main mezzanine.
  flight(ldX1, landY, 1, -4.5, -3.3, 9, (DECK - landY) / 9, 0.32, -1);
  box(1.6, slabT, 1.2, paintShade, -0.6 + 0.8, DECK - slabT / 2, -3.9);
  box(1.6, 0.52, 0.12, blue, -0.6 + 0.8, DECK - 0.04, -3.3, true);
  railRun(-0.6 + 0.2, -3.3, 1.0, -3.3, DECK + 0.22, railTop);
  const balusterMesh = new THREE.InstancedMesh(balGeo, blue, balList.length);
  balList.forEach((m, i) => balusterMesh.setMatrixAt(i, m));
  balusterMesh.castShadow = true;
  add(balusterMesh);

  // Structural columns rising from the mezzanine and two free-standing on the floor.
  for (const x of [-10.6, -6.8, 2.6, 8.2, 12.8]) box(0.55, CEIL - DECK, 0.55, paint, x, DECK + (CEIL - DECK) / 2, x < -6 ? lpZ - 0.5 : FASCIA_Z - 0.55, true);
  box(0.6, CEIL, 0.6, paint, -8.6, CEIL / 2, -1.2, true);
  box(0.6, CEIL, 0.6, paint, 9.8, CEIL / 2, 1.5, true);

  // ── Upper-level work area: desks, chairs, monitors and a string of bulbs.
  for (let i = 0; i < 7; i++) {
    const x = mzX0 + 1.4 + i * 1.9;
    const desk = worktable(ply, steel, 1.6, 0.8, 0.74);
    desk.position.set(x, DECK, -6.6 + (i % 2) * 0.4);
    add(desk);
    const c = chair(chairMat, steel);
    c.position.set(x + (r() - 0.5) * 0.4, DECK, -5.4 + r() * 0.3);
    c.rotation.y = Math.PI + (r() - 0.5) * 0.8;
    add(c);
    if (i % 2 === 0) box(0.6, 0.38, 0.04, blackGloss, x, DECK + 0.95, -6.9);
  }
  for (let i = 0; i < 3; i++) {
    const desk = worktable(ply, steel, 1.6, 0.8, 0.74);
    desk.position.set(-11.6 + i * 1.9, DECK, -6.4);
    add(desk);
    const c = chair(chairMat, steel);
    c.position.set(-11.4 + i * 1.9, DECK, -5.3);
    c.rotation.y = Math.PI + (r() - 0.5);
    add(c);
  }
  const bulbMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.6, 1.7) });
  for (let i = 0; i < 26; i++) {
    const x = -12 + i * 0.95;
    const y = DECK + 2.3 - Math.abs(Math.sin(i * 0.55)) * 0.35;
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), bulbMat);
    b.position.set(x, y, -7.4);
    add(b);
  }

  // ── Under the mezzanine (photos 04, 06): TV on a stand, the printer table, boards, doors, exit sign.
  const tv = new THREE.Group();
  const tvScreen = new THREE.Mesh(new THREE.BoxGeometry(1.95, 1.12, 0.06), blackGloss);
  tvScreen.position.y = 1.45;
  tv.add(tvScreen);
  const tvLeg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.0, 0.06), black);
  tvLeg.position.set(0, 0.5, -0.02);
  tv.add(tvLeg);
  const tvFoot = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.6), black);
  tvFoot.position.y = 0.04;
  tv.add(tvFoot);
  tv.position.set(0.55, 0, WALL_Z + 0.45);
  add(tv);
  const tv2 = tv.clone();
  tv2.scale.setScalar(0.62);
  tv2.position.set(6.2, 0, WALL_Z + 0.45);
  add(tv2);
  const printerTable = worktable(std('#e9e8e3', { roughness: 0.5 }), steel, 2.2, 0.7, 0.86);
  printerTable.position.set(2.75, 0, WALL_Z + 0.4);
  add(printerTable);
  const pA = createPrinter({ seed: 2 });
  pA.group.position.set(2.27, 0.875, WALL_Z + 0.42);
  add(pA.group);
  const pB = createPrinter({ seed: 3 });
  pB.group.position.set(3.2, 0.875, WALL_Z + 0.42);
  add(pB.group);
  for (const [w, h, x, rot] of [[0.9, 2.0, -0.1, 0.06], [0.75, 1.7, 4.6, -0.04]] as const) {
    const board = box(w, h, 0.02, std('#f4f4f1', { roughness: 0.6 }), x, h / 2, WALL_Z + 0.08);
    board.rotation.x = -rot;
  }
  box(0.45, 0.6, 0.45, std('#8a6a44', { roughness: 0.9 }), 4.1, 0.3, WALL_Z + 0.4);
  box(0.4, 0.75, 0.4, black, -0.9, 0.375, WALL_Z + 0.35);
  box(1.0, 2.15, 0.06, std('#2a2b2d', { roughness: 0.6 }), -2.2, 1.075, lpZ - 0.84);
  box(1.0, 2.15, 0.06, std('#6d2a24', { roughness: 0.6 }), 10.4, 1.075, WALL_Z + 0.02);
  box(0.36, 0.15, 0.06, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 2.2, 0.8) }), 10.4, 2.45, WALL_Z + 0.06);
  const ext = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.42, 12), std('#b3261e', { roughness: 0.4 }));
  ext.position.set(-1.5, 0.75, WALL_Z + 0.12);
  add(ext);
  // Wooden bench (photo 04, right).
  box(2.0, 0.08, 0.5, ply, 12.2, 0.46, -3.6);
  box(2.0, 0.55, 0.06, ply, 12.2, 0.72, -3.85);
  // Whiteboard on wheels and a trash cart near the stair (photo 03).
  box(1.5, 1.0, 0.04, std('#f7f7f5', { roughness: 0.3 }), -12.4, 1.45, -2.4);
  box(0.06, 1.9, 0.06, steel, -13.1, 0.95, -2.4);
  box(0.06, 1.9, 0.06, steel, -11.7, 0.95, -2.4);
  const cart = box(1.1, 0.6, 0.7, std('#eeeeea', { roughness: 0.5 }), -2.8, 0.55, -3.0);
  cart.rotation.y = 0.2;

  // ── Ground floor: plywood worktables, chairs, monitors (photos 04–06).
  const rows = [
    [-12.5, 3.2], [-9.4, 3.2], [-6.3, 3.2], [-3.2, 3.4], [5.4, 3.3], [8.5, 3.2], [11.6, 3.2],
    [-12.5, 6.4], [-9.4, 6.4], [-6.3, 6.4], [-3.2, 6.6], [0.0, 6.5], [5.4, 6.5], [8.5, 6.5], [11.6, 6.4],
    [-11.0, 0.4], [-5.2, 0.2],
  ];
  rows.forEach(([x, z], i) => {
    const tbl = worktable(ply, steel);
    tbl.position.set(x, 0, z);
    tbl.rotation.y = (r() - 0.5) * 0.06 + (i % 5 === 4 ? Math.PI / 2 : 0);
    add(tbl);
    for (let k = 0; k < 2; k++) {
      const c = chair(chairMat, steel);
      c.position.set(x + (k ? 0.7 : -0.6) + (r() - 0.5) * 0.4, 0, z + (k ? 0.95 : -0.95) + (r() - 0.5) * 0.3);
      c.rotation.y = (k ? Math.PI : 0) + (r() - 0.5) * 1.2;
      add(c);
    }
    if (r() < 0.45) box(0.55, 0.34, 0.03, blackGloss, x + (r() - 0.5) * 1.2, 1.18, z - 0.35);
    if (r() < 0.5) box(0.6, 0.004, 0.45, std('#f5f3ee', { roughness: 0.8 }), x + (r() - 0.5), 0.92, z + (r() - 0.5) * 0.4);
  });
  // The two large tables in front of the printer wall (photos 04, 06).
  const big = worktable(ply, steel, 2.4, 1.3, 0.9);
  big.position.set(2.2, 0, 0.6);
  big.rotation.y = 0.04;
  add(big);
  const big2 = worktable(ply, steel, 2.4, 1.3, 0.9);
  big2.position.set(2.24, 0, 1.92);
  big2.rotation.y = 0.04;
  add(big2);
  for (const [x, z, ry] of [[3.5, -0.35, 2.8], [0.8, 2.8, 0.3], [3.8, 1.5, -1.9]] as const) {
    const c = chair(chairMat, steel);
    c.position.set(x, 0, z);
    c.rotation.y = ry;
    add(c);
  }

  // ── Light: bright, even studio light from the ceiling and daylight from the windows.
  scene.add(new THREE.HemisphereLight('#ffffff', '#cfc8b8', 0.95));
  const sun = new THREE.DirectionalLight('#fff3df', 1.6);
  sun.position.set(-6, 14, 22);
  sun.target.position.set(0, 0, -2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(hi ? 2048 : 1024, hi ? 2048 : 1024);
  const sc = sun.shadow.camera as THREE.OrthographicCamera;
  sc.left = -18;
  sc.right = 18;
  sc.top = 12;
  sc.bottom = -12;
  sc.near = 1;
  sc.far = 60;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight('#eef2ff', 0.55);
  fill.position.set(4, 10, -10);
  scene.add(fill);
  for (const [x, z] of [[-8, 2], [0, 2], [8, 2], [-8, 6], [8, 6], [3, -6.5], [-9, -6.5]]) {
    const p = new THREE.PointLight('#fffaf0', 7, 12, 1.6);
    p.position.set(x, x < -6 && z < 0 ? DECK + 2.6 : z < 0 ? DECK + 2.6 : CEIL - 1.0, z);
    scene.add(p);
  }
  const under = new THREE.PointLight('#fff1dc', 3.5, 6, 1.6);
  under.position.set(2.8, 2.4, WALL_Z + 1.4);
  scene.add(under);

  // Environment for the glossy floor and screens: the studio reflecting itself.
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromScene(scene, 0.04, 0.1, 80).texture;
  pm.dispose();
  scene.environment = env;
  (floor.material as THREE.MeshStandardMaterial).envMap = env;

  // ── Spatial linework: subtle white lines on the key architectural edges (toggleable).
  const lineMat = new THREE.LineBasicMaterial({ color: new THREE.Color(1.6, 1.6, 1.6), transparent: true, opacity: 0.22, depthWrite: false });
  const lines = new THREE.Group();
  edgeObjects.forEach((o) => {
    o.updateMatrixWorld(true);
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 30), lineMat);
    e.applyMatrix4(mesh.matrixWorld);
    lines.add(e);
  });
  scene.add(lines);

  // ── Hover proxies for the architectural features.
  const proxy = (w: number, h: number, d: number, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ visible: false }));
    m.position.set(x, y, z);
    scene.add(m);
    return m;
  };
  const features: StudioWorld['features'] = [
    { mesh: proxy(7.0, 3.2, 2.6, -3.3, 1.7, -3.3), key: 'stair' },
    { mesh: proxy(14, 1.4, 0.4, 6.4, DECK + 0.6, FASCIA_Z), key: 'mezzanine' },
    { mesh: proxy(26, 2.6, 0.3, -1, 2.3, Z1 - 0.2), key: 'windows' },
  ];

  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && !(m.material as THREE.Material).transparent && !(m.material instanceof THREE.MeshBasicMaterial)) {
      m.receiveShadow = true;
    }
  });

  return {
    key: 'studio',
    scene,
    exposure: 0.68,
    printers: [pA, pB],
    features,
    lines: {
      balusters,
      fasciaTop: [new THREE.Vector3(mzX0, DECK + 0.22, FASCIA_Z + 0.07), new THREE.Vector3(mzX1, DECK + 0.22, FASCIA_Z + 0.07)],
      fasciaBottom: [new THREE.Vector3(mzX0, DECK - 0.3, FASCIA_Z + 0.07), new THREE.Vector3(mzX1, DECK - 0.3, FASCIA_Z + 0.07)],
    },
    setLinework(v) {
      lineMat.opacity = 0.22 * v;
      lines.visible = v > 0.01;
    },
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
