// Same-current-build original/final packages are supplied by the caller.
// Importing this module never creates terrain/world/region/Worker/GPU or fixtures.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
const CELLS=[['-10:0',[7,3,4]],['-10:1',[4,5,4]],['-9:0',[3,4,4]],['-9:1',[4,2,3]]];
const TARGETS=new Map();for(const [cell,counts]of CELLS)for(let variant=0;variant<3;variant++)for(const part of['wood','leaf'])TARGETS.set('forest:trees:'+cell+':'+variant+':'+part,{variant,part,count:counts[variant]});
const raw=a=>Buffer.from(a.buffer,a.byteOffset,a.byteLength),hash=b=>createHash('sha256').update(b).digest('hex');
const typed=m=>Object.entries(m).filter(([,a])=>ArrayBuffer.isView(a));
const float=a=>ArrayBuffer.isView(a)&&a.constructor.name==='Float32Array';
const json=x=>JSON.stringify(x);
function metadata(m,source=false){const o={};for(const k of Object.keys(m).sort())if(!ArrayBuffer.isView(m[k])&&m[k]!==undefined&&typeof m[k]!=='function'&&k!=='forestCanopyRevision')o[k]=m[k];
 // This is the existing buildRegion normalization, not a candidate exception.
 if(source){o.owner='forest';o.region=o.region||'forest';o.space=o.space||'surface';}
 return Object.fromEntries(Object.keys(o).sort().map(k=>[k,o[k]]));}
function sameView(a,b,label){assert(ArrayBuffer.isView(a)&&ArrayBuffer.isView(b),label);assert.equal(a.constructor.name,b.constructor.name,label+' type');assert.equal(a.length,b.length,label+' length');assert(raw(a).equals(raw(b)),label+' exact bytes');}
function treeRecords(pack){return pack.meshes.filter(m=>/^forest:trees:-?\d+:-?\d+:[012]:(wood|leaf)$/.test(m.id));}
function inventory(records){const map=new Map(records.map(m=>[m.id,m]));assert.equal(map.size,records.length,'Duplicate native tree ID');const pairs=new Map();let count=0;for(const m of records){
 const p=m.id.split(':'),part=p[5],variant=Number(p[4]),key=p.slice(0,5).join(':');assert(float(m.instances)&&m.instances.length%16===0&&float(m.instanceColors)&&m.instanceColors.length===m.instances.length/16*3,'Invalid tree instances '+m.id);
 if(!pairs.has(key))pairs.set(key,{});assert(!pairs.get(key)[part]);pairs.get(key)[part]=m;
 assert.equal(m.component,'forest-canopy');assert.equal(m.material,part==='wood'?'timber':'forestLeaf');assert.equal(m.lodDistance,280);assert(!m.globalSurface&&!m.index&&!m.leafCards,'Original dispatch changed');
 if(part==='leaf')count+=m.instances.length/16;
 assert.equal(variant>=0&&variant<=2,true);
 }
 for(const [id,p]of pairs){assert(p.wood&&p.leaf,'Missing wood/leaf pair '+id);sameView(p.wood.instances,p.leaf.instances,'Pair matrix values '+id);assert.equal(json(p.wood.center),json(p.leaf.center));assert.equal(p.wood.radius,p.leaf.radius);}
 return{map,pairs,count};}
function shape(a,label,allowEmpty=false){assert(float(a)&&a.length%27===0&&(allowEmpty||a.length>0),'Invalid prototype '+label);const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];let minArea=Infinity,maxNormalError=0;
 for(let i=0;i<a.length;i+=9){for(let k=0;k<9;k++)assert(Number.isFinite(a[i+k]),'Nonfinite geometry '+label);for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],a[i+k]);hi[k]=Math.max(hi[k],a[i+k]);assert(a[i+6+k]>=0,'Negative linear color '+label);}const e=Math.abs(Math.hypot(a[i+3],a[i+4],a[i+5])-1);maxNormalError=Math.max(maxNormalError,e);assert(e<1e-5,'Nonunit normal '+label);}
 for(let i=0;i<a.length;i+=27){const x=a[i+9]-a[i],y=a[i+10]-a[i+1],z=a[i+11]-a[i+2],u=a[i+18]-a[i],v=a[i+19]-a[i+1],w=a[i+20]-a[i+2],area=Math.hypot(y*w-z*v,z*u-x*w,x*v-y*u);minArea=Math.min(minArea,area);assert(area>1e-10,'Degenerate new triangle '+label);}
 return{triangles:a.length/27,bytes:a.byteLength,aabb:a.length?{lo,hi}:null,minTwiceArea:a.length?minArea:null,maxNormalError};}
function boundsFit(m){assert(Array.isArray(m.center)&&m.center.length===3&&m.center.every(Number.isFinite)&&Number.isFinite(m.radius)&&m.radius>0,'Invalid source sphere');let max=0,vertices=0;
 for(const a of[m.vertices,m.farVertices])for(let j=0;j<m.instances.length;j+=16)for(let i=0;i<a.length;i+=9){const x=a[i],y=a[i+1],z=a[i+2],ma=m.instances;
  const dx=ma[j]*x+ma[j+4]*y+ma[j+8]*z+ma[j+12]-m.center[0],dy=ma[j+1]*x+ma[j+5]*y+ma[j+9]*z+ma[j+13]-m.center[1],dz=ma[j+2]*x+ma[j+6]*y+ma[j+10]*z+ma[j+14]-m.center[2];
  const d=Math.hypot(dx,dy,dz);max=Math.max(max,d);vertices++;assert(d<=m.radius+1e-5,'Actual transformed vertex outside original sphere '+m.id);}
 return{testedNearFarVertices:vertices,maxDistance:max,originalRadius:m.radius,minimumMargin:m.radius-max,tolerance:1e-5};}
function viewsBytes(ms){const arrays=new Set();for(const m of ms)for(const [,a]of typed(m))arrays.add(a);return{uniqueTypedViews:arrays.size,viewBytes:[...arrays].reduce((n,a)=>n+a.byteLength,0)};}
function sourceSnapshots(ms){const arraySHA=new Map(),records=ms.map(m=>{for(const [,a]of typed(m))if(!arraySHA.has(a))arraySHA.set(a,hash(raw(a)));return{m,metadata:json(metadata(m)),arrays:new Map(typed(m))};});return{arraySHA,records};}
function intact(snapshot){for(const [a,sha]of snapshot.arraySHA)assert.equal(hash(raw(a)),sha,'Original source array mutated');for(const r of snapshot.records){assert.equal(json(metadata(r.m)),r.metadata,'Original metadata mutated');for(const [k,a]of r.arrays)assert.equal(r.m[k],a,'Original reference mutated');}}
function probeTransactions(G,before){const U=G.FOREST_CANOPY,P=G.FOREST_CANOPY_PLANTS,oldGround=G.FOREST_CANOPY_GROUND;
 const trees=treeRecords(before).map(m=>({...m,owner:'forest',region:m.region||'forest',space:m.space||'surface'})),first=trees[0].id;
 const snapshot=sourceSnapshots(trees),failures=[];
 function failed(name,ms,ground,plants=P){const pack={meshes:ms,meta:{treeCount:755}},list=pack.meshes,meta=pack.meta;try{G.FOREST_CANOPY_GROUND=ground;G.FOREST_CANOPY_PLANTS=plants;assert.throws(()=>U.applyDetail(null,pack),undefined,name);assert.equal(pack.meshes,list,'Partial commit '+name);assert.equal(pack.meta,meta,'Partial metadata commit '+name);}finally{G.FOREST_CANOPY_GROUND=oldGround;G.FOREST_CANOPY_PLANTS=P;}failures.push(name);}
 const passthrough={detail:(_data,p)=>p};
 failed('missing-target',trees.filter(m=>m.id!==first),passthrough);
 failed('duplicate-target',[...trees,trees.find(m=>m.id===first)],passthrough);
 failed('invalid-matrix',trees.map(m=>m.id===first?{...m,instances:m.instances.subarray(16)}:m),passthrough);
 failed('invalid-material',trees.map(m=>m.id===first?{...m,material:'foliage'}:m),passthrough);
 failed('late-far-budget',trees,passthrough,{...P,prototype:(v,lod)=>lod==='near'?P.prototype(v,lod):{...P.prototype(v,lod),leaf:new Float32Array(407*27)}});
 failed('ground-throws-after-trees',trees,{detail(){throw Error('Injected late ground failure');}});
 intact(snapshot);return{atomicFailureCases:failures,scope:'Transaction probes use a ground passthrough/fault only; actual ground output must be validated separately.'};
}

