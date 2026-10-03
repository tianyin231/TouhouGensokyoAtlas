// Offline source/resource checks only. Does not create a WebGL renderer or
// claim visual acceptance; run with Node 22, independently of the main checker.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import * as T from '../vendor/three/three.module.js';
import {prepareForestPathColorSource,sampleForestPathColors,serializeForestPathColors,raw,sha} from './generate-forest-path-colors.mjs';

assert(Number(process.versions.node.split('.')[0])>=22,'Use Node 22 for geometry checks');
const root=fileURLToPath(new URL('../',import.meta.url)),read=p=>fs.readFileSync(root+p),hash=a=>sha(raw(a)),source=prepareForestPathColorSource(),{context,G,terrain,overview,models}=source;
for(const p of ['src/renderer.js','src/kourindou-renderer.js','src/forest-renderer.js','src/forest-path-colors.js','src/forest-path-renderer.js'])vm.runInContext(read(p).toString(),context,{filename:p});
const F=G.FOREST_PATH_RENDERER,C=G.FOREST_PATH_COLORS,publicRoads=models.slice(0,-1),oldPath=models.at(-1),before=models.map(m=>({data:m,vertices:m.vertices,index:m.index,vertexSHA:hash(m.vertices),indexSHA:m.index?hash(m.index):null}));
const assetFileBefore=sha(read('src/forest-path-colors.js'));
assert.equal(publicRoads.length,8);assert.equal(models.length,9);assert(models.every(m=>!m.farVertices));
assert.equal(models.reduce((n,m)=>n+m.vertices.length/9*7,0),106190);
assert.equal(C.byteLength,45510);assert.equal(C.decodedBytes(),0);
for(const [file,digest]of Object.entries(C.metadata.inputs))assert.equal(sha(read(file)),digest,'Offline color input changed: '+file);
for(const [i,m]of models.entries()){
 const meta=C.metadata.records.find(r=>r.id===m.id);assert(meta,'Offline source ID missing');assert.equal(meta.vertexSHA,before[i].vertexSHA);assert.equal(meta.indexSHA,before[i].indexSHA);assert.equal(meta.vertexCount,m.vertices.length/9);assert.equal(meta.indexCount,m.index?.length||0);
}

const gl={RENDERER:1,VERSION:2,getExtension(){return null;},getParameter(){return 'CPU-only';}};
const r=Object.assign(Object.create(G.DioramaRenderer.prototype),{T,world:{terrain,meshes:overview.meshes},scene:new T.Scene(),cache:new Map(),geometryRefs:new Map(),indexByArray:new Map(),recordMap:new Map(),packs:new Map(),records:[],objects:[],signObjects:[],residentBytes:0,uploads:0,evictions:0,stats:{},cutUniform:{value:0},mistUniform:{value:0},coverUniform:{value:0},engine:{shadowMap:{},renderLists:{dispose(){}},getContext(){return gl;}},mats:{ground:new T.MeshStandardMaterial({vertexColors:true,roughness:.95,side:T.DoubleSide})},kourindouApproach:G.DioramaRenderer.approachSegments(),kourindouGroundVariants:new Map(),forestHomeLanes:G.DioramaRenderer.yardSegments(),forestGroundVariants:new Map()});
// Invoke production spatial patching, then retain the production ground key.
// The original contact-darkening addition does not alter this albedo stage.
r.patchMaterials();r.mats.ground.customProgramCacheKey=()=> 'ground-contact-v014';
r.addRecords(publicRoads,'overview');r.attachPack({id:'forest',meshes:[oldPath],signs:[]});
const originalFields=models.map(m=>JSON.stringify([m.center,m.radius,m.material,m.lodDistance]));
const savedHeight=terrain.height,savedNormal=terrain.normal,savedSampler=G.ASAMA.sampleRenderedTerrain;let realTerrainSolverCallsDuringAcquire=0,runtimeTerrainSamplerCalls=0;
terrain.height=terrain.normal=()=>{realTerrainSolverCallsDuringAcquire++;throw Error('Terrain solver was called during path acquire');};
G.ASAMA.sampleRenderedTerrain=()=>{runtimeTerrainSamplerCalls++;throw Error('Terrain sampler was called during path acquire');};
let detailColdAcquireMs=0,coldAcquireMs;
try{const coldAt=performance.now();for(const record of r.records){const at=performance.now();r.ensure(record,0);if(record.data.id==='forest:paths')detailColdAcquireMs=performance.now()-at;}coldAcquireMs=performance.now()-coldAt;}finally{terrain.height=savedHeight;terrain.normal=savedNormal;G.ASAMA.sampleRenderedTerrain=savedSampler;}
assert.equal(realTerrainSolverCallsDuringAcquire,0);assert.equal(runtimeTerrainSamplerCalls,0);assert.equal(C.decodedBytes(),45510);
assert.equal(r.forestPathResidentAttributeBytes,106190);assert.equal(r.residentBytes,[...r.geometryRefs.values()].reduce((n,a)=>n+a.bytes,0));
assert.equal(r.forestPathMaterials.size,2);const programKeys=[...r.forestPathMaterials.values()].map(m=>m.customProgramCacheKey());assert.equal(new Set(programKeys).size,2);
r.dropPack('overview');assert(r.forestPathArrays.has(publicRoads[0].vertices),'A base no-op drop must retain public-road metadata');assert.equal(r.records.length,9);

