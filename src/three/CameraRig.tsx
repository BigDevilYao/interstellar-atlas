import { useThree } from '@react-three/fiber';
import gsap from 'gsap';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { getState, useAtlas } from '../state/store';
import { fitDistance } from './geometry/framing';
import { R, connectionMidpoint, nodeWorld } from './geometry/space';

export { fitDistance };

// Camera moves keep real time even when frames are slow (no lag smoothing).
gsap.ticker.lagSmoothing(0);

interface ControlsLike {
  target: THREE.Vector3;
  update: () => void;
  minDistance: number;
  maxDistance: number;
}

/**
 * Cinematic camera controller.
 * Responds to store commands (home / focus node / focus connection / zoom) with GSAP tweens
 * of both the camera position and the orbit target, keeping OrbitControls in sync.
 */
export function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const controls = useThree((s) => s.controls) as unknown as ControlsLike | null;
  const cmd = useAtlas((s) => s.camera);
  const introDone = useRef(false);

  const home = useMemo(() => fitDistance(camera.fov, size.width / Math.max(1, size.height)), [camera.fov, size]);

  // Distance limits follow the framing.
  useEffect(() => {
    if (!controls) return;
    controls.minDistance = home * 0.32;
    controls.maxDistance = home * 1.6;
  }, [controls, home]);

  function tweenTo(target: THREE.Vector3, position: THREE.Vector3, duration = 1.6, ease = 'power3.inOut') {
    if (!controls) return;
    const reduced = getState().reducedMotion;
    gsap.killTweensOf(camera.position);
    gsap.killTweensOf(controls.target);
    const d = reduced ? 0.01 : duration;
    gsap.to(controls.target, { x: target.x, y: target.y, z: target.z, duration: d, ease, onUpdate: () => controls.update() });
    gsap.to(camera.position, { x: position.x, y: position.y, z: position.z, duration: d, ease, onUpdate: () => controls.update() });
  }

  // Opening shot: a slow dolly-in from deep space.
  useEffect(() => {
    if (!controls || introDone.current) return;
    introDone.current = true;
    const reduced = getState().reducedMotion;
    controls.target.set(0, 0, 0);
    if (reduced) {
      camera.position.set(0, 0, home);
      controls.update();
      return;
    }
    camera.position.set(0, home * 0.18, home * 1.55);
    controls.update();
    gsap.to(camera.position, {
      x: 0,
      y: 0,
      z: home,
      duration: 3.6,
      ease: 'power2.out',
      delay: 0.2,
      onUpdate: () => controls.update(),
    });
  }, [controls, camera, home]);

  // Keep the home framing correct when the viewport changes.
  useEffect(() => {
    if (!controls || !introDone.current) return;
    const s = getState();
    if (s.selectedNode || s.selectedConnection) return;
    const dir = camera.position.clone().sub(controls.target).normalize();
    camera.position.copy(controls.target).addScaledVector(dir, home);
    controls.update();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [home]);

  useEffect(() => {
    if (!controls || cmd.nonce === 0) return;
    switch (cmd.kind) {
      case 'home': {
        tweenTo(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, home), 1.8);
        break;
      }
      case 'focus-node': {
        const p = nodeWorld(cmd.node);
        if (cmd.node === 'gargantua') {
          tweenTo(new THREE.Vector3(0, -0.04 * R, 0), new THREE.Vector3(0, 0.03 * R, home * 0.46), 2.0);
          break;
        }
        const target = p.clone().multiplyScalar(0.55);
        const dir = new THREE.Vector3((p.x / R) * 0.34, (p.y / R) * 0.22, 1).normalize();
        tweenTo(target, target.clone().addScaledVector(dir, home * 0.62), 1.7);
        break;
      }
      case 'focus-connection': {
        const m = connectionMidpoint(cmd.connection);
        const target = m.clone().multiplyScalar(0.55);
        const dir = new THREE.Vector3((m.x / R) * 0.25, (m.y / R) * 0.18, 1).normalize();
        tweenTo(target, target.clone().addScaledVector(dir, home * 0.78), 1.6);
        break;
      }
      case 'zoom': {
        const offset = camera.position.clone().sub(controls.target);
        const dist = THREE.MathUtils.clamp(offset.length() * cmd.factor, controls.minDistance, controls.maxDistance);
        offset.setLength(dist);
        tweenTo(controls.target.clone(), controls.target.clone().add(offset), 0.7, 'power2.out');
        break;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cmd.nonce, controls]);

  return null;
}
