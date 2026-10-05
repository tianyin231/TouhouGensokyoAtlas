// Independent, bounded CPU checks for the new closed Myouren rock-form method.
// This is not the unexecuted first-method slope checker. Never writes fixtures.
// Source integration/clearance checks are added only against the actual new API.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import fs from 'node:fs';
import vm from 'node:vm';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {geometryDigest} from './check-hakurei.mjs';

export const BUDGET = Object.freeze({calls:4,triangles:4000,attributeBytes:.6*1048576,newTextures:0});
export const PROTECTED = Object.freeze({roi:[218,354,394,391],stairBand:[288,354,312,391],cutZ:378});
const hash = a => createHash('sha256').update(Buffer.from(a.buffer,a.byteOffset,a.byteLength)).digest('hex');
const sub = (a,b) => a.map((v,k)=>v-b[k]);
const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot = (a,b) => a.reduce((s,v,k)=>s+v*b[k],0);
const key = p => p.map(v=>Object.is(v,-0)?0:v).join(',');

export function actualTriangles(record){
 const a=record.vertices,ix=record.index;
 assert(a && a.constructor.name==='Float32Array' && a.length%9===0,'Expected Float32 interleaved source: '+record.id);
 assert(a.every(Number.isFinite),'Nonfinite vertex attributes: '+record.id);
 const n=ix?ix.length:a.length/9;
 assert(n>0 && n%3===0,'Empty/incomplete triangle source: '+record.id);
 const out=[];
 for(let j=0;j<n;j+=3){
  const ids=[0,1,2].map(k=>ix?ix[j+k]:j+k);
  assert(ids.every(i=>Number.isInteger(i)&&i>=0&&i<a.length/9),'Index outside source: '+record.id);
  out.push({record:record.id,face:j/3,points:ids.map(i=>Array.from(a.subarray(i*9,i*9+3))),normals:ids.map(i=>Array.from(a.subarray(i*9+3,i*9+6)))});
 }
 return out;
}

// Hard-face normals may split vertices, so manifold edges use the actual
// Float32 positions, not vertex indices or the author's control network.
export function checkClosedBody(records,label){
 assert(records.length>0,'Missing closed body: '+label);
 const tris=records.flatMap(actualTriangles),positions=new Map(),edges=new Map(),vertexFaces=new Map(),adj=tris.map(()=>new Set());
 let minimumArea=Infinity,minimumNormalDot=Infinity;
 for(let f=0;f<tris.length;f++){
  const t=tris[f],p=t.points,keys=p.map(key),normal=cross(sub(p[1],p[0]),sub(p[2],p[0])),length=Math.hypot(...normal),area=length/2;
  assert(area>1e-6,'Degenerate closed-body face: '+label+'/'+t.record+'/'+t.face);
  minimumArea=Math.min(minimumArea,area);
  for(const n of t.normals){const l=Math.hypot(...n),d=dot(normal,n)/length;assert(Math.abs(l-1)<1e-4,'Nonunit closed-body normal: '+label+'/'+t.face);assert(d>.99,'Normal differs from actual face winding: '+label+'/'+t.face);minimumNormalDot=Math.min(minimumNormalDot,d);}
  for(let k=0;k<3;k++){
   positions.set(keys[k],p[k]);
   if(!vertexFaces.has(keys[k]))vertexFaces.set(keys[k],new Set());
   vertexFaces.get(keys[k]).add(f);
   const from=keys[k],to=keys[(k+1)%3],e=from<to?from+'|'+to:to+'|'+from;
   if(!edges.has(e))edges.set(e,[]);
   edges.get(e).push({from,to,face:f});
  }
 }
 for(const [e,uses] of edges){
  assert.equal(uses.length,2,'Open/nonmanifold edge: '+label+'/'+e+' uses='+uses.length);
  assert(uses[0].from===uses[1].to && uses[0].to===uses[1].from,'Inconsistent edge winding: '+label+'/'+e);
  adj[uses[0].face].add(uses[1].face);adj[uses[1].face].add(uses[0].face);
 }
 // Two closed shells touching at one vertex also fail the manifold test.
 for(const [v,faces] of vertexFaces){const seen=new Set(),todo=[faces.values().next().value];while(todo.length){const f=todo.pop();if(seen.has(f))continue;seen.add(f);for(const n of adj[f])if(faces.has(n)&&!seen.has(n))todo.push(n);}assert.equal(seen.size,faces.size,'Disconnected vertex link: '+label+'/'+v);}
 const components=[],seen=new Set();
 for(let start=0;start<tris.length;start++){if(seen.has(start))continue;const faces=[],todo=[start];while(todo.length){const f=todo.pop();if(seen.has(f))continue;seen.add(f);faces.push(f);for(const n of adj[f])if(!seen.has(n))todo.push(n);}components.push(faces);}
 assert.equal(components.length,1,'Body is disconnected fragments: '+label);
 const center=[0,1,2].map(k=>Array.from(positions.values()).reduce((s,p)=>s+p[k],0)/positions.size);
 const signedVolume=tris.reduce((s,t)=>{const [a,b,c]=t.points.map(p=>sub(p,center));return s+dot(a,cross(b,c))/6;},0);
 assert(signedVolume>1e-4,'Closed body has inward winding or zero volume: '+label);
 return {label,records:records.map(r=>r.id),triangles:tris.length,weldedPositions:positions.size,edges:edges.size,components:components.length,signedVolume,minimumTriangleArea:minimumArea,minimumNormalDot,sourceHashes:records.map(r=>({id:r.id,vertices:hash(r.vertices),index:r.index?hash(r.index):null}))};
}

