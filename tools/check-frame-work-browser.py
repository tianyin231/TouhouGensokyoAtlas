"""Focused frame-work/UI regression with real HTTP, WebGL2 and native Workers.

Build first. All interactions use the production frame scheduler; neither
renderOnce nor gl.finish/readPixels advances the route. Browser-only wrappers
count work and time production callbacks without adding runtime diagnostics.
The reported times include instrumentation and software-GPU driver overhead;
they are CPU submission/callback timings, not hardware FPS or physical VRAM.

Use --collect-only against an older build to collect a comparison baseline
without requiring it to meet the new reduced-work assertions. --compare-to
also checks visible annotations and association lists against that report.
Fixed camera pixel comparisons belong to a separate visual review.
"""

import argparse
import hashlib
import json
import math
import shutil
import subprocess
import threading
import time
import traceback
from contextlib import contextmanager
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
OPTIONS = {'quality': 'balanced', 'lighting': 'neutral', 'weather': 'clear',
           'clock': 12.5, 'motion': False, 'ao': True, 'bloom': False,
           'reflections': False, 'vegetation': True}
INIT_JS = r"""(() => {
 globalThis.ATLAS_TEST_PAUSE=false;
 const P=globalThis.__frameWorkProbe={phase:null,counts:{},samples:[],events:[],
   inCharacters:0,inTrim:0,inUnderBudgetTrim:0,trimStack:[],lastTimestamp:null,nativeWorkers:[]};
 P.count=k=>{if(P.phase)P.counts[k]=(P.counts[k]||0)+1;};
 const NativeWorker=globalThis.Worker;
 globalThis.Worker=new Proxy(NativeWorker,{construct(target,args){
   const worker=Reflect.construct(target,args);P.nativeWorkers.push({at:performance.now(),
     phase:P.phase,urlScheme:String(args[0]).split(':')[0],native:worker instanceof NativeWorker});
   return worker;
 }});
 const seen=new WeakSet(),getContext=HTMLCanvasElement.prototype.getContext;
 HTMLCanvasElement.prototype.getContext=function(...args){
   if(this.id==='scene'&&/^webgl/.test(args[0])&&!seen.has(this)){
     seen.add(this);for(const type of ['webglcontextlost','webglcontextrestored'])
       this.addEventListener(type,()=>P.events.push({type,phase:P.phase,at:performance.now(),
         view:globalThis.ATLAS?.state.view,frames:globalThis.ATLAS?.state.drawnFrames}));
   }return getContext.apply(this,args);
 };
 const raf=requestAnimationFrame;
 globalThis.requestAnimationFrame=function(callback){
   if(callback.name!=='tick')return raf.call(this,callback);
   return raf.call(this,t=>{
     const phase=P.phase,before=globalThis.ATLAS?.state.drawnFrames,start=performance.now();
     callback(t);
     if(phase&&phase===P.phase){
       const A=ATLAS,drawn=A.state.drawnFrames>before;
       P.samples.push({phase,rafTimestampMs:t,callbackCPUms:performance.now()-start,
         drawn,frames:A.state.drawnFrames,rendererCPUms:drawn?P.lastRenderCPUms:null,
         submittedCPUms:drawn?A.renderer.stats.submittedCPUms:null,
         drawnFrameIntervalMs:drawn&&P.lastTimestamp!==null?t-P.lastTimestamp:null});
       if(drawn)P.lastTimestamp=t;
     }
   });
 };
})();"""

