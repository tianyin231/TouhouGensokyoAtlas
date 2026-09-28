/* Hakugyokurou, PMiSS pp.145–146 / TH07, with selected TH105 snow-garden imagery.
 * Independent presentation coordinates, not a physical floor above Gensokyo.
 * All distances, unseen elevations, garden design and room dimensions are P. */
(function (G) {
'use strict';
const TAU=Math.PI*2,C=Object.fromEntries(Object.entries({
 soil:'#829284',grass:'#778d7b',stone:'#a5a9a4',edge:'#d4cfc3',gravel:'#d3cfc5',
 rock:'#7e898c',moss:'#72877a',wood:'#685044',dark:'#423c3c',beam:'#9c7860',
 wall:'#eee5d6',paper:'#f3e6cb',tile:'#526274',tileEdge:'#81929e',tatami:'#b2b090',
 pink:'#dfbac8',rose:'#d1a8bb',petal:'#efd0d7',lilac:'#dbc2d1',pine:'#647c74',
 trunk:'#6b5351',bud:'#bd839e',rope:'#cbbb96',seal:'#b76866',spirit:'#add9d7'
}).map(([k,v])=>[k,G.rgb(v)]));
const views={
 netherOverview:{label:'冥界 · 樱庭长阶',eye:[590,414,595],target:[25,71,2]},
 netherBoundary:{label:'幽明结界 · 云中门扉',eye:[101,65,705],target:[0,39,560],fov:49},
 netherStairs:{label:'白玉楼 · 樱间长阶',eye:[37,51,409],target:[0,100,157]},
 netherGate:{label:'白玉楼 · 庭前山门',eye:[67,114,176],target:[0,107,83]},
 netherBlossoms:{label:'冥界 · 樱海小径',eye:[-218,109,115],target:[-129,107,-10]},
 hakugyokuCourt:{label:'白玉楼 · 枯山水中庭',eye:[108,149,23],target:[0,100,-66],fov:43},
 hakugyokuHall:{label:'白玉楼 · 拉门望樱',eye:[-2,104,-134],target:[-9,98,-27],fov:62,netherInterior:true},
 hakugyokuVeranda:{label:'白玉楼 · 缘廊与松影',eye:[-51,103,-117],target:[-12,98,-54],fov:60,netherInterior:true},
 hakugyokuRear:{label:'白玉楼 · 背庭与侧屋',eye:[-146,154,-238],target:[-16,106,-107]},
 saigyouSealed:{label:'西行妖 · 封印老樱',eye:[320,169,-8],target:[197,122,-142],fov:49},
 saigyouBuds:{label:'西行妖 · TH07未满开',eye:[320,169,-8],target:[197,122,-142],fov:49,netherBuds:true,era:'TH07春雪异变／将开未满的P事件示意'},
 hakugyokuSnow:{label:'白玉楼 · 冬日雪庭',eye:[108,149,23],target:[0,100,-66],fov:43,netherWinter:true,era:'TH105雪庭结构意象／同一P布局冬景'},
 hakugyokuSection:{label:'白玉楼 · 本殿剖览',eye:[128,159,-60],target:[0,104,-121],netherSection:true}
};
for(const p of Object.values(views))Object.assign(p,{region:'netherworld',space:'netherworld',era:p.era||'异变后春季选景／PMiSS布局描述与P补完'});
Object.assign(G.PRESETS,views);
const locations={youmei:'netherBoundary',netherworld:'netherOverview',hakugyoku_stairs:'netherStairs',hakugyokurou:'hakugyokuCourt',saigyou:'saigyouSealed'};
Object.assign(G.IMPLEMENTED,locations);
const block={id:'netherworld',name:'冥界 · 白玉楼与西行妖',space:'netherworld',center:[0,90,-15],poly:[],bottom:-70,step:16,independent:true};
G.DIORAMA.blocks.push(block);G.DIORAMA.map.set(block.id,block);G.REGION_LABELS[block.id]=block.name;
for(const name of['transform','point','inverse']){const old=G.DIORAMA[name];G.DIORAMA[name]=name==='transform'?((id,...args)=>id==='netherworld'?{scale:1,offset:[0,0,0]}:old(id,...args)):((p,id,...args)=>id==='netherworld'?[...p]:old(p,id,...args));}
function height(x,z){
 const y=16+76*(1-G.smooth(162,533,z));
 const hills=(6*Math.sin(x/139)*Math.cos(z/176)+14*Math.exp(-(((x+510)/215)**2+((z+204)/280)**2))) * G.smooth(120,290,Math.abs(x));
 return y+hills;
}
// Rounded, closed, non-degenerate facets; shared by rocks, flower clusters and pine sprays.
function oval(g,x,y,z,rx,ry,rz,col,n=8,rings=4,soft=false){
 const p=(i,j)=>{const a=i*TAU/n,b=j*Math.PI/rings;return[x+rx*Math.sin(b)*Math.cos(a),y+ry*Math.cos(b),z+rz*Math.sin(b)*Math.sin(a)];};
 const triangle=(a,b,c)=>{if(!soft){g.tri(a,b,c,col);return;}for(const v of[a,b,c])g.vertex(v,G.norm([(v[0]-x)/(rx*rx),(v[1]-y)/(ry*ry),(v[2]-z)/(rz*rz)]),col);};
 for(let j=0;j<rings;j++)for(let i=0;i<n;i++){
  if(!j)triangle(p(i,0),p(i+1,1),p(i,1));
  else if(j===rings-1)triangle(p(i,j),p(i+1,j),p(i,rings));
  else{triangle(p(i,j),p(i+1,j),p(i+1,j+1));triangle(p(i,j),p(i+1,j+1),p(i,j+1));}
 }
}
function buildNetherworld(far=false){
 const banks=new Map(),routes=[],stairSamples=[],floor=98;
 function get(zone,mat='Stone',part='base',group='architecture'){
  const key=[zone,mat,part].join(':');if(!banks.has(key))banks.set(key,{g:new G.Geometry(),zone,mat,part,group});return banks.get(key).g.place();
 }
 function roof(zone,x,z,w,d,y,h=8,angle=0){
  const g=get(zone,'Tile','roof').place(x,0,z,angle),trim=get(zone,'TileEdge','roof').place(x,0,z,angle),under=get(zone,'Wood','roof').place(x,0,z,angle);
  // Thick irimoya-inspired eave, a lower hip and a smaller gabled core.
  const ring=(W,D,Y)=>[[-W,Y,-D],[W,Y,-D],[W,Y,D],[-W,Y,D]],lo=ring(w/2,d/2,y),hi=ring(w*.34,d*.24,y+h*.48);
  for(let i=0;i<4;i++)g.quad(lo[i],hi[i],hi[(i+1)%4],lo[(i+1)%4],C.tile);
  g.quad(hi[0],[-w*.34,y+h,0],[w*.34,y+h,0],hi[1],C.tile);
  g.quad(hi[2],[w*.34,y+h,0],[-w*.34,y+h,0],hi[3],C.tile);
  const infill=get(zone,'Wall','roof').place(x,0,z,angle);
  infill.tri(hi[0],hi[3],[-w*.34,y+h,0],C.wall);infill.tri(hi[2],hi[1],[w*.34,y+h,0],C.wall);
  for(const [xx,zz,ww,dd]of [[0,-d/2,w,.65],[0,d/2,w,.65],[-w/2,0,.65,d],[w/2,0,.65,d]])trim.box(xx,y-.7,zz,ww,.90,dd,C.tileEdge);
  under.box(0,y-.78,0,w*.90,.35,d*.88,C.wood);
  trim.box(0,y+h-.10,0,w*.70,.9,1.1,C.tileEdge);
  if(!far){
   for(let xx=-w*.33;xx<=w*.33;xx+=1.65)for(const side of[-1,1]){
    trim.tube([xx,y+.12,side*d/2],[xx,y+h*.48+.12,side*d*.24],.085,C.tileEdge,4);
    trim.tube([xx,y+h*.48+.12,side*d*.24],[xx,y+h+.12,0],.085,C.tileEdge,4);
   }
   for(let xx=-w*.43;xx<=w*.43;xx+=2.1)for(const side of[-1,1])under.box(xx,y-1.1,side*(d*.40),.35,.45,d*.17,C.beam);
   for(const side of[-1,1])trim.tube([side*w*.34,y+h+.15,0],[side*(w*.34+1.4),y+h+1.3,0],.25,C.tileEdge,6);
  }
 }
 function house(zone,x,z,w,d,base,h=14,angle=0,open=false){
  const stone=get(zone).place(x,0,z,angle),wood=get(zone,'Wood').place(x,0,z,angle),wall=get(zone,'Wall','shell').place(x,0,z,angle),paper=get(zone,'Paper','shell').place(x,0,z,angle);
  stone.box(0,base-2,0,w+4,2,d+4,C.stone);
  wood.box(0,base+2,0,w+7,.75,d+7,C.wood);
  for(const side of[-1,1])for(let xx=-w/2;xx<=w/2;xx+=9){stone.box(xx,base,side*d/2,1.6,.6,1.6,C.edge);wood.box(xx,base+.5,side*d/2,1,2,1,C.dark);}
  const y=base+2.75,top=y+h;
  if(far)wall.box(0,y,0,w,h,d,C.wall);
  else{
   for(let xx=-w/2;xx<=w/2+.01;xx+=w/Math.round(w/9))for(const side of[-1,1]){wood.box(xx,y,side*d/2,1,h,1,C.wood);wood.box(xx,top-1,side*(d/2+1),2.8,.8,3.6,C.beam);}
   // Sliding doors: the main garden-facing middle bays are open, not transparent walls.
   const bays=Math.round(w/9);
   for(let i=0;i<bays;i++)for(const side of[-1,1]){
    const xx=-w/2+(i+.5)*w/bays,zz=side*d/2,ww=w/bays-.9;
    wood.box(xx,top-2.5,zz,ww,2.5,.75,C.wood);
    if(open&&side===1&&Math.abs(xx)<w*.27)continue;
    wood.box(xx,y,zz,ww,3,.65,C.wood);
    paper.box(xx,y+3.1,zz-side*.22,ww,h-5.7,.20,C.paper);
    for(let k=0;k<=4;k++)wood.box(xx-ww/2+k*ww/4,y+3,zz+side*.12,.22,h-5.5,.3,C.beam);
    for(let yy=4.8;yy<h-2.5;yy+=2.3)wood.box(xx,y+yy,zz+side*.12,ww,.20,.32,C.beam);
   }
   for(const side of[-1,1]){wall.box(side*w/2,y,0,.9,h,d,C.wall);wood.box(0,top-.6,side*d/2,w+3,.9,1.6,C.dark);}
   wood.box(0,top-.8,0,w,.5,d,C.dark);
  }
  roof(zone,x,z,w+13,d+14,top+1,Math.min(10,w*.13),angle);
  return y;
 }
 function path(points,width,zone='paths'){
  routes.push({points,width,basis:'P'});const g=get(zone,'Paving');
  for(let i=0;i<points.length-1;i++){
   let [x,z]=points[i],[xx,zz]=points[i+1],dx=xx-x,dz=zz-z,L=Math.hypot(dx,dz),nx=-dz/L*width/2,nz=dx/L*width/2,N=Math.ceil(L/5);
   for(let j=0;j<N;j++){let t=j/N,u=(j+1)/N,a=[G.mix(x,xx,t),G.mix(z,zz,t)],b=[G.mix(x,xx,u),G.mix(z,zz,u)];g.quad([a[0]-nx,height(a[0]-nx,a[1]-nz)+.65,a[1]-nz],[b[0]-nx,height(b[0]-nx,b[1]-nz)+.65,b[1]-nz],[b[0]+nx,height(b[0]+nx,b[1]+nz)+.65,b[1]+nz],[a[0]+nx,height(a[0]+nx,a[1]+nz)+.65,a[1]+nz],C.stone);}
  }
 }
 function light(x,z){const y=height(x,z)+.4,g=get('lanterns'),p=get('lanterns','Lamp');
  g.box(x,y,z,2.7,.7,2.7,C.stone);g.box(x,y+.7,z,.9,3.3,.9,C.stone);g.box(x,y+3.8,z,2.7,.5,2.7,C.edge);
  for(const dx of[-1,1])for(const dz of[-1,1])g.box(x+dx,y+4.1,z+dz,.34,1.8,.34,C.stone);
  p.box(x,y+4.3,z,1.5,1.3,1.5,C.paper);g.cone(x,y+6,z,2.3,.55,1.1,C.stone,4);g.cone(x,y+7.1,z,.45,.1,.85,C.stone,6);
 }
 // The old cherry has an asymmetric, continuous trunk and curved tapering leaders.
 // Ring normals are smooth; fine branches are real geometry, never a flat tree card.
 function oldCherry(x,z,size){
  const y=height(x,z),g=get('saigyou','Bark','sealed','vegetation'),buds=get('saigyou','Blossom','buds','vegetation');
  const transform=p=>[x+p[0]*size,y+p[1]*size,z+p[2]*size];
  function limb(points,r0,r1,n=8){
   const centers=[];for(let k=0;k<points.length-1;k++){
    const a=points[Math.max(0,k-1)],b=points[k],c=points[k+1],d=points[Math.min(points.length-1,k+2)],N=far?1:3;
    for(let j=0;j<N;j++){const t=j/N,t2=t*t,t3=t2*t;centers.push(transform([0,1,2].map(i=>.5*(2*b[i]+(-a[i]+c[i])*t+(2*a[i]-5*b[i]+4*c[i]-d[i])*t2+(-a[i]+3*b[i]-3*c[i]+d[i])*t3))));}
   }centers.push(transform(points.at(-1)));const rings=[];
   for(let i=0;i<centers.length;i++){
    const tangent=G.norm(G.sub(centers[Math.min(i+1,centers.length-1)],centers[Math.max(0,i-1)])),right=G.norm(G.cross(tangent,Math.abs(tangent[1])>.9?[0,0,1]:[0,1,0])),up=G.cross(tangent,right),t=i/(centers.length-1),radius=(r1+(r0-r1)*Math.pow(1-t,1.12))*size;
    const ring=[];for(let j=0;j<n;j++){const a=j*TAU/n,radial=G.add(G.mul(right,Math.cos(a)),G.mul(up,Math.sin(a)));ring.push({p:G.add(centers[i],G.mul(radial,radius)),normal:radial});}rings.push(ring);
   }
   const tri=(a,b,c)=>{for(const v of[a,b,c])g.vertex(v.p,v.normal,C.trunk);};
   for(let i=0;i<rings.length-1;i++)for(let j=0;j<n;j++){const a=rings[i][j],b=rings[i][(j+1)%n],c=rings[i+1][(j+1)%n],d=rings[i+1][j];tri(a,b,c);tri(a,c,d);}
   for(let j=0;j<n;j++)g.tri(centers.at(-1),rings.at(-1)[(j+1)%n].p,rings.at(-1)[j].p,C.trunk);
  }
  limb([[0,0,0],[1.8,8,-.5],[-.8,16,1],[2.5,25,-1],[0,35,-2]],4.2,.45,far?7:12);
  const leaders=[
   {p:[[-1,14,0],[-7,21,-.5],[-17,27,-6],[-25,37,-8],[-29,42,-5]],r:2.65},
   {p:[[1,18,0],[9,22,1],[17,24,8],[24,32,12],[35,35,12]],r:2.5},
   {p:[[0,17,0],[0,22,-8],[-3,29,-15],[3,35,-20],[5,42,-25]],r:2.1},
   {p:[[0,12,1],[-3,15,8],[-10,19,15],[-14,27,19],[-17,32,21]],r:1.65},
   {p:[[1,25,-1],[5,32,0],[6,39,-6],[14,45,-10],[17,48,-8]],r:1.3}
  ];
  for(let i=0;i<leaders.length;i++){
   const {p,r}=leaders[i];limb(p,r,.065,far?5:9);
   for(let j=1;j<4;j++){
    const base=p[j],sign=(i+j)%2?-1:1,v=G.norm(G.sub(p[j+1],p[j])),L=5+(i+j)%4*1.6;
    const e=[base[0]+v[0]*L-sign*v[2]*L*.75,base[1]+4+(j%2)*2,base[2]+v[2]*L+sign*v[0]*L*.75],tip=[e[0]+v[0]*4,e[1]+4,e[2]+v[2]*4];
    limb([base,e,tip],r*.27,.025,far?4:6);
    if(!far)for(let k=0;k<3;k++){
     const a=G.add(e,G.mul(G.sub(tip,e),k*.30)),b=[a[0]+sign*(2.5+k*.8),a[1]+3.7,a[2]+(k-1)*2.4],c=[b[0]+sign*2,b[1]+2,b[2]+(i%2?1.5:-1.5)];
     limb([a,b,c],.11,.012,5);const q=transform(c);oval(buds,...q,.48*size,.38*size,.41*size,C.bud,6,3,true);
    }
   }
  }
  for(let i=0;i<8;i++){const a=i*TAU/8,L=7+i%3*2.2;limb([[0,4,0],[Math.cos(a)*4,1.6,Math.sin(a)*4],[Math.cos(a)*L,.15,Math.sin(a)*L]],1.1,.10,far?4:7);}
  const rope=get('saigyou','Rope','sealed'),n=far?12:40;
  for(let i=0;i<n;i++){const a=i*TAU/n,b=(i+1)*TAU/n;rope.tube([x+Math.cos(a)*5.1,y+6+.6*Math.sin(a),z+Math.sin(a)*5.1],[x+Math.cos(b)*5.1,y+6+.6*Math.sin(b),z+Math.sin(b)*5.1],.25,C.rope,5);}
  const paper=get('saigyou','Paper','sealed');for(let i=0;i<9;i++){
   const a=i*TAU/9,xx=x+Math.cos(a)*5.4,zz=z+Math.sin(a)*5.4;
   for(let k=0;k<3;k++){const shift=k%2*.45;paper.box(xx+shift,y+5.2-k*.78,zz,.82,.70,.15,C.paper);}
  }
 }
 function tree(x,z,size,seed,saigyou=false){
  if(saigyou){oldCherry(x,z,size);return;}
  const R=G.rng(seed),y=height(x,z),zone='grove'+Math.floor((x+600)/210),wood=get(zone,'Bark','plants','vegetation');
  const trunkH=9*size,r=.78*size;
  const a=[x,y,z],b=[x+size*1.2,y+trunkH*.57,z-size],c=[x-size*.9,y+trunkH,z+size];
  if(far){wood.tube(a,c,r,C.trunk,4,r*.18);oval(get(zone,'Blossom','flowers','vegetation'),x,y+trunkH+4*size,z,9.4*size,4.8*size,8.5*size,[C.pink,C.petal,C.lilac,C.rose][seed%4],6,3);return;}
  wood.tube(a,b,r,C.trunk,far?7:10,r*.76);wood.tube(b,c,r*.76,C.trunk,far?7:10,r*.42);
  if(!far)for(let i=0;i<5;i++){const t=i*TAU/5;wood.tube([x+Math.cos(t)*r*2.9,y+.1,z+Math.sin(t)*r*2.9],[x,y+r,z],r*.24,C.trunk,6,r*.6);}
  const branches=4;
  for(let i=0;i<branches;i++){
   const t=i*TAU/branches+R()*.40,L=6*(0.8+R()*.45)*size;
   const start=[G.mix(b[0],c[0],i/branches),y+trunkH*(.55+i/branches*.42),G.mix(b[2],c[2],i/branches)],elbow=[x+Math.cos(t)*L*.55,start[1]+size*3,z+Math.sin(t)*L*.55],end=[x+Math.cos(t)*L,start[1]+size*4,z+Math.sin(t)*L];
   wood.tube(start,elbow,r*.34,C.trunk,far?5:7,r*.19);wood.tube(elbow,end,r*.19,C.trunk,far?5:6,r*.06);
   const count=far?1:2;
   for(let j=0;j<count;j++){
    const ang=t+(j-1)*.62,tip=[end[0]+Math.cos(ang)*size*3.2,end[1]+size*(1.6+j*1.1),end[2]+Math.sin(ang)*size*3.2];
    if(!far)wood.tube(end,tip,r*.065,C.trunk,5,r*.018);
    const col=[C.pink,C.petal,C.lilac,C.rose][seed%4];oval(get(zone,'Blossom','flowers','vegetation'),tip[0],tip[1],tip[2],5.4*size,3.7*size,4.9*size,col,10,5,true);
   }
  }

 }
 // One broad, uncut terrain sheet. Edge fades in the independent atmosphere, never a floating display base.
 const terrain=get('land','Soil','base','terrain'),step=far?80:24;
 for(let z=-820;z<920;z+=step)for(let x=-920;x<920;x+=step){const a=[x,height(x,z),z],b=[x,height(x,z+step),z+step],c=[x+step,height(x+step,z+step),z+step],d=[x+step,height(x+step,z),z];terrain.quad(a,b,c,d,G.blend(C.soil,C.grass,.30+.12*Math.sin(x/170)*Math.cos(z/200)));}
 const horizon=get('horizon','Soil','base','terrain');
 // Continue the entire terrain outside the modeling patch. No straight shelf / cut edge.
 const xEnd=-920+Math.ceil(1840/step)*step,zEnd=-820+Math.ceil(1740/step)*step;
 function extend(a,b){const farA=[a[0]*8,a[1]*8],farB=[b[0]*8,b[1]*8];horizon.quad([a[0],height(...a),a[1]],[b[0],height(...b),b[1]],[farB[0],height(...farB),farB[1]],[farA[0],height(...farA),farA[1]],C.soil);}
 for(let x=-920;x<xEnd;x+=step){extend([x,-820],[x+step,-820]);extend([x+step,zEnd],[x,zEnd]);}
 for(let z=-820;z<zEnd;z+=step){extend([-920,z+step],[-920,z]);extend([xEnd,z],[xEnd,z+step]);}
 // Stair structure follows the same analytic slope. Solid treads; samples are not extra rest platforms.
 const stair=get('stairs','Paving'),stairsBottom=536,stairsTop=170,N=far?24:122,d=(stairsBottom-stairsTop)/N;
 for(let i=0;i<N;i++){const z=stairsBottom-(i+.5)*d,front=stairsBottom-i*d,back=front-d,y=height(0,back)+.65,base=height(0,front)-1;stair.box(0,base,z,22,Math.max(.8,y-base),d+.04,C.stone);if(i%20===0)stairSamples.push({position:[0,y,z],width:22,type:'stair-sample'});
  for(const s of[-1,1])stair.box(s*12.1,base,z,1.7,Math.max(.8,y-base)+1.1,d+.1,C.edge);
 }
 path([[0,668],[0,536]],22);path([[0,170],[0,112],[0,70],[0,9]],20);
 path([[0,66],[92,62],[143,32],[195,-52],[195,-113]],6);
 path([[-18,84],[-106,60],[-155,-12],[-154,-178],[103,-180],[165,-143]],5);
 path([[-91,47],[-245,93],[-310,198]],5);
 // The cloud-side boundary: four posts, open leaves and a quiet eight-point boundary motif.
 const gate=get('boundary','Wood'),base=16;
 for(const x of[-29,-17,17,29]){get('boundary').box(x,base,562,5,2,6,C.stone);gate.box(x,base+2,562,2.5,27,2.5,C.wood);}
 gate.box(0,base+27,562,65,3,4,C.beam);gate.box(0,base+29.5,562,70,1.4,5,C.dark);
 for(const s of[-1,1]){const leaf=get('boundary','Wood').place(s*17,base+2,560,s*.80);leaf.box(-s*6.2,0,0,12.4,23,1.1,C.dark);for(let j=0;j<6;j++)leaf.box(-s*(1.2+j*2.0),.6,.65,.24,21.8,.28,C.beam);}
 const boundary=get('boundary','Boundary','boundary','effects');
 for(let i=0;i<8;i++){let a=i*TAU/8,b=(i+3)*TAU/8;boundary.tube([Math.cos(a)*42,48+Math.sin(a)*42,554],[Math.cos(b)*42,48+Math.sin(b)*42,554],.13,C.spirit,4);}
 // Low cloud wisps around the boundary only. UV-like vertex colors are shader parameters.
 if(!far){const mist=get('boundaryMist','Mist','mist','effects');for(let i=0;i<9;i++){
  const x=(i%2?-1:1)*(25+i*9),y=19+(i%3)*7,z=546+(i%4)*13,w=65+(i%3)*11,h=13+i%2*7;
  const pts=[[x-w,y-h,z],[x+w,y-h,z],[x+w,y+h,z],[x-w,y+h,z]],uv=[[0,0,i/9],[1,0,i/9],[1,1,i/9],[0,1,i/9]];
  for(const tri of[[0,1,2],[0,2,3]])for(const k of tri)mist.vertex(pts[k],[0,0,1],uv[k]);
 }}
 // Terrace and stairs genuinely support the gate and U-shaped main residence.
 const terrace=get('estateBase');terrace.box(0,89,-69,176,6,182,C.stone);terrace.box(0,95,-69,171,.65,178,C.edge);
 for(let i=0;i<6;i++)get('estateBase','Paving').box(0,92,22-i*2.2,24,(i+1)*.6,2.25,C.edge);
 for(const x of[-23,23]){get('gardenGate').box(x,92,94,3.5,2,3.5,C.stone);get('gardenGate','Wood').box(x,94,94,1.8,17,1.8,C.wood);}
 roof('gardenGate',0,94,55,15,112,7);get('gardenGate','Wood').box(0,109.7,94,49,2,2,C.beam);
 // コ plan: north main hall, two wings, low south wall. No pagoda pretending to be a mansion.
 const hallY=house('hall',0,-128,112,30,95,14,0,true);
 house('westWing',-73,-71,136,20,95,12,Math.PI/2);
 house('eastWing',73,-71,136,20,95,12,-Math.PI/2);
 house('service',-102,-171,27,20,92,10);
 const low=get('gardenWall','Wall');for(const x of[-43,43]){low.box(x,96,7,61,3.1,1.9,C.wall);get('gardenWall','Tile').box(x,99.1,7,62,.6,3.0,C.tile);}
 const garden=get('dryGarden','Gravel');garden.box(0,95.7,-48,116,.40,101,C.gravel);
 const groups=[[-32,-70,1.2],[24,-82,1],[-9,-38,.8],[40,-31,.9],[-41,-13,.75]];
 for(const [x,z,s]of groups){oval(get('dryGarden','Moss'),x,96.2,z,7.5*s,.6,5*s,C.moss,12,3);for(let i=0;i<3;i++)oval(get('dryGarden','Rock'),x+(i-1)*3.1*s,96.4,z+i*1.9*s,(2.4+i*.3)*s,(2.6-i*.6)*s,2.3*s,C.rock,far?6:8,far?3:4);}
 const pine=get('dryGarden','Bark'),fol=get('dryGarden','Pine','plants','vegetation');
 pine.tube([-37,96,-56],[-32,105,-55],1,C.trunk,8,.5);pine.tube([-32,105,-55],[-34,112,-54],.5,C.trunk,7,.15);
 for(let i=0;i<6;i++){let a=i*2.4,yy=102+i*1.65,xx=-33+Math.cos(a)*(8-i*.7),zz=-55+Math.sin(a)*6;pine.tube([-33,yy,-55],[xx,yy+1,zz],.25,C.trunk,6,.1);oval(fol,xx,yy+1.2,zz,4.9,1.8,3.2,C.pine,8,4);}
 if(!far){
  // Shared wood floor through the U-plan, but only one authored hall interior.
  const floorG=get('hall','Tatami','interior'),trim=get('hall','Wood','interior');
  for(let i=0;i<15;i++)for(let j=0;j<4;j++){let x=-51+i*7.25,z=-139+j*7.2;floorG.box(x,hallY+.03,z,6.9,.13,6.8,C.tatami);trim.box(x-3.45,hallY+.10,z,.20,.04,6.8,C.moss);}
  for(let x=-51;x<=51;x+=8.5)trim.box(x,hallY+12.4,-128,.45,.6,30,C.beam);
  const table=get('hall','Wood','interior');table.box(28,hallY+.2,-128,10,2.2,6,C.wood);table.box(28,hallY+2.4,-128,11,.45,7,C.beam);
  for(const [x,z]of [[26,-128],[30,-128]]){oval(get('hall','Paper','interior'),x,hallY+3.2,z,.65,.45,.65,C.paper,8,4);}
  for(let x of[23,32])get('hall','Cloth','interior').box(x,hallY+.2,-120,5.5,.7,4.5,C.rose);
  // Side rake and sweeping tools remain inside service storage, never scene-wide text labels.
  const tools=get('service','Wood','props');tools.tube([-102,93,-170],[-100,100,-170],.13,C.beam,6);tools.box(-102,93,-170,3,.4,.7,C.wood);
  for(let x=-104;x<-100;x+=.45)tools.box(x,92.5,-169.8,.10,1,.15,C.beam);
 }
 // Sparse, deliberately placed near trees and a broader distant grove. Reserve every path / terrace.
 const R=G.rng(210928),sites=[];
 for(let row=0;row<15;row++)for(let col=0;col<20;col++){
  const x=-640+col*65+(R()-.5)*53,z=-495+row*69+(R()-.5)*56;
  if(Math.abs(x)<43&&z>140||Math.abs(x)<123&&z>-205&&z<123||Math.hypot(x-197,z+142)<65)continue;
  if(routes.some(rt=>rt.points.slice(0,-1).some((a,i)=>{const b=rt.points[i+1],dx=b[0]-a[0],dz=b[1]-a[1],t=G.clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz),0,1);return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz)<rt.width/2+12;})))continue;
  sites.push({x,z,size:.92+R()*.64,seed:21000+row*20+col});
 }
 // Irregular foreground groups form a cherry curtain behind the low courtyard wall.
 for(const [i,p]of [[-69,35,1.42],[-38,48,1.36],[37,45,1.57],[67,36,1.50],[-121,-123,1.40],[-133,-82,1.31],[129,-97,1.34],[114,74,1.18]].entries())sites.push({x:p[0],z:p[1],size:p[2],seed:21900+i});
 for(const p of sites)tree(p.x,p.z,p.size,p.seed);
 // Signature leafless giant: buds are a separate, normally hidden historical presentation.
 tree(197,-142,1.36,210707,true);
 for(let i=0;i<24;i++){const a=i*TAU/24,xx=197+Math.cos(a)*28,zz=-142+Math.sin(a)*28;get('saigyou','Wood','sealed').box(xx,height(xx,zz)+.35,zz,.8,3.1,.8,C.wood);}
 for(let i=0;i<24;i++){const a=i*TAU/24,b=(i+1)*TAU/24;if(i>=5&&i<=7)continue;const p=[197+Math.cos(a)*28,-142+Math.sin(a)*28],q=[197+Math.cos(b)*28,-142+Math.sin(b)*28];get('saigyou','Rope','sealed').tube([p[0],height(...p)+2.5,p[1]],[q[0],height(...q)+2.5,q[1]],.18,C.rope,5);}
 if(!far){
  for(let z=203;z<523;z+=54)for(const x of[-19,19])light(x,z);
  for(const p of[[-31,87],[31,87],[-49,29],[49,29],[171,-87],[218,-93],[-116,-146]])light(...p);
  const spirits=get('spirits','Spirit','spirits','effects');
  for(let i=0;i<18;i++){const x=(i%2?-1:1)*(48+(i%5)*37),z=391-i*36,y=height(x,z)+9+(i%3)*4;oval(spirits,x,y,z,1.8,3.2,1.7,C.spirit,8,5);spirits.tri([x-1,y+2,z],[x+.4,y+6,z-.4],[x+1,y+2,z],C.spirit);}
  const petals=get('petals','Petal','petals','effects');
  for(let i=0;i<340;i++){let x=-340+R()*710,z=-326+R()*845;if(Math.hypot(x-197,z+142)<45)continue;let y=height(x,z)+2+R()*28,s=.16+R()*.24;petals.quad([x-s,y,z],[x,y+s*.22,z-s],[x+s,y,z],[x,y-s*.2,z+s],C.petal);}
 }
 const meshes=[];for(const[key,b]of banks)if(b.g.a.length)meshes.push(b.g.mesh(`netherworld:${far?'overview':'detail'}:${key}`,b.group,{owner:'netherworld',region:'netherworld',space:'netherworld',basis:'P',overview:far,material:'nether'+b.mat,netherZone:b.zone,netherPart:b.part,shadowCaster:!['land','horizon','boundaryMist','spirits','petals'].includes(b.zone)}));
 return{id:'netherworld',meshes,signs:[],bytes:meshes.reduce((s,m)=>s+m.vertices.byteLength,0),meta:{module:'netherworld',version:'0.21.0',locations:Object.keys(locations),surfaceCut:false,overview:far,courtyardPlan:'コ／P',treeCount:sites.length+1,saigyouDefault:'sealed',routes,stairSamples}};
}
G.NETHERWORLD={version:'0.21.0',views,locations,space:'netherworld',height,fullRealm:false};
G.buildNetherworld=buildNetherworld;G.buildNetherworldOverview=()=>buildNetherworld(true);
const previous=G.buildRegion;G.buildRegion=async function(data,id,legacy){if(id!=='netherworld')return previous(data,id,legacy);const start=performance.now(),p=buildNetherworld();p.builtMs=performance.now()-start;return p;};
})(globalThis.GA);
