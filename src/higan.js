/* v0.23: Road of Liminality, Sai no Kawara, Sanzu and Higan.
 * PMiSS / TH17 constrain identity and atmosphere, not these engineering coordinates.
 * Two exhibition charts avoid giving the variable-width Sanzu a measured crossing.
 * All geometry, stall layouts, landing structures and checkpoint architecture are P. */
(function (G) {
  'use strict';
  const TAU=Math.PI*2;
  const C=Object.fromEntries(Object.entries({
    sand:'#aba493', wet:'#747e7a', rock:'#89928b', rockLight:'#b0b5a7', moss:'#667e62',
    grass:'#83947a', pale:'#d6d1b7', path:'#c6b99a', wood:'#79614c', woodDark:'#443c39',
    beam:'#ac8a61', indigo:'#495c76', canvas:'#d2c4a3', terracotta:'#9c6158', tile:'#526472',
    trim:'#89979a', paper:'#f3dbad', metal:'#636a6e', red:'#ae404c', rose:'#d86868',
    gold:'#d6b380', green:'#629085', stem:'#617658', white:'#e4dbbc', spirit:'#b2cfd1',
    water:'#416e7b', tablet:'#a39277', bark:'#655f53', leaf:'#82957b'
  }).map(([k,v])=>[k,G.rgb(v)]));
  const views={
    liminalOverview:{label:'中有之道 · 灯市至河原',eye:[132,167,193],target:[-179,17,-133],fov:47},
    liminalMarket:{label:'中有之道 · 缘日长街',eye:[-216,28,-26],target:[-231,26,-239],fov:55},
    liminalStall:{label:'中有之道 · 纸灯与摊面',eye:[-220,27,-151],target:[-243,26,-155],fov:52},
    liminalRear:{label:'中有之道 · 棚后与落脚',eye:[-319,46,-250],target:[-236,24,-154],fov:48},
    saiShore:{label:'赛之河原 · 石滩与风车',eye:[71,37,14],target:[-26,11,-91],fov:55},
    saiStones:{label:'赛之河原 · 垒石近景',eye:[12,17,-53],target:[-9,9,-76],fov:52},
    saiContest:{label:'赛之河原 · 垒石小会',eye:[12,20,-46],target:[-11,11,-81],fov:56,higanContest:true},
    sanzuLanding:{label:'三途河 · 木舟渡口',eye:[109,25,214],target:[45,5,160],fov:51},
    sanzuBoat:{label:'三途河 · 舟板与缆绳',eye:[79,12,185],target:[55,3,163],fov:52},
    sanzuMist:{label:'三途河 · 雾里尖石',eye:[340,32,27],target:[591,20,-170],fov:57},
    higanOverview:{label:'彼岸 · 柔光花原',region:'higan',space:'higan',eye:[373,128,390],target:[15,24,7],fov:51},
    higanFlowers:{label:'彼岸 · 花径与候判',region:'higan',space:'higan',eye:[84,35,144],target:[15,27,7],fov:54},
    higanGate:{label:'彼岸 · 关口选景',region:'higan',space:'higan',eye:[75,43,-117],target:[0,34,-224],fov:50},
    higanDesk:{label:'彼岸 · 关口廊下',region:'higan',space:'higan',eye:[25,33,-206],target:[-5,34,-226],fov:60,higanInterior:true},
    higanRear:{label:'彼岸 · 关口背侧',region:'higan',space:'higan',eye:[-96,59,-321],target:[0,34,-225],fov:51},
    higanBank:{label:'彼岸 · 回望三途雾',region:'higan',space:'higan',eye:[-88,39,299],target:[11,8,463],fov:54}
  };
  for(const v of Object.values(views)){v.region||='shigan';v.space||='shigan';v.era||='求闻史纪／TH17特征选集；地形与结构为P';}
  const locations={liminal:'liminalOverview',sai:'saiShore',sanzu:'sanzuLanding',higan:'higanOverview'};
  const regions=['shigan','higan'];
  Object.assign(G.PRESETS,views);Object.assign(G.IMPLEMENTED,locations);
  for(const [id,name,center] of [['shigan','此岸 · 中有之道与三途河',[-120,15,0]],['higan','彼岸 · 花原与关口',[0,24,0]]]){
    const b={id,name,space:id,center,poly:[],independent:true,bottom:-36,step:12};
    G.DIORAMA.blocks.push(b);G.DIORAMA.map.set(id,b);G.REGION_LABELS[id]=name;
  }
  for(const key of ['transform','point','inverse']){
    const old=G.DIORAMA[key];G.DIORAMA[key]=key==='transform'?
      ((id,...args)=>regions.includes(id)?{scale:1,offset:[0,0,0]}:old(id,...args)):
      ((p,id,...args)=>regions.includes(id)?p.slice():old(p,id,...args));
  }
  G.LANDMARKS?.partial.add('higan');
  const shore=z=>24+20*Math.sin(z/148)+7*Math.sin(z/57);
  const marketX=z=>-232+19*Math.sin((z+240)/110);
  function nearHeight(x,z){
    const t=G.smooth(shore(z)-125,shore(z),x);
    let h=G.mix(19+2*Math.sin(x/112)*Math.cos(z/173),.6,t);
    // The dry market street and stall foundations sit on the same graded terrace.
    const market=1-G.smooth(40,85,Math.abs(x-marketX(z)));
    h=G.mix(h,20,market*(1-G.smooth(140,190,Math.abs(z+180))));
    return h;
  }
  function farHeight(x,z){return G.mix(23+3.5*Math.sin(x/160)*Math.cos(z/183),.7,G.smooth(315,470,z));}
  const road=G.spline([[-282,-455],[-244,-327],[-221,-180],[-217,-42],[-138,44],[-59,108],[8,143],[38,152]],5);
  function bank(id,far){
    const batches=new Map();
    function get(zone,mat='Stone',part='base',group='architecture'){
      const key=[zone,mat,part].join(':');
      if(!batches.has(key))batches.set(key,{g:new G.Geometry(),zone,mat,part,group});
      return batches.get(key).g.place();
    }
    return {get,finish(extra={}){
      const meshes=[];
      for(const [key,b] of batches)if(b.g.a.length)meshes.push(b.g.mesh(`${id}:${far?'far':'detail'}:${key}`,b.group,{
        owner:id,region:id,space:id,overview:far,material:'higan'+b.mat,higanZone:b.zone,higanPart:b.part,basis:'P',
        shadowCaster:!['land','water','mist','horizon','flowersFar','fieldMass'].some(x=>b.zone.startsWith(x))
      }));
      return{id,meshes,signs:[],bytes:meshes.reduce((s,m)=>s+m.vertices.byteLength,0),meta:{version:'0.23.0',overview:far,surfaceCut:false,fullRealm:false,fixedCrossingDistance:false,...extra}};
    }};
  }
  function oval(g,x,y,z,rx,ry,rz,col,n=8,rings=4){
    const p=(i,j)=>{const a=i*TAU/n,b=j*Math.PI/rings;return[x+rx*Math.sin(b)*Math.cos(a),y+ry*Math.cos(b),z+rz*Math.sin(b)*Math.sin(a)];};
    const tri=(a,b,c)=>{for(const v of [a,b,c])g.vertex(v,G.norm([(v[0]-x)/(rx*rx),(v[1]-y)/(ry*ry),(v[2]-z)/(rz*rz)]),col);};
    for(let j=0;j<rings;j++)for(let i=0;i<n;i++){
      if(!j)tri(p(i,0),p(i+1,1),p(i,1));
      else if(j===rings-1)tri(p(i,j),p(i+1,j),p(i,rings));
      else{tri(p(i,j),p(i+1,j),p(i+1,j+1));tri(p(i,j),p(i+1,j+1),p(i,j+1));}
    }
  }
  function ribbon(g,a,b,width,col){
    const n=G.norm([b[2]-a[2],0,a[0]-b[0]]),d=G.mul(n,width/2);
    g.quad(G.sub(a,d),G.sub(b,d),G.add(b,d),G.add(a,d),col);
  }
  function rail(B,zone,a,b,y){
    const g=B.get(zone,'Wood'),n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/5);
    for(let i=0;i<=n;i++){const t=i/n;g.box(G.mix(a[0],b[0],t),y,G.mix(a[1],b[1],t),.42,2.2,.42,C.woodDark);}
    for(const dy of[.6,1.8])g.tube([a[0],y+dy,a[1]],[b[0],y+dy,b[1]],.12,C.beam,5);
  }
  function lamp(B,zone,x,y,z,size=1){
    const w=B.get(zone,'Wood'),p=B.get(zone,'Lamp');
    w.box(x,y,z,1.45*size,.20*size,1.45*size,C.woodDark);
    // All boxes must carry an explicit linear vertex color.
    for(const dx of[-.57,.57])for(const dz of[-.57,.57])w.box(x+dx*size,y,z+dz*size,.13*size,1.7*size,.13*size,C.woodDark);
    p.box(x,y+.16*size,z,size,1.35*size,size,C.paper);
    w.box(x,y+1.55*size,z,1.6*size,.23*size,1.6*size,C.woodDark);
  }
  function stall(B,x,z,side,index,far){
    const y=20,zone='market'+(index<6?'North':'South'),angle=side>0?-Math.PI/2:Math.PI/2;
    const wood=B.get(zone,'Wood').place(x,y,z,angle),roof=B.get(zone,'Cloth','awning').place(x,y,z,angle);
    const color=[C.indigo,C.canvas,C.terracotta][index%3],w=16+(index%2)*2,d=11;
    wood.box(0,0,0,w+1,.65,d+1,C.woodDark);
    for(const xx of[-w/2,w/2])for(const zz of[-d/2,d/2])wood.box(xx,.4,zz,.45,8.1,.45,C.wood);
    wood.box(0,7.7,-d/2,w+1,.55,.6,C.beam);wood.box(0,7.7,d/2,w+1,.55,.6,C.beam);
    // Raised, hollow canopy with valance, not an opaque house block.
    roof.quad([-w/2-1,7.9,-d/2-1],[-w/2-1,10,0],[w/2+1,10,0],[w/2+1,7.9,-d/2-1],color);
    roof.quad([-w/2-1,10,0],[-w/2-1,7.9,d/2+1],[w/2+1,7.9,d/2+1],[w/2+1,10,0],color);
    roof.box(0,6.9,d/2+1,w+2,1,.16,color);
    wood.box(0,.65,0,w-1,2.1,.3,C.woodDark);
    wood.box(0,2.75,d/2-1,w-.4,.4,3.4,C.beam);
    wood.box(0,.65,-d/2+.5,w-1,5.5,.26,C.woodDark);
    for(const xx of[-w*.35,w*.35])wood.box(xx,.65,d/2-1,.48,2.15,2.6,C.wood);
    const lampPositions=[];
    if(!far){
      for(const xx of[-w*.43,0,w*.43])wood.box(xx,.7,-d/2+.75,.25,5.5,.25,C.beam);
      for(const yy of[2.7,4.8])wood.box(0,yy,-d/2+1.1,w-1,.25,1.2,C.wood);
      for(const xx of[-w*.49,w*.49])wood.tube([xx,1.0,-d/2+.6],[xx,7.3,d/2-.4],.13,C.beam,5);
      for(const xx of[-w*.30,w*.30])roof.box(xx,5.8,d/2+.75,w*.24,1.0,.12,color);
    }
    if(!far){
      const items=B.get(zone,'Props','wares').place(x,y,z,angle);
      if(index%4===0){ // writing service: papers, rolled scrolls, inkstone, brush rest
        for(let k=0;k<6;k++)items.box(-5+k*1.6,3.16,d/2-.6,1.2,.07,1.8,C.paper);
        items.box(3.6,3.2,2.6,1,.15,.75,C.woodDark);
        for(let k=0;k<3;k++)items.tube([-4+k*.55,3.3,2.2],[-4+k*.55,3.35,3.5],.07,C.wood,4);
      }else if(index%4===1){ // soul-candy stall, sculpted wares rather than readable billboards
        for(let k=0;k<9;k++){
          const xx=-6+k*1.4;items.tube([xx,3.1,4],[xx,4.4,4],.065,C.beam,4);
          oval(items,xx,4.5,4,.32,.5,.26,k%2?C.paper:C.rose,6,3);
        }
      }else if(index%4===2){
        items.box(0,3.16,3.6,10,.32,2.6,C.woodDark);
        const bowl=B.get(zone,'Water','wares').place(x,y,z,angle);bowl.box(0,3.5,3.6,9.4,.10,2.1,C.water);
        for(let k=0;k<5;k++)oval(items,-3.5+k*1.7,3.6,3.5,.43,.10,.2,C.spirit,6,3);
      }else{
        for(let k=0;k<7;k++)items.box(-5+k*1.55,3.2,3.5,1,2.7,.2,C.tablet);
      }
      for(const xx of[-w*.42,w*.42]){
        lampPositions.push(wood.point([xx,6,d/2+.6]));
      }
      for(let zz=-d/2+1;zz<d/2;zz+=1.1)wood.box(0,.67,zz,w,.04,.05,C.beam);
    }
    wood.place();roof.place();for(const pos of lampPositions)lamp(B,zone,...pos,.65);
  }
  function willow(B,x,z,s,far,seed){
    const y=nearHeight(x,z),R=G.rng(seed),w=B.get('willows','Wood','plants','vegetation'),le=B.get('willows','Leaf','plants','vegetation');
    w.tube([x,y,z],[x+s,y+11*s,z],.7*s,C.bark,7,.3*s);
    for(let i=0;i<(far?3:6);i++){
      const a=i*TAU/6,dx=Math.cos(a)*5*s,dz=Math.sin(a)*5*s,yy=y+(10+R()*2)*s;
      w.tube([x+s,y+8*s,z],[x+dx,yy,z+dz],.25*s,C.bark,5,.08*s);
      oval(le,x+dx,yy-.5*s,z+dz,3.6*s,2.3*s,3.4*s,C.leaf,far?6:12,far?3:6);
      if(!far)for(let j=0;j<4;j++){
        const xx=x+dx+(R()-.5)*3*s,zz=z+dz+(R()-.5)*3*s;
        w.tube([xx,yy,zz],[xx+s*.3,yy-5*s,zz+s*.4],.045*s,C.bark,4);
        for(let k=0;k<4;k++)le.quad([xx,yy-k*s,zz],[xx+.7*s,yy-(k+.3)*s,zz+.3*s],[xx+.2*s,yy-(k+1.7)*s,zz+.2*s],[xx-.2*s,yy-(k+.6)*s,zz],C.leaf);
      }
    }
  }
  function pinwheel(B,x,y,z,scale,green=false,part='base'){
    const w=B.get('sai','Wood',part);w.tube([x,y,z],[x,y+4*scale,z],.055*scale,C.beam,5);
    const g=B.get('sai','Pinwheel',part),p=[x,y+4*scale,z+.1],col=green?C.green:C.red;
    // Local centre in vertex color is NOT needed: rotation is a small shared flutter.
    for(let i=0;i<4;i++){
      const a=i*TAU/4,pt=(r,t,depth)=>[p[0]+Math.cos(a+t)*r*scale,p[1]+Math.sin(a+t)*r*scale,p[2]+depth*scale];
      g.tri(p,pt(1.5,.12,0),pt(1.25,.9,.35),col);g.tri(p,pt(1.25,.9,.35),pt(.48,1.25,0),green?C.pale:C.rose);
    }
  }
  function stoneStack(B,x,z,s,count,part='base'){
    const g=B.get('sai','Stone',part),y=nearHeight(x,z);let top=y;
    for(let i=0;i<count;i++){
      const r=s*(1-i/(count+1)*.77),ry=r*.46;
      oval(g,x+Math.sin(i*1.8)*r*.16,top+ry,z+Math.cos(i*1.4)*r*.10,r,ry,r*.79,i%3?C.rock:C.rockLight,12,6);top+=ry*1.8;
    }
  }
  function boat(B,x,z,far){
    const angle=.13,y=-.15,w=B.get('ferry','Wood','boat').place(x,y,z,angle),edge=B.get('ferry','Wood','boat').place(x,y,z,angle);
    const N=far?10:24,L=25;
    const section=t=>{const u=t*2-1,b=Math.sqrt(Math.max(0,1-u*u));return{z:u*L/2,w:.12+3.3*b,bottom:.15+1.4*Math.pow(Math.abs(u),5),rim:2.5+1.5*Math.pow(Math.abs(u),4)};};
    for(let i=0;i<N;i++){
      const a=section(i/N),b=section((i+1)/N);
      for(const sign of[-1,1]){
        // Two-sided outer and inner planks; no opaque top cap fills the hull.
        w.quad([sign*a.w*.60,a.bottom,a.z],[sign*b.w*.60,b.bottom,b.z],[sign*b.w,b.rim,b.z],[sign*a.w,a.rim,a.z],C.wood);
        w.quad([sign*a.w-.18*sign,a.rim,a.z],[sign*b.w-.18*sign,b.rim,b.z],[sign*b.w*.60,b.bottom+.28,b.z],[sign*a.w*.60,a.bottom+.28,a.z],C.beam);
        edge.tube([sign*a.w,a.rim,a.z],[sign*b.w,b.rim,b.z],.14,C.woodDark,6);
        if(!far)for(let k=1;k<4;k++)edge.tube([sign*G.mix(a.w*.6,a.w,k/4),G.mix(a.bottom,a.rim,k/4),a.z],[sign*G.mix(b.w*.6,b.w,k/4),G.mix(b.bottom,b.rim,k/4),b.z],.035,C.woodDark,4);
      }
      w.quad([-a.w*.6,a.bottom+.5,a.z],[-b.w*.6,b.bottom+.5,b.z],[b.w*.6,b.bottom+.5,b.z],[a.w*.6,a.bottom+.5,a.z],C.woodDark);
    }
    for(const zz of[-7,-1,5]){const a=section((zz/L+0.5)),half=G.mix(a.w*.6,a.w,G.clamp((1.75-a.bottom)/(a.rim-a.bottom),0,1))-.25;w.box(0,1.75,zz,half*2,.26,1.25,C.beam);if(!far)w.box(0,.65,zz,.35,1.1,1,C.wood);}
    if(!far){
      edge.tube([2.2,2.2,-9],[4.2,1.8,6],.095,C.woodDark,7);
      edge.box(4.2,1.75,6.5,.7,.15,3,C.beam);
      // Loose rope loops and a small ferry ledger, no invented price or fare rule.
      for(let j=0;j<3;j++)for(let i=0;i<16;i++){
        const a=i*TAU/16,b=(i+1)*TAU/16,r=.8+j*.18;
        edge.tube([Math.cos(a)*r,.88,8+Math.sin(a)*r],[Math.cos(b)*r,.88,8+Math.sin(b)*r],.05,C.pale,4);
      }
    }
    w.place();edge.place();
  }
  function flower(B,x,y,z,s,far,seed,zone='flowers'){
    const g=B.get(zone,'Flower','plants','vegetation'),stem=B.get(zone,'Leaf','plants','vegetation');
    const a=seed*.61,top=y+s*1.9;
    stem.quad([x-.025,y,z],[x-.025,top,z],[x+.025,top,z],[x+.025,y,z],C.stem);
    stem.quad([x,y,z-.025],[x,top,z-.025],[x,top,z+.025],[x,y,z+.025],C.stem);
    for(let k=0;k<(far?4:6);k++){
      const t=a+k*TAU/(far?4:6),dir=[Math.cos(t),0,Math.sin(t)],side=[-dir[2],0,dir[0]];
      const pt=(r,h,w)=>[x+dir[0]*r*s+side[0]*w*s,top+h*s,z+dir[2]*r*s+side[2]*w*s];
      // Recurved petals and long stamens distinguish lycoris from a red ball.
      const arcs=[[.03,0,.04],[.35,.16,.13],[.68,.02,.12],[.75,-.27,.035],[.58,-.43,.01]];
      for(let j=0;j<arcs.length-1;j++){
        const [r,h,w]=arcs[j],[r1,h1,w1]=arcs[j+1];g.quad(pt(r,h,-w),pt(r1,h1,-w1),pt(r1,h1,w1),pt(r,h,w),k%2?C.red:C.rose);
      }
      if(!far){ribbon(g,pt(.10,0,0),pt(.83,.42,.08),.022*s,C.rose);ribbon(g,pt(.83,.42,.08),pt(1.01,.41,.09),.026*s,C.gold);}
    }
  }
  function shigan(far=false){
    const B=bank('shigan',far),R=G.rng(230928);
    const rows=far?30:156,cols=far?16:96;
    for(let j=0;j<rows;j++){
      const z=-1050+j*2100/rows,z1=z+2100/rows;
      for(let i=0;i<cols;i++){
        const x=shore(z)-(shore(z)+1200)*Math.pow(1-i/cols,2.7),x1=shore(z)-(shore(z)+1200)*Math.pow(1-(i+1)/cols,2.7);
        const xx=shore(z1)-(shore(z1)+1200)*Math.pow(1-i/cols,2.7),xx1=shore(z1)-(shore(z1)+1200)*Math.pow(1-(i+1)/cols,2.7);
        const g=B.get('land'+Math.floor(j*4/rows),'Sand','base','terrain');
        const p=[[x,nearHeight(x,z),z],[xx,nearHeight(xx,z1),z1],[xx1,nearHeight(xx1,z1),z1],[x1,nearHeight(x1,z),z]];
        for(const tri of [[0,1,2],[0,2,3]])for(const k of tri){const v=p[k],x=v[0],z=v[2],normal=G.norm([nearHeight(x-.2,z)-nearHeight(x+.2,z),.4,nearHeight(x,z-.2)-nearHeight(x,z+.2)]);g.vertex(v,normal,G.blend(C.grass,C.sand,G.smooth(shore(z)-200,shore(z)-95,x)));}
      }
      B.get('water','Water','river','effects').quad([shore(z),.48,z],[shore(z1),.48,z1],[5500,.48,z1],[5500,.48,z],C.water);
    }
    // Continue the shore and quiet river into fog, never terminate at a visible square.
    const g=B.get('landOuter','Sand','base','terrain'),w=B.get('water','Water','river','effects');
    for(const side of[-1,1]){
      const z=side*1050,zz=side*9000;
      g.quad([-9000,19,zz],[shore(z),.6,zz],[shore(z),.6,z],[-1200,19,z],C.grass);
      w.quad([shore(z),.48,z],[shore(z),.48,zz],[9000,.48,zz],[5500,.48,z],C.water);
    }
    g.quad([-1200,19,-1050],[-1200,19,1050],[-9000,19,9000],[-9000,19,-9000],C.grass);
    // A curved road, with graded shoulders rather than a constant floating strip.
    const pave=B.get('road','Paving');
    const roadEdges=road.map(([x,z],i)=>{const a=road[Math.max(0,i-1)],b=road[Math.min(road.length-1,i+1)],n=G.norm([b[1]-a[1],0,a[0]-b[0]]),w=(z<0?13:9)/2;
      return[-1,1].map(side=>{const xx=x+side*n[0]*w,zz=z+side*n[2]*w;return[xx,nearHeight(xx,zz)+.22,zz];});
    });
    for(let i=0;i<roadEdges.length-1;i++)pave.quad(roadEdges[i][0],roadEdges[i+1][0],roadEdges[i+1][1],roadEdges[i][1],C.path);
    for(let row=0;row<7;row++)for(const side of[-1,1]){
      const z=-300+row*36+(side>0?4:0),x=marketX(z)+side*19;
      stall(B,x,z,side,row*2+(side>0?1:0),far);
    }
    for(let i=0;i<18;i++){
      const z=-367+i*25,side=i%2?1:-1,x=marketX(z)+side*(43+(i%3)*4);
      willow(B,x,z,.85+(i%4)*.08,far,301+i);
    }
    if(!far){
      for(let z=-299;z<-60;z+=48){
        const x=marketX(z);B.get('marketLines','Wood').tube([x-11,29,z],[x+11,29,z],.045,C.woodDark,4);
        for(const dx of[-10,-5,0,5,10])lamp(B,'marketLines',x+dx,26.5+.006*dx*dx,z,.8);
      }
    }
    // Sai is a sparse stone riverbed, not a lawn or a miniature town.
    for(let i=0;i<(far?45:700);i++){
      const z=-360+R()*410,x=-98+R()*116;if(x>shore(z)-3)continue;
      const r=.35+R()*1.5;oval(B.get('sai','Stone'),x,nearHeight(x,z)+r*.32,z,r,r*.43,r*.84,C.rock,far?6:8,3);
    }
    for(const [x,z,s,n]of[[-9,-77,2.4,7],[-36,-116,2.7,6],[-11,-142,2,5],[-49,-67,2.1,6],[7,-221,2.4,5],[-57,-232,2,5],[-76,-42,1.8,4],[3,-20,1.7,5]])stoneStack(B,x,z,s,far?3:n);
    for(let i=0;i<18;i++){
      const z=-289+i*17,x=-57+(i%3)*22,y=nearHeight(x,z);
      pinwheel(B,x,y,z,.78,i%3===0);
      if(i%4===0){const t=B.get('sai','Wood');t.box(x+3,y,z,1.0,4.8,.2,C.tablet);t.tri([x+2.5,y+4.8,z+.1],[x+3.5,y+4.8,z+.1],[x+3,y+5.35,z+.1],C.tablet);}
    }
    if(!far){
      for(let i=0;i<7;i++)pinwheel(B,-42+i*9,nearHeight(-42+i*9,-91),-91,.8,!!(i%2),'contest');
    }
    // A supported dock and moored ferry. Navigation is not a simulated living crossing.
    const sx=shore(153),dock=B.get('landing','Wood');
    for(let i=0;i<32;i++)dock.box(sx-20+i*1.25,3.25,153,1.13,.3,7.5,C.wood);
    for(const xx of[sx-15,sx,sx+17])for(const zz of[149.9,156.1])dock.box(xx,-2,zz,.55,6.6,.55,C.woodDark);
    for(const xx of[sx-16,sx+3])dock.box(xx,4,149,.6,2.2,.6,C.beam);
    // Stair flight from dry bank to deck; it does not extend across the river.
    for(let i=0;i<7;i++)B.get('landing','Stone').box(sx-24-i*1.7,nearHeight(sx-24-i*1.7,153)-.25,153,1.8,.45,8,C.rockLight);
    boat(B,sx+14,170,far);
    if(!far){const rope=B.get('landing','Wood');for(let i=0;i<12;i++){
      const t=i/12,u=(i+1)/12,pt=q=>[G.mix(sx+3,sx+13,q),5.3-2*q-1.6*Math.sin(q*Math.PI),G.mix(149,158,q)];
      rope.tube(pt(t),pt(u),.045,C.pale,4);
    }}
    // Several tapered, moss-capped rocks protrude in the silent foggy water.
    const rr=G.rng(930);for(let i=0;i<24;i++){
      const x=151+rr()*870,z=-700+rr()*1300,rx=6+rr()*9,h=13+rr()*29;
      const rock=B.get('riverRocks','Stone'),moss=B.get('riverRocks','Moss');
      const ring=(level,k)=>{const a=k*TAU/7,r=rx*[1,.64,.21][level]*(1+.16*Math.sin(k*2.2+i));return[x+Math.cos(a)*r+level*rx*.12,-8+h*[0,.68,1.04][level],z+Math.sin(a)*r*.74-level*rx*.18];};
      for(let level=0;level<2;level++)for(let k=0;k<7;k++)(level?moss:rock).quad(ring(level,k),ring(level+1,k),ring(level+1,(k+1)%7),ring(level,(k+1)%7),level?C.moss:C.rock);
      for(let k=0;k<7;k++)moss.tri(ring(2,k),[x+rx*.31,h*1.18-8,z-rx*.48],ring(2,(k+1)%7),C.moss);
    }
    if(!far)for(let i=0;i<13;i++){
      const z=-294+i*17,x=marketX(z)+(i%2?3:-4);oval(B.get('souls','Spirit','souls','effects'),x,nearHeight(x,z)+3.8,z,.6,1.35,.65,C.spirit,8,4);
    }
    return B.finish({locations:['liminal','sai','sanzu'],stalls:14,boatCount:1,roadSamples:road,hasCrossRiverBridge:false});
  }
  function gate(B,far){
    const z=-230,base=farHeight(0,z),stone=B.get('checkpoint','Stone'),wood=B.get('checkpoint','Wood'),tile=B.get('checkpoint','Tile');
    stone.box(0,base-.3,z,56,1.3,27,C.rockLight);
    for(const x of[-23,-8,8,23])for(const zz of[-9,9]){stone.box(x,base+1,z+zz,2.2,.9,2.2,C.rockLight);wood.box(x,base+1.8,z+zz,.9,14,.9,C.woodDark);}
    for(const dz of[-9,9]){wood.box(0,base+14,z+dz,51,1.2,1.4,C.beam);wood.box(0,base+16,z+dz,56,.9,1.6,C.woodDark);}
    const rings=[[29,16,base+16],[26,12,base+16.8],[21,5,base+23],[20,.3,base+25]];
    const p=a=>[[-a[0],a[2],z-a[1]],[a[0],a[2],z-a[1]],[a[0],a[2],z+a[1]],[-a[0],a[2],z+a[1]]];
    for(let k=0;k<rings.length-1;k++)for(let i=0;i<4;i++)tile.quad(p(rings[k])[i],p(rings[k+1])[i],p(rings[k+1])[(i+1)%4],p(rings[k])[(i+1)%4],C.tile);
    tile.box(0,base+25,z,41,.45,.9,C.trim);
    for(const dz of[-16,16])tile.box(0,base+15.5,z+dz,59,.7,.7,C.trim);
    for(const x of[-20,20])wood.box(x,base+2,z,5,4,1,C.wood);
    if(!far){
      for(let x=-22;x<=22;x+=2)for(const s of[-1,1])for(let k=0;k<rings.length-1;k++){
        const a=rings[k],b=rings[k+1];tile.tube([x,a[2]+.18,z+s*a[1]],[G.clamp(x,-b[0],b[0]),b[2]+.18,z+s*b[1]],.055,C.trim,4);
      }
      const p=B.get('checkpoint','Props');p.box(-16,base+1.1,z+3,10,3,4,C.woodDark);p.box(-16,base+4.1,z+3,11,.4,5,C.beam);
      for(let k=0;k<4;k++)p.box(-20+k*2.0,base+4.52,z+3,1.4,.2,2.4,C.paper);
      // A clerk's open ledger, not dining furniture or a fictional courtroom.
      p.box(-15,base+4.56,z+2.7,2.1,.1,1.6,C.pale);p.box(-11,base+4.6,z+3.2,.9,.13,.6,C.woodDark);
      for(const x of[-24,24])lamp(B,'checkpoint',x,base+10,z+9,.9);
    }
    for(const x of[-38,38])rail(B,'checkpoint',[x,-249],[x,-209],base);
    for(let i=0;i<3;i++)stone.box(0,base-1.3+i*.7,z+18-i*2.2,19,.7*(i+1),2.4,C.rockLight);
  }
  function higan(far=false){
    const B=bank('higan',far),R=G.rng(170319),n=far?24:68;
    for(let j=0;j<n;j++)for(let i=0;i<n;i++){
      const x=-1400+i*2800/n,z=-1800+j*2300/n,d=2800/n,dz=2300/n;
      B.get('land'+Math.floor(j*4/n),'Sand','base','terrain').quad([x,farHeight(x,z),z],[x,farHeight(x,z+dz),z+dz],[x+d,farHeight(x+d,z+dz),z+dz],[x+d,farHeight(x+d,z),z],C.grass);
    }
    const w=B.get('water','Water','river','effects');w.quad([-12000,.45,472],[-12000,.45,12000],[12000,.45,12000],[12000,.45,472],C.water);
    B.get('landOuter','Sand','base','terrain').quad([-12000,21,-12000],[-12000,21,472],[-1400,21,472],[-1400,21,-1800],C.grass);
    B.get('landOuter','Sand','base','terrain').quad([1400,21,-1800],[1400,21,472],[12000,21,472],[12000,21,-12000],C.grass);
    B.get('landOuter','Sand','base','terrain').quad([-12000,21,-12000],[-1400,21,-1800],[1400,21,-1800],[12000,21,-12000],C.grass);
    const path=B.get('path','Paving');
    const cx=z=>z< -150?0:28*Math.sin((z+150)/160);
    const edges=[];
    for(let z=-630;z<=460;z+=5){const x=cx(z),n=G.norm([10,0,cx(z-5)-cx(z+5)]);edges.push([-1,1].map(side=>{const xx=x+side*n[0]*5,zz=z+side*n[2]*5;return[xx,farHeight(xx,zz)+.2,zz];}));}
    for(let i=0;i<edges.length-1;i++)path.quad(edges[i][0],edges[i+1][0],edges[i+1][1],edges[i][1],C.path);
    // Near flowers are fully sculpted; far patches retain mass without thousands of stems.
    for(let i=0;i<(far?120:1600);i++){
      const x=(R()-.5)*(i<1400?470:1200),z=-680+R()*1130;
      if(Math.abs(x-cx(z))<8||Math.abs(x)<41&&Math.abs(z+230)<40||z>438)continue;
      const patch=Math.sin(x/61+z/137)*Math.cos(z/67-x/139);if(patch<-.45)continue;
      flower(B,x,farHeight(x,z),z,far?2.5:.65+R()*.60,far,i,Math.abs(x)<220?'flowersNear':'flowersFar');
    }
    if(!far){
      const g=B.get('fieldMass','Flower','plants','vegetation'),st=B.get('fieldMass','Leaf','plants','vegetation');
      const rnd=G.rng(23977);
      for(let i=0;i<6800;i++){
        const z=-560+rnd()*940,off=(i%2?1:-1)*(9+Math.pow(rnd(),1.8)*88),x=cx(z)+off;
        if(Math.abs(x)<41&&Math.abs(z+230)<40)continue;
        if(Math.sin(z/71+x/19)<-.63&&Math.abs(off)>24)continue;
        const y=farHeight(x,z),h=.8+rnd()*.6,r=.38+rnd()*.27;
        st.quad([x-.022,y,z],[x-.022,y+h,z],[x+.022,y+h,z],[x+.022,y,z],C.stem);
        for(let k=0;k<5;k++){const a=k*TAU/5+.6,dx=Math.cos(a)*r,dz=Math.sin(a)*r,pt=(t,dy,w)=>[x+dx*t-dz*w,y+h+dy,z+dz*t+dx*w];
          g.quad(pt(0,0,-.025),pt(.70,.08,-.15),pt(.70,.08,.15),pt(0,0,.025),i%4?C.red:C.rose);
          g.quad(pt(.70,.08,-.15),pt(1.15,-.28,-.02),pt(1.15,-.28,.02),pt(.70,.08,.15),i%3?C.red:C.rose);
        }
      }
    }
    gate(B,far);
    const quay=B.get('landing','Stone');quay.box(0,1,462,24,2,19,C.rockLight);
    for(let i=0;i<5;i++)quay.box(0,1+i*.6,460-i*3,18,.6*(i+1),3.1,C.rockLight);
    for(const x of[-10,10])quay.box(x,3,462,1.2,3,1.2,C.rockLight);
    if(!far){
      for(let i=0;i<24;i++){
        const z=-144+i*17,x=cx(z)+(i%2?14:-15),y=farHeight(x,z);
        oval(B.get('waiting','Spirit','souls','effects'),x,y+2.9,z,.55,1.2,.6,C.spirit,8,4);
      }
      for(const [x,z]of[[-104,135],[138,-60],[-147,-367],[189,250]]){
        const y=farHeight(x,z);oval(B.get('stones','Stone'),x,y+1.1,z,4,1.8,2.8,C.rock,8,4);
      }
    }
    return B.finish({locations:['higan'],checkpointBasis:'P: functional interpretation, not Shihichokuchou headquarters',flowersAreScenery:true,hasCrossRiverBridge:false,dayNight:false,seasons:false});
  }
  Object.assign(G,{HIGAN:{version:'0.23.0',regions,spaces:regions,views,locations,nearHeight,farHeight,shore,road,exhibitionOnly:true},buildShigan:shigan,buildHigan:higan,buildHiganOverviews:()=>[shigan(true),higan(true)]});
  const previous=G.buildRegion;
  G.buildRegion=async function(data,id,legacy){if(!regions.includes(id))return previous(data,id,legacy);const t=performance.now(),p=id==='shigan'?shigan():higan();p.builtMs=performance.now()-t;return p;};
})(globalThis.GA);
