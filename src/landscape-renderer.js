/* 样板材质与受限路线步行；其余空间继续使用原有渲染器和镜头。 */
(function(G){'use strict';
const noiseGLSL=`
varying vec3 vLandscapePosition;
float landscapeHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float landscapeNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(landscapeHash(i),landscapeHash(i+vec2(1,0)),f.x),mix(landscapeHash(i+vec2(0,1)),landscapeHash(i+vec2(1,1)),f.x),f.y);}
`;
class LandscapeRenderer extends G.DioramaRenderer{
 constructor(T,canvas,world){super(T,canvas,world);
  for(const [name,base,rough]of[['landscapeGround','ground',.96],['landscapeEarth','ground',.97],['landscapeStone','matte',.88],['landscapeLeaf','foliage',.90]]){
   const source=this.mats[base],m=source.clone(),prior=source.onBeforeCompile;m.name=name;m.roughness=rough;
   m.onBeforeCompile=(s,r)=>{prior?.call(source,s,r);
    s.vertexShader='varying vec3 vLandscapePosition;\n'+s.vertexShader;
    s.vertexShader=s.vertexShader.replace('#include <project_vertex>',`vec4 landscapeP=vec4(transformed,1.);
    #ifdef USE_INSTANCING
      landscapeP=instanceMatrix*landscapeP;
    #endif
    vLandscapePosition=(modelMatrix*landscapeP).xyz;
    #include <project_vertex>`);
    s.fragmentShader=noiseGLSL+s.fragmentShader;
    if(name==='landscapeLeaf'){
     s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
       float leafVariation=landscapeNoise(vLandscapePosition.xz*1.9+vLandscapePosition.y*.8);
       diffuseColor.rgb*=.88+.20*leafVariation;`);
    }else{
     s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
       vec2 soilP=vLandscapePosition.xz;
       float soilMacro=landscapeNoise(soilP*.12);
       float soilGrain=landscapeNoise(soilP*5.6);
       float grainVisibility=1.-smoothstep(.12,.65,length(fwidth(soilP)));
       diffuseColor.rgb*=.86+soilMacro*.19+(soilGrain-.5)*.12*grainVisibility;`);
     s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
       float microFade=1.-smoothstep(45.,160.,length(vViewPosition));
       float soilHeight=(landscapeNoise(vLandscapePosition.xz*.8)*.095+landscapeNoise(vLandscapePosition.xz*5.6)*.016)*microFade;
       vec3 soilDx=dFdx(-vViewPosition),soilDy=dFdy(-vViewPosition);
       vec3 soilRx=cross(soilDy,normal),soilRy=cross(normal,soilDx);
       float soilDet=dot(soilDx,soilRx);
       vec3 soilGradient=sign(soilDet)*(dFdx(soilHeight)*soilRx+dFdy(soilHeight)*soilRy);
       normal=normalize(abs(soilDet)*normal-soilGradient);`);
    }
   };
   m.customProgramCacheKey=()=>name+'-quality-1';this.mats[name]=m;
  }
 }
}
G.DioramaRenderer=LandscapeRenderer;

class LandscapeCamera extends G.CameraRig{
 constructor(...args){super(...args);window.addEventListener('keydown',e=>{if(this.mode==='walk'&&e.code==='Space'&&!e.repeat&&!/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)){e.preventDefault();this.walkAuto=!this.walkAuto;this.changed();}});}
 setView(view,animate=true){super.setView(view,view.walkPath?false:animate);this.walkTrack=null;this.walkAuto=false;
  if(view.walkPath){let length=0;const nodes=view.walkPath.map((p,i,a)=>{if(i)length+=Math.hypot(p[0]-a[i-1][0],p[1]-a[i-1][1]);return{p,length};});
   this.walkTrack={nodes,length};this.walkDistance=0;this.walkSide=0;this.walkLook=[0,0];this.mode='walk';this.updateWalk(0);
  }
 }
 sampleWalk(d){const nodes=this.walkTrack.nodes;d=G.clamp(d,0,this.walkTrack.length);let i=1;while(i<nodes.length-1&&nodes[i].length<d)i++;const a=nodes[i-1],b=nodes[i],u=(d-a.length)/(b.length-a.length);return a.p.map((v,k)=>G.mix(v,b.p[k],u));}
 updateWalk(dt){const k=this.keys,speed=k.has('ShiftLeft')?9:5.2;
  if(k.has('KeyS')||k.has('ArrowDown'))this.walkAuto=false;
  const forward=(this.walkAuto||k.has('KeyW')||k.has('ArrowUp')?1:0)-(k.has('KeyS')||k.has('ArrowDown')?1:0);
  const sideways=(k.has('KeyD')||k.has('ArrowRight')?1:0)-(k.has('KeyA')||k.has('ArrowLeft')?1:0);
  this.walkDistance=G.clamp(this.walkDistance+forward*dt*speed,0,this.walkTrack.length);
  if(this.walkDistance===this.walkTrack.length)this.walkAuto=false;
  this.walkSide=G.clamp(this.walkSide+sideways*dt*1.8,-1.15,1.15);
  const p=this.sampleWalk(this.walkDistance),a=this.sampleWalk(this.walkDistance-2),b=this.sampleWalk(this.walkDistance+2),len=Math.hypot(b[0]-a[0],b[1]-a[1]);
  const x=p[0]-(b[1]-a[1])/len*this.walkSide,z=p[1]+(b[0]-a[0])/len*this.walkSide;
  this.eye=[x,this.terrain.height(x,z)+1.82,z];
  this.flyYaw=Math.atan2(b[0]-a[0],b[1]-a[1])+this.walkLook[0];
  const grade=(this.terrain.height(...b)-this.terrain.height(...a))/len;
  this.flyPitch=G.clamp(Math.atan(grade)*.65+this.walkLook[1],-1.1,1.1);
  this.target=G.add(this.eye,G.mul(this.direction(),35));this.updateMatrices();
 }
 update(dt){if(this.mode==='walk'&&this.walkTrack){this.updateWalk(dt);return;}super.update(dt);}
 rotate(dx,dy){if(this.mode!=='walk')return super.rotate(dx,dy);this.walkLook[0]-=dx*.003;this.walkLook[1]=G.clamp(this.walkLook[1]-dy*.0025,-.85,.85);this.changed();}
 pan(dx,dy){if(this.mode==='walk')return this.rotate(dx,dy);super.pan(dx,dy);}
 zoom(delta){if(this.mode==='walk')return;super.zoom(delta);}
 toggleFly(){if(this.mode==='walk'){this.walkTrack=null;this.walkAuto=false;this.mode='orbit';this.fromEye();}return super.toggleFly();}
}
G.CameraRig=LandscapeCamera;
})(globalThis.GA);
