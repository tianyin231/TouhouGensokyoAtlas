// 沿用 GA.decodePack 的格式，保存共享 TypedArray 身份及所有网格语义字段。
const keys=['vertices','farVertices','instances','instanceColors','index'];
const types={Float32Array:'f32',Uint32Array:'u32',Uint16Array:'u16'};
export function encodeRegionPack(pack){
 const arrays=[],chunks=[],seen=new Map();let offset=0;
 const meshes=pack.meshes.map(mesh=>{
  const copy={...mesh};
  for(const key of keys)if(mesh[key]){
   const value=mesh[key],type=types[value.constructor.name];
   if(!ArrayBuffer.isView(value)||!type)throw Error('不支持的模型数组：'+mesh.id+'/'+key);
   let index=seen.get(value);
   if(index===undefined){
    index=arrays.length;seen.set(value,index);
    const padding=(4-offset%4)%4;if(padding){chunks.push(Buffer.alloc(padding));offset+=padding;}
    arrays.push({type,offset,length:value.length});
    chunks.push(Buffer.from(value.buffer,value.byteOffset,value.byteLength));offset+=value.byteLength;
   }
   copy[key]={array:index};
  }
  return copy;
 });
 // 当前森林详情只有上述五类数组。新增嵌套数组必须显式扩展格式，不能静默变成 JSON 对象。
 const metadata=Buffer.from(JSON.stringify({...pack,meshes,arrays},(_key,value)=>{
  if(ArrayBuffer.isView(value))throw Error('预建详情含未登记的嵌套 TypedArray');
  return value;
 }));
 const padded=Buffer.alloc(Math.ceil(metadata.length/4)*4,32);metadata.copy(padded);
 const header=Buffer.alloc(4);header.writeUInt32LE(padded.length);
 return Buffer.concat([header,padded,...chunks]);
}
