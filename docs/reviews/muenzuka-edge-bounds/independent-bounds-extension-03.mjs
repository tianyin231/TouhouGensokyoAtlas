// Independent, bounded bounds review using the exact original value snapshot.
// No native generation, public preparation, rendering, or source mutations.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {deserialize} from 'node:v8';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import * as T from '/workspace/muenzuka-refinement/vendor/three/three.module.js';
import {geometryDigest} from '/workspace/muenzuka-refinement/tools/check-hakurei.mjs';
const ROOT='/workspace/muenzuka-refinement',BASE='/workspace/muenzuka-evidence';
const OUTPUT=BASE+'/independent-bounds-extension-03.json';
const SOURCE='b2ef1b7c4acbc917fcaffba2fadb73ec775fc201e9bdeb0df375fa1680556045';
const ORIGINAL='fce019a1625ad753025841ebb396bf84a5844c9d9284dce9f45250789514a058';
assert.equal(process.versions.node.split('.')[0],'22');assert(!fs.existsSync(OUTPUT));
const sha=b=>createHash('sha256').update(b).digest('hex'),inputs={};
const read=p=>{const b=fs.readFileSync(p);inputs[p]=sha(b);return b;};
const started=performance.now(),report={kind:'Independent explicit local renderer envelope for both LODs and all wind phases',
 startedUTC:new Date().toISOString(),sourceSHA256:SOURCE,scriptSHA256:sha(read(import.meta.filename)),
 noNativeBuild:true,noGPU:true,noFullBoot:true,checks:[],passed:true};
const check=(name,f)=>{try{report.checks.push({name,passed:true,result:f()});}catch(e){report.passed=false;report.checks.push({name,passed:false,error:e.stack});}};
const project=JSON.parse(read(ROOT+'/project.json'));assert.equal(sha(read(ROOT+'/src/muenzuka-edge.js')),SOURCE);
const context=vm.createContext({performance,TextDecoder,TextEncoder});
for(const p of project.worldBuilders)vm.runInContext(String(read(ROOT+'/'+p)),context,{filename:p});
for(const p of ['src/renderer.js','vendor/three/three.module.js','vendor/three/three.core.js','tools/check-hakurei.mjs'])read(ROOT+'/'+p);
const author=JSON.parse(read(BASE+'/author-preflight-01.json'));
const original=deserialize(read(BASE+'/original-native-504808e.v8'));
assert.equal(geometryDigest(original),ORIGINAL,'Actual retained source must match accepted native output');
const oldDigest=geometryDigest(original),candidate=context.GA.MUENZUKA_EDGE.applyDetail(original);
assert.equal(geometryDigest(original),oldDigest,'Candidate apply must not mutate retained original');
report.baselineDigest=oldDigest;report.originalBuildEvidenceSHA256=inputs[BASE+'/author-preflight-01.json'];
report.nativeSourceMeaning='Exact prior original build snapshot, independently checked against accepted native digest; not a new native build.';
const ids=[];for(const z of [6,7,8])for(const v of [0,1])ids.push(`muenzuka:trees:-23:${z}:${v}:leaf`);
const toSphere=m=>({center:m.center.toArray(),radius:m.radius});
function variants(m){
 const out={};
 for(const [name,a]of [['near',m.vertices],['far',m.farVertices]]){
  const g=new T.BufferGeometry();g.setAttribute('position',new T.InterleavedBufferAttribute(new T.InterleavedBuffer(a,9),3,0));
  const object=new T.InstancedMesh(g,undefined,m.instances.length/16);
  object.instanceMatrix=new T.InstancedBufferAttribute(m.instances,16);object.computeBoundingSphere();out[name]=object.boundingSphere.clone();
 }
 return out;
}
function maximum(m,a,sphere){
 let staticOutside=-Infinity,phaseOutside=-Infinity,where=null;const b=m.instances,c=sphere.center;
 for(let i=0;i<b.length;i+=16)for(let j=0;j<a.length;j+=9){
  const x=a[j],y=a[j+1],z=a[j+2],u=Math.max(0,Math.min(1,(y-4)/18)),sway=u*u*(3-2*u)*.16;
  const X=b[i]*x+b[i+4]*y+b[i+8]*z+b[i+12],Y=b[i+1]*x+b[i+5]*y+b[i+9]*z+b[i+13],Z=b[i+2]*x+b[i+6]*y+b[i+10]*z+b[i+14];
  staticOutside=Math.max(staticOutside,Math.hypot(X-c.x,Y-c.y,Z-c.z)-sphere.radius);
  for(const sx of [-1,1])for(const sz of [-1,1]){
   const d=Math.hypot(X+sx*b[i]*sway+sz*b[i+8]*sway*.5-c.x,Y+sx*b[i+1]*sway+sz*b[i+9]*sway*.5-c.y,Z+sx*b[i+2]*sway+sz*b[i+10]*sway*.5-c.z)-sphere.radius;
   if(d>phaseOutside){phaseOutside=d;where={instance:i/16,vertex:j/9,sx,sz};}
  }
 }
 return{staticOutside,phaseOutside,where};
}

