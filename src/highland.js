/* False Heaven Shelf and a temporary gambling den. TH18 / Lotus Eaters 29–30.
 * P: placement, terrain shoulder, paths, all dimensions and unseen faces.
 * Public ground persists independently of regional detail lifetime. */
(function(G){'use strict';
const ID='highland',CX=-1120,CZ=-1835,Y=738,TAU=Math.PI*2;
const C=Object.fromEntries(Object.entries({grass:'#709a82',pale:'#9aaa89',soil:'#aa9c7d',rock:'#89928e',snow:'#e1e9df',wood:'#70543e',beam:'#9c7651',dark:'#3c3931',wall:'#c8c4a5',roof:'#526d70',edge:'#86958d',paper:'#e9dec0',red:'#9c4d53',gold:'#b4a072',iron:'#4d585a',flower:'#c489a9',white:'#e5e1c8'}).map(([k,v])=>[k,G.rgb(v)]));
const bounds={x0:-1310,x1:-930,z0:-2015,z1:-1655};
const baseHeight=G.Terrain.prototype.height;
const weight=(x,z)=>1-G.smooth(.61,1,Math.hypot((x-CX)/186,(z-CZ)/175));
function height(t,x,z){const h=baseHeight.call(t,x,z),w=weight(x,z),target=Y+1.2*Math.sin((x-CX)/83)*Math.sin((z-CZ)/75);const d=target-h,b=24,raise=d<=-b?0:d>=b?d:(d+b)*(d+b)/(4*b);return h+raise*w;}
G.Terrain.prototype.height=function(x,z){return height(this,x,z);};
const main=G.spline([[-956,-1109],[-1118,-1135],[-1260,-1210],[-1410,-1370],[-1450,-1550],[-1370,-1730],[-1260,-1780],[-1190,-1789],[-1120,-1811]],3);
const paths=[main,G.spline([[-1190,-1789],[-1220,-1840],[-1190,-1900],[-1100,-1920],[-1030,-1910],[-1000,-1870],[-1015,-1800]],3),G.spline([[-1190,-1789],[-1209,-1783]],2),G.spline([[-1000,-1870],[-1044,-1874]],2)];
const block={id:ID,name:'伪天棚 · 驹草旧屋群',poly:[[-1300,-2010],[-935,-2010],[-935,-1660],[-1300,-1660]],center:[CX,Y,CZ],bottom:10,step:8};
G.DIORAMA.blocks.push(block);G.DIORAMA.map.set(ID,block);G.REGION_LABELS[ID]=block.name;
const oldOwner=G.DIORAMA.owner;G.DIORAMA.owner=(x,z)=>weight(x,z)>.2?ID:oldOwner(x,z);
const v=(label,e,t,extra={})=>({label,eye:[e[0]+CX,e[1]+Y,e[2]+CZ],target:[t[0]+CX,t[1]+Y,t[2]+CZ],region:ID,space:'surface',era:'TH18高地／醉蝶华29–30话选景；地表位置P',...extra});
const views={
 shelfOverview:v('伪天棚 · 残雪高地',[-265,184,228],[0,5,-12],{fov:47}),
 shelfApproach:v('高地 · 入庭山路',[-135,40,113],[-29,4,31]),
 shelfFlowers:v('高地 · 驹草与漂砾',[54,3.1,31],[50,1.0,23],{fov:53}),
 shelfSnow:v('高地 · 残雪山肩',[94,65,-106],[20,7,-54]),
 shelfRuins:v('高地 · 轮换的旧屋',[-147,35,83],[-86,7,38]),
 denFront:v('驹草赌场 · 开设之日',[56,35,69],[0,7,0]),
 denRear:v('旧屋 · 背墙与支撑',[62,29,-58],[0,7,-1]),
 denHall:v('旧屋 · 桌案与梁架',[18,7.2,9],[-7,5.3,-5],{fov:62,highlandInterior:true}),
 denTable:v('旧屋 · 赌具近景',[-6,5.2,8],[-8,3.7,0],{fov:51,highlandInterior:true}),
 denPipe:v('旧屋 · 门前龙形烟管',[8,11.5,25],[0,9.5,16],{fov:45}),
 denSection:v('旧屋 · 可恢复剖览',[40,43,48],[0,5,-1],{highlandSection:true}),
 denClosed:v('高地旧屋 · 散场之后',[56,35,69],[0,7,0],{highlandClosed:true}),
 shelfConnection:{label:'山路 · 与原有登山路相接',eye:[-985,551,-1102],target:[-1060,515,-1140],region:ID,space:'surface',era:'P高地连接山路'},
};Object.assign(G.PRESETS,views);Object.assign(G.IMPLEMENTED,{false_ceiling:'shelfOverview',casino:'denFront'});G.LANDMARKS.partial.add('false_ceiling');
function bank(far){const b=new Map();return{get(zone,mat='Wood',part='base',group='architecture'){const k=[zone,mat,part].join(':');if(!b.has(k))b.set(k,{g:new G.Geometry(),zone,mat,part,group});return b.get(k).g.place();},finish(){const meshes=[];for(const[k,o]of b)if(o.g.a.length)meshes.push(o.g.mesh(`${ID}:${far?'overview':'detail'}:${k}`,o.group,{owner:ID,region:ID,space:'surface',overview:far,material:'shelf'+o.mat,highlandZone:o.zone,highlandPart:o.part,basis:'P'}));return{id:ID,meshes,bytes:meshes.reduce((s,m)=>s+m.vertices.byteLength,0),signs:[],meta:{version:'0.29.0',locations:['false_ceiling','casino'],source:'TH18 / LE29–30 text and scene index; all modeling P',permanentCasino:false,physicalMineConnection:false}};}};}
function stone(g,x,y,z,r,h,seed){const n=7,p=Array.from({length:n},(_,i)=>{let a=i*TAU/n;return[x+r*Math.cos(a)*(1+.13*Math.sin(i+seed)),y,z+r*.72*Math.sin(a)];}),q=p.map((v,i)=>[x+(v[0]-x)*.64,y+h*(.91+.09*Math.sin(i+seed)),z+(v[2]-z)*.7]);for(let i=0;i<n;i++)g.quad(p[i],q[i],q[(i+1)%n],p[(i+1)%n],C.rock);for(let i=1;i<n-1;i++)g.tri(q[0],q[i],q[i+1],C.rock);}
function beam(g,a,b,r,col=C.wood){g.tube(a,b,r,col,4);}
function roof(B,zone,x,y,z,w,d,far,broken=false){const g=B.get(zone,'Roof','roof'),r=B.get(zone,'Edge','roof'),wood=B.get(zone,'Wood','roof'),h=d*.29;
 for(const side of[-1,1]){const rows=far?1:3;for(let j=0;j<rows;j++){let a=j/rows,b=(j+1)/rows;const P=(xx,t)=>[x+xx,y+h*(1-t)+.8*t*t,z+side*d*.5*t];if(broken&&side===1){g.quad(P(-w/2,a),P(-w/2,b),P(-w*.2,b),P(-w*.2,a),C.roof);g.quad(P(w*.08,a),P(w*.08,b),P(w/2,b),P(w/2,a),C.roof);}else g.quad(P(-w/2,a),P(-w/2,b),P(w/2,b),P(w/2,a),C.roof);}
  r.box(x,y+.48,z+side*d/2,w,.65,.75,C.edge);
  if(!far)for(let xx=-w/2+.65;xx<w/2;xx+=1.25){if(broken&&side===1&&xx>-w*.2&&xx<w*.08)continue;beam(r,[x+xx,y+h+.12,z],[x+xx,y+.97,z+side*d/2],.13,C.edge);}
  for(const s of[-1,1]){beam(wood,[x+s*w/2,y+.4,z+side*d/2],[x+s*w/2,y+h,z],.37,C.wood);}
 }
 r.box(x,y+h,z,w+1,.58,.72,C.edge);
 wood.box(x,y-.26,z,w-3,.35,d-4,C.dark);
 if(broken){/* roof breach shows exposed rafters, not a flat dark decal */for(let dx=-w*.2;dx<w*.08;dx+=1.8)beam(wood,[x+dx,y+h-.2,z],[x+dx,y+.4,z+d/2],.22,C.wood);}
}
function house(B,t,x,z,w,d,far,ruin=0){const zone=ruin?'ruin'+ruin:'den',base=t.height(x,z),floor=base+2.0,top=floor+(ruin?8:11),s=B.get(zone,'Stone'),g=B.get(zone,'Wood'),wall=B.get(zone,'Wall'),paper=B.get(zone,'Paper');
 s.box(x,base-1.0,z,w+2,2.9,d+2,C.rock);g.box(x,floor-.2,z,w,.3,d,C.wood);g.box(x,floor-.45,z+d/2+2.1,w+3,.55,4.5,C.wood);for(let dx=-w/2;dx<=w/2;dx+=7){s.box(x+dx,base-.25,z+d/2+2.8,1.0,1.8,1.0,C.rock);}
 for(let i=0;i<4;i++)s.box(x,base-.10,z+d/2+6-i*1.15,8,.5*(i+1),1.2,C.rock);
 // Real door openings, inset side windows, and independent supports on all faces.
 const n=Math.max(4,Math.round(w/8)),bay=w/n;
 for(const side of[-1,1])for(let i=0;i<=n;i++){const xx=x-w/2+i*bay,zz=z+side*d/2;g.box(xx,floor,zz,.64,top-floor,.75,C.wood);}
 for(const side of[-1,1]){
  for(let i=0;i<n;i++){const xx=x-w/2+(i+.5)*bay,zz=z+side*d/2,door=side===1&&i>=n/2-1&&i<=n/2;if(door)continue;
   if(ruin&&side===1&&i===1)continue;
   wall.box(xx,floor,zz,bay-.64,2.2,.70,C.wall);wall.box(xx,top-2,zz,bay-.64,2,.70,C.wall);
   if(far||!ruin)paper.box(xx,floor+2.2,zz-.10,bay-1,top-floor-4.2,.12,C.paper);
   else for(let k=0;k<5;k++){if(ruin&&k===2)continue;g.box(xx-bay/2+1+k*(bay-2)/4,floor+2.2,zz,.22,top-floor-4.2,.5,C.wood);}
  }
  g.box(x,top-.55,z+side*d/2,w+2,.7,1.0,C.beam);
 }
 for(const side of[-1,1]){const xx=x+side*w/2;wall.box(xx,floor,z,.7,2.5,d,C.wall);wall.box(xx,top-2,z,.7,2,d,C.wall);for(let zz=-d/2;zz<=d/2;zz+=4){g.box(xx,floor+2.5,z+zz,.7,top-floor-4.5,.38,C.wood);}
  // Gable ends are enclosed; diagonal bracing has both endpoints on timber.
  wall.tri([xx,top,z-d/2],[xx,top,z+d/2],[xx,top+(d+6)*.29,z],C.wall);
  beam(g,[xx+.42*side,floor+.4,z-d*.42],[xx+.42*side,top-.6,z+d*.38],.24);
 }
 roof(B,zone,x,top+.25,z,w+6,d+6,far,ruin===1);
 if(!ruin&&!far){
  const f=B.get('inside','Wood','interior');for(let xx=x-w/2+.5;xx<x+w/2;xx+=2.3)f.box(xx,floor+.03,z,2.15,.10,d-1,C.beam);
  for(let xx=x-w/2+6;xx<x+w/2;xx+=9){f.box(xx,top-.9,z,1,.9,d+1,C.wood);for(const sz of[-1,1])beam(f,[xx,top-1,z+sz*d*.4],[xx,top+3.1,z],.28);}
  for(const[dx,dz]of[[-14,-7],[10,-7],[-8,5],[16,5]]){let py=floor+.25;const f=B.get('furnishings','Wood','session');f.box(x+dx,py,z+dz,9,1.05,5.5,C.dark);f.box(x+dx,py+1.05,z+dz,9.3,.24,5.8,C.beam);for(const side of[-1,1])B.get('inside','Cloth','session').box(x+dx,py,z+dz+side*4,4.3,.28,2.4,C.red);
   const q=B.get('tokens','Paper','session');for(let k=0;k<6;k++)q.box(x+dx-2.5+(k%3)*1.25,py+1.3,z+dz-1+(k>=3?1.2:0),.7,.025,1,C.paper);
   for(const k of[0,1]){let px=x+dx+2.6+k*.6,pz=z+dz+.8;q.box(px,py+1.3,pz,.44,.44,.44,C.paper);B.get('tokens','Dark','session').cone(px,py+1.745,pz,.055,.055,.01,C.dark,8);}
  }
  const q=B.get('service','Wood','session');q.box(x+23,floor,z-10,4,4,5,C.wood);q.box(x+23,floor+4.05,z-10,4.5,.25,5.2,C.beam);
  // Warm paper fixtures are not a claim to exact historic lighting equipment.
  for(const xx of[-17,17]){const l=B.get('lamps','Lamp','session');l.box(x+xx,top-3.8,z-2,1.5,2.0,1.5,C.paper);g.tube([x+xx,top-.7,z-2],[x+xx,top-1.8,z-2],.06,C.dark,5);}
 }
 return{floor,top,x,z,w,d};}
function dragon(B,x,y,z,far){const g=B.get('marker','Metal','session');const nodes=[[x-3,y+.7,z],[x-1.4,y+1.1,z+.35],[x,y+.7,z],[x+1.4,y+1.25,z],[x+2.6,y+.8,z]];for(let i=0;i<nodes.length-1;i++)g.tube(nodes[i],nodes[i+1],.22,C.gold,far?5:8);g.box(x+2.7,y+.5,z,.85,.65,.7,C.gold);for(const side of[-1,1])g.tube([x+2.55,y+1.05,z+side*.22],[x+2.22,y+1.7,z+side*.4],.09,C.gold,5);g.tube([x-1.7,y+1.1,z],[x-1.7,y+3,z],.04,C.dark,5);g.tube([x+1.1,y+1.15,z],[x+1.1,y+3,z],.04,C.dark,5);}
function flower(g,x,y,z,s,col,far){
 const count=far?3:7,p=t=>[x+s*(.04*t+.63*t*t),y+s*(1.8*t-t*t),z];
 for(let i=0;i<count;i++)g.tube(p(i/count),p((i+1)/count),.021*s,C.grass,far?4:5);
 if(far){for(const side of[-1,1])g.tri([x+.62*s,y+.90*s,z],[x+(.62+side*.25)*s,y+.66*s,z+.04*s],[x+(.62+side*.06)*s,y+.34*s,z],col);}
 else for(const side of[-1,1]){
  const layers=[[.91,0],[.85,.10],[.70,.15],[.49,.10],[.35,.03],[.31,0]],n=8;
  const at=(j,i)=>{const [h,r]=layers[j],a=i*TAU/n;return[x+s*(.62+side*(.07+.08*Math.sin(j/5*Math.PI))+Math.cos(a)*r),y+s*h,z+s*Math.sin(a)*r*.68];};
  for(let j=0;j<layers.length-1;j++)for(let i=0;i<n;i++){if(!j)g.tri(at(j,0),at(j+1,i),at(j+1,i+1),col);else if(j===layers.length-2)g.tri(at(j,i),at(j+1,0),at(j,i+1),G.blend(col,C.white,.15));else g.quad(at(j,i),at(j+1,i),at(j+1,i+1),at(j,i+1),col);}
 }
 for(let k=0;k<(far?2:5);k++){const a=k*TAU/(far?2:5),dx=Math.cos(a),dz=Math.sin(a);for(let j=1;j<=(far?1:3);j++){const t=j/3,px=x+dx*s*t*.65,pz=z+dz*s*t*.65;for(const side of[-1,1])g.tri([px,y+s*.11,pz],[px+dx*s*.12-dz*side*s*.14,y+s*(.16+t*.08),pz+dz*s*.12+dx*side*s*.14],[px+dx*s*.28,y+s*.13,pz+dz*s*.28],C.grass);}}
}
function build(t,far=false){const B=bank(far),R=G.rng(290929);const home=house(B,t,CX,CZ,58,32,far);house(B,t,CX-89,CZ+32,26,21,far,1);house(B,t,CX+76,CZ-54,23,17,far,2);
 dragon(B,CX,home.floor+7,CZ+18,far);
 for(let i=0;i<(far?24:83);i++){const x=CX+(R()-.5)*295,z=CZ+(R()-.5)*246;if(Math.abs(x-CX)<40&&Math.abs(z-CZ)<29)continue;stone(B.get('boulders','Stone'),x,t.height(x,z),z,1.2+R()*2.3,1+R()*2.6,i);}
 const plants=B.get('alpine','Leaf','plants','vegetation');for(let i=0;i<(far?160:950);i++){const x=CX+(R()-.5)*307,z=CZ+(R()-.5)*259;if(footprint(x,z)||pathDistance(x,z)<4)continue;flower(plants,x,t.height(x,z)+.07,z,.32+R()*.70,i%4?C.flower:C.white,far||Math.hypot(x-CX-49,z-CZ-23)>36);}
 for(let j=0;j<(far?6:24);j++){const a=j*2.4,x=CX+49+Math.cos(a)*(1+j/9),z=CZ+23+Math.sin(a)*(1+j/9);flower(plants,x,t.height(x,z)+.07,z,.85+(j%3)*.1,C.flower,far);}
 if(!far){const smoke=B.get('smoke','Smoke','session','effects');for(let k=0;k<3;k++){const yy=home.floor+4+k*1.1;smoke.quad([CX-21,yy,CZ-10],[CX+21,yy,CZ-10],[CX+21,yy+2,CZ+8],[CX-21,yy+2,CZ+8],C.paper);}}
 const p=B.finish();p.meta.house=home;return p;
}
function footprint(x,z){return Math.abs(x-CX)<35&&Math.abs(z-CZ)<25||Math.abs(x-CX+89)<17&&Math.abs(z-CZ-32)<15||Math.abs(x-CX-76)<16&&Math.abs(z-CZ+54)<12;}
function pathDistance(x,z){let best=1e9;for(const p of paths)for(let i=0;i<p.length;i+=4)best=Math.min(best,Math.hypot(x-p[i][0],z-p[i][1]));return best;}
function groundColor(t,x,z,h,n){const w=weight(x,z),base=G.ISLAND.surfaceColor(t,x,z,h,n),snow=G.smooth(CZ-36,CZ-108,z)*(1-G.smooth(.45,.97,w));return G.blend(G.blend(base,C.grass,w*.88),C.snow,Math.max(0,snow)*.82);}
function applyGround(pack,t){
 // Lift the original indexed terrain in place-of-record, not as a second skin.
 // Unaffected vertices/records retain their exact source bytes; near/far share
 // their existing 4-unit boundary samples. This is terrain editing, not a cut.
 let edited=0,vertices=0;
 pack.meshes=pack.meshes.map(m=>{
  if(m.component!=='island-terrain'||!m.tile)return m;
  const [x0,z0,size]=m.tile;if(x0>bounds.x1||x0+size<bounds.x0||z0>bounds.z1||z0+size<bounds.z0)return m;
  const a=m.vertices.slice();let changed=false;
  for(let i=0;i<a.length;i+=9){const x=a[i],z=a[i+2],w=weight(x,z);if(w<=0)continue;const h=t.height(x,z),n=t.normal(x,z),c=groundColor(t,x,z,h,n);a[i+1]=h;for(let k=0;k<3;k++){a[i+3+k]=n[k];a[i+6+k]=c[k];}changed=true;vertices++;}
  if(!changed)return m;
  const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(let i=0;i<a.length;i+=9)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],a[i+k]);hi[k]=Math.max(hi[k],a[i+k]);}
  edited++;return {...m,vertices:a,center:lo.map((v,k)=>(v+hi[k])/2),radius:G.length(G.sub(hi,lo))/2,highlandTerrain:true};
 });pack.meta={...pack.meta,highlandTerrain:{edited,vertices,basis:'P',overlay:false}};return pack;
}
function ground(t,pack){
 // Conform both road LODs to the ACTUAL indexed surface, not its analytic
 // height function: coarse original triangles differ on steep mountain faces.
 const tiles=new Map();for(const m of pack.meshes)if(m.component==='island-terrain'&&!m.cutOnly){const [x,z]=m.tile;tiles.set(`${x}:${z}:${m.globalFar?'far':'near'}`,{m,cells:null});}
 function sample(x,z,lod){
  const key=`${Math.floor(x/256)*256}:${Math.floor(z/256)*256}:${lod}`,tile=tiles.get(key);if(!tile)throw Error('Missing surface under highland route: '+key);
  const m=tile.m,a=m.vertices,ix=m.index;
  if(!tile.cells){tile.cells=new Map();for(let i=0;i<ix.length;i+=3){const q=[ix[i]*9,ix[i+1]*9,ix[i+2]*9],xs=q.map(k=>a[k]),zs=q.map(k=>a[k+2]);for(let u=Math.floor(Math.min(...xs)/16);u<=Math.floor(Math.max(...xs)/16);u++)for(let v=Math.floor(Math.min(...zs)/16);v<=Math.floor(Math.max(...zs)/16);v++){const k=u+':'+v;if(!tile.cells.has(k))tile.cells.set(k,[]);tile.cells.get(k).push(q);}}}
  for(const[i,j,k]of tile.cells.get(Math.floor(x/16)+':'+Math.floor(z/16))||[]){const d=(a[j+2]-a[k+2])*(a[i]-a[k])+(a[k]-a[j])*(a[i+2]-a[k+2]);if(Math.abs(d)<1e-9)continue;const u=((a[j+2]-a[k+2])*(x-a[k])+(a[k]-a[j])*(z-a[k+2]))/d,v=((a[k+2]-a[i+2])*(x-a[k])+(a[i]-a[k])*(z-a[k+2]))/d,w=1-u-v;if(Math.min(u,v,w)<-1e-5)continue;const c=[6,7,8].map(n=>u*a[i+n]+v*a[j+n]+w*a[k+n]),n=G.norm([3,4,5].map(n=>u*a[i+n]+v*a[j+n]+w*a[k+n]));return{p:[x,u*a[i+1]+v*a[j+1]+w*a[k+1],z],c,n,tile};}
  throw Error('No triangle under highland route: '+x+','+z);
 }
 const batches=new Map(),cross=[-1.25,-1,-.55,0,.55,1,1.25];
 for(const lod of['near','far'])for(const path of paths){const points=[];for(let i=0;i<path.length-1;i++){const a=path[i],b=path[i+1],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/1.15);for(let j=0;j<n;j++)points.push([G.mix(a[0],b[0],j/n),G.mix(a[1],b[1],j/n)]);}points.push(path.at(-1));
  const row=i=>{const p=points[i],a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],d=G.norm([b[0]-a[0],0,b[1]-a[1]]);return cross.map(u=>{const v=sample(p[0]-d[2]*2.8*u,p[1]+d[0]*2.8*u,lod);v.p[1]+=.28;v.c=G.blend(v.c,C.soil,1-G.smooth(.88,1.25,Math.abs(u)));return v;});};
  let a=row(0);for(let i=0;i<points.length-1;i++){const b=row(i+1),m=a[3].tile.m,key=m.id;if(!batches.has(key))batches.set(key,{g:new G.Geometry(),source:m});const g=batches.get(key).g;for(let j=0;j<cross.length-1;j++)for(const tri of[[a[j],b[j+1],b[j]],[a[j],a[j+1],b[j+1]]])for(const v of tri)g.vertex(v.p,v.n,v.c);a=b;}
 }
 return [...batches.values()].map(({g,source:m})=>{const mesh=g.mesh('highland:public-path:'+m.id,'roads',{owner:ID,region:ID,space:'surface',overview:true,globalSurface:true,material:'shelfGround',highlandPublic:true,globalNear:m.globalNear,globalFar:m.globalFar,basis:'P'});return {...mesh,center:m.center.slice(),radius:m.radius+2};});
}

Object.assign(G,{HIGHLAND:{version:'0.29.0',id:ID,CX,CZ,Y,bounds,views,paths,weight,baseHeight,footprint},buildHighland:build,highlandGround:ground,applyHighlandGround:applyGround});
const previous=G.buildRegion;G.buildRegion=async function(data,id,legacy){if(id!==ID)return previous(data,id,legacy);const start=performance.now(),p=build(new G.Terrain(data));p.builtMs=performance.now()-start;return p;};
})(globalThis.GA);
