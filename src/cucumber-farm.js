/* Remote kappa cucumber field: FS ch.29 pp.12–17, transcript evidence T.
 * Grounded on the existing continuous island. Site, trellises, irrigation and
 * sorting shelter are P design; no claim of an excavated route to the waterfall.
 */
(function(G){'use strict';
const ID='cucumber_farm',CX=-1960,CZ=-1310,TAU=Math.PI*2;
const C=Object.fromEntries(Object.entries({soil:'#8d8064',dry:'#aaa080',stone:'#8a8e7c',dark:'#575e51',wood:'#76684c',bamboo:'#b09e69',reed:'#817856',leaf:'#63845c',young:'#87a06a',fruit:'#466b48',flower:'#dbbc65',metal:'#687b78',water:'#708e84',roof:'#72807d',paper:'#c0b997'}).map(([k,v])=>[k,G.rgb(v)]));
const rows=[[-28,-34,29],[-15,-38,34],[-2,-35,36],[11,-30,31],[24,-24,26]].map(([z,left,right],id)=>({id,z,left,right}));
const rowZ=(r,x)=>CZ+r.z+.0014*x*x;
const approach=G.spline([[-1704,-1090],[-1777,-1085],[-1848,-1146],[-1902,-1158],[-1942,-1180],[-1950,-1233],[CX+2,CZ+53],[CX+2,CZ+37]],1.6);
const paths=[approach,G.spline([[CX+2,CZ+37],[CX+2,CZ+13],[CX+2,CZ-12],[CX+2,CZ-43],[CX+46,CZ-43]],1.0)];
const shed={x:CX+49,z:CZ+12,w:12,d:8,h:4.4};
const bounds=[CX-114,CZ-104,-1676,-1056];
const v=(label,eye,target,fov=49,extra={})=>({label,eye,target,fov,region:ID,space:'surface',era:'铃奈庵第29话 · 边远黄瓜种植地／布局P',...extra});
const views={
 cucumberOverview:v('黄瓜田 · 边远藤架田',[-2024,99,-1224],[-1959,52,-1311],47),
 cucumberRows:v('藤架 · 收获通道',[-1989,66,-1273],[-1960,51,-1310],53),
 cucumberVines:v('黄瓜 · 藤蔓与果实',[CX-15,54,CZ+15],[CX-17,52,CZ+10.5],48),
 cucumberIrrigation:v('渠首 · 蓄水与闸门',[CX+62,63,CZ+39],[CX+43,54,CZ+29],52),
 cucumberWork:v('收获棚 · 分拣与空筐',[CX+66,65,CZ+34],[shed.x,55,shed.z],51),
 cucumberRear:v('棚后 · 屋檐与承托',[CX+65,59,CZ-3],[shed.x,53,shed.z],53),
 cucumberFoot:v('田埂 · 藤架根脚',[CX-16,51,CZ-21],[CX-17,50,CZ-27],55),
 cucumberConnection:v('无名山径 · 农场来路',[-1982,84,-1160],[-1948,62,-1198],51),
 cucumberBack:v('田尾 · 排水与林缘',[CX-62,78,CZ-88],[CX,49,CZ-14],52),
 cucumberSection:v('收获棚 · 可逆揭顶',[CX+65,69,CZ+30],[shed.x,53,shed.z],52,{cucumberCutRoof:true})
};
const block={id:ID,name:'河童黄瓜田',center:[CX,52,CZ],poly:[[CX-95,CZ-80],[CX+87,CZ-80],[CX+87,CZ+72],[CX-95,CZ+72]],bottom:8,step:8};
G.DIORAMA.blocks.push(block);G.DIORAMA.map.set(ID,block);G.REGION_LABELS[ID]=block.name;
const oldOwner=G.DIORAMA.owner;G.DIORAMA.owner=(x,z)=>Math.hypot((x-CX)/94,(z-CZ)/77)<1?ID:oldOwner(x,z);
Object.assign(G.PRESETS,views);G.IMPLEMENTED[ID]='cucumberOverview';G.LANDMARKS.partial.add(ID);
G.EXTRA_REGION_DEFAULTS={...G.EXTRA_REGION_DEFAULTS,[ID]:'cucumberOverview'};
function bytes(meshes){const seen=new Set();let n=0;for(const m of meshes)for(const k of ['vertices','farVertices','instances','instanceColors','index'])if(m[k]&&!seen.has(m[k].buffer)){seen.add(m[k].buffer);n+=m[k].byteLength;}return n;}
function bank(far){const bins=new Map();return{get(mat='Wood',part='base'){const key=mat+':'+part;if(!bins.has(key))bins.set(key,{g:new G.Geometry(),mat,part});return bins.get(key).g.place();},finish(){return [...bins].filter(([,b])=>b.g.a.length).map(([k,b])=>b.g.mesh(`${ID}:${far?'overview':'detail'}:${k}`,['Leaf','Herb'].includes(b.mat)?'vegetation':b.mat==='Soil'?'roads':'architecture',{owner:ID,region:ID,space:'surface',overview:far,material:'cucumber'+b.mat,cucumberPart:b.part,basis:'P'}));}};}
function ell(g,x,y,z,rx,ry,rz,col,n=7,rings=3){const P=(i,j)=>{const a=TAU*i/n,b=Math.PI*j/rings;return[x+Math.sin(b)*Math.cos(a)*rx,y+Math.cos(b)*ry,z+Math.sin(b)*Math.sin(a)*rz];},N=p=>G.norm([(p[0]-x)/(rx*rx),(p[1]-y)/(ry*ry),(p[2]-z)/(rz*rz)]),tri=(a,b,c)=>{for(const p of[a,b,c])g.vertex(p,N(p),col);};for(let i=0;i<n;i++){const k=(i+1)%n;tri(P(i,0),P(k,1),P(i,1));for(let j=1;j<rings-1;j++){tri(P(i,j),P(k,j),P(k,j+1));tri(P(i,j),P(k,j+1),P(i,j+1));}tri(P(i,rings-1),P(k,rings-1),P(i,rings));}}
function beam(g,a,b,r,col=C.bamboo,n=5,r2=r){if(G.length(G.sub(a,b))>1e-7)g.tube(a,b,r,col,n,r2);}
// A folded, lobed leaf. Polygon fan has a raised midrib, not spherical foliage.
function leaf(g,base,angle,size,col,far){const edge=[],n=far?7:14;for(let i=0;i<n;i++){const a=TAU*i/n,r=size*(.85+.15*Math.cos(a*5)),u=Math.sin(a)*r,v=(1-Math.cos(a))*r*.75;edge.push([base[0]+Math.cos(angle)*v-Math.sin(angle)*u,base[1]+.24*v-.09*Math.abs(u),base[2]+Math.sin(angle)*v+Math.cos(angle)*u]);}const center=[base[0]+Math.cos(angle)*size*.72,base[1]+size*.25,base[2]+Math.sin(angle)*size*.72];for(let i=0;i<n;i++)g.tri(center,edge[i],edge[(i+1)%n],col);}
function fruit(g,x,y,z,size,far){const n=far?5:10,r=.12*size,h=.84*size,ts=[.035,.16,.50,.85,.965],rs=[.67,.97,1,.90,.55],P=(i,j)=>{const a=TAU*i/n,t=ts[j];return[x+.10*size*t*t+Math.cos(a)*r*rs[j],y-h*t,z+Math.sin(a)*r*rs[j]];};
 const N=(i,j)=>{const a=TAU*i/n,dy=j===0?.40:j===4?-.55:0;return G.norm([Math.cos(a),dy,Math.sin(a)]);};
 const emit=(p,norm,col)=>g.vertex(p,norm,col);
 for(let i=0;i<n;i++){const k=(i+1)%n,col=G.blend(C.fruit,C.young,i%3===0?.075:0);emit([x,y,z],[0,1,0],col);emit(P(i,0),N(i,0),col);emit(P(k,0),N(k,0),col);
  for(let j=0;j<4;j++)for(const [ii,jj] of [[i,j],[k,j],[k,j+1],[i,j],[k,j+1],[i,j+1]])emit(P(ii,jj),N(ii,jj),col);
  emit([x+.10*size,y-h,z],[0,-1,0],col);emit(P(k,4),N(k,4),col);emit(P(i,4),N(i,4),col);
 }}
function prototype(kind,far){const g=new G.Geometry(),f=new G.Geometry();const h=2.8,point=t=>[Math.sin(t*9+kind)*.13,h*t,Math.cos(t*9+kind)*.11];for(let i=0;i<(far?5:9);i++){const n=far?5:9;beam(g,point(i/n),point((i+1)/n),.024,C.young,far?3:5,.018);}
 for(let j=0;j<(far?4:8);j++){const t=.12+j*(far?.23:.115),a=kind*.6+j*2.37,p=point(t),end=[p[0]+Math.cos(a)*.22,p[1]+.13,p[2]+Math.sin(a)*.22];beam(g,p,end,.015,C.young,3,.010);leaf(g,end,a,.38+(j%3)*.075,G.blend(C.leaf,C.young,j%3*.09),far);
  if(j%3===1&&kind!==2){fruit(f,end[0],end[1]-.02,end[2],.70+(j%2)*.16,far);if(!far)for(let k=0;k<5;k++){const aa=k*TAU/5;f.tri([end[0],end[1]+.03,end[2]],[end[0]+Math.cos(aa)*.105,end[1]+.01,end[2]+Math.sin(aa)*.105],[end[0]+Math.cos(aa+.63)*.055,end[1]+.065,end[2]+Math.sin(aa+.63)*.055],C.flower);}}
  if(!far&&j%3===0){for(let k=0;k<10;k++){const p=t=>[end[0]+.17*t, end[1]+.12*Math.cos(t*TAU*1.5),end[2]+.12*Math.sin(t*TAU*1.5)];beam(g,p(k/10),p((k+1)/10),.007,C.young,3);}}
 }
 return{Leaf:g.mesh('vine','vegetation').vertices,Fruit:f.a.length?f.mesh('fruit','vegetation').vertices:new Float32Array(0)};
}
function nearTree(data,x,z,margin=0){return(data.cucumberObstacles||[]).some(p=>Math.hypot(x-p[0],z-p[1])<p[2]+margin);}
function plantSites(data){const sites=[],rand=G.rng(290013);for(const r of rows)for(let x=r.left+1.2;x<r.right;x+=2.7){if(x>-3.8&&x<7)continue;for(const side of[-1,1]){const X=CX+x,Z=rowZ(r,x)+side*.63;if(nearTree(data,X,Z,1))continue;sites.push({x:X,z:Z,row:r.id,angle:side<0?-.18:.18+Math.PI,scale:.92+rand()*.13,kind:(Math.floor(x/2.7)+r.id+90)%3});}}return sites;}
function plants(data,far,t){const sites=plantSites(data),bins=new Map(),protos=[0,1,2].map(k=>({near:prototype(k,far),far:far?null:prototype(k,true)}));for(const p of sites){const k=p.row+':'+p.kind+':'+(p.x<CX?0:1);if(!bins.has(k))bins.set(k,{kind:p.kind,ms:[],ps:[]});const b=bins.get(k),y=t.height(p.x,p.z)+.12;b.ms.push(...G.instanceMatrix(p.x,y,p.z,p.scale,p.scale,p.scale,p.angle));b.ps.push([p.x,y,p.z]);}
 const meshes=[];for(const[k,b]of bins){const ms=Float32Array.from(b.ms),cs=new Float32Array(ms.length/16*3).fill(1),lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(const p of b.ps)for(let d=0;d<3;d++){lo[d]=Math.min(lo[d],p[d]-1.6);hi[d]=Math.max(hi[d],p[d]+(d===1?3.4:1.6));}const center=lo.map((x,i)=>(x+hi[i])/2),radius=G.length(G.sub(hi,lo))/2;
  for(const mat of['Leaf','Fruit']){const a=protos[b.kind].near[mat];if(!a.length)continue;meshes.push({id:`${ID}:${far?'overview':'detail'}:vine:${k}:${mat}`,vertices:a,...(!far?{farVertices:protos[b.kind].far[mat]}:{}),instances:ms,instanceColors:cs,center,radius,owner:ID,region:ID,space:'surface',overview:far,material:'cucumber'+mat,group:'vegetation',cucumberPart:'vines',flowerKind:'cucumber',lodDistance:26,basis:'P'});}}
 return{meshes,sites};
}
function field(B,data,t,far){const dirt=B.get('Soil','beds'),bamboo=B.get('Bamboo','trellis'),sills=B.get('Stone','fieldEdges'),posts=[];for(const r of rows){for(let x=r.left;x<r.right;x+=2){const X=Math.min(x+2,r.right);if(x<7&&X>-4||nearTree(data,CX+(x+X)/2,rowZ(r,(x+X)/2),2))continue;const p=(u,d)=>[CX+u,t.height(CX+u,rowZ(r,u)+d)+.10+.16*(1-Math.abs(d)/2.35),rowZ(r,u)+d];dirt.quad(p(x,-2.35),p(x,2.35),p(X,2.35),p(X,-2.35),C.soil);}
  for(const[a,b]of[[r.left,-4],[7,r.right]]){let prev=null;for(let x=a;x<=b+.001;x+=Math.min(4,b-a)){const X=CX+x,Z=rowZ(r,x);if(nearTree(data,X,Z,2)){prev=null;continue;}const y=Math.max(t.height(X,Z-1.15),t.height(X,Z+1.15)),top=[X,y+3.25,Z];for(const d of[-1,1]){const foot=[X,t.height(X,Z+d*1.15)-.4,Z+d*1.15];beam(bamboo,foot,top,.065,C.bamboo,far?4:6,.042);posts.push(foot);if(!far)for(const h of[.5,1.4,2.3]){const u=h/3.65;const p=G.add(foot,G.mul(G.sub(top,foot),u));ell(bamboo,...p,.078,.026,.078,C.reed,6,2);}}
    if(prev){beam(bamboo,prev,top,.06);for(const h of[1.0,2.0])beam(bamboo,[prev[0],prev[1]-h,prev[2]],[top[0],top[1]-h,top[2]],.017,C.reed,3);}
    prev=top;
   }}
  for(let x=r.left;x<r.right;x+=3.7){if(x>-4&&x<7||nearTree(data,CX+x,rowZ(r,x),2.8))continue;const z=rowZ(r,x)-2.55,y=t.height(CX+x,z);ell(sills,CX+x,y-.12,z,.72,.38,.43,C.stone,far?5:7,3);}
 }return posts;}
function trough(B,data,x,z,w,d,part='irrigation'){const near=G.SurfaceContact.sampler(data,ID),far=G.SurfaceContact.sampler(data,ID,'far'),vals=[near,far].flatMap(t=>[-1,1].flatMap(a=>[-1,1].map(b=>t.height(x+a*w/2,z+b*d/2)))),base=Math.min(...vals)-.45,Y=Math.max(...vals)+.35,g=B.get('Stone',part);
 g.box(x,base,z,w,Y-base,d,C.dark);for(const side of[-1,1]){g.box(x+side*(w/2-.16),Y,z,.32,1.25,d,C.stone);g.box(x,Y,z+side*(d/2-.16),w,.95,.32,C.stone);}B.get('Water',part).box(x,Y+.44,z,w-.68,.08,d-.68,C.water);return Y;}
function irrigation(B,data,t,far){const x=CX+41,z=CZ+31,Y=trough(B,data,x,z,6,4),metal=B.get('Metal','irrigation'),wood=B.get('Wood','irrigation');
 // Mechanical handwheel is a static environmental prop, not a working pump.
 const wheel=[x-3.5,Y+1.1,z];for(let i=0;i<16;i++){const a=TAU*i/16,b=TAU*(i+1)/16;beam(metal,[wheel[0],wheel[1]+Math.cos(a)*.44,wheel[2]+Math.sin(a)*.44],[wheel[0],wheel[1]+Math.cos(b)*.44,wheel[2]+Math.sin(b)*.44],.045,C.metal,far?4:6);}for(let k=0;k<4;k++){const a=k*TAU/4;beam(metal,wheel,[wheel[0],wheel[1]+Math.cos(a)*.42,wheel[2]+Math.sin(a)*.42],.026,C.metal,4);}beam(metal,[x,Y+.65,z],wheel,.075,C.metal,6);
 const wall=B.get('Stone','channels'),water=B.get('Water','channels');const strips=[];
 for(let zz=CZ+29;zz>CZ-46;zz-=2){const h0=t.height(CX+40,zz)+.09,h1=t.height(CX+40,zz-2)+.09;for(const side of[-1,1]){const X=CX+40+side*.62;for(const off of[-.09,.09])wall.quad([X+off,h0-.12,zz],[X+off,h0+.35,zz],[X+off,h1+.35,zz-2],[X+off,h1-.12,zz-2],C.stone);wall.quad([X-.09,h0+.35,zz],[X+.09,h0+.35,zz],[X+.09,h1+.35,zz-2],[X-.09,h1+.35,zz-2],C.stone);}water.quad([CX+39.42,h0+.06,zz],[CX+40.58,h0+.06,zz],[CX+40.58,h1+.06,zz-2],[CX+39.42,h1+.06,zz-2],C.water);strips.push([CX+40,h0,zz]);}
 for(const r of rows){const zz=rowZ(r,r.right)+3.15,gateX=CX+r.right+.7,yy=t.height(gateX,zz);
  for(let x=r.right;x<40;x+=2){const X=Math.min(40,x+2),y0=t.height(CX+x,zz)+.14,y1=t.height(CX+X,zz)+.14;water.quad([CX+x,y0,zz-.43],[CX+x,y0,zz+.43],[CX+X,y1,zz+.43],[CX+X,y1,zz-.43],C.water);for(const d of[-1,1]){const z=zz+d*.55;wall.quad([CX+x,y0-.15,z],[CX+X,y1-.15,z],[CX+X,y1+.22,z],[CX+x,y0+.22,z],C.stone);wall.quad([CX+x,y0+.22,z-.08],[CX+X,y1+.22,z-.08],[CX+X,y1+.22,z+.08],[CX+x,y0+.22,z+.08],C.stone);}}
  for(const d of[-1,1])beam(wood,[gateX,yy-.3,zz+d*.64],[gateX,yy+.90,zz+d*.64],.085,C.wood);wood.box(gateX,yy+.09,zz,.13,.45,1.15,C.wood);beam(wood,[gateX,yy+.72,zz-.65],[gateX,yy+.72,zz+.65],.065,C.wood);
 }
 // A short supported footbridge carries the sorting-shed path over the open ditch.
 const crossing=G.spline([[CX+2,CZ+37],[CX+24,CZ+28],[shed.x-1,shed.z+6.8]],1.1).reduce((a,b)=>Math.abs(b[0]-(CX+40))<Math.abs(a[0]-(CX+40))?b:a),bn=G.SurfaceContact.sampler(data,ID),bf=G.SurfaceContact.sampler(data,ID,'far'),deck=Math.max(...[bn,bf].flatMap(q=>[-1.8,1.8].map(dx=>q.height(CX+40+dx,crossing[1]))))+.55;
 const bridge=B.get('Wood','bridge');for(const d of[-1,1]){const xx=CX+40+d*1.8,base=Math.min(bn.height(xx,crossing[1]),bf.height(xx,crossing[1]))-.2;bridge.box(xx,base,crossing[1],.30,deck-base,3.6,C.wood);}
 for(let j=0;j<9;j++)bridge.box(CX+40,deck,crossing[1]-1.6+j*.40,4.2,.15,.37,C.dry);
 for(const d of[-1,1])bridge.box(CX+40+d*2.5,deck-.25,crossing[1],1,.25,3.7,C.wood);
 return{reservoir:[x,Y,z],channels:strips,footbridge:[CX+40,deck,crossing[1]],flowSimulated:false};}
function crate(g,x,y,z,w=1.5){g.box(x,y,z,w,.12,w*.72,C.wood);for(const side of[-1,1]){for(let j=0;j<3;j++)g.box(x,y+.18+j*.23,z+side*w*.34,w,.15,.09,C.dry);for(let k=0;k<3;k++)g.box(x+side*w*.47,y+.18+k*.23,z,.08,.15,w*.72,C.wood);}for(const a of[-1,1])for(const b of[-1,1])g.box(x+a*w*.43,y,z+b*w*.28,.10,.86,.10,C.wood);}
function shelter(B,data,t,far){const n=G.SurfaceContact.sampler(data,ID),f=G.SurfaceContact.sampler(data,ID,'far'),s=shed,feet=[];for(const a of[-1,1])for(const b of[-1,1]){const x=s.x+a*s.w/2,z=s.z+b*s.d/2;feet.push([x,Math.min(n.height(x,z),f.height(x,z))-.6,z]);}const floor=Math.max(...[n,f].flatMap(g=>[-1,1].flatMap(a=>[-1,1].map(b=>g.height(s.x+a*s.w/2,s.z+b*s.d/2)))))+.30;
 const under=z=>floor+s.h+(5.1-(z-s.z))*1.5/10.2-.20,roofSupports=feet.map(p=>[p[0],under(p[2]),p[2]]);
 const stone=B.get('Stone','foundation'),wood=B.get('Wood','shed'),roof=B.get('Roof','roof');for(const p of feet){stone.box(p[0],p[1],p[2],.85,floor-p[1],.85,C.stone);wood.box(p[0],floor,p[2],.29,under(p[2])-floor,.29,C.wood);}wood.box(s.x,floor,s.z,s.w+.3,.22,s.d+.3,C.wood);for(const d of[-1,1])wood.box(s.x,floor-.32,s.z+d*(s.d/2-.35),s.w+.2,.40,.32,C.wood);for(let x=-s.w/2+1;x<s.w/2;x+=1.8)wood.box(s.x+x,floor-.18,s.z,.15,.22,s.d+.1,C.wood);
 for(const b of[-1,1])wood.box(s.x,under(s.z+b*s.d/2)-.3,s.z+b*s.d/2,s.w+.5,.30,.28,C.wood);
 for(const a of[-1,1])beam(wood,[s.x+a*s.w/2,under(s.z-4)-.13,s.z-4],[s.x+a*s.w/2,under(s.z+4)-.13,s.z+4],.15,C.wood,6);
 for(let x=-6;x<=6;x+=2)beam(wood,[s.x+x,under(s.z-5)-.085,s.z-5],[s.x+x,under(s.z+5)-.085,s.z+5],.095,C.wood,6);
 // Back and side braces are structural and fully modeled, leaving front access clear.
 for(const a of[-1,1]){beam(wood,[s.x+a*s.w/2,floor+.25,s.z-s.d/2],[s.x+a*s.w/2,floor+s.h-.4,s.z+s.d/2],.075,C.wood,5);beam(wood,[s.x+a*s.w/2,floor+s.h-1.6,s.z+s.d/2],[s.x+a*(s.w/2-1.3),floor+s.h-.2,s.z+s.d/2],.065,C.wood,5);}
 for(let x=-s.w/2;x<=s.w/2;x+=1.4)wood.box(s.x+x,floor+.3,s.z-s.d/2,.16,1.7,.13,C.reed);
 const roofY=floor+s.h,points=[[-7.2,0,5.1],[7.2,0,5.1],[7.2,1.5,-5.1],[-7.2,1.5,-5.1]];const world=p=>[p[0]+s.x,p[1]+roofY,p[2]+s.z];roof.quad(...points.map(world),C.roof);roof.quad(...points.slice().reverse().map(p=>world([p[0],p[1]-.20,p[2]])),C.dark);for(let i=0;i<4;i++){const a=points[i],b=points[(i+1)%4];roof.quad(world(a),world(b),world([b[0],b[1]-.20,b[2]]),world([a[0],a[1]-.20,a[2]]),C.metal);}
 for(let x=-7;x<7.1;x+=far?1.4:.70)beam(roof,[s.x+x,roofY+.055,s.z+5.1],[s.x+x,roofY+1.55,s.z-5.1],.045,C.metal,4);
 // Short steps, backed all the way to terrain. Not a floating stair decal.
 const routeEnd=[s.x-1,floor,s.z+5.2],ground=t.height(...[routeEnd[0],routeEnd[2]+2.4]);for(let i=0;i<4;i++){const y=G.mix(ground,floor,(i+1)/4),z=s.z+6.8-i*.55,base=Math.min(n.height(s.x-1,z),f.height(s.x-1,z))-.4;stone.box(s.x-1,base,z,4,y-base,.62,C.stone);}
 if(!far){for(let x=-s.w/2;x<s.w/2;x+=.62)wood.box(s.x+x,floor+.222,s.z,.012,.016,s.d,C.dark);const props=B.get('Wood','props'),metal=B.get('Metal','props'),produce=B.get('Fruit','produce');
  props.box(s.x+2,floor+1.3,s.z-1,6,.16,2.3,C.wood);for(const a of[-1,1])for(const b of[-1,1])props.box(s.x+2+a*2.6,floor+.22,s.z-1+b*.85,.16,1.1,.16,C.wood);
  for(const[x,z]of[[-4,-2.2],[-2,-2.2],[-4,0],[-2,0]]){crate(props,s.x+x,floor+.24,s.z+z);for(let j=0;j<3;j++)fruit(produce,s.x+x+(j-1)*.22,floor+1.02,s.z+z,.62,false);}
  crate(props,s.x+2,floor+1.47,s.z-1,1.3);props.box(s.x-4,floor+.24,s.z+2,1.6,.15,1.2,C.wood);for(const d of[-1,1]){ell(metal,s.x-4+d*.68,floor+.25,s.z+2,.13,.26,.26,C.metal,8,3);beam(props,[s.x-4+d*.65,floor+.45,s.z+2],[s.x-4+d*.65,floor+1.25,s.z+3.8],.065,C.wood,5);}
  // Closed field notebook is only a small P prop, not an invented page from the grimoire.
  props.box(s.x+4,floor+1.48,s.z-1,1.1,.14,.8,C.paper);
 }
 return{...s,floor,feet,roofSupports,access:routeEnd,fullInterior:false};}
function border(B,t,data,far){const wood=B.get('Wood','border'),leaves=B.get('Leaf','border'),herbs=B.get('Herb','herbs'),sites=[];
 const rand=G.rng(290315);for(let i=0;i<150&&sites.length<19;i++){const zone=i%3,a=rand()*TAU,x=CX+(zone===0?-80+rand()*22:zone===1?-37+rand()*100:68+rand()*17),z=CZ+(zone===0?-48+rand()*75:zone===1?-76+rand()*19:-27+rand()*44);if(Math.hypot(x-shed.x,z-shed.z)<25||nearTree(data,x,z,6)||sites.some(p=>Math.hypot(x-p[0],z-p[2])<8))continue;const y=t.height(x,z),size=6.8+rand()*4.2;beam(wood,[x,y-.5,z],[x+.3,y+size,z],.17,C.wood,5,.08);for(let j=0;j<3;j++){const aa=a+j*2.1,end=[x+Math.cos(aa)*size*.32,y+size*(.71+j*.1),z+Math.sin(aa)*size*.32];beam(wood,[x,y+size*.45,z],end,.085,C.wood,5,.025);ell(leaves,...end,size*.40,size*.25,size*.37,G.blend(C.leaf,C.young,j*.07),far?6:10,far?3:5);}sites.push([x,y,z]);}
 if(!far)for(let i=0;i<35;i++){const a=i*2.399,x=CX+Math.cos(a)*[46,66,77][i%3],z=CZ+Math.sin(a)*[43,55,65][i%3];if(nearTree(data,x,z,1))continue;const y=t.height(x,z);for(let j=0;j<5;j++)leaf(herbs,[x,y+.1,z],a+j*1.25,.46,C.young,true);}
 return sites;}
function build(data,far=false){const B=bank(far),t=G.SurfaceContact.sampler(data,ID,far?'far':'near'),posts=field(B,data,t,far),ir=irrigation(B,data,t,far),hs=shelter(B,data,t,far),trees=border(B,t,data,far),pl=plants(data,far,t),meshes=[...B.finish(),...pl.meshes];return{id:ID,meshes,bytes:bytes(meshes),signs:[],meta:{basis:'P',locations:[ID],plants:pl.sites,posts,trees,shelter:hs,irrigation:ir,terrainMutation:false,fullTransportConnection:false,factory:false,physicalPortal:false,fullFarm:false}};}
function roads(data,pack){const sample=G.ASAMA.sampleRenderedTerrain(pack),bins=new Map(),all=[...paths,G.spline([[CX+2,CZ+37],[CX+24,CZ+28],[shed.x-1,shed.z+6.8]],1.1),G.spline([[CX+2,CZ-43],[CX+40,CZ-43]],1.1)],cross=[-1.3,-1,-.5,0,.5,1,1.3];
 for(const lod of['near','far'])for(let k=0;k<all.length;k++){const ps=all[k],width=k===0?1.50:1.55;const row=i=>{const p=ps[i],a=ps[Math.max(0,i-1)],b=ps[Math.min(ps.length-1,i+1)],d=G.norm([b[0]-a[0],0,b[1]-a[1]]);return cross.map(u=>{const q=sample(p[0]-d[2]*width*u,p[1]+d[0]*width*u,lod),edge=1-G.smooth(.86,1.3,Math.abs(u)),join=k===0?G.smooth(0,16,i):1;q.c=G.blend(q.c,G.blend(G.rgb('#a19575'),C.dry,join),edge);q.p[1]+=.13+.12*edge;return q;});};let a=row(0);for(let i=0;i<ps.length-1;i++){const b=row(i+1),src=a[3].tile,key=src.id;if(!bins.has(key))bins.set(key,{g:new G.Geometry(),src});const g=bins.get(key).g;for(let j=0;j<cross.length-1;j++)for(const tri of[[a[j],b[j+1],b[j]],[a[j],a[j+1],b[j+1]]])for(const q of tri)g.vertex(q.p,q.n,q.c);a=b;}}
 return [...bins.values()].map(({g,src})=>{const m=g.mesh(ID+':public:'+src.id,'roads',{owner:ID,region:ID,space:'surface',overview:true,globalSurface:true,globalNear:src.globalNear,globalFar:src.globalFar,material:'cucumberPath',cucumberPart:'path',basis:'P',terrainSource:src.id});return{...m,center:src.center.slice(),radius:Math.max(src.radius+4,m.radius+G.length(G.sub(m.center,src.center)))};});}
function prepare(data,pack){G.SurfaceContact.prepare(data,pack,ID,bounds);const old=new Map();for(const m of pack.meshes){if(!m.instances||m.group!=='vegetation'||m.flowerKind)continue;for(let i=0;i<m.instances.length;i+=16){const x=m.instances[i+12],z=m.instances[i+14];if(x<bounds[0]||x>bounds[2]||z<bounds[1]||z>bounds[3])continue;old.set(x.toFixed(3)+','+z.toFixed(3),[x,z,3.2]);}}data.cucumberObstacles=[...old.values()];}
G.CUCUMBER={id:ID,version:'0.29-cucumber.1',views,CX,CZ,rows,rowZ,paths,shed,bounds,build,roads,prepare,plantSites,bytes};
G.extraOverviewBuilders=[...(G.extraOverviewBuilders||[]),(data,pack)=>{prepare(data,pack);return [...build(data,true).meshes,...roads(data,pack)];}];
const previous=G.buildRegion;G.buildRegion=async(data,id,legacy)=>{if(id!==ID)return previous(data,id,legacy);const start=performance.now(),p=build(data);p.builtMs=performance.now()-start;return p;};
})(globalThis.GA);