export function checkProtectedBodySpace(record){
 const tris=actualTriangles(record),[x0,z0,x1,z1]=PROTECTED.roi,[left,,right]=PROTECTED.stairBand,tol=.00005;
 for(const t of tris){
  assert(t.points.every(p=>p[0]>=x0-tol&&p[0]<=x1+tol&&p[2]>=z0-tol&&p[2]<=z1+tol),'New body exceeds authorized footprint: '+record.id+'/'+t.face);
  // The protected band spans the entire authorized footprint, so interval
  // exclusion checks faces crossing the band even when every corner is outside.
  assert(Math.max(...t.points.map(p=>p[0]))<=left+tol || Math.min(...t.points.map(p=>p[0]))>=right-tol,'New body crosses central stair clearance: '+record.id+'/'+t.face);
 }
 return {record:record.id,triangles:tris.length,roi:PROTECTED.roi,stairBand:PROTECTED.stairBand,float32Tolerance:tol};
}

function onTriangle(p,tri,tol=.0001){
 const [a,b,c]=tri.points,u=sub(b,a),v=sub(c,a),w=sub(p,a),n=cross(u,v),length=Math.hypot(...n);
 if(Math.abs(dot(w,n))/length>tol)return false;
 const uu=dot(u,u),uv=dot(u,v),vv=dot(v,v),wu=dot(w,u),wv=dot(w,v),den=uu*vv-uv*uv;
 if(den<=1e-12)return false;
 const s=(vv*wu-uv*wv)/den,t=(uu*wv-uv*wu)/den;
 return s>=-tol && t>=-tol && s+t<=1+tol;
}
function rayDistance(p,d,tri){
 const [a,b,c]=tri.points,e1=sub(b,a),e2=sub(c,a),h=cross(d,e2),den=dot(e1,h);
 if(Math.abs(den)<1e-10)return null;
 const q=sub(p,a),u=dot(q,h)/den;
 if(u<-1e-8||u>1+1e-8)return null;
 const k=cross(q,e1),v=dot(d,k)/den;
 if(v<-1e-8||u+v>1+1e-8)return null;
 const t=dot(e2,k)/den;
 return t>1e-7?t:null;
}
function insideBody(p,tris){
 if(tris.some(t=>onTriangle(p,t)))return true;
 const d=[1,.137,.293],hits=tris.map(t=>rayDistance(p,d,t)).filter(t=>t!==null).sort((a,b)=>a-b),unique=hits.filter((v,i)=>!i||Math.abs(v-hits[i-1])>.00001);
 return unique.length%2===1;
}
function clipZ(points,z){
 const out=[];
 for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],A=a[2]<=z,B=b[2]<=z;if(A)out.push(a);if(A!==B){const f=(z-a[2])/(b[2]-a[2]);out.push(a.map((v,k)=>k===2?z:v+f*(b[k]-v)));}}
 return out;
}
function samples(points){return [points.reduce((p,q)=>p.map((v,k)=>v+q[k]/points.length),[0,0,0]),...points,...points.map((p,i)=>p.map((v,k)=>(v+points[(i+1)%points.length][k])/2))];}

