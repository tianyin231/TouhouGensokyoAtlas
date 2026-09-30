import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {gunzipSync} from 'node:zlib';
const hash=b=>createHash('sha256').update(b).digest('hex');
export const hitenDigest=p=>hash(Buffer.concat(p.meshes.flatMap(m=>[Buffer.from(m.id),Buffer.from(m.vertices.buffer,m.vertices.byteOffset,m.vertices.byteLength)])));
export async function checkHiten(G,atlas,characters,read){
 const f=JSON.parse(read('tools/hiten-baseline.json')),t=new G.Terrain(atlas),raw=gunzipSync(read('assets/packs/overview.pack.gz')),pack=G.decodePack(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength));G.LANDSCAPE.apply(pack,t);G.applyHighlandGround(pack,t);
 const terrainHash=()=>hash(Buffer.concat(pack.meshes.filter(m=>m.component==='island-terrain').map(m=>Buffer.from(m.vertices.buffer,m.vertices.byteOffset,m.vertices.byteLength))));const before=terrainHash();
 const contact=G.SurfaceContact.prepare(atlas,pack,'hiten',[-1580,-1720,-1240,-1355]);assert.equal(terrainHash(),before,'Contact extraction changed the continuous terrain');assert(contact.near.byteLength+contact.far.byteLength<200000,'Contact clone budget');
 const nearGround=G.SurfaceContact.sampler(atlas,'hiten'),farGround=G.SurfaceContact.sampler(atlas,'hiten','far'),near=G.HITEN.build(t,false,nearGround),far=G.HITEN.build(t,true,farGround),stats={};
 for(const[name,p,ground]of [['near',near,nearGround],['far',far,farGround]]){assert.equal(hitenDigest(p),f.geometry[name],'Read-only reviewed Hiten fixture');assert.equal(p.meta.cliffBodies,5);assert(!p.meta.terrainMutation&&!p.meta.headquartersBuilding&&!p.meta.waterfall);assert.equal(p.bytes,p.meshes.reduce((s,m)=>s+m.vertices.byteLength,0));assert(p.bytes<8*1048576);
  for(const m of p.meshes){assert.equal(m.owner,'hiten');assert.equal(m.space,'surface');assert.equal(m.basis,'P');const a=m.vertices;assert(a.length&&a.length%27===0&&a.every(Number.isFinite));
   for(let i=0;i<a.length;i+=9){assert(Math.abs(Math.hypot(a[i+3],a[i+4],a[i+5])-1)<1e-5,m.id+' normal');assert(Math.hypot(a[i]-m.center[0],a[i+1]-m.center[1],a[i+2]-m.center[2])<m.radius+.02,m.id+' bounds');}
   for(let i=0;i<a.length;i+=27){const u=[a[i+9]-a[i],a[i+10]-a[i+1],a[i+11]-a[i+2]],v=[a[i+18]-a[i],a[i+19]-a[i+1],a[i+20]-a[i+2]];assert(G.length(G.cross(u,v))>1e-7,m.id+' degenerate');}
  }
  for(const[x,y,z]of p.meta.trees)assert(Math.abs(y-ground.height(x,z))<.001||p.meta.crags.some(c=>Math.abs(y-c.cap-.4)<.001),'Tree not on rendered terrain or supported rock cap');
  const again=G.HITEN.build(t,name==='far',ground);assert.equal(hitenDigest(p),hitenDigest(again),'Nondeterministic Hiten build');stats[name]={meshes:p.meshes.length,triangles:p.bytes/108,bytes:p.bytes,trees:p.meta.trees.length};
 }
 assert.equal(hitenDigest(await G.buildRegion(atlas,'hiten','')),hitenDigest(near),'Native worker entry mismatch');
 for(const[id,v]of Object.entries(G.HITEN.views)){assert.equal(G.DIORAMA.regionOf(id),'hiten');assert(v.eye[1]>t.height(v.eye[0],v.eye[2])+1,id+' camera below ground');}
 assert.equal(G.resolveLocation('hiten').view,'hitenOverview');assert.equal(G.resolveLocation('hiten').status,'selection');assert.equal(characters.characters.length,85);
 const a=G.auditLandmarks(atlas);assert.equal(a.total,179);assert.equal(a.navigable,102);assert.equal(a.pending,77);for(const id of ['tengu','wind_cave','geyser_mountain','geyser_center'])assert.equal(G.resolveLocation(id).view,null);
 assert(atlas.locations.find(l=>l.id==='hiten').source_ids.includes('HT-TH18-T'));
 return{...stats,contactBytes:contact.near.byteLength+contact.far.byteLength,views:8,navigable:102,pending:77,characters:85};
}
