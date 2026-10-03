/* Forest-home material routing. Structural finishes reuse Kourindou's existing
 * uniform PBR program; only bounded yard/road albedo variants are additional.
 * No new lights, texture images, targets, clocks or changes to the forest trees.
 */
(function(G){'use strict';
const Base=G.DioramaRenderer;
const finishes=new Set(['WoodX','WoodY','WoodZ','Roof','Stone','Plaster','Paper','Recess','Iron','Clay','Bark','Grass']);
const noise=`
float homeHash(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+31.17);return fract((q.x+q.y)*q.z);}
float homeNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(homeHash(i),homeHash(i+vec2(1.,0.)),f.x),mix(homeHash(i+vec2(0.,1.)),homeHash(i+1.),f.x),f.y);}
`;
function yardSegments(paths){const values=[],distance=(p,a,b)=>{const dx=b[0]-a[0],dz=b[1]-a[1],u=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(dx*dx+dz*dz||1)));return Math.hypot(p[0]-a[0]-u*dx,p[1]-a[1]-u*dz);},simplify=ps=>{let index=-1,worst=.199;for(let i=1;i<ps.length-1;i++){const d=distance(ps[i],ps[0],ps.at(-1));if(d>worst){worst=d;index=i;}}return index<0?[ps[0],ps.at(-1)]:[...simplify(ps.slice(0,index+1)).slice(0,-1),...simplify(ps.slice(index))];};
 for(const [id,site]of[['forest-alice',[-1140,-260]],['forest-marisa',[-1000,140]]]){const p=paths?.find(p=>p.id===id);if(!p?.samples?.length)throw Error('Missing forest-home route: '+id);const ps=simplify(p.samples);for(let i=1;i<ps.length;i++){const a=ps[i-1],b=ps[i];if(distance(site,a,b)>58)continue;values.push(...a,...b);}}
 if(!values.length||values.length/4>16)throw Error('Forest-home road segment budget needs review');return Float32Array.from(values);
}
class ForestRenderer extends Base{
 static yardSegments(paths=G.FOREST.paths){return yardSegments(paths);}
 constructor(T,canvas,world){const lanes=ForestRenderer.yardSegments();super(T,canvas,world);this.forestHomeLanes??=lanes;this.forestGroundVariants??=new Map();}
 forestGround(src,road=false){this.forestGroundVariants??=new Map();this.forestHomeLanes??=ForestRenderer.yardSegments();const key=src.uuid+':'+road;if(this.forestGroundVariants.has(key))return this.forestGroundVariants.get(key);const mat=src.clone(),prior=src.onBeforeCompile,oldKey=src.customProgramCacheKey.bind(src),count=this.forestHomeLanes.length/4;mat.name='forest-home-ground-'+this.forestGroundVariants.size;
  mat.onBeforeCompile=(s,r)=>{prior.call(src,s,r);if(road)s.uniforms.uForestHomeLanes={value:this.forestHomeLanes};s.fragmentShader=(road?`uniform vec4 uForestHomeLanes[${count}];\n`:'')+noise+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <alphamap_fragment>',`
   vec2 homeWorld=vAtlasPosition.xz;
   vec2 homeAlice=homeWorld-vec2(-1140.,-260.),homeMarisa=homeWorld-vec2(-1000.,140.);
   float homeA=1.-smoothstep(.72,1.,length((homeAlice-vec2(0.,3.))/vec2(45.,42.)));
   float homeM=1.-smoothstep(.69,1.,length((homeMarisa-vec2(3.,4.))/vec2(38.,34.)));
   float homeArea=max(homeA,homeM),homeMacro=homeNoise(homeWorld*.11);
   float homeGrainFade=(1.-smoothstep(.08,.38,length(fwidth(homeWorld))))*(1.-smoothstep(80.,145.,length(vViewPosition)));
   float homeApronA=(1.-smoothstep(.68,1.08,length((homeAlice-vec2(0.,18.))/vec2(6.4,15.))))*homeA;
   float homeApronM=(1.-smoothstep(.70,1.05,length((homeMarisa-vec2(0.,12.))/vec2(12.,9.))))*homeM;
   float homeBed=max(1.-smoothstep(.70,1.06,length((homeAlice-vec2(-13.6,16.))/vec2(3.1,2.5))),1.-smoothstep(.70,1.06,length((homeAlice-vec2(13.6,16.))/vec2(3.1,2.5))))*homeA;
   vec3 homeGrass=mix(vec3(.153,.193,.108),vec3(.204,.239,.145),homeMacro);
   vec3 homeEarth=mix(vec3(.194,.164,.111),vec3(.233,.203,.146),homeMacro);
   vec3 homeGravel=mix(vec3(.256,.259,.204),vec3(.309,.305,.247),homeMacro);
   vec3 homeLocal=mix(homeGrass,homeEarth,homeBed*.84);
   homeLocal=mix(homeLocal,homeGravel,homeApronA*.58);
   homeLocal=mix(homeLocal,homeEarth,homeApronM*.48);
   ${road?`
   float homeWear=0.;
   if(homeArea>0.){float homeNearest=1e8;for(int i=0;i<${count};i++){vec4 lane=uForestHomeLanes[i];vec2 delta=lane.zw-lane.xy,offset=homeWorld-lane.xy;float u=clamp(dot(offset,delta)/max(dot(delta,delta),1e-6),0.,1.);vec2 q=offset-u*delta;homeNearest=min(homeNearest,dot(q,q));}homeWear=1.-smoothstep(1.02,1.68,sqrt(homeNearest)+(homeMacro-.5)*.18);}
   homeLocal=mix(homeLocal,homeEarth,homeWear*.88);
   `:''}
   homeLocal*=1.+(homeNoise(homeWorld*7.)-.5)*.07*homeGrainFade;
   diffuseColor.rgb=mix(diffuseColor.rgb,homeLocal,homeArea);
   #include <alphamap_fragment>
  `);};mat.customProgramCacheKey=()=>oldKey()+'-forest-home-ground-1-'+road+'-'+(road?count:0);this.forestGroundVariants.set(key,mat);this.mats[mat.name]=mat;return mat;
 }
 material(m){if(m.material?.startsWith('forest')){const kind=m.material.slice(6);if(finishes.has(kind)){const mat=this.mats['kourindou'+kind];if(!mat)throw Error('Forest finishes require Kourindou renderer first');return mat;}}
  const mat=super.material(m),road=m.group==='roads'||m.component==='forest-path';if((m.globalSurface&&m.component==='island-terrain'||road)&&[[-1140,-257,61],[-997,144,53]].some(([x,z,r])=>Math.hypot(m.center[0]-x,m.center[2]-z)-m.radius<r))return this.forestGround(mat,road&&!m.id.endsWith(':shoulder'));return mat;
 }
 levelFor(record,distance){const m=record.data;if(!m.forestHomeBatch||!m.farVertices)return super.levelFor(record,distance);this.forestHomeLods??=new Map();const prior=this.forestHomeLods.get(m.locationId)??record.level,level=super.levelFor({data:m,level:prior},distance);this.forestHomeLods.set(m.locationId,level);return level;}
 wanted(record,rig,opts,distance){const m=record.data;if(m.component==='forest-boardwalk'){
   const source=this.recordMap.get(m.terrainSource);if(!source||source.data.component!=='island-terrain')throw Error('Forest boardwalk requires its rendered terrain source: '+m.terrainSource);
   // Evaluate the real source now. Its previous-frame wanted flag, our paving
   // sphere and the quality-dependent farVertices switch cannot select terrain.
   if(!super.wanted(source,rig,opts,distance))return false;
   record.distance=G.length(G.sub(rig.eye,m.center));record.displayCenter=m.center;record.xf=record.identityTransform||(record.identityTransform=Object.freeze({scale:1,offset:Object.freeze([0,0,0])}));return G.visibleSphere(rig.planes,m.center,m.radius+6);
  }if(this.quality==='low'&&['alice','marisa'].includes(m.component)&&m.forestPart==='props'&&!m.farVertices)return false;const wanted=super.wanted(record,rig,opts,distance);if(wanted&&this.quality==='low'&&m.forestHomeBatch&&m.farVertices){this.forestHomeLods??=new Map();this.forestHomeLods.set(m.locationId,1);}return wanted;}
}
G.DioramaRenderer=ForestRenderer;
})(globalThis.GA);
