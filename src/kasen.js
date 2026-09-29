/* Kasen's separate hermit world. WAaHH house + separately selected TH155 ink landscape.
 * Every dimension, unseen elevation, garden path and prop placement is P.
 * No invented fixed mountain entrance; see docs/kasen-reference.md. */
(function(G){
 'use strict';
 const TAU=Math.PI*2,space='senkai_kasen',id='kasen';
 const C=Object.fromEntries(Object.entries({grass:'#97aa88',moss:'#758d72',rock:'#9ca998',pale:'#dfdcc5',stone:'#b6b9a4',wood:'#754f42',red:'#ac6250',tile:'#506f72',edge:'#90a4a0',dark:'#343f3b',paper:'#e7d7b2',gold:'#c5ae79',leaf:'#77957a',light:'#a4b38b',bark:'#746553',pink:'#d8b7b6',flower:'#eee0b6',water:'#5f9292',bird:'#776453',feather:'#c9bea5'}).map(([k,c])=>[k,G.rgb(c)]));
 const views={
  kasenOverview:{label:'华扇仙界 · 雾隐山居',eye:[291,193,336],target:[10,38,-36],fov:45},
  kasenPath:{label:'仙界 · 入庭曲径',eye:[37,43,216],target:[20,42,-40],fov:51},
  kasenManor:{label:'茨华仙邸 · 三重楼阁',eye:[133,96,119],target:[31,51,-36],fov:47},
  kasenCourtyard:{label:'仙邸 · 花庭与石阶',eye:[-46,43,99],target:[30,34,-15],fov:54},
  kasenStudy:{label:'仙邸 · 圆窗书室',eye:[15,37,-23],target:[41,35,-51],fov:67,kasenInterior:true},
  kasenWindow:{label:'仙邸 · 窗内望庭',eye:[13,36,-38],target:[14,31,12],fov:58,kasenInterior:true},
  kasenGallery:{label:'仙邸 · 二层环廊',eye:[-4,57,-14],target:[67,53,-27],fov:64},
  kasenRear:{label:'仙邸 · 背侧与附屋',eye:[154,86,-177],target:[31,42,-58],fov:50},
  kasenAnimals:{label:'后院 · 鹫栖与饲养器具',eye:[169,45,-84],target:[114,30,-88],fov:52},
  kasenStream:{label:'仙界 · 木桥与涧水',eye:[-150,42,64],target:[-107,24,-45],fov:55},
  kasenNight:{label:'仙邸 · 灯下夜庭',eye:[119,72,113],target:[30,46,-31],fov:51,kasenNight:true},
  kasenInk:{label:'华狭间 · 水墨群山',eye:[166,87,102],target:[-85,68,-220],fov:62,kasenEdition:'th155'},
  kasenRitual:{label:'仙邸 · 第48话阵纹示意',eye:[33,40,-21],target:[33,28.5,-30],fov:59,kasenRitual:true,kasenInterior:true},
  kasenSection:{label:'仙邸 · 书室剖览',eye:[135,128,121],target:[31,31,-37],fov:43,kasenSection:true}
 };
 for(const v of Object.values(views)){v.region=id;v.space=space;v.kasenEdition||='manga';v.era=v.kasenEdition==='th155'?'TH155水墨山川意象／P重构':v.kasenRitual?'茨歌仙第48话事件意象／P阵纹，不是传送系统':'茨歌仙山居选集／建筑尺寸、房间与道路P补完';}
 Object.assign(G.PRESETS,views);Object.assign(G.IMPLEMENTED,{kasen_senkai:'kasenOverview',kasen_home:'kasenManor'});G.LANDMARKS.partial.add('kasen_senkai');
 const block={id,name:'华扇仙界 · 茨华仙邸',space,center:[15,37,-40],poly:[],independent:true,bottom:-80,step:10};G.DIORAMA.blocks.push(block);G.DIORAMA.map.set(id,block);G.REGION_LABELS[id]=block.name;
 for(const k of ['transform','point','inverse']){const old=G.DIORAMA[k];G.DIORAMA[k]=k==='transform'?((r,...a)=>r===id?{scale:1,offset:[0,0,0]}:old(r,...a)):((p,r,...a)=>r===id?[...p]:old(p,r,...a));}
 function h(x,z){const terrain=23+5*Math.sin(x/120)*Math.cos(z/113)+8*G.smooth(130,370,-z);const home=1-G.smooth(55,95,Math.max(Math.abs(x-33),Math.abs(z+39)));const base=G.mix(terrain,25,home),d=Math.abs(x-river(z));return G.mix(15,base,G.smooth(7,31,d));}
 const river=z=>-115+20*Math.sin(z/87);
 function bank(far){const batches=new Map();return{
  get(zone,mat='Stone',part='base',edition='manga',group='architecture'){
   const key=[zone,mat,part,edition].join(':');if(!batches.has(key))batches.set(key,{g:new G.Geometry(),zone,mat,part,edition,group});return batches.get(key).g.place();
  },finish(meta){const meshes=[];for(const[k,b]of batches)if(b.g.a.length)meshes.push(b.g.mesh(`kasen:${far?'far':'detail'}:${k}`,b.group,{owner:id,region:id,space,overview:far,material:'kasen'+b.mat,kasenZone:b.zone,kasenPart:b.part,kasenEdition:b.edition,basis:'P',shadowCaster:!['land','mountains','mist','water'].includes(b.zone)}));return{id,meshes,signs:[],bytes:meshes.reduce((s,m)=>s+m.vertices.byteLength,0),meta:{version:'0.26.0',overview:far,surfaceCut:false,fullRealm:false,...meta}};}
 };}
 function oval(g,x,y,z,rx,ry,rz,c,n=10,rings=5){const p=(i,j)=>{const a=i*TAU/n,b=j*Math.PI/rings;return[x+rx*Math.sin(b)*Math.cos(a),y+ry*Math.cos(b),z+rz*Math.sin(b)*Math.sin(a)];};for(let j=0;j<rings;j++)for(let i=0;i<n;i++){if(j===0)g.tri(p(i,0),p(i+1,1),p(i,1),c);else if(j===rings-1)g.tri(p(i,j),p(i+1,j),p(i,rings),c);else g.quad(p(i,j),p(i+1,j),p(i+1,j+1),p(i,j+1),c);}}
 function ring(g,x,y,z,r,thickness,c,vertical=false,n=48){for(let i=0;i<n;i++){const a=i*TAU/n,b=(i+1)*TAU/n;const p=(t,R)=>vertical?[x+Math.cos(t)*R,y+Math.sin(t)*R,z]:[x+Math.cos(t)*R,y,z+Math.sin(t)*R];g.quad(p(a,r),p(b,r),p(b,r-thickness),p(a,r-thickness),c);}}
 function roof(B,x,z,y,w,d,rise,far,part){
  const g=B.get('house','Tile',part).place(x,0,z),r=B.get('house','Trim',part).place(x,0,z),u=B.get('house','Wood',part).place(x,0,z);
  const layers=[[w/2,d/2,y+.55],[w*.44,d*.43,y],[w*.32,d*.22,y+rise*.55],[w*.23,.24,y+rise]];
  const pts=a=>[[-a[0],a[2],-a[1]],[a[0],a[2],-a[1]],[a[0],a[2],a[1]],[-a[0],a[2],a[1]]];
  for(let k=0;k<3;k++){const a=pts(layers[k]),b=pts(layers[k+1]);for(let i=0;i<4;i++)g.quad(a[i],b[i],b[(i+1)%4],a[(i+1)%4],C.tile);}
  const p=pts(layers[3]);g.quad(p[3],p[2],p[1],p[0],C.tile);u.box(0,y-.75,0,w*.88,.6,d*.86,C.wood);
  for(const [xx,zz,ww,dd]of[[0,-d/2,w,.5],[0,d/2,w,.5],[-w/2,0,.5,d],[w/2,0,.5,d]])r.box(xx,y-.35,zz,ww,.85,dd,C.edge);
  r.tube([-w*.23,y+rise+.2,0],[w*.23,y+rise+.2,0],.38,C.edge,6);
  if(!far){for(let i=0;i<4;i++)for(let j=0;j<3;j++)r.tube(pts(layers[j])[i],pts(layers[j+1])[i],.18,C.edge,5);
   for(let xx=-w*.23;xx<=w*.23;xx+=1.5)for(const s of[-1,1])for(let j=0;j<3;j++){let a=layers[j],b=layers[j+1];r.tube([xx,a[2]+.1,a[1]*s],[xx,b[2]+.1,b[1]*s],.09,C.edge,4);}
   for(let xx=-w*.4;xx<=w*.4;xx+=3.2)for(const s of[-1,1])u.box(xx,y-1.3,s*d*.40,.45,.8,d*.22,C.red);
  }
  for(const s of[-1,1]){r.tube([s*w*.23,y+rise+.2,0],[s*(w*.23+1.3),y+rise+1.4,0],.32,C.edge,6);r.tube([s*(w*.23+1.3),y+rise+1.4,0],[s*(w*.23+1.0),y+rise+2.2,0],.22,C.edge,6);}g.place();r.place();u.place();
 }
 // Rectangular plaster panel with a truly empty circular opening, including reveals.
 function roundWindow(B,x,z,y,size,angle,part,far){const wall=B.get('house','Wall',part).place(x,y,z,angle),wood=B.get('house','Wood',part).place(x,y,z,angle),r=size*.39,n=far?16:40;
  const p=(a,R,d)=>[Math.cos(a)*R,Math.sin(a)*R,d];
  for(let i=0;i<n;i++){let a=i*TAU/n,b=(i+1)*TAU/n,ra=size/2/Math.max(Math.abs(Math.cos(a)),Math.abs(Math.sin(a))),rb=size/2/Math.max(Math.abs(Math.cos(b)),Math.abs(Math.sin(b)));
   for(const d of[-.5,.5])wall.quad(p(a,r,d),p(b,r,d),p(b,rb,d),p(a,ra,d),C.pale);
   wall.quad(p(a,r,-.5),p(a,r,.5),p(b,r,.5),p(b,r,-.5),C.stone);
   wood.tube(p(a,r,.54),p(b,r,.54),.22,C.red,5);
  }
  if(!far)for(const v of[-.58,0,.58]){const xx=v*r,dy=Math.sqrt(r*r-xx*xx);wood.box(xx,-dy,.52,.20,dy*2,.28,C.wood);wood.box(0,xx,.52,dy*2,.20,.28,C.wood);}wall.place();wood.place();
 }
 function rail(B,a,b,y,part='base'){const g=B.get('house','Wood',part),n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/3);for(let i=0;i<=n;i++){const t=i/n;g.box(G.mix(a[0],b[0],t),y,G.mix(a[1],b[1],t),.5,3.1,.5,C.red);}for(const yy of[.6,2.9])g.tube([a[0],y+yy,a[1]],[b[0],y+yy,b[1]],.19,C.wood,5);}
 function house(B,far){
  B.get('house').box(33,24,-38,64,3,48,C.stone);B.get('house','Trim').box(33,27,-38,66,.8,50,C.pale);
  for(let i=0;i<7;i++)B.get('stairs').box(33,25,-2-i*1.7,16,(i+1)*.4,1.75,C.stone);
  const tiers=[{x:33,z:-38,y:27.8,w:58,d:42,H:16,part:'lower'},{x:33,z:-38,y:50.8,w:46,d:32,H:13,part:'upper'},{x:33,z:-38,y:71.8,w:34,d:25,H:12,part:'upper'}];
  tiers.forEach((t,k)=>{const{x,z,y,w,d,H,part}=t,wall=B.get('house','Wall',part),wood=B.get('house','Wood',part),s=B.get('house','Stone',part);
   wood.box(x,y,z,w,.5,d,C.wood);
   if(far){wall.box(x,y+.5,z,w,H,d,C.pale);}else{
    for(const side of[-1,1]){const zz=z+side*d/2,pp=side===1&&k===0?'front':part;
     if(k===0&&side===-1){B.get('house','Wall',part).box(x,y+.5,zz,w,H-.5,1,C.pale);continue;}
     if(k===0){const W=B.get('house','Wall',pp);for(const dx of[-17.5,17.5])W.box(x+dx,y+.5,zz,23,2.5,1,C.pale);W.box(x,y+14,zz,w,2,1,C.pale);
      for(const dx of[-17,17])roundWindow(B,x+dx,zz,y+8.5,11,side===1?0:Math.PI,pp,false);
      for(const dx of[-25.75,-8.9,8.9,25.75])B.get('house','Wall',pp).box(x+dx,y+3,zz,Math.abs(dx)>20?6.5:5.2,11,1,C.pale);
      if(side===-1)B.get('house','Wall',part).box(x,y+3,zz,11.2,11,1,C.pale);
      else{const door=B.get('house','Wood','front');door.box(x-5.8,y+.5,zz,1,14.5,1.5,C.red);door.box(x+5.8,y+.5,zz,1,14.5,1.5,C.red);door.box(x,y+15,zz,13,1,1.5,C.red);}
     }else{wall.box(x,y+.5,zz,w,3.2,.9,C.pale);wall.box(x,y+H-2,zz,w,2,.9,C.pale);for(let xx=-w/2;xx<=w/2;xx+=w/8)wood.box(x+xx,y+3.7,zz,.4,H-5.7,.8,C.wood);for(const yy of[5.4,H-3.6])wood.box(x,y+yy,zz,w,.22,.7,C.red);for(const dx of[-w*.4375,w*.4375])wall.box(x+dx,y+3.7,zz-side*.35,w*.115,H-5.7,.16,C.paper);}
    }
    for(const side of[-1,1]){wall.box(x+side*w/2,y+.5,z,1,H,d,C.pale);for(const zz of[-d*.32,d*.32]){wood.box(x+side*(w/2+.55),y+3,z+zz,.4,H-5,5,C.dark);for(let dz=-2;dz<=2;dz+=1)wood.box(x+side*(w/2+.83),y+3,z+zz+dz,.3,H-5,.15,C.red);}}
   }
   for(const dx of[-w/2,0,w/2])for(const dz of[-d/2,d/2]){B.get('house','Wood',part).box(x+dx,y,z+dz,1,H,1,C.red);s.box(x+dx,y,z+dz,1.5,.9,1.5,C.stone);}
   B.get('house','Wood',part).box(x,y+H-1,z+d/2,w+1,1,1.6,C.red);
   roof(B,x,z,y+H+1,w+13,d+12,k===0?6:7,far,'roof'+k);
   if(k>0){B.get('house','Wood','upper').box(x,y-.2,z,w+7,.7,d+7,C.wood);for(const side of[-1,1]){rail(B,[x-w/2-3,z+side*(d/2+3)],[x+w/2+3,z+side*(d/2+3)],y+.5,'upper');rail(B,[x+side*(w/2+3),z-d/2-3],[x+side*(w/2+3),z+d/2+3],y+.5,'upper');}}
  });
  // Side service annex, modest one-storey rooms rather than another main tower.
  const w=B.get('annex','Wall'),t=B.get('annex','Wood');w.box(84,25,-62,29,10,22,C.pale);t.box(84,25,-50.7,8,8,.6,C.dark);for(const xx of[70,98])t.box(xx,25,-50,1,11,1,C.red);roof(B,84,-62,36,35,28,5,far,'annexRoof');
  if(far)return;
  // The visible second-floor service stair has a bottom, a landing and a door opening.
  const st=B.get('stairs');for(let i=0;i<32;i++)st.box(65,25,-20-i*1.18,5.5,(i+1)*.80625,1.2,C.stone);st.box(62.6,50.5,-59,10,.9,6,C.stone);
  const floor=B.get('interior','Wood','interior');for(let x=5;x<61;x+=3)floor.box(x,28.31,-38,2.92,.14,39,C.wood);
  // Bookcases have individual shelves and restrained book colours.
  for(const x of[13,52]){const g=B.get('interior','Wood','interior');g.box(x,28.5,-56.6,13,11,1,C.wood);for(const dx of[-6.5,6.5])g.box(x+dx,28.5,-55.5,.5,11,3,C.red);
   for(let j=0;j<4;j++){g.box(x,29+j*2.8,-55.3,13,.4,3,C.red);for(let i=0;i<10;i++)B.get('interior','Paper','interior').box(x-5.5+i*1.13,29.5+j*2.8,-55.3,.9,1.4+(i%3)*.25,2.1,[C.paper,C.moss,C.red][i%3]);}
  }
  const props=B.get('interior','Wood','interior');props.box(33,32,-39,14,.7,9,C.red);for(const dx of[-5.7,5.7])for(const dz of[-3.2,3.2])props.box(33+dx,28.6,-39+dz,.7,3.4,.7,C.wood);
  for(const x of[23,43]){props.box(x,30,-29,5,.6,4,C.red);for(const dx of[-1.7,1.7])props.box(x+dx,28.5,-29,.5,1.5,3,C.wood);}
  const tea=B.get('interior','Paper','interior');oval(tea,34,33.6,-39,1.1,.9,.8,C.paper);tea.tube([34.8,33.5,-39],[35.7,34.2,-39],.25,C.paper,8,.15);ring(tea,33,33.65,-39,.9,.19,C.paper,true,24);for(const x of[30,38])oval(tea,x,33,-37,.48,.36,.48,C.paper,8,4);
  props.box(33,31,-57.1,8,10,.2,C.paper);ring(props,33,36,-56.85,2.5,.16,C.dark,true);props.box(33,41,-56.8,8.5,.45,.4,C.wood);props.box(33,31,-56.8,8.5,.45,.4,C.wood);
  for(const x of[8,58])B.get('interior','Lamp','interior').box(x,39,-34,1.5,2.1,1.5,C.paper);
  const sig=B.get('ritual','Ritual','ritual');ring(sig,33,28.51,-30,6.3,.1,C.gold);for(let i=0;i<8;i++){if(i===1)continue;const a=i*TAU/8,b=(i+3)*TAU/8;sig.tube([33+Math.cos(a)*5.8,28.54,-30+Math.sin(a)*5.8],[33+Math.cos(b)*5.8,28.54,-30+Math.sin(b)*5.8],.055,C.gold,4);}for(const [x,z]of[[25,-25],[41,-32],[39,-24]])B.get('ritual','Paper','ritual').box(x,28.5,z,2.2,.45,3,C.paper);

 }
 function tree(B,x,z,s,seed,far,pine=false){const R=G.rng(seed),y=h(x,z),g=B.get('trees','Wood','plants','both','vegetation'),le=B.get('trees','Leaf','plants','both','vegetation');
  g.tube([x,y,z],[x+s*.5,y+10*s,z],.65*s,C.bark,7,.28*s);const count=far?3:5;
  for(let i=0;i<count;i++){const a=i*2.4,dx=Math.cos(a)*(pine?3.8:3.2)*s,dz=Math.sin(a)*3.4*s,yy=y+(6.5+i*.95)*s;
   if(!far)g.tube([x,y+4*s,z],[x+dx,yy,z+dz],.30*s,C.bark,6,.12*s);
   oval(le,x+dx,yy+1.2*s,z+dz,(pine?4.8:3.9)*s,(pine?1.2:2.8)*s,3.2*s,i%2?C.light:C.leaf,far?6:10,far?3:5);
  }
 }
 // An overlapping ridge field gives saddles and shoulders rather than isolated cones.
 function mountains(g,far){
  const lobes=[[-630,-320,290,190,186,.25],[-470,-710,370,180,224,-.42],[-10,-920,420,210,186,.18],[560,-580,330,210,227,.78],[740,-85,260,360,145,.14],[-820,180,180,360,130,.3]];
  const height=(x,z)=>{let y=0;for(const[cx,cz,rx,rz,H,rot]of lobes){let dx=x-cx,dz=z-cz,xx=(dx*Math.cos(rot)+dz*Math.sin(rot))/rx,zz=(-dx*Math.sin(rot)+dz*Math.cos(rot))/rz;zz+=.16*Math.sin(xx*4.5+rot);let q=xx*xx+zz*zz;const ridge=Math.exp(-Math.pow(q,1.55))*(.79+.13*Math.sin(x/87+z/137)+.08*Math.cos(x/51-z/169));y+=H*ridge;}const valley=G.smooth(1.0,1.5,Math.hypot(x/390,z/550));return -25+(42+y)*valley;};
  const nx=far?36:112,nz=far?30:94,dx=3000/nx,dz=2400/nz;
  const point=(x,z)=>[x,height(x,z),z];
  const emit=p=>{const x=p[0],z=p[2],e=2,normal=G.norm([height(x-e,z)-height(x+e,z),e*2,height(x,z-e)-height(x,z+e)]);g.vertex(p,normal,G.blend(C.rock,C.pale,.14+.20*G.smooth(50,240,p[1])));};
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const x=-1500+i*dx,z=-1550+j*dz,a=point(x,z),b=point(x,z+dz),c=point(x+dx,z+dz),d=point(x+dx,z);for(const p of[a,b,c,a,c,d])emit(p);}
 }
 function scene(far=false){const B=bank(far),land=B.get('land','Grass','base','both','terrain'),N=far?28:92,size=1060;
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){let x=-size/2+i*size/N,z=-size/2+j*size/N,s=size/N;const a=[x,h(x,z),z],b=[x,h(x,z+s),z+s],c=[x+s,h(x+s,z+s),z+s],d=[x+s,h(x+s,z),z];const col=G.blend(C.grass,C.stone,1-G.smooth(10,30,Math.abs(x-river(z))));land.quad(a,b,c,d,col);}
  // Surrounding valley extends through fog, not a visible chopped rectangular exhibit.
  for(const side of[-1,1])land.quad([-4000,16,side*4000],[4000,16,side*4000],[530,24,side*530],[-530,24,side*530],C.grass);
  for(const side of[-1,1])land.quad([side*4000,16,-4000],[side*530,24,-530],[side*530,24,530],[side*4000,16,4000],C.grass);
  mountains(B.get('mountains','Rock','base','both','terrain'),far);
  const path=G.spline([[20,280],[28,200],[2,124],[31,69],[33,3]],far?15:4),pg=B.get('path','Paving');
  function pave(points,width=4){const rows=points.map((p,i)=>{const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],d=G.norm([b[0]-a[0],0,b[1]-a[1]]);return[-1,1].map(s=>{const x=p[0]+d[2]*width*s,z=p[1]-d[0]*width*s;return[x,h(x,z)+.32,z];});});for(let i=0;i<rows.length-1;i++)pg.quad(rows[i][0],rows[i+1][0],rows[i+1][1],rows[i][1],C.stone);}
  pave(path);pave(G.spline([[2,25],[-36,31],[-65,16],[-74,15]],5),3);pave(G.spline([[62,26],[97,22],[124,-30],[125,-60]],6),3);
  B.get('court','Paving').box(33,25,22,62,.35,44,C.stone);
  if(!far)for(let x=6;x<62;x+=7)for(let z=4;z<43;z+=7)B.get('court','Trim').box(x,25.36,z,6.5,.10,6.5,C.pale);
  house(B,far);
  const water=B.get('water','Water','water','both','effects'),segments=far?28:110;
  for(let i=0;i<segments;i++){const z=-530+i*1060/segments,z1=-530+(i+1)*1060/segments,x=river(z),x1=river(z1);water.quad([x-6,17,z],[x1-6,17,z1],[x1+6,17,z1],[x+6,17,z],C.water);}
  // Bridge deck and abutments meet both banks. No river wide-bridge world connection.
  const bridge=B.get('bridge'),deck=B.get('bridge','Wood');bridge.box(-148,18,15,12,6,15,C.stone);bridge.box(-76,18,15,12,6,15,C.stone);
  for(let i=0;i<25;i++){const x=-148+i*3,y=24+3*Math.sin(i/24*Math.PI);deck.box(x,y,15,3.05,.7,10,C.wood);if(!far)for(const z of[10,20])deck.box(x,y,z,.45,3.4,.45,C.wood);if(i<24){const y1=24+3*Math.sin((i+1)/24*Math.PI);for(const z of[10,20])deck.tube([x,y+3.5,z],[x+3,y1+3.5,z],.25,C.red,6);}}
  for(const z of[11,19])deck.tube([-150,23,z],[-74,23,z],.7,C.wood,8);
  const R=G.rng(260929);for(let i=0;i<120;i++){const x=(R()-.5)*580,z=(R()-.5)*580;
   if(Math.abs(x-river(z))<28||Math.abs(x-33)<90&&z>-112&&z<96||x>90&&x<165&&z>-140&&z<0||path.some(p=>Math.hypot(p[0]-x,p[1]-z)<14))continue;
   tree(B,x,z,.8+R()*.6,2000+i,far,i%3===0);
  }
  for(const [x,z]of[[-40,-56],[-46,-90],[-29,-106],[67,-121],[88,-133],[170,-117],[183,-69],[161,8]])tree(B,x,z,1.1,Math.round(x*x+z*z),far,true);
  // Open, uncaged bird-rest yard. Props are environmental designs, not NPC portraits.
  B.get('yard','Sand').box(125,25,-87,57,.35,52,C.stone);
  for(const x of[110,135]){const g=B.get('yard','Wood');for(const dx of[-5,5])g.tube([x+dx,25,-91],[x+dx,34,-91],.5,C.wood,7);g.tube([x-6,34,-91],[x+6,34,-91],.65,C.bark,8);
   if(!far){const bird=B.get('yard','Props','daily');oval(bird,x,36,-91,1.9,2.8,1.5,C.bird);oval(bird,x,38.4,-90.8,1,1.1,1,C.feather);bird.tri([x-.7,38.4,-89.9],[x,38,-88.8],[x+.7,38.4,-89.9],C.gold);for(const dx of[-.5,.5])bird.tube([x+dx,34,-90.7],[x+dx,35.7,-91],.18,C.gold,6);for(const dx of[-1.5,1.5])oval(bird,x+dx,35.9,-91.2,.7,2.3,1.3,C.wood);}
  }
  if(!far){const trough=B.get('yard','Stone');for(const x of[103,143]){trough.box(x,25.4,-73,9,.7,5,C.stone);for(const dx of[-4.5,4.5])trough.box(x+dx,26.1,-73,.6,1.2,5,C.pale);for(const dz of[-2.5,2.5])trough.box(x,26.1,-73+dz,9,1.2,.6,C.pale);}
  }
  // Flowers are small clustered five-petal forms, not random multi-colour noise.
  const flowers=B.get('garden','Flower','plants'),stems=B.get('garden','Leaf','plants');
  for(let i=0;i<(far?40:220);i++){const side=i%2?1:-1,x=33+side*(36+R()*13),z=-5+R()*56,y=h(x,z)+.4;
   if(far){oval(flowers,x,y+.7,z,.8,.4,.8,C.flower,5,3);continue;}
   stems.tube([x,y,z],[x+.1,y+1.3,z],.055,C.moss,4);
   for(let k=0;k<5;k++){const a=k*TAU/5;oval(flowers,x+Math.cos(a)*.35,y+1.35,z+Math.sin(a)*.35,.32,.15,.32,i%4===0?C.pink:C.flower,5,3);}
  }
  // Low mist bands share one clock. No repeated full-frame cloud texture.
  const mist=B.get('mist','Mist','mist','both','effects');for(let i=0;i<4;i++){const z=-120-i*100,y=32+i*6;mist.quad([-520,y,z],[520,y,z],[520,y+38,z],[-520,y+38,z],C.pale);}
  const out=B.finish({locations:['kasen_senkai','kasen_home'],versions:['manga','th155'],threeStoreys:true,realEntrances:false,path:path.map(([x,z])=>[x,h(x,z)+.5,z])});return out;
 }
 G.KASEN={version:'0.26.0',space,regions:[id],views,locations:{kasen_senkai:'kasenOverview',kasen_home:'kasenManor'},height:h};
 G.buildKasen=scene;G.buildKasenOverview=()=>scene(true);const old=G.buildRegion;
 G.buildRegion=async function(data,region,legacy){if(region!==id)return old(data,region,legacy);const t=performance.now(),p=scene();p.builtMs=performance.now()-t;return p;};
})(globalThis.GA);
