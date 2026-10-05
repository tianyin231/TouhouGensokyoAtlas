// Read-only lifecycle inventory. Hashes and scalar tokens never retain source
// arrays or GPU objects; token tables use weak keys. No render/ensure/envelope.
async () => {
 const A=ATLAS,R=A.renderer,G=GA,MAX_RECORDS=2300,MAX_VIEWS=20000;
 if(R.records.length>MAX_RECORDS)throw Error('Source inventory record bound exceeded');
 const tokens=globalThis.__muenSourceTokens||(globalThis.__muenSourceTokens={views:new WeakMap(),buffers:new WeakMap(),nextView:1,nextBuffer:1});
 const token=(map,key,counter)=>{if(!map.has(key))map.set(key,tokens[counter]++);return map.get(key);};
 const cache=new WeakMap(),ledger=new Map(),views=new Set();
 const hex=b=>Array.from(new Uint8Array(b),v=>v.toString(16).padStart(2,'0')).join('');
 const hash=async a=>{if(!cache.has(a))cache.set(a,crypto.subtle.digest('SHA-256',new Uint8Array(a.buffer,a.byteOffset,a.byteLength)).then(hex));return await cache.get(a);};
 async function descriptor(a,owner,identity){
  views.add(a);if(views.size>MAX_VIEWS)throw Error('Source inventory typed-view bound exceeded');
  if(!ledger.has(a.buffer))ledger.set(a.buffer,{bytes:a.buffer.byteLength,owners:new Set()});
  ledger.get(a.buffer).owners.add(owner);
  const d={type:a.constructor.name,length:a.length,bytes:a.byteLength,sha256:await hash(a)};
  if(identity){d.viewToken=token(tokens.views,a,'nextView');d.bufferToken=token(tokens.buffers,a.buffer,'nextBuffer');d.byteOffset=a.byteOffset;}
  return d;
 }
 async function metadata(v,path,arrays,identity,ancestors){
  if(ArrayBuffer.isView(v)){arrays[path]=await descriptor(v,path,identity);return{typedArray:path};}
  if(v===null||typeof v!=='object')return typeof v==='function'||v===undefined?null:v;
  if(v instanceof ArrayBuffer)throw Error('Unclassified raw source backing at '+path);
  if(ancestors.has(v))throw Error('Unexpected cyclic source metadata at '+path);
  ancestors.add(v);let out;
  if(Array.isArray(v)){out=[];for(let i=0;i<v.length;i++)out.push(await metadata(v[i],path+'/'+i,arrays,identity,ancestors));}
  else if(v instanceof Map||v instanceof Set)throw Error('Source metadata collection needs explicit review: '+path);
  else{out={};for(const k of Object.keys(v).sort())if(v[k]!==undefined&&typeof v[k]!=='function')out[k]=await metadata(v[k],path+'/'+k,arrays,identity,ancestors);}
  ancestors.delete(v);return out;
 }
 const records=[];
 for(const r of R.records){
  if(!['overview','muenzuka'].includes(r.pack))throw Error('Unexpected native owner '+r.pack);
  const row={id:r.data.id,pack:r.pack,arrays:{}};
  row.metadata=await metadata(r.data,r.pack+':'+r.data.id,row.arrays,r.pack==='overview',new WeakSet());records.push(row);
 }
 records.sort((a,b)=>a.pack.localeCompare(b.pack)||a.id.localeCompare(b.id));
 const dataArrays={},seen=new WeakSet();
 async function dataViews(v,path){
  if(ArrayBuffer.isView(v)){dataArrays[path]=await descriptor(v,path,true);return;}
  if(!v||typeof v!=='object'||seen.has(v))return;seen.add(v);
  if(v instanceof ArrayBuffer)throw Error('Unclassified raw data backing at '+path);
  if(v instanceof Map){for(const [k,x]of v)await dataViews(x,path+'/map:'+String(k));return;}
  if(v instanceof Set){let i=0;for(const x of v)await dataViews(x,path+'/set:'+i++);return;}
  for(const k of Object.keys(v).sort())await dataViews(v[k],path+'/'+k);
 }
 await dataViews(A.data,'data');
 const privatePrototypes=[],prototypeResidency=[];
 const edge=G.MUENZUKA_EDGE,culling=G.MUENZUKA_EDGE_CULLING;
 if(!!edge!==!!culling)throw Error('Partial Muenzuka extension installation');
 if(edge){
  for(const variant of [0,1]){
   const id='overview016:muenzuka|forestLeaf|vegetation|I'+(variant?9:7)+':muenzuka-west-edge';
   const cold=R.records.find(r=>r.pack==='overview'&&r.data.id===id),p=edge.prototype(variant),again=edge.prototype(variant);
   // The boot's cold record already owns this exact far view. A getter that
   // newly created a missing prototype would fail instead of filling a gap.
   if(!cold||cold.data.vertices!==p.far||p!==again)throw Error('Main-thread prototype was not already retained by public boot');
   for(const lod of ['near','far']){
    const a=p[lod],key='privateMuenzuka:'+variant+':'+lod;
    privatePrototypes.push({id:key,variant,lod,array:await descriptor(a,key,true)});
    prototypeResidency.push({id:key,residentInGPU:R.geometryRefs.has(a),publicArrayOwners:R.records.filter(r=>r.pack==='overview'&&[r.data.vertices,r.data.farVertices].includes(a)).map(r=>r.data.id).sort()});
   }
  }
 }
 const targetNative=/^muenzuka:trees:-23:[678]:[01]:leaf$/;
 const targetCold=/^overview016:muenzuka\|forestLeaf\|vegetation\|I[79]:muenzuka-west-edge$/;
 function actualOutside(m,s){
  let maximum=-Infinity,points=0;const b=m.instances,c=s.center;
  const arrays=m.farVertices&&m.farVertices!==m.vertices?[m.vertices,m.farVertices]:[m.vertices];
  for(const a of arrays)for(let j=0;j<a.length;j+=9){
   const x=a[j],y=a[j+1],z=a[j+2],t=Math.max(0,Math.min(1,(y-4)/18)),w=t*t*(3-2*t)*.16;
   for(let i=0;i<b.length;i+=16)for(const sx of[-1,1])for(const sz of[-1,1]){
    const X=x+sx*w,Z=z+sz*w*.5;
    maximum=Math.max(maximum,Math.hypot(b[i]*X+b[i+4]*y+b[i+8]*Z+b[i+12]-c.x,
     b[i+1]*X+b[i+5]*y+b[i+9]*Z+b[i+13]-c.y,b[i+2]*X+b[i+6]*y+b[i+10]*Z+b[i+14]-c.z)-s.radius);points++;
   }
  }
  return{maximumOutside:maximum,points,tolerance:1e-7};
 }
 const spheres=[];
 for(const r of R.records){
  const expected=targetNative.test(r.data.id)||targetCold.test(r.data.id);
  const eligible=!!culling&&!!culling.eligible(r.data);
  if(eligible!==!!(culling&&expected))throw Error('Unexpected local culling eligibility: '+r.data.id);
  if(!expected)continue;
  const s=r.item?.mesh.boundingSphere;
  if(s&&(!Number.isFinite(s.radius)||s.radius<=0||!s.center.toArray().every(Number.isFinite)))throw Error('Invalid actual mesh sphere');
  spheres.push({id:r.data.id,pack:r.pack,eligible,resident:!!r.item,wanted:r.wanted,level:r.level,
   sphere:s?{center:s.center.toArray(),radius:s.radius}:null,
   actualWindEnvelope:eligible&&s?actualOutside(r.data,s):null});
 }
 spheres.sort((a,b)=>a.id.localeCompare(b.id));
 const ledgerRows=[...ledger.values()].map(x=>({bytes:x.bytes,owners:[...x.owners].sort()})).sort((a,b)=>a.owners[0].localeCompare(b.owners[0]));
 const cold=records.filter(r=>r.pack==='overview'&&r.metadata.owner==='muenzuka');
 return{records,dataArrays,privatePrototypes,prototypeResidency,spheres,
  cullingAvailable:!!culling,privateGetterAlreadyRetained:!!edge,
  counts:{publicRecords:records.filter(r=>r.pack==='overview').length,nativeRecords:records.filter(r=>r.pack==='muenzuka').length,
   muenzukaColdRecords:cold.length,coldOrdinaryTrees:R.records.filter(r=>r.pack==='overview'&&r.data.owner==='muenzuka'&&r.data.material==='forestLeaf').reduce((n,r)=>n+r.data.instances.length/16,0),
   sourceViews:views.size,uniqueBackings:ledger.size,uniqueBackingBytes:ledgerRows.reduce((n,x)=>n+x.bytes,0)},
  backingLedger:ledgerRows,
  readOnlyMeaning:'No draw, finish, ensure, envelope, forced garbage collection or strong source/GPU references retained by probe. Managed native ownership can be proven clear; JavaScript collection timing is not asserted.'};
}
