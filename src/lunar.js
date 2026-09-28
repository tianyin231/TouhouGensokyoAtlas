/* Lunar scenes, 0.19. Textual anchors: CiLR ch.3, SSiB, TH15.
 * Coordinates, unseen elevations, streets and all reusable architecture are P.
 * These three coordinate charts are NOT another island above Gensokyo. */
(function (G) {
  'use strict';
  const C = Object.fromEntries(Object.entries({
    stone:'#b9c6d2', edge:'#e2e2d9', paving:'#94a9b6', dark:'#263946',
    wall:'#e4e7da', wood:'#6c383d', beam:'#ad6461', tile:'#35657a', ridge:'#8db4c1',
    gold:'#d0b784', paper:'#fff3d0', trunk:'#675464', leaf:'#78958d',
    peach:'#e5b7c4', blossom:'#f7d9e1', fruit:'#e7a7a6', sand:'#9eacb2', garden:'#809b94',
    water:'#336a91', basalt:'#828b9d', dust:'#adb3c0', lattice:'#6a8cad', crane:'#d8e5ec'
  }).map(([k,v]) => [k,G.rgb(v)]));
  const TAU = Math.PI*2;
  const views = {
    moonOverview:{label:'月都 · 碧瓦重城',region:'lunar',space:'lunar',eye:[660,400,690],target:[36,28,-62],fov:44},
    moonGate:{label:'城门 · 三阙长街',region:'lunar',space:'lunar',eye:[98,68,340],target:[0,29,190]},
    moonAvenue:{label:'都城 · 朱柱街巷',region:'lunar',space:'lunar',eye:[53,38,150],target:[-5,39,-60]},
    moonCourt:{label:'内院 · 重檐殿庭',region:'lunar',space:'lunar',eye:[145,102,-12],target:[0,46,-156]},
    moonResidence:{label:'绵月宅 · 廊庭',region:'lunar',space:'lunar',eye:[260,76,-19],target:[177,32,-126]},
    moonTeaRoom:{label:'绵月宅 · 茶室',region:'lunar',space:'lunar',eye:[187,29,-139],target:[159,27,-104],fov:60},
    moonResidenceRear:{label:'绵月宅 · 背廊',region:'lunar',space:'lunar',eye:[269,64,-247],target:[174,35,-146]},
    moonPeaches:{label:'桃园 · 海风小径',region:'lunar',space:'lunar',eye:[441,58,26],target:[346,24,-103]},
    moonFertility:{label:'丰富海 · 桃岸',region:'lunar',space:'lunar',eye:[653,86,83],target:[401,16,-114]},
    moonSealed:{label:'TH15 · 封存示意',region:'lunar',space:'lunar',eye:[114,63,271],target:[0,30,-130],lunarSealed:true,era:'TH15月都冻结／撤离事件的艺术示意'},
    moonSeaInner:{label:'静海 · 内侧海面',region:'tranquility',space:'lunarsea',eye:[-315,87,330],target:[72,7,-225],lunarFace:'inner'},
    moonSeaOuter:{label:'静海 · 表月荒原',region:'tranquility',space:'lunarsea',eye:[310,183,400],target:[-20,-11,-12],lunarFace:'outer',era:'表月荒原；与内侧海水互斥'},
    dreamPassage:{label:'第四槐安 · 梦的通道',region:'kaian',space:'dream',eye:[265,151,458],target:[-30,67,-20],era:'TH15第三面精神空间片段'},
    dreamWithin:{label:'槐安 · 格网与飞鹤',region:'kaian',space:'dream',eye:[26,72,163],target:[-8,85,-199],era:'TH15第三面精神空间片段'}
  };
  for(const p of Object.values(views))p.era ||= '儚月抄月世界选集／P三维布局';
  Object.assign(G.PRESETS, views);
  for(const b of [
    {id:'lunar',name:'月之都 · 丰富海与桃园',space:'lunar',center:[0,30,-60]},
    {id:'tranquility',name:'静海 · 表里互斥',space:'lunarsea',center:[0,0,0]},
    {id:'kaian',name:'第四槐安通道 · TH15',space:'dream',center:[0,70,0]}
  ]){Object.assign(b,{poly:[],bottom:-100,step:20,independent:true});G.DIORAMA.blocks.push(b);G.DIORAMA.map.set(b.id,b);G.REGION_LABELS[b.id]=b.name;}
  Object.assign(G.IMPLEMENTED,{lunar_capital:'moonOverview',watatsuki:'moonResidence',lunar_peaches:'moonPeaches',fertility:'moonFertility',tranquility:'moonSeaInner',kaian:'dreamPassage'});
  // 'dream' remains the larger, unbuilt world: a fragment must not claim its entirety.
  const spaces = ['lunar','lunarsea','dream'];
  const regions = ['lunar','tranquility','kaian'];
  const descriptions = {
    lunar_capital:'以儚月抄的古式都城为主。城墙、街区、内院与绵月宅均为P布局；并非月夜见宫殿的测绘。',
    lunar_peaches:'桃树、照料作物的月兔职责来自原作。树形、数量、园径和果具为P；不把桃园画在表月荒原。',
    fertility:'都城旁的丰富海与桃园同图展示。岸线和距离为P；静海不是城门外的一小片水池。',
    tranquility:'内侧海水与表月荒原互斥展示。位于月都背面的原作关系不等于工程图上的紧邻或天文学远侧坐标。',
    kaian:'仅建TH15第四槐安通道片段，格网、鹤形与空间层次为原作意象的P重构。切换按钮是导览，不是常开物理传送门。'
  };
  Object.assign(G,{LUNAR:{version:'0.19.0',views,spaces,regions,descriptions,surfacePlacement:false}});
  // Independent coordinates must not inherit the older atlas 'senkai' offset.
  const oldTransform=G.DIORAMA.transform,oldPoint=G.DIORAMA.point,oldInverse=G.DIORAMA.inverse;
  G.DIORAMA.transform=(id,...args)=>regions.includes(id)?{scale:1,offset:[0,0,0]}:oldTransform(id,...args);
  G.DIORAMA.point=(p,id,...args)=>regions.includes(id)?[...p]:oldPoint(p,id,...args);
  G.DIORAMA.inverse=(p,id,...args)=>regions.includes(id)?[...p]:oldInverse(p,id,...args);

  // Closed spheroid without zero-area pole triangles; positions and normals are baked.
  function orb(g,x,y,z,rx,ry,rz,col,n=10,rings=5){
    const p=(i,j)=>{const a=i*TAU/n,b=j*Math.PI/rings;return[x+rx*Math.sin(b)*Math.cos(a),y+ry*Math.cos(b),z+rz*Math.sin(b)*Math.sin(a)];};
    for(let j=0;j<rings;j++)for(let i=0;i<n;i++){
      if(!j)g.tri(p(i,0),p(i+1,1),p(i,1),col);
      else if(j===rings-1)g.tri(p(i,j),p(i+1,j),p(i,rings),col);
      else g.quad(p(i,j),p(i+1,j),p(i+1,j+1),p(i,j+1),col);
    }
  }
  function bank(owner,space,far){
    const items=new Map();
    function get(zone,material='lunarStone',part='base',face='both',group='architecture'){
      const key=[zone,material,part,face].join(':');
      if(!items.has(key))items.set(key,{g:new G.Geometry(),zone,material,part,face,group});
      return items.get(key).g.place();
    }
    return {get,finish(){const meshes=[];for(const [key,o]of items)if(o.g.a.length)meshes.push(o.g.mesh(`${owner}:${far?'overview':'detail'}:${key}`,o.group,{owner,region:owner,space,overview:far,material:o.material,lunarZone:o.zone,lunarPart:o.part,lunarFace:o.face,basis:'P'}));return{id:owner,meshes,signs:[],bytes:meshes.reduce((s,m)=>s+m.vertices.byteLength,0),meta:{module:'lunar',version:'0.19.0',overview:far,surfaceCut:false,coordinates:'independent/P'}};}};
  }
  function roof(B,zone,x,y,z,w,d,h,far,material='lunarTile',face='both'){
    const turn=d>w?Math.PI/2:0;if(turn)[w,d]=[d,w];
    const g=B.get(zone,material,'roof',face).place(x,0,z,turn),r=B.get(zone,'lunarRidge','roof',face).place(x,0,z,turn);
    // Long ridge, dipped eave then rising roof. The ridge is not a floating bar.
    const dims=[[w/2,d/2,y+.50],[w*.45,d*.43,y-.12],[w*.29,d*.15,y+h*.63],[w*.23,.28,y+h]];
    const pts=a=>[[-a[0],a[2],-a[1]],[a[0],a[2],-a[1]],[a[0],a[2],a[1]],[-a[0],a[2],a[1]]];
    for(let k=0;k<dims.length-1;k++){const a=pts(dims[k]),b=pts(dims[k+1]);for(let i=0;i<4;i++)g.quad(a[i],b[i],b[(i+1)%4],a[(i+1)%4],C.tile);}
    const t=pts(dims.at(-1));g.quad(t[3],t[2],t[1],t[0],C.tile);
    for(const [xx,zz,ww,dd]of [[0,-d/2,w,.7],[0,d/2,w,.7],[-w/2,0,.7,d],[w/2,0,.7,d]])r.box(xx,y-.35,zz,ww,.85,dd,C.ridge);
    r.tube([-w*.23,y+h+.18,0],[w*.23,y+h+.18,0],.48,C.gold,6);
    const under=B.get(zone,'lunarWood','roof',face).place(x,0,z,turn);under.box(0,y-.40,0,w*.88,.30,d*.84,C.wood);
    if(!far){
      for(let i=0;i<4;i++)for(let j=0;j<dims.length-1;j++)r.tube(pts(dims[j])[i],pts(dims[j+1])[i],.20,C.ridge,5);
      for(let xx=-w*.21;xx<=w*.21;xx+=1.6)for(const side of[-1,1])for(let j=0;j<dims.length-1;j++){
        const a=dims[j],b=dims[j+1];r.tube([xx,a[2]+.14,side*a[1]],[xx,b[2]+.14,side*b[1]],.09,C.ridge,4);
      }
      for(const side of[-1,1]){r.tube([side*w*.23,y+h+.18,0],[side*(w*.23+1.0),y+h+1.1,0],.38,C.gold,6);r.tube([side*(w*.23+1.0),y+h+1.1,0],[side*(w*.23+.75),y+h+2.1,0],.22,C.gold,6);}
    }
    g.place();r.place();under.place();
  }
  function rail(B,zone,a,b,y){const g=B.get(zone,'lunarWood');const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/7);for(let i=0;i<=n;i++){let t=i/n,x=G.mix(a[0],b[0],t),z=G.mix(a[1],b[1],t);g.box(x,y,z,.8,3.2,.8,C.wood);}for(let dy of[1,2.7])g.tube([a[0],y+dy,a[1]],[b[0],y+dy,b[1]],.3,C.beam,5);}
  function stairs(B,zone,x,z,w,base,rise,count,depth=2){const g=B.get(zone);for(let i=0;i<count;i++)g.box(x,base,z-i*depth,w,rise*(i+1),depth+.05,C.stone);}
  function hall(B,zone,x,z,w,d,base,height,far,{open=false,double=false}={}){
    const s=B.get(zone),wall=B.get(zone,'lunarWall'),wood=B.get(zone,'lunarWood'),paper=B.get(zone,'lunarPaper');
    s.box(x,base,z,w+8,2,d+8,C.stone);s.box(x,base+2,z,w+5,1,d+5,C.edge);
    const floor=base+3,top=floor+height;
    s.box(x,floor-.2,z,w,.35,d,C.paving);
    if(far){wall.box(x,floor,z,w-1,height,d-1,C.wall);}
    else{
      const pillars=Math.max(3,Math.round(w/12)),step=w/pillars;
      for(let i=0;i<=pillars;i++)for(let side of[-1,1]){const xx=x-w/2+i*step,zz=z+side*d/2;wood.box(xx,floor,zz,1.35,height,1.35,C.wood);s.box(xx,floor,zz,2.05,.7,2.05,C.edge);}
      // Side walls have actual window apertures, lintels and back faces.
      for(let side of[-1,1]){
        const xx=x+side*w/2;wall.box(xx,floor,z,1.1,3.6,d,C.wall);wall.box(xx,top-3,z,1.1,3,d,C.wall);
        for(let zz=-d/2;zz<=d/2;zz+=6)wood.box(xx,floor+3.6,z+zz,.95,height-6.6,.45,C.wood);
      }
      for(let i=0;i<pillars;i++){
        let xx=x-w/2+(i+.5)*step;
        for(let side of[-1,1]){
          const zz=z+side*d/2;
          if(open&&side===1&&i>=Math.floor(pillars/2)-1&&i<=Math.floor(pillars/2))continue;
          wall.box(xx,floor,zz,step-1.35,3.4,.85,C.wall);
          wall.box(xx,top-3.2,zz,step-1.35,3.2,.85,C.wall);
          // Interior paper panels have depth, gaps and wood lattice in front.
          paper.box(xx,floor+3.8,zz-side*.26,step-2,height-7.6,.15,C.paper);
          for(let k=1;k<5;k++)wood.box(xx-step/2+k*step/5,floor+3.5,zz+side*.26,.24,height-6.6,.28,C.beam);
          for(let yy of[5.7,height-3.9])wood.box(xx,floor+yy,zz+side*.27,step-1,.26,.28,C.beam);
        }
      }
      for(let side of[-1,1]){wood.box(x,top-1.3,z+side*d/2,w+3,1.25,2.2,C.beam);for(let xx=x-w/2;xx<=x+w/2;xx+=6)wood.box(xx,top-.7,z+side*(d/2+.8),2.8,.50,3.4,C.wood);}
    }
    roof(B,zone,x,top+.5,z,w+12,d+12,Math.min(12,w*.13),far);
    if(double){wall.box(x,top+4,z,w*.55,9,d*.53,C.wall);roof(B,zone,x,top+13,z,w*.70,d*.70,9,far);}
    return floor;
  }
  function peach(B,x,y,z,scale,far,seed){const R=G.rng(seed),tr=B.get('orchard','lunarWood','plants','both','vegetation'),le=B.get('orchard','lunarLeaf','plants','both','vegetation');
    tr.tube([x,y,z],[x+.65*scale,y+8*scale,z],.7*scale,C.trunk,7,.36*scale);
    const n=far?2:5;
    for(let i=0;i<n;i++){const a=i*TAU/n+.4,dx=Math.cos(a)*3.7*scale,dz=Math.sin(a)*3.7*scale,yy=y+(7+R()*2.5)*scale;
      if(!far)tr.tube([x,y+4*scale,z],[x+dx,yy,z+dz],.32*scale,C.trunk,6,.12*scale);
      orb(le,x+dx,yy+1.5*scale,z+dz,3.5*scale,2.9*scale,3.2*scale,i%2?C.peach:C.blossom,far?6:10,far?3:5);
      if(!far&&i%2)orb(le,x+dx,yy-.6*scale,z+dz+2.5*scale,.55*scale,.65*scale,.5*scale,C.fruit,6,4);
    }
  }
  const coast=z=>438+Math.sin(z/160)*26+Math.sin(z/73)*9;
  const landHeight=(x,z)=>{
    const base=15+.6*Math.sin(x/160)*Math.cos(z/210),shore=coast(z);
    return x<290?base:G.mix(base,1.3,G.smooth(290,shore,x));
  };
  function city(far=false){const B=bank('lunar','lunar',far),ground=B.get('land','lunarSand','base','both','terrain'),water=B.get('sea','lunarWater','sea','both','effects');
    const n=far?18:72,m=far?24:84;
    for(let j=0;j<m;j++){const z=-1400+j*2800/m,z1=z+2800/m;
      for(let i=0;i<n;i++){const x=-1600+(coast(z)+1600)*i/n,x1=-1600+(coast(z)+1600)*(i+1)/n,xx=-1600+(coast(z1)+1600)*i/n,xx1=-1600+(coast(z1)+1600)*(i+1)/n;
        const points=[[x,landHeight(x,z),z],[xx,landHeight(xx,z1),z1],[xx1,landHeight(xx1,z1),z1],[x1,landHeight(x1,z),z]];
        for(const tri of[[0,1,2],[0,2,3]]){const normal=G.norm(G.cross(G.sub(points[tri[1]],points[tri[0]]),G.sub(points[tri[2]],points[tri[0]])));for(const index of tri){const p=points[index],t=G.smooth(267,306,p[0])*(1-G.smooth(330,420,Math.abs(p[2])))*(1-G.smooth(coast(p[2])-61,coast(p[2])-20,p[0]));ground.vertex(p,normal,G.blend(C.sand,C.garden,t));}}
      }
      const shore=B.get('shore','lunarStone','base','both','terrain');shore.quad([coast(z),1.3,z],[coast(z),-8,z],[coast(z1),-8,z1],[coast(z1),1.3,z1],C.sand);
      water.quad([coast(z)-.1,.9,z],[coast(z1)-.1,.9,z1],[3200,.9,z1],[3200,.9,z],C.water);
    }
    const distant=B.get('land','lunarSand','base','both','terrain');
    for(const side of[-1,1]){const za=side*1400,zb=side*20000,xa=coast(za),xb=coast(zb);const a=[[-1600,15,za],[xa,1.3,za],[xb,1.3,zb],[-20000,15,zb]];if(side>0)a.reverse();distant.quad(...a,C.sand);water.quad([xa,.9,za],[xb,.9,zb],[20000,.9,zb],[3200,.9,za],C.water);}
    distant.quad([-20000,15,-20000],[-20000,15,20000],[-1600,15,1400],[-1600,15,-1400],C.sand);
    water.quad([3200,.9,-1400],[3200,.9,1400],[20000,.9,20000],[20000,.9,-20000],C.water);
    const pave=B.get('avenue','lunarPaving');
    pave.box(0,15.6,-45,48,.6,565,C.paving);
    for(const x of[-27,27])pave.box(x,15.7,-45,1.2,.4,566,C.edge);
    for(const z of[-254,-52,115,212])pave.box(0,15.5,z,528,.65,18,C.paving);
    pave.box(0,15.6,-160,158,.65,175,C.paving);
    pave.box(168,15.7,-137,154,.7,184,C.paving);
    // Segmented perimeter, with a true open front entrance and east orchard exit.
    const wall=B.get('walls','lunarWall');
    for(const x of[-159,159])wall.box(x,15,225,210,17,4,C.wall);
    wall.box(0,15,-325,528,17,4,C.wall);
    wall.box(-264,15,-50,4,17,550,C.wall);
    wall.box(264,15,-223,4,17,204,C.wall);wall.box(264,15,85,4,17,280,C.wall);
    for(const [x,z,w,d]of[[-159,225,210,6],[159,225,210,6],[0,-325,536,6],[-264,-50,6,550],[264,-223,6,204],[264,85,6,280]]){B.get('walls','lunarTile','roof').box(x,32,z,w,.7,d,C.tile);B.get('walls','lunarRidge','roof').box(x,32.7,z,w*.998,.32,d*.998,C.ridge);}
    for(const x of[-260,260])for(const z of[-321,222]){B.get('towers').box(x,15,z,23,14,23,C.stone);hall(B,'towers',x,z,19,19,29,12,far,{double:true});}
    // Three open gate bays support a heavy, two-tiered gatehouse.
    const gate=B.get('gate');for(const x of[-43,-17,17,43])gate.box(x,15,225,10,20,22,C.stone);
    gate.box(0,35,225,96,4,24,C.edge);hall(B,'gate',0,225,90,24,39,13,far,{double:true});
    if(!far){for(const x of[-51,51])stairs(B,'gate',x,238,8,15,1,24,1.3);}
    // Deep, unnamed inner court, not an invented historically exact imperial palace.
    const court=B.get('court');court.box(0,16,-180,128,7,80,C.stone);
    stairs(B,'court',0,-119,42,16,1,7,2.2);
    hall(B,'court',0,-183,106,48,23,24,far,{double:true,open:true});
    for(const x of[-99])hall(B,'court',x,-176,28,66,16,13,far);
    for(const x of[-51,51])rail(B,'court',[x,-139],[x,-214],23);
    // Residential blocks: narrow row courts and wider cross-axis buildings.
    const R=G.rng(190928);
    for(let row=0;row<4;row++)for(const x0 of[-204,-129,92,192]){
      const z=154-row*81;if(x0>0&&row>1)continue;
      const w=x0<0?(row%2?42:47):50,d=23+(row%2)*5;
      hall(B,'district'+(x0<0?'West':'East'),x0,z,w,d,16,10+(row%2)*2,far);
      if(!far){
        const s=B.get(x0<0?'districtWest':'districtEast','lunarStone');s.box(x0,16,z+25,w+7,.45,20,C.paving);
        rail(B,'districtWest',[x0-w/2,z+34],[x0+w/2,z+34],16.5);
        hall(B,'districtWest',x0-w*.34,z-28,16,14,16,8,far);
      }
    }
    // Northern lane: a secondary street and service courts, not a copied imperial palace.
    for(const x of[-206,-131,-49,39,153,222])hall(B,'rearLane',x,-283,x<100?37:29,21,16,11,far);
    for(const [x,z]of[[-63,148],[-65,55],[-72,-31],[-217,-196],[-164,-205],[55,148],[220,-224],[145,-214]])peach(B,x,15,z,.88,far,Math.round(x*x+z*z));
    // Watatsuki household: front veranda, real tea room, back court and service wings.
    const floor=hall(B,'residence',173,-147,75,34,19,14,far,{open:true});
    hall(B,'residence',121,-150,18,69,16,10,far);
    hall(B,'residence',223,-153,18,76,16,10,far);
    const veranda=B.get('residence','lunarWood');veranda.box(173,19,-120,84,3,20,C.wood);
    stairs(B,'residence',173,-100,24,15.5,.9,7,1.8);
    rail(B,'residence',[132,-113],[157,-113],22);rail(B,'residence',[190,-113],[215,-113],22);
    if(!far){
      const g=B.get('residence','lunarWood','interior');
      for(let x=138;x<208;x+=4)g.box(x,22.02,-147,3.8,.11,30,C.trunk);
      for(const x of[152,194]){g.box(x,22.25,-140,12,2.5,7,C.wood);g.box(x,24.75,-140,13,.6,8,C.beam);
        for(const dx of[-3,2]){orb(B.get('residence','lunarPaper','interior'),x+dx,25.6,-140,.6,.45,.6,C.paper,8,4);}
        g.box(x,22.3,-130,9,1,3.5,C.beam);
      }
      const light=B.get('residence','lunarLamp','interior');for(const x of[148,198])light.box(x,31.5,-150,1.6,2.4,1.6,C.paper);
      // Sweeping / medicine work objects belong in the service court, not on every roof.
      const prop=B.get('daily','lunarWood','daily');for(const[x,z]of[[-103,140],[196,48],[234,-195]]){
        prop.cone(x,16,z,2.2,2.2,2.8,C.trunk,12);prop.tube([x,18,z],[x+1,22,z+1],.45,C.wood,7);
        prop.box(x+7,16,z,6,3.2,3,C.wood);prop.box(x+7,19.2,z,7,.5,4,C.beam);
      }
      // Recessed side gutters run beside roads and stop before entrances.
      const gutters=B.get('avenue','lunarWood');for(const x of[-31,31])for(let z=-250;z<200;z+=25){if([-52,115].some(p=>Math.abs(z-p)<18))continue;gutters.box(x,15.9,z,1.8,.2,13,C.dark);}
      for(let z=-260;z<=165;z+=47)for(const x of[-39,39]){
        const post=B.get('avenue','lunarWood');post.box(x,16,z,.65,6.5,.65,C.wood);post.box(x,21.5,z,2.4,.3,2.4,C.wood);post.box(x,24,z,2.7,.35,2.7,C.wood);for(const dx of[-1.0,1.0])for(const dz of[-1.0,1.0])post.box(x+dx,21.7,z+dz,.24,2.3,.24,C.wood);B.get('avenue','lunarLamp').box(x,21.8,z,1.7,2.2,1.7,C.paper);
      }
      for(const [x,z]of[[-78,113],[58,35]]){
        const g=B.get('daily','lunarWood','daily');g.box(x,16.3,z,7,2.5,7,C.wood);
        for(let i=1;i<9;i++){g.box(x-3.5+i*7/9,18.9,z,.04,.05,7,C.gold);g.box(x,18.9,z-3.5+i*7/9,7,.05,.04,C.gold);}
        for(const [dx,dz]of[[-2,-2],[-1.2,-2],[.4,-1.2],[1.2,1.2],[2,2]]){
          const pts=[[-.24,-.2],[0,-.36],[.24,-.2],[.24,.26],[-.24,.26]];for(let k=0;k<5;k++)g.tri([x+dx,19.01,z+dz],[x+dx+pts[k][0],19.01,z+dz+pts[k][1]],[x+dx+pts[(k+1)%5][0],19.01,z+dz+pts[(k+1)%5][1]],C.gold);
        }
        for(const side of[-1,1])g.box(x,16,z+side*6,9,2.0,2.4,C.wood);
      }
    }
    // A continuous land path exits the east wall into the orchard and coast.
    const path=B.get('orchard','lunarPaving');for(let x=256;x<434;x+=4)path.box(x,landHeight(x,-104)-.18,-104,4.12,.65,10,C.paving);
    for(let j=0;j<6;j++)for(let i=0;i<5;i++){
      const x=291+i*28+(j%2)*6,z=-276+j*61;
      if(Math.abs(z+104)<21)continue;
      peach(B,x,landHeight(x,z),z,.95+R()*.35,far,1900+j*5+i);
    }
    for(let i=0;i<16;i++){const z=-335+i*38,x=coast(z)-19;peach(B,x,landHeight(x,z),z,.65,far,2300+i);}
    if(!far){
      const shore=B.get('shore');for(let i=0;i<45;i++){const z=-480+i*22,x=coast(z)-3;orb(shore,x,1.5,z,2.7,1.8,2.1,C.sand,8,4);}

    }
    const out=B.finish();out.meta.locations=['lunar_capital','watatsuki','fertility','lunar_peaches'];out.meta.layout='SSiB/CiLR exterior selection, all architecture P';return out;
  }
  function sea(far=false){const B=bank('tranquility','lunarsea',far);
    const outer=B.get('craters','lunarBasalt','base','outer','terrain'),inner=B.get('shore','lunarSand','base','inner','terrain'),water=B.get('sea','lunarWater','sea','inner','effects');
    const craters=[[-20,-10,144],[227,138,68],[-287,-227,92],[385,-410,175],[-466,301,111]];
    const h=(x,z)=>{let y=3+3*Math.sin(x/171)*Math.cos(z/143);for(const[cx,cz,r]of craters){let t=Math.hypot(x-cx,z-cz)/r;y-=25*Math.exp(-t*t*2.6);y+=12*Math.exp(-(((t-1)/.18)**2));}return y;};
    const n=far?28:126,size=3400;for(let j=0;j<n;j++)for(let i=0;i<n;i++){
      const x=-size/2+i*size/n,z=-size/2+j*size/n,a=[x,h(x,z),z],b=[x,h(x,z+size/n),z+size/n],c=[x+size/n,h(x+size/n,z+size/n),z+size/n],d=[x+size/n,h(x+size/n,z),z];
      outer.quad(a,b,c,d,((a[1]+b[1]+c[1]+d[1])/4)>9?C.dust:C.basalt);
    }
    for(let side=0;side<4;side++)for(let i=0;i<n;i++){let u=-size/2+i*size/n,v=u+size/n;const rot=(x,z)=>{for(let k=0;k<side;k++)[x,z]=[-z,x];return[x,z];};let a=rot(u,-size/2),b=rot(v,-size/2),c=rot(v*12,-size*6),d=rot(u*12,-size*6);outer.quad([a[0],h(...a),a[1]],[b[0],h(...b),b[1]],[c[0],h(...c),c[1]],[d[0],h(...d),d[1]],C.basalt);}
    const N=far?24:110;for(let j=0;j<N;j++){
      const z=-1800+j*3600/N,z1=z+3600/N,x=-165+42*Math.sin(z/137),x1=-165+42*Math.sin(z1/137);
      inner.quad([-2500,24,z],[-2500,24,z1],[x1,1.1,z1],[x,1.1,z],C.sand);
      water.quad([x,.8,z],[x1,.8,z1],[3000,.8,z1],[3000,.8,z],C.water);
    }
    // Extend the mutually exclusive inner chart beyond fog; no rectangular sea cutout.
    for(const side of[-1,1]){const z=side*1800,x=-165+42*Math.sin(z/137),farZ=side*20000;
      inner.quad([-2500,24,z],[x,1.1,z],[x,1.1,farZ],[-20000,24,farZ],C.sand);
      water.quad([x,.8,z],[3000,.8,z],[20000,.8,farZ],[x,.8,farZ],C.water);
    }
    inner.quad([-2500,24,-1800],[-2500,24,1800],[-20000,24,20000],[-20000,24,-20000],C.sand);
    water.quad([3000,.8,-1800],[3000,.8,1800],[20000,.8,20000],[20000,.8,-20000],C.water);
    if(!far){const R=G.rng(19915);for(let i=0;i<70;i++){
      let x=(R()-.5)*1150,z=(R()-.5)*1100,r=.8+R()*3.2;
      orb(B.get('stones','lunarBasalt','base','outer'),x,h(x,z),z,r,r*.6,r*.85,C.basalt,7,4);
    }}
    const out=B.finish();out.meta.locations=['tranquility'];out.meta.mutuallyExclusive=['inner','outer'];return out;
  }
  function dream(far=false){const B=bank('kaian','dream',far),g=B.get('passage','lunarLattice','base','both','effects');
    const frames=far?8:18;
    const point=(k,x,y)=>{const a=.18*Math.sin(k*.62),cx=Math.sin(k*.39)*39,cy=60+Math.cos(k*.46)*17,z=350-k*800/(frames-1);return[cx+Math.cos(a)*x-Math.sin(a)*y,cy+Math.sin(a)*x+Math.cos(a)*y,z];};
    for(let k=0;k<frames;k++){
      const r=125;for(const side of[-1,1]){
        g.tube(point(k,-r,side*r),point(k,r,side*r),.31,C.lattice,4);
        g.tube(point(k,side*r,-r),point(k,side*r,r),.31,C.lattice,4);
        if(k<frames-1)for(let i=0;i<=8;i++){const t=-r+i*r/4;g.tube(point(k,t,side*r),point(k+1,t,side*r),.24,C.lattice,4);g.tube(point(k,side*r,t),point(k+1,side*r,t),.24,C.lattice,4);}
      }
    }
    const mist=B.get('dreamMist','lunarDream','base','both','effects');
    // A translucent ribbon, not a claimed walkable road or permanent teleport.
    for(let i=0;i<(far?16:80);i++){const n=far?16:80,z=420-i*900/n,z1=420-(i+1)*900/n;const x=40*Math.sin(z/180),x1=40*Math.sin(z1/180),y=24+16*Math.sin(z/200),y1=24+16*Math.sin(z1/200);
      mist.quad([x-20,y,z],[x1-20,y1,z1],[x1+20,y1,z1],[x+20,y,z],C.crane);
    }
    if(!far){const c=B.get('cranes','lunarCrane','base','both','effects');for(let i=0;i<9;i++){
      const x=Math.sin(i*2)*65,y=56+(i%3)*22,z=300-i*88,s=7+i%3;
      c.tri([x-s,y,z],[x,y+2,z-s],[x+s,y,z],C.crane);c.tri([x,y+2,z-s],[x-s,y,z],[x-s*4,y+s*1.8,z+s],C.crane);
      c.tri([x+s,y,z],[x,y+2,z-s],[x+s*4,y+s*1.8,z+s],C.crane);c.tri([x,y+2,z-s],[x,y+s*1.5,z-s*2],[x+1.2,y,z-s*.5],C.crane);
      c.tri([x,y+s*1.5,z-s*2],[x,y+s*1.2,z-s*3],[x+1.2,y+s,z-s*2],C.gold);
    }}
    const out=B.finish();out.meta.locations=['kaian'];out.meta.fullDreamWorld=false;return out;
  }
  Object.assign(G,{buildLunarCity:city,buildLunarSea:sea,buildKaian:dream,buildLunarOverviews:()=>[city(true),sea(true),dream(true)]});
  const previous=G.buildRegion;
  G.buildRegion=async function(data,id,legacy){const start=performance.now();let p=id==='lunar'?city():id==='tranquility'?sea():id==='kaian'?dream():null;if(p){p.builtMs=performance.now()-start;return p;}return previous(data,id,legacy);};
})(globalThis.GA);
