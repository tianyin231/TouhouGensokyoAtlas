/* P: replace the actual main-hall bank, rather than covering the old cliff.
 * Public geometry owns the ground in every detail-cache state. The authored
 * stairs, platforms, six original trees and the historical underground stay.
 */
(function(G){'use strict';
const revision=2,EPS=1e-7;
const scope=Object.freeze({near:[218,354,394,391],far:[192,336,416,416],stair:[288,354,312,391],cutZ:378});
const inspectionHole=Object.freeze([G.ISLAND.hole.x0,G.ISLAND.hole.z0,G.ISLAND.hole.x1,G.ISLAND.hole.z1]);
const sourceIds=Object.freeze([0,256].flatMap(x=>['',':far',':cut',':cut:far'].map(s=>'island:terrain:'+x+':256'+s)));
const wallId='island:inspection-walls',stoneId='overview:myouren:hlod:architecture:myouren:1:1:templeStone';
const detailStoneId='myouren:laid-stone-terrace-faces',detailShrubId='myouren:slope-shrubs';
const wings=Object.freeze([[218,354,288,391],[312,354,394,391]]);
const rootGuards=Object.freeze([
 {point:[230.314453125,81.83424377441406,359.1158752441406],radius:.51965286871,rect:[228,356,232,364]},
 {point:[217.8450927734375,81.88619232177734,356.60345458984375],radius:.46699707268,rect:[216,352,220,360]},
 {point:[222.86842346191406,83.4708480834961,366.99566650390625],radius:.31704078701,rect:[220,364,228,372]},
 {point:[262.4426574707031,87.17833709716797,370.53851318359375],radius:.50497360961,rect:[260,368,268,376]},
 {point:[272.57977294921875,89.94184875488281,372.4967041015625],radius:.52526813002,rect:[268,368,276,376]},
 {point:[321.1407165527344,88.26381341854308,371.2571105957031],radius:.35195803273,rect:[316,368,324,376]}
]);
// These are contact footprints, not extra assets: middle landing, lotus bank,
// main paving and the complete lower tree-root parcels.
const protectedRects=Object.freeze([[246,335,354,363],[351,319,399,377],[214,389.5,396,455],...rootGuards.map(r=>r.rect)]);
// Absolute authored longitudinal sections. Alternating broad shoulders and
// recessed hollows replace the old equal-height bands. No random displacement.
const controlNet=Object.freeze([
 [218,[[354,82],[363,82],[370,86],[378,98.4],[386,111],[391,112]]],
 [232,[[354,82],[359,82.2],[366,86],[372,94],[378,100.8],[385,106],[388.6,108.7],[391,112]]],
 [246,[[354,82],[360,83.1],[366,88.8],[372,96],[376,100],[382,103.5],[388.6,108.7],[391,112]]],
 [256,[[354,82],[363,82],[367,84.1],[373,92.8],[378,100.5],[383,105],[388.6,108.7],[391,112]]],
 [269,[[354,82],[363,82],[368,83.7],[372,89.3],[376,95.4],[381,101.4],[388.6,108.7],[391,112]]],
 [280,[[354,82],[363,82],[369,85],[375,91.5],[380,97.2],[384,104],[388.6,108.7],[391,112]]],
 [288,[[354,82],[363,82.3],[370,87.7],[378,98.5],[386,109.4],[391,111.64]]],
 [312,[[354,82],[363,82.3],[370,87.7],[378,98.5],[386,109.4],[391,111.64]]],
 [322,[[354,82],[363,82],[368,84],[372,89],[377,97],[383,103.6],[388.6,108.7],[391,112]]],
 [334,[[354,82],[363,82],[369,88],[374,96.4],[379,100.5],[384,105],[388.6,108.7],[391,112]]],
 [345,[[354,82],[363,82],[370,84.6],[376,91.5],[382,98],[386,105],[388.6,108.7],[391,112]]],
 [353,[[354,90],[377,90],[380,94],[384,103],[388.6,108.7],[391,112]]],
 [362,[[354,90],[377,90],[380,96],[384,103.5],[388.6,108.7],[391,112]]],
 [370,[[354,90],[377,90],[381,92],[385,100.6],[388.6,108.7],[391,112]]],
 [380,[[354,90],[377,90],[380,95],[384,104.6],[388.6,108.7],[391,112]]],
 [389,[[354,90],[377,90],[381,92.8],[385,102],[388.6,108.7],[391,112]]],
 [394,[[354,90],[377,90],[381,99],[386,111],[391,112]]]
]);
// These rings and crests are real mesh constraints. Each ring edge and its
// crest define one hard planar face; soil is removed from the ring interior.
// This is exposed bedrock in the continuous island surface, not a cover shell.
const outcrops=Object.freeze([
 {id:'west-shoulder',ring:[[237,95.8,372.5],[250,97.1,374],[255,104.3,381],[247,106.2,384],[239,102.9,379.8]],crest:[245,103.1,376.6]},
 {id:'stair-east',ring:[[329,97,376],[339,95.2,376.5],[343,103.3,383],[334,107.2,385],[328,102.5,381]],crest:[334,103.7,379.2]},
 {id:'lotus-left',ring:[[352.5,92.4,378.8],[361.5,94,379.3],[366,103.9,384.8],[358,108,387],[352.5,103.7,384]],crest:[357.5,104,381.7]},
 {id:'lotus-right',ring:[[373.5,92.5,378.6],[384,92.9,379.6],[389,104,386],[379,108.2,387.4],[373,102,384]],crest:[381,104.1,381.9]}
]);
const earthColor=G.rgb('#87936d'),rockColor=G.rgb('#92968b');
const clamp=t=>Math.max(0,Math.min(1,t)),smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
const inside=(x,z,b)=>x>=b[0]-EPS&&x<=b[2]+EPS&&z>=b[1]-EPS&&z<=b[3]+EPS;
const distRect=(x,z,b)=>Math.hypot(Math.max(b[0]-x,0,x-b[2]),Math.max(b[1]-z,0,z-b[3]));
const area=p=>Math.abs(p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[2]-b[0]*a[2];},0))*.5;
const posKey=p=>p.slice(0,3).map(v=>Math.fround(v)).join(',');
const cross=(a,b,c)=>G.cross(G.sub(b.slice(0,3),a.slice(0,3)),G.sub(c.slice(0,3),a.slice(0,3)));
function clip(poly,axis,k,greater){const out=[];for(let i=0;i<poly.length;i++){
 const a=poly[i],b=poly[(i+1)%poly.length],A=greater?a[axis]>=k-EPS:a[axis]<=k+EPS,B=greater?b[axis]>=k-EPS:b[axis]<=k+EPS;
 if(A)out.push(a);if(A!==B){const u=(k-a[axis])/(b[axis]-a[axis]),v=a.map((n,j)=>j===axis?k:n+(b[j]-n)*u);out.push(v);}
 }return out.filter((p,i)=>!i||Math.hypot(p[0]-out[i-1][0],p[1]-out[i-1][1],p[2]-out[i-1][2])>EPS);}