const TERRAIN_IDS=Object.freeze(['island:terrain:-1280:0','island:terrain:-1280:0:far','island:terrain:-1024:0','island:terrain:-1024:0:far']);
const GROUND_IDS=Object.freeze(['forest:canopy-ground:-1280:0:near','forest:canopy-ground:-1280:0:far','forest:canopy-ground:-1024:0:near','forest:canopy-ground:-1024:0:far']);
const RGB_PATH_IDS=new Set(['island:routes:forest:-2:0','island:routes:forest:-2:0:shoulder','island:routes:forest:-3:0','island:routes:forest:-3:0:shoulder']);
const OLD_GROUND_COUNTS=new Map([[-1280,35],[-1024,44]]);
// Explicitly reviewed v6 candidate layout, independent of helper-generated sites.
const OUTER_SITES=[
 ['west-front',0,-1032,139,'shrub'],['west-front',1,-1028,142,'fern'],['west-front',2,-1031,145,'shrub'],['west-front',3,-1034,147,'fern'],['west-front',4,-1029,150,'fern'],['west-front',5,-1030,136,'shrub'],
 ['west-upper',0,-1032,114,'fern'],['west-upper',1,-1028,116,'shrub'],['west-upper',2,-1030,120,'fern'],['west-upper',3,-1027.5,119.2,'shrub'],
 ['south-east',0,-989,171,'shrub'],['south-east',1,-985,171,'fern'],['south-east',2,-981,170,'shrub'],['south-east',3,-980,174,'fern'],['south-east',4,-979,167,'fern'],['south-east',5,-975,171,'shrub'],
 ['east-bend',0,-973,164,'fern'],['east-bend',1,-969,165,'shrub'],['east-bend',2,-966,163,'shrub'],['east-bend',3,-964,167,'fern'],['east-bend',4,-969,171,'fern']
].map(([group,ordinal,x,z,kind])=>({id:'marisa-outer:'+group+':'+ordinal,group,x,z,kind,
 angle:['west-front','west-upper','south-east','east-bend'].indexOf(group)*.79+ordinal*1.93,
 size:kind==='shrub'?.84+(ordinal%3)*.075:.63+(ordinal%4)*.07}));
