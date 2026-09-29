// Read-only reviewed fixtures. Run the renderer and review imagery before updating expectations.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
const geo=p=>hash(Buffer.concat(p.meshes.map(m=>Buffer.from(m.vertices.buffer,m.vertices.byteOffset,m.vertices.byteLength))));
const same=(a,b,msg)=>assert.equal(JSON.stringify(a),JSON.stringify(b),msg);
export async function checkBackdoor(G,atlas,characters,read){
 const fixed=JSON.parse(read('tools/backdoor-baseline.json'));
 for(const [file,digest]of Object.entries(fixed.protectedFiles))assert.equal(hash(read(file)),digest,`Inherited file changed: ${file}`);
 assert.equal(hash(JSON.stringify(characters.characters.slice(0,75))),fixed.original75);
 for(const [k,v]of [['placements',atlas.placements],['relationships',atlas.relationships],['visits',characters.additionalVisits]])assert.equal(hash(JSON.stringify(v)),fixed[k]);
 assert.equal(characters.characters.length,78);assert.equal(new Set(characters.characters.map(c=>c.id)).size,78);
 for(const [id,view]of Object.entries(fixed.previousMappings))assert.equal(G.resolveLocation(id).view,view);
 const audit=G.auditLandmarks(atlas);same([audit.version,audit.total,audit.navigable,audit.pending],['0.25.0',179,87,92]);
 for(const id of ['wind_cave','geyser_mountain','sanctuary','animal_hq','hell','kasen_senkai'])assert.equal(G.resolveLocation(id).view,null);
 assert.equal(G.resolveLocation('backdoor').view,'backdoorOverview');assert.equal(G.resolveLocation('backdoor').status,'selection');
 assert(!atlas.placements.some(p=>p.id==='backdoor'));const b=G.DIORAMA.map.get('backdoor');assert(b.independent&&b.poly.length===0&&b.space==='backdoor');
 same(G.DIORAMA.transform('backdoor','atlas'),{scale:1,offset:[0,0,0]});for(const f of ['point','inverse'])same(G.DIORAMA[f]([45,7,-32],'backdoor','atlas'),[45,7,-32]);
 const validate=m=>{const a=m.vertices;assert(a.length&&a.length%27===0&&a.every(Number.isFinite));assert(m.center.every(Number.isFinite)&&m.radius>0&&Number.isFinite(m.radius));
  for(let i=0;i<a.length;i+=9){assert(Math.abs(Math.hypot(a[i+3],a[i+4],a[i+5])-1)<1e-5,`${m.id}: normal`);assert(Math.hypot(a[i]-m.center[0],a[i+1]-m.center[1],a[i+2]-m.center[2])<m.radius+.02,`${m.id}: bound`);}
  for(let i=0;i<a.length;i+=27){const ab=[a[i+9]-a[i],a[i+10]-a[i+1],a[i+11]-a[i+2]],ac=[a[i+18]-a[i],a[i+19]-a[i+1],a[i+20]-a[i+2]];assert(G.length(G.cross(ab,ac))>1e-7,`${m.id}: degenerate face`);}
 };
 const detail=G.buildBackdoor(),far=G.buildBackdoorOverview();
 for(const [kind,p]of [['detail',detail],['overview',far]]){
  const f=fixed.packs[kind];assert.equal(p.meshes.length,f.meshes);assert.equal(p.bytes,f.bytes);assert.equal(geo(p),f.geometry);assert.equal(p.bytes,p.meshes.reduce((s,m)=>s+m.vertices.byteLength,0));assert.equal(new Set(p.meshes.map(m=>m.id)).size,p.meshes.length);
  for(const m of p.meshes){validate(m);assert.equal(m.owner,'backdoor');assert.equal(m.space,'backdoor');assert.equal(m.overview,kind==='overview');assert.equal(m.basis,'P');assert(m.material.startsWith('backdoor'));assert(['hall','six','both'].includes(m.backdoorEdition));assert(['open','closed','both'].includes(m.backdoorState));}
  assert.equal(p.meta.surfaceCut,false);assert.equal(p.meta.fullRealm,false);assert.equal(p.meta.seasonalGates,4);
 }
 assert.equal(geo(detail),geo(G.buildBackdoor()));assert.equal(geo(await G.buildRegion(atlas,'backdoor','')),geo(detail));assert(far.bytes<2*1048576&&far.bytes<detail.bytes*.25);assert(!far.meshes.some(m=>m.backdoorPart==='dust'));
 for(const part of ['floor','ceiling','frame','leaf','window','dais','seat','haze'])assert(detail.meshes.some(m=>m.backdoorPart===part));
 for(const state of ['open','closed'])assert(detail.meshes.some(m=>m.backdoorPart==='leaf'&&m.backdoorState===state));
 assert.equal(Object.keys(G.BACKDOOR.views).length,14);for(const [id,p]of Object.entries(G.BACKDOOR.views)){assert.equal(p.space,'backdoor');assert.equal(G.DIORAMA.regionOf(id),'backdoor');assert(p.eye.every(Number.isFinite)&&p.target.every(Number.isFinite));assert(G.length(G.sub(p.eye,p.target))>10);assert(p.era);}
 let tableauBytes=0;for(const d of G.BACKDOOR.windows){const p=G.buildBackdoorGlimpse(d.id);validate(p.mesh);tableauBytes+=p.mesh.vertices.byteLength;assert.equal(hash(Buffer.from(p.mesh.vertices.buffer)),fixed.tableaux[d.id]);assert(detail.meshes.some(m=>m.material==='backdoorWindow'+d.id&&m.backdoorState==='open'));}
 assert(tableauBytes<4*1048576);assert.equal(G.BACKDOOR.livePortals,false);
 const l=atlas.locations.find(l=>l.id==='backdoor');assert(l.coordinate_status.startsWith('P'));assert(l.source_ids.includes('BD-TH16'));const sources=new Set(atlas.sources.map(s=>s.id));assert.equal(sources.size,atlas.sources.length);for(const id of l.source_ids)assert(sources.has(id));
 for(const c of characters.characters.slice(75)){assert(['okina','satono','mai_teireida'].includes(c.id));assert.equal(c.space,'backdoor');assert.equal(G.PRESETS[c.view].space,c.space);assert(c.position.every(Number.isFinite));assert(c.positionBasis.startsWith('P'));assert(c.locationSources.length);assert.equal(c.art.urls.length,0);}
 assert(characters.characters.some(c=>c.id==='mai'&&c.space!=='backdoor')||characters.characters.some(c=>c.name==='舞'&&c.space!=='backdoor'));
 return{detailMeshes:detail.meshes.length,triangles:detail.bytes/108,detailBytes:detail.bytes,overviewBytes:far.bytes,tableauBytes,presets:14,locations:1,characters:78,navigable:87,pending:92,protectedFiles:Object.keys(fixed.protectedFiles).length};
}
