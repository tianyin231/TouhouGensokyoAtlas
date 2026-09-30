/* Field-only materials; share the existing daylight, weather and lifetime rules.
 * No new lights, textures, offscreen targets, worker pool or animation clocks. */
(function(G){'use strict';const Base=G.DioramaRenderer,ID='cucumber_farm';
class CucumberRenderer extends Base{
 constructor(T,canvas,world){super(T,canvas,world);
  for(const[k,rough]of[['Soil',1],['Stone',.97],['Wood',.94],['Bamboo',.91],['Leaf',.97],['Herb',1],['Fruit',.78],['Metal',.71],['Water',.36],['Roof',.92]]){const m=new T.MeshStandardMaterial({vertexColors:true,roughness:rough,metalness:k==='Metal'?.13:0,side:T.DoubleSide});m.name='cucumber-'+k;m.shadowSide=T.BackSide;m.envMap=this.studioEnv.texture;m.envMapIntensity=.1;this.mats['cucumber'+k]=m;}
  const path=this.mats.mayoPath;this.mats.cucumberPath=path.clone();this.mats.cucumberPath.name='cucumber-path';this.mats.cucumberPath.onBeforeCompile=path.onBeforeCompile;this.mats.cucumberPath.customProgramCacheKey=path.customProgramCacheKey.bind(path);
  this.cucumberGroundVariants=new Map();
 }
 groundFor(src){if(this.cucumberGroundVariants.has(src))return this.cucumberGroundVariants.get(src);const prior=src.onBeforeCompile,key=src.customProgramCacheKey.bind(src),m=src.clone();m.name='cucumber-on-'+src.name;m.onBeforeCompile=(s,r)=>{prior.call(src,s,r);s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    vec2 cfLocal=(vAtlasPosition.xz-vec2(-1960.,-1310.))/vec2(90.,76.);
    float cfWeight=1.-smoothstep(.40,1.,length(cfLocal)+.023*sin(vAtlasPosition.x*.16)*sin(vAtlasPosition.z*.13));
    diffuseColor.rgb*=mix(vec3(1.),vec3(.74,.82,.65),cfWeight);
   `);};m.customProgramCacheKey=()=>key()+'-cucumber-earth-1';this.cucumberGroundVariants.set(src,m);this.mats['cucumberGround'+this.cucumberGroundVariants.size]=m;return m;}
 material(m){if(m.owner===ID&&this.mats[m.material])return this.mats[m.material];const mat=super.material(m);return m.globalSurface&&m.component==='island-terrain'&&Math.hypot((m.center[0]+1960)/90,(m.center[2]+1310)/76)-m.radius/76<1?this.groundFor(mat):mat;}
 wanted(r,rig,o,d){const m=r.data;if(m.owner===ID){if(o.space!=='surface')return false;if(m.cucumberPart==='roof'&&G.PRESETS[o.view]?.cucumberCutRoof)return false;if(['props','produce','herbs'].includes(m.cucumberPart)&&(this.quality==='low'||G.length(G.sub(rig.eye,m.center))-m.radius>90))return false;}return super.wanted(r,rig,o,d);}
}
G.DioramaRenderer=CucumberRenderer;
})(globalThis.GA);
