/* 地表整体光影与画风：统一日光比、空气透视、全岛地形远距阴影、地表与树冠的细节，
 * 以及 2026-11-05 用户定稿的二次元动画背景画风（绘画滤镜、分层光影、手绘积云、彩色轮廓线）。
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

uniform float sharper,styleTime,styleDusk,styleNight,styleWide,styleWet,styleDetail,dayBloom;uniform vec2 texel;uniform mat4 viewProj;uniform sampler2D paperTex;
float viewZ(vec2 uv){vec4 v=inverseProjection*vec4(0.,0.,texture2D(sceneDepth,uv).r*2.-1.,1.);return max(-v.z/v.w,.01);}
// 四象限 Kuwahara：取方差最小的象限均值，把细碎多边形合成一笔一笔的色块。
vec3 kuwa(vec2 uv,int r){
 vec3 best=textureLod(tex,uv,0.).rgb;float bestV=1e9;
 for(int q=0;q<4;q++){
  vec2 s=vec2((q==0||q==2)?-1.:1.,q<2?-1.:1.);vec3 m=vec3(0.),m2=vec3(0.);float n=0.;
  for(int y=0;y<=r;y++)for(int x=0;x<=r;x++){
   vec3 k=textureLod(tex,uv+s*vec2(float(x),float(y))*texel,0.).rgb;k=k/(1.+k);m+=k;m2+=k*k;n+=1.;
  }
  m/=n;vec3 v=abs(m2/n-m*m);float vv=v.r+v.g+v.b;
  if(vv<bestV){bestV=vv;best=m;}
 }
 return best/(1.-min(best,vec3(.985)));
}
vec3 skyRay(vec2 uv){vec4 v=inverseProjection*vec4(uv*2.-1.,1.,1.);return normalize(mat3(cameraWorld)*(v.xyz/v.w));}
float cloudField(vec2 p,vec2 w){return texture2D(paperTex,p*.085+w).r*.64+texture2D(paperTex,p*.23+w*1.7).g*.27+texture2D(paperTex,p*.62+w*2.6).b*.09;}
// 岛下云海。
vec3 cloudSea(vec3 d){
 float m=styleDusk;vec2 w=vec2(styleTime*.0030,styleTime*.0011);
 vec3 low=mix(vec3(.640,.800,.930),vec3(1.150,.560,.230),m),bright=mix(vec3(1.02,1.00,.97),vec3(1.40,.80,.52),m);
 vec2 p=d.xz/(-d.y+.16);
 float n=cloudField(p*.75,w);
 vec3 gap=mix(vec3(.13,.36,.72),vec3(.42,.22,.38),m);
 vec3 c=mix(low,mix(gap,bright,smoothstep(.45,.64,n)),smoothstep(0.,.20,-d.y));
 c+=mix(vec3(1.5,1.3,.95),vec3(2.2,1.0,.45),m)*pow(max(dot(d,sunDir),0.),520.);
 c+=mix(vec3(.16,.13,.08),vec3(.6,.25,.08),m)*pow(max(dot(d,sunDir),0.),9.);
 return c;
}
// 地表上空飘过的云影，全部物体一起受影响。
float cloudShade(vec3 w){
 vec2 p=(w.xz+sunDir.xz*w.y*.55+vec2(styleTime*9.,styleTime*3.5))/1500.;
 float n=texture2D(paperTex,p).r*.68+texture2D(paperTex,p*3.1).g*.32;
 return smoothstep(.50,.64,n);
}
// 山谷与区域之间横向的霞。
float kasumi(vec3 w,float dist){
 vec2 q=vec2(w.x/2300.+styleTime*.0014,w.z/760.);
 float n=texture2D(paperTex,q).r*.66+texture2D(paperTex,q*vec2(3.1,2.7)-styleTime*.0009).g*.34;
 return smoothstep(.52,.72,n)*(1.-smoothstep(58.,175.,w.y))*smoothstep(-2.,26.,w.y)*smoothstep(260.,1300.,dist)*(1.-.75*smoothstep(1900.,4200.,dist));
}
vec3 wpos(vec2 uv){vec4 v=inverseProjection*vec4(uv*2.-1.,texture2D(sceneDepth,uv).r*2.-1.,1.);return (cameraWorld*vec4(v.xyz/v.w,1.)).xyz;}
vec3 wideN(vec2 uv){vec2 t=texel*5.;vec3 a=wpos(uv-vec2(t.x,0.)),b=wpos(uv+vec2(t.x,0.)),c=wpos(uv-vec2(0.,t.y)),d=wpos(uv+vec2(0.,t.y));return normalize(cross(b-a,d-c));}
float inkEdge(vec2 uv,float dist){
 float wob=.8+1.0*texture2D(paperTex,uv*vec2(5.,3.)).r;vec2 t=texel*wob;
 float o=log(viewZ(uv)),l=abs(log(viewZ(uv+t*vec2(-1.,-1.)))+log(viewZ(uv+t*vec2(1.,1.)))-2.*o)+abs(log(viewZ(uv+t*vec2(-1.,1.)))+log(viewZ(uv+t*vec2(1.,-1.)))-2.*o);
 return smoothstep(.012,.052,l)*(1.-smoothstep(300.,1700.,dist));
}
vec3 gradeAnime(vec3 c,float sky){
 float l=dot(c,vec3(.2126,.7152,.0722));
 c=mix(vec3(l),c,mix(1.20,1.04,sky));
 c=mix(c*vec3(.74,.82,1.08),c,smoothstep(.015,.40,l));
 c*=mix(vec3(1.),vec3(1.075,1.02,.90),smoothstep(.40,.92,l));
 return max(c,vec3(0.));
}
// 二次元积云：边缘清楚，顶亮底蓝。
vec3 animeSky(vec3 d){
 float h=max(d.y,0.),m=styleDusk;
 vec3 top=mix(vec3(.030,.130,.470),vec3(.095,.095,.285),m);
 vec3 mid=mix(vec3(.095,.330,.800),vec3(.520,.285,.300),m);
 vec3 low=mix(vec3(.560,.790,.960),vec3(1.180,.640,.270),m);
 vec3 c=mix(low,mid,smoothstep(0.,.24,h));c=mix(c,top,smoothstep(.16,.82,h));
 vec2 w=vec2(styleTime*.0028,styleTime*.0010);
 vec3 bright=mix(vec3(1.26,1.26,1.26),vec3(1.36,.80,.50),m),shade=mix(vec3(.50,.64,.92),vec3(.44,.28,.42),m);
 vec2 p=d.xz/(d.y+.20);
 p+=(texture2D(paperTex,p*.045+w).rg-.5)*.85;
 float n=texture2D(paperTex,p*.055+w).r*.72+texture2D(paperTex,p*.17+w*1.6).g*.28;
 vec2 s=normalize(sunDir.xz+.001)*.20;
 float n2=texture2D(paperTex,(p+s)*.055+w).r*.72+texture2D(paperTex,(p+s)*.17+w*1.6).g*.28;
 n+=(texture2D(paperTex,p*.62+w*3.).r-.5)*.055;
 float cover=smoothstep(.572,.598,n)*smoothstep(.015,.12,d.y);
 c=mix(c,mix(bright,shade,smoothstep(-.012,.045,n2-n)),cover);
 c+=mix(vec3(1.6,1.4,1.0),vec3(2.4,1.1,.5),m)*pow(max(dot(d,sunDir),0.),620.);
 c+=mix(vec3(.20,.17,.10),vec3(.7,.28,.09),m)*pow(max(dot(d,sunDir),0.),8.);
 return c;
}
// 从太阳方向穿过枝叶和山脊的光束。
float sunShafts(vec2 uv,vec3 eye){
 vec4 sp=viewProj*vec4(eye+sunDir*3000.,1.);
 if(sp.w<=0.)return 0.;
 vec2 s=sp.xy/sp.w*.5+.5,d=(s-uv)/22.,q=uv;
 float sum=0.,wt=1.,j=.7+.6*fract(sin(dot(uv,vec2(12.9898,78.233)))*43758.5453);
 q+=d*j;
 for(int i=0;i<22;i++){sum+=step(.99999,textureLod(sceneDepth,q,0.).r)*wt;wt*=.955;q+=d;}
 return sum/14.;
}
// 赛璐璐分层：明暗推向几档，色相不变；地面弱一些，避免出现色带。
vec3 gradeStrong(vec3 c,float sky,float flatG){
 float l=dot(c,vec3(.2126,.7152,.0722));
 if(sky<.5){
  float r=.045+.125*smoothstep(.055,.095,l)+.215*smoothstep(.17,.23,l)+.255*smoothstep(.38,.46,l)+.30*smoothstep(.64,.74,l);
  float nl=mix(l,r,mix(.62,.20,flatG));
  c*=nl/max(l,.004);l=nl;
 }
 c=mix(vec3(l),c,mix(mix(1.16,1.07,flatG),1.06,sky));
 c=mix(c*vec3(.70,.78,1.12)+vec3(.012,.018,.045),c,smoothstep(.02,.34,l));
 c*=mix(vec3(1.),vec3(1.06,1.02,.93),smoothstep(.42,.90,l)*(1.-sky));
 return max(c,vec3(0.));
}
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
 float edge=0.,skyMask=0.,flatG=0.;
 int kr=0;if(lookOn>.5&&styleDetail>.5){float vz0=viewZ(uvP);kr=sharper>.5?(vz0<260.?1:0):(vz0<130.?2:vz0<600.?1:0);}
 vec3 raw=texture2D(tex,uvP).rgb,c=kr>0?kuwa(uvP,kr):raw;
 if(lookOn>.5&&styleDetail>.5){
  // 清晰度：混回一部分原始像素，再按亮度轻锐化一次，只动明暗不动色相。
  c=mix(c,raw,mix(.22,.42,sharper));
  vec3 lw=vec3(.2126,.7152,.0722);
  vec3 a=texture2D(tex,uvP+vec2(texel.x,0.)).rgb,b=texture2D(tex,uvP-vec2(texel.x,0.)).rgb,e=texture2D(tex,uvP+vec2(0.,texel.y)).rgb,f=texture2D(tex,uvP-vec2(0.,texel.y)).rgb;
  float l0=dot(raw/(1.+raw),lw),avg=(dot(a/(1.+a),lw)+dot(b/(1.+b),lw)+dot(e/(1.+e),lw)+dot(f/(1.+f),lw))*.25;
  c*=1.+clamp((l0-avg)*mix(.9,1.5,sharper)/max(l0,.05),-.30,.30);
 }
 c*=ao;
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
   c*=mix(mix(vec3(.74,.77,.86),vec3(.66,.58,.68),styleDusk),vec3(1.),cloudShade(world));
   if(hazeDensity>0.){
    vec3 dir=ray/max(dist,.001);
    float travel=max(dist-hazeStart,0.),fall=hazeFalloff*dir.y,base=hazeDensity*exp(-hazeFalloff*max(eye.y,0.));
    float optical=base*travel*(abs(fall*travel)>.001?(1.-exp(-fall*travel))/(fall*travel):1.);
    float fog=1.-exp(-max(optical,0.));
    float toward=pow(max(dot(dir,sunDir),0.),6.);
    c=mix(c,mix(hazeColor,hazeSunColor,toward),fog);
   }
   if(styleNight<.5){
    float aerial=smoothstep(60.,230.,cameraWorld[3].y),start=styleWide>.5?hazeStart:mix(36.,hazeStart*.55,aerial);
    float ap=1.-exp(-max(dist-start,0.)*(styleWide>.5?.00016:mix(.00042,.00010,aerial))*mix(.78,.60,sharper)*exp(-max(world.y,0.)/1100.));
    vec3 apC=mix(vec3(.46,.68,.98),vec3(1.05,.60,.40),styleDusk);
    apC=mix(apC,mix(vec3(1.05,.98,.86),vec3(1.5,.80,.42),styleDusk),pow(max(dot(ray/max(dist,.001),sunDir),0.),4.));
    apC=mix(apC,vec3(.50,.56,.62),styleWet);c=mix(c,apC,ap);
    if(styleDetail>.5){
     vec3 wn=wideN(uvP);flatG=smoothstep(.72,.90,abs(wn.y));
     edge=inkEdge(uvP,dist)*(1.-smoothstep(.60,.82,abs(wn.y)))*(1.-smoothstep(mix(220.,300.,sharper),mix(900.,1200.,sharper),dist));
    }else flatG=.5;
   }
   c=mix(c,mix(vec3(.80,.90,1.02),vec3(1.20,.72,.50),styleDusk),(styleNight>.5?0.:kasumi(world,dist))*.24*mix(.8,.6,sharper));
  }else if(styleNight<.5){
   skyMask=1.;// 阴雨沿用自然天空的层云，只有晴天换成手绘积云。
   if(styleWet<.5){vec3 sky=skyRay(uvP);c=sky.y<0.?cloudSea(sky):animeSky(sky);}
  }
 }
 c+=texture2D(bloomTex,uvP).rgb*(strength*(lookOn>.5?1.25:1.)+dayBloom);
 if(lookOn>.5&&styleNight<.5&&styleDetail>.5){
  float fade=smoothstep(.10,.72,dot(skyRay(vec2(.5)),sunDir));
  if(fade>0.)c+=mix(vec3(1.0,.93,.78),vec3(1.4,.72,.36),styleDusk)*sunShafts(uvP,cameraWorld[3].xyz)*.11*fade;
 }
 c=aces(c*exposure);
 if(grade>0.){
  float luma=dot(c,vec3(.2126,.7152,.0722));
  c=mix(c,mix(vec3(luma),c,1.06),grade);
  c*=mix(vec3(1.),mix(vec3(.985,.995,1.02),vec3(1.012,1.,.975),smoothstep(.08,.55,luma)),grade);
 }
 if(lookOn>.5){
  if(styleNight<.5){c=gradeStrong(c,skyMask,flatG);c=mix(c,c*vec3(.42,.44,.62),edge*mix(.72,.85,sharper));}
  else c=gradeAnime(c,skyMask);
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
  this.setupLookOutput();this.makeMotes();this.applyLookMsaa();this.addSharperOption();
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
 // 种植树按批次中心算距离时，镜头在批次边缘会看到六边形低模，这里按批次最近边缘算。
 // 按批次里最近一棵树的实际距离选精度。批次半径可达 477 米：按中心算，近处的树会留在六边形低模；
 // 按包围球算，整批远树都会切到高模。阈值不能再收紧，否则六边形会回到中景。
 nearestTree(record,distance){
  const m=record.data,eye=this.lookEye,bound=Math.max(0,distance-m.radius);
  if(!eye||bound>400)return bound;
  const a=m.instances,scale=record.xf?.scale||1,offset=record.xf?.offset||[0,0,0];
  let best=Infinity;
  for(let i=12;i<a.length;i+=16){
   const x=a[i]*scale+offset[0]-eye[0],y=a[i+1]*scale+offset[1]-eye[1],z=a[i+2]*scale+offset[2]-eye[2],d=x*x+y*y+z*z;
   if(d<best)best=d;
  }
  return Math.sqrt(best);
 }
 levelFor(record,distance){const m=record.data;return super.levelFor(record,m.material==='landscapeLeaf'&&m.instances?this.nearestTree(record,distance):distance);}
 // 轮廓由绘画滤镜接管，边缘更依赖原始采样，非低画质用 4 倍。
 applyLookMsaa(){const t=this.sceneTarget,want=this.quality==='low'?0:4;if(t&&t.samples!==want){this.engine.setRenderTarget(null);t.dispose();t.samples=want;}}
 setSize(w,h,dpr=1){super.setSize(w,h,dpr);this.applyLookMsaa();}
 setQuality(q){super.setQuality(q);this.applyLookMsaa();}
 // 默认是“清晰”档；设置面板的这一行由这里加入，不改动受保护的页面文件。
 addSharperOption(){
  const anchor=globalThis.document?.getElementById?.('opt-bloom')?.closest?.('label');if(!anchor)return;
  const row=document.createElement('label'),box=document.createElement('input');
  box.type='checkbox';box.id='opt-sharper';row.append('更清晰',box);
  box.onchange=()=>{this.outputMat.uniforms.sharper.value=box.checked?1:0;globalThis.ATLAS?.wake?.();};
  anchor.after(row);this.sharperRow=row;
 }
 makeMotes(){
  const T=this.T,n=460,pos=new Float32Array(n*3),size=new Float32Array(n),r=G.rng(771);
  for(let i=0;i<n;i++){pos[i*3]=r()*64;pos[i*3+1]=r()*26;pos[i*3+2]=r()*64;size[i]=.6+r();}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));g.setAttribute('aSize',new T.BufferAttribute(size,1));
  const m=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,uniforms:{uTime:this.timeUniform,uEye:{value:new T.Vector3()},uPixel:{value:1},uTint:{value:new T.Color(1.2,1.1,.8)}},
   vertexShader:`attribute float aSize;uniform float uTime,uPixel;uniform vec3 uEye;varying float vA;void main(){vec3 q=position+vec3(sin(uTime*.31+position.z)*2.2+uTime*.9,sin(uTime*.23+position.x)*1.4+uTime*.12,cos(uTime*.27+position.y)*2.2+uTime*.35);vec3 rel=mod(q-uEye,vec3(64.,26.,64.))-vec3(32.,13.,32.);vec4 mv=viewMatrix*vec4(uEye+rel,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(aSize*uPixel*30./max(-mv.z,1.),2.,8.);vA=(1.-smoothstep(16.,30.,length(rel)))*(.55+.45*sin(uTime*1.7+position.x*3.));}`,
   fragmentShader:`precision highp float;uniform vec3 uTint;varying float vA;void main(){float d=length(gl_PointCoord-.5)*2.;float a=smoothstep(1.,.15,d)*vA;if(a<.01)discard;gl_FragColor=vec4(uTint*a*.62,a);}`});
  this.motes=new T.Points(g,m);this.motes.frustumCulled=false;this.motes.visible=false;this.moteScene=new T.Scene();this.moteScene.add(this.motes);
 }
 setupLookOutput(){
  const T=this.T,m=this.outputMat;
  Object.assign(m.uniforms,{sceneDepth:{value:this.sceneTarget.depthTexture},farDepth:{value:null},inverseProjection:{value:new T.Matrix4()},cameraWorld:{value:new T.Matrix4()},farMatrix:{value:new T.Matrix4()},nearMatrix:{value:new T.Matrix4()},lookOn:{value:0},hazeDensity:{value:0},hazeFalloff:{value:.0021},hazeStart:{value:0},farStrength:{value:0},nearActive:{value:0},grade:{value:0},farTexel:{value:new T.Vector2(1/3072,1/3072)},styleTime:{value:0},styleDusk:{value:0},styleNight:{value:0},styleWide:{value:0},styleWet:{value:0},styleDetail:{value:1},dayBloom:{value:0},sharper:{value:0},viewProj:{value:new T.Matrix4()},texel:{value:new T.Vector2(1/1920,1/1080)},paperTex:{value:this.lookNoise.value},hazeColor:{value:new T.Color()},hazeSunColor:{value:new T.Color()},sunDir:{value:new T.Vector3(0,1,0)}});
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
   s.uniforms.uLookNoise=this.lookNoise;s.uniforms.uLookGround=this.lookGround;s.uniforms.uLookTime=this.timeUniform;
   s.vertexShader='varying vec3 vLookWorld;\n'+s.vertexShader;
   s.vertexShader=s.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
    vec4 lookP=vec4(transformed,1.);
    #ifdef USE_INSTANCING
     lookP=instanceMatrix*lookP;
    #endif
    vLookWorld=(modelMatrix*lookP).xyz;`);
   s.fragmentShader='varying vec3 vLookWorld;uniform sampler2D uLookNoise;uniform float uLookGround,uLookTime;\n'+s.fragmentShader;
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
     vec4 e1=texture2D(uLookNoise,vLookWorld.xz/1750.+.31),e2=texture2D(uLookNoise,vLookWorld.xz/540.+.13);
     float alt=smoothstep(55.,340.,vLookWorld.y);
     // 魔法森林的地面整片压暗，土路按 g-r 保住。
     float magic=1.-smoothstep(.70,1.02,length((vLookWorld.xz-vec2(-1100.,-50.))/vec2(570.,490.)));
     float paintWood=max(smoothstep(.555,.665,e1.r*.60+e2.g*.40+alt*.34+lookSlope*.62)*lookGreen,magic*.96);
     float paintMask=max(lookGreen,magic*.94*smoothstep(.0,.035,diffuseColor.g-diffuseColor.r*.94));
     paintWood*=paintMask;
     vec3 meadow=mix(vec3(.066,.165,.052),vec3(.150,.255,.072),smoothstep(.28,.72,e2.r*.6+lookB.g*.4));
     meadow=mix(meadow,vec3(.285,.295,.105),smoothstep(.62,.84,e2.g*.55+lookA.g*.45)*.55);
     meadow=mix(meadow,vec3(.05,.20,.10),smoothstep(.60,.82,lookA.b)*.4);
     meadow*=1.+(lookC.b-.5)*.34*lookFine;
     float wave=texture2D(uLookNoise,(vLookWorld.xz+vec2(uLookTime*15.,uLookTime*6.))/170.).g;
     meadow*=1.+(wave-.5)*.42*(1.-paintWood)*lookMid;
     float paintFade=smoothstep(120.,380.,lookDist);
     // 单层噪声俯瞰时成格子，用旋转加不同周期的两层打散；不要用大幅扭曲，会出等高线花纹。
     vec2 rotW=vec2(vLookWorld.x*.8-vLookWorld.z*.6,vLookWorld.x*.6+vLookWorld.z*.8);
     vec4 c1=mix(texture2D(uLookNoise,rotW/53.),texture2D(uLookNoise,vLookWorld.xz/37.3+.37),.5)*1.25-.125,c2=mix(texture2D(uLookNoise,rotW/13.7+.21),texture2D(uLookNoise,vLookWorld.xz/9.1),.5);
     float clump=smoothstep(.32,.70,c1.r*.62+c2.g*.38);
     vec3 canopy=mix(vec3(.012,.042,.040),vec3(.085,.170,.055),clump);
     vec3 woodFloor=mix(vec3(.030,.062,.032),vec3(.088,.094,.042),lookB.g*.7+lookC.b*.3);
     lookGrass=mix(lookGrass,mix(meadow,mix(woodFloor,canopy,paintFade),paintWood),paintMask);
     vec2 paintTilt=(c1.rg-.5)*1.25*paintWood*paintFade;
     // 陡坡露出土岩，以噪声打散边界。
     float lookRock=smoothstep(.34,.72,lookSlope+(lookB.r-.5)*.30+(lookC.g-.5)*.12);
     lookGrass=mix(lookGrass,vec3(lookLuma)*vec3(.90,.84,.76)*(.80+.34*lookB.g),lookRock*.62);
     diffuseColor.rgb=mix(lookOriginal,lookGrass,lookMask);
     vec2 lookTilt=((texture2D(uLookNoise,vLookWorld.xz/2.9).ab-.5)*lookFine*.46+(lookC.rg-.5)*lookMid*.30)*lookW.y+paintTilt;
     normal=normalize(lookBaseNormal+(viewMatrix*vec4(lookTilt.x,0.,lookTilt.y,0.)).xyz*lookMask);
    }`);
   if(kind==='leaf'){
    s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
     if(uLookGround>.5){
      vec4 lookLeaf=texture2D(uLookNoise,vLookWorld.xz/23.+vLookWorld.y/41.);
      diffuseColor.rgb*=.84+.34*lookLeaf.g;
      vec4 tone=texture2D(uLookNoise,vLookWorld.xz/170.+.47);
      vec3 deep=diffuseColor.rgb*vec3(.50,.72,.52);
      diffuseColor.rgb=mix(deep,deep*vec3(1.55,1.22,.72),smoothstep(.38,.70,tone.r));
      // 法线改由世界空间噪声决定：一团一团受光，不再看得出单片叶子的朝向。
      vec4 blobA=texture2D(uLookNoise,vLookWorld.xz/10.5+vLookWorld.y/15.),blobB=texture2D(uLookNoise,vLookWorld.xz/3.6-vLookWorld.y/6.);
      vec3 blobN=normalize(vec3((blobA.r-.5)*1.9+(blobB.g-.5)*.8,.85,(blobA.g-.5)*1.9+(blobB.r-.5)*.8));
      normal=normalize((viewMatrix*vec4(blobN,0.)).xyz);
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(dot(diffuseColor.rgb,vec3(.3,.59,.11)))*vec3(.70,1.22,.62),.35);
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
  mat.customProgramCacheKey=()=>(key?key():'')+'-look-2-'+kind;mat.needsUpdate=true;
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
  const clear=(opts.weather||'clear')==='clear';if(this.sun.shadow.intensity>0)this.sun.shadow.intensity=.70;
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
  u.styleTime.value=this.timeUniform.value;u.styleDusk.value=o.lighting==='dusk'?1:0;u.styleNight.value=o.lighting==='night'?1:0;
  u.styleWide.value=o.displayMode==='atlas'?1:0;u.styleWet.value=o.weather==='rain'||o.weather==='cloudy'?1:0;u.styleDetail.value=this.quality==='low'?0:1;
  u.viewProj.value.multiplyMatrices(this.camera.projectionMatrix,this.camera.matrixWorldInverse);
  u.texel.value.set(1/this.sceneTarget.width,1/this.sceneTarget.height);
  this.brightMat.uniforms.threshold.value=surface&&o.lighting!=='night'?.98:1.25;
  const dayGlow=surface&&enabled&&o.lighting==='neutral';
  u.dayBloom.value=dayGlow?(u.sharper.value>.5?.13:.18):0;if(dayGlow)this.dayBloomPass();
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
  return super.post(enabled,exposure*scale)+(dayGlow?3:0);
 }
 dayBloomPass(){
  const e=this.engine,blur=this.blurMat.uniforms;
  this.quad.material=this.brightMat;e.setRenderTarget(this.blurA);e.render(this.postScene,this.postCamera);
  this.quad.material=this.blurMat;blur.tex.value=this.blurA.texture;blur.dir.value.set(1/this.blurA.width,0);e.setRenderTarget(this.blurB);e.render(this.postScene,this.postCamera);
  blur.tex.value=this.blurB.texture;blur.dir.value.set(0,1/this.blurA.height);e.setRenderTarget(this.blurA);e.render(this.postScene,this.postCamera);
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
  this.lookEye=rig.eye;
  const lowOverGround=rig.eye[1]-(this.world?.terrain?.height(rig.eye[0],rig.eye[2])??Infinity)<26;
  const motes=this.motes.visible=this.quality!=='low'&&!this.planOnly&&opts.motion!==false&&(opts.space||'surface')==='surface'&&opts.displayMode!=='atlas'&&opts.lighting!=='night'&&(opts.weather||'clear')==='clear'&&lowOverGround;
  if(motes){const u=this.motes.material.uniforms;u.uEye.value.fromArray(rig.eye);u.uPixel.value=this.engine.getPixelRatio();u.uTint.value.setRGB(...(opts.lighting==='dusk'?[1.5,.85,.42]:[1.2,1.1,.8]));}
  super.render(rig,{...opts,lookEye:rig.eye,lookTarget:rig.target});
  // 光点叠在后期之后，否则几像素的点会被绘画滤镜抹掉。
  if(motes&&!this.contextLost){const e=this.engine,keep=e.autoClear;e.autoClear=false;e.setRenderTarget(null);e.render(this.moteScene,this.camera);e.autoClear=keep;}
  const o=this.currentOptions;
  if(!this.planOnly&&!this.farTimer&&this.quality!=='low'&&(o?.space||'surface')==='surface'&&this.farKey!==this.lookFarKey(o))
   this.farTimer=setTimeout(()=>this.renderFarShadow(),globalThis.ATLAS_TEST_PAUSE?0:240);
 }
 dispose(){
  clearTimeout(this.farTimer);clearTimeout(this.shadowDeferTimer);this.lookCanvas.removeEventListener('webglcontextrestored',this.onLookContextRestored);
  this.sharperRow?.remove();this.motes.geometry.dispose();this.motes.material.dispose();this.lookNoise.value.dispose();this.farDepthMaterial?.dispose();this.farTarget?.depthTexture?.dispose();this.farTarget?.dispose();super.dispose();
 }
}
G.DioramaRenderer=LookRenderer;
})(globalThis.GA);
