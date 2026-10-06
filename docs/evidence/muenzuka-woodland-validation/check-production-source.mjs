// Independent bounded production-chain check. No fixture edits, GPU or full Node.
// All new-stage allocations are compared with the already-live accepted cache.
// The two regional packs below are genuine production buildRegion calls; V8 is
// only an authenticated public predecessor value reference, not a native build.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from 'node:v8';
import {performance} from 'node:perf_hooks';
import {execFileSync} from 'node:child_process';
import * as T from '/workspace/muenzuka-canopy-refinement/vendor/three/three.module.js';
import {geometryDigest} from '/workspace/muenzuka-canopy-refinement/tools/check-hakurei.mjs';

const ROOT='/workspace/muenzuka-canopy-refinement',EV='/workspace/muenzuka-woodland-evidence';
const SOURCE='src/muenzuka-woodland.js',RENDERER='src/muenzuka-woodland-renderer.js';
const PREFIX='b832685d8db4ae0b59ffe3a4eed7e19d4ce4ccde3d506a0e84b0f4a94ba2dee6';
const ACCEPTED='c0f2f1378ec19e5e10be8dc5e21240390315e4eddbd616c4eccc4dc8db6123b2';
const CANDIDATE='7e24a87d60bc286337bf9adb447656d39c858fc6e41208535afa4872aa4066a2';
const NATIVE=[['-22:6:1',7],['-22:7:0',4],['-21:6:1',4],['-22:8:0',5],['-21:7:0',3],
 ['-22:6:0',4],['-22:7:1',2],['-22:8:1',3],['-21:7:1',3],['-21:6:0',2]]
 .map(([key,count])=>({id:'muenzuka:trees:'+key+':leaf',count,variant:Number(key.at(-1))}));
const COLD=[{id:'overview016:muenzuka|forestLeaf|vegetation|I7',variant:0,count:10,
 retained:[0,1,2,3,4,8,12,13,14,15],west:[5,6,7,9,10,11]},
 {id:'overview016:muenzuka|forestLeaf|vegetation|I9',variant:1,count:11,
 retained:[0,1,2,3,4,5,7,8,9,13,14],west:[6,10,11,12]}];
const FIELDS=['vertices','farVertices','index','instances','instanceColors'];
const OUT=EV+'/independent-production-source.json',DIR=EV+'/independent-production-arrays';
assert.equal(process.versions.node.split('.')[0],'22');
assert(!fs.existsSync(OUT)&&!fs.existsSync(DIR),'Keep all original executions');fs.mkdirSync(DIR);
const sha=b=>createHash('sha256').update(b).digest('hex');
const bindings={},read=p=>{const b=fs.readFileSync(ROOT+'/'+p);bindings[p]=sha(b);return b;};
const evidence={},external=p=>{const b=fs.readFileSync(p);evidence[p]=sha(b);return b;};
const arraySHA=a=>a?sha(Buffer.from(a.buffer,a.byteOffset,a.byteLength)):null;
function plain(o,path=''){
 if(ArrayBuffer.isView(o))return{type:o.constructor.name,length:o.length,sha256:arraySHA(o)};
 if(Array.isArray(o))return o.map((x,i)=>plain(x,path+'.'+i));
 if(o&&typeof o==='object')return Object.fromEntries(Object.keys(o).sort()
  .filter(k=>path+'.'+k!=='data.trailUpgrade.prepareMs').map(k=>[k,plain(o[k],path+'.'+k)]));
 return o;
}
const signature=(o,path='')=>JSON.stringify(plain(o,path));
const metadata=m=>JSON.stringify(m,(k,v)=>ArrayBuffer.isView(v)?undefined:v);
function buffers(...roots){const seen=new Set(),out=new Set();function walk(o){
 if(!o||typeof o!=='object'||seen.has(o))return;seen.add(o);
 if(ArrayBuffer.isView(o)){out.add(o.buffer);return;}
 if(o.constructor?.name==='ArrayBuffer'){out.add(o);return;}
 if(o.constructor?.name==='Map'){for(const[k,v]of o){walk(k);walk(v);}}
 else if(o.constructor?.name==='Set'){for(const v of o)walk(v);}
 else for(const v of Object.values(o))walk(v);
 }roots.forEach(walk);return out;}
