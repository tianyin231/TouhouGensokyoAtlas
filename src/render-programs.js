/* 着色器程序调度。
 * ANGLE/D3D 下单个程序约 100–200ms，three 默认在首次绘制时逐个同步等待，
 * 切区时主线程会冻结数秒。这里把链接成批提前发出（驱动并行编译），未就绪的
 * 内容先不提交：新区域在 prepareAttach 完成前继续显示总览代理，其他情况
 * 隐藏新物体或保持上一帧。不改变任何模型、材质或 LOD 选择。 */
(function(G){'use strict';
const Base=G.DioramaRenderer;
const TIMEOUT_MS=20000;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const combo=(material,instanced)=>material.id*2+(instanced?1:0);
const meshCombo=mesh=>combo(mesh.material,mesh.isInstancedMesh===true);

class ProgramRenderer extends Base{
 constructor(T,canvas,world){
  super(T,canvas,world);
  this.programReady=new Map();// 灯光签名 → 已就绪的材质组合
  this.programPending=new Map();// 材质组合 → 灯光签名
  this.programBatchAt=0;this.programPoll=0;this.planOnly=false;
  this.programStats={batches:0,combos:0,heldFrames:0,partialFrames:0,timeouts:0,attachWaitMs:0,firstFrameMs:0};
  this.parallelCompile=!!this.engine.extensions.get('KHR_parallel_shader_compile');
  const geometry=new T.BufferGeometry();
  for(const name of ['position','normal','color'])geometry.setAttribute(name,new T.BufferAttribute(new Float32Array(9),3));
  this.programProbeGeometry=geometry;
  this.onProgramContextRestored=()=>{this.programReady.clear();this.programPending.clear();};
  canvas.addEventListener('webglcontextrestored',this.onProgramContextRestored);this.programCanvas=canvas;
 }
 // 与 three 的灯光状态散列对应：这些计数变化时所有受光程序都要换变体。
 programSignature(){
  let dir=0,point=0,spot=0,hemi=0,dirShadow=0,spotShadow=0;
  for(const c of this.scene.children){
   if(!c.isLight||!c.visible)continue;
   if(c.isDirectionalLight){dir++;if(c.castShadow)dirShadow++;}
   else if(c.isPointLight)point++;
   else if(c.isSpotLight){spot++;if(c.castShadow)spotShadow++;}
   else if(c.isHemisphereLight)hemi++;
  }
  return dir+':'+point+':'+spot+':'+hemi+':'+dirShadow+':'+spotShadow+':'+(this.engine.shadowMap.enabled?1:0);
 }
 readySet(signature){
  let ready=this.programReady.get(signature);
  if(!ready)this.programReady.set(signature,ready=new Set());
  return ready;
 }
 // compile 只读取 traverse／traverseVisible，传入精简集合避免遍历整个场景。
 compileObjects(objects){
  const e=this.engine,target=e.getRenderTarget(),list=[...objects];
  e.setRenderTarget(this.sceneTarget);
  try{e.compile({traverse:visit=>list.forEach(visit),traverseVisible(){}},this.camera,this.scene);}
  finally{e.setRenderTarget(target);}
  this.programStats.batches++;this.programStats.combos+=list.length;
 }
 programsSettled(){for(const program of this.engine.info.programs)if(!program.isReady())return false;return true;}
 unsettledPrograms(){let n=0;for(const program of this.engine.info.programs)if(!program.isReady())n++;return n;}
 programProbe(material,instanced){
  if(!instanced)return new this.T.Mesh(this.programProbeGeometry,material);
  const mesh=new this.T.InstancedMesh(this.programProbeGeometry,material,1);
  mesh.instanceColor=new this.T.InstancedBufferAttribute(new Float32Array(3),3);
  return mesh;
 }
 scheduleProgramPoll(){
  if(this.programPoll)return;
  this.programPoll=setTimeout(()=>{this.programPoll=0;if(this.programPending.size)globalThis.ATLAS?.wake?.();},16);
 }
 // 所有规划已完成、尚无任何绘制时调用；返回 true 表示本帧不提交，保持上一帧。
 holdPasses(rig,opts){
  if(super.holdPasses?.(rig,opts)||this.planOnly)return true;
  const signature=this.programSignature(),ready=this.readySet(signature),pending=this.programPending;
  let fresh=null;
  for(const item of this.objects){
   const mesh=item.mesh;if(!mesh.visible)continue;
   const key=meshCombo(mesh);
   if(ready.has(key)||pending.get(key)===signature)continue;
   (fresh??=new Map()).set(key,mesh);
  }
  if(fresh){
   this.compileObjects(fresh.values());
   for(const key of fresh.keys())pending.set(key,signature);
   this.programBatchAt=performance.now();
  }
  if(!pending.size)return false;
  const paused=!!globalThis.ATLAS_TEST_PAUSE,expired=performance.now()-this.programBatchAt>TIMEOUT_MS;
  if(expired)this.programStats.timeouts++;
  // 固定帧测试要求 renderOnce 一次画完；不支持并行扩展时也只能退回同步等待。
  if(paused||expired||!this.parallelCompile||this.programsSettled()){
   for(const [key,sig] of pending)this.readySet(sig).add(key);
   pending.clear();return false;
  }
  let held=0,total=0,critical=false;
  for(const item of this.objects){
   const mesh=item.mesh;if(!mesh.visible)continue;total++;
   if(!pending.has(meshCombo(mesh)))continue;held++;
   if(item.data.group==='terrain'||item.data.globalSurface)critical=true;
  }
  this.scheduleProgramPoll();
  // 地表缺块或大半画面未就绪时，保持上一帧比露出空洞好；界面仍可操作。
  if(critical||held>total*.4){this.programStats.heldFrames++;return true;}
  for(const item of this.objects)if(item.mesh.visible&&pending.has(meshCombo(item.mesh)))item.mesh.visible=false;
  this.programStats.partialFrames++;return false;
 }
 async settlePrograms(alive,progress){
  const start=performance.now(),total=this.unsettledPrograms();
  while(performance.now()-start<TIMEOUT_MS){
   const left=this.unsettledPrograms();
   progress?.(total-left,total);
   if(!left)return true;
   if(!alive())return false;
   await wait(16);
  }
  this.programStats.timeouts++;return false;
 }
 // 详情包替换代理前调用。this.material 与 ensure 使用同一选择逻辑。
 async prepareAttach(pack,alive=()=>true){
  if(!this.parallelCompile)return;
  const ready=this.readySet(this.programSignature()),probes=new Map();
  for(const m of pack.meshes){
   const material=this.material(m),key=combo(material,!!m.instances);
   if(!ready.has(key)&&!probes.has(key))probes.set(key,this.programProbe(material,!!m.instances));
  }
  if(!probes.size)return;
  const start=performance.now();
  this.compileObjects(probes.values());
  await this.settlePrograms(alive);
  this.programStats.attachWaitMs+=performance.now()-start;
  if(alive())for(const key of probes.keys())ready.add(key);
 }
 // 启动：一次发出地表全部总览材质，而不是在首帧里逐个等待。
 async prepareFirstFrame(rig,opts,progress){
  const start=performance.now();
  this.planOnly=true;
  try{this.render(rig,opts);}finally{this.planOnly=false;}
  if(!this.parallelCompile)return;
  const ready=this.readySet(this.programSignature()),objects=new Map();
  for(const item of this.objects)if(item.mesh.visible)objects.set(meshCombo(item.mesh),item.mesh);
  for(const record of this.records){
   const m=record.data;if((m.space||'surface')!=='surface')continue;
   const material=this.material(m),key=combo(material,!!m.instances);
   if(!objects.has(key))objects.set(key,this.programProbe(material,!!m.instances));
  }
  this.compileObjects(objects.values());
  await this.settlePrograms(()=>true,progress);
  for(const key of objects.keys())ready.add(key);
  this.programStats.firstFrameMs=performance.now()-start;
 }
 render(rig,opts={}){
  super.render(rig,opts);
  this.stats.programs={...this.programStats,total:this.engine.info.programs?.length||0,pending:this.programPending.size};
 }
 dispose(){
  clearTimeout(this.programPoll);this.programCanvas.removeEventListener('webglcontextrestored',this.onProgramContextRestored);
  this.programProbeGeometry.dispose();super.dispose();
 }
}
G.DioramaRenderer=ProgramRenderer;
})(globalThis.GA);
