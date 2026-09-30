/* Regional rock/plant materials and a local ground tint; inherited terrain arrays stay unchanged.
 * No added lights or animation. Weathering is procedural P, not an official texture. */
(function(G){'use strict';const Base=G.DioramaRenderer;
class HitenRenderer extends Base{
 constructor(T,canvas,world){super(T,canvas,world);for(const[k,rough]of[['Rock',.97],['Moss',1],['Wood',.96],['Leaf',.98]]){const m=new T.MeshStandardMaterial({vertexColors:true,roughness:rough,metalness:0,side:T.DoubleSide});m.name='hiten-'+k;m.shadowSide=T.BackSide;m.envMap=this.studioEnv.texture;m.envMapIntensity=.13;this.mats['hiten'+k]=m;if(k==='Rock')this.rockWeathering(m);}this.makeHitenGround();}
 rockWeathering(m){m.onBeforeCompile=s=>{
 s.vertexShader='varying vec3 vHitenRock;\n'+s.vertexShader;
 s.vertexShader=s.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvHitenRock=(modelMatrix*vec4(transformed,1.)).xyz;');
 s.fragmentShader=`varying vec3 vHitenRock;
 float htHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float htNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(htHash(i),htHash(i+vec2(1.,0.)),f.x),mix(htHash(i+vec2(0.,1.)),htHash(i+vec2(1.,1.)),f.x),f.y);}
 `+s.fragmentShader;
 s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 vec3 hp=vHitenRock;
 float htBroad=htNoise(vec2(hp.z*.115+hp.x*.06,hp.y*.18));
 float htVein=htNoise(vec2(hp.z*.28+hp.x*.2,hp.y*.026));
 float htNear=(1.-smoothstep(75.,210.,length(vViewPosition)))*(1.-smoothstep(.18,.65,length(fwidth(hp))));
 float htGrain=htNoise(hp.zy*3.3);
 diffuseColor.rgb*=mix(vec3(.79,.84,.82),vec3(1.05,1.035,.98),htBroad)*(.94+.09*htVein);
 diffuseColor.rgb*=1.+(htGrain-.5)*.09*htNear;
 `);};m.customProgramCacheKey=()=> 'hiten-rock-weathering-1';}
 makeHitenGround(){const src=this.mats.ground,prior=src.onBeforeCompile,key=src.customProgramCacheKey.bind(src),m=src.clone();m.name='hiten-ground';
 m.onBeforeCompile=(s,r)=>{prior.call(src,s,r);s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 vec2 htLocal=(vAtlasPosition.xz-vec2(-1400.,-1535.))/vec2(242.,258.);
 float htWeight=1.-smoothstep(.48,1.,length(htLocal));
 vec3 htNormal=normalize(cross(dFdx(vAtlasPosition),dFdy(vAtlasPosition)));
 vec3 htTint=mix(vec3(.36,.47,.28),vec3(.64,.69,.60),smoothstep(.25,.72,1.-abs(htNormal.y)));
 diffuseColor.rgb*=mix(vec3(1.),htTint,htWeight);
 `);};m.customProgramCacheKey=()=>key()+'-hiten-local-earth-1';this.mats.hitenGround=m;}
 material(m){const mat=super.material(m);return mat===this.mats.ground&&m.globalSurface&&Math.hypot((m.center[0]+1400)/242,(m.center[2]+1535)/258)-m.radius/242<1?this.mats.hitenGround:mat;}

 lighting(rig,o,d){super.lighting(rig,o,d);if(o.space==='surface'&&o.focus==='hiten'){this.sun.shadow.normalBias=.65;this.sun.shadow.bias=-.00045;}}

 wanted(r,rig,o,d){if(r.data.owner==='hiten'){
   if(o.space!=='surface')return false;
   if(['trees','herbs'].includes(r.data.hitenPart)&&!o.vegetation)return false;
   if(r.data.hitenPart==='herbs'&&(this.quality==='low'||G.length(G.sub(rig.eye,r.data.center))>175))return false;
  }return super.wanted(r,rig,o,d);
 }

}G.DioramaRenderer=HitenRenderer;
})(globalThis.GA);
