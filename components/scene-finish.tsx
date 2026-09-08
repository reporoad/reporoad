'use client';

import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  HalfFloatType,
  Vector2,
  WebGLRenderTarget,
  type PerspectiveCamera,
} from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { cabinFocus } from './cabin-focus';

/** Spatial denoising only: no animated noise or temporal ghost trails. */
export default function SceneFinish() {
  const { gl, scene, camera, size } = useThree();
  const pipeline = useMemo(() => {
    const target = new WebGLRenderTarget(1, 1, {
      type: HalfFloatType,
      samples: 4,
    });
    const composer = new EffectComposer(gl, target);
    const render = new RenderPass(scene, camera);
    const ao = new GTAOPass(scene, camera, 1, 1);
    ao.blendIntensity = 0.72;
    ao.updateGtaoMaterial({
      radius: 0.35,
      thickness: 0.8,
      samples: 8,
      distanceFallOff: 0.7,
    });
    ao.updatePdMaterial({ radius: 3, samples: 8 });
    const focus = cabinFocus(
      ao.depthTexture,
      (camera as PerspectiveCamera).near,
      (camera as PerspectiveCamera).far,
    );
    const bloom = new UnrealBloomPass(new Vector2(1, 1), 0.12, 0.45, 1.4);
    const output = new OutputPass();
    for (const pass of [render, ao, focus, bloom, output])
      composer.addPass(pass);
    return { composer, focus, passes: [render, ao, focus, bloom, output] };
  }, [gl, scene, camera]);
  useEffect(() => {
    pipeline.composer.setPixelRatio(gl.getPixelRatio());
    pipeline.composer.setSize(size.width, size.height);
    pipeline.focus.uniforms.inverseResolution.value.set(
      1 / (size.width * gl.getPixelRatio()),
      1 / (size.height * gl.getPixelRatio()),
    );
  }, [gl, size, pipeline]);
  useEffect(
    () => () => {
      pipeline.passes.forEach((pass) => pass.dispose());
      pipeline.composer.dispose();
    },
    [pipeline],
  );
  // Render after movement, lighting and mirror capture have been updated.
  useFrame((_, delta) => pipeline.composer.render(delta), 1);
  return null;
}
