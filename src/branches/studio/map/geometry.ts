import * as THREE from 'three';
import { nodeWorld, toWorld } from '../../../three/geometry/space';

/**
 * Where the Studio branch sits on the World Map: a small ring just outside the sphere's silhouette,
 * to the right of Edmunds' Planet (the journey's final chapter), joined to it by one short connector drawn in
 * the map's own "information" line style. Existing nodes and connections are untouched.
 */
export const STUDIO_MAP_POS: [number, number] = [0.99, -0.6];

export function studioMarkerWorld(): THREE.Vector3 {
  return toWorld(STUDIO_MAP_POS, 0);
}

let cached: THREE.Vector3[] | null = null;
/** Edmunds' Planet → Studio branch connector (sampled evenly by arc length). */
export function studioConnectorPoints(n = 80): THREE.Vector3[] {
  if (cached && cached.length === n + 1) return cached;
  const a = nodeWorld('edmunds');
  const b = studioMarkerWorld();
  const via = toWorld([0.64, -0.585], 0);
  via.z = a.z * 0.35;
  cached = new THREE.CatmullRomCurve3([a, via, b], false, 'centripetal', 0.5).getSpacedPoints(n);
  return cached;
}

/** The map's "information" layer style (see three/Trajectories.tsx), used for the connector. */
export const CONNECTOR_STYLE = { color: '#a9c3e6', width: 1.15, opacity: 0.6, dashSize: 0.06, gapSize: 0.2, flow: 0.9 } as const;
