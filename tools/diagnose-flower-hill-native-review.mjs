// Authorized paired Nameless native diagnosis. No GPU, full regression,
// renderer/source edits, fixture updates or acceptance of the cost failure.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {serialize} from 'node:v8';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {geometryDigest} from '/workspace/flower-hill-refinement/tools/check-hakurei.mjs';

const ROOT='/workspace/flower-hill-refinement',BASE='/workspace/flower-hill-evidence';
const SOURCE='src/flower-hill-entry.js',SOURCE_SHA='87096ff308a83880c2332b79a554ec9edc098bd0f534db52a1fc965934c7114b';
const PREFIX_SHA='ed0a8a18476b9f510bfe7a5199e4e6de19bda9e3ad6cea3e13095c9304ab7f04';
const PUBLIC_CHECKER_SHA='73b12295942f16d30b63822c640dab45dff131a96de109aa811ee063c78983e2';
const BASELINE_NATIVE_SHA='3c3b2ce4e78c02a2128bedefc7bdafcf036e192a80f86a2660550e8bcf5f35c5';
const SCOPE=[-1280,960,-928,1376],BENCH={x:-1251,z:987,w:9,d:10};
const LILY='flowerlands:nameless:lily:0:-39:35',FIELDS=['vertices','farVertices','index','instances','instanceColors'];
const option=n=>{const i=process.argv.indexOf(n);return i<0?undefined:process.argv[i+1];};
const OUTPUT=resolve(option('--output')||BASE+'/independent-nameless-native.json');
const OUTDIR=resolve(option('--arrays')||BASE+'/nameless-native-arrays');
assert.equal(Number(process.versions.node.split('.')[0]),22,'Use Node22');
assert(!fs.existsSync(OUTPUT),'Do not overwrite an earlier diagnosis');
assert(!fs.existsSync(OUTDIR),'Do not overwrite diagnostic source arrays');
fs.mkdirSync(OUTDIR);
const sha=a=>createHash('sha256').update(a).digest('hex');
const arrayBytes=a=>Buffer.from(a.buffer,a.byteOffset,a.byteLength);
const arraySHA=a=>sha(arrayBytes(a));
const inputs={},read=p=>{const a=fs.readFileSync(resolve(ROOT,p));inputs[p]=sha(a);return a;};
const inside=(x,z)=>x>=SCOPE[0]&&x<=SCOPE[2]&&z>=SCOPE[1]&&z<=SCOPE[3];
const bench=(x,z)=>Math.abs(x-BENCH.x)<=BENCH.w/2&&Math.abs(z-BENCH.z)<=BENCH.d/2;
const plain=o=>JSON.stringify(o,(k,v)=>ArrayBuffer.isView(v)||k==='center'||k==='radius'?undefined:v);
const same=(a,b,label)=>assert.equal(JSON.stringify(a),JSON.stringify(b),label);
const report={schema:1,kind:'Bounded paired Nameless native source and actual lily visibility diagnosis',
 startUTC:new Date().toISOString(),node:process.version,scriptSHA256:sha(fs.readFileSync(fileURLToPath(import.meta.url))),
 sourceSHA256:SOURCE_SHA,noGPU:true,noFullNode:true,noFixtureUpdate:true,nativeBuildCount:0,
 reusedPublicEvidence:{path:BASE+'/independent-public-v2.json',sha256:sha(fs.readFileSync(BASE+'/independent-public-v2.json'))},
 checks:[],passed:true,scope:SCOPE,arraysDirectory:OUTDIR,
 costFailurePreserved:{path:BASE+'/final-views/report.json',sha256:sha(fs.readFileSync(BASE+'/final-views/report.json')),deltaTriangles:8464,budget:4000}};
