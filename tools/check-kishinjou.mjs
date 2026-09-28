// Called by check.mjs against the SAME embedded builder that was built into HTML.
// Expectations are reviewed fixtures, not regenerated from the current model.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
const geometryHash=p=>hash(Buffer.concat(p.meshes.map(m=>Buffer.from(m.vertices.buffer,m.vertices.byteOffset,m.vertices.byteLength))));
export async function checkKishinjou(G,atlas,characters,read){
 const fixed=JSON.parse(read('tools/kishinjou-baseline.json'));
 for(const [file,digest]of Object.entries(fixed.protectedFiles))assert.equal(hash(read(file)),digest,`${file}: inherited scene changed; review before changing fixture`);
 assert.equal(hash(JSON.stringify(atlas.placements)),fixed.placements,'Castle must not flatten the land below it');
 assert.equal(hash(JSON.stringify(atlas.relationships)),fixed.relationships,'Existing routes must be retained');
 assert.equal(hash(JSON.stringify(characters.characters.slice(0,fixed.originalCharacterCount))),fixed.originalCharacters,'Existing character records changed');
 assert.equal(new Set(characters.characters.map(c=>c.id)).size,characters.characters.length);
 const block=G.DIORAMA.map.get('kishinjou');assert(block.aerial);assert.equal(block.poly.length,0);assert(!block.space);
 assert.equal(G.KISHINJOU.rotationDeterminant,1);assert.equal(G.KISHINJOU.exteriorVersion,'TH145');
 assert.equal(Object.keys(G.KISHINJOU.views).length,8);
 for(const [id,p]of Object.entries(G.KISHINJOU.views)){assert.equal(G.PRESETS[id],p);assert.equal(p.region,'kishinjou');assert.equal(p.space,'surface');assert(p.eye.every(Number.isFinite)&&p.target.every(Number.isFinite));}
 assert.equal(G.IMPLEMENTED.needle,'needleExterior');assert.equal(G.IMPLEMENTED.needle_storm,'needleStorm');
 const d=G.buildKishinjou(),far=G.buildKishinjouOverview();
 assert.equal(d.meshes.length,fixed.castle.detailMeshes);assert.equal(d.bytes,fixed.castle.detailBytes);assert.equal(geometryHash(d),fixed.castle.detailGeometry);
 assert.equal(far.meshes.length,fixed.castle.farMeshes);assert.equal(far.bytes,fixed.castle.farBytes);assert.equal(geometryHash(far),fixed.castle.farGeometry);
 assert.equal(geometryHash(G.buildKishinjou()),geometryHash(d),'Generation must be deterministic');
 assert.equal(geometryHash(await G.buildRegion(atlas,'kishinjou','')),geometryHash(d),'Worker dispatch must reach the real castle');
 assert(far.bytes<1024*1024,'Overview supplement must stay small');assert(far.bytes<d.bytes/5);
 assert(!far.meshes.some(m=>['interior','storm'].includes(m.castlePart)),'Overview must not build interior/event geometry');
 const mats=new Set(['Plaster','Stone','Tile','TileEdge','Wood','Paper','Gold','Tatami','Mist'].map(s=>'kishin'+s));
 for(const p of[d,far]){
  assert.equal(new Set(p.meshes.map(m=>m.id)).size,p.meshes.length);
  assert.equal(p.bytes,p.meshes.reduce((n,m)=>n+m.vertices.byteLength,0));
  assert.equal(p.meta.surfaceCut,false);
  for(const m of p.meshes){
   assert(m.id.startsWith('kishinjou:'));assert.equal(m.owner,'kishinjou');assert.equal(m.space,'surface');assert.equal(m.basis,'P');assert(mats.has(m.material));
   const a=m.vertices;assert(a.length>0&&a.length%27===0);assert(a.every(Number.isFinite));assert(m.center.every(Number.isFinite)&&Number.isFinite(m.radius)&&m.radius>0);
   for(let i=0;i<a.length;i+=9){assert(Math.abs(Math.hypot(a[i+3],a[i+4],a[i+5])-1)<1e-5,`${m.id}: invalid normal`);assert(Math.hypot(a[i]-m.center[0],a[i+1]-m.center[1],a[i+2]-m.center[2])<=m.radius+.001,`${m.id}: stale rotated bounds`);assert(a[i+1]>850&&a[i+1]<1000);}
  }
 }
 const zone=name=>d.meshes.filter(m=>m.castleZone===name);for(const z of['foundation','hall','upper','lookout'])assert(zone(z).length>1);
 assert(Math.min(...zone('foundation').flatMap(m=>[m.center[1]]))>Math.max(...zone('lookout').flatMap(m=>[m.center[1]])),'Foundation must be above the lowest tower');
 for(const id of['needle','needle_storm']){const l=atlas.locations.find(l=>l.id===id);assert(l&&l.source_ids.length);for(const sid of l.source_ids)assert(atlas.sources.some(s=>s.id===sid),`Missing source ${sid}`);}
 for(const id of['shinmyoumaru','seija']){const c=characters.characters.find(c=>c.id===id);assert.equal(c.region,'kishinjou');assert.equal(c.locationId,'needle');assert(G.KISHINJOU.contains(c.position));assert(c.positionBasis.startsWith('P'));assert(c.art.work&&c.art.kind&&c.art.sourcePage&&c.art.urls.length);}
 return {detailMeshes:d.meshes.length,triangles:d.bytes/108,detailBytes:d.bytes,farBytes:far.bytes,protectedFiles:Object.keys(fixed.protectedFiles).length};
}
