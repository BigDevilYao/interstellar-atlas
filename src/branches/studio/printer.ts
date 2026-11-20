import * as THREE from 'three';
import { canvasTexture, rng, std } from '../../cinema/lib';

/**
 * ENCLOSED 3D PRINTER — procedural model following reference photos 01–02 (the studio's enclosed
 * printer with a filament unit on top). Proportions are estimated from the photographs, not measured.
 * Brand logos and wordmarks are intentionally left off.
 *
 * Local frame: origin at the centre of the printer's footprint on the table; +Y up; the front (glass
 * door and touchscreen) faces +Z. Units: metres.
 */

export const PRINTER = {
  W: 0.39, // body width
  D: 0.39, // body depth
  H: 0.465, // body height (to the top glass)
  /** Touchscreen glass (the threshold) — visible area. */
  screenW: 0.125,
  screenH: 0.078,
};

export interface PrinterModel {
  group: THREE.Group;
  /** The touchscreen glass (portal surface). Its local +Z is the screen's outward normal. */
  screen: THREE.Mesh;
  /** The touchscreen bezel (for the hover highlight). */
  bezel: THREE.Mesh;
  bezelMat: THREE.MeshStandardMaterial;
  /** Interior light, so the chamber reads through the door. */
  chamberLight: THREE.PointLight;
}

function roundedBoxGeo(w: number, h: number, d: number, r: number): THREE.BufferGeometry {
  // Vertically extruded rounded rectangle (rounded vertical edges, like the printer's corners).
  const s = new THREE.Shape();
  const x = -w / 2;
  const z = -d / 2;
  s.moveTo(x + r, z);
  s.lineTo(x + w - r, z);
  s.quadraticCurveTo(x + w, z, x + w, z + r);
  s.lineTo(x + w, z + d - r);
  s.quadraticCurveTo(x + w, z + d, x + w - r, z + d);
  s.lineTo(x + r, z + d);
  s.quadraticCurveTo(x, z + d, x, z + d - r);
  s.lineTo(x, z + r);
  s.quadraticCurveTo(x, z, x + r, z);
  const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: 8 });
  g.rotateX(-Math.PI / 2); // extrude along +Y (the shape is symmetric, so its mirrored Z is harmless)
  g.computeVertexNormals();
  return g;
}

function plateTexture(): THREE.Texture {
  // Textured build plate (fine speckle).
  const r = rng(4);
  return canvasTexture(256, 256, (c) => {
    c.fillStyle = '#6d7073';
    c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 9000; i++) {
      const v = 90 + Math.floor(r() * 90);
      c.fillStyle = `rgb(${v},${v},${v + 4})`;
      c.fillRect(r() * 256, r() * 256, 1.2, 1.2);
    }
  });
}

function screenUiTexture(): THREE.Texture {
  // A dim idle interface — only faintly visible under the glass (the real screen in photo 01 is dark).
  return canvasTexture(320, 200, (c) => {
    c.fillStyle = '#050607';
    c.fillRect(0, 0, 320, 200);
    c.strokeStyle = 'rgba(255,255,255,0.08)';
    c.lineWidth = 2;
    c.strokeRect(18, 18, 284, 164);
    c.fillStyle = 'rgba(255,255,255,0.06)';
    c.fillRect(30, 150, 160, 6);
  });
}