function splitBox(poly,b){let rest=poly,outer=[];for(const [axis,k,greater]of[[0,b[0],true],[0,b[2],false],[2,b[1],true],[2,b[3],false]]){
 if(rest.length<3)break;const q=clip(rest,axis,k,!greater);if(q.length>=3&&area(q)>1e-7)outer.push(q);rest=clip(rest,axis,k,greater);
 }return {inside:rest.length>=3&&area(rest)>1e-7?rest:[],outside:outer};}
function triangulate(p){const out=[];for(let i=1;i<p.length-1;i++){const t=[p[0],p[i],p[i+1]];if(Math.abs(cross(...t)[1])>1e-7)out.push(cross(...t)[1]<0?[t[0],t[2],t[1]]:t);}return out;}
function sourceTriangles(m,b){const a=m.vertices,ix=m.index,out=[];for(let i=0;i<ix.length;i+=3){const p=[0,1,2].map(k=>Array.from(a.subarray(ix[i+k]*9,ix[i+k]*9+9)));
 if(b&&(Math.max(...p.map(q=>q[0]))<b[0]||Math.min(...p.map(q=>q[0]))>b[2]||Math.max(...p.map(q=>q[2]))<b[1]||Math.min(...p.map(q=>q[2]))>b[3]))continue;
 out.push({face:i/3,points:p,source:m.id});}return out;}
