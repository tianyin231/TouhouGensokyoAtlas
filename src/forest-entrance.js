/* 香霖堂来路左侧公共林缘的有限整景候选；造型为 P 工程补完。
 * Keep original public identities, matrices, RGB, materials, LOD and batches.
 * Private prototypes and ground colors are applied after the approved regions.
 */
(function(G){'use strict';
const REVISION=1;
const cells=[
 {cell:'-6:0',trees:[2,1,2],shrub:13,grass:452},
 {cell:'-6:1',trees:[9,6,12],shrub:24,grass:581},
 {cell:'-7:1',trees:[4,4,2],shrub:12,grass:132}
];
const targets=new Map();
for(const cell of cells){
 for(let variant=0;variant<3;variant++)targets.set('landscape:planting:broad'+variant+':'+cell.cell,{kind:'tree',variant,count:cell.trees[variant]});
 for(const kind of ['shrub','grass'])targets.set('landscape:planting:'+kind+':'+cell.cell,{kind,count:cell[kind]});
}
function floatArray(a){return ArrayBuffer.isView(a)&&a.constructor.name==='Float32Array';}
function replacePlant(m,target){
 const {kind,variant,count}=target,P=G.FOREST_ENTRANCE_PLANTS;
 if(!m.globalSurface||m.component!=='transition-vegetation'||m.material!=='landscapeLeaf'||m.index||
    !floatArray(m.instances)||m.instances.length!==count*16||!floatArray(m.instanceColors)||m.instanceColors.length!==count*3)
  throw Error('Forest entrance source identity requires review: '+m.id);
 const arrays={};
 for(const [key,lod]of [['vertices','near'],['farVertices','far']]){
  const source=m[key],array=kind==='tree'?P.tree(variant,lod):P[kind](lod);
  if(!floatArray(source)||!floatArray(array)||!array.length||array.length%27||array.length>source.length)
   throw Error('Forest entrance prototype budget requires review: '+m.id+'/'+lod);
  arrays[key]=array;
 }
 return {...m,...arrays,forestEntrancePlant:true,basis:'P: retained public planting, revised crown and understorey forms'};
}
function applyOverview(data,pack){
 if(pack.meta?.forestEntrance?.revision===REVISION)return[];
 const P=G.FOREST_ENTRANCE_PLANTS,F=G.FOREST_ENTRANCE_GROUND;
 if(!P||!F?.applyRecord)throw Error('Forest entrance helpers must load before integration');
 const seen=new Set(),groundSeen=new Set(),counts={tree:0,shrub:0,grass:0};let groundRecords=0;
 const meshes=pack.meshes.map(m=>{
  const target=targets.get(m.id);
  if(target){
   if(seen.has(m.id))throw Error('Duplicate forest entrance source: '+m.id);
   seen.add(m.id);counts[target.kind]+=target.count;
   return replacePlant(m,target);
  }
  if(F.ids.includes(m.id)){
   if(groundSeen.has(m.id))throw Error('Duplicate forest entrance ground: '+m.id);
   groundSeen.add(m.id);
  }
  const out=F.applyRecord(m);
  if(out!==m)groundRecords++;
  return out;
 });
 if(seen.size!==targets.size||counts.tree!==42||counts.shrub!==49||counts.grass!==1165)
  throw Error('Forest entrance source population requires review');
 if(groundSeen.size!==F.ids.length)throw Error('Forest entrance source ground requires review');
 // Commit only after all identities and helper calls have succeeded.
 pack.meshes=meshes;
 pack.meta={...pack.meta,forestEntrance:{revision:REVISION,basis:'P: existing public forest edge only',
  trees:counts.tree,shrubs:counts.shrub,grassClumps:counts.grass,plantRecords:seen.size,groundRecords}};
 return[];
}
G.FOREST_ENTRANCE={revision:REVISION,targets,replacePlant,applyOverview};
G.extraOverviewBuilders=[...(G.extraOverviewBuilders||[]),applyOverview];
})(globalThis.GA);
