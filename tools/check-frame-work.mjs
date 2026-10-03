// Run the production renderer methods with a fake clock and small Three.js
// resources. Setter/sort counts measure avoided CPU work, not hardware FPS.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

class Vector {
 constructor(x=0,y=0,z=0){Object.assign(this,{x,y,z,writes:0});}
 set(x,y,z=this.z){this.writes++;Object.assign(this,{x,y,z});return this;}
 setScalar(v){return this.set(v,v,v);}
 fromArray(a){this.writes++;Object.assign(this,{x:a[0],y:a[1],z:a[2]});return this;}
 copy(v){return this.set(v.x,v.y,v.z);}
}
class Layers {
 mask=1;writes=0;
 set(channel){this.writes++;this.mask=1<<channel;}
 enable(channel){this.mask|=1<<channel;}
}
class Attribute {
 constructor(array,itemSize){Object.assign(this,{array,itemSize,count:array.length/itemSize});}
}
class Geometry {
 attributes={};disposals=0;
 setAttribute(key,value){this.attributes[key]=value;return this;}
 getAttribute(key){return this.attributes[key];}
 setIndex(value){this.index=value;return this;}
 computeBoundingSphere(){}
 dispose(){this.disposals++;}
}
class Mesh {
 constructor(geometry,material){
  Object.assign(this,{geometry,material,userData:{},position:new Vector(),scale:new Vector(1,1,1),layers:new Layers(),visible:true,shadowWrites:0});
  this._castShadow=false;
 }
 get castShadow(){return this._castShadow;}
 set castShadow(value){this.shadowWrites++;this._castShadow=value;}
}
class InstancedMesh extends Mesh {
 isInstancedMesh=true;disposals=0;
 computeBoundingSphere(){}
 dispose(){this.disposals++;}
}
class Material {dispose(){}}
const T={Mesh,InstancedMesh,BufferGeometry:Geometry,BufferAttribute:Attribute,InstancedBufferAttribute:Attribute,
 InterleavedBuffer:class {constructor(array,stride){Object.assign(this,{array,stride});}},
 InterleavedBufferAttribute:class {constructor(buffer,itemSize,offset){Object.assign(this,{buffer,itemSize,offset,count:buffer.array.length/buffer.stride});}},
 MeshStandardMaterial:Material};
const values=v=>[v.x,v.y,v.z];
const array=()=>new Float32Array(27);

