'use client';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { worldAt, type WorldPreview } from '@/lib/live-world';
export type Environment = ReturnType<typeof worldAt>;
export type SharedClock = { current: { now: () => number } };
function Block({
  position,
  scale,
  color,
  glow = 0,
}: {
  position: [number, number, number];
  scale: [number, number, number];
  color: string;
  glow?: number;
}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={scale} />
      <meshStandardMaterial
        color={color}
        roughness={0.88}
        emissive={color}
        emissiveIntensity={glow}
      />
    </mesh>
  );
}

export function SkyCycle({
  clock,
  preview,
}: {
  clock: SharedClock;
  preview?: WorldPreview;
}) {
  const sun = useRef<THREE.Mesh>(null),
    moon = useRef<THREE.Mesh>(null),
    light = useRef<THREE.DirectionalLight>(null),
    ambient = useRef<THREE.HemisphereLight>(null);
  const color = useRef(new THREE.Color());
  useFrame(({ scene }) => {
    const w = worldAt(clock.current.now(), preview),
      sin = Math.sin(w.sunAngle),
      cos = Math.cos(w.sunAngle);
    sun.current?.position.set(cos * 140, sin * 130, -170);
    moon.current?.position.set(-cos * 140, -sin * 130, -170);
    if (light.current) {
      light.current.position.set(cos * 60, Math.max(12, sin * 70), -40);
      light.current.intensity = 0.2 + w.daylight * 2.3;
      light.current.color.set(w.daylight < 0.7 ? '#ffba78' : '#fff0c9');
    }
    if (ambient.current) ambient.current.intensity = 0.25 + w.daylight * 1.1;
    color.current
      .set('#142638')
      .lerp(
        new THREE.Color('#d3b595'),
        Math.max(0, 1 - Math.abs(sin) * 3) * 0.7,
      )
      .lerp(new THREE.Color('#a9c8cc'), w.daylight * 0.85);
    color.current.lerp(new THREE.Color('#6a7c85'), (w.rain + w.snow) * 0.35);
    scene.background = color.current;
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.color.copy(color.current);
      scene.fog.far = 265 - (w.rain + w.snow) * 65;
    }
  });
  return (
    <>
      <fog attach="fog" args={['#a9c8cc', 90, 265]} />
      <mesh ref={sun}>
        <boxGeometry args={[17, 17, 2]} />
        <meshBasicMaterial color="#ffdf97" fog={false} />
      </mesh>
      <mesh ref={moon}>
        <boxGeometry args={[12, 12, 2]} />
        <meshBasicMaterial color="#e0e8f4" fog={false} />
      </mesh>
      <hemisphereLight ref={ambient} args={['#cbdce6', '#574639', 1]} />
      <directionalLight
        ref={light}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={90}
        shadow-camera-bottom={-45}
        shadow-camera-far={180}
        shadow-normalBias={0.05}
        shadow-radius={3}
      />
      {Array.from({ length: 7 }, (_, i) => (
        <group
          key={i}
          position={[
            ((i % 3) - 1) * 70,
            40 + Math.floor(i / 3) * 9,
            -80 - Math.floor(i / 3) * 65,
          ]}
        >
          <Block position={[0, 0, 0]} scale={[24, 2, 10]} color="#cbd2d0" />
          <Block position={[6, 1, -3]} scale={[13, 3, 11]} color="#d8dbd2" />
        </group>
      ))}
    </>
  );
}

