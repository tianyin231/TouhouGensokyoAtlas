/* Heaven / Bhavaagra and Genkumoumi, TH105 with a separate TH155 view.
 * Source relations do not establish a metre-accurate route above the surface.
 * All geometry, elevations, pavilion and back faces are original P interpretations. */
(function (G) {
  'use strict';
  const TAU = Math.PI * 2;
  const C = Object.fromEntries(Object.entries({
    turf:'#88a894', turfLight:'#abc1a0', soil:'#8c9c94', cliff:'#80929b', ledge:'#bac7c9',
    stone:'#c5cabe', pale:'#e7e4cd', paving:'#bdc7b3', dark:'#384b56', wood:'#775b56',
    red:'#96675d', tile:'#497b89', edge:'#8eb8b7', brass:'#c4b286', leaf:'#719f83',
    leafLight:'#9eba8b', bark:'#6f6259', peach:'#e6b0a0', seam:'#bf8c81', pink:'#e9c4d4',
    yellow:'#e2d9aa', white:'#e8eade', rope:'#d3c6a6', violet:'#b5aacb', rock:'#747d95'
  }).map(([k,v]) => [k,G.rgb(v)]));
  const views = {
    heavenOverview:{label:'天界 · 云上桃源',eye:[395,225,565],target:[-4,54,0],fov:44},
    bhavaMeadow:{label:'有顶天 · 花原与浮山',eye:[30,85,184],target:[22,75,-20],fov:54},
    heavenPeaches:{label:'有顶天 · 仙桃林径',eye:[156,104,146],target:[89,80,33],fov:51},
    heavenPavilion:{label:'天界 · 临云小亭',eye:[-45,112,70],target:[-107,79,-25],fov:46},
    heavenVeranda:{label:'天界 · 亭中望云',eye:[-117,75,-35],target:[-87,66,25],fov:64,heavenInterior:true},
    heavenKeystone:{label:'有顶天 · 要石',eye:[127,93,-38],target:[80,73,-81],fov:47},
    heavenRear:{label:'天界 · 北侧桃坡',eye:[-228,132,-178],target:[-101,72,-20],fov:49},
    heavenUnderside:{label:'天界 · 云间岩基',eye:[399,-10,237],target:[0,7,4],fov:48},
    heavenBanquet:{label:'有顶天 · 桃林宴席',eye:[-8,94,114],target:[-53,67,48],fov:47,heavenBanquet:true},
    heavenAurora:{label:'天界 · 极光与浮石',eye:[201,113,211],target:[-38,145,-295],fov:60,heavenEdition:'th155',era:'TH155天界舞台意象／共享P展示台地，不是同一时刻'},
    cloudOverview:{label:'玄云海 · 群云之隙',region:'genkumoumi',space:'genkumoumi',eye:[291,137,334],target:[-4,12,-18],fov:48},
    cloudLedge:{label:'玄云海 · 山顶岩台',region:'genkumoumi',space:'genkumoumi',eye:[63,63,153],target:[-26,26,-40],fov:53},
    cloudScarlet:{label:'玄云海 · 绯云征兆',region:'genkumoumi',space:'genkumoumi',eye:[63,63,153],target:[-26,26,-40],fov:53,heavenScarlet:true,era:'TH105绯色云层事件示意；不改变地表天气'},
    cloudAscent:{label:'玄云海 · 仰望云隙',region:'genkumoumi',space:'genkumoumi',eye:[-83,44,-12],target:[34,135,-144],fov:59}
  };
  for (const v of Object.values(views)) {
    v.region ||= 'heaven'; v.space ||= 'heaven';
    v.era ||= 'TH105天界／玄云海选景；建筑与路线为P';
  }
  const locations={unkai:'cloudOverview',heaven:'heavenOverview',bhava:'bhavaMeadow'};
  Object.assign(G.PRESETS,views); Object.assign(G.IMPLEMENTED,locations);
  const regions=['heaven','genkumoumi'];
  for (const [id,name,center] of [['heaven','天界 · 有顶天',[0,65,0]],['genkumoumi','玄云海 · 山顶云隙',[0,23,0]]]) {
    const b={id,name,center,space:id,poly:[],independent:true,bottom:-240,step:12};
    G.DIORAMA.blocks.push(b); G.DIORAMA.map.set(id,b); G.REGION_LABELS[id]=name;
  }
  for(const key of ['transform','point','inverse']) {
    const old=G.DIORAMA[key];
    G.DIORAMA[key]=key==='transform'
      ? ((id,...args)=>regions.includes(id)?{scale:1,offset:[0,0,0]}:old(id,...args))
      : ((p,id,...args)=>regions.includes(id)?[...p]:old(p,id,...args));
  }
  // World totals are navigation selections, not a claim that every heavenly layer exists.
  G.LANDMARKS?.partial.add('heaven');
  function height(x,z) {
    const natural=65+5*Math.sin(x/84)*Math.cos(z/103)+5*Math.exp(-((x-105)**2+(z+67)**2)/11000);
    return G.mix(natural,65,1-G.smooth(27,46,Math.hypot(x+110,z+25)));
  }
  function bank(id,far) {
    const batches=new Map();
    function get(zone,mat='Stone',part='base',edition='both',group='architecture') {
      const key=[zone,mat,part,edition].join(':');
      if(!batches.has(key))batches.set(key,{g:new G.Geometry(),zone,mat,part,edition,group});
      return batches.get(key).g.place();
    }
    return {get,finish(extra={}) {
      const meshes=[];
      for(const [key,b] of batches)if(b.g.a.length)meshes.push(b.g.mesh(`${id}:${far?'far':'detail'}:${key}`,b.group,{
        owner:id,region:id,space:id,overview:far,material:'heaven'+b.mat,
        heavenZone:b.zone,heavenPart:b.part,heavenEdition:b.edition,basis:'P',
        shadowCaster:!['land','cliffs','horizon','clouds','aurora'].includes(b.zone)
      }));
      return {id,meshes,signs:[],bytes:meshes.reduce((s,m)=>s+m.vertices.byteLength,0),
        meta:{version:'0.22.0',surfaceCut:false,fullRealm:false,overview:far,...extra}};
    }};
  }
  function oval(g,x,y,z,rx,ry,rz,col,n=10,rings=5,soft=false) {
    const p=(i,j)=>{const a=i*TAU/n,b=j*Math.PI/rings;return [x+rx*Math.sin(b)*Math.cos(a),y+ry*Math.cos(b),z+rz*Math.sin(b)*Math.sin(a)];};
    const tri=(a,b,c)=>{if(!soft)return g.tri(a,b,c,col);for(const v of [a,b,c])g.vertex(v,G.norm([(v[0]-x)/(rx*rx),(v[1]-y)/(ry*ry),(v[2]-z)/(rz*rz)]),col);};
    for(let j=0;j<rings;j++)for(let i=0;i<n;i++) {
      if(!j)tri(p(i,0),p(i+1,1),p(i,1));
      else if(j===rings-1)tri(p(i,j),p(i+1,j),p(i,rings));
      else{tri(p(i,j),p(i+1,j),p(i+1,j+1));tri(p(i,j),p(i+1,j+1),p(i,j+1));}
    }
  }
  function poly(g,x,y,z,r,h,n,col,r1=r) {
    for(let i=0;i<n;i++) {
      const a=i*TAU/n,b=(i+1)*TAU/n;
      const p=(a,R,Y)=>[x+Math.cos(a)*R,Y,z+Math.sin(a)*R];
      g.quad(p(a,r,y),p(a,r1,y+h),p(b,r1,y+h),p(b,r,y),col);
      g.tri([x,y+h,z],p(b,r1,y+h),p(a,r1,y+h),col);
      g.tri([x,y,z],p(a,r,y),p(b,r,y),col);
    }
  }
  // Radial mesh with one non-degenerate centre fan; a closed cliff mass below it.
  function land(B,far,cloud=false) {
    const g=B.get('land',cloud?'Rock':'Turf','base','both','terrain'),rock=B.get('cliffs','Rock','base','both','terrain');
    const n=far?36:96,k=far?7:28,rx=cloud?172:265,rz=cloud?219:200;
    const radius=a=>1+.085*Math.sin(3*a+.6)+.05*Math.cos(5*a-.3);
    const H=(x,z)=>cloud?22+8*Math.sin(x/85)*Math.cos(z/113)+8*Math.exp(-((x+70)**2+(z+125)**2)/7800):height(x,z);
    const p=(i,j)=>{const a=i*TAU/n,r=j/k*radius(a),x=Math.cos(a)*rx*r,z=Math.sin(a)*rz*r;return [x,H(x,z),z];};
    function tri(a,b,c) {
      const normal=G.norm(G.cross(G.sub(b,a),G.sub(c,a)));
      for(const v of [a,b,c]) {
        const t=G.clamp(.5+.25*Math.sin(v[0]/57)+.16*Math.cos(v[2]/44),0,1);
        g.vertex(v,normal,cloud?G.blend(C.rock,C.cliff,t):G.blend(C.turf,C.turfLight,t*.44));
      }
    }
    for(let i=0;i<n;i++)tri([0,H(0,0),0],p(i+1,1),p(i,1));
    for(let j=1;j<k;j++)for(let i=0;i<n;i++){tri(p(i,j),p(i+1,j),p(i+1,j+1));tri(p(i,j),p(i+1,j+1),p(i,j+1));}
    for(let i=0;i<n;i++) {
      const a=p(i,k),b=p(i+1,k);
      const ring=(v,t)=>{const a=Math.atan2(v[2]/rz,v[0]/rx),fold=Math.sin(a*13+.7)*.035+Math.cos(a*19)*.017;const r=t===0?1:1-.28*t+fold*Math.sin(t*Math.PI);return[v[0]*r+Math.sin(a*3)*9*t,H(v[0],v[2])-(cloud?290:130)*t+(t===0?0:Math.sin(a*7)*6*t),v[2]*(r-.06*t)];};
      for(let j=0;j<5;j++){const u=j/5,v=(j+1)/5;rock.quad(ring(a,u),ring(a,v),ring(b,v),ring(b,u),G.blend(C.cliff,C.dark,v*.45));}
      rock.tri([0,cloud?-270:-125,0],ring(b,1),ring(a,1),C.dark);
    }
    return H;
  }
  // Multi-ridge stone masses, not repeated cones: connected peaks, shoulders and crags.
  function mountain(B,x,z,y,s,seed,far) {
    const R=G.rng(seed),g=B.get('horizon','Rock','base','both','terrain');
    const n=far?12:24,k=far?4:9,rx=s*(1.35+R()*.55),rz=s*(.86+R()*.50),angle=R()*TAU;
    const shift=.14+R()*.17,peak=1.25+R()*.60;
    const H=(u,v)=>y+s*(.26+peak*Math.exp(-((u+shift)**2*2.6+v*v*2.1)*2.1)+.85*Math.exp(-((u-.60)**2*7+(v+.13)**2*5))+.28*Math.exp(-((u+.7)**2*9+(v-.29)**2*8)));
    const perimeter=a=>1+.09*Math.sin(a*3+seed)+.06*Math.cos(a*7);
    const pt=(i,j)=>{const a=i*TAU/n,r=j/k*perimeter(a),u=Math.cos(a)*r,v=Math.sin(a)*r;return[x+(Math.cos(angle)*u*rx+Math.sin(angle)*v*rz),H(u,v),z+(-Math.sin(angle)*u*rx+Math.cos(angle)*v*rz)];};
    const tri=(a,b,c)=>{const normal=G.norm(G.cross(G.sub(b,a),G.sub(c,a))),h=(a[1]+b[1]+c[1])/3;
      const col=G.blend(C.cliff,C.ledge,G.clamp((h-y)/s*.25,0,.42));for(const v of [a,b,c])g.vertex(v,normal,col);};
    for(let i=0;i<n;i++)tri([x,H(0,0),z],pt(i+1,1),pt(i,1));
    for(let j=1;j<k;j++)for(let i=0;i<n;i++){tri(pt(i,j),pt(i+1,j),pt(i+1,j+1));tri(pt(i,j),pt(i+1,j+1),pt(i,j+1));}
    const low=(p,t)=>[x+(p[0]-x)*(1-.48*t)+s*.10*t,y-s*(.25+t*1.1),z+(p[2]-z)*(1-.43*t)];
    for(let i=0;i<n;i++){let a=pt(i,k),b=pt(i+1,k),c=low(a,.2),d=low(b,.2),e=low(a,1),f=low(b,1);
      g.quad(a,c,d,b,C.cliff);g.quad(c,e,f,d,G.blend(C.cliff,C.dark,.22));g.tri([x,y-s*1.6,z],f,e,C.cliff);}
  }
  function cloudBank(B,far,storm=false) {
    const g=B.get('clouds','Cloud','cloud','both','effects'),R=G.rng(storm?10519:10506);
    const count=far?26:56;
    for(let i=0;i<count;i++) {
      const distant=i<8,a=(distant?i/8:(i-8)/(count-8))*TAU,r=distant?1550:(storm?260+R()*530:370+R()*710);
      const x=Math.cos(a)*r,z=Math.sin(a)*r,y=distant?-145:(storm?0:-33)+R()*(storm?45:35),w=distant?1120:140+R()*190,d=distant?800:100+R()*160;
      for(let j=0;j<5;j++)for(let k=0;k<5;k++) {
        const p=(u,v)=>[x+(u-.5)*w*2,y+(distant?40:storm?42:28)*Math.sin(u*Math.PI)*Math.sin(v*Math.PI),z+(v-.5)*d*2];
        const uv=[[k/5,j/5],[k/5,(j+1)/5],[(k+1)/5,(j+1)/5],[(k+1)/5,j/5]];
        for(const t of [[0,1,2],[0,2,3]])for(const ix of t){const[u,v]=uv[ix];g.vertex(p(u,v),[0,1,0],[u,v,(i%7)/7]);}
      }
    }
  }
  function aurora(B,far) {
    const g=B.get('aurora','Aurora','aurora','both','effects');
    for(let strip=0;strip<3;strip++) {
      const n=far?32:96;
      for(let i=0;i<n;i++) {
        const a=(-.95+i/n*2.85)*Math.PI,b=(-.95+(i+1)/n*2.85)*Math.PI;
        const p=(t,up)=>[Math.cos(t)*(1150+strip*230),140+strip*56+Math.sin(t*3.1+strip)*75+up*(285+Math.sin(t*2.3)*90),Math.sin(t)*(1000+strip*210)];
        const pts=[p(a,0),p(a,1),p(b,1),p(b,0)],uv=[[i/n,0],[i/n,1],[(i+1)/n,1],[(i+1)/n,0]];
        for(const t of [[0,1,2],[0,2,3]])for(const ix of t)g.vertex(pts[ix],[0,0,1],[uv[ix][0],uv[ix][1],strip/3]);
      }
    }
  }
  function peachTree(B,x,z,s,seed,far) {
    const R=G.rng(seed),y=height(x,z),g=B.get('peaches','Bark','plants','th105','vegetation'),le=B.get('peaches','Leaf','plants','th105','vegetation');
    const trunk=[[x,y,z],[x-.5*s,y+4*s,z],[x+.4*s,y+9*s,z+.3*s]];
    for(let i=0;i<2;i++)g.tube(trunk[i],trunk[i+1],(.8-i*.22)*s,C.bark,7,(.56-i*.19)*s);
    const n=far?3:6;
    for(let i=0;i<n;i++) {
      const a=i*TAU/n+seed*.04,dx=Math.cos(a)*4.2*s,dz=Math.sin(a)*4*s,yy=y+(9+R()*2)*s;
      if(!far)g.tube([x,y+5*s,z],[x+dx,yy,z+dz],.27*s,C.bark,6,.10*s);
      oval(le,x+dx,yy,z+dz,4.4*s,3.15*s,3.9*s,i%2?C.leaf:C.leafLight,far?6:10,far?3:5,true);
      if(!far){
        const fr=B.get('peaches','Fruit','plants','th105','vegetation');
        const px=x+dx*.95,pz=z+dz+2.9*s,py=yy-2.4*s;
        oval(fr,px,py,pz,.78*s,.83*s,.70*s,C.peach,8,5,true);
        for(let k=0;k<7;k++) {const a=k/7*Math.PI,b=(k+1)/7*Math.PI;
          g.tube([px,py+Math.cos(a)*.84*s,pz+Math.sin(a)*.71*s],[px,py+Math.cos(b)*.84*s,pz+Math.sin(b)*.71*s],.024*s,C.seam,3);
        }
        le.tri([px,py+.80*s,pz],[px+1.55*s,py+1.14*s,pz+.28*s],[px+.72*s,py+1.3*s,pz-.36*s],C.leaf);
      }
    }
  }
  function buildHeaven(far=false) {
    const B=bank('heaven',far);land(B,far);cloudBank(B,far);aurora(B,far);
    const R=G.rng(105220),routes=[];
    function trail(control,width) {
      const points=G.spline(control,5);
      const g=B.get('paths','Paving','base','th105');
      for(let i=0;i<points.length-1;i++) {
        const[a,b]=[points[i],points[i+1]],length=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.ceil(length/4),dx=(b[1]-a[1])/length*width,dz=-(b[0]-a[0])/length*width;
        for(let j=0;j<n;j++){
          const p=(t,side)=>{const x=G.mix(a[0],b[0],t)+side*dx,z=G.mix(a[1],b[1],t)+side*dz;return[x,height(x,z)+.13,z];};
          g.quad(p(j/n,-1),p((j+1)/n,-1),p((j+1)/n,1),p(j/n,1),C.paving);
        }
      }
      routes.push(points);
    }
    trail([[0,173],[8,115],[17,78],[6,38],[-38,13],[-109,14]],3.2);
    trail([[17,78],[65,77],[111,48],[119,1],[103,-44],[80,-65]],2.7);
    trail([[6,38],[10,-28],[44,-60],[80,-65]],2.5);
    // Small open pavilion: P scenic architecture, not an assigned celestial palace.
    const x=-110,z=-25,floor=68;
    const s=B.get('pavilion','Stone','structure','th105'),w=B.get('pavilion','Wood','structure','th105');
    poly(s,x,64,z,24,2,8,C.stone);poly(s,x,66,z,22,2,8,C.pale);
    for(let i=0;i<4;i++)s.box(x,64,z+27-i*1.5,10,(i+1),1.55,C.stone);
    poly(w,x,68,z,18,.25,8,C.wood);
    for(let i=0;i<8;i++) {
      const a=i*TAU/8+Math.PI/8,b=(i+1)*TAU/8+Math.PI/8,px=x+Math.cos(a)*17,pz=z+Math.sin(a)*17;
      poly(s,px,floor,pz,1.1,.8,8,C.pale);w.tube([px,floor+.8,pz],[px,85,pz],.52,C.red,8);
      w.tube([px,84,pz],[x+Math.cos(b)*17,84,z+Math.sin(b)*17],.6,C.wood,6);
      w.tube([px,82,pz],[x+Math.cos(a)*12,86,z+Math.sin(a)*12],.42,C.red,6);
      // Leave the south entrance fully open.
      if(i!==1){for(const dy of[.7,3])w.tube([x+Math.cos(a)*21,floor+dy,z+Math.sin(a)*21],[x+Math.cos(b)*21,floor+dy,z+Math.sin(b)*21],.25,C.wood,5);}
    }
    const roof=B.get('pavilion','Tile','roof','th105'),edge=B.get('pavilion','Metal','roof','th105');
    const rings=[[28,85],[24,84],[14,91],[4,97]];
    const rp=(i,j)=>{const a=i*TAU/8+Math.PI/8,[r,y]=rings[j];return [x+Math.cos(a)*r,y,z+Math.sin(a)*r];};
    for(let i=0;i<8;i++) {
      for(let j=0;j<rings.length-1;j++) {
        roof.quad(rp(i,j),rp(i,j+1),rp(i+1,j+1),rp(i+1,j),C.tile);
        edge.tube(rp(i,j),rp(i,j+1),.21,C.edge,6);
        if(!far)for(let k=1;k<=5;k++){
          const lerp=(a,b,t)=>a.map((v,i)=>G.mix(v,b[i],t));
          edge.tube(lerp(rp(i,j),rp(i+1,j),k/6),lerp(rp(i,j+1),rp(i+1,j+1),k/6),.07,C.edge,4);
        }
      }
      roof.tri([x,100,z],rp(i+1,3),rp(i,3),C.tile);
      const a=rp(i,0),b=rp(i+1,0);roof.quad(a,b,[b[0],b[1]-.7,b[2]],[a[0],a[1]-.7,a[2]],C.dark);
      edge.tube(a,b,.32,C.edge,6);
      if(!far)for(let k=0;k<4;k++)w.tube([x+Math.cos(i*TAU/8+k*.13)*17,83,z+Math.sin(i*TAU/8+k*.13)*17],[x+Math.cos(i*TAU/8+k*.13)*25,84,z+Math.sin(i*TAU/8+k*.13)*25],.18,C.wood,4);
    }
    poly(edge,x,99.5,z,.7,2.8,8,C.brass,.18);
    // Low table, Go board and tea service stay inside the open structure.
    if(!far) {
      const props=B.get('pavilion','Wood','props','th105');props.box(x,68.3,z,10,2.3,6,C.wood);props.box(x,70.6,z,11,.5,7,C.pale);
      for(let j=0;j<19;j++){props.box(x-2+j*4/18,71.13,z, .018,.035,4,C.dark);props.box(x,71.13,z-2+j*4/18,4,.035,.018,C.dark);}
      for(let j=0;j<8;j++)oval(props,x-1.55+(j%4)*.45,71.2,z-1.3+Math.floor(j/4)*.65,.16,.075,.16,j%2?C.dark:C.white,6,3);
      for(const dx of[-4,4]){poly(s,x+dx,71.1,z,.6,.7,10,C.pale);props.box(x+dx,68.3,z+6,4.5,.8,3,C.red);}
    }
    const key=B.get('keystone','Stone');const ky=height(80,-81);
    oval(key,80,ky+3.6,-81,10,5,7,C.stone,12,6);
    const rope=B.get('keystone','Rope');
    for(let i=0;i<48;i++){const a=i*TAU/48,b=(i+1)*TAU/48;rope.tube([80+Math.cos(a)*9.4,ky+3.4+Math.sin(a)*.25,-81+Math.sin(a)*6.5],[80+Math.cos(b)*9.4,ky+3.4+Math.sin(b)*.25,-81+Math.sin(b)*6.5],.3,C.rope,5);}
    for(const dx of[-5,-1,3,7]){const paper=B.get('keystone','Paper');paper.quad([80+dx,ky+3.3,-74.9],[80+dx+1,ky+3.3,-74.9],[80+dx,ky+1.7,-74.7],[80+dx-1,ky+1.7,-74.7],C.white);}
    // Organised orchard rather than an evenly scattered forest; reserve all routes.
    const nearPath=(x,z)=>routes.some(ps=>ps.slice(1).some((b,i)=>{const a=ps[i],dx=b[0]-a[0],dz=b[1]-a[1],t=G.clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz),0,1);return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz)<13;}));
    const onLand=(x,z)=>{const a=Math.atan2(z/200,x/265);return Math.hypot(x/265,z/200)<(1+.085*Math.sin(3*a+.6)+.05*Math.cos(5*a-.3))*.90;};
    const treeSites=[];
    for(let j=0;j<5;j++)for(let i=0;i<7;i++){
      const xx=-200+i*58+(j%2)*12,zz=-125+j*57;
      if(!onLand(xx,zz)||nearPath(xx,zz)||Math.hypot(xx+110,zz+25)<47||Math.hypot(xx-80,zz+81)<27)continue;
      treeSites.push([xx,zz]);peachTree(B,xx,zz,1.3+R()*.3,105000+j*7+i,far);
    }
    for(const [xx,zz]of [[36,138],[171,83],[184,28],[152,-73],[-172,76],[-168,-97]]){treeSites.push([xx,zz]);peachTree(B,xx,zz,1.55,Math.abs(xx*zz),far);}
    const flower=B.get('flowers','Flower','plants','th105','vegetation'),stem=B.get('flowers','Leaf','plants','th105','vegetation');
    if(!far)for(let i=0;i<750;i++){
      const xx=(R()-.5)*410,zz=(R()-.5)*304;
      if(!onLand(xx,zz)||nearPath(xx,zz)||Math.hypot(xx+110,zz+25)<32||Math.hypot(xx-80,zz+81)<20)continue;
      const yy=height(xx,zz),h=.45+R()*.6;
      stem.tube([xx,yy,zz],[xx,yy+h,zz],.045,C.leaf,3);
      const col=[C.pink,C.white,C.yellow,C.violet][i%4];
      for(let j=0;j<5;j++){const a=j*TAU/5,b=(j+1)*TAU/5;flower.tri([xx,yy+h,zz],[xx+Math.cos(a)*.45,yy+h+.15,zz+Math.sin(a)*.45],[xx+Math.cos(b)*.45,yy+h+.15,zz+Math.sin(b)*.45],col);}
    }
    // Banquet is a P arrangement, explicitly isolated from the baseline orchard.
    if(!far)for(const xx of[-74,-48,-22]){
      const yy=height(xx,52),g=B.get('banquet','Wood','banquet','th105');
      g.box(xx,yy+.2,52,13,2.4,7,C.wood);g.box(xx,yy+2.6,52,14,.5,8,C.pale);
      for(const dz of[-7,7])g.box(xx,yy+.1,52+dz,11,1,3,C.red);
      for(const dx of[-4,0,4]){oval(g,xx+dx,yy+3.4,52,.9,.65,.8,C.peach,8,4);}
    }
    // TH155 selected rocky-state elements, never overlaid with peach pavilion props.
    const broken=B.get('fractures','Rock','fracture','th155');
    for(let i=0;i<(far?9:22);i++){
      const a=i*TAU/22,rr=110+(i%4)*21,xx=Math.cos(a)*rr,zz=Math.sin(a)*rr,yy=80+(i%5)*8;
      const RR=G.rng(5155+i),n=7,rad=5+(i%4)*2.3,tilt=RR()*2-1;const ring=Array.from({length:n},(_,k)=>{const t=k*TAU/n+i*.77,r=rad*(.67+RR()*.37);return[xx+Math.cos(t)*r,yy+Math.sin(t)*rad*.17,zz+Math.sin(t)*r*.70];});
      const up=ring.map((p,k)=>[xx+(p[0]-xx)*.61+tilt*3,yy+rad*(.47+.23*Math.sin(k*1.8)),zz+(p[2]-zz)*.74]);
      for(let k=0;k<n;k++){const j=(k+1)%n;broken.quad(ring[k],up[k],up[j],ring[j],G.blend(C.rock,C.cliff,.35));broken.tri([xx+tilt*3,yy+rad*.85,zz],up[j],up[k],C.cliff);broken.tri([xx,yy-rad*.49,zz],ring[k],ring[j],C.rock);}
    }
    for(let i=0;i<16;i++){const a=i*TAU/16,r=700+(i%3)*235;mountain(B,Math.cos(a)*r,Math.sin(a)*r,-55+(i%3)*38,42+(i%5)*13,i+931,far);}
    return B.finish({locations:['heaven','bhava'],treeCount:treeSites.length,treeSites,routes,editions:['th105','th155'],defaultEdition:'th105'});
  }
  function buildCloudSea(far=false) {
    const B=bank('genkumoumi',far),H=land(B,far,true);cloudBank(B,far,true);
    const rock=B.get('summit','Rock');
    const clusters=[[-107,71,23,11,19],[-124,49,30,17,24],[-101,-61,26,25,19],[-91,-96,32,31,31],[110,39,23,19,22],[100,-20,19,23,31],[88,-94,27,32,39],[50,-149,20,27,29],[-44,-144,28,29,35]];
    // Interlocking ledges with fracture planes, not a ring of identical oval stones.
    clusters.forEach(([x,z,rx,h,rz],index)=>{const y=H(x,z),R=G.rng(770+index),n=far?6:9;
      const outline=Array.from({length:n},(_,i)=>{const a=i*TAU/n,r=.76+R()*.27;return [x+Math.cos(a)*rx*r,y-.7,z+Math.sin(a)*rz*r];});
      const upper=outline.map((p,i)=>[x+(p[0]-x)*.80-h*.14,y+h*(.56+.22*Math.sin(i*1.7+index))+.3,z+(p[2]-z)*.73]);
      const top=[x-h*.1,y+h*.83,z-2];const col=G.blend(C.cliff,C.rock,.25+(index%3)*.12);
      for(let i=0;i<n;i++){const j=(i+1)%n;rock.quad(outline[i],upper[i],upper[j],outline[j],col);rock.tri(top,upper[j],upper[i],G.blend(col,C.ledge,.14));rock.tri([x,y-1,z],outline[i],outline[j],col);}
    });
    for(let i=0;i<13;i++){const a=i*TAU/13,r=410+(i%3)*125;mountain(B,Math.cos(a)*r,Math.sin(a)*r,-99,40+(i%4)*17,i+481,far);}
    if(!far){const crack=B.get('summit','Stone');const paths=[[[-60,22],[-31,11],[-17,-8],[4,-18],[7,-39]],[[92,47],[65,32],[56,16]],[[14,128],[-4,106],[-10,82],[-30,72]]];
      for(const ps of paths)for(let i=0;i<ps.length-1;i++){const[a,b]=[ps[i],ps[i+1]],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),ox=dz/len*.10,oz=-dx/len*.10;
        const pt=(v,sign)=>[v[0]+sign*ox,H(v[0]+sign*ox,v[1]+sign*oz)+.08,v[1]+sign*oz];crack.quad(pt(a,-1),pt(b,-1),pt(b,1),pt(a,1),G.blend(C.rock,C.dark,.35));}
    }
    return B.finish({locations:['unkai'],permanentPortal:false,officialHeight:null});
  }
  Object.assign(G,{HEAVEN:{version:'0.22.0',views,locations,regions,spaces:regions,height,fullRealm:false},buildHeaven,buildCloudSea,buildHeavenOverviews:()=>[buildHeaven(true),buildCloudSea(true)]});
  const previous=G.buildRegion;
  G.buildRegion=async function(data,id,legacy){const start=performance.now(),p=id==='heaven'?buildHeaven():id==='genkumoumi'?buildCloudSea():null;if(p){p.builtMs=performance.now()-start;return p;}return previous(data,id,legacy);};
})(globalThis.GA);
