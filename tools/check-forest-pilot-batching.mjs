// Real Three r185 CPU geometry/frustums and production ownership methods.
// This compares submitted members and triangles, not WebGL pixels or hardware FPS.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import * as T from '../vendor/three/three.module.js';

export function checkForestPilotBatching(read){
 const context=vm.createContext({performance,TextDecoder,TextEncoder});
 for(const file of ['src/world-builder.js','src/forest-canopy-plants.js','src/forest-crown-rollout.js','src/renderer.js','src/forest-pilot-batching.js'])vm.runInContext(String(read(file)),context,{filename:file});
 const G=context.GA,source=String(read('src/renderer.js'));
 assert(source.includes('const finishSubmission=this.beforeSceneSubmit?.(this.camera,opts);'));
 assert(source.includes('try{this.engine.render(this.scene,this.camera);}finally{finishSubmission?.();}'),'Submission errors must restore source visibility');
 const make=()=>{
  const r=Object.assign(Object.create(G.DioramaRenderer.prototype),{
   T,scene:new T.Scene(),mats:{timber:new T.MeshStandardMaterial(),forestLeaf:new T.MeshStandardMaterial()},
   cache:new Map(),geometryRefs:new Map(),indexByArray:new Map(),recordMap:new Map(),packs:new Map(),
   records:[],objects:[],signObjects:[],residentBytes:0,uploads:0,evictions:0,quality:'balanced',graceSeconds:6,attributeBudget:160*1048576,
   engine:{shadowMap:{enabled:true,type:T.PCFShadowMap},renderLists:{dispose(){}}}
  });
  r.sun=new T.DirectionalLight();r.sun.castShadow=true;r.scene.add(r.sun,r.sun.target);
  return r;
 };
 const pose=(r,eye,target,{aspect=16/9,fov=49,shadowSpan=180}={})=>{
  const camera=new T.PerspectiveCamera(fov,aspect,.35,18000);camera.position.fromArray(eye);camera.lookAt(...target);camera.updateMatrixWorld();
  r.sun.position.fromArray(target.map((v,i)=>v+[-430,760,320][i]));r.sun.target.position.fromArray(target);
  Object.assign(r.sun.shadow.camera,{left:-shadowSpan,right:shadowSpan,top:shadowSpan,bottom:-shadowSpan,near:20,far:2200});r.sun.shadow.camera.updateProjectionMatrix();
  r.scene.updateMatrixWorld();r.sun.shadow.updateMatrices(r.sun);
  const frustum=new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
  return {camera,rig:{eye,target,aspect,fov,planes:frustum.planes.map(p=>[...p.normal.toArray(),p.constant])}};
 };
 const options={space:'surface',displayMode:'continuous',focus:'forest',vegetation:true};
 const prepare=(r,{rig},opts=options)=>{
  for(const record of r.records){
   const yes=r.wanted(record,rig,opts,G.length(G.sub(rig.eye,rig.target)));record.wanted=yes;
   if(!yes){if(record.item)record.item.mesh.visible=false;continue;}
   const mesh=r.ensure(record,r.quality==='low'?1:r.levelFor(record,record.distance));mesh.visible=true;mesh.castShadow=r.engine.shadowMap.enabled;
   record.lastUsed=performance.now()/1000;
  }
  r.scene.updateMatrixWorld();
 };
 const draws=(r,camera,shadow=false)=>{
  const f=shadow?r.sun.shadow.getFrustum():new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
  let calls=0,triangles=0;const instances=[];
  for(const item of r.objects){const m=item.mesh;if(!m.visible||!m.material.visible||!m.layers.test(camera.layers)||shadow&&!m.castShadow||m.frustumCulled&&!f.intersectsObject(m))continue;
   calls++;const count=m.count??1;triangles+=(m.geometry.index?.count??m.geometry.attributes.position.count)/3*count;
   for(let i=0;i<count;i++)instances.push([m.geometry.id,m.material.id,...m.instanceMatrix.array.subarray(i*16,i*16+16),...m.instanceColor.array.subarray(i*3,i*3+3)].join(','));
  }
  return {calls,triangles,instances:instances.sort()};
 };
 const retained=r=>r.records.map(q=>({record:q,item:q.item,array:q.array,level:q.level,wanted:q.wanted,visible:q.item?.mesh.visible}));
 const verifyRetention=(r,old)=>{assert.equal(r.records.length,old.length);for(let i=0;i<old.length;i++){const a=old[i],b=r.records[i];assert.equal(a.record,b);for(const key of ['item','array','level','wanted'])assert.equal(b[key],a[key]);assert.equal(b.item?.mesh.visible,a.visible);}};
 const frame=(r,view)=>{
  prepare(r,view);const before=retained(r),main=draws(r,view.camera),shadow=draws(r,view.camera,true);
  const restore=r.beforeSceneSubmit(view.camera,options),next=draws(r,view.camera),nextShadow=draws(r,view.camera,true);
  assert.deepEqual(next.instances,main.instances,'Main membership/matrices/colors/material changed');assert.equal(next.triangles,main.triangles);
  assert.deepEqual(nextShadow.instances,shadow.instances,'Shadow membership/matrices/colors/material changed');assert.equal(nextShadow.triangles,shadow.triangles);
  assert(next.calls<=main.calls);assert(nextShadow.calls<=shadow.calls);
  const report={...r.forestBatchingStats};assert.equal(report.mainDrawReduction,main.calls-next.calls);assert.equal(report.shadowDrawReduction,shadow.calls-nextShadow.calls);
  assert.equal(r.objects.filter(o=>o.data.forestDrawBucket).length,report.residentBuckets,'Additional objects omitted from normal accounting');
  const bucketBytes=[...r.forestDrawBuckets.values()].reduce((n,b)=>n+b.mesh.instanceMatrix.array.byteLength+b.mesh.instanceColor.array.byteLength,0);assert.equal(report.attributeBytes,bucketBytes);
  const ownedGeometry=[...r.geometryRefs.values()].reduce((n,g)=>n+g.bytes,0);
  const ownedInstances=r.objects.reduce((n,o)=>n+o.mesh.instanceMatrix.array.byteLength+o.mesh.instanceColor.array.byteLength,0);
  assert.equal(r.residentBytes,ownedGeometry+ownedInstances,'Resident bytes must include every source and bucket allocation exactly once');
  restore?.();verifyRetention(r,before);assert.deepEqual(draws(r,view.camera),main,'Source/reflection path was not restored');
  return {main:{before:main.calls,after:next.calls,triangles:main.triangles},shadow:{before:shadow.calls,after:nextShadow.calls,triangles:shadow.triangles},...report};
 };
 const empty=r=>{
  r.dropPack('forest');for(const name of ['cache','geometryRefs','recordMap','packs'])assert.equal(r[name].size,0,name+' retained resources');
  assert.equal(r.records.length,0);assert.equal(r.objects.length,0);assert.equal(r.residentBytes,0);assert.equal(r.forestDrawBuckets?.size||0,0);
  assert.equal(r.scene.children.filter(o=>o.isMesh).length,0);for(const m of Object.values(r.mats))m.dispose();
 };

 // A deliberately loose source record passes application selection while its
 // actual geometry is outside the camera. It must not enter a visible bucket.
 const triangle=Float32Array.from([0,0,0,0,1,0,1,1,1,2,0,0,0,1,0,1,1,1,0,2,0,0,1,0,1,1,1]);
 const r=make(),mat=new T.Matrix4(),models=[];
 for(let i=0;i<5;i++){
  const x=[0,2,4,1000,-2][i];mat.makeTranslation(x,0,0);
  models.push({id:'forest:trees:'+i+':0:0:leaf',owner:'forest',region:'forest',space:'surface',group:'vegetation',material:'forestLeaf',vertices:triangle,farVertices:triangle,
   instances:Float32Array.from(mat.elements),instanceColors:Float32Array.from([.2+i*.1,.5,.6]),center:[0,0,0],radius:2000,lodDistance:280});
 }
 r.attachPack({id:'forest',meshes:models,signs:[]});const v=pose(r,[0,8,20],[0,0,0],{shadowSpan:2});
 const edge=frame(r,v);assert.equal(r.records.every(q=>q.wanted),true);assert.equal(edge.sourceDrawObjects,4);assert(edge.mainDrawReduction>0);
 const repeated=frame(r,v);assert.equal(repeated.bufferUpdates,0,'A still frame must not recopy static instance buffers');
 // Source attribute versions invalidate packing without changing tree identity.
 r.records[0].item.mesh.instanceColor.array[0]=.77;r.records[0].item.mesh.instanceColor.needsUpdate=true;
 assert(frame(r,v).bufferUpdates>0);
 const beforeDisable=r.residentBytes,bucketBytes=r.forestBatchingStats.attributeBytes;r.setForestBatchingEnabled(false);assert.equal(r.residentBytes,beforeDisable-bucketBytes);
 prepare(r,v);const disabled=draws(r,v.camera);r.beforeSceneSubmit(v.camera,options)?.();assert.deepEqual(draws(r,v.camera),disabled);assert.equal(r.forestBatchingStats.enabled,false);
 r.setForestBatchingEnabled(true);frame(r,v);r.clearForestBatches();
 // A partially added bucket must release its geometry reference and instance
 // storage, while source meshes remain ready for a subsequent normal frame.
 prepare(r,v);const faultState=retained(r),faultBytes=r.residentBytes,add=r.scene.add,error=new Error('injected bucket scene-add failure');
 r.scene.add=function(mesh){add.call(this,mesh);if(mesh.name.startsWith('forest:draw-bucket:'))throw error;return this;};
 assert.throws(()=>r.beforeSceneSubmit(v.camera,options),e=>e===error);r.scene.add=add;
 verifyRetention(r,faultState);assert.equal(r.residentBytes,faultBytes);assert.equal(r.objects.length,models.length);assert.equal(r.forestDrawBuckets.size,0);
 frame(r,v);
 // A late mesh transform is intentionally left as a direct source draw.
 r.records[0].item.mesh.position.x=1;frame(r,v);assert(![...r.forestDrawBuckets.values()].some(b=>b.members.some(m=>m.record===r.records[0])));
 r.records[0].item.mesh.position.x=0;
 // An unhandled extra shadow light takes the reversible direct-render path.
 const extra=new T.SpotLight();extra.castShadow=true;r.scene.add(extra);prepare(r,v);r.beforeSceneSubmit(v.camera,options)?.();assert.equal(r.forestDrawBuckets.size,0);r.scene.remove(extra);
 frame(r,v);r.records.forEach(q=>q.wanted=false);r.trim(true);assert.equal(r.residentBytes,0);assert.equal(r.objects.length,0);empty(r);

 // Full native forest population, multiple real presets, aspect/FOV, quality
 // and LOD transitions. These are CPU submission counts, not full-frame calls.
 const original=G.buildForest(new G.Terrain(JSON.parse(read('data/atlas.json'))));
 const trees=original.meshes.filter(m=>/^forest:trees:/.test(m.id)).map(m=>{
  const match=m.id.match(/^forest:trees:-?\d+:-?\d+:([012]):(wood|leaf)$/);
  return G.FOREST_CROWN_ROLLOUT.replaceTree({...m,space:'surface'},Number(match[1]),match[2]);
 });assert.equal(trees.length,310);assert.equal(trees.filter(m=>m.material==='forestLeaf').reduce((n,m)=>n+m.instances.length/16,0),755);
 const digest=m=>{const h=createHash('sha256');for(const k of ['instances','instanceColors','vertices','farVertices'])h.update(new Uint8Array(m[k].buffer,m[k].byteOffset,m[k].byteLength));return h.digest('hex');};
 const originalDigests=trees.map(digest),originalViews=trees.map(m=>[m.instances,m.instanceColors,m.vertices,m.farVertices]);
 // A far-first mesh switching to near must cull identically to a newly
 // created near mesh. This correction is independent of the batching toggle.
 let lodSphereChecks=0;
 for(const enabled of [false,true]){
  const direct=make(),switched=make();direct.setForestBatchingEnabled(enabled);switched.setForestBatchingEnabled(enabled);
  for(const renderer of [direct,switched])renderer.attachPack({id:'forest',meshes:trees,signs:[]});
  for(let i=0;i<trees.length;i++){
   const source=trees[i],metadata=JSON.stringify([source.center,source.radius,source.lodDistance]),a=direct.ensure(direct.records[i],0),b=switched.ensure(switched.records[i],1);
   const initialFar=b.boundingSphere.clone(),nearGeometry=a.geometry,identity=b;
   switched.ensure(switched.records[i],0);
   assert.equal(switched.records[i].item.mesh,identity);assert(b.boundingSphere.equals(a.boundingSphere),'Far-first sphere differs from near-first: '+source.id);
   assert.equal(a.geometry,nearGeometry);assert.equal(JSON.stringify([source.center,source.radius,source.lodDistance]),metadata);
   const compute=b.computeBoundingSphere;let recalculations=0;b.computeBoundingSphere=function(){recalculations++;return compute.call(this);};
   switched.ensure(switched.records[i],0);assert.equal(recalculations,0,'Stable LOD should reuse its sphere');
   switched.ensure(switched.records[i],1);assert(b.boundingSphere.equals(initialFar),'Near-to-far did not restore the far sphere');
   switched.ensure(switched.records[i],0);assert(b.boundingSphere.equals(a.boundingSphere));assert.equal(recalculations,2);lodSphereChecks++;
  }
  empty(direct);empty(switched);
 }
 const outside=make(),other={...trees[0],id:'forest:other-tree'};outside.attachPack({id:'forest',meshes:[other],signs:[]});
 const otherMesh=outside.ensure(outside.records[0],1);let unrelatedRefreshes=0;const computeOther=otherMesh.computeBoundingSphere;
 otherMesh.computeBoundingSphere=function(){unrelatedRefreshes++;return computeOther.call(this);};outside.ensure(outside.records[0],0);
 assert.equal(unrelatedRefreshes,0,'The sphere correction escaped the native forest tree scope');empty(outside);
 const forest=make(),samples=[];forest.attachPack({id:'forest',meshes:trees,signs:[]});
 for(const name of ['forestOverview','forest','alice','marisa','forestOverview']){
  const p=G.PRESETS[name];samples.push({view:name,...frame(forest,pose(forest,p.eye,p.target))});
 }
 forest.quality='low';forest.engine.shadowMap.enabled=false;const p=G.PRESETS.forest;samples.push({view:'forest-low-wide',...frame(forest,pose(forest,p.eye,p.target,{fov:72,aspect:2}))});
 for(let cycle=0;cycle<4;cycle++){
  forest.dropPack('forest');assert.equal(forest.residentBytes,0);assert.equal(forest.objects.length,0);
  forest.attachPack({id:'forest',meshes:trees,signs:[]});frame(forest,pose(forest,p.eye,p.target));
 }
 trees.forEach((m,i)=>{for(const [j,key]of ['instances','instanceColors','vertices','farVertices'].entries())assert.equal(m[key],originalViews[i][j]);assert.equal(digest(m),originalDigests[i]);});empty(forest);
 return {threeRevision:T.REVISION,edge:{main:edge.main,shadow:edge.shadow},nativeTrees:755,sourceRecords:310,lodSphereChecks,views:samples.map(({view,main,shadow,attributeBytes,residentBuckets})=>({view,main,shadow,attributeBytes,residentBuckets})),reloadCycles:4,remainingResources:0,meaning:'CPU submission equivalence; browser pixels, timings and complete passes require A/B validation'};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const root=fileURLToPath(new URL('../',import.meta.url));
 console.log(JSON.stringify(checkForestPilotBatching(name=>fs.readFileSync(path.join(root,name))),null,2));
}
