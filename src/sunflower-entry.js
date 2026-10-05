/* P: northern sunflower foothill and its public approach.
 * Replace the original surface in place; no decorative cover, new plants or
 * textures. Native flower paths keep their XY topology and original plant IDs.
 */
(function(G){'use strict';
const revision=1,scope=Object.freeze([-896,704,-192,1152]),metadata=new WeakMap(),samplers=new WeakMap();
const BaseHeight=G.Terrain.prototype.height,originalBuildRegion=G.buildRegion;
const originalRoute=G.ISLAND.allRoutes.find(r=>r.id==='route-flower');
const sourceRoute={...originalRoute,points:originalRoute.points.map(p=>p.slice()),samples:originalRoute.samples.map(p=>p.slice())};
const routeStart=sourceRoute.samples.findIndex(p=>p[1]>=704),routeAnchor=sourceRoute.samples[routeStart];
const approachControls=Object.freeze([routeAnchor,[-425,780],[-460,830],[-470,870],[-435,901],[-390,920]].map(p=>Object.freeze(p.slice())));
const approach=G.spline(approachControls,4),routeSamples=[...sourceRoute.samples.slice(0,routeStart),...approach];
const roadIDs=Object.freeze(['island:routes:connections:-1:1','island:routes:connections:-1:1:shoulder']);
const sections=Object.freeze([
 {x:-896,toe:848,shoulder:1040,inner:1144,height:137},
 {x:-800,toe:810,shoulder:1024,inner:1120,height:131},
 {x:-744,toe:752,shoulder:1008,inner:1104,height:127},
 {x:-680,toe:720,shoulder:984,inner:1088,height:119},
 {x:-560,toe:704,shoulder:980,inner:1088,height:111},
 {x:-440,toe:704,shoulder:1008,inner:1104,height:106},
 {x:-320,toe:760,shoulder:1080,inner:1144,height:122},
 {x:-192,toe:968,shoulder:1136,inner:1152,height:122}
].map(Object.freeze));
const protectedPads=Object.freeze([{id:'sun-ridge-rest',x:-748,z:1024,w:15,d:13,blend:52},{id:'sun-parasol',x:-590,z:1126,w:8,d:8,blend:24}].map(Object.freeze));
const inside=(x,z)=>x>=scope[0]&&x<=scope[2]&&z>=scope[1]&&z<=scope[3];
const cellKey=(x,z)=>Math.floor(x/32)+','+Math.floor(z/32);
const lerp=G.mix,clamp=G.clamp;
function hermite(y0,y1,m0,m1,t,d){const t2=t*t,t3=t2*t;return(2*t3-3*t2+1)*y0+(t3-2*t2+t)*d*m0+(-2*t3+3*t2)*y1+(t3-t2)*d*m1;}
function foothillRise(t){const a=.12,b=.16,k=1/(1-(a+b)/2);return t<a?k*t*t/(2*a):t>1-b?1-k*(1-t)*(1-t)/(2*b):k*(t-a/2);}
function rowValue(x,key){let i=0;while(i<sections.length-2&&x>sections[i+1].x)i++;const a=sections[i],b=sections[i+1],p=sections[Math.max(0,i-1)],q=sections[Math.min(sections.length-1,i+2)],d=b.x-a.x,t=clamp((x-a.x)/d,0,1);return hermite(a[key],b[key],(b[key]-p[key])/(b.x-p.x),(q[key]-a[key])/(q.x-a.x),t,d);}
function padWeight(x,z,p){return 1-G.smooth(0,p.blend,Math.max(Math.abs(x-p.x)-p.w/2,Math.abs(z-p.z)-p.d/2));}
function protectedAt(x,z){return protectedPads.some(p=>Math.abs(x-p.x)<=p.w/2&&Math.abs(z-p.z)<=p.d/2);}
function profile(base,x,z){const old=base(x,z);if(!inside(x,z))return old;
 const toe=rowValue(x,'toe'),crest=rowValue(x,'shoulder'),end=Math.min(scope[3],rowValue(x,'inner'));
 if(z<=toe||z>=end)return old;
 const lateral=G.smooth(scope[0],-804,x)*(1-G.smooth(-320,scope[2],x));if(lateral<=0)return old;
 const y0=base(x,toe),y1=rowValue(x,'height'),y2=base(x,end),m2=(base(x,end+2)-base(x,end-2))/4;
 let y=z<=crest?lerp(y0,y1,foothillRise((z-toe)/(crest-toe))):hermite(y1,y2,0,m2,(z-crest)/(end-crest),end-crest);
 y=lerp(old,y,lateral);
 for(const p of protectedPads)y=lerp(y,old,padWeight(x,z,p));
 return y;
}
function triangleAt(a,x,z){const x0=a[0],z0=a[2],x1=a[3],z1=a[5],x2=a[6],z2=a[8],d=(z1-z2)*(x0-x2)+(x2-x1)*(z0-z2);if(Math.abs(d)<1e-9)return null;const u=((z1-z2)*(x-x2)+(x2-x1)*(z-z2))/d,v=((z2-z0)*(x-x2)+(x0-x2)*(z-z2))/d,w=1-u-v;return Math.min(u,v,w)<-1e-6?null:u*a[1]+v*a[4]+w*a[7];}
function sampler(contact){const bins=new Map();for(let i=0;i<contact.length;i+=9){const a=contact.subarray(i,i+9),xs=[a[0],a[3],a[6]],zs=[a[2],a[5],a[8]];for(let x=Math.floor(Math.min(...xs)/16);x<=Math.floor(Math.max(...xs)/16);x++)for(let z=Math.floor(Math.min(...zs)/16);z<=Math.floor(Math.max(...zs)/16);z++){const k=x+','+z;if(!bins.has(k))bins.set(k,[]);bins.get(k).push(i);}}
 return(x,z)=>{for(const i of bins.get(Math.floor(x/16)+','+Math.floor(z/16))||[]){const y=triangleAt(contact.subarray(i,i+9),x,z);if(y!==null)return y;}return null;};
}
function contactHeight(data,x,z){const c=data?.sunflowerEntry?.contact;if(!c||!inside(x,z)||protectedAt(x,z))return null;let h=samplers.get(c);if(!h){h=sampler(c);samplers.set(c,h);}return h(x,z);}
G.Terrain.prototype.height=function(x,z){const y=contactHeight(this.manifest,x,z);return y===null?BaseHeight.call(this,x,z):y;};
function positions(m,i){const ix=m.index,a=m.vertices;return[0,1,2].map(k=>Array.from(a.subarray((ix?ix[i+k]:i+k)*9,(ix?ix[i+k]:i+k)*9+3)));}
function meshSampler(records){const bins=new Map();for(const m of records)for(let i=0;i<m.index.length;i+=3){const p=positions(m,i),xs=p.map(q=>q[0]),zs=p.map(q=>q[2]);for(let x=Math.floor(Math.min(...xs)/32);x<=Math.floor(Math.max(...xs)/32);x++)for(let z=Math.floor(Math.min(...zs)/32);z<=Math.floor(Math.max(...zs)/32);z++){const k=x+','+z;if(!bins.has(k))bins.set(k,[]);bins.get(k).push({m,i});}}return(x,z)=>{for(const {m,i}of bins.get(cellKey(x,z))||[]){const h=triangleAt(positions(m,i).flat(),x,z);if(h!==null)return h;}return null;};}
function triKey(ps){return ps.map(p=>p.map(Math.fround).join(',')).sort().join('|');}
function byteCount(meshes,extra=[]){const buffers=new Set();for(const m of meshes)for(const k of ['vertices','farVertices','index','instances','instanceColors'])if(m[k])buffers.add(m[k].buffer);for(const a of extra)if(a)buffers.add(a.buffer);return[...buffers].reduce((n,b)=>n+b.byteLength,0);}
function rebuildBounds(m){const a=m.vertices,lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(let i=0;i<a.length;i+=9)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],a[i+k]);hi[k]=Math.max(hi[k],a[i+k]);}m.center=lo.map((v,k)=>(v+hi[k])/2);m.radius=G.length(G.sub(hi,lo))/2;}
function growInstanceBounds(m,dy){m.radius+=Math.abs(dy);}
function exclusive(pack,targets,keys=['vertices','index']){const all=[];for(const m of pack.meshes)for(const k of ['vertices','farVertices','index','instances','instanceColors'])if(m[k])all.push({m,k,a:m[k]});for(const m of targets)for(const k of keys){const a=m[k];if(!a)continue;for(const v of all){if(v.m===m&&v.k===k)continue;if(v.a.buffer===a.buffer&&v.a.byteOffset<a.byteOffset+a.byteLength&&v.a.byteOffset+v.a.byteLength>a.byteOffset)throw Error('Sunflower source view is shared: '+m.id+'/'+k+' with '+v.m.id+'/'+v.k);}}}
function updateRouteMetadata(){for(const r of [G.routes.find(r=>r.id==='route-flower'),G.ISLAND.allRoutes.find(r=>r.id==='route-flower')]){r.samples=routeSamples.map(p=>p.slice());r.points=[...sourceRoute.points.slice(0,-1),...approachControls.map(p=>p.slice())];r.note='P：保留村里与花田端点，北外坡末段沿缓坡绕行。';}}
function roadGeometry(samples,height,start=0){const road=new G.Geometry(),shoulder=new G.Geometry();for(let i=start;i<samples.length-1;i++){
 const a=samples[i],b=samples[i+1],prev=samples[Math.max(0,i-1)],next=samples[Math.min(samples.length-1,i+2)],normal=(p,q)=>{const dx=q[0]-p[0],dz=q[1]-p[1],l=Math.hypot(dx,dz)||1;return[-dz/l,dx/l];},na=normal(prev,b),nb=normal(a,next),point=(p,n,s)=>{const x=p[0]+n[0]*s,z=p[1]+n[1]*s;return[x,height(x,z)+.13,z];};
 road.quad(point(a,na,-2),point(a,na,2),point(b,nb,2),point(b,nb,-2),G.rgb('#9e946f'));
 for(const side of[-1,1])shoulder.quad(point(a,na,side*2),point(a,na,side*4.5),point(b,nb,side*4.5),point(b,nb,side*2),G.rgb('#839063'));
 }return[road,shoulder];}
