// Public forest-approach candidate: use the caller's existing prepared overview.
// This module does not construct a world/region, update fixtures or run at import.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const CELLS=[['-6:0',[2,1,2],13,452],['-6:1',[9,6,12],24,581],['-7:1',[4,4,2],12,132]];
const PLANTS=new Map();
for(const [cell,trees,shrub,grass]of CELLS){
 for(let variant=0;variant<3;variant++)PLANTS.set('landscape:planting:broad'+variant+':'+cell,{kind:'tree',variant,count:trees[variant]});
 PLANTS.set('landscape:planting:shrub:'+cell,{kind:'shrub',count:shrub});
 PLANTS.set('landscape:planting:grass:'+cell,{kind:'grass',count:grass});
}
const GROUND=['island:terrain:-768:0','island:terrain:-768:0:far','island:terrain:-512:0','island:terrain:-512:0:far','landscape:forest-road'];
const TARGETS=new Set([...PLANTS.keys(),...GROUND]);
const raw=a=>Buffer.from(a.buffer,a.byteOffset,a.byteLength);
const sha=b=>createHash('sha256').update(b).digest('hex');
const metadata=m=>Object.fromEntries(Object.keys(m).sort().filter(k=>!ArrayBuffer.isView(m[k])&&m[k]!==undefined&&typeof m[k]!=='function').map(k=>[k,m[k]]));
const json=v=>JSON.stringify(v);
const arrays=m=>Object.entries(m).filter(([,a])=>ArrayBuffer.isView(a));
const float=a=>ArrayBuffer.isView(a)&&a.constructor.name==='Float32Array';
const uintView=a=>new Uint32Array(a.buffer,a.byteOffset,a.length);
function prototypeBounds(a){
 const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
 for(let i=0;i<a.length;i+=9)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],a[i+k]);hi[k]=Math.max(hi[k],a[i+k]);}
 return{lo,hi,size:hi.map((x,k)=>x-lo[k])};
}
function validPrototype(a,label){
 assert(float(a)&&a.length>0&&a.length%27===0,'Invalid unindexed prototype: '+label);
 let minNormal=Infinity,maxNormal=0,minTwiceArea=Infinity;
 for(let i=0;i<a.length;i+=9){
  for(let k=0;k<9;k++)assert(Number.isFinite(a[i+k]),'Nonfinite prototype: '+label);
  const n=Math.hypot(a[i+3],a[i+4],a[i+5]);minNormal=Math.min(minNormal,n);maxNormal=Math.max(maxNormal,n);
  assert(Math.abs(n-1)<1e-5,'Nonunit prototype normal: '+label);
  for(let k=6;k<9;k++)assert(a[i+k]>=0&&a[i+k]<=1,'Invalid linear RGB: '+label);
 }
 for(let i=0;i<a.length;i+=27){
  const u=[a[i+9]-a[i],a[i+10]-a[i+1],a[i+11]-a[i+2]],v=[a[i+18]-a[i],a[i+19]-a[i+1],a[i+20]-a[i+2]];
  const area=Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]);
  assert(area>1e-10,'Degenerate new prototype triangle: '+label);minTwiceArea=Math.min(minTwiceArea,area);
 }
 return{triangles:a.length/27,bytes:a.byteLength,aabb:prototypeBounds(a),minNormal,maxNormal,minTwiceArea};
}
function sourceSphere(m){
 assert(Array.isArray(m.center)&&m.center.length===3&&m.center.every(Number.isFinite)&&m.radius>0&&Number.isFinite(m.radius),'Invalid source sphere '+m.id);
 let maxDistance=0;
 for(const a of[m.vertices,m.farVertices])for(let p=0;p<m.instances.length;p+=16)for(let i=0;i<a.length;i+=9){
  const w=[0,1,2].map(k=>m.instances[p+k]*a[i]+m.instances[p+4+k]*a[i+1]+m.instances[p+8+k]*a[i+2]+m.instances[p+12+k]);
  const distance=Math.hypot(w[0]-m.center[0],w[1]-m.center[1],w[2]-m.center[2]);maxDistance=Math.max(maxDistance,distance);
  assert(distance<=m.radius+1e-5,'Candidate omitted by unchanged source sphere: '+m.id);
 }
 return{maxDistance,sourceRadius:m.radius,margin:m.radius-maxDistance,tolerance:1e-5};
}
function productionShadow(read){
 const source=String(read('src/renderer.js'));
 const match=source.match(/if\(m\.globalSurface\)castShadow=([^;]+);/);
 assert(match,'Production public-shadow assignment changed; review eligibility checker');
 // Evaluate the real production assignment rather than reimplementing it.
 return{eligible:Function('m','r','shadows','return Boolean('+match[1]+')'),sourceSHA:sha(source)};
}
function bytesOf(meshes){
 const attrs=new Set(),indices=new Set();for(const m of meshes)for(const [k,a]of arrays(m))(k==='index'?indices:attrs).add(a);
 return{uniqueAttributeViewBytes:[...attrs].reduce((n,a)=>n+a.byteLength,0),uniqueIndexViewBytes:[...indices].reduce((n,a)=>n+a.byteLength,0),uniqueAttributeViews:attrs.size,uniqueIndexViews:indices.size};
}

