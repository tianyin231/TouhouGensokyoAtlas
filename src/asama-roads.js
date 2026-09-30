/* Permanent Seiki road: same indexed near/far terrain as the renderer.
 * Old public highland geometry stays untouched. P route, no collision claim.
 */
(function(G){'use strict';
const soil=G.rgb('#aa9c7d');
function makeSampler(pack){const tiles=new Map();for(const m of pack.meshes)if(m.component==='island-terrain'&&!m.cutOnly&&m.index){const[x,z]=m.tile;tiles.set(`${x}:${z}:${m.globalFar?'far':'near'}`,{m,cells:null});}
 return function(x,z,lod){const tile=tiles.get(`${Math.floor(x/256)*256}:${Math.floor(z/256)*256}:${lod}`);if(!tile)throw Error(`No rendered road terrain at ${x},${z}/${lod}`);const m=tile.m,a=m.vertices,ix=m.index;
  if(!tile.cells){tile.cells=new Map();for(let i=0;i<ix.length;i+=3){const q=[ix[i]*9,ix[i+1]*9,ix[i+2]*9],xs=q.map(k=>a[k]),zs=q.map(k=>a[k+2]);for(let u=Math.floor(Math.min(...xs)/16);u<=Math.floor(Math.max(...xs)/16);u++)for(let v=Math.floor(Math.min(...zs)/16);v<=Math.floor(Math.max(...zs)/16);v++){const key=u+':'+v;if(!tile.cells.has(key))tile.cells.set(key,[]);tile.cells.get(key).push(q);}}}
  for(const[i,j,k]of tile.cells.get(Math.floor(x/16)+':'+Math.floor(z/16))||[]){const d=(a[j+2]-a[k+2])*(a[i]-a[k])+(a[k]-a[j])*(a[i+2]-a[k+2]);if(Math.abs(d)<1e-9)continue;const u=((a[j+2]-a[k+2])*(x-a[k])+(a[k]-a[j])*(z-a[k+2]))/d,v=((a[k+2]-a[i+2])*(x-a[k])+(a[i]-a[k])*(z-a[k+2]))/d,w=1-u-v;if(Math.min(u,v,w)<-1e-5)continue;
   return {p:[x,u*a[i+1]+v*a[j+1]+w*a[k+1],z],c:[6,7,8].map(n=>u*a[i+n]+v*a[j+n]+w*a[k+n]),n:G.norm([3,4,5].map(n=>u*a[i+n]+v*a[j+n]+w*a[k+n])),tile:m};}
  throw Error(`No triangle under Seiki route ${x},${z}`);
 };
}
function distance(x,z,path){let best=Infinity;for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],dx=b[0]-a[0],dz=b[1]-a[1],t=G.clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz),0,1);best=Math.min(best,Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz));}return best;}
function build(data,pack){const sample=makeSampler(pack),points=[],path=G.ASAMA.surfacePath,cross=[-1.25,-1,-.55,0,.55,1,1.25],batches=new Map();
 for(let i=0;i<path.length-1;i++){const a=path[i],b=path[i+1],N=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.85));for(let j=0;j<N;j++)points.push([G.mix(a[0],b[0],j/N),G.mix(a[1],b[1],j/N)]);}points.push(path.at(-1));
 for(const lod of ['near','far']){const row=i=>{const p=points[i],a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],d=G.norm([b[0]-a[0],0,b[1]-a[1]]);return cross.map(u=>{const v=sample(p[0]-d[2]*2.4*u,p[1]+d[0]*2.4*u,lod),edge=1-G.smooth(.88,1.25,Math.abs(u));
   // At the T-junction blend against the existing road's colour, not bare ground.
   const old=i>points.length-25?1-G.smooth(2.8*.88,2.8*1.25,distance(v.p[0],v.p[2],G.HIGHLAND.paths[0])):0;
   v.c=G.blend(v.c,soil,Math.max(edge,old));v.p[1]+=.12+.2*edge;return v;});};
  let a=row(0);for(let i=0;i<points.length-1;i++){const b=row(i+1),m=a[3].tile;if(!batches.has(m.id))batches.set(m.id,{g:new G.Geometry(),source:m});const g=batches.get(m.id).g;
   for(let j=0;j<cross.length-1;j++)for(const tri of [[a[j],b[j+1],b[j]],[a[j],a[j+1],b[j+1]]])for(const v of tri)g.vertex(v.p,v.n,v.c);a=b;}
 }
 return [...batches.values()].map(({g,source:m})=>{const mesh=g.mesh('seiki:public-road:'+m.id,'roads',{owner:'seiki',region:'seiki',space:'surface',overview:true,globalSurface:true,globalNear:m.globalNear,globalFar:m.globalFar,material:'shelfGround',asamaPart:'road',asamaScene:'surface',basis:'P',terrainLodRadius:m.radius,terrainSource:m.id});return {...mesh,center:m.center.slice(),radius:Math.max(m.radius+4,mesh.radius+G.length(G.sub(mesh.center,m.center)))};});
}
G.ASAMA.buildPublicRoad=build;G.ASAMA.sampleRenderedTerrain=makeSampler;
G.extraOverviewBuilders=[...(G.extraOverviewBuilders||[]),build];
})(globalThis.GA);
