/* Bounded Marisa road contact repair, P. Decode existing source triangles only.
 * The original XZ ribbon, width, outside triangles and source color coordinates
 * remain. Inside the selected complete cross-sections, both position Y and
 * normals intentionally follow their actual near/far public terrain triangles.
 * Runtime SHA strings declare the published source; independent checks bind
 * those bytes. No texture, shader, renderer, planting or terrain change here.
 */
(function(G){'use strict';
const REVISION=1,BOUNDS=Object.freeze([-1120,0,-896,224]),OFFSET=.025;
const MAX_BYTES=512*1024,MAX_TRIANGLES=2000,EPS=1e-8;
const SOURCES=Object.freeze([
 {id:'island:routes:forest:-2:0',vertexCount:864,indexCount:936,vertexSHA:'14fca81a4e2e24c3cdb8667ccd6e17dab52ec90da60fd000f441bbd47325adfa',indexSHA:'eb96de890b018207f9c3e6aa67a2d3c4206ab05fd679d006a075bf0caec15695',terrain:'island:terrain:-1024:0'},
 {id:'island:routes:forest:-2:0:shoulder',vertexCount:1696,indexCount:1872,vertexSHA:'29369a0f81ce7c5fcf60e34022e6912e32d317a63f4540338b20f99d7f8d2f2e',indexSHA:'1c81eab4680628fb97dc00b50f99adb4ef12bb17d91bd6e15ed2a1c7b61bedb9',terrain:'island:terrain:-1024:0'}
].map(Object.freeze));
const sourceById=new Map(SOURCES.map(s=>[s.id,s]));
const COVERAGE=Object.freeze(['-2:-1','-3:-1','-2:0','-3:0'].flatMap(key=>['island:routes:forest:'+key,'island:routes:forest:'+key+':shoulder']));
const nearId=id=>id+':canopy-road-near',farId=id=>id+':canopy-road-far';
const typed=(a,name)=>ArrayBuffer.isView(a)&&a.constructor.name===name;
const cross=(a,b,c)=>(b[0]-a[0])*(c[2]-a[2])-(b[2]-a[2])*(c[0]-a[0]);
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const norm=a=>{const n=Math.hypot(...a);if(!(n>1e-10))throw Error('Invalid canopy road normal');return a.map(v=>v/n);};
const close=(a,b)=>a.slice(0,3).every((v,k)=>Math.abs(v-b[k])<1e-5);
const within=p=>p[0]>BOUNDS[0]+.001&&p[0]<BOUNDS[2]-.001&&p[2]>BOUNDS[1]+.001&&p[2]<BOUNDS[3]-.001;
function vertex(m,i){return Array.from(m.vertices.subarray(i*9,i*9+9));}
function sourceValid(m,s){return m&&m.id===s.id&&m.owner==='island'&&m.group==='roads'&&m.material==='ground'&&m.globalSurface===true&&m.overview===true&&m.component==='connection-road'&&m.pathOwner==='forest'&&!m.globalNear&&!m.globalFar&&!m.farVertices&&!m.instances&&typed(m.vertices,'Float32Array')&&m.vertices.length===s.vertexCount*9&&typed(m.index,'Uint32Array')&&m.index.length===s.indexCount;}
function quads(m){const qs=[];for(let i=0;i<m.index.length;i+=6){const ps=Array.from(m.index.subarray(i,i+6),j=>vertex(m,j));if(!close(ps[0],ps[3])||!close(ps[2],ps[4]))throw Error('Canopy road source quad order: '+m.id);qs.push([ps[0],ps[1],ps[2],ps[5]]);}return qs;}
function terrain(m,id){
 if(!m||m.id!==id||m.component!=='island-terrain'||m.owner!=='island'||m.globalSurface!==true||!typed(m.vertices,'Float32Array')||!typed(m.index,'Uint32Array')||m.vertices.length%9||m.index.length%3||m.cutOnly)throw Error('Missing canopy road terrain: '+id);
 const triangles=[];for(let i=0;i<m.index.length;i+=3){const ids=Array.from(m.index.subarray(i,i+3));if(ids.some(j=>j>=m.vertices.length/9))throw Error('Invalid canopy road terrain index');const ps=ids.map(j=>vertex(m,j)),area=cross(...ps);if(Math.abs(area)<EPS)continue;triangles.push({ps,area,face:i/3,x0:Math.min(...ps.map(p=>p[0])),x1:Math.max(...ps.map(p=>p[0])),z0:Math.min(...ps.map(p=>p[2])),z1:Math.max(...ps.map(p=>p[2]))});}
 if(!triangles.length)throw Error('Empty canopy road terrain: '+id);return{m,triangles};
}
function bary(p,t){const[a,b,c]=t.ps,d=t.area,v=cross(a,p,c)/d,w=cross(a,b,p)/d;return[1-v-w,v,w];}
function height(t,x,z){let result=null;const p=[x,0,z];for(const tri of t.triangles){if(x<tri.x0-EPS||x>tri.x1+EPS||z<tri.z0-EPS||z>tri.z1+EPS)continue;const w=bary(p,tri);if(Math.min(...w)<-1e-7)continue;const y=w.reduce((n,v,i)=>n+v*tri.ps[i][1],0);if(!result||y>result.y)result={y,tri,w};}if(!result)throw Error('Canopy road contact outside actual terrain: '+x+','+z);return result;}
function sectionGap(row,t){
 let min=Infinity,max=-Infinity,samples=0;
 for(let i=1;i<row.length;i++){const a=row[i-1],b=row[i],dx=b[0]-a[0],dz=b[2]-a[2],cuts=[0,1];
  for(const tri of t.triangles)for(let j=0;j<3;j++){const c=tri.ps[j],d=tri.ps[(j+1)%3],ex=d[0]-c[0],ez=d[2]-c[2],den=dx*ez-dz*ex;if(Math.abs(den)<1e-12)continue;const u=((c[0]-a[0])*ez-(c[2]-a[2])*ex)/den,v=((c[0]-a[0])*dz-(c[2]-a[2])*dx)/den;if(u>0&&u<1&&v>=-EPS&&v<=1+EPS)cuts.push(u);}
  for(const u of cuts){const p=mix(a,b,u),gap=p[1]-height(t,p[0],p[2]).y;min=Math.min(min,gap);max=Math.max(max,gap);samples++;}
 }
 return{min,max,samples};
}
function selectRange(center,shoulder,near,far){
 const c=quads(center),s=quads(shoulder),firstWitness=52,lastWitness=57;
 if(s.length!==c.length*2||c.length<=lastWitness)throw Error('Canopy road paired width source changed');
 const start=i=>[s[i*2][1],c[i][0],c[i][1],s[i*2+1][1]],end=i=>[s[i*2][2],c[i][3],c[i][2],s[i*2+1][2]];
 let lo=firstWitness,hi=lastWitness;while(lo>0&&close(c[lo-1][3],c[lo][0])&&close(c[lo-1][2],c[lo][1]))lo--;while(hi+1<c.length&&close(c[hi][3],c[hi+1][0])&&close(c[hi][2],c[hi+1][1]))hi++;
 const row=i=>i===lo?start(i):end(i-1),contacts=new Map();
 const safe=i=>{const ps=row(i);if(!ps.every(within))return false;let n,f;try{n=sectionGap(ps,near);f=sectionGap(ps,far);}catch{return false;}contacts.set(i,{near:n,far:f});return Math.min(n.min,f.min)>=OFFSET+.0001&&Math.max(n.max,f.max)<=.25;};
 let a=firstWitness,b=lastWitness+1;while(a>=lo&&!safe(a))a--;while(b<=hi+1&&!safe(b))b++;
 if(a<lo||b>hi+1||b-a>40)throw Error('Marisa road has no reliable full-width near/far seams inside ROI (start='+a+', end='+b+', chain='+lo+'..'+(hi+1)+')');
 for(let i=a;i<b;i++)if(![...c[i],...s[i*2],...s[i*2+1]].every(within))throw Error('Marisa road seam expansion would leave ROI');
 return{first:a,last:b,firstRow:row(a).map(p=>p.slice(0,3)),lastRow:row(b).map(p=>p.slice(0,3)),contacts:{first:contacts.get(a),last:contacts.get(b)}};
}
function clip(poly,tri){
 let out=poly;const sign=Math.sign(tri.area);
 for(let i=0;i<3&&out.length;i++){const a=tri.ps[i],b=tri.ps[(i+1)%3],input=out;out=[];
  const side=p=>sign*((b[0]-a[0])*(p.p[2]-a[2])-(b[2]-a[2])*(p.p[0]-a[0]));
  for(let j=0;j<input.length;j++){const p=input[j],q=input[(j+1)%input.length],u=side(p),v=side(q),inside=u>=-EPS,next=v>=-EPS;if(inside)out.push(p);if(inside!==next){const t=u/(u-v);out.push({p:mix(p.p,q.p,t),w:mix(p.w,q.w,t)});}}
 }
 return out.filter((p,i)=>!close(p.p,out[(i+out.length-1)%out.length].p));
}
function attributes(ps,w){return ps[0].map((_,k)=>w.reduce((n,v,i)=>n+v*ps[i][k],0));}
function base(source,range,sourceIndices){
 const scale=source.id.endsWith(':shoulder')?2:1,q0=range.first*scale,q1=range.last*scale,index=[];
 for(let face=0;face<source.index.length/3;face++)if(Math.floor(face/2)<q0||Math.floor(face/2)>=q1)index.push(...source.index.subarray(face*3,face*3+3));
 return{mesh:{...source,index:Uint32Array.from(index)},originalVertexCount:source.vertices.length/9,sourceIndices,triangles:new Uint16Array(),weights:new Float64Array(),replaced:(q1-q0)*2,created:0};
}
function build(source,t,lod,range,sourceIndices){
 const extra=[],index=[],triangles=[],weights=[],shoulder=source.id.endsWith(':shoulder'),q0=range.first*(shoulder?2:1),q1=range.last*(shoulder?2:1);
 let replaced=0,created=0;
 for(let face=0;face<source.index.length/3;face++){
  const qi=Math.floor(face/2);if(qi<q0||qi>=q1)continue;
  const ps=Array.from(source.index.subarray(face*3,face*3+3),j=>vertex(source,j)),area=Math.abs(cross(...ps))/2,sourceSign=cross(...ps)>0?-1:1;if(area<EPS)throw Error('Degenerate Marisa source road face');
  const rowIndex=shoulder?Math.floor(qi/2):qi,isFirst=rowIndex===range.first,isLast=rowIndex===range.last-1,poly=ps.map((p,i)=>({p,w:[0,0,0].map((_,j)=>Number(i===j))}));let coverage=0;
  const x0=Math.min(...ps.map(p=>p[0])),x1=Math.max(...ps.map(p=>p[0])),z0=Math.min(...ps.map(p=>p[2])),z1=Math.max(...ps.map(p=>p[2]));
  for(const tri of t.triangles){if(tri.x1<x0-EPS||tri.x0>x1+EPS||tri.z1<z0-EPS||tri.z0>z1+EPS)continue;const clipped=clip(poly,tri);
   for(let j=1;j+1<clipped.length;j++){const points=[clipped[0],clipped[j],clipped[j+1]],piece=Math.abs(cross(...points.map(q=>q.p)))/2;if(piece<EPS)continue;coverage+=piece;
    // Original shoulder quads contain both orientations. New contact surfaces
    // need upward face winding as well as upward interpolated normal attributes.
    if(cross(...points.map(q=>q.p))>0)[points[1],points[2]]=[points[2],points[1]];
    for(const q of points){const a=attributes(ps,q.w),tw=bary(q.p,tri),surface=attributes(tri.ps,tw),along=face%2===0?q.w[2]:q.w[1]+q.w[2],blend=isFirst?along:isLast?1-along:1;
     // A downward source face is seen from its back above the DoubleSide road.
     // Orient that original normal to the same top-facing direction before
     // blending into the new upward face; retain its unnormalized seam value.
     const originalNormal=a.slice(3,6).map(v=>v*sourceSign),target=surface[1]+OFFSET,seam=blend<1e-10,y=seam?a[1]:Math.max(target,a[1]+(target-a[1])*blend),effective=y===target?1:blend,n=seam?originalNormal:norm(mix(originalNormal,surface.slice(3,6),effective));
     index.push(extra.length/9);extra.push(q.p[0],y,q.p[2],...n,...a.slice(6,9));triangles.push(face);weights.push(q.w[0],q.w[1]);
    }
    created++;
   }
  }
  if(Math.abs(coverage-area)>Math.max(1e-6,area*1e-7))throw Error('Incomplete Marisa road terrain clipping: '+source.id+'/'+face);replaced++;
 }
 return{mesh:{...source,id:lod==='near'?nearId(source.id):farId(source.id),vertices:Float32Array.from(extra),index:Uint32Array.from(index)},originalVertexCount:0,addedVertices:extra.length/9,sourceIndices,triangles:Uint16Array.from(triangles),weights:Float64Array.from(weights),replaced,created};
}
function bounds(m){let lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(const i of m.index)for(let k=0;k<3;k++){const v=m.vertices[i*9+k];lo[k]=Math.min(lo[k],v);hi[k]=Math.max(hi[k],v);}m.center=lo.map((v,k)=>(v+hi[k])/2);m.radius=Math.hypot(...hi.map((v,k)=>v-lo[k]))/2+.03;return m;}
function decorate(result,s,lod,range){
 const m=result.mesh;delete m.globalNear;delete m.globalFar;
 Object.assign(m,{forestCanopyRoad:true,forestCanopyRoadBasis:'P',sourceId:s.id,forestCanopyRoadRevision:REVISION,forestCanopyRoadLod:lod,forestCanopyRoadSource:s,forestCanopyRoadScope:BOUNDS.slice(),forestCanopyRoadRange:[range.first,range.last],forestCanopyRoadProvenance:{sourceVertexCount:s.vertexCount,originalVertexCount:result.originalVertexCount,sourceIndices:result.sourceIndices,sourceTriangles:result.triangles,barycentric:result.weights}});
 if(lod==='base'){delete m.terrainSource;return m;}
 m.terrainSource=s.terrain+(lod==='far'?':far':'');return bounds(m);
}
function bytes(arrays){const buffers=new Set();let n=0;for(const a of arrays)if(a&&!buffers.has(a.buffer)){buffers.add(a.buffer);n+=a.buffer.byteLength;}return n;}
function compatible(m,s){
 const expected=sourceById.get(m?.sourceId),scope=m?.forestCanopyRoadScope,range=m?.forestCanopyRoadRange,lod=m?.forestCanopyRoadLod;
 if(!expected||!s||m.forestCanopyRoad!==true||m.forestCanopyRoadBasis!=='P'||m.forestCanopyRoadRevision!==REVISION||(lod!=='base'&&lod!=='near'&&lod!=='far')||m.id!==(lod==='base'?expected.id:lod==='near'?nearId(expected.id):farId(expected.id))||(lod==='base'?m.terrainSource!==undefined:m.terrainSource!==expected.terrain+(lod==='far'?':far':''))||m.globalNear||m.globalFar||m.farVertices||m.owner!=='island'||m.group!=='roads'||m.material!=='ground'||m.component!=='connection-road'||m.pathOwner!=='forest'||m.globalSurface!==true||m.overview!==true||!Array.isArray(scope)||scope.length!==4||scope[0]!==BOUNDS[0]||scope[1]!==BOUNDS[1]||scope[2]!==BOUNDS[2]||scope[3]!==BOUNDS[3]||!Array.isArray(range)||range.length!==2||!Number.isInteger(range[0])||!Number.isInteger(range[1])||range[0]<0||range[0]>52||range[1]<58||range[1]>156||range[1]-range[0]>40)return false;
 for(const k of['id','vertexCount','indexCount','vertexSHA','indexSHA'])if(s[k]!==expected[k]||m.forestCanopyRoadSource?.[k]!==expected[k])return false;
 const p=m.forestCanopyRoadProvenance;if(!p||p.sourceVertexCount!==expected.vertexCount||p.originalVertexCount!==(lod==='base'?expected.vertexCount:0)||!typed(p.sourceIndices,'Uint16Array')||p.sourceIndices.length!==expected.indexCount||!typed(p.sourceTriangles,'Uint16Array')||!typed(p.barycentric,'Float64Array')||!typed(m.vertices,'Float32Array')||m.vertices.length%9||!typed(m.index,'Uint32Array')||m.index.length%3)return false;
 const added=m.vertices.length/9-p.originalVertexCount;if(added<0||p.sourceTriangles.length!==added||p.barycentric.length!==added*2)return false;
 return lod!=='base'||m.index.length===expected.indexCount-(range[1]-range[0])*(expected.id.endsWith(':shoulder')?12:6);
}
function coverageReady(recordMap){
 const descriptors=G.FOREST_PATH_COLORS?.metadata.records;if(!descriptors||descriptors.length!==9)return false;
 for(const id of COVERAGE){let s=null;for(let i=0;i<descriptors.length;i++)if(descriptors[i].id===id){s=descriptors[i];break;}if(!s)return false;const m=recordMap.get(id)?.data;
  if(sourceById.has(id)){const n=recordMap.get(nearId(id))?.data,f=recordMap.get(farId(id))?.data;if(!compatible(m,s)||!compatible(n,s)||!compatible(f,s)||m.forestCanopyRoadLod!=='base'||n.forestCanopyRoadLod!=='near'||f.forestCanopyRoadLod!=='far'||m.forestCanopyRoadRange[0]!==n.forestCanopyRoadRange[0]||m.forestCanopyRoadRange[1]!==n.forestCanopyRoadRange[1]||m.forestCanopyRoadRange[0]!==f.forestCanopyRoadRange[0]||m.forestCanopyRoadRange[1]!==f.forestCanopyRoadRange[1])return false;}
  else if(!m||m.group!=='roads'||m.material!=='ground'||m.owner!=='island'||m.globalSurface!==true||m.overview!==true||m.component!=='connection-road'||m.pathOwner!=='forest'||m.vertices?.length!==s.vertexCount*9||m.index?.length!==s.indexCount)return false;
 }
 return true;
}
function channels(m,a,originalColorProvider){
 const s=sourceById.get(m?.sourceId);if(!compatible(m,s)||a!==m.vertices||typeof originalColorProvider!=='function')throw Error('Unsupported canopy road channels: '+m?.id);
 const p=m.forestCanopyRoadProvenance,original=originalColorProvider(s.id,s.vertexCount,s.indexCount);if(!typed(original,'Uint8Array')||original.length!==s.vertexCount*3)throw Error('Canopy road original color source changed');
 const oldSide=new Float32Array(s.vertexCount);oldSide.fill(NaN);const values=s.id.endsWith(':shoulder')?[1,2,2,1,2,1]:[-1,1,1,-1,1,-1];
 for(let i=0;i<p.sourceIndices.length;i++){const v=p.sourceIndices[i],value=values[i%6];if(v>=s.vertexCount||Number.isFinite(oldSide[v])&&oldSide[v]!==value)throw Error('Canopy road original side conflict');oldSide[v]=value;}
 if(oldSide.some(v=>!Number.isFinite(v)))throw Error('Unused canopy road original vertex');
 const count=a.length/9,side=new Float32Array(count),ground=new Uint8Array(count*3);if(p.originalVertexCount){side.set(oldSide);ground.set(original);}
 for(let i=0;i<p.sourceTriangles.length;i++){const face=p.sourceTriangles[i];if(face>=s.indexCount/3)throw Error('Canopy road provenance triangle outside source');const w=[p.barycentric[i*2],p.barycentric[i*2+1]];w.push(1-w[0]-w[1]);if(w.some(v=>!Number.isFinite(v)||v< -1e-7||v>1.0000001))throw Error('Invalid canopy road barycentric source');const ids=Array.from(p.sourceIndices.subarray(face*3,face*3+3)),j=p.originalVertexCount+i;side[j]=w.reduce((n,v,k)=>n+v*oldSide[ids[k]],0);for(let k=0;k<3;k++)ground[j*3+k]=Math.round(w.reduce((n,v,b)=>n+v*original[ids[b]*3+k],0));}
 return{side,ground,sourceId:s.id,bytes:side.byteLength+ground.byteLength};
}
function prepare(data,pack){
 const map=new Map();for(const m of pack.meshes){if(map.has(m.id))throw Error('Duplicate canopy road input ID');map.set(m.id,m);}
 if(SOURCES.every(s=>compatible(map.get(s.id),s)&&compatible(map.get(nearId(s.id)),s)&&compatible(map.get(farId(s.id)),s)))return[];
 const roads=SOURCES.map(s=>{const m=map.get(s.id);if(!sourceValid(m,s)||map.has(nearId(s.id))||map.has(farId(s.id)))throw Error('Canopy road source needs review: '+s.id);return m;});
 const terrains=new Map();for(const s of SOURCES)for(const lod of['near','far']){const id=s.terrain+(lod==='far'?':far':'');if(!terrains.has(id))terrains.set(id,terrain(map.get(id),id));}
 const range=selectRange(roads[0],roads[1],terrains.get(SOURCES[0].terrain),terrains.get(SOURCES[0].terrain+':far'));
 const bases=[],patches=[],allocated=[],oldBuffers=new Set(),counts=[];for(const m of pack.meshes)for(const k of['vertices','index','farVertices','instances','instanceColors'])if(m[k])oldBuffers.add(m[k].buffer);
 for(let i=0;i<SOURCES.length;i++){const s=SOURCES[i],source=roads[i],sourceIndices=Uint16Array.from(source.index),r=i<2?range:null;allocated.push(sourceIndices);
  for(const lod of['base','near','far']){const result=lod==='base'?base(source,r,sourceIndices):build(source,terrains.get(s.terrain+(lod==='far'?':far':'')),lod,r,sourceIndices),m=decorate(result,s,lod,r);(lod==='base'?bases:patches).push(m);for(const a of[m.vertices,m.index,result.triangles,result.weights])if(!oldBuffers.has(a.buffer))allocated.push(a);counts.push({id:m.id,lod,triangles:m.index.length/3,addedVertices:result.addedVertices||0,replacedTriangles:result.replaced||0,createdTriangles:result.created||0});}
 }
 const geometryProvenanceBytes=bytes(allocated),channelBytes=bases.concat(patches).reduce((n,m)=>n+m.vertices.length/9*7,0),extraBytes=geometryProvenanceBytes+channelBytes,extraTriangles=bases.concat(patches).reduce((n,m)=>n+m.index.length/3,0)-roads.reduce((n,m)=>n+m.index.length/3,0);
 if(extraBytes>MAX_BYTES||extraTriangles>MAX_TRIANGLES)throw Error('Canopy road budget exceeded: '+extraBytes+' bytes / '+extraTriangles+' additional triangles');
 const meta={revision:REVISION,basis:'P',scope:BOUNDS.slice(),sourceIds:SOURCES.map(s=>s.id),nearIds:SOURCES.map(s=>nearId(s.id)),farIds:SOURCES.map(s=>farId(s.id)),range,offset:OFFSET,extraRecords:4,extraBytes,geometryProvenanceBytes,channelBytes,extraTriangles,counts,normalChange:'Patch faces face upward. Downward original shoulder-face normals are sign-corrected to their old DoubleSide top view; complete seam rows retain that unnormalized original interpolated attribute. Interior normals blend into actual terrain. Base vertices remain byte exact.'};
 const replacements=new Map(bases.map(m=>[m.id,m]));pack.meshes=pack.meshes.map(m=>replacements.get(m.id)||m);data.forestCanopyRoad=meta;return patches;
}
G.FOREST_CANOPY_ROAD={revision:REVISION,bounds:BOUNDS,sources:SOURCES,offset:OFFSET,maxBytes:MAX_BYTES,maxTriangles:MAX_TRIANGLES,prepare,channels,compatible,coverageReady,nearId,farId};
})(globalThis.GA);
