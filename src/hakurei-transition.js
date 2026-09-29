/* 神社外围沿用公共树点位，以轻量叶簇逐渐衔接周边树形。 */
(function(G){'use strict';
const originalApply=G.LANDSCAPE.apply;
const colors={cedar:['#536d47','#5a7148','#506a46'],broadleaf:['#71844c','#617a43','#7b8d53']};
const random=(x,z,salt)=>G.rng(Math.imul(Math.round(x*32),374761393)^Math.imul(Math.round(z*32),668265263)^salt)();

function leafColor(vertices){
 // 公共原型将树皮与树叶合在一批；最亮的绿色顶点保留原树种底色。
 let color=[1,1,1],green=0;
 for(let i=0;i<vertices.length;i+=9){const r=vertices[i+6],g=vertices[i+7],b=vertices[i+8];if(g>r&&g>b&&g>green){color=[r,g,b];green=g;}}
 return color;
}

function bounds(instances,prototype){
 const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
 for(const a of Object.values(prototype))for(let i=0;i<a.length;i+=9)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],a[i+k]);hi[k]=Math.max(hi[k],a[i+k]);}
 const worldLo=[Infinity,Infinity,Infinity],worldHi=[-Infinity,-Infinity,-Infinity];
 // 变换原型包围盒的八角，覆盖所有树冠和斜枝，不依赖落点平均值。
 for(let i=0;i<instances.length;i+=16){const m=instances.subarray(i,i+16);for(let corner=0;corner<8;corner++){
  const p=G.transform(m,[0,1,2].map(k=>corner&(1<<k)?hi[k]:lo[k]));
  for(let k=0;k<3;k++){worldLo[k]=Math.min(worldLo[k],p[k]);worldHi[k]=Math.max(worldHi[k],p[k]);}
 }}
 return{center:worldLo.map((v,k)=>(v+worldHi[k])*.5),radius:G.length(G.sub(worldHi,worldLo))*.5+.01};
}

G.LANDSCAPE.apply=function(pack,terrain){
 const result=originalApply(pack,terrain);if(result.meta?.hakureiTransition)return result;
 const bins=new Map(),meshes=[];let trees=0;
 for(const m of result.meshes){
  const treeKind=m.id.split(':')[2];
  if(!m.globalSurface||m.component!=='transition-vegetation'||!['pine','broad'].includes(treeKind)||!m.instances){meshes.push(m);continue;}
  const keep=[],keepColors=[],sourceColor=leafColor(m.vertices);let removed=0;
  for(let i=0;i<m.instances.length;i+=16){
   const a=m.instances,x=a[i+12],z=a[i+14],distance=Math.hypot(x-1620,z-160);
   const selected=distance<330&&!G.DIORAMA.owner(x,z)&&random(x,z,17293)<1-G.smooth(210,330,distance);
   if(!selected){for(let j=0;j<16;j++)keep.push(a[i+j]);for(let j=0;j<3;j++)keepColors.push(m.instanceColors[i/16*3+j]);continue;}
   const kind=treeKind==='pine'?'cedar':'broadleaf',variant=Math.floor(random(x,z,63187)*3),key=kind;
   if(!bins.has(key))bins.set(key,{kind,treeKind,matrices:[],colors:[]});const bin=bins.get(key);
   // 矩阵逐值保留，落点、高度、朝向与尺度均不重新生成。
   for(let j=0;j<16;j++)bin.matrices.push(a[i+j]);
   const color=G.blend(G.rgb(colors[kind][variant]),sourceColor,G.smooth(150,330,distance));
   for(let j=0;j<3;j++)bin.colors.push(color[j]*m.instanceColors[i/16*3+j]);
   removed++;trees++;
  }
  if(!removed)meshes.push(m);
  else if(keep.length)meshes.push({...m,instances:new Float32Array(keep),instanceColors:new Float32Array(keepColors)});
 }
 for(const[key,bin]of bins){
  // 这一圈从约 90 米外开始；固定低档轮廓避免大桶 LOD 跳变与重复高精细树冠。
  const prototype=G.HAKUREI_PLANTS.transition(bin.kind,0,true),instances=new Float32Array(bin.matrices),leafColors=new Float32Array(bin.colors),box=bounds(instances,prototype);
  for(const part of ['wood','leaf'])meshes.push({
   id:'hakurei:transition:'+key+':'+part,owner:'island',region:'island',space:'surface',overview:true,globalSurface:true,
   group:'vegetation',component:'transition-vegetation',treeKind:bin.treeKind,
   material:part==='wood'?'hakureiBark':bin.kind==='cedar'?'hakureiNeedle':'hakureiLeaf',leafCards:part==='leaf',
   vertices:prototype[part],instances,instanceColors:part==='wood'?new Float32Array(bin.colors.length).fill(1):leafColors,...box
  });
 }
 result.meshes=meshes;result.meta={...result.meta,hakureiTransition:{trees,batches:bins.size*2,innerRadius:210,outerRadius:330}};
 return result;
};
})(globalThis.GA);
