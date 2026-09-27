/* v0.17 旧地狱。相对上下关系取自作品，尺寸、街区、背立面与路线均为 P 补完。 */
(function (G) {
  'use strict';
  const TAU = Math.PI * 2, C = G.rgb;
  const color = Object.fromEntries(Object.entries({
    rock:'#414956', rockWarm:'#59473f', edge:'#727b80', stone:'#76838a', pale:'#c6b6a6',
    dark:'#242534', wood:'#524039', woodLight:'#94745a', tile:'#385967', tileEdge:'#6c929d',
    paper:'#ffe0a1', red:'#843e4e', gold:'#a68a58', metal:'#424b55', brass:'#a28453',
    glass:'#72c5d9', cream:'#cdbcae', mauve:'#664c69', floorDark:'#343545', floorLight:'#bda69b'
  }).map(([k,v])=>[k,C(v)]));
  const views = {
    hellOverview: {label:'地底全域 · 层叠旧地狱',eye:[1030,70,-1290],target:[-35,-475,75],section:true},
    hellBridge: {label:'深道 · 分界桥',eye:[-153,-234,945],target:[-47,-286,821]},
    hellStreet: {label:'旧都 · 灯火长街',eye:[8,-309,658],target:[-3,-307,366]},
    hellRoofs: {label:'旧都 · 青瓦与灯海',eye:[260,-165,765],target:[-24,-293,439]},
    hellSpa: {label:'温泉街 · 蒸汽与木廊',eye:[356,-285,561],target:[265,-311,462]},
    hellPalace: {label:'地灵殿 · 蔷薇前庭',eye:[167,-220,129],target:[0,-256,-95]},
    hellHall: {label:'地灵殿 · 彩绘大堂',eye:[4,-273,-66],target:[0,-259,-172]},
    hellGallery: {label:'地灵殿 · 回廊与彩窗',eye:[-16,-258,-106],target:[13,-267,-172]},
    hellDescent: {label:'地灵殿下 · 灼热深渊',eye:[315,-376,13],target:[234,-473,-157]},
    hellBlazing: {label:'灼热地狱 · 熔岩遗址',eye:[245,-538,-176],target:[0,-622,-420]},
    hellReactor: {label:'核聚变炉 · 地底太阳',eye:[135,-580,-400],target:[0,-612,-535]},
    hellBlood: {label:'旧血池 · 深层油海',eye:[-250,-742,-637],target:[-338,-800,-737]}
  };
  for (const p of Object.values(views)) Object.assign(p,{region:'oldhell',space:'oldhell'});
  Object.assign(G.PRESETS,views);
  const block={id:'oldhell',name:'地底全域 · 旧地狱',space:'oldhell',center:[0,-320,360],poly:[[-640,-1050],[620,-1050],[640,1260],[-640,1260]],bottom:-870,step:12};
  G.DIORAMA.blocks.push(block);G.DIORAMA.map.set(block.id,block);G.REGION_LABELS.oldhell=block.name;
  Object.assign(G.IMPLEMENTED,{old_hell:'hellOverview',deep_road:'hellBridge',parsee_bridge:'hellBridge',old_capital:'hellStreet',chireiden:'hellPalace',hell_spa:'hellSpa',blazing_remains:'hellBlazing',reactor:'hellReactor',blood_old:'hellBlood'});
  G.HELL_VIEWS=views;
  G.HELL_NOTES={
    old_hell:'旧地狱分为上层居住区与下层遗址；现行地狱、畜生界另属其他区域。当前展示为本作设计的空间剖面。',
    deep_road:'采用风穴、深道、分界桥到旧都的顺序。桥形、坡度、岩层与距离由本作补完。',
    parsee_bridge:'地上地下分界桥为工作名称；桥体、桥亭和栏杆造型是本作设计。',
    old_capital:'青蓝瓦的江户式街区与石板路。普通酒铺、货摊、背巷和灯笼为无专名的生活景物。',
    chireiden:'以作品中的西洋大堂、拱门与彩色地砖为主要特征；完整外立面、双楼梯、庭院和房间比例为 P 补完。',
    hell_spa:'地下温泉街；浴池、木廊与排水设施是本作布局。蒸汽仅为景观效果。',
    blazing_remains:'位于地灵殿下方；制作熔岩、崩裂岩壁、旧设施与维护栈道。',
    reactor:'以《非想天则》能源中心为主形态：星形栈桥、发光线路与炉心；工程尺度和设备细节为 P。',
    blood_old:'参考《刚欲异闻》的深层旧血池与黑色油海；本景不表现淹水事件，不与旧作血之湖混同。'
  };

  function buildOldHell() {
    const R=G.rng(170927);
    const banks=new Map(),signs=[],lights=[],stats={houses:0,lanterns:0,arches:0};
    // 以分区、材质合批；岩壁与可隐藏顶盖分开，以免近景载入整张世界。
    const get=(zone,mat='hellStone',part='base')=>{
      const key=zone+':'+mat+':'+part;
      if(!banks.has(key))banks.set(key,{g:new G.Geometry(),mat,zone,part});
      const g=banks.get(key).g;g.place();return g;
    };
    const ring=(g,x,y,z,r,t,col,n=32,vertical=false)=>{
      for(let i=0;i<n;i++){const a=i*TAU/n,b=(i+1)*TAU/n;
        g.tube(vertical?[x+Math.cos(a)*r,y+Math.sin(a)*r,z]:[x+Math.cos(a)*r,y,z+Math.sin(a)*r],vertical?[x+Math.cos(b)*r,y+Math.sin(b)*r,z]:[x+Math.cos(b)*r,y,z+Math.sin(b)*r],t,col,5);}
    };
    const beam=(g,a,b,w,h,col)=>{const v=G.sub(b,a),l=G.length(v),dir=G.norm([v[0],0,v[2]]),n=[dir[2],0,-dir[0]],u=G.mul(n,w/2),up=[0,h,0];
      const p=G.sub(a,u),q=G.add(a,u),r=G.add(b,u),s=G.sub(b,u);g.quad(p,q,r,s,col);g.quad(G.add(p,up),G.add(s,up),G.add(r,up),G.add(q,up),col);g.quad(p,s,G.add(s,up),G.add(p,up),col);g.quad(q,G.add(q,up),G.add(r,up),r,col);};
    function path(zone,ps,w,rail=true,material='hellPaving'){
      const industrial=['descent','blazing','reactor','blood'].includes(zone);
      const floor=get(zone,industrial?'hellIron':zone==='deep'?'hellRoad':material),iron=get(zone,'hellIron');
      for(let i=1;i<ps.length;i++){const a=ps[i-1],b=ps[i];
        if(industrial){
          const dir=G.norm([b[0]-a[0],0,b[2]-a[2]]),normal=[dir[2],0,-dir[0]],steps=Math.ceil(G.length(G.sub(b,a))/.8);
          for(const sign of [-1,1]){const shift=G.mul(normal,sign*(w*.5-.2));beam(floor,G.add(a,shift),G.add(b,shift),.42,.6,color.metal);}
          for(let k=0;k<=steps;k++){const p=a.map((v,j)=>G.mix(v,b[j],k/steps)+(j===1?.5:0));beam(floor,G.add(p,G.mul(normal,w*.5)),G.add(p,G.mul(normal,-w*.5)),.28,.22,color.stone);}
        }else beam(floor,a,b,w,.8,material==='hellWood'?color.wood:color.stone);
        if(material==='hellWood'){
          const n=Math.ceil(G.length(G.sub(b,a))/.7);
          for(let j=0;j<n;j++){const p=a.map((v,k)=>G.mix(v,b[k],j/n)+(k===1?.82:0)),q=a.map((v,k)=>G.mix(v,b[k],(j+.88)/n)+(k===1?.82:0));beam(floor,p,q,w,.12,G.blend(color.woodLight,color.wood,R()*.3));}
        }
        if(rail){const v=G.norm([b[0]-a[0],0,b[2]-a[2]]),n=[v[2]*w*.48,0,-v[0]*w*.48],N=Math.ceil(G.length(G.sub(b,a))/5);
          for(const sign of [-1,1]){for(const h of [1.8,3.5])iron.tube(G.add(G.add(a,G.mul(n,sign)),[0,h,0]),G.add(G.add(b,G.mul(n,sign)),[0,h,0]),.13,color.metal,5);
            for(let k=0;k<=N;k++){const p=a.map((v,j)=>G.mix(v,b[j],k/N));iron.tube(G.add(p,G.mul(n,sign)),G.add(G.add(p,G.mul(n,sign)),[0,3.7,0]),.19,color.metal,6);}}}
      }
    }
    function rock(zone,x,y,z,sx,sy,sz,warm=false){
      const g=get(zone,'hellRock'),N=7,levels=[0,.18,.55,.82,1],rings=[];
      for(let j=0;j<levels.length;j++){let rr=[];for(let k=0;k<N;k++){let a=k*TAU/N,r=(.84+R()*.22)*(j===4?.43:j===0?.9:1);rr.push([x+Math.cos(a)*sx*r+(j*.7),y+sy*levels[j],z+Math.sin(a)*sz*r]);}rings.push(rr);}
      for(let j=1;j<rings.length;j++)for(let k=0;k<N;k++)g.quad(rings[j-1][k],rings[j-1][(k+1)%N],rings[j][(k+1)%N],rings[j][k],G.blend(warm?color.rockWarm:color.rock,color.edge,R()*.16));
      for(let k=0;k<N;k++)g.tri([x+2.8,y+sy,z],rings[4][k],rings[4][(k+1)%N],color.rock);
    }
    function arch(g,x,y,z,w,h,depth,col,pointed=false){
      const spring=h-w*(pointed?.76:.5),N=20;
      const p=(t,r)=>[x+Math.cos(t)*r,y+spring+Math.sin(t)*r*(pointed?1.52:1),z];
      for(let i=0;i<N;i++){const a=i*Math.PI/N,b=(i+1)*Math.PI/N,ai=p(a,w/2),bi=p(b,w/2),ao=p(a,w/2+.85),bo=p(b,w/2+.85);
        g.quad(ai,bi,bo,ao,col);g.quad(ai,ai.map((v,k)=>k===2?v-depth:v),bi.map((v,k)=>k===2?v-depth:v),bi,col);g.quad(ao,bo,bo.map((v,k)=>k===2?v-depth:v),ao.map((v,k)=>k===2?v-depth:v),col);}
      for(const s of [-1,1]){g.box(x+s*(w/2+.42),y,z-depth/2,.86,spring,depth,col);g.box(x+s*(w/2+.42),y-.3,z-depth/2,1.25,.7,depth+1,col);}
      stats.arches++;
    }
    function lamp(zone,x,y,z,size=1,warm=true,post=false){
      const metal=get(zone,'hellIron'),paper=get(zone,warm?'hellLantern':'hellSpirit');
      if(post){metal.cone(x,y-5,z,.28,.18,5,color.metal,7);metal.tube([x,y,z],[x+1.6,y,z],.13,color.metal,5);x+=1.6;}
      paper.ellipsoid(x,y-1.3*size,z,.85*size,1.3*size,.85*size,color.paper,12,7);
      for(const dy of [-2.65,-.03])metal.cone(x,y+dy*size,z,.57*size,.57*size,.18*size,color.dark,10);
      for(let k=0;k<8;k++){let a=k*TAU/8;metal.tube([x+Math.cos(a)*.6*size,y-2.3*size,z+Math.sin(a)*.6*size],[x+Math.cos(a)*.6*size,y-.3*size,z+Math.sin(a)*.6*size],.035*size,color.wood,4);}
      lights.push({p:[x,y-1.3*size,z],color:warm?0xffbc69:0x77d9dd,power:warm?105:80,distance:30,zone});stats.lanterns++;
    }
    function roof(g,trim,x,y,z,w,d,h,col){
      // 折线模拟瓦顶坡度；所有四面闭合并制作实际檐厚。
      const rings=[[-w/2-1.4,w/2+1.4,-d/2-1.5,d/2+1.5,y],[-w*.37,w*.37,-d*.40,d*.40,y+h*.33],[-w*.25,w*.25,-d*.06,d*.06,y+h]];
      for(let j=0;j<2;j++){const a=rings[j],b=rings[j+1];
        g.quad([x+a[0],a[4],z+a[2]],[x+a[1],a[4],z+a[2]],[x+b[1],b[4],z+b[2]],[x+b[0],b[4],z+b[2]],col);
        g.quad([x+a[1],a[4],z+a[3]],[x+a[0],a[4],z+a[3]],[x+b[0],b[4],z+b[3]],[x+b[1],b[4],z+b[3]],col);
        for(const k of [0,1])g.quad([x+a[k],a[4],z+a[3]],[x+a[k],a[4],z+a[2]],[x+b[k],b[4],z+b[2]],[x+b[k],b[4],z+b[3]],col);}
      g.box(x,y-.32,z,w+2.8,.4,d+3,col);trim.box(x,y+h,z,w*.55,.5,1,color.tileEdge);
      for(let xx=-w/2;xx<=w/2;xx+=1.55)for(const sign of [-1,1]){let px=G.clamp(xx,-w*.25,w*.25);trim.tube([x+xx,y+.1,z+sign*(d/2+1.45)],[x+px,y+h+.08,z+sign*d*.06],.07,color.tileEdge,4);}
      for(const sign of [-1,1])trim.tube([x-w/2-1.45,y,z+sign*(d/2+1.45)],[x+w/2+1.45,y,z+sign*(d/2+1.45)],.19,color.tileEdge,5);
    }
    function shop(zone,x,y,z,w=23,d=22,h=14,yaw=0,n=0){
      const body=get(zone,'hellPlaster'),wood=get(zone,'hellWood'),tile=get(zone,'hellTile'),trim=get(zone,'hellTile'),paper=get(zone,'hellWindow'),cloth=get(zone,'hellCloth');
      for(const g of [body,wood,tile,trim,paper,cloth])g.place(x,y,z,yaw);
      body.box(0,0,0,w,1.2,d,color.stone);body.box(0,1.2,0,w-.8,h,d-.8,G.blend(color.pale,color.wood,R()*.27));
      for(const xx of [-w/2+.3,0,w/2-.3])for(const zz of [-d/2,d/2])wood.box(xx,1,zz,.48,h,.48,color.wood);
      for(const yy of [1.2,h*.55,h])wood.box(0,yy,d/2+.16,w,.5,.7,color.wood);
      for(const sign of [-1,1])for(let xx=-w/2+3;xx<w/2-1;xx+=4.5){paper.box(xx,h*.63,sign*(d/2+.25),3.25,3,.16,color.paper);
        for(let k=-1;k<=1;k++)wood.box(xx+k,h*.63,sign*(d/2+.43),.075,3,.12,color.wood);wood.box(xx,h*.63+1.5,sign*(d/2+.5),3.3,.09,.12,color.wood);}
      wood.box(0,1.3,d/2+.4,4.7,h*.43,.25,color.dark);wood.box(0,1,d/2+2,w,.5,4.2,color.woodLight);
      // 下层格栅、侧墙雨板和店面陈列给街道提供近看尺度。
      for(const sign of [-1,1]){
        paper.box(sign*w*.32,2,d/2+.32,w*.26,3.3,.1,color.paper);
        for(let j=0;j<9;j++)wood.box(sign*w*.32-w*.13+j*w*.032,1.9,d/2+.49,.085,3.6,.12,color.wood);
        wood.box(sign*w*.32,3.5,d/2+.52,w*.28,.12,.15,color.wood);
        for(let zz=-d/2+1;zz<d/2;zz+=1.6)wood.box(sign*(w/2+.03),1.4,zz,.13,h*.36,1.5,G.blend(color.wood,color.woodLight,(n%4)*.1));
        wood.box(sign*w*.35,1.3,d/2+2.7,5.2,1.5,1.5,color.woodLight);
        for(let j=0;j<4;j++)body.ellipsoid(sign*w*.35-1.6+j*1.1,3.0,d/2+2.7,.42,.6,.42,j%2?color.tile:color.pale,8,4);
      }
      for(const yy of [h*.55+.5,h+1])wood.box(0,yy,-d/2-.16,w,.4,.35,color.wood);
      for(let xx=-w/2+2;xx<w/2;xx+=3.7){wood.box(xx,1,d/2+3.7,.2,5.1,.2,color.wood);cloth.box(xx,4.2,d/2+3.5,3.35,2.1,.12,n%3?color.red:color.tile);}
      roof(tile,trim,0,h+1,0,w,d,6+n%3,color.tile);roof(tile,trim,0,h*.55,d*.4,w+1,d*.52,2.5,color.tile);
      if(n%4===0){body.box(0,h+3,d*.24,7,4,5,color.pale);paper.box(0,h+4,d*.24+2.55,4.5,2,.1,color.paper);wood.box(0,h+4,d*.24+2.65,.12,2,.12,color.wood);roof(tile,trim,0,h+7,d*.24,8,6,2.5,color.tile);}
      for(const sign of [-1,1]){wood.tube([sign*(w/2+.4),h,-d/2],[sign*(w/2+.4),1,-d/2],.12,color.dark,5);paper.box(sign*w*.24,2,-d/2-.3,3.6,2.7,.13,color.paper);wood.box(sign*w*.24,2,-d/2-.42,.14,2.7,.13,color.wood);}
      for(const g of [body,wood,tile,trim,paper,cloth])g.place();
      const P=(p)=>[x+Math.cos(yaw)*p[0]+Math.sin(yaw)*p[2],y+p[1],z-Math.sin(yaw)*p[0]+Math.cos(yaw)*p[2]];
      const pp=P([-w*.32,6,d/2+3.8]);lamp(zone,...pp,1.05);
      if(n%3===0){const p=P([w*.3,7,d/2+3.7]);signs.push({text:['酒','食事','商い','湯'][n%4],position:p,width:2.5,height:5.3,yaw,vertical:true,background:'#30484d',color:'#ead5a9',space:'oldhell'});}
      const barrels=get(zone,'hellWood');barrels.place(x,y,z,yaw);
      for(let k=0;k<3;k++){let bx=w*.34+(k%2)*2.3,bz=d/2+2.4+Math.floor(k/2)*2.3;barrels.cone(bx,1.4,bz,1,1,2.3,color.woodLight,10);for(const yy of [1.6,3.4])ring(barrels,bx,yy,bz,1.03,.06,color.dark,10);}
      barrels.place();stats.houses++;
    }
    function smoke(zone,points,size){const g=get(zone,'hellSteam','effects');for(const p of points){const corners=[[0,0],[1,0],[1,1],[0,0],[1,1],[0,1]];for(const uv of corners)g.vertex(p,[0,1,0],[uv[0],uv[1],size]);}}

    // 上层：崎岖岩床托住旧都，左右悬崖真实延伸至下层。
    const ground=get('capital','hellRock');
    for(let z=100;z<760;z+=24)for(let x=-235;x<235;x+=24){const h=-321+(G.noise(x*.018,z*.018)-.5)*1.5;
      ground.quad([x,h,z],[x,h,z+24],[x+24,h,z+24],[x+24,h,z],G.blend(color.rock,color.stone,.22+R()*.16));}
    for(let i=0;i<35;i++){let z=108+i*19;rock('capital',-260,-620,z,35+R()*18,300+R()*7,30);rock('capital',254,-620,z,24+R()*16,300,28);}
    const paving=get('capital','hellPaving');
    for(let z=160;z<722;z+=4.2)for(let x=-18;x<18;x+=4.4)paving.box(x,-320,z,4.18,.24,4,G.blend(color.stone,color.pale,.15+R()*.25));
    for(const z of [261,423,581])for(let x=-228;x<229;x+=4.4)for(let j=-1;j<=1;j++)paving.box(x,-320,z+j*4.2,4.16,.24,4,color.stone);
    for(let row=0;row<7;row++)for(const side of [-1,1]){const z=221+row*68;
      shop('capital',side*(44+R()*3),-320,z,25+R()*8,28+R()*6,15+R()*5,side>0?-Math.PI/2:Math.PI/2,row*2+(side>0?1:0));
      shop('capital',side*(134+R()*20),-320,z+16,31+R()*9,33,17+R()*7,side>0?-Math.PI/2:Math.PI/2,row+8);}
    for(const z of [281,449,620]){const ropes=get('capital','hellIron');const pts=[];for(let k=0;k<=12;k++){let x=-35+k*70/12;pts.push([x,-293-3.5*Math.sin(Math.PI*k/12),z]);}
      for(let k=1;k<pts.length;k++)ropes.tube(pts[k-1],pts[k],.07,color.dark,4);
      for(let k=1;k<12;k+=2)lamp('capital',...pts[k],.72);}
    for(let z=188;z<710;z+=34)for(const side of [-1,1])lamp('capital',side*20,-313,z,.75,true,true);
    // 地下排水渠；两个实体小桥跨过水道，渠底与护岸保持高差。
    const drain=get('capital','hellStone'),water=get('capital','hellWater');
    drain.box(-94,-327,445,12,6,498,color.dark);water.box(-94,-322.8,445,9,.05,495,C('#28454c'));
    for(const x of [-100,-88])drain.box(x,-324,445,1.1,4.8,500,color.stone);
    for(const z of [263,583])path('capital',[[-114,-319,z],[-94,-317,z],[-73,-319,z]],11,true);

    // 深道和跨谷石桥，以向旧都下降的高差组织，不连接三途河。
    const deepPath=[[-228,-170,1164],[-246,-203,1063],[-177,-238,975],[-105,-261,890],[-37,-298,805],[0,-320,727]];
    path('deep',deepPath,14,true);
    const bridge=get('deep','hellStone');
    const bp=(t,side,bottom)=>[G.mix(-177,-37,t)+side*5.4,G.mix(-238,-298,t)+(bottom?-60+46*Math.sin(Math.PI*t):7*Math.sin(Math.PI*t)),G.mix(975,805,t)+side*4.45];
    for(let i=0;i<32;i++){const a=i/32,b=(i+1)/32,col=G.blend(color.stone,color.dark,.12+(i%3)*.06);
      for(const side of [-1,1])bridge.quad(bp(a,side,false),bp(b,side,false),bp(b,side,true),bp(a,side,true),col);
      bridge.quad(bp(a,-1,true),bp(b,-1,true),bp(b,1,true),bp(a,1,true),color.stone);}
    for(let j=1;j<deepPath.length;j++){const a=deepPath[j-1],b=deepPath[j],delta=G.sub(b,a),n=G.norm([delta[2],0,-delta[0]]),steps=Math.ceil(G.length(delta)/27);
      for(let k=0;k<steps;k++){const p=a.map((v,i)=>G.mix(v,b[i],k/steps));for(const side of [-1,1])rock('deep',p[0]+n[0]*side*48,p[1]-95,p[2]+n[2]*side*48,21+R()*3,169+R()*15,22+R()*3);}}
    for(let i=0;i<9;i++){let t=i/8;lamp('deep',G.mix(-220,-15,t),G.mix(-164,-304,t),G.mix(1140,771,t),1,false,true);}

    // 温泉街：分隔的石池、木栈道、温泉馆与屋顶通风口。
    const spa=get('spa','hellStone');spa.box(302,-332,456,142,11,196,color.rock);
    shop('spa',307,-320,393,66,34,22,0,3);shop('spa',375,-320,501,32,55,17,-Math.PI/2,7);
    path('spa',[[220,-319,424],[254,-319,424],[254,-319,529],[320,-319,529]],8,true,'hellWood');
    const sw=get('spa','hellWater');
    for(const [x,z,rx,rz] of [[296,468,29,22],[310,510,21,16]]){for(let k=0;k<32;k++){let a=k*TAU/32,b=(k+1)*TAU/32;sw.tri([x,-320.1,z],[x+Math.cos(a)*rx,-320.1,z+Math.sin(a)*rz],[x+Math.cos(b)*rx,-320.1,z+Math.sin(b)*rz],C('#538f8d'));spa.ellipsoid(x+Math.cos(a)*(rx+1),-320,z+Math.sin(a)*(rz+1),2,1.2,2,color.stone,7,4);}
      smoke('spa',Array.from({length:12},()=>[x+(R()-.5)*rx*1.8,-319+R()*4,z+(R()-.5)*rz*1.8]),11);}
    for(const p of [[255,-311,453],[270,-311,509],[333,-311,480]])lamp('spa',...p,.95,true,true);

    // 地灵殿台地与前庭。宫殿地板为 -282，下方的熔岩面为 -652。
    const terrace=get('palace','hellStone');terrace.box(0,-324,-38,225,38,340,color.rock);
    // 宫殿台地由岩柱、拱肩托住，岩体下方保留炉层空腔。
    for(const side of [-1,1])for(let z=-194;z<100;z+=43)rock('palace',side*113,-646,z,22+R()*9,354+R()*6,29,true);
    for(const x of [-86,-43,0,43,86])rock('palace',x,-478,-208,32,185,25,true);
    // 街市两侧岩肩和通往宫殿的缓坡，掩合矩形地块边缘。
    for(const side of [-1,1])for(let z=94;z<724;z+=48)rock('capital',side*229,-344,z,23,26+R()*8,33);
    const approach=get('palace','hellRock');
    for(const side of [-1,1]){
      approach.quad([side*22,-320,201],[side*105,-320,201],[side*107,-286,126],[side*22,-283,126],color.rock);
      for(let i=0;i<12;i++){const z=197-i*5.8,y=-320+i*2.8;rock('palace',side*(46+R()*52),y-6,z,7+R()*5,8,7);}
    }
    terrace.box(0,-288,-39,218,3,332,color.pale);
    for(let i=0;i<38;i++)terrace.box(0,-320+i,201-i*2,40,1,2.05,color.pale);
    const plaza=get('palace','hellPaving');for(let z=-40;z<124;z+=6)for(let x=-94;x<96;x+=6)plaza.box(x,-284.95,z,5.9,.16,5.9,G.blend(color.pale,color.stone,((Math.floor(x/6)+Math.floor(z/6))%2)?.15:.35));
    for(const x of [-82,82])for(let z=-21;z<100;z+=33){const planter=get('palace','hellStone'),plant=get('palace','hellGarden');planter.box(x,-285,z,11,1.4,21,color.stone);
      for(let j=0;j<18;j++){const px=x+(R()-.5)*8,pz=z+(R()-.5)*18;plant.cone(px,-283.6,pz,.15,.05,1.7,C('#355756'),5);plant.ellipsoid(px,-281.7,pz,.8,.45,.8,j%3?color.red:C('#d792b5'),7,4);}}
    const fountain=get('palace','hellStone'),fw=get('palace','hellWater');
    ring(fountain,0,-284,43,16,.8,color.pale,48);ring(fountain,0,-285,43,18,.8,color.stone,48);fw.cone(0,-284.6,43,15.8,15.8,.07,C('#567182'),48);fountain.cone(0,-284,43,3,1.2,6,color.pale,12);fountain.cone(0,-278,43,7,7.5,1,color.pale,32);fw.cone(0,-277,43,7.1,7.1,.08,color.glass,32);
    for(let k=0;k<16;k++){const a=k*TAU/16;for(let j=0;j<12;j++){const p=t=>[Math.cos(a)*(7+t*5),-277-7*t+Math.sin(t*Math.PI)*1.4,43+Math.sin(a)*(7+t*5)];fw.tube(p(j/12),p((j+1)/12),.07,color.glass,5);}}
    const courtRail=get('palace','hellCarving');
    for(const side of [-1,1]){
      for(let z=-42;z<122;z+=4){courtRail.cone(side*103,-285,z,.25,.18,2.5,color.pale,7);courtRail.box(side*103,-282.5,z,.7,.3,4.1,color.pale);}
      for(let x=27;x<104;x+=4){courtRail.cone(side*x,-285,122,.25,.18,2.5,color.pale,7);courtRail.box(side*x,-282.5,122,4.1,.3,.7,color.pale);}
    }
    for(let z=-31;z<130;z+=30)for(const x of [-28,28])lamp('palace',x,-275,z,.8,true,true);

    const wall=get('palace','hellPalace'),trim=get('palace','hellCarving'),glass=get('palace','hellGlass'),roofG=get('palace','hellPalaceRoof','ceiling');
    const Y=-282,front=-54,back=-204;
    // 三个连续体量，各翼四面均有细节。中殿正门保留真实开口。
    for(const x of [-67,67]){wall.box(x,Y,-130,58,35,150,color.cream);roof(roofG,roofG,x,Y+36,-130,62,154,15,color.red);}
    for(const x of [-24,24])wall.box(x,Y,-129,3.4,51,150,color.cream);
    wall.box(0,Y,back,49,51,3.5,color.cream);
    for(const x of [-18,18])wall.box(x,Y,front,12,45,3.5,color.cream);wall.box(0,Y+31,front,25,19,3.5,color.cream);
    arch(trim,0,Y,front+1.9,24,31,4,color.pale,true);
    roof(roofG,roofG,0,Y+51,-128,53,158,16,color.red);
    for(const z of [front,back])for(const x of [-93,-68,-43,43,68,93]){
      wall.box(x,Y+3,z+(z===front?1:-1),2,34,2.7,color.pale);
      for(const yy of [8,23]){const sign=z===front?1:-1;arch(trim,x,Y+yy,z+sign*2,7,10,1.4,color.pale,true);glass.box(x,Y+yy+1,z+sign*1.8,6.7,8,.12,color.glass);trim.box(x,Y+yy,z+sign*2,.18,8,.2,color.gold);
        for(const dx of [-1.8,1.8])glass.box(x+dx,Y+yy+1.5,z+sign*1.9,1.3,5.8,.13,C(dx>0?'#bd89a5':'#c7ad74'));
        for(const dy of [3.8,6.4])trim.box(x,Y+yy+dy,z+sign*2.1,6.8,.15,.2,color.gold);}}
    for(const x of [-97,97])for(let z=-190;z<-60;z+=19){const sign=x>0?1:-1;wall.box(x,Y,z,2.2,36,2,color.pale);glass.box(x+sign*.1,Y+13,z+8,.14,12,8,color.glass);trim.box(x+sign*.25,Y+13,z+8,.2,12,.18,color.gold);for(const yy of [17,21])trim.box(x+sign*.25,Y+yy,z+8,.2,.15,8,color.gold);}
    // 柱脚、檐口、窗楣与铜色尖顶，避免光滑白盒式立面。
    for(const yy of [0,3,19,35])for(const x of [-67,67])trim.box(x,Y+yy,front+1.9,60,.6,1.4,color.pale);
    for(const x of [-35,35]){const tower=get('palace','hellPalace');tower.box(x,Y,-53,17,56,19,color.cream);
      for(const yy of [1,25,48,55])trim.box(x,Y+yy,-53,18.6,.8,20.5,color.pale);
      roof(roofG,roofG,x,Y+56,-53,20,22,19,color.red);trim.cone(x,Y+74,-53,.55,.04,8,color.gold,8);
      for(const yy of [9,29]){arch(trim,x,Y+yy,-42.6,7,14,1.4,color.pale,true);glass.box(x,Y+yy+1,-42.9,6.7,10,.12,color.glass);}}
    function rose(x,y,z,r){const palette=['#549dc4','#ba769b','#d7b16a','#7385b6','#61b8af'];
      for(let i=0;i<20;i++){let a=i*TAU/20,b=(i+1)*TAU/20;glass.tri([x,y,z],[x+Math.cos(a)*r,y+Math.sin(a)*r,z],[x+Math.cos(b)*r,y+Math.sin(b)*r,z],C(palette[i%5]));trim.tube([x+Math.cos(a)*r*.28,y+Math.sin(a)*r*.28,z+.08],[x+Math.cos(a)*r,y+Math.sin(a)*r,z+.08],.13,color.gold,5);}
      ring(trim,x,y,z+.1,r,.5,color.pale,48,true);ring(trim,x,y,z+.2,r*.55,.16,color.gold,32,true);ring(trim,x,y,z+.2,r*.27,.18,color.gold,24,true);}
    rose(0,Y+41,front+2.0,7.7);rose(0,Y+32,back+2.0,10);

    // 可进入的大堂：黑粉棋盘、彩色鸟纹地嵌、两层回廊及实体拱肋。
    const floor=get('hall','hellMarble'),colG=get('hall','hellCarving'),mosaic=get('hall','hellMosaic'),iron=get('hall','hellBrass');
    for(let z=-201;z<-52;z+=3.3)for(let x=-22;x<23;x+=3.3){let n=Math.round((x+22)/3.3)+Math.round((z+201)/3.3);floor.box(x,Y,z,3.23,.22,3.23,n%2?color.floorDark:color.floorLight);}
    for(const z of [-89,-140,-180]){for(let i=0;i<10;i++){let a=i*TAU/10,b=(i+1)*TAU/10;const r=i%2?7.4:8.8;mosaic.tri([0,Y+.26,z],[Math.cos(a)*r,Y+.26,z+Math.sin(a)*r],[Math.cos(b)*r,Y+.26,z+Math.sin(b)*r],C(['#aa5c87','#d19f63','#578799','#8e739f'][i%4]));}
      const wing=C('#e2c28d');mosaic.tri([0,Y+.28,z-4],[-7,Y+.28,z+1],[-2,Y+.28,z+1],wing);mosaic.tri([0,Y+.28,z-4],[2,Y+.28,z+1],[7,Y+.28,z+1],wing);mosaic.tri([-1,Y+.28,z-3],[1,Y+.28,z-3],[0,Y+.28,z+5],wing);}
    for(let z=-73;z>-200;z-=21)for(const side of [-1,1]){
      const x=side*18;colG.box(x,Y,z,3,1.1,3,color.pale);colG.cone(x,Y+1,z,1.05,.8,28,color.pale,12);colG.cone(x,Y+28,z,1.8,1.8,.7,color.pale,12);
      for(let i=0;i<8;i++){let a=i*TAU/8;colG.tube([x+Math.cos(a),Y+2,z+Math.sin(a)],[x+Math.cos(a),Y+26,z+Math.sin(a)],.1,color.cream,4);}
      if(side===1)arch(colG,0,Y+28,z,36,20,1.5,color.pale,false);
      // 侧面发光彩窗：缝隙式上光照亮柱脚与地砖。
      glass.box(side*22.1,Y+10,z-7,.13,14,7,C(side>0?'#6493b4':'#b37594'));
      // 彩窗铅条、石边和分色玻璃是实体几何，避免整片纯色发光板。
      for(const zz of [z-10.6,z-7,z-3.4])colG.box(side*21.98,Y+9.5,zz,.38,15.2,.27,color.pale);
      for(const yy of [9.5,16,24.6])colG.box(side*21.96,Y+yy,z-7,.42,.32,7.6,color.pale);
      for(let k=0;k<5;k++){
        const a=[side*21.82,Y+11+k*2.5,z-10.3],b=[side*21.82,Y+13.4+k*2.5,z-7],c=[side*21.82,Y+11+k*2.5,z-3.7];
        iron.tube(a,b,.055,color.gold,4);iron.tube(b,c,.055,color.gold,4);
      }
      lights.push({p:[side*20,Y+13,z-6],color:side>0?0x769ee8:0xe297be,power:600,distance:47,zone:'hall'});
    }
    for(const side of [-1,1])for(const yy of [1,3.5,27,43])colG.box(side*22.1,Y+yy,-130,.9,.55,145,color.pale);
    const furniture=get('hall','hellWood'),banners=get('hall','hellCloth');
    for(const side of [-1,1])for(const z of [-101,-164]){
      const x=side*20;furniture.box(x,Y+2.6,z,2.9,.35,8,color.wood);
      for(const zz of [-3,3])for(const xx of [-1,1])furniture.box(x+xx,Y+.25,z+zz,.22,2.5,.22,color.wood);
      for(let k=0;k<5;k++)furniture.box(x,Y+3+k*.2,z-1,1.4,.17,2.1,G.blend(color.red,color.gold,k*.15));
      furniture.cone(x,Y+3,z+2.5,.45,.25,1.1,color.pale,10);
      banners.box(side*21.2,Y+30,z,0.12,9,3.4,color.red);iron.box(side*21.1,Y+30,z,.14,.22,3.4,color.gold);
    }
    // 侧廊与后部双楼梯可从大堂透视观看。
    for(const x of [-18,18]){colG.box(x,Y+18,-137,8,.7,112,color.pale);for(let z=-78;z>-194;z-=3){iron.cone(x+(x>0?-4:4),Y+18.7,z,.08,.08,3,color.gold,5);}iron.box(x+(x>0?-4:4),Y+21.7,-136,.18,.18,115,color.gold);}
    for(const side of [-1,1])for(let i=0;i<30;i++)colG.box(side*(3+i*.49),Y+i*.6,-187,9,.6,9,color.pale);
    colG.box(0,Y+18,-196,43,.7,10,color.pale);
    for(const z of [-83,-126,-169]){iron.tube([0,Y+44,z],[0,Y+31,z],.08,color.gold,5);ring(iron,0,Y+30,z,5.6,.16,color.gold,32);
      for(let k=0;k<10;k++){let a=k*TAU/10,x=Math.cos(a)*5.6,zz=z+Math.sin(a)*5.6;iron.tube([0,Y+35,z],[x,Y+30,zz],.055,color.gold,4);lamp('hall',x,Y+30,zz,.44);}}
    // 简约猫形与栖架补充生活尺度；不把它们当成可交互角色。
    const pets=get('hall','hellWood');for(const [x,z] of [[-10,-92],[12,-166],[-15,-188]]){pets.ellipsoid(x,Y+.7,z,.45,.7,.8,color.dark,8,5);pets.ellipsoid(x,Y+1.6,z+.5,.44,.45,.4,color.dark,8,5);for(const s of [-1,1])pets.cone(x+s*.27,Y+1.8,z+.5,.2,0,.5,color.dark,4);pets.tube([x,Y+.5,z-.5],[x+.8,Y+1.1,z-1.5],.11,color.dark,5);}

    // 炉层：玄武岩围成真实容积，热面上方是可连续浏览的栈道。
    const lava=get('blazing','hellLava','effects');
    const basin=[[-328,29],[-397,-140],[-365,-418],[-240,-694],[-25,-793],[218,-738],[377,-520],[393,-233],[265,-13],[76,75]];
    for(let i=0;i<basin.length;i++){const a=basin[i],b=basin[(i+1)%basin.length];lava.tri([0,-652,-330],[a[0],-652,a[1]],[b[0],-652,b[1]],color.red);}
    for(let i=0;i<68;i++){const a=i*TAU/68,x=Math.cos(a)*398,z=-350+Math.sin(a)*449;rock('blazing',x,-708,z,32+R()*26,165+R()*95,35,true);}
    for(let i=0;i<24;i++){let a=R()*TAU,r=80+R()*210,x=Math.cos(a)*r,z=-320+Math.sin(a)*r;if(Math.hypot(x,z+535)<120||Math.abs(x+85)<45)continue;rock('blazing',x,-678,z,13+R()*24,36+R()*24,15+R()*20,true);}
    path('descent',[[105,-283,-92],[172,-306,-68],[210,-358,0],[262,-413,-50],[220,-466,-141],[285,-525,-250],[269,-596,-351]],10,true);
    for(const p of [[175,-309,-61],[259,-413,-54],[225,-468,-141],[281,-527,-249]])rock('descent',p[0],-649,p[2],15,p[1]+649,17,true);
    path('blazing',[[269,-596,-351],[221,-612,-428],[123,-618,-488],[78,-618,-535]],12,true);
    path('blazing',[[-19,-623,-240],[-87,-624,-358],[-100,-620,-489],[0,-619,-535]],13,true);
    for(const p of [[-278,-578,-242],[304,-571,-350],[-200,-604,-630]]){const ruins=get('blazing','hellIron');ruins.cone(p[0],p[1]-50,p[2],9,7,50,color.metal,12);ring(ruins,p[0],p[1],p[2],12,.5,color.brass,24);}
    // 非想天则的星形维护桥和垂直能源设施为主；太阳状热核位于中心。
    const rx=0,rz=-535,deck=-619,reactor=get('reactor','hellIron'),gold=get('reactor','hellBrass'),core=get('reactor','hellCore','effects'),line=get('reactor','hellCircuit','effects');
    ring(reactor,rx,deck,rz,76,2.0,color.metal,64);ring(gold,rx,deck+4,rz,77,.22,color.brass,64);ring(gold,rx,deck+4,rz,71,.18,color.brass,64);
    for(let i=0;i<5;i++){let a=TAU*i/5-Math.PI/2,b=TAU*(i+2)/5-Math.PI/2;path('reactor',[[Math.cos(a)*75,deck,rz+Math.sin(a)*75],[Math.cos(b)*75,deck,rz+Math.sin(b)*75]],7,true);}
    for(let i=0;i<12;i++){let a=i*TAU/12,x=Math.cos(a)*90,z=rz+Math.sin(a)*90;
      reactor.cone(x,-680,z,5,3,112,color.metal,8);for(const y of [-663,-638,-588,-574])ring(gold,x,y,z,5.5,.28,color.brass,16);
      line.tube([x,-649,z],[x,-577,z],.45,i%3?C('#896de1'):C('#e8b673'),5);
      reactor.tube([x,-574,z],[Math.cos(a)*46,-563,rz+Math.sin(a)*46],1.2,color.metal,8);
      ring(gold,Math.cos(a)*46,-563,rz+Math.sin(a)*46,2.5,.3,color.brass,10);}
    core.ellipsoid(0,-610,rz,15,15,15,C('#ffbf62'),32,20);
    for(const [y,r] of [[-644,26],[-583,31],[-566,47]]){ring(reactor,0,y,rz,r,1.1,color.metal,64);ring(line,0,y+.5,rz,r-.9,.24,C('#b387fb'),64);}
    for(const s of [-1,1]){const ps=[[s*101,-608,-510],[s*137,-608,-510],[s*137,-572,-531],[s*94,-572,-558]];for(let i=1;i<ps.length;i++){reactor.tube(ps[i-1],ps[i],3,color.metal,12);ring(gold,ps[i][0],ps[i][1],ps[i][2],3.4,.23,color.brass,12);}}
    lights.push({p:[0,-606,rz],color:0xff953f,power:12500,distance:380,zone:'reactor'});
    for(const p of [[-160,-640,-230],[176,-638,-340],[-70,-640,-664]])lights.push({p,color:0xff6324,power:4200,distance:290,zone:'blazing'});
    // 间歇泉地下中心的电梯下站与井架；不假定它和幻想风穴是同一入口。
    reactor.box(182,-622,-513,27,3,30,color.metal);for(const x of [172,192])for(const z of [-523,-503])reactor.box(x,-621,z,.8,195,.8,color.metal);
    for(let y=-615;y<-425;y+=13){reactor.box(182,y,-523,21,.6,.7,color.metal);reactor.tube([172,y,-523],[192,y+13,-523],.24,color.metal,5);}
    path('reactor',[[77,deck,rz],[181,-619,-513]],8,true);reactor.box(182,-618,-513,15,.6,13,color.metal);
    signs.push({text:'核融合炉',position:[183,-610,-504.7],width:11,height:3,yaw:0,background:'#423329',color:'#ebc882',space:'oldhell'});
    // 从旧设施下行至油海的独立支路。
    path('blood',[[-103,-623,-488],[-177,-669,-528],[-181,-707,-591],[-257,-753,-603],[-267,-785,-651]],9,true);
    const oil=get('blood','hellOil','effects'),rim=get('blood','hellRock');
    oil.cone(-338,-803,-723,144,144,.15,C('#261f2a'),64);
    for(let i=0;i<36;i++){let a=i*TAU/36;if(a>.55&&a<1.35)continue;rock('blood',-338+Math.cos(a)*155,-830,-723+Math.sin(a)*155,24,45+R()*32,27,true);}
    path('blood',[[-267,-785,-651],[-315,-790,-655],[-354,-790,-697]],8,true);
    for(const p of [[-267,-778,-652],[-317,-783,-655]])lamp('blood',...p,.8,false,true);
    lights.push({p:[-337,-775,-727],color:0x956b88,power:1300,distance:260,zone:'blood'});

    // 洞壁、钟乳和剖面顶盖。总览隐藏顶盖，近景保留封闭地下轮廓。
    const ceiling=get('cavern','hellRock','ceiling');
    for(let i=0;i<80;i++){const a=i*TAU/80,x=Math.cos(a)*535,z=410+Math.sin(a)*860;
      rock('cavern',x,-367,z,37+R()*25,235+R()*100,38);
      const b=(i+1)*TAU/80;ceiling.tri([0,-31,390],[x,-73-R()*30,z],[Math.cos(b)*535,-76,410+Math.sin(b)*860],color.rock);
      if(i%2===0)ceiling.cone(x*.79,-139-R()*60,390+(z-390)*.8,0,10+R()*11,75,color.rock,7);}
    // 炉边热烟、漂浮火星；使用程序化透明片，未使用背景图片。
    smoke('blazing',Array.from({length:24},()=>[(R()-.5)*590,-639,-340+(R()-.5)*680]),22);
    const sparks=get('blazing','hellEmber','effects');for(let i=0;i<190;i++){let x=(R()-.5)*610,y=-650+R()*100,z=-340+(R()-.5)*670;sparks.ellipsoid(x,y,z,.12+R()*.18,.4,.12,C('#ffb66f'),4,2);}
    const meshes=[...banks].filter(([k,v])=>v.g.a.length).map(([k,v])=>{
      const m=v.g.mesh('oldhell:'+k,v.part==='effects'?'effects':'architecture',{material:v.mat,space:'oldhell',owner:'oldhell',region:'oldhell',hellZone:v.zone,ceiling:v.part==='ceiling'});
      if(v.mat==='hellSteam')m.radius+=70;return m;});
    let bytes=0;for(const m of meshes)bytes+=m.vertices.byteLength;
    return {id:'oldhell',meshes,signs,bytes,meta:{version:'0.17.0',basis:'P',...stats,lights,locations:Object.keys(G.HELL_NOTES),mainReference:'TH11 / TH13.5 palace hall / TH12.3 furnace / TH17.5 oil sea',notes:G.HELL_NOTES}};
  }
  const prior=G.buildRegion;
  G.buildRegion=async function(data,id,legacy){if(id!=='oldhell')return prior(data,id,legacy);const start=performance.now(),pack=buildOldHell();pack.builtMs=performance.now()-start;pack.source='v0.17-old-hell';return pack;};
  G.buildOldHell=buildOldHell;
})(globalThis.GA);
