/* Seiki / Asama scene selections. Source identities: TH16 stage 2, TH20 stages
 * 1–6 and Extra setting. Every dimension, back face and route is P, not a survey.
 * No surface vertex or inherited region builder is replaced. */
(function(G){
'use strict';
const TAU=Math.PI*2, IDs=['seiki','asama'];
const C=Object.fromEntries(Object.entries({stone:'#98917b',light:'#c4b795',dark:'#66645d',soil:'#756f56',wood:'#655243',cut:'#997553',leaf:'#c1c39c',moss:'#76917a',pink:'#dcb9b8',gold:'#bca476',red:'#8f514a',blue:'#527b92',yellow:'#b39a59',green:'#617d65',water:'#49757d',roof:'#51616a',paper:'#c5bfa2',shadow:'#242e32',bone:'#bab7a3',snow:'#d9dfcf'}).map(([k,v])=>[k,G.rgb(v)]));
const locs={sanctuary:'seikiOverview',red_mountain:'seikiAutumn',asama:'asamaPyramid',four_seasons_shaft:'asamaShaft',labyrinth:'asamaMaze',asama_depth:'asamaDepth',asama_deepest:'asamaShrine',fossil_forest:'asamaFossils'};
const v=(label,region,eye,target,extra={})=>({label,region,space:region==='seiki'?'surface':'asama',eye,target,fov:51,era:region==='seiki'?'TH20圣域／本作山麓布局P':'TH20关卡选景／独立地下图P',...extra});
const views={
 seikiOverview:v('圣域 · 山麓林冠','seiki',[-1425,425,-824],[-1170,240,-1060],{fov:49}),
 seikiAutumn:v('TH16 · 红叶尽染','seiki',[-1425,425,-824],[-1170,240,-1060],{fov:49,asamaAutumn:true,era:'TH16第二面版本选景；共用P布局'}),
 seikiPath:v('圣域 · 曲径入林','seiki',[-1380,131,-949],[-1310,168,-996]),
 seikiRoots:v('圣域 · 林下与根系','seiki',[-1377,133,-974],[-1366.0453,129.2,-986.7061]),
 seikiBack:v('圣域 · 回望山麓','seiki',[-1430,235,-1140],[-1320,160,-983]),
 seikiConnection:v('山路 · 接回既有登山路','seiki',[-1480,440,-1320],[-1410,372,-1370]),
 asamaPyramid:v('浅间净秽山 · 地下金字塔','asama',[90,70,114],[0,25,0],{asamaScene:'pyramid',fov:59}),
 asamaPyramidSection:v('金字塔 · 可逆外壳剖览','asama',[150,102,177],[0,27,0],{asamaScene:'pyramid',asamaCut:true}),
 asamaGate:v('金字塔 · 石阶与门洞','asama',[24,18,90],[0,12,45],{asamaScene:'pyramid'}),
 asamaRear:v('金字塔 · 背面石基','asama',[-135,66,-128],[0,22,-15],{asamaScene:'pyramid',asamaCut:true}),
 asamaFoot:v('金字塔 · 低角度地基','asama',[80,5,61],[37,5,35],{asamaScene:'pyramid'}),
 asamaShaft:v('四季竖穴 · 螺旋下降','asama',[4,25,0],[0,-45,-4],{asamaScene:'shaft',fov:66}),
 asamaSeasons:v('四季竖穴 · 四方景龛','asama',[0,-13,9],[-16,-19,43],{asamaScene:'shaft',fov:60}),
 asamaMaze:v('佐塔克斯迷宫 · 四色通路','asama',[216,109,105],[134,4,0],{asamaScene:'shaft',asamaCut:true,fov:52}),
 asamaMazeWalk:v('迷宫 · 门廊与转折','asama',[75,7,0],[124,5,0],{asamaScene:'shaft',fov:63}),
 asamaMazeRed:v('迷宫 · 红色版本','asama',[216,109,105],[134,4,0],{asamaScene:'shaft',asamaCut:true,asamaMazeColor:'red',fov:52}),
 asamaMazeGreen:v('迷宫 · 绿色版本','asama',[216,109,105],[134,4,0],{asamaScene:'shaft',asamaCut:true,asamaMazeColor:'green',fov:52}),
 asamaMazeYellow:v('迷宫 · 黄色版本','asama',[216,109,105],[134,4,0],{asamaScene:'shaft',asamaCut:true,asamaMazeColor:'yellow',fov:52}),
 asamaDepth:v('浅间净秽山 · 深处','asama',[45,24,78],[0,2,-22],{asamaScene:'depth',fov:57}),
 asamaDescent:v('深处 · 下行通路','asama',[3,8,-34],[0,-16,-118],{asamaScene:'depth',fov:60}),
 asamaShrine:v('最深处 · 封印神社','asama',[29,1,-120],[0,-12,-152],{asamaScene:'depth'}),
 asamaShrineRear:v('最深处 · 背廊与承托','asama',[-42,0,-198],[0,-13,-157],{asamaScene:'depth'}),
 asamaShrineFoot:v('最深处 · 柱脚与石阶','asama',[18,-19,-127],[5,-21,-142],{asamaScene:'depth'}),
 asamaSection:v('深处与神社 · 可逆剖览','asama',[151,146,80],[0,-14,-75],{asamaScene:'depth',asamaCut:true}),
 asamaFossils:v('化石森林 · 沉积与遗骸','asama',[58,37,62],[0,7,-8],{asamaScene:'fossil',fov:61}),
 asamaFossilSection:v('化石森林 · 地层剖览','asama',[90,57,94],[0,7,-8],{asamaScene:'fossil',asamaCut:true}),
 asamaFossilClose:v('化石森林 · 硅化木近景','asama',[22,10,27],[-4,6,-3],{asamaScene:'fossil'})
};
Object.assign(G.PRESETS,views);Object.assign(G.IMPLEMENTED,locs);delete G.LANDMARKS.pending.sanctuary;
for(const k of Object.keys(locs))G.LANDMARKS.partial.add(k);
G.EXTRA_REGION_DEFAULTS={...(G.EXTRA_REGION_DEFAULTS||{}),seiki:'seikiOverview',asama:'asamaPyramid'};
for(const b of[{id:'seiki',name:'圣域 · 红叶山林',center:[-1260,190,-1010],poly:[[-1460,-1190],[-1085,-1190],[-1085,-850],[-1460,-850]],bottom:10,step:8},{id:'asama',name:'浅间净秽山 · 地下选景',space:'asama',center:[0,-20,0],poly:[],independent:true,bottom:-100,step:8}]){G.DIORAMA.blocks.push(b);G.DIORAMA.map.set(b.id,b);G.REGION_LABELS[b.id]=b.name;}
const owner=G.DIORAMA.owner;G.DIORAMA.owner=(x,z)=>Math.hypot((x+1270)/170,(z+1020)/135)<1?'seiki':owner(x,z);
for(const k of ['transform','point','inverse']){const old=G.DIORAMA[k];G.DIORAMA[k]=k==='transform'?((r,...a)=>IDs.includes(r)?{scale:1,offset:[0,0,0]}:old(r,...a)):((p,r,...a)=>IDs.includes(r)?[...p]:old(p,r,...a));}
function bank(id,far){const b=new Map();return{get(scene,mat='Stone',part='base',tile='0'){const key=[scene,mat,part,tile].join(':');if(!b.has(key))b.set(key,{g:new G.Geometry(),scene,mat,part});return b.get(key).g.place();},finish(meta={}){const meshes=[];for(const[key,o]of b)if(o.g.a.length)meshes.push(o.g.mesh(`${id}:${far?'overview':'detail'}:${key}`,o.mat==='Leaf'?'vegetation':'architecture',{owner:id,region:id,space:id==='seiki'?'surface':'asama',overview:far,material:'asama'+o.mat,asamaScene:o.scene,asamaPart:o.part,basis:'P'}));return{id,meshes,bytes:meshes.reduce((s,m)=>s+m.vertices.byteLength,0),signs:[],meta:{locations:id==='seiki'?['sanctuary','red_mountain']:Object.keys(locs).slice(2),basis:'P',surveyed:false,...meta}};}};}
function beam(g,a,b,r,col=C.wood,n=6,r2=r){if(G.length(G.sub(b,a))>1e-5)g.tube(a,b,r,col,n,r2);}
function crown(g,x,y,z,rx,ry,rz,col,n=8){const P=(i,j)=>{const a=TAU*i/n,t=Math.PI*j/4;return[x+rx*Math.sin(t)*Math.cos(a),y+ry*Math.cos(t),z+rz*Math.sin(t)*Math.sin(a)];};for(let i=0;i<n;i++){const u=(i+1)%n;g.tri(P(i,0),P(i,1),P(u,1),col);for(let j=1;j<3;j++)g.quad(P(i,j),P(i,j+1),P(u,j+1),P(u,j),col);g.tri(P(i,3),P(i,4),P(u,3),col);}}
function stone(g,x,y,z,rx,h,rz,seed=1,col=C.stone){const n=7,p=[],q=[];for(let i=0;i<n;i++){let a=TAU*i/n,r=1+.12*Math.sin(i*4+seed);p.push([x+rx*Math.cos(a)*r,y,z+rz*Math.sin(a)*r]);q.push([x+rx*.69*Math.cos(a)*r,y+h*(.9+.1*Math.sin(i+seed)),z+rz*.69*Math.sin(a)*r]);}for(let i=0;i<n;i++)g.quad(p[i],q[i],q[(i+1)%n],p[(i+1)%n],col);for(let i=1;i<n-1;i++)g.tri(q[0],q[i+1],q[i],col);for(let i=1;i<n-1;i++)g.tri(p[0],p[i],p[i+1],col);}
function tree(B,scene,x,y,z,s,seed,far,terrain=null,leafMat='Leaf'){
 const r=G.rng(seed),tile=scene==='surface'?`${Math.floor(x/80)},${Math.floor(z/80)}`:'0',g=B.get(scene,'Wood','trees',tile),l=B.get(scene,leafMat,'trees',tile);
 const top=[x+s*.08,y+s*1.8,z];beam(g,[x,y-.9,z],top,s*.12,C.wood,far?5:8,s*.045);
 for(let i=0;i<4;i++){const a=i*TAU/4+r()*.4,dx=Math.cos(a),dz=Math.sin(a),p=[x+dx*s*.55,y+s*(1.35+r()*.4),z+dz*s*.55];beam(g,[x,y+s*.65,z],p,s*.053,C.wood,5,s*.023);crown(l,p[0],p[1]+s*.19,p[2],s*.68,s*.37,s*.60,G.blend(C.leaf,C.light,r()*.18),far?5:8);}
 crown(l,top[0],top[1]+s*.07,top[2],s*.73,s*.39,s*.68,C.leaf,far?5:8);
 if(!far)for(let i=0;i<5;i++){const a=TAU*i/5,xx=x+Math.cos(a)*s*.29,zz=z+Math.sin(a)*s*.29,yy=terrain?terrain.height(xx,zz):y;beam(g,[x,y+s*.15,z],[xx,yy-.35,zz],s*.06,C.wood,5,s*.025);}
}
const path2=G.spline([[-1430,-884],[-1377,-941],[-1335,-981],[-1274,-1020],[-1320,-1060],[-1415,-1120],[-1460,-1180],[-1455,-1260],[-1410,-1370]],2);
function surface(t,far){const B=bank('seiki',far),r=G.rng(200916),pts=path2.map(([x,z])=>[x,t.height(x,z)+.27,z]);
 // Roads belong to the permanent low-detail context, never to the evicted detail pack.

 const treeSites=[];let count=0;for(let i=0;i<800&&count<115;i++){const a=r()*TAU,rad=Math.sqrt(r()),x=-1275+Math.cos(a)*rad*185,z=-1010+Math.sin(a)*rad*128,y=t.height(x,z);if(t.normal(x,z)[1]<.58||Math.min(...path2.map(p=>Math.hypot(p[0]-x,p[1]-z)))<8)continue;const size=8+r()*6;tree(B,'surface',x,y,z,size,i+1729,far,t);treeSites.push([x,y,z,size]);count++;}
 if(!far){const g=B.get('surface','Stone','roots');for(let i=0;i<40;i++){const p=pts[Math.floor(r()*pts.length)],x=p[0]+(r()>.5?1:-1)*(3+r()*3),z=p[2]+(r()-.5)*3;stone(g,x,t.height(x,z)-.3,z,.4+r(),.5+r()*.7,.6+r(),i);}}
 return B.finish({treeCount:count,treeSites,route:pts,terrainMutation:false,physicalPortal:false});
}
function ground(B,scene,x,y,z,w,d){B.get(scene,'Stone','ground').box(x,y-4,z,w,4,d,C.dark);B.get(scene,'Soil','ground').box(x,y-.2,z,w-.1,.21,d-.1,C.soil);}
function caveFloor(B,scene,x,y,z,rx,rz,far){const top=B.get(scene,'Soil','ground'),side=B.get(scene,'Rock','ground'),n=far?32:64;
 const point=(a,Y)=>[x+Math.cos(a)*rx,Y,z+Math.sin(a)*rz];
 for(let i=0;i<n;i++){const a=TAU*i/n,b=TAU*(i+1)/n,A=point(a,y),D=point(b,y),loA=point(a,y-8),loD=point(b,y-8);
  top.tri([x,y,z],D,A,C.soil);side.quad(loA,A,D,loD,C.dark);side.tri([x,y-8,z],loA,loD,C.dark);}
}
function cavern(B,scene,x,y,z,rx,rz,h,far,portal=null){
 const g=B.get(scene,'Rock','shell'),roof=B.get(scene,'Rock','roof'),n=far?16:32;
 const angles=Array.from({length:n+1},(_,i)=>TAU*i/n);
 if(portal)for(const a of [portal.angle-portal.span,portal.angle+portal.span])angles.push((a+TAU)%TAU);
 angles.sort((a,b)=>a-b);
 const p=(t,dy)=>{const f=(dy-y)/h;return[x+Math.cos(t)*rx*(1-.22*f*f),dy,z+Math.sin(t)*rz*(1-.22*f*f)];};
 for(let i=0;i<angles.length-1;i++){const a=angles[i],b=angles[i+1];if(b-a<1e-7)continue;
  const inDoor=portal&&Math.abs(Math.atan2(Math.sin((a+b)/2-portal.angle),Math.cos((a+b)/2-portal.angle)))<portal.span;
  for(let j=0;j<3;j++){const lo=Math.max(y+h*j/3,inDoor?portal.top:-Infinity),hi=y+h*(j+1)/3;if(hi<=lo)continue;
   (j===2?roof:g).quad(p(a,lo),p(b,lo),p(b,hi),p(a,hi),G.blend(C.dark,C.stone,.12+.05*Math.sin(i*3+j)));}
  roof.tri([x,y+h+12,z],p(a,y+h),p(b,y+h),C.dark);
 }
}
function arch(B,scene,x,y,z,w,h,mat='Stone',rotation=0){const g=B.get(scene,mat).place(x,y,z,rotation);
 for(const d of[-1,1]){g.box(d*(w/2+1.5),0,0,3,h,4,C.light);g.box(d*(w/2+1.5),0,0,4,1.2,5,C.stone);}
 g.box(0,h,0,w+8,2.3,5,C.light);g.box(0,h+2.3,0,w+9,.6,5.6,C.gold);g.place();
}
function pyramid(B,far){const scene='pyramid';caveFloor(B,scene,0,0,0,164,161,far);cavern(B,scene,0,-4,0,163,160,135,far);const g=B.get(scene,'Stone'),rim=B.get(scene,'Trim');g.box(0,-3,0,126,6,126,C.dark);g.box(0,3,0,120,1,120,C.light);
 const H=72,R=58,rows=far?9:24,ys=[...new Set([...Array.from({length:rows+1},(_,j)=>4+H*j/rows),16])].sort((a,b)=>a-b);
 for(let j=0;j<ys.length-1;j++){const y=ys[j],Y=ys[j+1],a=R*(1-(y-4)/H),b=R*(1-(Y-4)/H),col=G.blend(C.stone,C.light,.12+.06*Math.sin(j*1.7));
  for(let k=0;k<4;k++){g.place(0,0,0,k*Math.PI/2);
   if(k===0&&y<16){for(const d of[-1,1])g.quad([d*6,y,a],[d*a,y,a],[d*b,Y,b],[d*6,Y,b],col);}
   else if(b<1e-5)g.tri([-a,y,a],[a,y,a],[0,Y,0],col);
   else g.quad([-a,y,a],[a,y,a],[b,Y,b],[-b,Y,b],col);g.place();
   if(!far&&b>0){rim.place(0,0,0,k*Math.PI/2);
    if(k===0&&y<16){for(const d of[-1,1])rim.box(d*(a+6)/2,y,a+.08,a-6,.1,.14,C.dark);}
    else rim.box(0,y,a+.08,a*2,.1,.14,C.dark);rim.place();}
  }
 }
 // Both precision levels leave the same 12m-wide, 12m-high entrance aperture.
 arch(B,scene,0,4,58,10,11);for(const d of[-1,1])g.box(d*6,4,45.5,2,11,21,C.dark);
 g.box(0,15,45.25,14,2.3,20.5,C.dark);g.box(0,4,47.5,12,.3,25,C.dark);g.box(0,4,35,12,10,1,C.shadow);
 for(let i=0;i<8;i++)g.box(0,0,71.2-i*1.1,18,(i+1)*.5,1.15,C.stone);
 for(const d of[-1,1]){g.box(d*12,0,65,4,4,20,C.dark);for(let j=0;j<4;j++)stone(g,d*(80+j*12),0,-38+j*21,6,8+j*2,7,j);}
 B.get(scene,'Soil').box(0,.03,100,18,.07,53,C.light);
}
function stairs(g,a,b,w,col=C.stone){const n=Math.max(2,Math.ceil(Math.abs(b[1]-a[1])/.65)),dx=(b[0]-a[0])/n,dz=(b[2]-a[2])/n,len=Math.hypot(dx,dz),ang=Math.atan2(dx,dz);for(let i=0;i<n;i++){let t=i/n,y=G.mix(a[1],b[1],t),base=Math.min(a[1],b[1])-1;g.place(a[0]+dx*(i+.5),base,a[2]+dz*(i+.5),ang);g.box(0,0,0,w,y-base,len+.05,col);}g.place();}
function maze(B,far){const scene='shaft',g=B.get(scene,'Stone','maze'),trim=B.get(scene,'MazeTile','maze'),N=7,S=13,x0=84,z0=-45.5,y=0,visited=new Set(['0,3']),stack=[[0,3]],edges=new Set(),r=G.rng(202004),key=(a,b)=>[a.join(','),b.join(',')].sort().join('|');
 while(stack.length){const [x,z]=stack.at(-1),ns=[[x+1,z],[x-1,z],[x,z+1],[x,z-1]].filter(([a,b])=>a>=0&&a<N&&b>=0&&b<N&&!visited.has(`${a},${b}`));if(!ns.length){stack.pop();continue;}const n=ns[Math.floor(r()*ns.length)];edges.add(key([x,z],n));visited.add(n.join(','));stack.push(n);}
 ground(B,scene,x0+N*S/2,y,x0*0,N*S+6,N*S+6);
 for(let x=0;x<N;x++)for(let z=0;z<N;z++){const X=x0+x*S,Z=z0+z*S,col=C.light;trim.box(X+S/2,y+.02,Z+S/2,S-.15,.12,S-.15,col);
  if(z===0)g.box(X+S/2,y,Z,S+2,12,2,C.stone);
  if(x===0&&z!==3)g.box(X,y,Z+S/2,2,12,S+2,C.stone);
  if(x===N-1?z!==3:!edges.has(key([x,z],[x+1,z])))g.box(X+S,y,Z+S/2,2,12,S+2,C.stone);
  if(z===N-1||!edges.has(key([x,z],[x,z+1])))g.box(X+S/2,y,Z+S,S+2,12,2,C.stone);
 }
 // The corridor attaches to the shaft's actual east opening, without a facade blocking it.
 g.box(64,y-3,0,41,3,12,C.dark);arch(B,scene,81,y,0,11,13,'Stone',Math.PI/2);B.get(scene,'Rock','roof').box(130,y+15,0,105,3,105,C.dark);
 return {cells:N*N,passages:edges.size,edges:[...edges].sort(),entrance:[x0+S/2,y,0],exit:[x0+(N-.5)*S,y,0]};
}
function shaft(B,far){const scene='shaft',g=B.get(scene,'Stone','shaft'),wall=B.get(scene,'Rock','shell'),n=far?48:120;caveFloor(B,scene,0,-77,0,56,56,far);
 const P=(a,r,y)=>[Math.cos(a)*r,y,Math.sin(a)*r];for(let i=0;i<n;i++){const a=TAU*i/n,b=TAU*(i+1)/n,y=-72*i/n,Y=-72*(i+1)/n;g.quad(P(a,32,y),P(a,40,y),P(b,40,Y),P(b,32,Y),C.stone);g.quad(P(a,32,y-2),P(a,32,y),P(b,32,Y),P(b,32,Y-2),C.dark);g.quad(P(a,40,y),P(a,40,y-2),P(b,40,Y-2),P(b,40,Y),C.dark);
  const opening=Math.min((a+b)/2,TAU-(a+b)/2)<.2;if(opening){wall.quad(P(a,53,-77),P(b,53,-77),P(b,53,0),P(a,53,0),C.dark);wall.quad(P(a,53,14),P(b,53,14),P(b,53,18),P(a,53,18),C.dark);}else wall.quad(P(a,53,-77),P(b,53,-77),P(b,53,18),P(a,53,18),C.dark);
  if(i%(far?6:10)===0)beam(g,P(a,49,y-12),P(a,37,y-2),1.5,C.stone,6);
 }
 // Four supported landscape recesses; seasonal specimens and dimensions are P.
 for(let k=0;k<4;k++){const a=TAU*(k+.22)/4,y=-72*(k+.22)/4,x=Math.cos(a)*46,z=Math.sin(a)*46;
  const q=B.get(scene,'Stone','seasons');q.place(x,y-3,z,Math.PI/2-a);q.box(0,0,0,20,3,18,C.stone);q.place();
  beam(q,P(a,54,y-16),[x,y-3,z],2,C.dark,6);for(const off of[-.13,.13])beam(q,P(a+off,54,y-10),P(a+off,40,y-3),1.2,C.dark,6);
  const plants=B.get(scene,k===3?'SnowLeaf':k===0?'PinkLeaf':k===2?'RedLeaf':'Leaf','seasons');
  if(k===3){stone(plants,x,y,z,5,.8,5,k,C.snow);tree(B,scene,x-2,y,z,4.1,109+k,far,null,'SnowLeaf');}
  else {tree(B,scene,x,y,z,4.0,102+k,far,null,k===0?'PinkLeaf':k===2?'RedLeaf':'Leaf');for(let j=0;j<4;j++)crown(plants,x+Math.sin(j*2)*6,y+1,z+Math.cos(j*2)*5,2,1.2,2,C.light,far?5:8);}
  if(k===1)B.get(scene,'Water','seasons').box(x+5,y+.05,z-2,4,.1,6,C.water);
 }
 g.box(39,-2,0,18,2,12,C.stone);const m=maze(B,far);return{maze:m,spiralSegments:n,shaftRoute:Array.from({length:25},(_,i)=>P(TAU*i/24,36,-72*i/24))};
}
function roof(B,scene,x,y,z,w,d,far){const g=B.get(scene,'Roof','shrineRoof'),e=B.get(scene,'Wood','shrineRoof'),h=8;for(const s of[-1,1]){const p=(xx,t)=>[x+xx,y+h*(1-t)+.55*t*t,z+s*d/2*t];for(let j=0;j<4;j++){let a=j/4,b=(j+1)/4;g.quad(p(-w/2,a),p(w/2,a),p(w/2,b),p(-w/2,b),C.roof);}e.box(x,y+.2,z+s*d/2,w,.9,1.1,C.wood);if(!far)for(let u=-w/2;u<w/2;u+=1.3)for(let j=0;j<4;j++)beam(g,p(u,j/4),p(u,(j+1)/4),.10,C.light,4);}
 g.box(x,y+h,z,w+.8,.9,1.2,C.roof);for(const side of[-1,1]){const xx=x+side*w/2;for(const off of[-.22,.22])e.tri([xx+off,y,z-d/2],[xx+off,y+h,z],[xx+off,y,z+d/2],C.wood);}}
function depth(B,far){const scene='depth';for(const x of[-44,44])ground(B,scene,x,-4,5,64,154);ground(B,scene,0,-4,14,24,136);cavern(B,scene,0,-8,1,87,97,62,far,{angle:Math.PI*1.5,span:.2,top:15});ground(B,scene,0,-27,-154,133,110);cavern(B,scene,0,-30,-155,84,80,57,far,{angle:Math.PI/2,span:.2,top:15});
 const g=B.get(scene,'Stone'),w=B.get(scene,'Water');for(const s of[-1,1]){w.box(s*40,-3.95,2,49,.08,98,C.water);for(let j=0;j<7;j++){const z=55-j*18;stone(g,s*(60+Math.sin(j)*7),-4,z,4,25+(j%3)*6,5,j);}}
 const briar=B.get(scene,'Fossil');for(let i=0;i<18;i++){const d=i%2?1:-1,x=d*(23+(i%4)*7),z=52-Math.floor(i/2)*13,h=6+(i%5)*1.7;
  const A=[x,-4,z],M=[x+d*2,h*.35-4,z-1],D=[x-d*2,h-4,z-3];beam(briar,A,M,.65,C.dark,6,.46);beam(briar,M,D,.46,C.stone,6,.17);
  for(let j=0;j<3;j++){const t=.25+j*.22,P=G.add(A,G.mul(G.sub(D,A),t));beam(briar,P,[P[0]+d*(3+j),P[1]+3,P[2]+(j-1)*2],.28,C.stone,5,.07);}}
 g.box(0,-8,9,15,5,139,C.stone);for(let z=74;z>-59;z-=5)g.box(0,-2.98,z,14.8,.07,.1,C.light);
 stairs(g,[0,-3,-59],[0,-27,-113],13);for(const s of[-1,1]){g.box(s*13,-29,-86,9,47,61,C.dark);}B.get(scene,'Rock','roof').box(0,17,-86,33,9,64,C.dark);
 // Actual openings remain in both cave shells; center floor banks leave the descent uncovered.
 const timber=B.get(scene,'Wood'),plaster=B.get(scene,'Paper'),detail=B.get(scene,'Trim');
 g.box(0,-31,-157,38,12,32,C.dark);g.box(0,-20,-157,40,1,34,C.stone);timber.box(0,-19,-157,36,.8,30,C.wood);
 // Three substantial walls and a recessed open front, rather than painted-on doors.
 plaster.box(0,-18.2,-168,28,12,1.3,C.paper);for(const d of[-1,1]){plaster.box(d*14,-18.2,-157,1.3,3.2,23,C.paper);plaster.box(d*14,-9,-157,1.3,2.8,23,C.paper);for(const z of[-165.5,-148.5])plaster.box(d*14,-15,z,1.3,6,6,C.paper);for(let z=-162;z<=-152;z+=2)timber.box(d*14,-15,z,.65,6,.25,C.wood);for(const y of[-15,-12,-9])timber.box(d*14,y,-157,.8,.3,11,C.wood);}
 for(const x of[-16,-8,8,16])for(const z of[-170,-143]){timber.box(x,-18.2,z,.95,13,.95,C.wood);g.box(x,-19,z,1.4,.8,1.4,C.stone);}
 for(const z of[-170,-143]){timber.box(0,-7,z,34,1.2,1,C.cut);timber.box(0,-12,z,32,.55,.65,C.wood);}
 for(const s of[-1,1]){timber.box(s*16,-7,-157,1,1.2,29,C.cut);plaster.box(s*10,-18,-145,6,10,1,C.paper);}
 timber.box(0,-18,-165,11,4,2.5,C.wood);detail.box(0,-13.9,-165,12,.3,3.5,C.gold);stone(detail,0,-13.5,-165,2,4,1.4,31,C.stone);
 if(!far){
  for(let y=-29;y<-20;y+=2.2)for(let x=-17;x<18;x+=6){g.box(x,y,-140.88,5.85,2.06,.24,C.stone);g.box(x,y,-173.12,5.85,2.06,.24,C.stone);}
  for(const d of[-1,1])for(let y=-29;y<-20;y+=2.2)for(let z=-170;z<-143;z+=5.5)g.box(d*19.12,y,z,.24,2.06,5.34,C.stone);
  for(let x=-15;x<=15;x+=5){timber.box(x,-18.2,-170,.42,3.3,.42,C.wood);for(const y of[-17,-15])timber.box(0,y,-170,31,.3,.4,C.wood);}
  for(let j=0;j<16;j++){const x=-10+j*20/16,X=-10+(j+1)*20/16,Y=t=>-8.5-.8*(1-t*t/100);beam(timber,[x,Y(x),-142.35],[X,Y(X),-142.35],.17,C.cut,6);}
  for(const x of[-6,-2,2,6]){plaster.quad([x,-9,-142.25],[x+1.2,-9.8,-142.25],[x+.3,-10.6,-142.25],[x-.7,-10,-142.25],C.paper);}
 }
 for(const d of[-1,1]){g.box(d*24,-27,-130,3,1,3,C.stone);g.cone(d*24,-26,-130,.6,.6,3,C.stone,8);g.box(d*24,-23,-130,2.4,.7,2.4,C.stone);B.get(scene,'Lamp').box(d*24,-22.3,-130,1.8,1.6,1.8,C.light);g.box(d*24,-20.7,-130,3,.5,3,C.dark);}
 roof(B,scene,0,-5,-157,41,36,far);stairs(g,[0,-27,-123],[0,-18.2,-140],14);
 // A separate torii with actual mortised crossmembers, not the Hakurei model.
 for(const s of[-1,1]){timber.cone(s*12,-27,-113,.65,.5,17,C.red,far?6:10);g.box(s*12,-28,-113,2.2,1.3,2.2,C.stone);}timber.box(0,-13,-113,29,1.1,1.0,C.red);timber.box(0,-10,-113,33,1.25,1.6,C.wood);
 for(const s of[-1,1])for(let j=0;j<5;j++)stone(g,s*(38+j*3),-27,-126-j*12,5,5+j,6,j);
 return{route:[[0,-3,60],[0,-3,-59],[0,-27,-113],[0,-27,-123],[0,-18.2,-140]],fullInterior:false};
}
function fossils(B,far){const scene='fossil';caveFloor(B,scene,0,0,-6,106,97,far);cavern(B,scene,0,-4,-6,105,96,73,far);
 const r=G.rng(20666),g=B.get(scene,'Fossil'),rock=B.get(scene,'Rock');let count=0;
 for(let i=0;i<43;i++){const x=(r()-.5)*151,z=(r()-.5)*135;if(Math.abs(x)<10&&z>0)continue;count++;const h=8+r()*20,rad=1.2+r()*1.6,A=[x,-.4,z],M=[x+Math.sin(i)*1.3,h*.48,z+Math.cos(i)*1.4],D=[x+Math.sin(i)*2.5,h,z-1];
  beam(g,A,M,rad,C.bone,far?7:11,rad*.72);beam(g,M,D,rad*.72,C.bone,far?7:11,rad*.37);
  for(let k=0;k<3;k++){const a=r()*TAU,L=5+r()*6,t=.33+k*.19,P=G.add(A,G.mul(G.sub(D,A),t)),Q=[P[0]+Math.cos(a)*L*.6,P[1]+L*.4,P[2]+Math.sin(a)*L*.6],R=[Q[0]+Math.cos(a+.4)*L*.35,Q[1]+L*.55,Q[2]+Math.sin(a+.4)*L*.35];beam(g,P,Q,rad*.32,C.bone,far?5:7,rad*.19);beam(g,Q,R,rad*.19,C.bone,far?5:7,rad*.08);}
  stone(rock,x,-.6,z,rad*1.6,1.1,rad*1.2,i,C.stone);
 }
 for(const[x,z,a]of[[-7,-5,.45],[32,-29,-.3],[-34,19,.8]]){beam(g,[x,2,z],[x+18*Math.cos(a),2.7,z+18*Math.sin(a)],1.8,C.bone,far?7:12);const N=far?24:64;for(let j=0;j<N;j++){const t=j/N*TAU*2.7,u=(j+1)/N*TAU*2.7,R=3.5*(1-j/N);beam(g,[x-5+Math.cos(t)*R,.25,z+Math.sin(t)*R],[x-5+Math.cos(u)*(R-.035),.25,z+Math.sin(u)*(R-.035)],.14,C.light,5);}}
 for(let i=0;i<26;i++){const a=r()*TAU,x=Math.cos(a)*(76+r()*15),z=-6+Math.sin(a)*(73+r()*13);stone(rock,x,-.8,z,3+r()*5,2+r()*8,3+r()*4,i);}
 const path=B.get(scene,'Soil');for(let j=0;j<12;j++)path.box(Math.sin(j*.42)*3,.035,83-j*7,11,.07,7.05,C.light);
 return{petrifiedTrees:count};
}
function underground(far){const B=bank('asama',far);pyramid(B,far);const s=shaft(B,far),d=depth(B,far);const f=fossils(B,far);return B.finish({shaft:s,depth:d,fossil:f,physicalSurfaceConnection:false,sceneSelection:true});}
G.ASAMA={version:'0.29-asama.1',ids:IDs,locations:Object.keys(locs),views,surfacePath:path2,buildSurface:surface,buildUnderground:underground};
G.extraOverviewBuilders=[...(G.extraOverviewBuilders||[]),data=>[...surface(new G.Terrain(data),true).meshes,...underground(true).meshes]];
const oldBuild=G.buildRegion;G.buildRegion=async function(data,id,legacy){if(!IDs.includes(id))return oldBuild(data,id,legacy);const start=performance.now(),p=id==='seiki'?surface(new G.Terrain(data),false):underground(false);p.builtMs=performance.now()-start;return p;};
})(globalThis.GA);
