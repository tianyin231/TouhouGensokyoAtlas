// Independent source protection for the existing western Muenzuka trees.
// Full public predecessors and two real native builds; no fixture rewriting,
// WebGL, visual acceptance, or claim about hardware FPS/physical VRAM.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import * as T from '../vendor/three/three.module.js';
import {geometryDigest} from './check-hakurei.mjs';
import {registeredSunflowerPrefix} from './check-sunflower-entry.mjs';

const SOURCE='src/muenzuka-edge.js',RENDERER='src/muenzuka-edge-renderer.js';
const ORIGINAL='fce019a1625ad753025841ebb396bf84a5844c9d9284dce9f45250789514a058';
const FIELDS=['vertices','farVertices','instances','instanceColors','index'];
const SCOPE=[-1840,480,-1760,672];
const NATIVE_IDS=[6,7,8].flatMap(z=>[0,1].map(v=>`muenzuka:trees:-23:${z}:${v}:leaf`));
const COLD=[{id:'overview016:muenzuka|forestLeaf|vegetation|I7',selected:[5,6,7,9,10,11],count:16},
 {id:'overview016:muenzuka|forestLeaf|vegetation|I9',selected:[6,10,11,12],count:15}];
const sha=a=>createHash('sha256').update(a).digest('hex');
const arraySHA=a=>a?sha(Buffer.from(a.buffer,a.byteOffset,a.byteLength)):null;
const same=(a,b,label)=>assert.equal(JSON.stringify(a),JSON.stringify(b),label);
const meta=m=>JSON.stringify(m,(k,v)=>ArrayBuffer.isView(v)?undefined:v);
const inside=(x,z)=>x>=SCOPE[0]&&x<SCOPE[2]&&z>=SCOPE[1]&&z<SCOPE[3];
function buffers(...roots){
 const seen=new Set(),out=new Set();const visit=o=>{if(!o||typeof o!=='object'||seen.has(o))return;seen.add(o);
  if(ArrayBuffer.isView(o)){out.add(o.buffer);return;}if(o instanceof Map||o instanceof Set){for(const v of o.values())visit(v);return;}
  for(const v of Object.values(o))visit(v);};for(const r of roots)visit(r);return out;
}
const bytes=bs=>[...bs].reduce((s,b)=>s+b.byteLength,0);
function snapshot(pack){return new Map(pack.meshes.map(m=>[m.id,{ref:m,metadata:meta(m),arrays:Object.fromEntries(FIELDS.map(k=>[k,arraySHA(m[k])]))}]))}
function unchanged(m,old){assert.equal(meta(m),old.metadata,m.id+' metadata');for(const k of FIELDS)assert.equal(arraySHA(m[k]),old.arrays[k],m.id+'/'+k);}
function mergedAtlas(read,project){
 const data=JSON.parse(read('data/atlas.json')),locations=new Map(data.locations.map(l=>[l.id,l]));
 for(const p of ['data/lunar.json','data/makai.json','data/netherworld.json','data/heaven.json','data/higan.json','data/animal.json','data/backdoor.json','data/kasen.json','data/current-hell.json','data/rainbow-mine.json','data/highland.json',...project.extensionData]){
  const add=JSON.parse(read(p));for(const patch of add.locationUpdates){const l=locations.get(patch.id);assert(l);for(const[k,v]of Object.entries(patch)){if(k==='aliases'||k==='source_ids')l[k]=[...new Set([...(l[k]||[]),...v])];else if(k!=='id')l[k]=v;}}
  data.sources.push(...add.sources);for(const correction of add.verifiedLocationCorrections||[]){const l=locations.get(correction.id);for(const[k,v]of Object.entries(correction.expected))same(l[k],v);Object.assign(l,correction.replace);}
 }return data;
}
function bootPredecessors(G,data,pack,hooks){
 pack.meshes.push(...G.buildKishinjouOverview().meshes);
 for(const fn of [G.buildLunarOverviews,G.buildMakaiOverviews])for(const p of fn())pack.meshes.push(...p.meshes);
 pack.meshes.push(...G.buildNetherworldOverview().meshes);
 for(const fn of [G.buildHeavenOverviews,G.buildHiganOverviews,G.buildAnimalOverviews])for(const p of fn())pack.meshes.push(...p.meshes);
 pack.meshes.push(...G.buildBackdoorOverview().meshes,...G.buildKasenOverview().meshes);
 for(const p of G.buildCurrentHellOverviews())pack.meshes.push(...p.meshes);
 pack.meshes.push(...G.buildRainbowMineOverview().meshes);
 G.LANDSCAPE.apply(pack,new G.Terrain(data));const t=new G.Terrain(data);
 G.applyHighlandGround(pack,t);pack.meshes.push(...G.highlandGround(t,pack),...G.buildHighland(t,true).meshes);
 for(const fn of hooks)pack.meshes.push(...fn(data,pack));
}
function verifySubset(result,original,indices,label){
 assert.equal(result.instances.length,indices.length*16);assert.equal(result.instanceColors.length,indices.length*3);
 for(let j=0;j<indices.length;j++)for(const[k,stride]of [['instances',16],['instanceColors',3]])
  for(let c=0;c<stride;c++)assert.equal(result[k][j*stride+c],original[k][indices[j]*stride+c],label+'/'+k+'/'+indices[j]);
}
function prototypeSanity(a,expectedClosedFaces){
 assert.equal(a.constructor.name,'Float32Array');assert.equal(a.length%27,0);assert(a.every(Number.isFinite));
 const count=a.length/27,parent=Array.from({length:count},(_,i)=>i),points=new Map(),edges=new Map();
 const find=i=>parent[i]===i?i:parent[i]=find(parent[i]);let minimumArea=Infinity,minimumNormal=Infinity;
 for(let i=0;i<count;i++){
  const ps=[0,1,2].map(j=>Array.from(a.subarray(i*27+j*9,i*27+j*9+3))),keys=ps.map(p=>p.join(','));
  const u=ps[1].map((v,k)=>v-ps[0][k]),v=ps[2].map((v,k)=>v-ps[0][k]),n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],area=Math.hypot(...n)/2;
  minimumArea=Math.min(minimumArea,area);assert(area>1e-9,'Degenerate crown face');
  for(let j=0;j<3;j++){const at=i*27+j*9,norm=Math.hypot(a[at+3],a[at+4],a[at+5]);minimumNormal=Math.min(minimumNormal,norm);assert(Math.abs(norm-1)<.00001,'Invalid crown normal');assert(n.reduce((s,x,k)=>s+x*a[at+3+k],0)>0,'Inward crown triangle');
   const key=keys[j];if(points.has(key))parent[find(i)]=find(points.get(key));else points.set(key,i);
   const edge=[key,keys[(j+1)%3]].sort().join('|');if(!edges.has(edge))edges.set(edge,[]);edges.get(edge).push(i);
  }
 }
 const groups=new Map();for(let i=0;i<count;i++){const k=find(i);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(i);}
 const closed=[];let open=0;
 for(const [root,faces]of groups){const es=[...edges.values()].filter(e=>find(e[0])===root),isClosed=es.every(e=>e.length===2);
  if(isClosed){assert.equal(faces.length,expectedClosedFaces,'Closed crown shell topology changed');closed.push(faces.length);}else{assert.equal(faces.length,4,'Detached leaf spray topology changed');open++;}
 }
 assert.equal(closed.length,9,'Nine nonempty closed masses are required');
 assert.equal(open,expectedClosedFaces===80?108:0,'Near folded sprays or far closed masses changed');
 return {triangles:count,closedShells:closed.length,openSprays:open,minimumArea,minimumNormal};
}
function envelopeCheck(m,sphere){
 const b=m.instances,c=sphere.center;let maximumOutside=-Infinity,minimumRootClearance=Infinity,vertices=0;
 for(const a of new Set([m.vertices,m.farVertices].filter(Boolean)))for(let i=0;i<b.length;i+=16)for(let j=0;j<a.length;j+=9){
  const x=a[j],y=a[j+1],z=a[j+2],u=Math.max(0,Math.min(1,(y-4)/18)),w=u*u*(3-2*u)*.16;
  const p=[b[i]*x+b[i+4]*y+b[i+8]*z+b[i+12],b[i+1]*x+b[i+5]*y+b[i+9]*z+b[i+13],b[i+2]*x+b[i+6]*y+b[i+10]*z+b[i+14]];
  minimumRootClearance=Math.min(minimumRootClearance,p[1]-b[i+13]);
  for(const sx of[-1,1])for(const sz of[-1,1]){const q=p.map((v,k)=>v+sx*b[i+k]*w+sz*b[i+8+k]*w*.5);
   maximumOutside=Math.max(maximumOutside,Math.hypot(q[0]-c.x,q[1]-c.y,q[2]-c.z)-sphere.radius);
   assert(Math.hypot(...q.map((v,k)=>v-m.center[k]))<=m.radius+.00001,'Source wanted sphere no longer contains crown');
  }vertices++;
 }
 assert(maximumOutside<=1e-7,'Explicit culling sphere misses near/far/wind vertices');assert(minimumRootClearance>=3,'Crown enters walking headroom');
 return {id:m.id,vertices,maximumOutside,minimumRootClearance};
}
export async function checkMuenzukaEdge(read,{sourceSHA}={}){
 const start=performance.now(),report={schema:1,kind:'Independent Muenzuka western crown source protection',sourceSHA256:sha(read(SOURCE)),checks:[],passed:true,nativeBuildCount:0,noGPU:true,fixtureRewriting:false};
 const check=async(name,f)=>{try{const result=await f();report.checks.push({name,passed:true,result});return result;}catch(e){report.passed=false;report.checks.push({name,passed:false,error:e.stack||String(e)});return null;}};
 const finish=()=>{report.wallMs=performance.now()-start;report.notRun=['WebGL visual acceptance','Submitted draw/triangle and residency comparison','Production input and unload/reentry','Complete Node regression'];return report;};
 const registration=await check('exact real project prefix and frozen stage source',()=>{
  assert(sourceSHA);assert.equal(report.sourceSHA256,sourceSHA);const project=JSON.parse(read('project.json')),solar=registeredSunflowerPrefix(project),index=project.worldBuilders.indexOf(SOURCE);
  assert.equal(index,46);assert.equal(project.worldBuilders.filter(p=>p===SOURCE).length,1);assert.equal(project.extensionRenderers.filter(p=>p===RENDERER).length,1);
  return {project,predecessors:solar.modules,deferredSuffix:project.worldBuilders.slice(index+1),projectSHA256:sha(read('project.json')),rendererSHA256:sha(read(RENDERER))};
 });if(!registration)return finish();
 const context=vm.createContext({performance,TextDecoder,TextEncoder});for(const p of registration.predecessors)vm.runInContext(String(read(p)),context,{filename:p});
 const G=context.GA,oldHeight=G.Terrain.prototype.height,oldWater=G.Terrain.prototype.water,oldColor=G.Terrain.prototype.color,oldBuilder=G.buildRegion,hooks=G.extraOverviewBuilders.slice();
 const world=JSON.stringify([G.PRESETS,G.IMPLEMENTED,G.routes,G.ISLAND.allRoutes]);vm.runInContext(String(read(SOURCE)),context,{filename:SOURCE});const U=G.MUENZUKA_EDGE;
 await check('terrain, navigation, predecessors and one real public wrapper retained',()=>{
  assert(U);same(Array.from(U.scope),SCOPE);assert.equal(U.originalBuildRegion,oldBuilder);assert.equal(G.Terrain.prototype.height,oldHeight);assert.equal(G.Terrain.prototype.water,oldWater);assert.equal(G.Terrain.prototype.color,oldColor);
  assert.equal(JSON.stringify([G.PRESETS,G.IMPLEMENTED,G.routes,G.ISLAND.allRoutes]),world);assert.equal(G.extraOverviewBuilders.length,hooks.length+1);hooks.forEach((f,i)=>assert.equal(G.extraOverviewBuilders[i],f));return{predecessorHooks:hooks.length,terrainAndNavigationUnchanged:true};
 });
 context.inputAtlas=JSON.stringify(mergedAtlas(read,registration.project));const data=vm.runInContext('JSON.parse(inputAtlas)',context);
 const raw=gunzipSync(read('assets/packs/overview.pack.gz')),pack=G.decodePack(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength));
 const boot=await check('complete actual public boot before the Muenzuka wrapper',()=>{bootPredecessors(G,data,pack,hooks);assert(G.SUNFLOWER_ENTRY.metadata.has(pack));assert(data.sunflowerEntry.contact.length);return{records:pack.meshes.length,predecessorHooks:hooks.length,SolarContactSHA256:arraySHA(data.sunflowerEntry.contact)};});if(!boot)return finish();
 const before=snapshot(pack),oldBuffers=buffers(pack,data),oldIDs=pack.meshes.map(m=>m.id),dataBefore=meta(data);
 const applied=await check('actual registered cold wrapper publishes only two records',()=>{pack.meshes.push(...G.extraOverviewBuilders.at(-1)(data,pack));assert(U.metadata(pack));assert.equal(meta(data),dataBefore);assert.equal(pack.meshes.length,before.size+2);return{records:pack.meshes.length,added:2};});if(!applied)return finish();
 await check('all original public records and independent cold instance identities protected',()=>{
  const expected=[];for(const id of oldIDs){expected.push(id);if(COLD.some(q=>q.id===id))expected.push(id+':muenzuka-west-edge');}same(pack.meshes.map(m=>m.id),expected);assert.equal(new Set(expected).size,expected.length);
  let untouched=0,selected=0;
  for(const [id,old]of before){const q=COLD.find(q=>q.id===id),m=pack.meshes.find(m=>m.id===id);if(!q){unchanged(m,old);untouched++;continue;}
   const original=old.ref,edge=pack.meshes.find(m=>m.id===id+':muenzuka-west-edge'),actual=[];assert.equal(original.instances.length/16,q.count);
   for(let i=0;i<q.count;i++)if(inside(original.instances[i*16+12],original.instances[i*16+14]))actual.push(i);same(actual,q.selected,'Cold original identities changed');
   const retained=Array.from({length:q.count},(_,i)=>i).filter(i=>!actual.includes(i));verifySubset(m,original,retained,id+'/retained');verifySubset(edge,original,actual,id+'/edge');
   assert.equal(meta(m),old.metadata);assert.equal(meta({...edge,id}),old.metadata);
   for(const k of ['vertices','farVertices','index'])assert.equal(arraySHA(m[k]),old.arrays[k]);
   assert.equal(edge.vertices.length/27,180);if(edge.farVertices)assert.equal(edge.vertices,edge.farVertices);assert(!edge.index);selected+=actual.length;
   for(const k of FIELDS)assert.equal(arraySHA(original[k]),old.arrays[k],'Original cold input mutated');
  }
  assert.equal(selected,10);return{untouchedRecords:untouched,coldTrees:31,replacedColdTrees:selected,addedColdLeafRecords:2};
 });
 await check('public wrapper idempotence and complete backing ownership',()=>{
  const snapshotAfter=snapshot(pack),ids=pack.meshes.map(m=>m.id);pack.meshes.push(...G.extraOverviewBuilders.at(-1)(data,pack));same(pack.meshes.map(m=>m.id),ids);for(const m of pack.meshes)unchanged(m,snapshotAfter.get(m.id));
  assert.equal(pack.bytes,bytes(buffers(pack.meshes)));const reachable=buffers(pack,data,U.metadata(pack),U.prototype(0),U.prototype(1));
  const added=bytes(new Set([...reachable].filter(b=>!oldBuffers.has(b))));assert.equal(added,290068);report.publicAddedBackingBytes=added;return{addedBackingBytes:added,includesUnusedPublicNearCache:true,packBytes:pack.bytes};
 });
 const worker=vm.createContext({performance,TextDecoder,TextEncoder});for(const p of registration.predecessors)vm.runInContext(String(read(p)),worker,{filename:p});
 worker.manifest=structuredClone(data);const W=worker.GA,original=await W.buildRegion(worker.manifest,'muenzuka');report.nativeBuildCount++;
 await check('independent actual native baseline digest',()=>{assert.equal(geometryDigest(original),ORIGINAL);return{digest:ORIGINAL,records:original.meshes.length,bytes:original.bytes};});
 const oldNative=snapshot(original),originalBuffers=buffers(original);
 vm.runInContext(String(read(SOURCE)),worker,{filename:SOURCE});const E=W.MUENZUKA_EDGE,appliedNative=E.applyDetail(original),candidate=await W.buildRegion(worker.manifest,'muenzuka');report.nativeBuildCount++;
 report.candidateNativeGeometrySHA256=geometryDigest(candidate);
 await check('real native wrapper matches the protected replacement and keeps every other source byte',()=>{
  assert.equal(geometryDigest(original),ORIGINAL,'Retained original pack mutated');assert.equal(geometryDigest(appliedNative),geometryDigest(candidate));same(candidate.meshes.map(m=>m.id),original.meshes.map(m=>m.id));
  let changed=0,trees=0;for(const m of candidate.meshes){const o=oldNative.get(m.id);assert(o);if(!NATIVE_IDS.includes(m.id)){unchanged(m,o);continue;}
   assert.equal(meta(m),o.metadata);for(const k of ['instances','instanceColors','index'])assert.equal(arraySHA(m[k]),o.arrays[k]);assert.equal(m.vertices.length/27,1152);assert.equal(m.farVertices.length/27,180);assert.notEqual(arraySHA(m.vertices),o.arrays.vertices);assert.notEqual(arraySHA(m.farVertices),o.arrays.farVertices);
   for(let i=0;i<m.instances.length;i+=16)assert(inside(m.instances[i+12],m.instances[i+14]));changed++;trees+=m.instances.length/16;
  }
  assert.equal(changed,6);assert.equal(trees,25);const metadata={...candidate.meta};delete metadata.muenzukaEdge;same(metadata,original.meta);same(candidate.signs,original.signs);assert.equal(candidate.source,original.source);
  assert.equal(E.applyDetail(candidate),candidate);assert.equal(candidate.bytes,bytes(buffers(candidate.meshes)));return{records:candidate.meshes.length,replacedLeafRecords:changed,trees,allStemsPurpleCherriesPathsMemorialsShedAndFlowersUnchanged:true};
 });
 await check('complete new source cost across distinct public and native contexts',()=>{
  const nativeBuffers=buffers(appliedNative,E.prototype(0),E.prototype(1)),added=bytes(new Set([...nativeBuffers].filter(b=>!originalBuffers.has(b))));
  assert.equal(added,287712);const total=added+report.publicAddedBackingBytes;assert(total<=.6*1048576);assert.equal(total,577780);return{publicBackingBytes:report.publicAddedBackingBytes,nativeBackingBytes:added,totalAddedBackingBytes:total,cap:.6*1048576,textureDelta:0,physicalVRAMMeasured:false};
 });
 await check('near and far crowns are finite closed masses with attached folded sprays',()=>{
  const prototypes=new Map();for(const m of candidate.meshes.filter(m=>NATIVE_IDS.includes(m.id)))for(const [lod,a]of [['near',m.vertices],['far',m.farVertices]])if(!prototypes.has(a))prototypes.set(a,{lod,result:prototypeSanity(a,lod==='near'?80:20)});
  assert.equal(prototypes.size,4);return[...prototypes.values()];
 });
 await check('only the six native and two cold records receive complete immutable LOD wind envelopes',()=>{
  const renderer=String(read('src/renderer.js'));assert(renderer.includes('float sway=smoothstep(4.,22.,position.y)*.16;'));assert(renderer.includes('transformed.z+=cos(uWind*.53+phaseP.z*.047)*sway*.5;'));
  vm.runInContext(renderer,context,{filename:'src/renderer.js'});vm.runInContext(String(read(RENDERER)),context,{filename:RENDERER});const C=G.MUENZUKA_EDGE_CULLING;
  const natives=candidate.meshes.filter(C.eligible),colds=pack.meshes.filter(C.eligible);same(natives.map(m=>m.id).sort(),NATIVE_IDS.slice().sort());same(colds.map(m=>m.id).sort(),COLD.map(q=>q.id+':muenzuka-west-edge').sort());
  const digest=geometryDigest(candidate),rows=[];for(const m of [...natives,...colds]){const sphere=C.envelope(T,m);assert.equal(sphere,C.envelope(T,m));rows.push(envelopeCheck(m,sphere));}assert.equal(geometryDigest(candidate),digest);
  return{nativeRecords:natives.length,coldRecords:colds.length,rows,shaderPhaseEnvelope:'All ±X/±Z vertex envelope corners after each original instance transform',newGPUArrays:0};
 });
 await check('source frozen through execution',()=>{assert.equal(sha(read(SOURCE)),sourceSHA);return{sourceSHA256:sourceSHA};});
 return finish();
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 assert.equal(process.versions.node.split('.')[0],'22');const option=n=>{const i=process.argv.indexOf(n);return i<0?undefined:process.argv[i+1];};
 const root=resolve(option('--root')||fileURLToPath(new URL('../',import.meta.url))),output=option('--output');assert(output&&!fs.existsSync(output));
 const inputs={},read=p=>{const b=fs.readFileSync(resolve(root,p));inputs[p]=sha(b);return b;},startedUTC=new Date().toISOString();let report;
 try{report=await checkMuenzukaEdge(read,{sourceSHA:option('--source-sha')});}catch(e){report={passed:false,fatal:e.stack,checks:[]};}
 Object.assign(report,{startedUTC,endedUTC:new Date().toISOString(),node:process.version,checkerSHA256:sha(fs.readFileSync(fileURLToPath(import.meta.url))),inputSHA256:inputs,inputsUnchanged:Object.entries(inputs).every(([p,h])=>sha(fs.readFileSync(resolve(root,p)))===h)});
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({output,passed:report.passed,checks:report.checks?.map(c=>({name:c.name,passed:c.passed})),fatal:report.fatal,wallMs:report.wallMs}));if(!report.passed||!report.inputsUnchanged)process.exitCode=1;
}
