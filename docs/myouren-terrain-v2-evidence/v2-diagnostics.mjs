// Only diagnose the two preserved V2 CLI1 failures. Do not rerun passed checks.
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import {triangles} from '../myouren-terrain-rebuild/tools/check-myouren-terrain.mjs';
const repo='/workspace/myouren-terrain-rebuild',read=p=>fs.readFileSync(repo+'/'+p),sha=b=>createHash('sha256').update(b).digest('hex'),start=performance.now(),sourceSHA=sha(read('src/myouren-terrain-rebuild.js')),checkerSHA=sha(read('tools/check-myouren-terrain.mjs'));
if(sourceSHA!=='f1c1c371951d5e3aaa49550c23a5c73b2d4fa7737cf7954328ac21fb7086f5c0')throw Error('Frozen V2 source changed');
const c=vm.createContext({performance,TextDecoder,TextEncoder});for(const p of JSON.parse(read('project.json')).worldBuilders)vm.runInContext(String(read(p)),c,{filename:p});
const G=c.GA,U=G.MYOUREN_TERRAIN_REBUILD,r=gunzipSync(read('assets/packs/overview.pack.gz')),pack=G.decodePack(r.buffer.slice(r.byteOffset,r.byteOffset+r.byteLength)),data=JSON.parse(read('data/atlas.json'));
const originals=pack.meshes.filter(m=>U.sourceIds.includes(m.id)).map(m=>({...m,index:m.index.slice()}));U.prepare(data,pack);
const dot=(a,b)=>a.reduce((n,v,k)=>n+v*b[k],0),sub=(a,b)=>a.slice(0,3).map((n,k)=>n-b[k]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],key=p=>p.slice(0,3).join(',');
const facets=U.outcrops.flatMap(r=>r.ring.map((a,i)=>({rock:r.id,face:i,p:[r.crest,a,r.ring[(i+1)%r.ring.length]]})));
function isActualRock(t){return facets.some(f=>{
 const [a,b,c]=f.p,n=cross(sub(b,a),sub(c,a)),L=Math.hypot(...n),unit=n.map(v=>v/L*(n[1]<0?-1:1)),den=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]);
 return t.p.every(p=>{const u=((b[2]-c[2])*(p[0]-c[0])+(c[0]-b[0])*(p[2]-c[2]))/den,v=((c[2]-a[2])*(p[0]-c[0])+(a[0]-c[0])*(p[2]-c[2]))/den,w=1-u-v;return Math.min(u,v,w)>=-1e-5&&Math.abs(dot(sub(p,a),n)/L)<.0001&&dot(unit,p.slice(3,6))>.999;});
});}
function onSegment(p,a,b){const d=sub(b,a),q=sub(p,a),u=dot(q,d)/dot(d,d);return u>=-1e-6&&u<=1+1e-6&&Math.hypot(...q.map((v,k)=>v-u*d[k]))<=.00006;}
const patchNear=pack.meshes.filter(m=>m.id.endsWith(':myouren-rebuild')&&!m.globalFar&&!m.cutOnly).flatMap(m=>triangles(m)),ringEdges=U.outcrops.flatMap(r=>r.ring.map((a,i)=>({rock:r.id,controlEdge:i,a,b:r.ring[(i+1)%r.ring.length]}))),edges=new Map();
for(const t of patchNear){const rock=isActualRock(t);for(let i=0;i<3;i++){const a=t.p[i],b=t.p[(i+1)%3],ring=ringEdges.find(r=>onSegment(a,r.a,r.b)&&onSegment(b,r.a,r.b));if(!ring)continue;const A=key(a),B=key(b),k=A<B?A+'|'+B:B+'|'+A;if(!edges.has(k))edges.set(k,{rock:ring.rock,controlEdge:ring.controlEdge,points:[a.slice(0,3),b.slice(0,3)],uses:[]});edges.get(k).uses.push({record:t.id,face:t.face,kind:rock?'rock':'earth',rgb:t.p[0].slice(6,9)});}}
const unmatched=[...edges.values()].filter(e=>e.uses.length!==2||!e.uses.some(u=>u.kind==='rock')||!e.uses.some(u=>u.kind==='earth'));
const missingControlEdges=ringEdges.filter(r=>![...edges.values()].some(e=>e.rock===r.rock&&e.controlEdge===r.controlEdge));

