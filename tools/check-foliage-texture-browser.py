"""Serial WebGL evidence for foliage A/B and bounded forest changes.

Fixed visual frames use renderOnce and explicitly refresh shadows. Performance
work uses the normal production RAF scheduler and does not call renderOnce,
finish, or readPixels while measuring. SwiftShader is a software renderer:
these observations do not establish hardware FPS or physical VRAM.
Experimental scripts are opt-in browser evaluations, never production HTML edits.
Housing comparisons use exact allowed record changes and protected source hashes;
the standalone housing smoke mode checks production integration without an A/B.
Forest-path visibility comparisons retain every source hash and permit only the
exact forest:paths record to leave the visible set; public roads stay protected.
Village production comparisons protect all existing IDs, placements and source
instances, replay indexed near triangles bit for bit, and use an exact field
manifest for finishes/far geometry and bounded permanent bridge approaches.
Worker timing observes native messages; no production function is replaced.
"""

import argparse
import hashlib
import io
import json
import math
import threading
import time
import traceback
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import quote

from playwright.sync_api import sync_playwright
from PIL import Image, ImageChops, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OPTIONS = dict(quality='balanced', lighting='neutral', weather='clear', clock=12.5,
               motion=False, ao=True, bloom=False, reflections=False,
               vegetation=True, labels=False, characters=False)
EXPERIMENT_FILES = ['assets/experiments/kourindou-foliage-atlas.js',
                    'src/experiments/kourindou-foliage-texture.js']
TARGET_PATTERN = r'^kourindou:landscape:.*:leaf$'
VILLAGE_OVERVIEW_IDS = {f'overview:village:hlod:architecture:world:{x}:{z}:{material}'
                        for x in (-1, 0) for z in (-1, 0) for material in ('matte', 'paving')}
VILLAGE_METADATA_FIELDS = {'material', 'villageOriginalMaterial', 'villageMicro', 'villageProp', 'lodDistance'}
VILLAGE_ARRAY_FIELDS = {'vertices', 'index', 'farVertices', 'villageFinish', 'villageFarFinish'}
VILLAGE_SPECS = {'riverside', 'street', 'bridge'}
VILLAGE_RUNTIME_INPUTS = {'src/village-upgrade.js', 'src/village-renderer.js'}
VILLAGE_REGISTRATION_INPUTS = {'project.json', 'tools/build.py', 'tools/check.mjs',
                             'tools/check-foliage-texture-browser.py', 'tools/check-village.mjs',
                             'tools/village-baseline.json', 'tools/hakurei-baseline.json'}
SPECS = [
    dict(name='riverside', view='riverside'),
    dict(name='street', view='street'),
    dict(name='bridge', view='bridge'),
    dict(name='forestOverview', view='forestOverview'),
    dict(name='alice', view='alice'),
    dict(name='aliceGarden', view='aliceGarden'),
    dict(name='aliceRear', view='alice', camera=dict(eye=[-1094,102,-308], target=[-1134,93,-263], fov=55)),
    dict(name='aliceTowerFoot', view='alice', camera=dict(eye=[-1113,88,-247], target=[-1128,88,-261], fov=58)),
    dict(name='marisa', view='marisa'),
    dict(name='marisaNear', view='marisa', camera=dict(eye=[-1018,77,168], target=[-997,74,148], fov=58)),
    dict(name='marisaRear', view='marisa', camera=dict(eye=[-969,84,104], target=[-993,77,138], fov=56)),
    dict(name='marisaWorkshopFoot', view='marisa', camera=dict(eye=[-969,72,153], target=[-983,72.5,140], fov=58)),
    dict(name='forestAliceConnection', view='forest', route='forest-alice', fraction=.48),
    dict(name='forestMarisaConnection', view='forest', route='forest-marisa', fraction=.50),
    dict(name='forestEntryConnection', view='forest', route='forest-entry', fraction=.72),
    dict(name='forestBoardwalk250', view='forest', camera=dict(eye=[-773,191,90], target=[-967,51,12], fov=49)),
    dict(name='forestBoardwalk250Low', view='forest', camera=dict(eye=[-773,191,90], target=[-967,51,12], fov=49),options=dict(quality='low')),
    dict(name='forestMarisaConnectionLow', view='forest', route='forest-marisa', fraction=.50,options=dict(quality='low')),
    dict(name='sunny', view='kourindou'),
    dict(name='near', view='kourindouFront'),
    dict(name='orbit', view='kourindou', camera=dict(eye=[-507,72,49], target=[-555,50,1], fov=49)),
    dict(name='back', view='kourindouRear'),
    dict(name='foot', view='kourindouFoot'),
    dict(name='connection', view='kourindouPath'),
    dict(name='farCanopy', view='kourindou', camera=dict(eye=[-706,91,125], target=[-557,57,-2], fov=49)),
    dict(name='noPost', view='kourindouPath', options=dict(ao=False)),
    dict(name='low', view='kourindouPath', options=dict(quality='low', ao=False)),
    dict(name='night', view='kourindou', options=dict(lighting='night')),
    dict(name='nightRain', view='kourindou', options=dict(lighting='night', weather='rain')),
    dict(name='dayReturn', view='kourindou', day_return=True),
    dict(name='shrineDay', view='shrineFront'),
    dict(name='shrineNight', view='shrineFront', options=dict(lighting='night')),
]

INIT_JS = r"""(() => {
 globalThis.ATLAS_TEST_PAUSE=true;
 globalThis.__foliageContextEvents=[];
 const seen=new WeakSet(),original=HTMLCanvasElement.prototype.getContext;
 HTMLCanvasElement.prototype.getContext=function(...args){
  if(this.id==='scene'&&/^webgl/.test(args[0])&&!seen.has(this)){
   seen.add(this);
   for(const type of ['webglcontextlost','webglcontextrestored'])this.addEventListener(type,()=>{
    __foliageContextEvents.push({type,at:performance.now(),view:globalThis.ATLAS?.state.view,
      mode:globalThis.FOLIAGE_AB?.info()?.mode});
   });
 }return original.apply(this,args);
 };
 const raf=globalThis.requestAnimationFrame;
 globalThis.requestAnimationFrame=function(callback){
  if(callback.name!=='tick')return raf.call(this,callback);
  return raf.call(this,t=>{
   const P=globalThis.__foliageProbe,before=globalThis.ATLAS?.state.drawnFrames,start=performance.now();
   callback(t);
   if(P?.active&&ATLAS.state.drawnFrames>before&&P.lastRender){
    P.samples.push({...P.lastRender,index:P.index,rafTimestampMs:t,
      callbackCPUms:performance.now()-start,frames:ATLAS.state.drawnFrames,
      frameIntervalMs:P.lastTimestamp===null?null:t-P.lastTimestamp});
    P.lastTimestamp=t;
   }
  });
 };
})();"""

SNAPSHOT_JS = r"""() => {
 const A=ATLAS,R=A.renderer,I=R.info(),target=r=>globalThis.__foliageFamily==='forest'?
  r.data.component==='forest-canopy'&&r.data.id.endsWith(':leaf'):/^kourindou:landscape:.*:leaf$/.test(r.data.id);
 const row=r=>{const m=r.item?.mesh,g=m?.geometry;return {id:r.data.id,level:r.level,
  wanted:!!r.wanted,visible:!!m?.visible,material:r.data.material,actualMaterial:m?.material?.name,
  triangles:g?(g.index?g.index.count:g.attributes.position.count)/3*(m.isInstancedMesh?m.count:1):0,
  instances:m?.isInstancedMesh?m.count:0,center:r.data.center,distance:r.distance,
  component:r.data.component,forestPart:r.data.forestPart||null,globalNear:!!r.data.globalNear,
  globalFar:!!r.data.globalFar,terrainSource:r.data.terrainSource||null,
  alphaTest:m?.material?.alphaTest,depthAlphaTest:m?.customDepthMaterial?.alphaTest,
  uvCount:g?.attributes.uv?.count||0,castShadow:m?.castShadow};};
 const targets=R.records.filter(target).map(row).sort((a,b)=>a.id.localeCompare(b.id));
 const forest=R.records.filter(r=>r.data.component==='forest-canopy'&&r.data.id.endsWith(':leaf'));
 const sourceTri=(m,a)=>a?a.length/27*(m.instances?.length/16||1):0,forestArrays=new Set();
 for(const r of forest)for(const a of [r.data.vertices,r.data.farVertices,r.data.instances,r.data.instanceColors])if(a)forestArrays.add(a);
 const forestSourceSummary={records:forest.length,trees:forest.reduce((n,r)=>n+(r.data.instances?.length/16||1),0),
  nearExpandedTriangles:forest.reduce((n,r)=>n+sourceTri(r.data,r.data.vertices),0),
  farExpandedTriangles:forest.reduce((n,r)=>n+sourceTri(r.data,r.data.farVertices),0),
  uniqueSourceBytes:[...forestArrays].reduce((n,a)=>n+a.byteLength,0),
  visible:forest.filter(r=>r.wanted&&r.item?.mesh.visible).map(row).sort((a,b)=>a.id.localeCompare(b.id))};
 const wanted=R.records.filter(r=>r.wanted&&r.item?.mesh.visible)
  .map(r=>({id:r.data.id,level:r.level})).sort((a,b)=>a.id.localeCompare(b.id));
 const lights=[];R.scene.traverse(o=>{if(o.isLight)lights.push({type:o.type,color:o.color.toArray(),
  intensity:o.intensity,visible:o.visible,castShadow:o.castShadow,position:o.position.toArray(),
  target:o.target?.position.toArray(),shadow:o.shadow?{mapSize:o.shadow.mapSize.toArray(),
   bias:o.shadow.bias,normalBias:o.shadow.normalBias,near:o.shadow.camera.near,far:o.shadow.camera.far,
   left:o.shadow.camera.left,right:o.shadow.camera.right,top:o.shadow.camera.top,bottom:o.shadow.camera.bottom}:null});});
 const textures=new Map(),tex=t=>{if(!t?.isTexture||textures.has(t.uuid))return;
  const im=t.image||{},w=im.width||0,h=im.height||0,data=im.data;
  textures.set(t.uuid,{name:t.name||'',width:w,height:h,depth:im.depth||1,colorSpace:t.colorSpace,
   type:t.type,format:t.format,minFilter:t.minFilter,magFilter:t.magFilter,
   generateMipmaps:t.generateMipmaps,sourceBytes:data?.byteLength||null,
   rgba8BaseEstimateBytes:w*h*4,mipFactor:t.generateMipmaps?4/3:1});};
 for(const mat of new Set([...Object.values(R.mats),...R.records.map(r=>r.item?.mesh.material)])){
  if(!mat)continue;for(const value of Object.values(mat))tex(value);
 }
 const diag=R.diagnosticSnapshot('foliage-fixed-frame');
 const housingRecords=R.records.filter(r=>['alice','marisa','forest-boardwalk'].includes(r.data.component)||r.data.id==='forest:understorey').map(row);
 const boardwalkTerrainSelections=R.records.filter(r=>r.data.component==='forest-boardwalk'&&r.data.terrainSource).map(r=>{
  const source=R.recordMap.get(r.data.terrainSource),visible=!!(r.wanted&&r.item?.mesh.visible);
  return {boardwalk:row(r),terrain:source?row(source):null,
   precisionMatches:!visible||!!(source?.wanted&&source.item?.mesh.visible&&
    !!r.data.globalNear===!!source.data.globalNear&&!!r.data.globalFar===!!source.data.globalFar)};
 });
 return {camera:{eye:A.rig.eye.slice(),target:A.rig.target.slice(),fov:A.rig.fov,aspect:A.rig.aspect,
  space:A.state.space,displayMode:A.state.displayMode,mode:A.rig.mode},
  options:Object.fromEntries(Object.keys(__foliageOptions).map(k=>[k,R.currentOptions[k]])),
  renderedView:R.currentOptions.view,frames:A.state.drawnFrames,stats:I.stats,wanted,targets,
  targetVisibleTriangles:targets.filter(r=>r.wanted&&r.visible).reduce((n,r)=>n+r.triangles,0),forestSourceSummary,
  housingRecords,boardwalkTerrainSelections,
  forestPathVisibility:{legacy:R.recordMap.has('forest:paths')?row(R.recordMap.get('forest:paths')):null,
   revision:I.forestPath?.revision??null,junctionRevision:I.forestPath?.junctionRevision??null,
   junctionEnabled:I.forestPath?.junctionEnabled??false,
   legacyPathCovered:I.forestPath?.legacyPathCovered??false,
   coverageIds:GA.FOREST_PATH_RENDERER?.coverageIds?.slice()||[],
   publicRoads:R.records.filter(r=>/^island:routes:forest:-?\d+:-?\d+(?::shoulder)?$/.test(r.data.id)).map(row).sort((a,b)=>a.id.localeCompare(b.id)),
   branches:(GA.FOREST?.paths||[]).map(p=>{
    const id=p.id==='forest-alice'?'route-alice':p.id==='forest-marisa'?'route-marisa':'island-'+p.id,
      route=GA.ISLAND?.allRoutes.find(r=>r.id===id);
    return {id:p.id,publicId:id,points:p.points.length,samples:p.samples.length,
      publicPoints:route?.points.length||0,publicSamples:route?.samples.length||0,
      pointsMatch:JSON.stringify(p.points)===JSON.stringify(route?.points),
      samplesMatch:JSON.stringify(p.samples)===JSON.stringify(route?.samples)};
   })},
  gpu:{...R.engine.info.memory,programs:R.engine.info.programs?.length||0,
    attributeBytes:R.residentBytes,geometryEntries:R.geometryRefs.size},
  textures:[...textures.values()].sort((a,b)=>a.name.localeCompare(b.name)||a.width-b.width||a.height-b.height),
  targetsConfigured:diag.targets,streaming:diag.streaming,lights,
  scene:{environmentIntensity:R.scene.environmentIntensity,skyVisible:R.sky.visible,
   rainVisible:R.rain.visible,background:R.scene.background?.isColor?R.scene.background.toArray():null,
   fog:R.scene.fog?{near:R.scene.fog.near,far:R.scene.fog.far,color:R.scene.fog.color.toArray()}:null},
  nightActive:R.nightActive,contextLost:R.engine.getContext().isContextLost(),
  contextEvents:__foliageContextEvents.slice(),recovery:I.contextRecovery,
  experiment:globalThis.FOLIAGE_AB?.info()||null};
}"""

