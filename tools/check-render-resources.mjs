// CPU lifecycle tests run the production methods with small resource/engine doubles.
// They verify ownership and accounting; actual GL deletion and pixels need WebGL tests.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

function canvasDouble(){
 const listeners=new Map();
 return {listeners,
  addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(fn);},
  removeEventListener(type,fn){listeners.get(type)?.delete(fn);},
  dispatch(type){for(const fn of [...(listeners.get(type)||[])])fn({preventDefault(){}});},
  count(){return [...listeners.values()].reduce((n,v)=>n+v.size,0);}
 };
}
class PositionAttribute{
 constructor(array){this.array=array;this.count=array.length/9;}
 getX(i){return this.array[i*9];}getY(i){return this.array[i*9+1];}getZ(i){return this.array[i*9+2];}
}
class GeometryDouble{
 constructor(array){this.attributes={position:new PositionAttribute(array)};this.disposals=0;}
 getAttribute(key){return this.attributes[key];}
 setAttribute(key,value){this.attributes[key]=value;return this;}
 dispose(){this.disposals++;}
}
class BaseDouble{
 constructor(T,canvas){
  this.T=T;this.canvas=canvas;this.mats={};this.cache=new Map();
  this.sun={shadow:{camera:{layers:{enable(){}}}}};this.engine={shadowMap:{},info:{}};
  this.scene={add(){},remove(){}};
 }
 geometry(array){if(!this.cache.has(array))this.cache.set(array,new GeometryDouble(array));return this.cache.get(array);}
 dispose(){}
}
class MaterialDouble{dispose(){}}
class MeshDouble{constructor(geometry,material){this.geometry=geometry;this.material=material;this.userData={};}}
class BufferAttributeDouble{constructor(array,itemSize){this.array=array;this.itemSize=itemSize;this.count=array.length/itemSize;}}

