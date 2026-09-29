/* 神社局部材质：以米为尺度，不依赖 UV、外部贴图或独立灯光。 */
(function(G){
'use strict';
const Base=G.DioramaRenderer;
const surfaceGLSL=`
varying vec3 vHakureiWorld;
float hakHash(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
float hakNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hakHash(i),hakHash(i+vec2(1.,0.)),f.x),mix(hakHash(i+vec2(0.,1.)),hakHash(i+vec2(1.)),f.x),f.y);}
vec2 hakProject(vec3 p,vec3 n){return n.y>.65?p.xz:n.x>n.z?p.zy:p.xy;}
float hakDetail(vec2 uv,float frequency){return 1.-smoothstep(.35,1.2,length(fwidth(uv))*frequency);}
vec2 hakPebble(vec2 p){
 vec2 cell=floor(p),f=fract(p);float nearest=4.,tint=0.;
 for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
  vec2 offset=vec2(float(x),float(y)),id=cell+offset;
  vec2 center=vec2(hakHash(id),hakHash(id+19.7))*.72+.14;
  float d=length(offset+center-f);
  if(d<nearest){nearest=d;tint=hakHash(id+51.9);}
 }
 return vec2(nearest,tint);
}
`;

function surface(kind,axis){
 if(['Leaf','Cherry','Needle'].includes(kind))return `
  vec3 hakP=vHakureiWorld-vec3(1620.,180.,160.);
  float cluster=hakNoise(hakP.xz*.8+hakP.y*.13),hakRough=.83+cluster*.10;
  diffuseColor.rgb*=mix(vec3(.90,.94,.85),vec3(1.04,1.04,.95),cluster);
 `;
 const start=`vec3 hakP=vHakureiWorld-vec3(1620.,180.,160.);
 vec3 hakN=abs(normalize(cross(dFdx(vHakureiWorld),dFdy(vHakureiWorld))));
 vec2 hakUV=hakProject(hakP,hakN);
 float hakHeight=0.,hakRough=roughness;vec3 hakTint=vec3(1.);
 float hakDistanceDetail=1.-smoothstep(110.,155.,length(vViewPosition));
 `;
 let body='';
 if(kind==='Gravel')body=`
  float large=hakNoise(hakP.xz*.34),medium=hakNoise(hakP.xz*2.3);
  float detail=hakDetail(hakP.xz,13.5)*hakDistanceDetail,chips=1.;hakRough=.94;
  if(detail>0.){
   vec2 pebble=hakPebble(hakP.xz*13.5);float dome=1.-smoothstep(.13,.57,pebble.x);
   chips=mix(1.,.68+.26*pebble.y+.19*dome,detail);
   hakHeight=(dome*.014+medium*.005)*detail;hakRough=mix(.94,.89+.10*pebble.y,detail);
  }
  hakTint=vec3((.89+.16*large+.06*(medium-.5))*chips);
 `;
 if(kind==='Moss')body=`
  float mossPatch=hakNoise(hakP.xz*2.2),tuft=.5;
  float detail=hakDetail(hakP.xz,23.)*hakDistanceDetail;
  if(detail>0.)tuft=hakNoise(hakP.xz*23.);
  hakTint=mix(vec3(.79,.88,.72),vec3(1.05,1.04,.86),mossPatch);
  hakTint*=1.+(tuft-.5)*.15*detail;
  hakHeight=(mossPatch*.014+tuft*.006)*detail;hakRough=.98;
 `;
 if(kind==='Stone')body=`
  float mineral=hakNoise(hakUV*3.4),grain=.5;
  float detail=hakDetail(hakUV,32.)*hakDistanceDetail;
  if(detail>0.)grain=hakNoise(hakUV*32.);
  hakTint=vec3(.94+mineral*.10+(grain-.5)*.12*detail);
  hakHeight=(mineral*.009+grain*.0025)*detail;hakRough=.79+mineral*.16;
 `;
 if(kind==='Wood'||kind==='Bark'){
  const projection=axis==='x'?'vec2(hakN.y>.65?hakP.z:hakP.y,hakP.x)':axis==='z'?'vec2(hakN.y>.65?hakP.x:hakP.y,hakP.z)':axis==='y'||kind==='Bark'?'vec2(hakN.x>hakN.z?hakP.z:hakP.x,hakP.y)':'(hakN.y>.65?vec2(hakP.z,hakP.x):vec2(hakN.x>hakN.z?hakP.z:hakP.x,hakP.y))';
  body=`
  vec2 grainUV=${projection};
  float broad=hakNoise(grainUV*vec2(10.,.7));
  float detail=hakDetail(grainUV*vec2(1.,.06),${kind==='Bark'?'12.':'18.'})*hakDistanceDetail,grooves=0.;
  if(detail>0.){
   float warp=hakNoise(grainUV*vec2(3.1,.32));
   float fiber=.5+.5*sin(grainUV.x*${kind==='Bark'?'58.':'92.'}+warp*5.5);
   grooves=pow(fiber,${kind==='Bark'?'3.':'5.'});
  }
  hakTint=vec3(${kind==='Bark'?'.81+.23*broad-grooves*.13*detail':'.91+.12*broad-grooves*.10*detail'});
  hakHeight=(broad*${kind==='Bark'?'.020':'.003'}-grooves*${kind==='Bark'?'.018':'.0035'})*detail;
  hakRough=${kind==='Bark'?'.88+.10*broad':'.56+.18*broad+.05*grooves*detail'};
 `;
 }
 if(kind==='Roof')body=`
  // 灰瓦起伏来自真实瓦形；这里只补陶土颗粒和每片烧色。
  vec2 roofUV=vec2(hakP.z,-hakP.x);
  float firing=hakHash(floor(roofUV/vec2(.52,.58)));
  float mineral=.5,pore=.5,detail=hakDetail(hakUV,46.)*hakDistanceDetail;
  if(detail>0.){mineral=hakNoise(hakUV*12.);pore=hakNoise(hakUV*46.);}
  hakTint=vec3(.93+firing*.12+(mineral-.5)*.045*detail);
  hakHeight=(mineral*.0018+pore*.0008)*detail;hakRough=.48+firing*.13;
 `;
 if(kind==='Paper')body=`
  float fiber=.5,detail=hakDetail(hakUV,70.)*hakDistanceDetail;
  if(detail>0.)fiber=hakNoise(hakUV*vec2(70.,11.));
  hakTint=vec3(1.+(fiber-.5)*.07*detail);
  hakHeight=fiber*.0007*detail;hakRough=.94;
 `;
 if(kind==='Plaster')body=`
  float lime=hakNoise(hakUV*1.8),grain=.5,detail=hakDetail(hakUV,28.)*hakDistanceDetail;
  if(detail>0.)grain=hakNoise(hakUV*28.);
  hakTint=vec3(.965+lime*.065+(grain-.5)*.035*detail);
  hakHeight=(lime*.002+grain*.0012)*detail;hakRough=.89+lime*.08;
 `;
 if(kind==='Lacquer')body=`
  float finish=hakNoise(hakUV*vec2(28.,1.6));
  hakTint=vec3(.98+finish*.04);hakHeight=finish*.0006*hakDetail(hakUV,28.);hakRough=.30+finish*.08;
 `;
 return start+body+'\ndiffuseColor.rgb*=hakTint;';
}

function leafTextures(T,kind){
 const canvas=typeof OffscreenCanvas==='function'?new OffscreenCanvas(256,256):document.createElement('canvas');
 canvas.width=canvas.height=256;
 const ctx=canvas.getContext('2d'),random=G.rng(kind==='Cherry'?671:kind==='Needle'?911:307);
 ctx.fillStyle='#000';ctx.fillRect(0,0,256,256);ctx.lineCap='round';
 const leaf=(x,y,length,width,angle)=>{
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.fillStyle='#fff';ctx.beginPath();
  ctx.moveTo(0,-length*.5);ctx.bezierCurveTo(width,-length*.16,width*.72,length*.32,0,length*.5);
  ctx.bezierCurveTo(-width*.72,length*.32,-width,-length*.16,0,-length*.5);ctx.fill();ctx.restore();
 };
 const flower=(x,y,r)=>{
  for(let p=0;p<5;p++){const angle=p*Math.PI*2/5;leaf(x+Math.sin(angle)*r*.56,y+Math.cos(angle)*r*.56,r*1.6,r*.60,-angle);}
 };
 if(kind==='Needle'){
  // 一张卡代表整束杉枝。连续的羽状体块可在 mip 缩小时保留覆盖，
  // 细针只修饰轮廓，不能让几根像素宽的针叶承担整棵树的体积。
  const outline=[[128,240],[103,216],[84,218],[89,196],[60,203],[68,180],[33,190],[43,165],[14,168],[30,146],[8,139],[30,119],[20,101],[43,105],[32,82],[58,91],[54,61],[77,78],[88,43],[104,70],[120,17],[136,55],[155,28],[163,65],[192,49],[184,87],[219,78],[203,106],[240,107],[219,131],[248,147],[220,165],[236,187],[202,184],[210,209],[177,201],[170,225],[146,218]];
  ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(...outline[0]);for(const p of outline.slice(1))ctx.lineTo(...p);ctx.closePath();ctx.fill();
  // 只在边沿留少量透光孔，枝簇中心保持连续绿量。
  ctx.fillStyle='#000';
  for(const [x,y,w,h,a]of [[57,143,8,2.2,-.5],[192,146,9,2.5,.45],[91,96,7,2.3,-.9],[166,95,7,2.3,.8],[119,190,5,2,.3]]){
   ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.beginPath();ctx.ellipse(0,0,w,h,0,0,Math.PI*2);ctx.fill();ctx.restore();
  }
 }else for(let branch=0;branch<6;branch++){
  const angle=-2.85+branch*.48,tip=[128+Math.cos(angle)*(76+random()*24),157+Math.sin(angle)*(77+random()*25)];
  ctx.strokeStyle='#ddd';ctx.lineWidth=1.7;ctx.beginPath();ctx.moveTo(128,200);ctx.quadraticCurveTo(121,144,...tip);ctx.stroke();
  const count=5;
  for(let i=1;i<=count;i++){
   const t=i/(count+1),x=128+(tip[0]-128)*t,y=187+(tip[1]-187)*t;
   for(const side of [-1,1]){
    const a=angle+side*.83,spread=11;
    if(kind==='Cherry')flower(x+Math.cos(a)*spread,y+Math.sin(a)*spread,6+random()*5);
    else leaf(x+Math.cos(a)*spread,y+Math.sin(a)*spread,24+random()*18,6+random()*4,a+Math.PI*.5);
   }
  }
  if(kind==='Cherry')flower(...tip,10);
  else leaf(...tip,35,9,angle+Math.PI*.5);
 }
 const texture=new T.CanvasTexture(canvas);texture.name='hakurei-'+kind.toLowerCase()+'-cutout';
 // alphaMap 读取绿通道，黑底白叶可避免透明画布的预乘边缘污染。
 texture.colorSpace=T.NoColorSpace;texture.generateMipmaps=true;
 let color=null;
 if(kind==='Needle'){
  // 轮廓负责远处冠量；独立灰阶图让近处读到枝轴与成束细针。
  const detail=typeof OffscreenCanvas==='function'?new OffscreenCanvas(256,256):document.createElement('canvas');
  detail.width=detail.height=256;const pen=detail.getContext('2d');
  pen.fillStyle='#e8e8e8';pen.fillRect(0,0,256,256);pen.lineCap='round';
  const stroke=(a,b,gray,width)=>{pen.strokeStyle=`rgb(${gray},${gray},${gray})`;pen.lineWidth=width;pen.beginPath();pen.moveTo(...a);pen.lineTo(...b);pen.stroke();};
  for(let row=0;row<8;row++)for(const side of [-1,1]){
   const y=216-row*22,reach=[43,70,96,109,102,84,62,34][row];
   const root=[128,y],tip=[128+side*reach,y-31];
   const dx=tip[0]-root[0],dy=tip[1]-root[1],length=Math.hypot(dx,dy),ux=dx/length,uy=dy/length;
   stroke(root,tip,176,3.2);
   for(let i=1;i<=Math.floor(length/4);i++){
    const t=i/(Math.floor(length/4)+1),x=root[0]+dx*t,z=root[1]+dy*t;
    for(const spread of [-1,1]){
     const needle=(9+random()*10)*(1.-t*.35),end=[x+ux*7-uy*needle*spread,z+uy*7+ux*needle*spread];
     stroke([x,z],end,148+Math.floor(random()*27),2.7);
     stroke([x+.7,z-.8],[end[0]+.7,end[1]-.8],224+Math.floor(random()*32),1.5);
    }
   }
  }
  stroke([128,235],[128,34],171,3.4);stroke([129,230],[129,38],224,1.2);
  color=new T.CanvasTexture(detail);color.name='hakurei-needle-fibers';color.colorSpace=T.NoColorSpace;color.generateMipmaps=true;
 }
 return {mask:texture,color};
}

class HakureiRenderer extends Base{
 constructor(T,canvas,world){
  super(T,canvas,world);this.hakureiMaterials=[];this.hakureiWoodVariants={};
  const definitions={Gravel:.96,Moss:.98,Stone:.88,Wood:.66,Roof:.54,Paper:.94,Plaster:.93,Lacquer:.34,Leaf:.88,Cherry:.90,Needle:.89,Bark:.94,Recess:1};
  const make=(kind,axis='')=>{
   // 继续原有空间雾、剖切与阴影接收链；新纹理不改别的地区。
   const source=this.mats.matte,prior=source.onBeforeCompile,sourceKey=source.customProgramCacheKey.bind(source);
   const mat=source.clone(),name='hakurei'+kind+(axis?axis.toUpperCase():'');
   mat.name=name;mat.roughness=definitions[kind];mat.metalness=0;
   mat.envMap=this.studioEnv.texture;mat.envMapIntensity=kind==='Recess'?.025:.15;
   mat.onBeforeCompile=(shader,renderer)=>{
    prior.call(source,shader,renderer);
    shader.vertexShader='varying vec3 vHakureiWorld;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`
     vec4 hakureiVertex=vec4(transformed,1.);
     #ifdef USE_INSTANCING
      hakureiVertex=instanceMatrix*hakureiVertex;
     #endif
     vHakureiWorld=(modelMatrix*hakureiVertex).xyz;
     #include <project_vertex>`);
    shader.fragmentShader=surfaceGLSL+shader.fragmentShader;
    // 叶片裁切后才计算色差；叶色分支没有屏幕导数，孔洞边沿也安全。
    const colorChunk=['Leaf','Cherry','Needle'].includes(kind)?'alphatest_fragment':'color_fragment';
    shader.fragmentShader=shader.fragmentShader.replace('#include <'+colorChunk+'>','#include <'+colorChunk+'>\n'+surface(kind,axis));
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=clamp(hakRough,.25,1.);');
    if(!['Leaf','Cherry','Needle','Recess'].includes(kind))shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
     float hakFade=1.-smoothstep(45.,155.,length(vViewPosition));
     float hakRelief=hakHeight*hakFade;
     // 导数统一在噪声分支汇合后计算，不能移入以下距离分支。
     vec3 hakDx=dFdx(-vViewPosition),hakDy=dFdy(-vViewPosition);
     vec2 hakSlope=vec2(dFdx(hakRelief),dFdy(hakRelief));
     if(hakFade>0.){
      vec3 hakRx=cross(hakDy,normal),hakRy=cross(normal,hakDx);
      float hakDet=dot(hakDx,hakRx);
      vec3 hakGradient=sign(hakDet)*(hakSlope.x*hakRx+hakSlope.y*hakRy);
      normal=normalize(abs(hakDet)*normal-hakGradient);
     }`);
    if(kind==='Recess')shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>','#include <lights_fragment_end>\nreflectedLight.indirectDiffuse*=.52;');
    if(['Leaf','Cherry','Needle'].includes(kind))shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
     #if NUM_HEMI_LIGHTS > 0 && defined(RE_IndirectDiffuse)
      // 只透入背面多出的天空漫射光，保留太阳阴影，不产生自发光。
      vec3 hakLeafFront=getHemisphereLightIrradiance(hemisphereLights[0],geometryNormal);
      vec3 hakLeafBack=getHemisphereLightIrradiance(hemisphereLights[0],-geometryNormal);
      reflectedLight.indirectDiffuse+=diffuseColor.rgb*max(hakLeafBack-hakLeafFront,vec3(0.))*RECIPROCAL_PI*${kind==='Needle'?'.30':'.38'};
     #endif`);
   };
   mat.customProgramCacheKey=()=>sourceKey()+'-hakurei-surface-3-'+kind+'-'+axis;
   this.mats[name]=mat;this.hakureiMaterials.push(mat);return mat;
  };
  for(const kind of Object.keys(definitions))make(kind);
  for(const axis of ['x','y','z'])this.hakureiWoodVariants[axis]=make('Wood',axis);
  this.hakureiCardMaterials={};this.hakureiCardDepth={};this.hakureiMasks=[];
  for(const kind of ['Leaf','Cherry','Needle']){
   const source=this.mats['hakurei'+kind],mat=source.clone(),{mask,color}=leafTextures(T,kind);
   mat.name=source.name+'Cards';mat.onBeforeCompile=source.onBeforeCompile;mat.customProgramCacheKey=source.customProgramCacheKey;
   const alphaTest=kind==='Needle'?.33:.45;
   mat.alphaMap=mask;mat.alphaTest=alphaTest;mat.alphaToCoverage=true;
   this.mats[mat.name]=mat;this.hakureiMaterials.push(mat);this.hakureiMasks.push(mask);
   if(color){mat.map=color;this.hakureiMasks.push(color);}
   this.hakureiCardMaterials[source.name]=mat;
   this.hakureiCardDepth[source.name]=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,alphaMap:mask,alphaTest,side:T.DoubleSide});
  }
  this.patchShrineGround();
 }
 patchShrineGround(){
  const source=this.mats.ground,ground=source.clone(),prior=source.onBeforeCompile,oldKey=source.customProgramCacheKey.bind(source);
  ground.name='hakureiGround';this.mats.hakureiGround=ground;
  ground.onBeforeCompile=(shader,renderer)=>{
   prior.call(source,shader,renderer);
   shader.fragmentShader=`
    float hakSoilHash(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
    float hakSoilNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hakSoilHash(i),hakSoilHash(i+vec2(1.,0.)),f.x),mix(hakSoilHash(i+vec2(0.,1.)),hakSoilHash(i+vec2(1.)),f.x),f.y);}
   `+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    vec2 hakSoilP=vAtlasPosition.xz-vec2(1620.,160.);
    float hakSoilMask=1.-smoothstep(150.,215.,length(hakSoilP));
    float hakSoilDetail=(1.-smoothstep(.12,.55,length(fwidth(hakSoilP))))*(1.-smoothstep(110.,155.,length(vViewPosition)));
    float hakSoilRelief=0.;
    if(hakSoilMask>0.){
     float hakSoilPatch=hakSoilNoise(hakSoilP*.16),hakSoilGrain=.5;
     if(hakSoilDetail>0.)hakSoilGrain=hakSoilNoise(hakSoilP*4.);
     vec3 hakSoilTint=mix(vec3(.79,.84,.73),vec3(.99,1.01,.88),hakSoilPatch);
     hakSoilTint*=1.+(hakSoilGrain-.5)*.11*hakSoilDetail;
     diffuseColor.rgb*=mix(vec3(1.),hakSoilTint,hakSoilMask);
     hakSoilRelief=(hakSoilPatch*.022+hakSoilGrain*.007)*hakSoilMask*hakSoilDetail;
    }`);
   shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
    // 先求完整四像素组的导数，再跳过区域外和远处的法线扰动。
    vec3 hakSoilDx=dFdx(-vViewPosition),hakSoilDy=dFdy(-vViewPosition);
    vec2 hakSoilSlope=vec2(dFdx(hakSoilRelief),dFdy(hakSoilRelief));
    if(hakSoilMask>0.&&hakSoilDetail>0.){
     vec3 hakSoilRx=cross(hakSoilDy,normal),hakSoilRy=cross(normal,hakSoilDx);
     float hakSoilDet=dot(hakSoilDx,hakSoilRx);
     vec3 hakSoilGradient=sign(hakSoilDet)*(hakSoilSlope.x*hakSoilRx+hakSoilSlope.y*hakSoilRy);
     normal=normalize(abs(hakSoilDet)*normal-hakSoilGradient);
    }`);
  };
  ground.customProgramCacheKey=()=>oldKey()+'-hakurei-ground-2';ground.needsUpdate=true;
 }
 material(m){
  if(m.leafCards&&this.hakureiCardMaterials[m.material])return this.hakureiCardMaterials[m.material];
  if(m.material==='hakureiWood'&&m.woodAxis)return this.hakureiWoodVariants[m.woodAxis]||this.mats.hakureiWood;
  const mat=super.material(m);
  // 不相交的地表保留原 shader，不承担神社区域判断和噪声成本。
  if(mat===this.mats.ground&&(m.globalSurface||m.owner==='hakurei')&&Math.hypot(m.center[0]-1620,m.center[2]-160)-m.radius<215)return this.mats.hakureiGround;
  return mat;
 }
 ensure(record,level){
  const mesh=super.ensure(record,level),data=record.data;
  if(data.leafCards&&this.hakureiCardDepth[data.material]){
   const geometry=mesh.geometry;
   if(!geometry.getAttribute('uv')){
    const count=geometry.getAttribute('position').count,uv=new Float32Array(count*2),quad=[0,0,1,0,1,1,0,0,1,1,0,1];
    for(let i=0;i<count;i++){uv[i*2]=quad[(i%6)*2];uv[i*2+1]=quad[(i%6)*2+1];}
    geometry.setAttribute('uv',new this.T.BufferAttribute(uv,2));
    // 与 acquire/release 共用引用计数，额外 UV 也计入 GPU 属性预算。
    const allocation=this.geometryRefs.get(record.array);
    if(allocation){allocation.bytes+=uv.byteLength;this.residentBytes+=uv.byteLength;}
   }
   mesh.customDepthMaterial=this.hakureiCardDepth[data.material];
  }
  return mesh;
 }
 lighting(rig,opts,distance){
  super.lighting(rig,opts,distance);
  // 公共光照每帧会写反射强度，故在其后恢复神社材质的局部标定。
  for(const mat of this.hakureiMaterials)mat.envMapIntensity=mat===this.mats.hakureiRecess?.025:opts.lighting==='dusk'?.10:.15;
 }
 dispose(){for(const texture of this.hakureiMasks)texture.dispose();for(const mat of Object.values(this.hakureiCardDepth))mat.dispose();super.dispose();}
}
G.DioramaRenderer=HakureiRenderer;
})(globalThis.GA);