# Source hashes are independent of GPU cache residency and camera visibility.
# They protect the original instance matrices, colors, and geometry when a
# building experiment intentionally adds/removes a bounded set of records.
SOURCE_INTEGRITY_JS = r"""async () => {
 const R=ATLAS.renderer,cache=new WeakMap(),hex=b=>Array.from(new Uint8Array(b),v=>v.toString(16).padStart(2,'0')).join('');
 async function array(a){
  if(!cache.has(a))cache.set(a,crypto.subtle.digest('SHA-256',new Uint8Array(a.buffer,a.byteOffset,a.byteLength))
   .then(h=>({type:a.constructor.name,length:a.length,bytes:a.byteLength,sha256:hex(h)})));
  return cache.get(a);
 }
 const replayCache=new WeakMap();
 async function replay(d){
  if(!d.index)return array(d.vertices);
  if(!replayCache.has(d.vertices))replayCache.set(d.vertices,new WeakMap());
  const maps=replayCache.get(d.vertices);if(maps.has(d.index))return maps.get(d.index);
  if(d.vertices.constructor.name!=='Float32Array'||d.vertices.length%9||d.index.length%3)
   throw Error('Invalid village indexed source: '+d.id);
  const src=new Uint32Array(d.vertices.buffer,d.vertices.byteOffset,d.vertices.length),out=new Uint32Array(d.index.length*9);
  for(let i=0;i<d.index.length;i++){
   const from=d.index[i]*9;if(from+9>src.length)throw Error('Village source index out of bounds: '+d.id);
   for(let k=0;k<9;k++)out[i*9+k]=src[from+k];
  }
  const result={type:'Float32Array',length:out.length,bytes:out.byteLength,
   sha256:hex(await crypto.subtle.digest('SHA-256',out))};maps.set(d.index,result);return result;
 }
 const fields=['id','group','material','owner','region','space','component','locationId','overview',
  'globalSurface','center','radius','lod','lodDistance','maxDetailDistance','forestPart','basis'];
 const records=[];
 for(const r of R.records){
  const d=r.data,row={};for(const k of fields)row[k]=d[k]??null;
  row.arrays={};for(const k of Object.keys(d).sort())if(ArrayBuffer.isView(d[k]))row.arrays[k]=await array(d[k]);
  if(globalThis.__villageEvidence){
   row.metadata={};for(const k of Object.keys(d).sort())if(!ArrayBuffer.isView(d[k])&&d[k]!==undefined&&typeof d[k]!=='function')
    row.metadata[k]=JSON.parse(JSON.stringify(d[k]));
   if(r.pack==='village')row.nearReplay=await replay(d);
  }
  records.push(row);
 }
 records.sort((a,b)=>a.id.localeCompare(b.id));
 if(new Set(records.map(r=>r.id)).size!==records.length)throw Error('Duplicate source record ID');
 const result={records,streaming:R.diagnosticSnapshot('source-integrity').streaming,
  completeSourceGeometry:true,hashAlgorithm:'SHA-256 of exact typed-array view bytes'};
 if(globalThis.__villageEvidence)result.villageCompleteMetadata=true;
 return result;
}"""

# Passive capture listener on the already-created native Worker. startedAt is
# RegionStreaming's own task boundary; messageAt is main-thread receipt before
# its existing onmessage handler. Their difference includes Worker startup,
# model construction and transfer, not rendering or subsequent source hashing.
VILLAGE_VISIT_JS = r"""v => {
 const A=ATLAS,S=A.stream,t={view:v,setViewAtMs:performance.now(),
  cacheHadVillage:S.cache.has('village'),workerStartedAtMs:null,workerMessageAtMs:null,
  workerElapsedMs:null,workerRegion:null,workerEpoch:null,messageObserved:false,
  workerQueueMs:null,workerThreadOnlyMs:null,
  observerAttached:false,workerError:null,workerBuildMs:null,workerUpgrade:null,
  boundary:'native RegionStreaming.pending.startedAt -> existing Worker message receipt; includes startup/build/transfer'};
 globalThis.__villageTiming=t;A.setView(v,false);
 const task=S.pending;
 if(task?.id==='village'&&task.worker){
  t.workerRegion=task.id;t.workerEpoch=task.token;t.workerStartedAtMs=Number.isFinite(task.startedAt)?task.startedAt:null;
  task.worker.addEventListener('message',event=>{
   if(t.messageObserved)return;
   t.messageObserved=true;t.workerMessageAtMs=performance.now();
   t.workerElapsedMs=t.workerStartedAtMs===null?null:t.workerMessageAtMs-t.workerStartedAtMs;
   t.workerError=event.data.error||null;const p=event.data.pack;
   t.workerBuildMs=Number.isFinite(p?.builtMs)?p.builtMs:null;
   const u=p?.meta?.villageUpgrade;
   t.workerUpgrade=u?{revision:u.revision??null,workerFinishMs:u.workerFinishMs??null,
    timings:u.timings?{...u.timings}:null}:null;
  },{capture:true,once:true});t.observerAttached=true;
 }
 return t;
}"""

VILLAGE_SNAPSHOT_JS = r"""() => {
 const A=ATLAS,R=A.renderer,row=r=>({id:r.data.id,level:r.level,wanted:!!r.wanted,
  visible:!!r.item?.mesh.visible,sourceMaterial:r.data.material,
  actualMaterial:r.item?.mesh.material?.name||'',castShadow:!!r.item?.mesh.castShadow});
 const approaches=R.records.filter(r=>r.data.component==='village-bridge-approach').map(r=>{
  const d=r.data,s=R.recordMap.get(d.terrainSource),visible=!!(r.wanted&&r.item?.mesh.visible);
  return {...row(r),terrainSource:d.terrainSource,globalNear:!!d.globalNear,globalFar:!!d.globalFar,
   terrain:s?{...row(s),globalNear:!!s.data.globalNear,globalFar:!!s.data.globalFar}:null,
   bindingValid:!!s&&s.data.component==='island-terrain'&&d.globalSurface===true&&
    !!d.globalNear===!!s.data.globalNear&&!!d.globalFar===!!s.data.globalFar&&
    d.terrainLodRadius===s.data.radius&&JSON.stringify(d.terrainLodCenter)===JSON.stringify(s.data.center),
   precisionMatches:!visible||!!(s?.wanted&&s.item?.mesh.visible&&
    !!d.globalNear===!!s.data.globalNear&&!!d.globalFar===!!s.data.globalFar)};
 }).sort((a,b)=>a.id.localeCompare(b.id));
 const detail=R.records.filter(r=>r.pack==='village').map(r=>{
  const m=r.item?.mesh,g=m?.geometry,d=r.data,a=r.level===1&&d.farVertices?d.farVertices:d.vertices,
   source=r.level===1&&d.farVertices?d.villageFarFinish:d.villageFinish,finish=g?.getAttribute('villageFinish'),
   visible=!!(r.wanted&&m?.visible),surface=d.material==='villageSurface';
  return {...row(r),villageMicro:d.villageMicro??null,villageProp:d.villageProp??null,
   finishPresent:!!finish,finishCount:finish?.count||0,
   finishCorrect:!visible||!surface||!!finish&&finish.itemSize===2&&finish.normalized===false&&
    finish.array===source&&source?.constructor.name==='Uint8Array'&&source.length===a.length/9*2,
   triangles:g?(g.index?g.index.count:g.attributes.position.count)/3*(m.isInstancedMesh?m.count:1):0};
 }).sort((a,b)=>a.id.localeCompare(b.id));
 const s=A.stream.info(),pack=A.stream.cache.get('village')?.pack;
 return {version:GA.VILLAGE_UPGRADE?.version??null,approaches,detail,
  materials:R.records.filter(r=>r.wanted&&r.item?.mesh.visible).map(row).sort((a,b)=>a.id.localeCompare(b.id)),
  layout:{presets:GA.PRESETS,placements:A.data.placements,routes:GA.ISLAND.allRoutes},
  nativeTiming:{...(globalThis.__villageTiming||{}),readyObservedAtMs:globalThis.__villageReadyAtMs??null,
   waitObservationUpperBoundMs:globalThis.__villageReadyAtMs&&__villageTiming?
    __villageReadyAtMs-__villageTiming.setViewAtMs:null,
   streamLog:s.log,streamMetrics:{requests:s.requests,builds:s.builds,cacheHits:s.cacheHits},
   cachePackBuildMs:Number.isFinite(pack?.builtMs)?pack.builtMs:null,
   cachePackUpgrade:pack?.meta?.villageUpgrade?{revision:pack.meta.villageUpgrade.revision,
    workerFinishMs:pack.meta.villageUpgrade.workerFinishMs,timings:pack.meta.villageUpgrade.timings}:null,
   staticWarmStartAtMs:globalThis.__villageWarmStartAtMs??null,
   staticWarmEndAtMs:globalThis.__villageWarmEndAtMs??null,
   sourceAuditStartAtMs:globalThis.__villageAuditStartAtMs??null,
   sourceAuditEndAtMs:globalThis.__villageAuditEndAtMs??null,
   sourceAuditExcluded:true,staticWarmFramesExcluded:true,nodeVMCostUsed:false}};
}"""

