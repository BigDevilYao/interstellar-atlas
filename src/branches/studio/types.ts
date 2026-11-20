import type * as THREE from 'three';

export type WorldKey = 'printer' | 'studio' | 'murph';

/** One environment of the prototype. Each world has its own scene; the camera is shared. */
export interface World {
  key: WorldKey;
  scene: THREE.Scene;
  /** Exposure used by the final grade while this world is the one being viewed. */
  exposure: number;
  update(t: number, dt: number): void;
  dispose(): void;
}
