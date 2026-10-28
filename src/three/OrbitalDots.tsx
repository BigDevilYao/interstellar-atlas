import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useAtlas } from '../state/store';
import { toWorld } from './geometry/space';
import { glowPointsMaterial } from './materials';
import { ORBITS } from './geometry/sphereGeometry';

/**
 * Warm gold waypoints: static markers at the limb (Endurance / Miller) and slow
 * travelling points along the large orbits — the "subtle moving points" of the brief.
 */
const STATIC: [number, number, number, number][] = [
  // x, y, depth, size(px)
  [-1.0, 0.0, 0, 13],
  [1.0, 0.0, 0, 13],
  [-0.63, 0.75, 0.25, 8],
  [0.8, 0.51, 0.1, 8],
  [-0.94, 0.23, 0.05, 7],
  [0.82, -0.36, 0.2, 7],
  [-0.67, -0.68, 0.1, 6],
  [0.67, -0.7, 0.2, 6],
];

const MOVERS = [
  { orbit: 0, phase: 0.1, speed: 0.012 },
  { orbit: 0, phase: 0.6, speed: 0.012 },
  { orbit: 1, phase: 0.35, speed: -0.01 },
  { orbit: 2, phase: 0.2, speed: 0.008 },
  { orbit: 2, phase: 0.72, speed: 0.008 },
  { orbit: 3, phase: 0.5, speed: -0.009 },
  { orbit: 4, phase: 0.05, speed: 0.014 },
  { orbit: 5, phase: 0.4, speed: -0.011 },
  { orbit: 6, phase: 0.85, speed: 0.01 },
];

export function OrbitalDots() {
  const reducedMotion = useAtlas((s) => s.reducedMotion);
  const total = STATIC.length + MOVERS.length;
  const geometry = useMemo(() => {
    const pos = new Float32Array(total * 3);
    const col = new Float32Array(total * 3);
    const size = new Float32Array(total);
    const seed = new Float32Array(total);
    STATIC.forEach(([x, y, d, s], i) => {
      const p = toWorld([x, y], d);
      pos.set([p.x, p.y, p.z], i * 3);
      col.set([1.0, 0.85, 0.66], i * 3);
      size[i] = s;
      seed[i] = i * 0.13;
    });
    MOVERS.forEach((_, j) => {
      const i = STATIC.length + j;
      col.set([0.98, 0.8, 0.58], i * 3);
      size[i] = 6.5;
      seed[i] = j * 0.31;
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    return g;
  }, [total]);
  const material = useMemo(() => glowPointsMaterial(0.15), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const time = useMemo(() => ({ t: 0 }), []);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame((_, delta) => {
    time.t += reducedMotion ? 0 : delta;
    material.uniforms.uTime.value = time.t;
    const attr = geometry.getAttribute('position') as THREE.BufferAttribute;
    MOVERS.forEach((m, j) => {
      const o = ORBITS[m.orbit];
      const a = (m.phase + time.t * m.speed) * Math.PI * 2;
      tmp.copy(o.c).addScaledVector(o.u, Math.cos(a) * o.r).addScaledVector(o.v, Math.sin(a) * o.r);
      attr.setXYZ(STATIC.length + j, tmp.x, tmp.y, tmp.z);
    });
    attr.needsUpdate = true;
  });

  return <points geometry={geometry} material={material} renderOrder={3} frustumCulled={false} />;
}
