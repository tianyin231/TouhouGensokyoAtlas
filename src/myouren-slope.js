/* P landscape: the two earth shoulders below Myouren's main platform.
 * Keep the authored stairs, platforms, trees and cemetery. The public near,
 * far and cut records are prepared together, before their first GPU upload.
 */
(function(G){'use strict';
const M=Math,revision=2,roi=Object.freeze([218,354,394,391]),patchBounds=Object.freeze([220,356,392,388]);
const terrainIds=Object.freeze([0,256].flatMap(x=>['',':far',':cut',':cut:far'].map(s=>'island:terrain:'+x+':256'+s)));
const wallId='island:inspection-walls',stoneId='overview:myouren:hlod:architecture:myouren:1:1:templeStone';
const detailStoneId='myouren:laid-stone-terrace-faces',detailShrubId='myouren:slope-shrubs';
// Retained native matrices, including the tree just outside the western edge.
const treeSites=Object.freeze([[230.314453125,359.1158752441406],[217.8450927734375,356.60345458984375],[222.86842346191406,366.99566650390625],[262.4426574707031,370.53851318359375],[272.57977294921875,372.4967041015625],[321.1407165527344,371.2571105957031]].map(Object.freeze));
const baseHeight=G.Terrain.prototype.height,baseNormal=G.Terrain.prototype.normal;
const clamp=x=>M.max(0,M.min(1,x)),smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
function weight(x,z){
 if(x<=220||x>=392||z<=356||z>=388||x>=288&&x<=312)return 0;
 return smooth(220,228,x)*(1-smooth(384,392,x))*smooth(12,18,M.abs(x-300))*smooth(358,364,z)*(1-smooth(384,388,z));
}
function earthWeight(x,z){
 let w=weight(x,z)*(1-smooth(384,386,z));if(!w)return 0;
 for(const p of treeSites)w*=smooth(6,11,M.hypot(x-p[0],z-p[1]));
 // The pond's stone margin and bridge keep their original supporting plane.
 w*=smooth(1.02,1.15,M.hypot((x-375)/19.4,(z-349)/24.9));return w;
}
const shoulders=Object.freeze([
 [[224,375,380,381.5,104],[238,371.2,376.8,379.3,103.5],[251,373.2,379.1,381.4,106.5],[277,377.8,381.8,383.3,108.5]],
 [[323,372.8,378.5,380.5,104],[340,371.5,377.3,380,103.5],[360,373.4,379.1,382,106.5],[388,376.8,381.2,383.6,108]]
].map(s=>Object.freeze(s.map(Object.freeze))));
function section(x){const s=shoulders[x<300?0:1];let a=s[0],b=a;for(let i=1;i<s.length;i++){b=s[i];if(x<=b[0])break;a=b;}const u=clamp((x-a[0])/(b[0]-a[0]||1));return a.map((v,k)=>v+(b[k]-v)*u);}
function heightDelta(t,x,z,old){
 const w=earthWeight(x,z);if(!w)return 0;
 old??=baseHeight.call(t,x,z);
 const [,toe,lip,shelf,crest]=section(x);if(z<=toe)return 0;
 const low=baseHeight.call(t,x,toe);
 // Each wing is one connected rock shoulder: a sloping exposed face, an
 // unequal narrow shelf, then earth up to the unchanged platform foundation.
 let desired=z<lip?low+(crest-low)*(z-toe)/(lip-toe):z<shelf?crest+.15*(z-lip)/(shelf-lip):crest+.15+(baseHeight.call(t,x,386)-crest-.15)*smooth(shelf,386,z);
 return M.max(0,desired-old)*w;
}
function height(t,x,z){const h=baseHeight.call(t,x,z);return h+heightDelta(t,x,z,h);}
function normal(t,x,z){return G.norm([height(t,x-2,z)-height(t,x+2,z),4,height(t,x,z-2)-height(t,x,z+2)]);}
const turf=G.rgb('#7f8a66'),stone=G.rgb('#999b89');
function color(x,z,old,t){const w=weight(x,z);if(!w)return old;
 const [,toe,lip]=section(x),d=heightDelta(t,x,z),rock=smooth(.3,1.7,d)*smooth(toe,toe+.8,z)*(1-smooth(lip-.3,lip+1,z));
 const target=G.blend(turf,stone,rock);return old.map((v,k)=>v+(target[k]-v)*w*(.58+.4*rock));
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
  v=v.slice();if(change){const w=earthWeight(v[0],v[2]);if(w){v[1]+=w*(height(t,v[0],v[2])-v[1]);const n=normal(t,v[0],v[2]);for(let k=0;k<3;k++)v[3+k]+=w*(n[k]-v[3+k]);}const c=color(v[0],v[2],v.slice(6,9),t);for(let k=0;k<3;k++)v[6+k]=c[k];}
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
function sourceSampler(m){
 const a=m.vertices,ix=m.index,bins=new Map();
 for(let i=0;i<ix.length;i+=3){const q=[ix[i]*9,ix[i+1]*9,ix[i+2]*9],xs=q.map(j=>a[j]),zs=q.map(j=>a[j+2]);if(M.max(...xs)<218||M.min(...xs)>394||M.max(...zs)<354||M.min(...zs)>390)continue;
  const key=M.floor(xs.reduce((n,v)=>n+v,0)/12)+':'+M.floor(zs.reduce((n,v)=>n+v,0)/12);if(!bins.has(key))bins.set(key,[]);bins.get(key).push(q);
 }
 return(x,z)=>{const bx=M.floor(x/4),bz=M.floor(z/4);for(const [dx,dz]of[[0,0],[-1,0],[0,-1],[-1,-1],[1,0],[0,1]])for(const q of bins.get((bx+dx)+':'+(bz+dz))||[]){const [i,j,k]=q,d=(a[j+2]-a[k+2])*(a[i]-a[k])+(a[k]-a[j])*(a[i+2]-a[k+2]);if(M.abs(d)<1e-9)continue;
   const u=((a[j+2]-a[k+2])*(x-a[k])+(a[k]-a[j])*(z-a[k+2]))/d,v=((a[k+2]-a[i+2])*(x-a[k])+(a[i]-a[k])*(z-a[k+2]))/d,w=1-u-v;if(M.min(u,v,w)<-1e-6)continue;
   return Array.from({length:9},(_,n)=>u*a[i+n]+v*a[j+n]+w*a[k+n]);
  }throw Error('Myouren patch left its source surface: '+m.id+' / '+x+','+z);};
}
function rebuildNear(m,t){
 const a=m.vertices,ix=m.index,sample=sourceSampler(m),kept=[],vertices=[],indices=[],lookup=new Map();
 const inside=(x,z)=>x>220&&x<392&&z>356&&z<388&&(x<288||x>312);
 for(let i=0;i<ix.length;i+=3){const x=(a[ix[i]*9]+a[ix[i+1]*9]+a[ix[i+2]*9])/3,z=(a[ix[i]*9+2]+a[ix[i+1]*9+2]+a[ix[i+2]*9+2])/3;if(!inside(x,z))kept.push(ix[i],ix[i+1],ix[i+2]);}
 const point=(x,z)=>{const key=x+':'+z;if(lookup.has(key))return lookup.get(key);const v=sample(x,z),c=color(x,z,v.slice(6,9),t);v[0]=x;v[2]=z;v[1]+=heightDelta(t,x,z);for(let k=0;k<3;k++)v[k+6]=c[k];const id=vertices.length/9;vertices.push(...v);lookup.set(key,id);return id;};
 const x0=M.max(220,m.tile[0]),x1=M.min(392,m.tile[0]+256),zEnd=m.cutOnly?378:388;
 for(let z=356;z<zEnd;){const dz=m.cutOnly&&z>=376?1:2;for(let x=x0;x<x1;x+=2){if(x>=288&&x<312)continue;
   const A=point(x,z),B=point(x,z+dz),C=point(x+2,z),D=point(x+2,z+dz),zp=m.cutOnly&&z>=376?z-376:M.floor(z/2)%2;
   if(M.floor(x/2)%2===zp)indices.push(A,B,D,A,D,C);else indices.push(A,B,C,C,B,D);
  }z+=dz;}
 const sums=new Float64Array(vertices.length/3);for(let i=0;i<indices.length;i+=3){const ids=[indices[i],indices[i+1],indices[i+2]],p=ids.map(j=>vertices.slice(j*9,j*9+3)),n=G.cross(G.sub(p[1],p[0]),G.sub(p[2],p[0]));for(const j of ids)for(let k=0;k<3;k++)sums[j*3+k]+=n[k];}
 for(let i=0;i<vertices.length;i+=9){const x=vertices[i],z=vertices[i+2],d=M.min(x-220,392-x,z-356,zEnd-z,M.abs(x-300)-12),w=smooth(0,3,d),n=G.norm(Array.from(sums.subarray(i/3,i/3+3)));for(let k=0;k<3;k++)vertices[i+3+k]+=w*(n[k]-vertices[i+3+k]);}
 const patch={...m,id:m.id+':myouren-slope',vertices:new Float32Array(vertices),index:new Uint32Array(indices)};
 return{kept:new ix.constructor(kept),patch,addedTriangles:(kept.length+indices.length-ix.length)/3};
}
const prepared=new WeakSet();
function prepare(data,pack){
 if(prepared.has(pack))return[];
 const selected=new Map(pack.meshes.filter(m=>terrainIds.includes(m.id)||m.id===wallId||m.id===stoneId).map(m=>[m.id,m]));
 if(selected.size!==10)throw Error('Myouren public slope sources require review');
 const t=new G.Terrain(data),replacements=new Map(),patches=[],indexPatches=[],additions=[];let changedVertices=0,newBackingBytes=0,addedTriangles=0;
 for(const id of terrainIds){const m=selected.get(id);if(m.owner!=='island'||m.component!=='island-terrain'||m.material!=='ground'||!m.index||!m.globalSurface)throw Error('Invalid Myouren terrain '+id);
  if(m.globalFar){const r=refineFar(m,t);replacements.set(id,r.mesh);newBackingBytes+=r.mesh.vertices.byteLength+r.mesh.index.byteLength;addedTriangles+=(r.mesh.index.length-m.index.length)/3;continue;}
  const r=rebuildNear(m,t);indexPatches.push({a:m.index,next:r.kept});replacements.set(id,{...m,index:m.index.subarray(0,r.kept.length)});additions.push(r.patch);newBackingBytes+=r.patch.vertices.byteLength+r.patch.index.byteLength;addedTriangles+=r.addedTriangles;changedVertices+=r.patch.vertices.length/9;
 }
 const wall=selected.get(wallId);for(let i=0;i<wall.vertices.length;i+=9){const a=wall.vertices;if(a[i+1]<0||a[i+2]!==378)continue;const d=heightDelta(t,a[i],a[i+2]);if(d)patches.push({a,i,y:a[i+1]+d});}
 const stoneRecord=selected.get(stoneId),face=removeFacing(stoneRecord,t);indexPatches.push({a:stoneRecord.index,next:face.mesh.index});replacements.set(stoneId,{...stoneRecord,index:stoneRecord.index.subarray(0,face.mesh.index.length)});
 if(newBackingBytes>614400||addedTriangles-face.removed>4000)throw Error('Myouren public preparation exceeds reviewed budget');
 for(const p of indexPatches)for(const m of pack.meshes){const a=m.index;if(!a||a===p.a||a.buffer!==p.a.buffer)continue;if(a.byteOffset<p.a.byteOffset+p.a.byteLength&&a.byteOffset+a.byteLength>p.a.byteOffset)throw Error('Myouren mutable index view is shared: '+m.id);}
 // Commit the bounded edits only after source identity and budget validation.
 for(const p of patches){p.a[p.i+1]=p.y;if(p.n)for(let k=0;k<3;k++){p.a[p.i+3+k]=p.n[k];p.a[p.i+6+k]=p.c[k];}}
 for(const p of indexPatches)p.a.set(p.next);
 pack.meshes=pack.meshes.map(m=>replacements.get(m.id)||m).concat(additions);prepared.add(pack);
 data.myourenSlope={revision,changedVertices,publicPatchCount:patches.length,newBackingBytes,addedTerrainTriangles:addedTriangles,removedFacingTriangles:face.removed};return[];
}
function bytes(meshes){const buffers=new Set();for(const m of meshes)for(const k of['vertices','farVertices','instances','instanceColors','index'])if(m[k])buffers.add(m[k].buffer);return Array.from(buffers).reduce((n,b)=>n+b.byteLength,0);}
function applyDetail(data,pack){
 if(pack.meta?.myourenSlope?.revision===revision)return pack;
 const t=new G.Terrain(data);let facing=0,shrubs=0,shrubClumps=0;
 const meshes=pack.meshes.map(m=>{if(m.id===detailStoneId){const r=removeFacing(m,t);facing=r.removed;return r.mesh;}
  if(m.id!==detailShrubId)return m;const a=m.vertices;let prefix=0;
  for(const [za,x0,x1]of[[363,218,394],[307,249,349],[454,256,355]])for(let x=x0;x<x1;x+=2.7){if(M.abs(x-300)<10||M.abs(x-376)<6&&za>450)continue;if(M.round(x)%3===0)prefix+=4*168;}
  if((a.length/9-prefix)%126)throw Error('Myouren original shrub primitive layout changed');
  for(let at=0;at<a.length/9;){const count=at<prefix?168:126;let x=0,z=0;for(let j=0;j<count;j++){x+=a[(at+j)*9];z+=a[(at+j)*9+2];}const d=heightDelta(t,x/count,z/count);
   if(d){for(let j=0;j<count;j++)a[(at+j)*9+1]+=d;shrubs+=count;shrubClumps++;}at+=count;
  }return m;
 });if(!facing)throw Error('Myouren original front facing missing');
 return{...pack,meshes,bytes:bytes(meshes),meta:{...pack.meta,myourenSlope:{revision,removedFacingTriangles:facing,adjustedShrubVertices:shrubs,adjustedShrubClumps:shrubClumps,basis:'P'}}};
}
const originalBuildRegion=G.buildRegion;
G.buildRegion=async function(data,id,legacy){const p=await originalBuildRegion(data,id,legacy);return id==='myouren'?applyDetail(data,p):p;};
G.MYOUREN_SLOPE=Object.freeze({revision,roi,patchBounds,shoulders,terrainIds,wallId,stoneId,detailStoneId,detailShrubId,treeSites,weight,earthWeight,heightDelta,baseHeight,prepare,applyDetail,originalBuildRegion});
G.extraOverviewBuilders=[...(G.extraOverviewBuilders||[]),prepare];
})(globalThis.GA);
