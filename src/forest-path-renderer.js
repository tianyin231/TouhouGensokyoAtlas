/* Forest-road albedo softening, loaded after the source color asset,
 * Kourindou and forest-home renderer modules. The audited public roads replace
 * the duplicate detail ribbon only while all eight public records and any
 * reviewed terrain-specific replacements are present. Colors are not contact.
 */
(function(G){'use strict';
const Base=G.DioramaRenderer,MAX_BYTES=256*1024;
const target=m=>m.id==='forest:paths'||/^island:routes:forest:-?\d+:-?\d+(?::shoulder)?$/.test(m.id)||
 G.FOREST_CANOPY_ROAD?.sources.some(s=>m.id===G.FOREST_CANOPY_ROAD.nearId(s.id)||m.id===G.FOREST_CANOPY_ROAD.farId(s.id))===true;
const shoulder=m=>(m.forestCanopyRoad?m.sourceId:m.id).endsWith(':shoulder');
const coverageIds=Object.freeze(['-2:-1','-3:-1','-2:0','-3:0'].flatMap(key=>['island:routes:forest:'+key,'island:routes:forest:'+key+':shoulder']));
const coverageSources=coverageIds.map(id=>G.FOREST_PATH_COLORS?.metadata.records.find(m=>m.id===id));
const legacySource=G.FOREST_PATH_COLORS?.metadata.records.find(m=>m.id==='forest:paths');
// Offline-audited Float32 corners of just the Marisa/boardwalk junction.
// The independent checker compares these three quads to the retained indices.
const junctionOrigin=Object.freeze([-887,87]),junctionPadding=.0002;
const junctionQuads=Object.freeze([
 {segment:41,indexOffset:144,points:[[-881.0436401367188,82.0262680053711],[-883.2032470703125,80.24411010742188],[-885.64208984375,83.18643188476562],[-883.4891357421875,84.97661590576172]]},
 {segment:42,indexOffset:150,points:[[-883.4891357421875,84.97661590576172],[-885.64208984375,83.18643188476562],[-888.0697631835938,86.09687805175781],[-885.9302368164062,87.90312194824219]]},
 {segment:43,indexOffset:156,points:[[-885.9302368164062,87.90312194824219],[-888.0697631835938,86.09687805175781],[-890.6695556640625,89.14165496826172],[-888.557861328125,90.9803466796875]]}
].map(q=>Object.freeze({...q,points:Object.freeze(q.points.map(p=>Object.freeze(p)))})));
const junctionPlanes=junctionQuads.map(q=>{const points=q.points.map(p=>p.map((v,i)=>v-junctionOrigin[i])),sign=Math.sign(points.reduce((s,a,i)=>{const b=points[(i+1)%4];return s+a[0]*b[1]-b[0]*a[1];},0));return points.map((a,i)=>{const b=points[(i+1)%4],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),nx=-dz/length*sign,nz=dx/length*sign;return[nx,nz,-nx*a[0]-nz*a[1]].map(Math.fround);});});
const junctionBounds=Object.freeze([Math.min(...junctionQuads.flatMap(q=>q.points.map(p=>p[0])))-junctionOrigin[0]-junctionPadding,Math.min(...junctionQuads.flatMap(q=>q.points.map(p=>p[1])))-junctionOrigin[1]-junctionPadding,Math.max(...junctionQuads.flatMap(q=>q.points.map(p=>p[0])))-junctionOrigin[0]+junctionPadding,Math.max(...junctionQuads.flatMap(q=>q.points.map(p=>p[1])))-junctionOrigin[1]+junctionPadding]);
function junctionContains(x,z){const p=[x-junctionOrigin[0],z-junctionOrigin[1]];return p[0]>=junctionBounds[0]&&p[1]>=junctionBounds[1]&&p[0]<=junctionBounds[2]&&p[1]<=junctionBounds[3]&&junctionPlanes.some(quad=>quad.every(n=>n[0]*p[0]+n[1]*p[1]+n[2]>=-junctionPadding));}
const glsl=v=>Number.isInteger(v)?v+'.0':String(v);
const junctionClip=`
 if(uForestPathJunction>.5){vec2 forestPathJunction=vAtlasPosition.xz-vec2(${junctionOrigin.map(glsl).join(',')});
  if(all(greaterThanEqual(forestPathJunction,vec2(${junctionBounds.slice(0,2).map(glsl).join(',')})))&&all(lessThanEqual(forestPathJunction,vec2(${junctionBounds.slice(2).map(glsl).join(',')})))&&(${junctionPlanes.map(q=>'('+q.map(n=>`dot(vec3(forestPathJunction,1.),vec3(${n.map(glsl).join(',')}))>=-${glsl(junctionPadding)}`).join('&&')+')').join('||')}))discard;
 }
`;
const junction=Object.freeze({revision:1,record:'island:routes:forest:-2:0',route:'route-marisa',origin:junctionOrigin,bounds:junctionBounds,padding:junctionPadding,quads:junctionQuads,contains:junctionContains});

function channels(m,a,index){
 const count=a.length/9,size=index?.length??count;
 if(m.forestCanopyRoad){
  if(index!==m.index||!G.FOREST_PATH_COLORS)throw Error('Unsupported repaired forest path source: '+m.id);
  const extra=G.FOREST_CANOPY_ROAD.channels(m,a,(id,n,ix)=>G.FOREST_PATH_COLORS.get(id,n,ix));
  const ground=G.FOREST_CANOPY_GROUND?.pathColors?G.FOREST_CANOPY_GROUND.pathColors({id:extra.sourceId},a,extra.ground):extra.ground;
  if(!ArrayBuffer.isView(ground)||ground.constructor.name!=='Uint8Array'||ground.length!==count*3)
   throw Error('Unsupported repaired forest path colors: '+m.id);
  return{side:extra.side,ground,bytes:extra.side.byteLength+ground.byteLength};
 }
 if(!Number.isInteger(count)||size%6||!G.FOREST_PATH_COLORS)throw Error('Unsupported forest path source/colors: '+m.id);
 const originalGround=G.FOREST_PATH_COLORS.get(m.id,count,index?.length||0);
 const ground=G.FOREST_CANOPY_GROUND?.pathColors?G.FOREST_CANOPY_GROUND.pathColors(m,a,originalGround):originalGround;
 if(!ArrayBuffer.isView(ground)||ground.constructor.name!=='Uint8Array'||ground.length!==count*3)
  throw Error('Unsupported forest canopy path colors: '+m.id);
 const side=new Float32Array(count);side.fill(NaN);
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
 forestPublicPathsPresent(){
  for(let i=0;i<coverageIds.length;i++){
   const data=this.recordMap.get(coverageIds[i])?.data,source=coverageSources[i];
   if(data?.forestCanopyRoad){if(!G.FOREST_CANOPY_ROAD?.compatible(data,source))return false;continue;}
   if(!source||data?.group!=='roads'||data.globalSurface!==true||data.overview!==true||data.component!=='connection-road'||data.pathOwner!=='forest'||data.material!=='ground'||data.vertices?.length!==source.vertexCount*9||data.index?.length!==source.indexCount)return false;
  }
  if(G.FOREST_CANOPY_ROAD&&!G.FOREST_CANOPY_ROAD.coverageReady(this.recordMap))return false;
  return true;
 }
 forestPathCovered(m,publicReady){
  if(m.id!=='forest:paths'||m.group!=='roads'||m.owner!=='forest'||m.material!=='ground'||!legacySource||m.vertices?.length!==legacySource.vertexCount*9||m.index||m.farVertices)return false;
  // The independent coverage checker binds these source counts and bytes to
  // all 610 retained centerline segments. No runtime hashing or pack caching.
  return publicReady??this.forestPublicPathsPresent();
 }
 updateForestPathJunction(){if(this.forestPathJunctionUniform)this.forestPathJunctionUniform.value=this.forestPublicPathsPresent()?1:0;}
 wanted(record,rig,opts,distance){
  if(record.data.id==='forest:paths'){
   const ready=this.forestPublicPathsPresent();
   if(this.forestPathJunctionUniform&&this.forestPathJunctionUniform.value!==Number(ready))this.forestPathJunctionUniform.value=Number(ready);
   if(this.forestPathCovered(record.data,ready))return false;
  }
  return super.wanted(record,rig,opts,distance);
 }
 addRecords(meshes,pack){
  super.addRecords(meshes,pack);this.forestPathArrays??=new WeakMap();
  for(const m of meshes)if(target(m))for(const a of [m.vertices,m.farVertices].filter(Boolean))this.forestPathArrays.set(a,m);
  this.updateForestPathJunction();
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
  if(isShoulder)this.forestPathJunctionUniform??={value:this.forestPublicPathsPresent()?1:0};
  mat.name='forest-path-soft-'+(isShoulder?'shoulder':'center');
  mat.onBeforeCompile=(s,r)=>{
   prior.call(src,s,r);
   if(isShoulder)s.uniforms.uForestPathJunction=this.forestPathJunctionUniform;
   s.vertexShader='attribute float forestPathSide; attribute vec3 forestPathGround;\nvarying float vForestPathSide; varying vec3 vForestPathGround;\n'+s.vertexShader;
   s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    vForestPathSide=forestPathSide;vForestPathGround=forestPathGround;
   `);
   s.fragmentShader=(isShoulder?'uniform float uForestPathJunction;\n':'')+'varying float vForestPathSide; varying vec3 vForestPathGround;\n'+s.fragmentShader;
   // Keep this before alphamap_fragment: the inherited Kourindou and home
   // shaders still paint their forecourts/yards after this general road layer.
   s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    ${isShoulder?'diffuseColor.rgb=vForestPathGround;':`float forestPathEdge=smoothstep(.64,1.,abs(vForestPathSide));
    diffuseColor.rgb=mix(diffuseColor.rgb,vForestPathGround,forestPathEdge);`}
    ${isShoulder?junctionClip:''}
   `);
  };
  mat.customProgramCacheKey=()=>oldKey()+'-forest-path-soft-'+(isShoulder?2:1)+'-'+isShoulder;
  this.forestPathMaterials.set(isShoulder,mat);this.mats[mat.name]=mat;return mat;
 }
 material(m){return target(m)?this.forestPathMaterial(shoulder(m)):super.material(m);}
 dropPack(id){
  if(!this.packs.has(id))return super.dropPack(id);
  const removed=this.records.filter(r=>r.pack===id&&target(r.data)).map(r=>r.data);
  super.dropPack(id);
  for(const m of removed)for(const a of [m.vertices,m.farVertices].filter(Boolean))this.forestPathArrays?.delete(a);
  this.updateForestPathJunction();
 }
 info(){
  const result=super.info(),arrays=new Set();for(const r of this.records)if(target(r.data))for(const a of [r.data.vertices,r.data.farVertices].filter(Boolean))arrays.add(a);
  result.forestPath={revision:4,targets:this.records.filter(r=>target(r.data)).map(r=>r.data.id),legacyPathCovered:!!this.recordMap.get('forest:paths')&&this.forestPathCovered(this.recordMap.get('forest:paths').data),junctionRevision:1,junctionEnabled:this.forestPathJunctionUniform?.value===1,expectedAttributeBytes:[...arrays].reduce((n,a)=>n+a.length/9*7,0),residentAttributeBytes:this.forestPathResidentAttributeBytes||0,peakAttributeBytes:this.forestPathPeakAttributeBytes||0,attributeBuilds:this.forestPathAttributeBuilds||0,attributeBudget:MAX_BYTES,colorSourceBytes:G.FOREST_PATH_COLORS.decodedBytes(),colorsBaseline:G.FOREST_PATH_COLORS.metadata.sourceBaseline,colorsSHA:G.FOREST_PATH_COLORS.metadata.payloadSHA,programKeys:[...(this.forestPathMaterials?.values()||[])].map(m=>m.customProgramCacheKey()),newTextures:0,newLights:0,newTargets:0,contactRepairRevision:G.FOREST_CANOPY_ROAD?.revision||0,groundBasis:'Offline public-terrain albedo; bounded Marisa bend follows its selected near/far terrain. Remaining road geometry and all terrain geometry are retained.'};
  return result;
 }
 dispose(){try{super.dispose();}finally{this.forestPathArrays=new WeakMap();this.forestPathMaterials?.clear();}}
}
G.FOREST_PATH_RENDERER={revision:4,target,channels,coverageIds,junction,attributeBudget:MAX_BYTES,bytesPerVertex:7};
G.DioramaRenderer=ForestPathRenderer;
})(globalThis.GA);
