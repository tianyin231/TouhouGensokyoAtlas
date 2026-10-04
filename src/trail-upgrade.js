/* Existing Youkai Trail: two bridge heads and bounded night-sparrow repairs.
 * All dimensions, bridge engineering and shallow recesses remain P / F/P.
 * No terrain, route, water, tree, prop or source-pack edits are performed here.
 */
(function(G){'use strict';
const ID='trail',CONTACT='trail-bridge-approaches',BOUNDS=[850,176,885,207],REVISION=3;
const BRIDGE='trail:matte:base:9:1',PROXY='overview:trail:hlod:architecture:world:3:0:matte';
const HOUSE='mystia-house:matte:base:11:2',ROAD='island:routes:trail:1:0';
const previous=G.buildRegion,originalTrail=G.buildTrail,originalMystia=G.buildMystia;
const raw=a=>new Uint32Array(a.buffer,a.byteOffset,a.length);
function same(a,b){if(a.length!==b.length)return false;const x=raw(a),y=raw(b);for(let i=0;i<x.length;i++)if(x[i]!==y[i])return false;return true;}
function bytes(meshes){const seen=new Set();let n=0;for(const m of meshes)for(const k of ['vertices','farVertices','index','instances','instanceColors'])if(m[k]&&!seen.has(m[k].buffer)){seen.add(m[k].buffer);n+=m[k].buffer.byteLength;}return n;}
function bound(m){const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(const a of [m.vertices,m.farVertices].filter(Boolean))for(let i=0;i<a.length;i+=9)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],a[i+k]);hi[k]=Math.max(hi[k],a[i+k]);}m.center=lo.map((v,i)=>(v+hi[i])/2);m.radius=G.length(G.sub(hi,lo))/2;return m;}
function profile(t){const r=G.routes.find(r=>r.id==='route-shrine'),p=r.samples.reduce((a,b)=>Math.abs(a[0]-G.streamX(a[1]))<Math.abs(b[0]-G.streamX(b[1]))?a:b),x=p[0],z=p[1],y=G.baseHeight.call(t,x,z)+.52;let last=x-7.5;for(let q=x-7.5;q<x+7.5;q+=.62)last=q;
 return{x,y,z,left:Math.fround(x-7.5-.59/2),right:Math.fround(last+.59/2),zMin:Math.fround(z-3.2),zMax:Math.fround(z+3.2),deckY:Math.fround(y+.22)};
}
function originalBridge(t,p,ramps=true){const g=new G.Geometry(),{x:cx,z:cz,y:by}=p,C=G.C;
 for(let x=cx-7.5;x<cx+7.5;x+=.62)g.box(x,by,cz,.59,.22,6.4,C.timber);
 for(const side of [-1,1]){g.box(cx,by-.42,cz+side*2.4,17,.38,.32,C.woodDark);for(let x=cx-7;x<=cx+7.1;x+=2.8)g.box(x,by+.22,cz+side*3,.18,1.12,.18,C.wood);g.tube([cx-7.7,by+1.29,cz+side*3],[cx+7.7,by+1.29,cz+side*3],.09,C.timber,6);}
 if(ramps)for(const side of [-1,1]){const x=cx+side*7.6,ex=cx+side*10.5;for(let i=0;i<5;i++){const u=i/5,v=(i+1)/5,X=G.mix(x,ex,u),XX=G.mix(x,ex,v),y=G.mix(by+.23,t.height(ex,cz)+.22,u),yy=G.mix(by+.23,t.height(ex,cz)+.22,v);g.quad([X,y,cz-3.2],[XX,yy,cz-3.2],[XX,yy,cz+3.2],[X,y,cz+3.2],C.timber);}}
 return Float32Array.from(g.a);
}
function face(g,ps,col,up){const p=G.cross(G.sub(ps[1],ps[0]),G.sub(ps[2],ps[0]));if((p[1]>=0)!==up)ps=ps.slice().reverse();g.quad(...ps,col);}
function sides(g,top,bottom,col){const area=top.reduce((n,p,i)=>{const q=top[(i+1)%top.length];return n+p[0]*q[2]-q[0]*p[2];},0);for(let i=0;i<top.length;i++){const j=(i+1)%top.length;if(area>0)g.quad(top[i],top[j],bottom[j],bottom[i],col);else g.quad(top[i],bottom[i],bottom[j],top[j],col);}}
function prism(g,top,bottom,col){face(g,top,col,true);face(g,bottom,col,false);sides(g,top,bottom,col);}
function coarseBridge(p){const g=new G.Geometry(),top=[[p.left,p.deckY,p.zMin],[p.right,p.deckY,p.zMin],[p.right,p.deckY,p.zMax],[p.left,p.deckY,p.zMax]],bottom=top.map(q=>[q[0],Math.fround(p.y),q[2]]);prism(g,top,bottom,G.C.timber);
 // All original beam/post/rail triangles keep their Float32 attributes.
 const rails=originalBridge(null,p,false).subarray(300*27),a=new Float32Array(g.a.length+rails.length);a.set(g.a);a.set(rails,g.a.length);return a;
}
function contactTriangles(m,bounds){const out=[],a=m.vertices,ix=m.index,n=ix?ix.length:a.length/9;for(let i=0;i<n;i+=3){const q=[0,1,2].map(k=>(ix?ix[i+k]:i+k)*9),xs=q.map(k=>a[k]),zs=q.map(k=>a[k+2]);if(Math.max(...xs)<bounds[0]||Math.min(...xs)>bounds[2]||Math.max(...zs)<bounds[1]||Math.min(...zs)>bounds[3])continue;for(const k of q)out.push(a[k],a[k+1],a[k+2]);}return Float32Array.from(out);}
function roadSection(m,p,side){const route=G.routes.find(r=>r.id==='route-shrine'),ps=route.samples,target=p.x+side*11.5;let sample=1;
 if(side<0){sample=-1;let closest=Infinity;for(let i=1;i<ps.length-2;i++){const a=ps[i];if(a[0]<BOUNDS[0]||a[0]>=p.left||a[1]<BOUNDS[1]||a[1]>BOUNDS[3])continue;const dx=ps[i+1][0]-ps[i-1][0],dz=ps[i+1][1]-ps[i-1][1],len=Math.hypot(dx,dz),edge=[-1,1].map(s=>[Math.fround(a[0]-dz/len*s*2.5),Math.fround(a[1]+dx/len*s*2.5)]);if(!edge.every(q=>q[0]>=BOUNDS[0]&&q[0]<p.left&&q[1]>=BOUNDS[1]&&q[1]<=BOUNDS[3]))continue;const distance=Math.hypot(a[0]-p.left,a[1]-p.z);if(distance<closest){closest=distance;sample=i;}}if(sample<0)throw Error('Trail bridge has no complete original west road section');}
 else for(let i=2;i<ps.length-2;i++)if(Math.abs(ps[i][0]-target)<Math.abs(ps[sample][0]-target))sample=i;
 const a=ps[sample],b=ps[sample+1],prev=ps[sample-1],dx=b[0]-prev[0],dz=b[1]-prev[1],len=Math.hypot(dx,dz),normal=[-dz/len,dx/len],expected=[-1,1].map(s=>[Math.fround(a[0]+normal[0]*s*2.5),Math.fround(a[1]+normal[1]*s*2.5)]),v=m.vertices,ix=m.index;
 for(let i=0;i<ix.length;i+=6){const q=[ix[i]*9,ix[i+1]*9];if(q.every((k,j)=>v[k]===expected[j][0]&&v[k+2]===expected[j][1]))return{side,sample,indexOffset:i,selection:side<0?'nearest complete original west section':'original east section',points:q.map(k=>Array.from(v.subarray(k,k+3)))};}
 throw Error('Trail bridge needs the exact public road cross-section');
}
function prepare(data,pack){if(data.trailUpgrade?.revision===REVISION)return data.trailUpgrade;const start=performance.now(),t=new G.Terrain(data),p=profile(t),road=pack.meshes.find(m=>m.id===ROAD);
 if(!road?.index||road.component!=='connection-road'||!road.globalSurface||road.pathOwner!=='trail')throw Error('Trail public road source missing');
 const terrain=G.SurfaceContact.prepare(data,pack,CONTACT,BOUNDS),sections=[-1,1].map(s=>roadSection(road,p,s)),roadTriangles=contactTriangles(road,BOUNDS),terrainIds={};
 for(const lod of ['near','far']){const far=lod==='far',tile=pack.meshes.find(m=>m.component==='island-terrain'&&!m.cutOnly&&m.index&&!!m.globalFar===far&&m.tile[0]===768&&m.tile[1]===0);if(!tile)throw Error('Trail bridge terrain 768:0 missing: '+lod);terrainIds[lod]=tile.id;}
 const sourceBytes=terrain.near.byteLength+terrain.far.byteLength+roadTriangles.byteLength;
 data.trailUpgrade={revision:REVISION,bridge:p,sections,roadTriangles,terrainIds,sourceBytes,prepareMs:performance.now()-start};return data.trailUpgrade;
}
// Clip actual terrain triangles against one convex support footprint. This
// includes intersections/extrema, rather than assuming four corners suffice.
function clipped(a,points){let area=0;for(let i=0;i<points.length;i++){const p=points[i],q=points[(i+1)%points.length];area+=p[0]*q[1]-q[0]*p[1];}const sign=Math.sign(area),out=[];
 for(let i=0;i<a.length;i+=9){let poly=[Array.from(a.subarray(i,i+3)),Array.from(a.subarray(i+3,i+6)),Array.from(a.subarray(i+6,i+9))];for(let k=0;k<points.length;k++){const p=points[k],q=points[(k+1)%points.length],dx=q[0]-p[0],dz=q[1]-p[1],d=v=>sign*(dx*(v[2]-p[1])-dz*(v[0]-p[0])),next=[];for(let j=0;j<poly.length;j++){const v=poly[j],w=poly[(j+1)%poly.length],dv=d(v),dw=d(w);if(dv>=-1e-9)next.push(v);if((dv>=-1e-9)!==(dw>=-1e-9)){const u=dv/(dv-dw);next.push(v.map((x,h)=>x+(w[h]-x)*u));}}poly=next;if(!poly.length)break;}if(poly.length>=3)out.push(...poly);}
 if(!out.length)throw Error('Trail support has no terrain contact');return out;
}
function height(a,x,z){for(let i=0;i<a.length;i+=9){const j=i+3,k=i+6,d=(a[j+2]-a[k+2])*(a[i]-a[k])+(a[k]-a[j])*(a[i+2]-a[k+2]);if(Math.abs(d)<1e-10)continue;const u=((a[j+2]-a[k+2])*(x-a[k])+(a[k]-a[j])*(z-a[k+2]))/d,v=((a[k+2]-a[i+2])*(x-a[k])+(a[i]-a[k])*(z-a[k+2]))/d,w=1-u-v;if(Math.min(u,v,w)>=-1e-5)return u*a[i+1]+v*a[j+1]+w*a[k+1];}throw Error('Trail contact missed '+x+','+z);}
function insideTriangle(a,x,z){const d=(a[5]-a[8])*(a[0]-a[6])+(a[6]-a[3])*(a[2]-a[8]),u=((a[5]-a[8])*(x-a[6])+(a[6]-a[3])*(z-a[8]))/d,v=((a[8]-a[2])*(x-a[6])+(a[0]-a[6])*(z-a[8]))/d;return Math.min(u,v,1-u-v)>=.015;}
function approaches(data,pack,far=false){const config=data.trailUpgrade;if(!config)throw Error('Trail bridge contacts were not prepared');const lod=far?'far':'near',terrain=data.surfaceContacts[CONTACT][lod],p=config.bridge,g=new G.Geometry(),heads=[];
 for(const section of config.sections){const side=section.side,inner=[[side<0?p.left:p.right,p.deckY,p.zMin],[side<0?p.left:p.right,p.deckY,p.zMax]],outer=section.points,rows=far?2:4,cols=rows,top=[];
  // The retained17m beam extends .705m beyond the original board edge. Move
  // the existing first west section to u=.4 and keep its shell bottom above
  // that beam before descending to the unchanged original road section.
  const collar=side<0?{u:.4,topY:p.y+.16}:null;
  const point=(u,v)=>{const A=inner[0].map((x,k)=>G.mix(x,inner[1][k],v)),B=outer[0].map((x,k)=>G.mix(x,outer[1][k],v));if(!collar)return A.map((x,k)=>G.mix(x,B[k],u));const first=1/rows,after=u<=first?0:(u-first)/(1-first),s=u<=first?collar.u*u/first:G.mix(collar.u,1,after),q=A.map((x,k)=>G.mix(x,B[k],s));q[1]=u<=first?G.mix(p.deckY,collar.topY,u/first):G.mix(collar.topY,B[1],after);return q;},topStart=g.a.length;
  for(let r=0;r<=rows;r++){const row=[];for(let c=0;c<=cols;c++)row.push(point(r/rows,c/cols));top.push(row);}
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)face(g,[top[r][c],top[r+1][c],top[r+1][c+1],top[r][c+1]],G.mul(G.C.timber,r%2?.97:1.03),true);
  const topTriangles=contactTriangles({vertices:Float32Array.from(g.a.slice(topStart))},BOUNDS);
  // Identical tessellation on both faces keeps .18m thickness through the
  // twisted ramp; an underside fan would represent a different surface.
  const bottomStart=g.a.length;for(let i=topStart;i<bottomStart;i+=27){const point=k=>[g.a[i+k],g.a[i+k+1]-.18,g.a[i+k+2]];g.tri(point(0),point(18),point(9),G.C.woodDark);}
  const border=[...top[0],...top.slice(1).map(r=>r[cols]),...top[rows].slice(0,cols).reverse(),...top.slice(1,rows).reverse().map(r=>r[0])],bottom=border.map(q=>[q[0],q[1]-.18,q[2]]);
  sides(g,border,bottom,G.C.wood);
  const start=g.a.length,footings=[];
  for(const v of [.18,.82]){const target=point(.25,v);let closest=null,distance=Infinity;for(let i=0;i<topTriangles.length;i+=9){const tri=topTriangles.subarray(i,i+9),center=[(tri[0]+tri[3]+tri[6])/3,(tri[2]+tri[5]+tri[8])/3],d=(center[0]-target[0])**2+(center[1]-target[2])**2;if(d<distance){distance=d;closest={tri,center,index:i/9};}}
   let scale=1,pts;for(let attempt=0;attempt<20;attempt++){pts=[[-.22,-.34],[.22,-.34],[.22,.34],[-.22,.34]].map(q=>[closest.center[0]+q[0]*scale,closest.center[1]+q[1]*scale]);if(pts.every(q=>insideTriangle(closest.tri,...q)))break;scale*=.8;}
   if(.44*scale<.12||.68*scale<.18||!pts.every(q=>insideTriangle(closest.tri,...q)))throw Error('Trail bearing cannot fit one actual ramp plane');
   const ground=clipped(terrain,pts),base=Math.min(...ground.map(q=>q[1]))-.08,upper=pts.map(q=>[q[0],height(closest.tri,q[0],q[1])-.18,q[1]]),under=pts.map(q=>[q[0],base,q[1]]);if(upper.some(q=>q[1]<=base))throw Error('Trail bearing has no ground clearance');prism(g,upper,under,G.C.wood);footings.push({points:pts,bottom:base,top:upper,terrainMin:Math.min(...ground.map(q=>q[1])),terrainMax:Math.max(...ground.map(q=>q[1])),width:.44*scale,depth:.68*scale,centerShift:Math.sqrt(distance),rampTriangle:closest.index});}
  heads.push({side,inner,outer,points:[inner[0],outer[0],outer[1],inner[1]],rows,cols,shellThickness:.18,collar,topFloatOffset:topStart,topFloats:rows*cols*2*27,bottomFloatOffset:bottomStart,footings,footingFloatOffset:start});
 }
 const terrainSource=config.terrainIds[lod],source=pack.meshes.find(m=>m.id===terrainSource);if(!source)throw Error('Trail terrain source missing');const m=g.mesh('trail:public:bridge-approaches:'+lod,'architecture',{material:'matte',owner:'island',region:'island',space:'surface',globalSurface:true,overview:true,component:CONTACT,basis:'P',globalNear:!far,globalFar:far,terrainSource,terrainTile:source.tile.slice(),trailHeads:heads});
 if(heads.flatMap(h=>h.points).some(q=>Math.floor(q[0]/256)!==3||Math.floor(q[2]/256)!==0))throw Error('Trail approaches crossed their one terrain tile');return m;
}
function kitchen(g,repaired=false){const C=G.C;if(!repaired){g.box(0,.52,-2.8,13.4,4.4,5.2,C.plaster);}else{
  // Boundary of the same nine-box volume, with no internal contact lids.
  // In particular the rear plaster wall is one continuous original plane.
  const emit=(p,s)=>{if(s<0)p.reverse();g.quad(...p,C.plaster);},
   xy=(a,b,c,d,z,s)=>emit([[a,c,z],[b,c,z],[b,d,z],[a,d,z]],s),
   xz=(a,b,c,d,y,s)=>emit([[a,y,c],[a,y,d],[b,y,d],[b,y,c]],s),
   yz=(a,b,c,d,x,s)=>emit([[x,a,c],[x,b,c],[x,b,d],[x,a,d]],s);
  xy(-6.7,6.7,.52,4.92,-5.4,-1);xz(-6.7,6.7,-5.4,-.2,.52,-1);xz(-6.7,6.7,-5.4,-.2,4.92,1);
  xy(-6.7,6.7,.52,1.5,-.2,1);xy(-6.7,6.7,3.15,4.92,-.2,1);
  for(const [a,b]of [[-6.7,-6.3],[6.3,6.7]])xy(a,b,1.5,3.15,-.2,1);
  xy(-6.3,6.3,1.5,3.15,-.75,1);yz(1.5,3.15,-.75,-.2,-6.3,1);yz(1.5,3.15,-.75,-.2,6.3,-1);
  xz(-6.3,6.3,-.75,-.2,1.5,1);xz(-6.3,6.3,-.75,-.2,3.15,-1);
  for(const s of [-1,1]){const a=s<0?-6.7:6.15,b=s<0?-6.15:6.7;
   yz(.52,1.5,-5.4,-.2,s*6.7,s);yz(3.15,4.92,-5.4,-.2,s*6.7,s);
   yz(1.5,3.15,-5.4,-3.9,s*6.7,s);yz(1.5,3.15,-1.5,-.2,s*6.7,s);yz(1.5,3.15,-3.9,-1.5,s*6.15,s);
   xy(a,b,1.5,3.15,-3.9,1);xy(a,b,1.5,3.15,-1.5,-1);xz(a,b,-3.9,-1.5,1.5,1);xz(a,b,-3.9,-1.5,3.15,-1);
  }
 }
 g.box(0,.60,-.14,13.4,.92,.18,C.wood);g.box(0,3.10,-.14,13.4,1.40,.18,C.wood);
 g.box(0,1.28,repaired?-.735:-.22,12.6,1.78,repaired?.025:.055,C.shadow);
 for(const x of [-6.5,-3.2,0,3.2,6.5])g.box(x,.50,.02,.20,4.70,.24,C.woodDark);
 for(const x of [-6.75,6.75]){if(!repaired){g.box(x,.55,-2.7,.24,4.37,5.25,C.wood);G.windowPanel(g,x,1.5,-2.7,2.4,1.65,Math.sign(x)*Math.PI/2);}else{
   g.box(x,.55,-2.7,.24,.95,5.25,C.wood);g.box(x,3.15,-2.7,.24,1.77,5.25,C.wood);g.box(x,1.5,-4.6125,.24,1.65,1.425,C.wood);g.box(x,1.5,-.7875,.24,1.65,1.425,C.wood);
   const origin=g.origin.slice(),angle=g.angle,pt=g.point([x,1.5,-2.7]);g.place(...pt,angle+Math.sign(x)*Math.PI/2);
   for(const s of [-1,1])g.box(s*1.125,0,0,.15,1.65,.12,C.woodDark);g.box(0,0,0,2.4,.13,.12,C.woodDark);g.box(0,1.52,0,2.4,.13,.12,C.woodDark);g.box(0,.13,-.53,2.15,1.39,.05,C.paper);
   for(let xx=-1.2;xx<=1.21;xx+=.32)g.box(xx,0,.14,.048,1.65,.072,C.timber);for(let yy=.1;yy<1.65;yy+=.54)g.box(0,yy,.15,2.4,.047,.067,C.wood);g.place(...origin,angle);
  }}
}
const awningY=z=>3.72+(6.9-z)/(6.9-2.6)*.76;
function awning(g,repaired=false){const C=G.C,blue=G.rgb('#455f69');for(const x of [-10.6,10.6,-5,5]){if(repaired){const pts=[[x-.095,5.905],[x+.095,5.905],[x+.095,6.095],[x-.095,6.095]],top=pts.map(p=>[p[0],awningY(p[1])-.16,p[1]]),bottom=pts.map(p=>[p[0],.51,p[1]]);prism(g,top,bottom,C.wood);}else g.box(x,.51,6,.19,3.20,.19,C.wood);g.tube([x,2.55,6],[x,repaired?awningY(4.5)-.16:3.9,4.5],.085,C.timber,4);}
 const top=[[-11,3.72,6.9],[11,3.72,6.9],[11,4.48,2.6],[-11,4.48,2.6]];g.quad(...top,blue);if(repaired){const bottom=top.map(p=>[p[0],p[1]-.16,p[2]]);face(g,bottom,blue,false);for(let i=0;i<4;i++){const j=(i+1)%4;g.quad(top[i],bottom[i],bottom[j],top[j],blue);}}
}
function segment(build,x,y,z){const g=new G.Geometry().place(x,y,z,Math.PI);build(g);return Float32Array.from(g.a);}
function replaceSegments(source,patches){const a=raw(source),found=[];for(const patch of patches){const b=raw(patch.before);let start=-1;for(let i=0;i+b.length<=a.length;i+=27){if(a[i]!==b[0]||a[i+1]!==b[1]||a[i+2]!==b[2])continue;let yes=true;for(let k=0;k<b.length;k++)if(a[i+k]!==b[k]){yes=false;break;}if(yes){if(start>=0)throw Error('Trail local segment is ambiguous');start=i;}}if(start<0)throw Error('Trail original '+patch.name+' changed; review targeted repair');found.push({...patch,start,end:start+b.length});}
 found.sort((a,b)=>a.start-b.start);let cursor=0,length=source.length;for(const p of found){if(p.start<cursor)throw Error('Trail repairs overlap');cursor=p.end;length+=p.after.length-p.before.length;}const out=new Float32Array(length);cursor=0;let dest=0;for(const p of found){out.set(source.subarray(cursor,p.start),dest);dest+=p.start-cursor;out.set(p.after,dest);dest+=p.after.length;cursor=p.end;}out.set(source.subarray(cursor),dest);return{vertices:out,patches:found.map(p=>({name:p.name,start:p.start,end:p.end,newFloats:p.after.length}))};
}
function upgradeDetail(pack,data){const config=data.trailUpgrade;if(!config)throw Error('Trail contact prepare must run before detail construction');const p=config.bridge,t=new G.Terrain(data),bridge=pack.meshes.find(m=>m.id===BRIDGE),house=pack.meshes.find(m=>m.id===HOUSE);
 if(!bridge||bridge.index||bridge.material!=='matte'||!same(bridge.vertices,originalBridge(t,p)))throw Error('Trail pure bridge source changed');if(!house||house.index||house.material!=='matte')throw Error('Trail mixed night-sparrow source changed');
 const native=bound({...bridge,vertices:bridge.vertices.slice(0,504*27),farVertices:coarseBridge(p),lodDistance:125,component:'trail-bridge',basis:'P'}),[x,y,z]=pack.meta.mystia.position;
 const patches=[{name:'kitchen',before:segment(g=>kitchen(g),x,y,z),after:segment(g=>kitchen(g,true),x,y,z)},{name:'awning',before:segment(g=>awning(g),x,y,z),after:segment(g=>awning(g,true),x,y,z)}],repaired=replaceSegments(house.vertices,patches),building=bound({...house,vertices:repaired.vertices,trailRepairs:repaired.patches});
 const meshes=pack.meshes.map(m=>m===bridge?native:m===house?building:m);return{...pack,meshes,bytes:bytes(meshes),meta:{...pack.meta,trailUpgrade:{revision:REVISION,sourceBytes:bytes(pack.meshes),bridgeNativeTriangles:504,bridgeFarTriangles:native.farVertices.length/27,housePatches:repaired.patches,basis:'P: bridge engineering; F/P: existing yatai shallow windows and awning'}}};
}
function publicEnvironment(data,pack){prepare(data,pack);const old=pack.meshes.find(m=>m.id===PROXY);if(!old||old.owner!==ID||old.material!=='matte'||!old.index||old.index.length!==454*3)throw Error('Trail pure bridge overview changed');
 const proxy=bound({...old,vertices:coarseBridge(data.trailUpgrade.bridge),component:'trail-bridge-proxy',basis:'P'});delete proxy.index;pack.meshes[pack.meshes.indexOf(old)]=proxy;return[approaches(data,pack),approaches(data,pack,true)];
}
G.TRAIL_UPGRADE={id:ID,revision:REVISION,bridgeId:BRIDGE,proxyId:PROXY,houseId:HOUSE,roadId:ROAD,contactId:CONTACT,bounds:BOUNDS.slice(),profile,prepare,approaches,publicEnvironment,upgradeDetail,originalBridge,coarseBridge,kitchen,awning,awningY,replaceSegments,same,bytes,clipped,height,originalBuildRegion:previous,originalBuildTrail:originalTrail,originalBuildMystia:originalMystia};
G.buildRegion=async function(data,id,legacy){if(id!==ID)return previous(data,id,legacy);const start=performance.now(),pack=await previous(data,id,legacy),originalEnd=performance.now(),result=upgradeDetail(pack,data);result.builtMs=performance.now()-start;result.meta.trailUpgrade.timings={originalBuildMs:originalEnd-start,upgradeMs:performance.now()-originalEnd};return result;};
G.extraOverviewBuilders=[...(G.extraOverviewBuilders||[]),publicEnvironment];
})(globalThis.GA);
