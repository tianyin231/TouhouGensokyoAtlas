/* Opt-in forest canopy experiment against the retained v0.14 tree locations.
 * Three-dimensional card sprays replace leaf ellipsoids; wood and matrices stay.
 * Load the isolated atlas generator first, then:
 *   const ab = GA.FOREST_FOLIAGE_TEXTURE.install(ATLAS.renderer);
 *   ab.setMode('texture'); ab.ready(); ab.info(); ab.setMode('original');
 * This handle owns one loaded forest detail session. Dropping that pack disposes
 * the handle and all experiment references. Reinstall after the next forest load.
 * Kourindou and forest experiments are mutually exclusive; dispose before swap.
 */
(function (G) {
'use strict';
const MATERIAL = 'experimentForestFoliage', TARGET = /^forest:trees:.*:[012]:leaf$/;
const installed = new WeakMap(), closedRenderers = new WeakSet();
const SEEDS = [134, 591, 833], QUAD = [0,0,1,0,1,1,0,0,1,1,0,1], CORNERS = [0,1,2,0,2,3];
const WIND = `
vec3 phaseP=position;
#ifdef USE_INSTANCING
 phaseP=(instanceMatrix*vec4(position,1.)).xyz;
#endif
float sway=smoothstep(4.,22.,position.y)*.16;
transformed.x+=sin(uWind*.64+phaseP.x*.051+phaseP.z*.030)*sway;
transformed.z+=cos(uWind*.53+phaseP.z*.047)*sway*.5;
`;
const add = (a, b) => a.map((v, k) => v + b[k]), sub = (a, b) => a.map((v, k) => v - b[k]), mul = (a, s) => a.map(v => v * s);

function legacyClusters(variant) {
 if (!SEEDS[variant]) throw new Error('Unknown retained forest tree variant');
 const R = G.rng(SEEDS[variant]), h = 14 + R() * 5, lean = (R() - .5) * 2, clusters = [];
 for (let i = 0; i < 7; i++) {
  const a = i * 2.4, X = Math.cos(a) * (3.6 + R() * 2), Z = Math.sin(a) * (3.2 + R() * 2), Y = h * .64 + R() * 4;
  clusters.push({center:[X,Y+1,Z],radii:[3.5+R(),2.4+R()*.8,3.3+R()],satellite:false,color:[1,1,1]});
  for (let j = 0; j < 3; j++) clusters.push({center:[X+Math.cos(j*2.4)*2,Y+1+j%2,Z+Math.sin(j*2.4)*2],radii:[1.6,1.2,1.45],satellite:true,color:[.89,.97,.83]});
 }
 clusters.push({center:[lean,h+.2,0],radii:[3.6,2.4,3.2],satellite:false,color:[1,1,1]});
 return clusters;
}
function atlasUV(count) {
 const A = G.KOURINDOU_FOLIAGE_ATLAS, uv = new Float32Array(count * 12), span = A.tileSize - A.gutter * 2 - 1;
 for (let card = 0; card < count; card++) {
  const tile = card % 4, x = tile % 2 * A.tileSize + A.gutter + .5, y = Math.floor(tile / 2) * A.tileSize + A.gutter + .5;
  for (let j = 0; j < 6; j++) { uv[card*12+j*2]=(x+QUAD[j*2]*span)/A.size; uv[card*12+j*2+1]=(y+QUAD[j*2+1]*span)/A.size; }
 }
 return uv;
}
function prototype(variant, far = false) {
 const g = new G.Geometry(), clusters = legacyClusters(variant);
 for (let cluster = 0; cluster < clusters.length; cluster++) {
  const c = clusters[cluster]; if (far && c.satellite) continue;
  const R = G.rng(918031 + variant * 1769 + cluster * 173), count = c.satellite ? 8 : 24;
  const keep = new Set(Array.from({length:10}, (_, i) => Math.floor(i * 24 / 10))), phase = R() * Math.PI * 2;
  for (let i = 0; i < count; i++) {
   const y = 1 - 2 * (i + .5) / count, a = phase + i * 2.399963, horizontal = Math.sqrt(1 - y * y);
   const direction = [Math.cos(a)*horizontal,y,Math.sin(a)*horizontal], depth = .52 + R() * .19;
   const point = c.center.map((v, k) => v + direction[k] * c.radii[k] * depth);
   const yaw = a + (R() - .5) * .42, tilt = .32 + R() * 1.15;
   const width = c.radii[0] * (1.04 + R() * .17), height = c.radii[1] * (1.48 + R() * .14), shade = .94 + R() * .10;
   if (far && !keep.has(i)) continue;
   const w = width * (far ? 1.22 : 1), h = height * (far ? 1.18 : 1);
   const u = [Math.cos(yaw)*w*.5,0,Math.sin(yaw)*w*.5], v = [Math.sin(yaw)*Math.cos(tilt)*h*.5,Math.sin(tilt)*h*.5,-Math.cos(yaw)*Math.cos(tilt)*h*.5];
   const n = G.norm(G.cross(u,v)), normal = G.norm([n[0]*.55,Math.abs(n[1])+.38,n[2]*.55]);
   const points = [sub(sub(point,u),v),sub(add(point,u),v),add(add(point,u),v),add(sub(point,u),v)];
   for (const corner of CORNERS) g.vertex(points[corner],normal,c.color.map(value=>value*shade));
  }
 }
 const vertices = g.mesh('forest-experiment-cards').vertices;
 const expected = far ? 160 : 720;
 if (vertices.length !== expected * 27) throw new Error('Forest card budget changed');
 const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
 for(let i=0;i<vertices.length;i+=9)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],vertices[i+k]);hi[k]=Math.max(hi[k],vertices[i+k]);}
 return {vertices,uv:atlasUV(vertices.length/54),clusters:clusters.length,triangles:expected,bounds:{lo,hi}};
}
function selected(renderer) { return renderer.records.filter(record => TARGET.test(record.data.id) && record.data.component === 'forest-canopy'); }
function install(renderer) {
 if (closedRenderers.has(renderer) || renderer?.__foliageTextureExperimentClosed || renderer?.diagnosticDisposed) throw new Error('Cannot install forest experiment on a disposed renderer');
 if (installed.has(renderer)) return installed.get(renderer);
 if (renderer?.__foliageTextureExperimentOwner) throw new Error('Dispose the other foliage experiment before installing forest');
 if (!G.KOURINDOU_FOLIAGE_ATLAS || !renderer?.geometryRefs || !renderer.mats?.forestLeaf) throw new Error('Forest renderer and atlas generator are required');
 let entries = selected(renderer).map(record => ({record,original:record.data,replacement:null}));
 if (!entries.length) throw new Error('Wait for the forest detail pack before installing the forest experiment');
 for (const {original:m} of entries) {
  if (m.material!=='forestLeaf' || m.vertices.length!==2400*27 || m.farVertices?.length!==280*27 || m.index || !m.instances || m.instances.length%16 || m.instanceColors?.length!==m.instances.length/16*3 || m.lodDistance!==280)
   throw new Error('Retained forest canopy changed: '+m.id);
 }
 if (new Set(entries.map(entry=>entry.record.pack)).size!==1) throw new Error('The forest experiment owns exactly one detail pack session');
 if (renderer.mats[MATERIAL]) throw new Error('Experimental forest material name already exists');
 const sourceMetrics = () => {
  const seen=new Set(); let near=0,far=0,bytes=0;
  for (const {original:m} of entries) {const count=m.instances.length/16;near+=m.vertices.length/27*count;far+=m.farVertices.length/27*count;
   for (const array of [m.vertices,m.farVertices]) if (!seen.has(array)) {seen.add(array);bytes+=array.byteLength;}}
  return {near,far,bytes};
 };
 let mode='original',generation=0,switchedAt=-1,disposed=false,resources=null,lastError=null;
 const hooks=new Map(),lifetimeHooks=new Map(),models=new Map(),uvByArray=new Map();
 function patch(registry,name,factory) {
  const original=renderer[name],descriptor=Object.getOwnPropertyDescriptor(renderer,name),wrapped=factory(original);
  registry.set(name,{descriptor,wrapped});Object.defineProperty(renderer,name,{value:wrapped,writable:true,configurable:true,enumerable:descriptor?.enumerable??false});
 }
 function restore(registry) {
  for (const [name,{descriptor,wrapped}] of registry) if (renderer[name]===wrapped) {
   if (descriptor) Object.defineProperty(renderer,name,descriptor);else delete renderer[name];
  }
  registry.clear();
 }
 function wake() {renderer.engine.shadowMap.needsUpdate=true;renderer.mirrorLast=null;if(globalThis.ATLAS?.renderer===renderer)globalThis.ATLAS.wake();}
 function makeResources() {
  const T=renderer.T,source=renderer.mats.forestLeaf,atlas=G.KOURINDOU_FOLIAGE_ATLAS.create({preserveFarCoverage:true}),owned=[];
  try {
   const texture=(mips,colorSpace,name)=>{const t=new T.DataTexture(mips[0].data,atlas.size,atlas.size,T.RGBAFormat,T.UnsignedByteType);owned.push(t);
    t.name=name;t.colorSpace=colorSpace;t.mipmaps=mips;t.generateMipmaps=false;t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;
    t.wrapS=t.wrapT=T.ClampToEdgeWrapping;t.flipY=false;t.needsUpdate=true;return t;};
   const color=texture(atlas.colorMips,T.SRGBColorSpace,'forest-experiment-albedo-alpha'),normal=texture(atlas.normalMips,T.NoColorSpace,'forest-experiment-leaf-normal');
   const mat=source.clone();owned.push(mat);mat.name=MATERIAL;mat.map=color;mat.alphaMap=null;mat.normalMap=normal;mat.normalScale.set(.22,.22);
   mat.alphaTest=atlas.alphaTest;mat.alphaToCoverage=false;mat.transparent=false;mat.depthWrite=true;mat.side=T.DoubleSide;
   const prior=source.onBeforeCompile,sourceKey=source.customProgramCacheKey.bind(source);
   mat.onBeforeCompile=(shader,webgl)=>{prior.call(source,shader,webgl);shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
    #if NUM_HEMI_LIGHTS > 0 && defined(RE_IndirectDiffuse)
     vec3 forestFront=getHemisphereLightIrradiance(hemisphereLights[0],geometryNormal);
     vec3 forestBack=getHemisphereLightIrradiance(hemisphereLights[0],-geometryNormal);
     reflectedLight.indirectDiffuse+=diffuseColor.rgb*max(forestBack-forestFront,vec3(0.))*RECIPROCAL_PI*.38;
    #endif`);};
   mat.customProgramCacheKey=()=>sourceKey()+'-forest-atlas-cards-1';
   const depth=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,map:color,alphaTest:mat.alphaTest,side:T.DoubleSide});owned.push(depth);
   const distance=new T.MeshDistanceMaterial({map:color,alphaTest:mat.alphaTest,side:T.DoubleSide});owned.push(distance);
   for (const [name,material] of [['Depth',depth],['Distance',distance]]) {
    material.name=MATERIAL+name;material.onBeforeCompile=shader=>{shader.uniforms.uWind=renderer.timeUniform;
     shader.vertexShader='uniform float uWind;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n'+WIND);};
    material.customProgramCacheKey=()=> 'forest-atlas-'+name.toLowerCase()+'-wind-1';
   }
   return {atlas,color,normal,mat,depth,distance,owned};
  } catch (error) {for(const resource of owned)resource.dispose();throw error;}
 }
 function clearResources() {
  if(resources){if(renderer.mats[MATERIAL]===resources.mat)delete renderer.mats[MATERIAL];for(const resource of resources.owned)resource.dispose();resources=null;}
  models.clear();uvByArray.clear();for(const entry of entries)entry.replacement=null;
 }
 function disable(redraw=true) {
  if(mode==='original'&&!resources&&!hooks.size&&!models.size&&!uvByArray.size&&entries.every(entry=>!entry.replacement))return;
  for(const entry of entries)if(entry.record.data===entry.replacement){renderer.evict(entry.record);entry.record.data=entry.original;}
  mode='original';restore(hooks);clearResources();renderer.engine.renderLists.dispose();generation++;switchedAt=renderer.renderCount;if(redraw)wake();
 }
 function enable() {
  try {
   for(const entry of entries){const m=entry.original;
    if(renderer.recordMap.get(m.id)!==entry.record||entry.record.data!==m)throw new Error('Forest detail session changed; reinstall the experiment');
    const variant=Number(m.id.match(/:([012]):leaf$/)[1]);
    if(!models.has(variant)){const near=prototype(variant),far=prototype(variant,true);models.set(variant,{near,far});uvByArray.set(near.vertices,near.uv);uvByArray.set(far.vertices,far.uv);}
    const {near,far}=models.get(variant);
    // A sphere is convex: enclosing all eight transformed prototype-box corners
    // conservatively encloses every card without expanding the retained bound.
    for(let offset=0;offset<m.instances.length;offset+=16)for(const model of [near,far]){
     const matrix=m.instances.subarray(offset,offset+16),inside=point=>Math.hypot(...G.transform(matrix,point).slice(0,3).map((v,k)=>v-m.center[k]))<=m.radius;
     let boxFits=true;for(let corner=0;corner<8;corner++)if(!inside(model.bounds.lo.map((v,k)=>corner&(1<<k)?model.bounds.hi[k]:v))){boxFits=false;break;}
     if(!boxFits)for(let i=0;i<model.vertices.length;i+=9)if(!inside(Array.from(model.vertices.subarray(i,i+3))))throw new Error('Textured forest canopy left its retained record bound: '+m.id);
    }
    // Keep material=forestLeaf in the data so the original animation scheduler
    // still recognises these leaves. The scoped material hook selects B's PBR.
    entry.replacement={...m,vertices:near.vertices,farVertices:far.vertices,forestFoliageTextureExperiment:true};
   }
   resources=makeResources();renderer.mats[MATERIAL]=resources.mat;
   patch(hooks,'geometry',original=>function(array){const geometry=original.call(this,array),uv=uvByArray.get(array);if(uv&&!geometry.getAttribute('uv'))geometry.setAttribute('uv',new this.T.BufferAttribute(uv,2));return geometry;});
   patch(hooks,'acquire',original=>function(array){const had=this.geometryRefs.has(array),geometry=original.call(this,array),uv=uvByArray.get(array);if(!had&&uv){const allocation=this.geometryRefs.get(array);allocation.bytes+=uv.byteLength;this.residentBytes+=uv.byteLength;}return geometry;});
   patch(hooks,'material',original=>function(data){return data.forestFoliageTextureExperiment?resources.mat:original.call(this,data);});
   patch(hooks,'ensure',original=>function(record,level){const mesh=original.call(this,record,level);if(record.data.forestFoliageTextureExperiment){mesh.customDepthMaterial=resources.depth;mesh.customDistanceMaterial=resources.distance;}return mesh;});
   patch(hooks,'lighting',original=>function(...args){const result=original.apply(this,args),source=this.mats.forestLeaf;resources.mat.envMap=source.envMap;resources.mat.envMapIntensity=source.envMapIntensity;return result;});
   for(const entry of entries){renderer.evict(entry.record);entry.record.data=entry.replacement;}
   mode='texture';generation++;switchedAt=renderer.renderCount;lastError=null;wake();
  }catch(error){lastError=error.message;disable(false);throw error;}
 }
 function ready() {
  if(disposed||renderer.contextLost||renderer.recovery?.pending||renderer.renderCount<=switchedAt)return false;
  return entries.every(entry=>{const record=entry.record;if(renderer.recordMap.get(entry.original.id)!==record||record.data!==(mode==='texture'?entry.replacement:entry.original))return false;
   if(!record.item?.mesh.visible)return true;const mesh=record.item.mesh;return mode!=='texture'||mesh.material===resources.mat&&mesh.customDepthMaterial===resources.depth&&mesh.customDistanceMaterial===resources.distance&&!!mesh.geometry.getAttribute('uv');});
 }
 function info() {
  const trees=entries.reduce((sum,entry)=>sum+entry.original.instances.length/16,0),source=sourceMetrics();
  const visible=entries.filter(entry=>entry.record.item?.mesh.visible).map(entry=>({id:entry.original.id,level:entry.record.level,instances:entry.original.instances.length/16}));
  return {version:1,kind:'forest',mode,generation,disposed,lastError,ready:ready(),sessionPack:entries[0]?.record.pack??null,
   targetIds:entries.map(entry=>entry.original.id),trees,visible,lodSignature:visible.map(v=>v.id+':'+v.level).join('|'),
   actualRenderCount:renderer.renderCount,switchedAtRenderCount:switchedAt,material:mode==='texture'?MATERIAL:'forestLeaf',
   triangles:{originalNear:source.near,experimentNear:trees*720,originalFar:source.far,experimentFar:trees*160},
   sourceVertexBytes:{original:source.bytes,experiment:[...models.values()].reduce((sum,p)=>sum+p.near.vertices.byteLength+p.far.vertices.byteLength,0)},
   extraSourceVertexBytes:[...models.values()].reduce((sum,p)=>sum+p.near.vertices.byteLength+p.far.vertices.byteLength,0),
   extraUVBytes:[...uvByArray.values()].reduce((sum,array)=>sum+array.byteLength,0),
   textures:resources?{count:2,width:resources.atlas.size,height:resources.atlas.size,cpuMipBytes:resources.atlas.bytes,alphaTest:resources.atlas.alphaTest,baseCoverage:resources.atlas.baseCoverage,mipCoverage:resources.atlas.coverage}:{count:0,cpuMipBytes:0},
   nearClusters:29,farClusters:8,lodDistance:280,farCoveragePreserved:true,wind:'existing uWind/math shared by color, depth and distance; no new clock',
   note:'This handle disposes when its forest detail pack drops. Reinstall after reload. Counts are not FPS or physical VRAM.'};
 }
 const controller={
  setMode(next){if(disposed)throw new Error('Forest experimental controller was disposed; reinstall after forest reload');if(!['original','texture'].includes(next))throw new Error('Use original or texture mode');if(next!==mode){if(next==='texture')enable();else disable();}return info();},ready,info,
  dispose(redraw=true){if(disposed)return;disable(redraw);disposed=true;installed.delete(renderer);restore(lifetimeHooks);entries.length=0;if(renderer.__foliageTextureExperimentOwner===controller)delete renderer.__foliageTextureExperimentOwner;}
 };
 patch(lifetimeHooks,'dropPack',original=>function(id){if(entries.some(entry=>entry.record.pack===id))controller.dispose(false);return original.call(this,id);});
 patch(lifetimeHooks,'dispose',original=>function(...args){closedRenderers.add(this);Object.defineProperty(this,'__foliageTextureExperimentClosed',{value:true,configurable:true});controller.dispose(false);return original.apply(this,args);});
 Object.defineProperty(renderer,'__foliageTextureExperimentOwner',{value:controller,configurable:true});installed.set(renderer,controller);return controller;
}
G.FOREST_FOLIAGE_TEXTURE=Object.freeze({version:1,install,prototype,legacyClusters,material:MATERIAL});
})(globalThis.GA || (globalThis.GA={}));
