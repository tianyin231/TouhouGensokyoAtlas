// Only the original 22 failing V1 shoulder faces and the original 819 probes.
// Reuse complete value snapshots; no hooks, native generation or GPU.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {deserialize} from 'node:v8';
import {createHash} from 'node:crypto';
const EV='/workspace/genbu-entry-evidence',ROOT='/workspace/genbu-entry-refinement';
const OUT=EV+'/independent-v2-same-road-edge.json';
const SOURCE='dd991fadfa7ef3339ec0afe26fa10e9dd6ddcc09fcd41536f3501e4e874d3544';
const sha=b=>createHash('sha256').update(b).digest('hex'),bindings={};
const load=p=>{const b=fs.readFileSync(p);bindings[p]={bytes:b.length,sha256:sha(b)};return b;};
const begun=performance.now(),startUTC=new Date().toISOString();assert(!fs.existsSync(OUT));
const oldFailureBytes=load(EV+'/independent-v1-road-normal.json');assert.equal(sha(oldFailureBytes),'e8ee3fc5e754461c4def01c6576e3a1a43dff0fe4dfeb27ac20545a33c495f18');
const oldFailure=JSON.parse(oldFailureBytes),oldProbeBytes=load(EV+'/independent-v1-road-edge.json');
assert.equal(sha(oldProbeBytes),'9206b68f3816105fdd2a10b4d334f5c68ca79d7089f5c7a52f76458ce1a031df');
const oldProbe=JSON.parse(oldProbeBytes),author05=JSON.parse(load(EV+'/author-prepare-05.json')),author06=JSON.parse(load(EV+'/author-prepare-06.json'));
assert.equal(sha(load(ROOT+'/src/genbu-entry.js')),SOURCE);assert.equal(author06.sourceSHA,SOURCE);assert.equal(author06.sourceAfterSHA,SOURCE);
assert.equal(sha(load(ROOT+'/project.json')),author06.projectSHA);assert.equal(oldFailure.violations.length,22);assert.equal(oldProbe.summary.candidateSamples,819);
const base=deserialize(load(EV+'/baseline-native-arrays-v2/public-overview.v8')),now=deserialize(load(EV+'/author-prepare-06-arrays/public.v8'));
const count=m=>(m.index?.length||m.vertices.length/9)/3,attrs=(m,i)=>Array.from(m.vertices.subarray(i*9,i*9+9));
const face=(m,i)=>[0,1,2].map(k=>attrs(m,m.index?m.index[i*3+k]:i*3+k));
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),sub=(a,b)=>a.map((v,i)=>v-b[i]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=a=>a.map(v=>v/Math.hypot(...a));
const aSHA=a=>sha(Buffer.from(a.buffer,a.byteOffset,a.byteLength));
const nearFarIDs=['island:terrain:-1024:-768','island:terrain:-1024:-768:far','island:terrain:-1024:-512','island:terrain:-1024:-512:far'];
function at(ps,x,z){const[a,b,c]=ps,d=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]);if(Math.abs(d)<1e-10)return null;
 const u=((b[2]-c[2])*(x-c[0])+(c[0]-b[0])*(z-c[2]))/d,v=((c[2]-a[2])*(x-c[0])+(a[0]-c[0])*(z-c[2]))/d,w=1-u-v;
 return Math.min(u,v,w)<-1e-7?null:u*a[1]+v*b[1]+w*c[1];}
function sampler(pack,far){const bins=new Map();for(const id of nearFarIDs.filter(p=>p.endsWith(':far')===far)){const m=pack.meshes.find(m=>m.id===id);assert(m);
 for(let i=0;i<count(m);i++){const ps=face(m,i).map(p=>p.slice(0,3)),xs=ps.map(p=>p[0]),zs=ps.map(p=>p[2]);
  if(Math.max(...xs)<-1032||Math.min(...xs)>-904||Math.max(...zs)<-590||Math.min(...zs)>-476)continue;
  for(let x=Math.floor(Math.min(...xs)/8);x<=Math.floor(Math.max(...xs)/8);x++)for(let z=Math.floor(Math.min(...zs)/8);z<=Math.floor(Math.max(...zs)/8);z++){const k=x+','+z;if(!bins.has(k))bins.set(k,[]);bins.get(k).push({recordId:id,triangleOrdinal:i,ps});}
 }}return(x,z)=>(bins.get(Math.floor(x/8)+','+Math.floor(z/8))||[]).flatMap(q=>{const y=at(q.ps,x,z);return y===null?[]:[{recordId:q.recordId,triangleOrdinal:q.triangleOrdinal,y}];});}
