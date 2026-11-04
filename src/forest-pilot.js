/* 入口—林内公共样板。群落位置是一份声明，近远只改变贴地采样与原型。
 * 不改原树、道路、建筑；公共层始终存在，不等待森林详情包。 */
(function(G){'use strict';
const REVISION=3,CONTACT='forest-pilot',ROI=Object.freeze([-896,-128,-560,112]),CELL=96;
// x、z、东西/南北半径；路旁连续的群落之间保留自然缺口。
const colonies=Object.freeze([
 [-607,48,12,10],[-626,7,13,11],[-642,38,14,11],[-666,-5,14,12],
 [-679,29,13,12],[-701,-24,14,10],[-712,6,13,11],[-739,-44,14,12],
 [-744,-3,15,11],[-772,-59,14,12],[-778,-20,15,12],[-799,-76,13,11],
 [-810,-38,14,11],[-830,-94,13,12],[-847,-47,15,12],[-863,-91,16,12],
 [-880,-62,11,12],[-806,6,16,13],[-852,19,13,14],[-869,55,13,13],
 [-782,31,15,12],[-738,34,15,12],[-693,54,14,12],[-644,69,12,11]
].map(a=>Object.freeze(a)));
const clamp=x=>Math.max(0,Math.min(1,x));
const distance=(x,z,a,b)=>{const dx=b[0]-a[0],dz=b[1]-a[1],u=clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1));return Math.hypot(x-a[0]-u*dx,z-a[1]-u*dz);};
const kourindou=(x,z)=>Math.hypot((x+560)/115,(z+6)/97);
const weight=(x,z)=>G.smooth(0,20,Math.min(x-ROI[0],ROI[2]-x,z-ROI[1],ROI[3]-z))*G.smooth(.80,1.05,kourindou(x,z));
let routeCache;
function routes(){
 if(routeCache)return routeCache;
 routeCache=[];
 for(const path of [...G.FOREST.paths,...G.ISLAND.allRoutes])for(let i=1;i<path.samples.length;i++){
  const a=path.samples[i-1],b=path.samples[i];
  if(Math.max(a[0],b[0])<ROI[0]-20||Math.min(a[0],b[0])>ROI[2]+20||Math.max(a[1],b[1])<ROI[1]-20||Math.min(a[1],b[1])>ROI[3]+20)continue;
  routeCache.push({a,b,half:path.width*.5});
 }
 return routeCache;
}
function routeDistance(x,z){let d=Infinity;for(const s of routes())d=Math.min(d,distance(x,z,s.a,s.b)-s.half);return d;}
// 着色只用约半米误差的折线；植物净空仍使用上面的原始完整采样。
function groundLanes(){
 const simplify=ps=>{let worst=.45,index=-1;for(let i=1;i<ps.length-1;i++){const d=distance(...ps[i],ps[0],ps.at(-1));if(d>worst){worst=d;index=i;}}
  return index<0?[ps[0],ps.at(-1)]:[...simplify(ps.slice(0,index+1)).slice(0,-1),...simplify(ps.slice(index))];};
 const out=[];
 for(const path of G.FOREST.paths){const ps=simplify(path.samples);for(let i=1;i<ps.length;i++){
  const a=ps[i-1],b=ps[i];if(Math.max(a[0],b[0])<ROI[0]-12||Math.min(a[0],b[0])>ROI[2]+12||Math.max(a[1],b[1])<ROI[1]-12||Math.min(a[1],b[1])>ROI[3]+12)continue;
  out.push([a[0],a[1],b[0],b[1],path.width*.5]);
 }}return out;
}
let fieldCache;
function groundField(){
 if(fieldCache)return fieldCache;
 const width=512,height=384,values=new Uint8Array(width*height*4),lanes=groundLanes().map(([ax,az,bx,bz,half])=>({ax,az,dx:bx-ax,dz:bz-az,inv:1/((bx-ax)**2+(bz-az)**2||1),half}));
 for(let row=0;row<height;row++)for(let col=0;col<width;col++){
  const x=ROI[0]+(col+.5)/width*(ROI[2]-ROI[0]),z=ROI[1]+(row+.5)/height*(ROI[3]-ROI[1]),at=(row*width+col)*4;
  let road=Infinity;for(const s of lanes){const u=clamp(((x-s.ax)*s.dx+(z-s.az)*s.dz)*s.inv);road=Math.min(road,Math.hypot(x-s.ax-u*s.dx,z-s.az-u*s.dz)-s.half);}
  const macro=G.noise(x*.045,z*.045),patch=G.noise(x*.14,z*.14),litter=G.smooth(.27,.78,macro)*.72,edge=G.smooth(-.15,2.0,road);
  const moss=[.060,.090,.035],soil=[.100,.075,.035],earth=[.265,.230,.158];
  for(let k=0;k<3;k++){
   const floor=(moss[k]+(soil[k]-moss[k])*litter)*(.92+patch*.16),path=earth[k]*(.96+patch*.08);
   values[at+k]=Math.round(255*(path+(floor-path)*edge));
  }
  values[at+3]=Math.round(weight(x,z)*255);
 }
 // 线性 RGBA：RGB 是绝对目标反照率，A 是既有场景的边缘混合权重。
 fieldCache={width,height,values};return fieldCache;
}
const prototypeCache=new Map();
function fern(lod){
 if(prototypeCache.has(lod))return prototypeCache.get(lod);
 const g=new G.Geometry(),far=lod==='far',leaf=G.rgb('#607642');
 // 五根弯曲羽轴，每根三对宽羽片；中景仍可读出叶面而不是细碎噪点。
 for(let i=0;i<5;i++){
  const a=i*Math.PI*2/5+.16*Math.sin(i*1.9),r=.93+(i%3)*.10,h=.53+(i%3)*.065;
  const p=t=>[Math.cos(a)*r*t,Math.sin(t*Math.PI*.80)*h-.07,Math.sin(a)*r*t],side=[-Math.sin(a),0,Math.cos(a)],c=leaf.map(v=>v*(.89+(i%4)*.045));
  if(far){
   const root=p(0),mid=p(.49),tip=p(1),left=G.add(mid,G.mul(side,.30)),right=G.add(mid,G.mul(side,-.30));mid[1]+=.045;
   for(const tri of [[root,mid,left],[mid,tip,left],[root,right,mid],[mid,right,tip]])g.tri(...tri,c);
   continue;
  }
  for(let j=0;j<3;j++){
   const start=p(j*.30),end=p((j+1)*.30);g.tri(G.add(start,G.mul(side,-.009)),G.add(start,G.mul(side,.009)),end,c);
   const t=.26+j*.22,root=p(t),len=.37-j*.052;
   for(const sign of [-1,1]){
    const yaw=a+sign*(.81+j*.05),axis=[Math.cos(yaw),.09,Math.sin(yaw)],across=[-Math.sin(yaw),0,Math.cos(yaw)];
    const tip=G.add(root,G.mul(axis,len)),center=G.add(root,G.mul(axis,len*.48));center[1]+=.024;
    const l=G.add(center,G.mul(across,.135-j*.015)),q=G.add(center,G.mul(across,-.108+j*.010));
    g.tri(root,tip,l,c);g.tri(root,q,tip,c);
   }
  }
  const root=p(.82),tip=p(1);g.tri(G.add(root,G.mul(side,-.028)),G.add(root,G.mul(side,.028)),tip,c);
 }
 const a=g.mesh('forest-pilot:fern').vertices;prototypeCache.set(lod,a);return a;
}
function shrub(lod){
 const key='shrub:'+lod;if(prototypeCache.has(key))return prototypeCache.get(key);
 // 复用已验收远冠的同源体积，不把 1740 面的枝叶原型复制到整片林下。
 const source=G.FOREST_ENTRANCE_PLANTS.shrub('far'),g=new G.Geometry(),near=lod==='near',leaf=G.rgb('#627a46'),wood=G.rgb('#6d6045'),points=new Map();
 for(let i=0;i<source.length;i+=9){
  const p=Array.from(source.subarray(i,i+3)),n=Array.from(source.subarray(i+3,i+6)),c=Array.from(source.subarray(i+6,i+9));
  points.set(p.join(':'),{p:p.slice(),n:n.slice()});
  if(near){p[0]*=.58;p[1]=.70+(p[1]-.70)*.68;p[2]*=.58;g.vertex(p,G.norm([n[0]/.58,n[1]/.68,n[2]/.58]),c.map(v=>v*.52));}
  else g.vertex(p,n,c.map(v=>v*.82));
 }
 // 三条埋地支撑连接两簇体积；每条三面即可，细枝留给近看叶片。
 for(const [x,z,y]of [[-.35,-.32,.90],[.35,.35,1.18],[-.45,.45,.96]]){
  const ring=[0,1,2].map(j=>[Math.cos(j*Math.PI*2/3)*.055,-.18,Math.sin(j*Math.PI*2/3)*.055]);
  for(let j=0;j<3;j++)g.tri(ring[j],ring[(j+1)%3],[x,y,z],wood);
 }
 if(near){let index=0;for(const {p,n} of points.values()){
  // 外围折叶源自相同体积表面。保留实心内部和破碎边缘，避免稀薄草梗。
  const root=[p[0]*.74,Math.max(.26,.70+(p[1]-.70)*.88),p[2]*.74],support=[p[0]*.56,.70+(p[1]-.70)*.66,p[2]*.56],yaw=Math.atan2(p[2],p[0]);
  for(const sign of [-1,1]){
   const turn=yaw+sign*.63+(index%3)*.10,len=.48+(index%4)*.045,axis=G.norm([Math.cos(turn),Math.max(.08,n[1]*.30+.14),Math.sin(turn)]),side=[-Math.sin(turn),0,Math.cos(turn)];
   const middle=G.add(root,G.mul(axis,len*.51)),tip=G.add(root,G.mul(axis,len)),left=G.add(middle,G.mul(side,.17)),right=G.add(middle,G.mul(side,-.14));middle[1]+=.045;
   const c=leaf.map(v=>v*(.87+(index%4)*.045));
   g.tri(G.add(support,G.mul(side,.014)),G.add(support,G.mul(side,-.014)),root,wood);
   for(const tri of [[root,middle,left],[middle,tip,left],[root,right,middle],[middle,right,tip]])g.tri(...tri,c);
  }index++;
 }}
 const result=g.mesh('forest-pilot:shrub').vertices;prototypeCache.set(key,result);return result;
}
function prototype(kind,lod){return kind==='shrub'?shrub(lod):fern(lod);}
function extent(kind){let radius=0;for(const lod of ['near','far']){const a=prototype(kind,lod);for(let i=0;i<a.length;i+=9)radius=Math.max(radius,Math.hypot(a[i],a[i+1],a[i+2]));}return radius;}
function sites(){
 const random=G.rng(817261),out=[],radii={fern:extent('fern'),shrub:extent('shrub')};
 for(let group=0;group<colonies.length;group++){
  const [cx,cz,rx,rz]=colonies[group],count=32+(group*11)%25,height=.86+(group%5)*.055;
  for(let j=0;j<count;j++){
   const a=j*2.399963229728653+random()*.32,edge=.87+.13*Math.sin(a*3+group*.79)+.11*Math.cos(a*2-group),r=Math.sqrt((j+.4)/count)*edge,x=cx+Math.cos(a)*rx*r,z=cz+Math.sin(a)*rz*r;
   const kind=random()<.22+(group%4)*.04?'shrub':'fern',size=(kind==='shrub'?.66+random()*.47:.69+random()*.39)*height,angle=random()*Math.PI*2,radius=radii[kind]*size;
   if(weight(x,z)<.18||routeDistance(x,z)<radius+.9)continue;
   // 林下可叠叶，根心保持间距，避免形成整齐的灌木墙。
   if(out.some(p=>Math.hypot(p.x-x,p.z-z)<(kind==='shrub'&&p.kind==='shrub'?2.5:1.65)))continue;
   out.push({id:group+':'+j,x,z,kind,size,angle,radius,tint:.89+random()*.13});
  }
 }
 return out;
}
function matrix(site,sampler){
 const {x,z,size,angle}=site,n=sampler.normal(x,z),right=G.norm(G.cross(n,[Math.sin(angle),0,Math.cos(angle)])),back=G.cross(right,n);
 // 正交基保留真实法线，不使用会使 Three 实例法线失真的剪切矩阵。
 return [...right.map(v=>v*size),0,...n.map(v=>v*size),0,...back.map(v=>v*size),0,x,sampler.height(x,z)-.12,z,1];
}
function envelope(instances,near,far){
 const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity],b=G.FOREST_ENTRANCE_PLANTS.bounds;
 for(const a of [near,far]){const box=b(a);for(let i=0;i<instances.length;i+=16)for(const x of [box.min[0],box.max[0]])for(const y of [box.min[1],box.max[1]])for(const z of [box.min[2],box.max[2]])for(let k=0;k<3;k++){
  const v=instances[i+k]*x+instances[i+4+k]*y+instances[i+8+k]*z+instances[i+12+k];lo[k]=Math.min(lo[k],v);hi[k]=Math.max(hi[k],v);
 }}return{center:lo.map((v,k)=>(v+hi[k])*.5),radius:Math.hypot(...hi.map((v,k)=>(v-lo[k])*.5))+.001};
}
function prepare(data,pack){
 if(pack.meta?.forestPilot?.revision===REVISION)return [];
 const local={},contacts=G.SurfaceContact.prepare(local,pack,CONTACT,[ROI[0]-8,ROI[1]-8,ROI[2]+8,ROI[3]+8]),layout=sites(),added=[];
 const sourceMap=new Map(pack.meshes.filter(m=>m.component==='island-terrain'&&!m.cutOnly).map(m=>[m.id,m]));
 for(const lod of ['near','far']){
  const sampler=G.SurfaceContact.sampler(local,CONTACT,lod),groups=new Map();
  for(const site of layout){
   const tx=Math.floor(site.x/256)*256,tz=Math.floor(site.z/256)*256,terrainSource='island:terrain:'+tx+':'+tz+(lod==='far'?':far':'');
   if(!sourceMap.has(terrainSource))throw Error('Missing forest pilot terrain: '+terrainSource);
   const key=[Math.floor(site.x/CELL),Math.floor(site.z/CELL),site.kind,tx,tz].join(':');
   if(!groups.has(key))groups.set(key,{terrainSource,kind:site.kind,sites:[]});groups.get(key).sites.push(site);
  }
  for(const [key,batch] of groups){
   const vertices=prototype(batch.kind,'near'),farVertices=prototype(batch.kind,'far'),instances=Float32Array.from(batch.sites.flatMap(p=>matrix(p,sampler))),instanceColors=Float32Array.from(batch.sites.flatMap(p=>[p.tint,p.tint,p.tint]));
   added.push({id:'forest:pilot:'+key+':'+lod,group:'vegetation',component:'transition-vegetation',forestPilot:true,
    owner:'island',region:'forest',space:'surface',globalSurface:true,overview:true,material:'landscapeLeaf',
    vertices,farVertices,instances,instanceColors,...envelope(instances,vertices,farVertices),
    terrainSource:batch.terrainSource,forestPilotTerrainLod:lod,forestPilotKind:batch.kind,forestPilotSites:batch.sites.map(p=>p.id),lodDistance:115,basis:'P'});
  }
 }
 // 不替换原容器或源数组。生产入口会把返回值追加到公共包。
 data.forestPilot={revision:REVISION,sites:layout,contactBytes:contacts.near.byteLength+contacts.far.byteLength};
 pack.meta={...pack.meta,forestPilot:{revision:REVISION,sites:layout.length,records:added.length,public:true}};
 return added;
}
G.FOREST_PILOT={revision:REVISION,roi:ROI,colonies,weight,routeDistance,groundLanes,groundField,prototype,sites,prepare};
G.extraOverviewBuilders=[...(G.extraOverviewBuilders||[]),prepare];
})(globalThis.GA);
