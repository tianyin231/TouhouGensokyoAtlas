/* The deserted village shares the original sun, sky, weather and night state.
 * Local materials only; no point lights, rendered textures or perpetual animation.
 */
(function(G){'use strict';const Base=G.DioramaRenderer;
class MayohigaRenderer extends Base{
 constructor(T,canvas,world){super(T,canvas,world);for(const[k,rough]of[['Wood',.94],['Wall',.99],['Paper',.98],['Roof',.89],['Ridge',.91],['Stone',.98],['Soil',1],['Grass',1],['Leaf',.96],['Red',.92],['Cat',1]]){const m=new T.MeshStandardMaterial({vertexColors:true,roughness:rough,metalness:0,side:T.DoubleSide});m.name='mayohiga-'+k;m.shadowSide=T.BackSide;m.envMap=this.studioEnv.texture;m.envMapIntensity=.12;this.mats['mayo'+k]=m;if(['Wood','Stone','Wall','Paper','Roof'].includes(k))this.ageMayoMaterial(m,k);}
  const src=this.mats.ground,prior=src.onBeforeCompile,key=src.customProgramCacheKey.bind(src),m=src.clone();m.name='mayohiga-earth';
  m.onBeforeCompile=(s,r)=>{prior.call(src,s,r);s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
  vec2 myLocal=(vAtlasPosition.xz-vec2(-1723.,-1178.))/vec2(154.,145.);
  float myGroundWeight=1.-smoothstep(.32,1.,length(myLocal));
  diffuseColor.rgb*=mix(vec3(1.),vec3(.73,.78,.65),myGroundWeight);
  `);};m.customProgramCacheKey=()=>key()+'-mayohiga-earth-1';this.mats.mayoGround=m;this.mats.mayoPath=m;
 }
 ageMayoMaterial(m,kind){m.onBeforeCompile=s=>{
  s.vertexShader='varying vec3 vMayoP;\n'+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvMayoP=(modelMatrix*vec4(transformed,1.)).xyz;');
  s.fragmentShader=`varying vec3 vMayoP;
  float myHash(vec2 p){return fract(sin(dot(p,vec2(71.3,153.9)))*13758.5453);}
  float myNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(myHash(i),myHash(i+vec2(1.,0.)),f.x),mix(myHash(i+vec2(0.,1.)),myHash(i+vec2(1.)),f.x),f.y);}
  `+s.fragmentShader;
  const detail=kind==='Wood'?`float myFiber=myNoise(vec2((vMayoP.x+vMayoP.z)*3.2,vMayoP.y*.28));diffuseColor.rgb*=.87+.19*myBroad+(myFiber-.5)*.17*myFade;`:
   kind==='Wall'||kind==='Paper'?`diffuseColor.rgb*=mix(vec3(.83,.84,.79),vec3(1.01,1.,.97),myBroad);`:
   `float myGrain=myNoise((vMayoP.xy+vMayoP.z*.27)*3.1);diffuseColor.rgb*=.88+.16*myBroad+(myGrain-.5)*.10*myFade;`;
  s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
  float myBroad=myNoise(vec2(vMayoP.x*.30+vMayoP.z*.24,vMayoP.y*.41));
  float myFade=(1.-smoothstep(55.,150.,length(vViewPosition)))*(1.-smoothstep(.20,.80,length(fwidth(vMayoP))));
  `+detail);
 };m.customProgramCacheKey=()=> 'mayohiga-aged-1-'+kind;}
 material(m){const mat=super.material(m);return mat===this.mats.ground&&m.globalSurface&&Math.hypot((m.center[0]+1723)/154,(m.center[2]+1178)/145)-m.radius/145<1?this.mats.mayoGround:mat;}
 wanted(r,rig,o,d){const m=r.data;if(m.owner==='mayohiga'){
   if(o.space!=='surface')return false;
   if(G.PRESETS[o.view]?.mayoCut&&m.mayoZone==='main'&&m.mayoPart==='roof')return false;
   if(['props','cats','undergrowth'].includes(m.mayoPart)&&(this.quality==='low'||G.length(G.sub(rig.eye,m.center))-m.radius>135))return false;
  }return super.wanted(r,rig,o,d);}
}
G.DioramaRenderer=MayohigaRenderer;
})(globalThis.GA);
