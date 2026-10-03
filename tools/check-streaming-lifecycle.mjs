// CPU fault injection against the actual streaming implementation; no WebGL.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

export async function checkStreamingLifecycle(read){
 const source=read('src/streaming.js').toString();
 const harness=()=>{
  const h={workers:[],urls:new Set(),revocations:[],timers:new Set(),changes:[],attached:[],dropped:[],packs:new Map(),creationFailures:0};
  let nextURL=0,nextTimer=0;
  class Worker{
   constructor(url){assert(h.urls.has(url));if(h.creationFailures){h.creationFailures--;throw new Error('Injected Worker construction failure');}this.terminated=false;this.terminationCalls=0;h.workers.push(this);}
   postMessage(data){this.message=structuredClone(data);}
   terminate(){this.terminationCalls++;this.terminated=true;}
   result(pack){this.onmessage?.({data:{epoch:this.message.epoch,pack}});}
  }
  const renderer={attachPack:p=>{h.attached.push(p.id);h.packs.set(p.id,p);},dropPack:id=>{h.dropped.push(id);h.packs.delete(id);},trim:()=>{}};
  const context=vm.createContext({GA:{},performance,Blob,DOMException,Worker,
   console:{error:()=>{}},
   setInterval:()=>{const id=++nextTimer;h.timers.add(id);return id;},clearInterval:id=>h.timers.delete(id),
   URL:{createObjectURL:()=>{const url='blob:test-'+(++nextURL);h.urls.add(url);return url;},revokeObjectURL:url=>{assert(h.urls.delete(url),'Blob URL revoked twice');h.revocations.push(url);}}
  });
  vm.runInContext(source,context,{filename:'src/streaming.js'});
  h.stream=new context.GA.RegionStreaming({},renderer,'// test builder','legacy',change=>{h.changes.push(change);h.onChange?.(change);});
  h.last=()=>h.workers.at(-1);
  h.clean=()=>{
   assert.equal(h.stream.pending,null,'Completed task remains pending');
   assert.equal(h.urls.size,0,'Worker URL remains live');
   for(const w of h.workers){assert(w.terminated,'Worker still alive');assert.equal(w.terminationCalls,1,'Worker terminated more than once');assert.equal(w.onmessage,null);assert.equal(w.onerror,null);assert.equal(w.onmessageerror,null);}
  };
  h.dispose=()=>{h.stream.dispose();h.clean();assert.equal(h.timers.size,0);assert.equal(h.stream.cache.size,0);assert.equal(h.packs.size,0);};
  return h;
 };
 const pack=id=>({id,meshes:[],signs:[],bytes:108,builtMs:1});
 const checks=[];

 {
  const h=harness(),s=h.stream,loading=s.focus(['first','second']);
  h.last().result(pack('first'));await Promise.resolve();
  assert.equal(h.workers.length,2,'Sequential region did not start');
  h.last().result(pack('second'));await loading;
  assert.deepEqual(h.attached,['first','second']);assert.equal(s.metrics.builds,2);assert.equal(s.bytes(),216);h.clean();
  await s.focus(['first']);assert.equal(h.workers.length,2);assert.equal(s.metrics.cacheHits,1);
  assert.equal(s.budget,220*1048576);h.dispose();checks.push('normal sequential loads and cache hits');
 }
 {
  const h=harness(),s=h.stream;s.data.invalid=()=>{};
  await s.focus(['first','second']);h.clean();
  assert.equal(h.workers.length,2);assert.equal(h.changes.filter(c=>c.error).length,2);
  delete s.data.invalid;const retry=s.focus(['first','second']);
  assert.equal(h.workers.length,3,'A failed same-focus request cannot retry');h.last().result(pack('first'));await Promise.resolve();
  assert.equal(h.workers.length,4);h.last().result(pack('second'));await retry;
  assert.deepEqual(h.attached,['first','second']);h.dispose();checks.push('synchronous native structured-clone failures clean every worker and allow retry');
 }
 {
  const h=harness();h.creationFailures=1;
  await h.stream.focus(['first']);h.clean();assert.equal(h.workers.length,0);assert.equal(h.revocations.length,1);
  assert(h.changes.some(c=>c.error?.includes('浏览器未允许本地模型构建 Worker')));
  const retry=h.stream.focus(['first']);h.last().result(pack('first'));await retry;h.dispose();checks.push('Worker construction failure releases its URL and allows retry');
 }
 {
  const h=harness(),s=h.stream,loading=s.focus(['first']);
  h.last().onerror({message:'Injected asynchronous Worker error'});await loading;h.clean();
  assert(h.changes.some(c=>c.error==='Injected asynchronous Worker error'));
  const retry=s.focus(['first']);h.last().result(pack('first'));await retry;h.dispose();checks.push('asynchronous Worker errors clean and allow retry');
 }
 {
  const h=harness(),p=h.stream.task('first',1),rejected=assert.rejects(p,/消息无法解码/);
  assert.equal(typeof h.last().onmessageerror,'function');h.last().onmessageerror({data:null});await rejected;h.dispose();checks.push('messageerror settles and cleans the task');
 }
 {
  const h=harness(),p=h.stream.task('first',1),rejected=assert.rejects(p,/Injected model build failure/);
  h.last().onmessage({data:{error:'Injected model build failure',stack:'test'}});await rejected;h.dispose();checks.push('Worker-reported model errors clean the task');
 }
 {
  const h=harness(),s=h.stream,first=s.focus(['first']),old=h.last(),lateMessage=old.onmessage,lateError=old.onerror;
  const second=s.focus(['second']),current=h.last();
  lateMessage({data:{pack:pack('first')}});lateError({message:'late error'});lateMessage({data:{pack:pack('first')}});
  assert.equal(s.pending.worker,current,'Late completion cleared the current task');
  current.result(pack('second'));await Promise.all([first,second]);
  assert.deepEqual(h.attached,['second']);assert.equal(s.metrics.cancelled,1);assert.equal(s.cache.has('first'),false);h.dispose();checks.push('cancelled late messages and errors cannot install packs or disturb a successor');
 }
 {
  const h=harness(),s=h.stream,first=s.task('first',7),old=h.last(),second=s.task('second',7),current=h.last();
  const rejected=assert.rejects(second,{name:'AbortError'});
  old.result(pack('first'));await first;assert.equal(s.pending.worker,current,'Equal epochs confused distinct task owners');
  s.cancel();await rejected;h.dispose();checks.push('distinct tasks with an equal epoch retain separate ownership');
 }
 {
  const h=harness(),s=h.stream,loading=s.focus(['first']),late=h.last().onmessage;
  s.dispose();late({data:{pack:pack('first')}});await loading;
  const requests=s.metrics.requests,changes=h.changes.length;
  await s.focus(['second']);await assert.rejects(s.task('second',2),{name:'AbortError'});s.dispose();
  assert.equal(s.metrics.requests,requests);assert.equal(h.workers.length,1);assert.equal(h.changes.length,changes);assert.deepEqual(h.attached,[]);h.clean();assert.equal(h.timers.size,0);checks.push('dispose is final and idempotent, including late completion');
 }
 {
  const h=harness();h.onChange=change=>{if(change.loading)h.stream.dispose();};
  await h.stream.focus(['first']);assert.equal(h.workers.length,0);h.clean();assert.equal(h.timers.size,0);checks.push('dispose during the public loading callback prevents Worker creation');
 }
 return {checks:checks.length,cases:checks,node:process.version,webgl:false};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const root=fileURLToPath(new URL('../',import.meta.url));
 console.log('Worker lifecycle checks passed: '+JSON.stringify(await checkStreamingLifecycle(name=>fs.readFileSync(path.join(root,name)))));
}
