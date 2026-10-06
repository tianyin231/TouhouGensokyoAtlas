"""New Muenzuka woodland views: overview warm-up, south-east, north reverse.

Both artifacts must be newly captured with this exact protocol and spec. This is
an observation protocol, not a hardware FPS or parallel CPU speed benchmark.
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

parser = argparse.ArgumentParser(description=__doc__)
for name in ['repo', 'dist', 'output', 'spec']:
    parser.add_argument('--'+name, type=Path, required=True)
parser.add_argument('--expected-sha', required=True)
parser.add_argument('--expected-input-count', type=int, required=True)
parser.add_argument('--variant', choices=['baseline', 'candidate'], required=True)
parser.add_argument('--baseline-report', type=Path)
args = parser.parse_args()
REPO, DIST, OUT, SPEC = [getattr(args,k).resolve() for k in ['repo','dist','output','spec']]
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
PROTOCOL_SHA, SPEC_SHA = sha(Path(__file__)), sha(SPEC)
spec = json.loads(SPEC.read_text())
release = json.loads((DIST/'release.json').read_text())
artifact = DIST/release['artifact']
RELEASE_SHA = sha(DIST/'release.json')
EXPECTED = args.expected_sha
assert sha(artifact) == release['sha256'] == EXPECTED
assert EXPECTED == spec['artifacts'][args.variant]['htmlSHA256']
assert args.expected_input_count == spec['artifacts'][args.variant]['inputCount']
assert sha(Path(spec['originProtocol'])) == spec['originProtocolSHA256']
assert not any(p in release['inputs'] for p in ['src/genbu-entry.js','src/genbu-bank-sections.js'])
assert release['inputs']['src/muenzuka-edge.js'] == spec['acceptedSourceSHA256']
assert release['inputs']['src/muenzuka-edge-renderer.js'] == spec['acceptedRendererSHA256']
if args.variant == 'candidate':
    for name, digest in spec['candidateSources'].items():
        assert release['inputs'][name] == digest
    assert args.baseline_report is not None
else:
    assert 'src/muenzuka-woodland.js' not in release['inputs']
    assert args.baseline_report is None
def inputs():
    assert sha(Path(__file__)) == PROTOCOL_SHA and sha(SPEC) == SPEC_SHA
    assert sha(DIST/'release.json') == RELEASE_SHA
    return {name: sha(REPO/name) for name in release['inputs']}
before = inputs()
assert before == release['inputs'] and len(before) == args.expected_input_count
OUT.mkdir(parents=True, exist_ok=True)
assert not (OUT/'report.json').exists(), 'Preserve earlier execution'
report = {'schema':1, 'purpose':'Newly selected paired woodland views; no historical near-image reuse',
          'variant':args.variant, 'startedUTC':datetime.now(timezone.utc).isoformat(),
          'sourceHEADBefore':subprocess.check_output(['git','rev-parse','HEAD'],cwd=REPO,text=True).strip(),
          'artifactSHA256':EXPECTED, 'releaseSHA256':RELEASE_SHA, 'protocolSHA256':PROTOCOL_SHA,
          'specSHA256':SPEC_SHA, 'inputsBefore':before, 'settings':spec['settings'],
          'sessionOrder':['muenzukaOverview','southEast','northReverse'], 'views':[],
          'warmupSamples':[], 'errors':[], 'httpFailures':[], 'contextEvents':[],
          'cpuLoadOverlap':'May overlap bounded Sol source work. Wall times and CPU samples are not performance comparisons.',
          'hardwareFPSMeasured':False}
began = time.monotonic()
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*_): pass
    def send_error(self,code,message=None,explain=None):
        report['httpFailures'].append({'path':self.path,'status':code})
        super().send_error(code,message,explain)
server = ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(DIST)))
threading.Thread(target=server.serve_forever,daemon=True).start()
sample_js = """targets=>{const A=ATLAS,R=A.renderer,draws=[],restore=[];
  for(const r of R.records)if(r.pack==='muenzuka'&&targets.includes(r.data.id)&&r.item?.mesh){
    const mesh=r.item.mesh,prior=mesh.onBeforeRender;
    mesh.onBeforeRender=function(...args){draws.push({id:r.data.id,level:r.level,instances:r.data.instances.length/16});prior?.apply(this,args)};
    restore.push(()=>mesh.onBeforeRender=prior)}
  try{A.renderOnce();R.engine.getContext().finish()}finally{restore.forEach(f=>f())}
  return {stats:R.info().stats,memory:{...R.engine.info.memory},residentAttributeBytes:R.residentBytes,
    eye:A.rig.eye.slice(),target:A.rig.target.slice(),fov:A.rig.fov,quality:A.state.quality,rendererQuality:R.quality,
    lighting:A.state.lighting,ao:A.state.ao,motion:A.state.motion,clock:A.state.clock,weather:A.state.weather,
    bloom:A.state.bloom,reflections:A.state.reflections,labels:A.state.labels,characters:A.state.characters,
    view:A.state.view,displayMode:A.state.displayMode,focus:A.state.focus,detailNeighbors:A.state.detailNeighbors,
    stream:A.stream.info(),visibleNativePacks:[...new Set(R.records.filter(r=>r.wanted&&r.item?.mesh.visible&&r.pack!=='overview').map(r=>r.pack))],
    targetLevels:R.records.filter(r=>r.pack==='muenzuka'&&targets.includes(r.data.id)).map(r=>({id:r.data.id,level:r.level,wanted:r.wanted,
      objectVisible:r.item?.mesh.visible||false,instances:r.data.instances.length/16})),actualTargetDraws:draws};}"""
def verify(sample, pose):
    assert sample['eye'] == pose['eye'] and sample['target'] == pose['target'] and sample['fov'] == 49
    assert sample['quality'] == sample['rendererQuality'] == 'balanced'
    assert sample['clock'] == 12.5 and sample['weather'] == 'clear' and sample['lighting'] == 'neutral' and sample['ao']
    assert not any(sample[k] for k in ['motion','bloom','reflections','labels','characters'])
    assert 'muenzuka' in sample['visibleNativePacks'] and sample['focus'] == 'muenzuka'
    assert sample['displayMode'] == 'focus' and not sample['detailNeighbors']
def stable(samples):
    return all(samples[-2]['stats'][k] == samples[-1]['stats'][k] for k in ['totalCalls','totalTriangles'])
try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,
            args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader','--disable-dev-shm-usage'])
        page = browser.new_page(viewport={'width':1280,'height':720},device_scale_factor=1)
        page.set_default_timeout(180000)
        page.on('pageerror',lambda e:report['errors'].append(str(e)))
        page.on('console',lambda m:report['errors'].append(m.text) if m.type=='error' and 'Failed to load resource' not in m.text else None)
        page.add_init_script('globalThis.ATLAS_TEST_PAUSE=true')
        try:
            page.goto(f'http://127.0.0.1:{server.server_port}/{release["artifact"]}',wait_until='load',timeout=180000)
            page.wait_for_function('globalThis.ATLAS||globalThis.ATLAS_BOOT_ERROR',timeout=180000)
            assert not page.evaluate('globalThis.ATLAS_BOOT_ERROR||null'), 'Application boot error'
            page.evaluate("""()=>{Object.assign(ATLAS.state,{motion:false,clock:12.5,labels:false,characters:false,
              weather:'clear',lighting:'neutral',ao:true,bloom:false,reflections:false,uiHidden:true});
              document.body.classList.add('ui-hidden');globalThis.__surveyEvents=[];
              for(const e of ['webglcontextlost','webglcontextrestored'])document.querySelector('#scene').addEventListener(e,()=>__surveyEvents.push(e));
              ATLAS.setView('muenzukaOverview',false);ATLAS.state.detailNeighbors=[];ATLAS.stream.focus(['muenzuka']);ATLAS.renderOnce();}""")
            page.wait_for_function("!ATLAS.stream.pending&&ATLAS.stream.cache.has('muenzuka')",polling=250,timeout=180000)
            set_pose = """p=>{const q=document.querySelector('#quality');q.value='balanced';q.dispatchEvent(new Event('change',{bubbles:true}));
              ATLAS.state.labels=false;ATLAS.state.characters=false;ATLAS.rig.setView(p,false);ATLAS.rig.fov=49;ATLAS.rig.updateMatrices();}"""
            page.evaluate(set_pose,spec['warmupPose'])
            report['browser'] = browser.version
            report['driver'] = page.evaluate('ATLAS.renderer.info().driver')
            report['warmupSamples'] = [page.evaluate(sample_js,spec['targetIDs']) for _ in range(3)]
            verify(report['warmupSamples'][-1],spec['warmupPose'])
            assert stable(report['warmupSamples']), 'Original warm-up costs must settle'
            for view in spec['views']:
                page.evaluate(set_pose,view)
                samples = [page.evaluate(sample_js,spec['targetIDs']) for _ in range(3)]
                final = samples[-1]
                verify(final,view)
                assert stable(samples), 'Original steady capture cost assertion'
                assert len(final['targetLevels']) == 10 and sum(r['instances'] for r in final['targetLevels']) == 37
                assert any(r['level']==0 for r in final['actualTargetDraws']), 'New near view must actually submit a target near leaf batch'
                png = OUT/(view['id']+'.png')
                page.locator('#scene').screenshot(path=str(png),timeout=120000)
                report['views'].append({'spec':view,'samples':samples,'final':final,'pngSHA256':sha(png),
                                        'lastTwoCostsStable':True,'nearTargetActuallyDrawn':True})
                print(json.dumps({'view':view['id'],'png':str(png),'stats':final['stats'],'memory':final['memory'],
                                  'attributeBytes':final['residentAttributeBytes'],'actualTargetDraws':final['actualTargetDraws']},ensure_ascii=False),flush=True)
            report['contextEvents'] = page.evaluate('__surveyEvents.slice()')
            assert not report['errors'] and not report['contextEvents']
            assert not page.evaluate('ATLAS.renderer.engine.getContext().isContextLost()')
            if args.variant == 'candidate':
                prior = json.loads(args.baseline_report.read_text())
                report['baselineReportSHA256'] = sha(args.baseline_report)
                assert prior['passed'] and prior['protocolSHA256'] == PROTOCOL_SHA and prior['specSHA256'] == SPEC_SHA
                assert prior['variant'] == 'baseline' and prior['artifactSHA256'] == spec['artifacts']['baseline']['htmlSHA256']
                assert prior['settings'] == report['settings'] and prior['sessionOrder'] == report['sessionOrder']
                comparisons = []
                for a,b in zip(prior['views'],report['views'],strict=True):
                    assert a['spec'] == b['spec']
                    x,y = a['final'],b['final']
                    delta = {'calls':y['stats']['totalCalls']-x['stats']['totalCalls'],
                             'triangles':y['stats']['totalTriangles']-x['stats']['totalTriangles'],
                             'attributeBytes':y['residentAttributeBytes']-x['residentAttributeBytes'],
                             'geometries':y['memory']['geometries']-x['memory']['geometries'],
                             'textures':y['memory']['textures']-x['memory']['textures']}
                    comparisons.append({'view':a['spec']['id'],'delta':delta,
                        'budgetPassed':delta['calls']<=4 and delta['triangles']<=4000 and delta['textures']==0})
                report['comparisons'] = comparisons
                assert all(c['budgetPassed'] for c in comparisons), 'Original same-view cost budget exceeded'
            report['passed'],report['exitCode'] = True,0
        finally:
            browser.close()
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
