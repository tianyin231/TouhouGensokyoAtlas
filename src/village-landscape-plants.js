/* P: compact, tended village trees and planting. Private prototypes only;
 * source instance matrices, colours, public trees and house materials are untouched.
 * Opaque folded leaves use the existing mixed foliage/ordinary prop materials. */
(function(G){'use strict';
const TAU=Math.PI*2,add=G.add,sub=G.sub,mul=G.mul,norm=G.norm,cross=G.cross;
const white=[1,1,1],bark=G.rgb('#736452'),green=[G.rgb('#496548'),G.rgb('#809152')];
const cache=new Map(),joined=new WeakMap();
const bankTable=[[-2.2,5.55,-.72,1.42,.94,1.28],[2.25,5.95,.14,1.40,.97,1.32],[-.18,5.38,2.42,1.47,.94,1.28],[.64,5.83,-2.43,1.42,.95,1.19],[-1.20,6.65,1.03,1.41,.96,1.32],[1.23,6.98,-.59,1.40,.82,1.31],[.03,7.0,.33,1.45,.80,1.38],[-.45,6.57,-1.30,1.46,1.01,1.34]];
const limits={broadleaf:[[-3.7791,0,-3.7397],[4.1015,7.8,4.0741]],cherry:[[-3.9606,0,-3.6907],[4.2553,7.8037,4.5497]],willow:[[-3.3595,0,-3.9065],[3.9182,7.6229,3.7128]]};
function triangles(a){return a.length/27;}
function bounds(a){const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<a.length;i+=9)for(let k=0;k<3;k++){min[k]=Math.min(min[k],a[i+k]);max[k]=Math.max(max[k],a[i+k]);}return{min,max};}
function leaf(g,root,dir,length,width,roll,color,limit){
 dir=norm(dir);const side=norm(cross(dir,Math.abs(dir[1])>.85?[1,0,0]:[0,1,0])),up=cross(side,dir),s=add(mul(side,Math.cos(roll)),mul(up,Math.sin(roll))),u=cross(s,dir);
 const p=[root,add(root,add(mul(dir,length*.18),mul(s,width*.56))),add(root,add(add(mul(dir,length*.49),mul(s,width)),mul(u,length*.055))),add(root,mul(dir,length)),add(root,add(mul(dir,length*.54),mul(s,-width*.90)))];
 // Fit each leaf around its attached root; never shrink the whole bank or bough.
 if(limit){let factor=1;for(const q of p)for(let k=0;k<3;k++){const d=q[k]-root[k];if(d>0)factor=Math.min(factor,(limit[1][k]-root[k])/d);else if(d<0)factor=Math.min(factor,(limit[0][k]-root[k])/d);}factor=Math.min(1,Math.max(.12,factor));for(let i=1;i<p.length;i++)p[i]=add(root,mul(sub(p[i],root),factor));}
 g.tri(p[0],p[1],p[2],color);g.tri(p[0],p[2],p[3],color);g.tri(p[0],p[3],p[4],color);
}
function volume(g,center,radii,segments,color,phase=0){
 // Two unequal rings and closed end fans give far clusters actual side walls.
 const [x,y,z]=center,[rx,ry,rz]=radii,lower=[],upper=[];
 for(let i=0;i<segments;i++){const a=TAU*i/segments+phase,q=1+.08*Math.sin(i*2.1+phase),c=Math.cos(a),s=Math.sin(a);lower.push([x+c*rx*.83*q,y-ry*.43+.07*ry*Math.sin(a*2),z+s*rz*.83*q]);upper.push([x+c*rx*.80*q,y+ry*.42+.10*ry*Math.cos(a*3),z+s*rz*.80*q]);}
 const bottom=[x-.08*rx,y-ry,z+.07*rz],top=[x+.13*rx,y+ry,z-.08*rz];
 for(let i=0;i<segments;i++){const j=(i+1)%segments;g.tri(bottom,lower[j],lower[i],color);g.quad(lower[i],lower[j],upper[j],upper[i],color);g.tri(top,upper[i],upper[j],color);}
}
function crown(g,center,radii,segments,rings,color,phase,limit){
 // The opaque main mass has closed, overlapping side walls. Individual banks
 // retain their supported centres; outline leaves do not define crown density.
 const r=radii.slice();if(limit)for(const k of[0,2])r[k]=Math.min(r[k],(center[k]-limit[0][k])/1.07,(limit[1][k]-center[k])/1.07);
 if(limit)r[1]=Math.min(r[1],center[1]-limit[0][1],limit[1][1]-center[1]);
 const profile=rings===4?[[-.76,.55],[-.28,.95],[.28,1],[.75,.60]]:[[-.62,.73],[.03,1],[.66,.70]],rows=[];
 for(let j=0;j<profile.length;j++){const [h,w]=profile[j],row=[];for(let i=0;i<segments;i++){const a=TAU*i/segments+phase,q=1+.045*Math.sin(i*2.17+phase)+.016*Math.cos(i*3.1+j),y=center[1]+r[1]*(h+.035*Math.sin(a*2+j));row.push([center[0]+Math.cos(a)*r[0]*w*q,y,center[2]+Math.sin(a)*r[2]*w*q]);}rows.push(row);}
 const bottom=add(center,[-.075*r[0],-r[1],.05*r[2]]),top=add(center,[.10*r[0],r[1],-.065*r[2]]);
 for(let i=0;i<segments;i++){const n=(i+1)%segments;g.tri(bottom,rows[0][i],rows[0][n],color);for(let j=0;j<rows.length-1;j++)g.quad(rows[j][i],rows[j+1][i],rows[j+1][n],rows[j][n],color);g.tri(top,rows.at(-1)[n],rows.at(-1)[i],color);}
}
function coarseBough(g,stem,c){
 const axis=norm(sub(c,stem)),side=mul(norm(cross(axis,[0,1,0])),.07),a=add(stem,side),b=sub(stem,side),d=add(stem,[0,.075,0]);g.tri(a,b,c,bark);g.tri(b,d,c,bark);g.tri(d,a,c,bark);g.tri(a,d,b,bark);
}
function treeBody(kind,lod){
 const key='tree:'+kind+':'+lod;if(cache.has(key))return cache.get(key);
 if(!limits[kind]||!['near','far','proxy'].includes(lod))throw Error('Unknown village tree prototype '+key);
 const g=new G.Geometry(),R=G.rng(kind==='cherry'?80391:kind==='willow'?80677:80517),near=lod==='near',proxy=lod==='proxy',banks=[],limit=limits[kind];
 if(kind==='willow'){
  for(let i=0;i<8;i++){const a=i*2.399+.24,r=1.78+(i%3)*.25,b=[Math.cos(a)*r,6.48+(i%3)*.17,Math.sin(a)*r,1.25,.71,1.17];banks.push(b);}
 }else for(let i=0;i<bankTable.length;i++){const p=bankTable[i].slice();if(kind==='cherry'){p[0]*=1.07;p[2]*=1.06;p[1]-=i<4?.05:.1;}banks.push(p);}
 for(let i=0;i<banks.length;i++){
  const b=banks[i],c=b.slice(0,3),stem=[0,2.80+(i%3)*.38,0];
  if(near)g.tube(stem,c,.10,bark,5,.032);else coarseBough(g,stem,c);
  const massColor=G.blend(white,[.70,.80,.67],.065+(i%4)*.035);
  if(proxy){volume(g,c,b.slice(3),4,massColor,i*.43);continue;}
  crown(g,c,b.slice(3),near?10:6,near?4:3,massColor,i*.43,limit);
  if(!near)continue;
  for(let s=0;s<8;s++){
   const a=s*2.399+i*.49,rad=.56+(s%3)*.20,tip=[c[0]+Math.cos(a)*rad,c[1]+((s%4)-1.4)*.33,c[2]+Math.sin(a)*rad],start=c;
   g.tube(start,tip,.024,bark,3,.012);
   const d=norm(sub(tip,start));
   for(let pair=0;pair<3;pair++)for(const side of[-1,1]){
    const root=add(start,mul(sub(tip,start),.24+pair*.24)),f=.56+R()*.22,leafDir=norm([d[0]*.25+Math.cos(a+side*1.05),.12+((s+pair+i)%5-.8)*.17,d[2]*.25+Math.sin(a+side*1.05)]);
    leaf(g,root,leafDir,f,(kind==='cherry'?.26:.27)+R()*.075,.28+side*.42+(s%3)*.37,G.blend(white,[.66,.79,.65],.035+(s%4)*.045),limit);
   }
   leaf(g,tip,[Math.cos(a),.10+(s%3)*.26,Math.sin(a)],.72+R()*.13,.25+R()*.055,(s%4)*.54,white,limit);
  }
 }
 if(kind==='willow'){
  for(let i=0;i<12;i++){
   const a=i*2.399+.29,rr=2.45+(i%4)*.19,root=[Math.cos(a)*rr,6.45+(i%3)*.16,Math.sin(a)*rr],tip=[root[0]+Math.cos(a)*.22,2.55+(i%4)*.34,root[2]+Math.sin(a)*.25];
   if(near){g.tube([-.08,4.96,.176],root,.045,bark,3,.016);g.tube(root,tip,.014,bark,3,.008);for(let j=0;j<10;j++)for(const side of[-1,1]){const p=add(root,mul(sub(tip,root),(j+.4)/10));leaf(g,p,[Math.cos(a+side*.8)*.52,-.80,Math.sin(a+side*.8)*.52],.41+(j%3)*.08,.095,.35*side,G.blend(white,[.78,.85,.56],.18+j*.025),limit);}}
   if(!proxy&&i%2===0)crown(g,[root[0],4.55,root[2]],[.36,1.55,.32],near?8:4,near?4:3,G.blend(white,[.78,.85,.56],.22),a,limit);
   else if(proxy&&i%2===0)volume(g,[root[0],4.55,root[2]],[.36,1.55,.32],3,G.blend(white,[.78,.85,.56],.27),a);
  }
 }
 if(proxy){g.tube([0,0,0],[.1,4.9,0],.26,bark,3,.075);}
 const array=g.mesh(key).vertices,result={array,banks:banks.map(b=>b.slice()),triangles:triangles(array),bounds:bounds(array)};cache.set(key,result);return result;
}
function tree(kind,lod,original){
 if(lod==='proxy')return treeBody(kind,lod).array;
 if(!original||Object.prototype.toString.call(original)!=='[object Float32Array]')throw Error('Village tree requires its actual original array');
 const key=kind+':'+lod;let item=joined.get(original);if(!item){item=new Map();joined.set(original,item);}if(item.has(key))return item.get(key);
 const prefix=(kind==='willow'?60:42)*27,body=treeBody(kind,lod).array;if(original.length<prefix)throw Error('Village original trunk prefix missing');
 const a=new Float32Array(prefix+body.length);a.set(original.subarray(0,prefix));a.set(body,prefix);const budget=kind==='willow'?(lod==='near'?4230:555):(lod==='near'?2829:392);if(triangles(a)>budget)throw Error('Village tree budget exceeded '+key);item.set(key,a);return a;
}
function shrub(lod='near',variant=0){
 const key='shrub:'+variant+':'+lod;if(cache.has(key))return cache.get(key).array;
 const g=new G.Geometry();if(lod==='near'){
  const cap=[[-.7012,.015,-.9002],[.9604,.9200,.5216]],banks=[[-.35,.50,-.18,.40,.33,.33],[.37,.64,-.24,.49,.28,.38],[.04,.67,.10,.46,.25,.36],[.14,.49,-.53,.47,.34,.33],[.57,.50,-.03,.34,.33,.36]];
  for(let i=0;i<banks.length;i++){
   const b=banks[i],c=b.slice(0,3),a=i*2.399+variant*.65,base=[0,.015,0],fork=add(c,[0,-.10,0]);g.tube(base,fork,.035,bark,3,.016);
   crown(g,c,b.slice(3),8,3,G.blend(green[0],green[1],.20+(i%4)*.11),a*.27,cap);
   const tip=add(fork,[Math.cos(a)*.17,.16,Math.sin(a)*.17]);g.tube(fork,tip,.016,bark,3,.009);
   for(let j=0;j<2;j++)for(const side of[-1,1]){const root=add(fork,mul(sub(tip,fork),.26+j*.45));leaf(g,root,[Math.cos(a+side*.88),.30+j*.38,Math.sin(a+side*.88)],.30+j*.05,.13,.47*side+variant*.21,G.blend(green[0],green[1],.18+(i%4)*.13),cap);}
  }
 }else if(lod==='far'){
  g.tube([0,.015,0],[.03,.50,0],.035,bark,4,.017);
  const cap=[[-.7012,.015,-.9002],[.9604,.9200,.5216]];
  crown(g,[-.20,.49,-.22],[.60,.43,.63],5,3,G.blend(green[0],green[1],.30),variant*.6,cap);
  crown(g,[.39,.58,-.14],[.54,.34,.60],5,3,G.blend(green[0],green[1],.45),.34+variant*.6,cap);
 }else throw Error('Unknown village shrub LOD');
 const array=g.mesh(key).vertices;cache.set(key,{array,triangles:triangles(array),bounds:bounds(array)});return array;
}
function herb(lod='near'){
 const key='herb:'+lod;if(cache.has(key))return cache.get(key).array;const g=new G.Geometry(),n=lod==='near'?8:5;
 for(let i=0;i<n;i++){const a=i*2.399,r=(i%3)*.16,root=[Math.cos(a)*r,-.045,Math.sin(a)*r],tip=[root[0]+Math.cos(a)*.20,.22+(i%3)*.12,root[2]+Math.sin(a)*.20];g.tube(root,tip,.016,green[0],3,.008);
  for(const side of[-1,1])leaf(g,add(root,mul(sub(tip,root),.53)),[Math.cos(a+side*.73),.35+(i%2)*.36,Math.sin(a+side*.73)],.38+(i%3)*.075,.16,.44*side,G.blend(green[0],green[1],.32+(i%3)*.12));
  leaf(g,tip,[Math.cos(a),.36,Math.sin(a)],.35,.14,.25,green[1]);
 }
 const array=g.mesh(key).vertices;cache.set(key,{array,triangles:triangles(array),bounds:bounds(array)});return array;
}
G.VILLAGE_LANDSCAPE_PLANTS={tree,shrub,herb,prototype:treeBody,bounds,revision:2,basis:'P: supported, overlapping opaque crown clusters and tended low planting; no new botanical/canon claims'};
})(globalThis.GA);