let sharedIndexedAssignments=0,sharedPositionAssignments=0,groundColorErrorTotal=0,groundColorErrorMax=0,groundColorSamples=0,analyticColorErrorTotal=0,analyticColorErrorMax=0;
const referenceTerrain=G.ASAMA.sampleRenderedTerrain(r.world),sharedGround=new Map();
const sampledOffline=sampleForestPathColors(source);assert.equal(sha(raw(sampledOffline.bytes)),C.metadata.payloadSHA);assert.equal(serializeForestPathColors(source,sampledOffline,C.metadata.sourceBaseline),read('src/forest-path-colors.js').toString(),'Offline asset differs from explicit generator');
const rgbBackings=new Set();
for(const m of models){
 const allocation=r.geometryRefs.get(m.vertices),geo=allocation.geo,side=geo.getAttribute('forestPathSide'),ground=geo.getAttribute('forestPathGround');
 assert.equal(side.count,m.vertices.length/9);assert.equal(ground.count,side.count);assert(ground.normalized);assert.equal(ground.array.BYTES_PER_ELEMENT,1);
 assert.equal(ground.array,C.get(m.id,side.count,m.index?.length||0),'Use the shared RGB source view');rgbBackings.add(ground.array.buffer);
 const colorMeta=C.metadata.records.find(q=>q.id===m.id);assert.equal(hash(ground.array),hash(sampledOffline.bytes.subarray(colorMeta.offset,colorMeta.offset+colorMeta.byteLength)));
 assert.equal(allocation.forestPathAttributeBytes,side.array.byteLength+ground.array.byteLength);assert.equal(allocation.bytes,m.vertices.byteLength+(m.index?.byteLength||0)+allocation.forestPathAttributeBytes);
 assert.equal(geo.getIndex()?.array,m.index);assert.equal(geo.getAttribute('position').data.array,m.vertices);
 const assigned=new Map(),positions=new Map(),idx=i=>m.index?m.index[i]:i,values=m.id==='forest:paths'?[1,1,-1,1,-1,-1]:m.id.endsWith(':shoulder')?[1,2,2,1,2,1]:[-1,1,1,-1,1,-1];
 for(let i=0;i<(m.index?.length||side.count);i+=6)for(let j=0;j<6;j++){
  const v=idx(i+j);if(assigned.has(v)){sharedIndexedAssignments++;assert.equal(assigned.get(v),values[j]);}assigned.set(v,values[j]);assert.equal(side.array[v],values[j]);
  const key=[0,1,2].map(k=>m.vertices[v*9+k]).join(',');if(positions.has(key)&&m.index){sharedPositionAssignments++;assert.equal(positions.get(key),values[j]);}positions.set(key,values[j]);
 }
 for(let i=0;i<side.count;i++){
  const x=m.vertices[i*9],z=m.vertices[i*9+2],c=referenceTerrain(x,z,'near').c,analytic=G.LANDSCAPE.groundColor(terrain,x,z),color=Array.from(ground.array.subarray(i*3,i*3+3)),key=x+':'+z;
  if(sharedGround.has(key))assert.deepEqual(color,sharedGround.get(key),'Center/shoulder ground color at a shared position');else sharedGround.set(key,color);
  for(let k=0;k<3;k++){const e=Math.abs(color[k]/255-c[k]),a=Math.abs(color[k]/255-analytic[k]);groundColorErrorTotal+=e;groundColorErrorMax=Math.max(groundColorErrorMax,e);analyticColorErrorTotal+=a;analyticColorErrorMax=Math.max(analyticColorErrorMax,a);groundColorSamples++;assert(e<=.5/255+1e-12,'Triangle-color quantization');}
 }
 // An extra reference cannot allocate/count the same attributes twice.
 const resident=r.residentBytes,builds=r.forestPathAttributeBuilds;r.acquire(m.vertices);assert.equal(r.residentBytes,resident);assert.equal(r.forestPathAttributeBuilds,builds);r.release(m.vertices);assert.equal(r.residentBytes,resident);
}
assert(sharedIndexedAssignments>0);assert(sharedPositionAssignments>0);
assert.equal(rgbBackings.size,1);assert.equal([...rgbBackings][0].byteLength,45510);
for(const [isShoulder,mat]of r.forestPathMaterials){
 const s={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};mat.onBeforeCompile(s,null);
 assert(s.vertexShader.includes('attribute float forestPathSide'));assert(s.vertexShader.includes('vForestPathSide=forestPathSide;vForestPathGround=forestPathGround;'));
 assert(s.fragmentShader.indexOf('vForestPathGround;\n')<s.fragmentShader.indexOf('void main()'));
 const softStage=s.fragmentShader.indexOf(isShoulder?'diffuseColor.rgb=vForestPathGround;':'float forestPathEdge='),kourStage=s.fragmentShader.indexOf('vec2 kc='),homeStage=s.fragmentShader.indexOf('vec2 homeWorld=');
 assert(softStage>=0&&kourStage>softStage&&homeStage>kourStage,'Local Kour/home shaders must retain priority');
 assert.equal(mat.map,null);assert.equal(mat.alphaMap,null);assert.equal(mat.transparent,false);assert.equal(mat.envMap,r.mats.ground.envMap);assert.equal(mat.envMapIntensity,r.mats.ground.envMapIntensity);
 if(isShoulder){assert(!s.uniforms.uKourApproach);assert(!s.uniforms.uForestHomeLanes);}else{assert(s.uniforms.uKourApproach);assert(s.uniforms.uForestHomeLanes);}
}

