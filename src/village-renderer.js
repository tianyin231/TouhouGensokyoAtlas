/* Meter-scale finishes reuse the reviewed Kourindou PBR shader. Only mixed
 * village architecture adds one program and a two-byte finish/axis attribute.
 * Road mouths operate on existing public ribbons; no terrain tint ring, light,
 * image texture, target, animation clock or shared quality-budget override.
 */
(function(G){'use strict';
const Base=G.DioramaRenderer;
const noise=`
float villageHash(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
float villageNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(villageHash(i),villageHash(i+vec2(1.,0.)),f.x),mix(villageHash(i+vec2(0.,1.)),villageHash(i+vec2(1.,1.)),f.x),f.y);}
`;
function replace(source,anchor,value){if(!source.includes(anchor))throw Error('Village shader inheritance changed: '+anchor.slice(0,60));return source.replace(anchor,value);}
function mixedMaterial(source){
 const mat=source.clone(),prior=source.onBeforeCompile,key=source.customProgramCacheKey.bind(source),recessEnv={value:.03};mat.name='villageSurface';mat.envMap=null;mat.userData.villageRecessEnvRatio=recessEnv;
 mat.onBeforeCompile=(s,r)=>{
  prior.call(source,s,r);
  s.uniforms.uVillageRecessEnvRatio=recessEnv;
  s.vertexShader='attribute vec2 villageFinish;varying vec2 vVillageFinish;\n'+s.vertexShader;
  s.vertexShader=replace(s.vertexShader,'#include <begin_vertex>','#include <begin_vertex>\nvVillageFinish=villageFinish;');
  s.fragmentShader=replace(s.fragmentShader,'uniform float uKourSurface;uniform float uKourAxis;','varying vec2 vVillageFinish;uniform float uVillageRecessEnvRatio;');
  s.fragmentShader=s.fragmentShader.replace(/\buKourSurface\b/g,'vVillageFinish.x').replace(/\buKourAxis\b/g,'vVillageFinish.y');
  s.fragmentShader=replace(s.fragmentShader,'vec3 kp=vAtlasPosition-vec3(-560.,45.,0.);',`vec3 kp=vAtlasPosition-vec3(0.,30.,0.);
 vec3 villageWorldN=normalize(cross(dFdx(vAtlasPosition),dFdy(vAtlasPosition)));
 vec3 villageSlope=vVillageFinish.y<.5?normalize(vec3(0.,-villageWorldN.z,villageWorldN.y)+vec3(0.,0.,1e-6)):normalize(vec3(villageWorldN.y,-villageWorldN.x,0.)+vec3(1e-6,0.,0.));
 vec2 villageRoofUV=vec2(vVillageFinish.y<.5?kp.x:kp.z,dot(kp,villageSlope))/vec2(.58,.58);
 vec2 villageRoofAA=fwidth(villageRoofUV);
 float villageRoofFade=(1.-smoothstep(.16,.72,max(villageRoofAA.x,villageRoofAA.y)))*(1.-smoothstep(175.,340.,length(vViewPosition)));
 `);
  s.fragmentShader=replace(s.fragmentShader,'float fired=kourHash(floor(kp.xz/vec2(.57,.58)));float grain=kourNoise(ku*21.);',`float fired=kourHash(floor(villageRoofUV));float grain=kourNoise(ku*21.);
  vec2 tileEdge=min(fract(villageRoofUV),1.-fract(villageRoofUV));
  float tileSeam=1.-min(smoothstep(.018,.018+villageRoofAA.x,tileEdge.x),smoothstep(.022,.022+villageRoofAA.y,tileEdge.y));
  float tileRound=.5+.5*cos(villageRoofUV.x*6.283185);
  `);
  s.fragmentShader=replace(s.fragmentShader,'kTint=.95+.065*fired+(grain-.5)*.024*kFade;kRough=.62+.075*fired;kHeight=grain*.0017*kFade;',`kTint=.96+.052*fired+(grain-.5)*.020*kFade+(tileRound*.023-tileSeam*.055)*villageRoofFade;
  kRough=.66+.070*fired;kHeight=grain*.0017*kFade+(tileRound*.003-tileSeam*.0015)*villageRoofFade;`);
  // Match the existing lower recess environment intensity without additionally darkening
  // ambient/hemisphere light, which is separate from these IBL accumulators.
  s.fragmentShader=replace(s.fragmentShader,'#include <lights_fragment_maps>',`#include <lights_fragment_maps>
  if(vVillageFinish.x>4.5&&vVillageFinish.x<5.5){
   #if defined( USE_ENVMAP ) && defined( RE_IndirectDiffuse ) && defined( ENVMAP_TYPE_CUBE_UV )
    iblIrradiance*=uVillageRecessEnvRatio;
   #endif
   #if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
    radiance*=uVillageRecessEnvRatio;
    #ifdef USE_CLEARCOAT
     clearcoatRadiance*=uVillageRecessEnvRatio;
    #endif
   #endif
  }`);
 };
 mat.customProgramCacheKey=()=>key()+'-village-finish-axis-2';return mat;
}
function pavingMaterial(source){
 const mat=source.clone(),prior=source.onBeforeCompile,key=source.customProgramCacheKey.bind(source);mat.name='villagePaving';
 mat.onBeforeCompile=(s,r)=>{prior.call(source,s,r);s.fragmentShader=noise+s.fragmentShader;s.fragmentShader=replace(s.fragmentShader,'#include <alphamap_fragment>',`vec2 villageP=vAtlasPosition.xz;
 float villageCoarse=villageNoise(villageP*.075),villageFine=villageNoise(villageP*7.);
 float villageGrainFade=(1.-smoothstep(.09,.34,length(fwidth(villageP))))*(1.-smoothstep(55.,115.,length(vViewPosition)));
 diffuseColor.rgb*=.965+villageCoarse*.067+(villageFine-.5)*.035*villageGrainFade;
 #include <alphamap_fragment>`);};
 mat.customProgramCacheKey=()=>key()+'-village-paving-1';return mat;
}
function roadMaterial(source,segments,shoulder){
 const mat=source.clone(),prior=source.onBeforeCompile,key=source.customProgramCacheKey.bind(source),n=segments.length;
 const lines=Float32Array.from(segments.flatMap(p=>[...p.a,...p.b])),widths=Float32Array.from(segments.flatMap(p=>[p.width,...p.origin,p.range]));mat.name=shoulder?'villageShoulder':'villageRoad';
 mat.onBeforeCompile=(s,r)=>{prior.call(source,s,r);Object.assign(s.uniforms,{uVillageLines:{value:lines},uVillageWidths:{value:widths},uVillageShoulder:{value:shoulder?1:0}});
  s.fragmentShader=`uniform vec4 uVillageLines[${n}];uniform vec4 uVillageWidths[${n}];uniform float uVillageShoulder;\n`+noise+s.fragmentShader;
  s.fragmentShader=replace(s.fragmentShader,'#include <alphamap_fragment>',`vec2 villageP=vAtlasPosition.xz;
  float villageArea=0.,villageRoadDistance=1e6,villageRoadWidth=1.;
  if(max(abs(villageP.x),abs(villageP.y))<390.){
   for(int i=0;i<${n};i++){
    vec4 vLine=uVillageLines[i],vWidth=uVillageWidths[i];vec2 vDir=vLine.zw-vLine.xy;
    float vAlong=clamp(dot(villageP-vLine.xy,vDir)/max(dot(vDir,vDir),1e-6),0.,1.);
    float vDistance=length(villageP-vLine.xy-vAlong*vDir),vFrom=length(villageP-vWidth.yz);
    float vFade=(1.-smoothstep(vWidth.w-14.,vWidth.w,vFrom))*smoothstep(4.,10.,vFrom);
    float vArea=(1.-smoothstep(vWidth.x*.5+1.4,vWidth.x*.5+2.5,vDistance))*vFade;
    if(vArea>villageArea){villageArea=vArea;villageRoadDistance=vDistance;villageRoadWidth=vWidth.x;}
   }
  }
  float villageMacro=villageNoise(villageP*.10);
  vec3 villageEarth=mix(vec3(.214,.179,.119),vec3(.249,.215,.150),villageMacro);
  float villageCentre=1.-smoothstep(villageRoadWidth*.29,villageRoadWidth*.5+.4,villageRoadDistance);
  float villageBlend=villageArea*mix(.46,0.,uVillageShoulder)*villageCentre;
  diffuseColor.rgb=mix(diffuseColor.rgb,villageEarth,villageBlend);
  diffuseColor.rgb*=1.+(villageMacro-.5)*.045*villageArea;
  #include <alphamap_fragment>`);
 };
 // Centre and shoulder use one identical shader, with isolated uniform values.
 mat.customProgramCacheKey=()=>key()+'-village-road-mouths-1-'+n;return mat;
}
class VillageRenderer extends Base{
 constructor(T,canvas,world){const segments=G.VILLAGE_UPGRADE.routeSegments();super(T,canvas,world);
  if(!this.mats.kourindouWoodY)throw Error('Village materials require the reviewed Kourindou shader');
  this.mats.villageSurface=mixedMaterial(this.mats.kourindouWoodY);
  this.mats.villagePaving=pavingMaterial(this.mats.paving);
  this.mats.villageRoad=roadMaterial(this.mats.ground,segments,false);this.mats.villageShoulder=roadMaterial(this.mats.ground,segments,true);
  const source=this.mats.kourindouStone,stone=source.clone();stone.name='villageStone';stone.onBeforeCompile=source.onBeforeCompile;stone.customProgramCacheKey=source.customProgramCacheKey;this.mats.villageStone=stone;
 }
 addRecords(meshes,pack){super.addRecords(meshes,pack);this.villageArrays??=new WeakMap();for(const m of meshes)if(m.material==='villageSurface'){this.villageArrays.set(m.vertices,m);if(m.farVertices)this.villageArrays.set(m.farVertices,m);}}
 acquire(a){const geometry=super.acquire(a),m=this.villageArrays?.get(a);if(!m||geometry.getAttribute('villageFinish'))return geometry;
  try{const array=a===m.vertices?m.villageFinish:m.villageFarFinish;
   if(!ArrayBuffer.isView(array)||Object.prototype.toString.call(array)!=='[object Uint8Array]'||array.buffer!==a.buffer||array.byteOffset!==a.byteOffset+a.byteLength||array.length!==a.length/9*2||array.byteOffset+array.byteLength>a.buffer.byteLength)throw Error('Missing or invalid Worker village finish: '+m.id);
   geometry.setAttribute('villageFinish',new this.T.BufferAttribute(array,2));const allocation=this.geometryRefs.get(a);allocation.bytes+=array.byteLength;this.residentBytes+=array.byteLength;return geometry;
  }catch(error){this.release(a);throw error;}
 }
 levelFor(record,distance){const m=record.data;return super.levelFor(record,m.villageMicro||m.villageProp?Math.max(0,distance-m.radius):distance);}
 ensure(record,level){
  // Shared tile/instance bounds can extend well toward the camera. Keep the
  // closest visible joinery/prop at full detail, including the low preset's
  // otherwise unconditional far choice. Other regions retain inherited LOD.
  if(record.data.villageMicro||record.data.villageProp)level=this.levelFor(record,record.distance);
  return super.ensure(record,level);
 }
 dropPack(id){
  if(!this.packs.has(id))return super.dropPack(id);const arrays=[];
  for(const r of this.records)if(r.pack===id&&r.data.material==='villageSurface')for(const a of[r.data.vertices,r.data.farVertices].filter(Boolean))arrays.push(a);
  super.dropPack(id);for(const a of arrays)this.villageArrays?.delete(a);
 }
 material(m){
  if(['villageSurface','villagePaving','villageStone'].includes(m.material))return this.mats[m.material];
  if(m.globalSurface&&m.component==='connection-road'&&m.pathOwner==='village')return m.id.endsWith(':shoulder')?this.mats.villageShoulder:this.mats.villageRoad;
  return super.material(m);
 }
 wanted(record,rig,opts,distance){const m=record.data;if(m.component!=='village-bridge-approach')return super.wanted(record,rig,opts,distance);
  if((opts.space||'surface')!=='surface')return false;
  if(m.bridgeRepresentation!=='native'&&m.bridgeRepresentation!=='proxy')throw Error('Village footing bridge representation missing');
  const terrain=this.recordMap.get(m.terrainSource);if(!terrain||!super.wanted(terrain,rig,opts,distance))return false;
  // A local probe delegates all streaming/focus/neighbor/atlas rules to the
  // complete inherited selector. Cache only the object, never a ready value.
  const probe=record.villageBridgeProbe||(record.villageBridgeProbe={data:{...m,owner:'village',region:'village',globalSurface:false,globalNear:false,globalFar:false,overview:m.bridgeRepresentation==='proxy'}});
  const yes=super.wanted(probe,rig,opts,distance);record.distance=probe.distance;record.displayCenter=probe.displayCenter;record.xf=probe.xf;return yes;
 }
 lighting(rig,opts,distance){super.lighting(rig,opts,distance);const source=this.mats.kourindouWoodY;
  for(const mat of[this.mats.villageStone]){
   if(mat.envMap!==source.envMap){mat.envMap=source.envMap;mat.needsUpdate=true;}
   if(mat.envMapIntensity!==source.envMapIntensity)mat.envMapIntensity=source.envMapIntensity;
  }
  const intensity=this.scene.environmentIntensity;
  this.mats.villageSurface.userData.villageRecessEnvRatio.value=intensity>1e-9?Math.max(0,Math.min(1,this.mats.kourindouRecess.envMapIntensity/intensity)):0;
 }
}
VillageRenderer.mixedMaterial=mixedMaterial;VillageRenderer.pavingMaterial=pavingMaterial;VillageRenderer.roadMaterial=roadMaterial;
G.DioramaRenderer=VillageRenderer;
})(globalThis.GA);
