"""One authorized native Muenzuka baseline; no source edits or candidate.

The software-GPU capture can overlap Sol's bounded CPU diagnostic. Its wall time
and Worker duration are traceability only, not comparable performance results.
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

REPO = Path('/workspace/TouhouGensokyoAtlas')
DIST = Path('/workspace/sunflower-entry-evidence/final-dist')
OUT = Path('/workspace/muenzuka-evidence/baseline')
EXPECTED = '402224fe67018c0fc33c6820f09d04cdea33b80914a79e62ca54de0e627bf8f8'
POSE = {'space': 'surface', 'eye': [-1533, 221, 789], 'target': [-1710, 79, 565]}
FLOWER = Path('/workspace/flower-hill-refinement')
OUT.mkdir(parents=True, exist_ok=True)
assert not (OUT/'report.json').exists(), 'Keep original evidence'
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
release = json.loads((DIST/'release.json').read_text())
artifact = DIST/release['artifact']
assert sha(artifact) == release['sha256'] == EXPECTED
inputs = lambda: {p: sha(REPO/p) for p in release['inputs']}
before = inputs()
assert before == release['inputs'] and len(before) == 202
frozen = {p: sha(FLOWER/p) for p in ['src/flower-hill-entry.js', 'project.json']}
assert frozen['src/flower-hill-entry.js'] == '87096ff308a83880c2332b79a554ec9edc098bd0f534db52a1fc965934c7114b'
report = {'schema': 1, 'purpose': 'Read-only first native Muenzuka baseline',
          'startedUTC': datetime.now(timezone.utc).isoformat(),
          'sourceHEADBefore': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=REPO, text=True).strip(),
          'artifactSHA256': EXPECTED, 'releaseSHA256': sha(DIST/'release.json'),
          'protocolSHA256': sha(Path(__file__)), 'inputsBefore': before,
          'flowerFrozenBefore': frozen, 'view': 'muenzukaOverview', 'initialPreset': 'muenzukaOverview',
          'pose': POSE, 'viewport': [1280, 720], 'dpr': 1, 'fov': 49, 'clock': 12.5,
          'quality': 'balanced', 'lighting': 'neutral', 'ao': True,
          'productionRegionOrder': ['muenzuka'],
          'cpuLoadOverlap': 'May overlap Sol bounded CPU native diagnostic; no wall-time/Worker speed comparison.',
          'hardwareFPSMeasured': False, 'errors': [], 'httpFailures': [], 'contextEvents': []}
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
    report['flowerFrozenAfter'] = {p:sha(FLOWER/p) for p in frozen}
    report['flowerInputsUnchanged'] = report['flowerFrozenAfter'] == frozen
    report['sourceHEADAfter'] = subprocess.check_output(['git','rev-parse','HEAD'],cwd=REPO,text=True).strip()
    (OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    server.shutdown()
    assert report['inputsUnchanged'] and report['artifactUnchanged'] and report['flowerInputsUnchanged']
