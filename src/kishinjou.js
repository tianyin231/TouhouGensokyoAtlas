/* Shining Needle Castle. TH145 three-tier exterior / TH14 inverted interior.
 * All dimensions, back elevations, rooms and the aerial anchor are P designs.
 * The castle is rotated by pi around X (determinant +1), NEVER negative-scaled.
 * No terrain construction, Three.js dependency or eager detail generation here.
 */
(function(G){
'use strict';
const ID='kishinjou', A=[1060,960,-1120];
const colors={plaster:'#e6e2d3',stone:'#8b9899',mortar:'#48545a',tile:'#495b68',tileEdge:'#526573',wood:'#463f39',beam:'#76624d',paper:'#ddc49b',gold:'#a78c57',tatami:'#9caa79',border:'#405b51',floor:'#85705a',dark:'#252e35'};
const C=Object.fromEntries(Object.entries(colors).map(([k,v])=>[k,G.rgb(v)]));
const point=p=>[A[0]+p[0],A[1]-p[1],A[2]-p[2]];
const contains=p=>Math.abs(p[0]-A[0])<130&&Math.abs(p[2]-A[2])<125&&p[1]>A[1]-140&&p[1]<A[1]+90;
const views={
 needleExterior:{label:'辉针城 · 云中逆城',eye:point([113,67,-137]),target:point([0,32,0])},
 needleApproach:{label:'空中来路',eye:point([228,25,-266]),target:point([0,35,0])},
 needleRear:{label:'背侧 · 石垣与连檐',eye:point([-106,42,120]),target:point([0,33,0])},
 needleFoundation:{label:'城基 · 向上的石垣',eye:point([80,-40,-93]),target:point([0,15,0])},
 needleEaves:{label:'望楼 · 瓦垄与破风',eye:point([39,72,-49]),target:point([0,54,0])},
 needleHall:{label:'逆向大殿',eye:point([9,21,-19]),target:point([-5,20,18]),interior:true},
 needleSection:{label:'大殿 · 可逆剖览',eye:point([72,17,-82]),target:point([0,22,0]),castleSection:true},
 needleStorm:{label:'魔力风暴 · 事件示意',eye:point([145,80,-158]),target:point([0,33,0]),castleStorm:true}
};
for(const p of Object.values(views))Object.assign(p,{region:ID,space:'surface',aerial:true});
Object.assign(G.PRESETS,views);
// Empty land polygon: the flying castle must not own/flatten the ground beneath.
const block={id:ID,name:'辉针城 · 幻想乡上空',aerial:true,poly:[],center:point([0,32,0]),bottom:886,step:2};
G.DIORAMA.blocks.push(block);G.DIORAMA.map.set(ID,block);G.REGION_LABELS[ID]=block.name;
Object.assign(G.IMPLEMENTED,{needle:'needleExterior',needle_storm:'needleStorm'});
G.KISHINJOU={id:ID,anchor:A,point,contains,views,exteriorVersion:'TH145',basis:'P',rotationDeterminant:1};

function buildKishinjou({overview=false}={}){
 const start=performance.now(),R=G.rng(140145),banks=new Map();
 const get=(zone,mat,part='body')=>{const key=zone+':'+mat+':'+part;if(!banks.has(key))banks.set(key,{g:new G.Geometry(),zone,mat,part});return banks.get(key).g.place();};
 const box=(zone,mat,x,y,z,w,h,d,col,part='body')=>get(zone,mat,part).box(x,y,z,w,h,d,col||C[mat]);
 const beam=(zone,a,b,r,col=C.wood,part='body',n=6)=>get(zone,'wood',part).tube(a,b,r,col,n);
 const quad=(g,a,b,c,d,col)=>g.quad(a,b,c,d,col);
 function shell(g,a,b,c,d,col,thickness=.55){
  quad(g,a,b,c,d,col);const low=p=>[p[0],p[1]-thickness,p[2]];
  quad(g,low(d),low(c),low(b),low(a),G.blend(col,C.wood,.35));
  quad(g,a,low(a),low(b),b,C.tileEdge);quad(g,d,c,low(c),low(d),C.tileEdge);
 }
 function foundation(){
  const dims=y=>[86-22*y/14,76-22*y/14];
  const base=get('foundation','stone'),ring=(y)=>{let[w,d]=dims(y);return[[-w/2,y,-d/2],[w/2,y,-d/2],[w/2,y,d/2],[-w/2,y,d/2]];};
  const lo=ring(0),hi=ring(14);
  quad(base,lo[3],lo[2],lo[1],lo[0],C.mortar);quad(base,hi[0],hi[1],hi[2],hi[3],C.mortar);
  for(let s=0;s<4;s++)quad(base,lo[s],lo[(s+1)%4],hi[(s+1)%4],hi[s],C.mortar);
  if(!overview){
   // Mortared, staggered courses on all four battered faces; small tonal range.
   const stone=get('foundation','stone','masonry');
   for(let s=0;s<4;s++)for(let row=0;row<7;row++){
    let y0=row*2+.10,y1=(row+1)*2-.10,r0=ring(y0),r1=ring(y1),count=s%2?13:15;
    for(let j=0;j<count;j++){
     const t0=Math.max(0,(j-(row%2)*.5)/count)+.002,t1=Math.min(1,(j+1-(row%2)*.5)/count)-.002;
     if(t1<=t0)continue;const at=(r,t)=>r[s].map((v,k)=>G.mix(v,r[(s+1)%4][k],t));
     const bump=p=>[p[0]+(s===1?.045:s===3?-.045:0),p[1],p[2]+(s===0?-.045:s===2?.045:0)];
     const a=bump(at(r0,t0)),b=bump(at(r0,t1)),c=bump(at(r1,t1)),d=bump(at(r1,t0));
     quad(stone,a,b,c,d,G.blend(C.stone,G.rgb('#a1a7a1'),R()*.27));
    }
    // Fill the staggered course's last half-stone; no exposed cracks at corners.
    if(row%2){let t=(count-.5)/count,a=r0[s].map((v,k)=>G.mix(v,r0[(s+1)%4][k],t)),d=r1[s].map((v,k)=>G.mix(v,r1[(s+1)%4][k],t));const bump=p=>[p[0]+(s===1?.045:s===3?-.045:0),p[1],p[2]+(s===0?-.045:s===2?.045:0)];quad(stone,bump(a),bump(r0[(s+1)%4]),bump(r1[(s+1)%4]),bump(d),C.stone);}
   }
  }
  box('foundation','stone',0,13.75,0,65,.55,55,C.stone);
  // The upward-facing exposed foundation is stone, NOT TH155's extra hill.
  box('foundation','stone',0,-.38,0,86,.4,76,G.blend(C.stone,C.mortar,.25));
 }
 function wall(zone,w,d,y,h,side){
  const open=zone==='hall';
  // Work in a local face frame, then rotate into place; real window openings.
  const angle=side*Math.PI/2,faceDepth=side%2?w:d,faceWidth=side%2?d:w;
  const face=(mat,part)=>get(zone,mat,part).place(0,0,0,angle);
  const part=[1,2].includes(side)?'front':'walls';
  const wg=face('wood',part),pg=face('plaster',part),n=zone==='lookout'?4:zone==='upper'?6:8,step=faceWidth/n;
  for(let i=0;i<n;i++){
   const x=-faceWidth/2+(i+.5)*step,portal=open&&side===2&&(i===n/2-1||i===n/2);
   const sill=portal?0:4.3,winTop=portal?h-2.2:Math.min(h-2.4,8.5),winWidth=step*.48;
   if(sill>0){wg.box(x,y,faceDepth/2,step,.95,1,C.wood);pg.box(x,y+.95,faceDepth/2,step,sill-.95,.9,C.plaster);}
   pg.box(x,y+winTop,faceDepth/2,step,h-winTop,.9,C.plaster);
   wg.box(x-step/2,y,faceDepth/2,overview?.35:.50,h,1.1,C.wood);
   if(!portal){
    const jamb=(step-winWidth)/2;
    for(const side of[-1,1])pg.box(x+side*(winWidth+jamb)/2,y+sill,faceDepth/2,jamb,winTop-sill,.9,C.plaster);
    wg.box(x,y+sill,faceDepth/2,winWidth+.3,.25,1.3,C.wood);
    wg.box(x,y+winTop-.18,faceDepth/2,winWidth+.3,.25,1.2,C.wood);
    if(!overview){
     const closed=(i+side)%3===0;
     if(closed)face('paper',part).box(x,y+sill+.2,faceDepth/2-.22,winWidth-.22,winTop-sill-.45,.12,C.paper);
     const lg=face('wood',part);for(let u=-1;u<=1;u++)lg.box(x+u*winWidth*.30,y+sill+.22,faceDepth/2+.1,.10,winTop-sill-.45,.16,C.wood);
     for(let v=1;v<=2;v++)lg.box(x,y+sill+(winTop-sill)*v/3,faceDepth/2+.10,winWidth-.2,.09,.16,C.wood);
     // Weatherboard apron and recessed reveals, rather than painted-on windows.
     for(let k=0;k<3;k++)lg.box(x,y+.4+k*.78,faceDepth/2+.52,step-.5,.11,.10,C.beam);
    }
   }
  }
  wg.box(faceWidth/2,y,faceDepth/2,.5,h,1.1,C.wood);
  wg.box(0,y+h-.32,faceDepth/2,faceWidth+1,.38,1.4,C.wood);
  if(!overview)for(let x=-faceWidth/2;x<=faceWidth/2+.1;x+=3.2)wg.box(x,y+h-.85,faceDepth/2+.55,.45,.55,1.4,C.beam);
 }
 function roof(zone,w,d,y,rise){
  const mat=get(zone,'tile','roof'),edge=get(zone,'tileEdge','roof'),steps=overview?2:7;
  const ring=t=>{const X=G.mix(w*.34,w/2,t),Z=G.mix(d*.30,d/2,t),Y=y+rise*.42*Math.pow(1-t,1.4)+.60*Math.pow(t,7);return[[-X,Y,-Z],[X,Y,-Z],[X,Y,Z],[-X,Y,Z]];};
  for(let j=0;j<steps;j++){const a=ring(j/steps),b=ring((j+1)/steps);for(let s=0;s<4;s++)shell(mat,a[s],a[(s+1)%4],b[(s+1)%4],b[s],C.tile);}
  const a=w*.34,b=d*.30,Y=y+rise*.42,top=y+rise;
  shell(mat,[-a,Y,-b],[-a,top,0],[a,top,0],[a,Y,-b],C.tile);
  shell(mat,[a,Y,b],[a,top,0],[-a,top,0],[-a,Y,b],C.tile);
  // Two full gable ends (kirizuma) with white infill and deep timber fascia.
  for(const side of[-1,1]){
   const x=side*a,pg=get(zone,'plaster','roof');pg.tri([x,Y,-b],[x,top,0],[x,Y,b],C.plaster);
   for(const s of[-1,1])beam(zone,[x,Y,s*b],[x,top,0],.42,C.wood,'roof');
   if(!overview){beam(zone,[x,Y+.25,-b],[x,Y+.25,b],.24,C.wood,'roof');for(let k=-2;k<=2;k++)beam(zone,[x,Y+.35,k*b/4],[x,top-Math.abs(k)*rise*.14-.6,k*b/4],.14,C.wood,'roof');}
  }
  // Longitudinal tile caps. Every rib follows the actual roof curve.
  if(!overview){
   for(let s=0;s<4;s++)for(let u=0;u<=1.0001;u+=1/(s%2?20:26)){
    let prev;for(let j=0;j<=steps;j++){const r=ring(j/steps),p=r[s].map((v,k)=>G.mix(v,r[(s+1)%4][k],u));p[1]+=.10;if(prev)edge.tube(prev,p,.12,C.tileEdge,5);prev=p;}
   }
   for(let x=-a;x<=a+.01;x+=1.28)for(const s of[-1,1])edge.tube([x,Y+.1,s*b],[x,top+.1,0],.11,C.tileEdge,5);
   // Timber underside, independent from the tiled upper skin.
   const rg=get(zone,'wood','roof');for(let x=-w/2+2;x<w/2;x+=2.3)for(const s of[-1,1])rg.tube([x*.72,y+rise*.35-.65,s*d*.29],[x,y-.18,s*(d/2-.3)],.15,C.beam,5);
  }
  edge.tube([-a-.7,top+.25,0],[a+.7,top+.25,0],.47,C.tileEdge,7);
  // Modest ridge-end metalwork; no invented tower of needles.
  if(!overview)for(const s of[-1,1]){const g=get(zone,'gold','roof');g.tube([s*a,top+.4,0],[s*(a+1),top+1.4,0],.25,C.gold,6,.14);g.tri([s*(a+.3),top+1,0],[s*(a+1.2),top+2.1,0],[s*(a-.4),top+1.8,0],C.gold);}
  // A restrained central chidori gable on each long face, not an extra storey.
  if(zone!=='lookout')for(const s of[-1,1]){
   const z=s*d*.415,W=w*.15,base=y+1.25,peak=y+rise*.69;
   const g=get(zone,'plaster','roof');g.tri([-W,base,z],[0,peak,z],[W,base,z],C.plaster);
   beam(zone,[-W,base,z],[0,peak,z],.42,C.wood,'roof');beam(zone,[0,peak,z],[W,base,z],.42,C.wood,'roof');
   const gg=get(zone,'tile','roof');shell(gg,[-W,base+.18,z],[0,peak+.25,z],[0,peak+.25,z-s*2.4],[-W,base+.18,z-s*2.4],C.tile,.3);shell(gg,[0,peak+.25,z],[W,base+.18,z],[W,base+.18,z-s*2.4],[0,peak+.25,z-s*2.4],C.tile,.3);
  }
 }
 function balcony(){
  const y=48,w=32,d=29;box('lookout','wood',0,y-.3,0,w,.55,d,C.wood);
  // Rails follow the inverted architecture, not world gravity.
  for(let side=0;side<4;side++){
   const g=get('lookout','wood','balcony').place(0,0,0,side*Math.PI/2),W=side%2?d:w,D=side%2?w:d;
   for(let x=-W/2;x<=W/2+.01;x+=W/10)g.box(x,y,D/2,.25,2.4,.25,C.wood);
   for(const h of[.75,2.1])g.box(0,y+h,D/2,W+.3,.23,.35,C.wood);
  }
 }
 function interior(){
  // An actual room within the largest storey. Overhead tatami; ceiling beneath.
  const y=14.6,g=get('hall','tatami','interior');
  for(let x=-28;x<28;x+=7)for(let z=-21;z<21;z+=7){g.box(x+3.5,y,z+3.5,6.9,.18,6.9,C.border);g.box(x+3.5,y+.18,z+3.5,6.5,.11,6.75,G.blend(C.tatami,G.rgb('#c2bc8e'),((x+28)/7%2)*.12));}
  const timber=get('hall','wood','interior');
  // Ceiling boards are the usable lower plane in world coordinates.
  for(let z=-25;z<26;z+=2)timber.box(0,27.65,z,62,.28,1.94,C.floor);
  for(let x=-27;x<=27;x+=9){timber.box(x,26.7,0,.8,.85,52,C.beam);for(const z of[-22,22])timber.box(x,14.4,z,.8,13.1,.8,C.wood);}
  for(const z of[-22,0,22])timber.box(0,26.6,z,60,.8,.7,C.beam);
  // Open circulation from the entrance through the middle to rear windows.
  for(const side of[-1,1]){
   const x=side*20;box('hall','wood',x,14.9,12,6.5,1.2,3,C.wood,'interior');
   for(let i=0;i<5;i++)box('hall','paper',x-2.4+i*1.1,16.1,12,.8,.35,2,C.paper,'interior');
   box('hall','wood',x,14.9,-13,6,.6,4,C.beam,'interior');
  }
  // Framed washi lanterns are fixed to beams, not an unexplained particle swarm.
  for(const x of[-15,15])for(const z of[-14,14]){
   box('hall','paper',x,23.3,z,1.7,2.4,1.7,C.paper,'interior');
   for(const h of[23.2,25.6])box('hall','wood',x,h,z,2,.18,2,C.wood,'interior');beam('hall',[x,25.8,z],[x,27.4,z],.08,C.wood,'interior');
  }
 }
 function storm(){
  // Local, optional TH14 event illustration; no global sky or weather mutation.
  const g=get('air','Mist','storm');
  for(let band=0;band<4;band++)for(let i=0;i<68;i++){
   const p=(j,v)=>{const t=j/68,a=t*Math.PI*1.7+band*1.9,r=62+band*10+v*6+Math.sin(t*12+band)*2;return[Math.cos(a)*r,26+band*9+Math.sin(a*1.8)*10+v*2,Math.sin(a)*r];};
   const q=[p(i,-1),p(i+1,-1),p(i+1,1),p(i,1)];
   // Color is a UV/phase attribute for this shader, deliberately not sRGB.
   const emit=(ids)=>{for(const j of ids)g.vertex(q[j],[0,1,0],[(i+(j===1||j===2?1:0))/68,j>1?1:0,band/4]);};emit([0,1,2]);emit([0,2,3]);
  }
 }
 foundation();
 for(const [zone,w,d,y,h,W,D,roofY,rise] of[
  ['hall',64,54,14.3,13.7,78,68,28,11],
  ['upper',44,38,31.5,12.5,59,53,44,9],
  ['lookout',26,23,48,11.5,39,35,59.5,8.5]
 ]){for(let s=0;s<4;s++)wall(zone,w,d,y,h,s);roof(zone,W,D,roofY,rise);if(zone!=='hall')box(zone,'wood',0,y-.3,0,w,.55,d,C.wood);}
 balcony();if(!overview){interior();storm();}
 const meshes=[];
 for(const [key,v]of banks){if(!v.g.a.length)continue;const m=v.g.mesh(ID+':'+(overview?'far:':'detail:')+key,'architecture',{owner:ID,region:ID,space:'surface',material:'kishin'+v.mat[0].toUpperCase()+v.mat.slice(1),overview,castleZone:v.zone,castlePart:v.part,basis:'P'});
  // Bake a proper rigid rotation into positions AND normals, keeping winding.
  const a=m.vertices;for(let i=0;i<a.length;i+=9){a[i]+=A[0];a[i+1]=A[1]-a[i+1];a[i+2]=A[2]-a[i+2];a[i+4]*=-1;a[i+5]*=-1;}
  m.center=point(m.center);if(v.part==='storm'){m.group='effects';m.radius+=8;}
  meshes.push(m);
 }
 return{id:ID,meshes,signs:[],bytes:meshes.reduce((s,m)=>s+m.vertices.byteLength,0),builtMs:performance.now()-start,source:'kishinjou-procedural-TH145-P',meta:{basis:'P',version:'0.18.0',overview,exteriorVersion:'TH145',storeys:3,anchor:A,rotationDeterminant:1,locations:['needle','needle_storm'],access:'aerial; no terrestrial road',interior:'TH14 motif; room layout P',surfaceCut:false}};
}
const prior=G.buildRegion;
G.buildRegion=async(data,id,legacy)=>id===ID?buildKishinjou():prior(data,id,legacy);
G.buildKishinjou=buildKishinjou;
// A small, independently generated overview supplement; never calls detail mode.
G.buildKishinjouOverview=()=>buildKishinjou({overview:true});
})(globalThis.GA);
