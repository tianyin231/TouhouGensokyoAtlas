// Three authorized fresh native builds. This source-only protocol does not
// execute WebGL, the unchanged public 19 checks, or a full Node regression.
// Nameless reuses a complete independent 870 reference; Sunflower is paired.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {serialize,deserialize} from 'node:v8';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import * as T from '/workspace/flower-hill-refinement/vendor/three/three.module.js';
import {geometryDigest} from '/workspace/flower-hill-refinement/tools/check-hakurei.mjs';
import {checkFlowerHillNativeRepair} from '/workspace/flower-hill-refinement/tools/check-flower-hill-entry.mjs';
const ROOT='/workspace/flower-hill-refinement',B='/workspace/flower-hill-evidence';
const SOURCE='src/flower-hill-entry.js',SOURCE_SHA='2fde1ae2fa094decaf57facaf07fd895fe0a13fcb962480510f7a76ccc2ad549';
const CHECKER='tools/check-flower-hill-entry.mjs',CHECKER_SHA='7f22d62fb6c8816560d5a26bb378d1947afcee1a566e4eaa8eae8427ae77f4ac';
const PROJECT_SHA='d9ae63c0be3e3527eb1800924c79702cf03d64ba516ef8e3247d9bdcc28ab574';
const PREFIX_SHA='ed0a8a18476b9f510bfe7a5199e4e6de19bda9e3ad6cea3e13095c9304ab7f04';
const SUN_SHA='f0e2d1871500518bedaf20c83d8ee71fb038fc61ee9f6d144428828444fce6ae';
const OUTPUT=B+'/native-repair-actual-v2.json',OUTDIR=B+'/native-repair-actual-v2-arrays';
assert.equal(process.versions.node.split('.')[0],'22');assert(!fs.existsSync(OUTPUT));assert(!fs.existsSync(OUTDIR));fs.mkdirSync(OUTDIR);
const sha=a=>createHash('sha256').update(a).digest('hex'),arraySHA=a=>sha(Buffer.from(a.buffer,a.byteOffset,a.byteLength));
const inputs={},read=p=>{const b=fs.readFileSync(resolve(ROOT,p));inputs[p]=sha(b);return b;};
const inside=(x,z)=>x>=-1280&&x<=-928&&z>=960&&z<=1376;
const bench=(x,z)=>Math.abs(x+1251)<=4.5&&Math.abs(z-987)<=5;
const identity=m=>JSON.stringify(m,(k,v)=>ArrayBuffer.isView(v)||['center','radius'].includes(k)?undefined:v);
const same=(a,b,label)=>assert.equal(JSON.stringify(a),JSON.stringify(b),label);
const start=performance.now(),report={schema:1,kind:'Fresh Flower Hill native repair and paired Sunflower protection',
 startUTC:new Date().toISOString(),node:process.version,protocolSHA256:sha(fs.readFileSync(fileURLToPath(import.meta.url))),
 sourceSHA256:SOURCE_SHA,checkerSHA256:CHECKER_SHA,projectSHA256:PROJECT_SHA,
 noGPU:true,noFullNode:true,noFixtureUpdate:true,nativeBuildCount:0,checks:[],passed:true,completeNativeSnapshots:[]};