const sum=bs=>[...bs].reduce((s,b)=>s+b.byteLength,0),bytes=(...r)=>sum(buffers(...r));
const snap=p=>new Map(p.meshes.map(m=>[m.id,{ref:m,meta:metadata(m),fields:Object.fromEntries(FIELDS.map(k=>[k,arraySHA(m[k])]))}]));
function unchanged(m,o){assert.equal(metadata(m),o.meta,m.id+'/metadata');for(const k of FIELDS)assert.equal(arraySHA(m[k]),o.fields[k],m.id+'/'+k);}
const started=performance.now();
const report={schema:1,kind:'Independent 49-definition / 21-hook Muenzuka woodland production protection',
 startedUTC:new Date().toISOString(),checkerSHA256:sha(fs.readFileSync(import.meta.filename)),node:process.version,
 passed:false,exitCode:null,checks:[],stages:[],executed:{modelDefinitions:0,productionHooks:0,nativeBuilds:0},
 noGPU:true,noFullNode:true,noFixtureEdits:true,
 cpuLoadOverlap:'Author may capture software-GPU views in parallel; wall times are traceability, not load/CPU/FPS performance improvements.',
 snapshotReferencePolicy:'Public V8 authenticates old predecessor values only. Native baseline and candidate are built in this execution.',
 excludedVolatileMetadata:[{path:'data.trailUpgrade.prepareMs',reason:'Existing explicitly timed prepare telemetry; every other manifest field remains protected.'}]};
function save(){fs.writeFileSync(OUT,JSON.stringify(report,null,2)+'\n');}
function guard(){assert(performance.now()-started<120000,'Bounded 120-second session limit');}
async function stage(name,fn){guard();const row={name,startedUTC:new Date().toISOString(),state:'running'};report.stages.push(row);save();
 try{const result=await fn();Object.assign(row,{state:'completed',endedUTC:new Date().toISOString()});save();return result;}
 catch(e){Object.assign(row,{state:'failed',endedUTC:new Date().toISOString(),error:e.stack});save();throw e;}}
function check(name,fn){guard();try{const result=fn();const recorded=result?.source&&result?.project?
 {...result,source:undefined,project:undefined,modelDefinitions:result.project.worldBuilders.length}:result;
 report.checks.push({name,passed:true,result:recorded});save();return result;}
 catch(e){report.checks.push({name,passed:false,error:e.stack||String(e)});save();return null;}}
function mandatory(name,fn){const r=check(name,fn);assert(r!==null,'Required setup failed: '+name);return r;}
function mergedAtlas(project){const data=JSON.parse(read('data/atlas.json')),locs=new Map(data.locations.map(x=>[x.id,x]));
 for(const p of ['data/lunar.json','data/makai.json','data/netherworld.json','data/heaven.json','data/higan.json','data/animal.json','data/backdoor.json','data/kasen.json','data/current-hell.json','data/rainbow-mine.json','data/highland.json',...project.extensionData]){
  const add=JSON.parse(read(p));for(const patch of add.locationUpdates){const l=locs.get(patch.id);assert(l);for(const[k,v]of Object.entries(patch)){
   if(k==='aliases'||k==='source_ids')l[k]=[...new Set([...(l[k]||[]),...v])];else if(k!=='id')l[k]=v;}}
  data.sources.push(...add.sources);for(const x of add.verifiedLocationCorrections||[]){const l=locs.get(x.id);for(const[k,v]of Object.entries(x.expected))assert.equal(JSON.stringify(l[k]),JSON.stringify(v));Object.assign(l,x.replace);}
 }return data;}
