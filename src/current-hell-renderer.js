/* Current Hell owns only its own atmosphere/materials; inherited scenes are delegated. */
(function(G){
 'use strict';const Base=G.DioramaRenderer,active=s=>G.CURRENT_HELL.spaces.includes(s);
 class CurrentHellRenderer extends Base{
  constructor(T,canvas,world){
   super(T,canvas,world);this.jigokuStrength={value:1};
   for(const [key,roughness]of[['Earth',1],['Rock',.96],['Bone',.84]]){const m=new T.MeshStandardMaterial({vertexColors:true,roughness,metalness:0,side:T.DoubleSide});m.name='current-hell-'+key;m.envMap=this.studioEnv.texture;m.envMapIntensity=.04;this.mats['jigoku'+key]=m;}
   const windVertex=`varying vec3 vP;varying vec3 vMask;uniform float uTime;void main(){vec3 p=position;p.y+=sin(p.x*.018+uTime*.45)*2.;vP=p;vMask=color;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`;
   const windFragment=`varying vec3 vP;varying vec3 vMask;uniform float uTime;uniform float uStrength;void main(){float edge=pow(max(0.,sin(vMask.y*3.14159265)),1.4);float ends=smoothstep(0.,.12,vMask.x)*(1.-smoothstep(.85,1.,vMask.x));float strand=.3+.7*pow(.5+.5*sin(vP.x*.028+vP.z*.009-uTime*1.9+vMask.z*12.),3.);gl_FragColor=vec4(.52,.115,.145,edge*ends*strand*.20*uStrength);}`;
   this.mats.jigokuWind=new T.ShaderMaterial({vertexColors:true,side:T.DoubleSide,transparent:true,depthWrite:false,toneMapped:false,uniforms:{uTime:this.timeUniform,uStrength:this.jigokuStrength},vertexShader:windVertex,fragmentShader:windFragment});
   this.mats.jigokuStorm=this.mats.jigokuWind.clone();this.mats.jigokuStorm.uniforms.uTime=this.timeUniform;this.mats.jigokuStorm.uniforms.uStrength=this.jigokuStrength;
   this.mats.jigokuDust=new T.ShaderMaterial({side:T.DoubleSide,transparent:true,depthWrite:false,toneMapped:false,uniforms:{uTime:this.timeUniform},vertexShader:`varying float vA;uniform float uTime;void main(){vec3 p=position;p.x=mod(p.x+650.+uTime*14.,1300.)-650.;p.y+=sin(p.z*.11+uTime)*1.6;vA=.20+.14*sin(p.z*.3);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,fragmentShader:'varying float vA;void main(){gl_FragColor=vec4(.61,.21,.20,vA);}'});
   this.jigokuEmpty={value:0};this.jigokuSky=new T.Mesh(new T.SphereGeometry(9000,32,18),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,toneMapped:false,uniforms:{uTime:this.timeUniform,uEmpty:this.jigokuEmpty,uStrength:this.jigokuStrength},
    vertexShader:'varying vec3 vD;void main(){vD=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec3 vD;uniform float uTime;uniform float uEmpty;uniform float uStrength;void main(){vec3 d=normalize(vD);float horizon=exp(-abs(d.y)*4.5);float band=sin(d.z*13.+sin(d.x*9.-uTime*.021)*1.8+d.y*24.);vec3 c=mix(vec3(.018,.010,.026),vec3(.20,.037,.045),horizon);c+=vec3(.072,.018,.020)*max(0.,band)*horizon*uStrength;c=mix(c,mix(vec3(.002,.003,.005),vec3(.012,.014,.021),horizon),uEmpty);gl_FragColor=vec4(c,1.);}` }));
   this.jigokuSky.visible=false;this.jigokuSky.frustumCulled=false;this.jigokuSky.renderOrder=-100;this.scene.add(this.jigokuSky);
   this.jigokuNoShadow=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,depthWrite:false,colorWrite:false});
  }
  ensure(r,level){const o=super.ensure(r,level);if(G.CURRENT_HELL.regions.includes(r.data.owner)&&r.data.shadowCaster===false)o.customDepthMaterial=this.jigokuNoShadow;return o;}
  wanted(r,rig,opts,distance){const m=r.data,ours=G.CURRENT_HELL.regions.includes(m.owner);if(!active(opts.space))return ours?false:super.wanted(r,rig,opts,distance);
   if(!ours||m.space!==opts.space||m.overview===this.packs.has(m.owner))return false;
   if(m.jigokuPart==='storm'&&!opts.jigokuStorm)return false;
   r.distance=G.length(G.sub(rig.eye,m.center));r.displayCenter=m.center;r.xf={scale:1,offset:[0,0,0]};return G.visibleSphere(rig.planes,m.center,m.radius+20);
  }
  lighting(rig,opts,distance){super.lighting(rig,opts,distance);const yes=active(opts.space),empty=opts.space==='hell_avici';this.jigokuSky.visible=yes;if(!yes)return;
   this.activeSpace=opts.space;this.sky.visible=false;this.rain.visible=false;this.jigokuSky.position.fromArray(rig.eye);this.jigokuEmpty.value=empty?1:0;this.jigokuStrength.value=opts.jigokuStorm?1.8:1;
   const fog=empty?[.012,.014,.021]:[.20,.037,.045];this.scene.background.setRGB(...fog);this.scene.fog.color.setRGB(...fog);this.scene.fog.near=empty?65:240;this.scene.fog.far=empty?680:1700;
   this.hemisphere.color.set(empty?0x9eabc6:0xe4bcc0);this.hemisphere.groundColor.set(empty?0x222631:0x5c454c);this.hemisphere.intensity=empty?.56:.78;
   this.ambient.color.set(empty?0x868fa5:0xa68b90);this.ambient.intensity=empty?.035:.10;
   this.sun.color.set(empty?0x9caeca:0xffd8bd);this.sun.intensity=empty?.65:1.55;this.rim.color.set(empty?0x565e78:0xaa536c);this.rim.intensity=empty?.09:.35;
   this.weatherSunOffset=[-470,580,430];this.sun.shadow.bias=-.00045;this.sun.shadow.normalBias=.65;
   for(const l of [...this.localLights,...this.focusLamps])l.visible=false;this.coverUniform.value=0;this.mistUniform.value=0;this.inspectionUniform.value=0;
  }
  render(rig,opts={}){const key=[opts.space,opts.jigokuStorm,opts.jigokuEra].join('|');if(key!==this.jigokuKey){this.jigokuKey=key;this.engine.shadowMap.needsUpdate=true;}super.render(rig,active(opts.space)?{...opts,weather:'clear',lighting:'neutral'}:opts);if(opts.space==='hell_avici')this.hasVisibleAnimation=false;}
  dispose(){this.scene.remove(this.jigokuSky);this.jigokuSky.geometry.dispose();this.jigokuSky.material.dispose();this.jigokuNoShadow.dispose();super.dispose();}
 }
 G.DioramaRenderer=CurrentHellRenderer;
})(globalThis.GA);
