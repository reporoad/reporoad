'use client';
import * as THREE from 'three';
import { useCallback, useLayoutEffect } from 'react';
import { useLoader } from '@react-three/fiber';

// Object-space patina stays attached to the cabin. Derivative filtering fades
// subpixel grain, rather than introducing animated noise or texture shimmer.
const compile: THREE.MeshStandardMaterial['onBeforeCompile'] = (shader) => {
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <roughnessmap_fragment>',
    `#include <roughnessmap_fragment>
    #ifndef CABIN_FABRIC
      // Pigment wear changes the finish as well as its colour. Keep this
      // subtle and surface-attached; no animated noise or glossy fabric.
      roughnessFactor = clamp(roughnessFactor
        + (0.6 - paintedDetail) * 0.16 - edgeWear * 0.08
        + (paintCells - 0.5) * 0.12 * paintCellFilter, 0.55, 1.0);
      // Worn varnish catches broader highlights than the painted fascia;
      // mixed cabin batches retain their per-face wood classification.
      roughnessFactor = mix(roughnessFactor, 0.66 + (0.6 - paintedDetail) * 0.16, vCabinWood);
    #endif`,
  );
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <metalnessmap_fragment>',
    `#include <metalnessmap_fragment>
      metalnessFactor *= 1.0 - vCabinWood;`,
  );
  shader.vertexShader =
    `varying vec3 vCabinPoint;
    varying float vCabinWood;
    varying float vCabinEdge;
    #ifdef CABIN_SURFACES
      attribute float cabinWood;
    #endif
  ` + shader.vertexShader;
  shader.vertexShader = shader.vertexShader.replace(
    '#include <begin_vertex>',
    `
    #include <begin_vertex>
    vec4 cabinPoint = vec4(position, 1.0);
    #ifdef USE_INSTANCING
      cabinPoint = instanceMatrix * cabinPoint;
    #endif
    vCabinPoint = cabinPoint.xyz;
    vec3 bevelNormal = abs(normalize(normal));
    vCabinEdge = 1.0 - max(bevelNormal.x, max(bevelNormal.y, bevelNormal.z));
    #ifdef CABIN_SURFACES
      vCabinWood = cabinWood;
    #elif defined(CABIN_WOOD)
      vCabinWood = 1.0;
    #else
      vCabinWood = 0.0;
    #endif
  `,
  );
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <normal_fragment_maps>',
    `
    #include <normal_fragment_maps>
      // Fade at bevels, where dominant-axis projection changes direction.
      float reliefMask = smoothstep(0.8, 0.98, max(face.x, max(face.y, face.z)));
    #ifdef CABIN_FABRIC
      // Raised woven yarn and a shallow sewn channel, in metres. The broad
      // filtered pattern avoids high-frequency normal noise at driving size.
      float reliefHeight = (fleck * 0.0006 - sewnChannel * 0.0003
        + (wovenDetail - 0.6) * 0.0012) * aa;
    #else
      // Surface-gradient relief uses the already mip-filtered patina sample.
      float reliefHeight = paintedDetail * 0.0025 * mix(0.4, 0.3, vCabinWood);
    #endif
      vec3 reliefDx = dFdx(-vViewPosition);
      vec3 reliefDy = dFdy(-vViewPosition);
      vec3 reliefR1 = cross(reliefDy, normal);
      vec3 reliefR2 = cross(normal, reliefDx);
      float reliefDet = dot(reliefDx, reliefR1);
      vec3 reliefGradient = sign(reliefDet) *
        (dFdx(reliefHeight) * reliefR1 + dFdy(reliefHeight) * reliefR2);
      vec3 reliefNormal = normalize(max(abs(reliefDet), 1e-12) * normal - reliefGradient);
      normal = normalize(mix(normal, reliefNormal, reliefMask));
    `,
  );
  shader.fragmentShader =
    `
    varying vec3 vCabinPoint;
    varying float vCabinWood;
    varying float vCabinEdge;
    uniform sampler2D cabinDetail;
    float cabinHash(vec3 p) {
      p = fract(p * 0.1031);
      p += dot(p, p.yzx + 33.33);
      return fract((p.x + p.y) * p.z);
    }
    float cabinNoise(vec3 p) {
      vec3 cell = floor(p), f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix(cabinHash(cell), cabinHash(cell + vec3(1,0,0)), f.x),
        mix(cabinHash(cell + vec3(0,1,0)), cabinHash(cell + vec3(1,1,0)), f.x), f.y),
        mix(mix(cabinHash(cell + vec3(0,0,1)), cabinHash(cell + vec3(1,0,1)), f.x),
        mix(cabinHash(cell + vec3(0,1,1)), cabinHash(cell + vec3(1,1,1)), f.x), f.y), f.z);
    }
  ` + shader.fragmentShader;
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <color_fragment>',
    `
    #include <color_fragment>
    vec3 p = vCabinPoint;
    float broad = cabinNoise(p * vec3(10.0, 16.0, 13.0));
    float grain = cabinNoise(p * 180.0);
    float aa = 1.0 - smoothstep(0.002, 0.012, length(fwidth(p)));
    float tiles = cabinHash(floor(p * vec3(32.0, 48.0, 32.0)));
    float wear = cabinHash(floor(p * vec3(17.0, 35.0, 22.0)));
    float surfaceNoiseGain = mix(1.0, 0.3, vCabinWood);
    #ifdef CABIN_FABRIC
      float grainStrength = 0.055;
    #else
      float grainStrength = mix(0.07, 0.02, vCabinWood);
    #endif
    diffuseColor.rgb *= 1.0 + (-0.10 + broad * 0.16 + (tiles - 0.5) * 0.05 + (grain - 0.5) * grainStrength * aa) * surfaceNoiseGain;
    diffuseColor.rgb += vec3(0.025, 0.021, 0.012) * smoothstep(0.82, 0.97, wear) * surfaceNoiseGain;
    #ifdef CABIN_FABRIC
      vec3 face = abs(normalize(cross(dFdx(p), dFdy(p))));
      vec2 clothUv = face.y > 0.5 ? p.xz : (face.z > 0.5 ? p.xy : p.zy);
      // Real yarn variation beneath the larger voxel weave. The same
      // object-space scale is used on cushions and their side bolsters.
      float wovenDetail = texture2D(cabinDetail, clothUv / 0.35).r;
      // Broad, row-aligned woven dashes match the reference upholstery;
      // the finer old speckles read as scattered dust at driving resolution.
      vec2 stitch = (clothUv - vec2(0.0, 0.035)) * vec2(19.0, 25.0);
      // Slightly irregular row starts break the checkerboard repetition while
      // staying fixed to the upholstery, including while the car moves.
      float rowOffset = cabinHash(vec3(floor(stitch.y), 7.0, 2.0));
      stitch.x += rowOffset * 0.8;
      vec2 cellUv = fract(stitch);
      float yarn = cabinHash(vec3(floor(stitch), 3.0));
      float wovenRow = 1.0 - step(0.5, mod(floor(stitch.y), 3.0));
      float yarnPresence = wovenRow * (0.45 + step(0.22, yarn) * 0.40)
        + (1.0 - wovenRow) * step(0.72, yarn) * 0.6;
      float yarnEnd = 0.49 + yarn * 0.18;
      float fleck = yarnPresence * smoothstep(0.07, 0.16, cellUv.x) * (1.0-smoothstep(yarnEnd,yarnEnd+0.10,cellUv.x)) * smoothstep(0.05,0.12,cellUv.y) * (1.0-smoothstep(0.38,0.52,cellUv.y));
      float weave = (wovenDetail - 0.6) * 0.45;
      diffuseColor.rgb *= 0.74 + fleck * 0.85 * (0.25 + face.y * 0.75) + weave;
      float clothPatch = mix(cabinNoise(vec3(clothUv * vec2(35.0, 40.0), 8.0)),
        cabinHash(vec3(floor(clothUv * vec2(35.0, 40.0)), 8.0)), 0.85 * aa);
      // Keep dyed-cloth variation subordinate to the larger woven yarn;
      // strong independent patches obscure that structure at driving size.
      diffuseColor.rgb *= 0.86 + clothPatch * 0.28;
      // Broad, block-woven seams follow the cushion edges.
      float sewnChannel = (1.0 - smoothstep(0.012, 0.038, abs(abs(p.x) - 0.23))) * max(face.y, face.z);
      float threadPhase = fract(clothUv.y * 42.0);
      float thread = smoothstep(0.12, 0.22, threadPhase) * (1.0 - smoothstep(0.65, 0.75, threadPhase));
      diffuseColor.rgb *= 1.0 + sewnChannel * (-0.12 + thread * 1.80) * aa;
      float threadTint = clamp(fleck + sewnChannel * thread * 0.65, 0.0, 1.0);
      // Straw yarn on olive cloth: let the window light supply its warmth,
      // rather than multiplying in a red cast on every highlighted stitch.
      diffuseColor.rgb *= mix(vec3(1.0), vec3(1.08, 1.0, 0.78), threadTint);
    #else
      vec3 face = abs(normalize(cross(dFdx(p), dFdy(p))));
      vec2 detailUv = face.y > 0.5 ? p.xz : (face.z > 0.5 ? p.xy : p.zy);
      // Finer paint patina keeps the large glovebox face from looking like
      // camouflage. Mip filtering preserves the finish in the moving view.
      detailUv *= mix(4.0, 1.0, vCabinWood);
      float paintedDetail = texture2D(cabinDetail, detailUv).r;
      // Brown timber gets long, broken fibres; olive paint and grey rubber
      // retain the quieter isotropic patina. All grain is surface-attached.
      float timber = vCabinWood;
      diffuseColor.rgb *= 1.0 + (paintedDetail - 0.64) * mix(0.5, 0.6, timber);
      // Broad horizontal variations read as worn paint, not granular stone.
      float paintBands = cabinNoise(p * vec3(4.0, 42.0, 8.0));
      diffuseColor.rgb *= 1.0 + (paintBands - 0.5) * 0.10 * (1.0 - timber);
      float paintCells = cabinHash(floor(p * vec3(16.0, 24.0, 16.0)));
      float paintCellFilter = 1.0 - smoothstep(0.015, 0.05, length(fwidth(p)));
      diffuseColor.rgb *= 1.0 + (paintCells - 0.5) * 0.32 * paintCellFilter * (1.0 - timber);
      // Small, surface-aligned paint patches on horizontal tops retain the
      // voxel finish without turning the broad front fascia into noisy stone.
      float topPaint = cabinHash(floor(p * vec3(32.0, 32.0, 32.0)));
      float topPaintFilter = 1.0 - smoothstep(0.015, 0.05, length(fwidth(p)));
      diffuseColor.rgb *= 1.0 + (topPaint - 0.5) * CABIN_TOP_PAINT_GAIN
        * smoothstep(0.8, 0.98, face.y) * (1.0 - timber) * topPaintFilter;
      float fibre = cabinNoise(p * vec3(6.0, 180.0, 35.0));
      float pores = cabinHash(floor(p * vec3(26.0, 240.0, 45.0)));
      diffuseColor.rgb *= mix(vec3(1.0), vec3(1.04, 1.0, 0.94) * (0.98 + fibre * 0.04 + (pores-0.5)*0.015*aa), timber);
      // Broad, deterministic timber patches retain the voxel grain at a distance.
      float woodBlocks = cabinHash(floor(p * vec3(9.0, 18.0, 12.0)));
      float woodBlockFilter = 1.0 - smoothstep(0.02, 0.06, length(fwidth(p)));
      // Broad overhead panels have quieter grain than the small door timbers.
      float overheadTimber = smoothstep(1.0, 1.06, p.y);
      float woodPatchGain = mix(0.32, 0.10, overheadTimber);
      diffuseColor.rgb *= 1.0 + (woodBlocks - 0.5) * woodPatchGain * timber * woodBlockFilter;
      // Broken scuffs follow real bevels, leaving broad painted faces intact.
      float edgeWear = smoothstep(0.12, 0.29, vCabinEdge)
        * smoothstep(0.42, 0.70, cabinNoise(p * 35.0)) * (1.0 - timber);
      diffuseColor.rgb += vec3(0.055, 0.047, 0.032) * edgeWear * CABIN_EDGE_GAIN;
    #endif
  `,
  );
};
export default function CabinMaterial({
  color = '#ffffff',
  fabric = false,
  vertexColors = false,
  wood = false,
  edgeWearStrength = 1,
  topPaintStrength = 0.22,
  matte = false,
}: {
  color?: string;
  fabric?: boolean;
  vertexColors?: boolean;
  wood?: boolean;
  edgeWearStrength?: number;
  topPaintStrength?: number;
  matte?: boolean;
}) {
  const detail = useLoader(
    THREE.TextureLoader,
    fabric ? '/textures/cabin-fabric-v1.png' : '/textures/cabin-patina-v1.png',
  );
  useLayoutEffect(() => {
    detail.wrapS = detail.wrapT = THREE.MirroredRepeatWrapping;
    detail.minFilter = THREE.LinearMipmapLinearFilter;
    detail.magFilter = THREE.LinearFilter;
    detail.anisotropy = 8;
    detail.colorSpace = THREE.NoColorSpace;
    detail.needsUpdate = true;
  }, [detail]);
  const withDetail = useCallback<THREE.MeshStandardMaterial['onBeforeCompile']>(
    (shader, renderer) => {
      shader.uniforms.cabinDetail = { value: detail };
      compile(shader, renderer);
    },
    [detail],
  );
  return (
    <meshStandardMaterial
      color={color}
      vertexColors={vertexColors}
      defines={{
        CABIN_EDGE_GAIN: edgeWearStrength.toFixed(2),
        CABIN_TOP_PAINT_GAIN: topPaintStrength.toFixed(2),
        ...(fabric ? { CABIN_FABRIC: 1 } : {}),
        ...(vertexColors ? { CABIN_SURFACES: 1 } : {}),
        ...(wood ? { CABIN_WOOD: 1 } : {}),
      }}
      roughness={fabric ? 0.98 : matte ? 0.93 : 0.79}
      metalness={fabric || matte ? 0 : 0.03}
      onBeforeCompile={withDetail}
      customProgramCacheKey={() =>
        `chilldrive-cabin-patina-v47-${fabric}-${wood}-${vertexColors}-${edgeWearStrength}-${topPaintStrength}`
      }
    />
  );
}