function bary(p,x,z){const [a,b,c]=p,d=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]);if(Math.abs(d)<1e-9)return null;
 const u=((b[2]-c[2])*(x-c[0])+(c[0]-b[0])*(z-c[2]))/d,v=((c[2]-a[2])*(x-c[0])+(a[0]-c[0])*(z-c[2]))/d,w=1-u-v;
 return Math.min(u,v,w)>=-1e-6?a.map((n,k)=>n*u+b[k]*v+c[k]*w):null;}
function sampler(tris){const bins=new Map();for(const t of tris){const p=t.points||t;for(let x=Math.floor(Math.min(...p.map(q=>q[0]))/8);x<=Math.floor(Math.max(...p.map(q=>q[0]))/8);x++)for(let z=Math.floor(Math.min(...p.map(q=>q[2]))/8);z<=Math.floor(Math.max(...p.map(q=>q[2]))/8);z++){
 const key=x+':'+z;if(!bins.has(key))bins.set(key,[]);bins.get(key).push(p);}}
 return (x,z)=>{for(const p of bins.get(Math.floor(x/8)+':'+Math.floor(z/8))||[]){const q=bary(p,x,z);if(q)return q;}return null;};}
function section(points,z){if(z<=points[0][0])return points[0][1];for(let i=1;i<points.length;i++)if(z<=points[i][0]){
 const a=points[i-1],b=points[i],h=b[0]-a[0],t=(z-a[0])/h,prev=points[Math.max(0,i-2)],next=points[Math.min(points.length-1,i+1)],d=(b[1]-a[1])/h;
 const tangent=(p,q)=>Math.max(0,Math.min(d*2,(q[1]-p[1])/(q[0]-p[0]||1))),m0=tangent(prev,b),m1=tangent(a,next);
 return (2*t*t*t-3*t*t+1)*a[1]+(t*t*t-2*t*t+t)*h*m0+(-2*t*t*t+3*t*t)*b[1]+(t*t*t-t*t)*h*m1;
 }return points.at(-1)[1];}
function earthHeight(x,z){let i=1;while(i<controlNet.length-1&&x>controlNet[i][0])i++;const a=controlNet[i-1],b=controlNet[i],u=smooth((x-a[0])/(b[0]-a[0]));return G.mix(section(a[1],z),section(b[1],z),u);}
function artField(base,x,z){const old=base(x,z);if(!old)throw Error('Missing original near surface '+x+','+z);const wing=wings.find(b=>inside(x,z,b));if(!wing)return {height:old[1],old,weight:0};
 let w=Math.min(smooth(Math.min(x-wing[0],wing[2]-x,z-wing[1])/4),smooth(wing[3]-z));for(const r of protectedRects)w=Math.min(w,smooth(distRect(x,z,r)/(r[1]===389.5?1:3.5)));if(w===0)return {height:old[1],old,weight:0};
 return {height:G.mix(old[1],earthHeight(x,z),w),old,weight:w};}
function pointAt(base,x,z){const q=artField(base,x,z);return[x,q.height,z,...q.old.slice(3,6),...G.blend(q.old.slice(6,9),earthColor,q.weight)];}
function axis(a,b,extra=[]){const out=[a,b,...extra.filter(v=>v>a&&v<b)];for(let n=Math.ceil(a/4)*4;n<b;n+=4)out.push(n);return [...new Set(out)].sort((a,b)=>a-b);}
function edgeBreaks(a,b,tris){const axis=Math.abs(a[0]-b[0])<EPS?2:0,other=axis===0?2:0,values=[a[axis],b[axis]];
 for(const t of tris){const p=t.points||t;for(let i=0;i<3;i++){const A=p[i],B=p[(i+1)%3],d=B[other]-A[other];if(Math.abs(d)<EPS){if(Math.abs(A[other]-a[other])<EPS)values.push(A[axis],B[axis]);continue;}const u=(a[other]-A[other])/d;if(u>=-EPS&&u<=1+EPS)values.push(G.mix(A[axis],B[axis],u));}}
 const lo=Math.min(a[axis],b[axis]),hi=Math.max(a[axis],b[axis]);return [...new Set(values.filter(v=>v>=lo-EPS&&v<=hi+EPS).map(v=>+v.toFixed(7)))].sort((x,y)=>(b[axis]>a[axis]?1:-1)*(x-y)).map(v=>{const q=a.slice();q[axis]=v;return q;});}
