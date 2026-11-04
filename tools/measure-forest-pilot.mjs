// 通过 Playwright CLI run-code 调用；对原版和候选使用同一协议，不改性能阈值。
export async function collectForestPilot(page, config) {
 const {label, output}=config;
 await page.evaluate(()=>{globalThis.ATLAS_TEST_PAUSE=true;Object.assign(ATLAS.state,{motion:false,clock:12.5,quality:'balanced',lighting:'neutral',weather:'clear',ao:true,bloom:false,reflections:false,labels:false,characters:false,uiHidden:true});ATLAS.renderer.setQuality('balanced');document.body.classList.add('ui-hidden');});
 const frames=[];
 for(const view of ['forestApproach','forest','kourindou','marisa']){
  await page.evaluate(v=>ATLAS.setView(v,false),view);
  await page.waitForFunction(()=>ATLAS.stream.cache.has('forest')&&!ATLAS.stream.pending&&[...ATLAS.stream.required].every(id=>ATLAS.stream.cache.has(id)),undefined,{timeout:90000});
  await page.evaluate(async()=>{for(let i=0;i<8;i++){await new Promise(requestAnimationFrame);ATLAS.renderOnce();}});
  await page.screenshot({path:output+'/'+label+'-'+view+'.png'});
  frames.push(await page.evaluate(()=>({view:ATLAS.state.view,camera:{eye:ATLAS.rig.eye.slice(),target:ATLAS.rig.target.slice(),fov:ATLAS.rig.fov},stats:{...ATLAS.renderer.stats},batch:{...ATLAS.renderer.forestBatchingStats}})));
 }
 await page.evaluate(()=>{ATLAS.setView('forest',false);const t=ATLAS.world.terrain;ATLAS.rig.setView({eye:[-655,t.height(-655,20)+5,20],target:[-715,t.height(-715,-10)+2,-10]},false);ATLAS.rig.fov=64;});
 await page.evaluate(async()=>{for(let i=0;i<8;i++){await new Promise(requestAnimationFrame);ATLAS.renderOnce();}});
 await page.screenshot({path:output+'/'+label+'-corridor.png'});
 frames.push(await page.evaluate(()=>({view:'corridor',camera:{eye:ATLAS.rig.eye.slice(),target:ATLAS.rig.target.slice(),fov:ATLAS.rig.fov},stats:{...ATLAS.renderer.stats},batch:{...ATLAS.renderer.forestBatchingStats}})));
 const result=await page.evaluate(async()=>{
  const A=ATLAS,g=A.renderer.engine.getContext(),ext=g.getExtension('EXT_disjoint_timer_query_webgl2'),driver=g.getExtension('WEBGL_debug_renderer_info');
  const raw=[],pending=[],gpu=[];
  const points=GA.FOREST.paths.find(p=>p.id==='forest-entry').samples.filter(p=>p[0]<-595);
  function pose(t){const s=t*(points.length-1),i=Math.min(points.length-2,Math.floor(s)),u=s-i;const a=points[i],b=points[i+1],x=a[0]+(b[0]-a[0])*u,z=a[1]+(b[1]-a[1])*u,d=Math.hypot(b[0]-a[0],b[1]-a[1]),tx=x+(b[0]-a[0])/d*36,tz=z+(b[1]-a[1])/d*36;A.rig.eye=[x,A.world.terrain.height(x,z)+5,z];A.rig.target=[tx,A.world.terrain.height(tx,tz)+3,tz];A.rig.fromEye();A.rig.fov=64;}
  for(let i=0;i<60;i++){await new Promise(requestAnimationFrame);pose(i/59);A.renderOnce();}
  let previous=0,disjoint=false;
  for(let i=0;i<240;i++){
   const stamp=await new Promise(requestAnimationFrame);pose(i/239);
   const q=ext?g.createQuery():null;if(q)g.beginQuery(ext.TIME_ELAPSED_EXT,q);
   const start=performance.now();A.renderOnce();const cpu=performance.now()-start;
   if(q){g.endQuery(ext.TIME_ELAPSED_EXT);pending.push(q);}
   while(pending.length&&g.getQueryParameter(pending[0],g.QUERY_RESULT_AVAILABLE)){const ready=pending.shift();gpu.push(g.getQueryParameter(ready,g.QUERY_RESULT)/1e6);g.deleteQuery(ready);}
   if(ext&&g.getParameter(ext.GPU_DISJOINT_EXT))disjoint=true;
   raw.push({cpuMs:cpu,intervalMs:previous?stamp-previous:null,calls:A.renderer.stats.totalCalls,triangles:A.renderer.stats.totalTriangles,attributeMiB:A.renderer.residentBytes/1048576});previous=stamp;
  }
  for(let i=0;i<30&&pending.length;i++){await new Promise(requestAnimationFrame);while(pending.length&&g.getQueryParameter(pending[0],g.QUERY_RESULT_AVAILABLE)){const q=pending.shift();gpu.push(g.getQueryParameter(q,g.QUERY_RESULT)/1e6);g.deleteQuery(q);}}
  pending.forEach(q=>g.deleteQuery(q));
  const summary=a=>{const v=a.filter(Number.isFinite).sort((a,b)=>a-b);return{median:v[Math.floor(v.length*.5)],p95:v[Math.floor(v.length*.95)],mean:v.reduce((s,x)=>s+x,0)/v.length,count:v.length}};
  return{driver:driver?g.getParameter(driver.UNMASKED_RENDERER_WEBGL):g.getParameter(g.RENDERER),viewport:[innerWidth,innerHeight,devicePixelRatio],firstFrameMs:A.state.firstFrameMs,cpu:summary(raw.map(x=>x.cpuMs)),frameInterval:summary(raw.map(x=>x.intervalMs)),gpu:ext&&!disjoint?summary(gpu):null,gpuDisjoint:disjoint,calls:summary(raw.map(x=>x.calls)),triangles:summary(raw.map(x=>x.triangles)),raw,stream:A.stream.info(),errors:globalThis.__pilot?.errors||[],route:points};
 });
 await page.evaluate(r=>globalThis.__pilotResult=r,{label,frames,...result});
 return {label,protocol:'固定路线逐帧提交；CPU 含页面绘制与 GPU 查询开销，GPU 为全部绘制通道查询；rAF 间隔受刷新率限制，不换算用户 FPS。',frames,...result};
}
