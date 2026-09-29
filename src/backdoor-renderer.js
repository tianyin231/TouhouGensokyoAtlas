/* One realm, four bounded non-recursive 3D window tableaux. No remote textures. */
(function(G){
'use strict';
const Base=G.DioramaRenderer,active=s=>s==='backdoor';
class BackdoorRenderer extends Base{
 constructor(T,canvas,world){
  super(T,canvas,world);this.backdoorWindowTargets=[];this.backdoorWindowBuildPasses=0;this.backdoorWindowPassesThisFrame=0;
  for(const [key,roughness,metalness]of [['Wood',.72,0],['Trim',.62,0],['Brass',.48,.35],['Plane',.93,0],['Pattern',.93,0]]){
   const m=new T.MeshStandardMaterial({vertexColors:true,roughness,metalness,side:T.DoubleSide});m.name='backdoor-'+key;m.envMap=this.studioEnv.texture;m.envMapIntensity=.12;this.mats['backdoor'+key]=m;
  }
  this.mats.backdoorLine=new T.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.5,side:T.DoubleSide,depthWrite:false});
  this.mats.backdoorDust=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:{uTime:this.timeUniform},
   vertexShader:'uniform float uTime;void main(){vec3 p=position;p.y+=sin(uTime*.3+position.x*.04)*.7;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}',
   fragmentShader:'void main(){gl_FragColor=vec4(.43,.30,.22,.37);}' });
  for(let i=0;i<4;i++){this.mats['backdoorHaze'+i]=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:{uTime:this.timeUniform,uTint:{value:new T.Color([0x907493,0x8ba5a0,0xbc926a,0x8399b6][i])}},
   vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
   fragmentShader:'uniform float uTime;uniform vec3 uTint;varying vec3 vP;void main(){float edge=(1.-smoothstep(3.,10.,abs(vP.x)));float a=(.16+.07*sin(vP.y*.24+uTime*.38+vP.z*.02))*edge;gl_FragColor=vec4(uTint,a);}' });}
  for(const d of G.BACKDOOR.windows)this.mats['backdoorWindow'+d.id]=new T.MeshBasicMaterial({color:0xffffff,side:T.FrontSide});
  this.backdoorNoShadow=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,depthWrite:false,colorWrite:false});
  this.backdoorSky=new T.Mesh(new T.SphereGeometry(8500,24,14),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,toneMapped:false,uniforms:{uSix:{value:0}},
   vertexShader:'varying vec3 vD;void main(){vD=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
   fragmentShader:'varying vec3 vD;uniform float uSix;void main(){float h=exp(-abs(normalize(vD).y)*5.);vec3 c=mix(vec3(.012,.008,.017),vec3(.048,.028,.060),h);gl_FragColor=vec4(mix(c,vec3(.003,.003,.006),uSix),1.);}' }));
  this.backdoorSky.visible=false;this.backdoorSky.frustumCulled=false;this.backdoorSky.renderOrder=-100;this.scene.add(this.backdoorSky);
 }
 ensure(r,level){const mesh=super.ensure(r,level),m=r.data;if(m.owner==='backdoor'){
  if(m.shadowCaster===false)mesh.customDepthMaterial=this.backdoorNoShadow;
  if(m.backdoorPart==='window'&&!mesh.geometry.getAttribute('uv')){
   const d=G.BACKDOOR.windows.find(d=>d.id===m.backdoorZone),p=mesh.geometry.getAttribute('position'),uv=new Float32Array(p.count*2),c=Math.cos(d.yaw),s=Math.sin(d.yaw);
   for(let i=0;i<p.count;i++){const x=p.getX(i)-d.x,z=p.getZ(i)-d.z;uv[i*2]=(c*x-s*z+9.96)/19.92;uv[i*2+1]=(p.getY(i)-d.y)/34.98;}
   mesh.geometry.setAttribute('uv',new this.T.BufferAttribute(uv,2));
  }
 }return mesh;}
 wanted(r,rig,opts,distance){const m=r.data,ours=m.owner==='backdoor';if(!active(opts.space))return ours?false:super.wanted(r,rig,opts,distance);
  if(!ours||m.overview===this.packs.has('backdoor'))return false;
  const edition=opts.backdoorEdition==='six'?'six':'hall';if(m.backdoorEdition!=='both'&&m.backdoorEdition!==edition)return false;
  if(m.backdoorPart==='ceiling'&&opts.backdoorCutaway)return false;
  if(m.backdoorState!=='both'&&m.backdoorState!==(opts.backdoorClosed?'closed':'open'))return false;
  r.distance=G.length(G.sub(rig.eye,m.center));r.displayCenter=m.center;r.xf={scale:1,offset:[0,0,0]};return G.visibleSphere(rig.planes,m.center,m.radius+4);
 }
 buildWindowTargets(){const T=this.T,e=this.engine,size=this.quality==='low'?128:256,old={target:e.getRenderTarget(),tone:e.toneMapping,clear:e.getClearColor(new T.Color()),alpha:e.getClearAlpha(),auto:e.autoClear,shadow:e.shadowMap.enabled,viewport:e.getViewport(new T.Vector4()),scissor:e.getScissor(new T.Vector4()),scissorTest:e.getScissorTest()};
  // Temporary scenes and buffers are destroyed even if rendering throws. Only four targets survive.
  try{e.toneMapping=T.NoToneMapping;e.autoClear=true;e.shadowMap.enabled=false;e.setScissorTest(false);
   for(const d of G.BACKDOOR.windows){const p=G.buildBackdoorGlimpse(d.id),a=p.mesh.vertices,buffer=new T.InterleavedBuffer(a,9),geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.InterleavedBufferAttribute(buffer,3,0));geo.setAttribute('normal',new T.InterleavedBufferAttribute(buffer,3,3));geo.setAttribute('color',new T.InterleavedBufferAttribute(buffer,3,6));
    const mat=new T.MeshStandardMaterial({vertexColors:true,roughness:1,side:T.DoubleSide}),scene=new T.Scene();scene.background=new T.Color(p.background);scene.fog=new T.Fog(p.background,60,160);scene.add(new T.Mesh(geo,mat));
    const hemi=new T.HemisphereLight(0xffffff,0x7c6a68,1.1),sun=new T.DirectionalLight(0xffead0,.85);sun.position.set(-30,65,35);scene.add(hemi,sun);
    const camera=new T.PerspectiveCamera(54,20/35,.2,300);camera.position.fromArray(p.eye);camera.lookAt(...p.target);camera.updateMatrixWorld();
    const target=new T.WebGLRenderTarget(size,Math.round(size*35/20),{minFilter:T.LinearFilter,magFilter:T.LinearFilter,depthBuffer:true,stencilBuffer:false});target.samples=4;target.texture.name='backdoor-tableau-'+d.id;
    try{e.setRenderTarget(target);e.clear();e.render(scene,camera);this.mats['backdoorWindow'+d.id].map=target.texture;this.mats['backdoorWindow'+d.id].needsUpdate=true;this.backdoorWindowTargets.push(target);this.backdoorWindowBuildPasses++;this.backdoorWindowPassesThisFrame++;}catch(error){target.dispose();throw error;}finally{geo.dispose();mat.dispose();scene.clear();}
   }
  }catch(error){this.releaseWindowTargets();throw error;}finally{e.setRenderTarget(old.target);e.toneMapping=old.tone;e.setClearColor(old.clear,old.alpha);e.autoClear=old.auto;e.shadowMap.enabled=old.shadow;e.setViewport(old.viewport);e.setScissor(old.scissor);e.setScissorTest(old.scissorTest);}
 }
 releaseWindowTargets(){for(const d of G.BACKDOOR.windows){const m=this.mats['backdoorWindow'+d.id];if(m){m.map=null;m.needsUpdate=true;}}for(const t of this.backdoorWindowTargets||[])t.dispose();this.backdoorWindowTargets=[];}
 lighting(rig,opts,distance){super.lighting(rig,opts,distance);const yes=active(opts.space),six=opts.backdoorEdition==='six';this.backdoorSky.visible=yes;if(!yes)return;
  this.activeSpace='backdoor';this.sky.visible=false;this.rain.visible=false;this.backdoorSky.position.fromArray(rig.eye);this.backdoorSky.material.uniforms.uSix.value=six?1:0;
  this.scene.background.setRGB(...(six?[.003,.003,.006]:[.048,.028,.060]));this.scene.fog.color.copy(this.scene.background);this.scene.fog.near=six?220:270;this.scene.fog.far=six?800:1100;
  this.hemisphere.color.set(0xc3d2c4);this.hemisphere.groundColor.set(0x87566e);this.hemisphere.intensity=1.05;this.ambient.color.set(0xc5c9c2);this.ambient.intensity=.21;
  this.sun.color.set(0xf6ddbc);this.sun.intensity=1.65;this.rim.color.set(0x76b8aa);this.rim.intensity=.55;this.weatherSunOffset=[-200,130,260];this.sun.shadow.bias=-.0004;this.sun.shadow.normalBias=.4;
  for(const l of [...this.localLights,...this.focusLamps])l.visible=false;this.coverUniform.value=0;this.mistUniform.value=0;this.inspectionUniform.value=0;
 }
 render(rig,opts={}){this.backdoorWindowPassesThisFrame=0;const key=[opts.space,opts.backdoorEdition,opts.backdoorClosed,opts.backdoorCutaway].join('|');if(key!==this.backdoorKey){this.backdoorKey=key;this.engine.shadowMap.needsUpdate=true;}
  if(active(opts.space)&&this.packs.has('backdoor')&&!this.backdoorWindowTargets.length&&opts.backdoorEdition!=='six'&&!opts.backdoorClosed)this.buildWindowTargets();
  super.render(rig,active(opts.space)?{...opts,weather:'clear',lighting:'neutral'}:opts);
  this.stats.backdoorWindows={targets:this.backdoorWindowTargets.length,buildPasses:this.backdoorWindowBuildPasses,framePasses:this.backdoorWindowPassesThisFrame,livePortals:false};
 }
 dropPack(id){super.dropPack(id);if(id==='backdoor')this.releaseWindowTargets();}
 dispose(){this.releaseWindowTargets();this.scene.remove(this.backdoorSky);this.backdoorSky.geometry.dispose();this.backdoorSky.material.dispose();this.backdoorNoShadow.dispose();super.dispose();}
}
G.DioramaRenderer=BackdoorRenderer;
})(globalThis.GA);
