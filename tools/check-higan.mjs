// Reviewed expectations only. This checker never mutates its geometry fixtures.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
const geo=p=>hash(Buffer.concat(p.meshes.map(m=>Buffer.from(m.vertices.buffer,m.vertices.byteOffset,m.vertices.byteLength))));
export async function checkHigan(G,atlas,characters,read){
 const fixed=JSON.parse(read('tools/higan-baseline.json'));
 for(const [f,h]of Object.entries(fixed.protectedFiles))assert.equal(hash(read(f)),h,`Inherited file modified: ${f}`);
 assert.equal(hash(JSON.stringify(characters.characters.slice(0,69))),fixed.original69);
 assert.equal(hash(JSON.stringify(characters.additionalVisits)),fixed.visits);
 assert.equal(hash(JSON.stringify(atlas.placements)),fixed.placements);assert.equal(hash(JSON.stringify(atlas.relationships)),fixed.relationships);
 assert(characters.characters.length>=73);assert.equal(new Set(characters.characters.map(c=>c.id)).size,characters.characters.length);
 const audit=G.auditLandmarks(atlas);assert.equal(audit.total,179);assert(audit.navigable>=84);assert(audit.pending<=95);
 for(const [id,view]of Object.entries(fixed.previousMappings))assert.equal(G.resolveLocation(id).view,view);
 for(const id of ['wind_cave','geyser_mountain','sanctuary'])assert.equal(G.resolveLocation(id).view,null);
 assert.equal(Object.keys(G.HIGAN.views).length,16);assert.equal(Object.keys(G.HIGAN.locations).length,4);
 const ids=new Set(atlas.sources.map(s=>s.id));assert.equal(ids.size,atlas.sources.length);
 for(const [id,view]of Object.entries(G.HIGAN.locations)){
  assert.equal(G.resolveLocation(id).view,view);assert(!atlas.placements.some(p=>p.id===id));
  const l=atlas.locations.find(l=>l.id===id);assert(l.coordinate_status.startsWith('P'));assert(l.source_ids.some(s=>s.startsWith('HG-')));for(const s of l.source_ids)assert(ids.has(s));
 }
 const materials=new Set(['Stone','Sand','Paving','Wood','Cloth','Lamp','Props','Water','Leaf','Pinwheel','Moss','Spirit','Flower','Tile'].map(s=>'higan'+s)),stats={};let overviewBytes=0;
 for(const [id,fn]of [['shigan',G.buildShigan],['higan',G.buildHigan]]){
  const b=G.DIORAMA.map.get(id);assert(b.independent&&b.poly.length===0&&b.space===id);
  assert.equal(JSON.stringify(G.DIORAMA.transform(id,'atlas')),JSON.stringify({scale:1,offset:[0,0,0]}));
  for(const k of ['point','inverse'])assert.equal(JSON.stringify(G.DIORAMA[k]([19,33,-77],id,'atlas')),JSON.stringify([19,33,-77]));
  const d=fn(),o=fn(true);overviewBytes+=o.bytes;assert(o.bytes<d.bytes*.3);assert(d.bytes<30*1048576);
  for(const [kind,p]of [['detail',d],['overview',o]]){
   const exp=fixed.packs[id][kind];assert.equal(p.meshes.length,exp.meshes);assert.equal(p.bytes,exp.bytes);assert.equal(geo(p),exp.geometry,`${id}/${kind}: geometry requires review`);
   assert.equal(p.bytes,p.meshes.reduce((s,m)=>s+m.vertices.byteLength,0));assert.equal(new Set(p.meshes.map(m=>m.id)).size,p.meshes.length);
   assert.equal(p.meta.surfaceCut,false);assert.equal(p.meta.fullRealm,false);assert.equal(p.meta.hasCrossRiverBridge,false);assert.equal(p.meta.fixedCrossingDistance,false);
   for(const m of p.meshes){const a=m.vertices;assert.equal(m.owner,id);assert.equal(m.space,id);assert.equal(m.region,id);assert.equal(m.basis,'P');assert.equal(m.overview,kind==='overview');assert(materials.has(m.material));assert(a.length&&a.length%27===0&&a.every(Number.isFinite));assert(m.center.every(Number.isFinite)&&Number.isFinite(m.radius)&&m.radius>0);
    for(let i=0;i<a.length;i+=9){assert(Math.abs(Math.hypot(a[i+3],a[i+4],a[i+5])-1)<1e-5,`${m.id}: normal`);assert(Math.hypot(a[i]-m.center[0],a[i+1]-m.center[1],a[i+2]-m.center[2])<m.radius+.02);}
    for(let i=0;i<a.length;i+=27){const ab=[a[i+9]-a[i],a[i+10]-a[i+1],a[i+11]-a[i+2]],ac=[a[i+18]-a[i],a[i+19]-a[i+1],a[i+20]-a[i+2]];assert(G.length(G.cross(ab,ac))>1e-7,`${m.id}: degenerate triangle`);}
   }
  }
  assert.equal(geo(fn()),geo(d));assert.equal(geo(await G.buildRegion(atlas,id,'')),geo(d));
  stats[id]={meshes:d.meshes.length,triangles:d.bytes/108,detailBytes:d.bytes,overviewBytes:o.bytes};
 }
 assert(overviewBytes<2*1048576);
 const near=G.buildShigan(),far=G.buildHigan();
 for(const z of ['road','marketNorth','marketSouth','sai','landing','ferry','riverRocks'])assert(near.meshes.some(m=>m.higanZone===z));
 for(const z of ['path','flowersNear','flowersFar','checkpoint','waiting','landing'])assert(far.meshes.some(m=>m.higanZone===z));
 assert.equal(near.meta.stalls,14);assert.equal(near.meta.boatCount,1);assert(near.meta.roadSamples.length>60);assert.equal(far.meta.dayNight,false);assert.equal(far.meta.seasons,false);
 assert(near.meshes.some(m=>m.higanPart==='contest'));assert(!G.buildShigan(true).meshes.some(m=>m.higanPart==='contest'));
 assert(!far.meshes.some(m=>m.higanZone.startsWith('market')));
 for(const [id,p]of Object.entries(G.HIGAN.views)){assert.equal(p.space,p.region);assert.equal(G.DIORAMA.regionOf(id),p.region);assert(p.eye.every(Number.isFinite)&&p.target.every(Number.isFinite));assert(G.length(G.sub(p.eye,p.target))>5);assert(p.era);}
 for(const c of characters.characters.slice(69,73)){assert(['komachi','eika','kutaka','eiki'].includes(c.id));assert.equal(G.PRESETS[c.view].space,c.space);assert(c.position.every(Number.isFinite));assert(c.positionBasis.startsWith('P'));assert(c.locationSources.length);assert.equal(c.art.urls.length,0);}
 assert(characters.characters.find(c=>c.id==='kutaka').note.includes('工作'));
 return{packs:stats,overviewBytes,presets:16,locations:4,navigable:audit.navigable,pending:audit.pending,protectedFiles:Object.keys(fixed.protectedFiles).length};
}
