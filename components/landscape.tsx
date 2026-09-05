'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function surfaceTexture(seed: number, size = 16) {
  const data = new Uint8Array(size * size * 4);
  let state = seed;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      const grain = state / 4294967296;
      const value =
        140 + grain * 90 + 10 * Math.sin(x * 0.19) * Math.sin(y * 0.13);
      const i = (y * size + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = value;
      data[i + 3] = 255;
    }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestMipmapNearestFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 1;
  texture.needsUpdate = true;
  return texture;
}

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
  const crowns = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    if (!crowns.current) return;
    const transform = new THREE.Object3D();
    for (let i = 0; i < 7; i++) {
      const positions = [
        [0, 2.5, 0],
        [-0.8, 2.5, 0],
        [0.8, 2.5, 0],
        [0, 2.5, -0.8],
        [0, 2.5, 0.8],
        [0, 3.3, 0],
        [0.6, 3.3, 0.6],
      ];
      if (pine) {
        transform.position.set(0, 1.8 + i * 0.4, 0);
        const width = 2.7 - Math.floor(i / 2) * 0.65;
        transform.scale.set(width, 0.65, width);
      } else {
        transform.position.set(...(positions[i] as [number, number, number]));
        transform.scale.set(1.35, 1.1, 1.35);
      }
      transform.rotation.set(0, 0, 0);
      transform.updateMatrix();
      crowns.current.setMatrixAt(i, transform.matrix);
      crowns.current.setColorAt(
        i,
        new THREE.Color(
          season === 'Winter'
            ? '#cbdad0'
            : season === 'Autumn'
              ? i % 2
                ? '#b5813f'
                : '#a55732'
              : season === 'Spring' && i % 3 === 0
                ? '#cda6a2'
                : pine
                  ? '#28613b'
                  : '#529134',
        ).multiplyScalar(0.9 + (i % 3) * 0.12),
      );
    }
    crowns.current.instanceMatrix.needsUpdate = true;
    if (crowns.current.instanceColor)
      crowns.current.instanceColor.needsUpdate = true;
    crowns.current.computeBoundingSphere();
  }, [pine, season]);
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 1.5, 0]} castShadow>
        <boxGeometry args={[0.45, 3, 0.45]} />
        <meshStandardMaterial color="#665744" roughness={1} />
      </mesh>
      <instancedMesh
        ref={crowns}
        args={[undefined, undefined, 7]}
        castShadow
        receiveShadow
      >
        <boxGeometry />
        <meshStandardMaterial roughness={0.95} />
      </instancedMesh>
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
    t.repeat.set(2.5, 110);
    return t;
  }, []);
  const grass = useMemo(() => {
    const t = surfaceTexture(103);
    t.repeat.set(95, 95);
    return t;
  }, []);
  const gravel = useMemo(() => {
    const t = surfaceTexture(341);
    t.repeat.set(4, 100);
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
    if (roadMap) roadMap.offset.y = -distance.current / 4;
    if (gravelMap) gravelMap.offset.y = -distance.current / 4.4;
    if (grassMap) grassMap.offset.y = -distance.current / (850 / 95);
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
                  : '#71a644'
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
        <planeGeometry args={[9.4, 440]} />
        <meshStandardMaterial
          ref={roadMaterial}
          color="#414441"
          map={asphalt}
          bumpMap={asphalt}
          bumpScale={0.018}
          roughness={0.93}
        />
      </mesh>
      <VoxelHills night={night} season={season} />
      {[-4.4, 4.4].map((x) => (
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

function VoxelHills({ night, season }: { night: boolean; season: string }) {
  const dirt = useRef<THREE.InstancedMesh>(null),
    tops = useRef<THREE.InstancedMesh>(null);
  const count = 2 * 18 * 40;
  useEffect(() => {
    if (!dirt.current || !tops.current) return;
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
            new THREE.Color('#8e7152').multiplyScalar(0.85 + (i % 4) * 0.05),
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
                    : '#65973e',
            ).multiplyScalar(0.9 + (i % 3) * 0.05),
          );
          i++;
        }
    for (const mesh of [dirt.current, tops.current]) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }, [night, season]);
  return (
    <>
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
