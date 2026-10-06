// One offline, narrowly bounded geometric diagnosis. Not candidate acceptance.
// Immutable saved values only: zero definitions/hooks/native builds/GPU.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {deserialize} from 'node:v8';
import {createHash} from 'node:crypto';
const EV='/workspace/genbu-entry-evidence',ROOT='/workspace/genbu-entry-refinement';
const OUT=EV+'/independent-v2-west-bank-folds-02.json';
const SOURCE='dd991fadfa7ef3339ec0afe26fa10e9dd6ddcc09fcd41536f3501e4e874d3544';
const DOMAIN=[-1014,-556,-965,-498],IDS=['island:terrain:-1024:-768','island:terrain:-1024:-512'];
const start=performance.now(),sha=b=>createHash('sha256').update(b).digest('hex'),bindings={};
assert(!fs.existsSync(OUT));assert.equal(process.versions.node.split('.')[0],'22');
const load=p=>{const b=fs.readFileSync(p);bindings[p]={bytes:b.length,sha256:sha(b)};return b;};
const A=JSON.parse(load(EV+'/candidate-view-A/report.json'));
const original=JSON.parse(load(EV+'/baseline-native-source-v2.json'));
const author=JSON.parse(load(EV+'/author-prepare-06.json'));
assert.equal(sha(load(ROOT+'/src/genbu-entry.js')),SOURCE);assert.equal(author.sourceSHA,SOURCE);
assert.equal(A.inputsBefore['src/genbu-entry.js'],SOURCE);
assert.equal(A.protocolSHA,sha(load(EV+'/capture-view-A.py')));
assert.equal(A.specSHA,sha(load(EV+'/view-A-spec.json')));
assert.equal(A.HTMLSHA,'5480b1a3cca167bc49a1e20fe3f6601e9077bfc725f28f5eeee0e9332d2d4bbd');
const oldSnapshot=original.snapshots.find(s=>s.label==='public-overview');
const oldBytes=load(oldSnapshot.path);assert.equal(sha(oldBytes),oldSnapshot.sha256);
const oldPack=deserialize(oldBytes),newPack=deserialize(load(EV+'/author-prepare-06-arrays/public.v8'));
const r={schema:1,kind:'Offline Genbu V2 west bank and water-tail actual near-face fold/normal diagnosis',
 startedUTC:new Date().toISOString(),sourceSHA256:SOURCE,projectSHA256:A.inputsBefore['project.json'],
 protocolSHA256:sha(fs.readFileSync(import.meta.filename)),domain:DOMAIN,
 actualAProtocolSHA256:A.protocolSHA,actualASpecSHA256:A.specSHA,actualAHTMLSHA256:A.HTMLSHA,
 bindings,executed:{builds:0,definitionModules:0,overviewHooks:0,nativeBuilds:0,GPUFrames:0},
 diagnosticOnly:true,passedCandidateAcceptance:false,priorFailuresPreserved:[
  {path:EV+'/independent-v2-source-final-ledger.json',sha256:sha(load(EV+'/independent-v2-source-final-ledger.json'))},
  {path:EV+'/independent-v1-road-normal.json',sha256:sha(load(EV+'/independent-v1-road-normal.json'))}],
 limitation:'Exact geometry and stored normals only. No screen overlap is treated as actual occlusion. No new camera, source, budget or acceptance assertion.'};
