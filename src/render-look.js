/* 地表整体光影：统一日光比、空气透视、全岛地形远距阴影、地表与树冠的细节。
 * 只作用于连续地表；独立空间沿用各自的天空、灯光与色调。
 * 所有细节来自一张程序生成的噪声纹理，不引入外部贴图或新几何。 */
(function(G){'use strict';
const Base=G.DioramaRenderer;
const NOISE_SIZE=256;
const GROUND=new Set(['atlas-ground','atlas-mountainTerrain','atlas-meadowGround','atlas-bambooGround','landscapeGround','landscapeEarth','cutEarth']);
const LEAF=/leaf|foliage|canopy|crown/i;
const SHRINE=[1620,160],SHRINE_KEEP=[150,235];// 博丽神社试点：核心区保持原有地表，向外渐入。

// 可平铺的分形值噪声：R 大块、G 中块、B 细粒、A 接近白噪声。
function noiseField(size,period,octaves,seed){
 const rng=G.rng(seed),out=new Float32Array(size*size);let amp=1,total=0;
 for(let o=0;o<octaves;o++){
  const n=period<<o,lattice=new Float32Array(n*n);
  for(let i=0;i<lattice.length;i++)lattice[i]=rng();
  for(let y=0;y<size;y++){
   const fy=y/size*n,iy=Math.floor(fy),ty=fy-iy,sy=ty*ty*(3-2*ty),y0=iy%n,y1=(iy+1)%n;
   for(let x=0;x<size;x++){
    const fx=x/size*n,ix=Math.floor(fx),tx=fx-ix,sx=tx*tx*(3-2*tx),x0=ix%n,x1=(ix+1)%n;
    const a=lattice[y0*n+x0],b=lattice[y0*n+x1],c=lattice[y1*n+x0],d=lattice[y1*n+x1];
    out[y*size+x]+=amp*(a+(b-a)*sx+(c-a)*sy+(a-b-c+d)*sx*sy);
   }
  }
  total+=amp;amp*=.52;
 }
 let min=Infinity,max=-Infinity;
 for(let i=0;i<out.length;i++){out[i]/=total;min=Math.min(min,out[i]);max=Math.max(max,out[i]);}
 for(let i=0;i<out.length;i++)out[i]=(out[i]-min)/(max-min);
 return out;
}

const outputShader=`precision highp float;varying vec2 uvP;
uniform sampler2D tex,bloomTex,aoTex,sceneDepth,farDepth;
uniform float strength,aoEnabled,exposure,lookOn,hazeDensity,hazeFalloff,hazeStart,farStrength,nearActive,grade;
uniform vec2 aoTexel,farTexel;uniform vec3 hazeColor,hazeSunColor,sunDir;
uniform mat4 inverseProjection,cameraWorld,farMatrix,nearMatrix;
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
vec3 srgb(vec3 x){return mix(x*12.92,1.055*pow(max(x,vec3(0.)),vec3(1./2.4))-.055,step(vec3(.0031308),x));}
float farShadow(vec3 p,vec3 n){
 float facing=dot(n,sunDir);
 // 掠射面本身已经变暗，且总览与可见地形 LOD 不同，在这里比较深度只会得到锯齿。
 float reach=smoothstep(.10,.34,facing)*smoothstep(.12,.40,n.y);if(reach<=0.)return 1.;
 vec4 s=farMatrix*vec4(p+n*(5.+16.*(1.-facing))+sunDir*4.,1.);
 if(s.x<=0.||s.x>=1.||s.y<=0.||s.y>=1.)return 1.;
 vec2 texel=farTexel*1.6;float z=s.z-.0006,sum=0.;
 sum+=step(z,texture2D(farDepth,s.xy+texel*vec2(-.75,-.28)).r);
 sum+=step(z,texture2D(farDepth,s.xy+texel*vec2(.28,-.75)).r);
 sum+=step(z,texture2D(farDepth,s.xy+texel*vec2(.75,.28)).r);
 sum+=step(z,texture2D(farDepth,s.xy+texel*vec2(-.28,.75)).r);
 return mix(1.,sum*.25,reach);
}
void main(){
 float ao=1.;
 if(aoEnabled>.5){ao=(texture2D(aoTex,uvP).r*2.+texture2D(aoTex,uvP+aoTexel).r+texture2D(aoTex,uvP-aoTexel).r+texture2D(aoTex,uvP+vec2(aoTexel.x,-aoTexel.y)).r+texture2D(aoTex,uvP+vec2(-aoTexel.x,aoTexel.y)).r)/6.;}
 vec3 c=texture2D(tex,uvP).rgb*ao;
 if(lookOn>.5){
  float d=texture2D(sceneDepth,uvP).r;
  if(d<.99999){
   vec4 view=inverseProjection*vec4(uvP*2.-1.,d*2.-1.,1.);view/=view.w;
   vec3 world=(cameraWorld*view).xyz,eye=cameraWorld[3].xyz,ray=world-eye;float dist=length(ray);
   if(farStrength>0.){
    vec2 near=abs((nearMatrix*vec4(world,1.)).xy*2.-1.);
    float nearMask=nearActive*(1.-smoothstep(.72,.98,max(near.x,near.y)));
    if(nearMask<.999){vec3 faceN=normalize(cross(dFdx(world),dFdy(world)));if(dot(faceN,ray)>0.)faceN=-faceN;c*=1.-farStrength*(1.-farShadow(world,faceN))*(1.-nearMask);}
   }
   if(hazeDensity>0.){
    vec3 dir=ray/max(dist,.001);
    float travel=max(dist-hazeStart,0.),fall=hazeFalloff*dir.y,base=hazeDensity*exp(-hazeFalloff*max(eye.y,0.));
    float optical=base*travel*(abs(fall*travel)>.001?(1.-exp(-fall*travel))/(fall*travel):1.);
    float fog=1.-exp(-max(optical,0.));
    float toward=pow(max(dot(dir,sunDir),0.),6.);
    c=mix(c,mix(hazeColor,hazeSunColor,toward),fog);
   }
  }
 }
 c+=texture2D(bloomTex,uvP).rgb*strength;
 c=aces(c*exposure);
 if(grade>0.){
  float luma=dot(c,vec3(.2126,.7152,.0722));
  c=mix(c,mix(vec3(luma),c,1.06),grade);
  c*=mix(vec3(1.),mix(vec3(.985,.995,1.02),vec3(1.012,1.,.975),smoothstep(.08,.55,luma)),grade);
 }
 vec3 display=srgb(clamp(c,0.,1.));
 if(grade>0.)display=mix(display,display*display*(3.-2.*display),.20*grade);
 float vig=1.-.055*pow(length(uvP-.5)*1.414,2.);
 gl_FragColor=vec4(display*vig,1.);
}`;

class LookRenderer extends Base{
 constructor(T,canvas,world){
  super(T,canvas,world);
  this.lookPatched=new WeakSet();
  this.lookGround={value:1};
  this.lookNoise={value:this.makeLookNoise()};
  this.farKey=null;this.farTimer=0;this.shadowDeferTimer=0;this.lastShadowAt=0;this.shadowSnap={};
  this.sun.shadow.mapSize.set(4096,4096);this.sun.shadow.radius=1.35;
  this.setupLookOutput();
  this.onLookContextRestored=()=>{this.farKey=null;};canvas.addEventListener('webglcontextrestored',this.onLookContextRestored);this.lookCanvas=canvas;
 }
 makeLookNoise(){
  const T=this.T,s=NOISE_SIZE,r=noiseField(s,4,5,8171),g=noiseField(s,16,4,3301),b=noiseField(s,64,2,1297),a=noiseField(s,128,1,4421),data=new Uint8Array(s*s*4);
  for(let i=0;i<s*s;i++){data[i*4]=r[i]*255;data[i*4+1]=g[i]*255;data[i*4+2]=b[i]*255;data[i*4+3]=a[i]*255;}
  const texture=new T.DataTexture(data,s,s,T.RGBAFormat,T.UnsignedByteType);
  texture.name='look-noise';texture.colorSpace=T.NoColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;
  texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;texture.generateMipmaps=true;
  texture.anisotropy=Math.min(8,this.engine.capabilities.getMaxAnisotropy());texture.needsUpdate=true;
  return texture;
 }
 setupLookOutput(){
  const T=this.T,m=this.outputMat;
  Object.assign(m.uniforms,{sceneDepth:{value:this.sceneTarget.depthTexture},farDepth:{value:null},inverseProjection:{value:new T.Matrix4()},cameraWorld:{value:new T.Matrix4()},farMatrix:{value:new T.Matrix4()},nearMatrix:{value:new T.Matrix4()},lookOn:{value:0},hazeDensity:{value:0},hazeFalloff:{value:.0021},hazeStart:{value:0},farStrength:{value:0},nearActive:{value:0},grade:{value:0},farTexel:{value:new T.Vector2(1/3072,1/3072)},hazeColor:{value:new T.Color()},hazeSunColor:{value:new T.Color()},sunDir:{value:new T.Vector3(0,1,0)}});
  m.fragmentShader=outputShader;m.needsUpdate=true;
 }
 // 同一材质可被多条记录共用：就地追加一次，后续克隆体由着色器文本判重。
 lookPatch(mat,kind){
  if(this.lookPatched.has(mat))return mat;
  this.lookPatched.add(mat);
  const prior=mat.onBeforeCompile,key=mat.customProgramCacheKey?.bind(mat);
  mat.onBeforeCompile=(s,r)=>{
   prior?.call(mat,s,r);
   if(s.fragmentShader.includes('uLookNoise'))return;
   s.uniforms.uLookNoise=this.lookNoise;s.uniforms.uLookGround=this.lookGround;
   s.vertexShader='varying vec3 vLookWorld;\n'+s.vertexShader;
   s.vertexShader=s.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
    vec4 lookP=vec4(transformed,1.);
    #ifdef USE_INSTANCING
     lookP=instanceMatrix*lookP;
    #endif
    vLookWorld=(modelMatrix*lookP).xyz;`);
   s.fragmentShader='varying vec3 vLookWorld;uniform sampler2D uLookNoise;uniform float uLookGround;\n'+s.fragmentShader;
   if(kind!=='leaf')s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
    float lookMask=uLookGround*${kind==='shrineGround'?`smoothstep(${SHRINE_KEEP[0]}.,${SHRINE_KEEP[1]}.,length(vLookWorld.xz-vec2(${SHRINE[0]}.,${SHRINE[1]}.)))`:'1.'};
    if(lookMask>.001){
     vec3 lookOriginal=diffuseColor.rgb,lookBaseNormal=normal;
     float lookDist=length(vViewPosition);
     float lookFine=1.-smoothstep(36.,190.,lookDist),lookMid=1.-smoothstep(240.,1100.,lookDist);
     vec3 lookWorldN=inverseTransformDirection(normal,viewMatrix);
     // 三平面采样：陡坡上噪声不被拉成竖条。
     vec3 lookW=pow(abs(lookWorldN),vec3(4.));lookW/=lookW.x+lookW.y+lookW.z;
     vec4 lookA=texture2D(uLookNoise,vLookWorld.xz/410.);
     vec4 lookB=texture2D(uLookNoise,vLookWorld.zy/67.)*lookW.x+texture2D(uLookNoise,vLookWorld.xz/67.)*lookW.y+texture2D(uLookNoise,vLookWorld.xy/67.)*lookW.z;
     vec4 lookC=texture2D(uLookNoise,vLookWorld.zy/9.3)*lookW.x+texture2D(uLookNoise,vLookWorld.xz/9.3)*lookW.y+texture2D(uLookNoise,vLookWorld.xy/9.3)*lookW.z;
     float lookSlope=1.-clamp(lookWorldN.y,0.,1.);
     float lookLuma=dot(diffuseColor.rgb,vec3(.3,.59,.11));
     float lookGreen=smoothstep(.0,.07,diffuseColor.g-max(diffuseColor.r*.96,diffuseColor.b));
     // 草地：压低黄绿、拉开明度；非绿色地表只保留明度起伏。
     float lookMacro=lookA.r*.62+lookB.g*.38;
     vec3 lookGrass=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.70,.83,.70),lookGreen);
     lookGrass*=mix(vec3(.86,.94,.88),vec3(1.09,1.04,.92),smoothstep(.28,.72,lookMacro))*lookGreen+vec3(.93+.14*lookMacro)*(1.-lookGreen);
     lookGrass*=1.+(lookB.g-.5)*.24*lookMid+(lookC.b-.5)*.30*lookFine;
     // 陡坡露出土岩，以噪声打散边界。
     float lookRock=smoothstep(.34,.72,lookSlope+(lookB.r-.5)*.30+(lookC.g-.5)*.12);
     lookGrass=mix(lookGrass,vec3(lookLuma)*vec3(.90,.84,.76)*(.80+.34*lookB.g),lookRock*.62);
     diffuseColor.rgb=mix(lookOriginal,lookGrass,lookMask);
     vec2 lookTilt=((texture2D(uLookNoise,vLookWorld.xz/2.9).ab-.5)*lookFine*.46+(lookC.rg-.5)*lookMid*.30)*lookW.y;
     normal=normalize(lookBaseNormal+(viewMatrix*vec4(lookTilt.x,0.,lookTilt.y,0.)).xyz*lookMask);
    }`);
   if(kind==='leaf'){
    s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
     if(uLookGround>.5){
      // 碎叶片法线向上收拢，避免相邻面明暗翻转成纸片感；同时给树冠上下明暗。
      normal=normalize(mix(normal,(viewMatrix*vec4(0.,1.,0.,0.)).xyz,.16));
      vec4 lookLeaf=texture2D(uLookNoise,vLookWorld.xz/23.+vLookWorld.y/41.);
      diffuseColor.rgb*=.84+.34*lookLeaf.g;
     }`);
    s.fragmentShader=s.fragmentShader.replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
     #if NUM_DIR_LIGHTS>0
      if(uLookGround>.5){
       float lookBack=pow(saturate(-dot(normalize(vViewPosition),directionalLights[0].direction)),3.);
       reflectedLight.directDiffuse+=material.diffuseColor*directionalLights[0].color*(.015+.13*lookBack)*RECIPROCAL_PI;
      }
     #endif`);
   }
  };
  mat.customProgramCacheKey=()=>(key?key():'')+'-look-1-'+kind;mat.needsUpdate=true;
  return mat;
 }
 material(m){
  const mat=super.material(m);
  if(mat.isShaderMaterial||(m.space||'surface')!=='surface')return mat;
  // 神社试点的树与地表已获认可，只在外围做衔接，不改其材质。
  if(mat===this.mats.hakureiGround)return this.lookPatch(mat,'shrineGround');
  if(mat.name?.startsWith('hakurei'))return mat;
  if(GROUND.has(mat.name)||m.component==='island-terrain')return this.lookPatch(mat,'ground');
  if(m.group==='vegetation'&&LEAF.test(mat.name||m.material||''))return this.lookPatch(mat,'leaf');
  return mat;
 }
 lighting(rig,opts,distance){
  super.lighting(rig,opts,distance);
  const surface=(opts.space||'surface')==='surface'&&!opts.cutaway;
  this.lookGround.value=surface?1:0;
  if(!surface)return;
  const clear=(opts.weather||'clear')==='clear';
  if(opts.lighting==='neutral'){
   this.sun.color.set(clear?0xfff0da:0xfff4e4);this.sun.intensity=clear?2.6:opts.weather==='cloudy'?1.25:.28;
   this.hemisphere.color.set(clear?0xb4d4f4:0xc4d4e0);this.hemisphere.groundColor.set(0x8f9a6e);this.hemisphere.intensity=clear?.80:opts.weather==='cloudy'?1.02:1.0;
   this.rim.intensity=.09;
  }else if(opts.lighting==='dusk'){
   this.sun.intensity*=1.25;this.hemisphere.intensity*=.82;
  }
 }
 lookHaze(opts,distance){
  const u=this.outputMat.uniforms,wet=opts.weather==='rain',cloudy=opts.weather==='cloudy',night=opts.lighting==='night',dusk=opts.lighting==='dusk';
  if(night){u.hazeColor.value.setRGB(.022,.034,.056);u.hazeSunColor.value.setRGB(.05,.07,.11);}
  else if(dusk){u.hazeColor.value.setRGB(.74,.52,.40);u.hazeSunColor.value.setRGB(1.25,.72,.40);}
  else if(wet||cloudy){u.hazeColor.value.setRGB(.46,.54,.60);u.hazeSunColor.value.setRGB(.56,.62,.66);}
  else{u.hazeColor.value.setRGB(.50,.68,.86);u.hazeSunColor.value.setRGB(1.02,.94,.78);}
  const wide=opts.displayMode==='atlas';
  u.hazeDensity.value=(wet?.00022:cloudy?.00016:.00012)*(wide?.8:1);
  u.hazeStart.value=wide?distance*.70:Math.min(420,distance*.75);
 }
 post(enabled,exposure){
  const u=this.outputMat.uniforms,o=this.currentOptions,surface=(o.space||'surface')==='surface'&&!o.cutaway;
  u.lookOn.value=surface?1:0;u.grade.value=surface&&o.lighting!=='night'?1:0;
  if(surface){
   this.lookHaze(o,G.length(G.sub(o.lookEye||[0,0,0],o.lookTarget||[0,0,0])));
   u.inverseProjection.value.copy(this.camera.projectionMatrixInverse);
   u.cameraWorld.value.copy(this.camera.matrixWorld);
   u.sunDir.value.fromArray(this.weatherSunOffset||[-430,760,320]).normalize();
   const sunShadow=this.sun.castShadow&&this.sun.shadow.intensity>0;
   u.nearActive.value=sunShadow?1:0;
   if(sunShadow)u.nearMatrix.value.copy(this.sun.shadow.matrix);
   const ready=this.farTarget&&this.farKey===this.lookFarKey(o);
   const share=o.weather==='rain'?0:o.weather==='cloudy'?.22:o.lighting==='night'?.34:.56;
   u.farStrength.value=ready&&this.quality!=='low'?share:0;
  }else{u.farStrength.value=0;u.hazeDensity.value=0;}
  // 全新曝光链：日光比提高后整体略收。
  const scale=surface&&o.lighting==='neutral'?.95:1;
  return super.post(enabled,exposure*scale);
 }
 lookFarKey(o){return (this.weatherSunOffset||[]).join(',')+'|'+this.quality;}
 // 全岛静态太阳深度：只含地形，山体投影覆盖整岛；太阳方向不变时不重绘。
 renderFarShadow(){
  this.farTimer=0;
  const T=this.T,e=this.engine,o=this.currentOptions;
  if(!o||this.contextLost||this.quality==='low'||(o.space||'surface')!=='surface'||!this.weatherSunOffset)return;
  const key=this.lookFarKey(o);if(this.farKey===key)return;
  const size=this.quality==='high'?4096:3072;
  if(!this.farTarget||this.farTarget.width!==size){
   this.farTarget?.depthTexture?.dispose();this.farTarget?.dispose();
   const depth=new T.DepthTexture(size,size,T.UnsignedIntType);depth.format=T.DepthFormat;depth.minFilter=depth.magFilter=T.NearestFilter;
   this.farTarget=new T.WebGLRenderTarget(size,size,{depthBuffer:true,depthTexture:depth,minFilter:T.NearestFilter,magFilter:T.NearestFilter,generateMipmaps:false});
   this.farTarget.texture.name='look-far-color';
   this.outputMat.uniforms.farDepth.value=depth;
  }
  const scene=new T.Scene(),geometries=[],meshes=[],probe={eye:[0,3200,0],target:[0,0,0],planes:[],space:'surface'};
  const view={...o,displayMode:'atlas',space:'surface',focus:null,detailNeighbors:[],cutaway:false,flowerEvent:false,vegetation:o.vegetation!==false};
  const depthMat=this.farDepthMaterial??=new T.MeshBasicMaterial({side:T.DoubleSide,colorWrite:false});
  let min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  for(const record of this.records){
   const m=record.data;
   // 只画地形体量：总览下树影是高频噪声，树影由近景实时阴影负责。
   if(m.component!=='island-terrain')continue;
   if(!this.wanted(record,probe,view,3200))continue;
   const array=m.farVertices||m.vertices,index=this.indexByArray.get(array),geometry=new T.BufferGeometry(),buffer=new T.InterleavedBuffer(array,9);
   geometry.setAttribute('position',new T.InterleavedBufferAttribute(buffer,3,0));
   if(index)geometry.setIndex(new T.BufferAttribute(index,1));
   geometries.push(geometry);
   let mesh;
   if(m.instances){mesh=new T.InstancedMesh(geometry,depthMat,m.instances.length/16);mesh.instanceMatrix=new T.InstancedBufferAttribute(m.instances,16);meshes.push(mesh);}
   else mesh=new T.Mesh(geometry,depthMat);
   mesh.frustumCulled=false;mesh.matrixAutoUpdate=false;scene.add(mesh);
   if(m.component==='island-terrain')for(let i=0;i<3;i++){min[i]=Math.min(min[i],m.center[i]-m.radius);max[i]=Math.max(max[i],m.center[i]+m.radius);}
  }
  if(!Number.isFinite(min[0])){for(const g of geometries)g.dispose();return;}
  const center=new T.Vector3((min[0]+max[0])/2,(min[1]+max[1])/2,(min[2]+max[2])/2),radius=Math.hypot(max[0]-min[0],max[2]-min[2])/2+60;
  const dir=new T.Vector3().fromArray(this.weatherSunOffset).normalize(),camera=new T.OrthographicCamera(-radius,radius,radius,-radius,1,radius*3+900);
  camera.position.copy(center).addScaledVector(dir,radius*1.5+420);camera.lookAt(center);camera.updateMatrixWorld();camera.updateProjectionMatrix();
  const target=e.getRenderTarget(),info=[e.info.render.calls,e.info.render.triangles];
  e.setRenderTarget(this.farTarget);e.clear();e.render(scene,camera);e.setRenderTarget(target);
  e.info.render.calls=info[0];e.info.render.triangles=info[1];
  this.outputMat.uniforms.farMatrix.value.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1).multiply(camera.projectionMatrix).multiply(camera.matrixWorldInverse);
  for(const mesh of meshes)mesh.dispose();for(const g of geometries)g.dispose();
  scene.clear();e.renderLists.dispose();
  this.farKey=key;this.outputMat.uniforms.farTexel.value.set(1/size,1/size);
  globalThis.ATLAS?.wake?.();
 }
 // 移动中阴影最多约 8Hz 重绘；静止后立即补上最后一次。
 holdPasses(rig,opts){
  const e=this.engine;
  if(!this.planOnly&&e.shadowMap.needsUpdate&&this.sun.castShadow&&this.sun.shadow.intensity>0){
   const now=performance.now();
   if(now-this.lastShadowAt<120&&this.lastShadowAt>0&&!globalThis.ATLAS_TEST_PAUSE){
    e.shadowMap.needsUpdate=false;
    if(!this.shadowDeferTimer)this.shadowDeferTimer=setTimeout(()=>{this.shadowDeferTimer=0;e.shadowMap.needsUpdate=true;globalThis.ATLAS?.wake?.();},130);
   }else{this.lastShadowAt=now;this.snapSun();}
  }
  return super.holdPasses?.(rig,opts);
 }
 // 把阴影相机平移量化到纹素，镜头移动时阴影边缘不游走。
 snapSun(){
  const T=this.T,s=this.sun,c=s.shadow.camera,v=this.shadowSnap;
  v.d??=new T.Vector3();v.r??=new T.Vector3();v.u??=new T.Vector3();
  v.d.subVectors(s.target.position,s.position).normalize();v.r.crossVectors(v.d,new T.Vector3(0,1,0)).normalize();v.u.crossVectors(v.r,v.d);
  const texel=(c.right-c.left)/s.shadow.mapSize.x,x=s.position.dot(v.r),y=s.position.dot(v.u),dx=Math.round(x/texel)*texel-x,dy=Math.round(y/texel)*texel-y;
  for(const p of [s.position,s.target.position])p.addScaledVector(v.r,dx).addScaledVector(v.u,dy);
  s.target.updateMatrixWorld();s.updateMatrixWorld();
  s.shadow.normalBias=G.clamp(texel*1.15,.05,.9);
 }
 render(rig,opts={}){
  super.render(rig,{...opts,lookEye:rig.eye,lookTarget:rig.target});
  const o=this.currentOptions;
  if(!this.planOnly&&!this.farTimer&&this.quality!=='low'&&(o?.space||'surface')==='surface'&&this.farKey!==this.lookFarKey(o))
   this.farTimer=setTimeout(()=>this.renderFarShadow(),globalThis.ATLAS_TEST_PAUSE?0:240);
 }
 dispose(){
  clearTimeout(this.farTimer);clearTimeout(this.shadowDeferTimer);this.lookCanvas.removeEventListener('webglcontextrestored',this.onLookContextRestored);
  this.lookNoise.value.dispose();this.farDepthMaterial?.dispose();this.farTarget?.depthTexture?.dispose();this.farTarget?.dispose();super.dispose();
 }
}
G.DioramaRenderer=LookRenderer;
})(globalThis.GA);
