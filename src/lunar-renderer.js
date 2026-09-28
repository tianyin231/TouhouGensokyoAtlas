/* Independent lunar charts. No mutation of the surface's weather or old-hell lights. */
(function(G){
  'use strict';
  const Base=G.DioramaRenderer, isLunar=s=>G.LUNAR.spaces.includes(s);
  class LunarRenderer extends Base{
    constructor(T,canvas,world){
      super(T,canvas,world);
      this.lunarPhase={value:0};this.lunarFrozen={value:0};this.lunarShadowDefaults={bias:this.sun.shadow.bias,normalBias:this.sun.shadow.normalBias};
      for(const [suffix,roughness,metalness]of [
        ['Stone',.88,0],['Paving',.86,0],['Sand',1,0],['Basalt',1,0],['Wall',.92,0],
        ['Wood',.68,0],['Tile',.48,.12],['Ridge',.51,.18],['Paper',.9,0],['Leaf',.92,0],['Lamp',.8,0]
      ]){
        const m=new T.MeshStandardMaterial({vertexColors:true,roughness,metalness,side:T.DoubleSide});
        m.name='lunar-'+suffix;m.envMap=this.studioEnv.texture;m.envMapIntensity=.13;
        m.onBeforeCompile=s=>{s.uniforms.uLunarFrozen=this.lunarFrozen;
          s.fragmentShader='uniform float uLunarFrozen;\n'+s.fragmentShader;
          s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat mono=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(mono*.66,mono*.94,mono*1.18),uLunarFrozen*.75);');
          if(['Tile','Wood'].includes(suffix))s.fragmentShader=s.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n totalEmissiveRadiance += vColor.rgb*.025;');
        };m.customProgramCacheKey=()=> 'lunar-019-'+suffix;this.mats['lunar'+suffix]=m;
      }
      this.mats.lunarLamp.emissive.set(0xffd7a0);this.mats.lunarLamp.emissiveIntensity=.42;
      const output='\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n';
      this.mats.lunarWater=new T.ShaderMaterial({side:T.DoubleSide,uniforms:{uTime:this.lunarPhase,uFrozen:this.lunarFrozen},
        vertexShader:`varying vec3 vW;void main(){vW=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader:`uniform float uTime;uniform float uFrozen;varying vec3 vW;void main(){
          vec3 eye=normalize(cameraPosition-vW);float f=pow(1.-abs(eye.y),3.);
          float w=sin(vW.z*.26+sin(vW.x*.015)*2.+uTime*.55)+.44*sin(vW.z*.73+vW.x*.023-uTime*.8);
          float glint=pow(max(0.,w*.69),12.)*.028;
          float reflected=exp(-pow((vW.x-820.)/300.,2.))*.065*(.35+.65*max(0.,sin(vW.z*.13+uTime*.31)));
          vec3 col=mix(vec3(.024,.102,.158),vec3(.12,.22,.31),f)+glint+vec3(.33,.62,.91)*reflected;
          col=mix(col,vec3(.13,.22,.31),uFrozen*.6);gl_FragColor=vec4(col,1.);
          ${output}
        }`});
      this.mats.lunarLattice=new T.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.30,depthWrite:false});
      this.mats.lunarCrane=new T.MeshStandardMaterial({vertexColors:true,roughness:.74,metalness:.08,side:T.DoubleSide,emissive:0x6584ad,emissiveIntensity:.23});
      this.mats.lunarCrane.onBeforeCompile=s=>{s.uniforms.uDrift=this.lunarPhase;s.vertexShader='uniform float uDrift;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.y += sin(position.z*.017+uDrift*.5)*.45;');};
      this.mats.lunarDream=new T.ShaderMaterial({side:T.DoubleSide,transparent:true,depthWrite:false,uniforms:{uTime:this.lunarPhase},
        vertexShader:`uniform float uTime;varying vec3 vP;void main(){vP=position;vec3 p=position;p.y+=sin(position.z*.012+uTime*.22)*1.2;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
        fragmentShader:`uniform float uTime;varying vec3 vP;void main(){float a=.16+.09*sin(vP.z*.014+uTime*.3);gl_FragColor=vec4(.22,.36,.57,a);${output}}`});
      this.lunarSky=new T.Mesh(new T.SphereGeometry(7000,32,20),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,
        uniforms:{uDream:{value:0}},vertexShader:'varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader:`varying vec3 vDir;uniform float uDream;float h(vec3 p){return fract(sin(dot(p,vec3(31.47,74.27,13.17)))*43758.5);}void main(){
          vec3 d=normalize(vDir);float up=max(0.,d.y),haze=exp(-abs(d.y)*7.);
          vec3 col=mix(vec3(.006,.012,.029),vec3(.043,.082,.134),haze);
          vec3 cell=floor(d*410.);float stars=step(.9988,h(cell))*(.2+.8*h(cell+3.))*smoothstep(.01,.2,up);
          col+=vec3(.49,.64,.83)*stars;col=mix(col,col*vec3(1.3,.92,1.45),uDream);gl_FragColor=vec4(col,1.);${output}
        }`}));
      this.lunarSky.frustumCulled=false;this.lunarSky.renderOrder=-100;this.lunarSky.visible=false;this.scene.add(this.lunarSky);
      // Original procedural globe: abstract land/cloud patterns, no borrowed texture.
      this.lunarEarth=new T.Mesh(new T.SphereGeometry(145,48,32),new T.ShaderMaterial({
        vertexShader:'varying vec3 vN;void main(){vN=normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader:`varying vec3 vN;
          float hash3(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
          float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),f.x),mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z);}
          float fbm(vec3 p){return .6*noise3(p)+.27*noise3(p*2.1+13.)+.13*noise3(p*4.3+27.);}
          void main(){vec3 n=normalize(vN);float land=smoothstep(.53,.59,fbm(n*3.6+4.));
          vec3 c=mix(vec3(.018,.097,.28),vec3(.09,.21,.16),land);
          float clouds=smoothstep(.48,.70,fbm(n*9.0+vec3(n.y*3.,n.z,2.)));c=mix(c,vec3(.76,.86,.94),clouds*.82);
          float polar=smoothstep(.82,.96,abs(n.y));c=mix(c,vec3(.65,.79,.88),polar*.6);
          float light=.09+.91*smoothstep(-.3,.85,dot(n,normalize(vec3(-.7,.5,.5))));
          float rim=pow(1.-max(0.,n.z),3.)*.10;gl_FragColor=vec4(c*light+vec3(.15,.44,.8)*rim,1.);${output}}`
      }));this.lunarEarth.visible=false;this.scene.add(this.lunarEarth);
      this.lunarFill=new T.PointLight(0xffdfaf,90,65,1.5);this.lunarFill.position.set(173,31,-146);this.lunarFill.visible=false;this.scene.add(this.lunarFill);
    }
    wanted(r,rig,opts,distance){
      const m=r.data,belongs=G.LUNAR.regions.includes(m.owner);
      if(!isLunar(opts.space))return belongs?false:super.wanted(r,rig,opts,distance);
      if(!belongs||m.space!==opts.space)return false;
      if(m.lunarFace!=='both'&&m.lunarFace!==(opts.lunarFace||'inner'))return false;
      if(opts.lunarSealed&&m.lunarPart==='daily')return false;
      if(opts.vegetation===false&&m.lunarPart==='plants')return false;
      if(m.overview===this.packs.has(m.owner))return false;
      r.distance=G.length(G.sub(rig.eye,m.center));r.displayCenter=m.center;r.xf={scale:1,offset:[0,0,0]};
      return G.visibleSphere(rig.planes,m.center,m.radius+6);
    }
    lighting(rig,opts,distance){
      super.lighting(rig,opts,distance);
      const active=isLunar(opts.space),dream=opts.space==='dream',outer=opts.lunarFace==='outer';
      this.sun.shadow.bias=active?-.0004:this.lunarShadowDefaults.bias;this.sun.shadow.normalBias=active?.6:this.lunarShadowDefaults.normalBias;
      this.lunarSky.visible=active;this.lunarEarth.visible=active&&!dream;
      this.lunarFill.visible=opts.space==='lunar'&&this.packs.has('lunar')&&!opts.lunarSealed;
      this.lunarFrozen.value=opts.lunarSealed?1:0;
      this.lunarPhase.value=opts.lunarSealed?0:this.timeUniform.value;
      if(!active)return;
      this.activeSpace=opts.space;this.sky.visible=false;this.rain.visible=false;
      this.lunarSky.position.fromArray(rig.eye);this.lunarSky.material.uniforms.uDream.value=dream?1:0;
      this.lunarEarth.position.set(rig.eye[0]-550,rig.eye[1]+700,rig.eye[2]-2400);
      this.scene.background.set(0x13283d);this.scene.fog.color.set(dream?0x1b2441:0x254563);
      this.scene.fog.near=dream?420:1050;this.scene.fog.far=dream?1900:3400;if(!dream)this.scene.fog.color.setRGB(.043,.082,.134);
      this.hemisphere.color.set(outer?0xc3d0e5:0xd7e6fa);this.hemisphere.groundColor.set(outer?0x4c4d61:0x7b899d);
      this.hemisphere.intensity=dream?.8:outer?.52:.90;this.ambient.color.set(0xccd9ed);this.ambient.intensity=dream?.3:.07;
      this.sun.color.set(opts.lunarSealed?0xc9e1ff:0xfff1df);this.sun.intensity=dream?.6:outer?2.1:1.8;
      this.rim.color.set(0x97bfdc);this.rim.intensity=.30;this.weatherSunOffset=outer?[-640,330,400]:[-440,730,380];
      for(const l of [...this.localLights,...this.focusLamps])l.visible=false;
      this.coverUniform.value=0;this.mistUniform.value=0;this.inspectionUniform.value=0;
    }
    render(rig,opts={}){
      const key=[opts.space,opts.lunarFace,opts.lunarSealed].join('|');if(this.lunarKey!==key){this.lunarKey=key;this.engine.shadowMap.needsUpdate=true;}
      super.render(rig,isLunar(opts.space)?{...opts,weather:'clear',lighting:'neutral'}:opts);
      if(isLunar(opts.space)){
        this.stats.lunarChart=opts.space;this.stats.lunarFace=opts.lunarFace||'inner';
        if(opts.lunarFace==='outer'||opts.lunarSealed)this.hasVisibleAnimation=false;
      }
    }
    dropPack(id){super.dropPack(id);if(id==='lunar'&&this.lunarFill)this.lunarFill.visible=false;}
    dispose(){for(const m of [this.lunarSky,this.lunarEarth]){this.scene.remove(m);m.geometry.dispose();m.material.dispose();}this.scene.remove(this.lunarFill);this.lunarFill.dispose();super.dispose();}
  }
  G.DioramaRenderer=LunarRenderer;
})(globalThis.GA);