// Compare rendered source surfaces, rather than reusing the author's clipping
// function or trusting cut metadata. Closedness is tested separately above.
export function checkCutMatchesNormal(normalRecords,cutRecords,label){
 const normal=normalRecords.flatMap(actualTriangles),cut=cutRecords.flatMap(actualTriangles),z=PROTECTED.cutZ,tol=.00005;
 let capTriangles=0,cutSurfaceSamples=0,normalSurfaceSamples=0,capInteriorSamples=0;
 for(const t of cut){
  assert(t.points.every(p=>p[2]<=z+tol),'Cut body enters inspection hole: '+label+'/'+t.face);
  const cap=t.points.every(p=>Math.abs(p[2]-z)<=tol);
  if(cap){
   capTriangles++;
   assert(t.normals.every(n=>n[2]>.9999),'Inspection cap is not outward at z378: '+label+'/'+t.face);
   for(const p of samples(t.points)){assert(insideBody(p,normal),'Cut cap fills space outside original body: '+label+'/'+t.face);capInteriorSamples++;}
  }else for(const p of samples(t.points)){assert(normal.some(n=>onTriangle(p,n)),'Cut exterior does not match original body: '+label+'/'+t.face);cutSurfaceSamples++;}
 }
 assert(capTriangles>0,'No actual inspection-plane cap: '+label);
 for(const t of normal){const p=clipZ(t.points,z);if(p.length<3)continue;const area=p.slice(1,-1).reduce((s,q,i)=>s+Math.hypot(...cross(sub(q,p[0]),sub(p[i+2],p[0])))/2,0);if(area<=1e-6)continue;for(const q of samples(p)){assert(cut.some(c=>onTriangle(q,c)),'Original exterior missing from cut sibling: '+label+'/'+t.face);normalSurfaceSamples++;}}
 return {label,cutZ:z,capTriangles,capInteriorSamples,cutSurfaceSamples,normalSurfaceSamples,positionTolerance:.0001};
}