export function checkRenderResources(read){
 const source=String(read('src/renderer.js')),whole=vm.createContext({GA:{},performance});
 vm.runInContext(source,whole,{filename:'src/renderer.js'});
 const base=Object.getPrototypeOf(whole.GA.ThreeRenderer.prototype);
 const start=source.indexOf('/* v0.13:'),end=source.indexOf('/* v0.14:');
 assert(start>=0&&end>start,'Adaptive renderer layer markers changed; review the harness');
 const layers=vm.createContext({GA:{ThreeRenderer:BaseDouble},performance});
 vm.runInContext(source.slice(start,end),layers,{filename:'adaptive-renderer-layer.js'});
 const Adaptive=layers.GA.ThreeRenderer,T={MeshStandardMaterial:MaterialDouble,Mesh:MeshDouble,BufferAttribute:BufferAttributeDouble};
 const empty={meshes:[],hlod:{clusters:[],sourceCount:0}},canvas=canvasDouble();
 let unrelatedEvents=0;const unrelated=()=>unrelatedEvents++;
 canvas.addEventListener('webglcontextlost',unrelated);
 for(let i=0;i<4;i++){
  const renderer=new Adaptive(T,canvas,empty);
  canvas.dispatch('webglcontextlost');assert(renderer.contextLost);
  renderer.mirrorLast='old';canvas.dispatch('webglcontextrestored');
  assert(!renderer.contextLost);assert.equal(renderer.mirrorLast,null);assert(renderer.engine.shadowMap.needsUpdate);
  renderer.dispose();assert.equal(canvas.count(),1,'Disposed renderers must release only their own context callbacks');
  canvas.dispatch('webglcontextlost');assert(!renderer.contextLost,'Disposed renderer still responds to context loss');
 }
 assert.equal(unrelatedEvents,8);canvas.removeEventListener('webglcontextlost',unrelated);assert.equal(canvas.count(),0);

 const disposalOrder=[];let activeTarget;
 const target=name=>({name,dispose(){assert.notEqual(activeTarget,this,'Unbind a target before releasing it');disposalOrder.push(name);}});
 const sunMap=target('sun'),keyMap=target('key'),mapPass=target('mapPass');activeTarget=sunMap;
 const shadow=(map,pass=null)=>({map,mapPass:pass,needsUpdate:false,mapSize:{x:2048,y:2048},bias:-.00006,normalBias:.055});
 const sun={isLight:true,castShadow:true,shadow:shadow(sunMap)},key={isLight:true,castShadow:true,shadow:shadow(keyMap,mapPass)};
 const shared={isLight:true,shadow:shadow(sunMap,mapPass)},ignored={isLight:false,shadow:shadow(target('ignored'))};
 const renderer=Object.assign(Object.create(base),{sun,cssWidth:0,scene:{traverse(fn){for(const light of [sun,key,shared,ignored])fn(light);}},engine:{shadowMap:{},getRenderTarget(){return activeTarget;},setRenderTarget(value){activeTarget=value;}}});
 const mapSize=sun.shadow.mapSize;
 renderer.setQuality('low');assert(!renderer.engine.shadowMap.enabled);assert(!sun.castShadow);
 for(const light of [sun,key,shared]){assert.equal(light.shadow.map,null);assert.equal(light.shadow.mapPass,null);assert(light.shadow.needsUpdate);}
 assert.deepEqual(disposalOrder,['sun','key','mapPass'],'Shared shadow targets must be released once');
 assert.equal(sun.shadow.mapSize,mapSize);assert.equal(sun.shadow.bias,-.00006);assert.equal(sun.shadow.normalBias,.055);
 renderer.setQuality('low');assert.equal(disposalOrder.length,3,'Already released targets must not be disposed again');
 renderer.setQuality('balanced');assert(renderer.engine.shadowMap.enabled);assert(sun.castShadow);assert(renderer.engine.shadowMap.needsUpdate);
 assert.equal(sun.shadow.map,null,'Shadow allocation belongs to the next actual WebGL render');

 let engineAlive=true,finalShadowDisposals=0;const disposable={dispose(){}};
 const finalLight={isLight:true,shadow:shadow({dispose(){assert(engineAlive,'Release GL targets before disposing the engine');finalShadowDisposals++;}})};
 const final=Object.assign(Object.create(base),{cache:new Map(),objects:[],mats:{},water:disposable,caveWater:disposable,canalWater:disposable,lakeWater:disposable,windWater:disposable,signObjects:[],reflectionTarget:disposable,sky:{geometry:disposable,material:disposable},scene:{traverse(fn){fn(finalLight);}},engine:{getRenderTarget(){return null;},dispose(){engineAlive=false;}}});
 final.dispose();assert.equal(finalShadowDisposals,1);assert.equal(finalLight.shadow.map,null);assert(!engineAlive);

 layers.GA.DioramaRenderer=Adaptive;layers.GA.BACKDOOR={windows:[{id:'spring',x:0,y:0,z:0,yaw:.2}]};
 vm.runInContext(String(read('src/backdoor-renderer.js')),layers,{filename:'src/backdoor-renderer.js'});
 const Backdoor=layers.GA.DioramaRenderer,uvRenderer=new Adaptive(T,canvas,empty);
 Object.setPrototypeOf(uvRenderer,Backdoor.prototype);uvRenderer.mats.matte=new MaterialDouble();
 const vertices=new Float32Array(54),farVertices=new Float32Array(108);
 const record=id=>({data:{id,owner:'backdoor',backdoorPart:'window',backdoorZone:'spring',material:'matte',vertices,farVertices},item:null,level:-1});
 const first=record('window-a'),second=record('window-b');uvRenderer.records=[first,second];
 const firstGeo=uvRenderer.ensure(first,0).geometry,uvBytes=firstGeo.getAttribute('uv').array.byteLength;
 assert.equal(uvRenderer.residentBytes,vertices.byteLength+uvBytes,'Window UV bytes missing from residency accounting');
 uvRenderer.ensure(first,0);uvRenderer.ensure(second,0);
 assert.equal(uvRenderer.residentBytes,vertices.byteLength+uvBytes,'Repeated ensure/shared geometry counted UV twice');
 assert.equal(uvRenderer.geometryRefs.get(vertices).refs,2);
 uvRenderer.evict(first);assert.equal(firstGeo.disposals,0);assert.equal(uvRenderer.residentBytes,vertices.byteLength+uvBytes);
 uvRenderer.evict(second);assert.equal(firstGeo.disposals,1);assert.equal(uvRenderer.residentBytes,0);assert.equal(uvRenderer.cache.size,0);
 const lod=record('window-lod');uvRenderer.records=[lod];uvRenderer.ensure(lod,0);
 const farGeo=uvRenderer.ensure(lod,1).geometry,farUVBytes=farGeo.getAttribute('uv').array.byteLength;
 assert.equal(uvRenderer.residentBytes,farVertices.byteLength+farUVBytes,'LOD replacement left old UV bytes resident');
 uvRenderer.ensure(lod,1);assert.equal(uvRenderer.residentBytes,farVertices.byteLength+farUVBytes);
 uvRenderer.evict(lod);assert.equal(farGeo.disposals,1);assert.equal(uvRenderer.residentBytes,0);assert.equal(uvRenderer.geometryRefs.size,0);
 uvRenderer.backdoorSky={geometry:disposable,material:disposable};uvRenderer.backdoorNoShadow=disposable;uvRenderer.backdoorWindowTargets=[];
 uvRenderer.dispose();assert.equal(canvas.count(),0);

 let contextLost=false,recoveryCalls=0,oldEnvironmentDisposals=0;const errors=[];
 class RecoveryBase{
  constructor(){this.contextLost=false;this.mats={};this.engine={shadowMap:{},getContext(){return {isContextLost(){return contextLost;}}}};}
  render(){recoveryCalls++;}dispose(){}
 }
 const recoveryContext=vm.createContext({GA:{DioramaRenderer:RecoveryBase},console:{error(...args){errors.push(args[0]);}}});
 vm.runInContext(String(read('src/render-recovery.js')),recoveryContext,{filename:'src/render-recovery.js'});
 const recoveryCanvas=canvasDouble(),recovery=new recoveryContext.GA.DioramaRenderer(T,recoveryCanvas,empty);
 const oldTexture={};recovery.studioEnv={texture:oldTexture,dispose(){oldEnvironmentDisposals++;}};recovery.mats.surface={envMap:oldTexture};
 recoveryCanvas.dispatch('webglcontextlost');assert.equal(recovery.recovery.lost,1);
 recoveryCanvas.dispatch('webglcontextrestored');assert(recovery.recovery.pending);
 recovery.makeStudioEnvironment=()=>{throw new Error('injected PMREM failure');};recovery.render({});
 assert.equal(recovery.recovery.lastError,'injected PMREM failure');assert(recovery.recovery.pending);
 assert.equal(recoveryCalls,0);assert.equal(oldEnvironmentDisposals,0);assert.equal(errors.length,1);
 const newTexture={};recovery.makeStudioEnvironment=()=>{recovery.studioEnv={texture:newTexture};};recovery.render({});
 assert(!recovery.recovery.pending);assert.equal(recovery.recovery.lastError,null);assert.equal(recovery.recovery.rebuilt,1);
 assert.equal(recovery.mats.surface.envMap,newTexture);assert(recovery.mats.surface.needsUpdate);assert.equal(oldEnvironmentDisposals,1);assert.equal(recoveryCalls,1);
 contextLost=true;recovery.render({});assert.equal(recoveryCalls,1,'Lost context must not submit another frame');
 recovery.dispose();assert.equal(recoveryCanvas.count(),0);
 return {contextConstructDisposeCycles:4,remainingContextListeners:canvas.count(),disabledShadowTargetsReleased:disposalOrder.length,finalShadowTargetsReleased:finalShadowDisposals,sharedWindowUVBytes:uvBytes,farWindowUVBytes:farUVBytes,recoveryFailuresRetried:errors.length};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const root=fileURLToPath(new URL('../',import.meta.url));
 console.log('渲染资源检查通过：'+JSON.stringify(checkRenderResources(name=>fs.readFileSync(path.join(root,name)))));
}
