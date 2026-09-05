'use client';
import { memo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { VoxelPart } from '@/lib/voxel-models';

export default memo(function VoxelModel({
  parts,
  shadows = true,
}: {
  parts: VoxelPart[];
  shadows?: boolean;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    if (!mesh.current) return;
    const object = new THREE.Object3D();
    parts.forEach((part, i) => {
      object.position.set(...part.position);
      object.scale.set(...part.size);
      object.updateMatrix();
      mesh.current!.setMatrixAt(i, object.matrix);
      mesh.current!.setColorAt(i, new THREE.Color(part.color));
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor)
      mesh.current.instanceColor.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [parts]);
  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, parts.length]}
      castShadow={shadows}
      receiveShadow
    >
      <boxGeometry />
      <meshStandardMaterial roughness={0.92} />
    </instancedMesh>
  );
});
