// Authorized, bounded follow-up over complete already-built native packs.
// The original 6/7 CLI1 remains unchanged. No native/overview/GPU execution.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {deserialize} from 'node:v8';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';
import {geometryDigest} from '/workspace/flower-hill-refinement/tools/check-hakurei.mjs';
const R='/workspace/flower-hill-refinement',B='/workspace/flower-hill-evidence';
const OUT=B+'/sunflower-road-derived-normal-guard.json';assert(!fs.existsSync(OUT));
assert.equal(process.versions.node.split('.')[0],'22');
const SOURCE_SHA='2fde1ae2fa094decaf57facaf07fd895fe0a13fcb962480510f7a76ccc2ad549';
const BASELINE_SHA='f0e2d1871500518bedaf20c83d8ee71fb038fc61ee9f6d144428828444fce6ae';
const CANDIDATE_SHA='b3904a25cb67cbb24e71592a3ec7755de478b1a38bcba311c2ff94e701cf3319';
// Enumerated original path sample45 corners from the independent exact probe.
const expected=[
 {side:1,extra:0,x:-927.4110717773438,z:1225.0859375,occurrences:6},
 {side:-1,extra:0,x:-927.4014282226562,z:1227.5086669921875,occurrences:6},
 {side:-1,extra:.60,x:-927.3990478515625,z:1228.108642578125,occurrences:3},
 {side:1,extra:.60,x:-927.4134521484375,z:1224.4859619140625,occurrences:3}
];
const sha=b=>createHash('sha256').update(b).digest('hex'),inputs={},read=p=>{const b=fs.readFileSync(p);inputs[p]=sha(b);return b;};
const inside=(x,z)=>x>=-1280&&x<=-928&&z>=960&&z<=1376;
const bits=v=>{const b=Buffer.alloc(4);b.writeFloatLE(v);return b.toString('hex');};
const started=performance.now(),report={schema:1,kind:'Strict native road derived-normal guard over saved actual builds',
 startUTC:new Date().toISOString(),sourceSHA256:SOURCE_SHA,protocolSHA256:sha(read(fileURLToPath(import.meta.url))),
 originalCLI1Preserved:true,originalRoadProtectionResult:'6/7; not relabelled',nativeBuildCount:0,overviewHooks:0,GPUFrames:0,
 sourceModified:false,budgetChanged:false,checks:[],passed:true};
