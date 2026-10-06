// Exact attribution of the face which stopped the single offline fold probe.
// No definitions, hooks, native build or GPU. Not a new candidate gate.
import fs from 'node:fs';import {deserialize}from'node:v8';import{createHash}from'node:crypto';import assert from'node:assert/strict';
const EV='/workspace/genbu-entry-evidence',ROOT='/workspace/genbu-entry-refinement',OUT=EV+'/independent-v2-degenerate-face.json';
assert(!fs.existsSync(OUT));const start=performance.now(),sha=b=>createHash('sha256').update(b).digest('hex');
const original=deserialize(fs.readFileSync(EV+'/baseline-native-arrays-v2/public-overview.v8'));
const candidate=deserialize(fs.readFileSync(EV+'/author-prepare-06-arrays/public.v8'));
const id='island:terrain:-1024:-512',ordinal=1220,m=candidate.meshes.find(m=>m.id===id),old=original.meshes.find(m=>m.id===id);
const face=(m,f)=>[0,1,2].map(k=>Array.from(m.vertices.subarray((m.index?m.index[f*3+k]:f*3+k)*9,(m.index?m.index[f*3+k]:f*3+k)*9+9)));
const ps=face(m,ordinal),center=[0,1,2].map(k=>ps.reduce((s,p)=>s+p[k]/3,0)),sub=(a,b)=>a.map((v,i)=>v-b[i]);
const u=sub(ps[1].slice(0,3),ps[0].slice(0,3)),v=sub(ps[2].slice(0,3),ps[0].slice(0,3));
const cr=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],matches=[];
for(let f=0;f<old.index.length/3;f++){const q=face(old,f),[a,b,c]=q,x=center[0],z=center[2],d=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]);if(Math.abs(d)<1e-10)continue;
 const U=((b[2]-c[2])*(x-c[0])+(c[0]-b[0])*(z-c[2]))/d,V=((c[2]-a[2])*(x-c[0])+(a[0]-c[0])*(z-c[2]))/d,W=1-U-V;
 if(Math.min(U,V,W)>=-1e-7)matches.push({recordId:id,triangleOrdinal:f,points:q.map(p=>p.slice(0,3)),oldActualHeight:U*a[1]+V*b[1]+W*c[1]});
}
const r={schema:1,kind:'Exact zero-area face which stopped the frozen west-bank fold diagnostic',sourceSHA256:sha(fs.readFileSync(ROOT+'/src/genbu-entry.js')),
 protocolSHA256:sha(fs.readFileSync(import.meta.filename)),originalFailedProtocolSHA256:sha(fs.readFileSync(EV+'/diagnose-v2-west-bank-folds.mjs')),
 oldPublicSnapshotSHA256:sha(fs.readFileSync(EV+'/baseline-native-arrays-v2/public-overview.v8')),candidateSnapshotSHA256:sha(fs.readFileSync(EV+'/author-prepare-06-arrays/public.v8')),
 recordId:id,triangleOrdinal:ordinal,indexValues:Array.from(m.index.subarray(ordinal*3,ordinal*3+3)),actualAttributes:ps,center,cross:cr,
 triangleDoubleArea:Math.hypot(...cr),insideRequestedDomain:center[0]>=-1014&&center[0]<=-965&&center[2]>=-556&&center[2]<=-498,
 baselineFacesAtSameXZ:matches,executed:{builds:0,hooks:0,nativeBuilds:0,GPUFrames:0},foldAndNormalStatisticsNotCompleted:true,
 notClaimed:['Zero-area face caused the raster wrinkles','Projection overlap is real occlusion','Candidate acceptance passed'],elapsedWallMs:performance.now()-start};
fs.writeFileSync(OUT,JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify(r));
