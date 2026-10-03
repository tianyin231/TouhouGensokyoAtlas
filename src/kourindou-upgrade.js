/* Kourindou visual pilot, 2026-10-02. Existing v0.14 site and navigation retained.
 * Shop, white kura and covered link keep their original footprint and height.
 * New back elevations, structural joints, garden and materials are authored P.
 * The legacy forest builder stays intact; only its Kourindou component is replaced.
 */
(function (G) {
'use strict';
const ID='kourindou', X=-560, Y=45, Z=0, TAU=Math.PI*2;
const C=Object.fromEntries(Object.entries({
 plaster:'#d9d5c5',lime:'#e0ddcc',wood:'#786045',beam:'#65513b',end:'#534936',
 roof:'#526364',ridge:'#485858',stone:'#969a8b',stoneDark:'#737d71',
 paper:'#d2ccb1',recess:'#81776a',iron:'#4d5956',clay:'#93806a',
 soil:'#8d896f',gravel:'#b2ad97',leaf:'#73854e',bark:'#80715a'
}).map(([k,v])=>[k,G.rgb(v)]));
// Contact transfer covers new footings/planting and inspection path only.
// Existing tree matrices are retained without resampling the full style zone.
const bounds=[-648,-67,-503,68];
const localWeight=(x,z)=>1-G.smooth(.65,1,Math.hypot((x-X)/120,(z+6)/101));
const bytes=meshes=>{const seen=new Set();let n=0;for(const m of meshes)for(const k of ['vertices','farVertices','instances','instanceColors','index'])if(m[k]&&!seen.has(m[k].buffer)){seen.add(m[k].buffer);n+=m[k].buffer.byteLength;}return n;};
function bank(far=false) {
 const bins=new Map();
 return {
  get(material,part='structure') {
   const key=material+':'+part;
   if(!bins.has(key))bins.set(key,{g:new G.Geometry(),material,part});
   return bins.get(key).g.place(X,Y,Z);
  },
  reset() {for(const {g} of bins.values())g.place(X,Y,Z);},
  finish(meta={}) {
   const meshes=[];
   for(const [key,{g,material,part}] of bins)if(g.a.length)meshes.push(g.mesh('kourindou:upgrade:'+(far?'far:':'near:')+key,'architecture',{
    owner:'forest',region:'forest',space:'surface',component:ID,locationId:ID,overview:far,
    material:'kourindou'+material,kourindouPart:part,basis:'P',
    ...(part==='props'?{lod:'props',maxDetailDistance:115}:{})
   }));
   return {meshes,bytes:bytes(meshes),meta,signs:[]};
  }
 };
}
function beam(g,a,b,r,col=C.beam,sides=6){if(G.length(G.sub(a,b))>1e-5)g.tube(a,b,r,col,sides,r);}
// Clipped corners and a narrow top bevel, used only where silhouettes warrant it.
function dressed(g,x,y,z,w,h,d,e,col=C.stone) {
 const ring=(yy,inset)=>[[-w/2+e,-d/2],[w/2-e,-d/2],[w/2,-d/2+e],[w/2,d/2-e],[w/2-e,d/2],[-w/2+e,d/2],[-w/2,d/2-e],[-w/2,-d/2+e]].map(([a,b])=>[x+a*(1-inset),yy,z+b*(1-inset)]);
 const A=ring(y,0),B=ring(y+h-Math.min(.06,h*.25),0),T=ring(y+h,.035);
 for(let i=0;i<8;i++){let j=(i+1)%8;g.quad(A[i],A[j],B[j],B[i],col);g.quad(B[i],B[j],T[j],T[i],col);}
 for(let i=1;i<7;i++){g.tri(T[0],T[i+1],T[i],col);g.tri(A[0],A[i],A[i+1],col);}
}
// Genuine openings: construct only the occupied wall rectangles, not a solid box.
function facade(B,cx,cz,w,y0,h,angle,holes,lime=false) {
 const wall=B.get('Plaster').place(X+cx,Y,Z+cz,angle);
 const xs=[-w/2,w/2,...holes.flatMap(o=>[o.x-o.w/2,o.x+o.w/2])].sort((a,b)=>a-b);
 const ys=[y0,y0+h,...holes.flatMap(o=>[o.y,o.y+o.h])].sort((a,b)=>a-b);
 for(let i=0;i<xs.length-1;i++)for(let j=0;j<ys.length-1;j++){
  const a=xs[i],b=xs[i+1],c=ys[j],d=ys[j+1];
  if(b-a<.005||d-c<.005||holes.some(o=>(a+b)/2>o.x-o.w/2&&(a+b)/2<o.x+o.w/2&&(c+d)/2>o.y&&(c+d)/2<o.y+o.h))continue;
  wall.box((a+b)/2,c,0,b-a,d-c,.34,lime?C.lime:C.plaster);
 }
 const vertical=B.get('WoodY').place(X+cx,Y,Z+cz,angle),horizontal=B.get('WoodX').place(X+cx,Y,Z+cz,angle);
 for(const o of holes){
  for(const s of [-1,1])vertical.box(o.x+s*(o.w/2+.035),o.y-.05,.035,.16,o.h+.14,.52,C.beam);
  for(const yy of [o.y-.10,o.y+o.h-.025])horizontal.box(o.x,yy,.035,o.w+.28,.14,.56,C.beam);
  if(o.type==='door')continue;
  // Inset shutters/paper sit behind an open reveal. The wall does not cross them.
  const panel=B.get(o.type==='shutter'?'WoodY':'Paper').place(X+cx,Y,Z+cz,angle);
  panel.box(o.x,o.y+.06,-.17,o.w-.17,o.h-.12,.06,o.type==='shutter'?C.end:C.paper);
  const n=Math.max(2,Math.round(o.w/.42));for(let i=1;i<n;i++)vertical.box(o.x-o.w/2+i*o.w/n,o.y,.085,.04,o.h,.07,C.beam);
  for(let yy=o.y+.50;yy<o.y+o.h;yy+=.58)horizontal.box(o.x,yy,.085,o.w,.043,.08,C.beam);
 }
 B.reset();
}
function roof(B,cx,cz,w,d,y,rise,far,hip=false) {
 const tile=B.get('Roof','roof'),under=B.get('WoodZ','roofUnder'),edge=B.get('WoodX','eaves'),ridge=B.get('Roof','ridge');
 const H=t=>y+rise*(1-t)+.24*t*t*t*t*t;
 // Main pitches. Each tile is one shallow convex clay surface, with row overlap.
 const N=far?Math.ceil(d/2/1.3):Math.ceil(d/2/.58),step=far?1.25:.58,profile=far?2:4;
 for(const side of [-1,1])for(let j=0;j<N;j++){
  const t=j/N,u=(j+1)/N,halfA=w*.5*(hip?.60+.40*t:1),halfB=w*.5*(hip?.60+.40*u:1);
  const P=(xx,tt,off=0)=>[cx+xx,H(tt)+off,cz+side*d*.5*tt];
  under.quad(P(-halfA,t,-.19),P(halfA,t,-.19),P(halfB,u,-.19),P(-halfB,u,-.19),C.end);
  // Continuous clay bedding closes the slivers at the clipped hip tiles.
  tile.quad(P(-halfA,t,.004),P(-halfB,u,.004),P(halfB,u,.004),P(halfA,t,.004),C.roof);
  for(let start=-w/2;start<w/2;start+=step){
   const end=Math.min(start+step-.012,w/2),a0=Math.max(start,-halfA),a1=Math.min(end,halfA),b0=Math.max(start,-halfB),b1=Math.min(end,halfB);
   if(a1-a0<.025||b1-b0<.025)continue;
   const col=G.blend(C.roof,C.ridge,.08+.07*Math.sin(start*3.1+j*.71));
   const top=(xx,tt,q)=>P(xx,tt,.02+.095*(tt-t)/(u-t)+.040*Math.sin(q*Math.PI));
   for(let k=0;k<profile;k++){
    const q=k/profile,Q=(k+1)/profile,A=top(G.mix(a0,a1,q),t,q),D=top(G.mix(a0,a1,Q),t,Q),E=top(G.mix(b0,b1,Q),u,Q),F=top(G.mix(b0,b1,q),u,q);
    if(side===1)tile.quad(D,A,F,E,col);else tile.quad(A,D,E,F,col);
   }
   if(!far){const A=P(b0,u,.115),D=P(b1,u,.115);tile.quad(A,D,[D[0],D[1]-.10,D[2]],[A[0],A[1]-.10,A[2]],C.ridge);}
  }
 }
 // Hipped ends, not the large unarticulated triangles of the previous proxy.
 if(hip)for(const sign of [-1,1]){
  const rows=far?5:12;
  for(let j=0;j<rows;j++){
   const t=j/rows,u=(j+1)/rows,A=w*(.30+.20*t),E=w*(.30+.20*u),zs=d*.5*t,zf=d*.5*u;
   const P=(xx,zz,tt,off=0)=>[cx+sign*xx,H(tt)+off,cz+zz];
   if(j===0){tile.tri(P(A,0,t,.035),P(E,zf,u,.035),P(E,-zf,u,.035),C.roof);under.tri(P(A,0,t,-.19),P(E,-zf,u,-.19),P(E,zf,u,-.19),C.end);}
   else {tile.quad(P(A,-zs,t,.035),P(A,zs,t,.035),P(E,zf,u,.035),P(E,-zf,u,.035),C.roof);under.quad(P(A,-zs,t,-.19),P(E,-zf,u,-.19),P(E,zf,u,-.19),P(A,zs,t,-.19),C.end);}
   if(!far&&j>0)beam(ridge,P(E,-zf,u,.08),P(E,zf,u,.08),.032,C.ridge,4);
  }
  for(const side of [-1,1])beam(ridge,[cx+sign*w*.30,y+rise+.08,cz],[cx+sign*w*.50,y+.32,cz+side*d*.5],.105,C.ridge,far?4:7);
  edge.box(cx+sign*w*.5,y-.10,cz,.23,.34,d,C.beam);
 } else {
  const gable=B.get('WoodY','gable');
  for(const sign of [-1,1]){
   const x=cx+sign*(w/2-.58);gable.tri([x,y-.18,cz-d/2+.4],[x,y+rise-.19,cz],[x,y-.18,cz+d/2-.4],C.end);
   for(const side of [-1,1])beam(edge,[cx+sign*w/2,y+.14,cz+side*d*.5],[cx+sign*w/2,y+rise+.09,cz],.13,C.beam,far?4:7);
   if(!far)for(let zz=-d/2+.9;zz<d/2-.9;zz+=.5){const h=rise*(1-Math.abs(zz)/(d/2));gable.box(x+sign*.028,y-.14,cz+zz,.09,h-.08,.085,C.wood);}
  }
 }
 for(const side of [-1,1]){
  edge.box(cx,y-.10,cz+side*d/2,w,.31,.25,C.beam);
  tile.box(cx,y+.15,cz+side*d/2,w,.14,.19,C.ridge);
  if(!far)for(let xx=-w/2+.30;xx<w/2;xx+=.65)under.box(cx+xx,y-.32,cz+side*(d/2-.55),.13,.14,1.25,C.wood);
 }
 const rw=w*(hip?.61:1.02);ridge.box(cx,y+rise+.04,cz,rw,.17,.58,C.ridge);
 for(let i=0;i<(far?6:10);i++){const a=i*Math.PI/(far?6:10),b=(i+1)*Math.PI/(far?6:10);ridge.quad([cx-rw/2,y+rise+.18+Math.sin(a)*.20,cz+Math.cos(a)*.33],[cx+rw/2,y+rise+.18+Math.sin(a)*.20,cz+Math.cos(a)*.33],[cx+rw/2,y+rise+.18+Math.sin(b)*.20,cz+Math.cos(b)*.33],[cx-rw/2,y+rise+.18+Math.sin(b)*.20,cz+Math.cos(b)*.33],C.roof);}
}
function awning(B,far) {
 const tile=B.get('Roof','roof'),g=B.get('WoodZ','roofUnder'),beamG=B.get('WoodX'),N=far?5:11,c=-5,w=27;
 const H=z=>4.79-.135*(z-6.2)+.12*Math.pow((z-6.2)/7.4,5);
 for(let j=0;j<N;j++){
  const za=6.2+j*7.4/N,zb=6.2+(j+1)*7.4/N;
  g.quad([c-w/2,H(za)-.18,za],[c+w/2,H(za)-.18,za],[c+w/2,H(zb)-.18,zb],[c-w/2,H(zb)-.18,zb],C.end);
  for(let x=c-w/2;x<c+w/2;x+=far?1.2:.57){const e=Math.min(x+(far?1.18:.555),c+w/2);for(let k=0;k<4;k++){const a=k/4,b=(k+1)/4,P=(q,z)=>[G.mix(x,e,q),H(z)+.02+.095*(z-za)/(zb-za)+.040*Math.sin(q*Math.PI),z];tile.quad(P(b,za),P(a,za),P(a,zb),P(b,zb),C.roof);}}
 }
 beamG.box(c,H(13.6)-.23,13.6,w,.27,.25,C.beam);beamG.box(c,H(12)-.45,12.0,25.0,.27,.28,C.beam);
 for(let x=-17.2;x<8;x+=far?2.7:.65){beam(g,[x,H(7.0)-.32,7],[x,H(13.6)-.28,13.6],.067,C.wood,4);}
 const posts=B.get('WoodY'),base=B.get('Stone','foundation');const feet=[];
 for(const x of [-17.2,-9.0,1.9,7.2]){
  dressed(base,x,-.17,12.0,.67,.88,.67,.08);posts.box(x,.71,12.0,.27,H(12)-.18-.71,.27,C.beam);feet.push([X+x,Y-.17,12]);
  for(const s of [-1,1])beam(posts,[x,H(12)-.90,12],[x+s*.67,H(12)-.2,12],.067,C.wood,5);
 }
 return feet;
}
function vessel(g,x,y,z,r,h,col,far=false){const N=far?8:12,rings=[.62,.85,1,.87,.49,.46],P=(i,j)=>[x+Math.cos(i*TAU/N)*r*rings[j],y+h*j/(rings.length-1),z+Math.sin(i*TAU/N)*r*rings[j]];
 for(let j=0;j<rings.length-1;j++)for(let i=0;i<N;i++)g.quad(P(i,j),P((i+1)%N,j),P((i+1)%N,j+1),P(i,j+1),col);
 for(let i=0;i<N;i++)g.tri([x,y+.88*h,z],P((i+1)%N,rings.length-1),P(i,rings.length-1),G.blend(col,C.recess,.25));
}
function architecture(far=false) {
 const B=bank(far),stone=B.get('Stone','foundation'),floor=B.get('WoodZ','deck'),frame=B.get('WoodY'),horizontal=B.get('WoodX');
 // Same shop footprint: centre(-5,-1), 22x16; no terrain flattening.
 dressed(stone,-5,-.50,-1,23,1.20,18,.17,C.stoneDark);
 floor.box(-5,.64,-1,21.65,.16,15.65,C.wood);
 const windows=[{x:-6,y:1.65,w:5.2,h:2.85},{x:7,y:1.65,w:4.6,h:2.85}];
 facade(B,-5,7,22,.72,5.43,0,[...windows,{x:1,y:.72,w:4.9,h:3.95,type:'door'}]);
 facade(B,-5,-9,22,.72,5.43,Math.PI,[{x:-6,y:2.1,w:3.0,h:2.1},{x:3,y:.72,w:2.2,h:3.2,type:'door'}]);
 facade(B,-16,-1,16,.72,5.43,-Math.PI/2,[{x:-3.7,y:2.1,w:2.7,h:2.1},{x:3.7,y:2.1,w:2.7,h:2.1}]);
 facade(B,6,-1,16,.72,5.43,Math.PI/2,[{x:-4,y:2.1,w:2.7,h:2.1},{x:4,y:2.1,w:2.7,h:2.1}]);
 for(const x of [-15.9,-10.1,-6.5,-1.5,5.9])frame.box(x,.70,7.12,.19,5.51,.22,C.beam);
 for(const x of [-15.9,5.9])for(const z of [-8.9,7.0])frame.box(x,.68,z,.26,5.58,.26,C.beam);
 for(const z of [-9.12,7.17])for(const y of [.82,5.88])horizontal.box(-5,y,z,22.4,.21,.22,C.beam);
 // Horizontal weatherboards under windows; boards stop at the doorway.
 const boards=B.get('WoodX','siding');for(const [a,b]of [[-15.8,-6.55],[-1.45,5.8]])for(let y=.83;y<1.59;y+=.21)boards.box((a+b)/2,y,7.20,b-a,.184,.09,C.wood);
 // A shallow, physically open shop room; not a false opening pasted onto a box.
 const room=B.get('Recess','recess');room.box(-4,.78,2.18,7.2,4.73,.22,C.recess);
 room.box(-7.45,.78,4.46,.20,4.60,4.3,C.recess);room.box(-.53,.78,4.46,.20,4.60,4.3,C.recess);
 const shelf=B.get('WoodX','shelves');for(const yy of [1.15,2.24,3.33])shelf.box(-4,yy,2.88,5.75,.14,1.05,C.wood);
 for(const x of [-6.9,-1.1])frame.box(x,.81,2.94,.14,3.62,.14,C.beam);
 // Sliding panel parked alongside the door; centre remains open from porch to bay.
 const shutter=B.get('WoodY','shutter');shutter.box(-.92,.79,7.02,.78,3.87,.14,C.end);
 for(let x=-1.22;x<-.5;x+=.13)shutter.box(x,.82,7.13,.05,3.77,.04,C.wood);
 // Closed rear service door has thickness and a raised threshold.
 shutter.box(-8,.79,-8.92,2.0,3.06,.13,C.end);dressed(stone,-8,.1,-9.65,2.65,.40,1.3,.12);
 roof(B,-5,-1,26,22,6.15,4.2,far,true);
 // Timber porch: visible under-floor beams, stone feet and three supported steps.
 const deck=B.get('WoodZ','deck');deck.box(-5,.46,10.4,26,.26,5.7,C.end);
 if(far)deck.box(-5,.72,10.4,26,.12,5.7,C.wood);else for(let x=-17.8;x<7.8;x+=.55)deck.box(x,.72,10.4,.525,.12,5.7,C.wood);
 const feet=awning(B,far);for(const x of [-16,-7,2,6])dressed(stone,x,-.26,8.0,.56,.86,.56,.06,C.stoneDark);
 for(let i=0;i<3;i++)dressed(stone,-4,-.18,13.8+i*.83,3.3+i*.36,.82-i*.20,1.0,.13);
 for(let i=0;i<8;i++)dressed(stone,-4+G.smooth(0,7,i)*4,0,16.55+i*1.25,2.5,.15,.95,.15,G.blend(C.stone,C.plaster,.13));
 // Kura: genuine deep door and window recesses on a complete four-sided shell.
 dressed(stone,15,-.48,-7,11.25,1.0,14.1,.18,C.stoneDark);
 facade(B,15,-.30,10.5,.52,7.88,0,[{x:0,y:.52,w:3.15,h:4.2,type:'door'},{x:0,y:5.65,w:2.05,h:1.6,type:'shutter'}],true);
 facade(B,15,-13.70,10.5,.52,7.88,Math.PI,[{x:0,y:5.65,w:1.9,h:1.6,type:'shutter'}],true);
 facade(B,9.75,-7,13.4,.52,7.88,-Math.PI/2,[{x:-2.9,y:5.65,w:1.55,h:1.60,type:'shutter'}],true);
 facade(B,20.25,-7,13.4,.52,7.88,Math.PI/2,[{x:2.9,y:5.65,w:1.55,h:1.60,type:'shutter'}],true);
 const kuraDoor=B.get('WoodY','kuraDoor');kuraDoor.box(15,.56,-.58,2.94,4.03,.13,C.end);
 for(let x=13.57;x<16.48;x+=.29)kuraDoor.box(x,.59,-.49,.265,3.94,.055,C.wood);
 const metal=B.get('Iron','hardware');for(const x of [13.77,16.20])for(const y of [1.22,3.77])metal.box(x,y,-.41,.30,.085,.05,C.iron);
 for(const x of [14.71,15.29])metal.box(x,2.28,-.38,.05,.28,.065,C.iron);
 const lime=B.get('Plaster','kuraTrim');for(const y of [2.1,4.45,7.2])for(const z of [-.19,-13.81])lime.box(15,y,z,10.55,.11,.12,G.blend(C.lime,C.stone,.16));
 for(const x of [9.63,20.37])for(const z of [-.18,-13.82])lime.box(x,.5,z,.28,7.92,.30,C.lime);
 roof(B,15,-7,13.1,16,8.4,3.45,far,false);
 dressed(stone,15,-.16,.51,3.7,.49,1.27,.12);
 // Covered link has two rows of posts and under-floor bearing stones.
 deck.box(7.7,.50,1,8.3,.25,4.5,C.wood);
 for(const x of [4.0,11.0])for(const z of [-.85,2.85]){dressed(stone,x,-.20,z,.48,.87,.48,.06,C.stoneDark);frame.box(x,.70,z,.20,3.25,.20,C.beam);}
 for(const z of [-.85,2.85])horizontal.box(7.5,3.78,z,8.0,.20,.24,C.wood);
 roof(B,7.6,1,9.2,5.7,3.95,1.2,far,false);
 // Base drainage stones, broken at doors. Small details are not the massing.
 if(!far){for(const x of [-16.65,21])for(let z=-13;z<7;z+=.86)if(x<0&&z<-9.8)continue;else dressed(stone,x,-.02,z,.55,.20,.74,.08,G.blend(C.stone,C.stoneDark,.15));}
 const props=B.get('Clay','props'),woodProps=B.get('WoodY','props');
 for(let i=0;i<3;i++){
  vessel(woodProps,-17.25+i*1.35,.84,10.1,.45,.87,C.wood,far);
  if(!far)for(const y of [1.0,1.54])for(let j=0;j<14;j++){const a=j*TAU/14,b=(j+1)*TAU/14;beam(metal,[-17.25+i*1.35+Math.cos(a)*.44,y,10.1+Math.sin(a)*.44],[-17.25+i*1.35+Math.cos(b)*.44,y,10.1+Math.sin(b)*.44],.024,C.iron,4);}
 }
 if(!far){
  for(let j=0;j<3;j++)for(let i=0;i<5;i++){const x=-6.1+i*.98,y=1.3+j*1.09;if((i+j)%3===0)vessel(props,x,y,2.86,.20,.54,G.blend(C.clay,C.paper,i*.08));else for(let k=0;k<3;k++)props.box(x,y+k*.11,2.89,.61,.085,.39,G.blend(C.paper,C.clay,.13+k*.15));}
  const wheel=B.get('WoodX','props');for(let i=0;i<28;i++){const a=i*TAU/28,b=(i+1)*TAU/28;beam(wheel,[6.5+Math.cos(a)*1.08,1.97+Math.sin(a)*1.08,10.50],[6.5+Math.cos(b)*1.08,1.97+Math.sin(b)*1.08,10.50],.072,C.beam,6);}
  for(let i=0;i<8;i++){const a=i*TAU/8;beam(wheel,[6.5,1.97,10.5],[6.5+Math.cos(a)*1.05,1.97+Math.sin(a)*1.05,10.5],.045,C.wood,5);}
  beam(wheel,[6.5,1.97,10.3],[6.5,1.97,10.7],.16,C.beam,8);
  for(let i=0;i<3;i++){const x=2+i*.7;beam(woodProps,[x,.84,10.8],[x-.17,3.22,10.7],.029,C.beam,5);props.cone(x-.17,2.13,10.7,.31,.045,1.03,G.blend(C.paper,C.clay,.46),9);}
 }
 const pack=B.finish({id:ID,visualRevision:1,basis:'P',origin:[X,Y,Z],shopFootprint:[22,16],kuraFootprint:[10.5,13.4],porchFeet:feet,
  openDoor:{x:X-4,z:7,y:Y+.84,width:4.9,depth:4.6},fullInterior:false,terrainMutation:false});
 if(!far){
  const coarse=architecture(true),key=m=>m.material+':'+m.kourindouPart;
  for(const m of pack.meshes){const other=coarse.meshes.find(n=>key(n)===key(m));if(!other)continue;
   m.farVertices=other.vertices;m.lodDistance=165;
   const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
   for(const a of [m.vertices,m.farVertices])for(let i=0;i<a.length;i+=9)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],a[i+k]);hi[k]=Math.max(hi[k],a[i+k]);}
   m.center=lo.map((v,k)=>(v+hi[k])/2);m.radius=G.length(G.sub(hi,lo))/2+.02;
  }
  pack.bytes=bytes(pack.meshes);
 }
 return pack;
}

