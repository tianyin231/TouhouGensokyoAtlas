/* 魔法森林原生枝端叶冠的有限候选；全部新枝叶造型为 P 工程补完。
 * Pure private prototypes only. No planting, source wood reconstruction,
 * instance transforms/colors, material changes or world registration.
 * prototype(variant,lod) returns extraWood and leaf. Integration must prepend
 * the exact current original wood array. Cached arrays are shared read-only.
 */
(function(G){'use strict';
const {add,sub,mul,cross,dot,norm,rng,rgb}=G,TAU=Math.PI*2;
const SEEDS=[134,591,833],cache=new Map(),bark=rgb('#5c5745');
// Actual original near-prototype leaf AABBs, read from the saved Chrome source.
// These local prototype bounds contain no planting or per-instance information.
const SOURCE_BOUNDS=[
 {lo:[-9.493431091308594,9.515718460083008,-8.198797225952148],hi:[9.380621910095215,19.731000900268555,8.776309967041016]},
 {lo:[-7.711757183074951,9.940958023071289,-7.404692649841309],hi:[8.943005561828613,19.628494262695312,8.175175666809082]},
 {lo:[-8.929389953613281,10.329630851745605,-7.329510688781738],hi:[8.55081844329834,20.265018463134766,8.834259033203125]}
];

class Mesh{
 constructor(){this.values=[];}
 vertex(p,n,c){this.values.push(...p,...n,...c);}
 triangle(a,b,c,na,nb,nc,color){this.vertex(a,na,color);this.vertex(b,nb,color);this.vertex(c,nc,color);}
 array(){return Float32Array.from(this.values);}
}
function validate(variant,lod){
 if(!Number.isInteger(variant)||variant<0||variant>2)throw Error('Native forest canopy variant must be 0, 1 or 2');
 if(lod!=='near'&&lod!=='far')throw Error('Native forest canopy LOD must be near or far');
}
function bough(g,a,b,r0=.15,r1=.10){
 const d=sub(b,a),length=Math.hypot(...d),axis=norm(d);
 if(length<1e-6)throw Error('Degenerate native forest supporting bough');
 const right=norm(cross(axis,Math.abs(axis[1])>.92?[1,0,0]:[0,1,0])),up=cross(axis,right);
 const ring=(p,r)=>Array.from({length:3},(_,i)=>{
  const radial=add(mul(right,Math.cos(i*TAU/3)),mul(up,Math.sin(i*TAU/3)));
  return{p:add(p,mul(radial,r)),n:norm(add(radial,mul(axis,(r0-r1)/length)))};
 });
 const lower=ring(a,r0),upper=ring(b,r1);
 for(let i=0;i<3;i++){
  const j=(i+1)%3,A=lower[i],B=lower[j],C=upper[j],D=upper[i];
  g.triangle(A.p,B.p,C.p,A.n,B.n,C.n,bark);g.triangle(A.p,C.p,D.p,A.n,C.n,D.n,bark);
 }
}

function nativeBanks(variant){
 // This scalar sequence is the original near treeProto sequence. Geometry
 // and, especially, the protected original wood prefix are never recomputed.
 const R=rng(SEEDS[variant]),height=14+R()*5,lean=(R()-.5)*2,banks=[];
 const fork=[lean,height*.45,0],stemTop=[lean+.5,height,.8];
 for(let i=0;i<7;i++){
  const angle=i*2.4,x=Math.cos(angle)*(3.6+R()*2),z=Math.sin(angle)*(3.2+R()*2),y=height*.64+R()*4;
  const radii=[3.5+R(),2.4+R()*.8,3.3+R()];
  banks.push({anchor:[x,y,z],center:[x,y+1,z],radii,phase:angle+variant*.43});
 }
 banks.push({anchor:stemTop,center:[lean,height+.2,0],radii:[3.6,2.4,3.2],phase:1.15+variant*.63});
 return{banks,fork,stemTop,height,lean};
}
function leafShape(root,yaw,pitch,length,width,roll){
 const along=norm([Math.cos(yaw),pitch,Math.sin(yaw)]),flat=[-Math.sin(yaw),0,Math.cos(yaw)];
 const side=norm(add(mul(flat,Math.cos(roll)),mul(cross(along,flat),Math.sin(roll)))),normal=norm(cross(side,along));
 // Actual pointed, asymmetrical leaf outlines; three folded triangles.
 return[[0,0,0],[.35,-1,.055],[1,0,0],[.66,.96,-.025],[.22,.57,.050]].map(([t,w,lift])=>
  add(root,add(add(mul(along,t*length),mul(side,w*width)),mul(normal,lift*width))));
}
function leafFit(bank,points,variant){
 // Only this leaf adapts around its fixed root. One long outward tip must
 // never retract the other leaves or the supporting bank-wide boughs.
 const root=points[0],q=sub(root,bank.center).map((x,i)=>x/bank.radii[i]);
 let scale=1;
 for(const p of points){
  const delta=sub(p,root),v=delta.map((x,i)=>x/bank.radii[i]);
  const a=dot(v,v),b=2*dot(q,v),c=dot(q,q)-.995*.995;
  if(a>=1e-12&&a+b+c>0)scale=Math.min(scale,(-b+Math.sqrt(b*b-4*a*c))/(2*a));
  const bounds=SOURCE_BOUNDS[variant];
  for(let k=0;k<3;k++){
   if(p[k]>bounds.hi[k]+.025)scale=Math.min(scale,(bounds.hi[k]+.025-root[k])/delta[k]);
   if(p[k]<bounds.lo[k]-.025)scale=Math.min(scale,(bounds.lo[k]-.025-root[k])/delta[k]);
  }
 }
 if(!(scale>0&&scale<=1))throw Error('Native forest leaf root lies outside its supported crown');
 return{scale,world:p=>add(root,mul(sub(p,root),scale))};
}
function nearBank(wood,leaf,bank,variant,index){
 const R=rng(SEEDS[variant]*173+index*3911),sprays=[];
 for(let arm=0;arm<2;arm++){
  // Opposite, unequal outer boughs cover both local crown axes. Merely
  // lengthening two near-parallel arms leaves an entire bank edge empty.
  const sx=Math.cos(bank.phase)<0?-1:1,sz=Math.sin(bank.phase)<0?-1:1,sign=arm?-1:1;
  const spreadX=.55+.030*Math.sin(bank.phase*1.71+arm),spreadZ=.56+.030*Math.cos(bank.phase*1.39+arm);
  const end=add(bank.center,[sign*sx*bank.radii[0]*spreadX,bank.radii[1]*(arm?.43:.16),sign*sz*bank.radii[2]*spreadZ]);
  const axis=sub(end,bank.anchor),leaves=[];
  for(let j=0;j<48;j++){
   const station=j===47?1:.10+(Math.floor(j/4)+(j%4)*.13+R()*.25)/12*.87;
   const root=add(bank.anchor,mul(axis,station));
   const angle=bank.phase+j*2.399963+arm*.83+(R()-.5)*.55;
   const vertical=j%8<2,pitch=j%8===0?1.50:j%8===1?-1.50:-.35+R()*1.35;
   const length=vertical?2.60+R()*.20:1.80+R()*1.00,width=length*(.25+R()*.10);
   const p=leafShape(root,angle,pitch,length,width,(R()-.5)*2.65);
   leaves.push({p,shade:.89+R()*.11});
  }
  sprays.push({end,leaves});
 }
 const cloud=[],fits=[];
 for(const spray of sprays){
  bough(wood,bank.anchor,spray.end,.15,.10);
  for(const item of spray.leaves){
   const fit=leafFit(bank,item.p,variant),p=item.p.map(fit.world);cloud.push(...p);fits.push(fit.scale);
   for(let i=1;i<4;i++){
    let a=p[0],b=p[i],c=p[i+1],n=norm(cross(sub(b,a),sub(c,a)));
    if(n[1]<0){[b,c]=[c,b];n=mul(n,-1);}
    leaf.triangle(a,b,c,n,n,n,[item.shade,item.shade,item.shade]);
   }
  }
 }
 return{cloud,fitRange:[Math.min(...fits),Math.max(...fits)]};
}

function hullXZ(points){
 const unique=new Map();for(const p of points)unique.set(p[0]+':'+p[2],[p[0],p[2]]);
 const sorted=[...unique.values()].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
 const turn=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 const half=a=>{const h=[];for(const p of a){while(h.length>1&&turn(h.at(-2),h.at(-1),p)<=0)h.pop();h.push(p);}return h;};
 const lower=half(sorted),upper=half(sorted.slice().reverse());lower.pop();upper.pop();return lower.concat(upper);
}
function farBank(g,points,phase){
 const hull=hullXZ(points),center=points.reduce((s,p)=>add(s,mul(p,1/points.length)),[0,0,0]);
 const low=Math.min(...points.map(p=>p[1])),high=Math.max(...points.map(p=>p[1])),height=high-low;
 const rx=Math.max(...points.map(p=>Math.abs(p[0]-center[0]))),rz=Math.max(...points.map(p=>Math.abs(p[2]-center[2])));
 const ray=angle=>{
  const d=[Math.cos(angle),Math.sin(angle)];let closest=Infinity;
  for(let i=0;i<hull.length;i++){
   const a=hull[i],b=hull[(i+1)%hull.length],e=[b[0]-a[0],b[1]-a[1]],q=[a[0]-center[0],a[1]-center[2]];
   const det=d[0]*e[1]-d[1]*e[0];if(Math.abs(det)<1e-10)continue;
   const t=(q[0]*e[1]-q[1]*e[0])/det,u=(q[0]*d[1]-q[1]*d[0])/det;
   if(t>0&&u>=-1e-7&&u<=1+1e-7)closest=Math.min(closest,t);
  }
  if(!Number.isFinite(closest))throw Error('Native forest far bank has an unfilled hull');
  return[center[0]+d[0]*closest,center[2]+d[1]*closest];
 };
 const outline=[];
 for(let i=0;i<6;i++){
  const angle=i*TAU/6+phase*.13;let p=null,best=-Infinity;
  for(let j=-3;j<=3;j++){
   const q=ray(angle+j*.08),score=q[0]*Math.cos(angle)+q[1]*Math.sin(angle);
   if(score>best){p=q;best=score;}
  }
  outline.push(p);
 }
 const levels=[.20,.50,.80],widths=[.86,1.008,.87];
 const rings=levels.map((level,k)=>outline.map((p,i)=>[center[0]+(p[0]-center[0])*widths[k],low+height*(level+Math.sin(i*1.71+phase)*.026),center[2]+(p[1]-center[2])*widths[k]]));
 const top=[center[0],high,center[2]],bottom=[center[0],low,center[2]];
 const normal=p=>norm([(p[0]-center[0])/(rx*rx),(p[1]-(low+high)/2)/(height*height*.25),(p[2]-center[2])/(rz*rz)]);
 const tri=p=>{const n=p.map(normal);for(let i=0;i<3;i++){const shade=.91+Math.max(0,n[i][1])*.08;g.vertex(p[i],n[i],[shade,shade,shade]);}};
 for(let i=0;i<6;i++){
  const j=(i+1)%6;tri([top,rings[2][j],rings[2][i]]);tri([bottom,rings[0][i],rings[0][j]]);
  for(let k=0;k<2;k++){tri([rings[k][i],rings[k+1][i],rings[k+1][j]]);tri([rings[k][i],rings[k+1][j],rings[k][j]]);}
 }
}
function build(variant){
 const specification=nativeBanks(variant),nearWood=new Mesh(),nearLeaf=new Mesh(),farWood=new Mesh(),farLeaf=new Mesh();
 const banks=specification.banks,clouds=banks.map((bank,i)=>nearBank(nearWood,nearLeaf,bank,variant,i));
 // Add only the three branch axes absent from the original far prefix, and
 // one short top continuation. All old trunk/root/branch floats stay external.
 for(let i=4;i<7;i++)bough(farWood,specification.fork,banks[i].anchor,.22,.09);
 bough(farWood,specification.stemTop,banks[7].center,.10,.08);
 // Join the nearest side banks. Keep the top bank distinct so a broad join
 // cannot flatten the apex or replace the near silhouette with a new one.
 let pair=[0,1],nearest=Infinity;
 for(let i=0;i<7;i++)for(let j=i+1;j<7;j++){
  const d=Math.hypot(...sub(banks[i].center,banks[j].center));if(d<nearest){nearest=d;pair=[i,j];}
 }
 const groups=[];for(let i=0;i<8;i++)if(i!==pair[1])groups.push(i===pair[0]?clouds[i].cloud.concat(clouds[pair[1]].cloud):clouds[i].cloud);
 groups.forEach((points,i)=>farBank(farLeaf,points,SEEDS[variant]*.01+i*.47));
 for(const [lod,wood,leaf,originalWoodTriangles]of [['near',nearWood,nearLeaf,324],['far',farWood,farLeaf,126]]){
  const extraWood=wood.array(),foliage=leaf.array(),extraWoodTriangles=extraWood.length/27,leafTriangles=foliage.length/27;
  const total=originalWoodTriangles+extraWoodTriangles+leafTriangles,cap=lod==='near'?2724:406;
  if(total>cap||leafTriangles>(lod==='near'?2400:280))throw Error('Native forest entire-tree triangle budget exceeded');
  cache.set(variant+':'+lod,{extraWood,leaf:foliage,meta:Object.freeze({basis:'P',variant,seed:SEEDS[variant],lod,originalWoodTriangles,extraWoodTriangles,leafTriangles,wholeTreeTriangles:total,nearBankCount:8,farBodyCount:7,leafFitRange:[Math.min(...clouds.map(p=>p.fitRange[0])),Math.max(...clouds.map(p=>p.fitRange[1]))]})});
 }
}
function prototype(variant,lod='near'){
 validate(variant,lod);const key=variant+':'+lod;if(!cache.has(key))build(variant);return cache.get(key);
}
G.FOREST_CANOPY_PLANTS={version:2,basis:'P',seeds:Object.freeze(SEEDS.slice()),prototype};
})(globalThis.GA);
