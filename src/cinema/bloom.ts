import * as THREE from 'three';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';

/**
 * Lightweight HDR bloom: soft-threshold prefilter → dual-filter downsample chain → tent upsample.
 * Output texture (`texture`) is added in the final grade.
 */
const vert = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

export class Bloom {
  strength = 0.8;
  radius = 0.6;
  threshold = 0.85;
  private levels = 5;
  private down: THREE.WebGLRenderTarget[] = [];
  private up: THREE.WebGLRenderTarget[] = [];
  private quad: FullScreenQuad;
  private prefilter: THREE.ShaderMaterial;
  private downMat: THREE.ShaderMaterial;
  private upMat: THREE.ShaderMaterial;

  constructor() {
    const opts = { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter } as const;
    for (let i = 0; i < this.levels; i++) {
      this.down.push(new THREE.WebGLRenderTarget(4, 4, opts));
      this.up.push(new THREE.WebGLRenderTarget(4, 4, opts));
    }
    this.prefilter = new THREE.ShaderMaterial({
      vertexShader: vert,
      uniforms: { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uThreshold: { value: 0.85 } },
      fragmentShader: /* glsl */ `
        uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uThreshold; varying vec2 vUv;
        vec3 s(vec2 o) { return texture2D(tSrc, vUv + o * uTexel).rgb; }
        void main() {
          vec3 c = (s(vec2(-1.0, -1.0)) + s(vec2(1.0, -1.0)) + s(vec2(-1.0, 1.0)) + s(vec2(1.0, 1.0))) * 0.25;
          c = clamp(c, 0.0, 60.0);
          float br = max(c.r, max(c.g, c.b));
          float knee = uThreshold * 0.5;
          float soft = clamp(br - uThreshold + knee, 0.0, 2.0 * knee);
          soft = soft * soft / (4.0 * knee + 1e-4);
          float w = max(soft, br - uThreshold) / max(br, 1e-4);
          gl_FragColor = vec4(c * w, 1.0);
        }
      `,
      depthTest: false,
      depthWrite: false,
    });
    this.downMat = new THREE.ShaderMaterial({
      vertexShader: vert,
      uniforms: { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() } },
      fragmentShader: /* glsl */ `
        uniform sampler2D tSrc; uniform vec2 uTexel; varying vec2 vUv;
        void main() {
          vec3 c = texture2D(tSrc, vUv).rgb * 4.0;
          c += texture2D(tSrc, vUv + uTexel * vec2(-1.0, -1.0)).rgb;
          c += texture2D(tSrc, vUv + uTexel * vec2(1.0, -1.0)).rgb;
          c += texture2D(tSrc, vUv + uTexel * vec2(-1.0, 1.0)).rgb;
          c += texture2D(tSrc, vUv + uTexel * vec2(1.0, 1.0)).rgb;
          gl_FragColor = vec4(c / 8.0, 1.0);
        }
      `,
      depthTest: false,
      depthWrite: false,
    });
    this.upMat = new THREE.ShaderMaterial({
      vertexShader: vert,
      uniforms: { tSrc: { value: null }, tBase: { value: null }, uTexel: { value: new THREE.Vector2() }, uRadius: { value: 0.6 } },
      fragmentShader: /* glsl */ `
        uniform sampler2D tSrc; uniform sampler2D tBase; uniform vec2 uTexel; uniform float uRadius; varying vec2 vUv;
        void main() {
          vec2 o = uTexel;
          vec3 c = texture2D(tSrc, vUv).rgb * 4.0;
          c += (texture2D(tSrc, vUv + vec2(-o.x, 0.0)).rgb + texture2D(tSrc, vUv + vec2(o.x, 0.0)).rgb + texture2D(tSrc, vUv + vec2(0.0, -o.y)).rgb + texture2D(tSrc, vUv + vec2(0.0, o.y)).rgb) * 2.0;
          c += texture2D(tSrc, vUv + vec2(-o.x, -o.y)).rgb + texture2D(tSrc, vUv + vec2(o.x, -o.y)).rgb + texture2D(tSrc, vUv + vec2(-o.x, o.y)).rgb + texture2D(tSrc, vUv + vec2(o.x, o.y)).rgb;
          c /= 16.0;
          gl_FragColor = vec4(texture2D(tBase, vUv).rgb + c * uRadius, 1.0);
        }
      `,
      depthTest: false,
      depthWrite: false,
    });
    this.quad = new FullScreenQuad(this.prefilter);
  }

  get texture(): THREE.Texture {
    return this.up[0].texture;
  }

  setSize(w: number, h: number) {
    let cw = Math.max(1, Math.round(w / 2));
    let ch = Math.max(1, Math.round(h / 2));
    for (let i = 0; i < this.levels; i++) {
      this.down[i].setSize(cw, ch);
      this.up[i].setSize(cw, ch);
      cw = Math.max(1, Math.round(cw / 2));
      ch = Math.max(1, Math.round(ch / 2));
    }
  }

  render(renderer: THREE.WebGLRenderer, src: THREE.Texture, srcW: number, srcH: number) {
    // Prefilter into the first (half-resolution) level.
    this.prefilter.uniforms.tSrc.value = src;
    this.prefilter.uniforms.uTexel.value.set(1 / srcW, 1 / srcH);
    this.prefilter.uniforms.uThreshold.value = this.threshold;
    this.quad.material = this.prefilter;
    renderer.setRenderTarget(this.down[0]);
    this.quad.render(renderer);
    // Downsample.
    this.quad.material = this.downMat;
    for (let i = 1; i < this.levels; i++) {
      const s = this.down[i - 1];
      this.downMat.uniforms.tSrc.value = s.texture;
      this.downMat.uniforms.uTexel.value.set(1 / s.width, 1 / s.height);
      renderer.setRenderTarget(this.down[i]);
      this.quad.render(renderer);
    }
    // Upsample and accumulate.
    this.quad.material = this.upMat;
    this.upMat.uniforms.uRadius.value = 0.4 + this.radius;
    let prev = this.down[this.levels - 1];
    for (let i = this.levels - 2; i >= 0; i--) {
      this.upMat.uniforms.tSrc.value = prev.texture;
      this.upMat.uniforms.tBase.value = this.down[i].texture;
      this.upMat.uniforms.uTexel.value.set(1 / prev.width, 1 / prev.height);
      renderer.setRenderTarget(this.up[i]);
      this.quad.render(renderer);
      prev = this.up[i];
    }
  }

  dispose() {
    this.down.forEach((r) => r.dispose());
    this.up.forEach((r) => r.dispose());
    this.prefilter.dispose();
    this.downMat.dispose();
    this.upMat.dispose();
    this.quad.dispose();
  }
}
