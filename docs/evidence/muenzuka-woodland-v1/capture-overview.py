"""One immutable native Muenzuka overview, baseline or candidate.

The software-GPU capture can overlap Sol's bounded CPU diagnostic. Its wall time
and Worker duration are traceability only, not comparable performance results.
"""
import argparse
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

# Only input/report binding is adapted; the execution body is unchanged.
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--repo', type=Path, required=True)
parser.add_argument('--dist', type=Path, required=True)
parser.add_argument('--output', type=Path, required=True)
parser.add_argument('--expected-sha', required=True)
parser.add_argument('--expected-input-count', type=int, required=True)
parser.add_argument('--label', required=True)
args = parser.parse_args()
REPO, DIST, OUT = args.repo.resolve(), args.dist.resolve(), args.output.resolve()
EXPECTED = args.expected_sha
ORIGINAL_PROTOCOL = Path('/workspace/muenzuka-evidence/capture-bounds-overview.py')
ORIGINAL_PROTOCOL_SHA = '666a3f01c0863ef8c408e352d27c06728192cddbe92d918f448ddb3222d32809'
POSE = {'space': 'surface', 'eye': [-1533, 221, 789], 'target': [-1710, 79, 565]}
OUT.mkdir(parents=True, exist_ok=True)
assert not (OUT/'report.json').exists(), 'Keep original evidence'
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
release = json.loads((DIST/'release.json').read_text())
artifact = DIST/release['artifact']
assert sha(artifact) == release['sha256'] == EXPECTED
assert args.expected_input_count > 0
assert sha(ORIGINAL_PROTOCOL) == ORIGINAL_PROTOCOL_SHA, 'Original declared capture flow changed'
assert not any(p in release['inputs'] for p in ['src/genbu-entry.js','src/genbu-bank-sections.js']), 'Rejected Genbu source is outside this stage'
assert release['inputs']['src/muenzuka-edge.js'] == 'b2ef1b7c4acbc917fcaffba2fadb73ec775fc201e9bdeb0df375fa1680556045'
assert release['inputs']['src/muenzuka-edge-renderer.js'] == '49edfb8f6828894c3691e974b33b7b44560d48b96b7593bde2489734b79803c4'
PROTOCOL_SHA = sha(Path(__file__)); RELEASE_SHA = sha(DIST/'release.json')
original_text = ORIGINAL_PROTOCOL.read_text(); adapted_text = Path(__file__).read_text()
body_marker = '\nclass Quiet('
original_body = original_text[original_text.index(body_marker):]
adapted_body = adapted_text[adapted_text.index(body_marker):]
assert original_body == adapted_body, 'Camera/settings/session/frames/error/input assertions changed'
def inputs():
    assert sha(Path(__file__)) == PROTOCOL_SHA and sha(ORIGINAL_PROTOCOL) == ORIGINAL_PROTOCOL_SHA
    assert sha(DIST/'release.json') == RELEASE_SHA
    return {name: sha(REPO/name) for name in release['inputs']}
before = inputs()
assert before == release['inputs'] and len(before) == args.expected_input_count
report = {'schema': 1, 'purpose': 'Immutable single-view Muenzuka woodland baseline or candidate', 'candidateLabel': args.label,
          'startedUTC': datetime.now(timezone.utc).isoformat(),
          'sourceHEADBefore': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=REPO, text=True).strip(),
          'artifactSHA256': EXPECTED, 'releaseSHA256': sha(DIST/'release.json'),
          'protocolSHA256': sha(Path(__file__)), 'inputsBefore': before,
          'bindingScope': 'Only the declared release inputs; old ce843 overview is a reference and is not a current baseline', 'view': 'muenzukaOverview', 'initialPreset': 'muenzukaOverview',
          'pose': POSE, 'viewport': [1280, 720], 'dpr': 1, 'fov': 49, 'clock': 12.5,
          'quality': 'balanced', 'lighting': 'neutral', 'ao': True,
          'productionRegionOrder': ['muenzuka'],
          'cpuLoadOverlap': 'May overlap Sol bounded CPU native diagnostic; no wall-time/Worker speed comparison.',
          'hardwareFPSMeasured': False, 'errors': [], 'httpFailures': [], 'contextEvents': []}