function cutByRects(p,rects){let rest=[p],out=[];for(const b of rects){const next=[];for(const q of rest){const s=splitBox(q,b);if(s.inside.length)out.push(s.inside);next.push(...s.outside);}rest=next;}return {inside:out,outside:rest};}
function soilTriangles(base,nearTris){const out=[];
 for(const b of wings){const xs=axis(b[0],b[2],[256,...protectedRects.flatMap(r=>[r[0],r[2]])]),zs=axis(b[1],b[3],protectedRects.flatMap(r=>[r[1],r[3]]));
 for(let i=0;i<xs.length-1;i++)for(let j=0;j<zs.length-1;j++){const cell=[xs[i],zs[j],xs[i+1],zs[j+1]],x=(cell[0]+cell[2])/2,z=(cell[1]+cell[3])/2;
 if(protectedRects.some(r=>inside(x,z,r))){for(const t of nearTris){const q=splitBox(t.points,cell).inside;if(q.length)out.push(...triangulate(q));}continue;}
 const corners=[[cell[0],0,cell[1]],[cell[2],0,cell[1]],[cell[2],0,cell[3]],[cell[0],0,cell[3]]],ring=[];
 for(let k=0;k<4;k++){const a=corners[k],c=corners[(k+1)%4],mx=(a[0]+c[0])/2,mz=(a[2]+c[2])/2,boundary=artField(base,mx,mz).weight===0;
 const ps=boundary?edgeBreaks(a,c,nearTris):[a,c];ring.push(...ps.slice(0,-1).map(p=>pointAt(base,p[0],p[2])));}
 const center=pointAt(base,x,z);for(let k=0;k<ring.length;k++)out.push(...triangulate([center,ring[k],ring[(k+1)%ring.length]]));
 }}return out;}
function clipRingEdge(poly,a,b,keepInside){const side=p=>(b[0]-a[0])*(p[2]-a[2])-(b[2]-a[2])*(p[0]-a[0]),out=[];
 for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length],P=side(p),Q=side(q),A=keepInside?P>=-EPS:P<=EPS,B=keepInside?Q>=-EPS:Q<=EPS;if(A)out.push(p);if(A!==B){const u=P/(P-Q);out.push(p.map((v,k)=>G.mix(v,q[k],u)));}}
 return out.filter((p,i)=>!i||G.length(G.sub(p.slice(0,3),out[i-1].slice(0,3)))>EPS);}
function subtractRing(poly,ring){let overlap=poly;for(let i=0;i<ring.length&&overlap.length>=3;i++)overlap=clipRingEdge(overlap,ring[i],ring[(i+1)%ring.length],true);if(overlap.length<3||area(overlap)<=EPS)return [poly];
 let remaining=poly;const outside=[];for(let i=0;i<ring.length;i++){if(remaining.length<3)break;const a=ring[i],b=ring[(i+1)%ring.length],p=clipRingEdge(remaining,a,b,false);if(p.length>=3&&area(p)>EPS)outside.push(p);remaining=clipRingEdge(remaining,a,b,true);}return outside;}
