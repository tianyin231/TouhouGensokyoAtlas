// Fixed source and geometry expectations. This test never rewrites a baseline.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {fallsBlocked} from './check-waterfall-cave.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
export function cucumberDigest(p){const h=createHash('sha256');for(const m of p.meshes){h.update(JSON.stringify([m.id,m.material,m.cucumberPart,m.overview,m.globalNear,m.globalFar]));for(const key of['vertices','farVertices','instances','instanceColors'])if(m[key])h.update(Buffer.from(m[key].buffer,m[key].byteOffset,m[key].byteLength));}return h.digest('hex');}
export async function checkCucumberFarm(G,atlas,characters,read){
 const coverage=JSON.parse(read('tools/current-coverage.json'));
 const f=JSON.parse(read('tools/cucumber-farm-baseline.json')),F=G.CUCUMBER;
 for(const[path,h]of Object.entries(f.protectedFiles))assert.equal(hash(read(path)),h,'Inherited file changed: '+path);
 for(const[id,view]of Object.entries(f.navigation))assert.equal(G.resolveLocation(id).view,view,'Previous navigation changed: '+id);
 assert.equal(hash(JSON.stringify(characters)),f.characters);assert.equal(characters.characters.length,85);
 const a=G.auditLandmarks(atlas);assert.equal(a.total,179);assert.equal(a.navigable,coverage.navigable);assert.equal(a.pending,coverage.pending);
 assert.equal(G.resolveLocation(F.id).view,'cucumberOverview');for(const id of['tengu'])assert.equal(G.resolveLocation(id).view,null);
 const loc=atlas.locations.find(l=>l.id===F.id);assert.equal(loc.existence_evidence,'T');assert(loc.source_ids.includes('CF-FS29-T'));assert(loc.coordinate_status.startsWith('P'));assert(loc.verified_fact.includes('未核到工厂'));
 const raw=gunzipSync(read('assets/packs/overview.pack.gz')),pack=G.decodePack(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength)),t=new G.Terrain(atlas);G.LANDSCAPE.apply(pack,t);G.applyHighlandGround(pack,t);
 const terrainHash=()=>hash(Buffer.concat(pack.meshes.filter(m=>m.component==='island-terrain').map(m=>Buffer.from(m.vertices.buffer,m.vertices.byteOffset,m.vertices.byteLength))));const original=terrainHash();F.prepare(atlas,pack);
 const near=F.build(atlas),far=F.build(atlas,true),roads={meshes:F.roads(atlas,pack)},stats={};let passages=0;
 for(const[key,p]of[['near',near],['far',far],['public',roads]]){
  assert.equal(cucumberDigest(p),f.geometry[key],key+': review before changing the explicit geometry baseline');assert.equal(new Set(p.meshes.map(m=>m.id)).size,p.meshes.length);
  let triangles=0;
  for(const m of p.meshes){assert.equal(m.owner,F.id);assert.equal(m.space,'surface');assert.equal(m.basis,'P');
   for(const attr of ['vertices','farVertices','instances','instanceColors'])if(m[attr])assert(m[attr].every(Number.isFinite),m.id+' invalid floats');
   const v=m.vertices;assert(v.length&&v.length%27===0);triangles+=v.length/27*(m.instances?m.instances.length/16:1);
   for(let i=0;i<v.length;i+=9)assert(Math.abs(Math.hypot(v[i+3],v[i+4],v[i+5])-1)<1e-5,m.id+' normals');
   for(let i=0;i<v.length;i+=27){const ab=[v[i+9]-v[i],v[i+10]-v[i+1],v[i+11]-v[i+2]],ac=[v[i+18]-v[i],v[i+19]-v[i+1],v[i+20]-v[i+2]];assert(G.length(G.cross(ab,ac))>1e-7,m.id+' degenerate face');}
   for(const arr of[v,...(m.farVertices?[m.farVertices]:[])])for(let i=0;i<arr.length;i+=9){const point=[arr[i],arr[i+1],arr[i+2]];if(m.instances){const s=m.instances;for(let j=0;j<s.length;j+=16){const q=[s[j]*point[0]+s[j+4]*point[1]+s[j+8]*point[2]+s[j+12],s[j+1]*point[0]+s[j+5]*point[1]+s[j+9]*point[2]+s[j+13],s[j+2]*point[0]+s[j+6]*point[1]+s[j+10]*point[2]+s[j+14]];assert(G.length(G.sub(q,m.center))<=m.radius+.025,m.id+' instance bounds');}}else assert(G.length(G.sub(point,m.center))<=m.radius+.025,m.id+' bounds');}
  }
  const size=F.bytes(p.meshes);if(p.bytes!==undefined)assert.equal(size,p.bytes);assert(size<(key==='near'?4:key==='far'?2:2)*1048576,'Source array budget');stats[key]={meshes:p.meshes.length,expandedTriangles:triangles,bytes:size};
 }
 assert.equal(JSON.stringify(near.meta.plants),JSON.stringify(far.meta.plants));assert.equal(near.meta.plants.length,f.plants);assert.equal(near.meta.trees.length,f.trees);
 for(const [name,p,ground]of[['near',near,G.SurfaceContact.sampler(atlas,F.id)],['far',far,G.SurfaceContact.sampler(atlas,F.id,'far')]]){
  assert.equal(cucumberDigest(F.build(atlas,name==='far')),cucumberDigest(p),'Nondeterministic field');
  assert(!p.meta.terrainMutation&&!p.meta.fullTransportConnection&&!p.meta.factory&&!p.meta.physicalPortal);
  for(const foot of p.meta.posts)assert(Math.abs(foot[1]-ground.height(foot[0],foot[2])+.4)<1e-6,'Trellis root contact');
  for(const plant of p.meta.plants){assert(G.ISLAND.inside(plant.x,plant.z));assert(atlas.cucumberObstacles.every(q=>Math.hypot(q[0]-plant.x,q[1]-plant.z)>q[2]+1));}
  for(const foot of p.meta.shelter.feet)assert(foot[1]<ground.height(foot[0],foot[2])-.5,'Floating shelter foundation');
  for(const top of p.meta.shelter.roofSupports){assert.notEqual(fallsBlocked(G,p.meshes.filter(m=>m.cucumberPart==='roof'),[top[0],top[1]-.03,top[2]],[top[0],top[1]+.25,top[2]]),null,'Roof does not meet post top');assert(p.meshes.filter(m=>m.cucumberPart==='shed').some(m=>{const v=m.vertices;for(let i=0;i<v.length;i+=9)if(Math.abs(v[i]-top[0])<.15&&Math.abs(v[i+2]-top[2])<.15&&Math.abs(v[i+1]-top[1])<.002)return true;return false;}),'Post geometry does not reach the roof');}
  const solids=p.meshes.filter(m=>!m.instances&&!['vines','herbs','border','produce'].includes(m.cucumberPart));
  for(let z=F.CZ+32;z>F.CZ-40;z-=3){const x=F.CX+2;assert.equal(fallsBlocked(G,solids,[x,ground.height(x,z)+1.8,z],[x,ground.height(x,z-3)+1.8,z-3]),null,'Central access blocked');passages++;}
  for(const row of F.rows){const z=F.rowZ(row,0)+6.5;for(let x=F.CX+row.left;x<F.CX+row.right-4;x+=4){assert.equal(fallsBlocked(G,solids,[x,ground.height(x,z)+1.8,z],[x+4,ground.height(x+4,z)+1.8,z]),null,'Harvest aisle blocked');passages++;}}
  const s=p.meta.shelter;assert.equal(fallsBlocked(G,solids,[s.x-1,s.floor+1.8,s.z+8],[s.x-1,s.floor+1.8,s.z-2]),null,'Sorting shelter entry blocked');passages++;
 }
 const sample=G.ASAMA.sampleRenderedTerrain(pack);for(const m of roads.meshes){assert(m.globalSurface&&m.overview&&m.cucumberPart==='path');for(let i=0;i<m.vertices.length;i+=9){const v=m.vertices,q=sample(v[i],v[i+2],m.globalFar?'far':'near'),dy=v[i+1]-q.p[1];assert(dy>.11&&dy<.27,'Public path not on rendered terrain');}}
 let trunkClearance=Infinity;for(const p of F.paths[0])for(const q of atlas.cucumberObstacles)trunkClearance=Math.min(trunkClearance,Math.hypot(p[0]-q[0],p[1]-q[1]));assert(trunkClearance>8,'Mountain approach intersects an old-tree reserve');
 assert.equal(JSON.stringify(F.paths[0][0]),JSON.stringify(G.MAYOHIGA.paths[0][0]),'Old path endpoint moved');
 assert.equal(Object.keys(F.views).length,10);for(const[id,v]of Object.entries(F.views)){assert.equal(G.DIORAMA.regionOf(id),F.id);assert(v.eye[1]>sample(v.eye[0],v.eye[2],'near').p[1]+.9,id+' camera inside ground');}
 assert.equal(cucumberDigest(await G.buildRegion(atlas,F.id,'')),cucumberDigest(near),'Worker/main dispatcher');
 assert.equal(terrainHash(),original,'Existing terrain modified');const contact=atlas.surfaceContacts[F.id],contactBytes=contact.near.byteLength+contact.far.byteLength;assert(contactBytes<200000);
 return{...stats,plants:near.meta.plants.length,trees:near.meta.trees.length,views:10,passages,trunkClearance,contactBytes,protectedFiles:Object.keys(f.protectedFiles).length,navigable:coverage.navigable,pending:coverage.pending,characters:85};
}
