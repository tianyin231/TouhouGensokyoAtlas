/* P: northern sunflower foothill and its public approach.
 * Replace the original surface in place; no decorative cover, new plants or
 * textures. Native flower paths keep their XY topology and original plant IDs.
 */
(function(G){'use strict';
const revision=2,scope=Object.freeze([-896,704,-192,1152]),metadata=new WeakMap(),samplers=new WeakMap();
const BaseHeight=G.Terrain.prototype.height,originalBuildRegion=G.buildRegion;
const originalRoute=G.ISLAND.allRoutes.find(r=>r.id==='route-flower');
const sourceRoute={...originalRoute,points:originalRoute.points.map(p=>p.slice()),samples:originalRoute.samples.map(p=>p.slice())};
const routeStart=sourceRoute.samples.findIndex(p=>p[1]>=704),routeAnchor=sourceRoute.samples[routeStart];
const nativePath=G.FLOWERLANDS.paths.find(p=>p.id==='sun-main'),nativeStart=nativePath.samples[0],nativeNext=nativePath.samples[1];
const nativeDirection=G.norm([nativeNext[0]-nativeStart[0],0,nativeNext[1]-nativeStart[1]]);
const nativeJoin=Object.freeze({pathId:nativePath.id,point:Object.freeze(nativeStart.slice()),normal:Object.freeze([-nativeDirection[2],nativeDirection[0]]),width:nativePath.width*.97,shoulder:.60,lift:.24,taperDistance:56});
const approachControls=Object.freeze([routeAnchor,[-425,780],[-460,830],[-470,870],[-423,873],[-386,878],[nativeStart[0]-nativeDirection[0]*28,nativeStart[1]-nativeDirection[2]*28],nativeStart].map(p=>Object.freeze(p.slice())));
const approach=G.spline(approachControls,4),routeSamples=[...sourceRoute.samples.slice(0,routeStart),...approach];
// The last rendered chord and cross-section share the native entrance tangent.
const penultimate=routeSamples.at(-2),lastLength=Math.hypot(nativeStart[0]-penultimate[0],nativeStart[1]-penultimate[1]);
routeSamples[routeSamples.length-2]=[nativeStart[0]-nativeDirection[0]*lastLength,nativeStart[1]-nativeDirection[2]*lastLength];
function cumulative(samples){let length=0;return samples.map((p,i)=>{if(i)length+=Math.hypot(p[0]-samples[i-1][0],p[1]-samples[i-1][1]);return length;});}
const sourceDistances=cumulative(sourceRoute.samples),routeDistances=cumulative(routeSamples);
const roadIDs=Object.freeze(['island:routes:connections:-1:1','island:routes:connections:-1:1:shoulder']);
const roadsideSources=Object.freeze([{recordId:'island:transition:grass:-1:1',first:141,last:252,kind:'grass'},{recordId:'island:transition:shrub:-1:1',first:31,last:38,kind:'shrub'}].map(Object.freeze));
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
 // Cubic interpolation must not push the first rise outside the edit boundary.
 const toe=Math.max(scope[1],rowValue(x,'toe')),crest=rowValue(x,'shoulder'),end=Math.min(scope[3],rowValue(x,'inner'));
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
function buffersOf(...roots){const seen=new Set(),buffers=new Set(),visit=o=>{if(!o||typeof o!=='object'||seen.has(o))return;seen.add(o);if(ArrayBuffer.isView(o)){buffers.add(o.buffer);return;}if(o instanceof Map||o instanceof Set){for(const v of o.values())visit(v);return;}for(const v of Object.values(o))visit(v);};for(const root of roots)visit(root);return buffers;}
function byteCount(meshes,extra=[]){return[...buffersOf(meshes,extra)].reduce((n,b)=>n+b.byteLength,0);}
function rebuildBounds(m){const a=m.vertices,lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(let i=0;i<a.length;i+=9)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],a[i+k]);hi[k]=Math.max(hi[k],a[i+k]);}m.center=lo.map((v,k)=>(v+hi[k])/2);m.radius=G.length(G.sub(hi,lo))/2;}
function growInstanceBounds(m,dy){m.radius+=Math.abs(dy);}
function exclusive(pack,targets,keys=['vertices','index']){const all=[];for(const m of pack.meshes)for(const k of ['vertices','farVertices','index','instances','instanceColors'])if(m[k])all.push({m,k,a:m[k]});for(const m of targets)for(const k of keys){const a=m[k];if(!a)continue;for(const v of all){if(v.m===m&&v.k===k)continue;if(v.a.buffer===a.buffer&&v.a.byteOffset<a.byteOffset+a.byteLength&&v.a.byteOffset+v.a.byteLength>a.byteOffset)throw Error('Sunflower source view is shared: '+m.id+'/'+k+' with '+v.m.id+'/'+v.k);}}}
function updateRouteMetadata(){for(const r of [G.routes.find(r=>r.id==='route-flower'),G.ISLAND.allRoutes.find(r=>r.id==='route-flower')]){r.samples=routeSamples.map(p=>p.slice());r.points=[...sourceRoute.points.slice(0,-1),...approachControls.map(p=>p.slice())];r.note='P：保留村里与花田端点，北外坡末段沿缓坡绕行。';}}
function roadSection(i,height,originalHeight=height){const p=routeSamples[i],a=routeSamples[Math.max(0,i-1)],b=routeSamples[Math.min(routeSamples.length-1,i+1)],dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz)||1;
 const blend=G.smooth(routeDistances.at(-1)-nativeJoin.taperDistance,routeDistances.at(-1),routeDistances[i]),normal=i===routeSamples.length-1?nativeJoin.normal:[-dz/l,dx/l],half=lerp(2,nativeJoin.width/2,blend),outer=half+lerp(2.5,nativeJoin.shoulder,blend),lift=lerp(.13,nativeJoin.lift,blend);
 // Retain the exact old cross-section, including its original surface query.
 // One shoulder corner crosses the contact boundary although its centre does not.
 const at=i===routeStart-1?originalHeight:height,point=s=>{const x=p[0]+normal[0]*s,z=p[1]+normal[1]*s;return[x,at(x,z)+lift,z];};
 return{blend,normal,half,outer,lift,road:[point(-half),point(half)],shoulder:[point(-outer),point(outer)]};
}
function roadGeometry(samples,height,start=0,terrain=null){const road=new G.Geometry(),shoulder=new G.Geometry();
 if(terrain){const soil=G.rgb('#b2a17d'),edge=G.rgb('#8d8765'),oldRoad=G.rgb('#9e946f'),oldShoulder=G.rgb('#839063'),normal=p=>G.norm([height(p[0]-1,p[2])-height(p[0]+1,p[2]),2,height(p[0],p[2]-1)-height(p[0],p[2]+1)]);
  const quad=(g,ps,weights,isShoulder,outer)=>{const up=G.cross(G.sub(ps[1],ps[0]),G.sub(ps[2],ps[0]))[1]>=0;for(const tri of up?[[0,1,2],[0,2,3]]:[[0,2,1],[0,3,2]]){const face=G.norm(G.cross(G.sub(ps[tri[1]],ps[tri[0]]),G.sub(ps[tri[2]],ps[tri[0]])));for(const j of tri){const p=ps[j],n=normal(p),nativeColor=outer[j]?G.blend(terrain.color(p[0],p[2],p[1],n),soil,.12):G.blend(soil,edge,G.noise(p[0]/8,p[2]/12)*.18);g.vertex(p,G.norm(G.blend(face,n,weights[j])),G.blend(isShoulder?oldShoulder:oldRoad,nativeColor,weights[j]));}}};
  const originalHeight=(x,z)=>BaseHeight.call(terrain,x,z);
  for(let i=start;i<samples.length-1;i++){const a=roadSection(i,height,originalHeight),b=roadSection(i+1,height,originalHeight),w=[a.blend,a.blend,b.blend,b.blend];quad(road,[a.road[0],a.road[1],b.road[1],b.road[0]],w,false,[false,false,false,false]);for(const side of[0,1])quad(shoulder,[a.road[side],a.shoulder[side],b.shoulder[side],b.road[side]],w,true,[false,true,true,false]);}
  return[road,shoulder];
 }
 for(let i=start;i<samples.length-1;i++){
 const a=samples[i],b=samples[i+1],prev=samples[Math.max(0,i-1)],next=samples[Math.min(samples.length-1,i+2)],normal=(p,q)=>{const dx=q[0]-p[0],dz=q[1]-p[1],l=Math.hypot(dx,dz)||1;return[-dz/l,dx/l];},na=normal(prev,b),nb=normal(a,next),point=(p,n,s)=>{const x=p[0]+n[0]*s,z=p[1]+n[1]*s;return[x,height(x,z)+.13,z];};
 road.quad(point(a,na,-2),point(a,na,2),point(b,nb,2),point(b,nb,-2),G.rgb('#9e946f'));
 for(const side of[-1,1])shoulder.quad(point(a,na,side*2),point(a,na,side*4.5),point(b,nb,side*4.5),point(b,nb,side*2),G.rgb('#839063'));
 }return[road,shoulder];}