const BAND_SITES=[
 ['west',0,-1021,89,1.07,'shrub',.36],['west',1,-1020,92.2,1.04,'shrub',3.34],['west',2,-1027.5,91,.76,'fern',2.02],
 ['west',3,-1021,101,1.10,'shrub',5.87],['west',4,-1020,104.2,1.04,'shrub',1.30],['west',5,-1027,105,.80,'fern',4.93],
 ['west',6,-1028,111,1.06,'shrub',4.00],['west',7,-1030.4,113.4,1.00,'shrub',6.20],
 ['east',0,-936,160,1.10,'shrub',.83],['east',1,-939,161,1.04,'shrub',3.92],['east',2,-942,164,.79,'fern',5.40],
 ['east',3,-948,163,1.08,'shrub',6.82],['east',4,-951,164.5,1.04,'shrub',1.52],['east',5,-956,166,.76,'fern',8.31]
].map(([band,ordinal,x,z,size,kind,angle])=>({id:'marisa-band:'+band+':'+ordinal,band,x,z,size,kind,angle}));
const CANDIDATE_SITES=[...OUTER_SITES,...BAND_SITES],OUTER_MAP=new Map(CANDIDATE_SITES.map(s=>[s.id,s]));
const OUTER_TRIANGLES=Object.freeze({fern:{near:62,far:19},shrub:{near:324,far:50}});
function outerStems(a,start,length,site,far,height){
 // Read actual stem cross sections and leaf roots. Do not call the generator
 // to prove its own attachment; source indexed terrain is sampled separately.
 const at=i=>[a[i],a[i+1],a[i+2]],avg=ps=>[0,1,2].map(k=>ps.reduce((v,p)=>v+p[k]/ps.length,0)),distance=(p,q)=>Math.hypot(...p.map((v,k)=>v-q[k])),
  base=[site.x,height(site.x,site.z)-.28,site.z],shrub=site.kind==='shrub';
 let minFoot=Infinity,maxFoot=-Infinity,maxTipError=0,maxFootError=0,maxForkGap=0,maxLeafRootGap=0,maxLeafOutside=0,maxLeafQuantizationBound=0,stems=0,leafRoots=0,body=null;const quantizationCases=[];
 const halfULP=v=>v===0?2**-150:2**(Math.floor(Math.log2(Math.abs(v)))-24);
 const point=(reach,turn,lift)=>{const x=site.x+Math.cos(site.angle+turn)*reach*site.size,z=site.z+Math.sin(site.angle+turn)*reach*site.size;return[x,height(x,z)+lift*site.size,z];};
 function stem(offset,root,expectedTip,radius,buried,coarse=false){
  const feet=(coarse?[offset+9,offset,offset+27]:[offset+9,offset,offset+54]).map(at);
  for(let j=0;j<3;j++){
   const x=root[0]+Math.cos(j*2*Math.PI/3)*radius*site.size,z=root[2]+Math.sin(j*2*Math.PI/3)*radius*site.size,
    error=distance(feet[j],[x,buried?height(feet[j][0],feet[j][2])-.28:root[1],z]);
   assert(error<=.0001,'Reviewed stem root/size/contact changed '+site.id);maxFootError=Math.max(maxFootError,error);
   if(buried){const gap=feet[j][1]-height(feet[j][0],feet[j][2]);minFoot=Math.min(minFoot,gap);maxFoot=Math.max(maxFoot,gap);}
  }
  const top=coarse?null:[at(offset+6*27),at(offset+6*27+9),at(offset+6*27+18)],tip=coarse?at(offset+18):avg(top);
  if(expectedTip){const error=distance(tip,expectedTip);assert(error<=.0001,'Reviewed stem angle/size/height changed '+site.id);maxTipError=Math.max(maxTipError,error);}
  stems++;return{feet,top,tip,offset,coarse};
 }
 function leaf(offset,root,support,level=null){
  const actual=at(offset),error=distance(actual,root),inside=avg([...support.feet,support.tip]),faces=[];
  for(let i=0;i<(support.coarse?3:7);i++)faces.push([at(support.offset+i*27),at(support.offset+i*27+9),at(support.offset+i*27+18)]);
  faces.push(support.feet);let outside=0;
  // The exact Float32 stem faces, including its contact cross section, enclose
  // the leaf root. Center-line reconstruction error is not a physical gap.
  for(const [p,q,r]of faces){const u=q.map((v,k)=>v-p[k]),v=r.map((v,k)=>v-p[k]),n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],norm=Math.hypot(...n),dot=a=>n.reduce((s,v,k)=>s+v*(a[k]-p[k]),0),sign=Math.sign(dot(inside));
   assert(norm>0&&sign,'Invalid actual supporting stem face');const violation=-sign*dot(actual)/norm;outside=Math.max(outside,violation);assert(violation<=1e-8,'Leaf root outside actual supporting stem '+site.id);}
  if(level!==null){const end=support.top||[support.tip],bounds=actual.map((v,k)=>halfULP(v)+level*end.reduce((s,p)=>s+halfULP(p[k])/end.length,0)),bound=Math.hypot(...bounds);
   for(let k=0;k<3;k++)assert(Math.abs(actual[k]-root[k])<=bounds[k]+1e-8,'Leaf-root discrepancy exceeds propagated Float32 bound '+site.id);
   maxLeafQuantizationBound=Math.max(maxLeafQuantizationBound,bound);if(error>.0001)quantizationCases.push({floatOffset:offset,actualLeafRoot:actual,reconstructedRoot:root,distance:error,interpolation:level,start:base,end:support.tip,endCapVertices:end,leafULP:actual.map(v=>halfULP(v)*2),coordinateBounds:bounds,distanceBound:bound,numericalSlack:1e-8,maximumOutsideStem:outside});
  }
  maxLeafRootGap=Math.max(maxLeafRootGap,error);maxLeafOutside=Math.max(maxLeafOutside,outside);leafRoots++;
 }
 const along=(p,q,u)=>p.map((v,k)=>v+(q[k]-v)*u);
 if(!shrub){
  const profiles=far?[[.12,.41,.37]]:[[.18,-.25,.30],[.23,2.75,.38]],levels=far?[.74,.79,.84,.89,.94,1,1,1]:[.72,.80,.88,.96,1,1,1,1];
  for(let i=0;i<profiles.length;i++){
   const o=start+i*31*27,s=stem(o,base,point(...profiles[i]),far?.030:.032,true,far);
   for(let j=0;j<8;j++)leaf(o+(far?3:7)*27+j*(far?2:3)*27,along(base,s.tip,levels[j]),s,levels[j]);
  }
  assert.equal(length,(far?19:62)*27);
 }else if(!far){
  const profiles=[[-.44,.57,1.12,1.32,1.86],[.57,.40,1.40,.91,1.98],[1.69,.58,.97,1.34,1.74],[2.85,.44,1.33,.98,1.94],[4.04,.56,1.03,1.27,1.82],[5.24,.46,1.18,1.02,1.90]];
  for(let i=0;i<profiles.length;i++){
   const o=start+i*54*27,[turn,r0,h0,r1,h1]=profiles[i],lower=stem(o,base,point(r0,turn-.16,h0),.048,true),upper=stem(o+7*27,lower.tip,point(r1,turn+.14,h1),.024,false);
   assert.equal(json(lower.top.map(p=>p.join(':')).sort()),json(upper.feet.map(p=>p.join(':')).sort()),'Actual elbow cross sections do not join');
   maxForkGap=Math.max(maxForkGap,distance(lower.tip,avg(upper.feet)));
   const len0=distance(base,lower.tip),len1=distance(lower.tip,upper.tip);assert(len0>0&&len1>0,'Collapsed curved shoot');
   for(let j=0;j<10;j++){
    const d=(.21+j*.083)*(len0+len1),root=d<len0?along(base,lower.tip,d/len0):along(lower.tip,upper.tip,(d-len0)/len1);
    for(let sign=0;sign<2;sign++)leaf(o+14*27+(j*2+sign)*2*27,root,d<len0?lower:upper);
   }
  }
  assert.equal(length,324*27);
 }else{
  const s0=stem(start,base,null,.048,true,true),s1=stem(start+3*27,base,null,.030,true,true);
  assert(distance(s1.tip,s0.tip.map((v,k)=>v+([Math.cos(site.angle)*.22*site.size,.08*site.size,Math.sin(site.angle)*.22*site.size][k])))<=.0001,'Far supports changed relative angle/size');
  body=closedFarBody(a,start+6*27,44*27,site.size,[s0.tip,s1.tip]);assert.equal(length,50*27);
 }
 return{id:site.id,kind:site.kind,center:[site.x,site.z],angle:site.angle,size:site.size,stems,leafRoots,footContactRange:[minFoot,maxFoot],maximumStemFootError:maxFootError,maximumTipXYZError:maxTipError,maximumForkGap:maxForkGap,maximumLeafRootCenterlineDiscrepancy:maxLeafRootGap,maximumLeafRootOutsideActualStem:maxLeafOutside,stemFaceNumericalTolerance:1e-8,maximumLeafQuantizationBound:maxLeafQuantizationBound,quantizationCases,farBody:body};
}
function closedFarBody(a,start,length,size,supports){
 const at=i=>[a[i],a[i+1],a[i+2]],key=p=>p.join(':'),edges=new Map(),vertices=new Set(),triangles=[],origin=at(start);let volume=0,minThickness=Infinity;
 const cross=(p,q)=>[p[1]*q[2]-p[2]*q[1],p[2]*q[0]-p[0]*q[2],p[0]*q[1]-p[1]*q[0]],dot=(p,q)=>p.reduce((n,v,k)=>n+v*q[k],0),sub=(p,q)=>p.map((v,k)=>v-q[k]);
 for(let i=start;i<start+length;i+=27){const tri=[at(i),at(i+9),at(i+18)];triangles.push(tri);volume+=dot(sub(tri[0],origin),cross(sub(tri[1],origin),sub(tri[2],origin)))/6;
  for(let j=0;j<3;j++){const p=key(tri[j]),q=key(tri[(j+1)%3]);vertices.add(p);const e=p<q?p+'|'+q:q+'|'+p,r=edges.get(e)||{count:0,direction:0};r.count++;r.direction+=p<q?1:-1;edges.set(e,r);}}
 for(const e of edges.values())assert(e.count===2&&e.direction===0,'Far shrub body has an open or inconsistently wound edge');
 assert.equal(vertices.size,24);assert.equal(edges.size,66);assert.equal(vertices.size-edges.size+triangles.length,2);assert(volume>.01*size**3,'Far shrub is flat or inward');
 for(let i=0;i<11;i++){const o=start+i*4*27,high=at(o+18),low=at(o+27+9);assert.equal(high[0],low[0]);assert.equal(high[2],low[2]);minThickness=Math.min(minThickness,high[1]-low[1]);}
 assert(minThickness>.1*size,'Far shrub two-ring thickness disappeared');
 for(const p of supports){const dir=[1,.137,.319],hits=[];for(const [a,b,c]of triangles){const e1=sub(b,a),e2=sub(c,a),h=cross(dir,e2),det=dot(e1,h);if(Math.abs(det)<1e-10)continue;const s=sub(p,a),u=dot(s,h)/det,q=cross(s,e1),v=dot(dir,q)/det,t=dot(e2,q)/det;if(u>=-1e-7&&v>=-1e-7&&u+v<=1+1e-7&&t>1e-7)hits.push(t);}
  const unique=hits.sort((a,b)=>a-b).filter((t,i,all)=>!i||t-all[i-1]>1e-6);assert(unique.length%2===1,'Far support ends outside the actual closed crown');}
 return{triangles:44,weldedVertices:vertices.size,pairedEdges:edges.size,eulerCharacteristic:2,signedVolume:volume,minimumRingThickness:minThickness,supportsInsideClosedBody:true};
}
const HOME_OBSTACLES=[[-1016,128,-988,152],[-992,131,-974,150],[-1012,147,-987,155],[-1004,152,-996,178]];
const obstacleClearance=(x,z)=>Math.min(...HOME_OBSTACLES.map(([x0,z0,x1,z1])=>Math.hypot(Math.max(x0-x,0,x-x1),Math.max(z0-z,0,z-z1))));
const groundProtected=(x,z)=>x<=-1120||x>=-896||z<=0||z>=224||Math.hypot((x+997)/38,(z-144)/34)<=.69||Math.hypot(x+1093,z-56)<=26;
function terrainHeight(m){
 const a=m.vertices,ix=m.index;assert(float(a)&&a.length%9===0&&ArrayBuffer.isView(ix)&&ix.length%3===0,'Invalid indexed source '+m.id);
 const cells=new Map();for(let i=0;i<ix.length;i+=3){const q=[ix[i]*9,ix[i+1]*9,ix[i+2]*9];for(const k of q)assert(Number.isInteger(k)&&k>=0&&k+8<a.length,'Invalid source index '+m.id);
  const xs=q.map(k=>a[k]),zs=q.map(k=>a[k+2]);for(let x=Math.floor(Math.min(...xs)/16);x<=Math.floor(Math.max(...xs)/16);x++)for(let z=Math.floor(Math.min(...zs)/16);z<=Math.floor(Math.max(...zs)/16);z++){const key=x+','+z;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(q);}}
 return(x,z)=>{for(const [i,j,k]of cells.get(Math.floor(x/16)+','+Math.floor(z/16))||[]){
  const det=(a[j+2]-a[k+2])*(a[i]-a[k])+(a[k]-a[j])*(a[i+2]-a[k+2]);if(Math.abs(det)<1e-10)continue;
  const u=((a[j+2]-a[k+2])*(x-a[k])+(a[k]-a[j])*(z-a[k+2]))/det,v=((a[k+2]-a[i+2])*(x-a[k])+(a[i]-a[k])*(z-a[k+2]))/det,w=1-u-v;
  if(Math.min(u,v,w)>=-1e-7)return u*a[i+1]+v*a[j+1]+w*a[k+1];}
  assert.fail('Independent indexed terrain miss '+m.id+' at '+x+','+z);
 };
}
function independentRoutes(G){
 assert.equal(G.FOREST.paths.length,7,'Native forest route scope changed');const segments=[];
 for(const p of G.FOREST.paths){assert(p.samples.length>1&&p.width>0);for(let i=1;i<p.samples.length;i++)segments.push([p.samples[i-1][0],p.samples[i-1][1],p.samples[i][0],p.samples[i][1],p.width/2,p.id]);}
 return(x,z)=>{let best=Infinity;for(const [ax,az,bx,bz,width]of segments){const dx=bx-ax,dz=bz-az,length=dx*dx+dz*dz;assert(length>0);const t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/length));best=Math.min(best,Math.hypot(x-ax-t*dx,z-az-t*dz)-width);}return best;};
}
function understoreyWanted(G,read,terrain,added){
 // Execute the actual classes without constructing Three.js or a renderer.
 const scope=vm.createContext({GA:{...G}});vm.runInContext(String(read('src/renderer.js')),scope,{filename:'production-renderer.js'});const Base=scope.GA.DioramaRenderer;
 vm.runInContext(String(read('src/forest-canopy-renderer.js')),scope,{filename:'forest-canopy-renderer.js'});const Renderer=scope.GA.DioramaRenderer,r=Object.create(Renderer.prototype);
 r.recordMap=new Map([...terrain,...added].map(data=>[data.id,{data,wanted:false}]));r.packs=new Map([['forest',{}]]);r.quality='balanced';
 const opts={space:'surface',displayMode:'continuous',focus:'forest',vegetation:true},target=[-997,71,144],eye=[-982,80,162],planes=[];
 const results=[];
 function trial(name,rig,distance,settings=opts){let selected=[];for(const m of added){const record=r.recordMap.get(m.id),source=r.recordMap.get(m.terrainSource),baseTarget=Base.prototype.wanted.call(r,record,rig,settings,distance),baseSource=Base.prototype.wanted.call(r,source,rig,settings,distance);source.wanted=!baseSource;
   const actual=r.wanted(record,rig,settings,distance);assert.equal(actual,baseTarget&&baseSource,'Actual terrain precision mismatch '+name+'/'+m.id);if(actual)selected.push(m.id);}
  results.push({name,quality:r.quality,selected});return selected;}
 const rig={eye,target,planes};let selected=trial('near-balanced-stale-source-flag',rig,24);assert(selected.length>0&&selected.every(id=>id.endsWith(':near')));
 r.quality='low';selected=trial('near-low-still-real-near-terrain',rig,24);assert(selected.length>0&&selected.every(id=>id.endsWith(':near')));
 selected=trial('far-terrain-reachable-through-long-view',rig,1600);assert(selected.length>0&&selected.every(id=>id.endsWith(':far')));
 r.quality='balanced';assert.equal(trial('far-terrain-understorey-distance-culled',{eye:[200,100,162],target:[0,80,162],planes},201).length,0);
 assert.equal(trial('vegetation-off',rig,24,{...opts,vegetation:false}).length,0);
 assert.equal(trial('atlas-near-decoration-culled',rig,24,{...opts,displayMode:'atlas'}).length,0);
 assert.equal(trial('frustum-rejected',{...rig,planes:[[1,0,0,-100000]]},24).length,0);
 r.packs.delete('forest');assert.equal(trial('detail-unloaded',rig,24).length,0);
 for(const m of added)r.recordMap.delete(m.id);assert([...r.recordMap.values()].every(row=>row.data.component!=='forest-canopy-understorey'));
 r.packs.set('forest',{});for(const m of added)r.recordMap.set(m.id,{data:m,wanted:false});assert(trial('fresh-detail-reentry',rig,24).length>0);
 const near=added.find(m=>m.id.endsWith(':near')),source=r.recordMap.get(near.terrainSource);r.recordMap.delete(near.terrainSource);
 assert.throws(()=>r.wanted(r.recordMap.get(near.id),rig,opts,24),/terrain source/);r.recordMap.set(near.terrainSource,source);
 return{actualClassMethods:true,constructedRenderers:0,sourceFlagsIntentionallyStale:true,trials:results,missingSourceFails:true,limits:'Predicate/drop/reentry probes only; no GPU residency or rendered frame. Low quality does not force the terrain far tier. Distance can cull these decorations before terrain far is displayed.'};
}

