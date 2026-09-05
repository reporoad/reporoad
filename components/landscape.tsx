'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function surfaceTexture(seed: number, size = 256) {
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
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

export function LandscapeTree({
  position,
  scale = 1,
  pine = false,
}: {
  position: [number, number, number];
  scale?: number;
  pine?: boolean;
}) {
  const crowns = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    if (!crowns.current) return;
    const transform = new THREE.Object3D();
    for (let i = 0; i < 7; i++) {
      const angle = i * 2.4;
      transform.position.set(
        Math.cos(angle) * (pine ? 0.26 : 0.63),
        2.1 + i * (pine ? 0.28 : 0.13),
        Math.sin(angle) * (pine ? 0.26 : 0.54),
      );
      const radius = pine ? 1.25 - i * 0.115 : 0.84 + (i % 3) * 0.14;
      transform.scale.set(radius, pine ? 0.65 : 0.83, radius);
      transform.rotation.set(0.1 * i, angle, 0.12 * i);
      transform.updateMatrix();
      crowns.current.setMatrixAt(i, transform.matrix);
      crowns.current.setColorAt(
        i,
        new THREE.Color(pine ? '#304f35' : '#486638').multiplyScalar(
          0.9 + (i % 3) * 0.12,
        ),
      );
    }
    crowns.current.instanceMatrix.needsUpdate = true;
    if (crowns.current.instanceColor)
      crowns.current.instanceColor.needsUpdate = true;
    crowns.current.computeBoundingSphere();
  }, [pine]);
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.19, 3, 7]} />
        <meshStandardMaterial color="#665744" roughness={1} />
      </mesh>
      <mesh position={[0.25, 1.9, 0]} rotation={[0, 0, -0.6]} castShadow>
        <cylinderGeometry args={[0.04, 0.09, 1.2, 6]} />
        <meshStandardMaterial color="#665744" roughness={1} />
      </mesh>
      <instancedMesh
        ref={crowns}
        args={[undefined, undefined, 7]}
        castShadow
        receiveShadow
      >
        {pine ? (
          <coneGeometry args={[1, 1.9, 9]} />
        ) : (
          <icosahedronGeometry args={[1, 2]} />
        )}
        <meshStandardMaterial roughness={0.95} />
      </instancedMesh>
    </group>
  );
}

export function RoadLandscape({
  night,
  distance,
}: {
  night: boolean;
  distance: { current: number };
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
  const terrain = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(850, 850, 110, 110);
    geometry.rotateX(-Math.PI / 2);
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i),
        z = positions.getZ(i);
      const edge = THREE.MathUtils.smoothstep(Math.abs(x), 32, 150);
      const ridge =
        Math.sin(x * 0.022 + z * 0.012) * 9 +
        Math.cos(z * 0.017 - x * 0.011) * 11;
      positions.setY(i, -0.23 + edge * (18 + ridge));
    }
    geometry.computeVertexNormals();
    return geometry;
  }, []);
  useEffect(
    () => () => {
      asphalt.dispose();
      grass.dispose();
      gravel.dispose();
      terrain.dispose();
    },
    [asphalt, grass, gravel, terrain],
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
      <mesh geometry={terrain} position={[0, 0, -190]} receiveShadow>
        <meshStandardMaterial
          ref={grassMaterial}
          color={night ? '#455449' : '#667b43'}
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
  const uniforms = useMemo(
    () => ({
      top: { value: new THREE.Color() },
      horizon: { value: new THREE.Color() },
      sunColor: { value: new THREE.Color() },
    }),
    [],
  );
  uniforms.top.value.set(night ? '#142a48' : '#759cba');
  uniforms.horizon.value.set(night ? '#4e6171' : '#d9d4b8');
  uniforms.sunColor.value.set(night ? '#c5d5e5' : '#fff0ca');
  return (
    <mesh>
      <sphereGeometry args={[430, 32, 16]} />
      <shaderMaterial
        side={THREE.BackSide}
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={
          'varying vec3 direction; void main(){ direction=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }'
        }
        fragmentShader={
          'varying vec3 direction; uniform vec3 top; uniform vec3 horizon; uniform vec3 sunColor; void main(){ vec3 d=normalize(direction); float h=pow(max(d.y,0.0),0.65); vec3 color=mix(horizon,top,h); float sun=max(dot(d,normalize(vec3(-0.55,0.23,-1.0))),0.0); color=mix(color,sunColor,pow(sun,180.0)*0.45+pow(sun,2400.0)*0.55); gl_FragColor=vec4(color,1.0);\n #include <tonemapping_fragment>\n #include <colorspace_fragment>\n }'
        }
      />
    </mesh>
  );
}
