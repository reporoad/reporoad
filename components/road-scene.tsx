'use client';

import { Component, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Plot } from '@/lib/world';

class SceneBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="scene-fallback">
        <strong>The 3D view couldn’t start.</strong>
        <p>
          Enable hardware acceleration or try another browser.
          <br />
          You can still use the plot editor below.
        </p>
      </div>
    ) : (
      this.props.children
    );
  }
}
function Box({
  position,
  scale,
  color,
  rotation,
}: {
  position: [number, number, number];
  scale: [number, number, number];
  color: string;
  rotation?: [number, number, number];
}) {
  return (
    <mesh
      position={position}
      scale={scale}
      rotation={rotation}
      castShadow
      receiveShadow
    >
      <boxGeometry />
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
  );
}
function Tree({
  position,
  scale = 1,
  pine = false,
}: {
  position: [number, number, number];
  scale?: number;
  pine?: boolean;
}) {
  return (
    <group position={position} scale={scale}>
      <Box position={[0, 1.1, 0]} scale={[0.27, 2.2, 0.27]} color="#796047" />
      <mesh position={[0, 2.4, 0]} castShadow>
        {pine ? (
          <coneGeometry args={[1.15, 3, 6]} />
        ) : (
          <icosahedronGeometry args={[1.4, 0]} />
        )}
        <meshStandardMaterial
          color={pine ? '#44674d' : '#719052'}
          flatShading
        />
      </mesh>
      {pine && (
        <mesh position={[0, 3.4, 0]} castShadow>
          <coneGeometry args={[0.85, 2.2, 6]} />
          <meshStandardMaterial color="#557857" flatShading />
        </mesh>
      )}
    </group>
  );
}
function Sign({ plot }: { plot: Plot }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 320;
    return new THREE.CanvasTexture(canvas);
  }, []);
  useEffect(() => {
    const canvas = texture.image as HTMLCanvasElement,
      ctx = canvas.getContext('2d')!;
    let cancelled = false;
    const draw = (logo?: HTMLImageElement) => {
      ctx.fillStyle = plot.status === 'available' ? '#e4edce' : '#f5eacb';
      ctx.fillRect(0, 0, 768, 320);
      ctx.strokeStyle = '#35523e';
      ctx.lineWidth = 7;
      ctx.strokeRect(14, 14, 740, 292);
      ctx.fillStyle = '#304834';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (logo) {
        const ratio = Math.min(130 / logo.width, 110 / logo.height);
        ctx.drawImage(
          logo,
          384 - (logo.width * ratio) / 2,
          30,
          logo.width * ratio,
          logo.height * ratio,
        );
      }
      const title =
        plot.status === 'available'
          ? `PLOT ${String(plot.id).padStart(2, '0')}`
          : plot.name;
      ctx.font = `bold ${title.length > 19 ? 36 : 46}px sans-serif`;
      ctx.fillText(title, 384, logo ? 185 : 115, 690);
      ctx.font = '25px sans-serif';
      ctx.fillText(
        plot.status === 'available'
          ? 'Your little place along the way'
          : plot.tagline,
        384,
        logo ? 237 : 185,
        690,
      );
      if (!logo) {
        ctx.font = '18px sans-serif';
        ctx.fillText(
          plot.status === 'available'
            ? 'AVAILABLE TO TRY'
            : `CHILLDRIVE · ${String(plot.id).padStart(2, '0')}`,
          384,
          252,
        );
      }
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
    };
    draw();
    if (plot.logo) {
      const image = new Image();
      image.onload = () => {
        if (!cancelled) draw(image);
      };
      image.src = plot.logo;
    }
    return () => {
      cancelled = true;
    };
  }, [plot.name, plot.tagline, plot.status, plot.id, plot.logo, texture]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={[0, 2.8, 2.15]} castShadow>
      <boxGeometry args={[4.3, 1.8, 0.15]} />
      <meshStandardMaterial map={texture} roughness={0.8} />
    </mesh>
  );
}
export function PlotBuilding({ plot }: { plot: Plot }) {
  const empty = plot.status === 'available';
  const billboard = plot.template === 'billboard' || empty;
  return (
    <group>
      <Box
        position={[0, -0.02, 0]}
        scale={[10, 0.15, 12]}
        color={empty ? '#a8b77b' : '#a5b67a'}
      />
      <Box position={[0, 0.08, 4.2]} scale={[3.2, 0.05, 3.5]} color="#d5c8a5" />
      {billboard ? (
        <>
          <Box
            position={[-1.5, 1.4, 2.1]}
            scale={[0.17, 2.8, 0.2]}
            color="#765e47"
          />
          <Box
            position={[1.5, 1.4, 2.1]}
            scale={[0.17, 2.8, 0.2]}
            color="#765e47"
          />
        </>
      ) : (
        <>
          <Box
            position={[0, 1.45, -0.4]}
            scale={[5.8, 2.9, 4.3]}
            color={plot.color}
          />
          {plot.template === 'cabin' ? (
            <mesh
              position={[0, 3.45, -0.4]}
              rotation={[0, Math.PI / 4, 0]}
              castShadow
            >
              <coneGeometry args={[4.4, 2.5, 4]} />
              <meshStandardMaterial color="#5e6e57" flatShading />
            </mesh>
          ) : (
            <Box
              position={[0, 3.06, -0.4]}
              scale={[6.4, 0.35, 4.9]}
              color={plot.template === 'garage' ? '#586c65' : '#5c7154'}
            />
          )}
          <Box
            position={[0, 1.05, 1.8]}
            scale={[1.1, 2.1, 0.08]}
            color="#37574b"
          />
          {[-1.95, 1.95].map((x) => (
            <group key={x}>
              <Box
                position={[x, 1.35, 1.79]}
                scale={[1.5, 1.6, 0.08]}
                color="#eaddb7"
              />
              <Box
                position={[x, 1.35, 1.85]}
                scale={[1.3, 1.4, 0.06]}
                color="#75969a"
              />
              <Box
                position={[x, 1.35, 1.9]}
                scale={[0.07, 1.45, 0.08]}
                color="#f1dfb5"
              />
            </group>
          ))}
          {plot.template === 'cafe' &&
            Array.from({ length: 8 }, (_, i) => (
              <Box
                key={i}
                position={[-2.45 + i * 0.7, 2.37, 2.35]}
                scale={[0.7, 0.13, 1.25]}
                rotation={[0.14, 0, 0]}
                color={i % 2 ? '#ede2bd' : plot.color}
              />
            ))}
          {plot.template === 'garage' && (
            <Box
              position={[0, 1.05, 1.93]}
              scale={[2.5, 2.0, 0.1]}
              color="#a3afa0"
            />
          )}
        </>
      )}
      <group
        position={billboard ? [0, 0, 0] : [0, 2, -0.4]}
        scale={billboard ? 1 : 0.7}
      >
        <Sign plot={plot} />
      </group>
      {Array.from({ length: plot.plants }, (_, i) => (
        <Tree
          key={i}
          position={[i % 2 ? 3.8 : -3.8, 0.1, -3.8 + Math.floor(i / 2) * 3]}
          scale={0.65 + (i % 2) * 0.15}
          pine={plot.template === 'cabin'}
        />
      ))}
      {[-4.7, 4.7].map((x) => (
        <group key={x}>
          {[-4.5, -1.5, 1.5, 4.5].map((z) => (
            <Box
              key={z}
              position={[x, 0.5, z]}
              scale={[0.15, 1, 0.15]}
              color="#dfd5b0"
            />
          ))}
          <Box
            position={[x, 0.7, 0]}
            scale={[0.12, 0.13, 9.5]}
            color="#dfd5b0"
          />
        </group>
      ))}
      {plot.template === 'garden' &&
        !empty &&
        [-1, 1].map((x) => (
          <group key={x} position={[x * 1.6, 0, 3.8]}>
            <Box
              position={[0, 0.3, 0]}
              scale={[1.2, 0.5, 1.3]}
              color="#957556"
            />
            {[-0.3, 0.3].map((z) => (
              <mesh key={z} position={[z, 0.65, z]}>
                <icosahedronGeometry args={[0.4, 0]} />
                <meshStandardMaterial color="#7b9860" />
              </mesh>
            ))}
          </group>
        ))}
    </group>
  );
}
function World({
  plots,
  playing,
  night,
  focus,
}: {
  plots: Plot[];
  playing: boolean;
  night: boolean;
  focus: { id: number; key: number } | null;
}) {
  const stages = useRef<(THREE.Group | null)[]>([]);
  const markers = useRef<(THREE.Mesh | null)[]>([]);
  const distance = useRef(0);
  const { camera } = useThree();
  useEffect(() => {
    camera.lookAt(0, 2.4, -70);
  }, [camera]);
  useEffect(() => {
    if (focus) distance.current = Math.floor((focus.id - 1) / 2) * 32;
  }, [focus]);
  useFrame((_, delta) => {
    if (playing)
      distance.current = (distance.current + Math.min(delta, 0.05) * 6.5) % 384;
    stages.current.forEach((g, i) => {
      if (g) g.position.z = 20 - ((i * 32 - distance.current + 384) % 384);
    });
    markers.current.forEach((m, i) => {
      if (m) m.position.z = 16 - ((i * 10 - distance.current + 400) % 400);
    });
  });
  return (
    <>
      <color attach="background" args={[night ? '#263d52' : '#d5dfd0']} />
      <fog attach="fog" args={[night ? '#263d52' : '#d5dfd0', 65, 235]} />
      <ambientLight intensity={night ? 0.8 : 1.5} />
      <directionalLight
        position={[-25, 45, -40]}
        intensity={night ? 0.55 : 2.5}
        color={night ? '#aac8ef' : '#fff1cb'}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
        shadow-camera-far={180}
        shadow-normalBias={0.08}
      />
      <Box
        position={[0, -0.3, -175]}
        scale={[700, 0.3, 700]}
        color={night ? '#536958' : '#a5b983'}
      />
      <Box
        position={[0, -0.09, -180]}
        scale={[12.3, 0.13, 430]}
        color="#d4c6a3"
      />
      <Box
        position={[0, 0.005, -180]}
        scale={[10, 0.05, 430]}
        color="#70766b"
      />
      {[-4.6, 4.6].map((x) => (
        <Box
          key={x}
          position={[x, 0.04, -180]}
          scale={[0.1, 0.01, 430]}
          color="#e7e5c8"
        />
      ))}
      {Array.from({ length: 40 }, (_, i) => (
        <mesh
          ref={(m) => {
            markers.current[i] = m;
          }}
          key={i}
          position={[0, 0.04, -i * 10]}
        >
          <boxGeometry args={[0.12, 0.015, 3.8]} />
          <meshStandardMaterial color="#e7dfb7" />
        </mesh>
      ))}
      {Array.from({ length: 12 }, (_, i) => (
        <group
          key={i}
          ref={(g) => {
            stages.current[i] = g;
          }}
          position={[0, 0, -i * 32]}
        >
          <group position={[-12.5, 0, -30]} rotation={[0, 0.22, 0]}>
            <PlotBuilding plot={plots[i * 2]} />
          </group>
          <group position={[12.5, 0, -30]} rotation={[0, -0.22, 0]}>
            <PlotBuilding plot={plots[i * 2 + 1]} />
          </group>
          {[-1, 1].map((side) => (
            <group key={side}>
              <Tree position={[side * 8.5, 0, -13]} scale={1.15} />
              <Tree
                position={[side * (21 + (i % 3)), 0, -20]}
                scale={1.5}
                pine
              />
              <Tree position={[side * 29, 0, -6]} scale={2} pine />
            </group>
          ))}
        </group>
      ))}
      {Array.from({ length: 11 }, (_, i) => (
        <mesh
          key={i}
          position={[(i - 5) * 40, 8, -240 - (i % 3) * 25]}
          scale={[1.4, 0.7 + (i % 3) * 0.15, 1]}
        >
          <icosahedronGeometry args={[40 + (i % 4) * 8, 1]} />
          <meshStandardMaterial
            color={i % 2 ? '#879f89' : '#96aa90'}
            flatShading
          />
        </mesh>
      ))}
      <mesh position={[-62, 52, -170]}>
        <sphereGeometry args={[12, 24, 16]} />
        <meshBasicMaterial color={night ? '#e0e9d5' : '#fff1c2'} />
      </mesh>
      <Box position={[0, 0.62, 5]} scale={[3.6, 0.18, 2.6]} color="#314941" />
      <Box position={[0, 0.73, 4.4]} scale={[3.2, 0.04, 0.1]} color="#829488" />
    </>
  );
}
export default function RoadScene(props: {
  plots: Plot[];
  playing: boolean;
  night: boolean;
  focus: { id: number; key: number } | null;
}) {
  return (
    <figure
      className="scene"
      aria-label="A moving 3D countryside road with customisable shops and plots on both sides"
    >
      <SceneBoundary>
        <Canvas
          shadows
          dpr={[1, 1.5]}
          camera={{ position: [1.7, 2.25, 7], fov: 62, near: 0.1, far: 450 }}
          gl={{ antialias: true }}
        >
          <World {...props} />
        </Canvas>
      </SceneBoundary>
    </figure>
  );
}
export function PlotPreview({ plot }: { plot: Plot }) {
  return (
    <SceneBoundary>
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ position: [11, 8, 14], fov: 40 }}
        onCreated={({ camera }) => camera.lookAt(0, 1.3, 0)}
      >
        <color attach="background" args={['#c9d8b4']} />
        <ambientLight intensity={1.7} />
        <directionalLight position={[10, 20, 10]} intensity={2} />
        <PlotBuilding plot={plot} />
      </Canvas>
    </SceneBoundary>
  );
}