const check=(name,fn)=>{try{const result=fn();report.checks.push({name,passed:true,result});return result;}catch(e){report.passed=false;report.checks.push({name,passed:false,error:e.stack||String(e)});return null;}};
try{
 const original=JSON.parse(read(B+'/native-repair-actual-v2.json'));
 report.originalReportSHA256=inputs[B+'/native-repair-actual-v2.json'];
 assert.equal(original.sourceSHA256,SOURCE_SHA);assert.equal(original.passed,false);
 assert.equal(original.checks.filter(c=>!c.passed).length,1);assert.equal(original.nativeBuildCount,3);
 const load=label=>{const row=original.completeNativeSnapshots.find(s=>s.label===label),b=read(row.path);assert.equal(sha(b),row.sha256);return deserialize(Buffer.from(b));};
 const baseline=load('sunflower-solar-baseline'),candidate=load('sunflower-final'),baselineData=load('baseline-manifest'),data=load('candidate-manifest');
 const project=JSON.parse(read(R+'/project.json'));assert.equal(inputs[R+'/project.json'],'d9ae63c0be3e3527eb1800924c79702cf03d64ba516ef8e3247d9bdcc28ab574');
 const ctx=vm.createContext({performance,TextEncoder,TextDecoder});for(const p of project.worldBuilders)vm.runInContext(String(read(R+'/'+p)),ctx,{filename:p});
 assert.equal(inputs[R+'/src/flower-hill-entry.js'],SOURCE_SHA);read(R+'/tools/check-hakurei.mjs');
 const G=ctx.GA,oldTerrain=new G.Terrain(baselineData),terrain=new G.Terrain(data),old=new Map(baseline.meshes.map(m=>[m.id,m]));
 const sourcePoints=new Map(),pointKey=(id,x,z)=>id+':'+Math.fround(x)+':'+Math.fround(z);
 function edge(path,i,side,extra){const a=path.samples[Math.max(0,i-1)],b=path.samples[Math.min(path.samples.length-1,i+1)],v=path.samples[i],dx=b[0]-a[0],dz=b[1]-a[1],L=Math.hypot(dx,dz)||1,w=path.width*(.97+.035*Math.sin(i*.21));return{pathId:path.id,sample:i,side,extra,x:v[0]-dz/L*(w/2+extra)*side,z:v[1]+dx/L*(w/2+extra)*side};}
 for(const p of G.FLOWERLANDS.paths)for(let i=0;i<p.samples.length-1;i++){
  const a=p.samples[i],b=p.samples[i+1],id='flowerlands:terrain-props:meadowGround:base:'+Math.floor((a[0]+b[0])/2/96)+':'+Math.floor((a[1]+b[1])/2/96);
  for(const j of[i,i+1])for(const side of[-1,1])for(const extra of[0,.60]){const e=edge(p,j,side,extra),k=pointKey(id,e.x,e.z);if(!sourcePoints.has(k))sourcePoints.set(k,[]);sourcePoints.get(k).push(e);}
 }
 const id='flowerlands:terrain-props:meadowGround:base:-10:12',path=G.FLOWERLANDS.paths.find(p=>p.id==='flower-hill-link');assert(path);
 const allowed=new Map(expected.map(p=>{const source=edge(path,45,p.side,p.extra);assert.equal(Math.fround(source.x),p.x);assert.equal(Math.fround(source.z),p.z);return[pointKey(id,p.x,p.z),{...p,id,source,seen:0}];}));
 check('complete actual pair binds exact approved native snapshots and unchanged original paths',()=>{
  assert.equal(geometryDigest(baseline),BASELINE_SHA);assert.equal(geometryDigest(candidate),CANDIDATE_SHA);
  assert.equal(JSON.stringify(candidate.meta.paths),JSON.stringify(baseline.meta.paths));
  assert.equal(JSON.stringify(G.FLOWERLANDS.paths),JSON.stringify(baseline.meta.paths));
  assert.equal(allowed.size,4);return{baselineNativeSHA256:BASELINE_SHA,candidateNativeSHA256:CANDIDATE_SHA,explicitAllowedPath:'flower-hill-link',sample:45,corners:4,maximumNormalDependencyDistance:1};
 });
 check('complete native road cardinality, all original XZ and exact source-query support',()=>{
  const rows=candidate.meshes.filter(m=>m.group==='roads'),before=baseline.meshes.filter(m=>m.group==='roads');assert.equal(JSON.stringify(rows.map(m=>m.id)),JSON.stringify(before.map(m=>m.id)));
  let vertices=0,sourceMatches=0,maxApproximateYError=0;for(const m of rows){const o=old.get(m.id);assert(!m.index&&!o.index);assert.equal(m.vertices.length,o.vertices.length);
   for(let i=0;i<m.vertices.length;i+=9){const a=o.vertices,b=m.vertices,x=a[i],z=a[i+2];assert.equal(b[i],x);assert.equal(b[i+2],z);
    const options=sourcePoints.get(pointKey(m.id,x,z))||[],source=options.find(p=>Object.is(Math.fround(oldTerrain.height(p.x,p.z)+.24),a[i+1])&&Object.is(Math.fround(terrain.height(p.x,p.z)+.24),b[i+1]));
    assert(source,'Native road has no exact original double cross-section/query support '+m.id+'/'+i/9);
    maxApproximateYError=Math.max(maxApproximateYError,Math.abs(b[i+1]-Math.fround(terrain.height(x,z)+.24)));vertices++;sourceMatches++;
   }
  }assert.equal(vertices,15786);assert.equal(sourceMatches,15786);assert(maxApproximateYError<=.00015);return{roadRecords:rows.length,actualVertices:vertices,completeXZExact:true,exactDoubleSourceQueryYMatches:sourceMatches,maximumF32CoordinateQueryDifference:maxApproximateYError,tolerance:.00015};
 });
 check('only four enumerated source corners have derived exterior normal changes; all other exterior attributes exact',()=>{
  let outsideVertices=0,changedOccurrences=0;for(const m of candidate.meshes.filter(m=>m.group==='roads')){const o=old.get(m.id);for(let i=0;i<m.vertices.length;i+=9){const a=Array.from(o.vertices.subarray(i,i+9)),b=Array.from(m.vertices.subarray(i,i+9));if(inside(a[0],a[2]))continue;outsideVertices++;
   const k=pointKey(m.id,a[0],a[2]),rule=allowed.get(k);if(!rule){for(let j=0;j<9;j++)assert.equal(bits(b[j]),bits(a[j]),'Unpermitted external native road attribute '+m.id+'/'+i/9+'/'+j);continue;}
   rule.seen++;changedOccurrences++;for(const j of[0,1,2,6,7,8])assert.equal(bits(b[j]),bits(a[j]),'Allowed normal corner changed XYZ/RGB');
   const p=rule.source;assert.equal(p.pathId,'flower-hill-link');assert.equal(p.sample,45);assert.equal(Math.fround(p.x),a[0]);assert.equal(Math.fround(p.z),a[2]);assert(!inside(p.x,p.z));assert.equal(oldTerrain.height(p.x,p.z),terrain.height(p.x,p.z));
   const stencil=[[-1,0],[1,0],[0,-1],[0,1]].map(([dx,dz])=>({x:p.x+dx,z:p.z+dz,inside:inside(p.x+dx,p.z+dz),old:oldTerrain.height(p.x+dx,p.z+dz),new:terrain.height(p.x+dx,p.z+dz)}));
   assert(stencil[0].inside);assert.notEqual(stencil[0].old,stencil[0].new);for(const s of stencil.slice(1)){assert(!s.inside);assert.equal(s.old,s.new);}
   for(const[label,t,v]of[['old',oldTerrain,a],['new',terrain,b]]){const computed=Array.from(G.norm([stencil[0][label]-stencil[1][label],2,stencil[2][label]-stencil[3][label]])),actual=Array.from(t.normal(p.x,p.z));for(let j=0;j<3;j++){assert.equal(bits(computed[j]),bits(actual[j]),'Actual normal method diverges from the original stencil');assert.equal(bits(computed[j]),bits(v[j+3]),'Derived normal differs bitwise from the actual native vertex');}}
   assert(b.slice(3,6).some((v,j)=>bits(v)!==bits(a[j+3])));rule.proof={source:p,stencil,originalNormalBits:a.slice(3,6).map(bits),candidateNormalBits:b.slice(3,6).map(bits)};
  }}
  assert.equal(changedOccurrences,18);for(const p of allowed.values())assert.equal(p.seen,p.occurrences,'Enumerated exterior corner multiplicity');
  return{outsideVertices,allowedUniquePoints:4,allowedDuplicateVertices:18,allOtherOutsideNineAttributesExact:true,allowedXYZRGBExact:true,actualTerrainNormalFloat32BitError:0,allowedPoints:[...allowed.values()]};
 });
 report.notRun=['Any new native/source/public construction','GPU views or native lifecycle','Full Node regression'];
}catch(e){report.passed=false;report.fatal=e.stack||String(e);}
finally{const changed=Object.entries(inputs).filter(([p,h])=>sha(fs.readFileSync(p))!==h).map(([p])=>p);if(changed.length){report.passed=false;report.changedInputs=changed;}Object.assign(report,{inputsSHA256:inputs,inputsUnchanged:changed.length===0,endUTC:new Date().toISOString(),elapsedWallMs:performance.now()-started});fs.writeFileSync(OUT,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({output:OUT,passed:report.passed,checks:report.checks.map(c=>({name:c.name,passed:c.passed})),fatal:report.fatal,elapsedWallMs:report.elapsedWallMs}));if(!report.passed)process.exitCode=1;}
