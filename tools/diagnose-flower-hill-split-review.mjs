// Offline value-snapshot diagnosis only. No native builder, WebGL, source,
// renderer, protocol or fixture edits. Earlier CLI1 assertions remain failures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {deserialize} from 'node:v8';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';
import * as T from '/workspace/flower-hill-refinement/vendor/three/three.module.js';

const ROOT='/workspace/flower-hill-refinement',BASE='/workspace/flower-hill-evidence';
const OUTPUT=BASE+'/offline-lily-split-and-roads.json';
const LILY='flowerlands:nameless:lily:0:-39:35';
const SOURCE='87096ff308a83880c2332b79a554ec9edc098bd0f534db52a1fc965934c7114b';
const SCOPE=[-1280,960,-928,1376];
assert.equal(process.versions.node.split('.')[0],'22');
assert(!fs.existsSync(OUTPUT),'Keep earlier diagnostic outputs');
const sha=a=>createHash('sha256').update(a).digest('hex');
const bytes=a=>Buffer.from(a.buffer,a.byteOffset,a.byteLength);
const aSHA=a=>sha(bytes(a));
const inputs={};
const read=p=>{const b=fs.readFileSync(p);inputs[p]=sha(b);return b;};
const json=p=>JSON.parse(read(p));
const start=performance.now();
const report={schema:1,kind:'Offline fixed spatial lily partition and complete road-intersection attribution',
 startedUTC:new Date().toISOString(),node:process.version,scriptSHA256:sha(read(fileURLToPath(import.meta.url))),
 noGPU:true,noNativeBuild:true,noFullNode:true,noProductOrRendererEdits:true,productAccepted:false,
 sourceSHA256:SOURCE,scope:SCOPE,complete:false};
const save=()=>fs.writeFileSync(OUTPUT,JSON.stringify(report,null,2)+'\n');
const native=json(BASE+'/independent-nameless-native.json');
assert.equal(native.sourceSHA256,SOURCE);assert.equal(native.passed,false);
assert.equal(sha(read(ROOT+'/src/flower-hill-entry.js')),SOURCE);
const release=json(BASE+'/tech-dist/release.json');
for(const p of ['vendor/three/three.module.js','vendor/three/three.core.js']){
 const h=sha(read(ROOT+'/'+p));assert.equal(h,release.inputs[p],'Use the exact accepted rendering library');
}
report.reusedEvidence={native:{path:BASE+'/independent-nameless-native.json',sha256:inputs[BASE+'/independent-nameless-native.json'],originalCLI:1},
 public:{path:BASE+'/independent-public-v2.json',sha256:sha(read(BASE+'/independent-public-v2.json')),checksPassed:19},
 originalCost:{path:BASE+'/final-views/report.json',sha256:sha(read(BASE+'/final-views/report.json')),originalCLI:1,reverseExtraTriangles:8464,budget:4000},
 actualDrawAttribution:{path:BASE+'/reverse-draw-attribution.json',sha256:sha(read(BASE+'/reverse-draw-attribution.json'))}};
const packs={};
for(const label of ['baseline','candidate']){
 const snapshot=native.completeNativeSnapshots.find(s=>s.label===label),b=read(snapshot.path);
 assert.equal(sha(b),snapshot.sha256);packs[label]=deserialize(b);
}
const originalViews=json(BASE+'/baseline-views/report.json'),candidateViews=json(BASE+'/final-views/report.json');
assert.equal(candidateViews.inputsBefore['src/flower-hill-entry.js'],SOURCE);
const traces={};
for(const label of ['baseline','candidate'])traces[label]=json(BASE+'/reverse-trace-'+label+'/report.json');
const m=packs.candidate.meshes.find(m=>m.id===LILY),old=packs.baseline.meshes.find(m=>m.id===LILY);
assert(m&&old&&m.instances.length/16===212);
for(const [label,record] of [['baseline',old],['candidate',m]]){
 const entry=traces[label].wantedSourceInventory.entries.find(e=>e.id===LILY);
 for(const field of ['vertices','farVertices','instances','instanceColors'])assert.equal(aSHA(record[field]),entry.arrays[field].sha256,'Exact rendered batch snapshot '+label+'/'+field);
}
assert.equal(aSHA(m.vertices),aSHA(old.vertices));assert.equal(aSHA(m.farVertices),aSHA(old.farVertices));
assert.equal(aSHA(m.instanceColors),aSHA(old.instanceColors));

