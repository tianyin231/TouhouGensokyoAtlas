/* Aerial scenery shares the surface's sun, sky and clock. No global inversion. */
(function(G){
'use strict';
const Base=G.DioramaRenderer;
class KishinjouRenderer extends Base{
 constructor(T,canvas,world){
  super(T,canvas,world);
  for(const [key,roughness,metalness]of[
   ['Plaster',.9,0],['Stone',.88,0],['Tile',.51,.06],['TileEdge',.57,.04],
   ['Wood',.73,0],['Paper',.91,0],['Gold',.44,.55],['Tatami',.96,0]
  ]){
   const m=new T.MeshStandardMaterial({vertexColors:true,roughness,metalness,side:T.DoubleSide});
   // A small vertex-tinted bounce term keeps downward-facing roofs legible.
   // This is an artistic approximation, not measured global illumination.
   if(['Tile','TileEdge','Stone'].includes(key)){m.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n totalEmissiveRadiance += vColor.rgb * .075;');};m.customProgramCacheKey=()=> 'kishinjou-bounce-'+key;}
   m.name='kishinjou-'+key;m.envMap=this.studioEnv.texture;m.envMapIntensity=.21;
   this.mats['kishin'+key]=m;
  }
  this.mats.kishinMist=new T.ShaderMaterial({vertexColors:true,transparent:true,depthWrite:false,side:T.DoubleSide,
   uniforms:{uTime:this.timeUniform,uAnchor:{value:new T.Vector3(...G.KISHINJOU.anchor)}},
   vertexShader:`uniform float uTime;uniform vec3 uAnchor;varying vec3 vBand;void main(){
    vBand=color;vec3 p=position-uAnchor;float a=uTime*.045;
    p.xz=mat2(cos(a),-sin(a),sin(a),cos(a))*p.xz;
    p.y+=sin(uTime*.6+color.x*12.+color.z*5.)*1.3;
    gl_Position=projectionMatrix*modelViewMatrix*vec4(p+uAnchor,1.);
   }`,
   fragmentShader:`varying vec3 vBand;void main(){
    float end=sin(vBand.x*3.14159265);float edge=sin(vBand.y*3.14159265);
    float grain=.78+.22*sin(vBand.x*88.+vBand.z*5.);
    gl_FragColor=vec4(.47,.54,.65,pow(max(0.,end*edge),1.5)*grain*.30);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`
  });
  // Soft, local reflected light from the open windows. Not a new global sun.
  this.castleFill=new T.PointLight(0xe2c59a,0,48,1.5);
  this.castleFill.position.fromArray(G.KISHINJOU.point([0,22,0]));
  this.castleFill.castShadow=false;this.castleFill.visible=false;this.scene.add(this.castleFill);
 }
 wanted(r,rig,opts,distance){
  const m=r.data;
  if(m.owner==='kishinjou'){
   if(opts.space!=='surface')return false;
   if(m.castlePart==='storm'&&!opts.castleStorm)return false;
   if(opts.castleSection&&!m.overview&&(m.castleZone!=='hall'||['front','roof'].includes(m.castlePart)))return false;
  }
  return super.wanted(r,rig,opts,distance);
 }
 updateRain(rig,opts){
  super.updateRain(rig,opts);
  if(!this.rain.visible)return;
  const origin=this.rain.material.uniforms.uAnchor.value,A=G.KISHINJOU.anchor;
  if(Math.abs(origin.x-A[0])>140||Math.abs(origin.z-A[2])>135)return;
  const floor=this.rain.geometry.getAttribute('floorY');
  // Conservative cover from the uppermost stone foundation, including rain drift.
  for(let i=0;i<this.rainLocations.length;i++){
   const [x,z]=this.rainLocations[i];
   if(Math.abs(x+origin.x+2.5-A[0])<46&&Math.abs(z+origin.z-A[2])<39){floor.setX(i*2,A[1]+.4);floor.setX(i*2+1,A[1]+.4);}
  }
  floor.needsUpdate=true;
 }
 lighting(rig,opts,distance){
  super.lighting(rig,opts,distance);
  this.castleFill.visible=opts.space==='surface'&&opts.focus==='kishinjou'&&this.packs.has('kishinjou');
  this.castleFill.intensity=opts.view==='needleHall'?55:opts.castleSection?24:12;
  this.mats.kishinPaper.emissive.set(0xd9b781);
  this.mats.kishinPaper.emissiveIntensity=opts.lighting==='dusk'?.13:.025;
 }
 render(rig,opts={}){const cut=!!opts.castleSection;if(cut!==this.castleCut){this.engine.shadowMap.needsUpdate=true;this.castleCut=cut;}super.render(rig,opts);}
 dropPack(id){super.dropPack(id);if(id==='kishinjou'&&this.castleFill)this.castleFill.visible=false;}
 dispose(){this.scene.remove(this.castleFill);this.castleFill.dispose();super.dispose();}
}
G.DioramaRenderer=KishinjouRenderer;
})(globalThis.GA);
