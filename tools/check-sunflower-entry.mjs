// Independent, bounded CPU checks for the northern sunflower slope.
// Runs the real public boot predecessors. --native is a separate, opt-in
// paired regional build; use it only after the fixed-camera visual gate.
// --native-candidate-only instead binds an exact prior paired report, retains
// its unchanged native comparisons, and builds only the current candidate.
// No WebGL, fixture rewriting, renderer changes, or complete Node regression.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import fs from 'node:fs';
import vm from 'node:vm';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {geometryDigest} from './check-hakurei.mjs';

// Retained independently of hakurei-baseline.json, whose accepted sunflower
// fixture may change only after explicit review. Never read it as an oracle.
export const ORIGINAL_SUNFLOWER_GEOMETRY_SHA='9071b82b2a121e04808696b96925c720efb70e7bcab49750c75a35e54dc3563a';
// Exact delivered module sequence through Solar at main 6a27bb46. Later
// independent stages are tested by their own checks and the full project boot.
// Resolve this prefix from the real registration; never substitute a fixture
// project or let a reordered/missing predecessor become a vacuous unit check.
export const ACCEPTED_SOLAR_PREFIX_SHA='ed0a8a18476b9f510bfe7a5199e4e6de19bda9e3ad6cea3e13095c9304ab7f04';
const SOURCE='src/sunflower-entry.js',SCOPE=[-896,704,-192,1152];
// Explicit V2 design authorization, not inferred from candidate declarations.
const ROADSIDE_TRANSLATIONS=[{recordId:'island:transition:grass:-1:1',first:141,last:252},{recordId:'island:transition:shrub:-1:1',first:31,last:38}];
// Additional outward corrections are limited to the five actual collision
// objects, measured with the real LANDSCAPE near/far prototypes. The original
// 120 route-relative stations and nominal side offsets remain fixed.
const ROADSIDE_CLEARANCE_TRANSLATIONS=new Map([
 ['island:transition:grass:-1:1/164',.25],['island:transition:grass:-1:1/203',.18],
 ['island:transition:grass:-1:1/233',.14],['island:transition:grass:-1:1/250',.28],
 ['island:transition:shrub:-1:1/32',.55]
]);
const FIELDS=['vertices','farVertices','index','instances','instanceColors'];
const sha=a=>createHash('sha256').update(a).digest('hex');
export function registeredSunflowerPrefix(project){
 const all=project.worldBuilders;
 assert(Array.isArray(all)&&all.every(p=>typeof p==='string'),'Real worldBuilders registration is required');
 assert.equal(all.filter(p=>p===SOURCE).length,1,'Solar must have one real registration');
 const index=all.indexOf(SOURCE);assert.equal(index,45,'Solar predecessor count/order changed');
 const modules=all.slice(0,index+1),prefixSHA256=sha(JSON.stringify(modules));
 assert.equal(prefixSHA256,ACCEPTED_SOLAR_PREFIX_SHA,'Accepted Solar predecessor sequence changed');
 return {index,modules,prefixSHA256,deferredSuffix:all.slice(index+1)};
}
const arraySHA=a=>sha(Buffer.from(a.buffer,a.byteOffset,a.byteLength));
const inside=(x,z)=>x>=SCOPE[0]&&x<=SCOPE[2]&&z>=SCOPE[1]&&z<=SCOPE[3];
const key=(x,z)=>Math.floor(x/32)+','+Math.floor(z/32);
const same=(a,b,label)=>assert.equal(JSON.stringify(a),JSON.stringify(b),label);
const tris=m=>m.index?m.index.length/3:m.vertices.length/27;
const metadata=m=>JSON.stringify(m,(k,v)=>ArrayBuffer.isView(v)?undefined:v);
const identity=m=>JSON.stringify(m,(k,v)=>ArrayBuffer.isView(v)||k==='center'||k==='radius'?undefined:v);
function buffers(...roots){
 const seen=new Set(),out=new Set();
 const visit=o=>{if(!o||typeof o!=='object'||seen.has(o))return;seen.add(o);if(ArrayBuffer.isView(o)){out.add(o.buffer);return;}if(o instanceof Map||o instanceof Set){for(const v of o.values())visit(v);return;}for(const v of Object.values(o))visit(v);};
 for(const o of roots)visit(o);return out;
}
const sumBytes=bs=>[...bs].reduce((n,b)=>n+b.byteLength,0);
function snapshot(pack,target){
 const copies=new Map(),copy=a=>{if(!copies.has(a))copies.set(a,a.slice());return copies.get(a);};
 return new Map(pack.meshes.map(m=>[m.id,{...m,meta:metadata(m),identity:identity(m),arrays:Object.fromEntries(Object.entries(m).filter(([,a])=>ArrayBuffer.isView(a)).map(([k,a])=>[k,{ref:a,sha:arraySHA(a),original:target(m)?copy(a):null}]))}]));
}
function retained(r){const m={...r};for(const [k,a]of Object.entries(r.arrays))m[k]=a.original||a.ref;return m;}
function positions(m,i){return [0,1,2].map(k=>Array.from(m.vertices.subarray((m.index?m.index[i+k]:i+k)*9,(m.index?m.index[i+k]:i+k)*9+3)));}
function attributes(m,i){return [0,1,2].map(k=>Array.from(m.vertices.subarray((m.index?m.index[i+k]:i+k)*9,(m.index?m.index[i+k]:i+k)*9+9)));}
const triKey=vs=>vs.map(v=>v.join(',')).sort().join('|');
function triangleSet(m){const counts=new Map();for(let i=0;i<tris(m)*3;i+=3){const k=triKey(attributes(m,i));counts.set(k,(counts.get(k)||0)+1);}return counts;}
function multisetEqual(a,b,label){assert.equal(a.size,b.size,label+' distinct faces');for(const [k,n]of a)assert.equal(b.get(k),n,label+' face '+k.slice(0,100));}
function bary(ps,x,z){const [a,b,c]=ps,d=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]);if(Math.abs(d)<1e-10)return null;const u=((b[2]-c[2])*(x-c[0])+(c[0]-b[0])*(z-c[2]))/d,v=((c[2]-a[2])*(x-c[0])+(a[0]-c[0])*(z-c[2]))/d,w=1-u-v;return Math.min(u,v,w)<-1e-6?null:u*a[1]+v*b[1]+w*c[1];}
function meshSampler(records){
 const bins=new Map(),cells=new Map();
 for(const m of records)for(let i=0;i<tris(m)*3;i+=3){const ps=positions(m,i),xs=ps.map(p=>p[0]),zs=ps.map(p=>p[2]),t={ps,cell:key(xs.reduce((a,b)=>a+b)/3,zs.reduce((a,b)=>a+b)/3)};if(!cells.has(t.cell))cells.set(t.cell,[]);cells.get(t.cell).push(t);
  for(let x=Math.floor(Math.min(...xs)/32);x<=Math.floor(Math.max(...xs)/32);x++)for(let z=Math.floor(Math.min(...zs)/32);z<=Math.floor(Math.max(...zs)/32);z++){const k=x+','+z;if(!bins.has(k))bins.set(k,[]);bins.get(k).push(t);}}
 const values=(list,x,z)=>list.map(t=>bary(t.ps,x,z)).filter(y=>y!==null);
 return {all:(x,z)=>values(bins.get(key(x,z))||[],x,z),cell:(k,x,z)=>values(cells.get(k)||[],x,z),at:(x,z)=>{const ys=values(bins.get(key(x,z))||[],x,z);return ys.length?ys[0]:null;}};
}
function mergedAtlas(read,project){
 const atlas=JSON.parse(read('data/atlas.json')),locations=new Map(atlas.locations.map(l=>[l.id,l]));
 for(const p of ['data/lunar.json','data/makai.json','data/netherworld.json','data/heaven.json','data/higan.json','data/animal.json','data/backdoor.json','data/kasen.json','data/current-hell.json','data/rainbow-mine.json','data/highland.json',...(project.extensionData||[])]){
  const add=JSON.parse(read(p));for(const patch of add.locationUpdates){const l=locations.get(patch.id);assert(l,'Unknown location patch');for(const [k,v]of Object.entries(patch)){if(k==='aliases'||k==='source_ids')l[k]=[...new Set([...(l[k]||[]),...v])];else if(k!=='id')l[k]=v;}}atlas.sources.push(...add.sources);
  for(const c of add.verifiedLocationCorrections||[]){const l=locations.get(c.id);for(const [k,v]of Object.entries(c.expected))same(l[k],v,'Evidence correction prerequisite');Object.assign(l,c.replace);}
 }return atlas;
}
function bootPredecessors(G,data,pack){
 pack.meshes.push(...G.buildKishinjouOverview().meshes);
 for(const build of [G.buildLunarOverviews,G.buildMakaiOverviews])for(const p of build())pack.meshes.push(...p.meshes);
 pack.meshes.push(...G.buildNetherworldOverview().meshes);
 for(const build of [G.buildHeavenOverviews,G.buildHiganOverviews,G.buildAnimalOverviews])for(const p of build())pack.meshes.push(...p.meshes);
 pack.meshes.push(...G.buildBackdoorOverview().meshes,...G.buildKasenOverview().meshes);
 for(const p of G.buildCurrentHellOverviews())pack.meshes.push(...p.meshes);
 pack.meshes.push(...G.buildRainbowMineOverview().meshes);
 G.LANDSCAPE.apply(pack,new G.Terrain(data));const t=new G.Terrain(data);G.applyHighlandGround(pack,t);pack.meshes.push(...G.highlandGround(t,pack),...G.buildHighland(t,true).meshes);
 assert((G.extraOverviewBuilders||[]).length>1,'Missing production predecessor hooks');
 // The exact registered prefix ends at Solar. Its actual wrapper is the
 // last hook in this independent stage context; later modules run elsewhere.
 for(const build of G.extraOverviewBuilders.slice(0,-1))pack.meshes.push(...build(data,pack));
}
function surfaceSanity(m){
 assert.equal(m.vertices.constructor.name,'Float32Array',m.id+' position type');assert.equal(m.vertices.length%9,0);assert(m.vertices.every(Number.isFinite),m.id+' finite attributes');let minimum=Infinity;
 if(m.index){assert(['Uint32Array','Uint16Array'].includes(m.index.constructor.name));assert.equal(m.index.length%3,0);assert(m.index.every(v=>v<m.vertices.length/9));}
 for(let i=0;i<tris(m)*3;i+=3){const [a,b,c]=positions(m,i),u=b.map((v,k)=>v-a[k]),v=c.map((w,k)=>w-a[k]),n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];minimum=Math.min(minimum,Math.hypot(...n)/2);}
 assert(minimum>1e-8,m.id+' new zero-area face');return {id:m.id,triangles:tris(m),minimumArea:minimum};
}
function cumulative(samples){let n=0;return samples.map((p,i)=>{if(i)n+=Math.hypot(p[0]-samples[i-1][0],p[1]-samples[i-1][1]);return n;});}
function nearestRoute(samples,along,point,start){
 let best={distance:Infinity};for(let i=start;i<samples.length-1;i++){const a=samples[i],b=samples[i+1],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),t=Math.max(0,Math.min(1,((point[0]-a[0])*dx+(point[2]-a[1])*dz)/(len*len))),x=a[0]+dx*t,z=a[1]+dz*t,d=Math.hypot(point[0]-x,point[2]-z);if(d<best.distance)best={distance:d,along:along[i]+len*t,side:(point[0]-x)*(-dz/len)+(point[2]-z)*(dx/len),segment:i};}return best;
}
function pointAt(samples,along,distance,start){let i=start;while(i<samples.length-2&&along[i+1]<distance)i++;const a=samples[i],b=samples[i+1],len=along[i+1]-along[i],t=Math.max(0,Math.min(1,(distance-along[i])/len));return{x:a[0]+(b[0]-a[0])*t,z:a[1]+(b[1]-a[1])*t,normal:[-(b[1]-a[1])/len,(b[0]-a[0])/len]};}
function generatedByRoute(point,samples,i,side){
 const a=samples[i],b=samples[i+1],len=Math.hypot(b[0]-a[0],b[1]-a[1]),normal=[-(b[1]-a[1])/len*side,(b[0]-a[0])/len*side];let low=3.5,high=10.5;
 for(let k=0;k<2;k++){const delta=point[k===0?0:2]-a[k];if(Math.abs(normal[k])<1e-10){if(delta<-.001||delta>2.001)return false;continue;}const u=(delta-2.001)/normal[k],v=(delta+.001)/normal[k];low=Math.max(low,Math.min(u,v));high=Math.min(high,Math.max(u,v));}return low<=high;
}
function clipXZ(triangle,road){
 const orientation=Math.sign((road[1][0]-road[0][0])*(road[2][2]-road[0][2])-(road[1][2]-road[0][2])*(road[2][0]-road[0][0]));if(!orientation)return[];let polygon=triangle;
 for(let i=0;i<3&&polygon.length;i++){const a=road[i],b=road[(i+1)%3],side=p=>orientation*((b[0]-a[0])*(p[2]-a[2])-(b[2]-a[2])*(p[0]-a[0])),out=[];
  for(let j=0;j<polygon.length;j++){const p=polygon[j],q=polygon[(j+1)%polygon.length],s=side(p),t=side(q),pInside=s>=-1e-7,qInside=t>=-1e-7;if(pInside)out.push(p);if(pInside!==qInside){const f=s/(s-t);out.push(p.map((v,k)=>v+(q[k]-v)*f));}}polygon=out;
 }return polygon;
}
function roadClearance(plantRecords,roadFaces){
 const bins=new Map(),failures=[],prototypeBoxes=new Map();let transformedInstances=0,testedTriangles=0,intersections=0;
 for(const r of roadFaces){const xs=r.ps.map(p=>p[0]),zs=r.ps.map(p=>p[2]);for(let x=Math.floor(Math.min(...xs)/16);x<=Math.floor(Math.max(...xs)/16);x++)for(let z=Math.floor(Math.min(...zs)/16);z<=Math.floor(Math.max(...zs)/16);z++){const k=x+','+z;if(!bins.has(k))bins.set(k,[]);bins.get(k).push(r);}}
 for(const m of plantRecords){const isTree=m.id.includes(':broad:')||m.id==='overview:sunflower:trees'||m.flowerKind==='tree',a=m.instances;
  if(!prototypeBoxes.has(m.vertices)){const low=[Infinity,Infinity,Infinity],high=[-Infinity,-Infinity,-Infinity],a=m.vertices,box=[];for(let i=0;i<a.length;i+=9)for(let k=0;k<3;k++){low[k]=Math.min(low[k],a[i+k]);high[k]=Math.max(high[k],a[i+k]);}for(const x of [low[0],high[0]])for(const y of [low[1],high[1]])for(const z of [low[2],high[2]])box.push([x,y,z]);prototypeBoxes.set(m.vertices,box);}
  for(let i=0;i<a.length;i+=16){if(!inside(a[i+12],a[i+14]))continue;const local=m.vertices,ps=[];let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
   for(const [x,y,z]of prototypeBoxes.get(local)){const X=a[i]*x+a[i+4]*y+a[i+8]*z+a[i+12],Z=a[i+2]*x+a[i+6]*y+a[i+10]*z+a[i+14];minX=Math.min(minX,X);maxX=Math.max(maxX,X);minZ=Math.min(minZ,Z);maxZ=Math.max(maxZ,Z);}
   const candidates=new Set();for(let x=Math.floor(minX/16);x<=Math.floor(maxX/16);x++)for(let z=Math.floor(minZ/16);z<=Math.floor(maxZ/16);z++)for(const r of bins.get(x+','+z)||[])if(!r.shoulder||isTree)candidates.add(r);if(!candidates.size)continue;transformedInstances++;
   for(let j=0;j<local.length;j+=9){const x=local[j],y=local[j+1],z=local[j+2];ps.push([a[i]*x+a[i+4]*y+a[i+8]*z+a[i+12],a[i+1]*x+a[i+5]*y+a[i+9]*z+a[i+13],a[i+2]*x+a[i+6]*y+a[i+10]*z+a[i+14]]);}
   for(let j=0;j<(m.index?.length||ps.length);j+=3){const triangle=m.index?[ps[m.index[j]],ps[m.index[j+1]],ps[m.index[j+2]]]:ps.slice(j,j+3);testedTriangles++;for(const r of candidates){const clipped=clipXZ(triangle,r.ps);if(!clipped.length)continue;const heights=clipped.map(p=>{const ground=bary(r.ps,p[0],p[2]);return ground===null?NaN:p[1]-ground;}).filter(Number.isFinite);if(!heights.length)continue;if(Math.min(...heights)<=2.4&&Math.max(...heights)>=-.05){intersections++;if(failures.length<12)failures.push({id:m.id,instance:i/16,triangle:j/3,roadTriangle:r.index,shoulder:r.shoulder,clearanceRange:[Math.min(...heights),Math.max(...heights)]});}}}
  }
 }
 assert.equal(intersections,0,'Actual vegetation crosses walkable road / tree-clear shoulder headroom: '+JSON.stringify(failures));
 return{transformedInstances,testedTriangles,intersections,roadFaces:roadFaces.length,headroom:2.4,scope:'Real near prototype triangles clipped against actual new road triangles. Grass and low shrubs may occupy the shoulder; tree triangles are checked there too. No tree-center radius substitute.'};
}
function approachMetrics(U,G,terrain,nearSurface,roadFaces){
 const grade=(samples,start)=>{let maximum=0,length=0;for(let i=start;i<samples.length-1;i++){const a=samples[i],b=samples[i+1],d=Math.hypot(b[0]-a[0],b[1]-a[1]);if(!d)continue;maximum=Math.max(maximum,Math.abs(terrain.height(b[0],b[1])-terrain.height(a[0],a[1]))/d);length+=d;}return{maximumGrade:maximum,horizontalLength:length};};
 const publicRoad=grade(U.routeSamples,U.routeStart-1),native=G.FLOWERLANDS.paths.find(p=>p.id==='sun-main'),nativeEntry=grade(native.samples.filter(p=>inside(p[0],p[1])),0);let samples=0,minimumGap=Infinity,maximumGap=-Infinity;const buried=[];
 for(const r of roadFaces)for(const weights of [[1/3,1/3,1/3],[.5,.5,0],[0,.5,.5],[.5,0,.5]]){const p=[0,1,2].map(k=>weights.reduce((s,w,j)=>s+w*r.ps[j][k],0));if(!inside(p[0],p[2]))continue;const y=nearSurface.at(p[0],p[2]);if(y===null)continue;const gap=p[1]-y;samples++;minimumGap=Math.min(minimumGap,gap);maximumGap=Math.max(maximumGap,gap);if(gap<-.05&&buried.length<12)buried.push({road:r.id,triangle:r.index,position:p,ground:y,gap});}
 assert(samples>0,'No actual road surface probes');assert.equal(buried.length,0,'New approach/shoulder is buried in actual near surface: '+JSON.stringify(buried));
 // Preserve the author's documented 30% source-stage bound, rather than
 // reporting an earlier control-line estimate as actual navigable grade.
 assert(publicRoad.maximumGrade<=.30,'Actual public approach exceeds documented 30% center grade');assert(nativeEntry.maximumGrade<=.30,'Actual retained native entry exceeds documented 30% center grade');
 return {publicRoad,nativeEntry,actualRoadAndShoulderSamples:samples,minimumSurfaceGap:minimumGap,maximumSurfaceGap:maximumGap,burialTolerance:.05,gradeLimit:.30,meaning:'Actual contact heights and submitted road triangle interiors; grades are not frame-rate or human-accessibility claims.'};
}
function originalRoadPositionKeys(G,U,height){
 const geometries=[new G.Geometry(),new G.Geometry()],samples=U.sourceRoute.samples;
 for(let i=U.routeStart-1;i<samples.length-1;i++){const a=samples[i],b=samples[i+1],previous=samples[Math.max(0,i-1)],next=samples[Math.min(samples.length-1,i+2)],normal=(p,q)=>{const dx=q[0]-p[0],dz=q[1]-p[1],len=Math.hypot(dx,dz)||1;return[-dz/len,dx/len];},na=normal(previous,b),nb=normal(a,next),p=(v,n,s)=>{const x=v[0]+n[0]*s,z=v[1]+n[1]*s;return[x,height(x,z)+.13,z];};geometries[0].quad(p(a,na,-2),p(a,na,2),p(b,nb,2),p(b,nb,-2),G.rgb('#9e946f'));for(const side of [-1,1])geometries[1].quad(p(a,na,side*2),p(a,na,side*4.5),p(b,nb,side*4.5),p(b,nb,side*2),G.rgb('#839063'));}
 return geometries.map(g=>{const keys=new Set();for(let i=0;i<g.a.length;i+=27)keys.add(triKey([0,1,2].map(j=>g.a.slice(i+j*9,i+j*9+3).map(Math.fround))));return keys;});
}
function checkRoadsideMoves(G,U,meta,old,pack,terrain,base){
 const moves=meta.roadsideMoves||[],byKey=new Map();if(U.revision<2){assert.equal(moves.length,0);return byKey;}
 const authorized=new Set(ROADSIDE_TRANSLATIONS.flatMap(d=>Array.from({length:d.last-d.first+1},(_,i)=>d.recordId+'/'+(d.first+i))));assert.equal(moves.length,120,'Authorized roadside migration inventory changed');
 const ss=cumulative(U.sourceRoute.samples),ts=cumulative(U.routeSamples);
 for(const move of moves){const id=move.recordId+'/'+move.instanceIndex;assert(authorized.has(id),'Unapproved XY migration '+id);assert(!byKey.has(id),'Duplicate XY migration '+id);const original=old.get(move.recordId)?.arrays.instances.original;assert(original,'Migration source record absent');const i=move.instanceIndex*16,p=Array.from(original.subarray(i+12,i+15));same(move.source,p,'Migration source does not equal original stored matrix');const q=nearestRoute(U.sourceRoute.samples,ss,p,U.routeStart),fraction=(q.along-ss[U.routeStart])/(ss.at(-1)-ss[U.routeStart]),distance=ts[U.routeStart]+(ts.at(-1)-ts[U.routeStart])*fraction,target=pointAt(U.routeSamples,ts,distance,U.routeStart),X=target.x+target.normal[0]*q.side,Z=target.z+target.normal[1]*q.side;
  for(const [k,expected]of Object.entries({sourceSegment:q.segment,oldAlong:q.along,relativeAlong:fraction,sideOffset:q.side,newAlong:distance}))assert(Math.abs(move[k]-expected)<=1e-7,'Migration route-relative field '+k);
  assert(Array.isArray(move.nominalTargetXZ)&&move.nominalTargetXZ.length===2,'Missing original nominal translation');assert(Math.hypot(move.nominalTargetXZ[0]-X,move.nominalTargetXZ[1]-Z)<=1e-7,'Migration nominal target not the original relative station and side');assert(Array.isArray(move.mappedNormal)&&move.mappedNormal.length===2);assert(Math.hypot(...move.mappedNormal.map((v,k)=>v-target.normal[k]))<=1e-12,'Mapped route normal changed');
  const offset=ROADSIDE_CLEARANCE_TRANSLATIONS.get(id)||0;assert.equal(move.clearanceOffset,offset,'Unapproved additional side correction '+id);const direction=target.normal.map(v=>v*(Math.sign(q.side)||1));if(offset){assert(Array.isArray(move.clearanceDirection)&&move.clearanceDirection.length===2);assert(Math.hypot(...move.clearanceDirection.map((v,k)=>v-direction[k]))<=1e-12,'Correction is not outward from original side');}const correctedX=X+direction[0]*offset,correctedZ=Z+direction[1]*offset;assert(Math.hypot(move.targetXZ[0]-correctedX,move.targetXZ[1]-correctedZ)<=1e-7,'Migration target contains an unapproved displacement');assert(inside(correctedX,correctedZ),'Migration target left approved scope');const actual=pack.meshes.find(m=>m.id===move.recordId).instances,Y=terrain.height(correctedX,correctedZ)+(p[1]-base(p[0],p[2]));for(const [k,value]of [[12,correctedX],[13,Y],[14,correctedZ]])assert(Math.abs(actual[i+k]-Math.fround(value))<=.00015,'Stored migration translation mismatch');same(move.target,Array.from(actual.subarray(i+12,i+15)),'Migration audit target disagrees with stored source');
  if(move.recordId.includes(':grass:')){const matches=[];for(let j=3;j<U.sourceRoute.samples.length-3;j+=3){if(j<U.routeStart||G.DIORAMA.owner(...U.sourceRoute.samples[j]))continue;for(const side of [-1,1])if(generatedByRoute(p,U.sourceRoute.samples,j,side))matches.push({sample:j,side});}assert.equal(matches.length,1,'Grass does not have one unique original route generator anchor');same(move.sourceAnchor,matches[0],'Original grass anchor changed');}
  else{const paired=moves.filter(m=>m.recordId==='island:transition:grass:-1:1'&&m.source[0]===p[0]&&m.source[2]===p[2]);assert.equal(paired.length,1,'Shrub has no unique original grass pair');same(move.pairedGrass,{recordId:paired[0].recordId,instanceIndex:paired[0].instanceIndex});same(move.sourceAnchor,paired[0].sourceAnchor);}
  byKey.set(id,{...move,expected:[Math.fround(correctedX),Math.fround(Y),Math.fround(correctedZ)]});
 }same([...byKey.keys()].sort(),[...authorized].sort(),'Missing authorized roadside migration');return byKey;
}
function nativeJoinCorners(G,U,terrain){
 const path=G.FLOWERLANDS.paths.find(p=>p.id==='sun-main'),a=path.samples[0],b=path.samples[1],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),normal=[-dz/len,dx/len],half=path.width*.97/2,soil=G.rgb('#b2a17d'),edge=G.rgb('#8d8765');
 return [-1,1].flatMap(side=>[false,true].map(outer=>{const x=a[0]+normal[0]*(half+(outer?.6:0))*side,z=a[1]+normal[1]*(half+(outer?.6:0))*side,p=[x,terrain.height(x,z)+.24,z],n=terrain.normal(x,z),c=outer?G.blend(terrain.color(x,z,p[1],n),soil,.12):G.blend(soil,edge,G.noise(x/8,z/12)*.18);return {side,outer,attributes:[...p,...n,...c].map(Math.fround)};}));
}
function retainedNativeEvidence(read,evidence,expectedSHA){
 assert(evidence&&expectedSHA,'Candidate-only needs the exact original paired report and SHA');
 assert.equal(sha(evidence),expectedSHA,'Retained native evidence changed');
 const report=JSON.parse(String(evidence));assert.equal(report.nativeBuildCount,2);assert.equal(report.nativeRequested,true);
 const names=['original native baseline independently fixed','native identities, plant prototypes, colors and fifteen matrix components','native buildings and seasonal stage held at original geometry','actual native first segment shares all public endpoint attributes','actual native plant geometry clears the new public road','native bounds contain actual prototypes and population is conserved'];
 const checks=names.map(name=>{const c=report.checks.find(c=>c.name===name);assert(c?.passed,'Required original native evidence did not pass: '+name);return {name,result:c.result};});
 assert.equal(checks[0].result.digest,ORIGINAL_SUNFLOWER_GEOMETRY_SHA);
 // Only the Solar module changed. The original inherited native builder,
 // merged data and source pack must still match the actual paired execution.
 const boundInputs=[];for(const [p,hash]of Object.entries(report.inputSHA256)){if(p===SOURCE)continue;assert.equal(sha(read(p)),hash,'Reused native prerequisite changed: '+p);boundInputs.push(p);}
 assert(boundInputs.includes('src/world-builder.js')&&boundInputs.includes('data/atlas.json')&&boundInputs.includes('assets/packs/overview.pack.gz'),'Incomplete retained source binding');
 return {reportSHA256:expectedSHA,previousSourceSHA256:report.sourceSHA256,originalGeometrySHA256:ORIGINAL_SUNFLOWER_GEOMETRY_SHA,sourcePrerequisitesMatched:boundInputs,checks,meaning:'Prior paired native checks retained as evidence; these comparisons are not newly executed in candidate-only mode.'};
}
export async function checkSunflowerEntry(read,{sourceSHA,native=false,candidateOnly=false,nativeEvidence,nativeEvidenceSHA}={}){
 assert(!(native&&candidateOnly),'Choose paired --native or candidate-only, not both');
 const started=performance.now(),report={schema:1,kind:'Independent sunflower source preflight',sourceSHA256:sha(read(SOURCE)),nativeRequested:native||candidateOnly,nativeMode:native?'paired':candidateOnly?'candidate-only':'not-run',nativeBuildCount:0,noGPU:true,fixtureRewriting:false,checks:[],notRun:[],passed:true,timingMeaning:'performance.now wall-clock source builder samples; not input-handler time, CPU cycles or FPS'};
 const check=async(name,f)=>{try{const result=await f();report.checks.push({name,passed:true,result});return result;}catch(e){report.checks.push({name,passed:false,error:e.stack||String(e)});report.passed=false;return null;}};
 await check('frozen source and approved envelope',()=>{assert(sourceSHA,'An exact --source-sha is required');assert.equal(report.sourceSHA256,sourceSHA,'Candidate changed before preflight');return {sourceSHA256:sourceSHA,scope:SCOPE};});
 if(!report.passed){report.CPUms=performance.now()-started;return report;}
 const projectBytes=read('project.json'),project=JSON.parse(projectBytes);
 const registration=await check('actual registered Solar prefix and separately reported suffix',()=>({
  ...registeredSunflowerPrefix(project),projectSHA256:sha(projectBytes),
  meaning:'This independent stage check executes the exact registered prefix through Solar. Later modules remain registered and are covered by their own checks and the complete project boot.'
 }));
 if(!registration){report.notRun.push('Dependent Solar geometry and native protection');report.CPUms=performance.now()-started;return report;}
 const context=vm.createContext({performance,TextDecoder,TextEncoder});for(const p of registration.modules)vm.runInContext(String(read(p)),context,{filename:p});
 const G=context.GA,U=G.SUNFLOWER_ENTRY;assert(U,'Missing source API');same(Array.from(U.scope),SCOPE,'Approved scope changed');
 context.inputAtlas=JSON.stringify(mergedAtlas(read,project));const data=vm.runInContext('JSON.parse(inputAtlas)',context);
 const raw=gunzipSync(read('assets/packs/overview.pack.gz')),pack=G.decodePack(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength));
 const pre=await check('actual public boot predecessor sequence',()=>{bootPredecessors(G,data,pack);return {overviewHooks:G.extraOverviewBuilders.length,recordsBeforeSolar:pack.meshes.length,protocol:'All boot overview additions, LANDSCAPE, highland ground and additions, then each preceding extraOverviewBuilder'};});
 if(!pre){report.notRun.push('Dependent candidate source checks','Native protection');report.CPUms=performance.now()-started;return report;}
 const selected=m=>m.component==='island-terrain'&&!m.cutOnly&&m.tile[0]<SCOPE[2]&&m.tile[0]+m.tile[2]>SCOPE[0]&&m.tile[1]<SCOPE[3]&&m.tile[1]+m.tile[2]>SCOPE[1];
 const vegetation=m=>m.instances&&(m.globalSurface&&m.component==='transition-vegetation'||m.id==='overview:sunflower:trees');
 const cold=m=>m.owner==='sunflower'&&!m.instances&&m.component!=='terrain'&&m.group!=='terrain'&&m.overview;
 const writable=m=>selected(m)||U.roadIDs.includes(m.id)||vegetation(m)||cold(m);
 const old=snapshot(pack,writable),oldBuffers=buffers(pack),oldPaths=JSON.stringify(G.FLOWERLANDS.paths),oldRoutes=new Map(G.ISLAND.allRoutes.map(r=>[r.id,JSON.stringify(r)])),oldIDs=pack.meshes.map(m=>m.id);
 const prepare=await check('production Solar wrapper including shared source guards',()=>{pack.meshes.push(...G.extraOverviewBuilders.at(-1)(data,pack));assert(U.metadata.has(pack));assert(data.sunflowerEntry?.contact?.length>0);return {records:pack.meshes.length,contactBytes:data.sunflowerEntry.contact.byteLength,metadata:U.metadata.get(pack)};});
 if(!prepare){report.notRun.push('Dependent geometry, ownership and protection assertions','Native protection');report.CPUms=performance.now()-started;return report;}
 const meta=U.metadata.get(pack),terrain=new G.Terrain(data),base=(x,z)=>U.BaseHeight.call(terrain,x,z),contact=U.sampler(data.sunflowerEntry.contact),pad=(x,z)=>U.protectedPads.some(p=>Math.abs(x-p.x)<=p.w/2&&Math.abs(z-p.z)<=p.d/2);
 const near=pack.meshes.filter(m=>selected(m)&&m.globalNear),far=pack.meshes.filter(m=>selected(m)&&m.globalFar),oldNear=near.map(m=>retained(old.get(m.id))),oldFar=far.map(m=>retained(old.get(m.id)));
 const newNearSurface=meshSampler(near),oldNearSurface=meshSampler(oldNear),farSurface=meshSampler(far),active=new Set();
 // Derive the affected cells from actual changed source positions, not the
 // author's active-cell declaration. Added boundary alignment is also real.
 for(const m of near){const a=old.get(m.id).arrays.vertices.original;for(let i=0;i<tris(m)*3;i+=3){if(![0,1,2].some(k=>{const j=m.index[i+k]*9;return m.vertices[j+1]!==a[j+1];}))continue;const ps=positions(m,i);active.add(key(ps.reduce((n,p)=>n+p[0],0)/3,ps.reduce((n,p)=>n+p[2],0)/3));}}
 const declaredActive=new Set(meta.activeCells);
 await check('record identity, flags and non-target bytes',()=>{same(pack.meshes.map(m=>m.id),oldIDs,'Public record identity/order');assert.equal(new Set(oldIDs).size,oldIDs.length);let unchanged=0,changed=0;for(const m of pack.meshes){const o=old.get(m.id),isChanged=Object.entries(o.arrays).some(([k,a])=>!m[k]||arraySHA(m[k])!==a.sha);if(isChanged){changed++;assert(writable(m),'Non-target source changed: '+m.id);assert.equal(identity(m),o.identity,'Owner, material, LOD or public flags changed: '+m.id);}else{unchanged++;assert.equal(metadata(m),o.meta,'Unchanged record metadata changed: '+m.id);}for(const [k,a]of Object.entries(o.arrays))if(!FIELDS.includes(k))assert.equal(arraySHA(m[k]),a.sha,'Other attribute changed: '+m.id+'/'+k);}return {records:oldIDs.length,changed,unchanged};});
 await check('near terrain envelope, original XY and index protection',()=>{let changed=0;for(const m of near){const o=old.get(m.id),a=o.arrays.vertices.original,b=m.vertices;assert.equal(b.length,a.length);assert.equal(arraySHA(m.index),o.arrays.index.sha);for(let i=0;i<a.length;i+=9){assert.equal(b[i],a[i]);assert.equal(b[i+2],a[i+2]);if(!inside(a[i],a[i+2]))for(let k=0;k<9;k++)assert.equal(b[i+k],a[i+k],'Near attribute escaped scope '+m.id);if(b[i+1]!==a[i+1])changed++;}}assert(changed>0);return {records:near.length,changedVertices:changed,geometrySanity:near.map(surfaceSanity)};});
 await check('far retained faces and actual near face replacement',()=>{let removed=0,added=0;for(const m of far){const original=retained(old.get(m.id)),n=near.find(q=>q.id+':far'===m.id),expected=new Map();assert(n,'Far sibling missing');for(const [src,isNear]of [[original,false],[n,true]])for(let i=0;i<tris(src)*3;i+=3){const ps=positions(src,i),cell=key(ps.reduce((s,p)=>s+p[0],0)/3,ps.reduce((s,p)=>s+p[2],0)/3);if(declaredActive.has(cell)!==isNear)continue;const k=triKey(attributes(src,i));expected.set(k,(expected.get(k)||0)+1);if(isNear)added++;}multisetEqual(expected,triangleSet(m),'Far retained/replaced '+m.id);removed+=tris(original);}return {records:far.length,originalFarFaces:removed,expectedFineFaces:added,geometrySanity:far.map(surfaceSanity),authorActiveCellCount:declaredActive.size,actualYChangedCellCount:active.size};});
 await check('actual retained far to fine T interfaces',()=>{let edges=0,samples=0,maximumGap=0;const failures=[];for(const cell of declaredActive){const [X,Z]=cell.split(',').map(Number);for(const [dx,dz]of [[-1,0],[1,0],[0,-1],[0,1]]){const adjacent=(X+dx)+','+(Z+dz);if(declaredActive.has(adjacent))continue;edges++;for(const t of [0,.25,.5,.75,1]){const x=dx?(X+(dx>0?1:0))*32:(X+t)*32,z=dz?(Z+(dz>0?1:0))*32:(Z+t)*32,a=farSurface.cell(cell,x,z),b=farSurface.cell(adjacent,x,z);samples++;if(!a.length||!b.length){failures.push({cell,adjacent,x,z,missingSide:a.length?'retained':'fine'});continue;}const gap=Math.max(...a,...b)-Math.min(...a,...b);maximumGap=Math.max(maximumGap,gap);if(gap>.0003)failures.push({cell,adjacent,x,z,gap});}}}assert.equal(failures.length,0,'Actual far/fine open boundaries: '+JSON.stringify(failures.slice(0,12)));return {edges,samples,maximumGap,tolerance:.0003};});
 await check('near tile interfaces introduce no new opening',()=>{let samples=0,maximumIncrease=0;const failures=[];for(const m of near){const a=m.vertices;for(let i=0;i<a.length;i+=9){const x=a[i],z=a[i+2];if(!inside(x,z))continue;if(x!==m.tile[0]&&x!==m.tile[0]+m.tile[2]&&z!==m.tile[1]&&z!==m.tile[1]+m.tile[2])continue;const ys=newNearSurface.all(x,z),oldYs=oldNearSurface.all(x,z);if(ys.length<2||oldYs.length<2)continue;const gap=Math.max(...ys)-Math.min(...ys),oldGap=Math.max(...oldYs)-Math.min(...oldYs),increase=gap-oldGap;samples++;maximumIncrease=Math.max(maximumIncrease,increase);if(increase>.0003)failures.push({x,z,gap,oldGap});}}assert.equal(failures.length,0,JSON.stringify(failures.slice(0,12)));return {samples,maximumIncrease,tolerance:.0003};});
 await check('retained contact equals actual near triangles and terrain query',()=>{const a=data.sunflowerEntry.contact;assert.equal(a.constructor.name,'Float32Array');assert.equal(a.length%9,0);assert(a.every(Number.isFinite));let samples=0,maximumError=0;for(let i=0;i<a.length;i+=9){const x=(a[i]+a[i+3]+a[i+6])/3,z=(a[i+2]+a[i+5]+a[i+8])/3,y=(a[i+1]+a[i+4]+a[i+7])/3,actual=newNearSurface.at(x,z);assert(actual!==null,'Contact has no visible near face');maximumError=Math.max(maximumError,Math.abs(actual-y));if(inside(x,z)&&!pad(x,z)){const h=terrain.height(x,z);assert(Math.abs(h-y)<=.0003,'Native/camera query diverges from rendered near ground');}samples++;}assert(maximumError<=.0003,'Contact differs from actual near source');return {triangles:a.length/9,samples,maximumError,contactBytes:a.byteLength};});
 const checkedMoves=await check('only explicitly authorized original roadside instances migrate',()=>{const moves=checkRoadsideMoves(G,U,meta,old,pack,terrain,base);return {count:moves.size,grass:[...moves.values()].filter(m=>m.recordId.includes(':grass:')).length,shrubs:[...moves.values()].filter(m=>m.recordId.includes(':shrub:')).length,keys:[...moves.keys()],map:moves};}),moveMap=checkedMoves?.map||new Map();if(checkedMoves)delete checkedMoves.map;
 await check('public trees/unlisted plants keep fifteen matrix components; listed plants keep thirteen',()=>{let records=0,instances=0,moved=0,translations=0;for(const m of pack.meshes.filter(vegetation)){const o=old.get(m.id),a=o.arrays.instances.original,b=m.instances;assert.equal(a.length,b.length);for(const k of ['vertices','farVertices','index','instanceColors'])if(o.arrays[k])assert.equal(arraySHA(m[k]),o.arrays[k].sha,m.id+'/'+k);for(let i=0;i<a.length;i+=16){const migration=moveMap.get(m.id+'/'+i/16);for(let k=0;k<16;k++)if(k!==13&&!(migration&&(k===12||k===14)))assert.equal(b[i+k],a[i+k],m.id+' matrix '+k);const x=a[i+12],z=a[i+14],h=inside(x,z)&&!pad(x,z)?contact(x,z):null,expected=migration?migration.expected[1]:Math.fround(a[i+13]+(h===null?0:h-base(x,z)));assert(Math.abs(b[i+13]-expected)<=.00015,m.id+' root offset changed');if(b[i+13]!==a[i+13])moved++;if(migration)translations++;instances++;}records++;}assert(moved>0);assert.equal(translations,moveMap.size);return {records,instances,moved,authorizedFullTranslations:translations,treeAndUnlistedPermittedComponent:13,prototypesAndColorsUnchanged:true};});
 await check('cold flower and architecture non-target vertex attributes',()=>{let records=0,changed=0;for(const m of pack.meshes.filter(cold)){const o=old.get(m.id),a=o.arrays.vertices.original,b=m.vertices;assert.equal(a.length,b.length);for(let i=0;i<a.length;i+=9){for(let k=0;k<9;k++)if(k!==1)assert.equal(b[i+k],a[i+k],m.id+' non-Y attribute');const x=a[i],z=a[i+2],h=inside(x,z)&&!pad(x,z)?contact(x,z):null,expected=Math.fround(a[i+1]+(h===null?0:h-base(x,z)));assert(Math.abs(b[i+1]-expected)<=.00015,m.id+' cold position offset');if(b[i+1]!==a[i+1])changed++;}if(o.arrays.index)assert.equal(arraySHA(m.index),o.arrays.index.sha);records++;}return {records,changedVertices:changed,coldIsNotNativeSubset:true};});
 await check('platform and umbrella query and actual support preservation',()=>{let samples=0,maximumMeshChange=0;const failures=[];for(const p of U.protectedPads)for(const tx of [-.5,-.25,0,.25,.5])for(const tz of [-.5,-.25,0,.25,.5]){const x=p.x+tx*p.w,z=p.z+tz*p.d;assert.equal(terrain.height(x,z),base(x,z),'Protected building query moved');const before=oldNearSurface.at(x,z),after=newNearSurface.at(x,z);assert(before!==null&&after!==null,'Protected pad has missing ground');const delta=Math.abs(after-before);samples++;maximumMeshChange=Math.max(maximumMeshChange,delta);if(delta>.01)failures.push({id:p.id,x,z,before,after,delta});}assert.equal(failures.length,0,'Protected rendered support moved: '+JSON.stringify(failures.slice(0,12)));return {samples,maximumMeshChange,queryUnchanged:true,tolerance:.01};});
 await check('public road start complete cross-section joins retained geometry',()=>{const i=U.routeStart-1,oldSamples=U.sourceRoute.samples,newSamples=U.routeSamples,p=oldSamples[i],prev=oldSamples[i-1],next=oldSamples[i+1],normal=(a,b)=>{const d=[b[0]-a[0],b[1]-a[1]],n=Math.hypot(...d);return[-d[1]/n,d[0]/n];},n0=normal(prev,next),n1=normal(newSamples[i-1],newSamples[i+1]);same(newSamples.slice(0,U.routeStart),oldSamples.slice(0,U.routeStart),'Retained public road prefix');assert(Math.hypot(...n0.map((v,k)=>v-n1[k]))<1e-12,'Join tangents differ');const corners=[];for(const width of [-4.5,-2,2,4.5]){const x=p[0]+n0[0]*width,z=p[1]+n0[1]*width,expected=[x,base(x,z)+.13,z].map(Math.fround);for(const id of Math.abs(width)===4.5?[U.roadIDs[1]]:U.roadIDs){const before=retained(old.get(id)),after=pack.meshes.find(m=>m.id===id),hits=a=>{let count=0;for(let j=0;j<a.length;j+=9)if([0,1,2].every(k=>Math.abs(a[j+k]-expected[k])<=.00015))count++;return count;};assert(hits(before.vertices)>0,'Expected join absent in original '+id);assert(hits(after.vertices)>=hits(before.vertices),'Original join corner lost '+id);}corners.push({width,position:expected});}assert.equal(JSON.stringify(G.FLOWERLANDS.paths),oldPaths,'Native internal XY paths changed');for(const r of G.ISLAND.allRoutes)if(r.id!=='route-flower')assert.equal(JSON.stringify(r),oldRoutes.get(r.id),'Other public route changed');return {sourceJoinSample:i,corners,nativeXYPathsUnchanged:true};});
 const roadFaces=[];for(const id of U.roadIDs){const m=pack.meshes.find(m=>m.id===id),before=triangleSet(retained(old.get(id)));for(let i=0;i<tris(m)*3;i+=3)if(!before.has(triKey(attributes(m,i))))roadFaces.push({id,index:i/3,shoulder:id.endsWith(':shoulder'),ps:positions(m,i)});}
 await check('all unrelated public road and shoulder faces retained byte-exact',()=>{const replaceKeys=originalRoadPositionKeys(G,U,base);let retainedFaces=0,removedFaces=0;for(let k=0;k<U.roadIDs.length;k++){const original=retained(old.get(U.roadIDs[k])),m=pack.meshes.find(m=>m.id===original.id),candidate=triangleSet(m),expected=new Map();for(let i=0;i<tris(original)*3;i+=3){if(replaceKeys[k].has(triKey(positions(original,i)))){removedFaces++;continue;}const t=triKey(attributes(original,i));expected.set(t,(expected.get(t)||0)+1);retainedFaces++;}for(const [t,n]of expected)assert.equal(candidate.get(t),n,'Unrelated public road source removed or changed '+original.id);}return {retainedFaces,removedFaces,newRoadAndShoulderFaces:roadFaces.length};});
 await check('actual ground grade and road/shoulder surface contact',()=>approachMetrics(U,G,terrain,newNearSurface,roadFaces));
 await check('actual public plant triangles clear new road and tree shoulder headroom',()=>roadClearance(pack.meshes.filter(vegetation),roadFaces));
 await check('actual far public prototypes clear new road and tree shoulder headroom',()=>{const records=pack.meshes.filter(m=>vegetation(m)&&m.farVertices).map(m=>{assert(!m.index,'Far prototype has an incompatible near index: '+m.id);return {...m,vertices:m.farVertices};});assert(records.length>0,'Vacuous far prototype inventory');return roadClearance(records,roadFaces);});
 const joinCorners=nativeJoinCorners(G,U,terrain);
 await check('public endpoint matches native width, complete corners, tangent, normals and colors',()=>{const path=G.FLOWERLANDS.paths.find(p=>p.id==='sun-main'),p=path.samples[0],q=path.samples[1],a=U.routeSamples.at(-2),b=U.routeSamples.at(-1),d=[q[0]-p[0],q[1]-p[1]],e=[b[0]-a[0],b[1]-a[1]],dot=(d[0]*e[0]+d[1]*e[1])/(Math.hypot(...d)*Math.hypot(...e));assert(dot>=1-1e-10,'Native entrance tangent kink');same(Array.from(b),Array.from(p));for(const c of joinCorners)for(const id of c.outer?[U.roadIDs[1]]:U.roadIDs){const m=pack.meshes.find(m=>m.id===id);let hits=0;for(let i=0;i<m.vertices.length;i+=9)if(c.attributes.every((v,k)=>Math.abs(m.vertices[i+k]-v)<=.00015))hits++;assert(hits>0,'Actual endpoint full attributes do not match native '+id+'/'+c.side+'/'+c.outer);}return {tangentDot:dot,nativeActualStartWidth:path.width*.97,nativeShoulder:.6,corners:joinCorners};});
 await check('renderer vertices cache identity compatible with every index',()=>{const refs=new Map();let shared=0;for(const m of pack.meshes){if(!refs.has(m.vertices))refs.set(m.vertices,[]);refs.get(m.vertices).push(m);}for(const users of refs.values()){if(users.length<2)continue;shared++;const indices=new Set(users.map(m=>m.index));assert.equal(indices.size,1,'Different index arrays share renderer vertices cache identity: '+users.map(m=>m.id).join(','));}return {verticesIdentities:refs.size,sharedIdentities:shared};});
 await check('all reachable added backing including contacts and metadata',()=>{const retainedBuffers=buffers(pack,data.sunflowerEntry,meta),newBuffers=new Set([...retainedBuffers].filter(b=>!oldBuffers.has(b))),added=sumBytes(newBuffers),recordBytes=sumBytes(buffers(pack));assert.equal(added,meta.sourceBytes,'Metadata omits retained source backing');assert(added<=.6*1048576,'Retained new source exceeds 0.6 MiB');assert.equal(pack.bytes,recordBytes,'Public source byte accounting');assert.equal(meta.contactBytes,data.sunflowerEntry.contact.byteLength);let triangleDelta=0;for(const m of pack.meshes)triangleDelta+=tris(m)-tris(retained(old.get(m.id)));assert(triangleDelta<=4000,'Static source pool exceeds 4000 additional triangles');assert.equal(triangleDelta,meta.farDelta+meta.roadDelta);assert.equal(meta.newRecords,0);return {addedBackingBytes:added,contactBytes:data.sunflowerEntry.contact.byteLength,newBackingCount:newBuffers.size,packBackingBytes:recordBytes,staticTriangleDelta:triangleDelta,newRecords:0,textureDelta:0,note:'Static source accounting only. All-channel submitted calls/triangles, texture residency and CPU interaction require fixed-camera browser measurements.'};});
 await check('same pack idempotence and fresh pack guard retained',()=>{const before=pack.meshes.map(m=>({id:m.id,meta:metadata(m),sha:FIELDS.map(k=>m[k]?arraySHA(m[k]):null)})),bytes=pack.bytes;assert.deepEqual(Array.from(U.prepare(data,pack)),[]);assert.equal(pack.bytes,bytes);same(pack.meshes.map(m=>({id:m.id,meta:metadata(m),sha:FIELDS.map(k=>m[k]?arraySHA(m[k]):null)})),before,'Repeated same-pack publication mutated source');const fresh=G.decodePack(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength)),freshIDs=fresh.meshes.map(m=>m.id),freshBytes=sumBytes(buffers(fresh));assert.throws(()=>U.prepare(data,fresh),/prepared twice/);same(fresh.meshes.map(m=>m.id),freshIDs);assert.equal(sumBytes(buffers(fresh)),freshBytes);return {samePackUnchanged:true,freshPackRejectedBeforeMutation:true};});
 if(native||candidateOnly){
  let original=null;
  if(native){const baselineData=vm.runInContext('JSON.parse(inputAtlas)',context),t0=performance.now();report.nativeBuildCount++;original=await U.originalBuildRegion(baselineData,'sunflower');report.originalNativeBuildCPUms=performance.now()-t0;await check('original native baseline independently fixed',()=>{const digest=geometryDigest(original);assert.equal(digest,ORIGINAL_SUNFLOWER_GEOMETRY_SHA);return {digest,records:original.meshes.length,sourceBytes:original.bytes};});}
  else{report.reusedNativeEvidence=retainedNativeEvidence(read,nativeEvidence,nativeEvidenceSHA);report.notRun.push('Original native build and paired identity/prototype/color/matrix/architecture comparisons: retained from the exact prior report, not re-executed');}
  const nativeStart=performance.now();report.nativeBuildCount++;const candidate=await G.buildRegion(data,'sunflower');report.candidateNativeBuildCPUms=performance.now()-nativeStart;report.candidateNativeGeometrySHA256=geometryDigest(candidate);
  if(original){
   await check('native identities, plant prototypes, colors and fifteen matrix components',()=>{same(candidate.meshes.map(m=>m.id),original.meshes.map(m=>m.id));let records=0,instances=0,moved=0;for(let j=0;j<original.meshes.length;j++){const a=original.meshes[j],b=candidate.meshes[j];assert.equal(identity(b),identity(a),'Native identity/LOD changed '+a.id);if(!a.instances)continue;for(const k of ['vertices','farVertices','instanceColors','index'])if(a[k])assert.equal(arraySHA(b[k]),arraySHA(a[k]),'Native prototype/color changed '+a.id);assert.equal(b.instances.length,a.instances.length);for(let i=0;i<a.instances.length;i+=16){for(let k=0;k<16;k++)if(k!==13)assert.equal(b.instances[i+k],a.instances[i+k],a.id+' component '+k);const x=a.instances[i+12],z=a.instances[i+14],expected=Math.fround(terrain.height(x,z)-.015);assert(Math.abs(b.instances[i+13]-expected)<=.00015,'Native root not on queried actual ground '+a.id);if(b.instances[i+13]!==a.instances[i+13]){assert(inside(x,z)&&!pad(x,z),'Native root moved outside authorized scope');moved++;}instances++;}records++;}assert(records>0&&instances>0,'Vacuous native inventory');return {records,instances,moved,prototypesAndColorsUnchanged:true};});
   await check('native buildings and seasonal stage held at original geometry',()=>{const ids=new Set(['sun-overlook','sun-parasol']);for(const f of original.meta.features.filter(f=>ids.has(f.id)))same(candidate.meta.features.find(q=>q.id===f.id),f,'Native protected feature moved');same(candidate.meta.stage,original.meta.stage,'Native seasonal stage changed');for(let i=0;i<original.meshes.length;i++){const a=original.meshes[i],b=candidate.meshes[i];if(a.instances||a.group==='roads')continue;assert.equal(arraySHA(a.vertices),arraySHA(b.vertices),'Native architecture changed '+a.id);}return {features:[...ids],stageUnchanged:true};});
  }else await check('candidate native roots follow final actual contact',()=>{let records=0,instances=0,queriedRoots=0;for(const m of candidate.meshes.filter(m=>m.instances)){records++;for(let i=0;i<m.instances.length;i+=16){instances++;const x=m.instances[i+12],z=m.instances[i+14];if(!inside(x,z))continue;const expected=Math.fround(terrain.height(x,z)-.015);assert(Math.abs(m.instances[i+13]-expected)<=.00015,'Candidate root not on final actual ground '+m.id);queriedRoots++;}}const prior=report.reusedNativeEvidence.checks.find(c=>c.name==='native identities, plant prototypes, colors and fifteen matrix components').result;assert.equal(records,prior.records);assert.equal(instances,prior.instances);assert(queriedRoots>0);return {records,instances,queriedRoots,tolerance:.00015,nativeGeometrySHA256:report.candidateNativeGeometrySHA256,note:'Current roots inside the approved slope checked against final query/contact. Original non-Y, color and prototype comparisons are retained evidence, not newly run.'};});
  await check('actual native first segment shares all public endpoint attributes',()=>{const roads=candidate.meshes.filter(m=>m.group==='roads');assert(roads.length>0);for(const c of joinCorners){let hits=0;for(const m of roads)for(let i=0;i<m.vertices.length;i+=9)if(c.attributes.every((v,k)=>Math.abs(m.vertices[i+k]-v)<=.00015))hits++;assert(hits>0,'Native actual source lacks public matched corner');}return {corners:joinCorners,actualNativeRoadRecords:roads.length};});
  await check('actual native plant geometry clears the new public road',()=>roadClearance(candidate.meshes.filter(m=>m.instances),roadFaces));
  await check('native bounds contain actual prototypes and population is conserved',()=>{let checked=0;for(const m of candidate.meshes.filter(m=>m.instances)){const extrema=[];for(const a of [m.vertices,m.farVertices].filter(Boolean)){const low=[Infinity,Infinity,Infinity],high=[-Infinity,-Infinity,-Infinity];for(let i=0;i<a.length;i+=9)for(let k=0;k<3;k++){low[k]=Math.min(low[k],a[i+k]);high[k]=Math.max(high[k],a[i+k]);}for(const x of [low[0],high[0]])for(const y of [low[1],high[1]])for(const z of [low[2],high[2]])extrema.push([x,y,z]);}for(let i=0;i<m.instances.length;i+=16){const a=m.instances;for(const p of extrema){const w=[a[i]*p[0]+a[i+4]*p[1]+a[i+8]*p[2]+a[i+12],a[i+1]*p[0]+a[i+5]*p[1]+a[i+9]*p[2]+a[i+13],a[i+2]*p[0]+a[i+6]*p[1]+a[i+10]*p[2]+a[i+14]];assert(Math.hypot(...w.map((v,k)=>v-m.center[k]))<=m.radius+.05,'Native transformed prototype exceeds batch sphere '+m.id);}checked++;}}assert.equal(candidate.bytes,sumBytes(buffers(candidate)),'Native accounting');assert.equal(candidate.meta.counts.sunflowers,124002);assert(checked>0);const originalBytes=original?.bytes||report.reusedNativeEvidence.checks[0].result.sourceBytes;return {instancesChecked:checked,sunflowers:124002,originalBytes,candidateBytes:candidate.bytes,originalBytesSource:original?'current paired build':'retained original paired report',note:'Bounding-box corner bound is conservative; any failure is retained and needs actual-vertex attribution, not weakened silently.'};});
 }else report.notRun.push('Paired native region build/prototype/color/building/bounds checks');
 await check('frozen source retained through execution',()=>{const end=sha(read(SOURCE));assert.equal(end,sourceSHA,'Source changed during preflight');return {sourceSHA256:end};});
 report.notRun.push('WebGL visual acceptance','All-channel renderer cost and resources','Native unload/reentry and real interaction','Complete Node regression');report.CPUms=performance.now()-started;return report;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 assert.equal(Number(process.versions.node.split('.')[0]),22,'Use Node22');
 const option=n=>{const i=process.argv.indexOf(n);return i<0?undefined:process.argv[i+1];},root=resolve(option('--root')||fileURLToPath(new URL('../',import.meta.url))),output=option('--output');assert(output,'--output is required');assert(!fs.existsSync(output),'Preserve previous reports; choose a new output path');
 const inputs={},read=p=>{const b=fs.readFileSync(resolve(root,p));inputs[p]=sha(b);return b;},startUTC=new Date().toISOString(),start=performance.now();let report;
 try{const candidateOnly=process.argv.includes('--native-candidate-only'),nativeEvidence=candidateOnly?fs.readFileSync(option('--reuse-native-evidence')):undefined;report=await checkSunflowerEntry(read,{sourceSHA:option('--source-sha'),native:process.argv.includes('--native'),candidateOnly,nativeEvidence,nativeEvidenceSHA:option('--reuse-native-evidence-sha')});}catch(e){report={passed:false,checks:[],fatal:e.stack||String(e),nativeBuildsUnknown:true};}
 Object.assign(report,{checkerSHA256:sha(fs.readFileSync(fileURLToPath(import.meta.url))),node:process.version,startUTC,endUTC:new Date().toISOString(),elapsedWallMs:performance.now()-start,inputSHA256:inputs});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({output,passed:report.passed,checks:report.checks.map(c=>({name:c.name,passed:c.passed})),fatal:report.fatal,elapsedWallMs:report.elapsedWallMs}));if(!report.passed)process.exitCode=1;
}
