'use client';

import type { MeshStandardMaterial } from 'three';

const finish: MeshStandardMaterial['onBeforeCompile'] = (shader) => {
  shader.vertexShader = 'varying vec3 vSurfacePoint;\n' + shader.vertexShader;
  shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
    #include <begin_vertex>
    // Model-local, not world-space: the texture travels with a passing building.
    vSurfacePoint = position;
    #ifdef USE_INSTANCING
      vSurfacePoint = (instanceMatrix * vec4(position, 1.0)).xyz;
    #endif
  `);
  shader.fragmentShader = `varying vec3 vSurfacePoint;
    float surfaceHash(vec3 p) {
      p = fract(p * 0.1031);
      p += dot(p, p.yzx + 33.33);
      return fract((p.x + p.y) * p.z);
    }
  ` + shader.fragmentShader;
  shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
    #include <color_fragment>
    vec3 p = vSurfacePoint;
    // Stable broad voxel patina; fade fine aggregate before it becomes subpixel.
    float broad = surfaceHash(floor(p * 5.0));
    float grain = surfaceHash(floor(p * 48.0));
    float broadAA = 1.0 - smoothstep(0.08, 0.28, length(fwidth(p)));
    float grainAA = 1.0 - smoothstep(0.008, 0.035, length(fwidth(p)));
    diffuseColor.rgb *= 1.0 + (broad - 0.5) * 0.10 * broadAA
      + (grain - 0.5) * 0.07 * grainAA;
  `);
};

/** Instancing stays intact: surface richness costs no extra geometry/draw calls. */
export default function ExteriorMaterial({ glow = false }: { glow?: boolean }) {
  return <meshStandardMaterial
    roughness={glow ? 0.55 : 0.94}
    emissive={glow ? '#ffc778' : '#000000'}
    emissiveIntensity={glow ? 0.35 : 0}
    onBeforeCompile={glow ? undefined : finish}
    customProgramCacheKey={() => `reporoad-exterior-patina-v1-${glow}`}
  />;
}