const geometry=new Map();
for(const variant of ['near','far']){
 const a=variant==='near'?m.vertices:m.farVertices,g=new T.BufferGeometry();
 g.setAttribute('position',new T.InterleavedBufferAttribute(new T.InterleavedBuffer(a,9),3,0));
 g.computeBoundingSphere();geometry.set(variant,g);
}
function makeSphere(record,variant,indices){
 const values=new Float32Array(indices.length*16),colors=new Float32Array(indices.length*3);
 indices.forEach((i,j)=>{values.set(record.instances.subarray(i*16,i*16+16),j*16);colors.set(record.instanceColors.subarray(i*3,i*3+3),j*3);});
 const mesh=new T.InstancedMesh(geometry.get(variant),undefined,indices.length);
 mesh.instanceMatrix=new T.InstancedBufferAttribute(values,16);
 mesh.instanceColor=new T.InstancedBufferAttribute(colors,3);mesh.computeBoundingSphere();
 return {sphere:mesh.boundingSphere.clone(),indices,values,colors};
}
const all=Array.from({length:212},(_,i)=>i),whole={};
for(const label of ['baseline','candidate']){
 const record=label==='baseline'?old:m;
 whole[label]=makeSphere(record,'far',all).sphere;
 const expected=traces[label].wantedSourceInventory.entries.find(e=>e.id===LILY).cachedObjectSphere;
 assert(whole[label].center.distanceTo(new T.Vector3(...expected.center))<1e-8);
 assert(Math.abs(whole[label].radius-expected.radius)<1e-8,'Reproduce the actual cached sphere');
}
const sphereJSON=s=>({center:s.center.toArray(),radius:s.radius});
function frustum(sample){
 const camera=new T.PerspectiveCamera(sample.fov,1280/720,.20,18000);
 camera.position.fromArray(sample.eye);camera.lookAt(new T.Vector3(...sample.target));camera.updateMatrixWorld(true);
 return new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
}
function sphereMargins(sphere,planes){return planes.map((p,i)=>({plane:i,centerDistance:p.distanceToPoint(sphere.center),radius:sphere.radius,margin:p.distanceToPoint(sphere.center)+sphere.radius}));}
function containment(record,variant,child){
 const a=variant==='near'?record.vertices:record.farVertices,c=child.sphere.center,r=child.sphere.radius;
 let maxStatic=-Infinity,maxWind=-Infinity,vertices=0;const at=[];
 for(const index of child.indices){const i=index*16,b=record.instances;
  for(let j=0;j<a.length;j+=9){const x=a[j],y=a[j+1],z=a[j+2],bend=Math.pow(Math.max(0,y),1.8)*.013;
   const X=b[i]*x+b[i+4]*y+b[i+8]*z+b[i+12],Y=b[i+1]*x+b[i+5]*y+b[i+9]*z+b[i+13],Z=b[i+2]*x+b[i+6]*y+b[i+10]*z+b[i+14];
   maxStatic=Math.max(maxStatic,Math.hypot(X-c.x,Y-c.y,Z-c.z)-r);
   for(const sx of [-1,1])for(const sz of [-1,1]){
    const e=Math.hypot(X+sx*b[i]*bend+sz*b[i+8]*bend*.5-c.x,Y+sx*b[i+1]*bend+sz*b[i+9]*bend*.5-c.y,Z+sx*b[i+2]*bend+sz*b[i+10]*bend*.5-c.z)-r;
    if(e>maxWind){maxWind=e;at.splice(0,at.length,index,j/9,sx,sz);}
   }vertices++;
  }
 }
 return {transformedVertices:vertices,maximumStaticOutside:maxStatic,maximumAnyShaderPhaseOutside:maxWind,
  maximumAt:{instance:at[0],prototypeVertex:at[1],localXSign:at[2],localZSign:at[3]},
  staticContained:maxStatic<=1e-7,allShaderPhasesContained:maxWind<=1e-7,
  amplitude:.013,fullPhaseEnvelope:'Local X ±pow(max(0,y),1.8)*.013, local Z ±0.5*bend; exact instance linear transform. All four rectangle corners bound every clock/phase.'};
}
report.partitionRule={originalCell:{x:[-1248,-1216],z:[1120,1152]},splitX:-1232,splitZ:1136,
 sourceOrderRetainedWithinChild:true,originalParentCenterAndRadiusAndLODUnchanged:true,
 noInstanceDeletion:true,noPrototypeOrColorOrTransformChanges:true,cameraIndependent:true,
 sourceOverheadConservativeBytes:m.instances.byteLength+m.instanceColors.byteLength,
 originalUniqueSourceBytes:484008,maximumWithOldAndNewMatrixColorBacking:484008+m.instances.byteLength+m.instanceColors.byteLength,
 physicalVRAMMeasured:false};