const count=m=>(m.index?.length??m.vertices.length/9)/3;
const face=(m,f)=>[0,1,2].map(k=>{const i=(m.index?m.index[f*3+k]:f*3+k)*9;return Array.from(m.vertices.subarray(i,i+9));});
const sub=(a,b)=>a.map((v,i)=>v-b[i]),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>{const l=Math.hypot(...a);return l?a.map(v=>v/l):null;};
const angle=(a,b)=>Math.acos(Math.max(-1,Math.min(1,dot(norm(a),norm(b)))))*180/Math.PI;
const contains=(x,z)=>x>=DOMAIN[0]&&x<=DOMAIN[2]&&z>=DOMAIN[1]&&z<=DOMAIN[3];
const pointKey=p=>p.map(v=>v===0?0:v).join(',');
const geometric=ps=>norm(cross(sub(ps[1].slice(0,3),ps[0].slice(0,3)),sub(ps[2].slice(0,3),ps[0].slice(0,3))));
function interpolate(ps,x,z){
 const[a,b,c]=ps,d=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]);if(Math.abs(d)<1e-10)return null;
 const u=((b[2]-c[2])*(x-c[0])+(c[0]-b[0])*(z-c[2]))/d;
 const v=((c[2]-a[2])*(x-c[0])+(a[0]-c[0])*(z-c[2]))/d,w=1-u-v;
 if(Math.min(u,v,w)<-1e-7)return null;return a.map((_,k)=>u*a[k]+v*b[k]+w*c[k]);
}
const zeroFaces={baseline:[],candidate:[]};
function inventory(pack,label){
 const out=[];for(const id of IDS){const m=pack.meshes.find(m=>m.id===id);assert(m&&m.globalNear&&!m.cutOnly);
  for(let f=0;f<count(m);f++){const ps=face(m,f),xs=ps.map(p=>p[0]),zs=ps.map(p=>p[2]);
   if(Math.max(...xs)<DOMAIN[0]-16||Math.min(...xs)>DOMAIN[2]+16||Math.max(...zs)<DOMAIN[1]-16||Math.min(...zs)>DOMAIN[3]+16)continue;
   const gn=geometric(ps),center=[0,1,2].map(k=>ps.reduce((s,p)=>s+p[k]/3,0));
   if(!gn){zeroFaces[label].push({recordId:id,triangleOrdinal:f,points:ps,center,insideRequestedDomain:contains(center[0],center[2])});continue;}
   out.push({recordId:id,triangleOrdinal:f,points:ps,normal:gn,center});
  }
 }return out;
}
const oldFaces=inventory(oldPack,'baseline'),newFaces=inventory(newPack,'candidate');
const bins=new Map();
for(const f of oldFaces){const xs=f.points.map(p=>p[0]),zs=f.points.map(p=>p[2]);
 for(let x=Math.floor(Math.min(...xs)/8);x<=Math.floor(Math.max(...xs)/8);x++)
  for(let z=Math.floor(Math.min(...zs)/8);z<=Math.floor(Math.max(...zs)/8);z++){
   const k=x+','+z;if(!bins.has(k))bins.set(k,[]);bins.get(k).push(f);
  }}