const report={schema:1,kind:'Independent V2 same-face normal repair and same-point bounded support recheck',startUTC,sourceSHA256:SOURCE,
 protocolSHA256:sha(fs.readFileSync(import.meta.filename)),projectSHA256:author06.projectSHA,
 baselineAcceptedNativeReportSHA256:sha(load(EV+'/baseline-native-source-v2.json')),originalV1Failure:{reportSHA256:sha(oldFailureBytes),CLI:1,checksPassed:2,checksTotal:3,faces:22,overwritten:false},
 reusedV1ArtifactSHA256:oldFailure.artifactSHA256,candidateArtifactNotMeasured:true,executed:{definitionModules:0,overviewHooks:0,nativeBuilds:0,GPUFrames:0},bindings,checks:[],passed:true,faceComparisons:[],supportComparisons:[]};
const save=()=>fs.writeFileSync(OUT,JSON.stringify(report,null,2)+'\n');
const check=(name,fn)=>{try{const result=fn();report.checks.push({name,passed:true,result});save();return result;}catch(e){report.passed=false;report.checks.push({name,passed:false,error:e.stack});save();return null;}};
check('Original true road indices and all near/far source geometry are unchanged from frozen V1',()=>{let indices=0,ground=0;
 for(const id of oldProbe.targetIDs){const m=now.meshes.find(m=>m.id===id),old=base.meshes.find(m=>m.id===id),output=author05.outputs.publicChanges.find(m=>m.id===id);assert(m&&old&&output);assert.equal(aSHA(m.index),output.index,'Same road triangle identity '+id);assert.equal(aSHA(m.index),aSHA(old.index),'Original road index '+id);indices++;}
 for(const id of nearFarIDs){const m=now.meshes.find(m=>m.id===id),output=author05.outputs.publicChanges.find(m=>m.id===id);assert.equal(aSHA(m.vertices),output.attrs,'New terrain changed during the normal correction '+id);assert.equal(aSHA(m.index),output.index);ground++;}
 return{roads:indices,actualNearFarRecords:ground};});
check('All original 22 failing faces, including mixed old/new vertices, have normals agreeing with actual winding',()=>{let minDot=Infinity,minOldDot=Infinity,mixed=0;
 for(const old of oldFailure.violations){const m=now.meshes.find(m=>m.id===old.recordId),baseline=base.meshes.find(m=>m.id===old.recordId),ps=face(m,old.triangleOrdinal),oldPs=face(baseline,old.triangleOrdinal),saved=oldProbe.actualRoadFaces.find(f=>f.id===old.recordId&&f.triangleOrdinal===old.triangleOrdinal);
  assert(saved);assert.deepEqual(ps.map(p=>p.slice(0,3)),saved.points,'Road geometry changed '+old.recordId+'/'+old.triangleOrdinal);assert.deepEqual(oldPs.map(p=>p.slice(0,3)),saved.oldPoints,'Original source identity changed');
  const gn=norm(cross(sub(ps[1],ps[0]),sub(ps[2],ps[0]))),bn=norm(cross(sub(oldPs[1],oldPs[0]),sub(oldPs[2],oldPs[0]))),dots=ps.map(p=>dot(p.slice(3,6),gn)),oldDots=oldPs.map(p=>dot(p.slice(3,6),bn));
  const wasMixed=old.candidateDotGeometric.some(v=>v>0)&&old.candidateDotGeometric.some(v=>v<=0);if(wasMixed)mixed++;
  const q={recordId:old.recordId,triangleOrdinal:old.triangleOrdinal,center:old.center,screen:old.screen,originalDotGeometric:oldDots,V1DotGeometric:old.candidateDotGeometric,V2DotGeometric:dots,originalNormals:oldPs.map(p=>p.slice(3,6)),V1Normals:old.candidateNormals,V2Normals:ps.map(p=>p.slice(3,6)),wasMixed};report.faceComparisons.push(q);
  assert(dots.every(v=>v>0),'Actual V2 normal still opposes its retained winding '+old.recordId+'/'+old.triangleOrdinal);assert(oldDots.every(v=>v>0));
  minDot=Math.min(minDot,...dots);minOldDot=Math.min(minOldDot,...oldDots);
 }return{faces:22,vertices:66,mixedFaces:mixed,minimumV2DotGeometric:minDot,minimumOriginalDotGeometric:minOldDot,strictOriginalCondition:'Every normal dot actual face normal > 0; unchanged from V1 strict probe'};});
