import * as THREE from 'three';
import { disposeScene, easeInOut, particles, rng, seg, starSphere } from '../lib';
import type { SceneBuilder } from '../types';
import { createEndurance, createPlanet, createRanger, createSun } from './parts';

/**
 * ENDURANCE — the ring in orbit above Earth (default), or the damaged ring spinning
 * over the frozen planet while the Ranger matches its rotation (variant 'docking').
 */
export const buildEndurance: SceneBuilder = (ctx, variant) => {
  const docking = variant === 'docking';
  const hi = ctx.quality === 'high';
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#000000');
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 6000);

  const sunDir = new THREE.Vector3(docking ? -0.3 : 0.75, docking ? 0.35 : 0.25, docking ? -0.9 : -0.6).normalize();
  scene.add(starSphere(hi ? 3000 : 1500, 3000, 7));
  const sunSprite = createSun(docking ? '#eaf2ff' : '#fff2dc', 900);
  sunSprite.position.copy(sunDir).multiplyScalar(2800);
  scene.add(sunSprite);

  const planet = createPlanet({ radius: 900, kind: docking ? 'ice' : 'earth', sunDir, atmosphere: docking ? '#a8c8ff' : '#5a9cff', seed: docking ? 4 : 1 });
  planet.position.set(0, -960, -260);
  planet.rotation.z = 0.25;
  scene.add(planet);

  const sun = new THREE.DirectionalLight(docking ? '#eaf2ff' : '#fff4e2', 3.2);
  sun.position.copy(sunDir).multiplyScalar(60);
  scene.add(sun);
  scene.add(new THREE.HemisphereLight('#1a1e26', docking ? '#8aa0c0' : '#4a6a9a', 1.3));
  const fill = new THREE.DirectionalLight('#9ab4d8', 0.9);
  fill.position.set(-20, 10, 40);
  scene.add(fill);

  const endurance = createEndurance({ broken: docking ? [2, 3] : [] });
  endurance.group.rotation.set(-0.35, 0.65, 0.12);
  scene.add(endurance.group);

  const ranger = createRanger();
  ranger.scale.setScalar(0.42);
  scene.add(ranger);

  // Debris and sparks for the docking variant.
  let debris: THREE.Points | null = null;
  if (docking) {
    const r = rng(6);
    const parts: THREE.Mesh[] = [];
    for (let i = 0; i < 26; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.3 + r() * 0.8, 0.1 + r() * 0.4, 0.2 + r() * 0.6), new THREE.MeshStandardMaterial({ color: '#9a9890', metalness: 0.5, roughness: 0.5 }));
      const a = 0.45 + r() * 0.5;
      m.position.set(Math.cos(a * Math.PI) * (6 + r() * 6), Math.sin(a * Math.PI) * (6 + r() * 6), (r() - 0.5) * 4);
      m.userData.spin = new THREE.Vector3(r(), r(), r()).multiplyScalar(2);
      m.userData.vel = m.position.clone().normalize().multiplyScalar(0.4 + r() * 0.6);
      endurance.group.add(m);
      parts.push(m);
    }
    endurance.group.userData.debris = parts;
    debris = particles({
      count: 400,
      seed: 3,
      pos: (_, rr) => {
        const a = (0.4 + rr() * 0.6) * Math.PI;
        const d = 6 + rr() * 2;
        return [Math.cos(a) * d, Math.sin(a) * d, (rr() - 0.5) * 2];
      },
      color: '#ffcf8a',
      size: [0.05, 0.16],
      drift: new THREE.Vector3(0, 0, 0.3),
      opacity: 0.9,
    });
    endurance.group.add(debris);
  }

  const look = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  let spin = 0;

  return {
    scene,
    camera,
    exposure: 1.0,
    bloom: { strength: 0.9, radius: 0.6, threshold: 1.0 },
    focus: new THREE.Vector3(0, 0, 0),
    anchors: [
      { at: new THREE.Vector3(6.8, 0, 0).applyEuler(endurance.group.rotation), label: 'Module · one of twelve' },
      { at: new THREE.Vector3(0, 0, 1.8).applyEuler(endurance.group.rotation), label: 'Docking hub' },
      { at: new THREE.Vector3(0, -12, -8), label: docking ? 'Mann’s Planet' : 'Earth' },
    ],
    update(t, dt, k, free) {
      spin += dt * (docking ? 1.25 * (1 - 0.7 * seg(k, 0.75, 1)) : 0.12);
      endurance.ring.rotation.z = spin;
      endurance.nav.forEach((n, i) => (n.visible = Math.sin(t * 3 + i) > 0.2));
      if (debris) (debris.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
      const dparts = endurance.group.userData.debris as THREE.Mesh[] | undefined;
      dparts?.forEach((m) => {
        m.position.addScaledVector(m.userData.vel, dt);
        m.rotation.x += m.userData.spin.x * dt;
        m.rotation.y += m.userData.spin.y * dt;
      });
      (planet.userData.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
      sunSprite.lookAt(camera.position);

      // Ranger: docked at the hub, or approaching it along the axis.
      const axis = new THREE.Vector3(0, 0, 1).applyEuler(endurance.group.rotation);
      if (docking) {
        const appr = easeInOut(seg(k, 0.05, 0.9));
        ranger.position.copy(axis).multiplyScalar(THREE.MathUtils.lerp(28, 3.3, appr));
        ranger.lookAt(0, 0, 0);
        ranger.rotateY(-Math.PI / 2);
        ranger.rotateX(spin * seg(k, 0.35, 0.7));
      } else {
        ranger.position.copy(axis).multiplyScalar(THREE.MathUtils.lerp(9, 3.3, easeInOut(seg(k, 0.1, 0.6))));
        ranger.lookAt(0, 0, 0);
        ranger.rotateY(-Math.PI / 2);
      }
      const eng = ranger.getObjectByName('engine') as THREE.Mesh;
      eng.visible = Math.sin(t * 40) > -0.6;

      if (!free) {
        if (docking) {
          // Behind the Ranger, looking down the ring axis; roll matched to the spin.
          const match = easeInOut(seg(k, 0.3, 0.6));
          const back = THREE.MathUtils.lerp(40, 9, easeInOut(seg(k, 0, 0.9)));
          camera.position.copy(axis).multiplyScalar(back).add(tmp.set(1.5, 1.0, 0).applyEuler(endurance.group.rotation));
          camera.up.set(0, 1, 0).applyAxisAngle(axis, spin * match);
          camera.lookAt(look.set(0, 0, 0));
        } else {
          const e = easeInOut(k);
          const a = -0.5 + e * 1.2;
          camera.position.set(Math.sin(a) * 26, 4 + e * 3, Math.cos(a) * 26 - 4);
          look.set(0, -2 + e * 1.5, 0);
          camera.up.set(0, 1, 0);
          camera.lookAt(look);
          camera.rotation.z += 0.08 * Math.sin(t * 0.2);
        }
      }
    },
    dispose() {
      disposeScene(scene);
    },
  };
};
