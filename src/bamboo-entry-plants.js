/* P: bamboo-entry crown study. Existing culms remain, with curved secondary
 * sprays and a terminal shoot. Geometry is opaque, shared, and uses the
 * existing bamboo materials; no leaf cards, images or renderer changes.
 */
(function(G){'use strict';
const revision=1,TAU=Math.PI*2,cache=new WeakMap();
const levels=[6/12,8/12,9/12,10/12,11/12],lengths=[2.70,2.88,2.46,2.13,1.55];
const add=G.add,sub=G.sub,mul=G.mul;
function curve(a,b,c,t){return add(add(mul(a,(1-t)*(1-t)),mul(b,2*t*(1-t))),mul(c,t*t));}
function twig(g,points,r,segments,sides){
 for(let j=0;j<segments;j++){const a=curve(...points,j/segments),b=curve(...points,(j+1)/segments);g.tube(a,b,r*(1-.75*j/segments),[.50,.65,.37],sides,r*(1-.75*(j+1)/segments));}
}
function blade(g,p,angle,L,W,rise,drop,col,far){
 const dir=[Math.cos(angle),0,Math.sin(angle)],side=[-dir[2],0,dir[0]],mid=add(p,add(mul(dir,L*.44),[0,rise,0])),tip=add(p,add(mul(dir,L),[0,-drop,0]));
 const left=add(mid,mul(side,W)),right=sub(mid,mul(side,W));
 if(far){g.tri(p,left,tip,col);g.tri(p,tip,right,col);return;}
 const ridge=add(mid,[0,W*.34,0]);
 g.tri(p,left,ridge,col);g.tri(p,ridge,right,col);g.tri(left,tip,ridge,col);g.tri(ridge,tip,right,col);
}
function concat(prefix,extra){const out=new Float32Array(prefix.length+extra.length);out.set(prefix);out.set(extra,prefix.length);return out;}
function prototype(variant,sourceNearStem,sourceFarStem){
 if(!Number.isInteger(variant)||variant<0||variant>2||sourceNearStem.length!==1329*27||sourceFarStem.length!==15*27)
  throw Error('Bamboo entry prototype source requires review');
 const cached=cache.get(sourceNearStem);if(cached){if(cached.variant!==variant||cached.sourceFar!==sourceFarStem)throw Error('Bamboo entry shared source mismatch');return cached.result;}
 const rng=G.rng(6281+variant*111),H=13.6+variant*2.1,bx=(rng()-.5)*3.6,bz=(rng()-.5)*2.8,
       at=y=>[bx*(y/H)**1.6,y,bz*(y/H)**1.6],R=G.rng(3491+variant*127);
 const nearStem=new G.Geometry(),farStem=new G.Geometry(),nearLeaf=new G.Geometry(),farLeaf=new G.Geometry(),branches=[],leaves=[];
 function spray(base,angle,scale,branch,ordinal,terminal=false){
  const angles=terminal?[-1.1,-.55,0,.55,1.1]:[-.67,-.33,0,.34,.70];
  for(let k=0;k<5;k++){
   const a=angle+angles[k],length=scale*(.79+R()*.23)*(k===2?1.08:1),width=(.108+R()*.025)*scale,
         root=base.slice(),
         rise=terminal?.11:scale*(.12+R()*.10),drop=terminal?.25:scale*(.22+R()*.17),
         shade=R(),col=[.60+.13*shade,.76+.12*shade,.49+.12*shade];
   blade(nearLeaf,root,a,length,width,rise,drop,col,false);
   // Retain the same outer leaves and direction at distance. Some interior
   // leaves merge away inside the spray, not into spherical crown impostors.
   const far=terminal?[0,2,4].includes(k):[0,4].includes(k)||(k===2&&ordinal!==0);
   if(far)blade(farLeaf,root,a,length,width*1.19,rise,drop,col,true);
   leaves.push({branch,ordinal,terminal,index:k,root,angle:a,length,width,rise,drop,far});
  }
 }
 for(let j=0;j<5;j++){
  const angle=j*2.399963+variant*.91,origin=at(H*levels[j]),L=lengths[j]*(.95+R()*.08),d=[Math.cos(angle),0,Math.sin(angle)],
        control=add(origin,add(mul(d,L*.47),[0,.65-j*.045,0])),end=add(origin,add(mul(d,L),[0,-.24-j*.025,0])),points=[origin,control,end];
  twig(nearStem,points,.028,3,4);const record={index:j,origin,control,end,sprays:[]};
  for(let k=0;k<3;k++){
   const t=[.36,.66,.94][k],root=curve(...points,t),angle2=angle+[.82,-.67,.12][k],S=[.40,.48,.29][k],d2=[Math.cos(angle2),0,Math.sin(angle2)],
         tip=add(root,add(mul(d2,S),[0,.13-k*.07,0])),bend=add(root,add(mul(d2,S*.52),[0,.26,0]));
   twig(nearStem,[root,bend,tip],.0105,2,3);spray(tip,angle2,.93-j*.047,j,k);
   record.sprays.push({root,control:bend,tip,angle:angle2});
  }
  branches.push(record);
 }
 // A tapered, foliated tip replaces the visual blunt cut at the culm top.
 // The old segmented main culm is retained byte-for-byte below this shoot.
 const tipBase=at(H),tip=add(at(H*1.024),[.07,0,-.04]);
 nearStem.tube(tipBase,tip,.027,[.63,.81,.46],6,.0025);
 farStem.tube(tipBase,tip,.026,[.63,.81,.46],3,.003);
 const terminal=add(at(H*1.009),[.035,0,-.022]);spray(terminal,variant*1.2+.5,.76,'tip',0,true);
 const result={variant,height:H,tip,branches,leaves,
  near:{stem:concat(sourceNearStem.subarray(0,504*27),new Float32Array(nearStem.a)),leaf:new Float32Array(nearLeaf.a)},
  far:{stem:concat(sourceFarStem,new Float32Array(farStem.a)),leaf:new Float32Array(farLeaf.a)},
  sourcePrefix:{nearStemTriangles:504,farStemTriangles:15}};
 for(const lod of ['near','far']){const n=(result[lod].stem.length+result[lod].leaf.length)/27;if(n>(lod==='near'?1945:111))throw Error('Bamboo entry '+lod+' source triangle budget: '+n);}
 cache.set(sourceNearStem,{variant,sourceFar:sourceFarStem,result});return result;
}
G.BAMBOO_ENTRY_PLANTS=Object.freeze({revision,prototype,levels,lengths});
})(globalThis.GA);