function replaceRoad(pack,base,height,terrain){const original=roadGeometry(sourceRoute.samples,base,routeStart-1),replacement=roadGeometry(routeSamples,height,routeStart-1,terrain),changes=[];
 for(let k=0;k<2;k++){const m=pack.meshes.find(m=>m.id===roadIDs[k]);if(!m)throw Error('Missing public sunflower approach: '+roadIDs[k]);const keys=new Set();for(let i=0;i<original[k].a.length;i+=27)keys.add(triKey([0,1,2].map(j=>original[k].a.slice(i+j*9,i+j*9+3))));
 const keep=[],a=m.vertices,ix=m.index;let removed=0;for(let i=0;i<ix.length;i+=3){if(keys.has(triKey(positions(m,i)))){removed++;continue;}keep.push(ix[i],ix[i+1],ix[i+2]);}
 if(removed!==original[k].a.length/27)throw Error('Public approach exact source mismatch '+m.id+': '+removed+'/'+original[k].a.length/27);
 const keptVertices=[],oldMap=new Map(),keptIndices=[];for(const v of keep){if(!oldMap.has(v)){oldMap.set(v,keptVertices.length/9);for(let j=0;j<9;j++)keptVertices.push(a[v*9+j]);}keptIndices.push(oldMap.get(v));}
 const verts=new Float32Array(keptVertices.length+replacement[k].a.length);verts.set(keptVertices);verts.set(replacement[k].a,keptVertices.length);const idx=new Uint32Array(keep.length+replacement[k].a.length/9);idx.set(keptIndices);for(let i=keep.length;i<idx.length;i++)idx[i]=keptVertices.length/9+i-keep.length;
 m.vertices=verts;m.index=idx;rebuildBounds(m);changes.push({id:m.id,removed,added:replacement[k].a.length/27});
 }return changes;}
