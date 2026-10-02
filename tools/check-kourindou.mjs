// Local refinement fixture. This checker never creates or rewrites baselines.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {geometryDigest} from './check-hakurei.mjs';
import {fallsBlocked} from './check-waterfall-cave.mjs';
import {verticalHits} from './check-wind-cave.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const raw=a=>Buffer.from(a.buffer,a.byteOffset,a.byteLength);
export function kourindouDigest(pack){
 const h=createHash('sha256');for(const m of pack.meshes){h.update(JSON.stringify([m.id,m.material,m.kourindouPart,m.overview,m.center,m.radius,m.lodDistance,m.leafCards]));for(const k of ['vertices','farVertices','instances','instanceColors','index'])if(m[k]){h.update(k);h.update(raw(m[k]));}}return h.digest('hex');
}
export async function checkKourindou(G,atlas,characters,read){
 const K=G.KOURINDOU_UPGRADE,f=JSON.parse(read('tools/kourindou-baseline.json')),t=new G.Terrain(atlas);
 for(const [name,digest]of Object.entries(f.protectedFiles))assert.equal(hash(read(name)),digest,'Inherited source changed: '+name);
 assert.equal(hash(JSON.stringify(characters)),f.characters);assert.equal(characters.characters.length,85);
 const audit=G.auditLandmarks(atlas);assert.equal(audit.total,179);assert.equal(audit.navigable,109);assert.equal(audit.pending,70);
 for(const [id,view]of Object.entries(f.navigation))assert.equal(G.resolveLocation(id).view,view,'Prior navigation changed: '+id);
 assert.equal(G.resolveLocation('kourindou').view,'kourindou');assert.equal(G.resolveLocation('tengu').view,null);
 const original=G.buildForest(t),current=await G.buildRegion(atlas,'forest','');
 assert.equal(geometryDigest(original),f.originalForest,'The preserved v0.14 forest builder changed');
 assert.equal(geometryDigest({meshes:original.meshes.filter(m=>m.component!=='kourindou')}),geometryDigest({meshes:current.meshes.filter(m=>m.component!=='kourindou')}),'Alice, Marisa, forest roads or old vegetation changed');
 assert.equal(JSON.stringify(current.signs),JSON.stringify(original.signs),'Sign content or placement changed');
 assert.equal(K.bytes(current.meshes),current.bytes);assert(!current.meshes.some(m=>m.id.startsWith('forest:kourindou:')),'Old shop is still overlaid');
 const near=K.architecture(),far=K.architecture(true),stats={};let doorChecks=0,roofChecks=0,contactChecks=0;
 for(const [key,p]of [['near',near],['far',far]]){
  assert.equal(kourindouDigest(p),f.geometry[key],key+': review actual model before an explicit baseline change');
  assert.equal(kourindouDigest(K.architecture(key==='far')),kourindouDigest(p),'Nondeterministic architecture');
  assert.equal(K.bytes(p.meshes),p.bytes);assert(p.bytes<(key==='near'?6:1.5)*1048576,'Architecture source budget');
  assert.deepEqual(Array.from(p.meta.shopFootprint),[22,16]);assert.deepEqual(Array.from(p.meta.kuraFootprint),[10.5,13.4]);assert(!p.meta.fullInterior&&!p.meta.terrainMutation);
  const solid=p.meshes.filter(m=>m.kourindouPart!=='props');
  // Real front opening and uninterrupted porch-to-path lane, not visibility flags.
  for(const x of [-565,-564,-563])for(const [a,b,y]of [[7.8,6.0,47.6],[13,8,47.6],[16,13,47.1],[25,16,46.8]]){assert.equal(fallsBlocked(G,solid,[x,y,a],[x,y,b]),null,'Blocked store approach');doorChecks++;}
  const roof=p.meshes.filter(m=>['roof','roofUnder'].includes(m.kourindouPart));
  const supports=p.meshes.filter(m=>m.material==='kourindouWoodY'&&m.kourindouPart==='structure');
  for(const x of [-577.2,-569,-558.1,-552.8]){
   const h=verticalHits(supports,x,12,45,50),r=verticalHits(roof,x,12,48.5,50.2);assert(h.length&&r.length,'Missing roof or actual support');assert(Math.max(...h)>=Math.min(...r)-.04,'Porch post floats below roof');roofChecks++;
  }
  stats[key]={meshes:p.meshes.length,triangles:p.meshes.reduce((s,m)=>s+m.vertices.length/27,0),lodTriangles:p.meshes.reduce((s,m)=>s+(m.farVertices?.length||0)/27,0),bytes:p.bytes};
 }
 const z=gunzipSync(read('assets/packs/overview.pack.gz')),pack=G.decodePack(z.buffer.slice(z.byteOffset,z.byteOffset+z.byteLength));G.LANDSCAPE.apply(pack,t);G.applyHighlandGround(pack,t);
 const before=pack.meshes.slice(),arrayHashes=new Map();
 for(const m of before)for(const k of ['vertices','farVertices','instances','instanceColors','index'])if(m[k]&&!arrayHashes.has(m[k]))arrayHashes.set(m[k],hash(raw(m[k])));
 const oldTrees=before.filter(m=>m.globalSurface&&m.component==='transition-vegetation'&&m.instances&&/(broad|broadleaf)/.test(m.id));
 const matrixKeys=meshes=>meshes.flatMap(m=>Array.from({length:m.instances.length/16},(_,i)=>raw(m.instances.subarray(i*16,i*16+16)).toString('base64')));
 const additions=K.publicEnvironment(atlas,pack),publicPack={meshes:additions};assert.equal(kourindouDigest(publicPack),f.geometry.public,'Public tree/apron fixture changed');
 assert(!pack.meshes.some(m=>m.owner==='forest'&&m.component==='kourindou'),'Old overview shop not removed');
 const remain=pack.meshes.filter(m=>oldTrees.some(n=>n.id===m.id)),replacement=additions.filter(m=>m.leafCards),newKeys=new Set(atlas.kourindouUpgrade.newSites.map(([x,y,z,s])=>[x,z].join(',')));
 const retainedReplacement=replacement.map(m=>({...m,instances:Float32Array.from(Array.from({length:m.instances.length/16},(_,i)=>m.instances.subarray(i*16,i*16+16)).filter(a=>!newKeys.has([a[12],a[14]].join(','))).flatMap(a=>Array.from(a)))}));
 assert.deepEqual(matrixKeys([...remain,...retainedReplacement]).sort(),Array.from(matrixKeys(oldTrees)).sort(),'Original public tree matrices changed');
 for(const ma of atlas.kourindouUpgrade.oldMatrices)assert(K.localWeight(ma[12],ma[14])>0,'Replacement outside the local zone');
 for(const [array,digest]of arrayHashes)assert.equal(hash(raw(array)),digest,'Original terrain or geometry buffer mutated');
 for(const m of before)if(!oldTrees.includes(m)&&m.component!=='kourindou')assert(pack.meshes.includes(m),'Unrelated world mesh replaced');
 const grounds=['near','far'].map(lod=>G.SurfaceContact.sampler(atlas,'kourindou',lod));
 for(const p of [near,far])for(const [x,y,z]of p.meta.porchFeet)for(const ground of grounds){assert(y<ground.height(x,z),'Foundation not buried');assert(verticalHits(p.meshes.filter(m=>m.kourindouPart==='foundation'),x,z,y-.5,y+1.5).length>=2,'Foundation is not actual geometry');contactChecks++;}
 for(const [key,p]of [['near',near],['far',far],['public',publicPack]]){
  assert.equal(new Set(p.meshes.map(m=>m.id)).size,p.meshes.length);
  for(const m of p.meshes){assert.equal(m.basis,'P');assert(m.center.every(Number.isFinite)&&m.radius>0);
   for(const a of [m.vertices,m.farVertices].filter(Boolean)){
    assert(a.length>0&&a.length%27===0&&a.every(Number.isFinite));
    for(let i=0;i<a.length;i+=9){assert(Math.abs(Math.hypot(a[i+3],a[i+4],a[i+5])-1)<1e-5,m.id+' normal');
     const pos=[a[i],a[i+1],a[i+2]];
     if(m.instances){for(let j=0;j<m.instances.length;j+=16)assert(G.length(G.sub(G.transform(m.instances.subarray(j,j+16),pos).slice(0,3),m.center))<m.radius+.02,m.id+' instance bounds');}
     else assert(G.length(G.sub(pos,m.center))<m.radius+.02,m.id+' bounds');
    }
    for(let i=0;i<a.length;i+=27)assert(G.length(G.cross([a[i+9]-a[i],a[i+10]-a[i+1],a[i+11]-a[i+2]],[a[i+18]-a[i],a[i+19]-a[i+1],a[i+20]-a[i+2]]))>1e-7,m.id+' degenerate');
   }
   if(m.instances)assert.equal(m.instances.length/16*3,m.instanceColors.length);
   if(key==='public')assert(m.globalSurface&&m.overview,'Trees and undergrowth must survive detail eviction');
   if(m.leafCards){assert.equal(m.vertices.length%54,0);assert(additions.some(n=>n!==m&&n.instances===m.instances),'Leaf/wood matrices not shared');}
  }
 }
 const contact=atlas.surfaceContacts.kourindou;assert(contact.near.byteLength+contact.far.byteLength<220000);
 assert(K.bytes(additions)<1.5*1048576,'Public source attribute budget');
 for(const id of ['kourindouRear','kourindouFoot','kourindouPath']){const v=G.PRESETS[id];assert.equal(G.DIORAMA.regionOf(id),'forest');assert(v.eye[1]>grounds[0].height(v.eye[0],v.eye[2])+.85,'Camera underground');}
 return {...stats,public:{meshes:additions.length,bytes:K.bytes(additions),replacedTrees:atlas.kourindouUpgrade.oldMatrices.length,newTrees:atlas.kourindouUpgrade.newSites.length,grassSites:atlas.kourindouUpgrade.grassSites},doorChecks,roofChecks,contactChecks,contactBytes:contact.near.byteLength+contact.far.byteLength,protectedFiles:Object.keys(f.protectedFiles).length,navigable:109,pending:70,characters:85};
}
