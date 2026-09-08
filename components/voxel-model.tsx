'use client';
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { cabinAssemblyGeometry } from '@/lib/cabin-geometry';
import type { VoxelPart } from '@/lib/voxel-models';
import CabinMaterial from './cabin-material';
import ExteriorMaterial from './exterior-material';

export default memo(function VoxelModel({
  parts,
  shadows = true,
  cabin = false,
  edgeWearStrength = 1,
  glow = false,
  matte = false,
  rubber = false,
}: {
  parts: VoxelPart[];
  shadows?: boolean;
  cabin?: boolean;
  edgeWearStrength?: number;
  glow?: boolean;
  matte?: boolean;
  rubber?: boolean;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const cabinGeometry = useMemo(
    () => (cabin ? cabinAssemblyGeometry(parts) : null),
    [cabin, parts],
  );
  useEffect(() => () => cabinGeometry?.dispose(), [cabinGeometry]);
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
  }, [parts, cabin]);
  if (cabinGeometry) {
    return (
      <mesh geometry={cabinGeometry} castShadow={shadows} receiveShadow>
        {rubber
          ? <meshStandardMaterial vertexColors roughness={1} metalness={0} />
          : <CabinMaterial vertexColors edgeWearStrength={edgeWearStrength} matte={matte} />}
      </mesh>
    );
  }
  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, parts.length]}
      castShadow={shadows}
      receiveShadow
    >
      <boxGeometry />
      <ExteriorMaterial glow={glow} />
    </instancedMesh>
  );
});