const save=()=>fs.writeFileSync(OUTPUT,JSON.stringify(report,null,2)+'\n');
const check=async(name,fn)=>{try{const result=await fn();report.checks.push({name,passed:true,result});save();return result;}catch(e){report.passed=false;report.checks.push({name,passed:false,error:e.stack||String(e)});save();return null;}};
const snapshot=(label,value)=>{const b=serialize(value),path=OUTDIR+'/'+label+'.v8';fs.writeFileSync(path,b,{flag:'wx'});report.completeNativeSnapshots.push({label,path,bytes:b.byteLength,sha256:sha(b),meaning:'Complete Node22 value snapshot. Deserialized backing identity must not substitute live source ownership accounting.'});save();};
try{
 // Record the actual current values of every existing 203 release input.
 // The old release HTML predates this native repair and is not executed here.
 const release=JSON.parse(fs.readFileSync(B+'/tech-dist/release.json'));for(const p of Object.keys(release.inputs))read(p);
 read('vendor/three/three.module.js');read('tools/check-hakurei.mjs');read(CHECKER);
 assert.equal(sha(read(SOURCE)),SOURCE_SHA);assert.equal(inputs[CHECKER],CHECKER_SHA);assert.equal(sha(read('project.json')),PROJECT_SHA);
 report.protectedReleaseInputCount=Object.keys(release.inputs).length;assert.equal(report.protectedReleaseInputCount,203);
 report.priorBrowserArtifact={sha256:release.sha256,executed:false,reason:'The source-only native repair has not been rebuilt or rendered yet.'};
 const prior=JSON.parse(fs.readFileSync(B+'/independent-nameless-native.json'));
 assert.equal(sha(fs.readFileSync(B+'/independent-nameless-native.json')),'363615addb579396c2338b1874457c507bef4d022ef1a1c1c56b67b58f383f22');
 const ref=prior.completeNativeSnapshots.find(v=>v.label==='candidate'),raw=fs.readFileSync(ref.path);assert.equal(sha(raw),ref.sha256);
 const reference=deserialize(Buffer.from(raw)),referenceDigest=geometryDigest(reference);
 assert.equal(referenceDigest,'9d35b100a873fa464c75de4dbab4872a57468d58d5ebaa61a8fd80f601560f06');
 report.reusedNamelessReference={path:ref.path,sha256:ref.sha256,nativeDigest:referenceDigest,originalReportSHA256:sha(fs.readFileSync(B+'/independent-nameless-native.json')),originalExitCode:1,originalChecks:'5/9',rerun:false};save();
 const tool=String(read(CHECKER)),helper=tool.split('export async function checkFlowerHillEntry')[0].replace(/^import .*;\n/gm,'').replace('export const ACCEPTED_SOLAR_PREFIX_SHA','const ACCEPTED_SOLAR_PREFIX_SHA');
 const H=vm.compileFunction(helper+'\nreturn {mergedAtlas,bootPredecessors,backingBuffers,bytes,faces,faceMapsEqual};',['assert','fs','vm','gunzipSync','createHash','performance','resolve','fileURLToPath','pathToFileURL'])(assert,fs,vm,gunzipSync,createHash,performance,resolve,fileURLToPath,pathToFileURL);
 const project=JSON.parse(read('project.json'));assert.equal(project.worldBuilders.length,47);assert.equal(project.worldBuilders.at(-1),SOURCE);assert.equal(sha(JSON.stringify(project.worldBuilders.slice(0,-1))),PREFIX_SHA);
 const context=vm.createContext({performance,TextDecoder,TextEncoder});for(const p of project.worldBuilders)vm.runInContext(String(read(p)),context,{filename:p});
 const G=context.GA,U=G.FLOWER_HILL_ENTRY;context.inputAtlas=JSON.stringify(H.mergedAtlas(read,project));const data=vm.runInContext('JSON.parse(inputAtlas)',context);
 const rawPack=gunzipSync(read('assets/packs/overview.pack.gz')),pack=G.decodePack(rawPack.buffer.slice(rawPack.byteOffset,rawPack.byteOffset+rawPack.byteLength));
 const boot=performance.now();H.bootPredecessors(G,data,pack);assert(G.SUNFLOWER_ENTRY.metadata.has(pack)&&data.sunflowerEntry.contact.length>0&&!data.flowerHillEntry);
 const baselineData={...data},oldTerrain=new G.Terrain(baselineData),solar=data.sunflowerEntry,solarContact=solar.contact,solarSHA=arraySHA(solarContact);
 const oldPaths=JSON.stringify(G.FLOWERLANDS.paths),oldPublicRoads=pack.meshes.filter(m=>m.id.startsWith('island:routes:')).map(m=>({id:m.id,identity:identity(m),arrays:Object.fromEntries(Object.entries(m).filter(([,v])=>ArrayBuffer.isView(v)).map(([k,a])=>[k,arraySHA(a)]))}));
 const east=pack.meshes.filter(m=>m.component==='island-terrain'&&!m.cutOnly&&m.tile&&m.tile[0]<-928&&m.tile[0]+m.tile[2]>-928&&m.tile[1]<1376&&m.tile[1]+m.tile[2]>960).map(m=>({id:m.id,faces:H.faces(m,a=>a.every(p=>p[0]>=-928))}));same(east.map(m=>m.id),[768,1024,1280].flatMap(z=>['island:terrain:-1024:'+z,'island:terrain:-1024:'+z+':far']),'Actual six shared east record IDs');
 const solarQueries=[];for(let x=-928;x<=-192;x+=16)for(let z=704;z<=1152;z+=16)solarQueries.push({x,z,height:oldTerrain.height(x,z)});
 pack.meshes.push(...G.extraOverviewBuilders.at(-1)(data,pack));assert(U.metadata.has(pack)&&data.flowerHillEntry.contact.length>0&&data.flowerHillEntry.originalContact.length>0);
 const terrain=new G.Terrain(data),near=U.sampler(data.flowerHillEntry.contact),originalNear=U.sampler(data.flowerHillEntry.originalContact);
 report.fullProductionPreparation={wallMs:performance.now()-boot,moduleCount:47,predecessorHooks:18,totalHooks:G.extraOverviewBuilders.length,publicSourceBytes:U.metadata.get(pack).sourceBytes,contactSHA256:arraySHA(data.flowerHillEntry.contact),originalContactSHA256:arraySHA(data.flowerHillEntry.originalContact)};save();
 const solarProtection=()=>{assert.equal(data.sunflowerEntry,solar);assert.equal(solar.contact,solarContact);assert.equal(arraySHA(solarContact),solarSHA);assert.equal(JSON.stringify(G.FLOWERLANDS.paths),oldPaths);
  for(const p of solarQueries)assert.equal(terrain.height(p.x,p.z),p.height,'Solar or isolation-band query changed');
  for(const p of east)H.faceMapsEqual(H.faces(pack.meshes.find(m=>m.id===p.id),a=>a.every(p=>p[0]>=-928)),p.faces,'Shared east attributes '+p.id);
  same(pack.meshes.filter(m=>m.id.startsWith('island:routes:')).map(m=>({id:m.id,identity:identity(m),arrays:Object.fromEntries(Object.entries(m).filter(([,v])=>ArrayBuffer.isView(v)).map(([k,a])=>[k,arraySHA(a)]))})),oldPublicRoads,'Accepted public roads changed');
  return{SolarContactSHA256:solarSHA,querySamples:solarQueries.length,sharedEastRecords:east.map(m=>m.id),nativePathsUnchanged:true,publicRoadRecords:oldPublicRoads.length};};
 await check('real production prefix and exact Solar public/contact/query preservation',solarProtection);
 snapshot('baseline-manifest',baselineData);snapshot('candidate-manifest',data);
 const build=async(label,fn)=>{const t=performance.now();report.nativeBuildCount++;report.activeBuild=label;save();const value=await fn();const r={label,wallMs:performance.now()-t,geometrySHA256:geometryDigest(value),records:value.meshes.length,reportedPackBytes:value.bytes,liveRecursiveBackingBytes:H.bytes(H.backingBuffers(value))};(report.builds??=[]).push(r);delete report.activeBuild;snapshot(label,value);console.log(JSON.stringify({completedNativeBuild:r}));return value;};
 const nameless=await build('nameless-final',()=>G.buildRegion(data,'nameless'));
 report.namelessRepair=checkFlowerHillNativeRepair(reference,nameless,{G,data,T,geometryDigest,sourceSHA:SOURCE_SHA,evidenceMode:'actual-native'});
 if(!report.namelessRepair.passed)report.passed=false;assert.equal(geometryDigest(reference),referenceDigest,'Reference pack was mutated');save();
 console.log(JSON.stringify({namelessRepair:report.namelessRepair.passed,checks:report.namelessRepair.checks.map(c=>({name:c.name,passed:c.passed})),digest:geometryDigest(nameless)}));
 const baseline=await build('sunflower-solar-baseline',()=>U.originalBuildRegion(baselineData,'sunflower'));
 await check('Sunflower accepted Solar baseline is independently exact',()=>{assert.equal(geometryDigest(baseline),SUN_SHA);assert.equal(baseline.id,'sunflower');assert.equal(baseline.bytes,H.bytes(H.backingBuffers(baseline)));return{geometrySHA256:SUN_SHA,records:baseline.meshes.length,packBytes:baseline.bytes};});
 const baselineDigest=geometryDigest(baseline),candidate=await build('sunflower-final',()=>G.buildRegion(data,'sunflower')),old=new Map(baseline.meshes.map(m=>[m.id,m]));
 await check('paired Sunflower IDs, real prototypes, colors, population and all fifteen non-Y matrix components',()=>{
  same(candidate.meshes.map(m=>m.id),baseline.meshes.map(m=>m.id),'Sunflower native ID/order');let records=0,instances=0,moved=0,minOffset=Infinity,maxOffset=-Infinity,maxQueryOffsetError=0,maxNearOffsetError=0;
  for(const m of candidate.meshes){const o=old.get(m.id);assert.equal(identity(m),identity(o),'Sunflower material/identity/LOD '+m.id);if(!m.instances)continue;records++;assert(m.vertices.length&&m.farVertices?.length&&m.instanceColors?.length,'Vacuous native prototypes or colours');
   for(const k of['vertices','farVertices','index','instanceColors']){assert.equal(Boolean(m[k]),Boolean(o[k]));if(o[k])assert.equal(arraySHA(m[k]),arraySHA(o[k]),'Sunflower prototype/colour '+m.id+'/'+k);}assert.equal(m.instances.length,o.instances.length);
   for(let i=0;i<m.instances.length;i+=16){const a=m.instances,b=o.instances,x=b[i+12],z=b[i+14];for(let k=0;k<16;k++)if(k!==13)assert.equal(a[i+k],b[i+k],'Sunflower non-Y '+m.id+'/'+i/16+'/'+k);
    const before=b[i+13]-oldTerrain.height(x,z),after=a[i+13]-terrain.height(x,z),error=Math.abs(after-before);maxQueryOffsetError=Math.max(maxQueryOffsetError,error);assert(error<=.00015,'Sunflower inherited query-root offset');
    if(a[i+13]!==b[i+13]){assert(inside(x,z)&&!bench(x,z),'Sunflower root moved outside Flower domain');moved++;}
    const n=near(x,z),oN=originalNear(x,z);if(inside(x,z)&&n!==null&&oN!==null){const oldOffset=b[i+13]-oN,newOffset=a[i+13]-n;minOffset=Math.min(minOffset,oldOffset);maxOffset=Math.max(maxOffset,oldOffset);maxNearOffsetError=Math.max(maxNearOffsetError,Math.abs(newOffset-oldOffset));assert(Math.abs(newOffset-oldOffset)<=.00015,'Sunflower inherited near/root residual');}instances++;
   }
  }assert(records===456&&instances===132113&&moved>0);return{records,instances,moved,maximumQueryRootOffsetChange:maxQueryOffsetError,minimumInheritedNearRootOffset:minOffset,maximumInheritedNearRootOffset:maxOffset,maximumNearRootOffsetChange:maxNearOffsetError,tolerance:.00015,zeroNearRootOffsetClaimed:false,allPrototypesColorsNonYUnchanged:true};
 });
 await check('paired Sunflower paths and actual native road XZ stay exact',()=>{assert.equal(JSON.stringify(G.FLOWERLANDS.paths),oldPaths);let roads=0,vertices=0;for(const m of candidate.meshes.filter(m=>m.group==='roads')){const o=old.get(m.id);assert(!m.index&&!o.index);assert.equal(m.vertices.length,o.vertices.length);for(let i=0;i<m.vertices.length;i+=9){assert.equal(m.vertices[i],o.vertices[i]);assert.equal(m.vertices[i+2],o.vertices[i+2]);const x=o.vertices[i],z=o.vertices[i+2];assert(Math.abs(m.vertices[i+1]-Math.fround(terrain.height(x,z)+.24))<=.00015,'Actual road query support');if(!inside(x,z))for(let k=0;k<9;k++)assert.equal(m.vertices[i+k],o.vertices[i+k],'Outside native road attribute');vertices++;}roads++;}assert(roads>0);return{roads,vertices,nativeOriginalXZ:true};});
 await check('protected Sunflower architecture, source rock anchors and all non-target native geometry',()=>{
  same(candidate.meta.stage,baseline.meta.stage,'Seasonal stage changed');assert.equal(candidate.meta.features.length,baseline.meta.features.length);assert.equal(candidate.meta.rocks.length,baseline.meta.rocks.length);
  const featureYs=[];for(const key of['features','rocks'])for(let j=0;j<baseline.meta[key].length;j++){const o=baseline.meta[key][j],m=candidate.meta[key][j];same({...m,y:undefined},{...o,y:undefined},'Original native feature identity '+key+'/'+j);const delta=terrain.height(o.x,o.z)-oldTerrain.height(o.x,o.z);assert(Math.abs((m.y-o.y)-delta)<=.00015,'Feature ground translation');if(!inside(o.x,o.z)||bench(o.x,o.z))assert.equal(m.y,o.y,'Protected or external feature');if(m.y!==o.y)featureYs.push({key,index:j,x:o.x,z:o.z,deltaY:delta,r:o.r,w:o.w,d:o.d});}
  let vertices=0,changed=0,stoneVertices=0;for(const m of candidate.meshes.filter(m=>!m.instances&&m.group!=='roads')){const o=old.get(m.id);assert.equal(m.vertices.length,o.vertices.length);if(o.index)assert.equal(arraySHA(m.index),arraySHA(o.index));for(let i=0;i<m.vertices.length;i+=9){for(const k of[0,2,3,4,5,6,7,8])assert.equal(m.vertices[i+k],o.vertices[i+k],'Native architecture attributes '+m.id+'/'+i/9+'/'+k);const x=o.vertices[i],z=o.vertices[i+2],dY=m.vertices[i+1]-o.vertices[i+1];if(bench(x,z)){assert.equal(dY,0,'Stone-seat support');stoneVertices++;}if(dY!==0){const source=featureYs.find(f=>Math.abs(x-f.x)<=(f.r??f.w/2??0)+.01&&Math.abs(z-f.z)<=(f.r??f.d/2??0)+.01&&Math.abs(dY-f.deltaY)<=.00015);assert(source,'Native architecture changed without an actual authorized rigid anchor '+m.id+'/'+i/9);changed++;}vertices++;}}
  assert(vertices>0);return{actualArchitectureVertices:vertices,rigidlyTranslatedVertices:changed,translatedSourceAnchors:featureYs,protectedStoneVertices:stoneVertices,stageUnchanged:true,allArchitectureXZNormalsColorsUnchanged:true};
 });
 await check('Sunflower live shared backing, source population and transformed bounds',()=>{
  assert.equal(candidate.bytes,H.bytes(H.backingBuffers(candidate)));assert.equal(baseline.bytes,H.bytes(H.backingBuffers(baseline)));assert.equal(candidate.bytes,baseline.bytes);assert.equal(candidate.meta.counts.sunflowers,124002);let instances=0,maximumExcess=-Infinity;const boxes=new Map();
  for(const m of candidate.meshes.filter(m=>m.instances))for(const a of[m.vertices,m.farVertices]){if(!boxes.has(a)){const low=[Infinity,Infinity,Infinity],high=[-Infinity,-Infinity,-Infinity];for(let j=0;j<a.length;j+=9)for(let k=0;k<3;k++){low[k]=Math.min(low[k],a[j+k]);high[k]=Math.max(high[k],a[j+k]);}const ps=[];for(const x of[low[0],high[0]])for(const y of[low[1],high[1]])for(const z of[low[2],high[2]])ps.push([x,y,z]);boxes.set(a,ps);}for(let i=0;i<m.instances.length;i+=16){const b=m.instances;for(const[x,y,z]of boxes.get(a)){const p=[b[i]*x+b[i+4]*y+b[i+8]*z+b[i+12],b[i+1]*x+b[i+5]*y+b[i+9]*z+b[i+13],b[i+2]*x+b[i+6]*y+b[i+10]*z+b[i+14]],excess=Math.hypot(...p.map((v,k)=>v-m.center[k]))-m.radius;maximumExcess=Math.max(maximumExcess,excess);assert(excess<=.05,'Actual native prototype bound '+m.id);}instances++;}}
  return{packBytes:candidate.bytes,sharedPrototypeViews:boxes.size,prototypeInstancePairs:instances,sunflowers:124002,maximumCornerBoundsExcess:maximumExcess,tolerance:.05};
 });
 await check('both native builds preserve parent reference and original Solar data and public surface',()=>{assert.equal(geometryDigest(reference),referenceDigest,'Nameless reference mutated');assert.equal(geometryDigest(baseline),baselineDigest,'Sunflower reference mutated');return solarProtection();});
 report.candidateNativeDigests={nameless:geometryDigest(nameless),sunflower:geometryDigest(candidate)};
 report.notRun=['New-source WebGL art/cost/texture residency','Native Worker/unload/reentry/input CPU','Complete Node regression','Unchanged public 19 check rerun'];
}catch(e){report.passed=false;report.fatal=e.stack||String(e);}
finally{
 const changed=Object.entries(inputs).filter(([p,h])=>sha(fs.readFileSync(resolve(ROOT,p)))!==h).map(([p])=>p);if(changed.length){report.passed=false;report.changedInputs=changed;}
 Object.assign(report,{inputsSHA256:inputs,inputsUnchanged:changed.length===0,endUTC:new Date().toISOString(),elapsedWallMs:performance.now()-start});save();
 console.log(JSON.stringify({output:OUTPUT,passed:report.passed,nativeBuildCount:report.nativeBuildCount,namelessRepair:report.namelessRepair?.passed,digests:report.candidateNativeDigests,checks:report.checks.map(c=>({name:c.name,passed:c.passed})),fatal:report.fatal,elapsedWallMs:report.elapsedWallMs}));if(!report.passed)process.exitCode=1;
}
