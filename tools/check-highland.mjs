import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
const geometry=p=>hash(Buffer.concat(p.meshes.map(m=>Buffer.from(m.vertices.buffer,m.vertices.byteOffset,m.vertices.byteLength))));
export async function checkHighland(G,atlas,characters,read){
 const f=JSON.parse(read('tools/highland-baseline.json')),H=G.HIGHLAND,t=new G.Terrain(atlas);
 for(const[file,sha]of Object.entries(f.protectedFiles))assert.equal(hash(read(file)),sha,`Inherited file changed: ${file}`);
 assert.equal(hash(JSON.stringify(characters.characters.slice(0,84))),f.characters);
 for(const k of ['placements','relationships'])assert.equal(hash(JSON.stringify(atlas[k])),f[k]);assert.equal(hash(JSON.stringify(characters.additionalVisits)),f.visits);
 for(const[id,view]of Object.entries(f.navigation))assert.equal(G.resolveLocation(id).view,view);
 assert.equal(G.auditLandmarks(atlas).navigable,104);assert.equal(G.auditLandmarks(atlas).pending,75);assert.equal(characters.characters.length,85);
 for(const id of ['wind_cave','geyser_mountain'])assert.equal(G.resolveLocation(id).view,null);
 assert.equal(G.resolveLocation('false_ceiling').view,'shelfOverview');assert.equal(G.resolveLocation('casino').view,'denFront');
 assert(!atlas.placements.some(p=>['false_ceiling','casino'].includes(p.id)),'Original research placements must not be silently rewritten');
 const detail=G.buildHighland(t),far=G.buildHighland(t,true),raw=gunzipSync(read('assets/packs/overview.pack.gz')),original=G.decodePack(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength)),copy={...original,meshes:original.meshes.slice()},terrain=G.applyHighlandGround(copy,t),publicMeshes=G.highlandGround(t,terrain);

 assert.equal(geometry({meshes:terrain.meshes.filter(m=>m.highlandTerrain)}),f.geometry.terrain);
 let untouched=0,changed=0;for(let i=0;i<original.meshes.length;i++){const before=original.meshes[i],after=terrain.meshes[i];if(!after.highlandTerrain){assert.equal(before,after);untouched++;continue;}changed++;assert.equal(before.index,after.index);for(let j=0;j<before.vertices.length;j+=9){const x=before.vertices[j],z=before.vertices[j+2];if(H.weight(x,z)<=0)for(let k=0;k<9;k++)assert.equal(before.vertices[j+k],after.vertices[j+k]);else assert(Math.abs(after.vertices[j+1]-t.height(x,z))<.001);}}assert(changed>0&&untouched>100);
 for(const[k,p]of [['detail',detail],['overview',far],['public',{meshes:publicMeshes}]]){
  assert.equal(geometry(p),f.geometry[k]);assert.equal(p.meshes.length,f.counts[k]);
  for(const m of p.meshes){const a=m.vertices;assert(a.every(Number.isFinite)&&a.length%27===0);assert.equal(m.owner,'highland');assert.equal(m.space,'surface');
   for(let i=0;i<a.length;i+=9){assert(Math.abs(Math.hypot(a[i+3],a[i+4],a[i+5])-1)<1e-5);assert(Math.hypot(a[i]-m.center[0],a[i+1]-m.center[1],a[i+2]-m.center[2])<=m.radius+.02);}
   for(let i=0;i<a.length;i+=27){const b=[a[i+9]-a[i],a[i+10]-a[i+1],a[i+11]-a[i+2]],c=[a[i+18]-a[i],a[i+19]-a[i+1],a[i+20]-a[i+2]];assert(G.length(G.cross(b,c))>1e-7,`${m.id} degenerate`);if(m.highlandPublic)assert(G.cross(b,c)[1]>0,'Road winding must face upward');}
  }
 }
 assert.equal(geometry(await G.buildRegion(atlas,'highland','')),geometry(detail));assert.equal(geometry(G.buildHighland(t)),geometry(detail));
 assert(detail.bytes<8*1048576&&far.bytes<2*1048576);assert(publicMeshes.every(m=>m.globalSurface));
 for(const p of H.paths)for(const[x,z]of p)assert(Number.isFinite(t.height(x,z))&&G.ISLAND.inside(x,z));
 for(const[x,z]of [[1620,160],[0,0],[-1140,-260],[124,-1360],[-989,-1109],[-760,-1710],[-1330,1050]])assert.equal(t.height(x,z),H.baseHeight.call(t,x,z),'Old landmark elevation changed');
 for(const[id,p]of Object.entries(H.views)){assert.equal(G.DIORAMA.regionOf(id),'highland');assert(p.eye[1]>t.height(p.eye[0],p.eye[2])+1,`${id} camera inside ground`);}
 assert.equal(Object.keys(H.views).length,13);assert.equal(G.DIORAMA.owner(H.CX,H.CZ),'highland');
 const c=characters.characters.find(c=>c.id==='sannyo');assert(c.highlandSession&&c.positionBasis.startsWith('P'));assert.equal(c.locationId,'casino');
 for(const id of ['false_ceiling','casino']){const l=atlas.locations.find(l=>l.id===id);assert(l.source_ids.includes('SHELF-LE29'));}
 return {detailMeshes:detail.meshes.length,detailBytes:detail.bytes,overviewBytes:far.bytes,publicBytes:publicMeshes.reduce((s,m)=>s+m.vertices.byteLength,0),views:13,navigable:104,pending:75,characters:85,protectedFiles:Object.keys(f.protectedFiles).length};
}