// Examine the actual facing triangle boundary edges on each side of the stair.
// Max-height sampling alone cannot distinguish a duplicate raised edge from a
// shared, watertight interface with the original protected central cut surface.
function boundarySegments(records,x){const out=[];for(const t of records.filter(m=>!m.globalFar&&m.cutOnly).flatMap(m=>triangles(m,[216,350,396,380]))){const cx=t.p.reduce((n,p)=>n+p[0]/3,0),side=x===288?(cx<x-1e-6?'wing':cx>x+1e-6?'central':null):(cx>x+1e-6?'wing':cx<x-1e-6?'central':null);if(!side)continue;for(let i=0;i<3;i++){const a=t.p[i],b=t.p[(i+1)%3];if(Math.abs(a[0]-x)>.00006||Math.abs(b[0]-x)>.00006||Math.abs(a[2]-b[2])<1e-7||Math.max(a[2],b[2])<354||Math.min(a[2],b[2])>378)continue;out.push({side,record:t.id,face:t.face,a:a.slice(0,3),b:b.slice(0,3)});}}return out;}
const segmentHeight=(s,z)=>s.a[1]+(s.b[1]-s.a[1])*(z-s.a[2])/(s.b[2]-s.a[2]);
function profile(segments){const rows=[];for(const z of [354,355,358,362,366,370,374,375,376,376.5,377,377.5,377.99,378]){const row={z};for(const side of ['wing','central'])row[side]=segments.filter(s=>s.side===side&&z>=Math.min(s.a[2],s.b[2])-1e-6&&z<=Math.max(s.a[2],s.b[2])+1e-6).map(s=>({record:s.record,face:s.face,height:segmentHeight(s,z)}));row.gaps=row.wing.flatMap(w=>row.central.map(c=>w.height-c.height));rows.push(row);}return rows;}
const cutRecords=pack.meshes.filter(m=>U.sourceIds.includes(m.id)||m.id.endsWith(':myouren-rebuild'));
const stairInterfaces=[288,312].map(x=>{const old=boundarySegments(originals,x),now=boundarySegments(cutRecords,x);return {x,oldSegments:old,newSegments:now,baselineProfile:profile(old),candidateProfile:profile(now)};});
const newGaps=stairInterfaces.flatMap(s=>s.candidateProfile.flatMap(row=>row.gaps.filter(g=>Math.abs(g)>.001).map(g=>({x:s.x,z:row.z,gap:g}))));
const report={schema:1,probeSHA:sha(fs.readFileSync(import.meta.filename)),checkerSHA,sourceSHA,originalCLI1Unchanged:true,originalReport:'/workspace/myouren-terrain-evidence/independent-v2.json',ringDiagnosis:{classifier:'Actual positions inside original control facet plus actual hard normal, independent of color',controlEdges:ringEdges.length,actualSharedEdges:edges.size,unmatched,missingControlEdges,passed:unmatched.length===0&&missingControlEdges.length===0,originalProtocolError:'The preflight hard-coded the V1 #909084 rock color. V2 uses #92968b, so every rock was falsely labelled earth.'},stairInterfaces,newGaps,CPUms:performance.now()-start};
if(sha(read('src/myouren-terrain-rebuild.js'))!==sourceSHA)throw Error('Source changed during diagnosis');fs.writeFileSync('/workspace/myouren-terrain-evidence/v2-diagnostics.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({sourceSHA,probeSHA:report.probeSHA,checkerSHA,ringDiagnosis:report.ringDiagnosis,newGaps,CPUms:report.CPUms}));if(newGaps.length||!report.ringDiagnosis.passed)process.exitCode=1;
