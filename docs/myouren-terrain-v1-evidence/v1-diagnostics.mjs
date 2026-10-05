// Read-only bounded diagnosis of the preserved c35 CLI1; not a replacement run.
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import {triangles,surfaceSampler} from '../myouren-terrain-rebuild/tools/check-myouren-terrain.mjs';
const repo='/workspace/myouren-terrain-rebuild',read=p=>fs.readFileSync(repo+'/'+p),sha=b=>createHash('sha256').update(b).digest('hex'),start=performance.now();
const sourceSHA=sha(read('src/myouren-terrain-rebuild.js'));
if(sourceSHA!=='c35c9af6051b927c5af2915eaa4090a5d1080d6e877823ec100c8d59c3f51db2')throw Error('c35 source changed before diagnosis');
const c=vm.createContext({performance,TextDecoder,TextEncoder});for(const p of JSON.parse(read('project.json')).worldBuilders)vm.runInContext(String(read(p)),c,{filename:p});
const G=c.GA,unpack=p=>{const r=gunzipSync(read(p));return G.decodePack(r.buffer.slice(r.byteOffset,r.byteOffset+r.byteLength));},pack=unpack('assets/packs/overview.pack.gz'),legacy=unpack('assets/packs/legacy.pack.gz'),data=JSON.parse(read('data/atlas.json'));
const roots=new Map();
for(const m of [...pack.meshes,...G.plantSubset(legacy,'myouren')]){
 if(!m.instances||!m.instanceColors||!(m.component==='trees'||m.id.includes(':legacy:plants:')))continue;
 let minY=Infinity;for(let i=1;i<m.vertices.length;i+=9)minY=Math.min(minY,m.vertices[i]);
 const low=[];for(let i=0;i<m.vertices.length;i+=9)if(m.vertices[i+1]<=minY+.2)low.push(Array.from(m.vertices.subarray(i,i+3)));
 for(let i=0;i<m.instances.length;i+=16){const a=m.instances.subarray(i,i+16),x=a[12],y=a[13]+minY*a[5],z=a[14];if(x<216||x>396||z<352||z>393)continue;
  const radius=Math.max(...low.map(p=>Math.hypot(a[0]*p[0]+a[8]*p[2],a[2]*p[0]+a[10]*p[2]))),k=[x,a[13],z].join(',');
  if(!roots.has(k))roots.set(k,{record:m.id,instance:i/16,x,y,z,radius,matrixTranslationY:a[13],prototypeMinY:minY,matrixSHA:sha(Buffer.from(a.buffer,a.byteOffset,a.byteLength))});else{const r=roots.get(k);r.y=Math.min(r.y,y);r.radius=Math.max(r.radius,radius);}
 }
}
const ids=G.MYOUREN_TERRAIN_REBUILD.sourceIds,old=pack.meshes.filter(m=>ids.includes(m.id)).map(m=>({...m,index:m.index.slice()})),bounds=[188,332,420,420],make=(list,far,cut)=>surfaceSampler(list.filter(m=>Boolean(m.globalFar)===far&&Boolean(m.cutOnly)===cut).flatMap(m=>triangles(m,bounds))),samplers={};
for(const far of [false,true])for(const cut of [false,true])samplers['old'+(far?'far':'near')+(cut?'Cut':'Normal')]=make(old,far,cut);
G.MYOUREN_TERRAIN_REBUILD.prepare(data,pack);
for(const far of [false,true])for(const cut of [false,true])samplers['new'+(far?'far':'near')+(cut?'Cut':'Normal')]=make(pack.meshes.filter(m=>ids.includes(m.id)||ids.some(id=>m.id===id+':myouren-rebuild')),far,cut);
const height=(s,x,z)=>{const hits=s(x,z);return hits.length?Math.max(...hits.map(t=>t.attributes[1])):null;};
const rootRows=[];for(const r of roots.values()){
 let nearError=0,farError=0;const missing=[];for(let j=0;j<=16;j++){const a=j?2*Math.PI*(j-1)/16:0,x=r.x+(j?r.radius*Math.cos(a):0),z=r.z+(j?r.radius*Math.sin(a):0),old=height(samplers.oldnearNormal,x,z),near=height(samplers.newnearNormal,x,z),far=height(samplers.newfarNormal,x,z);if(old===null||near===null||far===null)missing.push({x,z,old,near,far});else{nearError=Math.max(nearError,Math.abs(near-old));farError=Math.max(farError,Math.abs(far-near));}}rootRows.push({...r,samples:17,nearError,farError,missing});
}
const trace=[];for(const x of [288.5,289,289.5,290,290.5,291,291.5,308.5,309,309.5,310,310.5,311,311.5]){const row={x,z:378};for(const k of ['oldnearNormal','oldnearCut','newnearNormal','newnearCut'])row[k]=height(samplers[k],x,378);row.baselineDifference=row.oldnearNormal-row.oldnearCut;row.candidateDifference=row.newnearNormal-row.newnearCut;row.introducedDifference=row.candidateDifference-row.baselineDifference;trace.push(row);}
const report={schema:1,probeSHA:sha(fs.readFileSync(import.meta.filename)),sourceSHA,originalCLI1Unchanged:true,originalReport:'/workspace/myouren-terrain-evidence/independent-v1.json',rootRows,rootCoordinateDiagnosis:'The previous checker compared root base Y (translation plus prototype minimum Y) to matrix translation Y for instance17. This was a protocol error; the original failed assertion is preserved. This probe selects all actual original roots from public/native source prototypes.',trace,traceDiagnosis:'Compare candidate minus baseline differences. Existing unchanged central cut sibling divergence is not a new art-patch regression.',CPUms:performance.now()-start};
fs.writeFileSync('/workspace/myouren-terrain-evidence/v1-diagnostics.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
