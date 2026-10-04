/* 香霖堂来路公共林缘的有限树形候选；全部枝冠造型均为 P 工程补完。
 * Pure private prototypes only: no planting, matrices, region registration,
 * material changes or mutation of the shared LANDSCAPE prototypes.
 * One opaque mixed wood/leaf Float32Array per existing material/LOD batch.
 * The cache is shared read-only; callers must clone before modifying arrays.
 */
(function(G){'use strict';
const TAU=Math.PI*2,{add,sub,mul,dot,cross,norm,rgb,rng}=G;
const cache=new Map(),wood=rgb('#75624b');
const leaves=['#6b864e','#5d7947','#7b8b55'].map(rgb);
const shrubLeaves=['#5f7747','#70864b'].map(rgb);

class Mesh{
 constructor(){this.values=[];}
 vertex(p,n,c){this.values.push(...p,...n,...c);}
 triangle(a,b,c,na,nb,nc,color){
  this.vertex(a,na,color);this.vertex(b,nb,color);this.vertex(c,nc,color);
 }
 array(){return Float32Array.from(this.values);}
}
function lodValue(lod){if(lod!=='near'&&lod!=='far')throw Error('Unknown forest-entrance plant LOD: '+lod);return lod;}
function variantValue(v){if(!Number.isInteger(v)||v<0||v>2)throw Error('Forest-entrance tree variant must be 0, 1 or 2');return v;}

function branch(g,a,b,r0,r1,sides){
 const axis=norm(sub(b,a)),length=Math.hypot(...sub(b,a));
 const right=norm(cross(axis,Math.abs(axis[1])>.92?[1,0,0]:[0,1,0])),up=cross(axis,right);
 const point=(angle,end)=>{
  const radial=add(mul(right,Math.cos(angle)),mul(up,Math.sin(angle)));
  return {p:add(end?b:a,mul(radial,end?r1:r0)),n:norm(add(radial,mul(axis,(r0-r1)/length)))};
 };
 for(let i=0;i<sides;i++){
  const a0=point(i/sides*TAU,0),b0=point((i+1)/sides*TAU,0);
  const a1=point(i/sides*TAU,1),b1=point((i+1)/sides*TAU,1);
  g.triangle(a0.p,b0.p,b1.p,a0.n,b0.n,b1.n,wood);
  g.triangle(a0.p,b1.p,a1.p,a0.n,b1.n,a1.n,wood);
 }
}

// Unequal connected branch-end banks, rather than eight orbiting balls.
// Each row is [x,y,z, halfX,halfY,halfZ,yaw]. Near fills these branch-end
// volumes with paired geometric leaves. Far aggregates the same leaf clouds.
const specifications=[
 {
  origin:[.05,11.25,.10],seed:.31,scale:[1.29,1.247],shift:[0,-.80],
  banks:[
   [.05,11.25,.10,2.00,2.50,2.00,0],
   [-2.55,9.55,.85,2.65,1.75,2.55,-.22],
   [2.20,10.75,-.90,2.80,2.08,2.40,.40],
   [.40,13.80,-.40,3.10,2.10,2.70,-.10],
   [-.40,10.50,-2.35,2.70,1.95,2.50,.28],
   [.65,10.35,2.35,2.70,1.80,2.60,-.36],
   [-3.50,10.35,-.65,1.55,1.25,1.40,-.28],
   [2.75,12.10,1.50,1.70,1.50,1.55,.22]
  ],
  stem:[[0,-.25,0],[.20,4.95,.10],[-.18,8.10,.25],[.32,11.80,-.18]],
  forks:[
   {start:1,elbow:[-1.30,7.10,.50],tip:[-2.65,9.40,.90]},
   {start:1,elbow:[1.28,7.95,-.55],tip:[2.10,10.60,-.80]},
   {start:2,elbow:[-.75,9.25,-1.25],tip:[-.45,10.60,-2.35]},
   {start:2,elbow:[.48,9.25,1.20],tip:[.75,10.40,2.25]}
  ]
 },
 {
  origin:[-.35,11.30,.30],seed:1.73,scale:[1.10808,1.274],shift:[-.17,.64],
  banks:[
   [-.35,11.30,.30,2.00,2.55,2.00,0],
   [2.55,9.75,.80,2.85,1.90,2.30,.25],
   [-2.00,11.05,-.55,2.95,2.00,2.70,-.40],
   [-.65,13.90,.70,2.65,2.05,2.70,.18],
   [.55,10.85,-2.40,2.85,1.85,2.55,-.18],
   [-.80,10.30,2.20,2.70,1.80,2.55,.38],
   [3.20,11.10,-.80,1.80,1.35,1.60,.13],
   [-2.75,12.05,1.40,1.65,1.38,1.75,-.24]
  ],
  stem:[[0,-.25,0],[-.16,5.25,.13],[.24,8.55,-.20],[-.50,12.15,.40]],
  forks:[
   {start:1,elbow:[1.42,7.50,.45],tip:[2.55,9.70,.80]},
   {start:2,elbow:[-1.12,9.20,-.28],tip:[-2.15,10.85,-.55]},
   {start:1,elbow:[.72,7.60,-1.25],tip:[.55,10.50,-2.30]},
   {start:2,elbow:[-.70,9.25,1.35],tip:[-.85,10.35,2.20]}
  ]
 },
 {
  origin:[.25,11.05,-.20],seed:3.09,scale:[1.0353,1.2483],shift:[0,.50],
  banks:[
   [.25,11.05,-.20,2.00,2.55,2.00,0],
   [-2.10,9.40,-1.45,2.85,1.72,2.35,.44],
   [2.35,10.20,1.00,2.75,1.95,2.55,-.40],
   [1.05,13.72,-.70,2.70,2.30,2.55,.25],
   [.65,10.80,-2.20,2.90,1.87,2.55,.18],
   [-.75,10.55,2.30,2.85,1.92,2.50,-.24],
   [-3.20,10.55,.85,1.90,1.33,1.75,.42],
   [3.20,11.55,-1.10,1.50,1.50,1.48,-.15]
  ],
  stem:[[0,-.25,0],[.12,4.70,-.13],[-.25,7.90,.10],[.70,11.90,-.60]],
  forks:[
   {start:1,elbow:[-1.05,6.95,-.55],tip:[-2.05,9.35,-1.35]},
   {start:1,elbow:[1.30,7.85,.50],tip:[2.25,10.10,1.00]},
   {start:2,elbow:[.40,9.35,-1.25],tip:[.75,10.75,-2.10]},
   {start:2,elbow:[-.65,9.00,1.38],tip:[-.75,10.50,2.30]}
  ]
 }
];

function crownPoint(s,p){return[s.shift[0]+p[0]*s.scale[0],(s.shiftY||0)+p[1]*(s.scaleY||1),s.shift[1]+p[2]*s.scale[1]];}
function geometricLeaf(root,yaw,elevation,length,width,roll){
 const along=norm([Math.cos(yaw),elevation,Math.sin(yaw)]),horizontal=[-Math.sin(yaw),0,Math.cos(yaw)];
 const side=norm(add(mul(horizontal,Math.cos(roll)),mul(cross(along,horizontal),Math.sin(roll))));
 const normal=norm(cross(side,along));
 // Five asymmetric outline vertices and three folded triangles leave room
 // for connected leaf sprays. The pointed silhouette is actual geometry.
 const shape=[[0,0,0],[.38,-1,.035],[1,0,0],[.64,.96,-.025],[.22,.65,.050]];
 return shape.map(([t,w,lift])=>add(root,add(add(mul(along,t*length),mul(side,w*width)),mul(normal,lift*width))));
}

function leafTufts(g,s,color,shrub=false){
 const clouds=[];
 for(let i=0;i<s.banks.length;i++){
  const c=s.banks[i],center=c.slice(0,3),R=rng(Math.round(s.seed*10000)+i*1709+(shrub?937:0));
  const count=shrub?13:i===0?5:i<=5?15:4,points=[];
  for(let j=0;j<count;j++){
   const angle=j*2.399963+s.seed+R()*.75,radial=j<2?.14:.22+Math.sqrt(R())*.38;
   const y=j===0?.70:j===1?-.70:(R()-.5)*1.12;
   const root=add(center,[Math.cos(angle)*c[3]*radial,y*c[4],Math.sin(angle)*c[5]*radial]);
   const yaw=angle+(R()-.5)*.65,elevation=j===1?-.32:.18+R()*.32;
   const axis=norm([Math.cos(yaw),elevation,Math.sin(yaw)]),length=(shrub?.29:.72)+R()*(shrub?.16:.34);
   const end=add(root,mul(axis,length)),leaves=[];
   for(let pair=0;pair<3;pair++)for(const sign of[-1,1]){
    // Attachment stations are fractions of this twig's actual length.
    // Short shrub twigs must not leave their outer leaf pair unsupported.
    const at=add(root,mul(axis,length*(.16+pair*.27)));
    const a=yaw+sign*(.67+R()*.45)+(R()-.5)*.22;
    const size=(shrub?.43:.84)+R()*(shrub?.18:.39),width=(shrub?.13:.27)+R()*(shrub?.055:.15);
    const leafElevation=j===1?-.20:-.05+R()*.65,roll=(R()-.5)*2.30;
    leaves.push(geometricLeaf(at,a,leafElevation,size,width,roll));
   }
   leaves.push(geometricLeaf(end,yaw+(R()-.5)*.35,elevation,(shrub?.40:.82)+R()*(shrub?.15:.30),(shrub?.14:.28)+R()*(shrub?.04:.10),(R()-.5)*2.10));
   // Fit the whole twig, not individual vertices, into its original branch
   // bank. The leaf outline and folds survive; there is no smooth canopy shell.
   let reach=0;
   const ca=Math.cos(c[6]),sa=Math.sin(c[6]);
   for(const p of [root,end,...leaves.flat()]){
    const q=sub(p,center),x=q[0]*ca-q[2]*sa,z=q[0]*sa+q[2]*ca;
    reach=Math.max(reach,Math.hypot(x/c[3],q[1]/c[4],z/c[5]));
   }
   const fit=Math.min(1,.97/reach),world=p=>crownPoint(s,add(center,mul(sub(p,center),fit)));
   // The bank attaches to the main fork, this short bough attaches each
   // twig to its bank, and every leaf root lies along that physical twig.
   branch(g,crownPoint(s,center),world(root),shrub?.019:.030,shrub?.011:.017,3);
   branch(g,world(root),world(end),shrub?.011:.017,shrub?.004:.006,3);
   const base=shrub?shrubLeaves[(i+j)%2]:color,shade=.87+R()*.15;
   for(const leaf of leaves){
    const p=leaf.map(world);points.push(...p);
    for(let k=1;k<p.length-1;k++){
     let a=p[0],b=p[k],d=p[k+1],n=norm(cross(sub(b,a),sub(d,a)));
     if(n[1]<0){[b,d]=[d,b];n=mul(n,-1);}
     g.triangle(a,b,d,n,n,n,base.map(v=>v*shade));
    }
   }
  }
  clouds.push(points);
 }
 return clouds;
}

function horizontalHull(points){
 const unique=new Map();for(const p of points)unique.set(p[0]+':'+p[2],[p[0],p[2]]);
 const a=[...unique.values()].sort((p,q)=>p[0]-q[0]||p[1]-q[1]);
 const turn=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 const chain=points=>{const h=[];for(const p of points){while(h.length>1&&turn(h.at(-2),h.at(-1),p)<=0)h.pop();h.push(p);}return h;};
 const lower=chain(a),upper=chain(a.slice().reverse());lower.pop();upper.pop();return lower.concat(upper);
}

function farTuft(g,points,color,seed){
 const hull=horizontalHull(points),center=points.reduce((a,p)=>add(a,mul(p,1/points.length)),[0,0,0]);
 const minY=Math.min(...points.map(p=>p[1])),maxY=Math.max(...points.map(p=>p[1]));
 const ray=angle=>{
  const d=[Math.cos(angle),Math.sin(angle)];let best=Infinity;
  for(let i=0;i<hull.length;i++){
   const a=hull[i],b=hull[(i+1)%hull.length],e=[b[0]-a[0],b[1]-a[1]],q=[a[0]-center[0],a[1]-center[2]];
   const den=d[0]*e[1]-d[1]*e[0];if(Math.abs(den)<1e-10)continue;
   const t=(q[0]*e[1]-q[1]*e[0])/den,u=(q[0]*d[1]-q[1]*d[0])/den;
   if(t>0&&u>=-1e-7&&u<=1+1e-7)best=Math.min(best,t);
  }
  if(!Number.isFinite(best))throw Error('Unfilled far leaf-bank hull');
  return[center[0]+d[0]*best,center[2]+d[1]*best];
 };
 const outline=[];
 for(let i=0;i<6;i++){
  const a=i/6*TAU+seed*.13;let chosen=null,score=-Infinity;
  for(let j=-3;j<=3;j++){
   const p=ray(a+j*.08),value=p[0]*Math.cos(a)+p[1]*Math.sin(a);
   if(value>score){chosen=p;score=value;}
  }
  outline.push(chosen);
 }
 // Two broad unequal rings supply a real side wall between the crown's
 // rounded shoulders. Neighboring banks share these fewer connected bodies;
 // the entire budget no longer goes into many single-ring double cones.
 const height=maxY-minY,midY=(minY+maxY)/2;
 const rx=Math.max(...points.map(p=>Math.abs(p[0]-center[0]))),rz=Math.max(...points.map(p=>Math.abs(p[2]-center[2])));
 const ring=(upper)=>outline.map((p,i)=>{
  const width=upper?1.012:.975;
  return[center[0]+(p[0]-center[0])*width,minY+height*((upper?.71:.28)+Math.sin(i*1.7+seed)*(upper?.035:.025)),center[2]+(p[1]-center[2])*width];
 });
 const lower=ring(false),upper=ring(true);
 const top=[center[0],maxY,center[2]],bottom=[center[0],minY,center[2]];
 const surfaceNormal=p=>norm([(p[0]-center[0])/(rx*rx),(p[1]-midY)/(height*height*.25),(p[2]-center[2])/(rz*rz)]);
 for(let i=0;i<6;i++){
  const j=(i+1)%6;
  for(const p of [[top,upper[j],upper[i]],[bottom,lower[i],lower[j]],[lower[i],upper[i],upper[j]],[lower[i],upper[j],lower[j]]]){
   const normals=p.map(surfaceNormal);
   // Soft radial normals keep the low-budget shoulders volumetric rather
   // than reading as a sequence of dark flat leaf plates.
   for(let k=0;k<3;k++)g.vertex(p[k],normals[k],color.map(v=>v*(.89+Math.max(0,normals[k][1])*.10)));
  }
 }
}

function treeWood(g,s,near){
 if(!near){
  // Keep the exposed trunk and its two unequal main forks. Fine boughs are
  // inside the far banks, leaving 72 of the 90 triangles for crown volume.
  branch(g,s.stem[0],s.stem[1],.44,.30,3);
  branch(g,s.stem[1],crownPoint(s,s.banks[3].slice(0,3)),.30,.05,3);
  branch(g,s.stem[1],crownPoint(s,s.forks[0].tip),.18,.035,3);
  return;
 }
 for(let i=0;i<3;i++)branch(g,s.stem[i],s.stem[i+1],[.44,.30,.18][i],[.30,.18,.05][i],8);
 for(let i=0;i<s.forks.length;i++){
  const f=s.forks[i],start=s.stem[f.start],elbow=crownPoint(s,f.elbow),tip=crownPoint(s,f.tip);
  branch(g,start,elbow,.18,.105,7);branch(g,elbow,tip,.105,.035,7);
 }
 if(near)for(let i=0;i<5;i++){
  const a=i*TAU/5+.13;
  branch(g,[Math.cos(a)*1.4,0,Math.sin(a)*1.4],[0,.90,0],.12,.25,7);
 }
 // Match each bank to an existing physical fork; the higher apex and the
 // two eccentric sprays continue from this chain instead of floating above it.
 const parents=[s.stem[2],crownPoint(s,s.forks[0].tip),crownPoint(s,s.forks[1].tip),s.stem[3],crownPoint(s,s.forks[2].tip),crownPoint(s,s.forks[3].tip),crownPoint(s,s.banks[1].slice(0,3)),crownPoint(s,s.banks[2].slice(0,3))];
 for(let i=0;i<s.banks.length;i++)branch(g,parents[i],crownPoint(s,s.banks[i].slice(0,3)),i===3?.075:.040,.025,3);
}

function tree(variant,lod='near'){
 variantValue(variant);lodValue(lod);const key='tree:'+variant+':'+lod;
 if(!cache.has(key)){
  const near=new Mesh(),far=new Mesh(),s=specifications[variant],color=leaves[variant];
  treeWood(near,s,true);const clouds=leafTufts(near,s,color);
  // Join the left/back, right/front and central/high twig banks. Each
  // thick 24-triangle body includes its real eccentric near sprays.
  const groups=[[1,4,6],[2,5,7],[0,3]].map(indices=>indices.flatMap(i=>clouds[i]));
  treeWood(far,s,false);for(let i=0;i<groups.length;i++)farTuft(far,groups[i],color,s.seed+i*.41);
  cache.set('tree:'+variant+':near',near.array());cache.set('tree:'+variant+':far',far.array());
 }
 return cache.get(key);
}

const shrubSpec={origin:[.05,.77,.00],seed:1.91,scale:[1.425,1.422],shift:[.09,-.08],scaleY:1.38,shiftY:-.245,banks:[
 [-.55,.61,.12,1.00,.58,.86,-.28],
 [.50,.90,.08,.90,.72,.83,.36],
 [.02,.60,-.53,.91,.52,.82,.10],
 [-.37,.77,.66,.73,.55,.62,-.14]
]};
function shrub(lod='near'){
 lodValue(lod);const key='shrub:'+lod;
 if(!cache.has(key)){
  const near=new Mesh(),far=new Mesh();
  for(const c of shrubSpec.banks)branch(near,[0,0,0],crownPoint(shrubSpec,c.slice(0,3)),.034,.009,3);
  const clouds=leafTufts(near,shrubSpec,shrubLeaves[0],true);
  // Two overlapping low bodies preserve the whole bush's footprint and
  // height; four separate diamond caps would expose the gaps between them.
  const groups=[[0,2],[1,3]].map(indices=>indices.flatMap(i=>clouds[i]));
  for(let i=0;i<groups.length;i++)farTuft(far,groups[i],shrubLeaves[i%2],shrubSpec.seed+i*.51);
  cache.set('shrub:near',near.array());cache.set('shrub:far',far.array());
 }
 return cache.get(key);
}

function grass(lod='near'){
 lodValue(lod);const key='grass';
 if(!cache.has(key)){
  const g=new Mesh(),colors=['#78894f','#a8a169'].map(rgb);
  const blades=[
   [-.27,-.12,.25,.34,.029,.14], [.15,-.28,.33,2.15,.035,.19],
   [.39,.07,.29,3.90,.027,.16], [-.12,.28,.38,5.20,.033,.22],
   [-.24,.17,.52,.50,.041,.26], [.06,.08,.58,2.92,.035,.29],
   [.21,-.20,.46,4.52,.037,.28], [-.05,-.19,.78,.68,.039,.31],
   [-.08,.27,.73,3.62,.034,.34]
  ];
  for(let i=0;i<blades.length;i++){
   const [x,z,h,a,w,bend]=blades[i],dx=Math.cos(a),dz=Math.sin(a);
   const base=[x,0,z],middle=[x+dx*bend*.32,h*.50,z+dz*bend*.32],tip=[x+dx*bend,h,z+dz*bend];
   const side=[-dz*w,0,dx*w],lowA=sub(base,side),lowB=add(base,side);
   const highA=sub(middle,mul(side,.58)),highB=add(middle,mul(side,.58));
   const c=colors[i===1||i===6?1:0].map(v=>v*(.95+(i%3)*.025));
   for(const [a0,b0,c0]of[[lowA,lowB,highB],[lowA,highB,highA],[highA,highB,tip]]){
    const n=norm(cross(sub(b0,a0),sub(c0,a0)));g.triangle(a0,b0,c0,n,n,n,c);
   }
  }
  cache.set(key,g.array());
 }
 return cache.get(key);
}

function bounds(array){
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 for(let i=0;i<array.length;i+=9)for(let k=0;k<3;k++){min[k]=Math.min(min[k],array[i+k]);max[k]=Math.max(max[k],array[i+k]);}
 return{min,max};
}
G.FOREST_ENTRANCE_PLANTS={basis:'P',version:4,tree,shrub,grass,bounds};
})(globalThis.GA);
