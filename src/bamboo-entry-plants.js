/* P: bamboo-entry crown study. Retained native culms carry arching branches
 * and staggered lanceolate leaves. Far sprays retain the same extremities,
 * attach to actual branch nodes, and share the existing opaque materials.
 */
(function(G){'use strict';
const revision=2,cache=new WeakMap(),levels=[6/12,8/12,9/12,10/12,11/12],lengths=[2.70,2.88,2.46,2.13,1.55];
const add=G.add,sub=G.sub,mul=G.mul,lerp=(a,b,t)=>add(mul(a,1-t),mul(b,t));
function curve(a,b,c,t){return add(add(mul(a,(1-t)*(1-t)),mul(b,2*t*(1-t))),mul(c,t*t));}
// Only the end of the whole branch is capped. Internal tube caps add no
// silhouette or support; removing them funds the retained full leaf sprays.
function twig(g,points,r,segments,sides){
 const vertices=[];
 for(let j=0;j<=segments;j++){
  const t=j/segments,p=curve(...points,t),before=curve(...points,Math.max(0,t-.01)),after=curve(...points,Math.min(1,t+.01)),
        d=G.norm(sub(after,before)),right=G.norm(G.cross(d,Math.abs(d[1])>.9?[1,0,0]:[0,1,0])),up=G.cross(d,right),radius=r*(1-.75*t);
  vertices.push(Array.from({length:sides},(_,k)=>add(p,add(mul(right,Math.cos(k/sides*Math.PI*2)*radius),mul(up,Math.sin(k/sides*Math.PI*2)*radius)))));
 }
 const col=[.50,.65,.37];
 for(let j=0;j<segments;j++)for(let k=0;k<sides;k++){const n=(k+1)%sides;g.quad(vertices[j][n],vertices[j][k],vertices[j+1][k],vertices[j+1][n],col);}
 for(let k=0;k<sides;k++)g.tri(points[2],vertices[segments][(k+1)%sides],vertices[segments][k],col);
}
function ribbon(g,a,b,width){
 const d=G.norm(sub(b,a)),r=G.norm(G.cross(d,Math.abs(d[1])>.9?[1,0,0]:[0,1,0])),u=G.cross(d,r),col=[.50,.65,.37];
 for(const axis of[r,u]){const w=mul(axis,width);g.quad(sub(a,w),add(a,w),add(b,w),sub(b,w),col);}
}
function blade(g,p,angle,L,W,rise,drop,roll,col,far=false){
 const dir=[Math.cos(angle),0,Math.sin(angle)],side=[-dir[2]*Math.cos(roll),Math.sin(roll),dir[0]*Math.cos(roll)],
       mid=add(p,add(mul(dir,L*.44),[0,rise,0])),tip=add(p,add(mul(dir,L),[0,-drop,0])),left=add(mid,mul(side,W)),right=sub(mid,mul(side,W));
 if(far){g.tri(p,left,tip,col);g.tri(p,tip,right,col);return {root:p,left,right,tip};}
 const ridge=add(mid,[0,W*.22,0]);
 g.tri(p,left,ridge,col);g.tri(p,ridge,right,col);g.tri(left,tip,ridge,col);g.tri(ridge,tip,right,col);
 return {root:p,left,right,tip,ridge};
}
function concat(prefix,extra){const out=new Float32Array(prefix.length+extra.length);out.set(prefix);out.set(extra,prefix.length);return out;}
function prototype(variant,sourceNearStem,sourceFarStem){
 if(!Number.isInteger(variant)||variant<0||variant>2||sourceNearStem.length!==1329*27||sourceFarStem.length!==15*27)throw Error('Bamboo entry prototype source requires review');
 const cached=cache.get(sourceNearStem);if(cached){if(cached.variant!==variant||cached.sourceFar!==sourceFarStem)throw Error('Bamboo entry shared source mismatch');return cached.result;}
 const rng=G.rng(6281+variant*111),H=13.6+variant*2.1,r=.125+variant*.014,bx=(rng()-.5)*3.6,bz=(rng()-.5)*2.8,
       at=y=>[bx*(y/H)**1.6,y,bz*(y/H)**1.6],R=G.rng(3491+variant*127),
       nearStem=new G.Geometry(),farStem=new G.Geometry(),nearLeaf=new G.Geometry(),farLeaf=new G.Geometry(),branches=[],leaves=[],farLeaves=[];
 function spray(points,angle,scale,branch,ordinal){
  const middle=curve(...points,.5),sample=t=>t<=.5?lerp(points[0],middle,t*2):lerp(middle,points[2],t*2-1),outline=[];
  for(let k=0;k<15;k++){
   const t=.12+k/14*.87,side=k===14?0:k%2?1:-1,a=angle+side*(.70-.25*t)+.055*Math.sin(k*2.1+variant),
         root=sample(t),length=scale*(1.0+R()*.17)*(.80+.23*Math.sin(t*Math.PI*.83)),width=scale*(.116+R()*.023),
         pitch=.11*Math.sin(k*1.77+ordinal*.8)-.04,rise=pitch*length*.44+.033,drop=.13+R()*.095-pitch*length,
         roll=.27*Math.sin(k*2.37+ordinal),shade=R(),col=[.60+.13*shade,.76+.12*shade,.49+.12*shade],
         form=blade(nearLeaf,root,a,length,width,rise,drop,roll,col);
   outline.push(...[form.left,form.right,form.tip,form.ridge]);
   leaves.push({branch,ordinal,index:k,root,angle:a,length,width,rise,drop,roll,...form});
  }
  // One pointed, connected spray envelope at distance. Extremities come from
  // the real near leaves, and its narrow base attaches to the primary bough.
  const root=points[0],d=[Math.cos(angle),0,Math.sin(angle)],side=[-d[2],0,d[0]],
        score=(p,axis)=>G.dot(sub(p,root),axis),pick=axis=>outline.reduce((a,b)=>score(a,axis)>score(b,axis)?a:b),
        tip=pick(d),left=pick(side),right=pick(mul(side,-1)),col=[.67,.82,.555];
  farLeaf.tri(root,left,tip,col);farLeaf.tri(root,tip,right,col);
  farLeaves.push({branch,ordinal,kind:'merged-spray',root,left,right,tip,nearLeafIndices:[leaves.length-15,leaves.length]});
 }
 for(let j=0;j<5;j++){
  const angle=j*2.399963+variant*.91,origin=at(H*levels[j]),L=lengths[j]*(.95+R()*.08),d=[Math.cos(angle),0,Math.sin(angle)],
        control=add(origin,add(mul(d,L*.47),[0,.65-j*.045,0])),end=add(origin,add(mul(d,L),[0,-.24-j*.025,0])),points=[origin,control,end];
  twig(nearStem,points,.028,3,4);const farOrigin=mul(at(H),levels[j]),record={index:j,origin,farOrigin,control,end,sprays:[]};let last=farOrigin;
  for(let k=0;k<3;k++){
   const t=[.36,.66,.94][k],root=curve(...points,t),angle2=angle+[.82,-.67,.12][k],S=[.51,.65,.42][k],d2=[Math.cos(angle2),0,Math.sin(angle2)],
         tip=add(root,add(mul(d2,S),[0,.13-k*.07,0])),bend=add(root,add(mul(d2,S*.52),[0,.24,0]));
   twig(nearStem,[root,bend,tip],.0105,2,3);spray([root,bend,tip],angle2,1.03-j*.037,j,k);
   ribbon(farStem,last,root,.017-j*.0015);last=root;
   record.sprays.push({root,control:bend,tip,angle:angle2});
  }
  branches.push(record);
 }
 const tipBase=at(H),tip=add(at(H*1.024),[.07,0,-.04]);nearStem.tube(tipBase,tip,.027,[.63,.81,.46],6,.0025);
 for(let k=0;k<9;k++){
  const a=variant*1.1+k*2.399963,t=k/8,y=H*(.968+.048*t),center=y<=H?at(y):lerp(tipBase,tip,(y-H)/(H*.024)),
        radius=y<=H?r*.615:.027*(1-.90*(y-H)/(H*.024)),root=add(center,[Math.cos(a)*radius,0,Math.sin(a)*radius]),
        length=.69+.18*Math.sin(t*Math.PI),width=.101,rise=.026,drop=.15+t*.025,roll=.15*Math.sin(k),col=[.69,.83,.55],
        form=blade(nearLeaf,root,a,length,width,rise,drop,roll,col);
  leaves.push({branch:'tip',ordinal:0,index:k,root,angle:a,length,width,rise,drop,roll,...form});
 }
 for(let k=0;k<3;k++){
  const a=variant*1.1+k*2.399963,root=tipBase.slice(),form=blade(farLeaf,root,a,.88,.115,.09,.11,.08,[.69,.83,.55],true);
  farLeaves.push({branch:'tip',ordinal:0,index:k,kind:'terminal-leaf',...form});
 }
 const result={variant,height:H,tip,branches,leaves,farLeaves,leafRecords:{near:leaves,far:farLeaves},
  near:{stem:concat(sourceNearStem.subarray(0,504*27),new Float32Array(nearStem.a)),leaf:new Float32Array(nearLeaf.a)},
  far:{stem:concat(sourceFarStem,new Float32Array(farStem.a)),leaf:new Float32Array(farLeaf.a)},sourcePrefix:{nearStemTriangles:504,farStemTriangles:15}};
 for(const lod of['near','far']){const n=(result[lod].stem.length+result[lod].leaf.length)/27;if(n>(lod==='near'?1830:111))throw Error('Bamboo entry '+lod+' source triangle budget: '+n);}
 const bytes=[result.near.stem,result.near.leaf,result.far.stem,result.far.leaf].reduce((n,a)=>n+a.byteLength,0);if(bytes*3>.6*1048576)throw Error('Bamboo entry shared source byte budget');
 cache.set(sourceNearStem,{variant,sourceFar:sourceFarStem,result});return result;
}
G.BAMBOO_ENTRY_PLANTS=Object.freeze({revision,prototype,levels,lengths});
})(globalThis.GA);
