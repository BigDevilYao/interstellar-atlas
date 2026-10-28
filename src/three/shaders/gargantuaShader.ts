import * as THREE from 'three';

/**
 * GARGANTUA SHADER
 * A camera-facing quad running a per-pixel ray marcher. Each pixel's light ray is bent with the
 * classic Schwarzschild photon-orbit approximation (a = -1.5·h²·r̂ / r⁴, units of rs = 1),
 * so the accretion disk is lensed over and under the shadow like the film's black hole.
 * Rays that cross the disk plane accumulate emission; rays that fall below r = 1 are captured.
 */

/** World units per Schwarzschild radius. Shadow apparent radius ≈ 2.6 rs ≈ 0.135 R. */
export const RS = 0.52;
export const BOUND = 13.0;

export const vertexShader = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

export const fragmentShader = /* glsl */ `
  precision highp float;
  varying vec3 vWorld;
  uniform float uTime;
  uniform vec3  uCamBH;
  uniform mat3  uWorldToBH;
  uniform float uSteps;
  uniform float uIntensity;

  const float RIN = 2.6;
  const float ROUT = 9.2;
  const float BOUND = ${BOUND.toFixed(1)};

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.11, 0.17, 0.13));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float vnoise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
          mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
          mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p) {
    float a = 0.5, s = 0.0;
    for (int i = 0; i < 4; i++) {
      s += a * vnoise(p);
      p = p * 2.07 + vec3(1.7, 9.2, 3.1);
      a *= 0.5;
    }
    return s;
  }

  vec4 shadeDisk(vec3 hit, vec3 dir) {
    float r = length(hit.xz);
    float phi = atan(hit.z, hit.x);
    // Keplerian differential rotation: inner rings orbit faster.
    float omega = 2.4 * pow(r, -1.5);
    float ang = phi + uTime * omega;
    vec3 q = vec3(cos(ang) * 1.6, sin(ang) * 1.6, r * 2.4);
    float n  = fbm(q);
    float n2 = vnoise(vec3(cos(ang) * 4.0, sin(ang) * 4.0, r * 11.0));
    float streak = 0.45 + 0.85 * n + 0.3 * n2;

    float inner = smoothstep(RIN, RIN + 0.5, r);
    float outer = 1.0 - smoothstep(ROUT * 0.5, ROUT, r);
    float fall  = pow(RIN / r, 1.3);
    float dens  = inner * outer * streak;

    float t = clamp((r - RIN) / (ROUT - RIN), 0.0, 1.0);
    vec3 c = mix(vec3(1.0, 0.94, 0.84), vec3(1.0, 0.72, 0.40), smoothstep(0.0, 0.3, t));
    c = mix(c, vec3(0.62, 0.31, 0.13), smoothstep(0.3, 1.0, t));

    // A restrained Doppler asymmetry.
    vec3 vel = normalize(vec3(-hit.z, 0.0, hit.x));
    float dop = 1.0 + 0.28 * dot(vel, -dir) * sqrt(RIN / r);

    float I = fall * dens * dop * uIntensity * 1.9;
    float a = clamp(dens * fall * 1.05, 0.0, 0.96);
    return vec4(c * I, a);
  }

  void main() {
    vec3 rd = normalize(uWorldToBH * normalize(vWorld - cameraPosition));
    vec3 ro = uCamBH;

    // Impact parameter: rays that pass far away are trivially empty.
    float b = length(cross(ro, rd));
    if (b > BOUND) discard;

    // Start the march on the bounding sphere.
    float tb = dot(ro, rd);
    float tc = dot(ro, ro) - BOUND * BOUND;
    float disc = tb * tb - tc;
    if (disc < 0.0) discard;
    float t0 = -tb - sqrt(disc);
    vec3 pos = ro + rd * max(t0, 0.0);
    vec3 vel = rd;
    vec3 hv = cross(pos, vel);
    float h2 = dot(hv, hv);

    vec3 col = vec3(0.0);
    float alpha = 0.0;
    float haze = 0.0;
    bool captured = false;

    for (int i = 0; i < 260; i++) {
      if (float(i) >= uSteps) break;
      float r2 = dot(pos, pos);
      float r = sqrt(r2);
      if (r < 1.0) { captured = true; break; }
      float dt = clamp(0.032 * r2 * 0.5, 0.03, 0.55);
      vec3 acc = -1.5 * h2 * pos / (r2 * r2 * r);
      vec3 prev = pos;
      vel += acc * dt;
      pos += vel * dt;

      // Thin volumetric haze around the disk plane.
      float rr = length(pos.xz);
      if (rr > RIN * 0.9 && rr < ROUT) {
        haze += dt * exp(-abs(pos.y) * 3.5) * pow(RIN / rr, 2.2) * 0.05;
      }

      if (prev.y * pos.y < 0.0) {
        float f = prev.y / (prev.y - pos.y);
        vec3 hit = mix(prev, pos, f);
        float hr = length(hit.xz);
        if (hr > RIN && hr < ROUT) {
          vec4 s = shadeDisk(hit, normalize(vel));
          col += (1.0 - alpha) * s.rgb * s.a;
          alpha += (1.0 - alpha) * s.a;
          if (alpha > 0.985) break;
        }
      }
      if (r > BOUND + 0.5 && dot(pos, vel) > 0.0) break;
    }

    vec3 gold = vec3(1.0, 0.72, 0.42);
    col += (1.0 - alpha) * gold * haze * uIntensity;

    // Faint atmospheric halo outside the photon ring.
    float halo = exp(-max(b - 2.6, 0.0) * 0.5) * 0.06 * uIntensity;
    col += (1.0 - alpha) * gold * halo;
    float a = alpha + (1.0 - alpha) * (halo * 0.6 + haze * 0.35);

    if (captured) a = 1.0;

    // Soft tone curve keeps the white-hot inner edge without clipping harshly.
    col = vec3(1.0) - exp(-col * 1.35);

    float edge = 1.0 - smoothstep(BOUND - 2.5, BOUND, b);
    col *= edge;
    a *= edge;
    if (a < 0.002) discard;
    gl_FragColor = vec4(col, a);
  }
`;


