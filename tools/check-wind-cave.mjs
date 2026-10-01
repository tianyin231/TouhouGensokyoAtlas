// Read-only, explicitly reviewed Wind Cave geometry and inherited-world fixtures.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {fallsBlocked} from './check-waterfall-cave.mjs';
const hash=a=>createHash('sha256').update(a).digest('hex');
export function windDigest(pack){const h=createHash('sha256');for(const m of pack.meshes){h.update(JSON.stringify([m.id,m.material,m.windPart,m.windScene,m.globalNear,m.globalFar]));h.update(Buffer.from(m.vertices.buffer,m.vertices.byteOffset,m.vertices.byteLength));}return h.digest('hex');}
export function verticalHits(meshes,x,z,lo,hi){const hits=[];for(const m of meshes){const a=m.vertices;for(let i=0;i<a.length;i+=27){const A=i,B=i+9,C=i+18,x1=a[A],x2=a[B],x3=a[C],z1=a[A+2],z2=a[B+2],z3=a[C+2];if(x<Math.min(x1,x2,x3)-1e-5||x>Math.max(x1,x2,x3)+1e-5||z<Math.min(z1,z2,z3)-1e-5||z>Math.max(z1,z2,z3)+1e-5)continue;const d=(z2-z3)*(x1-x3)+(x3-x2)*(z1-z3);if(Math.abs(d)<1e-8)continue;const u=((z2-z3)*(x-x3)+(x3-x2)*(z-z3))/d,v=((z3-z1)*(x-x3)+(x1-x3)*(z-z3))/d,w=1-u-v;if(Math.min(u,v,w)<-1e-5)continue;const y=u*a[A+1]+v*a[B+1]+w*a[C+1];if(y>=lo&&y<=hi)hits.push(y);}}return hits;}
export async function checkWindCave(G,atlas,characters,read){
 const coverage=JSON.parse(read('tools/current-coverage.json'));
 const F=G.WIND_CAVE,f=JSON.parse(read('tools/wind-cave-baseline.json'));
 for(const[path,sha]of Object.entries(f.protectedFiles))assert.equal(hash(read(path)),sha,'Inherited file changed: '+path);
 for(const[id,view]of Object.entries(f.navigation))assert.equal(G.resolveLocation(id).view,view,'Inherited navigation changed: '+id);
 assert.equal(hash(JSON.stringify(characters)),f.characters);assert.equal(characters.characters.length,85);
 const a=G.auditLandmarks(atlas);assert.equal(a.total,179);assert.equal(a.navigable,coverage.navigable);assert.equal(a.pending,coverage.pending);
 assert.equal(G.resolveLocation('wind_cave').view,'windFoothill');assert.equal(G.resolveLocation('deep_road').view,'hellBridge');assert.equal(G.resolveLocation('old_hell').view,'hellOverview');
 for(const id of['tengu'])assert.equal(G.resolveLocation(id).view,null,'Unbuilt neighbour falsely bound');
 const loc=atlas.locations.find(l=>l.id===F.id);assert.equal(loc.existence_evidence,'T');assert(loc.source_ids.includes('WC-TH11-T')&&loc.source_ids.includes('WC-SOPM-T'));assert(loc.coordinate_status.startsWith('P'));
 const raw=gunzipSync(read('assets/packs/overview.pack.gz')),pack=G.decodePack(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength)),t=new G.Terrain(atlas);G.LANDSCAPE.apply(pack,t);G.applyHighlandGround(pack,t);
 const terrainHash=()=>hash(Buffer.concat(pack.meshes.filter(m=>m.component==='island-terrain').map(m=>Buffer.from(m.vertices.buffer,m.vertices.byteOffset,m.vertices.byteLength))));const before=terrainHash();F.prepare(atlas,pack);
 const detail=F.build(atlas),far=F.build(atlas,true),roads={meshes:F.publicPath(atlas,pack)},out={};let clearSegments=0,rootContacts=0;
 for(const[key,p]of[['near',detail],['far',far],['public',roads]]){
  assert.equal(windDigest(p),f.geometry[key],key+' changed: review, do not regenerate inside tests');assert.equal(new Set(p.meshes.map(m=>m.id)).size,p.meshes.length);
  let bytes=0,triangles=0;
  for(const m of p.meshes){const v=m.vertices;bytes+=v.byteLength;triangles+=v.length/27;assert.equal(m.owner,F.id);assert.equal(m.basis,'P');assert(['surface',F.space].includes(m.space));assert(v.length&&v.length%27===0&&v.every(Number.isFinite),m.id+' invalid array');
   for(let i=0;i<v.length;i+=9){assert(Math.abs(Math.hypot(v[i+3],v[i+4],v[i+5])-1)<1e-5,m.id+' unit normal');assert(Math.hypot(v[i]-m.center[0],v[i+1]-m.center[1],v[i+2]-m.center[2])<=m.radius+.03,m.id+' bounds');}
   for(let i=0;i<v.length;i+=27){const n=G.cross([v[i+9]-v[i],v[i+10]-v[i+1],v[i+11]-v[i+2]],[v[i+18]-v[i],v[i+19]-v[i+1],v[i+20]-v[i+2]]);assert(G.length(n)>1e-7,m.id+' zero-area face');if(m.windPart==='path')assert(n[1]>0,'Public path winding');}
  }
  if(p.bytes!==undefined)assert.equal(bytes,p.bytes);assert(bytes<(key==='near'?6:key==='far'?3:3)*1048576,'New source array budget');out[key]={meshes:p.meshes.length,triangles,bytes};
 }
 for(const[farFlag,p]of[[false,detail],[true,far]]){
  assert.equal(windDigest(F.build(atlas,farFlag)),windDigest(p),'Nondeterministic geometry');assert.equal(p.meta.surface.recessDepth,7);assert(!p.meta.surface.fullTerrainExcavation&&!p.meta.cave.fullPhysicalConnection&&!p.meta.cave.railway&&!p.meta.terrainMutation&&!p.meta.oldDeepRoadReplaced);
  assert.equal(p.meta.cave.hanging.length,78);assert.equal(p.meta.cave.rising.length,35);
  const ceiling=p.meshes.filter(m=>m.space===F.space&&['roof','walls'].includes(m.windPart)),growths=p.meshes.filter(m=>m.space===F.space&&m.windPart==='formations');
  for(const root of p.meta.cave.hanging){const[x,y,z]=root.p,roof=verticalHits(ceiling,x,z,y-3,y+3),stone=verticalHits(growths,x,z,y-3,y+3);assert(roof.length&&stone.length,'Missing root or ceiling at growth centre');assert(Math.max(...stone)>=Math.max(...roof)-.04&&Math.max(...stone)<Math.max(...roof)+1.1,JSON.stringify({issue:'Stalactite cap not embedded in actual ceiling',farFlag,root,roof,stone}));rootContacts++;}

  const solid=p.meshes.filter(m=>m.space===F.space&&!['dust','extent','outer'].includes(m.windPart));
  for(const lane of[-1.3,0,1.3])for(let s=2;s<136;s+=2){const A=F.floorPoint(s,lane),B=F.floorPoint(s+2,lane);A[1]+=1.8;B[1]+=1.8;assert.equal(fallsBlocked(G,solid,A,B),null,'New cave passage blocked at '+s+'/'+lane);clearSegments++;}
  const g=G.SurfaceContact.sampler(atlas,F.id,farFlag?'far':'near'),front=p.meshes.filter(m=>m.space==='surface');
  for(const off of[-1,1])for(let d=-4;d<5;d+=1){const x=F.CX+off,z=F.CZ+d;assert.equal(fallsBlocked(G,front,[x,g.height(x,z)+1.9,z],[x,g.height(x,z+1)+1.9,z+1]),null,'Surface recess blocked');clearSegments++;}
 }
 assert.equal(windDigest(await G.buildRegion(atlas,F.id,'')),windDigest(detail),'Worker/main dispatch differs');
 assert.equal(terrainHash(),before,'Original terrain modified');const contact=atlas.surfaceContacts[F.id],contactBytes=contact.near.byteLength+contact.far.byteLength;assert(contactBytes<250000,'Excessive contact transfer');
 const sample=G.ASAMA.sampleRenderedTerrain(pack);for(const m of roads.meshes){assert(m.globalSurface&&m.overview);for(let i=0;i<m.vertices.length;i+=9){const v=m.vertices,q=sample(v[i],v[i+2],m.globalFar?'far':'near'),gap=v[i+1]-q.p[1];assert(gap>.115&&gap<.295,'Path not on actual rendered ground');}}
 assert(G.MOUNTAIN.paths.find(p=>p.id==='mountain-lower-path').points.some(p=>p[0]===F.route[0][0]&&p[2]===F.route[0][1]),'Missing inherited mountain path join');
 const trees=G.buildMountain(t).meta.treeRecords;let nearest=Infinity;for(const p of F.route)for(const tr of trees)nearest=Math.min(nearest,Math.hypot(p[0]-tr.x,p[1]-tr.z));assert(nearest>3.5,'Public approach intersects original tree stems');
 assert.equal(Object.keys(F.views).length,12);for(const[id,v]of Object.entries(F.views)){assert.equal(G.DIORAMA.regionOf(id),F.id);if(v.space==='surface'){assert(v.requiredRegions.includes('mountain'));assert(v.eye[1]>sample(v.eye[0],v.eye[2],'near').p[1]+1,id+' below actual ground');}}
 return{...out,views:12,hanging:78,rising:35,clearSegments,rootContacts,contactBytes,nearestOldTree:nearest,protectedFiles:Object.keys(f.protectedFiles).length,navigable:coverage.navigable,pending:coverage.pending,characters:85};
}
