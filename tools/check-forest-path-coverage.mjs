// Read-only coverage and production visibility/resource dispatch checks.
// Node 22 only; no canvas, WebGL context or automatically updated fixtures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import * as T from '../vendor/three/three.module.js';
import {prepareForestPathColorSource,raw,sha} from './generate-forest-path-colors.mjs';

assert(Number(process.versions.node.split('.')[0])>=22,'Use Node 22 for geometry checks');
const root=fileURLToPath(new URL('../',import.meta.url)),read=p=>fs.readFileSync(root+p),hash=a=>sha(raw(a));
const source=prepareForestPathColorSource(),{context,G,terrain,overview,models}=source;
vm.runInContext(read('src/forest-path-colors.js').toString(),context);
const metadata=G.FOREST_PATH_COLORS.metadata,legacy=models.at(-1),publicRoads=models.slice(0,-1);
const before=models.map(m=>({m,vertices:m.vertices,index:m.index,vertexSHA:hash(m.vertices),indexSHA:m.index?hash(m.index):null,metadata:JSON.stringify([m.id,m.group,m.owner,m.material,m.center,m.radius,m.overview,m.globalSurface,m.component,m.pathOwner])}));
for(const p of ['src/world-builder.js','data/atlas.json','assets/packs/overview.pack.gz'])assert.equal(sha(read(p)),metadata.inputs[p],'Coverage source changed: '+p);
for(const {m,vertexSHA,indexSHA}of before){const fixed=metadata.records.find(s=>s.id===m.id);assert(fixed);assert.equal(vertexSHA,fixed.vertexSHA,m.id+' original vertices');assert.equal(indexSHA,fixed.indexSHA,m.id+' original indices');}