function buildArtSurface(base,nearTris){
 // A boundary registry gives both materials the exact same Float32 positions.
 // Original grid intersections subdivide the ring edge, never the rock plane.
 const boundaries=outcrops.map(r=>r.ring.map((a,i)=>{const b=r.ring[(i+1)%r.ring.length];return {a,b,points:new Map([[0,a.map(Math.fround)],[1,b.map(Math.fround)]])};}));
 let soil=[];for(const tri of soilTriangles(base,nearTris)){let pieces=[tri];for(const r of outcrops)pieces=pieces.flatMap(p=>subtractRing(p,r.ring));for(const p of pieces)soil.push(...triangulate(p));}
 for(const tri of soil)for(const p of tri)for(const edges of boundaries)for(const edge of edges){const {a,b}=edge,dx=b[0]-a[0],dz=b[2]-a[2],u=((p[0]-a[0])*dx+(p[2]-a[2])*dz)/(dx*dx+dz*dz);if(u< -EPS||u>1+EPS)continue;const v=clamp(u),x=G.mix(a[0],b[0],v),z=G.mix(a[2],b[2],v);if(Math.hypot(p[0]-x,p[2]-z)>5e-5)continue;const key=+v.toFixed(9);let q=[...edge.points.values()].find(q=>Math.hypot(q[0]-x,q[2]-z)<.0001);if(!q){q=a.map((n,k)=>Math.fround(G.mix(n,b[k],key)));edge.points.set(key,q);}for(let k=0;k<3;k++)p[k]=q[k];}
 // Ring corners can land halfway along a clipped soil edge. Insert every
 // shared boundary position on both sides before triangulating that edge.
 const seamPoints=[...new Map(boundaries.flat().flatMap(e=>[...e.points.values()]).map(p=>[posKey(p),p])).values()];
 soil=soil.flatMap(tri=>{const ring=[];for(let i=0;i<3;i++){const a=tri[i],b=tri[(i+1)%3],dx=b[0]-a[0],dz=b[2]-a[2],L=dx*dx+dz*dz,points=[];ring.push(a);for(const p of seamPoints){const u=((p[0]-a[0])*dx+(p[2]-a[2])*dz)/L;if(u<=1e-5||u>=1-1e-5)continue;if(Math.hypot(p[0]-G.mix(a[0],b[0],u),p[2]-G.mix(a[2],b[2],u))<5e-5)points.push({u,p:[...p,...a.slice(3)]});}ring.push(...points.sort((p,q)=>p.u-q.u).map(p=>p.p));}
  if(ring.length===3)return [tri];const center=ring[0].map((_,k)=>ring.reduce((s,p)=>s+p[k],0)/ring.length),out=[];for(let i=0;i<ring.length;i++)out.push(...triangulate([center,ring[i],ring[(i+1)%ring.length]]));return out;
 });
 // Area-weighted earth normals come from the actual joined surface. They do
 // not borrow rock normals or carry the old derivative's narrow bright folds.
 const normals=new Map();for(const tri of soil){const n=cross(...tri);for(const p of tri){const key=posKey(p),old=normals.get(key)||[0,0,0];normals.set(key,G.add(old,n));}}
 const soilOut=soil.map(tri=>tri.map(p=>{const q=artField(base,p[0],p[2]);if(q.weight===0)return p;const n=G.norm(normals.get(posKey(p))),normal=G.norm(G.blend(q.old.slice(3,6),n,q.weight));return [...p.slice(0,3),...normal,...G.blend(q.old.slice(6,9),earthColor,q.weight)];}));
 const triangles=soilOut.slice(),rockFaces=[];
 for(let r=0;r<outcrops.length;r++)for(let i=0;i<boundaries[r].length;i++){const rock=outcrops[r],edge=boundaries[r][i],points=[...edge.points].sort((a,b)=>a[0]-b[0]).map(p=>p[1]),raw=cross(rock.crest,edge.a,edge.b),normal=G.norm(raw[1]<0?G.mul(raw,-1):raw),first=triangles.length;
  for(let j=1;j<points.length;j++)for(const tri of triangulate([rock.crest,points[j-1],points[j]]))triangles.push(tri.map(p=>[...p.slice(0,3),...normal,...rockColor]));
  rockFaces.push({outcrop:rock.id,face:i,firstArtTriangle:first,triangles:triangles.length-first,normal});
 }
 return {triangles,earthTriangles:soilOut.length,rockFaces};
}
function artTriangles(base,nearTris){return buildArtSurface(base,nearTris).triangles;}
function stripSource(m,boxes){const kept=[],fragments=[],removed=[];for(const t of sourceTriangles(m)){
 const split=cutByRects(t.points,boxes);if(!split.inside.length){kept.push(...m.index.subarray(t.face*3,t.face*3+3));continue;}
 removed.push(t.face);for(const p of split.outside)fragments.push(...triangulate(p));
 }return {kept,fragments,removed};}
function packedRecord(source,id,tris){const values=[],indices=[],map=new Map();for(const tri of tris)for(const p of tri){const a=p.map(Math.fround),key=a.join(',');let ix=map.get(key);if(ix===undefined){ix=values.length/9;map.set(key,ix);values.push(...a);}indices.push(ix);}
 // Distinct typed-array objects are mandatory: renderer geometryRefs caches by
 // vertices identity, not by the (vertices,index) pair.
 return {...source,id,vertices:new Float32Array(values),index:new Uint32Array(indices),terrainRebuild:revision,sourceTerrain:source.id};}
