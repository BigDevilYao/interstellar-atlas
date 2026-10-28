import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { NODE_MAP } from '../data/nodes';
import { actions, useAtlas } from '../state/store';
import { CORE_RADIUS, R, toWorld } from './geometry/space';
import { BOUND, DISK_TILT, RS, createGargantuaMaterial, updateGargantua } from './shaders/gargantuaShader';

/** GARGANTUA — the ray-marched black hole at the centre of the World Map. */
export function Gargantua() {
  const quality = useAtlas((s) => s.quality);
  const reducedMotion = useAtlas((s) => s.reducedMotion);
  const emphasised = useAtlas((s) => s.hoveredNode === 'gargantua' || s.selectedNode === 'gargantua');

  const frame = useRef<THREE.Group>(null!);
  const quad = useRef<THREE.Mesh>(null!);
  const hit = useRef<THREE.Mesh>(null!);
  const intensity = useRef(1);

  const material = useMemo(createGargantuaMaterial, []);
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => {
    material.uniforms.uSteps.value = quality === 'high' ? 220 : 110;
  }, [quality, material]);

  const center = useMemo(() => toWorld(NODE_MAP.gargantua.position, 0), []);
  const size = BOUND * RS * 2;

  useFrame((state, delta) => {
    const u = material.uniforms;
    u.uTime.value += Math.min(delta, 0.05) * (reducedMotion ? 0.12 : 1);
    updateGargantua(material, quad.current, frame.current, state.camera);
    hit.current.quaternion.copy(quad.current.quaternion);
    const target = emphasised ? 1.22 : 1.0;
    intensity.current += (target - intensity.current) * Math.min(1, delta * 4);
    u.uIntensity.value = intensity.current;
  });

  return (
    <group position={center}>
      <group ref={frame} rotation={DISK_TILT} />
      <mesh ref={quad} material={material} renderOrder={10} frustumCulled={false}>
        <planeGeometry args={[size, size]} />
      </mesh>
      {/* Invisible hit target for pointer interaction. */}
      <mesh
        ref={hit}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          actions.hoverNode('gargantua');
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          actions.hoverNode(null);
          document.body.style.cursor = '';
        }}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          actions.selectNode('gargantua');
        }}
      >
        <circleGeometry args={[CORE_RADIUS * R * 1.25, 48]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
    </group>
  );
}
