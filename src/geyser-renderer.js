/* Local hot-spring surfaces, intermittent spray and pausable steam.
 * No new lights, textures or offscreen buffers; not a fluid/pressure simulation. */
(function(G){'use strict';const Base=G.DioramaRenderer,ID='geyser_mountain';
class GeyserRenderer extends Base{
 constructor(T,canvas,world){super(T,canvas,world);this.geyserOmen={value:0};this.geyserNight={value:1};this.geyserGround=new Map();this.geyserSource={value:G.GEYSER.waterHeight(world.data,G.GEYSER.pools[0])+.12};
  for(const[k,rough]of[['Rock',.96],['Mineral',.91],['Wood',.94],['Water',.38]]){const m=new T.MeshStandardMaterial({vertexColors:true,roughness:rough,metalness:0,side:T.DoubleSide});m.name='geyser-'+k;m.envMap=this.studioEnv.texture;m.envMapIntensity=.12;this.mats['geyser'+k]=m;}
  for(const key of['geyserMineral','geyserRock']){const mat=this.mats[key];mat.onBeforeCompile=shader=>{shader.vertexShader='varying vec3 vGeyserStone;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvGeyserStone=position;');shader.fragmentShader='varying vec3 vGeyserStone;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    float relief=sin(vGeyserStone.x*1.9+sin(vGeyserStone.z*1.4))*sin(vGeyserStone.z*2.5+vGeyserStone.y*.4);
    float detailFade=(1.-smoothstep(24.,110.,length(vViewPosition)))*(1.-smoothstep(.2,1.0,length(fwidth(vGeyserStone))));
    diffuseColor.rgb*=.94+.036*sin(vGeyserStone.x*.29+vGeyserStone.z*.25)+relief*.025*detailFade;`);};mat.customProgramCacheKey=()=>key+'-surface-1';}
  const p=this.mats.mayoPath,m=p.clone();m.name='geyser-path';m.onBeforeCompile=p.onBeforeCompile;m.customProgramCacheKey=p.customProgramCacheKey.bind(p);this.mats.geyserPath=m;
  const steam=new T.MeshBasicMaterial({vertexColors:true,transparent:true,depthWrite:false,side:T.DoubleSide,toneMapped:true});steam.name='geyser-vapor';
  steam.onBeforeCompile=s=>{s.uniforms.uGeyserTime=this.timeUniform;s.uniforms.uGeyserOmen=this.geyserOmen;s.uniforms.uGeyserNight=this.geyserNight;
   s.vertexShader='uniform float uGeyserTime; varying vec2 vGeyserUV; varying float vGeyserAlpha;\n'+s.vertexShader;
   s.vertexShader=s.vertexShader.replace('#include <project_vertex>',`vec2 corner=normal.xy/normal.z;
    vec3 center=position-vec3(corner*.85,0.);
    float age=fract(uGeyserTime*.095+color.r);
    float pulse=.18+.82*pow(.5+.5*sin(uGeyserTime*.29+1.15+color.g*6.283),3.);
    float mainPlume=1.-color.b;
    vec3 drift=vec3(age*age*mix(4.2,1.1,mainPlume),age*mix(8.+pulse*9.,3.+pulse*11.,mainPlume),-age*age*1.2);
    vec4 mvPosition=modelViewMatrix*vec4(center+drift,1.);
    mvPosition.xy+=corner*(.38+age*mix(3.6,1.7,mainPlume));
    gl_Position=projectionMatrix*mvPosition;
    vGeyserUV=corner;vGeyserAlpha=sin(age*3.14159)*(.13+.095*pulse+mainPlume*.17);`);
   s.fragmentShader='uniform float uGeyserOmen; uniform float uGeyserNight; varying vec2 vGeyserUV; varying float vGeyserAlpha;\n'+s.fragmentShader;
   s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`diffuseColor.rgb=mix(vec3(.68,.74,.72),vec3(.73,.23,.14),uGeyserOmen)*uGeyserNight;
    diffuseColor.a*=vGeyserAlpha*(1.-smoothstep(.14,.99,length(vGeyserUV)));
    if(diffuseColor.a<.003)discard;`);
  };steam.customProgramCacheKey=()=> 'geyser-billboard-v1';this.mats.geyserSteam=steam;
  const jet=new T.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.62,side:T.DoubleSide,depthWrite:false});jet.name='geyser-spray';jet.onBeforeCompile=s=>{s.uniforms.uGeyserSource=this.geyserSource;s.uniforms.uGeyserTime=this.timeUniform;s.uniforms.uGeyserOmen=this.geyserOmen;s.uniforms.uGeyserNight=this.geyserNight;s.vertexShader='uniform float uGeyserTime; uniform float uGeyserSource;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    float power=.07+.93*pow(.5+.5*sin(uGeyserTime*.29+1.15),3.);
    transformed.y=uGeyserSource+(position.y-uGeyserSource)*power;
    transformed.x+=sin(position.y*2.+uGeyserTime*4.)*.07*power;`);
   s.fragmentShader='uniform float uGeyserOmen;uniform float uGeyserNight;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.87,.25,.11),uGeyserOmen*.8)*uGeyserNight;`);
  };jet.customProgramCacheKey=()=> 'geyser-intermittent-spray-v1';this.mats.geyserJet=jet;
 }
 groundVariant(src){if(this.geyserGround.has(src))return this.geyserGround.get(src);const m=src.clone(),prior=src.onBeforeCompile,key=src.customProgramCacheKey.bind(src);m.name='geyser-earth-'+src.name;m.onBeforeCompile=(s,r)=>{prior.call(src,s,r);s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec2 thermal=(vAtlasPosition.xz-vec2(-1254.,-471.))/vec2(80.,62.);
   float thermalEdge=length(thermal)+.035*sin(vAtlasPosition.x*.21)*sin(vAtlasPosition.z*.14);
   float thermalWeight=1.-smoothstep(.43,1.,thermalEdge);
   float broadAsh=.94+.045*sin(vAtlasPosition.x*.12+vAtlasPosition.z*.10);
   diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.40,.405,.33)*broadAsh,thermalWeight*.84);`);};m.customProgramCacheKey=()=>key()+'-geyser-ash-v1';this.geyserGround.set(src,m);this.mats['geyserGround'+this.geyserGround.size]=m;return m;}
 material(m){if(m.owner===ID&&this.mats[m.material])return this.mats[m.material];const mat=super.material(m);return m.globalSurface&&m.component==='island-terrain'&&Math.hypot((m.center[0]+1254)/80,(m.center[2]+471)/62)-m.radius/62<1?this.groundVariant(mat):mat;}
 wanted(r,rig,o,d){const m=r.data;if(m.owner===ID){if(o.space!=='surface')return false;const p=G.PRESETS[o.view]||{};if(p.geyserNoSteam&&['steam','jet'].includes(m.geyserPart))return false;if(m.geyserPart==='gravel'&&(this.quality==='low'||G.length(G.sub(rig.eye,m.center))-m.radius>85))return false;}return super.wanted(r,rig,o,d);}
 render(rig,o={}){this.geyserOmen.value=G.PRESETS[o.view]?.geyserOmen?1:0;this.geyserNight.value=o.lighting==='night'?.27:o.lighting==='dusk'?.65:1;super.render(rig,o);if(o.space==='surface'&&this.records.some(r=>r.wanted&&r.data.owner===ID&&['steam','jet'].includes(r.data.geyserPart)))this.hasVisibleAnimation=true;}
}
G.DioramaRenderer=GeyserRenderer;
})(globalThis.GA);