function rebuiltWall(wall,art,visible){const out=[],xs=[218,394],triangulate3=p=>{for(let i=1;i<p.length-1;i++)if(G.length(cross(p[0],p[i],p[i+1]))>1e-7)out.push([p[0],p[i],p[i+1]]);};let style;
 for(const t of sourceTriangles(wall)){const p=t.points;if(p.every(a=>a[2]===378)&&Math.max(...p.map(a=>a[0]))>218&&Math.min(...p.map(a=>a[0]))<394){style??=p[0].slice(3);triangulate3(clip(p,0,218,false));triangulate3(clip(p,0,394,true));}else out.push(p);}
 for(const tri of art)for(let i=0;i<3;i++){const a=tri[i],b=tri[(i+1)%3];if((a[2]-378)*(b[2]-378)>0)continue;if(Math.abs(a[2]-b[2])<EPS){if(Math.abs(a[2]-378)<EPS)xs.push(a[0],b[0]);}else{const u=(378-a[2])/(b[2]-a[2]);if(u>=-EPS&&u<=1+EPS)xs.push(G.mix(a[0],b[0],u));}}
 // The unchanged stair strip also uses its actual near-surface trace.
 for(let x=218;x<=394;x+=2)xs.push(x);const trace=[...new Set(xs.filter(x=>x>=218&&x<=394).map(x=>+x.toFixed(7)))].sort((a,b)=>a-b).map(x=>[x,visible(x,378)[1],378]);
 for(let i=1;i<trace.length;i++){const a=trace[i-1],b=trace[i],A=[...a,...style],B=[...b,...style],C=[b[0],-47,378,...style],D=[a[0],-47,378,...style];out.push([A,B,C],[A,C,D]);}
 const record=packedRecord(wall,wall.id,out);delete record.terrainRebuild;delete record.sourceTerrain;return {record,trace};}
function sameView(a,b){return a&&b&&a.buffer===b.buffer&&a.byteOffset<b.byteOffset+b.byteLength&&b.byteOffset<a.byteOffset+a.byteLength;}
function exclusiveIndex(pack,m){for(const r of pack.meshes)for(const k of ['vertices','farVertices','instances','instanceColors','index'])if(r[k]&&r[k]!==m.index&&sameView(m.index,r[k]))throw Error('Shared mutable index range '+m.id+'/'+r.id+'/'+k);
 for(const r of pack.meshes)if(r!==m&&(r.vertices===m.vertices||r.index===m.index))throw Error('Shared renderer geometry identity '+m.id+'/'+r.id);}
function triangleKey(a,ids,quantize=false){return ids.map(j=>Array.from(a.subarray(j*9,j*9+9),(v,k)=>Math.round((quantize&&k<3?Math.fround(Math.round(v/.45)*.45):v)*1000)).join(',')).join(';');}
function facingKeys(t,quantize){const g=new G.Geometry(),stone=G.rgb('#979f95'),dark=G.rgb('#5b6966');for(let x=218;x<394;x+=2.7){if(Math.abs(x-300)<10)continue;for(let row=0;row<7;row++){const y=106+row*.8;let lo=363,hi=391;for(let i=0;i<15;i++){const z=(lo+hi)/2;if(t.height(x,z)>y)hi=z;else lo=z;}g.box(x,y,(lo+hi)/2-.45,2.65,.765,1.1,G.blend(stone,dark,(row%3)*.06));}}
 const a=new Float32Array(g.a),keys=new Map();for(let i=0;i<a.length/9;i+=3){const key=triangleKey(a,[i,i+1,i+2],quantize);keys.set(key,(keys.get(key)||0)+1);}return keys;}
