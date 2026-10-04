// Bounded checks reuse the caller's real overview before/after packages.
// No world/region construction, Worker, renderer construction or GPU occurs.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import * as T from '../vendor/three/three.module.js';
const hash=b=>createHash('sha256').update(b).digest('hex'),raw=a=>Buffer.from(a.buffer,a.byteOffset,a.byteLength);
const SOURCES=Object.freeze([
 {id:'island:routes:forest:-2:0',vertexCount:864,indexCount:936,vertexSHA:'14fca81a4e2e24c3cdb8667ccd6e17dab52ec90da60fd000f441bbd47325adfa',indexSHA:'eb96de890b018207f9c3e6aa67a2d3c4206ab05fd679d006a075bf0caec15695',terrain:'island:terrain:-1024:0'},
 {id:'island:routes:forest:-2:0:shoulder',vertexCount:1696,indexCount:1872,vertexSHA:'29369a0f81ce7c5fcf60e34022e6912e32d317a63f4540338b20f99d7f8d2f2e',indexSHA:'1c81eab4680628fb97dc00b50f99adb4ef12bb17d91bd6e15ed2a1c7b61bedb9',terrain:'island:terrain:-1024:0'}
]);
const nearId=id=>id+':canopy-road-near',farId=id=>id+':canopy-road-far';
const GROUND_TERRAINS=new Set(['island:terrain:-1280:0','island:terrain:-1280:0:far','island:terrain:-1024:0','island:terrain:-1024:0:far']);
const CANDIDATE_FIELDS=new Set(['forestCanopyRoad','forestCanopyRoadBasis','sourceId','forestCanopyRoadRevision','forestCanopyRoadLod','terrainSource','forestCanopyRoadSource','forestCanopyRoadScope','forestCanopyRoadRange','forestCanopyRoadProvenance']);
const json=x=>JSON.stringify(x),typed=a=>ArrayBuffer.isView(a),type=(a,name)=>typed(a)&&a.constructor.name===name;
function copyColors(G,read){if(G.FOREST_PATH_COLORS)return G.FOREST_PATH_COLORS;const scope=vm.createContext({GA:{},atob});vm.runInContext(String(read('src/forest-path-colors.js')),scope,{filename:'independent-forest-path-color-source.js'});return scope.GA.FOREST_PATH_COLORS;}
function tri(m,face){return Array.from(m.index.subarray(face*3,face*3+3),i=>new T.Vector3(m.vertices[i*9],m.vertices[i*9+1],m.vertices[i*9+2]));}
const orient=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
function area(poly){let a=0;for(let i=1;i+1<poly.length;i++)a+=orient(poly[0],poly[i],poly[i+1]);return Math.abs(a)/2;}
function inside(p,t){const d=orient(...t),s=Math.sign(d);return t.every((a,i)=>s*orient(a,t[(i+1)%3],p)>=-1e-10);}
// Independent convex intersection: enumerate enclosed vertices and edge-edge
// crossings, then sort their convex hull. Does not call production clipping.
function intersection(a,b){
 const points=[],put=p=>{if(!points.some(q=>Math.hypot(q[0]-p[0],q[1]-p[1])<1e-8))points.push(p);};
 for(const p of a)if(inside(p,b))put(p);for(const p of b)if(inside(p,a))put(p);
 for(let i=0;i<3;i++)for(let j=0;j<3;j++){
  const p=a[i],q=a[(i+1)%3],r=b[j],s=b[(j+1)%3],dx=q[0]-p[0],dz=q[1]-p[1],ex=s[0]-r[0],ez=s[1]-r[1],den=dx*ez-dz*ex;if(Math.abs(den)<1e-12)continue;
  const u=((r[0]-p[0])*ez-(r[1]-p[1])*ex)/den,v=((r[0]-p[0])*dz-(r[1]-p[1])*dx)/den;
  if(u>=-1e-10&&u<=1+1e-10&&v>=-1e-10&&v<=1+1e-10)put([p[0]+u*dx,p[1]+u*dz]);
 }
 if(points.length<3)return[];const cx=points.reduce((n,p)=>n+p[0],0)/points.length,cz=points.reduce((n,p)=>n+p[1],0)/points.length;
 return points.sort((p,q)=>Math.atan2(p[1]-cz,p[0]-cx)-Math.atan2(q[1]-cz,q[0]-cx));
}
const planar=ps=>new T.Plane().setFromCoplanarPoints(...ps),at=(plane,p)=>-(plane.normal.x*p[0]+plane.normal.z*p[1]+plane.constant)/plane.normal.y;
function terrainFaces(m){const result=[];for(let i=0;i<m.index.length/3;i++){const ps=tri(m,i),xz=ps.map(p=>[p.x,p.z]);if(area(xz)<1e-10)continue;result.push({ps,xz,plane:planar(ps),x0:Math.min(...xz.map(p=>p[0])),x1:Math.max(...xz.map(p=>p[0])),z0:Math.min(...xz.map(p=>p[1])),z1:Math.max(...xz.map(p=>p[1]))});}return result;}
function contact(m,t){
 const faces=terrainFaces(t),stats={id:m.id,terrainSource:t.id,triangles:m.index.length/3,overlays:0,corners:0,minGap:Infinity,maxGap:-Infinity,maxCoverageError:0,minProjectedArea:Infinity,minUpNormal:Infinity,minAttributeTerrainDot:Infinity,maxBoundsExcess:-Infinity};
 for(let face=0;face<m.index.length/3;face++){
  const ps=tri(m,face),xz=ps.map(p=>[p.x,p.z]),ar=area(xz),plane=planar(ps);assert(ar>1e-12,'Actual Float32 degenerate road triangle '+m.id+'/'+face);assert(plane.normal.y>0,'Road winding is not upward '+m.id+'/'+face);
  stats.minProjectedArea=Math.min(stats.minProjectedArea,ar);stats.minUpNormal=Math.min(stats.minUpNormal,plane.normal.y);let total=0;
  for(const p of ps){assert(p.x>-1120&&p.x< -896&&p.z>0&&p.z<224,'Patch leaves ROI');stats.maxBoundsExcess=Math.max(stats.maxBoundsExcess,p.distanceTo(new T.Vector3(...m.center))-m.radius);}
  for(const tf of faces){if(tf.x1<Math.min(...xz.map(p=>p[0]))||tf.x0>Math.max(...xz.map(p=>p[0]))||tf.z1<Math.min(...xz.map(p=>p[1]))||tf.z0>Math.max(...xz.map(p=>p[1])))continue;
   const polygon=intersection(xz,tf.xz),part=area(polygon);if(part<1e-12)continue;total+=part;stats.overlays++;
   for(const p of polygon){const y=at(plane,p),gap=y-at(tf.plane,p);assert(Number.isFinite(gap),'Nonfinite actual triangle gap');stats.minGap=Math.min(stats.minGap,gap);stats.maxGap=Math.max(stats.maxGap,gap);stats.corners++;assert(gap>=.02485,'Triangle interior buries into actual terrain '+m.id+'/'+face+': '+gap);assert(gap<=.25015,'Triangle interior floats above finite seam bound '+m.id+'/'+face+': '+gap);
    const weights=T.Triangle.getBarycoord(new T.Vector3(p[0],y,p[1]),...ps,new T.Vector3()).toArray(),normal=new T.Vector3();
    for(let k=0;k<3;k++){const index=m.index[face*3+k]*9;normal.addScaledVector(new T.Vector3(m.vertices[index+3],m.vertices[index+4],m.vertices[index+5]),weights[k]);}
    const groundNormal=tf.plane.normal.clone();if(groundNormal.y<0)groundNormal.negate();const dot=normal.dot(groundNormal);assert(dot>0,'Attribute normal opposes its actual ground plane');stats.minAttributeTerrainDot=Math.min(stats.minAttributeTerrainDot,dot);
   }
  }
  const error=Math.abs(total-ar);stats.maxCoverageError=Math.max(stats.maxCoverageError,error);assert(error<=Math.max(1e-7,ar*1e-6),'Actual terrain coverage incomplete '+m.id+'/'+face+': '+error);
 }
 assert(stats.maxBoundsExcess<0);return stats;
}
function provenance(m,source){
 const p=m.forestCanopyRoadProvenance,stats={id:m.id,vertices:m.vertices.length/9,maxXZError:0,maxSourceRGBError:0,seamVertices:0,seamNormalBitDifferences:0,maxSeamNormalError:0,maxSeamXYZError:0,originalCorners:0};
 assert.equal(hash(raw(source.vertices)),m.forestCanopyRoadSource.vertexSHA);assert.equal(hash(raw(source.index)),m.forestCanopyRoadSource.indexSHA);
 assert.deepEqual(Array.from(p.sourceIndices),Array.from(source.index));
 if(m.forestCanopyRoadLod==='base'){
  assert.equal(m.vertices,source.vertices);assert.equal(m.center,source.center);assert.equal(m.radius,source.radius);
  const scale=m.sourceId.endsWith(':shoulder')?2:1,expected=[];for(let f=0;f<source.index.length/3;f++)if(Math.floor(f/2)<35*scale||Math.floor(f/2)>=60*scale)expected.push(...source.index.subarray(f*3,f*3+3));
  assert.deepEqual(Array.from(m.index),expected);return{...stats,allVerticesByteExact:true,outsideIndicesExact:true};
 }
 const scale=m.sourceId.endsWith(':shoulder')?2:1;
 for(let i=0;i<m.vertices.length/9;i++){
  const f=p.sourceTriangles[i],w=[p.barycentric[i*2],p.barycentric[i*2+1]];w.push(1-w[0]-w[1]);assert(w.every(v=>Number.isFinite(v)&&v>=-1e-7&&v<=1.0000001));const q=Math.floor(f/2);assert(q>=35*scale&&q<60*scale);const sign=Math.sign(planar(tri(source,f)).normal.y);
  const ids=Array.from(source.index.subarray(f*3,f*3+3)),old=Array.from({length:9},(_,k)=>w.reduce((n,v,j)=>n+v*source.vertices[ids[j]*9+k],0)),a=m.vertices.subarray(i*9,i*9+9);
  for(const k of[0,2]){const error=Math.abs(a[k]-old[k]);stats.maxXZError=Math.max(stats.maxXZError,error);assert(error<.0001,'Provenance changed XZ');}
  for(const k of[6,7,8]){const error=Math.abs(a[k]-old[k]);stats.maxSourceRGBError=Math.max(stats.maxSourceRGBError,error);assert(error<1e-7,'Geometry RGB provenance mismatch');}assert(a[4]>0,'Normal attribute points down despite upward patch face');
  const row=Math.floor(q/scale),along=f%2===0?w[2]:w[1]+w[2],seam=(row===35&&Math.abs(along)<1e-8)||(row===59&&Math.abs(1-along)<1e-8);
  if(seam){stats.seamVertices++;for(let k=0;k<3;k++){const error=Math.abs(a[k]-old[k]);stats.maxSeamXYZError=Math.max(stats.maxSeamXYZError,error);assert(error<.0001,'Seam XYZ changed');}
   for(let k=3;k<6;k++){const expected=old[k]*sign,error=Math.abs(a[k]-expected);stats.maxSeamNormalError=Math.max(stats.maxSeamNormalError,error);if(a[k]!==Math.fround(expected))stats.seamNormalBitDifferences++;assert(error<1e-7,'Seam original top-facing normal attribute changed');}
   if(Math.max(...w)>1-1e-10){stats.originalCorners++;for(let k=0;k<3;k++)assert.equal(a[k],Math.fround(old[k]),'Original seam corner XYZ must be bit exact');for(let k=3;k<6;k++)assert.equal(a[k],Math.fround(old[k]*sign),'Original seam top-facing normal attribute must be bit exact');}
  }
 }
 assert(stats.seamVertices>0&&stats.originalCorners>=4,'Both complete seam boundaries need original corners');return stats;
}
function channels(m,source,R,C){
 const actual=R.channels(m,m.vertices,(...args)=>C.get(...args)),original=C.get(source.id,source.vertices.length/9,source.index.length),sides=new Float32Array(source.vertices.length/9),values=source.id.endsWith(':shoulder')?[1,2,2,1,2,1]:[-1,1,1,-1,1,-1];
 for(let i=0;i<source.index.length;i++)sides[source.index[i]]=values[i%6];
 if(m.forestCanopyRoadLod==='base'){assert(raw(actual.side).equals(raw(sides)));assert(raw(actual.ground).equals(raw(original)));}
 else for(let i=0;i<m.vertices.length/9;i++){
  const p=m.forestCanopyRoadProvenance,f=p.sourceTriangles[i],w=[p.barycentric[i*2],p.barycentric[i*2+1]];w.push(1-w[0]-w[1]);const ids=Array.from(source.index.subarray(f*3,f*3+3));
  assert.equal(actual.side[i],Math.fround(w.reduce((n,v,j)=>n+v*sides[ids[j]],0)));for(let k=0;k<3;k++)assert.equal(actual.ground[i*3+k],Math.round(w.reduce((n,v,j)=>n+v*original[ids[j]*3+k],0)));
 }
 return{id:m.id,sideSHA:hash(raw(actual.side)),groundSHA:hash(raw(actual.ground)),bytes:actual.bytes};
}
function seams(m,source){
 const p=m.forestCanopyRoadProvenance,scale=source.id.endsWith(':shoulder')?2:1,result=[];
 for(const end of['first','last'])for(let lane=0;lane<scale;lane++){
  const q=(end==='first'?35:59)*scale+lane,offset=q*6,ids=end==='first'?[source.index[offset],source.index[offset+1]]:[source.index[offset+5],source.index[offset+4]],sign=Math.sign(planar(tri(source,q*2+(end==='first'?0:1))).normal.y),ps=ids.map(i=>new T.Vector3(source.vertices[i*9],source.vertices[i*9+1],source.vertices[i*9+2])),dx=ps[1].x-ps[0].x,dz=ps[1].z-ps[0].z,length=Math.hypot(dx,dz),cuts=[];
  const stats={id:m.id,end,lane,width:length,intervals:0,maxPlanarError:0,maxHeightError:0,maxNormalError:0,minParameter:Infinity,maxParameter:-Infinity,maxIntervalGap:0};
  for(let face=0;face<m.index.length/3;face++){
   const edge=[];for(const i of m.index.subarray(face*3,face*3+3)){
    const f=p.sourceTriangles[i],w=[p.barycentric[i*2],p.barycentric[i*2+1]];w.push(1-w[0]-w[1]);const along=f%2===0?w[2]:w[1]+w[2];
    if(Math.floor(f/2)!==q||Math.abs(along-(end==='first'?0:1))>1e-8)continue;
    const a=m.vertices.subarray(i*9,i*9+9),t=((a[0]-ps[0].x)*dx+(a[2]-ps[0].z)*dz)/(length*length),planarError=Math.hypot(a[0]-ps[0].x-dx*t,a[2]-ps[0].z-dz*t),heightError=Math.abs(a[1]-(ps[0].y+(ps[1].y-ps[0].y)*t));
    stats.maxPlanarError=Math.max(stats.maxPlanarError,planarError);stats.maxHeightError=Math.max(stats.maxHeightError,heightError);assert(planarError<.0001&&heightError<.0001,'Actual full-width seam left original edge');
    const normalError=Math.max(...[3,4,5].map(k=>Math.abs(a[k]-(source.vertices[ids[0]*9+k]+(source.vertices[ids[1]*9+k]-source.vertices[ids[0]*9+k])*t)*sign)));edge.push({t,normalError});
   }
   if(edge.length===2&&Math.abs(edge[0].t-edge[1].t)>1e-9){cuts.push([Math.min(...edge.map(p=>p.t)),Math.max(...edge.map(p=>p.t))]);stats.maxNormalError=Math.max(stats.maxNormalError,...edge.map(p=>p.normalError));}
  }
  cuts.sort((a,b)=>a[0]-b[0]);assert(cuts.length,'Missing complete seam lane');let covered=0;
  for(const [a,b]of cuts){stats.maxIntervalGap=Math.max(stats.maxIntervalGap,(a-covered)*length);assert(a-covered<=.0001/length,'Hole in full-width seam');covered=Math.max(covered,b);}
  stats.intervals=cuts.length;stats.minParameter=cuts[0][0];stats.maxParameter=covered;assert(Math.abs(cuts[0][0])*length<.0001&&Math.abs(covered-1)*length<.0001,'Seam did not cover original net width');assert(stats.maxNormalError<1e-7,'Seam attribute normal error '+JSON.stringify(stats));result.push(stats);
 }
 return result;
}

