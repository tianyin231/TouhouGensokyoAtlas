// Read-only local geometry and inherited-world checks; no fixture writes here.
import assert from 'node:assert/strict';import{createHash}from'node:crypto';import{gunzipSync}from'node:zlib';
const hash=b=>createHash('sha256').update(b).digest('hex');
export const mayohigaDigest=p=>hash(Buffer.concat(p.meshes.flatMap(m=>[Buffer.from(JSON.stringify([m.id,m.material,m.mayoPart,m.mayoZone,m.globalNear,m.globalFar])),Buffer.from(m.vertices.buffer,m.vertices.byteOffset,m.vertices.byteLength)])));
function blocked(G,meshes,a,b){const d=G.sub(b,a);for(const m of meshes){const v=m.vertices;for(let i=0;i<v.length;i+=27){const A=[v[i],v[i+1],v[i+2]],E=[v[i+9]-A[0],v[i+10]-A[1],v[i+11]-A[2]],F=[v[i+18]-A[0],v[i+19]-A[1],v[i+20]-A[2]],h=G.cross(d,F),det=G.dot(E,h);if(Math.abs(det)<1e-8)continue;const s=G.sub(a,A),u=G.dot(s,h)/det;if(u<0||u>1)continue;const q=G.cross(s,E),w=G.dot(d,q)/det;if(w<0||u+w>1)continue;const t=G.dot(F,q)/det;if(t>1e-4&&t<.9999)return m.id;}}return null;}
export async function checkMayohiga(G,atlas,characters,read){
 const coverage=JSON.parse(read('tools/current-coverage.json'));
 const f=JSON.parse(read('tools/mayohiga-baseline.json')),M=G.MAYOHIGA;
 for(const[p,h]of Object.entries(f.protectedFiles))assert.equal(hash(read(p)),h,'Inherited source changed: '+p);
 const a=G.auditLandmarks(atlas);assert.equal(a.total,179);assert.equal(a.navigable,coverage.navigable);assert.equal(a.pending,coverage.pending);assert.equal(characters.characters.length,85);assert.equal(hash(JSON.stringify(characters)),f.characters);
 for(const[id,v]of Object.entries(f.navigation))assert.equal(G.resolveLocation(id).view,v,'Old navigation changed: '+id);
 assert.equal(G.resolveLocation('mayohiga').view,'mayoOverview');assert.equal(G.resolveLocation('mayohiga').status,'selection');assert.equal(G.resolveLocation('yukari_home').view,null);
 for(const id of ['tengu'])assert.equal(G.resolveLocation(id).view,null,'Unbuilt neighbour must remain unbound');
 assert(atlas.locations.find(l=>l.id==='mayohiga').source_ids.includes('MY-BAIJR-T'));assert.equal(atlas.locations.find(l=>l.id==='mayohiga').coordinate_status[0],'P');
 const raw=gunzipSync(read('assets/packs/overview.pack.gz')),pack=G.decodePack(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength)),terrain=new G.Terrain(atlas);G.LANDSCAPE.apply(pack,terrain);G.applyHighlandGround(pack,terrain);
 const allBytes=()=>hash(Buffer.concat(pack.meshes.flatMap(m=>['vertices','farVertices','index','instances'].filter(k=>m[k]).map(k=>Buffer.from(m[k].buffer,m[k].byteOffset,m[k].byteLength)))));const before=allBytes(),contact=G.SurfaceContact.prepare(atlas,pack,'mayohiga',M.bounds),nearGround=G.SurfaceContact.sampler(atlas,'mayohiga'),farGround=G.SurfaceContact.sampler(atlas,'mayohiga','far');
 const near=M.build(atlas,false),far=M.build(atlas,true),publicPack={meshes:M.roads(atlas,pack)},stats={};let clearDoors=0;
 const validate=(p,key)=>{assert.equal(mayohigaDigest(p),f.geometry[key],key+' differs from reviewed geometry');assert.equal(new Set(p.meshes.map(m=>m.id)).size,p.meshes.length);let bytes=0;for(const m of p.meshes){const v=m.vertices;bytes+=v.byteLength;assert(v.length>0&&v.length%27===0&&v.every(Number.isFinite),m.id+' invalid array');assert.equal(m.owner,'mayohiga');assert.equal(m.basis,'P');
 for(let i=0;i<v.length;i+=9){assert(Math.abs(Math.hypot(v[i+3],v[i+4],v[i+5])-1)<1e-5,m.id+' normal');assert(Math.hypot(v[i]-m.center[0],v[i+1]-m.center[1],v[i+2]-m.center[2])<=m.radius+.02,m.id+' bounds');}
 for(let i=0;i<v.length;i+=27){const n=G.cross([v[i+9]-v[i],v[i+10]-v[i+1],v[i+11]-v[i+2]],[v[i+18]-v[i],v[i+19]-v[i+1],v[i+20]-v[i+2]]);assert(G.length(n)>1e-7,m.id+' degenerate');if(m.mayoPart==='route')assert(n[1]>0,m.id+' downward road');}
 }return{meshes:p.meshes.length,triangles:bytes/108,bytes};};
 for(const[key,p,ground]of[['near',near,nearGround],['far',far,farGround]]){stats[key]=validate(p,key);assert.equal(p.bytes,stats[key].bytes);assert(p.bytes<(key==='near'?8:3)*1048576);assert.equal(p.meta.houses.length,4);assert.equal(p.meta.trees.length,54);assert.equal(p.meta.cats.length,key==='near'?6:0);for(const k of ['terrainMutation','fullVillage','yakumoResidence','walkCollision'])assert.equal(p.meta[k],false);
 const w=(s,x,y,z)=>[s.x+Math.cos(s.a)*x+Math.sin(s.a)*z,y,s.z-Math.sin(s.a)*x+Math.cos(s.a)*z];
 for(const s of p.meta.houses){for(const{top,bottom}of s.footprint){const y0=nearGround.height(...[bottom[0],bottom[2]]),y1=farGround.height(bottom[0],bottom[2]);assert(bottom[1]<Math.min(y0,y1)-.5,'Unburied foundation');assert(top[1]>Math.max(y0,y1)-.05,'Slope penetrates deck');assert(top[1]-Math.min(y0,y1)<11,'Excessive stone pedestal');}
  assert(s.stairs>1&&s.stairs<30,'Excessively steep entrance');const entries=M.paths.flat();assert(Math.min(...entries.map(p=>Math.hypot(p[0]-s.entry[0],p[1]-s.entry[2])))<.001,'Lane misses stairs');
  const meshes=p.meshes.filter(m=>m.mayoZone===s.id&&m.mayoPart==='base'),A=w(s,-s.w*.08,s.floor+1.6,s.d/2+4),B=w(s,-s.w*.08,s.floor+1.6,-s.d/2+2);assert.equal(blocked(G,meshes,A,B),null,s.id+' sealed front opening');clearDoors++;
 }
 for(const[x,y,z]of p.meta.trees)assert(Math.abs(y-ground.height(x,z))<.001,'Floating tree origin');assert.equal(mayohigaDigest(M.build(atlas,key==='far')),mayohigaDigest(p),'Nondeterministic model');
 }
 stats.public=validate(publicPack,'public');assert(stats.public.bytes<3*1048576);assert(publicPack.meshes.every(m=>m.overview&&m.globalSurface&&(m.globalNear||m.globalFar)),'Road must survive detail eviction');assert.equal(allBytes(),before,'Original arrays mutated');assert(contact.near.byteLength+contact.far.byteLength<210000);
 assert.equal(mayohigaDigest(await G.buildRegion(atlas,'mayohiga','')),mayohigaDigest(near),'Native Worker dispatch');
 const end=M.paths[0].at(-1);assert(G.ASAMA.surfacePath.some(p=>Math.hypot(p[0]-end[0],p[1]-end[1])<.01),'External road has no inherited endpoint');
 const rendered=G.ASAMA.sampleRenderedTerrain(pack);assert.equal(Object.keys(M.views).length,11);for(const[id,v]of Object.entries(M.views)){assert.equal(G.DIORAMA.regionOf(id),'mayohiga');assert.equal(v.space,'surface');assert(v.eye[1]>rendered(v.eye[0],v.eye[2],'near').p[1]+1,id+' camera inside ground');}
 return{...stats,contactBytes:contact.near.byteLength+contact.far.byteLength,views:11,houses:4,trees:54,ordinaryCats:6,clearDoors,navigable:coverage.navigable,pending:coverage.pending,characters:85};
}
