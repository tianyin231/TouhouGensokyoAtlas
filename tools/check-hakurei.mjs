import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';

export function geometryDigest(pack){
 const hash=createHash('sha256');
 for(const m of pack.meshes){
  hash.update(JSON.stringify([m.id,m.material,m.center,m.radius,m.lod]));
  for(const key of ['vertices','farVertices','instances','instanceColors','index'])if(m[key]){
   const a=m[key];hash.update(Buffer.from(a.buffer,a.byteOffset,a.byteLength));
  }
 }
 return hash.digest('hex');
}

export async function checkHakurei(G,atlas,read){
 const baseline=JSON.parse(read('tools/hakurei-baseline.json'));
 // 本次允许修改共用建模源文件，但其他主区域的实际输出仍逐字节锁定。
 for(const [id,digest]of Object.entries(baseline.regions))
  assert.equal(geometryDigest(await G.buildRegion(atlas,id)),digest,`${id} 被神社改造意外改变`);
 const pack=await G.buildRegion(atlas,'hakurei');
 assert.equal(pack.meta.stairSteps,140,'保留完整登山石阶');
 assert.equal(JSON.stringify(pack.meta.mainHall),'[22,16]','保留拜殿尺度');
 assert.equal(new Set(pack.meshes.map(m=>m.id)).size,pack.meshes.length,'神社网格 ID 重复');
 let bytes=0;const buffers=new Set(),materials=new Set();
 for(const m of pack.meshes){
  materials.add(m.material);assert.equal(m.owner,'hakurei');
  assert.equal(m.vertices.length%27,0,`${m.id} 三角面格式错误`);
  for(const key of ['vertices','farVertices','instances','instanceColors','index'])if(m[key]){
   const a=m[key];assert(a.every(Number.isFinite),`${m.id}/${key} 含无效数值`);
   if(!buffers.has(a.buffer)){buffers.add(a.buffer);bytes+=a.buffer.byteLength;}
  }
  if(m.instances)assert.equal(m.instances.length/16,m.instanceColors.length/3,'植被实例与色彩数量不同');
 }
 assert.equal(pack.bytes,bytes,'区域缓存字节统计错误');
 assert(bytes<22*1048576,'神社区域源几何超出22 MiB预算');
 for(const m of ['hakureiGravel','hakureiWood','hakureiRoof','hakureiMoss'])assert(materials.has(m),`缺少独立材质 ${m}`);
 const raw=gunzipSync(read('assets/packs/overview.pack.gz'));
 const overview=G.decodePack(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength));
 assert(overview.meshes.some(m=>m.owner==='hakurei'&&m.material==='hakureiRoof'),'总览仍是旧神社');
 const transition=checkTransition(G,atlas,overview);
 return {protectedRegions:Object.keys(baseline.regions).length,meshes:pack.meshes.length,sourceMiB:+(bytes/1048576).toFixed(2),stairs:pack.meta.stairSteps,transition};
}

// 过渡带只换树形，不能增加密度、挪动落点或让区域卸载切掉外围树林。
function checkTransition(G,atlas,overview){
 const oldTree=m=>m.globalSurface&&m.component==='transition-vegetation'&&['pine','broad'].includes(m.id.split(':')[2]);
 const instances=meshes=>Array.from(meshes).flatMap(m=>Array.from({length:m.instances.length/16},(_,i)=>{
  const a=m.instances.subarray(i*16,i*16+16);
  return {key:Buffer.from(a.buffer,a.byteOffset,a.byteLength).toString('base64'),distance:Math.hypot(a[12]-1620,a[14]-160),eligible:!G.DIORAMA.owner(a[12],a[14])};
 })).filter(p=>p.distance<500);
 const before=instances(overview.meshes.filter(oldTree));
 G.LANDSCAPE.apply(overview,new G.Terrain(atlas));
 const replacement=overview.meshes.filter(m=>m.id.startsWith('hakurei:transition:'));
 assert(replacement.length>0&&replacement.length<=12,'外围树不应拆成大量新批次');
 const leaves=replacement.filter(m=>m.leafCards),after=instances([...overview.meshes.filter(oldTree),...leaves]);
 assert.deepEqual(after.map(p=>p.key).sort(),before.map(p=>p.key).sort(),'外围树的数量或原始矩阵发生改变');
 const replaced=instances(leaves),keys=new Set(replaced.map(p=>p.key));
 assert(replaced.every(p=>p.distance<330),'神社替换树越出周边范围');
 assert(before.filter(p=>p.distance<=210&&p.eligible).every(p=>keys.has(p.key)),'紧邻神社的旧树未接入过渡');
 for(const m of replacement){
  assert(m.globalSurface&&m.owner==='island','外围树不应依赖神社详情包');
  assert(m.vertices.every(Number.isFinite),'外围原型含无效坐标');
  const partner=replacement.find(n=>n!==m&&n.instances===m.instances);
  assert(partner,'枝干与叶冠没有共用实例数据');
  assert((m.vertices.length+partner.vertices.length)/27<=180,'外围单树超出180三角预算');
 }
 const meshes=overview.meshes;
 G.LANDSCAPE.apply(overview,new G.Terrain(atlas));
 assert.equal(overview.meshes,meshes,'重复应用过渡带改变了树木');
 return {trees:replaced.length,batches:replacement.length};
}