export function VoxelCabin({
  environment,
  clock,
}: {
  environment: Environment;
  clock: SharedClock;
}) {
  const wipers = useRef<THREE.Group>(null);
  useFrame(() => {
    if (wipers.current)
      wipers.current.rotation.z =
        environment.rain > 0.05
          ? Math.sin(clock.current.now() / 650) * 0.55
          : 0;
  });
  return (
    <group position={[1.7, 1.9, 7]}>
      <Block
        position={[0, -1.12, -1.4]}
        scale={[4.5, 0.55, 1.2]}
        color="#53624a"
      />
      <Block
        position={[0, -0.88, -1.72]}
        scale={[4.5, 0.16, 0.65]}
        color="#958161"
      />
      <Block
        position={[0, -1.22, -0.79]}
        scale={[4.1, 0.2, 0.12]}
        color="#654c34"
      />
      {[-1.6, 1.6].map((x) => (
        <group key={x}>
          <Block
            position={[x, 0.05, -1.7]}
            scale={[0.17, 2.6, 0.22]}
            color="#687458"
          />
          <Block
            position={[x, -0.05, -1.57]}
            scale={[0.06, 2.4, 0.05]}
            color="#aa956e"
          />
        </group>
      ))}
      <Block
        position={[0, 1.05, -1.7]}
        scale={[4.25, 0.18, 0.25]}
        color="#55604a"
      />
      <Block
        position={[0, 0.95, -1.55]}
        scale={[0.04, 0.3, 0.07]}
        color="#3c453a"
      />
      <Block
        position={[0, 0.79, -1.54]}
        scale={[0.6, 0.22, 0.08]}
        color="#262e2b"
      />
      <Block
        position={[0, 0.79, -1.485]}
        scale={[0.52, 0.15, 0.02]}
        color="#6f999a"
      />
      <group position={[0.6, -0.55, -1.3]}>
        {[
          [-0.33, 0],
          [0.33, 0],
          [0, 0.3],
          [0, -0.3],
        ].map(([x, y], i) => (
          <Block
            key={i}
            position={[x, y, 0]}
            scale={i < 2 ? [0.09, 0.6, 0.08] : [0.66, 0.09, 0.08]}
            color="#3c372e"
          />
        ))}
        <Block
          position={[0, 0, 0]}
          scale={[0.25, 0.18, 0.12]}
          color="#5b513e"
        />
        <Block
          position={[0, 0, 0]}
          scale={[0.6, 0.045, 0.07]}
          color="#494133"
        />
      </group>
      <Block
        position={[-0.38, -1.06, -0.76]}
        scale={[0.55, 0.2, 0.035]}
        color="#202927"
      />
      {Array.from({ length: 9 }, (_, i) => (
        <Block
          key={i}
          position={[-0.6 + i * 0.055, -1.06, -0.735]}
          scale={[0.025, 0.025 + (i % 3) * 0.02, 0.01]}
          color="#ffc575"
          glow={0.7}
        />
      ))}
      <Block
        position={[0.8, -0.86, -1.04]}
        scale={[0.55, 0.18, 0.035]}
        color="#252c26"
      />
      {[0.62, 0.74, 0.86, 0.98].map((x) => (
        <Block
          key={x}
          position={[x, -0.87, -1.01]}
          scale={[0.04, 0.07, 0.01]}
          color="#ffd080"
          glow={0.8}
        />
      ))}
      <group position={[0, -0.74, -2.01]} ref={wipers}>
        <Block
          position={[-0.6, 0.05, 0]}
          scale={[1.02, 0.028, 0.028]}
          color="#272c28"
        />
        <Block
          position={[0.6, 0.05, 0]}
          scale={[1.02, 0.028, 0.028]}
          color="#272c28"
        />
      </group>
      <pointLight
        position={[0, -0.7, -0.8]}
        intensity={(1 - environment.daylight) * 0.6}
        color="#ffbb6c"
        distance={3}
      />
    </group>
  );
}

