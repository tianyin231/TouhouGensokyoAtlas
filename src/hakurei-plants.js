/* 博丽神社植栽：保留既有点位，以枝条、透光叶簇和林下层代替封闭树冠。
 * 叶簇均为六顶点四边形；hakurei-renderer 按 leafCards 标记补共享 UV。
 */
(function(G){'use strict';
const {Geometry,rgb,blend,add,sub,mul,norm,cross,clamp,smooth}=G,TAU=Math.PI*2;
const bark=rgb('#84735c'),white=[1,1,1];

function branch(g,a,b,r0,r1,far=false,sides=null){
 const axis=norm(sub(b,a)),right=norm(cross(axis,Math.abs(axis[1])>.9?[1,0,0]:[0,1,0])),up=cross(axis,right),N=sides||(far?5:8);
 const p=(q,end)=>{const n=add(mul(right,Math.cos(q)),mul(up,Math.sin(q)));return{p:add(end?b:a,mul(n,end?r1:r0)),n};};
 for(let i=0;i<N;i++){const a=p(i*TAU/N,0),b=p((i+1)*TAU/N,0),c=p((i+1)*TAU/N,1),d=p(i*TAU/N,1);for(const tri of[[b,a,d],[b,d,c]])for(const v of tri)g.vertex(v.p,v.n,bark);}
}

function card(g,p,w,h,yaw,tilt,color=white){
 const u=[Math.cos(yaw)*w*.5,0,Math.sin(yaw)*w*.5];
 const v=[Math.sin(yaw)*Math.cos(tilt)*h*.5,Math.sin(tilt)*h*.5,-Math.cos(yaw)*Math.cos(tilt)*h*.5];
 const n=norm(cross(u,v)),points=[sub(sub(p,u),v),sub(add(p,u),v),add(add(p,u),v),add(sub(p,u),v)];
 // 同一簇的法线轻轻朝上，避免俯视时随机竖片形成黑色棋盘。
 const normal=norm([n[0]*.7,Math.abs(n[1])+.25,n[2]*.7]);
 for(const i of[0,1,2,0,2,3])g.vertex(points[i],normal,color);
}

function spray(g,p,r,R,far=false,needle=false){
 const count=needle?9:15;
 for(let i=0;i<count;i++){
  const a=R()*TAU,b=R()*2-1,d=Math.sqrt(R())*r;
  const q=[p[0]+Math.cos(a)*d,p[1]+b*r*.84,p[2]+Math.sin(a)*d];
  const yaw=R()*TAU,tilt=.30+R()*1.23,w=r*(needle?1.78:1.46)*(1+R()*.3),shade=.79+R()*.27;
  if(far&&i%(needle?2:3)!==0)continue;
  const size=w*(far?1.23:1);
  card(g,q,size,size*(needle?.91:.95),yaw,tilt,[shade,shade,shade]);
 }
}

function tree(kind,variant,far){
 const R=G.rng(70391+variant*1709+(kind==='cherry'?31:kind==='cedar'?67:101));
 const wood=new Geometry(),leaf=new Geometry(),cedar=kind==='cedar',H=cedar?15+R()*1.9:10.0+R()*1.2;
 const lean=[(R()-.5)*.7,0,(R()-.5)*.8],at=y=>[lean[0]*y/H,y,lean[2]*y/H];
 const trunk=cedar?[0,H*.34,H*.70,H]:[0,2.3,4.6,H*.86];
 for(let i=1;i<trunk.length;i++)branch(wood,at(trunk[i-1]),at(trunk[i]),(cedar?.39:.55)*(1-trunk[i-1]/(H*1.05)),Math.max(.035,(cedar?.39:.55)*(1-trunk[i]/(H*1.05))),far);
 if(cedar){
  // 高低、方位和长度错开，保留侧枝间透光缝，而不是等距套叠圆锥。
  for(let i=0;i<29;i++){
   const u=i/29,y=2.5+u*(H-3.0)+(R()-.5)*.65,a=i*2.39996+R()*.60;
   const length=(1-u)*3.5+.32+R()*.65,base=at(y),elbow=[Math.cos(a)*length*.48,y-.23-R()*.32,Math.sin(a)*length*.48];
   const tip=[Math.cos(a)*length,y+.15+R()*.45,Math.sin(a)*length];
   branch(wood,base,elbow,.085*(1-u)+.027,.044,far);branch(wood,elbow,tip,.044,.009,far);
   for(let j=0;j<3;j++){
    const f=.42+j*.26,q=base.map((v,k)=>G.mix(v,tip[k],f));q[1]-=.16;
    const radius=(.91-u*.49)*(1+j*.08);
    spray(leaf,q,radius,R,far,true);
    if(!far){const s=j%2?1:-1,twig=add(q,[-Math.sin(a)*radius*s,.17,Math.cos(a)*radius*s]);branch(wood,q,twig,.024,.006);}
   }
  }
  spray(leaf,at(H-.2),.77,R,far,true);
 }else{
  // 樱树较横向舒展，杂木分叉高低更错落；冠心始终有真实树枝。
  const cherry=kind==='cherry',limbs=8;
  for(let i=0;i<limbs;i++){
   const a=i*2.39996+R()*.45,length=3.1+R()*1.9,y=H*.60+R()*2.6;
   const base=at(2.3+(i%3)*.65),elbow=[Math.cos(a)*length*.53,y-1.55,Math.sin(a)*length*.53];
   const end=[Math.cos(a)*length,y,Math.sin(a)*length];
   branch(wood,base,elbow,.22-(i%3)*.025,.105,far);branch(wood,elbow,end,.105,.038,far);
   for(let j=0;j<3;j++){
    const aa=a+(j-1)*.61,rr=length+.5+R()*1.0;
    const tip=[Math.cos(aa)*rr,y+.25+R()*1.25+(cherry?j*.17:j*.52),Math.sin(aa)*rr];
    branch(wood,elbow,tip,.054,.012,far);
    spray(leaf,tip,cherry?1.16:1.27,R,far);
   }
   spray(leaf,[end[0]*.94,end[1]+.18,end[2]*.94],cherry?.95:1.09,R,far);
  }
  spray(leaf,[lean[0],H+.15,lean[2]],1.32,R,far);
 }
 return{wood:wood.mesh('wood').vertices,leaf:leaf.mesh('leaf').vertices};
}

function shrub(variant,far){
 const g=new Geometry(),R=G.rng(8613+variant*431);
 for(let i=0;i<5;i++){const a=i*2.4,r=.22+R()*.39;const p=[Math.cos(a)*r,.55+R()*.47,Math.sin(a)*r];spray(g,p,.48,R,far);}
 return g.mesh('shrub').vertices;
}

function grasses(variant,far){
 const g=new Geometry(),R=G.rng(311+variant*871);
 for(let i=0;i<13;i++){
  const a=R()*TAU,r=R()*.46,p=[Math.cos(a)*r,-.035,Math.sin(a)*r],h=.28+R()*.55,w=.028+R()*.042;
  const v=[Math.cos(a),0,Math.sin(a)],side=[-v[2]*w,0,v[0]*w],mid=add(p,[v[0]*h*.17,h*.62,v[2]*h*.17]),tip=add(p,[v[0]*h*.52,h*.86,v[2]*h*.52]);
  const c=[.78+R()*.21,.88+R()*.12,.76+R()*.17];
  if(far&&i%4!==0)continue;
  const A=sub(p,side),B=add(p,side),C=add(mid,mul(side,.57)),D=sub(mid,mul(side,.57));
  g.quad(A,B,C,D,c);g.tri(D,C,tip,c);
 }
 return g.mesh('grasses').vertices;
}

// 外围只替换既有树位。稀疏模型与核心共用叶卡材质，但保留原公共树的高度。
const transitionCache=new Map();
function transitionSpray(g,p,r,R,nearCount,farCount,far,needle){
 const keep=new Set(Array.from({length:farCount},(_,i)=>Math.floor(i*nearCount/farCount))),phase=R()*TAU;
 for(let i=0;i<nearCount;i++){
  const a=phase+i*2.39996,d=r*(.22+Math.sqrt(R())*.52),dy=(R()-.5)*r*.95;
  const width=r*(1.22+R()*.30),yaw=a+R()*.5,tilt=.32+R()*1.16,shade=(far?.92:.80)+R()*(far?.13:.25);
  if(far&&!keep.has(i))continue;
  const spread=far?.80:1,size=width*(far?1.43:1);
  card(g,[p[0]+Math.cos(a)*d*spread,p[1]+dy*spread,p[2]+Math.sin(a)*d*spread],size,size*(needle?.88:.95),yaw,tilt,[shade,shade,shade]);
 }
}
function transition(kind,variant=0,far=false){
 const key=kind+':'+variant+':'+far;if(transitionCache.has(key))return transitionCache.get(key);
 const wood=new Geometry(),leaf=new Geometry(),cedar=kind==='cedar',R=G.rng(45017+variant*271+(cedar?0:1049));
 if(cedar){
  const H=16.8,lean=(R()-.5)*.6,at=y=>[lean*y/H,y,Math.sin(y*.14)*.15];
  const levels=[0,5.2,10.7,H];
  for(let i=1;i<levels.length;i++)branch(wood,at(levels[i-1]),at(levels[i]),.40*(1-levels[i-1]/18),.40*(1-levels[i]/18),far,far?4:5);
  for(let i=0;i<12;i++){
   const u=i/12,y=3.0+u*12.6+(R()-.5)*.4,a=i*2.39996+R()*.32,len=3.9*(1-u)+.42;
   const base=at(y),tip=[Math.cos(a)*len,y+.20+R()*.36,Math.sin(a)*len];
   if(!far)branch(wood,base,tip,.095*(1-u)+.025,.012,false,4);
   // 远景预算用于连续叶体积；侧枝隐藏在簇内，不绘制一整副裸枝骨架。
   const reach=far?.56:.77,p=[tip[0]*reach,tip[1],tip[2]*reach],r=(1.54-u*.74)*(far?1.22:1);
   transitionSpray(leaf,p,r,R,11,6,far,true);
  }
  transitionSpray(leaf,at(16.0),far?.82:.71,R,8,6,far,true);
 }else{
  const lean=(R()-.5)*.65,A=[0,0,0],B=[lean,4.9,.15],C=[lean*.55,9.1,-.18];
  branch(wood,A,B,.57,.34,far,far?4:6);branch(wood,B,C,.34,.16,far,far?4:6);
  for(let i=0;i<7;i++){
   const a=i*2.39996+R()*.36,r=3.55+R()*1.65,y=13.3+R()*2.15;
   const base=[lean,6.2+(i%3)*.55,.1],elbow=[Math.cos(a)*r*.52,11.0+(i%2)*.55,Math.sin(a)*r*.52],tip=[Math.cos(a)*r,y,Math.sin(a)*r];
   if(far){if(i%2===0)branch(wood,base,tip,.20,.025,true,3);}
   else{branch(wood,base,elbow,.20,.095,false,4);branch(wood,elbow,tip,.095,.025,false,4);}
   const p=far?[tip[0]*.90,tip[1],tip[2]*.90]:tip;
   transitionSpray(leaf,p,far?1.87:1.63,R,17,9,far,false);
  }
  transitionSpray(leaf,[lean,16.0,0],far?1.55:1.42,R,14,7,far,false);
 }
 const model={wood:wood.mesh('transition-wood').vertices,leaf:leaf.mesh('transition-leaf').vertices};
 transitionCache.set(key,model);return model;
}
G.HAKUREI_PLANTS={transition};

// 近景总览地面为 4m 网格内的中心扇形三角；植栽落点使用同一平面插值。
function ground(t,x,z){
 const x0=Math.floor(x/4)*4,z0=Math.floor(z/4)*4,u=(x-x0)/4,v=(z-z0)/4;
 const h=[t.height(x0,z0),t.height(x0+4,z0),t.height(x0+4,z0+4),t.height(x0,z0+4)],c=t.height(x0+2,z0+2);
 if(v<=u&&v<=1-u)return h[0]*(1-u-v)+h[1]*(u-v)+c*2*v;
 if(u>=v&&u>=1-v)return h[1]*(u-v)+h[2]*(u+v-1)+c*2*(1-u);
 if(v>=u&&v>=1-u)return h[2]*(u+v-1)+h[3]*(v-u)+c*2*(1-v);
 return h[3]*(v-u)+h[0]*(1-u-v)+c*2*u;
}

function edgeDistance(poly,x,z){
 let d=Infinity;for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],dx=b[0]-a[0],dz=b[1]-a[1],u=clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz),0,1);d=Math.min(d,Math.hypot(x-a[0]-dx*u,z-a[1]-dz*u));}return d;
}
function court(x,z){return x>1561&&x<1680&&z>106&&z<214;}
function clearGround(poly,x,z){
 return G.DIORAMA.inside(poly,x,z)&&!court(x,z)&&!(x<1568&&Math.abs(z-160)<12)&&Math.hypot((x-1693)/16,(z-201)/12)>1;
}

