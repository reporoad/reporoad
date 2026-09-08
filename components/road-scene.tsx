'use client';

import {
  Component,
  memo,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Plot } from '@/lib/world';
import { vergeModel, shopDetailModel } from '@/lib/voxel-models';
import VoxelModel from './voxel-model';
import {
  ROAD_LENGTH,
  SECTION_SPACING,
  roadSectionZ,
  roadMarkerZ,
} from '@/lib/road';
import {
  voxelGrain,
  RoadLandscape,
  RoadsideVerge,
  LandscapeTree as Tree,
} from './landscape';
import {
  SkyCycle,
  VoxelCabin,
  Wildlife,
  RoadsideAnimal,
  Precipitation,
  type Environment,
  type SharedClock,
} from './living-world';
import { worldAt, type WorldPreview } from '@/lib/live-world';
import SceneFinish from './scene-finish';
import RepositoryBuilding from './repository-building';
import type { Repository } from '@/lib/repositories';
import { chickenCycle, type CrossingSchedule } from '@/lib/chickens';
import ChickenCrossing from './chicken-crossing';
import { dashboardState } from '@/lib/dashboard';

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
          This source needs a browser with working WebGL graphics.
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
      <meshStandardMaterial color={color} map={voxelGrain} roughness={0.95} />
    </mesh>
  );
}
function StaticVoxels({
  children,
  plot,
  season,
}: {
  children: ReactNode;
  plot: Plot;
  season: string;
}) {
  const root = useRef<THREE.Group>(null);
  useEffect(() => {
    const group = root.current;
    if (!group) return;
    group.updateWorldMatrix(true, true);
    const boxes: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>[] =
      [];
    group.traverse((object) => {
      const mesh = object as THREE.Mesh<
        THREE.BoxGeometry,
        THREE.MeshStandardMaterial
      >;
      if (
        mesh.isMesh &&
        !(mesh as unknown as THREE.InstancedMesh).isInstancedMesh &&
        mesh.geometry.type === 'BoxGeometry' &&
        mesh.material.map === voxelGrain
      )
        boxes.push(mesh);
    });
    if (!boxes.length) return;
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshStandardMaterial({
      map: voxelGrain,
      roughness: 0.95,
    });
    const batch = new THREE.InstancedMesh(geometry, material, boxes.length);
    const inverse = group.matrixWorld.clone().invert();
    boxes.forEach((mesh, i) => {
      batch.setMatrixAt(
        i,
        new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld),
      );
      batch.setColorAt(i, mesh.material.color);
      mesh.visible = false;
    });
    batch.castShadow = true;
    batch.receiveShadow = true;
    batch.computeBoundingSphere();
    group.add(batch);
    return () => {
      group.remove(batch);
      boxes.forEach((mesh) => {
        mesh.visible = true;
      });
      geometry.dispose();
      material.dispose();
      batch.dispose();
    };
  }, [plot, season]);
  return <group ref={root}>{children}</group>;
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
      ctx.fillStyle = plot.status === 'available' ? '#34432f' : '#3e4931';
      ctx.fillRect(0, 0, 768, 320);
      ctx.strokeStyle = '#ab8651';
      ctx.lineWidth = 7;
      ctx.strokeRect(14, 14, 740, 292);
      ctx.fillStyle = '#eed9a4';
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
      ctx.font = `bold ${title.length > 19 ? 68 : 88}px monospace`;
      ctx.fillText(title, 384, logo ? 185 : 112, 690);
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
function ShopFlowers({ season, seed }: { season: string; seed: number }) {
  const parts = useMemo(
    () =>
      vergeModel(season, seed).map((part) => ({
        ...part,
        position: [
          Math.sign(part.position[0]) *
            (2.8 + (Math.abs(part.position[0]) - 5.1) * 0.6),
          part.position[1] + 0.68,
          3.8 + part.position[2] * 0.02,
        ] as [number, number, number],
      })),
    [season, seed],
  );
  return <VoxelModel parts={parts} shadows={false} />;
}

