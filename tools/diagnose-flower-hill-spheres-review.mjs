// Offline continuation: can either cached LOD sphere contain both LODs and
// every shader phase? Uses saved values only; changes no earlier result.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {deserialize} from 'node:v8';
import {fileURLToPath} from 'node:url';
import {performance} from 'node:perf_hooks';
const B='/workspace/flower-hill-evidence',P=B+'/offline-lily-lod-sphere-compat.json';
assert(!fs.existsSync(P));assert.equal(process.versions.node.split('.')[0],'22');
const sha=v=>createHash('sha256').update(v).digest('hex');
const read=p=>fs.readFileSync(p),source=read(B+'/offline-lily-split-and-roads.json'),r=JSON.parse(source);
const snapshotPath=B+'/nameless-native-arrays/candidate.v8',raw=read(snapshotPath),pack=deserialize(raw);
assert.equal(sha(raw),r.inputsSHA256[snapshotPath]);
const m=pack.meshes.find(m=>m.id==='flowerlands:nameless:lily:0:-39:35');
const report={kind:'Four fixed child spheres: both cached LODs contain all selected LOD vertices and wind phases',
 startedUTC:new Date().toISOString(),scriptSHA256:sha(read(fileURLToPath(import.meta.url))),
 sourceReportSHA256:sha(source),snapshotSHA256:sha(raw),noGPU:true,noNativeBuild:true,
 unchangedEarlierOriginalReports:true,checks:[],passed:true};
const start=performance.now(),children=r.partitionOptions.find(o=>o.name==='fourXZ').children;
for(const child of children)for(const cached of ['near','far'])for(const selected of ['near','far']){
 const s=child.variants[cached],a=selected==='near'?m.vertices:m.farVertices,b=m.instances;
 let maxOutside=-Infinity,at=null,vertices=0;
 for(const index of child.sourceIndices){const i=index*16;
  for(let j=0;j<a.length;j+=9){const x=a[j],y=a[j+1],z=a[j+2],bend=Math.pow(Math.max(0,y),1.8)*.013;
   const X=b[i]*x+b[i+4]*y+b[i+8]*z+b[i+12],Y=b[i+1]*x+b[i+5]*y+b[i+9]*z+b[i+13],Z=b[i+2]*x+b[i+6]*y+b[i+10]*z+b[i+14];
   for(const sx of [-1,1])for(const sz of [-1,1]){const e=Math.hypot(X+sx*b[i]*bend+sz*b[i+8]*bend*.5-s.center[0],Y+sx*b[i+1]*bend+sz*b[i+9]*bend*.5-s.center[1],Z+sx*b[i+2]*bend+sz*b[i+10]*bend*.5-s.center[2])-s.radius;
    if(e>maxOutside){maxOutside=e;at={sourceInstance:index,prototypeVertex:j/9,sx,sz};}}
   vertices++;
  }
 }
 const passed=maxOutside<=1e-7;report.passed&&=passed;
 report.checks.push({child:child.key,instances:child.instances,cached,selected,vertices,maximumAnyShaderPhaseOutside:maxOutside,at,passed});
}
report.minimumSafeMargin=-Math.max(...report.checks.map(c=>c.maximumAnyShaderPhaseOutside));
report.endedUTC=new Date().toISOString();report.elapsedWallMs=performance.now()-start;
fs.writeFileSync(P,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({output:P,reportSHA256:sha(read(P)),passed:report.passed,checks:report.checks.length,minimumSafeMargin:report.minimumSafeMargin,elapsedWallMs:report.elapsedWallMs}));
if(!report.passed)process.exitCode=1;