const extension='/workspace/main-island-next/src/muenzuka-edge-renderer.js';
vm.runInContext(String(read(ROOT+'/src/renderer.js')),context,{filename:'src/renderer.js'});
vm.runInContext(String(read(extension)),context,{filename:extension});
const C=context.GA.MUENZUKA_EDGE_CULLING;
report.rendererSHA256=inputs[extension];
report.originalFailureReportSHA256=sha(read(BASE+'/independent-bounds-v2.json'));
report.actualRendererPredecessorLoaded=true;report.rendererInstantiated=false;
report.spheres=[];

for(const label of ['baseline','candidate']){
 const pack=label==='baseline'?original:candidate;
 for(const id of ids){
  const m=pack.meshes.find(m=>m.id===id);assert(m);const spheres=variants(m);
  if(label==='candidate'){const sphere=C.envelope(T,m);spheres.near=sphere;spheres.far=sphere;}
  for(const cached of ['near','far'])for(const selected of ['near','far']){
   const result=maximum(m,selected==='near'?m.vertices:m.farVertices,spheres[cached]);
   report.spheres.push({label,id,cached,selected,instances:m.instances.length/16,sphere:toSphere(spheres[cached]),...result});
  }
 }
}
check('six actual selected records and original placement held',()=>{
 let trees=0;for(const id of ids){const a=original.meshes.find(m=>m.id===id),b=candidate.meshes.find(m=>m.id===id);assert(a&&b);assert.equal(a.instances,b.instances);assert.equal(a.instanceColors,b.instanceColors);assert.deepEqual(a.center,b.center);assert.equal(a.radius,b.radius);trees+=b.instances.length/16;}assert.equal(trees,25);return{records:ids.length,trees};
});
check('all candidate selected vertices and wind phases fit every cached LOD sphere',()=>{
 const rows=report.spheres.filter(r=>r.label==='candidate'),bad=rows.filter(r=>r.phaseOutside>1e-7);
 assert.equal(bad.length,0,JSON.stringify(bad.map(({id,cached,selected,phaseOutside})=>({id,cached,selected,phaseOutside}))));
 return{combinations:rows.length,maximumOutside:Math.max(...rows.map(r=>r.phaseOutside)),tolerance:1e-7};
});

check('exact six native eligibility and stable weak cache',()=>{
 assert.equal(candidate.meshes.filter(C.eligible).length,6);
 for(const m of candidate.meshes.filter(C.eligible))assert.equal(C.envelope(T,m),C.envelope(T,m));
 return {nativeEligible:6,otherNativeRecords:candidate.meshes.length-6,stableSphereIdentity:true};
});
const raw=gunzipSync(read(ROOT+'/assets/packs/overview.pack.gz'));
const cold=context.GA.decodePack(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength));
context.GA.MUENZUKA_EDGE.prepare({},cold);
check('only two cold children and their whole phase envelopes are bounded',()=>{
 const chosen=cold.meshes.filter(C.eligible);assert.equal(chosen.length,2);
 const rows=[];for(const m of chosen){const sphere=C.envelope(T,m);for(const [lod,a]of [['near',m.vertices],['far',m.farVertices||m.vertices]]){
  const row={id:m.id,lod,instances:m.instances.length/16,sphere:toSphere(sphere),...maximum(m,a,sphere)};rows.push(row);assert(row.phaseOutside<=1e-7,JSON.stringify(row));
 }}
 return {coldEligible:2,otherColdRecords:cold.meshes.length-2,rows,fullPublicBoot:false};
});
check('geometry and every original input remain unchanged by envelope calculation',()=>{
 assert.equal(geometryDigest(original),oldDigest);const before=geometryDigest(candidate);
 for(const m of candidate.meshes.filter(C.eligible))C.envelope(T,m);
 assert.equal(geometryDigest(candidate),before);return{candidateGeometrySHA256:before,newTypedBackingBytes:0,newTextures:0,sceneCostsMeasured:false};
});
report.originalFailures=report.spheres.filter(r=>r.label==='baseline'&&r.phaseOutside>1e-7).map(({id,cached,selected,phaseOutside})=>({id,cached,selected,phaseOutside}));
report.inputsSHA256=inputs;report.inputsUnchanged=Object.entries(inputs).every(([p,h])=>sha(fs.readFileSync(p))===h);
assert(report.inputsUnchanged);report.elapsedMs=performance.now()-started;report.endedUTC=new Date().toISOString();
fs.writeFileSync(OUTPUT,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output:OUTPUT,passed:report.passed,checks:report.checks.map(c=>({name:c.name,passed:c.passed})),baselineFailedCombinations:report.originalFailures.length,elapsedMs:report.elapsedMs}));
if(!report.passed)process.exitCode=1;
