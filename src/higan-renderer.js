/* Liminal fair, silent river and softly lit Higan. Climate is scoped to these charts. */
(function(G){
 'use strict';
 const Base=G.DioramaRenderer,active=s=>G.HIGAN.spaces.includes(s);
 class HiganRenderer extends Base{
  constructor(T,canvas,world){
   super(T,canvas,world);this.higanFar={value:0};
   const defs={Stone:[.94,0],Sand:[1,0],Paving:[.95,0],Wood:[.77,0],Cloth:[.95,0],Lamp:[.8,0],Props:[.78,0],Leaf:[.95,0],Pinwheel:[.85,0],Moss:[.97,0],Spirit:[.7,0],Flower:[.92,0],Tile:[.55,.06]};
   for(const [key,[roughness,metalness]]of Object.entries(defs)){
    const m=new T.MeshStandardMaterial({vertexColors:true,roughness,metalness,side:T.DoubleSide});
    m.name='higan-'+key;m.envMap=this.studioEnv.texture;m.envMapIntensity=.12;
    m.onBeforeCompile=s=>{
     s.uniforms.uHiganTime=this.timeUniform;
     s.vertexShader='uniform float uHiganTime;\n'+s.vertexShader;
     if(key==='Spirit')s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.y+=sin(uHiganTime*.6+position.z*.07)*.35;');
     if(key==='Pinwheel')s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.z+=sin(uHiganTime*1.2+position.y*2.)*.08;');
     const emission={Lamp:'.55',Spirit:'.24',Wood:'.015',Tile:'.014'}[key];
     if(emission)s.fragmentShader=s.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vColor.rgb*'+emission+';');
    };m.customProgramCacheKey=()=> 'higan-023-'+key;this.mats['higan'+key]=m;
   }
   this.mats.higanSpirit.transparent=true;this.mats.higanSpirit.opacity=.48;this.mats.higanSpirit.depthWrite=false;
   this.mats.higanWater=new T.ShaderMaterial({side:T.DoubleSide,toneMapped:false,uniforms:{uTime:this.timeUniform,uFar:this.higanFar},
    vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec3 vP;uniform float uTime;uniform float uFar;void main(){
     vec3 eye=normalize(cameraPosition-vP);float f=pow(1.-abs(eye.y),3.);
     float r=sin(vP.z*.23+sin(vP.x*.019)*2.+uTime*.31)*.5+.5;
     float fine=pow(max(0.,sin(vP.z*.64+vP.x*.03-uTime*.24)),15.);
     vec3 haze=mix(vec3(.29,.39,.41),vec3(.61,.56,.43),uFar);
     vec3 col=mix(vec3(.045,.11,.135),haze,f*.84)+fine*.014+r*.008;
     float fog=smoothstep(350.,2000.,length(vP-cameraPosition));col=mix(col,haze,fog);
     gl_FragColor=vec4(col,1.);
    }`});
   this.higanSky=new T.Mesh(new T.SphereGeometry(9000,32,18),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,toneMapped:false,
    uniforms:{uFar:this.higanFar},vertexShader:'varying vec3 vD;void main(){vD=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec3 vD;uniform float uFar;void main(){vec3 d=normalize(vD);float h=exp(-abs(d.y)*4.5);
     vec3 top=mix(vec3(.13,.20,.245),vec3(.36,.39,.35),uFar),low=mix(vec3(.29,.39,.41),vec3(.61,.56,.43),uFar);
     gl_FragColor=vec4(mix(top,low,h),1.);}`
   }));this.higanSky.visible=false;this.higanSky.frustumCulled=false;this.higanSky.renderOrder=-100;this.scene.add(this.higanSky);
   this.higanNoShadow=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,depthWrite:false,colorWrite:false});
   this.higanFill=new T.PointLight(0xffdfae,65,46,1.5);this.higanFill.position.set(-13,37,-229);this.higanFill.visible=false;this.scene.add(this.higanFill);
  }
  ensure(r,level){const o=super.ensure(r,level);if(G.HIGAN.regions.includes(r.data.owner)&&r.data.shadowCaster===false&&this.higanNoShadow)o.customDepthMaterial=this.higanNoShadow;return o;}
  wanted(r,rig,opts,distance){
   const m=r.data,ours=G.HIGAN.regions.includes(m.owner);
   if(!active(opts.space))return ours?false:super.wanted(r,rig,opts,distance);
   if(!ours||m.space!==opts.space||m.overview===this.packs.has(m.owner))return false;
   if(m.higanPart==='contest'&&!opts.higanContest)return false;
   if(m.higanPart==='plants'&&opts.vegetation===false)return false;
   r.distance=G.length(G.sub(rig.eye,m.center));r.displayCenter=m.center;r.xf={scale:1,offset:[0,0,0]};return G.visibleSphere(rig.planes,m.center,m.radius+4);
  }
  lighting(rig,opts,distance){
   super.lighting(rig,opts,distance);const yes=active(opts.space),far=opts.space==='higan';
   this.higanSky.visible=yes;this.higanFill.visible=yes&&far&&!!opts.higanInterior&&this.packs.has('higan');
   if(!yes)return;
   this.higanFar.value=far?1:0;this.activeSpace=opts.space;this.sky.visible=false;this.rain.visible=false;this.higanSky.position.fromArray(rig.eye);
   const fog=far?[.61,.56,.43]:[.29,.39,.41];this.scene.background.setRGB(...fog);this.scene.fog.color.setRGB(...fog);
   this.scene.fog.near=far?300:360;this.scene.fog.far=far?1550:1800;
   this.hemisphere.color.set(far?0xf7efd8:0xd7e7e8);this.hemisphere.groundColor.set(far?0xaca787:0x879383);this.hemisphere.intensity=1.04;
   this.ambient.color.set(0xe6e1cb);this.ambient.intensity=far?.16:.12;
   this.sun.color.set(far?0xffedd2:0xf2e3cb);this.sun.intensity=far?1.25:1.35;
   this.rim.color.set(0xabc5cb);this.rim.intensity=.23;this.weatherSunOffset=[-355,750,450];
   this.sun.shadow.bias=-.00045;this.sun.shadow.normalBias=.5;
   for(const l of [...this.localLights,...this.focusLamps])l.visible=false;
   this.coverUniform.value=0;this.mistUniform.value=0;this.inspectionUniform.value=0;
  }
  render(rig,opts={}){const key=[opts.space,opts.higanInterior,opts.higanContest].join('|');if(key!==this.higanKey){this.higanKey=key;this.engine.shadowMap.needsUpdate=true;}super.render(rig,active(opts.space)?{...opts,weather:'clear',lighting:'neutral'}:opts);if(active(opts.space))this.stats.higanChart=opts.space;}
  dropPack(id){super.dropPack(id);if(id==='higan'&&this.higanFill)this.higanFill.visible=false;}
  dispose(){this.higanNoShadow.dispose();this.scene.remove(this.higanSky,this.higanFill);this.higanSky.geometry.dispose();this.higanSky.material.dispose();this.higanFill.dispose();super.dispose();}
 }
 G.DioramaRenderer=HiganRenderer;
})(globalThis.GA);
