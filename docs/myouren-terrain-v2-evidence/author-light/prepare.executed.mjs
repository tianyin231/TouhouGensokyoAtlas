import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
const sha=x=>createHash('sha256').update(x).digest('hex');
const report={scope:'Author bounded source preflight, not independent validation or visual acceptance',sourceSHA:sha(fs.readFileSync('src/myouren-terrain-rebuild.js')),projectSHA:sha(fs.readFileSync('project.json')),scriptSHA:sha(fs.readFileSync(import.meta.filename)),node:process.version};
try {
 const project=JSON.parse(fs.readFileSync('project.json')),context=vm.createContext({performance,TextDecoder,TextEncoder});
 for(const f of project.worldBuilders)vm.runInContext(fs.readFileSync(f,'utf8'),context,{filename:f});
 const G=context.GA,U=G.MYOUREN_TERRAIN_REBUILD,data=JSON.parse(fs.readFileSync('data/atlas.json')),raw=gunzipSync(fs.readFileSync('assets/packs/overview.pack.gz')),pack=G.decodePack(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength));
 const start=performance.now();U.prepare(data,pack);report.prepareCPUms=performance.now()-start;
 const meta=U.metadata.get(pack),added=pack.meshes.filter(m=>m.terrainRebuild),sample=U.sampler(added.filter(m=>m.globalFar&&m.cutOnly).flatMap(m=>U.sourceTriangles(m)));
 report.sourceBytes=meta.sourceBytes;report.contactBytes=meta.contactBytes;report.cutTraceBytes=meta.cutTrace.byteLength;
 report.artTriangles=meta.artTriangles;report.earthTriangles=meta.earthTriangles;report.rockFaces=meta.rockFaces;report.farTriangles=meta.farTriangles;
 report.changes=meta.changes.map(c=>({...c,removedFaces:c.removedFaces.length}));
 const missing=[];for(const x of [194,196,200,204,206])for(const z of [380,382,390,405,414])if(!sample(x,z))missing.push([x,z]);report.farCutMissingOutsideHole=missing;
 let bad=0,minArea=Infinity;for(const m of [...added,pack.meshes.find(m=>m.id===U.wallId)])for(const t of U.sourceTriangles(m)){const[a,b,c]=t.points,n=G.cross(G.sub(b,a),G.sub(c,a)),area=G.length(n)*.5;if(!Number.isFinite(area)||area<1e-8)bad++;minArea=Math.min(minArea,area);}report.invalidTriangles=bad;report.minimumTriangleArea=minArea;
 const a=data.myourenTerrainRebuild.contact,edgeKey=(p,q)=>[p.join(','),q.join(',')].sort().join('|'),soilEdges=new Map(),rockEdges=new Map();
 for(let t=0;t<a.length/9;t++){const tri=[0,1,2].map(k=>Array.from(a.subarray(t*9+k*3,t*9+k*3+3))),edges=t<meta.earthTriangles?soilEdges:rockEdges;for(let k=0;k<3;k++){const key=edgeKey(tri[k],tri[(k+1)%3]);edges.set(key,(edges.get(key)||0)+1);}}
 const ringEdges=[...rockEdges].filter(([k,n])=>n===1),unmatched=ringEdges.filter(([k])=>soilEdges.get(k)!==1);report.rockBoundaryEdges=ringEdges.length;report.unmatchedRockSoilEdges=unmatched;
 const v=G.PRESETS.myouren,vp=G.matmul(G.perspective(49,1280/720,.2,18000),G.lookAt(v.eye,v.target)),points=U.outcrops.flatMap(r=>[...r.ring,r.crest]),projected=points.map(p=>{const q=G.transform(vp,p);return q[3]>0&&Math.abs(q[0])<q[3]&&Math.abs(q[1])<q[3];});report.rockControlProjection={camera:v,points:points.length,inFrustum:projected.filter(Boolean).length,occlusionTested:false};
 report.passed=missing.length===0&&bad===0&&unmatched.length===0&&meta.sourceBytes<=.6*1048576;
 report.notRun=['Independent Sol checker','Native shrub detail build','Navigation adapter','Browser visual gate','Long regression'];
} catch(error) { report.error=error.stack;report.passed=false; }
console.log(JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
