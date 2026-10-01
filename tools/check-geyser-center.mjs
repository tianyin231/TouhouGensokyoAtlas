// Read-only authored scene fixtures. Geometry and coverage are separate checks.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {fallsBlocked} from './check-waterfall-cave.mjs';
import {verticalHits} from './check-wind-cave.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const raw=a=>Buffer.from(a.buffer,a.byteOffset,a.byteLength);
export function centerDigest(p){const h=createHash('sha256');for(const m of p.meshes){h.update(JSON.stringify([m.id,m.material,m.centerPart,m.centerScene,m.globalNear,m.globalFar]));h.update(raw(m.vertices));}return h.digest('hex');}
export async function checkGeyserCenter(G,atlas,characters,read,{probe=false}={}){
 const F=G.GEYSER_CENTER,coverage=JSON.parse(read('tools/current-coverage.json'));
 let fixed=probe?null:JSON.parse(read('tools/geyser-center-baseline.json'));
 if(fixed?.inherit){
  const bytes=read(fixed.inherit.path);assert.equal(hash(bytes),fixed.inherit.sha256,'Inherited fixture changed; review the explicit inheritance');
  const inherited=JSON.parse(bytes);
  fixed={...fixed,protectedFiles:{...inherited.protectedFiles,...fixed.protectedFiles},navigation:{...inherited.navigation,...fixed.navigation}};
 }
 if(fixed){
  for(const [path,sha]of Object.entries(fixed.protectedFiles))assert.equal(hash(read(path)),sha,'Inherited source changed: '+path);
  for(const [id,view]of Object.entries(fixed.navigation))assert.equal(G.resolveLocation(id).view,view,'Inherited mapping changed: '+id);
  assert.equal(hash(JSON.stringify(characters)),fixed.characters,'Original character records changed');
 }
 const audit=G.auditLandmarks(atlas);assert.equal(audit.total,coverage.total);assert.equal(audit.navigable,coverage.navigable);assert.equal(audit.pending,coverage.pending);assert.equal(characters.characters.length,85);
 assert.equal(G.resolveLocation(F.id).view,'centerOverview');assert.equal(G.resolveLocation('reactor').view,'hellReactor');
 assert.equal(G.resolveLocation('geyser_mountain').view,'geyserOverview');assert.equal(G.resolveLocation('tengu').view,null);assert.equal(G.resolveLocation('geyser_shrine').view,null);
 const loc=atlas.locations.find(l=>l.id===F.id);assert.equal(loc.existence_evidence,'T');assert(loc.source_ids.includes('GC-TH123-T'));assert(loc.coordinate_status.startsWith('P'));assert(loc.project_treatment.startsWith('P'));
 const source=JSON.parse(read('data/atlas.json'));assert.equal(JSON.stringify(source.placements),JSON.stringify(atlas.placements));assert.equal(JSON.stringify(source.relationships),JSON.stringify(atlas.relationships));
 const compressed=gunzipSync(read('assets/packs/overview.pack.gz')),pack=G.decodePack(compressed.buffer.slice(compressed.byteOffset,compressed.byteOffset+compressed.byteLength));
 const terrain=new G.Terrain(atlas);G.LANDSCAPE.apply(pack,terrain);G.applyHighlandGround(pack,terrain);
 const unchanged=()=>{const h=createHash('sha256');for(const m of pack.meshes)for(const k of['vertices','farVertices','index','instances','instanceColors'])if(m[k])h.update(raw(m[k]));return h.digest('hex');};
 const before=unchanged();F.prepare(atlas,pack);
 const near=F.build(atlas),far=F.build(atlas,true),publicPack={meshes:F.publicPaths(atlas,pack)},stats={},geometry={};
 for(const [name,p]of[['near',near],['far',far],['public',publicPack]]){
  geometry[name]=centerDigest(p);if(fixed)assert.equal(geometry[name],fixed.geometry[name],name+': review changed geometry, do not auto-refresh');
  assert.equal(new Set(p.meshes.map(m=>m.id)).size,p.meshes.length);let bytes=0,triangles=0;
  for(const m of p.meshes){const v=m.vertices;bytes+=v.byteLength;triangles+=v.length/27;
   assert.equal(m.owner,F.id);assert.equal(m.basis,'P');assert(['surface',F.space].includes(m.space));assert(v.length&&v.length%27===0&&v.every(Number.isFinite),m.id+': invalid vertices');
   for(let i=0;i<v.length;i+=9){assert(Math.abs(Math.hypot(v[i+3],v[i+4],v[i+5])-1)<1e-5,m.id+': normal');assert(Math.hypot(v[i]-m.center[0],v[i+1]-m.center[1],v[i+2]-m.center[2])<=m.radius+.03,m.id+': bounds');}
   for(let i=0;i<v.length;i+=27){const normal=G.cross([v[i+9]-v[i],v[i+10]-v[i+1],v[i+11]-v[i+2]],[v[i+18]-v[i],v[i+19]-v[i+1],v[i+20]-v[i+2]]);assert(G.length(normal)>1e-7,m.id+': degenerate face');if(m.centerPart==='path')assert(normal[1]>0,'Path faces down');}
  }
  if(p.bytes!==undefined)assert.equal(p.bytes,bytes);assert(bytes<(name==='near'?5:name==='far'?2.5:1)*1048576,'New region source budget');stats[name]={meshes:p.meshes.length,triangles,bytes};
 }
 const n=G.SurfaceContact.sampler(atlas,F.id),f=G.SurfaceContact.sampler(atlas,F.id,'far');
 let supportedFootprints=0,clearSegments=0,anchors=0,houseFoundationContacts=0;
 for(const [isFar,p]of[[false,near],[true,far]]){
  assert.equal(centerDigest(F.build(atlas,isFar)),centerDigest(p),'Non-deterministic builder');const s=p.meta.surface;
  assert(!p.meta.terrainMutation&&!p.meta.physicalPortal&&!p.meta.reactorReplaced&&!p.meta.underground.replicaReactor);
  for(const [x,z]of s.foundationSamples){assert(s.bottom<Math.min(n.height(x,z),f.height(x,z))-.5);assert(s.top>Math.max(n.height(x,z),f.height(x,z))+.25);supportedFootprints++;}
  for(const a of s.anchors){const [x,y,z]=a.bottom;assert(y<Math.min(n.height(x,z),f.height(x,z))-.40);assert(a.top[1]>Math.max(n.height(x,z),f.height(x,z))-.1);anchors++;}
  const levels=[s.entryFloor,...s.steps.map(p=>p[1])];for(let i=1;i<levels.length;i++)assert(levels[i-1]-levels[i]<.26,'Entrance step too high');
  assert.equal(JSON.stringify(s.gate.filter((_,i)=>i!==1)),JSON.stringify(F.approach.at(-1)),'Road misses the open compound gate');
  const houseBase=p.meshes.filter(m=>m.centerPart==='house-floor');
  for(const dx of[-6.5,6.5])for(const dz of[8.5,19.5]){const x=F.X+dx,z=F.Z+dz,hits=verticalHits(houseBase,x,z,s.bottom-1,s.entryFloor+.2);
   assert(hits.length>=2&&Math.min(...hits)<Math.min(n.height(x,z),f.height(x,z))-.35,'House foundation does not reach real ground');houseFoundationContacts++;
  }
  const surface=p.meshes.filter(m=>m.space==='surface'),clear=(meshes,a,b,msg)=>{assert.equal(fallsBlocked(G,meshes,a,b),null,msg);clearSegments++;};
  clear(surface,[F.X,s.entryFloor+1.8,F.Z+22],[F.X,s.entryFloor+1.8,F.Z+7],'Front/back door passage blocked');
  clear(surface,[F.X,s.entryFloor+1.8,F.Z+7],[F.X,s.entryFloor+1.8,F.Z],'Tower doorway sealed');
  clear(surface,[F.X,s.gate[1]+1.8,F.Z+34],[F.X,s.gate[1]+1.8,F.Z+29],'Compound gate obstructed');
  const ground=isFar?f:n,road=F.approach.filter((_,i)=>i%3===0);road.push(F.approach.at(-1));
  for(let i=0;i<road.length-1;i++){const a=road[i],b=road[i+1];if(Math.hypot(a[0]-b[0],a[1]-b[1])<.01)continue;
   clear(surface,[a[0],ground.height(...a)+1.8,a[1]],[b[0],ground.height(...b)+1.8,b[1]],'New path cuts through own walls or foundations');
  }
  const floor=p.meshes.filter(m=>m.space===F.space&&!['lid','hoistLow','outer'].includes(m.centerPart)),path=p.meta.underground.route;
  for(let i=0;i<path.length-1;i++)clear(floor,path[i].map((x,k)=>x+(k===1?1.8:0)),path[i+1].map((x,k)=>x+(k===1?1.8:0)),'Underground entry or bridge obstructed');
  // The lower car deck and matching hoist endpoint are actual geometry states.
  const car=p.meshes.find(m=>m.centerPart==='car'),cable=p.meshes.find(m=>m.centerPart==='hoistLow');assert(car&&cable);
  assert.notEqual(fallsBlocked(G,[car],[0,1,0],[0,-1,0]),null,'No physical car floor');
  const lowMin=Math.min(...Array.from(cable.vertices).filter((_,i)=>i%9===1)),carTop=Math.max(...Array.from(car.vertices).filter((_,i)=>i%9===1));assert(Math.abs(lowMin-(carTop-28))<.10,'Lower hoist does not reach moved car');
  assert(p.meshes.some(m=>m.centerPart==='lid'));assert(p.meshes.some(m=>m.centerPart==='roof'));assert(p.meshes.some(m=>m.centerPart==='outer'));
 }
 const sample=G.ASAMA.sampleRenderedTerrain(pack);for(const m of publicPack.meshes){assert(m.overview&&m.globalSurface);for(let i=0;i<m.vertices.length;i+=9){const v=m.vertices,gap=v[i+1]-sample(v[i],v[i+2],m.globalFar?'far':'near').p[1];assert(gap>.10&&gap<.24,'Public road leaves actual rendered terrain');}}
 assert(Math.hypot(F.approach[0][0]-G.GEYSER.approach.at(-1)[0],F.approach[0][1]-G.GEYSER.approach.at(-1)[1])<.01,'Missing original spring path junction');
 const oldTrees=[];for(const m of [...pack.meshes,...G.buildForest(terrain).meshes])if(m.instances&&m.group==='vegetation')for(let i=0;i<m.instances.length;i+=16)oldTrees.push([m.instances[i+12],m.instances[i+14]]);
 let roadClearance=Infinity;for(const q of F.approach)for(const t of oldTrees)roadClearance=Math.min(roadClearance,Math.hypot(q[0]-t[0],q[1]-t[1]));assert(roadClearance>3.6,'New route intersects old tree trunks: '+roadClearance);
 const towerClearance=Math.min(...oldTrees.map(p=>Math.hypot(F.X-p[0],F.Z-p[1])));assert(towerClearance>14,'Tower intrudes into an old trunk reserve');
 for(const [id,v]of Object.entries(F.views)){assert.equal(G.DIORAMA.regionOf(id),F.id);
  if(v.space==='surface')assert(v.eye[1]>sample(v.eye[0],v.eye[2],'near').p[1]+.8,id+': camera below ground');
  else if(!v.centerShell&&!v.centerCut){const[x,y,z]=v.eye;
   assert((z>17&&z<40.5&&Math.abs(x)<8&&y>.8&&y<7.5)||(Math.hypot(x,z)<17.1&&y>-40&&y<13),id+': camera outside selected room');
  }
 }
 assert.equal(centerDigest(await G.buildRegion(atlas,F.id,'')),centerDigest(near),'Worker dispatch');assert.equal(unchanged(),before,'Original arrays changed');
 const contact=atlas.surfaceContacts[F.id],contactBytes=contact.near.byteLength+contact.far.byteLength;assert(contactBytes<220000);
 return {...stats,geometry,supportedFootprints,houseFoundationContacts,clearSegments,anchors,roadClearance,towerClearance,contactBytes,views:Object.keys(F.views).length,navigable:audit.navigable,pending:audit.pending,characters:85,protectedFiles:fixed?Object.keys(fixed.protectedFiles).length:0};
}
