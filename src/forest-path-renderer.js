/* Opt-in albedo softening for the retained forest roads, loaded after the
 * source color asset, Kourindou and forest-home renderer modules. Geometry,
 * height and shadows stay on the original paths. Source colors are not contact.
 */
(function(G){'use strict';
const Base=G.DioramaRenderer,MAX_BYTES=256*1024;
const target=m=>m.id==='forest:paths'||/^island:routes:forest:-?\d+:-?\d+(?::shoulder)?$/.test(m.id);
const shoulder=m=>m.id.endsWith(':shoulder');

function channels(m,a,index){
 const count=a.length/9,size=index?.length??count;
 if(!Number.isInteger(count)||size%6||!G.FOREST_PATH_COLORS)throw Error('Unsupported forest path source/colors: '+m.id);
 const ground=G.FOREST_PATH_COLORS.get(m.id,count,index?.length||0),side=new Float32Array(count);side.fill(NaN);
 const values=m.id==='forest:paths'?[1,1,-1,1,-1,-1]:shoulder(m)?[1,2,2,1,2,1]:[-1,1,1,-1,1,-1];
 const vertex=i=>index?index[i]:i;
 const same=(i,j)=>[0,1,2].every(k=>Math.abs(a[vertex(i)*9+k]-a[vertex(j)*9+k])<1e-5);
 for(let i=0;i<size;i+=6){
  if(!same(i,i+3)||!same(i+2,i+4))throw Error('Forest path quad order changed: '+m.id);
  for(let j=0;j<6;j++){
   const v=vertex(i+j),s=values[j];
   if(!Number.isInteger(v)||v<0||v>=count)throw Error('Invalid forest path index: '+m.id);
   if(Number.isFinite(side[v])&&side[v]!==s)throw Error('Shared forest path side conflict: '+m.id);
   side[v]=s;
  }
 }
 for(let i=0;i<count;i++)if(!Number.isFinite(side[i]))throw Error('Unused forest path vertex: '+m.id);
 return{side,ground,bytes:side.byteLength+ground.byteLength};
}

class ForestPathRenderer extends Base{
 addRecords(meshes,pack){
  super.addRecords(meshes,pack);this.forestPathArrays??=new WeakMap();
  for(const m of meshes)if(target(m))for(const a of [m.vertices,m.farVertices].filter(Boolean))this.forestPathArrays.set(a,m);
 }
 acquire(a){
  const geo=super.acquire(a),m=this.forestPathArrays?.get(a);
  if(!m||geo.getAttribute('forestPathSide'))return geo;
  let sideAttribute,groundAttribute;
  try{
   const extra=channels(m,a,this.indexByArray.get(a));
   if((this.forestPathResidentAttributeBytes||0)+extra.bytes>MAX_BYTES)throw Error('Forest path attribute budget exceeded');
   sideAttribute=new this.T.BufferAttribute(extra.side,1);
   groundAttribute=new this.T.BufferAttribute(extra.ground,3,true); // Quantized linear RGB, not sRGB.
   geo.setAttribute('forestPathSide',sideAttribute);geo.setAttribute('forestPathGround',groundAttribute);
   const allocation=this.geometryRefs.get(a);
   allocation.bytes+=extra.bytes;allocation.forestPathAttributeBytes=extra.bytes;this.residentBytes+=extra.bytes;
   this.forestPathResidentAttributeBytes=(this.forestPathResidentAttributeBytes||0)+extra.bytes;
   this.forestPathPeakAttributeBytes=Math.max(this.forestPathPeakAttributeBytes||0,this.forestPathResidentAttributeBytes);
   this.forestPathAttributeBuilds=(this.forestPathAttributeBuilds||0)+1;
   return geo;
  }catch(e){
   if(geo.getAttribute('forestPathSide')===sideAttribute)geo.deleteAttribute('forestPathSide');
   if(geo.getAttribute('forestPathGround')===groundAttribute)geo.deleteAttribute('forestPathGround');
   this.release(a);throw e;
  }
 }
 release(a){
  const allocation=this.geometryRefs.get(a),bytes=allocation?.refs===1?allocation.forestPathAttributeBytes||0:0;
  super.release(a);if(bytes)this.forestPathResidentAttributeBytes-=bytes;
 }
 forestPathMaterial(isShoulder){
  this.forestPathMaterials??=new Map();if(this.forestPathMaterials.has(isShoulder))return this.forestPathMaterials.get(isShoulder);
  // Compose the same two existing local priority chains for every target.
  // Their area masks remain unchanged. A record's broad bounds cannot create
  // additional source/material/program combinations in this module.
  let src=this.mats.ground;
  if(this.kourindouGroundVariant)src=this.kourindouGroundVariant(src,!isShoulder);
  if(this.forestGround)src=this.forestGround(src,!isShoulder);
  const mat=src.clone(),prior=src.onBeforeCompile,oldKey=src.customProgramCacheKey.bind(src);
  mat.name='forest-path-soft-'+(isShoulder?'shoulder':'center');
  mat.onBeforeCompile=(s,r)=>{
   prior.call(src,s,r);
   s.vertexShader='attribute float forestPathSide; attribute vec3 forestPathGround;\nvarying float vForestPathSide; varying vec3 vForestPathGround;\n'+s.vertexShader;
   s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    vForestPathSide=forestPathSide;vForestPathGround=forestPathGround;
   `);
   s.fragmentShader='varying float vForestPathSide; varying vec3 vForestPathGround;\n'+s.fragmentShader;
   // Keep this before alphamap_fragment: the inherited Kourindou and home
   // shaders still paint their forecourts/yards after this general road layer.
   s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    ${isShoulder?'diffuseColor.rgb=vForestPathGround;':`float forestPathEdge=smoothstep(.64,1.,abs(vForestPathSide));
    diffuseColor.rgb=mix(diffuseColor.rgb,vForestPathGround,forestPathEdge);`}
   `);
  };
  mat.customProgramCacheKey=()=>oldKey()+'-forest-path-soft-1-'+isShoulder;
  this.forestPathMaterials.set(isShoulder,mat);this.mats[mat.name]=mat;return mat;
 }
 material(m){return target(m)?this.forestPathMaterial(shoulder(m)):super.material(m);}
 dropPack(id){
  if(!this.packs.has(id))return super.dropPack(id);
  const removed=this.records.filter(r=>r.pack===id&&target(r.data)).map(r=>r.data);
  super.dropPack(id);
  for(const m of removed)for(const a of [m.vertices,m.farVertices].filter(Boolean))this.forestPathArrays?.delete(a);
 }
 info(){
  const result=super.info(),arrays=new Set();for(const r of this.records)if(target(r.data))for(const a of [r.data.vertices,r.data.farVertices].filter(Boolean))arrays.add(a);
  result.forestPath={revision:1,targets:this.records.filter(r=>target(r.data)).map(r=>r.data.id),expectedAttributeBytes:[...arrays].reduce((n,a)=>n+a.length/9*7,0),residentAttributeBytes:this.forestPathResidentAttributeBytes||0,peakAttributeBytes:this.forestPathPeakAttributeBytes||0,attributeBuilds:this.forestPathAttributeBuilds||0,attributeBudget:MAX_BYTES,colorSourceBytes:G.FOREST_PATH_COLORS.decodedBytes(),colorsBaseline:G.FOREST_PATH_COLORS.metadata.sourceBaseline,colorsSHA:G.FOREST_PATH_COLORS.metadata.payloadSHA,programKeys:[...(this.forestPathMaterials?.values()||[])].map(m=>m.customProgramCacheKey()),newTextures:0,newLights:0,newTargets:0,groundBasis:'Offline near public-terrain triangle albedo only; original road/terrain positions, normals and indices retained'};
  return result;
 }
 dispose(){try{super.dispose();}finally{this.forestPathArrays=new WeakMap();this.forestPathMaterials?.clear();}}
}
G.FOREST_PATH_RENDERER={revision:1,target,channels,attributeBudget:MAX_BYTES,bytesPerVertex:7};
G.DioramaRenderer=ForestPathRenderer;
})(globalThis.GA);
