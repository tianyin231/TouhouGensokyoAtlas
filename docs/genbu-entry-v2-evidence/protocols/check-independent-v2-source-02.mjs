// One authorized real public chain and one staged production Genbu native build.
// The immutable b9ff V8 files are value references, never live allocation owners.
// No GPU, all-region build, fixture mutation or old-failure rewriting.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from 'node:v8';
import {geometryDigest} from '/workspace/genbu-entry-refinement/tools/check-hakurei.mjs';

const ROOT='/workspace/genbu-entry-refinement',EV='/workspace/genbu-entry-evidence';
const SOURCE='dd991fadfa7ef3339ec0afe26fa10e9dd6ddcc09fcd41536f3501e4e874d3544';
const PROJECT='1e816ddf9d81b8508c210982170442b11f9eaab56b7558a5d0482fb62bec2148';
const PREFIX='b832685d8db4ae0b59ffe3a4eed7e19d4ce4ccde3d506a0e84b0f4a94ba2dee6';
const ORIGINAL='f6a4a51132c512ff3087115e67c5ed1497f51ddde07995eceda55825826ca188';
const OUT=EV+'/independent-v2-source-02.json',DIR=EV+'/independent-v2-source-02-arrays';
const sha=b=>createHash('sha256').update(b).digest('hex');
const arraySHA=a=>a?sha(Buffer.from(a.buffer,a.byteOffset,a.byteLength)):null;
const inputHashes={},evidenceHashes={},start=performance.now();
assert.equal(process.versions.node.split('.')[0],'22');
assert(!fs.existsSync(OUT)&&!fs.existsSync(DIR),'Never overwrite an execution or snapshot');
const read=p=>{const b=fs.readFileSync(ROOT+'/'+p);inputHashes[p]=sha(b);return b;};
const evidence=p=>{const b=fs.readFileSync(EV+'/'+p);evidenceHashes[p]=sha(b);return b;};
const parseEvidence=p=>JSON.parse(evidence(p));
const baseline=parseEvidence('baseline-native-source-v2.json');
const support=parseEvidence('baseline-support.json');
const identities=parseEvidence('baseline-column-identities-v2.json');
const clearance=parseEvidence('baseline-cold-clearance.json');
const catalog=parseEvidence('author-section-plan.json').columns;
const author=parseEvidence('author-prepare-06.json');
const oldNormal=evidence('independent-v1-road-normal.json');
const oldLimited=evidence('independent-v2-same-road-edge.json');
const oldEdge=parseEvidence('independent-v1-road-edge.json');
assert.equal(sha(oldNormal),'e8ee3fc5e754461c4def01c6576e3a1a43dff0fe4dfeb27ac20545a33c495f18');
assert.equal(sha(oldLimited),'e805450a02391e95ebc4f37dae5a2e2a346437d4bfceeacb9b8df3c673c12cc8');
const snapshot=label=>{const s=baseline.snapshots.find(x=>x.label===label),b=fs.readFileSync(s.path);assert.equal(sha(b),s.sha256);evidenceHashes[s.path]=sha(b);return deserialize(b);};
const oldPack=snapshot('public-overview'),oldData=snapshot('manifest'),oldNative=snapshot('genbu-native');
const r={schema:1,kind:'Independent complete frozen Genbu V2 source protection; real production predecessors',
 startUTC:new Date().toISOString(),node:process.version,sourceSHA256:SOURCE,projectSHA256:PROJECT,
 protocolSHA256:sha(fs.readFileSync(import.meta.filename)),scope:[-1024,-584,-912,-480],
 executed:{definitionModules:0,productionOverviewHooks:0,nativeGeneratorCalls:0,nativeApplyDetailCalls:0,
 outerBuildRegionWrapperCalls:0,GPUFrames:0,fullNodeSuites:0,baselineBuilds:0},
 concurrency:'Astra may be running a GPU view concurrently. Wall times are execution records, not performance comparisons.',
 checks:[],passed:true,evidenceHashes,inputHashes,snapshots:[],
 previousAttempt:{reportSHA256:sha(evidence('independent-v2-source.json')),protocolSHA256:sha(evidence('check-independent-v2-source.mjs')),executionSHA256:sha(evidence('independent-v2-source-execution.json')),CLI:1,GenbuHooks:0,nativeGenerators:0,meaning:'Whole manifest compared per-run trailUpgrade.prepareMs; original script/report/CLI remain unchanged.'},
 priorFailures:{V1Normal:{reportSHA256:sha(oldNormal),CLI:1,passed:2,total:3},
 limitedV2:{reportSHA256:sha(oldLimited),CLI:1,passed:3,total:4,extraWholeTerrainGuard:'Scope assumption error; V2 explicitly changed the receiving water bed. Original CLI/report retained.'},
 baselineNativePassage:{reportSHA256:evidenceHashes['baseline-support.json'],CLI:1,triangleColumnPairs:197,columns:13},
 baselineColdPassage:{reportSHA256:evidenceHashes['baseline-cold-clearance.json'],CLI:1,triangleColumnPairs:102,columns:8}}};
const save=()=>fs.writeFileSync(OUT,JSON.stringify(r,null,2)+'\n');
function check(name,fn){try{const result=fn();r.checks.push({name,passed:true,result});save();return result;}
 catch(e){r.passed=false;r.checks.push({name,passed:false,error:e.stack||String(e)});save();return null;}}
function mandatory(name,fn){const v=check(name,fn);if(v===null)throw Error('Required setup failed: '+name);return v;}
function buffers(value,out=new Set(),seen=new Set()){
 if(!value||typeof value!=='object'||seen.has(value))return out;seen.add(value);
 if(ArrayBuffer.isView(value)){out.add(value.buffer);return out;}
 if(value.constructor?.name==='ArrayBuffer'){out.add(value);return out;}
 if(value.constructor?.name==='Map'){for(const[k,v]of value){buffers(k,out,seen);buffers(v,out,seen);}}
 else if(value.constructor?.name==='Set'){for(const v of value)buffers(v,out,seen);}
 else for(const v of Object.values(value))buffers(v,out,seen);return out;
}
const bytes=o=>[...buffers(o)].reduce((s,b)=>s+b.byteLength,0);
function plain(o){if(ArrayBuffer.isView(o))return{type:o.constructor.name,length:o.length,sha256:arraySHA(o)};
 if(Array.isArray(o))return o.map(plain);if(o&&typeof o==='object')return Object.fromEntries(Object.keys(o).sort().map(k=>[k,plain(o[k])]));return o;}
