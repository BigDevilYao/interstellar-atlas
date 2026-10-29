import * as THREE from 'three';
import { NOISE, STARS } from '../glsl';
import { disposeScene, easeInOut, seg } from '../lib';
import type { SceneBuilder } from '../types';
import { createEndurance, createPlanet } from './parts';

/**
 * THE WORMHOLE — a sphere that shows another galaxy inside it, ringed by a lensed
 * image of our own sky. Not a hole: a spherical aperture.
 */

const SKY = /* glsl */ `
  vec3 homeSky(vec3 d) {
    vec3 c = starField(d, 1.0) * 1.3;
    float band = exp(-pow(dot(d, normalize(vec3(0.3, 1.0, 0.1))) * 4.0, 2.0));
    c += vec3(0.16, 0.13, 0.2) * band * fbm3(d * 4.0) * 0.3;
    return c;
  }
  vec3 otherSky(vec3 d) {
    // A different galaxy: dense warm stars, a bright spiral and blue nebulae.
    vec3 c = starField(d.zxy, 2.6) * 2.0;
    vec3 gc = normalize(vec3(0.15, 0.08, -1.0));
    float cosA = dot(d, gc);
    vec3 a1 = normalize(cross(gc, vec3(0.0, 1.0, 0.0)));
    vec3 a2 = cross(gc, a1);
    vec2 p = vec2(dot(d, a1), dot(d, a2) * 2.2) / max(cosA, 0.05);
    float r = length(p);
    float th = atan(p.y, p.x);
    float arms = pow(0.5 + 0.5 * cos(2.0 * th - log(r + 1e-3) * 5.0), 3.0);
    float gal = exp(-r * 3.0) * (0.4 + arms * 1.2) * step(0.0, cosA);
    c += vec3(1.0, 0.82, 0.62) * gal * 2.4 + vec3(1.0, 0.9, 0.8) * exp(-r * 18.0) * 6.0 * step(0.0, cosA);
    float neb = fbm3(d * 3.0 + 7.0);
    c += vec3(0.25, 0.45, 0.9) * smoothstep(0.6, 0.9, neb) * 0.22 + vec3(0.8, 0.3, 0.5) * smoothstep(0.68, 0.92, fbm3(d * 5.0)) * 0.1;
    return c;
  }
`;

export const buildWormhole: SceneBuilder = (ctx) => {
  void ctx;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 30000);

  // Background sky (our galaxy).
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: /* glsl */ `varying vec3 vD; void main() { vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
    fragmentShader: /* glsl */ `${NOISE}\n${STARS}\n${SKY}\nvarying vec3 vD; void main() { gl_FragColor = vec4(homeSky(normalize(vD)), 1.0); }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(20000, 48, 24), skyMat);
  sky.renderOrder = -10;
  scene.add(sky);

  const sunDir = new THREE.Vector3(-0.6, 0.25, 0.75).normalize();
  const saturn = createPlanet({ radius: 900, kind: 'saturn', sunDir, seed: 2 });
  saturn.position.set(-6000, -1200, -9000);
  scene.add(saturn);

  // The wormhole sphere.
  const WR = 120;
  const WC = new THREE.Vector3(0, 0, -700);
  const holeMat = new THREE.ShaderMaterial({
    uniforms: { uC: { value: WC }, uR: { value: WR }, uTime: { value: 0 } },
    vertexShader: /* glsl */ `varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      ${NOISE}
      ${STARS}
      ${SKY}
      uniform vec3 uC; uniform float uR, uTime;
      varying vec3 vW;
      vec3 rotAxis(vec3 v, vec3 k, float a) { return v * cos(a) + cross(k, v) * sin(a) + k * dot(k, v) * (1.0 - cos(a)); }
      void main() {
        vec3 d = normalize(vW - cameraPosition);
        vec3 toC = uC - cameraPosition;
        float dist = length(toC);
        float ang = acos(clamp(dot(d, normalize(toC)), -1.0, 1.0));
        float angR = asin(clamp(uR / dist, 0.0, 1.0));
        float x = clamp(ang / angR, 0.0, 1.0); // 0 centre → 1 rim
        vec3 axis = normalize(cross(d, normalize(toC)) + 1e-5);
        // Inside: the other galaxy, magnified toward the centre.
        vec3 dIn = rotAxis(normalize(toC), axis, -x * 1.2);
        vec3 inner = otherSky(dIn);
        // Toward the rim: our own sky wrapped around (Einstein ring).
        float wrap = pow(x, 6.0);
        vec3 dOut = rotAxis(d, axis, wrap * 3.0 + x * 0.6);
        vec3 ringSky = homeSky(dOut) * (1.0 + wrap * 3.0);
        vec3 col = mix(inner, ringSky, smoothstep(0.72, 0.97, x));
        col += vec3(0.75, 0.85, 1.0) * exp(-pow((x - 0.985) * 70.0, 2.0)) * 2.2;
        col *= 0.9 + 0.1 * sin(uTime * 0.5 + x * 12.0);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const hole = new THREE.Mesh(new THREE.SphereGeometry(WR, 96, 64), holeMat);
  hole.position.copy(WC);
  scene.add(hole);
  // Soft halo.
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(WR * 1.6, 64, 32),
    new THREE.ShaderMaterial({
      uniforms: { uC: { value: WC }, uR: { value: WR } },
      vertexShader: /* glsl */ `varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uC; uniform float uR; varying vec3 vW;
        void main() {
          vec3 d = normalize(vW - cameraPosition); vec3 toC = uC - cameraPosition; float dist = length(toC);
          float ang = acos(clamp(dot(d, normalize(toC)), -1.0, 1.0)); float angR = asin(clamp(uR / dist, 0.0, 1.0));
          float x = ang / angR;
          float a = x > 1.0 ? exp(-(x - 1.0) * 6.0) * 0.35 : 0.0;
          gl_FragColor = vec4(vec3(0.6, 0.75, 1.0) * a, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
    }),
  );
  halo.position.copy(WC);
  scene.add(halo);

  const endurance = createEndurance();
  endurance.group.scale.setScalar(1.4);
  scene.add(endurance.group);
  const light = new THREE.DirectionalLight('#ffeedd', 2.6);
  light.position.copy(sunDir).multiplyScalar(100);
  scene.add(light, new THREE.AmbientLight('#8aa0d0', 0.5));

  return {
    scene,
    camera,
    exposure: 1.0,
    bloom: { strength: 0.75, radius: 0.6, threshold: 1.0 },
    focus: WC.clone(),
    anchors: [
      { at: WC.clone().add(new THREE.Vector3(0, WR, 0)), label: 'Spherical aperture' },
      { at: WC.clone(), label: 'Another galaxy, seen through it' },
      { at: new THREE.Vector3(0, -4, -40), label: 'Endurance' },
    ],
    update(t, dt, k, free) {
      holeMat.uniforms.uTime.value = t;
      const e = easeInOut(k);
      endurance.group.position.set(-10 + e * 6, -6 + e * 2, -40 - e * 380);
      endurance.group.rotation.set(-0.3, 0.2, 0);
      endurance.ring.rotation.z += dt * 0.12;
      if (!free) {
        camera.position.set(4 - e * 4, 2, 60 - e * 330);
        camera.lookAt(WC.x - 20 * (1 - e), WC.y, WC.z);
        camera.rotation.z += 0.03 * Math.sin(t * 0.3) + 0.04 * seg(k, 0.6, 1);
      }
    },
    dispose() {
      disposeScene(scene);
    },
  };
};
