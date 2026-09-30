/* Mayohiga — a small abandoned settlement, NOT the Yakumo residence.
 * TH07 stage 2 / BAiJR Chen: identity and inhabitants. All measured forms,
 * house plans, terraces, ordinary cats and the approach are project design P.
 * The original continuous ground and inherited trees are never rewritten.
 */
(function(G){'use strict';
const ID='mayohiga',TAU=Math.PI*2,CX=-1723,CZ=-1178;
const C=Object.fromEntries(Object.entries({wood:'#655644',edge:'#8c785d',dark:'#453f35',wall:'#b2aa8d',paper:'#bcb7a3',roof:'#596465',ridge:'#768080',stone:'#8c8d7b',mortar:'#6a7162',earth:'#a19575',field:'#8f8869',grass:'#858e61',leaf:'#688366',young:'#829777',bark:'#625a4a',red:'#925747',black:'#424744',cream:'#c6c2a6',ginger:'#b48f64'}).map(([k,v])=>[k,G.rgb(v)]));
const houses=[
 {id:'main',x:-1700,z:-1165,w:29,d:16,h:7.6,a:0,kind:'veranda'},
 {id:'west',x:-1750,z:-1167,w:23,d:14,h:6.6,a:.14,kind:'leanTo'},
 {id:'north',x:-1723,z:-1214,w:20,d:14,h:7.1,a:-.13,kind:'store'},
 {id:'ruin',x:-1772,z:-1208,w:18,d:12,h:5.8,a:-.10,kind:'ruin'}
];
const farms=[{x:-1742,z:-1105,w:37,d:8},{x:-1745,z:-1118,w:36,d:8},{x:-1745,z:-1131,w:33,d:8}];
const gate={x:-1704,z:-1090,w:10,h:11};
// Narrow irregular path ending exactly on the pre-existing Seiki centreline.
const approach=G.spline([[-1704,-1090],[-1690,-1079],[-1662,-1080],[-1628,-1100],[-1588,-1126],[-1537,-1148],[-1490,-1167],[-1460,-1180]],1.0);
const entryXZ=s=>[s.x+Math.sin(s.a)*(s.d/2+16),s.z+Math.cos(s.a)*(s.d/2+16)];
const paths=[approach,
 G.spline([[-1704,-1090],[-1708,-1115],[-1720,-1129],entryXZ(houses[0])],1),
 G.spline([[-1720,-1129],[-1734,-1137],entryXZ(houses[1])],1),
 G.spline([[-1720,-1129],[-1730,-1152],[-1733,-1181],entryXZ(houses[2])],1),
 G.spline([[-1733,-1181],[-1752,-1180],entryXZ(houses[3])],1)];
const v=(label,eye,target,fov=49,extra={})=>({label,eye,target,fov,region:ID,space:'surface',era:'TH07／文花帖猫村选景 · 山址、屋形与道路P',...extra});
const views={
 mayoOverview:v('迷途之家 · 山坳旧村',[-1815,148,-1004],[-1684,69,-1160]),
 mayoGate:v('迷途之家 · 褪色鸟居',[-1704,63,-1110],[-1704,54,-1090],60),
 mayoLane:v('迷途之家 · 空街与缘侧',[-1728,70,-1124],[-1704,62,-1163],54),
 mayoHouse:v('旧屋 · 门洞与猫憩',[-1715,67,-1142],[-1701,63,-1163],53),
 mayoRear:v('旧屋 · 背墙与山脚',[-1669,86,-1198],[-1703,62,-1164],52),
 mayoFoot:v('旧屋 · 柱脚与石基',[-1680,56,-1148],[-1689,57,-1156],55),
 mayoFields:v('荒田 · 田埂与草籽',[-1721,78,-1100],[-1743,50,-1118],53),
 mayoRuin:v('残屋 · 缺瓦与木架',[-1796,76,-1180],[-1772,61,-1207],53),
 mayoNorth:v('山村 · 后巷',[-1769,100,-1251],[-1724,63,-1173],51),
 mayoConnection:v('林径 · 接回旧山路',[-1568,226,-1090],[-1504,130,-1172],53),
 mayoSection:v('旧屋 · 可逆屋顶剖览',[-1721,84,-1140],[-1700,60,-1165],53,{mayoCut:true})
};
const block={id:ID,name:'迷途之家 · 荒村与猫',poly:[[-1840,-1330],[-1580,-1330],[-1580,-1040],[-1840,-1040]],center:[CX,62,CZ],bottom:10,step:8};
G.DIORAMA.blocks.push(block);G.DIORAMA.map.set(ID,block);G.REGION_LABELS[ID]=block.name;
const oldOwner=G.DIORAMA.owner;G.DIORAMA.owner=(x,z)=>Math.hypot((x-CX)/145,(z-CZ)/119)<1?ID:oldOwner(x,z);
Object.assign(G.PRESETS,views);G.IMPLEMENTED.mayohiga='mayoOverview';G.LANDMARKS.partial.add(ID);
G.EXTRA_REGION_DEFAULTS={...(G.EXTRA_REGION_DEFAULTS||{}),[ID]:'mayoOverview'};
function bank(far){const bins=new Map();return{get(zone,mat='Wood',part='base'){const k=[zone,mat,part].join(':');if(!bins.has(k))bins.set(k,{g:new G.Geometry(),mat,part,zone});return bins.get(k).g.place();},finish(meta){const meshes=[];for(const[k,b]of bins)if(b.g.a.length)meshes.push(b.g.mesh(`${ID}:${far?'overview':'detail'}:${k}`,['trees','undergrowth'].includes(b.part)?'vegetation':'architecture',{owner:ID,region:ID,space:'surface',overview:far,material:'mayo'+b.mat,mayoPart:b.part,mayoZone:b.zone,basis:'P'}));return{id:ID,meshes,signs:[],bytes:meshes.reduce((n,m)=>n+m.vertices.byteLength,0),meta};}};}
const world=(s,x,y,z)=>[s.x+Math.cos(s.a)*x+Math.sin(s.a)*z,y,s.z-Math.sin(s.a)*x+Math.cos(s.a)*z];
function ell(g,x,y,z,rx,ry,rz,col,n=8,rings=4){const p=(i,j)=>{const a=TAU*i/n,b=Math.PI*j/rings;return[x+Math.sin(b)*Math.cos(a)*rx,y+Math.cos(b)*ry,z+Math.sin(b)*Math.sin(a)*rz];};for(let i=0;i<n;i++){const k=(i+1)%n;g.tri(p(i,0),p(k,1),p(i,1),col);for(let j=1;j<rings-1;j++)g.quad(p(i,j),p(k,j),p(k,j+1),p(i,j+1),col);g.tri(p(i,rings-1),p(k,rings-1),p(i,rings),col);}}
function foundation(B,s,ground,far,floor,w=s.w+2,d=s.d+2){const g=B.get(s.id,'Stone'),o=[[-w/2+.7,-d/2],[w/2-.7,-d/2],[w/2,-d/2+.7],[w/2,d/2-.7],[w/2-.7,d/2],[-w/2+.7,d/2],[-w/2,d/2-.7],[-w/2,-d/2+.7]];
 const high=o.map(([x,z])=>world(s,x,floor-.45,z)),low=o.map(([x,z])=>{const p=world(s,x,0,z);p[1]=Math.min(ground.near.height(p[0],p[2]),ground.far.height(p[0],p[2]))-1.3;return p;});
 for(let i=0;i<8;i++){const k=(i+1)%8;g.quad(low[i],high[i],high[k],low[k],C.mortar);if(!far){const a=high[i],b=high[k],L=G.length(G.sub(a,b)),N=Math.max(1,Math.ceil(L/3.7));
  for(let r=0,Y=floor-1.9;Y>Math.min(low[i][1],low[k][1]);Y-=1.45,r++)for(let j=0;j<N+1;j++){const u=G.clamp((j-.5*(r%2)+.035)/N,0,1),v=G.clamp((j+1-.5*(r%2)-.035)/N,0,1);if(v-u<.015)continue;const A=G.add(a,G.mul(G.sub(b,a),u)),D=G.add(a,G.mul(G.sub(b,a),v));const y0=Math.max(Y,G.mix(low[i][1],low[k][1],u)),y1=Math.max(Y,G.mix(low[i][1],low[k][1],v));if(y0>=Y+1.35||y1>=Y+1.35)continue;
   const normal=G.norm([b[2]-a[2],0,a[0]-b[0]]),P=(p,y,e)=>[p[0]+normal[0]*e,y,p[2]+normal[2]*e];g.quad(P(A,y0,.17),P(A,Y+1.34,.20),P(D,Y+1.34,.20),P(D,y1,.17),G.blend(C.stone,C.wall,.08+.035*((j+r)%3)));}
 }}for(let i=1;i<7;i++){g.tri(high[0],high[i+1],high[i],C.stone);g.tri(low[0],low[i],low[i+1],C.mortar);}
 return {floor,footprint:high.map((p,i)=>({top:p,bottom:low[i]}))};
}
function roof(B,s,far,floor){const w=s.w+4.4,d=s.d+5.0,rise=d*.26,base=floor+s.h,g=B.get(s.id,'Roof','roof').place(s.x,base,s.z,s.a),wood=B.get(s.id,'Wood','roof').place(s.x,base,s.z,s.a),tile=B.get(s.id,'Ridge','roof').place(s.x,base,s.z,s.a);
 const y=(x,t)=>rise*(1-t)+.36*t*t-.23*Math.sin((x/w+.5)*Math.PI)*t;
 for(const side of[-1,1]){const P=(x,t,off=0)=>[x,y(x,t)+off,side*d/2*t],rows=6,cols=far?8:24;
  for(let i=0;i<cols;i++)for(let j=0;j<rows;j++){const x0=-w/2+w*i/cols,x1=-w/2+w*(i+1)/cols,t0=j/rows,t1=(j+1)/rows;const gap=s.kind==='ruin'&&side===1&&i>=Math.floor(cols*.28)&&i<Math.ceil(cols*.62)&&j>=2;if(gap)continue;
   const a=P(x0,t0),b=P(x1,t0),c=P(x1,t1),e=P(x0,t1),col=G.blend(C.roof,C.ridge,.035*((i+2*j)%3));side===1?g.quad(b,a,e,c,col):g.quad(a,b,c,e,col);
   if(s.kind==='ruin'){const A=P(x0,t0,-.38),D=P(x1,t1,-.38);g.quad(A,a,b,[x1,y(x1,t0)-.38,side*d/2*t0],C.dark);g.quad(e,P(x0,t1,-.38),D,c,C.dark);}
  }
  // Thick eaves, open rafters rather than a black rectangle under the entire roof.
  wood.box(0,-.3,side*d/2,w,.64,.7,C.wood);
  for(let x=-w/2+.55;x<w/2;x+=far?4.3:1.9){wood.tube(P(x,0,-.44),P(x,1,-.42),.18,C.edge,4);if(!far&&!(s.kind==='ruin'&&side===1&&x>-w*.24&&x<w*.12)){
   for(let j=0;j<6;j++)tile.tube(P(x,j/6,.10),P(x,(j+1)/6,.10),.085,C.ridge,5);
  }}
  if(!far)for(let row=1;row<=10;row++){const t=row/10;
   for(let x=-w/2+.05;x<w/2-.1;x+=1.0){const end=Math.min(x+.96,w/2-.05);
    if(s.kind==='ruin'&&side===1&&x>-w*.24&&x<w*.14&&t>.33)continue;
    // Crosswise raised tile lips break up the long channels at an architectural scale.
    const a=P(x,t,.035),b=P(end,t,.035),c=P(end,Math.max(0,t-.015),.115),d=P(x,Math.max(0,t-.015),.115);
    tile.quad(a,b,c,d,G.blend(C.roof,C.ridge,.35));
   }
  }
  for(const end of[-1,1])wood.tube(P(end*w/2,0),P(end*w/2,1),.26,C.edge,4);
 }
 tile.box(0,rise,0,w+.5,.4,.62,C.ridge);if(!far)for(let x=-w/2;x<w/2;x+=1.35)tile.box(x,rise+.02,0,1.24,.42,.69,C.ridge);
 // Two-sided gables enclosing the attic, with an intentional breach only in the ruin.
 for(const side of[-1,1]){const x=side*s.w/2,a=[x,-.2,-s.d/2],b=[x,rise-.46,0],c=[x,-.2,s.d/2];if(s.kind!=='ruin'){wood.tri(a,b,c,C.wood);wood.tri([x-side*.35,c[1],c[2]],[x-side*.35,b[1],b[2]],[x-side*.35,a[1],a[2]],C.wood);}wood.tube([x,-.2,-s.d/2],[x,-.2,s.d/2],.28,C.edge,4);}
}
function house(B,s,ground,far){let floor=-Infinity;for(let x=-s.w/2-1;x<=s.w/2+1;x+=2)for(let z=-s.d/2-1;z<=s.d/2+1;z+=2){const p=world(s,x,0,z);floor=Math.max(floor,ground.near.height(p[0],p[2]),ground.far.height(p[0],p[2]));}floor+=.70;
 const foot=foundation(B,s,ground,far,floor),g=B.get(s.id,'Wood').place(s.x,floor,s.z,s.a),wall=B.get(s.id,'Wall').place(s.x,floor,s.z,s.a),paper=B.get(s.id,'Paper').place(s.x,floor,s.z,s.a),bay=s.w/4;
 g.box(0,-.44,0,s.w,.45,s.d,C.dark);for(let x=-s.w/2+.65;x<s.w/2;x+=1.4)g.box(x,.015,0,1.31,.09,s.d-.35,C.edge);
 const beams=(z)=>{for(let i=0;i<=4;i++)g.box(-s.w/2+i*bay,0,z,.48,s.h,.50,C.wood);g.box(0,s.h-.35,z,s.w+.4,.45,.6,C.edge);g.box(0,.22,z,s.w,.32,.58,C.dark);};beams(-s.d/2);beams(s.d/2);
 for(const side of[-1,1])for(let i=0;i<4;i++){const x=-s.w/2+(i+.5)*bay,z=side*s.d/2,open=side===1&&(i===1||i===2);if(open){g.box(x,s.h-1.4,z,bay-.5,1.05,.55,C.wood);if(s.kind==='store'&&i===2)for(let j=0;j<6;j++)g.box(x-bay/2+.55+j*(bay-.85)/6,.65,z-.2,.5,s.h-2.2,.3,C.edge);continue;}
  wall.box(x,0,z,bay-.49,1.9,.62,C.wall);wall.box(x,s.h-1.3,z,bay-.49,.95,.62,C.wall);
  for(const dir of[-1,1])g.box(x+dir*(bay/2-.6),1.9,z,.45,s.h-3.2,.9,C.wood);
  if(s.kind==='ruin'&&side===1&&i===0)continue;
  if(s.kind!=='ruin')paper.box(x,2.1,z-side*.2,bay-1.2,s.h-3.75,.12,C.paper);
  if(!far)for(let j=0;j<5;j++){if(s.kind==='ruin'&&j===2)continue;g.box(x-(bay-1.1)/2+j*(bay-1.1)/4,2.0,z+side*.04,.14,s.h-3.4,.26,C.wood);}g.box(x,s.h*.52,z,bay-1.0,.16,.3,C.edge);
 }
 // Deep side windows: bottom/upper wall pieces and jambs surround actual apertures.
 for(const side of[-1,1]){const x=side*s.w/2;wall.box(x,0,0,.65,2.3,s.d,C.wall);wall.box(x,s.h-1.1,0,.65,.9,s.d,C.wall);
  for(const end of[-1,1])wall.box(x,2.3,end*(s.d/2-2),.65,s.h-3.4,4,C.wall);
  g.box(x,s.h-1.15,0,.88,.28,s.d,C.edge);if(!far)for(let z=-s.d/2+4.2;z<=s.d/2-4.2;z+=.68)g.box(x,2.3,z,.42,s.h-3.45,.18,C.wood);
  for(const z of[-s.d/2,-s.d/4,0,s.d/4,s.d/2])g.box(x,0,z,.52,s.h,.5,C.wood);
  if(!far)g.tube([x+side*.34,.6,-s.d*.40],[x+side*.34,2.2,s.d*.40],.12,C.edge,4);
 }
 const verandaZ=s.d/2+1.9,verandaDepth=3.6;
 g.box(0,-.65,verandaZ,s.w+2,.55,verandaDepth,C.wood);if(!far)for(let x=-s.w/2-.7;x<s.w/2+1;x+=1.1)g.box(x,-.1,verandaZ,1,.12,verandaDepth-.1,C.edge);
 for(const x of[-s.w/2,0,s.w/2]){const p=world(s,x,0,verandaZ+.6),b=Math.min(ground.near.height(p[0],p[2]),ground.far.height(p[0],p[2]));const stone=B.get(s.id,'Stone');stone.box(p[0],b-.45,p[2],1.35,1.25,1.35,C.stone);stone.place();g.box(x,b-floor+.7,verandaZ+.6,.46,Math.max(.12,floor-b-1.3),.46,C.wood);}
 const stairEnd=world(s,0,0,s.d/2+16),bottom=Math.max(ground.near.height(stairEnd[0],stairEnd[2]),ground.far.height(stairEnd[0],stairEnd[2]))+.15,N=Math.max(2,Math.ceil((floor-bottom)/.48)),L=12.3;
 for(let i=0;i<N;i++){const z=s.d/2+3.8+(i+.5)*L/N,top=G.mix(floor,bottom,(i+1)/N),p=world(s,0,0,z),b=Math.min(ground.near.height(p[0],p[2]),ground.far.height(p[0],p[2]))-.6;const st=B.get(s.id,'Stone').place(s.x,0,s.z,s.a);st.box(0,b,z,5.6,Math.max(.16,top-b),L/N+.04,C.stone);}
 roof(B,s,far,floor);
 if(!far){const f=B.get(s.id,'Wood','props').place(s.x,floor,s.z,s.a);if(s.kind==='veranda'){f.box(7,.1,-3.5,4,.62,2.8,C.wood);f.box(7,.72,-3.5,4.3,.12,3.05,C.edge);f.box(-7,.09,-3.5,6,.12,5.5,C.paper);for(const x of[-10,11])f.box(x,.04,verandaZ,2.5,.48,1.7,C.edge);}
 }
 if(s.kind==='leanTo'){
  const poles=B.get(s.id,'Wood').place(s.x,floor,s.z,s.a);
  for(const z of[-5,5]){const p=world(s,-s.w/2-4.2,0,z),base=Math.min(ground.near.height(p[0],p[2]),ground.far.height(p[0],p[2]));
   poles.box(-s.w/2-4.2,base-floor,z,.46,floor+5-base,.46,C.wood);
   B.get(s.id,'Stone').box(p[0],base-.45,p[2],1.1,.8,1.1,C.stone);}
  const e=B.get(s.id,'Roof','roof').place(s.x,floor,s.z,s.a);
  e.quad([-s.w/2-5,4.9,6],[-s.w/2-5,4.9,-6],[-s.w/2+.1,6.3,-6],[-s.w/2+.1,6.3,6],C.roof);
  e.box(-s.w/2-5,4.55,0,.42,.40,12.1,C.wood);
 }
 return {...s,...foot,entry:[stairEnd[0],bottom,stairEnd[2]],stairs:N};
}
function farm(B,s,ground,far){const t=ground,soil=B.get('fields','Soil'),stone=B.get('fields','Stone'),grass=B.get('fields','Grass','undergrowth');
 for(let x=-s.w/2;x<s.w/2;x+=2)for(let z=-s.d/2;z<s.d/2;z+=1){const p=(X,Z)=>[s.x+X,t.height(s.x+X,s.z+Z)+.12,s.z+Z];soil.quad(p(x,z),p(x,z+1),p(x+2,z+1),p(x+2,z),G.blend(C.field,C.earth,.08));}
 // Low retaining edges with a buried lower edge, not floating rectangular farm plates.
 for(let i=0;i<Math.ceil(s.w/2.8);i++){const x=s.x-s.w/2+(i+.5)*2.8,z=s.z+s.d/2+.35,y=t.height(x,z);stone.box(x,y-.65,z,2.6,1.3,.85,G.blend(C.stone,C.mortar,(i%3)*.05));}
 if(!far){const R=G.rng(Math.abs(s.x)*31);for(let i=0;i<80;i++){const x=s.x+(R()-.5)*(s.w-1),z=s.z+(R()-.5)*(s.d-1),y=t.height(x,z)+.17;for(let j=0;j<3;j++){const a=TAU*j/3+i;grass.tri([x-.09,y,z],[x+Math.cos(a)*.35,y+.65+R()*.3,z+Math.sin(a)*.35],[x+.09,y,z],C.grass);}}}
}
function tree(B,x,z,size,seed,t,far){const y=t.height(x,z),R=G.rng(seed),g=B.get('grove'+Math.floor(x/90),'Wood','trees'),leaf=B.get('grove'+Math.floor(x/90),'Leaf','trees'),top=[x+size*.07,y+size*1.8,z-size*.04];g.tube([x,y-1.6,z],top,size*.072,C.bark,far?5:7,size*.022);
 for(let i=0;i<5;i++){const a=i*2.399+R()*.4,b=[x+Math.cos(a)*size*.43,y+size*(.93+.15*i),z+Math.sin(a)*size*.44];g.tube([x,y+size*(.55+.17*i),z],b,size*.034,C.wood,5,size*.009);ell(leaf,b[0],b[1]+size*.10,b[2],size*.46,size*.29,size*.46,G.blend(C.leaf,C.young,.18+R()*.4),far?5:9,far?3:4);}
 ell(leaf,...top,size*.40,size*.28,size*.39,C.young,far?5:9,far?3:4);
 if(!far)for(let i=0;i<4;i++){const a=i*Math.PI/2+.2,X=x+Math.cos(a)*size*.28,Z=z+Math.sin(a)*size*.28;g.tube([x,y+.6,z],[X,t.height(X,Z)-.3,Z],size*.042,C.bark,5,size*.01);}
 return[x,y,z,size];
}
function pathDistance(x,z){let best=Infinity;for(const a of paths)for(const p of a)best=Math.min(best,Math.hypot(x-p[0],z-p[1]));return best;}
function treeSites(){const out=[],R=G.rng(720053);for(let i=0;i<1100&&out.length<54;i++){const x=CX+(R()-.5)*244,z=CZ+(R()-.5)*224,size=6+R()*5;if(houses.some(s=>{const dx=x-s.x,dz=z-s.z,X=Math.cos(s.a)*dx-Math.sin(s.a)*dz,Z=Math.sin(s.a)*dx+Math.cos(s.a)*dz;return Math.abs(X)<s.w/2+13&&Math.abs(Z)<s.d/2+18;})||farms.some(s=>Math.abs(x-s.x)<s.w/2+7&&Math.abs(z-s.z)<s.d/2+7)||pathDistance(x,z)<8||Math.hypot(x-gate.x,z-gate.z)<15)continue;out.push([x,z,size,i+8700]);}return out;}
const sites=treeSites();
function cat(B,x,y,z,col,a,far){const g=B.get('cats','Cat','cats').place(x,y,z,a);ell(g,0,.55,0,.56,.46,.87,col,far?5:9,far?3:4);ell(g,0,.94,.69,.40,.37,.34,col,far?5:8,3);for(const d of[-1,1]){g.tri([d*.10,1.15,.54],[d*.37,1.18,.73],[d*.33,1.57,.59],col);g.tri([d*.33,1.57,.59],[d*.37,1.18,.73],[d*.1,1.15,.84],col);ell(g,d*.27,.19,.50,.22,.16,.3,col,6,3);}for(let i=0;i<9;i++){const p=t=>[Math.sin(t)*.76,.3,-.20-Math.cos(t)*.77];g.tube(p(i*.26),p((i+1)*.26),.13,col,5);}return[x,y,z];}
function build(data,far=false){const B=bank(far),ground={near:G.SurfaceContact.sampler(data,ID),far:G.SurfaceContact.sampler(data,ID,'far')},t=far?ground.far:ground.near,hs=houses.map(s=>house(B,s,ground,far)),trees=sites.map(([x,z,n,s])=>tree(B,x,z,n,s,t,far));farms.forEach(s=>farm(B,s,t,far));
 const gy=Math.max(ground.near.height(gate.x-5,gate.z),ground.near.height(gate.x+5,gate.z),ground.far.height(gate.x-5,gate.z),ground.far.height(gate.x+5,gate.z));
 const g=B.get('gate','Red'),w=B.get('gate','Wood');for(const d of[-1,1]){const x=gate.x+d*5.1,y=Math.min(ground.near.height(x,gate.z),ground.far.height(x,gate.z));B.get('gate','Stone').box(x,y-.7,gate.z,1.45,1.45,1.45,C.stone);g.cone(x,y+.45,gate.z,.45,.33,gy+gate.h-y-.45,C.red,far?6:10);}
 g.box(gate.x,gy+gate.h-2.3,gate.z,13,.66,.63,C.red);w.box(gate.x,gy+gate.h-.25,gate.z,15,.72,.95,C.dark);g.box(gate.x,gy+gate.h-.90,gate.z,14,.60,.88,C.red);
 if(!far){const patch=B.get('village','Grass','undergrowth'),R=G.rng(72800);
  for(const s of hs)for(let j=0;j<10;j++){const x=s.x+(R()-.5)*(s.w+9),z=s.z-s.d/2-2-R()*3,y=t.height(x,z);ell(patch,x,y+.45,z,.8+R(),.55,1.0+R(),G.blend(C.grass,C.leaf,R()*.3),5,3);}
 }
 const cats=[];if(!far){const s=hs[0],b=world(s,-8,s.floor+.05,s.d/2+1.7);cats.push(cat(B,...b,C.cream,-.4,false));const c=world(s,8,s.floor+.05,s.d/2+1.7);cats.push(cat(B,...c,C.ginger,1.0,false));const h=hs[1],q=world(h,4,h.floor+.05,h.d/2+1.8);cats.push(cat(B,...q,C.black,-1.4,false));for(const[x,z,col]of[[-1720,-1130,C.ginger],[-1734,-1182,C.cream],[-1762,-1133,C.black]])cats.push(cat(B,x,t.height(x,z)+.05,z,col,x*.02,false));
  const bowls=B.get('cats','Stone','props');for(const d of[-1,1]){const p=world(s,d*3,s.floor+.08,s.d/2+1.6);bowls.cone(...p,.46,.56,.28,C.mortar,10);} // shallow feeding bowls, not a character marker
 }
 return B.finish({version:'0.29-mayohiga.1',locations:[ID],basis:'P',houses:hs,trees,cats,fields:farms,gate:[gate.x,gy,gate.z],terrainMutation:false,fullVillage:false,yakumoResidence:false,walkCollision:false});
}
function roads(data,pack){const sample=G.ASAMA.sampleRenderedTerrain(pack),bins=new Map(),cross=[-1.30,-1,-.55,0,.55,1,1.30];
 for(const lod of['near','far'])for(let k=0;k<paths.length;k++){const ps=paths[k],width=k===0?1.65:1.9,row=i=>{const p=ps[i],a=ps[Math.max(0,i-1)],b=ps[Math.min(ps.length-1,i+1)],d=G.norm([b[0]-a[0],0,b[1]-a[1]]);return cross.map(u=>{const q=sample(p[0]-d[2]*width*u,p[1]+d[0]*width*u,lod),edge=1-G.smooth(.87,1.3,Math.abs(u)),join=k===0?G.smooth(ps.length-18,ps.length-1,i):0;q.c=G.blend(q.c,G.blend(C.earth,G.rgb('#aa9c7d'),join),edge);q.p[1]+=.13+.15*edge;return q;});};
  let a=row(0);for(let i=0;i<ps.length-1;i++){const b=row(i+1),src=a[3].tile,key=src.id;if(!bins.has(key))bins.set(key,{g:new G.Geometry(),src});const g=bins.get(key).g;for(let j=0;j<cross.length-1;j++)for(const tri of[[a[j],b[j+1],b[j]],[a[j],a[j+1],b[j+1]]])for(const q of tri)g.vertex(q.p,q.n,q.c);a=b;}}
 return [...bins.values()].map(({g,src})=>{const m=g.mesh(ID+':public:'+src.id,'roads',{owner:ID,region:ID,space:'surface',overview:true,globalSurface:true,globalNear:src.globalNear,globalFar:src.globalFar,material:'mayoPath',mayoPart:'route',basis:'P',terrainSource:src.id});return {...m,center:src.center.slice(),radius:Math.max(src.radius+4,m.radius+G.length(G.sub(m.center,src.center)))};});
}
const bounds=[-1870,-1340,-1420,-1030];
G.MAYOHIGA={id:ID,version:'0.29-mayohiga.1',views,houses,farms,gate,paths,sites,bounds,build,roads};
G.extraOverviewBuilders=[...(G.extraOverviewBuilders||[]),(data,pack)=>{G.SurfaceContact.prepare(data,pack,ID,bounds);return[...build(data,true).meshes,...roads(data,pack)];}];
const previous=G.buildRegion;G.buildRegion=async(data,id,legacy)=>{if(id!==ID)return previous(data,id,legacy);const start=performance.now(),p=build(data);p.builtMs=performance.now()-start;return p;};
})(globalThis.GA);
