import { Vector2, type DepthTexture } from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

/** Near-cushion softness only: exterior pixels take the unfiltered path. */
export function cabinFocus(depth: DepthTexture, near: number, far: number) {
  const pass = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      tDepth: { value: depth },
      inverseResolution: { value: new Vector2(1, 1) },
      cameraNear: { value: near },
      cameraFar: { value: far },
      // The wheel is roughly 1.2 m away; only the near seat edge belongs
      // outside the focal plane, not the controls and their worn trim.
      focusRange: { value: new Vector2(0.72, 0.98) },
    },
    vertexShader: `varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      #include <packing>
      uniform sampler2D tDiffuse;
      uniform sampler2D tDepth;
      uniform vec2 inverseResolution;
      uniform float cameraNear;
      uniform float cameraFar;
      uniform vec2 focusRange;
      varying vec2 vUv;
      float distanceAt(vec2 uv) {
        return -perspectiveDepthToViewZ(texture2D(tDepth, uv).x, cameraNear, cameraFar);
      }
      void main() {
        vec4 original = texture2D(tDiffuse, vUv);
        float distance = distanceAt(vUv);
        float softness = 1.0 - smoothstep(focusRange.x, focusRange.y, distance);
        if (softness < 0.001) { gl_FragColor = original; return; }
        vec3 sum = original.rgb * 4.0;
        float weights = 4.0;
        for (int y = -1; y <= 1; y++) {
          for (int x = -1; x <= 1; x++) {
            if (x == 0 && y == 0) continue;
            vec2 uv = vUv + vec2(float(x), float(y)) * inverseResolution * 1.4;
            float edge = 1.0 - smoothstep(0.04, 0.16, abs(distanceAt(uv) - distance));
            float weight = (x == 0 || y == 0 ? 2.0 : 1.0) * edge;
            sum += texture2D(tDiffuse, uv).rgb * weight;
            weights += weight;
          }
        }
        gl_FragColor = vec4(mix(original.rgb, sum / weights, softness), original.a);
      }`,
  });
  // ShaderPass clones shader uniforms, but a rendered depth attachment must
  // retain its identity. A cloned, unrendered texture reads as near-plane depth.
  pass.uniforms.tDepth.value = depth;
  return pass;
}