export function createPrinter(o: { seed?: number } = {}): PrinterModel {
  const { W, D, H, screenW, screenH } = PRINTER;
  const group = new THREE.Group();
  const r = rng(o.seed ?? 1);

  const body = std('#6f7275', { metalness: 0.55, roughness: 0.42 });
  const bodyDark = std('#4e5154', { metalness: 0.5, roughness: 0.5 });
  const black = std('#151618', { metalness: 0.3, roughness: 0.35 });
  const blackGloss = std('#0d0e10', { metalness: 0.2, roughness: 0.12 });
  const steel = std('#b9bcbf', { metalness: 0.95, roughness: 0.25 });
  const interior = std('#2a2c2f', { metalness: 0.3, roughness: 0.6, side: THREE.BackSide });
  const glass = new THREE.MeshPhysicalMaterial({
    color: '#dfe7ec',
    metalness: 0,
    roughness: 0.05,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
  });
  const smoked = new THREE.MeshPhysicalMaterial({
    color: '#22262b',
    metalness: 0,
    roughness: 0.08,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  // ── Enclosure: a shell with rounded vertical corners, open at the front (door) and top (glass lid).
  const wallT = 0.012;
  const back = new THREE.Mesh(new THREE.BoxGeometry(W - 0.04, H - 0.02, wallT), body);
  back.position.set(0, H / 2, -D / 2 + wallT / 2);
  group.add(back);
  for (const sx of [-1, 1]) {
    const side = new THREE.Mesh(new THREE.BoxGeometry(wallT, H, D - 0.04), body);
    side.position.set(sx * (W / 2 - wallT / 2), H / 2, 0);
    group.add(side);
    // Rounded corner posts (front and back).
    for (const sz of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, H, 16, 1, false, 0, Math.PI * 2), body);
      post.position.set(sx * (W / 2 - 0.03), H / 2, sz * (D / 2 - 0.03));
      group.add(post);
    }
  }
  // Base plinth and the front frame around the door.
  const plinth = new THREE.Mesh(roundedBoxGeo(W, 0.03, D, 0.03), bodyDark);
  group.add(plinth);
  const doorTop = 0.335;
  const frontTop = new THREE.Mesh(new THREE.BoxGeometry(W - 0.05, H - doorTop, 0.014), body);
  frontTop.position.set(0, (H + doorTop) / 2, D / 2 - 0.007);
  group.add(frontTop);
  const frontL = new THREE.Mesh(new THREE.BoxGeometry(0.05, doorTop, 0.014), body);
  frontL.position.set(-W / 2 + 0.045, doorTop / 2, D / 2 - 0.007);
  group.add(frontL);
  // Interior (dark chamber).
  const chamber = new THREE.Mesh(new THREE.BoxGeometry(W - 0.03, H - 0.035, D - 0.03), interior);
  chamber.position.set(0, H / 2 + 0.004, 0);
  group.add(chamber);

  // ── Front door: framed glass with a dark border and a silver handle on the right.
  const door = new THREE.Group();
  const dW = W - 0.075;
  const dH = doorTop - 0.035;
  const frameT = 0.012;
  const frame = (w: number, h: number, x: number, y: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.008), black);
    m.position.set(x, y, 0);
    door.add(m);
  };
  frame(dW, frameT, 0, dH / 2 - frameT / 2);
  frame(dW, frameT * 1.6, 0, -dH / 2 + frameT * 0.8);
  frame(frameT, dH, -dW / 2 + frameT / 2, 0);
  frame(frameT, dH, dW / 2 - frameT / 2, 0);
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(dW - 0.01, dH - 0.01), glass);
  pane.position.z = 0.002;
  door.add(pane);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.05, 0.018), steel);
  handle.position.set(dW / 2 - 0.01, 0.0, 0.012);
  door.add(handle);
  door.position.set(0.012, 0.035 + dH / 2, D / 2 + 0.004);
  group.add(door);

  // ── Chamber contents (photo 02): build plate, lead screws, gantry, print head, lighting.
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.006, 0.27), std('#8a8d90', { map: plateTexture(), metalness: 0.7, roughness: 0.45 }));
  plate.position.set(0, 0.17, 0.0);
  group.add(plate);
  const bedFrame = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.02, 0.26), black);
  bedFrame.position.set(0, 0.157, -0.01);
  group.add(bedFrame);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, H - 0.06, 8), steel);
      screw.position.set(sx * 0.155, (H - 0.06) / 2 + 0.03, sz * 0.13);
      group.add(screw);
    }
  const backPanel = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.17, 0.01), std('#232527', { roughness: 0.7 }));
  backPanel.position.set(0, 0.29, -D / 2 + 0.03);
  group.add(backPanel);
  const vent = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.06), std('#3a3c3f', { roughness: 0.9 }));
  vent.position.set(0.08, 0.27, -D / 2 + 0.036);
  group.add(vent);
  // Gantry rails and the print head near the top.
  const gy = H - 0.06;
  const railX = new THREE.Mesh(new THREE.BoxGeometry(W - 0.06, 0.012, 0.02), black);
  railX.position.set(0, gy, -0.02);
  group.add(railX);
  for (const sx of [-1, 1]) {
    const railY = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.012, D - 0.06), black);
    railY.position.set(sx * (W / 2 - 0.04), gy, 0);
    group.add(railY);
  }
  const head = new THREE.Group();
  const headBody = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.07, 0.05), std('#cfd2d4', { roughness: 0.4 }));
  head.add(headBody);
  const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.004, 24), std('#2f3134', { roughness: 0.5 }));
  fan.rotation.x = Math.PI / 2;
  fan.position.set(0, 0.006, 0.026);
  head.add(fan);
  head.position.set(-0.06 + r() * 0.02, gy - 0.03, 0.0);
  group.add(head);
  const strip = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.006, D - 0.08), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.5, 2.6) }));
  strip.position.set(-W / 2 + 0.03, H - 0.035, 0);
  group.add(strip);
  const chamberLight = new THREE.PointLight('#e8f0ff', 0.35, 0.8, 1.6);
  chamberLight.position.set(-0.08, H - 0.06, 0.02);
  group.add(chamberLight);

  // ── Top glass lid (front strip visible in front of the filament unit).
  const lidFrame = new THREE.Mesh(roundedBoxGeo(W, 0.008, D, 0.03), blackGloss);
  lidFrame.position.y = H;
  group.add(lidFrame);

  // ── Filament unit on top (photo 01): body with a dark glass front over four feeders, and a smoked
  // half-cylinder dome over four spools.
  const ams = new THREE.Group();
  const aW = 0.37;
  const aD = 0.24;
  const aH = 0.11;
  const aBody = new THREE.Mesh(roundedBoxGeo(aW, aH, aD, 0.02), body);
  ams.add(aBody);
  const aFront = new THREE.Mesh(new THREE.BoxGeometry(aW - 0.02, aH - 0.018, 0.006), smoked);
  aFront.position.set(0, aH / 2 + 0.004, aD / 2 + 0.004);
  ams.add(aFront);
  for (let i = 0; i < 4; i++) {
    const feeder = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.05, 16), std('#8d9093', { metalness: 0.5, roughness: 0.4 }));
    feeder.position.set(-0.13 + i * 0.087, 0.035, aD / 2 - 0.03);
    ams.add(feeder);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.02), black);
    cap.position.set(-0.13 + i * 0.087, 0.075, aD / 2 - 0.025);
    ams.add(cap);
  }
  const dome = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, aW - 0.01, 40, 1, true, -Math.PI / 2, Math.PI), smoked);
  dome.rotation.z = Math.PI / 2;
  dome.position.set(0, aH, -0.005);
  ams.add(dome);
  for (const sx of [-1, 1]) {
    const endCap = new THREE.Mesh(new THREE.CircleGeometry(0.115, 32, 0, Math.PI), smoked);
    endCap.rotation.y = sx * Math.PI / 2;
    endCap.position.set(sx * (aW / 2 - 0.005), aH, -0.005);
    ams.add(endCap);
  }
  for (let i = 0; i < 4; i++) {
    const spool = new THREE.Group();
    const filament = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.052, 32), std(i === 2 ? '#d9d4c8' : '#e9e7e2', { roughness: 0.55 }));
    filament.rotation.z = Math.PI / 2;
    spool.add(filament);
    for (const fx of [-1, 1]) {
      const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.004, 32), std('#9fa2a6', { transparent: true, opacity: 0.55, roughness: 0.2 }));
      flange.rotation.z = Math.PI / 2;
      flange.position.x = fx * 0.028;
      spool.add(flange);
    }
    spool.position.set(-0.135 + i * 0.09, aH + 0.0, -0.005);
    ams.add(spool);
  }
  ams.position.set(-0.005, H + 0.004, -D / 2 + aD / 2 - 0.005);
  group.add(ams);

  // Side spool holder arm (left side, photo 01).
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 10), black);
  arm.rotation.z = Math.PI / 2;
  arm.position.set(-W / 2 - 0.06, 0.36, -0.05);
  group.add(arm);
  const armPost = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.07, 0.014), black);
  armPost.position.set(-W / 2 - 0.01, 0.36, -0.05);
  group.add(armPost);

  // ── Touchscreen on its bracket at the top front, tilted up toward a standing viewer (photo 01).
  const scr = new THREE.Group();
  const bezelMat = std('#9a9da0', { metalness: 0.85, roughness: 0.3, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0 });
  const bW = screenW + 0.014;
  const bH = screenH + 0.014;
  const bShape = new THREE.Shape();
  const br = 0.008;
  bShape.moveTo(-bW / 2 + br, -bH / 2);
  bShape.lineTo(bW / 2 - br, -bH / 2);
  bShape.quadraticCurveTo(bW / 2, -bH / 2, bW / 2, -bH / 2 + br);
  bShape.lineTo(bW / 2, bH / 2 - br);
  bShape.quadraticCurveTo(bW / 2, bH / 2, bW / 2 - br, bH / 2);
  bShape.lineTo(-bW / 2 + br, bH / 2);
  bShape.quadraticCurveTo(-bW / 2, bH / 2, -bW / 2, bH / 2 - br);
  bShape.lineTo(-bW / 2, -bH / 2 + br);
  bShape.quadraticCurveTo(-bW / 2, -bH / 2, -bW / 2 + br, -bH / 2);
  const bezelGeo = new THREE.ExtrudeGeometry(bShape, { depth: 0.01, bevelEnabled: true, bevelSize: 0.0015, bevelThickness: 0.0015, bevelSegments: 2, curveSegments: 6 });
  bezelGeo.translate(0, 0, -0.01);
  const bezel = new THREE.Mesh(bezelGeo, bezelMat);
  scr.add(bezel);
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(screenW, screenH),
    new THREE.MeshStandardMaterial({ color: '#07080a', map: screenUiTexture(), metalness: 0.1, roughness: 0.08 }),
  );
  screen.position.z = 0.0016;
  screen.name = 'touchscreen';
  scr.add(screen);
  // Bracket: a short arm from the top front lip down to the back of the screen.
  const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.012), body);
  bracket.position.set(0, 0.035, -0.02);
  bracket.rotation.x = 0.5;
  scr.add(bracket);
  // Placement: hanging just below the top front edge, face tilted up ~32°.
  scr.position.set(-0.008, H - 0.06, D / 2 + 0.03);
  scr.rotation.x = -0.56;
  group.add(scr);

  group.traverse((obj) => {
    const m = obj as THREE.Mesh;
    if (m.isMesh) {
      const mat = m.material as THREE.Material;
      m.castShadow = !(mat as THREE.MeshPhysicalMaterial).transparent;
      m.receiveShadow = true;
    }
  });
  return { group, screen, bezel, bezelMat, chamberLight };
}
