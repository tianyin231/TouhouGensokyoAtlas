/* Human Village iteration 02 refinement. Ordinary houses, parcels, shop openings,
 * market, bridges and instance placements retain their original authored geometry.
 * Float32 bit-exact indexing does not quantize positions, normals or colours.
 * Only the six bridge approaches are new geometry, on permanent public ground.
 */
(function(G){'use strict';
const ID='village',CONTACT='village-bridge-approaches',CONTACT_BOUNDS=[-29,-163,75,169];
const targetProxyIds=new Set([-1,0].flatMap(x=>[-1,0].flatMap(z=>['matte','paving'].map(m=>`overview:village:hlod:architecture:world:${x}:${z}:${m}`))));
const kinds={wood:['#614731','#3b3028','#806342'],stone:['#8f9384','#b2b19d','#737c70'],paper:['#ddcda8'],recess:['#28342f'],plaster:['#ded7bd','#cfcab4','#b9ab90','#d8d0b7','#847258','#dad7c7','#e2ddc9','#ded9c5','#f0e5bf'],grass:['#648047','#73815a','#685945']};
for(const key of Object.keys(kinds))kinds[key]=kinds[key].map(c=>G.rgb(c));
const materialKind={wood:0,stone:2,plaster:3,paper:4,recess:5,grass:8};
function bytes(meshes){let total=0;const seen=new Set();for(const m of meshes)for(const k of ['vertices','farVertices','instances','instanceColors','index','villageFinish','villageFarFinish']){const a=m[k];if(a&&!seen.has(a.buffer)){seen.add(a.buffer);total+=a.buffer.byteLength;}}return total;}
function triangles(m,far=false){const a=far&&m.farVertices?m.farVertices:m.vertices;return (far&&m.farVertices?a.length/27:m.index?m.index.length/3:a.length/27)*(m.instances?m.instances.length/16:1);}
// Each vertex view has an explicit geometry length. Its two-byte finish view
// occupies the aligned tail of the same transferred buffer, never the geometry.
function withFinish(a,c){
 if(c.length!==a.length/9*2)throw Error('Village finish size changed');
 const buffer=new ArrayBuffer(Math.ceil((a.byteLength+c.byteLength)/4)*4),vertices=new Float32Array(buffer,0,a.length),villageFinish=new Uint8Array(buffer,a.byteLength,c.length);
 new Uint32Array(buffer,0,a.length).set(new Uint32Array(a.buffer,a.byteOffset,a.length));villageFinish.set(c);return{vertices,villageFinish};
}
// Two bounded passes only merge adjacent [a,b,c,a,c,d] triangles. All nine
// Float32 bit patterns and both finish bytes must agree; no strings or JS out.
function indexed(a,c=null){
 if(a.length%27)throw Error('Village indexing requires complete triangles');
 const n=a.length/9;if(c&&c.length!==n*2)throw Error('Village indexing channel size changed');
 const bits=new Uint32Array(a.buffer,a.byteOffset,a.length),same=(x,y)=>{for(let k=0;k<9;k++)if(bits[x*9+k]!==bits[y*9+k])return false;return !c||c[x*2]===c[y*2]&&c[x*2+1]===c[y*2+1];},quad=i=>i+6<=n&&same(i,i+3)&&same(i+2,i+4);
 let count=0;for(let i=0;i<n;){const q=quad(i);count+=q?4:3;i+=q?6:3;}
 if(count*36+n*4>=a.byteLength)return c?withFinish(a,c):{vertices:a};
 const geometryBytes=count*36,finishBytes=c?count*2:0,buffer=new ArrayBuffer(Math.ceil((geometryBytes+finishBytes)/4)*4),vertices=new Float32Array(buffer,0,count*9),dest=new Uint32Array(buffer,0,count*9),index=new Uint32Array(n),villageFinish=c?new Uint8Array(buffer,geometryBytes,finishBytes):null;
 let next=0;for(let i=0;i<n;){const q=quad(i),size=q?4:3,base=next;for(let k=0;k<size;k++){const from=i+(q&&k===3?5:k);for(let h=0;h<9;h++)dest[next*9+h]=bits[from*9+h];if(c){villageFinish[next*2]=c[from*2];villageFinish[next*2+1]=c[from*2+1];}next++;}
  index[i]=base;index[i+1]=base+1;index[i+2]=base+2;if(q){index[i+3]=base;index[i+4]=base+2;index[i+5]=base+3;}i+=q?6:3;
 }
 return c?{vertices,index,villageFinish}:{vertices,index};
}
function expanded(m){if(!m.index)return m.vertices;const out=new Float32Array(m.index.length*9),source=new Uint32Array(m.vertices.buffer,m.vertices.byteOffset,m.vertices.length),dest=new Uint32Array(out.buffer);for(let i=0;i<m.index.length;i++)dest.set(source.subarray(m.index[i]*9,m.index[i]*9+9),i*9);return out;}
const finishKinds=['wood','stone','paper','recess','plaster','grass'];
function finish(r,g,b,roof=false){
 for(let i=0;i<finishKinds.length;i++){const key=finishKinds[i],list=kinds[key];for(let k=0;k<list.length;k++){const p=list[k];if(Math.abs(r-p[0])<2e-6&&Math.abs(g-p[1])<2e-6&&Math.abs(b-p[2])<2e-6)return materialKind[key];}}
 // The original ordinary-house roof palette varies continuously by seeded mix.
 if(roof||r<.135&&g<.175&&b<.175&&g>r*.85&&b>r*.70)return 1;
 // The five embankment rows use the same two masonry colours in a .14 blend.
 for(let i=0;i<kinds.stone.length;i++){const p=kinds.stone[i];if(Math.hypot(r-p[0],g-p[1],b-p[2])<.055)return 2;}
 return 9; // Cloth and other unknown finishes retain their original colour.
}
// Identical primitive/weight rules to v1, using scalar and reusable typed-array
// loops. This runs in the Worker; interaction only uploads the retained tail.
function channels(m,a=m.vertices){
 const index=a===m.vertices?m.index:null,out=new Uint8Array(a.length/9*2),weights=new Float32Array(a.length/9),n=index?index.length:a.length/9;
 const at=j=>index?index[j]:j,normals=new Float64Array(18),roof=m.villageMicro==='roof';
 for(let j=0;j<n;){let count=3;
  // Recover the original Geometry.box primitive from its six opposing faces.
  // This keeps grain along a post/beam even on its short bearing/end faces.
  if(j+36<=n){for(let face=0;face<6;face++){const p=at(j+face*6)*9+3;normals[face*3]=a[p];normals[face*3+1]=a[p+1];normals[face*3+2]=a[p+2];}
   const ax0=Math.abs(normals[0])>.9999?0:Math.abs(normals[1])>.9999?1:Math.abs(normals[2])>.9999?2:-1,ax1=Math.abs(normals[6])>.9999?0:Math.abs(normals[7])>.9999?1:Math.abs(normals[8])>.9999?2:-1,ax2=Math.abs(normals[12])>.9999?0:Math.abs(normals[13])>.9999?1:Math.abs(normals[14])>.9999?2:-1;
   let box=ax0>=0&&ax1>=0&&ax2>=0&&ax0!==ax1&&ax0!==ax2&&ax1!==ax2;
   for(let face=0;box&&face<6;face+=2){const p=face*3;if(normals[p]*normals[p+3]+normals[p+1]*normals[p+4]+normals[p+2]*normals[p+5]>=-.9999)box=false;}
   for(let face=0;box&&face<6;face++)for(let k=0;box&&k<6;k++){const p=at(j+face*6+k)*9+3,q=face*3;if(Math.abs(a[p]-normals[q])>=1e-6||Math.abs(a[p+1]-normals[q+1])>=1e-6||Math.abs(a[p+2]-normals[q+2])>=1e-6)box=false;}
   const colour=at(j)*9+6;for(let k=0;box&&k<36;k++){const p=at(j+k)*9+6;if(Math.abs(a[p]-a[colour])>=2e-6||Math.abs(a[p+1]-a[colour+1])>=2e-6||Math.abs(a[p+2]-a[colour+2])>=2e-6)box=false;}
   if(box)count=36;
  }
  let minX=Infinity,minY=Infinity,minZ=Infinity,maxX=-Infinity,maxY=-Infinity,maxZ=-Infinity;
  for(let k=0;k<count;k++){const p=at(j+k)*9;minX=Math.min(minX,a[p]);minY=Math.min(minY,a[p+1]);minZ=Math.min(minZ,a[p+2]);maxX=Math.max(maxX,a[p]);maxY=Math.max(maxY,a[p+1]);maxZ=Math.max(maxZ,a[p+2]);}
  const sx=maxX-minX,sy=maxY-minY,sz=maxZ-minZ,axis=sy>sx&&sy>sz?1:sz>sx?2:0,size=axis===0?sx:axis===1?sy:sz,i=at(j)*9,type=finish(a[i+6],a[i+7],a[i+8],roof);
  for(let k=0;k<count;k++){const id=at(j+k);if(size>=weights[id]){out[id*2]=type;out[id*2+1]=type===0||type===1?axis:1;weights[id]=size;}}
  j+=count;
 }
 return out;
}
function microFar(a){
 const keep=i=>Math.max(Math.max(a[i],a[i+9],a[i+18])-Math.min(a[i],a[i+9],a[i+18]),Math.max(a[i+1],a[i+10],a[i+19])-Math.min(a[i+1],a[i+10],a[i+19]),Math.max(a[i+2],a[i+11],a[i+20])-Math.min(a[i+2],a[i+11],a[i+20]))>2.6;
 let count=0;for(let i=0;i<a.length;i+=27)if(keep(i))count+=27;const out=new Float32Array(count),source=new Uint32Array(a.buffer,a.byteOffset,a.length),dest=new Uint32Array(out.buffer,0,out.length);let next=0;
 for(let i=0;i<a.length;i+=27)if(keep(i))for(let k=0;k<27;k++)dest[next++]=source[i+k];return out;
}
function farProp(type){const g=new G.Geometry(),C=G.C;
 if(type==='stone'){g.ellipsoid(0,.28,0,.6,.37,.45,G.rgb('#92988a'),5,2);g.ellipsoid(.24,.39,-.04,.29,.25,.24,G.rgb('#a7aa95'),4,2);}
 else if(type==='shrub')for(let i=0;i<4;i++){const a=i*2.4,r=(i%3)*.29;g.ellipsoid(Math.cos(a)*r,.35+(i%3)*.12,Math.sin(a)*r,.48,.33,.43,G.blend(G.rgb('#496548'),G.rgb('#809152'),(i%4)*.20),5,2);}
 else if(type==='jar'){const col=G.rgb('#b4b6a5');g.cone(0,0,0,.20,.33,.27,col,6);g.cone(0,.27,0,.33,.23,.27,col,6);g.cone(0,.54,0,.23,.18,.12,C.woodDark,6);}
 else throw Error('Unknown village far prop: '+type);
 return g.mesh('village-far-'+type).vertices;
}
function upgradeDetail(pack){
 const sourceBytes=bytes(pack.meshes),sourceTriangles=pack.meshes.reduce((n,m)=>n+triangles(m),0),compact=new Map(),surfaceCompact=new Map(),roofCompact=new Map(),farCompact=new Map(),farRoofCompact=new Map(),farProps=new Map();let micro=0,workerFinishMs=0;
 const meshes=pack.meshes.map(m=>{
  if(m.owner!==ID||m.legacyInstanceIdentity||m.group==='water')return m;
  const out={...m,villageOriginalMaterial:m.material},surface=m.material==='matte'&&m.lod!=='props'||m.material==='roof',roof=m.material==='roof'&&m.lod==='near',cache=surface?(roof?roofCompact:surfaceCompact):compact;
  if(!cache.has(m.vertices)){const primitive={...m,villageMicro:roof?'roof':undefined},start=performance.now(),c=surface?channels(primitive):null;if(surface)workerFinishMs+=performance.now()-start;cache.set(m.vertices,m.index?(surface?{...withFinish(m.vertices,c),index:m.index}:{vertices:m.vertices,index:m.index}):indexed(m.vertices,c));}Object.assign(out,cache.get(m.vertices));
  if(m.material==='matte'&&m.lod!=='props'||m.material==='roof')out.material='villageSurface';
  if(m.material==='paving')out.material='villagePaving';
  if(m.lod==='near'){
   out.villageMicro=m.material==='roof'?'roof':'joinery';out.farVertices=microFar(m.vertices);out.lodDistance=125;micro++;
  }
  if(m.lod==='props'){
   const type=m.id.split(':')[1];if(['stone','shrub','jar'].includes(type)){if(!farProps.has(type))farProps.set(type,farProp(type));out.farVertices=farProps.get(type);out.lodDistance=72;out.villageProp=type;}
  }
  if(surface&&out.farVertices){const cache=roof?farRoofCompact:farCompact,a=out.farVertices;if(!cache.has(a)){const start=performance.now(),c=channels(out,a);workerFinishMs+=performance.now()-start;cache.set(a,withFinish(a,c));}const far=cache.get(a);out.farVertices=far.vertices;out.villageFarFinish=far.villageFinish;}
  return out;
 });
 const result={...pack,meshes,bytes:bytes(meshes),meta:{...pack.meta,villageUpgrade:{revision:3,sourceBytes,sourceTriangles,microBatches:micro,losslessNear:true,nearLayoutRetained:true,workerFinishTails:true,workerFinishMs,indexing:'two-pass adjacent exact quads',basis:'P: ordinary materials and six existing bridge approaches'}}};
 if(result.bytes>sourceBytes)throw Error('Village refinement source budget exceeded');return result;
}
// Clip the rendered contact triangles to the complete rectangular footing.
// Extrema include triangle/rectangle intersections, not just the four corners.
function footingSamples(a,points){
 const xs=points.map(p=>p[0]),zs=points.map(p=>p[1]),limits=[[0,Math.min(...xs),1],[0,Math.max(...xs),-1],[2,Math.min(...zs),1],[2,Math.max(...zs),-1]],out=[];
 for(let i=0;i<a.length;i+=9){let poly=[Array.from(a.subarray(i,i+3)),Array.from(a.subarray(i+3,i+6)),Array.from(a.subarray(i+6,i+9))];
  for(const [axis,bound,sign]of limits){const next=[];for(let j=0;j<poly.length;j++){const p=poly[j],q=poly[(j+1)%poly.length],insideP=(p[axis]-bound)*sign>=-1e-9,insideQ=(q[axis]-bound)*sign>=-1e-9;if(insideP)next.push(p);if(insideP!==insideQ){const t=(bound-p[axis])/(q[axis]-p[axis]);next.push(p.map((v,k)=>v+(q[k]-v)*t));}}poly=next;if(!poly.length)break;}
  if(poly.length>=3)out.push(...poly);
 }
 if(!out.length)throw Error('Village footing has no rendered terrain');return out;
}
// Only proxy caps can taper in plan. Clip against their actual convex edges,
// preserving the original rectangle sampler above for all native caps.
function convexFootingSamples(a,points){
 let area=0;for(let i=0;i<points.length;i++){const p=points[i],q=points[(i+1)%points.length];area+=p[0]*q[1]-q[0]*p[1];}
 if(Math.abs(area)<1e-8)throw Error('Village proxy footing has no plan area');const sign=Math.sign(area),out=[];
 for(let i=0;i<a.length;i+=9){let poly=[Array.from(a.subarray(i,i+3)),Array.from(a.subarray(i+3,i+6)),Array.from(a.subarray(i+6,i+9))];
  for(let k=0;k<points.length;k++){const edge=points[k],end=points[(k+1)%points.length],dx=end[0]-edge[0],dz=end[1]-edge[1],distance=p=>sign*(dx*(p[2]-edge[1])-dz*(p[0]-edge[0])),next=[];
   for(let j=0;j<poly.length;j++){const p=poly[j],q=poly[(j+1)%poly.length],dp=distance(p),dq=distance(q),insideP=dp>=-1e-9,insideQ=dq>=-1e-9;if(insideP)next.push(p);if(insideP!==insideQ){const t=dp/(dp-dq);next.push(p.map((v,h)=>v+(q[h]-v)*t));}}
   poly=next;if(!poly.length)break;
  }if(poly.length>=3)out.push(...poly);
 }if(!out.length)throw Error('Village proxy footing has no rendered terrain');return out;
}
function bridgeEdge(z,side){
 const wood=z!==32,cx=G.canalCenter(z),half=G.canalWidth(z)+(wood?5:4.4);let xx=-half;
 if(wood&&side>0)for(let u=-half;u<half;u+=.50)xx=u;
 if(!wood&&side>0)xx=-half+2*half*52/52;
 // Mirror only the six original endpoint expressions, not the whole builder.
 // The checker reads the original near packet and compares the resulting bits.
 const x=cx+xx+(wood?side*.47/2:0),y=wood?30.22+1.0*(1-(xx/half)**2)+.19:30.16+2.35*(1-(xx/half)**2);
 return{x:Math.fround(x),y:Math.fround(y)};
}
function proxyBridgeEdge(pack,z,side){
 const native=bridgeEdge(z,side),wood=z!==32,col=wood?G.C.timber:G.C.stoneLight;let edge=null;
 // A finite semantic read at the central walking line. Voxel proxies have
 // different bounds/colours, and must not stand in for authored near boards.
 for(const m of pack.meshes){if(!targetProxyIds.has(m.id)||!['matte','villageSurface'].includes(m.material))continue;const a=m.vertices,ix=m.index,n=ix?ix.length:a.length/9;
  for(let i=0;i<n;i+=3){const q=[0,1,2].map(k=>(ix?ix[i+k]:i+k)*9);if(a[q[0]+4]<.9||Math.hypot(a[q[0]+6]-col[0],a[q[0]+7]-col[1],a[q[0]+8]-col[2])>.065)continue;
   if(Math.min(...q.map(k=>a[k+2]))>z||Math.max(...q.map(k=>a[k+2]))<z)continue;
   for(const k of q){if(Math.abs(a[k]-native.x)>1.0||a[k+1]<native.y-.55||a[k+1]>native.y+.55)continue;
    if(!edge||side*a[k]>side*edge.x+1e-6)edge={x:a[k],yMin:a[k+1],yMax:a[k+1],source:m.id};else if(Math.abs(a[k]-edge.x)<1e-6){edge.yMin=Math.min(edge.yMin,a[k+1]);edge.yMax=Math.max(edge.yMax,a[k+1]);}
   }
  }
 }
 return edge;
}
function proxyBridgeProfile(pack,z,side){
 const edge=proxyBridgeEdge(pack,z,side);if(!edge||edge.yMin!==edge.yMax)throw Error('Village proxy bridge has no constant endpoint plane');
 const m=pack.meshes.find(m=>m.id===edge.source);if(m.material!=='matte')throw Error('Village proxy bridge source material changed');const a=m.vertices,ix=m.index,n=ix?ix.length:a.length/9,col=z!==32?G.C.timber:G.C.stoneLight,spans=[];
 for(let i=0;i<n;i+=3){const q=[0,1,2].map(k=>(ix?ix[i+k]:i+k)*9);if(a[q[0]+4]<.9||Math.hypot(a[q[0]+6]-col[0],a[q[0]+7]-col[1],a[q[0]+8]-col[2])>.065||q.some(k=>Math.abs(a[k+1]-edge.yMin)>1e-6))continue;
  for(let j=0;j<3;j++){const p=q[j],r=q[(j+1)%3];if(Math.abs(a[p]-edge.x)<1e-6&&Math.abs(a[r]-edge.x)<1e-6&&Math.abs(a[p+2]-a[r+2])>1e-6)spans.push([Math.min(a[p+2],a[r+2]),Math.max(a[p+2],a[r+2])]);}
 }
 spans.sort((a,b)=>a[0]-b[0]);const merged=[];for(const span of spans){const last=merged[merged.length-1];if(last&&span[0]<=last[1]+1e-5)last[1]=Math.max(last[1],span[1]);else merged.push(span.slice());}
 const coverage=merged.find(p=>p[0]<=z&&p[1]>=z);if(!coverage)throw Error('Village proxy bridge endpoint width is disconnected');
 return{...edge,y:edge.yMin,zMin:coverage[0],zMax:coverage[1],coverage:coverage.slice()};
}
function nativeBridgeSource(z){return'matte:base:'+Math.floor(G.canalCenter(z)/96)+':'+Math.floor(z/96);}
function approaches(data,pack,edges,far=false,representation='native'){
 const lod=far?'far':'near',sampler=G.SurfaceContact.sampler(data,CONTACT,lod),meshes=[],contacts=[],tiles=new Map(pack.meshes.filter(m=>m.component==='island-terrain'&&!m.cutOnly&&m.index&&!!m.globalFar===far).map(m=>[m.tile[0]+':'+m.tile[1],m]));
 for(const z of[-158,32,164])for(const side of[-1,1]){
  const wood=z!==32,edge=edges.get(z+':'+side),inner=edge.x+side*.003,outer=inner+side*2.20,halfWidth=wood?3.10:4.58,topIn=edge.y;
  const outerZRange=[z-halfWidth,z+halfWidth],innerZRange=representation==='proxy'?[Math.max(outerZRange[0],edge.zMin),Math.min(outerZRange[1],edge.zMax)]:outerZRange.slice();if(innerZRange[1]<=innerZRange[0])throw Error('Village proxy bridge has no overlapping endpoint width');
  const pts=[[inner,innerZRange[0]],[outer,outerZRange[0]],[outer,outerZRange[1]],[inner,innerZRange[1]]],ground=pts.map(p=>sampler.height(...p)),samples=(representation==='proxy'?convexFootingSamples:footingSamples)(data.surfaceContacts[CONTACT][lod],pts),topOut=Math.max(30.09,...samples.map(p=>p[1]+.055)),bottom=Math.min(...samples.map(p=>p[1]))-.11,top=pts.map((p,i)=>[p[0],i===0||i===3?topIn:topOut,p[1]]),under=pts.map(p=>[p[0],bottom,p[1]]),g=new G.Geometry(),col=G.rgb(wood?'#a0a28e':'#b2b19d');
  const keys=new Set(pts.map(p=>Math.floor(p[0]/256)*256+':'+Math.floor(p[1]/256)*256));if(keys.size!==1)throw Error('Village footing crossed a terrain tile; split it before binding LOD');const terrain=tiles.get([...keys][0]);if(!terrain)throw Error('Village footing terrain source missing: '+lod);
  if(side>0){g.quad(top[3],top[2],top[1],top[0],col);g.quad(under[0],under[1],under[2],under[3],G.rgb('#737c70'));}
  else{g.quad(top[0],top[1],top[2],top[3],col);g.quad(under[3],under[2],under[1],under[0],G.rgb('#737c70'));}
  for(let i=0;i<4;i++){const j=(i+1)%4;if(side>0)g.quad(under[j],under[i],top[i],top[j],G.rgb('#8f9384'));else g.quad(under[i],under[j],top[j],top[i],G.rgb('#8f9384'));}
  const id=`village:public:bridge-approach:${z}:${side}:${lod}:${representation}`,bridgeSourceId=representation==='proxy'?edge.source:nativeBridgeSource(z);
  meshes.push(g.mesh(id,'architecture',{owner:'island',region:'island',space:'surface',globalSurface:true,overview:true,globalNear:!far,globalFar:far,terrainSource:terrain.id,terrainLodCenter:terrain.center.slice(),terrainLodRadius:terrain.radius,component:'village-bridge-approach',material:'villageStone',basis:'P',maxDetailDistance:500,bridgeZ:z,bridgeSide:side,bridgeRepresentation:representation,bridgeSourceId,innerZRange,outerZRange}));
  contacts.push({id,z,side,inner,outer,halfWidth,bottom,ground,top:top.map(p=>p[1]),points:pts,samples,edge,terrainSource:terrain.id,bridgeRepresentation:representation,bridgeSourceId,innerZRange,outerZRange});
 }
 return{meshes,contacts};
}
function bound(m){const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(const a of[m.vertices,m.farVertices].filter(Boolean))for(let i=0;i<a.length;i+=9)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],a[i+k]);hi[k]=Math.max(hi[k],a[i+k]);}m.center=lo.map((v,k)=>(v+hi[k])/2);m.radius=G.length(G.sub(hi,lo))/2+.025;return m;}
function routeSegments(){
 const defs=[['route-forest',[-220,32],120],['route-shrine',[220,32],95],['route-temple',[110,196],145],['route-flower',[-60,230],115]],segments=[];
 const d=(p,a,b)=>{const dx=b[0]-a[0],dz=b[1]-a[1],t=G.clamp(((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(dx*dx+dz*dz||1),0,1);return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dz);};
 const simplify=points=>{let worst=.18,j=-1;for(let i=1;i<points.length-1;i++){const n=d(points[i],points[0],points.at(-1));if(n>worst){worst=n;j=i;}}return j<0?[points[0],points.at(-1)]:[...simplify(points.slice(0,j+1)).slice(0,-1),...simplify(points.slice(j))];};
 for(let k=0;k<defs.length;k++){const [id,origin,range]=defs[k],route=G.ISLAND.allRoutes.find(p=>p.id===id);if(!route)throw Error('Village route missing: '+id);const pts=route.samples.filter(p=>Math.hypot(p[0]-origin[0],p[1]-origin[1])<=range);if(pts.length<2)throw Error('Village route mouth missing: '+id);const ps=simplify(pts);for(let i=1;i<ps.length;i++)segments.push({a:ps[i-1].slice(),b:ps[i].slice(),width:route.width,origin:origin.slice(),range,id});}
 if(segments.length>32)throw Error('Village route segment budget exceeded');return segments;
}
function publicEnvironment(data,pack){
 if(pack.villageUpgradeApplied)return[];
 const proxies=pack.meshes.filter(m=>targetProxyIds.has(m.id));if(proxies.length!==8)throw Error('Village proxy targets changed; review exact replacement');
 // All eight original overview records, material fields and views stay intact.
 // Detail finishes only appear when the actual village detail pack is loaded.
 const proxySourceBytes=bytes(proxies);
 G.SurfaceContact.prepare(data,pack,CONTACT,CONTACT_BOUNDS);
 const keys=[-158,32,164].flatMap(z=>[-1,1].map(side=>[z,side])),edges=new Map(keys.map(([z,side])=>[z+':'+side,bridgeEdge(z,side)])),profiles=new Map(keys.map(([z,side])=>[z+':'+side,proxyBridgeProfile(pack,z,side)])),near=approaches(data,pack,edges),far=approaches(data,pack,edges,true),proxyNear=approaches(data,pack,profiles,false,'proxy'),proxyFar=approaches(data,pack,profiles,true,'proxy');
 // Terrain and displayed bridge representation are independent. Only the
 // inherited wanted decisions choose one of the four permanent cap records.
 const meshes=[...near.meshes,...far.meshes,...proxyNear.meshes,...proxyFar.meshes].map(bound);
 const proxyConnections=[...proxyNear.contacts,...proxyFar.contacts].map(c=>{const edge=c.edge;return{id:c.id,z:c.z,side:c.side,edge,gap:(c.inner-edge.x)*c.side,stepRange:[c.top[0]-edge.yMax,c.top[0]-edge.yMin],innerZRange:c.innerZRange,outerZRange:c.outerZRange,fullWidthPlaneVerified:true,visualAccepted:false};});
 data.villageUpgrade={revision:3,replacedProxyIds:[],preservedProxyIds:[...targetProxyIds],proxySourceBytes,proxyUpdatedBytes:bytes(pack.meshes.filter(m=>targetProxyIds.has(m.id))),proxyConnections,bridgeProfiles:[...profiles].map(([key,profile])=>({key,...profile})),approachContacts:{near:[...near.contacts,...proxyNear.contacts],far:[...far.contacts,...proxyFar.contacts]},contactBytes:data.surfaceContacts[CONTACT].near.byteLength+data.surfaceContacts[CONTACT].far.byteLength};
 pack.villageUpgradeApplied=true;return meshes;
}
const previous=G.buildRegion;
G.VILLAGE_UPGRADE={id:ID,version:3,originalBuildRegion:previous,indexed,withFinish,expanded,bytes,triangles,channels,microFar,bridgeEdge,proxyBridgeEdge,proxyBridgeProfile,routeSegments,publicEnvironment,targetProxyIds:[...targetProxyIds],contactId:CONTACT,contactBounds:CONTACT_BOUNDS.slice()};
G.buildRegion=async function(data,id,legacy){if(id!==ID)return previous(data,id,legacy);const start=performance.now(),pack=await previous(data,id,legacy),sourceEnd=performance.now(),result=upgradeDetail(pack),end=performance.now();result.builtMs=end-start;result.meta.villageUpgrade.timings={originalBuildMs:sourceEnd-start,originalReportedBuiltMs:pack.builtMs,upgradeMs:end-sourceEnd};return result;};
G.extraOverviewBuilders=[...(G.extraOverviewBuilders||[]),(data,pack)=>publicEnvironment(data,pack)];
})(globalThis.GA);
