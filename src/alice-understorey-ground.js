/* P: Alice woodland edge; the entire maintained yard, trees and routes stay.
 * Limited reuse of the accepted Marisa curved-shoot shrub and basal fern forms.
 * Caller supplies private data/pack; atomic publication belongs to the wrapper.
 */
(function(G){'use strict';
const M=Math,CONTACT='alice-understorey',REVISION=2;
const ROI=Object.freeze([-1186,-360,-1060,-216]);
const terrainIds=Object.freeze(['island:terrain:-1280:-512','island:terrain:-1280:-512:far','island:terrain:-1280:-256','island:terrain:-1280:-256:far']);
const clamp=x=>M.max(0,M.min(1,x)),smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const leaf=G.rgb('#708452'),shrubLeaf=G.rgb('#748258'),litter=G.rgb('#776b4e'),grass=G.rgb('#718052');
const yard=Object.freeze([-1170,-290,-1110,-231]);
const yardDistance=(x,z)=>M.hypot(M.max(yard[0]-x,0,x-yard[2]),M.max(yard[1]-z,0,z-yard[3]));
const treeFeet=Object.freeze([[-1159.528076171875,-353.1728820800781,3.1011298377588004],[-1135.8255615234375,-348.8696594238281,3.119446607489629],[-1142.5185546875,-365.23150634765625,2.8160904394143205],[-1124.3515625,-365.68121337890625,3.7309289105402117],[-1192.3194580078125,-325.5031433105469,4.154096018962281],[-1148.333251953125,-328.70953369140625,3.945303584369557],[-1186.0262451171875,-345.02630615234375,2.7160092013096926],[-1113.088623046875,-345.9134521484375,2.9776506285315514],[-1067.6072998046875,-368.0959167480469,2.7003228267293062],[-1090.2587890625,-371.69952392578125,2.672474742747419],[-1118.1727294921875,-321.3636779785156,2.77147128952108],[-1073.9405517578125,-318.538330078125,3.9624603848829665],[-1069.4619140625,-273.9697570800781,2.884049667666723],[-1073.5113525390625,-221.2696075439453,4.022023008461473],[-1094.8355712890625,-342.37847900390625,3.564794099201242],[-1091.530517578125,-321.0687561035156,3.8376940567452515],[-1066.082275390625,-298.4394836425781,4.231420985381015],[-1066.5799560546875,-248.94320678710938,3.897099068785651]]);
const candidates=Object.freeze([{"id":"alice-edge:west-low:0","group":"west-low","x":-1174,"z":-302,"kind":"shrub","size":1.7,"angle":0.31},{"id":"alice-edge:west-low:1","group":"west-low","x":-1171,"z":-307,"kind":"shrub","size":1.75,"angle":2.68},{"id":"alice-edge:west-low:2","group":"west-low","x":-1168,"z":-311,"kind":"shrub","size":1.65,"angle":5.05},{"id":"alice-edge:west-low:3","group":"west-low","x":-1178,"z":-302,"kind":"fern","size":1.4,"angle":7.42},{"id":"alice-edge:west-low:4","group":"west-low","x":-1175,"z":-297,"kind":"fern","size":1.4,"angle":9.79},{"id":"alice-edge:west-low:5","group":"west-low","x":-1172,"z":-300,"kind":"fern","size":1.3,"angle":12.16},{"id":"alice-edge:west-low:6","group":"west-low","x":-1169,"z":-304,"kind":"fern","size":1.4,"angle":14.53},{"id":"alice-edge:west-low:7","group":"west-low","x":-1166,"z":-308,"kind":"fern","size":1.4,"angle":16.9},{"id":"alice-edge:west-upper:8","group":"west-upper","x":-1164,"z":-317,"kind":"shrub","size":1.8,"angle":19.27},{"id":"alice-edge:west-upper:9","group":"west-upper","x":-1160,"z":-321,"kind":"shrub","size":1.7,"angle":21.64},{"id":"alice-edge:west-upper:10","group":"west-upper","x":-1157,"z":-325,"kind":"shrub","size":1.75,"angle":24.01},{"id":"alice-edge:west-upper:11","group":"west-upper","x":-1153,"z":-328,"kind":"shrub","size":1.65,"angle":26.38},{"id":"alice-edge:west-upper:12","group":"west-upper","x":-1168,"z":-316,"kind":"fern","size":1.35,"angle":28.75},{"id":"alice-edge:west-upper:13","group":"west-upper","x":-1162,"z":-313,"kind":"fern","size":1.4,"angle":31.12},{"id":"alice-edge:west-upper:14","group":"west-upper","x":-1158,"z":-316,"kind":"fern","size":1.35,"angle":33.49},{"id":"alice-edge:west-upper:15","group":"west-upper","x":-1155,"z":-320,"kind":"fern","size":1.45,"angle":35.86},{"id":"alice-edge:west-upper:16","group":"west-upper","x":-1151,"z":-323,"kind":"fern","size":1.35,"angle":38.23},{"id":"alice-edge:east-rear:17","group":"east-rear","x":-1078,"z":-279,"kind":"shrub","size":1.8,"angle":40.6},{"id":"alice-edge:east-rear:18","group":"east-rear","x":-1079,"z":-274,"kind":"shrub","size":1.7,"angle":42.97},{"id":"alice-edge:east-rear:19","group":"east-rear","x":-1083,"z":-270,"kind":"shrub","size":1.75,"angle":45.34},{"id":"alice-edge:east-rear:20","group":"east-rear","x":-1080,"z":-247,"kind":"shrub","size":1.75,"angle":47.71},{"id":"alice-edge:east-rear:21","group":"east-rear","x":-1076,"z":-244,"kind":"shrub","size":1.7,"angle":50.08},{"id":"alice-edge:east-rear:22","group":"east-rear","x":-1083,"z":-282,"kind":"fern","size":1.4,"angle":52.45},{"id":"alice-edge:east-rear:23","group":"east-rear","x":-1082,"z":-277,"kind":"fern","size":1.35,"angle":54.82},{"id":"alice-edge:east-rear:24","group":"east-rear","x":-1086,"z":-270,"kind":"fern","size":1.4,"angle":57.19},{"id":"alice-edge:east-rear:25","group":"east-rear","x":-1081,"z":-263,"kind":"fern","size":1.45,"angle":59.56},{"id":"alice-edge:east-rear:26","group":"east-rear","x":-1085,"z":-249,"kind":"fern","size":1.4,"angle":61.93},{"id":"alice-edge:east-rear:27","group":"east-rear","x":-1080,"z":-240,"kind":"fern","size":1.45,"angle":64.3}]);
function routeDistance(x,z){let best=Infinity;
 const paths=G.ISLAND?.allRoutes;if(!paths)throw Error('Alice requires retained public routes');
 for(const p of paths)for(let i=1;i<p.samples.length;i++){
  const a=p.samples[i-1],b=p.samples[i],dx=b[0]-a[0],dz=b[1]-a[1],u=clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1));
  best=M.min(best,M.hypot(x-a[0]-u*dx,z-a[1]-u*dz)-p.width*.5);
 }return best;
}
function chooseSites(){const sites=[],rejected=[];for(const q of candidates){
 const radius=2.1*q.size,tileZ=q.z<-256?-512:-256;
 let reason;
 if(yardDistance(q.x,q.z)<radius+.75)reason='maintained-yard';
 else if(M.min(q.x+1280,-1024-q.x,q.z-tileZ,tileZ+256-q.z)<radius+.35)reason='terrain-tile-boundary';
 else if(routeDistance(q.x,q.z)<radius+1.4||G.FOREST.routeDistance(q.x,q.z)<radius+1.4)reason='retained-route';
 else if(treeFeet.some(t=>M.hypot(t[0]-q.x,t[1]-q.z)<t[2]+.25))reason='original-root';
 if(reason)rejected.push({...q,reason});else sites.push({...q,tileZ});
 }return{sites,rejected};}
