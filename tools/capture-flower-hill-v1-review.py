"""One read-only Flower Hill survey using the frozen accepted Sunflower artifact.

The capture may overlap the separately running full Node regression. Wall time
and Worker build time are recorded only for traceability, never compared as speed.
No production source or build input is edited by this protocol.
"""
import hashlib
import json
import subprocess
import threading
import time
from datetime import datetime, timezone
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright

import argparse
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--repo', type=Path, required=True)
parser.add_argument('--dist', type=Path, required=True)
parser.add_argument('--output', type=Path, required=True)
parser.add_argument('--expected-sha', required=True)
parser.add_argument('--label', required=True)
args = parser.parse_args()
REPO, DIST, OUT = args.repo.resolve(), args.dist.resolve(), args.output.resolve()
POSE = {'space': 'surface', 'eye': [-920, 315, 1520], 'target': [-1138, 146, 1190]}
EXPECTED = args.expected_sha
OUT.mkdir(parents=True, exist_ok=True)
assert not (OUT/'report.json').exists(), 'Do not overwrite a prior survey'
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
release = json.loads((DIST/'release.json').read_text())
artifact = DIST/release['artifact']
assert sha(artifact) == release['sha256'] == EXPECTED
inputs = lambda: {name: sha(REPO/name) for name in release['inputs']}
before = inputs()
assert before == release['inputs'], 'Frozen build inputs differ before survey'
report = {'schema': 1, 'purpose': 'Read-only single-view flower-hill candidate', 'candidateLabel': args.label,
          'startedUTC': datetime.now(timezone.utc).isoformat(),
          'sourceHEADBefore': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=REPO, text=True).strip(),
          'artifactSHA256': EXPECTED, 'releaseSHA256': sha(DIST/'release.json'),
          'protocolSHA256': sha(Path(__file__)), 'inputsBefore': before,
          'view': 'flowerHillSaddle', 'initialPreset': 'flowerLink', 'pose': POSE,
          'viewport': [1280, 720], 'dpr': 1, 'fov': 49, 'clock': 12.5,
          'quality': 'balanced', 'lighting': 'neutral', 'ao': True,
          'productionRegionOrder': ['nameless', 'sunflower'],
          'cpuLoadOverlap': 'Not controlled for concurrent execution; do not use timings as performance evidence.',
          'hardwareFPSMeasured': False, 'errors': [], 'httpFailures': [], 'contextEvents': []}
