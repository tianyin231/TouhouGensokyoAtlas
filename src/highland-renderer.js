/* Surface extension. Keep the shared sky, weather, all old lights and camera behavior. */
(function(G){'use strict';const Base=G.DioramaRenderer;
class HighlandRenderer extends Base{
 constructor(T,canvas,world){super(T,canvas,world);this.shelfClock={value:0};
  for(const[k,rough,metal]of[['Ground',.97,0],['Stone',.92,0],['Wood',.79,0],['Wall',.96,0],['Roof',.68,.04],['Edge',.66,.09],['Paper',.97,0],['Cloth',.96,0],['Dark',.92,0],['Metal',.39,.55],['Leaf',.95,0],['Lamp',.8,0]]){const m=new T.MeshStandardMaterial({vertexColors:true,roughness:rough,metalness:metal,side:T.DoubleSide});m.envMap=this.studioEnv.texture;m.envMapIntensity=.16;m.name='highland-'+k;this.mats['shelf'+k]=m;}
  this.mats.shelfLamp.emissive.set(0xffd5a0);this.mats.shelfLamp.emissiveIntensity=.6;
  this.mats.shelfSmoke=new T.ShaderMaterial({vertexColors:true,side:T.DoubleSide,transparent:true,depthWrite:false,uniforms:{uTime:this.shelfClock},vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`uniform float uTime;varying vec3 vP;void main(){vec2 p=vP.xz-vec2(${G.HIGHLAND.CX}.0,${G.HIGHLAND.CZ}.0);float edge=(1.-smoothstep(12.,21.,abs(p.x)))*(1.-smoothstep(5.,11.,abs(p.y)));float wave=.5+.5*sin(p.x*.31+sin(p.y*.4+uTime*.24));gl_FragColor=vec4(.59,.63,.57,edge*wave*.08);}`,toneMapped:false});
  this.shelfFill=new T.PointLight(0xffdda9,85,65,1.5);this.shelfFill.position.set(G.HIGHLAND.CX,G.HIGHLAND.Y+10,G.HIGHLAND.CZ-2);this.shelfFill.visible=false;this.scene.add(this.shelfFill);
 }
 wanted(r,rig,o,d){const m=r.data;if(m.owner==='highland'){
   if(o.space!=='surface')return false;
   if(m.highlandPart==='session'&&o.highlandClosed)return false;
   if(o.highlandSection&&(m.highlandPart==='roof'||m.highlandZone==='den'&&['Wall','Paper'].some(k=>m.material==='shelf'+k)))return false;
  }
  return super.wanted(r,rig,o,d);
 }
 lighting(rig,o,d){super.lighting(rig,o,d);this.shelfFill.visible=o.space==='surface'&&o.focus==='highland'&&!!o.highlandInterior&&!o.highlandClosed&&this.packs.has('highland');}
 render(rig,o={}){this.shelfClock.value=o.time||0;super.render(rig,o);}
 dropPack(id){super.dropPack(id);if(id==='highland'&&this.shelfFill)this.shelfFill.visible=false;}
 dispose(){this.scene.remove(this.shelfFill);this.shelfFill.dispose();super.dispose();}
}G.DioramaRenderer=HighlandRenderer;
})(globalThis.GA);