const near=sampler(now,false),far=sampler(now,true),oldNear=sampler(base,false),oldFar=sampler(base,true);
check('All same 819 edge samples preserve V1 near/far support and original baseline reference',()=>{let n=0,maxNearDelta=0,maxFarDelta=0,maxNearGap=-Infinity,maxFarGap=-Infinity,minNearGap=Infinity;
 for(const e of oldProbe.blackScreenEdges){const m=now.meshes.find(m=>m.id===e.id),ps=face(m,e.triangleOrdinal);
  for(const p of e.points)assert(ps.some(q=>q[0]===p[0]&&q[1]===p[1]&&q[2]===p[2]),'Original edge point identity changed');
  for(const p of e.samples){const[x,y,z]=p.xyz,nn=near(x,z),ff=far(x,z),bn=oldNear(p.oldXYZ[0],p.oldXYZ[2]),bf=oldFar(p.oldXYZ[0],p.oldXYZ[2]);
   assert(nn.length&&ff.length&&bn.length&&bf.length,'Missing actual terrain support');const dn=nn[0].y-p.near[0].y,df=ff[0].y-p.far[0].y;
   assert.equal(dn,0,'Same near support changed');assert.equal(df,0,'Same far support changed');assert.equal(bn[0].y,p.oldNear[0].y);assert.equal(bf[0].y,p.oldFar[0].y);
   const gapN=y-nn[0].y,gapF=y-ff[0].y;maxNearDelta=Math.max(maxNearDelta,Math.abs(dn));maxFarDelta=Math.max(maxFarDelta,Math.abs(df));maxNearGap=Math.max(maxNearGap,gapN);maxFarGap=Math.max(maxFarGap,gapF);minNearGap=Math.min(minNearGap,gapN);
   report.supportComparisons.push({recordId:e.id,triangleOrdinal:e.triangleOrdinal,along:p.along,xyz:p.xyz,oldXYZ:p.oldXYZ,V1Near:p.near,V2Near:nn,V1Far:p.far,V2Far:ff,baselineNear:bn,baselineFar:bf,roadAboveNear:gapN,roadAboveFar:gapF});n++;
  }
 }assert.equal(n,819);return{samples:n,missingNear:0,missingFar:0,maximumV1ToV2NearDelta:maxNearDelta,maximumV1ToV2FarDelta:maxFarDelta,maximumRoadAboveNear:maxNearGap,minimumRoadAboveNear:minNearGap,maximumRoadAboveFar:maxFarGap,noWholeSurfaceProofClaimed:true};});
check('Frozen candidate source and original failed evidence remain unchanged',()=>{assert.equal(sha(fs.readFileSync(ROOT+'/src/genbu-entry.js')),SOURCE);assert.equal(sha(fs.readFileSync(EV+'/independent-v1-road-normal.json')),sha(oldFailureBytes));assert.equal(sha(fs.readFileSync(EV+'/independent-v1-road-edge.json')),sha(oldProbeBytes));return{sourceSHA256:SOURCE,priorEvidenceUnchanged:true};});
report.notMeasured=['V2 raster art acceptance or actual cost','Full Genbu public/native source checks','Water/column V2 changes','Worker release/reentry','Hardware FPS'];report.endUTC=new Date().toISOString();report.elapsedWallMs=performance.now()-begun;save();
console.log(JSON.stringify({output:OUT,sourceSHA256:SOURCE,passed:report.passed,checks:report.checks,elapsedWallMs:report.elapsedWallMs}));if(!report.passed)process.exitCode=1;
