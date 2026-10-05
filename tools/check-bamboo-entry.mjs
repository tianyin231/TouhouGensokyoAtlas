// Bounded CPU inventory and independent source checks for the bamboo entrance.
// Cold HLOD geometry is measured separately from native near/far prototypes.
// No WebGL, fixture rewriting, or complete island/regression build.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import fs from 'node:fs';
import vm from 'node:vm';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import * as T from '../vendor/three/three.module.js';
import {geometryDigest} from './check-hakurei.mjs';

const hash=a=>createHash('sha256').update(Buffer.from(a.buffer,a.byteOffset,a.byteLength)).digest('hex');
const triangleCount=m=>m.index?m.index.length/3:m.vertices.length/27;
const culm=m=>/^bamboo:(stem|leaf):/.test(m.id);
const target=m=>/^bamboo:(stem|leaf):[012]:[2345]:[789]$/.test(m.id);
// Deliberately independent of the mutable accepted-region fixture. A reviewed
// upgrade may change hakurei-baseline.regions.bamboo; the retained author must
// still reproduce this exact pre-upgrade geometry.
export const ORIGINAL_BAMBOO_GEOMETRY_SHA='3312677814fc2323303b5453b59d7bc9ad63ad6955afee93e85eb41715c4aa8a';
function projection(G,m,preset){
 const p=G.PRESETS[preset],VP=G.matmul(G.perspective(49,1280/720,.1,24000),G.lookAt(p.eye,p.target)),box=[Infinity,Infinity,-Infinity,-Infinity];let visibleInstances=0,visibleVertices=0;
 for(let i=0;i<m.instances.length;i+=16){const a=m.instances.subarray(i,i+16);let seen=false;
  for(let j=0;j<m.vertices.length;j+=9){const x=m.vertices[j],y=m.vertices[j+1],z=m.vertices[j+2],world=[a[0]*x+a[4]*y+a[8]*z+a[12],a[1]*x+a[5]*y+a[9]*z+a[13],a[2]*x+a[6]*y+a[10]*z+a[14]],q=G.transform(VP,world);if(q[3]<=0)continue;const X=q[0]/q[3],Y=q[1]/q[3],Z=q[2]/q[3];if(X< -1||X>1||Y< -1||Y>1||Z< -1||Z>1)continue;seen=true;visibleVertices++;const px=(X+1)*640,py=(1-Y)*360;box[0]=Math.min(box[0],px);box[1]=Math.min(box[1],py);box[2]=Math.max(box[2],px);box[3]=Math.max(box[3],py);}
  if(seen)visibleInstances++;
 }
 const distance=Math.hypot(...m.center.map((v,k)=>v-p.eye[k]));
 return {visibleInstances,visibleVertices,visibleVertexBox:visibleVertices?box:null,eyeDistance:distance,coldEntryBalancedLod:distance>105*.88?'far':'near',scope:'CPU vertex projection only; excludes occlusion and shader wind, not renderer visibility'};
}
export async function inventoryBambooEntry(G,atlas,read){
 const start=performance.now(),build=G.BAMBOO_ENTRY_UPGRADE?.originalBuildRegion||G.buildRegion,pack=await build(atlas,'bamboo'),raw=gunzipSync(read('assets/packs/overview.pack.gz')),cold=G.decodePack(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength)),native=pack.meshes.filter(culm),prototypes={};
 for(const m of native){const [,part,variant]=m.id.split(':');prototypes[part+':'+variant]={nearTriangles:triangleCount(m),farTriangles:m.farVertices.length/27,nearSHA:hash(m.vertices),farSHA:hash(m.farVertices),nearBytes:m.vertices.byteLength,farBytes:m.farVertices.byteLength};}
 const targets=native.filter(target).map(m=>({id:m.id,instances:m.instances.length/16,nearTriangles:triangleCount(m),farTriangles:m.farVertices.length/27,center:Array.from(m.center),radius:m.radius,instanceSHA:hash(m.instances),colorsSHA:hash(m.instanceColors),projection:m.id.startsWith('bamboo:leaf')?projection(G,m,'bambooEntry'):null}));
 const coarse=cold.meshes.filter(m=>m.owner==='bamboo'&&m.instances).map(m=>({id:m.id,material:m.material,hlodGroup:m.hlodGroup,component:m.component,instances:m.instances.length/16,triangles:triangleCount(m),vertices:m.vertices.length/9,sourceIds:m.sourceIds,center:m.center,radius:m.radius}));
 return {sourceBaseline:'261d5bfff5388cbf8192dbfd43445daf49183636',scope:'One original native bamboo build and cold overview inventory plus CPU camera projection; no scene rendering',native:{records:pack.meshes.length,culmBatches:native.length/2,culmInstances:native.filter(m=>m.id.startsWith('bamboo:stem')).reduce((n,m)=>n+m.instances.length/16,0),sourceBytes:pack.bytes,prototypes,targetBatches:targets},cold:coarse,CPUms:performance.now()-start};
}

