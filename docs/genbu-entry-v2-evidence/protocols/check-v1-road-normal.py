"""Strict, bounded normal/winding probe of the saved V1 diagnosis; no builds/GPU.

This records the original candidate failure without touching source or geometry.
The same signed normal condition should be rechecked only in this edge after V2.
"""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import sys

EV = Path('/workspace/genbu-entry-evidence')
ROOT = Path('/workspace/genbu-entry-refinement')
REPORT = EV/'independent-v1-road-edge.json'
OUT = EV/'independent-v1-road-normal.json'
assert not OUT.exists(), 'Preserve prior actual diagnosis'
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
d = json.loads(REPORT.read_text())
assert d['sourceSHA256'] == '519dc52242b35f7d1f8e03a92ea918b95dd3f2bd6bcec97d0e942b3662e6fabb'
assert sha(REPORT) == '9206b68f3816105fdd2a10b4d334f5c68ca79d7089f5c7a52f76458ce1a031df'

dot = lambda a, b: sum(x*y for x, y in zip(a, b))
faces = [f for f in d['actualRoadFaces'] if f['id'].endswith(':shoulder') and f['geometricNormal'][1] < 0]
rows = []
for f in faces:
    old_dots = [dot(n, f['oldGeometricNormal']) for n in f['oldVertexNormals']]
    new_dots = f['vertexNormalDotGeometric']
    if any(v <= 0 for v in new_dots):
        rows.append({'recordId': f['id'], 'triangleOrdinal': f['triangleOrdinal'],
                     'center': f['center'], 'screen': f['screen'],
                     'geometricNormal': f['geometricNormal'], 'oldGeometricNormal': f['oldGeometricNormal'],
                     'originalNormals': f['oldVertexNormals'], 'candidateNormals': f['vertexNormals'],
                     'originalDotGeometric': old_dots, 'candidateDotGeometric': new_dots,
                     'newNormalSignByVertex': [1 if v > 0 else -1 for v in new_dots],
                     'roadAboveNearAtCentroid': f['support']['roadAboveNear'],
                     'roadAboveFarAtCentroid': f['support']['roadAboveFar']})

renderer = ROOT/'src/renderer.js'
vendor = ROOT/'vendor/three/three.module.js'
vendor_text = vendor.read_text()
checks = [
    {'name': 'All old normals on these actual retained left-shoulder faces agree with their original winding',
     'passed': all(dot(n, f['oldGeometricNormal']) > 0 for f in faces for n in f['oldVertexNormals']),
     'faces': len(faces)},
    {'name': 'Both actual LOD surfaces exist at all 819 bounded road-edge probes',
     'passed': d['summary']['candidateSamples'] == 819 and d['summary']['missingNearSamples'] == 0 and d['summary']['missingFarSamples'] == 0,
     'samples': d['summary']['candidateSamples'], 'noWholeSurfaceProofClaimed': True},
    {'name': 'Candidate normals on the same retained faces agree with actual triangle winding',
     'passed': len(rows) == 0, 'violatingFaces': len(rows),
     'violatingFaceVertexOccurrences': sum(sum(v <= 0 for v in q['candidateDotGeometric']) for q in rows)},
]
assert 'side:T.DoubleSide' in renderer.read_text()
assert 'normal *= faceDirection' in vendor_text and 'float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;' in vendor_text
r = {'schema': 1, 'kind': 'Independent actual left-shoulder normal/winding defect; original candidate failure',
     'atUTC': datetime.now(timezone.utc).isoformat(), 'sourceSHA256': d['sourceSHA256'],
     'artifactSHA256': d['artifactSHA256'], 'projectSHA256': d['projectSHA256'],
     'protocolSHA256': sha(Path(__file__)), 'diagnosisProtocolSHA256': d['protocolSHA256'],
     'diagnosisReportSHA256': sha(REPORT), 'rendererSHA256': sha(renderer), 'threeModuleSHA256': sha(vendor),
     'executed': {'overviewHooks': 0, 'nativeBuilds': 0, 'GPUFrames': 0, 'candidateGeneration': 0},
     'checks': checks, 'passed': all(c['passed'] for c in checks), 'violations': rows,
     'boundedSupport': {'samples': d['summary']['candidateSamples'], 'missingNear': 0, 'missingFar': 0,
                        'maximumRoadAboveNear': d['summary']['maximumRoadAboveNear']['roadAboveNear'],
                        'maximumRoadAboveOldNear': d['summary']['maximumOldRoadAboveNear']},
     'sourceCause': {'source': 'src/genbu-entry.js:111-115 applyRoads',
                     'behavior': 'Upward query normal is written without preserving original shoulder winding sign; indices retain downward face orientation.',
                     'renderer': 'src/renderer.js:19 MeshStandardMaterial side=DoubleSide',
                     'shader': 'vendor/three/three.module.js:441 normal_fragment_begin multiplies normal by front/back faceDirection',
                     'inference': 'The incorrect upward attribute is flipped downward on these visible backs. It explains the black strip location; no new raster attribution was performed.'},
     'repairScope': 'Preserve the original triangle/index orientation and derive consistently signed normals for the same changed left shoulder, including partially changed transition faces. Keep original geometry, RGB and all unrelated records protected.',
     'notMeasured': ['V2 correction', 'Full independent Genbu candidate checks', 'New raster draw-ledger attribution', 'Actual Worker release/lifecycle']}
OUT.write_text(json.dumps(r, ensure_ascii=False, indent=2)+'\n')
print(json.dumps({'path': str(OUT), 'passed': r['passed'], 'checks': [(c['name'], c['passed']) for c in checks], 'violations': len(rows)}, ensure_ascii=False))
sys.exit(0 if r['passed'] else 1)
