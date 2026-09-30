/* One local material set and reuse of the existing four-lamp pool. No new shadow
 * maps, environment targets, reflection pass, texture download or animation loop. */
(function(G){'use strict';const Base=G.DioramaRenderer,ID='waterfall_cave',SPACE='falls_cave';
class FallsRenderer extends Base{
 constructor(T,canvas,world){super(T,canvas,world);this.fallsWasActive=false;
  this.fallsLampDefaults=this.focusLamps.map(l=>({color:l.color.clone(),distance:l.distance,decay:l.decay}));
  for(const[k,rough]of[['Rock',.96],['Stone',.93],['Wood',.9],['Iron',.74],['Water',.38],['Lamp',.8]]){const m=new T.MeshStandardMaterial({vertexColors:true,roughness:rough,metalness:k==='Iron'?.18:0,side:T.DoubleSide});m.name='falls-'+k;m.envMap=this.studioEnv.texture;m.envMapIntensity=.10;m.shadowSide=T.BackSide;this.mats['falls'+k]=m;}
  this.mats.fallsLamp.emissive.set(0xf5bd73);this.mats.fallsLamp.emissiveIntensity=.65;
  const curtain=new T.MeshStandardMaterial({vertexColors:true,roughness:.78,transparent:true,opacity:.50,side:T.DoubleSide,depthWrite:false});curtain.name='falls-curtain';curtain.emissive.set(0xadc4c1);curtain.emissiveIntensity=.40;this.mats.fallsCurtain=curtain;
  // Low-amplitude, world-space strata with derivative/distance fade, no dense noise.
  for(const key of['fallsRock','fallsStone']){const m=this.mats[key];m.onBeforeCompile=s=>{s.vertexShader='varying vec3 vFallsLocal;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvFallsLocal=position;');s.fragmentShader='varying vec3 vFallsLocal;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float fcWave=sin(vFallsLocal.y*2.2+.3*sin(vFallsLocal.x*.8)+.2*sin(vFallsLocal.z*.2));
   float fcFade=(1.-smoothstep(20.,85.,length(vViewPosition)))*(1.-smoothstep(.15,.8,length(fwidth(vFallsLocal))));
   diffuseColor.rgb*=1.+fcWave*.025*fcFade;
  `);};m.customProgramCacheKey=()=>key+'-strata-1';}
 }
 material(m){return m.owner===ID&&this.mats[m.material]?this.mats[m.material]:super.material(m);}
 wanted(r,rig,o,d){const m=r.data,p=G.PRESETS[o.view]||{};
  if(o.space===SPACE){if(m.owner!==ID||m.fallsScene!=='tunnel'||m.overview===this.packs.has(ID))return false;
   if(p.fallsCut&&['roof','outer','curtain'].includes(m.fallsPart))return false;
   if(p.fallsShell&&m.fallsPart==='curtain')return false;
   if(!p.fallsShell&&m.fallsPart==='outer')return false;
   if(this.quality==='low'&&m.fallsPart==='small')return false;
   r.distance=G.length(G.sub(rig.eye,m.center));r.displayCenter=m.center;r.xf={scale:1,offset:[0,0,0]};return G.visibleSphere(rig.planes,m.center,m.radius+1);
  }
  if(m.owner===ID&&m.fallsScene!=='surface')return false;
  return super.wanted(r,rig,o,d);
 }
 lighting(rig,o,d){if(this.fallsWasActive){this.focusLamps.forEach((l,i)=>{const v=this.fallsLampDefaults[i];l.color.copy(v.color);l.distance=v.distance;l.decay=v.decay;});this.fallsWasActive=false;}
  super.lighting(rig,o,d);if(o.space!==SPACE)return;this.fallsWasActive=true;
  const p=G.PRESETS[o.view]||{},cut=!!(p.fallsCut||p.fallsShell);this.activeSpace=SPACE;this.sky.visible=false;this.rain.visible=false;
  this.scene.background.set(cut?0x455453:0x819899);this.scene.fog.color.set(cut?0x455453:0x40575b);this.scene.fog.near=cut?170:45;this.scene.fog.far=cut?650:143;
  this.hemisphere.color.set(0xc4d7da);this.hemisphere.groundColor.set(0x65716d);this.hemisphere.intensity=cut?1.1:.72;this.ambient.color.set(0xc4d5d4);this.ambient.intensity=cut?.38:.27;
  this.sun.color.set(0xd6e5df);this.sun.intensity=cut?1.7:.35;this.rim.color.set(0x91b4bb);this.rim.intensity=.25;this.weatherSunOffset=[-45,65,60];
  for(const l of this.localLights)l.visible=false;
  [8,32,61,94].forEach((s,i)=>{const l=this.focusLamps[i],p=G.FALLS_CAVE.point(s,G.FALLS_CAVE.width(s)-.75,3.3);l.position.fromArray([p[0]-.55,p[1],p[2]]);l.color.set(i===0?0xc7e2df:0xffd59a);l.intensity=cut?20:i===1?42:i===0?38:34;l.distance=28;l.decay=2;l.visible=!cut;});
  this.coverUniform.value=0;this.mistUniform.value=0;this.inspectionUniform.value=0;
 }
 render(rig,o={}){return super.render(rig,o.space===SPACE?{...o,weather:'clear',lighting:'neutral',reflections:false}:o);}
}
G.DioramaRenderer=FallsRenderer;
})(globalThis.GA);