const fields=['vertices','farVertices','instances','instanceColors','index'];
const raw=a=>Buffer.from(a.buffer,a.byteOffset,a.byteLength);
const metadata=m=>JSON.stringify(m,(k,v)=>fields.includes(k)?undefined:v);
function snapshot(m){return {id:m.id,metadata:metadata(m),arrays:Object.fromEntries(fields.map(k=>[k,m[k]?hash(m[k]):null]))};}
function bytes(meshes){const buffers=new Set();let n=0;for(const m of meshes)for(const k of fields){const a=m[k];if(a&&!buffers.has(a.buffer)){buffers.add(a.buffer);n+=a.buffer.byteLength;}}return n;}
function nearestSource(point,array){
 const p=new T.Vector3(...point),a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),q=new T.Vector3(),tri=new T.Triangle(a,b,c);let minimum=Infinity;
 for(let i=0;i<array.length;i+=27){a.fromArray(array,i);b.fromArray(array,i+9);c.fromArray(array,i+18);tri.closestPointToPoint(p,q);minimum=Math.min(minimum,p.distanceTo(q));}return minimum;
}
function leafConnections(p,lod){
 const source=p[lod].leaf,stem=p[lod].stem,rows=[],perLeaf=lod==='near'?4:2,records=p.leafRecords?.[lod]||p.leaves.filter(l=>lod==='near'||l.far);let n=0;
 for(const [index,leaf] of records.entries()){const root=Array.from(source.subarray(n*perLeaf*27,n*perLeaf*27+3));assert.equal(root.length,3,'Leaf source interval missing');assert(Math.hypot(...root.map((v,k)=>v-leaf.root[k]))<.00005,'Control leaf root does not match actual source');const distance=nearestSource(root,stem);rows.push({leaf:index,branch:leaf.branch,distance});n++;}
 assert.equal(n*perLeaf*27,source.length,'Leaf control records do not account for the complete actual leaf source');
 const failed=rows.filter(r=>r.distance>.05);assert.equal(failed.length,0,'Floating '+lod+' leaf roots: '+JSON.stringify(failed.slice(0,5)));
 return {leaves:n,maximumActualStemDistance:Math.max(...rows.map(r=>r.distance)),tolerance:.05,actualRootVertices:true};
}
function geometrySanity(a,label){let area=Infinity;assert(a.length%27===0&&a.every(Number.isFinite),'Invalid source attributes: '+label);for(let i=0;i<a.length;i+=27){const p=new T.Vector3().fromArray(a,i),q=new T.Vector3().fromArray(a,i+9),r=new T.Vector3().fromArray(a,i+18),t=new T.Triangle(p,q,r),A=t.getArea();assert(A>1e-8,'Degenerate plant triangle: '+label+'/'+i/27);area=Math.min(area,A);for(const j of [0,9,18])assert(Math.abs(Math.hypot(a[i+j+3],a[i+j+4],a[i+j+5])-1)<.0001,'Nonunit plant normal: '+label+'/'+i/27);}return {triangles:a.length/27,minimumArea:area};}
function instanceBoundsAndPath(G,record,p){
 let maximumRadius=0,minimumAddedHeight=Infinity,belowHeadroom=0;
 for(let i=0;i<record.instances.length;i+=16){const M=record.instances.subarray(i,i+16);for(const lod of ['near','far']){const a=p[lod][record.id.split(':')[1]],prefix=record.id.startsWith('bamboo:stem:')?(lod==='near'?504:15)*27:0;
  for(let j=0;j<a.length;j+=9){const x=M[0]*a[j]+M[4]*a[j+1]+M[8]*a[j+2]+M[12],y=M[1]*a[j]+M[5]*a[j+1]+M[9]*a[j+2]+M[13],z=M[2]*a[j]+M[6]*a[j+1]+M[10]*a[j+2]+M[14];maximumRadius=Math.max(maximumRadius,Math.hypot(x-record.center[0],y-record.center[1],z-record.center[2]));if(j<prefix)continue;minimumAddedHeight=Math.min(minimumAddedHeight,y-M[13]);if(y-M[13]<2.4){belowHeadroom++;const near=G.BAMBOO.nearest(x,z);assert(near.d>=near.width/2+.1,'Added plant geometry blocks original walking corridor: '+record.id+'/'+i/16);}}
 }}
 assert(maximumRadius<=record.radius+.0001,'Original batch bound fails to enclose new instances: '+record.id+' real='+maximumRadius+' declared='+record.radius);
 return {record:record.id,instances:record.instances.length/16,maximumActualVertexRadius:maximumRadius,declaredRadius:record.radius,minimumAddedHeightAboveOriginalRoot:minimumAddedHeight,belowHeadroomVertices:belowHeadroom,headroom:2.4};
}
export async function checkBambooEntry(G,atlas,read){
 const U=G.BAMBOO_ENTRY_UPGRADE,P=G.BAMBOO_ENTRY_PLANTS;assert(U&&P,'Candidate API missing');const start=performance.now(),report={schema:1,scope:'Bounded CPU native identity, geometry connection, instances, path headroom and unchanged cold asset; no visual/GPU/FPS acceptance',passed:true,checks:[],sourceSHA:Object.fromEntries(['src/bamboo-entry-plants.js','src/bamboo-entry-upgrade.js','project.json'].map(p=>[p,createHash('sha256').update(read(p)).digest('hex')])),checkerSHA:createHash('sha256').update(read('tools/check-bamboo-entry.mjs')).digest('hex')};
 const check=async(name,fn)=>{try{report.checks.push({name,passed:true,result:await fn()});}catch(e){report.passed=false;report.checks.push({name,passed:false,error:e.stack});}};
 const original=await U.originalBuildRegion(atlas,'bamboo'),before=original.meshes.map(snapshot),after=U.applyDetail(original),protos=[];
 await check('original region geometry fixture',()=>{assert.equal(geometryDigest(original),ORIGINAL_BAMBOO_GEOMETRY_SHA);return {originalGeometrySHA:geometryDigest(original),sourceBaseline:'261d5bfff5388cbf8192dbfd43445daf49183636',independentOfAcceptedFixture:true};});
 await check('exact target population and unchanged original identity',()=>{const selected=original.meshes.filter(m=>/^bamboo:(stem|leaf):[012]:[34]:[89]$/.test(m.id));assert.equal(selected.length,24);assert.equal(selected.filter(m=>m.id.startsWith('bamboo:stem:')).reduce((n,m)=>n+m.instances.length/16,0),807);assert.equal(after.meshes.length,original.meshes.length);assert.equal(new Set(after.meshes.map(m=>m.id)).size,after.meshes.length);for(const old of before){const m=after.meshes.find(m=>m.id===old.id);assert(m,'Original record missing');assert.equal(metadata(m),old.metadata,'Original identity/material/LOD/bounds changed: '+old.id);for(const k of fields){if(/^bamboo:(stem|leaf):[012]:[34]:[89]$/.test(old.id)&&['vertices','farVertices'].includes(k))continue;assert.equal(m[k]?hash(m[k]):null,old.arrays[k],'Protected source changed: '+old.id+'/'+k);}}for(const [k,v] of Object.entries(original.meta))assert.equal(JSON.stringify(after.meta[k]),JSON.stringify(v),'Original path/feature metadata changed: '+k);assert.equal(JSON.stringify(after.signs),JSON.stringify(original.signs));return {targetRecords:24,culms:807,unchangedRecords:before.length-24,originalMatricesColorsIdsMaterialsLodBoundsPathsBuildingsPreserved:true,newGeometrySHA:geometryDigest(after)};});
 for(let v=0;v<3;v++){const old=original.meshes.find(m=>m.id==='bamboo:stem:'+v+':4:8'),p=P.prototype(v,old.vertices,old.farVertices);protos.push(p);await check('prototype '+v+' original culm and triangle budget',()=>{assert(raw(old.vertices.subarray(0,504*27)).equals(raw(p.near.stem.subarray(0,504*27))));assert(raw(old.farVertices).equals(raw(p.far.stem.subarray(0,15*27))));const near=(p.near.stem.length+p.near.leaf.length)/27,far=(p.far.stem.length+p.far.leaf.length)/27;assert(near<=1945&&far<=111,'Original per-culm triangle budget exceeded');return {near,far,retainedNearCulmTriangles:504,retainedFarCulmTriangles:15};});for(const lod of ['near','far']){await check('prototype '+v+' '+lod+' source geometry',()=>({stem:geometrySanity(p[lod].stem,v+'/'+lod+'/stem'),leaf:geometrySanity(p[lod].leaf,v+'/'+lod+'/leaf')}));await check('prototype '+v+' '+lod+' leaf connection',()=>leafConnections(p,lod));}await check('prototype '+v+' near/far branch to retained culm',()=>{const near=p.branches.map(b=>nearestSource(b.origin,p.near.stem.subarray(0,504*27))),far=p.branches.map(b=>nearestSource(b.farOrigin||b.origin,p.far.stem.subarray(0,15*27)));assert(near.every(d=>d<=.2),'Secondary branch floats away from retained segmented culm');assert(far.every(d=>d<=.2),'Far branch floats away from retained straight culm');return {branches:near.length,maximumNearDistance:Math.max(...near),maximumFarDistance:Math.max(...far),tolerance:.2};});}
 await check('actual transformed instance bounds and walking clearance',()=>({records:after.meshes.filter(m=>/^bamboo:(stem|leaf):[012]:[34]:[89]$/.test(m.id)).map(m=>instanceBoundsAndPath(G,m,protos[Number(m.id.split(':')[2])])),scope:'Every actual near/far source vertex transformed by every target matrix; added geometry below 2.4m tested against original path samples'}));
 await check('source accounting, three shared prototypes and repeat apply',()=>{assert.equal(after.bytes,bytes(after.meshes));const extra=bytes(protos.flatMap(p=>[{vertices:p.near.stem,farVertices:p.far.stem},{vertices:p.near.leaf,farVertices:p.far.leaf}]));assert(extra<=.6*1048576,'Additional retained shared source exceeds 0.6 MiB');for(const m of after.meshes.filter(m=>/^bamboo:(stem|leaf):[012]:[34]:[89]$/.test(m.id))){const p=protos[Number(m.id.split(':')[2])],part=m.id.split(':')[1];assert.equal(m.vertices,p.near[part]);assert.equal(m.farVertices,p.far[part]);}assert.equal(U.applyDetail(after),after);return {originalPackBytes:original.bytes,candidatePackBytes:after.bytes,additionalRetainedSourceBackingBytes:extra,targetRecordDelta:0,newTextures:0,sourceAccountingIsNotGpuMeasurement:true};});
 await check('original cold overview preserved and separately identified',()=>{const sha=createHash('sha256').update(read('assets/packs/overview.pack.gz')).digest('hex');assert.equal(sha,'7398a263bf02d560fd0c9265d9e297ec3b22357f2429c4732ee3488f2d097742');const raw=gunzipSync(read('assets/packs/overview.pack.gz')),cold=G.decodePack(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength)),tree=cold.meshes.find(m=>m.id==='overview:bamboo:trees');assert.equal(tree.instances.length/16,900);assert.equal(triangleCount(tree),48);return {assetSHA:sha,record:tree.id,instances:900,triangles:48,coldUpdated:false,coldIsNotNativeSubset:true};});
 report.CPUms=performance.now()-start;return report;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 assert.equal(Number(process.versions.node.split('.')[0]),22,'Use Node 22 for stable source geometry');
 const root=resolve(fileURLToPath(new URL('../',import.meta.url))),read=p=>fs.readFileSync(resolve(root,p)),project=JSON.parse(read('project.json')),context=vm.createContext({performance,TextDecoder,TextEncoder});for(const p of project.worldBuilders)vm.runInContext(String(read(p)),context,{filename:p});
 const report=await (process.argv.includes('--inventory')?inventoryBambooEntry:checkBambooEntry)(context.GA,JSON.parse(read('data/atlas.json')),read),at=process.argv.indexOf('--output');if(at>=0){assert(process.argv[at+1],'--output requires a path');fs.writeFileSync(resolve(process.argv[at+1]),JSON.stringify(report,null,2)+'\n');}console.log(JSON.stringify(report,null,2));if(report.passed===false)process.exitCode=1;
}
