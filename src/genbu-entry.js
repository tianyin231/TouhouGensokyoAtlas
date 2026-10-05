/* P: the complete Genbu southern mouth, existing columns and banks.
 * No added stones or plants. Exact terminal column identities are reshaped;
 * original bridge, paths, upstream works and all tree transforms remain.
 */
(function(G){'use strict';
const revision=1,scope=Object.freeze([-1024,-584,-912,-480]),W=G.WEST;
const previousHeight=G.Terrain.prototype.height,previousWater=G.Terrain.prototype.water,originalBuildRegion=G.buildRegion;
const metadata=new WeakMap(),nativeMetadata=new WeakMap(),samplers=new WeakMap();
// Exact low-trunk footprints from the bound b9ff native snapshot. Include
// three roots outside the scope whose actual footprint crosses its edge.
const nativeRoots=Object.freeze([[-1023.5230102539062,-565.8628540039062,2.3918511243970175],[-916.44873046875,-560.626708984375,2.4714969353276777],[-914.0435791015625,-552.8604125976562,1.90212625838567],[-913.2149658203125,-557.4935913085938,2.258949365144074],[-910.0957641601562,-557.6333618164062,2.832073947967128],[-1025.4102783203125,-551.2803344726562,2.3850609665643008],[-1018.5606079101562,-585.3674926757812,2.119397275410111]].map(Object.freeze));
// Original southern passage conflicts, measured against actual wooden faces.
// Cap top remains at least 4 cm below the unchanged deck underside.
const clearanceTop=Object.freeze({native:Object.freeze({"24":43.26,"25":43.46,"51":43.26,"100":43.46532531738281,"99":43.46532531738281,"77":43.957913360595704,"50":43.957913360595704,"76":43.4176530456543,"49":43.53416229248047,"75":42.86681915283203,"74":42.85973449707031,"73":42.83750625610352,"72":43.08548828125}),coarse:Object.freeze({"16":43.46,"17":43.46,"34":43.26,"48":43.46532531738281,"49":43.2928369140625,"62":43.46532531738281,"33":43.53416229248047,"32":43.4176530456543})});
const sourceRoute=G.ISLAND.allRoutes.find(p=>p.id==='route-genbu-link'),routeSamples=sourceRoute.samples.map(p=>p.slice());
const routeDistances=[0];for(let i=1;i<routeSamples.length;i++)routeDistances.push(routeDistances[i-1]+Math.hypot(routeSamples[i][0]-routeSamples[i-1][0],routeSamples[i][1]-routeSamples[i-1][1]));
const bank=W.gpaths[0],bankStart=bank.samples[0],bankNext=bank.samples[1],bankLength=Math.hypot(bankNext[0]-bankStart[0],bankNext[1]-bankStart[1]);
const bankDirection=[(bankNext[0]-bankStart[0])/bankLength,(bankNext[1]-bankStart[1])/bankLength],bankNormal=[bankDirection[1],-bankDirection[0]],bankTop=Math.fround(W.waterY(bankStart[1])+1.5+.18);
const tailStart=-524,tailY=Math.fround(W.waterY(tailStart));
const tailSections=Object.freeze([
 [W.waterX(-524),-524,W.waterHalf(-524)],[-976.6,-520,7.35],[-977.8,-516,8.35],[-978.05,-512,7.45],[-977.55,-508,4.65],[-976.9,-504,.24]
].map(Object.freeze));
const inside=(x,z)=>x>scope[0]&&x<scope[2]&&z>scope[1]&&z<scope[3],cellKey=(x,z)=>Math.floor(x/32)+','+Math.floor(z/32);
const sampler=G.SUNFLOWER_ENTRY.sampler;
function sample(a,x,z){let f=samplers.get(a);if(!f){f=sampler(a);samplers.set(a,f);}return f(x,z);}
function contactDelta(data,x,z){if(!inside(x,z)||!data?.genbuEntry)return null;const s=data.genbuEntry,y=sample(s.contact,x,z),old=sample(s.originalContact,x,z);return y===null||old===null?null:y-old;}
G.Terrain.prototype.height=function(x,z){return previousHeight.call(this,x,z)+(contactDelta(this.manifest,x,z)??0);};
G.Terrain.prototype.water=function(x,z,margin=0){const previous=previousWater.call(this,x,z,margin),c=this.manifest?.genbuEntry?.waterContact;if(!c||x<=scope[0]||x>=scope[2]||z<tailStart||z> -504||previous&&previous.id!=='genbu-creek')return previous;const q=tailAt(z);if(Math.abs(x-q.x)>q.half+Math.abs(margin)*4)return previous;const y=sample(c,x,z);if(Math.abs(x-q.x)<=q.half+margin*4&&(y!==null||margin>0))return{id:'genbu-creek',y:y??tailY};return previous&&previous.id==='genbu-creek'?false:previous;};
function nearestRoute(x,z){let best={distance:Infinity};for(let i=0;i<routeSamples.length-1;i++){const a=routeSamples[i],b=routeSamples[i+1],dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz),u=G.clamp(((x-a[0])*dx+(z-a[1])*dz)/(l*l),0,1),X=a[0]+dx*u,Z=a[1]+dz*u,d=Math.hypot(x-X,z-Z);if(d<best.distance)best={distance:d,along:routeDistances[i]+u*l,x:X,z:Z};}return best;}
function tailAt(z){let i=0;while(i<tailSections.length-2&&z>tailSections[i+1][1])i++;const a=tailSections[i],b=tailSections[i+1],t=G.clamp((z-a[1])/(b[1]-a[1]),0,1);return{x:G.mix(a[0],b[0],t),half:G.mix(a[2],b[2],t)};}
function profile(base,x,z){const old=base(x,z);if(!inside(x,z))return old;
 const envelope=G.smooth(scope[0],scope[0]+12,x)*(1-G.smooth(scope[2]-12,scope[2],x))*G.smooth(-584,-568,z)*(1-G.smooth(-500,-480,z));
 if(!envelope)return old;
 // Two broad bank feet open toward the existing approach. Their long axes
 // turn out from the column ends rather than surrounding them with a skirt.
 const t=G.clamp((z+564)/42,0,1),westX=G.mix(-1001,-991,t),eastX=G.mix(-933,-944,t),long=G.smooth(-580,-558,z)*(1-G.smooth(-532,-506,z));
 let y=old+long*(3.3*Math.exp(-(((x-westX)/11)**2))+3.6*Math.exp(-(((x-eastX)/11.5)**2)));
 // Existing deck/creek-bed support stays unchanged upstream of the mouth.
 const d=Math.abs(x-W.waterX(z)),inner=(1-G.smooth(14,20,d))*(1-G.smooth(-535,-529,z));y=G.mix(y,old,inner);
 const bridge=(1-G.smooth(1.95,5,Math.abs(z+548)))*(1-G.smooth(23.4,28,Math.abs(x-W.waterX(-548))));y=G.mix(y,old,bridge);
 // A shallow, explicitly bounded receiving tongue. The final narrow edge is
 // below the continuous bank surface; no new blue rectangle is left outside.
 if(z>-530&&z<-498){const q=tailAt(z),d=Math.abs(x-q.x),half=q.half,edge=tailY+.11;
  const bottom=tailY-.76+.60*G.smooth(-512,-504,z),s=G.smooth(Math.max(.2,half-2.4),half+1.2,d);
  const floor=G.mix(bottom,edge,s),across=1-G.smooth(half+1.2,half+8,d),along=G.smooth(-530,-524,z)*(1-G.smooth(-504,-498,z));
  y=G.mix(y,floor,across*along);if(z>-505)y=G.mix(y,Math.max(y,tailY+.16),across*G.smooth(-505,-504,z)*(1-G.smooth(-503,-498,z)));
 }
 // Lift an entire landing and broad approach, keeping every centreline XY.
 const road=nearestRoute(x,z),approach=G.smooth(routeDistances.at(-1)-32,routeDistances.at(-1),road.along)*(1-G.smooth(4.5,15,road.distance));
 y=G.mix(y,bankTop-.13,approach);
 const pad=1-G.smooth(4.4,9.2,Math.hypot(x-bankStart[0],z-bankStart[1]));y=G.mix(y,bankTop-.13,pad);
 return G.mix(old,y,envelope);
}
function columns(terrain,coarse=false){const R=G.rng(160972),out=[],spacing=coarse?6.7:4.45;let cap=0,tri=0;
 for(const side of[-1,1])for(let layer=0;layer<(coarse?2:3);layer++){let ordinal=0;for(let z=-657;z<-541;z+=spacing){const Z=z+layer*1.8,x=W.waterX(Z)+side*(23.5+layer*3.7+2*Math.sin(Z*.059));if(side===1&&Z>-617&&Z<-591)continue;
  const y=Math.min(previousHeight.call(terrain,x,Z)-1.6,W.waterY(Z)+.6);let h=(side===-1?33:27)+6*Math.sin(Z*.086+layer)+4*R();h=Math.max(h,W.baseHeight(terrain,x,Z)-y+4);R();const moss=R()<.34,id=(coarse?'coarse':'native')+':'+(side<0?'west':'east')+':layer'+layer+':'+ordinal++;
  const minimum=side<0?4.8:4.2,end=side<0?-538:-536.4,clearance=clearanceTop[coarse?'coarse':'native'][out.length];let target=Z>-562?minimum+(h-minimum)*(1-G.smooth(-562,end,Z)):h;if(clearance!==undefined)target=Math.min(target,clearance-y);
  out.push({id,ordinal:out.length,x,z:Z,y,h,target,clearanceTop:clearance,r:coarse?3.8:2.65,moss,mossStart:moss?cap:null,start:tri,count:coarse?42:204});tri+=coarse?42:204;if(moss)cap+=42;
 }}return out;
}
function positions(m,i){const a=m.vertices;return[0,1,2].map(k=>{const n=(m.index?m.index[i+k]:i+k)*9;return[a[n],a[n+1],a[n+2]];});}
function buffersOf(...roots){const seen=new Set(),out=new Set(),visit=o=>{if(!o||typeof o!=='object'||seen.has(o))return;seen.add(o);if(ArrayBuffer.isView(o)){out.add(o.buffer);return;}if(o instanceof Map||o instanceof Set){for(const v of o.values())visit(v);return;}for(const v of Object.values(o))visit(v);};for(const r of roots)visit(r);return out;}
function byteCount(...roots){return[...buffersOf(...roots)].reduce((n,b)=>n+b.byteLength,0);}
function bounds(m){const a=m.vertices,lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(let i=0;i<a.length;i+=9)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],a[i+k]);hi[k]=Math.max(hi[k],a[i+k]);}m.center=lo.map((v,k)=>(v+hi[k])/2);m.radius=G.length(G.sub(hi,lo))/2;}
function exclusive(pack,targets,keys){const all=[];for(const m of pack.meshes)for(const k of ['vertices','farVertices','index','instances','instanceColors'])if(m[k])all.push({m,k,a:m[k]});for(const m of targets)for(const k of keys){const a=m[k];if(!a)continue;for(const v of all){if(v.m===m&&v.k===k)continue;if(a.buffer===v.a.buffer&&v.a.byteOffset<a.byteOffset+a.byteLength&&v.a.byteOffset+v.a.byteLength>a.byteOffset)throw Error('Genbu write view is shared: '+m.id+'/'+k+' with '+v.m.id+'/'+v.k);}}}
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
function pointKey(p){return p.slice(0,3).map(Math.fround).join(',');}
function faceKey(ps){return ps.map(pointKey).sort().join('|');}
function verticesOf(m,i){return[0,1,2].map(k=>m.index?m.index[i+k]:i+k);}
function appendMesh(m,keep,replacement){const old=m.vertices,vs=[],ix=[],ids=new Map();for(const v of keep){if(!ids.has(v)){ids.set(v,vs.length/9);for(let k=0;k<9;k++)vs.push(old[v*9+k]);}ix.push(ids.get(v));}const start=vs.length/9;vs.push(...replacement);for(let j=0;j<replacement.length/9;j++)ix.push(start+j);m.vertices=Float32Array.from(vs);m.index=Uint32Array.from(ix);bounds(m);}
function tailGeometry(){const g=new G.Geometry(),c=G.rgb('#5b9691');for(let i=0;i<tailSections.length-1;i++){const a=tailSections[i],b=tailSections[i+1],p=(q,s)=>[q[0]+q[2]*s,tailY,q[1]];g.quad(p(a,-1),p(b,-1),p(b,1),p(a,1),c);}return g.a;}
function replaceTail(m){const keep=[],n=m.index?.length||m.vertices.length/9;let removed=0;for(let i=0;i<n;i+=3){const p=positions(m,i);if(p.every(q=>q[2]>=tailStart-.00001&&Math.abs(q[1]-tailY)<.00001)){removed++;continue;}keep.push(...verticesOf(m,i));}
 if(![2,4].includes(removed))throw Error('Genbu terminal water identity changed: '+m.id+'/'+removed);const a=tailGeometry();appendMesh(m,keep,a);return{id:m.id,removed,added:a.length/27};}
