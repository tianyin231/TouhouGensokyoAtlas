// 森林预建的格式、获取失败回退和任务取消；仅 CPU，不构建整张地图。
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash,webcrypto} from 'node:crypto';
import {encodeRegionPack} from './region-pack-codec.mjs';

export async function checkRegionPacks(read){
 const context=vm.createContext({performance,TextEncoder,TextDecoder,Blob,Response,DecompressionStream,AbortController,DOMException,
  crypto:webcrypto,setTimeout,clearTimeout,setInterval,clearInterval,console,URL,
  location:{protocol:'https:'},document:{baseURI:'https://example.test/atlas/index.html'}});
 vm.runInContext(read('src/world-builder.js').toString(),context);
 vm.runInContext(read('src/streaming.js').toString(),context);
 const G=context.GA,sourceHash='fixture-source';
 const storage=new Float32Array([99,1,2,3,4,5,6,88]),vertices=storage.subarray(1,7),instances=new Float32Array(16);
 const source={id:'forest',meshes:[{id:'a',vertices,instances,index:new Uint16Array([0,1]),basis:'P'},
  {id:'b',vertices,farVertices:new Float32Array([7,8,9]),instances,index:new Uint32Array([1,0]),lodDistance:280}],
  meta:{treeCount:755,source:'P: fixture'},signs:[{text:'森林'}],bytes:160,builtMs:0,prebuilt:{schema:1,sourceHash}};
 const encoded=encodeRegionPack(source),compressed=gzipSync(encoded),sha256=createHash('sha256').update(compressed).digest('hex');
 const decoded=G.decodePack(encoded.buffer.slice(encoded.byteOffset,encoded.byteOffset+encoded.byteLength));
 assert(encodeRegionPack(decoded).equals(encoded),'编解码改变网格或元数据');
 assert.equal(decoded.meshes[0].vertices,decoded.meshes[1].vertices,'共享原型被拆成不同数组');
 assert.equal(decoded.meshes[0].instances,decoded.meshes[1].instances,'共享实例数组丢失');
 assert.deepEqual(Array.from(decoded.meshes[0].vertices),[1,2,3,4,5,6],'子视图包含了界外数据');
 assert.equal(decoded.meshes[0].index.constructor.name,'Uint16Array');assert.equal(decoded.meshes[1].index.constructor.name,'Uint32Array');
 assert.throws(()=>encodeRegionPack({...source,meta:{nested:new Float64Array([1])}}),/未登记/);
 const entry={url:'https://example.test/atlas/packs/forest.pack.gz',sha256,sourceHash};
 const request={id:'forest',data:{prepared:true},legacy:'legacy',prebuilt:entry};
 let builds=0,fetches=0;
 G.buildRegion=async(data,id,legacy)=>{builds++;assert.equal(data.prepared,true);assert.equal(legacy,'legacy');return{id,meshes:[],bytes:0,builtMs:3};};
 context.fetch=async()=>{fetches++;return new Response(compressed);};
 const loaded=await G.loadRegionRequest(G,request);
 assert.equal(builds,0);assert.equal(fetches,1);assert.equal(loaded.delivery,'prebuilt');assert.equal(loaded.builtMs,0);
 assert.equal(loaded.bytes,encoded.length,'源缓存没有计入实际保留的整个解码缓冲区');
 assert.equal(loaded.meshes[0].vertices,loaded.meshes[1].vertices);assert(loaded.loadMs>=0);
 const cases=['共享原型、子视图、索引类型及语义完整往返','预建加载不调用建模且按实际缓冲记账'];
 for(const [name,response,override]of[
  ['HTTP 404',()=>new Response('',{status:404}),{}],
  ['网络失败',()=>{throw Error('offline');},{}],
  ['压缩数据损坏',()=>new Response('broken'),{}],
  ['旧版本包',()=>new Response(compressed),{sourceHash:'stale'}],
  ['区域错误',()=>new Response(compressed),{},'other']
 ]){
  const before=builds;context.fetch=async()=>response();
  const result=await G.loadRegionRequest(G,{...request,id:name==='区域错误'?'other':'forest',prebuilt:{...entry,...override}});
  assert.equal(builds,before+1,name+' 没有只回退一次');assert.equal(result.delivery,'generated-fallback');assert(result.prebuiltError);
  cases.push(name+' 回退同源建模');
 }
 const before=builds;context.fetch=()=>{throw Error('单 HTML 不应下载');};
 await G.loadRegionRequest(G,{...request,prebuilt:null});assert.equal(builds,before+1);cases.push('无 manifest 沿用原建模');
 // 加速触发真实 AbortController 通路，避免在离线检查中等待八秒。
 context.setTimeout=fn=>setTimeout(fn,0);
 context.fetch=(_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('timeout','AbortError'))));
 const timed=await G.loadRegionRequest(G,request);assert.equal(timed.delivery,'generated-fallback');cases.push('下载超时回退');

 const workers=[],urls=new Set(),blobs=new Map(),messages=[],attached=[];let next=0;
 class TestURL extends URL{
  static createObjectURL(blob){const url='blob:test-'+(++next);urls.add(url);blobs.set(url,blob);return url;}
  static revokeObjectURL(url){assert(urls.delete(url));}
 }
 class Worker{
  constructor(url){this.terminated=false;this.blob=blobs.get(url);workers.push(this);}
  postMessage(message){this.message=message;messages.push(message);}
  terminate(){this.terminated=true;}
 }
 context.URL=TestURL;context.Worker=Worker;G.REGION_PACK_MANIFEST={schema:1,regions:{forest:{...entry,url:'packs/forest.pack.gz'}}};
 const renderer={attachPack:pack=>attached.push(pack.id),dropPack:()=>{},trim:()=>{}};
 const stream=new G.RegionStreaming({prepared:true},renderer,'// builder','legacy');
 const first=stream.focus(['forest']),old=workers.at(-1),late=old.onmessage;
 assert.equal(old.message.prebuilt.url,'https://example.test/atlas/packs/forest.pack.gz','Blob Worker 收到相对 URL');
 const posted=[],self={postMessage:(value,buffers)=>posted.push({value,buffers})};
 const workerContext=vm.createContext({GA:G,self,performance,fetch:async()=>new Response(compressed),
  crypto:webcrypto,Blob,Response,DecompressionStream,AbortController,setTimeout,clearTimeout});
 vm.runInContext(await old.blob.text(),workerContext,{filename:'actual-region-worker'});
 await self.onmessage({data:old.message});assert.equal(posted.length,1);
 assert.equal(posted[0].value.pack.delivery,'prebuilt');assert.equal(posted[0].buffers.length,1,'共享缓冲在转移列表中重复');
 cases.push('实际生成的 Worker 脚本可解包且共享缓冲仅转移一次');
 const second=stream.focus(['other']),current=workers.at(-1);
 assert(old.terminated,'切区没有终止下载 Worker');
 late({data:{pack:{...source,delivery:'prebuilt'}}});assert.equal(stream.pending.worker,current);
 current.onmessage({data:{pack:{id:'other',meshes:[],bytes:0}}});await Promise.all([first,second]);
 assert.deepEqual(attached,['other']);assert.equal(urls.size,0);stream.dispose();
 cases.push('预建下载期间切区终止旧任务，迟到消息不能回插');
 context.location.protocol='file:';
 const local=new G.RegionStreaming({prepared:true},renderer,'// builder','legacy'),localTask=local.focus(['forest']);
 assert.equal(workers.at(-1).message.prebuilt,null,'file:// 尝试获取旁置包');
 local.dispose();await localTask;assert.equal(urls.size,0);cases.push('file:// 直接选择原 Worker 建模');
 return{checks:cases.length,cases,webgl:false};
}

