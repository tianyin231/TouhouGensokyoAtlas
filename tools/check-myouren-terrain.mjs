// Independent bounded CPU preflight for actual-terrain replacement.
// No WebGL, native-region build, fixture mutation, or navigation acceptance.
// The assertions below describe the authorized footprint and real source faces;
// they do not use the candidate's sampler or claimed coverage/byte counts.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import fs from 'node:fs';
import vm from 'node:vm';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const read=p=>fs.readFileSync(resolve(root,p));
const sha=a=>createHash('sha256').update(a).digest('hex');
const fields=['vertices','farVertices','index','instances','instanceColors'];
const hashView=a=>sha(Buffer.from(a.buffer,a.byteOffset,a.byteLength));
const metadata=m=>JSON.stringify(m,(k,v)=>fields.includes(k)?undefined:v);
const sourceIds=[0,256].flatMap(x=>['',':far',':cut',':cut:far'].map(s=>'island:terrain:'+x+':256'+s));
const wallId='island:inspection-walls',stoneId='overview:myouren:hlod:architecture:myouren:1:1:templeStone';
const nearBoxes=[[218,354,288,391],[312,354,394,391]],farBox=[192,336,416,416];
const knownRoots=[
 ['overview:village:trees',271,230.314453125,81.83424377441406,359.1158752441406,.5196528687094574],
 ['overview:village:trees',285,217.8450927734375,81.88619232177734,356.60345458984375,.46699707267185503],
 ['overview:village:trees',286,222.86842346191406,83.4708480834961,366.99566650390625,.31704078700399263],
 ['overview:myouren:trees',12,262.4426574707031,87.17833709716797,370.53851318359375,.5049736096097576],
 ['overview:myouren:trees',13,272.57977294921875,89.94184875488281,372.4967041015625,.5252681300147442],
 ['overview:myouren:trees',17,321.1407165527344,88.26381341854308,371.2571105957031,.35195803272422965]
];

export function triangles(m,bounds){
 const a=m.vertices,ix=m.index,n=ix?ix.length:a.length/9,out=[];
 assert.equal(a.constructor.name,'Float32Array','Interleaved Float32 source '+m.id);
 assert.equal(a.length%9,0,'Incomplete attributes '+m.id);
 assert.equal(n%3,0,'Incomplete triangles '+m.id);
 if(ix)assert.equal(ix.constructor.name,'Uint32Array','Expected Uint32 index '+m.id);
 for(let j=0;j<n;j+=3){
  const ids=[0,1,2].map(k=>ix?ix[j+k]:j+k);
  assert(ids.every(v=>Number.isInteger(v)&&v>=0&&v<a.length/9),'Out-of-bounds index '+m.id+'/'+j/3);
  const p=ids.map(i=>Array.from(a.subarray(i*9,i*9+9)));
  if(bounds&&(Math.max(...p.map(q=>q[0]))<bounds[0]||Math.min(...p.map(q=>q[0]))>bounds[2]||Math.max(...p.map(q=>q[2]))<bounds[1]||Math.min(...p.map(q=>q[2]))>bounds[3]))continue;
  out.push({id:m.id,face:j/3,p});
 }
 return out;
}