function removeFacing(m,t){const a=m.vertices,ix=m.index,keys=facingKeys(t,!!ix),kept=[];let removed=0;for(let i=0;i<(ix?ix.length:a.length/9);i+=3){const ids=ix?[ix[i],ix[i+1],ix[i+2]]:[i,i+1,i+2],key=triangleKey(a,ids),count=keys.get(key)||0;if(count){keys.set(key,count-1);removed++;}else if(ix)kept.push(...ids);else for(const j of ids)kept.push(...a.subarray(j*9,j*9+9));}if(removed!==4872)throw Error('Front facing identity changed '+removed);return {kept,removed};}
const prepared=new WeakSet(),metadata=new WeakMap();
function prepare(data,pack){if(prepared.has(pack))return[];const sources=sourceIds.map(id=>{const m=pack.meshes.find(r=>r.id===id);if(!m||m.component!=='island-terrain'||!m.index)throw Error('Missing original terrain '+id);exclusiveIndex(pack,m);return m;}),nearTris=sources.filter(m=>!m.globalFar&&!m.cutOnly).flatMap(m=>sourceTriangles(m,[190,334,418,418])),farTris=sources.filter(m=>m.globalFar&&!m.cutOnly).flatMap(m=>sourceTriangles(m,[190,334,418,418])),base=sampler(nearTris),farBase=sampler(farTris),artBuilt=buildArtSurface(base,nearTris),art=artBuilt.triangles,artSample=sampler(art);
 const visible=(x,z)=>artSample(x,z)||base(x,z),normalFar=[];
 // The technical halo follows the existing fine terrain and joins the actual
 // coarse triangles across a broad envelope. It is not a narrow raised skirt.
 for(const t of nearTris){const envelope=splitBox(t.points,scope.far).inside;if(!envelope.length)continue;const pieces=cutByRects(envelope,wings).outside;
 for(const p of pieces){const ring=[];for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],edge=(a[0]===b[0]&&(a[0]===192||a[0]===416))||(a[2]===b[2]&&(a[2]===336||a[2]===416));const points=edge?edgeBreaks(a,b,farTris):[a,b];for(const q of points.slice(0,-1))ring.push(base(q[0],q[2]));}const q=ring.map(a=>{const x=a[0],z=a[2],old=farBase(x,z);if(!old)throw Error('Missing original far support');let w=Math.min(smooth((x-192)/26),smooth((416-x)/22),smooth((z-336)/18),smooth((416-z)/25));
 if(inside(x,z,[218,354,394,391]))w=1;const c=a.slice();c[1]=G.mix(old[1],a[1],w);for(let k=3;k<9;k++)c[k]=G.mix(old[k],a[k],w);return c;});normalFar.push(...triangulate(q));}}
 normalFar.push(...art);const additions=[],mutations=[],changes=[];
 for(const m of sources){let boxes=m.globalFar?[scope.far]:wings,strip=stripSource(m,boxes),shape=m.globalFar?normalFar:art,tris=strip.fragments.slice();
 for(const tri of shape){const p=splitBox(tri,[m.tile[0],-1e6,m.tile[0]+256,1e6]).inside;if(!p.length)continue;const pieces=m.cutOnly?splitBox(p,inspectionHole).outside:[p];for(const q of pieces)tris.push(...triangulate(q));}
 const patch=packedRecord(m,m.id+':myouren-rebuild',tris);additions.push(patch);mutations.push({m,index:strip.kept});changes.push({source:m.id,patch:patch.id,removedFaces:strip.removed,retainedFragmentTriangles:strip.fragments.length,patchTriangles:patch.index.length/3});}
 const t=new G.Terrain(data),stone=pack.meshes.find(m=>m.id===stoneId);if(!stone)throw Error('Missing cold facing');exclusiveIndex(pack,stone);const face=removeFacing(stone,t);mutations.push({m:stone,index:face.kept});
 const wall=pack.meshes.find(m=>m.id===wallId);if(!wall)throw Error('Missing original cut wall');exclusiveIndex(pack,wall);const wallBuilt=rebuiltWall(wall,art,visible),wallNext=wallBuilt.record;
 const contact=Float32Array.from(art.flatMap(tri=>tri.flatMap(p=>p.slice(0,3)))),cutTrace=Float32Array.from(wallBuilt.trace.flat()),buffers=new Set(additions.flatMap(m=>[m.vertices.buffer,m.index.buffer]));buffers.add(wallNext.vertices.buffer);buffers.add(wallNext.index.buffer);buffers.add(contact.buffer);buffers.add(cutTrace.buffer);const extraBytes=[...buffers].reduce((s,b)=>s+b.byteLength,0);if(extraBytes>.6*1048576)throw Error('New terrain backing budget exceeded '+extraBytes);
 for(const {m,index}of mutations){m.index.set(index);m.index=m.index.subarray(0,index.length);}pack.meshes=pack.meshes.map(m=>m===wall?wallNext:m).concat(additions);
 data.myourenTerrainRebuild={revision,contact};
 metadata.set(pack,{revision,changes,sourceBytes:extraBytes,contactBytes:contact.byteLength,removedFacingTriangles:4872,cutTrace,artTriangles:art.length,earthTriangles:artBuilt.earthTriangles,rockFaces:artBuilt.rockFaces,farTriangles:normalFar.length});prepared.add(pack);return[];
}
function analyticReference(t){const cache=new Map(),cell=(X,Z)=>{const key=X+':'+Z;let tris=cache.get(key);if(!tris){const ps=[[X,Z],[X+4,Z],[X+4,Z+4],[X,Z+4],[X+2,Z+2]].map(([a,b])=>{const y=Math.fround(t.height(a,b)),n=t.normal(a,b),c=G.ISLAND.surfaceColor(t,a,b,y,n);return[a,y,b,...n,...c].map(Math.fround);});tris=[0,1,2,3].map(i=>[ps[4],ps[i],ps[(i+1)%4]]);cache.set(key,tris);}return tris;};
 const sample=(x,z)=>{for(const tri of cell(Math.floor(x/4)*4,Math.floor(z/4)*4)){const p=bary(tri,x,z);if(p)return p;}throw Error('Missing original local fine support');};
 sample.triangles=b=>{const out=[];for(let x=Math.floor(b[0]/4)*4;x<b[2];x+=4)for(let z=Math.floor(b[1]/4)*4;z<b[3];z+=4)for(const points of cell(x,z))out.push({points});return out;};return sample;}
