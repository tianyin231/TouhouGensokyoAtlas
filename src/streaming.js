/* A detail task owns its worker and buffers. Overview is available independently.
   Cancellation terminates that task; late results are never installed. */
(function(G){'use strict';
class RegionStreaming{
 constructor(data,renderer,source,legacy,onChange=()=>{}){this.data=data;this.renderer=renderer;this.source=source;this.legacy=legacy;this.changed=onChange;this.cache=new Map();this.epoch=0;this.pending=null;this.disposed=false;this.required=new Set();this.budget=220*1048576;this.metrics={requests:0,builds:0,cancelled:0,evictions:0,cacheHits:0,staleDropped:0};this.log=[];this.timer=setInterval(()=>this.trim(),2000);}
 async focus(ids){if(this.disposed)return;const key=ids.join('|');if(this.focusKey===key&&this.pending)return;this.focusKey=key;const token=++this.epoch;this.cancel();this.required=new Set(ids);this.trim();for(const id of ids){if(this.disposed||token!==this.epoch)return;if(this.cache.has(id)){this.cache.get(id).last=performance.now();this.metrics.cacheHits++;continue;}try{const p=await this.task(id,token);if(this.disposed)return;if(!p||token!==this.epoch){this.metrics.staleDropped++;continue;}this.renderer.attachPack(p);this.cache.set(id,{pack:p,last:performance.now()});this.metrics.builds++;this.log.push({region:id,buildMs:p.builtMs,sourceBytes:p.bytes,epoch:token});this.log=this.log.slice(-80);this.changed({region:id,ready:true});this.trim();}catch(e){if(e.name==='AbortError'||this.disposed||token!==this.epoch)return;this.changed({region:id,error:e.message});console.error('Region build:',id,e);}}
 }
 task(id,token){
  if(this.disposed)return Promise.reject(new DOMException('区域构建器已关闭','AbortError'));
  this.metrics.requests++;this.changed({region:id,loading:true});
  if(this.disposed)return Promise.reject(new DOMException('区域构建器已关闭','AbortError'));
  return new Promise((resolve,reject)=>{
   let worker=null,url=null,settled=false;
   const task={worker:null,id,token,startedAt:performance.now(),reject:error=>settle(error)};
   const revoke=()=>{if(url!==null){URL.revokeObjectURL(url);url=null;}};
   // Every completion path owns the same cleanup. Epochs can be shared by
   // multiple sequential regions, so clear pending by task identity only.
   const settle=(error,pack)=>{
    if(settled)return;settled=true;
    if(this.pending===task)this.pending=null;
    if(worker){worker.onmessage=null;worker.onerror=null;worker.onmessageerror=null;worker.terminate();worker=null;task.worker=null;}
    revoke();if(error)reject(error);else resolve(pack);
   };
   try{
    const workerText=this.source+`\nself.onmessage=async e=>{try{const p=await GA.buildRegion(e.data.data,e.data.id,e.data.legacy);const buffers=new Set();for(const m of p.meshes)for(const k of ['vertices','farVertices','instances','instanceColors','index'])if(m[k])buffers.add(m[k].buffer);self.postMessage({epoch:e.data.epoch,pack:p},[...buffers]);}catch(e){self.postMessage({error:e.message,stack:e.stack});}};`;
    url=URL.createObjectURL(new Blob([workerText],{type:'text/javascript'}));
    try{worker=new Worker(url);}catch(e){settle(new Error('浏览器未允许本地模型构建 Worker：'+e.message));return;}
    task.worker=worker;this.pending=task;
    worker.onmessage=e=>{if(e.data.error)settle(new Error(e.data.error));else settle(null,e.data.pack);};
    worker.onerror=e=>settle(new Error(e.message||'区域构建 Worker 出错'));
    worker.onmessageerror=()=>settle(new Error('区域构建 Worker 消息无法解码'));
    worker.postMessage({data:this.data,id,epoch:token,legacy:this.legacy});revoke();
   }catch(e){settle(e);}
  });
 }
 cancel(){if(this.pending){this.pending.reject(new DOMException('已取消过期区域构建','AbortError'));this.metrics.cancelled++;}}
 trim(force=false){const now=performance.now();let bytes=this.bytes();for(const [id,v] of [...this.cache].sort((a,b)=>a[1].last-b[1].last)){if(this.required.has(id)){v.last=now;continue;}if(force||now-v.last>5500||bytes>this.budget||this.cache.size>2){this.renderer.dropPack(id);bytes-=v.pack.bytes;this.cache.delete(id);this.metrics.evictions++;this.changed({region:id,evicted:true});}}this.renderer.trim(force);}
 bytes(){return [...this.cache.values()].reduce((a,v)=>a+v.pack.bytes,0);}
 info(){return{...this.metrics,cached:[...this.cache.keys()],building:this.pending?.id||null,required:[...this.required],detailSourceMiB:this.bytes()/1048576,softBudgetMiB:this.budget/1048576,log:this.log.slice()};}
 dispose(){if(this.disposed)return;this.disposed=true;this.epoch++;this.cancel();clearInterval(this.timer);this.required.clear();this.trim(true);this.legacy='';this.source='';}
}
G.RegionStreaming=RegionStreaming;
})(globalThis.GA);