HOUSING_SMOKE_JS = r"""() => {
 const R=ATLAS.renderer,records=R.records,legacy=records.filter(r=>/^(overview:)?forest:(alice|marisa):/.test(r.data.id));
 const homes={};for(const id of ['alice','marisa']){
  homes[id]={};for(const level of ['near','far']){
   const prefix=`forest:upgrade:${id}:${level}:`,rows=records.filter(r=>r.data.id.startsWith(prefix));
   homes[id][level]={records:rows.length,sourceTriangles:rows.reduce((n,r)=>n+(r.data.vertices?.length||0)/27,0)};
  }
 }
 const boardwalk=records.filter(r=>r.data.component==='forest-boardwalk'),bindings=boardwalk.map(r=>{
  const d=r.data,s=R.recordMap.get(d.terrainSource)?.data;
  return {id:d.id,terrainSource:d.terrainSource,valid:!!s&&s.component==='island-terrain'&&
   !!d.globalNear===!!s.globalNear&&!!d.globalFar===!!s.globalFar&&
   d.globalSurface===true&&!d.farVertices&&d.terrainLodRadius===s.radius&&
   JSON.stringify(d.terrainCenter)===JSON.stringify(s.center)&&JSON.stringify(d.terrainTile)===JSON.stringify(s.tile)};
 });
 const leaf=records.filter(r=>r.data.component==='forest-canopy'&&r.data.id.endsWith(':leaf'));
 const path=R.info().forestPath||{},visibleShoulders=records.filter(r=>/^island:routes:forest:-?\d+:-?\d+:shoulder$/.test(r.data.id)&&r.wanted&&r.item?.mesh.visible).map(r=>r.data.id),
   junctionRequired=path.revision>=3&&visibleShoulders.length>0;
 const checks={newHomeGeometryPresent:['alice','marisa'].every(id=>['near','far'].every(level=>homes[id][level].records>0&&homes[id][level].sourceTriangles>0)),
  legacyHomeRecordsRemoved:legacy.length===0,publicBoardwalkConfigured:boardwalk.length===11&&bindings.every(b=>b.valid),
  originalForestTreesPresent:leaf.length===155&&leaf.reduce((n,r)=>n+(r.data.instances?.length/16||1),0)===755,
  forestJunctionMaskReady:!junctionRequired||path.junctionRevision===1&&path.junctionEnabled===true,
  noFoliageInjection:!globalThis.FOLIAGE_AB&&!R.__foliageTextureExperimentOwner&&records.every(r=>!r.item?.mesh.material?.name?.startsWith('experiment'))};
 return {passed:Object.values(checks).every(Boolean),checks,homes,bindings,legacyIds:legacy.map(r=>r.data.id),
  forestPathJunction:{revision:path.revision??null,junctionRevision:path.junctionRevision??null,
   junctionEnabled:path.junctionEnabled??false,visibleShoulders,assertionRequired:junctionRequired}};
}"""

FIXED_FRAME_JS = r"""() => {
 const R=ATLAS.renderer;R.engine.shadowMap.needsUpdate=true;
 R.scene.traverse(o=>{if(o.isLight&&o.shadow)o.shadow.needsUpdate=true;});
 ATLAS.renderOnce();return performance.now();
}"""

PROBE_JS = r"""family => {
 const A=ATLAS,R=A.renderer,g=R.engine.getContext(),ext=g.getExtension('EXT_disjoint_timer_query_webgl2');
 const P=globalThis.__foliageProbe={active:false,index:0,samples:[],gpuQueries:[],gpuResults:[],
  disjointEvents:[],lastTimestamp:null,lastRender:null,shadowCalls:0,shadowTriangles:0,
  resourceCounts:{},resourceTimes:{},resourcePhase:'setup',resourceEvents:[]};
 for(const method of ['compileShader','linkProgram','texImage2D','texSubImage2D','texStorage2D','bufferData','bufferSubData']){
  const original=g[method];g[method]=function(...args){
   const start=performance.now();try{return original.apply(this,args);}finally{
    P.resourceCounts[method]=(P.resourceCounts[method]||0)+1;
    P.resourceTimes[method]=(P.resourceTimes[method]||0)+performance.now()-start;
   }
  };
 }
 P.target=r=>family==='forest'?r.data.component==='forest-canopy'&&r.data.id.endsWith(':leaf'):
   /^kourindou:landscape:.*:leaf$/.test(r.data.id);
 P.drain=()=>{
  if(!ext)return;
  const disjoint=g.getParameter(ext.GPU_DISJOINT_EXT);
  if(disjoint)P.disjointEvents.push({at:performance.now(),pending:P.gpuQueries.length});
  const keep=[];for(const q of P.gpuQueries){
   if(disjoint){g.deleteQuery(q.query);continue;}
   if(!g.getQueryParameter(q.query,g.QUERY_RESULT_AVAILABLE)){keep.push(q);continue;}
   P.gpuResults.push({index:q.index,gpuElapsedMs:g.getQueryParameter(q.query,g.QUERY_RESULT)/1e6});
   g.deleteQuery(q.query);
  }P.gpuQueries=keep;
 };
 const shadow=R.engine.shadowMap.render;
 R.engine.shadowMap.render=function(...args){
  const b={...R.engine.info.render};try{return shadow.apply(this,args);}finally{
   if(P.active){P.shadowCalls+=Math.max(0,R.engine.info.render.calls-b.calls);
    P.shadowTriangles+=Math.max(0,R.engine.info.render.triangles-b.triangles);}
  }
 };
 const render=R.render;
 R.render=function(...args){
  if(!P.active)return render.apply(this,args);
  P.drain();const started=performance.now(),resourcesBefore={...P.resourceCounts},timesBefore={...P.resourceTimes};P.shadowCalls=0;P.shadowTriangles=0;
  let query=null;if(ext&&P.stage==='measure'&&P.gpuQueries.length<16){query=g.createQuery();g.beginQuery(ext.TIME_ELAPSED_EXT,query);}
  try{return render.apply(this,args);}finally{
   if(query){g.endQuery(ext.TIME_ELAPSED_EXT);P.gpuQueries.push({query,index:P.index});}
   const rendererCPUms=performance.now()-started,targets=R.records.filter(P.target),near=targets.filter(r=>r.wanted&&r.item?.mesh.visible&&r.level===0),
     far=targets.filter(r=>r.wanted&&r.item?.mesh.visible&&r.level===1),
     tri=r=>{const m=r.item.mesh,x=m.geometry;return(x.index?x.index.count:x.attributes.position.count)/3*(m.isInstancedMesh?m.count:1);},
     trees=rows=>rows.reduce((n,r)=>n+(r.item.mesh.isInstancedMesh?r.item.mesh.count:1),0),
     wanted=R.records.filter(r=>r.wanted&&r.item?.mesh.visible).sort((a,b)=>a.data.id.localeCompare(b.data.id));
   P.lastRender={rendererCPUms,submittedCPUms:R.stats.submittedCPUms,stats:{...R.stats},
    shadowCalls:P.shadowCalls,shadowTriangles:P.shadowTriangles,shadowRedrawn:P.shadowCalls>0,
    nearBuckets:near.length,farBuckets:far.length,nearTrees:trees(near),farTrees:trees(far),
    targetTriangles:[...near,...far].reduce((n,r)=>n+tri(r),0),
    sceneCalls:R.stats.calls-P.shadowCalls,sceneTriangles:R.stats.triangles-P.shadowTriangles,
    targetSignature:targets.map(r=>`${r.data.id}/${r.level}/${!!r.wanted}/${!!r.item?.mesh.visible}`).sort().join('|'),
    nonTargetSignature:wanted.filter(r=>!P.target(r)).map(r=>`${r.data.id}/${r.level}`).join('|'),
    camera:{eye:A.rig.eye.slice(),target:A.rig.target.slice(),fov:A.rig.fov},
    attributeBytes:R.residentBytes,geometries:R.engine.info.memory.geometries,
    textures:R.engine.info.memory.textures,programs:R.engine.info.programs?.length||0,
    sun:{castShadow:R.sun.castShadow,color:R.sun.color.toArray(),intensity:R.sun.intensity,
      position:R.sun.position.toArray(),target:R.sun.target.position.toArray(),
      shadowMapSize:R.sun.shadow.mapSize.toArray(),shadowTarget:R.sun.shadow.map?[R.sun.shadow.map.width,R.sun.shadow.map.height]:null},
    lighting:R.currentOptions.lighting,weather:R.currentOptions.weather,quality:R.quality,
    resourceCounts:Object.fromEntries(Object.entries(P.resourceCounts).map(([k,v])=>[k,v-(resourcesBefore[k]||0)])),
    resourceCPUms:Object.fromEntries(Object.entries(P.resourceTimes).map(([k,v])=>[k,v-(timesBefore[k]||0)])),
    contextLost:g.isContextLost(),contextEventCount:__foliageContextEvents.length};
  }
 };
 for(const method of ['finish','readPixels']){
  const original=g[method];g[method]=function(...args){
   if(P.active)throw Error('GPU synchronization during production profile: '+method);
   return original.apply(this,args);
  };
 }
 A.renderOnce=()=>{throw Error('Production profile cannot call renderOnce');};
 return {gpuTimerSupported:!!ext,driver:R.info().driver,
  instrumentation:'identical RAF/render/shadow wrappers; async GPU query where available; no measured synchronization'};
}"""


def require(value, message):
    if not value:
        raise AssertionError(message)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def pixels(a, b):
    with Image.open(io.BytesIO(a)) as ia, Image.open(io.BytesIO(b)) as ib:
        aa, bb = ia.convert('RGB'), ib.convert('RGB')
        require(aa.size == bb.size, 'Image dimensions differ')
        diff = ImageChops.difference(aa, bb)
        values = list(diff.getdata())
        return dict(changedPixels=sum(any(p) for p in values),
                    maxChannelDifference=max(max(p) for p in values),
                    meanAbsoluteDifference=sum(sum(p) for p in values)/(aa.width*aa.height*3))


