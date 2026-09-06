'use client';
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { chickenCycle, visibleChickens, CHICKEN_INTERVAL, CHICKEN_TRAVEL_SECONDS, type CrossingSchedule } from '@/lib/chickens';
import type { SharedClock } from './living-world';
const parts = [
  [0,.36,0,.46,.36,.3,'#f6e5c2'], [.23,.61,0,.22,.29,.24,'#fff0d2'],
  [.39,.60,0,.13,.09,.13,'#edaa38'], [.23,.80,0,.15,.09,.09,'#c64431'],
  [.30,.67,.125,.045,.045,.02,'#24221b'], [-.24,.47,0,.17,.24,.24,'#ded1ae'],
  [-.08,.1,-.10,.05,.2,.05,'#c48d32'], [.12,.1,.10,.05,.2,.05,'#c48d32'],
] as const;
const dummy = new THREE.Object3D();
const frustum = new THREE.Frustum(), projection = new THREE.Matrix4(), bounds = new THREE.Sphere(new THREE.Vector3(), 1);
// Pool capacity follows transit time / spacing, NOT the total flock size.
const visibleCapacity = Math.ceil(CHICKEN_TRAVEL_SECONDS / CHICKEN_INTERVAL) + 1;
export default function ChickenCrossing({ clock, schedule, live }: { clock: SharedClock; schedule?: CrossingSchedule | null; live: boolean }) {
  const { camera } = useThree();
  const flock = useRef<THREE.InstancedMesh>(null), signal = useRef<THREE.Group>(null);
  const red = useRef<THREE.MeshBasicMaterial>(null), green = useRef<THREE.MeshBasicMaterial>(null);
  useEffect(() => {
    if (!flock.current) return;
    for (let i = 0; i < visibleCapacity; i++) parts.forEach((part, j) => {
      flock.current!.setColorAt(i * parts.length + j, new THREE.Color(part[6]));
    });
    if (flock.current.instanceColor) flock.current.instanceColor.needsUpdate = true;
  }, []);
  useFrame(() => {
    const now = clock.current.now(), cycle = chickenCycle(now, schedule);
    if (signal.current) {
      signal.current.visible = live && cycle.signalZ > -180 && cycle.signalZ < 45;
      signal.current.position.z = cycle.signalZ;
    }
    const stopped = !schedule || now < schedule.departAt || now >= schedule.stopAt - 4000;
    red.current?.color.set(stopped ? '#ff4937' : '#401f18');
    green.current?.color.set(stopped ? '#253822' : '#9adb64');
    if (!flock.current) return;
    const window = visibleChickens(schedule?.crossingCount || 0, cycle.phase);
    const n = window.end - window.first;
    flock.current.visible = live && cycle.crossing && n > 0;
    flock.current.count = n * parts.length;
    if (!flock.current.visible) return;
    frustum.setFromProjectionMatrix(projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    let rendered = 0;
    for (let i=0; i<n; i++) {
      // All viewers derive the same flock positions from the shared clock.
      const chickenId = window.first + i;
      const progress = (cycle.phase - chickenId * CHICKEN_INTERVAL) / CHICKEN_TRAVEL_SECONDS;
      const x = -32 + progress * 64;
      const z = -10 - (chickenId % 4) * .8;
      bounds.center.set(x, .5, z);
      if (!frustum.intersectsSphere(bounds)) continue;
      parts.forEach(([px,py,pz,sx,sy,sz], j) => {
        dummy.position.set(x + px, py + Math.abs(Math.sin(cycle.phase * 10 + i)) * .035, z + pz);
        dummy.scale.set(sx,sy,sz); dummy.updateMatrix();
        flock.current!.setMatrixAt(rendered * parts.length + j, dummy.matrix);
      });
      rendered++;
    }
    flock.current.count = rendered * parts.length;
    flock.current.instanceMatrix.needsUpdate = true;
  });
  return <>
    <group ref={signal}>
      <mesh position={[5.5,2,0]}><boxGeometry args={[.15,4,.15]} /><meshStandardMaterial color="#524f40" /></mesh>
      <mesh position={[5.5,3.6,.05]}><boxGeometry args={[.65,1.35,.3]} /><meshStandardMaterial color="#272a24" /></mesh>
      <mesh position={[5.5,3.96,.22]}><boxGeometry args={[.3,.3,.06]} /><meshBasicMaterial ref={red} color="#ff4937" /></mesh>
      <mesh position={[5.5,3.27,.22]}><boxGeometry args={[.3,.3,.06]} /><meshBasicMaterial ref={green} color="#253822" /></mesh>
      <mesh position={[0,.025,3]}><boxGeometry args={[9,.025,.25]} /><meshStandardMaterial color="#eee0bc" /></mesh>
    </group>
    <instancedMesh ref={flock} visible={false} args={[undefined,undefined,visibleCapacity * parts.length]} frustumCulled={false}>
      <boxGeometry /><meshStandardMaterial roughness={1} />
    </instancedMesh>
  </>;
}