report.partitionOptions=[];
for(const [name,key] of [['twoX',i=>m.instances[i*16+12]<-1232?0:1],['twoZ',i=>m.instances[i*16+14]<1136?0:1],['fourXZ',i=>(m.instances[i*16+12]<-1232?0:1)+(m.instances[i*16+14]<1136?0:2)]]){
 const groups=new Map();for(const i of all){const k=key(i);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(i);}
 const children=[],values=[],colors=[];
 for(const [k,indices] of groups){const variants={};for(const variant of ['near','far']){const child=makeSphere(m,variant,indices);variants[variant]={...sphereJSON(child.sphere),containment:containment(m,variant,child)};if(variant==='far'){values.push(...child.values);colors.push(...child.colors);}}
  children.push({key:k,instances:indices.length,sourceIndices:indices,variants});
 }
 const recovered=new Map();for(const child of children)for(const i of child.sourceIndices){assert(!recovered.has(i));recovered.set(i,key(i));}assert.equal(recovered.size,212);
 const cameraModels=[];
 for(let frame=0;frame<candidateViews.frames.length;frame++){
  const current=candidateViews.frames[frame],before=originalViews.frames[frame];assert.equal(current.name,before.name);
  const sample=current.samples.at(-1),baselineSample=before.samples.at(-1),wanted=sample.wanted.find(w=>w.id===LILY),f=frustum(sample),variant=wanted?.level===0?'near':'far';
  const actualDelta={calls:sample.stats.totalCalls-baselineSample.stats.totalCalls,triangles:sample.stats.totalTriangles-baselineSample.stats.totalTriangles};
  const originalDraw=Boolean(wanted)&&f.intersectsSphere(whole.candidate);
  const selected=children.filter(c=>Boolean(wanted)&&f.intersectsSphere(new T.Sphere(new T.Vector3(...c.variants[variant].center),c.variants[variant].radius)));
  const newCalls=selected.length,newTriangles=selected.reduce((n,c)=>n+c.instances*(variant==='near'?927:29),0);
  const delta={calls:actualDelta.calls+newCalls-Number(originalDraw),triangles:actualDelta.triangles+newTriangles-(originalDraw?212*(variant==='near'?927:29):0)};
  cameraModels.push({name:current.name,wanted:!!wanted,level:wanted?.level,variant,originalMeasuredDelta:actualDelta,
   originalBatchSphereDrawPredicted:originalDraw,childrenSphereDrawPredicted:selected.map(c=>({key:c.key,instances:c.instances,triangles:c.instances*(variant==='near'?927:29)})),
   predictedTotalDelta:delta,withinOriginalBudgets:delta.calls<=4&&delta.triangles<=4000,
   margins:children.map(c=>({key:c.key,...sphereJSON(new T.Sphere(new T.Vector3(...c.variants[variant].center),c.variants[variant].radius)),planes:sphereMargins(new T.Sphere(new T.Vector3(...c.variants[variant].center),c.variants[variant].radius),f.planes)}))});
 }
 const reverse=cameraModels.find(c=>c.name==='flowerHillReverse');assert.equal(reverse.originalBatchSphereDrawPredicted,true);
 report.partitionOptions.push({name,childCount:children.length,children,cameraModels,
  allStaticAndShaderEnvelopeContained:children.every(c=>Object.values(c.variants).every(v=>v.containment.staticContained&&v.containment.allShaderPhasesContained)),
  allSavedCamerasWithinBudget:cameraModels.every(c=>c.withinOriginalBudgets),reverseFalsePositiveTrianglesRemaining:reverse.childrenSphereDrawPredicted.reduce((n,c)=>n+c.triangles,0),
  limitation:'Offline actual Three sphere model. Only Reverse whole-batch submission was instrumented on GPU; other child submissions and final budgets require one future implementation check.'});save();
}
const eligible=report.partitionOptions.filter(o=>o.allStaticAndShaderEnvelopeContained&&o.allSavedCamerasWithinBudget&&o.reverseFalsePositiveTrianglesRemaining===0).sort((a,b)=>a.childCount-b.childCount);
report.partitionRecommendation=eligible.length?{name:eligible[0].name,childCount:eligible[0].childCount,
 reason:'Least fixed spatial partition tested that preserves every matrix/prototype/color, contains all wind phases, predicts zero Reverse lily draws and respects every saved camera budget.',
 cameraIndependentFullPhaseGeometryPreservationProved:true,implementationNotRun:true}: {name:null,reason:'No tested partition meets all unchanged bounds/visibility/budget constraints; do not implement by shrinking spheres or raising budgets.'};
