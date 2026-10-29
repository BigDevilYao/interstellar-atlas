import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useAtlas } from '../state/store';
import { mulberry32 } from './geometry/space';
import { glowPointsMaterial } from './materials';

/** Sparse deep-space starfield (the reference is mostly black — restraint matters). */
export function Starfield({ count = 1400 }: { count?: number }) {
  const reducedMotion = useAtlas((s) => s.reducedMotion);
  const geometry = useMemo(() => {
    const rnd = mulberry32(7);
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const size = new Float32Array(count);
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // Uniform direction on a sphere, pushed far behind the map.
      const u = rnd() * 2 - 1;
      const th = rnd() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      const d = 90 + rnd() * 60;
      pos[i * 3] = s * Math.cos(th) * d;
      pos[i * 3 + 1] = u * d;
      pos[i * 3 + 2] = s * Math.sin(th) * d - 40;
      const warm = rnd() < 0.18;
      const b = 0.35 + Math.pow(rnd(), 3) * 0.65;
      col[i * 3] = b * (warm ? 1 : 0.9);
      col[i * 3 + 1] = b * (warm ? 0.86 : 0.92);
      col[i * 3 + 2] = b * (warm ? 0.68 : 1);
      size[i] = 1.4 + Math.pow(rnd(), 6) * 4.5;
      seed[i] = rnd();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    return g;
  }, [count]);
  const material = useMemo(() => glowPointsMaterial(0.35), []);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame((_, delta) => {
    if (!reducedMotion) material.uniforms.uTime.value += delta;
  });

  return <points geometry={geometry} material={material} renderOrder={-1} frustumCulled={false} />;
}