// The supplied public package must precede canopy RGB preparation. This helper
// shallow-copies package/data containers, and uses only their real source arrays.
export function checkForestCanopyGround(G,detailInput,overviewInput,read,options={}){
 const F=G.FOREST_CANOPY_GROUND;assert(F?.prepare&&F?.detail&&F?.pathColors&&G.SurfaceContact,'Ground helpers missing');
 assert.equal(F.revision,2,'Ground revision needs explicit scope review');
 // Model-only CPU callers do not load renderer assets into their GA. Decode
 // the same immutable RGB8 module locally without changing the caller's GA.
 const C=G.FOREST_PATH_COLORS||(()=>{const scope=vm.createContext({GA:{},atob});vm.runInContext(String(read('src/forest-path-colors.js')),scope,{filename:'forest-path-colors.js'});return scope.GA.FOREST_PATH_COLORS;})();assert(C?.get);
 assert.equal(json(Array.from(F.terrainIds)),json(TERRAIN_IDS));assert.equal(json(Array.from(F.roi)),json([-1120,0,-896,224]));
 const sourceRecords=overviewInput.meshes.slice(),publicSource=sourceSnapshots(sourceRecords),detailSource=sourceSnapshots(detailInput.meshes),pack={...overviewInput,meshes:sourceRecords.slice()},data={};
 const start=performance.now();assert.equal(F.prepare(data,pack).length,0);const publicMap=new Map(pack.meshes.map(m=>[m.id,m]));assert.equal(publicMap.size,pack.meshes.length);
 let changedVertices=0,protectedRGBComponents=0,positionNormalComponents=0,copiedBytes=0;
 const colorRange={before:[Infinity,-Infinity],after:[Infinity,-Infinity]};
 for(const m of sourceRecords){const n=publicMap.get(m.id);assert(n,'Public source removed '+m.id);if(!TERRAIN_IDS.includes(m.id)){assert.equal(n,m,'Unrelated public record copied');continue;}
  assert.equal(json(metadata(n)),json(metadata(m)),'Terrain metadata changed');assert.equal(n.index,m.index,'Terrain index copied/changed');assert.equal(n.center,m.center);assert.equal(n.tile,m.tile);assert.equal(n.vertices.length,m.vertices.length);
  const a=m.vertices,b=n.vertices,A=new Uint32Array(a.buffer,a.byteOffset,a.length),B=new Uint32Array(b.buffer,b.byteOffset,b.length);if(a!==b)copiedBytes+=b.byteLength;
  for(let i=0;i<a.length;i+=9){let changed=false;for(let k=0;k<6;k++){assert.equal(A[i+k],B[i+k],'Terrain position/normal bit changed');positionNormalComponents++;}
   for(let k=6;k<9;k++){assert(Number.isFinite(b[i+k])&&b[i+k]>=0&&b[i+k]<=1,'Invalid linear terrain RGB');changed||=A[i+k]!==B[i+k];colorRange.before[0]=Math.min(colorRange.before[0],a[i+k]);colorRange.before[1]=Math.max(colorRange.before[1],a[i+k]);colorRange.after[0]=Math.min(colorRange.after[0],b[i+k]);colorRange.after[1]=Math.max(colorRange.after[1],b[i+k]);
    if(groundProtected(a[i],a[i+2])){assert.equal(A[i+k],B[i+k],'ROI/Marisa core/mushroom RGB changed');protectedRGBComponents++;}}
   changedVertices+=Number(changed);
  }
 }
 assert(changedVertices>0);assert.equal(data.forestCanopyGround.changedVertices,changedVertices);assert.equal(data.forestCanopyGround.copiedBytes,copiedBytes);assert(copiedBytes<=1024*1024);
 const preparedRefs=pack.meshes;assert.equal(F.prepare(data,pack).length,0);assert.equal(pack.meshes,preparedRefs,'Idempotent ground rebuilt records');
 const contactBytes=data.surfaceContacts['forest-canopy-ground'].near.byteLength+data.surfaceContacts['forest-canopy-ground'].far.byteLength;assert(contactBytes>0&&contactBytes<=256*1024);assert.equal(data.forestCanopyGround.contactBytes,contactBytes);
 let commonColorSamples=0;const nearColors=new Map();for(const m of pack.meshes.filter(m=>TERRAIN_IDS.includes(m.id)&&!m.globalFar))for(let i=0;i<m.vertices.length;i+=9)nearColors.set(m.vertices[i]+':'+m.vertices[i+2],m.vertices.subarray(i+6,i+9));
 for(const m of pack.meshes.filter(m=>TERRAIN_IDS.includes(m.id)&&m.globalFar))for(let i=0;i<m.vertices.length;i+=9){const c=nearColors.get(m.vertices[i]+':'+m.vertices[i+2]);if(c){sameView(c,m.vertices.subarray(i+6,i+9),'Shared near/far terrain albedo');commonColorSamples++;}}
 // RGB8 contacts come from the existing offline asset, not a terrain solver.
 const rgbAssetSHA=hash(read('src/forest-path-colors.js')),assetMeta=json(C.metadata),pathReports=[];
 const savedSurface=G.SurfaceContact,savedTerrain=G.Terrain,savedAsama=G.ASAMA;
 G.SurfaceContact={prepare(){throw Error('Path color called terrain contacts');},sampler(){throw Error('Path color called terrain sampler');}};G.Terrain=class{constructor(){throw Error('Path color constructed Terrain');}};G.ASAMA={sampleRenderedTerrain(){throw Error('Path color called ASAMA');}};
 try{for(const m of sourceRecords.filter(m=>/^island:routes:forest:-?\d+:-?\d+(?::shoulder)?$/.test(m.id))){const a=m.vertices,original=C.get(m.id,a.length/9,m.index.length),before=original.slice(),next=F.pathColors(m,a,original);assert(ArrayBuffer.isView(next)&&next.constructor.name==='Uint8Array'&&next.length===original.length);sameView(original,before,'Shared RGB8 asset mutated');let changed=0,protectedComponents=0;
   for(let i=0,j=0;i<a.length;i+=9,j+=3)for(let k=0;k<3;k++){changed+=Number(original[j+k]!==next[j+k]);if(!RGB_PATH_IDS.has(m.id)||groundProtected(a[i],a[i+2])){assert.equal(next[j+k],original[j+k],'Road RGB8 escaped scope');protectedComponents++;}}
   if(!RGB_PATH_IDS.has(m.id))assert.equal(next,original,'Unrelated road RGB8 copied');pathReports.push({id:m.id,changedRGBComponents:changed,protectedComponents,privateCopy:next!==original,sourceRGB8SHA:hash(raw(original))});
  }}finally{G.SurfaceContact=savedSurface;G.Terrain=savedTerrain;G.ASAMA=savedAsama;}
 assert.equal(hash(read('src/forest-path-colors.js')),rgbAssetSHA);assert.equal(json(C.metadata),assetMeta);
 const out=F.detail(data,detailInput);assert.equal(out.meshes.length-detailInput.meshes.length,4);for(let i=0;i<detailInput.meshes.length;i++)assert.equal(out.meshes[i],detailInput.meshes[i],'Existing detail source/reference changed');
 const added=out.meshes.slice(detailInput.meshes.length);assert.equal(json(added.map(m=>m.id)),json(GROUND_IDS));const sourceTerrain=sourceRecords.filter(m=>TERRAIN_IDS.includes(m.id)),heights=new Map(sourceTerrain.map(m=>[m.id,terrainHeight(m)])),routeClearance=independentRoutes(G);
 let nearTriangles=0,farTriangles=0,geometryBytes=0,groundVertices=0,minContact=Infinity,maxContact=-Infinity,minRouteClearance=Infinity,minSphereMargin=Infinity,minHomeDistance=Infinity,minBuildingClearance=Infinity,minNativeRootClearance=Infinity;const recordReports=[],outerSeen=new Set(),prefixChecks=[];
 const nativeRoots=detailInput.meshes.filter(m=>TARGETS.has(m.id)&&m.id.endsWith(':leaf')).flatMap(m=>Array.from({length:m.instances.length/16},(_,i)=>({x:m.instances[i*16+12],z:m.instances[i*16+14],radius:Math.hypot(m.instances[i*16],m.instances[i*16+2])*3.05})));assert.equal(nativeRoots.length,47);
 for(const site of BAND_SITES){const clearance=Math.min(...nativeRoots.map(r=>Math.hypot(r.x-site.x,r.z-site.z)-r.radius));assert(clearance>=.4,'Reviewed band center overlaps original root footprint');minNativeRootClearance=Math.min(minNativeRootClearance,clearance);}
 for(const m of added){assert.equal(m.owner,'forest');assert.equal(m.region,'forest');assert.equal(m.space,'surface');assert.equal(m.group,'vegetation');assert.equal(m.component,'forest-canopy-understorey');assert.equal(m.material,'forestLeaf');assert.equal(m.forestCanopyRevision,F.revision);assert.equal(m.nearDecoration,true);
  for(const key of['globalSurface','globalNear','globalFar','farVertices','instances','instanceColors','index','leafCards','terrainCenter','terrainLodRadius'])assert(!(key in m),'Unexpected ground field '+key);
  const far=m.id.endsWith(':far'),terrainId=m.id.replace('forest:canopy-ground:','island:terrain:').replace(/:near$/,'');assert.equal(m.terrainSource,terrainId);assert.equal(m.terrainPrecision,far?'far':'near');assert.equal(m.forestCanopyFar,far);
  const terrain=sourceTerrain.find(q=>q.id===terrainId);assert(terrain);assert.equal(json(m.terrainTile),json(terrain.tile));assert(Array.isArray(m.siteIDs)&&m.siteIDs.length>0&&new Set(m.siteIDs).size===m.siteIDs.length);
  assert(Array.isArray(m.siteKinds)&&m.siteKinds.length===m.siteIDs.length&&Array.isArray(m.siteRanges)&&m.siteRanges.length===m.siteIDs.length,'Missing exact site segmentation');
  const oldCount=OLD_GROUND_COUNTS.get(m.terrainTile[0]),outer=CANDIDATE_SITES.filter(p=>(p.x<-1024?-1280:-1024)===m.terrainTile[0]);assert.equal(m.siteIDs.length,oldCount+outer.length);assert.equal(json(m.siteIDs.slice(oldCount)),json(outer.map(p=>p.id)),'Candidate site identity/order changed');
  if(options.previousGround){const previous=options.previousGround.meshes.find(q=>q.id===m.id);assert(previous);assert.equal(previous.siteIDs.length,oldCount);assert.equal(json(m.siteIDs.slice(0,oldCount)),json(previous.siteIDs),'Original 79 site identity/order changed');sameView(m.vertices.subarray(0,previous.vertices.length),previous.vertices,'Original 79 ground vertex prefix changed');prefixChecks.push({id:m.id,sites:oldCount,retainedFloats:previous.vertices.length,retainedBytes:previous.vertices.byteLength,sha256:hash(raw(previous.vertices))});}
  const triangles=m.vertices.length/27,expectedTriangles=oldCount*(far?8:28)+outer.reduce((n,p)=>n+OUTER_TRIANGLES[p.kind][far?'far':'near'],0);assert.equal(triangles,expectedTriangles);if(far)farTriangles+=triangles;else nearTriangles+=triangles;geometryBytes+=m.vertices.byteLength;const geometry=shape(m.vertices,m.id),height=heights.get(terrainId),[tx,tz,size]=m.terrainTile;
  let recordMinRoute=Infinity,recordMinContact=Infinity,recordMaxContact=-Infinity,recordSphereMargin=Infinity,recordHome=Infinity,recordBuilding=Infinity;for(let i=0;i<m.vertices.length;i+=9){const a=m.vertices,x=a[i],y=a[i+1],z=a[i+2];assert(x>=tx&&x<=tx+size&&z>=tz&&z<=tz+size,'Understorey footprint crosses terrain precision tile');assert(x>=-1120&&x<-896&&z>=0&&z<224,'Understorey escaped sample ROI');const home=Math.hypot((x+997)/38,(z-144)/34);assert(home>.69,'Understorey enters retained .69 home core');recordHome=Math.min(recordHome,home);const obstacle=obstacleClearance(x,z);assert(obstacle>.4998,'Understorey enters retained house/shed/porch/entry footprint');recordBuilding=Math.min(recordBuilding,obstacle);assert(Math.hypot(x+1093,z-56)>26,'Understorey enters mushroom patch');
   const gap=y-height(x,z);assert(gap>=-.2801&&gap<2.8,'Independent real-terrain understorey height');recordMinContact=Math.min(recordMinContact,gap);recordMaxContact=Math.max(recordMaxContact,gap);const clearance=routeClearance(x,z);assert(clearance>=.6998,'Understorey enters one of seven retained routes');recordMinRoute=Math.min(recordMinRoute,clearance);
   const sphereMargin=m.radius-Math.hypot(x-m.center[0],y-m.center[1],z-m.center[2]);assert(sphereMargin>=-1e-5,'Understorey outside own culling sphere');recordSphereMargin=Math.min(recordSphereMargin,sphereMargin);groundVertices++;
  }
  let offset=0;const outerStemReports=[];for(let s=0;s<m.siteIDs.length;s++){const id=m.siteIDs[s],outer=OUTER_MAP.get(id),span=(outer?OUTER_TRIANGLES[outer.kind][far?'far':'near']:(far?8:28))*27;assert.equal(json(m.siteRanges[s]),json([offset,span]),'Site float range changed');assert.equal(m.siteKinds[s],outer?.kind||'fern','Site kind escaped reviewed scope');
   if(outer){assert(s>=oldCount);if(!far)outerSeen.add(id);}else{assert(s<oldCount,'Unreviewed outer ID '+id);if(id.startsWith('marisa-route-ground:'))assert(/^marisa-route-ground:\d+$/.test(id));else{const match=id.match(/^(forest:trees:(?:-10|-9):[01]:[012]:leaf):(\d+):ground:([01])$/);assert(match,'Unknown site identity '+id);const source=detailInput.meshes.find(q=>q.id===match[1]);assert(source&&Number(match[2])<source.instances.length/16,'Site tree ordinal lost');}}
   const base=offset;offset+=span;assert(offset<=m.vertices.length,'Site float range escaped geometry');
   let rootMin=Infinity,rootMax=-Infinity;for(let j=base;j<base+span;j+=9){const x=m.vertices[j],z=m.vertices[j+2],gap=m.vertices[j+1]-height(x,z);rootMin=Math.min(rootMin,gap);rootMax=Math.max(rootMax,gap);}
   assert(rootMin>=-.2801&&rootMin<=-.2799,'Detached understorey site');
   if(outer){assert(rootMax>(outer.kind==='shrub'?1.5:.3)&&rootMax<(outer.kind==='shrub'?2.8:.6),'Reviewed low/middle height layers changed');outerStemReports.push({...outerStems(m.vertices,base,span,outer,far,height),heightRange:[rootMin,rootMax]});}
   else assert(rootMax>.6&&rootMax<1.8,'Original 79-site height constraint changed');
  }
  assert.equal(offset,m.vertices.length,'Site ranges do not cover complete geometry');
  minContact=Math.min(minContact,recordMinContact);maxContact=Math.max(maxContact,recordMaxContact);minRouteClearance=Math.min(minRouteClearance,recordMinRoute);minSphereMargin=Math.min(minSphereMargin,recordSphereMargin);minHomeDistance=Math.min(minHomeDistance,recordHome);minBuildingClearance=Math.min(minBuildingClearance,recordBuilding);recordReports.push({id:m.id,terrainSource:terrainId,siteCount:m.siteIDs.length,triangles,geometry,siteRanges:m.siteRanges,outerStems:outerStemReports,contactRange:[recordMinContact,recordMaxContact],minimumSevenRouteEdgeClearance:recordMinRoute,minimumSphereMargin:recordSphereMargin,minimumHomeDistance:recordHome,minimumBuildingFootprintClearance:recordBuilding});
 }
 const nearSites=added.filter(m=>!m.forestCanopyFar).flatMap(m=>m.siteIDs);assert(new Set(nearSites).size===nearSites.length&&nearSites.length<=150);for(const m of added.filter(m=>!m.forestCanopyFar)){const far=added.find(q=>q.id===m.id.replace(/:near$/,':far'));assert.equal(json(far.siteIDs),json(m.siteIDs),'Near/far site identities changed');}
 assert.equal(nearSites.length,114);assert.equal(outerSeen.size,35);assert(nearTriangles<=10000&&farTriangles<=2500&&geometryBytes<=1.5*1024*1024);assert.equal(nearTriangles,79*28+15*62+20*324);assert.equal(farTriangles,79*8+15*19+20*50);assert.equal(out.meta.sites,nearSites.length);assert.equal(out.meta.nearTriangles,nearTriangles);assert.equal(out.meta.farTriangles,farTriangles);assert.equal(out.meta.bytes,geometryBytes);assert.equal(json(out.meta.outerGroups),json([{id:'west-front',sites:6},{id:'west-upper',sites:4},{id:'south-east',sites:6},{id:'east-bend',sites:5}]));
 assert.equal(json(out.meta.transitionBands),json([{id:'west',sites:8},{id:'east',sites:6}]));assert.equal(json(out.meta.bandCandidates),json(BAND_SITES.map(({id,band,x,z,angle,size,kind})=>({id,band,x,z,angle,size,kind,retained:true,reason:'retained'}))),'Band candidate outcomes escaped reviewed layout');
 const failed=[];function fail(name,meshes,contactFailure=false){const p={meshes},input=p.meshes,d={},previous=G.SurfaceContact;
  try{if(contactFailure)G.SurfaceContact={...previous,prepare(){throw Error('Injected actual-contact preparation failure');}};assert.throws(()=>F.prepare(d,p));assert.equal(p.meshes,input,'Partial ground publication');assert.equal(d.forestCanopyGround,undefined);assert.equal(d.surfaceContacts,undefined);}finally{G.SurfaceContact=previous;}failed.push(name);}
 fail('missing-terrain',sourceRecords.filter(m=>m.id!==TERRAIN_IDS[0]));fail('duplicate-terrain',[...sourceRecords,sourceRecords.find(m=>m.id===TERRAIN_IDS[0])]);fail('source-identity',sourceRecords.map(m=>m.id===TERRAIN_IDS[0]?{...m,material:'matte'}:m));fail('late-contact-failure',sourceRecords,true);
 const wrong=detailInput.meshes.map(m=>TARGETS.has(m.id)&&m.id.endsWith(':leaf')?{...m,instances:m.instances.slice()}:m),first=wrong.find(m=>TARGETS.has(m.id)&&m.id.endsWith(':leaf'));first.instances[12]+=.01;assert.throws(()=>F.detail(data,{...detailInput,meshes:wrong}),/sites require review/);assert.throws(()=>F.detail(data,out),/already applied/);
 const wanted=understoreyWanted(G,read,sourceTerrain,added);intact(publicSource);intact(detailSource);
 if(options.currentDetail){const existing=new Map(options.currentDetail.meshes.map(m=>[m.id,m]));for(const m of added){const n=existing.get(m.id);assert(n,'Final wrapper omitted ground record');assert.equal(json(metadata(m)),json(metadata(n)),'Final ground metadata differs');for(const [k,a]of typed(m))sameView(a,n[k],'Final grounded geometry differs');}}
 return{revision:F.revision,scope:'Only supplied actual source arrays; no terrain/world/region/Worker/GPU construction or fixture writes',sourceSHA:Object.fromEntries(['src/forest-canopy-ground.js','src/forest-canopy-renderer.js','src/forest-path-colors.js'].map(p=>[p,hash(read(p))])),terrain:{ids:TERRAIN_IDS,changedVertices,protectedRGBComponents,positionNormalComponents,copiedVertexViewBytes:copiedBytes,contactBytes,commonNearFarRGBSamples:commonColorSamples,colorRange,sourceArraysAndIndicesUnchanged:true,onlyFourRGBRecordsCopied:true,metadataPreserved:true,idempotent:true,atomicFailureCases:failed},roads:{sourceArraysIndicesMetadataAndRGB8AssetUnchanged:true,noTerrainOrAsamaSampling:true,paths:pathReports},detail:{sites:nearSites.length,originalSites:79,reviewedOuterSites:21,reviewedBandSites:14,records:4,nearTriangles,farTriangles,geometryBytes,vertices:groundVertices,independentIndexedTerrainContactRange:[minContact,maxContact],heightToleranceMeters:.0001,sevenRouteFootprintEdgeMinimum:minRouteClearance,routeToleranceMeters:.0002,minimumNativeRootCenterClearance:minNativeRootClearance,nativeRootRadiusMeaning:'Retained instance XZ scale times reviewed 3.05m original root envelope; band center clearance at least .4m',minimumSphereMargin:minSphereMargin,minimumHomeDistance:minHomeDistance,minimumBuildingFootprintClearance:minBuildingClearance,buildingFootprintRectangles:HOME_OBSTACLES,buildingCheckMeaning:'Conservative retained house/shed/porch/entry XZ boxes, not a whole-house triangle ray reconstruction',original79PrefixChecks:prefixChecks,allInputRecordReferencesPreserved:true,inputRecords:detailInput.meshes.length,existingMixedIDs:detailInput.meshes.filter(m=>['forest:understorey','forest:ground-foliage','forest:old-oak-roots'].includes(m.id)).map(m=>m.id),finalWrapperCompared:!!options.currentDetail,recordsReport:recordReports},wanted,executionMilliseconds:performance.now()-start,acceptance:'CPU source, contact, branch attachments, closed far volume and wanted safety only. Original public-road terrain crossings and real scene art remain separate acceptance gates.'};
}