function replaceRoad(pack,base,height){const original=roadGeometry(sourceRoute.samples,base,routeStart-1),replacement=roadGeometry(routeSamples,height,routeStart-1),changes=[];
 for(let k=0;k<2;k++){const m=pack.meshes.find(m=>m.id===roadIDs[k]);if(!m)throw Error('Missing public sunflower approach: '+roadIDs[k]);const keys=new Set();for(let i=0;i<original[k].a.length;i+=27)keys.add(triKey([0,1,2].map(j=>original[k].a.slice(i+j*9,i+j*9+3))));
 const keep=[],a=m.vertices,ix=m.index;let removed=0;for(let i=0;i<ix.length;i+=3){if(keys.has(triKey(positions(m,i)))){removed++;continue;}keep.push(ix[i],ix[i+1],ix[i+2]);}
 if(removed!==original[k].a.length/27)throw Error('Public approach exact source mismatch '+m.id+': '+removed+'/'+original[k].a.length/27);
 const keptVertices=[],oldMap=new Map(),keptIndices=[];for(const v of keep){if(!oldMap.has(v)){oldMap.set(v,keptVertices.length/9);for(let j=0;j<9;j++)keptVertices.push(a[v*9+j]);}keptIndices.push(oldMap.get(v));}
 const verts=new Float32Array(keptVertices.length+replacement[k].a.length);verts.set(keptVertices);verts.set(replacement[k].a,keptVertices.length);const idx=new Uint32Array(keep.length+replacement[k].a.length/9);idx.set(keptIndices);for(let i=keep.length;i<idx.length;i++)idx[i]=keptVertices.length/9+i-keep.length;
 m.vertices=verts;m.index=idx;rebuildBounds(m);changes.push({id:m.id,removed,added:replacement[k].a.length/27});
 }return changes;}
