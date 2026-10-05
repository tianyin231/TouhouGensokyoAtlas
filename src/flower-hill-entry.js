/* P: one complete eastern hill shoulder, connecting saddle and curved foot.
 * Original paths and plant XZ remain fixed. The accepted Sunflower contact is
 * an earlier, independent surface; this module never replaces its data.
 */
(function(G){'use strict';
const revision=1,scope=Object.freeze([-1280,960,-928,1376]);
const metadata=new WeakMap(),samplers=new WeakMap(),previousHeight=G.Terrain.prototype.height,originalBuildRegion=G.buildRegion;
const southBoundary=Object.freeze([[-1280,1376],[-1216,1376],[-1088,1344],[-1024,1312],[-928,1280]].map(Object.freeze));
const protectedPads=Object.freeze([{id:'nameless-windrock',x:-1251,z:987,w:9,d:10,blend:48}].map(Object.freeze));
const sections=Object.freeze([
 {x:-1280,routeZ:1102,height:191,crestZ:1030},
 {x:-1216,routeZ:1130,height:181.5,crestZ:1040},
 {x:-1169,routeZ:1137,height:169.05,crestZ:1047},
 {x:-1152,routeZ:1149.5,height:165.25,crestZ:1058},
 {x:-1120,routeZ:1167.5,height:158.3,crestZ:1074},
 {x:-1088,routeZ:1179.2,height:152,crestZ:1088},
 {x:-1056,routeZ:1188.6,height:146,crestZ:1100},
 {x:-1024,routeZ:1199.8,height:140,crestZ:1112},
 {x:-992,routeZ:1212.1,height:134,crestZ:1125},
 {x:-960,routeZ:1222.4,height:129,crestZ:1138},
 {x:-928,routeZ:1226.3,height:128.6,crestZ:1150}
].map(Object.freeze));
const paths=G.FLOWERLANDS.paths.map(p=>({id:p.id,region:p.region,width:p.width,points:p.points.map(q=>q.slice()),samples:p.samples.map(q=>q.slice())}));
const inside=(x,z)=>x>scope[0]&&x<scope[2]&&z>scope[1]&&z<scope[3];
const protectedAt=(x,z)=>protectedPads.some(p=>Math.abs(x-p.x)<=p.w/2&&Math.abs(z-p.z)<=p.d/2);
const cellKey=(x,z)=>Math.floor(x/32)+','+Math.floor(z/32);
function hermite(a,b,da,db,t,d){const t2=t*t,t3=t2*t;return(2*t3-3*t2+1)*a+(t3-2*t2+t)*d*da+(-2*t3+3*t2)*b+(t3-t2)*d*db;}
function row(x,key){let i=0;while(i<sections.length-2&&x>sections[i+1].x)i++;const a=sections[i],b=sections[i+1],p=sections[Math.max(0,i-1)],q=sections[Math.min(sections.length-1,i+2)];return hermite(a[key],b[key],(b[key]-p[key])/(b.x-p.x),(q[key]-a[key])/(q.x-a.x),G.clamp((x-a.x)/(b.x-a.x),0,1),b.x-a.x);}
function southAt(x){let i=0;while(i<southBoundary.length-2&&x>southBoundary[i+1][0])i++;const a=southBoundary[i],b=southBoundary[i+1];return G.mix(a[1],b[1],G.clamp((x-a[0])/(b[0]-a[0]),0,1));}
function profile(base,x,z){const old=base(x,z);if(!inside(x,z))return old;const end=southAt(x);if(z>=end)return old;
 const lateral=G.smooth(scope[0],-1216,x)*(1-G.smooth(-960,scope[2],x));if(!lateral)return old;
 const crest=row(x,'crestZ'),route=row(x,'routeZ'),roadY=row(x,'height'),crestY=roadY+5;
 const northY=base(x,scope[1]),southY=base(x,end),northSlope=(base(x,scope[1]+2)-base(x,scope[1]-2))/4,southSlope=(base(x,end+2)-base(x,end-2))/4;
 const routeSlope=-(roadY-southY)/(end-route)*.65;let target;
 if(z<crest)target=hermite(northY,crestY,northSlope,0,(z-scope[1])/(crest-scope[1]),crest-scope[1]);
 else if(z<route)target=hermite(crestY,roadY,0,routeSlope,(z-crest)/(route-crest),route-crest);
 else target=hermite(roadY,southY,routeSlope,southSlope,(z-route)/(end-route),end-route);
 let y=G.mix(old,target,lateral);
 for(const p of protectedPads){const d=Math.max(Math.abs(x-p.x)-p.w/2,Math.abs(z-p.z)-p.d/2);y=G.mix(old,y,G.smooth(0,p.blend,d));}
 return y;
}
const sampler=G.SUNFLOWER_ENTRY.sampler;
function contactHeight(data,x,z){const c=data?.flowerHillEntry?.contact;if(!c||!inside(x,z)||protectedAt(x,z))return null;let at=samplers.get(c);if(!at){at=sampler(c);samplers.set(c,at);}return at(x,z);}
G.Terrain.prototype.height=function(x,z){const y=contactHeight(this.manifest,x,z);return y===null?previousHeight.call(this,x,z):y;};
function positions(m,i){const a=m.vertices;return[0,1,2].map(k=>{const n=(m.index?m.index[i+k]:i+k)*9;return[a[n],a[n+1],a[n+2]];});}
function buffersOf(...roots){const seen=new Set(),out=new Set(),visit=o=>{if(!o||typeof o!=='object'||seen.has(o))return;seen.add(o);if(ArrayBuffer.isView(o)){out.add(o.buffer);return;}if(o instanceof Map||o instanceof Set){for(const v of o.values())visit(v);return;}for(const v of Object.values(o))visit(v);};for(const r of roots)visit(r);return out;}
function byteCount(...roots){return[...buffersOf(...roots)].reduce((n,b)=>n+b.byteLength,0);}
function bounds(m){const a=m.vertices,lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(let i=0;i<a.length;i+=9)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],a[i+k]);hi[k]=Math.max(hi[k],a[i+k]);}m.center=lo.map((v,k)=>(v+hi[k])/2);m.radius=G.length(G.sub(hi,lo))/2;}
function exclusive(pack,targets,keys){const all=[];for(const m of pack.meshes)for(const k of ['vertices','farVertices','index','instances','instanceColors'])if(m[k])all.push({m,k,a:m[k]});for(const m of targets)for(const k of keys){const a=m[k];if(!a)continue;for(const v of all){if(v.m===m&&v.k===k)continue;if(a.buffer===v.a.buffer&&v.a.byteOffset<a.byteOffset+a.byteLength&&v.a.byteOffset+v.a.byteLength>a.byteOffset)throw Error('Flower hill write view is shared: '+m.id+'/'+k+' with '+v.m.id+'/'+v.k);}}}
// Temporary immutable snapshots: earlier Solar faces must not be read back
// through a record while that same record is being replaced in this stage.
function snapshot(records){const bins=new Map();for(const m of records)for(let i=0;i<m.index.length;i+=3){const p=[0,1,2].map(k=>Array.from(m.vertices.subarray(m.index[i+k]*9,m.index[i+k]*9+9))),xs=p.map(v=>v[0]),zs=p.map(v=>v[2]);for(let X=Math.floor(Math.min(...xs)/32);X<=Math.floor(Math.max(...xs)/32);X++)for(let Z=Math.floor(Math.min(...zs)/32);Z<=Math.floor(Math.max(...zs)/32);Z++){const k=X+','+Z;if(!bins.has(k))bins.set(k,[]);bins.get(k).push(p);}}
 const at=(x,z)=>{for(const p of bins.get(cellKey(x,z))||[]){const q=interpolate(p,x,z);if(q)return q;}return null;};
 at.triangles=p=>{const out=new Set(),xs=p.map(a=>a[0]),zs=p.map(a=>a[2]);for(let X=Math.floor(Math.min(...xs)/32);X<=Math.floor(Math.max(...xs)/32);X++)for(let Z=Math.floor(Math.min(...zs)/32);Z<=Math.floor(Math.max(...zs)/32);Z++)for(const t of bins.get(X+','+Z)||[])out.add(t);return out;};return at;
}
function interpolate([a,b,c],x,z){const d=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]);if(Math.abs(d)<1e-9)return null;const u=((b[2]-c[2])*(x-c[0])+(c[0]-b[0])*(z-c[2]))/d,v=((c[2]-a[2])*(x-c[0])+(a[0]-c[0])*(z-c[2]))/d,w=1-u-v;return Math.min(u,v,w)>=-1e-6?a.map((q,k)=>u*q+v*b[k]+w*c[k]):null;}
function clipPlane(polygon,side){const out=[];for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length],u=side(a),v=side(b),ai=u>=-1e-8,bi=v>=-1e-8;if(ai)out.push(a);if(ai!==bi){const t=u/(u-v);out.push(a.map((q,k)=>q+(b[k]-q)*t));}}return out;}
function intersection(polygon,triangle){const[a,b,c]=triangle,sign=Math.sign((b[0]-a[0])*(c[2]-a[2])-(b[2]-a[2])*(c[0]-a[0]));let p=polygon;for(let i=0;i<3&&p.length;i++){const a=triangle[i],b=triangle[(i+1)%3];p=clipPlane(p,q=>sign*((b[0]-a[0])*(q[2]-a[2])-(b[2]-a[2])*(q[0]-a[0])));}return p;}
function edgeDistance(x,z,e){const dx=e[2]-e[0],dz=e[3]-e[1],t=G.clamp(((x-e[0])*dx+(z-e[1])*dz)/(dx*dx+dz*dz),0,1);return Math.hypot(x-e[0]-dx*t,z-e[1]-dz*t);}
function seamWeight(edges,x,z){let d=Infinity;for(const e of edges)d=Math.min(d,edgeDistance(x,z,e));return 1-G.smooth(0,32,d);}
function rigidColdParts(m){const a=m.vertices,count=a.length/27,parent=Array.from({length:count},(_,i)=>i),find=i=>parent[i]===i?i:parent[i]=find(parent[i]),join=(i,j)=>{parent[find(i)]=find(j);},points=new Map();
 for(let t=0;t<count;t++)for(let j=0;j<3;j++){const i=t*27+j*9,key=a[i]+','+a[i+1]+','+a[i+2];if(points.has(key))join(t,points.get(key));else points.set(key,t);}
 const groups=new Map();for(let t=0;t<count;t++){const k=find(t);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(t);}
 const parts=[...groups.values()].map(tris=>{const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(const t of tris)for(let j=0;j<3;j++)for(let k=0;k<3;k++){const v=a[t*27+j*9+k];lo[k]=Math.min(lo[k],v);hi[k]=Math.max(hi[k],v);}return{tris,lo,hi};});
 // Quantized body and moss cap may not share vertices. Their overlapping
// solids move together, preserving the complete original rock silhouette.
 for(let i=0;i<parts.length;i++)for(let j=i+1;j<parts.length;j++){const a=parts[i],b=parts[j];if(!a||!b)continue;if([0,2].every(k=>a.lo[k]<=b.hi[k]+.15&&a.hi[k]+.15>=b.lo[k])&&a.lo[1]<=b.hi[1]+.6&&a.hi[1]+.6>=b.lo[1]){a.tris.push(...b.tris);for(let k=0;k<3;k++){a.lo[k]=Math.min(a.lo[k],b.lo[k]);a.hi[k]=Math.max(a.hi[k],b.hi[k]);}parts[j]=null;j=i;}}
 return parts.filter(Boolean);
}
function prepare(data,pack){if(metadata.has(pack))return[];if(data.flowerHillEntry)throw Error('Flower hill contact prepared twice');if(!data.sunflowerEntry?.contact)throw Error('Flower hill requires the accepted Sunflower predecessor');
 const beforeBuffers=buffersOf(pack,data),solarContact=data.sunflowerEntry.contact,terrain=new G.Terrain(data),baseCache=new Map(),shapeCache=new Map();
 const base=(x,z)=>{const k=x+','+z;if(!baseCache.has(k))baseCache.set(k,previousHeight.call(terrain,x,z));return baseCache.get(k);},shape=(x,z)=>{const k=x+','+z;if(!shapeCache.has(k))shapeCache.set(k,profile(base,x,z));return shapeCache.get(k);};
 const selected=pack.meshes.filter(m=>m.component==='island-terrain'&&!m.cutOnly&&m.tile[0]<scope[2]&&m.tile[0]+m.tile[2]>scope[0]&&m.tile[1]<scope[3]&&m.tile[1]+m.tile[2]>scope[1]),near=selected.filter(m=>m.globalNear),far=selected.filter(m=>m.globalFar);
 if(near.length!==6||far.length!==6)throw Error('Flower hill terrain inventory changed');exclusive(pack,near,['vertices']);
 const oldNear=snapshot(near),oldFar=snapshot(far),supportKeys=new Set(),supportCells=new Set();
 for(const m of near)for(let i=0;i<m.index.length;i+=3){const p=positions(m,i),xs=p.map(q=>q[0]),zs=p.map(q=>q[2]);if(!protectedPads.some(q=>Math.min(...xs)<=q.x+q.w/2&&Math.max(...xs)>=q.x-q.w/2&&Math.min(...zs)<=q.z+q.d/2&&Math.max(...zs)>=q.z-q.d/2))continue;for(const v of p)supportKeys.add(v[0]+','+v[2]);supportCells.add(cellKey(xs.reduce((a,b)=>a+b,0)/3,zs.reduce((a,b)=>a+b,0)/3));}
 const active=new Set(),nearChanges=[];
 for(const m of near){const a=m.vertices,changed=new Set();for(let i=0;i<a.length;i+=9){const x=a[i],z=a[i+2];if(!inside(x,z)||supportKeys.has(x+','+z))continue;const y=shape(x,z);if(Math.abs(y-base(x,z))<1e-5)continue;a[i+1]=y;const n=G.norm([shape(x-1,z)-shape(x+1,z),2,shape(x,z-1)-shape(x,z+1)]);for(let k=0;k<3;k++)a[i+3+k]=n[k];changed.add(i/9);}
  if(changed.size){for(let i=0;i<m.index.length;i+=3){if(![0,1,2].some(k=>changed.has(m.index[i+k])))continue;const p=positions(m,i);active.add(cellKey(p.reduce((s,q)=>s+q[0],0)/3,p.reduce((s,q)=>s+q[2],0)/3));}bounds(m);nearChanges.push({id:m.id,changedVertices:changed.size});}
 }
 const seamEdges=[];for(const k of active){const [X,Z]=k.split(',').map(Number),x=X*32,z=Z*32;if(!active.has((X-1)+','+Z))seamEdges.push([x,z,x,z+32]);if(!active.has((X+1)+','+Z))seamEdges.push([x+32,z,x+32,z+32]);if(!active.has(X+','+(Z-1)))seamEdges.push([x,z,x+32,z]);if(!active.has(X+','+(Z+1)))seamEdges.push([x,z+32,x+32,z+32]);}
 const farChanges=[];
 for(const m of far){const n=near.find(n=>n.id+':far'===m.id),old=m.vertices,keep=[];let removed=0;for(let i=0;i<m.index.length;i+=3){const p=positions(m,i);if(active.has(cellKey(p.reduce((s,q)=>s+q[0],0)/3,p.reduce((s,q)=>s+q[2],0)/3))){removed++;continue;}keep.push(m.index[i],m.index[i+1],m.index[i+2]);}if(!removed)continue;
  const vertices=[],indices=[],oldMap=new Map(),newMap=new Map();for(const v of keep){if(!oldMap.has(v)){oldMap.set(v,vertices.length/9);for(let k=0;k<9;k++)vertices.push(old[v*9+k]);}indices.push(oldMap.get(v));}const retained=indices.length/3;
  const emit=(polygon,oldFace)=>{for(let j=1;j<polygon.length-1;j++){
   const tri=[polygon[0],polygon[j],polygon[j+1]].map(p=>{const a=p.slice(),w=seamWeight(seamEdges,a[0],a[2]);if(w>0){const oldN=oldNear(a[0],a[2]),oldF=oldFace?interpolate(oldFace,a[0],a[2]):oldFar(a[0],a[2]);if(!oldN||!oldF)throw Error('Flower hill missing original seam support');a[1]+=(oldF[1]-oldN[1])*w;for(let k=3;k<9;k++)a[k]=G.mix(a[k],oldF[k],w);}return a.map(Math.fround);});
   const[a,b,c]=tri;if(Math.abs((b[0]-a[0])*(c[2]-a[2])-(b[2]-a[2])*(c[0]-a[0]))<1e-7)continue;
   for(const a of tri){const k=a.join(',');if(!newMap.has(k)){newMap.set(k,vertices.length/9);vertices.push(...a);}indices.push(newMap.get(k));}
  }};
  for(let i=0;i<n.index.length;i+=3){const p=[0,1,2].map(k=>Array.from(n.vertices.subarray(n.index[i+k]*9,n.index[i+k]*9+9)));if(!active.has(cellKey(p.reduce((s,q)=>s+q[0],0)/3,p.reduce((s,q)=>s+q[2],0)/3)))continue;if(p.every(a=>seamWeight(seamEdges,a[0],a[2])===0)){emit(p);continue;}
   // A boundary triangle refines both original LOD planes. Split their zero
   // difference too, so tapering never reverses or enlarges the old LOD gap.
   for(const oldFace of oldFar.triangles(p)){const polygon=intersection(p,oldFace);if(polygon.length<3)continue;const difference=q=>interpolate(oldFace,q[0],q[2])[1]-oldNear(q[0],q[2])[1],ds=polygon.map(difference);if(Math.min(...ds)<-1e-8&&Math.max(...ds)>1e-8){emit(clipPlane(polygon,difference),oldFace);emit(clipPlane(polygon,q=>-difference(q)),oldFace);}else emit(polygon,oldFace);}
  }
  m.vertices=Float32Array.from(vertices);m.index=Uint32Array.from(indices);bounds(m);farChanges.push({id:m.id,removed,added:indices.length/3-retained});
 }
 const contactCells=new Set(active);for(const k of active){const [X,Z]=k.split(',').map(Number);for(let x=X-1;x<=X+1;x++)for(let z=Z-1;z<=Z+1;z++)contactCells.add(x+','+z);}
 const list=[];for(const m of near)for(let i=0;i<m.index.length;i+=3){const p=positions(m,i);if(contactCells.has(cellKey(p.reduce((s,q)=>s+q[0],0)/3,p.reduce((s,q)=>s+q[2],0)/3)))for(const q of p)list.push(...q);}
 const contact=Float32Array.from(list),surface=sampler(contact),ground=(x,z)=>{const y=inside(x,z)&&!protectedAt(x,z)?surface(x,z):null;return y===null?base(x,z):y;},delta=(x,z)=>ground(x,z)-base(x,z);
 const targets=pack.meshes.filter(m=>m.instances&&(m.globalSurface&&m.component==='transition-vegetation'||['sunflower','nameless'].includes(m.owner)&&m.overview)&&Array.from({length:m.instances.length/16},(_,i)=>i*16).some(i=>inside(m.instances[i+12],m.instances[i+14])&&Math.abs(delta(m.instances[i+12],m.instances[i+14]))>1e-5));exclusive(pack,targets,['instances']);
 const instances=[];for(const m of targets){let moved=0,maxDelta=0;for(let i=0;i<m.instances.length;i+=16){const d=delta(m.instances[i+12],m.instances[i+14]);if(Math.abs(d)<1e-5)continue;m.instances[i+13]+=d;moved++;maxDelta=Math.max(maxDelta,Math.abs(d));}if(moved){m.radius+=maxDelta;instances.push({id:m.id,moved,maxDelta});}}
 const coldTargets=pack.meshes.filter(m=>['sunflower','nameless'].includes(m.owner)&&m.overview&&!m.instances&&m.vertices&&m.component!=='terrain'&&m.group!=='terrain'&&m.vertices.some((x,i)=>i%9===0&&inside(x,m.vertices[i+2])&&Math.abs(delta(x,m.vertices[i+2]))>1e-5));exclusive(pack,coldTargets,['vertices']);
 const coldSurfaces=[],coldRigidParts=[];for(const m of coldTargets){const a=m.vertices;let changed=0,maxDelta=0;
  if(m.material==='matte'){for(const part of rigidColdParts(m)){if(!inside(part.lo[0],part.lo[2])||!inside(part.hi[0],part.hi[2]))continue;const x=(part.lo[0]+part.hi[0])/2,z=(part.lo[2]+part.hi[2])/2;if(protectedPads.some(p=>part.lo[0]<=p.x+p.w/2&&part.hi[0]>=p.x-p.w/2&&part.lo[2]<=p.z+p.d/2&&part.hi[2]>=p.z-p.d/2))continue;const d=delta(x,z);if(Math.abs(d)<1e-5)continue;for(const t of part.tris)for(let j=0;j<3;j++)a[t*27+j*9+1]+=d;changed+=part.tris.length*3;maxDelta=Math.max(maxDelta,Math.abs(d));coldRigidParts.push({id:m.id,triangles:part.tris,center:[x,z],deltaY:d,originalBounds:[part.lo,part.hi]});}}
  else for(let i=0;i<a.length;i+=9){const d=delta(a[i],a[i+2]);if(Math.abs(d)<1e-5)continue;a[i+1]+=d;changed++;maxDelta=Math.max(maxDelta,Math.abs(d));}
  if(changed){bounds(m);coldSurfaces.push({id:m.id,changedVertices:changed,maxDelta,rigid:m.material==='matte'});}
 }
 data.flowerHillEntry={revision,scope:scope.slice(),contact};if(data.sunflowerEntry.contact!==solarContact)throw Error('Flower hill changed the accepted Sunflower contact');
 const added=[...buffersOf(pack,data.flowerHillEntry)].filter(b=>!beforeBuffers.has(b)),sourceBytes=added.reduce((s,b)=>s+b.byteLength,0),farDelta=farChanges.reduce((s,m)=>s+m.added-m.removed,0);if(sourceBytes>.6*1048576)throw Error('Flower hill source budget exceeded: '+sourceBytes);if(farDelta>4000)throw Error('Flower hill triangle budget exceeded: '+farDelta);
 pack.bytes=byteCount(pack);metadata.set(pack,{revision,scope:scope.slice(),southBoundary,sections,protectedPads,protectedSupport:{vertices:supportKeys.size,cells:[...supportCells]},nearChanges,farChanges,activeCells:[...active],contactCells:[...contactCells],seam:{width:32,edges:seamEdges,weight:'1-smoothstep(0,32,distance-to-active-boundary)',height:'newNear + weight * (originalFar - originalNear)'},instances,coldSurfaces,coldRigidParts,sourceBytes,contactBytes:contact.byteLength,farDelta,newRecords:0,textureDelta:0});return[];
}
G.buildRegion=async function(data,id,legacy){const pack=await originalBuildRegion(data,id,legacy);if(['sunflower','nameless'].includes(id)&&data.flowerHillEntry)pack.meta.flowerHillEntry={revision,scope:scope.slice(),ground:'independent shared contact, chained after the accepted Sunflower surface',pathsXZ:'original'};return pack;};
(G.extraOverviewBuilders??=[]).push((data,pack)=>prepare(data,pack));
G.FLOWER_HILL_ENTRY=Object.freeze({revision,scope,southBoundary,protectedPads,sections,paths,prepare,metadata,sampler,profile,previousHeight,contactHeight,originalBuildRegion,byteCount,seamWeight});
})(globalThis.GA);
