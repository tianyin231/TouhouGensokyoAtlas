// Actual renderer methods and Three.js CPU resources; no region build or WebGL.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import * as T from '../vendor/three/three.module.js';

const digest=a=>createHash('sha256').update(new Uint8Array(a.buffer,a.byteOffset,a.byteLength)).digest('hex');
class CanvasDouble{
 constructor(w,h){this.width=w;this.height=h;}
 getContext(){return new Proxy({},{get(target,key){return target[key]??(()=>{});},set(target,key,value){target[key]=value;return true;}});}
}
function method(proto,name){while(proto){if(Object.hasOwn(proto,name))return proto[name];proto=Object.getPrototypeOf(proto);}throw Error('Missing production method '+name);}
function nearest(F,values,x,z){let d=Infinity;for(let i=0;i<values.length;i+=4)d=Math.min(d,F.distance([x,z],[values[i]+F.origin[0],values[i+1]+F.origin[1]],[values[i+2]+F.origin[0],values[i+3]+F.origin[1]]));return d;}

export function checkTrailLandscapeRenderer(G,read){
 let now=100;const scope=vm.createContext({GA:{...G},performance:{now:()=>now*1000},OffscreenCanvas:CanvasDouble});
 const rendererSource=String(read('src/renderer.js'));
 vm.runInContext(rendererSource,scope,{filename:'src/renderer.js'});
 const Production=scope.GA.DioramaRenderer,adaptive=method(Production.prototype,'patchMaterials');
 const contactStart=rendererSource.indexOf('const ground=this.mats.ground,prior=ground.onBeforeCompile;ground.onBeforeCompile='),contactEnd=rendererSource.indexOf("ground.customProgramCacheKey=()=> 'ground-contact-v014';",contactStart);
 assert(contactStart>=0&&contactEnd>contactStart,'Review the production ground callback boundary');
 const contact=rendererSource.slice(contactStart,contactEnd+"ground.customProgramCacheKey=()=> 'ground-contact-v014';".length);
 class Base{
  constructor(THREE,canvas,world){this.T=THREE;this.canvas=canvas;this.world=world;this.mats={};for(const name of ['matte','ground','paving'])this.mats[name]=new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:.95});
   this.cutUniform={value:0};this.mistUniform={value:0};this.coverUniform={value:0};this.timeUniform={value:0};adaptive.call(this);
   // Run the unmodified constructor statement, without constructing its GPU engine.
   scope.__trailGroundOwner=this;try{vm.runInContext('(function(){'+contact+'}).call(__trailGroundOwner)',scope);}finally{delete scope.__trailGroundOwner;}
   this.scene=new T.Scene();this.studioEnv={texture:new T.Texture()};this.scene.environment=this.studioEnv.texture;this.engine={shadowMap:{needsUpdate:false},renderLists:{dispose(){}}};
   this.cache=new Map();this.geometryRefs=new Map();this.indexByArray=new Map();this.records=[];this.recordMap=new Map();this.objects=[];this.packs=new Map();this.signObjects=[];this.residentBytes=0;this.evictions=0;this.uploads=0;this.quality='balanced';this.graceSeconds=6;this.attributeBudget=160*1048576;
   // Exercise construction-time virtual dispatch before the trail layer has fields.
   this.addRecords(world.meshes,'overview');this.material({id:'outside',material:'ground',center:[0,0,0],radius:1});
  }
  lighting(rig,opts){for(const m of Object.values(this.mats))m.envMapIntensity=opts.lighting==='night'?.035:.21;}
  dispose(){for(const r of this.records)this.evict(r);for(const m of Object.values(this.mats))m.dispose();this.studioEnv.texture.dispose();}
 }
 for(const name of ['geometry','addRecords','acquire','release','material','ensure','evict','attachPack','dropPack','levelFor','trim'])Base.prototype[name]=method(Production.prototype,name);
 scope.GA.DioramaRenderer=Base;
 vm.runInContext(String(read('src/hakurei-renderer.js')),scope,{filename:'src/hakurei-renderer.js'});
 vm.runInContext(String(read('src/trail-landscape-renderer.js')),scope,{filename:'src/trail-landscape-renderer.js'});
 const F=scope.GA.TRAIL_LANDSCAPE_RENDERER,Renderer=F.TrailLandscapeRenderer,lines=F.segments();
 assert(lines.routeCount+lines.streamCount<=F.segmentBudget);assert.equal(lines.bytes,(lines.routeCount+lines.streamCount)*16);
 assert.throws(()=>F.segments([],G.streamX),/retained shrine route/);assert.throws(()=>F.segments([[810,150],[NaN,160]],G.streamX),/Invalid/);
 const tooMany=Array.from({length:100},(_,i)=>[830+i*2,180+(i%2)*20]);assert.throws(()=>F.segments(tooMany,G.streamX),/segment budget/,'Hard cap must reject rather than discard segments');
 const route=G.routes.find(r=>r.id==='route-shrine').samples;let routeSamples=0,routeError=0,streamError=0;
 for(let i=1;i<route.length;i++)for(const u of [0,.25,.5,.75,1]){const x=route[i-1][0]+(route[i][0]-route[i-1][0])*u,z=route[i-1][1]+(route[i][1]-route[i-1][1])*u;if(F.weight(x,z)<=0)continue;const d=nearest(F,lines.route,x,z);routeError=Math.max(routeError,d);routeSamples++;assert(d<=.2,'Retained route/RDP deviation exceeds 20cm');}
 for(let z=127;z<=261;z+=.25){const d=nearest(F,lines.stream,G.streamX(z),z);streamError=Math.max(streamError,d);assert(d<=.2,'Retained analytical creek deviation exceeds 20cm');}
 assert(routeSamples>100);assert.equal(F.weight(810,125),1);assert.equal(F.weight(1145,330),1);assert.equal(F.weight(790,225),0);assert.equal(F.weight(1165,225),0);assert.equal(F.weight(975,105),0);assert.equal(F.weight(975,350),0);assert.equal(F.weight(800,225),.5);assert.equal(F.weight(1161,346),0);
 const quad=(x=0,color=[1,1,1])=>{const g=new G.Geometry();g.quad([x,0,0],[x+1,0,0],[x+1,1,0],[x,1,0],color);return Float32Array.from(g.a);};
 const model=(id,material,vertices=quad(),farVertices=quad(2))=>({id,group:'vegetation',material,leafCards:!!F.cards[material],vertices,farVertices,center:[975,30,225],radius:30,instances:Float32Array.from(G.instanceMatrix(975,30,225,1,1,1)),instanceColors:new Float32Array([.48,.61,.39])});
 const shared=model('trail:test:leaf-a','trailLeaf'),second={...shared,id:'trail:test:leaf-b',instances:shared.instances.slice(),instanceColors:shared.instanceColors.slice()};
 const needle=model('trail:test:needle','trailNeedle'),cherry=model('trail:test:cherry','trailCherry');
 const island={...model('island:terrain:test','ground'),group:'terrain',component:'island-terrain',globalSurface:true,leafCards:false,instances:null,instanceColors:null};
 const r=new Renderer(T,null,{meshes:[island]}),sourceTextures=r.hakureiMasks.slice(),sources=Object.fromEntries(Object.values(F.cards).map(name=>[name,r.hakureiCardMaterials[name]]));
 const snapshots=new Map(Object.values(sources).map(m=>[m,{map:m.map,alphaMap:m.alphaMap,alphaTest:m.alphaTest,alphaToCoverage:m.alphaToCoverage,color:m.color.toArray(),envMap:m.envMap,key:m.customProgramCacheKey()}]));
 for(const [name,sourceName]of Object.entries(F.cards)){const m=r.mats[name],source=sources[sourceName],depth=r.hakureiCardDepth[name];assert.notEqual(m,source);assert.notEqual(depth,r.hakureiCardDepth[sourceName]);assert.equal(m.map,source.map);assert.equal(m.alphaMap,source.alphaMap);assert.equal(m.envMap,null);assert.equal(m.alphaToCoverage,false);assert.equal(m.transparent,false);assert.deepEqual(m.color.toArray(),[1,1,1]);assert.equal(depth.alphaMap,m.alphaMap);assert.equal(depth.map,m.map);assert.equal(depth.alphaTest,m.alphaTest);assert.equal(depth.side,m.side);assert.equal(depth.alphaToCoverage,false);assert.equal(m.onBeforeCompile,source.onBeforeCompile);assert.equal(m.customProgramCacheKey(),source.customProgramCacheKey());}
 assert.equal(r.mats.trailBark.envMap,null);assert.notEqual(r.mats.trailBark,r.mats.hakureiBark);assert.equal(r.hakureiMasks.length,sourceTextures.length);
 r.attachPack({id:'trail',meshes:[shared,second,needle,cherry],signs:[]});const nearBytes=shared.vertices.byteLength+48;
 const oldSources=[shared,second,needle,cherry].map(m=>({m,near:digest(m.vertices),far:digest(m.farVertices),instances:digest(m.instances),colors:digest(m.instanceColors)}));
 const a=r.recordMap.get(shared.id),b=r.recordMap.get(second.id),first=r.ensure(a,0),again=r.ensure(b,0),allocation=r.geometryRefs.get(shared.vertices);
 assert.equal(first.geometry,again.geometry);assert.equal(allocation.refs,2);assert.equal(allocation.bytes,nearBytes);assert.equal(first.customDepthMaterial,r.hakureiCardDepth.trailLeaf);assert.deepEqual(Array.from(first.geometry.getAttribute('uv').array),[0,0,1,0,1,1,0,0,1,1,0,1]);
 const savedResident=r.residentBytes;r.ensure(a,0);r.acquire(shared.vertices);assert.equal(r.residentBytes,savedResident);r.release(shared.vertices);assert.equal(r.residentBytes,savedResident);
 r.ensure(a,1);assert.equal(r.geometryRefs.get(shared.vertices).refs,1);assert.equal(r.geometryRefs.get(shared.farVertices).bytes,shared.farVertices.byteLength+48);assert.equal(a.item.mesh.customDepthMaterial,r.hakureiCardDepth.trailLeaf);r.ensure(a,0);assert(!r.geometryRefs.has(shared.farVertices));
 // UV failures happen before publishing/switching a mesh; production rollback holds.
 const setAttribute=T.BufferGeometry.prototype.setAttribute,fail=model('trail:test:fault','trailLeaf');r.addRecords([fail],'fault');const f=r.recordMap.get(fail.id);let faultChecks=0;
 T.BufferGeometry.prototype.setAttribute=function(name,value){if(name==='uv')throw Error('injected UV');return setAttribute.call(this,name,value);};
 try{assert.throws(()=>r.ensure(f,0),/injected UV/);faultChecks++;assert.equal(f.item,null);assert(!r.geometryRefs.has(fail.vertices));assert.equal(r.residentBytes,savedResident);}finally{T.BufferGeometry.prototype.setAttribute=setAttribute;}
 r.ensure(f,0);const oldArray=f.array,oldGeo=f.item.mesh.geometry,oldBytes=r.residentBytes;
 T.BufferGeometry.prototype.setAttribute=function(name,value){if(name==='uv')throw Error('injected UV');return setAttribute.call(this,name,value);};
 try{assert.throws(()=>r.ensure(f,1),/injected UV/);faultChecks++;assert.equal(f.array,oldArray);assert.equal(f.level,0);assert.equal(f.item.mesh.geometry,oldGeo);assert(!r.geometryRefs.has(fail.farVertices));assert.equal(r.residentBytes,oldBytes);}finally{T.BufferGeometry.prototype.setAttribute=setAttribute;}
 r.evict(f);assert.equal(r.residentBytes,savedResident);
 assert.throws(()=>r.addRecords([{...fail,id:'bad',vertices:fail.vertices.subarray(0,27)}],'bad'),/six-vertex/);assert(!r.recordMap.has('bad'));assert.throws(()=>r.addRecords([{...fail,id:'missing',vertices:null}],'bad'),/six-vertex/);assert(!r.recordMap.has('missing'));
 const ground=r.material(island),native=r.material({...island,id:'mystia-house:ground:test',globalSurface:false,component:null}),outside={...island,id:'island:outside',center:[0,0,0],radius:10};
 assert.notEqual(ground,r.mats.ground);assert.equal(r.material(outside),r.mats.ground);assert.equal(r.material({...island,space:'senkai'}),r.mats.ground);assert.equal(r.material({...island,material:'matte'}),r.mats.matte);assert.equal(ground.envMap,null);assert.equal(native.envMap,null);assert.equal(ground.customProgramCacheKey(),native.customProgramCacheKey());assert.equal(r.trailGroundVariants.size,2);assert.equal(r.material(island),ground);
 const shader=()=>({uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader});
 const originalShader=shader();r.mats.ground.onBeforeCompile(originalShader,null);assert(!originalShader.fragmentShader.includes('trailSoilNoise'));
 for(const [isNative,mat]of [[0,ground],[1,native]]){const s=shader();mat.onBeforeCompile(s,null);assert.equal(s.uniforms.uTrailRoute.value,r.trailLandscapeLines.route);assert.equal(s.uniforms.uTrailCreek.value,r.trailLandscapeLines.stream);assert.equal(s.uniforms.uTrailNativeGround.value,isNative);
  const at=s.fragmentShader.indexOf('if(trailArea>0.)'),width=s.fragmentShader.indexOf('fwidth(trailSoilP)'),normal=s.fragmentShader.indexOf('dFdx(vAtlasPosition)');assert(at>0);assert(width>=0&&width<at);assert(normal>=0&&normal<at);assert(s.fragmentShader.indexOf('for(int i=0;i<'+lines.routeCount+';i++)')>at);assert(s.fragmentShader.indexOf('for(int i=0;i<'+lines.streamCount+';i++)')>at);assert(s.fragmentShader.includes('uAtlasCut'));assert(s.fragmentShader.includes('localCover'));assert(s.fragmentShader.includes('reflectedLight.indirectDiffuse*=1.-contact*.18;'));assert(s.fragmentShader.includes('uTrailNativeGround>.5'));assert(s.fragmentShader.includes('trailVertexColor=vColor.rgb'));assert(s.fragmentShader.includes('smoothstep(2.25,4.8,trailRoadDistance'));assert(s.fragmentShader.includes('smoothstep(2.2,8.,trailCreekDistance'));assert(s.fragmentShader.includes('trailGrass=vec3(.225,.277,.158)*trailTone'));assert(s.fragmentShader.includes('trailSoilP*.035)-.5)*.02*trailDetail'));assert(!s.fragmentShader.includes('trailLitter'));assert(!s.fragmentShader.includes('trailLeafBed'));assert(!s.fragmentShader.includes('trailMacro'));assert(!s.fragmentShader.includes('trailSoilP*3.'));assert(!s.fragmentShader.includes('uWind'));
 }
 for(const name of ['trailBark',...Object.keys(F.cards)]){const s=shader();r.mats[name].onBeforeCompile(s,null);assert(s.fragmentShader.includes('vHakureiWorld'));assert(s.fragmentShader.includes('#include <alphatest_fragment>'));assert(s.fragmentShader.includes('uAtlasCut'));}
 const module=String(read('vendor/three/three.module.js'));assert(module.includes('result.alphaMap = material.alphaMap;'));assert(module.includes('result.map = material.map;'));assert(module.includes('result.alphaTest = ( material.alphaToCoverage === true ) ? 0.5 : material.alphaTest;'),'Review automatic distance shadow cutout');
 let lightingChecks=0;for(const intensity of [1,.045,1]){r.scene.environmentIntensity=intensity;r.lighting({}, {lighting:intensity===.045?'night':'neutral'},100);assert.equal(r.scene.environmentIntensity,intensity);for(const name of ['trailBark',...Object.keys(F.cards)])assert.equal(r.mats[name].envMap,null);assert.equal(ground.envMap,null);lightingChecks++;}
 const masksBeforeRecovery=r.hakureiMasks.slice(),newEnvironment=new T.Texture();vm.runInContext(String(read('src/render-recovery.js')),scope,{filename:'src/render-recovery.js'});let oldDisposals=0;r.studioEnv.dispose=()=>oldDisposals++;r.makeStudioEnvironment=()=>{r.studioEnv={texture:newEnvironment};r.scene.environment=newEnvironment;};r.recovery={pending:true,rebuilt:0,lastError:null};scope.GA.DioramaRenderer.prototype.rebuildContextCaches.call(r);assert.equal(oldDisposals,1);assert.equal(r.scene.environment,newEnvironment);assert.equal(r.mats.hakureiLeaf.envMap,newEnvironment);assert.equal(r.mats.trailLeaf.envMap,null);assert.equal(ground.envMap,null);assert.equal(r.hakureiMasks.length,masksBeforeRecovery.length);assert(masksBeforeRecovery.every((t,i)=>r.hakureiMasks[i]===t));assert.equal(r.recovery.rebuilt,1);
 for(const {m,near,far,instances,colors}of oldSources){assert.equal(digest(m.vertices),near);assert.equal(digest(m.farVertices),far);assert.equal(digest(m.instances),instances);assert.equal(digest(m.instanceColors),colors);}
 for(const [source,snapshot]of snapshots){assert.equal(source.map,snapshot.map);assert.equal(source.alphaMap,snapshot.alphaMap);assert.equal(source.alphaTest,snapshot.alphaTest);assert.equal(source.alphaToCoverage,snapshot.alphaToCoverage);assert.deepEqual(source.color.toArray(),snapshot.color);assert.equal(source.customProgramCacheKey(),snapshot.key);}
 r.dropPack('trail');assert(!r.geometryRefs.has(shared.vertices));assert(!r.geometryRefs.has(shared.farVertices));assert.equal(r.residentBytes,0);
 for(let i=0;i<3;i++){const fresh={...shared,vertices:shared.vertices.slice(),farVertices:shared.farVertices.slice()};r.attachPack({id:'trail',meshes:[fresh],signs:[]});const record=r.recordMap.get(fresh.id);for(const quality of ['low','balanced','high']){r.quality=quality;r.ensure(record,quality==='low'?1:0);assert(record.item.mesh.geometry.getAttribute('uv'));assert.equal(record.item.mesh.customDepthMaterial,r.hakureiCardDepth.trailLeaf);}r.dropPack('trail');assert.equal(r.residentBytes,0);assert.equal(r.geometryRefs.size,0);}
 const trimA={...shared,vertices:shared.vertices.slice(),farVertices:shared.farVertices.slice()},trimB={...trimA,id:'trail:test:trim-b'};r.attachPack({id:'trail',meshes:[trimA,trimB],signs:[]});const ra=r.recordMap.get(trimA.id),rb=r.recordMap.get(trimB.id);r.ensure(ra,0);r.ensure(rb,0);ra.lastUsed=rb.lastUsed=now;ra.wanted=rb.wanted=false;now+=5.99;assert.equal(r.trim(),0,'Six-second grace changed');now+=.02;assert.equal(r.trim(),2);assert.equal(r.residentBytes,0);
 r.ensure(ra,0);r.ensure(rb,0);ra.wanted=true;rb.wanted=false;ra.lastUsed=rb.lastUsed=now;r.attributeBudget=1;assert.equal(r.trim(),1,'Budget pressure must retire only the hidden reference');assert.equal(r.geometryRefs.get(trimA.vertices).refs,1);assert.equal(r.geometryRefs.get(trimA.vertices).bytes,nearBytes);assert.equal(r.trim(true),0,'Forced trim evicted the visible leaf');ra.wanted=false;assert.equal(r.trim(true),1);assert.equal(r.residentBytes,0);r.dropPack('trail');
 const borrowed=[];while(r.trailGroundVariants.size<6){const source=r.mats.ground.clone();source.onBeforeCompile=r.mats.ground.onBeforeCompile;borrowed.push(source);r.trailGround(source,0);}const over=r.mats.ground.clone();assert.throws(()=>r.trailGround(over,0),/material budget/);over.dispose();for(const m of borrowed)m.dispose();
 const textures=new Set(sourceTextures),depths=Object.values(r.hakureiCardDepth),ownedMaterials=Object.values(r.mats),counts=new Map();for(const resource of [...textures,...depths,...ownedMaterials]){counts.set(resource,0);resource.addEventListener('dispose',()=>counts.set(resource,counts.get(resource)+1));}
 r.dispose();for(const resource of [...textures,...depths,...ownedMaterials])assert.equal(counts.get(resource),1,'Resource disposed twice or not disposed');assert.equal(r.residentBytes,0);assert.equal(r.cache.size,0);assert.equal(r.geometryRefs.size,0);assert.equal(r.trailGroundVariants.size,0);
 return{revision:F.revision,scope:'CPU methods, shader composition and ownership; no region build or WebGL',routeSamplesCompared:routeSamples,routeDeviationMax:routeError,analyticalCreekDeviationMax:streamError,routeSegments:lines.routeCount,creekSegments:lines.streamCount,segmentUniformBytes:lines.bytes,segmentBudget:F.segmentBudget,newTextureImages:0,newTreeStandardMaterials:4,newPrivateDepthMaterials:3,groundProgramKeys:1,groundMaterialRoles:2,uvBytesPerSixVertices:48,sharedUVCountedOnce:true,sourceArraysAndInstanceColorsUnchanged:true,uvFaultRollbackChecks:faultChecks,lightingChecks,productionRecoveryMethodChecked:true,reentryCycles:3,qualityStatesChecked:9,graceBudgetAndForcedTrimChecked:true,finalResidentBytes:r.residentBytes,sharedImagesDisposedOnce:true,automaticDistanceCutoutReviewed:true,webGLCompiled:false,visualAccepted:false};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),read=file=>fs.readFileSync(path.join(root,file)),scope=vm.createContext({performance});vm.runInContext(String(read('src/world-builder.js')),scope,{filename:'src/world-builder.js'});
 console.log(JSON.stringify(checkTrailLandscapeRenderer(scope.GA,read),null,2));
}
