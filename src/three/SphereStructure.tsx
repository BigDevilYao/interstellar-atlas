import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useAtlas } from '../state/store';
import { R, circlePoints } from './geometry/space';
import { O, X, Y, buildFunnels, buildGrid, buildOrbits, buildWell } from './geometry/sphereGeometry';
import { hairlineMaterial } from './materials';
import { DISK_TILT } from './shaders/gargantuaShader';

export { ORBITS } from './geometry/sphereGeometry';

/** Silhouette rings that always face the camera — the crisp outer circle of the reference. */
function Limb() {
  const group = useRef<THREE.Group>(null!);
  const ringGeo = useMemo(() => {
    const pts = circlePoints(O, X, Y, 1, 256);
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, []);
  const mats = useMemo(
    () => [
      new THREE.LineBasicMaterial({ color: '#f1ede6', transparent: true, opacity: 0.85 }),
      new THREE.LineBasicMaterial({ color: '#f1ede6', transparent: true, opacity: 0.22 }),
      new THREE.LineBasicMaterial({ color: '#f0c98f', transparent: true, opacity: 0.12 }),
    ],
    [],
  );
  const q = useMemo(() => new THREE.Quaternion(), []);
  const camLocal = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ camera }) => {
    const g = group.current;
    const parent = g.parent!;
    camLocal.copy(camera.position);
    parent.worldToLocal(camLocal);
    const D = camLocal.length();
    const k = Math.min(0.999, (R * R) / (D * D));
    g.position.copy(camLocal).normalize().multiplyScalar((R * R) / D);
    const radius = R * Math.sqrt(1 - k);
    g.scale.setScalar(radius);
    parent.getWorldQuaternion(q).invert();
    g.quaternion.copy(q.multiply(camera.quaternion));
  });

  useEffect(() => () => mats.forEach((m) => m.dispose()), [mats]);

  return (
    <group ref={group} renderOrder={2}>
      <lineLoop geometry={ringGeo} material={mats[0]} />
      <lineLoop geometry={ringGeo} material={mats[1]} scale={1.012} />
      <lineLoop geometry={ringGeo} material={mats[2]} scale={1.045} />
    </group>
  );
}

/** Vertical and horizontal axes — interrupted by Gargantua, as in the reference. */
export const AXIS_SEGMENTS: [number, number, number, number][] = [
  // x0, y0, x1, y1 in sphere radii
  [0, 1.12, 0, 0.2],
  [0, -0.3, 0, -1.12],
  [-1.14, 0, -0.5, 0],
  [0.5, 0, 1.14, 0],
];

function Axes() {
  const segs = useMemo(
    () => AXIS_SEGMENTS.map(([x0, y0, x1, y1]) => [new THREE.Vector3(x0 * R, y0 * R, 0), new THREE.Vector3(x1 * R, y1 * R, 0)]),
    [],
  );
  return (
    <group>
      {segs.map((pts, i) => (
        <Line
          key={i}
          points={pts}
          color="#ece8e0"
          lineWidth={0.8}
          transparent
          opacity={i < 2 ? 0.24 : 0.3}
          dashed={i < 2}
          dashSize={0.35}
          gapSize={0.3}
        />
      ))}
    </group>
  );
}

export function SphereStructure() {
  const reducedMotion = useAtlas((s) => s.reducedMotion);
  const grid = useMemo(buildGrid, []);
  const orbits = useMemo(buildOrbits, []);
  const funnels = useMemo(buildFunnels, []);
  const well = useMemo(buildWell, []);
  const mat = useMemo(() => hairlineMaterial(1), []);

  useEffect(
    () => () => {
      [grid, orbits, funnels, well].forEach((g) => g.dispose());
      mat.dispose();
    },
    [grid, orbits, funnels, well, mat],
  );

  // Extremely slow precession of the meridian cage — keeps the instrument alive without moving nodes.
  const cage = useRef<THREE.Group>(null!);
  useFrame((_, delta) => {
    if (reducedMotion) return;
    cage.current.rotation.y += delta * 0.006;
  });

  return (
    <group>
      <group ref={cage}>
        <lineSegments geometry={grid} material={mat} renderOrder={1} />
      </group>
      <lineSegments geometry={orbits} material={mat} renderOrder={1} />
      <lineSegments geometry={funnels} material={mat} renderOrder={1} />
      {/* The gravity well shares the disk tilt of Gargantua. */}
      <group rotation={DISK_TILT} position={[0, -0.04 * R, 0]}>
        <lineSegments geometry={well} material={mat} renderOrder={1} />
      </group>
      <Limb />
      <Axes />
    </group>
  );
}
