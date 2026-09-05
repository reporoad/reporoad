'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { treeModel, vergeModel } from '@/lib/voxel-models';
import VoxelModel from './voxel-model';
import { groundTextureOffset } from '@/lib/road';

function surfaceTexture(seed: number, size = 16) {
  const data = new Uint8Array(size * size * 4);
  let state = seed;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      const grain = state / 4294967296;
      const value =
        195 + grain * 35 + 10 * Math.sin(x * 0.19) * Math.sin(y * 0.13);
      const i = (y * size + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = value;
      data[i + 3] = 255;
    }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

export const voxelGrain = surfaceTexture(923, 32);
voxelGrain.repeat.set(2, 2);

export function LandscapeTree({
  position,
  scale = 1,
  pine = false,
  season = 'Summer',
}: {
  position: [number, number, number];
  scale?: number;
  pine?: boolean;
  season?: string;
}) {
  const seed = Math.round(position[0] * 11 + position[2] * 7);
  const parts = useMemo(
    () => treeModel(pine, season, seed),
    [pine, season, seed],
  );
  return (
    <group position={position} scale={scale}>
      <VoxelModel parts={parts} />
    </group>
  );
}

export function RoadLandscape({
  night,
  distance,
  season,
}: {
  night: boolean;
  distance: { current: number };
  season: string;
}) {
  const roadMaterial = useRef<THREE.MeshStandardMaterial>(null);
  const grassMaterial = useRef<THREE.MeshStandardMaterial>(null);
  const gravelMaterial = useRef<THREE.MeshStandardMaterial>(null);
  const asphalt = useMemo(() => {
    const t = surfaceTexture(71);
    t.repeat.set(10, 220);
    return t;
  }, []);
  const grass = useMemo(() => {
    const t = surfaceTexture(103);
    t.repeat.set(850 / 8, 850 / 8);
    return t;
  }, []);
  const gravel = useMemo(() => {
    const t = surfaceTexture(341);
    t.repeat.set(4, 110);
    return t;
  }, []);

  useEffect(
    () => () => {
      asphalt.dispose();
      grass.dispose();
      gravel.dispose();
    },
    [asphalt, grass, gravel],
  );
  useFrame(() => {
    const roadMap = roadMaterial.current?.map;
    const grassMap = grassMaterial.current?.map;
    const gravelMap = gravelMaterial.current?.map;
    if (roadMap) roadMap.offset.y = groundTextureOffset(distance.current, 2);
    if (gravelMap)
      gravelMap.offset.y = groundTextureOffset(distance.current, 4);
    if (grassMap) grassMap.offset.y = groundTextureOffset(distance.current, 8);
  });
  return (
    <>
      <mesh
        position={[0, -0.25, -190]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[850, 850]} />
        <meshStandardMaterial
          ref={grassMaterial}
          color={
            season === 'Winter'
              ? '#dce4df'
              : season === 'Autumn'
                ? '#a99a59'
                : night
                  ? '#375c43'
                  : '#8d9f58'
          }
          map={grass}
          roughness={1}
        />
      </mesh>
      <mesh
        position={[0, -0.045, -170]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[12, 440]} />
        <meshStandardMaterial
          ref={gravelMaterial}
          color="#a39d87"
          map={gravel}
          roughness={1}
        />
      </mesh>
      <mesh
        position={[0, 0.001, -170]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[7.4, 440]} />
        <meshStandardMaterial
          ref={roadMaterial}
          color="#655e50"
          map={asphalt}
          bumpMap={asphalt}
          bumpScale={0.018}
          roughness={0.93}
        />
      </mesh>
      <VoxelHills night={night} season={season} />
      <DistantValley season={season} />
      {[-3.5, 3.5].map((x) => (
        <mesh
          key={x}
          position={[x, 0.012, -170]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[0.1, 440]} />
          <meshStandardMaterial color="#d6d5bf" roughness={0.95} />
        </mesh>
      ))}
    </>
  );
}

export function Atmosphere({ night }: { night: boolean }) {
  return (
    <>
      <color attach="background" args={[night ? '#243953' : '#83bee3']} />
      <mesh position={[-75, 65, -210]}>
        <boxGeometry args={[22, 22, 2]} />
        <meshBasicMaterial color={night ? '#e0ebf7' : '#fff1a8'} fog={false} />
      </mesh>
      {Array.from({ length: 9 }, (_, i) => (
        <group
          key={i}
          position={[
            ((i % 3) - 1) * 95,
            44 + Math.floor(i / 3) * 12,
            -95 - Math.floor(i / 3) * 80,
          ]}
        >
          <mesh>
            <boxGeometry args={[38, 3, 15]} />
            <meshStandardMaterial
              color={night ? '#71839d' : '#f6f8ed'}
              roughness={1}
            />
          </mesh>
          <mesh position={[9, 2, -4]}>
            <boxGeometry args={[24, 4, 17]} />
            <meshStandardMaterial
              color={night ? '#71839d' : '#f6f8ed'}
              roughness={1}
            />
          </mesh>
        </group>
      ))}
    </>
  );
}

function DistantValley({ season }: { season: string }) {
  const terrain = useRef<THREE.InstancedMesh>(null);
  const forest = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    if (!terrain.current || !forest.current) return;
    const m = new THREE.Object3D();
    let i = 0;
    for (let row = 0; row < 5; row++)
      for (let x = -18; x <= 18; x++) {
        const height =
          8 + Math.abs(x) * 1.8 + Math.sin(x * 0.5 + row) * 8 + row * 3;
        m.position.set(x * 9, height / 2, -190 - row * 16);
        m.scale.set(9, height, 18);
        m.updateMatrix();
        terrain.current.setMatrixAt(i, m.matrix);
        terrain.current.setColorAt(
          i++,
          new THREE.Color(
            season === 'Winter' ? '#b8c5bc' : '#8b9263',
          ).multiplyScalar(0.85 + row * 0.055),
        );
        for (let tree = 0; tree < 4; tree++) {
          const tier = tree % 2;
          m.position.set(
            x * 9 + (tree < 2 ? -2.5 : 2),
            height + 1.5 + tier * 2,
            -188 - row * 16 + (tree < 2 ? -3 : 3),
          );
          m.scale.set(tier ? 2.5 : 4, 3, tier ? 2.5 : 4);
          m.updateMatrix();
          forest.current.setMatrixAt((i - 1) * 4 + tree, m.matrix);
          forest.current.setColorAt(
            (i - 1) * 4 + tree,
            new THREE.Color(
              season === 'Winter' ? '#c5cabb' : '#6f7f44',
            ).multiplyScalar(0.85 + (i % 4) * 0.08),
          );
        }
      }
    terrain.current.instanceMatrix.needsUpdate = true;
    if (terrain.current.instanceColor)
      terrain.current.instanceColor.needsUpdate = true;
    terrain.current.computeBoundingSphere();
    forest.current.instanceMatrix.needsUpdate = true;
    if (forest.current.instanceColor)
      forest.current.instanceColor.needsUpdate = true;
    forest.current.computeBoundingSphere();
  }, [season]);
  return (
    <>
      <instancedMesh ref={terrain} args={[undefined, undefined, 185]}>
        <boxGeometry />
        <meshStandardMaterial roughness={1} />
      </instancedMesh>
      <instancedMesh ref={forest} args={[undefined, undefined, 740]}>
        <boxGeometry />
        <meshStandardMaterial roughness={1} />
      </instancedMesh>
    </>
  );
}

