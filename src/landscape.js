/* 林缘质感样板。所有植栽、材质与试走路线均为 P 工程补完。
 * 在原总览上补充公共景观；不重建或替换森林、人里的建筑。 */
(function(G){'use strict';
const {rgb,blend,mix,smooth,noise,Geometry}=G;
const zone={x0:-640,x1:-340,z0:-155,z1:240};
const weight=(x,z)=>smooth(zone.x0,zone.x0+35,x)*(1-smooth(zone.x1-30,zone.x1,x))*smooth(zone.z0,zone.z0+40,z)*(1-smooth(zone.z1-40,zone.z1,z));
const road=G.ISLAND.allRoutes.find(r=>r.id==='route-forest');
const path=road.samples.filter(p=>p[0]<=-352&&p[0]>=-523).map(p=>p.slice());

function branch(g,a,b,r0,r1,col,sides=8){
 const axis=G.norm(G.sub(b,a)),right=G.norm(G.cross(axis,Math.abs(axis[1])>.9?[1,0,0]:[0,1,0])),up=G.cross(axis,right);
 const v=(u,end)=>{const n=G.add(G.mul(right,Math.cos(u)),G.mul(up,Math.sin(u))),r=end?r1:r0,p=G.add(end?b:a,G.mul(n,r));return{p,n:G.norm(G.add(n,G.mul(axis,(r0-r1)/G.length(G.sub(b,a)))))};};
 for(let i=0;i<sides;i++){const a=v(i/sides*6.283,0),b=v((i+1)/sides*6.283,0),c=v((i+1)/sides*6.283,1),d=v(i/sides*6.283,1);for(const tri of[[b,a,d],[b,d,c]])for(const q of tri)g.vertex(q.p,q.n,col);}
}

// 不规则叶簇使用连续法线。体积承接日光，细叶打破球体的外轮廓。
function crown(g,c,r,col,seed,detail){
 const slices=detail?9:6,rings=detail?5:3;
 function v(i,j){const a=i/slices*Math.PI*2,b=j/rings*Math.PI;
  const n=[Math.sin(b)*Math.cos(a),Math.cos(b),Math.sin(b)*Math.sin(a)];
  const l=(detail?.69:1)*(1+.18*Math.sin(a*3+seed)*Math.sin(b)**2+.11*Math.sin(a*5+b*4+seed));
  return{p:c.map((q,k)=>q+r[k]*n[k]*l),n:G.norm(n.map((q,k)=>q/r[k])),c:col.map(q=>q*(.66+.34*(n[1]*.5+.5)))};
 }
 for(let j=0;j<rings;j++)for(let i=0;i<slices;i++){
  const a=v(i,j),b=v(i+1,j),c=v(i+1,j+1),d=v(i,j+1);
  for(const tri of j===0?[[a,c,d]]:j===rings-1?[[a,b,d]]:[[a,c,d],[a,b,c]])for(const q of tri)g.vertex(q.p,q.n,q.c);
 }
 if(!detail)return;
 const R=G.rng(1000+seed*919|0);
 for(let i=0;i<150;i++){
  const a=R()*Math.PI*2,b=.3+R()*2.3,n=[Math.sin(b)*Math.cos(a),Math.cos(b),Math.sin(b)*Math.sin(a)];
  const p=c.map((q,k)=>q+r[k]*n[k]*(.69+R()*.25)),s=.16+R()*.19,angle=a+R()*.8,dx=Math.cos(angle)*s,dz=Math.sin(angle)*s;
  const color=col.map(q=>q*(.77+R()*.32)),normal=G.norm([n[0]*.45,.5+n[1]*.28,n[2]*.45]);
  const tip=[p[0]+dx,p[1]+s*.15,p[2]+dz],root=[p[0]-dx*.65,p[1]-.1,p[2]-dz*.65],left=[p[0]-dz*.42,p[1],p[2]+dx*.42],right=[p[0]+dz*.42,p[1],p[2]-dx*.42];
  for(let tri of[[root,left,tip],[root,tip,right]]){if(G.dot(G.cross(G.sub(tri[1],tri[0]),G.sub(tri[2],tri[0])),normal)<0)tri=[tri[0],tri[2],tri[1]];for(const q of tri)g.vertex(q,normal,color);}
 }
}
function tree(kind,variant,detail){
 const g=new Geometry(),R=G.rng(701+variant*153),wood=rgb('#75624b');
 const leaf=rgb(kind==='pine'?'#526e4e':['#6b864e','#5d7947','#7b8b55'][variant]);
 if(kind==='broad'){
  branch(g,[0,-.25,0],[.25,5.8,.15],.44,.27,wood,detail?10:5);
  branch(g,[.25,5.8,.15],[-.35,11.5,.3],.27,.045,wood,detail?9:4);
  const n=detail?8:3;
  for(let i=0;i<n;i++){
   const a=i*2.399+variant*.7,h=detail?7.8+i*.65:8.5+i*1.4;
   const radius=detail?2.4+R()*1.8:2.5,p=[Math.cos(a)*radius,h,Math.sin(a)*radius];
   if(detail)branch(g,[.1,4.8+i*.45,0],p,.17,.035,wood,7);
   crown(g,[p[0],p[1]+1.4,p[2]],[detail?2.6:3.6,detail?2:3.3,detail?2.5:3.5],leaf,i+variant*11,detail);
  }
  if(detail)for(let i=0;i<5;i++){let a=i*1.256;branch(g,[Math.cos(a)*1.4,0,Math.sin(a)*1.4],[0,.9,0],.12,.25,wood,7);}
 }else{
  branch(g,[0,-.25,0],[.15,17,0],.35,.025,wood,detail?10:4);
  if(detail){for(let j=0;j<6;j++)for(let i=0;i<4;i++){
   const a=i*1.571+j*.65+variant,rad=3.4-j*.44,h=4+j*1.9;
   const p=[Math.cos(a)*rad*.63,h,Math.sin(a)*rad*.63];
   g.tube([0,h-.9,0],p,.10,wood,4,.02);
   crown(g,p,[rad*.66,.95,rad*.62],leaf,j*4+i+variant*31,false);
  }}else for(let j=0;j<3;j++)crown(g,[.2*Math.sin(j+variant),6+j*4,0],[3.6-j*.85,3.5,3.4-j*.8],leaf,j+variant*7,false);
 }
 return g.mesh('prototype').vertices;
}
function shrub(detail){const g=new Geometry();for(let i=0;i<(detail?5:2);i++){const a=i*2.4;crown(g,[Math.cos(a)*.65,.7+i*.1,Math.sin(a)*.65],[1.1,.8,1],rgb(i%2?'#70864b':'#5f7747'),i+51,detail);}return g.mesh('shrub').vertices;}
function grass(seed){const g=new Geometry(),R=G.rng(seed);for(let i=0;i<9;i++){
 const a=R()*6.283,x=(R()-.5)*.75,z=(R()-.5)*.75,h=.25+R()*.65,w=.018+R()*.025,bend=.15+R()*.24;
 const dx=Math.cos(a),dz=Math.sin(a),color=rgb(i%3?'#78894f':'#a8a169');
 const p=[x,h*.52,z],tip=[x+dx*bend,h,z+dz*bend];
 g.quad([x-dz*w,0,z+dx*w],[x+dz*w,0,z-dx*w],[p[0]+dz*w*.6,p[1],p[2]-dx*w*.6],[p[0]-dz*w*.6,p[1],p[2]+dx*w*.6],color);
 g.tri([p[0]-dz*w*.6,p[1],p[2]+dx*w*.6],[p[0]+dz*w*.6,p[1],p[2]-dx*w*.6],tip,color);
 }return g.mesh('grass').vertices;}
let prototypes;
function getPrototypes(){if(prototypes)return prototypes;prototypes={};for(const kind of['broad','pine'])for(let v=0;v<3;v++)prototypes[kind+v]={near:tree(kind,v,true),far:tree(kind,v,false)};prototypes.shrub={near:shrub(true),far:shrub(false)};prototypes.grass={near:grass(72),far:grass(72)};return prototypes;}

function meshesForSites(sites,prefix){const groups=new Map(),p=getPrototypes();
 for(const s of sites){const key=s.kind+':'+Math.floor(s.x/96)+':'+Math.floor(s.z/96);if(!groups.has(key))groups.set(key,{kind:s.kind,sites:[]});groups.get(key).sites.push(s);}
 return [...groups].map(([key,b])=>{let ma=[],co=[],lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
  for(const s of b.sites){ma.push(...G.instanceMatrix(s.x,s.y,s.z,s.s,s.s,s.s,s.a));co.push(s.tint,s.tint,s.tint);const r=s.kind==='grass'?s.s:s.kind==='shrub'?s.s*2:s.s*7,h=s.kind==='grass'?s.s:s.kind==='shrub'?s.s*2:s.s*18;for(let i=0;i<3;i++){let q=[s.x,s.y,s.z][i];lo[i]=Math.min(lo[i],q-(i===1?.5:r));hi[i]=Math.max(hi[i],q+(i===1?h:r));}}
  const proto=p[b.kind];return{id:prefix+key,owner:'island',region:'island',space:'surface',overview:true,globalSurface:true,component:'transition-vegetation',material:'landscapeLeaf',group:'vegetation',nearDecoration:b.kind==='grass',vertices:proto.near,farVertices:proto.far,instances:new Float32Array(ma),instanceColors:new Float32Array(co),center:lo.map((v,i)=>(v+hi[i])/2),radius:G.length(G.sub(hi,lo))/2,lodDistance:b.kind==='grass'?85:210};
 });
}
function refineTrees(meshes){const p=getPrototypes(),out=[];let seed=0;
 for(const m of meshes){const kind=m.id.split(':')[2];if(m.component!=='transition-vegetation'||!['broad','pine','shrub','grass'].includes(kind)){out.push(m);continue;}
  // 远景保持原有合批数量；只有样板中的新植栽按小块组织。
  const ma=[],co=[],variant=seed++%3,proto=kind==='grass'?{near:m.vertices,far:m.farVertices}:p[kind==='shrub'?kind:kind+variant];
  for(let i=0;i<m.instances.length;i+=16){const a=m.instances,x=a[i+12],z=a[i+14];if(weight(x,z)>.15)continue;
   for(let j=0;j<16;j++)ma.push(a[i+j]);const tint=.88+noise(x*.12,z*.12)*.22;if(kind==='grass')for(let j=0;j<3;j++)co.push(m.instanceColors[i/16*3+j]);else co.push(tint,tint,tint);
  }
  if(ma.length)out.push({...m,vertices:proto.near,farVertices:proto.far,instances:new Float32Array(ma),instanceColors:new Float32Array(co),material:kind==='grass'?m.material:'landscapeLeaf',lodDistance:230});
 }return out;
}
function groundColor(t,x,z){const h=t.height(x,z),n=t.normal(x,z),base=G.ISLAND.surfaceColor(t,x,z,h,n),w=weight(x,z);
 const forest=1-smooth(-600,-385,x),patch=noise(x/34,z/29);
 let col=blend(rgb('#788649'),rgb('#9b9b62'),patch*.7);col=blend(col,rgb('#526842'),forest*.43);
 const r=G.ISLAND.routeNear(x,z),edge=(1-smooth(r.w*.5+1,r.w*.5+7,r.d));col=blend(col,rgb('#8e865e'),edge*.65);
 return blend(base,col,w);
}
function tile(t,source){const [x0,z0,size]=source.tile,step=source.globalFar?16:4,g=new Geometry(),cache=new Map();
 const vertex=(x,z)=>{const key=x+':'+z;if(!cache.has(key))cache.set(key,{p:[x,t.height(x,z),z],n:t.normal(x,z),c:groundColor(t,x,z)});return cache.get(key);};
 // 新旧、近远地块共用原来的 4 单位边界采样，保持一整块土地。
 for(let z=z0;z<z0+size;z+=step)for(let x=x0;x<x0+size;x+=step){let ps=[[x,z],[x,z+step],[x+step,z+step],[x+step,z]],ring=[];
  for(let i=0;i<4;i++){const a=ps[i],b=ps[(i+1)%4];ring.push(a);const boundary=a[0]===b[0]&&(a[0]===x0||a[0]===x0+size)||a[1]===b[1]&&(a[1]===z0||a[1]===z0+size);if(boundary)for(let q=4;q<step;q+=4)ring.push([mix(a[0],b[0],q/step),mix(a[1],b[1],q/step)]);}
  for(let i=0;i<ring.length;i++)for(const p of[[x+step*.5,z+step*.5],ring[i],ring[(i+1)%ring.length]]){const v=vertex(...p);g.vertex(v.p,v.n,v.c);}
 }
 return G.ISLAND.indexed({...source,...g.mesh(source.id,source.group),material:'landscapeGround',index:undefined});
}
function groundHeight(t,x,z){return t.height(x,z)+.10;}
function roadGeometry(t){const g=new Geometry(),samples=road.samples;
 const crossSection=[-1.8,-1.28,-1,-.63,-.28,0,.28,.63,1,1.28,1.8];
 function row(i){const p=samples[i],a=samples[Math.max(0,i-1)],b=samples[Math.min(samples.length-1,i+1)],len=Math.hypot(b[0]-a[0],b[1]-a[1]),n=[-(b[1]-a[1])/len,(b[0]-a[0])/len],w=road.width*.5*(1+.08*Math.sin(i*.24));
  return crossSection.map(u=>{const spread=u*w,x=p[0]+n[0]*spread,z=p[1]+n[1]*spread,wear=1-smooth(.86,1.8,Math.abs(u));let color=blend(groundColor(t,x,z),rgb('#a39470'),wear);const track=Math.exp(-(((Math.abs(u)-.55)*6)**2));color=color.map(q=>q*(1-track*.10));return{p:[x,groundHeight(t,x,z)+.015*(1-Math.abs(u)/1.8),z],n:t.normal(x,z),c:color};});
 }
 for(let i=0;i<samples.length-1;i++){if(samples[i+1][0]>-351)continue;const a=row(i),b=row(i+1);for(let j=0;j<a.length-1;j++)for(const tri of[[a[j],b[j+1],b[j]],[a[j],a[j+1],b[j+1]]])for(const v of tri)g.vertex(v.p,v.n,v.c);}
 return G.ISLAND.indexed(g.mesh('landscape:forest-road','roads',{owner:'island',overview:true,globalSurface:true,component:'connection-road',material:'landscapeEarth'}));
}
function removeOldRoad(m){if(m.component!=='connection-road')return m;const indices=m.index||Uint32Array.from({length:m.vertices.length/9},(_,i)=>i),keep=[];let removed=0;
 for(let i=0;i<indices.length;i+=3){const ids=[indices[i],indices[i+1],indices[i+2]],x=ids.reduce((s,k)=>s+m.vertices[k*9],0)/3,z=ids.reduce((s,k)=>s+m.vertices[k*9+2],0)/3,r=G.ISLAND.routeNear(x,z);
  if(x< -350&&x> -530&&r.id==='route-forest'&&r.d<8){removed++;continue;}keep.push(...ids);
 }return removed?{...m,index:new Uint32Array(keep)}:m;
}
function planting(t){const R=G.rng(260928),sites=[],occupied=[],rocks=new Geometry(),details=new Geometry();
 function allowed(x,z,pad=0){return weight(x,z)>.10&&!G.DIORAMA.owner(x,z)&&!t.water(x,z)&&G.ISLAND.routeNear(x,z).d>G.ISLAND.routeNear(x,z).w*.5+pad;}
 function add(kind,x,z,s){sites.push({kind,x,y:t.height(x,z)-.06,z,s,a:R()*6.283,tint:.83+R()*.24});}
 for(let z=-120;z<210;z+=10)for(let x=-624;x< -350;x+=10){let X=x+R()*9,Z=z+R()*9;if(!allowed(X,Z,4))continue;
  // 林缘成簇、村口留白；菜地内保留低矮植被和原有田垄。
  const field=Math.abs(X+394)<60&&Math.abs(Z-143)<42||Math.abs(X+415)<49&&Math.abs(Z+88)<39;
  const forest=1-smooth(-595,-350,X),grove=noise(X/49,Z/45),density=forest*.42+(grove-.45)*.58;
  if(!field&&R()<density){add('broad'+(Math.floor(R()*3)),X,Z,.65+R()*.95);occupied.push([X,Z]);}
  else if(!field&&R()<.14+forest*.19)add('shrub',X,Z,.48+R()*.68);
 }
 for(let z=-130;z<215;z+=2.3)for(let x=-620;x< -348;x+=2.3){const X=x+R()*2.2,Z=z+R()*2.2;if(!allowed(X,Z,.1))continue;
  const r=G.ISLAND.routeNear(X,Z),margin=1-smooth(5,16,r.d),grove=noise(X/22,Z/23),forest=1-smooth(-585,-370,X);
  const field=Math.abs(X+394)<57&&Math.abs(Z-143)<34||Math.abs(X+415)<45&&Math.abs(Z+88)<32;
  if(!field&&R()<weight(X,Z)*(.18+margin*.65+grove*.27)){add('grass',X,Z,.7+R()*.60);if(R()<forest*.018)add('shrub',X,Z,.38+R()*.43);}
  if(r.id==='route-forest'&&r.d>3.4&&r.d<7&&R()<.075){rocks.place(X,t.height(X,Z)-.06,Z,R()*6.283);crown(rocks,[0,.12,0],[.24+R()*.30,.15+R()*.18,.24],rgb('#8b8972'),Math.floor(R()*200),false);}
 }
 // 苔石与倒木集中在林缘，不随机挡住通路。
 for(const [x,z,s]of[[-491,69,1.9],[-464,22,1.2],[-529,91,1.5],[-426,60,.9]]){rocks.place(x,t.height(x,z)-.25,z,.3);crown(rocks,[0,s*.35,0],[s,s*.58,s*.7],rgb('#818572'),87,false);}
 const a=[-494,t.height(-494,82)+.3,82],b=[-487,t.height(-487,85)+.3,85];details.tube(a,b,.36,rgb('#625840'),9,.29);
 return{sites,trees:occupied,meshes:[...meshesForSites(sites,'landscape:planting:'),G.ISLAND.indexed(rocks.mesh('landscape:stones','architecture',{owner:'island',overview:true,globalSurface:true,component:'transition-fields',material:'landscapeStone'})),G.ISLAND.indexed(details.mesh('landscape:fallen-wood','architecture',{owner:'island',overview:true,globalSurface:true,component:'transition-fields',material:'timber'}))]};
}
function apply(pack,t){if(pack.meta?.landscapeQuality)return pack;const start=performance.now();
 // 高程必须来自当前地图资料；缺失 placements 的默认地形不能定位近景。
 for(const [id,offsets]of Object.entries(viewOffsets)){const p=G.PRESETS[id];for(const [i,key]of ['eye','target'].entries())p[key][1]=t.height(p[key][0],p[key][2])+offsets[i];}
 let meshes=refineTrees(pack.meshes).map(m=>{
  if(m.component==='island-terrain'&&m.tile[0]>=-768&&m.tile[0]<-256&&m.tile[1]>=-256&&m.tile[1]<256)return tile(t,m);
  return removeOldRoad(m);
 });
 const plants=planting(t);meshes.push(roadGeometry(t),...plants.meshes);pack.meshes=meshes;
 pack.meta={...pack.meta,landscapeQuality:{basis:'P',zone,plantedTrees:plants.trees.length,plantInstances:plants.sites.length,builtMs:performance.now()-start}};return pack;
}
const viewOffsets={meadowPath:[2.8,4],forestApproach:[1.72,1.72],meadowReturn:[1.72,1.72],meadowWalk:[1.82,1.82]};
function eye(x,z){return[x,0,z];}
G.PRESETS.meadowPath={label:'村口田径',region:'connections',eye:eye(-359,39),target:eye(-471,48),fov:62,detailNeighbors:['forest','village']};
G.PRESETS.forestApproach={label:'林缘近看',region:'connections',eye:eye(-474,49),target:eye(-522,55),fov:64,detailNeighbors:['forest','village']};
G.PRESETS.meadowReturn={label:'林缘回望',region:'connections',eye:eye(-507,53),target:eye(-405,42),fov:64,detailNeighbors:['forest','village']};
G.PRESETS.meadowWalk={label:'林缘路线导览',region:'connections',eye:eye(...path[0]),target:eye(...path[8]),fov:66,walkPath:path,detailNeighbors:['forest','village']};
G.LANDSCAPE={apply,weight,zone,path,groundColor};
})(globalThis.GA);
