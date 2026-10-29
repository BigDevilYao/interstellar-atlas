import * as THREE from 'three';
import { NOISE } from './glsl';
import type { TransitionKind } from './types';

/**
 * CINEMATIC TRANSITIONS
 * Every threshold blends the outgoing scene (A) into the incoming one (B) with its own
 * spatial transformation — never a generic fade.
 */
export const TRANSITION_INDEX: Record<TransitionKind, number> = {
  dust: 0, // bedroom → farm: dust settles and dissolves the frame
  sweep: 1, // farm → NASA: a floodlight sweep reveals the hidden facility
  ascent: 2, // NASA → orbit: vertical motion blur, white-out, scale change
  timelapse: 3, // Endurance → Saturn: two years compressed into exposure flicker
  lens: 4, // Saturn → wormhole: a refracting sphere opens from the centre
  tunnel: 5, // wormhole → Miller: radial warp through the throat
  stutter: 6, // Miller → Mann: time dilation — frames hold and tick
  roll: 7, // Mann → docking: the frame rolls and an iris aligns
  swirl: 8, // docking → Gargantua: gravitational swirl
  horizon: 9, // Gargantua → Tesseract: the shadow expands, a lattice flashes
  lattice: 10, // Tesseract → bedroom: the image reassembles from repeated cells
  signal: 11, // bedroom → Cooper Station: data pulses and glitch scan
  departure: 12, // Cooper Station → Edmunds: light streaks of departure
};

