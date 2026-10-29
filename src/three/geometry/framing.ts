import * as THREE from 'three';
import { R } from './space';

/** Camera distance that frames the whole World Map (incl. outer labels) for an aspect ratio. */
export function fitDistance(fovDeg: number, aspect: number): number {
  const tanV = Math.tan(THREE.MathUtils.degToRad(fovDeg) / 2);
  const needV = 1.2 * R;
  // Portrait screens need more room for the outer labels (Endurance, Miller's Planet).
  const needH = (aspect < 0.8 ? 1.62 : 1.36) * R;
  return Math.max(needV / tanV, needH / (tanV * aspect));
}
