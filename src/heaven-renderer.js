/* Own heavenly climate and TH105/TH155 selections; no global season/weather mutations. */
(function(G){
'use strict';
const Base=G.DioramaRenderer,active=s=>G.HEAVEN.spaces.includes(s);
class HeavenRenderer extends Base{
 constructor(T,canvas,world){
  super(T,canvas,world);this.heavenEdition={value:0};this.heavenScarlet={value:0};
  const definitions={Turf:[.98,0],Rock:[.94,0],Stone:[.88,0],Paving:[.88,0],Wood:[.79,0],Tile:[.49,.06],Metal:[.5,.26],Bark:[.97,0],Leaf:[.90,0],Fruit:[.78,0],Flower:[.94,0],Rope:[.98,0],Paper:[.94,0]};
  for(const[key,[roughness,metalness]]of Object.entries(definitions)){
   const m=new T.MeshStandardMaterial({vertexColors:true,roughness,metalness,side:T.DoubleSide});m.name='heaven-'+key;m.envMap=this.studioEnv.texture;m.envMapIntensity=.12;
   m.onBeforeCompile=s=>{
    s.uniforms.uHeavenEdition=this.heavenEdition;
    s.fragmentShader='uniform float uHeavenEdition;\n'+s.fragmentShader;
    if(key==='Turf')s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat grey=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(grey*.79,grey*.85,grey*1.05),uHeavenEdition);');
    if(['Wood','Bark','Tile'].includes(key))s.fragmentShader=s.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vColor.rgb*.018;');
   };m.customProgramCacheKey=()=> 'heaven-022-'+key;this.mats['heaven'+key]=m;
  }
  const noise=`float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}float fbm(vec2 p){return .55*noise(p)+.28*noise(p*2.13+7.)+.17*noise(p*4.37+13.);}`;
  this.mats.heavenCloud=new T.ShaderMaterial({vertexColors:true,side:T.DoubleSide,transparent:true,depthWrite:false,toneMapped:false,
   uniforms:{uTime:this.timeUniform,uScarlet:this.heavenScarlet,uEdition:this.heavenEdition},
   vertexShader:'varying vec3 vParam;uniform float uTime;void main(){vParam=color;vec3 p=position;p.x+=sin(uTime*.045+color.z*6.28)*7.;p.y+=sin(uTime*.067+color.z*4.0)*2.;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}',
   fragmentShader:`varying vec3 vParam;uniform float uTime;uniform float uScarlet;uniform float uEdition;${noise}
    void main(){vec2 q=(vParam.xy-.5)*2.;float edge=(1.-smoothstep(.45,1.,abs(q.x)))*(1.-smoothstep(.40,1.,abs(q.y)));
    float n=fbm(vParam.xy*4.3+vec2(uTime*.018+vParam.z*8.,vParam.z*3.));float a=edge*smoothstep(.23,.72,n)*.68;
    vec3 col=mix(vec3(.38,.52,.62),vec3(.78,.84,.84),smoothstep(.24,.76,n));
    col=mix(col,vec3(.36,.13,.17)+n*vec3(.20,.11,.09),uScarlet*.88);col=mix(col,col*vec3(.40,.43,.67),uEdition*.60);
    gl_FragColor=vec4(col,a);}`
  });
  this.mats.heavenAurora=new T.ShaderMaterial({vertexColors:true,side:T.DoubleSide,transparent:true,depthWrite:false,toneMapped:false,
   uniforms:{uTime:this.timeUniform},
   vertexShader:'varying vec3 vParam;uniform float uTime;void main(){vParam=color;vec3 p=position;p.y+=sin(color.x*17.+uTime*.07+color.z*6.28)*14.;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}',
   fragmentShader:`varying vec3 vParam;uniform float uTime;${noise}
    void main(){float curtain=.38+.62*pow(.5+.5*sin(vParam.x*380.+sin(vParam.x*37.+uTime*.06)*5.),3.);
    float shape=sin(vParam.y*3.14159)*smoothstep(0.,.06,vParam.x)*(1.-smoothstep(.94,1.,vParam.x));
    float n=fbm(vec2(vParam.x*16.+uTime*.008,vParam.z*4.));
    vec3 col=mix(vec3(.045,.44,.30),vec3(.28,.12,.44),smoothstep(.18,.90,vParam.y));
    col=mix(col,vec3(.06,.26,.43),vParam.z*.35);gl_FragColor=vec4(col,shape*curtain*(.19+n*.29));}`
  });
  this.heavenSky=new T.Mesh(new T.SphereGeometry(9000,32,20),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,toneMapped:false,
   uniforms:{uTime:this.timeUniform,uScarlet:this.heavenScarlet,uEdition:this.heavenEdition,uCloud:{value:0}},
   vertexShader:'varying vec3 vD;void main(){vD=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
   fragmentShader:`varying vec3 vD;uniform float uTime;uniform float uScarlet;uniform float uEdition;uniform float uCloud;${noise}
    void main(){vec3 d=normalize(vD);float horizon=exp(-abs(d.y)*4.9);vec3 zenith=mix(vec3(.067,.25,.48),vec3(.085,.13,.20),uCloud);
    vec3 haze=mix(vec3(.55,.71,.77),vec3(.31,.41,.49),uCloud);vec3 col=mix(zenith,haze,horizon);
    float n=fbm(d.xz*5.+vec2(uTime*.003));col+=n*horizon*.035;
    col=mix(col,mix(vec3(.115,.045,.085),vec3(.40,.16,.18),horizon),uScarlet*.82);
    col=mix(col,mix(vec3(.017,.027,.065),vec3(.14,.19,.28),horizon),uEdition*.91);gl_FragColor=vec4(col,1.);}`
  }));this.heavenSky.visible=false;this.heavenSky.frustumCulled=false;this.heavenSky.renderOrder=-100;this.scene.add(this.heavenSky);
  this.heavenFill=new T.PointLight(0xffddaa,65,52,1.5);this.heavenFill.position.set(-110,82,-25);this.heavenFill.visible=false;this.scene.add(this.heavenFill);
  this.heavenNoShadow=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,depthWrite:false,colorWrite:false});
 }
 ensure(r,level){const o=super.ensure(r,level);if(G.HEAVEN.regions.includes(r.data.owner)&&r.data.shadowCaster===false&&this.heavenNoShadow)o.customDepthMaterial=this.heavenNoShadow;return o;}
 wanted(r,rig,opts,distance){
  const m=r.data,ours=G.HEAVEN.regions.includes(m.owner);if(!active(opts.space))return ours?false:super.wanted(r,rig,opts,distance);
  if(!ours||m.space!==opts.space||m.overview===this.packs.has(m.owner))return false;
  if(m.heavenEdition!=='both'&&m.heavenEdition!==(opts.heavenEdition||'th105'))return false;
  if(m.heavenPart==='banquet'&&!opts.heavenBanquet)return false;
  if(m.heavenPart==='plants'&&opts.vegetation===false)return false;
  if(m.heavenPart==='aurora'&&opts.heavenEdition!=='th155')return false;
  r.distance=G.length(G.sub(rig.eye,m.center));r.displayCenter=m.center;r.xf={scale:1,offset:[0,0,0]};return G.visibleSphere(rig.planes,m.center,m.radius+9);
 }
 lighting(rig,opts,distance){
  super.lighting(rig,opts,distance);
  const yes=active(opts.space),cloud=opts.space==='genkumoumi',edition=opts.heavenEdition==='th155';
  this.heavenSky.visible=yes;this.heavenFill.visible=yes&&!cloud&&!edition&&!!opts.heavenInterior&&this.packs.has('heaven');
  this.heavenScarlet.value=yes&&cloud&&opts.heavenScarlet?1:0;this.heavenEdition.value=yes&&edition?1:0;
  if(!yes)return;
  this.activeSpace=opts.space;this.sky.visible=false;this.rain.visible=false;this.heavenSky.position.fromArray(rig.eye);this.heavenSky.material.uniforms.uCloud.value=cloud?1:0;
  const fog=edition?[.14,.19,.28]:opts.heavenScarlet?[.39,.17,.20]:cloud?[.31,.41,.49]:[.55,.71,.77];
  this.scene.background.setRGB(...fog);this.scene.fog.color.setRGB(...fog);this.scene.fog.near=cloud?530:900;this.scene.fog.far=cloud?2350:3500;
  this.hemisphere.color.set(edition?0xb4c7f1:cloud?0xd5dfe9:0xe0f0ff);this.hemisphere.groundColor.set(edition?0x767491:cloud?0x858d96:0x9cac99);this.hemisphere.intensity=edition?.88:cloud?.98:1.02;
  this.ambient.color.set(0xdadfdc);this.ambient.intensity=.08;this.sun.color.set(opts.heavenScarlet?0xf3bbb0:edition?0xc7d7ff:0xffeddb);this.sun.intensity=cloud?1.1:edition?1.0:1.8;
  this.rim.color.set(0xb3ceea);this.rim.intensity=.30;this.weatherSunOffset=[-395,660,410];this.sun.shadow.bias=-.0005;this.sun.shadow.normalBias=.6;
  for(const l of[...this.localLights,...this.focusLamps])l.visible=false;
  this.coverUniform.value=0;this.mistUniform.value=0;this.inspectionUniform.value=0;
 }
 render(rig,opts={}){const key=[opts.space,opts.heavenEdition,opts.heavenScarlet,opts.heavenInterior].join('|');if(this.heavenKey!==key){this.heavenKey=key;this.engine.shadowMap.needsUpdate=true;}super.render(rig,active(opts.space)?{...opts,weather:'clear',lighting:'neutral'}:opts);if(active(opts.space))this.stats.heavenEdition=opts.heavenEdition||'th105';}
 dropPack(id){super.dropPack(id);if(id==='heaven'&&this.heavenFill)this.heavenFill.visible=false;}
 dispose(){this.heavenNoShadow.dispose();this.scene.remove(this.heavenSky,this.heavenFill);this.heavenSky.geometry.dispose();this.heavenSky.material.dispose();this.heavenFill.dispose();super.dispose();}
}
G.DioramaRenderer=HeavenRenderer;
// Preserve every old camera rule; allow orbit inspection below the authored sky-rocks only.
const CameraBase=G.CameraRig;
G.CameraRig=class HeavenCamera extends CameraBase{
 rotate(dx,dy){if(this.mode!=='fly'&&active(this.space)){this.transition=null;this.yaw-=dx*.004;this.phi=G.clamp(this.phi-dy*.003,.07,3.05);this.changed();}else super.rotate(dx,dy);}
};
})(globalThis.GA);
