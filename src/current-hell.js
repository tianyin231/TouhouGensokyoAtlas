/* Present Hell: TH17 wind-scoured bone plain; WAaHH49 Avici is a separate selection.
 * Topography, size, routes and every bone placement are P, not official measurements.
 * No lava metropolis, headquarters, fabricated entrance or fixed link to Former Hell.
 */
(function(G){
 'use strict';
 const TAU=Math.PI*2,regions=['currenthell','avici'],spaces=['hell_present','hell_avici'];
 const C=Object.fromEntries(Object.entries({earth:'#664743',ash:'#8d7569',ridge:'#58464b',rock:'#786260',light:'#b9a999',bone:'#cec2a9',shadow:'#655b5a',socket:'#322f36',tooth:'#e1d5b9',dust:'#a2494c',wind:'#c76065',cold:'#87858c'}).map(([k,v])=>[k,G.rgb(v)]));
 const views={
  jigokuOverview:{label:'现行地狱 · 骸原与业风',region:'currenthell',eye:[475,300,560],target:[-25,30,-78],fov:47},
  jigokuArrival:{label:'地狱 · 风蚀浅道',region:'currenthell',eye:[16,34,274],target:[-32,27,45],fov:55},
  jigokuBonefield:{label:'地狱 · 埋骨旷野',region:'currenthell',eye:[-73,52,103],target:[-127,37,13],fov:54},
  jigokuSkull:{label:'骸原 · 眼窝与断颚',region:'currenthell',eye:[-104,41,42],target:[-120,33.8,22],fov:49},
  jigokuRidge:{label:'地狱 · 断层岩脊',region:'currenthell',eye:[-326,155,26],target:[-259,112,-105],fov:58},
  jigokuBasin:{label:'地狱 · 风蚀盆地',region:'currenthell',eye:[247,103,151],target:[104,34,-49],fov:54},
  jigokuReverse:{label:'骸原 · 逆向望野',region:'currenthell',eye:[-324,160,-398],target:[-2,30,-36],fov:55},
  jigokuStorm:{label:'TH17 Extra · 暴风区域选景',region:'currenthell',eye:[217,94,-137],target:[73,69,-353],fov:63,jigokuStorm:true},
  jigokuWindeye:{label:'业风 · 风带下方',region:'currenthell',eye:[68,48,-234],target:[48,112,-419],fov:61,jigokuStorm:true},
  jigokuGuide:{label:'TH19 · 引路活动关联',region:'currenthell',eye:[151,48,203],target:[36,22,105],fov:54,jigokuEra:'th19'},
  jigokuAudience:{label:'TH19 · 残无活动关联',region:'currenthell',eye:[-55,64,-121],target:[-16,35,-223],fov:54,jigokuEra:'th19'},
  aviciOverview:{label:'无间地狱 · 空寂荒野',region:'avici',eye:[223,97,314],target:[-16,6,-55],fov:58},
  aviciRemains:{label:'无间地狱 · 灰骨近景',region:'avici',eye:[-8,11,46],target:[-21,4.4,25],fov:52},
  aviciHorizon:{label:'无间地狱 · 无尽暗处',region:'avici',eye:[85,15,-92],target:[-23,10,-255],fov:65}
 };
 for(const p of Object.values(views)){p.space=spaces[regions.indexOf(p.region)];p.jigokuEra||=p.region==='avici'?'waa49':'th17';p.era=p.region==='avici'?'茨歌仙49话无间意象／地貌P补完':p.jigokuEra==='th19'?'TH19人物关联／共用P骸原，非原画地图复刻':p.jigokuStorm?'TH17 Extra暴风区域意象／P地貌':'TH17四面骸原与红风／P地貌';}
 Object.assign(G.PRESETS,views);G.IMPLEMENTED.hell='jigokuOverview';G.LANDMARKS.partial.add('hell');
 for(let i=0;i<2;i++){const b={id:regions[i],space:spaces[i],name:i?'无间地狱 · 空寂选景':'现行地狱 · 骸原与业风',poly:[],center:[0,20,-80],independent:true,bottom:-50,step:12};G.DIORAMA.blocks.push(b);G.DIORAMA.map.set(b.id,b);G.REGION_LABELS[b.id]=b.name;}
 for(const k of ['transform','point','inverse']){const old=G.DIORAMA[k];G.DIORAMA[k]=k==='transform'?((r,...a)=>regions.includes(r)?{scale:1,offset:[0,0,0]}:old(r,...a)):((p,r,...a)=>regions.includes(r)?[...p]:old(p,r,...a));}
 const gauss=(x,z,cx,cz,rx,rz)=>Math.exp(-(((x-cx)/rx)**2+((z-cz)/rz)**2));
 function height(x,z){
  const channel=-14+48*Math.sin(z/182),d=Math.abs(x-channel);
  const low=11+4*Math.sin(z/128)+3*G.noise(x/42,z/47),slope=24*G.smooth(36,182,d);
  const west=70*gauss(x,z,-276,-124,96,238)+29*gauss(x,z,-365,148,120,175),east=34*gauss(x,z,277,-39,144,290);
  const broken=4*Math.sin(z/27+x/53)*G.smooth(95,250,d);
  return low+slope+west+east+broken+18*G.smooth(390,850,Math.hypot(x,z));
 }
 function emptyHeight(x,z){return 1.5+1.4*Math.sin(x/76)*Math.cos(z/117)+.9*G.noise(x/43,z/47);}
 function batches(id,far){const b=new Map();return{
  get(zone,mat='Rock',part='base',group='architecture'){const key=[zone,mat,part].join(':');if(!b.has(key))b.set(key,{g:new G.Geometry(),zone,mat,part,group});return b.get(key).g.place();},
  finish(meta){const meshes=[];for(const [key,o]of b)if(o.g.a.length)meshes.push(o.g.mesh(`${id}:${far?'overview':'detail'}:${key}`,o.group,{owner:id,region:id,space:spaces[regions.indexOf(id)],overview:far,material:'jigoku'+o.mat,jigokuZone:o.zone,jigokuPart:o.part,basis:'P',shadowCaster:!['terrain','horizon','wind'].includes(o.zone)}));return{id,meshes,signs:[],bytes:meshes.reduce((s,m)=>s+m.vertices.byteLength,0),meta:{version:'0.27.0',surfaceCut:false,fullRealm:false,physicalPortal:false,overview:far,...meta}};}
 };}
 function orb(g,x,y,z,rx,ry,rz,c,n=8,rings=4){const p=(i,j)=>{const a=i*TAU/n,b=j*Math.PI/rings;return[x+rx*Math.sin(b)*Math.cos(a),y+ry*Math.cos(b),z+rz*Math.sin(b)*Math.sin(a)];};for(let j=0;j<rings;j++)for(let i=0;i<n;i++){if(!j)g.tri(p(i,0),p(i+1,1),p(i,1),c);else if(j===rings-1)g.tri(p(i,j),p(i+1,j),p(i,rings),c);else g.quad(p(i,j),p(i+1,j),p(i+1,j+1),p(i,j+1),c);}}
 function closedTube(g,a,b,r,c,n=6,r2=r){g.tube(a,b,r,c,n,r2);const d=G.norm(G.sub(b,a)),u=G.norm(G.cross(d,Math.abs(d[1])>.9?[1,0,0]:[0,1,0])),v=G.cross(d,u);for(let i=0;i<n;i++){const p=t=>G.add(a,G.add(G.mul(u,r*Math.cos(t)),G.mul(v,r*Math.sin(t))));g.tri(a,p(i*TAU/n),p((i+1)*TAU/n),c);}}
 // Hollow front sockets and nose are openings in the face, not black stickers on spheres.
 function skull(level=1){const g=new G.Geometry();if(level===0){orb(g,0,1.42,0,.87,1.01,.78,C.bone,6,3);g.box(0,.30,.28,1.05,.36,.7,C.bone);return new Float32Array(g.a);}const n=level===2?24:12,rings=level===2?8:3;
  const p=(i,j,inside=false)=>{let a=i*TAU/n,b=Math.PI*.5+j*Math.PI*.5/rings,s=inside?.82:1;return[.92*s*Math.sin(b)*Math.cos(a),1.43+1.04*s*Math.sin(b)*Math.sin(a),.36+.88*s*Math.cos(b)];};
  const shellTri=(a,b,c,col,inside)=>{const mean=G.mul(G.add(G.add(a,b),c),1/3),out=[mean[0]/(.92*.92),(mean[1]-1.43)/(1.04*1.04),(mean[2]-.36)/(.88*.88)],cr=G.cross(G.sub(b,a),G.sub(c,a)),dot=cr[0]*out[0]+cr[1]*out[1]+cr[2]*out[2];if((dot>0)===inside)[b,c]=[c,b];for(const v of[a,b,c]){let normal=G.norm([v[0]/(.92*.92),(v[1]-1.43)/(1.04*1.04),(v[2]-.36)/(.88*.88)]);if(inside)normal=G.mul(normal,-1);g.vertex(v,normal,col);}};
  for(let j=0;j<rings;j++)for(let i=0;i<n;i++){for(const inside of [false,true]){let a=p(i,j,inside),b=p(i+1,j,inside),c=p(i+1,j+1,inside),d=p(i,j+1,inside),col=inside?C.shadow:C.bone;if(j===rings-1)shellTri(a,b,c,col,inside);else {shellTri(a,b,c,col,inside);shellTri(a,c,d,col,inside);}}}
  for(const side of[-1,1]){let cx=side*.44,cy=1.40,steps=level===2?20:10;
   for(let i=0;i<steps;i++){const a=i*TAU/steps,b=(i+1)*TAU/steps;
    const inner=(t,z)=>[cx+.295*Math.cos(t),cy+.29*Math.sin(t),z];
    const outer=t=>{const q=Math.min(.44/Math.max(1e-9,Math.abs(Math.cos(t))),.43/Math.max(1e-9,Math.abs(Math.sin(t))));return[cx+q*Math.cos(t),cy+q*Math.sin(t),.51+.04*Math.sin(t)];};
    g.quad(inner(a,.59),inner(b,.59),outer(b),outer(a),C.bone);g.quad(inner(a,.59),inner(a,.21),inner(b,.21),inner(b,.59),C.shadow);
   }
  }
  // Forehead joins the eye bands to an elliptical upper contour.
  const forehead=i=>{let t=i*Math.PI/n;return[.92*Math.cos(t),1.83+.62*Math.sin(t),.38+.20*Math.sin(t)];};
  for(let i=0;i<n;i++){const a=forehead(i),b=forehead(i+1);g.quad([a[0],1.83,.51],[b[0],1.83,.51],b,a,C.bone);}
  for(const s of[-1,1]){g.quad([s*.03,.96,.57],[s*.87,.97,.51],[s*.72,.61,.51],[s*.23,.64,.70],C.bone);g.quad([s*.03,.96,.57],[s*.23,.64,.70],[s*.12,.68,.22],[s*.025,.91,.24],C.shadow);}
  g.box(0,.47,.48,1.20,.16,.34,C.bone);
  const teeth=level===0?4:6;for(let i=0;i<teeth;i++)g.box(-.49+i*.98/(teeth-1),.27,.66,.14,.23,.18,C.tooth);
  for(let i=0;i<n/2;i++){const a=Math.PI*i/(n/2),b=Math.PI*(i+1)/(n/2);closedTube(g,[.70*Math.cos(a),.18,.08+.68*Math.sin(a)],[.70*Math.cos(b),.18,.08+.68*Math.sin(b)],.105,C.bone,4);}
  for(const s of[-1,1])closedTube(g,[s*.70,.18,.08],[s*.79,.83,.05],.13,C.bone,5);
  return new Float32Array(g.a);
 }
 function append(g,a,x,y,z,s,angle,tilt=0){const co=Math.cos(angle),si=Math.sin(angle),ct=Math.cos(tilt),st=Math.sin(tilt);for(let i=0;i<a.length;i+=9){const py=a[i+1]*ct-a[i+2]*st,pz=a[i+1]*st+a[i+2]*ct,ny=a[i+4]*ct-a[i+5]*st,nz=a[i+4]*st+a[i+5]*ct;g.a.push(x+s*(a[i]*co+pz*si),y+s*py,z+s*(-a[i]*si+pz*co),a[i+3]*co+nz*si,ny,-a[i+3]*si+nz*co,a[i+6],a[i+7],a[i+8]);}}
 function bone(g,x,y,z,s,angle){g.place(x,y,z,angle);closedTube(g,[-1.2*s,.2*s,0],[1.2*s,.2*s,0],.16*s,C.bone,5,.20*s);for(const dx of[-1.15,1.15])for(const dz of[-.14,.14])orb(g,dx*s,.21*s,dz*s,.26*s,.25*s,.22*s,C.bone,6,3);g.place();}
 function ribs(g,x,y,z,s,angle){g.place(x,y,z,angle);for(let i=0;i<5;i++){const zz=(i-2)*.55*s,r=(1.2-.10*Math.abs(i-1))*s;for(let j=0;j<8;j++){const a=j*Math.PI/8,b=(j+1)*Math.PI/8;closedTube(g,[r*Math.cos(a),.18*s+r*.78*Math.sin(a),zz],[r*Math.cos(b),.18*s+r*.78*Math.sin(b),zz],.10*s,C.bone,4);}}closedTube(g,[0,1.04*s,-1.5*s],[0,1.04*s,1.5*s],.17*s,C.bone,5);g.place();}
 function rock(g,x,y,z,r,H,seed){const R=G.rng(seed),n=7,ring=[];for(let j=0;j<4;j++){let a=[];for(let i=0;i<n;i++){let t=i*TAU/n,rad=r*(j===0?1.05:j===3?.41:.9)*(1+.16*Math.sin(i*7+seed));a.push([x+Math.cos(t)*rad+j*.1*r,y+H*j/3+(j===3?R()*H*.18:0),z+Math.sin(t)*rad]);}ring.push(a);}for(let j=0;j<3;j++)for(let i=0;i<n;i++)g.quad(ring[j][i],ring[j+1][i],ring[j+1][(i+1)%n],ring[j][(i+1)%n],j===1?C.earth:C.rock);for(let i=1;i<n-1;i++)g.tri(ring[3][0],ring[3][i],ring[3][i+1],C.ridge);}
 function ground(B,far,empty){const H=empty?emptyHeight:height,lim=empty?900:950,n=far?32:128,g=B.get('terrain','Earth','base','terrain');
  const col=(x,y,z)=>empty?G.blend(C.shadow,C.cold,.10+.13*G.noise(x/170,z/210)):G.blend(C.earth,C.ash,.20+.22*Math.sin(y*.13)+.14*G.noise(x/150,z/150));
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){const x=-lim+2*lim*i/n,z=-lim+2*lim*j/n,D=2*lim/n,p=[[x,H(x,z),z],[x,H(x,z+D),z+D],[x+D,H(x+D,z+D),z+D],[x+D,H(x+D,z),z]];
   for(const t of[[0,1,2],[0,2,3]])for(const k of t){const a=p[k],e=.5,normal=G.norm([H(a[0]-e,a[2])-H(a[0]+e,a[2]),2*e,H(a[0],a[2]-e)-H(a[0],a[2]+e)]);g.vertex(a,normal,col(...a));}
  }
  const horizon=B.get('horizon','Earth','base','terrain');for(let s=0;s<4;s++){const rot=(x,z)=>{for(let k=0;k<s;k++)[x,z]=[-z,x];return[x,z];};for(let i=0;i<n;i++){const u=-lim+i*2*lim/n,v=u+2*lim/n,p=[rot(u,lim),rot(v,lim),rot(v*12,lim*12),rot(u*12,lim*12)];horizon.quad(...p.map(([x,z])=>[x,H(x,z),z]),empty?C.shadow:C.earth);}}
 }
 function winds(B,far){const w=B.get('wind','Wind','wind','effects'),R=G.rng(27091),layers=far?6:16;
  for(let k=0;k<layers;k++){const z=-420+R()*820,y=40+R()*110,span=320+R()*270,n=far?16:40;for(let i=0;i<n;i++){
   const a=-span+i*span*2/n,b=a+span*2/n,p=(x,side)=>[x,y+Math.sin(x/101+k)*11+side*(4+k%3*1.6),z+Math.sin(x/175+k)*38];const vs=[p(a,-1),p(b,-1),p(b,1),p(a,1)],cs=[[i/n,0,k/layers],[(i+1)/n,0,k/layers],[(i+1)/n,1,k/layers],[i/n,1,k/layers]];for(const t of[[0,1,2],[0,2,3]])for(const j of t)w.vertex(vs[j],[0,0,1],cs[j]);
  }}
  if(!far){const dust=B.get('wind','Dust','wind','effects');for(let i=0;i<105;i++){const x=(R()-.5)*1150,z=(R()-.5)*1060,y=18+R()*120;dust.tri([x,y,z],[x+1.4,y+.5,z],[x+.4,y+1.4,z+.25],C.dust);}}
  const storm=B.get('wind','Storm','storm','effects');const N=far?50:140;for(let i=0;i<N;i++){const a=i*TAU*1.25/N,b=(i+1)*TAU*1.25/N,p=(t,side)=>[80+Math.cos(t)*(125+22*Math.sin(t*.7)),59+t*10+side*8,-345+Math.sin(t)*(90+13*Math.cos(t))];const vs=[p(a,-1),p(b,-1),p(b,1),p(a,1)],cs=[[i/N,0,0],[(i+1)/N,0,0],[(i+1)/N,1,0],[i/N,1,0]];for(const t of[[0,1,2],[0,2,3]])for(const j of t)storm.vertex(vs[j],[0,0,1],cs[j]);}
 }
 function build(empty=false,far=false){const id=empty?'avici':'currenthell',B=batches(id,far),H=empty?emptyHeight:height;ground(B,far,empty);
  const proto=skull(far?0:1),hero=far?proto:skull(2),R=G.rng(empty?2749:2717);
  const clusters=empty?[[0,25,95],[-148,-84,90],[189,-110,120]]:[[-127,14,90],[144,-47,85],[-62,-227,115],[289,106,82],[-317,-170,63],[93,196,66]];
  let count=0;for(let c=0;c<clusters.length;c++){const [cx,cz,r]=clusters[c],g=B.get('bones'+c,'Bone','bones');for(let i=0;i<(far?14:empty?85:105);i++){
   const a=R()*TAU,rad=r*Math.sqrt(R()),x=cx+Math.cos(a)*rad,z=cz+Math.sin(a)*rad;
   // Sparse wind-worn channel remains legible; scatter is clustered, not a grid.
   if(!empty&&Math.abs(x-(-14+48*Math.sin(z/182)))<13)continue;
   if(Math.hypot(x-(empty?-21:-120),z-(empty?25:22))<15)continue;
   const s=(empty?.7:1.0)+R()*2.1,angle=R()*TAU,tilt=(R()-.5)*2.1;
   append(g,proto,x,H(x,z)-s*(i%7===0?.46:.17),z,s,angle,tilt);count++;
   if(!far&&i%4===0)bone(g,x+2.4*s,H(x+2.4*s,z),z,s*.8,angle+1);
   if(!far&&i%13===0)ribs(g,x-3*s,H(x-3*s,z),z,s*.6,angle);
  }}
  const hx=empty?-21:-120,hz=empty?25:22,g=B.get('closeBones','Bone','bones');append(g,hero,hx,H(hx,hz)-.25,hz,empty?2.3:3.5,.24,-.13);
  if(!far){bone(g,hx+8,H(hx+8,hz-2),hz-2,1.6,-.8);ribs(g,hx-9,H(hx-9,hz-4),hz-4,1.9,.75);}
  if(!empty){
   const r=B.get('ridge','Rock'),pts=[[-248,-165,16,29],[-262,-111,14,39],[-292,-78,12,25],[-292,4,17,32],[-307,77,21,23],[236,-49,17,23],[283,-136,13,26],[236,89,12,19]];
   pts.forEach(([x,z,s,h],i)=>rock(r,x,H(x,z)-3,z,s,h,172+i));
   if(!far)for(let i=0;i<72;i++){let x=(R()-.5)*790,z=(R()-.5)*930;if(Math.abs(x-(-14+48*Math.sin(z/182)))<15)continue;rock(r,x,H(x,z)-.3,z,1.4+R()*3.1,1.3+R()*2.5,310+i);}
   winds(B,far);
  }
  const path=G.spline([[6,282],[-8,194],[24,103],[2,25],[-47,-87],[-58,-166],[0,-245],[74,-327]],15).map(([x,z])=>[x,H(x,z)+.2,z]);
  return B.finish({locations:empty?[]:['hell'],separateSelection:empty?'WAaHH49':'TH17/TH19 annotations',skulls:count+1,path:empty?[]:path,hasBuildings:false,hasLava:false});
 }
 const previous=G.buildRegion;G.buildRegion=async function(data,id,legacy){if(!regions.includes(id))return previous(data,id,legacy);const t=performance.now(),p=build(id==='avici');p.builtMs=performance.now()-t;return p;};
 Object.assign(G,{CURRENT_HELL:{version:'0.27.0',regions,spaces,views,locations:{hell:'jigokuOverview'},height,emptyHeight,fullRealm:false},buildCurrentHell:(far=false)=>build(false,far),buildAvici:(far=false)=>build(true,far),buildCurrentHellOverviews:()=>[build(false,true),build(true,true)]});
})(globalThis.GA);