function contactSampler(data,t){const a=data.myourenTerrainRebuild?.contact;if(a){const ts=[];for(let i=0;i<a.length;i+=9)ts.push([Array.from(a.subarray(i,i+3)),Array.from(a.subarray(i+3,i+6)),Array.from(a.subarray(i+6,i+9))]);return sampler(ts);}
 // A direct region build uses the same explicit rock faces as the prepared
 // overview/Worker path; it must not place shrubs on the old scalar field.
 const base=analyticReference(t);return sampler(artTriangles(base,base.triangles([214,352,398,395])));}
function bytes(meshes){const buffers=new Set();for(const m of meshes)for(const k of['vertices','farVertices','instances','instanceColors','index'])if(m[k])buffers.add(m[k].buffer);return [...buffers].reduce((s,b)=>s+b.byteLength,0);}
function applyDetail(data,pack){if(pack.meta?.myourenTerrainRebuild?.revision===revision)return pack;const t=new G.Terrain(data),contact=contactSampler(data,t),base=analyticReference(t);let moved=0;
 const meshes=pack.meshes.map(m=>{if(m.id===detailStoneId){const r=removeFacing(m,t);return {...m,vertices:Float32Array.from(r.kept)};}if(m.id!==detailShrubId)return m;
 const a=m.vertices.slice();let prefix=0;for(const [za,x0,x1]of[[363,218,394],[307,249,349],[454,256,355]])for(let x=x0;x<x1;x+=2.7){if(Math.abs(x-300)<10||Math.abs(x-376)<6&&za>450)continue;if(Math.round(x)%3===0)prefix+=4*168;}
 for(let at=0;at<a.length/9;){const count=(at<prefix?168:126)*4;let x=0,z=0;for(let j=0;j<count;j++){x+=a[(at+j)*9];z+=a[(at+j)*9+2];}x/=count;z/=count;const q=contact(x,z),old=base(x,z),dy=q?q[1]-old[1]:0;if(Math.abs(dy)>.00001){for(let j=0;j<count;j++)a[(at+j)*9+1]+=dy;moved++;}at+=count;}
 return {...m,vertices:a};});return {...pack,meshes,bytes:bytes(meshes),meta:{...pack.meta,myourenTerrainRebuild:{revision,movedShrubClumps:moved,removedFacingTriangles:4872}}};}
const originalBuildRegion=G.buildRegion;G.buildRegion=async function(data,id,legacy){const p=await originalBuildRegion(data,id,legacy);return id==='myouren'?applyDetail(data,p):p;};
G.MYOUREN_TERRAIN_REBUILD=Object.freeze({revision,scope,wings,inspectionHole,sourceIds,wallId,stoneId,detailStoneId,detailShrubId,rootGuards,protectedRects,controlNet,outcrops,sourceTriangles,sampler,artField,artTriangles,buildArtSurface,prepare,applyDetail,originalBuildRegion,metadata,bytes});
G.extraOverviewBuilders=[...(G.extraOverviewBuilders||[]),prepare];
})(globalThis.GA);
