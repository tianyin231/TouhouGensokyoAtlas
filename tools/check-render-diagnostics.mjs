import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

// Verify data retention and error semantics without a browser or a GPU.
export function checkRenderDiagnostics(read) {
 let now=0, timers=0, disposals=0;
 class Canvas {
  listeners=new Map();
  addEventListener(type, fn) {
   if (!this.listeners.has(type)) this.listeners.set(type,new Set());
   this.listeners.get(type).add(fn);
  }
  removeEventListener(type, fn) { this.listeners.get(type)?.delete(fn); }
  emit(type) { for(const fn of this.listeners.get(type)||[]) fn({statusMessage:'driver reset'}); }
 }
 class Renderer {
  constructor() {
   this.engine={info:{memory:{geometries:12,textures:5},programs:[{},{}]},getContext(){throw Error('Unexpected GPU query');}};
   this.geometryRefs=new Map([[new Float32Array(3),{}]]);
   this.objects=[{}]; this.packs=new Map(); this.stats={submittedCPUms:2};
   this.residentBytes=512; this.renderCount=0;
   this.recovery={lost:0,restored:0,rebuilt:0,pending:false,lastError:null};
   this.sceneTarget={width:1,height:1,samples:2};
   // The real inheritance chain invokes these before the final constructor.
   this.setQuality('balanced'); this.setSize(640,480,1);
  }
  setQuality(q) { this.quality=q; }
  setSize(w,h) { Object.assign(this.sceneTarget,{width:w,height:h}); }
  attachPack(p) { this.dropPack(p.id); this.packs.set(p.id,p); }
  dropPack(id) { this.packs.delete(id); }
  rebuildContextCaches() { if(this.recoveryFailure)throw this.recoveryFailure; this.recovery.rebuilt++; }
  render() { if(this.failure)throw this.failure; if(this.nextMemory)Object.assign(this.engine.info.memory,this.nextMemory); this.renderCount++; }
  info() { return {stats:{...this.stats}}; }
  dispose() { disposals++; this.geometryRefs.clear(); this.objects=[]; this.residentBytes=0; }
 }
 const context=vm.createContext({GA:{DioramaRenderer:Renderer},performance:{now:()=>now},
  setInterval(){timers++;throw Error('Diagnostics must not schedule frames or timers');},
  setTimeout(){timers++;throw Error('Diagnostics must not schedule frames or timers');},
  requestAnimationFrame(){timers++;throw Error('Diagnostics must not schedule frames or timers');}});
 vm.runInContext(read('src/render-diagnostics.js').toString(),context);
 const canvas=new Canvas(), r=new context.GA.DioramaRenderer({},canvas,{});
 const rig={eye:[1,2,3],target:[4,5,6],fov:55};
 const state={view:'shrineFront',space:'surface',quality:'balanced',lighting:'neutral',weather:'clear',displayMode:'continuous'};
 const cache=new Map([['hakurei',{pack:{bytes:128}}]]);
 context.ATLAS={renderer:r,state,stream:{cache,required:new Set(['hakurei']),pending:{id:'forest'},
  metrics:{requests:3,builds:2,cancelled:1},bytes:()=>128}};
 const data=()=>JSON.parse(JSON.stringify(r.info().diagnostics));
 assert.equal(data().version,1);
 assert.equal(canvas.listeners.get('webglcontextlost').size,1,'Constructor attaches one diagnostic listener');

 r.nextMemory={geometries:22,textures:9};
 r.render(rig,state);
 assert.equal(data().samples.at(-1).frames,1,'A state change must sample its completed frame even before the interval');
 assert.equal(data().samples.at(-1).gpu.geometries,22,'The first frame records newly allocated resources');
 assert.equal(data().samples.at(-1).gpu.textures,9);
 const initial=data().samples.length;
 for(let i=0;i<50;i++){now+=10;r.render(rig,state);}
 assert.equal(data().samples.length,initial,'Active frames should not create per-frame histories');
 now=2500; r.render(rig,state);
 assert.equal(data().samples.length,initial+1,'A completed frame samples after the interval');
 assert.equal(data().samples.at(-1).streaming.building,'forest');
 assert.equal(data().samples.at(-1).streaming.sourceBytes,128);
 assert.equal(timers,0,'No sampling timer or render wakeups');

 for(let i=0;i<180;i++){
  now+=2100; state.view='view-'+i;
  r.render(rig,state);
 }
 let result=data();
 assert.equal(result.samples.length,result.limits.samples,'Resource samples are bounded');
 assert.equal(result.events.length,result.limits.events,'Event history is bounded');
 assert.equal(result.samples.at(-1).view,'view-179');
 assert(!JSON.stringify(result).includes('Float32Array'),'Reports must not retain geometry buffers');
 const last=result.samples.at(-1);
 r.captureDiagnostics('caller checkpoint').gpu.geometries=999;
 result.events.length=0; result.samples.at(-1).gpu.geometries=999;
 result.counters.contextLost=999;
 assert.equal(data().samples.at(-1).gpu.geometries,22,'Export mutations cannot corrupt stored evidence');
 assert.equal(data().counters.contextLost,0);
 assert(data().events.length>0);

 for(let i=0;i<6;i++){
  now+=10; canvas.emit('webglcontextlost'); canvas.emit('webglcontextrestored');
 }
 result=data();
 assert.equal(result.counters.contextLost,6,'Lifetime counts survive ring rollover');
 assert.equal(result.counters.contextRestored,6);
 assert.equal(result.incidents.length,result.limits.incidents);
 assert.equal(result.incidents.at(-1).type,'context-lost');
 assert.equal(result.incidents.at(-1).before.length,12,'Each retained loss carries the preceding resource samples');
 const retained=result.incidents[0].snapshot.at;
 for(let i=0;i<100;i++){now+=2100;r.captureDiagnostics('rollover');}
 assert.equal(data().incidents[0].snapshot.at,retained,'Rolling samples must not erase retained incidents');

 const failure=new Error('render failed'); r.failure=failure;
 assert.throws(()=>r.render(rig,state),error=>error===failure,'Rendering errors must propagate unchanged');
 assert.equal(data().counters.renderErrors,1);
 assert.equal(data().incidents.at(-1).type,'render-error');
 delete r.failure;
 r.recoveryFailure=new Error('cache rebuild failed');
 assert.throws(()=>r.rebuildContextCaches(),error=>error===r.recoveryFailure);
 assert.equal(data().counters.recoveryErrors,1);
 delete r.recoveryFailure; r.rebuildContextCaches();
 assert.equal(data().events.at(-1).type,'context-caches-rebuilt');

 r.setQuality('low'); r.setSize(390,844,1);
 r.attachPack({id:'forest',bytes:2048}); r.dropPack('forest');
 assert(data().events.some(e=>e.type==='quality-change'));
 assert(data().events.some(e=>e.type==='resize'));
 assert.equal(data().events.at(-1).type,'pack-dropped');
 r.nextMemory={geometries:7,textures:3}; r.render(rig,state);
 assert.equal(data().samples.at(-1).gpu.geometries,7,'Resource events record the next completed frame without another state change');
 assert.equal(last.camera.eye[0],1,'Cameras are copied as coordinates');
 rig.eye[0]=77;
 assert.equal(last.camera.eye[0],1,'Camera edits cannot mutate previous evidence');

 r.dispose(); r.dispose();
 assert.equal(disposals,1,'Diagnostic dispose is idempotent');
 assert.equal(canvas.listeners.get('webglcontextlost').size,0);
 assert.equal(canvas.listeners.get('webglcontextrestored').size,0);
 const final=data(); canvas.emit('webglcontextlost'); r.captureDiagnostics('after disposal');
 assert.deepEqual(data(),final,'Disposed diagnostics stop collecting');
 assert.equal(final.events.at(-1).type,'disposed');
 assert.equal(final.samples.at(-1).gpu.attributeBytes,0);
 return {boundedSamples:60,boundedEvents:80,boundedIncidents:4,retainedLosses:6,timers:0,
  errorPropagation:true,exportIsolation:true,listenersReleased:true};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
 console.log(JSON.stringify(checkRenderDiagnostics(name=>fs.readFileSync(path.join(root,name)))));
}
