/* P: one eastern riverside/courtyard landscape sample. Buildings, streets,
 * bridge approaches and all original planting identities are retained.
 * No new shader/material, renderer subclass, world generation or spatial cells. */
(function(G){'use strict';
const P=G.VILLAGE_LANDSCAPE_PLANTS;if(!P)throw Error('Village landscape plants must load first');
const CONTACT='village-landscape',BOUNDS=[43,3,159,143],REVISION=1;
const treeTargets=new Map();for(const kind of ['broadleaf','cherry','willow'])for(const x of[0,1])for(const z of[0,1]){if(kind==='willow'&&x===1)continue;treeTargets.set(`village:legacy:plants:garden-${kind}:${x}:${z}`,kind);}
const expectedTrees={broadleaf:29,cherry:6,willow:4},shrubTargets=new Map([['props:shrub:0:0',69],['props:shrub:1:0',124]]);
const sites=[
 ['willow-middle:0','shrub',71.828017,68.495381,1.2,1.10],['willow-middle:2','herb',68.812458,70.256482,1.0,1.96],['willow-middle:7','herb',68.461344,62.951351,1.15,4.11],['willow-middle:8','herb',69.768925,61.468167,1.0,4.54],['willow-middle:13','herb',73.955977,67.464065,1.15,6.69],['willow-middle:16','herb',70.093165,69.670697,1.0,7.98],
 ['willow-front:0','shrub',77.737357,123.090371,1.2,.40],['willow-front:9','shrub',73.959759,119.469548,1.2,4.27],['willow-front:11','herb',77.024021,117.795313,1.15,5.13],['willow-front:12','shrub',77.257665,120.147157,1.2,5.56],['willow-front:16','herb',77.167146,125.107235,1.0,7.28],['willow-front:25','herb',75.727052,118.344128,1.15,11.15],
 ['street-grove:0','shrub',63.028269,22.575228,1.2,1.30],['street-grove:2','herb',59.722713,23.700895,1.0,2.16],['street-grove:3','shrub',59.894741,21.344400,1.2,2.59],['street-grove:6','shrub',60.208813,17.991992,1.2,3.88],['street-grove:8','herb',62.406275,15.278783,1.0,4.74],['street-grove:9','shrub',63.516425,17.365295,1.2,5.17],
 ['court-link:1','herb',99.003207,68.872792,1.15,3.03],['court-link:2','herb',98.311390,67.020617,1.0,3.46],['court-link:11','herb',104.982391,72.443504,1.15,7.33],['court-link:12','shrub',102.942791,71.248328,1.2,7.76],['court-link:25','herb',105.300681,71.071886,1.15,13.35]
].map(([id,kind,x,z,scale,angle])=>Object.freeze({id,kind,x,z,scale,angle}));
const groundIds=['island:terrain:0:0','island:terrain:0:0:far'],groundSet=new Set(groundIds),prepared=new WeakMap();
// Full matrix + RGB Float32 words from immutable legacy.pack.gz; no runtime legacy decode.
const originalIdentities=[{"kind":"willow","bits":"1060320563,0,3207740015,0,0,1064726184,0,0,1060256367,0,1060320563,0,1072400355,1106195251,1092616192,1065353216,1049050352,1052755751,1040487313"},{"kind":"willow","bits":"3190607362,0,3212876241,0,0,1066010768,0,0,1065392593,0,3190607362,0,1114149921,1106195251,1092616192,1065353216,1048877847,1052561601,1040376054"},{"kind":"willow","bits":"3206482790,0,3209885712,0,0,1065133904,0,0,1062402064,0,3206482790,0,1116544422,1106195251,1115947008,1065353216,1049289628,1053025051,1040641638"},{"kind":"willow","bits":"3211427021,0,1042024507,0,0,1063434452,0,0,3189508155,0,3211427021,0,1117147416,1106195251,1123287040,1065353216,1048938365,1052629713,1040415086"},{"kind":"broadleaf","bits":"3212246680,0,3205039855,0,0,1065377847,0,0,1057556207,0,3212246680,0,1115233786,1106195251,1100940328,1065353216,1040976431,1047389145,1035056306"},{"kind":"broadleaf","bits":"1045041264,0,3214260413,0,0,1066050715,0,0,1066776765,0,1045041264,0,1088528823,1106195251,1108871195,1065353216,1041110464,1047570102,1035168463"},{"kind":"broadleaf","bits":"3206128079,0,1032555105,0,0,1058550296,0,0,3180038753,0,3206128079,0,1118489799,1106195251,1091579410,1065353216,1040762316,1047100071,1034877137"},{"kind":"broadleaf","bits":"3204300096,0,1025510942,0,0,1057131054,0,0,3172994590,0,3204300096,0,1117909878,1106195251,1111490560,1065353216,1040770608,1047111266,1034884076"},{"kind":"cherry","bits":"1066112700,0,1055289532,0,0,1067423364,0,0,3202773180,0,1066112700,0,1123028643,1106195251,1124428013,1065353216,1059629240,1052795465,1055170029"},{"kind":"broadleaf","bits":"1060053095,0,1059882418,0,0,1063507865,0,0,3207366066,0,1060053095,0,1118398360,1106195251,1125437782,1065353216,1040807704,1047161348,1034915117"},{"kind":"broadleaf","bits":"1044509823,0,3207755669,0,0,1060356985,0,0,1060272021,0,1044509823,0,1094808789,1106195251,1121413618,1065353216,1040846583,1047213838,1034947650"},{"kind":"broadleaf","bits":"3205490644,0,3186643009,0,0,1057401622,0,0,1039159361,0,3205490644,0,1119176763,1106195251,1127490338,1065353216,1041231460,1047733457,1035269711"},{"kind":"broadleaf","bits":"3199042922,0,3201160661,0,0,1057662921,0,0,1053677013,0,3199042922,0,1088326450,1106195251,1125646336,1065353216,1041088832,1047540896,1035150362"},{"kind":"cherry","bits":"1059824744,0,1049366900,0,0,1060705443,0,0,3196850548,0,1059824744,0,1123013202,1106195251,1116763764,1065353216,1059812532,1052960965,1055332778"},{"kind":"cherry","bits":"1049027996,0,3203101784,0,0,1058401214,0,0,1055618136,0,1049027996,0,1120614180,1106195251,1090374778,1065353216,1059925976,1053063397,1055433507"},{"kind":"cherry","bits":"3203897526,0,1051985687,0,0,1059406063,0,0,3199469335,0,3203897526,0,1119956593,1106195251,1117126227,1065353216,1059601462,1052770384,1055145365"},{"kind":"broadleaf","bits":"1020469804,0,3208851590,0,0,1061596487,0,0,1061367942,0,1020469804,0,1123485015,1106195251,1125081644,1065353216,1041109624,1047568968,1035167761"},{"kind":"broadleaf","bits":"3199679752,0,1063944112,0,0,1064892609,0,0,3211427760,0,3199679752,0,1120646455,1106195251,1127195923,1065353216,1041250246,1047758820,1035285432"},{"kind":"broadleaf","bits":"1028187639,0,1064099556,0,0,1063674147,0,0,3211583204,0,1028187639,0,1126583800,1106195251,1125389668,1065353216,1041001644,1047423185,1035077404"},{"kind":"broadleaf","bits":"3194002584,0,1066676945,0,0,1067335919,0,0,3214160593,0,3194002584,0,1123147898,1106195251,1128198498,1065353216,1041190119,1047677643,1035235118"},{"kind":"broadleaf","bits":"1042571501,0,3214063820,0,0,1066734546,0,0,1066580172,0,1042571501,0,1125549226,1106195251,1125586111,1065353216,1040812686,1047168075,1034919286"},{"kind":"broadleaf","bits":"1050244048,0,1065115063,0,0,1065473755,0,0,3212598711,0,1050244048,0,1124335055,1106195251,1126869045,1065353216,1040798374,1047148752,1034907310"},{"kind":"broadleaf","bits":"1031835941,0,1057660070,0,0,1057722229,0,0,3205143718,0,1031835941,0,1125505876,1106195251,1123018565,1065353216,1041142304,1047613088,1035195107"},{"kind":"broadleaf","bits":"1057813867,0,3197155066,0,0,1059058689,0,0,1049671418,0,1057813867,0,1124578747,1106195251,1127515992,1065353216,1040746506,1047078726,1034863908"},{"kind":"cherry","bits":"1062852831,0,1053003209,0,0,1063335926,0,0,3200486857,0,1062852831,0,1118880098,1106195251,1124862459,1065353216,1059608016,1052776302,1055151184"},{"kind":"broadleaf","bits":"3212565232,0,1056460632,0,0,1066363735,0,0,3203944280,0,3212565232,0,1120754753,1106195251,1116269533,1065353216,1041127315,1047592852,1035182564"},{"kind":"broadleaf","bits":"1064501893,0,3190830321,0,0,1065828856,0,0,1043346673,0,1064501893,0,1126839738,1106195251,1115535786,1065353216,1040938011,1047337275,1035024157"},{"kind":"broadleaf","bits":"1055925428,0,1031699553,0,0,1057384182,0,0,3179183201,0,1055925428,0,1124666781,1106195251,1091887628,1065353216,1041160269,1047637343,1035210140"},{"kind":"broadleaf","bits":"3204363238,0,1001147501,0,0,1055772936,0,0,3148631149,0,3204363238,0,1125726283,1106195251,1092806126,1065353216,1040863953,1047237289,1034962186"},{"kind":"broadleaf","bits":"1057395610,0,3198454388,0,0,1058174397,0,0,1050970740,0,1057395610,0,1126854787,1106195251,1091908397,1065353216,1040688978,1047001058,1034815769"},{"kind":"broadleaf","bits":"1055806956,0,1035763313,0,0,1057047571,0,0,3183246961,0,1055806956,0,1124166738,1106195251,1113606306,1065353216,1040807069,1047160492,1034914586"},{"kind":"broadleaf","bits":"3197701259,0,1052593577,0,0,1054679921,0,0,3200077225,0,3197701259,0,1125317754,1106195251,1113455429,1065353216,1040803141,1047155188,1034911299"},{"kind":"broadleaf","bits":"1051643818,0,3201997669,0,0,1058753445,0,0,1054514021,0,1051643818,0,1126419594,1106195251,1113320926,1065353216,1041100706,1047556928,1035160298"},{"kind":"broadleaf","bits":"1057801276,0,1047446531,0,0,1058970367,0,0,3194930179,0,1057801276,0,1127512155,1106195251,1113566534,1065353216,1040736610,1047065365,1034855626"},{"kind":"broadleaf","bits":"1044694047,0,3204411266,0,0,1057340218,0,0,1056927618,0,1044694047,0,1124110192,1106195251,1117118474,1065353216,1041132552,1047599923,1035186946"},{"kind":"broadleaf","bits":"1054371329,0,1050156763,0,0,1056794179,0,0,3197640411,0,1054371329,0,1125182482,1106195251,1117285151,1065353216,1040858970,1047230563,1034958016"},{"kind":"broadleaf","bits":"1054838581,0,1044270865,0,0,1057465420,0,0,3191754513,0,1054838581,0,1126238350,1106195251,1117084015,1065353216,1041225592,1047725535,1035264801"},{"kind":"broadleaf","bits":"1028237056,0,1057229145,0,0,1057661744,0,0,3204712793,0,1028237056,0,1127420509,1106195251,1117028442,1065353216,1040860704,1047232904,1034959467"},{"kind":"cherry","bits":"3205453597,0,3172029611,0,0,1059073519,0,0,1024545963,0,3205453597,0,1119826499,1106195251,1113122530,1065353216,1060067154,1053190870,1055558862"}];
const identity=(ma,co,i)=>{const m=new Uint32Array(ma.buffer,ma.byteOffset+i*16*4,16),c=new Uint32Array(co.buffer,co.byteOffset+i*3*4,3);return [...m,...c].join(',');};
function memory(meshes){const buffers=new Set();for(const m of meshes)for(const k of['vertices','farVertices','index','instances','instanceColors','villageFinish','villageFarFinish'])if(m[k])buffers.add(m[k].buffer);return[...buffers].reduce((n,b)=>n+b.byteLength,0);}
function sourceTree(m){return treeTargets.get(m.id);}
function validateSites(pack){
 const houses=pack.meta.houses,gardens=pack.meta.gardens;if(!houses||houses.length!==226||!gardens||gardens.length!==140)throw Error('Village sample needs unchanged authored parcels');
 for(const s of sites){const r=(s.kind==='shrub'?1.1:.75)*s.scale;
  for(const x of[-207,-134,-60,110,188])if(Math.abs(s.x-x)<3.4+r+.15)throw Error('Village planting reaches street '+s.id);
  for(const z of[-158,-96,-34,32,98,164])if(Math.abs(s.z-z)<4.1+r+.15)throw Error('Village planting reaches cross street '+s.id);
  for(const z of[-126,-64,0,65,127,190])if(Math.abs(s.z-z)<.95+r+.12)throw Error('Village planting reaches service lane '+s.id);
  if(Math.abs(s.x-G.canalCenter(s.z))-G.canalWidth(s.z)<9+r)throw Error('Village planting reaches promenade '+s.id);
  for(const h of houses){const dx=s.x-h.x,dz=s.z-h.z,c=Math.cos(h.yaw),a=Math.sin(h.yaw),u=c*dx-a*dz,v=a*dx+c*dz;if(Math.abs(u)<h.w/2+.9+r&&Math.abs(v)<h.d/2+.9+r)throw Error('Village planting reaches house '+s.id);if(Math.abs(u)<h.w/2+.95+r&&v>h.d/2-.4-r&&v<h.d/2+4.40+r)throw Error('Village planting reaches frontage '+s.id);}
  for(const a of gardens)if(Math.abs(s.x-a.x)<a.w/2+.50+r&&Math.abs(s.z-a.z)<a.d/2+.50+r)throw Error('Village planting reaches court wall '+s.id);
 }
}
function upgrade(pack){
 if(pack.meta?.villageLandscape?.revision===REVISION)return pack;validateSites(pack);
 const counts={broadleaf:0,cherry:0,willow:0},seen=new Set(),meshes=pack.meshes.map(m=>{
  const kind=sourceTree(m);if(kind){if(!m.legacyInstanceIdentity||m.material!=='foliage'||!m.instances||!m.instanceColors||seen.has(m.id))throw Error('Village source planting changed '+m.id);const expected=new Set(originalIdentities.filter(p=>p.kind===kind).map(p=>p.bits));for(let i=0;i<m.instances.length/16;i++)if(!expected.has(identity(m.instances,m.instanceColors,i)))throw Error('Village actual source identity changed '+m.id);seen.add(m.id);counts[kind]+=m.instances.length/16;return{...m,vertices:P.tree(kind,'near',m.vertices),farVertices:P.tree(kind,'far',m.farVertices),villageLandscapePlant:kind};}
  if(shrubTargets.has(m.id)){if(m.material!=='matte'||m.lod!=='props'||m.instances.length/16!==shrubTargets.get(m.id)||seen.has(m.id))throw Error('Village source shrub changed '+m.id);seen.add(m.id);const variant=m.id.endsWith(':1:0')?1:0;return{...m,index:undefined,vertices:P.shrub('near',variant).slice(),farVertices:P.shrub('far',variant).slice(),villageLandscapePlant:'shrub'};}
  return m;
 });
 for(const k of Object.keys(expectedTrees))if(counts[k]!==expectedTrees[k])throw Error('Village source tree count changed '+k);if(seen.size!==12)throw Error('Village source target records missing');
 return{...pack,meshes,bytes:memory(meshes),meta:{...pack.meta,villageLandscape:{revision:REVISION,trees:39,originalShrubs:193,originalInstanceArraysRetained:true,basis:'P: tended garden crowns and original low planting'}}};
}
function field(x,z){
 // Four broad, quiet planted-soil fields; protect actual paving/streets. No noise,
 // per-leaf spots or changes to geometry, material, lighting, indices or shadows.
 if(x<43||x>113||z<3||z>139)return 0;
 let weight=0;for(const [cx,cz,rx,rz]of[[70.55,66,7,8],[75.16,122,7,8],[62.28,19.88,6,7],[102.68,68.46,6,7]])weight=Math.max(weight,1-G.smooth(.32,1,Math.hypot((x-cx)/rx,(z-cz)/rz)));
 let clearance=Math.min(...[-207,-134,-60,110,188].map(a=>Math.abs(x-a)-3.4),...[-158,-96,-34,32,98,164].map(a=>Math.abs(z-a)-4.1));
 clearance=Math.min(clearance,Math.abs(Math.abs(x-G.canalCenter(z))-G.canalWidth(z)-5.5)-3.25);
 return weight*G.smooth(.05,1.4,clearance)*.38;
}
function groundColor(m){if(!groundSet.has(m.id))return m;if(!m.globalSurface||m.component!=='island-terrain'||!m.index)throw Error('Village public ground changed '+m.id);const a=m.vertices,soil=G.rgb('#929373');let out;
 for(let i=0;i<a.length;i+=9){const w=field(a[i],a[i+2]);if(!w)continue;out??=a.slice();for(let k=0;k<3;k++)out[i+6+k]=a[i+6+k]+(soil[k]-a[i+6+k])*w;}
 return out?{...m,vertices:out,villageLandscapeGround:true}:m;
}
function planting(data){
 const near=G.SurfaceContact.sampler(data,CONTACT,'near'),far=G.SurfaceContact.sampler(data,CONTACT,'far'),meshes=[];
 for(const kind of['shrub','herb']){
  const outputs=[];for(const lod of['near','far']){const g=new G.Geometry(),array=kind==='shrub'?P.shrub(lod):P.herb(lod);for(const s of sites.filter(s=>s.kind===kind)){
    // Root segments remain buried across BOTH actual terrain levels. Canopy,
    // position and source tile never move when the ordinary plant LOD changes.
    const y=Math.min(near.height(s.x,s.z),far.height(s.x,s.z))-.13,c=Math.cos(s.angle),a=Math.sin(s.angle),sy=s.scale*(kind==='shrub'?1.55:1);
    for(let i=0;i<array.length;i+=27){const points=[];for(let j=0;j<3;j++){const k=i+j*9,x=array[k]*s.scale,z=array[k+2]*s.scale;points.push([s.x+c*x+a*z,y+array[k+1]*sy,s.z-a*x+c*z]);}g.tri(...points,[array[i+6],array[i+7],array[i+8]]);}
   }outputs.push(g.mesh('village-landscape:'+kind,'vegetation',{owner:'village',region:'village',space:'surface',globalSurface:true,overview:true,material:'foliage',component:'village-landscape',lodDistance:125,basis:'P: four planted-gap groups, no inherited instance changed'}));}
  meshes.push({...outputs[0],farVertices:outputs[1].vertices});
 }
 return meshes;
}
function applyOverview(data,pack){
 if(prepared.has(pack))return[];
 const nextData={...data,surfaceContacts:{...(data.surfaceContacts||{})}};
 G.SurfaceContact.prepare(nextData,pack,CONTACT,BOUNDS);
 const original=pack.meshes.find(m=>m.id==='overview:village:trees');if(!original?.instances||!original.instanceColors||original.instances.length/16!==322)throw Error('Village original overview trees changed');
 // Read selected identities from the immutable legacy source data once. The
 // integration accepts them explicitly; no point-to-nearest-tree matching.
 const identities=data.villageLandscapeIdentities||originalIdentities;if(!Array.isArray(identities)||identities.length!==39)throw Error('Village sample original identities must be prepared');
 const wanted=new Map(identities.map(p=>[p.bits,p.kind])),keep=[],colors=[],groups=new Map(),seen=new Set();
 for(let i=0;i<original.instances.length/16;i++){const key=identity(original.instances,original.instanceColors,i),kind=wanted.get(key);if(kind){if(seen.has(key))throw Error('Duplicate village overview identity');seen.add(key);if(!groups.has(kind))groups.set(kind,{ma:[],co:[]});groups.get(kind).ma.push(...original.instances.subarray(i*16,i*16+16));groups.get(kind).co.push(...original.instanceColors.subarray(i*3,i*3+3));}else{keep.push(...original.instances.subarray(i*16,i*16+16));colors.push(...original.instanceColors.subarray(i*3,i*3+3));}}
 if(seen.size!==39)throw Error('Village native/overview selected identity mismatch');
 const proxies=[];for(const [kind,b]of groups)proxies.push({...original,id:'overview:village:landscape-trees:'+kind,vertices:P.tree(kind,'proxy'),instances:Float32Array.from(b.ma),instanceColors:Float32Array.from(b.co),villageLandscapePlant:kind});
 const nextMeshes=[...pack.meshes.map(m=>m===original?{...m,instances:Float32Array.from(keep),instanceColors:Float32Array.from(colors)}:groundColor(m)),...proxies,...planting(nextData)];
 // boot evaluates the receiver of meshes.push BEFORE this hook. Returning
 // additions would push them into that abandoned array; publish everything here.
 pack.meshes=nextMeshes;data.surfaceContacts=nextData.surfaceContacts;prepared.set(pack,true);return[];
}
function prepareIdentities(data,legacy){
 const identities=[];for(const m of legacy.meshes){const kind=treeTargets.get('village:legacy:'+m.id);if(!kind)continue;for(let i=0;i<m.instances.length/16;i++)identities.push({bits:identity(m.instances,m.instanceColors,i),kind});}
 if(identities.length!==39)throw Error('Village legacy source identity preparation requires review');data.villageLandscapeIdentities=identities;return identities;
}
G.VILLAGE_LANDSCAPE={revision:REVISION,treeTargets,shrubTargets,sites,groundIds,upgrade,applyOverview,prepareIdentities,field,validateSites,basis:'P: unchanged inherited village with one eastern landscape sample'};
const previous=G.buildRegion;G.buildRegion=async function(data,id,legacy){const pack=await previous(data,id,legacy);return id==='village'?upgrade(pack):pack;};
G.extraOverviewBuilders=[...(G.extraOverviewBuilders||[]),applyOverview];
})(globalThis.GA);