export function RoadsideVerge({
  season,
  seed = 0,
}: {
  season: string;
  seed?: number;
}) {
  const parts = useMemo(() => vergeModel(season, seed), [season, seed]);
  return <VoxelModel parts={parts} shadows={false} />;
}

function VoxelHills({ night, season }: { night: boolean; season: string }) {
  const dirt = useRef<THREE.InstancedMesh>(null),
    tops = useRef<THREE.InstancedMesh>(null);
  const ridgeTrees = useRef<THREE.InstancedMesh>(null);
  const count = 2 * 18 * 40;
  useEffect(() => {
    if (!dirt.current || !tops.current || !ridgeTrees.current) return;
    const m = new THREE.Object3D();
    let i = 0;
    for (const side of [-1, 1])
      for (let x = 0; x < 18; x++)
        for (let z = 0; z < 40; z++) {
          const height =
            2 +
            Math.floor(
              (x * 0.6 +
                3 +
                Math.sin(x * 0.5 + z * 0.3) * 3 +
                Math.cos(z * 0.22) * 2) /
                2,
            ) *
              2;
          const h = Math.max(2, height);
          m.position.set(side * (44 + x * 8), h / 2 - 0.25, 48 - z * 8);
          m.scale.set(8, h, 8);
          m.updateMatrix();
          dirt.current.setMatrixAt(i, m.matrix);
          m.position.y = h - 0.25;
          m.scale.set(8, 0.5, 8);
          m.updateMatrix();
          tops.current.setMatrixAt(i, m.matrix);
          dirt.current.setColorAt(
            i,
            new THREE.Color('#71824a').multiplyScalar(0.85 + (i % 4) * 0.05),
          );
          tops.current.setColorAt(
            i,
            new THREE.Color(
              season === 'Winter'
                ? '#dae3df'
                : season === 'Autumn'
                  ? '#a1924c'
                  : night
                    ? '#395d3c'
                    : '#8b9454',
            ).multiplyScalar(0.9 + (i % 3) * 0.05),
          );
          // Forest silhouettes break up the old bare, horizontal terraces.
          for (let tier = 0; tier < 3; tier++) {
            m.position.set(
              side * (44 + x * 8) + Math.sin(i * 7) * 2,
              h + 1 + tier * 1.25,
              48 - z * 8 + Math.cos(i * 3) * 2,
            );
            m.scale.set(3.7 - tier * 0.9, 2.3, 3.7 - tier * 0.9);
            m.updateMatrix();
            ridgeTrees.current.setMatrixAt(i * 3 + tier, m.matrix);
            ridgeTrees.current.setColorAt(
              i * 3 + tier,
              new THREE.Color(
                season === 'Winter'
                  ? '#b9c7ac'
                  : season === 'Autumn'
                    ? '#9c823d'
                    : '#6d7d3e',
              ).multiplyScalar(0.85 + (i % 4) * 0.05),
            );
          }
          i++;
        }
    for (const mesh of [dirt.current, tops.current, ridgeTrees.current]) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }, [night, season]);
  return (
    <>
      <instancedMesh
        ref={ridgeTrees}
        args={[undefined, undefined, count * 3]}
        receiveShadow
      >
        <boxGeometry />
        <meshStandardMaterial roughness={1} />
      </instancedMesh>
      <instancedMesh
        ref={dirt}
        args={[undefined, undefined, count]}
        receiveShadow
      >
        <boxGeometry />
        <meshStandardMaterial roughness={1} />
      </instancedMesh>
      <instancedMesh
        ref={tops}
        args={[undefined, undefined, count]}
        receiveShadow
      >
        <boxGeometry />
        <meshStandardMaterial roughness={1} />
      </instancedMesh>
    </>
  );
}