// Independently evaluate the actual indexed triangle planes. Multiple hits are
// retained, so a missing surface cannot be hidden by an author-provided fallback.
export function surfaceSampler(ts){
 const bins=new Map();
 for(const t of ts)for(let x=Math.floor(Math.min(...t.p.map(p=>p[0]))/8);x<=Math.floor(Math.max(...t.p.map(p=>p[0]))/8);x++)for(let z=Math.floor(Math.min(...t.p.map(p=>p[2]))/8);z<=Math.floor(Math.max(...t.p.map(p=>p[2]))/8);z++){
  const k=x+':'+z;if(!bins.has(k))bins.set(k,[]);bins.get(k).push(t);
 }
 return (x,z)=>{
  const hits=[];
  for(const t of bins.get(Math.floor(x/8)+':'+Math.floor(z/8))||[]){
   const [a,b,c]=t.p,d=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]);
   if(Math.abs(d)<1e-10)continue;
   const u=((b[2]-c[2])*(x-c[0])+(c[0]-b[0])*(z-c[2]))/d,v=((c[2]-a[2])*(x-c[0])+(a[0]-c[0])*(z-c[2]))/d,w=1-u-v;
   if(Math.min(u,v,w)<-1e-7)continue;
   hits.push({id:t.id,face:t.face,attributes:a.map((n,k)=>n*u+b[k]*v+c[k]*w)});
  }
  return hits;
 };
}
function heightAt(sample,x,z){const hits=sample(x,z);return hits.length?Math.max(...hits.map(h=>h.attributes[1])):null;}
function buffers(value,result=new Set(),seen=new Set()){
 if(!value||typeof value!=='object'||seen.has(value))return result;seen.add(value);
 if(ArrayBuffer.isView(value)){result.add(value.buffer);return result;}
 if(value.constructor?.name==='ArrayBuffer'){result.add(value);return result;}
 for(const v of Object.values(value))buffers(v,result,seen);
 return result;
}
function subsequence(old,next){let j=0;for(let i=0;i<old.length&&j<next.length;i+=3)if(old[i]===next[j]&&old[i+1]===next[j+1]&&old[i+2]===next[j+2])j+=3;return j===next.length;}
const inside=(x,z,b)=>x>=b[0]&&x<=b[2]&&z>=b[1]&&z<=b[3];

