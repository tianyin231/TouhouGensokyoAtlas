/* Mine-only materials, nearest work lights and reversible roof inspection. */
(function(G){
'use strict';const Base=G.DioramaRenderer,isMine=s=>s===G.RAINBOW_MINE.space;
class MineRenderer extends Base{
 constructor(T,canvas,world){super(T,canvas,world);this.mineTime={value:0};this.mineHaze={value:1};
  for(const[k,rough,metal]of[['Rock',.96,0],['Ground',.98,0],['Wood',.84,0],['Iron',.62,.18],['Rail',.4,.40],['Ore',.47,.06],['Lamp',.75,0],['Paper',.92,0]]){const m=new T.MeshStandardMaterial({vertexColors:true,roughness:rough,metalness:metal,side:T.DoubleSide});m.name='rainbow-mine-'+k;m.envMap=this.studioEnv.texture;m.envMapIntensity=.07;this.mats['mine'+k]=m;}
  this.mats.mineOre.emissive.set(0x326650);this.mats.mineOre.emissiveIntensity=.15;this.mats.mineLamp.emissive.set(0xffebbe);this.mats.mineLamp.emissiveIntensity=.8;
  this.mats.mineWater=new T.ShaderMaterial({side:T.DoubleSide,uniforms:{uTime:this.mineTime},vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 vP;uniform float uTime;void main(){float w=pow(.5+.5*sin(vP.z*2.0+uTime*1.2),9.);gl_FragColor=vec4(vec3(.06,.12,.13)+w*.08,1.);}',toneMapped:false});
  this.mats.mineMist=new T.ShaderMaterial({vertexColors:true,side:T.DoubleSide,transparent:true,depthWrite:false,toneMapped:false,uniforms:{uTime:this.mineTime,uHaze:this.mineHaze},vertexShader:'varying vec3 vP;varying vec3 vC;void main(){vP=position;vC=color;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 vP;varying vec3 vC;uniform float uTime;uniform float uHaze;void main(){float wave=.5+.5*sin(vP.x*.23+sin(vP.y*.33+uTime*.35)+vP.z*.035);float y0=5.-16.*smoothstep(70.,350.,-vP.z)+2.;float w=12.+10.*exp(-pow((vP.z+147.)/47.,2.))+13.*exp(-pow((vP.z+280.)/46.,2.));float cx=3.*sin(vP.z/63.)+2.*sin(vP.z/31.);float edge=(1.-smoothstep(.48,.80,abs(vP.x-cx)/w))*smoothstep(0.,2.8,vP.y-y0)*(1.-smoothstep(7.5,11.,vP.y-y0));float a=pow(wave,2.)*.065*uHaze*edge;gl_FragColor=vec4(vC*.7,a);}' });
  this.mineLights=Array.from({length:8},()=>{const l=new T.PointLight(0xffe1b0,90,34,1.5);l.visible=false;this.scene.add(l);return l;});this.mineLightPositions=[];
 }
 attachPack(p){super.attachPack(p);if(p.id==='rainbowmine')this.mineLightPositions=p.meta.lights||[];}
 dropPack(id){super.dropPack(id);if(id==='rainbowmine'){this.mineLightPositions=[];for(const l of this.mineLights||[])l.visible=false;}}
 wanted(r,rig,opts,d){const m=r.data,ours=m.owner==='rainbowmine';if(!isMine(opts.space))return ours?false:super.wanted(r,rig,opts,d);if(!ours||m.overview===this.packs.has('rainbowmine'))return false;if(m.minePart==='roof'&&opts.mineCut)return false;if(m.minePart==='mist'&&opts.mineEdition==='th185')return false;r.distance=G.length(G.sub(rig.eye,m.center));r.displayCenter=m.center;r.xf={scale:1,offset:[0,0,0]};return G.visibleSphere(rig.planes,m.center,m.radius+5);}
 lighting(rig,opts,d){super.lighting(rig,opts,d);for(const l of this.mineLights)l.visible=false;if(!isMine(opts.space))return;this.activeSpace=opts.space;this.sky.visible=false;this.rain.visible=false;
  this.scene.background.set(0x263540);this.scene.fog.color.set(0x263540);this.scene.fog.near=60;this.scene.fog.far=opts.mineEdition==='extra'?190:290;
  this.hemisphere.color.set(0xc5d8e2);this.hemisphere.groundColor.set(0x726755);this.hemisphere.intensity=.74;this.ambient.color.set(0xd0d3ce);this.ambient.intensity=.48;
  this.sun.color.set(0xffe2b6);this.sun.intensity=opts.mineCut?1.7:.35;this.rim.color.set(0x7893ab);this.rim.intensity=.24;this.weatherSunOffset=[-110,310,210];this.sun.shadow.bias=-.0004;this.sun.shadow.normalBias=.3;
  for(const l of[...this.localLights,...this.focusLamps])l.visible=false;this.coverUniform.value=0;this.mistUniform.value=0;this.inspectionUniform.value=0;
  const pts=this.mineLightPositions.slice().sort((a,b)=>G.length(G.sub(a,rig.eye))-G.length(G.sub(b,rig.eye)));for(let i=0;i<Math.min(pts.length,this.mineLights.length);i++){const l=this.mineLights[i];l.position.fromArray(pts[i]);l.visible=true;l.intensity=opts.mineCut?18:105;}
 }
 render(rig,opts={}){this.mineTime.value=opts.time||0;this.mineHaze.value=opts.mineEdition==='extra'?1.3:1;const key=[opts.space,opts.mineCut,opts.mineEdition].join('|');if(key!==this.mineKey){this.mineKey=key;this.engine.shadowMap.needsUpdate=true;}super.render(rig,isMine(opts.space)?{...opts,weather:'clear',lighting:'neutral'}:opts);if(isMine(opts.space)){this.hasVisibleAnimation=this.records.some(r=>r.wanted&&['water','mist'].includes(r.data.minePart));this.stats.mineLights=this.mineLights.filter(l=>l.visible).length;}}
 dispose(){for(const l of this.mineLights){this.scene.remove(l);l.dispose();}super.dispose();}
}
G.DioramaRenderer=MineRenderer;
})(globalThis.GA);
