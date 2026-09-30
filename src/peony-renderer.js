/* Peony-local materials. No extra lights, environment targets, clocks or global grading. */
(function(G){'use strict';const Base=G.DioramaRenderer;
class PeonyRenderer extends Base{
 constructor(T,canvas,world){super(T,canvas,world);
  for(const[k,rough]of[['Petal',.92],['Leaf',.98],['Grass',1],['Wood',.95],['Roof',.98],['Stone',.97],['Soil',1],['Basket',.95]]){const m=new T.MeshStandardMaterial({vertexColors:true,roughness:rough,metalness:0,side:T.DoubleSide});m.name='peony-'+k;m.shadowSide=T.BackSide;m.envMap=this.studioEnv.texture;m.envMapIntensity=.10;this.mats['peony'+k]=m;}
  this.peonyGroundVariants=new Map();
  // Match the already-rendered Seiki road at the join; vertex colours alone
  // cannot match two different lighting/material pipelines.
  this.mats.peonyPath=this.mats.shelfGround.clone();this.mats.peonyPath.name='peony-path';
 }
 peonyGround(src){if(this.peonyGroundVariants.has(src))return this.peonyGroundVariants.get(src);const prior=src.onBeforeCompile,key=src.customProgramCacheKey.bind(src),m=src.clone();m.name='peony-on-'+src.name;
  m.onBeforeCompile=(s,r)=>{prior.call(src,s,r);s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec2 pfLocal=(vAtlasPosition.xz-vec2(-1380.,-742.))/vec2(98.,84.);
   float pfRadius=length(pfLocal)+.025*sin(vAtlasPosition.x*.19)*sin(vAtlasPosition.z*.12);
   float pfWeight=1.-smoothstep(.40,1.,pfRadius);
   diffuseColor.rgb*=mix(vec3(1.),vec3(.77,.82,.71),pfWeight);
  `);};m.customProgramCacheKey=()=>key()+'-peony-earth-2';this.peonyGroundVariants.set(src,m);this.mats['peonyGroundVariant'+this.peonyGroundVariants.size]=m;return m;
 }
 material(m){const mat=super.material(m);return m.globalSurface&&m.component==='island-terrain'&&Math.hypot((m.center[0]+1380)/98,(m.center[2]+742)/84)-m.radius/84<1?this.peonyGround(mat):mat;}

 wanted(r,rig,o,d){const m=r.data;if(m.owner==='peony_field'){
   if(o.space!=='surface')return false;
   if(m.peonyPart==='roof'&&G.PRESETS[o.view]?.peonyCutRoof)return false;
   if(['herbs','props'].includes(m.peonyPart)&&(this.quality==='low'||G.length(G.sub(rig.eye,m.center))-m.radius>110))return false;
  }return super.wanted(r,rig,o,d);}
}
G.DioramaRenderer=PeonyRenderer;
})(globalThis.GA);
