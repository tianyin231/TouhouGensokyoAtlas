/* Fantastic Blowhole: TH11 stage 1 / SoPM Yamame transcript T; formations C/P.
 * Natural cave study, NOT a second rail mine or replacement for the old deep road.
 * Surface recess is finite; the continuous island is not cut or relocated.
 */
(function(G){'use strict';
const ID='wind_cave',SPACE='wind_grotto',TAU=Math.PI*2,CX=-440,CZ=-552,LENGTH=144;
const C=Object.fromEntries(Object.entries({rock:'#858c85',pale:'#b8b6a3',chalk:'#d0c5a6',dark:'#505c5b',earth:'#85806c',wet:'#66817f',moss:'#647955',leaf:'#7c9365',wood:'#76674f',shadow:'#202e34'}).map(([k,v])=>[k,G.rgb(v)]));
const route=G.spline([[-105,-628],[-170,-612],[-252,-595],[-326,-591],[-388,-580],[-426,-572],[-440,-551]],1.8),bounds=[-506,-666,-75,-475];
const block={id:ID,name:'幻想风穴 · 自然洞窟',space:SPACE,independent:true,poly:[],center:[0,-5,-62],bottom:-44,step:4};G.DIORAMA.blocks.push(block);G.DIORAMA.map.set(ID,block);G.REGION_LABELS[ID]=block.name;
G.EXTRA_REGION_CONTEXT={...G.EXTRA_REGION_CONTEXT,[ID]:['mountain']};
const oldOwner=G.DIORAMA.owner;G.DIORAMA.owner=(x,z)=>Math.hypot((x-CX)/42,(z-CZ)/43)<1?ID:oldOwner(x,z);
for(const k of ['transform','point','inverse']){const old=G.DIORAMA[k];G.DIORAMA[k]=k==='transform'?((r,...a)=>r===ID?{scale:1,offset:[0,0,0]}:old(r,...a)):((p,r,...a)=>r===ID?[...p]:old(p,r,...a));}
const v=(label,eye,target,extra={})=>({label,eye,target,fov:56,region:ID,space:SPACE,era:'TH11第一面／山麓风穴 · 洞形、尺寸、路线P',...extra,...(extra.space==='surface'?{detailNeighbors:['mountain'],requiredRegions:[ID,'mountain']}: {})});
const views={
 windFoothill:v('幻想风穴 · 山麓岩隙',[-397,153,-622],[-442,116,-541],{space:'surface',fov:51}),
 windMouth:v('风穴入口 · 岩唇与凹壁',[-423,118,-577],[-440,117,-548],{space:'surface',fov:55}),
 windFoot:v('岩脚 · 碎石与土坡',[-421,112,-563],[-434,111,-550],{space:'surface',fov:55}),
 windApproach:v('山麓 · 接回原登山道',[-173,146,-548],[-127,115,-620],{space:'surface',fov:53}),
 windEntry:v('洞内 · 风过石帘',[3,11,-4],[5,3,-34],{fov:64}),
 windDescent:v('风穴 · 层叠下降道',[4.6,7,-25],[2,-3,-64],{fov:63}),
 windCurtains:v('侧壁 · 钟乳石帘',[9,3,-40],[-3,4,-51],{fov:60}),
 windPool:v('低岸 · 湿润流石',[3,-5,-61],[-7,-8,-70],{fov:58}),
 windNarrow:v('风穴深处 · 自然咽道',[-1,-14,-102],[0,-20,-133],{fov:63}),
 windLookBack:v('回望 · 洞口散光',[6,7,-24],[0,13,5],{fov:65}),
 windSection:v('风穴 · 可逆地层剖览',[85,78,8],[2,-5,-68],{windCut:true,fov:47}),
 windRear:v('截取洞段 · 背壳与岩基',[-81,28,-177],[4,-3,-95],{windShell:true,fov:54})
};Object.assign(G.PRESETS,views);G.IMPLEMENTED[ID]='windFoothill';delete G.LANDMARKS.pending[ID];G.LANDMARKS.partial.add(ID);G.EXTRA_REGION_DEFAULTS={...G.EXTRA_REGION_DEFAULTS,[ID]:'windFoothill'};
function bank(far,publicOnly=false){const bins=new Map();return{get(scene,mat='Rock',part='body',tile='0'){const k=[scene,mat,part,tile].join(':');if(!bins.has(k))bins.set(k,{g:new G.Geometry(),scene,mat,part});return bins.get(k).g.place();},finish(meta={}){const meshes=[];for(const[k,b]of bins)if(b.g.a.length){const m=b.g.mesh(`${ID}:${publicOnly?'public':far?'overview':'detail'}:${k}`,b.mat==='Water'?'water':b.part==='dust'?'effects':b.part==='plants'?'vegetation':'architecture',{owner:ID,region:ID,space:b.scene==='surface'?'surface':SPACE,overview:far,material:'wind'+b.mat,windScene:b.scene,windPart:b.part,basis:'P',...(publicOnly?{globalSurface:true}:{})});if(b.part==='dust')m.radius+=14;meshes.push(m);}return{id:ID,meshes,bytes:meshes.reduce((s,m)=>s+m.vertices.byteLength,0),signs:[],meta};}};}
function beam(g,a,b,r,col=C.wood,n=5,r2=r){if(G.length(G.sub(b,a))>1e-6)g.tube(a,b,r,col,n,r2);}
// A rounded, asymmetric, closed lithic volume. Latitude bands are offset, not boxes.
function boulder(g,x,y,z,rx,ry,rz,seed=0,far=false,col=C.rock){const n=far?7:11,rings=far?3:5,P=(i,j)=>{const a=TAU*i/n,t=Math.PI*j/rings,f=1+.15*Math.sin(a*3+seed)*Math.sin(t)+.045*Math.cos(a*5+seed*.7)*Math.sin(t);return[x+rx*Math.sin(t)*Math.cos(a)*f+ry*.07*Math.sin(t*2),y+ry*Math.cos(t),z+rz*Math.sin(t)*Math.sin(a)*f];};for(let i=0;i<n;i++){const k=(i+1)%n;g.tri(P(i,0),P(k,1),P(i,1),G.blend(col,C.pale,.10));for(let j=1;j<rings-1;j++)g.quad(P(i,j),P(k,j),P(k,j+1),P(i,j+1),G.blend(col,C.pale,.035*(i%3)));g.tri(P(i,rings-1),P(k,rings-1),P(i,rings),col);}}
function fern(g,x,y,z,size,seed){for(let j=0;j<5;j++){const a=j*TAU/5+seed,p=t=>[x+Math.cos(a)*size*t,y+size*(.9*t-.55*t*t),z+Math.sin(a)*size*t];for(let k=1;k<5;k++){const t=k/5,A=p(t),B=p(t+.20),w=size*.18*(1-t*.7);for(const d of[-1,1])g.tri(A,[A[0]-Math.sin(a)*w*d,A[1]-.04,A[2]+Math.cos(a)*w*d],B,C.leaf);}}}
function surface(B,data,far){const n=G.SurfaceContact.sampler(data,ID),f=G.SurfaceContact.sampler(data,ID,'far'),t=far?f:n,base=d=>Math.max(n.height(CX,CZ+d),f.height(CX,CZ+d))+.30;
 const aCount=far?14:28,inner=(d,a)=>{const w=6.1+.55*Math.sin(a*3+.4);return[CX+w*Math.cos(a),base(d)+1.35+(5.1+.50*Math.sin(a*5))*Math.sin(a),CZ+d+.28*Math.sin(a*4+.2)];},outer=(d,a)=>{const q=d/30,w=(10.8+5*Math.sin(q*Math.PI))*(1-.25*q),x=CX+w*Math.cos(a)*(1+.09*Math.sin(a*3+q)),z=CZ+d+1.2+.65*Math.sin(a*3),terrain=t.height(x,z),blend=G.smooth(0,30,d);return[x,G.mix(Math.max(terrain+.5,base(0)+Math.sin(a)*(8.4+.9*Math.sin(a*4))+1.5),terrain-.32,blend),z];};
 const face=B.get('surface','Rock','mouth'),roof=B.get('surface','Rock','hood'),reveal=B.get('surface','Stone','recess'),floor=B.get('surface','Soil','floor');
 for(let j=0;j<aCount;j++){const a=j/aCount*Math.PI,b=(j+1)/aCount*Math.PI;const band=(u,A)=>{const i=inner(0,A),o=outer(0,A),q=G.add(i,G.mul(G.sub(o,i),u));q[2]-=Math.sin(u*Math.PI)*(1.3+.4*Math.sin(A*6));q[1]+=.32*Math.sin(A*7+u*2)*Math.sin(u*Math.PI);return q;};for(let k=0;k<3;k++)face.quad(band(k/3,a),band((k+1)/3,a),band((k+1)/3,b),band(k/3,b),G.blend(C.rock,C.pale,.17+.035*Math.sin(a*5+k)));for(let d=0;d<7;d+=1)reveal.quad(inner(d,a),inner(d+1,a),inner(d+1,b),inner(d,b),C.dark);for(const[d,D]of[[0,5],[5,12],[12,21],[21,30]])roof.quad(outer(d,a),outer(D,a),outer(D,b),outer(d,b),G.blend(C.rock,C.pale,.05+.03*(j%3)));}
 for(const side of[-1,1]){const a=side===1?0:Math.PI;for(let d=0;d<7;d++){const p=inner(d,a),q=inner(d+1,a);reveal.quad([p[0],t.height(p[0],p[2])-.5,p[2]],p,q,[q[0],t.height(q[0],q[2])-.5,q[2]],C.dark);}for(const[d,D]of[[0,5],[5,12],[12,21],[21,30]]){const p=outer(d,a),q=outer(D,a);roof.quad([p[0],t.height(p[0],p[2])-1,p[2]],p,q,[q[0],t.height(q[0],q[2])-1,q[2]],C.dark);}}
 for(let d=0;d<7;d++)for(let u=-6;u<6;u+=1.5){const p=(x,z)=>[CX+x,t.height(CX+x,CZ+z)+.08,CZ+z];floor.quad(p(u,d),p(u+1.5,d),p(u+1.5,d+1),p(u,d+1),G.blend(C.earth,C.rock,.25));}
 const cap=B.get('surface','Shadow','extent'),centre=[CX,base(7)+1,CZ+7.04];for(let j=0;j<aCount;j++)cap.tri(centre,inner(7,j/aCount*Math.PI),inner(7,(j+1)/aCount*Math.PI),C.shadow);cap.quad([CX-6.1,base(7)-.5,CZ+7],[CX+6.1,base(7)-.5,CZ+7],inner(7,0),inner(7,Math.PI),C.shadow);
 const stones=B.get('surface','Stone','talus');for(const[x,z,rx,ry,rz]of[[-7.6,1,2.4,3.4,3.3],[7.4,1.4,2.8,3.2,3.1],[-6,6,3.3,3.8,4.1],[5.5,9,4.0,2.9,4.2],[-2.9,3.0,2.6,1.65,3.1],[2.2,4.2,3.1,1.5,3.3]]){const y=Math.abs(x)<4?base(0)+8.0:t.height(CX+x,CZ+z)+ry*.62;boulder(stones,CX+x,y,CZ+z,rx,ry,rz,x+z,far,C.rock);}const plants=B.get('surface','Leaf','plants'),roots=B.get('surface','Wood','roots');
 for(let i=0;i<25;i++){const side=i%2?1:-1,x=CX+side*(7.2+(i%5)*1.8),z=CZ-3+Math.floor(i/5)*5.2,y=t.height(x,z),s=1.1+(i%4)*.55;boulder(stones,x,y+.36,z,s,s*.64,s*.77,i,far);if(!far&&i%3===1)fern(plants,x+.2,y+s*.35,z,1.6,i);}
 if(!far)for(const d of[-1,1])for(let j=0;j<3;j++){const z=CZ+12+j*3,x=CX+d*(8+j*.8),Y=t.height(x,z);beam(roots,[x,Y+.10,z],[x+d*2,Y-.6,z+4],.12,C.wood,6,.055);}
 return {origin:[CX,base(0),CZ],recessDepth:7,fullTerrainExcavation:false,routeEnd:route.at(-1)};
}
function center(s){return[9*Math.sin(s*.045)+8*G.smooth(75,140,s),8-.24*s-1.8*G.smooth(32,68,s),-s];}
function width(s){return 9.6+6.3*Math.exp(-Math.pow((s-62)/28,2))-2.2*G.smooth(100,144,s)+.55*Math.sin(s*.092);}
function height(s){return 12.4+5.1*Math.exp(-Math.pow((s-54)/27,2))+.75*Math.sin(s*.083);}
function point(s,u,y=0){const c=center(s),t=G.norm([1,0,(center(s+.1)[0]-center(s-.1)[0])/.2]);return[c[0]+t[0]*u,c[1]+y,c[2]+t[2]*u];}
const POOLS=[[24,-5.0,2.6,4.4],[69,-7.0,3.1,4.8],[100,6,1.8,3.0]];
function rawFloor(s,u){return .25+2.0*Math.pow(Math.abs(u)/width(s),2.3)+.12*Math.sin(s*.15+u*.22)*Math.min(1,Math.abs(u)/3);}
function poolLevel(s,u){return center(s)[1]+rawFloor(s,u)-.30;}
function floorHeight(s,u){let y=center(s)[1]+rawFloor(s,u);for(const[S,U,rx,rz]of POOLS){const r=Math.hypot((u-U)/rx,(s-S)/rz);if(r<1.5)y=G.mix(y,poolLevel(S,U)-.80+r*r*1.25,1-G.smooth(.82,1.5,r));}return y-center(s)[1];}
function floorPoint(s,u){return point(s,u,floorHeight(s,u));}
function shellPoint(s,a,out=false){const w=width(s)+(out?3.2:0),h=height(s)+(out?3:0),shape=1+.052*Math.sin(a*5+s*.13)+.027*Math.sin(a*9-s*.11);return point(s,w*Math.cos(a)*shape,2.0+h*Math.sin(a)*shape);}
// Tapered growth lobes join the actual ceiling or floor; no hanging cones by guess.
function growth(g,base,length,radius,down,seed,far,anchor=null){const n=far?6:10,rings=far?4:8,points=[],norms=[];for(let j=0;j<rings;j++){const t=j/(rings-1),r=radius*(Math.pow(1-t,down?1.10:.64)*.98+.018),tip=base[1]+(down?-1:1)*length;const ring=[],ns=[];for(let i=0;i<n;i++){const a=TAU*i/n,rr=r*(1+.08*Math.sin(i*2+seed)),x=base[0]+Math.cos(a)*rr+length*.018*t*t,z=base[2]+Math.sin(a)*rr;let root=base[1];if(anchor){try{root=anchor(x,z)+(down?.48:-.25);}catch{root=base[1]+(down?.48:-.25);}}ring.push([x,G.mix(root,tip,t),z]);ns.push(G.norm([Math.cos(a),(down?-.22:.24),Math.sin(a)]));}points.push(ring);norms.push(ns);}for(let j=0;j<rings-1;j++)for(let i=0;i<n;i++){const k=(i+1)%n,col=G.blend(C.rock,C.chalk,.42+.10*j/(rings-1));const faces=down?[[i,j],[k,j],[k,j+1],[i,j],[k,j+1],[i,j+1]]:[[i,j],[k,j+1],[k,j],[i,j],[i,j+1],[k,j+1]];for(const[I,J]of faces)g.vertex(points[J][I],norms[J][I],col);}for(const end of[0,rings-1]){const cp=G.mul(points[end].reduce((a,b)=>G.add(a,b),[0,0,0]),1/n);if(end===0&&anchor){cp[0]=base[0];cp[2]=base[2];cp[1]=anchor(cp[0],cp[2])+(down?.48:-.25);}for(let i=0;i<n;i++)g.tri(cp,points[end][i],points[end][(i+1)%n],C.pale);}
 if(down&&anchor){const skirts=[.68,1.1,1.55,2.0],P=(a,r)=>{const rr=radius*r*(1+.07*Math.sin(a*3+seed)),x=base[0]+Math.cos(a)*rr,z=base[2]+Math.sin(a)*rr;let y;try{y=anchor(x,z);}catch{y=base[1]+1;}return[x,y+.16-.70*Math.exp(-r*r*.64),z];};for(let j=0;j<skirts.length-1;j++)for(let i=0;i<n;i++){const a=TAU*i/n,b=TAU*(i+1)/n;g.quad(P(a,skirts[j]),P(b,skirts[j]),P(b,skirts[j+1]),P(a,skirts[j+1]),G.blend(C.pale,C.rock,j*.22));}}
}
function smoothShell(g,s,a,S,b,out){const corners=[[s,a],[S,a],[S,b],[s,b]];for(const k of [0,1,2,0,2,3]){const[u,v]=corners[k],p=shellPoint(u,v,out),ds=G.sub(shellPoint(u+.03,v,out),shellPoint(u-.03,v,out)),da=G.sub(shellPoint(u,v+.003,out),shellPoint(u,v-.003,out)),normal=G.norm(G.cross(ds,da));g.vertex(p,normal,G.blend(out?C.dark:C.rock,C.pale,out?.06:.15+.035*Math.sin(p[0]*.17+p[1]*.13+p[2]*.10)));}}
function cavern(B,far){const ns=far?36:72,na=far?16:32,under=B.get('cave','Rock','walls'),roof=B.get('cave','Rock','roof'),outer=B.get('cave','Rock','outer'),base=B.get('cave','Rock','base'),floor=B.get('cave','Soil','floor'),cross=Array.from({length:far?17:41},(_,i)=>-1+2*i/(far?16:40));
 for(let i=0;i<ns;i++){const s=i*LENGTH/ns,S=(i+1)*LENGTH/ns;for(let j=0;j<na;j++){const a=Math.PI*j/na,b=Math.PI*(j+1)/na,g=j>=na*.20&&j<na*.80?roof:under,col=G.blend(C.rock,C.pale,.12+.035*Math.sin(j*.6+i*.27));smoothShell(g,s,a,S,b,false);smoothShell(outer,s,a,S,b,true);
   if(i===0||i===ns-1){const q=i===0?s:S;under.quad(shellPoint(q,a),shellPoint(q,b),shellPoint(q,b,true),shellPoint(q,a,true),C.rock);}
  }
  for(let j=0;j<cross.length-1;j++)floor.quad(floorPoint(s,cross[j]*width(s)),floorPoint(s,cross[j+1]*width(s)),floorPoint(S,cross[j+1]*width(S)),floorPoint(S,cross[j]*width(S)),G.blend(C.earth,C.rock,.22+.06*(j%2)));
  for(const d of[-1,1]){const a=d===1?0:Math.PI;under.quad(floorPoint(s,d*width(s)),shellPoint(s,a),shellPoint(S,a),floorPoint(S,d*width(S)),C.rock);base.quad(point(s,d*(width(s)+3.2),-4),floorPoint(s,d*width(s)),floorPoint(S,d*width(S)),point(S,d*(width(S)+3.2),-4),C.dark);outer.quad(point(s,d*(width(s)+3.2),-4),point(S,d*(width(S)+3.2),-4),shellPoint(S,a,true),shellPoint(s,a,true),C.dark);}
  base.quad(point(s,-width(s)-3.2,-4),point(S,-width(S)-3.2,-4),point(S,width(S)+3.2,-4),point(s,width(s)+3.2,-4),C.dark);
 }
 for(const s of[0,LENGTH])base.quad(point(s,-width(s)-3.2,-4),point(s,width(s)+3.2,-4),floorPoint(s,width(s)),floorPoint(s,-width(s)),C.dark);
 const tip=B.get('cave','Shadow','extent'),q=center(LENGTH);for(let j=0;j<na;j++)tip.tri([q[0],q[1]+1,q[2]-.02],shellPoint(LENGTH,Math.PI*(j+1)/na),shellPoint(LENGTH,Math.PI*j/na),C.shadow);tip.quad(floorPoint(LENGTH,-width(LENGTH)),floorPoint(LENGTH,width(LENGTH)),shellPoint(LENGTH,0),shellPoint(LENGTH,Math.PI),C.shadow);
 const ceilingTriangles=[];for(const g of[roof,under]){const v=g.a;for(let i=0;i<v.length;i+=27){if([0,9,18].every(k=>v[i+k+1]>center(-v[i+k+2])[1]+4))for(const k of[0,9,18])ceilingTriangles.push(v[i+k],v[i+k+1],v[i+k+2]);}}const ceiling=G.SurfaceContact.sampler({surfaceContacts:{roof:{near:Float32Array.from(ceilingTriangles)}}},'roof');
 const calc=B.get('cave','Stone','formations'),talus=B.get('cave','Stone','talus'),r=G.rng(110102),hanging=[],rising=[];
 for(let i=0;i<78;i++){const s=4+r()*132,a=.66+r()*1.82,p=shellPoint(s,a),length=1.9+r()*5.7,radius=.42+r()*.82;growth(calc,p,length,radius,true,i,far,ceiling.height);hanging.push({s,a,p,length,radius});}
 for(let i=0;i<35;i++){const s=8+r()*123,u=(i%2?1:-1)*width(s)*(.71+r()*.16),p=floorPoint(s,u),h=1.1+r()*4.6;growth(calc,[p[0],p[1]-.17,p[2]],h,.62+r()*.70,false,i+80,far);rising.push({s,u,p,h});}
 for(let i=0;i<46;i++){const s=2+r()*139,u=(i%2?1:-1)*(width(s)*.63+r()*2.3),p=floorPoint(s,u),size=.55+r()*1.6;boulder(talus,p[0],p[1]+size*.30,p[2],size,size*.56,size*.83,i,far,G.blend(C.rock,C.pale,.2));}
 // Draped calcite ribs follow the left wall without blocking the central passage.
 const drape=(s,t)=>{const top=shellPoint(s,2.34+.04*Math.sin(s*.8)),bot=floorPoint(s,-width(s)*.78),p=G.add(top,G.mul(G.sub(bot,top),t));p[0]+=(.45+.35*Math.sin(s*2.2)) * Math.sin(t*Math.PI);p[1]+=.30*Math.sin(s*1.7)*t;return p;};for(let i=0;i<28;i++){const s=37+i*.7,S=s+.7;for(let j=0;j<8;j++)calc.quad(drape(s,j/8),drape(S,j/8),drape(S,(j+1)/8),drape(s,(j+1)/8),G.blend(C.pale,C.rock,.17+.045*Math.sin(s)));}
 const wet=B.get('cave','Water','pools');const pools=[];
 for(const [s,u,rx,rz]of POOLS){const p=point(s,u,0),Y=poolLevel(s,u),N=far?14:28;for(let j=0;j<N;j++){const a=j*TAU/N,b=(j+1)*TAU/N,P=t=>{const r=.82+.055*Math.sin(t*3+.4);const q=point(s+Math.sin(t)*rz*r,u+Math.cos(t)*rx*r,0);return[q[0],Y,q[2]];};wet.tri([p[0],Y,p[2]],P(a),P(b),C.wet);}pools.push([p[0],Y,p[2]]);for(let j=0;j<6;j++){const a=j*TAU/6+.3,q=floorPoint(s+Math.sin(a)*rz*.95,u+Math.cos(a)*rx*.95);boulder(talus,q[0],q[1]-.03,q[2],.65,.24,.45,j+20,far,C.pale);}}
 if(!far){const dust=B.get('cave','Dust','dust');for(let i=0;i<70;i++){const p=point(6+r()*118,(r()-.5)*7,2+r()*3.8);dust.tri([p[0],p[1],p[2]],[p[0]+.09,p[1]+.035,p[2]-.1],[p[0]+.018,p[1]+.014,p[2]+.62],C.pale);}}
 return{length:LENGTH,hanging,rising,pools,route:Array.from({length:69},(_,i)=>floorPoint(i*2+2,0)),fullPhysicalConnection:false,railway:false,waterSimulation:false};
}
function prepare(data,pack){return G.SurfaceContact.prepare(data,pack,ID,bounds);}
function build(data,far=false){const B=bank(far),s=surface(B,data,far),c=cavern(B,far);return B.finish({locations:[ID],basis:'P',surface:s,cave:c,terrainMutation:false,oldDeepRoadReplaced:false,physicalPortal:false});}
function publicPath(data,pack){const sample=G.ASAMA.sampleRenderedTerrain(pack),bins=new Map(),cross=[-1.3,-1,-.5,0,.5,1,1.3];for(const lod of['near','far']){const row=i=>{const p=route[i],a=route[Math.max(0,i-1)],b=route[Math.min(route.length-1,i+1)],d=G.norm([b[0]-a[0],0,b[1]-a[1]]);return cross.map(u=>{const q=sample(p[0]-d[2]*1.55*u,p[1]+d[0]*1.55*u,lod),e=1-G.smooth(.85,1.3,Math.abs(u));q.p[1]+=.13+.15*e;q.c=G.blend(q.c,C.earth,e*.76);return q;});};let a=row(0);for(let i=0;i<route.length-1;i++){const b=row(i+1),src=a[3].tile;if(!bins.has(src.id))bins.set(src.id,{g:new G.Geometry(),src});const g=bins.get(src.id).g;for(let j=0;j<cross.length-1;j++)for(const tri of[[a[j],b[j+1],b[j]],[a[j],a[j+1],b[j+1]]])for(const q of tri)g.vertex(q.p,q.n,q.c);a=b;}}
 return [...bins.values()].map(({g,src})=>{const m=g.mesh(ID+':public:'+src.id,'roads',{owner:ID,region:ID,space:'surface',overview:true,globalSurface:true,globalNear:src.globalNear,globalFar:src.globalFar,material:'windPath',windScene:'surface',windPart:'path',terrainSource:src.id,basis:'P'});return{...m,center:src.center.slice(),radius:Math.max(src.radius+3,m.radius+G.length(G.sub(m.center,src.center)))};});}
G.WIND_CAVE={id:ID,space:SPACE,version:'0.29-wind.1',views,CX,CZ,bounds,route,center,width,height,point,floorPoint,shellPoint,prepare,build,publicPath};
G.extraOverviewBuilders=[...(G.extraOverviewBuilders||[]),(data,pack)=>{prepare(data,pack);return[...build(data,true).meshes,...publicPath(data,pack)];}];
const previous=G.buildRegion;G.buildRegion=async(data,id,legacy)=>{if(id!==ID)return previous(data,id,legacy);const start=performance.now(),p=build(data);p.builtMs=performance.now()-start;return p;};
})(globalThis.GA);
