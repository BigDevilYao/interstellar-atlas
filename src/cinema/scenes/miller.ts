import * as THREE from 'three';
import { NOISE } from '../glsl';
import { cloudDome, disposeScene, easeInOut, handheld, horizonColor, keepAbove, particles, radialGrid, seg, skyDome } from '../lib';
import type { SceneBuilder } from '../types';
import { createRanger } from './parts';

/**
 * MILLER'S PLANET — knee-deep water to every horizon under an overcast sky,
 * and a mountain range that turns out to be a moving wave.
 */

const HEIGHT = /* glsl */ `
  uniform float uTime; uniform float uWaveZ; uniform float uWaveH; uniform float uFar;
  float swell(vec2 p) {
    return sin(p.x * 0.06 + uTime * 0.6) * 0.18 + sin(p.y * 0.09 - uTime * 0.8) * 0.14 + sin((p.x + p.y) * 0.21 + uTime * 1.3) * 0.05
      + (noise2(p * 0.12 + uTime * 0.05) - 0.5) * 0.25;
  }
  float wave(vec2 p) {
    float dz = p.y - uWaveZ;
    // Steep front (toward the camera, +z) and long back slope.
    float prof = dz > 0.0 ? exp(-pow(dz / 38.0, 2.0)) : exp(-pow(dz / 140.0, 2.0));
    float along = 0.85 + 0.15 * sin(p.x * 0.004 + 1.3) + 0.08 * noise2(vec2(p.x * 0.01, 0.0));
    return uWaveH * prof * along;
  }
  // Free Look only (uFar = 1): further wave ridges standing on the horizon like a mountain range.
  float ridge(vec2 p, vec2 c, vec2 n, float h, float w) {
    float d = dot(p - c, n);
    float prof = d > 0.0 ? exp(-pow(d / (w * 0.3), 2.0)) : exp(-pow(d / w, 2.0));
    vec2 t = vec2(-n.y, n.x);
    float along = 0.7 + 0.3 * sin(dot(p, t) * 0.0011 + c.x) + 0.15 * noise2(vec2(dot(p, t) * 0.004, c.y));
    return h * prof * along;
  }
  float farWaves(vec2 p) {
    return ridge(p, vec2(0.0, 5200.0), vec2(0.0, -1.0), 190.0, 700.0)
         + ridge(p, vec2(-5600.0, -1800.0), normalize(vec2(1.0, 0.25)), 160.0, 650.0)
         + ridge(p, vec2(6200.0, 900.0), normalize(vec2(-1.0, -0.1)), 140.0, 600.0);
  }
  float height(vec2 p) { return swell(p) + wave(p) + (uFar > 0.5 ? farWaves(p) : 0.0); }
`;

