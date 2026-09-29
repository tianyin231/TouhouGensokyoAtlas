/* TH16 Land of the Back Door. Evidence: docs/backdoor-reference.md.
 * Every dimension, door layout, small seasonal set and dais is a P interpretation.
 * Seasonal windows are original 3D tableaux, NOT live portals into the surface. */
(function(G){
'use strict';
const TAU=Math.PI*2;
const C=Object.fromEntries(Object.entries({wood:'#36775d',panel:'#245640',edge:'#78a783',dark:'#122f28',brass:'#bfa16a',floor:'#3f2535',pattern:'#643342',line:'#a16f70',ivory:'#d9ceaf',black:'#13121f',gold:'#c5a369'}).map(([k,v])=>[k,G.rgb(v)]));
const windows=[{id:'spring',x:-78,y:3,z:16,yaw:.16},{id:'summer',x:-26,y:5,z:-18,yaw:.05},{id:'autumn',x:30,y:5,z:-18,yaw:-.05},{id:'winter',x:84,y:3,z:16,yaw:-.16}];
const views={
 backdoorOverview:{label:'后户之国 · 万物背后',eye:[192,113,274],target:[0,32,-78],fov:49},
 backdoorEntrance:{label:'门扉群 · 入境',eye:[-120,25,163],target:[-35,26,-53],fov:58},
 backdoorSpring:{label:'春之扉 · 夜樱',eye:[-74,24,87],target:[-78,21,16],fov:43},
 backdoorSummer:{label:'夏之扉 · 高空',eye:[-23,26,56],target:[-26,23,-18],fov:43},
 backdoorAutumn:{label:'秋之扉 · 红叶',eye:[33,26,56],target:[30,23,-18],fov:43},
 backdoorWinter:{label:'冬之扉 · 雪林',eye:[84,23,92],target:[84,21,16],fov:43},
 backdoorHinges:{label:'门扉 · 合页与背板',eye:[-55,25,4],target:[-78,20,16],fov:50},
 backdoorClosed:{label:'门扉 · 关闭选景',eye:[-74,24,87],target:[-78,21,16],fov:43,backdoorClosed:true},
 backdoorDancers:{label:'二童子 · 起舞之处',eye:[-47,36,-78],target:[0,12,-142],fov:50},
 backdoorSeat:{label:'秘神 · 门后座席',eye:[30,27,-148],target:[0,13,-190],fov:46},
 backdoorCanopy:{label:'上下红黑 · 隐星纹',eye:[113,94,45],target:[-45,140,-160],fov:65},
 backdoorSix:{label:'TH16六面 · 黑暗中的扉',eye:[39,34,159],target:[0,23,-163],fov:56,backdoorEdition:'six',era:'TH16第六面意象；串门与彩雾P重构'},
 backdoorExtra:{label:'Extra · 再入后户',eye:[-184,72,-227],target:[0,34,-117],fov:53,backdoorEdition:'extra',era:'TH16 Extra选景；不是新世界坐标'},
 backdoorRear:{label:'回望 · 门群背侧',eye:[174,39,-249],target:[0,28,-55],fov:57}
};
for(const p of Object.values(views)){p.region='backdoor';p.space='backdoor';p.era||='TH16第五面选景／结构与布局P补完';}
Object.assign(G.PRESETS,views);G.IMPLEMENTED.backdoor='backdoorOverview';G.LANDMARKS.partial.add('backdoor');
const b={id:'backdoor',space:'backdoor',name:'后户之国 · 门扉与四季',center:[0,35,-82],poly:[],independent:true,bottom:-50,step:12};
G.DIORAMA.blocks.push(b);G.DIORAMA.map.set(b.id,b);G.REGION_LABELS[b.id]=b.name;
for(const key of ['transform','point','inverse']){const old=G.DIORAMA[key];G.DIORAMA[key]=key==='transform'?((id,...a)=>id==='backdoor'?{scale:1,offset:[0,0,0]}:old(id,...a)):((p,id,...a)=>id==='backdoor'?[...p]:old(p,id,...a));}
function bank(far){const map=new Map();return{get(zone,material='Wood',part='frame',edition='hall',state='both'){
 const key=[zone,material,part,edition,state].join(':');if(!map.has(key))map.set(key,{g:new G.Geometry(),zone,material,part,edition,state});return map.get(key).g.place();
},finish(){const meshes=[];for(const [key,o]of map)if(o.g.a.length)meshes.push(o.g.mesh('backdoor:'+(far?'far:':'detail:')+key,['dust','haze'].includes(o.part)?'effects':'architecture',{owner:'backdoor',region:'backdoor',space:'backdoor',overview:far,material:'backdoor'+o.material,backdoorZone:o.zone,backdoorPart:o.part,backdoorEdition:o.edition,backdoorState:o.state,basis:'P',shadowCaster:!['floor','ceiling','haze','dust','window'].includes(o.part)}));return{id:'backdoor',meshes,signs:[],bytes:meshes.reduce((s,m)=>s+m.vertices.byteLength,0),meta:{version:'0.25.0',surfaceCut:false,fullRealm:false,overview:far,seasonalWindows:'P 3D tableaux; not live surface portals'}};}};}
function oval(g,x,y,z,rx,ry,rz,c,n=8,rings=4){const p=(i,j)=>{const a=i*TAU/n,t=j*Math.PI/rings;return[x+rx*Math.sin(t)*Math.cos(a),y+ry*Math.cos(t),z+rz*Math.sin(t)*Math.sin(a)];};for(let j=0;j<rings;j++)for(let i=0;i<n;i++){if(j===0)g.tri(p(i,0),p(i+1,1),p(i,1),c);else if(j===rings-1)g.tri(p(i,j),p(i+1,j),p(i,rings),c);else g.quad(p(i,j),p(i+1,j),p(i+1,j+1),p(i,j+1),c);}}
function ring(g,x,y,z,r,c,n=48){for(let i=0;i<n;i++){const a=i*TAU/n,d=(i+1)*TAU/n;g.tube([x+Math.cos(a)*r,y,z+Math.sin(a)*r],[x+Math.cos(d)*r,y,z+Math.sin(d)*r],.12,c,4);}}
function door(B,zone,x,y,z,w,h,yaw,far,{edition='hall',opening=false}={}){
 const frame=B.get(zone,'Wood','frame',edition).place(x,y,z,yaw),trim=B.get(zone,'Trim','frame',edition).place(x,y,z,yaw);
 for(const s of [-1,1]){frame.box(s*(w/2+.58),-.5,0,1.16,h+1.3,1.7,C.wood);trim.box(s*(w/2+.55),-.25,1.0,.31,h+1.15,.36,C.edge);}
 frame.box(0,h,0,w+3,1.6,2.0,C.wood);frame.box(0,-.6,0,w+2.7,.85,2.0,C.wood);trim.box(0,h+.4,.85,w+3.25,.42,.58,C.edge);
 const forms=opening?[['open',1.14],['closed',0]]:[['both',0]];
 for(const [state,angle]of forms)for(const side of [-1,1]){
  // Door geometry is built in hinge-local space, then the whole gate is transformed.
  const leaf=new G.Geometry(),orn=new G.Geometry(),metal=new G.Geometry();const lw=w/2-.08;
  leaf.box(0,0,0,lw,h,.72,C.panel);
  for(const yy of [0,h*.31,h*.64,h-.72])orn.box(0,yy,0,lw,.7,1.0,C.wood);
  for(const xx of [-lw/2+.3,lw/2-.3])orn.box(xx,.1,0,.60,h-.2,1.02,C.wood);
  if(!far){for(let row=0;row<3;row++)for(const face of [-1,1]){
   const bottom=1.0+row*h*.32,ph=h*.27,ww=lw-2.05;
   for(const xx of [-ww/2,ww/2])orn.box(xx,bottom,face*.49,.25,ph,.17,C.edge);
   for(const yy of [bottom,bottom+ph])orn.box(0,yy,face*.49,ww,.23,.17,C.edge);
   const yy=bottom+ph/2;orn.quad([0,yy+1.2,face*.61],[1.2,yy,face*.61],[0,yy-1.2,face*.61],[-1.2,yy,face*.61],C.edge);
  }
  for(const yy of [h*.18,h*.5,h*.84]){metal.box(side*(lw/2-.1),yy-.45,0,.28,.9,1.05,C.brass);metal.box(side*(lw/2-1.0),yy-.15,.56,1.6,.3,.18,C.brass);}
  for(const face of [-1,1]){const hx=-side*(lw/2-1.05);metal.box(hx,h*.45-.7,face*.64,.65,1.5,.18,C.brass);metal.tube([hx,h*.45,face*.77],[hx-side*.8,h*.45,face*.77],.13,C.brass,6);}
  }
  const phi=side*angle,co=Math.cos(phi),si=Math.sin(phi),cx=side*w/2-side*lw*.5*co,cz=side*lw*.5*si;
  for(const [g,mat]of [[leaf,'Wood'],[orn,'Trim'],[metal,'Brass']]){if(!g.a.length)continue;const out=B.get(zone,mat,'leaf',edition,state).place(x,y,z,yaw);
   for(let i=0;i<g.a.length;i+=9){const a=g.a;out.vertex([cx+co*a[i]+si*a[i+2],a[i+1],cz-si*a[i]+co*a[i+2]],[co*a[i+3]+si*a[i+5],a[i+4],-si*a[i+3]+co*a[i+5]],a.slice(i+6,i+9));}
  }
 }
 frame.place();trim.place();
}
function build(far=false){const B=bank(far),N=far?20:44;
 for(const [part,y]of [['floor',-19],['ceiling',171]]){
  const g=B.get(part,'Plane',part),p=B.get(part,'Pattern',part);g.box(0,y-(part==='floor'?2:0),-110,2400,2,2400,C.floor);
  // Tiled inlays lie on, rather than float above, the two broad planes.
  const n=far?18:34,step=far?45:24;for(let i=-n/2;i<n/2;i++)for(let j=-n/2;j<n/2;j++){
   if((i+j)%2)continue;const x=i*step,z=j*step-110,Y=y+(part==='floor'?.04:-.04),r=step*.36;
   p.quad([x-r,Y,z],[x,Y,z+r],[x+r,Y,z],[x,Y,z-r],C.pattern);
  }
  if(!far){const lines=B.get(part,'Line',part);for(const radius of [92,164,247])ring(lines,0,y+(part==='floor'?.09:-.09),-107,radius,C.line,96);
   const stars=[[-51,-85],[-31,-59],[-6,-66],[3,-88],[23,-104],[42,-130],[70,-139]];
   for(let i=0;i<stars.length;i++){const [x,z]=stars[i];oval(lines,x,y+(part==='floor'?.16:-.16),z,1.0,.18,1.0,C.gold,6,3);if(i)lines.tube([stars[i-1][0],y+(part==='floor'?.13:-.13),stars[i-1][1]],[x,y+(part==='floor'?.13:-.13),z],.12,C.gold,4);}
  }
 }
 const R=G.rng(251016);for(let i=0;i<N;i++){
  const a=i*2.39996,r=105+Math.sqrt(i/N)*200,x=Math.cos(a)*r,z=-125+Math.sin(a)*r,y=2+R()*115;
  // Keep the four low seasonal gates and the central sight line uncluttered.
  if(z>0&&Math.abs(x)<120)continue;
  const s=.45+R()*.7;door(B,'scatter'+Math.floor(i/6),x,y,z,17*s,33*s,(R()-.5)*.7,far);
 }
 for(const d of windows){door(B,d.id,d.x,d.y,d.z,20,35,d.yaw,far,{opening:true});
  const g=B.get(d.id,'Window'+d.id,'window','hall','open').place(d.x,d.y,d.z,d.yaw);g.quad([-9.96,.02,-.5],[9.96,.02,-.5],[9.96,34.98,-.5],[-9.96,34.98,-.5],[1,1,1]);
 }
 // P supplementary performance plane and movable-looking seat, not an invented palace.
 const stage=B.get('dais','Wood','dais');stage.box(0,-8,-164,71,2,68,C.dark);stage.box(0,-6,-164,68,.6,65,C.floor);
 for(let k=0;k<4;k++)stage.box(0,-13+k*1.75,-128-k*2,32,1.75,2.1,C.floor);
 if(!far){const t=B.get('seat','Brass','seat');for(const x of [-5,5])for(const z of [-192,-185])t.box(x,-5.4,z,.7,7.2,.7,C.brass);
 t.box(0,1.8,-188,11,1,8,C.wood);t.box(0,2.8,-192,11,16,.8,C.wood);t.box(0,17.8,-192,12,1.1,1.4,C.brass);
 for(const x of[-5,5])t.box(x,7.6,-188,.8,.6,9,C.brass);
 const icon=B.get('seat','Line','seat');ring(icon,0,-5.25,-166,17,C.brass,48);
 for(const x of[-4.3,4.3])t.box(x,3.8,-191.48,.22,13,.18,C.brass);for(const yy of[4,15.8])t.box(0,yy,-191.48,8.6,.22,.18,C.brass);
 for(let i=0;i<16;i++){const a=i*TAU/16,d=(i+1)*TAU/16;t.tube([Math.cos(a)*2.6,10+Math.sin(a)*2.6,-191.32],[Math.cos(d)*2.6,10+Math.sin(d)*2.6,-191.32],.13,C.brass,5);}
 for(let i=0;i<7;i++){const a=.3+i*.48;t.tube([0,7.5,-191.2],[Math.cos(a)*2.3,9.8+Math.sin(a)*2.3,-191.2],.09,C.brass,5);}
 }
 for(let i=0;i<6;i++){
  const z=32-i*71;door(B,'six'+i,Math.sin(i*.5)*7,6,z,22,39,0,far,{edition:'six',opening:true});
  const g=B.get('six'+i,'Haze'+(i%4),'haze','six','open');const cc=[G.rgb('#9c789e'),G.rgb('#779aa7'),G.rgb('#c19475'),G.rgb('#a0b5c0')][i%4];
  g.quad([-10,7,z-1],[10,7,z-1],[10,44,z-1],[-10,44,z-1],cc);
 }
 if(!far){const g=B.get('air','Dust','dust','both');for(let i=0;i<150;i++){const x=(R()-.5)*540,y=R()*145,z=(R()-.5)*680-80,s=.12+R()*.18;g.tri([x-s,y,z],[x+s,y,z],[x,y+s*2,z],C.ivory);}}
 const pack=B.finish();pack.meta.locations=['backdoor'];pack.meta.seasonalGates=4;pack.meta.presets=Object.keys(views).length;return pack;
}
// Small original 3D sets, rendered once to bounded seasonal window textures on detail entry.
// They neither reuse surface high-detail packs nor claim to be current surface viewpoints.
function glimpse(season){if(!windows.some(w=>w.id===season))throw Error('Unknown seasonal window');
 const g=new G.Geometry(),col=s=>G.rgb(s),spring=season==='spring',summer=season==='summer',autumn=season==='autumn',winter=season==='winter';
 const ground=col(winter?'#adbfc4':spring?'#4b6267':autumn?'#8e7759':'#6e9582'),bark=col('#64534c'),leaf=col(spring?'#cba0b8':autumn?'#b97c51':winter?'#729399':'#6e9a79');
 const soft=(x,y,z,rx,ry,rz,c)=>{const n=10,rings=5,p=(i,j)=>{const a=i*TAU/n,t=j*Math.PI/rings;return[x+rx*Math.sin(t)*Math.cos(a),y+ry*Math.cos(t),z+rz*Math.sin(t)*Math.sin(a)];};
  const tri=(a,b,c0)=>{for(const q of[a,b,c0])g.vertex(q,G.norm([(q[0]-x)/rx**2,(q[1]-y)/ry**2,(q[2]-z)/rz**2]),c);};
  for(let j=0;j<rings;j++)for(let i=0;i<n;i++){if(!j)tri(p(i,0),p(i+1,1),p(i,1));else if(j===rings-1)tri(p(i,j),p(i+1,j),p(i,rings));else{tri(p(i,j),p(i+1,j),p(i+1,j+1));tri(p(i,j),p(i+1,j+1),p(i,j+1));}}
 };
 g.box(0,-2,-42,145,2,150,ground);
 for(let k=0;k<3;k++)for(let i=0;i<24;i++){
  const x=-135+i*12,z=-115-k*26,h=(12+8*Math.sin(i*.4+k)+5*Math.sin(i*.93))* (1+k*.2),h1=(12+8*Math.sin((i+1)*.4+k)+5*Math.sin((i+1)*.93))*(1+k*.2);
  g.quad([x,0,z],[x,h,z-12],[x+12,h1,z-12],[x+12,0,z],col(k===0?'#6f818b':k===1?'#81909e':'#92a2b1'));
 }
 if(!summer){for(let i=0;i<12;i++){const side=i%2?-1:1,x=side*(11+Math.floor(i/2)*3),z=3-Math.floor(i/2)*13;
  g.tube([x,0,z],[x+side*.8,11,z],.64,bark,8,.27);
  for(let j=0;j<4;j++){const a=j*2.4,xx=x+Math.cos(a)*4,zz=z+Math.sin(a)*3,yy=11.5+j*.6;
   g.tube([x,6,z],[xx,yy,zz],.28,bark,6,.10);
   const c=G.blend(leaf,col(spring?'#e2c4cf':winter?'#d4e0de':'#cda665'),j*.09);
   soft(xx,yy+1.0,zz,3.4,2.1,2.9,c);soft(xx+Math.cos(a)*2.2,yy+.4,zz+Math.sin(a)*1.8,2.9,1.8,2.2,c);
   if(winter)soft(xx,yy+2.1,zz,3.3,.65,2.6,col('#e0e7e0'));
  }
 }
 // A reserved, jointed path and paired lanterns keep the miniature readable through a door.
 for(let i=0;i<21;i++){const z=9-i*4,x=autumn?2.8*Math.sin(i*.22):0;g.box(x,.06,z,6,.16,4.05,col(winter?'#d2dad2':'#afa294'));}
 for(const side of[-1,1])for(const z of[-2,-28,-49]){const x=side*5.2;g.box(x,.1,z,.45,3.0,.45,bark);g.box(x,3.0,z,1.45,1.7,1.45,col('#dec9a4'));g.box(x,4.7,z,2.1,.35,2.1,col('#5c5b67'));}
 }
 if(spring){const red=col('#975b64');for(const x of[-8.8,8.8])g.box(x,0,-32,1.1,16,1.1,red);g.box(0,14.4,-32,23,1.1,1.8,red);g.box(0,11.9,-32,20,.6,1.1,red);
  g.box(0,0,-78,31,1.5,18,col('#777d88'));g.box(0,1.5,-78,27,12,15,col('#c5bbb1'));
  for(const x of[-12,-6,0,6,12])g.box(x,1.5,-70.3,.5,12.3,.6,bark);
  for(let i=0;i<4;i++){const z0=10-i*2.5,z1=10-(i+1)*2.5,y0=12.8+i*1.7,y1=12.8+(i+1)*1.7;for(const side of[-1,1])g.quad([-17,y0,-78+side*z0],[17,y0,-78+side*z0],[15,y1,-78+side*z1],[-15,y1,-78+side*z1],col('#617281'));}
  soft(-15,39,-124,3,3,1,col('#dad8bf'));
 }
 if(summer){for(let i=0;i<17;i++){const x=-57+(i%5)*28,z=-7-Math.floor(i/5)*29,y=10+Math.sin(i)*4;soft(x,y,z,17,3.2,7.5,col('#c8d8d7'));soft(x+6,y+2,z-2,10,4.5,6,col('#e0e7de'));}}
 return {season,mesh:g.mesh('glimpse:'+season,'architecture',{basis:'P'}),background:spring?'#26253e':summer?'#81abc6':autumn?'#b7a397':'#98afbb',eye:[0,12,30],target:[0,7,-46]};
}
G.BACKDOOR={version:'0.25.0',spaces:['backdoor'],regions:['backdoor'],views,windows,locations:{backdoor:'backdoorOverview'},fullRealm:false,livePortals:false};
G.buildBackdoor=build;G.buildBackdoorOverview=()=>build(true);G.buildBackdoorGlimpse=glimpse;
const old=G.buildRegion;G.buildRegion=async function(data,id,legacy){if(id!=='backdoor')return old(data,id,legacy);const t=performance.now(),p=build();p.builtMs=performance.now()-t;return p;};
})(globalThis.GA);
