// Read-only expectations. Terrain, inherited waterfall, characters and old mappings
// remain protected; selected passages are actual segment/triangle intersections.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const hash=b=>createHash('sha256').update(b).digest('hex');
export function fallsDigest(p){const h=createHash('sha256');for(const m of p.meshes){h.update(JSON.stringify([m.id,m.material,m.fallsPart,m.space,m.overview,m.globalSurface]));h.update(Buffer.from(m.vertices.buffer,m.vertices.byteOffset,m.vertices.byteLength));}return h.digest('hex');}
export function fallsBlocked(G,meshes,A,B){const d=G.sub(B,A),lo=A.map((v,i)=>Math.min(v,B[i])),hi=A.map((v,i)=>Math.max(v,B[i]));for(const m of meshes){if(m.instances)continue;const v=m.vertices;for(let i=0;i<v.length;i+=27){if([0,1,2].some(k=>Math.max(v[i+k],v[i+9+k],v[i+18+k])<lo[k]-1e-6||Math.min(v[i+k],v[i+9+k],v[i+18+k])>hi[k]+1e-6))continue;const a=[v[i],v[i+1],v[i+2]],e=[v[i+9]-a[0],v[i+10]-a[1],v[i+11]-a[2]],f=[v[i+18]-a[0],v[i+19]-a[1],v[i+20]-a[2]],p=G.cross(d,f),det=G.dot(e,p);if(Math.abs(det)<1e-8)continue;const s=G.sub(A,a),u=G.dot(s,p)/det;if(u<0||u>1)continue;const q=G.cross(s,e),w=G.dot(d,q)/det,t=G.dot(f,q)/det;if(w>=0&&u+w<=1&&t>1e-4&&t<.9999)return m.id;}}return null;}
export async function checkWaterfallCave(G,atlas,characters,read){
 const f=JSON.parse(read('tools/waterfall-cave-baseline.json')),W=G.FALLS_CAVE;
 for(const[file,sha]of Object.entries(f.protectedFiles))assert.equal(hash(read(file)),sha,'Inherited source changed: '+file);
 for(const[id,view]of Object.entries(f.navigation))assert.equal(G.resolveLocation(id).view,view,'Inherited navigation changed: '+id);
 assert.equal(hash(JSON.stringify(characters)),f.characters);assert.equal(characters.characters.length,85);
 const audit=G.auditLandmarks(atlas);assert.equal(audit.total,179);assert.equal(audit.navigable,107);assert.equal(audit.pending,72);
 assert.equal(G.resolveLocation('waterfall').view,'mountainFalls');assert.equal(G.resolveLocation('waterfall_cave').view,'fallsThreshold');
 for(const id of ['tengu','geyser_mountain','geyser_center'])assert.equal(G.resolveLocation(id).view,null,'Do not substitute this tunnel for an unbuilt neighbour');
 const loc=atlas.locations.find(l=>l.id===W.id);assert(loc.source_ids.includes('WF-FS28-T'));assert(loc.coordinate_status.startsWith('P'));assert(atlas.sources.find(s=>s.id==='WF-FS28-T').source_type==='T');
 const raw=gunzipSync(read('assets/packs/overview.pack.gz')),pack=G.decodePack(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength)),terrain=new G.Terrain(atlas);G.LANDSCAPE.apply(pack,terrain);G.applyHighlandGround(pack,terrain);
 const original=()=>hash(Buffer.concat(pack.meshes.flatMap(m=>['vertices','farVertices','instances','index'].filter(k=>m[k]).map(k=>Buffer.from(m[k].buffer,m[k].byteOffset,m[k].byteLength)))));const before=original();W.prepare(atlas,pack);
 const near=W.build(atlas),far=W.build(atlas,true),roads=W.publicApproach(atlas),stats={};let passages=0;
 for(const[k,p]of [['near',near],['far',far],['public',roads]]){
  assert.equal(fallsDigest(p),f.geometry[k],k+': review the geometry before an explicit fixture change');assert.equal(new Set(p.meshes.map(m=>m.id)).size,p.meshes.length);
  let bytes=0,triangles=0;
  for(const m of p.meshes){assert.equal(m.owner,W.id);assert.equal(m.basis,'P');assert(m.material.startsWith('falls'));assert(['surface',W.space].includes(m.space));const a=m.vertices;bytes+=a.byteLength;triangles+=a.length/27;assert(a.length&&a.length%27===0&&a.every(Number.isFinite));
   for(let i=0;i<a.length;i+=9){assert(Math.abs(Math.hypot(a[i+3],a[i+4],a[i+5])-1)<1e-5,m.id+': normal');assert(Math.hypot(a[i]-m.center[0],a[i+1]-m.center[1],a[i+2]-m.center[2])<=m.radius+.02,m.id+': bounds');}
   for(let i=0;i<a.length;i+=27){const cross=G.cross([a[i+9]-a[i],a[i+10]-a[i+1],a[i+11]-a[i+2]],[a[i+18]-a[i],a[i+19]-a[i+1],a[i+20]-a[i+2]]);assert(G.length(cross)>1e-7,m.id+': degenerate');}
  }
  assert.equal(bytes,p.bytes);assert(bytes<(k==='near'?5:k==='far'?3:3)*1048576,'Source budget');stats[k]={meshes:p.meshes.length,triangles,bytes};
 }
 for(const[k,p]of [['near',near],['far',far]]){
  assert.equal(p.meta.terrainMutation,false);assert.equal(p.meta.fullFarmConnection,false);assert.equal(p.meta.existingWaterfallReplaced,false);assert.equal(p.meta.surface.fullTerrainExcavation,false);assert.equal(p.meta.tunnel.gauge,1.16);
  assert.equal(fallsDigest(W.build(atlas,k==='far')),fallsDigest(p),'Deterministic build');
  const meshes=p.meshes.filter(m=>m.space===W.space&&!['curtain','outer'].includes(m.fallsPart));
  for(const lane of[-.9,3.4])for(let s=1;s<103;s+=2){const a=W.point(s,lane,lane>0?2.07:2.04),b=W.point(s+2,lane,lane>0?2.07:2.04);assert.equal(fallsBlocked(G,meshes,a,b),null,k+': blocked rail/service passage '+s+'/'+lane);passages++;}
  const front=p.meshes.filter(m=>m.space==='surface');for(const x of[-507,-505]){assert.equal(fallsBlocked(G,front,[x,250.1,-1025],[x,250.1,-1031.4]),null,'Vestibule blocked');passages++;}
 }
 assert.equal(fallsDigest(await G.buildRegion(atlas,W.id,'')),fallsDigest(near),'Worker/main dispatch differs');
 assert(roads.meshes.every(m=>m.globalSurface&&m.overview&&m.fallsPart==='approach'));const path=roads.meta.path;
 const start=G.MOUNTAIN.paths.find(p=>p.id==='mountain-lower-path').points.find(p=>p[0]===-430&&p[2]===-941);assert(start);assert.equal(path[0][0],start[0]);assert.equal(path[0][2],start[2]);assert(path[0][1]-start[1]<.65,'First step too high above original trail');
 assert(Math.abs(path.at(-1)[1]-248.25)<1e-5,'Entrance stair misses deck');
 const n=G.SurfaceContact.sampler(atlas,W.id),fGround=G.SurfaceContact.sampler(atlas,W.id,'far');
 for(let i=0;i<path.length;i++){const[x,y,z]=path[i];assert(y>=Math.max(n.height(x,z),fGround.height(x,z))-.01,'Steps buried at centreline');if(i)assert(Math.abs(y-path[i-1][1])<=.251,'Excessive riser');}
 const oldTrees=G.buildMountain(terrain).meta.treeRecords;for(const p of path)assert(oldTrees.every(t=>Math.hypot(t.x-p[0],t.z-p[2])>1.65),'Original trunk on new stairs');
 for(const m of near.meshes.filter(m=>m.fallsScene==='surface'&&m.fallsPart==='portal')){assert(m.center[0]>-517,'Portal still intersects old tree cluster');}
 assert.equal(original(),before,'Original terrain mutated');const contact=atlas.surfaceContacts[W.id],contactBytes=contact.near.byteLength+contact.far.byteLength;assert(contactBytes<200000);
 assert.equal(Object.keys(W.views).length,12);for(const[id,p]of Object.entries(W.views)){assert.equal(G.DIORAMA.regionOf(id),W.id);assert(p.eye.every(Number.isFinite)&&p.target.every(Number.isFinite));if(p.space==='surface')assert(p.requiredRegions.includes('mountain'),'Original waterfall detail missing');}
 return {...stats,passages,views:12,contactBytes,navigable:107,pending:72,characters:85,protectedFiles:Object.keys(f.protectedFiles).length};
}
