/* Makai editions. Official existence / relative relations are sourced in data/makai.json.
 * These are separate presentation charts, NOT a claim of three unrelated canonical worlds.
 * Every coordinate, rear elevation, room and traversable-looking route is P reconstruction. */
(function(G){
'use strict';
const TAU=Math.PI*2,C=Object.fromEntries(Object.entries({
 rock:'#443345',edge:'#8c748f',soil:'#342938',stone:'#796576',pale:'#c7b6c7',
 wall:'#9d8b9d',dark:'#241e31',wood:'#4c3542',tile:'#46435e',metal:'#76718e',
 gold:'#c5a181',warm:'#ffbc8e',red:'#8c354a',glass:'#97b8d3',ice:'#91bed2',
 snow:'#cdd9e6',blue:'#677eaa',black:'#171322',violet:'#7b4f8f',pink:'#cc729d',
 ochre:'#a68a85',white:'#e4dce4'
}).map(([k,v])=>[k,G.rgb(v)]));
const views={
 makaiSeal:{label:'星莲船 · 红黑色封印',region:'makai12',eye:[330,227,420],target:[0,100,-80],era:'TH12第五面／法界上空',makaiSeal:true},
 makaiSealClose:{label:'法界上空 · 封印格网',region:'makai12',eye:[-120,165,75],target:[24,130,-130],era:'TH12第五面／封印仍在',makaiSeal:true},
 hokkai:{label:'法界 · 虹光与黑土',region:'makai12',eye:[115,73,230],target:[0,34,-140],era:'TH12第六面／解除封印后'},
 hokkaiHorizon:{label:'法界 · 远都轮廓',region:'makai12',eye:[250,55,-150],target:[0,83,-740],era:'TH12第六面／远景意象'},
 makai05Overview:{label:'怪绮谈 · 魔界纪行',region:'makai05',eye:[970,665,1040],target:[0,47,-240],era:'TH05关卡选集／P展示连接'},
 makaiGate:{label:'魔界之门 · 旧作洞口',region:'makai05',eye:[82,62,816],target:[0,58,541],era:'TH05第一面／入口选集'},
 makaiSpace:{label:'魔空间 · 边界深道',region:'makai05',eye:[-12,34,492],target:[20,43,335],era:'TH05第二面／P空间重构'},
 makaiStreet:{label:'魔界街道 · 斜铺长街',region:'makai05',eye:[147,48,207],target:[-15,28,50],era:'TH05第三面／城市选集'},
 makaiShops:{label:'魔界街道 · 店前廊',region:'makai05',eye:[-139,32,130],target:[-77,27,72],era:'TH05城市／商铺陈设P'},
 makaiIce:{label:'冰雪世界 · 晶柱回廊',region:'makai05',eye:[345,115,-112],target:[89,40,-280],era:'TH05第四面／冰封区域'},
 pandemonium:{label:'万魔殿 · 紫晶殿庭',region:'makai05',eye:[367,240,-243],target:[0,139,-610],era:'TH05第五至六面／外观P'},
 pandemoniumRear:{label:'万魔殿 · 后庭与承台',region:'makai05',eye:[-269,110,-839],target:[0,102,-606],era:'TH05万魔殿／未见背面P'},
 pandemoniumHall:{label:'万魔殿 · 星纹大堂',region:'makai05',eye:[7,75,-554],target:[-5,89,-662],era:'TH05万魔殿／室内P',makaiInterior:true},
 pandemoniumGallery:{label:'万魔殿 · 侧廊彩窗',region:'makai05',eye:[68,89,-573],target:[66,90,-659],era:'TH05万魔殿／室内P',makaiInterior:true},
 pandemoniumSection:{label:'万魔殿 · 可逆剖览',region:'makai05',eye:[224,192,-382],target:[0,89,-619],era:'TH05万魔殿／P室内剖览',makaiSection:true},
 vinaRuins:{label:'灵异传 · 维纳的废墟',region:'makai01',eye:[265,134,291],target:[-17,31,52],era:'TH01魔界路线／关卡选集'},
 vinaCourtyard:{label:'维纳 · 断柱与残垣',region:'makai01',eye:[-104,49,171],target:[-14,28,35],era:'TH01魔界路线／P遗迹重构'},
 fallenTemple:{label:'堕落神殿 · 幽紫圣堂',region:'makai01',eye:[181,116,-155],target:[0,68,-362],era:'TH01魔界路线／神殿选集'},
 fallenSanctuary:{label:'堕落神殿 · 寂静内殿',region:'makai01',eye:[4,32,-335],target:[0,52,-432],era:'TH01神殿／P室内重构',makaiInterior:true}
};
const regions=['makai12','makai05','makai01'];
for(const p of Object.values(views)){p.space=p.region;p.fov ||= 48;}
Object.assign(G.PRESETS,views);
for(const [id,name,center]of[
 ['makai12','魔界 · 星莲船与法界',[0,65,-120]],['makai05','魔界 · 怪绮谈选集',[0,35,-180]],['makai01','魔界 · 灵异传选集',[0,30,-90]]
]){const b={id,name,center,space:id,poly:[],bottom:-100,step:20,independent:true};G.DIORAMA.blocks.push(b);G.DIORAMA.map.set(id,b);G.REGION_LABELS[id]=name;}
const locations={makai:'makaiSeal',hokkai:'hokkai',pc98_makai:'makai05Overview',pc98_gate:'makaiGate',pc98_maspace:'makaiSpace',pc98_street:'makaiStreet',pc98_ice:'makaiIce',pc98_panda:'pandemonium',pc98_vina:'vinaRuins',pc98_fallen:'fallenTemple'};
Object.assign(G.IMPLEMENTED,locations);
for(const key of ['transform','point','inverse']){const old=G.DIORAMA[key];G.DIORAMA[key]=key==='transform'?(id,...args)=>regions.includes(id)?{scale:1,offset:[0,0,0]}:old(id,...args):(p,id,...args)=>regions.includes(id)?p.slice():old(p,id,...args);}
G.MAKAI={version:'0.20.0',regions,spaces:regions,views,locations,exhibitionOnly:true};

function bank(owner,far){const items=new Map();
 const get=(zone,material='makaiStone',part='base',group='architecture')=>{
  const key=[zone,material,part].join(':');if(!items.has(key))items.set(key,{g:new G.Geometry(),zone,material,part,group});return items.get(key).g.place();
 };
 return{get,finish(meta={}){const meshes=[];for(const[key,o]of items)if(o.g.a.length)meshes.push(o.g.mesh(`${owner}:${far?'overview':'detail'}:${key}`,o.group,{owner,region:owner,space:owner,overview:far,basis:'P',material:o.material,makaiZone:o.zone,makaiPart:o.part,shadowCaster:!['horizon','land','blackland','ruinland'].includes(o.zone)}));return{id:owner,meshes,signs:[],bytes:meshes.reduce((s,m)=>s+m.vertices.byteLength,0),meta:{version:'0.20.0',module:'makai',surfaceCut:false,overview:far,coordinates:'independent P exhibit',...meta}};}};
}
function orb(g,x,y,z,rx,ry,rz,col,n=10,r=5){const p=(i,j)=>{const a=i*TAU/n,b=j*Math.PI/r;return[x+rx*Math.sin(b)*Math.cos(a),y+ry*Math.cos(b),z+rz*Math.sin(b)*Math.sin(a)];};for(let j=0;j<r;j++)for(let i=0;i<n;i++){if(!j)g.tri(p(i,0),p(i+1,1),p(i,1),col);else if(j===r-1)g.tri(p(i,j),p(i+1,j),p(i,r),col);else g.quad(p(i,j),p(i+1,j),p(i+1,j+1),p(i,j+1),col);}}
function ring(g,x,y,z,r,t,col,n=36,vertical=false){for(let i=0;i<n;i++){const a=i*TAU/n,b=(i+1)*TAU/n;g.tube(vertical?[x+r*Math.cos(a),y+r*Math.sin(a),z]:[x+r*Math.cos(a),y,z+r*Math.sin(a)],vertical?[x+r*Math.cos(b),y+r*Math.sin(b),z]:[x+r*Math.cos(b),y,z+r*Math.sin(b)],t,col,5);}}
function prism(g,x,y,z,r,h,col,n=6,tip=.15){const top=y+h;g.cone(x,y,z,r,r*.83,h*.73,col,n);g.cone(x,y+h*.73,z,r*.83,tip,h*.27,col,n);}
function arch(B,zone,x,y,z,w,h,depth,far,part='base',color=C.pale){
 const stone=B.get(zone,'makaiStone',part),trim=B.get(zone,'makaiMetal',part);const t=Math.max(1.1,w*.08),r=w/2,rise=Math.min(r,h*.65),stem=h-rise;
 stone.box(x-r-t/2,y,z,t,stem,depth,color);stone.box(x+r+t/2,y,z,t,stem,depth,color);
 const N=far?6:16;for(let i=0;i<N;i++){const a=i*Math.PI/N,b=(i+1)*Math.PI/N,pt=(ang,rad,zz)=>[x+Math.cos(ang)*rad,y+stem+Math.sin(ang)*rad/r*rise,zz];
  const f=z+depth/2,k=z-depth/2;stone.quad(pt(a,r,f),pt(a,r+t,f),pt(b,r+t,f),pt(b,r,f),color);stone.quad(pt(b,r,k),pt(b,r+t,k),pt(a,r+t,k),pt(a,r,k),color);stone.quad(pt(a,r,f),pt(b,r,f),pt(b,r,k),pt(a,r,k),color);stone.quad(pt(b,r+t,f),pt(a,r+t,f),pt(a,r+t,k),pt(b,r+t,k),color);
  if(!far)trim.tube(pt(a,r+t*.55,f+.06),pt(b,r+t*.55,f+.06),.14,C.gold,5);
 }
}
function staircase(B,zone,x,z,w,bottom,rise,count,depth=2.2){const g=B.get(zone);for(let i=0;i<count;i++)g.box(x,bottom,z-i*depth,w,(i+1)*rise,depth+.02,C.stone);}
function rail(B,zone,a,b,y,far=false){const g=B.get(zone,'makaiMetal'),n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/5);for(let i=0;i<=n;i++){let t=i/n,x=G.mix(a[0],b[0],t),z=G.mix(a[1],b[1],t);g.box(x,y,z,.55,3.5,.55,C.metal);if(!far)g.cone(x,y+3.5,z,.55,.06,.7,C.gold,5);}for(const h of[1,3.1])g.tube([a[0],y+h,a[1]],[b[0],y+h,b[1]],.23,C.metal,5);}
function gable(B,zone,x,y,z,w,d,h,far,part='roof'){
 const g=B.get(zone,'makaiTile',part),e=B.get(zone,'makaiMetal',part),t=.8;
 const a=[x-w/2,y,z+d/2],b=[x+w/2,y,z+d/2],c=[x,y+h,z+d/2],aa=[x-w/2,y,z-d/2],bb=[x+w/2,y,z-d/2],cc=[x,y+h,z-d/2];
 g.quad(a,c,cc,aa,C.tile);g.quad(c,b,bb,cc,C.tile);g.tri(a,b,c,C.tile);g.tri(bb,aa,cc,C.tile);g.box(x,y-t,z,w,t,d,C.dark);
 e.tube(c,cc,.42,C.metal,6);for(const[p,q]of [[a,c],[b,c],[aa,cc],[bb,cc]])e.tube(p,q,.25,C.metal,5);
 for(const side of[-1,1])e.box(x+side*w/2,y-.6,z,1,.8,d+1,C.edge);
 if(!far)for(let zz=z-d/2+1;zz<z+d/2;zz+=6)for(const side of[-1,1])e.tube([x,y+h+.1,zz],[x+side*w/2,y+.13,zz],.18,G.blend(C.tile,C.edge,.32),5);
}
function lantern(B,zone,x,y,z,far){const g=B.get(zone,'makaiMetal');g.box(x,y,z,1.4,.7,1.4,C.stone);g.tube([x,y,z],[x,y+7,z],.27,C.metal,6);g.box(x,y+5.8,z,2.4,.3,2.4,C.dark);g.box(x,y+8,z,2.8,.45,2.8,C.dark);for(const dx of[-.95,.95])for(const dz of[-.95,.95])g.box(x+dx,y+6,z+dz,.22,2,.22,C.metal);if(!far)B.get(zone,'makaiLamp').box(x,y+6,z,1.65,1.85,1.65,C.warm);}
function wallWithWindows(B,zone,cx,y,cz,length,height,far,{side=false,part='base',spacing=12}={}){
 const wall=B.get(zone,'makaiWall',part),n=Math.max(1,Math.round(length/spacing)),w=length/n;
 const box=(x,yy,z,ww,hh,dd,col)=>side?wall.box(cx+z,y+yy,cz+x,dd,hh,ww,col):wall.box(cx+x,y+yy,cz+z,ww,hh,dd,col);
 if(far){box(0,0,0,length,height,1.7,C.wall);return;}
 box(0,0,0,length,3.5,1.8,C.wall);box(0,height-5,0,length,5,1.8,C.wall);
 for(let i=0;i<=n;i++)box(-length/2+i*w,3.5,0,2.0,height-8.5,2.0,C.wall);
 const frame=B.get(zone,'makaiMetal',part),glass=B.get(zone,'makaiGlass',part);
 for(let i=0;i<n;i++){
  const x=-length/2+(i+.5)*w,ww=w-3.8;
  const bx=(g,xx,yy,zz,a,b,c,col)=>side?g.box(cx+zz,y+yy,cz+xx,c,b,a,col):g.box(cx+xx,y+yy,cz+zz,a,b,c,col);
  bx(glass,x,4,-.10,ww,height-9.2,.18,i%2?C.glass:C.violet);
  for(const xx of[x-ww/2,x,x+ww/2])bx(frame,xx,3.6,.95,.27,height-8.7,.32,C.metal);
  for(const yy of[4,height*.52,height-5.2])bx(frame,x,yy,.95,ww,.32,.32,C.gold);
  const wp=(xx,yy,zz)=>side?[cx+zz,y+yy,cz+xx]:[cx+xx,y+yy,cz+zz];
  for(const yy of[height*.30,height*.73]){const dy=(height-9)*.17,dx=ww*.40,ps=[[x,yy-dy],[x-dx,yy],[x,yy+dy],[x+dx,yy]];
   for(let k=0;k<4;k++){frame.tube(wp(...ps[k],.18),wp(...ps[(k+1)%4],.18),.12,C.metal,5);glass.tri(wp(x,yy,.015),wp(...ps[k],.015),wp(...ps[(k+1)%4],.015),k%2?C.glass:C.pink);}
  }
 }
}
function smallHouse(B,x,z,w,d,h,far,variant){
 const zone=x<0?'streetWest':'streetEast',y=23;
 B.get(zone).box(x,18,z,w+4,5,d+4,C.stone);B.get(zone).box(x,22.5,z,w+5,.65,d+5,C.edge);
 if(variant===1){B.get(zone,'makaiWall').cone(x,y,z,w*.47,w*.43,h,C.wall,8);B.get(zone,'makaiTile','roof').cone(x,y+h,z,w*.56,.5,h*.6,C.tile,8);}
 else{
  wallWithWindows(B,zone,x,y,z-d/2,w,h,far);wallWithWindows(B,zone,x-w/2,y,z,d,h,far,{side:true});wallWithWindows(B,zone,x+w/2,y,z,d,h,far,{side:true});
  // Open shopfront beneath its lintel; the interior is shallow rather than painted shut.
  const wall=B.get(zone,'makaiWall');wall.box(x,y+h-5,z+d/2,w,5,2,C.wall);
  for(const xx of[x-w/2,x+w/2])wall.box(xx,y,z+d/2,3,h,3,C.wall);
  const wood=B.get(zone,'makaiWood');wood.box(x,y,z+d*.3,w-5,4,4,C.wood);
  gable(B,zone,x,y+h,z,w+6,d+6,variant===2?14:8,far);
  if(!far){const props=B.get(zone,'makaiMetal','props');for(let j=0;j<4;j++)prism(props,x-w*.30+j*w*.18,y+4,z+d*.29,1.4,2.5+(j%2),j%2?C.glass:C.pink,5);for(const xx of[x-w*.35,x+w*.35])wood.box(xx,y-1,z+d/2+7,1,h*.55,1,C.wood);gable(B,zone,x,y+h*.6,z+d/2+5,w+4,14,4,false,'awning');}
 }
 if(!far){const t=B.get(zone,'makaiMetal');for(const xx of[x-w*.4,x+w*.4])t.box(xx,18,z-d/2-4,3,h*.35,3,C.edge);}
}
function terrain(B,zone,h,x0,z0,width,depth,far,color=C.soil,paint=null){const g=B.get(zone,'makaiRock','base','terrain'),nx=far?14:68,nz=far?22:100;
 for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const x=x0+i*width/nx,z=z0+j*depth/nz,x1=x+width/nx,z1=z+depth/nz;const col=G.blend(color,C.edge,.04+.09*G.noise(x/190,z/190));const ps=[[x,h(x,z),z],[x,h(x,z1),z1],[x1,h(x1,z1),z1],[x1,h(x1,z),z]];for(const tri of[[0,1,2],[0,2,3]])for(const ix of tri){const p=ps[ix],e=.3,n=G.norm([h(p[0]-e,p[2])-h(p[0]+e,p[2]),2*e,h(p[0],p[2]-e)-h(p[0],p[2]+e)]);g.vertex(p,n,paint?paint(p[0],p[2]):col);}}
 // Fog-skirt keeps the rectangular sampling boundary out of the close view.
 for(let k=0;k<4;k++){const a=[[x0,z0],[x0+width,z0],[x0+width,z0+depth],[x0,z0+depth]][k],b=[[x0,z0],[x0+width,z0],[x0+width,z0+depth],[x0,z0+depth]][(k+1)%4];g.quad([a[0],h(...a),a[1]],[b[0],h(...b),b[1]],[b[0]*9,-20,b[1]*9],[a[0]*9,-20,a[1]*9],color);}
}
function road(B,points,width,yFunc,far,zone='road'){
 const g=B.get(zone,'makaiPaving'),samples=G.spline(points,far?14:5);
 for(let i=0;i<samples.length-1;i++){const a=samples[i],b=samples[i+1],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);if(len<.01)continue;const nx=-dz/len*width/2,nz=dx/len*width/2;
  const pt=(p,s)=>[p[0]+nx*s,yFunc(p[0]+nx*s,p[1]+nz*s)+.35,p[1]+nz*s];g.quad(pt(a,-1),pt(b,-1),pt(b,1),pt(a,1),C.stone);
  if(!far&&i%2===0)g.tube(pt(a,-1),pt(a,1),.06,C.edge,4);
 }
}
function palace(B,far){
 const y=68,z=-618,base=B.get('palaceBase');
 base.box(0,36,z,242,24,211,C.rock);base.box(0,60,z,228,8,195,C.stone);base.box(0,67,z,232,1.4,199,C.edge);
 for(const x of[-90,90])for(const zz of[-535,-700]){base.box(x,28,zz,24,38,24,C.rock);base.box(x,65,zz,28,3,28,C.pale);}
 staircase(B,'stairs',0,-457,50,30,1,38,1.50);
 const floor=B.get('hall','makaiPaving','interior');floor.box(0,y,-621,153,.7,145,C.dark);
 if(!far){for(let i=-6;i<=6;i++)for(let j=0;j<13;j++)floor.box(i*11.5,y+.70,-549-j*11.5,11.25,.08,11.25,(i+j)%2?C.dark:C.stone);
  const inlay=B.get('hall','makaiMetal','interior');ring(inlay,0,y+1,-621,31,.2,C.gold,64);ring(inlay,0,y+1,-621,27,.12,C.glass,48);
  for(let i=0;i<8;i++){const a=i*TAU/8,b=a+3*TAU/8;inlay.tube([Math.cos(a)*26,y+1.12,-621+Math.sin(a)*26],[Math.cos(b)*26,y+1.12,-621+Math.sin(b)*26],.12,C.gold,4);}
 }
 // Front has a genuine high portal and flanking open arches, not a solid box.
 const front=B.get('hall','makaiWall','front');front.box(-49,y,-541,55,55,3,C.wall);front.box(49,y,-541,55,55,3,C.wall);front.box(0,y+46,-541,46,9,3,C.wall);
 arch(B,'hall',0,y,-541,39,46,4,far,'front');
 const bands=B.get('hall','makaiStone','front');
 for(const x of[-68,-28,28,68]){bands.box(x,y,-538.5,3.4,52,3.4,C.pale);bands.box(x,y+51,-538.5,6,1.5,5,C.stone);bands.box(x,y,-538.3,6,1.4,5,C.stone);}
 bands.box(0,y+52.7,-539,159,1.8,6,C.stone);bands.box(0,y+54.5,-539,161,.75,6.5,C.pale);
 if(!far){const relief=B.get('hall','makaiMetal','front');
  for(const x of[-48,48]){arch(B,'hall',x,y+10,-537.3,19,31,1.4,false,'front',C.stone);ring(relief,x,y+34,-536.4,5.8,.20,C.gold,36,true);for(let i=0;i<8;i++){const a=i*TAU/8;relief.tube([x,y+34,-536.4],[x+Math.cos(a)*5.8,y+34+Math.sin(a)*5.8,-536.4],.12,C.metal,4);}}
 }
 wallWithWindows(B,'hall',0,y,-701,153,55,far,{part:'back',spacing:19});
 wallWithWindows(B,'hall',-76,y,-621,160,55,far,{side:true,part:'left',spacing:20});
 wallWithWindows(B,'hall',76,y,-621,160,55,far,{side:true,part:'right',spacing:20});
 for(const x of[-53,53])for(let zz=-565;zz>=-684;zz-=29){
  const col=B.get('hall','makaiStone','interior');col.box(x,y,zz,7,2,7,C.edge);col.cone(x,y+2,zz,2.1,1.75,36,C.pale,far?6:10);col.box(x,y+38,zz,6,2,6,C.gold);
  arch(B,'hall',0,y+32,zz,104,29,2.2,far,'vault',C.stone);
 }
 const ceiling=B.get('hall','makaiTile','roof');ceiling.box(0,y+58,-621,162,2,173,C.tile);
 gable(B,'hall',0,y+61,-621,169,184,28,far);
 // Raised galleries with real supporting columns and rear access stairs.
 for(const x of[-65,65]){
  B.get('hall','makaiStone','interior').box(x,y+16,-622,18,1.5,150,C.stone);
  rail(B,'hall',[x+(x<0?9:-9),-551],[x+(x<0?9:-9),-690],y+17.5,far);
  if(!far)staircase(B,'gallery',x,-657,12,y,1,18,1.8);
 }
 // Four tapering buttressed turrets and a tall octagonal central spire.
 for(const x of[-112,112])for(const zz of[-552,-686]){
  const s=B.get('towers');s.cone(x,60,zz,15,13,65,C.pale,8);s.cone(x,124,zz,17,17,4,C.stone,8);s.cone(x,128,zz,14,10,27,C.wall,8);
  const roof=B.get('towers','makaiTile','roof');roof.cone(x,155,zz,18,.4,45,C.tile,8);B.get('towers','makaiMetal','roof').tube([x,193,zz],[x,207,zz],.55,C.gold,6);
  if(!far)for(let i=0;i<8;i++){const a=i*TAU/8;prism(B.get('towers','makaiGlass'),x+Math.cos(a)*13.2,135,zz+Math.sin(a)*13.2,1.3,11,C.glass,5);}
 }
 const tower=B.get('spire');tower.cone(0,129,-682,29,26,43,C.stone,8);tower.cone(0,172,-682,29,29,4,C.pale,8);tower.cone(0,176,-682,24,20,31,C.wall,8);
 const sp=B.get('spire','makaiTile','roof');sp.cone(0,207,-682,30,6,53,C.tile,8);sp.cone(0,260,-682,6,.15,27,C.tile,8);
 if(!far)for(let i=0;i<8;i++){const a=i*TAU/8;B.get('spire','makaiMetal').tube([Math.cos(a)*25,175,-682+Math.sin(a)*25],[Math.cos(a)*20,207,-682+Math.sin(a)*20],.42,C.gold,6);}
 for(const side of[-1,1])for(let zz=-567;zz>=-684;zz-=39){const s=B.get('buttresses');s.box(side*87,42,zz,9,25,11,C.stone);s.tube([side*88,67,zz],[side*77,113,zz],4,C.stone,4,2.8);}
 for(const x of[-110,110]){rail(B,'terrace',[x,-521],[x,-719],68,far);for(const zz of[-525,-620,-712])lantern(B,'terrace',x,69,zz,far);}
 rail(B,'terrace',[-110,-717],[110,-717],68,far);
 if(!far){
  for(const zz of[-579,-636,-681]){const g=B.get('hall','makaiMetal','interior');g.tube([0,126,zz],[0,110,zz],.25,C.metal,6);ring(g,0,109,zz,8,.25,C.gold,24);for(let i=0;i<6;i++){const a=i*TAU/6;B.get('hall','makaiLamp','interior').cone(Math.cos(a)*8,109,zz+Math.sin(a)*8,.75,.48,2,C.warm,7);}}
  const dais=B.get('hall','makaiStone','interior');dais.box(0,69,-685,36,3,18,C.pale);dais.box(0,72,-690,18,2,11,C.stone);
  // Unnamed ceremonial furnishing. Not a claim of an official throne design.
  dais.box(0,74,-691,9,4,5,C.wall);dais.box(0,77,-693,9,11,1.4,C.stone);dais.tri([-4.5,88,-692.2],[4.5,88,-692.2],[0,93,-692.2],C.pale);B.get('hall','makaiWood','interior').box(0,78,-691.6,6.8,8,.5,C.wood);
  for(const x of[-26,26])prism(B.get('hall','makaiGlass','interior'),x,72,-684,2.7,11,C.glass,6);
 }
}
function th05(far=false){const B=bank('makai05',far),R=G.rng(5200928);
 const h=(x,z)=>18+21*G.smooth(80,350,-z)+5*Math.sin(x/250)*G.smooth(180,460,Math.abs(x));
 terrain(B,'land',h,-1100,-1100,2200,2050,far,C.soil,(x,z)=>{const d=Math.hypot((x-65)/310,(z+270)/168)+.05*Math.sin(x/27)*Math.cos(z/39),t=1-G.smooth(.76,1.12,d);return G.blend(C.soil,C.snow,t*.93);});
 road(B,[[0,716],[0,610],[0,450],[0,340],[76,190],[-45,31],[10,-94],[160,-220],[64,-375],[0,-460]],27,h,far);
 // Cave shell is an annular rock portal with an open corridor beneath.
 const cave=B.get('gate','makaiRock'),shell=B.get('passage','makaiRock','caveRoof');
 const n=far?12:32,nz=far?5:14;
 const section=(a,z,outer)=>{const rough=outer?1+.045*Math.sin(a*7+z*.013):1+.025*Math.sin(a*5+z*.009);return[Math.cos(a)*(outer?143:39)*rough,53+Math.sin(a)*(outer?100:40)*rough,z];};
 for(let j=0;j<nz;j++){const z=366+j*241/nz,z1=366+(j+1)*241/nz;
  for(let i=0;i<n;i++){const a=i*Math.PI/n,b=(i+1)*Math.PI/n;
   shell.quad(section(a,z,false),section(b,z,false),section(b,z1,false),section(a,z1,false),C.rock);
   shell.quad(section(b,z,true),section(a,z,true),section(a,z1,true),section(b,z1,true),G.blend(C.rock,C.edge,.09+.035*Math.sin(i*.6)));
   if(!j||j===nz-1){const zz=!j?z:z1;cave.quad(section(a,zz,false),section(b,zz,false),section(b,zz,true),section(a,zz,true),C.edge);}
  }
  for(const side of[-1,1]){const x=side*39,xx=side*143;cave.quad([x,18,z],[x,53,z],[x,53,z1],[x,18,z1],C.rock);cave.quad([xx,18,z1],[xx,53,z1],[xx,53,z],[xx,18,z],C.rock);}
 }
 for(const side of[-1,1])for(const zz of[366,607])cave.box(side*91,18,zz,103,35,5,C.rock);
 arch(B,'gate',0,18,609,71,72,9,far,'base',C.edge);
 for(const zz of[544,475,413])arch(B,'passage',0,18,zz,70,72,3.5,far,'arch',C.stone);
 if(!far){for(const side of[-1,1])for(const zz of[385,451,519,582])lantern(B,'passage',side*31,18,zz,false);}
 if(!far)for(let i=0;i<29;i++){
  const a=R()*TAU,x=Math.sign(Math.cos(a))*(43+R()*27),z=372+R()*231;
  prism(B.get('passage','makaiCrystal'),x,18,z,1+R()*2.1,8+R()*13,C.blue,5);
 }
 for(const[x,z,w,d,hv,v]of[
  [-93,246,44,31,23,0],[122,184,39,33,28,1],[-46,186,44,28,26,2],[-106,113,51,31,21,0],[81,93,39,32,25,0],
  [-146,43,44,36,26,2],[24,17,35,29,29,1],[-112,-36,46,33,24,0],[94,-44,52,29,19,2],[-46,-103,40,34,27,2],
  [-212,142,44,33,21,1],[-237,65,35,29,19,0],[168,91,46,27,23,2],[184,8,47,29,19,0],[-231,-61,45,28,22,2]
 ])smallHouse(B,x,z,w,d,hv,far,v);
 road(B,[[-267,160],[-188,155],[-114,165],[-21,95],[136,18],[237,22]],12,h,far,'crossLane');
 if(!far){for(const[x,z]of[[-28,242],[55,247],[-10,143],[-74,52],[33,2],[48,-83],[-192,155],[135,7]])lantern(B,'streetLamps',x,19,z,far);}
 // Broad ice field rests on the same terrain; frozen high ground, not an isolated display slab.
 const crystal=B.get('ice','makaiIce'),R2=G.rng(5004);
 for(let i=0;i<(far?21:61);i++){let x=-154+R2()*535,z=-141-R2()*251;if(x>20&&x<213&&Math.abs(z+250)<85)continue;const y=h(x,z),r=3+R2()*10;prism(crystal,x,y,z,r,19+R2()*47,i%3?C.ice:C.snow,far?5:7);}
 for(const[x,z]of [[-178,-373],[338,-177],[338,-348],[-155,-203]])orb(B.get('ice','makaiRock'),x,h(x,z)-1,z,35,15,25,C.blue,far?6:10,4);
 palace(B,far);
 // Distant uplands frame the city and palace, without changing the navigable axis.
 const hills=B.get('horizon','makaiRock','base','terrain');
 for(const side of[-1,1]){const nx=far?9:26,nz=far?24:86;
  const hp=(x,z)=>{const d=(Math.abs(x)-640-45*Math.sin(z/191))/190;return h(x,z)+Math.exp(-d*d*2)*(115+74*G.noise(z/127,side*91)+22*Math.sin(z/83));};
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const x=side*(370+i*650/nx),x1=side*(370+(i+1)*650/nx),z=-1100+j*1950/nz,z1=-1100+(j+1)*1950/nz,ps=[[x,hp(x,z),z],[x,hp(x,z1),z1],[x1,hp(x1,z1),z1],[x1,hp(x1,z),z]];
   for(const tri of (side===1?[[0,1,2],[0,2,3]]:[[0,2,1],[0,3,2]]))for(const k of tri){const p=ps[k],e=.3,n=G.norm([hp(p[0]-e,p[2])-hp(p[0]+e,p[2]),2*e,hp(p[0],p[2]-e)-hp(p[0],p[2]+e)]);hills.vertex(p,n,G.blend(C.rock,C.edge,.03+.07*G.smooth(60,200,p[1])));}
  }
 }
 return B.finish({locations:['pc98_makai','pc98_gate','pc98_maspace','pc98_street','pc98_ice','pc98_panda'],era:'TH05',routes:'P display sequence; not measured inter-stage distances'});
}
function th12(far=false){const B=bank('makai12',far),R=G.rng(1200928);
 const h=(x,z)=>7+4*Math.sin(x/170)*Math.cos(z/193)+9*G.noise(x/210,z/180);
 terrain(B,'blackland',h,-1800,-1900,3600,3400,far,C.black);
 // Broken, low ground masses are interpretation of the scrolling stage, not a new ocean.
 const rock=B.get('blackland','makaiRock');for(let i=0;i<(far?14:37);i++){const x=(R()-.5)*1100,z=(R()-.5)*1300;orb(rock,x,h(x,z)-7,z,25+R()*60,13+R()*16,30+R()*61,C.dark,far?6:10,4);}
 const seal=B.get('seal','makaiSeal','seal','effects'),grid=B.get('seal','makaiRed','seal','effects');
 const extent=far?550:720,spacing=far?80:40;
 for(let x=-extent;x<=extent;x+=spacing){grid.tube([x,143,-extent],[x,143,extent],.42,C.red,4);grid.tube([-extent,143,x],[extent,143,x],.42,C.red,4);}
 ring(seal,0,144,-40,175,1.15,C.red,far?32:80);ring(seal,0,144,-40,146,.60,C.pink,far?28:72);
 for(let i=0;i<8;i++){const a=i*TAU/8,b=a+3*TAU/8;seal.tube([Math.cos(a)*175,144,-40+Math.sin(a)*175],[Math.cos(b)*175,144,-40+Math.sin(b)*175],.65,C.red,4);}
 // The rainbow framework is a spatial reference to stage 6; its scale and depth are P.
 const prismColors=['#b86587','#9b729d','#7889b2','#72a9a7','#b4b27a'].map(G.rgb);
 const rainbow=B.get('hokkai','makaiSpectrum','spectrum','effects');
 for(let i=0;i<5;i++){
  const r=276+i*21,col=prismColors[i];for(const side of[-1,1]){rainbow.tube([side*r,10,-930],[side*r,240,-930],.75,col,5);rainbow.tube([side*r,240,-930],[side*r,240,280],.75,col,5);}
  rainbow.tube([-r,240,-930],[r,240,-930],.8,col,5);
 }
 const frame=B.get('hokkai','makaiSpectrum','spectrum','effects');
 for(let z=-910;z<=210;z+=far?160:80)for(const side of[-1,1]){frame.tube([side*360,13,z],[side*360,225,z],.25,C.violet,4);frame.tube([side*360,225,z],[side*280,225,z],.25,C.glass,4);}
 // A distant, varied skyline, not labeled as Shinki's old palace or a measured city district.
 for(let i=0;i<(far?30:60);i++){
  const x=-830+i*1660/(far?29:59),z=-1120-R()*180,w=14+R()*24,hh=39+R()*96;
  const g=B.get('skyline','makaiSkyline');g.box(x,h(x,z),z,w,hh,15+R()*24,i%2?C.violet:C.dark);
  if(!far){const win=B.get('skyline','makaiLamp');for(let j=0;j<4;j++)win.box(x,h(x,z)+hh*.28+j*hh*.14,z+20,w*.62,.9,.4,C.red);}
 }
 if(!far){const mist=B.get('miasma','makaiMiasma','atmosphere','effects');for(let k=0;k<7;k++)for(let i=0;i<72;i++){
  const a=-Math.PI*.2+i*Math.PI*1.3/72,b=-Math.PI*.2+(i+1)*Math.PI*1.3/72,r=230+k*61,yy=36+k*13,point=(t,dr,dy)=>[Math.sin(t)*r+dr,yy+dy+12*Math.sin(t*2+k),Math.cos(t)*r-170];
  const ps=[point(a,0,0),point(b,0,0),point(b,15,15),point(a,15,15)],cs=[[i/72,0,k/7],[(i+1)/72,0,k/7],[(i+1)/72,1,k/7],[i/72,1,k/7]];
  for(const tri of[[0,1,2],[0,2,3]])for(const idx of tri)mist.vertex(ps[idx],[0,1,0],cs[idx]);
 }}
 return B.finish({locations:['makai','hokkai'],era:'TH12',sealState:'stage5 aerial / stage6 released are separate views'});
}
function th01(far=false){const B=bank('makai01',far),R=G.rng(100928),h=(x,z)=>14+3*G.noise(x/150,z/150);
 terrain(B,'ruinland',h,-1400,-1400,2800,2600,far,C.rock);
 // Ruin platforms have substantial retaining masonry. Broken arches preserve passages.
 for(const[x,z,w,d,yy]of [[0,34,223,196,10],[-115,96,73,69,5],[94,-64,102,70,7]]){const s=B.get('vina');s.box(x,16,z,w,yy,d,C.ochre);s.box(x,16+yy,z,w+2,1.1,d+2,C.pale);}
 staircase(B,'vina',0,187,56,16,1,11,4.1);
 for(const x of[-87,-43,43,87])for(const z of[-27,32,91]){
  const s=B.get('vina');s.box(x,27,z,9,1.9,9,C.pale);s.cone(x,29,z,3,2.6,19+(x+z)%3*3,C.ochre,far?7:12);s.box(x,50+(x+z)%3*3,z,8,2.1,8,C.stone);
 }
 for(const[x,z]of [[-64,-31],[65,-31],[-64,100]])arch(B,'ruinArch',x,27,z,34,44,9,far,'base',C.ochre);
 const broken=B.get('vina','makaiRock');for(let i=0;i<(far?14:56);i++){const x=(R()-.5)*204,z=-72+R()*232;if(Math.abs(x)<25)continue;broken.box(x,17,z,5+R()*13,3+R()*8,5+R()*10,C.ochre);}
 // Fallen sanctuary: crosses and ritual hall draw on TH01 motifs. Entire external massing is P.
 const plinth=B.get('temple');plinth.box(0,15,-384,179,9,204,C.stone);plinth.box(0,24,-384,183,1.3,208,C.pale);
 staircase(B,'temple',0,-238,48,15,1,10,4.8);
 const y=25;
 wallWithWindows(B,'sanctuary',0,y,-478,117,47,far,{part:'back',spacing:17});
 wallWithWindows(B,'sanctuary',-58,y,-393,170,47,far,{side:true,part:'left',spacing:24});
 wallWithWindows(B,'sanctuary',58,y,-393,170,47,far,{side:true,part:'right',spacing:24});
 const front=B.get('sanctuary','makaiWall','front');front.box(-41,y,-307,33,48,5,C.ochre);front.box(41,y,-307,33,48,5,C.ochre);front.box(0,y+38,-307,50,10,5,C.ochre);arch(B,'sanctuary',0,y,-307,46,38,5,far,'front',C.ochre);
 gable(B,'sanctuary',0,74,-393,128,188,30,far);
 const cross=B.get('sanctuary','makaiMetal');cross.box(0,88,-294,3.2,29,3.2,C.pale);cross.box(0,103,-294,18,3,3.2,C.pale);
 for(const x of[-83,83]){
  const t=B.get('bellTowers');t.box(x,25,-324,24,56,29,C.ochre);arch(B,'bellTowers',x,81,-324,18,23,7,far);gable(B,'bellTowers',x,105,-324,33,38,18,far);
  t.box(x,52,-436,15,21,23,C.ochre);
 }
 const floor=B.get('sanctuary','makaiPaving','interior');floor.box(0,25,-390,114,.6,168,C.dark);
 if(!far){
  for(let z=-321;z>=-465;z-=18){for(const x of[-39,39]){const col=B.get('sanctuary','makaiStone','interior');col.box(x,25,z,7,2,7,C.pale);col.cone(x,27,z,2.25,1.8,31,C.ochre,10);}arch(B,'sanctuary',0,52,z,77,27,1.5,far,'vault',C.ochre);}
  const altar=B.get('sanctuary','makaiStone','interior');altar.box(0,26,-460,39,3,17,C.stone);altar.box(0,29,-459,22,7,9,C.pale);
  const holy=B.get('sanctuary','makaiMetal','interior');holy.box(0,38,-474,1.6,22,1.6,C.gold);holy.box(0,50,-474,12,1.5,1.6,C.gold);
  for(const x of[-24,24]){B.get('sanctuary','makaiMetal','interior').cone(x,26,-453,2,1,12,C.metal,8);orb(B.get('sanctuary','makaiSpirit','interior','effects'),x,42,-453,2,3.1,2,C.violet,10,6);}
 }
 road(B,[[0,-68],[36,-132],[0,-215],[0,-238]],19,()=>17,far);
 return B.finish({locations:['pc98_vina','pc98_fallen'],era:'TH01',notIncluded:'river of hands, all stages, destructible objects'});
}
Object.assign(G,{buildMakai05:th05,buildMakai12:th12,buildMakai01:th01,buildMakaiOverviews:()=>[th12(true),th05(true),th01(true)]});
const previous=G.buildRegion;G.buildRegion=async function(data,id,legacy){const start=performance.now(),p=id==='makai12'?th12():id==='makai05'?th05():id==='makai01'?th01():null;if(!p)return previous(data,id,legacy);p.builtMs=performance.now()-start;return p;};
})(globalThis.GA);
