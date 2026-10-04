/* P: existing native forest crown rollout.
 * Only tree prototype arrays change. Original wood, sites, matrices, colors,
 * materials, record bounds and LOD remain. No overview, ground or renderer hook.
 */
(function(G){'use strict';
const REVISION=1,SEEDS=Object.freeze([134,591,833]);
const treeID=/^forest:trees:-?\d+:-?\d+:([012]):(wood|leaf)$/;
const woodCache=new WeakMap(),isFloat=a=>ArrayBuffer.isView(a)&&a.constructor.name==='Float32Array';
function withBoughs(source,extra){
 let cached=woodCache.get(source);
 if(cached){if(cached.extra!==extra)throw Error('Forest crown source reused by another seed');return cached.vertices;}
 const vertices=new Float32Array(source.length+extra.length);vertices.set(source);vertices.set(extra,source.length);
 woodCache.set(source,{extra,vertices});return vertices;
}
function replaceTree(m,variant,part){
 const count=m.instances?.length/16,P=G.FOREST_CANOPY_PLANTS;
 if(m.owner!=='forest'||m.region!=='forest'||m.space!=='surface'||m.group!=='vegetation'||
    m.component!=='forest-canopy'||m.material!==(part==='wood'?'timber':'forestLeaf')||
    m.lodDistance!==280||m.index||m.globalSurface||m.leafCards||
    !isFloat(m.instances)||!Number.isInteger(count)||count<1||
    !isFloat(m.instanceColors)||m.instanceColors.length!==count*3)
  throw Error('Native forest crown identity requires review: '+m.id);
 const arrays={};
 for(const [field,lod,wood,leaf]of [['vertices','near',324,2400],['farVertices','far',126,280]]){
  const source=m[field],p=P.prototype(variant,lod);
  if(!isFloat(source)||source.length!==(part==='wood'?wood:leaf)*27||
     !isFloat(p.extraWood)||!isFloat(p.leaf)||p.extraWood.length%27||p.leaf.length%27||
     !p.leaf.length||wood+(p.extraWood.length+p.leaf.length)/27>wood+leaf)
   throw Error('Native forest crown budget requires review: '+m.id+'/'+lod);
  arrays[field]=part==='wood'?withBoughs(source,p.extraWood):p.leaf;
 }
 return {...m,...arrays};
}
function applyDetail(pack){
 if(pack.meta?.forestCrownRollout?.revision===REVISION)return pack;
 if(!G.FOREST_CANOPY_PLANTS?.prototype||!G.FOREST_UPGRADE?.bytes)
  throw Error('Native forest crown dependencies must load before integration');
 const seen=new Set(),pairs=new Map();let trees=0;
 const meshes=pack.meshes.map(m=>{
  const match=treeID.exec(m.id);if(!match)return m;
  if(seen.has(m.id))throw Error('Duplicate native forest crown source: '+m.id);seen.add(m.id);
  const variant=Number(match[1]),part=match[2],key=m.id.replace(/:(wood|leaf)$/,''),pair=pairs.get(key)||{};
  pair[part]=m;pairs.set(key,pair);if(part==='leaf')trees+=m.instances?.length/16;
  return replaceTree(m,variant,part);
 });
 if(seen.size!==310||pairs.size!==155||trees!==755||pack.meta?.treeCount!==755)
  throw Error('Native forest crown population requires review');
 for(const p of pairs.values())if(!p.wood||!p.leaf||p.wood.instances.length!==p.leaf.instances.length)
  throw Error('Native forest crown wood/leaf pairing requires review');
 return {...pack,meshes,bytes:G.FOREST_UPGRADE.bytes(meshes),
  meta:{...pack.meta,forestCrownRollout:{revision:REVISION,basis:'P',trees,treeRecords:seen.size,seeds:SEEDS}}};
}
G.FOREST_CROWN_ROLLOUT={revision:REVISION,seeds:SEEDS,replaceTree,applyDetail};
})(globalThis.GA);