export function checkForestCanopy(G,before,after,read,options={}){
 const U=G.FOREST_CANOPY,C=G.FOREST_CROWN_ROLLOUT,P=G.FOREST_CANOPY_PLANTS;assert(U?.replaceTree&&U?.applyDetail&&C?.applyDetail&&P?.prototype,'Canopy helpers missing');
 // This fixed 24-ID set is the accepted sample/ground scope, not the rollout scope.
 assert.equal(U.targets.size,24);for(const [id,t]of TARGETS)assert.equal(json(U.targets.get(id)),json(t),'Original sample target scope changed');
 const originals=treeRecords(before),candidates=treeRecords(after),old=inventory(originals),now=inventory(candidates),source=sourceSnapshots(originals);
 assert.equal(originals.length,310);assert.equal(candidates.length,310);assert.equal(old.pairs.size,155);assert.equal(now.pairs.size,155);assert.equal(old.count,755);assert.equal(now.count,755);
 assert.equal(before.meta.treeCount,755);assert.equal(after.meta.treeCount,755);
 const originalGeometry=new Set(originals.flatMap(m=>[m.vertices,m.farVertices])),shared=new Map(),geometry=new Map(),selected=[];
 let selectedTrees=0,sampleTrees=0,near=0,far=0;const variants=[0,0,0],prefixChecks=[];
 const rendererSource=String(read('src/renderer.js')),shadowExpression=rendererSource.match(/let castShadow=([^;]+);/);assert(shadowExpression,'Production native shadow condition changed');const cast=Function('m','shadows','return Boolean('+shadowExpression[1]+')');
 for(const m of originals){const n=now.map.get(m.id);assert(n,'Native tree lost '+m.id);const t={variant:Number(m.id.split(':')[4]),part:m.id.endsWith(':wood')?'wood':'leaf',count:m.instances.length/16},sample=TARGETS.get(m.id);
  assert.equal(json(metadata(n)),json(metadata(m,true)),'Tree metadata/bounds/LOD changed '+m.id);assert.equal(typed(n).length,typed(m).length,'New native tree attribute');
  if(sample){assert.equal(n.forestCanopyRevision,1,'Accepted sample marker changed');assert.equal(t.count,sample.count,'Accepted sample population changed');}else assert(!('forestCanopyRevision' in n),'Sample marker escaped original 24 records');
  sameView(n.instances,m.instances,'Full original matrix '+m.id);sameView(n.instanceColors,m.instanceColors,'Original RGB '+m.id);
  assert.equal(cast({...m,...metadata(m,true)},true),cast(n,true),'Native shadow qualification changed');assert(cast(n,true),'Native tree lost shadow eligibility');
  const probeInput={...m,...metadata(m,true)},probe=U.replaceTree(probeInput,t);assert.equal(probe.instances,m.instances,'Production replacement copied/merged original matrix');assert.equal(probe.instanceColors,m.instanceColors,'Production replacement copied original RGB');assert.equal(json(metadata(probe)),json(metadata(m,true)));
  for(const [field,lod,wood,leaf]of[['vertices','near',324,2400],['farVertices','far',126,280]]){
   const p=P.prototype(t.variant,lod);assert.equal(P.prototype(t.variant,lod),p,'Prototype cache unstable');assert(float(p.extraWood)&&float(p.leaf));
   const total=wood+(p.extraWood.length+p.leaf.length)/27;assert(total<=(lod==='near'?2724:406),'Whole-tree per-instance budget');assert.equal(total,lod==='near'?2724:402,'Reviewed rollout budget changed');
   assert.equal(m[field].length,(t.part==='wood'?wood:leaf)*27,'Original native prototype changed');assert(!originalGeometry.has(n[field]),'Candidate reused protected original geometry');
   if(t.part==='wood'){sameView(n[field].subarray(0,m[field].length),m[field],'Original wood prefix '+m.id+'/'+field);sameView(n[field].subarray(m[field].length),p.extraWood,'Appended wood '+m.id+'/'+field);prefixChecks.push({id:m.id,field,retainedTriangles:wood,addedTriangles:p.extraWood.length/27});}
   else assert.equal(n[field],p.leaf,'Leaf private cache bypassed');
   sameView(probe[field],n[field],'Production replacement differs from final same-source output');
   const key=t.variant+':'+t.part+':'+field;if(shared.has(key))assert.equal(n[field],shared.get(key),'Candidate sharing lost '+key);else shared.set(key,n[field]);
   for(const [part,a]of[['extraWood',p.extraWood],['leaf',p.leaf]])if(!geometry.has(a))geometry.set(a,{variant:t.variant,lod,part,...shape(a,key+'/'+part,part==='extraWood')});
   if(t.part==='leaf'){if(lod==='near')near+=total*t.count;else far+=total*t.count;}
  }
  const fit=boundsFit(n);selected.push({id:m.id,instances:t.count,center:n.center,radius:n.radius,bounds:fit});
  if(t.part==='leaf'){selectedTrees+=t.count;variants[t.variant]+=t.count;if(sample)sampleTrees+=t.count;}
 }
 assert.equal(selectedTrees,755);assert.equal(sampleTrees,47);assert.equal(json(variants),json([241,283,231]));assert.equal(shared.size,12);
 assert.equal(near,2056620);assert.equal(far,303510);assert.equal(after.meta.forestCanopy.trees,755);assert.equal(after.meta.forestCanopy.treeRecords,310);assert.equal(after.meta.forestCrownRollout.trees,755);assert.equal(json(Array.from(C.seeds)),json([134,591,833]));
 assert.equal(U.applyDetail(null,after),after,'Repeated application rebuilt a package');
 const transactions=probeTransactions(G,before);intact(source);
 let overview=null;if(options.overviewBefore||options.overviewAfter){assert(options.overviewBefore&&options.overviewAfter,'Supply both overview snapshots');const find=p=>p.meshes.find(m=>m.id==='overview:forest:trees'),a=find(options.overviewBefore),b=find(options.overviewAfter);assert(a&&b);assert.equal(a.instances.length/16,304);assert.equal(json(metadata(a)),json(metadata(b)));for(const [k,v]of typed(a))sameView(v,b[k],'Untouched overview304 '+k);overview={trees:304,allArraysAndMetadataExact:true,upgraded:false};}
 return{revision:U.revision,scope:'Same-current-build native before/final packages; no internal construction or fixture writes',sourceSHA:Object.fromEntries(['src/forest-canopy-plants.js','src/forest-crown-rollout.js','src/forest-canopy.js'].map(p=>[p,hash(read(p))])),population:{originalTrees:755,selectedTrees,selectedPairs:155,selectedVariants:variants,acceptedSampleTrees:sampleTrees,additionalTrees:708,fullMatrixRGBOrdinalIdentity:true},protection:{allTreeMetadataAndBoundsPreserved:true,original24SampleMarkersPreserved:true,allOriginalSourceArrayBytesUnchanged:true,originalWoodPrefixChecks:prefixChecks,productionReplacementReferencePreserved:true,shadow:{productionSourceSHA:hash(rendererSource),selectedRecords:310,eligibilityPreserved:true},idempotent:true,...transactions,overview},triangles:{selectedOriginalNear:2056620,selectedOriginalFar:306530,selectedCandidateNear:near,selectedCandidateFar:far,perTreeNearMaximum:2724,perTreeFarMaximum:406,meaning:'Expanded source budget, not full frame or GPU performance'},prototypes:[...geometry.values()],selectedRecords:selected,resources:{originalTreeViews:viewsBytes(originals),candidateTreeViews:viewsBytes(candidates),candidateSharedGeometryViews:shared.size,meaning:'Unique typed-array views. All 755 native trees use the same three near/far prototype pairs; resident GPU/backing ownership remains a separate measurement.'},acceptance:'Full native-tree CPU safety only; accepted panorama, local ground/roads and unchanged cold overview are separate scopes.'};
}
