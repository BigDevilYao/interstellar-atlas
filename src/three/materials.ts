import * as THREE from 'three';

export const COLORS = {
  white: new THREE.Color('#ece8e0'),
  gray: new THREE.Color('#8d8a85'),
  gold: new THREE.Color('#f0c98f'),
  goldDeep: new THREE.Color('#d9a35c'),
  blue: new THREE.Color('#a9c3e6'),
} as const;

export const RGB = {
  white: [0.925, 0.91, 0.88] as [number, number, number],
  gray: [0.62, 0.61, 0.6] as [number, number, number],
  gold: [0.94, 0.79, 0.56] as [number, number, number],
  blue: [0.66, 0.76, 0.9] as [number, number, number],
};

/** Hairline material with per-vertex RGBA. */
export function hairlineMaterial(opacity = 1): THREE.LineBasicMaterial {
  return new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity,
    depthWrite: true,
    depthTest: true,
  });
}

/**
 * Soft glowing point sprites. Attributes: position, aColor (rgb), aSize (px), aSeed.
 * uTwinkle > 0 makes points shimmer (starfield).
 */
export function glowPointsMaterial(twinkle = 0): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2) },
      uTwinkle: { value: twinkle },
      uOpacity: { value: 1 },
    },
    vertexShader: /* glsl */ `
      attribute vec3 aColor;
      attribute float aSize;
      attribute float aSeed;
      uniform float uTime;
      uniform float uPixelRatio;
      uniform float uTwinkle;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vColor = aColor;
        float tw = 1.0 - uTwinkle * (0.5 + 0.5 * sin(uTime * (0.6 + aSeed * 1.7) + aSeed * 40.0));
        vAlpha = tw;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * uPixelRatio;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vAlpha;
      uniform float uOpacity;
      void main() {
        vec2 d = gl_PointCoord - 0.5;
        float r = length(d) * 2.0;
        float core = smoothstep(0.42, 0.0, r);
        float glow = exp(-r * r * 5.0) * 0.55;
        float a = (core + glow) * vAlpha * uOpacity;
        if (a < 0.01) discard;
        gl_FragColor = vec4(vColor * a, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
  });
}