const arrayFields=['vertices','farVertices','instances','instanceColors','index'];
const raw=a=>Buffer.from(a.buffer,a.byteOffset,a.byteLength);
const metadata=m=>JSON.stringify(m,(k,v)=>arrayFields.includes(k)?undefined:v);
function snapshot(record){return {record,metadata:metadata(record),arrays:Object.fromEntries(arrayFields.map(k=>[k,record[k]?hash(record[k]):null]))};}
function sourceBytes(records){const buffers=new Set();let bytes=0;for(const m of records)for(const k of arrayFields){const a=m[k];if(a&&!buffers.has(a.buffer)){buffers.add(a.buffer);bytes+=a.buffer.byteLength;}}return bytes;}
function untouched(old,now,label){assert(now,'Missing preserved record: '+label);assert.equal(metadata(now),old.metadata,'Preserved metadata changed: '+label);for(const k of arrayFields)assert.equal(now[k]?hash(now[k]):null,old.arrays[k],'Preserved source array changed: '+label+'/'+k);}
function indexedTriangleKey(m,i,quantize=false){const a=m.vertices,ix=m.index,parts=[];for(let j=0;j<3;j++){const n=(ix?ix[i+j]:i+j)*9;parts.push(Array.from(a.subarray(n,n+9),(v,k)=>Math.round((quantize&&k<3?Math.fround(Math.round(v/.45)*.45):v)*1000)).join(','));}return parts.join(';');}
function triangleDifference(before,after){
 const retained=new Map(),a=after.index?after.index.length:after.vertices.length/9;
 for(let i=0;i<a;i+=3){const k=indexedTriangleKey(after,i);retained.set(k,(retained.get(k)||0)+1);}
 const removed=[],n=before.index?before.index.length:before.vertices.length/9;
 for(let i=0;i<n;i+=3){const k=indexedTriangleKey(before,i),count=retained.get(k)||0;if(count)retained.set(k,count-1);else removed.push(i/3);}
 assert([...retained.values()].every(n=>n===0),'Facing removal added or rewrote retained original triangles: '+after.id);
 return removed;
}
function sourceRoots(records){
 const found=new Map();
 for(const m of records){if(!m.instances||!m.instanceColors||!m.vertices||!m.id.includes('myouren'))continue;
  let minY=Infinity;for(let i=1;i<m.vertices.length;i+=9)minY=Math.min(minY,m.vertices[i]);
  const low=[];for(let i=0;i<m.vertices.length;i+=9)if(m.vertices[i+1]<=minY+.2)low.push(Array.from(m.vertices.subarray(i,i+3)));
  assert(low.length,'No actual root-prototype vertices: '+m.id);
  for(let i=0;i<m.instances.length;i+=16){const a=m.instances.subarray(i,i+16),x=a[12],y=a[13]+minY*a[5],z=a[14];if(x<PROTECTED.roi[0]-2||x>PROTECTED.roi[2]+2||z<PROTECTED.roi[1]-2||z>PROTECTED.roi[3]+2)continue;
   const radius=Math.max(...low.map(p=>Math.hypot(a[0]*p[0]+a[8]*p[2],a[2]*p[0]+a[10]*p[2]))),id=[x,y,z].join(',');
   const previous=found.get(id);if(!previous||radius>previous.radius)found.set(id,{record:m.id,instance:i/16,x,y,z,radius,matrixSHA:hash(a)});
  }
 }
 assert(found.size>0,'No original roots were independently selected around the authorized footprint');
 return [...found.values()];
}
function topAt(tris,x,z){
 let y=null;
 for(const t of tris){const [a,b,c]=t.points,u=[b[0]-a[0],b[2]-a[2]],v=[c[0]-a[0],c[2]-a[2]],w=[x-a[0],z-a[2]],den=u[0]*v[1]-u[1]*v[0];if(Math.abs(den)<1e-10)continue;
  const s=(w[0]*v[1]-w[1]*v[0])/den,q=(u[0]*w[1]-u[1]*w[0])/den;if(s<-.00001||q<-.00001||s+q>1.00001)continue;const h=a[1]+s*(b[1]-a[1])+q*(c[1]-a[1]);y=y===null?h:Math.max(y,h);
 }
 return y;
}
export function checkRootClearance(roots,normalRecords){
 const tris=normalRecords.flatMap(actualTriangles),rows=[];
 for(const root of roots){let maximumNewSurface=null,coveredSamples=0;const offsets=[[0,0],...Array.from({length:16},(_,i)=>[root.radius*Math.cos(i*Math.PI/8),root.radius*Math.sin(i*Math.PI/8)])];
  for(const [dx,dz] of offsets){const y=topAt(tris,root.x+dx,root.z+dz);if(y===null)continue;coveredSamples++;maximumNewSurface=maximumNewSurface===null?y:Math.max(maximumNewSurface,y);assert(y<=root.y+.02,'New closed mass buries original root footprint: '+root.record+'/'+root.instance+' rootY='+root.y+' bodyY='+y);}
  rows.push({...root,coveredSamples,maximumNewSurface,minimumVerticalClearance:maximumNewSurface===null?null:root.y-maximumNewSurface});
 }
 return {roots:rows,actualPrototypeFootprint:true,samplesPerRoot:17,maximumPermittedBurial:.02,scope:'Actual old instance matrices and prototype base vertices; finite radial surface probes, not a full solid collision proof'};
}

