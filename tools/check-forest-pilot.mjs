// 定向检查新群落：使用保存的真实公共地形，不构建地区详情或更新基线。
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),read=p=>fs.readFileSync(root+p);
export function checkForestPilot(){
const context=vm.createContext({TextDecoder,Float32Array,Uint32Array,Uint16Array,Uint8Array,DataView,ArrayBuffer,performance});
for(const p of ['src/world-builder.js','src/surface-contact.js','src/forest-entrance-plants.js','src/forest-pilot.js'])vm.runInContext(read(p).toString(),context,{filename:p});
const G=context.GA,F=G.FOREST_PILOT,raw=gunzipSync(read('assets/packs/overview.pack.gz'));
const pack=G.decodePack(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength)),input=pack.meshes.slice();
const hash=a=>createHash('sha256').update(Buffer.from(a.buffer,a.byteOffset,a.byteLength)).digest('hex');
const originals=new Map();for(const m of input)for(const a of Object.values(m))if(ArrayBuffer.isView(a)&&!originals.has(a))originals.set(a,hash(a));
const data={},added=F.prepare(data,pack);pack.meshes.push(...added);
assert.equal(F.prepare(data,pack).length,0,'重复 prepare 不得重复植入');
assert.equal(pack.meshes.length,input.length+added.length);
for(let i=0;i<input.length;i++)assert.equal(pack.meshes[i],input[i],'不能替换原记录');
for(const [a,h]of originals)assert.equal(hash(a),h,'不能更改原始数组');
assert.equal(JSON.stringify(data.forestPilot.sites),JSON.stringify(F.sites()),'群落布局必须确定');
const layouts=new Map(data.forestPilot.sites.map(s=>[s.id,s])),near=new Map(added.filter(m=>m.forestPilotTerrainLod==='near').map(m=>[m.id.slice(0,-5),m]));
assert(layouts.size>500&&layouts.size<=1000,'样板规模改变，需要重新检查成本');
assert(added.length<=48,'空间批次过多');
assert(F.prototype('shrub','near').length/27<=350&&F.prototype('shrub','far').length/27<=70,'灌木不得复用高密枝叶原型');
assert(F.prototype('fern','near').length/27>=64&&F.prototype('fern','near').length/27<=100,'近景蕨需要可读的羽片轮廓');
// 比较实际近远轮廓，能抓住控制点被内核缩放污染后再次缩小的错误。
const shrubBounds=['near','far'].map(lod=>G.FOREST_ENTRANCE_PLANTS.bounds(F.prototype('shrub',lod)));
for(const axis of [0,2]){
 const a=shrubBounds[0].max[axis]-shrubBounds[0].min[axis],b=shrubBounds[1].max[axis]-shrubBounds[1].min[axis];
 assert(a>=b*.95&&a<=b*1.20,'近景外围叶必须保持远档同源轮廓');
}
const field=F.groundField();assert.equal(field,F.groundField(),'只烘焙一份地表字段');
assert.equal(field.values.byteLength,512*384*4,'数据纹理固定成本');
const pixel=(x,z)=>{const col=Math.floor((x+896)/336*field.width),row=Math.floor((z+128)/240*field.height);return field.values.subarray((row*field.width+col)*4,(row*field.width+col)*4+4);};
const roadColor=pixel(-736,-23),floorColor=pixel(-736,-43);
assert(roadColor[0]>floorColor[0]*2&&roadColor[1]>floorColor[1]*2,'暖土路心与林地必须可分辨');
for(let i=0;i<field.width;i++)for(const row of [0,field.height-1])assert.equal(field.values[(row*field.width+i)*4+3],0,'纹理边缘权重必须为零');
for(let j=0;j<field.height;j++)for(const col of [0,field.width-1])assert.equal(field.values[(j*field.width+col)*4+3],0,'纹理边缘权重必须为零');
for(const s of layouts.values()){
 assert(F.routeDistance(s.x,s.z)>s.radius+.89,'完整植物包络侵入道路');
 assert(F.weight(s.x,s.z)>=.18,'越出区域或建筑院落');
}
let testedVertices=0,maxFootError=0,nearTriangles=0,farTriangles=0;
const temp={};G.SurfaceContact.prepare(temp,{meshes:input},'test',[-904,-136,-552,120]);
for(const m of added){
 const sampler=G.SurfaceContact.sampler(temp,'test',m.forestPilotTerrainLod),a=m.instances;
 assert(m.globalSurface&&m.overview,'冷层必须与详情共享公共记录');
 assert(input.some(t=>t.id===m.terrainSource),'地形源不存在');
 assert.equal(m.vertices,F.prototype(m.forestPilotKind,'near'),'近景原型没有共享');
 assert.equal(m.farVertices,F.prototype(m.forestPilotKind,'far'),'远景原型没有共享');
 for(let j=0;j<a.length;j+=16){
  const site=layouts.get(m.forestPilotSites[j/16]);assert(site);
  assert(Math.abs(a[j+12]-site.x)<.0001&&Math.abs(a[j+14]-site.z)<.0001,'近远 XY 点位变化');
  const footError=Math.abs(a[j+13]-sampler.height(site.x,site.z)+.12);maxFootError=Math.max(maxFootError,footError);assert(footError<.00001,'根部没有落在真实源地形');
  for(const geometry of [m.vertices,m.farVertices])for(let i=0;i<geometry.length;i+=9){
   const p=[0,1,2].map(k=>a[j+k]*geometry[i]+a[j+4+k]*geometry[i+1]+a[j+8+k]*geometry[i+2]+a[j+12+k]);
   assert(p.every(Number.isFinite));assert(Math.hypot(...p.map((v,k)=>v-m.center[k]))<=m.radius,'近远实例顶点越出共同包围球');testedVertices++;
  }
 }
 if(m.forestPilotTerrainLod==='far'){
  const other=near.get(m.id.slice(0,-4));assert(other);assert.deepEqual(Array.from(m.forestPilotSites),Array.from(other.forestPilotSites));
 }else{nearTriangles+=m.vertices.length/27*a.length/16;farTriangles+=m.farVertices.length/27*a.length/16;}
}
// 渲染选择实际地形源，不能读上帧 wanted 或用林下自身半径重选精度。
const disposeOrder=[];
class Base{wanted(r){return r.data.selected!==false;}ensure(r){return r.mesh??={};}dispose(){disposeOrder.push('renderer');this.disposed=true;}}
G.DioramaRenderer=Base;vm.runInContext(read('src/forest-pilot-renderer.js').toString(),context);
const renderer=new G.DioramaRenderer(),source={data:{selected:false}},record={data:added[0]};renderer.recordMap=new Map([[record.data.terrainSource,source]]);
assert.equal(renderer.wanted(record,{}, {},100),false);source.data.selected=true;assert.equal(renderer.wanted(record,{}, {},100),true);record.data.selected=false;assert.equal(renderer.wanted(record,{}, {},100),false);delete record.data.selected;
renderer.T={DataTexture:class{constructor(data,width,height){this.image={data,width,height};}dispose(){disposeOrder.push('texture');this.disposals=(this.disposals||0)+1;}},NoColorSpace:'linear',LinearFilter:'linear-filter',ClampToEdgeWrapping:'clamp'};
const texture=renderer.forestPilotTexture();assert.equal(texture,renderer.forestPilotTexture(),'所有局部材质共享一个纹理');assert.equal(texture.image.data,field.values,'保留 CPU 数据供 context 恢复');
renderer.dispose();assert(renderer.disposed);assert.equal(texture.disposals,1,'纹理必须随 renderer 释放');assert.equal(renderer.pilotFieldTexture,null);
assert.deepEqual(disposeOrder,['texture','renderer'],'必须在 Three 清空 GL 句柄表前销毁纹理');
return {passed:true,sites:layouts.size,records:added.length,fieldBytes:field.values.byteLength,pixelRoadSearches:0,nearTriangles,farTriangles,testedVertices,maxFootError,originalArraysUnchanged:true,meaning:'近远面数为所有样板实例的展开上限；实际帧与 GPU 成本另测。'};
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url)console.log(JSON.stringify(checkForestPilot(),null,2));
