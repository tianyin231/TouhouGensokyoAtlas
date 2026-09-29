// 显式重建神社远景源资产；不在测试或常规构建时改写固定期望。
import fs from 'node:fs';
import vm from 'node:vm';
import {gunzipSync,gzipSync} from 'node:zlib';
import assert from 'node:assert/strict';

const root=new URL('../',import.meta.url),read=p=>fs.readFileSync(new URL(p,root));
const project=JSON.parse(read('project.json'));
const context=vm.createContext({performance,TextDecoder,TextEncoder});
vm.runInContext(project.worldBuilders.map(p=>read(p).toString()).join('\n'),context);
const G=context.GA,raw=gunzipSync(read('assets/packs/overview.pack.gz'));
const pack=G.decodePack(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength));
const detail=await G.buildRegion(JSON.parse(read('data/atlas.json')),'hakurei');
let replacement=detail.meshes.filter(m=>!['near','props'].includes(m.lod)&&!m.nearDecoration).map(m=>{
 const copy={...m,id:'overview:hakurei:refined:'+m.id,overview:true,vertices:m.farVertices||m.vertices};
 for(const key of ['farVertices','maxDetailDistance','lodDistance','lod'])delete copy[key];
 return copy;
});
// 全岛上神社只有数十像素，不需要沿用近景的植被空间分桶。
const groups=new Map(),merged=[];
for(const mesh of replacement){
 if(!mesh.instances){merged.push(mesh);continue;}
 if(!groups.has(mesh.vertices))groups.set(mesh.vertices,[]);
 groups.get(mesh.vertices).push(mesh);
}
for(const meshes of groups.values()){
 const first=meshes[0],instances=new Float32Array(meshes.reduce((n,m)=>n+m.instances.length,0)),colors=new Float32Array(instances.length/16*3);
 let i=0,j=0;for(const m of meshes){assert.equal(m.material,first.material);instances.set(m.instances,i);colors.set(m.instanceColors,j);i+=m.instances.length;j+=m.instanceColors.length;}
 const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
 for(const m of meshes)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],m.center[k]-m.radius);hi[k]=Math.max(hi[k],m.center[k]+m.radius);}
 const center=lo.map((v,k)=>(v+hi[k])/2),radius=G.length(G.sub(hi,lo))/2;
 merged.push({...first,instances,instanceColors:colors,center,radius});
}
replacement=merged;
const original=pack.meshes.filter(m=>m.owner!=='hakurei');
pack.meshes=[...original,...replacement];
assert.equal(new Set(pack.meshes.map(m=>m.id)).size,pack.meshes.length,'重复的远景网格');

const arrays=[],chunks=[],seen=new Map();let offset=0;
const meshes=pack.meshes.map(m=>{
 const result={...m};
 for(const key of ['vertices','farVertices','instances','instanceColors','index'])if(m[key]){
  const a=m[key];let index=seen.get(a);
  if(index===undefined){
   index=arrays.length;seen.set(a,index);
   const padding=(4-offset%4)%4;if(padding){chunks.push(Buffer.alloc(padding));offset+=padding;}
   arrays.push({type:a.BYTES_PER_ELEMENT===2?'u16':key==='index'?'u32':'f32',offset,length:a.length});
   const bytes=Buffer.from(a.buffer,a.byteOffset,a.byteLength);chunks.push(bytes);offset+=bytes.length;
  }
  result[key]={array:index};
 }
 return result;
});
const manifest=Buffer.from(JSON.stringify({...pack,meshes,arrays}));
const padded=Buffer.alloc(Math.ceil(manifest.length/4)*4,32);manifest.copy(padded);
const header=Buffer.alloc(4);header.writeUInt32LE(padded.length);
const output=Buffer.concat([header,padded,...chunks]);
const decoded=G.decodePack(output.buffer.slice(output.byteOffset,output.byteOffset+output.byteLength));
for(const before of original){
 const after=decoded.meshes.find(m=>m.id===before.id);
 for(const key of ['vertices','farVertices','instances','instanceColors','index'])if(before[key])
  assert(Buffer.from(before[key].buffer,before[key].byteOffset,before[key].byteLength).equals(Buffer.from(after[key].buffer,after[key].byteOffset,after[key].byteLength)),`${before.id} 非神社几何被改变`);
}
fs.writeFileSync(new URL('assets/packs/overview.pack.gz',root),gzipSync(output,{level:9}));
console.log(`神社远景更新：${replacement.length} 批；其余 ${original.length} 批逐字节保持。`);
