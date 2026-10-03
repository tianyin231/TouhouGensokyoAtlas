/* Opt-in Kourindou foliage experiment. Existing foliage already has alpha maps.
 * This tests paired far cards, an original albedo/normal atlas and retained PBR.
 * Loading this file does nothing to production. Explicit API:
 *   const ab = GA.KOURINDOU_FOLIAGE_TEXTURE.install(ATLAS.renderer);
 *   ab.setMode('texture'); ab.ready(); ab.info(); ab.setMode('original');
 * Load assets/experiments/kourindou-foliage-atlas.js first. No build registration.
 */
(function (G) {
'use strict';
const MATERIAL = 'experimentKourindouFoliage', TARGET = /^kourindou:landscape:.*:leaf$/;
const installed = new WeakMap(), closedRenderers = new WeakSet(), QUAD = [0,0,1,0,1,1,0,0,1,1,0,1];
const position = (a, card, vertex) => Array.from(a.subarray(card * 54 + vertex * 9, card * 54 + vertex * 9 + 3));
const add = (a, b) => a.map((v, k) => v + b[k]), sub = (a, b) => a.map((v, k) => v - b[k]);
const mul = (a, b) => a.map(v => v * b), dot = (a, b) => a.reduce((s, v, k) => s + v * b[k], 0);
const unit = a => mul(a, 1 / Math.hypot(...a));

function atlasUV(cards) {
 const A = G.KOURINDOU_FOLIAGE_ATLAS, size = A.size, tile = A.tileSize, inset = A.gutter;
 const uv = new Float32Array(cards * 12);
 for (let i = 0; i < cards; i++) {
  const slot = i % 4, x0 = slot % 2 * tile + inset + .5, y0 = Math.floor(slot / 2) * tile + inset + .5;
  const span = tile - inset * 2 - 1;
  for (let j = 0; j < 6; j++) { uv[i * 12 + j * 2] = (x0 + QUAD[j * 2] * span) / size; uv[i * 12 + j * 2 + 1] = (y0 + QUAD[j * 2 + 1] * span) / size; }
 }
 return uv;
}

function pairedFar(a) {
 if (!(a instanceof Float32Array) || a.length !== 102 * 54) throw new Error('Experimental far leaf prototype changed; review 24 four-card sprays and one six-card crown');
 const out = new Float32Array(51 * 54);
 for (let i = 0; i < 51; i++) {
  const first = i * 2, A = position(a, first, 0), B = position(a, first, 1), C = position(a, first, 2);
  const center0 = mul(add(A, C), .5), center1 = mul(add(position(a, first + 1, 0), position(a, first + 1, 2)), .5);
  const center = mul(add(center0, center1), .5), u = unit(sub(B, A)), v = unit(sub(C, B));
  // Paired-card centres preserve the original spray locations. Wider cards are
  // bounded by the source corners projected on the first card's two axes.
  let halfW = 0, halfH = 0;
  for (const card of [first, first + 1]) for (const vertex of [0, 1, 2, 5]) {
   const d = sub(position(a, card, vertex), center); halfW = Math.max(halfW, Math.abs(dot(d, u))); halfH = Math.max(halfH, Math.abs(dot(d, v)));
  }
  const U = mul(u, halfW), V = mul(v, halfH), points = [sub(sub(center, U), V),sub(add(center, U), V),add(add(center, U), V),add(sub(center, U), V)];
  for (let j = 0; j < 6; j++) {
   const corner = [0, 1, 2, 0, 2, 3][j], dst = i * 54 + j * 9, source = first * 54 + j * 9;
   out.set(points[corner], dst); out.set(a.subarray(source + 3, source + 9), dst + 3);
  }
 }
 return out;
}

function install(renderer) {
 if (closedRenderers.has(renderer)) throw new Error('Cannot install foliage experiment on a disposed renderer');
 if (installed.has(renderer)) return installed.get(renderer);
 if (renderer?.__foliageTextureExperimentOwner) throw new Error('Dispose the other foliage experiment before installing Kourindou');
 if (!G.KOURINDOU_FOLIAGE_ATLAS) throw new Error('Load the isolated foliage atlas generator first');
 if (!renderer?.records || !renderer.geometryRefs || !renderer.mats?.kourindouLeaf) throw new Error('Kourindou renderer is not ready');
 if (renderer.mats[MATERIAL]) throw new Error('Experimental material name already exists');
 const entries = renderer.records.filter(r => TARGET.test(r.data.id)).map(record => ({record,original:record.data,replacement:null}));
 if (!entries.length) throw new Error('No Kourindou public leaf records');
 for (const {original:m} of entries) {
  if (m.material !== 'kourindouLeaf' || !m.leafCards || !m.globalSurface || m.index || m.vertices.length !== 204 * 54 || m.farVertices?.length !== 102 * 54 || !m.instances || m.instances.length % 16 || m.instanceColors?.length !== m.instances.length / 16 * 3)
   throw new Error('Experimental leaf scope changed: ' + m.id);
 }
 let mode = 'original', generation = 0, switchedAt = -1, disposed = false, resources = null, lastError = null;
 const hooks = new Map(), uvByArray = new Map(), clones = new Map(), farArrays = new Map();
 function wake() {
  renderer.engine.shadowMap.needsUpdate = true; renderer.mirrorLast = null;
  if (globalThis.ATLAS?.renderer === renderer) globalThis.ATLAS.wake();
 }
 function hook(name, factory) {
  const original = renderer[name], descriptor = Object.getOwnPropertyDescriptor(renderer, name);
  const wrapped = factory(original); hooks.set(name, {descriptor, wrapped});
  Object.defineProperty(renderer, name, {value:wrapped,writable:true,configurable:true,enumerable:descriptor?.enumerable ?? false});
 }
 function restoreHooks() {
  for (const [name, {descriptor, wrapped}] of hooks) if (renderer[name] === wrapped) {
   if (descriptor) Object.defineProperty(renderer, name, descriptor); else delete renderer[name];
  }
  hooks.clear();
 }
 function makeResources() {
  const T = renderer.T, source = renderer.mats.kourindouLeaf, atlas = G.KOURINDOU_FOLIAGE_ATLAS.create(), owned = [];
  try {
   const makeTexture = (mips, colorSpace, name) => {
    const texture = new T.DataTexture(mips[0].data, atlas.size, atlas.size, T.RGBAFormat, T.UnsignedByteType); owned.push(texture);
    texture.name = name; texture.colorSpace = colorSpace; texture.mipmaps = mips; texture.generateMipmaps = false;
    texture.minFilter = T.LinearMipmapLinearFilter; texture.magFilter = T.LinearFilter;
    texture.wrapS = texture.wrapT = T.ClampToEdgeWrapping; texture.flipY = false; texture.needsUpdate = true; return texture;
   };
   const color = makeTexture(atlas.colorMips, T.SRGBColorSpace, 'kourindou-experiment-albedo-alpha');
   const normal = makeTexture(atlas.normalMips, T.NoColorSpace, 'kourindou-experiment-leaf-normal');
   const mat = source.clone(); owned.push(mat); mat.name = MATERIAL; mat.map = color; mat.alphaMap = null;
   mat.normalMap = normal; mat.normalScale.set(.22, .22); mat.alphaTest = atlas.alphaTest;
   mat.alphaToCoverage = false; mat.transparent = false; mat.depthWrite = true; mat.side = T.DoubleSide;
   mat.onBeforeCompile = source.onBeforeCompile; const sourceKey = source.customProgramCacheKey.bind(source);
   mat.customProgramCacheKey = () => sourceKey() + '-paired-foliage-atlas-1';
   const depth = new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,map:color,alphaTest:mat.alphaTest,side:T.DoubleSide}); owned.push(depth);
   const distance = new T.MeshDistanceMaterial({map:color,alphaTest:mat.alphaTest,side:T.DoubleSide}); owned.push(distance);
   depth.name = MATERIAL + 'Depth'; distance.name = MATERIAL + 'Distance';
   return {atlas,color,normal,mat,depth,distance,owned};
  } catch (error) { for (const value of owned) value.dispose(); throw error; }
 }
 function clearResources() {
  if (resources) {
   if (renderer.mats[MATERIAL] === resources.mat) delete renderer.mats[MATERIAL];
   for (const value of resources.owned) value.dispose(); resources = null;
  }
  uvByArray.clear(); clones.clear(); farArrays.clear();
  for (const entry of entries) entry.replacement = null;
 }
 function disable(redraw = true) {
  if (mode === 'original' && !resources && !hooks.size && !uvByArray.size && !clones.size && !farArrays.size && entries.every(entry => !entry.replacement)) return;
  for (const entry of entries) {
   if (entry.record.data === entry.replacement) { renderer.evict(entry.record); entry.record.data = entry.original; }
  }
  mode = 'original'; restoreHooks(); clearResources(); renderer.engine.renderLists.dispose();
  generation++; switchedAt = renderer.renderCount;
  if (redraw) wake();
 }
 function enable() {
  try {
   // All scope/CPU validation happens before any record or renderer is mutated.
   for (const entry of entries) {
    if (renderer.recordMap.get(entry.original.id) !== entry.record || entry.record.data !== entry.original) throw new Error('Leaf record was externally replaced: ' + entry.original.id);
    const m = entry.original;
    if (!clones.has(m.vertices)) { const a = new Float32Array(m.vertices); clones.set(m.vertices, a); uvByArray.set(a, atlasUV(204)); }
    if (!farArrays.has(m.farVertices)) { const a = pairedFar(m.farVertices); farArrays.set(m.farVertices, a); uvByArray.set(a, atlasUV(51)); }
    const near = clones.get(m.vertices), far = farArrays.get(m.farVertices);
    // Keep the original record centre/radius and LOD decision. Assert every new
    // card lies within that bound after every retained original instance matrix.
    for (let instance = 0; instance < m.instances.length; instance += 16) for (let j = 0; j < far.length; j += 9) {
     const matrix = m.instances.subarray(instance, instance + 16), point = G.transform(matrix, Array.from(far.subarray(j, j + 3)));
     if (Math.hypot(...point.slice(0, 3).map((v, k) => v - m.center[k])) > m.radius) throw new Error('Paired canopy left retained record bound: ' + m.id);
    }
    entry.replacement = {...m,vertices:near,farVertices:far,material:MATERIAL,leafCards:false,foliageTextureExperiment:true};
   }
   resources = makeResources(); renderer.mats[MATERIAL] = resources.mat;
   hook('geometry', original => function (array) {
    const geo = original.call(this, array), uv = uvByArray.get(array);
    if (uv && !geo.getAttribute('uv')) geo.setAttribute('uv', new this.T.BufferAttribute(uv, 2));
    return geo;
   });
   hook('acquire', original => function (array) {
    const had = this.geometryRefs.has(array), geo = original.call(this, array), uv = uvByArray.get(array);
    if (!had && uv) { const allocation = this.geometryRefs.get(array); allocation.bytes += uv.byteLength; this.residentBytes += uv.byteLength; }
    return geo;
   });
   hook('ensure', original => function (record, level) {
    const mesh = original.call(this, record, level);
    if (record.data.foliageTextureExperiment) { mesh.customDepthMaterial = resources.depth; mesh.customDistanceMaterial = resources.distance; }
    return mesh;
   });
   hook('lighting', original => function (...args) {
    const result = original.apply(this, args), source = this.mats.kourindouLeaf;
    resources.mat.envMap = source.envMap; resources.mat.envMapIntensity = source.envMapIntensity; return result;
   });
   // Source-backed DataTextures survive Three.js context restoration; the
   // existing RecoveryRenderer also rebinds this registered material's PMREM.
   for (const entry of entries) { renderer.evict(entry.record); entry.record.data = entry.replacement; }
   mode = 'texture'; generation++; switchedAt = renderer.renderCount; lastError = null; wake();
  } catch (error) { lastError = error.message; disable(false); throw error; }
 }
 function ready() {
  if (disposed || renderer.contextLost || renderer.recovery?.pending || renderer.renderCount <= switchedAt) return false;
  return entries.every(entry => {
   const record = entry.record;
   if (renderer.recordMap.get(entry.original.id) !== record || record.data !== (mode === 'texture' ? entry.replacement : entry.original)) return false;
   if (!record.item || !record.item.mesh.visible) return true;
   const mesh = record.item.mesh;
   return mode !== 'texture' || mesh.material === resources.mat && mesh.customDepthMaterial === resources.depth && mesh.customDistanceMaterial === resources.distance && !!mesh.geometry.getAttribute('uv');
  });
 }
 function info() {
  const trees = entries.reduce((sum, entry) => sum + entry.original.instances.length / 16, 0);
  const visible = entries.filter(entry => entry.record.item?.mesh.visible).map(entry => ({id:entry.original.id,level:entry.record.level,instances:entry.original.instances.length/16}));
  return {version:'1.2',kind:'kourindou',mode,generation,ready:ready(),disposed,lastError,material:mode === 'texture' ? MATERIAL : 'kourindouLeaf',
   targetIds:entries.map(entry => entry.original.id),trees,visible,lodSignature:visible.map(v => v.id + ':' + v.level).join('|'),
   actualRenderCount:renderer.renderCount,switchedAtRenderCount:switchedAt,
   triangles:{originalNear:trees*408,experimentNear:trees*408,originalFar:trees*204,experimentFar:trees*102},
   extraSourceVertexBytes:[...clones.values(),...farArrays.values()].reduce((sum, a) => sum + a.byteLength, 0),
   extraUVBytes:[...uvByArray.values()].reduce((sum, a) => sum + a.byteLength, 0),
   textures:resources ? {count:2,width:resources.atlas.size,height:resources.atlas.size,cpuMipBytes:resources.atlas.bytes,alphaTest:resources.atlas.alphaTest,baseCoverage:resources.atlas.baseCoverage,mipCoverage:resources.atlas.coverage} : {count:0,cpuMipBytes:0},
   note:'Source bytes/object counts are not physical VRAM or FPS; no baked light, new shadow target or new lamp.'};
 }
 const controller = {
  setMode(next) {
   if (disposed) throw new Error('Experimental controller was disposed');
   if (!['original', 'texture'].includes(next)) throw new Error('Use original or texture mode');
   if (next !== mode) { if (next === 'texture') enable(); else disable(); }
   return info();
  }, ready, info,
  dispose(redraw = true) {
   if (disposed) return; disable(redraw); disposed = true; installed.delete(renderer);
   if (renderer.__foliageTextureExperimentOwner === controller) delete renderer.__foliageTextureExperimentOwner;
   if (renderer.dispose === lifetimeDispose) {
    if (disposeDescriptor) Object.defineProperty(renderer, 'dispose', disposeDescriptor); else delete renderer.dispose;
   }
  }
 };
 // Keep this one lifecycle hook while A is selected too. It allocates no GPU
 // resources and invalidates old handles before the original renderer closes.
 const originalDispose = renderer.dispose, disposeDescriptor = Object.getOwnPropertyDescriptor(renderer, 'dispose');
 const lifetimeDispose = function (...args) { closedRenderers.add(this); controller.dispose(false); return originalDispose.apply(this, args); };
 Object.defineProperty(renderer, 'dispose', {value:lifetimeDispose,writable:true,configurable:true,enumerable:disposeDescriptor?.enumerable ?? false});
 Object.defineProperty(renderer, '__foliageTextureExperimentOwner', {value:controller,configurable:true});
 installed.set(renderer, controller); return controller;
}
G.KOURINDOU_FOLIAGE_TEXTURE = Object.freeze({version:'1.2',install,pairedFar,atlasUV,material:MATERIAL});
})(globalThis.GA || (globalThis.GA = {}));
