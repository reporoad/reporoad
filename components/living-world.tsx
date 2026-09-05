'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { worldAt, type WorldPreview } from '@/lib/live-world';
import { voxelGrain } from './landscape';
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
        map={voxelGrain}
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
  const sky = useRef<THREE.ShaderMaterial>(null);
  useFrame(({ scene }) => {
    const w = worldAt(clock.current.now(), preview),
      sin = Math.sin(w.sunAngle),
      cos = Math.cos(w.sunAngle);
    if (sky.current) {
      sky.current.uniforms.daylight.value = w.daylight;
      sky.current.uniforms.wet.value = w.rain + w.snow;
    }
    sun.current?.position.set(-cos * 140, sin * 100, -170);
    moon.current?.position.set(-cos * 140, -sin * 130, -170);
    if (light.current) {
      light.current.position.set(-cos * 60, Math.max(12, sin * 45), -40);
      light.current.intensity = 0.2 + w.daylight * 2.3;
      light.current.color.set('#ffd39a');
    }
    if (ambient.current) ambient.current.intensity = 0.45 + w.daylight * 1.4;
    color.current
      .set('#142638')
      .lerp(
        new THREE.Color('#d3b595'),
        Math.max(0, 1 - Math.abs(sin) * 3) * 0.7,
      )
      .lerp(new THREE.Color('#efd4a4'), w.daylight * 0.9);
    color.current.lerp(new THREE.Color('#6a7c85'), (w.rain + w.snow) * 0.35);
    scene.background = color.current;
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.color.copy(color.current);
      scene.fog.far = 265 - (w.rain + w.snow) * 65;
    }
  });
  return (
    <>
      <mesh>
        <sphereGeometry args={[440, 24, 16]} />
        <shaderMaterial
          ref={sky}
          side={THREE.BackSide}
          depthWrite={false}
          uniforms={{ daylight: { value: 1 }, wet: { value: 0 } }}
          vertexShader={
            'varying vec3 direction; void main(){ direction = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }'
          }
          fragmentShader={
            'varying vec3 direction; uniform float daylight; uniform float wet; void main(){ float h = smoothstep(0.0,0.8,normalize(direction).y); vec3 day = mix(vec3(0.94,0.79,0.55),vec3(0.48,0.64,0.68),h); vec3 night = mix(vec3(0.09,0.15,0.21),vec3(0.035,0.07,0.13),h); vec3 sky = mix(night,day,daylight); gl_FragColor = vec4(mix(sky,vec3(0.38,0.43,0.45),wet*0.45),1.0); }'
          }
        />
      </mesh>
      <fog attach="fog" args={['#a9c8cc', 90, 265]} />
      <mesh ref={sun}>
        <boxGeometry args={[17, 17, 2]} />
        <meshBasicMaterial color="#ffdf97" fog={false} />
      </mesh>
      <mesh ref={moon}>
        <boxGeometry args={[12, 12, 2]} />
        <meshBasicMaterial color="#e0e8f4" fog={false} />
      </mesh>
      <hemisphereLight ref={ambient} args={['#e9dfc1', '#84765e', 1]} />
      <directionalLight
        ref={light}
        castShadow
        shadow-mapSize={[1024, 1024]}
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

// Cockpit coordinates are relative to the fixed driver's eye position.
// Keep the horizon clear and all trim joined to the windshield surround.
function DashboardPanel({ radio = false }: { radio?: boolean }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 160;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#19221a';
    ctx.fillRect(0, 0, 512, 160);
    ctx.strokeStyle = '#79613e';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, 504, 152);
    ctx.fillStyle = '#e6b56b';
    ctx.font = '24px monospace';
    if (radio) {
      ctx.fillText('CHILLDRIVE', 28, 48);
      ctx.font = '17px monospace';
      ctx.fillText('LOFI RADIO', 28, 79);
      for (let i = 0; i < 22; i++)
        ctx.fillRect(
          28 + i * 20,
          132 - ((i % 5) + 1) * 7,
          11,
          ((i % 5) + 1) * 7,
        );
    } else {
      for (let gauge = 0; gauge < 3; gauge++) {
        const x = 88 + gauge * 166;
        for (let i = 0; i < 9; i++) {
          const angle = Math.PI + (i * Math.PI) / 8;
          ctx.fillRect(
            x + Math.cos(angle) * 55,
            97 + Math.sin(angle) * 55,
            7,
            11,
          );
        }
        ctx.fillText(['24', 'F', 'C'][gauge], x - 14, 107);
        ctx.fillRect(x - 3, 66, 5, 22);
      }
    }
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = THREE.NearestFilter;
    return t;
  }, [radio]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={radio ? [-0.38, -0.75, -1.43] : [0.58, -0.43, -1.49]}>
      <planeGeometry args={radio ? [0.56, 0.19] : [0.7, 0.2]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

export function VoxelCabin({
  environment,
  clock,
}: {
  environment: Environment;
  clock: SharedClock;
}) {
  const wipers = useRef<(THREE.Group | null)[]>([]);
  const cabin = useRef<THREE.Group>(null);
  const rear = useMemo(() => {
    const target = new THREE.WebGLRenderTarget(256, 96);
    const camera = new THREE.PerspectiveCamera(55, 256 / 96, 0.1, 265);
    camera.position.set(1.7, 2, 7);
    camera.lookAt(1.7, 2, 100);
    return { target, camera };
  }, []);
  const lastMirrorFrame = useRef(0);
  useEffect(() => () => rear.target.dispose(), [rear]);
  const { size } = useThree();
  const frameX = Math.max(1.2, (size.width / size.height) * 1.32);
  useFrame(({ gl, scene }) => {
    const now = clock.current.now();
    if (cabin.current && now - lastMirrorFrame.current > 500) {
      lastMirrorFrame.current = now;
      const target = gl.getRenderTarget();
      const shadows = gl.shadowMap.autoUpdate;
      gl.shadowMap.autoUpdate = false;
      cabin.current.visible = false;
      gl.setRenderTarget(rear.target);
      gl.render(scene, rear.camera);
      gl.setRenderTarget(target);
      gl.shadowMap.autoUpdate = shadows;
      cabin.current.visible = true;
    }
    const sweep =
      environment.rain > 0.05
        ? (1 - Math.cos(clock.current.now() / 650)) * 0.55
        : 0;
    wipers.current.forEach((wiper) => {
      if (wiper) wiper.rotation.z = sweep;
    });
  });
  return (
    <group ref={cabin} position={[1.7, 1.9, 7]} rotation={[-0.09, 0, 0]}>
      <DashboardPanel />
      <DashboardPanel radio />
      {/* One continuous dash, a wood fascia and a narrow padded upper lip. */}
      <Block
        position={[0, -0.97, -1.82]}
        scale={[7, 0.85, 0.7]}
        color="#485348"
      />
      <Block
        position={[0, -0.61, -1.87]}
        scale={[7, 0.14, 0.58]}
        color="#596454"
      />
      <Block
        position={[0, -0.79, -1.455]}
        scale={[7, 0.27, 0.04]}
        color="#927653"
      />
      <Block
        position={[-1.22, -0.8, -1.42]}
        scale={[0.98, 0.32, 0.055]}
        color="#65705a"
      />
      <Block
        position={[-1.22, -0.79, -1.384]}
        scale={[0.3, 0.035, 0.025]}
        color="#343e30"
      />
      {/* Slim, continuous frame. Dark seals sit against the glass opening. */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <Block
            position={[side * frameX, 0.08, -1.96]}
            scale={[0.13, 2.5, 0.18]}
            color="#66705b"
          />
          <Block
            position={[side * (frameX - 0.08), 0.08, -1.97]}
            scale={[0.025, 2.4, 0.08]}
            color="#303932"
          />
        </group>
      ))}
      <Block
        position={[0, 1.32, -1.96]}
        scale={[frameX * 2 + 0.13, 0.18, 0.18]}
        color="#66705b"
      />
      <Block
        position={[0, 1.22, -1.97]}
        scale={[frameX * 2, 0.025, 0.08]}
        color="#303932"
      />
      {/* Small mirror tucked under the roof, outside the central road view. */}
      <Block
        position={[0, 1.13, -1.88]}
        scale={[0.035, 0.23, 0.045]}
        color="#303932"
      />
      <Block
        position={[0, 0.98, -1.84]}
        scale={[0.48, 0.17, 0.065]}
        color="#303932"
      />
      <mesh position={[0, 0.98, -1.801]} scale={[-1, 1, 1]}>
        <planeGeometry args={[0.4, 0.11]} />
        <meshBasicMaterial
          map={rear.target.texture}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      {/* Recessed instrument binnacle, aligned behind the steering wheel. */}
      <Block
        position={[0.58, -0.43, -1.66]}
        scale={[0.8, 0.24, 0.28]}
        color="#39423a"
      />
      {/* Stepped rim: a single voxel silhouette with three joined spokes. */}
      <group position={[0.58, -0.64, -1.28]}>
        <Block
          position={[0, -0.18, -0.12]}
          scale={[0.12, 0.42, 0.22]}
          color="#353c32"
        />
        {[-1, 1].map((side) => (
          <group key={side}>
            <Block
              position={[0, side * 0.29, 0]}
              scale={[0.38, 0.075, 0.09]}
              color="#3a352d"
            />
            <Block
              position={[side * 0.29, 0, 0]}
              scale={[0.075, 0.38, 0.09]}
              color="#3a352d"
            />
            {[-1, 1].map((y) => (
              <Block
                key={y}
                position={[side * 0.235, y * 0.235, 0]}
                scale={[0.14, 0.14, 0.09]}
                color="#3a352d"
              />
            ))}
            <Block
              position={[side * 0.16, 0, 0]}
              scale={[0.24, 0.055, 0.07]}
              color="#74624a"
            />
          </group>
        ))}
        <Block
          position={[0, -0.16, 0]}
          scale={[0.055, 0.24, 0.07]}
          color="#74624a"
        />
        <Block
          position={[0, 0, 0.025]}
          scale={[0.19, 0.13, 0.1]}
          color="#514b3b"
        />
      </group>
      {/* Each wiper pivots at its own mount; blades park along the dash. */}
      {[-0.8, 0.72].map((x, i) => (
        <group key={x} position={[x, -0.48, -2.12]}>
          <Block
            position={[0, 0, 0]}
            scale={[0.07, 0.05, 0.06]}
            color="#303932"
          />
          <group
            ref={(node) => {
              wipers.current[i] = node;
            }}
          >
            <Block
              position={[0.27, 0.025, 0]}
              scale={[0.54, 0.025, 0.03]}
              color="#303932"
            />
            <Block
              position={[0.47, 0.045, 0]}
              scale={[0.66, 0.035, 0.035]}
              color="#242d27"
            />
          </group>
        </group>
      ))}
      <pointLight
        position={[0, -0.65, -1]}
        intensity={0.7 + (1 - environment.daylight) * 0.35}
        color="#ffcc8b"
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
