// Reviewed fixed fixtures: the checker never writes new expectations.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
const geometry=p=>hash(Buffer.concat(p.meshes.map(m=>Buffer.from(m.vertices.buffer,m.vertices.byteOffset,m.vertices.byteLength))));
export async function checkLunar(G,atlas,characters,read){
 const fixed=JSON.parse(read('tools/lunar-baseline.json'));
 for(const [f,h]of Object.entries(fixed.protectedFiles))assert.equal(hash(read(f)),h,`${f}: v0.18 inheritance changed`);
 assert.equal(hash(JSON.stringify(characters.characters.slice(0,53))),fixed.originalCharacters);
 assert.equal(characters.characters.length,57);assert.equal(atlas.locations.length,179);
 const sources=new Set(atlas.sources.map(s=>s.id));assert.equal(sources.size,atlas.sources.length);
 assert.equal(Object.keys(G.LUNAR.views).length,14);
 assert(!G.IMPLEMENTED.dream,'A passage fragment is not the entire dream world');
 for(const [id,view]of Object.entries({lunar_capital:'moonOverview',watatsuki:'moonResidence',lunar_peaches:'moonPeaches',fertility:'moonFertility',tranquility:'moonSeaInner',kaian:'dreamPassage'})){
  assert.equal(G.IMPLEMENTED[id],view);const l=atlas.locations.find(l=>l.id===id);assert(l&&l.coordinate_status.includes('P'));assert(l.source_ids.some(s=>s.startsWith('LUN-')));for(const sid of l.source_ids)assert(sources.has(sid));
  assert(!atlas.placements.some(p=>p.id===id),'Moon must not flatten a surface placement');
 }
 for(const id of G.LUNAR.regions){const b=G.DIORAMA.map.get(id);assert(b.independent&&b.poly.length===0);assert(G.LUNAR.spaces.includes(b.space));
  assert.equal(JSON.stringify(G.DIORAMA.transform(id,'atlas')),JSON.stringify({scale:1,offset:[0,0,0]}));
  assert.equal(JSON.stringify(G.DIORAMA.point([5,17,-9],id,'atlas')),JSON.stringify([5,17,-9]));
  assert.equal(JSON.stringify(G.DIORAMA.inverse([5,17,-9],id,'atlas')),JSON.stringify([5,17,-9]));
 }
 const mats=new Set(['Stone','Paving','Sand','Basalt','Wall','Wood','Tile','Ridge','Paper','Leaf','Lamp','Water','Lattice','Crane','Dream'].map(x=>'lunar'+x));
 const stats={};let overviewBytes=0;
 for(const [id,fn]of [['lunar',G.buildLunarCity],['tranquility',G.buildLunarSea],['kaian',G.buildKaian]]){
  const detail=fn(),overview=fn(true),expect=fixed.packs[id];
  for(const [kind,p]of [['detail',detail],['overview',overview]]){
   assert.equal(p.meshes.length,expect[kind].meshes);assert.equal(p.bytes,expect[kind].bytes);assert.equal(geometry(p),expect[kind].geometry,`${id}/${kind} geometry changed; review the actual scene`);
   assert.equal(p.bytes,p.meshes.reduce((s,m)=>s+m.vertices.byteLength,0));assert.equal(p.meta.surfaceCut,false);assert.equal(new Set(p.meshes.map(m=>m.id)).size,p.meshes.length);
   for(const m of p.meshes){const a=m.vertices;assert.equal(m.owner,id);assert.equal(m.region,id);assert.equal(m.space,G.DIORAMA.map.get(id).space);assert.equal(m.basis,'P');assert(mats.has(m.material));assert.equal(m.overview,kind==='overview');
    assert(a.length>0&&a.length%27===0&&a.every(Number.isFinite));assert(m.center.every(Number.isFinite)&&Number.isFinite(m.radius)&&m.radius>0);
    for(let i=0;i<a.length;i+=9){assert(Math.abs(Math.hypot(a[i+3],a[i+4],a[i+5])-1)<1e-5,`${m.id}: invalid normal`);assert(Math.hypot(a[i]-m.center[0],a[i+1]-m.center[1],a[i+2]-m.center[2])<=m.radius+.01,`${m.id}: stale bounds`);}
   }
  }
  assert.equal(geometry(fn()),geometry(detail),'Non-deterministic builder');assert.equal(geometry(await G.buildRegion(atlas,id,'')),geometry(detail),'Worker dispatcher returned another scene');
  assert(!overview.meshes.some(m=>['daily','interior'].includes(m.lunarPart)));assert(overview.bytes<detail.bytes*.45);
  overviewBytes+=overview.bytes;stats[id]={detailMeshes:detail.meshes.length,triangles:detail.bytes/108,sourceBytes:detail.bytes,overviewBytes:overview.bytes};
 }
 assert(overviewBytes<2*1048576,'Independent boot proxies must remain small');
 const sea=G.buildLunarSea();assert(sea.meshes.filter(m=>m.lunarFace==='outer').every(m=>m.material==='lunarBasalt'));assert(sea.meshes.some(m=>m.lunarFace==='inner'&&m.material==='lunarWater'));
 const city=G.buildLunarCity();for(const zone of ['land','gate','walls','court','residence','rearLane','orchard','shore','sea'])assert(city.meshes.some(m=>m.lunarZone===zone),`Missing physical zone: ${zone}`);
 assert(city.meshes.some(m=>m.lunarPart==='interior'));assert(city.meshes.some(m=>m.lunarPart==='daily'));
 for(const [view,p]of Object.entries(G.LUNAR.views)){assert(G.LUNAR.regions.includes(p.region));assert.equal(p.space,G.DIORAMA.map.get(p.region).space);assert(p.eye.every(Number.isFinite)&&p.target.every(Number.isFinite));assert(G.length(G.sub(p.eye,p.target))>5);assert.equal(G.DIORAMA.regionOf(view),p.region);}
 assert.equal(G.LUNAR.views.moonSealed.lunarSealed,true);assert.equal(G.LUNAR.views.moonSeaOuter.lunarFace,'outer');
 for(const id of ['toyohime','yorihime','sagume','doremy']){const c=characters.characters.find(c=>c.id===id);assert(c.position.every(Number.isFinite));assert(G.LUNAR.spaces.includes(c.space));assert.equal(G.PRESETS[c.view].space,c.space);assert(c.locationSources.length&&c.positionBasis.startsWith('P'));assert(c.art.sourcePage);}
 for(const id of ['toyohime','yorihime'])assert.equal(characters.characters.find(c=>c.id===id).art.urls.length,0,'Unverified art must not masquerade as an original portrait');
 assert.equal(G.buildKaian().meta.fullDreamWorld,false);
 return {packs:stats,totalOverviewBytes:overviewBytes,protectedFiles:Object.keys(fixed.protectedFiles).length,presets:14};
}
