/* P: bounded Marisa understorey and continuous ground albedo.
 * Existing mixed mushrooms, ancient-oak foliage and fallen wood stay intact.
 * Only source RGB is copied; all plants contact the rendered near/far terrain.
 */
(function(G){'use strict';
const M=Math,REVISION=2,CONTACT='forest-canopy-ground';
const ROI=Object.freeze([-1120,0,-896,224]),MAX_SITES=150,MAX_BYTES=1536*1024;
const terrainIds=Object.freeze(['island:terrain:-1280:0','island:terrain:-1280:0:far','island:terrain:-1024:0','island:terrain:-1024:0:far']);
const pathIds=new Set(['island:routes:forest:-2:0','island:routes:forest:-2:0:shoulder','island:routes:forest:-3:0','island:routes:forest:-3:0:shoulder']);
// Exact XZ values from the 47 retained native matrices, sorted by leaf ID/index.
// This small field is also available before the detail Worker has finished.
const treeSites=Object.freeze([
 [-1119.5640869140625,90.92900085449219],[-1065.3824462890625,16.051958084106445],[-1046.8734130859375,56.94197082519531],[-1042.2415771484375,84.57070922851562],[-1019.74462890625,32.260623931884766],[-1027.364013671875,66.47394561767578],[-1025.48583984375,83.44720458984375],
 [-1071.8072509765625,40.9617805480957],[-1075.788818359375,81.35940551757812],[-1052.4681396484375,19.03943634033203],[-1119.607177734375,33.57746124267578],[-1065.5594482421875,54.82994079589844],[-1045.16455078125,30.956546783447266],[-1019.0360717773438,12.98951244354248],
 [-1115.5247802734375,222.551025390625],[-1093.037841796875,208.01919555664062],[-1068.8992919921875,152.9046173095703],[-1052.1151123046875,199.07733154296875],[-1116.437255859375,113.87789154052734],[-1091.396728515625,174.93992614746094],[-1090.02978515625,222.82431030273438],[-1075.81982421875,184.0180206298828],[-1069.47509765625,205.22024536132812],
 [-1116.2489013671875,177.35328674316406],[-1100.068115234375,131.7473907470703],[-1088.1915283203125,160.96054077148438],[-1073.3984375,223.53866577148438],[-998.6724243164062,18.53131866455078],[-971.1068115234375,34.763431549072266],[-901.4971923828125,84.96156311035156],
 [-997.74951171875,56.00090408325195],[-949.7302856445312,40.12205505371094],[-928.1705322265625,17.37971305847168],[-907.7057495117188,18.316434860229492],[-993.0808715820312,40.64457321166992],[-926.3119506835938,43.090850830078125],[-932.4824829101562,65.9397201538086],[-926.0379028320312,84.57313537597656],
 [-998.9935302734375,208.45826721191406],[-928.8463134765625,160.73741149902344],[-922.7785034179688,199.81858825683594],[-902.742431640625,206.50413513183594],[-923.0752563476562,176.91793823242188],[-904.6710815429688,130.81759643554688],[-979.9246826171875,208.12498474121094],[-956.2305297851562,200.0811309814453],[-900.4444580078125,160.42648315429688]
].map(p=>Object.freeze(p)));
const grass=G.rgb('#74804f'),litter=G.rgb('#776b4e'),earth=G.rgb('#938569'),leaf=G.rgb('#708452'),shrubLeaf=G.rgb('#748258');
// Small asymmetric outer groups, not a ring around the home or a uniform grid.
// Every candidate still passes source-tile, all-route and actual-ground tests.
const outerGroups=Object.freeze([
 {id:'west-front',center:[-1030,143],offsets:[[-2,-4,1],[2,-1,0],[-1,2,1],[-4,4,0],[1,7,0],[0,-7,1]]},
 {id:'west-upper',center:[-1029,118],offsets:[[-3,-4,0],[1,-2,1],[-1,2,0],[1.5,1.2,1],[-3,6,1]]},
 {id:'south-east',center:[-984,171],offsets:[[-5,0,1],[-1,0,0],[3,-1,1],[4,3,0],[5,-4,0],[9,0,1]]},
 {id:'east-bend',center:[-969,164],offsets:[[-4,0,0],[0,1,1],[3,-1,1],[5,3,0],[0,7,0]]}
].map(g=>Object.freeze({...g,center:Object.freeze(g.center),offsets:Object.freeze(g.offsets.map(p=>Object.freeze(p)))})));
// P: two short woodland-edge bands at the actually visible native forest feet.
// They use overlapping pairs and a low inner row, with gaps at the old roads.
// V5's western/eastern candidates were outside the fixed Marisa view. These
// replacements are still candidates: route, ground and root tests may omit them.
const transitionBands=Object.freeze([
 {id:'west',line:[[-1025.48583984375,83.44720458984375],[-1021,90],[-1020,103],[-1029,114],[-1028,120]],branch:[[-1021,92],[-1027.5,91],[-1027,105]],widths:[8,6,7,6],sites:[
  [-1021,89,1.07,'shrub',.36],[-1020,92.2,1.04,'shrub',3.34],[-1027.5,91,.76,'fern',2.02],
  [-1021,101,1.10,'shrub',5.87],[-1020,104.2,1.04,'shrub',1.30],[-1027,105,.80,'fern',4.93],
  [-1028,111,1.06,'shrub',4.00],[-1030.4,113.4,1.00,'shrub',6.20]
 ]},
 {id:'east',line:[[-928.8463134765625,160.73741149902344],[-936,160],[-949,163],[-958,166],[-966,163]],branch:[[-966,163],[-969,165],[-973,164]],widths:[8,6,7,5],sites:[
  [-936,160,1.10,'shrub',.83],[-939,161,1.04,'shrub',3.92],[-942,164,.79,'fern',5.40],
  [-948,163,1.08,'shrub',6.82],[-951,164.5,1.04,'shrub',1.52],[-956,166,.76,'fern',8.31]
 ]}
].map(b=>Object.freeze({...b,line:Object.freeze(b.line.map(p=>Object.freeze(p))),branch:Object.freeze(b.branch.map(p=>Object.freeze(p))),widths:Object.freeze(b.widths),sites:Object.freeze(b.sites.map(p=>Object.freeze(p)))})));
// Conservatively include the existing roof/shed/porch/crates and the original
// porch-to-path stones plus an open continuation out of the yard. No new layout.
const homeObstacles=Object.freeze([[-1016,128,-988,152],[-992,131,-974,150],[-1012,147,-987,155],[-1004,152,-996,178]].map(p=>Object.freeze(p)));
const obstacleDistance=(x,z)=>M.min(...homeObstacles.map(([x0,z0,x1,z1])=>M.hypot(M.max(x0-x,0,x-x1),M.max(z0-z,0,z-z1))));
const clamp=x=>M.max(0,M.min(1,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const homeDistance=(x,z)=>M.hypot((x+997)/38,(z-144)/34);
function weight(x,z){
 if(x<ROI[0]||x>=ROI[2]||z<ROI[1]||z>=ROI[3])return 0;
 // Preserve the entire .69 home core. The outer ramp is narrower than the
 // existing home shader, avoiding a second full-width attenuation there.
 return smooth(0,20,M.min(x-ROI[0],ROI[2]-x,z-ROI[1],ROI[3]-z))*smooth(.69,.86,homeDistance(x,z))*smooth(26,38,M.hypot(x+1093,z-56));
}
let routeSegments;
function lanes(){
 if(routeSegments)return routeSegments;
 const route=G.ISLAND?.allRoutes?.find(p=>p.id==='route-marisa');
 if(!route?.samples?.length||route.width!==2.8)throw Error('Forest canopy requires the retained Marisa public route');
 const out=[];for(let i=1;i<route.samples.length;i++){
  const a=route.samples[i-1],b=route.samples[i];
  if(M.max(a[0],b[0])<ROI[0]-32||M.min(a[0],b[0])>ROI[2]+32||M.max(a[1],b[1])<ROI[1]-32||M.min(a[1],b[1])>ROI[3]+32)continue;
  if(![...a,...b].every(Number.isFinite))throw Error('Invalid forest canopy route');
  out.push(Object.freeze([a[0],a[1],b[0],b[1]]));
 }
 if(!out.length||out.length>96)throw Error('Forest canopy route segment budget requires review');
 routeSegments=Object.freeze(out);return routeSegments;
}
function pathDistance(x,z){let best=Infinity;for(const [ax,az,bx,bz]of lanes()){
 const dx=bx-ax,dz=bz-az,u=clamp(((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz||1)),qx=x-ax-u*dx,qz=z-az-u*dz;best=M.min(best,qx*qx+qz*qz);
}return M.sqrt(best);}
function colorAt(x,z,original){
 const w=weight(x,z);if(w===0)return original;
 const road=1-smooth(1.4,6.4,pathDistance(x,z));let density=0;
 for(const [tx,tz]of treeSites)density+=1-smooth(5,29,M.hypot(x-tx,z-tz));
 const floor=clamp(density/1.65)*.64,target=grass.map((v,i)=>(v+(litter[i]-v)*floor)*(1-road)+earth[i]*road);
 return original.map((v,i)=>v+(target[i]-v)*w*.76);
}
function pathColors(m,a,original){
 if(!pathIds.has(m.id))return original;
 if(!ArrayBuffer.isView(a)||a.length%9||!ArrayBuffer.isView(original)||original.constructor.name!=='Uint8Array'||original.length!==a.length/3)throw Error('Invalid forest canopy road color view');
 let out;for(let i=0,j=0;i<a.length;i+=9,j+=3){
  if(weight(a[i],a[i+2])===0)continue;
  const c=colorAt(a[i],a[i+2],[original[j]/255,original[j+1]/255,original[j+2]/255]);
  for(let k=0;k<3;k++){const v=M.round(clamp(c[k])*255);if(v!==original[j+k]){out??=original.slice();out[j+k]=v;}}
 }return out||original;
}
const preparedPacks=new WeakSet();
function prepare(data,pack){
 if(preparedPacks.has(pack))return [];
 const found=new Map();for(const m of pack.meshes)if(terrainIds.includes(m.id)){
  if(found.has(m.id)||m.component!=='island-terrain'||m.material!=='ground'||m.cutOnly||!m.globalSurface||!m.index||m.vertices?.constructor.name!=='Float32Array'||m.vertices.length%9||!m.tile||m.tile[2]!==256)throw Error('Forest canopy terrain identity requires review: '+m.id);
  found.set(m.id,m);
 }
 if(found.size!==4)throw Error('Missing forest canopy terrain sources');
 const changes=new Map();let changedVertices=0,copiedBytes=0;
 for(const [id,m]of found){let out;for(let i=0;i<m.vertices.length;i+=9){
  const a=m.vertices,c=colorAt(a[i],a[i+2],[a[i+6],a[i+7],a[i+8]]);let changed=false;
  for(let k=0;k<3;k++)if(M.fround(c[k])!==a[i+6+k]){out??=a.slice();out[i+6+k]=c[k];changed=true;}
  if(changed)changedVertices++;
 }if(out){changes.set(id,{...m,vertices:out});copiedBytes+=out.byteLength;}}
 const meshes=pack.meshes.map(m=>changes.get(m.id)||m),temp={};
 const contacts=G.SurfaceContact.prepare(temp,{meshes:Array.from(found.values())},CONTACT,[ROI[0]-2,ROI[1]-2,ROI[2]+2,ROI[3]+2]);
 const contactBytes=contacts.near.byteLength+contacts.far.byteLength;
 if(contactBytes>256*1024||copiedBytes>MAX_BYTES)throw Error('Forest canopy ground source budget exceeded');
 const sources=Array.from(found.values(),m=>({id:m.id,tile:m.tile.slice(),center:m.center.slice(),radius:m.radius,far:!!m.globalFar}));
 // Publish only after all bounded preparation has succeeded.
 (data.surfaceContacts??={})[CONTACT]=contacts;
 data.forestCanopyGround={revision:REVISION,sources,changedVertices,copiedBytes,contactBytes};
 pack.meshes=meshes;preparedPacks.add(pack);return [];
}
function sitesFromTrees(pack){
 const records=pack.meshes.filter(m=>/^forest:trees:(-10|-9):(0|1):[012]:leaf$/.test(m.id)).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
 if(records.length!==12)throw Error('Forest canopy requires twelve retained leaf groups');
 const trees=[];for(const m of records){const a=m.instances;if(a?.constructor.name!=='Float32Array'||a.length%16)throw Error('Invalid forest canopy native matrices');
  for(let i=0;i<a.length;i+=16){const expected=treeSites[trees.length];if(!expected||a[i+12]!==expected[0]||a[i+14]!==expected[1])throw Error('Forest canopy tree sites require review');trees.push({id:m.id+':'+i/16,x:a[i+12],z:a[i+14],angle:M.atan2(a[i+8],a[i]),rootRadius:M.hypot(a[i],a[i+2])*3.05});}
 }if(trees.length!==47)throw Error('Forest canopy native tree count requires review');
 const sites=[];
 function add(id,x,z,angle,size,kind='fern',outer=false){
  const radius=2.1*size,tileX=x<-1024?-1280:-1024;
  if(weight(x,z)<.12)return 'ground-field-boundary';
  if(M.min(x-tileX,tileX+256-x,z,256-z)<radius+.3)return 'terrain-tile-boundary';
  if(homeDistance(x,z)<(outer?.80:1.12))return 'home-clearance';
  if(M.hypot(x+1093,z-56)<30+radius)return 'mushroom-clearance';
  if(pathDistance(x,z)<3.4+radius)return 'public-route-clearance';
  if(G.FOREST.routeDistance(x,z)<radius+.7)return 'forest-route-clearance';
  if(obstacleDistance(x,z)<radius+.5)return 'building-or-entry-clearance';
  // Root centers remain separate while natural shrub crowns may overlap.
  // The first 79 clumps retain their old 2.8 m spacing and exact geometry.
  if(sites.some(p=>M.hypot(p.x-x,p.z-z)<(outer?(kind==='shrub'&&p.kind==='shrub'?2.3:1.45):2.8)))return 'retained-plant-clearance';
  if(sites.length>=MAX_SITES)throw Error('Forest canopy understorey site budget exceeded');
  sites.push({id,x,z,angle,size,tileX,kind});return 'retained';
 }
 for(let i=0;i<trees.length;i++){const t=trees[i];for(let j=0;j<2;j++){
  const angle=t.angle+i*.77+(j?2.35:0),r=(j?6.7:4.1)+(i%3)*.55;
  add(t.id+':ground:'+j,t.x+M.cos(angle)*r,t.z+M.sin(angle)*r,angle+.45,(j?.80:1.02)+(i%4)*.05);
 }}
 // Sparse pairs along the actual bend, separated by walking distance. Some
 // candidates intentionally fail yard/path/tile clearance, leaving gaps.
 let length=0,next=9,n=0;for(const [ax,az,bx,bz]of lanes()){
  const dx=bx-ax,dz=bz-az,len=M.hypot(dx,dz);if(!len)continue;
  while(next<=length+len){const u=(next-length)/len,x=ax+dx*u,z=az+dz*u,side=n%2?1:-1,offset=6.9+(n%3)*.6;
   add('marisa-route-ground:'+n,x-dz/len*offset*side,z+dx/len*offset*side,M.atan2(dz,dx)+side*.4,.88+(n%3)*.07);next+=13;n++;
  }length+=len;
 }
 for(let group=0;group<outerGroups.length;group++){
  const g=outerGroups[group];for(let i=0;i<g.offsets.length;i++){
   const [dx,dz,shrub]=g.offsets[i],size=shrub?.84+(i%3)*.075:.63+(i%4)*.07;
   add('marisa-outer:'+g.id+':'+i,g.center[0]+dx,g.center[1]+dz,group*.79+i*1.93,size,shrub?'shrub':'fern',true);
  }
 }
 const bandCandidates=[];
 for(const band of transitionBands)for(let i=0;i<band.sites.length;i++){
  const [x,z,size,kind,angle]=band.sites[i],id='marisa-band:'+band.id+':'+i;
  const root=trees.find(t=>M.hypot(t.x-x,t.z-z)<t.rootRadius+.4);
  const outcome=root?'native-root-clearance:'+root.id:add(id,x,z,angle,size,kind,true);
  bandCandidates.push({id,band:band.id,x,z,angle,size,kind,retained:outcome==='retained',reason:outcome});
 }
 return {sites,bandCandidates};
}
// P: six unequal curved shoots carry dense, overlapping small leaf pairs.
// The middle layer is a broad shrub body, not a tall stem with a few tip leaves.
function denseShrub(g,site,sampler,far){
 const {x,z,angle,size}=site,base=[x,sampler.height(x,z)-.28,z],cloud=[];
 const colors=[G.rgb('#617b47'),shrubLeaf],stemCol=G.blend(litter,colors[0],.24);
 const point=(reach,turn,height)=>{const X=x+M.cos(angle+turn)*reach*size,Z=z+M.sin(angle+turn)*reach*size;return[X,sampler.height(X,Z)+height*size,Z];};
 function branch(a,b,r0,r1,buried,coarse=false){
  const ring=Array.from({length:3},(_,j)=>{
   const X=a[0]+M.cos(j*M.PI*2/3)*r0*size,Z=a[2]+M.sin(j*M.PI*2/3)*r0*size;
   return[X,buried?sampler.height(X,Z)-.28:a[1],Z];
  });
  if(coarse){for(let j=0;j<3;j++)g.tri(ring[(j+1)%3],ring[j],b,stemCol);return;}
  const top=Array.from({length:3},(_,j)=>[b[0]+M.cos(j*M.PI*2/3)*r1*size,b[1],b[2]+M.sin(j*M.PI*2/3)*r1*size]);
  for(let j=0;j<3;j++)g.quad(ring[(j+1)%3],ring[j],top[j],top[(j+1)%3],stemCol);
  g.tri(top[0],top[2],top[1],stemCol);
 }
 function leafShape(root,yaw,elevation,length,width,roll,color){
  const axis=G.norm([M.cos(yaw),elevation,M.sin(yaw)]),flat=[-M.sin(yaw),0,M.cos(yaw)],up=G.norm(G.cross(flat,axis));
  const side=G.norm(G.add(G.mul(flat,M.cos(roll)),G.mul(up,M.sin(roll)))),normal=G.norm(G.cross(side,axis));
  const p=(t,w,lift)=>{
   const q=G.add(root,G.add(G.mul(axis,t*length),G.add(G.mul(side,w*width),G.mul(normal,lift*width))));
   if(t)q[1]=M.max(q[1],sampler.height(q[0],q[2])+.06*size);return q;
  };
  const a=root,b=p(.43,1,.09),c=p(1,0,.025),d=p(.49,-.92,-.045),points=[a,b,c,d];cloud.push(...points);
  if(!far)for(const tri of [[a,b,c],[a,c,d]]){
   const n=G.cross(G.sub(tri[1],tri[0]),G.sub(tri[2],tri[0]));
   if(n[1]<0)g.tri(tri[0],tri[2],tri[1],color);else g.tri(...tri,color);
  }
 }
 const shoots=[[-.44,.57,1.12,1.32,1.86],[.57,.40,1.40,.91,1.98],[1.69,.58,.97,1.34,1.74],[2.85,.44,1.33,.98,1.94],[4.04,.56,1.03,1.27,1.82],[5.24,.46,1.18,1.02,1.90]];
 for(let i=0;i<shoots.length;i++){
  const [turn,r0,h0,r1,h1]=shoots[i],elbow=point(r0,turn-.16,h0),end=point(r1,turn+.14,h1);
  if(!far){branch(base,elbow,.048,.024,true);branch(elbow,end,.024,.009,false);}
  const len0=G.length(G.sub(elbow,base)),len1=G.length(G.sub(end,elbow));
  for(let j=0;j<10;j++){
   const distance=(.21+j*.083)*(len0+len1),first=distance<len0,a=first?base:elbow,b=first?elbow:end,u=first?distance/len0:(distance-len0)/len1;
   const root=a.map((v,k)=>v+(b[k]-v)*u);
   for(const sign of [-1,1]){
    const yaw=angle+turn+sign*(.90+(j%3)*.12)+(j%2?-.15:.16)+(i%2?-.12:.08),elevation=.05+((i+j)%5)*.11;
    const length=(.51+((i+j)%4)*.055)*size,width=(.19+((i+j)%4)*.025)*size,roll=sign*(.29+(j%3)*.19)+(i%2?-.12:.10);
    leafShape(root,yaw,elevation,length,width,roll,colors[(i+j)%2].map(v=>v*(.91+((i+j)%3)*.035)));
   }
  }
 }
 if(!far)return;
 // The far crown is one connected, thick two-ring body derived from the
 // actual near leaf cloud. Two buried supports carry it; no flat fan proxy.
 const unique=new Map();for(const p of cloud)unique.set(p[0]+':'+p[2],[p[0],p[2]]);
 const sorted=[...unique.values()].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
 const turn=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 const chain=points=>{const out=[];for(const p of points){while(out.length>1&&turn(out.at(-2),out.at(-1),p)<=0)out.pop();out.push(p);}return out;};
 const lowerHull=chain(sorted),upperHull=chain(sorted.slice().reverse());lowerHull.pop();upperHull.pop();const hull=lowerHull.concat(upperHull);
 const center=cloud.reduce((a,p)=>a.map((v,k)=>v+p[k]/cloud.length),[0,0,0]),minY=M.min(...cloud.map(p=>p[1])),maxY=M.max(...cloud.map(p=>p[1])),height=maxY-minY;
 const outline=Array.from({length:11},(_,i)=>{
  const theta=angle+i*M.PI*2/11+.06*M.sin(i*1.71),d=[M.cos(theta),M.sin(theta)];let best=Infinity;
  for(let j=0;j<hull.length;j++){
   const a=hull[j],b=hull[(j+1)%hull.length],e=[b[0]-a[0],b[1]-a[1]],q=[a[0]-center[0],a[1]-center[2]],den=d[0]*e[1]-d[1]*e[0];
   if(M.abs(den)<1e-10)continue;
   const t=(q[0]*e[1]-q[1]*e[0])/den,u=(q[0]*d[1]-q[1]*d[0])/den;
   if(t>0&&u>=-1e-7&&u<=1+1e-7)best=M.min(best,t);
  }
  if(!Number.isFinite(best))throw Error('Missing Marisa far shrub outline');
  return[center[0]+d[0]*best,center[2]+d[1]*best];
 });
 const ring=upper=>outline.map((p,i)=>{
  const Y=minY+height*((upper?.73:.26)+M.sin(i*1.83+angle)*.025);
  return[p[0],M.max(Y,sampler.height(p[0],p[1])+.06*size),p[1]];
 });
 const low=ring(false),high=ring(true),top=[center[0],maxY,center[2]],bottom=[center[0],M.max(minY,sampler.height(center[0],center[2])+.06*size),center[2]];
 branch(base,center,.048,0,true,true);branch(base,G.add(center,[M.cos(angle)*.22*size,.08*size,M.sin(angle)*.22*size]),.030,0,true,true);
 const rx=M.max(...cloud.map(p=>M.abs(p[0]-center[0]))),rz=M.max(...cloud.map(p=>M.abs(p[2]-center[2]))),midY=(minY+maxY)/2;
 for(let i=0;i<11;i++){
  const j=(i+1)%11;
  for(const tri of [[top,high[j],high[i]],[bottom,low[i],low[j]],[low[i],high[i],high[j]],[low[i],high[j],low[j]]])for(const p of tri){
   const n=G.norm([(p[0]-center[0])/(rx*rx),(p[1]-midY)/(height*height*.25),(p[2]-center[2])/(rz*rz)]);
   g.vertex(p,n,colors[i%2].map(v=>v*(.90+M.max(0,n[1])*.09)));
  }
 }
}
// The retained low fern geometry stays byte-identical to V4. Only the
// middle shrub body changes; all 79 original sites keep their older shape.
function outerClump(g,site,sampler,far){
 if(site.kind==='shrub'){denseShrub(g,site,sampler,far);return;}
 const {x,z,angle,size}=site,base=[x,sampler.height(x,z)-.28,z];
 const col=leaf,stemCol=G.blend(litter,col,.38);
 const point=(reach,theta,height)=>{const X=x+M.cos(theta)*reach*size,Z=z+M.sin(theta)*reach*size;return[X,sampler.height(X,Z)+height*size,Z];};
 const along=(a,b,u)=>a.map((v,k)=>v+(b[k]-v)*u);
 function stem(a,b,r,r2,buried){
  // Only the main foot follows the actual terrain at -.28 m; all upper
  // branches begin at the preceding stem's actual fork, without a gap.
  const ring=Array.from({length:3},(_,j)=>{
   const X=a[0]+M.cos(j*M.PI*2/3)*r*size,Z=a[2]+M.sin(j*M.PI*2/3)*r*size;
   return[X,buried?sampler.height(X,Z)-.28:a[1],Z];
  });
  if(far){for(let j=0;j<3;j++)g.tri(ring[(j+1)%3],ring[j],b,stemCol);}
  else{
   const top=Array.from({length:3},(_,j)=>[b[0]+M.cos(j*M.PI*2/3)*r2*size,b[1],b[2]+M.sin(j*M.PI*2/3)*r2*size]);
   for(let j=0;j<3;j++)g.quad(ring[(j+1)%3],ring[j],top[j],top[(j+1)%3],stemCol);
   g.tri(top[0],top[2],top[1],stemCol);
  }
 }
 function blade(root,theta,length,width,lift,drop,tint){
  const p=(distance,side,height)=>{
   const X=root[0]+M.cos(theta)*distance-M.sin(theta)*side,Z=root[2]+M.sin(theta)*distance+M.cos(theta)*side;
   return[X,M.max(root[1]+height,sampler.height(X,Z)+.06*size),Z];
  };
  const a=root,b=p(length*.38,width,lift),d=p(length,0,-drop),e=p(length*.46,-width,lift*.73),c=far?null:p(length*.74,width*.66,lift*.59);
  const rgb=col.map(v=>v*tint);
  if(far){g.tri(a,b,d,rgb);g.tri(a,d,e,rgb);}
  else{g.tri(a,b,c,rgb);g.tri(a,c,d,rgb);g.tri(a,d,e,rgb);}
 }
 if(far){
  // Eight small folded leaves retain the low/mid volume at successive roots,
  // rather than three isolated fans or a single giant aggregate blade.
  const end=point(.12,angle+.41,.37);
  stem(base,end,.030,0,true);
  const levels=[.74,.79,.84,.89,.94,1,1,1];
  for(let j=0;j<8;j++){
   const root=along(base,end,levels[j]),length=(.72+(j%4)*.075)*size,width=(.25+(j%3)*.025)*size;
   blade(root,angle+j*2.37+(j%2)*.18,length,width,.15*size,.045*size,.98+(j%3)*.035);
  }
 }else{
  // Sixteen shorter basal leaves overlap at two low supported roots. Their
  // folded lobes fill the clump while the middle shrub remains clearly taller.
  const ends=[point(.18,angle-.25,.30),point(.23,angle+2.75,.38)];
  for(let i=0;i<ends.length;i++){
   const end=ends[i];stem(base,end,.032,.012,true);
   for(let j=0;j<8;j++){
    const root=along(base,end,[.72,.80,.88,.96,1,1,1,1][j]);
    blade(root,angle+i*2.63+j*2.17+.11,(.71+(j%4)*.075)*size,(.245+(j%3)*.025)*size,(.14+(j%3)*.015)*size,.045*size,.98+((i+j)%3)*.035);
   }
  }
 }
}
function geometry(sites,sampler,far){
 const g=new G.Geometry(),ranges=[];
 for(const site of sites){const start=g.a.length;
  if(site.id.startsWith('marisa-outer:')||site.id.startsWith('marisa-band:')){outerClump(g,site,sampler,far);ranges.push([start,g.a.length-start]);continue;}
  const {x,z,angle,size}=site;
  const point=(distance,side,height,theta)=>{const X=x+M.cos(theta)*distance-M.sin(theta)*side,Z=z+M.sin(theta)*distance+M.cos(theta)*side;return[X,sampler.height(X,Z)+height,Z];};
  const directions=far?[0,M.PI/2,M.PI,3*M.PI/2]:[0,M.PI/2,M.PI,3*M.PI/2,.68,2.24,4.48];
  for(let i=0;i<directions.length;i++){
   const shrub=site.kind==='shrub',theta=angle+directions[i],r=2.1*size*(i<4?1:.79),h=(shrub?1.1:.96+(i%3)*.12)*size,tip=(shrub?.78:.42)*size,col=(shrub?shrubLeaf:leaf).map(v=>v*(.91+(i%3)*.045));
   if(far){g.quad(point(0,0,-.28,theta),point(r*.47,(shrub?.58:.39)*size,h,theta),point(r,0,tip,theta),point(r*.47,-(shrub?.58:.39)*size,h,theta),col);}
   else{const a=point(0,-.075*size,-.28,theta),b=point(0,.075*size,-.28,theta),c=point(r*.46,(shrub?.55:.37)*size,h,theta),d=point(r*.46,-(shrub?.55:.37)*size,h,theta),e=point(r,(shrub?.13:.025)*size,tip,theta),f=point(r,-(shrub?.13:.025)*size,tip,theta);g.quad(a,b,c,d,col);g.quad(d,c,e,f,col);}
  }
  ranges.push([start,g.a.length-start]);
 }return {g,ranges};
}
function detail(data,pack){
 const info=data.forestCanopyGround;if(info?.revision!==REVISION||info.sources?.length!==4)throw Error('Forest canopy ground must be prepared from public terrain');
 if(pack.meshes.some(m=>m.component==='forest-canopy-understorey'))throw Error('Forest canopy understorey already applied');
 const {sites,bandCandidates}=sitesFromTrees(pack),added=[];
 if(sites.length>114||bandCandidates.length!==14)throw Error('Forest canopy transition-band site budget exceeded');
 for(const tileX of [-1280,-1024]){
  const subset=sites.filter(p=>p.tileX===tileX);if(!subset.length)continue;
  for(const far of [false,true]){
   const id='island:terrain:'+tileX+':0'+(far?':far':''),source=info.sources.find(m=>m.id===id);
   if(!source||source.far!==far)throw Error('Missing forest canopy terrain precision');
   const sampler=G.SurfaceContact.sampler(data,CONTACT,far?'far':'near');
   const {g,ranges}=geometry(subset,sampler,far),m=g.mesh('forest:canopy-ground:'+tileX+':0:'+(far?'far':'near'),'vegetation',{
    owner:'forest',region:'forest',space:'surface',material:'forestLeaf',component:'forest-canopy-understorey',
    terrainSource:id,terrainTile:source.tile.slice(),terrainPrecision:far?'far':'near',forestCanopyFar:far,
    nearDecoration:true,siteIDs:subset.map(p=>p.id),siteKinds:subset.map(p=>p.kind),
    siteRanges:ranges,forestCanopyRevision:REVISION});
   added.push(m);
  }
 }
 const nearTriangles=added.filter(m=>!m.forestCanopyFar).reduce((n,m)=>n+m.vertices.length/27,0),farTriangles=added.filter(m=>m.forestCanopyFar).reduce((n,m)=>n+m.vertices.length/27,0),bytes=added.reduce((n,m)=>n+m.vertices.byteLength,0);
 if(nearTriangles>10000||farTriangles>2500||bytes>MAX_BYTES||added.length>4)throw Error('Forest canopy understorey geometry budget exceeded');
 return {meshes:[...pack.meshes,...added],meta:{revision:REVISION,sites:sites.length,outerGroups:outerGroups.map(g=>({id:g.id,sites:sites.filter(p=>p.id.startsWith('marisa-outer:'+g.id+':')).length})),transitionBands:transitionBands.map(b=>({id:b.id,sites:bandCandidates.filter(p=>p.band===b.id&&p.retained).length})),bandCandidates,records:added.length,nearTriangles,farTriangles,bytes,contactBytes:info.contactBytes,groundCopiedBytes:info.copiedBytes,groundChangedVertices:info.changedVertices}};
}
G.FOREST_CANOPY_GROUND={revision:REVISION,roi:ROI,terrainIds,treeSites,outerGroups,transitionBands,weight,colorAt,pathColors,prepare,detail};
})(globalThis.GA);
