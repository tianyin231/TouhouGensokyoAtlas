/* 一次烘焙的线性地表数据纹理，供地表、道路和路肩共同取色。
 * 一次纹理采样替代逐片元道路搜索，不新增道路几何或灯光。 */
(function(G){'use strict';
const Base=G.DioramaRenderer,marked=new WeakSet(),spheres=new WeakMap();
const terrain=m=>m.component==='island-terrain'&&m.tile&&m.tile[0]<-560&&m.tile[0]+m.tile[2]>-896&&m.tile[1]<112&&m.tile[1]+m.tile[2]>-128;
function inject(mat,texture){
 if(marked.has(mat))return mat;
 const prior=mat.onBeforeCompile,key=mat.customProgramCacheKey.bind(mat);
 mat.onBeforeCompile=(s,r)=>{prior.call(mat,s,r);
  s.uniforms.uPilotField={value:texture};
  s.vertexShader='varying vec3 vPilotWorld;\n'+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvPilotWorld=(modelMatrix*vec4(transformed,1.)).xyz;');
  s.fragmentShader='varying vec3 vPilotWorld; uniform sampler2D uPilotField;\n'+s.fragmentShader;
  // 放在旧道路/庭院颜色链之后。中心与两侧来自同一个绝对目标色。
  s.fragmentShader=s.fragmentShader.replace('#include <alphamap_fragment>',`
   vec2 pilotUV=(vPilotWorld.xz-vec2(-896.,-128.))/vec2(336.,240.);
   vec4 pilotField=texture2D(uPilotField,pilotUV);
   float pilotFine=(1.-smoothstep(.10,.40,length(fwidth(vPilotWorld.xz))))*(1.-smoothstep(60.,120.,length(vViewPosition)));
   float pilotGrain=sin(vPilotWorld.x*12.7+sin(vPilotWorld.z*6.3))*sin(vPilotWorld.z*15.1);
   diffuseColor.rgb=mix(diffuseColor.rgb,pilotField.rgb*(1.+pilotGrain*.025*pilotFine),pilotField.a);
   #include <alphamap_fragment>
  `);
 };
 mat.customProgramCacheKey=()=>key()+'-forest-pilot-field-3';mat.needsUpdate=true;marked.add(mat);return mat;
}
G.DioramaRenderer=class extends Base{
 forestPilotTexture(){
  if(this.pilotFieldTexture)return this.pilotFieldTexture;
  const T=this.T,field=G.FOREST_PILOT.groundField(),texture=new T.DataTexture(field.values,field.width,field.height,T.RGBAFormat,T.UnsignedByteType);
  texture.name='forest-pilot-linear-field';texture.colorSpace=T.NoColorSpace;
  texture.wrapS=texture.wrapT=T.ClampToEdgeWrapping;texture.minFilter=texture.magFilter=T.LinearFilter;
  texture.generateMipmaps=false;texture.needsUpdate=true;
  // CPU 数据始终保留，WebGL context 恢复时 Three 可直接重新上传。
  this.pilotFieldTexture=texture;return texture;
 }
 forestPathMaterial(shoulder){return inject(super.forestPathMaterial(shoulder),this.forestPilotTexture());}
 material(m){
  const old=super.material(m);
  if(!terrain(m))return old;
  // 入口保留既有微表面链，只追加局部字段，范围外纹理不变。
  if(m.material==='landscapeGround')return inject(old,this.forestPilotTexture());
  if(!this.pilotGround){
   let source=this.mats.ground;
   if(this.kourindouGroundVariant)source=this.kourindouGroundVariant(source,false);
   if(this.forestGround)source=this.forestGround(source,false);
   const mat=source.clone();mat.onBeforeCompile=source.onBeforeCompile;mat.customProgramCacheKey=source.customProgramCacheKey.bind(source);
   mat.name='forest-pilot-ground';this.pilotGround=inject(mat,this.forestPilotTexture());this.mats[mat.name]=mat;
  }
  return this.pilotGround;
 }
 wanted(record,rig,opts,distance){
  if(!record.data.forestPilot)return super.wanted(record,rig,opts,distance);
  if(!super.wanted(record,rig,opts,distance))return false;
  const source=this.recordMap.get(record.data.terrainSource);
  return !!source&&super.wanted(source,rig,opts,distance);
 }
 ensure(record,level){
  const mesh=super.ensure(record,level),m=record.data;if(!m.forestPilot)return mesh;
  if(!spheres.has(m))spheres.set(m,new this.T.Sphere(new this.T.Vector3(...m.center),m.radius));
  mesh.boundingSphere=spheres.get(m);return mesh;
 }
 dispose(){
  // 必须先释放纹理：父链最终 engine.dispose() 会清掉 Three 的 GL 句柄表。
  const texture=this.pilotFieldTexture;this.pilotFieldTexture=null;
  try{texture?.dispose();}finally{super.dispose();}
 }
};
})(globalThis.GA);
