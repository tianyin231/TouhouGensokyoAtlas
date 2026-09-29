/* The production renderer uses the real upstream Three.js, not a Canvas facsimile. */
(function(G){'use strict';
async function loadThree(){
 if(globalThis.THREE?.WebGLRenderer)return globalThis.THREE;
 const core=document.getElementById('three-inline-core'),mod=document.getElementById('three-inline-module');
 if(!core||!mod||!core.textContent.trim()||!mod.textContent.trim())throw new Error('HTML 缺少内嵌 Three.js；请重新运行 python build.py。');
 const decode=e=>new TextDecoder().decode(Uint8Array.from(atob(e.textContent.trim()),c=>c.charCodeAt(0)));
 const coreURL=URL.createObjectURL(new Blob([decode(core)],{type:'text/javascript'}));
 const moduleURL=URL.createObjectURL(new Blob([decode(mod).replaceAll("'./three.core.js'",JSON.stringify(coreURL))],{type:'text/javascript'}));
 try { const lib=await import(moduleURL);if(!lib.WebGLRenderer)throw new Error('Three.js 模块不完整');return lib; }
 finally { URL.revokeObjectURL(moduleURL);URL.revokeObjectURL(coreURL); }
}
class ThreeRenderer {
 constructor(T,canvas,world){this.T=T;this.canvas=canvas;this.world=world;this.backend='three';this.name='Three.js r'+T.REVISION;this.quality='balanced';this.time=0;this.cache=new Map();this.objects=[];this.stats={};this.sunAnchor=[Infinity,Infinity,Infinity];
 this.engine=new T.WebGLRenderer({canvas,alpha:false,antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});
 this.engine.outputColorSpace=T.SRGBColorSpace;this.engine.toneMapping=T.ACESFilmicToneMapping;this.engine.toneMappingExposure=1.0;this.engine.shadowMap.enabled=true;this.engine.shadowMap.type=T.PCFShadowMap;this.engine.shadowMap.autoUpdate=false;
 this.scene=new T.Scene();this.scene.fog=new T.Fog(0xb7c8ca,1600,5600);this.scene.background=new T.Color(0xb7c8ca);this.camera=new T.PerspectiveCamera(49,1,.20,18000);
 this.hemisphere=new T.HemisphereLight(0xc5dded,0x8e8b75,1.85);this.scene.add(this.hemisphere);this.ambient=new T.AmbientLight(0xd4e2ec,.27);this.scene.add(this.ambient);this.sun=new T.DirectionalLight(0xffedcf,2.8);this.sun.position.set(-430,760,320);this.scene.add(this.sun,this.sun.target);this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);this.sun.shadow.normalBias=.09;this.sun.shadow.bias=-.00006;this.sun.shadow.camera.near=20;this.sun.shadow.camera.far=1900;this.sun.shadow.camera.left=-320;this.sun.shadow.camera.right=320;this.sun.shadow.camera.top=320;this.sun.shadow.camera.bottom=-320;
 this.timeUniform={value:0};this.mats={};for(let kind of['matte','roof','ground','paving','foliage','brick','jet','cave','gold','glow','templeStone','templePaving','timber','warmGlow','bambooStem','bambooLeaf','bambooGround','sunflowerPetal','lilyFlower','meadowLeaf','meadowGround','waterfall','spray','cableGlass','mountainTerrain']){const mat=new T.MeshStandardMaterial({vertexColors:true,roughness:kind==='roof'?.73:.95,metalness:0,side:T.DoubleSide});mat.name='atlas-'+kind;if(kind==='mountainTerrain'){
 mat.onBeforeCompile=shader=>{shader.vertexShader='varying vec3 vMountain;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvMountain=(modelMatrix*vec4(transformed,1.)).xyz;');shader.fragmentShader='varying vec3 vMountain;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 vec3 mn=normalize(cross(dFdx(vMountain),dFdy(vMountain)));float slope=1.-abs(mn.y);
 float strata=sin(vMountain.y*.44+sin(vMountain.x*.027+vMountain.z*.05)*1.2);
 float erosion=sin(vMountain.x*.081+vMountain.z*.077+vMountain.y*.013);
 diffuseColor.rgb*=1.-smoothstep(.15,.60,slope)*(.028+.03*strata+.028*erosion);
 `);};mat.customProgramCacheKey=()=> 'mountain-terrain-v012';}
 if(kind==='cableGlass'){mat.transparent=true;mat.opacity=.42;mat.depthWrite=false;mat.roughness=.28;mat.metalness=.12;}
 if(kind==='spray'){mat.transparent=true;mat.opacity=.47;mat.depthWrite=false;mat.emissive=new T.Color(0x779eaa);mat.emissiveIntensity=.30;}
 if(kind==='waterfall'){
 mat.roughness=.65;mat.emissive=new T.Color(0x6a9392);mat.emissiveIntensity=.30;
 mat.onBeforeCompile=shader=>{shader.uniforms.uFallTime=this.timeUniform;shader.vertexShader='varying vec3 vFall;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvFall=(modelMatrix*vec4(transformed,1.)).xyz;');shader.fragmentShader='varying vec3 vFall; uniform float uFallTime;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 float lines=.5+.5*sin(vFall.x*3.8+.48*sin(vFall.y*.026));
 float flecks=.5+.5*sin(vFall.y*.64+uFallTime*8.4+sin(vFall.x*4.)*1.4);
 diffuseColor.rgb*=.75+.20*lines+.18*flecks;
 `);};mat.customProgramCacheKey=()=> 'mountain-fall-v012';}
 if(kind==='gold'){mat.roughness=.48;mat.metalness=.22;}if(kind==='glow'){mat.emissive=new T.Color(0x81e5d6);mat.emissiveIntensity=1.0;}if(kind==='cave')mat.roughness=1;
 if(['sunflowerPetal','lilyFlower','meadowLeaf'].includes(kind)){
 mat.roughness=.88;
 const amp=kind==='sunflowerPetal'?.044:kind==='lilyFlower'?.013:.034;
 mat.onBeforeCompile=shader=>{shader.uniforms.uFlowerTime=this.timeUniform;shader.vertexShader='uniform float uFlowerTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
 vec4 flowerWP=vec4(transformed,1.);
 #ifdef USE_INSTANCING
 flowerWP=instanceMatrix*flowerWP;
 #endif
 float bend=pow(max(0.,position.y),1.8)*${amp.toFixed(5)};
 transformed.x+=bend*sin(uFlowerTime*.85+flowerWP.x*.073+flowerWP.z*.055);
 transformed.z+=bend*.5*cos(uFlowerTime*.69+flowerWP.z*.079);`);};mat.customProgramCacheKey=()=> 'flowerland-v011-'+kind;
 }
 if(kind==='meadowGround'){mat.polygonOffset=true;mat.polygonOffsetFactor=-1;mat.polygonOffsetUnits=-1;}
 if(kind==='bambooLeaf'){
 mat.roughness=.88;mat.emissive=new T.Color(0x152a12);mat.emissiveIntensity=.16;
 mat.onBeforeCompile=shader=>{shader.uniforms.uBambooTime=this.timeUniform;shader.vertexShader='uniform float uBambooTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
 vec4 bambooWP=vec4(transformed,1.);
 #ifdef USE_INSTANCING
 bambooWP=instanceMatrix*bambooWP;
 #endif
 float sway=smoothstep(3.,18.,position.y)*.14;
 transformed.x+=sway*sin(uBambooTime*.84+bambooWP.x*.09+bambooWP.z*.11);
 transformed.z+=sway*.6*cos(uBambooTime*.61+bambooWP.z*.13);`);};mat.customProgramCacheKey=()=> 'bamboo-leaf-v09';}
 if(kind==='bambooStem'){mat.roughness=.69;}
 if(kind==='bambooGround'){mat.polygonOffset=true;mat.polygonOffsetFactor=-1;mat.polygonOffsetUnits=-1;}
 if(kind==='warmGlow'){mat.emissive=new T.Color(0xffce88);mat.emissiveIntensity=1.5;mat.roughness=.9;}
 if(['templeStone','templePaving','timber'].includes(kind)){
  mat.onBeforeCompile=shader=>{
   shader.vertexShader='varying vec3 vLocalWorld;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvLocalWorld=(modelMatrix*vec4(transformed,1.)).xyz;');
   shader.fragmentShader='varying vec3 vLocalWorld;\n'+shader.fragmentShader;
   const body=kind==='timber'?`float grain=.5+.5*sin(vLocalWorld.y*3.7+sin(vLocalWorld.x*6.)*.4);diffuseColor.rgb*=.93+.07*grain;`:
    `vec3 nn=abs(normalize(cross(dFdx(vLocalWorld),dFdy(vLocalWorld))));
     vec2 pp=nn.y>.65?vLocalWorld.xz/vec2(1.5,.85):vec2(nn.x>nn.z?vLocalWorld.z:vLocalWorld.x,vLocalWorld.y)/vec2(2.5,.8);
     pp.x+=mod(floor(pp.y),2.)*.5;vec2 ed=min(fract(pp),1.-fract(pp));vec2 aa=fwidth(pp)*1.1;
     float joint=min(smoothstep(.012,.012+aa.x,ed.x),smoothstep(.020,.020+aa.y,ed.y));
     float tint=fract(sin(dot(floor(pp),vec2(13.12,61.73)))*333.3);diffuseColor.rgb*=mix(.72,.955+tint*.045,joint);`;
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n'+body);
  };mat.customProgramCacheKey=()=> 'v08-'+kind;
 }
 if(kind==='ground'){mat.polygonOffset=true;mat.polygonOffsetFactor=1;mat.polygonOffsetUnits=1;}if(kind==='paving'){mat.onBeforeCompile=shader=>{shader.vertexShader='varying vec3 vPavingWorld;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvPavingWorld=(modelMatrix*vec4(transformed,1.)).xyz;');shader.fragmentShader='varying vec3 vPavingWorld;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
vec2 paving=vPavingWorld.xz/vec2(.91,.59);paving.x+=mod(floor(paving.y),2.)*.5;
vec2 edge=min(fract(paving),1.-fract(paving));vec2 aa=fwidth(paving)*1.2;
float mortar=min(smoothstep(.022,.022+aa.x,edge.x),smoothstep(.030,.030+aa.y,edge.y));
float tint=fract(sin(dot(floor(paving),vec2(17.21,61.37)))*437.13);
diffuseColor.rgb*=mix(.72,.96+tint*.075,mortar);`);};}if(kind==='brick'){mat.onBeforeCompile=shader=>{shader.vertexShader='varying vec3 vBrickWorld;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvBrickWorld=(modelMatrix*vec4(transformed,1.)).xyz;');shader.fragmentShader='varying vec3 vBrickWorld;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
vec3 brickN=abs(normalize(cross(dFdx(vBrickWorld),dFdy(vBrickWorld))));
vec2 brick=vec2(brickN.x>brickN.z?vBrickWorld.z:vBrickWorld.x,vBrickWorld.y)/vec2(.66,.27);
brick.x+=mod(floor(brick.y),2.)*.5; vec2 brEdge=min(fract(brick),1.-fract(brick));vec2 brAA=fwidth(brick)*1.1;
float brMortar=min(smoothstep(.023,.023+brAA.x,brEdge.x),smoothstep(.026,.026+brAA.y,brEdge.y));
float brTint=fract(sin(dot(floor(brick),vec2(11.67,71.31)))*1347.6);
diffuseColor.rgb*=mix(.71,.96+brTint*.075,brMortar);`);};mat.customProgramCacheKey=()=> 'atlas-brick-v06';}if(kind==='jet'){mat.transparent=true;mat.opacity=.68;mat.depthWrite=false;mat.roughness=.28;mat.onBeforeCompile=shader=>{shader.uniforms.uFlowTime=this.timeUniform;shader.vertexShader='varying vec3 vJetWorld;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvJetWorld=(modelMatrix*vec4(transformed,1.)).xyz;');shader.fragmentShader='varying vec3 vJetWorld; uniform float uFlowTime;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
float jetFlow=.5+.5*sin(vJetWorld.y*18.+uFlowTime*9.);diffuseColor.rgb*=.79+.31*jetFlow;diffuseColor.a*=.48+.52*jetFlow;`);};mat.customProgramCacheKey=()=> 'flowing-jet-v06';}this.mats[kind]=mat;}
 this.reflectionTarget=new T.WebGLRenderTarget(640,400);this.mirrorCamera=new T.PerspectiveCamera(49,1,.20,18000);this.mirrorMatrix=new T.Matrix4();this.mirrorLast=null;this.water=this.makeWater(false);this.caveWater=this.makeWater(false);this.caveWater.uniforms.uCave.value=1;this.canalWater=this.makeWater(true);this.lakeWater=this.makeWater(true);this.windWater=this.makeWater(true);this.makeSky();
 for(const m of world.meshes){const geos=[this.geometry(m.vertices)];if(m.farVertices)geos.push(this.geometry(m.farVertices));const mat=m.group==='water'?(m.id==='village-canal-water'?this.canalWater:m.id==='mist_lake-water'?this.lakeWater:m.id==='wind_lake-water'?this.windWater:m.space==='mausoleum'?this.caveWater:this.water):this.mats[m.material]||this.mats.matte;let mesh;
 if(m.instances){mesh=new T.InstancedMesh(geos[0],mat,m.instances.length/16);const matrix=new T.Matrix4(),color=new T.Color();for(let i=0;i<m.instances.length/16;i++){matrix.fromArray(m.instances,i*16);mesh.setMatrixAt(i,matrix);color.setRGB(...m.instanceColors.subarray(i*3,i*3+3),T.LinearSRGBColorSpace);mesh.setColorAt(i,color);}mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();}else mesh=new T.Mesh(geos[0],mat);
 if(m.motion?.kind==='ropeway')mesh.position.fromArray(G.MOUNTAIN.cablePoint(m.motion.track,m.motion.phase,m.motion.lane));mesh.name=m.id;mesh.castShadow=m.group!=='effects'&&m.group!=='water'&&m.group!=='terrain'&&m.lod!=='near'&&!(m.id==='route-shrine'||(m.id.startsWith('trail:')&&m.material==='ground'));if(m.flowerKind==='grass'||m.flowerKind==='lily')mesh.castShadow=false;mesh.receiveShadow=m.group!=='water'&&m.material!=='bambooStem'&&m.material!=='meadowGround';mesh.frustumCulled=true;mesh.userData.locationId=m.locationId||null;this.scene.add(mesh);this.objects.push({mesh,geos,data:m});}
 this.makeSigns(world.signs||[]);this.localLights=[];for(const p of (world.expansion.mausoleum.lights||[])){const light=new T.PointLight(p[3],p[4],p[5],1.6);light.position.set(p[0],p[1],p[2]);light.visible=false;this.scene.add(light);this.localLights.push(light);}this.activeSpace=null;this.engine.shadowMap.needsUpdate=true;
 }
 makeSigns(signs){const T=this.T;this.signObjects=[];for(const sign of signs){const c=document.createElement('canvas');c.width=sign.vertical?192:1024;c.height=sign.vertical?768:256;const ctx=c.getContext('2d');ctx.fillStyle=sign.background||'#563e43';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle=sign.color||'#eee3c8';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=(sign.vertical?'bold 120px':'bold 140px')+' "Noto Serif CJK SC", "Microsoft YaHei", serif';if(sign.vertical){[...sign.text].forEach((ch,i)=>ctx.fillText(ch,96,768/([...sign.text].length+1)*(i+1)));}else ctx.fillText(sign.text,512,128,975);const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=Math.min(4,this.engine.capabilities.getMaxAnisotropy());const mat=new T.MeshStandardMaterial({map:texture,roughness:.94,side:T.DoubleSide});const mesh=new T.Mesh(new T.PlaneGeometry(sign.width,sign.height),mat);mesh.position.fromArray(sign.position);mesh.rotation.y=sign.yaw||0;mesh.name='readable-sign-'+sign.text;mesh.userData.atlasSpace=sign.space||'surface';mesh.userData.region=sign.region||null;this.scene.add(mesh);this.signObjects.push(mesh);}}

 geometry(a){if(this.cache.has(a))return this.cache.get(a);const T=this.T,g=new T.BufferGeometry(),b=new T.InterleavedBuffer(a,9);g.setAttribute('position',new T.InterleavedBufferAttribute(b,3,0));g.setAttribute('normal',new T.InterleavedBufferAttribute(b,3,3));g.setAttribute('color',new T.InterleavedBufferAttribute(b,3,6));g.computeBoundingSphere();this.cache.set(a,g);return g;}
 makeSky(){const T=this.T,mat=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{uTime:this.timeUniform,uSun:{value:new T.Vector3(-.43,.76,.32).normalize()}},vertexShader:`varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`precision highp float;varying vec3 vDir;uniform float uTime;uniform vec3 uSun;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
 void main(){vec3 d=normalize(vDir);float h=max(d.y,0.);vec3 c=mix(vec3(.43,.58,.66),vec3(.07,.27,.52),pow(h,.6));vec2 p=d.xz/max(.16,d.y)*2.6+vec2(uTime*.002,0.);float n=noise(p)*.58+noise(p*2.1)*.27+noise(p*4.3)*.15;float cloud=smoothstep(.59,.76,n)*smoothstep(.15,.35,d.y);c=mix(c,vec3(.91,.89,.81),cloud*.80);float sun=pow(max(dot(d,uSun),0.),600.);c+=vec3(1.3,1.15,.84)*sun;gl_FragColor=vec4(c,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});this.sky=new T.Mesh(new T.SphereGeometry(9500,32,16),mat);this.sky.renderOrder=-10;this.sky.frustumCulled=false;this.scene.add(this.sky);}
 makeWater(reflect=false){const T=this.T;return new T.ShaderMaterial({uniforms:{uCave:{value:0},uReflect:{value:reflect?1:0},uMirror:{value:this.reflectionTarget.texture},uMirrorMatrix:{value:this.mirrorMatrix},uTime:this.timeUniform,uFogColor:{value:new T.Color(0xb7c8ca)},uFogNear:{value:1600},uFogFar:{value:5600}},vertexShader:`varying vec3 vP;varying vec4 vMirror;uniform mat4 uMirrorMatrix;void main(){vec4 p=modelMatrix*vec4(position,1.);vP=p.xyz;vMirror=uMirrorMatrix*p;gl_Position=projectionMatrix*viewMatrix*p;}`,fragmentShader:`precision highp float;varying vec3 vP;varying vec4 vMirror;uniform float uCave;uniform float uReflect;uniform sampler2D uMirror;uniform float uTime;uniform vec3 uFogColor;uniform float uFogNear;uniform float uFogFar;
 void main(){vec3 n=normalize(vec3(.075*sin(vP.z*.66+vP.x*.18+uTime*.7)+.025*cos(vP.x*1.83-uTime),1.,.065*cos(vP.x*.49-vP.z*.24+uTime*.63)));vec3 v=normalize(cameraPosition-vP),sun=normalize(vec3(-.43,.76,.32));float fres=pow(1.-max(dot(n,v),0.),3.);vec3 c=mix(vec3(.075,.175,.166),vec3(.36,.49,.53),fres*.85);float shine=pow(max(dot(reflect(-sun,n),v),0.),100.);c+=vec3(.84,.77,.54)*shine*.95;if(uReflect>.5&&vMirror.w>0.){vec2 uv=vMirror.xy/vMirror.w+n.xz*.016;vec3 reflected=texture2D(uMirror,clamp(uv,.002,.998)).rgb;c=mix(c,reflected,.28+fres*.55);}
 if(uCave>.5){c=mix(vec3(.012,.052,.066),vec3(.085,.17,.20),fres*.8);float glint=pow(max(dot(reflect(-sun,n),v),0.),160.);c+=vec3(.11,.20,.21)*glint*.16;}
 float wave=sin(vP.z*.70+sin(vP.x*.28)*.7+uTime*.6)+.35*sin(vP.z*2.1+vP.x*.14+uTime);c+=vec3(.006,.009,.009)*wave;float fog=smoothstep(uFogNear,uFogFar,length(cameraPosition-vP));c=mix(c,uFogColor,fog);gl_FragColor=vec4(c,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`,side:T.DoubleSide});}
 setSize(w,h,dpr=1){this.cssWidth=w;this.cssHeight=h;this.deviceDpr=dpr;this.engine.setPixelRatio(Math.min(dpr,this.quality==='high'?1.8:this.quality==='low'?1:1.35));this.engine.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.reflectionTarget.setSize(Math.min(720,Math.round(w*.5)),Math.min(450,Math.round(h*.5)));this.mirrorLast=null;}
 setQuality(q){this.quality=q;this.engine.shadowMap.enabled=q!=='low';this.sun.castShadow=q!=='low';this.engine.shadowMap.needsUpdate=true;if(this.cssWidth)this.setSize(this.cssWidth,this.cssHeight,this.deviceDpr);}

 updateReflection(rig,opts){
  this.reflectionCalls=0;this.reflectionTriangles=0;
  const lakes=this.world.terrain.lakes||G.lakes,wind=lakes[1],nearWind=G.length(G.sub(rig.eye,[wind.x,wind.y,wind.z]))<780&&rig.eye[1]>wind.y+.4;const lake=nearWind?wind:lakes[0];const byLake=G.length(G.sub(rig.eye,[lake.x,lake.y,lake.z]))<850&&rig.eye[1]>lake.y+.4;
  const byVillage=!byLake&&G.length(G.sub(rig.eye,[20,30,0]))<720&&rig.eye[1]>27;
  this.camera.updateMatrixWorld();
  const probe=this.objects.find(o=>o.data.id===(byLake?lake.id+'-water':'village-canal-water'));
  const frustum=new this.T.Frustum().setFromProjectionMatrix(new this.T.Matrix4().multiplyMatrices(this.camera.projectionMatrix,this.camera.matrixWorldInverse));
  const waterInView=probe&&frustum.intersectsObject(probe.mesh);
  const enabled=this.activeSpace==='surface'&&this.quality!=='low'&&(byLake||byVillage)&&waterInView;this.canalWater.uniforms.uReflect.value=enabled&&byVillage?1:0;this.lakeWater.uniforms.uReflect.value=enabled&&byLake&&!nearWind?1:0;this.windWater.uniforms.uReflect.value=enabled&&byLake&&nearWind?1:0;this.reflectionLakeId=enabled&&byLake?lake.id:enabled?'village':null;if(!enabled)return;
  const y=byLake?lake.y+.25:G.WATER_Y;const pose=[...rig.eye,...rig.target,opts.vegetation===false?0:1,y];if(this.mirrorLast&&pose.every((v,i)=>Math.abs(v-this.mirrorLast[i])<.035))return;
  const T=this.T,mc=this.mirrorCamera;
  mc.aspect=this.camera.aspect;mc.fov=this.camera.fov;mc.updateProjectionMatrix();mc.position.set(rig.eye[0],2*y-rig.eye[1],rig.eye[2]);mc.up.set(0,-1,0);mc.lookAt(rig.target[0],2*y-rig.target[1],rig.target[2]);mc.updateMatrixWorld();
  this.mirrorMatrix.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1);this.mirrorMatrix.multiply(mc.projectionMatrix);this.mirrorMatrix.multiply(mc.matrixWorldInverse);
  const hidden=[];for(const item of this.objects)if(item.mesh.visible&&(item.data.group==='water'||(item.data.lod==='near'||item.data.lod==='props'))){item.mesh.visible=false;hidden.push(item.mesh);}
  const clip=this.engine.clippingPlanes;this.engine.clippingPlanes=[new T.Plane(new T.Vector3(0,1,0),-y+.05)];this.sky.position.copy(mc.position);
  this.engine.setRenderTarget(this.reflectionTarget);this.engine.clear();this.engine.render(this.scene,mc);this.reflectionCalls=this.engine.info.render.calls;this.reflectionTriangles=this.engine.info.render.triangles;this.engine.setRenderTarget(null);
  this.engine.clippingPlanes=clip;this.sky.position.copy(this.camera.position);for(const mesh of hidden)mesh.visible=true;this.mirrorLast=pose;
 }
 setSpace(space){if(space===this.activeSpace)return;this.activeSpace=space;this.mirrorLast=null;this.sunAnchor=[Infinity,Infinity,Infinity];this.engine.shadowMap.needsUpdate=true;const underground=space==='mausoleum',section=space==='section';this.scene.background.set(underground?0x172535:section?0xc4d0ce:space==='senkai'?0xb9cece:0xb7c8ca);this.scene.fog.color.copy(this.scene.background);this.hemisphere.color.set(underground?0x829cae:0xc5dded);this.hemisphere.groundColor.set(underground?0x394559:0x8e8b75);this.hemisphere.intensity=underground?.68:1.85;this.ambient.color.set(underground?0xadc3d1:0xd4e2ec);this.ambient.intensity=underground?.42:.27;this.sun.intensity=underground?.18:section?1.4:space==='senkai'?2.5:2.8;this.sky.visible=!underground&&!section;this.localLights.forEach(l=>l.visible=underground);}
 active(m,space,opts){if(m.event==='summer-concert'&&opts.flowerEvent!==true)return false;const s=m.space||'surface';if(space==='section')return s==='section'||s==='mausoleum'&&!m.hideInSection||s==='surface'&&m.region==='myouren';return s===space&&(!m.ceiling||opts.ceiling!==false);}
 render(rig,opts={}){const T=this.T,space=opts.space||rig.space||'surface';this.setSpace(space);if(this.lastFlowerEvent!==opts.flowerEvent){this.lastFlowerEvent=opts.flowerEvent;this.engine.shadowMap.needsUpdate=true;this.mirrorLast=null;}if(this.lastVegetation!==opts.vegetation){this.engine.shadowMap.needsUpdate=true;this.mirrorLast=null;this.lastVegetation=opts.vegetation;}this.timeUniform.value=opts.motion===false?0:(opts.time||0);this.camera.position.fromArray(rig.eye);this.camera.lookAt(...rig.target);this.sky.position.copy(this.camera.position);
 const distance=G.length(G.sub(rig.eye,rig.target));
 this.scene.fog.near=Math.max(360,distance*.87);this.scene.fog.far=distance<650?2800:Math.max(4000,distance+5800);
 if(space==='surface'){
  let forest=G.BAMBOO.weight(rig.eye[0],rig.eye[2])*(1-G.smooth(22,52,rig.eye[1]-this.world.terrain.height(rig.eye[0],rig.eye[2])));
  if(distance>650)forest*=1-G.smooth(650,1100,distance);
  const courtyard=1-G.smooth(65,100,Math.max(Math.abs(rig.eye[0]-690),Math.abs(rig.eye[2]-1440)));forest*=1-courtyard*.58;
  this.bambooExposure=forest;this.hemisphere.intensity=G.mix(1.85,1.28,forest);this.sun.intensity=G.mix(2.8,1.75,forest);
  this.scene.fog.color.set(0xb7c8ca);if(opts.bambooHaze!==false){this.scene.fog.color.lerp(new T.Color(0x93aa9c),forest*.83);this.scene.fog.near=G.mix(this.scene.fog.near,38,forest);this.scene.fog.far=G.mix(this.scene.fog.far,360,forest);}
 }
 if(space==='surface'&&G.FLOWERLANDS){
  const fw=G.FLOWERLANDS,above=rig.eye[1]-this.world.terrain.height(rig.eye[0],rig.eye[2]);
  let hill=fw.influence('nameless',rig.eye[0],rig.eye[2])*(1-G.smooth(35,100,above));
  if(distance>800)hill*=1-G.smooth(800,1500,distance);
  this.hillExposure=hill;
  this.hemisphere.color.set(0xc5dded).lerp(new T.Color(0xc7e0d8),hill*.55);
  this.sun.color.set(0xffedcf).lerp(new T.Color(0xe7eef3),hill*.9);
  this.hemisphere.intensity=G.mix(this.hemisphere.intensity,1.40,hill);
  this.sun.intensity=G.mix(this.sun.intensity,1.15,hill);
  if(opts.bambooHaze!==false){this.scene.fog.color.lerp(new T.Color(0xb1c8bd),hill*.85);this.scene.fog.near=G.mix(this.scene.fog.near,105,hill);this.scene.fog.far=G.mix(this.scene.fog.far,720,hill);}
 }
 if(space!=='surface'){this.sun.color.set(0xffedcf);this.hillExposure=0;}
 if(space==='mausoleum'){this.scene.fog.near=85;this.scene.fog.far=270;}if(space==='senkai'){this.scene.fog.near=170;this.scene.fog.far=560;}if(space==='section'){this.scene.fog.near=900;this.scene.fog.far=2400;}for(const m of[this.water,this.caveWater,this.canalWater,this.lakeWater,this.windWater]){m.uniforms.uFogColor.value.copy(this.scene.fog.color);m.uniforms.uFogNear.value=this.scene.fog.near;m.uniforms.uFogFar.value=this.scene.fog.far;}
 const shadows=space!=='mausoleum'&&this.quality!=='low'&&distance<1300;if(this.sun.castShadow!==shadows){this.sun.castShadow=shadows;this.engine.shadowMap.needsUpdate=true;}
 if(shadows&&(G.length(G.sub(rig.target,this.sunAnchor))>18||Math.abs(distance-(this.shadowDistance||0))>25)){this.sunAnchor=rig.target.slice();this.shadowDistance=distance;const span=G.clamp(distance*.76,100,380),c=this.sun.shadow.camera;c.left=-span;c.right=span;c.top=span;c.bottom=-span;c.updateProjectionMatrix();this.sun.position.set(rig.target[0]-430,rig.target[1]+760,rig.target[2]+320);this.sun.target.position.fromArray(rig.target);this.engine.shadowMap.needsUpdate=true;}
 for(const item of this.objects){const m=item.data;if(m.motion?.kind==='ropeway'){const mm=m.motion,u=.5-.5*Math.cos(Math.PI*2*(this.timeUniform.value/240+mm.phase));item.mesh.position.fromArray(G.MOUNTAIN.cablePoint(mm.track,u,mm.lane));}const center=m.motion?item.mesh.position.toArray():m.center,dist=G.length(G.sub(rig.eye,center));item.mesh.visible=this.active(m,space,opts)&&!(m.maxDetailDistance&&dist-m.radius>m.maxDetailDistance)&&!(m.region==='mountain'&&m.group==='vegetation'&&distance<800&&dist-m.radius>800)&&!(m.flowerKind&&distance<600&&dist-m.radius>610)&&!(m.region==='bamboo'&&m.group==='vegetation'&&distance<650&&dist-m.radius>450)&&!(m.lod==='props'&&dist-m.radius>(this.quality==='high'?260:this.quality==='low'?60:140))&&!(opts.vegetation===false&&m.group==='vegetation')&&!(m.lod==='near'&&dist>(this.quality==='high'?320:this.quality==='low'?110:220));if(item.geos.length>1)item.mesh.geometry=item.geos[(this.quality==='low'||dist>(m.lodDistance||(m.local?260:1100)))?1:0];}
 for(const sign of this.signObjects)sign.visible=space==='section'?sign.userData.region==='myouren':sign.userData.atlasSpace===space;this.updateReflection(rig,opts);this.engine.render(this.scene,this.camera);const i=this.engine.info;this.stats={calls:i.render.calls,triangles:i.render.triangles,geometries:i.memory.geometries,textures:i.memory.textures,reflectionCalls:this.reflectionCalls||0,reflectionTriangles:this.reflectionTriangles||0};}
 info(){const gl=this.engine.getContext(),e=gl.getExtension('WEBGL_debug_renderer_info');return{backend:'three',revision:this.T.REVISION,driver:e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),webgl:gl.getParameter(gl.VERSION),quality:this.quality,space:this.activeSpace,stats:{...this.stats}};}
 dispose(){for(const g of this.cache.values())g.dispose();for(const i of this.objects)if(i.mesh.isInstancedMesh)i.mesh.dispose();for(const m of Object.values(this.mats))m.dispose();this.water.dispose();this.caveWater.dispose();this.canalWater.dispose();this.lakeWater.dispose();this.windWater.dispose();for(const m of this.signObjects){m.material.map.dispose();m.material.dispose();m.geometry.dispose();}this.reflectionTarget.dispose();this.sky.geometry.dispose();this.sky.material.dispose();this.engine.dispose();this.cache.clear();}
}
Object.assign(G,{loadThree,ThreeRenderer});})(globalThis.GA);

/* v0.13: spatial level of detail and bounded, lazy GPU residency.
 * No lossy edits to source meshes. Budget numbers are attribute bytes, NOT measured VRAM.
 */
(function(G){'use strict';
const Base=G.ThreeRenderer;
class AdaptiveRenderer extends Base{
 constructor(T,canvas,world){
  // Keep upstream materials, sky, water and signs; do not eagerly create every mesh.
  super(T,canvas,{...world,meshes:[]});this.world=world;
  this.records=world.meshes.map(data=>({data,item:null,lastUsed:-1,level:-1,wanted:false,shadowOnly:false}));
  this.recordMap=new Map(this.records.map(r=>[r.data.id,r]));
  this.clusterMap=new Map(world.hlod.clusters.map(c=>[c.id,{...c,near:null}]));
  this.indexByArray=new Map(world.meshes.filter(m=>m.index).map(m=>[m.vertices,m.index]));this.geometryRefs=new Map();this.objects=[];this.residentBytes=0;this.evictions=0;this.uploads=0;this.renderCount=0;this.lastSpace=null;
  this.attributeBudget=160*1048576;this.graceSeconds=6;this.cullTime=0;this.contextLost=false;this.hasVisibleAnimation=false;
  this.cutUniform={value:0};this.mistUniform={value:1};this.coverUniform={value:1};
  for(const [k,col]of [['fieldSunProxy',0xffffff],['fieldLilyProxy',0xffffff]])this.mats[k]=new T.MeshStandardMaterial({color:col,vertexColors:true,roughness:.98,side:T.DoubleSide});
  this.patchMaterials();
  this.engine.shadowMap.type=T.PCFSoftShadowMap;this.sun.shadow.camera.layers.enable(2);this.sun.shadow.normalBias=.13;this.sun.shadow.bias=-.00009;
  this.engine.info.autoReset=false;
  canvas.addEventListener('webglcontextlost',()=>{this.contextLost=true;});canvas.addEventListener('webglcontextrestored',()=>{this.contextLost=false;this.mirrorLast=null;this.engine.shadowMap.needsUpdate=true;});
 }
 patchMaterials(){const T=this.T;
  for(const[k,mat]of Object.entries(this.mats)){
   if(['roof','timber','matte','brick','templeStone','templePaving','paving'].includes(k))mat.roughness=({roof:.64,timber:.80,matte:.88,brick:.92,templeStone:.87,templePaving:.83,paving:.91})[k];
   const prev=mat.onBeforeCompile,oldKey=mat.customProgramCacheKey?.bind(mat);
   mat.onBeforeCompile=(s,r)=>{prev?.call(mat,s,r);s.uniforms.uAtlasCut=this.cutUniform;s.uniforms.uSpatialMist=this.mistUniform;s.uniforms.uSpatialCover=this.coverUniform;
    s.vertexShader='varying vec3 vAtlasPosition;\n'+s.vertexShader;
    s.vertexShader=s.vertexShader.replace('#include <project_vertex>',`vec4 atlasP=vec4(transformed,1.);
#ifdef USE_INSTANCING
 atlasP=instanceMatrix*atlasP;
#endif
 vAtlasPosition=(modelMatrix*atlasP).xyz;
#include <project_vertex>`);
    s.fragmentShader=`varying vec3 vAtlasPosition; uniform float uAtlasCut; uniform float uSpatialMist; uniform float uSpatialCover;
float atlasBamboo(vec3 p){vec2 v=(p.xz-vec2(500.,1220.))/vec2(548.,505.);float w=(1.-smoothstep(.7,1.12,length(v)))*(1.-smoothstep(96.,133.,p.y));float yard=1.-smoothstep(70.,115.,length(p.xz-vec2(690.,1440.)));return w*(1.-yard*.9);}
float atlasHill(vec3 p){return (1.-smoothstep(.65,1.14,length((p.xz-vec2(-1330.,1050.))/vec2(245.,206.))))*(1.-smoothstep(260.,315.,p.y));}
`+s.fragmentShader;
    s.fragmentShader=s.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
 if(uAtlasCut>0.5){vec2 d=abs((vAtlasPosition.xz-vec2(770.,546.))/vec2(211.,167.));if(pow(d.x,4.)+pow(d.y,4.)<1. && vAtlasPosition.y>25.) discard;}`);
    s.fragmentShader=s.fragmentShader.replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
 float localCover=atlasBamboo(vAtlasPosition)*uSpatialCover;
 reflectedLight.indirectDiffuse*=1.-localCover*.29;
 reflectedLight.directDiffuse*=1.-localCover*.22;
`);
    s.fragmentShader=s.fragmentShader.replace('#include <fog_fragment>',`#include <fog_fragment>
 if(uSpatialMist>.5){vec3 delta=vAtlasPosition-cameraPosition;
 vec3 p1=cameraPosition+delta*.2,p2=cameraPosition+delta*.5,p3=cameraPosition+delta*.8;
 float bambooFog=(atlasBamboo(p1)+atlasBamboo(p2)+atlasBamboo(p3))/3.;
 float hillFog=(atlasHill(p1)+atlasHill(p2)+atlasHill(p3))/3.;
 float fogAmount=1.-exp(-length(delta)*(bambooFog*.0020+hillFog*.00065));
 gl_FragColor.rgb=mix(gl_FragColor.rgb,vec3(.56,.64,.60),min(.60,fogAmount));}
`);
    if(k==='fieldSunProxy'||k==='fieldLilyProxy'){
     const body=k==='fieldSunProxy'?`vec2 uv=vAtlasPosition.xz*.92;vec2 cell=floor(uv);float jitter=fract(sin(dot(cell,vec2(12.9898,78.233)))*43758.5453);vec2 q=fract(uv)-.5;float disc=1.-smoothstep(.23,.43,length(q+vec2(jitter-.5)*.21));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.70,.43,.018),disc*.73);`:`vec2 q=fract(vAtlasPosition.xz*1.6)-.5;float bell=1.-smoothstep(.075,.16,length(q));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.69,.75,.58),bell*.53);`;
     s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n'+body);
    }
   };
   mat.customProgramCacheKey=()=> 'v013-spatial-'+k+'-'+(oldKey?oldKey():'');
  }
 }
 setQuality(q){super.setQuality(q);this.attributeBudget=({low:80,balanced:160,high:256}[q]||160)*1048576;}
 acquire(a){let r=this.geometryRefs.get(a);if(!r){const geo=this.geometry(a),index=this.indexByArray.get(a);if(index)geo.setIndex(new this.T.BufferAttribute(index,1));r={geo,refs:0,bytes:a.byteLength+(index?.byteLength||0)};this.geometryRefs.set(a,r);this.residentBytes+=r.bytes;}r.refs++;return r.geo;}
 release(a){let r=this.geometryRefs.get(a);if(!r)return;if(--r.refs===0){r.geo.dispose();this.geometryRefs.delete(a);this.cache.delete(a);this.residentBytes-=r.bytes;}}
 material(m){if(m.space==='atlas'){if(!this.cutShellMaterial)this.cutShellMaterial=new this.T.MeshStandardMaterial({vertexColors:true,roughness:1,side:this.T.DoubleSide});return this.cutShellMaterial;}return m.group==='water'?(m.id==='village-canal-water'?this.canalWater:m.id==='mist_lake-water'?this.lakeWater:m.id==='wind_lake-water'?this.windWater:m.space==='mausoleum'?this.caveWater:this.water):this.mats[m.material]||this.mats.matte;}
 levelFor(r,dist){const m=r.data;if(!m.farVertices||m.hlodProxy)return 0;let threshold=m.flowerKind?(m.lodDistance||45):m.region==='bamboo'?105:(m.lodDistance||230);threshold*=this.quality==='high'?1.3:this.quality==='low'?.68:1;const far=(dist>threshold*(r.level===0?1.12:.88));return far?1:0;}
 ensure(r,level){const T=this.T,m=r.data,a=level?m.farVertices:m.vertices;
  if(!r.item){const geo=this.acquire(a),mat=this.material(m);let mesh;
   if(m.instances){mesh=new T.InstancedMesh(geo,mat,m.instances.length/16);mesh.instanceMatrix=new T.InstancedBufferAttribute(m.instances,16);mesh.instanceColor=new T.InstancedBufferAttribute(m.instanceColors,3);mesh.computeBoundingSphere();this.residentBytes+=m.instances.byteLength+m.instanceColors.byteLength;}
   else mesh=new T.Mesh(geo,mat);
   mesh.name=m.id;mesh.frustumCulled=true;mesh.receiveShadow=m.group!=='water'&&m.material!=='bambooStem';mesh.castShadow=m.group!=='effects'&&m.group!=='water'&&m.group!=='roads'&&m.lod!=='near'&&m.lod!=='props';
   if(m.group==='terrain')mesh.castShadow=!!m.hlodProxy;if(m.flowerKind||m.material==='fieldLilyProxy'||m.material==='fieldSunProxy')mesh.castShadow=false;
   mesh.userData.locationId=m.locationId||null;this.scene.add(mesh);r.item={mesh,geos:[geo],data:m};r.level=level;r.array=a;this.objects.push(r.item);this.uploads++;this.engine.shadowMap.needsUpdate=true;
  }else if(r.level!==level){const geo=this.acquire(a);this.release(r.array);r.item.mesh.geometry=geo;r.item.geos=[geo];r.array=a;r.level=level;this.engine.shadowMap.needsUpdate=true;}
  return r.item.mesh;
 }
 evict(r){if(!r.item)return;const m=r.data;this.scene.remove(r.item.mesh);if(r.item.mesh.isInstancedMesh){r.item.mesh.dispose();this.residentBytes-=m.instances.byteLength+m.instanceColors.byteLength;}this.release(r.array);const i=this.objects.indexOf(r.item);if(i>=0)this.objects.splice(i,1);r.item=null;r.array=null;r.level=-1;this.evictions++;}
 trim(force=false){let n=0;const now=performance.now()/1000;const unused=this.records.filter(r=>r.item&&!r.wanted).sort((a,b)=>a.lastUsed-b.lastUsed);for(const r of unused){if(force||now-r.lastUsed>this.graceSeconds||this.residentBytes>this.attributeBudget){this.evict(r);n++;}}return n;}
 active(m,space,opts){
  if(m.event==='summer-concert'&&opts.flowerEvent!==true)return false;const s=m.space||'surface';
  if(space==='atlas')return s==='surface'||s==='atlas'||s==='mausoleum'&&!m.ceiling&&!m.hideInSection;
  return super.active(m,space,opts);
 }
 clusters(eye,opts){for(const c of this.clusterMap.values()){
  const dist=G.length(G.sub(eye,c.center))-c.radius;
  const threshold=c.range*(this.quality==='low'?.76:this.quality==='high'?1.18:1);
  c.near=dist<threshold*(c.near===true?1.12:c.near===false?.88:1);
 }}
 plan(r,rig,opts,distance){const m=r.data,space=opts.space||'surface';if(!this.active(m,space,opts))return false;
  if(opts.vegetation===false&&m.group==='vegetation')return false;
  const c=this.clusterMap.get(m.hlodGroup);if(c&&(c.near?m.hlodProxy:!m.hlodProxy))return false;
  let p=m.center;if(space==='atlas'&&m.space==='mausoleum')p=[p[0]+460,p[1],p[2]];
  if(m.motion?.kind==='ropeway')p=G.MOUNTAIN.cablePoint(m.motion.track,.5-.5*Math.cos(Math.PI*2*(this.timeUniform.value/240+m.motion.phase)),m.motion.lane);
  const dist=Math.max(0,G.length(G.sub(rig.eye,p))-m.radius);r.distance=dist;r.displayCenter=p;
  if(m.lod==='props'&&dist>({low:55,balanced:125,high:210}[this.quality]))return false;
  if(m.lod==='near'&&dist>({low:90,balanced:190,high:280}[this.quality]))return false;
  if(m.maxDetailDistance&&dist>m.maxDetailDistance)return false;
  return G.visibleSphere(rig.planes,p,m.radius+18);
 }
 updateReflection(rig,opts){
  if((opts.space||'surface')==='atlas'){for(const m of [this.canalWater,this.lakeWater,this.windWater])m.uniforms.uReflect.value=0;this.reflectionCalls=0;this.reflectionTriangles=0;return;}
  // Rebuild at most 12 Hz while moving; static reflection is reused. Vegetation changes invalidate it.
  const now=performance.now();if(this.mirrorLast&&now-(this.reflectionAt||0)<83){this.reflectionCalls=0;this.reflectionTriangles=0;return;}
  this.engine.info.reset();super.updateReflection(rig,opts);if(this.reflectionCalls)this.reflectionAt=now;
 }
 atmosphere(rig,opts,distance){const T=this.T,space=opts.space||'surface';this.setSpace(space);const day=space==='surface'||space==='atlas';
  if(day){this.hemisphere.color.set(0xc5dded);this.hemisphere.groundColor.set(0x8e8b75);this.hemisphere.intensity=1.15;this.ambient.color.set(0xd4e2ec);this.ambient.intensity=.15;this.sun.color.set(0xffedcf);this.sun.intensity=2.65;this.scene.background.set(0xb7c8ca);this.scene.fog.color.set(0xb7c8ca);this.scene.fog.near=1800;this.scene.fog.far=15500;this.sky.visible=true;}
  else {this.scene.fog.near=space==='mausoleum'?85:space==='section'?900:170;this.scene.fog.far=space==='mausoleum'?270:space==='section'?2400:560;}
  this.bambooExposure=0;this.hillExposure=0;this.coverUniform.value=day?1:0;this.mistUniform.value=day&&opts.bambooHaze!==false?1:0;this.cutUniform.value=space==='atlas'?1:0;
  for(let i=0;i<this.localLights.length;i++){let l=this.localLights[i],a=this.world.expansion.mausoleum.lights[i];l.position.set(a[0]+(space==='atlas'?460:0),a[1],a[2]);l.visible=space==='mausoleum'||space==='atlas';}
  for(const m of [this.water,this.caveWater,this.canalWater,this.lakeWater,this.windWater]){m.uniforms.uFogColor.value.copy(this.scene.fog.color);m.uniforms.uFogNear.value=this.scene.fog.near;m.uniforms.uFogFar.value=this.scene.fog.far;}
 }
 render(rig,opts={}){
  if(this.contextLost)return;const start=performance.now(),space=opts.space||rig.space||'surface',prevSpace=this.lastSpace;opts={...opts,space};const now=start/1000;
  // Application owns the paused simulation clock. Do not reset to phase zero on pause.
  if(Number.isFinite(opts.time))this.timeUniform.value=opts.time;
  this.camera.position.fromArray(rig.eye);this.camera.lookAt(...rig.target);this.camera.updateMatrixWorld();this.sky.position.copy(this.camera.position);
  const distance=G.length(G.sub(rig.eye,rig.target));this.atmosphere(rig,opts,distance);this.clusters(rig.eye,opts);
  if(this.lastVegetation!==opts.vegetation||this.lastFlowerEvent!==opts.flowerEvent||prevSpace!==space){this.mirrorLast=null;this.engine.shadowMap.needsUpdate=true;this.lastVegetation=opts.vegetation;this.lastFlowerEvent=opts.flowerEvent;}
  const shadows=space!=='mausoleum'&&this.quality!=='low'&&distance<1500;
  if(this.sun.castShadow!==shadows){this.sun.castShadow=shadows;this.engine.shadowMap.needsUpdate=true;}
  if(shadows&&(G.length(G.sub(rig.target,this.sunAnchor))>12||Math.abs(distance-(this.shadowDistance||0))>30)){
   this.sunAnchor=rig.target.slice();this.shadowDistance=distance;const p=rig.target.map(v=>Math.round(v/4)*4),span=G.clamp(distance*.76,90,360),c=this.sun.shadow.camera;c.left=-span;c.right=span;c.top=span;c.bottom=-span;c.far=2200;c.updateProjectionMatrix();this.sun.position.set(p[0]-430,p[1]+760,p[2]+320);this.sun.target.position.fromArray(p);this.engine.shadowMap.needsUpdate=true;
  }
  let proxies=0,detail=0,shadowCount=0;this.hasVisibleAnimation=false;
  for(const r of this.records){const oldRole=r.shadowOnly;r.shadowOnly=false;let yes=this.plan(r,rig,opts,distance);
   const m=r.data;
   // A coarse terrain proxy may cast a shadow while the fine surface is displayed.
   if(!yes&&shadows&&(space==='surface'||space==='atlas')&&m.hlodProxy&&m.group==='terrain'&&G.length(G.sub(rig.target,m.center))-m.radius<430){yes=true;r.shadowOnly=true;}
   if(r.item&&(r.item.mesh.visible!==yes||oldRole!==r.shadowOnly)&&r.item.mesh.castShadow)this.engine.shadowMap.needsUpdate=true;r.wanted=yes;if(!yes){if(r.item)r.item.mesh.visible=false;continue;}
   const mesh=this.ensure(r,this.levelFor(r,G.length(G.sub(rig.eye,r.displayCenter||m.center))));mesh.visible=true;mesh.layers.set(r.shadowOnly?2:0);r.lastUsed=now;
   mesh.position.set(space==='atlas'&&m.space==='mausoleum'?460:0,r.shadowOnly?-24:0,0);
   if(m.motion?.kind==='ropeway'){const a=m.motion,u=.5-.5*Math.cos(Math.PI*2*(this.timeUniform.value/240+a.phase));mesh.position.fromArray(G.MOUNTAIN.cablePoint(a.track,u,a.lane));}
   if(r.shadowOnly)shadowCount++;else {if(m.hlodProxy)proxies++;else detail++;if(m.motion||m.group==='water'||m.group==='effects'||!m.hlodProxy&&['bambooLeaf','sunflowerPetal','lilyFlower','meadowLeaf'].includes(m.material))this.hasVisibleAnimation=true;}
  }
  for(const sign of this.signObjects){const s=sign.userData.atlasSpace,region=sign.userData.region;sign.visible=(space==='surface'?s==='surface':space==='atlas'?s==='surface':space==='section'?region==='myouren':s===space)&&G.length(G.sub(rig.eye,sign.position.toArray()))<900;}
  // Whole-world/diagram thumbnails need no continuous leaf/water updates.
  if(distance>1900)this.hasVisibleAnimation=false;
  if(prevSpace&&prevSpace!==space)this.trim(true);else this.trim(false);this.lastSpace=space;
  this.updateReflection(rig,opts);this.engine.info.reset();this.engine.render(this.scene,this.camera);const i=this.engine.info;
  this.renderCount++;
  this.stats={calls:i.render.calls,triangles:i.render.triangles,geometries:i.memory.geometries,textures:i.memory.textures,reflectionCalls:this.reflectionCalls||0,reflectionTriangles:this.reflectionTriangles||0,submittedCPUms:performance.now()-start,residentObjects:this.objects.length,residentAttributeMiB:this.residentBytes/1048576,budgetMiB:this.attributeBudget/1048576,proxyDrawObjects:proxies,detailDrawObjects:detail,terrainShadowProxies:shadowCount,totalSourceRecords:this.world.hlod.sourceCount,evictions:this.evictions,uploads:this.uploads,renderCount:this.renderCount};
 }
 info(){const result=super.info();result.stats={...result.stats,residentObjects:this.objects.length,residentAttributeMiB:this.residentBytes/1048576,evictions:this.evictions};return result;}
 dispose(){for(const r of this.records)this.evict(r);this.cutShellMaterial?.dispose();super.dispose();}
}
G.ThreeRenderer=AdaptiveRenderer;
})(globalThis.GA);

