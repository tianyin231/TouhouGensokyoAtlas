/* 地底局部光照和程序化材质，地表继续使用原有天气系统。 */
(function(G){
  'use strict';
  const Base=G.DioramaRenderer;
  const studioPost=Object.getPrototypeOf(Object.getPrototypeOf(Base.prototype)).post;
  const noiseGLSL=`
    float hh(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float hn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hh(i),hh(i+vec2(1.,0.)),f.x),mix(hh(i+vec2(0.,1.)),hh(i+1.),f.x),f.y);}
    float hf(vec2 p){return hn(p)*.57+hn(p*2.03)*.28+hn(p*4.09)*.15;}`;
  class HellRenderer extends Base {
    constructor(T,canvas,world){
      super(T,canvas,world);this.hellLights=[];this.hellLightSites=[];
      const definitions={
        hellStone:[.86,0],hellPaving:[.83,0],hellRoad:[.88,0],hellRock:[.98,0],hellWood:[.86,0],hellPlaster:[.91,0],
        hellTile:[.49,.12],hellIron:[.51,.57],hellBrass:[.42,.60],hellCloth:[.95,0],
        hellPalace:[.79,0],hellCarving:[.66,.05],hellPalaceRoof:[.48,.17],hellMarble:[.24,.12],
        hellGarden:[.9,0],hellMosaic:[.3,.1],hellWindow:[.72,0],hellGlass:[.23,.13],
        hellLantern:[.70,0],hellSpirit:[.4,0],hellLava:[.75,.04],hellCore:[.5,0],
        hellCircuit:[.5,.25],hellWater:[.22,.25],hellOil:[.16,.37],hellEmber:[.4,0]
      };
      for(const [name,[roughness,metalness]] of Object.entries(definitions)){
        const mat=new T.MeshStandardMaterial({vertexColors:true,roughness,metalness,side:T.DoubleSide});
        mat.name='atlas-'+name;mat.envMap=this.studioEnv.texture;mat.envMapIntensity=.12;
        const emission={hellWindow:.30,hellGlass:.40,hellLantern:1.9,hellSpirit:1.6,hellMosaic:.20,hellCircuit:2.4,hellEmber:4};
        if(emission[name]){mat.emissive.set(0xffffff);mat.emissiveIntensity=emission[name];}
        mat.onBeforeCompile=s=>{
          s.uniforms.uHellTime=this.timeUniform;
          s.vertexShader='varying vec3 vHellWorld; varying vec3 vHellColor; uniform float uHellTime;\n'+s.vertexShader;
          let motion='';
          if(name==='hellEmber')motion='transformed.y=-650.+mod(position.y+650.+uHellTime*3.5,112.);transformed.x+=sin(uHellTime*.5+position.z)*1.7;';
          if(name==='hellWater'||name==='hellOil')motion='transformed.y+=sin(position.x*.4+uHellTime*.7)*sin(position.z*.28-uHellTime*.4)*.055;';
          s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n'+motion+'\nvHellWorld=(modelMatrix*vec4(transformed,1.)).xyz;vHellColor=color;');
          s.fragmentShader='varying vec3 vHellWorld; varying vec3 vHellColor; uniform float uHellTime;\n'+noiseGLSL+'\n'+s.fragmentShader;
          let surface='';
          if(name==='hellRock')surface=`float strata=sin(vHellWorld.y*.26+hf(vHellWorld.xz*.022)*7.);float grain=hf(vHellWorld.xz*.14+vHellWorld.y*.08);diffuseColor.rgb*=.82+grain*.25+strata*.045;`;
          else if(name==='hellRoad')surface=`vec2 uv=vHellWorld.xz/3.;uv.x+=mod(floor(uv.y),2.)*.5;vec2 edge=min(fract(uv),1.-fract(uv));vec2 aa=fwidth(uv)*1.4+vec2(.012);float joint=1.-min(smoothstep(0.,aa.x,edge.x),smoothstep(0.,aa.y,edge.y));diffuseColor.rgb*=1.-joint*.32;`;
          else if(name==='hellPalace')surface=`vec3 face=abs(cross(dFdx(vHellWorld),dFdy(vHellWorld)));vec2 uv=face.x>face.z?vHellWorld.zy:vHellWorld.xy;
            uv/=vec2(4.8,1.5);uv.x+=mod(floor(uv.y),2.)*.5;vec2 joint=abs(fract(uv)-.5);float mortar=max(smoothstep(.474,.495,joint.x),smoothstep(.471,.493,joint.y));diffuseColor.rgb*=1.-mortar*.16;`;
          else if(['hellStone','hellPaving','hellCarving','hellPlaster','hellMarble'].includes(name))surface='float patina=hf(vHellWorld.xz*.69+vHellWorld.y*.12);diffuseColor.rgb*=.92+.12*patina;';
          else if(name==='hellWood')surface='float grain=sin(vHellWorld.y*14.+hf(vHellWorld.xz*.4)*4.);diffuseColor.rgb*=.91+.085*grain;';
          else if(name==='hellWater'||name==='hellOil')surface='float ripple=sin(vHellWorld.x*.27+uHellTime)*sin(vHellWorld.z*.42-uHellTime*.65);diffuseColor.rgb*=.85+.16*ripple;';
          s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n'+surface);
          let emissive=emission[name]?'totalEmissiveRadiance*=vHellColor;':'';
          if(name==='hellLava')emissive=`
            vec2 lp=vHellWorld.xz*.085;float flow=hf(lp+vec2(uHellTime*.012,-uHellTime*.018));
            lp+=vec2(flow,hf(lp+12.))*1.2;vec2 cell=floor(lp),fp=fract(lp);float d1=8.,d2=8.;
            for(int ix=-1;ix<=1;ix++){for(int iz=-1;iz<=1;iz++){vec2 off=vec2(float(ix),float(iz));
              vec2 seed=vec2(hh(cell+off),hh(cell+off+31.));vec2 vv=off+seed-fp;float dd=dot(vv,vv);
              if(dd<d1){d2=d1;d1=dd;}else d2=min(d2,dd);}}
            float crack=1.-smoothstep(.018,.10,d2-d1);float hot=.035+crack*1.8+smoothstep(.52,.70,flow)*.9;
            diffuseColor.rgb=mix(vec3(.035,.022,.02),vec3(.16,.035,.014),flow);
            totalEmissiveRadiance=vec3(1.0,.145,.012)*hot+vec3(1.,.42,.065)*pow(crack,6.)*.4;`;
          if(name==='hellCore')emissive='float f=hf(vHellWorld.xy*.17+uHellTime*.12);totalEmissiveRadiance=mix(vec3(1.4,.12,.003),vec3(4.,1.5,.21),f);';
          s.fragmentShader=s.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n'+emissive);
        };
        mat.customProgramCacheKey=()=> 'old-hell-017-'+name;this.mats[name]=mat;
      }
      this.mats.hellSteam=new T.ShaderMaterial({transparent:true,depthWrite:false,vertexColors:true,side:T.DoubleSide,
        uniforms:{uTime:this.timeUniform},vertexShader:`uniform float uTime;varying vec2 vUv;varying float vFade;void main(){
          vUv=color.xy;float seed=fract(sin(dot(position.xz,vec2(12.73,8.71)))*4173.);float life=fract(seed+uTime*.037);
          vec4 p=modelViewMatrix*vec4(position+vec3(sin(life*6.+seed)*3.,life*25.,0.),1.);
          p.xy+=(color.xy-.5)*color.z*(.65+life);vFade=sin(life*3.14159);gl_Position=projectionMatrix*p;}`,
        fragmentShader:`uniform float uTime;varying vec2 vUv;varying float vFade;${noiseGLSL}
          void main(){float d=length((vUv-.5)*2.);float alpha=(1.-smoothstep(.2,1.,d))*vFade*(.5+hf(vUv*5.+uTime*.04))*.18;
          gl_FragColor=vec4(.38,.44,.49,alpha);}`});
      for(let i=0;i<8;i++){const l=new T.PointLight(0xffb76e,0,40,1.6);l.visible=false;this.scene.add(l);this.hellLights.push(l);}
      this.hellKey=new T.SpotLight(0xffd69e,1200,170,Math.PI*.37,.7,1.4);
      this.hellKey.position.set(0,-251,-126);this.hellKey.target.position.set(0,-282,-135);
      this.hellKey.castShadow=true;this.hellKey.shadow.mapSize.set(1024,1024);this.hellKey.shadow.normalBias=.035;this.hellKey.shadow.bias=-.00003;
      this.hellKey.visible=false;this.scene.add(this.hellKey,this.hellKey.target);
    }
    attachPack(p){super.attachPack(p);if(p.id==='oldhell')this.hellLightSites=p.meta.lights;}
    dropPack(id){super.dropPack(id);if(id==='oldhell'){this.hellLightSites=[];for(const l of this.hellLights||[])l.visible=false;}}
    ensure(r,level){const mesh=super.ensure(r,level);if(['hellSteam','hellEmber'].includes(r.data.material))mesh.frustumCulled=false;return mesh;}
    wanted(r,rig,opts,distance){
      if(opts.space!=='oldhell')return r.data.owner==='oldhell'?false:super.wanted(r,rig,opts,distance);
      const m=r.data;if(m.owner!=='oldhell')return false;
      if(opts.hellSection&&m.hellZone==='cavern')return false;
      if(m.ceiling&&opts.ceiling===false)return false;
      if(opts.vegetation===false&&m.material==='hellGarden')return false;
      r.displayCenter=m.center;r.xf={scale:1,offset:[0,0,0]};r.distance=G.length(G.sub(rig.eye,m.center));
      return G.visibleSphere(rig.planes,m.center,m.radius+8);
    }
    lighting(rig,opts,distance){
      super.lighting(rig,opts,distance);
      const active=opts.space==='oldhell';for(const l of this.hellLights)l.visible=active;
      this.hellKey.visible=active&&['hellHall','hellGallery'].includes(opts.view)&&this.quality!=='low';
      if(!active)return;
      const hall=['hellHall','hellGallery'].includes(opts.view),hot=!opts.hellSection&&rig.target[1]<-440,oil=opts.view==='hellBlood';
      this.activeSpace='oldhell';this.sky.visible=false;this.rain.visible=false;
      this.scene.background.set(oil?0x17131f:hot?0x21191d:0x141b28);
      this.scene.fog.color.copy(this.scene.background);this.scene.fog.near=opts.hellSection?1500:hall?130:hot?260:320;this.scene.fog.far=opts.hellSection?8000:hall?390:hot?1250:1800;
      this.hemisphere.color.set(hall?0xb4b6d0:hot?0x9b7b85:0x8cb5cc);this.hemisphere.groundColor.set(hot?0x994429:0x6b5368);this.hemisphere.intensity=hall?.55:hot?.48:.74;
      this.ambient.color.set(0xc1adc4);this.ambient.intensity=hall?.19:.20;
      this.sun.color.set(hot?0xffa576:0xc7d8ec);this.sun.intensity=hall?.35:hot?.62:1.1;
      this.rim.color.set(hot?0xc05228:0x929ecb);this.rim.intensity=.30;
      if(opts.hellSection){this.hemisphere.intensity=1.05;this.ambient.intensity=.32;this.sun.intensity=1.6;this.rim.intensity=.5;}
      if(oil){this.hemisphere.color.set(0x9698cb);this.hemisphere.groundColor.set(0x5b435e);this.sun.color.set(0xb5a4d3);this.sun.intensity=.9;this.rim.color.set(0x88b2c3);}
      this.weatherSunOffset=hall?[-30,22,90]:[-180,200,120];
      for(const l of [...this.localLights,...this.focusLamps])l.visible=false;
      this.coverUniform.value=0;this.mistUniform.value=0;this.inspectionUniform.value=0;
      for(const [name,m] of Object.entries(this.mats))if(name.startsWith('hell'))m.envMapIntensity=hot?.08:.13;
      const ordered=this.hellLightSites.map(p=>({p,d:G.length(G.sub(rig.eye,p.p))*.6+G.length(G.sub(rig.target,p.p))*.4-(p.zone==='reactor'?80:0)})).sort((a,b)=>a.d-b.d);
      for(let i=0;i<this.hellLights.length;i++){const l=this.hellLights[i],site=ordered[i]?.p;l.visible=!!site;if(!site)continue;l.position.fromArray(site.p);l.color.set(site.color);l.distance=site.distance;l.intensity=site.power*(.98+.02*Math.sin(this.timeUniform.value*1.9+i));}
    }
    post(enabled,exposure){if(this.currentOptions.space==='oldhell')return studioPost.call(this,enabled,this.currentOptions.view==='hellHall'?1.10:.98);return super.post(enabled,exposure);}
    render(rig,opts={}){super.render(rig,opts.space==='oldhell'?{...opts,weather:'clear',lighting:'neutral'}:opts);if(opts.space==='oldhell'){this.stats.underground='旧地狱';this.stats.localLightCount=this.hellLights.filter(l=>l.visible).length;}}
    dispose(){for(const l of [...this.hellLights,this.hellKey]){this.scene.remove(l);l.dispose();}this.scene.remove(this.hellKey.target);super.dispose();}
  }
  G.DioramaRenderer=HellRenderer;
})(globalThis.GA);