const signature=o=>JSON.stringify(plain(o)),triCount=m=>(m.index?.length??m.vertices.length/9)/3;
const face=(m,i)=>[0,1,2].map(k=>{const j=(m.index?m.index[i*3+k]:i*3+k)*9;return Array.from(m.vertices.subarray(j,j+9));});
const faceKey=ps=>sha(Buffer.from(Float32Array.from(ps.flat()).buffer));
const recordMap=p=>new Map(p.meshes.map(m=>[m.id,m]));
const inside=(x,z)=>x>-1024&&x<-912&&z>-584&&z<-480;
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),sub=(a,b)=>a.map((v,i)=>v-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
// Match the already accepted shared math primitive's Float32 rounding.
const normalize=a=>{const inverse=1/(Math.hypot(...a)||1);return a.map(v=>v*inverse);};
const nearIDs=['island:terrain:-1024:-768','island:terrain:-1024:-512'];
const terrainIDs=nearIDs.flatMap(id=>[id,id+':far']);
const publicRock='overview016:genbu|basalt|architecture|S',publicMoss='overview016:genbu|mossRock|architecture|S';
const publicWater='overview016:genbu|genbuFlow|water|S';
const nativeRock='genbu:basalt:columnar-cliffs',nativeMoss='genbu:mossRock:wet-ledge-moss',nativeWater='genbu:flowing-creek';
const roadIDs=['island:routes:connections:-2:-1','island:routes:connections:-2:-1:shoulder',
 'island:routes:connections:-2:-2','island:routes:connections:-2:-2:shoulder',
 'island:routes:genbu:-2:-2','island:routes:genbu:-2:-2:shoulder'];
const plantIDs=['island:transition:shrub:-2:-1','island:transition:grass:-2:-1','island:transition:grass:-2:-2'];
const allowedPublic=new Set([...terrainIDs,publicRock,publicMoss,publicWater,...roadIDs,...plantIDs]);
function interpolate(ps,x,z){
 const[a,b,c]=ps,d=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]);
 if(Math.abs(d)<1e-10)return null;
 const u=((b[2]-c[2])*(x-c[0])+(c[0]-b[0])*(z-c[2]))/d;
 const v=((c[2]-a[2])*(x-c[0])+(a[0]-c[0])*(z-c[2]))/d,w=1-u-v;
 if(Math.min(u,v,w)<-1e-7)return null;
 return ps[0].map((_,k)=>u*a[k]+v*b[k]+w*c[k]);
}
function surface(ms){
 const bins=new Map();
 for(const m of ms)for(let i=0;i<triCount(m);i++){
  const ps=face(m,i),xs=ps.map(p=>p[0]),zs=ps.map(p=>p[2]);
  if(Math.max(...xs)<-1040||Math.min(...xs)>-896||Math.max(...zs)<-600||Math.min(...zs)>-464)continue;
  const q={id:m.id,ordinal:i,ps};
  for(let x=Math.floor(Math.min(...xs)/8);x<=Math.floor(Math.max(...xs)/8);x++)
   for(let z=Math.floor(Math.min(...zs)/8);z<=Math.floor(Math.max(...zs)/8);z++){
    const k=x+','+z;if(!bins.has(k))bins.set(k,[]);bins.get(k).push(q);
   }
 }
 const all=(x,z)=>(bins.get(Math.floor(x/8)+','+Math.floor(z/8))||[]).flatMap(q=>{
  const a=interpolate(q.ps,x,z);return a===null?[]:[{...q,a}];});
 const fn=(x,z)=>all(x,z)[0]?.a??null;fn.all=all;return fn;
}
function actualSourceSheets(p,far){
 return p.meshes.filter(m=>m.component==='island-terrain'&&!m.cutOnly&&
  !!(m.globalFar||m.id.endsWith(':far'))===far);
}
function positionSurface(a){
 const fake={id:'contact',vertices:new Float32Array(a.length*3)};
 for(let i=0;i<a.length/3;i++)fake.vertices.set(a.subarray(i*3,i*3+3),i*9);
 return surface([fake]);
}
const saveSnapshot=(label,value)=>{fs.mkdirSync(DIR,{recursive:true});const b=serialize(value),p=DIR+'/'+label+'.v8';
 fs.writeFileSync(p,b,{flag:'wx'});r.snapshots.push({label,path:p,bytes:b.length,sha256:sha(b),
 meaning:'Private complete value snapshot. Live ownership was measured before V8 serialization; not a production memory estimate.'});save();};
