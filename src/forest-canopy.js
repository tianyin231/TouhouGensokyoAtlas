/* 雾雨邸周边的原生林冠与林下样板；P 工程补完。
 * Retain native tree sites, transforms, colors, materials, LOD and bounds.
 * The original forest builder remains available for independent comparison.
 */
(function(G){'use strict';
const REVISION=1;
const cells=[
 {cell:'-10:0',counts:[7,3,4]},
 {cell:'-10:1',counts:[4,5,4]},
 {cell:'-9:0',counts:[3,4,4]},
 {cell:'-9:1',counts:[4,2,3]}
];
const targets=new Map();
for(const cell of cells)for(let variant=0;variant<3;variant++)
 for(const part of ['wood','leaf'])targets.set('forest:trees:'+cell.cell+':'+variant+':'+part,
  Object.freeze({variant,part,count:cell.counts[variant]}));
const woodCache=new WeakMap();
const isFloat=a=>ArrayBuffer.isView(a)&&a.constructor.name==='Float32Array';
function woodWithSupport(source,extra){
 let result=woodCache.get(source);
 if(!result){result=new Float32Array(source.length+extra.length);result.set(source);result.set(extra,source.length);woodCache.set(source,result);}
 return result;
}
function replaceTree(m,target){
 const {variant,part,count}=target,P=G.FOREST_CANOPY_PLANTS;
 if(m.owner!=='forest'||m.region!=='forest'||m.space!=='surface'||m.group!=='vegetation'||
    m.component!=='forest-canopy'||m.material!==(part==='wood'?'timber':'forestLeaf')||
    m.lodDistance!==280||m.index||m.globalSurface||!isFloat(m.instances)||
    m.instances.length!==count*16||!isFloat(m.instanceColors)||m.instanceColors.length!==count*3)
  throw Error('Forest canopy source identity requires review: '+m.id);
 const arrays={};
 for(const [field,lod,oldWood,oldLeaf]of [['vertices','near',324,2400],['farVertices','far',126,280]]){
  const source=m[field],p=P.prototype(variant,lod);
  if(!isFloat(source)||source.length!==(part==='wood'?oldWood:oldLeaf)*27||
     !isFloat(p.extraWood)||!isFloat(p.leaf)||p.extraWood.length%27||p.leaf.length%27||
     p.leaf.length===0||oldWood+(p.extraWood.length+p.leaf.length)/27>oldWood+oldLeaf)
   throw Error('Forest canopy prototype budget requires review: '+m.id+'/'+lod);
  arrays[field]=part==='wood'?woodWithSupport(source,p.extraWood):p.leaf;
 }
 return {...m,...arrays,forestCanopyRevision:REVISION};
}
function applyDetail(data,pack){
 if(pack.meta?.forestCanopy?.revision===REVISION)return pack;
 if(!G.FOREST_CANOPY_PLANTS?.prototype||!G.FOREST_CANOPY_GROUND?.detail)
  throw Error('Forest canopy helpers must load before integration');
 const seen=new Set();let trees=0;
 const meshes=pack.meshes.map(m=>{
  const target=targets.get(m.id);if(!target)return m;
  if(seen.has(m.id))throw Error('Duplicate forest canopy source: '+m.id);
  seen.add(m.id);if(target.part==='leaf')trees+=target.count;
  return replaceTree(m,target);
 });
 if(seen.size!==24||trees!==47||pack.meta.treeCount!==755)
  throw Error('Forest canopy population requires review');
 const ground=G.FOREST_CANOPY_GROUND.detail(data,{...pack,meshes});
 if(!ground||!Array.isArray(ground.meshes))throw Error('Missing forest canopy ground result');
 return {...pack,meshes:ground.meshes,bytes:G.FOREST_UPGRADE.bytes(ground.meshes),
  meta:{...pack.meta,forestCanopy:{revision:REVISION,basis:'P',trees,treeRecords:seen.size,ground:ground.meta||{}}}};
}
const preparedPacks=new WeakSet();
function prepare(data,pack){
 if(preparedPacks.has(pack))return [];
 if(!G.FOREST_CANOPY_GROUND?.prepare||!G.FOREST_CANOPY_ROAD?.prepare)
  throw Error('Forest canopy ground and road must load before integration');
 // Both helpers publish to these private containers. A later contact failure
 // cannot leave the public package with only half of the reviewed changes.
 const nextData={...data,surfaceContacts:{...(data.surfaceContacts||{})}},
       nextPack={...pack,meshes:pack.meshes.slice()};
 const additions=G.FOREST_CANOPY_ROAD.prepare(nextData,nextPack);
 if(!Array.isArray(additions))throw Error('Forest canopy road additions must be an array');
 G.FOREST_CANOPY_GROUND.prepare(nextData,nextPack);
 // Production calls pack.meshes.push(...build(data,pack)): JavaScript captures
 // that receiver before build runs. Include additions in this atomic list and
 // return no additions, otherwise they would be pushed into the old array.
 nextPack.meshes=nextPack.meshes.concat(additions);
 data.surfaceContacts=nextData.surfaceContacts;
 data.forestCanopyRoad=nextData.forestCanopyRoad;
 data.forestCanopyGround=nextData.forestCanopyGround;
 pack.meshes=nextPack.meshes;preparedPacks.add(pack);
 return [];
}
const previous=G.buildRegion;
G.buildRegion=async function(data,id,legacy){
 if(id!=='forest')return previous(data,id,legacy);
 const start=performance.now(),pack=await previous(data,id,legacy),out=applyDetail(data,pack);
 out.builtMs=performance.now()-start;return out;
};
G.FOREST_CANOPY={revision:REVISION,cells,targets,replaceTree,applyDetail,prepare};
G.extraOverviewBuilders=[...(G.extraOverviewBuilders||[]),prepare];
})(globalThis.GA);
