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
// Select roots from the actual original cold/native prototypes and matrices.
// A root base is translation plus prototype minimum Y, not translation alone.
function originalRoots(records){
 const found=new Map();
 for(const m of records){
  if(!m.instances||!m.instanceColors||!(m.component==='trees'||m.id.includes(':legacy:plants:')))continue;
  let minY=Infinity;for(let i=1;i<m.vertices.length;i+=9)minY=Math.min(minY,m.vertices[i]);
  const low=[];for(let i=0;i<m.vertices.length;i+=9)if(m.vertices[i+1]<=minY+.2)low.push(Array.from(m.vertices.subarray(i,i+3)));
  assert(low.length,'No actual root-base prototype '+m.id);
  for(let i=0;i<m.instances.length;i+=16){
   const a=m.instances.subarray(i,i+16),x=a[12],z=a[14];if(x<216||x>396||z<352||z>393)continue;
   const y=a[13]+minY*a[5],radius=Math.max(...low.map(p=>Math.hypot(a[0]*p[0]+a[8]*p[2],a[2]*p[0]+a[10]*p[2]))),key=[x,a[13],z].join(',');
   const source={record:m.id,instance:i/16,matrixSHA:hashView(a),translationY:a[13],prototypeMinY:minY,baseY:y,radius};
   if(!found.has(key))found.set(key,{x,y,z,radius,sources:[source]});else{const r=found.get(key);r.y=Math.min(r.y,y);r.radius=Math.max(r.radius,radius);r.sources.push(source);}
  }
 }
 assert.equal(found.size,6,'Expected all six original root footprints');return [...found.values()];
}

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
const sub=(a,b)=>a.slice(0,3).map((n,k)=>n-b[k]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a.reduce((n,v,k)=>n+v*b[k],0);
const positionKey=p=>p.slice(0,3).map(n=>Object.is(n,-0)?0:n).join(',');
function onSegment(p,a,b,tolerance=.00006){
 const d=sub(b,a),q=sub(p,a),length=dot(d,d),u=dot(q,d)/length;
 return u>=-1e-6&&u<=1+1e-6&&Math.hypot(...q.map((n,k)=>n-u*d[k]))<=tolerance;
}

async function main(){
 assert.equal(Number(process.versions.node.split('.')[0]),22,'Use Node22 for stable geometry');
 const started=performance.now(),checkerSHA=sha(fs.readFileSync(import.meta.filename)),checks=[];
 const run=(name,fn)=>{try{const result=fn();checks.push({name,passed:true,result});}catch(e){checks.push({name,passed:false,error:e.message,...(e.result?{result:e.result}:{})});}};
 const failRows=(rows,message)=>{if(rows.length){const e=new Error(message+' ('+rows.length+')');e.result=rows;throw e;}};
 run('accepted original input digests retained',()=>{
  const expected={'src/world-builder.js':'d724340f60e9b759d68803ddfe1c4e16048272e6f8e2bb81bfa6e273ffe7378e','assets/packs/overview.pack.gz':'7398a263bf02d560fd0c9265d9e297ec3b22357f2429c4732ee3488f2d097742','assets/packs/legacy.pack.gz':'46e874f6bcdff56d4772e531fd19bf8a71ba5f272aa39b14a91e5ed65082ab88','data/atlas.json':'74b17d519eb23f9d6d26f7ca76e2d02a87978a7c0761b4bd22719d286c73e37a','src/renderer.js':'d3e931570d12177269d8bd99d4a7bd6808584ac002c9cca9ae789a7a34bb3d36'},actual={};
  for(const [p,s]of Object.entries(expected)){actual[p]=sha(read(p));assert.equal(actual[p],s,'Original input differs '+p);}return actual;
 });
 const sourceSHA=sha(read('src/myouren-terrain-rebuild.js')),expectedAt=process.argv.indexOf('--source-sha');
 if(expectedAt>=0)assert.equal(sourceSHA,process.argv[expectedAt+1],'Frozen source SHA differs');
 const context=vm.createContext({performance,TextDecoder,TextEncoder}),project=JSON.parse(read('project.json'));
 for(const p of project.worldBuilders)vm.runInContext(String(read(p)),context,{filename:p});
 const G=context.GA,U=G.MYOUREN_TERRAIN_REBUILD,data=JSON.parse(read('data/atlas.json'));
 assert(U?.prepare,'Actual candidate API absent');
 const raw=gunzipSync(read('assets/packs/overview.pack.gz')),pack=G.decodePack(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength));
 const legacyRaw=gunzipSync(read('assets/packs/legacy.pack.gz')),legacy=G.decodePack(legacyRaw.buffer.slice(legacyRaw.byteOffset,legacyRaw.byteOffset+legacyRaw.byteLength));
 const roots=originalRoots([...pack.meshes,...G.plantSubset(legacy,'myouren')]);
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
  const rows=[],bad=[];for(const r of roots){const {x,z,radius}=r;let nearError=0,farError=0;for(let j=0;j<=16;j++){const a=j?2*Math.PI*(j-1)/16:0,X=x+(j?radius*Math.cos(a):0),Z=z+(j?radius*Math.sin(a):0),old=heightAt(samplers.oldnearNormal,X,Z),n=heightAt(samplers.newnearNormal,X,Z),f=heightAt(samplers.newfarNormal,X,Z);if(old===null||n===null||f===null){bad.push({root:r,X,Z,old,n,f});continue;}nearError=Math.max(nearError,Math.abs(n-old));farError=Math.max(farError,Math.abs(f-n));}rows.push({...r,nearError,farError});if(nearError>.001||farError>.03)bad.push(rows.at(-1));}failRows(bad,'Tree support lost or altered');return {samplesPerRoot:17,nearTolerance:.001,farNearTolerance:.03,rows};
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
  const bad=[];let checked=0,maxError=0,maxExistingCentralDifference=0,maxIntroducedCentralDifference=0;
  for(const far of [false,true])for(let x=218;x<=394;x+=.5){const k=far?'far':'near',a=heightAt(samplers['new'+k+'Normal'],x,378),b=heightAt(samplers['new'+k+'Cut'],x,378);checked++;if(a===null||b===null){bad.push({k,x,a,b});continue;}
   if(!far&&x>=288&&x<=312){const oldA=heightAt(samplers.oldnearNormal,x,378),oldB=heightAt(samplers.oldnearCut,x,378);if(oldA===null||oldB===null){bad.push({k,x,oldA,oldB});continue;}const existing=oldA-oldB,introduced=(a-b)-existing;maxExistingCentralDifference=Math.max(maxExistingCentralDifference,Math.abs(existing));maxIntroducedCentralDifference=Math.max(maxIntroducedCentralDifference,Math.abs(introduced));if(Math.abs(introduced)>.001)bad.push({k,x,a,b,oldA,oldB,introduced});
   }else{maxError=Math.max(maxError,Math.abs(a-b));if(Math.abs(a-b)>.001)bad.push({k,x,a,b,error:Math.abs(a-b)});}
  }failRows(bad,'Cut trace has a newly introduced discontinuity');return {checked,maxError,maxExistingCentralDifference,maxIntroducedCentralDifference,tolerance:.001,centralProtocol:'Preserve unchanged central near candidate minus baseline difference; modified wings/far must match normal exactly within tolerance.'};
 });
 run('far outer envelope preserves actual old support',()=>{
  const pts=[];for(let x=192;x<=416;x+=2)pts.push([x,336],[x,416]);for(let z=336;z<=416;z+=2)pts.push([192,z],[416,z]);const bad=[];let maxError=0,checked=0;for(const [x,z]of pts){const a=heightAt(samplers.oldfarNormal,x,z),b=heightAt(samplers.newfarNormal,x,z);if(a===null)continue;checked++;if(b===null)bad.push({x,z,a,b});else{maxError=Math.max(maxError,Math.abs(a-b));if(Math.abs(a-b)>.001)bad.push({x,z,a,b,error:Math.abs(a-b)});}}failRows(bad,'Far envelope changed old outer support');return {checked,maxError,tolerance:.001};
 });
 if(U.revision>=2){
  run('explicit rock facets exist with actual hard face normals',()=>{
   assert(U.outcrops?.length===4,'Expected four actual rock control rings');
   const rows=[],bad=[];let minNormalDot=1;
   for(const r of U.outcrops)for(let i=0;i<r.ring.length;i++){
    const p=[r.crest,r.ring[i],r.ring[(i+1)%r.ring.length]],normal=cross(sub(p[1],p[0]),sub(p[2],p[0])),L=Math.hypot(...normal),up=normal.map(n=>n/L*(normal[1]<0?-1:1));let samples=0;
    for(let u=1;u<5;u++)for(let v=1;v<5-u;v++){
     const weights=[u/5,v/5,1-(u+v)/5],q=p[0].map((_,k)=>p.reduce((s,a,j)=>s+a[k]*weights[j],0)),hits=samplers.newnearNormal(q[0],q[2]);samples++;
     if(!hits.length){bad.push({rock:r.id,face:i,point:q,reason:'No actual near face'});continue;}
     for(const h of hits){const a=h.attributes,n=a.slice(3,6),nd=dot(up,n)/Math.hypot(...n);minNormalDot=Math.min(minNormalDot,nd);if(Math.abs(a[1]-q[1])>.0001||Math.abs(Math.hypot(...n)-1)>.0001||nd<.999)bad.push({rock:r.id,face:i,point:q,actualHeight:a[1],normal:n,normalDot:nd});}
    }rows.push({rock:r.id,face:i,samples});
   }failRows(bad,'Rock facet missing, displaced or using blended soil normals');return {facets:rows.length,samples:rows.reduce((n,r)=>n+r.samples,0),minNormalDot,positionTolerance:.0001,rows};
  });
  run('actual rock and earth ring edges share exact Float32 positions',()=>{
   const color=G.rgb('#909084'),near=added.filter(m=>!m.globalFar&&!m.cutOnly).flatMap(m=>triangles(m)),edges=new Map(),rings=U.outcrops.flatMap(r=>r.ring.map((a,i)=>({rock:r.id,edge:i,a,b:r.ring[(i+1)%r.ring.length]})));
   for(const t of near){const rock=t.p.every(p=>p.slice(6,9).every((n,k)=>Math.abs(n-color[k])<1e-6));for(let k=0;k<3;k++){
    const a=t.p[k],b=t.p[(k+1)%3],ring=rings.find(r=>onSegment(a,r.a,r.b)&&onSegment(b,r.a,r.b));if(!ring)continue;
    const A=positionKey(a),B=positionKey(b);if(A===B)continue;const key=A<B?A+'|'+B:B+'|'+A;if(!edges.has(key))edges.set(key,{rock:ring.rock,controlEdge:ring.edge,uses:[],points:[a.slice(0,3),b.slice(0,3)]});edges.get(key).uses.push({record:t.id,face:t.face,material:rock?'rock':'earth'});
   }}
   const bad=[];for(const e of edges.values())if(e.uses.length!==2||!e.uses.some(u=>u.material==='rock')||!e.uses.some(u=>u.material==='earth'))bad.push(e);
   for(const r of rings)if(![...edges.values()].some(e=>e.rock===r.rock&&e.controlEdge===r.edge))bad.push({rock:r.rock,controlEdge:r.edge,reason:'No actual ring edge'});
   failRows(bad,'Rock/earth actual ring has a missing, duplicated or unmatched edge');return {controlEdges:rings.length,actualSharedEdges:edges.size,Float32PositionKeysExact:true,controlSegmentRecognitionTolerance:.00006};
  });
 }
 run('frozen source stayed unchanged throughout preflight',()=>{assert.equal(sha(read('src/myouren-terrain-rebuild.js')),sourceSHA,'Source changed during execution');return {sourceSHA};});
 const report={schema:2,checkerSHA,sourceSHA,projectSHA:sha(read('project.json')),sourceAssetSHA:sha(read('assets/packs/overview.pack.gz')),node:process.version,prepareCPUms,elapsedCPUms:performance.now()-started,checks,passed:checks.every(c=>c.passed),passedChecks:checks.filter(c=>c.passed).length,totalChecks:checks.length,
  scope:'Bounded decoded public source prepare and independent actual indexed-face sampling. No native/detail build, no WebGL, no full Node regression.',
  notRun:['Independent retained-fragment barycentric attribute proof','All deleted-face authorized polygon proof','Native detail shrub clump/source protection','Navigation/visible floor adapter and actual input','Renderer draw/tri/residency/reentry and visual acceptance'],
  sourceTriangleDeltas:sourceIds.map(id=>({id,before:oldIndices.get(id).length/3,after:pack.meshes.filter(m=>m.id===id||m.id===id+':myouren-rebuild').reduce((n,m)=>n+m.index.length/3,0)}))};
 const at=process.argv.indexOf('--output'),output=at>=0?resolve(process.argv[at+1]):null;if(output)fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({output,checkerSHA,sourceSHA:report.sourceSHA,passed:report.passed,passedChecks:report.passedChecks,totalChecks:report.totalChecks,prepareCPUms,elapsedCPUms:report.elapsedCPUms,failures:checks.filter(c=>!c.passed).map(c=>({name:c.name,error:c.error,result:c.result}))}));if(!report.passed)process.exitCode=1;
}
if(resolve(process.argv[1]||'')===fileURLToPath(import.meta.url)){
 try{await main();}catch(e){
  const report={schema:2,passed:false,fatal:true,error:e.stack,checkerSHA:sha(fs.readFileSync(import.meta.filename)),sourceSHA:sha(read('src/myouren-terrain-rebuild.js')),node:process.version,scope:'Preflight aborted; no downstream assertion is credited as passed.'};
  const at=process.argv.indexOf('--output');if(at>=0)fs.writeFileSync(resolve(process.argv[at+1]),JSON.stringify(report,null,2)+'\n');console.error(JSON.stringify(report));process.exitCode=1;
 }
}
