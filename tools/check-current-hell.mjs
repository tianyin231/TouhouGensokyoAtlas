// Reviewed fixtures are read-only. A changed hash requires deliberate visual review.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
const geometry=p=>hash(Buffer.concat(p.meshes.map(m=>Buffer.from(m.vertices.buffer,m.vertices.byteOffset,m.vertices.byteLength))));
export async function checkCurrentHell(G,atlas,characters,read){
 const f=JSON.parse(read('tools/current-hell-baseline.json'));
 for(const [p,h]of Object.entries(f.protectedFiles))assert.equal(hash(read(p)),h,`Inherited file changed: ${p}`);
 assert.equal(hash(JSON.stringify(characters.characters.slice(0,79))),f.original79);
 for(const [key,value]of [['placements',atlas.placements],['relationships',atlas.relationships],['visits',characters.additionalVisits]])assert.equal(hash(JSON.stringify(value)),f[key]);
 for(const [id,view]of Object.entries(f.previousMappings))assert.equal(G.resolveLocation(id).view,view,`Old navigation changed: ${id}`);
 const a=G.auditLandmarks(atlas);assert(/^0\.\d+\.\d+$/.test(a.version));assert.equal(a.total,179);assert(a.navigable>=90);assert(a.pending<=89);
 assert(characters.characters.length>=82);assert.equal(new Set(characters.characters.map(c=>c.id)).size,characters.characters.length);
 for(const id of ['animal_hq'])assert.equal(G.resolveLocation(id).view,null);
 assert.equal(G.resolveLocation('hell').view,'jigokuOverview');assert.equal(G.resolveLocation('hell').status,'selection');
 assert(!atlas.placements.some(p=>p.id==='hell'),'Do not invent a surface entrance');
 const l=atlas.locations.find(l=>l.id==='hell');assert(l.coordinate_status.includes('P'));assert(l.source_ids.includes('JIG-19'));
 const sources=new Set(atlas.sources.map(s=>s.id));for(const sid of l.source_ids)assert(sources.has(sid));
 const stats={};let farBytes=0;
 for(const [id,fn]of [['currenthell',G.buildCurrentHell],['avici',G.buildAvici]]){
  const b=G.DIORAMA.map.get(id);assert(b.independent&&b.poly.length===0&&G.CURRENT_HELL.spaces.includes(b.space));
  assert.deepEqual(JSON.parse(JSON.stringify(G.DIORAMA.transform(id,'atlas'))),{scale:1,offset:[0,0,0]});
  for(const key of ['point','inverse'])assert.deepEqual(JSON.parse(JSON.stringify(G.DIORAMA[key]([19,5,-33],id,'atlas'))),[19,5,-33]);
  const detail=fn(),overview=fn(true);
  for(const [kind,p]of [['detail',detail],['overview',overview]]){
   const e=f.packs[id][kind];assert.equal(p.meshes.length,e.meshes);assert.equal(p.bytes,e.bytes);assert.equal(geometry(p),e.geometry);
   assert.equal(p.bytes,p.meshes.reduce((s,m)=>s+m.vertices.byteLength,0));assert.equal(new Set(p.meshes.map(m=>m.id)).size,p.meshes.length);
   for(const m of p.meshes){const v=m.vertices;assert.equal(m.owner,id);assert.equal(m.region,id);assert.equal(m.space,b.space);assert.equal(m.overview,kind==='overview');assert.equal(m.basis,'P');assert(['jigokuEarth','jigokuRock','jigokuBone','jigokuWind','jigokuStorm','jigokuDust'].includes(m.material));assert(v.length&&v.length%27===0&&v.every(Number.isFinite));
    for(let i=0;i<v.length;i+=9){assert(Math.abs(Math.hypot(v[i+3],v[i+4],v[i+5])-1)<1e-5,`${m.id}: normal`);assert(Math.hypot(v[i]-m.center[0],v[i+1]-m.center[1],v[i+2]-m.center[2])<m.radius+.02,`${m.id}: bounds`);}
    for(let i=0;i<v.length;i+=27){const ab=[v[i+9]-v[i],v[i+10]-v[i+1],v[i+11]-v[i+2]],ac=[v[i+18]-v[i],v[i+19]-v[i+1],v[i+20]-v[i+2]];assert(G.length(G.cross(ab,ac))>1e-7,`${m.id}: degenerate`);}
   }
   for(const key of ['surfaceCut','fullRealm','physicalPortal','hasBuildings','hasLava'])assert.equal(p.meta[key],false);
  }
  assert.equal(geometry(fn()),geometry(detail),'Builder not deterministic');assert.equal(geometry(await G.buildRegion(atlas,id,'')),geometry(detail),'Wrong Worker dispatcher');
  assert(overview.bytes<detail.bytes*.1);assert(detail.bytes<(id==='currenthell'?40:20)*1048576);farBytes+=overview.bytes;
  assert(detail.meshes.some(m=>m.material==='jigokuBone'));assert(detail.meshes.some(m=>m.jigokuZone==='terrain'));assert(detail.meshes.some(m=>m.jigokuZone==='horizon'));
  if(id==='avici'){assert(detail.meshes.every(m=>!['wind','storm'].includes(m.jigokuPart)));assert.equal(detail.meta.path.length,0);}else{assert(detail.meta.path.length>10);assert(detail.meshes.some(m=>m.jigokuPart==='storm'));}
  stats[id]={detailMeshes:detail.meshes.length,triangles:detail.bytes/108,detailBytes:detail.bytes,overviewBytes:overview.bytes};
 }
 assert(farBytes<1.2*1048576,'Boot proxy budget exceeded');
 assert.equal(Object.keys(G.CURRENT_HELL.views).length,14);for(const [id,p]of Object.entries(G.CURRENT_HELL.views)){assert.equal(G.DIORAMA.regionOf(id),p.region);assert.equal(G.DIORAMA.map.get(p.region).space,p.space);assert(p.eye.every(Number.isFinite)&&p.target.every(Number.isFinite));assert(G.length(G.sub(p.eye,p.target))>5);const H=p.region==='currenthell'?G.CURRENT_HELL.height:G.CURRENT_HELL.emptyHeight;assert(p.eye[1]>H(p.eye[0],p.eye[2])+1,`${id}: camera underground`);}
 assert.equal(G.CURRENT_HELL.views.jigokuGuide.jigokuEra,'th19');assert.equal(G.CURRENT_HELL.views.aviciOverview.jigokuEra,'waa49');assert.equal(G.CURRENT_HELL.views.jigokuStorm.jigokuStorm,true);
 for(const id of ['hecatia','zanmu','hisami']){const c=characters.characters.find(c=>c.id===id);assert.equal(c.locationId,'hell');assert.equal(c.space,'hell_present');assert.equal(c.region,'currenthell');assert(c.position.every(Number.isFinite));assert(c.position[1]>G.CURRENT_HELL.height(c.position[0],c.position[2]));assert.equal(G.PRESETS[c.view].space,c.space);assert(c.locationSources.length&&c.positionBasis.startsWith('P'));assert.equal(c.art.urls.length,0);if(id!=='hecatia')assert.equal(c.jigokuEra,'th19');}
 return{packs:stats,overviewBytes:farBytes,protectedFiles:Object.keys(f.protectedFiles).length,views:14,newLocations:1,navigable:90,pending:89,characters:82};
}