save();console.log(JSON.stringify({stage:'fixedPartitions',output:OUTPUT,options:report.partitionOptions.map(o=>({name:o.name,counts:o.children.map(c=>c.instances),windContained:o.allStaticAndShaderEnvelopeContained,budgets:o.allSavedCamerasWithinBudget,reverseTriangles:o.reverseFalsePositiveTrianglesRemaining})),recommendation:report.partitionRecommendation}));

const source=String(read(ROOT+'/tools/check-sunflower-entry.mjs'));
const barySource=source.slice(source.indexOf('function bary('),source.indexOf('function meshSampler('));
const bary=vm.compileFunction(barySource+'\nreturn bary;')();
const helper=source.slice(source.indexOf('function clipXZ('),source.indexOf('function approachMetrics('));
assert.equal(sha(helper),native.unchangedCollisionHelperSHA256);
assert.equal((helper.match(/failures.length<12/g)||[]).length,1);
const observerSource=helper.replace('if(failures.length<12)','if(failures.length<20000)')
 .replace('roadTriangle:r.index,shoulder:r.shoulder,','roadID:r.id,roadTriangle:r.index,shoulder:r.shoulder,rootXYZ:[a[i+12],a[i+13],a[i+14]],clippedXZ:clipped.map(p=>[p[0],p[2]]),')
 .replace(" assert.equal(intersections,0,", " observe({transformedInstances,testedTriangles,intersections,roadFaces:roadFaces.length,failures});\n assert.equal(intersections,0,");
assert(observerSource.includes('assert.equal(intersections,0,'),'Original zero assertion remains');
assert(observerSource.includes('roadID:r.id')&&observerSource.includes('observe({'));
report.collisionObserver={originalHelperSHA256:sha(helper),executedHelperSHA256:sha(observerSource),captureLimit:20000,
 onlyDiagnosticChanges:['Store every intersection instead of first 12, bounded at 20000','Include actual road ID/root/clipped XZ for attribution','Observe before the unchanged final zero assertion'],
 heightBounds:[-.05,2.4],zeroAssertionUnchanged:true,originalNativeCLI1Preserved:true};