INSTALL_JS = r"""() => {
 const A=ATLAS,R=A.renderer,C=A.characters,P=__frameWorkProbe;
 A.renderOnce=()=>{throw Error('Production regression must not call renderOnce');};
 const wrap=(object,key,before,after)=>{
   const original=object[key];object[key]=function(...args){before?.call(this,args);
     try{return original.apply(this,args);}finally{after?.call(this,args);}};
 };
 wrap(A.rig,'project',()=>P.count(P.inCharacters?'characterProjects':'labelProjects'));
 wrap(C,'update',()=>{P.count('characterUpdates');P.inCharacters++;},()=>P.inCharacters--);
 wrap(GA.DIORAMA,'owner',()=>{if(P.inCharacters)P.count('characterOwnerLookups');});
 wrap(GA.DIORAMA,'point',()=>{if(P.inCharacters)P.count('characterDisplayTransforms');});
 wrap(A.world.terrain,'height',()=>{if(P.inCharacters)P.count('characterTerrainSamples');});
 wrap(R.camera,'updateProjectionMatrix',()=>P.count('mainCameraProjectionUpdates'));
 const originalRender=R.render;
 R.render=function(...args){const started=performance.now();P.count('renders');
   try{return originalRender.apply(this,args);}finally{P.lastRenderCPUms=performance.now()-started;}};
 wrap(R,'trim',args=>{P.inTrim++;const under=!args[0]&&R.residentBytes<=R.attributeBudget;
   P.trimStack.push(under);if(under)P.inUnderBudgetTrim++;},
   ()=>{P.inTrim--;if(P.trimStack.pop())P.inUnderBudgetTrim--;});
 const sort=Array.prototype.sort,some=Array.prototype.some,filter=Array.prototype.filter;
 Array.prototype.sort=function(...args){if(P.inTrim)P.count('trimSorts');
   if(P.inUnderBudgetTrim)P.count('underBudgetTrimSorts');return sort.apply(this,args);};
 Array.prototype.some=function(...args){if(P.inCharacters&&this===C.elements)P.count('characterElementSearches');return some.apply(this,args);};
 Array.prototype.filter=function(...args){if(P.inCharacters&&this===C.occurrences)P.count('characterOccurrenceFilters');return filter.apply(this,args);};
 const gl=R.engine.getContext();
 for(const key of ['finish','readPixels'])wrap(gl,key,()=>{if(P.phase)throw Error('GPU synchronization during production profile: '+key);});
 return {driver:R.info().driver,webgl:R.info().webgl,
   instrumentation:'browser-only RAF/method/array wrappers; identical for baseline and candidate'};
}"""

UI_JS = r"""() => {
 const A=ATLAS,C=A.characters;
 return {view:A.state.view,space:A.state.space,uiHidden:A.state.uiHidden,
   labels:A.state.labels,characters:A.state.characters,
   labelsVisible:[...document.querySelectorAll('#labels .place-label')].filter(e=>!e.hidden)
     .map(e=>({text:e.textContent,left:e.style.left,top:e.style.top})),
   pinsVisible:C.elements.filter(e=>!e.el.hidden).map(e=>({group:e.id,grouped:e.grouped,
     characters:e.cs.map(c=>({id:c.id,occurrence:c.occurrence??null,period:c.period??null})),
     text:e.el.querySelector('.character-pin-label').textContent,
     left:e.el.style.left,top:e.el.style.top,leader:e.el.style.getPropertyValue('--leader'),
     zIndex:e.el.style.zIndex})),
   list:[...document.querySelectorAll('#character-list [data-character-id]')].map(e=>e.dataset.characterId),
   resultCount:document.querySelector('#character-result-count').textContent};
}"""


def require(value, message):
    if not value:
        raise AssertionError(message)