/** Disk-plane orientation of Gargantua: seen ~8° from above with a slight roll, as in the reference. */
export const DISK_TILT: [number, number, number] = [0.14, 0, -0.06];

export function createGargantuaMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 12.0 },
      uCamBH: { value: new THREE.Vector3(0, 0, 60) },
      uWorldToBH: { value: new THREE.Matrix3() },
      uSteps: { value: 220 },
      uIntensity: { value: 1 },
    },
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
  });
}

const tmpQ = new THREE.Quaternion();
const tmpM3 = new THREE.Matrix3();
const tmpV = new THREE.Vector3();
const tmpC = new THREE.Vector3();

/**
 * Per-frame update: billboard the quad toward the camera and pass the black-hole frame
 * (the tilted disk plane, given by `frame`) into the shader.
 */
export function updateGargantua(
  material: THREE.ShaderMaterial,
  quad: THREE.Object3D,
  frame: THREE.Object3D,
  camera: THREE.Camera,
): void {
  const parent = quad.parent;
  if (parent) {
    parent.getWorldQuaternion(tmpQ).invert();
    quad.quaternion.copy(tmpQ.multiply(camera.quaternion));
  } else {
    quad.quaternion.copy(camera.quaternion);
  }
  frame.updateWorldMatrix(true, false);
  tmpM3.setFromMatrix4(frame.matrixWorld).transpose();
  material.uniforms.uWorldToBH.value.copy(tmpM3);
  frame.getWorldPosition(tmpC);
  camera.getWorldPosition(tmpV);
  tmpV.sub(tmpC).applyMatrix3(tmpM3).multiplyScalar(1 / RS);
  material.uniforms.uCamBH.value.copy(tmpV);
}
