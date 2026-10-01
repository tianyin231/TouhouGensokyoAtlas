// Fixed fixtures only; an initial baseline is reviewed separately from this test.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {fallsBlocked} from './check-waterfall-cave.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
export function geyserDigest(p){const h=createHash('sha256');for(const m of p.meshes){h.update(JSON.stringify([m.id,m.material,m.geyserPart,m.overview,m.globalNear,m.globalFar]));h.update(Buffer.from(m.vertices.buffer,m.vertices.byteOffset,m.vertices.byteLength));}return h.digest('hex');}
export async function checkGeyser(G,atlas,characters,read){
 const coverage=JSON.parse(read('tools/current-coverage.json'));
 const F=G.GEYSER,f=JSON.parse(read('tools/geyser-baseline.json'));
 for(const[path,sha]of Object.entries(f.protectedFiles))assert.equal(hash(read(path)),sha,'Inherited source changed: '+path);
 for(const[id,view]of Object.entries(f.navigation))assert.equal(G.resolveLocation(id).view,view,'Old navigation changed: '+id);
 assert.equal(hash(JSON.stringify(characters)),f.characters);assert.equal(characters.characters.length,85);
 const audit=G.auditLandmarks(atlas);assert.equal(audit.total,179);assert.equal(audit.navigable,coverage.navigable);assert.equal(audit.pending,coverage.pending);
 assert.equal(G.resolveLocation(F.id).view,'geyserOverview');assert.equal(G.resolveLocation(F.id).status,'selection');
 for(const id of['tengu','geyser_shrine'])assert.equal(G.resolveLocation(id).view,null,'Unbuilt neighbour falsely bound');
 assert.equal(G.resolveLocation('reactor').view,'hellReactor');assert.equal(G.resolveLocation('wind_cave').view,'windFoothill');
 const loc=atlas.locations.find(l=>l.id===F.id);assert.equal(loc.existence_evidence,'T');assert(loc.source_ids.includes('GM-KANAKO-T')&&loc.source_ids.includes('GM-NEWS-T'));assert(loc.coordinate_status.startsWith('P'));assert(loc.verified_fact.includes('不是熔岩'));
 const source=JSON.parse(read('data/atlas.json'));assert.equal(JSON.stringify(atlas.placements),JSON.stringify(source.placements));assert.equal(JSON.stringify(atlas.relationships),JSON.stringify(source.relationships));
 const raw=gunzipSync(read('assets/packs/overview.pack.gz')),pack=G.decodePack(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength)),terrain=new G.Terrain(atlas);G.LANDSCAPE.apply(pack,terrain);G.applyHighlandGround(pack,terrain);
 const packHash=()=>{const h=createHash('sha256');for(const m of pack.meshes)for(const k of['vertices','farVertices','index','instances','instanceColors'])if(m[k])h.update(Buffer.from(m[k].buffer,m[k].byteOffset,m[k].byteLength));return h.digest('hex');};const untouched=packHash();F.prepare(atlas,pack);
 const near=F.build(atlas),far=F.build(atlas,true),roads={meshes:F.publicPaths(atlas,pack)},stats={};let poolSamples=0,clearSegments=0,foundationContacts=0;
 for(const[k,p]of[['near',near],['far',far],['public',roads]]){
  assert.equal(geyserDigest(p),f.geometry[k],k+': explicit baseline differs; inspect the actual geometry');assert.equal(new Set(p.meshes.map(m=>m.id)).size,p.meshes.length);
  let bytes=0,triangles=0;for(const m of p.meshes){const v=m.vertices;bytes+=v.byteLength;triangles+=v.length/27;assert.equal(m.owner,F.id);assert.equal(m.space,'surface');assert.equal(m.basis,'P');assert(v.length&&v.length%27===0&&v.every(Number.isFinite));
   for(let i=0;i<v.length;i+=9){assert(Math.abs(Math.hypot(v[i+3],v[i+4],v[i+5])-1)<1e-5,m.id+' normal');assert(Math.hypot(v[i]-m.center[0],v[i+1]-m.center[1],v[i+2]-m.center[2])<m.radius+.02,m.id+' bounds');}
   for(let i=0;i<v.length;i+=27){const n=G.cross([v[i+9]-v[i],v[i+10]-v[i+1],v[i+11]-v[i+2]],[v[i+18]-v[i],v[i+19]-v[i+1],v[i+20]-v[i+2]]);assert(G.length(n)>1e-7,m.id+' degenerate');if(['water','basin','path'].includes(m.geyserPart))assert(n[1]>0,m.id+' reversed floor');}
   if(['steam','jet'].includes(m.geyserPart))assert.equal(m.group,'effects','Animated spray must not cast static geometry shadows');
  }if(p.bytes!==undefined)assert.equal(p.bytes,bytes);assert(bytes<(k==='near'?2:k==='far'?1:1)*1048576,'New region source budget');stats[k]={meshes:p.meshes.length,triangles,bytes};
 }
 for(const[isFar,p]of[[false,near],[true,far]]){
  const ground=G.SurfaceContact.sampler(atlas,F.id,isFar?'far':'near');assert.equal(geyserDigest(F.build(atlas,isFar)),geyserDigest(p),'Nondeterministic build');
  assert.equal(p.meta.pools.length,3);assert.equal(p.meta.vents.length,2);for(const k of['terrainMutation','fullUndergroundCenter','shrineSpring','physicalElevator','fluidSimulation'])assert.equal(p.meta[k],false);
  for(const pool of p.meta.pools)for(let x=-pool.rx*.86;x<=pool.rx*.86;x+=1)for(let z=-pool.rz*.86;z<=pool.rz*.86;z+=1)if(Math.hypot(x/pool.rx,z/pool.rz)<.85){assert(pool.h-ground.height(pool.x+x,pool.z+z)>.30,'Original terrain pierces the shallow basin floor');poolSamples++;}
  for(const foot of p.meta.deck.feet){assert(foot[1]<ground.height(foot[0],foot[2])-.48,'Unburied platform support');foundationContacts++;}
  const deck=p.meta.deck;assert.equal(deck.stair.length,12);const levels=[deck.y+.18,...deck.stair.map(p=>p[1])];for(let i=1;i<levels.length;i++)assert(levels[i-1]-levels[i]>0&&levels[i-1]-levels[i]<.30,'Excessive stair riser');
  for(const[x,y,z]of deck.stair)assert(y>=ground.height(x,z),'Terrain intersects stair tread');
  const last=deck.stair.at(-1);assert(Math.hypot(last[0]-F.approach.at(-1)[0],last[2]-F.approach.at(-1)[1])<.2,'Access path misses final step');
  const solid=p.meshes.filter(m=>!['steam','jet','water','gravel'].includes(m.geyserPart));
  const route=[...F.approach.filter((_,i)=>i%3===0),F.approach.at(-1)];for(let i=0;i<route.length-1;i++){const a=route[i],b=route[i+1];assert.equal(fallsBlocked(G,solid,[a[0],ground.height(...a)+1.8,a[1]],[b[0],ground.height(...b)+1.8,b[1]]),null,'Approach blocked by authored geometry');clearSegments++;}
  for(let i=0;i<deck.stair.length-1;i++){const a=deck.stair[i].map((x,k)=>x+(k===1?1.8:0)),b=deck.stair[i+1].map((x,k)=>x+(k===1?1.8:0));assert.equal(fallsBlocked(G,solid,a,b),null,'Stair route blocked');clearSegments++;}
 }
 const sample=G.ASAMA.sampleRenderedTerrain(pack);for(const m of roads.meshes){assert(m.overview&&m.globalSurface);for(let i=0;i<m.vertices.length;i+=9){const v=m.vertices,q=sample(v[i],v[i+2],m.globalFar?'far':'near'),dy=v[i+1]-q.p[1];assert(dy>.095&&dy<.245,'Public path leaves rendered terrain');}}
 // Old trees are tested from the overview and actual forest-detail instance arrays.
 const old=[...atlas.geyserObstacles];for(const m of G.buildForest(terrain).meshes)if(m.instances)for(let i=0;i<m.instances.length;i+=16)old.push([m.instances[i+12],m.instances[i+14]]);
 let nearest=Infinity;for(const p of F.approach)for(const t of old)nearest=Math.min(nearest,Math.hypot(p[0]-t[0],p[1]-t[1]));assert(nearest>5.5,'Approach crosses old tree reserve');
 assert(G.FOREST.paths.some(p=>p.points.some(q=>q[0]===F.approach[0][0]&&q[1]===F.approach[0][1])),'No inherited forest route endpoint');
 assert.equal(Object.keys(F.views).length,10);for(const[id,v]of Object.entries(F.views)){assert.equal(G.DIORAMA.regionOf(id),F.id);assert(v.requiredRegions.includes('forest'));assert(v.eye[1]>sample(v.eye[0],v.eye[2],'near').p[1]+.85,id+' camera below ground');}
 assert.equal(geyserDigest(await G.buildRegion(atlas,F.id,'')),geyserDigest(near),'Worker dispatcher mismatch');assert.equal(packHash(),untouched,'Existing arrays changed');
 const c=atlas.surfaceContacts[F.id],contactBytes=c.near.byteLength+c.far.byteLength;assert(contactBytes<220000);
 return{...stats,poolSamples,clearSegments,foundationContacts,nearestOldTree:nearest,contactBytes,views:10,pools:3,vents:2,navigable:coverage.navigable,pending:coverage.pending,characters:85,protectedFiles:Object.keys(f.protectedFiles).length};
}
