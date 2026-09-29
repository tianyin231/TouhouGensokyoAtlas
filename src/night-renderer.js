/* 地表夜间层：复用主阴影与四盏既有灯；其他时段和独立世界由原链恢复。 */
(function(G){
'use strict';
const Base=G.DioramaRenderer;
// 找到创建后期目标的原实现，仅夜间绕过 IslandRenderer 的 dusk 门槛。
let postOwner=Base.prototype;
while(!Object.prototype.hasOwnProperty.call(postOwner,'setupPost'))postOwner=Object.getPrototypeOf(postOwner);
const surfacePost=postOwner.post;
const lampSites=[
 [1619.8,184.7,153.8,82,15],[1619.8,184.7,166.2,82,15],
 [1589.63,182.315,151.4,30,9],[1589.63,182.315,168.6,30,9]
];
class NightRenderer extends Base{
 constructor(T,canvas,world){
  super(T,canvas,world);
  this.surfaceNight={value:0};this.surfaceMoon={value:new T.Vector3()};this.nightActive=false;
  this.daySkyMaterial=this.sky.material;
  this.beforeNightAmbientColor=this.ambient.color.clone();
  this.beforeNightEnvironmentIntensity=this.scene.environmentIntensity;
  this.nightLampDefaults=this.focusLamps.map(l=>({color:l.color.clone(),distance:l.distance,decay:l.decay}));
  this.nightSkyMaterial=new T.ShaderMaterial({name:'surface-night-sky',side:T.BackSide,depthWrite:false,toneMapped:false,
   uniforms:{uTime:this.timeUniform,uCloud:{value:.23},uWet:{value:0},uMoon:this.surfaceMoon},
   vertexShader:'varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
   fragmentShader:`precision highp float;varying vec3 vDir;uniform float uTime,uCloud,uWet;uniform vec3 uMoon;
    float nightHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float nightNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(nightHash(i),nightHash(i+vec2(1.,0.)),f.x),mix(nightHash(i+vec2(0.,1.)),nightHash(i+1.),f.x),f.y);}
    float nightCloud(vec2 p){return nightNoise(p)*.58+nightNoise(p*2.03)*.28+nightNoise(p*4.11)*.14;}
    void main(){
     vec3 d=normalize(vDir);float h=max(d.y,0.);
     vec3 c=mix(vec3(.020,.034,.062),vec3(.003,.007,.021),pow(h,.6));
     c=mix(c,vec3(.015,.023,.034),uWet*.65);
     vec2 cloudP=d.xz/max(.22,d.y+.12)*2.65+vec2(uTime*.0032,uTime*.0007);
     float cloud=smoothstep(.61-uCloud*.21,.75-uCloud*.15,nightCloud(cloudP));
     cloud*=smoothstep(-.04,.18,d.y)*(.80+uCloud*.18);
     float moonDot=max(dot(d,uMoon),0.),moonEdge=fwidth(moonDot);
     float moon=smoothstep(.99983-moonEdge,.99983+moonEdge,moonDot);
     float moonHalo=pow(moonDot,180.);
     // 星点固定在天球；云层及雨天遮住星月，不随镜头平移漂移。
     vec2 stars=vec2(atan(d.z,d.x)*.15915494,asin(clamp(d.y,-1.,1.))*.31830989)*vec2(1200.,600.);
     vec2 cell=floor(stars),q=fract(stars)-.5;
     float star=step(.9965,nightHash(cell))*(1.-smoothstep(.035,.10+min(.16,length(fwidth(stars))*.3),length(q)));
     star*=smoothstep(.06,.25,d.y)*(1.-cloud)*(1.-uWet)*(1.-uCloud*.82);
     c+=vec3(.55,.66,.90)*star;
     c+=(vec3(1.15,1.28,1.50)*moon+vec3(.028,.040,.069)*moonHalo)*(1.-cloud*.98)*(1.-uWet);
     c=mix(c,mix(vec3(.031,.044,.065),vec3(.017,.026,.039),uWet),cloud*.76);
     if(d.y<0.)c=mix(c,vec3(.012,.023,.039),smoothstep(0.,.4,-d.y));
     gl_FragColor=vec4(c,1.);
    }`});
  this.patchNightWindows();this.patchNightWater();
 }
 patchNightWindows(){
  const mat=this.mats.hakureiPaper,prior=mat.onBeforeCompile,key=mat.customProgramCacheKey.bind(mat);
  mat.onBeforeCompile=(shader,renderer)=>{
   prior.call(mat,shader,renderer);shader.uniforms.uSurfaceNight=this.surfaceNight;
   shader.fragmentShader='uniform float uSurfaceNight;\n'+shader.fragmentShader;
   // 同材质还包含纸垂；仅拜殿实际纸窗范围有室内透光，墙和入口暗腔不变。
   shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
    vec3 nightWindowP=vHakureiWorld;
    float nightWindow=step(1621.,nightWindowP.x)*step(nightWindowP.x,1639.)*step(148.5,nightWindowP.z)*step(nightWindowP.z,171.5)*step(182.45,nightWindowP.y)*step(nightWindowP.y,185.2);
    totalEmissiveRadiance+=vec3(.65,.31,.095)*diffuseColor.rgb*nightWindow*uSurfaceNight;`);
  };
  mat.customProgramCacheKey=()=>key()+'-surface-night-window-1';mat.needsUpdate=true;
 }
 patchNightWater(){
  for(const mat of[this.water,this.caveWater,this.canalWater,this.lakeWater,this.windWater]){
   const prior=mat.onBeforeCompile,key=mat.customProgramCacheKey.bind(mat);
   mat.onBeforeCompile=(shader,renderer)=>{
    prior.call(mat,shader,renderer);shader.uniforms.uSurfaceNight=this.surfaceNight;shader.uniforms.uSurfaceMoon=this.surfaceMoon;
    shader.fragmentShader='uniform float uSurfaceNight;uniform vec3 uSurfaceMoon;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader
     .replace('sun=normalize(vec3(-.43,.76,.32))','sun=normalize(mix(vec3(-.43,.76,.32),uSurfaceMoon,uSurfaceNight))')
     .replace('float shine=','c*=mix(vec3(1.),vec3(.16,.24,.36),uSurfaceNight);float shine=')
     .replace('c+=vec3(.84,.77,.54)*shine*.95;','c+=mix(vec3(.84,.77,.54),vec3(.28,.39,.65),uSurfaceNight)*shine*mix(.95,.35,uSurfaceNight);');
   };
   mat.customProgramCacheKey=()=>key()+'-surface-night-water-1';mat.needsUpdate=true;
  }
 }
 lighting(rig,opts,distance){
  // 原光照会访问白天天空 uniforms；先复原材质及灯的额外参数再进入继承链。
  this.sky.material=this.daySkyMaterial;
  if(this.nightActive){
   this.ambient.color.copy(this.beforeNightAmbientColor);
   this.scene.environmentIntensity=this.beforeNightEnvironmentIntensity;
   for(let i=0;i<this.focusLamps.length;i++){
    const l=this.focusLamps[i],base=this.nightLampDefaults[i];l.color.copy(base.color);l.distance=base.distance;l.decay=base.decay;
   }
  }
  super.lighting(rig,opts,distance);
  this.nightActive=opts.lighting==='night'&&(opts.space||rig.space||'surface')==='surface';
  this.surfaceNight.value=this.nightActive?1:0;
  if(!this.nightActive)return;
  this.beforeNightAmbientColor.copy(this.ambient.color);
  this.beforeNightEnvironmentIntensity=this.scene.environmentIntensity;this.scene.environmentIntensity=.045;
  const wet=opts.weather==='rain',cloudy=opts.weather==='cloudy';
  this.weatherSunOffset=[-620,420,280];this.surfaceMoon.value.fromArray(this.weatherSunOffset).normalize();
  this.sun.color.set(0xb4ceff);this.sun.intensity=wet?.075:cloudy?.18:.50;
  this.hemisphere.color.set(0x819cce);this.hemisphere.groundColor.set(0x343c52);this.hemisphere.intensity=wet?.24:.28;
  this.ambient.color.set(0x718ab5);this.ambient.intensity=.014;
  this.rim.color.set(0x8caee8);this.rim.intensity=.035;
  for(const mat of Object.values(this.mats))mat.envMapIntensity=mat===this.mats.hakureiRecess?.006:.035;
  this.scene.background.setRGB(.020,.034,.062);this.scene.fog.color.copy(this.scene.background);
  this.scene.fog.near=wet?Math.max(130,distance*.35):Math.max(600,distance*.85);
  this.scene.fog.far=wet?Math.max(1150,distance+4000):distance+16000;
  // 原空间雾使用日间灰绿固定颜色；夜晚由同一场景的冷色距离雾接管。
  this.mistUniform.value=0;
  this.sky.material=this.nightSkyMaterial;this.sky.visible=true;
  this.nightSkyMaterial.uniforms.uCloud.value=wet?1:cloudy?.9:.23;this.nightSkyMaterial.uniforms.uWet.value=wet?1:0;
  this.mats.shrineLight.emissiveIntensity=2.2;
  const lampsVisible=this.packs.has('hakurei')&&Math.hypot(rig.eye[0]-1610,rig.eye[2]-160)<450&&opts.displayMode!=='atlas';
  for(let i=0;i<this.focusLamps.length;i++){
   const l=this.focusLamps[i],p=lampSites[i];l.position.set(p[0],p[1],p[2]);l.color.set(0xffbd79);l.intensity=p[3];l.distance=p[4];l.decay=2;l.visible=lampsVisible;
  }
  for(const mat of[this.water,this.caveWater,this.canalWater,this.lakeWater,this.windWater]){
   mat.uniforms.uFogColor.value.copy(this.scene.fog.color);mat.uniforms.uFogNear.value=this.scene.fog.near;mat.uniforms.uFogFar.value=this.scene.fog.far;
  }
 }
 post(enabled,exposure){
  if(!this.nightActive)return super.post(enabled,exposure);
  return surfacePost.call(this,enabled,1.0);
 }
 render(rig,opts={}){
  super.render(rig,opts);
  this.stats.surfaceNight=this.nightActive;this.stats.nightLocalLights=this.nightActive?this.focusLamps.filter(l=>l.visible).length:0;
 }
 dispose(){this.sky.material=this.daySkyMaterial;this.nightSkyMaterial.dispose();super.dispose();}
}
G.DioramaRenderer=NightRenderer;
})(globalThis.GA);
