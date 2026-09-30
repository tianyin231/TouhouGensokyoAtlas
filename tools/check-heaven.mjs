// Read-only reviewed fixtures: do not replace expected values while running tests.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
const geo=p=>hash(Buffer.concat(p.meshes.map(m=>Buffer.from(m.vertices.buffer,m.vertices.byteOffset,m.vertices.byteLength))));
export async function checkHeaven(G,atlas,characters,read){
 const fixed=JSON.parse(read('tools/heaven-baseline.json'));
 for(const[f,h]of Object.entries(fixed.protectedFiles))assert.equal(hash(read(f)),h,`Inherited file changed: ${f}`);
 assert(characters.characters.length>=69);assert.equal(new Set(characters.characters.map(c=>c.id)).size,characters.characters.length);
 assert.equal(hash(JSON.stringify(characters.characters.slice(0,67))),fixed.original67);
 assert.equal(hash(JSON.stringify(characters.additionalVisits)),fixed.visits);
 assert.equal(hash(JSON.stringify(atlas.placements)),fixed.placements);assert.equal(hash(JSON.stringify(atlas.relationships)),fixed.relationships);
 const audit=G.auditLandmarks(atlas);assert.equal(audit.total,179);assert(audit.navigable>=80);assert(audit.pending<=99);
 for(const[id,view]of Object.entries(fixed.previousMappings))assert.equal(G.resolveLocation(id).view,view,`Lost old navigation: ${id}`);
 for(const id of ['wind_cave','geyser_mountain'])assert.equal(G.resolveLocation(id).view,null);
 assert.equal(Object.keys(G.HEAVEN.views).length,14);assert.equal(Object.keys(G.HEAVEN.locations).length,3);assert.equal(G.HEAVEN.fullRealm,false);
 const sources=new Set(atlas.sources.map(s=>s.id));assert.equal(sources.size,atlas.sources.length);
 for(const[id,view]of Object.entries(G.HEAVEN.locations)){
  assert.equal(G.resolveLocation(id).view,view);assert(G.PRESETS[view]);assert(!atlas.placements.some(p=>p.id===id));
  const l=atlas.locations.find(l=>l.id===id);assert(l.coordinate_status.startsWith('P'));assert(l.source_ids.some(s=>s.startsWith('HV-')));for(const sid of l.source_ids)assert(sources.has(sid));
 }
 const materials=new Set(['Turf','Rock','Stone','Paving','Wood','Tile','Metal','Bark','Leaf','Fruit','Flower','Rope','Paper','Cloud','Aurora'].map(k=>'heaven'+k)),stats={};let overviewBytes=0;
 for(const[id,fn]of [['heaven',G.buildHeaven],['genkumoumi',G.buildCloudSea]]){
  const block=G.DIORAMA.map.get(id);assert(block.independent&&block.poly.length===0&&block.space===id);
  assert.equal(JSON.stringify(G.DIORAMA.transform(id,'atlas')),JSON.stringify({scale:1,offset:[0,0,0]}));
  for(const k of ['point','inverse'])assert.equal(JSON.stringify(G.DIORAMA[k]([9,32,-47],id,'atlas')),JSON.stringify([9,32,-47]));
  const d=fn(),o=fn(true);overviewBytes+=o.bytes;assert(o.bytes<d.bytes*.35);assert(d.bytes<24*1048576);
  for(const [kind,p]of [['detail',d],['overview',o]]){
   const exp=fixed.packs[id][kind];assert.equal(p.bytes,exp.bytes);assert.equal(p.meshes.length,exp.meshes);assert.equal(geo(p),exp.geometry,`${id}/${kind}: review geometry, never autofill fixtures`);
   assert.equal(p.bytes,p.meshes.reduce((s,m)=>s+m.vertices.byteLength,0));assert.equal(new Set(p.meshes.map(m=>m.id)).size,p.meshes.length);assert.equal(p.meta.surfaceCut,false);assert.equal(p.meta.fullRealm,false);
   for(const m of p.meshes){const a=m.vertices;assert(a.length>0&&a.length%27===0&&a.every(Number.isFinite));assert.equal(m.region,id);assert.equal(m.owner,id);assert.equal(m.space,id);assert.equal(m.basis,'P');assert.equal(m.overview,kind==='overview');assert(materials.has(m.material));assert(m.center.every(Number.isFinite)&&Number.isFinite(m.radius)&&m.radius>0);
    for(let i=0;i<a.length;i+=9){assert(Math.abs(Math.hypot(a[i+3],a[i+4],a[i+5])-1)<1e-5);assert(Math.hypot(a[i]-m.center[0],a[i+1]-m.center[1],a[i+2]-m.center[2])<m.radius+.02);}
    for(let i=0;i<a.length;i+=27){const ax=a[i+9]-a[i],ay=a[i+10]-a[i+1],az=a[i+11]-a[i+2],bx=a[i+18]-a[i],by=a[i+19]-a[i+1],bz=a[i+20]-a[i+2];assert(Math.hypot(ay*bz-az*by,az*bx-ax*bz,ax*by-ay*bx)>1e-7,`${m.id}: degenerate triangle`);}
   }
  }
  assert.equal(geo(fn()),geo(d));assert.equal(geo(await G.buildRegion(atlas,id,'')),geo(d));assert(!o.meshes.some(m=>['banquet','props'].includes(m.heavenPart)));
  for(const z of ['land','cliffs','horizon','clouds'])assert(d.meshes.some(m=>m.heavenZone===z));
  stats[id]={detailMeshes:d.meshes.length,triangles:d.bytes/108,detailBytes:d.bytes,overviewBytes:o.bytes};
 }
 assert(overviewBytes<2*1048576);
 const d=G.buildHeaven();for(const z of ['pavilion','peaches','keystone','paths','flowers','aurora','fractures'])assert(d.meshes.some(m=>m.heavenZone===z));
 for(const m of d.meshes)if(['pavilion','peaches','flowers','banquet'].includes(m.heavenZone))assert.equal(m.heavenEdition,'th105');
 assert(d.meshes.some(m=>m.heavenEdition==='th155'&&m.heavenPart==='fracture'));
 assert.equal(G.buildCloudSea().meta.officialHeight,null);assert.equal(G.buildCloudSea().meta.permanentPortal,false);
 for(const[x,z]of d.meta.treeSites){const a=Math.atan2(z/200,x/265),r=1+.085*Math.sin(3*a+.6)+.05*Math.cos(5*a-.3);assert(Math.hypot(x/265,z/200)<r*.97,'Tree outside land mass');}
 for(const[id,p]of Object.entries(G.HEAVEN.views)){assert(G.HEAVEN.spaces.includes(p.space));assert.equal(p.space,p.region);assert.equal(G.DIORAMA.regionOf(id),p.region);assert(p.eye.every(Number.isFinite)&&p.target.every(Number.isFinite));assert(G.length(G.sub(p.eye,p.target))>5);assert(p.era);}
 assert(G.HEAVEN.views.cloudScarlet.heavenScarlet);assert(!G.HEAVEN.views.cloudOverview.heavenScarlet);assert.equal(G.HEAVEN.views.heavenAurora.heavenEdition,'th155');
 for(const c of characters.characters.slice(67,69)){assert(['tenshi','iku'].includes(c.id));assert(c.position.every(Number.isFinite));assert.equal(G.PRESETS[c.view].space,c.space);assert(c.positionBasis.startsWith('P'));assert(c.art.urls.length===0);assert(c.locationSources.length);}
 return{packs:stats,presets:14,locations:3,charactersAdded:2,trees:d.meta.treeCount,overviewBytes,navigable:audit.navigable,pending:audit.pending,protectedFiles:Object.keys(fixed.protectedFiles).length};
}
