// Reviewed geometry and navigation expectations. This file never updates fixtures.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
const geo=p=>hash(Buffer.concat(p.meshes.map(m=>Buffer.from(m.vertices.buffer,m.vertices.byteOffset,m.vertices.byteLength))));
export async function checkNetherworld(G,atlas,characters,read){
 const fixed=JSON.parse(read('tools/netherworld-baseline.json'));
 for(const[f,h]of Object.entries(fixed.protectedFiles))assert.equal(hash(read(f)),h,`${f}: inherited source changed`);
 assert(characters.characters.length>=67);assert.equal(new Set(characters.characters.map(c=>c.id)).size,characters.characters.length);
 assert.equal(hash(JSON.stringify(characters.characters.slice(0,65))),fixed.original65,'Existing residents must not be moved');
 assert.equal(hash(JSON.stringify(characters.additionalVisits)),fixed.originalVisits,'Old visits must be preserved');
 const audit=G.auditLandmarks(atlas);assert.equal(audit.total,179);assert(audit.navigable>=77);assert(audit.pending<=102);assert.equal(audit.navigable+audit.pending,179);
 assert.equal(Object.keys(G.LANDMARKS.repaired).length,8);assert.equal(Object.keys(G.LANDMARKS.pending).length,0);
 for(const[id,view]of Object.entries(fixed.repaired)){assert.equal(G.resolveLocation(id).view,view);assert.equal(G.resolveLocation(id).status,'component');}
 assert(atlas.placements.some(p=>p.id==='geyser_mountain'),'Preserve the research anchor');
 assert.equal(G.resolveLocation('geyser_mountain').view,'geyserOverview','Authored spring selection, not the forest fallback');
 assert.equal(G.resolveLocation('this-location-is-unknown').view,null);
 const oldMappings=fixed.originalMappings;
 for(const[id,view]of Object.entries(oldMappings))assert.equal(G.resolveLocation(id).view,view,`Lost previous entry ${id}`);
 for(const item of audit.items)if(item.view){const p=G.PRESETS[item.view];assert(p);assert(G.DIORAMA.map.has(G.DIORAMA.regionOf(item.view))||p.region==='village');}
 const ids=new Set(atlas.locations.map(l=>l.id)),sources=new Set(atlas.sources.map(s=>s.id));assert.equal(sources.size,atlas.sources.length);
 assert.equal(Object.keys(G.NETHERWORLD.locations).length,5);assert.equal(Object.keys(G.NETHERWORLD.views).length,13);assert.equal(G.NETHERWORLD.fullRealm,false);
 for(const[id,view]of Object.entries(G.NETHERWORLD.locations)){
  assert(ids.has(id));assert.equal(G.resolveLocation(id).view,view);assert(!atlas.placements.some(p=>p.id===id));
  const l=atlas.locations.find(l=>l.id===id);assert(l.coordinate_status.startsWith('P'));assert(l.source_ids.some(s=>s.startsWith('NW-')));for(const sid of l.source_ids)assert(sources.has(sid));
 }
 const block=G.DIORAMA.map.get('netherworld');assert(block.independent&&block.poly.length===0&&block.space==='netherworld');
 assert.equal(JSON.stringify(G.DIORAMA.transform('netherworld','atlas')),JSON.stringify({scale:1,offset:[0,0,0]}));
 for(const k of['point','inverse'])assert.equal(JSON.stringify(G.DIORAMA[k]([8,99,-77],'netherworld','atlas')),JSON.stringify([8,99,-77]));
 const detail=G.buildNetherworld(),far=G.buildNetherworldOverview();assert(far.bytes<2*1048576);assert(detail.bytes<48*1048576);assert(far.bytes<detail.bytes*.08);
 const materials=new Set(['Soil','Stone','Paving','Rock','Moss','Gravel','Wood','Bark','Wall','Paper','Tile','TileEdge','Tatami','Blossom','Pine','Rope','Cloth','Lamp','Boundary','Mist','Spirit','Petal'].map(x=>'nether'+x));
 for(const [kind,p]of [['detail',detail],['overview',far]]){
  const e=fixed.packs[kind];assert.equal(p.bytes,e.bytes);assert.equal(p.meshes.length,e.meshes);assert.equal(geo(p),e.geometry,`${kind}: inspect before updating geometry fixture`);
  assert.equal(p.bytes,p.meshes.reduce((s,m)=>s+m.vertices.byteLength,0));assert.equal(new Set(p.meshes.map(m=>m.id)).size,p.meshes.length);assert.equal(p.meta.surfaceCut,false);assert.equal(p.meta.saigyouDefault,'sealed');
  for(const m of p.meshes){const a=m.vertices;assert.equal(m.owner,'netherworld');assert.equal(m.space,'netherworld');assert.equal(m.region,'netherworld');assert.equal(m.basis,'P');assert.equal(m.overview,kind==='overview');assert(materials.has(m.material));
   assert(a.length>0&&a.length%27===0&&a.every(Number.isFinite));assert(m.center.every(Number.isFinite)&&m.radius>0&&Number.isFinite(m.radius));
   for(let i=0;i<a.length;i+=9){assert(Math.abs(Math.hypot(a[i+3],a[i+4],a[i+5])-1)<1e-5,`${m.id}: normal`);assert(Math.hypot(a[i]-m.center[0],a[i+1]-m.center[1],a[i+2]-m.center[2])<=m.radius+.01,`${m.id}: bounds`);}
   for(let i=0;i<a.length;i+=27){const ab=[a[i+9]-a[i],a[i+10]-a[i+1],a[i+11]-a[i+2]],ac=[a[i+18]-a[i],a[i+19]-a[i+1],a[i+20]-a[i+2]];assert(G.length(G.cross(ab,ac))>1e-7,`${m.id}: zero-area triangle`);}
  }
 }
 assert.equal(geo(G.buildNetherworld()),geo(detail));assert.equal(geo(await G.buildRegion(atlas,'netherworld','')),geo(detail),'Worker/main dispatcher must match');
 for(const zone of['land','horizon','boundary','stairs','gardenGate','estateBase','hall','westWing','eastWing','gardenWall','dryGarden','saigyou'])assert(detail.meshes.some(m=>m.netherZone===zone),`Missing authored zone ${zone}`);
 assert(detail.meshes.some(m=>m.netherPart==='buds'));assert(detail.meshes.some(m=>m.netherPart==='interior'));assert(!far.meshes.some(m=>['interior','mist','petals','spirits','props'].includes(m.netherPart)));
 assert(!detail.meshes.some(m=>m.netherZone==='saigyou'&&m.netherPart==='flowers'),'Saigyou is not an ordinary blooming cherry');
 const bounds=zone=>{const a=detail.meshes.filter(m=>m.netherZone===zone).flatMap(m=>Array.from(m.vertices).filter((_,i)=>i%9<3));return a;};
 assert(bounds('westWing').length&&bounds('eastWing').length);
 // The staircase follows a continuous monotonic grade; do not mistake the sample points for rest platforms.
 for(let z=170;z<536;z+=2)assert(G.NETHERWORLD.height(0,z)>=G.NETHERWORLD.height(0,z+2));
 const stairs=detail.meshes.find(m=>m.netherZone==='stairs');assert.equal(stairs.vertices.length/27,122*36);
 for(const[id,p]of Object.entries(G.NETHERWORLD.views)){assert.equal(p.space,'netherworld');assert.equal(p.region,'netherworld');assert.equal(G.DIORAMA.regionOf(id),'netherworld');assert(p.eye.every(Number.isFinite)&&p.target.every(Number.isFinite));assert(G.length(G.sub(p.eye,p.target))>5);assert(p.era);}
 assert(G.NETHERWORLD.views.saigyouBuds.netherBuds);assert(!G.NETHERWORLD.views.saigyouSealed.netherBuds);assert(G.NETHERWORLD.views.hakugyokuSnow.netherWinter);assert(G.NETHERWORLD.views.hakugyokuSection.netherSection);
 for(const c of characters.characters.slice(65,67)){assert(['youmu','yuyuko'].includes(c.id));assert.equal(c.locationId,'hakugyokurou');assert.equal(c.space,'netherworld');assert(c.position.every(Number.isFinite));assert.equal(G.PRESETS[c.view].space,c.space);assert(c.locationSources.length);assert.equal(c.art.urls.length,0,'Do not invent unverified portrait files');}
 return{detailMeshes:detail.meshes.length,triangles:detail.bytes/108,detailBytes:detail.bytes,overviewBytes:far.bytes,trees:detail.meta.treeCount,presets:13,newLocations:5,repairedBindings:8,removedFallbacks:2,navigable:audit.navigable,pending:audit.pending,protectedFiles:Object.keys(fixed.protectedFiles).length};
}
