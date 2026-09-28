// Fixed reviewed fixtures. Test execution never rewrites hashes or expected geometry.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
const geo=p=>hash(Buffer.concat(p.meshes.map(m=>Buffer.from(m.vertices.buffer,m.vertices.byteOffset,m.vertices.byteLength))));
export async function checkMakai(G,atlas,characters,read){
 const fixed=JSON.parse(read('tools/makai-baseline.json'));
 for(const[f,d]of Object.entries(fixed.protectedFiles))assert.equal(hash(read(f)),d,`${f}: inherited bytes changed`);
 assert.equal(hash(JSON.stringify(characters.characters.slice(0,57))),fixed.original57,'Original residents and lunar identities changed');
 assert(characters.characters.length>=65);assert.equal(new Set(characters.characters.map(c=>c.id)).size,characters.characters.length);
 assert.equal(atlas.locations.length,179);assert.equal(new Set(atlas.locations.map(l=>l.id)).size,179);
 assert.equal(hash(JSON.stringify(atlas.placements)),fixed.placements);assert.equal(hash(JSON.stringify(atlas.relationships)),fixed.relationships);
 const patches=JSON.parse(read('data/makai.json')),ids=new Set(atlas.locations.map(l=>l.id)),sources=new Set(atlas.sources.map(s=>s.id));
 assert.equal(sources.size,atlas.sources.length);assert.equal(patches.locationUpdates.length,10);
 assert.equal(Object.keys(G.MAKAI.views).length,19);assert.equal(G.MAKAI.exhibitionOnly,true);
 for(const[id,view]of Object.entries(G.MAKAI.locations)){
  assert.equal(G.IMPLEMENTED[id],view);assert(ids.has(id));assert(G.PRESETS[view]);
  assert(!atlas.placements.some(p=>p.id===id),'Independent versions must not flatten surface terrain');
  const l=atlas.locations.find(l=>l.id===id);assert(l.coordinate_status.includes('P'));assert(l.source_ids.some(s=>s.startsWith('MK-')));for(const s of l.source_ids)assert(sources.has(s));
 }
 assert(!G.IMPLEMENTED.pc98_blood&&!G.IMPLEMENTED.pc98_mugen&&!G.IMPLEMENTED.pc98_hell);
 const mat=new Set(['Stone','Rock','Wall','Paving','Wood','Tile','Metal','Glass','Crystal','Ice','Lamp','Skyline','Red','Spectrum','Seal','Spirit','Miasma'].map(s=>'makai'+s));
 const stats={};let overview=0;
 for(const[id,fn]of [['makai12',G.buildMakai12],['makai05',G.buildMakai05],['makai01',G.buildMakai01]]){
  const b=G.DIORAMA.map.get(id);assert(b.independent&&b.poly.length===0&&b.space===id);
  assert.equal(JSON.stringify(G.DIORAMA.transform(id,'atlas')),JSON.stringify({scale:1,offset:[0,0,0]}));
  for(const k of['point','inverse'])assert.equal(JSON.stringify(G.DIORAMA[k]([17,31,-12],id,'atlas')),JSON.stringify([17,31,-12]));
  const detail=fn(),far=fn(true);overview+=far.bytes;assert(far.bytes<detail.bytes*.20);
  for(const [kind,p]of [['detail',detail],['overview',far]]){
   const e=fixed.packs[id][kind];assert.equal(p.meshes.length,e.meshes);assert.equal(p.bytes,e.bytes);assert.equal(geo(p),e.geometry,`${id}/${kind}: review changes before updating fixtures`);
   assert.equal(new Set(p.meshes.map(m=>m.id)).size,p.meshes.length);assert.equal(p.bytes,p.meshes.reduce((s,m)=>s+m.vertices.byteLength,0));assert.equal(p.meta.surfaceCut,false);
   for(const m of p.meshes){const a=m.vertices;assert.equal(m.owner,id);assert.equal(m.region,id);assert.equal(m.space,id);assert.equal(m.basis,'P');assert.equal(m.overview,kind==='overview');assert(mat.has(m.material));
    assert(a.length>0&&a.length%27===0&&a.every(Number.isFinite));assert(m.center.every(Number.isFinite)&&m.radius>0&&Number.isFinite(m.radius));
    for(let i=0;i<a.length;i+=9){assert(Math.abs(Math.hypot(a[i+3],a[i+4],a[i+5])-1)<1e-5,`${m.id}: normal`);assert(Math.hypot(a[i]-m.center[0],a[i+1]-m.center[1],a[i+2]-m.center[2])<=m.radius+.01,`${m.id}: bounds`);}
    for(let i=0;i<a.length;i+=27){const ab=[a[i+9]-a[i],a[i+10]-a[i+1],a[i+11]-a[i+2]],ac=[a[i+18]-a[i],a[i+19]-a[i+1],a[i+20]-a[i+2]];assert(G.length(G.cross(ab,ac))>1e-7,`${m.id}: degenerate face`);}
    if(['horizon','land','blackland','ruinland'].includes(m.makaiZone))assert.equal(m.shadowCaster,false,'Large ground must not write the focused shadow map');
   }
  }
  assert.equal(geo(fn()),geo(detail),'Rebuild order changed geometry');assert.equal(geo(await G.buildRegion(atlas,id,'')),geo(detail),'Worker dispatch mismatch');
  assert(!far.meshes.some(m=>['props','atmosphere'].includes(m.makaiPart)));
  stats[id]={meshes:detail.meshes.length,triangles:detail.bytes/108,sourceBytes:detail.bytes,overviewBytes:far.bytes};
 }
 assert(overview<2*1048576,'Cold-start proxy budget');
 const old=G.buildMakai05(),modern=G.buildMakai12(),first=G.buildMakai01();
 for(const zone of['land','gate','passage','road','streetWest','streetEast','ice','hall','palaceBase','terrace','spire'])assert(old.meshes.some(m=>m.makaiZone===zone),`Missing ${zone}`);
 for(const part of['interior','left','right','front','back','roof','vault'])assert(old.meshes.some(m=>m.makaiZone==='hall'&&m.makaiPart===part));
 assert(modern.meshes.some(m=>m.makaiPart==='seal'));assert(modern.meshes.some(m=>m.makaiPart==='spectrum'));assert(first.meshes.some(m=>m.makaiZone==='vina'));assert(first.meshes.some(m=>m.makaiZone==='sanctuary'));
 for(const[id,p]of Object.entries(G.MAKAI.views)){assert.equal(p.space,p.region);assert.equal(G.DIORAMA.regionOf(id),p.region);assert(G.MAKAI.regions.includes(p.region));assert(p.eye.every(Number.isFinite)&&p.target.every(Number.isFinite));assert(G.length(G.sub(p.eye,p.target))>5);assert(p.era);}
 assert.equal(G.MAKAI.views.makaiSeal.makaiSeal,true);assert(!G.MAKAI.views.hokkai.makaiSeal);assert(G.MAKAI.views.pandemoniumSection.makaiSection);
 for(const c of characters.characters.slice(57,65)){assert(c.position.every(Number.isFinite));assert.equal(G.PRESETS[c.view].space,c.space);assert(c.positionBasis.startsWith('P'));assert(c.locationSources.length);assert.equal(c.art.urls.length,0,'Unverified PC98 portraits must not be fabricated');}
 assert.equal(characters.additionalVisits.length,2);
 for(const v of characters.additionalVisits){assert(['alice','byakuren'].includes(v.characterId));assert.equal(G.PRESETS[v.view].space,v.space);assert(v.positionBasis.startsWith('P'));}
 assert.equal(characters.characters.find(c=>c.id==='byakuren').locationId,'myouren');assert.equal(characters.characters.find(c=>c.id==='alice').locationId,'alice');
 return{packs:stats,totalOverviewBytes:overview,presets:19,locationMappings:10,charactersAdded:8,historicalVisits:2};
}