function allViews(m){return Object.entries(m).filter(([,a])=>typed(a));}
function snapshot(ms){
 const arrays=new Map(),records=ms.map(m=>{for(const [,a]of allViews(m))if(!arrays.has(a))arrays.set(a,hash(raw(a)));return{m,keys:Object.keys(m),references:new Map(Object.entries(m)),metadata:json(Object.fromEntries(Object.entries(m).filter(([,a])=>!typed(a))))};});return{arrays,records};
}
function intact(s){for(const [a,h]of s.arrays)assert.equal(hash(raw(a)),h,'Original overview array was mutated');for(const r of s.records){assert.equal(json(Object.keys(r.m)),json(r.keys));assert.equal(json(Object.fromEntries(Object.entries(r.m).filter(([,a])=>!typed(a)))),r.metadata);for(const [k,a]of r.references)assert.equal(r.m[k],a,'Original overview record changed '+r.m.id+'/'+k);}}
function protectOverview(before,after){
 const old=new Map(before.meshes.map(m=>[m.id,m])),next=new Map(after.meshes.map(m=>[m.id,m]));assert.equal(old.size,before.meshes.length);assert.equal(next.size,after.meshes.length);
 const ids=new Set(SOURCES.flatMap(s=>[s.id,nearId(s.id),farId(s.id)]));assert.equal(after.meshes.length,before.meshes.length+4,'Unexpected public additions/removals');
 let exactRecords=0,groundRGBOnlyRecords=0,protectedGroundPositionNormals=0;
 for(const m of before.meshes){const a=next.get(m.id);assert(a,'Original public record removed '+m.id);if(SOURCES.some(s=>s.id===m.id))continue;
  if(GROUND_TERRAINS.has(m.id)){
   assert.equal(json(Object.keys(a).sort()),json(Object.keys(m).sort()),'Ground source fields changed');for(const k of Object.keys(m))if(k!=='vertices')assert.equal(a[k],m[k],'Ground source reference changed '+m.id+'/'+k);
   assert(type(a.vertices,'Float32Array')&&a.vertices.length===m.vertices.length);const A=new Uint32Array(a.vertices.buffer,a.vertices.byteOffset,a.vertices.length),B=new Uint32Array(m.vertices.buffer,m.vertices.byteOffset,m.vertices.length);
   for(let i=0;i<A.length;i+=9)for(let k=0;k<6;k++){assert.equal(A[i+k],B[i+k],'Ground position/normal changed');protectedGroundPositionNormals++;}groundRGBOnlyRecords++;
  }else{assert.equal(a,m,'Unrelated public source replaced '+m.id);exactRecords++;}
 }
 for(const m of after.meshes)if(!old.has(m.id))assert(ids.has(m.id),'Unaudited public addition '+m.id);
 return{old,next,exactRecords,groundRGBOnlyRecords,protectedGroundPositionNormals};
}
function candidateShape(m,s,source){
 assert(m.forestCanopyRoad===true&&m.forestCanopyRoadBasis==='P'&&m.forestCanopyRoadRevision===1);assert.equal(m.sourceId,s.id);assert.equal(json(m.forestCanopyRoadScope),json([-1120,0,-896,224]));assert.equal(json(m.forestCanopyRoadRange),json([35,60]));
 assert.equal(json(m.forestCanopyRoadSource),json(s));const lod=m.forestCanopyRoadLod;assert(['base','near','far'].includes(lod));assert.equal(m.id,lod==='base'?s.id:lod==='near'?nearId(s.id):farId(s.id));assert.equal(m.terrainSource,lod==='base'?undefined:s.terrain+(lod==='far'?':far':''));
 assert(!m.globalNear&&!m.globalFar&&!m.farVertices&&!m.instances,'Road must select its real terrain instead of independent mesh LOD');
 for(const [k,v]of Object.entries(source))if(!['id','vertices','index','center','radius'].includes(k))assert.equal(m[k],v,'Source dispatch changed '+m.id+'/'+k);
 for(const k of Object.keys(m))assert(Object.hasOwn(source,k)||CANDIDATE_FIELDS.has(k),'Unknown candidate metadata '+m.id+'/'+k);
 assert(type(m.vertices,'Float32Array')&&m.vertices.length%9===0&&type(m.index,'Uint32Array')&&m.index.length%3===0);for(const v of m.vertices)assert(Number.isFinite(v),'Nonfinite road source');for(const i of m.index)assert(i<m.vertices.length/9,'Candidate index outside source');
 const p=m.forestCanopyRoadProvenance;assert(p&&p.sourceVertexCount===s.vertexCount&&p.originalVertexCount===(lod==='base'?s.vertexCount:0));assert(type(p.sourceIndices,'Uint16Array')&&p.sourceIndices.length===s.indexCount&&type(p.sourceTriangles,'Uint16Array')&&p.sourceTriangles.length===m.vertices.length/9-p.originalVertexCount&&type(p.barycentric,'Float64Array')&&p.barycentric.length===p.sourceTriangles.length*2);
 if(lod==='base')assert.equal(m.vertices,source.vertices,'Base must share old vertex buffer');
}
function transactions(R,before){
 const failures=[],roads=SOURCES.map(s=>before.meshes.find(m=>m.id===s.id));
 function fail(name,ms){const keep={value:7},data={sentinel:keep,surfaceContacts:{sentinel:keep}},pack={...before,meshes:ms},list=pack.meshes,keys=json(Object.keys(data)),contacts=data.surfaceContacts;assert.throws(()=>R.prepare(data,pack),undefined,name);assert.equal(pack.meshes,list,'Partial road transaction '+name);assert.equal(json(Object.keys(data)),keys);assert.equal(data.sentinel,keep);assert.equal(data.surfaceContacts,contacts);failures.push(name);}
 fail('missing-source',before.meshes.filter(m=>m.id!==SOURCES[0].id));
 fail('duplicate-source',[...before.meshes,roads[0]]);
 fail('wrong-source-identity',before.meshes.map(m=>m===roads[1]?{...m,material:'timber'}:m));
 fail('wrong-source-array-length',before.meshes.map(m=>m===roads[1]?{...m,vertices:m.vertices.subarray(9)}:m));
 for(const id of[SOURCES[0].terrain,SOURCES[0].terrain+':far'])fail('missing-terrain-'+id,before.meshes.filter(m=>m.id!==id));
 fail('terrain-with-no-indexed-contact',before.meshes.map(m=>m.id===SOURCES[0].terrain+':far'?{...m,index:new Uint32Array()}:m));
 const index=roads[0].index.slice();index[35*6+3]=index[35*6+1];fail('wrong-quad-topology',before.meshes.map(m=>m===roads[0]?{...m,index}:m));
 const far=before.meshes.find(m=>m.id===SOURCES[0].terrain+':far'),vertices=far.vertices.slice();for(let i=1;i<vertices.length;i+=9)vertices[i]+=10;
 fail('late-full-width-far-seam-failure',before.meshes.map(m=>m===far?{...m,vertices}:m));
 fail('preexisting-partial-patch-id',[...before.meshes,{...roads[0],id:nearId(roads[0].id)}]);
 return failures;
}
function wanted(G,C,read,after){
 const scope=vm.createContext({GA:{...G,FOREST_PATH_COLORS:C}});
 // The copied model API closes over its original GA, where this renderer-only
 // color asset is intentionally absent. Reload the actual helper into this
 // private renderer GA instead of mutating the caller or spoofing readiness.
 vm.runInContext(String(read('src/forest-canopy-road.js')),scope,{filename:'renderer-road-helper.js'});
 vm.runInContext(String(read('src/renderer.js')),scope,{filename:'actual-renderer.js'});const Core=scope.GA.DioramaRenderer;
 for(const file of['src/forest-path-renderer.js','src/forest-canopy-renderer.js'])vm.runInContext(String(read(file)),scope,{filename:file});
 const Renderer=scope.GA.DioramaRenderer,r=Object.create(Renderer.prototype);r.recordMap=new Map(after.meshes.map(data=>[data.id,{data,wanted:false,level:0}]));r.packs=new Map([['forest',{}]]);r.quality='balanced';r.forestPathJunctionUniform={value:1};
 const patches=after.meshes.filter(m=>m.forestCanopyRoad&&m.forestCanopyRoadLod!=='base'),bases=SOURCES.map(s=>r.recordMap.get(s.id));let trials=0,assertions=0,nearSeen=false,farSeen=false;
 function trial(rig,opts){const d=G.length(G.sub(rig.eye,rig.target)),seen=new Map(SOURCES.map(s=>[s.id,0]));for(const m of patches){const row=r.recordMap.get(m.id),source=r.recordMap.get(m.terrainSource),base=Core.prototype.wanted.call(r,row,rig,opts,d),selected=Core.prototype.wanted.call(r,source,rig,opts,d);source.wanted=!selected;row.distance=999999;
   const actual=r.wanted(row,rig,opts,d);assert.equal(actual,base&&selected,'Patch selected independently of actual terrain '+m.id);assert.equal(r.levelFor(row,999999),0,'Patch got an independent quality LOD');assertions+=2;if(actual){seen.set(m.sourceId,seen.get(m.sourceId)+1);if(m.forestCanopyRoadLod==='near')nearSeen=true;else farSeen=true;}}
  for(const n of seen.values())assert(n<=1,'Simultaneous road near/far contact surfaces');for(const row of bases){const base=Core.prototype.wanted.call(r,row,rig,opts,d);assert.equal(r.wanted(row,rig,opts,d),base,'Base gated by patch terrain');assertions++;}trials++;return{d,selected:patches.filter(m=>r.wanted(r.recordMap.get(m.id),rig,opts,d)).map(m=>m.id)};
 }
 for(const quality of['low','balanced','high'])for(const mode of['continuous','atlas'])for(const loaded of[false,true])for(const focus of['forest','hakurei'])for(const neighbours of[[],['forest']])for(const eye of[[-982,80,162],[200,100,162]])for(const distance of[24,1550,1900]){
  r.quality=quality;if(loaded)r.packs.set('forest',{});else r.packs.delete('forest');trial({eye,target:[eye[0],eye[1],eye[2]-distance],planes:[]},{space:'surface',displayMode:mode,focus,detailNeighbors:neighbours});
 }
 assert(nearSeen&&farSeen,'Both actual terrain axes must be reachable');r.quality='balanced';r.packs.set('forest',{});const opts={space:'surface',displayMode:'continuous',focus:'forest',detailNeighbors:[]};
 const kourRig={eye:[-594,67,49],target:[-555,49,1]};kourRig.planes=G.planeFrustum(G.matmul(G.perspective(49,16/9,.2,16000),G.lookAt(kourRig.eye,kourRig.target)));
 const kour=trial(kourRig,opts);assert.equal(kour.selected.length,0,'Marisa patch visible in Kour frustum');assert(r.wanted(bases[0],kourRig,opts,kour.d),'Original cross-bucket road lost in Kour frame');
 assert(!Core.prototype.wanted.call(r,r.recordMap.get(SOURCES[0].terrain),kourRig,opts,kour.d)&&!Core.prototype.wanted.call(r,r.recordMap.get(SOURCES[0].terrain+':far'),kourRig,opts,kour.d));
 // Existing actual source face 149 is outside ROI and in that native Kour view.
 const base=bases[0].data;assert([...Array(base.index.length/3).keys()].some(i=>base.index[i*3]===413&&base.index[i*3+1]===414&&base.index[i*3+2]===415),'Original face149 was removed');
 const legacySource=C.metadata.records.find(m=>m.id==='forest:paths');assert(legacySource);const legacy={data:{id:'forest:paths',owner:'forest',group:'roads',material:'ground',center:[-997,77,144],radius:200,vertices:new Float32Array(legacySource.vertexCount*9)}};
 const rig={eye:[-1035,91,183],target:[-997,76,140],planes:[]},d=G.length(G.sub(rig.eye,rig.target));assert.equal(r.wanted(legacy,rig,opts,d),false,'Legacy duplicate ribbon not covered');let fallbacks=0;
 const coverageIds=C.metadata.records.filter(m=>m.id!=='forest:paths').map(m=>m.id).concat(patches.map(m=>m.id));
 for(const id of coverageIds){const row=r.recordMap.get(id);r.recordMap.delete(id);assert.equal(scope.GA.FOREST_CANOPY_ROAD.coverageReady(r.recordMap),false);assert.equal(r.wanted(legacy,rig,opts,d),true,'Missing public source did not restore legacy '+id);assert.equal(r.forestPathJunctionUniform.value,0);r.recordMap.set(id,row);assert.equal(r.wanted(legacy,rig,opts,d),false,'Restored public source not rechecked');fallbacks++;}
 const id=patches[0].id,good=r.recordMap.get(id);r.recordMap.set(id,{...good,data:{...good.data,forestCanopyRoadRevision:99}});assert.equal(r.wanted(legacy,rig,opts,d),true,'Bad patch metadata not rejected');r.recordMap.set(id,good);assert.equal(r.wanted(legacy,rig,opts,d),false);fallbacks++;
 const source=r.recordMap.get(patches[0].terrainSource);r.recordMap.delete(patches[0].terrainSource);assert.throws(()=>r.wanted(good,rig,opts,d),/terrain source/);r.recordMap.set(source.data.id,source);
 return{trials,assertions,nearSeen,farSeen,coverageFallbackCases:fallbacks,kourindouOutsideFace149Preserved:true,kourindouOriginalBaseWanted:true,kourindouAllFourPatchWanted:false,actualClasses:['src/renderer.js','src/forest-path-renderer.js','src/forest-canopy-renderer.js'],sourceWantedFlagsIntentionallyStale:true,orbitDistanceFromEyeTarget:true,syntheticLegacyGuard:true,constructedRenderers:0,limits:'Real source arrays and production predicates only; synthetic identity/count legacy guard is not rendered. Browser/GPU lifecycle and art are separate checks.'};
}

