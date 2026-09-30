/* Waterfall back cave: FS ch.28 p16–17 text transcript / local geometry P.
 * Retains the existing Nine Heavens waterfall. Surface vestibule and independent
 * underground study are selections, NOT a carved or fully connected farm route. */
(function(G){'use strict';
const ID='waterfall_cave',SPACE='falls_cave',PI=Math.PI,TAU=PI*2;
const C=Object.fromEntries(Object.entries({rock:'#75817d',light:'#9ca49b',dark:'#4f5c59',earth:'#838475',wood:'#75664f',end:'#9e8a6e',iron:'#5b676b',steel:'#a3b3b5',rust:'#817564',moss:'#61715a',water:'#668b91',lamp:'#e8cb95',black:'#1f2b2e'}).map(([k,v])=>[k,G.rgb(v)]));
const surfaceRoute=[[-430,-941],[-449,-955],[-463,-978],[-463,-995],[-463,-1020],[-478,-1026],[-493,-1026],[-502.7,-1023]];
const block={id:ID,name:'瀑后洞穴 · 轨道与水幕',space:SPACE,independent:true,poly:[],center:[3,3,-40],bottom:-12,step:3};
G.DIORAMA.blocks.push(block);G.DIORAMA.map.set(ID,block);G.REGION_LABELS[ID]=block.name;
G.EXTRA_REGION_CONTEXT={...(G.EXTRA_REGION_CONTEXT||{}),[ID]:['mountain']};
const priorOwner=G.DIORAMA.owner;G.DIORAMA.owner=(x,z)=>x>-537&&x<-438&&z>-1046&&z<-998?ID:priorOwner(x,z);
for(const k of ['transform','point','inverse']){const old=G.DIORAMA[k];G.DIORAMA[k]=k==='transform'?((r,...a)=>r===ID?{scale:1,offset:[0,0,0]}:old(r,...a)):((p,r,...a)=>r===ID?[...p]:old(p,r,...a));}
const v=(label,eye,target,extra={})=>({label,eye,target,fov:55,region:ID,space:SPACE,era:'铃奈庵28话瀑后轨道参考 · 洞形、设备与尺寸P',...extra,...(extra.space==='surface'?{detailNeighbors:['mountain'],requiredRegions:[ID,'mountain']}: {})});
const views={
 fallsContext:v('瀑后洞穴 · 原瀑布与侧径',[-292,408,-727],[-510,334,-1039],{space:'surface',fov:52}),
 fallsThreshold:v('瀑后洞穴 · 水幕后入口',[-490,253,-1020],[-506,251,-1028],{space:'surface',fov:57}),
 fallsApproach:v('瀑后洞穴 · 接回登山路',[-396,349,-895],[-455,264,-989],{space:'surface'}),
 fallsSurfaceFoot:v('瀑后洞穴 · 石基与踏步',[-492,249,-1023],[-504,249,-1025],{space:'surface'}),
 fallsEntry:v('洞内 · 湿润门槛',[2.8,2.7,-1],[1,2.1,-23],{fov:62}),
 fallsTrack:v('洞内 · 轨道与检修道',[3.1,2.4,-8],[2,2.1,-35],{fov:62}),
 fallsBay:v('洞内 · 侧向装卸凹室',[-1,3,-23],[6.6,2,-32],{fov:58}),
 fallsRail:v('洞内 · 轨枕与排水沟',[2.6,1.1,-15],[-1,.05,-20],{fov:57}),
 fallsBend:v('洞内 · 转折与远方通路',[5.2,1.4,-58],[17,1,-83],{fov:65}),
 fallsDaylight:v('洞内 · 回望水帘',[2.2,2.6,-14],[0,4,10],{fov:63}),
 fallsSection:v('洞内 · 可逆拱顶剖览',[57,57,13],[5,0,-49],{fallsCut:true,fov:55}),
 fallsRear:v('截取洞段 · 壳体背侧',[45,38,-120],[14,2,-75],{fallsShell:true,fov:55})
};
Object.assign(G.PRESETS,views);G.IMPLEMENTED[ID]='fallsThreshold';G.LANDMARKS.partial.add(ID);
G.EXTRA_REGION_DEFAULTS={...(G.EXTRA_REGION_DEFAULTS||{}),[ID]:'fallsThreshold'};
function bank(far,publicOnly=false){const bins=new Map();return {get(scene,mat,part='body',tile='0'){const k=[scene,mat,part,tile].join(':');if(!bins.has(k))bins.set(k,{g:new G.Geometry(),scene,mat,part});return bins.get(k).g.place();},finish(meta={}){const meshes=[];for(const[k,b]of bins){if(!b.g.a.length)continue;meshes.push(b.g.mesh(`${ID}:${publicOnly?'public':far?'overview':'detail'}:${k}`,b.mat==='Water'?'water':b.part==='plants'?'vegetation':'architecture',{owner:ID,region:ID,space:b.scene==='surface'?'surface':SPACE,overview:far,material:'falls'+b.mat,fallsScene:b.scene,fallsPart:b.part,basis:'P',...(publicOnly?{globalSurface:true}:{}),...(b.part==='small'?{maxDetailDistance:75}:{}),...(b.mat==='Water'?{shadowCaster:false}:{})}));}return{id:ID,meshes,signs:[],bytes:meshes.reduce((s,m)=>s+m.vertices.byteLength,0),meta};}};}
function beam(g,a,b,r,col=C.wood,n=6,r2=r){if(G.length(G.sub(a,b))>1e-6)g.tube(a,b,r,col,n,r2);}
function rock(g,x,y,z,rx,ry,rz,seed=0){const n=7,lo=[],hi=[];for(let i=0;i<n;i++){const a=i/n*TAU,s=1+.12*Math.sin(i*2.3+seed);lo.push([x+rx*Math.cos(a)*s,y,z+rz*Math.sin(a)*s]);hi.push([x+rx*.71*Math.cos(a)*s,y+ry*(.9+.1*Math.sin(i+seed)),z+rz*.71*Math.sin(a)*s]);}for(let i=0;i<n;i++)g.quad(lo[i],hi[i],hi[(i+1)%n],lo[(i+1)%n],G.blend(C.rock,C.dark,.08*(i%3)));for(let i=1;i<n-1;i++){g.tri(hi[0],hi[i+1],hi[i],C.light);g.tri(lo[0],lo[i],lo[i+1],C.dark);}}
// Sidewall spring line + elliptical roof; the whole shell has an outer surface.
function profile(a,w,h,thick=0){return[(w+thick)*Math.cos(a),1.55+(h+thick)*Math.sin(a)];}
function center(s){return[1.2*Math.sin(s*.045)+Math.max(0,s-42)*.20+7*G.smooth(67,108,s)+.009*Math.pow(Math.max(0,s-62),2),-.021*s,-s];}
function width(s){return 4.9+2.8*Math.exp(-Math.pow((s-32)/12,4))+.35*Math.sin(s*.07);}
function point(s,u,y){const c=center(s),prev=center(s-.05),next=center(s+.05),n=G.norm([1,0,(next[0]-prev[0])/.1]);return[c[0]+u*n[0],c[1]+y,c[2]+u*n[2]];}
function strip(g,a,b,w,h,col){const d=G.sub(b,a),n=G.norm([-d[2],0,d[0]]),p=(q,k,dy)=>[q[0]+n[0]*w*k,q[1]+dy,q[2]+n[2]*w*k];g.quad(p(a,-1,0),p(a,1,0),p(b,1,0),p(b,-1,0),col);g.quad(p(a,-1,-h),p(a,-1,0),p(b,-1,0),p(b,-1,-h),C.dark);g.quad(p(a,1,0),p(a,1,-h),p(b,1,-h),p(b,1,0),C.dark);g.quad(p(a,-1,-h),p(b,-1,-h),p(b,1,-h),p(a,1,-h),C.dark);}
function portal(B,scene,origin,far){const wall=B.get(scene,'Stone','portal'),wet=B.get(scene,'Rock','portal'),n=far?12:20;
 const P=(a,back,outer)=>{let[u,y]=profile(a,5,4.4,outer?1.8+.22*Math.sin(a*5+.7):0);return[origin[0]+u,origin[1]+y+.12*Math.sin(a*3+back*.5),origin[2]-back];};
 // Real ring thickness, reveals and a recessed vestibule. Never a painted hole.
 for(let i=0;i<n;i++){const a=PI*i/n,b=PI*(i+1)/n,col=G.blend(C.rock,C.light,.14+.07*(i%3));wall.quad(P(a,0,false),P(b,0,false),P(b,0,true),P(a,0,true),col);wet.quad(P(a,0,false),P(a,6,false),P(b,6,false),P(b,0,false),C.dark);wet.quad(P(a,6,true),P(a,0,true),P(b,0,true),P(b,6,true),C.rock);wall.quad(P(a,6,true),P(b,6,true),P(b,6,false),P(a,6,false),C.dark);}
 for(const d of[-1,1]){wall.box(origin[0]+d*5.9,origin[1]-2,origin[2]-3,1.8,3.55,6,C.rock);wall.box(origin[0]+d*6.05,origin[1]-3,origin[2]+.3,2.3,1.2,2.3,C.dark);}
}
function surface(B,data,far){const n=G.SurfaceContact.sampler(data,ID),f=G.SurfaceContact.sampler(data,ID,'far'),origin=[-506,248,-1026],g=B.get('surface','Stone','base');
 // Lowest common support is buried below both terrain precisions; no terrain edits.
 g.box(-506,240.5,-1026.5,14.8,7.5,12.8,C.rock);g.box(-506,248,-1026.5,15.2,.25,13.1,C.light);
 for(let row=0;row<4;row++)for(let k=0;k<4;k++){const x=-511.625+k*3.75,y=243.3+row*1.16;g.box(x,y,-1019.96,3.68,1.10,.28,G.blend(C.rock,C.light,.10+.07*((k+row)%3)));}
 for(const d of[-1,1])for(let row=0;row<4;row++)for(let k=0;k<4;k++)g.box(-506+d*7.47,243.3+row*1.16,-1031.4+k*3.27,.26,1.10,3.20,G.blend(C.rock,C.light,.13));portal(B,'surface',origin,far);
 const back=B.get('surface','Rock','recess');const end=[-506,249.55,-1032.25];back.quad([-511,248,-1032.25],[-501,248,-1032.25],[-501,249.55,-1032.25],[-511,249.55,-1032.25],C.black);for(let i=0;i<20;i++){const a=i/20*PI,b=(i+1)/20*PI;back.tri(end,[-506+5*Math.cos(a),249.55+4.4*Math.sin(a),-1032.25],[-506+5*Math.cos(b),249.55+4.4*Math.sin(b),-1032.25],C.black);}
 // A fractured bedrock hood meets the original hillside; no freestanding tunnel shed.
 const hood=B.get('surface','Rock','hood'),ground=far?f:n,segments=far?12:20,lines=[5.7,9,13,17,21].map(d=>Array.from({length:segments+1},(_,j)=>{const a=j/segments*PI,[u,h]=profile(a,5,4.4,1.8+.22*Math.sin(a*5+.7)),x=-506+u*(1+Math.max(0,d-6)*.025),z=-1026-d,arch=248+h+.12*Math.sin(a*3+d*.5);return[x,Math.max(arch,ground.height(x,z)+.8),z];}));
 for(let i=0;i<lines.length-1;i++)for(let j=0;j<segments;j++)hood.quad(lines[i][j],lines[i+1][j],lines[i+1][j+1],lines[i][j+1],G.blend(C.rock,C.light,.11+.035*((i+j)%3)));
 for(let i=0;i<lines.length-1;i++)for(const j of[0,segments]){const a=lines[i][j],b=lines[i+1][j];hood.quad([a[0],ground.height(a[0],a[2])-1,a[2]],a,b,[b[0],ground.height(b[0],b[2])-1,b[2]],C.dark);}
 const rails=B.get('surface','Iron','rail'),ties=B.get('surface','Wood','rail');for(let z=-1021;z>-1031.6;z-=1.15){ties.box(-506,248.28,z,2.2,.14,.26,C.wood);}
 for(const d of[-1,1]){rails.box(-506+d*.58,248.42,-1026.2,.13,.16,11.3,C.steel);rails.box(-506+d*.58,248.40,-1026.2,.22,.03,11.3,C.iron);}
 if(!far){const r=B.get('surface','Rock','base');for(const[x,z,rx,h]of[[-515,-1029,3.5,3],[-497,-1028,2.8,3.1],[-517,-1033,4.1,4.8],[-497,-1033,3.8,4.6]]){const y=Math.min(n.height(x,z),f.height(x,z))-.7;rock(r,x,y,z,rx,h,2.5,Math.abs(x));}}
 return {origin,fullTerrainExcavation:false,vestibuleDepth:6};
}
function publicApproach(data){const B=bank(true,true),n=G.SurfaceContact.sampler(data,ID),f=G.SurfaceContact.sampler(data,ID,'far'),g=B.get('surface','Stone','approach'),edge=B.get('surface','Iron','approach'),sites=[];
 for(let i=0;i<surfaceRoute.length-1;i++){const a=surfaceRoute[i],b=surfaceRoute[i+1],d=Math.hypot(b[0]-a[0],b[1]-a[1]),count=Math.ceil(d/.3);for(let k=0;k<count;k++){const t=k/count;sites.push([G.mix(a[0],b[0],t),G.mix(a[1],b[1],t)]);}}sites.push(surfaceRoute.at(-1));
 const rows=sites.map(([x,z],i)=>{const a=sites[Math.max(0,i-1)],b=sites[Math.min(sites.length-1,i+1)],L=Math.hypot(b[0]-a[0],b[1]-a[1]),nx=-(b[1]-a[1])/L,nz=(b[0]-a[0])/L,heights=[-1,0,1].flatMap(d=>[n.height(x+nx*d,z+nz*d),f.height(x+nx*d,z+nz*d)]);return{x,z,nx,nz,base:Math.min(...heights)-1.1,top:G.mix(Math.max(n.height(x,z),f.height(x,z)),Math.max(...heights),G.smooth(0,10,i))+.18};});
 // Supported, bounded-riser stone steps. Preserve the exact original path join
 // and the entrance deck; smooth a convex rise rather than burying the path.
 rows.at(-1).top=248.25;for(let pass=0;pass<2;pass++){for(let i=rows.length-2;i>=0;i--)rows[i].top=Math.max(rows[i].top,rows[i+1].top-.25);for(let i=1;i<rows.length;i++)rows[i].top=Math.max(rows[i].top,rows[i-1].top-.25);}
 for(let i=0;i<rows.length-1;i++){const a=rows[i],b=rows[i+1],yaw=Math.atan2(b.x-a.x,b.z-a.z),len=Math.hypot(b.x-a.x,b.z-a.z),base=Math.min(a.base,b.base),top=Math.max(a.top,b.top);g.place((a.x+b.x)/2,base,(a.z+b.z)/2,yaw);g.box(0,0,0,1.9,top-base,len+.04,i%9===0?C.light:C.rock);g.place();
  if(i%8===0){const p=[a.x+a.nx*.86,a.top,a.z+a.nz*.86];beam(edge,p,[p[0],p[1]+.98,p[2]],.04,C.iron,5);}
  if(i%2===0&&i+2<rows.length){const c=rows[i+2];beam(edge,[a.x+a.nx*.86,a.top+.98,a.z+a.nz*.86],[c.x+c.nx*.86,c.top+.98,c.z+c.nz*.86],.035,C.iron,5);}
 }
 return B.finish({path:rows.map(p=>[p.x,p.top,p.z]),source:'P supported stair, joins original mountain-lower-path at [-430,251,-941]',deckHeight:248.25});
}
function tunnel(B,far){const sections=far?58:116,arcs=far?12:20,length=116,walls=B.get('tunnel','Rock','walls'),roof=B.get('tunnel','Rock','roof'),base=B.get('tunnel','Stone','floor'),outside=B.get('tunnel','Rock','outer');
 const ring=(s,j,out=false)=>{const a=j/arcs*PI,[u,y]=profile(a,width(s),5.1+.32*Math.sin(s*.047),out?2.6:0),ripple=(out?1.0:.21)*Math.sin(s*.24+j*1.67)*Math.sin(a);return point(s,u+ripple,y+(out?.5:.12)*Math.sin(s*.41+j));};
 for(let i=0;i<sections;i++){const s=i/sections*length,S=(i+1)/sections*length;const zone=Math.floor(s/20),floor=B.get('tunnel','Stone','floor',zone),wet=B.get('tunnel','Rock','foot',zone);
  for(let j=0;j<arcs;j++){const part=j>=arcs*.16&&j<arcs*.84?roof:walls;const col=G.blend(C.rock,C.light,.09+.06*(.5+.5*Math.sin(j*.23+s*.018)));
   const N=(t,k)=>{const a=k/arcs*PI,delta=center(t+.05)[0]-center(t-.05)[0];return G.norm([-Math.cos(a),-Math.sin(a)*width(t)/5.1,-Math.cos(a)*delta/.1]);};
   for(const [t,k]of[[s,j],[S,j+1],[S,j],[s,j],[s,j+1],[S,j+1]])part.vertex(ring(t,k),N(t,k),col);outside.quad(ring(s,j,true),ring(S,j,true),ring(S,j+1,true),ring(s,j+1,true),C.dark);
   if(i===0)walls.quad(ring(s,j),ring(s,j+1),ring(s,j+1,true),ring(s,j,true),C.rock);
   if(i===sections-1)walls.quad(ring(S,j,true),ring(S,j+1,true),ring(S,j+1),ring(S,j),C.dark);
  }
  for(const d of[-1,1]){const a=point(s,d*width(s),-.4),b=point(S,d*width(S),-.4),A=ring(s,d===1?0:arcs),D=ring(S,d===1?0:arcs);walls.quad(a,A,D,b,C.dark);outside.quad(point(s,d*(width(s)+2.6),-2),point(S,d*(width(S)+2.6),-2),ring(S,d===1?0:arcs,true),ring(s,d===1?0:arcs,true),C.dark);}
  floor.quad(point(s,-width(s),-.04),point(s,width(s),-.04),point(S,width(S),-.04),point(S,-width(S),-.04),G.blend(C.earth,C.rock,.18*(i%3))); // Continuous base beneath the raised gutter and maintenance ledge.
  base.quad(point(s,-width(s)-2.6,-2),point(S,-width(S)-2.6,-2),point(S,width(S)+2.6,-2),point(s,width(s)+2.6,-2),C.dark);
  if(i===0||i===sections-1){const t=i===0?s:S;base.quad(point(t,-width(t)-2.6,-2),point(t,-width(t),-.04),point(t,width(t),-.04),point(t,width(t)+2.6,-2),C.dark);}
  // Raised maintenance ledge, only one side; supports do not straddle the track.
  strip(wet,point(s,3.4,.27),point(S,3.4,.27),.8,.32,C.rock);
 }
 const endcap=B.get('tunnel','Rock','extent'),endC=point(116,0,1.55);for(let j=0;j<arcs;j++)endcap.tri(endC,ring(116,j+1),ring(116,j),C.black);endcap.quad(point(116,-width(116),-.4),point(116,width(116),-.4),ring(116,0),ring(116,arcs),C.black);
 const rail=B.get('tunnel','Iron','rails'),tie=B.get('tunnel','Wood','ties');
 for(let s=0;s<=115;s+=far?2.3:1.15){const p=point(s,-.9,.015),yaw=Math.atan2(center(s+.1)[0]-center(s)[0],-.1);tie.place(p[0],p[1],p[2],yaw);tie.box(0,0,0,2.25,.14,.27,C.wood);if(!far)for(const d of[-1,1])tie.box(d*.58,.14,0,.31,.045,.39,C.rust);tie.place();}
 for(let s=0;s<116;s+=1){for(const d of[-1,1]){const off=-.9+d*.58,a=point(s,off,.24),b=point(s+1,off,.24);strip(rail,a,b,.065,.07,C.steel);strip(rail,point(s,off,.17),point(s+1,off,.17),.022,.12,C.iron);strip(rail,point(s,off,.065),point(s+1,off,.065),.11,.035,C.iron);}}
 // Damp gutter set above the low bank; stable water is not another global reflection pass.
 const drain=B.get('tunnel','Stone','drain'),water=B.get('tunnel','Water','drain');
 for(let s=0;s<104;s+=2){strip(drain,point(s,-3.5,.04),point(s+2,-3.5,.04),.48,.2,C.dark);water.quad(point(s,-3.89,.06),point(s+2,-3.89,.06),point(s+2,-3.11,.06),point(s,-3.11,.06),C.water);for(const d of[-1,1])strip(drain,point(s,-3.5+d*.52,.22),point(s+2,-3.5+d*.52,.22),.12,.2,C.rock);}
 const timber=B.get('tunnel','Wood','supports'),iron=B.get('tunnel','Iron','supports');
 for(const s of[6,18,31,44,57,70,84,98,111]){const W=width(s)-.6;for(const d of[-1,1]){const bot=point(s,d*W,0),top=point(s,d*W,4.7);beam(timber,bot,top,.24,C.wood,far?6:8,.21);const foot=B.get('tunnel','Stone','supports'),p=point(s,d*W,-.35);foot.box(...p,.86,.72,.9,C.dark);for(const y of[.55,3.9]){const p=point(s,d*W,y);iron.box(...p,.53,.13,.55,C.iron);}beam(timber,point(s,d*W,3.2),point(s,d*(W-1.15),4.8),.14,C.wood,6);}
  beam(timber,point(s,-W-.28,4.82),point(s,W+.28,4.82),.26,C.end,far?6:8);}
 const lamps=[];for(const s of[8,32,61,94]){const u=width(s)-.75,p=point(s,u,3.3),g=B.get('tunnel','Iron','lamps'),glow=B.get('tunnel','Lamp','lamps');g.box(p[0],p[1]+.25,p[2],.66,.16,.5,C.iron);g.box(p[0],p[1]-.43,p[2],.55,.12,.44,C.iron);glow.box(p[0],p[1]-.31,p[2],.36,.54,.31,C.lamp);for(const d of[-1,1])beam(g,[p[0]+d*.23,p[1]-.42,p[2]],[p[0]+d*.23,p[1]+.25,p[2]],.025,C.iron,4);lamps.push(p);}
 if(!far){const wire=B.get('tunnel','Iron','small');for(let s=2;s<112;s+=1)beam(wire,point(s,width(s)-.4,3.8-.08*Math.sin(s)),point(s+1,width(s+1)-.4,3.8-.08*Math.sin(s+1)),.018,C.iron,4);}
 // Cart and loading bench sit in a widened rock alcove, clear of rails and maintenance lane.
 const props=B.get('tunnel','Wood','bay'),metal=B.get('tunnel','Iron','bay'),c=point(33,5.6,0),yaw=.15;
 props.place(...c,yaw);props.box(0,.68,0,2.0,.22,2.8,C.wood);for(const d of[-1,1]){for(let j=0;j<3;j++){props.box(d*.94,.90+j*.225,0,.13,.21,2.8,G.blend(C.wood,C.end,j*.12));props.box(0,.90+j*.225,d*1.35,2,.21,.12,G.blend(C.wood,C.end,.15));}}props.place();
 for(const z of[-.9,.9])beam(metal,[c[0]-.86,c[1]+.43,c[2]+z],[c[0]+.86,c[1]+.43,c[2]+z],.07,C.iron,6);
 for(const x of[-.79,.79])for(const z of[-.9,.9]){const p=[c[0]+x,c[1]+.43,c[2]+z];beam(metal,[p[0]-.08,p[1],p[2]],[p[0]+.08,p[1],p[2]],.36,C.iron,far?8:14);}
 for(let i=0;i<3;i++){const p=point(28+i*1.7,5.6,.3);for(let j=0;j<4;j++)props.box(p[0],p[1]+j*.215,p[2],1.25,.202,1.05,G.blend(C.wood,C.end,.12*(j%2)));
 props.box(p[0],p[1]+.85,p[2],1.28,.045,1.08,C.end);for(const d of[-1,1])props.box(p[0]+d*.48,p[1],p[2]+.54,.11,.86,.07,C.end);}
 const bench=point(37,5.4,0);props.box(bench[0],bench[1]+1.05,bench[2],1.3,.16,2.8,C.end);for(const x of[-.49,.49])for(const z of[-1.1,1.1])props.box(bench[0]+x,bench[1]-.1,bench[2]+z,.15,1.2,.15,C.wood);
 if(!far){const r=B.get('tunnel','Rock','small');for(let i=0;i<47;i++){const s=3+(i*2.33)%107,u=(i%2?-1:1)*(width(s)-.45),p=point(s,u,0);rock(r,p[0],p[1]-.1,p[2],.25+(i%4)*.13,.25+(i%3)*.27,.4+(i%5)*.12,i);}}
 // Local entrance apron and water curtain; only visible in the separate cave study.
 const apron=B.get('tunnel','Rock','apron');apron.box(0,-2,6,18,1.96,12,C.dark);
 const curtain=B.get('tunnel','Curtain','curtain');for(let x=-8;x<8;x+=.8){const wave=.15*Math.sin(x*1.73);curtain.quad([x,-.3,9+wave],[x+.8,-.3,9+wave],[x+.8,20,10+wave],[x,20,10+wave],G.blend(C.water,C.light,.7));}
 return {lamps,route:Array.from({length:54},(_,i)=>point(i*2,-.9,.24)),gauge:1.16,serviceWidth:1.6,modeledLength:116,fullFarmConnection:false,fullCollision:false};
}
function prepare(data,pack){G.SurfaceContact.prepare(data,pack,ID,[-555,-1080,-390,-906]);}
function build(data,far=false){const B=bank(far),surfaceMeta=surface(B,data,far),tunnelMeta=tunnel(B,far);return B.finish({locations:[ID],basis:'P',surface:surfaceMeta,tunnel:tunnelMeta,terrainMutation:false,fullFarmConnection:false,existingWaterfallReplaced:false});}
G.FALLS_CAVE={id:ID,space:SPACE,version:'0.29-falls.1',views,surfaceRoute,prepare,build,publicApproach,center,point,width};
G.extraOverviewBuilders=[...(G.extraOverviewBuilders||[]),(data,pack)=>{prepare(data,pack);return [...build(data,true).meshes,...publicApproach(data).meshes];}];
const previous=G.buildRegion;G.buildRegion=async function(data,id,legacy){if(id!==ID)return previous(data,id,legacy);const start=performance.now(),p=build(data);p.builtMs=performance.now()-start;return p;};
})(globalThis.GA);
