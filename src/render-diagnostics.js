/* Bounded, data-only lifecycle evidence. No timers, GPU queries or extra frames.
 * Counts and attribute bytes are observations, not physical VRAM or a GPU benchmark.
 * Target descriptors describe configured objects, not live driver allocations.
 */
(function (G) {
'use strict';
const Base = G.DioramaRenderer;
const LIMITS = Object.freeze({samples:60, events:80, incidents:4});
const INTERVAL = 2000;
const EFFECTS = ['ao','bloom','reflections','vegetation','motion','cutaway'];
const finite = value => Number.isFinite(value) ? value : 0;
const label = value => value == null ? null : String(value).slice(0,160);
const copy = value => JSON.parse(JSON.stringify(value));
const append = (list, value, limit) => { list.push(value); if (list.length > limit) list.shift(); };

class DiagnosticRenderer extends Base {
 constructor(T, canvas, world) {
  super(T, canvas, world);
  this.diagnosticLog = {
   version:1, limits:{...LIMITS}, sampleIntervalMs:INTERVAL,
   counters:{contextLost:0, contextRestored:0, renderErrors:0, recoveryErrors:0},
   samples:[], events:[], incidents:[]
  };
  this.diagnosticCanvas = canvas;
  this.diagnosticDisposed = false;
  this.diagnosticLastSample = -Infinity;
  this.onDiagnosticContextLost = event => this.recordDiagnosticEvent('context-lost', {message:label(event.statusMessage)});
  this.onDiagnosticContextRestored = () => this.recordDiagnosticEvent('context-restored');
  canvas.addEventListener('webglcontextlost', this.onDiagnosticContextLost);
  canvas.addEventListener('webglcontextrestored', this.onDiagnosticContextRestored);
  this.recordDiagnosticEvent('created');
 }

 diagnosticSnapshot(reason) {
  const atlas = globalThis.ATLAS?.renderer === this ? globalThis.ATLAS : null;
  const state = atlas?.state || this.diagnosticState || {};
  const stream = atlas?.stream, info = this.engine.info, metrics = stream?.metrics || {};
  const targets = [];
  const seen = new Set();
  const target = (name, value) => {
   if (!value || seen.has(value)) return;
   seen.add(value);
   targets.push({name, width:finite(value.width), height:finite(value.height), samples:finite(value.samples)});
  };
  for (const name of ['sceneTarget','aoTarget','blurA','blurB','reflectionTarget','studioEnv']) target(name, this[name]);
  for (let i=0; i<(this.backdoorWindowTargets?.length || 0); i++) target('backdoorWindow'+i, this.backdoorWindowTargets[i]);
  target('sunShadow', this.sun?.shadow?.map);
  target('sunShadowPass', this.sun?.shadow?.mapPass);
  target('hellKeyShadow', this.hellKey?.shadow?.map);
  target('hellKeyShadowPass', this.hellKey?.shadow?.mapPass);
  const recovery = this.recovery || {};
  return {
   at:performance.now(), reason:label(reason),
   view:label(state.view), space:label(state.space), quality:label(this.quality),
   lighting:label(state.lighting), weather:label(state.weather), displayMode:label(state.displayMode),
   effects:Object.fromEntries(EFFECTS.map(name=>[name,typeof state[name]==='boolean'?state[name]:null])),
   camera:this.diagnosticCamera ? copy(this.diagnosticCamera) : null,
   gpu:{geometries:finite(info.memory?.geometries), textures:finite(info.memory?.textures),
    programs:info.programs?.length || 0, attributeBytes:finite(this.residentBytes),
    geometryEntries:this.geometryRefs?.size || 0, residentObjects:this.objects?.length || 0},
   streaming:{cached:stream ? [...stream.cache.keys()] : [], required:stream ? [...stream.required] : [],
    building:label(stream?.pending?.id), buildingMs:stream?.pending ? Math.max(0,finite(performance.now()-stream.pending.startedAt)) : 0,
    sourceBytes:stream ? finite(stream.bytes()) : 0,
    requests:finite(metrics.requests), builds:finite(metrics.builds), cancelled:finite(metrics.cancelled),
    evictions:finite(metrics.evictions), staleDropped:finite(metrics.staleDropped)},
   targets, frames:finite(this.renderCount), submittedCPUms:finite(this.stats?.submittedCPUms),
   recovery:{lost:finite(recovery.lost), restored:finite(recovery.restored), rebuilt:finite(recovery.rebuilt),
    pending:!!recovery.pending, lastError:label(recovery.lastError)}
  };
 }

 captureDiagnostics(reason='manual') {
  if (!this.diagnosticLog) return null; // Base constructors call virtual methods.
  if (this.diagnosticDisposed) return copy(this.diagnosticLog.samples.at(-1) || null);
  const snapshot = this.diagnosticSnapshot(reason);
  append(this.diagnosticLog.samples, snapshot, LIMITS.samples);
  this.diagnosticLastSample = snapshot.at;
  return copy(snapshot);
 }

 recordDiagnosticEvent(type, detail={}) {
  if (!this.diagnosticLog || this.diagnosticDisposed) return;
  const log = this.diagnosticLog;
  const counter = {'context-lost':'contextLost','context-restored':'contextRestored',
   'render-error':'renderErrors','recovery-error':'recoveryErrors'}[type];
  if (counter) log.counters[counter]++;
  const incident = type === 'context-lost' || type === 'render-error' || type === 'recovery-error';
  const before = incident ? log.samples.slice(-12) : null;
  const snapshot = this.captureDiagnostics(type);
  this.diagnosticAwaitFrame = true;
  append(log.events, {type, at:snapshot.at, view:snapshot.view, space:snapshot.space,
   quality:snapshot.quality, detail:copy(detail)}, LIMITS.events);
  if (incident) append(log.incidents, {type, at:snapshot.at, before, snapshot}, LIMITS.incidents);
 }

 setQuality(quality) {
  const previous = this.quality;
  super.setQuality(quality);
  if (quality !== previous) this.recordDiagnosticEvent('quality-change', {from:label(previous), to:label(quality)});
 }

 setSize(width, height, dpr=1) {
  const before = this.sceneTarget ? [this.sceneTarget.width, this.sceneTarget.height] : [];
  super.setSize(width, height, dpr);
  if (this.sceneTarget && (before[0] !== this.sceneTarget.width || before[1] !== this.sceneTarget.height))
   this.recordDiagnosticEvent('resize', {width, height, dpr});
 }

 attachPack(pack) {
  super.attachPack(pack);
  this.recordDiagnosticEvent('pack-attached', {region:label(pack.id), sourceBytes:finite(pack.bytes)});
 }

 dropPack(id) {
  const existed = this.packs?.has(id);
  super.dropPack(id);
  if (existed) this.recordDiagnosticEvent('pack-dropped', {region:label(id)});
 }

 rebuildContextCaches() {
  try {
   super.rebuildContextCaches();
   this.recordDiagnosticEvent('context-caches-rebuilt');
  } catch (error) {
   this.recordDiagnosticEvent('recovery-error', {name:label(error.name), message:label(error.message)});
   throw error;
  }
 }

 render(rig, opts={}) {
  this.diagnosticState = {view:opts.view, space:opts.space, lighting:opts.lighting,
   weather:opts.weather, displayMode:opts.displayMode, ...Object.fromEntries(EFFECTS.map(name=>[name,opts[name]]))};
  this.diagnosticCamera = {eye:rig.eye.slice(0,3), target:rig.target.slice(0,3), fov:finite(rig.fov)};
  const key = [opts.view, opts.space, this.quality, opts.lighting, opts.weather, opts.displayMode, opts.focus,
   ...EFFECTS.map(name=>opts[name])].join('|');
  if (key !== this.diagnosticStateKey) {
   this.diagnosticStateKey = key;
   this.recordDiagnosticEvent('view-state-change');
  }
  const before = this.renderCount;
  try {
   super.render(rig, opts);
   if (this.renderCount !== before && (this.diagnosticAwaitFrame || performance.now()-this.diagnosticLastSample >= INTERVAL)) {
    this.captureDiagnostics('frame-sample');
    this.diagnosticAwaitFrame = false;
   }
  } catch (error) {
   this.recordDiagnosticEvent('render-error', {name:label(error.name), message:label(error.message)});
   throw error;
  }
 }

 info() {
  const result = super.info();
  if (this.diagnosticLog) result.diagnostics = copy(this.diagnosticLog);
  return result;
 }

 dispose() {
  if (this.diagnosticDisposed) return;
  this.diagnosticCanvas?.removeEventListener('webglcontextlost', this.onDiagnosticContextLost);
  this.diagnosticCanvas?.removeEventListener('webglcontextrestored', this.onDiagnosticContextRestored);
  try { super.dispose(); this.recordDiagnosticEvent('disposed'); }
  finally { this.diagnosticDisposed = true; this.diagnosticCanvas = null; }
 }
}
G.DioramaRenderer = DiagnosticRenderer;
})(globalThis.GA);