// Rebuild only the public forest ribbons in original route/batch order. Matching
// both raw arrays binds each six-index quad to the actual retained source pack,
// including inside/water filtering rather than just the allRoutes definitions.
const batches=new Map(),segments=[];
const add=key=>{if(!batches.has(key))batches.set(key,{g:new G.Geometry(),segments:[]});return batches.get(key);};
const normal=(p,q)=>{const dx=q[0]-p[0],dz=q[1]-p[1],l=Math.hypot(dx,dz)||1;return[-dz/l,dx/l];};
for(const route of G.ISLAND.allRoutes)for(let i=0;i<route.samples.length-1;i++){
 const a=route.samples[i],b=route.samples[i+1],x=(a[0]+b[0])/2,z=(a[1]+b[1])/2,owner=G.DIORAMA.owner(x,z)||'connections';
 const accepted=G.ISLAND.inside(x,z)&&(!terrain.water(x,z)||route.id==='route-shrine'),key=owner+':'+Math.floor(x/512)+':'+Math.floor(z/512);
 const segment={route:route.id,i,accepted,owner,record:'island:routes:'+key};segments.push(segment);if(!accepted||owner!=='forest')continue;
 const na=normal(route.samples[Math.max(0,i-1)],b),nb=normal(a,route.samples[Math.min(route.samples.length-1,i+2)]),half=route.width*.5;
 const point=(p,n,s)=>[p[0]+n[0]*s,terrain.height(p[0]+n[0]*s,p[1]+n[1]*s)+.13,p[1]+n[1]*s],center=add(key);
 segment.indexOffset=center.segments.length*6;center.segments.push(segment);
 center.g.quad(point(a,na,-half),point(a,na,half),point(b,nb,half),point(b,nb,-half),G.rgb('#9e946f'));
 for(const side of[-1,1]){const shoulder=add(key+':shoulder');shoulder.segments.push(segment);shoulder.g.quad(point(a,na,side*half),point(a,na,side*(half+2.5)),point(b,nb,side*(half+2.5)),point(b,nb,side*half),G.rgb('#839063'));}
}
assert.equal(batches.size,8);assert.equal(publicRoads.length,8);
for(const [key,{g}]of batches){const rebuilt=G.ISLAND.indexed(g.mesh('island:routes:'+key,'roads',{})),original=publicRoads.find(m=>m.id===rebuilt.id);assert(original);assert.equal(hash(rebuilt.vertices),hash(original.vertices),rebuilt.id+' rebuilt vertices');assert.equal(hash(rebuilt.index),hash(original.index),rebuilt.id+' rebuilt index');}
const expected=[['forest-entry','island-forest-entry',86],['forest-alice','route-alice',96],['forest-marisa','route-marisa',80],['forest-loop','island-forest-loop',178],['forest-mushroom','island-forest-mushroom',69],['forest-oak','island-forest-oak',48],['forest-boardwalk','island-forest-boardwalk',53]];
assert.equal(G.FOREST.paths.length,expected.length);
let legacyVertexOffset=0;const coverage=[];
for(const [id,publicId,count]of expected){
 const old=G.FOREST.paths.find(p=>p.id===id),route=G.ISLAND.allRoutes.find(p=>p.id===publicId);assert(old&&route);
 assert.equal(old.samples.length-1,count,id+' retained segment count');assert.equal(JSON.stringify(route.samples),JSON.stringify(old.samples),id+' exact centerline');
 const matched=segments.filter(s=>s.route===publicId);assert.equal(matched.length,count);assert(matched.every(s=>s.accepted&&s.owner==='forest'),id+' has a legacy-only segment');
 // Original detail quads themselves still follow every original sample pair.
 for(let i=0;i<count;i++){const a=old.samples[i],b=old.samples[i+1],n=G.norm([-(b[1]-a[1]),0,b[0]-a[0]]),p=(v,s)=>[v[0]+n[0]*s,terrain.height(v[0]+n[0]*s,v[1]+n[2]*s)+.18,v[1]+n[2]*s],g=new G.Geometry();g.quad(p(a,old.width*.5),p(b,old.width*.5),p(b,-old.width*.5),p(a,-old.width*.5),G.rgb('#9e927a'));assert.deepEqual(Array.from(legacy.vertices.subarray((legacyVertexOffset+i*6)*9,(legacyVertexOffset+(i+1)*6)*9)),Array.from(new Float32Array(g.a)),id+' original detail quad '+i);}
 coverage.push({id,publicId,segments:count,legacyWidth:old.width,publicWidth:route.width,start:Array.from(old.samples[0]),end:Array.from(old.samples.at(-1)),records:[...new Set(matched.map(s=>s.record))]});legacyVertexOffset+=count*6;
}
assert.equal(legacyVertexOffset,3660);assert.equal(legacy.vertices.length,legacyVertexOffset*9);assert(!legacy.index);
const paired=new Set(expected.map(([,id])=>id)),extra=segments.filter(s=>s.accepted&&s.owner==='forest'&&!paired.has(s.route));
assert.equal(extra.length,47);assert(extra.every((s,i)=>s.route==='route-muenzuka'&&s.i===i&&s.record==='island:routes:forest:-3:0'));
assert.equal(segments.filter(s=>s.accepted&&s.owner==='forest').length,657);

