/* Local materials and reversible scene editions. Existing region materials stay untouched. */
(function(G){
'use strict';const Base=G.DioramaRenderer;
const noise=`
float asaHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float asaNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(asaHash(i),asaHash(i+vec3(1.,0.,0.)),f.x),mix(asaHash(i+vec3(0.,1.,0.)),asaHash(i+vec3(1.,1.,0.)),f.x),f.y),mix(mix(asaHash(i+vec3(0.,0.,1.)),asaHash(i+vec3(1.,0.,1.)),f.x),mix(asaHash(i+vec3(0.,1.,1.)),asaHash(i+vec3(1.,1.,1.)),f.x),f.y),f.z);}
`;
function detail(kind){
 const common=`vec3 asaP=vAtlasPosition;float asaDetail=(1.-smoothstep(65.,170.,length(vViewPosition)))*(1.-smoothstep(.20,.85,length(fwidth(asaP))));float asaBroad=asaNoise(asaP*.32);`;
 if(kind==='Wood')return common+`float asaFibers=asaNoise(asaP*vec3(3.5,.13,3.5));diffuseColor.rgb*=.87+.17*asaBroad+(asaFibers-.5)*.18*asaDetail;`;
 if(kind==='Stone'||kind==='Trim')return common+`float asaGrain=asaNoise(asaP*4.);diffuseColor.rgb*=.93+.12*asaBroad+(asaGrain-.5)*.065*asaDetail;`;
 if(kind==='Rock'||kind==='Fossil')return common+`float asaLayer=.5+.5*sin(asaP.y*.73+asaBroad*2.);diffuseColor.rgb*=mix(vec3(.80,.85,.86),vec3(1.03,1.,.92),asaBroad)*(.95+.07*asaLayer);`;
 if(kind==='Soil')return common+`diffuseColor.rgb*=mix(vec3(.79,.83,.73),vec3(1.03,1.02,.94),asaBroad);`;
 if(kind.endsWith('Leaf'))return common+`diffuseColor.rgb*=.91+.15*asaBroad;`;
 return '';
}
class AsamaRenderer extends Base{
 constructor(T,canvas,world){super(T,canvas,world);
  const source=this.mats.matte,prior=source.onBeforeCompile,key=source.customProgramCacheKey.bind(source);
  for(const[k,rough]of[['Stone',.93],['Rock',.98],['Soil',1],['Wood',.9],['Leaf',.96],['RedLeaf',.96],['PinkLeaf',.96],['SnowLeaf',.96],['Trim',.73],['MazeTile',.82],['Roof',.83],['Paper',.96],['Fossil',.96],['Water',.33],['Lamp',.8]]){
   const m=source.clone();m.roughness=rough;m.metalness=0;m.side=T.DoubleSide;m.name='asama-'+k;m.envMap=this.studioEnv.texture;m.envMapIntensity=.10;
   m.onBeforeCompile=(s,r)=>{prior.call(source,s,r);s.fragmentShader=noise+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n'+detail(k));};
   m.customProgramCacheKey=()=>key()+'-asama-surface-2-'+k;this.mats['asama'+k]=m;
  }
  this.mats.asamaRedLeaf.color.set(0xb86745);this.mats.asamaPinkLeaf.color.set(0xd6a7b3);this.mats.asamaSnowLeaf.color.set(0xf4f6ec);this.mats.asamaLamp.emissive.set(0xe7be7a);this.mats.asamaLamp.emissiveIntensity=.6;
  this.asamaLamps=[-1,1].map(d=>{const l=new T.PointLight(0xffd9a5,85,32,2);l.position.set(d*24,-21.6,-130);l.visible=false;l.castShadow=false;this.scene.add(l);return l;});
  this.asamaPalette=null;this.asamaMazeColor=null;this.makeSeikiGround();
 }
 makeSeikiGround(){const source=this.mats.ground,prior=source.onBeforeCompile,key=source.customProgramCacheKey.bind(source),m=source.clone();m.name='seiki-ground';
  m.onBeforeCompile=(s,r)=>{prior.call(source,s,r);s.fragmentShader=noise+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec2 asaLocal=(vAtlasPosition.xz-vec2(-1280.,-1010.))/vec2(260.,210.);
   float asaMask=1.-smoothstep(.58,1.,length(asaLocal));
   vec3 asaNormal=normalize(cross(dFdx(vAtlasPosition),dFdy(vAtlasPosition)));
   float asaMineral=asaNoise(vAtlasPosition*.055);
   float asaRock=smoothstep(.14,.48,1.-abs(asaNormal.y));
   vec3 asaEarth=mix(vec3(.49,.56,.40),vec3(.72,.74,.59),asaMineral);
   vec3 asaCliff=mix(vec3(.64,.67,.65),vec3(.82,.81,.73),asaMineral);
   diffuseColor.rgb*=mix(vec3(1.),mix(asaEarth,asaCliff,asaRock),asaMask);
  `);};m.customProgramCacheKey=()=>key()+'-seiki-ground-1';this.mats.seikiGround=m;
 }
 material(m){const mat=super.material(m);return mat===this.mats.ground&&m.globalSurface&&Math.hypot(m.center[0]+1280,m.center[2]+1010)-m.radius<300?this.mats.seikiGround:mat;}
 wanted(r,rig,opts,d){const m=r.data,p=G.PRESETS[opts.view]||{};if(opts.space==='asama'){
   if(m.owner!=='asama'||m.asamaScene!==(p.asamaScene||'pyramid')||m.overview===this.packs.has('asama'))return false;
   if(p.asamaCut&&['shell','roof','shrineRoof'].includes(m.asamaPart))return false;
   r.distance=G.length(G.sub(rig.eye,m.center));r.displayCenter=m.center;r.xf={scale:1,offset:[0,0,0]};return G.visibleSphere(rig.planes,m.center,m.radius+3);
  }
  if(m.owner==='asama')return false;
  if(m.owner==='seiki'){
   if(opts.space!=='surface'||(m.asamaPart!=='road'&&m.overview===this.packs.has('seiki')))return false;
   if(m.asamaPart==='trees'&&!opts.vegetation)return false;
   r.distance=G.length(G.sub(rig.eye,m.center));r.displayCenter=m.center;r.xf={scale:1,offset:[0,0,0]};return G.visibleSphere(rig.planes,m.center,m.radius+3);
  }return super.wanted(r,rig,opts,d);
 }
 lighting(rig,opts,d){super.lighting(rig,opts,d);const p=G.PRESETS[opts.view]||{};for(const l of this.asamaLamps)l.visible=opts.space==='asama'&&p.asamaScene==='depth';if(opts.space!=='asama')return;
  const cut=!!p.asamaCut;this.activeSpace='asama';this.sky.visible=false;this.rain.visible=false;this.scene.background.set(0x354046);this.scene.fog.color.set(0x354046);this.scene.fog.near=180;this.scene.fog.far=620;
  this.hemisphere.color.set(0xd7dde0);this.hemisphere.groundColor.set(0x8d9092);this.hemisphere.intensity=1.05;this.ambient.color.set(0xe1ded3);this.ambient.intensity=.67;this.sun.color.set(0xfbe8ca);this.sun.intensity=cut?1.8:.85;this.rim.color.set(0x89abba);this.rim.intensity=.6;this.weatherSunOffset=[-150,290,120];
  for(const l of[...this.localLights,...this.focusLamps])l.visible=false;this.coverUniform.value=0;this.mistUniform.value=0;this.inspectionUniform.value=0;
 }
 render(rig,opts={}){const p=G.PRESETS[opts.view]||{},key=!!p.asamaAutumn,maze=p.asamaMazeColor||'blue';
  if(key!==this.asamaPalette){this.asamaPalette=key;this.mats.asamaLeaf.color.set(key?0xc98657:0x7b9567);this.engine.shadowMap.needsUpdate=true;}
  if(maze!==this.asamaMazeColor){this.asamaMazeColor=maze;this.mats.asamaMazeTile.color.set({red:0xa76a61,blue:0x759dad,green:0x779b81,yellow:0xb9a366}[maze]);}
  super.render(rig,opts.space==='asama'?{...opts,weather:'clear',lighting:'neutral',reflections:false}:opts);
 }
 dispose(){for(const l of this.asamaLamps){this.scene.remove(l);l.dispose();}super.dispose();}
}
G.DioramaRenderer=AsamaRenderer;
})(globalThis.GA);
