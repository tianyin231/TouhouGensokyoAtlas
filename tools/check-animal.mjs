// Fixed, reviewed expectations. This checker never regenerates its own fixtures.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
const geometry=p=>hash(Buffer.concat(p.meshes.map(m=>Buffer.from(m.vertices.buffer,m.vertices.byteOffset,m.vertices.byteLength))));
const same=(a,b,msg)=>assert.equal(JSON.stringify(a),JSON.stringify(b),msg);
export async function checkAnimal(G,atlas,characters,read){
 const fixed=JSON.parse(read('tools/animal-baseline.json'));
 for(const [file,digest]of Object.entries(fixed.protectedFiles))assert.equal(hash(read(file)),digest,`Inherited source changed: ${file}`);
 assert.equal(hash(JSON.stringify(characters.characters.slice(0,73))),fixed.original73);
 for(const [key,value]of [['placements',atlas.placements],['relationships',atlas.relationships],['visits',characters.additionalVisits]])assert.equal(hash(JSON.stringify(value)),fixed[key]);
 assert(characters.characters.length>=75);assert.equal(new Set(characters.characters.map(c=>c.id)).size,characters.characters.length);
 const audit=G.auditLandmarks(atlas);assert.equal(audit.total,179);assert(audit.navigable>=86);assert.equal(audit.navigable+audit.pending,179);
 for(const [id,view]of Object.entries(fixed.previousMappings))assert.equal(G.resolveLocation(id).view,view,`Previous navigation changed: ${id}`);
 for(const id of ['wind_cave','geyser_mountain','sanctuary','animal_hq'])assert.equal(G.resolveLocation(id).view,null);
 assert.equal(G.ANIMAL.version,'0.24.0');assert.equal(Object.keys(G.ANIMAL.views).length,16);assert.equal(Object.keys(G.ANIMAL.locations).length,2);
 const sourceIds=new Set(atlas.sources.map(s=>s.id));assert.equal(sourceIds.size,atlas.sources.length);
 for(const [id,view]of Object.entries(G.ANIMAL.locations)){
  const l=atlas.locations.find(l=>l.id===id);assert(l);assert.equal(G.resolveLocation(id).view,view);assert(l.coordinate_status.startsWith('P'));
  assert(l.source_ids.some(s=>s.startsWith('AN-')));for(const sid of l.source_ids)assert(sourceIds.has(sid));assert(!atlas.placements.some(p=>p.id===id));
 }
 const names=['Concrete','Stone','Paving','Road','Metal','Glass','Window','Clay','Dark','Turf','Leaf','Bark','Circuit','Display','Spirit','Water'];
 const materials=new Set(names.map(n=>'animal'+n)),stats={};let overviewBytes=0;
 for(const [id,fn]of [['animal',G.buildAnimalCity],['primate_core',G.buildPrimateCore]]){
  const b=G.DIORAMA.map.get(id);assert(b.independent&&b.poly.length===0&&b.space===id);
  same(G.DIORAMA.transform(id,'atlas'),{scale:1,offset:[0,0,0]});
  for(const key of ['point','inverse'])same(G.DIORAMA[key]([17,24,-105],id,'atlas'),[17,24,-105]);
  const detail=fn(),overview=fn(true);overviewBytes+=overview.bytes;
  assert(overview.bytes<detail.bytes*.35);assert(detail.bytes<(id==='animal'?30:4)*1048576);
  for(const [kind,p]of [['detail',detail],['overview',overview]]){
   const expected=fixed.packs[id][kind];assert.equal(p.meshes.length,expected.meshes);assert.equal(p.bytes,expected.bytes);assert.equal(geometry(p),expected.geometry,`${id}/${kind}: review the new geometry before updating the fixture`);
   assert.equal(new Set(p.meshes.map(m=>m.id)).size,p.meshes.length);assert.equal(p.bytes,p.meshes.reduce((n,m)=>n+m.vertices.byteLength,0));
   assert.equal(p.meta.surfaceCut,false);assert.equal(p.meta.fullRealm,false);assert.equal(p.meta.officialHeadquarters,false);
   for(const m of p.meshes){const a=m.vertices;assert.equal(m.owner,id);assert.equal(m.space,id);assert.equal(m.region,id);assert.equal(m.basis,'P');assert.equal(m.overview,kind==='overview');assert(materials.has(m.material));
    assert(a.length>0&&a.length%27===0&&a.every(Number.isFinite));assert(m.center.every(Number.isFinite)&&Number.isFinite(m.radius)&&m.radius>0);
    for(let i=0;i<a.length;i+=9){assert(Math.abs(Math.hypot(a[i+3],a[i+4],a[i+5])-1)<1e-5,`${m.id}: normal`);assert(Math.hypot(a[i]-m.center[0],a[i+1]-m.center[1],a[i+2]-m.center[2])<m.radius+.02,`${m.id}: bounds`);if(m.animalZone==='garden')assert(a[i+4]>.99,'Garden top must face upwards');}
    for(let i=0;i<a.length;i+=27){const ab=[a[i+9]-a[i],a[i+10]-a[i+1],a[i+11]-a[i+2]],ac=[a[i+18]-a[i],a[i+19]-a[i+1],a[i+20]-a[i+2]];assert(G.length(G.cross(ab,ac))>1e-7,`${m.id}: degenerate face`);}
    if(['ground','horizon','moat'].includes(m.animalZone))assert.equal(m.shadowCaster,false);
   }
  }
  assert.equal(geometry(fn()),geometry(detail),'Non-deterministic builder');assert.equal(geometry(await G.buildRegion(atlas,id,'')),geometry(detail),'Worker dispatch mismatch');
  assert(!overview.meshes.some(m=>m.animalZone==='workshop'||m.animalPart==='spirits'));
  stats[id]={meshes:detail.meshes.length,triangles:detail.bytes/108,detailBytes:detail.bytes,overviewBytes:overview.bytes};
 }
 assert(overviewBytes<3*1048576,'Cold proxy budget');
 const city=G.buildAnimalCity(),core=G.buildPrimateCore();
 assert.equal(city.meta.towers,89);assert.equal(city.meta.trees,121);assert.equal(city.meta.roadSamples.length,104);
 for(const z of ['ground','boulevard','earthworks','garden','gardenPath','access','gate','guardWalk','woodland','moat'])assert(city.meshes.some(m=>m.animalZone===z),`Missing ${z}`);
 for(const z of ['foundation','shell','floor','gallery','stairs','inlay','panels','central','workshop','coreGuard'])assert(core.meshes.some(m=>m.animalZone===z),`Missing interior ${z}`);
 for(const part of ['front','left','right','back','roof'])assert(core.meshes.some(m=>m.animalZone==='shell'&&m.animalPart===part));
 for(const t of city.meta.buildingSites)for(const sx of [-1,1])for(const sz of [-1,1])assert(G.ANIMAL.ringRatio(t.x+sx*(t.w/2+14),t.z+sz*(t.d/2+14))>=1.24,'Building intrudes into the garden reserve');
 for(const p of city.meta.roadSamples){assert(Math.abs(p[1]-G.ANIMAL.parkHeight(p[0],p[2])-.72)<1e-7);assert(p.every(Number.isFinite));}
 for(const m of city.meshes.filter(m=>m.animalZone==='gate'&&m.animalPart==='base'))for(let i=0;i<m.vertices.length;i+=9){if(m.vertices[i+1]<38)assert(Math.abs(m.vertices[i])>=13.49,'Gate foundation blocks its central opening');}
 assert(city.meshes.some(m=>m.material==='animalDark'&&m.animalPart==='figures'));assert.equal(core.meta.unmeasuredInterior,true);assert.equal(core.meta.walkableCollision,false);
 for(const [id,p]of Object.entries(G.ANIMAL.views)){assert.equal(p.space,p.region);assert.equal(G.DIORAMA.regionOf(id),p.region);assert(G.ANIMAL.regions.includes(p.region));assert(p.eye.every(Number.isFinite)&&p.target.every(Number.isFinite));assert(G.length(G.sub(p.eye,p.target))>5);assert(p.era);}
 assert.equal(G.ANIMAL.views.primateBefore.animalEra,'before');assert.equal(G.ANIMAL.views.primateSection.animalSection,true);
 for(const c of characters.characters.slice(73,75)){assert(['mayumi','keiki'].includes(c.id));assert.equal(G.PRESETS[c.view].space,c.space);assert(c.position.every(Number.isFinite));assert(c.positionBasis.startsWith('P'));assert(c.locationSources.length);assert.equal(c.art.urls.length,0);assert.equal(c.animalEra,'keiki');}
 return {packs:stats,overviewBytes,presets:16,locations:2,navigable:audit.navigable,pending:audit.pending,characters:characters.characters.length,protectedFiles:Object.keys(fixed.protectedFiles).length};
}