/* v0.14: dry diorama rendering, explicit display transforms, HDR output once,
 * optional quarter-resolution bloom, and bounded detail CPU/GPU ownership. */
(function(G){'use strict';const Adaptive=G.ThreeRenderer,Legacy=Object.getPrototypeOf(Adaptive.prototype);
class DioramaRenderer extends Adaptive{
 constructor(T,canvas,world){super(T,canvas,{...world,meshes:[],hlod:{clusters:[],sourceCount:0},signs:[]});this.world=world;this.packs=new Map();this.indexByArray=new Map();this.records=[];this.recordMap=new Map();this.objects=[];this.style='dusk';this.detailOwner=null;
  this.addRecords(world.meshes,'overview');this.cutUniform.value=0;this.coverUniform.value=0;this.mistUniform.value=0;
  const mat=(name,roughness,extras={})=>{const m=new T.MeshStandardMaterial({vertexColors:true,roughness,metalness:0,side:T.DoubleSide,...extras});m.name=name;this.mats[name]=m;return m;};
  mat('cutEarth',.96);mat('plinth',.73);mat('shrineMoss',.96);mat('shrineStone',.84);mat('shrineWood',.64);mat('shrineRoof',.48,{metalness:.04});mat('shrineLacquer',.46);mat('shrineGold',.45,{metalness:.45});mat('shrinePlaster',.90);mat('shrinePaper',.92,{emissive:new T.Color(0xe4b976),emissiveIntensity:.20});mat('shrineLight',.77,{emissive:new T.Color(0xffc88b),emissiveIntensity:3.2});mat('forestPaper',.90,{emissive:new T.Color(0xe0bd7f),emissiveIntensity:.16});const leaf=mat('forestLeaf',.84);
  leaf.onBeforeCompile=s=>{s.uniforms.uWind=this.timeUniform;s.vertexShader='uniform float uWind;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\nvec3 phaseP=position;\n#ifdef USE_INSTANCING\nphaseP=(instanceMatrix*vec4(position,1.)).xyz;\n#endif\nfloat sway=smoothstep(4.,22.,position.y)*.16;transformed.x+=sin(uWind*.64+phaseP.x*.051+phaseP.z*.030)*sway;transformed.z+=cos(uWind*.53+phaseP.z*.047)*sway*.5;`);};leaf.customProgramCacheKey=()=> 'forest-leaf-v014';
  // Contact darkening is an explicitly artistic ground approximation, not baked GI.
  const ground=this.mats.ground,prior=ground.onBeforeCompile;ground.onBeforeCompile=(s,r)=>{prior?.call(ground,s,r);s.fragmentShader=s.fragmentShader.replace('#include <lights_fragment_end>',`#include <lights_fragment_end>\nvec2 hp=vAtlasPosition.xz-vec2(1630.,160.);vec2 hd=max(abs(hp)-vec2(10.,13.),vec2(0.));float contact=exp(-dot(hd,hd)/8.)*step(178.,vAtlasPosition.y)*step(vAtlasPosition.y,180.5);reflectedLight.indirectDiffuse*=1.-contact*.18;`);};ground.customProgramCacheKey=()=> 'ground-contact-v014';
  this.rim=new T.DirectionalLight(0xb5d8ff,1.35);this.rim.position.set(1,2,-2);this.scene.add(this.rim,this.rim.target);
  this.focusLamps=[];for(let i=0;i<4;i++){let l=new T.PointLight(0xffc580,0,35,2);l.castShadow=false;this.focusLamps.push(l);this.scene.add(l);}
  this.makeStudioEnvironment();this.setupPost();
  this.engine.shadowMap.type=T.PCFShadowMap;this.sun.shadow.camera.layers.set(0);this.sun.shadow.normalBias=.055;this.sun.shadow.bias=-.00010;
 }
 addRecords(meshes,pack){for(const data of meshes){if(this.recordMap.has(data.id))throw new Error('重复模型ID '+data.id);const r={data,item:null,lastUsed:-1,level:-1,wanted:false,shadowOnly:false,pack};this.records.push(r);this.recordMap.set(data.id,r);if(data.index)this.indexByArray.set(data.vertices,data.index);}}
 attachPack(p){this.dropPack(p.id);this.addRecords(p.meshes,p.id);this.packs.set(p.id,p);const before=this.signObjects;super.makeSigns(p.signs||[]);for(let s of this.signObjects){s.userData.owner=p.id;s.userData.logicalPosition=s.position.toArray();}this.signObjects=[...before,...this.signObjects];this.engine.shadowMap.needsUpdate=true;this.mirrorLast=null;}
 dropPack(id){if(!this.packs.has(id))return;for(const r of this.records)if(r.pack===id){this.evict(r);this.recordMap.delete(r.data.id);this.indexByArray.delete(r.data.vertices);}this.records=this.records.filter(r=>r.pack!==id);for(const s of this.signObjects.filter(s=>s.userData.owner===id)){this.scene.remove(s);s.material.map?.dispose();s.material.dispose();s.geometry.dispose();}this.signObjects=this.signObjects.filter(s=>s.userData.owner!==id);this.packs.delete(id);this.mirrorLast=null;this.engine.renderLists.dispose();}
 material(m){return m.group==='water'?(m.space==='mausoleum'?this.caveWater:m.id.includes('village-canal-water')?this.canalWater:m.id.includes('mist_lake-water')?this.lakeWater:m.id.includes('wind_lake-water')?this.windWater:this.water):(this.mats[m.material]||this.mats.matte);}
 makeStudioEnvironment(){const T=this.T;this.environmentReport={type:'procedural studio panels; no external HDR'};let s=new T.Scene(),box=new T.Mesh(new T.BoxGeometry(12,12,12),new T.MeshBasicMaterial({color:0x333b48,side:T.BackSide}));s.add(box);const add=(w,h,x,y,z,col)=>{let m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:new T.Color().setRGB(...col),side:T.DoubleSide}));m.position.set(x,y,z);m.lookAt(0,0,0);s.add(m);};add(6,5,-4,4,2,[3.8,3.45,2.95]);add(5,3,4,2,-4,[1.1,1.65,2.5]);add(4,4,1,5,-1,[2,2.15,2.4]);const pm=new T.PMREMGenerator(this.engine);this.studioEnv=pm.fromScene(s,.08,.1,30,{size:64});this.scene.environment=this.studioEnv.texture;for(const m of Object.values(this.mats))m.envMapIntensity=.25;pm.dispose();s.traverse(o=>{o.geometry?.dispose();if(o.material)o.material.dispose();});}
 setupPost(){const T=this.T;this.hdrSupported=!!this.engine.extensions.get('EXT_color_buffer_float');const type=this.hdrSupported?T.HalfFloatType:T.UnsignedByteType;this.sceneTarget=new T.WebGLRenderTarget(16,16,{type,depthBuffer:true});this.sceneTarget.depthTexture=new T.DepthTexture(16,16,T.UnsignedIntType);this.sceneTarget.depthTexture.format=T.DepthFormat;this.aoTarget=new T.WebGLRenderTarget(8,8,{depthBuffer:false});this.blurA=new T.WebGLRenderTarget(8,8,{type,depthBuffer:false});this.blurB=new T.WebGLRenderTarget(8,8,{type,depthBuffer:false});
  this.postScene=new T.Scene();this.postCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);const vertex=`varying vec2 uvP; void main(){uvP=uv;gl_Position=vec4(position.xy,0.,1.);}`;
  this.aoMat=new T.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,uniforms:{depth:{value:this.sceneTarget.depthTexture},inverseProjection:{value:new T.Matrix4()},resolution:{value:new T.Vector2(16,16)},depthResolution:{value:new T.Vector2(16,16)},projectionScale:{value:1},worldRadius:{value:2.1}},vertexShader:vertex,fragmentShader:`precision highp float;varying vec2 uvP;uniform sampler2D depth;uniform mat4 inverseProjection;uniform vec2 resolution;uniform vec2 depthResolution;uniform float projectionScale;uniform float worldRadius;
vec3 positionAt(vec2 uv){ivec2 pixel=clamp(ivec2(floor(uv*depthResolution)),ivec2(0),ivec2(depthResolution)-ivec2(1));vec2 center=(vec2(pixel)+.5)/depthResolution;float d=texelFetch(depth,pixel,0).r;vec4 p=inverseProjection*vec4(center*2.-1.,d*2.-1.,1.);return p.xyz/p.w;}
void main(){float d=texture2D(depth,uvP).r;if(d>.999995){gl_FragColor=vec4(1.);return;}vec3 p=positionAt(uvP);vec3 n=normalize(cross(dFdx(p),dFdy(p)));if(n.z<0.)n=-n;float radius=clamp(worldRadius*projectionScale*resolution.y/max(1.,-p.z)*.5,2.,70.);float phase=fract(sin(dot(floor(uvP*resolution),vec2(12.9898,78.233)))*43758.5453)*6.283185;float oc=0.;for(int i=0;i<12;i++){float t=(float(i)+.5)/12.;float a=float(i)*2.399963+phase;vec2 uv=uvP+vec2(cos(a),sin(a))*sqrt(t)*radius/resolution;vec3 q=positionAt(clamp(uv,vec2(.001),vec2(.999)));vec3 v=q-p;float len=length(v);float blocked=max(dot(n,v/max(len,.001))-.065,0.);oc+=blocked*(1.-smoothstep(worldRadius*.2,worldRadius*1.4,len));}float ao=clamp(1.-oc*.145,.50,1.);gl_FragColor=vec4(vec3(ao),1.);}`});
  this.brightMat=new T.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,uniforms:{tex:{value:this.sceneTarget.texture},threshold:{value:1.25}},vertexShader:vertex,fragmentShader:`precision highp float;varying vec2 uvP;uniform sampler2D tex;uniform float threshold;void main(){vec3 c=texture2D(tex,uvP).rgb;float b=max(c.r,max(c.g,c.b));gl_FragColor=vec4(c*smoothstep(threshold,threshold+.7,b),1.);}`});
  this.blurMat=new T.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,uniforms:{tex:{value:null},dir:{value:new T.Vector2()}},vertexShader:vertex,fragmentShader:`precision highp float;varying vec2 uvP;uniform sampler2D tex;uniform vec2 dir;void main(){vec3 c=texture2D(tex,uvP).rgb*.227027;c+=texture2D(tex,uvP+dir*1.384615).rgb*.316216;c+=texture2D(tex,uvP-dir*1.384615).rgb*.316216;c+=texture2D(tex,uvP+dir*3.230769).rgb*.070270;c+=texture2D(tex,uvP-dir*3.230769).rgb*.070270;gl_FragColor=vec4(c,1.);}`});
  this.outputMat=new T.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,uniforms:{tex:{value:this.sceneTarget.texture},bloomTex:{value:this.blurA.texture},strength:{value:0},aoTex:{value:this.aoTarget.texture},aoEnabled:{value:0},aoTexel:{value:new T.Vector2()},exposure:{value:1}},vertexShader:vertex,fragmentShader:`precision highp float;varying vec2 uvP;uniform sampler2D tex;uniform sampler2D bloomTex;uniform float strength;uniform sampler2D aoTex;uniform float aoEnabled;uniform vec2 aoTexel;uniform float exposure;vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}vec3 srgb(vec3 x){return mix(x*12.92,1.055*pow(max(x,vec3(0.)),vec3(1./2.4))-.055,step(vec3(.0031308),x));}void main(){float ao=1.;if(aoEnabled>.5){ao=(texture2D(aoTex,uvP).r*2.+texture2D(aoTex,uvP+aoTexel).r+texture2D(aoTex,uvP-aoTexel).r+texture2D(aoTex,uvP+vec2(aoTexel.x,-aoTexel.y)).r+texture2D(aoTex,uvP+vec2(-aoTexel.x,aoTexel.y)).r)/6.;}vec3 c=texture2D(tex,uvP).rgb*ao+texture2D(bloomTex,uvP).rgb*strength;c=aces(c*exposure);float vig=1.-.055*pow(length(uvP-.5)*1.414,2.);gl_FragColor=vec4(srgb(c)*vig,1.);}`});
  this.quad=new T.Mesh(new T.PlaneGeometry(2,2),this.outputMat);this.postScene.add(this.quad);this.engine.toneMapping=T.NoToneMapping;
 }
 setSize(w,h,dpr=1){super.setSize(w,h,dpr);if(!this.sceneTarget)return;const pw=Math.round(w*this.engine.getPixelRatio()),ph=Math.round(h*this.engine.getPixelRatio());this.sceneTarget.setSize(pw,ph);this.aoTarget.setSize(Math.max(1,pw>>1),Math.max(1,ph>>1));this.aoMat.uniforms.resolution.value.set(pw>>1,ph>>1);this.aoMat.uniforms.depthResolution.value.set(pw,ph);this.outputMat.uniforms.aoTexel.value.set(1/this.aoTarget.width,1/this.aoTarget.height);this.sceneTarget.samples=this.quality==='low'?0:2;this.blurA.setSize(Math.max(1,pw>>2),Math.max(1,ph>>2));this.blurB.setSize(Math.max(1,pw>>2),Math.max(1,ph>>2));}
 post(enabled,exposure){const T=this.T;let passes=1;const ao=this.currentOptions.ao!==false&&this.quality!=='low'&&this.currentOptions.displayMode!=='atlas';this.outputMat.uniforms.aoEnabled.value=ao?1:0;if(ao){this.aoMat.uniforms.inverseProjection.value.copy(this.camera.projectionMatrixInverse);this.aoMat.uniforms.projectionScale.value=this.camera.projectionMatrix.elements[5];this.quad.material=this.aoMat;this.engine.setRenderTarget(this.aoTarget);this.engine.render(this.postScene,this.postCamera);passes++;}
 if(enabled){this.quad.material=this.brightMat;this.engine.setRenderTarget(this.blurA);this.engine.render(this.postScene,this.postCamera);this.quad.material=this.blurMat;this.blurMat.uniforms.tex.value=this.blurA.texture;this.blurMat.uniforms.dir.value.set(1/this.blurA.width,0);this.engine.setRenderTarget(this.blurB);this.engine.render(this.postScene,this.postCamera);this.blurMat.uniforms.tex.value=this.blurB.texture;this.blurMat.uniforms.dir.value.set(0,1/this.blurA.height);this.engine.setRenderTarget(this.blurA);this.engine.render(this.postScene,this.postCamera);passes+=3;}
 this.quad.material=this.outputMat;this.outputMat.uniforms.strength.value=enabled?.20:0;this.outputMat.uniforms.exposure.value=exposure;this.engine.setRenderTarget(null);this.engine.render(this.postScene,this.postCamera);return passes;
 }
 lighting(rig,opts,distance){const T=this.T,atlas=opts.displayMode==='atlas',cont=opts.displayMode==='continuous',underground=opts.space==='mausoleum'&&!atlas,section=opts.space==='section',dusk=opts.lighting!=='neutral';
 this.activeSpace=underground?'mausoleum':opts.space==='senkai'?'senkai':'surface';this.sky.visible=cont;
 this.scene.background.set(cont?0xb7c8ca:underground?0x111b26:0x111a2a);this.scene.fog.color.copy(this.scene.background);this.scene.fog.near=cont?1800:underground?130:9000;this.scene.fog.far=cont?15500:underground?430:18000;
 this.hemisphere.color.set(dusk?0xb8cfee:0xd0dfed);this.hemisphere.groundColor.set(0x756a59);this.hemisphere.intensity=underground?.52:dusk?.20:.88;this.ambient.color.set(0xd4d9e3);this.ambient.intensity=underground?.34:.035;
 this.sun.color.set(dusk?0xd6deff:0xffeac6);this.sun.intensity=underground?.13:dusk?.62:1.85;this.rim.color.set(dusk?0x95c7ef:0xd4e6ef);this.rim.intensity=underground?0:dusk?.55:.75;
 const focus=opts.focus||'hakurei';for(const m of Object.values(this.mats))m.envMapIntensity=underground?.05:dusk?.05:.23;this.mats.shrineLight.emissiveIntensity=dusk?3.8:.25;this.mats.shrinePaper.emissiveIntensity=dusk?.32:.02;this.mats.forestPaper.emissiveIntensity=dusk?.18:.025;
 const aim=rig.target;this.rim.position.set(aim[0]+240,aim[1]+290,aim[2]-190);this.rim.target.position.fromArray(aim);
 const lp=[[1620,185.4,153],[1620,185.4,167],[1593,184,181],[1569,186,165]];for(let i=0;i<4;i++){let l=this.focusLamps[i];l.position.fromArray(lp[i]);l.intensity=dusk?130:0;l.visible=focus==='hakurei'&&!atlas&&!cont;}
 for(let i=0;i<this.localLights.length;i++){let l=this.localLights[i],p=this.world.expansion.mausoleum.lights[i];const xf=G.DIORAMA.transform('mausoleum',atlas?'atlas':'focus',opts.aligned);l.position.fromArray(p.slice(0,3).map((v,j)=>v*xf.scale+xf.offset[j]));l.distance=p[5]*xf.scale;l.intensity=p[4]*xf.scale*xf.scale;l.visible=underground||atlas||section;}
 this.coverUniform.value=cont?1:0;this.mistUniform.value=cont&&opts.bambooHaze!==false?1:0;this.cutUniform.value=0;
 for(const m of [this.water,this.caveWater,this.canalWater,this.lakeWater,this.windWater]){m.uniforms.uFogColor.value.copy(this.scene.fog.color);m.uniforms.uFogNear.value=this.scene.fog.near;m.uniforms.uFogFar.value=this.scene.fog.far;}
 }
 wanted(r,rig,opts,distance){const m=r.data;if(m.legacyBackdrop)return false;const atlas=opts.displayMode==='atlas',continuous=opts.displayMode==='continuous',focus=opts.focus;
 if(continuous&&m.component==='terrain'&&!m.continuousOnly)return false;if(m.continuousOnly)return continuous&&(opts.space||'surface')==='surface';if(m.displayOnly&&continuous)return false;if(m.event==='summer-concert'&&!opts.flowerEvent)return false;if(!opts.vegetation&&m.group==='vegetation')return false;
 if(atlas){if(!m.overview&&!m.displayOnly)return false;if(m.owner==='continuous')return false;if(m.ceiling)return false;}
 else if(opts.space==='section'){if(!['myouren','mausoleum'].includes(m.owner))return false;if(m.component==='terrain'||m.displayOnly||m.ceiling||m.hideInSection)return false;if(m.overview===this.packs.has(m.owner))return false;}
 else{
  if(continuous){if((m.space||'surface')!=='surface')return false;if(m.owner!==focus&&!m.overview&&!m.displayOnly)return false;}
  else if(m.owner!==focus)return false;
  const detailed=this.packs.has(m.owner)&&m.owner===focus&&distance<1900;
  if(!m.displayOnly){if(m.overview&&detailed&&m.owner!=='continuous')return false;if(!m.overview&&!detailed)return false;}
  if(m.ceiling&&opts.ceiling===false)return false;
 }
 let center=m.center,xf=G.DIORAMA.transform(m.owner,atlas?'atlas':'focus',opts.aligned);center=center.map((v,i)=>v*xf.scale+xf.offset[i]);if(m.motion?.kind==='ropeway')center=G.MOUNTAIN.cablePoint(m.motion.track,.5-.5*Math.cos(Math.PI*2*(this.timeUniform.value/240+m.motion.phase)),m.motion.lane);
 const dist=G.length(G.sub(rig.eye,center)),rad=m.radius*xf.scale;r.distance=dist;r.displayCenter=center;r.xf=xf;
 if(!m.overview){if(m.lod==='near'&&dist-rad>({low:70,balanced:200,high:310}[this.quality]))return false;if(m.lod==='props'&&dist-rad>({low:55,balanced:120,high:210}[this.quality]))return false;if(m.maxDetailDistance&&dist-rad>m.maxDetailDistance)return false;}
 return G.visibleSphere(rig.planes,center,rad+6);
 }
 render(rig,opts={}){if(this.contextLost)return;const start=performance.now(),T=this.T,now=start/1000,atlas=opts.displayMode==='atlas',distance=G.length(G.sub(rig.eye,rig.target));this.currentOptions=opts;this.lastMode=opts.displayMode;this.timeUniform.value=opts.time||0;
 this.camera.fov=rig.fov||49;this.camera.aspect=rig.aspect;this.camera.updateProjectionMatrix();this.camera.position.fromArray(rig.eye);this.camera.lookAt(...rig.target);this.camera.updateMatrixWorld();this.sky.position.copy(this.camera.position);this.lighting(rig,opts,distance);
 const stamp=[opts.lighting,opts.vegetation,opts.ceiling,opts.space,opts.displayMode,opts.focus,opts.aligned,opts.flowerEvent,opts.weather,opts.cutaway].join('|');if(stamp!==this.lastStamp){this.engine.shadowMap.needsUpdate=true;this.mirrorLast=null;this.lastStamp=stamp;}
 const shadows=!atlas&&this.quality!=='low'&&opts.space!=='mausoleum'&&opts.weather!=='rain'&&distance<1800;this.engine.shadowMap.enabled=shadows;this.sun.castShadow=shadows;
 if(shadows&&(G.length(G.sub(rig.target,this.sunAnchor))>8||Math.abs(distance-(this.shadowDistance||0))>12||this.engine.shadowMap.needsUpdate)){this.sunAnchor=rig.target.slice();this.shadowDistance=distance;const span=G.clamp(distance*.73,38,420),c=this.sun.shadow.camera;c.left=-span;c.right=span;c.top=span;c.bottom=-span;c.far=2200;c.updateProjectionMatrix();this.sun.position.set(rig.target[0]+(this.weatherSunOffset?.[0]??-430),rig.target[1]+(this.weatherSunOffset?.[1]??760),rig.target[2]+(this.weatherSunOffset?.[2]??320));this.sun.target.position.fromArray(rig.target);this.engine.shadowMap.needsUpdate=true;}
 else if(!shadows){this.sun.position.set(rig.target[0]+(this.weatherSunOffset?.[0]??-430),rig.target[1]+(this.weatherSunOffset?.[1]??760),rig.target[2]+(this.weatherSunOffset?.[2]??320));this.sun.target.position.fromArray(rig.target);}
 let proxy=0,detail=0;this.hasVisibleAnimation=false;for(const r of this.records){const m=r.data,yes=this.wanted(r,rig,opts,distance);r.wanted=yes;if(!yes){if(r.item)r.item.mesh.visible=false;continue;}let lod=this.quality==='low'?1:this.levelFor(r,r.distance);if(!m.farVertices)lod=0;const mesh=this.ensure(r,lod);mesh.visible=true;mesh.layers.set(0);mesh.scale.setScalar(r.xf?.scale||1);mesh.position.fromArray(r.xf?.offset||[0,0,0]);mesh.castShadow=shadows&&!m.overview&&m.group!=='water'&&m.group!=='effects'&&m.lod!=='props'&&m.lod!=='near';if(m.group==='terrain')mesh.castShadow=shadows&&m.owner!=='mountain';if(m.flowerKind)mesh.castShadow=false;if(m.globalSurface)mesh.castShadow=shadows&&!m.nearDecoration&&((m.component==='transition-vegetation'||m.component==='transition-fields')&&r.distance-m.radius<480||m.globalNear&&r.distance-m.radius<360);r.lastUsed=now;
 if(m.motion?.kind==='ropeway'){const q=m.motion;mesh.position.fromArray(G.MOUNTAIN.cablePoint(q.track,.5-.5*Math.cos(Math.PI*2*(this.timeUniform.value/240+q.phase)),q.lane));}
 if(m.overview)proxy++;else detail++;
 if(!atlas&&(m.motion||m.group==='water'||m.group==='effects'||['forestLeaf','bambooLeaf','sunflowerPetal','lilyFlower','meadowLeaf'].includes(m.material)))this.hasVisibleAnimation=true;
 }
 for(const s of this.signObjects){const id=s.userData.owner;s.visible=!atlas&&opts.focus===id&&(opts.space||'surface')===(s.userData.atlasSpace||'surface');if(s.userData.logicalPosition)s.position.fromArray(s.userData.logicalPosition);}
 this.trim(false);this.engine.info.reset();this.reflectionCalls=0;this.reflectionTriangles=0;
 if(!atlas&&opts.space==='surface'&&this.quality!=='low'&&opts.reflections!==false){Legacy.updateReflection.call(this,rig,opts);}else{for(const m of [this.canalWater,this.lakeWater,this.windWater])m.uniforms.uReflect.value=0;}
 const reflection={calls:this.engine.info.render.calls,triangles:this.engine.info.render.triangles};this.engine.setRenderTarget(this.sceneTarget);this.engine.clear();this.engine.render(this.scene,this.camera);const afterScene={calls:this.engine.info.render.calls,triangles:this.engine.info.render.triangles};const postPasses=this.post(!atlas&&opts.bloom!==false&&this.quality!=='low'&&this.hdrSupported,opts.lighting==='neutral'?1.04:.57);
 const i=this.engine.info;this.renderCount++;this.stats={calls:afterScene.calls-reflection.calls,triangles:afterScene.triangles-reflection.triangles,totalCalls:i.render.calls,totalTriangles:i.render.triangles,reflectionCalls:reflection.calls,reflectionTriangles:reflection.triangles,postPasses,submittedCPUms:performance.now()-start,geometries:i.memory.geometries,textures:i.memory.textures,residentObjects:this.objects.length,residentAttributeMiB:this.residentBytes/1048576,budgetMiB:this.attributeBudget/1048576,proxyDrawObjects:proxy,detailDrawObjects:detail,evictions:this.evictions,uploads:this.uploads,renderCount:this.renderCount,hdr:this.hdrSupported,contactOcclusion:this.currentOptions.ao!==false&&this.currentOptions.displayMode!=='atlas'&&this.quality!=='low',renderTargetsEstimateMiB:(this.sceneTarget.width*this.sceneTarget.height*12+this.blurA.width*this.blurA.height*16+this.aoTarget.width*this.aoTarget.height*4)/1048576};
 }
 dispose(){for(const k of [...this.packs.keys()])this.dropPack(k);this.studioEnv?.dispose();this.aoTarget?.dispose();this.aoMat?.dispose();this.sceneTarget.depthTexture?.dispose();this.sceneTarget.dispose();this.blurA.dispose();this.blurB.dispose();this.brightMat.dispose();this.blurMat.dispose();this.outputMat.dispose();this.quad.geometry.dispose();super.dispose();}
}
G.DioramaRenderer=DioramaRenderer;
})(globalThis.GA);

