'use client';
import { useContext, useEffect, useMemo, useRef } from 'react';
import { RadioContext } from './radio-context';
import { PLAYLIST } from '@/lib/playlist';
import { drawRadio } from '@/lib/radio-display';
import { dashboardState, drawDashboard, type DashboardState } from '@/lib/dashboard';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { worldAt, type WorldPreview } from '@/lib/live-world';
import { voxelGrain } from './landscape';
import { steeringWheelModel, cloudModel } from '@/lib/voxel-models';
import { driverSeatPosition, driverSeatScale, wheelPosition, wheelScale, wheelRotation } from '@/lib/cabin-layout';
import VoxelModel from './voxel-model';
import { cabinDashboardModel, cabinSurroundModel } from '@/lib/cabin-model';
import CabinMaterial from './cabin-material';
import { cabinPadGeometry } from '@/lib/cabin-pad';
import { cabinBolsterGeometry, cabinCushionGeometry, shadeCabinFabric } from '@/lib/cabin-cushion';
import { cabinMirror } from '@/lib/cabin-mirror';
import { sceneLighting, cabinLighting } from '@/lib/scene-lighting';
RectAreaLightUniformsLib.init();
export type Environment = ReturnType<typeof worldAt>;
export type SharedClock = { current: { now: () => number } };
function Block({
  position,
  scale,
  color,
  glow = 0,
  grain = true,
  fabric = false,
  wood = false,
  cushion = false,
}: {
  position: [number, number, number];
  scale: [number, number, number];
  color: string;
  glow?: number;
  grain?: boolean;
  fabric?: boolean;
  wood?: boolean;
  cushion?: boolean;
}) {
  const softenedGeometry = useMemo(
    () => {
      if (cushion) return cabinCushionGeometry(scale);
      if (grain) return null;
      const geometry = new RoundedBoxGeometry(
        scale[0], scale[1], scale[2], 1,
        Math.min(0.005, Math.min(...scale) * 0.1),
      );
      return fabric ? shadeCabinFabric(geometry) : geometry;
    },
    [cushion, fabric, grain, scale[0], scale[1], scale[2]],
  );
  useEffect(() => () => softenedGeometry?.dispose(), [softenedGeometry]);
  return (
    <mesh position={position} castShadow receiveShadow>
      {softenedGeometry ? (
        <primitive object={softenedGeometry} attach="geometry" />
      ) : (
        <boxGeometry args={scale} />
      )}
      {!grain && !glow ? (
        <CabinMaterial
          color={color}
          fabric={fabric}
          wood={wood}
          vertexColors={cushion || fabric}
        />
      ) : (
        <meshStandardMaterial
          map={grain ? voxelGrain : undefined}
          color={color}
          roughness={0.88}
          emissive={color}
          emissiveIntensity={glow}
        />
      )}
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
  const clouds = useMemo(() => cloudModel(), []);
  const sun = useRef<THREE.Mesh>(null),
    moon = useRef<THREE.Mesh>(null),
    light = useRef<THREE.DirectionalLight>(null),
    ambient = useRef<THREE.HemisphereLight>(null);
  const color = useRef(new THREE.Color());
  const skyDay = useMemo(() => new THREE.Color('#e4d6bd'), []);
  const skyDusk = useMemo(() => new THREE.Color('#e5b58e'), []);
  const skyWet = useMemo(() => new THREE.Color('#87969c'), []);
  const sunDay = useMemo(() => new THREE.Color('#fff0d5'), []);
  const sunDusk = useMemo(() => new THREE.Color('#ffcc89'), []);
  const sky = useRef<THREE.ShaderMaterial>(null);
  useFrame(({ scene }) => {
    const w = worldAt(clock.current.now(), preview),
      sin = Math.sin(w.sunAngle),
      cos = Math.cos(w.sunAngle);
    const lighting = sceneLighting(w.daylight, w.sunAngle, w.rain + w.snow);
    if (sky.current) {
      sky.current.uniforms.daylight.value = w.daylight;
      sky.current.uniforms.wet.value = w.rain + w.snow;
      sky.current.uniforms.golden.value = lighting.golden;
    }
    sun.current?.position.set(-cos * 105, sin * 78, -170);
    moon.current?.position.set(-cos * 105, -sin * 100, -170);
    if (light.current) {
      light.current.position.set(-cos * 60, Math.max(12, sin * 45), -40);
      light.current.intensity = lighting.sunlight;
      light.current.color.copy(sunDay).lerp(sunDusk, lighting.golden);
    }
    if (ambient.current) ambient.current.intensity = lighting.fill;
    color.current
      .set('#142638')
      .lerp(
        skyDusk,
        Math.max(0, 1 - Math.abs(sin) * 3) * 0.7,
      )
      .lerp(skyDay, w.daylight * 0.9);
    color.current.lerp(skyWet, (w.rain + w.snow) * 0.5);
    scene.background = color.current;
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.color.copy(color.current);
      scene.fog.near = lighting.fogNear;
      scene.fog.far = lighting.fogFar;
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
          uniforms={{ daylight: { value: 1 }, wet: { value: 0 }, golden: { value: 0 } }}
          vertexShader={
            'varying vec3 direction; void main(){ direction = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }'
          }
          fragmentShader={
            'varying vec3 direction; uniform float daylight; uniform float wet; uniform float golden; void main(){ float h = smoothstep(0.0,0.65,normalize(direction).y); vec3 horizon = mix(vec3(0.89,0.79,0.62),vec3(1.0,0.59,0.29),golden); vec3 day = mix(horizon,vec3(0.32,0.51,0.68),h); vec3 night = mix(vec3(0.018,0.033,0.055),vec3(0.004,0.01,0.025),h); vec3 sky = mix(night,day,daylight); gl_FragColor = vec4(mix(sky,vec3(0.24,0.29,0.32),wet*0.45),1.0); }'
          }
        />
      </mesh>
      <fog attach="fog" args={['#a9c8cc', 90, 265]} />
      <mesh ref={sun}>
        <circleGeometry args={[6.5, 12]} />
        <meshBasicMaterial
          color={[8, 5.5, 2.5]}
          fog={false}
          toneMapped={false}
        />
        <mesh position={[0, 0, -1.1]}>
          <planeGeometry args={[65, 65]} />
          <shaderMaterial
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            vertexShader={
              'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }'
            }
            fragmentShader={
              'varying vec2 vUv; void main(){float a=pow(max(0.0,1.0-length(vUv-0.5)*2.0),3.0)*0.24;gl_FragColor=vec4(1.0,0.78,0.38,a); }'
            }
          />
        </mesh>
      </mesh>
      <mesh ref={moon}>
        <boxGeometry args={[12, 12, 2]} />
        <meshBasicMaterial color="#e0e8f4" fog={false} />
      </mesh>
      <hemisphereLight ref={ambient} args={['#d7e3e8', '#9a927a', 1]} />
      {/* Radius zero keeps hardware PCF filtering without the screen-space
          rotated sampling pattern that stippled the cabin's sunlit edges. */}
      <directionalLight
        ref={light}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-32}
        shadow-camera-right={32}
        shadow-camera-top={55}
        shadow-camera-bottom={-30}
        shadow-camera-far={180}
        shadow-normalBias={0.035}
        shadow-bias={-0.00015}
        shadow-radius={0}
      />
      <VoxelModel parts={clouds} shadows={false} />
    </>
  );
}

// Cockpit coordinates are relative to the fixed driver's eye position.
// Keep the horizon clear and all trim joined to the windshield surround.
function DashboardPanel({ radio = false, readDashboard }: { radio?: boolean; readDashboard?: () => DashboardState }) {
  const soundtrack = useContext(RadioContext);
  const bands = useRef(new Float32Array(9));
  const lastDraw = useRef(-Infinity);
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 240;
    const ctx = canvas.getContext('2d')!;
    if (radio) drawRadio(ctx, 'Joining the shared soundtrack', new Float32Array(9));
    else drawDashboard(ctx, dashboardState(0, null, true, false));
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.anisotropy = 8;
    return t;
  }, [radio]);
  useFrame(({ clock }) => {
    if (clock.elapsedTime - lastDraw.current < 1 / 15) return;
    lastDraw.current = clock.elapsedTime;
    const ctx = (texture.image as HTMLCanvasElement).getContext('2d')!;
    if (radio) {
      bands.current.fill(0);
      soundtrack?.player.current?.readSpectrum(bands.current);
      drawRadio(ctx, PLAYLIST[soundtrack?.track ?? 0]?.name || 'Music library not loaded', bands.current);
    } else {
      drawDashboard(ctx, readDashboard?.() ?? dashboardState(0, null, true, false));
    }
    texture.needsUpdate = true;
  });
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <group position={radio ? [0, -0.535, -1.359] : [0.83, -0.53, -1.488]}>
      <mesh>
        <planeGeometry args={radio ? [0.36, 0.1148] : [0.52, 0.235]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, 0.003]}>
        <planeGeometry args={radio ? [0.36, 0.1148] : [0.52, 0.235]} />
        <meshPhysicalMaterial
          color="#a6a88f"
          transparent
          opacity={radio ? 0.025 : 0.075}
          roughness={radio ? 0.65 : 0.28}
          clearcoat={radio ? 0.2 : 0.7}
          clearcoatRoughness={radio ? 0.6 : 0.2}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

