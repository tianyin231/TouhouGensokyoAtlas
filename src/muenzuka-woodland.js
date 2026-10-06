/* P: complete the ordinary Muenzuka woodland with its accepted crown shapes.
 * The western 25 trees and ten independent cold trees remain untouched. The
 * remaining original stems, placements, colours and identities are retained.
 */
(function(G){'use strict';
const E=G.MUENZUKA_EDGE,revision=1,prepared=new WeakMap();
if(!E||E.revision!==2)throw Error('Muenzuka woodland requires the accepted western arc');
const nativeTargets=Object.freeze([
 ['-22:6:1',7],['-22:7:0',4],['-21:6:1',4],['-22:8:0',5],['-21:7:0',3],
 ['-22:6:0',4],['-22:7:1',2],['-22:8:1',3],['-21:7:1',3],['-21:6:0',2]
].map(([key,count])=>Object.freeze({id:'muenzuka:trees:'+key+':leaf',variant:Number(key.at(-1)),count})));
const coldTargets=Object.freeze(E.coldIDs.map((id,variant)=>Object.freeze({id,variant,count:variant?11:10})));
const nativeById=new Map(nativeTargets.map(q=>[q.id,q]));
const target=m=>nativeById.get(m.id)||null;
function acceptedWest(pack){
 if(pack.meta?.muenzukaEdge?.revision!==E.revision)throw Error('Muenzuka western native predecessor missing');
 const western=pack.meshes.filter(m=>E.target(m)?.part==='leaf');
 if(western.length!==6||western.reduce((n,m)=>n+m.instances.length/16,0)!==25)throw Error('Accepted Muenzuka western population changed');
 for(const m of western){const p=E.prototype(E.target(m).variant);if(m.vertices!==p.near||m.farVertices!==p.far)throw Error('Accepted Muenzuka western cache identity changed: '+m.id);}
}
function applyDetail(pack){
 if(pack.meta?.muenzukaWoodland?.revision===revision)return pack;
 acceptedWest(pack);
 for(const q of nativeTargets){
  const m=pack.meshes.find(m=>m.id===q.id);
  if(!m||m.owner!=='muenzuka'||m.region!=='muenzuka'||m.component!=='woodland'||m.material!=='forestLeaf'||m.index||m.vertices.length!==2234*27||m.farVertices?.length!==216*27||m.instances?.length!==q.count*16||m.instanceColors?.length!==q.count*3||m.lodDistance!==180)throw Error('Muenzuka remaining native source changed: '+q.id);
  const wood=pack.meshes.find(m=>m.id===q.id.replace(/:leaf$/,':wood'));
  if(!wood||wood.vertices.length!==411*27||wood.farVertices?.length!==75*27)throw Error('Muenzuka original stem pair missing: '+q.id);
 }
 const meshes=pack.meshes.map(m=>{const q=target(m);if(!q)return m;const p=E.prototype(q.variant);return{...m,vertices:p.near,farVertices:p.far};});
 return{...pack,meshes,bytes:E.bytes([meshes]),meta:{...pack.meta,muenzukaWoodland:{revision,basis:'P',trees:37,records:10,additionalPrototypeBytes:0,changes:'Original ordinary foliage only; shared accepted western near/far prototypes, every placement and original stem retained'}}};
}
function prepare(data,pack){
 if(prepared.has(pack))return prepared.get(pack);
 if(!E.metadata(pack))throw Error('Muenzuka cold western predecessor missing');
 const changes=[];
 for(const q of coldTargets){
  const m=pack.meshes.find(m=>m.id===q.id),p=E.prototype(q.variant),west=pack.meshes.find(m=>m.id===q.id+':muenzuka-west-edge');
  if(!m||m.owner!=='muenzuka'||m.component!=='western-region-preview'||m.material!=='forestLeaf'||m.index||m.vertices.length!==216*27||m.instances?.length!==q.count*16||m.instanceColors?.length!==q.count*3||(m.farVertices&&m.farVertices.length!==216*27))throw Error('Muenzuka remaining cold source changed: '+q.id);
  if(!west||west.vertices!==p.far||(west.farVertices&&west.farVertices!==p.far))throw Error('Accepted Muenzuka cold cache identity changed: '+q.id);
  changes.push({source:m,target:q,prototype:p});
 }
 for(const q of changes){const m={...q.source,vertices:q.prototype.far};if(q.source.farVertices)m.farVertices=q.prototype.far;pack.meshes[pack.meshes.indexOf(q.source)]=m;}
 pack.bytes=E.bytes([pack.meshes]);
 const meta={revision,basis:'P',nativeTrees:37,coldTrees:21,nativeTargets,coldTargets,additionalPrototypeBytes:0,addedRecords:0,meaning:'Independent cold identities retained; no native-to-cold correspondence is assumed'};
 prepared.set(pack,meta);return meta;
}
const originalBuildRegion=G.buildRegion;
G.buildRegion=async function(data,id,legacy){if(id!=='muenzuka')return originalBuildRegion(data,id,legacy);const start=performance.now(),out=applyDetail(await originalBuildRegion(data,id,legacy));out.builtMs=performance.now()-start;return out;};
G.extraOverviewBuilders.push((data,pack)=>{prepare(data,pack);return[];});
G.MUENZUKA_WOODLAND=Object.freeze({revision,nativeTargets,coldTargets,target,applyDetail,prepare,metadata:pack=>prepared.get(pack),originalBuildRegion});
})(globalThis.GA);