export function Wildlife({
  environment,
  clock,
}: {
  environment: Environment;
  clock: SharedClock;
}) {
  const birds = useRef<THREE.Group>(null);
  const wingLeft = useRef<THREE.Group>(null),
    wingRight = useRef<THREE.Group>(null);
  useFrame(() => {
    const t = clock.current.now() / 1000;
    if (birds.current) {
      birds.current.position.set(
        Math.sin(t * 0.023) * 48,
        12 + Math.sin(t * 0.07) * 3,
        -55 + Math.cos(t * 0.023) * 20,
      );
      birds.current.visible = environment.daylight > 0.1;
    }
    if (wingLeft.current) wingLeft.current.rotation.z = Math.sin(t * 5) * 0.5;
    if (wingRight.current)
      wingRight.current.rotation.z = -Math.sin(t * 5) * 0.5;
  });
  return (
    <group ref={birds}>
      <Block position={[0, 0, 0]} scale={[0.24, 0.18, 0.65]} color="#4b3f30" />
      <group ref={wingLeft}>
        <Block
          position={[-0.48, 0, 0]}
          scale={[0.85, 0.07, 0.35]}
          color="#625340"
        />
      </group>
      <group ref={wingRight}>
        <Block
          position={[0.48, 0, 0]}
          scale={[0.85, 0.07, 0.35]}
          color="#625340"
        />
      </group>
      {[
        [-3, 1, 2],
        [3, 0.5, 4],
        [-6, 2, 5],
      ].map(([x, y, z], i) => (
        <group key={i} position={[x, y, z]}>
          <Block
            position={[0, 0, 0]}
            scale={[0.2, 0.16, 0.6]}
            color="#534633"
          />
          <Block
            position={[0, 0, 0]}
            scale={[1.2, 0.07, 0.25]}
            color="#625340"
          />
        </group>
      ))}
    </group>
  );
}
export function RoadsideAnimal({
  clock,
  index,
}: {
  clock: SharedClock;
  index: number;
}) {
  const animal = useRef<THREE.Group>(null),
    head = useRef<THREE.Group>(null);
  useFrame(() => {
    const t = clock.current.now() / 1000;
    if (animal.current)
      animal.current.position.z = -16 + Math.sin(t * 0.13 + index) * 2;
    if (head.current)
      head.current.rotation.x = 0.25 + Math.sin(t * 0.25 + index) * 0.3;
  });
  return (
    <group
      ref={animal}
      position={[index % 2 ? 19 : -19, 0, -16]}
      rotation={[0, index % 2 ? -0.6 : 0.6, 0]}
    >
      <Block position={[0, 0.8, 0]} scale={[1, 0.65, 1.65]} color="#b08a5d" />
      {[-0.35, 0.35].flatMap((x) =>
        [-0.55, 0.55].map((z) => (
          <Block
            key={`${x}-${z}`}
            position={[x, 0.3, z]}
            scale={[0.15, 0.65, 0.15]}
            color="#806346"
          />
        )),
      )}
      <group ref={head} position={[0, 1.12, 0.85]}>
        <Block
          position={[0, 0, 0.12]}
          scale={[0.5, 0.5, 0.6]}
          color="#ba966e"
        />
        {[-0.2, 0.2].map((x) => (
          <Block
            key={x}
            position={[x, 0.36, 0]}
            scale={[0.12, 0.3, 0.12]}
            color="#98734f"
          />
        ))}
        <Block
          position={[0.255, 0.07, 0.25]}
          scale={[0.02, 0.08, 0.08]}
          color="#212721"
        />
      </group>
    </group>
  );
}

export function Precipitation({
  environment,
  clock,
}: {
  environment: Environment;
  clock: SharedClock;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  useFrame(() => {
    if (!mesh.current) return;
    const amount = environment.rain + environment.snow;
    mesh.current.visible = amount > 0.01;
    if (amount <= 0.01) return;
    const t = clock.current.now() / 1000,
      m = new THREE.Object3D();
    const snow = environment.snow > environment.rain;
    const count = Math.floor(320 * amount);
    mesh.current.count = count;
    for (let i = 0; i < count; i++) {
      const x = ((i * 17.37) % 40) - 20;
      const z = -((i * 11.71) % 65);
      const y = 18 - ((t * (snow ? 1.3 : 12) + i * 0.71) % 18);
      m.position.set(x + (snow ? Math.sin(t + i) * 0.6 : 0), y, z);
      m.scale.set(snow ? 0.075 : 0.025, snow ? 0.075 : 0.6, 0.025);
      m.updateMatrix();
      mesh.current.setMatrixAt(i, m.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, 320]}
      frustumCulled={false}
    >
      <boxGeometry />
      <meshBasicMaterial
        color={environment.snow > environment.rain ? '#eff4ef' : '#9cb7c7'}
        transparent
        opacity={0.6}
      />
    </instancedMesh>
  );
}
