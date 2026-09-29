// Fixed geometry and inheritance fixtures. Never writes or regenerates expectations.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
const geo=p=>hash(Buffer.concat(p.meshes.map(m=>Buffer.from(m.vertices.buffer,m.vertices.byteOffset,m.vertices.byteLength))));
export async function checkRainbowMine(G,atlas,characters,read){
 const f=JSON.parse(read('tools/rainbow-mine-baseline.json')),M=G.RAINBOW_MINE;
 for(const[p,h]of Object.entries(f.protectedFiles))assert.equal(hash(read(p)),h,`Inherited file changed: ${p}`);
 assert.equal(hash(JSON.stringify(characters.characters.slice(0,82))),f.original82);
 for(const[k,v]of [['placements',atlas.placements],['relationships',atlas.relationships],['visits',characters.additionalVisits]])assert.equal(hash(JSON.stringify(v)),f[k]);
 for(const[id,view]of Object.entries(f.previousMappings))assert.equal(G.resolveLocation(id).view,view);
 const a=G.auditLandmarks(atlas);assert(/^0\.\d+\.\d+$/.test(a.version));assert.equal(a.total,179);assert(a.navigable>=91);assert(a.pending<=88);
 assert(characters.characters.length>=84);assert.equal(new Set(characters.characters.map(c=>c.id)).size,characters.characters.length);
 for(const id of ['hiten','wind_cave','geyser_mountain','sanctuary'])assert.equal(G.resolveLocation(id).view,null,`${id} must not be marked complete by cave context`);
 assert.equal(G.resolveLocation('rainbow_mine').view,'mineThreshold');assert.equal(G.resolveLocation('rainbow_mine').status,'selection');assert(!atlas.placements.some(p=>p.id==='rainbow_mine'));
 const l=atlas.locations.find(l=>l.id==='rainbow_mine');assert(l.coordinate_status.includes('P'));const sources=new Set(atlas.sources.map(s=>s.id));assert.equal(sources.size,atlas.sources.length);for(const s of l.source_ids)assert(sources.has(s));assert(l.source_ids.includes('MINE-TEXT'));
 const b=G.DIORAMA.map.get(M.region);assert(b.independent&&b.poly.length===0);assert.equal(b.space,M.space);assert.deepEqual(JSON.parse(JSON.stringify(G.DIORAMA.transform(M.region,'atlas'))),{scale:1,offset:[0,0,0]});for(const k of ['point','inverse'])assert.deepEqual(JSON.parse(JSON.stringify(G.DIORAMA[k]([17,22,-98],M.region,'atlas'))),[17,22,-98]);
 const detail=G.buildRainbowMine(),overview=G.buildRainbowMineOverview(),mats=['Rock','Ground','Wood','Iron','Rail','Ore','Lamp','Paper','Water','Mist'].map(s=>'mine'+s);
 for(const[k,p]of [['detail',detail],['overview',overview]]){const e=f.packs[k];assert.equal(p.meshes.length,e.meshes);assert.equal(p.bytes,e.bytes);assert.equal(geo(p),e.geometry,`${k}: changed geometry requires review`);assert.equal(p.bytes,p.meshes.reduce((s,m)=>s+m.vertices.byteLength,0));assert.equal(new Set(p.meshes.map(m=>m.id)).size,p.meshes.length);
  for(const m of p.meshes){const v=m.vertices;assert.equal(m.owner,M.region);assert.equal(m.region,M.region);assert.equal(m.space,M.space);assert.equal(m.basis,'P');assert.equal(m.overview,k==='overview');assert(mats.includes(m.material));assert(v.length&&v.length%27===0&&v.every(Number.isFinite));
   for(let i=0;i<v.length;i+=9){assert(Math.abs(Math.hypot(v[i+3],v[i+4],v[i+5])-1)<1e-5,`${m.id}: normal`);assert(Math.hypot(v[i]-m.center[0],v[i+1]-m.center[1],v[i+2]-m.center[2])<=m.radius+.02,`${m.id}: bounds`);}
   for(let i=0;i<v.length;i+=27){const ab=[v[i+9]-v[i],v[i+10]-v[i+1],v[i+11]-v[i+2]],ac=[v[i+18]-v[i],v[i+19]-v[i+1],v[i+20]-v[i+2]];assert(G.length(G.cross(ab,ac))>1e-7,`${m.id}: degenerate triangle`);}
  }
  for(const k of ['fullMine','surfaceCut','physicalPortal'])assert.equal(p.meta[k],false);assert(p.meta.lights.every(p=>p.every(Number.isFinite)));
 }
 assert.equal(geo(G.buildRainbowMine()),geo(detail));assert.equal(geo(await G.buildRegion(atlas,M.region,'')),geo(detail));assert(detail.bytes<12*1048576);assert(overview.bytes<2*1048576&&overview.bytes<detail.bytes*.5);
 for(const zone of ['upper','yard','deep','branch','portal','supports','rails','cart','sampling','ore','drain','branchFrames'])assert(detail.meshes.some(m=>m.mineZone===zone),`Missing physical zone ${zone}`);
 assert(!overview.meshes.some(m=>m.mineZone==='cart'||m.mineZone==='sampling'));
 assert.equal(M.route.length,211);for(let i=0;i<M.route.length;i++){const p=M.route[i];assert(p.every(Number.isFinite));assert(Math.abs(p[0]-M.center(p[2]))<1e-7);assert(Math.abs(p[1]-M.floor(p[2]))<1e-7);if(i)assert(G.length(G.sub(p,M.route[i-1]))<2.2);}
 assert.equal(Object.keys(M.views).length,14);for(const[id,p]of Object.entries(M.views)){assert.equal(G.DIORAMA.regionOf(id),M.region);assert.equal(p.space,M.space);assert(p.eye.every(Number.isFinite)&&p.target.every(Number.isFinite));assert(G.length(G.sub(p.eye,p.target))>5);if(!p.mineCut&&id!=='minePortal'&&id!=='mineBranch'){const[x,y,z]=p.eye;assert(y>M.floor(z)+.8,`${id} below floor`);assert(Math.abs(x-M.center(z))<M.width(z)-.5,`${id} outside tunnel`);assert(y<M.floor(z)+M.roof(z)-1,`${id} above roof`);}}
 assert.equal(M.views.mineBlackMarket.mineEdition,'th185');assert.equal(M.views.mineDepth.mineEdition,'extra');assert.equal(M.views.mineOverview.mineCut,true);
 for(const id of ['misumaru','momoyo']){const c=characters.characters.find(c=>c.id===id);assert.equal(c.space,M.space);assert.equal(c.locationId,'rainbow_mine');assert.equal(c.region,M.region);assert(c.position.every(Number.isFinite));assert.equal(G.PRESETS[c.view].mineEdition,c.mineEdition);assert(c.positionBasis.startsWith('P'));assert(c.locationSources.length);assert.equal(c.art.urls.length,0);}
 return{detailMeshes:detail.meshes.length,triangles:detail.bytes/108,detailBytes:detail.bytes,overviewBytes:overview.bytes,protectedFiles:Object.keys(f.protectedFiles).length,views:14,navigable:91,pending:88,characters:84};
}