export function checkForestEntrance(G,overview,read){
 const U=G.FOREST_ENTRANCE,F=G.FOREST_ENTRANCE_GROUND,P=G.FOREST_ENTRANCE_PLANTS;
 assert(U&&F&&P&&typeof U.applyOverview==='function','Forest entrance helpers missing');
 assert(!overview.meta?.forestEntrance,'Caller must supply the original prepared overview');
 assert.equal(json(Array.from(F.ids)),json(GROUND),'Ground scope expanded');
 assert.equal(U.targets.size,15);for(const [id,target]of PLANTS)assert.equal(json(U.targets.get(id)),json(target),'Plant scope/identity changed: '+id);
 const byID=new Map(overview.meshes.map(m=>[m.id,m]));assert.equal(byID.size,overview.meshes.length,'Duplicate original source ID');
 for(const id of TARGETS)assert(byID.has(id),'Missing prepared source '+id);
 const originalArrays=new Map(),originals=overview.meshes.map(m=>{
  for(const [,a]of arrays(m))if(!originalArrays.has(a))originalArrays.set(a,sha(raw(a)));
  return{m,metadata:json(metadata(m)),arrays:new Map(arrays(m))};
 });
 const originalTargetBytes=bytesOf([...TARGETS].map(id=>byID.get(id)));
 const beforeMeta=json(overview.meta),beforeMeshes=overview.meshes,shadow=productionShadow(read);
 const pack={...overview,meshes:[...overview.meshes],meta:overview.meta};
 const applyStart=performance.now();assert.equal(U.applyOverview(null,pack).length,0);const applyMs=performance.now()-applyStart;
 assert.equal(pack.meshes.length,overview.meshes.length,'Candidate added/removed public records');
 assert.equal(overview.meshes,beforeMeshes);assert.equal(json(overview.meta),beforeMeta,'Source pack metadata changed');
 const populations={tree:0,shrub:0,grass:0},triangles={originalNear:0,originalFar:0,candidateNear:0,candidateFar:0};
 const byKind={},privatePrototypes=new Map(),geometryRecords=[],shadowComparisons=[];
 let replaced=0,protectedRecords=0,instances=0;
 const groundCounters={positionsNormalsBitExact:0,outsideRGBBitExact:0,kourCoreRGBBitExact:0,sharedNearFarSamplesBitExact:0,changedVertices:0,copiedInterleavedBytes:0};
 const groundRows=[],sharedSamples=new Map();
 for(let n=0;n<originals.length;n++){
  const old=originals[n],m=pack.meshes[n],source=old.m;assert.equal(m.id,source.id,'Record identity/order changed');
  if(!TARGETS.has(source.id)){
   assert.equal(m,source,'Unrelated record was replaced: '+m.id);assert.equal(json(metadata(m)),old.metadata);
   assert.equal(arrays(m).length,old.arrays.size);for(const [k,a]of old.arrays)assert.equal(m[k],a,'Unrelated array changed: '+m.id+'/'+k);
   protectedRecords++;continue;
  }
  assert.notEqual(m,source,'Target was not replaced: '+m.id);replaced++;
  if(PLANTS.has(m.id)){
   const t=PLANTS.get(m.id),expectedNear=t.kind==='tree'?3196:t.kind==='shrub'?1860:27,expectedFar=t.kind==='tree'?90:t.kind==='shrub'?48:27;
   assert.equal(source.vertices.length/27,expectedNear,'Original prototype budget changed');assert.equal(source.farVertices.length/27,expectedFar);
   assert.equal(m.instances,source.instances,'Matrix identity changed');assert.equal(m.instanceColors,source.instanceColors,'Original RGB changed');
   assert.equal(m.instances.length,t.count*16);assert.equal(m.instanceColors.length,t.count*3);assert.equal(m.forestEntrancePlant,true);
   for(const [k,a]of old.arrays)if(k!=='vertices'&&k!=='farVertices')assert.equal(m[k],a,'Plant custom array changed');
   const nextMetadata=metadata(m),oldMetadata=metadata(source);
   for(const k of Object.keys(oldMetadata))assert.equal(json(nextMetadata[k]),json(oldMetadata[k]),'Protected plant metadata changed '+m.id+'/'+k);
   for(const k of Object.keys(nextMetadata))assert(k in oldMetadata||['basis','forestEntrancePlant'].includes(k),'New plant render flag '+k);
   assert(!m.leafCards,'Opaque prototypes must not enter alpha-card dispatch');
   assert.equal(arrays(m).length,old.arrays.size,'New custom plant attribute');
   for(const [key,lod]of[['vertices','near'],['farVertices','far']]){
    const a=m[key];assert(!originalArrays.has(a),'Candidate reused a protected shared prototype');
    assert.notEqual(a.buffer,source[key].buffer,'Candidate shares original mutable backing');
    assert(a.length<=source[key].length,'Prototype exceeded original LOD budget');
    const cached=t.kind==='tree'?P.tree(t.variant,lod):P[t.kind](lod);assert.equal(a,cached,'Prototype cache was bypassed');
    if(!privatePrototypes.has(a))privatePrototypes.set(a,{kind:t.kind,variant:t.variant??null,lod,...validPrototype(a,m.id+'/'+lod)});
   }
   for(const distance of[0,m.radius+30,m.radius+479.9,m.radius+480,m.radius+600])for(const enabled of[false,true]){
    const a=shadow.eligible(source,{distance},enabled),b=shadow.eligible(m,{distance},enabled);assert.equal(b,a,'Production shadow eligibility changed: '+m.id);
   }
   assert.equal(shadow.eligible(m,{distance:m.radius+30},true),t.kind!=='grass','Expected close shadow eligibility changed');
   shadowComparisons.push({id:m.id,component:m.component,nearDecoration:!!m.nearDecoration,eligibleNear:shadow.eligible(m,{distance:m.radius+30},true)});
   const row={id:m.id,kind:t.kind,variant:t.variant??null,instances:t.count,originalNear:source.vertices.length/27*t.count,originalFar:source.farVertices.length/27*t.count,candidateNear:m.vertices.length/27*t.count,candidateFar:m.farVertices.length/27*t.count,sphere:sourceSphere(m)};
   geometryRecords.push(row);populations[t.kind]+=t.count;instances+=t.count;
   for(const k of Object.keys(triangles))triangles[k]+=row[k];
   byKind[t.kind]??={originalNear:0,originalFar:0,candidateNear:0,candidateFar:0};for(const k of Object.keys(triangles))byKind[t.kind][k]+=row[k];
  }else{
   assert.equal(json(metadata(m)),old.metadata,'Ground metadata changed: '+m.id);
   assert.equal(arrays(m).length,old.arrays.size,'New ground attribute');for(const [k,a]of old.arrays)if(k!=='vertices')assert.equal(m[k],a,'Ground index/custom arrays changed');
   const a=source.vertices,b=m.vertices;assert(float(b)&&b.length===a.length);assert.notEqual(b.buffer,a.buffer,'Ground copy shares source backing');
   assert.equal(m.index,source.index);assert(m.index&&m.index.length%3===0);
   for(const i of m.index)assert(i<b.length/9,'Invalid ground triangle index');
   const au=uintView(a),bu=uintView(b);let changed=0;
   for(let i=0;i<a.length;i+=9){
    for(let k=0;k<6;k++){assert.equal(bu[i+k],au[i+k],'Ground position/normal changed');groundCounters.positionsNormalsBitExact++;}
    const x=a[i],z=a[i+2],outside=x<=-672||x>=-448||z<=0||z>=192,core=Math.hypot((x+560)/115,(z+6)/97)<=.67;
    let different=false;
    for(let k=6;k<9;k++){assert(Number.isFinite(b[i+k])&&b[i+k]>=0&&b[i+k]<=1,'Invalid ground RGB');
     if(outside||core){assert.equal(bu[i+k],au[i+k],'Protected ground color changed');if(outside)groundCounters.outsideRGBBitExact++;if(core)groundCounters.kourCoreRGBBitExact++;}
     different||=bu[i+k]!==au[i+k];
    }
    if(different)changed++;
    if(m.component==='island-terrain'){
     const key=[au[i],au[i+2],au[i+6],au[i+7],au[i+8]].join(':'),color=Array.from(bu.subarray(i+6,i+9));
     if(sharedSamples.has(key)){assert.equal(json(color),json(sharedSamples.get(key)),'Shared near/far terrain color sample differs');groundCounters.sharedNearFarSamplesBitExact++;}else sharedSamples.set(key,color);
    }
   }
   assert(changed>0,'Ground target did not receive refinement');groundCounters.changedVertices+=changed;groundCounters.copiedInterleavedBytes+=b.byteLength;
   groundRows.push({id:m.id,vertexCount:b.length/9,triangles:m.index.length/3,changedVertices:changed,copiedInterleavedBytes:b.byteLength});
  }
 }
 assert.equal(replaced,20);assert.equal(json(populations),json({tree:42,shrub:49,grass:1165}));assert.equal(groundRows.length,5);
 assert(groundCounters.sharedNearFarSamplesBitExact>500,'Common terrain samples were not checked');
 assert.equal(triangles.originalNear,256827);assert.equal(triangles.originalFar,37587);assert(triangles.candidateNear<triangles.originalNear);assert(triangles.candidateFar<=triangles.originalFar);
 const firstMeshes=pack.meshes,firstMeta=pack.meta;assert.equal(U.applyOverview(null,pack).length,0);assert.equal(pack.meshes,firstMeshes,'Repeated apply changed arrays');assert.equal(pack.meta,firstMeta,'Repeated apply changed metadata');
 assert.equal(pack.meta.forestEntrance.plantRecords,15);assert.equal(pack.meta.forestEntrance.groundRecords,5);
 const failures=[];
 function failed(name,meshes,inject){
  const trial={...overview,meshes,meta:overview.meta},originalList=trial.meshes,originalMeta=trial.meta,snap=meshes.map(m=>({m,metadata:json(metadata(m)),arrays:new Map(arrays(m))}));
  const oldGround=G.FOREST_ENTRANCE_GROUND;
  try{if(inject)G.FOREST_ENTRANCE_GROUND={...F,applyRecord:inject};assert.throws(()=>U.applyOverview(null,trial),undefined,'Expected failure '+name);}
  finally{G.FOREST_ENTRANCE_GROUND=oldGround;}
  assert.equal(trial.meshes,originalList,'Partial array commit on '+name);assert.equal(trial.meta,originalMeta,'Partial metadata commit on '+name);
  for(const s of snap){assert.equal(json(metadata(s.m)),s.metadata,'Source metadata mutated on '+name);for(const [k,a]of s.arrays)assert.equal(s.m[k],a,'Source reference mutated on '+name);}
  failures.push(name);
 }
 const originalsList=overview.meshes,lastPlant='landscape:planting:grass:-7:1',lastGround='landscape:forest-road';
 failed('missing-plant',originalsList.filter(m=>m.id!==lastPlant));
 failed('duplicate-plant',[...originalsList,byID.get(lastPlant)]);
 failed('missing-ground',originalsList.filter(m=>m.id!==lastGround));
 failed('duplicate-ground',[...originalsList,byID.get(lastGround)]);
 failed('late-invalid-matrix',originalsList.map(m=>m.id===lastPlant?{...m,instances:m.instances.subarray(16)}:m));
 failed('invalid-ground-role',originalsList.map(m=>m.id===lastGround?{...m,material:'ground'}:m));
 failed('helper-throw-after-prepared-plants',[...originalsList.filter(m=>m.id!==lastGround),byID.get(lastGround)],m=>{if(m.id===lastGround)throw Error('Injected late helper failure');return F.applyRecord(m);});
 for(const [a,digest]of originalArrays)assert.equal(sha(raw(a)),digest,'Original typed-array view mutated after success/failure checks');
 for(const s of originals)assert.equal(json(metadata(s.m)),s.metadata,'Original source metadata mutated');
 assert.equal(overview.meshes,beforeMeshes);assert.equal(json(overview.meta),beforeMeta);
 const candidateTargets=pack.meshes.filter(m=>TARGETS.has(m.id)),candidateTargetBytes=bytesOf(candidateTargets);
 const suppliedBefore=bytesOf(overview.meshes),suppliedAfter=bytesOf(pack.meshes);
 const newPrivateAttributes=new Set();for(const m of candidateTargets)for(const [k,a]of arrays(m))if(k!=='index'&&!originalArrays.has(a))newPrivateAttributes.add(a);
 const sourceFiles=['src/forest-entrance-plants.js','src/forest-entrance-ground.js','src/forest-entrance.js'];
 return{revision:U.revision,scope:'Caller-prepared public package only; no world/region/Worker/WebGL construction or geometry fixture writes',sourceSHA:Object.fromEntries(sourceFiles.map(p=>[p,sha(read(p))])),population:{...populations,plantRecords:15,groundRecords:5,totalOriginalSites:instances,fullMatrixRGBOrdinalIdentity:true},protection:{suppliedRecords:overview.meshes.length,unchangedRecordReferences:protectedRecords,only20TargetsReplaced:true,allOriginalArrayBytesUnchanged:true,originalMetadataPreserved:true,sourcePackUnchanged:true,shadow:{productionSourceSHA:shadow.sourceSHA,comparisons:shadowComparisons},idempotent:true,atomicFailureCases:failures},triangles:{...triangles,byKind,meaning:'Expanded source model budget, not camera submission or FPS'},prototypes:[...privatePrototypes.values()],records:geometryRecords,ground:{...groundCounters,records:groundRows,routeSourceBytes:F.routeSourceBytes,routeSegmentCount:F.routeSegmentCount},resources:{originalTargets:originalTargetBytes,candidateTargets:candidateTargetBytes,targetAttributeViewByteDelta:candidateTargetBytes.uniqueAttributeViewBytes-originalTargetBytes.uniqueAttributeViewBytes,indexViewByteDelta:candidateTargetBytes.uniqueIndexViewBytes-originalTargetBytes.uniqueIndexViewBytes,suppliedPublic:{original:suppliedBefore,candidate:suppliedAfter,attributeViewByteDelta:suppliedAfter.uniqueAttributeViewBytes-suppliedBefore.uniqueAttributeViewBytes},newPrivateAttributeViewBytes:[...newPrivateAttributes].reduce((n,a)=>n+a.byteLength,0),newPrivateAttributeViews:newPrivateAttributes.size,newDrawBatches:0,addedCustomAttributes:0,packBytesField:overview.bytes??null,meaning:'Unique typed-array view lengths only. Target reductions do not remove prototypes retained by other records; suppliedPublic reflects those references. Backing ownership/resident WebGL memory is measured separately; inherited public pack.bytes was not repaired here.'},timings:{singleCandidateApplyMs:applyMs,meaning:'Small Node apply helper only; not browser load/FPS'},acceptance:'CPU identity/geometry/color/budget checks only. Wide/near/low/night visuals and real resource costs remain for browser acceptance.'};
}