export function checkWebRegionPacks(outputDir,info){
 if(!info.web)return{enabled:false};
 const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
 const html=fs.readFileSync(path.join(outputDir,info.web.artifact));
 assert.equal(hash(html),info.web.sha256,'在线 HTML 已被改动');
 const embedded=html.toString().match(/globalThis\.GA\.REGION_PACK_MANIFEST=(\{[^\n]+\});\n/);
 assert(embedded,'在线 HTML 缺少预建包 manifest');
 assert.deepEqual(JSON.parse(embedded[1]),info.web.manifest,'在线 manifest 与发布清单不同');
 const packs=[];
 for(const [id,entry]of Object.entries(info.web.manifest.regions)){
  const bytes=fs.readFileSync(path.join(outputDir,'web',entry.url));
  assert.equal(hash(bytes),entry.sha256,'在线包散列不匹配：'+id);
  assert.equal(bytes.length,entry.compressedBytes);const raw=gunzipSync(bytes);
  assert.equal(raw.length,entry.decodedBytes);const n=raw.readUInt32LE(0),pack=JSON.parse(raw.subarray(4,4+n).toString());
  assert.equal(pack.id,id);assert.equal(pack.prebuilt.schema,1);assert.equal(pack.prebuilt.sourceHash,entry.sourceHash);
  assert(pack.meshes.length&&pack.arrays.length);packs.push({id,meshes:pack.meshes.length,compressedBytes:bytes.length});
 }
 return{enabled:true,packs};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const root=fileURLToPath(new URL('../',import.meta.url));
 console.log(JSON.stringify(await checkRegionPacks(name=>fs.readFileSync(path.join(root,name)))));
 if(process.argv[2]){
  const outputDir=path.resolve(process.argv[2]),info=JSON.parse(fs.readFileSync(path.join(outputDir,'release.json')));
  console.log(JSON.stringify(checkWebRegionPacks(outputDir,info)));
 }
}
