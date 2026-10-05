"""One bounded Muenzuka native interaction/unload/reentry cycle, preparation only.

Preparation only until explicitly executed. Production RAF, real pointer/wheel
and cache-clear UI; no manual rendering or GPU finish. Comparison anchors both
age past the existing public retention interval before taking strict snapshots.
"""
import argparse
import hashlib
import importlib.util
import json
import subprocess
import sys
import threading
import time
from datetime import datetime, timezone
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright

SOURCE_PATH = Path(__file__).with_name('native-source-probe.js')
SOURCE_JS = SOURCE_PATH.read_text()
PROFILES = {
    'baseline': dict(inputs=202, html='402224fe67018c0fc33c6820f09d04cdea33b80914a79e62ca54de0e627bf8f8', publicRecords=2154, coldRecords=13, extension=False),
    'candidate': dict(inputs=204, html='ce843445fca81f3e3cef42ac1b58ed16870ba43ed251d23b2e2e4928caf12a97', publicRecords=2156, coldRecords=15, extension=True),
}
HELPER_SHA = 'ec5aa6354922fefc7ce364085ce22504b16d9cb864d5117f2149372b321b1ac4'



def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--variant', choices=PROFILES, required=True)
    parser.add_argument('--repo', type=Path, required=True)
    parser.add_argument('--dist', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    repo, dist, out = args.repo.resolve(), args.dist.resolve(), args.output.resolve()
    out.mkdir(parents=True, exist_ok=True)
    assert not (out / 'report.json').exists(), 'Never overwrite an earlier run'
    release = json.loads((dist / 'release.json').read_text())
    artifact = dist / release['artifact']
    profile = PROFILES[args.variant]
    assert sha(artifact) == release['sha256'] == profile['html']
    assert len(release['inputs']) == profile['inputs']
    source_hashes = lambda: {p: sha(repo / p) for p in release['inputs']}
    inputs_before = source_hashes()
    assert inputs_before == release['inputs']
    helper = repo / 'tools/check-sunflower-browser.py'
    assert sha(helper) == HELPER_SHA
    assert ('src/muenzuka-edge.js' in release['inputs']) == profile['extension']
    assert ('src/muenzuka-edge-renderer.js' in release['inputs']) == profile['extension']
    if profile['extension']:
        assert release['inputs']['src/muenzuka-edge.js'] == 'b2ef1b7c4acbc917fcaffba2fadb73ec775fc201e9bdeb0df375fa1680556045'
        assert release['inputs']['src/muenzuka-edge-renderer.js'] == '49edfb8f6828894c3691e974b33b7b44560d48b96b7593bde2489734b79803c4'
    module_spec = importlib.util.spec_from_file_location('muenzuka_native_common', helper)
    common = importlib.util.module_from_spec(module_spec)
    module_spec.loader.exec_module(common)
    assert common.STATE_JS.count('quality:A.state.quality,') == 1
    state_js = common.STATE_JS.replace('quality:A.state.quality,',
        "detailNeighbors:A.state.detailNeighbors.slice(),rendererPackIds:[...R.packs.keys()].sort(),recordMapNativeIds:[...R.recordMap.values()].filter(r=>r.pack!=='overview').map(r=>r.data.id).sort(),visibleNativePacks:[...new Set(R.records.filter(r=>r.wanted&&r.item?.mesh.visible&&r.pack!=='overview').map(r=>r.pack))],quality:A.state.quality,")
    pose = dict(space='surface', eye=[-1898,106,565], target=[-1775,82,583])
    report = dict(schema=1, kind='Bounded Muenzuka native lifecycle',
        startedUTC=datetime.now(timezone.utc).isoformat(),
        protocolSHA256=sha(Path(__file__)), sourceProbeSHA256=sha(SOURCE_PATH), stateHelperSHA256=sha(helper),
        variant=args.variant, expectedProfile=profile,
        designOrigin='Six-second plus 250ms anchor from prior Flower/Solar protocol only; no prior result is a Muenzuka baseline result.',
        invocation=dict(argv=sys.argv, cwd=str(Path.cwd())),
        sourceHEADBefore=subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip(),
        artifactSHA256=release['sha256'], releaseSHA256=sha(dist/'release.json'), inputsBefore=inputs_before,
        viewport=[1280,720], dpr=1, clock=12.5, fov=49, pose=pose,
        productionRAF=True, manualDraws=False, gpuFinish=False, cycles=1,
        hardwareFPSMeasured=False, physicalVRAMMeasured=False, longTermLeakTest=False,
        cameraFixture=dict(id='muenzukaNativeCheck',region='muenzuka',detailNeighbors=[],requiredRegions=['muenzuka'],pose=pose),
        cameraFixtureMeaning='A test-session-only camera preset uses the real ATLAS.setView path to initialize autoFocus origin and only the required Muenzuka bank; production functions and repository presets are unchanged.',
        anchorProtocol='overview -> actual native-clear UI -> test camera via production setView -> three production wakes -> existing graceSeconds plus250ms -> three production wakes',
        anchorDesign='Both anchors use the same predeclared expiry wait. Read-only source probes retain only hashes/scalars and weak-key tokens. Strict resource/program assertions are retained; no tolerance or source/renderer change.',
        errors=[], httpFailures=[], contextEvents=[], states=[], checks=[])
    started = time.monotonic()

    def save():
        (out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')

    def check(name, passed, data=None):
        report['checks'].append(dict(name=name,passed=bool(passed),data=data))
        save()
        assert passed, name

    class Quiet(SimpleHTTPRequestHandler):
        def log_message(self,*_args):
            pass
        def send_error(self,code,message=None,explain=None):
            report['httpFailures'].append(dict(path=self.path,status=code))
            super().send_error(code,message,explain)

    server = ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(dist)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
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
                page.goto(f'http://127.0.0.1:{server.server_port}/{release["artifact"]}',wait_until='load')
                page.wait_for_function('globalThis.ATLAS||globalThis.ATLAS_BOOT_ERROR')
                check('Actual native application booted',not page.evaluate('globalThis.ATLAS_BOOT_ERROR||null'))
                page.evaluate("""()=>{Object.assign(ATLAS.state,{motion:false,clock:12.5,labels:false,characters:false,weather:'clear',lighting:'neutral',ao:true,bloom:false,reflections:false,uiHidden:true});
                  document.body.classList.add('ui-hidden');globalThis.__muenNativeEvents=[];
                  for(const e of ['webglcontextlost','webglcontextrestored'])document.querySelector('#scene').addEventListener(e,()=>__muenNativeEvents.push(e));
                  const q=document.querySelector('#quality');q.value='balanced';q.dispatchEvent(new Event('change',{bubbles:true}));
                  globalThis.ATLAS_TEST_PAUSE=false;ATLAS.wake();}""")
                report['browser']=browser.version
                report['driver']=page.evaluate('ATLAS.renderer.info().driver')
                page.evaluate("p=>{if(GA.PRESETS.muenzukaNativeCheck)throw Error('Camera fixture collision');GA.PRESETS.muenzukaNativeCheck={...p,label:'Muenzuka native check',region:'muenzuka',detailNeighbors:[],requiredRegions:['muenzuka'],fov:49};}",pose)
                check('Production balanced quality and both memory budgets',page.evaluate("ATLAS.state.quality==='balanced'&&ATLAS.renderer.quality==='balanced'&&ATLAS.renderer.attributeBudget===160*1048576&&ATLAS.stream.budget===220*1048576"))
                grace = page.evaluate('ATLAS.renderer.graceSeconds')
                check('Existing bounded public retention remains six seconds',grace==6,grace)
                report['retentionWaitMs']=int(grace*1000)+250

                def guard():
                    report['contextEvents']=page.evaluate('__muenNativeEvents.slice()')
                    assert not report['errors'] and not report['contextEvents'], 'Application/context error'
                    assert not page.evaluate('ATLAS.renderer.engine.getContext().isContextLost()')

                def settle():
                    for _ in range(3):
                        n=page.evaluate('()=>{const n=ATLAS.state.drawnFrames;ATLAS.wake();return n}')
                        page.wait_for_function('n=>ATLAS.state.drawnFrames>n',arg=n)
                    guard()

                def visit(view):
                    n=page.evaluate('v=>{const n=ATLAS.state.drawnFrames;ATLAS.setView(v,false);ATLAS.state.labels=false;ATLAS.state.characters=false;return n}',view)
                    page.wait_for_function('p=>ATLAS.state.drawnFrames>p.frames&&ATLAS.renderer.currentOptions.view===p.view&&!ATLAS.rig.transition&&!ATLAS.stream.pending&&[...ATLAS.stream.required].every(id=>ATLAS.stream.cache.has(id))',arg=dict(frames=n,view=view),polling=100)
                    guard()

                def detail():
                    visit('muenzukaNativeCheck')
                    settle()

                def mature():
                    page.wait_for_timeout(report['retentionWaitMs'])
                    settle()

                def clear():
                    page.evaluate("()=>{ATLAS.state.uiHidden=false;document.body.classList.remove('ui-hidden');ATLAS.wake()}")
                    page.locator('#btn-settings').click()
                    n=page.evaluate('ATLAS.state.drawnFrames')
                    page.locator('#btn-clear-cache').click()
                    page.locator('#close-settings').click()
                    page.wait_for_function('n=>ATLAS.state.drawnFrames>n&&!ATLAS.stream.pending&&ATLAS.stream.cache.size===0&&ATLAS.renderer.packs.size===0',arg=n)
                    page.evaluate("()=>{ATLAS.state.uiHidden=true;document.body.classList.add('ui-hidden');ATLAS.wake()}")
                    settle()

                def state(label):
                    value=page.evaluate(state_js,label)
                    report['states'].append(value)
                    guard()
                    assert not value['testPause']
                    assert value['geometryInventory']['complete'] and value['programInventory']['complete']
                    assert not any(value['diagnosticCounters'].values())
                    save()
                    return value

                visit('diorama');clear();detail();mature()
                input_before=state('before actual input')
                page.mouse.move(640,390);page.mouse.down();page.mouse.move(660,394,steps=4);page.mouse.up()
                page.wait_for_function('p=>ATLAS.state.drawnFrames>p.drawnFrames&&ATLAS.rig.eye.some((v,i)=>Math.abs(v-p.rig.eye[i])>1e-6)',arg=input_before)
                orbit=state('actual orbit completed')
                page.mouse.wheel(0,-80)
                page.wait_for_function('p=>ATLAS.state.drawnFrames>p.drawnFrames&&ATLAS.rig.eye.some((v,i)=>Math.abs(v-p.rig.eye[i])>1e-6)',arg=orbit)
                state('actual wheel completed')
                check('Actual mouse orbit and wheel wake production RAF',True,'Raw per-event CPU samples remain software-backend observations, not hardware speed claims.')

                visit('diorama');clear();detail();mature()
                before=state('detail before native unload')
                check('Only Muenzuka is required, cached, installed and actually visible',set(before['stream']['required'])==set(before['stream']['cached'])==set(before['rendererPackIds'])==set(before['visibleNativePacks'])=={'muenzuka'} and not before['detailNeighbors'] and before['stream']['detailSourceMiB']>0)
                check('Exact comparison pose',before['rig']['eye']==pose['eye'] and before['rig']['target']==pose['target'] and before['rig']['fov']==49)
                source_before=page.evaluate(SOURCE_JS);report['sourceBefore']=source_before
                counts=source_before['counts']
                check('Complete Muenzuka native, all public and independent cold sources inventoried',
                    counts['nativeRecords']==63 and counts['publicRecords']==profile['publicRecords'] and
                    counts['muenzukaColdRecords']==profile['coldRecords'] and counts['coldOrdinaryTrees']==31,counts)
                private=source_before['privatePrototypes']
                if profile['extension']:
                    check('Both main-thread near and far prototypes already exist, including nonresident near',
                        source_before['privateGetterAlreadyRetained'] and source_before['cullingAvailable'] and
                        len(private)==4 and sum(p['array']['bytes'] for p in private)==287712 and
                        all(not p['residentInGPU'] and not p['publicArrayOwners'] for p in source_before['prototypeResidency'] if p['id'].endswith(':near')),
                        dict(arrays=private,residency=source_before['prototypeResidency']))
                    installed=[x for x in source_before['spheres'] if x['pack']=='muenzuka']
                    check('Six actual native mesh spheres installed by production ensure contain both LODs and all wind phases',
                        len(installed)==6 and all(x['eligible'] and x['resident'] and x['sphere'] and
                        x['actualWindEnvelope']['maximumOutside']<=1e-7 for x in installed),installed)
                else:
                    check('Original baseline has no Muenzuka private prototype or culling extension',
                        not private and not source_before['cullingAvailable'] and not source_before['privateGetterAlreadyRetained'])
                native_backing=[x for x in source_before['backingLedger'] if x['owners'] and all(o.startswith('muenzuka:') for o in x['owners'])]
                check('All native source bytes have explicit bank-only backing ownership',
                    bool(native_backing) and sum(x['bytes'] for x in native_backing)==before['snapshot']['streaming']['sourceBytes'],
                    dict(backings=len(native_backing),inventoriedBytes=sum(x['bytes'] for x in native_backing),managedBytes=before['snapshot']['streaming']['sourceBytes']))
                before_png=page.locator('#scene').screenshot(path=str(out/'reentry-before.png'))
                owned={e['id'] for e in before['geometryInventory']['entries'] if e['owners'] and all(o['pack']=='muenzuka' for o in e['owners'])}
                check('Nonempty exclusively Muenzuka GPU geometry ownership',bool(owned),dict(count=len(owned)))
                visit('diorama');clear();mature()
                dropped=state('native cache cleared')
                check('Native CPU cache, pending task, renderer pack and record maps truly clear',dropped['stream']['detailSourceMiB']==0 and dropped['snapshot']['streaming']['sourceBytes']==0 and not dropped['stream']['cached'] and not dropped['stream']['required'] and not dropped['stream']['building'] and not dropped['rendererPackIds'] and not dropped['recordMapNativeIds'] and not dropped['detailIds'])
                check('All public records survive unload',before['publicIds']==dropped['publicIds'])
                retained=owned & {e['id'] for e in dropped['geometryInventory']['entries']}
                check('All exclusively native GPU geometries are released',not retained,dict(count=len(owned),retained=sorted(retained)))
                dropped_source=page.evaluate(SOURCE_JS);report['sourceWhileUnloaded']=dropped_source
                public_before=[r for r in source_before['records'] if r['pack']=='overview']
                check('All public arrays, metadata and source identities survive unload unchanged',
                    dropped_source['records']==public_before and dropped_source['counts']['nativeRecords']==0 and
                    source_before['dataArrays']==dropped_source['dataArrays'])
                check('Main-thread private near/far buffers survive unload without being counted as native GPU ownership',
                    source_before['privatePrototypes']==dropped_source['privatePrototypes'] and
                    not any(x['owners'] and all(o.startswith('muenzuka:') for o in x['owners']) for x in dropped_source['backingLedger']))
                if profile['extension']:
                    cold_installed=[x for x in dropped_source['spheres'] if x['pack']=='overview' and x['resident']]
                    check('Every resident local cold mesh uses its actual complete wind sphere',
                        all(x['eligible'] and x['sphere'] and x['actualWindEnvelope']['maximumOutside']<=1e-7 for x in cold_installed),
                        dict(residentColdSpheres=cold_installed,unresidentColdIds=[x['id'] for x in dropped_source['spheres'] if x['pack']=='overview' and not x['resident']],
                             meaning='Only actual resident spheres checked here; all cold CPU arrays are checked regardless of residency. Fixed cold view and independent source checks cover the full cold pair.'))
                detail();mature()
                after=state('detail after native reentry')
                source_after=page.evaluate(SOURCE_JS);report['sourceAfter']=source_after
                check('Every native/public source value, public identity and private cache restores exactly',all(source_before[k]==source_after[k] for k in ['records','dataArrays','privatePrototypes','counts','backingLedger']))
                check('Actual sphere values, residency and prototype GPU status restore exactly',source_before['spheres']==source_after['spheres'] and source_before['prototypeResidency']==source_after['prototypeResidency'])
                check('Camera, neighbors, wanted identities and LOD restore',before['rig']==after['rig'] and before['detailNeighbors']==after['detailNeighbors'] and before['wanted']==after['wanted'])
                delta={k:[before['snapshot']['gpu'][k],after['snapshot']['gpu'][k]] for k in ('geometries','textures','programs','attributeBytes','geometryEntries','residentObjects') if before['snapshot']['gpu'][k]!=after['snapshot']['gpu'][k]}
                check('Strict comparable resource counters restore',not delta,delta)
                program_key=lambda p:(p['cacheKey'],p['usedTimes'])
                check('Program keys and reference counts restore',sorted(map(program_key,before['programInventory']['entries']))==sorted(map(program_key,after['programInventory']['entries'])))
                after_png=page.locator('#scene').screenshot(path=str(out/'reentry-after.png'))
                report['imageRestoration']=dict(beforeSHA256=hashlib.sha256(before_png).hexdigest(),afterSHA256=hashlib.sha256(after_png).hexdigest(),byteExact=before_png==after_png)
                check('Exact native reentry image restores',before_png==after_png)
                page.wait_for_timeout(500)
                idle_before=page.evaluate('({frames:ATLAS.state.drawnFrames,clock:ATLAS.state.clock})')
                page.wait_for_timeout(1000)
                idle_after=state('one second idle')
                check('One second static view draws zero frames at paused clock',idle_before['frames']==idle_after['drawnFrames'] and idle_before['clock']==idle_after['clock']==12.5)
                guard();report.update(passed=True,exitCode=0)
            except BaseException as error:
                report.update(passed=False,exitCode=1,failure=repr(error))
                try:
                    report['failureState']=page.evaluate(state_js,'failure')
                    page.locator('#scene').screenshot(path=str(out/'failure.png'),timeout=5000)
                except Exception as diagnostic:
                    report['failureDiagnosticError']=repr(diagnostic)
                raise
            finally:
                browser.close()
    finally:
        report['endedUTC']=datetime.now(timezone.utc).isoformat()
        report['elapsedSeconds']=time.monotonic()-started
        report['inputsAfter']=source_hashes()
        report['inputsUnchanged']=report['inputsAfter']==inputs_before
        report['artifactUnchanged']=sha(artifact)==release['sha256']
        report['protocolUnchanged']=sha(Path(__file__))==report['protocolSHA256']
        report['helperUnchanged']=sha(helper)==report['stateHelperSHA256']
        report['sourceProbeUnchanged']=sha(SOURCE_PATH)==report['sourceProbeSHA256']
        report['sourceHEADAfter']=subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip()
        save();server.shutdown();server.server_close()
        assert all(report[k] for k in ('inputsUnchanged','artifactUnchanged','protocolUnchanged','helperUnchanged','sourceProbeUnchanged'))


if __name__=='__main__':
    main()