function staticBoot(G,data,pack){
 pack.meshes.push(...G.buildKishinjouOverview().meshes);
 for(const fn of [G.buildLunarOverviews,G.buildMakaiOverviews])for(const p of fn())pack.meshes.push(...p.meshes);
 pack.meshes.push(...G.buildNetherworldOverview().meshes);
 for(const fn of [G.buildHeavenOverviews,G.buildHiganOverviews,G.buildAnimalOverviews])for(const p of fn())pack.meshes.push(...p.meshes);
 pack.meshes.push(...G.buildBackdoorOverview().meshes,...G.buildKasenOverview().meshes);
 for(const p of G.buildCurrentHellOverviews())pack.meshes.push(...p.meshes);pack.meshes.push(...G.buildRainbowMineOverview().meshes);
 G.LANDSCAPE.apply(pack,new G.Terrain(data));const t=new G.Terrain(data);G.applyHighlandGround(pack,t);
 pack.meshes.push(...G.highlandGround(t,pack),...G.buildHighland(t,true).meshes);
}
function envelopePoints(m){const b=m.instances,all=[],rows=[];for(let i=0;i<b.length;i+=16){
 const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
 for(const a of new Set([m.vertices,m.farVertices].filter(Boolean)))for(let j=0;j<a.length;j+=9){
  const y=a[j+1],u=Math.max(0,Math.min(1,(y-4)/18)),w=u*u*(3-2*u)*.16;
  for(const sx of[-1,1])for(const sz of[-1,1]){const x=a[j]+sx*w,z=a[j+2]+sz*w*.5;
   const p=[b[i]*x+b[i+4]*y+b[i+8]*z+b[i+12],b[i+1]*x+b[i+5]*y+b[i+9]*z+b[i+13],b[i+2]*x+b[i+6]*y+b[i+10]*z+b[i+14]];
   all.push(p);for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],p[k]);hi[k]=Math.max(hi[k],p[k]);}
  }}rows.push({instance:i/16,root:[b[i+12],b[i+13],b[i+14]],lo,hi});
 }return{all,rows};}
