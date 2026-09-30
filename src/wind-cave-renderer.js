/* Cave-local materials and daylight fill. No new render targets or point lights. */
(function(G){'use strict';const Base=G.DioramaRenderer,ID='wind_cave',SPACE='wind_grotto';
class WindCaveRenderer extends Base{
 constructor(T,canvas,world){super(T,canvas,world);
  for(const[k,rough]of[['Rock',.96],['Stone',.85],['Soil',.98],['Wood',.95],['Leaf',.98],['Water',.43]]){const m=new T.MeshStandardMaterial({vertexColors:true,roughness:rough,metalness:0,side:T.DoubleSide});m.name='wind-'+k;m.envMap=this.studioEnv.texture;m.envMapIntensity=.07;this.mats['wind'+k]=m;}
  this.mats.windShadow=new T.MeshBasicMaterial({vertexColors:true,side:T.DoubleSide});this.mats.windShadow.name='wind-extent';
  const path=this.mats.mayoPath;this.mats.windPath=path.clone();this.mats.windPath.name='wind-path';this.mats.windPath.onBeforeCompile=path.onBeforeCompile;this.mats.windPath.customProgramCacheKey=path.customProgramCacheKey.bind(path);
  for(const key of['windRock','windStone']){const m=this.mats[key];m.onBeforeCompile=s=>{s.vertexShader='varying vec3 vWindRock;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvWindRock=position;');s.fragmentShader='varying vec3 vWindRock;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float wBroad=sin(vWindRock.x*.31+sin(vWindRock.y*.22)+vWindRock.z*.12)*sin(vWindRock.y*.24-vWindRock.z*.17);
   float wFade=(1.-smoothstep(28.,115.,length(vViewPosition)))*(1.-smoothstep(.25,.90,length(fwidth(vWindRock))));
   float wRills=sin(vWindRock.x*3.+.5*sin(vWindRock.z*1.7)+vWindRock.y*.12);
   diffuseColor.rgb*=.96+.045*wBroad+.018*wRills*wFade;
  `);};m.customProgramCacheKey=()=>key+'-calcite-1';}
  const dust=new T.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.13,side:T.DoubleSide,depthWrite:false});dust.name='wind-dust';dust.onBeforeCompile=s=>{s.uniforms.uWindTime=this.timeUniform;s.vertexShader='uniform float uWindTime;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.z+=mod(uWindTime*2.1,12.);transformed.y+=sin(uWindTime*.8+position.z*.05)*.08;');};dust.customProgramCacheKey=()=> 'wind-motes-1';this.mats.windDust=dust;
 }
 material(m){return m.owner===ID&&this.mats[m.material]?this.mats[m.material]:super.material(m);}
 wanted(r,rig,o,d){const m=r.data,p=G.PRESETS[o.view]||{};if(o.space===SPACE){if(m.owner!==ID||m.windScene!=='cave'||m.overview===this.packs.has(ID))return false;
   if(p.windCut&&['roof','outer','extent'].includes(m.windPart))return false;
   if(!p.windShell&&m.windPart==='outer')return false;
   if(m.windPart==='dust'&&(this.quality==='low'||p.windCut||p.windShell))return false;
   r.distance=G.length(G.sub(rig.eye,m.center));r.displayCenter=m.center;r.xf={scale:1,offset:[0,0,0]};return G.visibleSphere(rig.planes,m.center,m.radius+1);
  }if(m.owner===ID&&m.windScene!=='surface')return false;return super.wanted(r,rig,o,d);
 }
 lighting(rig,o,d){super.lighting(rig,o,d);if(o.space!==SPACE)return;const p=G.PRESETS[o.view]||{},cut=!!(p.windCut||p.windShell);this.activeSpace=SPACE;this.sky.visible=false;this.rain.visible=false;
  this.scene.background.set(cut?0x475653:0x26383e);this.scene.fog.color.set(cut?0x475653:0x374e53);this.scene.fog.near=cut?220:58;this.scene.fog.far=cut?680:162;
  this.hemisphere.color.set(0xc3d5d1);this.hemisphere.groundColor.set(0x6f7770);this.hemisphere.intensity=cut?1.4:1.08;this.ambient.color.set(0xb8c8c3);this.ambient.intensity=cut?.42:.45;
  this.sun.color.set(0xe0e2cf);this.sun.intensity=cut?1.5:.88;this.rim.color.set(0x86b0b5);this.rim.intensity=.4;this.weatherSunOffset=[-34,92,90];
  for(const l of[...this.localLights,...this.focusLamps])l.visible=false;this.coverUniform.value=0;this.mistUniform.value=0;this.inspectionUniform.value=0;
 }
 render(rig,o={}){super.render(rig,o.space===SPACE?{...o,weather:'clear',lighting:'neutral',reflections:false}:o);if(o.space===SPACE&&this.quality!=='low'&&this.records.some(r=>r.wanted&&r.data.windPart==='dust'))this.hasVisibleAnimation=true;}
}
G.DioramaRenderer=WindCaveRenderer;
})(globalThis.GA);
