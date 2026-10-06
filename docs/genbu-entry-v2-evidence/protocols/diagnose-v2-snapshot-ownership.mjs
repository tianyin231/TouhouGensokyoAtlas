// Read-only serialization backing attribution and bounded V1/V2 geometry delta.
// No modelling hooks, native builds, candidate prepare or GPU.
import fs from 'node:fs';import assert from 'node:assert/strict';import {deserialize} from 'node:v8';import {createHash} from 'node:crypto';
const EV='/workspace/genbu-entry-evidence',ROOT='/workspace/genbu-entry-refinement',SOURCE='dd991fadfa7ef3339ec0afe26fa10e9dd6ddcc09fcd41536f3501e4e874d3544';
const OUT=EV+'/readonly-v2-snapshot-ownership.json';assert(!fs.existsSync(OUT));
const startedUTC=new Date().toISOString(),beg=performance.now(),sha=b=>createHash('sha256').update(b).digest('hex'),bindings={};
const read=p=>{const b=fs.readFileSync(p);bindings[p]={bytes:b.length,sha256:sha(b)};return b;};
assert.equal(sha(read(ROOT+'/src/genbu-entry.js')),SOURCE);
const actual=JSON.parse(read(EV+'/baseline-native-source-v2.json')),author=JSON.parse(read(EV+'/author-prepare-06.json'));assert.equal(author.sourceSHA,SOURCE);
function inventory(path){const wire=read(path),pack=deserialize(wire),groups=new Map(),viewIds=new Map(),seen=new Set();let nextView=0;
 function visit(o,path){if(!o||typeof o!=='object')return;if(ArrayBuffer.isView(o)){
   if(!viewIds.has(o))viewIds.set(o,++nextView);if(!groups.has(o.buffer))groups.set(o.buffer,{bufferID:groups.size,bufferBytes:o.buffer.byteLength,isSerializationInputBacking:o.buffer===wire.buffer,views:[]});
   groups.get(o.buffer).views.push({path,viewID:viewIds.get(o),type:o.constructor.name,byteOffset:o.byteOffset,byteLength:o.byteLength,byteEnd:o.byteOffset+o.byteLength});return;
  }if(seen.has(o))return;seen.add(o);if(o instanceof Map){for(const[k,v]of o)visit(v,path+'.Map('+String(k)+')');return;}if(o instanceof Set){let i=0;for(const v of o)visit(v,path+'.Set('+(i++)+')');return;}
  for(const[k,v]of Object.entries(o))visit(v,path+'.'+k);
 }visit(pack,'pack');
 let fullBytes=0,rangeBytes=0;const list=[...groups.values()].map(g=>{const ranges=[...new Map(g.views.map(v=>[v.viewID,[v.byteOffset,v.byteEnd]])).values()].sort((a,b)=>a[0]-b[0]),union=[];
  for(const[a,b]of ranges){const last=union.at(-1);if(last&&a<=last[1])last[1]=Math.max(last[1],b);else union.push([a,b]);}
  const covered=union.reduce((s,[a,b])=>s+b-a,0);fullBytes+=g.bufferBytes;rangeBytes+=covered;return{...g,reachableRangeBytes:covered,nonSourceBackingBytes:g.bufferBytes-covered,unionRanges:union};});
 return{path,packReportedBytes:pack.bytes,records:pack.meshes.length,uniqueBuffers:groups.size,uniqueTypedViews:nextView,wholeBackingBytes:fullBytes,unionSourceRangeBytes:rangeBytes,backingMinusSourceRanges:fullBytes-rangeBytes,serializedInputBytes:wire.length,groups:list};
}
const nativeBefore=inventory(EV+'/baseline-native-arrays-v2/genbu-native.v8'),nativeAfter=inventory(EV+'/author-prepare-06-arrays/native.v8');
const prior=deserialize(read(EV+'/author-prepare-05-arrays/public.v8')),now=deserialize(read(EV+'/author-prepare-06-arrays/public.v8'));
const ids=['island:terrain:-1024:-768','island:terrain:-1024:-768:far','island:terrain:-1024:-512','island:terrain:-1024:-512:far'];
const delta=[];
for(const id of ids){const a=prior.meshes.find(m=>m.id===id),b=now.meshes.find(m=>m.id===id);assert(a&&b);const rows=[],lengthSame=a.vertices.length===b.vertices.length;assert(lengthSame,'This attribution requires identical vertex layout '+id);
 for(let i=0;i<a.vertices.length;i+=9){const ks=[];for(let k=0;k<9;k++)if(!Object.is(a.vertices[i+k],b.vertices[i+k]))ks.push(k);if(ks.length)rows.push({vertexIndex:i/9,oldXYZ:Array.from(a.vertices.subarray(i,i+3)),newXYZ:Array.from(b.vertices.subarray(i,i+3)),changedAttributes:ks,old:Array.from(a.vertices.subarray(i,i+9)),candidate:Array.from(b.vertices.subarray(i,i+9))});}
 const positions=rows.map(q=>q.newXYZ),bounds=positions.length?{min:[0,1,2].map(k=>Math.min(...positions.map(p=>p[k]))),max:[0,1,2].map(k=>Math.max(...positions.map(p=>p[k])))}:null;
 delta.push({id,vertexLayoutUnchanged:lengthSame,indexValuesUnchanged:sha(Buffer.from(a.index.buffer,a.index.byteOffset,a.index.byteLength))===sha(Buffer.from(b.index.buffer,b.index.byteOffset,b.index.byteLength)),changedVertices:rows.length,changedBounds:bounds,attributeNames:['x','y','z','nx','ny','nz','r','g','b'],rows});
}
const pub=author.checks[1].result,combined=author.checks[3].result,contacts=pub.contactBytes+pub.originalContactBytes+pub.waterContactBytes;
const result={schema:1,kind:'Independent bounded V8 typed-range versus backing attribution; no production memory remeasurement',startedUTC,sourceSHA256:SOURCE,
 protocolSHA256:sha(fs.readFileSync(import.meta.filename)),bindings,executed:{overviewHooks:0,nativeBuilds:0,candidatePrepare:0,GPUFrames:0},
 actualLiveBaseline:{reportSHA256:bindings[EV+'/baseline-native-source-v2.json'].sha256,source:actual.nativeBuild,meaning:'Single original true Genbu build before V8 serialization; production ownership value.'},
 snapshotBefore:nativeBefore,snapshotAfter:nativeAfter,
 authorAfterBeforeSecondSerialization:{publicPackReportedBytes:combined.packBytes,nativePackReportedBytes:combined.nativeBytes,meaning:'Author byteCount after candidate transformation of deserialized baseline. These count whole typed-array backings, including serialized-input slabs and copied alignment views; not a real Worker build memory measurement.'},
 newExclusiveAllocationBudget:{publicNewBuffersBytes:combined.publicNewBytes,nativeNewTailBuffersBytes:combined.nativeNewBytes,totalPersistentSourceBytes:combined.sourceBytes,limitBytes:combined.maxSourceBytes,
  newContactsBytes:contacts,conservativeIncrementalPeakBytes:combined.sourceBytes+contacts,
  provenance:'Author06 live Set difference before/after prepare on accepted snapshots. New source allocations are Float32Array.from/Uint32Array.from-owned buffers and not views into the prior serialized input slab. Old slab is already in the before set and is not added again.',
  independentScope:'Read allocation sites and actual array buffers; did not regenerate candidate or repeat full production counters. Real Worker memory and release remain unmeasured.',
  peakInsideStandingSourceBudgetClaimed:false},
 V1ToV2TerrainDelta:delta,
 extraGuardScopeAttribution:{originalReport:'independent-v2-same-road-edge.json',originalReportSHA256:sha(read(EV+'/independent-v2-same-road-edge.json')),originalCLI:1,checksPassed:3,checksTotal:4,
  reason:'The extra whole-four-terrain-byte-equality guard exceeds the delegated same-22-face/same-819-point scope and contradicts the explicitly authorized V2 terminal water-bed revision. Original CLI1 and guard are not changed or relabelled as CLI0.',
  coreRequestedResults:'All original22/66 normal points now have positive normal/winding dot, including2 mixed faces. All819 same old/new support probes have exact0 near/far delta and no missing support. Those successful checks are retained rather than rerun.',
  deltaDoesNotConstituteFullNonTargetPass:'The listed byte deltas are attribution only; full V2 exterior/source protection remains deferred until visual gate.'},
 notMeasured:['Actual new native Worker total source bytes','Actual serialization transport peak heap','Worker disposal/reentry','Full new candidate ownership/source protection','New art/culling/cost acceptance'],endedUTC:new Date().toISOString(),elapsedWallMs:performance.now()-beg};
fs.writeFileSync(OUT,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({output:OUT,nativeActualBaseline:actual.nativeBuild.liveRecursiveBackingBytes,snapshotBefore:{whole:nativeBefore.wholeBackingBytes,ranges:nativeBefore.unionSourceRangeBytes,slack:nativeBefore.backingMinusSourceRanges},snapshotAfter:{whole:nativeAfter.wholeBackingBytes,ranges:nativeAfter.unionSourceRangeBytes,slack:nativeAfter.backingMinusSourceRanges},newExclusive:result.newExclusiveAllocationBudget,V1ToV2TerrainDelta:delta.map(({rows,...q})=>q),elapsedWallMs:result.elapsedWallMs}));
