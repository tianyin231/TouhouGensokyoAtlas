/* Local culling envelopes for the western Muenzuka crown replacement.
 * Both actual LODs and every forestLeaf wind phase share one conservative
 * sphere. No geometry, material, LOD distance, or other region is changed.
 */
(function(G){'use strict';
const Base=G.DioramaRenderer,prototypeCache=new WeakMap(),recordCache=new WeakMap();
const eligible=m=>m.material==='forestLeaf'&&m.instances&&(
 /^muenzuka:trees:-23:(6|7|8):[01]:leaf$/.test(m.id)||
 /^overview016:muenzuka\|forestLeaf\|vegetation\|I[79]:muenzuka-west-edge$/.test(m.id));
const sway=y=>{const t=Math.max(0,Math.min(1,(y-4)/18));return t*t*(3-2*t)*.16;};
function prototypeSphere(near,far){
 let variants=prototypeCache.get(near);if(!variants){variants=new WeakMap();prototypeCache.set(near,variants);}
 if(variants.has(far))return variants.get(far);
 const arrays=near===far?[near]:[near,far],lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
 for(const a of arrays)for(let i=0;i<a.length;i+=9){const x=a[i],y=a[i+1],z=a[i+2],w=sway(y);
  lo[0]=Math.min(lo[0],x-w);hi[0]=Math.max(hi[0],x+w);lo[1]=Math.min(lo[1],y);hi[1]=Math.max(hi[1],y);lo[2]=Math.min(lo[2],z-w*.5);hi[2]=Math.max(hi[2],z+w*.5);
 }
 const center=lo.map((v,i)=>(v+hi[i])*.5);let radius=0;
 for(const a of arrays)for(let i=0;i<a.length;i+=9){const w=sway(a[i+1]);for(const sx of[-1,1])for(const sz of[-1,1])
  radius=Math.max(radius,Math.hypot(a[i]+sx*w-center[0],a[i+1]-center[1],a[i+2]+sz*w*.5-center[2]));
 }
 const result={center,radius:radius+.0001};variants.set(far,result);return result;
}
function envelope(T,m){
 const prior=recordCache.get(m),far=m.farVertices||m.vertices;
 if(prior&&prior.near===m.vertices&&prior.far===far&&prior.instances===m.instances)return prior.sphere;
 const local=prototypeSphere(m.vertices,far),c=local.center,b=m.instances,sphere=new T.Sphere().makeEmpty(),one=new T.Sphere();
 for(let i=0;i<b.length;i+=16){
  one.center.set(b[i]*c[0]+b[i+4]*c[1]+b[i+8]*c[2]+b[i+12],b[i+1]*c[0]+b[i+5]*c[1]+b[i+9]*c[2]+b[i+13],b[i+2]*c[0]+b[i+6]*c[1]+b[i+10]*c[2]+b[i+14]);
  // Gershgorin bound of M^T M: conservative for uniform scale, nonuniform
  // scale and shear, including Float32 rotation roundoff.
  const q00=b[i]**2+b[i+1]**2+b[i+2]**2,q11=b[i+4]**2+b[i+5]**2+b[i+6]**2,q22=b[i+8]**2+b[i+9]**2+b[i+10]**2;
  const q01=Math.abs(b[i]*b[i+4]+b[i+1]*b[i+5]+b[i+2]*b[i+6]),q02=Math.abs(b[i]*b[i+8]+b[i+1]*b[i+9]+b[i+2]*b[i+10]),q12=Math.abs(b[i+4]*b[i+8]+b[i+5]*b[i+9]+b[i+6]*b[i+10]);
  const scale=Math.sqrt(Math.max(q00+q01+q02,q11+q01+q12,q22+q02+q12));
  one.radius=local.radius*scale+.0001;sphere.union(one);
 }
 sphere.radius+=.0001;recordCache.set(m,{near:m.vertices,far,instances:m.instances,sphere});return sphere;
}
G.MUENZUKA_EDGE_CULLING=Object.freeze({eligible,envelope,prototypeSphere,sway,
 meaning:'One conservative source envelope for both LODs and all forestLeaf shader phases; no additional source or GPU arrays.'});
G.DioramaRenderer=class extends Base{
 ensure(r,level){
  const mesh=super.ensure(r,level);if(!eligible(r.data))return mesh;
  const sphere=envelope(this.T,r.data);
  // The envelope is immutable for this source identity and survives LOD
  // changes. Caches hold no GPU object; source records remain weak keys.
  if(mesh.boundingSphere!==sphere)mesh.boundingSphere=sphere;
  return mesh;
 }
};
})(globalThis.GA);