function expectedColumn(q){const g=new G.Geometry(),r=[q.r*.96,q.r,q.r*.95,q.r*.83],h=[q.y,q.y+q.h*.09,q.y+q.h-.26,q.y+q.h],point=(a,j)=>[q.x+Math.cos(a)*r[j],h[j],q.z+Math.sin(a)*r[j]],col=[.2,.2,.2];for(let j=0;j<3;j++)for(let k=0;k<6;k++){const a=k*Math.PI/3+Math.PI/6,b=(k+1)*Math.PI/3+Math.PI/6;g.quad(point(b,j),point(a,j),point(a,j+1),point(b,j+1),col);}for(let k=0;k<6;k++){const a=k*Math.PI/3+Math.PI/6,b=(k+1)*Math.PI/3+Math.PI/6;g.tri([q.x,q.y+q.h,q.z],point(b,3),point(a,3),col);}return g.a;}
function expectedMoss(q){const g=new G.Geometry();g.ellipsoid(q.x,q.y+q.h+.08,q.z,q.r*.79,.12,q.r*.68,[.2,.2,.2],7,3);return g.a;}
function exactFaceMap(m){const out=new Map(),n=m.index?.length||m.vertices.length/9;for(let i=0;i<n;i+=3){const k=faceKey(positions(m,i));if(!out.has(k))out.set(k,[]);out.get(k).push(i);}return out;}
function mappedFaces(a,map,label){const out=[],used=new Map();for(let i=0;i<a.length;i+=27){const k=faceKey([0,1,2].map(j=>a.slice(i+j*9,i+j*9+3))),found=map.get(k),at=used.get(k)||0;if(!found||at>=found.length)throw Error('Genbu exact body mismatch: '+label+'/'+i/27);out.push(found[at]);used.set(k,at+1);}return out;}
function transformFaces(m,faces,transform,label){const selected=new Set(faces),used=new Set();for(const i of faces)for(const v of verticesOf(m,i))used.add(v);const n=m.index?.length||m.vertices.length/9;for(let i=0;i<n;i+=3)if(!selected.has(i)&&verticesOf(m,i).some(v=>used.has(v)))throw Error('Genbu body shares a written vertex with retained faces: '+label);for(const v of used){const at=v*9,p=Array.from(m.vertices.subarray(at,at+9)),q=transform(p);for(let k=0;k<6;k++)m.vertices[at+k]=q[k];}return used.size;}
function applyColumns(rock,moss,list,coarse){const rockMap=coarse?exactFaceMap(rock):null,mossMap=exactFaceMap(moss),changes=[];
 for(const q of list){if(q.target===q.h)continue;let faces;
  if(coarse)faces=mappedFaces(expectedColumn(q),rockMap,q.id);
  else{faces=Array.from({length:q.count},(_,i)=>(q.start+i)*3);const actual=faces.slice(0,42).map(i=>faceKey(positions(rock,i))),expected=expectedColumn(q);for(let i=0;i<42;i++)if(actual[i]!==faceKey([0,1,2].map(j=>expected.slice(i*27+j*9,i*27+j*9+3))))throw Error('Genbu native column source offset changed: '+q.id);}
  if(faces.length!==(coarse?42:204))throw Error('Genbu column face count mismatch '+q.id);
  const s=q.target/q.h,changed=transformFaces(rock,faces,p=>{if(p[1]!==Math.fround(q.y))p[1]=q.y+(p[1]-q.y)*s;const n=G.norm([p[3],p[4]/s,p[5]]);p.splice(3,3,...n);return p;},q.id);
  let capVertices=0,capFaces=[];if(q.moss){capFaces=mappedFaces(expectedMoss(q),mossMap,q.id+' cap');capVertices=transformFaces(moss,capFaces,p=>{p[1]+=q.target-q.h;return p;},q.id+' cap');}
  changes.push({id:q.id,ordinal:q.ordinal,clearanceTop:q.clearanceTop,center:[q.x,q.y,q.z],oldHeight:q.h,height:q.target,faces:faces.map(i=>i/3),capFaces:capFaces.map(i=>i/3),changedVertices:changed,capVertices});
 }bounds(rock);bounds(moss);return changes;
}
function roadPlan(base,newHeight){const changes=new Map(),col=G.rgb('#9e946f'),end=routeSamples.length-1,start=Math.max(0,routeSamples.findIndex(p=>p[0]<-914)-1);
 const normal=(a,b)=>{const x=b[0]-a[0],z=b[1]-a[1],l=Math.hypot(x,z);return[-z/l,x/l];},endN=normal(routeSamples[end-1],routeSamples[end]),join=G.dot([endN[0],0,endN[1]],[bankNormal[0],0,bankNormal[1]])>0?bankNormal:bankNormal.map(v=>-v);
 for(let i=start;i<=end;i++){const p=routeSamples[i],n=normal(routeSamples[Math.max(0,i-1)],routeSamples[Math.min(end,i+1)]),blend=G.smooth(routeDistances.at(-1)-12,routeDistances.at(-1),routeDistances[i]),nn=G.norm([G.mix(n[0],join[0],blend),0,G.mix(n[1],join[1],blend)]),half=G.mix(1.55,1.25,blend);
  for(const side of[-1,1])for(const shoulder of[false,true]){const oldS=side*(1.55+(shoulder?2.5:0)),oldX=p[0]+n[0]*oldS,oldZ=p[1]+n[1]*oldS,oldY=base(oldX,oldZ)+.13;
   const s=side*(half+(shoulder?2.5:0)),X=p[0]+nn[0]*s-bankDirection[0]*.235*blend,Z=p[1]+nn[2]*s-bankDirection[1]*.235*blend;
   let Y=newHeight(X,Z)+.13;if(i===end&&!shoulder)Y=bankTop;
   const position=[X,Y,Z].map(Math.fround),key=pointKey([oldX,oldY,oldZ]);changes.set(key,{position,blend,shoulder});
  }
 }
 return {changes,start,end};
}
function applyRoads(pack,plan,height){const out=[];for(const m of pack.meshes){if(m.component!=='connection-road')continue;let changed=0;const a=m.vertices;
 for(let i=0;i<a.length;i+=9){const q=plan.changes.get(pointKey(Array.from(a.subarray(i,i+3))));if(!q)continue;const[x,y,z]=q.position;if(a[i]===x&&a[i+1]===y&&a[i+2]===z)continue;const n=G.norm([height(x-1,z)-height(x+1,z),2,height(x,z-1)-height(x,z+1)]);a[i]=x;a[i+1]=y;a[i+2]=z;for(let k=0;k<3;k++)a[i+3+k]=G.mix(n[k],k===1?1:0,q.blend);if(q.shoulder){const old=Array.from(a.subarray(i+6,i+9)),c=G.rgb('#7f8b69');for(let k=0;k<3;k++)a[i+6+k]=G.mix(old[k],c[k],q.blend*.55);}changed++;}
 if(changed){bounds(m);out.push({id:m.id,changedVertices:changed});}}
 if(!out.some(m=>m.id==='island:routes:genbu:-2:-2'))throw Error('Genbu approach source not matched');return out;
}
function rebuildNorthNear(m,oldNear,value){const keep=[],g=[];let removed=0;
 // Only rebuild original faces which actually change. Every new triangle stays
 // inside one original near plane; unchanged faces remain byte-for-byte.
 for(let i=0;i<m.index.length;i+=3){const old=[0,1,2].map(k=>Array.from(m.vertices.subarray(m.index[i+k]*9,m.index[i+k]*9+9))),cx=old.reduce((s,q)=>s+q[0],0)/3,cz=old.reduce((s,q)=>s+q[2],0)/3;
  if(cx<=scope[0]||cx>=scope[2]||cz< -512||cz>=scope[3]){keep.push(...verticesOf(m,i));continue;}
  const local=[];let changed=false;const x0=Math.floor(Math.min(...old.map(p=>p[0]))/4)*4,x1=Math.max(...old.map(p=>p[0])),z0=Math.floor(Math.min(...old.map(p=>p[2]))/4)*4,z1=Math.max(...old.map(p=>p[2]));
  for(let z=z0;z<z1;z+=4)for(let x=x0;x<x1;x+=4){const ps=[[x,0,z],[x+4,0,z],[x+4,0,z+4],[x,0,z+4]];for(const ids of[[0,3,2],[0,2,1]]){const poly=intersection(ids.map(i=>ps[i]),old);for(let j=1;j<poly.length-1;j++){const tri=[poly[0],poly[j],poly[j+1]];if(Math.abs((tri[1][0]-tri[0][0])*(tri[2][2]-tri[0][2])-(tri[1][2]-tri[0][2])*(tri[2][0]-tri[0][0]))<1e-7)continue;for(const q of tri){const v=interpolate(old,q[0],q[2]);if(!v)throw Error('Genbu original northern near face missing');const n=value(v);if(Math.abs(n[1]-v[1])>1e-6)changed=true;local.push(...n);}}}}
  if(changed){removed++;g.push(...local);}else keep.push(...verticesOf(m,i));
 }
 appendMesh(m,keep,g);return{removed,added:g.length/27};
}
function rebuildFar(m,near,oldNear,oldFar,active){const keep=[],a=m.vertices,vs=[],ix=[],retained=new Map();let removed=0;
 for(let i=0;i<m.index.length;i+=3){const p=positions(m,i),cx=p.reduce((s,q)=>s+q[0],0)/3,cz=p.reduce((s,q)=>s+q[2],0)/3;if(active.has(activeKey(cx,cz))){removed++;continue;}keep.push(...verticesOf(m,i));}
 if(!removed)return null;for(const v of keep){if(!retained.has(v)){retained.set(v,vs.length/9);for(let k=0;k<9;k++)vs.push(a[v*9+k]);}ix.push(retained.get(v));}const retainedCount=ix.length/3,newMap=new Map();
 const emit=p=>{for(let i=1;i<p.length-1;i++){const tri=[p[0],p[i],p[i+1]];if(Math.abs((tri[1][0]-tri[0][0])*(tri[2][2]-tri[0][2])-(tri[1][2]-tri[0][2])*(tri[2][0]-tri[0][0]))<1e-7)continue;for(const q of tri){const key=q.join(',');if(!newMap.has(key)){newMap.set(key,vs.length/9);vs.push(...q);}ix.push(newMap.get(key));}}};
 for(const n of near)for(let i=0;i<n.index.length;i+=3){const p=[0,1,2].map(k=>Array.from(n.vertices.subarray(n.index[i+k]*9,n.index[i+k]*9+9))),cx=p.reduce((s,q)=>s+q[0],0)/3,cz=p.reduce((s,q)=>s+q[2],0)/3;
  if(cx<m.tile[0]||cx>m.tile[0]+256||cz<m.tile[1]||cz>m.tile[1]+256||!active.has(activeKey(cx,cz)))continue;
  for(const f of oldFar.triangles(p)){const polygon=intersection(p,f);if(polygon.length<3)continue;emit(polygon.map(q=>{const oldN=oldNear(q[0],q[2]),oldF=interpolate(f,q[0],q[2]);if(!oldN||!oldF)throw Error('Genbu far overlay source missing');const out=oldF.map((v,k)=>v+(q[k]-oldN[k]));out[0]=q[0];out[2]=q[2];if(q.slice(3,6).some((v,k)=>Math.abs(v-oldN[k+3])>1e-10)){const normal=G.norm(out.slice(3,6));out.splice(3,3,...normal);}return out.map(Math.fround);}));}
 }
 m.vertices=Float32Array.from(vs);m.index=Uint32Array.from(ix);bounds(m);return{id:m.id,removed,added:ix.length/3-retainedCount};
}
const activeKey=(x,z)=>z< -512?'s:'+Math.floor(x/8)+','+Math.floor(z/8):'n:'+Math.floor(x/32)+','+Math.floor(z/32);
function prepare(data,pack){if(metadata.has(pack))return[];if(data.genbuEntry)throw Error('Genbu contact prepared twice');
 const before=buffersOf(pack,data),terrain=new G.Terrain(data),near=pack.meshes.filter(m=>m.component==='island-terrain'&&m.globalNear&&m.tile[0]===-1024&&[-768,-512].includes(m.tile[1])),far=pack.meshes.filter(m=>m.component==='island-terrain'&&m.globalFar&&m.tile[0]===-1024&&[-768,-512].includes(m.tile[1]));
 if(near.length!==2||far.length!==2)throw Error('Genbu terrain inventory changed');
 const oldNear=snapshot(near),oldFar=snapshot(far),baseCache=new Map(),shapeCache=new Map(),support=new Set();
 const base=(x,z)=>{const k=x+','+z;if(!baseCache.has(k))baseCache.set(k,previousHeight.call(terrain,x,z));return baseCache.get(k);};
 const roots=nativeRoots.map(q=>q.slice());for(const m of pack.meshes){if(!m.instances||!(m.material==='forestLeaf'||m.material==='foliage'&&/transition:(pine|broad|cedar)/.test(m.id)))continue;for(let i=0;i<m.instances.length;i+=16){const x=m.instances[i+12],z=m.instances[i+14];if(x>=scope[0]-6&&x<=scope[2]+6&&z>=scope[1]-6&&z<=scope[3]+6)roots.push([x,z,2]);}}
 const safeShape=(x,z)=>{const k=x+','+z;if(shapeCache.has(k))return shapeCache.get(k);const old=base(x,z);let h=profile(base,x,z);for(const r of roots)h=G.mix(old,h,G.smooth(r[2]+3,r[2]+10,Math.hypot(x-r[0],z-r[1])));shapeCache.set(k,h);return h;};
 const bridgeBox=[-990.606,-549.951,-944.154,-546.049];
 for(const m of near)for(let i=0;i<m.index.length;i+=3){const p=positions(m,i),x0=Math.min(...p.map(q=>q[0])),x1=Math.max(...p.map(q=>q[0])),z0=Math.min(...p.map(q=>q[2])),z1=Math.max(...p.map(q=>q[2]));
  if(!(x0<=bridgeBox[2]&&x1>=bridgeBox[0]&&z0<=bridgeBox[3]&&z1>=bridgeBox[1])&&!roots.some(r=>x0<=r[0]+r[2]&&x1>=r[0]-r[2]&&z0<=r[1]+r[2]&&z1>=r[1]-r[2]))continue;for(const q of p)support.add(q[0]+','+q[2]);
 }
 const value=p=>{const x=p[0],z=p[2],out=p.slice();if(!inside(x,z)||support.has(x+','+z))return out;const d=safeShape(x,z)-base(x,z);if(Math.abs(d)<1e-7)return out;out[1]+=d;const n=G.norm([safeShape(x-1,z)-safeShape(x+1,z),2,safeShape(x,z-1)-safeShape(x,z+1)]);out.splice(3,3,...n);return out.map(Math.fround);};
 const terrainWrites=near.map(m=>m),bodyRock=pack.meshes.find(m=>m.id==='overview016:genbu|basalt|architecture|S'),bodyMoss=pack.meshes.find(m=>m.id==='overview016:genbu|mossRock|architecture|S'),water=pack.meshes.find(m=>m.id==='overview016:genbu|genbuFlow|water|S');
 if(!bodyRock||!bodyMoss||!water)throw Error('Genbu cold identities missing');exclusive(pack,[...terrainWrites,bodyRock,bodyMoss],['vertices']);
 const nearChanges=[],active=new Set();
 for(const m of near){if(m.tile[1]===-512){const q=rebuildNorthNear(m,oldNear,value);nearChanges.push({id:m.id,...q});}
  else{let changed=0;for(let i=0;i<m.vertices.length;i+=9){const p=Array.from(m.vertices.subarray(i,i+9)),q=value(p);if(q.some((v,k)=>v!==p[k])){m.vertices.set(q,i);changed++;}}nearChanges.push({id:m.id,changedVertices:changed,removed:0,added:0});bounds(m);}
  for(let i=0;i<m.index.length;i+=3){const p=positions(m,i);if(!p.some(q=>{const old=oldNear(q[0],q[2]);return old&&Math.abs(q[1]-old[1])>1e-6;}))continue;active.add(activeKey(p.reduce((s,q)=>s+q[0],0)/3,p.reduce((s,q)=>s+q[2],0)/3));}
 }
 const farChanges=far.map(m=>rebuildFar(m,near,oldNear,oldFar,active)).filter(Boolean),list=[],original=[];
 for(const m of near)for(let i=0;i<m.index.length;i+=3){const p=positions(m,i);if(Math.max(...p.map(q=>q[0]))<scope[0]||Math.min(...p.map(q=>q[0]))>scope[2]||Math.max(...p.map(q=>q[2]))<scope[1]||Math.min(...p.map(q=>q[2]))>scope[3])continue;for(const q of p){const old=oldNear(q[0],q[2]);list.push(...q);original.push(q[0],old[1],q[2]);}}
 const contact=Float32Array.from(list),originalContact=Float32Array.from(original),surface=sampler(contact),originalSurface=sampler(originalContact),delta=(x,z)=>{if(!inside(x,z))return 0;const a=surface(x,z),b=originalSurface(x,z);return a===null||b===null?0:a-b;},height=(x,z)=>base(x,z)+delta(x,z);
 const roadTargets=pack.meshes.filter(m=>m.component==='connection-road'&&m.id.startsWith('island:routes:')&&m.vertices.some((v,i)=>i%9===0&&inside(v,m.vertices[i+2])));exclusive(pack,roadTargets,['vertices']);
 const roads=applyRoads(pack,roadPlan(base,height),height),coldColumns=applyColumns(bodyRock,bodyMoss,columns(terrain,true),true),tail=replaceTail(water),ta=tailGeometry(),waterContact=Float32Array.from(ta.filter((_,i)=>i%9<3));
 // Only existing small transition plants follow their real ground displacement.
 // Trees keep their original matrices and the original incident terrain faces.
 const small=pack.meshes.filter(m=>m.instances&&m.component==='transition-vegetation'&&/transition:(grass|shrub)/.test(m.id)&&Array.from({length:m.instances.length/16},(_,i)=>i*16).some(i=>inside(m.instances[i+12],m.instances[i+14])&&Math.abs(delta(m.instances[i+12],m.instances[i+14]))>1e-6));exclusive(pack,small,['instances']);
 const plants=[];for(const m of small){let count=0,max=0;for(let i=0;i<m.instances.length;i+=16){const d=delta(m.instances[i+12],m.instances[i+14]);if(Math.abs(d)<1e-6)continue;m.instances[i+13]+=d;max=Math.max(max,Math.abs(d));count++;}if(count){m.radius+=max;plants.push({id:m.id,count,maxDeltaY:max});}}
 data.genbuEntry={revision,scope:scope.slice(),contact,originalContact,waterContact,heightRule:'previousHeight + actualNear - originalNear',waterRule:'actual shared terminal surface, z>=-524 only'};
 const extra=[...buffersOf(pack,data.genbuEntry)].filter(b=>!before.has(b)),sourceBytes=extra.reduce((s,b)=>s+b.byteLength,0),terrainDelta=[...nearChanges,...farChanges].reduce((s,q)=>s+q.added-q.removed,0);
 if(sourceBytes>.6*1048576)throw Error('Genbu source budget exceeded: '+sourceBytes);if(terrainDelta+tail.added-tail.removed>4000)throw Error('Genbu static triangle budget exceeded');
 data.genbuEntry.publicSourceBytes=sourceBytes;pack.bytes=byteCount(pack);metadata.set(pack,{revision,scope,sourceBytes,terrainDelta,nearChanges,farChanges,roads,coldColumns,water:tail,plants,roots,protectedVertexCount:support.size,contactBytes:contact.byteLength,originalContactBytes:originalContact.byteLength,waterContactBytes:waterContact.byteLength,activeCells:[...active],newRecords:0,newTextures:0,oldLODResidual:'newFar = oldFar + newNear - oldNear on common triangle subdivision'});return[];
}
function applyDetail(data,pack){if(nativeMetadata.has(pack))return pack;const terrain=new G.Terrain({...data,genbuEntry:undefined}),before=buffersOf(pack),rock=pack.meshes.find(m=>m.id==='genbu:basalt:columnar-cliffs'),moss=pack.meshes.find(m=>m.id==='genbu:mossRock:wet-ledge-moss'),water=pack.meshes.find(m=>m.id==='genbu:flowing-creek');if(!rock||!moss||!water)throw Error('Genbu native source missing');
 const list=columns(terrain),changed=applyColumns(rock,moss,list,false),tail=replaceTail(water);for(let i=0;i<list.length;i++)if(list[i].target!==list[i].h)pack.meta.columnRecords[i][3]=list[i].target;
 const sourceBytes=[...buffersOf(pack)].filter(b=>!before.has(b)).reduce((s,b)=>s+b.byteLength,0);if(sourceBytes+(data.genbuEntry?.publicSourceBytes||0)>.6*1048576)throw Error('Genbu combined public/native source budget exceeded');pack.bytes=byteCount(pack);pack.meta.genbuEntry={revision,terminalColumns:changed.map(q=>q.id),water:tail};nativeMetadata.set(pack,{revision,sourceBytes,columns:changed,water:tail,newRecords:0,newTextures:0});return pack;
}
G.buildRegion=async function(data,id,legacy){if(id!=='genbu')return originalBuildRegion(data,id,legacy);const start=performance.now(),pack=await originalBuildRegion({...data,genbuEntry:undefined},id,legacy);applyDetail(data,pack);pack.builtMs=performance.now()-start;return pack;};
G.extraOverviewBuilders.push(prepare);
G.GENBU_ENTRY=Object.freeze({revision,scope,previousHeight,previousWater,originalBuildRegion,metadata,nativeMetadata,prepare,applyDetail,profile,columns,nativeRoots,clearanceTop,tailSections,tailY,tailGeometry,bankTop,bankDirection,bankNormal,sourceRoute,routeSamples,roadPlan,sampler,contactDelta,byteCount,buffersOf});
})(globalThis.GA);
