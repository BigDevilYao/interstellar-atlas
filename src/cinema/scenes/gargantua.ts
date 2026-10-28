import * as THREE from 'three';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import { NOISE, STARS } from '../glsl';
import { disposeScene, easeInOut, seg } from '../lib';
import type { SceneBuilder } from '../types';
import { createEndurance } from './parts';

/**
 * GARGANTUA (cinematic) — a full-frame ray-marched black hole at half resolution.
 * Both the accretion disk and the background stars are gravitationally lensed.
 * Units: rs = 1 (Schwarzschild radius) = 1 world unit.
 */

const frag = /* glsl */ `
  ${NOISE}
  ${STARS}
  uniform vec3 uCam; uniform vec3 uRight; uniform vec3 uUp; uniform vec3 uFwd;
  uniform float uTan; uniform float uAspect; uniform float uTime; uniform float uSteps;
  uniform mat3 uToBH; uniform mat3 uToWorld;
  varying vec2 vUv;

  const float RIN = 2.6;
  const float ROUT = 14.0;
  const float BOUND = 26.0;

  vec3 sky(vec3 d) {
    vec3 c = starField(d, 1.0) * 1.4;
    float band = exp(-pow(dot(d, normalize(vec3(0.2, 1.0, 0.35))) * 3.2, 2.0));
    float n = fbm3(d * 3.0);
    c += vec3(0.16, 0.12, 0.2) * band * n * 0.35;
    return c;
  }

  vec4 disk(vec3 hit, vec3 dir) {
    float r = length(hit.xz);
    float phi = atan(hit.z, hit.x);
    float omega = 2.4 * pow(r, -1.5);
    float ang = phi + uTime * omega;
    vec3 q = vec3(cos(ang) * 1.6, sin(ang) * 1.6, r * 2.2);
    float n = fbm3(q);
    float n2 = noise3(vec3(cos(ang) * 5.0, sin(ang) * 5.0, r * 12.0));
    float streak = 0.35 + 0.95 * n + 0.35 * n2;
    float inner = smoothstep(RIN, RIN + 0.4, r);
    float outer = 1.0 - smoothstep(ROUT * 0.45, ROUT, r);
    float fall = pow(RIN / r, 1.25);
    float dens = inner * outer * streak;
    float t = clamp((r - RIN) / (ROUT - RIN), 0.0, 1.0);
    vec3 c = mix(vec3(1.0, 0.95, 0.86), vec3(1.0, 0.7, 0.38), smoothstep(0.0, 0.25, t));
    c = mix(c, vec3(0.6, 0.28, 0.1), smoothstep(0.25, 1.0, t));
    vec3 vel = normalize(vec3(-hit.z, 0.0, hit.x));
    float dop = 1.0 + 0.3 * dot(vel, -dir) * sqrt(RIN / r);
    float I = fall * dens * dop * 2.6;
    float a = clamp(dens * fall * 1.1, 0.0, 0.97);
    return vec4(c * I, a);
  }

  void main() {
    vec2 ndc = vUv * 2.0 - 1.0;
    vec3 rdW = normalize(uFwd + ndc.x * uTan * uAspect * uRight + ndc.y * uTan * uUp);
    vec3 rd = uToBH * rdW;
    vec3 ro = uCam;

    vec3 col = vec3(0.0);
    float alpha = 0.0;
    float b = length(cross(ro, rd));
    float tb = dot(ro, rd);
    float tc = dot(ro, ro) - BOUND * BOUND;
    float disc = tb * tb - tc;

    if (disc < 0.0 || -tb - sqrt(disc) < 0.0 && dot(ro, ro) > BOUND * BOUND) {
      // Outside the marching volume: weak-field deflection toward the hole (≈ 2 rs / b).
      vec3 toC = normalize(-ro - rd * tb);
      float defl = 2.0 / max(b, 1.0);
      vec3 d = normalize(rd + toC * defl);
      gl_FragColor = vec4(sky(uToWorld * d), 1.0);
      return;
    }

    float t0 = max(-tb - sqrt(disc), 0.0);
    vec3 pos = ro + rd * t0;
    vec3 vel = rd;
    vec3 hv = cross(pos, vel);
    float h2 = dot(hv, hv);
    bool captured = false;
    float haze = 0.0;

    for (int i = 0; i < 300; i++) {
      if (float(i) >= uSteps) break;
      float r2 = dot(pos, pos);
      float r = sqrt(r2);
      if (r < 1.0) { captured = true; break; }
      float dt = clamp(0.03 * r2 * 0.5, 0.025, 0.9);
      vec3 prev = pos;
      vel += -1.5 * h2 * pos / (r2 * r2 * r) * dt;
      pos += vel * dt;
      float rr = length(pos.xz);
      if (rr > RIN * 0.9 && rr < ROUT) haze += dt * exp(-abs(pos.y) * 3.0) * pow(RIN / rr, 2.0) * 0.06;
      if (prev.y * pos.y < 0.0) {
        float f = prev.y / (prev.y - pos.y);
        vec3 hit = mix(prev, pos, f);
        float hr = length(hit.xz);
        if (hr > RIN && hr < ROUT) {
          vec4 s = disk(hit, normalize(vel));
          col += (1.0 - alpha) * s.rgb * s.a;
          alpha += (1.0 - alpha) * s.a;
          if (alpha > 0.99) break;
        }
      }
      if (r > BOUND + 1.0 && dot(pos, vel) > 0.0) break;
    }
    col += (1.0 - alpha) * vec3(1.0, 0.7, 0.4) * haze * 1.4;
    if (!captured) col += (1.0 - alpha) * sky(uToWorld * normalize(vel));
    gl_FragColor = vec4(col, 1.0);
  }
`;

