/* Creek bridge–Mystia woodland sample. Existing images are shared; geometry,
 * global lighting, terrain heights and the upstream material owners stay intact.
 */
(function(G){'use strict';
const Base=G.DioramaRenderer,ROI=Object.freeze([810,125,1145,330]),PAD=20,ORIGIN=Object.freeze([975,225]),MAX_SEGMENTS=36;
const cards=Object.freeze({trailLeaf:'hakureiLeaf',trailNeedle:'hakureiNeedle',trailCherry:'hakureiCherry'});
const palette=['#8c8a64','#aaa187','#999077'].map(hex=>Object.freeze(G.rgb(hex)));
const glsl=v=>Number.isInteger(v)?v+'.0':String(v);
function distance(p,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],u=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(dx*dx+dz*dz||1)));return Math.hypot(p[0]-a[0]-u*dx,p[1]-a[1]-u*dz);}
function clip(a,b,box){let lo=0,hi=1;for(let k=0;k<2;k++){const d=b[k]-a[k];if(Math.abs(d)<1e-12){if(a[k]<box[k]||a[k]>box[k+2])return null;}else{let u=(box[k]-a[k])/d,v=(box[k+2]-a[k])/d;if(u>v)[u,v]=[v,u];lo=Math.max(lo,u);hi=Math.min(hi,v);if(lo>hi)return null;}}return[[a[0]+(b[0]-a[0])*lo,a[1]+(b[1]-a[1])*lo],[a[0]+(b[0]-a[0])*hi,a[1]+(b[1]-a[1])*hi]];}
function simplify(ps,tolerance){let index=-1,worst=tolerance;for(let i=1;i<ps.length-1;i++){const d=distance(ps[i],ps[0],ps.at(-1));if(d>worst){worst=d;index=i;}}return index<0?[ps[0],ps.at(-1)]:[...simplify(ps.slice(0,index+1),tolerance).slice(0,-1),...simplify(ps.slice(index),tolerance)];}
function flatten(paths,tolerance){const values=[];for(const path of paths){const ps=simplify(path,tolerance);for(let i=1;i<ps.length;i++){const a=ps[i-1],b=ps[i];if(Math.hypot(b[0]-a[0],b[1]-a[1])>1e-7)values.push(a[0]-ORIGIN[0],a[1]-ORIGIN[1],b[0]-ORIGIN[0],b[1]-ORIGIN[1]);}}return Float32Array.from(values);}
function segments(samples=G.routes?.find(r=>r.id==='route-shrine')?.samples,streamX=G.streamX){
 if(!samples?.length||typeof streamX!=='function')throw Error('Trail landscape requires the retained shrine route and creek');
 const box=[ROI[0]-PAD-8,ROI[1]-PAD-8,ROI[2]+PAD+8,ROI[3]+PAD+8],paths=[];let path=null;
 for(let i=1;i<samples.length;i++){const a=samples[i-1],b=samples[i];if(![...a,...b].every(Number.isFinite))throw Error('Invalid trail route sample');const pair=clip(a,b,box);if(!pair){path=null;continue;}if(!path||Math.hypot(path.at(-1)[0]-pair[0][0],path.at(-1)[1]-pair[0][1])>1e-6){path=[pair[0]];paths.push(path);}path.push(pair[1]);}
 const creek=[];for(let z=127;z<261;z+=4)creek.push([streamX(z),z]);creek.push([streamX(261),261]);
 if(!creek.every(p=>p.every(Number.isFinite)))throw Error('Invalid retained trail creek');
 const route=flatten(paths,.18),stream=flatten([creek],.15),count=(route.length+stream.length)/4;
 if(!route.length||!stream.length||count>MAX_SEGMENTS)throw Error('Trail landscape segment budget needs review: '+count+'/'+MAX_SEGMENTS);
 return{route,stream,routeCount:route.length/4,streamCount:stream.length/4,bytes:route.byteLength+stream.byteLength};
}
function weight(x,z){const dx=Math.max(ROI[0]-x,0,x-ROI[2]),dz=Math.max(ROI[1]-z,0,z-ROI[3]),t=Math.max(0,Math.min(1,Math.hypot(dx,dz)/PAD));return 1-t*t*(3-2*t);}
function groundKind(m){if(m.material!=='ground'||m.space&&m.space!=='surface'||!m.center||!Number.isFinite(m.radius))return -1;
 const dx=Math.max(ROI[0]-PAD-m.center[0],0,m.center[0]-ROI[2]-PAD),dz=Math.max(ROI[1]-PAD-m.center[2],0,m.center[2]-ROI[3]-PAD);if(Math.hypot(dx,dz)>m.radius)return -1;
 if(m.globalSurface&&m.component==='island-terrain'||m.group==='roads'&&m.component==='connection-road'&&m.pathOwner==='trail')return 0;
 return /^(trail:|mystia-house:|overview:trail:)/.test(m.id)?1:-1;
}
function replace(source,anchor,value){if(!source.includes(anchor))throw Error('Trail ground inheritance changed: '+anchor);return source.replace(anchor,value);}
const noise=`
float trailSoilHash(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+31.71);return fract((q.x+q.y)*q.z);}
float trailSoilNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(trailSoilHash(i),trailSoilHash(i+vec2(1.,0.)),f.x),mix(trailSoilHash(i+vec2(0.,1.)),trailSoilHash(i+1.),f.x),f.y);}
float trailLineDistance2(vec2 p,vec4 line){vec2 d=line.zw-line.xy,q=p-line.xy;float u=clamp(dot(q,d)/max(dot(d,d),1e-6),0.,1.);q-=u*d;return dot(q,q);}
`;
class TrailLandscapeRenderer extends Base{
 constructor(T,canvas,world){const lines=segments();super(T,canvas,world);this.trailLandscapeLines??=lines;this.trailGroundVariants??=new Map();this.trailCardArrays??=new WeakSet();
  const bark=this.mats.hakureiBark;if(!bark||!this.hakureiCardMaterials||!this.hakureiCardDepth)throw Error('Trail woodland requires Hakurei materials first');
  const wood=bark.clone();wood.name='trailBark';wood.envMap=null;wood.onBeforeCompile=bark.onBeforeCompile;wood.customProgramCacheKey=bark.customProgramCacheKey;this.mats.trailBark=wood;
  for(const [name,sourceName]of Object.entries(cards)){const source=this.hakureiCardMaterials[sourceName],originalDepth=this.hakureiCardDepth[sourceName];if(!source||!originalDepth)throw Error('Missing shared trail leaf source: '+sourceName);
   const mat=source.clone(),depth=originalDepth.clone();mat.name=name;mat.envMap=null;mat.alphaToCoverage=false;mat.onBeforeCompile=source.onBeforeCompile;mat.customProgramCacheKey=source.customProgramCacheKey;
   depth.name=name+'Depth';depth.alphaMap=mat.alphaMap;depth.map=mat.map;depth.alphaTest=mat.alphaTest;depth.alphaToCoverage=false;depth.side=mat.side;
   this.mats[name]=mat;this.hakureiCardMaterials[name]=mat;this.hakureiCardDepth[name]=depth;
  }
 }
 addRecords(meshes,pack){for(const m of meshes)if(cards[m.material]){if(!m.leafCards||m.index||!m.vertices||[m.vertices,m.farVertices].filter(Boolean).some(a=>!ArrayBuffer.isView(a)||a.constructor.name!=='Float32Array'||!a.length||a.length%54))throw Error('Trail leaf source must contain unindexed six-vertex quads: '+m.id);}
  const result=super.addRecords(meshes,pack);this.trailCardArrays??=new WeakSet();for(const m of meshes)if(cards[m.material]){this.trailCardArrays.add(m.vertices);if(m.farVertices)this.trailCardArrays.add(m.farVertices);}return result;
 }
 acquire(a){const geometry=super.acquire(a);if(!this.trailCardArrays?.has(a)||geometry.getAttribute('uv'))return geometry;
  try{const n=geometry.getAttribute('position').count,uv=new Float32Array(n*2),quad=[0,0,1,0,1,1,0,0,1,1,0,1];for(let i=0;i<n;i++){uv[i*2]=quad[i%6*2];uv[i*2+1]=quad[i%6*2+1];}geometry.setAttribute('uv',new this.T.BufferAttribute(uv,2));const allocation=this.geometryRefs.get(a);if(!allocation)throw Error('Missing trail leaf allocation');allocation.bytes+=uv.byteLength;this.residentBytes+=uv.byteLength;return geometry;
  }catch(e){super.release(a);throw e;}
 }
 trailGround(source,native){this.trailGroundVariants??=new Map();this.trailLandscapeLines??=segments();const key=source.uuid+':'+native;if(this.trailGroundVariants.has(key))return this.trailGroundVariants.get(key);if(this.trailGroundVariants.size>=6)throw Error('Trail ground material budget needs review');
  const mat=source.clone(),prior=source.onBeforeCompile,oldKey=source.customProgramCacheKey.bind(source),lines=this.trailLandscapeLines;mat.name='trail-ground-'+this.trailGroundVariants.size;mat.envMap=null;
  mat.onBeforeCompile=(s,r)=>{prior.call(source,s,r);s.uniforms.uTrailRoute={value:lines.route};s.uniforms.uTrailCreek={value:lines.stream};s.uniforms.uTrailNativeGround={value:native};s.fragmentShader=`uniform vec4 uTrailRoute[${lines.routeCount}];uniform vec4 uTrailCreek[${lines.streamCount}];uniform float uTrailNativeGround;\n`+noise+s.fragmentShader;
   // This stage follows all inherited color modifiers. Common road/terrain
   // albedo removes color seams without moving their retained surfaces.
   s.fragmentShader=replace(s.fragmentShader,'#include <alphamap_fragment>',`
    vec2 trailSoilP=vAtlasPosition.xz-vec2(975.,225.);
    vec2 trailOutside=max(max(vec2(-165.,-100.)-trailSoilP,trailSoilP-vec2(170.,105.)),vec2(0.));
    vec3 trailFaceCross=cross(dFdx(vAtlasPosition),dFdy(vAtlasPosition));
    float trailFaceUp=abs(trailFaceCross.y)/max(length(trailFaceCross),1e-6);
    float trailArea=(1.-smoothstep(0.,20.,length(trailOutside)))*smoothstep(.55,.82,trailFaceUp);
    float trailDetail=(1.-smoothstep(.10,.48,length(fwidth(trailSoilP))))*(1.-smoothstep(85.,175.,length(vViewPosition)));
    #if defined(USE_COLOR) || defined(USE_COLOR_ALPHA)
     if(uTrailNativeGround>.5){vec3 trailVertexColor=vColor.rgb;
      float trailPaletteError=min(min(dot(trailVertexColor-vec3(${palette[0].map(glsl).join(',')}),trailVertexColor-vec3(${palette[0].map(glsl).join(',')})),dot(trailVertexColor-vec3(${palette[1].map(glsl).join(',')}),trailVertexColor-vec3(${palette[1].map(glsl).join(',')}))),dot(trailVertexColor-vec3(${palette[2].map(glsl).join(',')}),trailVertexColor-vec3(${palette[2].map(glsl).join(',')})));
      trailArea*=1.-smoothstep(1e-8,1e-6,trailPaletteError);
     }
    #endif
    if(trailArea>0.){
     float trailRoad2=1e8,trailCreek2=1e8;
     for(int i=0;i<${lines.routeCount};i++)trailRoad2=min(trailRoad2,trailLineDistance2(trailSoilP,uTrailRoute[i]));
     for(int i=0;i<${lines.streamCount};i++)trailCreek2=min(trailCreek2,trailLineDistance2(trailSoilP,uTrailCreek[i]));
     float trailRoadDistance=sqrt(trailRoad2),trailCreekDistance=sqrt(trailCreek2);
     float trailTone=1.+(trailSoilNoise(trailSoilP*.035)-.5)*.02*trailDetail;
     float trailClearing=1.-smoothstep(.78,1.13,length((vAtlasPosition.xz-vec2(1074.,272.))/vec2(30.,23.)));
     float trailCart=1.-smoothstep(.55,1.10,length((vAtlasPosition.xz-vec2(1092.,291.))/vec2(6.,6.)));
     trailClearing=max(trailClearing,trailCart);
     // Actual canopy shadows provide tree-related depth. Noise must not create
     // unrelated soil islands across the lawn or break the worn route/clearing.
     vec3 trailGrass=vec3(.225,.277,.158)*trailTone;
     vec3 trailEarth=vec3(.280,.235,.150),trailLocal=trailGrass;
     float trailWear=1.-smoothstep(2.25,4.8,trailRoadDistance);
     trailLocal=mix(trailLocal,trailEarth,max(trailWear,trailClearing*.86));
     float trailBank=(1.-smoothstep(2.2,8.,trailCreekDistance))*(1.-smoothstep(0.,12.,abs(vAtlasPosition.z-194.)-67.));
     trailLocal=mix(trailLocal,vec3(.188,.196,.142),trailBank*.62*(1.-trailWear*.35));
     diffuseColor.rgb=mix(diffuseColor.rgb,trailLocal,trailArea);
    }
    #include <alphamap_fragment>`);
  };
  mat.customProgramCacheKey=()=>oldKey()+'-trail-landscape-ground-2-'+lines.routeCount+'-'+lines.streamCount;this.trailGroundVariants.set(key,mat);this.mats[mat.name]=mat;return mat;
 }
 material(m){if((cards[m.material]||m.material==='trailBark')&&this.mats[m.material])return this.mats[m.material];const source=super.material(m),kind=groundKind(m);return kind<0?source:this.trailGround(source,kind);}
 dispose(){this.trailGroundVariants?.clear();super.dispose();}
}
G.DioramaRenderer=TrailLandscapeRenderer;
G.TRAIL_LANDSCAPE_RENDERER={revision:2,Base,TrailLandscapeRenderer,roi:ROI,pad:PAD,origin:ORIGIN,segmentBudget:MAX_SEGMENTS,cards,groundPalette:palette,segments,groundKind,weight,distance};
})(globalThis.GA);
