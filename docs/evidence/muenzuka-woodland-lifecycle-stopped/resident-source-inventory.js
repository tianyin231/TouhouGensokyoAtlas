// Synchronous, bounded, observation-only managed GPU attribution. Event
// listeners record scalar dispose timestamps; weak keys retain no mesh/array.
// No draw/finish/ensure/trim or production function override is performed.
(function(){
 // This factory lives outside each inventory activation: persistent event
 // listeners close over weak/scalar state and scalar IDs, never its local maps
 // of source arrays or GPU objects.
 function disposeListener(S,kind,id,recordId,geometryId){return()=>{
  if(S.disposeEvents.length>=10000)throw Error('Dispose inventory bound exceeded');
  S.disposeEvents.push({kind,id,recordId,geometryId,atSeconds:performance.now()/1000,
   phase:globalThis.__muenWoodlandInventoryPhase||null,
   lastObservedGeometryOwners:(S.geometryOwners.get(geometryId)||[]).map(o=>({...o}))});
 };}
 return label => {
 const A=ATLAS,R=A.renderer,E=R.engine,MAX_RECORDS=2300,MAX_GEOMETRIES=1024,MAX_EVENTS=10000;
 if(R.records.length>MAX_RECORDS||R.geometryRefs.size>MAX_GEOMETRIES)throw Error('Resident inventory bound exceeded');
 const S=globalThis.__muenWoodlandResidentTokens||(globalThis.__muenWoodlandResidentTokens={
  views:new WeakMap(),attributes:new WeakMap(),observedGeometry:new WeakSet(),observedMesh:new WeakSet(),
  nextView:1,nextAttribute:1,disposeEvents:[],geometryOwners:new Map()});
 const token=(map,o,next)=>{if(!map.has(o))map.set(o,S[next]++);return map.get(o);};
 const desc=a=>a?{viewToken:token(S.views,a,'nextView'),type:a.constructor.name,bytes:a.byteLength,
  length:a.length,byteOffset:a.byteOffset}:null;
 const now=performance.now()/1000,rows=[],owners=new Map(),attributes=new Map(),sourceViews=new Map();
 const addAttribute=(a,owner,role)=>{
  if(!a)return null;const key=a.isInterleavedBufferAttribute?a.data:a;
  if(!attributes.has(key))attributes.set(key,{attributeToken:token(S.attributes,key,'nextAttribute'),
    array:desc(key.array),roles:new Set(),owners:new Set()});
  const q=attributes.get(key);q.roles.add(role);q.owners.add(owner);sourceViews.set(key.array,q.array);
  return q.attributeToken;
 };
 globalThis.__muenWoodlandInventoryPhase=label;
 for(const r of R.records){if(!r.item)continue;
  const m=r.data,mesh=r.item.mesh,g=mesh.geometry,pack=r.pack||'overview';
  const row={id:m.id,pack,owner:m.owner||null,component:m.component||null,material:m.material||null,
   level:r.level,wanted:!!r.wanted,objectVisible:!!mesh.visible,shadowOnly:!!r.shadowOnly,lastUsedSeconds:r.lastUsed,
   unusedAgeSeconds:now-r.lastUsed,geometryId:g.id,meshId:mesh.id,sourceArray:desc(r.array),
   instanceBytes:m.instances?m.instances.byteLength+(m.instanceColors?.byteLength||0):0,
   instanceMatrix:desc(m.instances),instanceColors:desc(m.instanceColors),attributeTokens:[]};
  for(const[name,a]of Object.entries(g.attributes))row.attributeTokens.push(addAttribute(a,pack+':'+m.id,'geometry/'+name));
  if(g.index)row.attributeTokens.push(addAttribute(g.index,pack+':'+m.id,'geometry/index'));
  if(mesh.isInstancedMesh){row.attributeTokens.push(addAttribute(mesh.instanceMatrix,pack+':'+m.id,'instanceMatrix'));
   if(mesh.instanceColor)row.attributeTokens.push(addAttribute(mesh.instanceColor,pack+':'+m.id,'instanceColor'));}
  row.attributeTokens=[...new Set(row.attributeTokens)];rows.push(row);
  if(!owners.has(r.array))owners.set(r.array,[]);owners.get(r.array).push({id:m.id,pack,level:r.level,wanted:!!r.wanted,lastUsedSeconds:r.lastUsed});
  if(mesh.isInstancedMesh&&!S.observedMesh.has(mesh)){S.observedMesh.add(mesh);const id=mesh.id,rid=m.id,gid=g.id;
   mesh.addEventListener('dispose',disposeListener(S,'instancedMesh',id,rid,gid));}
 }
 const geometries=[];
 for(const[a,value]of R.geometryRefs){
  const list=(owners.get(a)||[]).sort((a,b)=>a.id.localeCompare(b.id));
  if(list.length!==value.refs)throw Error('Managed geometry reference/owner mismatch '+value.geo.id);
  if(!list.length)throw Error('Unowned managed geometry '+value.geo.id);
  S.geometryOwners.set(value.geo.id,list.map(o=>({...o})));
  geometries.push({geometryId:value.geo.id,bytes:value.bytes,refs:value.refs,array:desc(a),owners:list});
  if(!S.observedGeometry.has(value.geo)){S.observedGeometry.add(value.geo);const id=value.geo.id;
   value.geo.addEventListener('dispose',disposeListener(S,'geometry',id,null,id));}
 }
 const attributeRows=[...attributes.values()].map(q=>({...q,roles:[...q.roles].sort(),owners:[...q.owners].sort()}));
 const uniqueAttributeBytes=attributeRows.reduce((n,q)=>n+q.array.bytes,0),instanceCountedBytes=rows.reduce((n,q)=>n+q.instanceBytes,0);
 const geometryCountedBytes=geometries.reduce((n,q)=>n+q.bytes,0),reconciledResidentBytes=geometryCountedBytes+instanceCountedBytes;
 if(reconciledResidentBytes!==R.residentBytes)throw Error('Managed geometry+instance byte ledger does not reconcile');
 // For these sources no special renderer-only attributes are allowed to hide
 // outside the ordinary managed count. CPU alias bytes are reported separately.
 if(uniqueAttributeBytes!==R.residentBytes)throw Error('Actual unique GPU attribute-object ledger does not reconcile');
 const unownedSceneGeometry=[];
 const managedIDs=new Set(geometries.map(x=>x.geometryId));
 R.scene.traverse(o=>{if(o.isMesh&&o.geometry&&!managedIDs.has(o.geometry.id))unownedSceneGeometry.push({
  meshId:o.id,name:o.name||null,geometryId:o.geometry.id,owner:o.userData?.owner||null,visible:!!o.visible});});
 rows.sort((a,b)=>a.pack.localeCompare(b.pack)||a.id.localeCompare(b.id));geometries.sort((a,b)=>a.geometryId-b.geometryId);
 return{label,atSeconds:now,drawnFrames:A.state.drawnFrames,pose:{eye:A.rig.eye.slice(),target:A.rig.target.slice(),fov:A.rig.fov},
  settings:{clock:A.state.clock,quality:A.state.quality,rendererQuality:R.quality,weather:A.state.weather,lighting:A.state.lighting,
   ao:A.state.ao,motion:A.state.motion,bloom:A.state.bloom,reflections:A.state.reflections,characters:A.state.characters,labels:A.state.labels},
  stats:{...R.info().stats},engineMemory:{...E.info.memory},residentAttributeBytes:R.residentBytes,
  limit:{records:MAX_RECORDS,geometries:MAX_GEOMETRIES,disposeEvents:MAX_EVENTS},complete:true,
  residentRows:rows,managedGeometries:geometries,uniqueGPUAttributeObjects:attributeRows,
  uniqueGPUAttributeBytes:uniqueAttributeBytes,uniqueCPUSourceViewBytes:[...sourceViews.values()].reduce((n,a)=>n+a.bytes,0),
  byteReconciliation:{geometryCountedBytes,instanceCountedBytes,reconciledResidentBytes,exact:true},
  sceneGeometryOutsideRecordOwnership:unownedSceneGeometry,disposeEvents:S.disposeEvents.map(x=>({...x})),
  inferenceLimits:'Managed record/geometry ownership and actual attribute object bytes are exhaustive here. Engine memory.geometries may also count sky/sign/post/shadow resources. Disposal timestamps do not by themselves prove a caller or the historical A/B cause. No JavaScript GC or physical VRAM assertion.'};
 };
})()
