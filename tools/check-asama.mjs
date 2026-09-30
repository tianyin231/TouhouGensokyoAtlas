import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const digest=p=>createHash('sha256').update(Buffer.concat(p.meshes.flatMap(m=>[Buffer.from(JSON.stringify([m.id,m.material,m.asamaScene,m.asamaPart])),Buffer.from(m.vertices.buffer,m.vertices.byteOffset,m.vertices.byteLength)]))).digest('hex');

// Two-sided segment / triangle test: actual geometry, not a route metadata check.
function blocked(G,meshes,a,b){const d=G.sub(b,a);for(const m of meshes){const v=m.vertices;for(let i=0;i<v.length;i+=27){
 const A=[v[i],v[i+1],v[i+2]],E=[v[i+9]-A[0],v[i+10]-A[1],v[i+11]-A[2]],F=[v[i+18]-A[0],v[i+19]-A[1],v[i+20]-A[2]],h=G.cross(d,F),det=G.dot(E,h);if(Math.abs(det)<1e-8)continue;
 const s=G.sub(a,A),u=G.dot(s,h)/det;if(u<0||u>1)continue;const q=G.cross(s,E),w=G.dot(d,q)/det;if(w<0||u+w>1)continue;const t=G.dot(F,q)/det;if(t>1e-4&&t<.9999)return m.id;
 }}return null;}