def distribution(values):
    values = sorted(x for x in values if x is not None)
    if not values:
        return dict(count=0)
    quantile = lambda q: values[min(len(values)-1, math.ceil(len(values)*q)-1)]
    return dict(count=len(values), min=values[0], median=quantile(.5),
                p95=quantile(.95), max=values[-1], mean=sum(values)/len(values))


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def validate_build(dist):
    raw = (dist/'release.json').read_bytes()
    release = json.loads(raw)
    artifact = dist/release['artifact']
    require(digest(artifact) == release['sha256'], 'Artifact SHA mismatch')
    for name, sha in release['inputs'].items():
        require(digest(dist.parent/name) == sha, 'Stale input: '+name)
    return release, artifact, hashlib.sha256(raw).hexdigest()


def launch_page(pw, args, url, session):
    browser = pw.chromium.launch(executable_path=args.chromium, headless=not args.headed,
        args=['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--disable-dev-shm-usage'])
    page = browser.new_page(viewport=dict(width=1280, height=720), device_scale_factor=1)
    page.set_default_timeout(120000)
    page.on('pageerror', lambda e: session['errors'].append(str(e)))
    page.on('crash', lambda *_: session['errors'].append('Chromium page crashed'))
    page.on('console', lambda m: session['resourceErrors' if 'Failed to load resource' in m.text else 'errors'].append(m.text) if m.type=='error' else None)
    page.add_init_script(INIT_JS)
    page.goto(url, wait_until='load')
    page.wait_for_function('globalThis.ATLAS||globalThis.ATLAS_BOOT_ERROR')
    require(not page.evaluate('globalThis.ATLAS_BOOT_ERROR||null'), 'Atlas boot failed')
    session['browser'] = browser.version
    session['driver'] = page.evaluate('ATLAS.renderer.info().driver')
    session['extensions'] = page.evaluate('ATLAS.renderer.engine.getContext().getSupportedExtensions()')
    session['gpuTimerSupported'] = 'EXT_disjoint_timer_query_webgl2' in session['extensions']
    page.evaluate('x=>{const o=x.options;globalThis.__foliageFamily=x.family;globalThis.__foliageOptions=o;Object.assign(ATLAS.state,o);ATLAS.renderer.setQuality(o.quality);document.body.classList.add("ui-hidden");ATLAS.state.uiHidden=true;}',dict(options=OPTIONS,family=args.family))
    if args.comparison_scope=='village-production':
        page.evaluate('globalThis.__villageEvidence=true')
    if args.experiment_root:
        for filename in args.experiment_files:
            page.evaluate((args.experiment_root/filename).read_text())
        if args.family=='kourindou':
            page.evaluate('globalThis.FOLIAGE_AB=GA.KOURINDOU_FOLIAGE_TEXTURE.install(ATLAS.renderer)')
    return browser, page


def set_options(page, options):
    page.evaluate('o=>{Object.assign(ATLAS.state,o);ATLAS.renderer.setQuality(o.quality);ATLAS.state.labels=false;ATLAS.state.characters=false;}', options)


def visit(page, spec, options, village=False):
    page.evaluate(VILLAGE_VISIT_JS if village else 'v=>ATLAS.setView(v,false)', spec['view'])
    page.wait_for_function('!ATLAS.stream.pending&&[...ATLAS.stream.required].every(id=>ATLAS.stream.cache.has(id))', polling=200)
    if village:
        page.evaluate('globalThis.__villageReadyAtMs=performance.now()')
    set_options(page, options)
    if 'camera' in spec:
        page.evaluate('p=>{ATLAS.rig.fov=p.fov;ATLAS.rig.setView({...p,space:ATLAS.state.space},false);ATLAS.rig.updateMatrices();}', spec['camera'])
    if 'route' in spec:
        page.evaluate(r'''s=>{
         const p=GA.FOREST.paths.find(p=>p.id===s.route),i=Math.floor((p.samples.length-1)*s.fraction),
           a=p.samples[i],b=p.samples[Math.min(i+3,p.samples.length-1)],
           y=ATLAS.world.terrain.height(...a),by=ATLAS.world.terrain.height(...b);
         ATLAS.rig.fov=60;ATLAS.rig.setView({space:'surface',eye:[a[0],y+7,a[1]],
          target:[b[0],by+2,b[1]]},false);ATLAS.rig.updateMatrices();
        }''', spec)
    if village:
        page.evaluate('globalThis.__villageWarmStartAtMs=performance.now()')
    for _ in range(3):
        page.evaluate(FIXED_FRAME_JS)
    if village:
        page.evaluate('globalThis.__villageWarmEndAtMs=performance.now()')


def compare_village_inputs(reference, current, before_project, after_project, before_fixture, after_fixture):
    before=reference['buildInputs'];after=current['buildInputs']
    changed={k for k in set(before)|set(after) if before.get(k)!=after.get(k)}
    allowed=VILLAGE_RUNTIME_INPUTS|VILLAGE_REGISTRATION_INPUTS
    protected_source={k for k in set(before)|set(after)
                      if k.startswith(('src/','data/','assets/','vendor/')) and k not in VILLAGE_RUNTIME_INPUTS}
    expected=json.loads(json.dumps(before_project))
    builder='src/village-upgrade.js';renderer='src/village-renderer.js'
    if builder not in expected['worldBuilders']:expected['worldBuilders'].append(builder)
    if renderer not in expected['extensionRenderers']:
        expected['extensionRenderers'].insert(expected['extensionRenderers'].index('src/forest-renderer.js')+1,renderer)
    def fixture_other_regions(fixture):
        result=json.loads(json.dumps(fixture))
        result['regions'].pop('village',None)
        result.get('reviewedUpstreamChanges',{}).pop('village',None)
        return result
    checks=dict(onlyApprovedInputsChanged=changed<=allowed,
                originalInputNamesRetained=set(before)<=set(after),
                allOtherProductionSourceSHAEqual=bool(protected_source) and not changed&protected_source,
                twoVillageRuntimeInputsPresent=VILLAGE_RUNTIME_INPUTS<=set(after),
                exactProjectRegistration=expected==after_project and
                    after_project['worldBuilders'].count(builder)==1 and after_project['worldBuilders'][-1]==builder and
                    after_project['extensionRenderers'].count(renderer)==1,
                otherHakureiFixtureRegionsEqual=bool(before_fixture.get('regions')) and
                    set(before_fixture['regions'])==set(after_fixture.get('regions',{})) and
                    fixture_other_regions(before_fixture)==fixture_other_regions(after_fixture))
    return dict(checks=checks,actualChangedInputs=sorted(changed),unexpectedChangedInputs=sorted(changed-allowed),
                protectedProductionInputCount=len(protected_source),allowedRuntimeInputs=sorted(VILLAGE_RUNTIME_INPUTS),
                allowedRegistrationInputs=sorted(VILLAGE_REGISTRATION_INPUTS),
                changeManifestIncludedInBuildInputs=False)


def compare_village_reference_inputs(manifest, current_report):
    runtime=manifest.get('referenceRuntimeInputs')
    runtime=runtime if isinstance(runtime,dict) else {}
    sha=current_report.get('sha256');inputs=current_report.get('buildInputs')
    checks=dict(independentChromiumReferenceVerified=manifest.get('independentChromiumReferenceVerified') is True,
                browserUseUnblocked=manifest.get('browserUseBlocked') is False,
                candidateArtifactSHAEqual=isinstance(sha,str) and len(sha)==64 and
                    manifest.get('candidateArtifactSHA256')==sha,
                candidateBuildInputsEqual=isinstance(inputs,dict) and bool(inputs) and
                    runtime.get('candidateBuildInputs')==inputs)
    return dict(checks=checks,referenceChromiumVersion=manifest.get('referenceChromiumVersion'),
                candidateArtifactSHA256=manifest.get('candidateArtifactSHA256'),
                referenceBuildInputCount=len(runtime['candidateBuildInputs'])
                    if isinstance(runtime.get('candidateBuildInputs'),dict) else None)


def compare_village_reference_binding(manifest, current_report, baseline_capture, current_capture):
    result=compare_village_reference_inputs(manifest,current_report)
    version=manifest.get('referenceChromiumVersion')
    result['checks'].update(referenceChromiumMatchesCandidate=isinstance(version,str) and bool(version) and
                              version==current_capture.get('browser'),
                           referenceChromiumMatchesBaseline=isinstance(version,str) and bool(version) and
                              version==baseline_capture.get('browser'))
    result.update(candidateChromiumVersion=current_capture.get('browser'),
                  baselineChromiumVersion=baseline_capture.get('browser'))
    return result


