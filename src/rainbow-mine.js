/* Rainbow Dragon Cave: TH18 track mine / TH18.5 atmosphere selection.
 * All dimensions, supports, carts, route curves and mineral forms are P.
 * This local underground chart is not a new world or a surveyed surface entrance. */
(function(G){
'use strict';
const TAU=Math.PI*2, id='rainbowmine', space='mountain_mine';
const C=Object.fromEntries(Object.entries({rock:'#59636a',rockLight:'#7d8583',seam:'#475962',floor:'#827e6d',gravel:'#9c9783',wood:'#875d3e',cut:'#c2a17b',iron:'#384b55',rail:'#9baeb0',rust:'#75594b',lamp:'#fff2c8',jade:'#66c7b8',violet:'#ab82bc',rose:'#b57c8c',ore:'#aad0bb',paper:'#d3cbbb',grass:'#719484',snow:'#dde5df'}).map(([k,v])=>[k,G.rgb(v)]));
const views={
 mineOverview:{label:'虹龙洞 · 矿道剖览',eye:[175,192,164],target:[8,0,-145],fov:49,mineCut:true},
 minePortal:{label:'虹龙洞 · 矿口',eye:[31,23,126],target:[4,13,87],fov:51},
 mineThreshold:{label:'虹龙洞 · 洞口内缘',eye:[5,12,60],target:[-2,10,-18],fov:59},
 mineUpper:{label:'浅层 · 坑木与双轨',eye:[-4,12,9],target:[-4,9,-55],fov:57},
 mineInvestigation:{label:'四面 · 调查工作点',eye:[9,10,-126],target:[14,5,-157],fov:55},
 mineRailYard:{label:'矿道 · 道岔与空车',eye:[2,11,-107],target:[-3,1,-151],fov:54},
 mineCart:{label:'矿车 · 轮轴与空斗',eye:[0,8,-134],target:[-7,4.0,-146],fov:52},
 mineVein:{label:'龙珠矿脉 · 岩壁近景',eye:[7,3,-212],target:[23,4,-231],fov:50,mineEdition:'extra'},
 mineDepth:{label:'Extra · 深部采场',eye:[-4,5,-218],target:[5,-1,-287],fov:60,mineEdition:'extra'},
 mineBranch:{label:'矿道 · 东侧支巷',eye:[32,4,-158],target:[69,1,-169],fov:55,mineEdition:'extra'},
 mineReverse:{label:'矿道 · 回望浅层',eye:[-5,9,-184],target:[-2,11,-60],fov:55},
 mineDrain:{label:'浅层 · 排水与路肩',eye:[4,9,-57],target:[6,4,-91],fov:52},
 mineDeepRoof:{label:'深部 · 顶层与支护',eye:[43,72,-279],target:[0,-3,-274],fov:49,mineCut:true,mineEdition:'extra'},
 mineBlackMarket:{label:'TH18.5 · 充氧时的矿道',eye:[-4,12,9],target:[-4,9,-55],fov:57,mineEdition:'th185'}
};
for(const p of Object.values(views)){Object.assign(p,{region:id,space});p.mineEdition||='th18';p.era=p.mineEdition==='th185'?'TH18.5充氧说明／共用P矿道选景':p.mineEdition==='extra'?'TH18 Extra深部／本作矿道布局':'TH18四面／本作矿道布局';}
Object.assign(G.PRESETS,views);G.IMPLEMENTED.rainbow_mine='mineThreshold';G.LANDMARKS.partial.add('rainbow_mine');
const block={id,space,name:'虹龙洞 · 矿道与深部',center:[0,0,-130],poly:[],independent:true,bottom:-35,step:8};G.DIORAMA.blocks.push(block);G.DIORAMA.map.set(id,block);G.REGION_LABELS[id]=block.name;
for(const k of ['transform','point','inverse']){const old=G.DIORAMA[k];G.DIORAMA[k]=k==='transform'?((r,...a)=>r===id?{scale:1,offset:[0,0,0]}:old(r,...a)):((p,r,...a)=>r===id?[...p]:old(p,r,...a));}
const center=z=>3*Math.sin(z/63)+2*Math.sin(z/31);
const floor=z=>5-16*G.smooth(70,350,-z);
const width=z=>12+10*Math.exp(-(((z+147)/47)**2))+13*Math.exp(-(((z+280)/46)**2));
const roof=z=>17+10*Math.exp(-(((z+275)/65)**2));
const route=Array.from({length:211},(_,i)=>{const z=90-i*2;return[center(z),floor(z),z];});
function bank(far){const b=new Map();return{get(zone,mat='Rock',part='base',group='architecture'){const key=[zone,mat,part].join(':');if(!b.has(key))b.set(key,{g:new G.Geometry(),zone,mat,part,group});return b.get(key).g.place();},finish(lights){const meshes=[];for(const[k,o]of b)if(o.g.a.length)meshes.push(o.g.mesh(`${id}:${far?'overview':'detail'}:${k}`,o.group,{owner:id,region:id,space,overview:far,material:'mine'+o.mat,mineZone:o.zone,minePart:o.part,basis:'P'}));return{id,meshes,bytes:meshes.reduce((s,m)=>s+m.vertices.byteLength,0),signs:[],meta:{version:'0.28.0',overview:far,locations:['rainbow_mine'],lights,path:route,fullMine:false,surfaceCut:false,physicalPortal:false,sourceBounds:'Local P inspection chart, not surveyed Gensokyo coordinates'}};}};}
function beam(g,a,b,w,col){if(G.length(G.sub(a,b))<.0001)return;g.tube(a,b,w,col,4);}
function rock(g,x,y,z,rx,ry,rz,seed=1){const n=7,rs=[];for(let j=0;j<3;j++){rs.push(Array.from({length:n},(_,i)=>{const a=i*TAU/n,r=(j===2?.48:1)*(1+.13*Math.sin(i*3+seed));return[x+Math.cos(a)*rx*r,y+ry*j/2+(j===2?.09*ry*Math.cos(i*2):0),z+Math.sin(a)*rz*r];}));}for(let j=0;j<2;j++)for(let i=0;i<n;i++)g.quad(rs[j][i],rs[j+1][i],rs[j+1][(i+1)%n],rs[j][(i+1)%n],j?C.rockLight:C.rock);for(let i=1;i<n-1;i++)g.tri(rs[2][0],rs[2][i],rs[2][i+1],C.rockLight);}
function ring(z,outer=false){const x=center(z),y=floor(z),w=width(z)+(outer?1.2:0),h=roof(z)+(outer?1.2:0);let a=[[-w,0],[-w,7]];for(let i=1;i<9;i++){const t=Math.PI-i*Math.PI/9;a.push([Math.cos(t)*w,7+Math.sin(t)*(h-7)]);}a.push([w,7],[w,0]);return a.map(([dx,dy],i)=>[x+dx+(i>1&&i<10?.36*Math.sin(z/11+i):0),y+dy,z]);}
function cavern(B,far){const count=far?42:140,step=420/count,Z=[...new Set([...Array.from({length:count+1},(_,i)=>90-i*step),-138,-174])].sort((a,b)=>b-a);
 for(let j=0;j<Z.length-1;j++){const z=Z[j],z1=Z[j+1],A=ring(z),B1=ring(z1),zone=z>-95?'upper':z>-204?'yard':'deep';
  const ground=B.get(zone,'Ground');ground.quad(A[0],B1[0],B1.at(-1),A.at(-1),C.floor);
  for(let i=0;i<A.length-1;i++){
   const top=i>0&&i<A.length-2;if(!top&&i===A.length-2&&z<=-138&&z>-174)continue;
   const g=B.get(zone,'Rock',top?'roof':'wall');
   const col=G.blend(C.rock,C.rockLight,.22+.10*Math.sin(i*2+j*.45));g.quad(A[i],A[i+1],B1[i+1],B1[i],col);
   if(top){const O=ring(z,true),P=ring(z1,true);g.quad(O[i],P[i],P[i+1],O[i+1],C.rock);}
  }
 }
 // Closed back of this finite selection, not an opening to another world.
 const a=ring(-330),back=B.get('deep','Rock','wall');for(let i=1;i<a.length-1;i++)back.tri(a[0],a[i],a[i+1],C.rock);
 // Wide side opening branches into a lower blind heading. Its floor meets the yard.
 const g=B.get('branch','Rock','wall'),top=B.get('branch','Rock','roof'),fl=B.get('branch','Ground');
 for(let i=0;i<(far?12:36);i++){const n=far?12:36,t=i/n,u=(i+1)/n;
  const p=(t,s,h)=>[27+t*72,floor(-156)-t*3+h,-156-t*22+s*(18-t*12)];
  fl.quad(p(t,-1,0),p(u,-1,0),p(u,1,0),p(t,1,0),C.floor);
  for(const s of[-1,1])g.quad(p(t,s,0),p(t,s,6.5),p(u,s,6.5),p(u,s,0),C.rock);
  top.quad(p(t,-1,6.5),p(t,0,7.2),p(u,0,7.2),p(u,-1,6.5),C.rockLight);top.quad(p(t,0,7.2),p(t,1,6.5),p(u,1,6.5),p(u,0,7.2),C.rock);
 }
 g.box(99,floor(-156)-3,-178,1,7.3,13,C.rock);
 // Short joint between the main wall opening and the lower side heading.
 for(let zz=-138;zz>-174;zz-=3){const zs=zz-3,a=[center(zz)+width(zz),floor(zz),zz],b=[center(zs)+width(zs),floor(zs),zs];fl.quad(a,b,[27,floor(-156),zs],[27,floor(-156),zz],C.floor);top.quad([a[0],a[1]+7,zz],[27,floor(-156)+7.2,zz],[27,floor(-156)+7.2,zs],[b[0],b[1]+7,zs],C.rock);}
 for(const zz of[-138,-174]){const x=center(zz)+width(zz),y=floor(zz);g.quad([x,y,zz],[27,floor(-156),zz],[27,floor(-156)+7.2,zz],[x,y+7,zz],C.rock);}

}
function support(B,z,far){const x=center(z),y=floor(z),w=width(z)-1.0,h=roof(z)-1.8,g=B.get('supports','Wood'),ir=B.get('supports','Iron');
 for(const side of[-1,1]){g.box(x+side*w,y,z,.85,h*.65,.92,C.wood);ir.box(x+side*w,y-.05,z,1.2,.22,1.3,C.iron);beam(g,[x+side*w,y+h*.64,z],[x+side*w*.52,y+h,z],.57,C.wood);
  if(!far){for(const dy of[1.2,h*.51])ir.box(x+side*w,y+dy,z,.96,.27,1.03,C.iron);beam(g,[x+side*w,y+h*.35,z],[x+side*w*.80,y+h*.79,z],.31,C.cut);}}
 g.box(x,y+h-.5,z,w*1.1,1.0,1.0,C.wood);
}
function rails(B,pts,far){const ir=B.get('rails','Rail'),wood=B.get('rails','Wood'),bolts=B.get('rails','Iron');
 for(let i=0;i<pts.length-1;i++){const p=pts[i],q=pts[i+1],d=G.norm([q[0]-p[0],0,q[2]-p[2]]),r=[-d[2],0,d[0]];
  for(const s of[-1,1]){const a=G.add(p,G.mul(r,1.15*s)),b=G.add(q,G.mul(r,1.15*s));a[1]+=.38;b[1]+=.38;beam(ir,a,b,.10,C.rail);}
  if(i%(far?3:1)===0){wood.place(...p,Math.atan2(-d[0],-d[2]));wood.box(0,.07,0,3.15,.21,.42,C.cut);wood.place();
   if(!far){for(const s of[-1,1]){const a=G.add(p,G.mul(r,s*1.15));bolts.box(a[0],a[1]+.29,a[2],.38,.06,.4,C.iron);}}
  }
 }
}
function cart(B,x,z){const y=floor(z)+.40,g=B.get('cart','Wood'),m=B.get('cart','Iron'),rim=B.get('cart','Rail');g.place(x,y,z);m.place(x,y,z);rim.place(x,y,z);
 // Two flanged wheelsets, axles and four wheel hubs support an OPEN tapered tub.
 for(const zz of[-1.18,1.18]){m.tube([-1.48,.52,zz],[1.48,.52,zz],.12,C.iron,8);for(const s of[-1,1]){m.tube([s*1.07,.52,zz],[s*1.35,.52,zz],.55,C.iron,16);rim.tube([s*1.01,.52,zz],[s*1.08,.52,zz],.62,C.rail,16);rim.tube([s*1.34,.52,zz],[s*1.43,.52,zz],.19,C.rail,10);}}
 for(const xx of[-.95,.95])m.box(xx,.62,0,.2,.35,3.8,C.iron);
 for(let zz=-1.65;zz<1.66;zz+=.42)g.box(0,.89,zz,2.3,.20,.40,C.wood);
 for(const s of[-1,1]){g.quad([s*1.16,1.02,-1.9],[s*1.56,2.66,-1.9],[s*1.56,2.66,1.9],[s*1.16,1.02,1.9],C.wood);g.quad([s*1.04,1.02,1.78],[s*1.43,2.66,1.78],[s*1.43,2.66,-1.78],[s*1.04,1.02,-1.78],C.cut);g.quad([-1.16,1.02,s*1.90],[1.16,1.02,s*1.90],[1.56,2.66,s*1.90],[-1.56,2.66,s*1.90],C.wood);g.quad([-1.43,2.66,s*1.78],[1.43,2.66,s*1.78],[1.04,1.02,s*1.78],[-1.04,1.02,s*1.78],C.cut);
  m.box(s*1.51,2.60,0,.2,.2,3.98,C.iron);m.box(0,2.60,s*1.87,3.15,.2,.24,C.iron);
  for(const zz of[-1.84,0,1.84])beam(m,[s*1.2,1.0,zz],[s*1.58,2.64,zz],.085,C.iron);
 }
 for(const zz of[-2.05,2.05]){m.box(0,.68,zz,.85,.4,.25,C.iron);m.tube([0,.89,zz],[0,.89,zz+Math.sign(zz)*.48],.10,C.iron,8);}
 g.place();m.place();rim.place();
}
function mineral(B,x,y,z,side,seed,far){const r=G.rng(seed),g=B.get('ore','Ore'),base=B.get('ore');const baseY=x>29&&z>-195&&z<-130?floor(-156)-(x-27)/24:floor(z);rock(base,x,baseY,z,2.3,3.4,3.0,seed);y=baseY+.5;
 for(let i=0;i<(far?2:7);i++){const zz=z+(r()-.5)*4,yy=y+r()*3,xx=x-side*(.4+r()*.9),col=i%3===0?C.violet:i%3===1?C.jade:C.ore;
  const points=[[xx-side*.15,yy,zz-.35],[xx-side*.6,yy+1,zz-.25],[xx-side*(1.4+r()),yy+1.5,zz+.3],[xx-side*.5,yy+.3,zz+.65]];
  g.tri(points[0],points[1],points[2],col);g.tri(points[0],points[2],points[3],G.blend(col,C.rock,.2));g.tri(points[1],points[3],points[2],col);g.tri(points[0],points[3],points[1],G.blend(col,C.rock,.35));
 }
}
function lamp(B,x,y,z,lights,far){const g=B.get('lamps','Iron'),l=B.get('lamps','Lamp');g.box(x,y,z,.22,4.5,.22,C.iron);g.box(x,y+4.4,z,1.45,.13,1.0,C.iron);g.box(x,y+5.6,z,1.6,.16,1.1,C.iron);l.box(x,y+4.6,z,.96,.90,.66,C.lamp);if(!far)for(const s of[-1,1])g.box(x+s*.6,y+4.5,z,.10,1.2,.82,C.iron);lights.push([x,y+5.0,z]);}
function build(far=false){const B=bank(far),R=G.rng(280929),lights=[];cavern(B,far);
 for(let z=82;z>-320;z-=far?30:15)support(B,z,far);
 rails(B,far?route.filter((_,i)=>i%3===0):route,far);
 const siding=G.spline([[center(-89),-89],[-6,-120],[-7,-148],[-7,-186]],2).map(([x,z])=>[x,floor(z),z]);rails(B,siding,far);
 const branch=G.spline([[center(-126),-126],[6,-146],[27,-156],[50,-163],[92,-176]],2).map(([x,z])=>[x,x<27?floor(z):floor(-156)-G.clamp((x-27)/72,0,1)*3,z]);rails(B,branch,far);
 if(!far){cart(B,-7,-146);const ir=B.get('points','Iron');beam(ir,[-1,floor(-104)+.4,-104],[-5,floor(-120)+.4,-120],.065,C.rail);ir.box(-6,floor(-111),-111,.8,.7,1.0,C.iron);beam(ir,[-6,floor(-111)+.5,-111],[-6.5,floor(-111)+2,-111],.09,C.iron);}
 for(let z=73;z>-315;z-=29){const x=center(z),w=width(z);lamp(B,x-w+1.4,floor(z),z,lights,far);if(!far&&z%2)lamp(B,x+w-1.3,floor(z),z-8,lights,far);}
 // Lower support frames follow the branch's narrowing and inclined floor.
 for(const x of[40,55,70,85]){const t=(x-27)/72,y=floor(-156)-t*3,z=-156-t*22,w=18-t*12-1,g=B.get('branchFrames','Wood'),m=B.get('branchFrames','Iron');
  for(const side of[-1,1]){g.box(x,y,z+side*w,.65,6.1,.65,C.wood);m.box(x,y,z+side*w,.95,.16,.95,C.iron);beam(g,[x,y+4.7,z+side*w],[x,y+6.3,z+side*(w-1.5)],.23,C.cut);}
  g.box(x,y+6.05,z,.8,.55,w*2+.8,C.wood);
 }
 for(let i=0;i<(far?6:18);i++){const t=(i+.7)/(far?7:20),x=31+t*63,z=-156-(x-27)*22/72,s=i%2?1:-1,w=18-(x-27)/72*12;rock(B.get('branchRubble'),x,floor(-156)-(x-27)/24,z+s*(w-1.7),.6,1.1+(i%3)*.5,1.1,i+300);}
 for(const zz of[-182,-177,-173])mineral(B,97,floor(-156)-1,zz,1,Math.round(-zz*8),far);
 if(!far){const m=B.get('railEnds','Iron');for(const[x,z,y]of[[-7,-186,floor(-186)],[92,-176,floor(-156)-(92-27)/24]]){m.box(x,y+.1,z,3.6,.3,.35,C.iron);for(const side of[-1,1])m.box(x+side*1.15,y+.25,z,.28,.85,.4,C.iron);}}
 for(const x of[34,57,78])lamp(B,x,floor(-156)-(x-27)/24,-156-(x-27)*22/72-5,lights,far);
 for(let z=-208;z>-317;z-=22)for(const s of[-1,1])mineral(B,center(z)+s*(width(z)-.9),floor(z)+1.2,z,s,Math.round(-z+s*1000),far);
 const rubble=B.get('rubble');for(let i=0;i<(far?36:130);i++){const z=80-R()*402,s=i%2?1:-1,x=center(z)+s*(width(z)-1.1-R()*2.1);rock(rubble,x,floor(z),z,.35+R()*1.1,.35+R()*1.7,.55+R()*1.4,i);}
 // Shallow trench beside the rail bed; no named watercourse or mineral safety claim.
 const trench=B.get('drain','Iron'),water=B.get('drain','Water','water','effects');for(let z=67;z>-126;z-=4){const x=center(z)+8.5,z1=z-4,x1=center(z1)+8.5;trench.quad([x,floor(z)+.05,z],[x1,floor(z1)+.05,z1],[x1+.85,floor(z1)+.05,z1],[x+.85,floor(z)+.05,z],C.iron);water.quad([x+.10,floor(z)+.06,z],[x1+.10,floor(z1)+.06,z1],[x1+.76,floor(z1)+.06,z1],[x+.76,floor(z)+.06,z],C.jade);}
 // An on-site sampling bench is a P prop, not Misumaru's permanent residence.
 if(!far){const g=B.get('sampling','Wood'),p=B.get('sampling','Paper');for(const x of[12.8,16.2])for(const z of[-155.4,-158.6])g.box(x,floor(-157),z,.26,2.0,.26,C.wood);g.box(14.5,floor(-157)+2,-157,4.1,.28,4.0,C.cut);p.box(13.7,floor(-157)+2.30,-156.5,1.8,.025,1.3,C.paper);
 for(let i=0;i<3;i++)rock(B.get('sampling','Ore'),15.3,floor(-157)+2.3,-157.8+i*.65,.25,.35,.25,i+233);
 const tools=B.get('tools','Iron');for(const [x,z]of[[10,-283],[65,-174]]){const y=floor(z);beam(g,[x,y,z],[x+.65,y+4,z],.12,C.wood);beam(tools,[x-.5,y+3.7,z],[x+1.7,y+3.9,z],.18,C.iron);}
 const barrels=B.get('stored','Wood');for(const [x,z]of[[-13,-137],[-15,-140]]){barrels.box(x,floor(z),z,2.5,2.1,2.6,C.wood);for(const y of[.35,1.55])B.get('stored','Iron').box(x,floor(z)+y,z,2.58,.14,2.68,C.iron);}
 }
 // Exterior threshold only: the rest of False Heaven Shelf is not claimed complete.
 const out=B.get('portal','Ground'),wall=B.get('portal','Rock');out.box(0,3.8,111,75,1.2,42,C.floor);
 const A=ring(90),frontZ=92,topY=33,left=A[0][0],right=A.at(-1)[0];
 wall.box((left-45)/2,5,87,left+45,topY-5,10,C.rock);wall.box((right+45)/2,5,87,45-right,topY-5,10,C.rock);
 for(let i=1;i<A.length-2;i++){const a=A[i],b=A[i+1];wall.quad([a[0],a[1],frontZ],[b[0],b[1],frontZ],[b[0],topY,frontZ],[a[0],topY,frontZ],C.rock);wall.quad(a,[a[0],a[1],frontZ],[b[0],b[1],frontZ],b,C.rockLight);}
 // The stepped rock fascia follows the real opening, not a beam floating in a rectangle.
 const fascia=B.get('portal','Rock');for(let i=0;i<A.length-1;i++){const a=A[i],b=A[i+1],mid=[(a[0]+b[0])/2,(a[1]+b[1])/2,92.25];if(i===0||i===A.length-2)fascia.box(mid[0],5,92.2,1.0,7,1.0,C.rockLight);else beam(fascia,[a[0],a[1]+.15,92.2],[b[0],b[1]+.15,92.2],.58,C.rockLight);}
 for(const side of[-1,1])for(let i=0;i<4;i++)rock(wall,side*(25+i*5),5,94+i%2*2,3,5+R()*7,4,i+500);
 // Localized colored haze appears only underground; interpretation is explicitly artistic.
 const mist=B.get('haze','Mist','mist','effects');for(let k=0;k<(far?4:12);k++){const z=-80-k*20,y=floor(z)+4,x=center(z),w=width(z)*.8;mist.quad([x-w,y-2,z],[x+w,y-2,z],[x+w,y+9,z],[x-w,y+9,z],k%2?C.jade:C.rose);}
 return B.finish(lights);
}
Object.assign(G,{RAINBOW_MINE:{version:'0.28.0',region:id,space,views,center,floor,width,roof,route,partialSurfaceContext:true},buildRainbowMine:build,buildRainbowMineOverview:()=>build(true)});
const old=G.buildRegion;G.buildRegion=async function(data,region,legacy){if(region!==id)return old(data,region,legacy);const t=performance.now(),p=build();p.builtMs=performance.now()-t;return p;};
})(globalThis.GA);