export function checkForestCanopyRoad(G,overviewBefore,overviewAfter,read){
 const R=G.FOREST_CANOPY_ROAD;assert(R?.prepare&&R?.channels&&R?.compatible&&R?.coverageReady&&R?.nearId&&R?.farId,'Road helper missing');assert.equal(R.revision,1);assert.equal(json(R.sources),json(SOURCES),'Reviewed source descriptor scope changed');assert.equal(json(Array.from(R.bounds)),json([-1120,0,-896,224]));assert.equal(R.offset,.025);
 const source=snapshot(overviewBefore.meshes),maps=protectOverview(overviewBefore,overviewAfter),C=copyColors(G,read);assert(C?.get);const candidates=overviewAfter.meshes.filter(m=>m.forestCanopyRoad);assert.equal(candidates.length,6);
 const result={sourceSHA256:hash(read('src/forest-canopy-road.js')),scope:'Two original Marisa road/shoulder sources, complete quad range [35,60), four near/far patches',exactOtherRecords:maps.exactRecords,groundRGBOnlyRecords:maps.groundRGBOnlyRecords,protectedGroundPositionNormals:maps.protectedGroundPositionNormals,contact:[],provenance:[],seams:[],channels:[]};
 for(const s of SOURCES){const original=maps.old.get(s.id);assert(original);assert.equal(hash(raw(original.vertices)),s.vertexSHA);assert.equal(hash(raw(original.index)),s.indexSHA);for(const id of[s.id,nearId(s.id),farId(s.id)]){const m=maps.next.get(id);assert(m,'Missing candidate '+id);candidateShape(m,s,original);assert(R.compatible(m,s),'Production guard rejected independently validated source');result.provenance.push(provenance(m,original));result.channels.push(channels(m,original,R,C));if(m.forestCanopyRoadLod!=='base'){result.contact.push(contact(m,maps.next.get(m.terrainSource)));result.seams.push(...seams(m,original));}}}
 const oldBuffers=new Set(overviewBefore.meshes.flatMap(m=>allViews(m).map(([,a])=>a.buffer))),newBuffers=new Set();for(const m of candidates)for(const a of[m.vertices,m.index,...Object.values(m.forestCanopyRoadProvenance).filter(typed)])if(!oldBuffers.has(a.buffer))newBuffers.add(a.buffer);
 const geometryProvenanceBytes=[...newBuffers].reduce((n,a)=>n+a.byteLength,0),channelBytes=result.channels.reduce((n,a)=>n+a.bytes,0),extraBytes=geometryProvenanceBytes+channelBytes,extraTriangles=candidates.reduce((n,m)=>n+m.index.length/3,0)-SOURCES.reduce((n,s)=>n+s.indexCount/3,0);
 assert(extraBytes<=512*1024&&extraTriangles<=2000);result.budget={newRecords:4,geometryProvenanceBytes,channelBytes,extraBytes,extraTriangles,sourcePatchTriangles:{near:candidates.filter(m=>m.forestCanopyRoadLod==='near').reduce((n,m)=>n+m.index.length/3,0),far:candidates.filter(m=>m.forestCanopyRoadLod==='far').reduce((n,m)=>n+m.index.length/3,0)}};
 result.atomicFailureCases=transactions(R,overviewBefore);const pack={...overviewBefore,meshes:overviewBefore.meshes.slice()},data={},extra=R.prepare(data,pack);assert.equal(extra.length,4);pack.meshes.push(...extra);
 for(const m of pack.meshes.filter(m=>m.forestCanopyRoad)){const actual=maps.next.get(m.id);assert(raw(m.vertices).equals(raw(actual.vertices))&&raw(m.index).equals(raw(actual.index)),'Production integration differs from pure road preparation');}
 assert.equal(data.forestCanopyRoad.extraBytes,extraBytes);assert.equal(data.forestCanopyRoad.geometryProvenanceBytes,geometryProvenanceBytes);assert.equal(data.forestCanopyRoad.channelBytes,channelBytes);assert.equal(data.forestCanopyRoad.extraTriangles,extraTriangles);const list=pack.meshes,meta=data.forestCanopyRoad;assert.equal(R.prepare(data,pack).length,0);assert.equal(pack.meshes,list);assert.equal(data.forestCanopyRoad,meta);
 result.renderer=wanted(G,C,read,overviewAfter);intact(source);result.passed=true;return result;
}
