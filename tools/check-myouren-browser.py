"""Bounded Myouren slope evidence with real WebGL and native Blob Workers.

Build first. --collect-only collects the fixed views without the native lifecycle
check. Fixed captures explicitly draw three frames; interaction and reentry use
the application's production scheduler without manual draws or GPU finish().
Software-backend timings and renderer counters are not hardware FPS or VRAM.
"""
import argparse
import hashlib
import json
import threading
import time
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
PUBLIC_IDS = [f'island:terrain:{x}:256{suffix}' for x in (0, 256)
              for suffix in ('', ':far', ':cut', ':cut:far')] + ['island:inspection-walls']
POSES = {'front': {'space': 'surface', 'eye': [352, 151, 295], 'target': [301, 103, 390]},
         'foot': {'space': 'surface', 'eye': [304, 92, 348], 'target': [302, 107, 386]}}
VIEWS = {'myouren': 'myouren', 'front': 'templeAscent', 'foot': 'templeAscent',
         'low': 'myouren', 'night': 'myouren', 'noao': 'myouren', 'rear': 'cemetery',
         'overview': 'diorama', 'cutaway': 'dioramaLayers'}

FRAME_JS = r"""() => {
  const A=ATLAS,R=A.renderer; A.renderOnce(); R.engine.getContext().finish();
  return {stats:R.info().stats,memory:{...R.engine.info.memory},
    residentAttributeBytes:R.residentBytes,programs:R.engine.info.programs.length,
    lost:R.engine.getContext().isContextLost(),eye:A.rig.eye.slice(),target:A.rig.target.slice(),
    fov:A.rig.fov,quality:A.state.quality,rendererQuality:R.quality,lighting:A.state.lighting,
    weather:A.state.weather,ao:A.state.ao,view:A.state.view,cutaway:A.state.cutaway,
    budgetBytes:R.attributeBudget,stream:A.stream.info(),
    wanted:R.records.filter(r=>r.wanted&&r.item?.mesh.visible).map(r=>({id:r.data.id,pack:r.pack,level:r.level})).sort((a,b)=>a.id.localeCompare(b.id))};
}"""

STATE_JS = r"""label => {
 const A=ATLAS,R=A.renderer,E=R.engine,limit=1024,owners=new Map();
 for(const r of R.records) if(r.item&&r.array){
   if(!owners.has(r.array))owners.set(r.array,[]);
   owners.get(r.array).push({id:r.data.id,pack:r.pack,level:r.level,wanted:!!r.wanted});
 }
 const geometry=[];let n=0;
 for(const [a,value]of R.geometryRefs){
   if(n++>=limit)break;
   geometry.push({id:value.geo.id,bytes:value.bytes,refs:value.refs,
     owners:(owners.get(a)||[]).sort((a,b)=>a.id.localeCompare(b.id))});
 }
 const programs=E.info.programs.slice(0,limit).map(p=>({cacheKey:p.cacheKey,id:p.id,
   usedTimes:p.usedTimes,type:p.type,name:p.name})).sort((a,b)=>a.cacheKey.localeCompare(b.cacheKey));
 const wanted=R.records.filter(r=>r.wanted&&r.item?.mesh.visible).map(r=>({id:r.data.id,pack:r.pack,level:r.level})).sort((a,b)=>a.id.localeCompare(b.id));
 return {label,at:performance.now(),testPause:!!globalThis.ATLAS_TEST_PAUSE,
   snapshot:R.captureDiagnostics(label),diagnosticCounters:{...R.info().diagnostics.counters},stats:{...R.info().stats},
   rig:{eye:A.rig.eye.slice(),target:A.rig.target.slice(),fov:A.rig.fov,mode:A.rig.mode},
   drawnFrames:A.state.drawnFrames,clock:A.state.clock,view:A.state.view,
   quality:A.state.quality,rendererQuality:R.quality,cutaway:A.state.cutaway,
   memory:{...E.info.memory},residentAttributeBytes:R.residentBytes,
   detailIds:R.records.filter(r=>r.pack!=='overview').map(r=>r.data.id).sort(),
   publicIds:R.records.filter(r=>r.pack==='overview').map(r=>r.data.id).sort(),wanted,
   geometryInventory:{limit,count:R.geometryRefs.size,complete:R.geometryRefs.size<=limit,entries:geometry},
   programInventory:{limit,count:E.info.programs.length,complete:E.info.programs.length<=limit,entries:programs},
   contextLost:E.getContext().isContextLost(),stream:A.stream.info()};
}"""

