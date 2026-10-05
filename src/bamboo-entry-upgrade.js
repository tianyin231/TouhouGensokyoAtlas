/* P: one native bamboo entry sample. Keep placements, batches, materials,
 * colors, bounds, LOD distance, paths, buildings and cold overview unchanged.
 */
(function(G){'use strict';
const revision=1,cells=Object.freeze(['3:8','4:8','3:9','4:9']),cellSet=new Set(cells),
      recordID=/^bamboo:(stem|leaf):([012]):(-?\d+):(-?\d+)$/;
const target=m=>{const match=recordID.exec(m.id);return match&&cellSet.has(match[3]+':'+match[4])?{part:match[1],variant:Number(match[2]),cell:match[3]+':'+match[4]}:null;};
function bytes(meshes){const seen=new Set();let n=0;for(const m of meshes)for(const k of ['vertices','farVertices','instances','instanceColors','index']){const a=m[k];if(a&&!seen.has(a.buffer)){seen.add(a.buffer);n+=a.buffer.byteLength;}}return n;}
function applyDetail(pack){
 if(pack.meta?.bambooEntry?.revision===revision)return pack;
 const stems=new Map(),targets=[];
 for(const m of pack.meshes){const t=target(m);if(!t)continue;
  if(m.owner!=='bamboo'||m.region!=='bamboo'||m.space!=='surface'||m.group!=='vegetation'||m.lodDistance!==150||!m.local||m.index||!m.instances||!m.instanceColors||m.material!==(t.part==='stem'?'bambooStem':'bambooLeaf'))throw Error('Bamboo entry record identity requires review: '+m.id);
  if(m.vertices.length!==(t.part==='stem'?1329:616)*27||m.farVertices.length!==(t.part==='stem'?15:96)*27)throw Error('Bamboo entry source geometry requires review: '+m.id);
  targets.push(m);if(t.part==='stem')stems.set(t.variant+':'+t.cell,m);
 }
 if(targets.length!==24||targets.filter(m=>target(m).part==='stem').reduce((n,m)=>n+m.instances.length/16,0)!==807)throw Error('Native bamboo entry sample population requires review');
 const meshes=pack.meshes.map(m=>{const t=target(m);if(!t)return m;const source=stems.get(t.variant+':'+t.cell);if(!source)throw Error('Missing native bamboo culm pair: '+m.id);
  if(m.instances!==source.instances||m.instanceColors!==source.instanceColors)throw Error('Bamboo entry pair identity changed: '+m.id);
  const p=G.BAMBOO_ENTRY_PLANTS.prototype(t.variant,source.vertices,source.farVertices);
  return {...m,vertices:p.near[t.part],farVertices:p.far[t.part]};
 });
 return {...pack,meshes,bytes:bytes(meshes),meta:{...pack.meta,bambooEntry:{revision,basis:'P',scope:'native entry crowns only; original cold overview retained',bounds:[288,768,480,960],boundsRule:'half-open original 96 m cells',cells,records:targets.length,culms:targets.filter(m=>target(m).part==='stem').reduce((n,m)=>n+m.instances.length/16,0)}}};
}
const originalBuildRegion=G.buildRegion;
G.buildRegion=async function(data,id,legacy){
 if(id!=='bamboo')return originalBuildRegion(data,id,legacy);
 const start=performance.now(),out=applyDetail(await originalBuildRegion(data,id,legacy));out.builtMs=performance.now()-start;return out;
};
G.BAMBOO_ENTRY_UPGRADE=Object.freeze({revision,cells,target,applyDetail,bytes,originalBuildRegion});
})(globalThis.GA);
