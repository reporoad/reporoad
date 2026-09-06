// Read-only geometry diagnostic for the fixed driver-eye view.
import * as THREE from 'three';
import { cabinSurroundModel, cabinDashboardModel } from '../lib/cabin-model.ts';
import { cabinPadGeometry } from '../lib/cabin-pad.ts';
const aspect=1280/720,frameX=aspect*1.19;
const root=new THREE.Group();root.position.set(1.7,1.9,7);root.rotation.x=-.09;
const parts=[...cabinSurroundModel(frameX),...cabinDashboardModel()];
for(const side of [-1,1]) {
 parts.push({position:[side*frameX,.08,-1.96],size:[.13,2.5,.18],color:'#6c4d35',kind:'main pillar'});
}
for(const [i,p] of parts.entries()) {
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(...p.size),new THREE.MeshBasicMaterial());
 mesh.position.set(...p.position);mesh.userData={index:i,...p};root.add(mesh);
}
const pad = new THREE.Mesh(cabinPadGeometry(),new THREE.MeshBasicMaterial());
pad.position.set(0,-.53,-1.9);pad.userData={kind:'molded pad'};root.add(pad);
root.updateMatrixWorld(true);
const camera=new THREE.PerspectiveCamera(68,aspect,.1,500);
camera.position.set(1.7,1.9,7);camera.lookAt(1.7,-7.75,-100);camera.updateMatrixWorld(true);
const ray=new THREE.Raycaster();
for(const [x,y] of [[65,250],[72,250],[80,250],[920,250],[925,250],[935,250],[945,250],[290,390],[290,395],[290,400]]) {
 ray.setFromCamera(new THREE.Vector2(x/1000*2-1,1-y/563*2),camera);
 const hit=ray.intersectObjects(root.children)[0];
 console.log(JSON.stringify({pixel:[x,y],part:hit?.object.userData,point:hit?hit.object.worldToLocal(hit.point.clone()).toArray():null,normal:hit?.face.normal.toArray()}));
}
for(const mesh of root.children){mesh.geometry.dispose();mesh.material.dispose();}
