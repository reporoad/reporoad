'use client';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import VoxelModel from './voxel-model';
import { supportLinks, type Repository } from '@/lib/repositories';
import type { VoxelPart } from '@/lib/voxel-models';

function Marker({ kind, href, side }: { kind: 'help' | 'sponsor'; href?: string; side: 'left' | 'right' }) {
  const help = kind === 'help';
  const parts = useMemo(() => {
    const model: VoxelPart[] = [];
    const box = (position: VoxelPart['position'], size: VoxelPart['size'], color: string) => model.push({position,size,color});
    if (help) {
      for (const x of [-1.05,1.05]) box([x,1.1,0],[.16,2.2,.18],'#79603c');
      box([0,1.65,0],[2.45,1.45,.18],'#8a663b');
      box([0,2.42,0],[2.65,.15,.3],'#a17e48');
      box([0,.88,0],[2.55,.13,.28],'#745434');
    } else {
      box([0,.85,0],[.16,1.7,.18],'#86663e');
      const rows=['0110110','1111111','1111111','0111110','0011100','0001000'];
      rows.forEach((row,y)=>[...row].forEach((cell,x)=>{
        if(cell==='1') box([(x-3)*.16,2.12-y*.16,0],[.16,.16,.24],(x+y)%3 ? '#df8290' : '#f1a4a4');
      }));
    }
    return model;
  }, [help]);
  const texture = useMemo(() => {
    if (!help) return null;
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=320;
    const ctx=canvas.getContext('2d')!;
    ctx.fillStyle='#293b2a';ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle='#f3dfaa';ctx.textAlign='center';ctx.font='bold 80px monospace';
    ctx.fillText('HELP',256,132);ctx.fillText('WANTED',256,233);
    const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;
  },[help]);
  useEffect(()=>()=>texture?.dispose(),[texture]);
  return <group scale={0.7} position={[(side === 'left' ? 1 : -1) * (help ? 2.3 : 4.4),0,5]}
    onClick={e=>{e.stopPropagation();if(href) window.open(href,'_blank','noopener,noreferrer');}}>
    <VoxelModel parts={parts} />
    {texture && <mesh position={[0,1.65,.105]}>
      <planeGeometry args={[2.15,1.16]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>}
  </group>;
}
export default function RepositorySupport({repo, side, preview = false}:{repo:Repository; side: 'left' | 'right'; preview?: boolean}) {
  const links=supportLinks(repo.fullName);
  if(!links) return null;
  return <>
    {(preview || repo.building.support?.helpWanted) && <Marker kind="help" href={preview ? undefined : links.helpWanted} side={side} />}
    {(preview || repo.building.support?.sponsor) && <Marker kind="sponsor" href={preview ? undefined : links.sponsor} side={side} />}
  </>;
}