def compare_village_sources(reference, current, manifest, base, now):
    require(manifest.get('schema')=='village-production-v1', 'Unknown village manifest schema')
    require(reference.get('villageCompleteMetadata') and current.get('villageCompleteMetadata'),
            'Village baseline/candidate need complete metadata and near replay hashes')
    before={r['id']:r for r in reference['records']}
    after={r['id']:r for r in current['records']}
    require(len(before)==len(reference['records']) and len(after)==len(current['records']), 'Duplicate village source ID')
    changed={r['id']:r for r in manifest['changedRecords']}
    added={r['id']:r for r in manifest['addedRecords']}
    require(len(changed)==len(manifest['changedRecords']) and len(added)==len(manifest['addedRecords']),
            'Duplicate village manifest ID')
    require(not set(changed)&set(added), 'Village manifest ID sets overlap')
    require(set(manifest['preservedOverviewIds'])==VILLAGE_OVERVIEW_IDS,
            'Village manifest must preserve the exact eight overview records')
    require(0<len(added)<=24 and all(k.startswith('village:public:bridge-approach:') for k in added),
            'Village additions exceed the bounded bridge approach scope')
    require(all(r['metadata'].get('component')=='village-bridge-approach' and
                r['metadata'].get('owner')=='island' and r['metadata'].get('region')=='island' and
                r['metadata'].get('space')=='surface' and r['metadata'].get('globalSurface') is True and
                r['metadata'].get('group')=='architecture' and r['metadata'].get('material')=='villageStone'
                for r in added.values()), 'Manifest adds an unrelated region/component')
    require(all(k in before and before[k]['owner']=='village' and not before[k]['overview'] and
                not before[k]['metadata'].get('legacyInstanceIdentity') and before[k]['group']!='water'
                for k in changed), 'Village manifest exempts a protected record')
    protected=(set(before)|set(after))-(set(changed)|set(added))
    differences=[k for k in sorted(protected) if before.get(k)!=after.get(k)]
    violations=[]
    missing=object()
    for key,rule in changed.items():
        if key not in after:
            violations.append(key+': missing candidate');continue
        a,b=before[key],after[key]
        meta=set(rule['allowedMetadataFields']);arrays=set(rule['allowedArrayFields'])
        require(meta<=VILLAGE_METADATA_FIELDS and arrays<=VILLAGE_ARRAY_FIELDS,
                'Village rule exempts protected layout/instance fields: '+key)
        expected=rule['candidateMetadata']
        require(set(expected)==meta, 'Village changed metadata needs exact values: '+key)
        for field in set(a['metadata'])|set(b['metadata']):
            if field in meta:
                if b['metadata'].get(field,missing)!=expected[field]:violations.append(key+': metadata '+field)
            elif a['metadata'].get(field,missing)!=b['metadata'].get(field,missing):
                violations.append(key+': protected metadata '+field)
        expected_arrays=rule['candidateArrays']
        require(set(expected_arrays)==arrays, 'Village changed arrays need exact SHA descriptors: '+key)
        for field in set(a['arrays'])|set(b['arrays']):
            if field in arrays:
                if b['arrays'].get(field,missing)!=expected_arrays[field]:violations.append(key+': array '+field)
            elif a['arrays'].get(field,missing)!=b['arrays'].get(field,missing):
                violations.append(key+': protected array '+field)
        if not a.get('nearReplay') or a['nearReplay']!=b.get('nearReplay'):
            violations.append(key+': near triangle replay differs')
    added_violations=[k for k,r in added.items() if k not in after or
                      after[k]['metadata']!=r['metadata'] or after[k]['arrays']!=r['arrays']]
    public_triangles=sum((r['arrays']['index']['length']/3 if r['arrays'].get('index') else
                          r['arrays']['vertices']['length']/27) for r in added.values())
    public_array_bytes=sum(a['bytes'] for r in added.values() for a in r['arrays'].values())
    lod_allowed={k for k,r in changed.items() if r.get('allowedVisibleLODChange') is True}
    require(all(before[k]['lod'] in ('near','props') for k in lod_allowed),
            'Village LOD exemption extends beyond micro/prop records')
    visible=lambda frame:[(r['id'],None if r['id'] in lod_allowed else r['level'])
                          for r in frame['wanted'] if r['id'] not in added]
    old_ids=set(before)
    instances=all(before[k]['arrays'].get(field)==after.get(k,{}).get('arrays',{}).get(field)
                  for k in old_ids for field in ('instances','instanceColors'))
    state=now['villageProduction']
    approach_ids={r['id'] for r in state['approaches']}
    visible_approaches=[r for r in state['approaches'] if r['wanted'] and r['visible']]
    # The exact representation/terrain combinations live in the reviewed
    # manifest. Only six physical bridge ends may be visible simultaneously.
    endpoints=[]
    for row in visible_approaches:
        definition=added.get(row['id'],{})
        endpoints.append((definition.get('bridgeZ'),definition.get('bridgeSide')))
    require(all(r.get('bridgeZ') in (-158,32,164) and r.get('bridgeSide') in (-1,1)
                for r in added.values()), 'Village approach endpoint metadata missing')
    materials_before={r['id']:r for r in base['villageProduction']['materials']}
    materials_after={r['id']:r for r in state['materials']}
    # Road mouth shaders may change only the native village public route rows;
    # source fields and arrays still remain in the fully protected set.
    require(all(k in before and before[k]['metadata'].get('globalSurface') is True and
                before[k]['metadata'].get('component')=='connection-road' and
                before[k]['metadata'].get('pathOwner')=='village'
                for k in manifest.get('renderMaterialChanges',[])), 'Village shader exemption is not a native village road')
    render_materials=manifest.get('candidateRenderMaterials',{})
    require(set(render_materials)==set(manifest.get('renderMaterialChanges',[])) and
            all(v==('villageShoulder' if k.endswith(':shoulder') else 'villageRoad')
                for k,v in render_materials.items()), 'Village road shader manifest needs exact materials')
    material_violations=[]
    for key in (set(materials_before)|set(materials_after))-set(added):
        a,b=materials_before.get(key),materials_after.get(key)
        if not a or not b:
            material_violations.append(key+': visible material row missing');continue
        for field in set(a)|set(b):
            if field=='level' and key in lod_allowed:continue
            if field=='sourceMaterial' and key in changed:continue
            if field=='actualMaterial':
                if key in render_materials:
                    if b[field]!=render_materials[key]:material_violations.append(key+': actual road material differs')
                    continue
                if key in changed and after[key]['metadata'].get('material') in ('villageSurface','villagePaving'):
                    if b[field]!=after[key]['metadata']['material']:
                        material_violations.append(key+': actual village finish material differs')
                    continue
            if a.get(field,missing)!=b.get(field,missing):material_violations.append(key+': '+field)
    checks=dict(originalSourceIdsRetained=old_ids<=set(after),
                addedIdsEqual=set(after)-old_ids==set(added),
                protectedSourceEqual=bool(protected) and not differences,
                changedFieldsConstrained=not violations,
                addedSourcesMatchManifest=not added_violations,
                allOriginalInstancesEqual=instances,
                preservedOverviewEqual=VILLAGE_OVERVIEW_IDS<=old_ids and
                    all(before[k]==after.get(k) for k in VILLAGE_OVERVIEW_IDS),
                layoutEqual=base['villageProduction']['layout']==state['layout'],
                protectedWantedEqual=visible(base)==visible(now),
                protectedMaterialsEqual=not material_violations,
                approachIdsEqual=approach_ids==set(added),
                approachesTerrainBound=all(r['bindingValid'] and r['precisionMatches'] for r in state['approaches']),
                visibleApproachMaterial=all(r['actualMaterial']=='villageStone' for r in visible_approaches),
                sixPhysicalBridgeEndsMaximum=len(visible_approaches)<=6 and len(set(endpoints))==len(endpoints),
                publicSourceBudget=public_triangles<=1000 and public_array_bytes<=100*1024,
                visibleWorkerFinishAttributes=all(r['finishCorrect'] for r in state['detail']),
                requiredPacksEqual=reference['streaming']['required']==current['streaming']['required'])
    return dict(checks=checks,protectedRecordCount=len(protected),changedRecordCount=len(changed),
                addedRecordCount=len(added),unexpectedSourceDifferences=differences,
                changedFieldViolations=violations,addedSourceViolations=added_violations,
                visibleMaterialViolations=material_violations,
                allowedVisibleLODChangeIds=sorted(lod_allowed),visibleApproachCount=len(visible_approaches),
                publicSourceTriangles=public_triangles,publicArrayViewBytes=public_array_bytes,
                allNearReplayHashesEqual=not any('near triangle replay differs' in s for s in violations))


def compare_housing_sources(reference, current, manifest):
    before={r['id']:r for r in reference['records']}
    after={r['id']:r for r in current['records']}
    removed=set(manifest['removedOriginalIds'])
    added=set(manifest['addedCandidateIds'])
    changed=set(manifest['changedSourceIds'])
    require(not (removed & added or removed & changed or added & changed), 'Housing change ID sets overlap')
    require(not any(':trees:' in k or k.startswith('kourindou:landscape:') or k.startswith('shrine:')
                    for k in removed|added|changed), 'Housing manifest exempts protected vegetation/shrine')
    protected=(set(before)|set(after))-(removed|added|changed)
    differences=[k for k in sorted(protected) if before.get(k)!=after.get(k)]
    trees=[k for k in sorted(before) if k.startswith('forest:trees:')]
    checks=dict(removedIdsEqual=set(before)-set(after)==removed,
                addedIdsEqual=set(after)-set(before)==added,
                changedIdsPresentEqual=changed<=set(before)&set(after),
                protectedSourceEqual=bool(protected) and not differences,
                originalTreeSourceEqual=bool(trees) and all(before[k]==after.get(k) for k in trees),
                requiredPacksEqual=reference['streaming']['required']==current['streaming']['required'])
    return dict(**checks,protectedRecordCount=len(protected),originalTreeRecordCount=len(trees),
                unexpectedSourceDifferences=differences,actualRemovedIds=sorted(set(before)-set(after)),
                actualAddedIds=sorted(set(after)-set(before)))


def forest_path_junction_ready(state):
    return (state.get('revision')==3 and state.get('junctionRevision')==1 and
            state.get('junctionEnabled') is True and len(state.get('publicRoads',[]))==8)


def compare_forest_path_visibility(reference, current, base, now):
    before={r['id']:r for r in reference['records']}
    after={r['id']:r for r in current['records']}
    legacy='forest:paths'
    public=lambda k:k.startswith('island:routes:forest:')
    roads={k for k in before if public(k)}
    boardwalk={k for k,r in before.items() if r['component']=='forest-boardwalk'}
    state=now['forestPathVisibility'];record=state['legacy']
    visible=lambda frame,ids:[r for r in frame['wanted'] if r['id'] in ids]
    differences=[k for k in sorted(set(before)|set(after)) if before.get(k)!=after.get(k)]
    branch_ids={'forest-entry','forest-alice','forest-marisa','forest-loop',
                'forest-mushroom','forest-oak','forest-boardwalk'}
    checks=dict(sourceRecordsEqual=bool(before) and not differences,
                sourceRecordIdsEqual=set(before)==set(after),
                legacySourceRetained=legacy in before and before[legacy]==after.get(legacy),
                legacyWasVisible=any(r['id']==legacy for r in base['wanted']),
                legacyHidden=bool(record) and not record['wanted'] and not record['visible'],
                legacyCoverageGuardActive=state['legacyPathCovered'] is True and set(state['coverageIds'])==roads,
                junctionMaskReady=forest_path_junction_ready(state),
                protectedWantedEqual=[r for r in base['wanted'] if r['id']!=legacy]==now['wanted'],
                publicRoadIdsEqual=len(roads)==8 and roads=={k for k in after if public(k)},
                publicRoadLODEqual=visible(base,roads)==visible(now,roads),
                publicBoardwalkIdsEqual=len(boardwalk)==11 and boardwalk=={k for k,r in after.items() if r['component']=='forest-boardwalk'},
                publicBoardwalkLODEqual=visible(base,boardwalk)==visible(now,boardwalk),
                sevenPublicBranchesPresent=len(state['branches'])==7 and {p['id'] for p in state['branches']}==branch_ids and
                    all(p['pointsMatch'] and p['samplesMatch'] and p['samples']>=2 for p in state['branches']),
                requiredPacksEqual=reference['streaming']['required']==current['streaming']['required'])
    return dict(checks=checks,protectedRecordCount=len(before),
                unexpectedSourceDifferences=differences,allowedHiddenIds=[legacy],
                publicRoadIds=sorted(roads),publicBoardwalkIds=sorted(boardwalk))