export async function checkAsama(G,atlas,characters,read){
 const coverage=JSON.parse(read('tools/current-coverage.json'));
 const A=G.ASAMA,t=new G.Terrain(atlas),f=JSON.parse(read('tools/asama-baseline.json')),out={};
 for(const id of A.locations){const r=G.resolveLocation(id);assert(r.view&&A.views[r.view]);assert(atlas.locations.find(l=>l.id===id).source_ids.includes('ASAMA-SCENE'));}
 const audit=G.auditLandmarks(atlas);assert.equal(audit.total,179);assert.equal(audit.navigable,coverage.navigable);assert.equal(audit.pending,coverage.pending);assert.equal(characters.characters.length,85);
 for(const id of ['tengu','geyser_center'])assert.equal(G.resolveLocation(id).view,null,'Next area must not be falsely bound');
 const packs={seikiNear:A.buildSurface(t,false),seikiFar:A.buildSurface(t,true),asamaNear:A.buildUnderground(false),asamaFar:A.buildUnderground(true)};
 for(const [id,p]of Object.entries(packs)){
  assert.equal(digest(p),f.geometry[id],`${id}: explicit geometry baseline differs; review, never auto-refresh`);
  const repeat=id.startsWith('seiki')?A.buildSurface(t,id.endsWith('Far')):A.buildUnderground(id.endsWith('Far'));assert.equal(digest(repeat),digest(p),'Non-deterministic geometry');
  assert.equal(new Set(p.meshes.map(m=>m.id)).size,p.meshes.length);let bytes=0,triangles=0;
  for(const m of p.meshes){const a=m.vertices;bytes+=a.byteLength;triangles+=a.length/27;assert(a.every(Number.isFinite)&&a.length%27===0);assert.equal(m.basis,'P');
   for(let i=0;i<a.length;i+=9){assert(Math.abs(Math.hypot(a[i+3],a[i+4],a[i+5])-1)<1e-5,`${m.id}: normal`);assert(Math.hypot(a[i]-m.center[0],a[i+1]-m.center[1],a[i+2]-m.center[2])<=m.radius+.02,'Bounds');}
   for(let i=0;i<a.length;i+=27){const u=[a[i+9]-a[i],a[i+10]-a[i+1],a[i+11]-a[i+2]],v=[a[i+18]-a[i],a[i+19]-a[i+1],a[i+20]-a[i+2]],n=G.cross(u,v);assert(G.length(n)>1e-7,`${m.id}: degenerate`);if(m.asamaPart==='road')assert(n[1]>0,'Upward road winding');}
  }assert.equal(bytes,p.bytes);assert(bytes<(id.startsWith('seiki')?6:4)*1048576,'Source budget');out[id]={meshes:p.meshes.length,triangles,bytes};
 }
 assert.equal(packs.seikiNear.meta.treeCount,115);assert.equal(JSON.stringify(packs.seikiNear.meta.treeSites),JSON.stringify(packs.seikiFar.meta.treeSites));
 for(const[x,y,z]of packs.seikiNear.meta.treeSites)assert.equal(y,t.height(x,z),'Tree contact');
 assert(!packs.seikiNear.meshes.some(m=>m.asamaPart==='road'),'Public road must survive detail eviction');
 assert(!packs.seikiFar.meshes.some(m=>m.asamaPart==='road'),'Do not retain the old analytic road overlay');
 for(const p of packs.seikiFar.meta.route)assert(Math.abs(p[1]-t.height(p[0],p[2])-.27)<1e-7);
 const end=A.surfacePath.at(-1);assert(G.HIGHLAND.paths.some(p=>p.some(([x,z])=>Math.hypot(x-end[0],z-end[1])<.1)),'Road does not join the existing mountain path');
 for(const[id,v]of Object.entries(A.views))if(v.region==='seiki')assert(v.eye[1]>t.height(v.eye[0],v.eye[2])+1,`${id}: underground camera`);
 // Check passages in both levels; visual cutaways must not conceal a solid obstruction.
 let clearSegments=0;
 for(const name of ['asamaNear','asamaFar']){const p=packs[name],scene=s=>p.meshes.filter(m=>m.asamaScene===s);
  const clear=(s,a,b)=>{assert.equal(blocked(G,scene(s),a,b),null,`${name}/${s}: blocked ${JSON.stringify([a,b])}`);clearSegments++;};
  clear('pyramid',[0,6,82],[0,6,41]);clear('shaft',[41,1.8,0],[90.5,1.8,0]);
  const maze=p.meta.shaft.maze;assert.equal(maze.cells,49);assert.equal(maze.passages,48);const seen=new Set(['0,3']);
  for(let pass=0;pass<49;pass++)for(const edge of maze.edges){const [a,b]=edge.split('|');if(seen.has(a))seen.add(b);if(seen.has(b))seen.add(a);}assert.equal(seen.size,49,'Unreachable maze cell');
  for(const e of maze.edges){const pts=e.split('|').map(s=>s.split(',').map(Number)).map(([x,z])=>[84+(x+.5)*13,1.8,-45.5+(z+.5)*13]);clear('shaft',...pts);}
  const route=p.meta.depth.route.map(q=>[q[0],q[1]+1.8,q[2]]);for(let i=0;i<route.length-1;i++)clear('depth',route[i],route[i+1]);
 }
 const raw=gunzipSync(read('assets/packs/overview.pack.gz')),decoded=G.decodePack(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength));
 G.LANDSCAPE.apply(decoded,t);G.applyHighlandGround(decoded,t);
 const roads=G.ASAMA.buildPublicRoad(atlas,decoded),sample=G.ASAMA.sampleRenderedTerrain(decoded);assert(roads.length>1);
 assert.equal(digest({meshes:roads}),f.geometry.seikiPublicRoad,'Reviewed public road fixture');
 let roadVertices=0,clearance=[Infinity,-Infinity];
 for(const m of roads){const source=decoded.meshes.find(s=>s.id===m.terrainSource);assert(source);assert.equal(m.terrainLodRadius,source.radius);assert.equal(JSON.stringify(m.center),JSON.stringify(source.center));
  assert(m.globalSurface&&m.overview&&m.owner==='seiki');assert.equal(!!m.globalFar,!!source.globalFar);assert.equal(!!m.globalNear,!!source.globalNear);
  for(let i=0;i<m.vertices.length;i+=9){const a=m.vertices,p=sample(a[i],a[i+2],m.globalFar?'far':'near'),dy=a[i+1]-p.p[1];assert(dy>.105&&dy<.335,'Road enters rendered terrain');clearance[0]=Math.min(clearance[0],dy);clearance[1]=Math.max(clearance[1],dy);roadVertices++;}
  for(let i=0;i<m.vertices.length;i+=27){const a=m.vertices,u=[a[i+9]-a[i],a[i+10]-a[i+1],a[i+11]-a[i+2]],v=[a[i+18]-a[i],a[i+19]-a[i+1],a[i+20]-a[i+2]];assert(G.cross(u,v)[1]>1e-7,'Public road winding');}
 }
 out.publicRoad={meshes:roads.length,bytes:roads.reduce((s,m)=>s+m.vertices.byteLength,0),triangles:roadVertices/3,clearance};
 for(const id of ['seiki','asama'])assert.equal(digest(await G.buildRegion(atlas,id)),digest(packs[id+'Near']),'Worker entry dispatch differs');
 return {...out,views:Object.keys(A.views).length,trees:115,clearGeometrySegments:clearSegments,navigable:coverage.navigable,pending:coverage.pending,characters:85};
}
export {digest as asamaDigest};
