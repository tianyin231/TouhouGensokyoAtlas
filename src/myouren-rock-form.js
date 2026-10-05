/* 命莲寺前坡：闭合岩土控制网试作，P 工程补完。
 * Large, deliberately uneven shoulders carry the retained platform. Existing
 * terrain, stairs, trees and underground records are not deformed. One stone
 * color is intentional: this pass is for judging actual mass and silhouette.
 */
(function(G){'use strict';
const revision=1,cutZ=378,color=G.rgb('#999789');
const scope=Object.freeze({x0:218,x1:394,z0:354,z1:391,stairBand:[288,312],cutZ});
const treeSites=Object.freeze([
 [230.314453125,81.8342437744,359.1158752441406],
 [217.8450927734375,81.8861923218,356.60345458984375],
 [222.86842346191406,83.4708480835,366.99566650390625],
 [262.4426574707031,87.1783370972,370.53851318359375],
 [272.57977294921875,89.9418487549,372.4967041015625],
 [321.1407165527344,88.2888717651,371.2571105957031]
]);
const stoneSources=Object.freeze({overview:'overview:myouren:hlod:architecture:myouren:1:1:templeStone',detail:'myouren:laid-stone-terrace-faces',removedTriangles:4872});
// x, buried toe z, ledge rise above the toe's ground, ledge depth, upper nose z.
// Close station pairs form two broad faults, rather than a pile of small rocks.
const bodies=Object.freeze([
 {bodyId:'west',floor:77,stations:[
  [218.4,376.2,7.3,4.2,384.5], [226,374.3,8.8,4.1,383.4],
  [237.2,363.8,12.8,5.8,380.4], [246.5,365.3,13.5,5.2,380.9],
  [249.1,370.6,10.8,4.4,383.5], [258.2,375.3,9.8,4.0,383.9],
  [273.5,377.6,7.3,3.8,384.5], [281.6,375.8,10.1,4.3,383.0],
  [286.5,382.6,4.2,2.4,386.5]
 ]},
 {bodyId:'east',floor:77,stations:[
  [313.5,382.3,4.4,2.6,386.3], [321.8,378.1,7.8,3.7,384.3],
  [334.2,365.8,13.7,5.7,380.8], [343.5,368.4,12.8,5.0,381.3],
  [346.1,374.1,9.7,4.1,384.1], [358.7,374.0,11.3,4.3,381.7],
  [373.9,374.6,12.7,4.0,382.0], [383.6,375.2,10.5,4.4,382.9],
  [391.7,379.0,9.1,3.5,384.0], [393.6,382.7,5.4,2.4,386.4]
 ]}
]);
const f32=p=>p.map(Math.fround),key=p=>p.join(','),cross=(a,b,c)=>G.cross(G.sub(b,a),G.sub(c,a));
function columnsFor(body,t){
 return body.stations.map(([x,z,rise,depth,nose],i)=>{
  const ground=t.height(x,z),ledge=Math.min(108.4,ground+rise);
  const profile=[
   [z,ground-1.5], [z+.9,Math.min(109.1,ground+2.5)],
   [z+2.0,ledge], [z+depth,Math.min(109.1,ledge+.5)],
   [Math.max(nose,z+depth+1.0),111.45], [389.45,111.72]
  ];
  // End caps meet the retained hillside below its surface, so the large form
  // reads as an outcrop rather than an isolated object planted on top of it.
  if(i===0||i===body.stations.length-1)
   for(const p of profile)p[1]=Math.min(p[1],t.height(x,p[0])-.35);
  return {x,top:profile.map(([zz,y])=>f32([x,y,zz])),bottom:profile.map(([zz])=>f32([x,body.floor,zz]))};
 });
}
function solidFaces(columns){
 const out=[],n=columns.length,R=columns[0].top.length;
 const tri=(a,b,c)=>{if(G.length(cross(a,b,c))<1e-7)throw Error('Degenerate rock control face');out.push([a,b,c]);};
 const quad=(a,b,c,d)=>{tri(a,b,c);tri(a,c,d);};
 for(let i=0;i<n-1;i++){
  const a=columns[i],b=columns[i+1];
  for(let r=0;r<R-1;r++){
   quad(a.top[r],a.top[r+1],b.top[r+1],b.top[r]);
   quad(a.bottom[r],b.bottom[r],b.bottom[r+1],a.bottom[r+1]);
  }
  quad(a.top[0],b.top[0],b.bottom[0],a.bottom[0]);
  quad(b.top[R-1],a.top[R-1],a.bottom[R-1],b.bottom[R-1]);
 }
 for(let r=0;r<R-1;r++){
  quad(columns[0].top[r+1],columns[0].top[r],columns[0].bottom[r],columns[0].bottom[r+1]);
  quad(columns[n-1].top[r],columns[n-1].top[r+1],columns[n-1].bottom[r+1],columns[n-1].bottom[r]);
 }
 return out;
}
// Keep z <= the existing inspection wall and cap its real intersection loop.
// Shared-edge intersections are cached, then rounded once to the stored Float32
// positions; split hard normals do not create cracks or near/far differences.
function cutSolid(faces){
 const intersections=new Map(),clipped=[];
 const intersection=(a,b)=>{
  let A=a,B=b;if(key(A)>key(B))[A,B]=[B,A];const id=key(A)+'|'+key(B);
  if(!intersections.has(id)){const u=(cutZ-A[2])/(B[2]-A[2]);intersections.set(id,f32([A[0]+(B[0]-A[0])*u,A[1]+(B[1]-A[1])*u,cutZ]));}
  return intersections.get(id);
 };
 for(const face of faces){
  const poly=[];
  for(let i=0;i<3;i++){const a=face[i],b=face[(i+1)%3],A=a[2]<=cutZ,B=b[2]<=cutZ;if(A)poly.push(a);if(A!==B)poly.push(intersection(a,b));}
  const clean=poly.filter((p,i)=>key(p)!==key(poly[(i+poly.length-1)%poly.length]));
  for(let i=1;i<clean.length-1;i++)if(G.length(cross(clean[0],clean[i],clean[i+1]))>1e-7)clipped.push([clean[0],clean[i],clean[i+1]]);
 }
 const edges=new Map();
 for(const face of clipped)for(let i=0;i<3;i++){
  const a=face[i],b=face[(i+1)%3];if(a[2]!==cutZ||b[2]!==cutZ)continue;
  const A=key(a),B=key(b),id=A<B?A+'|'+B:B+'|'+A;
  if(edges.has(id))edges.delete(id);else edges.set(id,[b,a]);
 }
 const next=new Map([...edges.values()].map(e=>[key(e[0]),e[1]]));
 while(next.size){
  const start=next.keys().next().value,loop=[],seen=new Set();let at=start;
  do{if(seen.has(at)||!next.has(at))throw Error('Open rock inspection cap');seen.add(at);loop.push(at.split(',').map(Number));const to=next.get(at);next.delete(at);at=key(to);}while(at!==start);
  const area=loop.reduce((s,p,i)=>{const q=loop[(i+1)%loop.length];return s+p[0]*q[1]-q[0]*p[1];},0);
  if(area<=0)throw Error('Inverted rock inspection loop');
  clipped.push(...triangulateCap(loop));
 }
 return clipped;
}
function triangulateCap(loop){
 const out=[],p=loop.slice(),orient=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 let guard=0;
 while(p.length>3){
  let found=false;
  for(let i=0;i<p.length;i++){
   const a=p[(i+p.length-1)%p.length],b=p[i],c=p[(i+1)%p.length];if(orient(a,b,c)<=1e-7)continue;
   if(p.some(q=>q!==a&&q!==b&&q!==c&&orient(a,b,q)>=-1e-7&&orient(b,c,q)>=-1e-7&&orient(c,a,q)>=-1e-7))continue;
   out.push([a,b,c]);p.splice(i,1);found=true;break;
  }
  if(!found||guard++>loop.length*2)throw Error('Rock inspection cap triangulation failed');
 }
 if(orient(...p)<=1e-7)throw Error('Degenerate rock inspection cap');out.push(p);return out;
}
function record(bodyId,variant,faces){
 const g=new G.Geometry();for(const [a,b,c]of faces)g.tri(a,b,c,color);
 return g.mesh('island:myouren-rock-form:'+bodyId+':'+variant,'architecture',{
  owner:'island',region:'island',space:'surface',overview:true,globalSurface:true,
  component:'transition-fields',material:'cave',basis:'P',bodyId,variant,
  rockFormRevision:revision,controlTopology:'closed-swept-hard-faces',lodPolicy:'shared-near-far',
  ...(variant==='normal'?{cutReplace:true}:{cutOnly:true}),
  parts:[{bodyId,firstTriangle:0,triangleCount:faces.length}]
 });
}
function buildBodies(t){
 const built=bodies.map(body=>{const columns=columnsFor(body,t),faces=solidFaces(columns),cutFaces=cutSolid(faces);
  return {bodyId:body.bodyId,columns,normal:record(body.bodyId,'normal',faces),cut:record(body.bodyId,'cut',cutFaces)};
 });
 return {bodies:built,meshes:built.flatMap(b=>[b.normal,b.cut])};
}
// This matcher reproduces only the retained source builder's front brick band,
// including HLOD quantization. No bounding-box crop can eat platform or stairs.
function triangleKey(a,ids,quantize=false){return ids.map(j=>Array.from(a.subarray(j*9,j*9+9),(v,k)=>Math.round((quantize&&k<3?Math.fround(Math.round(v/.45)*.45):v)*1000)).join(',')).join(';');}
function facingKeys(t,quantize){
 const g=new G.Geometry(),stone=G.rgb('#979f95'),dark=G.rgb('#5b6966');
 for(let x=218;x<394;x+=2.7){if(Math.abs(x-300)<10)continue;for(let row=0;row<7;row++){
  const y=106+row*.8;let left=363,right=391;for(let i=0;i<15;i++){const z=(left+right)/2;if(t.height(x,z)>y)right=z;else left=z;}
  g.box(x,y,(left+right)/2-.45,2.65,.765,1.1,G.blend(stone,dark,(row%3)*.06));
 }}
 const a=new Float32Array(g.a),keys=new Map();for(let i=0;i<a.length/9;i+=3){const k=triangleKey(a,[i,i+1,i+2],quantize);keys.set(k,(keys.get(k)||0)+1);}return keys;
}
function removeFacing(m,t){
 const a=m.vertices,ix=m.index,kept=[],keys=facingKeys(t,!!ix);let removed=0;
 for(let i=0;i<(ix?ix.length:a.length/9);i+=3){const ids=ix?[ix[i],ix[i+1],ix[i+2]]:[i,i+1,i+2],k=triangleKey(a,ids),count=keys.get(k)||0;
  if(count){keys.set(k,count-1);removed++;continue;}
  if(ix)kept.push(...ids);else for(const j of ids)for(let k=0;k<9;k++)kept.push(a[j*9+k]);
 }
 if(removed!==stoneSources.removedTriangles)throw Error('Myouren facing identity requires review: '+m.id+' / '+removed);
 return ix?{...m,index:new ix.constructor(kept)}:{...m,vertices:new Float32Array(kept)};
}
const prepared=new WeakSet();
function prepare(data,pack){
 if(prepared.has(pack))return[];
 const stone=pack.meshes.find(m=>m.id===stoneSources.overview);if(!stone)throw Error('Missing Myouren overview stone source');
 const t=new G.Terrain(data),nextStone=removeFacing(stone,t),form=buildBodies(t);
 // The app captures the old push receiver before running overview hooks.
 // Publish the replacement and new records together, and return no additions.
 pack.meshes=pack.meshes.map(m=>m===stone?nextStone:m).concat(form.meshes);
 prepared.add(pack);return[];
}
function applyDetail(data,pack){
 if(pack.meta?.myourenRockForm===revision)return pack;
 const stone=pack.meshes.find(m=>m.id===stoneSources.detail);if(!stone)throw Error('Missing Myouren detail stone source');
 const next=removeFacing(stone,new G.Terrain(data));
 return {...pack,meshes:pack.meshes.map(m=>m===stone?next:m),meta:{...pack.meta,myourenRockForm:revision}};
}
const originalBuildRegion=G.buildRegion;
G.buildRegion=async function(data,id,legacy){
 if(id!=='myouren')return originalBuildRegion(data,id,legacy);
 const start=performance.now(),out=applyDetail(data,await originalBuildRegion(data,id,legacy));out.builtMs=performance.now()-start;return out;
};
G.MYOUREN_ROCK_FORM=Object.freeze({revision,scope,treeSites,bodies,stoneSources,columnsFor,solidFaces,cutSolid,buildBodies,prepare,applyDetail,originalBuildRegion,removeFacing});
G.extraOverviewBuilders=[...(G.extraOverviewBuilders||[]),prepare];
})(globalThis.GA);