def capture_forest_path_reentry(page, item, save, reference):
    result=dict(passed=False,productionRAF=True,manualDraws=False,nightTest=False,
                contextRecoveryTest=False,states=[],checks=[])
    item['forestPathReentry']=result;save()
    def check(name,value,data=None):
        result['checks'].append(dict(name=name,passed=bool(value),data=data));save()
        require(value,name)
    def view(name):
        before=page.evaluate('v=>{const n=ATLAS.state.drawnFrames;ATLAS.setView(v,false);ATLAS.state.labels=false;ATLAS.state.characters=false;return n;}',name)
        page.wait_for_function('p=>ATLAS.state.drawnFrames>p.before&&ATLAS.renderer.currentOptions.view===p.view&&!ATLAS.rig.transition&&!ATLAS.stream.pending&&[...ATLAS.stream.required].every(id=>ATLAS.stream.cache.has(id))',arg=dict(before=before,view=name))
    def state(name):
        s=page.evaluate(SNAPSHOT_JS);result['states'].append(dict(phase=name,**s));save()
        require(not s['contextLost'] and not s['contextEvents'] and not item['errors'],'Reentry WebGL/JavaScript failure')
        require(all(p['precisionMatches'] for p in s['boardwalkTerrainSelections']),'Reentry boardwalk and terrain precision differ')
        check(name+' keeps eight public roads and the junction mask enabled',forest_path_junction_ready(s['forestPathVisibility']),
              {k:s['forestPathVisibility'][k] for k in ['revision','junctionRevision','junctionEnabled']})
        return s
    def ui(visible):
        page.evaluate('v=>{ATLAS.state.uiHidden=!v;document.body.classList.toggle("ui-hidden",!v)}',visible)
    page.evaluate('globalThis.ATLAS_TEST_PAUSE=false;ATLAS.wake()')
    view('forest');before=state('native forest before cache drop')
    initial=page.evaluate(SOURCE_INTEGRITY_JS)
    check('Native forest retains every selected-view source hash',initial['records']==reference['records'])
    legacy=before['forestPathVisibility']['legacy']
    check('Legacy path hidden before drop',legacy and not legacy['wanted'] and not legacy['visible'])
    page.evaluate('globalThis.__forestPathReentryArray=ATLAS.renderer.recordMap.get("forest:paths").data.vertices')
    view('diorama');ui(True);page.locator('#btn-settings').click()
    n=page.evaluate('ATLAS.state.drawnFrames');page.locator('#btn-clear-cache').click();page.locator('#close-settings').click();ui(False)
    page.wait_for_function('n=>ATLAS.state.drawnFrames>n&&!ATLAS.stream.cache.has("forest")&&!ATLAS.renderer.packs.has("forest")',arg=n)
    dropped=state('native clear-cache dropped forest detail')
    cleaned=page.evaluate('()=>({sourceRemoved:!ATLAS.renderer.recordMap.has("forest:paths"),weakMapCleared:!ATLAS.renderer.forestPathArrays.has(__forestPathReentryArray)})')
    road_ids={r['id'] for r in before['forestPathVisibility']['publicRoads']}
    boardwalk_ids={r['boardwalk']['id'] for r in before['boardwalkTerrainSelections']}
    check('Drop removes only detail ownership, public roads and boardwalk retained',cleaned['sourceRemoved'] and cleaned['weakMapCleared'] and
          {r['id'] for r in dropped['forestPathVisibility']['publicRoads']}==road_ids and
          {r['boardwalk']['id'] for r in dropped['boardwalkTerrainSelections']}==boardwalk_ids,cleaned)
    view('forest');after=state('native forest reentry')
    restored=page.evaluate(SOURCE_INTEGRITY_JS)
    check('Reentry preserves all source records and typed-array hashes',initial['records']==restored['records'])
    legacy=after['forestPathVisibility']['legacy']
    check('Legacy path remains hidden after reentry',legacy and not legacy['wanted'] and not legacy['visible'] and after['forestPathVisibility']['legacyPathCovered'])
    public_ids=road_ids|boardwalk_ids
    check('Public-road and boardwalk visibility/LOD restored',
          [r for r in before['wanted'] if r['id'] in public_ids]==[r for r in after['wanted'] if r['id'] in public_ids])
    page.evaluate('delete globalThis.__forestPathReentryArray')
    result['passed']=True;save()


def capture_visuals(pw, args, url, report, save):
    lookup = {s['name']: s for s in SPECS}
    selected = args.specs.split(',') if args.specs else [s['name'] for s in SPECS]
    require(all(name in lookup for name in selected), 'Unknown capture spec')
    compare = json.loads((args.compare_to/'report.json').read_text()) if args.compare_to else None
    source_reference=json.loads(args.source_reference.read_text()) if args.source_reference else None
    manifest=json.loads(args.change_manifest.read_text()) if args.change_manifest else None
    if args.comparison_scope=='housing':
        require(compare and source_reference and manifest, 'Housing comparison needs screenshots, source reference, and exact change manifest')
        require(not args.experiment_root, 'Housing validation uses production trees without foliage injection')
    if args.comparison_scope=='forest-path-visibility':
        require(compare and args.family=='forest' and args.modes=='original' and not args.experiment_root,
                'Forest-path visibility comparison requires an original forest baseline and production scene')
        require(not args.source_only and not args.source_reference and not args.change_manifest,
                'Forest-path visibility hashes every source against its matching screenshot baseline')
        require(set(selected)<={'forestAliceConnection','forestMarisaConnection','forestEntryConnection','forestMarisaConnectionLow'},
                'Forest-path visibility scope is limited to the four established connection views')
    if args.comparison_scope=='village-production':
        require(args.modes=='original' and not args.experiment_root and not args.source_reference,
                'Village validation uses native production sources without foliage injection')
        require(set(selected)<=VILLAGE_SPECS, 'Village scope is limited to the approved village views')
        require(not args.source_only, 'Village strict baseline includes matching fixed screenshots')
        require(bool(compare)==bool(manifest), 'Village candidate needs a screenshot baseline and exact field manifest')
        if compare:
            report['villageReferenceInputs']=compare_village_reference_inputs(manifest,report);save()
            require(all(report['villageReferenceInputs']['checks'].values()),
                    'Village independent Chromium reference is blocked or bound to another candidate build')
            baseline_dist=Path(compare['artifact']).resolve().parent
            baseline_release,_,baseline_release_sha=validate_build(baseline_dist)
            require(baseline_release_sha==compare['releaseSha256'] and baseline_release['sha256']==compare['sha256'],
                    'Village baseline frozen build differs from its saved report')
            baseline_root=baseline_dist.parent;candidate_root=args.dist.parent
            read_json=lambda root,name:json.loads((root/name).read_text())
            report['villageBuildInputs']=compare_village_inputs(compare,report,
                read_json(baseline_root,'project.json'),read_json(candidate_root,'project.json'),
                read_json(baseline_root,'tools/hakurei-baseline.json'),read_json(candidate_root,'tools/hakurei-baseline.json'))
            save()
            require(all(report['villageBuildInputs']['checks'].values()), 'Village candidate changes protected build inputs/project/other regions')
    if source_reference:
        reference_source=next(c['sourceIntegrity'] for c in source_reference['captures'] if c.get('sourceIntegrity'))
    if args.housing_smoke:
        require(args.family=='forest' and not args.experiment_root, 'Housing smoke requires original production forest')
    reentry_done=False
    for name in selected:
        spec=lookup[name]
        for mode in args.modes.split(','):
            require(mode in ('original','texture'), 'Unknown A/B mode')
            require(mode=='original' or args.experiment_root, 'Texture mode requires experimental scripts')
            item = dict(name=name, mode=mode, spec=spec, errors=[], resourceErrors=[], frames=[])
            report['captures'].append(item); save()
            print('CAPTURE', name, mode, flush=True)
            browser=None;page=None
            try:
                browser, page=launch_page(pw,args,url,item)
                if compare and args.comparison_scope=='village-production':
                    previous=next(c for c in compare['captures'] if c['name']==name and c['mode']=='original')
                    item['villageReferenceBinding']=compare_village_reference_binding(manifest,report,previous,item);save()
                    require(all(item['villageReferenceBinding']['checks'].values()),
                            'Village reference Chromium differs from the current browser or matching baseline capture')
                if args.experiment_root and args.family=='kourindou':
                    page.evaluate('mode=>FOLIAGE_AB.setMode(mode)',mode)
                options={**OPTIONS,**spec.get('options',{})}
                visit(page,spec,options,village=args.comparison_scope=='village-production')
                if args.experiment_root and args.family=='forest':
                    page.evaluate('globalThis.FOLIAGE_AB=GA.FOREST_FOLIAGE_TEXTURE.install(ATLAS.renderer)')
                    page.evaluate('mode=>FOLIAGE_AB.setMode(mode)',mode)
                    for _ in range(3):page.evaluate(FIXED_FRAME_JS)
                if args.source_only or args.source_reference or args.comparison_scope in ('forest-path-visibility','village-production'):
                    if args.comparison_scope=='village-production':
                        page.evaluate('globalThis.__villageAuditStartAtMs=performance.now()')
                    item['sourceIntegrity']=page.evaluate(SOURCE_INTEGRITY_JS);save()
                    if args.comparison_scope=='village-production':
                        page.evaluate('globalThis.__villageAuditEndAtMs=performance.now()')
                        item['villageProduction']=page.evaluate(VILLAGE_SNAPSHOT_JS);save()
                if args.source_only:
                    item['state']=page.evaluate(SNAPSHOT_JS)
                    require(not item['errors'] and not item['state']['contextLost'], 'Source reference WebGL failed')
                    item['passed']=True;save()
                    print('PASS SOURCE',name,len(item['sourceIntegrity']['records']),flush=True)
                    continue
                if spec.get('day_return'):
                    initial=page.locator('#scene').screenshot()
                    set_options(page,{**options,'lighting':'night','weather':'rain'})
                    for _ in range(3):page.evaluate(FIXED_FRAME_JS)
                    item['nightBeforeReturn']=page.evaluate(SNAPSHOT_JS)
                    visit(page,dict(view='windEntry'),{**options,'lighting':'night','weather':'rain'})
                    item['cave']=page.evaluate(SNAPSHOT_JS)
                    visit(page,spec,options)
                images=[]
                for frame in range(3):
                    page.evaluate(FIXED_FRAME_JS)
                    state=page.evaluate(SNAPSHOT_JS)
                    if args.comparison_scope=='village-production':
                        state['villageProduction']=page.evaluate(VILLAGE_SNAPSHOT_JS)
                        require(all(r['precisionMatches'] for r in state['villageProduction']['approaches']),
                                'Visible village bridge approach and terrain precision differ')
                    require(state['renderedView']==spec['view'] and state['options']==options,'Rendered frame differs from fixed configuration')
                    require(state['wanted'] and state['stats']['totalTriangles']>0,'No scene geometry')
                    require(not state['contextLost'] and not state['contextEvents'],'WebGL context event')
                    require(all(p['precisionMatches'] for p in state['boardwalkTerrainSelections']), 'Visible boardwalk and terrain precision differ')
                    if args.housing_smoke and frame==0:
                        item['housingSmoke']=page.evaluate(HOUSING_SMOKE_JS);save()
                        require(item['housingSmoke']['passed'], 'Housing production integration smoke failed')
                    if args.experiment_root:
                        require(page.evaluate('FOLIAGE_AB.ready()'), 'A/B not ready after actual render')
                    filename=f'{name}-{mode}-frame-{frame+1}.png'
                    data=page.locator('#scene').screenshot(path=str(args.output/filename));images.append(data)
                    with Image.open(io.BytesIO(data)) as image:
                        require(len(image.convert('RGB').getcolors(image.width*image.height) or [])>256,'Blank or insufficiently rendered screenshot')
                    item['frames'].append(dict(file=filename,sha256=hashlib.sha256(data).hexdigest(),**state));save()
                item['stability']=[pixels(images[0],data) for data in images[1:]]
                require(all(p['changedPixels']==0 for p in item['stability']), 'Fixed frames not stable')
                if spec.get('day_return'):
                    item['dayReturnPixels']=pixels(initial,images[0])
                    require(item['dayReturnPixels']['changedPixels']==0, 'Day/night/cave/day pixels not restored')
                if compare:
                    prev=next(c for c in compare['captures'] if c['name']==name and c['mode']=='original')
                    base=prev['frames'][0];now=item['frames'][0]
                    target=lambda r:(r['id'].startswith('forest:trees:') if args.family=='forest' else r['id'].startswith('kourindou:landscape:')) and r['id'].endswith(':leaf')
                    baseline_targets=[r for r in base['wanted'] if target(r)] if args.family=='forest' and compare.get('targetFamily','kourindou')!='forest' else base['targets']
                    current_targets=now['targets']
                    if args.family=='forest' and compare.get('targetFamily','kourindou')!='forest':
                        target_lod_equal=[(r['id'],r['level']) for r in baseline_targets]==[(r['id'],r['level']) for r in current_targets if r['wanted'] and r['visible']]
                    else:
                        target_lod_equal=[(r['id'],r['level'],r['wanted'],r['visible']) for r in baseline_targets]==[(r['id'],r['level'],r['wanted'],r['visible']) for r in current_targets]
                    item['comparison']=dict(baselineSHA=compare['sha256'],cameraEqual=base['camera']==now['camera'],
                      scope=args.comparison_scope,
                      baselineFile=str(args.compare_to/base['file']),
                      optionsEqual=base['options']==now['options'],lightsEqual=base['lights']==now['lights'],
                      sceneEqual=base['scene']==now['scene'],
                      nonTargetWantedEqual=[r for r in base['wanted'] if not target(r)]==[r for r in now['wanted'] if not target(r)],
                      targetLODEqual=target_lod_equal,
                      pixels=pixels((args.compare_to/base['file']).read_bytes(),images[0]))
                    if args.comparison_scope=='housing':
                        item['comparison']['sourceIntegrity']=compare_housing_sources(reference_source,item['sourceIntegrity'],manifest)
                        allowed=set(manifest['removedOriginalIds'])|set(manifest['addedCandidateIds'])|set(manifest['changedSourceIds'])
                        item['comparison']['protectedWantedEqual']=[r for r in base['wanted'] if r['id'] not in allowed]==[r for r in now['wanted'] if r['id'] not in allowed]
                        controlled={k:v for k,v in item['comparison'].items() if k.endswith('Equal') and k!='nonTargetWantedEqual'}
                        controlled.update({k:v for k,v in item['comparison']['sourceIntegrity'].items() if k.endswith('Equal')})
                        require(all(controlled.values()), 'Uncontrolled housing scene/source difference')
                    elif args.comparison_scope=='forest-path-visibility':
                        require(prev.get('sourceIntegrity'), 'Forest-path baseline lacks complete source hashes')
                        item['comparison']['pathVisibility']=compare_forest_path_visibility(prev['sourceIntegrity'],item['sourceIntegrity'],base,now)
                        save()
                        controlled={k:v for k,v in item['comparison'].items() if k.endswith('Equal') and k!='nonTargetWantedEqual'}
                        controlled.update(item['comparison']['pathVisibility']['checks'])
                        require(all(controlled.values()), 'Uncontrolled forest-path visibility/source difference')
                    elif args.comparison_scope=='village-production':
                        require(prev.get('sourceIntegrity') and base.get('villageProduction'),
                                'Village screenshot baseline lacks strict source/layout evidence')
                        if manifest.get('baselineArtifactSHA256'):
                            require(manifest['baselineArtifactSHA256']==compare['sha256'], 'Village manifest baseline SHA differs')
                        item['comparison']['villageProduction']=compare_village_sources(
                            prev['sourceIntegrity'],item['sourceIntegrity'],manifest,base,now)
                        save()
                        controlled={k:v for k,v in item['comparison'].items() if k.endswith('Equal') and
                                    k not in ('nonTargetWantedEqual','targetLODEqual')}
                        controlled.update(item['comparison']['villageProduction']['checks'])
                        require(manifest.get('candidateVersion',0)>=2 and
                                now['villageProduction']['version']==manifest['candidateVersion'] and all(controlled.values()),
                                'Uncontrolled village production scene/source difference')
                    else:
                        require(all(value for key,value in item['comparison'].items() if key.endswith('Equal')), 'Uncontrolled A/B scene difference')
                    if args.comparison_scope=='foliage' and (mode=='original' or name.startswith('shrine')):
                        require(item['comparison']['pixels']['changedPixels']==0, 'Protected/original pixel output changed')
                require(not item['errors'], 'JavaScript/shader error: '+repr(item['errors']))
                if args.forest_path_reentry and not reentry_done:
                    capture_forest_path_reentry(page,item,save,item['sourceIntegrity']);reentry_done=True
                item['passed']=True;save()
                print('PASS',name,mode,item['frames'][0]['stats']['totalCalls'],item['frames'][0]['stats']['totalTriangles'],flush=True)
            except BaseException as exc:
                item['failure']=repr(exc);save()
                if page and not page.is_closed():
                    try:page.screenshot(path=str(args.output/f'{name}-{mode}-failure.png'),timeout=5000)
                    except Exception:pass
                raise
            finally:
                if browser:browser.close()
    if args.housing_smoke:
        observed={('near' if s['boardwalk']['globalNear'] else 'far')
                  for c in report['captures'] for f in c['frames']
                  for s in f['boardwalkTerrainSelections']
                  if s['boardwalk']['wanted'] and s['boardwalk']['visible']}
        report['housingSmokeBoardwalkPrecisionsObserved']=sorted(observed)
        if {'forestOverview','forestBoardwalk250','forestBoardwalk250Low'}<=set(selected):
            require(observed=={'near','far'}, 'Selected CI views did not show both boardwalk terrain precisions')
        save()


