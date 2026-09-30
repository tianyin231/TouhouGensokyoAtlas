/* Peony field — OSP ch.14, pp.8,14–16 (community transcript).
 * All planting plans, flower forms/colours, tracks and the small work shelter are P.
 * Not Kyomaru botan, a permanent fairy residence, or Eientei relocated to the mountain.
 * Original terrain/vegetation is read only; boot builds only the coarse model.
 */
(function(G){'use strict';
const ID='peony_field',CX=-1380,CZ=-742,TAU=Math.PI*2;
const C=Object.fromEntries(Object.entries({earth:'#8c8165',rim:'#aaa58a',stone:'#878e79',wood:'#7d6950',edge:'#af9770',dark:'#514938',leaf:'#648363',newLeaf:'#8ca879',stem:'#788d5e',pink:'#d9a3ae',cream:'#e3dcca',heart:'#caa465',reed:'#a2926e',cloth:'#b0b5a0'}).map(([k,v])=>[k,G.rgb(v)]));
const beds=[-28,-14,0,14,28].map((z,i)=>({id:i,z,x0:-35+(i===4?5:0),x1:34-(i===0?6:0),halfWidth:3.3}));
const bedZ=(b,x)=>CZ+b.z+.0009*x*x+Math.sin(x*.037+b.id)*.7;
const paths=[G.spline([[-1430,-884],[-1436,-862],[-1440,-840],[-1402,-816],[-1415,-788],[-1435,-763],[-1430,-714],[-1408,-686],[CX,-686]],1.1),G.spline([[CX,-686],[CX,-707],[CX-1,-740],[CX+1,-770],[CX,-790],[-1334,-790]],.8)];
const shelter={x:-1334,z:-785,w:7.2,d:4.4,h:3.4};
const v=(label,eye,target,fov=49,extra={})=>({label,eye,target,fov,region:ID,space:'surface',era:'三月精OSP第14话 · 山中药圃选景／布局P',...extra});
const views={
 peonyOverview:v('芍药田 · 山中药圃',[-1457,139,-626],[-1378,74,-742]),
 peonyGate:v('药圃入口 · 管理告示',[-1387,76,-674],[-1380,71,-695],55),
 peonyRows:v('田间 · 分带花畦',[-1422,96,-706],[-1378,74,-740],51),
 peonyBlooms:v('芍药 · 花瓣与复叶',[-1393.8,73.3,-736.9],[-1392.2,71.2,-740.0],45),
 peonyBuds:v('芍药 · 花苞与支撑',[-1363,77.8,-764],[-1368,76.0,-769],55),
 peonyWork:v('田边 · 作业棚',[-1320,91,-769],[-1334,84,-785],52),
 peonyRear:v('药圃 · 回望林缘',[-1391,112,-819],[-1380,73,-740],51),
 peonyFoot:v('棚后 · 柱脚与排水',[-1327,87,-798],[-1334,81.7,-785],55),
 peonyConnection:v('来路 · 接回圣域小径',[-1464,109,-833],[-1430,80,-884],53),
 peonySection:v('作业棚 · 可逆揭顶',[-1320,94,-774],[-1334,83.8,-785],53,{peonyCutRoof:true})
};
const bounds=[-1490,-909,-1286,-646];
const block={id:ID,name:'芍药田 · 山中药圃',poly:[[-1465,-818],[-1296,-818],[-1296,-653],[-1465,-653]],center:[CX,74,CZ],bottom:10,step:8};
G.DIORAMA.blocks.push(block);G.DIORAMA.map.set(ID,block);G.REGION_LABELS[ID]=block.name;
const owner=G.DIORAMA.owner;G.DIORAMA.owner=(x,z)=>Math.hypot((x-CX)/97,(z-CZ)/76)<1?ID:owner(x,z);
Object.assign(G.PRESETS,views);G.IMPLEMENTED[ID]='peonyOverview';G.LANDMARKS.partial.add(ID);G.EXTRA_REGION_DEFAULTS={...G.EXTRA_REGION_DEFAULTS,[ID]:'peonyOverview'};
function bank(far){const bins=new Map();return {get(mat='Wood',part='base'){const k=mat+':'+part;if(!bins.has(k))bins.set(k,{g:new G.Geometry(),mat,part});return bins.get(k).g.place();},finish(){return [...bins].filter(([,b])=>b.g.a.length).map(([k,b])=>b.g.mesh(`${ID}:${far?'overview':'detail'}:${k}`,['Leaf','Grass'].includes(b.mat)?'vegetation':'architecture',{owner:ID,region:ID,space:'surface',overview:far,material:'peony'+b.mat,peonyPart:b.part,basis:'P'}));}};}
// Closed pole caps and elliptical leaf/petal surfaces without degenerate pole quads.
function ell(g,x,y,z,rx,ry,rz,col,n=7,rings=3){const p=(i,j)=>{const a=TAU*i/n,b=Math.PI*j/rings;return[x+Math.sin(b)*Math.cos(a)*rx,y+Math.cos(b)*ry,z+Math.sin(b)*Math.sin(a)*rz];};for(let i=0;i<n;i++){const k=(i+1)%n;g.tri(p(i,0),p(k,1),p(i,1),col);for(let j=1;j<rings-1;j++)g.quad(p(i,j),p(k,j),p(k,j+1),p(i,j+1),col);g.tri(p(i,rings-1),p(k,rings-1),p(i,rings),col);}}
function blade(g,a,b,width,col){const d=G.sub(b,a),side=G.norm(G.cross(d,[0,1,0])),l2=d[0]*d[0]+d[2]*d[2];if(l2<1e-6)return;
 const normal=G.norm([-d[0]*d[1]/l2,1,-d[2]*d[1]/l2]),center=G.add(G.add(a,G.mul(d,.52)),[0,width*.14,0]),edge=[a];
 for(const[t,w]of[[.25,.72],[.53,1],[.80,.68]])edge.push(G.add(G.add(a,G.mul(d,t)),G.mul(side,width*w)));
 edge.push(b);for(const[t,w]of[[.80,.68],[.53,1],[.25,.72]])edge.push(G.add(G.add(a,G.mul(d,t)),G.mul(side,-width*w)));
 for(let i=0;i<edge.length;i++){g.vertex(center,normal,col);g.vertex(edge[i],normal,col);g.vertex(edge[(i+1)%edge.length],normal,col);}
}
function blossom(g,x,y,z,r,col,far,seed){
 if(far){const n=7;for(let i=0;i<n;i++){const a=TAU*i/n,b=TAU*(i+1)/n;g.tri([x,y-.03,z],[x+Math.cos(b)*r,y+.025,z+Math.sin(b)*r],[x+Math.cos(a)*r,y+.025,z+Math.sin(a)*r],col);}ell(g,x,y+.03,z,r*.3,.05,r*.3,C.heart,5,2);return;}
 // Overlapping elliptical, spoon-curved petals. Smooth analytical normals avoid
 // the triangular shard appearance of flat-shaded rectangular surface patches.
 for(let layer=0;layer<3;layer++){const n=layer===0?8:layer===1?7:5,R=r*(1-.24*layer),start=seed*.7+layer*.38;
  for(let i=0;i<n;i++){const a=start+TAU*i/n,ca=Math.cos(a),sa=Math.sin(a),col2=G.blend(col,C.cream,.08*layer+.025*(i%3)),L=R*.60,W=R*.47,tilt=R*(.17+.06*layer),bulge=R*.19;
   const P=(rad,theta)=>{const q=rad*Math.cos(theta),u=rad*Math.sin(theta),reach=R*.47+L*q,side=W*u;return[x+ca*reach-sa*side,y+layer*.05+tilt*q+bulge*(1-q*q-u*u),z+sa*reach+ca*side];};
   const N=(rad,theta)=>{const q=rad*Math.cos(theta),u=rad*Math.sin(theta),dq=(tilt-2*bulge*q)/L,du=-2*bulge*u/W;return G.norm([-ca*dq+sa*du,1,-sa*dq-ca*du]);};
   const emit=(points)=>{for(const [rr,theta]of points)g.vertex(P(rr,theta),N(rr,theta),col2);};
   for(let k=0;k<12;k++){const a=TAU*k/12,b=TAU*(k+1)/12;emit([[0,0],[.5,b],[.5,a]]);emit([[.5,a],[.5,b],[1,b]]);emit([[.5,a],[1,b],[1,a]]);}
  }
 }

 for(let i=0;i<8;i++){const a=i*TAU/8,p=[x+Math.cos(a)*r*.21,y+.12,z+Math.sin(a)*r*.21];g.tube([x,y+.03,z],p,.013,C.heart,3,.019);}
}
function plantPrototype(kind,far){const leaves=new G.Geometry(),petals=new G.Geometry(),col=kind===1?C.cream:C.pink;
 for(let s=0;s<2;s++){const x=s?.29:-.19,z=s?-.14:.14,h=s?1.36:1.10,tip=[x+.07,h,z+.04];leaves.tube([x,-.24,z],tip,.023,C.stem,far?3:5,.014);
  for(let j=0;j<(far?2:4);j++){const y=.19+j*.23,a=j*2.399+s,st=[x,y,z],end=[x+Math.cos(a)*.40,y+.12,z+Math.sin(a)*.40];if(!far)leaves.tube(st,end,.012,C.stem,3,.007);
   for(let k=0;k<(far?1:3);k++){const aa=a+(k-1)*.64,L=k===1?.54:.44;blade(leaves,end,[end[0]+Math.cos(aa)*L,end[1]+.11,end[2]+Math.sin(aa)*L],k===1?.20:.16,G.blend(C.leaf,C.newLeaf,.10*j));}}
  if(kind===2&&s===1){ell(petals,...tip,.12,.17,.12,G.blend(C.pink,C.leaf,.30),far?5:8,far?2:4);for(let k=0;k<3;k++){const a=k*TAU/3;blade(leaves,[tip[0],h-.10,tip[2]],[tip[0]+.15*Math.cos(a),h+.03,tip[2]+.15*Math.sin(a)],.048,C.leaf);}}
  else blossom(petals,...tip,s?.39:.34,col,far,kind+s);
 }
 // Lower compound foliage gives the perennial a clumping habit, not a bare pole.
 for(let j=0;j<(far?3:6);j++){const a=j*2.399+.7,base=[Math.cos(a)*.12,-.06,Math.sin(a)*.12],end=[Math.cos(a)*.43,.32+(j%2)*.1,Math.sin(a)*.43];if(!far)leaves.tube(base,end,.012,C.stem,3,.009);for(let k=0;k<(far?1:3);k++){const b=a+(k-1)*.48;blade(leaves,end,[end[0]+Math.cos(b)*.45,end[1]+.15,end[2]+Math.sin(b)*.45],.19,C.leaf);}}
 return {Leaf:leaves.mesh('prototype','vegetation').vertices,Petal:petals.mesh('prototype','vegetation').vertices};
}
function plantSites(data){const out=[],R=G.rng(140016);for(const b of beds)for(const row of[-1,1])for(let x=b.x0+1;x<b.x1-1;x+=1.75){const X=x+(R()-.5)*.26,z=bedZ(b,X)+row*1.33+(R()-.5)*.25,xx=CX+X;if(Math.abs(X)<4.5)continue;if((data.peonyObstacles||[]).some(p=>Math.hypot(xx-p[0],z-p[1])<p[2]+.5))continue;out.push({x:xx,z,scale:.91+R()*.20,angle:R()*TAU,kind:Math.abs(Math.floor(X/13)+b.id)%4===0?1:R()<.22?2:0,bed:b.id});}return out;}
function fieldInstances(data,far,t){const sites=plantSites(data),bins=new Map(),protos=[0,1,2].map(k=>({near:plantPrototype(k,far),far:far?null:plantPrototype(k,true)}));
 for(const p of sites){const key=[Math.floor((p.x-CX+40)/40),Math.floor((p.z-CZ+40)/40),p.kind].join(':');if(!bins.has(key))bins.set(key,{kind:p.kind,ms:[],positions:[]});const b=bins.get(key),y=t.height(p.x,p.z)+.15;b.ms.push(...G.instanceMatrix(p.x,y,p.z,p.scale,p.scale,p.scale,p.angle));b.positions.push([p.x,y,p.z]);}
 const meshes=[];for(const[key,b]of bins){const ms=Float32Array.from(b.ms),cs=new Float32Array(ms.length/16*3).fill(1),lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(const p of b.positions)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],p[k]-(k===1?.4:1.5));hi[k]=Math.max(hi[k],p[k]+(k===1?2.3:1.5));}const center=lo.map((x,k)=>(x+hi[k])/2),radius=G.length(G.sub(hi,lo))/2;
  for(const mat of['Leaf','Petal'])meshes.push({id:`${ID}:${far?'overview':'detail'}:plants:${key}:${mat}`,group:'vegetation',vertices:protos[b.kind].near[mat],...(!far?{farVertices:protos[b.kind].far[mat]}:{}),instances:ms,instanceColors:cs,center,radius,owner:ID,region:ID,space:'surface',overview:far,material:'peony'+mat,peonyPart:'plants',flowerKind:'peony',lodDistance:38,basis:'P'});
 }return {meshes,sites};
}
function plotSoil(B,t,far){const soil=B.get('Soil','beds'),edges=B.get('Stone','edges');for(const b of beds){const step=far?3:1.5;
 for(let x=b.x0;x<b.x1-1e-5;x+=step){const X=Math.min(x+step,b.x1);if(x<4.6&&X>-4.6)continue;const p=(xx,u)=>{const z=bedZ(b,xx)+u*b.halfWidth,worldX=CX+xx;return[worldX,t.height(worldX,z)+.15+.10*(1-u*u),z];};for(let u=-1;u<1;u+=.5)soil.quad(p(x,u),p(x,u+.5),p(X,u+.5),p(X,u),C.earth);}
 for(let i=0,x=b.x0+1.1;x<b.x1;x+=3.25,i++){if(Math.abs(x)<5)continue;const z=bedZ(b,x)+b.halfWidth+.16,y=t.height(CX+x,z);ell(edges,CX+x,y-.03,z,.68,.25,.35,G.blend(C.stone,C.rim,.08*(i%3)),far?5:7,3);}}
}
function workShelter(B,near,far,t,isFar){const s=shelter,wood=B.get('Wood','shelter'),stone=B.get('Stone','shelter'),roof=B.get('Roof','roof'),bench=B.get('Wood','props');
 const posts=[[-3,-1.6],[3,-1.6],[-3,1.6],[3,1.6]].map(([x,z])=>[s.x+x,s.z+z]);const floor=Math.max(...posts.flatMap(([x,z])=>[near.height(x,z),far.height(x,z)]))+.22;
 for(const[x,z]of posts){const low=Math.min(near.height(x,z),far.height(x,z));stone.box(x,low-.6,z,.65,.85,.65,C.stone);wood.box(x,low+.15,z,.19,floor+s.h-low-.15,.19,C.wood);}
 for(const z of[-1.6,1.6])wood.box(s.x,floor+s.h-.15,s.z+z,6.5,.24,.27,C.wood);
 for(const x of[-3,0,3])wood.box(s.x+x,floor+s.h-.35,s.z,.19,.18,4.2,C.edge);
 const P=(x,z,y=0)=>[s.x+x,floor+s.h+.12-z*.13+y,s.z+z];roof.quad(P(-4,-2.6),P(-4,2.6),P(4,2.6),P(4,-2.6),C.reed);roof.quad(P(-4,2.6,-.17),P(-4,-2.6,-.17),P(4,-2.6,-.17),P(4,2.6,-.17),C.wood);
 for(const x of[-4,4])roof.quad(P(x,-2.6),P(x,2.6),P(x,2.6,-.17),P(x,-2.6,-.17),C.wood);
 for(const z of[-2.6,2.6])roof.quad(P(-4,z),P(4,z),P(4,z,-.17),P(-4,z,-.17),C.wood);
 if(!isFar)for(let x=-3.8;x<4;x+=.33)roof.tube(P(x,-2.65,.05),P(x,2.65,.05),.045,C.edge,5);
 // Open-sided shelter and supported table; no invented enclosed clinic or residence.
 for(const x of[-2.2,2.2])for(const z of[-.9,.9]){const y=Math.min(near.height(s.x+x,s.z+z),far.height(s.x+x,s.z+z))-.18;bench.box(s.x+x,y,s.z+z,.18,floor+1.15-y,.18,C.wood);}
 bench.box(s.x,floor+1.15,s.z,5.0,.20,2.3,C.edge);
 if(!isFar){const basket=B.get('Basket','props');for(const d of[-1,1]){const x=s.x+d*1.45,y=floor+1.36,z=s.z;for(let j=0;j<12;j++){const a=TAU*j/12,b=TAU*(j+1)/12,Q=(a,r,h)=>[x+Math.cos(a)*r,y+h,z+Math.sin(a)*r];basket.quad(Q(a,.55,0),Q(b,.55,0),Q(b,.67,.42),Q(a,.67,.42),C.reed);basket.quad(Q(a,.61,.38),Q(b,.61,.38),Q(b,.50,.05),Q(a,.50,.05),C.dark);basket.quad(Q(a,.67,.42),Q(b,.67,.42),Q(b,.61,.38),Q(a,.61,.38),C.edge);basket.tri([x,y+.06,z],Q(a,.50,.06),Q(b,.50,.06),C.dark);} for(let i=0;i<12;i++){const a=i*TAU/12;basket.tube([x+Math.cos(a)*.54,y+.04,z+Math.sin(a)*.54],[x+Math.cos(a)*.68,y+.44,z+Math.sin(a)*.68],.026,C.dark,3);}basket.box(x,y+.04,z,.70,.02,.66,C.dark);}wood.tube([s.x-3.25,floor+.13,s.z+1.2],[s.x-2.4,floor+2.1,s.z+.5],.05,C.edge,6);B.get('Stone','props').box(s.x-3.25,floor+.04,s.z+1.2,.4,.14,.6,C.dark);}
 return {floor,posts:posts.map(([x,z])=>[x,Math.min(near.height(x,z),far.height(x,z)),z]),openInterior:true};
}
function boundary(B,t,far){const wood=B.get('Wood','fence'),stone=B.get('Stone','fence');for(const[a,b]of [[-38,-5],[5,27]]){const n=Math.ceil((b-a)/4);for(let i=0;i<=n;i++){const x=CX+G.mix(a,b,i/n),z=-687,y=t.height(x,z);wood.cone(x,y-.28,z,.09,.07,1.35,C.wood,far?4:6);stone.box(x,y-.23,z,.30,.28,.30,C.stone);if(i){const xx=CX+G.mix(a,b,(i-1)/n),yy=t.height(xx,z);for(const h of[.48,.90])wood.tube([xx,yy+h,z],[x,y+h,z],.045,C.edge,4);}}}
 const x=CX+5.3,z=-691,y=t.height(x,z);wood.box(x-1.5,y-.4,z,.16,2.3,.16,C.wood);wood.box(x+1.5,y-.4,z,.16,2.3,.16,C.wood);wood.box(x,y+1.12,z,3.5,.74,.15,C.dark);return {text:'芍药 · 永远亭管理',position:[x,y+1.50,z+.085],yaw:0,width:3.32,height:.62,background:'#6e5c43',color:'#dfd7ba',region:ID,space:'surface'};
}
function borders(B,t,far,data){const trees=[],wood=B.get('Wood','trees'),leaf=B.get('Leaf','trees'),R=G.rng(141616);
 for(const [x,z,scale]of [[-1429,-784,5.4],[-1411,-800,6.3],[-1380,-805,5.5],[-1356,-805,6],[-1318,-776,5.5],[-1320,-742,5.0],[-1320,-712,4.5],[-1441,-715,5.0]]){
  if((data.peonyObstacles||[]).some(p=>Math.hypot(x-p[0],z-p[1])<p[2]+4))continue;const y=t.height(x,z);trees.push([x,y,z,scale]);wood.tube([x,y-.8,z],[x+.15,y+scale*1.3,z],scale*.07,C.wood,far?5:7,scale*.018);
  for(let j=0;j<4;j++){const a=j*2.39+R()*.4,p=[x+Math.cos(a)*scale*.43,y+scale*(.75+j*.18),z+Math.sin(a)*scale*.4];wood.tube([x,y+scale*.45,z],p,scale*.035,C.wood,4,scale*.012);ell(leaf,...p,scale*.49,scale*.28,scale*.44,G.blend(C.leaf,C.newLeaf,.25+R()*.2),far?5:8,far?3:4);}}
 const scrub=B.get('Grass','herbs');for(let i=0;i<(far?12:35);i++){const a=R()*TAU,x=CX+Math.cos(a)*(43+R()*10),z=CZ+Math.sin(a)*(40+R()*6);if(paths.some(ps=>ps.some(p=>Math.hypot(p[0]-x,p[1]-z)<3.5)))continue;const y=t.height(x,z);ell(scrub,x,y+.23,z,.65+R(),.4,.65+R(),G.blend(C.leaf,C.newLeaf,.2),5,3);}
 return trees;
}
function bytes(meshes){const a=new Set();for(const m of meshes)for(const k of['vertices','farVertices','instances','instanceColors','index'])if(m[k])a.add(m[k]);return [...a].reduce((s,v)=>s+v.byteLength,0);}
function build(data,isFar=false){const near=G.SurfaceContact.sampler(data,ID),far=G.SurfaceContact.sampler(data,ID,'far'),t=isFar?far:near,B=bank(isFar);plotSoil(B,t,isFar);const work=workShelter(B,near,far,t,isFar),sign=boundary(B,t,isFar),trees=borders(B,t,isFar,data),plants=fieldInstances(data,isFar,t),meshes=[...B.finish(),...plants.meshes];return{id:ID,meshes,signs:isFar?[]:[sign],bytes:bytes(meshes),meta:{locations:[ID],basis:'P',plants:plants.sites,trees,shelter:work,beds:5,terrainMutation:false,relocatedEientei:false,fullClinic:false,animatedPlants:false}};}
function roads(data,pack){const sample=G.ASAMA.sampleRenderedTerrain(pack),bins=new Map(),cross=[-1.25,-1,-.5,0,.5,1,1.25];for(const lod of['near','far'])for(let k=0;k<paths.length;k++){const ps=paths[k],row=i=>{const p=ps[i],a=ps[Math.max(0,i-1)],b=ps[Math.min(ps.length-1,i+1)],join=k===0?1-G.smooth(0,16,Math.hypot(p[0]-ps[0][0],p[1]-ps[0][1])):0,width=k?1.1:1.3+1.1*join,old=G.ASAMA.surfacePath,natural=G.norm([b[0]-a[0],0,b[1]-a[1]]),oldDir=G.norm([old[0][0]-old[1][0],0,old[0][1]-old[1][1]]),d=k===0?G.norm(G.add(G.mul(natural,1-join),G.mul(oldDir,join))):natural;return cross.map(u=>{const q=sample(p[0]-d[2]*width*u,p[1]+d[0]*width*u,lod),w=1-G.smooth(G.mix(.85,.88,join),1.25,Math.abs(u)),colour=G.blend(C.rim,G.rgb('#aa9c7d'),join);q.c=G.blend(q.c,colour,w*G.mix(.80,1,join));q.p[1]+=G.mix(.10,.12,join)+G.mix(.14,.20,join)*w;return q;});};let a=row(0);for(let i=0;i<ps.length-1;i++){const b=row(i+1),src=a[3].tile,key=src.id;if(!bins.has(key))bins.set(key,{g:new G.Geometry(),src});const g=bins.get(key).g;for(let j=0;j<cross.length-1;j++)for(const tri of[[a[j],b[j+1],b[j]],[a[j],a[j+1],b[j+1]]])for(const q of tri)g.vertex(q.p,q.n,q.c);a=b;}}
 return [...bins.values()].map(({g,src})=>{const m=g.mesh(ID+':public:'+src.id,'roads',{owner:ID,region:ID,space:'surface',overview:true,globalSurface:true,globalNear:src.globalNear,globalFar:src.globalFar,material:'peonyPath',peonyPart:'route',basis:'P',terrainSource:src.id});return{...m,center:src.center.slice(),radius:Math.max(src.radius+4,m.radius+G.length(G.sub(m.center,src.center)))};});}
function prepare(data,pack){G.SurfaceContact.prepare(data,pack,ID,bounds);const old=new Map();for(const m of pack.meshes){if(!m.instances||m.group!=='vegetation'||m.flowerKind)continue;const a=m.instances;for(let i=0;i<a.length;i+=16){const x=a[i+12],z=a[i+14];if(x<bounds[0]||x>bounds[2]||z<bounds[1]||z>bounds[3])continue;old.set(x.toFixed(3)+','+z.toFixed(3),[x,z,4.2]);}}data.peonyObstacles=[...old.values()];}
G.PEONY={id:ID,version:'0.29-peony.1',views,beds,paths,bounds,shelter,build,roads,prepare,plantPrototype,plantSites,bytes};
G.extraOverviewBuilders=[...(G.extraOverviewBuilders||[]),(data,pack)=>{prepare(data,pack);return [...build(data,true).meshes,...roads(data,pack)];}];
const previous=G.buildRegion;G.buildRegion=async(data,id,legacy)=>{if(id!==ID)return previous(data,id,legacy);const start=performance.now(),p=build(data);p.builtMs=performance.now()-start;return p;};
})(globalThis.GA);
