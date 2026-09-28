/* Separate Makai presentation climates; inheritance leaves lunar/hell/castle geometry intact. */
(function(G){
'use strict';
const Base=G.DioramaRenderer,active=s=>G.MAKAI.spaces.includes(s);
class MakaiRenderer extends Base{
 constructor(T,canvas,world){
  super(T,canvas,world);
  this.makaiShadowDefaults={bias:this.sun.shadow.bias,normalBias:this.sun.shadow.normalBias};
  const definitions={Stone:[.86,0],Rock:[.97,0],Wall:[.86,0],Paving:[.71,.04],Wood:[.83,0],Tile:[.52,.12],Metal:[.43,.46],Glass:[.4,.16],Crystal:[.48,.18],Ice:[.42,.13],Lamp:[.60,0],Skyline:[.98,0],Red:[.88,0],Spectrum:[.6,0],Seal:[.65,0],Spirit:[.5,0]};
  for(const[key,[roughness,metalness]]of Object.entries(definitions)){
   const m=new T.MeshStandardMaterial({vertexColors:true,roughness,metalness,side:T.DoubleSide});m.name='makai-'+key;m.envMap=this.studioEnv.texture;m.envMapIntensity=.12;
   m.onBeforeCompile=s=>{
    s.uniforms.uMakaiTime=this.timeUniform;
    s.vertexShader='varying vec3 vMakai;uniform float uMakaiTime;\n'+s.vertexShader;
    s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvMakai=position;'+(key==='Spirit'?'transformed.y+=sin(uMakaiTime*.7+position.x)*.8;':''));
    s.fragmentShader='varying vec3 vMakai;uniform float uMakaiTime;\n'+s.fragmentShader;
    let surface='';
    if(key==='Paving')surface=`vec2 q=vMakai.xz*.23;q.x+=mod(floor(q.y),2.)*.5;vec2 e=min(fract(q),1.-fract(q));vec2 aa=fwidth(q)*1.2+.006;float seam=1.-min(smoothstep(0.,aa.x,e.x),smoothstep(0.,aa.y,e.y));diffuseColor.rgb*=1.-seam*.18;`;
    s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n'+surface);
    let emission={Lamp:'vColor.rgb*.90',Glass:'vColor.rgb*.12',Crystal:'vColor.rgb*.10',Ice:'vColor.rgb*.025',Red:'vColor.rgb*(.10+.06*sin(uMakaiTime*.45+vMakai.x*.004))',Spectrum:'vColor.rgb*.70',Seal:'vColor.rgb*(.5+.25*sin(uMakaiTime*.5+vMakai.x*.011+vMakai.z*.007))',Spirit:'vColor.rgb*(.5+.18*sin(uMakaiTime*.9))',Tile:'vColor.rgb*.025'}[key];
    if(emission)s.fragmentShader=s.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance += '+emission+';');
   };m.customProgramCacheKey=()=> 'makai-020-'+key;this.mats['makai'+key]=m;
  }
  this.mats.makaiRed.transparent=true;this.mats.makaiRed.opacity=.26;this.mats.makaiRed.depthWrite=false;
  this.mats.makaiSpectrum.transparent=true;this.mats.makaiSpectrum.opacity=.52;this.mats.makaiSpectrum.depthWrite=false;
  this.mats.makaiSeal.transparent=true;this.mats.makaiSeal.opacity=.74;this.mats.makaiSeal.depthWrite=false;
  this.mats.makaiMiasma=new T.ShaderMaterial({vertexColors:true,side:T.DoubleSide,transparent:true,depthWrite:false,toneMapped:false,uniforms:{uTime:this.timeUniform},
   vertexShader:`varying vec3 vParam;uniform float uTime;void main(){vParam=color;vec3 p=position;p.y+=sin(uTime*.22+color.z*8.+position.x*.003)*2.;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
   fragmentShader:`varying vec3 vParam;uniform float uTime;void main(){float edge=sin(vParam.y*3.14159)*sin(vParam.x*3.14159);float noise=.5+.5*sin(vParam.x*17.+uTime*.12+vParam.z*5.);gl_FragColor=vec4(.12,.03,.06,edge*noise*.12);}`});
  // A quiet linear-HDR atmosphere, encoded only by the existing final compositor.
  this.makaiSky=new T.Mesh(new T.SphereGeometry(9000,32,18),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,toneMapped:false,
   uniforms:{uTime:this.timeUniform,uEdition:{value:0}},vertexShader:'varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
   fragmentShader:`varying vec3 vDirection;uniform float uTime;uniform float uEdition;
    void main(){vec3 d=normalize(vDirection);float horizon=exp(-abs(d.y)*6.5);float streak=sin(d.x*5.+d.z*3.+d.y*12.+uTime*.012)*.5+.5;
    vec3 zenith=uEdition<.5?vec3(.018,.006,.024):uEdition<1.5?vec3(.015,.022,.043):vec3(.025,.014,.036);
    vec3 haze=uEdition<.5?vec3(.16,.024,.054):uEdition<1.5?vec3(.12,.062,.119):vec3(.14,.065,.123);
    vec3 col=mix(zenith,haze,horizon*.84)+streak*horizon*.005;gl_FragColor=vec4(col,1.);
   }`}));
  this.makaiSky.frustumCulled=false;this.makaiSky.renderOrder=-100;this.makaiSky.visible=false;this.scene.add(this.makaiSky);
  // A stage-6 sun-like light, never identified as the physical Sun or a portal.
  this.hokkaiLuminary=new T.Mesh(new T.SphereGeometry(80,32,20),new T.MeshBasicMaterial({color:new T.Color().setRGB(.95,.31,.20),toneMapped:false}));
  this.hokkaiLuminary.position.set(-170,260,-1730);this.hokkaiLuminary.visible=false;this.scene.add(this.hokkaiLuminary);
  // Public customDepthMaterial hook: keep receiving building shadows, but do not write
  // distant ground into the limited shadow map. The shadow pass may still submit it.
  this.makaiNoShadow=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,depthWrite:false,colorWrite:false});
  this.makaiLights=[];
  for(let i=0;i<4;i++){const l=new T.PointLight(0xffc59a,0,85,1.4);l.visible=false;this.scene.add(l);this.makaiLights.push(l);}
 }
 ensure(r,level){const mesh=super.ensure(r,level);if(G.MAKAI.regions.includes(r.data.owner)&&r.data.shadowCaster===false&&this.makaiNoShadow)mesh.customDepthMaterial=this.makaiNoShadow;return mesh;}
 wanted(r,rig,opts,distance){
  const m=r.data,ours=G.MAKAI.regions.includes(m.owner);
  if(!active(opts.space))return ours?false:super.wanted(r,rig,opts,distance);
  if(!ours||m.space!==opts.space)return false;
  if(m.overview===this.packs.has(m.owner))return false;
  if(m.makaiPart==='seal'&&!opts.makaiSeal)return false;
  if(m.makaiPart==='spectrum'&&opts.makaiSeal)return false;
  if(opts.makaiSection){if(!['hall','gallery','stairs','palaceBase'].includes(m.makaiZone))return false;if(['roof','vault','front','right'].includes(m.makaiPart))return false;}
  if(m.makaiPart==='caveRoof'&&opts.ceiling===false)return false;
  r.distance=G.length(G.sub(rig.eye,m.center));r.displayCenter=m.center;r.xf={scale:1,offset:[0,0,0]};
  return G.visibleSphere(rig.planes,m.center,m.radius+7);
 }
 lighting(rig,opts,distance){
  super.lighting(rig,opts,distance);
  const yes=active(opts.space),modern=opts.space==='makai12',old1=opts.space==='makai01',inside=!!opts.makaiInterior;
  this.makaiSky.visible=yes;this.hokkaiLuminary.visible=modern&&!opts.makaiSeal;
  for(const l of this.makaiLights)l.visible=false;
  if(!yes)return;
  this.activeSpace=opts.space;this.sky.visible=false;this.rain.visible=false;
  this.makaiSky.position.fromArray(rig.eye);this.makaiSky.material.uniforms.uEdition.value=modern?0:old1?2:1;
  this.scene.background.set(modern?0x512234:0x574159);this.scene.fog.color.setRGB(...(modern?[.13,.022,.045]:old1?[.12,.055,.106]:[.108,.055,.102]));
  this.scene.fog.near=modern?600:inside?240:800;this.scene.fog.far=modern?2500:inside?900:4200;
  this.hemisphere.color.set(0xd0d5f1);this.hemisphere.groundColor.set(modern?0x614052:0x877181);this.hemisphere.intensity=inside?.75:.90;
  this.ambient.color.set(0xc5bfd5);this.ambient.intensity=inside?.23:.095;
  this.sun.color.set(modern?0xffa59b:0xf6d6d4);this.sun.intensity=inside?.35:modern?1.2:1.75;
  this.rim.color.set(0xa5b9e2);this.rim.intensity=inside?.22:.48;
  this.weatherSunOffset=inside?[-60,80,115]:[-380,650,480];
  this.sun.shadow.bias=-.0008;this.sun.shadow.normalBias=1.1;
  for(const l of [...this.localLights,...this.focusLamps])l.visible=false;
  this.coverUniform.value=0;this.mistUniform.value=0;this.inspectionUniform.value=0;
  for(const[name,m]of Object.entries(this.mats))if(name.startsWith('makai'))m.envMapIntensity=inside?.10:.13;
  const sites=opts.space==='makai05'?[[-36,94,-580],[38,94,-650],[0,110,-623],[0,87,-688]]:old1?[[-26,49,-350],[26,49,-422],[0,65,-398],[0,41,-466]]:[];
  if((inside||opts.makaiSection)&&this.packs.has(opts.focus))sites.forEach((p,i)=>{const l=this.makaiLights[i];l.position.fromArray(p);l.color.set(i%2?0xbab7ff:0xffd4af);l.intensity=inside?190:80;l.visible=true;});
 }
 render(rig,opts={}){
  const key=[opts.space,opts.makaiSection,opts.makaiInterior,opts.makaiSeal].join('|');if(this.makaiKey!==key){this.makaiKey=key;this.engine.shadowMap.needsUpdate=true;}
  super.render(rig,active(opts.space)?{...opts,weather:'clear',lighting:'neutral'}:opts);
  if(active(opts.space)){this.stats.makaiEdition=opts.space;this.stats.makaiLights=this.makaiLights.filter(l=>l.visible).length;}
 }
 dropPack(id){super.dropPack(id);if(G.MAKAI.regions.includes(id))for(const l of this.makaiLights||[])l.visible=false;}
 dispose(){this.makaiNoShadow.dispose();for(const o of[this.makaiSky,this.hokkaiLuminary]){this.scene.remove(o);o.geometry.dispose();o.material.dispose();}for(const l of this.makaiLights){this.scene.remove(l);l.dispose();}super.dispose();}
}
G.DioramaRenderer=MakaiRenderer;
})(globalThis.GA);
