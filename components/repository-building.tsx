'use client';
import { memo, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import {
  repositoryFloors,
  repositorySignLines,
  type Repository,
} from '@/lib/repositories';
import type { VoxelPart } from '@/lib/voxel-models';
import VoxelModel from './voxel-model';
import { loadOwnerAvatar } from '@/lib/owner-avatar';
import RepositorySupport from './repository-support';

export function repositoryBuildingModel(
  repo: Repository,
  season: string,
): VoxelPart[] {
  const parts: VoxelPart[] = [];
  const add = (
    position: VoxelPart['position'],
    size: VoxelPart['size'],
    color: string,
  ) => parts.push({ position, size, color });
  const floors = repositoryFloors(repo.stars),
    floorHeight = 2.4;
  const timber = repo.building.style === 'woodland';
  const stone = repo.building.style === 'stone';
  const glass = repo.building.style === 'greenhouse';
  const townhouse = repo.building.style === 'townhouse';
  const frame = timber ? '#57462f' : stone ? '#697267' : '#684b3d';
  const trim = timber ? '#af9462' : stone ? '#b5b8a2' : '#c29f79';
  add(
    [0, -0.08, 0],
    [10, 0.14, 12],
    season === 'Winter' ? '#d2d9ca' : '#7c8a4d',
  );
  add([0, 0.05, 3.8], [2, 0.15, 4.4], '#b8a887');
  add([0, 0.12, -0.3], [6.2, 0.3, 5.2], '#8e8e7a');
  for (let floor = 0; floor < floors; floor++) {
    const y = 0.3 + floor * floorHeight;
    const width = 5.8 - (floor >= 12 ? 0.7 : floor >= 6 ? 0.35 : 0);
    add([0, y + 1.2, -0.3], [width, 2.4, 4.6], repo.building.color);
    add([0, y + 2.28, -0.3], [width + 0.2, 0.18, 4.8], frame);
    if (glass) {
      add([0, y + 1.2, 2.04], [width - 0.3, 1.9, 0.08], '#779e98');
      for (const side of [-1, 1])
        add(
          [side * (width / 2 + 0.03), y + 1.2, -0.3],
          [0.06, 1.9, 4.1],
          '#779e98',
        );
    }
    if (townhouse || repo.building.style === 'brick')
      for (let row = 0; row < (townhouse ? 3 : 6); row++)
        add(
          [0, y + 0.2 + row * (townhouse ? 0.8 : 0.4), 2.025],
          [width, 0.045, 0.08],
          trim,
        );
    if (townhouse && floor > 0) {
      add([0, y + 0.1, 2.5], [4.4, 0.16, 1], trim);
      add([0, y + 0.75, 2.9], [4.4, 0.1, 0.1], frame);
      for (let i = -2; i <= 2; i++)
        add([i, y + 0.4, 2.9], [0.07, 0.7, 0.07], frame);
    }
    for (const x of [-width / 2 + 0.09, 0, width / 2 - 0.09])
      add([x, y + 1.15, 2.055], [0.16, 2.25, 0.13], frame);
    if (timber)
      for (let row = 0; row < 7; row++)
        for (const side of [-1, 1])
          add(
            [side * (width / 2 + 0.025), y + 0.3 + row * 0.28, -0.3],
            [0.07, 0.035, 4.6],
            trim,
          );
    for (const x of [-1.65, 1.65]) {
      add([x, y + 1.2, 2.065], [1.35, 1.55, 0.11], trim);
      add(
        [x, y + 1.2, 2.13],
        [1.12, 1.3, 0.04],
        floor % 3 === 1 ? '#bcaa6d' : '#d2b46d',
      );
      add([x, y + 1.2, 2.175], [0.07, 1.4, 0.065], frame);
      add([x, y + 1.2, 2.175], [1.18, 0.07, 0.065], frame);
      add([x, y + 0.43, 2.18], [1.5, 0.14, 0.32], trim);
    }
    // Side windows let the building stay legible while passing it.
    for (const side of [-1, 1])
      for (const z of [-1.5, 0.8]) {
        add([side * (width / 2 + 0.055), y + 1.2, z], [0.12, 1.35, 1.08], trim);
        add(
          [side * (width / 2 + 0.13), y + 1.2, z],
          [0.045, 1.1, 0.86],
          '#aeb493',
        );
        add([side * (width / 2 + 0.16), y + 1.2, z], [0.07, 1.13, 0.06], frame);
      }
  }
  const roofY = 0.3 + floors * floorHeight;
  if (repo.building.roof === 'gable')
    for (let step = 0; step < 8; step++)
      add([0, roofY + step * 0.18, -0.3], [6.3 - step * 0.7, 0.2, 5.1], frame);
  else {
    add([0, roofY, -0.3], [6.2, 0.2, 5.1], frame);
    for (const x of [-2.9, 2.9])
      add([x, roofY + 0.28, -0.3], [0.2, 0.5, 5], trim);
  }
  add([0, 1.05, 2.08], [0.85, 1.95, 0.17], '#344b3c');
  add([0.3, 1.1, 2.19], [0.07, 0.07, 0.08], '#cbb36f');
  add([0, 2.45, 3], [6.3, 0.2, 1.8], frame);
  for (const x of [-2.8, 2.8]) {
    add([x, 1.25, 3.6], [0.17, 2.5, 0.17], frame);
    if (repo.building.garden === false) continue;
    add([x, 0.32, 4.1], [1.2, 0.5, 0.72], '#80603d');
    for (let i = 0; i < 5; i++) {
      add([x - 0.4 + i * 0.2, 0.72, 4.1], [0.09, 0.35, 0.09], '#778d44');
      add(
        [x - 0.4 + i * 0.2, 0.94, 4.1],
        [0.18, 0.13, 0.18],
        i % 2 ? '#b4a0b8' : '#d8c18c',
      );
    }
  }
  if (repo.building.style === 'cafe') {
    for (let i = 0; i < 12; i++) {
      add([-2.75 + i * 0.5, 2.55, 3.2], [0.5, 0.16, 2.2], i % 2 ? '#f1ddba' : '#ad5542');
      add([-2.75 + i * 0.5, 2.37, 4.25], [0.5, 0.3, 0.12], i % 2 ? '#f1ddba' : '#ad5542');
    }
  }
  return parts;
}

export default memo(function RepositoryBuilding({
  repo,
  season,
  side = 'left',
  supportPreview = false,
}: {
  repo: Repository;
  season: string;
  side?: 'left' | 'right';
  supportPreview?: boolean;
}) {
  const parts = useMemo(
    () => repositoryBuildingModel(repo, season),
    [repo, season],
  );
  const sign = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 320;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#24392b';
    ctx.fillRect(0, 0, 1024, 320);
    ctx.strokeStyle = '#aa8955';
    ctx.lineWidth = 12;
    ctx.strokeRect(8, 8, 1008, 304);
    // Keep a fixed avatar area so the title never shifts when the image loads.
    ctx.fillStyle = '#43533e';
    ctx.fillRect(48, 76, 164, 164);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f0ddb0';
    ctx.font = 'bold 88px monospace';
    ctx.fillText(repo.fullName[0].toUpperCase(), 130, 188);
    const lines = repositorySignLines(repo.building.signText || repo.name);
    const nominal = lines.length > 1 ? 72 : 96;
    ctx.font = `bold ${nominal}px monospace`;
    const longest = Math.max(
      ...lines.map((line) => ctx.measureText(line).width),
    );
    ctx.font = `bold ${Math.min(nominal, (nominal * 730) / longest)}px monospace`;
    lines.forEach((line, i) =>
      ctx.fillText(line, 620, lines.length > 1 ? 115 + i * 82 : 156),
    );
    ctx.font = '32px monospace';
    ctx.fillText(
      `${repo.stars.toLocaleString('en-US')} stars`,
      620,
      250,
      730,
    );
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.anisotropy = 8;
    return t;
  }, [repo.name, repo.fullName, repo.stars, repo.building.signText]);
  useEffect(() => () => sign.dispose(), [sign]);
  useEffect(() => {
    let active = true;
    void loadOwnerAvatar(repo.fullName).then(image => {
      if (!active || !image) return;
      const ctx = (sign.image as HTMLCanvasElement).getContext('2d')!;
      ctx.fillStyle = '#e9e3d8';
      ctx.fillRect(48, 76, 164, 164);
      ctx.drawImage(image, 48, 76, 164, 164);
      sign.needsUpdate = true;
    });
    return () => { active = false; };
  }, [repo.fullName, sign]);
  return (
    <group>
      <RepositorySupport repo={repo} side={side} preview={supportPreview} />
      <VoxelModel parts={parts} />
      <mesh position={[0, 3.1, 3.25]} castShadow>
        <boxGeometry args={[5.8, 1.5, 0.2]} />
        <meshStandardMaterial color="#685337" />
      </mesh>
      <mesh position={[0, 3.1, 3.36]}>
        <planeGeometry args={[5.55, 1.3]} />
        <meshBasicMaterial map={sign} />
      </mesh>
    </group>
  );
});
