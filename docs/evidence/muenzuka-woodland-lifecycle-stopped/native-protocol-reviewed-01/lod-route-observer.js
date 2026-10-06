// Read-only frame/actual-draw observer for a fixed production camera route.
// Temporary mesh callbacks invoke their originals and are restored on cleanup.
// This does not call render/finish/ensure, assign LOD, or alter any model bound.
spec => {
 const A=ATLAS,R=A.renderer,ids=new Set(spec.targetIDs),MAX_FRAMES=512,MAX_DRAWS=20000;
 if(globalThis.__muenWoodlandLOD)throw Error('LOD observer collision');
 const snapshots=[],observed=new WeakSet(),restores=[],sphereTokens=new WeakMap();let nextSphere=1;
 const S={active:false,frames:snapshots,pendingDraws:[],allDraws:[],watching:false,routeSegment:null,
  targetIDs:spec.targetIDs,legResults:[],maxFrames:MAX_FRAMES,failed:null};
 function attach(){for(const r of R.records)if(r.pack==='muenzuka'&&ids.has(r.data.id)&&r.item?.mesh&&!observed.has(r.item.mesh)){
  const mesh=r.item.mesh,original=mesh.onBeforeRender;observed.add(mesh);
  mesh.onBeforeRender=function(...args){
   if(S.pendingDraws.length+S.allDraws.length>=MAX_DRAWS)throw Error('LOD actual-draw bound exceeded');
   const row={frame:A.state.drawnFrames+1,id:r.data.id,level:r.level,instances:r.data.instances.length/16,
    atMs:performance.now(),segment:S.routeSegment};S.pendingDraws.push(row);S.allDraws.push(row);original?.apply(this,args);
  };
  restores.push(()=>{mesh.onBeforeRender=original});
 }}
 function capture(label){attach();const n=A.state.drawnFrames;
  if(snapshots.length>=MAX_FRAMES)throw Error('LOD frame bound exceeded');
  if(snapshots.at(-1)?.drawnFrames===n)return snapshots.at(-1);
  const records=R.records.filter(r=>r.pack==='muenzuka'&&ids.has(r.data.id)).map(r=>{
   const m=r.data,s=r.item?.mesh.boundingSphere;
   if(s&&!sphereTokens.has(s))sphereTokens.set(s,nextSphere++);
   const family=spec.remainingIDs.includes(m.id)?'remainingWoodland':'acceptedWestern';
   const expectedCulling=family==='acceptedWestern'||!!GA.MUENZUKA_WOODLAND_CULLING;
   return{id:m.id,family,instances:m.instances.length/16,level:r.level,wanted:!!r.wanted,
    resident:!!r.item,meshId:r.item?.mesh.id||null,objectVisible:!!r.item?.mesh.visible,distance:r.distance,
    sphereToken:s?sphereTokens.get(s):null,sphere:s?{center:s.center.toArray(),radius:s.radius}:null,
    expectedCulling};
  });
  const row={label,segment:S.routeSegment,drawnFrames:n,atMs:performance.now(),transitioning:!!A.rig.transition,
   eye:A.rig.eye.slice(),target:A.rig.target.slice(),focus:A.state.focus,
   required:[...A.stream.required],records,
   actualDraws:S.pendingDraws.filter(d=>d.frame===n).map(d=>({...d})),stats:{...R.info().stats}};
  S.pendingDraws=[];snapshots.push(row);return row;
 }
 function watch(){if(!S.active){S.watching=false;return;}
  try{capture('continuous production transition');if(!A.rig.transition){S.active=false;S.watching=false;return;}}
  catch(e){S.failed=String(e.stack||e);S.active=false;S.watching=false;return;}
  requestAnimationFrame(watch);
 }
 S.begin=label=>{if(S.active)throw Error('Previous LOD leg still active');S.routeSegment=label;attach();S.active=true;S.watching=true;requestAnimationFrame(watch)};
 S.capture=capture;
 S.result=()=>({frames:snapshots.map(x=>({...x})),allDraws:S.allDraws.map(x=>({...x})),failed:S.failed,
  active:S.active,observerMeshCount:restores.length,maxFrames:MAX_FRAMES,maxDraws:MAX_DRAWS,
  meaning:'Actual production RAF transition frames and mesh submission callbacks, not hardware FPS. No forced LOD or sphere change.'});
 S.cleanup=()=>{S.active=false;const n=restores.length;for(const f of restores)f();restores.length=0;
  snapshots.length=0;S.pendingDraws.length=0;S.allDraws.length=0;
  return{restoredCallbacks:n,strongMeshReferencesReleased:true,productionFunctionsReplaced:false}};
 globalThis.__muenWoodlandLOD=S;attach();return{targetRecords:ids.size,observerMeshCount:restores.length};
}
