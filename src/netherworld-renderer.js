/* Netherworld spring/snow views remain local to their own chart. */
(function(G){
'use strict';
const Base=G.DioramaRenderer;
class NetherworldRenderer extends Base{
 constructor(T,canvas,world){
  super(T,canvas,world);this.netherWinter={value:0};
  for(const [key,roughness,metalness]of [['Soil',1,0],['Stone',.89,0],['Paving',.85,0],['Rock',.94,0],['Moss',.95,0],['Gravel',1,0],['Wood',.77,0],['Bark',.99,0],['Wall',.89,0],['Paper',.99,0],['Tile',.56,.045],['TileEdge',.63,.06],['Tatami',.99,0],['Blossom',.95,0],['Pine',.98,0],['Rope',.94,0],['Cloth',.95,0],['Lamp',.83,0]]){
   const m=new T.MeshStandardMaterial({vertexColors:true,roughness,metalness,side:T.DoubleSide});m.name='nether-'+key;m.envMap=this.studioEnv.texture;m.envMapIntensity=.13;
   m.onBeforeCompile=s=>{
    s.uniforms.uNetherWinter=this.netherWinter;s.vertexShader='varying vec3 vNetherPos;varying vec3 vNetherNormal;\n'+s.vertexShader;
    s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvNetherPos=position;vNetherNormal=normal;');
    s.fragmentShader='varying vec3 vNetherPos;varying vec3 vNetherNormal;uniform float uNetherWinter;\n'+s.fragmentShader;
    let code='';
    if(key==='Gravel')code=`float rings=1e3;
      rings=min(rings,length((vNetherPos.xz-vec2(-32.,-70.))*vec2(.70,1.)));
      rings=min(rings,length((vNetherPos.xz-vec2(24.,-82.))*vec2(.83,1.)));
      rings=min(rings,length((vNetherPos.xz-vec2(-9.,-38.))*vec2(.80,1.)));
      rings=min(rings,length((vNetherPos.xz-vec2(40.,-31.))*vec2(.78,1.)));
      rings=min(rings,length((vNetherPos.xz-vec2(-41.,-13.))*vec2(.73,1.)));
      float q=mix(vNetherPos.z*.88,rings*.88,1.-smoothstep(7.,14.,rings));
      float line=sin(q*6.28318);float aa=max(fwidth(q)*6.28,.06);
      diffuseColor.rgb*=1.-(1.-smoothstep(-aa,aa,line))*.085*(1.-uNetherWinter);`;
    if(['Soil','Stone','Paving','Rock','Moss','Gravel','Tile','TileEdge','Pine','Bark'].includes(key))code+='float snow=uNetherWinter*smoothstep(.24,.83,normalize(vNetherNormal).y);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.77,.81,.84),snow*.92);';
    s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n'+code);
    if(['Wood','Bark','Tile'].includes(key))s.fragmentShader=s.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vColor.rgb*.018;');
   };m.customProgramCacheKey=()=> 'nether-021-'+key;this.mats['nether'+key]=m;
  }
  this.mats.netherLamp.emissive.set(0xffd6a8);this.mats.netherLamp.emissiveIntensity=.55;
  this.mats.netherBoundary=new T.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.25,depthWrite:false,side:T.DoubleSide});
  this.mats.netherSpirit=new T.MeshStandardMaterial({vertexColors:true,transparent:true,opacity:.52,depthWrite:false,roughness:.9,side:T.DoubleSide,emissive:0x7ea69e,emissiveIntensity:.35});
  this.mats.netherSpirit.onBeforeCompile=s=>{s.uniforms.uNetherTime=this.timeUniform;s.vertexShader='uniform float uNetherTime;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.y+=sin(uNetherTime*.42+position.z*.014)*1.1;');};
  this.mats.netherPetal=new T.ShaderMaterial({side:T.DoubleSide,depthWrite:false,transparent:true,uniforms:{uTime:this.timeUniform},
   vertexShader:`uniform float uTime;varying float vAlpha;void main(){vec3 p=position;
    p.x+=sin(uTime*.28+position.z*.043)*1.6;
    p.y+=sin(uTime*.37+position.x*.043)*1.2;
    vAlpha=.48+.18*sin(position.x*.14+uTime*.2);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
   fragmentShader:'varying float vAlpha;void main(){gl_FragColor=vec4(.72,.48,.59,vAlpha);}'
  });
  this.mats.netherMist=new T.ShaderMaterial({vertexColors:true,side:T.DoubleSide,transparent:true,depthWrite:false,toneMapped:false,uniforms:{uTime:this.timeUniform},
   vertexShader:'varying vec3 vParam;uniform float uTime;void main(){vParam=color;vec3 p=position;p.x+=sin(uTime*.06+color.z*6.28)*2.;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}',
   fragmentShader:'varying vec3 vParam;uniform float uTime;void main(){vec2 q=(vParam.xy-.5)*2.;float a=exp(-dot(q,q)*3.6)*(1.-smoothstep(.6,1.,abs(q.x)))*(1.-smoothstep(.6,1.,abs(q.y)));a*=.12+.045*sin(vParam.x*6.+vParam.z*5.+uTime*.06);gl_FragColor=vec4(.50,.55,.61,a);}'
  });
  this.netherSky=new T.Mesh(new T.SphereGeometry(8200,24,16),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,toneMapped:false,uniforms:{uWinter:this.netherWinter},
   vertexShader:'varying vec3 vD;void main(){vD=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
   fragmentShader:`varying vec3 vD;uniform float uWinter;void main(){vec3 d=normalize(vD);float h=exp(-abs(d.y)*3.9);
    vec3 sky=mix(vec3(.14,.26,.39),vec3(.35,.42,.51),h);sky=mix(sky,mix(vec3(.30,.38,.45),vec3(.57,.61,.66),h),uWinter);
    gl_FragColor=vec4(sky,1.);}`
  }));this.netherSky.visible=false;this.netherSky.frustumCulled=false;this.netherSky.renderOrder=-100;this.scene.add(this.netherSky);
  this.netherFill=new T.PointLight(0xffdeb4,90,90,1.5);this.netherFill.position.set(0,106,-126);this.netherFill.visible=false;this.scene.add(this.netherFill);
  this.netherNoShadow=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,depthWrite:false,colorWrite:false});
 }
 ensure(r,level){const mesh=super.ensure(r,level);if(r.data.owner==='netherworld'&&r.data.shadowCaster===false&&this.netherNoShadow)mesh.customDepthMaterial=this.netherNoShadow;return mesh;}
 wanted(r,rig,opts,distance){
  const m=r.data,ours=m.owner==='netherworld';if(opts.space!=='netherworld')return ours?false:super.wanted(r,rig,opts,distance);
  if(!ours)return false;if(m.overview===this.packs.has('netherworld'))return false;
  if(m.netherPart==='buds'&&(!opts.netherBuds||opts.netherWinter))return false;
  if(['flowers','petals'].includes(m.netherPart)&&opts.netherWinter)return false;
  if(['flowers','plants','petals'].includes(m.netherPart)&&opts.vegetation===false)return false;
  if(opts.netherSection){if(!['hall','estateBase','dryGarden'].includes(m.netherZone))return false;if(['roof','shell'].includes(m.netherPart))return false;}
  r.distance=G.length(G.sub(rig.eye,m.center));r.displayCenter=m.center;r.xf={scale:1,offset:[0,0,0]};return G.visibleSphere(rig.planes,m.center,m.radius+7);
 }
 lighting(rig,opts,distance){
  super.lighting(rig,opts,distance);const active=opts.space==='netherworld';this.netherSky.visible=active;
  this.netherFill.visible=active&&!!opts.netherInterior&&this.packs.has('netherworld');this.netherWinter.value=active&&opts.netherWinter?1:0;
  if(!active)return;
  this.activeSpace='netherworld';this.sky.visible=false;this.rain.visible=false;this.netherSky.position.fromArray(rig.eye);
  this.scene.background.set(0xa5aab5);this.scene.fog.color.setRGB(...(opts.netherWinter?[.57,.61,.66]:[.35,.42,.51]));this.scene.fog.near=620;this.scene.fog.far=1630;
  this.hemisphere.color.set(0xd5e3f1);this.hemisphere.groundColor.set(0x92928a);this.hemisphere.intensity=1.05;
  this.ambient.color.set(0xe0d5d5);this.ambient.intensity=.10;this.sun.color.set(opts.netherWinter?0xe2ebf5:0xffead5);this.sun.intensity=opts.netherWinter?1.25:1.65;
  this.rim.color.set(0xbbcced);this.rim.intensity=.25;this.weatherSunOffset=[-420,690,290];
  this.sun.shadow.bias=-.0005;this.sun.shadow.normalBias=.45;
  for(const l of[...this.localLights,...this.focusLamps])l.visible=false;
  this.coverUniform.value=0;this.mistUniform.value=0;this.inspectionUniform.value=0;
 }
 render(rig,opts={}){const key=[opts.space,opts.netherWinter,opts.netherSection,opts.netherBuds].join('|');if(this.netherKey!==key){this.netherKey=key;this.engine.shadowMap.needsUpdate=true;}super.render(rig,opts.space==='netherworld'?{...opts,weather:'clear',lighting:'neutral'}:opts);}
 dropPack(id){super.dropPack(id);if(id==='netherworld'&&this.netherFill)this.netherFill.visible=false;}
 dispose(){this.netherNoShadow.dispose();this.scene.remove(this.netherSky,this.netherFill);this.netherSky.geometry.dispose();this.netherSky.material.dispose();this.netherFill.dispose();super.dispose();}
}
G.DioramaRenderer=NetherworldRenderer;
})(globalThis.GA);