const untouched=overview.meshes.find(m=>m.id.startsWith('island:routes:')&&!F.target(m));r.addRecords([untouched],'overview');const record=r.recordMap.get(untouched.id),mesh=r.ensure(record,0);assert(!mesh.geometry.getAttribute('forestPathSide'));assert(!mesh.material.name.startsWith('forest-path-soft-'));r.evict(record);
for(const record of r.records)r.evict(record);assert.equal(r.residentBytes,0);assert.equal(r.forestPathResidentAttributeBytes,0);assert.equal(r.geometryRefs.size,0);assert.equal(r.cache.size,0);

// A failure before attaching attributes and a failure after the first attribute
// both release the newly acquired geometry; a subsequent acquire can retry.
const savedColors=G.FOREST_PATH_COLORS;G.FOREST_PATH_COLORS={...C,get(){throw Error('injected offline color failure');}};assert.throws(()=>r.acquire(oldPath.vertices),/injected offline color/);G.FOREST_PATH_COLORS=savedColors;assert.equal(r.residentBytes,0);assert.equal(r.geometryRefs.size,0);
assert.throws(()=>C.get(oldPath.id,1,0),/source\/count mismatch/);assert.throws(()=>C.get('forest:unknown',oldPath.vertices.length/9,0),/source\/count mismatch/);
const setAttribute=T.BufferGeometry.prototype.setAttribute;T.BufferGeometry.prototype.setAttribute=function(name,a){if(name==='forestPathGround')throw Error('injected attribute');return setAttribute.call(this,name,a);};try{assert.throws(()=>r.acquire(oldPath.vertices),/injected attribute/);}finally{T.BufferGeometry.prototype.setAttribute=setAttribute;}assert.equal(r.residentBytes,0);assert.equal(r.forestPathResidentAttributeBytes,0);assert.equal(r.geometryRefs.size,0);
const detailReentryMs=[];
for(let cycle=0;cycle<3;cycle++){
 const detail=r.recordMap.get(oldPath.id),at=performance.now();r.ensure(detail,0);detailReentryMs.push(performance.now()-at);assert.equal(r.forestPathResidentAttributeBytes,25620);assert.equal(detail.item.mesh.geometry.getAttribute('forestPathGround').array,C.get(oldPath.id,oldPath.vertices.length/9,0));r.dropPack('forest');assert.equal(r.residentBytes,0);assert.equal(r.forestPathResidentAttributeBytes,0);assert.equal(r.geometryRefs.size,0);assert(!r.forestPathArrays.has(oldPath.vertices));
 r.attachPack({id:'forest',meshes:[oldPath],signs:[]});assert(r.forestPathArrays.has(oldPath.vertices));
}
const fresh={...oldPath,vertices:oldPath.vertices.slice()};r.dropPack('forest');r.attachPack({id:'forest',meshes:[fresh],signs:[]});assert(!r.forestPathArrays.has(oldPath.vertices));r.ensure(r.recordMap.get(fresh.id),0);assert.equal(r.forestPathResidentAttributeBytes,25620);r.dropPack('forest');assert(!r.forestPathArrays.has(fresh.vertices));assert.equal(r.residentBytes,0);assert.equal(r.geometryRefs.size,0);
for(const [i,m]of models.entries()){assert.equal(m,before[i].data);assert.equal(m.vertices,before[i].vertices);assert.equal(m.index,before[i].index);assert.equal(hash(m.vertices),before[i].vertexSHA);assert.equal(m.index?hash(m.index):null,before[i].indexSHA);assert.equal(JSON.stringify([m.center,m.radius,m.material,m.lodDistance]),originalFields[i]);}
assert.equal(sha(read('src/forest-path-colors.js')),assetFileBefore,'Checker must not update the source asset');assert.equal(C.decodedBytes(),45510);
const report={revision:1,records:models.length,vertices:models.reduce((n,m)=>n+m.vertices.length/9,0),triangles:models.reduce((n,m)=>n+(m.index?.length||m.vertices.length/9)/3,0),publicAttributeBytes:80570,detailAttributeBytes:25620,totalAttributeBytes:106190,attributeBudget:F.attributeBudget,colorSourceBytes:C.decodedBytes(),rgbBackingBuffers:rgbBackings.size,colorPayloadSHA:C.metadata.payloadSHA,colorAssetScriptBytes:read('src/forest-path-colors.js').byteLength,colorBaseline:C.metadata.sourceBaseline,sharedIndexedAssignments,sharedPositionAssignments,sideConflicts:0,programKeys,coldAcquireMs,publicColdAcquireMs:coldAcquireMs-detailColdAcquireMs,detailColdAcquireMs,detailReentryMs,realTerrainSolverCallsDuringAcquire,runtimeTerrainSamplerCalls,runtimeTemporaryTerrainIndexBytes:0,sampledTerrainLinearErrorMean:groundColorErrorTotal/groundColorSamples,sampledTerrainLinearErrorMax:groundColorErrorMax,analyticTerrainLinearErrorMean:analyticColorErrorTotal/groundColorSamples,analyticTerrainLinearErrorMax:analyticColorErrorMax,groundColorBasis:r.info().forestPath.groundBasis,finalResidentBytes:r.residentBytes,finalResidentAttributeBytes:r.forestPathResidentAttributeBytes,sharedColorSourceRetainedBytes:C.decodedBytes(),source:before.map(({data,vertexSHA,indexSHA})=>({id:data.id,vertexSHA,indexSHA})),verification:'CPU source/resources only; no GPU/visual/performance acceptance; decoded color bytes exclude script/JS heap overhead'};
console.log(JSON.stringify(report,null,2));
