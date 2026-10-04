/* 原生森林冠层推广与已验收雾雨林下样板；P 工程补完。
 * Retain native tree sites, transforms, colors, materials, LOD and bounds.
 * The original forest builder remains available for independent comparison.
 */
(function(G){'use strict';
const REVISION=2,SAMPLE_REVISION=1;
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
function replaceTree(m,target){
 const out=G.FOREST_CROWN_ROLLOUT.replaceTree(m,target.variant,target.part);
 return targets.has(m.id)?{...out,forestCanopyRevision:SAMPLE_REVISION}:out;
}
function applyDetail(data,pack){
 if(pack.meta?.forestCanopy?.revision===REVISION)return pack;
 if(!G.FOREST_CROWN_ROLLOUT?.applyDetail||!G.FOREST_CANOPY_GROUND?.detail)
  throw Error('Forest canopy helpers must load before integration');
 // One pure crown pass and one wood cache for all 755 trees. Retain the
 // original sample's record markers without repeating its geometry work.
 const crowned=G.FOREST_CROWN_ROLLOUT.applyDetail(pack),
       meshes=crowned.meshes.map(m=>targets.has(m.id)?{...m,forestCanopyRevision:SAMPLE_REVISION}:m),
       ground=G.FOREST_CANOPY_GROUND.detail(data,{...crowned,meshes});
 if(!ground||!Array.isArray(ground.meshes))throw Error('Missing forest canopy ground result');
 return {...crowned,meshes:ground.meshes,bytes:G.FOREST_UPGRADE.bytes(ground.meshes),
  meta:{...crowned.meta,forestCanopy:{revision:REVISION,basis:'P',trees:755,treeRecords:310,ground:ground.meta||{}}}};
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
