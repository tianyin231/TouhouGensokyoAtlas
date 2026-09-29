// Read-only, reviewed v0.26 expectations. This test never writes fixtures.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
const geo=p=>hash(Buffer.concat(p.meshes.map(m=>Buffer.from(m.vertices.buffer,m.vertices.byteOffset,m.vertices.byteLength))));
export async function checkKasen(G,atlas,characters,read){
 const fixed=JSON.parse(read('tools/kasen-baseline.json'));
 for(const [path,digest]of Object.entries(fixed.protectedFiles))assert.equal(hash(read(path)),digest,`Inherited source changed: ${path}`);
 assert.equal(hash(JSON.stringify(characters.characters.slice(0,78))),fixed.original78);
 for(const [k,v]of [['placements',atlas.placements],['relationships',atlas.relationships],['visits',characters.additionalVisits]])assert.equal(hash(JSON.stringify(v)),fixed[k]);
 for(const [id,view]of Object.entries(fixed.previousMappings))assert.equal(G.resolveLocation(id).view,view);
 const audit=G.auditLandmarks(atlas);assert.match(audit.version,/^\d+\.\d+\.\d+$/);assert.equal(audit.total,179);assert(audit.navigable>=89&&audit.pending<=90);
 assert(characters.characters.length>=79);assert.equal(new Set(characters.characters.map(c=>c.id)).size,characters.characters.length);
 for(const id of ['wind_cave','geyser_mountain','sanctuary','animal_hq'])assert.equal(G.resolveLocation(id).view,null);
 for(const [id,view]of Object.entries(G.KASEN.locations)){assert.equal(G.resolveLocation(id).view,view);const loc=atlas.locations.find(l=>l.id===id);assert(loc.coordinate_status.startsWith('P'));assert(loc.source_ids.includes('KS-MANOR'));assert(!atlas.placements.some(p=>p.id===id));}
 const b=G.DIORAMA.map.get('kasen');assert(b.independent&&b.poly.length===0&&b.space==='senkai_kasen');assert.deepEqual(JSON.parse(JSON.stringify(G.DIORAMA.transform('kasen','atlas'))),{scale:1,offset:[0,0,0]});
 const detail=G.buildKasen(),far=G.buildKasenOverview();
 for(const [kind,p]of [['detail',detail],['overview',far]]){
  const f=fixed.packs[kind];assert.equal(p.meshes.length,f.meshes);assert.equal(p.bytes,f.bytes);assert.equal(geo(p),f.geometry);assert.equal(p.bytes,p.meshes.reduce((s,m)=>s+m.vertices.byteLength,0));assert.equal(new Set(p.meshes.map(m=>m.id)).size,p.meshes.length);
  for(const m of p.meshes){const a=m.vertices;assert(a.length&&a.length%27===0&&a.every(Number.isFinite));assert.equal(m.owner,'kasen');assert.equal(m.space,'senkai_kasen');assert.equal(m.basis,'P');assert.equal(m.overview,kind==='overview');
   for(let i=0;i<a.length;i+=9){assert(Math.abs(Math.hypot(a[i+3],a[i+4],a[i+5])-1)<1e-5,`${m.id}: normal`);assert(Math.hypot(a[i]-m.center[0],a[i+1]-m.center[1],a[i+2]-m.center[2])<m.radius+.02,`${m.id}: bounds`);}
   for(let i=0;i<a.length;i+=27){const ab=[a[i+9]-a[i],a[i+10]-a[i+1],a[i+11]-a[i+2]],ac=[a[i+18]-a[i],a[i+19]-a[i+1],a[i+20]-a[i+2]];assert(G.length(G.cross(ab,ac))>1e-7,`${m.id}: degenerate`);}
  }
  assert.equal(p.meta.surfaceCut,false);assert.equal(p.meta.fullRealm,false);assert.equal(p.meta.realEntrances,false);
 }
 assert.equal(geo(G.buildKasen()),geo(detail));assert.equal(geo(await G.buildRegion(atlas,'kasen','')),geo(detail));assert(far.bytes<2*1048576&&far.bytes<detail.bytes*.2);assert(detail.bytes<20*1048576);
 for(const part of ['roof0','roof1','roof2','front','interior','ritual'])assert(detail.meshes.some(m=>m.kasenPart===part),`Missing ${part}`);
 assert(!far.meshes.some(m=>m.kasenPart==='interior'||m.kasenPart==='ritual'));
 for(const zone of ['house','annex','yard','bridge','water','mountains','path'])assert(detail.meshes.some(m=>m.kasenZone===zone));
 assert.equal(Object.keys(G.KASEN.views).length,14);for(const [id,p]of Object.entries(G.KASEN.views)){assert.equal(p.space,'senkai_kasen');assert.equal(G.DIORAMA.regionOf(id),'kasen');assert(p.eye.every(Number.isFinite)&&p.target.every(Number.isFinite));assert(G.length(G.sub(p.eye,p.target))>5);}
 assert.equal(G.KASEN.views.kasenInk.kasenEdition,'th155');assert.equal(G.KASEN.views.kasenSection.kasenSection,true);
 const c=characters.characters.find(c=>c.id==='kasen');assert.equal(c.space,'senkai_kasen');assert(c.position.every(Number.isFinite)&&c.positionBasis.startsWith('P'));assert.equal(G.PRESETS[c.view].space,c.space);assert(c.locationSources.length);assert.equal(c.art.urls.length,0);
 return{detailMeshes:detail.meshes.length,triangles:detail.bytes/108,detailBytes:detail.bytes,overviewBytes:far.bytes,presets:14,locations:2,characters:79,navigable:89,pending:90,protectedFiles:Object.keys(fixed.protectedFiles).length};
}
