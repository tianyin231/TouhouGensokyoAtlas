/* Secret Green Cliff — TH18 stage 2 / TH18.5 first market, authored landscape P.
 * A closed, supported rock outcrop on the inherited continuous mountainside.
 * No height-function override, no HQ building, waterfall or new island.
 */
(function(G){'use strict';
const ID='hiten',PI=Math.PI,TAU=2*PI;
const C=Object.fromEntries(Object.entries({rock:'#76847e',light:'#a0a697',shade:'#67736d',moss:'#617453',bark:'#635747',leaf:'#658162',young:'#829a72',fern:'#657c50',soil:'#9b9278'}).map(([k,v])=>[k,G.rgb(v)]));
const frame={z0:-1668,z1:-1418};
// The exact form is P: top/back taper into the current mountain, bottom is buried.
function section(t,u){const z=G.mix(frame.z0,frame.z1,u),end=Math.pow(Math.max(0,Math.sin(PI*u)),.65),x=-1392+15*Math.sin(u*PI*2+.6)+5*Math.sin(u*PI*7),width=12+57*end,base=t.height(x,z)-5,back=t.height(x+width,z)-3;
 return {x,z,width,base,cap:Math.max(base+4,back-9*end),end};}
const block={id:ID,name:'秘天崖 · 深林断崖',poly:[[-1550,-1705],[-1230,-1705],[-1230,-1370],[-1550,-1370]],center:[-1380,560,-1538],bottom:10,step:8};
G.DIORAMA.blocks.push(block);G.DIORAMA.map.set(ID,block);G.REGION_LABELS[ID]=block.name;
const oldOwner=G.DIORAMA.owner;G.DIORAMA.owner=(x,z)=>x>-1525&&x<-1280&&z>-1688&&z<-1400?ID:oldOwner(x,z);
const v=(label,eye,target,fov=50)=>({label,eye,target,fov,region:ID,space:'surface',era:'TH18／TH18.5秘天崖选景 · 岩体、路形与方位P'});
const views={
 hitenOverview:v('秘天崖 · 林上层岩',[-1750,690,-1260],[-1380,525,-1540]),
 hitenFront:v('秘天崖 · 苔壁与裂隙',[-1565,556,-1460],[-1365,575,-1545],49),
 hitenFoot:v('秘天崖 · 岩脚与林地',[-1465,392,-1490],[-1393,467,-1503],55),
 hitenLedge:v('秘天崖 · 崖肩草木',[-1418,638,-1590],[-1352,653,-1598],54),
 hitenBack:v('秘天崖 · 山体衔接',[-1200,928,-1605],[-1352,642,-1550],49),
 hitenPath:v('秘天崖 · 旧山路旁',[-1500,443,-1575],[-1444,462,-1585],55),
 hitenNorth:v('秘天崖 · 通向高地',[-1520,677,-1765],[-1383,625,-1690],52),
 hitenWide:v('秘天崖 · 全岛山脊',[-2020,1200,-1080],[-1300,490,-1500],46)
};
Object.assign(G.PRESETS,views);G.IMPLEMENTED.hiten='hitenOverview';G.LANDMARKS.partial.add('hiten');
G.EXTRA_REGION_DEFAULTS={...(G.EXTRA_REGION_DEFAULTS||{}),hiten:'hitenOverview'};
// Same sites/rock surface at every precision; only canopy tessellation and herbs differ.
function bank(far){const bins=new Map();return {get(mat,part='base',tile='0'){const k=[mat,part,tile].join(':');if(!bins.has(k))bins.set(k,{g:new G.Geometry(),mat,part});return bins.get(k).g.place();},finish(meta){const meshes=[];for(const[k,o]of bins){if(!o.g.a.length)continue;meshes.push(o.g.mesh(`${ID}:${far?'overview':'detail'}:${k}`,o.part==='trees'||o.part==='herbs'?'vegetation':'architecture',{owner:ID,region:ID,space:'surface',overview:far,material:'hiten'+o.mat,hitenPart:o.part,basis:'P'}));}return{id:ID,meshes,signs:[],bytes:meshes.reduce((s,m)=>s+m.vertices.byteLength,0),meta};}};}
function face(g,a,b,c,d,color){g.quad(a,b,c,d,color);}
// Fractured benches at separate heights, not a wavy extruded wall.
const crags=[[-1400,-1444,43,61],[-1406,-1496,46,65],[-1390,-1548,40,72],[-1362,-1606,39,57],[-1387,-1650,43,44]];
function rockBench(B,t,cx,cz,depth,length,seed){
 const rock=B.get('Rock','cliff'),cap=B.get('Moss','cap'),front=cx,back=cx+depth,Y=t.height(cx+depth*.73,cz)+1.8;
 // Bevelled footprint. The eastern faces and base intentionally extend into solid ground.
 const outline=[[front+6,cz-length*.5],[back-9,cz-length*.52],[back+3,cz-length*.3],[back+4,cz+length*.32],[back-7,cz+length*.5],[front+7,cz+length*.49],[front-2,cz+length*.23],[front-5,cz-length*.16]],N=outline.length;
 const bottoms=outline.map(([x,z])=>Math.min(t.height(x,z)-8,Y-10)),low=Math.min(...bottoms),n=8,rows=[];
 for(let j=0;j<=n;j++){const y=G.mix(low,Y,j/n),inset=j===n?3.8:j===n-1?-.4:j%3===0?1.1:0;
  rows.push(outline.map(([x,z],i)=>{const dx=cx+depth*.5-x,dz=cz-z,L=Math.hypot(dx,dz),v=inset+.85*Math.sin(i*2.3+seed+j*.4);return[x+dx/L*v,Math.max(bottoms[i],y),z+dz/L*v];}));}
 for(let j=0;j<n;j++)for(let i=0;i<N;i++){
  const k=(i+1)%N,a=rows[j][i],b=rows[j][k],c=rows[j+1][k],d=rows[j+1][i];
  // Degenerate bottom faces are intentionally omitted, all remaining faces are closed below terrain.
  const h1=d[1]-a[1],h2=c[1]-b[1],color=G.blend(C.rock,C.light,.12+.12*(.5+.5*Math.sin(i*2+seed))+j*.012);
  if(h1>1e-6&&h2>1e-6)rock.quad(a,d,c,b,color);else if(h1>1e-6)rock.tri(a,d,b,color);else if(h2>1e-6)rock.tri(a,c,b,color);
 }
 const top=rows[n],mid=[cx+depth*.48,Y+.35,cz];
 for(let i=0;i<N;i++){rock.tri(mid,top[(i+1)%N],top[i],C.light);const v=top[i],w=top[(i+1)%N];
  // Broad broken moss pockets, not a uniform green lid or artificial noise texture.
  if(i%3!==seed%3){const q=[G.mix(v[0],mid[0],.24),Y+.38,G.mix(v[2],mid[2],.24)],r=[G.mix(w[0],mid[0],.46),Y+.39,G.mix(w[2],mid[2],.46)],u=[G.mix(v[0],mid[0],.81),Y+.4,G.mix(v[2],mid[2],.81)];cap.tri(q,r,u,G.blend(C.moss,C.young,.22));}}
 const bottom=rows[0];for(let i=1;i<N-1;i++)rock.tri(bottom[0],bottom[i],bottom[i+1],C.shade);
 return {x:cx,z:cz,cap:Y,depth,length,top,base:low};
}
function rocks(B,t){return crags.map((c,i)=>rockBench(B,t,...c,i+2));}

function clump(g,x,y,z,rx,ry,rz,col,seed,far){const n=far?6:10,levels=far?2:4,p=(i,j)=>{const a=TAU*i/n,h=j/levels*PI,w=Math.sin(h),r=1+.12*Math.sin(i*2.7+seed)+.06*Math.cos(j*2+i);return[x+Math.cos(a)*rx*w*r,y+Math.cos(h)*ry,z+Math.sin(a)*rz*w*r];};
 for(let i=0;i<n;i++){const b=(i+1)%n;g.tri(p(i,0),p(b,1),p(i,1),col);for(let j=1;j<levels-1;j++)g.quad(p(i,j),p(b,j),p(b,j+1),p(i,j+1),col);g.tri(p(i,levels-1),p(b,levels-1),p(i,levels),col);}}
function tree(B,t,x,z,size,seed,far,ground=null){const surface=ground||((x,z)=>t.height(x,z)),y=surface(x,z),r=G.rng(seed),tile=Math.floor(x/100)+','+Math.floor(z/100),g=B.get('Wood','trees',tile),l=B.get('Leaf','trees',tile),top=[x+.9,y+size*1.7,z-.4];
 g.tube([x,y-2.2,z],[x+.4,y+size*.8,z],size*.072,C.bark,far?5:7,size*.049);g.tube([x+.4,y+size*.8,z],top,size*.049,C.bark,far?5:7,size*.019);
 for(let k=0;k<5;k++){const a=k*2.399+r()*.3,P=[x+Math.cos(a)*size*.46,y+size*(1.03+.13*k),z+Math.sin(a)*size*.46];g.tube([x+.4,y+size*(.45+.18*k),z],P,size*.033,C.bark,5,size*.009);clump(l,P[0],P[1]+size*.17,P[2],size*.48,size*.24,size*.46,G.blend(C.leaf,C.young,r()*.48),seed+k,far);}
 clump(l,top[0],top[1]+size*.12,top[2],size*.48,size*.24,size*.45,C.young,seed,far);
 if(!far)for(let k=0;k<4;k++){const a=k*PI/2+.4,xx=x+Math.cos(a)*size*.24,zz=z+Math.sin(a)*size*.24;g.tube([x,y+.7,z],[xx,surface(xx,zz)-.45,zz],size*.045,C.bark,5,size*.018);}
 return [x,y,z,size];
}
function boulder(g,t,x,z,rx,rz,h,seed){const y=t.height(x,z),n=7,ring=[];for(let i=0;i<n;i++){const a=TAU*i/n;ring.push([x+Math.cos(a)*rx,t.height(x+Math.cos(a)*rx,z+Math.sin(a)*rz)-.7,z+Math.sin(a)*rz]);}const cap=ring.map((p,i)=>[x+(p[0]-x)*.67,Math.max(y+h,t.height(x+(p[0]-x)*.67,z+(p[2]-z)*.67)+.4)+.23*Math.sin(i+seed),z+(p[2]-z)*.67]);for(let i=0;i<n;i++)g.quad(ring[i],cap[i],cap[(i+1)%n],ring[(i+1)%n],C.rock);for(let i=1;i<n-1;i++){g.tri(cap[0],cap[i+1],cap[i],C.light);g.tri(ring[0],ring[i],ring[i+1],C.shade);}}
function fern(g,x,y,z,s,a){for(let k=0;k<5;k++){const ang=a+k*TAU/5,dx=Math.cos(ang),dz=Math.sin(ang);for(let j=1;j<=4;j++){const t=j/4,cx=x+dx*s*t,cz=z+dz*s*t,h=y+s*(.35+.65*t-.62*t*t),w=s*(1-t*.8)*.22;for(const d of[-1,1])g.tri([cx-dx*s*.23,h,cz-dz*s*.23],[cx-dz*w*d,h+s*.05,cz+dx*w*d],[cx+dx*s*.24,h,cz+dz*s*.24],C.fern);}}}
function build(t,far=false,contact=null){const raw=t;t=contact||t;const B=bank(far),rows=rocks(B,t),r=G.rng(181020),trees=[],stones=[];
 for(let i=0;i<210&&trees.length<82;i++){const z=G.mix(-1688,-1396,r()),s=section(t,Math.max(0,Math.min(1,(z-frame.z0)/(frame.z1-frame.z0)))),x=s.x-27-r()*104;const dist=Math.min(...G.HIGHLAND.paths[0].map(p=>Math.hypot(p[0]-x,p[1]-z)));if(dist<8||raw.normal(x,z)[1]<.23)continue;trees.push(tree(B,t,x,z,10+r()*7,i+8200,far));}
 for(let i=0;i<rows.length;i++){const c=rows[i],q=G.rng(410+i);for(let j=0;j<[2,4,1,3,2][i];j++){const x=c.x+8+q()*14,z=c.z+(q()-.5)*c.length*.63;if(t.height(x,z)>c.cap-1)continue;const surface=(xx,zz)=>Math.max(c.cap+.4,t.height(xx,zz));trees.push(tree(B,t,x,z,7+q()*6,9000+i*5+j,far,surface));}}
 for(let i=0;i<24;i++){const u=.04+r()*.92,s=section(t,u),x=s.x-5-r()*15,z=s.z,h=1+r()*3,rx=2+r()*4,rz=3+r()*6;stones.push([x,z,rx,rz,h]);boulder(B.get('Rock','scree'),t,x,z,rx,rz,h,i);}
 if(!far){const h=B.get('Moss','herbs');for(let k=0;k<rows.length;k++){const c=rows[k];for(let i=0;i<8;i++){const x=c.x+7+(i%3)*2,z=c.z-c.length*.34+i*c.length*.085;if(t.height(x,z)>c.cap)continue;fern(h,x,c.cap+.5,z,1.4+(i%3)*.3,i);}}
  for(let i=0;i<80;i++){const c=section(t,r()),x=c.x-12-r()*38,z=c.z;if(Math.min(...G.HIGHLAND.paths[0].map(p=>Math.hypot(p[0]-x,p[1]-z)))<4)continue;fern(h,x,t.height(x,z)+.18,z,.9+r()*1.1,i);}
 }
 return B.finish({version:'hiten.1',locations:['hiten'],basis:'P',trees,stones,cliffBodies:rows.length,crags:rows.map(c=>({x:c.x,z:c.z,cap:c.cap,base:c.base})),physicalPortal:false,terrainMutation:false,headquartersBuilding:false,waterfall:false,publicRoute:'inherited GA.HIGHLAND.paths[0]'});
}
G.HITEN={id:ID,version:'0.29-hiten.1',views,section,frame,build};
G.extraOverviewBuilders=[...(G.extraOverviewBuilders||[]),(data,pack)=>{G.SurfaceContact.prepare(data,pack,ID,[-1580,-1720,-1240,-1355]);return build(new G.Terrain(data),true,G.SurfaceContact.sampler(data,ID,'far')).meshes;}];
const prev=G.buildRegion;G.buildRegion=async function(data,id,legacy){if(id!==ID)return prev(data,id,legacy);const start=performance.now(),p=build(new G.Terrain(data),false,G.SurfaceContact.sampler(data,ID));p.builtMs=performance.now()-start;return p;};
})(globalThis.GA);
