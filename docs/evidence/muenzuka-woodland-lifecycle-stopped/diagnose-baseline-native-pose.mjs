// One bounded offline diagnosis: existing report and unchanged math/camera.
// No scene, modelling hook, native build or GPU is constructed.
import fs from 'node:fs';
import crypto from 'node:crypto';
import vm from 'node:vm';
const D='/workspace/muenzuka-woodland-evidence',repo='/workspace/main-island-next';
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const baseline=read(D+'/baseline-native/report.json'),execution=read(D+'/baseline-native/execution.json');
const spec=read(D+'/native-lifecycle-spec.json'),a=read(D+'/baseline-A/report.json');
const actual=baseline.residencyObservations[1].pose,nominal=spec.residencyExpectedPoses.southEast;
const context=vm.createContext({GA:{}});
const builder=fs.readFileSync(repo+'/src/world-builder.js','utf8');
vm.runInContext(builder.slice(0,builder.indexOf('/* Explicit, reusable 3D geometry.')),context);
vm.runInContext(fs.readFileSync(repo+'/src/camera.js','utf8'),context);
const rig=Object.create(context.GA.CameraRig.prototype);
Object.assign(rig,{space:'surface',displayMode:'focus',mode:'orbit',aspect:1280/720,fov:49,changed:()=>{},eye:nominal.eye.slice(),target:nominal.target.slice(),transition:null});
rig.fromEye();rig.updateMatrices();
const viewBefore=Buffer.from(rig.view.buffer.slice(0)),vpBefore=Buffer.from(rig.vp.buffer.slice(0));
rig.update(0);
const reconstructed={eye:rig.eye.slice(),target:rig.target.slice(),fov:rig.fov};
const originalA=a.views.find(v=>v.spec.id==='southEast').final;
const report={kind:'Bounded offline diagnosis of retained CLI1, not lifecycle acceptance',
 originalCLIExitCode:execution.cliExitCode,originalFailure:baseline.failure,
 bindings:Object.fromEntries([D+'/baseline-native/report.json',D+'/baseline-native/execution.json',D+'/baseline-A/report.json',D+'/native-lifecycle-spec.json',repo+'/src/world-builder.js',repo+'/src/camera.js',import.meta.filename].map(p=>[p,hash(p)])),
 nominal,actual,eyeDelta:actual.eye.map((x,i)=>x-nominal.eye[i]),reconstructed,
 exactUnmodifiedCameraReconstruction:JSON.stringify(actual)===JSON.stringify(reconstructed),
 nominalVsReconstructedFloat32ViewByteExact:viewBefore.equals(Buffer.from(rig.view.buffer)),
 nominalVsReconstructedFloat32VPByteExact:vpBefore.equals(Buffer.from(rig.vp.buffer)),
 originalAActualPose:{eye:originalA.eye,target:originalA.target,fov:originalA.fov},
 sourceExplanation:'CameraRig.fromEye then ordinary production update(0) reconstructs orbit via sin/cos. The new real RAF inventory preserves that orbit eye; original A used renderOnce/updateMatrices without ordinary orbit reconstruction. New exact integer-expected assertion fails by one binary64 ULP at Y110.',
 prospectivelyObserved:{inventories:baseline.residencyObservations.map(x=>({label:x.label,resident:x.residentRows.length,uniqueGPUAttributeBytes:x.uniqueGPUAttributeBytes,geometryCount:x.managedGeometries.length,byteExact:x.byteReconciliation.exact})),
 noApplicationErrors:!baseline.errors.length,noContextEvents:!baseline.contextEvents.length,allFrozenFilesUnchanged:execution.filesUnchanged},
 candidateStarted:false,originalReportChanged:false,tolerancesChanged:false,productionChanged:false,
 notExecuted:['declared southEast natural wait','continuous LOD route','actual input','strict unload/reentry','image/program/idle restoration'],
 proposedNextStep:'If parent approves a protocol correction, compare this new prospective pose to exact deterministic unmodified CameraRig reconstruction and exact Float32 view/VP, while retaining original before/after rig equality. Preserve original CLI1. Do not change runtime/LOD/counter/PNG tolerances.',
 execution:{sceneBuilds:0,modellingHooks:0,nativeBuilds:0,GPU:0,productionCameraUtilityDefinitions:1}};
fs.writeFileSync(D+'/baseline-native-pose-diagnosis.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({report:D+'/baseline-native-pose-diagnosis.json',eyeDelta:report.eyeDelta,exactReconstruction:report.exactUnmodifiedCameraReconstruction,viewExact:report.nominalVsReconstructedFloat32ViewByteExact,vpExact:report.nominalVsReconstructedFloat32VPByteExact,cli1Kept:true}));
