import { OrbitControls, PerformanceMonitor } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { Suspense, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { actions, getState, useAtlas } from '../state/store';
import { CameraRig } from './CameraRig';
import { Gargantua } from './Gargantua';
import { NodeMarkers } from './NodeMarkers';
import { OrbitalDots } from './OrbitalDots';
import { SphereStructure } from './SphereStructure';
import { Starfield } from './Starfield';
import { Trajectories } from './Trajectories';

/** Controlled mouse parallax: the whole instrument leans gently toward the pointer. */
function Parallax({ children }: { children: ReactNode }) {
  const group = useRef<THREE.Group>(null!);
  useFrame((state, delta) => {
    const reduced = getState().reducedMotion;
    const tx = reduced ? 0 : state.pointer.y * -0.035;
    const ty = reduced ? 0 : state.pointer.x * 0.05;
    const k = Math.min(1, delta * 2.2);
    group.current.rotation.x += (tx - group.current.rotation.x) * k;
    group.current.rotation.y += (ty - group.current.rotation.y) * k;
  });
  return <group ref={group}>{children}</group>;
}

export default function WorldMap() {
  const view = useAtlas((s) => s.view);
  const quality = useAtlas((s) => s.quality);
  const overlay = view !== 'map';

  return (
    <div className="map-canvas" role="application" aria-label="Interactive World Map of Interstellar">
      <Canvas
        frameloop={overlay ? 'never' : 'always'}
        dpr={quality === 'high' ? [1, 1.75] : [1, 1]}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        camera={{ fov: 34, near: 0.1, far: 600, position: [0, 0, 70] }}
        onCreated={({ gl }) => {
          gl.setClearColor('#000000', 1);
          actions.setReady();
        }}
        onPointerMissed={() => {
          const s = getState();
          if (s.selectedNode || s.selectedConnection) actions.clearSelection();
        }}
      >
        <PerformanceMonitor onDecline={() => actions.setQuality('low')} />
        <Suspense fallback={null}>
          <Starfield />
          <Parallax>
            <SphereStructure />
            <OrbitalDots />
            <Trajectories />
            <Gargantua />
            <NodeMarkers />
          </Parallax>
        </Suspense>
        <OrbitControls
          makeDefault
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={0.42}
          zoomSpeed={0.6}
          minPolarAngle={Math.PI / 2 - 0.45}
          maxPolarAngle={Math.PI / 2 + 0.45}
          minAzimuthAngle={-0.6}
          maxAzimuthAngle={0.6}
        />
        <CameraRig />
      </Canvas>
    </div>
  );
}
