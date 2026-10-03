/* Kourindou material and forest-edge refinement, 2026-10-02.
 * Meter-scale wood/ceramic/lime/stone, inherited alpha-leaf mask and depth pass.
 * Public terrain/road tint is local and reversible by source, not a terrain cut.
 * No additional lamps, texture images, clocks, render targets or post-processes.
 */
(function(G){'use strict';
const Base=G.DioramaRenderer;
const noise=`
float kourHash(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
float kourNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(kourHash(i),kourHash(i+vec2(1.,0.)),f.x),mix(kourHash(i+vec2(0.,1.)),kourHash(i+vec2(1.,1.)),f.x),f.y);}
`;
// One opaque program, with per-material uniforms. Different wood axes and
// surface finishes should not compile a separate full inherited PBR shader each.
function surface(){return `
 vec3 kp=vAtlasPosition-vec3(-560.,45.,0.);
 vec3 kn=abs(normalize(cross(dFdx(vAtlasPosition),dFdy(vAtlasPosition))));
 vec2 ku=kn.y>.65?kp.xz:kn.x>kn.z?kp.zy:kp.xy;
 float kFade=(1.-smoothstep(85.,155.,length(vViewPosition)))*(1.-smoothstep(.05,.35,length(fwidth(ku))));
 float kHeight=0.;float kRough=roughness;float kTint=1.;
 if(uKourSurface<.5){
  vec2 kg=uKourAxis<.5?vec2(kn.y>.65?kp.z:kp.y,kp.x):uKourAxis>1.5?vec2(kn.y>.65?kp.x:kp.y,kp.z):vec2(kn.x>kn.z?kp.z:kp.x,kp.y);
  float broad=kourNoise(kg*vec2(7.,.55));float fiber=pow(.5+.5*sin(kg.x*68.+kourNoise(kg*vec2(3.,.3))*4.5),4.);
  kTint=.95+.09*broad-fiber*.065*kFade;kRough=.74+.12*broad;kHeight=(broad*.004-fiber*.003)*kFade;
 }else if(uKourSurface<1.5){
  float fired=kourHash(floor(kp.xz/vec2(.57,.58)));float grain=kourNoise(ku*21.);
  kTint=.95+.065*fired+(grain-.5)*.024*kFade;kRough=.62+.075*fired;kHeight=grain*.0017*kFade;
 }else if(uKourSurface<2.5){
  float rock=kourNoise(ku*1.5),chip=kourNoise(ku*15.);
  kTint=.94+.11*rock+(chip-.5)*.06*kFade;kRough=.87+.08*rock;kHeight=(rock*.006+chip*.002)*kFade;
 }else if(uKourSurface<3.5){
  float lime=kourNoise(ku*1.7),grain=kourNoise(ku*26.);
  kTint=.96+.06*lime+(grain-.5)*.03*kFade;kRough=.95;kHeight=grain*.001*kFade;
 }else if(uKourSurface<4.5){
  float fiber=kourNoise(ku*vec2(52.,7.));kTint=.98+.035*fiber*kFade;kRough=.98;
 }else if(uKourSurface<5.5){kRough=1.;
 }else if(uKourSurface<6.5){kRough=.81;
 }else if(uKourSurface<7.5){kRough=.87;kTint=.96+.045*kourNoise(ku*8.);
 }else{kRough=.96;}
 diffuseColor.rgb*=kTint;
`;}

// RDP keeps the existing approach within 20 cm; only segments near this site
// become uniforms. Construct once, before acquiring any renderer resources.
function approachSegments(samples){
 if(!samples?.length)throw new Error('Kourindou forest-entry route is missing');
 const distance=(p,a,b)=>{const dx=b[0]-a[0],dz=b[1]-a[1],u=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(dx*dx+dz*dz||1)));return Math.hypot(p[0]-a[0]-u*dx,p[1]-a[1]-u*dz);};
 const simplify=points=>{let worst=.199,index=-1;for(let i=1;i<points.length-1;i++){const d=distance(points[i],points[0],points[points.length-1]);if(d>worst){worst=d;index=i;}}
  return index<0?[points[0],points[points.length-1]]:[...simplify(points.slice(0,index+1)).slice(0,-1),...simplify(points.slice(index))];};
 const points=simplify(samples),values=[];
 for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];if(distance([-560,-6],a,b)>=132)continue;if(Math.hypot(b[0]-a[0],b[1]-a[1])<1e-5)continue;values.push(a[0]+560,a[1],b[0]+560,b[1]);}
 if(!values.length||values.length/4>24)throw new Error('Kourindou approach segment budget needs review');
 return Float32Array.from(values);
}
class KourindouRenderer extends Base{
 static approachSegments(samples=G.FOREST?.paths?.find(p=>p.id==='forest-entry')?.samples){return approachSegments(samples);}
 constructor(T,canvas,world){const approach=KourindouRenderer.approachSegments();super(T,canvas,world);this.kourindouApproach=approach;this.kourindouMaterials=[];this.kourindouGroundVariants=new Map();
  // Keep the approved leaf shader/mask, but isolate per-region material state.
  // Dense canopy inspections failed on the software backend with alpha-to-coverage;
  // use a matching hard cutout in both color and depth passes, without changing
  // the shrine's shared material, MSAA targets or global quality settings.
  const sourceLeaf=this.hakureiCardMaterials.hakureiLeaf,leaf=sourceLeaf.clone();
  leaf.name='kourindouLeaf';leaf.onBeforeCompile=sourceLeaf.onBeforeCompile;
  leaf.customProgramCacheKey=sourceLeaf.customProgramCacheKey;leaf.alphaToCoverage=false;
  this.mats.kourindouLeaf=leaf;
  this.kourindouLeafDepth=this.hakureiCardDepth.hakureiLeaf.clone();
  this.kourindouLeafDepth.name='kourindouLeafDepth';
  this.kourindouLeafDepth.alphaTest=leaf.alphaTest;
  for(const kind of ['WoodX','WoodY','WoodZ','Roof','Stone','Plaster','Paper','Recess','Iron','Clay','Bark','Grass']){
   const src=this.mats.matte,prior=src.onBeforeCompile,oldKey=src.customProgramCacheKey.bind(src),mat=src.clone();
   const finish={WoodX:0,WoodY:0,WoodZ:0,Bark:0,Roof:1,Stone:2,Plaster:3,Paper:4,Recess:5,Iron:6,Clay:7,Grass:8}[kind];
   const axis={WoodX:0,WoodY:1,WoodZ:2,Bark:1}[kind]??1;
   const uniforms={uKourSurface:{value:finish},uKourAxis:{value:axis}};
   mat.name='kourindou'+kind;mat.roughness=.90;mat.metalness=0;mat.envMap=this.studioEnv.texture;mat.envMapIntensity=.12;
   mat.onBeforeCompile=(s,r)=>{prior.call(src,s,r);Object.assign(s.uniforms,uniforms);s.fragmentShader='uniform float uKourSurface;uniform float uKourAxis;\n'+noise+s.fragmentShader;
    s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n'+surface());
    s.fragmentShader=s.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=clamp(kRough,.45,1.);');
    s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
     vec3 kdx=dFdx(-vViewPosition),kdy=dFdy(-vViewPosition);
     vec2 ks=vec2(dFdx(kHeight),dFdy(kHeight));
     vec3 krx=cross(kdy,normal),kry=cross(normal,kdx);float kd=dot(kdx,krx);
     if(kFade>0.&&abs(kd)>1e-10)normal=normalize(abs(kd)*normal-sign(kd)*(ks.x*krx+ks.y*kry));`);
    s.fragmentShader=s.fragmentShader.replace('#include <lights_fragment_end>','#include <lights_fragment_end>\nif(uKourSurface>4.5&&uKourSurface<5.5)reflectedLight.indirectDiffuse*=.64;');
   };
   mat.customProgramCacheKey=()=>oldKey()+'-kourindou-surface-uniform-1';this.mats[mat.name]=mat;this.kourindouMaterials.push(mat);
  }
 }
 kourindouGroundVariant(src,road=false){
  const key=src.uuid+':'+road;if(this.kourindouGroundVariants.has(key))return this.kourindouGroundVariants.get(key);
  const mat=src.clone(),prior=src.onBeforeCompile,oldKey=src.customProgramCacheKey.bind(src),count=this.kourindouApproach.length/4;mat.name='kourindou-ground-'+this.kourindouGroundVariants.size;
  mat.onBeforeCompile=(s,r)=>{prior.call(src,s,r);if(road)s.uniforms.uKourApproach={value:this.kourindouApproach};s.fragmentShader=(road?`uniform vec4 uKourApproach[${count}];\n`:'')+noise+s.fragmentShader;
   // After inherited color modifiers: road margins and terrain use one local albedo.
   s.fragmentShader=s.fragmentShader.replace('#include <alphamap_fragment>',`
    vec2 kc=vAtlasPosition.xz-vec2(-560.,0.);
    float kArea=1.-smoothstep(.67,1.,length((kc-vec2(0.,-6.))/vec2(115.,97.)));
    float kGrainFade=(1.-smoothstep(.08,.38,length(fwidth(kc))))*(1.-smoothstep(75.,135.,length(vViewPosition)));
    float kMacro=kourNoise(kc*.095),kSmall=kourNoise(kc*7.5);
    // Separate worn forecourt and kura entrance, with metre-scale soft edges.
    float kApronEdge=kourNoise(kc*.24);
    float kShopApron=1.-smoothstep(.70,1.08,length((kc-vec2(-5.,12.))/vec2(22.,14.))+(kApronEdge-.5)*.11);
    float kKuraApron=1.-smoothstep(.70,1.08,length((kc-vec2(15.,1.))/vec2(8.,8.))+(kApronEdge-.5)*.10);
    float kApron=max(kShopApron,kKuraApron);
    float kLeafBed=(1.-smoothstep(20.,43.,length((kc-vec2(-4.,-22.))*vec2(.7,1.))))*(1.-kApron);
    kLeafBed*=.38+.62*smoothstep(.25,.8,kApronEdge);
    vec3 kForest=mix(vec3(.146,.182,.094),vec3(.203,.237,.132),kMacro);
    vec3 kGravel=mix(vec3(.225,.215,.156),vec3(.280,.266,.201),kMacro);
    vec3 kLocal=mix(kForest,vec3(.186,.155,.091),kLeafBed*.66);
    kLocal=mix(kLocal,kGravel,kApron);
    float kLocalMix=kArea;
    ${road?`
    vec3 kOtherRoad=diffuseColor.rgb*mix(vec3(.86,.82,.72),vec3(.93,.89,.80),kApron);
    float kApproachZone=0.;
    if(kArea>0.){
     float kNearest=1e6;
     for(int i=0;i<${count};i++){
      vec4 kLine=uKourApproach[i];vec2 kDelta=kLine.zw-kLine.xy,kOffset=kc-kLine.xy;
      float kAlong=clamp(dot(kOffset,kDelta)/max(dot(kDelta,kDelta),1e-6),0.,1.);
      vec2 kFromLine=kOffset-kAlong*kDelta;kNearest=min(kNearest,dot(kFromLine,kFromLine));
     }
     float kRoadDistance=sqrt(kNearest);
     kApproachZone=1.-smoothstep(4.8,6.,kRoadDistance);
     float kWear=1.-smoothstep(1.2,2.,kRoadDistance+(kApronEdge-.5)*.20);
     vec3 kEarth=mix(vec3(.214,.175,.115),vec3(.253,.213,.145),kMacro);
     kLocal=mix(kLocal,kEarth,kWear);
    }
    kLocal=mix(kOtherRoad,kLocal,kApproachZone);
    kLocalMix=kArea*mix(.72,1.,kApproachZone);`:''}
    kLocal*=1.+(kSmall-.5)*.10*kGrainFade;
    diffuseColor.rgb=mix(diffuseColor.rgb,kLocal,kLocalMix);
    #include <alphamap_fragment>
   `);
  };
  mat.customProgramCacheKey=()=>oldKey()+'-kourindou-ground-3-'+road+'-'+(road?count:0);this.kourindouGroundVariants.set(key,mat);this.mats[mat.name]=mat;return mat;
 }
 material(m){
  if(m.material==='kourindouLeaf')return this.mats.kourindouLeaf;
  if(m.material?.startsWith('kourindou')&&this.mats[m.material])return this.mats[m.material];
  const mat=super.material(m),road=m.group==='roads'||m.component==='forest-path';
  // Shared road shoulders are ground-colored strips, not the worn road centre.
  if((m.globalSurface&&m.component==='island-terrain'||road)&&Math.hypot(m.center[0]+560,m.center[2]+6)-m.radius<125)return this.kourindouGroundVariant(mat,road&&!m.id.endsWith(':shoulder'));
  return mat;
 }
 wanted(record,rig,opts,distance){const m=record.data;if(m.component==='kourindou'&&m.kourindouPart==='props'&&this.quality==='low'&&!m.farVertices)return false;return super.wanted(record,rig,opts,distance);}
 ensure(record,level){const mesh=super.ensure(record,level);
  if(record.data.material==='kourindouLeaf'){
   const geometry=mesh.geometry;if(!geometry.getAttribute('uv')){
    const n=geometry.getAttribute('position').count,uv=new Float32Array(n*2),quad=[0,0,1,0,1,1,0,0,1,1,0,1];
    for(let i=0;i<n;i++){uv[i*2]=quad[i%6*2];uv[i*2+1]=quad[i%6*2+1];}
    geometry.setAttribute('uv',new this.T.BufferAttribute(uv,2));const alloc=this.geometryRefs.get(record.array);if(alloc){alloc.bytes+=uv.byteLength;this.residentBytes+=uv.byteLength;}
   }
   mesh.customDepthMaterial=this.kourindouLeafDepth;
  }return mesh;
 }
 lighting(rig,opts,distance){
  super.lighting(rig,opts,distance);
  // Explicit envMap materials use their own intensity, not scene.environmentIntensity.
  const lit=this.nightActive?this.mats.matte.envMapIntensity:.12,recess=this.nightActive?this.mats.hakureiRecess.envMapIntensity:.03;
  for(const mat of this.kourindouMaterials)mat.envMapIntensity=mat===this.mats.kourindouRecess?recess:lit;
  this.mats.kourindouLeaf.envMapIntensity=this.hakureiCardMaterials.hakureiLeaf.envMapIntensity;
 }
 dispose(){this.kourindouLeafDepth?.dispose();super.dispose();}
}
G.DioramaRenderer=KourindouRenderer;
})(globalThis.GA);
