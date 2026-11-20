import * as THREE from 'three';
import { buildBedroom } from '../../cinema/scenes/bedroom';
import type { SceneInstance } from '../../cinema/types';
import type { World } from './types';

/**
 * SCENE 04 — Murph's room, reused from the Atlas (`buildBedroom`, unchanged). The prototype only adds
 * a threshold at the back of the bookshelf: the gap on the third shelf, just above Murph's watch.
 *
 * Bookshelf facts mirrored from bedroom.ts (shelf centre x 0.35, width 2.0, depth 0.34, back panel at
 * z ≈ −2.26, shelf planks at y 0.08 / 0.5 / 0.92 / 1.34 / 1.76, watch gap x 0.80–1.10 on the 0.92 shelf).
 */
export interface MurphWorld extends World {
  inst: SceneInstance;
  /** Exit opening: centre, outward normal (+Z into the room), width (portal scale), height. */
  opening: { center: THREE.Vector3; quat: THREE.Quaternion; width: number; height: number };
  /** Arrival viewpoint (the room seen from near the door, looking at the bookshelf). */
  arrival: { pos: THREE.Vector3; look: THREE.Vector3 };
}

const SHELF_X = 0.35;
const Z0 = -4.6 / 2;

export function buildMurph(ctx: { renderer: THREE.WebGLRenderer; quality: 'high' | 'low'; width: number; height: number }): MurphWorld {
  const inst = buildBedroom(ctx);
  let t = 0;
  return {
    key: 'murph',
    scene: inst.scene,
    exposure: inst.exposure,
    inst,
    opening: {
      center: new THREE.Vector3(SHELF_X + 0.6, 1.17, Z0 + 0.045),
      quat: new THREE.Quaternion(),
      width: 0.24,
      height: 0.15,
    },
    // Arrival: out of the bookshelf, turning back while drifting into the room to look at the wall of
    // books you came through (the thing the match cut was drawn from).
    arrival: { pos: new THREE.Vector3(-1.05, 1.42, 1.15), look: new THREE.Vector3(0.75, 1.05, -2.1) },
    update(_t, dt) {
      t += dt;
      // The room's own life (dust, light, the watch) without its cinematic camera: free = true.
      inst.update(t, dt, 0.3, true);
    },
    dispose() {
      inst.dispose();
    },
  };
}
