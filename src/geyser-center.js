/* Underground Geyser Center. TH12.3 dialogue = T; manga exterior summary = C.
 * Exterior and selected shaft are separate authored charts. All dimensions,
 * hidden faces, machinery and engineering coordinates are P, not a survey.
 * Original spring, old-hell reactor, lift frame and terrain are not replaced.
 */
(function (G) {
'use strict';
const ID='geyser_center', SPACE='geyser_center_inside', TAU=Math.PI*2;
const X=-1306, Z=-409, R=8, bounds=[-1350,-445,-1200,-365];
const C=Object.fromEntries(Object.entries({
 concrete:'#b7baa9', edge:'#d0d1ba', base:'#747e76', dark:'#384e49',
 iron:'#516a66', trim:'#859b8c', brass:'#9f9570', roof:'#6e8980',
 wood:'#80705a', paper:'#d8d9b8', green:'#91c99b', glass:'#426660',
 rock:'#66776a', rockLight:'#8c9a80', ground:'#969987', wire:'#8d8670'
}).map(([k,v])=>[k,G.rgb(v)]));
const approach=G.spline([[-1228,-423.5],[-1254,-413],[-1270,-404],[-1270,-379],[-1275,-372],[-1294,-373],[-1306,-377]],1.25);
const innerPath=G.spline([[X,Z+32],[X,Z+25]],1.1);
const view=(label,eye,target,extra={})=>({label,eye,target,fov:54,region:ID,space:SPACE,
 era:'TH12.3通道／智灵奇传地面参考 · 本作P选景',...extra,
 ...(extra.space==='surface'?{detailNeighbors:['forest','geyser_mountain'],requiredRegions:[ID,'forest','geyser_mountain']}: {})});
const views={
 centerOverview:view('间歇泉中心 · 地表圆筒塔',[-1348,186,-341],[-1303,128,-409],{space:'surface',fov:47}),
 centerEntrance:view('中心入口 · 低屋与开门',[-1300,127,-375],[-1306,123,-395],{space:'surface'}),
 centerRear:view('圆筒塔背面 · 锚索与墙基',[-1277,148,-454],[-1306,131,-411],{space:'surface'}),
 centerFoot:view('入口低角 · 柱脚与台阶',[-1320,123,-382],[-1310,120,-395],{space:'surface',fov:56}),
 centerConnection:view('泉区支路 · 原泉群保持',[-1233,151,-346],[-1278,119,-409],{space:'surface',fov:52}),
 centerLobby:view('地下中心 · 入口廊与井口',[0,3.2,38],[0,1.5,7],{fov:62}),
 centerShaft:view('绿灯井道 · 上端升降平台',[10,7,10],[0,-2,0],{fov:61}),
 centerGallery:view('检视廊 · 承托与仪表',[0,3.2,36],[-6.7,2.1,28],{fov:63}),
 centerLower:view('井道下段 · 平台状态',[-13,-19,11],[0,-26,0],{centerCarY:-28,fov:63}),
 centerClosed:view('井口盖板 · 闭合检视',[10,7,10],[0,0,0],{centerLid:true,fov:61}),
 centerSection:view('中心剖览 · 底板与厚壁',[63,51,69],[0,-8,4],{centerCut:true,fov:48}),
 centerShell:view('地下外壳 · 背侧与底基',[-58,-11,-62],[0,-15,0],{centerShell:true,fov:51})
};
const block={id:ID,name:'间歇泉地下中心',space:SPACE,independent:true,poly:[],center:[0,-12,8],bottom:-44,step:4};
G.DIORAMA.blocks.push(block);G.DIORAMA.map.set(ID,block);G.REGION_LABELS[ID]=block.name;
Object.assign(G.PRESETS,views);G.IMPLEMENTED[ID]='centerOverview';G.LANDMARKS.partial.add(ID);
G.EXTRA_REGION_DEFAULTS={...G.EXTRA_REGION_DEFAULTS,[ID]:'centerOverview'};
G.EXTRA_REGION_CONTEXT={...G.EXTRA_REGION_CONTEXT,[ID]:['forest','geyser_mountain']};
for(const key of ['transform','point','inverse']){
 const old=G.DIORAMA[key];G.DIORAMA[key]=key==='transform'?
 ((id,...args)=>id===ID?{scale:1,offset:[0,0,0]}:old(id,...args)):
 ((p,id,...args)=>id===ID?[...p]:old(p,id,...args));
}
const oldOwner=G.DIORAMA.owner;
G.DIORAMA.owner=(x,z)=>Math.hypot((x-X)/23,(z-Z-8)/29)<1?ID:oldOwner(x,z);

function bank(far){
 const map=new Map();
 return {
  get(scene,mat,part='body',zone='0'){
   const key=[scene,mat,part,zone].join(':');
   if(!map.has(key))map.set(key,{g:new G.Geometry(),scene,mat,part,zone});
   return map.get(key).g.place();
  },
  finish(meta){
   const meshes=[];
   for(const [key,b] of map)if(b.g.a.length)meshes.push(b.g.mesh(`${ID}:${far?'far':'near'}:${key}`,
    b.mat==='Lamp'?'effects':'architecture',{owner:ID,region:ID,space:b.scene==='surface'?'surface':SPACE,
    overview:far,material:'center'+b.mat,centerPart:b.part,centerZone:b.zone,centerScene:b.scene,basis:'P'}));
   return {id:ID,meshes,bytes:meshes.reduce((sum,m)=>sum+m.vertices.byteLength,0),signs:[],meta};
  }
 };
}
function beam(g,a,b,r,color=C.iron,n=6){if(G.length(G.sub(a,b))>1e-6)g.tube(a,b,r,color,n);}
function ring(g,x,y,z,r,t,color,n=32,start=0,end=TAU){
 for(let i=0;i<n;i++){const a=start+(end-start)*i/n,b=start+(end-start)*(i+1)/n;
  beam(g,[x+Math.cos(a)*r,y,z+Math.sin(a)*r],[x+Math.cos(b)*r,y,z+Math.sin(b)*r],t,color,5);}
}
function cylinder(g,x,y,z,r,h,color,n=40){
 for(let i=0;i<n;i++){const a=i*TAU/n,b=(i+1)*TAU/n;
  const P=(angle,Y)=>[x+r*Math.cos(angle),Y,z+r*Math.sin(angle)],A=P(a,y),B=P(b,y),D=P(a,y+h),E=P(b,y+h);
  for(const [p,ang]of [[A,a],[D,a],[E,b],[A,a],[E,b],[B,b]])g.vertex(p,[Math.cos(ang),0,Math.sin(ang)],color);
  g.tri([x,y+h,z],E,D,color);g.tri([x,y,z],A,B,color);
 }
}
function annulus(g,x,y,z,inner,outer,thick,color,n=48,start=0,end=TAU){
 const P=(a,r,Y)=>[x+Math.cos(a)*r,Y,z+Math.sin(a)*r];
 for(let i=0;i<n;i++){const a=start+(end-start)*i/n,b=start+(end-start)*(i+1)/n;
  g.quad(P(a,inner,y),P(b,inner,y),P(b,outer,y),P(a,outer,y),color);
  g.quad(P(a,outer,y-thick),P(b,outer,y-thick),P(b,inner,y-thick),P(a,inner,y-thick),color);
  for(const r of [inner,outer])g.quad(P(a,r,y-thick),P(a,r,y),P(b,r,y),P(b,r,y-thick),color);
 }
 if(end-start<TAU-.001)for(const a of[start,end])g.quad(P(a,inner,y-thick),P(a,outer,y-thick),P(a,outer,y),P(a,inner,y),color);
}
function shell(g,x,z,r,y,h,thickness,color,n,start=0,end=TAU,rough=false){
 const point=(a,Y,out)=>{const radius=r+(out?thickness:0)+(rough?.36*Math.sin(a*7+Y*.12)+.17*Math.sin(a*13-Y*.25):0);
  return[x+radius*Math.cos(a),Y,z+radius*Math.sin(a)];};
 for(let i=0;i<n;i++){const a=start+(end-start)*i/n,b=start+(end-start)*(i+1)/n;
  for(const out of[false,true]){const normal=angle=>[(out?1:-1)*Math.cos(angle),0,(out?1:-1)*Math.sin(angle)];
   const corners=out?[[a,y],[a,y+h],[b,y+h],[a,y],[b,y+h],[b,y]]:[[a,y],[b,y+h],[a,y+h],[a,y],[b,y],[b,y+h]];
   for(const [angle,Y]of corners)g.vertex(point(angle,Y,out),normal(angle),color);}
  for(const Y of[y,y+h])g.quad(point(a,Y,false),point(b,Y,false),point(b,Y,true),point(a,Y,true),color);
 }
 if(end-start<TAU-.001)for(const a of[start,end])g.quad(point(a,y,false),point(a,y,true),point(a,y+h,true),point(a,y+h,false),color);
}
function railing(g,a,b,height=1.25,omit=false){
 if(omit)return;for(const y of[.55,height])beam(g,[a[0],a[1]+y,a[2]],[b[0],b[1]+y,b[2]],.055,C.trim,5);
 const n=Math.max(1,Math.ceil(G.length(G.sub(a,b))/2.6));
 for(let i=0;i<=n;i++){const p=a.map((v,k)=>G.mix(v,b[k],i/n));beam(g,p,[p[0],p[1]+height+.06,p[2]],.065,C.iron,5);}
}
function supportHeight(data){
 const n=G.SurfaceContact.sampler(data,ID),f=G.SurfaceContact.sampler(data,ID,'far'),foot=[];
 for(let i=0;i<24;i++)foot.push([X+9*Math.cos(i*TAU/24),Z+9*Math.sin(i*TAU/24)]);
 for(const x of[-7,7])for(const z of[8,20])foot.push([X+x,Z+z]);
 const top=Math.max(...foot.flatMap(([x,z])=>[n.height(x,z),f.height(x,z)]))+.36;
 return {n,f,foot,top};
}
function surface(B,data,far){
 const {n,f,foot,top}=supportHeight(data),t=far?f:n,N=far?24:48;
 const base=B.get('surface','Stone','foundation'),body=B.get('surface','Concrete','tower'),metal=B.get('surface','Metal','bands');
 const bottom=Math.min(...foot.flatMap(([x,z])=>[n.height(x,z),f.height(x,z)]))-.7;
 cylinder(base,X,bottom,Z,8.85,top-bottom,C.base,N);
 annulus(base,X,top+.16,Z,7.6,9.1,.28,C.edge,N);
 // Genuine opening into the cylinder, not a dark rectangle painted on its front.
 const lo=Math.PI/2-.30,hi=Math.PI/2+.30;
 shell(body,X,Z,R,top+.16,4.65,.42,C.concrete,N,hi,TAU+lo);
 shell(body,X,Z,R,top+4.81,23.19,.42,C.concrete,N);
 for(const y of[1,7,14,21,28])ring(metal,X,top+y,Z,8.47,.10,C.trim,N);
 if(!far)for(let i=0;i<12;i++){const a=i*TAU/12;beam(metal,[X+8.44*Math.cos(a),top+5,Z+8.44*Math.sin(a)],
  [X+8.44*Math.cos(a),top+27.8,Z+8.44*Math.sin(a)],.026,C.base,4);}
 const cap=B.get('surface','Metal','roof','tower');cylinder(cap,X,top+28,Z,8.7,.35,C.roof,N);
 annulus(cap,X,top+28.52,Z,8.05,8.65,.18,C.edge,N);
 // C summary: guyed round tower. Individual fittings and anchors are P.
 const cable=B.get('surface','Cable','guys'),anchors=[];
 for(const a of[-2.65,-1.2,.05,2.5]){
  const x=X+21*Math.cos(a),z=Z+21*Math.sin(a),y=Math.min(n.height(x,z),f.height(x,z))-.45;
  base.box(x,y,z,1.65,1.1,1.65,C.base);base.box(x,y+1.1,z,1.85,.16,1.85,C.edge);
  const A=[x,y+1.5,z],T=[X+8.45*Math.cos(a),top+23.4,Z+8.45*Math.sin(a)];
  beam(cable,A,T,.055,C.wire,far?4:6);beam(metal,[x,y+1.14,z],A,.12,C.iron,6);anchors.push({bottom:[x,y,z],top:A,tower:T});
 }
 // Low entrance house: front/back openings and a recessed side window.
 const house=B.get('surface','Concrete','house'),frame=B.get('surface','Metal','house'),floor=B.get('surface','Stone','house-floor');
 floor.box(X,bottom,Z+14,14.6,top+.18-bottom,12.6,C.base);floor.box(X,top+.18,Z+14,14.3,.15,12.3,C.edge);
 const y=top+.33,front=Z+20,back=Z+8;
 for(const z of[front,back]){for(const side of[-1,1])house.box(X+side*4.55,y,z,4.9,5.3,.42,C.concrete);
  house.box(X,y+4.55,z,4.2,.75,.42,C.concrete);}
 house.box(X-7,y,Z+14,.42,5.3,12,C.concrete);
 // East window aperture (no hidden solid wall behind the glass).
 for(const z of[Z+9.25,Z+18.75])house.box(X+7,y,z,.42,5.3,2.5,C.concrete);
 house.box(X+7,y,Z+14,.42,1.65,7,C.concrete);house.box(X+7,y+3.75,Z+14,.42,1.55,7,C.concrete);
 const glass=B.get('surface','Glass','window');glass.box(X+6.85,y+1.78,Z+14,.10,1.85,6.7,C.glass);
 for(const z of[Z+10.5,Z+12.8,Z+15.2,Z+17.5])frame.box(X+7.23,y+1.65,z,.18,2.1,.10,C.trim);
 for(const Y of[y+1.65,y+3.66])frame.box(X+7.23,Y,Z+14,.20,.12,7.1,C.trim);
 for(const side of[-1,1])frame.box(X+side*2.17,y,front+.23,.22,4.58,.45,C.trim);
 frame.box(X,y+4.48,front+.2,4.56,.18,.46,C.trim);
 // Retracted door leaf is next to the open door, not in the passage.
 frame.box(X-4.6,y+.05,front+.33,4.05,4.20,.16,C.roof);
 if(!far)for(let k=0;k<9;k++)frame.box(X-6.3+k*.4,y+.2,front+.44,.055,3.9,.04,C.trim);
 const roof=B.get('surface','Metal','roof','house');
 const a=[X-7.6,y+5.36,back-.5],b=[X+7.6,y+5.36,back-.5],c=[X+7.6,y+5.65,front+.7],d=[X-7.6,y+5.65,front+.7];
 roof.quad(a,b,c,d,C.roof);roof.quad(a.map((v,i)=>v-(i===1?.28:0)),d.map((v,i)=>v-(i===1?.28:0)),c.map((v,i)=>v-(i===1?.28:0)),b.map((v,i)=>v-(i===1?.28:0)),C.dark);
 for(const[p,q]of[[a,b],[b,c],[c,d],[d,a]])roof.quad(p,q,q.map((v,i)=>v-(i===1?.28:0)),p.map((v,i)=>v-(i===1?.28:0)),C.trim);
 if(!far)for(let x=X-7;x<=X+7;x+=1.4)beam(roof,[x,y+5.38,back-.5],[x,y+5.67,front+.7],.043,C.trim,4);
 // Supported front stairs; keep maximum riser below .26 in near and far terrain.
 const steps=[],end=Z+25,groundTop=Math.max(n.height(X,end),f.height(X,end))+.13,level=y;
 const count=Math.max(4,Math.ceil((level-groundTop)/.24));
 for(let i=0;i<count;i++){
  const z=front+.55+(end-front-.55)*i/(count-1),Y=G.mix(level,groundTop,(i+1)/count),bot=Math.min(n.height(X,z),f.height(X,z))-.4;
  base.box(X,bot,z,4.1,Y-bot,(end-front)/(count-1)+.10,C.base);steps.push([X,Y,z]);
 }
 // Low compound wall follows the ground instead of creating a level pedestal.
 const wall=B.get('surface','Stone','boundary'),gate=B.get('surface','Metal','gate');
 const walls=[[[X-23,Z-26],[X+23,Z-26]],[[X-23,Z-26],[X-23,Z+32]],[[X+23,Z-26],[X+23,Z+32]],[[X-23,Z+32],[X-3.1,Z+32]],[[X+3.1,Z+32],[X+23,Z+32]]];
 // Continuous sloped caps, not a saw-tooth stack of level boxes.
 for(const[a,b]of walls){const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),N=Math.ceil(len/2.5),nx=-dz/len,nz=dx/len;
  const P=(u,w,h)=>{const x=G.mix(a[0],b[0],u),z=G.mix(a[1],b[1],u);return[x+nx*w,t.height(x,z)+h,z+nz*w];};
  for(let i=0;i<N;i++){const u=i/N,v=(i+1)/N;
   for(const w of[-.2,.2])wall.quad(P(u,w,-.5),P(v,w,-.5),P(v,w,1.35),P(u,w,1.35),C.base);
   wall.quad(P(u,-.29,1.49),P(v,-.29,1.49),P(v,.29,1.49),P(u,.29,1.49),C.edge);
   for(const w of[-.29,.29])wall.quad(P(u,w,1.32),P(v,w,1.32),P(v,w,1.49),P(u,w,1.49),C.edge);
  }
  for(const u of[0,1])wall.quad(P(u,-.2,-.5),P(u,.2,-.5),P(u,.2,1.49),P(u,-.2,1.49),C.base);
 }
 const gateY=Math.max(n.height(X,Z+32),f.height(X,Z+32));
 for(const x of[X-3.1,X+3.1])gate.box(x,gateY-.2,Z+32,.35,2.7,.42,C.iron);
 // Gate slides to the left, leaving the central six-metre route open.
 gate.box(X-6.2,gateY+.06,Z+32.35,5.9,.18,.20,C.iron);gate.box(X-6.2,gateY+2.06,Z+32.35,5.9,.18,.20,C.iron);
 for(let x=X-9.1;x<X-3.25;x+=.45)gate.box(x,gateY+.1,Z+32.35,.065,2,.09,C.trim);
 return {top,bottom,foundationSamples:foot,anchors,steps,front,entryFloor:y,gate:[X,gateY,Z+32],fullTerrainExcavation:false};
}
function gauge(g,x,y,z,far){
 // Vertical analogue dial and needle. No invented readable labels or screens.
 g.place(x,y,z);g.tube([0,0,-.13],[0,0,.09],.42,C.iron,far?12:24);
 g.tube([0,0,.10],[0,0,.12],.32,C.paper,far?12:24);
 beam(g,[0,0,.15],[.19,.16,.15],.018,C.dark,4);g.place();
}
function underground(B,far){
 const N=far?16:64,inner=17.5,wall=B.get('inside','Rock','wall'),outer=B.get('inside','Rock','outer'),floor=B.get('inside','Stone','floor'),metal=B.get('inside','Metal','structure');
 // Rock cylinder has a real aperture toward the entry hall; shaft floor is open.
 for(let j=0;j<12;j++){
  const y=-40+j*4.5,top=y+4.5,opening=top>-.5&&y<7.5;
  shell(wall,0,0,inner,y,4.5,1.8,C.rock,N,opening?Math.PI/2+.26:0,opening?TAU+Math.PI/2-.26:TAU,true);
 }
 shell(outer,0,0,inner+1.9,-41,56,1.3,C.base,N);
 const roof=B.get('inside','Stone','roof');cylinder(roof,0,14,0,20.7,1.5,C.base,N);
 annulus(floor,0,.10,0,5.2,17.55,1.15,C.base,N);
 annulus(floor,0,-28,0,6.2,17.55,1.3,C.base,N);
 cylinder(floor,0,-42,0,20.7,1.2,C.dark,N);
 // Collar reveals and inset seams give the walking ring a physical thickness.
 annulus(metal,0,.18,0,5.2,5.55,.12,C.trim,N);annulus(metal,0,.16,0,16.9,17.25,.12,C.trim,N);
 const rail=B.get('inside','Metal','rails');
 for(let i=0,n=far?16:32;i<n;i++){
  const a=i*TAU/n,b=(i+1)*TAU/n;
  if(Math.abs(Math.atan2(Math.sin(a-Math.PI/2),Math.cos(a-Math.PI/2)))<.5)continue;
  railing(rail,[Math.cos(a)*5.8,.12,Math.sin(a)*5.8],[Math.cos(b)*5.8,.12,Math.sin(b)*5.8]);
 }
 // A narrow supported bridge connects the collar to the actual car deck.
 metal.box(0,-.48,4.3,3.6,.55,3.0,C.iron);
 for(const s of[-1,1])railing(rail,[s*1.7,.1,3],[s*1.7,.1,5.9]);
 // Lower landing is a supported continuation, not an unreachable floating car.
 metal.box(0,-28.5,4.8,3.6,.55,4.0,C.iron);
 for(const side of[-1,1])railing(rail,[side*1.7,-27.95,3],[side*1.7,-27.95,6.8]);
 for(let i=0,n=far?16:32;i<n;i++){const a=i*TAU/n,b=(i+1)*TAU/n;
  if(Math.abs(Math.atan2(Math.sin(a-Math.PI/2),Math.cos(a-Math.PI/2)))<.5)continue;
  railing(rail,[Math.cos(a)*6.75,-27.95,Math.sin(a)*6.75],[Math.cos(b)*6.75,-27.95,Math.sin(b)*6.75]);
 }
 for(const side of[-1,1])for(const z of[-3.2,3.2]){
  metal.box(side*3.6,-41,z,.35,53,.35,C.iron);
  for(const y of[-36,-28,-20,-12,-4,4,10]){
   metal.box(side*3.6,y,z,.75,.28,.8,C.trim);
   beam(metal,[side*3.6,y,z],[side*16.7,y-1.8,z],.12,C.iron,far?4:6);
  }
 }
 for(const y of[-35,-25,-15,-5,6])ring(metal,0,y,0,16.4,.12,C.iron,N);
 const lamp=B.get('inside','Lamp','lights');
 for(const y of[-35,-25,-15,-5,6])ring(lamp,0,y+.16,0,16.15,.09,C.green,N,Math.PI/2+.30,TAU+Math.PI/2-.30);
 // Reversible lid covers the upper central aperture only in the closed preset.
 const lid=B.get('inside','Metal','lid');cylinder(lid,0,.21,0,5.16,.16,C.roof,N);
 for(let x=-4.4;x<=4.4;x+=.8){const h=Math.sqrt(25-x*x);lid.box(x,.37,0,.045,.025,h*2,C.trim);}
 const car=B.get('inside','Metal','car');car.box(0,-.25,0,6.3,.35,6.0,C.roof);
 for(const s of[-1,1])for(const z of[-2.8,2.8])car.box(s*2.9,0,z,.16,4.7,.16,C.iron);
 car.box(0,4.7,0,6.3,.18,6.0,C.trim);
 for(const s of[-1,1]){railing(car,[s*2.9,.1,-2.8],[s*2.9,.1,2.8],1.3);}
 railing(car,[-2.9,.1,-2.8],[2.9,.1,-2.8],1.3);
 for(const low of[false,true]){const cable=B.get('inside','Cable',low?'hoistLow':'hoistHigh');for(const x of[-2,2])beam(cable,[x,low?-23.12:4.88,0],[x,11.5,0],.045,C.wire,5);}
 // Upper drive hardware is supported on the head beam, not floating props.
 metal.box(0,11.2,0,9,.5,8,C.iron);
 for(const x of[-2,2]){metal.tube([x,11.9,-.9],[x,11.9,.9],.66,C.trim,N/2);metal.box(x,11.7,0,1.55,.15,2.4,C.iron);}
 // Entry hall with true doorway openings; wall pieces do not seal the route.
 const hall=B.get('inside','Concrete','hall'),hallRoof=B.get('inside','Concrete','roof','hall');
 floor.box(0,-1.05,29,18,1.15,25,C.base);
 for(const x of[-9,9])hall.box(x,0,29,.75,8.1,25,C.concrete);
 for(const side of[-1,1])hall.box(side*6.75,0,41.5,4.5,8.1,.75,C.concrete);
 hall.box(0,5.1,41.5,9,3,.75,C.concrete);hallRoof.box(0,8.1,29,19,.65,26,C.base);
 for(const z of[19.5,26,33,39.5]){
  for(const s of[-1,1])metal.box(s*8.45,0,z,.38,8.1,.40,C.iron);
  metal.box(0,7.65,z,17.3,.45,.5,C.iron);
  lamp.box(0,7.35,z,4.0,.12,.38,C.green);
 }
 // Purposeful side bench: pipe manifold and analogue instruments, not a clone reactor.
 const detail=B.get('inside','Metal','instruments');
 for(const z of[23,32]){
  metal.box(-6.7,0,z,3.25,1.15,3.6,C.iron);metal.box(-6.7,1.15,z,3.5,.25,3.85,C.trim);
  if(!far){detail.box(-6.7,1.6,z+1.55,2.6,1.25,.25,C.roof);gauge(detail,-6.7,2.3,z+1.82,far);}
 }
 const pipes=B.get('inside','Metal','pipes');
 for(const x of[6.5,7.5]){
  for(let z=18;z<39;z+=3.5){beam(pipes,[x,2.1,z],[x,2.1,z+3.5],.24,C.trim,far?6:10);
   pipes.tube([x,2.1,z-.10],[x,2.1,z+.10],.37,C.iron,far?8:12);}
  for(const z of[22,29,36]){pipes.box(x,0,z,.9,2,.65,C.iron);}
 }
 // Gallery ribs and inset paving do not create a second floor across the shaft.
 if(!far)for(let i=0;i<24;i++){
  const a=i*TAU/24;beam(metal,[6.2*Math.cos(a),.16,6.2*Math.sin(a)],[16.5*Math.cos(a),.16,16.5*Math.sin(a)],.025,C.trim,4);
 }
 return {shaftRadius:inner,selectedDepth:40,carTravel:28,fullNetwork:false,replicaReactor:false,
  route:[[0,.1,40],[0,.1,28],[0,.1,18],[0,.1,10],[0,.1,6],[0,.1,3],[0,.1,0]],
  lights:[[12,3,0],[-12,3,0],[0,-24,-12],[0,5,30]]};
}
function prepare(data,pack){return G.SurfaceContact.prepare(data,pack,ID,bounds);}
function build(data,far=false){const B=bank(far),s=surface(B,data,far),u=underground(B,far);
 return B.finish({locations:[ID],surface:s,underground:u,terrainMutation:false,physicalPortal:false,reactorReplaced:false,basis:'P'});}
function publicPaths(data,pack){
 const sample=G.ASAMA.sampleRenderedTerrain(pack),bins=new Map(),cross=[-1.3,-1,0,1,1.3];
 for(const lod of['near','far'])for(const path of[approach,innerPath]){
  const row=i=>{const p=path[i],a=path[Math.max(0,i-1)],b=path[Math.min(i+1,path.length-1)],d=G.norm([b[0]-a[0],0,b[1]-a[1]]);
   return cross.map(u=>{const q=sample(p[0]-d[2]*1.4*u,p[1]+d[0]*1.4*u,lod),w=1-G.smooth(.85,1.3,Math.abs(u));q.p[1]+=.12+.1*w;q.c=G.blend(q.c,C.ground,w*.8);return q;});};
  let a=row(0);for(let i=0;i<path.length-1;i++){
   const b=row(i+1),src=a[2].tile;if(!bins.has(src.id))bins.set(src.id,{g:new G.Geometry(),src});
   for(let j=0;j<cross.length-1;j++)for(const q of[a[j],b[j+1],b[j],a[j],a[j+1],b[j+1]])bins.get(src.id).g.vertex(q.p,q.n,q.c);a=b;
  }
 }
 return [...bins.values()].map(({g,src})=>{const m=g.mesh(ID+':public:'+src.id,'roads',{owner:ID,region:ID,space:'surface',overview:true,globalSurface:true,
  globalNear:src.globalNear,globalFar:src.globalFar,material:'centerPath',centerPart:'path',centerScene:'surface',terrainSource:src.id,basis:'P'});
  return {...m,center:src.center.slice(),radius:Math.max(src.radius+3,m.radius+G.length(G.sub(m.center,src.center)))};});
}
G.GEYSER_CENTER={id:ID,space:SPACE,views,X,Z,R,bounds,approach,innerPath,prepare,build,publicPaths,supportHeight};
G.extraOverviewBuilders=[...(G.extraOverviewBuilders||[]),(data,pack)=>{prepare(data,pack);return [...build(data,true).meshes,...publicPaths(data,pack)];}];
const prior=G.buildRegion;G.buildRegion=async(data,id,legacy)=>{if(id!==ID)return prior(data,id,legacy);const start=performance.now(),p=build(data);p.builtMs=performance.now()-start;return p;};
})(globalThis.GA);