def contact_sheet(report, output):
    rows=[]
    for item in report['captures']:
        if item.get('passed') and item.get('frames'):
            if item.get('comparison',{}).get('baselineFile') and (item['mode']=='texture' or item['comparison'].get('scope') in ('housing','forest-path-visibility','village-production')):
                rows.append((item['name']+' / baseline original',Path(item['comparison']['baselineFile'])))
            label='housing candidate' if item.get('comparison',{}).get('scope')=='housing' else item['mode']
            if item.get('comparison',{}).get('scope')=='forest-path-visibility':label='legacy path hidden'
            if item.get('comparison',{}).get('scope')=='village-production':label='village candidate'
            rows.append((item['name']+' / '+label,output/item['frames'][0]['file']))
    if not rows:return
    cols=2;w,h=480,270
    sheet=Image.new('RGB',(cols*w,math.ceil(len(rows)/cols)*(h+28)),(25,29,32));draw=ImageDraw.Draw(sheet)
    for i,(label,path) in enumerate(rows):
        with Image.open(path) as im:thumb=im.convert('RGB').resize((w,h))
        x=(i%cols)*w;y=(i//cols)*(h+28);sheet.paste(thumb,(x,y+28));draw.text((x+8,y+7),label,fill=(230,232,235))
    sheet.save(output/'contact-sheet.jpg',quality=90)


def production_pose(page, pose):
    before=page.evaluate('ATLAS.state.drawnFrames')
    page.evaluate('p=>{ATLAS.rig.fov=p.fov;ATLAS.rig.setView({...p,space:ATLAS.state.space},false);ATLAS.rig.updateMatrices();ATLAS.wake();}',pose)
    page.wait_for_function('p=>ATLAS.state.drawnFrames>p.before&&!ATLAS.rig.transition&&ATLAS.renderer.camera.position.toArray().every((v,i)=>Math.abs(v-p.eye[i])<1e-7)',arg=dict(before=before,eye=pose['eye']))


def make_route(page, scenario, count):
    require(count>=8,'At least eight motion samples required')
    return page.evaluate(r'''s=>{
     const route=[];
     if(s.name==='kourindou-path'){
      for(let i=0;i<s.count;i++){const t=i/(s.count-1),x=-712+132*t,z=104-48*t;
       route.push({eye:[x,ATLAS.world.terrain.height(x,z)+30,z],target:[-557,54,-2],fov:49});}
     }else if(s.name==='kourindou-orbit'){
      for(let i=0;i<s.count;i++){const a=(i/(s.count-1)*.65+.2)*Math.PI;
       route.push({eye:[-557+88*Math.cos(a),75,0+88*Math.sin(a)],target:[-557,52,0],fov:49});}
     }else if(s.name==='forest-mixed-orbit'){
      for(let i=0;i<s.count;i++){const a=(i/(s.count-1)*.40+.30)*Math.PI;
       route.push({eye:[-1080+180*Math.cos(a),133,-56+180*Math.sin(a)],target:[-1080,78,-56],fov:57});}
     }else if(s.name==='forest-alice-road'||s.name==='forest-marisa-road'){
      const p=GA.FOREST.paths.find(p=>p.id===(s.name==='forest-alice-road'?'forest-alice':'forest-marisa'));
      for(let i=0;i<s.count;i++){const k=(p.samples.length-5)*i/(s.count-1),j=Math.floor(k),t=k-j,
       a=p.samples[j],b=p.samples[j+1],c=p.samples[Math.min(j+4,p.samples.length-1)],
       x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t,y=ATLAS.world.terrain.height(x,z),cy=ATLAS.world.terrain.height(...c);
       route.push({eye:[x,y+10,z],target:[c[0],cy+5,c[1]],fov:60});}
     }else throw Error('Unknown motion scenario '+s.name);
     return route;
    }''',dict(name=scenario,count=count))


def capture_performance(pw,args,url,report,save):
    require(args.experiment_root,'Production A/B requires experimental scripts')
    for scenario in args.scenarios.split(','):
        item=dict(scenario=scenario,family=args.family,abbaBlocks=args.abba_blocks,samplesPerRun=args.samples,
          errors=[],resourceErrors=[],runs=[],normalRAF=True,renderOnce=False,glFinish=False,
          notes='Per-frame intervals include Playwright pose delivery and production scheduling; CPU and software GPU observations are not hardware FPS.')
        report['performance'].append(item);save();browser=None;page=None
        try:
            browser,page=launch_page(pw,args,url,item)
            page.evaluate('ATLAS.setView("forest",false)')
            page.wait_for_function('!ATLAS.stream.pending&&[...ATLAS.stream.required].every(id=>ATLAS.stream.cache.has(id))',polling=200)
            set_options(page,OPTIONS)
            if args.family=='forest':
                page.evaluate('globalThis.FOLIAGE_AB=GA.FOREST_FOLIAGE_TEXTURE.install(ATLAS.renderer)')
            item['probe']=page.evaluate(PROBE_JS,args.family)
            page.evaluate('globalThis.ATLAS_TEST_PAUSE=false;ATLAS.wake()')
            route=make_route(page,scenario,args.samples);item['route']=route;save()
            production_pose(page,route[0])
            input_before=page.evaluate('()=>({frames:ATLAS.state.drawnFrames,eye:ATLAS.rig.eye.slice(),radius:ATLAS.rig.radius})')
            page.mouse.move(920,340);page.mouse.down();page.mouse.move(1000,370,steps=6);page.mouse.up()
            page.wait_for_function('b=>ATLAS.state.drawnFrames>b.frames&&ATLAS.rig.eye.some((v,i)=>Math.abs(v-b.eye[i])>1e-5)',arg=input_before)
            input_orbit=page.evaluate('()=>({frames:ATLAS.state.drawnFrames,eye:ATLAS.rig.eye.slice(),radius:ATLAS.rig.radius})')
            page.mouse.wheel(0,-110)
            page.wait_for_function('b=>ATLAS.state.drawnFrames>b.frames&&Math.abs(ATLAS.rig.radius-b.radius)>1e-5',arg=input_orbit)
            item['realInputCheck']=dict(before=input_before,afterOrbit=input_orbit,
                afterWheel=page.evaluate('()=>({frames:ATLAS.state.drawnFrames,eye:ATLAS.rig.eye.slice(),radius:ATLAS.rig.radius})'),
                renderOnce=False,passed=True)
            # Warm both shaders and replay the complete motion path. The measured
            # order then uses the same path and starting LOD history for each run.
            item['warmupStages']=[]
            for mode in ['original','texture','original']:
                page.evaluate('()=>{const P=__foliageProbe;P.active=false;P.samples=[];P.stage="warmup";P.lastTimestamp=null;}')
                page.evaluate('m=>FOLIAGE_AB.setMode(m)',mode)
                page.evaluate('__foliageProbe.active=true')
                for pose in route:production_pose(page,pose)
                page.evaluate('__foliageProbe.active=false')
                item['warmupStages'].append(dict(mode=mode,samples=page.evaluate('__foliageProbe.samples')));save()
            for block in range(args.abba_blocks):
                for slot,mode in enumerate(['original','texture','texture','original']):
                    print('PROFILE',scenario,block+1,slot+1,mode,flush=True)
                    page.evaluate('()=>{const P=__foliageProbe;P.active=false;P.drain();P.samples=[];P.stage="prewarm";P.lastTimestamp=null;}')
                    switch=page.evaluate('m=>{const start=performance.now();FOLIAGE_AB.setMode(m);return performance.now()-start;}',mode)
                    # Entire unmeasured replay avoids inferring equal LOD history
                    # from equal camera coordinates. The signatures are compared.
                    page.evaluate('__foliageProbe.active=true')
                    for pose in route:production_pose(page,pose)
                    production_pose(page,route[0])
                    page.evaluate('__foliageProbe.active=false')
                    prewarm=page.evaluate('__foliageProbe.samples')
                    require(page.evaluate('FOLIAGE_AB.ready()'),'A/B not ready for measured route')
                    before=page.evaluate(SNAPSHOT_JS)
                    page.evaluate('()=>{const P=__foliageProbe;P.samples=[];P.gpuResults=[];P.disjointEvents=[];P.lastTimestamp=null;P.stage="measure";P.active=true;}')
                    for index,pose in enumerate(route):
                        page.evaluate('i=>__foliageProbe.index=i',index)
                        production_pose(page,pose)
                    page.evaluate('__foliageProbe.active=false;ATLAS.renderer.engine.getContext().flush();__foliageProbe.drain()')
                    query_deadline=time.monotonic()+args.gpu_query_wait_seconds
                    for _ in range(math.ceil(args.gpu_query_wait_seconds/.05)):
                        if not page.evaluate('__foliageProbe.gpuQueries.length'):break
                        if time.monotonic()>=query_deadline:break
                        page.wait_for_timeout(50);page.evaluate('__foliageProbe.drain()')
                    raw=page.evaluate('()=>{const P=__foliageProbe;return{samples:P.samples,gpuResults:P.gpuResults,disjointEvents:P.disjointEvents,pendingGPUQueries:P.gpuQueries.length,glError:ATLAS.renderer.engine.getContext().getError()};}')
                    raw['gpuTimingComplete']=item['probe']['gpuTimerSupported'] and not raw['disjointEvents'] and not raw['pendingGPUQueries'] and len(raw['gpuResults'])==len(route)
                    raw['gpuQueryWaitBudgetSeconds']=args.gpu_query_wait_seconds
                    item['lastIncompleteRun']=dict(block=block+1,slot=slot+1,mode=mode,switchCPUms=switch,before=before,prewarm=prewarm,**raw);save()
                    require(len(raw['samples'])==len(route),'Unexpected measured frame count')
                    require([s['index'] for s in raw['samples']]==list(range(len(route))),'Motion sample index duplicated or skipped')
                    require(all(s['camera']['fov']==pose['fov'] and all(abs(x-y)<1e-7 for key in ['eye','target'] for x,y in zip(s['camera'][key],pose[key])) for s,pose in zip(raw['samples'],route)),'Measured camera differs from requested path')
                    require(all(not s['contextLost'] and not s['contextEventCount'] for s in raw['samples']),'Context event in production route')
                    if item['probe']['gpuTimerSupported']:
                        require(raw['gpuTimingComplete'],'GPU timer results missing at deadline or disjoint; inspect saved raw run')
                    run=dict(block=block+1,slot=slot+1,mode=mode,switchCPUms=switch,before=before,prewarm=prewarm,**raw)
                    run['distributions']={key:distribution([s[key] for s in raw['samples']]) for key in
                       ['callbackCPUms','rendererCPUms','submittedCPUms','frameIntervalMs','shadowCalls','shadowTriangles','targetTriangles','attributeBytes']}
                    run['distributions']['gpuElapsedMs']=distribution([s['gpuElapsedMs'] for s in raw['gpuResults']])
                    item['runs'].append(run);save()
                    del item['lastIncompleteRun'];save()
            comparisons=[]
            for block in range(args.abba_blocks):
                runs=[r for r in item['runs'] if r['block']==block+1]
                for base,candidate in [(runs[0],runs[1]),(runs[3],runs[2])]:
                    comp=dict(block=block+1,slots=[base['slot'],candidate['slot']],
                      cameraEqual=all(a['camera']==b['camera'] for a,b in zip(base['samples'],candidate['samples'])),
                      targetLODEqual=all(a['targetSignature']==b['targetSignature'] for a,b in zip(base['samples'],candidate['samples'])),
                      nonTargetLODEqual=all(a['nonTargetSignature']==b['nonTargetSignature'] for a,b in zip(base['samples'],candidate['samples'])),
                      shadowPatternEqual=all(a['shadowRedrawn']==b['shadowRedrawn'] for a,b in zip(base['samples'],candidate['samples'])),
                      lightingEqual=all(a['sun']==b['sun'] and a['lighting']==b['lighting'] and a['weather']==b['weather'] and a['quality']==b['quality'] for a,b in zip(base['samples'],candidate['samples'])))
                    comparisons.append(comp)
                    require(all(v for k,v in comp.items() if k.endswith('Equal')),'Uncontrolled A/B motion/LOD/shadow difference')
            item['comparisons']=comparisons
            item['summary']={mode:{key:distribution([s[key] for r in item['runs'] if r['mode']==mode for s in r['samples']])
              for key in ['callbackCPUms','rendererCPUms','submittedCPUms','frameIntervalMs','shadowCalls','shadowTriangles','sceneCalls','sceneTriangles','targetTriangles','nearBuckets','farBuckets','nearTrees','farTrees','attributeBytes']}
              for mode in ['original','texture']}
            for mode in ['original','texture']:
                item['summary'][mode]['gpuElapsedMs']=distribution([g['gpuElapsedMs'] for r in item['runs'] if r['mode']==mode for g in r['gpuResults']])
                item['summary'][mode]['totalCalls']=distribution([s['stats']['totalCalls'] for r in item['runs'] if r['mode']==mode for s in r['samples']])
                item['summary'][mode]['totalTriangles']=distribution([s['stats']['totalTriangles'] for r in item['runs'] if r['mode']==mode for s in r['samples']])
            require(not item['errors'],'Production JavaScript/shader error: '+repr(item['errors']))
            item['passed']=True;save()
        except BaseException as exc:
            item['failure']=repr(exc);save();raise
        finally:
            if browser:browser.close()


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dist',type=Path,default=ROOT/'dist')
    parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--chromium',help='Optional executable; omitted uses Playwright-installed Chromium')
    parser.add_argument('--headed',action='store_true')
    parser.add_argument('--experiment-root',type=Path)
    parser.add_argument('--modes',default='original')
    parser.add_argument('--specs',help='Comma separated named fixed camera specs')
    parser.add_argument('--compare-to',type=Path)
    parser.add_argument('--comparison-scope',choices=['foliage','housing','forest-path-visibility','village-production'],default='foliage')
    parser.add_argument('--source-only',action='store_true',help='Collect source SHA reference without repeating screenshots')
    parser.add_argument('--source-reference',type=Path,help='Original source-only report.json')
    parser.add_argument('--change-manifest',type=Path,help='Exact housing IDs or village-production-v1 field/SHA manifest')
    parser.add_argument('--housing-smoke',action='store_true',help='Check production homes/terrain-bound boardwalk without an A/B baseline')
    parser.add_argument('--forest-path-reentry',action='store_true',help='One native clear-cache/drop/reentry check for the exact legacy-path visibility change')
    parser.add_argument('--performance',action='store_true')
    parser.add_argument('--family',choices=['kourindou','forest'],default='kourindou')
    parser.add_argument('--scenarios',default='kourindou-path,kourindou-orbit')
    parser.add_argument('--abba-blocks',type=int,default=1)
    parser.add_argument('--samples',type=int,default=16)
    parser.add_argument('--gpu-query-wait-seconds',type=float,default=30,
                        help='Async query-tail deadline; incomplete results are saved and fail timing validation')
    args=parser.parse_args()
    require(0<args.gpu_query_wait_seconds<=60,'GPU query wait must be in (0,60] seconds')
    require(not args.forest_path_reentry or args.comparison_scope=='forest-path-visibility' and not args.performance,
            'Forest-path reentry is limited to the static forest-path visibility comparison')
    require(args.comparison_scope not in ('forest-path-visibility','village-production') or not args.performance,
            'Production region scopes do not run foliage performance experiments')
    args.experiment_files=[EXPERIMENT_FILES[0], 'src/experiments/forest-foliage-texture.js' if args.family=='forest' else EXPERIMENT_FILES[1]]
    args.output.mkdir(parents=True,exist_ok=True);args.dist=args.dist.resolve()
    release,artifact,release_sha=validate_build(args.dist)
    experiment_sha={name:digest(args.experiment_root/name) for name in args.experiment_files} if args.experiment_root else None
    report=dict(passed=False,artifact=str(artifact),sha256=release['sha256'],releaseSha256=release_sha,
       buildInputs=release['inputs'],experimentalScripts=experiment_sha,targetFamily=args.family,viewport=[1280,720],dpr=1,
       comparisonScope=args.comparison_scope,sourceOnly=args.source_only,housingSmoke=args.housing_smoke,
       forestPathReentry=args.forest_path_reentry,
       sourceReferenceSHA256=digest(args.source_reference) if args.source_reference else None,
       changeManifestSHA256=digest(args.change_manifest) if args.change_manifest else None,
       options=OPTIONS,hardwareFPSMeasured=False,physicalVRAMMeasured=False,
       toolSha256=digest(Path(__file__).resolve()),staticRenderOnce=not args.performance,forcedShadowRefreshInStaticOnly=not args.performance,
       lodHistory='production: warm both modes, full route replay before each ABBA run' if args.performance else 'fresh browser: diorama startup -> selected view; 3 warm frames, 3 fixed frames',
       captures=[],performance=[],failures=[])
    def save():
        temp=args.output/'report.json.tmp';temp.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');temp.replace(args.output/'report.json')
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(args.dist)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    url=f'http://127.0.0.1:{server.server_port}/{quote(release["artifact"])}'
    try:
        with sync_playwright() as pw:
            if args.performance:capture_performance(pw,args,url,report,save)
            else:capture_visuals(pw,args,url,report,save)
        require(validate_build(args.dist)[2]==release_sha,'Build changed during experiment')
        if args.experiment_root:
            require(all(digest(args.experiment_root/name)==sha for name,sha in experiment_sha.items()),'Experimental script changed while testing')
        report['passed']=True
    except BaseException as exc:
        report['failures'].append(repr(exc));traceback.print_exc()
    finally:
        server.shutdown();server.server_close();contact_sheet(report,args.output);save()
    return 0 if report['passed'] else 1


if __name__=='__main__':raise SystemExit(main())