export function checkFrameWork(read){
 let now=0,cableCalls=0;
 const clock={now:()=>now},work={sorts:0,filters:0};
 const source=String(read('src/renderer.js'));
 const G={sub:(a,b)=>a.map((v,i)=>v-b[i]),add:(a,b)=>a.map((v,i)=>v+b[i]),length:a=>Math.hypot(...a),clamp:(v,a,b)=>Math.min(b,Math.max(a,v)),visibleSphere:()=>true,
  PRESETS:{centerBottom:{centerCarY:0},centerTop:{centerCarY:56}},
  MOUNTAIN:{cablePoint(track,u,lane){cableCalls++;return [track+u*100,20+u*10,lane];}}};
 const context=vm.createContext({GA:G,performance:clock,work});
 vm.runInContext(source,context,{filename:'src/renderer.js'});
 vm.runInContext(`const frameSort=Array.prototype.sort,frameFilter=Array.prototype.filter;
  Array.prototype.sort=function(...a){work.sorts++;return frameSort.apply(this,a);};
  Array.prototype.filter=function(...a){work.filters++;return frameFilter.apply(this,a);};`,context);
 const layer=name=>{
  for(let p=G.DioramaRenderer.prototype;p;p=Object.getPrototypeOf(p))if(p.constructor.name===name)return p;
  throw Error('Renderer layer missing: '+name);
 };
 const Adaptive=layer('AdaptiveRenderer'),Diorama=layer('DioramaRenderer'),Island=layer('IslandRenderer');
 const list=()=>vm.runInContext('[]',context);
 const target=(width,height)=>({width,height,setSize(w,h){this.width=w;this.height=h;}});
 function renderer(proto=Island){
  const r=Object.assign(Object.create(proto),{T,records:list(),objects:list(),recordMap:new Map(),indexByArray:new Map(),geometryRefs:new Map(),cache:new Map(),packs:new Map(),
   residentBytes:0,attributeBudget:160*1048576,graceSeconds:6,evictions:0,uploads:0,renderCount:0,quality:'balanced',cssWidth:0,contextLost:false,
   mats:{matte:new Material()},signObjects:[],timeUniform:{value:0},sunAnchor:[Infinity,Infinity,Infinity],evicted:[],lightingCalls:0});
  r.scene={members:new Set(),add(mesh){this.members.add(mesh);},remove(mesh){this.members.delete(mesh);},traverse(){}};
  r.camera={fov:49,aspect:1,position:new Vector(),projectionUpdates:0,updateProjectionMatrix(){this.projectionUpdates++;this.projection=[this.fov,this.aspect];},lookAt(){},updateMatrixWorld(){}};
  r.sky={position:new Vector()};r.sun={position:new Vector(),target:{position:new Vector()},shadow:{camera:{updateProjectionMatrix(){}}}};
  r.engine={shadowMap:{needsUpdate:false},pixelRatio:1,renderLists:{dispose(){}},info:{render:{calls:0,triangles:0},memory:{geometries:0,textures:0},reset(){this.render.calls=0;this.render.triangles=0;}},
   setPixelRatio(v){this.pixelRatio=v;},getPixelRatio(){return this.pixelRatio;},setSize(){},setRenderTarget(){},clear(){},
   render(){this.info.render.calls++;this.info.render.triangles+=2;this.shadowMap.needsUpdate=false;}};
  r.sceneTarget=target(640,360);r.aoTarget=target(320,180);r.blurA=target(160,90);r.blurB=target(160,90);r.reflectionTarget=target(320,180);
  r.aoMat={uniforms:{resolution:{value:new Vector()},depthResolution:{value:new Vector()}}};r.outputMat={uniforms:{aoTexel:{value:new Vector()}}};
  r.canalWater=r.lakeWater=r.windWater={uniforms:{uReflect:{value:0}}};
  r.lighting=()=>{r.lightingCalls++;};r.post=()=>2;
  r.evict=function(record){if(record.item)this.evicted.push(record.data.id);return Adaptive.evict.call(this,record);};
  return r;
 }
 const data=(id,extras={})=>({id,owner:'forest',space:'surface',group:'architecture',material:'matte',center:[0,0,0],radius:1,vertices:array(),...extras});
 const rig={eye:[0,0,10],target:[0,0,0],fov:52,aspect:16/9,planes:[]};
 const opts={displayMode:'continuous',space:'surface',focus:'forest',lighting:'neutral',weather:'clear',vegetation:true,reflections:false,bloom:false,time:12.5};
 const draw=(r,o=opts,q=rig)=>Diorama.render.call(r,q,o);
 const add=(r,meshes,id='forest')=>Diorama.attachPack.call(r,{id,meshes,signs:[]});
 const snapshot=r=>({bytes:r.residentBytes,evictions:r.evictions,uploads:r.uploads,
  resident:Array.from(r.records,r=>[r.data.id,!!r.item,r.level]).sort(),
  refs:Array.from(r.geometryRefs.values(),r=>[r.refs,r.bytes]).sort((a,b)=>a[1]-b[1]||a[0]-b[0])});

 // An unchanged camera/mesh must preserve state while avoiding the repeated
 // projection, transform and LRU work. Lighting still runs every drawn frame.
 const stable=renderer();add(stable,[data('still')]);draw(stable);
 const record=stable.records[0],mesh=record.item.mesh,identity=record.xf;
 const initial={projection:stable.camera.projectionUpdates,position:mesh.position.writes,scale:mesh.scale.writes,layers:mesh.layers.writes,shadow:mesh.shadowWrites,sorts:work.sorts,filters:work.filters};
 for(let i=0;i<60;i++){now+=10;draw(stable);}
 assert.equal(stable.camera.projectionUpdates,initial.projection);
 assert.equal(mesh.position.writes,initial.position);assert.equal(mesh.scale.writes,initial.scale);
 assert.equal(mesh.layers.writes,initial.layers);assert.equal(mesh.shadowWrites,initial.shadow);
 assert.equal(work.sorts,initial.sorts);assert.equal(work.filters,initial.filters);
 assert.equal(record.xf,identity);assert(Object.isFrozen(identity)&&Object.isFrozen(identity.offset));
 assert.equal(stable.lightingCalls,61);assert.equal(record.lastUsed,now/1000);
 assert.deepEqual(values(mesh.position),[0,0,0]);assert.deepEqual(values(mesh.scale),[1,1,1]);assert.equal(mesh.castShadow,true);
 stable.camera.fov=61;draw(stable);assert.equal(stable.camera.projectionUpdates,initial.projection+1);
 draw(stable,opts,{...rig,aspect:2});assert.equal(stable.camera.projectionUpdates,initial.projection+2);
 draw(stable,opts,{...rig,fov:0,aspect:2});assert.equal(stable.camera.fov,49);assert.equal(stable.camera.projectionUpdates,initial.projection+3);
 stable.setSize(640,320,1);const resized=stable.camera.projectionUpdates;
 draw(stable,opts,{...rig,fov:49,aspect:2});assert.equal(stable.camera.projectionUpdates,resized,'Resize already updated the projection');

 // Run the real Adaptive constructor's context callbacks, then submit a real
 // Diorama frame after restoration. GPU resources themselves are test doubles.
 class Base {
  constructor(){this.mats={};this.engine={shadowMap:{},info:{}};this.sun={shadow:{camera:{layers:new Layers()}}};}
 }
 const adaptiveContext=vm.createContext({GA:{ThreeRenderer:Base},performance:clock});
 const start=source.indexOf('/* v0.13:'),end=source.indexOf('/* v0.14:');
 assert(start>=0&&end>start,'Review the renderer layer markers');
 vm.runInContext(source.slice(start,end),adaptiveContext);
 const listeners=new Map(),canvas={addEventListener(type,fn){listeners.set(type,fn);},emit(type){listeners.get(type)();}};
 const restored=new adaptiveContext.GA.ThreeRenderer(T,canvas,{meshes:[],hlod:{clusters:[],sourceCount:0}});
 Object.assign(restored,renderer());Object.setPrototypeOf(restored,Island);
 draw(restored);const beforeRestore=restored.camera.projectionUpdates;
 canvas.emit('webglcontextlost');draw(restored);assert.equal(restored.camera.projectionUpdates,beforeRestore);
 canvas.emit('webglcontextrestored');draw(restored);assert.equal(restored.camera.projectionUpdates,beforeRestore+1);assert.equal(restored.projectionDirty,false);
 draw(restored);assert.equal(restored.camera.projectionUpdates,beforeRestore+1);

 // A later ensure() may change an existing mesh. Read its actual state rather
 // than trusting a saved transform or layer token from the preceding frame.
 stable.ensure=function(r,lod){const m=Adaptive.ensure.call(this,r,lod);m.scale.x=9;m.position.x=7;m.layers.mask=4;m.castShadow=false;return m;};
 draw(stable);assert.deepEqual(values(mesh.position),[0,0,0]);assert.deepEqual(values(mesh.scale),[1,1,1]);assert.equal(mesh.layers.mask,1);assert.equal(mesh.castShadow,true);
 const sharedOffset=[3,4,5],lateIdentity=record.identityTransform;
 stable.wanted=function(r,q,o,d){const yes=Island.wanted.call(this,r,q,o,d);if(yes)r.xf={scale:2,offset:sharedOffset};return yes;};
 draw(stable);assert.deepEqual(values(mesh.position),sharedOffset);assert.deepEqual(values(mesh.scale),[2,2,2]);
 sharedOffset[1]=14;draw(stable);assert.deepEqual(values(mesh.position),[3,14,5],'A reused/mutated offset must not go stale');
 delete stable.wanted;draw(stable);assert.equal(record.xf,lateIdentity);assert.deepEqual(values(mesh.position),[0,0,0]);assert.deepEqual(values(mesh.scale),[1,1,1]);
 const second=data('still-two');Diorama.addRecords.call(stable,[second],'forest');draw(stable);
 assert.notEqual(stable.records[1].xf,record.xf,'Record identity transforms must not be shared');

 // Preserve the real late-layer elevator override and both ropeway phases.
 vm.runInContext(String(read('src/geyser-center-renderer.js')),context,{filename:'src/geyser-center-renderer.js'});
 const elevator=renderer(G.DioramaRenderer.prototype);add(elevator,[data('car',{owner:'geyser_center',space:'geyser_center_inside',centerScene:'inside',centerPart:'car'})],'geyser_center');
 const inside={...opts,space:'geyser_center_inside',focus:'geyser_center',view:'centerBottom'};
 draw(elevator,inside);assert.deepEqual(values(elevator.records[0].item.mesh.position),[0,0,0]);
 draw(elevator,{...inside,view:'centerTop'});assert.deepEqual(values(elevator.records[0].item.mesh.position),[0,56,0]);
 draw(elevator,inside);assert.deepEqual(values(elevator.records[0].item.mesh.position),[0,0,0]);
 const moving=renderer();add(moving,[data('rope',{motion:{kind:'ropeway',track:3,lane:7,phase:0}})]);
 const beforeCable=cableCalls;draw(moving,{...opts,time:0});assert.deepEqual(values(moving.records[0].item.mesh.position),[3,20,7]);
 draw(moving,{...opts,time:120});assert.deepEqual(values(moving.records[0].item.mesh.position),[103,30,7]);
 draw(moving,{...opts,time:120,motion:false});assert.deepEqual(values(moving.records[0].item.mesh.position),[103,30,7]);assert.equal(cableCalls-beforeCable,6,'wanted and draw still evaluate the current ropeway position');

 // Exact six-second grace, visibility changes, LOD and quality transitions.
 now=0;const expiry=renderer();const near=array(),far=new Float32Array(54);add(expiry,[data('expiry',{vertices:near,farVertices:far})]);draw(expiry);
 const expiryRecord=expiry.records[0];expiry.wanted=()=>false;now=6000;const expirySorts=work.sorts,expiryFilters=work.filters;draw(expiry);assert(expiryRecord.item);
 now=6001;draw(expiry);assert.equal(expiryRecord.item,null);assert.equal(expiry.residentBytes,0);
 assert.equal(work.sorts,expirySorts);assert.equal(work.filters,expiryFilters);
 delete expiry.wanted;draw(expiry);assert(expiryRecord.item);assert.equal(expiryRecord.level,0);
 expiry.setQuality('low');draw(expiry);assert.equal(expiryRecord.level,1);assert.equal(expiry.residentBytes,far.byteLength);assert.equal(expiryRecord.item.mesh.castShadow,false);
 expiry.setQuality('balanced');draw(expiry);assert.equal(expiryRecord.level,0);assert.equal(expiry.residentBytes,near.byteLength);
 draw(expiry,{...opts,weather:'rain'});assert.equal(expiryRecord.item.mesh.castShadow,false);draw(expiry);assert.equal(expiryRecord.item.mesh.castShadow,true);

 // Under pressure, shared geometry can make the oldest eviction free zero
 // bytes. LRU must still choose A then D, retaining B's shared geometry.
 now=5000;const pressure=renderer(),shared=array(),index=new Uint16Array([0,1,2]);
 add(pressure,[data('B',{vertices:shared,index}),data('D'),data('A',{vertices:shared,index}),data('C')]);
 for(const r of pressure.records){Adaptive.ensure.call(pressure,r,0);r.wanted=r.data.id==='C';r.lastUsed={A:1,D:1.5,B:2,C:5}[r.data.id];}
 pressure.attributeBudget=shared.byteLength+index.byteLength+pressure.records[3].data.vertices.byteLength;
 const pressureSorts=work.sorts;assert.equal(pressure.trim(),2);assert.equal(work.sorts,pressureSorts+1);
 assert.deepEqual(pressure.evicted,['A','D']);assert.equal(pressure.residentBytes,pressure.attributeBudget);assert.equal(pressure.geometryRefs.get(shared).refs,1);
 pressure.records[3].wanted=false;assert.equal(pressure.trim(true),2);assert.deepEqual(pressure.evicted,['A','D','B','C']);assert.equal(pressure.residentBytes,0);

 // Replay the former trim policy as an independent behavior oracle. This
 // covers changing visible sets, reduced budgets, expired/forced eviction,
 // indexed shared arrays, instances and near/far replacement in combination.
 const replayData=[data('r0',{vertices:shared,index,farVertices:far}),data('r1',{vertices:shared,index,farVertices:far}),
  data('r2',{vertices:array(),farVertices:far,instances:new Float32Array(16),instanceColors:new Float32Array(3)}),data('r3'),data('r4')];
 const candidate=renderer(),reference=renderer();add(candidate,replayData);add(reference,replayData);
 reference.trim=function(force=false){let n=0;const seconds=now/1000;
  for(const r of Array.from(this.records).filter(r=>r.item&&!r.wanted).sort((a,b)=>a.lastUsed-b.lastUsed))if(force||seconds-r.lastUsed>this.graceSeconds||this.residentBytes>this.attributeBudget){this.evict(r);n++;}
  return n;
 };
 for(let step=0;step<120;step++){
  now=step*1700;
  for(const r of [candidate,reference]){
   if(step%9===0)r.setQuality(step%18===0?'low':'balanced');
   r.attributeBudget=[10000,280,180][step%3];
   for(let i=0;i<r.records.length;i++){const record=r.records[i];record.wanted=(i+step)%4===0;if(record.wanted){r.ensure(record,record.data.farVertices&&step%2?1:0);record.lastUsed=now/1000;}}
  }
  const force=step%13===0;assert.equal(candidate.trim(force),reference.trim(force));assert.deepEqual(snapshot(candidate),snapshot(reference),'Resource policy changed at replay step '+step);
 }
 add(candidate,[data('replacement')]);add(reference,[data('replacement')]);draw(candidate);draw(reference);assert.deepEqual(snapshot(candidate),snapshot(reference));
 candidate.dropPack('forest');reference.dropPack('forest');assert.equal(candidate.records.length,0);assert.equal(candidate.geometryRefs.size,0);assert.equal(candidate.residentBytes,0);assert.deepEqual(snapshot(candidate),snapshot(reference));
 return {stableFrames:60,stableProjectionUpdates:initial.projection,stableExtraTransformWrites:0,ordinaryTrimSorts:0,graceBoundarySeconds:6,
  budgetEvictionOrder:pressure.evicted.join(','),policyReplaySteps:120,elevatorPositions:[0,56,0],ropewayEvaluations:6,restoreProjectionUpdates:1};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const root=fileURLToPath(new URL('../',import.meta.url));
 console.log('每帧CPU工作检查通过：'+JSON.stringify(checkFrameWork(name=>fs.readFileSync(path.join(root,name)))));
}
