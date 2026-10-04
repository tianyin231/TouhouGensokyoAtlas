/* P: bounded east-shore tree identities and public planting.
 * Original Scarlet architecture, water, pier and mixed shoreline remain intact.
 */
(function(G){'use strict';
const REVISION=1,COUNT=108,COLD='overview:scarlet:trees';
const selected=[{"id":"scarlet:legacy:plants:cedar:7:-8","ordinal":0,"kind":"cedar","matrix":[1.0766717195510864,0,0.2253396064043045,0,0,1.0619393587112427,0,0,-0.2253396064043045,0,1.0766717195510864,0,750,109.79000091552734,-674,1],"rgb":[0.06312578171491623,0.14398252964019775,0.07293284684419632]},{"id":"scarlet:legacy:plants:cedar:7:-7","ordinal":0,"kind":"cedar","matrix":[-0.7528960108757019,0,-0.8019648194313049,0,0,0.9752598404884338,0,0,0.8019648194313049,0,-0.7528960108757019,0,748,109.79000091552734,-582,1],"rgb":[0.062155041843652725,0.14222058653831482,0.07219171524047852]},{"id":"scarlet:legacy:plants:cedar:7:-7","ordinal":1,"kind":"cedar","matrix":[0.4018864035606384,0,-1.088159203529358,0,0,1.2471494674682617,0,0,1.088159203529358,0,0.4018864035606384,0,740.36962890625,109.79000091552734,-650,1],"rgb":[0.06185038015246391,0.14166760444641113,0.07195910811424255]},{"id":"scarlet:legacy:plants:cedar:7:-7","ordinal":2,"kind":"cedar","matrix":[-0.3958660066127777,0,0.8801326155662537,0,0,0.9947078227996826,0,0,-0.8801326155662537,0,-0.3958660066127777,0,740.84912109375,109.79000091552734,-632,1],"rgb":[0.06095321103930473,0.14003917574882507,0.07127414643764496]},{"id":"scarlet:legacy:plants:cedar:7:-7","ordinal":3,"kind":"cedar","matrix":[-0.9670020341873169,0,-0.7192021012306213,0,0,1.2436219453811646,0,0,0.7192021012306213,0,-0.9670020341873169,0,739.4225463867188,109.79000091552734,-596,1],"rgb":[0.06217369809746742,0.14225444197654724,0.07220595329999924]},{"id":"scarlet:legacy:plants:cedar:7:-7","ordinal":4,"kind":"cedar","matrix":[-0.12594597041606903,0,0.9609413146972656,0,0,0.9519256949424744,0,0,-0.9609413146972656,0,-0.12594597041606903,0,742.2250366210938,109.79000091552734,-578,1],"rgb":[0.06467659771442413,0.14679735898971558,0.07411686331033707]},{"id":"scarlet:legacy:plants:garden-broadleaf:7:-6","ordinal":1,"kind":"broadleaf","matrix":[1.311303734779358,0,0.24173122644424438,0,0,1.4408656358718872,0,0,-0.24173122644424438,0,1.311303734779358,0,697.95361328125,103.89122009277344,-575.29541015625,1],"rgb":[0.13795866072177887,0.23393604159355164,0.08727294951677322]},{"id":"scarlet:legacy:plants:garden-broadleaf:7:-7","ordinal":0,"kind":"broadleaf","matrix":[-0.11512299627065659,0,1.2617073059082031,0,0,1.2906973361968994,0,0,-1.2617073059082031,0,-0.11512299627065659,0,742.9791870117188,109.79000091552734,-614,1],"rgb":[0.1364995688199997,0.23196613788604736,0.08666247874498367]},{"id":"scarlet:legacy:plants:garden-broadleaf:7:-7","ordinal":1,"kind":"broadleaf","matrix":[-0.5834577679634094,0,1.0196300745010376,0,0,1.1078665256500244,0,0,-1.0196300745010376,0,-0.5834577679634094,0,753.2276000976562,109.79000091552734,-663.8750610351562,1],"rgb":[0.13481715321540833,0.22969470918178558,0.0859585627913475]},{"id":"scarlet:legacy:plants:garden-broadleaf:7:-7","ordinal":2,"kind":"broadleaf","matrix":[0.013584526255726814,0,-1.2389836311340332,0,0,1.3671469688415527,0,0,1.2389836311340332,0,0.013584526255726814,0,710.5260009765625,107.72779846191406,-589.3377685546875,1],"rgb":[0.1398070603609085,0.2364315241575241,0.08804630488157272]},{"id":"scarlet:legacy:plants:garden-willow:7:-8","ordinal":0,"kind":"willow","matrix":[-0.8530457019805908,0,0.7828088998794556,0,0,1.2292698621749878,0,0,-0.7828088998794556,0,-0.8530457019805908,0,761.3184814453125,109.79000091552734,-694.8317260742188,1],"rgb":[0.273945152759552,0.3856053948402405,0.13263221085071564]},{"id":"scarlet:legacy:plants:garden-broadleaf:7:-8","ordinal":0,"kind":"broadleaf","matrix":[0.9675571322441101,0,-0.9647749066352844,0,0,1.213683843612671,0,0,0.9647749066352844,0,0.9675571322441101,0,758.03271484375,109.79000091552734,-679.2858276367188,1],"rgb":[0.13730552792549133,0.2330542355775833,0.08699967712163925]},{"id":"scarlet:legacy:plants:garden-willow:7:-7","ordinal":0,"kind":"willow","matrix":[1.27261483669281,0,0.039418939501047134,0,0,1.1303244829177856,0,0,-0.039418939501047134,0,1.27261483669281,0,721.571533203125,109.71098327636719,-603.8157958984375,1],"rgb":[0.26778608560562134,0.3786734938621521,0.1306460201740265]},{"id":"scarlet:legacy:plants:garden-willow:7:-6","ordinal":0,"kind":"willow","matrix":[0.5868609547615051,0,-1.008636474609375,0,0,1.0337544679641724,0,0,1.008636474609375,0,0.5868609547615051,0,683.6694946289062,101.52099609375,-561.9200439453125,1],"rgb":[0.2710265815258026,0.3823206126689911,0.13169102370738983]}];
const specifications=[{"id":"scarlet:legacy:plants:cedar:7:-8","kind":"cedar","count":2,"ordinals":[0]},{"id":"scarlet:legacy:plants:cedar:7:-7","kind":"cedar","count":5,"ordinals":[0,1,2,3,4]},{"id":"scarlet:legacy:plants:garden-broadleaf:7:-6","kind":"broadleaf","count":2,"ordinals":[1]},{"id":"scarlet:legacy:plants:garden-broadleaf:7:-7","kind":"broadleaf","count":3,"ordinals":[0,1,2]},{"id":"scarlet:legacy:plants:garden-willow:7:-8","kind":"willow","count":1,"ordinals":[0]},{"id":"scarlet:legacy:plants:garden-broadleaf:7:-8","kind":"broadleaf","count":1,"ordinals":[0]},{"id":"scarlet:legacy:plants:garden-willow:7:-7","kind":"willow","count":1,"ordinals":[0]},{"id":"scarlet:legacy:plants:garden-willow:7:-6","kind":"willow","count":1,"ordinals":[0]}];
const targets=new Map(specifications.map(s=>[s.id,s])),nativeID=/^scarlet:legacy:plants:/;
const prepared=new WeakSet(),isFloat=a=>ArrayBuffer.isView(a)&&a.constructor.name==='Float32Array';
const budgets={cedar:[126,54],broadleaf:[2829,392],willow:[4230,555]};
function bytes(meshes){let n=0;const buffers=new Set();for(const m of meshes)for(const k of ['vertices','farVertices','instances','instanceColors','index']){const a=m[k];if(a&&!buffers.has(a.buffer)){buffers.add(a.buffer);n+=a.buffer.byteLength;}}return n;}
function identity(m,i){return Array.from(m.instances.subarray(i*16,i*16+16)).map(v=>Object.is(v,-0)?'-0':v).join(',')+'|'+Array.from(m.instanceColors.subarray(i*3,i*3+3)).join(',');}
const selectedKeys=new Map(selected.map(t=>[identity({instances:Float32Array.from(t.matrix),instanceColors:Float32Array.from(t.rgb)},0),t]));
function instances(m,count){if(m.material!=='foliage'||m.group!=='vegetation'||!isFloat(m.instances)||m.instances.length!==count*16||!isFloat(m.instanceColors)||m.instanceColors.length!==count*3)throw Error('Lake shore source identity requires review: '+m.id);}
function subset(m,ordinals){
 if(ordinals.length===m.instances.length/16)return{instances:m.instances,instanceColors:m.instanceColors};
 const matrices=new Float32Array(ordinals.length*16),colors=new Float32Array(ordinals.length*3);
 ordinals.forEach((i,j)=>{matrices.set(m.instances.subarray(i*16,i*16+16),j*16);colors.set(m.instanceColors.subarray(i*3,i*3+3),j*3);});
 return{instances:matrices,instanceColors:colors};
}
function geometry(m,kind,lod,owned){
 const source=lod==='near'?m.vertices:m.farVertices,limit=budgets[kind][lod==='near'?0:1];
 if(!isFloat(source)||source.length!==limit*27)throw Error('Lake shore prototype source requires review: '+m.id+'/'+lod);
 const out=G.LAKE_SHORE_PLANTS.tree(kind,lod,source,m.vertices);
 if(!isFloat(out)||out===source||!out.length||out.length%27||out.length>limit*27)throw Error('Lake shore private prototype budget requires review: '+kind+'/'+lod);
 // Worker transfers own this build's copies, never the private prototype cache.
 if(!owned.has(out))owned.set(out,out.slice());return owned.get(out);
}
function applyDetail(data,pack){
 if(pack.meta?.lakeShore?.revision===REVISION)return pack;
 if(!G.LAKE_SHORE_PLANTS?.tree)throw Error('Lake shore tree prototypes must load before integration');
 const original=pack.meshes.filter(m=>nativeID.test(m.id));
 if(original.reduce((n,m)=>n+(m.instances?.length||0)/16,0)!==COUNT)throw Error('Lake shore native population requires review');
 const seen=new Set(),meshes=[],owned=new Map();let changed=0;
 for(const m of pack.meshes){const s=targets.get(m.id);if(!s){meshes.push(m);continue;}
  if(seen.has(m.id))throw Error('Duplicate lake shore source: '+m.id);seen.add(m.id);instances(m,s.count);
  const ordinals=s.ordinals;
  for(const i of ordinals){const t=selected.find(t=>t.id===m.id&&t.ordinal===i);if(!t||identity(m,i)!==identity({instances:Float32Array.from(t.matrix),instanceColors:Float32Array.from(t.rgb)},0))throw Error('Lake shore selected ordinal requires review: '+m.id+'/'+i);}
  const vertices=geometry(m,s.kind,'near',owned),farVertices=geometry(m,s.kind,'far',owned),chosen=new Set(ordinals),remaining=Array.from({length:s.count},(_,i)=>i).filter(i=>!chosen.has(i));
  if(remaining.length)meshes.push({...m,...subset(m,remaining),lakeShoreSource:m.id,lakeShoreOrdinals:remaining});
  meshes.push({...m,...subset(m,ordinals),id:m.id+(remaining.length?':lake-shore':''),vertices,farVertices,
   basis:'P',lakeShoreRevision:REVISION,lakeShoreSource:m.id,lakeShoreOrdinals:ordinals.slice(),lakeShoreKind:s.kind});changed+=ordinals.length;
 }
 if(seen.size!==targets.size||changed!==selected.length)throw Error('Missing lake shore native tree sources');
 return{...pack,meshes,bytes:bytes(meshes),meta:{...pack.meta,lakeShore:{revision:REVISION,basis:'P',selectedTrees:changed,retainedTrees:COUNT-changed}}};
}
function overviewTrees(pack){
 if(!G.LAKE_SHORE_PLANTS?.proxy)throw Error('Lake shore proxy prototypes must load before integration');
 const sources=pack.meshes.filter(m=>m.id===COLD);if(sources.length!==1)throw Error('Lake shore cold source requires review');
 const m=sources[0];instances(m,COUNT);if(m.owner!=='scarlet'||!m.overview)throw Error('Lake shore cold owner requires review');
 const kinds=new Map(),remaining=[],found=new Set();
 for(let i=0;i<COUNT;i++){const t=selectedKeys.get(identity(m,i));if(!t){remaining.push(i);continue;}
  if(found.has(t))throw Error('Duplicate lake shore cold identity');found.add(t);if(!kinds.has(t.kind))kinds.set(t.kind,[]);kinds.get(t.kind).push(i);
 }
 if(found.size!==selected.length||remaining.length!==COUNT-selected.length)throw Error('Missing exact lake shore cold/native identity correspondence');
 const replacements=[{...m,...subset(m,remaining),lakeShoreSource:COLD,lakeShoreOrdinals:remaining}];
 for(const[kind,ordinals]of kinds){const vertices=G.LAKE_SHORE_PLANTS.proxy(kind);
  if(!isFloat(vertices)||!vertices.length||vertices.length%27||vertices.length>96*27)throw Error('Lake shore cold proxy budget requires review: '+kind);
  replacements.push({...m,...subset(m,ordinals),id:COLD+':lake-shore:'+kind,vertices:vertices.slice(),basis:'P',
   lakeShoreRevision:REVISION,lakeShoreSource:COLD,lakeShoreOrdinals:ordinals,lakeShoreKind:kind});
 }
 return pack.meshes.flatMap(n=>n===m?replacements:[n]);
}
function prepare(data,pack){
 if(prepared.has(pack))return[];
 if(!G.LAKE_SHORE_GROUND?.prepare)throw Error('Lake shore rendered-ground helper must load before integration');
 const nextData={...data,surfaceContacts:{...(data.surfaceContacts||{})}},nextPack={...pack,meshes:pack.meshes.slice()},
       additions=G.LAKE_SHORE_GROUND.prepare(nextData,nextPack);
 if(!Array.isArray(additions))throw Error('Lake shore public additions must be an array');
 // Production evaluates pack.meshes.push before calling build. Publish all new
 // records together and return[] so none are pushed into that old receiver.
 nextPack.meshes=overviewTrees(nextPack).concat(additions);
 data.surfaceContacts=nextData.surfaceContacts;data.lakeShoreGround=nextData.lakeShoreGround;
 pack.meshes=nextPack.meshes;prepared.add(pack);return[];
}
const originalBuildRegion=G.buildRegion;
G.buildRegion=async function(data,id,legacy){
 const pack=await originalBuildRegion(data,id,legacy);
 // Existing author-body callers intentionally omit legacy. They keep exactly
 // the original architecture/water package and do not generate other sources.
 return id==='scarlet'&&legacy?applyDetail(data,pack):pack;
};
G.LAKE_SHORE={revision:REVISION,selected,targets,bytes,prepare,applyDetail,originalBuildRegion};
G.extraOverviewBuilders=[...(G.extraOverviewBuilders||[]),prepare];
})(globalThis.GA);