export async function checkMyourenRockForm(G,atlas,read){
 const U=G.MYOUREN_ROCK_FORM;assert(U && typeof U.buildBodies==='function','New rock-form API missing');
 const report={schema:1,scope:'Bounded CPU geometry, source identity and public ownership; no WebGL, lifecycle, hardware FPS or visual acceptance',passed:true,checks:[],sourceSHA:createHash('sha256').update(read('src/myouren-rock-form.js')).digest('hex'),checkerSHA:createHash('sha256').update(read('tools/check-myouren-rock-form.mjs')).digest('hex'),budget:BUDGET},start=performance.now();
 const check=async(name,fn)=>{try{report.checks.push({name,passed:true,result:await fn()});}catch(e){report.passed=false;report.checks.push({name,passed:false,error:e.stack});}};
 await check('protected native inputs',()=>{const expected={'src/world-builder.js':'d724340f60e9b759d68803ddfe1c4e16048272e6f8e2bb81bfa6e273ffe7378e','assets/packs/overview.pack.gz':'7398a263bf02d560fd0c9265d9e297ec3b22357f2429c4732ee3488f2d097742','assets/packs/legacy.pack.gz':'46e874f6bcdff56d4772e531fd19bf8a71ba5f272aa39b14a91e5ed65082ab88','data/atlas.json':'74b17d519eb23f9d6d26f7ca76e2d02a87978a7c0761b4bd22719d286c73e37a'},actual={};for(const [p,sha] of Object.entries(expected)){actual[p]=createHash('sha256').update(read(p)).digest('hex');assert.equal(actual[p],sha,'Protected native input changed: '+p);}return actual;});
 const form=U.buildBodies(new G.Terrain(atlas));
 for(const b of form.bodies){for(const variant of ['normal','cut']){await check(b.bodyId+'/'+variant+'/closed',()=>checkClosedBody([b[variant]],b.bodyId+'/'+variant));await check(b.bodyId+'/'+variant+'/protected',()=>checkProtectedBodySpace(b[variant]));}await check(b.bodyId+'/cut-matches-normal',()=>checkCutMatchesNormal([b.normal],[b.cut],b.bodyId));}
 await check('public ownership and shared near/far dispatch',()=>{assert.equal(form.meshes.length,4);assert.equal(new Set(form.meshes.map(m=>m.id)).size,4);for(const m of form.meshes){assert.equal(m.owner,'island');assert.equal(m.region,'island');assert.equal(m.space,'surface');assert.equal(m.overview,true);assert.equal(m.globalSurface,true);assert(!m.globalNear&&!m.globalFar&&!m.farVertices,'New body has a divergent near/far sibling');assert.equal(m.lodPolicy,'shared-near-far');assert.equal(m.material,'cave');assert.equal(!!m.cutReplace,m.variant==='normal');assert.equal(!!m.cutOnly,m.variant==='cut');}return {records:4,activeNormal:2,activeCut:2,materials:['cave'],sharedNearFar:true,submittedCallsStillRequireBrowserMeasurement:true};});
 const unpack=p=>{const a=gunzipSync(read(p));return G.decodePack(a.buffer.slice(a.byteOffset,a.byteOffset+a.byteLength));},overview=unpack('assets/packs/overview.pack.gz'),before=overview.meshes.map(snapshot),oldIds=new Set(before.map(s=>s.record.id)),oldStone=overview.meshes.find(m=>m.id===U.stoneSources.overview),legacy=unpack('assets/packs/legacy.pack.gz'),roots=sourceRoots(G.plantSubset(legacy,'myouren'));
 await check('native root clearance',()=>checkRootClearance(roots,form.bodies.map(b=>b.normal)));
 const detail=await U.originalBuildRegion(atlas,'myouren'),beforeDetail=detail.meshes.map(snapshot),oldDetailStone=detail.meshes.find(m=>m.id===U.stoneSources.detail),expected=JSON.parse(read('tools/hakurei-baseline.json')).regions.myouren;
 await check('original author geometry fixture',()=>{assert.equal(geometryDigest(detail),expected);return {geometrySHA:geometryDigest(detail)};});
 const detailAfter=U.applyDetail(atlas,detail);
 await check('detail brick identity and platform/stair/cemetery preservation',()=>{assert.equal(detailAfter.meshes.length,detail.meshes.length);const now=detailAfter.meshes.find(m=>m.id===oldDetailStone.id),removed=triangleDifference(oldDetailStone,now);assert.deepEqual(removed,Array.from({length:4872},(_,i)=>i),'Detail removed triangles are not precisely the original first terrace facing');assert(raw(oldDetailStone.vertices.subarray(4872*27)).equals(raw(now.vertices)),'Retained second/third terraces were rewritten');for(const old of beforeDetail)if(old.record.id!==oldDetailStone.id)untouched(old,detailAfter.meshes.find(m=>m.id===old.record.id),old.record.id);assert.equal(JSON.stringify(detailAfter.signs),JSON.stringify(detail.signs));for(const [k,v] of Object.entries(detail.meta))assert.equal(JSON.stringify(detailAfter.meta[k]),JSON.stringify(v),'Original region metadata changed: '+k);return {removedTriangles:removed.length,retainedRecords:beforeDetail.length-1,oldGeometrySHA:geometryDigest(detail),newGeometrySHA:geometryDigest(detailAfter),originalPlatformStairsShrubsTreesCemeteryPreserved:true};});
 await check('detail source byte accounting',()=>{const actual=sourceBytes(detailAfter.meshes);assert.equal(detailAfter.bytes,actual,'Candidate detail pack.bytes does not match actual retained backing buffers');return {reported:detailAfter.bytes,actual};});
 const returned=U.prepare(atlas,overview);
 await check('public original records and exact cold facing identity',()=>{assert.equal(returned.length,0);assert.equal(overview.meshes.length,before.length+4);assert.equal(new Set(overview.meshes.map(m=>m.id)).size,overview.meshes.length);for(const old of before)if(old.record.id!==oldStone.id)untouched(old,overview.meshes.find(m=>m.id===old.record.id),old.record.id);const now=overview.meshes.find(m=>m.id===oldStone.id),removed=triangleDifference(oldStone,now);assert.equal(removed.length,4872);assert(raw(oldStone.vertices).equals(raw(now.vertices)),'Original cold facing vertex source was rewritten');assert.equal(metadata(now),metadata(oldStone));const detailKeys=new Map();for(let i=0;i<4872*3;i+=3){const k=indexedTriangleKey(oldDetailStone,i,true);detailKeys.set(k,(detailKeys.get(k)||0)+1);}for(const face of removed){const k=indexedTriangleKey(oldStone,face*3),n=detailKeys.get(k)||0;assert(n>0,'Cold deletion is not a quantized original detail facing triangle');detailKeys.set(k,n-1);}assert([...detailKeys.values()].every(n=>n===0));return {removedTriangles:removed.length,unchangedPublicRecords:before.length-1,terrainAndInspectionWallUnchanged:true,allOriginalTreeInstancesUnchanged:true,coldDeletionMatchesRealDetailTriangles:true};});
 await check('new public source backing budget and repeat prepare',()=>{const added=overview.meshes.filter(m=>!oldIds.has(m.id)),index=overview.meshes.find(m=>m.id===oldStone.id).index,extra=sourceBytes(added)+index.buffer.byteLength;assert(extra<=BUDGET.attributeBytes,'New retained source backing exceeds 0.6 MiB');assert.equal(added.length,4);const meshes=overview.meshes;assert.equal(U.prepare(atlas,overview).length,0);assert.equal(overview.meshes,meshes,'Repeated prepare changed the public mesh collection');return {newBodyBackingBytes:sourceBytes(added),replacementIndexBackingBytes:index.buffer.byteLength,additionalRetainedSourceBackingBytes:extra,normalBodyTriangles:added.filter(m=>m.variant==='normal').reduce((s,m)=>s+m.vertices.length/27,0),cutBodyTriangles:added.filter(m=>m.variant==='cut').reduce((s,m)=>s+m.vertices.length/27,0),newTextureRequests:0,sourceBytesAreNotGpuResidency:true};});
 report.CPUms=performance.now()-start;return report;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 assert.equal(Number(process.versions.node.split('.')[0]),22,'Use Node 22 for stable source geometry');
 const root=resolve(fileURLToPath(new URL('../',import.meta.url))),sourceAt=process.argv.indexOf('--source'),frozenSource=sourceAt>=0?fs.readFileSync(resolve(process.argv[sourceAt+1])):null,read=p=>p==='src/myouren-rock-form.js'&&frozenSource?frozenSource:fs.readFileSync(resolve(root,p)),project=JSON.parse(read('project.json')),context=vm.createContext({performance,TextDecoder,TextEncoder});
 for(const p of project.worldBuilders)vm.runInContext(String(read(p)),context,{filename:p});
 const report=await checkMyourenRockForm(context.GA,JSON.parse(read('data/atlas.json')),read),at=process.argv.indexOf('--output');report.projectSHA=createHash('sha256').update(read('project.json')).digest('hex');report.sourceOverride=sourceAt>=0?resolve(process.argv[sourceAt+1]):null;
 if(at>=0){assert(process.argv[at+1],'--output requires a path');fs.writeFileSync(resolve(process.argv[at+1]),JSON.stringify(report,null,2)+'\n');}
 console.log(JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
}