function colorAt(x,z,original,sites){
 if(x<ROI[0]||x>ROI[2]||z<ROI[1]||z>ROI[3]||yardDistance(x,z)<.6)return original;
 let cover=0;for(const p of sites)cover=M.max(cover,1-smooth(2.8*p.size,9.5,M.hypot(x-p.x,z-p.z)));
 const yardFade=smooth(.6,4,yardDistance(x,z)),border=smooth(0,5,M.min(x-ROI[0],ROI[2]-x,z-ROI[1],ROI[3]-z));
 const w=cover*yardFade*border*.68;if(!w)return original;
 const target=G.blend(grass,litter,.48+cover*.16);return G.blend(original,target,w);
}
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
// Reuse the accepted Marisa basal fern form at these new Alice sites.
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
function geometry(sites,sampler,far){const g=new G.Geometry(),ranges=[];for(const site of sites){const start=g.a.length;outerClump(g,site,sampler,far);ranges.push([start,g.a.length-start]);}return{g,ranges};}
function prepare(data,pack){
 if(data.aliceUnderstorey)throw Error('Alice understorey already prepared');
 const found=new Map();for(const m of pack.meshes)if(terrainIds.includes(m.id)){
  if(found.has(m.id)||m.component!=='island-terrain'||m.material!=='ground'||m.cutOnly||!m.globalSurface||!m.index||m.vertices?.constructor.name!=='Float32Array'||m.vertices.length%9||m.tile?.[2]!==256)throw Error('Invalid Alice terrain '+m.id);
  found.set(m.id,m);
 }if(found.size!==4)throw Error('Missing actual Alice terrain tiles');
 const {sites,rejected}=chooseSites();if(sites.length<20||sites.length>32)throw Error('Alice plant layout requires review: '+sites.length);
 const temp={},contacts=G.SurfaceContact.prepare(temp,{meshes:[...found.values()]},CONTACT,[ROI[0]-3,ROI[1]-3,ROI[2]+3,ROI[3]+3]);
 const changed=new Map();let changedVertices=0,copiedBytes=0;
 for(const [id,m]of found){let copy;for(let i=0;i<m.vertices.length;i+=9){const a=m.vertices,c=colorAt(a[i],a[i+2],[a[i+6],a[i+7],a[i+8]],sites);let any=false;
  for(let j=0;j<3;j++)if(M.fround(c[j])!==a[i+6+j]){copy??=a.slice();copy[i+6+j]=c[j];any=true;}if(any)changedVertices++;
 }if(copy){changed.set(id,{...m,vertices:copy});copiedBytes+=copy.byteLength;}}
 const added=[];for(const tileZ of [-512,-256])for(const far of [false,true]){
  const subset=sites.filter(p=>p.tileZ===tileZ);if(!subset.length)continue;
  const id='island:terrain:-1280:'+tileZ+(far?':far':''),source=found.get(id),sampler=G.SurfaceContact.sampler(temp,CONTACT,far?'far':'near'),{g,ranges}=geometry(subset,sampler,far);
  added.push(g.mesh('alice:understorey:-1280:'+tileZ+':'+(far?'far':'near'),'vegetation',{
   owner:'island',region:'island',space:'surface',overview:true,globalSurface:true,component:'alice-understorey',material:'forestLeaf',basis:'P',
   terrainSource:id,terrainPrecision:far?'far':'near',terrainTile:source.tile.slice(),center:source.center.slice(),radius:source.radius,
   aliceUnderstoreyRevision:REVISION,siteIDs:subset.map(p=>p.id),siteKinds:subset.map(p=>p.kind),siteRanges:ranges}));
 }
 const nearTriangles=added.filter(m=>m.terrainPrecision==='near').reduce((n,m)=>n+m.vertices.length/27,0),farTriangles=added.filter(m=>m.terrainPrecision==='far').reduce((n,m)=>n+m.vertices.length/27,0),bytes=added.reduce((n,m)=>n+m.vertices.byteLength,0);
 if(added.length>4||nearTriangles>5000||farTriangles>1500||bytes>800000)throw Error('Alice understorey geometry budget exceeded');
 // Preparation is transactional inside the caller's already private objects.
 (data.surfaceContacts??={})[CONTACT]=contacts;
 data.aliceUnderstorey={revision:REVISION,sites,rejected,roi:ROI.slice(),records:added.length,nearTriangles,farTriangles,bytes,changedVertices,copiedBytes,contactBytes:contacts.near.byteLength+contacts.far.byteLength,sources:[...found.values()].map(m=>({id:m.id,tile:m.tile.slice(),center:m.center.slice(),radius:m.radius,far:!!m.globalFar}))};
 pack.meshes=pack.meshes.map(m=>changed.get(m.id)||m);return added;
}
G.ALICE_UNDERSTOREY_GROUND={revision:REVISION,roi:ROI,terrainIds,candidates,treeFeet,chooseSites,routeDistance,colorAt,prepare};
})(globalThis.GA);
