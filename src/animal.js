/* Beast Metropolis and the Primate Spirit Garden, selected TH17 period.
 * Canon text/scene references: docs/animal-reference.md. All dimensions, roads,
 * unseen building faces, interior rooms and static clay figures are P designs.
 * The interior chart is an unmeasured cutaway, not a second official world. */
(function (G) {
  'use strict';
  const TAU = Math.PI * 2;
  const C = Object.fromEntries(Object.entries({
    ground:'#444c57', road:'#343b46', curb:'#929799', concrete:'#818793',
    pale:'#b8b4ac', wall:'#6e7989', wall2:'#8b8c96', glass:'#334853',
    metal:'#4b6068', rust:'#a47862', window:'#8b4c49', dim:'#493d47',
    gold:'#c7a66f', clay:'#bd8465', clayLight:'#d4a581', cavity:'#493c37',
    leaf:'#5b806b', leafLight:'#83a085', turf:'#69866d', bark:'#676357',
    earth:'#72766a', water:'#344e58', floor:'#a4a998', jade:'#4b7975',
    trace:'#e7c784', cyan:'#8dbeb5', dark:'#253b42', spirit:'#cad8cc'
  }).map(([k,v]) => [k,G.rgb(v)]));
  const views = {
    beastOverview:{label:'畜生界 · 高楼环城',eye:[715,810,980],target:[0,57,-75],fov:45},
    beastBoulevard:{label:'畜生界 · 园前长街',eye:[30,44,563],target:[0,42,195],fov:53},
    beastCanyon:{label:'畜生界 · 楼间巷道',eye:[299,52,439],target:[291,82,-70],fov:55},
    beastRooftops:{label:'畜生界 · 退台与楼顶',eye:[-420,260,225],target:[-55,96,-141],fov:51},
    beastRear:{label:'畜生界 · 北侧都市',eye:[-580,214,-590],target:[0,86,-204],fov:49},
    primateExterior:{label:'灵长园 · 都市中的古坟',eye:[433,368,566],target:[0,35,-47],fov:49},
    primateKeyhole:{label:'灵长园 · 前方后圆',eye:[35,700,306],target:[0,23,-56],fov:44},
    primateGate:{label:'灵长园 · 陶像守备口',eye:[57,39,322],target:[0,23,221],fov:51},
    primateHaniwa:{label:'灵长园 · 埴轮与林径',eye:[0,48,185],target:[-15,43.5,165],fov:52},
    primateForest:{label:'灵长园 · 林冠与土垒',eye:[108,91,-72],target:[-4,60,-231],fov:52},
    primateBefore:{label:'灵长园 · 改造前意象',eye:[433,368,566],target:[0,35,-47],fov:49,animalEra:'before',era:'TH17文档所述改造前草木园地／P历史意象，非结局复刻'},
    primateCore:{label:'灵长园 · 电子遗产',region:'primate_core',space:'primate_core',eye:[80,43,61],target:[-3,24,-113],fov:64,animalInterior:true},
    primateGallery:{label:'灵长园内部 · 高廊与线路',region:'primate_core',space:'primate_core',eye:[105,35,18],target:[-6,16,-137],fov:62,animalInterior:true},
    primateWorkshop:{label:'灵长园内部 · 陶偶制作间',region:'primate_core',space:'primate_core',eye:[-57,22,-78],target:[-94,13,-139],fov:57,animalInterior:true},
    primateVault:{label:'灵长园内部 · 中央构造',region:'primate_core',space:'primate_core',eye:[8,22,-88],target:[0,28,-203],fov:58,animalInterior:true},
    primateSection:{label:'灵长园内部 · 可逆剖览',region:'primate_core',space:'primate_core',eye:[226,187,235],target:[0,26,-73],fov:48,animalSection:true}
  };
  for (const p of Object.values(views)) {
    p.region ||= 'animal'; p.space ||= 'animal'; p.animalEra ||= 'keiki';
    p.era ||= 'TH17袿姬占据灵长园时期选景；外部／内部布局为P';
  }
  const regions=['animal','primate_core'],locations={animal:'beastOverview',primate:'primateExterior'};
  Object.assign(G.PRESETS,views); Object.assign(G.IMPLEMENTED,locations);
  G.LANDMARKS.partial.add('animal');
  for (const [id,name,center] of [['animal','畜生界 · 高楼与灵长园',[0,50,-50]],['primate_core','灵长园内部 · 电子遗产',[0,24,-70]]]) {
    const block={id,name,space:id,center,poly:[],independent:true,bottom:-40,step:12};
    G.DIORAMA.blocks.push(block);G.DIORAMA.map.set(id,block);G.REGION_LABELS[id]=name;
  }
  for(const key of ['transform','point','inverse']) {
    const previous=G.DIORAMA[key];
    G.DIORAMA[key]=key==='transform' ? ((id,...args)=>regions.includes(id)?{scale:1,offset:[0,0,0]}:previous(id,...args))
      : ((p,id,...args)=>regions.includes(id)?p.slice():previous(p,id,...args));
  }
  function bank(id,far) {
    const batches=new Map();
    function get(zone,mat='Concrete',part='base',era='both',group='architecture') {
      const key=[zone,mat,part,era].join(':');
      if(!batches.has(key))batches.set(key,{g:new G.Geometry(),zone,mat,part,era,group});
      return batches.get(key).g.place();
    }
    return {get,finish(extra={}) {
      const meshes=[];
      for(const [key,b]of batches)if(b.g.a.length)meshes.push(b.g.mesh(`${id}:${far?'far':'detail'}:${key}`,b.group,{
        owner:id,region:id,space:id,overview:far,material:'animal'+b.mat,
        animalZone:b.zone,animalPart:b.part,animalEra:b.era,basis:'P',
        shadowCaster:!['ground','horizon','moat'].includes(b.zone)
      }));
      return{id,meshes,signs:[],bytes:meshes.reduce((n,m)=>n+m.vertices.byteLength,0),
        meta:{version:'0.24.0',overview:far,surfaceCut:false,fullRealm:false,officialHeadquarters:false,...extra}};
    }};
  }
  // Star-shaped keyhole footprint: only the neck centre is used for fan triangulation.
  // The truncated circle joins a flared forecourt; no overlapping primitive disks.
  function outline(segments=64) {
    const p=[[120,235],[-120,235]];
    for(let i=0;i<=segments;i++) {const a=(120+300*i/segments)*Math.PI/180;p.push([148*Math.cos(a),-155+148*Math.sin(a)]);}
    return p;
  }
  const edge=outline(),origin=[0,-30];
  const scaled=(p,s)=>[origin[0]+(p[0]-origin[0])*s,origin[1]+(p[1]-origin[1])*s];
  function ringRatio(x,z) {
    const d=[x,z-origin[1]];if(Math.hypot(...d)<1e-8)return 0;
    for(let i=0;i<edge.length;i++) {
      const a=[edge[i][0],edge[i][1]-origin[1]],b=edge[(i+1)%edge.length],v=[b[0]-edge[i][0],b[1]-edge[i][1]];
      const det=d[0]*v[1]-d[1]*v[0];if(Math.abs(det)<1e-8)continue;
      const t=(a[0]*v[1]-a[1]*v[0])/det,u=(a[0]*d[1]-a[1]*d[0])/det;
      if(t>0&&u>=-1e-8&&u<=1+1e-8)return 1/t;
    }
    return Infinity;
  }
  function parkHeight(x,z) {
    const r=ringRatio(x,z),levels=[[0,44],[.71,44],[.79,36],[.87,36],[.94,23],[1,14]];
    for(let i=1;i<levels.length;i++)if(r<=levels[i][0])return G.mix(levels[i-1][1],levels[i][1],(r-levels[i-1][0])/(levels[i][0]-levels[i-1][0]));
    return 10;
  }
  function oval(g,x,y,z,rx,ry,rz,col,n=8,rings=4) {
    const p=(i,j)=>{const a=i*TAU/n,b=j*Math.PI/rings;return[x+rx*Math.sin(b)*Math.cos(a),y+ry*Math.cos(b),z+rz*Math.sin(b)*Math.sin(a)];};
    const tri=(a,b,c)=>{for(const v of [a,b,c])g.vertex(v,G.norm([(v[0]-x)/(rx*rx),(v[1]-y)/(ry*ry),(v[2]-z)/(rz*rz)]),col);};
    for(let j=0;j<rings;j++)for(let i=0;i<n;i++) {
      if(j===0)tri(p(i,0),p(i+1,1),p(i,1));
      else if(j===rings-1)tri(p(i,j),p(i+1,j),p(i,rings));
      else{tri(p(i,j),p(i+1,j),p(i+1,j+1));tri(p(i,j),p(i+1,j+1),p(i,j+1));}
    }
  }
  function band(g,p,s0,y0,s1,y1,col) {
    for(let i=0;i<p.length;i++) {const a=scaled(p[i],s0),b=scaled(p[(i+1)%p.length],s0),c=scaled(p[(i+1)%p.length],s1),d=scaled(p[i],s1);
      g.quad([a[0],y0,a[1]],[d[0],y1,d[1]],[c[0],y1,c[1]],[b[0],y0,b[1]],col);
    }
  }
  function line(g,a,b,w,col) {
    const n=G.mul(G.norm([b[2]-a[2],0,a[0]-b[0]]),w/2);
    g.quad(G.sub(a,n),G.sub(b,n),G.add(b,n),G.add(a,n),col);
  }
  function tree(B,x,z,s,far,seed) {
    const y=parkHeight(x,z),g=B.get('woodland','Bark','plants','both','vegetation'),leaf=B.get('woodland','Leaf','plants','both','vegetation'),R=G.rng(seed);
    g.tube([x,y,z],[x+.5*s,y+9*s,z],.64*s,C.bark,far?5:7,.28*s);
    for(let i=0;i<(far?2:5);i++) {const a=i*2.4,dx=Math.cos(a)*3*s,dz=Math.sin(a)*3*s,yy=y+(7+R()*4)*s;
      if(!far)g.tube([x,y+4*s,z],[x+dx,yy,z+dz],.24*s,C.bark,5,.1*s);
      oval(leaf,x+dx,yy+2*s,z+dz,4.1*s,3.4*s,4*s,i%3?C.leaf:C.leafLight,far?6:8,far?3:4);
    }
  }
  function haniwa(B,zone,x,y,z,s=1,turn=0,far=false) {
    const clay=B.get(zone,'Clay','figures','keiki').place(x,y,z,turn),dark=B.get(zone,'Dark','figures','keiki').place(x,y,z,turn);
    clay.cone(0,0,0,.70*s,.50*s,1.65*s,C.clay,12);
    clay.tube([-.47*s,1.13*s,0],[-1.05*s,1.78*s,.07*s],.19*s,C.clay,6);
    clay.tube([.47*s,1.13*s,0],[.95*s,1.26*s,.34*s],.19*s,C.clay,6);
    // Hollow cylindrical head. Three missing surface cells form two eyes and mouth.
    const N=24,r=.50*s,inner=.37*s,base=1.6*s,h=1.15*s;
    for(let j=0;j<6;j++)for(let i=0;i<N;i++) {
      const hole=(j===3&&[4,7].includes(i))||(j===1&&i===6);
      const a=i*TAU/N,b=(i+1)*TAU/N,y0=base+j*h/6,y1=base+(j+1)*h/6;
      if(!hole)clay.quad([r*Math.cos(a),y0,r*Math.sin(a)],[r*Math.cos(a),y1,r*Math.sin(a)],[r*Math.cos(b),y1,r*Math.sin(b)],[r*Math.cos(b),y0,r*Math.sin(b)],C.clayLight);
      if(!far&&hole)dark.quad([inner*Math.cos(a),y0,inner*Math.sin(a)],[inner*Math.cos(a),y1,inner*Math.sin(a)],[inner*Math.cos(b),y1,inner*Math.sin(b)],[inner*Math.cos(b),y0,inner*Math.sin(b)],C.cavity);
    }
    for(let i=0;i<N;i++) {const a=i*TAU/N,b=(i+1)*TAU/N;
      clay.quad([r*Math.cos(a),base+h,r*Math.sin(a)],[inner*Math.cos(a),base+h,inner*Math.sin(a)],[inner*Math.cos(b),base+h,inner*Math.sin(b)],[r*Math.cos(b),base+h,r*Math.sin(b)],C.clayLight);
    }
    dark.cone(0,base+.06*s,0,inner,inner,.04*s,C.cavity,12);clay.place();dark.place();
  }
  function rail(B,zone,a,b,y) {
    const g=B.get(zone,'Metal'),n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/7);
    for(let i=0;i<=n;i++){const t=i/n;g.box(G.mix(a[0],b[0],t),y,G.mix(a[1],b[1],t),.48,3.7,.48,C.metal);}
    for(const dy of[1.3,3.2])g.tube([a[0],y+dy,a[1]],[b[0],y+dy,b[1]],.18,C.metal,4);
  }
  function tower(B,t,far) {
    const {x,z,w,d,h,style,seed}=t,zone='city'+(x<0?'West':'East')+(z<0?'North':'South'),R=G.rng(seed);
    const g=B.get(zone,'Concrete'),metal=B.get(zone,'Metal'),windows=B.get(zone,'Window');
    g.box(x,10,z,w+9,3,d+9,C.concrete);
    const col=style%2?C.wall2:C.wall;
    const tiers=style===0?3:style===1?2:1;
    let top=13;
    for(let j=0;j<tiers;j++) {
      const tw=w*(1-j*.16),td=d*(1-j*.13),th=(h-3)/tiers;
      g.box(x,top,z,tw,th,td,col);
      metal.box(x,top+th-.55,z,tw+1.1,.7,td+1.1,C.metal);
      if(!far) {
        for(const face of[0,1,2,3]) {
          const sideways=face%2===1,width=sideways?td:tw,depth=sideways?tw:td;
          const cols=Math.max(3,Math.floor(width/7.7)),dx=width/cols;
          for(let yy=top+5;yy<top+th-2.5;yy+=6.8)for(let k=0;k<cols;k++) {
            const xx=-width/2+(k+.5)*dx,zf=depth/2+.07,c=R()>.29?C.window:C.dim;
            const a=[[xx-dx*.28,yy,zf],[xx+dx*.28,yy,zf],[xx+dx*.28,yy+3.5,zf],[xx-dx*.28,yy+3.5,zf]];
            windows.place(x,0,z,face*Math.PI/2).quad(...a,c);
          }
        }
        windows.place();
        // Corner piers, intermediate spandrels and roof parapets are physical geometry.
        for(const sx of[-1,1])for(const sz of[-1,1])metal.box(x+sx*(tw/2-.2),top,z+sz*(td/2-.2),1.2,th,1.2,C.concrete);
        for(let yy=top+4;yy<top+th;yy+=20.4)metal.box(x,yy,z,tw+.34,.65,td+.34,C.concrete);
      }
      top+=th;
    }
    if(!far) {
      const rw=w*(1-(tiers-1)*.16),rd=d*(1-(tiers-1)*.13);
      for(const side of[-1,1]) {g.box(x+side*(rw/2-.6),top,z,1.2,2.1,rd,C.pale);g.box(x,top,z+side*(rd/2-.6),rw,2.1,1.2,C.pale);}
      g.box(x+w*.10,top,z-d*.14,w*.23,5,d*.22,C.concrete);
      metal.box(x-w*.22,top+.3,z+d*.20,8,2.2,6,C.metal);
      for(let i=0;i<6;i++)g.box(x-w*.22,top+2.5,z+d*.20-2.4+i*.8,7.5,.18,.17,C.pale);
      if(style===2)metal.cone(x,top,z,.25,.25,12,C.rust,6);
      // A recessed doorway under an actual portico, rather than a painted sign.
      g.box(x-w*.22,13,z+d/2+1,3.4,9,4,C.concrete);g.box(x+w*.22,13,z+d/2+1,3.4,9,4,C.concrete);
      g.box(x,22,z+d/2+3,w*.63,1.1,9,C.pale);
      B.get(zone,'Glass').box(x,13.1,z+d/2+.1,w*.28,7,.24,C.glass);
      metal.box(x,13,z+d/2+.8,.22,7.1,.40,C.metal);
      // Roof and foundation side access steps are not functional elevators.
      for(let k=0;k<4;k++)g.box(x,10,z+d/2+9-k*1.2,w*.35,.78*(k+1),1.25,C.curb);
    }
  }
  function buildCity(far=false) {
    const B=bank('animal',far),land=B.get('ground','Road','base','both','terrain');
    // Moderate local triangles preserve depth precision for thin paving and water.
    const n=far?14:28,extent=1750,step=extent*2/n;
    for(let j=0;j<n;j++)for(let i=0;i<n;i++){
      const x=-extent+i*step,z=-extent+j*step;
      land.quad([x,10,z],[x,10,z+step],[x+step,10,z+step],[x+step,10,z],C.ground);
    }
    for(let side=0;side<4;side++){
      const rotate=(x,z)=>{for(let i=0;i<side;i++)[x,z]=[-z,x];return[x,10,z];};
      land.quad(rotate(-extent,-extent),rotate(extent,-extent),rotate(20000,-20000),rotate(-20000,-20000),C.ground);
    }
    const roads=B.get('boulevard','Road');
    const xs=[-620,-490,-360,-230,0,230,360,490,620],zs=[-640,-510,-380,-255,-130,-5,120,245,370,495,620];
    // Main boulevard is a continuous surface. Dense city is outside the park reserve.
    roads.box(0,10.03,451,62,.18,375,C.road);
    for(const x of[-34,34])roads.box(x,10.14,451,3,1.3,375,C.curb);
    for(const x of[-295,295,-555,555])roads.box(x,10.02,-10,26,.16,1400,C.road);
    for(const z of[-575,-445,-318,307,434,559])roads.box(0,10.03,z,1440,.16,24,C.road);
    const R=G.rng(240928),towers=[];
    for(const x of xs)for(const z of zs) {
      if((Math.abs(x)<218&&z>-357&&z<284)||(Math.abs(x)<46&&z>235))continue;
      const w=48+R()*30,d=49+R()*27,h=65+R()*148+(Math.abs(x)>430?R()*90:0);
      const t={x,z,w,d,h,style:Math.floor(R()*4),seed:Math.round(R()*1e7)};
      // Reserve the promenade as well as the forest, including the entrance portico.
      if([[-1,-1],[-1,1],[1,-1],[1,1]].some(([sx,sz])=>ringRatio(x+sx*(w/2+14),z+sz*(d/2+14))<1.24))continue;
      tower(B,t,far);towers.push(t);
    }
    // Distant towers are deliberately plain, not copied full-detail buildings at boot.
    const horizon=B.get('horizon','Concrete','base','both','terrain');
    for(let i=0;i<52;i++) {
      const a=i*TAU/52,r=1030+R()*280,x=Math.cos(a)*r,z=Math.sin(a)*r;
      horizon.box(x,10,z,50+R()*46,85+R()*200,45+R()*48,C.wall);
    }
    const p=outline(far?24:64),water=B.get('moat','Water','base','both','water');
    band(water,p,1,10.5,1.13,10.5,C.water);
    band(B.get('promenade','Stone'),p,1.13,11.0,1.21,11.0,C.curb);
    const earth=B.get('earthworks','Stone','base','both','terrain');
    band(earth,p,1,10.5,1,14,C.earth);
    for(const [s0,y0,s1,y1]of[[1,14,.94,23],[.94,23,.87,36],[.87,36,.79,36],[.79,36,.71,44]])band(earth,p,s0,y0,s1,y1,y0===y1?C.turf:C.earth);
    const top=B.get('garden','Turf','base','both','terrain');
    for(let i=0;i<p.length;i++){const a=scaled(p[i],.71),b=scaled(p[(i+1)%p.length],.71);top.tri([0,44,-30],[b[0],44,b[1]],[a[0],44,a[1]],C.turf);}
    // The park access rises on the actual mound. No bridge links this chart to Gensokyo.
    const access=B.get('access','Stone');
    const bridgeZ=251,bridgeDepth=53,bridgeRise=3;
    access.box(0,10,bridgeZ,25,bridgeRise,bridgeDepth,C.concrete);
    rail(B,'access',[-12,228],[-12,277],13);rail(B,'access',[12,228],[12,277],13);
    const samples=[],path=B.get('gardenPath','Paving');
    path.quad([-7,13,240],[-7,parkHeight(-7,235)+.72,235],[7,parkHeight(7,235)+.72,235],[7,13,240],C.pale);
    for(let z=235;z>=-180;z-=4) {const z1=z-4,y=parkHeight(0,z);
      const a=[-7,parkHeight(-7,z)+.72,z],b=[-7,parkHeight(-7,z1)+.72,z1],c=[7,parkHeight(7,z1)+.72,z1],d=[7,parkHeight(7,z)+.72,z];
      path.quad(a,b,c,d,C.pale);samples.push([0,y+.72,z]);
    }
    // 从桥端向外排台阶，最高阶与桥面齐平；踏面略搭接，避免桥头断口。
    const bridgeEnd=bridgeZ+bridgeDepth/2,stepRun=1.6;
    for(let i=0;i<4;i++)access.box(0,10,bridgeEnd+(3.5-i)*stepRun,24,bridgeRise*(i+1)/4,stepRun+.05,C.concrete);
    const gate=B.get('gate','Concrete','base','keiki');
    for(const x of[-19,19])gate.box(x,10,222,11,12,15,C.concrete);
    for(const x of[-19,19]) {gate.box(x,22,222,8,17,10,C.pale);gate.box(x,24,228,10,2,2,C.rust);}
    gate.box(0,39,222,46,4,11,C.concrete);
    B.get('gate','Circuit','tech','keiki','effects').box(0,39.7,227.6,32,.6,.14,C.trace);
    const clay=B.get('gatewayRelief','Clay','figures','keiki');
    clay.cone(0,39.8,228.3,1.35,1.35,.5,C.clay,16);
    // Regular clay figures are scenery, never replacements for named character portraits.
    const guards=[];
    for(let i=0;i<(far?3:8);i++)for(const side of[-1,1]) {const x=side*15,z=207-i*14,y=parkHeight(x,z);haniwa(B,'guardWalk',x,y,z,far?1.6:1.65,side*.10,far);guards.push([x,y,z]);}
    const plants=[],TR=G.rng(72417);
    for(let i=0;i<480;i++) {
      const x=(TR()-.5)*285,z=-292+TR()*491,r=ringRatio(x,z);
      if(r>.93||r<.14||Math.abs(x)<15||plants.some(t=>Math.hypot(t[0]-x,t[1]-z)<17))continue;
      const s=1.4+TR()*.7;tree(B,x,z,s,far,1300+i);plants.push([x,z,s]);
    }
    if(!far) {
      const service=B.get('service','Metal');
      for(const x of[-40,40])for(let z=318;z<618;z+=56) {
        service.box(x,10,z,.7,11,.7,C.metal);service.box(x,21,z,6,.55,2,C.pale);
        B.get('streetLights','Window').box(x,20.8,z,4,.2,1.3,C.window);
      }
      for(const side of[-1,1])for(let z=318;z<600;z+=39) {
        service.box(side*39,10,z,5,1.8,2.2,C.metal);
        for(let k=0;k<5;k++)service.box(side*39-2+k,11.9,z,.65,.12,2.2,C.curb);
      }
      // Sparse non-character spirits underline scale without implying an AI crowd system.
      const spirit=B.get('inhabitants','Spirit','spirits','keiki','effects');
      for(let i=0;i<17;i++){const x=(i%2?-1:1)*(22+(i%3)*3),z=306+i*16;oval(spirit,x,13,z,.8,2.2,.8,C.spirit,8,5);}
    }
    return B.finish({towers:towers.length,buildingSites:towers,trees:plants.length,guardSites:guards,roadSamples:samples,keyhole:edge,parkHistoricalMode:true,fullGardenInterior:false});
  }
  function stair(B,x,z,steps=16) {
    const g=B.get('stairs','Stone');
    for(let i=0;i<steps;i++)g.box(x,0,z-i*2,13,(i+1)*1.5,2.05,C.pale);
    const rails=B.get('stairs','Metal');
    for(const side of[-1,1]){for(let i=0;i<steps;i+=3)rails.box(x+side*6.1,(i+1)*1.5,z-i*2,.4,3.3,.4,C.metal);rails.tube([x+side*6.1,4.8,z],[x+side*6.1,steps*1.5+3.3,z-(steps-1)*2],.18,C.metal,5);}
  }
  function buildCore(far=false) {
    const B=bank('primate_core',far),floor=B.get('foundation','Concrete');
    floor.box(0,-8,-64,276,8,356,C.concrete);
    const tiles=B.get('floor','Stone');
    tiles.box(0,0,-66,250,.7,312,C.floor);
    for(const x of[-73,73])tiles.box(x,.7,-65,35,1.1,270,C.pale);
    const wall=B.get('shell','Concrete','back');wall.box(0,0,-224,270,68,6,C.pale);
    for(const side of[-1,1])B.get('shell','Concrete',side<0?'left':'right').box(side*132,0,-65,6,68,324,C.concrete);
    const front=B.get('shell','Concrete','front');for(const x of[-80,80])front.box(x,0,98,104,68,6,C.concrete);
    front.box(0,48,98,58,20,6,C.concrete);
    const roof=B.get('shell','Concrete','roof');roof.box(0,68,-62,274,4,335,C.concrete);
    const beams=B.get('ceiling','Metal','roof');for(let z=-205;z<89;z+=48)beams.box(0,63,z,264,5,3,C.metal);
    const columns=B.get('columns','Concrete');
    for(const x of[-105,105])for(let z=-202;z<=82;z+=47) {columns.box(x,0,z,8,63,8,C.pale);columns.box(x,1,z,11,3,11,C.jade);columns.box(x,48,z,12,5,12,C.jade);}
    // Raised side galleries, with stairs that terminate flush at the gallery edge.
    const gallery=B.get('gallery','Metal');
    for(const side of[-1,1]) {
      gallery.box(side*112,23,-90,29,1.2,265,C.jade);
      rail(B,'gallery',[side*97,-221],[side*97,25],24.2);
      stair(B,side*112,73);
    }
    // Circuit paths are explicit narrow inlays; not a full-screen noise texture.
    const circuit=B.get('inlay','Circuit','tech','keiki','effects');
    for(let lane=0;lane<9;lane++)for(const side of[-1,1]) {
      const x=side*(13+lane*8.8),zz=-194+lane*12;
      const pts=[[x,.83,87],[x,.83,zz+20],[x+side*7,.83,zz+13],[x+side*7,.83,-215]];
      for(let i=0;i<pts.length-1;i++)line(circuit,pts[i],pts[i+1],.24+lane%2*.15,lane%3?C.trace:C.cyan);
      circuit.cone(x,.84,zz+26,1.15,1.15,.08,C.trace,10);
    }
    const screens=B.get('panels','Display','tech','keiki','effects');
    const metal=B.get('panels','Metal');
    for(const side of[-1,1])for(let i=0;i<5;i++) {
      const z=53-i*51,x=side*127;
      metal.box(x,9,z,2.8,27,29,C.metal);screens.box(x-side*1.5,12,z,.14,20,24,C.cyan);
      if(!far)for(let j=0;j<5;j++)for(let k=0;k<3;k++) {
        const col=(j+k+i)%3===0?C.trace:C.jade;
        B.get('panelRelief','Circuit','tech','keiki','effects').box(x-side*1.62,14+j*3.2,z-7.2+k*7,.14,1.5,4.3,col);
      }
    }
    const dais=B.get('dais','Stone');
    dais.box(0,.7,-186,93,2.4,58,C.jade);dais.box(0,3.1,-190,80,2.4,47,C.pale);
    for(let i=0;i<4;i++)dais.box(0,.7,-150-i*2,38,(i+1)*1.2,2.1,C.pale);
    const backdrop=B.get('central','Metal');backdrop.box(0,5.5,-211,72,43,4.2,C.metal);
    screens.box(0,9,-208.8,66,35,.20,C.jade);
    // Nested rectangular relief echoes electrical heritage, not a branded computer UI.
    for(let k=0;k<6;k++) {
      const w=57-k*7,h=28-k*3.8,y=26.5;
      circuit.box(0,y-h/2,-208.6,w,.45,.18,k%2?C.cyan:C.trace);circuit.box(0,y+h/2,-208.6,w,.45,.18,k%2?C.cyan:C.trace);
      for(const side of[-1,1])circuit.box(side*w/2,y-h/2,-208.6,.45,h,.18,k%2?C.cyan:C.trace);
    }
    for(const x of[-27,27])haniwa(B,'coreGuard',x,5.5,-179,2.6,0,far);
    if(!far) {
      for(const x of[-38,38])for(let z=49;z>-100;z-=44)haniwa(B,'coreGuard',x,.7,z,1.8,0,false);
      const work=B.get('workshop','Clay');
      for(const z of[-121,-157]) {
        work.box(-77,.7,z,26,1.2,12,C.jade);
        for(const x of[-87,-67])for(const dz of[-4,4])work.box(x,1.9,z+dz,1.2,6.6,1.2,C.metal);
        work.box(-77,8.5,z,27,1.2,13,C.pale);
        for(let j=0;j<4;j++)haniwa(B,'workshop',-86+j*6,9.7,z,.86,j*.24,false);
        for(let j=0;j<4;j++)work.box(-82+j*3,9.7,z+4.3,.34,.20,2.6,C.rust);
      }
      for(const z of[-128,-160]) {
        const rack=B.get('workshop','Metal');
        for(const x of[-122,-108])rack.box(x,.7,z,1,18,1,C.metal);
        for(const y of[1.4,7.6,13.8]) {rack.box(-115,y,z,16,.8,15,C.pale);for(const dz of[-4,2])work.cone(-115,y+.8,z+dz,2.2,1.7,3.1,C.clay,12);}
      }
      const spirit=B.get('coreSpirits','Spirit','spirits','keiki','effects');
      for(let i=0;i<9;i++)oval(spirit,54+(i%3)*9,4,-44-Math.floor(i/3)*15,.9,2.8,.9,C.spirit,8,5);
    }
    return B.finish({fullGardenInterior:false,unmeasuredInterior:true,walkableCollision:false,roomBounds:[-135,-8,-227,135,72,102]});
  }
  Object.assign(G,{ANIMAL:{version:'0.24.0',views,locations,regions,spaces:regions,keyhole:edge,parkHeight,ringRatio},
    buildAnimalCity:buildCity,buildPrimateCore:buildCore,buildAnimalOverviews:()=>[buildCity(true),buildCore(true)]});
  const previous=G.buildRegion;
  G.buildRegion=async function(data,id,legacy) {
    const t=performance.now(),p=id==='animal'?buildCity():id==='primate_core'?buildCore():null;
    if(!p)return previous(data,id,legacy);p.builtMs=performance.now()-t;return p;
  };
})(globalThis.GA);
