// Actual Three r185 CPU resources; no WebGL context or rendering doubles.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import * as THREE from '../vendor/three/three.module.js';

export function checkRenderOwnership(read){
 assert.equal(THREE.REVISION,'185');
 const context=vm.createContext({GA:{},performance});
 vm.runInContext(String(read('src/renderer.js')),context,{filename:'src/renderer.js'});
 const vertices=()=>Float32Array.from([0,0,0,0,1,0,1,1,1,1,0,0,0,1,0,1,1,1,0,0,1,0,1,0,1,1,1]);
 const model=(id,extra={})=>({id,group:'building',material:'matte',vertices:vertices(),...extra});
 const pack=(id,meshes)=>({id,meshes,signs:[]});
 const fresh=()=>Object.assign(Object.create(context.GA.DioramaRenderer.prototype),{
  T:THREE,scene:new THREE.Scene(),mats:{matte:new THREE.MeshStandardMaterial()},
  cache:new Map(),geometryRefs:new Map(),indexByArray:new Map(),recordMap:new Map(),packs:new Map(),
  records:[],objects:[],signObjects:[],residentBytes:0,uploads:0,evictions:0,
  engine:{shadowMap:{},renderLists:{dispose(){}}}
 });
 const empty=r=>{
  for(const key of ['cache','geometryRefs','indexByArray','recordMap','packs'])assert.equal(r[key].size,0,key+' retains resources');
  for(const key of ['records','objects','signObjects'])assert.equal(r[key].length,0,key+' retains resources');
  assert.equal(r.residentBytes,0);assert.equal(r.scene.children.length,0);r.mats.matte.dispose();
 };
 const unbuilt=(r,record)=>{
  assert.equal(record.item,null);assert.equal(record.level,-1);assert.equal(r.geometryRefs.size,0);assert.equal(r.cache.size,0);
  assert.equal(r.residentBytes,0);assert.equal(r.objects.length,0);assert.equal(r.scene.children.length,0);assert.equal(r.uploads,0);
 };
 let failures=0;
 for(const fault of ['material','mesh','instance-attribute','scene-add']){
  const r=fresh(),data=model('fault'),error=new Error('injected '+fault);let instanceDisposals=0;
  if(fault==='instance-attribute'){
   data.instances=new Float32Array(new THREE.Matrix4().elements);data.instanceColors=new Float32Array([1,1,1]);
   r.T={...THREE,InstancedMesh:class extends THREE.InstancedMesh{dispose(){instanceDisposals++;super.dispose();}},
    InstancedBufferAttribute:class{constructor(){throw error;}}};
  }else if(fault==='mesh')r.T={...THREE,Mesh:class{constructor(){throw error;}}};
  const originalMaterial=r.material,originalAdd=r.scene.add;
  if(fault==='material')r.material=()=>{throw error;};
  if(fault==='scene-add')r.scene.add=function(mesh){originalAdd.call(this,mesh);throw error;};
  r.attachPack(pack('fault',[data]));const record=r.recordMap.get(data.id);
  assert.throws(()=>r.ensure(record,0),e=>e===error);unbuilt(r,record);
  if(fault==='instance-attribute')assert.equal(instanceDisposals,1,'Partially created instance mesh must be disposed');
  r.T=THREE;r.material=originalMaterial;r.scene.add=originalAdd;
  r.ensure(record,0);assert(record.item);r.dropPack('fault');empty(r);failures++;
 }
 {
  const r=fresh(),data=model('indexed',{index:new Uint16Array([0,1,2])}),error=new Error('injected index attribute');
  let geometryDisposals=0;
  r.T={...THREE,BufferGeometry:class extends THREE.BufferGeometry{dispose(){geometryDisposals++;super.dispose();}},BufferAttribute:class{constructor(){throw error;}}};
  r.attachPack(pack('indexed',[data]));const record=r.recordMap.get(data.id);
  assert.throws(()=>r.ensure(record,0),e=>e===error);unbuilt(r,record);assert.equal(geometryDisposals,1);
  assert.equal(r.indexByArray.get(data.vertices),data.index,'A failed upload must retain the registered source index for retry');
  r.T=THREE;r.ensure(record,0);assert.equal(record.item.mesh.geometry.index.array,data.index);r.dropPack('indexed');empty(r);failures++;
 }
 {
  const r=fresh(),data=model('lod',{farVertices:vertices()}),error=new Error('injected LOD assignment');
  r.attachPack(pack('lod',[data]));const record=r.recordMap.get(data.id),mesh=r.ensure(record,0),oldGeo=mesh.geometry;
  let liveGeo=oldGeo,failNext=true;
  Object.defineProperty(mesh,'geometry',{configurable:true,get(){return liveGeo;},set(geo){if(failNext){failNext=false;throw error;}liveGeo=geo;}});
  assert.throws(()=>r.ensure(record,1),e=>e===error);
  assert.equal(mesh.geometry,oldGeo);assert.equal(record.array,data.vertices);assert.equal(record.level,0);
  assert.equal(record.item.geos[0],oldGeo);assert.equal(r.geometryRefs.size,1);assert.equal(r.cache.size,1);
  assert.equal(r.geometryRefs.get(data.vertices).refs,1);assert.equal(r.residentBytes,data.vertices.byteLength);
  r.ensure(record,1);assert.equal(record.array,data.farVertices);r.dropPack('lod');empty(r);failures++;
 }
 {
  const r=fresh(),overview=model('overview'),old=pack('region',[model('owned')]),other=pack('other',[model('outside')]);
  r.addRecords([overview],'overview');r.attachPack(old);r.attachPack(other);
  const record=r.recordMap.get('owned'),mesh=r.ensure(record,0),bytes=r.residentBytes;
  const assertOld=()=>{
   assert.equal(r.packs.get('region'),old);assert.equal(r.recordMap.get('owned'),record);assert.equal(record.item.mesh,mesh);
   assert.equal(r.residentBytes,bytes);assert.equal(r.records.length,3);assert.equal(r.recordMap.size,3);assert.equal(r.indexByArray.size,0);
   assert.equal(r.recordMap.has('partial'),false);assert.equal(r.objects.length,1);assert.equal(r.scene.children.length,1);
  };
  for(const meshes of [[model('partial',{index:new Uint16Array([0,1,2])}),model('partial')],[model('partial'),model('outside')],[model('partial'),model('overview')]]){
   assert.throws(()=>r.attachPack(pack('region',meshes)),/重复模型ID/);assertOld();
  }
  assert.throws(()=>r.attachPack(pack('overview',[model('overview')])),/重复模型ID/);assertOld();
  const replacement=pack('region',[model('owned')]);r.attachPack(replacement);
  assert.equal(r.packs.get('region'),replacement);assert.notEqual(r.recordMap.get('owned'),record);
  assert.equal(r.geometryRefs.size,0);assert.equal(r.residentBytes,0);
  r.ensure(r.recordMap.get('owned'),0);r.dropPack('region');r.dropPack('other');
  r.records=[];r.recordMap.clear();empty(r);
 }
 {
  const r=fresh(),near=vertices(),far=vertices(),instances=new Float32Array(new THREE.Matrix4().elements),colors=new Float32Array([1,1,1]);
  for(let cycle=0;cycle<100;cycle++){
   const a=model('shared-a',{vertices:near,farVertices:far,instances,instanceColors:colors}),b=model('shared-b',{vertices:near,farVertices:far,instances,instanceColors:colors});
   r.attachPack(pack('shared',[a,b]));const first=r.recordMap.get(a.id),second=r.recordMap.get(b.id);
   const firstMesh=r.ensure(first,0),secondMesh=r.ensure(second,0);
   assert.equal(firstMesh.geometry,secondMesh.geometry);assert.notEqual(firstMesh.instanceMatrix,secondMesh.instanceMatrix);
   assert.equal(firstMesh.instanceMatrix.array,secondMesh.instanceMatrix.array);assert.equal(r.geometryRefs.get(near).refs,2);
   assert.equal(r.residentBytes,near.byteLength+2*(instances.byteLength+colors.byteLength));
   r.ensure(first,1);assert.equal(r.geometryRefs.get(near).refs,1);r.ensure(second,1);
   assert.equal(r.geometryRefs.has(near),false);assert.equal(r.geometryRefs.get(far).refs,2);assert.equal(firstMesh.geometry,secondMesh.geometry);
   r.dropPack('shared');empty(r);
  }
 }
 return {threeRevision:THREE.REVISION,failureRollbacks:failures,rejectedDuplicatePacks:4,sharedGeometryCycles:100,remainingResources:0};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const root=fileURLToPath(new URL('../',import.meta.url));
 console.log('渲染所有权检查通过：'+JSON.stringify(checkRenderOwnership(name=>fs.readFileSync(path.join(root,name)))));
}