export function createTransitionMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      tA: { value: null },
      tB: { value: null },
      uP: { value: 0 },
      uTime: { value: 0 },
      uKind: { value: 0 },
      uAspect: { value: 1 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      ${NOISE}
      uniform sampler2D tA; uniform sampler2D tB;
      uniform float uP, uTime, uAspect; uniform int uKind;
      varying vec2 vUv;

      vec3 A(vec2 uv) { return texture2D(tA, clamp(uv, 0.001, 0.999)).rgb; }
      vec3 B(vec2 uv) { return texture2D(tB, clamp(uv, 0.001, 0.999)).rgb; }
      float ease(float x) { return x * x * (3.0 - 2.0 * x); }
      vec2 rot(vec2 v, float a) { float c = cos(a), s = sin(a); return vec2(c * v.x - s * v.y, s * v.x + c * v.y); }

      void main() {
        vec2 uv = vUv;
        float p = clamp(uP, 0.0, 1.0);
        vec2 c = uv - 0.5; c.x *= uAspect;
        float r = length(c);
        vec3 col;

        if (uKind == 0) {
          // DUST — noise dissolve with glowing golden dust at the edge.
          float n = fbm2(uv * vec2(uAspect, 1.0) * 6.0 + vec2(0.0, uTime * 0.05));
          n = mix(n, uv.y, 0.35);
          float e = p * 1.3 - 0.15;
          float m = smoothstep(e - 0.06, e + 0.06, n);
          float edge = (1.0 - abs(m - 0.5) * 2.0);
          vec2 drift = vec2(0.0, -p * 0.04);
          col = mix(B(uv), A(uv + drift * m), m);
          col += vec3(1.0, 0.72, 0.38) * pow(edge, 3.0) * 2.5;
        } else if (uKind == 1) {
          // SWEEP — a floodlight bar crosses the frame.
          float x = p * 1.4 - 0.2;
          float m = smoothstep(x - 0.02, x + 0.02, uv.x);
          float bar = exp(-pow((uv.x - x) * 18.0, 2.0));
          col = mix(B(uv), A(uv) * (1.0 - p * 0.6), m) + vec3(1.0, 0.97, 0.9) * bar * 2.2;
        } else if (uKind == 2) {
          // ASCENT — vertical streaking upward, white-out, the next scale appears.
          vec3 acc = vec3(0.0);
          for (int i = 0; i < 12; i++) acc += A(uv + vec2(0.0, -float(i) * 0.012 * p * p));
          acc /= 12.0;
          float flash = smoothstep(0.35, 0.55, p) * smoothstep(0.85, 0.55, p);
          vec2 zuv = (uv - 0.5) / (1.0 + (1.0 - p) * 0.6) + 0.5;
          col = mix(acc, B(zuv), smoothstep(0.45, 0.75, p)) + vec3(1.0, 0.95, 0.88) * flash * 2.5;
        } else if (uKind == 3) {
          // TIMELAPSE — exposure flicker as two years compress.
          float flick = step(0.5, fract(p * 9.0 + hash11(floor(p * 9.0)) * 0.3));
          float m = smoothstep(0.2, 0.85, p);
          float mm = clamp(m + (flick - 0.5) * 0.35 * sin(p * 3.1416), 0.0, 1.0);
          col = mix(A(uv), B(uv), mm) * (1.0 + 0.6 * sin(p * 3.1416) * flick);
        } else if (uKind == 4) {
          // LENS — a refracting sphere grows from the centre, showing the next scene inside.
          float R = ease(p) * 1.25;
          float inside = smoothstep(R, R - 0.01, r);
          vec2 refr = uv + normalize(c + 1e-5) * (1.0 - r / max(R, 1e-3)) * -0.12 * (1.0 - p);
          vec3 lensed = B(mix(refr, uv, p));
          float ring = exp(-pow((r - R) * 60.0, 2.0));
          vec2 push = uv - normalize(c + 1e-5) * 0.03 * exp(-pow((r - R) * 8.0, 2.0));
          col = mix(A(push), lensed, inside) + vec3(1.0, 0.9, 0.75) * ring * 1.6;
        } else if (uKind == 5) {
          // TUNNEL — radial zoom and swirl through the throat.
          float k = sin(p * 3.1416);
          vec2 d = uv - 0.5;
          vec3 acc = vec3(0.0);
          for (int i = 0; i < 14; i++) {
            float s = 1.0 - float(i) * 0.035 * k;
            vec2 q = rot(d * s, k * 0.9 * (1.0 - r)) + 0.5;
            acc += mix(A(q), B(q), smoothstep(0.4, 0.62, p));
          }
          col = acc / 14.0;
          // Streaks of light racing outward along the throat, and a soft core glow.
          float ang = atan(d.y, d.x);
          float lane = floor((ang + 3.1416) * 18.0);
          float seed = hash11(lane);
          float along = fract(r * 2.5 - p * (2.0 + seed * 3.0) + seed);
          float streak = smoothstep(0.92, 1.0, seed + 0.06) * smoothstep(0.0, 0.3, along) * smoothstep(0.65, 0.3, along)
            * smoothstep(0.08, 0.45, r);
          col += vec3(0.75, 0.85, 1.0) * streak * k * 0.7;
          col += vec3(1.0, 0.92, 0.8) * k * k * smoothstep(0.35, 0.0, r) * 0.55;
        } else if (uKind == 6) {
          // STUTTER — time dilation: the image holds, ticks, splits in colour.
          float steps = floor(p * 8.0) / 8.0;
          float tick = fract(p * 8.0);
          float jolt = smoothstep(0.0, 0.08, tick) * smoothstep(0.25, 0.08, tick);
          vec2 off = vec2(jolt * 0.01, 0.0);
          float m = smoothstep(0.35, 0.8, steps);
          vec3 a = vec3(A(uv + off).r, A(uv).g, A(uv - off).b);
          vec3 b = vec3(B(uv + off).r, B(uv).g, B(uv - off).b);
          col = mix(a, b, m) * (1.0 + jolt * 0.8);
        } else if (uKind == 7) {
          // ROLL — the frame rolls with the spinning ring; an iris aligns on the port.
          float ang = (1.0 - ease(p)) * 2.4;
          vec2 q = rot(c, ang); q.x /= uAspect; q += 0.5;
          vec2 qa = rot(c, -ease(p) * 1.6); qa.x /= uAspect; qa += 0.5;
          float iris = smoothstep(p * 1.1, p * 1.1 - 0.02, r);
          col = mix(A(qa), B(q), iris);
          col += vec3(1.0, 0.85, 0.6) * exp(-pow((r - p * 1.1) * 70.0, 2.0)) * 1.5;
        } else if (uKind == 8) {
          // SWIRL — light bends around the mass.
          float k = sin(p * 3.1416);
          vec2 q = rot(c, k * 3.0 * exp(-r * 2.5)); q.x /= uAspect; q += 0.5;
          col = mix(A(q), B(q), smoothstep(0.35, 0.7, p));
          col *= 1.0 - k * 0.6 * smoothstep(0.25, 0.0, r);
        } else if (uKind == 9) {
          // HORIZON — the shadow expands to fill the frame, then a lattice flashes into the Tesseract.
          float R = ease(clamp(p * 1.6, 0.0, 1.0)) * 1.3;
          float dark = smoothstep(R, R - 0.03, r);
          vec3 a = A(uv) * (1.0 - dark);
          a += vec3(1.0, 0.8, 0.5) * exp(-pow((r - R) * 40.0, 2.0)) * 1.4;
          vec2 g = abs(fract(c * 14.0 * (1.0 + p * 2.0)) - 0.5);
          float grid = smoothstep(0.48, 0.5, max(g.x, g.y)) * smoothstep(0.5, 0.7, p) * smoothstep(1.0, 0.75, p);
          col = mix(a, B(uv), smoothstep(0.65, 0.95, p)) + vec3(1.0, 0.78, 0.45) * grid * 1.8;
        } else if (uKind == 10) {
          // LATTICE — repeated cells reassemble the image.
          vec2 cell = floor(uv * vec2(12.0 * uAspect, 12.0));
          float delay = hash21(cell) * 0.6;
          float m = smoothstep(delay, delay + 0.3, p);
          vec2 f = fract(uv * vec2(12.0 * uAspect, 12.0));
          float frame = 1.0 - smoothstep(0.0, 0.05, min(min(f.x, f.y), min(1.0 - f.x, 1.0 - f.y)));
          col = mix(A(uv), B(uv), m) + vec3(1.0, 0.78, 0.45) * frame * sin(m * 3.1416) * 1.2;
        } else if (uKind == 11) {
          // SIGNAL — data pulses, scan glitch, then the new world.
          float band = floor(uv.y * 60.0);
          float g = step(0.75, hash21(vec2(band, floor(uTime * 20.0)))) * sin(p * 3.1416);
          vec2 q = uv + vec2(g * (hash11(band) - 0.5) * 0.08, 0.0);
          float scan = exp(-pow((uv.y - (1.0 - p * 1.2 + 0.1)) * 30.0, 2.0));
          float m = smoothstep(0.3, 0.75, p);
          col = mix(A(q), B(q), m) + vec3(0.95, 0.75, 0.42) * scan * 1.8;
          col += vec3(0.6, 0.75, 1.0) * g * 0.25;
        } else {
          // DEPARTURE — light streaks outward as the ship leaves.
          vec2 d = uv - 0.5;
          vec3 acc = vec3(0.0);
          float k = sin(p * 3.1416);
          for (int i = 0; i < 12; i++) acc += mix(A(0.5 + d * (1.0 - float(i) * 0.02 * k)), B(0.5 + d * (1.0 + float(i) * 0.01 * k)), smoothstep(0.35, 0.7, p));
          col = acc / 12.0 + vec3(1.0, 0.9, 0.75) * k * 0.4;
        }
        gl_FragColor = vec4(col, 1.0);
      }
    `,
    depthTest: false,
    depthWrite: false,
  });
}