export const PlotBuilding = memo(function PlotBuilding({
  plot,
  season = 'Summer',
}: {
  plot: Plot;
  season?: string;
}) {
  const empty = plot.status === 'available';
  const billboard = plot.template === 'billboard' || empty;
  const details = useMemo(
    () => shopDetailModel(plot.id, season),
    [plot.id, season],
  );
  return (
    <StaticVoxels plot={plot} season={season}>
      <Box
        position={[0, -0.02, 0]}
        scale={[10, 0.15, 12]}
        color={
          season === 'Winter'
            ? '#dfe5d8'
            : season === 'Autumn'
              ? '#a89850'
              : empty
                ? '#969b53'
                : '#939a50'
        }
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
          <Box
            position={[0, 0.14, -0.4]}
            scale={[6.15, 0.3, 4.65]}
            color="#a59e8d"
          />
          {plot.template === 'cabin' || plot.template === 'cafe' ? (
            <>
              {Array.from({ length: 10 }, (_, i) => (
                <Box
                  key={i}
                  position={[0, 3.05 + i * 0.16, -0.4]}
                  scale={[6.8 - i * 0.6, 0.16, 5.2]}
                  color={
                    plot.template === 'cabin'
                      ? i % 2
                        ? '#6b5842'
                        : '#78654a'
                      : i % 2
                        ? '#616b51'
                        : '#75805a'
                  }
                />
              ))}
              <Box
                position={[1.8, 3.9, -1.6]}
                scale={[0.52, 1.2, 0.62]}
                color="#817569"
              />
            </>
          ) : (
            <Box
              position={[0, 3.06, -0.4]}
              scale={[6.4, 0.25, 4.9]}
              color="#5b625d"
            />
          )}
          {plot.template === 'cabin' &&
            Array.from({ length: 10 }, (_, i) => (
              <Box
                key={i}
                position={[0, 0.35 + i * 0.25, 1.765]}
                scale={[5.8, 0.018, 0.035]}
                color="#7e6c55"
              />
            ))}
          <Box
            position={[0, 0.15, 2.1]}
            scale={[1.6, 0.3, 0.85]}
            color="#b7b3a4"
          />
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
              <mesh position={[x, 1.35, 1.85]}>
                <boxGeometry args={[1.3, 1.4, 0.06]} />
                <meshStandardMaterial
                  color="#8a794f"
                  roughness={0.65}
                  metalness={0}
                  emissive="#d0a75a"
                  emissiveIntensity={0.28}
                />
              </mesh>
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
                rotation={[0, 0, 0]}
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
        position={billboard ? [0, 0, 0] : [0, 1.9, 0.3]}
        scale={billboard ? [0.72, 1.1, 1] : [1.22, 0.55, 1]}
      >
        <Sign plot={plot} />
      </group>
      {Array.from({ length: plot.plants }, (_, i) => (
        <Tree
          key={i}
          position={[i % 2 ? 3.8 : -3.8, 0.1, -3.8 + Math.floor(i / 2) * 3]}
          scale={0.65 + (i % 2) * 0.15}
          pine={plot.template === 'cabin'}
          season={season}
        />
      ))}
      {[-4.7, 4.7].map((x) => (
        <group key={x}>
          {[-4.5, -1.5, 1.5, 4.5].map((z) => (
            <Box
              key={z}
              position={[x, 0.5, z]}
              scale={[0.15, 1, 0.15]}
              color="#967449"
            />
          ))}
          <Box
            position={[x, 0.7, 0]}
            scale={[0.12, 0.13, 9.5]}
            color="#967449"
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
                <boxGeometry args={[0.65, 0.65, 0.65]} />
                <meshStandardMaterial color="#7b9860" />
              </mesh>
            ))}
          </group>
        ))}
      {!billboard && (
        <group>
          <VoxelModel parts={details} />
          <ShopFlowers season={season} seed={plot.id} />
          {/* Timber veranda, deep eaves and flower boxes soften each shop. */}
          {[-2.85, -0.7, 0.7, 2.85].map((x) => (
            <Box
              key={x}
              position={[x, 1.45, 1.84]}
              scale={[0.14, 2.8, 0.12]}
              color="#715636"
            />
          ))}
          {[0.32, 2.75].map((y) => (
            <Box
              key={y}
              position={[0, y, 1.84]}
              scale={[5.9, 0.15, 0.12]}
              color="#856841"
            />
          ))}
          {[-1.95, 1.95].map((x) => (
            <group key={x}>
              <Box
                position={[x, 1.35, 1.94]}
                scale={[1.35, 0.06, 0.06]}
                color="#a28756"
              />
              <Box
                position={[x, 0.56, 2]}
                scale={[1.75, 0.12, 0.3]}
                color="#9c7f4f"
              />
              {[-0.37, 0.37].map((dx) => (
                <Box
                  key={dx}
                  position={[x + dx, 1.35, 1.94]}
                  scale={[0.035, 1.4, 0.06]}
                  color="#a28756"
                />
              ))}
            </group>
          ))}
          <Box
            position={[0, 1.4, 1.87]}
            scale={[0.68, 0.86, 0.04]}
            color="#b2965f"
          />
          <Box
            position={[0, 1.4, 1.9]}
            scale={[0.035, 0.88, 0.04]}
            color="#74593b"
          />
          <Box
            position={[0, 1.4, 1.9]}
            scale={[0.68, 0.035, 0.04]}
            color="#74593b"
          />
          <Box
            position={[0.4, 0.92, 1.9]}
            scale={[0.07, 0.07, 0.1]}
            color="#c2a36c"
          />
          {Array.from({ length: 13 }, (_, i) => (
            <Box
              key={i}
              position={[-3 + i * 0.5, 2.58, 3.55]}
              scale={[0.46, 0.16, 0.25]}
              color={i % 3 ? '#96914f' : '#a39c5a'}
            />
          ))}
          {[-2.8, 2.8].map((x) => (
            <group key={x}>
              <Box
                position={[x, 2.02, 3.15]}
                scale={[0.4, 0.46, 0.36]}
                color="#59462d"
              />
              <Box
                position={[x, 2.02, 3.35]}
                scale={[0.25, 0.3, 0.04]}
                color="#e7ba6b"
              />
              <Box
                position={[x, 2.02, 3.38]}
                scale={[0.035, 0.31, 0.04]}
                color="#725533"
              />
            </group>
          ))}
          <Box
            position={[0, 0.13, 2.8]}
            scale={[6.5, 0.24, 2]}
            color="#9c825c"
          />
          <Box
            position={[0, 2.55, 2.65]}
            scale={[6.7, 0.17, 2]}
            color="#6b7046"
          />
          {[-2.8, 2.8].map((x) => (
            <group key={x}>
              <Box
                position={[x, 1.3, 3.3]}
                scale={[0.18, 2.5, 0.18]}
                color="#78603b"
              />
              <Box
                position={[x, 2.22, 3.1]}
                scale={[0.25, 0.32, 0.25]}
                color="#e9b968"
              />
              <Box
                position={[x, 0.4, 3.65]}
                scale={[1.45, 0.55, 0.7]}
                color="#8e6a3e"
              />
              {Array.from({ length: 9 }, (_, i) => (
                <group key={i}>
                  <Box
                    position={[
                      x - 0.55 + (i % 3) * 0.5,
                      0.8 + (i % 2) * 0.13,
                      3.4 + Math.floor(i / 3) * 0.2,
                    ]}
                    scale={[0.1, 0.4, 0.1]}
                    color="#64783a"
                  />
                  <Box
                    position={[
                      x - 0.55 + (i % 3) * 0.5,
                      1 + (i % 2) * 0.13,
                      3.4 + Math.floor(i / 3) * 0.2,
                    ]}
                    scale={[0.22, 0.13, 0.22]}
                    color={['#d7b084', '#b5a1be', '#e2d2a9'][i % 3]}
                  />
                </group>
              ))}
            </group>
          ))}
          {Array.from({ length: 8 }, (_, i) => (
            <Box
              key={i}
              position={[-2.5 + i * 0.72, 0.1, 3]}
              scale={[0.65, 0.06, 1.65]}
              color={i % 2 ? '#9a7d50' : '#a5895c'}
            />
          ))}
        </group>
      )}
    </StaticVoxels>
  );
});
function World({
  plots,
  repositories,
  playing,
  environment,
  clock,
  live,
  preview,
  focus,
  onPassing,
  chickenSchedule,
  supportPreview,
}: {
  plots: Plot[];
  repositories?: Repository[];
  playing: boolean;
  environment: Environment;
  clock: SharedClock;
  live: boolean;
  preview?: WorldPreview;
  focus: { id: number; key: number } | null;
  onPassing?: (names: string[]) => void;
  chickenSchedule?: CrossingSchedule | null;
  supportPreview?: boolean;
}) {
  const lastPassing = useRef('');
  const stages = useRef<(THREE.Group | null)[]>([]);
  const repositoryStages = useRef<(THREE.Group | null)[]>([]);
  const repositoryLoop = Math.max(
    ROAD_LENGTH,
    Math.ceil((repositories?.length || 0) / 2) * SECTION_SPACING,
  );
  const markers = useRef<(THREE.Mesh | null)[]>([]);
  const distance = useRef(supportPreview ? 10 : 0);
  const { camera } = useThree();
  useEffect(() => {
    camera.lookAt(1.7, -7.75, -100);
  }, [camera]);
  useEffect(() => {
    if (focus && !live)
      distance.current = Math.floor((focus.id - 1) / 2) * SECTION_SPACING + 22;
  }, [focus, live]);
  useFrame((_, delta) => {
    if (live) distance.current = chickenCycle(clock.current.now(), chickenSchedule).distance;
    else if (playing)
      distance.current = distance.current + Math.min(delta, 0.05) * 6.5;
    stages.current.forEach((g, i) => {
      if (g) g.position.z = roadSectionZ(i, distance.current);
    });
    markers.current.forEach((m, i) => {
      if (m) m.position.z = roadMarkerZ(i, distance.current);
    });
    repositoryStages.current.forEach((g, i) => {
      if (!g) return;
      g.position.z =
        roadSectionZ(Math.floor(i / 2), distance.current, repositoryLoop) - 30;
      g.visible = g.position.z > -310 && g.position.z < 50;
    });
    const nearby = (repositories || []).filter((_, i) => {
      const z = roadSectionZ(Math.floor(i / 2), distance.current, repositoryLoop) - 30;
      return z > -25 && z <= 7;
    }).map((r) => r.fullName);
    const key = nearby.join('|');
    if (key !== lastPassing.current) {
      lastPassing.current = key;
      onPassing?.(nearby);
    }
  });
  return (
    <>
      <SkyCycle clock={clock} preview={live ? undefined : preview} />
      <RoadLandscape
        night={environment.daylight < 0.3}
        distance={distance}
        season={environment.season}
      />
      <Wildlife environment={environment} clock={clock} />
      <ChickenCrossing clock={clock} schedule={chickenSchedule} live={live} />
      <Precipitation environment={environment} clock={clock} />
      {Array.from({ length: 48 }, (_, i) => (
        <mesh
          ref={(m) => {
            markers.current[i] = m;
          }}
          key={i}
          position={[0, 0.02, roadMarkerZ(i, 0)]}
        >
          <boxGeometry args={[0.14, 0.01, 3.5]} />
          <meshStandardMaterial color="#ded8b5" />
        </mesh>
      ))}
      {Array.from({ length: 12 }, (_, i) => (
        <group
          key={i}
          ref={(g) => {
            stages.current[i] = g;
          }}
          position={[0, 0, roadSectionZ(i, 0)]}
        >
          <RoadsideVerge season={environment.season} seed={i} />
          <group position={[-10, 0, -30]} scale={[1, 1.25, 1]}>
            {!repositories && (
              <PlotBuilding plot={plots[i * 2]} season={environment.season} />
            )}
          </group>
          <group position={[10, 0, -30]} scale={[1, 1.25, 1]}>
            {!repositories && (
              <PlotBuilding
                plot={plots[i * 2 + 1]}
                season={environment.season}
              />
            )}
          </group>
          {i % 3 === 0 && <RoadsideAnimal clock={clock} index={i} />}
          {[-1, 1].map((side) => (
            <group key={side}>
              <Tree
                position={[side * (8.5 + (i % 3) * 1.1), 0, -13 + (i % 3) * 2]}
                scale={1.35 + (i % 4) * 0.16}
                season={environment.season}
              />
              <Tree
                position={[side * (21 + (i % 3)), 0, -20]}
                scale={2.2}
                pine
                season={environment.season}
              />
              <Tree
                position={[side * 34, 0, -6]}
                scale={1.8}
                pine
                season={environment.season}
              />
            </group>
          ))}
        </group>
      ))}
      {repositories?.map((repo, i) => (
        <group
          key={repo.fullName}
          ref={(g) => {
            repositoryStages.current[i] = g;
          }}
          position={[
            i % 2 ? 10 : -10,
            0,
            roadSectionZ(Math.floor(i / 2), distance.current, repositoryLoop) -
              30,
          ]}
          scale={[1, 1.25, 1]}
        >
          <RepositoryBuilding repo={repo} season={environment.season} side={i % 2 ? 'right' : 'left'} supportPreview={supportPreview} />
        </group>
      ))}
      <VoxelCabin environment={environment} clock={clock} preview={preview} readDashboard={() => dashboardState(clock.current.now(), chickenSchedule, live, playing)} />
    </>
  );
}
export default function RoadScene(props: {
  supportPreview?: boolean;
  plots: Plot[];
  repositories?: Repository[];
  playing: boolean;
  environment: Environment;
  clock: SharedClock;
  live: boolean;
  preview?: WorldPreview;
  focus: { id: number; key: number } | null;
  onPassing?: (names: string[]) => void;
  chickenSchedule?: CrossingSchedule | null;
}) {
  return (
    <figure
      className="scene"
      aria-label="A moving 3D road through a voxel town of GitHub repository buildings"
    >
      <SceneBoundary>
        <Canvas
          fallback={<div className="scene-fallback"><strong>RepoRoad needs WebGL to render the drive.</strong><p>This browser source does not provide a compatible 3D renderer.</p></div>}
          shadows="percentage"
          dpr={[1, 2]}
          camera={{ position: [1.7, 1.9, 7], fov: 68, near: 0.1, far: 500 }}
          gl={{
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.22,
          }}
        >
          <World {...props} />
          <SceneFinish />
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