report['executionParity'] = {'originalProtocolSHA': ORIGINAL_PROTOCOL_SHA, 'adaptedProtocolSHA': PROTOCOL_SHA, 'bodyExact': True, 'baselineReusedFromCe843': False}
began = time.monotonic()
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *_args): pass
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
              ATLAS.setView('muenzukaOverview',false);ATLAS.state.detailNeighbors=[];
              ATLAS.stream.focus(['muenzuka']);ATLAS.renderOnce();}""")
            page.wait_for_function("!ATLAS.stream.pending&&ATLAS.stream.cache.has('muenzuka')", polling=250, timeout=180000)
            page.evaluate("p=>{const q=document.querySelector('#quality');q.value='balanced';q.dispatchEvent(new Event('change',{bubbles:true}));ATLAS.state.labels=false;ATLAS.state.characters=false;ATLAS.rig.setView(p,false);ATLAS.rig.fov=49;ATLAS.rig.updateMatrices();}", POSE)
            report['browser'] = browser.version
            report['driver'] = page.evaluate('ATLAS.renderer.info().driver')
            report['samples'] = [page.evaluate("""()=>{const A=ATLAS,R=A.renderer;A.renderOnce();R.engine.getContext().finish();
              return{stats:R.info().stats,memory:{...R.engine.info.memory},residentAttributeBytes:R.residentBytes,
                eye:A.rig.eye.slice(),target:A.rig.target.slice(),fov:A.rig.fov,quality:A.state.quality,rendererQuality:R.quality,
                lighting:A.state.lighting,ao:A.state.ao,motion:A.state.motion,clock:A.state.clock,weather:A.state.weather,
                bloom:A.state.bloom,reflections:A.state.reflections,labels:A.state.labels,characters:A.state.characters,
                view:A.state.view,focus:A.state.focus,detailNeighbors:A.state.detailNeighbors,stream:A.stream.info(),
                visibleNativePacks:[...new Set(R.records.filter(r=>r.wanted&&r.item?.mesh.visible&&r.pack!=='overview').map(r=>r.pack))]};}""") for _ in range(3)]
            last = report['samples'][-1]
            assert last['eye'] == POSE['eye'] and last['target'] == POSE['target'] and last['fov'] == 49
            assert last['quality'] == last['rendererQuality'] == 'balanced'
            assert 'muenzuka' in last['visibleNativePacks'], 'Native Muenzuka must be visible'
            assert last['clock'] == 12.5 and last['weather'] == 'clear' and last['ao']
            assert not any(last[k] for k in ['motion','bloom','reflections','labels','characters'])
            stableKeys = ['totalCalls','totalTriangles']
            report['lastTwoCostsStable'] = all(report['samples'][-2]['stats'][k] == last['stats'][k] for k in stableKeys)
            assert report['lastTwoCostsStable'], 'Steady capture costs changed'
            report['sourceContext'] = page.evaluate("""()=>{const R=ATLAS.renderer;
              return{paths:GA.WEST.mpaths.map(p=>({id:p.id,width:p.w,points:p.points})),
                publicRoute:GA.ISLAND.allRoutes.filter(p=>p.id==='route-muenzuka').map(p=>({id:p.id,width:p.width,points:p.points})),
                nativeRecords:R.records.filter(r=>r.pack==='muenzuka').map(r=>({id:r.data.id,component:r.data.component,
                  material:r.data.material,group:r.data.group,center:r.data.center,radius:r.data.radius,level:r.level,
                  wanted:r.wanted,visible:r.item?.mesh.visible||false,instances:r.data.instances?.length/16||0,
                  nearTriangles:(r.data.index?.length||r.data.vertices.length/9)/3,farTriangles:r.data.farVertices?.length/27||null}))};}""")
            png = OUT/'muenzukaOverview.png'
            page.locator('#scene').screenshot(path=str(png), timeout=120000)
            report['pngSHA256'] = sha(png)
            report['contextEvents'] = page.evaluate('__surveyEvents.slice()')
            assert not report['errors'] and not report['contextEvents']
            assert not page.evaluate('ATLAS.renderer.engine.getContext().isContextLost()')
            report['passed'], report['exitCode'] = True, 0
            print(json.dumps({'png':str(png),'stats':last['stats'],'memory':last['memory'],'residentAttributeBytes':last['residentAttributeBytes'],'visibleNativePacks':last['visibleNativePacks']},ensure_ascii=False),flush=True)
        finally: browser.close()
except BaseException as e:
    report.update({'failure':repr(e),'passed':False,'exitCode':1})
    raise
finally:
    report['endedUTC'] = datetime.now(timezone.utc).isoformat()
    report['elapsedSeconds'] = time.monotonic()-began
    report['inputsAfter'] = inputs()
    report['inputsUnchanged'] = report['inputsAfter'] == before
    report['artifactUnchanged'] = sha(artifact) == EXPECTED
    report['sourceHEADAfter'] = subprocess.check_output(['git','rev-parse','HEAD'],cwd=REPO,text=True).strip()
    (OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    server.shutdown()
    assert report['inputsUnchanged'] and report['artifactUnchanged']
