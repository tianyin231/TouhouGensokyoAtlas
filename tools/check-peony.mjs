// Reviewed fixtures are read-only. Inheritance, real terrain contact, and instancing checks.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const hash=b=>createHash('sha256').update(b).digest('hex');
const raw=a=>Buffer.from(a.buffer,a.byteOffset,a.byteLength);
export function peonyDigest(p){const h=createHash('sha256');for(const m of p.meshes){h.update(JSON.stringify([m.id,m.material,m.peonyPart,m.globalNear,m.globalFar,m.center,m.radius,m.lodDistance]));for(const k of['vertices','farVertices','instances','instanceColors','index'])if(m[k]){h.update(k);h.update(raw(m[k]));}}h.update(JSON.stringify(p.signs||[]));return h.digest('hex');}
const same=(a,b,msg)=>assert.equal(JSON.stringify(a),JSON.stringify(b),msg);
function clearSegment(G,meshes,A,B){const d=G.sub(B,A);for(const m of meshes){if(m.instances)continue;const v=m.vertices;for(let i=0;i<v.length;i+=27){const a=[v[i],v[i+1],v[i+2]],e=[v[i+9]-a[0],v[i+10]-a[1],v[i+11]-a[2]],f=[v[i+18]-a[0],v[i+19]-a[1],v[i+20]-a[2]],p=G.cross(d,f),det=G.dot(e,p);if(Math.abs(det)<1e-8)continue;const s=G.sub(A,a),u=G.dot(s,p)/det;if(u<0||u>1)continue;const q=G.cross(s,e),w=G.dot(d,q)/det,t=G.dot(f,q)/det;if(w>=0&&u+w<=1&&t>1e-4&&t<.9999)return m.id;}}return null;}
export async function checkPeony(G,atlas,characters,read){
 const coverage=JSON.parse(read('tools/current-coverage.json'));
 const f=JSON.parse(read('tools/peony-baseline.json')),P=G.PEONY;
 for(const[file,digest]of Object.entries(f.protectedFiles))assert.equal(hash(read(file)),digest,'Inherited file modified: '+file);
 for(const[id,view]of Object.entries(f.navigation))assert.equal(G.resolveLocation(id).view,view,'Old navigation changed: '+id);
 assert.equal(hash(JSON.stringify(characters)),f.characters);assert.equal(characters.characters.length,85);
 const audit=G.auditLandmarks(atlas);assert.equal(audit.total,179);assert.equal(audit.navigable,coverage.navigable);assert.equal(audit.pending,coverage.pending);
 for(const id of['tengu','geyser_center'])assert.equal(G.resolveLocation(id).view,null,'Unbuilt neighbour falsely bound');
 assert.equal(G.resolveLocation(P.id).view,'peonyOverview');assert.equal(G.resolveLocation(P.id).status,'selection');
 const loc=atlas.locations.find(l=>l.id===P.id),correction=JSON.parse(read('data/peony.json')).verifiedLocationCorrections[0];assert.equal(correction.id,P.id);
 for(const[k,v]of Object.entries(correction.replace))assert.equal(loc[k],v,'Evidence correction not applied: '+k);
 assert.equal(loc.existence_evidence,'T');assert(loc.coordinate_status.startsWith('P'));assert(loc.source_ids.includes('PF-OSP14-T'));
 const source=atlas.sources.find(s=>s.id==='PF-OSP14-T');assert.equal(source.source_type,'T');assert(source.url.includes('第十四话'));
 // Compare-and-set correction preserves untouched old evidence rather than silently rewriting it.
 const baseAtlas=JSON.parse(read('data/atlas.json'));for(const[k,v]of Object.entries(correction.expected))assert.equal(baseAtlas.locations.find(l=>l.id===P.id)[k],v);
 same(atlas.placements,baseAtlas.placements);same(atlas.relationships,baseAtlas.relationships);
 const z=gunzipSync(read('assets/packs/overview.pack.gz')),pack=G.decodePack(z.buffer.slice(z.byteOffset,z.byteOffset+z.byteLength)),terrain=new G.Terrain(atlas);G.LANDSCAPE.apply(pack,terrain);G.applyHighlandGround(pack,terrain);
 const unchanged=()=>{const h=createHash('sha256'),seen=new Set();for(const m of pack.meshes)for(const k of['vertices','farVertices','instances','index','instanceColors'])if(m[k]&&!seen.has(m[k])){seen.add(m[k]);h.update(raw(m[k]));}return h.digest('hex');},before=unchanged();P.prepare(atlas,pack);
 const nearGround=G.SurfaceContact.sampler(atlas,P.id),farGround=G.SurfaceContact.sampler(atlas,P.id,'far'),near=P.build(atlas),far=P.build(atlas,true),roads={meshes:P.roads(atlas,pack)};
 const stats={};let passageChecks=0;
 for(const[key,p]of[['near',near],['far',far],['public',roads]]){
  assert.equal(peonyDigest(p),f.geometry[key],key+': review geometry before changing fixed baseline');assert.equal(new Set(p.meshes.map(m=>m.id)).size,p.meshes.length);
  let drawTriangles=0,prototypeTriangles=0,instances=0;const seen=new Set();
  for(const m of p.meshes){assert.equal(m.owner,P.id);assert.equal(m.space,'surface');assert.equal(m.basis,'P');assert(m.material.startsWith('peony'));assert(m.vertices.length>0);assert(m.radius>0&&m.center.every(Number.isFinite));
   for(const a of[m.vertices,m.farVertices].filter(Boolean)){assert(a.length%27===0&&a.every(Number.isFinite));if(!seen.has(a)){seen.add(a);prototypeTriangles+=a.length/27;}
    for(let i=0;i<a.length;i+=9){assert(Math.abs(Math.hypot(a[i+3],a[i+4],a[i+5])-1)<1e-5,m.id+': unit normal');if(!m.instances)assert(Math.hypot(a[i]-m.center[0],a[i+1]-m.center[1],a[i+2]-m.center[2])<=m.radius+.02,m.id+': bounds');}
    for(let i=0;i<a.length;i+=27){const n=G.cross([a[i+9]-a[i],a[i+10]-a[i+1],a[i+11]-a[i+2]],[a[i+18]-a[i],a[i+19]-a[i+1],a[i+20]-a[i+2]]);assert(G.length(n)>1e-7,m.id+': degenerate face');if(['route','beds'].includes(m.peonyPart))assert(n[1]>0,m.id+': downward top');}
   }
   if(m.instances){assert.equal(m.flowerKind,'peony');assert.equal(m.instances.length%16,0);assert(m.instances.every(Number.isFinite));const count=m.instances.length/16;assert.equal(m.instanceColors.length,count*3);instances+=count;
    const ground=key==='far'?farGround:nearGround;
    for(let j=0;j<m.instances.length;j+=16){const a=m.instances,x=a[j+12],y=a[j+13],zz=a[j+14];assert(Math.abs(y-ground.height(x,zz)-.15)<.001,m.id+': floating plant');
     // World-space bounding sphere encloses all transformed prototype vertices, not local origins only.
     const v=m.vertices;for(let i=0;i<v.length;i+=9){const X=a[j]*v[i]+a[j+4]*v[i+1]+a[j+8]*v[i+2]+x,Y=a[j+1]*v[i]+a[j+5]*v[i+1]+a[j+9]*v[i+2]+y,Z=a[j+2]*v[i]+a[j+6]*v[i+1]+a[j+10]*v[i+2]+zz;assert(Math.hypot(X-m.center[0],Y-m.center[1],Z-m.center[2])<=m.radius+.02,m.id+': instance outside bounds');}
    }
   }
   drawTriangles+=m.vertices.length/27*(m.instances?m.instances.length/16:1);
  }
  const bytes=P.bytes(p.meshes);stats[key]={meshes:p.meshes.length,uniqueAttributeBytes:bytes,storedPrototypeTriangles:prototypeTriangles,drawTrianglesBeforeCulling:drawTriangles,instanceRecords:instances};if(key!=='public')assert.equal(p.bytes,bytes);
  assert(bytes<(key==='near'?2:key==='far'?1:3)*1048576,key+': source budget');
 }
 for(const[key,p,ground]of[['near',near,nearGround],['far',far,farGround]]){
  assert.equal(p.meta.beds,5);assert.equal(p.meta.plants.length,321);assert.equal(p.meta.trees.length,8);
  for(const k of['terrainMutation','relocatedEientei','fullClinic','animatedPlants'])assert.equal(p.meta[k],false);
  for(const site of p.meta.plants){assert(atlas.peonyObstacles.every(q=>Math.hypot(q[0]-site.x,q[1]-site.z)>=q[2]+.49),'Plant in original tree exclusion zone');assert(Math.abs(site.x+1380)>4.4,'Plant blocks central lane');}
  for(const[x,y,zz]of p.meta.trees)assert(Math.abs(y-ground.height(x,zz))<.001);
  const s=p.meta.shelter;for(const[x,y,zz]of s.posts){assert(y-.6<Math.min(nearGround.height(x,zz),farGround.height(x,zz))-.5,'Floating post foundation');assert(s.floor>Math.max(nearGround.height(x,zz),farGround.height(x,zz)),'Buried work surface');}
  const all=p.meshes.filter(m=>!['plants','beds','herbs'].includes(m.peonyPart));for(const x of[-1334,-1335]){assert.equal(clearSegment(G,all,[x,s.floor+1.8,-779],[x,s.floor+1.8,-786]),null,'Shelter access obstructed');passageChecks++;}
  assert.equal(peonyDigest(P.build(atlas,key==='far')),peonyDigest(p),'Nondeterministic build');
 }
 same(near.meta.plants,far.meta.plants,'Near/far planting sites differ');assert.equal(near.signs.length,1);assert(near.signs[0].text.includes('永远亭'));assert.equal(far.signs.length,0);
 assert.equal(peonyDigest(await G.buildRegion(atlas,P.id,'')),peonyDigest(near),'Worker dispatch mismatch');
 assert(roads.meshes.every(m=>m.overview&&m.globalSurface&&(m.globalNear||m.globalFar)),'Road lost with detail pack');
 const end=P.paths[0][0];assert(G.ASAMA.surfacePath.some(q=>Math.hypot(q[0]-end[0],q[1]-end[1])<.01),'Missing original trail connection');
 for(const road of roads.meshes){const ground=road.globalFar?farGround:nearGround;for(let i=0;i<road.vertices.length;i+=9){const v=road.vertices,y=ground.height(v[i],v[i+2]),gap=v[i+1]-y;assert(gap>.085&&gap<.335,'Road contact gap outside budget');}}
 const rendered=G.ASAMA.sampleRenderedTerrain(pack);assert.equal(Object.keys(P.views).length,10);for(const[id,v]of Object.entries(P.views)){assert.equal(G.DIORAMA.regionOf(id),P.id);assert(v.eye[1]>rendered(v.eye[0],v.eye[2],'near').p[1]+.9,id+': below terrain');}
 assert.equal(unchanged(),before,'Original source geometry changed');const c=atlas.surfaceContacts[P.id],contactBytes=c.near.byteLength+c.far.byteLength;assert(contactBytes<190000,'Excessive terrain transfer');
 return{...stats,clumps:321,trees:8,beds:5,views:10,clearShelterSegments:passageChecks,contactBytes,navigable:coverage.navigable,pending:coverage.pending,characters:85,protectedFiles:Object.keys(f.protectedFiles).length};
}
