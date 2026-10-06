// Reuse the integration check's real public hook and native pack. No second
// model build, historical snapshot, fixture refresh or browser work is needed.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {geometryDigest} from './check-hakurei.mjs';

const SOURCE='src/muenzuka-woodland.js';
const PREFIX='b832685d8db4ae0b59ffe3a4eed7e19d4ce4ccde3d506a0e84b0f4a94ba2dee6';
const NATIVE_DIGEST='7e24a87d60bc286337bf9adb447656d39c858fc6e41208535afa4872aa4066a2';
const NATIVE=[['-22:6:1',7],['-22:7:0',4],['-21:6:1',4],['-22:8:0',5],['-21:7:0',3],
 ['-22:6:0',4],['-22:7:1',2],['-22:8:1',3],['-21:7:1',3],['-21:6:0',2]];
const COLD=[{id:'overview016:muenzuka|forestLeaf|vegetation|I7',variant:0,count:10,west:6},
 {id:'overview016:muenzuka|forestLeaf|vegetation|I9',variant:1,count:11,west:4}];
const FIELDS=['vertices','farVertices','index','instances','instanceColors'];
const sha=x=>createHash('sha256').update(x).digest('hex');
const arraySHA=a=>a?sha(Buffer.from(a.buffer,a.byteOffset,a.byteLength)):null;
const metadata=m=>JSON.stringify(m,(_k,v)=>ArrayBuffer.isView(v)?undefined:v);
const same=(a,b,label)=>assert.equal(JSON.stringify(a),JSON.stringify(b),label);
function backing(...roots){
 const seen=new Set(),out=new Set();
 const walk=o=>{if(!o||typeof o!=='object'||seen.has(o))return;seen.add(o);
  if(ArrayBuffer.isView(o)){out.add(o.buffer);return;}
  if(Object.prototype.toString.call(o)==='[object ArrayBuffer]'){out.add(o);return;}
  for(const v of Object.values(o))walk(v);
 };roots.forEach(walk);return out;
}
const byteLength=bs=>[...bs].reduce((n,b)=>n+b.byteLength,0);
const snapshot=p=>new Map(p.meshes.map(m=>[m.id,{ref:m,metadata:metadata(m),
 fields:Object.fromEntries(FIELDS.map(k=>[k,{ref:m[k],sha:arraySHA(m[k])}]))}]));

export function beforeWoodlandPublic(G,data,pack,read){
 const p=JSON.parse(read('project.json'));
 assert.equal(p.worldBuilders.length,49,'Reviewed 49-module registration required');
 assert.equal(p.worldBuilders[48],SOURCE);
 assert.equal(sha(JSON.stringify(p.worldBuilders.slice(0,48))),PREFIX,'Accepted predecessors/order changed');
 assert.equal(G.extraOverviewBuilders.length,21,'Reviewed production hook count');
 assert(G.MUENZUKA_EDGE.metadata(pack),'Real western public predecessor must run');
 assert(!G.MUENZUKA_WOODLAND.metadata(pack),'Capture before the new actual hook');
 const prototypes=[0,1].map(i=>G.MUENZUKA_EDGE.prototype(i));
 return{ids:pack.meshes.map(m=>m.id),records:snapshot(pack),data:JSON.stringify(data),prototypes,
  buffers:backing(pack,data,G.MUENZUKA_EDGE.metadata(pack),...prototypes)};
}

