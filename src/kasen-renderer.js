/* Kasen lighting is scoped. No global shader replacement or source-text mutation. */
(function(G){
 'use strict';const Base=G.DioramaRenderer,active=s=>s===G.KASEN.space;
 class KasenRenderer extends Base{
  constructor(T,canvas,world){
   super(T,canvas,world);this.kasenInk={value:0};this.kasenNight={value:0};
   const defs={Grass:[.98,0],Rock:[.97,0],Stone:[.91,0],Sand:[1,0],Paving:[.92,0],Wall:[.94,0],Wood:[.72,0],Tile:[.49,.08],Trim:[.64,.08],Paper:[.9,0],Props:[.87,0],Leaf:[.93,0],Flower:[.85,0],Lamp:[.8,0],Ritual:[.6,0]};
   for(const[k,[roughness,metalness]]of Object.entries(defs)){
    const m=new T.MeshStandardMaterial({vertexColors:true,roughness,metalness,side:T.DoubleSide});m.name='kasen-'+k;m.envMap=this.studioEnv.texture;m.envMapIntensity=.12;
    m.onBeforeCompile=s=>{s.uniforms.uKasenInk=this.kasenInk;s.fragmentShader='uniform float uKasenInk;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat grey=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(grey*.91,grey*.97,grey),uKasenInk);');};
    m.customProgramCacheKey=()=> 'kasen-026-'+k;this.mats['kasen'+k]=m;
   }
   this.mats.kasenLamp.emissive.set(0xffd59a);this.mats.kasenLamp.emissiveIntensity=.65;this.mats.kasenRitual.emissive.set(0xcca567);this.mats.kasenRitual.emissiveIntensity=.5;
   this.mats.kasenWater=new T.ShaderMaterial({side:T.DoubleSide,toneMapped:false,uniforms:{uTime:this.timeUniform,uInk:this.kasenInk,uNight:this.kasenNight},
    vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec3 vP;uniform float uTime;uniform float uInk;uniform float uNight;void main(){float r=pow(max(0.,sin(vP.z*.9+sin(vP.x*.28)+uTime*.6)),12.);vec3 c=vec3(.28,.49,.49)+r*.07;float gray=dot(c,vec3(.2126,.7152,.0722));c=mix(c,vec3(gray),uInk);c*=1.-uNight*.64;gl_FragColor=vec4(c,1.);}`});
   this.mats.kasenMist=new T.ShaderMaterial({side:T.DoubleSide,transparent:true,depthWrite:false,toneMapped:false,uniforms:{uTime:this.timeUniform,uNight:this.kasenNight},
    vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec3 vP;uniform float uTime;uniform float uNight;void main(){float base=32.+(-vP.z-120.)*.06;float v=clamp((vP.y-base)/38.,0.,1.);float a=pow(max(0.,sin(v*3.1415926)),2.)*.11*(1.-smoothstep(380.,520.,abs(vP.x)))*(.72+.28*sin(vP.x*.017+uTime*.13));vec3 c=mix(vec3(.69,.78,.74),vec3(.13,.19,.24),uNight);gl_FragColor=vec4(c,a);}`});
   this.kasenSky=new T.Mesh(new T.SphereGeometry(8500,24,16),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,toneMapped:false,uniforms:{uInk:this.kasenInk,uNight:this.kasenNight},
    vertexShader:'varying vec3 vD;void main(){vD=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec3 vD;uniform float uInk;uniform float uNight;void main(){vec3 d=normalize(vD);float h=exp(-abs(d.y)*4.);vec3 c=mix(vec3(.39,.61,.65),vec3(.75,.82,.73),h);c=mix(c,mix(vec3(.79,.81,.76),vec3(.91,.91,.84),h),uInk);c=mix(c,mix(vec3(.025,.043,.09),vec3(.12,.18,.24),h),uNight);gl_FragColor=vec4(c,1.);}`}));
   this.kasenSky.visible=false;this.kasenSky.frustumCulled=false;this.kasenSky.renderOrder=-100;this.scene.add(this.kasenSky);
   this.kasenFill=new T.PointLight(0xffd8a8,85,55,1.5);this.kasenFill.position.set(33,40,-35);this.kasenFill.visible=false;this.scene.add(this.kasenFill);
   this.kasenNoShadow=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,depthWrite:false,colorWrite:false});
  }
  ensure(r,level){const o=super.ensure(r,level);if(r.data.owner==='kasen'&&r.data.shadowCaster===false)o.customDepthMaterial=this.kasenNoShadow;return o;}
  wanted(r,rig,opts,distance){const m=r.data,ours=m.owner==='kasen';if(!active(opts.space))return ours?false:super.wanted(r,rig,opts,distance);
   if(!ours||m.overview===this.packs.has('kasen'))return false;
   if(m.kasenEdition!=='both'&&m.kasenEdition!==(opts.kasenEdition||'manga'))return false;
   if(m.kasenPart==='ritual'&&!opts.kasenRitual)return false;
   if(m.kasenPart==='plants'&&opts.vegetation===false)return false;
   if(opts.kasenSection&&['roof0','roof1','roof2','upper','front'].includes(m.kasenPart))return false;
   r.distance=G.length(G.sub(rig.eye,m.center));r.displayCenter=m.center;r.xf={scale:1,offset:[0,0,0]};return G.visibleSphere(rig.planes,m.center,m.radius+5);
  }
  lighting(rig,opts,distance){super.lighting(rig,opts,distance);const yes=active(opts.space),ink=opts.kasenEdition==='th155',night=!!opts.kasenNight;
   this.kasenSky.visible=yes;this.kasenFill.visible=yes&&!ink&&(!!opts.kasenInterior||night)&&this.packs.has('kasen');if(!yes)return;
   this.kasenInk.value=ink?1:0;this.kasenNight.value=night?1:0;this.activeSpace=opts.space;this.sky.visible=false;this.rain.visible=false;this.kasenSky.position.fromArray(rig.eye);
   const fog=night?[.12,.18,.24]:ink?[.91,.91,.84]:[.75,.82,.73];this.scene.background.setRGB(...fog);this.scene.fog.color.setRGB(...fog);this.scene.fog.near=ink?190:420;this.scene.fog.far=ink?950:1550;
   this.hemisphere.color.set(night?0xa7bfd9:0xe5efe1);this.hemisphere.groundColor.set(night?0x656d78:0x9faa86);this.hemisphere.intensity=night?.63:1.0;
   this.ambient.color.set(0xdbe0d2);this.ambient.intensity=.11;this.sun.color.set(night?0xadc4dc:0xffeed4);this.sun.intensity=night?.45:ink?.85:1.7;this.rim.color.set(0xc5e1db);this.rim.intensity=.25;
   this.weatherSunOffset=[-390,690,420];this.sun.shadow.bias=-.00045;this.sun.shadow.normalBias=.5;for(const l of[...this.localLights,...this.focusLamps])l.visible=false;this.coverUniform.value=0;this.mistUniform.value=0;this.inspectionUniform.value=0;
  }
  render(rig,opts={}){const key=[opts.space,opts.kasenEdition,opts.kasenNight,opts.kasenSection,opts.kasenRitual,opts.kasenInterior].join('|');if(key!==this.kasenKey){this.kasenKey=key;this.engine.shadowMap.needsUpdate=true;}super.render(rig,active(opts.space)?{...opts,weather:'clear',lighting:'neutral'}:opts);}
  dropPack(id){super.dropPack(id);if(id==='kasen'&&this.kasenFill)this.kasenFill.visible=false;}
  dispose(){this.kasenNoShadow.dispose();this.scene.remove(this.kasenSky,this.kasenFill);this.kasenSky.geometry.dispose();this.kasenSky.material.dispose();this.kasenFill.dispose();super.dispose();}
 }
 G.DioramaRenderer=KasenRenderer;
})(globalThis.GA);