function oldAt(x,z){for(const f of bins.get(Math.floor(x/8)+','+Math.floor(z/8))||[]){const a=interpolate(f.points,x,z);if(a)return{f,a};}return null;}
const observations=[],edgeMap=new Map();
let negativeCandidateDots=0,negativeOldDots=0;
for(const f of newFaces){
 const old=oldAt(f.center[0],f.center[2]);assert(old,'Original face absent at candidate centre');
 f.old=old.f;
 if(contains(f.center[0],f.center[2])){
  const normalAngles=f.points.map(p=>angle(p.slice(3,6),f.normal));
  const oldNormals=f.points.map(p=>{const o=oldAt(p[0],p[2]);assert(o);return o.a.slice(3,6);});
  const oldAngles=oldNormals.map(n=>angle(n,old.f.normal));
  const vertexDots=f.points.map(p=>dot(norm(p.slice(3,6)),f.normal));
  const oldDots=oldNormals.map(n=>dot(norm(n),old.f.normal));
  negativeCandidateDots+=vertexDots.filter(d=>d<=0).length;negativeOldDots+=oldDots.filter(d=>d<=0).length;
  const q={recordId:f.recordId,triangleOrdinal:f.triangleOrdinal,center:f.center,
   points:f.points.map(p=>p.slice(0,3)),candidateGeometricNormal:f.normal,
   candidateStoredNormals:f.points.map(p=>p.slice(3,6)),candidateStoredToActualFaceAnglesDegrees:normalAngles,
   oldReference:{recordId:old.f.recordId,triangleOrdinal:old.f.triangleOrdinal,actualOriginalPoints:old.f.points.map(p=>p.slice(0,3)),
    geometricNormal:old.f.normal,storedNormalsAtSameCandidateXZ:oldNormals,storedToOriginalFaceAnglesDegrees:oldAngles},
   candidateHeightChangeAtCentroid:f.center[1]-old.a[1],
   geometricNormalChangeDegrees:angle(f.normal,old.f.normal),
   maximumStoredNormalMismatchDegrees:Math.max(...normalAngles),
   baselineMaximumStoredNormalMismatchAtSameXZDegrees:Math.max(...oldAngles),
   addedMaximumStoredNormalMismatchDegrees:Math.max(...normalAngles)-Math.max(...oldAngles)};
  observations.push(q);
 }
 for(let e=0;e<3;e++){
  const p=f.points[e],q=f.points[(e+1)%3],key=[pointKey([p[0],p[2]]),pointKey([q[0],q[2]])].sort().join('|');
  if(!edgeMap.has(key))edgeMap.set(key,[]);edgeMap.get(key).push({f,p,q});
 }
}
const adjacent=[],gaps=[],multiple=[];let boundaryEdges=0;
for(const group of edgeMap.values()){
 const first=group[0],mid=[(first.p[0]+first.q[0])/2,(first.p[2]+first.q[2])/2];if(!contains(...mid))continue;
 if(group.length===1){boundaryEdges++;continue;}
 if(group.length!==2){multiple.push({mid,faces:group.map(q=>[q.f.recordId,q.f.triangleOrdinal])});continue;}
 const[a,b]=group,match=p=>[b.p,b.q].find(q=>p[0]===q[0]&&p[2]===q[2]);assert(match(a.p)&&match(a.q));
 const gap=Math.max(Math.abs(a.p[1]-match(a.p)[1]),Math.abs(a.q[1]-match(a.q)[1]));
 const candidateAngle=angle(a.f.normal,b.f.normal),originalAngle=angle(a.f.old.normal,b.f.old.normal);
 const storedJump=Math.max(angle(a.p.slice(3,6),match(a.p).slice(3,6)),angle(a.q.slice(3,6),match(a.q).slice(3,6)));
 const originalPlaneAtA=a.f.old,originalPlaneAtB=b.f.old;
 const oldStoredJump=Math.max(...[a.p,a.q].map(p=>{
  const n=interpolate(originalPlaneAtA.points,p[0],p[2]),m=interpolate(originalPlaneAtB.points,p[0],p[2]);
  return n&&m?angle(n.slice(3,6),m.slice(3,6)):0;
 }));
 const item={edge:[a.p.slice(0,3),a.q.slice(0,3)],midpointXZ:mid,
  adjacentCandidateFaces:[{recordId:a.f.recordId,triangleOrdinal:a.f.triangleOrdinal,center:a.f.center,geometricNormal:a.f.normal},
   {recordId:b.f.recordId,triangleOrdinal:b.f.triangleOrdinal,center:b.f.center,geometricNormal:b.f.normal}],
  baselineFacesAtSameTwoCentroids:[{recordId:a.f.old.recordId,triangleOrdinal:a.f.old.triangleOrdinal,geometricNormal:a.f.old.normal},
   {recordId:b.f.old.recordId,triangleOrdinal:b.f.old.triangleOrdinal,geometricNormal:b.f.old.normal}],
  candidateFoldAngleDegrees:candidateAngle,baselineFoldAngleDegrees:originalAngle,
  addedFoldAngleDegrees:candidateAngle-originalAngle,storedEndpointNormalJumpDegrees:storedJump,
  baselineEndpointNormalJumpDegrees:oldStoredJump,addedStoredEndpointNormalJumpDegrees:storedJump-oldStoredJump,
  actualSharedEndpointHeightGap:gap};
 adjacent.push(item);if(gap>0)gaps.push(item);
}
const hist=(a,key)=>Object.fromEntries([5,10,20,30,45,60,90].map(t=>['greaterThan'+t,a.filter(q=>q[key]>t).length]));
const top=(a,key,n=6)=>a.slice().sort((a,b)=>b[key]-a[key]).slice(0,n);
const xzTriangleKey=ps=>ps.map(p=>pointKey([p[0],p[2]])).sort().join('|');
const oldZeroKeys=new Set(zeroFaces.baseline.map(f=>xzTriangleKey(f.points)));
const zeroClassified=zeroFaces.candidate.map(f=>{const hit=oldAt(f.center[0],f.center[2]);
 const exactInherited=oldZeroKeys.has(xzTriangleKey(f.points));
 return{...f,classification:exactInherited?'Inherited actual zero-area face with exactly the same XZ triangle':hit?'Candidate zero-area triangle absent from baseline zero-face set at same XZ; retriangulation creates this primitive':'Unable to attribute to baseline within bounded saved planes',
  baselineAtSameCentre:hit?{recordId:hit.f.recordId,triangleOrdinal:hit.f.triangleOrdinal,points:hit.f.points.map(p=>p.slice(0,3)),geometricNormal:hit.f.normal,height:hit.a[1]}:null,
  noHoleOrRasterCauseClaim:true};});
