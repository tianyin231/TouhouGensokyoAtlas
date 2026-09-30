/* Contact sampling against rendered indexed terrain, not its analytic approximation.
 * Compact position-only triangles for the requested bounds are cloned to the Worker.
 * Preparing contacts does not build any regional detail model or modify source arrays.
 */
(function(G){'use strict';
function prepare(data,pack,id,bounds){const out={near:[],far:[],bounds};
 for(const m of pack.meshes){if(m.component!=='island-terrain'||m.cutOnly||!m.index)continue;const tile=m.tile;if(tile&&(tile[0]>bounds[2]||tile[0]+tile[2]<bounds[0]||tile[1]>bounds[3]||tile[1]+tile[2]<bounds[1]))continue;
  const a=m.vertices,ix=m.index,dest=m.globalFar?out.far:out.near;
  for(let i=0;i<ix.length;i+=3){const q=[ix[i]*9,ix[i+1]*9,ix[i+2]*9],xs=q.map(k=>a[k]),zs=q.map(k=>a[k+2]);if(Math.max(...xs)<bounds[0]||Math.min(...xs)>bounds[2]||Math.max(...zs)<bounds[1]||Math.min(...zs)>bounds[3])continue;for(const k of q)dest.push(a[k],a[k+1],a[k+2]);}
 }
 if(!out.near.length||!out.far.length)throw Error('Missing terrain contact triangles: '+id);
 out.near=Float32Array.from(out.near);out.far=Float32Array.from(out.far);
 (data.surfaceContacts??={})[id]=out;return out;
}
function sampler(data,id,lod='near'){const a=data.surfaceContacts?.[id]?.[lod];if(!a)throw Error('Terrain contacts not prepared: '+id+'/'+lod);const cells=new Map();
 for(let i=0;i<a.length;i+=9){const x=[a[i],a[i+3],a[i+6]],z=[a[i+2],a[i+5],a[i+8]];for(let u=Math.floor(Math.min(...x)/16);u<=Math.floor(Math.max(...x)/16);u++)for(let v=Math.floor(Math.min(...z)/16);v<=Math.floor(Math.max(...z)/16);v++){const k=u+','+v;if(!cells.has(k))cells.set(k,[]);cells.get(k).push(i);}}
 function height(x,z){for(const i of cells.get(Math.floor(x/16)+','+Math.floor(z/16))||[]){const j=i+3,k=i+6,d=(a[j+2]-a[k+2])*(a[i]-a[k])+(a[k]-a[j])*(a[i+2]-a[k+2]);if(Math.abs(d)<1e-9)continue;const u=((a[j+2]-a[k+2])*(x-a[k])+(a[k]-a[j])*(z-a[k+2]))/d,v=((a[k+2]-a[i+2])*(x-a[k])+(a[i]-a[k])*(z-a[k+2]))/d,w=1-u-v;if(Math.min(u,v,w)>=-1e-5)return u*a[i+1]+v*a[j+1]+w*a[k+1];}throw Error('No '+lod+' triangle at '+x+','+z);}
 return {height,normal:(x,z)=>G.norm([height(x-1,z)-height(x+1,z),2,height(x,z-1)-height(x,z+1)]),bytes:a.byteLength};
}
G.SurfaceContact={prepare,sampler};
})(globalThis.GA);