export function VoxelCabin({
  environment,
  clock,
  readDashboard,
}: {
  environment: Environment;
  clock: SharedClock;
  readDashboard?: () => DashboardState;
}) {
  const wheel = useMemo(() => steeringWheelModel(), []);
  const cabinExposure = cabinLighting(environment.daylight, environment.rain + environment.snow);
  const dashboard = useMemo(() => cabinDashboardModel(), []);
  const padGeometry = useMemo(() => cabinPadGeometry(), []);
  const padSeamGeometry = useMemo(() => cabinPadGeometry(true), []);
  const bolsters = useMemo(() => [cabinBolsterGeometry(1), cabinBolsterGeometry(-1)], []);
  useEffect(
    () => () => {
      padGeometry.dispose();
      padSeamGeometry.dispose();
      bolsters.forEach((geometry) => geometry.dispose());
    },
    [padGeometry, padSeamGeometry, bolsters],
  );
  const wipers = useRef<(THREE.Group | null)[]>([]);
  const cabin = useRef<THREE.Group>(null);
  const cabinLightTarget = useMemo(() => {
    const target = new THREE.Object3D();
    target.position.set(-0.2, -0.7, -0.7);
    return target;
  }, []);
  const canopyLight = useMemo(() => {
    // A fixed, softly filtered canopy mask gives the stylized sun a little
    // variation. It is not regenerated per frame, so parked pixels stay stable.
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#444438';
    ctx.fillRect(0, 0, 256, 256);
    ctx.translate(256, 0);
    ctx.scale(-1, 1);
    ctx.filter = 'blur(1.2px)';
    for (let i = 0; i < 240; i++) {
      const n = Math.sin(i * 127.1 + 17.7) * 43758.5453;
      const random = n - Math.floor(n);
      ctx.fillStyle = `rgba(255, 255, 245, ${0.65 + random * 0.3})`;
      ctx.fillRect(
        (i * 47) % 250,
        (i * 79) % 250,
        5 + random * 10,
        3 + random * 6,
      );
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    return texture;
  }, []);
  useEffect(() => () => canopyLight.dispose(), [canopyLight]);
  const rear = useMemo(() => {
    const target = new THREE.WebGLRenderTarget(
      cabinMirror.targetWidth,
      cabinMirror.targetHeight,
    );
    const camera = new THREE.PerspectiveCamera(
      cabinMirror.verticalFov,
      cabinMirror.aspect,
      0.1,
      265,
    );
    camera.position.set(1.7, 2, 7);
    camera.lookAt(1.7, 2, 100);
    return { target, camera };
  }, []);
  const lastMirrorFrame = useRef(0);
  useEffect(() => () => rear.target.dispose(), [rear]);
  const { size } = useThree();
  const frameX = Math.max(1.2, (size.width / size.height) * 1.19);
  const surround = useMemo(() => cabinSurroundModel(frameX), [frameX]);
  const pillarParts = useMemo(() => [-1, 1].map(side => surround
    .filter(part => side * part.position[0] > frameX - 0.13)
    .map(part => ({ ...part, position: [part.position[0] - side * frameX,
      part.position[1] + 0.4, part.position[2] + 1.95] as [number, number, number] }))), [surround, frameX]);
  const fixedSurround = useMemo(() => surround.filter(part =>
    Math.abs(part.position[0]) <= frameX - 0.13), [surround, frameX]);
  useFrame(({ gl, scene, clock: renderClock }) => {
    // Refresh cadence must not stall when the shared clock is corrected.
    const now = renderClock.elapsedTime * 1000;
    if (cabin.current && now - lastMirrorFrame.current > 100) {
      lastMirrorFrame.current = now;
      const target = gl.getRenderTarget();
      const shadows = gl.shadowMap.autoUpdate;
      gl.shadowMap.autoUpdate = false;
      cabin.current.visible = false;
      try {
        gl.setRenderTarget(rear.target);
        gl.render(scene, rear.camera);
      } finally {
        gl.setRenderTarget(target);
        gl.shadowMap.autoUpdate = shadows;
        cabin.current.visible = true;
      }
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
      <DashboardPanel readDashboard={readDashboard} />
      <DashboardPanel radio />
      <VoxelModel parts={dashboard} cabin />
      <mesh
        geometry={padGeometry}
        position={[0, -0.53, -1.9]}
        castShadow
        receiveShadow
      >
        <CabinMaterial color="#a19a72" edgeWearStrength={1.6} topPaintStrength={0.3} vertexColors />
      </mesh>
      {[-0.32, 0.4].map((x) => (
        <mesh
          key={x}
          geometry={padSeamGeometry}
          position={[x, -0.487, -1.9]}
          castShadow
          receiveShadow
        >
          <CabinMaterial color="#4b503e" />
        </mesh>
      ))}
      <VoxelModel parts={fixedSurround} cabin />
      {/* Slim, continuous frame. Dark seals sit against the glass opening. */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <Block
            grain={false}
            position={[side * (frameX + 0.05), -0.67, -1.45]}
            scale={[0.32, 0.62, 1.1]}
            color="#60533c"
          />
          <Block
            grain={false}
            position={[side * frameX, -0.49, -1.48]}
            scale={[0.39, 0.085, 1.05]}
            color="#8a7955"
          />
          <group position={[side * frameX, -0.4, -1.95]} rotation={[0, 0, side * 0.045]}>
            <VoxelModel parts={pillarParts[side < 0 ? 0 : 1]} cabin edgeWearStrength={3} />
            <Block grain={false} position={[0, 0.48, -0.01]}
              scale={[0.13, 2.5, 0.18]} color="#6c4d35" />
          </group>
        </group>
      ))}
      <Block
        grain={false}
        position={[0, 1.25, -1.96]}
        scale={[frameX * 2 + 0.13, 0.25, 0.3]}
        color="#6c5238"
        wood
      />
      <Block
        grain={false}
        position={[0, 1.12, -1.97]}
        scale={[frameX * 2, 0.025, 0.08]}
        color="#303932"
      />
      {/* Small mirror tucked under the roof, outside the central road view. */}
      <Block
        grain={false}
        position={[0.045, 0.99, -1.88]}
        scale={[0.13, 0.32, 0.10]}
        color="#303932"
      />
      <Block
        grain={false}
        position={[0.045, 1.065, -1.79]}
        scale={[0.15, 0.13, 0.11]}
        color="#30332a"
      />
      <Block
        grain={false}
        position={[0.045, 0.79, -1.84]}
        scale={[0.73, 0.26, 0.085]}
        color="#37372c"
      />
      <mesh position={[0.045, 0.79, -1.791]} scale={[-1, 1, 1]}>
        <planeGeometry args={[cabinMirror.width, cabinMirror.height]} />
        <meshBasicMaterial
          map={rear.target.texture}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      <group
        position={wheelPosition}
        scale={wheelScale}
        rotation={wheelRotation}
      >
        <VoxelModel parts={wheel} cabin edgeWearStrength={3} matte />
      </group>
      {/* Upholstered foreground corners complete the enclosed car silhouette. */}
      {[-1.13, 1.31].map((x) => (
        <group
          key={x}
          position={x > 0 ? driverSeatPosition : [x, -0.98, -1.07456]}
          scale={x > 0 ? driverSeatScale : [1.06, 1.06, 1.166]}
        >
          <Block
            grain={false}
            fabric
            position={[0, 0, -0.11]}
            scale={[0.74, 0.46, 0.28]}
            color="#9e8d60"
          />
          <Block
            grain={false}
            fabric
            position={[0, 0.24, -0.13]}
            scale={[0.71, 0.06, 0.21]}
            color="#b7a16b"
            cushion
          />
          {[-0.355, 0.355].map((edge) => (
            <Block
              grain={false}
              fabric
              key={edge}
              position={[edge, 0.26, -0.13]}
              scale={[0.014, 0.018, 0.22]}
              color="#c0a477"
            />
          ))}
          <mesh geometry={bolsters[x < 0 ? 0 : 1]} castShadow receiveShadow>
            <CabinMaterial color="#9b8b5f" fabric vertexColors />
          </mesh>
        </group>
      ))}
      {/* The bonnet stays attached to the car, below the windshield sightline. */}
      <Block
        grain={false}
        position={[0, -0.62, -2.72]}
        scale={[3.8, 0.075, 1.12]}
        color="#ba9667"
      />
      {/* Each wiper pivots at its own mount; blades park along the dash. */}
      {[-1.35, -0.1].map((x, i) => (
        <group key={x} position={[x, -0.46, -2.12]}>
          <Block
            grain={false}
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
              grain={false}
              position={[i === 0 ? 0.14 : 0.27, 0.025, 0]}
              scale={[i === 0 ? 0.28 : 0.54, 0.015, 0.025]}
              color="#303932"
            />
            <Block
              grain={false}
              position={[i === 0 ? 0.16 : 0.47, 0.041, 0]}
              scale={[i === 0 ? 0.88 : 0.66, 0.018, 0.025]}
              color="#414336"
            />
          </group>
        </group>
      ))}
      <pointLight
        position={[0, -0.65, -1]}
        intensity={0.16 + (1 - environment.daylight) * 0.25}
        color="#ffcc8b"
        distance={3}
      />
      <pointLight
        position={[1.65, 1.4, -2.7]}
        intensity={cabinExposure.sunBounce}
        color="#ffe2ad"
        distance={5}
        decay={2}
      />
      <primitive object={cabinLightTarget} />
      <spotLight
        position={[1.6, 1.8, -3.1]}
        target={cabinLightTarget}
        map={canopyLight}
        intensity={cabinExposure.key}
        color="#ffdf9d"
        distance={7}
        angle={0.9}
        penumbra={0.65}
        decay={2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={0.1}
        shadow-camera-far={7}
        shadow-bias={-0.0001}
        shadow-normalBias={0.003}
      />
      <pointLight
        position={[-1.1, 0.1, -0.1]}
        intensity={cabinExposure.frontFill}
        color="#eee5ca"
        distance={3.5}
        decay={2}
      />
      <pointLight
        position={[frameX - 0.5, 0.25, -1.95]}
        intensity={environment.daylight * 0.28}
        color="#ffe0ad"
        distance={1.1}
        decay={2}
      />
      <rectAreaLight
        position={[0, 0.5, -1.6]}
        rotation={[Math.PI / 2, 0, 0]}
        width={3.5}
        height={1.4}
        intensity={cabinExposure.windowFill}
        color="#ffe0a9"
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