/* v0.15 presentation correction. The only floating boundary is the outer coast.
 * Daylight, moving clouds, cloudy weather and bounded outdoor rain are rendered
 * in the SAME Three.js scene. No screenshots/background photos are used. */
(function(G){'use strict';const Base=G.DioramaRenderer;
class IslandRenderer extends Base{
 constructor(T,canvas,world){super(T,canvas,world);this.makeNaturalSky();this.makeRain();this.setupInspectionCut();this.weatherSunOffset=[-430,760,320];}
 setupInspectionCut(){this.inspectionUniform={value:0};for(const m of Object.values(this.mats)){const prior=m.onBeforeCompile,key=m.customProgramCacheKey?.bind(m);m.onBeforeCompile=(s,r)=>{prior?.call(m,s,r);s.uniforms.uInspect=this.inspectionUniform;s.vertexShader='varying vec3 vInspectWorld;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
vec4 inspectP=vec4(transformed,1.);
#ifdef USE_INSTANCING
inspectP=instanceMatrix*inspectP;
#endif
vInspectWorld=(modelMatrix*inspectP).xyz;`);s.fragmentShader='uniform float uInspect; varying vec3 vInspectWorld;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
if(uInspect>.5 && vInspectWorld.y>-24. && vInspectWorld.x>208.02 && vInspectWorld.x<439.98 && vInspectWorld.z>378.02 && vInspectWorld.z<627.98) discard;`);};m.customProgramCacheKey=()=> (key?key():'')+'-inspection015';m.needsUpdate=true;}}
 makeNaturalSky(){const T=this.T;this.sky.material.dispose();this.sky.material=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,toneMapped:false,uniforms:{uTime:this.timeUniform,uCloud:{value:.22},uWet:{value:0},uDusk:{value:0},uSun:{value:new T.Vector3(-.43,.76,.32).normalize()}},vertexShader:`varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`precision highp float;varying vec3 vDir;uniform float uTime;uniform float uCloud;uniform float uWet;uniform float uDusk;uniform vec3 uSun;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}float fbm(vec2 p){return .53*noise(p)+.27*noise(p*2.03)+.13*noise(p*4.11)+.07*noise(p*8.17);}
 void main(){vec3 d=normalize(vDir);float h=max(0.,d.y);vec3 zenith=mix(vec3(.075,.27,.59),vec3(.20,.22,.36),uDusk),horizon=mix(vec3(.43,.64,.84),vec3(.89,.60,.40),uDusk);vec3 c=mix(horizon,zenith,pow(h,.50));c=mix(c,vec3(.40,.49,.57),uWet*.73+uCloud*.16);
 vec2 p=d.xz/max(.22,d.y+.12)*2.65+vec2(uTime*.0032,uTime*.0007);float f=fbm(p),n=smoothstep(.61-uCloud*.21,.75-uCloud*.15,f);float lighting=fbm(p+vec2(.2,-.1));vec3 cc=mix(vec3(.63,.69,.73),vec3(1.23,1.24,1.20),lighting);cc=mix(cc,vec3(.48,.54,.59),uWet*.80);cc=mix(cc,vec3(1.0,.69,.45),uDusk*.25);c=mix(c,cc,n*smoothstep(-.03,.21,d.y)*(.82+uCloud*.15));
 float sun=pow(max(dot(d,uSun),0.),950.);float halo=pow(max(dot(d,uSun),0.),22.);c+=vec3(1.0,.80,.51)*(sun*2.2+halo*.15)*(1.-uWet*.94)*(1.-n*.8);
 // Blue atmosphere below the floating island; a cloud deck far BELOW it,
 // not a black backdrop and not a second opaque ground plane.
 if(d.y<0.){float low=clamp(-d.y,0.,1.);vec2 q=d.xz/max(.16,-d.y)*2.2+vec2(uTime*.0018,0.);float bank=smoothstep(.28,.73,fbm(q));vec3 under=mix(vec3(.18,.39,.63),vec3(.59,.76,.93),bank*.68);under=mix(under,vec3(.37,.44,.51),uWet*.60);under=mix(under,vec3(.55,.48,.48),uDusk*.48);c=mix(c,under,smoothstep(0.,.26,low));}gl_FragColor=vec4(c,1.);}`});this.sky.renderOrder=-100;}
 makeRain(){const T=this.T,N=1200,rng=G.rng(1509275),p=new Float32Array(N*6),seed=new Float32Array(N*2),floor=new Float32Array(N*2);this.rainLocations=[];for(let i=0;i<N;i++){let x=(rng()-.5)*160,z=(rng()-.5)*160,f=rng();this.rainLocations.push([x,z]);for(let j=0;j<2;j++){p[i*6+j*3]=x;p[i*6+j*3+1]=j;p[i*6+j*3+2]=z;seed[i*2+j]=f;floor[i*2+j]=0;}}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(p,3));geo.setAttribute('seed',new T.BufferAttribute(seed,1));geo.setAttribute('floorY',new T.BufferAttribute(floor,1));const mat=new T.ShaderMaterial({transparent:true,depthWrite:false,toneMapped:false,uniforms:{uTime:this.timeUniform,uAnchor:{value:new T.Vector3()},uOpacity:{value:.32}},vertexShader:`attribute float seed;attribute float floorY;uniform float uTime;uniform vec3 uAnchor;varying float fade;void main(){float drop=fract(seed-uTime*.24);vec3 p=vec3(position.x,drop*55.,position.z)+uAnchor;p.x+=drop*5.;p.y-=position.y*1.55;fade=step(floorY+.25,p.y)*(1.-smoothstep(18.,80.,length(p.xz-cameraPosition.xz)));gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}`,fragmentShader:`uniform float uOpacity;varying float fade;void main(){gl_FragColor=vec4(.55,.66,.73,uOpacity*fade);}`});this.rain=new T.LineSegments(geo,mat);this.rain.frustumCulled=false;this.rain.name='weather:local-rain';this.rain.visible=false;this.scene.add(this.rain);this.lastRainAnchor=null;}
 updateRain(rig,opts){const T=this.T,surface=opts.space==='surface'&&opts.displayMode!=='atlas';this.rain.visible=surface&&opts.weather==='rain';if(!this.rain.visible)return;
 const A=[Math.floor(rig.eye[0]/16)*16,Math.max(rig.eye[1]-22,this.world.terrain.height(rig.eye[0],rig.eye[2])+.2),Math.floor(rig.eye[2]/16)*16];this.rain.material.uniforms.uAnchor.value.fromArray(A);this.rain.geometry.setDrawRange(0,this.quality==='low'?420:this.quality==='high'?2400:1600);
 const key=A[0]+':'+A[2]+':'+(this.detailOwner||opts.focus);if(key!==this.lastRainAnchor){let a=this.rain.geometry.getAttribute('floorY');const houses=this.packs.get('village')?.meta.houses||[];for(let i=0;i<this.rainLocations.length;i++){let [x,z]=this.rainLocations[i];x+=A[0];z+=A[2];let floor=this.world.terrain.height(x,z);
 // Bounded major roof blockers; this is not a full raindrop physics simulation.
 if(x>1613&&x<1648&&z>141&&z<179)floor=Math.max(floor,196);if(x>1609&&x<1619&&z>155&&z<166)floor=Math.max(floor,190);
 for(const h of houses){const w=h.w||h.width||0,d=h.d||h.depth||0;if(w&&d&&Math.abs(x-h.x)<w*.55&&Math.abs(z-h.z)<d*.55)floor=Math.max(floor,(h.y||30)+(h.h||h.height||8)+4);}
 a.setX(i*2,floor);a.setX(i*2+1,floor);}a.needsUpdate=true;this.lastRainAnchor=key;}}
 lighting(rig,opts,distance){const T=this.T,under=opts.space==='mausoleum',section=opts.space==='section',dusk=opts.lighting==='dusk',wet=opts.weather==='rain'?1:0,cloud=opts.weather==='cloudy'?.90:wet?1:.23;
 this.activeSpace=under?'mausoleum':opts.space==='senkai'?'senkai':'surface';this.sky.visible=!under;this.scene.background.set(under?0x142735:dusk?0xb3a7a1:wet?0x9baebb:0xc1d9e5);this.scene.fog.color.copy(this.scene.background);this.scene.fog.near=under?95:wet?Math.max(180,distance*.45):Math.max(1000,distance*.92);this.scene.fog.far=under?420:wet?Math.max(1300,distance+5100):distance+24000;
 this.hemisphere.color.set(dusk?0xc2d2ee:wet?0xc1d0d7:0xc7e0ef);this.hemisphere.groundColor.set(0x8c9172);this.hemisphere.intensity=under?.54:dusk?.80:wet?1.02:.94;this.ambient.intensity=under?.32:.025;
 this.sun.color.set(dusk?0xffcf92:0xfff2d8);this.sun.intensity=under?.1:wet?.24:opts.weather==='cloudy'?1.05:dusk?1.55:1.85;this.rim.color.set(0xcee4f6);this.rim.intensity=under?0:.20;
 this.weatherSunOffset=dusk?[-710,290,465]:[-430,760,320];const u=this.sky.material.uniforms;u.uCloud.value=cloud;u.uWet.value=wet;u.uDusk.value=dusk?1:0;u.uSun.value.fromArray(this.weatherSunOffset).normalize();this.sky.position.copy(this.camera.position);
 for(const m of Object.values(this.mats))m.envMapIntensity=under?.05:dusk?.13:.21;this.mats.shrineLight.emissiveIntensity=dusk?2.8:.15;this.mats.shrinePaper.emissiveIntensity=dusk?.27:.015;this.mats.forestPaper.emissiveIntensity=dusk?.15:.01;
 const lp=[[1620,185.4,153],[1620,185.4,167],[1593,184,181],[1569,186,165]];for(let i=0;i<4;i++){this.focusLamps[i].position.fromArray(lp[i]);this.focusLamps[i].intensity=dusk?110:0;this.focusLamps[i].visible=opts.focus==='hakurei'&&dusk&&opts.displayMode!=='atlas';}
 this.rim.position.set(rig.target[0]+240,rig.target[1]+290,rig.target[2]-190);this.rim.target.position.fromArray(rig.target);
 for(let i=0;i<this.localLights.length;i++){let p=this.world.expansion.mausoleum.lights[i],l=this.localLights[i];l.position.fromArray(p.slice(0,3));l.distance=p[5];l.intensity=p[4];l.visible=under||section||opts.cutaway;}
 this.coverUniform.value=1;this.mistUniform.value=opts.bambooHaze===false?0:1;this.cutUniform.value=0;if(this.inspectionUniform)this.inspectionUniform.value=opts.cutaway?1:0;
 for(const m of[this.water,this.caveWater,this.canalWater,this.lakeWater,this.windWater]){m.uniforms.uFogColor.value.copy(this.scene.fog.color);m.uniforms.uFogNear.value=this.scene.fog.near;m.uniforms.uFogFar.value=this.scene.fog.far;}
 this.updateRain(rig,opts);
 }
 wanted(r,rig,opts,distance){const m=r.data,under=opts.space==='mausoleum',senkai=opts.space==='senkai',section=opts.space==='section',surface=!under&&!senkai&&!section,atlas=opts.displayMode==='atlas',cut=!!opts.cutaway;
 if(m.legacyBackdrop||m.continuousOnly)return false;
 if(surface){
  // Nothing from other spaces hangs above/beside the main island by default.
  if((m.space||'surface')!=='surface'){if(!(cut&&m.owner==='mausoleum'&&!m.ceiling&&!m.hideInSection))return false;}
  if(m.displayOnly&&(m.space||'surface')==='surface')return false;
  if(m.component==='terrain'&&(m.space||'surface')==='surface')return false;
  if(m.cutOnly&&!cut||m.cutReplace&&cut)return false;
  if(m.globalNear||m.globalFar){let close=!atlas&&distance<1550&&G.length(G.sub(rig.eye,m.center))-m.radius<700;if(m.globalNear&&!close||m.globalFar&&close)return false;}
  // Shared roads remain present while streaming; local paving sits above them.
  if(!m.globalSurface&&!m.displayOnly){const isFocus=m.owner===opts.focus;const ready=(isFocus||(opts.detailNeighbors||[]).includes(m.owner)||cut&&m.owner==='mausoleum')&&this.packs.has(m.owner)&&distance<1900;if(m.overview&&ready)return false;if(!m.overview&&!ready)return false;}
 }else if(section){if(!['myouren','mausoleum'].includes(m.owner)||m.ceiling||m.hideInSection||m.globalSurface)return false;if(m.overview===this.packs.has(m.owner)&&!m.displayOnly)return false;}
 else{const own=under?'mausoleum':'senkai';if(m.owner!==own||m.ceiling&&opts.ceiling===false)return false;if(!m.displayOnly&&m.overview===this.packs.has(own))return false;}
 if(m.event==='summer-concert'&&!opts.flowerEvent||opts.vegetation===false&&m.group==='vegetation')return false;
 r.displayCenter=m.center;r.xf={scale:1,offset:[0,0,0]};let center=m.center;
 if(m.motion?.kind==='ropeway')center=G.MOUNTAIN.cablePoint(m.motion.track,.5-.5*Math.cos(Math.PI*2*(this.timeUniform.value/240+m.motion.phase)),m.motion.lane);
 const dist=G.length(G.sub(rig.eye,center));r.distance=dist;
 if(m.nearDecoration&&(atlas||dist-m.radius>360))return false;
 if(m.maxDetailDistance&&dist-m.radius>m.maxDetailDistance)return false;
 if(!m.overview){if(m.lod==='near'&&dist-m.radius>({low:70,balanced:200,high:310}[this.quality]))return false;if(m.lod==='props'&&dist-m.radius>({low:55,balanced:120,high:210}[this.quality]))return false;}
 return G.visibleSphere(rig.planes,center,m.radius+6);
 }
 post(enabled,unused){const o=this.currentOptions,exposure=o.space==='mausoleum'?.78:o.lighting==='dusk'?.84:o.weather==='rain'?.94:1.04;return super.post(enabled&&o.lighting==='dusk',exposure);}
 render(rig,opts={}){super.render(rig,opts);if(this.sky.visible||this.rain.visible)this.hasVisibleAnimation=true;this.stats.weather=opts.weather||'clear';this.stats.skyVisible=this.sky.visible;this.stats.surfaceComponents=1;this.stats.localCutaway=!!opts.cutaway;this.stats.rainSegments=this.rain.visible?this.rain.geometry.drawRange.count/2:0;}
 dispose(){this.rain.geometry.dispose();this.rain.material.dispose();this.scene.remove(this.rain);super.dispose();}
}
G.DioramaRenderer=IslandRenderer;
})(globalThis.GA);

/* Bounded regional materials. No global fog/solar-color override.
 * Water, petals and flowers use the existing pausable scene clock.
 * No extra reflection camera or shadow-casting local light is introduced. */
(function(G){'use strict';const Base=G.DioramaRenderer;
class WesternRenderer extends Base{
 constructor(T,canvas,world){super(T,canvas,world);const uniform=this.timeUniform;
 const create=(name,rough,metal=0)=>{let m=new T.MeshStandardMaterial({vertexColors:true,roughness:rough,metalness:metal,side:T.DoubleSide});m.name='atlas-'+name;m.envMap=this.studioEnv?.texture||null;m.envMapIntensity=.21;this.mats[name]=m;return m;};
 for(const [name,rough,metal]of[['basalt',.78,0],['memorialStone',.88,0],['mossRock',.94,0],['relicMetal',.57,.23],['spiderLily',.77,0],['purpleCherry',.89,0],['fallingPetal',.83,0],['genbuFlow',.26,.08],['genbuFoam',.80,0],['genbuFall',.40,0]]){
 const mat=create(name,rough,metal);
 if(name==='fallingPetal'){mat.emissive.set(0x72587c);mat.emissiveIntensity=.30;}
 if(name==='genbuFoam'){mat.transparent=true;mat.opacity=.53;mat.depthWrite=false;mat.polygonOffset=true;mat.polygonOffsetFactor=-1;}
 if(name==='genbuFall'){mat.emissive.set(0x264a48);mat.emissiveIntensity=.22;}
 mat.onBeforeCompile=shader=>{shader.uniforms.uWesternTime=uniform;
 shader.vertexShader='uniform float uWesternTime; varying vec3 vWestern;\n'+shader.vertexShader;
 shader.fragmentShader='uniform float uWesternTime; varying vec3 vWestern;\n'+shader.fragmentShader;
 let body='';if(name==='spiderLily')body=`float bend=smoothstep(.05,1.25,position.y)*.025;transformed.x+=bend*sin(uWesternTime*.7+instanceMatrix[3].x*.07+instanceMatrix[3].z*.04);`;
 if(name==='purpleCherry')body=`transformed.x+=.035*smoothstep(7.,16.,position.y)*sin(uWesternTime*.65+position.x*.25+position.z*.24);`;
 if(name==='fallingPetal')body=`float seed=fract(sin(dot(floor(position.xz*2.),vec2(12.981,78.223)))*43758.54);float centerY=floor(position.y*2.)*.5+.25;transformed.y=70.4+mod(centerY-70.4-uWesternTime*.58+seed*2.,20.)+position.y-centerY;transformed.x+=sin(uWesternTime*.55+seed*6.28)*.85;transformed.z+=cos(uWesternTime*.40+seed*9.)*.50;`;
 if(body)shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n'+body);
 shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
 vec4 westernP=vec4(transformed,1.);
 #ifdef USE_INSTANCING
 westernP=instanceMatrix*westernP;
 #endif
 vWestern=(modelMatrix*westernP).xyz;`);
 let col='';
 if(name==='basalt')col=`float seam=sin(vWestern.y*1.06+sin(vWestern.z*.09)*.42);float damp=1.-smoothstep(40.,54.,vWestern.y);diffuseColor.rgb*=.96+.027*seam;diffuseColor.rgb*=1.-damp*.12;`;
 if(name==='memorialStone')col=`float mott=.5+.5*sin(vWestern.x*1.2+sin(vWestern.z*2.)*.4)*sin(vWestern.y*2.8);diffuseColor.rgb*=.93+mott*.07;`;
 if(name==='genbuFlow'){
 col=`float stream=sin(vWestern.x*2.0+sin(vWestern.z*.17-uWesternTime*.63))*.5+.5;float filament=pow(max(0.,sin(vWestern.z*.85-uWesternTime*2.1+vWestern.x*.6)),16.);diffuseColor.rgb*=.91+stream*.08;diffuseColor.rgb+=vec3(.035,.046,.043)*filament;`;
 shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
 vec3 flowNormal=normalize(vec3(.065*cos(vWestern.x*.85+vWestern.z*.19-uWesternTime*.8),1.,.045*sin(vWestern.z*1.2-uWesternTime*1.6+vWestern.x*.14)));
 normal=normalize((viewMatrix*vec4(flowNormal,0.)).xyz);`);
 }
 if(name==='genbuFoam')col=`float f=.65+.35*sin(vWestern.z*2.7-uWesternTime*3.6+vWestern.x*1.5);diffuseColor.a*=f;`;
 if(name==='genbuFall')col=`float v=.5+.5*sin(vWestern.y*2.7+uWesternTime*4.5+sin(vWestern.x*7.)*.6);diffuseColor.rgb*=.74+.26*v;`;
 if(col)shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n'+col);
 };
 mat.customProgramCacheKey=()=> 'western-016-'+name;
 }
 }
 material(m){return this.mats[m.material]&&['genbuFlow','genbuFoam','genbuFall'].includes(m.material)?this.mats[m.material]:super.material(m);}
 render(rig,opts={}){super.render(rig,opts);this.stats.westernFocused=['muenzuka','genbu'].includes(opts.focus)?opts.focus:null;}
}
G.DioramaRenderer=WesternRenderer;
})(globalThis.GA);