const inside=(x,z)=>x>=SCOPE[0]&&x<=SCOPE[2]&&z>=SCOPE[1]&&z<=SCOPE[3];
report.collisions={};
for(const [label,pack] of Object.entries(packs)){
 const faces=[];for(const road of pack.meshes.filter(m=>m.group==='roads')){
  assert(!road.index);assert.equal((road.vertices.length/27)%6,0);
  for(let i=0;i<road.vertices.length;i+=27)faces.push({id:road.id,index:i/27,shoulder:(i/27)%6>=2,ps:[0,1,2].map(j=>Array.from(road.vertices.subarray(i+j*9,i+j*9+3)))});
 }
 report.collisions[label]={};
 for(const variant of ['near','far']){
  let observed=null;
  const collision=vm.compileFunction(observerSource+'\nreturn roadClearance;',['assert','inside','bary','observe'])(assert,inside,bary,v=>{observed=v;});
  const plants=pack.meshes.filter(m=>m.instances).map(m=>variant==='near'?m:{...m,vertices:m.farVertices||m.vertices,index:undefined});
  let strictError=null;try{collision(plants,faces);}catch(e){assert.equal(e.code,'ERR_ASSERTION');strictError=String(e.message);}
  assert(observed&&observed.intersections===observed.failures.length&&observed.intersections<20000,'Every intersection captured');
  assert(observed.intersections>0&&strictError,'Preserve all four actual strict failures');
  const originalCheck=native.checks.find(c=>c.name===label+' actual '+variant+' plants clear native roads and tree-clear shoulders');
  assert(originalCheck&&!originalCheck.passed);
  report.collisions[label][variant]={...observed,strictAssertionPassed:false,originalAssertionMessage:strictError};save();
 }
}
const key=p=>JSON.stringify([p.id,p.instance,p.triangle,p.roadID,p.roadTriangle,p.shoulder]);
function annotate(p){const xs=p.clippedXZ.map(v=>v[0]),zs=p.clippedXZ.map(v=>v[1]);return {...p,rootInsideScope:inside(p.rootXYZ[0],p.rootXYZ[2]),
 intersectionBoundsXZ:[Math.min(...xs),Math.min(...zs),Math.max(...xs),Math.max(...zs)],
 allClippedVerticesInsideScope:p.clippedXZ.every(v=>inside(v[0],v[1]))};}
report.collisionAttribution={};
for(const variant of ['near','far']){
 const before=new Map(report.collisions.baseline[variant].failures.map(p=>[key(p),p])),after=new Map(report.collisions.candidate[variant].failures.map(p=>[key(p),p]));
 assert.equal(before.size,report.collisions.baseline[variant].intersections);assert.equal(after.size,report.collisions.candidate[variant].intersections);
 const added=[...after].filter(([k])=>!before.has(k)).map(([,p])=>annotate(p)),removed=[...before].filter(([k])=>!after.has(k)).map(([,p])=>annotate(p));
 const same=[...after].filter(([k])=>before.has(k)).map(([k,p])=>({key:k,baselineClearanceRange:before.get(k).clearanceRange,candidateClearanceRange:p.clearanceRange,...annotate(p)}));
 const unique=(ps,field)=>[...new Set(ps.map(p=>p[field]))];
 report.collisionAttribution[variant]={baseline:before.size,candidate:after.size,added:added.length,removed:removed.length,same:same.length,
  addedCases:added,removedCases:removed,sameCases:same,plantRecords:unique([...added,...removed,...same],'id'),roadRecords:unique([...added,...removed,...same],'roadID'),
  allRootsInsideScope:[...added,...removed,...same].every(p=>p.rootInsideScope),allActualClippedIntersectionsInsideScope:[...added,...removed,...same].every(p=>p.allClippedVerticesInsideScope),
  assertion:'Pair identity includes plant ID/instance/prototype triangle AND actual road ID/triangle/shoulder. No count-only claim of zero newly introduced intersections.'};
}
report.complete=true;report.productNativeClearancePassed=false;
report.nextStep='Parent review of fixed spatial partition and actual collision attribution. No source/budget/assertion change authorized by this diagnostic.';
const changed=Object.entries(inputs).filter(([p,h])=>sha(fs.readFileSync(p))!==h).map(([p])=>p);
assert.equal(changed.length,0,'All frozen evidence and source unchanged');
Object.assign(report,{inputsSHA256:inputs,inputsUnchanged:true,endedUTC:new Date().toISOString(),elapsedWallMs:performance.now()-start});save();
console.log(JSON.stringify({stage:'complete',output:OUTPUT,reportSHA256:sha(fs.readFileSync(OUTPUT)),elapsedWallMs:report.elapsedWallMs,
 recommendation:report.partitionRecommendation,collisionAttribution:Object.fromEntries(Object.entries(report.collisionAttribution).map(([k,v])=>[k,{baseline:v.baseline,candidate:v.candidate,added:v.added,removed:v.removed,same:v.same,allRootsInsideScope:v.allRootsInsideScope,allClippedIntersectionsInsideScope:v.allActualClippedIntersectionsInsideScope}]))}));
