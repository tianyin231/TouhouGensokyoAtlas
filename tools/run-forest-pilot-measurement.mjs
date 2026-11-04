// 复用已开启的 Playwright CLI 会话，在真实浏览器采集同路线画面与耗时。
// --cli 指向 @playwright/cli/playwright-cli.js；--artifact 绑定所测本地 HTML。
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {collectForestPilot} from './measure-forest-pilot.mjs';

const args=new Map();
for(let i=2;i<process.argv.length;i+=2)args.set(process.argv[i],process.argv[i+1]);
for(const key of ['--cli','--url','--label','--artifact'])if(!args.get(key))throw Error('缺少参数 '+key);
const cli=path.resolve(args.get('--cli')),session=args.get('--session')||'forest-pilot';
const output=path.resolve(args.get('--output')||'dist/forest-pilot/output/playwright');
const artifact=path.resolve(args.get('--artifact')),label=args.get('--label');
const artifactSHA=createHash('sha256').update(fs.readFileSync(artifact)).digest('hex');
fs.mkdirSync(output,{recursive:true});
const config={url:args.get('--url'),label,artifactSHA,output:output.replaceAll('\\','/')};
const code=`async page => {
 const config=${JSON.stringify(config)};
 await page.setViewportSize({width:1280,height:720});
 await page.addInitScript(()=>{
  if(globalThis.__forestPilotProbeInstalled)return;
  globalThis.__forestPilotProbeInstalled=true;
  globalThis.__pilot={errors:[],workers:[],contexts:[]};
  addEventListener('error',e=>__pilot.errors.push(e.message));
  addEventListener('unhandledrejection',e=>__pilot.errors.push(String(e.reason)));
  // 捕获阶段也能记录不冒泡的 Canvas 事件，覆盖启动和首次详情加载。
  addEventListener('webglcontextlost',()=>__pilot.contexts.push('lost'),true);
  const NativeWorker=Worker;
  globalThis.Worker=new Proxy(NativeWorker,{construct(Type,args){
   const worker=Reflect.construct(Type,args),send=worker.postMessage;
   let task;
   worker.postMessage=function(message,...rest){
    task={region:message.id,started:performance.now()};__pilot.workers.push(task);
    return send.call(this,message,...rest);
   };
   worker.addEventListener('message',event=>{if(task){task.elapsedMs=performance.now()-task.started;task.delivery=event.data.pack?.delivery||'generated';task.error=event.data.error||null;}});
   return worker;
  }});
 });
 // 新 query 避免同 URL 的 hash 导航跳过启动探针。
 await page.goto('about:blank');
 const url=new URL(config.url);url.searchParams.set('measure',config.label);
 const navigationURL=new URL(url);navigationURL.hash='';let servedSHA;
 // 单 HTML 超过 Chromium 的响应检查缓存上限；在放行导航前核验响应。
 const verifyResponse=async route=>{
  const response=await route.fetch(),body=await response.body();
  servedSHA=[...new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',body))].map(v=>v.toString(16).padStart(2,'0')).join('');
  await route.fulfill({response,body});
 };
 await page.route(navigationURL.href,verifyResponse);
 const response=await page.goto(url.href,{waitUntil:'domcontentloaded',timeout:90000});
 await page.unroute(navigationURL.href,verifyResponse);
 if(!response||!response.ok())throw Error('无法核验所测 HTML 响应');
 if(servedSHA!==config.artifactSHA)throw Error('导航响应与 --artifact 不一致：'+servedSHA);
 await page.waitForFunction(()=>globalThis.ATLAS||globalThis.ATLAS_BOOT_ERROR,undefined,{timeout:90000});
 if(await page.evaluate(()=>globalThis.ATLAS_BOOT_ERROR))throw Error(await page.evaluate(()=>String(ATLAS_BOOT_ERROR)));
 await page.waitForFunction(()=>ATLAS.stream.cache.has('forest'),undefined,{timeout:90000});
 const result=await (${collectForestPilot.toString()})(page,config);
 result.workers=await page.evaluate(()=>__pilot.workers);
 result.contexts=await page.evaluate(()=>__pilot.contexts);
 result.document={url:response.url(),sha256:servedSHA};
 return result;
}`;
const raw=execFileSync(process.execPath,[cli,'-s='+session,'run-code',code],{encoding:'utf8',timeout:180000,maxBuffer:16*1024*1024});
fs.writeFileSync(path.join(output,label+'-cli.txt'),raw);
const match=raw.match(/### Result\s*\n([\s\S]*?)\n###/);
if(!match)throw Error('Playwright 未返回采集结果；保留原始输出供检查');
const result=JSON.parse(match[1]);
if(createHash('sha256').update(fs.readFileSync(artifact)).digest('hex')!==artifactSHA)throw Error('采集期间 --artifact 已改变；本次结果不能绑定到该文件');
if(result.document?.sha256!==artifactSHA)throw Error('采集结果缺少匹配的导航响应散列');
result.artifact={path:artifact,sha256:artifactSHA};
result.recordedAt=new Date().toISOString();
fs.writeFileSync(path.join(output,label+'.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({label,artifact:result.artifact.sha256,cpu:result.cpu,gpu:result.gpu,calls:result.calls,triangles:result.triangles,workers:result.workers,errors:result.errors,contexts:result.contexts},null,2));
if(result.errors.length||result.contexts.length)process.exitCode=1;