began = time.monotonic()
def save():
    (OUT/'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass
    def send_error(self, code, message=None, explain=None):
        report['httpFailures'].append({'path': self.path, 'status': code})
        super().send_error(code, message, explain)

server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=str(DIST)))
threading.Thread(target=server.serve_forever, daemon=True).start()
try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                    args=['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--disable-dev-shm-usage'])
        page = browser.new_page(viewport={'width': 1280, 'height': 720}, device_scale_factor=1)
        page.set_default_timeout(180000)
        page.on('pageerror', lambda e: report['errors'].append(str(e)))
        page.on('console', lambda m: report['errors'].append(m.text) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
        page.add_init_script('globalThis.ATLAS_TEST_PAUSE=true')
        try:
            page.goto(f'http://127.0.0.1:{server.server_port}/{release["artifact"]}', wait_until='load', timeout=180000)
            page.wait_for_function('globalThis.ATLAS||globalThis.ATLAS_BOOT_ERROR', timeout=180000)
            assert not page.evaluate('globalThis.ATLAS_BOOT_ERROR||null'), 'Application boot error'
            page.evaluate("""()=>{Object.assign(ATLAS.state,{motion:false,clock:12.5,labels:false,characters:false,
              weather:'clear',lighting:'neutral',ao:true,bloom:false,reflections:false,uiHidden:true});
              document.body.classList.add('ui-hidden');globalThis.__surveyEvents=[];
              for(const e of ['webglcontextlost','webglcontextrestored'])document.querySelector('#scene').addEventListener(e,()=>__surveyEvents.push(e));
              ATLAS.setView('flowerLink',false);ATLAS.renderOnce();}""")
            page.wait_for_function("!ATLAS.stream.pending&&ATLAS.stream.cache.has('nameless')", polling=250, timeout=180000)
            page.evaluate("()=>{ATLAS.state.detailNeighbors=['sunflower'];ATLAS.stream.focus(['nameless','sunflower']);}")
            page.wait_for_function("!ATLAS.stream.pending&&['nameless','sunflower'].every(id=>ATLAS.stream.cache.has(id))", polling=250, timeout=180000)
            page.evaluate("p=>{const q=document.querySelector('#quality');q.value='balanced';q.dispatchEvent(new Event('change',{bubbles:true}));ATLAS.state.labels=false;ATLAS.state.characters=false;ATLAS.rig.setView(p,false);ATLAS.rig.fov=49;ATLAS.rig.updateMatrices();}", POSE)
            report['browser'] = browser.version
            report['driver'] = page.evaluate('ATLAS.renderer.info().driver')
            report['samples'] = [page.evaluate("""()=>{const A=ATLAS,R=A.renderer;A.renderOnce();R.engine.getContext().finish();
              return{stats:R.info().stats,memory:{...R.engine.info.memory},residentAttributeBytes:R.residentBytes,
                eye:A.rig.eye.slice(),target:A.rig.target.slice(),fov:A.rig.fov,quality:A.state.quality,rendererQuality:R.quality,
                lighting:A.state.lighting,ao:A.state.ao,view:A.state.view,focus:A.state.focus,detailNeighbors:A.state.detailNeighbors,
                stream:A.stream.info(),visibleNativePacks:[...new Set(R.records.filter(r=>r.wanted&&r.item?.mesh.visible&&r.pack!=='overview').map(r=>r.pack))]};}""") for _ in range(3)]
            final = report['samples'][-1]
            assert final['eye'] == POSE['eye'] and final['target'] == POSE['target'] and final['fov'] == 49
            assert final['quality'] == final['rendererQuality'] == 'balanced'
            assert all(k in final['visibleNativePacks'] for k in ['nameless','sunflower']), 'Both native banks must be visible'
            report['sourceContext'] = page.evaluate("""()=>{const R=ATLAS.renderer,p=GA.FLOWERLANDS.paths.find(p=>p.id==='flower-hill-link');
              const roads=R.records.filter(r=>['nameless','sunflower'].includes(r.pack)&&r.data.group==='roads'&&r.data.center[0]<-850&&r.data.center[0]>-1320&&r.data.center[2]>1000&&r.data.center[2]<1400);
              return{link:{id:p.id,width:p.width,region:p.region,points:p.points,samples:p.samples},
                roads:roads.map(r=>({id:r.data.id,pack:r.pack,region:r.data.region,center:r.data.center,level:r.level,wanted:r.wanted,triangles:(r.data.index?.length||r.data.vertices.length/9)/3})),
                linkProjection:p.samples.map(q=>{const y=ATLAS.world.terrain.height(q[0],q[1]);return{xyz:[q[0],y,q[1]],screen:ATLAS.rig.project([q[0],y,q[1]])};})};}""")
            png = OUT/'flowerHillSaddle.png'
            page.locator('#scene').screenshot(path=str(png), timeout=120000)
            report['pngSHA256'] = sha(png)
            report['contextEvents'] = page.evaluate('__surveyEvents.slice()')
            assert not report['errors'], 'JavaScript or shader error'
            assert not report['contextEvents'], 'Unexpected WebGL context event'
            assert not page.evaluate('ATLAS.renderer.engine.getContext().isContextLost()')
            report['passed'] = True
            report['exitCode'] = 0
            print(json.dumps({'png': str(png), 'artifactSHA256': EXPECTED, 'stats': final['stats'], 'visibleNativePacks': final['visibleNativePacks']}, ensure_ascii=False), flush=True)
        finally:
            browser.close()
except BaseException as e:
    report['failure'] = repr(e)
    report['passed'] = False
    report['exitCode'] = 1
    raise
finally:
    report['endedUTC'] = datetime.now(timezone.utc).isoformat()
    report['elapsedSeconds'] = time.monotonic()-began
    report['inputsAfter'] = inputs()
    report['inputsUnchanged'] = report['inputsAfter'] == before
    report['artifactUnchanged'] = sha(artifact) == EXPECTED
    report['sourceHEADAfter'] = subprocess.check_output(['git','rev-parse','HEAD'],cwd=REPO,text=True).strip()
    save()
    server.shutdown()
    assert report['inputsUnchanged'] and report['artifactUnchanged'], 'Input or artifact changed during capture'