function prepare(data,pack){if(metadata.has(pack))return[];if(data.sunflowerEntry)throw Error('Sunflower entry contact prepared twice');
 const sourceBuffers=new Set();for(const m of pack.meshes)for(const k of ['vertices','farVertices','index','instances','instanceColors'])if(m[k])sourceBuffers.add(m[k].buffer);
 const terrain=new G.Terrain(data),baseCache=new Map(),heightCache=new Map(),base=(x,z)=>{const k=x+','+z;if(!baseCache.has(k))baseCache.set(k,BaseHeight.call(terrain,x,z));return baseCache.get(k);},height=(x,z)=>{const k=x+','+z;if(!heightCache.has(k))heightCache.set(k,profile(base,x,z));return heightCache.get(k);};
 const selected=pack.meshes.filter(m=>m.component==='island-terrain'&&!m.cutOnly&&m.tile[0]<scope[2]&&m.tile[0]+m.tile[2]>scope[0]&&m.tile[1]<scope[3]&&m.tile[1]+m.tile[2]>scope[1]);
 const near=selected.filter(m=>m.globalNear),far=selected.filter(m=>m.globalFar);if(near.length!==12||far.length!==12)throw Error('Sunflower terrain record inventory changed');
 exclusive(pack,[...selected,...pack.meshes.filter(m=>roadIDs.includes(m.id))]);
 exclusive(pack,pack.meshes.filter(m=>m.owner==='sunflower'&&!m.instances&&m.component!=='terrain'&&m.group!=='terrain'&&m.overview),['vertices']);
 const active=new Set(),nearChanges=[],changedTiles=new Set();
 for(const m of near){const a=m.vertices,changed=new Uint8Array(a.length/9);let count=0;
  for(let i=0;i<a.length;i+=9){const x=a[i],z=a[i+2],old=a[i+1];if(!inside(x,z))continue;const y=height(x,z);if(Math.abs(y-base(x,z))<1e-5)continue;
   const n=G.norm([height(x-1,z)-height(x+1,z),2,height(x,z-1)-height(x,z+1)]),c=G.ISLAND.surfaceColor(terrain,x,z,y,n);a[i+1]=y;for(let k=0;k<3;k++){a[i+3+k]=n[k];a[i+6+k]=c[k];}changed[i/9]=1;count++;
  }
  if(count){changedTiles.add(m.id);for(let i=0;i<m.index.length;i+=3){if(![0,1,2].some(k=>changed[m.index[i+k]]))continue;const ps=positions(m,i),x=ps.reduce((s,p)=>s+p[0],0)/3,z=ps.reduce((s,p)=>s+p[2],0)/3;active.add(cellKey(x,z));}rebuildBounds(m);nearChanges.push({id:m.id,changedVertices:count});}
 }
 // The exterior of a local fine patch lies on the retained far triangles.
 // Fit boundary near vertices to those actual planes before copying either
 // side; source-analytic heights cannot close a coarse/fine T junction.
 const oldFar=meshSampler(far),boundaryKey=(x,z)=>{
  const gx=x/32,gz=z/32,onX=Math.abs(gx-Math.round(gx))<1e-7,onZ=Math.abs(gz-Math.round(gz))<1e-7;if(!onX&&!onZ)return false;
  const xs=onX?[Math.round(gx)-1,Math.round(gx)]:[Math.floor(gx)],zs=onZ?[Math.round(gz)-1,Math.round(gz)]:[Math.floor(gz)];let a=false,b=false;for(const X of xs)for(const Z of zs){if(active.has(X+','+Z))a=true;else b=true;}return a&&b;
 };
 let alignedVertices=0;const contactCells=new Set(active);for(const m of near){const a=m.vertices;for(let i=0;i<a.length;i+=9){const x=a[i],z=a[i+2];if(!inside(x,z)||!boundaryKey(x,z))continue;const y=oldFar(x,z);if(y===null)throw Error('Missing far boundary support');if(Math.abs(a[i+1]-y)>1e-7){a[i+1]=y;alignedVertices++;for(let X=Math.floor((x-.001)/32);X<=Math.floor((x+.001)/32);X++)for(let Z=Math.floor((z-.001)/32);Z<=Math.floor((z+.001)/32);Z++)contactCells.add(X+','+Z);}}}
 // Every affected 32 m cell uses the same original 16 m near triangles at
 // both distances. Outside those cells the compact original far mesh stays.
 const farChanges=[];
 for(const m of far){const n=near.find(n=>n.id+':far'===m.id);if(!n)throw Error('Missing sunflower terrain sibling '+m.id);const a=m.vertices,keep=[];let removed=0;
  for(let i=0;i<m.index.length;i+=3){const ps=positions(m,i),x=ps.reduce((s,p)=>s+p[0],0)/3,z=ps.reduce((s,p)=>s+p[2],0)/3;if(active.has(cellKey(x,z))){removed++;continue;}keep.push(m.index[i],m.index[i+1],m.index[i+2]);}
  if(!removed)continue;const append=[],map=new Map(),extra=[],oldMap=new Map(),retained=[];for(const v of keep){if(!oldMap.has(v)){oldMap.set(v,append.length/9);for(let j=0;j<9;j++)append.push(a[v*9+j]);}retained.push(oldMap.get(v));}
  for(let i=0;i<n.index.length;i+=3){const ps=positions(n,i),x=ps.reduce((s,p)=>s+p[0],0)/3,z=ps.reduce((s,p)=>s+p[2],0)/3;if(!active.has(cellKey(x,z)))continue;for(let k=0;k<3;k++){const v=n.index[i+k];if(!map.has(v)){map.set(v,append.length/9);for(let j=0;j<9;j++)append.push(n.vertices[v*9+j]);}extra.push(map.get(v));}}
  m.vertices=Float32Array.from(append);m.index=new Uint32Array([...retained,...extra]);rebuildBounds(m);farChanges.push({id:m.id,removed,added:extra.length/3});
 }
 const contactList=[];for(const m of near)for(let i=0;i<m.index.length;i+=3){const ps=positions(m,i),x=ps.reduce((s,p)=>s+p[0],0)/3,z=ps.reduce((s,p)=>s+p[2],0)/3;if(!contactCells.has(cellKey(x,z)))continue;for(const p of ps)contactList.push(...p);}
 const contact=Float32Array.from(contactList),surface=sampler(contact),ground=(x,z)=>{const y=inside(x,z)?surface(x,z):null;return y===null?base(x,z):y;};
 const roads=replaceRoad(pack,base,ground),instances=[],coldSurfaces=[];
 const instanceTargets=pack.meshes.filter(m=>{if(!m.instances||!(m.globalSurface&&m.component==='transition-vegetation'||m.id==='overview:sunflower:trees'))return false;for(let i=0;i<m.instances.length;i+=16){const x=m.instances[i+12],z=m.instances[i+14],y=inside(x,z)&&!protectedAt(x,z)?surface(x,z):null;if(y!==null&&Math.abs(y-base(x,z))>=1e-5)return true;}return false;});
 // Accepted tree families outside the slope may intentionally share their
 // instance view. Prove exclusivity only for views this transaction writes.
 exclusive(pack,instanceTargets,['instances']);
 // Public vegetation keeps original identity and the original root offset.
 // No prototype vertex is bent and no XY matrix component is edited.
 for(const m of instanceTargets){let moved=0,maxDelta=0;for(let i=0;i<m.instances.length;i+=16){const x=m.instances[i+12],z=m.instances[i+14],y=inside(x,z)?surface(x,z):null;if(y===null||protectedAt(x,z))continue;const dy=y-base(x,z);if(Math.abs(dy)<1e-5)continue;m.instances[i+13]+=dy;moved++;maxDelta=Math.max(maxDelta,Math.abs(dy));}if(moved){growInstanceBounds(m,maxDelta);instances.push({id:m.id,moved,maxDelta});}}
 // The cold field has independent positions; retain its carpet, original
 // offsets and identity, but bind those positions to the same new surface.
 for(const m of pack.meshes){if(m.owner!=='sunflower'||m.instances||m.component==='terrain'||m.group==='terrain'||!m.overview)continue;let changed=0,maxDelta=0;const a=m.vertices;if(!a)continue;for(let i=0;i<a.length;i+=9){const x=a[i],z=a[i+2],y=inside(x,z)?surface(x,z):null;if(y===null||protectedAt(x,z))continue;const dy=y-base(x,z);if(Math.abs(dy)<1e-5)continue;a[i+1]+=dy;changed++;maxDelta=Math.max(maxDelta,Math.abs(dy));}if(changed){rebuildBounds(m);coldSurfaces.push({id:m.id,changedVertices:changed,maxDelta});}}
 data.sunflowerEntry={revision,scope:scope.slice(),contact};updateRouteMetadata();
 const newBuffers=new Set([contact.buffer]);for(const m of pack.meshes)for(const k of ['vertices','farVertices','index','instances','instanceColors'])if(m[k]&&!sourceBuffers.has(m[k].buffer))newBuffers.add(m[k].buffer);
 const sourceBytes=[...newBuffers].reduce((n,b)=>n+b.byteLength,0),farDelta=farChanges.reduce((n,m)=>n+m.added-m.removed,0),roadDelta=roads.reduce((n,m)=>n+m.added-m.removed,0);
 if(sourceBytes>.6*1048576)throw Error('Sunflower entry source budget exceeded: '+sourceBytes);
 if(farDelta+roadDelta>4000)throw Error('Sunflower entry submitted triangle budget exceeded: '+(farDelta+roadDelta));
 pack.bytes=byteCount(pack.meshes);metadata.set(pack,{revision,scope:scope.slice(),sections,approachControls,activeCells:[...active],contactCells:[...contactCells],alignedVertices,nearChanges,farChanges,roads,instances,coldSurfaces,contactBytes:contact.byteLength,sourceBytes,farDelta,roadDelta,textureDelta:0,newRecords:0});
 return[];
}
G.buildRegion=async function(data,id,legacy){const result=await originalBuildRegion(data,id,legacy);if(id==='sunflower'&&data.sunflowerEntry)result.meta.sunflowerEntry={revision,scope:scope.slice(),ground:'shared actual terrain contact; original native XY routes and plant IDs'};return result;};
(G.extraOverviewBuilders??=[]).push((data,pack)=>prepare(data,pack));
G.SUNFLOWER_ENTRY=Object.freeze({revision,scope,sections,protectedPads,sourceRoute,routeStart,approachControls,routeSamples,roadIDs,prepare,metadata,sampler,profile,BaseHeight,contactHeight,originalBuildRegion,byteCount});
})(globalThis.GA);
