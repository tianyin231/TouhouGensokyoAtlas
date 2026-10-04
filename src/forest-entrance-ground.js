/* Forest approach: one-time, local vertex-color refinement (P landscape).
 * Existing ground/road materials, positions, normals, indices and LOD remain.
 * Apply once to original public records; no renderer, noise or height sampling.
 */
(function(G){'use strict';
const M=Math;
const roi=Object.freeze([-672,0,-448,192]),fade=20;
const ids=Object.freeze(['island:terrain:-768:0','island:terrain:-768:0:far','island:terrain:-512:0','island:terrain:-512:0:far','landscape:forest-road']);
const targets=new Set(ids),route=G.ISLAND.allRoutes.find(r=>r.id==='route-forest');
if(!route?.samples?.length||!(route.width>0))throw new Error('Forest entrance ground needs the existing forest approach');
const clamp=x=>M.max(0,M.min(1,x));
const smooth=(a,b,x)=>{const u=clamp((x-a)/(b-a));return u*u*(3-2*u);};
const lines=[];
// Copy only numeric source-route segments near the color field. No retained
// overview arrays, spatial index or per-frame lookup; 64 is an explicit bound.
for(let i=0;i<route.samples.length-1;i++){
 const a=route.samples[i],b=route.samples[i+1];
 if(!Number.isFinite(a[0]+a[1]+b[0]+b[1]))throw new Error('Invalid forest approach sample');
 if(M.max(a[0],b[0])<roi[0]-24||M.min(a[0],b[0])>roi[2]+24||M.max(a[1],b[1])<roi[1]-24||M.min(a[1],b[1])>roi[3]+24)continue;
 if(a[0]===b[0]&&a[1]===b[1])continue;
 if(lines.length/6>=64)throw new Error('Forest entrance ground route exceeds 64 local segments');
 const h=route.width*.5;
 lines.push(a[0],a[1],b[0],b[1],h*(1+.08*M.sin(i*.24)),h*(1+.08*M.sin((i+1)*.24)));
}
if(!lines.length)throw new Error('Forest approach does not reach the ground ROI');
const segments=new Float64Array(lines);
const grass=G.rgb('#7d8958'),leaf=G.rgb('#756b4d'),shoulder=G.rgb('#888060'),earth=G.rgb('#968568');
function weight(x,z){
 if(x<=roi[0]||x>=roi[2]||z<=roi[1]||z>=roi[3])return 0;
 // Preserve the approved Kourindou shader's full .67 core RGB. A narrower
 // outer band avoids repeating its broad fade; the existing shader still blends.
 const k=M.hypot((x+560)/115,(z+6)/97);
 return smooth(roi[0],roi[0]+fade,x)*(1-smooth(roi[2]-fade,roi[2],x))*smooth(roi[1],roi[1]+fade,z)*(1-smooth(roi[3]-fade,roi[3],z))*smooth(.67,.82,k);
}
function colorAt(x,z,out=[0,0,0]){
 let best=Infinity,north=0,half=3;
 for(let i=0;i<segments.length;i+=6){
  const ax=segments[i],az=segments[i+1],dx=segments[i+2]-ax,dz=segments[i+3]-az;
  const u=clamp(((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz)),ox=x-ax-u*dx,oz=z-az-u*dz,d2=ox*ox+oz*oz;
  if(d2<best){best=d2;north=oz;half=segments[i+4]+(segments[i+5]-segments[i+4])*u;}
 }
 const d=M.sqrt(best),wear=1-smooth(2.25,7.5,d),edge=(1-smooth(6,12,d))*.72;
 // Leaf soil follows the forest side of this actual road, becoming stronger
 // toward the existing western grove. No random patches or painted shadows.
 const floor=smooth(3,25,north)*smooth(8,28,d)*(.35+.65*(1-smooth(-640,-480,x)))*.62;
 // Preserve the existing paired worn tracks and their source-route direction.
 const track=1-.10*M.exp(-(((d/half-.55)*6)**2));
 for(let c=0;c<3;c++){
  let v=grass[c]+(leaf[c]-grass[c])*floor;
  v+=(shoulder[c]-v)*edge;
  out[c]=(v+(earth[c]-v)*wear)*track;
 }
 return out;
}
function applyRecord(m){
 if(!targets.has(m?.id))return m;
 const road=m.id==='landscape:forest-road',a=m.vertices;
 if(m.owner!=='island'||!m.globalSurface||m.material!==(road?'landscapeEarth':'landscapeGround')||m.component!==(road?'connection-road':'island-terrain'))throw new Error('Unexpected forest entrance ground record '+m.id);
 if(Object.prototype.toString.call(a)!=='[object Float32Array]'||a.length%9)throw new Error('Invalid forest entrance ground vertices '+m.id);
 let copy;const color=[0,0,0];
 for(let i=0;i<a.length;i+=9){
  const w=weight(a[i],a[i+2]);if(w===0)continue;
  colorAt(a[i],a[i+2],color);
  for(let c=0;c<3;c++){
   const j=i+6+c,v=M.fround(a[j]+(color[c]-a[j])*w);
   if(v!==a[j]){copy??=a.slice();copy[j]=v;}
  }
 }
 return copy?{...m,vertices:copy}:m;
}
G.FOREST_ENTRANCE_GROUND=Object.freeze({revision:2,roi,ids,weight,colorAt,applyRecord,routeSegmentCount:segments.length/6,routeSourceBytes:segments.byteLength});
})(globalThis.GA);