// Build only the permanent boardwalk to exercise its real inherited tile/LOD
// policy. The visibility change must not remove the new wooden path or terrain.
for(const p of ['src/surface-contact.js','src/forest-upgrade.js'])vm.runInContext(read(p).toString(),context,{filename:p});
const data=JSON.parse(read('data/atlas.json'));G.FOREST_UPGRADE.prepare(data,overview);
const boardwalk=[...G.FOREST_UPGRADE.boardwalk(data).meshes,...G.FOREST_UPGRADE.boardwalk(data,true).meshes];assert.equal(boardwalk.length,11);
const tiles=overview.meshes.filter(m=>boardwalk.some(w=>w.terrainSource===m.id));
for(const p of ['src/renderer.js','src/kourindou-renderer.js','src/forest-renderer.js'])vm.runInContext(read(p).toString(),context,{filename:p});
const Parent=G.DioramaRenderer;vm.runInContext(read('src/forest-path-renderer.js').toString(),context,{filename:'src/forest-path-renderer.js'});
const F=G.FOREST_PATH_RENDERER;assert.equal(F.coverageIds.length,8);assert.deepEqual([...F.coverageIds].sort(),publicRoads.map(m=>m.id).sort());
const J=F.junction,centerSource=publicRoads.find(m=>m.id===J.record);assert(centerSource);assert.equal(J.route,'route-marisa');assert.equal(J.quads.length,3);assert.equal(J.padding,.0002);
assert.deepEqual(Array.from(J.quads,q=>q.segment),[41,42,43]);assert.deepEqual(Array.from(J.quads,q=>q.indexOffset),[144,150,156]);
for(const q of J.quads){
 assert.equal(segments.find(s=>s.route===J.route&&s.i===q.segment).indexOffset,q.indexOffset);
 const original=[0,1,2,5].map(i=>{const k=centerSource.index[q.indexOffset+i]*9;return[centerSource.vertices[k],centerSource.vertices[k+2]];});assert.equal(JSON.stringify(q.points),JSON.stringify(original),'Fixed junction is not the retained road quad');
}
// An independent point-in-polygon reference uses the raw source edges, while
// the shader/contains helper uses Float32 half-planes and a 0.2mm edge tolerance.
const insideQuad=(p,q,tolerance=1e-9)=>{const sign=Math.sign(q.reduce((s,a,i)=>{const b=q[(i+1)%q.length];return s+a[0]*b[1]-b[0]*a[1];},0));return q.every((a,i)=>{const b=q[(i+1)%q.length],dx=b[0]-a[0],dz=b[1]-a[1];return sign*(dx*(p[1]-a[1])-dz*(p[0]-a[0]))/Math.hypot(dx,dz)>=-tolerance;});};
const insideSource=p=>J.quads.some(q=>insideQuad(p,q.points));let boundaryPoints=0;
for(const q of J.quads){
 const center=[0,1].map(i=>q.points.reduce((n,p)=>n+p[i]/4,0));assert(J.contains(...center));boundaryPoints++;
 const sign=Math.sign(q.points.reduce((s,a,i)=>{const b=q.points[(i+1)%4];return s+a[0]*b[1]-b[0]*a[1];},0));
 for(let i=0;i<4;i++){const a=q.points[i],b=q.points[(i+1)%4],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),mid=a.map((v,k)=>(v+b[k])/2);assert(J.contains(...mid.map(Math.fround)));boundaryPoints++;
  for(const side of[-1,1]){const p=[mid[0]-dz/length*sign*.02*side,mid[1]+dx/length*sign*.02*side].map(Math.fround);assert.equal(J.contains(...p),insideSource(p),'Junction inner/outer edge');boundaryPoints++;}
 }
}
for(const p of [[-887,79],[-879,87],[-891,92],[-930,-103],[-560,0]]){assert(!J.contains(...p));boundaryPoints++;}
const rayMaterial=new T.MeshBasicMaterial({side:T.DoubleSide}),rayObjects=[...publicRoads,...boardwalk.filter(m=>m.globalNear),overview.meshes.find(m=>m.id==='island:terrain:-1024:0')].map(m=>{const g=new T.BufferGeometry(),v=new T.InterleavedBuffer(m.vertices,9);g.setAttribute('position',new T.InterleavedBufferAttribute(v,3,0));if(m.index)g.setIndex(new T.BufferAttribute(m.index,1));g.computeBoundingSphere();const mesh=new T.Mesh(g,rayMaterial);mesh.name=m.id;mesh.updateMatrixWorld();return mesh;});
const junctionCamera=new T.PerspectiveCamera(60,1280/720,.2,18000);junctionCamera.position.fromArray([-879.6793002915451,57.748246482235416,78.1603498542274]);junctionCamera.lookAt(-887,55.047253325528196,87);junctionCamera.updateMatrixWorld();const ray=new T.Raycaster(),blockedPixels=[];
for(const pixel of [[600,560],[650,590],[720,620]]){ray.setFromCamera(new T.Vector2(pixel[0]/1280*2-1,1-pixel[1]/720*2),junctionCamera);const hits=ray.intersectObjects(rayObjects,false),first=hits[0],after=hits.find(h=>!h.object.name.endsWith(':shoulder')||!J.contains(h.point.x,h.point.z));assert(first.object.name.endsWith(':shoulder'));assert([486,487,490].includes(first.faceIndex));assert(J.contains(first.point.x,first.point.z));assert(insideSource([first.point.x,first.point.z]));assert.equal(after.object.name,J.record);assert([48,49,50,51].includes(after.faceIndex));blockedPixels.push({pixel,before:first.object.name,shoulderFace:first.faceIndex,after:after.object.name,roadFace:after.faceIndex,point:first.point.toArray()});}
for(const mesh of rayObjects)mesh.geometry.dispose();rayMaterial.dispose();
const gl={RENDERER:1,VERSION:2,getExtension(){return null;},getParameter(){return 'CPU-only';}},info={render:{calls:0,triangles:0},memory:{geometries:0,textures:0},reset(){this.render.calls=0;this.render.triangles=0;}};
const engine={shadowMap:{},renderLists:{dispose(){}},info,getContext(){return gl;},setRenderTarget(){},clear(){},render(){}};
const r=Object.assign(Object.create(G.DioramaRenderer.prototype),{T,world:{terrain,meshes:overview.meshes},scene:new T.Scene(),camera:new T.PerspectiveCamera(),sky:new T.Object3D(),rain:new T.Object3D(),sun:new T.DirectionalLight(),sunAnchor:[0,0,0],cache:new Map(),geometryRefs:new Map(),indexByArray:new Map(),recordMap:new Map(),packs:new Map(),records:[],objects:[],signObjects:[],residentBytes:0,uploads:0,evictions:0,renderCount:0,attributeBudget:160*1048576,graceSeconds:6,quality:'balanced',stats:{},timeUniform:{value:0},cutUniform:{value:0},mistUniform:{value:0},coverUniform:{value:0},engine,mats:{ground:new T.MeshStandardMaterial({vertexColors:true,roughness:.95,side:T.DoubleSide})},sceneTarget:{width:16,height:16},blurA:{width:8,height:8},aoTarget:{width:8,height:8},lighting(){},post(){return 0;}});
r.kourindouApproach=Parent.approachSegments();r.kourindouGroundVariants=new Map();r.forestHomeLanes=Parent.yardSegments();r.forestGroundVariants=new Map();
r.sky.visible=false;r.rain.visible=false;for(const k of ['water','caveWater','canalWater','lakeWater','windWater'])r[k]={uniforms:{uReflect:{value:0}}};
for(const k of ['forestWoodZ','forestStone'])r.mats['kourindou'+k.slice(6)]=new T.MeshStandardMaterial({vertexColors:true});
r.patchMaterials();r.mats.ground.customProgramCacheKey=()=> 'ground-contact-v014';
r.addRecords([...tiles,...boardwalk],'overview');r.attachPack({id:'public-coverage',meshes:publicRoads,signs:[]});r.attachPack({id:'forest',meshes:[legacy],signs:[]});
const rig={eye:[-998,74,-123],target:[-1080,67,-160],planes:[],fov:60,aspect:1280/720},opts={space:'surface',displayMode:'diorama',focus:'forest',vegetation:true,lighting:'neutral',weather:'clear',reflections:false,bloom:false,motion:false,time:12.5};
let visibilityCases=0,otherRecordCases=0;
for(const quality of ['low','balanced','high'])for(const space of ['surface','mausoleum','senkai','section','asama'])for(const mode of ['diorama','atlas'])for(const distance of [90,1901]){
 r.quality=quality;const o={...opts,space,displayMode:mode};for(const record of r.records){const old=Parent.prototype.wanted.call(r,record,rig,o,distance),now=r.wanted(record,rig,o,distance);if(record.data.id==='forest:paths'){assert.equal(now,false);visibilityCases++;}else{assert.equal(now,old,record.data.id+' inherited visibility');otherRecordCases++;}}
}
r.quality='balanced';const record=r.recordMap.get(legacy.id);assert(Parent.prototype.wanted.call(r,record,rig,opts,90));assert(r.forestPathCovered(legacy));
for(const id of F.coverageIds){const saved=r.recordMap.get(id);r.recordMap.delete(id);assert(!r.forestPathCovered(legacy));assert.equal(r.wanted(record,rig,opts,90),Parent.prototype.wanted.call(r,record,rig,opts,90),id+' missing coverage fallback');r.recordMap.set(id,saved);assert(!r.wanted(record,rig,opts,90));}
const altered=r.recordMap.get(F.coverageIds[0]),originalData=altered.data;
const publicFaults=[{globalSurface:false},{overview:false},{component:'other-road'},{pathOwner:'connections'},{material:'matte'},{group:'architecture'},{vertices:originalData.vertices.subarray(9)},{index:originalData.index.subarray(6)}];
for(const change of publicFaults){altered.data={...originalData,...change};assert(!r.forestPathCovered(legacy));assert.equal(r.wanted(record,rig,opts,90),Parent.prototype.wanted.call(r,record,rig,opts,90));}altered.data=originalData;
for(const change of [{id:'forest:paths:other'},{owner:'island'},{material:'matte'},{vertices:legacy.vertices.subarray(9)},{index:new Uint32Array(0)},{farVertices:legacy.vertices}]){const other={...record,data:{...legacy,...change}};assert(!r.forestPathCovered(other.data));assert.equal(r.wanted(other,rig,opts,90),Parent.prototype.wanted.call(r,other,rig,opts,90));}