const started=performance.now(),save=()=>fs.writeFileSync(OUTPUT,JSON.stringify(report,null,2)+'\n');
const check=async(name,f)=>{try{const result=await f();report.checks.push({name,passed:true,result});save();return result;}catch(e){report.passed=false;report.checks.push({name,passed:false,error:e.stack||String(e),...(e.details?{details:e.details}:{})});save();return null;}};
const writeArray=(name,a)=>{const p=resolve(OUTDIR,name);fs.writeFileSync(p,arrayBytes(a),{flag:'wx'});return{path:p,type:a.constructor.name,length:a.length,bytes:a.byteLength,sha256:arraySHA(a)};};
const transform=(a,i,x,y,z)=>[a[i]*x+a[i+4]*y+a[i+8]*z+a[i+12],a[i+1]*x+a[i+5]*y+a[i+9]*z+a[i+13],a[i+2]*x+a[i+6]*y+a[i+10]*z+a[i+14]];
const transformed=(m,a)=>{const out=new Float64Array(a.length/9*3*m.instances.length/16);let k=0;for(let i=0;i<m.instances.length;i+=16)for(let j=0;j<a.length;j+=9)for(const p of transform(m.instances,i,a[j],a[j+1],a[j+2]))out[k++]=p;return out;};
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),unit=v=>v.map(x=>x/Math.hypot(...v));
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function frustum(){const eye=[-1040,184,985],target=[-1070,144,1192],z=unit(eye.map((x,i)=>x-target[i])),x=unit(cross([0,1,0],z)),y=cross(z,x),tan=Math.tan(49*Math.PI/360),aspect=1280/720;
 const result=[];for(const[name,n]of [['left',x.map((v,i)=>v-z[i]*tan*aspect)],['right',x.map((v,i)=>-v-z[i]*tan*aspect)],['bottom',y.map((v,i)=>v-z[i]*tan)],['top',y.map((v,i)=>-v-z[i]*tan)]]){const normal=unit(n);result.push({name,normal,offset:-dot(normal,eye)});}
 result.push({name:'near',normal:z.map(x=>-x),offset:dot(z,eye)-.20},{name:'far',normal:z,offset:18000-dot(z,eye)});return result;
}
const PLANES=frustum(),distance=(p,plane)=>dot(p,plane.normal)+plane.offset;
function clipFrustum(points){let poly=points;for(const plane of PLANES){const out=[];for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length],a=distance(p,plane),b=distance(q,plane);if(a>=0)out.push(p);if((a>=0)!==(b>=0)){const t=a/(a-b);out.push(p.map((v,k)=>v+(q[k]-v)*t));}}poly=out;if(!poly.length)break;}return poly;}
function visibility(m,a,world){const vertices=a.length/9,triangles=vertices/3,count=m.instances.length/16,min=PLANES.map(()=>Infinity),max=PLANES.map(()=>-Infinity),maxWind=PLANES.map(()=>-Infinity),visibleInstances=[],possibleWindInstances=[];let visibleTriangles=0,possibleWindTriangles=0;
 const low=[Infinity,Infinity,Infinity],high=[-Infinity,-Infinity,-Infinity],padding=[];
 for(let i=0;i<count;i++){
  const matrix=m.instances.subarray(i*16,i*16+16);let visible=0,possible=0;
  for(let j=0;j<vertices;j++){const p=Array.from(world.subarray((i*vertices+j)*3,(i*vertices+j+1)*3)),bend=Math.pow(Math.max(0,a[j*9+1]),1.8)*.013;
   const wind=[0,1,2].map(k=>Math.abs(matrix[k])*bend+Math.abs(matrix[8+k])*.5*bend);padding.push(wind);
   for(let k=0;k<3;k++){low[k]=Math.min(low[k],p[k]-wind[k]);high[k]=Math.max(high[k],p[k]+wind[k]);}
   for(let k=0;k<PLANES.length;k++){const plane=PLANES[k],d=distance(p,plane),w=Math.abs(plane.normal[0]*matrix[0]+plane.normal[1]*matrix[1]+plane.normal[2]*matrix[2])*bend+Math.abs(plane.normal[0]*matrix[8]+plane.normal[1]*matrix[9]+plane.normal[2]*matrix[10])*.5*bend;min[k]=Math.min(min[k],d);max[k]=Math.max(max[k],d);maxWind[k]=Math.max(maxWind[k],d+w);}
  }
  for(let t=0;t<triangles;t++){
   const pts=[0,1,2].map(j=>Array.from(world.subarray((i*vertices+t*3+j)*3,(i*vertices+t*3+j+1)*3)));
   if(clipFrustum(pts).length){visible++;visibleTriangles++;}
   const excluded=PLANES.some(plane=>pts.every((p,j)=>{const y=a[(t*3+j)*9+1],bend=Math.pow(Math.max(0,y),1.8)*.013;
    const w=Math.abs(plane.normal[0]*matrix[0]+plane.normal[1]*matrix[1]+plane.normal[2]*matrix[2])*bend+Math.abs(plane.normal[0]*matrix[8]+plane.normal[1]*matrix[9]+plane.normal[2]*matrix[10])*.5*bend;return distance(p,plane)+w<0;}));
   if(!excluded){possible++;possibleWindTriangles++;}
  }
  if(visible)visibleInstances.push({index:i,triangles:visible});if(possible)possibleWindInstances.push({index:i,triangles:possible});
 }
 const center=low.map((v,k)=>(v+high[k])/2);let radius=0,maximumPadding=0;
 for(let i=0;i<world.length;i+=3){const p=Array.from(world.subarray(i,i+3)),w=padding[i/3];maximumPadding=Math.max(maximumPadding,Math.hypot(...w));for(const sx of[-1,1])for(const sy of[-1,1])for(const sz of[-1,1])radius=Math.max(radius,Math.hypot(p[0]+sx*w[0]-center[0],p[1]+sy*w[1]-center[1],p[2]+sz*w[2]-center[2]));}
 radius+=.001;const margins=PLANES.map(p=>({plane:p.name,signedCenterDistance:distance(center,p),radius,margin:distance(center,p)+radius}));
 return {transformedVertices:world.length/3,instances:count,prototypeTriangles:triangles,staticVisibleTriangles:visibleTriangles,staticVisibleInstances:visibleInstances,
  conservativePossibleWindTriangles:possibleWindTriangles,conservativePossibleWindInstances:possibleWindInstances,
  planes:PLANES.map((p,i)=>({...p,minVertexDistance:min[i],maxVertexDistance:max[i],maxVertexDistanceWithAnyShaderPhase:maxWind[i]})),
  windRule:{amp:.013,localX:'+-pow(max(0,position.y),1.8)*amp',localZ:'+-0.5*bend',matrixLinearTransform:true,anyClockAndPhase:true},
  windExpandedAABB:{min:low,max:high},tightConservativeSphere:{center,radius,roundingPadding:.001,margins},maximumAxisEnvelopePaddingLength:maximumPadding,
  assertion:'Sphere contains every transformed vertex and the full independent local-X/Z shader envelope. Frustum clipping is geometry visibility, not occlusion, raster coverage or pixel count.'};
}
try{
 await check('frozen source, true project prefix and reused public evidence',()=>{
  assert.equal(sha(read(SOURCE)),SOURCE_SHA);assert.equal(sha(read('tools/check-flower-hill-entry.mjs')),PUBLIC_CHECKER_SHA);
  const p=JSON.parse(read('project.json'));assert.equal(p.worldBuilders.length,47);assert.equal(p.worldBuilders.at(-1),SOURCE);assert.equal(sha(JSON.stringify(p.worldBuilders.slice(0,-1))),PREFIX_SHA);
  const prior=JSON.parse(fs.readFileSync(BASE+'/independent-public-v2.json'));assert(prior.passed&&prior.checks.length===19&&prior.checks.every(c=>c.passed));assert.equal(prior.sourceSHA256,SOURCE_SHA);
  return{prefixLength:46,prefixSHA256:PREFIX_SHA,projectSHA256:inputs['project.json'],reusedPublicChecks:19};
 });
 assert(report.passed,'Preparation guards failed');
 const helper=String(read('tools/check-flower-hill-entry.mjs')).split('export async function checkFlowerHillEntry')[0].replace(/^import .*;\n/gm,'').replace('export const ACCEPTED_SOLAR_PREFIX_SHA','const ACCEPTED_SOLAR_PREFIX_SHA');
 const helpers=vm.compileFunction(helper+'\nreturn {mergedAtlas,bootPredecessors,meshSampler,backingBuffers,bytes,matteComponents,boundsOfTriangles,bary};',
  ['assert','fs','vm','gunzipSync','createHash','performance','resolve','fileURLToPath','pathToFileURL'])(assert,fs,vm,gunzipSync,createHash,performance,resolve,fileURLToPath,pathToFileURL);
 report.exactPublicScaffoldSHA256=sha(helper);
 const project=JSON.parse(read('project.json')),context=vm.createContext({performance,TextDecoder,TextEncoder});
 for(const p of project.worldBuilders)vm.runInContext(String(read(p)),context,{filename:p});const G=context.GA,U=G.FLOWER_HILL_ENTRY;
 context.inputAtlas=JSON.stringify(helpers.mergedAtlas(read,project));const data=vm.runInContext('JSON.parse(inputAtlas)',context),raw=gunzipSync(read('assets/packs/overview.pack.gz')),pack=G.decodePack(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength));
 const bootStart=performance.now();helpers.bootPredecessors(G,data,pack);assert(G.SUNFLOWER_ENTRY.metadata.has(pack));assert(data.sunflowerEntry.contact.length>0&&!data.flowerHillEntry);
 const baselineData={...data},solarContact=data.sunflowerEntry.contact,solarHash=arraySHA(solarContact),pathsBefore=JSON.stringify(G.FLOWERLANDS.paths);
 pack.meshes.push(...G.extraOverviewBuilders.at(-1)(data,pack));assert(U.metadata.has(pack)&&data.flowerHillEntry.contact.length>0&&data.flowerHillEntry.originalContact.length>0);
 assert.equal(data.sunflowerEntry.contact,solarContact);assert.equal(arraySHA(solarContact),solarHash);assert.equal(JSON.stringify(G.FLOWERLANDS.paths),pathsBefore);
 report.fullProductionPreparation={wallMs:performance.now()-bootStart,moduleCount:47,registeredHooks:G.extraOverviewBuilders.length,sourceBytes:U.metadata.get(pack).sourceBytes,SolarContactSHA256:solarHash};save();
 const oldTerrain=new G.Terrain(baselineData),newTerrain=new G.Terrain(data),oldNear=U.sampler(data.flowerHillEntry.originalContact),newNear=U.sampler(data.flowerHillEntry.contact);
 const t0=performance.now();report.nativeBuildCount++;const original=await U.originalBuildRegion(baselineData,'nameless');report.originalBuildWallMs=performance.now()-t0;report.originalNativeGeometrySHA256=geometryDigest(original);save();
 await check('actual baseline Nameless digest binds the accepted owner',()=>{assert.equal(report.originalNativeGeometrySHA256,BASELINE_NATIVE_SHA);return{nativeGeometrySHA256:BASELINE_NATIVE_SHA,records:original.meshes.length,sourceBytes:original.bytes};});
 const t1=performance.now();report.nativeBuildCount++;const candidate=await G.buildRegion(data,'nameless');report.candidateBuildWallMs=performance.now()-t1;report.candidateNativeGeometrySHA256=geometryDigest(candidate);save();
 report.completeNativeSnapshots=[];
 for(const[label,value]of[['baseline',original],['candidate',candidate],['baseline-manifest',baselineData],['candidate-manifest',data]]){const p=resolve(OUTDIR,label+'.v8'),b=serialize(value);fs.writeFileSync(p,b,{flag:'wx'});report.completeNativeSnapshots.push({label,path:p,bytes:b.byteLength,sha256:sha(b),meaning:'Node22 diagnostic value snapshot. Exact array values retained; backing-buffer identity after deserialize must not replace original source ownership accounting.'});}save();
 const old=new Map(original.meshes.map(m=>[m.id,m]));
 await check('native record identities, nonempty prototypes, colors and all non-Y matrix components',()=>{
  same(candidate.meshes.map(m=>m.id),original.meshes.map(m=>m.id),'Native record IDs/order');let records=0,instances=0,moved=0,offsetSamples=0,minOldOffset=Infinity,maxOldOffset=-Infinity,maxOffsetChange=0;
  for(const m of candidate.meshes){const o=old.get(m.id);assert.equal(plain(m),plain(o),'Native material/owner/LOD identity '+m.id);if(!m.instances)continue;records++;assert(m.vertices.length>0&&m.farVertices?.length>0&&m.instanceColors?.length>0);
   for(const f of ['vertices','farVertices','instanceColors'])assert.equal(arraySHA(m[f]),arraySHA(o[f]),'Native prototype/color '+m.id+'/'+f);
   assert.equal(m.instances.length,o.instances.length);for(let i=0;i<m.instances.length;i+=16){for(let k=0;k<16;k++)if(k!==13)assert.equal(m.instances[i+k],o.instances[i+k],'Native non-Y matrix '+m.id+'/'+i/16+'/'+k);
    const x=o.instances[i+12],z=o.instances[i+14],delta=newTerrain.height(x,z)-oldTerrain.height(x,z),expected=Math.fround(o.instances[i+13]+delta);assert(Math.abs(m.instances[i+13]-expected)<=.00015,'Native root/query offset '+m.id+'/'+i/16);
    if(m.instances[i+13]!==o.instances[i+13]){assert(inside(x,z)&&!bench(x,z),'Native root moved outside approved scope');moved++;}
    const n=newNear(x,z),b=oldNear(x,z);if(inside(x,z)&&n!==null&&b!==null){const before=o.instances[i+13]-b,after=m.instances[i+13]-n;minOldOffset=Math.min(minOldOffset,before);maxOldOffset=Math.max(maxOldOffset,before);maxOffsetChange=Math.max(maxOffsetChange,Math.abs(after-before));assert(Math.abs(after-before)<=.00015,'Native inherited near/root residual changed');offsetSamples++;}instances++;
   }
  }assert(records>0&&instances>0&&moved>0&&offsetSamples>0);return{records,instances,moved,offsetSamples,minimumInheritedRootNearOffset:minOldOffset,maximumInheritedRootNearOffset:maxOldOffset,maximumOffsetChange:maxOffsetChange,tolerance:.00015,zeroRootNearErrorClaimed:false};
 });
 await check('real original paths, native roads XY and protected stone-seat attributes',()=>{
  assert.equal(JSON.stringify(G.FLOWERLANDS.paths),pathsBefore);let roads=0,stoneVertices=0,roadVertices=0;for(const m of candidate.meshes){const o=old.get(m.id);if(m.instances)continue;assert.equal(m.vertices.length,o.vertices.length,'Native geometry cardinality '+m.id);if(m.index||o.index){assert(m.index&&o.index);assert.equal(arraySHA(m.index),arraySHA(o.index));}
   for(let i=0;i<m.vertices.length;i+=9){assert.equal(m.vertices[i],o.vertices[i],'Native actual X '+m.id);assert.equal(m.vertices[i+2],o.vertices[i+2],'Native actual Z '+m.id);if(bench(o.vertices[i],o.vertices[i+2])){for(let k=0;k<9;k++)assert.equal(m.vertices[i+k],o.vertices[i+k],'Protected stone-seat actual vertex '+m.id);stoneVertices++;}
    if(m.group==='roads'){roadVertices++;continue;}for(let k=3;k<9;k++)assert.equal(m.vertices[i+k],o.vertices[i+k],'Native architecture normal/color '+m.id);
    if(!inside(o.vertices[i],o.vertices[i+2]))for(let k=0;k<9;k++)assert.equal(m.vertices[i+k],o.vertices[i+k],'Native non-target architecture '+m.id);
   }if(m.group==='roads')roads++;
  }assert(roads>0&&roadVertices>0&&stoneVertices>0);return{nativeRoadRecords:roads,actualRoadVertices:roadVertices,protectedStoneVertices:stoneVertices,pathDefinitions:G.FLOWERLANDS.paths.length};
 });
 await check('native recursive source accounting and conservative transformed population bounds',()=>{
  assert.equal(candidate.bytes,helpers.bytes(helpers.backingBuffers(candidate)));assert.equal(original.bytes,helpers.bytes(helpers.backingBuffers(original)));let checked=0,maximumExcess=0;const boxes=new Map();for(const m of candidate.meshes.filter(m=>m.instances))for(const a of[m.vertices,m.farVertices].filter(Boolean)){if(!boxes.has(a)){const low=[Infinity,Infinity,Infinity],high=[-Infinity,-Infinity,-Infinity];for(let j=0;j<a.length;j+=9)for(let k=0;k<3;k++){low[k]=Math.min(low[k],a[j+k]);high[k]=Math.max(high[k],a[j+k]);}const ps=[];for(const x of[low[0],high[0]])for(const y of[low[1],high[1]])for(const z of[low[2],high[2]])ps.push([x,y,z]);boxes.set(a,ps);}for(let i=0;i<m.instances.length;i+=16){for(const v of boxes.get(a)){const p=transform(m.instances,i,...v),excess=Math.hypot(...p.map((v,k)=>v-m.center[k]))-m.radius;maximumExcess=Math.max(maximumExcess,excess);assert(excess<=.05,'Conservative prototype-corner bound exceeds native population sphere '+m.id);}checked++;}}
  return{originalBytes:original.bytes,candidateBytes:candidate.bytes,prototypeInstancePairsChecked:checked,maximumCornerBoundsExcess:maximumExcess,tolerance:.05,note:'Conservative transformed prototype-box corners; full real near/far vertices are separately retained and checked for the selected lily batch.'};
 });
 const solarTool=String(read('tools/check-sunflower-entry.mjs')),collisionSource=solarTool.slice(solarTool.indexOf('function clipXZ('),solarTool.indexOf('function approachMetrics('));
 assert(collisionSource.includes("assert.equal(intersections,0"));
 const collisionCheck=vm.compileFunction(collisionSource+'\nreturn roadClearance;',['assert','inside','bary'])(assert,inside,helpers.bary);report.unchangedCollisionHelperSHA256=sha(collisionSource);
 for(const[label,native]of[['baseline',original],['candidate',candidate]])for(const variant of['near','far'])await check(label+' actual '+variant+' plants clear native roads and tree-clear shoulders',()=>{
  const faces=[];for(const m of native.meshes.filter(m=>m.group==='roads')){assert(!m.index,'Unexpected indexed road source requires explicit classification');assert.equal((m.vertices.length/27)%6,0,'Road/shoulder source sequence changed');for(let i=0;i<m.vertices.length;i+=27)faces.push({id:m.id,index:i/27,shoulder:(i/27)%6>=2,ps:[0,1,2].map(j=>Array.from(m.vertices.subarray(i+j*9,i+j*9+3)))});}
  assert(faces.length>0);const plants=native.meshes.filter(m=>m.instances).map(m=>variant==='near'?m:{...m,vertices:m.farVertices||m.vertices,index:undefined});return collisionCheck(plants,faces);
 });
 for(const[label,native]of[['baseline',original],['candidate',candidate]]){
  const m=native.meshes.find(m=>m.id===LILY);assert(m&&m.instances.length/16===212);const files={};for(const f of['vertices','farVertices','instances','instanceColors'])files[f]=writeArray(label+'-'+f+'.f32',m[f]);
  const analysis={id:LILY,metadata:JSON.parse(JSON.stringify(m,(_k,v)=>ArrayBuffer.isView(v)?undefined:v)),files,variants:{}};
  for(const[variant,a]of[['near',m.vertices],['far',m.farVertices]]){const world=transformed(m,a);analysis.variants[variant]={file:writeArray(label+'-'+variant+'-world-xyz.f64',world),...visibility(m,a,world)};}
  report[label+'Lily']=analysis;save();
 }
 report.lilyConclusion={candidateFarStaticVisibleTriangles:report.candidateLily.variants.far.staticVisibleTriangles,
  candidateFarConservativeWindTriangles:report.candidateLily.variants.far.conservativePossibleWindTriangles,
  candidateNearStaticVisibleTriangles:report.candidateLily.variants.near.staticVisibleTriangles,
  candidateFarTightSphereMargins:report.candidateLily.variants.far.tightConservativeSphere.margins,
  noSourceOrRendererChange:true,costGateStillFailed:true,pixelCoverageNotMeasured:true};
 report.notRun=['Sunflower paired native bank','Native unload/reentry and input CPU','Complete Node regression','Any additional GPU frame'];
}catch(e){report.passed=false;report.fatal=e.stack||String(e);}
finally{
 const changed=[];for(const[p,h]of Object.entries(inputs))if(sha(fs.readFileSync(resolve(ROOT,p)))!==h)changed.push(p);
 if(changed.length){report.passed=false;report.changedInputs=changed;}Object.assign(report,{inputSHA256:inputs,inputsUnchanged:changed.length===0,endUTC:new Date().toISOString(),elapsedWallMs:performance.now()-started});save();
 console.log(JSON.stringify({output:OUTPUT,passed:report.passed,nativeBuildCount:report.nativeBuildCount,checks:report.checks.map(c=>({name:c.name,passed:c.passed})),lilyConclusion:report.lilyConclusion,fatal:report.fatal,elapsedWallMs:report.elapsedWallMs}));if(!report.passed)process.exitCode=1;
}