SOURCE_JS = r"""async publicIds => {
 const R=ATLAS.renderer,cache=new WeakMap(),hex=b=>Array.from(new Uint8Array(b),v=>v.toString(16).padStart(2,'0')).join('');
 const records=[];
 for(const r of R.records){
   if(r.pack!=='myouren'&&!publicIds.includes(r.data.id))continue;
   const d=r.data,row={id:d.id,pack:r.pack,metadata:{},arrays:{}};
   for(const k of Object.keys(d).sort()){
     if(ArrayBuffer.isView(d[k])){
       const a=d[k];if(!cache.has(a))cache.set(a,crypto.subtle.digest('SHA-256',new Uint8Array(a.buffer,a.byteOffset,a.byteLength)).then(hex));
       row.arrays[k]={type:a.constructor.name,length:a.length,bytes:a.byteLength,sha256:await cache.get(a)};
     }else if(d[k]!==undefined&&typeof d[k]!=='function')row.metadata[k]=JSON.parse(JSON.stringify(d[k]));
   }
   records.push(row);
 }
 return records.sort((a,b)=>a.id.localeCompare(b.id));
}"""


def require(value, message):
    if not value:
        raise AssertionError(message)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dist', type=Path, default=ROOT / 'dist')
    parser.add_argument('--output', type=Path, default=ROOT / 'dist/myouren-browser-check')
    parser.add_argument('--views', default='myouren,front,foot,low,night,noao,rear,overview,cutaway')
    parser.add_argument('--collect-only', action='store_true')
    parser.add_argument('--skip-captures', action='store_true', help='Run only the native interaction/reentry supplement')
    parser.add_argument('--content', action='store_true', help='Explicit memory-document fallback when local HTTP is unavailable')
    parser.add_argument('--chromium', default='/usr/bin/chromium')
    parser.add_argument('--compare-to', type=Path, help='A report.json collected in the same view order and environment')
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    release = json.loads((args.dist / 'release.json').read_text())
    artifact = args.dist / release['artifact']
    html = artifact.read_bytes()
    require(hashlib.sha256(html).hexdigest() == release['sha256'], 'Built HTML SHA mismatch')
    views = args.views.split(',')
    require(views and all(v in VIEWS for v in views), 'Unknown or empty fixed view')
    require(not (args.skip_captures and args.collect_only), 'Skipping captures requires the native regression')
    require(not (args.skip_captures and args.compare_to), 'A cost comparison requires fixed captures')
    report = dict(artifactSHA=release['sha256'], buildInputs=release['inputs'],
                  viewport=[1280, 720], dpr=1, clock=12.5, views=views,
                  hardwareFPSMeasured=False, physicalVRAMMeasured=False,
                  loadMode='complete memory document / native Blob Worker' if args.content else 'local HTTP / native Blob Worker',
                  captureMode='three explicit frames with finish; unchanged production functions',
                  collectionOnly=args.collect_only, capturesSkipped=args.skip_captures,
                  acceptance='Runtime and cost evidence; screenshots require separate art review',
                  frames=[], errors=[], externalErrors=[], contextEvents=[], checks=[])

    def save():
        (args.output / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')

    def check(name, value, data=None):
        report['checks'].append(dict(name=name, passed=bool(value), data=data))
        save()
        require(value, name)

    class Quiet(SimpleHTTPRequestHandler):
        def log_message(self, *_args):
            pass

    server = None
    if not args.content:
        server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=str(args.dist)))
        threading.Thread(target=server.serve_forever, daemon=True).start()
    began = time.monotonic()
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=args.chromium, headless=True,
                                        args=['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--disable-dev-shm-usage'])
            page = browser.new_page(viewport={'width': 1280, 'height': 720}, device_scale_factor=1)
            page.set_default_timeout(120000)
            page.on('pageerror', lambda e: report['errors'].append(str(e)))
            page.on('console', lambda m: report['externalErrors' if 'Failed to load resource' in m.text else 'errors'].append(m.text) if m.type == 'error' else None)
            page.add_init_script("globalThis.ATLAS_TEST_PAUSE=true")
            try:
                if args.content:
                    page.goto('about:blank', wait_until='load')
                    page.set_content(html.decode('utf8'), wait_until='load', timeout=180000)
                else:
                    page.goto(f'http://127.0.0.1:{server.server_port}/{release["artifact"]}', wait_until='load', timeout=180000)
                page.wait_for_function('globalThis.ATLAS||globalThis.ATLAS_BOOT_ERROR', timeout=180000)
                check('Native application booted', not page.evaluate('globalThis.ATLAS_BOOT_ERROR||null'))
                page.evaluate("""()=>{Object.assign(ATLAS.state,{motion:false,clock:12.5,labels:false,characters:false,
                  weather:'clear',lighting:'neutral',ao:true,bloom:false,reflections:false,uiHidden:true});
                  document.body.classList.add('ui-hidden');globalThis.__myourenEvents=[];
                  for(const e of ['webglcontextlost','webglcontextrestored'])document.querySelector('#scene').addEventListener(e,()=>__myourenEvents.push(e));}""")
                report['browser'] = browser.version
                report['driver'] = page.evaluate('ATLAS.renderer.info().driver')
                report['webgl'] = page.evaluate('ATLAS.renderer.info().webgl')

                def guard():
                    report['contextEvents'] = page.evaluate('__myourenEvents.slice()')
                    save()
                    require(not report['errors'], 'JavaScript/shader failure; see errors')
                    require(not report['contextEvents'], 'Unexpected WebGL context event')
                    require(not page.evaluate('ATLAS.renderer.engine.getContext().isContextLost()'), 'WebGL context lost')

                def quality(value):
                    # The actual production onchange sets both GPU and CPU budgets.
                    page.evaluate("q=>{const el=document.querySelector('#quality');el.value=q;el.dispatchEvent(new Event('change',{bubbles:true}));}", value)
                    require(page.evaluate('ATLAS.state.quality===ATLAS.renderer.quality') and
                            page.evaluate('ATLAS.renderer.quality') == value, 'Quality control did not reach the renderer')
                    require(page.evaluate('ATLAS.renderer.attributeBudget') == {'low': 80, 'balanced': 160, 'high': 256}[value] * 1048576,
                            'Wrong native GPU attribute budget')

                for view in ([] if args.skip_captures else views):
                    page.evaluate('v=>{ATLAS.setView(v,false);ATLAS.renderOnce()}', VIEWS[view])
                    page.wait_for_function('!ATLAS.stream.pending&&[...ATLAS.stream.required].every(id=>ATLAS.stream.cache.has(id))', polling=250, timeout=180000)
                    quality('low' if view == 'low' else 'balanced')
                    page.evaluate("v=>{Object.assign(ATLAS.state,{lighting:v==='night'?'night':'neutral',ao:v!=='noao',clock:12.5});}", view)
                    if view in POSES:
                        page.evaluate('p=>ATLAS.rig.setView(p,false)', POSES[view])
                    samples = [page.evaluate(FRAME_JS) for _ in range(3)]
                    guard()
                    file = args.output / (view + '.png')
                    data = page.locator('#scene').screenshot(path=str(file), timeout=120000)
                    report['frames'].append(dict(name=view, samples=samples, file=file.name, sha256=hashlib.sha256(data).hexdigest()))
                    save()
                    print(json.dumps(dict(view=view, totalCalls=samples[-1]['stats']['totalCalls'], totalTriangles=samples[-1]['stats']['totalTriangles'],
                                          residentAttributeBytes=samples[-1]['residentAttributeBytes'], memory=samples[-1]['memory']), ensure_ascii=False), flush=True)
                if args.compare_to:
                    before = json.loads(args.compare_to.read_text())
                    check('Same capture environment and view order',
                          before['viewport'] == report['viewport'] and before['dpr'] == report['dpr'] and
                          before['browser'] == report['browser'] and before['driver'] == report['driver'] and
                          [f['name'] for f in before['frames']] == views)
                    report['performanceComparisons'] = []
                    for old, new in zip(before['frames'], report['frames']):
                        a, b = old['samples'][-1], new['samples'][-1]
                        camera = ['eye', 'target', 'fov', 'quality', 'lighting', 'ao', 'view']
                        check('Same camera/options at ' + new['name'], all(a[k] == b[k] for k in camera))
                        stable_fields = ['totalCalls', 'totalTriangles']
                        check('Two stable settled frame counters at ' + new['name'],
                              all(x['stats'][k] == b['stats'][k] for x in new['samples'][-2:] for k in stable_fields) and
                              all(x['stats'][k] == a['stats'][k] for x in old['samples'][-2:] for k in stable_fields))
                        delta = dict(calls=b['stats']['totalCalls'] - a['stats']['totalCalls'],
                                     triangles=b['stats']['totalTriangles'] - a['stats']['totalTriangles'],
                                     attributeBytes=b['residentAttributeBytes'] - a['residentAttributeBytes'],
                                     geometries=b['memory']['geometries'] - a['memory']['geometries'],
                                     textures=b['memory']['textures'] - a['memory']['textures'],
                                     programs=b['programs'] - a['programs'])
                        report['performanceComparisons'].append(dict(view=new['name'], delta=delta,
                             meaning='Same software backend and settled frame; first sample separately retains invalidated-shadow costs'))
                        check('Slope cost budget at ' + new['name'], delta['calls'] <= 4 and delta['triangles'] <= 4000 and
                              delta['attributeBytes'] <= .6 * 1048576 and delta['textures'] == 0, delta)

                if not args.collect_only:
                    report['nativeRegression'] = dict(productionRAF=True, manualDraws=False, gpuFinish=False,
                                                       cycles=1, longTermLeakTest=False, states=[], comparisons=[])
                    lifecycle = report['nativeRegression']
                    page.evaluate("()=>{globalThis.ATLAS_TEST_PAUSE=false;Object.assign(ATLAS.state,{clock:12.5,motion:false,lighting:'neutral',weather:'clear',ao:true,bloom:false,reflections:false});ATLAS.wake();}")
                    quality('balanced')

                    def visit(view):
                        n = page.evaluate('v=>{const n=ATLAS.state.drawnFrames;ATLAS.setView(v,false);ATLAS.state.labels=false;ATLAS.state.characters=false;return n}', view)
                        page.wait_for_function('p=>ATLAS.state.drawnFrames>p.frames&&ATLAS.renderer.currentOptions.view===p.view&&!ATLAS.rig.transition&&!ATLAS.stream.pending&&[...ATLAS.stream.required].every(id=>ATLAS.stream.cache.has(id))',
                                               arg=dict(frames=n, view=view), polling=100, timeout=180000)
                        guard()

                    def settle():
                        for _ in range(3):
                            n = page.evaluate('()=>{const n=ATLAS.state.drawnFrames;ATLAS.wake();return n}')
                            page.wait_for_function('n=>ATLAS.state.drawnFrames>n', arg=n)

                    def state(label):
                        value = page.evaluate(STATE_JS, label)
                        lifecycle['states'].append(value)
                        guard()
                        require(not value['testPause'], 'Production scheduler unexpectedly paused')
                        require(value['geometryInventory']['complete'] and value['programInventory']['complete'], 'Bounded object inventory overflowed')
                        require(not any(value['diagnosticCounters'].values()), 'Diagnostic context/render/recovery counters are nonzero')
                        save()
                        return value

                    def clear():
                        page.evaluate("()=>{ATLAS.state.uiHidden=false;document.body.classList.remove('ui-hidden');ATLAS.wake()}")
                        page.locator('#btn-settings').click()
                        n = page.evaluate('ATLAS.state.drawnFrames')
                        page.locator('#btn-clear-cache').click()
                        page.locator('#close-settings').click()
                        page.wait_for_function('n=>ATLAS.state.drawnFrames>n&&!ATLAS.stream.pending&&ATLAS.stream.cache.size===0&&ATLAS.renderer.packs.size===0', arg=n)
                        page.evaluate("()=>{ATLAS.state.uiHidden=true;document.body.classList.add('ui-hidden');ATLAS.wake()}")
                        settle()

                    # Warm the real overview before the comparable detail anchor.
                    visit('diorama')
                    clear()
                    visit('myouren')
                    settle()
                    input_before = state('before real input')
                    page.mouse.move(640, 390)
                    page.mouse.down()
                    page.mouse.move(660, 394, steps=4)
                    page.mouse.up()
                    page.wait_for_function('p=>ATLAS.state.drawnFrames>p.drawnFrames&&ATLAS.rig.eye.some((v,i)=>Math.abs(v-p.rig.eye[i])>1e-6)', arg=input_before)
                    orbit = state('real orbit completed')
                    page.mouse.wheel(0, -80)
                    page.wait_for_function('p=>ATLAS.state.drawnFrames>p.drawnFrames&&ATLAS.rig.eye.some((v,i)=>Math.abs(v-p.rig.eye[i])>1e-6)', arg=orbit)
                    state('real wheel completed')
                    check('Mouse orbit and wheel wake the production scheduler', True,
                          'Native events; CPU values retained in state samples and never converted to hardware FPS')
                    visit('myouren')
                    settle()
                    before = state('detail before native unload')
                    source_before = page.evaluate(SOURCE_JS, PUBLIC_IDS)
                    lifecycle['sourceBefore'] = source_before
                    before_png = page.locator('#scene').screenshot(path=str(args.output / 'reentry-before.png'))
                    owned = {entry['id'] for entry in before['geometryInventory']['entries']
                             if entry['owners'] and all(o['pack'] == 'myouren' for o in entry['owners'])}
                    visit('diorama')
                    clear()
                    dropped = state('native cache clear completed')
                    check('Myouren CPU source and detail records removed', dropped['stream']['detailSourceMiB'] == 0 and not dropped['detailIds'])
                    check('All public records survive native unload', before['publicIds'] == dropped['publicIds'])
                    remaining = {entry['id'] for entry in dropped['geometryInventory']['entries']}
                    check('All owned Myouren GPU geometries released', not (owned & remaining), dict(ownedCount=len(owned), retained=sorted(owned & remaining)))
                    visit('myouren')
                    settle()
                    after = state('detail after native reentry')
                    source_after = page.evaluate(SOURCE_JS, PUBLIC_IDS)
                    lifecycle['sourceAfter'] = source_after
                    check('Exact source metadata and array hashes restored', source_before == source_after)
                    check('Camera, wanted IDs and selected LOD restored', before['rig'] == after['rig'] and before['wanted'] == after['wanted'])
                    delta = {key: [before['snapshot']['gpu'][key], after['snapshot']['gpu'][key]]
                             for key in ('geometries', 'textures', 'programs', 'attributeBytes', 'geometryEntries', 'residentObjects')
                             if before['snapshot']['gpu'][key] != after['snapshot']['gpu'][key]}
                    lifecycle['comparisons'].append(dict(label='strict resources after one native reentry', differences=delta))
                    check('Strict comparable resource counters restored', not delta, delta)
                    program_key = lambda p: (p['cacheKey'], p['usedTimes'])
                    check('Program cache keys and references restored',
                          sorted(map(program_key, before['programInventory']['entries'])) == sorted(map(program_key, after['programInventory']['entries'])))
                    after_png = page.locator('#scene').screenshot(path=str(args.output / 'reentry-after.png'))
                    lifecycle['imageRestoration'] = dict(beforeSHA=hashlib.sha256(before_png).hexdigest(), afterSHA=hashlib.sha256(after_png).hexdigest(),
                                                         byteExact=before_png == after_png, meaning='Actual screenshots; hash equality is recorded separately from source/resource assertions')
                    page.wait_for_timeout(500)
                    idle_before = page.evaluate('({frames:ATLAS.state.drawnFrames,clock:ATLAS.state.clock})')
                    page.wait_for_timeout(1000)
                    idle_after = state('one second production idle')
                    check('Static view draws zero frames and keeps paused clock',
                          idle_after['drawnFrames'] == idle_before['frames'] and idle_after['clock'] == idle_before['clock'] == 12.5)
                    lifecycle['passed'] = True
                guard()
                report['passed'] = True
            except BaseException as error:
                report['failure'] = repr(error)
                try:
                    report['failureState'] = page.evaluate(STATE_JS, 'failure')
                    page.locator('#scene').screenshot(path=str(args.output / 'failure.png'), timeout=5000)
                except Exception as diagnostic_error:
                    report['failureDiagnosticError'] = repr(diagnostic_error)
                save()
                raise
            finally:
                report['elapsedSeconds'] = round(time.monotonic() - began, 3)
                save()
                browser.close()
    finally:
        if server:
            server.shutdown()
            server.server_close()


if __name__ == '__main__':
    main()