// Use the actual production frame loop with its WebGL submission stubbed out,
// so wanted=false must also hide an already-created mesh before normal trim.
// Terrain solvers/samplers are forbidden throughout runtime dispatch.
const savedHeight=terrain.height,savedSampler=G.ASAMA.sampleRenderedTerrain;let runtimeTerrainCalls=0;
terrain.height=()=>{runtimeTerrainCalls++;throw Error('Runtime coverage sampled terrain');};G.ASAMA.sampleRenderedTerrain=terrain.height;
let reentries=0,hiddenExistingMesh=false,afterHiddenResidentAttributeBytes;
try{
 r.render(rig,opts);assert(!record.wanted&&!record.item);assert.equal(r.forestPathResidentAttributeBytes,80570);assert.equal(r.forestPathAttributeBuilds,8);assert.equal(r.forestPathJunctionUniform.value,1);
 for(const id of F.coverageIds){const saved=r.recordMap.get(id);r.recordMap.delete(id);assert(r.wanted(record,rig,opts,90));assert.equal(r.forestPathJunctionUniform.value,0);r.recordMap.set(id,saved);assert(!r.wanted(record,rig,opts,90));assert.equal(r.forestPathJunctionUniform.value,1);}
 for(const change of publicFaults){altered.data={...originalData,...change};assert(r.wanted(record,rig,opts,90));assert.equal(r.forestPathJunctionUniform.value,0);altered.data=originalData;assert(!r.wanted(record,rig,opts,90));assert.equal(r.forestPathJunctionUniform.value,1);}
 const programs=[...r.forestPathMaterials.values()].map(m=>m.customProgramCacheKey());assert.equal(new Set(programs).size,2);
 r.dropPack('public-coverage');assert(!r.forestPathCovered(legacy));assert(publicRoads.every(m=>!r.forestPathArrays.has(m.vertices)));assert.equal(r.forestPathJunctionUniform.value,0);
 r.render(rig,opts);assert(record.wanted&&record.item.mesh.visible);assert.equal(r.forestPathResidentAttributeBytes,25620);
 r.attachPack({id:'public-coverage',meshes:publicRoads.slice(0,4),signs:[]});assert.equal(r.forestPathJunctionUniform.value,0);r.render(rig,opts);assert(record.wanted&&record.item.mesh.visible);
 r.attachPack({id:'public-coverage',meshes:publicRoads,signs:[]});assert.equal(r.forestPathJunctionUniform.value,1);const oldMesh=record.item.mesh;
 r.render(rig,opts);assert(!record.wanted&&!oldMesh.visible);hiddenExistingMesh=true;r.trim(true);assert(!record.item);assert(!r.geometryRefs.has(legacy.vertices));assert.equal(r.forestPathResidentAttributeBytes,80570);afterHiddenResidentAttributeBytes=r.forestPathResidentAttributeBytes;
 const boardwalkVisible=()=>r.records.filter(v=>v.data.component==='forest-boardwalk'&&v.wanted).map(v=>v.data.id).sort(),walkBefore=boardwalkVisible();assert(walkBefore.length>0);
 for(let cycle=0;cycle<3;cycle++){
  const oldData=r.recordMap.get(legacy.id).data;r.dropPack('forest');assert(!r.recordMap.has(legacy.id));assert(!r.forestPathArrays.has(oldData.vertices));assert(!r.geometryRefs.has(oldData.vertices));assert.equal(r.forestPathJunctionUniform.value,1);
  const fresh={...legacy,vertices:legacy.vertices.slice()};r.attachPack({id:'forest',meshes:[fresh],signs:[]});assert(r.forestPathArrays.has(fresh.vertices));assert(r.forestPathCovered(fresh));r.render(rig,opts);const next=r.recordMap.get(legacy.id);assert(!next.wanted&&!next.item);assert(!r.geometryRefs.has(fresh.vertices));assert.equal(r.forestPathResidentAttributeBytes,80570);assert.deepEqual(boardwalkVisible(),walkBefore);assert.equal(r.forestPathJunctionUniform.value,1);reentries++;
 }
}finally{terrain.height=savedHeight;G.ASAMA.sampleRenderedTerrain=savedSampler;}
assert.equal(runtimeTerrainCalls,0);r.dropPack('forest');r.dropPack('public-coverage');for(const v of r.records)r.evict(v);
assert.equal(r.forestPathJunctionUniform.value,0);
assert.equal(r.geometryRefs.size,0);assert.equal(r.cache.size,0);assert.equal(r.residentBytes,0);assert.equal(r.forestPathResidentAttributeBytes,0);
for(const {m,vertices,index,vertexSHA,indexSHA,metadata:originalMetadata}of before){assert.equal(m.vertices,vertices);assert.equal(m.index,index);assert.equal(hash(m.vertices),vertexSHA);assert.equal(m.index?hash(m.index):null,indexSHA);assert.equal(JSON.stringify([m.id,m.group,m.owner,m.material,m.center,m.radius,m.overview,m.globalSurface,m.component,m.pathOwner]),originalMetadata);}
console.log(JSON.stringify({revision:2,sourceBaseline:metadata.sourceBaseline,visibilityRevision:F.revision,legacySegments:610,coveredLegacySegments:610,legacyOnlySegments:0,publicForestSegments:657,retainedMuenzukaSegments:47,coverage,publicRecords:publicRoads.map(m=>({id:m.id,vertexSHA:hash(m.vertices),indexSHA:hash(m.index)})),legacyVertexSHA:hash(legacy.vertices),junction:{revision:J.revision,record:J.record,segments:Array.from(J.quads,q=>q.segment),sourceIndexOffsets:Array.from(J.quads,q=>q.indexOffset),quads:3,planes:12,paddingMeters:J.padding,boundaryPoints,blockedPixels,coverageLossDisablesMask:true,partialPackDisablesMask:true,forestDropKeepsMask:true,additionalUniformBytes:4},boardwalkRecords:boardwalk.length,visibilityCases,otherRecordCases,missingRecordFallbacks:F.coverageIds.length,malformedPublicFallbacks:8,malformedLegacyFallbacks:6,productionDispatchFrames:r.renderCount,hiddenExistingMesh,detailReentries:reentries,afterHiddenResidentAttributeBytes,runtimeTerrainCalls,finalResidentBytes:r.residentBytes,finalResidentAttributeBytes:r.forestPathResidentAttributeBytes,sourceArraysUnchanged:true,newTextures:0,newLights:0,newTargets:0,verification:'CPU coverage, junction source boundaries/rays and production visibility/resource dispatch with WebGL submission stubbed; no visual/GPU/performance acceptance'},null,2));