r.zeroAreaFaces={baselineInPaddedDomain:zeroFaces.baseline.length,candidateInPaddedDomain:zeroFaces.candidate.length,
 baselineInRequestedDomain:zeroFaces.baseline.filter(f=>f.insideRequestedDomain).length,candidateInRequestedDomain:zeroClassified.filter(f=>f.insideRequestedDomain).length,
 classifications:Object.fromEntries([...new Set(zeroClassified.map(f=>f.classification))].map(k=>[k,zeroClassified.filter(f=>f.classification===k).length])),
 exactExamples:zeroClassified.filter(f=>f.insideRequestedDomain).concat(zeroClassified.filter(f=>!f.insideRequestedDomain)).slice(0,6),
 normalUndefinedForTheseActualFaces:true,normalStatisticsExcludeUndefinedFacesExplicitly:true,
 originalStrictNondegenerateConditionPassed:zeroFaces.baseline.length===0&&zeroFaces.candidate.length===0,
 originalCLI1Preserved:{path:EV+'/independent-v2-west-bank-folds-execution.json',sha256:sha(load(EV+'/independent-v2-west-bank-folds-execution.json'))}};
r.counts={actualBaselineFacesInPaddedDomain:oldFaces.length,actualCandidateFacesInPaddedDomain:newFaces.length,
 candidateFaceCentresInDomain:observations.length,actualPairedCandidateEdgesInDomain:adjacent.length,
 unpairedFullEdgesInDomain:boundaryEdges,moreThanTwoFaceFullEdges:multiple.length,
 candidateNormalsOpposingActualWinding:negativeCandidateDots,baselineNormalsOpposingSameReferenceWinding:negativeOldDots,
 addedFoldAngleHistogramDegrees:hist(adjacent,'addedFoldAngleDegrees'),
 addedStoredNormalMismatchHistogramDegrees:hist(observations,'addedMaximumStoredNormalMismatchDegrees'),
 storedEndpointNormalJumpHistogramDegrees:hist(adjacent,'addedStoredEndpointNormalJumpDegrees'),
 exactXZSharedEdgesWithDifferentEndpointY:gaps.length,
 maximumMatchedEndpointHeightGap:gaps.length?Math.max(...gaps.map(q=>q.actualSharedEndpointHeightGap)):0};
r.strongestAddedActualFolds=top(adjacent,'addedFoldAngleDegrees');
r.strongestAddedStoredNormalMismatch=top(observations,'addedMaximumStoredNormalMismatchDegrees');
r.strongestAddedEndpointNormalJumps=top(adjacent,'addedStoredEndpointNormalJumpDegrees',3);
r.matchedEndpointGaps=top(gaps,'actualSharedEndpointHeightGap',3);
r.interpretation={
 actualAddedFoldEvidence:r.counts.addedFoldAngleHistogramDegrees.greaterThan10>0,
 actualAddedStoredNormalMismatchEvidence:r.counts.addedStoredNormalMismatchHistogramDegrees.greaterThan10>0,
 note:'Angles are diagnostic observations, not replacement tolerances or acceptance. Stored smooth vertex normals need not equal each flat triangle; the same-XZ baseline is supplied. Unpaired full edges can be ordinary triangulation/T junctions and are not asserted to be holes.',
 noVisibilityOrOcclusionClaim:true,noRasterArtPassClaim:true};
assert.equal(sha(fs.readFileSync(ROOT+'/src/genbu-entry.js')),SOURCE);
assert.equal(sha(fs.readFileSync(EV+'/capture-view-A.py')),A.protocolSHA);
assert.equal(sha(fs.readFileSync(EV+'/view-A-spec.json')),A.specSHA);
r.diagnosticCompleted=true;r.strictDiagnosticPassed=r.zeroAreaFaces.originalStrictNondegenerateConditionPassed;
r.endedUTC=new Date().toISOString();r.elapsedWallMs=performance.now()-start;
assert(r.elapsedWallMs<30000,'Bounded diagnostic exceeded its 30 second limit');
fs.writeFileSync(OUT,JSON.stringify(r,null,2)+'\n');
console.log(JSON.stringify({output:OUT,sourceSHA256:SOURCE,protocolSHA256:r.protocolSHA256,
 elapsedWallMs:r.elapsedWallMs,counts:r.counts,interpretation:r.interpretation,
 largestFold: r.strongestAddedActualFolds[0]?.addedFoldAngleDegrees,
 largestMismatch: r.strongestAddedStoredNormalMismatch[0]?.addedMaximumStoredNormalMismatchDegrees,zeroAreaFaces:r.zeroAreaFaces}));
if(!r.strictDiagnosticPassed)process.exitCode=1;
