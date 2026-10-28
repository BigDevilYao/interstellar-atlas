import * as THREE from 'three';
import { NOISE } from '../glsl';
import { disposeScene, easeInOut, starSphere } from '../lib';
import type { SceneBuilder } from '../types';
import { createEndurance, createPlanet, createSun } from './parts';

/**
 * SATURN — a long shot: banded planet, wide rings with the planet's shadow across them,
 * and the Endurance as a tiny ruler crossing the foreground.
 */
export const buildSaturn: SceneBuilder = (ctx) => {
  const hi = ctx.quality === 'high';
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#000000');
  const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 20000);

  const sunDir = new THREE.Vector3(-0.85, 0.18, 0.5).normalize();
  scene.add(starSphere(hi ? 3500 : 1800, 12000, 11));
  const sunSprite = createSun('#fff4e0', 1400);
  sunSprite.position.copy(sunDir).multiplyScalar(11000);
  scene.add(sunSprite);

  const R = 600;
  const C = new THREE.Vector3(900, 80, -3600);
  const saturn = createPlanet({ radius: R, kind: 'saturn', sunDir, seed: 2 });
  saturn.position.copy(C);
  const tilt = new THREE.Euler(0.42, 0, 0.32);
  saturn.rotation.copy(tilt);
  scene.add(saturn);

  // Rings with procedural density and the planet's shadow.
  const ringMat = new THREE.ShaderMaterial({
    uniforms: { uSun: { value: sunDir }, uC: { value: C }, uR: { value: R }, uIn: { value: R * 1.25 }, uOut: { value: R * 2.35 } },
    vertexShader: /* glsl */ `varying vec3 vW; varying vec3 vL; void main() { vL = position; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      ${NOISE}
      uniform vec3 uSun; uniform vec3 uC; uniform float uR, uIn, uOut;
      varying vec3 vW; varying vec3 vL;
      void main() {
        float r = length(vL.xy);
        float t = (r - uIn) / (uOut - uIn);
        if (t < 0.0 || t > 1.0) discard;
        float bands = 0.55 + 0.45 * noise2(vec2(t * 180.0, 0.5)) * noise2(vec2(t * 37.0, 2.0));
        float cassini = smoothstep(0.58, 0.6, t) * smoothstep(0.66, 0.64, t);
        float dens = bands * (1.0 - cassini * 0.92) * smoothstep(0.0, 0.04, t) * smoothstep(1.0, 0.9, t);
        dens *= mix(0.6, 1.0, smoothstep(0.1, 0.4, t));
        // Planet shadow: does the ray from this point toward the sun hit the planet?
        vec3 o = vW - uC;
        float b = dot(o, uSun);
        float c = dot(o, o) - uR * uR;
        float shadow = (b < 0.0 && b * b - c > 0.0) ? 0.08 : 1.0;
        vec3 col = mix(vec3(0.62, 0.54, 0.42), vec3(0.92, 0.84, 0.7), bands) * dens * shadow * 1.4;
        gl_FragColor = vec4(col, dens * 0.92);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(R * 1.25, R * 2.35, 256, 1), ringMat);
  ring.position.copy(C);
  ring.rotation.copy(tilt);
  ring.rotateX(Math.PI / 2);
  scene.add(ring);

  const light = new THREE.DirectionalLight('#fff4e0', 3);
  light.position.copy(sunDir).multiplyScalar(100);
  scene.add(light, new THREE.AmbientLight('#404858', 0.6));

  const endurance = createEndurance();
  endurance.group.scale.setScalar(0.7);
  scene.add(endurance.group);

  // The wormhole: a small bright refracting glint near the orbit.
  const glint = new THREE.Mesh(
    new THREE.SphereGeometry(30, 32, 16),
    new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `varying vec3 vN; varying vec3 vW; void main() { vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */ `varying vec3 vN; varying vec3 vW; void main() { vec3 v = normalize(cameraPosition - vW); float f = pow(1.0 - abs(dot(normalize(vN), v)), 3.0); gl_FragColor = vec4(vec3(0.7, 0.85, 1.2) * (0.15 + f * 3.0), 1.0); }`,
    }),
  );
  glint.position.set(-900, 260, -3000);
  scene.add(glint);

  return {
    scene,
    camera,
    exposure: 0.75,
    bloom: { strength: 0.7, radius: 0.6, threshold: 1.2 },
    focus: C.clone(),
    anchors: [
      { at: C.clone().add(new THREE.Vector3(0, R * 1.05, 0)), label: 'Saturn' },
      { at: new THREE.Vector3(-900, 300, -3000), label: 'The wormhole' },
      { at: new THREE.Vector3(0, 6, 0), label: 'Endurance — for scale' },
    ],
    update(t, dt, k, free) {
      sunSprite.lookAt(camera.position);
      const e = easeInOut(k);
      endurance.group.position.set(THREE.MathUtils.lerp(-16, -2, e), -7 + e * 1.5, -46 - e * 10);
      endurance.group.rotation.set(-1.0, 0.5 + e * 0.3, 0.2);
      endurance.ring.rotation.z += dt * 0.15;
      if (!free) {
        camera.position.set(-6 + e * 5, 3 + e * 2, 30 - e * 6);
        camera.lookAt(new THREE.Vector3(120, -20, -600).lerp(C, 0.15 + e * 0.1));
        camera.rotation.z += 0.04;
      }
      void t;
    },
    dispose() {
      disposeScene(scene);
    },
  };
};