G.hakureiPlanting=function(t,sites){
 const poly=G.DIORAMA.map.get('hakurei').poly,bins=new Map(),R=G.rng(197241),trees=[],roots=new Geometry(),rocks=new Geometry();
 const definitions=new Map();
 function put(kind,variant,x,y,z,scale,yaw,color){
  const key=kind+':'+variant+':'+Math.floor(x/96)+':'+Math.floor(z/96);
  if(!bins.has(key))bins.set(key,{kind,variant,m:[],c:[],p:[],scale:0});const b=bins.get(key);
  b.m.push(...G.instanceMatrix(x,y,z,scale,scale,scale,yaw));b.c.push(...color);b.p.push([x,y,z]);b.scale=Math.max(b.scale,scale);
 }
 function def(kind,variant){const key=kind+':'+variant;if(!definitions.has(key))definitions.set(key,kind==='shrub'||kind==='grass'?{near:{leaf:(kind==='shrub'?shrub:grasses)(variant,false)},far:{leaf:(kind==='shrub'?shrub:grasses)(variant,true)}}:{near:tree(kind,variant,false),far:tree(kind,variant,true)});return definitions.get(key);}
 // 完整保留核心树和区域内原点位，周边只去掉互相挤压的重复落点。
 for(let i=0;i<sites.length;i++){
  const p=sites[i];if(!G.DIORAMA.inside(poly,p.x,p.z))continue;
  if(i>8&&trees.some(q=>Math.hypot(p.x-q.x,p.z-q.z)<5.5))continue;
  const kind=p.type==='cedar'?'cedar':p.type==='cherry'?'cherry':'broadleaf',variant=i%3,scale=(p.scale||1)*.87;
  const y=court(p.x,p.z)?Math.max(ground(t,p.x,p.z),180.28):ground(t,p.x,p.z)-.08;
  const color=rgb(kind==='cherry'?['#d8b4bd','#e5c6cc','#cc9fae'][variant]:kind==='cedar'?['#536d47','#5a7148','#506a46'][variant]:['#71844c','#617a43','#7b8d53'][variant]);
  put(kind,variant,p.x,y,p.z,scale,R()*TAU,color);trees.push(p);
  // 外露根随坡面转折，不把一个平底树根模板悬在坡上。
  for(let j=0;j<5;j++){
   const a=j*2.4+R(),r=(1.15+R()*.65)*scale,X=p.x+Math.cos(a)*r,Z=p.z+Math.sin(a)*r;
   const h=court(X,Z)?Math.max(ground(t,X,Z),180.27):ground(t,X,Z);
   branch(roots,[p.x,y+.45*scale,p.z],[G.mix(p.x,X,.48),G.mix(y,h,.48)+.08,G.mix(p.z,Z,.48)],.16*scale,.095*scale);
   branch(roots,[G.mix(p.x,X,.48),G.mix(y,h,.48)+.08,G.mix(p.z,Z,.48)],[X,h-.05,Z],.095*scale,.012*scale);
  }
 }
 // 成片林下层有疏密过渡；中轴、台基、池塘及石阶保持净空。
 for(let z=80;z<248;z+=2.55)for(let x=1510;x<1725;x+=2.55){
  const X=x+(R()-.5)*1.7,Z=z+(R()-.5)*1.7;
  if(!clearGround(poly,X,Z))continue;
  const edge=smooth(1.4,10,edgeDistance(poly,X,Z)),patch=G.noise(X*.071,Z*.067);
  if(R()>edge*(.36+patch*.62))continue;
  const y=ground(t,X,Z)-.035,variant=Math.floor(R()*3),scale=.76+R()*1.02;
  put('grass',variant,X,y,Z,scale,R()*TAU,blend(rgb('#667343'),rgb('#91945a'),R()*.55));
  if(R()<.20&&patch>.32&&edge>.6&&!trees.some(p=>Math.hypot(X-p.x,Z-p.z)<1.5))put('shrub',variant,X,y,Z,.9+R()*1.2,R()*TAU,blend(rgb('#52693e'),rgb('#7e884a'),R()*.55));
  if(R()<.034&&edge>.75){
   const s=.45+R()*.8,c=blend(rgb('#717761'),rgb('#959680'),R()*.4);
   rocks.ellipsoid(X,y-.16,Z,s,.33+s*.35,s*.72,c,7,4);
  }
 }
 const out=[];
 for(const[key,b]of bins){
  const d=def(b.kind,b.variant),low=b.kind==='grass'||b.kind==='shrub';
  const center=b.p.reduce((sum,p)=>sum.map((v,k)=>v+p[k]/b.p.length),[0,0,0]);center[1]+=(low?1:8)*b.scale;
  const radius=Math.max(...b.p.map(p=>G.length(sub(p,center))))+(low?3:17)*b.scale;
  const instances=new Float32Array(b.m),colors=new Float32Array(b.c),plain=new Float32Array(b.c.length).fill(1);
  for(const part of low?['leaf']:['wood','leaf']){
   const material=part==='wood'?'hakureiBark':b.kind==='cherry'?'hakureiCherry':b.kind==='cedar'?'hakureiNeedle':b.kind==='grass'?'hakureiMoss':'hakureiLeaf';
   out.push({id:'hakurei:plants:'+key+':'+part,owner:'hakurei',region:'hakurei',group:'vegetation',material,component:low?'shrine-understory':'shrine-canopy',leafCards:part==='leaf'&&b.kind!=='grass',vertices:d.near[part],farVertices:d.far[part],instances,instanceColors:part==='wood'?plain:colors,center,radius,lodDistance:low?95:part==='wood'?120:240,...(low?{maxDetailDistance:b.kind==='grass'?290:430,nearDecoration:b.kind==='grass',...(b.kind==='grass'?{flowerKind:'grass'}:{})}:{})});
  }
 }
 if(roots.a.length)out.push(roots.mesh('hakurei:plants:grounded-roots','vegetation',{owner:'hakurei',region:'hakurei',material:'hakureiBark',component:'shrine-understory',nearDecoration:true,maxDetailDistance:220}));
 if(rocks.a.length)out.push(rocks.mesh('hakurei:plants:woodland-stones','vegetation',{owner:'hakurei',region:'hakurei',material:'hakureiStone',component:'shrine-understory',maxDetailDistance:420}));
 return out;
};
})(globalThis.GA);