async function main(){
 const started=performance.now(),checkerSHA=sha(fs.readFileSync(import.meta.filename)),checks=[];
 const run=(name,fn)=>{try{const result=fn();checks.push({name,passed:true,result});}catch(e){checks.push({name,passed:false,error:e.message,...(e.result?{result:e.result}:{})});}};
 const failRows=(rows,message)=>{if(rows.length){const e=new Error(message+' ('+rows.length+')');e.result=rows;throw e;}};
 const context=vm.createContext({performance,TextDecoder,TextEncoder}),project=JSON.parse(read('project.json'));
 for(const p of project.worldBuilders)vm.runInContext(String(read(p)),context,{filename:p});
 const G=context.GA,U=G.MYOUREN_TERRAIN_REBUILD,data=JSON.parse(read('data/atlas.json'));
 assert(U?.prepare,'Actual candidate API absent');
 const raw=gunzipSync(read('assets/packs/overview.pack.gz')),pack=G.decodePack(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength));
 const targetSet=new Set([...sourceIds,stoneId,wallId]);
 const original=new Map(pack.meshes.map(m=>[m.id,{record:m,meta:metadata(m),arrays:Object.fromEntries(fields.filter(k=>m[k]).map(k=>[k,{ref:m[k],hash:hashView(m[k])}]))}]));
 const oldTerrain=sourceIds.map(id=>{const m=pack.meshes.find(r=>r.id===id);assert(m,'Missing original '+id);return {...m,index:m.index.slice()};});
 const oldIndices=new Map([...oldTerrain.map(m=>[m.id,m.index]),[stoneId,pack.meshes.find(m=>m.id===stoneId).index.slice()]]);
 const originalReachable=buffers([pack,data]),refs=pack.meshes.flatMap(m=>fields.filter(k=>m[k]).map(k=>({id:m.id,k,a:m[k]})));
 run('exclusive original index byte ranges',()=>{
  const overlaps=[];
  for(const id of [...sourceIds,stoneId]){const a=original.get(id).record.index;for(const r of refs)if(r.a!==a&&r.a.buffer===a.buffer&&a.byteOffset<r.a.byteOffset+r.a.byteLength&&r.a.byteOffset<a.byteOffset+a.byteLength)overlaps.push({id,other:r.id,field:r.k});}
  failRows(overlaps,'Mutable original index overlaps another source view');return {records:9,publicRecords:pack.meshes.length,overlaps:0};
 });
 const prepareAt=performance.now();U.prepare(data,pack);const prepareCPUms=performance.now()-prepareAt,meta=U.metadata.get(pack),added=pack.meshes.filter(m=>!original.has(m.id));
 const select=(list,far,cut)=>list.filter(m=>Boolean(m.globalFar)===far&&Boolean(m.cutOnly)===cut);
 const surfaceBounds=[188,332,420,420],samplers={};
 for(const far of [false,true])for(const cut of [false,true]){
  const k=(far?'far':'near')+(cut?'Cut':'Normal');samplers['old'+k]=surfaceSampler(select(oldTerrain,far,cut).flatMap(m=>triangles(m,surfaceBounds)));
  samplers['new'+k]=surfaceSampler(select(pack.meshes.filter(m=>sourceIds.includes(m.id)||sourceIds.some(id=>m.id===id+':myouren-rebuild')),far,cut).flatMap(m=>triangles(m,surfaceBounds)));
 }
 run('new reachable typed backing includes contact and cut trace',()=>{
  const all=buffers([pack,data,meta]),newBuffers=[...all].filter(b=>!originalReachable.has(b)),actual=newBuffers.reduce((s,b)=>s+b.byteLength,0);
  assert(actual<=.6*1048576,'New backing exceeds 0.6MiB: '+actual);assert.equal(meta.sourceBytes,actual,'Claimed sourceBytes omits reachable new backing');
  assert.equal(data.myourenTerrainRebuild.contact.constructor.name,'Float32Array');assert.equal(meta.cutTrace.constructor.name,'Float32Array');
  return {actual,budget:.6*1048576,newBuffers:newBuffers.length,contactBytes:data.myourenTerrainRebuild.contact.byteLength,cutTraceBytes:meta.cutTrace.byteLength,removedFaceOrdinals:meta.changes.reduce((n,c)=>n+c.removedFaces.length,0),JSHeapBytesMeasured:false};
 });
 run('all non-target public source bytes and metadata retained',()=>{
  const bad=[];for(const [id,s]of original){if(targetSet.has(id))continue;const m=pack.meshes.find(r=>r.id===id);if(!m||metadata(m)!==s.meta||Object.entries(s.arrays).some(([k,a])=>m[k]!==a.ref||hashView(m[k])!==a.hash))bad.push(id);}
  failRows(bad,'Non-target source changed');return {unchanged:original.size-targetSet.size};
 });
 run('original terrain attributes and retained index faces unchanged',()=>{
  const rows=[];for(const id of [...sourceIds,stoneId]){const s=original.get(id),m=pack.meshes.find(r=>r.id===id);assert.equal(metadata(m),s.meta,'Metadata changed '+id);assert.equal(m.vertices,s.arrays.vertices.ref,'Original vertex identity changed '+id);assert.equal(hashView(m.vertices),s.arrays.vertices.hash,'Original attributes changed '+id);assert(m.index.buffer===s.arrays.index.ref.buffer&&m.index.byteOffset===s.arrays.index.ref.byteOffset,'Original index not compacted in own range '+id);assert(subsequence(oldIndices.get(id),m.index),'Retained source faces rewritten/reordered '+id);rows.push({id,before:oldIndices.get(id).length/3,after:m.index.length/3});}
  assert.equal(oldIndices.get(stoneId).length/3-pack.meshes.find(m=>m.id===stoneId).index.length/3,4872,'Wrong cold facing count');return rows;
 });
 run('added eight siblings preserve public ownership and cache identity',()=>{
  assert.equal(added.length,8,'Unexpected added public records');const used=new Map();for(const m of pack.meshes){const prior=used.get(m.vertices);if(prior)assert(prior.index===m.index,'One vertices object has distinct indices: '+prior.id+'/'+m.id);used.set(m.vertices,m);}
  return added.map(m=>{const id=m.id.replace(/:myouren-rebuild$/,''),s=original.get(id);assert(s,'Unexpected patch id '+m.id);for(const k of ['owner','region','group','material','center','radius','globalNear','globalFar','globalSurface','cutOnly','cutReplace','component','tile'])assert.deepEqual(m[k],s.record[k],'Patch flag changed '+m.id+'/'+k);return {id:m.id,triangles:m.index.length/3};});
 });
 run('actual added and replacement wall arrays finite with valid indices',()=>{
  let minimumArea=Infinity;const rows=[];
  for(const m of [...added,pack.meshes.find(r=>r.id===wallId)]){assert(m.vertices.every(Number.isFinite),'Nonfinite attributes '+m.id);let bad=0;for(const t of triangles(m)){const [a,b,c]=t.p,u=b.map((n,k)=>n-a[k]),v=c.map((n,k)=>n-a[k]),area=Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])/2;minimumArea=Math.min(minimumArea,area);if(area<=1e-8)bad++;}assert.equal(bad,0,'Degenerate added faces '+m.id);rows.push({id:m.id,triangles:m.index.length/3});}return {rows,minimumArea};
 });
 run('six actual original tree footprints preserve near support and match far',()=>{
  const rows=[],bad=[];for(const [record,instance,x,y,z,radius]of knownRoots){const m=pack.meshes.find(r=>r.id===record);assert(m?.instances,'Original root record missing '+record);const M=Array.from(m.instances.subarray(instance*16,instance*16+16));assert(Math.hypot(M[12]-x,M[13]-y,M[14]-z)<.00001,'Original root matrix differs '+record+'/'+instance);let nearError=0,farError=0;for(let j=0;j<=16;j++){const a=j?2*Math.PI*(j-1)/16:0,X=x+(j?radius*Math.cos(a):0),Z=z+(j?radius*Math.sin(a):0),old=heightAt(samplers.oldnearNormal,X,Z),n=heightAt(samplers.newnearNormal,X,Z),f=heightAt(samplers.newfarNormal,X,Z);if(old===null||n===null||f===null){bad.push({record,instance,X,Z,old,n,f});continue;}nearError=Math.max(nearError,Math.abs(n-old));farError=Math.max(farError,Math.abs(f-n));}rows.push({record,instance,radius,nearError,farError});if(nearError>.001||farError>.03)bad.push(rows.at(-1));}failRows(bad,'Tree support lost or altered');return {samplesPerRoot:17,nearTolerance:.001,farNearTolerance:.03,rows};
 });
 run('near central stair and protected platform surfaces unchanged',()=>{
  const pts=[];for(let x=288;x<=312;x+=2)for(let z=354;z<=391;z+=2)pts.push([x,z]);for(let x=218;x<=394;x+=4)for(const z of [389.6,390,391,392,394,400,416])pts.push([x,z]);for(let x=248;x<=354;x+=4)for(let z=336;z<=362;z+=2)pts.push([x,z]);for(let x=352;x<=398;x+=4)for(let z=320;z<=376;z+=4)pts.push([x,z]);const bad=[];let maxError=0,checked=0;for(const [x,z]of pts){const old=heightAt(samplers.oldnearNormal,x,z),next=heightAt(samplers.newnearNormal,x,z);if(old===null)continue;checked++;if(next===null)bad.push({x,z,old,next});else{const e=Math.abs(next-old);maxError=Math.max(maxError,e);if(e>.001)bad.push({x,z,old,next,e});}}failRows(bad,'Protected near support differs');return {checked,maxError,tolerance:.001};
 });
 run('cut siblings retain ground outside the actual inspection hole',()=>{
  const bad=[],rows=[];for(const x of [194,196,200,204,206])for(const z of [380,382,390,405,414])for(const far of [false,true]){const k=far?'farCut':'nearCut',old=heightAt(samplers['old'+k],x,z),next=heightAt(samplers['new'+k],x,z);if(old===null)continue;rows.push({x,z,lod:far?'far':'near',old,next});if(next===null)bad.push(rows.at(-1));}failRows(bad,'Cut sibling lost original ground outside x208 inspection boundary');return {rows};
 });
 run('near and far x256 sibling seam coverage',()=>{
  const bad=[];let checked=0,maxJump=0;for(const far of [false,true])for(const cut of [false,true])for(let z=336;z<=416;z+=.5){if(cut&&z>378)continue;const k=(far?'far':'near')+(cut?'Cut':'Normal'),s=samplers['new'+k],old=samplers['old'+k],a=heightAt(s,255.99,z),b=heightAt(s,256.01,z);if(heightAt(old,255.99,z)===null||heightAt(old,256.01,z)===null)continue;checked++;if(a===null||b===null)bad.push({k,z,a,b});else{const jump=Math.abs(a-b);maxJump=Math.max(maxJump,jump);if(jump>.15)bad.push({k,z,a,b,jump});}}failRows(bad,'Sibling seam missing or discontinuous');return {checked,maxJump,probeSeparation:.02,maxAllowedJump:.15};
 });
 run('normal and cut siblings share actual z378 upper trace',()=>{
  const bad=[];let checked=0,maxError=0;for(const far of [false,true])for(let x=218;x<=394;x+=.5){const k=far?'far':'near',a=heightAt(samplers['new'+k+'Normal'],x,378),b=heightAt(samplers['new'+k+'Cut'],x,378);checked++;if(a===null||b===null)bad.push({k,x,a,b});else{maxError=Math.max(maxError,Math.abs(a-b));if(Math.abs(a-b)>.001)bad.push({k,x,a,b,error:Math.abs(a-b)});}}failRows(bad,'Cut trace differs from normal actual surface');return {checked,maxError,tolerance:.001};
 });
 run('far outer envelope preserves actual old support',()=>{
  const pts=[];for(let x=192;x<=416;x+=2)pts.push([x,336],[x,416]);for(let z=336;z<=416;z+=2)pts.push([192,z],[416,z]);const bad=[];let maxError=0,checked=0;for(const [x,z]of pts){const a=heightAt(samplers.oldfarNormal,x,z),b=heightAt(samplers.newfarNormal,x,z);if(a===null)continue;checked++;if(b===null)bad.push({x,z,a,b});else{maxError=Math.max(maxError,Math.abs(a-b));if(Math.abs(a-b)>.001)bad.push({x,z,a,b,error:Math.abs(a-b)});}}failRows(bad,'Far envelope changed old outer support');return {checked,maxError,tolerance:.001};
 });
 const report={schema:1,checkerSHA,sourceSHA:sha(read('src/myouren-terrain-rebuild.js')),projectSHA:sha(read('project.json')),sourceAssetSHA:sha(read('assets/packs/overview.pack.gz')),node:process.version,prepareCPUms,elapsedCPUms:performance.now()-started,checks,passed:checks.every(c=>c.passed),passedChecks:checks.filter(c=>c.passed).length,totalChecks:checks.length,
  scope:'Bounded decoded public source prepare and independent actual indexed-face sampling. No native/detail build, no WebGL, no full Node regression.',
  notRun:['Independent retained-fragment barycentric attribute proof','All deleted-face authorized polygon proof','Native detail shrub clump/source protection','Navigation/visible floor adapter and actual input','Renderer draw/tri/residency/reentry and visual acceptance'],
  sourceTriangleDeltas:sourceIds.map(id=>({id,before:oldIndices.get(id).length/3,after:pack.meshes.filter(m=>m.id===id||m.id===id+':myouren-rebuild').reduce((n,m)=>n+m.index.length/3,0)}))};
 const at=process.argv.indexOf('--output'),output=at>=0?resolve(process.argv[at+1]):null;if(output)fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({output,checkerSHA,sourceSHA:report.sourceSHA,passed:report.passed,passedChecks:report.passedChecks,totalChecks:report.totalChecks,prepareCPUms,elapsedCPUms:report.elapsedCPUms,failures:checks.filter(c=>!c.passed).map(c=>({name:c.name,error:c.error,result:c.result}))}));if(!report.passed)process.exitCode=1;
}
if(resolve(process.argv[1]||'')===fileURLToPath(import.meta.url))await main();