function nearestRoute(samples,distances,x,z){let best={distance:Infinity};for(let i=routeStart;i<samples.length-1;i++){const a=samples[i],b=samples[i+1],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),t=clamp(((x-a[0])*dx+(z-a[1])*dz)/(length*length),0,1),X=a[0]+dx*t,Z=a[1]+dz*t,distance=Math.hypot(x-X,z-Z);if(distance<best.distance)best={distance,segment:i,along:distances[i]+length*t,sideOffset:(x-X)*(-dz/length)+(z-Z)*(dx/length)};}return best;}
function sourceAnchorMatches(x,z,i,side){const a=sourceRoute.samples[i],b=sourceRoute.samples[i+1],length=Math.hypot(b[0]-a[0],b[1]-a[1]),n=[-(b[1]-a[1])/length*side,(b[0]-a[0])/length*side];let lo=sourceRoute.width/2+1.5,hi=lo+7;
 for(let k=0;k<2;k++){const delta=(k?z:x)-a[k];if(Math.abs(n[k])<1e-10){if(delta<-.001||delta>2.001)return false;continue;}const u=(delta-2.001)/n[k],v=(delta+.001)/n[k];lo=Math.max(lo,Math.min(u,v));hi=Math.min(hi,Math.max(u,v));}return lo<=hi;
}
function planRoadside(pack){const moves=[],grass=[];for(const def of roadsideSources){const m=pack.meshes.find(m=>m.id===def.recordId);if(!m?.instances||m.instances.length/16<=def.last)throw Error('Missing original sunflower roadside instances: '+def.recordId);
  for(let instanceIndex=def.first;instanceIndex<=def.last;instanceIndex++){const i=instanceIndex*16,source=[m.instances[i+12],m.instances[i+13],m.instances[i+14]],x=source[0],z=source[2];let sourceAnchor,pairedGrass;
   if(def.kind==='grass'){const matches=[];for(let j=3;j<sourceRoute.samples.length-3;j+=3){if(j<routeStart||G.DIORAMA.owner(...sourceRoute.samples[j]))continue;for(const side of[-1,1])if(sourceAnchorMatches(x,z,j,side))matches.push({sample:j,side});}if(matches.length!==1)throw Error('Ambiguous original sunflower roadside anchor: '+def.recordId+'/'+instanceIndex);sourceAnchor=matches[0];}
   else{const paired=grass.filter(g=>g.source[0]===x&&g.source[2]===z);if(paired.length!==1)throw Error('Unpaired original sunflower roadside shrub: '+instanceIndex);sourceAnchor=paired[0].sourceAnchor;pairedGrass={recordId:paired[0].recordId,instanceIndex:paired[0].instanceIndex};}
   const old=nearestRoute(sourceRoute.samples,sourceDistances,x,z),relativeAlong=(old.along-sourceDistances[routeStart])/(sourceDistances.at(-1)-sourceDistances[routeStart]),newAlong=lerp(routeDistances[routeStart],routeDistances.at(-1),relativeAlong);let j=routeStart;while(j<routeSamples.length-2&&routeDistances[j+1]<newAlong)j++;
   const a=routeSamples[j],b=routeSamples[j+1],length=routeDistances[j+1]-routeDistances[j],f=clamp((newAlong-routeDistances[j])/length,0,1),nx=-(b[1]-a[1])/length,nz=(b[0]-a[0])/length,targetXZ=[lerp(a[0],b[0],f)+nx*old.sideOffset,lerp(a[1],b[1],f)+nz*old.sideOffset];
   if(!inside(x,z)||!inside(...targetXZ)||protectedAt(...targetXZ))throw Error('Sunflower roadside migration escaped its approved slope');
   const move={recordId:def.recordId,instanceIndex,source,sourceAnchor,sourceSegment:old.segment,oldAlong:old.along,relativeAlong,sideOffset:old.sideOffset,newAlong,nominalTargetXZ:targetXZ.slice(),mappedNormal:[nx,nz],targetXZ,clearanceOffset:0,...pairedGrass?{pairedGrass}:{}};moves.push(move);if(def.kind==='grass')grass.push(move);
  }
 }return moves;
}
function convexHull(points){const sorted=points.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]),turn=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]),half=ps=>{const out=[];for(const p of ps){while(out.length>1&&turn(out.at(-2),out.at(-1),p)<=0)out.pop();out.push(p);}return out;};return[...half(sorted).slice(0,-1),...half(sorted.reverse()).slice(0,-1)];}
function overlapXZ(a,b,margin=.03){for(const poly of[a,b])for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length],dx=q[0]-p[0],dz=q[1]-p[1],length=Math.hypot(dx,dz);if(length<1e-9)continue;const nx=-dz/length,nz=dx/length,project=ps=>ps.map(v=>v[0]*nx+v[1]*nz),aa=project(a),bb=project(b);if(Math.max(...aa)+margin<Math.min(...bb)||Math.max(...bb)+margin<Math.min(...aa))return false;}return true;}
function clearRoadside(pack,moves,roadChanges){const road=pack.meshes.find(m=>m.id===roadIDs[0]),count=roadChanges.find(m=>m.id===road.id).added,triangles=[];
 for(let i=road.index.length-count*3;i<road.index.length;i+=3)triangles.push(positions(road,i).map(p=>[p[0],p[2]]));
 // A conservative projection of the real, unchanged near/far prototype is
 // cleared from the submitted road faces. Only an already authorized plant
 // can receive the minimum extra outward translation; none is regenerated.
 for(const move of moves){const m=pack.meshes.find(m=>m.id===move.recordId),i=move.instanceIndex*16,a=m.instances,points=[];for(const v of new Set([m.vertices,m.farVertices].filter(Boolean)))for(let j=0;j<v.length;j+=9)points.push([a[i]*v[j]+a[i+4]*v[j+1]+a[i+8]*v[j+2],a[i+2]*v[j]+a[i+6]*v[j+1]+a[i+10]*v[j+2]]);
  const hull=convexHull(points),sign=Math.sign(move.sideOffset)||1,direction=move.mappedNormal.map(v=>v*sign),at=d=>{const X=Math.fround(move.nominalTargetXZ[0]+direction[0]*d),Z=Math.fround(move.nominalTargetXZ[1]+direction[1]*d);return hull.map(p=>[p[0]+X,p[1]+Z]);},blocked=d=>{const p=at(d),lo=[Math.min(...p.map(v=>v[0]))-.03,Math.min(...p.map(v=>v[1]))-.03],hi=[Math.max(...p.map(v=>v[0]))+.03,Math.max(...p.map(v=>v[1]))+.03];return triangles.some(q=>Math.max(...q.map(v=>v[0]))>=lo[0]&&Math.min(...q.map(v=>v[0]))<=hi[0]&&Math.max(...q.map(v=>v[1]))>=lo[1]&&Math.min(...q.map(v=>v[1]))<=hi[1]&&overlapXZ(p,q));};
  if(!blocked(0))continue;let low=0,high=.25;while(high<=4&&blocked(high))high*=2;if(high>4)throw Error('Sunflower roadside needs more than a local clearance correction: '+move.recordId+'/'+move.instanceIndex);for(let j=0;j<12;j++){const d=(low+high)/2;if(blocked(d))low=d;else high=d;}const offset=Math.ceil(high*100)/100;
  if(blocked(offset))throw Error('Sunflower roadside clearance rounding failed');move.clearanceOffset=offset;move.clearanceDirection=direction;move.targetXZ=move.nominalTargetXZ.map((v,k)=>v+direction[k]*offset);if(!inside(...move.targetXZ)||protectedAt(...move.targetXZ))throw Error('Sunflower roadside clearance escaped approved slope');
 }
}
function prepare(data,pack){if(metadata.has(pack))return[];if(data.sunflowerEntry)throw Error('Sunflower entry contact prepared twice');
 const sourceBuffers=buffersOf(pack);
 const terrain=new G.Terrain(data),baseCache=new Map(),heightCache=new Map(),base=(x,z)=>{const k=x+','+z;if(!baseCache.has(k))baseCache.set(k,BaseHeight.call(terrain,x,z));return baseCache.get(k);},height=(x,z)=>{const k=x+','+z;if(!heightCache.has(k))heightCache.set(k,profile(base,x,z));return heightCache.get(k);};
 const selected=pack.meshes.filter(m=>m.component==='island-terrain'&&!m.cutOnly&&m.tile[0]<scope[2]&&m.tile[0]+m.tile[2]>scope[0]&&m.tile[1]<scope[3]&&m.tile[1]+m.tile[2]>scope[1]);
 const near=selected.filter(m=>m.globalNear),far=selected.filter(m=>m.globalFar);if(near.length!==12||far.length!==12)throw Error('Sunflower terrain record inventory changed');
 exclusive(pack,[...selected,...pack.meshes.filter(m=>roadIDs.includes(m.id))]);
 exclusive(pack,pack.meshes.filter(m=>m.owner==='sunflower'&&!m.instances&&m.component!=='terrain'&&m.group!=='terrain'&&m.overview),['vertices']);
 // Freeze every original near triangle that can intersect a protected pad,
 // including all its vertices. A constant height query alone cannot protect
 // a platform whose feet interpolate across surrounding terrain vertices.
 const supportKeys=new Set(),supportCells=new Set();for(const m of near)for(let i=0;i<m.index.length;i+=3){const ps=positions(m,i),xs=ps.map(p=>p[0]),zs=ps.map(p=>p[2]);if(!protectedPads.some(p=>Math.min(...xs)<=p.x+p.w/2&&Math.max(...xs)>=p.x-p.w/2&&Math.min(...zs)<=p.z+p.d/2&&Math.max(...zs)>=p.z-p.d/2))continue;for(const p of ps)supportKeys.add(p[0]+','+p[2]);supportCells.add(cellKey(xs.reduce((s,x)=>s+x,0)/3,zs.reduce((s,z)=>s+z,0)/3));}
 const active=new Set(),nearChanges=[],changedTiles=new Set();
 for(const m of near){const a=m.vertices,changed=new Uint8Array(a.length/9);let count=0;
  for(let i=0;i<a.length;i+=9){const x=a[i],z=a[i+2],old=a[i+1];if(!inside(x,z)||supportKeys.has(x+','+z))continue;const y=height(x,z);if(Math.abs(y-base(x,z))<1e-5)continue;
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
 let alignedVertices=0;const contactCells=new Set(active);for(const m of near){const a=m.vertices;for(let i=0;i<a.length;i+=9){const x=a[i],z=a[i+2];if(!inside(x,z)||supportKeys.has(x+','+z)||!boundaryKey(x,z))continue;const y=oldFar(x,z);if(y===null)throw Error('Missing far boundary support');if(Math.abs(a[i+1]-y)>1e-7){a[i+1]=y;alignedVertices++;for(let X=Math.floor((x-.001)/32);X<=Math.floor((x+.001)/32);X++)for(let Z=Math.floor((z-.001)/32);Z<=Math.floor((z+.001)/32);Z++)contactCells.add(X+','+Z);}}}
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
 const roads=replaceRoad(pack,base,ground,terrain),instances=[],coldSurfaces=[],roadsideMoves=planRoadside(pack);clearRoadside(pack,roadsideMoves,roads);const roadsideMap=new Map(roadsideMoves.map(m=>[m.recordId+'/'+m.instanceIndex,m]));
 const instanceTargets=pack.meshes.filter(m=>{if(!m.instances||!(m.globalSurface&&m.component==='transition-vegetation'||m.id==='overview:sunflower:trees'))return false;for(let i=0;i<m.instances.length;i+=16){if(roadsideMap.has(m.id+'/'+i/16))return true;const x=m.instances[i+12],z=m.instances[i+14],y=inside(x,z)&&!protectedAt(x,z)?surface(x,z):null;if(y!==null&&Math.abs(y-base(x,z))>=1e-5)return true;}return false;});
 // Accepted tree families outside the slope may intentionally share their
 // instance view. Prove exclusivity only for views this transaction writes.
 exclusive(pack,instanceTargets,['instances']);
 // Only the listed, uniquely attributed roadside grass/shrubs translate in
 // XZ. Their original root offset, full shape, colour and orientation stay.
 // Every tree and every unlisted instance keeps its original XZ components.
 for(const m of instanceTargets){let moved=0,maxDelta=0,maxDisplacement=0;for(let i=0;i<m.instances.length;i+=16){const x=m.instances[i+12],oldY=m.instances[i+13],z=m.instances[i+14],migration=roadsideMap.get(m.id+'/'+i/16);
   if(migration){const [X,Z]=migration.targetXZ,Y=ground(X,Z)+(oldY-base(x,z));m.instances[i+12]=X;m.instances[i+13]=Y;m.instances[i+14]=Z;migration.target=[m.instances[i+12],m.instances[i+13],m.instances[i+14]];moved++;maxDelta=Math.max(maxDelta,Math.abs(Y-oldY));maxDisplacement=Math.max(maxDisplacement,Math.hypot(X-x,Y-oldY,Z-z));continue;}
   const y=inside(x,z)?surface(x,z):null;if(y===null||protectedAt(x,z))continue;const dy=y-base(x,z);if(Math.abs(dy)<1e-5)continue;m.instances[i+13]+=dy;moved++;maxDelta=Math.max(maxDelta,Math.abs(dy));maxDisplacement=Math.max(maxDisplacement,Math.abs(dy));
  }if(moved){growInstanceBounds(m,maxDisplacement);instances.push({id:m.id,moved,maxDelta,maxDisplacement});}}
 // The cold field has independent positions; retain its carpet, original
 // offsets and identity, but bind those positions to the same new surface.
 for(const m of pack.meshes){if(m.owner!=='sunflower'||m.instances||m.component==='terrain'||m.group==='terrain'||!m.overview)continue;let changed=0,maxDelta=0;const a=m.vertices;if(!a)continue;for(let i=0;i<a.length;i+=9){const x=a[i],z=a[i+2],y=inside(x,z)?surface(x,z):null;if(y===null||protectedAt(x,z))continue;const dy=y-base(x,z);if(Math.abs(dy)<1e-5)continue;a[i+1]+=dy;changed++;maxDelta=Math.max(maxDelta,Math.abs(dy));}if(changed){rebuildBounds(m);coldSurfaces.push({id:m.id,changedVertices:changed,maxDelta});}}
 data.sunflowerEntry={revision,scope:scope.slice(),contact};updateRouteMetadata();
 const newBuffers=new Set([...buffersOf(pack,data.sunflowerEntry)].filter(b=>!sourceBuffers.has(b)));
 const sourceBytes=[...newBuffers].reduce((n,b)=>n+b.byteLength,0),farDelta=farChanges.reduce((n,m)=>n+m.added-m.removed,0),roadDelta=roads.reduce((n,m)=>n+m.added-m.removed,0);
 if(sourceBytes>.6*1048576)throw Error('Sunflower entry source budget exceeded: '+sourceBytes);
 if(farDelta+roadDelta>4000)throw Error('Sunflower entry submitted triangle budget exceeded: '+(farDelta+roadDelta));
 pack.bytes=byteCount(pack);metadata.set(pack,{revision,scope:scope.slice(),sections,approachControls,nativeJoin,roadsideMoves,protectedSupport:{vertices:supportKeys.size,cells:[...supportCells]},activeCells:[...active],contactCells:[...contactCells],alignedVertices,nearChanges,farChanges,roads,instances,coldSurfaces,contactBytes:contact.byteLength,sourceBytes,farDelta,roadDelta,textureDelta:0,newRecords:0});
 return[];
}
G.buildRegion=async function(data,id,legacy){const result=await originalBuildRegion(data,id,legacy);if(id==='sunflower'&&data.sunflowerEntry)result.meta.sunflowerEntry={revision,scope:scope.slice(),ground:'shared actual terrain contact; original native XY routes and plant IDs'};return result;};
(G.extraOverviewBuilders??=[]).push((data,pack)=>prepare(data,pack));
G.SUNFLOWER_ENTRY=Object.freeze({revision,scope,sections,protectedPads,sourceRoute,routeStart,approachControls,routeSamples,roadIDs,nativeJoin,roadSection,roadsideSources,planRoadside,prepare,metadata,sampler,profile,BaseHeight,contactHeight,originalBuildRegion,byteCount});
})(globalThis.GA);