// Deciduous garden trees use branch sprays and the existing alpha-cut leaf mask.
// No new texture or light is needed; the shrine's tree sites and materials are untouched.
function card(g,p,w,h,a,tilt,c=[1,1,1]){
 const u=[Math.cos(a)*w/2,0,Math.sin(a)*w/2],v=[Math.sin(a)*Math.cos(tilt)*h/2,Math.sin(tilt)*h/2,-Math.cos(a)*Math.cos(tilt)*h/2],n=G.norm(G.cross(u,v));
 const ps=[G.sub(G.sub(p,u),v),G.sub(G.add(p,u),v),G.add(G.add(p,u),v),G.add(G.sub(p,u),v)],normal=G.norm([n[0]*.55,Math.abs(n[1])+.38,n[2]*.55]);
 for(const i of [0,1,2,0,2,3])g.vertex(ps[i],normal,c);
}
const treeCache=new Map();
function tree(variant,far=false){
 const key=variant+':'+far;if(treeCache.has(key))return treeCache.get(key);
 const wood=new G.Geometry(),leaf=new G.Geometry(),R=G.rng(9241+variant*601),H=12.6+variant*.65,lean=(R()-.5)*.75;
 beam(wood,[0,-.18,0],[lean,H*.46,.2],.41,C.bark,far?5:8);wood.tube([lean,H*.46,.2],[lean*.6,H-.8,0],.22,C.bark,far?4:7,.045);
 const spray=(center,radius,count)=>{
  for(let j=0;j<count;j++){
   const aa=j*2.399+R(),rr=Math.sqrt(R())*radius*.76;
   const p=[center[0]+Math.cos(aa)*rr,center[1]+(R()-.5)*radius*1.3,center[2]+Math.sin(aa)*rr];
   const w=radius*(1.52+R()*.32),yaw=R()*TAU,tilt=.35+R()*1.15,shade=.85+R()*.17;
   if(far?j%4:j%2)continue;
   card(leaf,p,w*(far?1.20:.98),w*.95*(far?1.20:.98),yaw,tilt,[shade,shade,shade]);
  }
 };
 for(let i=0;i<8;i++){
  // Broad lower boughs and a narrower upper crown; keep the same RNG/card count.
  const a=i*2.399+R()*.65,r=4.2-i*.18+R()*.80,y=7.0+i*.43+R()*.80+.35*Math.sin(variant*.8+i*.9),base=[lean,3.65+i*.40,0],elbow=[Math.cos(a)*r*.50,y-1.20,Math.sin(a)*r*.50];
  wood.tube(base,elbow,.17,C.bark,far?3:5,.09);
  for(let fork=0;fork<3;fork++){
   const aa=a+(fork-1)*.49,reach=r+.35+R()*.55,end=[Math.cos(aa)*reach,y+fork*.40+R()*.60,Math.sin(aa)*reach];
   wood.tube(elbow,end,.075,C.bark,far?3:4,.013);spray(end,1.35+R()*.20,15);
  }
 }
 spray([lean,H,0],1.65,24);
 for(let j=0;j<5;j++){const a=j*TAU/5;wood.tube([Math.cos(a)*1.15,-.10,Math.sin(a)*1.15],[0,.72,0],.045,C.bark,far?3:5,.20);}
 const result={wood:wood.mesh('wood').vertices,leaf:leaf.mesh('leaf').vertices};treeCache.set(key,result);return result;
}
function instanceBounds(matrices,arrays){const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(const a of arrays)for(let i=0;i<a.length;i+=9)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],a[i+k]);hi[k]=Math.max(hi[k],a[i+k]);}
 const L=[Infinity,Infinity,Infinity],H=[-Infinity,-Infinity,-Infinity];for(let i=0;i<matrices.length;i+=16)for(let c=0;c<8;c++){const p=G.transform(matrices.subarray(i,i+16),lo.map((v,k)=>c&(1<<k)?hi[k]:v));for(let k=0;k<3;k++){L[k]=Math.min(L[k],p[k]);H[k]=Math.max(H[k],p[k]);}}
 return {center:L.map((v,k)=>(v+H[k])/2),radius:G.length(G.sub(H,L))/2+.05};
}
function publicEnvironment(data,pack){
 G.SurfaceContact.prepare(data,pack,ID,bounds);
 const near=G.SurfaceContact.sampler(data,ID),far=G.SurfaceContact.sampler(data,ID,'far'),ground=(x,z)=>Math.min(near.height(x,z),far.height(x,z));
 const groups=new Map(),oldMatrices=[],newSites=[],occupied=[];
 for(const m of pack.meshes)if(m.globalSurface&&m.group==='vegetation'&&m.instances)for(let i=0;i<m.instances.length;i+=16)occupied.push([m.instances[i+12],m.instances[i+14]]);
 const add=(ma,color,key)=>{if(!groups.has(key))groups.set(key,{matrices:[],colors:[],variant:Math.abs(Math.floor(ma[12]*.13+ma[14]*.27))%3});const b=groups.get(key);b.matrices.push(...ma);b.colors.push(...color);occupied.push([ma[12],ma[14]]);};
 const replacement=[];
 for(const m of pack.meshes){
  if(!m.globalSurface||m.component!=='transition-vegetation'||!m.instances||!/(broad|broadleaf)/.test(m.id)){replacement.push(m);continue;}
  const keep=[],co=[];let removed=0;
  for(let i=0;i<m.instances.length;i+=16){const a=m.instances.subarray(i,i+16),x=a[12],z=a[14],w=localWeight(x,z),rand=G.rng((Math.round(x*16)^Math.imul(Math.round(z*16),31711))|0)();
   if(w<=0||rand>w){keep.push(...a);co.push(...m.instanceColors.subarray(i/16*3,i/16*3+3));continue;}
   const color=G.blend(C.leaf,G.rgb('#607446'),rand*.35).map((q,k)=>q*m.instanceColors[i/16*3+k]);
   add(a,color,Math.floor(x/64)+':'+Math.floor(z/64));oldMatrices.push(Array.from(a));removed++;
  }
  if(!removed)replacement.push(m);else if(keep.length)replacement.push({...m,instances:Float32Array.from(keep),instanceColors:Float32Array.from(co)});
 }
 // Extra planting is sparse, behind/alongside the building, never a perimeter ring.
 for(const [x,z,s,a]of [[-590,-21,.82,.3],[-572,-32,.92,2.0],[-548,-33,.80,1.1],[-527,-17,.86,3.7],[-603,5,.90,1.6]]){
  if(occupied.some(p=>Math.hypot(p[0]-x,p[1]-z)<9)||G.FOREST.routeDistance(x,z)<4)continue;
  const y=ground(x,z)-.13,ma=G.instanceMatrix(x,y,z,s,s,s,a);add(ma,C.leaf,Math.floor(x/64)+':'+Math.floor(z/64));newSites.push([x,y,z,s]);
 }
 // Mutate this array in place: app boot has already evaluated decoded.meshes.push.
 pack.meshes.splice(0,pack.meshes.length,...replacement.filter(m=>!(m.owner==='forest'&&m.component===ID)));
 const out=[];
 for(const [key,b]of groups){const N=tree(b.variant,false),F=tree(b.variant,true),ma=Float32Array.from(b.matrices),colors=Float32Array.from(b.colors),box=instanceBounds(ma,[N.wood,N.leaf,F.wood,F.leaf]);
  for(const part of ['wood','leaf'])out.push({id:'kourindou:landscape:'+key+':'+part,owner:'island',region:'island',space:'surface',globalSurface:true,overview:true,component:'transition-vegetation',group:'vegetation',kourindouPart:'trees',basis:'P',material:part==='wood'?'kourindouBark':'kourindouLeaf',leafCards:part==='leaf',vertices:N[part],farVertices:F[part],instances:ma,instanceColors:part==='leaf'?colors:new Float32Array(colors.length).fill(1),lodDistance:120,...box});
 }
 // Short buttresses only at already sampled core sites. The outlying trees keep
 // their original roots; no wider terrain transfer or horizontal slope overlay.
 const roots=new G.Geometry(),rootsFar=new G.Geometry(),rootSites=[],rootContacts=[];
 for(const b of groups.values())for(let i=0;i<b.matrices.length;i+=16){
  const ma=b.matrices.slice(i,i+16),x=ma[12],z=ma[14],scale=Math.hypot(ma[0],ma[2]);
  const points=[];for(let j=0;j<3;j++){
   const a=j*2.1+b.variant*.37,reach=1.3+j*.15,p=G.transform(ma,[Math.cos(a)*reach,0,Math.sin(a)*reach]),q=G.transform(ma,[Math.cos(a)*reach*.54,0,Math.sin(a)*reach*.54]);
   points.push({p,q});
  }
  if([...[x,z],...points.flatMap(({p,q})=>[p[0],p[2],q[0],q[2]])].some((v,k)=>v<(k%2?bounds[1]:bounds[0])||v>(k%2?bounds[3]:bounds[2])))continue;
  if(points.some(({p})=>G.FOREST.routeDistance(p[0],p[2])<1.2))continue;
  const start=[x,ma[13]+ma[5]*.44,z];rootSites.push([x,ma[13],z,scale]);
  for(const {p,q}of points){
   const radius=.045*scale,nearY=near.height(p[0],p[2])-radius-.02*scale,farY=far.height(p[0],p[2])-radius-.02*scale;
   const elbow=[q[0],near.height(q[0],q[2])+.09*scale,q[2]],end=[p[0],nearY,p[2]];
   roots.tube(start,elbow,.20*scale,C.bark,5,.105*scale);roots.tube(elbow,end,.105*scale,C.bark,5,radius);
   rootsFar.tube(start,[p[0],farY,p[2]],.20*scale,C.bark,3,radius);
   rootContacts.push({x:p[0],z:p[2],nearY,farY,radius});
  }
 }
 if(rootSites.length){
  const mesh=roots.mesh('kourindou:landscape:roots','vegetation',{owner:'island',region:'island',space:'surface',globalSurface:true,overview:true,nearDecoration:true,component:'kourindou-understorey',material:'kourindouBark',kourindouPart:'roots',basis:'P',maxDetailDistance:145,lodDistance:85});
  mesh.farVertices=rootsFar.mesh('roots-far').vertices;
  const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(const a of [mesh.vertices,mesh.farVertices])for(let i=0;i<a.length;i+=9)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],a[i+k]);hi[k]=Math.max(hi[k],a[i+k]);}
  mesh.center=lo.map((v,k)=>(v+hi[k])/2);mesh.radius=G.length(G.sub(hi,lo))/2+.02;out.push(mesh);
 }
 // Grass and leaf litter stay off the main approach, door, roofs and paths.
 const herbs=new G.Geometry(),herbsFar=new G.Geometry(),grassPoints=[],R=G.rng(271041);let grassSites=0;
 const clear=(x,z)=>!((x>-580&&x<-534&&z>-17&&z<16)||(x>-570&&x<-551&&z>=14&&z<27))&&G.FOREST.routeDistance(x,z)>2.4&&G.ISLAND.routeNear(x,z).d>8;
 for(let i=0;i<410;i++){
  const x=-604+R()*91,z=-39+R()*70;if(!clear(x,z))continue;
  const shrubEdge=(z< -20||x< -580||x> -529);if(!shrubEdge&&R()>.22)continue;
  // Consume the old seven blade draws so every existing patch stays at its site.
  // Three low folded leaves and one grass blade use the same seven triangles.
  for(let j=0;j<7;j++){
   const a=R()*TAU,h=(.18+R()*.43)*(shrubEdge?1.22:.85),w=(.028+R()*.022)*2.4,d=[Math.cos(a),Math.sin(a)],p=[x+(R()-.5)*.7,0,z+(R()-.5)*.7],col=G.blend(C.leaf,C.soil,R()*.28);
   const y=near.height(p[0],p[2])-.012,fy=far.height(p[0],p[2])-.012;
   if(j<3){
    const tip=[p[0]+d[0]*h*.74,y+h*.85,p[2]+d[1]*h*.74],left=[p[0]+d[0]*h*.27-d[1]*w,y+h*.42,p[2]+d[1]*h*.27+d[0]*w],right=[p[0]+d[0]*h*.27+d[1]*w,y+h*.30,p[2]+d[1]*h*.27-d[0]*w],base=[p[0],y,p[2]];
    herbs.tri(base,left,tip,col);herbs.tri(base,tip,right,col);
    herbsFar.tri([p[0],fy,p[2]],[left[0],fy+h*.42,left[2]],[tip[0],fy+h*.85,tip[2]],col);
   }else if(j===6)herbs.tri([p[0]-d[1]*w*.35,y,p[2]+d[0]*w*.35],[p[0]+d[1]*w*.35,y,p[2]-d[0]*w*.35],[p[0]+d[0]*h*.25,y+h,p[2]+d[1]*h*.25],col);
  }grassSites++;grassPoints.push([x,z]);
 }
 const grassMesh=herbs.mesh('kourindou:landscape:grasses','vegetation',{owner:'island',region:'island',space:'surface',globalSurface:true,overview:true,nearDecoration:true,component:'kourindou-understorey',material:'kourindouGrass',kourindouPart:'grasses',basis:'P',maxDetailDistance:150,lodDistance:90});
 grassMesh.farVertices=herbsFar.mesh('grasses-far').vertices;
 const grassLo=[Infinity,Infinity,Infinity],grassHi=[-Infinity,-Infinity,-Infinity];for(const a of [grassMesh.vertices,grassMesh.farVertices])for(let i=0;i<a.length;i+=9)for(let k=0;k<3;k++){grassLo[k]=Math.min(grassLo[k],a[i+k]);grassHi[k]=Math.max(grassHi[k],a[i+k]);}
 grassMesh.center=grassLo.map((v,k)=>(v+grassHi[k])/2);grassMesh.radius=G.length(G.sub(grassHi,grassLo))/2+.02;out.push(grassMesh);
 data.kourindouUpgrade={oldMatrices,newSites,grassSites,publicTreeBatches:groups.size*2,grassPoints,rootSites,rootContacts};
 return out;
}
G.KOURINDOU_UPGRADE={id:ID,version:2,architecture,publicEnvironment,tree,bytes,bounds,localWeight};
const previous=G.buildRegion;
G.buildRegion=async function(data,id,legacy){
 if(id!=='forest')return previous(data,id,legacy);
 const start=performance.now(),pack=await previous(data,id,legacy),shop=architecture(false);
 const removed=pack.meshes.filter(m=>m.component===ID);if(removed.length!==4)throw Error('Kourindou legacy detail changed; review component replacement');
 pack.meshes=pack.meshes.filter(m=>m.component!==ID).concat(shop.meshes);
 pack.bytes=bytes(pack.meshes);pack.builtMs=performance.now()-start;
 pack.meta={...pack.meta,kourindouUpgrade:shop.meta};return pack;
};
G.extraOverviewBuilders=[...(G.extraOverviewBuilders||[]),(data,pack)=>{
 const old=pack.meshes.filter(m=>m.owner==='forest'&&m.component===ID);if(old.length!==3)throw Error('Kourindou proxy source changed; review replacement');
 return [...publicEnvironment(data,pack),...architecture(true).meshes];
}];
// Existing front/overview presets, place IDs and character locations stay unchanged.
Object.assign(G.PRESETS,{
 kourindouRear:{label:'香霖堂 · 背墙与土藏',eye:[-518,62,-43],target:[-554,49,-4],fov:55,region:'forest'},
 kourindouFoot:{label:'香霖堂 · 柱脚与廊下',eye:[-532,47.4,22],target:[-548,46.6,9],fov:54,region:'forest'},
 kourindouPath:{label:'香霖堂 · 林径过渡',eye:[-637,66,48],target:[-583,47,8],fov:55,region:'forest'}
});
})(globalThis.GA);