let candidate,baseline,pack,data,G,WG;
try{
 const reg=await stage('Frozen input bindings and exact accepted registration',()=>mandatory('Exact 210 artifact, accepted 208 input prefix and reviewed 49th module',()=>{
  const release=JSON.parse(external(EV+'/v1-dist/release.json')),html=external(EV+'/v1-dist/'+release.artifact);
  assert.equal(sha(html),'e2956858b9b588ee787ead21eec4cfd79ef63a5c0fbe6d472621a44823a92d45');assert.equal(sha(html),release.sha256);
  assert.equal(Object.keys(release.inputs).length,210);for(const[p,h]of Object.entries(release.inputs))assert.equal(sha(read(p)),h,p);
  const old=JSON.parse(external(EV+'/baseline/report.json'));assert(old.passed);assert.equal(Object.keys(old.inputsBefore).length,208);
  for(const[p,h]of Object.entries(old.inputsBefore))if(p!=='project.json')assert.equal(release.inputs[p],h,'Accepted input changed '+p);
  const added=Object.keys(release.inputs).filter(p=>!(p in old.inputsBefore));assert.deepEqual(added.sort(),[SOURCE,RENDERER].sort());
  const project=JSON.parse(read('project.json'));assert.equal(project.worldBuilders.length,49);assert.equal(project.worldBuilders[48],SOURCE);
  assert.equal(sha(JSON.stringify(project.worldBuilders.slice(0,48))),PREFIX);assert.equal(project.worldBuilders.filter(x=>x===SOURCE).length,1);
  assert.equal(project.extensionRenderers.filter(x=>x===RENDERER).length,1);assert.equal(project.extensionRenderers.at(-1),RENDERER);
  assert.equal(sha(read('src/muenzuka-edge.js')),'b2ef1b7c4acbc917fcaffba2fadb73ec775fc201e9bdeb0df375fa1680556045');
  assert.equal(sha(read('src/muenzuka-edge-renderer.js')),'49edfb8f6828894c3691e974b33b7b44560d48b96b7593bde2489734b79803c4');
  const body=html.toString().match(/<script id="world-builder" type="text\/plain">([\s\S]*?)<\/script><script>([\s\S]*?)<\/script>/);assert(body);
  const values={VERSION:project.version,RELEASE_TAG:'v0.29',PROJECT_TITLE:project.title,THREE_REVISION:project.threeRevision,EXPORT_PREFIX:'gensokyo-v029'};
  const source=project.worldBuilders.map(p=>String(read(p)).replace(/\r\n?/g,'\n').replace(/\{\{(\w+)\}\}/g,(_,k)=>values[k])).join('\n');
  assert.equal(body[1],source,'Worker embedded model source differs');assert.equal(body[2],source,'Main embedded model source differs');
  report.artifactSHA256=release.sha256;report.releaseInputCount=210;report.sourceHEAD=execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim();
  return{project,source,commonModelSourceSHA256:sha(source),accepted48PrefixSHA256:PREFIX,acceptedBaselineReportSHA256:evidence[EV+'/baseline/report.json'],inputHashChanges:['project.json'],addedInputs:added};
 }));
 const context=vm.createContext({performance,TextDecoder,TextEncoder});G=context.GA;
 await stage('48 real model definitions and 20 real public predecessor hooks',()=>{
  for(const p of reg.project.worldBuilders.slice(0,48)){vm.runInContext(String(read(p)),context,{filename:p});report.executed.modelDefinitions++;}
  G=context.GA;assert.equal(G.extraOverviewBuilders.length,20);
  context.inputAtlas=JSON.stringify(mergedAtlas(reg.project));data=vm.runInContext('JSON.parse(inputAtlas)',context);
  const raw=gunzipSync(read('assets/packs/overview.pack.gz'));pack=G.decodePack(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength));staticBoot(G,data,pack);
  for(let i=0;i<20;i++){const at=performance.now(),row={index:i,startedUTC:new Date().toISOString(),state:'running'};report.publicHooks??=[];report.publicHooks.push(row);save();
   const added=G.extraOverviewBuilders[i](data,pack);pack.meshes.push(...added);report.executed.productionHooks++;
   Object.assign(row,{state:'completed',endedUTC:new Date().toISOString(),addedRecords:added.length,wallMs:performance.now()-at});save();guard();}
 });
 await stage('Authenticated current public predecessor and manifest protection',()=>mandatory('All 2156 current predecessor records and every non-timing manifest value exact',()=>{
  const b=JSON.parse(external('/workspace/genbu-entry-evidence/baseline-native-source-v2.json'));
  const reference=label=>{const row=b.snapshots.find(x=>x.label===label),buf=external(row.path);assert.equal(sha(buf),row.sha256);return deserialize(buf);};
  const old=reference('public-overview'),oldData=reference('manifest');assert.equal(pack.meshes.length,2156);assert.equal(old.meshes.length,2156);
  for(let i=0;i<pack.meshes.length;i++)assert.equal(signature(pack.meshes[i]),signature(old.meshes[i]),'Predecessor record '+i+'/'+pack.meshes[i].id);
  assert.equal(signature(data,'data'),signature(oldData,'data'));assert.equal(bytes(pack),b.productionPreparation.liveRecursiveBackingBytes);
  assert(G.SUNFLOWER_ENTRY.metadata.has(pack));assert(G.FLOWER_HILL_ENTRY.metadata.has(pack));assert(G.MUENZUKA_EDGE.metadata(pack));
  return{records:2156,allRecordAndTypedBytesExact:true,manifestExactExceptNamedTelemetry:true,
   currentPrepareMs:data.trailUpgrade.prepareMs,referencePrepareMs:oldData.trailUpgrade.prepareMs,
   liveSourceBackingBytes:bytes(pack),acceptedContacts:[data.sunflowerEntry.contact,data.flowerHillEntry.contact,data.flowerHillEntry.originalContact].map(a=>({bytes:a.byteLength,sha256:arraySHA(a)}))};
 }));
 const E=G.MUENZUKA_EDGE,old=snap(pack),oldIDs=pack.meshes.map(m=>m.id),oldDataSig=signature(data,'data');
 const cached=[E.prototype(0),E.prototype(1)],oldBuffers=buffers(pack,data,E.metadata(pack),...cached);
 const oldFns=[G.Terrain.prototype.height,G.Terrain.prototype.water,G.Terrain.prototype.color];
 const world=JSON.stringify([G.PRESETS,G.IMPLEMENTED,G.WEST.mpaths,G.ISLAND.allRoutes]);
 await stage('One registered 49th definition and 21st production hook',()=>{
  const oldBuilder=G.buildRegion;vm.runInContext(String(read(SOURCE)),context,{filename:SOURCE});report.executed.modelDefinitions++;
  assert.equal(G.extraOverviewBuilders.length,21);assert.equal(G.MUENZUKA_WOODLAND.originalBuildRegion,oldBuilder);
  const added=G.extraOverviewBuilders[20](data,pack);pack.meshes.push(...added);report.executed.productionHooks++;assert.equal(added.length,0);
 });
 check('Cold 21 independently identified leaves only; western 10 and all other 2154 records exact',()=>{
  assert.deepEqual(pack.meshes.map(m=>m.id),oldIDs);assert.equal(signature(data,'data'),oldDataSig);let trees=0;
  for(const m of pack.meshes){const o=old.get(m.id),q=COLD.find(q=>q.id===m.id);if(!q){unchanged(m,o);assert.equal(m,o.ref);continue;}
   assert.equal(metadata(m),o.meta);assert.equal(m.instances.length/16,q.count);trees+=q.count;
   for(const k of FIELDS)if(!['vertices','farVertices'].includes(k))assert.equal(arraySHA(m[k]),o.fields[k]);
   assert.equal(m.vertices,cached[q.variant].far);if(o.ref.farVertices)assert.equal(m.farVertices,cached[q.variant].far);else assert(!m.farVertices);
   assert.equal(o.ref.vertices.length/27,216);const west=pack.meshes.find(x=>x.id===q.id+':muenzuka-west-edge');unchanged(west,old.get(west.id));
   assert.equal(west.instances.length/16,q.west.length);assert.equal(west.vertices,cached[q.variant].far);
  }assert.equal(trees,21);return{coldTrees:31,targetTrees:21,westernTrees:10,targetRecords:2,allOtherRecords:2154,
   coldSourceIdentityMaps:COLD.map(q=>({id:q.id,retainedOriginalIndices:q.retained,westernOriginalIndices:q.west})),newRecords:0};
 });
 check('Main realm live cache reuse, complete zero incremental typed backing, query/navigation and idempotence',()=>{
  const U=G.MUENZUKA_WOODLAND,all=buffers(pack,data,E.metadata(pack),U.metadata(pack),...cached),added=[...all].filter(b=>!oldBuffers.has(b));
  assert.equal(sum(added),0);assert.equal(pack.bytes,bytes(pack.meshes));assert.equal(G.Terrain.prototype.height,oldFns[0]);assert.equal(G.Terrain.prototype.water,oldFns[1]);assert.equal(G.Terrain.prototype.color,oldFns[2]);
  assert.equal(JSON.stringify([G.PRESETS,G.IMPLEMENTED,G.WEST.mpaths,G.ISLAND.allRoutes]),world);const after=snap(pack),meta=U.metadata(pack);
  assert.equal(U.prepare(data,pack),meta);for(const m of pack.meshes){unchanged(m,after.get(m.id));assert.equal(m,after.get(m.id).ref);}
  report.mainAdditionalTypedBackingBytes=0;return{newTypedBackingBytes:0,packBytes:pack.bytes,prototypeCacheBytes:bytes(...cached),oldWestCacheObjectsExact:true};
 });
 await stage('Shared embedded Worker model definitions; genuine current and candidate native builds',async()=>{
  const wc=vm.createContext({performance,TextDecoder,TextEncoder});vm.runInContext(reg.source,wc,{filename:'actual-embedded-world-builder'});WG=wc.GA;
  assert.equal(WG.extraOverviewBuilders.length,21);wc.manifest=structuredClone(data);
  const one=async(label,fn)=>{const row={label,startedUTC:new Date().toISOString(),state:'running'};report.nativeBuildStages??=[];report.nativeBuildStages.push(row);save();
   const p=await fn();report.executed.nativeBuilds++;Object.assign(row,{state:'completed',endedUTC:new Date().toISOString(),records:p.meshes.length,reportedBytes:p.bytes,liveBackingBytes:bytes(p),geometrySHA256:geometryDigest(p)});save();guard();return p;};
  baseline=await one('Current accepted 48-wrapper native',()=>WG.MUENZUKA_WOODLAND.originalBuildRegion(wc.manifest,'muenzuka'));
  mandatory('Actual accepted native remains fixed c0f2 and contains 25 accepted western crowns',()=>{
   assert.equal(geometryDigest(baseline),ACCEPTED);const west=baseline.meshes.filter(m=>WG.MUENZUKA_EDGE.target(m)?.part==='leaf');
   assert.equal(west.length,6);assert.equal(west.reduce((s,m)=>s+m.instances.length/16,0),25);assert.equal(baseline.meta.cherryTrees,3);
   return{digest:ACCEPTED,records:baseline.meshes.length,acceptedWesternTrees:25,purpleCherries:3,productionNativeBuild:true};
  });
  candidate=await one('Actual registered 49-wrapper native',()=>WG.buildRegion(wc.manifest,'muenzuka'));
 });
 check('Real candidate leaf replacement and exhaustive native source/identity protection',()=>{
  const before=snap(baseline),WE=WG.MUENZUKA_EDGE;assert.deepEqual(candidate.meshes.map(m=>m.id),baseline.meshes.map(m=>m.id));let trees=0;
  for(const m of candidate.meshes){const o=before.get(m.id),q=NATIVE.find(q=>q.id===m.id);if(!q){unchanged(m,o);continue;}
   assert.equal(metadata(m),o.meta);for(const k of ['index','instances','instanceColors'])assert.equal(arraySHA(m[k]),o.fields[k]);
   assert.equal(m.instances.length/16,q.count);assert.equal(o.ref.vertices.length/27,2234);assert.equal(o.ref.farVertices.length/27,216);
   assert.equal(m.vertices,WE.prototype(q.variant).near);assert.equal(m.farVertices,WE.prototype(q.variant).far);assert.equal(m.vertices.length/27,1152);assert.equal(m.farVertices.length/27,180);trees+=q.count;
  }assert.equal(trees,37);assert.equal(candidate.meta.cherryTrees,3);assert.equal(candidate.meta.trees,62);
  const core=p=>{const q={...p};delete q.meshes;delete q.bytes;delete q.builtMs;q.meta={...q.meta};delete q.meta.muenzukaWoodland;return signature(q);};
  assert.equal(core(candidate),core(baseline));assert.equal(geometryDigest(baseline),ACCEPTED);
  report.candidateNativeGeometrySHA256=geometryDigest(candidate);
  assert.equal(report.candidateNativeGeometrySHA256,CANDIDATE,'Actual candidate differs from the independently requested digest review value');
  return{candidateDigest:report.candidateNativeGeometrySHA256,fixtureStatus:'Pending manual review; no fixture rewritten',targetTrees:37,targetRecords:10,
   oldWesternTrees:25,ordinaryTrees:62,purpleCherries:3,protectedNonTargetRecords:candidate.meshes.length-10,
   allMatricesAll16ComponentsColorsStemsPathsAndTerrainByteExact:true};
 });
 check('Worker-realm cache reuse and main/Worker prototype value parity with no incremental buffers',()=>{
  const WE=WG.MUENZUKA_EDGE,U=WG.MUENZUKA_WOODLAND,oldBuffers=buffers(baseline,WE.prototype(0),WE.prototype(1));
  const projected=U.applyDetail(baseline);assert.equal(geometryDigest(projected),geometryDigest(candidate));assert.equal(geometryDigest(baseline),ACCEPTED);
  const add=[...buffers(projected,WE.prototype(0),WE.prototype(1))].filter(b=>!oldBuffers.has(b));assert.equal(sum(add),0);
  assert.equal(U.applyDetail(candidate),candidate);assert.equal(candidate.bytes,bytes(candidate.meshes));
  for(let v=0;v<2;v++)for(const lod of ['near','far']){assert.notEqual(WE.prototype(v)[lod],cached[v][lod]);assert.equal(arraySHA(WE.prototype(v)[lod]),arraySHA(cached[v][lod]));}
  report.workerAdditionalTypedBackingBytes=0;
  return{newTypedBackingBytes:0,prototypeBackingBytesPerRealm:bytes(WE.prototype(0),WE.prototype(1)),
   mainWorkerArraysDistinctButEqual:true,actualNativeReportedBytes:candidate.bytes,acceptedNativeReportedBytes:baseline.bytes,
   noClaimOfLiveBrowserWorkerFromVM:'This checks the exact embedded Worker model realm and actual production builders; browser Worker execution is separately recorded in the paired capture.'};
 });
 await stage('Independent real near/far/all-phase envelopes and actual retained road triangle clearance',()=>{
  const renderer=String(read('src/renderer.js'));assert(renderer.includes('float sway=smoothstep(4.,22.,position.y)*.16;'));assert(renderer.includes('transformed.z+=cos(uWind*.53+phaseP.z*.047)*sway*.5;'));
  vm.runInContext(renderer,context,{filename:'src/renderer.js'});vm.runInContext(String(read('src/muenzuka-edge-renderer.js')),context,{filename:'src/muenzuka-edge-renderer.js'});
  const oldRenderer=G.DioramaRenderer,C=G.MUENZUKA_EDGE_CULLING,west=pack.meshes.filter(C.eligible),spheres=west.map(m=>C.envelope(T,m));
  vm.runInContext(String(read(RENDERER)),context,{filename:RENDERER});const WC=G.MUENZUKA_WOODLAND_CULLING;assert.equal(Object.getPrototypeOf(G.DioramaRenderer.prototype),oldRenderer.prototype);
  const targets=candidate.meshes.filter(m=>NATIVE.some(q=>q.id===m.id)),cold=pack.meshes.filter(m=>COLD.some(q=>q.id===m.id));
  check('Only twelve new target records receive both-LOD wind envelopes; old western cache unchanged',()=>{
   assert.equal(targets.length,10);assert.equal(cold.length,2);assert.equal(WC.source,C);
   for(const m of candidate.meshes)assert.equal(Boolean(WC.eligible(m)),NATIVE.some(q=>q.id===m.id));
   for(const m of pack.meshes)assert.equal(Boolean(WC.eligible(m)),COLD.some(q=>q.id===m.id));
   west.forEach((m,i)=>assert.equal(C.envelope(T,m),spheres[i]));const rows=[];
   for(const m of [...targets,...cold]){const sphere=C.envelope(T,m),{all,rows:roots}=envelopePoints(m);assert.equal(C.envelope(T,m),sphere);
    let maximumOutside=-Infinity,maximumWantedOutside=-Infinity;for(const p of all){maximumOutside=Math.max(maximumOutside,Math.hypot(p[0]-sphere.center.x,p[1]-sphere.center.y,p[2]-sphere.center.z)-sphere.radius);
     maximumWantedOutside=Math.max(maximumWantedOutside,Math.hypot(...p.map((v,k)=>v-m.center[k]))-m.radius);}
    assert(maximumOutside<=1e-7,m.id+'/actual wind sphere');assert(maximumWantedOutside<=1e-5,m.id+'/preserved wanted sphere');
    const rootClearance=Math.min(...roots.map(r=>r.lo[1]-r.root[1]));assert(rootClearance>3,m.id+'/root headroom');
    rows.push({id:m.id,instances:roots.length,maximumOutside,maximumWantedOutside,minimumRootHeadroom:rootClearance,center:sphere.center.toArray(),radius:sphere.radius});
   }return{rows,oldWestColdSphereObjectsPreserved:true,noPrototypeOrInstanceMutation:true};
  });
  check('All 37 changed crowns retain actual public/native road headroom through both LODs and every wind phase',()=>{
   const roadFaces=[];for(const m of [...pack.meshes,...candidate.meshes])if(m.group==='roads'&&!m.instances){const a=m.vertices,idx=m.index,n=idx?idx.length:a.length/9;
    for(let i=0;i<n;i+=3){const ps=[0,1,2].map(k=>{const at=(idx?idx[i+k]:i+k)*9;return[a[at],a[at+1],a[at+2]];});
     roadFaces.push({id:m.id,face:i/3,loX:Math.min(...ps.map(p=>p[0])),hiX:Math.max(...ps.map(p=>p[0])),loZ:Math.min(...ps.map(p=>p[2])),hiZ:Math.max(...ps.map(p=>p[2])),topY:Math.max(...ps.map(p=>p[1]))});}}
   const rows=[];let minimum=Infinity;for(const m of targets)for(const r of envelopePoints(m).rows){
    const possible=roadFaces.filter(f=>f.hiX>=r.lo[0]&&f.loX<=r.hi[0]&&f.hiZ>=r.lo[2]&&f.loZ<=r.hi[2]);
    const top=possible.length?Math.max(...possible.map(f=>f.topY)):null,gap=top===null?null:r.lo[1]-top;
    if(gap!==null){assert(gap>2.4,m.id+'/'+r.instance+'/walking headroom');minimum=Math.min(minimum,gap);}
    rows.push({id:m.id,instance:r.instance,root:r.root,minimumCrownY:r.lo[1],maximumPossibleRoadY:top,conservativeClearance:gap,possibleRoadFaces:possible.length});
   }assert.equal(rows.length,37);return{rows,allRoadTrianglesInspected:roadFaces.length,minimumConservativeClearance:minimum,
    proof:'XZ box overlap deliberately overestimates triangle/crown overlap; maximal actual road Y vs minimal all-phase crown Y proves conservative walking headroom. Not screen occlusion.'};
  });
 });
 await stage('Retained actual packs and final input immutability',()=>{
  const rows=[];for(const[label,p]of[['accepted-native',baseline],['candidate-native',candidate]]){
   const b=serialize(p),path=DIR+'/'+label+'.v8';fs.writeFileSync(path,b,{flag:'wx'});rows.push({label,path,sha256:sha(b),bytes:b.byteLength,geometrySHA256:geometryDigest(p),liveSourceBackingBytes:bytes(p),
    caution:'Serialized backing slabs must not be counted as production allocations. Live bytes were measured before serialization.'});}
  report.snapshots=rows;
  check('All exact release and protocol inputs stayed frozen; no fixed fixture changed',()=>{
   for(const[p,h]of Object.entries(bindings))assert.equal(sha(fs.readFileSync(ROOT+'/'+p)),h,p);
   assert.equal(report.checkerSHA256,sha(fs.readFileSync(import.meta.filename)));assert.equal(report.executed.modelDefinitions,49);assert.equal(report.executed.productionHooks,21);assert.equal(report.executed.nativeBuilds,2);
   return{modelDefinitions:49,productionHooks:21,realNativeBuilds:2,fixtureUnchanged:true};
  });
 });
 report.passed=report.checks.every(c=>c.passed)&&report.stages.every(s=>s.state==='completed');report.exitCode=report.passed?0:1;
}catch(e){report.passed=false;report.exitCode=1;report.fatal=e.stack||String(e);}
finally{
 report.endedUTC=new Date().toISOString();report.elapsedMs=performance.now()-started;report.inputSHA256=bindings;report.evidenceSHA256=evidence;
 report.inputsUnchanged=Object.entries(bindings).every(([p,h])=>sha(fs.readFileSync(ROOT+'/'+p))===h);
 if(!report.inputsUnchanged){report.passed=false;report.exitCode=1;}
 report.notRun=['Complete Node regression','Our own GPU capture','Lifecycle/input measurements','Automatic fixture update'];save();
 console.log(JSON.stringify({output:OUT,passed:report.passed,exitCode:report.exitCode,executed:report.executed,
  checks:report.checks.map(c=>({name:c.name,passed:c.passed})),elapsedMs:report.elapsedMs,candidateDigest:report.candidateNativeGeometrySHA256,fatal:report.fatal}));
 process.exitCode=report.exitCode;
}
