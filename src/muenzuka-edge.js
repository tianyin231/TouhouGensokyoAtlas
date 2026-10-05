/* P: the original western Muenzuka woodland arc, not a new planting.
 * Preserve stems, roots, transforms, colors, purple cherries, memorials and
 * paths. Closed foliage masses and connected edge leaves share near/far form.
 * Cold overview plants retain their own identities; they are not native IDs.
 */
(function(G){'use strict';
const revision=2,TAU=Math.PI*2,seeds=Object.freeze([730,751]);
const cells=Object.freeze(['-23:6','-23:7','-23:8']),scope=Object.freeze([-1840,480,-1760,672]);
const cache=new Map(),prepared=new WeakMap(),pattern=/^muenzuka:trees:(-?\d+):(-?\d+):([01]):(wood|leaf)$/;
const inside=(x,z)=>x>=scope[0]&&x<scope[2]&&z>=scope[1]&&z<scope[3];
const target=m=>{const q=pattern.exec(m.id);return q&&cells.includes(q[1]+':'+q[2])?{variant:Number(q[3]),part:q[4],cell:q[1]+':'+q[2]}:null;};
const {add,sub,mul,norm,cross,dot}=G;
function sourceBanks(variant,far){
 const R=G.rng(seeds[variant]),height=13.6+R()*4,points=[];
 for(let i=0;i<(far?5:8);i++){
  const a=i*2.399,r=4.4+R()*2.6,y=height*.64+R()*4;
  points.push([Math.cos(a)*r,y,Math.sin(a)*r]);
  if(!far)for(let j=0;j<4;j++)R();
 }
 return{height,points};
}
function controls(variant){
 const near=sourceBanks(variant,false),far=sourceBanks(variant,true);
 const lobes=near.points.map((p,i)=>{
  const q=far.points[i]||p,axis=norm([p[0],0,p[2]]),side=[-axis[2],0,axis[0]];
  // A bough carries one irregular, deep lobe. The long inward shoulder joins
  // adjacent boughs; it does not end in the old horizontal platter rim.
  const c=add(mul(add(p,q),.5),add(mul(axis,-.35),[0,.60+(i%3)*.16,0]));
  return{center:c,radii:[3.75+(i%3)*.15,2.65+(i%3)*.20,2.95+(i%2)*.16],axis,side,
   phase:i*.83+variant*.51,anchors:i<5?[p,q]:[p],kind:'bough'};
 });
 lobes.push({center:[0,near.height+.15,0],radii:[3.65,2.55,3.3],axis:[1,0,0],side:[0,0,1],phase:1.9+variant*.4,anchors:[],kind:'joined-apex'});
 return lobes;
}
const phi=(1+Math.sqrt(5))/2;
const unitVertices=[[-1,phi,0],[1,phi,0],[-1,-phi,0],[1,-phi,0],[0,-1,phi],[0,1,phi],[0,-1,-phi],[0,1,-phi],[phi,0,-1],[phi,0,1],[-phi,0,-1],[-phi,0,1]].map(norm);
const unitFaces=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]];
function shellPoint(l,u){
 const a=l.phase,c=Math.cos(a),s=Math.sin(a),q=[u[0]*c-u[2]*s,u[1],u[0]*s+u[2]*c];
 const wave=1+.075*Math.sin(q[0]*4.3+q[1]*2.1+l.phase)+.045*Math.sin(q[2]*5.2-q[1]*3.7);
 const local=[q[0]*l.radii[0]*wave,q[1]*l.radii[1]*(1+.06*Math.sin(q[0]*3+l.phase)),q[2]*l.radii[2]*wave];
 const p=add(l.center,add(add(mul(l.axis,local[0]),[0,local[1],0]),mul(l.side,local[2])));
 const n=norm(add(add(mul(l.axis,q[0]/l.radii[0]),[0,q[1]/l.radii[1],0]),mul(l.side,q[2]/l.radii[2])));
 return{p,n};
}
function triangles(level){
 let faces=unitFaces.map(f=>f.map(i=>unitVertices[i]));
 if(level)faces=faces.flatMap(([a,b,c])=>{const ab=norm(add(a,b)),bc=norm(add(b,c)),ca=norm(add(c,a));return[[a,ab,ca],[ab,b,bc],[ca,bc,c],[ab,bc,ca]];});
 return faces;
}
function appendTriangle(g,vs,color){
 if(dot(cross(sub(vs[1].p,vs[0].p),sub(vs[2].p,vs[0].p)),add(add(vs[0].n,vs[1].n),vs[2].n))<0)vs=[vs[0],vs[2],vs[1]];
 for(const v of vs)g.vertex(v.p,v.n,color);
}
function leafSprays(g,l,index){
 // Each folded blade starts on the closed supporting foliage shell. These
 // outlines break the near silhouette without hollowing out the far volume.
 const R=G.rng(971+index*613),count=12;
 for(let i=0;i<count;i++){
  const a=i*2.399+l.phase,y=-.38+R()*1.18,u=norm([Math.cos(a),y,Math.sin(a)]);
  const anchor=shellPoint(l,u),side=norm(cross(anchor.n,Math.abs(anchor.n[1])>.9?[1,0,0]:[0,1,0])),along=norm(add(cross(side,anchor.n),mul(anchor.n,.20)));
  const length=.64+R()*.43,width=.28+R()*.15,root=add(anchor.p,mul(anchor.n,-.20));
  const tip=add(root,mul(along,length)),mid=add(root,add(mul(along,length*.47),mul(anchor.n,.14))),left=add(mid,mul(side,width)),right=add(mid,mul(side,-width));
  const color=[.88+R()*.10,.94+R()*.06,.85+R()*.10];
  appendTriangle(g,[{p:root,n:anchor.n},{p:left,n:anchor.n},{p:mid,n:anchor.n}],color);
  appendTriangle(g,[{p:left,n:anchor.n},{p:tip,n:anchor.n},{p:mid,n:anchor.n}],color);
  appendTriangle(g,[{p:root,n:anchor.n},{p:mid,n:anchor.n},{p:right,n:anchor.n}],color);
  appendTriangle(g,[{p:mid,n:anchor.n},{p:tip,n:anchor.n},{p:right,n:anchor.n}],color);
 }
}
function prototype(variant){
 if(!Number.isInteger(variant)||variant<0||variant>1)throw Error('Unknown Muenzuka edge prototype');
 if(cache.has(variant))return cache.get(variant);
 const lobes=controls(variant),out={controls:lobes};
 for(const [lod,level]of [['near',1],['far',0]]){
  const g=new G.Geometry(),faces=triangles(level);
  for(let i=0;i<lobes.length;i++){
   const l=lobes[i],shade=.94+(i%3)*.025,color=[shade,Math.min(1,shade+.025),shade*.97];
   for(const f of faces)appendTriangle(g,f.map(u=>shellPoint(l,u)),color);
   if(level)leafSprays(g,l,i+variant*19);
  }
  out[lod]=g.mesh('muenzuka-edge-prototype').vertices;
 }
 if(out.near.length/27!==1152||out.far.length/27!==180)throw Error('Muenzuka edge prototype budget changed');
 cache.set(variant,out);return out;
}
function buffers(roots){
 const seen=new Set(),found=new Set();
 function visit(o){if(!o||typeof o!=='object'||seen.has(o))return;seen.add(o);if(ArrayBuffer.isView(o)){found.add(o.buffer);return;}if(o instanceof Map||o instanceof Set){for(const v of o.values())visit(v);return;}for(const v of Object.values(o))visit(v);}
 for(const r of roots)visit(r);return found;
}
const bytes=roots=>[...buffers(roots)].reduce((n,b)=>n+b.byteLength,0);
function applyDetail(pack){
 if(pack.meta?.muenzukaEdge?.revision===revision)return pack;
 const selected=pack.meshes.filter(m=>target(m)?.part==='leaf');
 if(selected.length!==6||selected.reduce((n,m)=>n+m.instances.length/16,0)!==25)throw Error('Muenzuka western native population changed');
 for(const m of selected){
  const t=target(m);
  if(m.owner!=='muenzuka'||m.region!=='muenzuka'||m.component!=='woodland'||m.material!=='forestLeaf'||m.index||m.vertices.length!==2234*27||m.farVertices.length!==216*27||m.lodDistance!==180)throw Error('Muenzuka western native source changed: '+m.id);
  for(let i=0;i<m.instances.length;i+=16)if(!inside(m.instances[i+12],m.instances[i+14]))throw Error('Muenzuka tree escaped original cell');
  if(!pack.meshes.some(q=>q.id===m.id.replace(/:leaf$/,':wood')&&q.vertices.length===411*27&&q.farVertices.length===75*27))throw Error('Muenzuka original stem pair missing');
 }
 const meshes=pack.meshes.map(m=>{const t=target(m);if(!t||t.part!=='leaf')return m;const p=prototype(t.variant);return{...m,vertices:p.near,farVertices:p.far};});
 return{...pack,meshes,bytes:bytes([meshes]),meta:{...pack.meta,muenzukaEdge:{revision,basis:'P',scope,cells,trees:25,records:6,sourceBytes:bytes([...cache.values()]),changes:'Existing western native foliage only; original wood and every placement retained'}}};
}
const coldIDs=Object.freeze(['overview016:muenzuka|forestLeaf|vegetation|I7','overview016:muenzuka|forestLeaf|vegetation|I9']);
function subset(a,stride,indices){const out=new Float32Array(indices.length*stride);for(let i=0;i<indices.length;i++)out.set(a.subarray(indices[i]*stride,indices[i]*stride+stride),i*stride);return out;}
function prepare(data,pack){
 if(prepared.has(pack))return prepared.get(pack);
 const changes=[];
 for(let variant=0;variant<2;variant++){
  const id=coldIDs[variant],m=pack.meshes.find(m=>m.id===id),n=variant?15:16;
  if(!m||m.owner!=='muenzuka'||m.component!=='western-region-preview'||m.material!=='forestLeaf'||m.vertices.length!==216*27||m.instances?.length!==n*16||m.instanceColors?.length!==n*3)throw Error('Muenzuka cold woodland source changed: '+id);
  const selected=[],retained=[];for(let i=0;i<n;i++)(inside(m.instances[i*16+12],m.instances[i*16+14])?selected:retained).push(i);
  if(!selected.length||!retained.length)throw Error('Muenzuka cold western subset requires review');
  changes.push({variant,source:m,selected,retained});
 }
 const details=[];
 for(const q of changes){
  const {source:m,variant,selected,retained}=q,index=pack.meshes.indexOf(m),p=prototype(variant);
  const rest={...m,instances:subset(m.instances,16,retained),instanceColors:subset(m.instanceColors,3,retained)};
  const edge={...m,id:m.id+':muenzuka-west-edge',vertices:p.far,instances:subset(m.instances,16,selected),instanceColors:subset(m.instanceColors,3,selected)};
  if(m.farVertices)edge.farVertices=p.far;
  // Existing owner, LOD, region visibility, and cold scope remain. These
  // independent coarse plants are never presented as native plant matches.
  pack.meshes.splice(index,1,rest,edge);
  details.push({sourceId:m.id,addedId:edge.id,variant,selected,retained,trees:selected.length});
 }
 pack.bytes=bytes([pack.meshes]);
 const meta={revision,basis:'P',scope,cold:details,sourceBytes:bytes([...cache.values()]),nativeCells:cells,nativeTrees:25};
 prepared.set(pack,meta);return meta;
}
const originalBuildRegion=G.buildRegion;
G.buildRegion=async function(data,id,legacy){if(id!=='muenzuka')return originalBuildRegion(data,id,legacy);const start=performance.now(),out=applyDetail(await originalBuildRegion(data,id,legacy));out.builtMs=performance.now()-start;return out;};
G.extraOverviewBuilders=G.extraOverviewBuilders||[];
G.extraOverviewBuilders.push((data,pack)=>{prepare(data,pack);return[];});
G.MUENZUKA_EDGE=Object.freeze({revision,scope,cells,seeds,target,inside,sourceBanks,controls,prototype,applyDetail,prepare,metadata:pack=>prepared.get(pack),bytes,originalBuildRegion,coldIDs});
})(globalThis.GA);