let G,U,data,pack,native,pm,nm,publicNewBuffers=[],nativeNewBuffers=[];
try{
 mandatory('Frozen source/project and all 208 accepted inputs except the reviewed registration',()=>{
  assert.equal(sha(read('src/genbu-entry.js')),SOURCE);assert.equal(sha(read('project.json')),PROJECT);
  assert.equal(author.sourceSHA,SOURCE);assert.equal(author.projectSHA,PROJECT);assert(baseline.passed);
  for(const[p,h]of Object.entries(baseline.inputsBefore))if(p!=='project.json')assert.equal(sha(read(p)),h,'Accepted input changed '+p);
  return{acceptedInputs:208,acceptedRuntimeInputsExactExceptProject:true,newSource:SOURCE,fixturesUnmodified:true};
 });
 const project=JSON.parse(read('project.json'));
 mandatory('Actual fixed 48 accepted definitions plus only the reviewed Genbu successor',()=>{
  assert.equal(project.worldBuilders.length,49);assert.equal(project.worldBuilders[48],'src/genbu-entry.js');
  assert.equal(sha(JSON.stringify(project.worldBuilders.slice(0,48))),PREFIX);
  return{prefixModules:48,prefixSHA256:PREFIX,successor:'src/genbu-entry.js'};
 });
 const context=vm.createContext({performance,TextDecoder,TextEncoder});
 for(const p of project.worldBuilders.slice(0,48)){vm.runInContext(String(read(p)),context,{filename:p});r.executed.definitionModules++;}
 G=context.GA;const acceptedHeight=G.Terrain.prototype.height,acceptedWater=G.Terrain.prototype.water,acceptedBuilder=G.buildRegion;
 const hookCount=G.extraOverviewBuilders.length;assert.equal(hookCount,20);
 vm.runInContext(String(read('src/genbu-entry.js')),context,{filename:'src/genbu-entry.js'});r.executed.definitionModules++;
 U=G.GENBU_ENTRY;
 mandatory('Production function chain identity and nonempty accepted Solar/Muen/Flower modules',()=>{
  assert.equal(U.previousHeight,acceptedHeight);assert.equal(U.previousWater,acceptedWater);assert.equal(U.originalBuildRegion,acceptedBuilder);
  assert.equal(G.extraOverviewBuilders.length,21);assert.equal(G.extraOverviewBuilders[20],U.prepare);
  assert(G.SUNFLOWER_ENTRY&&G.MUENZUKA_EDGE&&G.FLOWER_HILL_ENTRY);assert.equal(U.revision,2);
  assert.equal(JSON.stringify(U.scope),JSON.stringify(r.scope));
  return{acceptedHooks:20,GenbuHookIndex:20,previousFunctionsExact:true};
 });
 const atlas=JSON.parse(read('data/atlas.json')),locations=new Map(atlas.locations.map(l=>[l.id,l]));
 for(const p of ['data/lunar.json','data/makai.json','data/netherworld.json','data/heaven.json','data/higan.json','data/animal.json','data/backdoor.json','data/kasen.json','data/current-hell.json','data/rainbow-mine.json','data/highland.json',...(project.extensionData||[])]){
  const a=JSON.parse(read(p));for(const patch of a.locationUpdates){const l=locations.get(patch.id);assert(l);
   for(const[k,v]of Object.entries(patch))if(k==='aliases'||k==='source_ids')l[k]=[...new Set([...(l[k]||[]),...v])];else if(k!=='id')l[k]=v;}
  atlas.sources.push(...a.sources);for(const x of a.verifiedLocationCorrections||[]){const l=locations.get(x.id);
   for(const[k,v]of Object.entries(x.expected))assert.equal(JSON.stringify(l[k]),JSON.stringify(v));Object.assign(l,x.replace);}
 }
 context.inputAtlas=JSON.stringify(atlas);data=vm.runInContext('JSON.parse(inputAtlas)',context);
 const raw=gunzipSync(read('assets/packs/overview.pack.gz'));
 pack=G.decodePack(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength));
 const prepStart=performance.now();
 pack.meshes.push(...G.buildKishinjouOverview().meshes);
 for(const build of[G.buildLunarOverviews,G.buildMakaiOverviews])for(const p of build())pack.meshes.push(...p.meshes);
 pack.meshes.push(...G.buildNetherworldOverview().meshes);
 for(const build of[G.buildHeavenOverviews,G.buildHiganOverviews,G.buildAnimalOverviews])for(const p of build())pack.meshes.push(...p.meshes);
 pack.meshes.push(...G.buildBackdoorOverview().meshes,...G.buildKasenOverview().meshes);
 for(const p of G.buildCurrentHellOverviews())pack.meshes.push(...p.meshes);
 pack.meshes.push(...G.buildRainbowMineOverview().meshes);
 G.LANDSCAPE.apply(pack,new G.Terrain(data));const t0=new G.Terrain(data);
 G.applyHighlandGround(pack,t0);pack.meshes.push(...G.highlandGround(t0,pack),...G.buildHighland(t0,true).meshes);
 const hookLog=[];
 for(let i=0;i<20;i++){const t=performance.now(),add=G.extraOverviewBuilders[i](data,pack);pack.meshes.push(...add);
  r.executed.productionOverviewHooks++;hookLog.push({index:i,wallMs:performance.now()-t,addedRecords:add.length});}
 r.productionPreparation={wallMs:performance.now()-prepStart,hooks:hookLog};
 mandatory('All actual accepted predecessor records match the immutable b9ff production snapshot',()=>{
  assert.equal(pack.meshes.length,2156);assert.equal(pack.meshes.length,oldPack.meshes.length);
  for(let i=0;i<pack.meshes.length;i++)assert.equal(signature(pack.meshes[i]),signature(oldPack.meshes[i]),'Predecessor record changed '+i+'/'+pack.meshes[i].id);
  const oldManifest=plain(oldData),newManifest=plain(data);
  const oldPrepareMs=oldManifest.trailUpgrade.prepareMs,newPrepareMs=newManifest.trailUpgrade.prepareMs;
  assert(Number.isFinite(oldPrepareMs)&&oldPrepareMs>=0&&Number.isFinite(newPrepareMs)&&newPrepareMs>=0);
  // This one accepted hook's wall-clock observation necessarily differs by execution.
  // Preserve and report both values; all of its source/provenance fields remain exact.
  const telemetry={path:'trailUpgrade.prepareMs',baseline:oldPrepareMs,current:newPrepareMs,
   source:'src/trail-upgrade.js (unchanged accepted input)',meaning:'Execution wall-clock telemetry, not source/protection state'};
  newManifest.trailUpgrade.prepareMs=oldPrepareMs;
  assert.equal(sha(JSON.stringify(newManifest)),sha(JSON.stringify(oldManifest)),'Persistent manifest changed outside its single declared timing field');
  r.predecessorTelemetry=telemetry;
  assert.equal(bytes(pack),baseline.productionPreparation.liveRecursiveBackingBytes);
  assert(G.SUNFLOWER_ENTRY.metadata.has(pack)&&G.FLOWER_HILL_ENTRY.metadata.has(pack));
  const m=G.MUENZUKA_EDGE.metadata(pack);assert(m&&m.cold.length===2);
  assert.equal(m.cold.reduce((s,q)=>s+q.trees,0),10);assert.equal(m.nativeTrees,25);
  assert.equal(data.sunflowerEntry.contact.byteLength,225144);
  assert.equal(data.flowerHillEntry.contact.byteLength,118728);assert.equal(data.flowerHillEntry.originalContact.byteLength,118728);
  return{records:2156,allRecordFieldsAndTypedBytesExact:true,persistentManifestExact:true,oneExplicitWallClockFieldReported:true,liveSourceBytes:bytes(pack),
   nonemptyAcceptedMuenColdRecords:2,nonemptyAcceptedMuenColdTrees:10,acceptedMuenNativeTrees:25};
 });
 const predecessorContacts=[data.sunflowerEntry.contact,data.flowerHillEntry.contact,data.flowerHillEntry.originalContact];
 const predecessorContactHashes=predecessorContacts.map(arraySHA),oldPublicSignatures=pack.meshes.map(signature);
 const publicBefore=buffers({pack,data,metadata:[G.SUNFLOWER_ENTRY.metadata.get(pack),G.FLOWER_HILL_ENTRY.metadata.get(pack),G.MUENZUKA_EDGE.metadata(pack)]});
 const oldRouteJSON=signature(G.ISLAND.allRoutes),oldGenbuPathJSON=signature(G.WEST.gpaths);
 const prepGenbu=performance.now();
 mandatory('One actual Genbu production public hook succeeds without substituting the prior chain',()=>{
  const add=G.extraOverviewBuilders[20](data,pack);pack.meshes.push(...add);r.executed.productionOverviewHooks++;
  assert.equal(add.length,0);pm=U.metadata.get(pack);assert(pm);
  return{wallMs:performance.now()-prepGenbu,publicRecords:pack.meshes.length,metadata:plain(pm)};
 });
 publicNewBuffers=[...buffers({pack,data,metadata:pm})].filter(b=>!publicBefore.has(b));
 check('All public IDs/order/materials/owners/LOD and every non-target source remain exact',()=>{
  assert.equal(pack.meshes.length,oldPack.meshes.length);const changes=[];let protectedRecords=0;
  for(let i=0;i<pack.meshes.length;i++){const a=oldPack.meshes[i],b=pack.meshes[i];assert.equal(a.id,b.id);
   if(oldPublicSignatures[i]===signature(b)){protectedRecords++;continue;}assert(allowedPublic.has(a.id),'Unexpected changed public record '+a.id);
   for(const k of new Set([...Object.keys(a),...Object.keys(b)]))if(!['vertices','index','instances','center','radius'].includes(k))assert.equal(signature(b[k]),signature(a[k]),'Record identity/property '+a.id+'/'+k);
   changes.push(a.id);
  }
  assert.equal(changes.length,16);return{protectedRecords,changedRecords:changes,newRecords:0,newTextures:0};
 });
 check('All predecessor contacts retain exact references and bytes; previous functions remain active outside scope',()=>{
  const current=[data.sunflowerEntry.contact,data.flowerHillEntry.contact,data.flowerHillEntry.originalContact];
  current.forEach((a,i)=>{assert.equal(a,predecessorContacts[i]);assert.equal(arraySHA(a),predecessorContactHashes[i]);});
  const t=new G.Terrain(data);let samples=0;
  for(const[x,z]of [[-800,1000],[-511,1037],[-1150,1150],[-928,1100],[-1251,987],[300,900],[300,378]])
   {assert.equal(t.height(x,z),U.previousHeight.call(t,x,z));samples++;}
  for(let x=-1040;x<=-896;x+=2)for(let z=-600;z<=-464;z+=2)if(!inside(x,z)){assert.equal(t.height(x,z),U.previousHeight.call(t,x,z));samples++;}
  return{contactBytes:current.map(a=>a.byteLength),contactSHA256:predecessorContactHashes,outsideQuerySamples:samples,referencesExact:true};
 });
 const oldGroundNear=surface(actualSourceSheets(oldPack,false)),oldGroundFar=surface(actualSourceSheets(oldPack,true));
 const newGroundNear=surface(actualSourceSheets(pack,false)),newGroundFar=surface(actualSourceSheets(pack,true));
 const contact=positionSurface(data.genbuEntry.contact),originalContact=positionSurface(data.genbuEntry.originalContact);
 check('True exterior surfaces and retained outside faces preserve original near/far source attributes',()=>{
  let nearMax=0,farMax=0,probes=0,exactFaces=0;
  for(let x=-1040;x<=-896;x+=2)for(let z=-600;z<=-464;z+=2){if(inside(x,z))continue;
   const a=oldGroundNear(x,z),b=newGroundNear(x,z),f=oldGroundFar(x,z),g=newGroundFar(x,z);assert(a&&b&&f&&g,'Missing exterior face '+x+','+z);
   nearMax=Math.max(nearMax,Math.abs(a[1]-b[1]));farMax=Math.max(farMax,Math.abs(f[1]-g[1]));probes++;
  }
  assert(nearMax<.00002,'Exterior near change '+nearMax);assert(farMax<.00002,'Exterior far change '+farMax);
  const now=recordMap(pack),before=recordMap(oldPack);
  for(const id of terrainIDs){const m=now.get(id),old=before.get(id),keys=new Set(Array.from({length:triCount(m)},(_,i)=>faceKey(face(m,i))));
   for(let i=0;i<triCount(old);i++){const ps=face(old,i),xs=ps.map(p=>p[0]),zs=ps.map(p=>p[2]);
    // Full faces separated by one original far cell from the allowed ROI must be literally retained.
    if(Math.max(...xs)<-1056||Math.min(...xs)>-880||Math.max(...zs)<-616||Math.min(...zs)>-448){
     assert(keys.has(faceKey(ps)),'Protected exterior original attribute triangle lost '+id+'/'+i);exactFaces++;
    }
   }
  }
  assert(exactFaces>1000);return{probes,maximumNearChange:nearMax,maximumFarChange:farMax,fullAttributeOutsideTrianglesExact:exactFaces,numericalAllowance:'Existing 20 micrometre F32 plane comparison; retained separated triangles require exact bytes.'};
 });
 check('Actual contact/query and old LOD residual are independently preserved over the full ROI',()=>{
  const t=new G.Terrain(data);let samples=0,contactError=0,oldContactError=0,queryResidualError=0,lodResidualError=0,oldQueryResidualMax=0,oldLODResidualMax=0;
  for(let x=-1024;x<=-912;x+=2)for(let z=-584;z<=-480;z+=2){
   const n=newGroundNear(x,z),o=oldGroundNear(x,z),f=newGroundFar(x,z),of=oldGroundFar(x,z),c=contact(x,z),oc=originalContact(x,z);assert(n&&o&&f&&of&&c&&oc,'ROI face/contact missing '+x+','+z);
   contactError=Math.max(contactError,Math.abs(c[1]-n[1]));oldContactError=Math.max(oldContactError,Math.abs(oc[1]-o[1]));
   const oldQuery=U.previousHeight.call(t,x,z),newQuery=t.height(x,z);
   queryResidualError=Math.max(queryResidualError,Math.abs((newQuery-n[1])-(oldQuery-o[1])));
   lodResidualError=Math.max(lodResidualError,Math.abs((f[1]-n[1])-(of[1]-o[1])));
   oldQueryResidualMax=Math.max(oldQueryResidualMax,Math.abs(oldQuery-o[1]));oldLODResidualMax=Math.max(oldLODResidualMax,Math.abs(of[1]-o[1]));samples++;
  }
  assert(contactError<.00002);assert(oldContactError<.00002);assert(queryResidualError<.00002);assert(lodResidualError<.00003,'New LOD residual '+lodResidualError);
  return{samples,contactError,oldContactError,queryResidualError,lodResidualError,oldQueryResidualMax,oldLODResidualMax,
   contract:'Retain old query-near and far-near offsets; neither is asserted to be zero.'};
 });
 check('Both near/far sides of real tile and outer edges remain continuous relative to original edges',()=>{
  let points=0,maxNewNearSpread=0,maxNewFarSpread=0,maxAddedNearSpread=0,maxAddedFarSpread=0;
  const ps=[];
  for(let x=-1024;x<=-912;x+=.5)ps.push([x,-512],[x,-584],[x,-480]);
  for(let z=-584;z<=-480;z+=.5)ps.push([-1024,z],[-912,z]);
  for(const[x,z]of ps){const spread=fn=>{const a=fn.all(x,z);assert(a.length,'Missing seam '+x+','+z);return Math.max(...a.map(q=>q.a[1]))-Math.min(...a.map(q=>q.a[1]));};
   const n=spread(newGroundNear),o=spread(oldGroundNear),f=spread(newGroundFar),of=spread(oldGroundFar);
   maxNewNearSpread=Math.max(maxNewNearSpread,n);maxNewFarSpread=Math.max(maxNewFarSpread,f);
   maxAddedNearSpread=Math.max(maxAddedNearSpread,n-o);maxAddedFarSpread=Math.max(maxAddedFarSpread,f-of);points++;
  }
  assert(maxAddedNearSpread<.00002,'Added near seam spread '+maxAddedNearSpread);
  assert(maxAddedFarSpread<.00003,'Added far seam spread '+maxAddedFarSpread);
  return{points,maxNewNearSpread,maxNewFarSpread,maxAddedNearSpread,maxAddedFarSpread};
 });
 check('Every public plant keeps identity/prototypes/color/XY and all 15 non-Y matrix fields',()=>{
  let matrices=0,moved=0,trees=0,coldTrees=0;const details=[];
  const old=recordMap(oldPack),expectedCounts=[1,4,4];
  for(const m of pack.meshes.filter(m=>m.instances)){const a=old.get(m.id);assert(a?.instances);assert.equal(m.instances.length,a.instances.length);
   assert.equal(arraySHA(m.vertices),arraySHA(a.vertices));assert.equal(arraySHA(m.farVertices),arraySHA(a.farVertices));assert.equal(arraySHA(m.instanceColors),arraySHA(a.instanceColors));
   let recordMoved=0;for(let j=0;j<m.instances.length;j+=16){for(let k=0;k<16;k++)if(k!==13)assert.equal(m.instances[j+k],a.instances[j+k],m.id+'/'+j/16+'/'+k);
    const dy=m.instances[j+13]-a.instances[j+13];if(dy!==0){assert(plantIDs.includes(m.id),'Unlisted plant moved '+m.id);
     const x=a.instances[j+12],z=a.instances[j+14];assert(inside(x,z));const c=contact(x,z),o=originalContact(x,z);assert(c&&o);
     assert.equal(m.instances[j+13],Math.fround(a.instances[j+13]+c[1]-o[1]));details.push({recordId:m.id,index:j/16,oldY:a.instances[j+13],newY:m.instances[j+13],deltaY:dy});recordMoved++;moved++;
    }matrices++;
   }
   if(plantIDs.includes(m.id))assert.equal(recordMoved,expectedCounts[plantIDs.indexOf(m.id)]);else assert.equal(arraySHA(m.instances),arraySHA(a.instances));
   if(m.material==='forestLeaf')trees+=m.instances.length/16;
   if(m.id.startsWith('overview016:genbu|')&&m.material==='timber'&&m.instances)coldTrees+=m.instances.length/16;
  }
  assert.equal(moved,9);assert.equal(coldTrees,17);return{instanceMatrices:matrices,movedSmallPlants:moved,exactColdTreeInstances:17,publicForestLeafInstances:trees,details,nonYFieldsExact:true};
 });
 const nt=performance.now();r.executed.nativeGeneratorCalls=1;save();
 native=await U.originalBuildRegion({...data,genbuEntry:undefined},'genbu');
 mandatory('One actual native generator agrees with the frozen baseline before the real candidate transform',()=>{
  assert.equal(geometryDigest(native),ORIGINAL);assert.equal(native.meshes.length,32);assert.equal(native.meta.columns,144);assert.equal(native.meta.trees,39);
  assert.equal(bytes(native),6278784);assert.equal(native.bytes,6278784);
  native.meshes.forEach((m,i)=>assert.equal(signature(m),signature(oldNative.meshes[i]),'Original native source '+m.id));
  assert.equal(signature(native.meta),signature(oldNative.meta));
  return{generatorCalls:1,wallMs:performance.now()-nt,geometrySHA256:ORIGINAL,liveNativeBytes:6278784,records:32,columns:144,trees:39};
 });
 const nativeBefore=buffers(native);const transformStart=performance.now();
 mandatory('Actual same-pack production applyDetail succeeds once without regenerating geometry',()=>{
  U.applyDetail(data,native);r.executed.nativeApplyDetailCalls++;nm=U.nativeMetadata.get(native);assert(nm);
  return{wallMs:performance.now()-transformStart,records:native.meshes.length,metadata:plain(nm)};
 });
 nativeNewBuffers=[...buffers({native,metadata:nm})].filter(b=>!nativeBefore.has(b));
 function verifyColumns(kind,old,newPack,rockID,mossID,changes){
  const om=recordMap(old),nm=recordMap(newPack),rock=nm.get(rockID),moss=nm.get(mossID),oldRock=om.get(rockID),oldMoss=om.get(mossID);
  const expected=author.checks.find(c=>c.name===(kind==='native'?'Candidate native transform without rebuilding original native geometry':'Candidate public prepare')).result[kind==='native'?'columns':'coldColumns'];
  const ordinals=kind==='native'?[22,23,24,25,26,48,49,50,51,52,53,72,73,74,75,76,77,78,79,80,97,98,99,100,101,117,118,119,120,121,122,138,139,140,141,142,143]:[15,16,17,32,33,34,35,47,48,49,60,61,62,63];
  assert.equal(JSON.stringify(changes.map(q=>q.ordinal)),JSON.stringify(ordinals));
  assert.equal(arraySHA(rock.index),arraySHA(oldRock.index));assert.equal(arraySHA(moss.index),arraySHA(oldMoss.index));
  assert.equal(rock.vertices.length,oldRock.vertices.length);assert.equal(moss.vertices.length,oldMoss.vertices.length);
  const expectedRock=new Float32Array(oldRock.vertices),expectedMoss=new Float32Array(oldMoss.vertices),writtenRock=new Set(),writtenMoss=new Set(),summary=[];
  for(const q of changes){const c=catalog[kind][q.ordinal],target=expected.find(p=>p.ordinal===q.ordinal);assert(c&&target);assert.equal(q.id,c.id);assert.equal(q.oldHeight,c.height);assert.equal(q.height,target.height);
   assert.equal(signature(q.center),signature([c.x,c.base,c.z]));assert(q.height>0&&q.height<=c.height);
   const faces=Array.from({length:c.triangleCount},(_,i)=>c.triangleStart+i);
   assert.equal(signature(q.faces),signature(faces),'Actual column identity '+q.id);
   const capFaces=c.moss?Array.from({length:42},(_,i)=>c.mossTriangleStart+i):[];
   assert.equal(signature(q.capFaces),signature(capFaces),'Actual cap identity '+q.id);
   const rv=new Set(faces.flatMap(f=>[0,1,2].map(k=>oldRock.index?oldRock.index[f*3+k]:f*3+k)));
   const mv=new Set(capFaces.flatMap(f=>[0,1,2].map(k=>oldMoss.index?oldMoss.index[f*3+k]:f*3+k)));
   const ratio=q.height/c.height;
   for(const v of rv){assert(!writtenRock.has(v));writtenRock.add(v);const at=v*9,p=Array.from(oldRock.vertices.subarray(at,at+9));
    if(p[1]!==Math.fround(c.base))expectedRock[at+1]=c.base+(p[1]-c.base)*ratio;
    const n=normalize([p[3],p[4]/ratio,p[5]]);for(let k=0;k<3;k++)expectedRock[at+3+k]=n[k];
   }
   for(const v of mv){assert(!writtenMoss.has(v));writtenMoss.add(v);expectedMoss[v*9+1]+=q.height-c.height;}
   summary.push({ordinal:q.ordinal,id:q.id,oldHeight:c.height,height:q.height,bodyFaceStart:c.triangleStart,bodyFaces:c.triangleCount,capFaces:capFaces.length,bodyVertices:rv.size,capVertices:mv.size});
  }
  assert.equal(arraySHA(rock.vertices),arraySHA(expectedRock),'Complete actual body transform and all retained attributes '+kind);
  assert.equal(arraySHA(moss.vertices),arraySHA(expectedMoss),'Complete actual cap transform and all retained attributes '+kind);
  for(const[m,set,selected]of[[oldRock,writtenRock,new Set(changes.flatMap(q=>q.faces))],[oldMoss,writtenMoss,new Set(changes.flatMap(q=>q.capFaces))]])
   for(let f=0;f<triCount(m);f++)if(!selected.has(f))for(let k=0;k<3;k++)assert(!set.has(m.index?m.index[f*3+k]:f*3+k),'Written vertex shared with retained true face');
  return{columns:changes.length,bodyWrittenVertices:writtenRock.size,capWrittenVertices:writtenMoss.size,completeOtherAttributesAndFacesExact:true,columnsAndCaps:summary};
 }
 check('37 actual native column/joint/cap identities and every retained source byte are exact',()=>verifyColumns('native',oldNative,native,nativeRock,nativeMoss,nm.columns));
 check('14 independent cold indexed column/cap identities and the retained mixed cave source are exact',()=>verifyColumns('coarse',oldPack,pack,publicRock,publicMoss,pm.coldColumns));
 check('All other 29 native records, 39 tree transforms/prototypes/colors and retained architecture stay exact',()=>{
  const changed=new Set([nativeRock,nativeMoss,nativeWater]);let records=0,trees=0;
  native.meshes.forEach((m,i)=>{const a=oldNative.meshes[i];assert.equal(a.id,m.id);
   if(!changed.has(m.id)){assert.equal(signature(m),signature(a));records++;}
   else for(const k of new Set([...Object.keys(a),...Object.keys(m)]))if(!['vertices','index','center','radius'].includes(k))assert.equal(signature(m[k]),signature(a[k]));
   if(m.instances&&m.material==='timber')trees+=m.instances.length/16;
  });
  assert.equal(records,29);assert.equal(trees,39);
  const expected=JSON.parse(JSON.stringify(oldNative.meta));for(const q of nm.columns)expected.columnRecords[q.ordinal][3]=q.height;
  const actual={...native.meta};delete actual.genbuEntry;assert.equal(signature(actual),signature(expected));
  return{protectedRecords:29,nativeTreeInstances:39,nativeMetaChangedOnlyDeclaredColumnHeights:true};
 });
 check('Original 13 native and 8 cold passage conflict bodies/caps now end below unchanged actual board undersides',()=>{
  const details=[];let minimumGap=Infinity;
  for(const[k,limits,p,rockID,mossID,changes]of[['native',clearance.nativeColumnRequiredLimits,native,nativeRock,nativeMoss,nm.columns],
   ['coarse',clearance.coldColumnRequiredLimits,pack,publicRock,publicMoss,pm.coldColumns]]){
   const map=recordMap(p),rock=map.get(rockID),moss=map.get(mossID);
   for(const l of limits){const q=changes.find(q=>q.ordinal===l.index);assert(q);
    const ys=q.faces.flatMap(f=>face(rock,f).map(p=>p[1])).concat(q.capFaces.flatMap(f=>face(moss,f).map(p=>p[1])));
    const actualTop=Math.max(...ys),gap=l.minimumActualWoodBottomY-actualTop;assert(gap>0,'Actual body/cap still intrudes '+l.id);
    minimumGap=Math.min(minimumGap,gap);details.push({kind:k,id:l.id,actualTop,actualBoardBottom:l.minimumActualWoodBottomY,gap,originalConflictPairs:l.pairs});
   }
  }
  assert.equal(details.length,21);return{nativeColumns:13,coldColumns:8,minimumActualVerticalGap:minimumGap,
   strictCondition:'Body/joint/cap top below actual unchanged full wood underside. No relaxed overlap threshold.',details};
 });
 check('All real bounded wood deck faces and both complete public-to-native front corners stay exact',()=>{
  const oldMap=recordMap(oldNative),map=recordMap(native),timber=map.get('genbu:timber:bank-boardwalk'),oldTimber=oldMap.get(timber.id);
  const cold=recordMap(pack).get('overview016:genbu|timber|architecture|S'),oldCold=recordMap(oldPack).get(cold.id);
  let faces=0;for(const d of support.deckSourceMap)for(const f of d.allOrdinals){assert.equal(faceKey(face(timber,f)),faceKey(face(oldTimber,f)));faces++;}
  for(const d of clearance.coldDeckSourceMap)for(const f of d.allOrdinals)assert.equal(faceKey(face(cold,f)),faceKey(face(oldCold,f)));
  const d=support.deckSourceMap.find(d=>d.kind==='genbu-bank-path'&&d.segment===0&&d.plankDistance===0);assert(d);
  const begin=G.WEST.gpaths[0].samples[0],next=G.WEST.gpaths[0].samples[1],dir=normalize([next[0]-begin[0],0,next[1]-begin[1]]);
  const corners=[...new Map(d.topOrdinals.flatMap(f=>face(timber,f)).filter(p=>(p[0]-begin[0])*dir[0]+(p[2]-begin[1])*dir[2]<0)
   .map(p=>[p.slice(0,3).join(','),p.slice(0,3)])).values()];assert.equal(corners.length,2);
  const road=pack.meshes.filter(m=>roadIDs.includes(m.id)&&!m.id.endsWith(':shoulder'));
  const distances=corners.map(p=>{let best=Infinity;for(const m of road)for(let i=0;i<m.vertices.length;i+=9)best=Math.min(best,Math.hypot(p[0]-m.vertices[i],p[1]-m.vertices[i+1],p[2]-m.vertices[i+2]));return best;});
  assert(distances.every(d=>d<.0001));assert.equal(signature(G.ISLAND.allRoutes),oldRouteJSON);assert.equal(signature(G.WEST.gpaths),oldGenbuPathJSON);
  return{nativePlanks:support.deckSourceMap.length,fullNativeFacesExact:faces,fullColdFacesExact:faces,completeFrontCorners:corners,distances,allOriginalRouteCenterlinesExact:true};
 });
 check('Only six exact public road records change; original indices, authorized endpoints and real normals remain sound',()=>{
  const old=recordMap(oldPack),map=recordMap(pack),t=new G.Terrain(data);
  const base=(x,z)=>U.previousHeight.call(t,x,z),plan=U.roadPlan(base,(x,z)=>t.height(x,z));
  let vertices=0,affectedFaces=0,minimumDot=Infinity,maxRoadNearGap=-Infinity,minimumRoadNearGap=Infinity;const changes=[];
  for(const id of roadIDs){const a=old.get(id),m=map.get(id);assert(a&&m);assert.equal(arraySHA(m.index),arraySHA(a.index));assert.equal(m.vertices.length,a.vertices.length);
   const changed=new Set();for(let v=0;v<m.vertices.length/9;v++){
    const p=Array.from(a.vertices.subarray(v*9,v*9+9)),q=Array.from(m.vertices.subarray(v*9,v*9+9));
    if(faceKey([p])===faceKey([q]))continue;const allowed=plan.changes.get(p.slice(0,3).map(Math.fround).join(','));assert(allowed,'Unauthorized road source vertex '+id+'/'+v);
    assert.equal(signature(q.slice(0,3)),signature(Array.from(allowed.position)));
    if(!id.endsWith(':shoulder'))assert.equal(signature(q.slice(6)),signature(p.slice(6)));
    const n=newGroundNear(q[0],q[2]);assert(n,'Missing actual support under road '+id+'/'+v);
    maxRoadNearGap=Math.max(maxRoadNearGap,q[1]-n[1]);minimumRoadNearGap=Math.min(minimumRoadNearGap,q[1]-n[1]);
    changed.add(v);vertices++;
   }
   for(let f=0;f<triCount(m);f++){const ids=[0,1,2].map(k=>m.index?m.index[f*3+k]:f*3+k);if(!ids.some(v=>changed.has(v)))continue;
    const ps=face(m,f),gn=normalize(cross(sub(ps[1],ps[0]),sub(ps[2],ps[0]))),dots=ps.map(p=>dot(gn,p.slice(3,6)));
    assert(dots.every(d=>d>0),'New/mixed road face normal reverses '+id+'/'+f);minimumDot=Math.min(minimumDot,...dots);affectedFaces++;
   }changes.push({id,changedVertices:changed.size});
  }
  assert.equal(vertices,189);assert(affectedFaces>22);return{changes,changedVertices:vertices,actualAffectedFaces:affectedFaces,minimumNormalDotActualWinding:minimumDot,maxRoadNearGap,minimumRoadNearGap,
   note:'The planned terminal edge rotates/narrows to meet the unchanged first board; route centerline XY stays exact. Support gaps are measurements, not inferred cracks.'};
 });
 check('All true old root footprints retain support and query offsets; no cap-root assumption replaces geometry',()=>{
  const t=new G.Terrain(data);let probes=0,inBoundaryBox=0,maxNearDelta=0,maxFarDelta=0,maxQueryDelta=0,maxOldRootNearOffset=0;
  for(const q of support.actualNativeTrees){assert.equal(signature(Array.from(recordMap(native).get(q.recordId).instances.subarray(q.instanceIndex*16,q.instanceIndex*16+16))),signature(q.matrix));
   maxOldRootNearOffset=Math.max(maxOldRootNearOffset,...q.nearAtRoot.map(p=>Math.abs(q.root[1]-p.y)));
   for(const v of q.variants)for(const p of v.terrainSamples){const[x,z]=p.xz;
    maxQueryDelta=Math.max(maxQueryDelta,Math.abs(t.height(x,z)-p.query));probes++;
    if(x<-1040||x>-896||z<-600||z>-464)continue;
    const n=newGroundNear(x,z),o=oldGroundNear(x,z),f=newGroundFar(x,z),of=oldGroundFar(x,z);assert(n&&o&&f&&of);
    maxNearDelta=Math.max(maxNearDelta,Math.abs(n[1]-o[1]));maxFarDelta=Math.max(maxFarDelta,Math.abs(f[1]-of[1]));inBoundaryBox++;
   }
  }
  assert.equal(inBoundaryBox,502);assert(maxNearDelta<.00002);assert(maxFarDelta<.00003);assert(maxQueryDelta<.00002);
  return{trees:39,nearAndFarFootprintQueryProbes:probes,boundedActualFootprintSamples:inBoundaryBox,maxNearDelta,maxFarDelta,maxQueryDelta,maxOldRootNearOffset,
   contract:'All original trunk/root transforms remain exact. Existing root-near offsets are retained, not reported as zero.'};
 });
 check('Native and independent cold water retain all upstream attributes and share the same actual new tail',()=>{
  const details=[];const waterTriangles=data.genbuEntry.waterContact.length/9;assert.equal(waterTriangles,112);
  const expectedPos=[];for(let i=0;i<data.genbuEntry.waterContact.length;i+=9)expectedPos.push(Array.from(data.genbuEntry.waterContact.subarray(i,i+9)).join(','));
  for(const[old,p,id,removed]of[[oldNative,native,nativeWater,4],[oldPack,pack,publicWater,2]]){
   const a=recordMap(old).get(id),m=recordMap(p).get(id),all=new Map();for(let f=0;f<triCount(m);f++){const k=faceKey(face(m,f));all.set(k,(all.get(k)||0)+1);}
   let retained=0,cut=0;
   for(let f=0;f<triCount(a);f++){const ps=face(a,f);
    if(ps.every(q=>q[2]>=-524-.00001&&Math.abs(q[1]-Math.fround(39.414))<.00001)){cut++;continue;}
    const k=faceKey(ps);assert(all.get(k)>0,'Upstream water attributes lost '+id+'/'+f);all.set(k,all.get(k)-1);retained++;
   }
   assert.equal(cut,removed);assert.equal(triCount(m)-retained,112);
   const tail=[];for(let f=retained;f<triCount(m);f++)tail.push(face(m,f).flatMap(p=>p.slice(0,3)).join(','));
   assert.equal(signature(tail),signature(expectedPos),'Actual shared water triangles '+id);
   const oldEdge=new Set();for(let f=0;f<triCount(a);f++)for(const q of face(a,f))if(q[2]===-524&&q[1]===Math.fround(39.414))oldEdge.add(q.slice(0,3).join(','));
   assert.equal(oldEdge.size,2);for(const key of oldEdge)assert(Array.from({length:triCount(m)},(_,f)=>face(m,f)).flat().some(q=>q.slice(0,3).join(',')===key),'Shared old water cross-section missing '+id);
   details.push({id,oldTriangles:triCount(a),newTriangles:triCount(m),retainedTriangles:retained,removed,added:112,sharedJoin:Array.from(oldEdge)});
  }return{actualSharedTailTriangles:112,details};
 });
 check('Actual exposed water tail is clipped to its near bed and query; distant water and signed margins preserve fallback',()=>{
  const a=data.genbuEntry.waterContact,t=new G.Terrain(data);let probes=0,maxBedAboveWater=-Infinity,maxQueryError=0,farBedAboveWater=-Infinity;
  for(let i=0;i<a.length;i+=9){const ps=[0,1,2].map(k=>Array.from(a.subarray(i+k*3,i+k*3+3)));
   const center=[0,1,2].map(k=>ps.reduce((s,p)=>s+p[k]/3,0));
   for(const q of [...ps,center]){const n=newGroundNear(q[0],q[2]),f=newGroundFar(q[0],q[2]);assert(n&&f);
    maxBedAboveWater=Math.max(maxBedAboveWater,n[1]-q[1]);farBedAboveWater=Math.max(farBedAboveWater,f[1]-q[1]);probes++;}
   const water=t.water(center[0],center[2]);assert(water&&water.id==='genbu-creek');maxQueryError=Math.max(maxQueryError,Math.abs(water.y-center[1]));
  }
  assert(maxBedAboveWater<.00002);assert(maxQueryError<.00001);
  let outside=0;const otherTypes={};
  for(let x=-2560;x<=2048;x+=16)for(const z of[-526,-525,-524,-520,-512,-504,-503])for(const margin of[-.3,0,.3]){
   if(x>-1024&&x<-912&&z>=-524&&z<=-504)continue;const old=U.previousWater.call(t,x,z,margin),now=t.water(x,z,margin);
   assert.equal(signature(now),signature(old),'Distant/margin water changed '+x+','+z+'/'+margin);if(old?.id)otherTypes[old.id]=(otherTypes[old.id]||0)+1;outside++;
  }
  const inheritedGap=[-526,-525.5,-525,-524.5].map(z=>{const x=G.WEST.waterX(z),old=U.previousWater.call(t,x,z),now=t.water(x,z);
   assert.equal(signature(now),signature(old));return{x,z,old,candidate:now};});
  return{actualBedProbes:probes,maxBedAboveWater,maxQueryError,farBedAboveWater,outsideSignedMarginSamples:outside,otherOriginalWaterTypes:otherTypes,inheritedGap,
   note:'Near clipping is strict within original F32 allowance. Far exposure uses retained original LOD residual; a pre-existing water/query gap is not silently filled.'};
 });
 check('Unique live owned backing, recursive pack bytes and source triangle budgets include every new contact',()=>{
  const publicBytes=publicNewBuffers.reduce((s,b)=>s+b.byteLength,0),nativeBytes=nativeNewBuffers.reduce((s,b)=>s+b.byteLength,0);
  const union=new Set([...publicNewBuffers,...nativeNewBuffers]),total=[...union].reduce((s,b)=>s+b.byteLength,0);
  assert.equal(publicBytes,pm.sourceBytes);assert.equal(nativeBytes,nm.sourceBytes);assert.equal(publicBytes,568932);assert.equal(nativeBytes,29280);assert.equal(total,598212);
  assert(total<=.6*1048576);assert.equal(data.genbuEntry.contact.byteLength,99792);assert.equal(data.genbuEntry.originalContact.byteLength,99792);assert.equal(data.genbuEntry.waterContact.byteLength,4032);
  assert.equal(bytes(pack),pack.bytes);assert.equal(bytes(native),native.bytes);assert.equal(native.bytes,6293376);
  const publicDelta=pack.meshes.reduce((s,m)=>s+triCount(m),0)-oldPack.meshes.reduce((s,m)=>s+triCount(m),0);
  const terrainDelta=terrainIDs.reduce((s,id)=>s+triCount(recordMap(pack).get(id))-triCount(recordMap(oldPack).get(id)),0);
  const nativeDelta=terrainDelta+triCount(recordMap(native).get(nativeWater))-triCount(recordMap(oldNative).get(nativeWater));
  assert.equal(publicDelta,3566);assert.equal(nativeDelta,3564);assert(publicDelta<=4000&&nativeDelta<=4000);assert.equal(pm.newRecords,0);assert.equal(nm.newRecords,0);assert.equal(pm.newTextures,0);assert.equal(nm.newTextures,0);
  return{publicNewOwnedBytes:publicBytes,nativeNewOwnedBytes:nativeBytes,totalNewPersistentBackingBytes:total,maxNewPersistentBackingBytes:.6*1048576,
   publicNewAllocations:publicNewBuffers.map(b=>b.byteLength),nativeNewAllocations:nativeNewBuffers.map(b=>b.byteLength),
   contactBytes:203616,conservativeIncrementalWorkerCopyPeakBytes:total+203616,livePublicRecursiveBytes:pack.bytes,
   liveNativeBytes:native.bytes,actualBaselineNativeBytes:6278784,nativeNetBytesDelta:14592,sourcePublicTriangleDelta:publicDelta,sourceNativeActiveTriangleDelta:nativeDelta,
   productionDrawCallsNotMeasured:true,V8SlabTotalsNotProductionMemory:true};
 });
 check('Current geometry-cache array/index identities and every written original view have bounded ownership',()=>{
  const groups=new Map();for(const m of pack.meshes){if(!groups.has(m.vertices))groups.set(m.vertices,[]);groups.get(m.vertices).push(m);}
  for(const m of pack.meshes.filter(m=>terrainIDs.includes(m.id)||m.id===publicWater))for(const other of groups.get(m.vertices))assert.equal(arraySHA(m.index),arraySHA(other.index),'Shared vertices object with different index '+m.id+'/'+other.id);
  const views=[];for(const m of pack.meshes)for(const k of ['vertices','farVertices','index','instances','instanceColors'])if(m[k])views.push({id:m.id,key:k,a:m[k]});
  const writes=[...terrainIDs.filter(id=>!id.endsWith(':far')).map(id=>[id,'vertices']),[publicRock,'vertices'],[publicMoss,'vertices'],...roadIDs.map(id=>[id,'vertices']),...plantIDs.map(id=>[id,'instances'])];
  let checked=0;for(const[id,key]of writes){const a=recordMap(pack).get(id)[key];assert(a);
   for(const v of views)if(v.id!==id||v.key!==key)assert(!(a.buffer===v.a.buffer&&a.byteOffset<v.a.byteOffset+v.a.byteLength&&v.a.byteOffset<a.byteOffset+a.byteLength),'Overlapping writable view '+id+'/'+key+' and '+v.id+'/'+v.key);
   checked++;
  }return{writtenViewsChecked:checked,cacheKeyVertexIdentityCompatible:true,rendererUnchanged:true};
 });
 saveSnapshot('manifest',data);saveSnapshot('public',pack);saveSnapshot('native',native);
 r.actualNativeGeometrySHA256=geometryDigest(native);
 r.authorComparison={liveAuthorSnapshotWasNotUsedAsAllocationBaseline:true,independentProductionPath:true,authorSourceSHA256:author.sourceSHA};
}catch(e){r.passed=false;r.fatal=e.stack||String(e);}
finally{
 r.changedInputs=Object.entries(inputHashes).filter(([p,h])=>sha(fs.readFileSync(ROOT+'/'+p))!==h).map(([p])=>p);
 r.changedEvidence=Object.entries(evidenceHashes).filter(([p,h])=>sha(fs.readFileSync(p.startsWith('/')?p:EV+'/'+p))!==h).map(([p])=>p);
 if(r.changedInputs.length||r.changedEvidence.length)r.passed=false;
 r.endUTC=new Date().toISOString();r.elapsedWallMs=performance.now()-start;
 r.notMeasured=['Additional raster art gates and exact WebGL draw/texture/geometry cost','Full Node/CI/new regional fixture acceptance',
  'Actual native outer Worker wrapper invocation (the one generator and same-pack applyDetail above follow its exact two operations)',
  'Worker contact-copy release, cancellation, unload/reenter, shader/context and low/night/back views','Hardware FPS or CPU interaction improvement'];
 save();console.log(JSON.stringify({output:OUT,passed:r.passed,sourceSHA256:SOURCE,protocolSHA256:r.protocolSHA256,
  executed:r.executed,checks:r.checks.map(c=>({name:c.name,passed:c.passed,error:c.error})),digest:r.actualNativeGeometrySHA256,
  elapsedWallMs:r.elapsedWallMs,fatal:r.fatal}));if(!r.passed)process.exitCode=1;
}
