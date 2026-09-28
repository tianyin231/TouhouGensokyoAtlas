/* Local urban haze and ceramic/circuit interior; no mutation of older scene sources. */
(function(G) {
  'use strict';
  const Base=G.DioramaRenderer,active=s=>G.ANIMAL.spaces.includes(s);
  class AnimalRenderer extends Base {
    constructor(T,canvas,world) {
      super(T,canvas,world);
      this.animalInterior={value:0};
      const definitions={Concrete:[.88,0],Stone:[.90,0],Paving:[.95,0],Road:[.98,0],Metal:[.46,.35],Glass:[.35,.2],Window:[.57,.1],
        Clay:[.86,0],Dark:[1,0],Turf:[1,0],Leaf:[.95,0],Bark:[.95,0],Circuit:[.57,.15],Display:[.49,.13],Spirit:[.72,0]};
      for(const [key,[roughness,metalness]]of Object.entries(definitions)) {
        const m=new T.MeshStandardMaterial({vertexColors:true,roughness,metalness,side:T.DoubleSide});
        m.name='animal-'+key;m.envMap=this.studioEnv.texture;m.envMapIntensity=.10;
        m.onBeforeCompile=s=>{
          s.uniforms.uAnimalTime=this.timeUniform;
          s.vertexShader='uniform float uAnimalTime;varying vec3 vAnimalPosition;\n'+s.vertexShader;
          s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvAnimalPosition=position;'+(key==='Spirit'?'transformed.y+=sin(uAnimalTime*.55+position.z*.17)*.35;':''));
          s.fragmentShader='uniform float uAnimalTime;varying vec3 vAnimalPosition;\n'+s.fragmentShader;
          const glow={Window:'vColor.rgb*.18',Circuit:'vColor.rgb*(.32+.26*pow(.5+.5*sin(vAnimalPosition.z*.045-uAnimalTime*.55),8.))',
            Display:'vColor.rgb*(.10+.035*sin(uAnimalTime*.23+vAnimalPosition.z*.008))',Spirit:'vColor.rgb*.22'}[key];
          if(glow)s.fragmentShader=s.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+='+glow+';');
        };
        m.customProgramCacheKey=()=> 'animal-024-'+key;this.mats['animal'+key]=m;
      }
      this.mats.animalPaving.polygonOffset=true;this.mats.animalPaving.polygonOffsetFactor=-1;this.mats.animalPaving.polygonOffsetUnits=-1;
      this.mats.animalSpirit.transparent=true;this.mats.animalSpirit.opacity=.40;this.mats.animalSpirit.depthWrite=false;
      this.mats.animalWater=new T.ShaderMaterial({side:T.DoubleSide,toneMapped:false,uniforms:{uTime:this.timeUniform},
        vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader:`uniform float uTime;varying vec3 vP;void main(){vec3 eye=normalize(cameraPosition-vP);float f=pow(1.-abs(eye.y),3.);
          float r=sin(vP.x*.13+sin(vP.z*.055)+uTime*.24)*.5+.5;
          vec3 col=mix(vec3(.033,.060,.069),vec3(.17,.20,.23),f*.7)+r*.006;gl_FragColor=vec4(col,1.);}`});
      // Thin surface overlays: local polygon offsets, no change to inherited camera clipping.
      for(const key of ['animalPaving','animalStone','animalWindow','animalGlass','animalWater','animalCircuit']){const m=this.mats[key];m.polygonOffset=true;m.polygonOffsetFactor=-1;m.polygonOffsetUnits=-1;}
      this.animalSky=new T.Mesh(new T.SphereGeometry(9000,32,18),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,toneMapped:false,
        uniforms:{uInterior:this.animalInterior},vertexShader:'varying vec3 vD;void main(){vD=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader:`uniform float uInterior;varying vec3 vD;void main(){vec3 d=normalize(vD);float h=exp(-abs(d.y)*5.);
          vec3 col=mix(vec3(.035,.046,.066),vec3(.22,.195,.215),h);col=mix(col,vec3(.012,.025,.032),uInterior);gl_FragColor=vec4(col,1.);}`}));
      this.animalSky.visible=false;this.animalSky.frustumCulled=false;this.animalSky.renderOrder=-100;this.scene.add(this.animalSky);
      this.animalNoShadow=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,depthWrite:false,colorWrite:false});
      this.animalLights=[];
      for(const p of [[0,43,-80],[-70,29,-139],[54,31,32]]) {
        const light=new T.PointLight(0xe5dcba,230,180,1.4);light.position.fromArray(p);light.visible=false;this.scene.add(light);this.animalLights.push(light);
      }
    }
    material(m) {return m.material==='animalWater'?this.mats.animalWater:super.material(m);}
    ensure(r,level) {
      const mesh=super.ensure(r,level);
      if(G.ANIMAL.regions.includes(r.data.owner)&&r.data.shadowCaster===false)mesh.customDepthMaterial=this.animalNoShadow;
      return mesh;
    }
    wanted(r,rig,opts,distance) {
      const m=r.data,ours=G.ANIMAL.regions.includes(m.owner);
      if(!active(opts.space))return ours?false:super.wanted(r,rig,opts,distance);
      if(!ours||m.space!==opts.space||m.overview===this.packs.has(m.owner))return false;
      if(m.animalEra!=='both'&&m.animalEra!==(opts.animalEra||'keiki'))return false;
      if(m.animalPart==='plants'&&opts.vegetation===false)return false;
      if(opts.animalSection&&['roof','front','right'].includes(m.animalPart))return false;
      r.distance=G.length(G.sub(rig.eye,m.center));r.displayCenter=m.center;r.xf={scale:1,offset:[0,0,0]};
      return G.visibleSphere(rig.planes,m.center,m.radius+4);
    }
    lighting(rig,opts,distance) {
      super.lighting(rig,opts,distance);
      const yes=active(opts.space),inside=opts.space==='primate_core';
      this.animalSky.visible=yes;
      for(const l of this.animalLights)l.visible=yes&&inside&&this.packs.has('primate_core');
      if(!yes)return;
      this.activeSpace=opts.space;this.animalInterior.value=inside?1:0;this.sky.visible=false;this.rain.visible=false;
      this.animalSky.position.fromArray(rig.eye);
      this.scene.background.setRGB(...(inside?[.025,.05,.058]:[.22,.195,.215]));this.scene.fog.color.copy(this.scene.background);
      this.scene.fog.near=inside?350:1100;this.scene.fog.far=inside?1200:2600;
      this.hemisphere.color.set(inside?0xcce5de:0xd4d5e3);this.hemisphere.groundColor.set(inside?0x929b83:0x756771);this.hemisphere.intensity=inside?1.0:.92;
      this.ambient.color.set(0xd0d4ca);this.ambient.intensity=inside?.24:.14;
      this.sun.color.set(inside?0xd8e5da:0xf0ccc0);this.sun.intensity=inside?.42:1.45;
      this.rim.color.set(0x9bb4bf);this.rim.intensity=.36;this.weatherSunOffset=inside?[-130,150,190]:[-440,780,540];
      this.sun.shadow.bias=-.0006;this.sun.shadow.normalBias=.7;
      for(const l of [...this.localLights,...this.focusLamps])l.visible=false;
      this.coverUniform.value=0;this.mistUniform.value=0;this.inspectionUniform.value=0;
    }
    render(rig,opts={}) {
      const key=[opts.space,opts.animalEra,opts.animalSection].join('|');
      if(this.animalKey!==key){this.animalKey=key;this.engine.shadowMap.needsUpdate=true;}
      super.render(rig,active(opts.space)?{...opts,weather:'clear',lighting:'neutral'}:opts);
      if(active(opts.space))this.stats.animalChart=opts.space;
    }
    dropPack(id) {super.dropPack(id);if(id==='primate_core')for(const l of this.animalLights||[])l.visible=false;}
    dispose() {
      this.animalNoShadow.dispose();this.scene.remove(this.animalSky);this.animalSky.geometry.dispose();this.animalSky.material.dispose();
      for(const l of this.animalLights){this.scene.remove(l);l.dispose();}super.dispose();
    }
  }
  G.DioramaRenderer=AnimalRenderer;
})(globalThis.GA);
