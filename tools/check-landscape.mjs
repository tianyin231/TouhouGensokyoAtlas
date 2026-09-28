// 检查样板对旧场景的保护、地块接边，以及试走端点与地表的关系。
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {gunzipSync} from 'node:zlib';

export function checkLandscape(G,atlas,read){
 const bytes=gunzipSync(read('assets/packs/overview.pack.gz'));
 const decoded=G.decodePack(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
 const old=new Map(decoded.meshes.map(m=>[m.id,m])),terrain=new G.Terrain(atlas);
 G.LANDSCAPE.apply(decoded,terrain);
 for(const id of ['meadowPath','forestApproach','meadowReturn','meadowWalk'])for(const key of ['eye','target']){const p=G.PRESETS[id][key];assert(p[1]-terrain.height(p[0],p[2])>=1.7,`${id} 机位低于实际地图地表`);}
 assert.equal(new Set(decoded.meshes.map(m=>m.id)).size,decoded.meshes.length,'模型 ID 重复');
 assert(decoded.meshes.length<old.size+180,'样板不应拆成大量绘制批次');
 for(const [id,m]of old)if(!m.globalSurface)assert.equal(decoded.meshes.find(n=>n.id===id),m,`原地区模型被替换：${id}`);
 let borders=0;
 for(const m of decoded.meshes){
  if(m===old.get(m.id))continue;
  for(const key of['vertices','farVertices','instances','instanceColors'])if(m[key])for(const n of m[key])assert(Number.isFinite(n),`${m.id} 包含无效数值`);
  if(m.index)for(const i of m.index)assert(i<m.vertices.length/9,`${m.id} 越界索引`);
  if(m.component==='island-terrain'){
   const [x,z,s]=m.tile,a=m.vertices;
   for(let i=0;i<a.length;i+=9)if(a[i]===x||a[i]===x+s||a[i+2]===z||a[i+2]===z+s){assert(Math.abs(a[i+1]-terrain.height(a[i],a[i+2]))<.0001,'地块边缘未贴合公共地形');borders++;}
  }
 }
 assert(borders>100);
 const road=decoded.meshes.find(m=>m.id==='landscape:forest-road');
 for(let i=0;i<road.index.length;i+=3){const ps=[...road.index.slice(i,i+3)].map(j=>[...road.vertices.slice(j*9,j*9+3)]);assert(G.cross(G.sub(ps[1],ps[0]),G.sub(ps[2],ps[0]))[1]>0,'道路存在反面');}
 const meshes=decoded.meshes;G.LANDSCAPE.apply(decoded,terrain);assert.equal(decoded.meshes,meshes,'重复应用不应叠加植栽');

 // 用实际控制器沿整条路线往返；不注入浏览器运行状态。
 const copy={...G,DioramaRenderer:class{}};
 const context=vm.createContext({GA:copy,performance,window:{addEventListener(){}}});
 vm.runInContext(read('src/camera.js').toString(),context);
 vm.runInContext(read('src/landscape-renderer.js').toString(),context);
 const rig=new copy.CameraRig({addEventListener(){}},terrain);
 rig.setView(G.PRESETS.meadowWalk,false);assert.equal(rig.mode,'walk');
 const start=rig.eye.slice();rig.keys.add('KeyW');let samples=0;
 for(let i=0;i<2400;i++){rig.update(1/60);assert(Math.abs(rig.eye[1]-terrain.height(rig.eye[0],rig.eye[2])-1.82)<1e-6);assert(rig.eye.every(Number.isFinite));samples++;}
 assert.equal(rig.walkDistance,rig.walkTrack.length,'不能到达林缘终点');
 rig.keys.clear();rig.keys.add('KeyS');
 for(let i=0;i<2400;i++)rig.update(1/60);
 assert.equal(rig.walkDistance,0);assert(G.length(G.sub(rig.eye,start))<1e-6,'返回起点漂移');
 rig.keys.clear();rig.keys.add('KeyA');for(let i=0;i<300;i++)rig.update(1/60);
 assert.equal(rig.walkSide,-1.15,'试走不应离开已检查的路面');
 rig.setView(G.PRESETS.hellHall,false);assert.equal(rig.walkTrack,null);assert.equal(rig.mode,'orbit');
 return{meshRecords:decoded.meshes.length,protectedRegionMeshes:[...old.values()].filter(m=>!m.globalSurface).length,checkedBoundaryVertices:borders,walkSamples:samples,routeLength:+G.LANDSCAPE.path.slice(1).reduce((s,p,i)=>s+Math.hypot(p[0]-G.LANDSCAPE.path[i][0],p[1]-G.LANDSCAPE.path[i][1]),0).toFixed(1)};
}
