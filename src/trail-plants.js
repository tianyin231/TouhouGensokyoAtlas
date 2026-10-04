/* 溪桥—夜雀屋的局部树形样板，全部枝冠造型均为 P 工程补完。
 * 只提供小原型，不生成点位、修改实例、注册地区或替换共享旧原型。
 * Native reference envelopes: broadleaf/cherry ~8m, hinoki 13.06m,
 * willow 7.62m. Public planting must adapt private vertices, never matrices.
 * Leaf arrays contain only unindexed six-vertex quads, in the existing
 * UV order (00,10,11,00,11,01). Near/far/proxy use one crown specification.
 */
(function(G){'use strict';
const TAU=Math.PI*2, {Geometry,add,sub,mul,norm,cross}=G;
const cache=new Map();
const bark=[.68,.51,.35], paleBark=[.75,.61,.45];

function variantValue(v){if(v!==0&&v!==1)throw new Error('Trail plant variant must be 0 or 1');return v;}
function lodValue(lod){if(!['near','far','proxy'].includes(lod))throw new Error('Unknown trail plant LOD: '+lod);return lod;}
function quad(g,points,normals,color){
 for(const i of [0,1,2,0,2,3])g.vertex(points[i],normals[i],color);
}

// Continuous radial normals make the primary forks readable without a
// high-sided cylinder or per-branch material/program variants.
function branch(g,a,b,r0,r1,sides,color){
 const axis=norm(sub(b,a)),len=G.length(sub(b,a));
 const right=norm(cross(axis,Math.abs(axis[1])>.92?[1,0,0]:[0,1,0])),up=cross(axis,right);
 const vertex=(angle,end)=>{
  const radial=add(mul(right,Math.cos(angle)),mul(up,Math.sin(angle)));
  return {p:add(end?b:a,mul(radial,end?r1:r0)),n:norm(add(radial,mul(axis,(r0-r1)/len)))};
 };
 for(let i=0;i<sides;i++){
  const A=vertex(i/sides*TAU,0),B=vertex((i+1)/sides*TAU,0),C=vertex((i+1)/sides*TAU,1),D=vertex(i/sides*TAU,1);
  quad(g,[A.p,B.p,C.p,D.p],[A.n,B.n,C.n,D.n],color);
 }
}

function broadSpec(kind,v){
 const cherry=kind==='cherry',shift=v?.34:-.12;
 const stem=[[0,-.02,0],[.13+shift,2.55+(v?.35:0),-.11],[-.17+shift,4.15,.28],[.15+shift,6.55,-.08]];
 // Unequal offsets and fork heights describe a joined, asymmetric crown.
 // Cherry keeps a wider, flatter fan; no full radial repetition around a pole.
 const clumps=cherry?[
  [-2.1,5.45,.5,1.87,1.16,1.8], [2.12,5.72,.12,1.98,1.17,1.7],
  [-.38,6.67,-.95,1.88,1.12,1.72], [.16,5.4,2.4,1.74,1.22,1.96],
  [-1.08,5.55,-2.05,1.76,1.0,1.65], [1.47,6.15,1.45,1.63,1.1,1.67]
 ]:[
  [-2.04,5.45,.56,1.74,1.3,1.75], [1.9,5.87,-.1,1.93,1.38,1.77],
  [-.35,6.51,-1.1,1.83,1.27,1.73], [.17,5.42,2.17,1.61,1.32,1.88],
  [-1.26,5.32,-2.0,1.6,1.08,1.72], [1.4,6.03,1.2,1.55,1.25,1.6]
 ];
 if(v)for(let i=0;i<clumps.length;i++){
  const c=clumps[i];c[0]+=.25*Math.sin(i*1.7+.4);c[2]+=.24*Math.cos(i*2.1);
  c[1]+=(i===2?-.15:i===1?.32:-.11);c[3]*=i%2?.94:1.04;c[4]*=i%2?1.06:.94;
 }
 return {stem,clumps,radius:.285,wood:cherry?bark:paleBark,seed:cherry?319:173};
}

function hinokiSpec(v){
 const stem=[[0,0,0],[.09,4.9,-.13],[-.12+(v?.2:0),8.5,.15],[.15,12.16,-.08]];
 // Deep, overlapping off-axis masses replace nine identical horizontal
 // plates. The broad lower branches and narrowed, offset top stay in all LODs.
 const clumps=[
  [-1.15,5.42,.27,2.39,1.75,2.10], [1.42,6.52,-1.18,2.48,2.03,2.48],
  [-.86,8.08,-.62,1.91,1.92,1.89], [.57,9.45,.45,1.54,1.83,1.61],
  [.11,11.53,-.05,.96,1.51,.84], [-.05,6.42,1.49,1.60,1.73,2.04]
 ];
 if(v)for(let i=0;i<clumps.length;i++){
  const c=clumps[i];c[0]*=.89;c[2]+=.18*Math.sin(i*1.4);c[1]+=[.18,-.15,.25,-.19,-.06,.10][i];
  c[3]*=i===0?1.08:.98;c[4]*=i===2?1.08:.98;
 }
 return {stem,clumps,radius:.30,wood:paleBark,seed:541};
}

function willowSpec(v){
 const stem=[[0,-.02,0],[.19,2.58,-.10],[-.18,4.49,.24],[.24+(v?.15:0),6.73,-.04]];
 const clumps=[
  [-.9,6.52,-.18,2.10,1.08,1.86], [1.05,6.20,.40,1.85,1.04,2.06],
  [-2.47,4.50,-.32,.87,2.50,.91], [2.78,4.65,.24,1.10,2.19,.87],
  [.43,4.58,2.66,1.02,2.22,.99], [-.49,4.35,-2.83,1.03,2.45,1.07]
 ];
 if(v)for(let i=0;i<clumps.length;i++){
  const c=clumps[i];c[0]+=.16*Math.sin(i*1.8);c[2]+=.11*Math.cos(i*1.4);
  if(i>1)c[1]+=(i%2?.18:-.12);else c[1]-=.05;
 }
 return {stem,clumps,radius:.285,wood:bark,seed:811,drooping:true};
}

function specification(kind,v){
 if(kind==='broadleaf'||kind==='cherry')return broadSpec(kind,v);
 if(kind==='hinoki')return hinokiSpec(v);
 if(kind==='willow')return willowSpec(v);
 throw new Error('Unknown trail tree kind: '+kind);
}

function surface(c,angle,latitude,seed){
 const n=[Math.cos(latitude)*Math.cos(angle),Math.sin(latitude),Math.cos(latitude)*Math.sin(angle)];
 const wrinkle=1+.032*Math.sin(angle*3+seed)*Math.cos(latitude)**2+.018*Math.cos(angle*5-latitude*3+seed);
 return {p:[c[0]+c[3]*n[0]*wrinkle,c[1]+c[4]*n[1],c[2]+c[5]*n[2]*wrinkle],n:norm([n[0]/c[3],n[1]/c[4],n[2]/c[5]])};
}

// Leaf sprays sit around irregular branch-end knots inside each crown.
// A large alpha-cut quad stretched over a spherical patch leaves its visible
// centre well inside its numeric bounds; repeating that shell also produces
// circular cutout bands. Here each small fan has its own position and depth.
// Far merges the three nearby sprays, keeping all seven knot locations.
function volumeCards(g,c,seed,lod){
 const knots=[[-.43,.05,.17],[.44,.17,-.12],[-.12,.36,-.36],[.13,-.20,.40],[-.28,-.27,-.21],[.18,.52,.12],[.04,.02,.03]];
 const near=lod==='near',sprays=near?3:1;
 const point=p=>[c[0]+p[0]*c[3],c[1]+p[1]*c[4],c[2]+p[2]*c[5]];
 for(let k=0;k<knots.length;k++){
  const R=G.rng(seed*137+k*719),knot=knots[k].map((x,i)=>x+(R()-.5)*(i===1?.045:.065)),angle=R()*TAU;
  // Near sub-sprays straddle the same far knot. Their union fills its volume
  // without copying a second whole canopy or increasing plant instances.
  const reach=[Math.cos(angle)*.18,.065*Math.sin(angle*1.7),Math.sin(angle)*.18];
  for(let s=0;s<sprays;s++){
   const center=near&&s?add(knot,mul(reach,s===1?1:-1)):knot;
   for(let panel=0;panel<3;panel++){
    const Q=G.rng(seed*211+k*173+s*41+panel*1009),a=angle+panel*2.13+s*.47+(Q()-.5)*.45;
    // Separate, upward-tilted leaf fans receive daylight. They do not share
    // the inward/downward normals of a continuous, dark spherical underside.
    const normal=norm([Math.cos(a)*.74,[.74,.46,.27][panel]+Q()*.10,Math.sin(a)*.74]);
    const side=norm(cross([0,1,0],normal)),up=norm(cross(normal,side));
    const width=(near?.31:.53)*(.94+Q()*.12),height=(near?.30:.48)*(.92+Q()*.14);
    const fold=[0,.025,.065,-.025].map(x=>x*width),shape=[[-1,-1],[1,-1],[1,1],[-1,1]];
    const points=shape.map(([x,y],i)=>point(add(center,add(add(mul(side,x*width*(y>0?.90:1)),mul(up,y*height)),mul(normal,fold[i])))));
    const n=norm([normal[0]/c[3],normal[1]/c[4],normal[2]/c[5]]),shade=.94+Q()*.05;
    // A cyclic rotation changes the repeated mask orientation while keeping
    // both triangle winding and the required six-vertex UV layout intact.
    const turn=Math.floor(Q()*4),ordered=points.map((_,i)=>points[(i+turn)%4]);
    quad(g,ordered,[n,n,n,n],[shade,shade,shade]);
   }
  }
 }
}

function solidCrown(g,c,seed){
 // Six radial points, top and bottom: 12 nondegenerate triangles. Curved
 // normals retain the same crown lobes without alpha layers in cold overview.
 const top={p:[c[0],c[1]+c[4],c[2]],n:[0,1,0]},bottom={p:[c[0],c[1]-c[4],c[2]],n:[0,-1,0]};
 const ring=Array.from({length:6},(_,i)=>surface(c,i/6*TAU+seed*.071,0,seed));
 const vertex=q=>g.vertex(q.p,q.n,[.96,.96,.96]);
 for(let i=0;i<6;i++){
  const a=ring[i],b=ring[(i+1)%6];
  for(const q of [top,b,a,bottom,a,b])vertex(q);
 }
}

function treeWood(g,s,lod){
 const proxy=lod==='proxy',near=lod==='near',segments=proxy?[s.stem[0],s.stem[1],s.stem[3]]:s.stem;
 const sides=proxy?3:near?8:5;
 for(let i=0;i<segments.length-1;i++)branch(g,segments[i],segments[i+1],s.radius*(1-i*.27),s.radius*(1-(i+1)*.27),sides,s.wood);
 const count=proxy?2:s.clumps.length;
 for(let i=0;i<count;i++){
  const c=s.clumps[i],anchor=s.stem[1],base=s.drooping&&i>1?s.stem[2]:anchor;
  const tip=[c[0]*.82,c[1]+(s.drooping&&i>1?c[4]*.76:-.1),c[2]*.82];
  if(proxy){branch(g,base,tip,.10,.025,3,s.wood);continue;}
  const elbow=[base[0]+(tip[0]-base[0])*.52,base[1]+(tip[1]-base[1])*.66,base[2]+(tip[2]-base[2])*.52];
  branch(g,base,elbow,.12-(i%3)*.013,.071,near?6:4,s.wood);branch(g,elbow,tip,.071,.027,near?5:3,s.wood);
  if(near)for(let k=0;k<2;k++){
   const a=i*2.31+k*2.4,twig=[c[0]+Math.cos(a)*c[3]*.53,c[1]+c[4]*.32,c[2]+Math.sin(a)*c[5]*.53];
   branch(g,tip,twig,.031,.009,4,s.wood);
  }
 }
}

function willowDrops(wood,leaf,s,lod){
 const near=lod==='near',count=12,steps=near?5:2;
 for(let i=0;i<count;i++){
  const a=i/count*TAU+.22,rad=2.58+.24*Math.sin(i*2.4),top=6.61+.27*Math.sin(i*1.8),bottom=2.25+.52*(.5+.5*Math.cos(i*2.3));
  const point=t=>[Math.cos(a)*(rad+.34*Math.sin(t*Math.PI)),top+(bottom-top)*t,Math.sin(a)*(rad+.34*Math.sin(t*Math.PI))];
  let last=point(0);
  for(let j=1;j<=steps;j++){
   const t=j/steps,p=point(t),width=(.15+(1-t)*.12),side=[Math.cos(a+.7)*width,0,Math.sin(a+.7)*width];
   if(near)branch(wood,last,p,.014*(1-t*.4),.008,3,s.wood);
   const points=[sub(last,side),add(last,side),add(p,mul(side,.82)),sub(p,mul(side,.82))],n=norm(cross(sub(points[1],points[0]),sub(points[3],points[0])));
   quad(leaf,points,[n,n,n,n],[.96,.96,.96]);last=p;
  }
 }
}

function tree(kind,variant,lod){
 variantValue(variant);lodValue(lod);const key=kind+':'+variant+':'+lod;
 if(cache.has(key))return cache.get(key);
 const s=specification(kind,variant),wood=new Geometry(),leaf=new Geometry();treeWood(wood,s,lod);
 if(lod==='proxy'){
  for(let i=0;i<s.clumps.length;i++)solidCrown(wood,s.clumps[i],s.seed+i*31+variant*7);
  const result={solid:wood.mesh('trail-plant-proxy').vertices};cache.set(key,result);return result;
 }
 for(let i=0;i<s.clumps.length;i++)volumeCards(leaf,s.clumps[i],s.seed+i*31+variant*7,lod);
 if(s.drooping)willowDrops(wood,leaf,s,lod);
 const result={wood:wood.mesh('trail-plant-wood').vertices,leaf:leaf.mesh('trail-plant-leaf').vertices};cache.set(key,result);return result;
}

function shrub(variant,lod){
 variantValue(variant);lodValue(lod);const key='shrub:'+variant+':'+lod;
 if(cache.has(key))return cache.get(key);
 const wood=new Geometry(),leaf=new Geometry(),clumps=variant?[
  [-.42,.36,.13,.51,.33,.43],[.37,.49,-.08,.51,.42,.45],[.05,.39,.39,.48,.33,.43]
 ]:[[-.48,.40,.12,.50,.36,.43],[.38,.37,-.17,.57,.34,.46],[.04,.57,.23,.44,.35,.48]];
 for(let i=0;i<clumps.length;i++){
  const c=clumps[i];
  if(lod==='proxy'){solidCrown(wood,c,97+i*31+variant*11);continue;}
  branch(wood,[0,.01,0],[c[0],c[1]-.12,c[2]],.035,.012,lod==='near'?4:3,bark);
  volumeCards(leaf,c,97+i*31+variant*11,lod);
 }
 const result=lod==='proxy'?{solid:wood.mesh('trail-shrub-proxy').vertices}:{wood:wood.mesh('trail-shrub-wood').vertices,leaf:leaf.mesh('trail-shrub-leaf').vertices};
 cache.set(key,result);return result;
}

G.TRAIL_PLANTS={tree,shrub,basis:'P',reference:'Existing trail/mystia plant identities; local prototype shape only'};
})(globalThis.GA);
