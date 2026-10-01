/* Local facility materials and reversible green shaft lighting.
 * Reuses four focus lamps. No new light, texture, render target or animation loop.
 */
(function(G){'use strict';
const Base=G.DioramaRenderer,ID='geyser_center',SPACE='geyser_center_inside';
class GeyserCenterRenderer extends Base {
 constructor(T,canvas,world){
  super(T,canvas,world);this.centerWasActive=false;
  this.centerLampDefaults=this.focusLamps.map(l=>({color:l.color.clone(),distance:l.distance,decay:l.decay}));
  for(const [key,rough,metal]of[['Concrete',.93,0],['Stone',.91,0],['Metal',.69,.24],['Cable',.88,.10],['Rock',.96,0],['Glass',.36,.05],['Lamp',.7,0]]){
   const m=new T.MeshStandardMaterial({vertexColors:true,roughness:rough,metalness:metal,side:T.DoubleSide});
   m.name='geyser-center-'+key;m.envMap=this.studioEnv.texture;m.envMapIntensity=.09;this.mats['center'+key]=m;
  }
  this.mats.centerLamp.emissive.set(0x79b98b);this.mats.centerLamp.emissiveIntensity=.60;
  const path=this.mats.mayoPath,m=path.clone();m.name='center-path';m.onBeforeCompile=path.onBeforeCompile;m.customProgramCacheKey=path.customProgramCacheKey.bind(path);this.mats.centerPath=m;
  for(const key of['centerConcrete','centerRock']){
   const m=this.mats[key];m.onBeforeCompile=s=>{
    s.vertexShader='varying vec3 vCenterLocal;\n'+s.vertexShader;
    s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvCenterLocal=position;');
    s.fragmentShader='varying vec3 vCenterLocal;\n'+s.fragmentShader;
    s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
     float ccBroad=sin(vCenterLocal.y*.42+.25*sin(vCenterLocal.x*.5))*sin(vCenterLocal.z*.27);
     float ccFade=(1.-smoothstep(20.,105.,length(vViewPosition)))*(1.-smoothstep(.3,1.2,length(fwidth(vCenterLocal))));
     diffuseColor.rgb*=.97+ccBroad*.032*ccFade;
    `);
   };m.customProgramCacheKey=()=>key+'-finish-1';
  }
 }
 material(m){return m.owner===ID&&this.mats[m.material]?this.mats[m.material]:super.material(m);}
 wanted(r,rig,o,d){
  const m=r.data,p=G.PRESETS[o.view]||{};
  if(o.space===SPACE){
   if(m.owner!==ID||m.centerScene!=='inside'||m.overview===this.packs.has(ID))return false;
   if(p.centerCut&&['roof','outer'].includes(m.centerPart))return false;
   if(!p.centerShell&&m.centerPart==='outer')return false;
   if(m.centerPart==='lid'&&!p.centerLid)return false;
   if(p.centerLid&&['car','hoistHigh','hoistLow'].includes(m.centerPart))return false;
   if(m.centerPart==='hoistHigh'&&p.centerCarY)return false;
   if(m.centerPart==='hoistLow'&&!p.centerCarY)return false;
   if(this.quality==='low'&&m.centerPart==='instruments')return false;
   const offset=[0,m.centerPart==='car'?(p.centerCarY||0):0,0],center=G.add(m.center,offset);
   r.distance=G.length(G.sub(rig.eye,center));r.displayCenter=center;r.xf={scale:1,offset};
   return G.visibleSphere(rig.planes,center,m.radius+1);
  }
  if(m.owner===ID&&m.centerScene!=='surface')return false;
  return super.wanted(r,rig,o,d);
 }
 lighting(rig,o,d){
  if(this.centerWasActive){this.focusLamps.forEach((l,i)=>{const a=this.centerLampDefaults[i];l.color.copy(a.color);l.distance=a.distance;l.decay=a.decay;});this.centerWasActive=false;}
  super.lighting(rig,o,d);if(o.space!==SPACE)return;this.centerWasActive=true;
  const p=G.PRESETS[o.view]||{},cut=!!(p.centerCut||p.centerShell);
  this.activeSpace=SPACE;this.sky.visible=false;this.rain.visible=false;
  this.scene.background.set(cut?0x50635b:0x30463c);this.scene.fog.color.set(0x324c40);
  this.scene.fog.near=cut?170:50;this.scene.fog.far=cut?560:155;
  this.hemisphere.color.set(0xbdd8c5);this.hemisphere.groundColor.set(0x667364);this.hemisphere.intensity=cut?1.35:.90;
  this.ambient.color.set(0xb1cbb9);this.ambient.intensity=cut?.4:.30;
  this.sun.color.set(0xcbdcc6);this.sun.intensity=cut?1.55:.52;this.rim.color.set(0x89ad9e);this.rim.intensity=.25;
  this.weatherSunOffset=[-42,85,64];for(const l of this.localLights)l.visible=false;
  [[12,3,0],[-12,3,0],[0,-24,-12],[0,5,30]].forEach((pos,i)=>{
   const l=this.focusLamps[i];l.position.fromArray(pos);l.color.set(i===3?0xd6d8aa:0x97d3a7);
   l.intensity=cut?18:i===3?75:105;l.distance=33;l.decay=2;l.visible=!cut;
  });this.coverUniform.value=0;this.mistUniform.value=0;this.inspectionUniform.value=0;
 }
 render(rig,o={}){return super.render(rig,o.space===SPACE?{...o,weather:'clear',lighting:'neutral',reflections:false}:o);}
}
G.DioramaRenderer=GeyserCenterRenderer;
})(globalThis.GA);