def distribution(values):
    values = sorted(v for v in values if v is not None)
    if not values:
        return {'count': 0}
    def percentile(fraction):
        return values[min(len(values)-1, math.ceil(len(values)*fraction)-1)]
    return {'count': len(values), 'min': values[0], 'median': percentile(.5),
            'p95': percentile(.95), 'max': values[-1]}


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dist', type=Path, default=ROOT/'dist')
    parser.add_argument('--output', type=Path, default=ROOT/'dist/frame-work-browser-check')
    parser.add_argument('--chromium')
    parser.add_argument('--headed', action='store_true')
    parser.add_argument('--collect-only', action='store_true')
    parser.add_argument('--compare-to', type=Path, help='Older output directory containing report.json')
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    dist = args.dist.resolve()
    report = {'passed': False, 'mode': 'real HTTP / native Worker / production RAF',
              'collectOnly': args.collect_only, 'viewport': [1280, 720], 'dpr': 1,
              'options': OPTIONS, 'hardwareFPSMeasured': False, 'physicalVRAMMeasured': False,
              'renderOnceUsed': False, 'gpuSyncUsed': False,
              'timingScope': 'instrumented CPU callbacks and renderer submission; SwiftShader is not hardware FPS',
              'checks': [], 'phases': [], 'uiSnapshots': {}, 'errors': [], 'externalErrors': [],
              'contextEvents': [], 'nativeWorkers': [],
              'toolSHA256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
    server = browser = page = None
    began = time.monotonic()

    def save():
        tmp = args.output/'report.json.tmp'
        tmp.write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
        tmp.replace(args.output/'report.json')

    def passed(name, details=None):
        report['checks'].append({'name': name, 'details': details})
        save()
        print('PASS', name, flush=True)

    def capture_failure():
        if page and not page.is_closed():
            try:
                report['failureState'] = page.evaluate("()=>({events:__frameWorkProbe.events,phase:__frameWorkProbe.phase,counts:__frameWorkProbe.counts,view:globalThis.ATLAS?.state.view,renderer:globalThis.ATLAS?.renderer.info()})")
                report['contextEvents'] = report['failureState']['events']
                page.screenshot(path=str(args.output/'failure.png'), timeout=5000)
            except Exception as capture_error:
                report['failureCaptureError'] = repr(capture_error)

    @contextmanager
    def live_browser():
        # Exit before Playwright stops its event loop, including failure capture.
        nonlocal browser
        try:
            yield
        except Exception:
            capture_failure()
            raise
        finally:
            if browser and browser.is_connected():
                browser.close()
            browser = None

    try:
        raw = (dist/'release.json').read_bytes()
        release = json.loads(raw)
        artifact = dist/release['artifact']
        require(hashlib.sha256(artifact.read_bytes()).hexdigest() == release['sha256'], 'Artifact SHA mismatch')
        for name, digest in release['inputs'].items():
            require(hashlib.sha256((dist.parent/name).read_bytes()).hexdigest() == digest, 'Stale build input: '+name)
        commit = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=dist.parent, capture_output=True, text=True)
        report.update(artifact=str(artifact), sha256=release['sha256'], buildInputs=release['inputs'],
                      releaseSha256=hashlib.sha256(raw).hexdigest(), sourceCommit=commit.stdout.strip())
        save()
        server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(dist)))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        from playwright.sync_api import sync_playwright
        with sync_playwright() as pw, live_browser():
            launch = {'headless': not args.headed, 'args': ['--no-sandbox', '--enable-unsafe-swiftshader',
                      '--use-angle=swiftshader', '--disable-dev-shm-usage']}
            executable = args.chromium or shutil.which('chromium')
            if executable:
                launch['executable_path'] = executable
            browser = pw.chromium.launch(**launch)
            page = browser.new_page(viewport={'width': 1280, 'height': 720}, device_scale_factor=1)
            page.set_default_timeout(90000)
            page.on('pageerror', lambda e: report['errors'].append(str(e)))
            page.on('crash', lambda *_: report['errors'].append('Chromium page crashed'))
            page.on('console', lambda m: (report['externalErrors'] if 'Failed to load resource' in m.text
                    else report['errors']).append(m.text) if m.type == 'error' else None)
            page.add_init_script(INIT_JS)
            page.goto(f'http://127.0.0.1:{server.server_port}/{quote(release["artifact"])}', wait_until='load')
            page.wait_for_function('globalThis.ATLAS || globalThis.ATLAS_BOOT_ERROR')
            require(not page.evaluate('globalThis.ATLAS_BOOT_ERROR || null'), 'Atlas startup failed')
            report['browser'] = browser.version
            report['probe'] = page.evaluate(INSTALL_JS)
            require(page.evaluate('ATLAS.renderer.engine.getContext() instanceof WebGL2RenderingContext'),
                    'A real WebGL2 context is required')

            def guard():
                events = page.evaluate('__frameWorkProbe.events')
                report['contextEvents'] = events
                report['nativeWorkers'] = page.evaluate('__frameWorkProbe.nativeWorkers')
                require(not events, 'Unexpected WebGL context event')
                require(not report['errors'], 'JavaScript/shader error: '+repr(report['errors']))
                require(not page.evaluate('ATLAS.renderer.engine.getContext().isContextLost()'), 'Lost WebGL context')
                require(not page.evaluate('!!globalThis.ATLAS_TEST_PAUSE'), 'Production scheduler was paused')

            def wait_draw(before):
                page.wait_for_function('n=>ATLAS.state.drawnFrames>n', arg=before, polling=100)
                guard()

            def wake():
                before = page.evaluate('()=>{const n=ATLAS.state.drawnFrames;ATLAS.wake();return n;}')
                wait_draw(before)

            def wait_view(view):
                page.wait_for_function('v=>ATLAS.state.view===v && ATLAS.renderer.currentOptions.view===v && '
                    '!ATLAS.rig.transition && !ATLAS.stream.pending && '
                    '[...ATLAS.stream.required].every(id=>ATLAS.stream.cache.has(id))', arg=view, polling=100)
                wake()

            def checkboxes(changes):
                page.locator('#btn-settings').click()
                for key, value in changes.items():
                    page.locator('#opt-'+key).set_checked(value)
                page.locator('#close-settings').click()
                wake()

            def snapshot(name):
                wake()
                value = page.evaluate(UI_JS)
                report['uiSnapshots'][name] = value
                save()
                return value

            def begin_phase(name):
                page.evaluate("name=>{const P=__frameWorkProbe;P.phase=name;P.counts={};P.samples=[];P.lastTimestamp=null;}", name)

            def end_phase():
                value = page.evaluate("()=>{const P=__frameWorkProbe,v={name:P.phase,counts:{...P.counts},samples:P.samples.slice()};P.phase=null;return v;}")
                drawn = [x for x in value['samples'] if x['drawn']]
                value['drawnFrames'] = len(drawn)
                value['timings'] = {key: distribution([x[key] for x in drawn]) for key in
                    ['callbackCPUms', 'rendererCPUms', 'submittedCPUms', 'drawnFrameIntervalMs']}
                value['workPerDrawnFrame'] = {k: v/len(drawn) for k, v in value['counts'].items()} if drawn else {}
                value['state'] = page.evaluate("()=>({view:ATLAS.state.view,quality:ATLAS.state.quality,"
                    "labels:ATLAS.state.labels,characters:ATLAS.state.characters,uiHidden:ATLAS.state.uiHidden,"
                    "residentAttributeBytes:ATLAS.renderer.residentBytes,attributeBudget:ATLAS.renderer.attributeBudget})")
                report['phases'].append(value)
                require(len(drawn) >= 3, 'Insufficient production frames: '+value['name'])
                guard()
                save()
                print('PROFILE', value['name'], value['drawnFrames'], value['counts'], flush=True)
                return value

            def drag(name):
                before = page.evaluate('ATLAS.rig.eye.slice()')
                page.mouse.move(680, 365)
                begin_phase(name)
                page.mouse.down()
                for index in range(12):
                    n = page.evaluate('ATLAS.state.drawnFrames')
                    page.mouse.move(685+index*4, 367+(index%5)*3)
                    wait_draw(n)
                page.mouse.up()
                result = end_phase()
                require(before != page.evaluate('ATLAS.rig.eye.slice()'), 'Actual pointer drag did not change camera')
                return result

            # Real controls establish the common measurement configuration.
            checkboxes({'motion': False, 'bloom': False, 'reflections': False,
                        'labels': False, 'characters': False})
            page.evaluate('()=>{ATLAS.state.clock=12.5;ATLAS.wake();}')
            wake()
            disabled = drag('overview-disabled-drag')
            checkboxes({'labels': True, 'characters': True})
            page.evaluate("ATLAS.setView('diorama',false)")
            wait_view('diorama')
            visible = snapshot('overview-enabled')
            require(visible['labelsVisible'] and visible['pinsVisible'], 'Enabled overview annotations are absent')
            index = page.evaluate('()=>ATLAS.characters.elements.findIndex(e=>e.grouped&&e.cs.length>1&&!e.el.hidden)')
            require(index >= 0, 'No visible association group')
            page.locator('#character-pins .character-pin').nth(index).click()
            group = page.evaluate('ATLAS.characters.group')
            actual = page.locator('#character-list [data-character-id]').evaluate_all('els=>els.map(e=>e.dataset.characterId)')
            expected = page.evaluate("group=>ATLAS.characters.data.filter(c=>c.locationId===group||(c.visits||[]).some(v=>v.locationId===group)).map(c=>c.id)", group)
            require(actual == expected and len(actual) >= 2, 'Association group list differs')
            report['associationGroup'] = {'location': group, 'characters': actual}
            page.locator('#characters-all').click()
            all_count = page.locator('#character-list [data-character-id]').count()
            require(all_count == page.evaluate('ATLAS.characters.data.length'), 'All-character catalogue lost entries')
            page.locator('#character-search').fill('博丽灵梦')
            require(page.locator('#character-list [data-character-id="reimu"]').count() == 1, 'Character search failed')
            page.locator('#characters-all').click()
            page.locator('#close-characters').click()
            passed('Real association group, all-character list and character search', report['associationGroup'])
            page.locator('#scene').focus()
            page.keyboard.press('Tab')
            hidden = snapshot('overview-hidden')
            require(hidden['uiHidden'] and not hidden['labelsVisible'] and not hidden['pinsVisible'], 'Tab failed to hide all annotations')
            hidden_drag = drag('overview-hidden-drag')
            begin_phase('overview-hidden-zoom')
            radius = page.evaluate('ATLAS.rig.radius')
            for delta in [25, 25, 25, 25, -25, -25]:
                n = page.evaluate('ATLAS.state.drawnFrames')
                page.mouse.wheel(0, delta)
                wait_draw(n)
            zoom = end_phase()
            require(radius != page.evaluate('ATLAS.rig.radius'), 'Actual wheel input did not zoom')
            begin_phase('fixed-camera-wakes')
            for _ in range(3):
                wake()
            fixed = end_phase()
            page.locator('#scene').focus()
            page.keyboard.press('Tab')
            page.evaluate("ATLAS.setView('diorama',false)")
            wait_view('diorama')
            restored = snapshot('overview-restored')
            require(restored == visible, 'UI annotation positions/content did not restore')
            passed('Real labels/characters enable, Tab hide and restore; pointer orbit and wheel zoom')
            checkboxes({'labels': False, 'characters': False})
            off = snapshot('overview-disabled')
            require(not off['labelsVisible'] and not off['pinsVisible'], 'Disabled annotations remained visible')

            # Six positions on the existing public approach, each drawn normally.
            worker_count = page.evaluate('__frameWorkProbe.nativeWorkers.length')
            page.locator('#region-select').select_option('forest')
            page.wait_for_function("ATLAS.state.focus==='forest'")
            page.locator('#view-buttons [data-view="kourindouFront"]').click()
            wait_view('kourindouFront')
            workers = page.evaluate('n=>__frameWorkProbe.nativeWorkers.slice(n)', worker_count)
            require(workers and all(w['native'] and w['urlScheme'] == 'blob' for w in workers),
                    'Cold forest detail did not use a real native Blob Worker')
            route = page.evaluate("GA.FOREST.paths[0].samples.filter(p=>p[0]>-642&&p[0]<-541).filter((p,i)=>i%2===0)")
            require(len(route) == 14, 'Inherited route changed')
            positions = [route[index] for index in (0, 2, 5, 8, 11, 13)]
            road = []
            begin_phase('forest-route')
            for point in positions:
                before = page.evaluate('ATLAS.state.drawnFrames')
                requested = page.evaluate("p=>{const A=ATLAS,y=GA.SurfaceContact.sampler(A.data,'kourindou').height(...p),eye=[p[0]-2,y+7,p[1]+6],target=[p[0]+8,y+1,p[1]-2];A.rig.setView({space:'surface',eye,target},false);A.wake();return{eye,target};}", point)
                page.wait_for_function('p=>ATLAS.state.drawnFrames>p.before && ATLAS.renderer.camera.position.toArray().every((v,i)=>Math.abs(v-p.eye[i])<1e-7)', arg={**requested, 'before': before}, polling=100)
                state = page.evaluate("()=>({target:ATLAS.rig.target.slice(),stats:ATLAS.renderer.info().stats,roads:ATLAS.renderer.records.filter(r=>r.wanted&&r.item?.mesh.visible&&r.data.globalSurface&&r.data.component==='connection-road').map(r=>r.data.id).sort()})")
                require(state['target'] == requested['target'] and state['roads'], 'Public route/camera was not preserved')
                road.append({'point': point, **requested, **state})
            end_phase()
            passed('Six consecutive public-route positions via production frames', road)

            checkboxes({'characters': True})
            page.locator('#region-select').select_option('scarlet')
            wait_view('scarlet')
            snapshot('scarlet-far-group')
            page.locator('#view-buttons [data-view="scarletGarden"]').click()
            wait_view('scarletGarden')
            near = snapshot('scarlet-near-members')
            require(any(not p['grouped'] for p in near['pinsVisible']), 'Near association members are absent')
            passed('Real region selector and near/far character grouping')
            page.locator('#btn-backdoor').click()
            wait_view('backdoorOverview')
            snapshot('backdoor-hall')
            page.locator('[data-backdoor-view="backdoorSix"]').click()
            wait_view('backdoorSix')
            six = snapshot('backdoor-six')
            require(not any(c['period'] == 'backdoor_dancer' for p in six['pinsVisible'] for c in p['characters']), 'Sixth-stage selection retained dancer markers')
            page.locator('[data-backdoor-view="backdoorExtra"]').click()
            wait_view('backdoorExtra')
            snapshot('backdoor-extra')
            page.locator('[data-backdoor-view="diorama"]').click()
            wait_view('diorama')
            snapshot('return-surface')
            passed('Real independent-space selections filter annotations and return to the surface')
            checkboxes({'motion': False, 'labels': False, 'characters': False})
            page.wait_for_timeout(300)
            n = page.evaluate('ATLAS.state.drawnFrames')
            page.wait_for_timeout(600)
            idle = page.evaluate('ATLAS.state.drawnFrames')-n
            require(idle <= 1, 'Static production view continued drawing')
            passed('Static production view sleeps', {'additionalDraws': idle})

            if not args.collect_only:
                for phase in (disabled, hidden_drag, zoom, fixed):
                    counts = phase['counts']
                    require(counts.get('labelProjects', 0) == 0, 'Hidden/disabled labels still project: '+phase['name'])
                    for key in ['characterOwnerLookups', 'characterProjects', 'characterTerrainSamples',
                                'characterElementSearches', 'characterOccurrenceFilters']:
                        require(counts.get(key, 0) == 0, 'Inactive character work '+key+': '+phase['name'])
                    require(counts.get('underBudgetTrimSorts', 0) == 0, 'Unnecessary under-budget eviction sort')
                require(fixed['counts'].get('mainCameraProjectionUpdates', 0) == 0,
                        'Unchanged camera recomputed its projection matrix')
                passed('Inactive annotations do no projection/association/terrain work; unchanged projection and under-budget trim avoid repeated work')
            if args.compare_to:
                base = json.loads((args.compare_to/'report.json').read_text(encoding='utf-8'))
                require(base['passed'] and base['options'] == report['options'] and base['browser'] == report['browser'], 'Incompatible baseline')
                require(base['toolSHA256'] == report['toolSHA256'], 'Baseline used a different test protocol')
                require(base['uiSnapshots'] == report['uiSnapshots'], 'Visible annotation or catalogue output changed from baseline')
                require(base['associationGroup'] == report['associationGroup'], 'Association group changed from baseline')
                comparisons = []
                for phase in report['phases']:
                    old = next(p for p in base['phases'] if p['name'] == phase['name'])
                    comparisons.append({'phase': phase['name'], 'baselineWorkPerDrawnFrame': old['workPerDrawnFrame'],
                                        'candidateWorkPerDrawnFrame': phase['workPerDrawnFrame'],
                                        'baselineTimings': old['timings'], 'candidateTimings': phase['timings']})
                report['comparison'] = {'baselineSHA': base['sha256'], 'uiEqual': True, 'phases': comparisons}
                passed('Visible annotation positions/content and character association lists equal the frozen baseline')
            guard()
            require(hashlib.sha256((dist/'release.json').read_bytes()).hexdigest() == report['releaseSha256'], 'Release changed during check')
            require(hashlib.sha256(artifact.read_bytes()).hexdigest() == release['sha256'], 'Artifact changed during check')
            for name, digest in release['inputs'].items():
                require(hashlib.sha256((dist.parent/name).read_bytes()).hexdigest() == digest, 'Input changed during check: '+name)
            report['passed'] = True
    except Exception as exc:
        report['passed'] = False
        report['failure'] = repr(exc)
        traceback.print_exc()
    finally:
        if server:
            server.shutdown()
            server.server_close()
        report['elapsedSeconds'] = round(time.monotonic()-began, 3)
        save()
    return 0 if report['passed'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