export const buildMiller: SceneBuilder = (ctx) => {
  const hi = ctx.quality === 'high';
  const free = !!ctx.freeLook;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#a9b4b8', 200, 4200);
  // Free Look: haze fades the endless sea into the sky's horizon colour, so there is no visible seam.
  const fogCol = free ? horizonColor('#c9d0cf').lerp(new THREE.Color('#a9b4b8'), 0.35) : new THREE.Color('#a9b4b8');
  if (free) scene.fog = new THREE.Fog(fogCol, 300, 11000);
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, free ? 20000 : 9000);

  const sunDir = new THREE.Vector3(0.3, 0.55, -0.78).normalize();
  scene.add(skyDome({ top: '#5f6e78', horizon: '#c9d0cf', bottom: '#8a9799', sunDir, sunColor: '#fff8ea', sunSize: 0.9, sunIntensity: 0.6, hazeHeight: 0.22, radius: 8000 }));

  const seaMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uWaveZ: { value: -1600 },
      uWaveH: { value: 0 },
      uSun: { value: sunDir },
      uFog: { value: fogCol },
      uFar: { value: free ? 1 : 0 },
      uFogNear: { value: free ? 300 : 200 },
      uFogFar: { value: free ? 11000 : 4200 },
      uFogMax: { value: free ? 1 : 0.9 },
    },
    vertexShader: /* glsl */ `
      ${NOISE}
      ${HEIGHT}
      varying vec3 vW; varying vec3 vN; varying float vCrest; varying float vD;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        float e = 1.2;
        float h = height(w.xz);
        float hx = height(w.xz + vec2(e, 0.0));
        float hz = height(w.xz + vec2(0.0, e));
        w.y += h;
        vN = normalize(vec3(h - hx, e, h - hz));
        vCrest = smoothstep(uWaveH * 0.55, uWaveH * 0.95, wave(w.xz)) * step(1.0, uWaveH);
        vW = w.xyz;
        vec4 mv = viewMatrix * w;
        vD = -mv.z;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      ${NOISE}
      uniform float uTime; uniform vec3 uSun; uniform vec3 uFog; uniform float uFogNear, uFogFar, uFogMax;
      varying vec3 vW; varying vec3 vN; varying float vCrest; varying float vD;
      void main() {
        vec3 n = normalize(vN + vec3(noise2(vW.xz * 0.9 + uTime) - 0.5, 0.0, noise2(vW.zx * 0.9 - uTime) - 0.5) * 0.12);
        vec3 v = normalize(cameraPosition - vW);
        float fres = pow(1.0 - max(dot(n, v), 0.0), 4.0);
        vec3 deep = vec3(0.025, 0.05, 0.06);
        vec3 shallow = vec3(0.08, 0.12, 0.11);
        vec3 skyC = mix(vec3(0.68, 0.73, 0.74), vec3(0.4, 0.47, 0.52), clamp(reflect(-v, n).y, 0.0, 1.0));
        vec3 col = mix(mix(shallow, deep, smoothstep(0.9, 0.4, n.y)), skyC, 0.08 + fres * 0.8);
        float spec = pow(max(dot(reflect(-uSun, n), v), 0.0), 120.0);
        col += vec3(1.0, 0.98, 0.92) * spec * 1.6;
        // Foam on the crest and on the steep face.
        float foamN = noise2(vW.xz * 0.15 + uTime * 0.3) * noise2(vW.xz * 0.6 - uTime * 0.2);
        float foam = clamp(vCrest * (0.6 + foamN * 1.4) + smoothstep(0.55, 0.2, n.y) * 0.5, 0.0, 1.0);
        col = mix(col, vec3(0.95, 0.97, 0.98), foam);
        float f = smoothstep(uFogNear, uFogFar, vD) * uFogMax;
        gl_FragColor = vec4(mix(col, uFog, f), 1.0);
      }
    `,
  });
  // Cinematic: a dense grid along the view axis. Free Look: a radial sea that follows the camera out to
  // the horizon (heights are computed in world space, so moving the mesh never makes the waves swim).
  const sea = free
    ? new THREE.Mesh(radialGrid(14000, hi ? 150 : 110, hi ? 420 : 300, 0.6, hi ? 70 : 110), seaMat)
    : new THREE.Mesh(new THREE.PlaneGeometry(2600, 2600, hi ? 360 : 220, hi ? 420 : 260), seaMat);
  if (free) {
    sea.frustumCulled = false;
  } else {
    sea.rotation.x = -Math.PI / 2;
    sea.position.z = -1200;
  }
  scene.add(sea);
  const clouds = free ? cloudDome({ light: '#d9dfe0', shadow: '#7d8a92', coverage: 0.32, opacity: 0.85, scale: 1.3, sunDir }) : null;
  if (clouds) scene.add(clouds);

  // The Ranger standing in the water.
  scene.add(new THREE.HemisphereLight('#dfe6ea', '#4a5654', 1.6));
  const sun = new THREE.DirectionalLight('#fff6e8', 1.6);
  sun.position.copy(sunDir).multiplyScalar(50);
  scene.add(sun);
  const ranger = createRanger();
  ranger.scale.setScalar(1.6);
  ranger.position.set(9, 0.9, -34);
  ranger.rotation.set(0.04, 2.5, 0.03);
  scene.add(ranger);

  // Spray along the crest.
  const spray = particles({
    count: (hi ? 1600 : 800) * (free ? 3 : 1),
    seed: 12,
    pos: (_, r) => [(r() - 0.5) * (free ? 9000 : 2400), r() * 30, (r() - 0.5) * 40],
    color: '#eef3f5',
    size: [2, 7],
    drift: new THREE.Vector3(0, 3, 6),
    box: new THREE.Vector3(free ? 9000 : 2400, 30, 40),
    opacity: 0.35,
    additive: true,
  });
  scene.add(spray);

  const look = new THREE.Vector3();
  // JS twin of the sea height (without small noise), for keeping the Free Look camera above the water.
  const seaHeight = (x: number, z: number) => {
    const H = seaMat.uniforms.uWaveH.value as number;
    const dz = z - (seaMat.uniforms.uWaveZ.value as number);
    const prof = dz > 0 ? Math.exp(-((dz / 38) ** 2)) : Math.exp(-((dz / 140) ** 2));
    return 0.6 + H * prof * (0.85 + 0.15 * Math.sin(x * 0.004 + 1.3) + 0.08);
  };

  return {
    scene,
    camera,
    exposure: 0.95,
    bloom: { strength: 0.35, radius: 0.5, threshold: 1.5 },
    focus: new THREE.Vector3(0, 30, -400),
    anchors: [
      { at: new THREE.Vector3(9, 4, -34), label: 'Ranger · knee-deep water' },
      { at: new THREE.Vector3(-120, 140, -700), label: 'The wave · ≈ 1.2 km' },
      { at: new THREE.Vector3(200, 2, -300), label: '1 hour here ≈ 7 years elsewhere' },
    ],
    constrainFreeLook(cam) {
      keepAbove(cam, seaHeight, 2.5);
    },
    update(t, _dt, k, free) {
      const rise = easeInOut(seg(k, 0.1, 1));
      seaMat.uniforms.uTime.value = t;
      seaMat.uniforms.uWaveZ.value = THREE.MathUtils.lerp(-1500, -520, rise);
      seaMat.uniforms.uWaveH.value = THREE.MathUtils.lerp(28, 230, rise);
      (spray.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
      spray.position.set(0, seaMat.uniforms.uWaveH.value * 0.92, seaMat.uniforms.uWaveZ.value + 6);
      (spray.material as THREE.ShaderMaterial).uniforms.uOpacity.value = 0.35 * seg(k, 0.35, 0.7);
      ranger.position.y = 0.9 + Math.sin(t * 0.8) * 0.12;
      if (clouds) (clouds.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
      if (ctx.freeLook) sea.position.set(Math.round(camera.position.x / 16) * 16, 0, Math.round(camera.position.z / 16) * 16);
      if (!free) {
        const e = easeInOut(k);
        camera.position.set(-6 + e * 3, 1.5 + Math.sin(t * 0.9) * 0.08, 6 - e * 4);
        look.set(4 - e * 10, 8 + e * 60, -300);
        camera.lookAt(look);
        handheld(camera, t, 1.4);
      }
    },
    dispose() {
      disposeScene(scene);
    },
  };
};