export function afterWoodlandPublic(G,data,pack,before){
 const U=G.MUENZUKA_WOODLAND,meta=U.metadata(pack);
 assert(meta,'Actual woodland hook did not execute');
 same(pack.meshes.map(m=>m.id),before.ids,'Public record order and identities');
 assert.equal(JSON.stringify(data),before.data,'Public manifest changed');
 let changed=0;
 for(const m of pack.meshes){
  const old=before.records.get(m.id),q=COLD.find(q=>q.id===m.id);
  assert.equal(metadata(m),old.metadata,m.id+'/metadata');
  if(!q){assert.equal(m,old.ref,m.id+'/record identity');}
  for(const k of FIELDS){
   if(q&&(k==='vertices'||k==='farVertices'))continue;
   assert.equal(m[k],old.fields[k].ref,m.id+'/'+k+'/array identity');
   assert.equal(arraySHA(m[k]),old.fields[k].sha,m.id+'/'+k+'/bytes');
  }
  if(!q)continue;
  changed++;const prototype=before.prototypes[q.variant];
  assert.equal(old.ref.vertices.length/27,216,'Retained original cold geometry');
  assert.equal(m.vertices,prototype.far,'Cold leaf must share the accepted live cache');
  assert.equal(m.vertices.length/27,180);
  assert.equal(m.farVertices,old.ref.farVertices?prototype.far:undefined);
  assert.equal(m.instances.length/16,q.count);
  const west=pack.meshes.find(r=>r.id===q.id+':muenzuka-west-edge');
  assert.equal(west,before.records.get(west.id).ref,'Accepted western cold identity');
  assert.equal(west.vertices,prototype.far);assert.equal(west.instances.length/16,q.west);
 }
 assert.equal(changed,2);
 const afterBuffers=backing(pack,data,G.MUENZUKA_EDGE.metadata(pack),meta,...before.prototypes);
 assert.equal(byteLength(new Set([...afterBuffers].filter(b=>!before.buffers.has(b)))),0,'New persistent typed backing');
 assert.equal(pack.bytes,byteLength(backing(pack.meshes)),'Public unique backing accounting');
 const records=pack.meshes.slice();assert.equal(U.prepare(data,pack),meta,'Idempotent metadata');
 assert.equal(pack.meshes.length,records.length);
 records.forEach((m,i)=>assert.equal(pack.meshes[i],m,'Idempotent public records'));
 return{targetRecords:2,targetTrees:21,acceptedWestTrees:10,unchangedRecords:records.length-2,
  additionalTypedBackingBytes:0,extraPublicBuilds:0,scope:'Actual integration public hook chain; full production boot separately checked'};
}

export function checkWoodlandNative(G,pack){
 assert.equal(geometryDigest(pack),NATIVE_DIGEST,'Independently reviewed actual native output');
 assert.equal(pack.meshes.length,63);
 const byId=new Map(pack.meshes.map(m=>[m.id,m]));assert.equal(byId.size,63);
 let targets=0,westTrees=0;
 for(const[key,count]of NATIVE){
  const leaf=byId.get('muenzuka:trees:'+key+':leaf'),wood=byId.get('muenzuka:trees:'+key+':wood');
  const p=G.MUENZUKA_EDGE.prototype(Number(key.at(-1)));
  assert(leaf&&wood);assert.equal(leaf.vertices,p.near);assert.equal(leaf.farVertices,p.far);
  assert.equal(leaf.vertices.length/27,1152);assert.equal(leaf.farVertices.length/27,180);
  assert.equal(leaf.instances.length/16,count);assert.equal(leaf.instanceColors.length/3,count);
  assert.equal(arraySHA(leaf.instances),arraySHA(wood.instances),'Original stem/leaf matching placements');
  targets+=count;
 }
 for(const z of[6,7,8])for(const variant of[0,1]){
  const m=byId.get(`muenzuka:trees:-23:${z}:${variant}:leaf`),p=G.MUENZUKA_EDGE.prototype(variant);
  assert(m);assert.equal(m.vertices,p.near);assert.equal(m.farVertices,p.far);westTrees+=m.instances.length/16;
 }
 assert.equal(targets,37);assert.equal(westTrees,25);
 const digest=geometryDigest(pack);assert.equal(G.MUENZUKA_WOODLAND.applyDetail(pack),pack);
 assert.equal(geometryDigest(pack),digest,'Native idempotence changed fixed output');
 return{targetRecords:10,targetTrees:targets,acceptedWestTrees:westTrees,nativeRecords:63,
  geometrySHA256:digest,candidateNativeBuildReused:true,extraNativeBuilds:0};
}
