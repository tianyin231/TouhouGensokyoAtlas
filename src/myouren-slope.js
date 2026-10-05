/* P landscape: the two earth shoulders below Myouren's main platform.
 * Keep the authored stairs, platforms, trees and cemetery. The public near,
 * far and cut records are prepared together, before their first GPU upload.
 */
(function(G){'use strict';
const M=Math,revision=1,roi=Object.freeze([218,354,394,391]);
const terrainIds=Object.freeze([0,256].flatMap(x=>['',':far',':cut',':cut:far'].map(s=>'island:terrain:'+x+':256'+s)));
const wallId='island:inspection-walls',stoneId='overview:myouren:hlod:architecture:myouren:1:1:templeStone';
const detailStoneId='myouren:laid-stone-terrace-faces',detailShrubId='myouren:slope-shrubs';
// Retained native matrices, including the tree just outside the western edge.
const treeSites=Object.freeze([[230.314453125,359.1158752441406],[217.8450927734375,356.60345458984375],[222.86842346191406,366.99566650390625],[262.4426574707031,370.53851318359375],[272.57977294921875,372.4967041015625],[321.1407165527344,371.2571105957031]].map(Object.freeze));
const baseHeight=G.Terrain.prototype.height,baseNormal=G.Terrain.prototype.normal;
const clamp=x=>M.max(0,M.min(1,x)),smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
function weight(x,z){
 if(x<=218||x>=394||z<=354||z>=391||x>=288&&x<=312)return 0;
 return smooth(218,230,x)*(1-smooth(382,394,x))*smooth(12,22,M.abs(x-300))*smooth(362,368,z)*(1-smooth(382,386,z));
}
function earthWeight(x,z){
 let w=weight(x,z)*(1-smooth(380,384,z));if(!w)return 0;
 for(const p of treeSites)w*=smooth(6,11,M.hypot(x-p[0],z-p[1]));
 // The pond's stone margin and bridge keep their original supporting plane.
 w*=smooth(1.02,1.15,M.hypot((x-375)/19.4,(z-349)/24.9));return w;
}
function heightDelta(t,x,z,old){
 const w=earthWeight(x,z);if(!w)return 0;
 old??=baseHeight.call(t,x,z);
 const pondSide=smooth(342,354,x),toe=363+10.2*pondSide,low=82+8*pondSide;
 const u=clamp((z-toe)/(387-toe));
 // Broad convex shoulders, with a single shallow fold in each wing. No noise.
 const fold=(.75+.25*M.cos((x-232)*.064))*M.sin(M.PI*u)**2;
 const desired=low+(112-low)*smooth(0,1,u)+1.2*fold;
 return M.max(0,desired-old)*w;
}
function height(t,x,z){const h=baseHeight.call(t,x,z);return h+heightDelta(t,x,z,h);}
function normal(t,x,z){return G.norm([height(t,x-2,z)-height(t,x+2,z),4,height(t,x,z-2)-height(t,x,z+2)]);}
const turf=G.rgb('#758650'),earth=G.rgb('#97906a');
function color(x,z,old){const w=weight(x,z);if(!w)return old;
 const crest=smooth(373,385,z)*.17,shoulder=.10*(.5+.5*M.sin((x-223)*.045));
 const target=G.blend(turf,earth,crest+shoulder);return old.map((v,k)=>v+(target[k]-v)*w*.92);
}
// The source builder continues to receive the exact old field: only the two
// explicit detail records below change, not flags, lamps, buildings or graves.
G.Terrain.prototype.height=function(x,z){return height(this,x,z);};
const originalBuildMyouren=G.buildMyouren;
G.buildMyouren=function(t){const retained=Object.create(t);retained.height=(x,z)=>baseHeight.call(t,x,z);retained.normal=(x,z)=>baseNormal.call(retained,x,z);return originalBuildMyouren(retained);};

// Match the original HLOD indexer's 0.001 attribute identity as well as its
// 0.45 m position clustering; its shared vertices may inherit a prior color.
function triangleKey(a,ids,quantize=false){return ids.map(j=>Array.from(a.subarray(j*9,j*9+9),(v,k)=>M.round((quantize&&k<3?M.fround(M.round(v/.45)*.45):v)*1000)).join(',')).join(';');}
function facingKeys(t,quantize){
 const g=new G.Geometry(),stone=G.rgb('#979f95'),dark=G.rgb('#5b6966');
 for(let x=218;x<394;x+=2.7){if(M.abs(x-300)<10)continue;for(let row=0;row<7;row++){
  const y=106+row*.8;let left=363,right=391;for(let i=0;i<15;i++){const z=(left+right)/2;if(baseHeight.call(t,x,z)>y)right=z;else left=z;}
  g.box(x,y,(left+right)/2-.45,2.65,.765,1.1,G.blend(stone,dark,(row%3)*.06));
 }}
 const a=new Float32Array(g.a),keys=new Map();for(let i=0;i<a.length/9;i+=3){const key=triangleKey(a,[i,i+1,i+2],quantize);keys.set(key,(keys.get(key)||0)+1);}return keys;
}
function removeFacing(m,t){
 const a=m.vertices,ix=m.index,kept=[],keys=facingKeys(t,!!ix);let removed=0;
 for(let i=0;i<(ix?ix.length:a.length/9);i+=3){const ids=ix?[ix[i],ix[i+1],ix[i+2]]:[i,i+1,i+2];
  const key=triangleKey(a,ids),count=keys.get(key)||0;if(count){keys.set(key,count-1);removed++;continue;}
  if(ix)kept.push(...ids);else for(const j of ids)for(let k=0;k<9;k++)kept.push(a[j*9+k]);
 }
 if(removed!==4872)throw Error('Myouren front facing requires review: '+m.id+' / '+removed);
 return{mesh:ix?{...m,index:new ix.constructor(kept)}:{...m,vertices:new Float32Array(kept)},removed};
}
// Clip a complete interpolated vertex. Exterior pieces retain the original
// far triangle plane, preventing a 32 m face from moving land outside the ROI.
function clip(poly,axis,k,greater){const out=[];for(let i=0;i<poly.length;i++){
 const a=poly[i],b=poly[(i+1)%poly.length],A=greater?a[axis]>=k-1e-8:a[axis]<=k+1e-8,B=greater?b[axis]>=k-1e-8:b[axis]<=k+1e-8;
 if(A)out.push(a);if(A!==B){const u=(k-a[axis])/(b[axis]-a[axis]);out.push(a.map((v,j)=>v+(b[j]-v)*u));}
 }return out;}
function refineFar(m,t){
 const a=m.vertices,ix=m.index,vertices=[],indices=[],lookup=new Map();let changed=0;
 const emit=(p,change)=>{if(p.length<3)return;const ids=p.map(v=>{
  v=v.slice();if(change){const w=earthWeight(v[0],v[2]);if(w){v[1]+=w*(height(t,v[0],v[2])-v[1]);const n=normal(t,v[0],v[2]);for(let k=0;k<3;k++)v[3+k]+=w*(n[k]-v[3+k]);}const c=color(v[0],v[2],v.slice(6,9));for(let k=0;k<3;k++)v[6+k]=c[k];}
  const key=v.map(n=>M.fround(n)).join(',');let j=lookup.get(key);if(j===undefined){j=vertices.length/9;lookup.set(key,j);vertices.push(...v);}return j;
 });for(let j=1;j<ids.length-1;j++){const A=p[0],B=p[j],C=p[j+1];if(M.abs((B[0]-A[0])*(C[2]-A[2])-(B[2]-A[2])*(C[0]-A[0]))>1e-7)indices.push(ids[0],ids[j],ids[j+1]);}};
 for(let i=0;i<ix.length;i+=3){const p=[0,1,2].map(j=>Array.from(a.subarray(ix[i+j]*9,ix[i+j]*9+9)));
  if(M.max(...p.map(v=>v[0]))<=218||M.min(...p.map(v=>v[0]))>=394||M.max(...p.map(v=>v[2]))<=354||M.min(...p.map(v=>v[2]))>=391){emit(p,false);continue;}
  let inside=p;for(const [axis,k,greater]of[[0,218,true],[0,394,false],[2,354,true],[2,391,false]]){const outside=clip(inside,axis,k,!greater);emit(outside,false);inside=clip(inside,axis,k,greater);if(inside.length<3)break;}
  if(inside.length<3)continue;changed++;
  const x0=M.floor(M.min(...inside.map(v=>v[0]))/4)*4,x1=M.max(...inside.map(v=>v[0])),z0=M.floor(M.min(...inside.map(v=>v[2]))/4)*4,z1=M.max(...inside.map(v=>v[2]));
  for(let z=z0;z<z1;z+=4)for(let x=x0;x<x1;x+=4){let q=inside;for(const [axis,k,greater]of[[0,x,true],[0,x+4,false],[2,z,true],[2,z+4,false]]){q=clip(q,axis,k,greater);if(q.length<3)break;}emit(q,true);}
 }
 return{mesh:{...m,vertices:new Float32Array(vertices),index:new Uint32Array(indices)},changed};
}
const prepared=new WeakSet();
function prepare(data,pack){
 if(prepared.has(pack))return[];
 const selected=new Map(pack.meshes.filter(m=>terrainIds.includes(m.id)||m.id===wallId||m.id===stoneId).map(m=>[m.id,m]));
 if(selected.size!==10)throw Error('Myouren public slope sources require review');
 const t=new G.Terrain(data),replacements=new Map(),patches=[];let changedVertices=0,newBackingBytes=0,addedTriangles=0;
 for(const id of terrainIds){const m=selected.get(id);if(m.owner!=='island'||m.component!=='island-terrain'||m.material!=='ground'||!m.index||!m.globalSurface)throw Error('Invalid Myouren terrain '+id);
  if(m.globalFar){const r=refineFar(m,t);replacements.set(id,r.mesh);newBackingBytes+=r.mesh.vertices.byteLength+r.mesh.index.byteLength;addedTriangles+=(r.mesh.index.length-m.index.length)/3;continue;}
  const a=m.vertices;for(let i=0;i<a.length;i+=9){const x=a[i],z=a[i+2],d=heightDelta(t,x,z),c=color(x,z,Array.from(a.subarray(i+6,i+9)));if(!weight(x,z))continue;
   const n=d?normal(t,x,z):Array.from(a.subarray(i+3,i+6));patches.push({a,i,y:a[i+1]+d,n,c});changedVertices++;
  }
 }
 const wall=selected.get(wallId);for(let i=0;i<wall.vertices.length;i+=9){const a=wall.vertices;if(a[i+1]<0||a[i+2]!==378)continue;const d=heightDelta(t,a[i],a[i+2]);if(d)patches.push({a,i,y:a[i+1]+d});}
 const face=removeFacing(selected.get(stoneId),t);replacements.set(stoneId,face.mesh);newBackingBytes+=face.mesh.index.byteLength;
 if(newBackingBytes>614400||addedTriangles>4000)throw Error('Myouren public preparation exceeds reviewed budget');
 // Commit the bounded edits only after source identity and budget validation.
 for(const p of patches){p.a[p.i+1]=p.y;if(p.n)for(let k=0;k<3;k++){p.a[p.i+3+k]=p.n[k];p.a[p.i+6+k]=p.c[k];}}
 pack.meshes=pack.meshes.map(m=>replacements.get(m.id)||m);prepared.add(pack);
 data.myourenSlope={revision,changedVertices,publicPatchCount:patches.length,newBackingBytes,addedFarTriangles:addedTriangles,removedFacingTriangles:face.removed};return[];
}
function bytes(meshes){const buffers=new Set();for(const m of meshes)for(const k of['vertices','farVertices','instances','instanceColors','index'])if(m[k])buffers.add(m[k].buffer);return Array.from(buffers).reduce((n,b)=>n+b.byteLength,0);}
function applyDetail(data,pack){
 if(pack.meta?.myourenSlope?.revision===revision)return pack;
 const t=new G.Terrain(data);let facing=0,shrubs=0;
 const meshes=pack.meshes.map(m=>{if(m.id===detailStoneId){const r=removeFacing(m,t);facing=r.removed;return r.mesh;}
  if(m.id!==detailShrubId)return m;const a=m.vertices;for(let i=0;i<a.length;i+=9){const d=heightDelta(t,a[i],a[i+2]);if(d){a[i+1]+=d;shrubs++;}}return m;
 });if(!facing)throw Error('Myouren original front facing missing');
 return{...pack,meshes,bytes:bytes(meshes),meta:{...pack.meta,myourenSlope:{revision,removedFacingTriangles:facing,adjustedShrubVertices:shrubs,basis:'P'}}};
}
const originalBuildRegion=G.buildRegion;
G.buildRegion=async function(data,id,legacy){const p=await originalBuildRegion(data,id,legacy);return id==='myouren'?applyDetail(data,p):p;};
G.MYOUREN_SLOPE=Object.freeze({revision,roi,terrainIds,wallId,stoneId,detailStoneId,detailShrubId,treeSites,weight,earthWeight,heightDelta,baseHeight,prepare,applyDetail,originalBuildRegion});
G.extraOverviewBuilders=[...(G.extraOverviewBuilders||[]),prepare];
})(globalThis.GA);