export const buildGargantua: SceneBuilder = (ctx) => {
  const hi = ctx.quality === 'high';
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 4000);

  const bhFrame = new THREE.Object3D();
  bhFrame.rotation.set(0.12, 0, -0.08);
  bhFrame.updateMatrixWorld();
  const toWorld = new THREE.Matrix3().setFromMatrix4(bhFrame.matrixWorld);
  const toBH = toWorld.clone().transpose();

  const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, depthBuffer: false });
  rt.texture.colorSpace = THREE.LinearSRGBColorSpace;
  const mat = new THREE.ShaderMaterial({
    vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: frag,
    uniforms: {
      uCam: { value: new THREE.Vector3() },
      uRight: { value: new THREE.Vector3() },
      uUp: { value: new THREE.Vector3() },
      uFwd: { value: new THREE.Vector3() },
      uTan: { value: Math.tan(THREE.MathUtils.degToRad(20)) },
      uAspect: { value: 1 },
      uTime: { value: 10 },
      uSteps: { value: hi ? 260 : 150 },
      uToBH: { value: toBH },
      uToWorld: { value: toWorld },
    },
    depthTest: false,
    depthWrite: false,
  });
  const quad = new FullScreenQuad(mat);
  scene.background = rt.texture;

  // The Endurance passes in front of the disk (not lensed — it is close to the camera).
  const endurance = createEndurance({ broken: [] });
  endurance.group.scale.setScalar(0.08);
  scene.add(endurance.group);
  scene.add(new THREE.AmbientLight('#ffd9a8', 0.6));
  const diskLight = new THREE.PointLight('#ffc070', 400, 0, 1.2);
  diskLight.position.set(0, 0, 0);
  scene.add(diskLight);

  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  const fwd = new THREE.Vector3();
  let scale = 0.5;

  return {
    scene,
    camera,
    exposure: 1.0,
    bloom: { strength: 0.95, radius: 0.7, threshold: 0.9 },
    focus: new THREE.Vector3(0, 0, 0),
    anchors: [
      { at: new THREE.Vector3(0, 3.2, 0), label: 'Lensed disk over the shadow' },
      { at: new THREE.Vector3(11, -0.8, 0), label: 'Accretion disk · Keplerian streaks' },
      { at: new THREE.Vector3(0, -3.4, 0), label: 'Light from beneath the disk' },
    ],
    resize(w, h) {
      scale = hi ? 0.5 : 0.4;
      const pr = Math.min(window.devicePixelRatio || 1, 1.5);
      rt.setSize(Math.max(2, Math.round(w * pr * scale)), Math.max(2, Math.round(h * pr * scale)));
      mat.uniforms.uAspect.value = w / Math.max(1, h);
    },
    preRender(renderer) {
      camera.updateMatrixWorld();
      camera.matrixWorld.extractBasis(right, up, fwd);
      fwd.negate();
      mat.uniforms.uRight.value.copy(right);
      mat.uniforms.uUp.value.copy(up);
      mat.uniforms.uFwd.value.copy(fwd);
      mat.uniforms.uTan.value = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      mat.uniforms.uCam.value.copy(camera.position).applyMatrix3(toBH);
      renderer.setRenderTarget(rt);
      quad.render(renderer);
    },
    update(t, dt, k, free) {
      mat.uniforms.uTime.value += dt;
      // The Endurance crosses the frame low in front of the disk.
      const e = easeInOut(seg(k, 0.05, 0.95));
      endurance.group.position.set(THREE.MathUtils.lerp(-5, 4, e), -1.3 + e * 0.5, 15 - e * 2);
      endurance.group.rotation.set(-1.2, 0.3, 0);
      endurance.ring.rotation.z = t * 0.2;
      if (!free) {
        const a = -0.25 + easeInOut(k) * 0.5;
        const d = THREE.MathUtils.lerp(30, 23, easeInOut(k));
        camera.position.set(Math.sin(a) * d, 1.6 + Math.sin(k * Math.PI) * 0.8, Math.cos(a) * d);
        camera.up.set(0, 1, 0);
        camera.lookAt(0, 0, 0);
        camera.rotation.z += -0.05;
      }
    },
    dispose() {
      rt.dispose();
      quad.dispose();
      mat.dispose();
      scene.background = null;
      disposeScene(scene);
    },
  };
};
