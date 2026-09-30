/* Mountain-foot geyser / Jigokudani: SoPM Kanako + Bunbunmaru p173 (T).
 * Site, mineral rims, service path and all dimensions are P, not a survey.
 * The original terrain, shrine spring and underground reactor are untouched. */
(function(G){'use strict';
const ID='geyser_mountain',TAU=Math.PI*2,CX=-1254,CZ=-461;
const C=Object.fromEntries(Object.entries({ash:'#96998a',rock:'#69736e',dark:'#3d524f',chalk:'#c9c3a5',ochre:'#b9a575',salt:'#ded3b0',water:'#7aa6a0',deep:'#426c71',wood:'#807359',rope:'#ada17e',green:'#768467',soil:'#a5a18b'}).map(([k,v])=>[k,G.rgb(v)]));
const pools=[{id:'main',x:-1257,z:-462,rx:12,rz:8,phase:0},{id:'east',x:-1214,z:-460,rx:9,rz:6.5,phase:.38},{id:'lower',x:-1228,z:-483,rx:5.2,rz:3.3,phase:.68}];
const vents=[{x:-1304,z:-474,r:2.1,phase:.17},{x:-1183,z:-480,r:1.6,phase:.62}];
const approach=G.spline([[-1238,-230],[-1223,-308],[-1228,-423.5]],1.6);
const rimPath=G.spline([[-1228,-423.5],[-1211,-425],[-1182,-439],[-1175,-464],[-1182,-491]],1.4);
const bounds=[-1350,-555,-1145,-207];
const view=(label,eye,target,fov=51,more={})=>({label,eye,target,fov,region:ID,space:'surface',era:'山麓地狱谷 · 求闻口授／地貌与设施P',detailNeighbors:['forest'],requiredRegions:[ID,'forest'],...more});
const views={
 geyserOverview:view('地狱谷 · 山麓泉群',[-1344,196,-321],[-1240,119,-446]),
 geyserRim:view('主泉 · 矿物沉积岸',[-1284,130,-435],[-1260,122,-463],54),
 geyserWater:view('浅池 · 水缘与溢流',[-1229,126,-448],[-1215,121,-460],56),
 geyserVent:view('喷汽口 · 裂岩与根部',[-1320,126,-456],[-1304,119,-474],54),
 geyserBack:view('泉群背面 · 岩岸承托',[-1319,151,-510],[-1240,118,-444],55),
 geyserFoot:view('检视台 · 支柱与地基',[-1210,119,-414],[-1224,120,-429],54),
 geyserApproach:view('林缘支路 · 接回既有小径',[-1241,132,-271],[-1226,109,-313],54),
 geyserService:view('隔离边缘 · 检视路径',[-1161,141,-397],[-1204,118,-455],53),
 geyserOmen:view('文文新闻 · 红光事件选景',[-1344,196,-321],[-1240,119,-446],51,{geyserOmen:true,era:'求闻口授P173 · 炉光与红雾事件意象／非熔岩'}),
 geyserBare:view('泉岸结构 · 暂隐蒸汽',[-1279,155,-395],[-1250,120,-460],53,{geyserNoSteam:true})
};
const block={id:ID,name:'山麓间歇泉 · 地狱谷',center:[CX,122,CZ],poly:[[-1340,-530],[-1148,-530],[-1148,-400],[-1340,-400]],bottom:20,step:4};
G.DIORAMA.blocks.push(block);G.DIORAMA.map.set(ID,block);G.REGION_LABELS[ID]=block.name;
Object.assign(G.PRESETS,views);G.IMPLEMENTED[ID]='geyserOverview';delete G.LANDMARKS.pending[ID];G.LANDMARKS.partial.add(ID);
G.EXTRA_REGION_DEFAULTS={...G.EXTRA_REGION_DEFAULTS,[ID]:'geyserOverview'};G.EXTRA_REGION_CONTEXT={...G.EXTRA_REGION_CONTEXT,[ID]:['forest']};
const owner=G.DIORAMA.owner;G.DIORAMA.owner=(x,z)=>Math.hypot((x-CX)/98,(z-CZ)/63)<1?ID:owner(x,z);
function bank(far){const bins=new Map();return{get(mat,part='body',key='0'){const k=[mat,part,key].join(':');if(!bins.has(k))bins.set(k,{g:new G.Geometry(),mat,part});return bins.get(k).g.place();},finish(meta){const meshes=[...bins].filter(([,b])=>b.g.a.length).map(([k,b])=>{const m=b.g.mesh(`${ID}:${far?'overview':'detail'}:${k}`,['Steam','Jet'].includes(b.mat)?'effects':b.mat==='Water'?'water':'architecture',{owner:ID,region:ID,space:'surface',overview:far,material:'geyser'+b.mat,geyserPart:b.part,basis:'P'});if(b.mat==='Steam'||b.mat==='Jet')m.radius+=26;return m;});return{id:ID,meshes,bytes:meshes.reduce((s,m)=>s+m.vertices.byteLength,0),signs:[],meta};}};}
function beam(g,a,b,r,col=C.wood,n=6){if(G.length(G.sub(a,b))>1e-7)g.tube(a,b,r,col,n,r);}
function rock(g,x,y,z,rx,ry,rz,seed,far,col=C.rock){const n=far?6:9,k=far?3:5,P=(i,j)=>{const a=i*TAU/n,b=j*Math.PI/k,r=1+.12*Math.sin(a*3+seed)*Math.sin(b);return[x+rx*Math.cos(a)*Math.sin(b)*r,y+ry*Math.cos(b),z+rz*Math.sin(a)*Math.sin(b)*r];};for(let i=0;i<n;i++){const I=(i+1)%n;g.tri(P(i,0),P(I,1),P(i,1),col);for(let j=1;j<k-1;j++)g.quad(P(i,j),P(I,j),P(I,j+1),P(i,j+1),G.blend(col,C.chalk,.025*(j%3)));g.tri(P(i,k-1),P(I,k-1),P(i,k),col);}}
function shape(a,seed){return 1+.12*Math.sin(a*3+seed)+.073*Math.cos(a*5+.7*seed)+.036*Math.sin(a*9+seed*1.4);}
function waterHeight(data,p){const ng=G.SurfaceContact.sampler(data,ID),fg=G.SurfaceContact.sampler(data,ID,'far');let h=-Infinity;for(const t of[ng,fg])for(let i=0;i<32;i++){const a=i*TAU/32;for(const r of[0,.5,1.18])h=Math.max(h,t.height(p.x+Math.cos(a)*p.rx*r,p.z+Math.sin(a)*p.rz*r));}return h+.55;}
function pool(B,data,t,p,far){const h=waterHeight(data,p),n=far?36:96,stone=B.get('Mineral','rim',p.id),floor=B.get('Mineral','basin',p.id),water=B.get('Water','water',p.id),levels=[.90,1.0,1.10,1.16,1.28,1.37,1.60];
 const P=(a,r)=>{const f=shape(a,p.phase*10),x=p.x+p.rx*r*Math.cos(a)*f,z=p.z+p.rz*r*Math.sin(a)*f,crust=.065*Math.sin(a*13+p.phase*19)+.043*Math.sin(a*21+r*4);let y;if(r<=.9)y=h-.24;else if(r<=1)y=h+.12+crust;else if(r<=1.1)y=h+.39+.18*Math.sin(a*5)+crust;else if(r<=1.16)y=h+.34+crust;else if(r<=1.28)y=h+.04+crust*.4;else if(r<=1.37)y=Math.max(t.height(x,z)+.15,h-.25);else y=t.height(x,z)+.055;
  // A narrow notch gives the main overflow a real opening through the crust.
  const delta=Math.abs(Math.atan2(Math.sin(a-4.49),Math.cos(a-4.49)));if(p.id==='main'&&r<1.4)y=G.mix(y,Math.min(y,h-.055),1-G.smooth(.045,.115,delta));return[x,y,z];};
 const waterPoint=(a,r)=>{const q=P(a,r);q[1]=h;return q;};
 for(let i=0;i<n;i++){const a=i*TAU/n,b=(i+1)*TAU/n;floor.tri([p.x,h-.24,p.z],P(b,.9),P(a,.9),C.deep);
  water.tri([p.x,h,p.z],waterPoint(b,.64),waterPoint(a,.64),G.blend(C.water,C.deep,.38));water.quad(waterPoint(a,.64),waterPoint(b,.64),waterPoint(b,.9),waterPoint(a,.9),G.blend(C.water,C.chalk,.17));
  for(let j=0;j<levels.length-1;j++){const col=G.blend([C.chalk,C.salt,C.ochre,C.chalk,C.ash,C.soil][j],C.rock,.10+.055*Math.sin(a*7+p.phase*11));stone.quad(P(a,levels[j]),P(b,levels[j]),P(b,levels[j+1]),P(a,levels[j+1]),col);}
  const loA=P(a,1.60),loB=P(b,1.60);stone.quad(loA,loB,[loB[0],loB[1]-.55,loB[2]],[loA[0],loA[1]-.55,loA[2]],C.ash);
 }
 // Low growth lobes follow the banks rather than a ring of identical boulders.
 const nodules=B.get('Mineral','crust',p.id);for(let k=0;k<(far?12:24);k++){const a=k*2.399+p.phase*8,rad=1.16+.18*Math.sin(k*1.7),q=P(a,rad),size=.22+.23*(.5+.5*Math.sin(k*2.2));rock(nodules,q[0],q[1]+size*.22,q[2],size*2.5,size*.63,size*1.1,k,far,G.blend(C.chalk,C.ochre,.16));}

 // A compact raised source throat: the old terrain stays underneath, uncut.
 const throat=B.get('Rock','source',p.id),rr=p.rx*.11;for(let i=0;i<16;i++){const a=i*TAU/16,b=(i+1)*TAU/16,Q=(A,r,Y)=>[p.x+Math.cos(A)*r,Y,p.z+Math.sin(A)*r];throat.quad(Q(a,rr,h+.10),Q(b,rr,h+.10),Q(b,rr*1.7,h+.36),Q(a,rr*1.7,h+.36),C.rock);throat.quad(Q(a,rr,h+.1),Q(a,rr,h-.20),Q(b,rr,h-.20),Q(b,rr,h+.1),C.dark);}
 vapor(B,[p.x,h+.25,p.z],p.phase,far,p.id);if(p.id==='main'){jet(B,[p.x,h+.12,p.z],far);overflow(B,t,p,h,far);}
 return{...p,h,outerRadius:Math.max(p.rx,p.rz)*1.60};}
function vapor(B,p,seed,far,key){const g=B.get('Steam','steam',key),N=far?5:12;for(let i=0;i<N;i++){const center=[p[0]+Math.sin(i*2.4)*.2,p[1],p[2]],corners=[[-1,-1],[1,-1],[1,1],[-1,1]],color=[(i/N+seed)%1,seed,key==='main'?0:1];for(const k of[0,1,2,0,2,3]){const[u,v]=corners[k];g.vertex([center[0]+u*.85,center[1]+v*.85,center[2]],G.norm([u,v,1]),color);}}}
function jet(B,p,far){const g=B.get('Jet','jet'),n=far?5:9;for(let k=0;k<n;k++){const a=k*2.399+.4,scale=.60+.40*(.5+.5*Math.sin(k*1.7));for(let j=0;j<9;j++){const u=j/9,v=(j+1)/9,F=t=>[p[0]+Math.cos(a)*t*t*1.25+Math.sin(t*9+k)*.14,p[1]+(24*t-12*t*t)*scale,p[2]+Math.sin(a)*t*t*1.25];beam(g,F(u),F(v),.035+.10*(1-u),[.62,.81,.79],4);}}}
function overflow(B,t,p,h,far){const route=G.spline([[p.x-2.1,p.z-6.9],[p.x-4.8,p.z-15],[p.x-10,p.z-24],[p.x-9,p.z-31]],1.1),g=B.get('Mineral','runoffBank'),w=B.get('Water','runoff');
 const row=i=>{const q=route[i],a=route[Math.max(0,i-1)],b=route[Math.min(i+1,route.length-1)],d=G.norm([b[0]-a[0],0,b[1]-a[1]]),Y=Math.max(t.height(...q)+.12,h-G.smooth(3,route.length-1,i)*5);return[-1.9,-.64,.64,1.9].map((u,k)=>{const x=q[0]-d[2]*u,z=q[1]+d[0]*u;return[x,k===1||k===2?Y:Math.max(t.height(x,z)+.09,Y+.11),z];});};let a=row(0);for(let i=0;i<route.length-1;i++){const b=row(i+1);w.quad(a[1],a[2],b[2],b[1],G.blend(C.water,C.chalk,.23));for(const j of[0,2])g.quad(a[j],a[j+1],b[j+1],b[j],G.blend(C.chalk,C.ochre,.15));a=b;}
}

function vent(B,data,t,v,far,i){const g=B.get('Rock','fumarole',String(i)),N=far?14:24,Y=Math.max(...[-1,1].flatMap(a=>[-1,1].map(b=>t.height(v.x+a*v.r,v.z+b*v.r))))+.25;
 for(let j=0;j<N;j++){const a=j*TAU/N,b=(j+1)*TAU/N,P=(A,r,yy)=>[v.x+Math.cos(A)*r*shape(A,i),yy,v.z+Math.sin(A)*r*shape(A,i)],A=P(a,v.r*.4,Y),D=P(b,v.r*.4,Y),C1=P(a,v.r*1.7,0),C2=P(b,v.r*1.7,0);C1[1]=t.height(C1[0],C1[2])+.1;C2[1]=t.height(C2[0],C2[2])+.1;g.quad(A,D,C2,C1,C.ochre);g.quad(A,[A[0],Y-.2,A[2]],[D[0],Y-.2,D[2]],D,C.dark);g.tri([v.x,Y-.2,v.z],[D[0],Y-.2,D[2]],[A[0],Y-.2,A[2]],C.dark);}
 vapor(B,[v.x,Y+.1,v.z],v.phase,far,'fumarole'+i);return{...v,Y};}
function platform(B,data,t,far){const ng=G.SurfaceContact.sampler(data,ID),fg=G.SurfaceContact.sampler(data,ID,'far'),x=-1228,z=-432,w=8,d=6,feet=[];for(const a of[-1,1])for(const b of[-1,1]){const X=x+a*(w/2-.4),Z=z+b*(d/2-.4);feet.push([X,Math.min(ng.height(X,Z),fg.height(X,Z))-.5,Z]);}
 const y=Math.max(...feet.map(p=>Math.max(ng.height(p[0],p[2]),fg.height(p[0],p[2]))))+.85,g=B.get('Wood','platform'),rockG=B.get('Rock','foundation');
 for(const p of feet){rockG.box(p[0],p[1],p[2],.8,y-p[1]-.35,.8,C.rock);g.box(p[0],y-.4,p[2],.24,1.9,.24,C.wood);}
 for(const a of[-1,1]){g.box(x,y-.30,z+a*(d/2-.4),w,.28,.27,C.wood);g.box(x+a*(w/2-.4),y-.24,z,.26,.2,d,C.wood);}
 for(let Z=z-d/2;Z<z+d/2;Z+=.38)g.box(x,y,Z,w,.18,.35,C.wood);
 for(const a of[-1,1])beam(g,[x+a*(w/2-.4),y+1.3,z-d/2+.4],[x+a*(w/2-.4),y+1.3,z+d/2-.4],.065,C.rope);
 beam(g,[x-w/2+.4,y+1.3,z-d/2+.4],[x+w/2-.4,y+1.3,z-d/2+.4],.065,C.rope);
 // Entrance side remains open; twelve supported steps meet the inherited grade.
 const stair=[],count=12,front=z+d/2+.3,end=front+(count-1)*.48,bottom=Math.max(ng.height(x,end),fg.height(x,end))+.16;for(let i=0;i<count;i++){const Z=front+i*.48,Y=G.mix(y+.18,bottom,(i+1)/count),base=Math.min(ng.height(x,Z),fg.height(x,Z))-.35;rockG.box(x,base,Z,3,Y-base,i===0?.88:.52,C.ash);stair.push([x,Y,Z]);}
 if(!far){for(let i=0;i<7;i++){const X=x-w/2+i*1.25;g.box(X,y+.181,z,.014,.01,d,C.dark);}}
 return{x,z,y,feet,stair,width:w,depth:d};}
function scatter(B,data,t,far){const stones=B.get('Rock','ridge'),small=B.get('Mineral','gravel'),r=G.rng(107108),points=[];
 const old=data.geyserObstacles||[];for(let i=0;i<160&&points.length<52;i++){const x=CX-73+r()*139,z=CZ-46+r()*76;if(pools.some(p=>Math.hypot((x-p.x)/(p.rx*1.72),(z-p.z)/(p.rz*1.72))<1)||Math.hypot(x+1228,z+432)<12||old.some(p=>Math.hypot(x-p[0],z-p[1])<5)||rimPath.some(p=>Math.hypot(x-p[0],z-p[1])<4))continue;const size=.7+r()*1.8,y=t.height(x,z);rock(stones,x,y+size*.23,z,size*2.1,size*.49,size*.8,i,far,G.blend(C.rock,C.ash,r()*.35));points.push([x,y,z,size]);}
 if(!far)for(let i=0;i<60;i++){const a=i*2.399,p=pools[i%3],x=p.x+Math.cos(a)*p.rx*1.48,z=p.z+Math.sin(a)*p.rz*1.48;rock(small,x,t.height(x,z)+.15,z,.25,.18,.38,i,true,C.chalk);}
 return points;}
function build(data,far=false){const B=bank(far),t=G.SurfaceContact.sampler(data,ID,far?'far':'near'),ps=pools.map(p=>pool(B,data,t,p,far)),vs=vents.map((v,i)=>vent(B,data,t,v,far,i)),deck=platform(B,data,t,far),stones=scatter(B,data,t,far);
 return B.finish({locations:[ID],pools:ps,vents:vs,deck,stones,basis:'P',terrainMutation:false,fullUndergroundCenter:false,shrineSpring:false,physicalElevator:false,fluidSimulation:false});}
function prepare(data,pack){G.SurfaceContact.prepare(data,pack,ID,bounds);const seen=new Map();for(const m of pack.meshes){if(!m.instances||m.group!=='vegetation')continue;for(let i=0;i<m.instances.length;i+=16){const a=m.instances,x=a[i+12],z=a[i+14];if(x>=bounds[0]&&x<=bounds[2]&&z>=bounds[1]&&z<=bounds[3])seen.set(x+','+z,[x,z]);}}data.geyserObstacles=[...seen.values()];}
function publicPaths(data,pack){const sample=G.ASAMA.sampleRenderedTerrain(pack),bins=new Map(),cross=[-1.3,-1,0,1,1.3];for(const lod of['near','far'])for(const path of[approach,rimPath]){const row=i=>{const p=path[i],a=path[Math.max(0,i-1)],b=path[Math.min(path.length-1,i+1)],d=G.norm([b[0]-a[0],0,b[1]-a[1]]);return cross.map(u=>{const q=sample(p[0]-d[2]*1.35*u,p[1]+d[0]*1.35*u,lod),w=1-G.smooth(.85,1.3,Math.abs(u));q.p[1]+=.11+.12*w;q.c=G.blend(q.c,C.soil,w*.8);return q;});};let a=row(0);for(let i=0;i<path.length-1;i++){const b=row(i+1),s=a[2].tile;if(!bins.has(s.id))bins.set(s.id,{g:new G.Geometry(),s});const g=bins.get(s.id).g;for(let j=0;j<cross.length-1;j++)for(const p of[a[j],b[j+1],b[j],a[j],a[j+1],b[j+1]])g.vertex(p.p,p.n,p.c);a=b;}}
 return[...bins.values()].map(({g,s})=>{const m=g.mesh(ID+':public:'+s.id,'roads',{owner:ID,region:ID,space:'surface',overview:true,globalSurface:true,globalNear:s.globalNear,globalFar:s.globalFar,material:'geyserPath',geyserPart:'path',terrainSource:s.id,basis:'P'});return{...m,center:s.center.slice(),radius:Math.max(s.radius+3,m.radius+G.length(G.sub(m.center,s.center)))};});}
G.GEYSER={id:ID,version:'0.29-geyser.1',views,pools,vents,bounds,approach,rimPath,CX,CZ,build,prepare,publicPaths,waterHeight};
G.extraOverviewBuilders=[...(G.extraOverviewBuilders||[]),(data,pack)=>{prepare(data,pack);return[...build(data,true).meshes,...publicPaths(data,pack)];}];
const previous=G.buildRegion;G.buildRegion=async(data,id,legacy)=>{if(id!==ID)return previous(data,id,legacy);const start=performance.now(),p=build(data);p.builtMs=performance.now()-start;return p;};
})(globalThis.GA);
