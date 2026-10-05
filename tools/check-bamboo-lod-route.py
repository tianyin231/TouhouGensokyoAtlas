"""One bounded, original-road LOD traversal using the production scheduler.

No FPS claim, renderer patch, test-only LOD reset or manual draw during travel.
The route is supplied as measured camera data, with two interpolation steps
between adjacent original road points. Selected raw WebGL frames are retained.
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

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--dist', type=Path, required=True)
p.add_argument('--output', type=Path, required=True)
p.add_argument('--route', type=Path, required=True)
a = p.parse_args()
a.output.mkdir(parents=True, exist_ok=True)
release = json.loads((a.dist/'release.json').read_text())
route = json.loads(a.route.read_text())
artifact = a.dist/release['artifact']
assert hashlib.sha256(artifact.read_bytes()).hexdigest() == release['sha256']
report = dict(artifactSHA=release['sha256'], routeSHA=hashlib.sha256(a.route.read_bytes()).hexdigest(),
              protocolSHA=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
              viewport=[1280,720], dpr=1, quality='balanced', clock=12.5,
              productionRAF=True, manualDrawsDuringTravel=False, hardwareFPSMeasured=False,
              note='CPU submitted samples are not input-handler latency or hardware FPS',
              frames=[], images=[], checks=[], errors=[], externalErrors=[], httpFailures=[], contextEvents=[])
def save():
    (a.output/'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
def check(name, result):
    report['checks'].append(dict(name=name, passed=bool(result)))
    save()
    assert result, name
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *_): pass
    def send_error(self, code, message=None, explain=None):
        report['httpFailures'].append(dict(path=self.path,status=code))
        super().send_error(code,message,explain)
server = ThreadingHTTPServer(('127.0.0.1',0), partial(Quiet,directory=str(a.dist)))
threading.Thread(target=server.serve_forever,daemon=True).start()
began=time.monotonic()
try:
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,
                                  args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader','--disable-dev-shm-usage'])
        page=browser.new_page(viewport={'width':1280,'height':720},device_scale_factor=1)
        page.set_default_timeout(120000)
        page.on('pageerror',lambda e:report['errors'].append(str(e)))
        page.on('console',lambda m:report['externalErrors' if 'Failed to load resource' in m.text else 'errors'].append(m.text) if m.type=='error' else None)
        page.add_init_script('globalThis.ATLAS_TEST_PAUSE=true')
        try:
            page.goto(f'http://127.0.0.1:{server.server_port}/{release["artifact"]}',wait_until='load',timeout=180000)
            page.wait_for_function('globalThis.ATLAS||globalThis.ATLAS_BOOT_ERROR',timeout=180000)
            check('Native application booted',not page.evaluate('globalThis.ATLAS_BOOT_ERROR||null'))
            page.evaluate("""()=>{const A=ATLAS;Object.assign(A.state,{motion:false,clock:12.5,labels:false,characters:false,
                quality:'balanced',weather:'clear',lighting:'neutral',ao:true,bloom:false,reflections:false,uiHidden:true});
                document.body.classList.add('ui-hidden');globalThis.__routeEvents=[];
                for(const e of ['webglcontextlost','webglcontextrestored'])document.querySelector('#scene').addEventListener(e,()=>__routeEvents.push(e));
                const q=document.querySelector('#quality');q.value='balanced';q.dispatchEvent(new Event('change',{bubbles:true}));
                A.setView('bambooEntry',false);A.renderOnce();}""")
            page.wait_for_function("!ATLAS.stream.pending&&ATLAS.stream.cache.has('bamboo')",polling=100,timeout=180000)
            report['browser']=browser.version
            report['driver']=page.evaluate('ATLAS.renderer.info().driver')
            page.evaluate('()=>{globalThis.ATLAS_TEST_PAUSE=false;ATLAS.wake()}')
            key=set(route['keyFrames'].values())
            previous=None
            for ordinal,pose in enumerate(route['frames']):
                samples=[pose['eye']] if previous is None else [[(x+y)/2 for x,y in zip(previous,pose['eye'])],pose['eye']]
                for substep,eye in enumerate(samples):
                    n=page.evaluate("p=>{const A=ATLAS,n=A.state.drawnFrames;A.rig.setView({space:'surface',eye:p.eye,target:p.target,fov:p.fov},false);A.wake();return n}",dict(eye=eye,target=pose['target'],fov=pose['fov']))
                    page.wait_for_function('n=>ATLAS.state.drawnFrames>n&&!ATLAS.stream.pending&&!ATLAS.rig.transition',arg=n,polling=50)
                    state=page.evaluate("""()=>{const A=ATLAS,R=A.renderer;return {eye:A.rig.eye.slice(),target:A.rig.target.slice(),fov:A.rig.fov,
                      testPause:!!globalThis.ATLAS_TEST_PAUSE,drawnFrames:A.state.drawnFrames,clock:A.state.clock,
                      quality:A.state.quality,rendererQuality:R.quality,stats:{...R.info().stats},
                      memory:{...R.engine.info.memory},residentAttributeBytes:R.residentBytes,
                      lost:R.engine.getContext().isContextLost(),events:__routeEvents.slice(),
                      targets:R.records.filter(r=>/^bamboo:(stem|leaf):[012]:4:8$/.test(r.data.id)).map(r=>({id:r.data.id,level:r.level,
                      distance:Math.hypot(...r.data.center.map((v,k)=>v-A.rig.eye[k])),wanted:!!r.wanted,visible:!!r.item?.mesh.visible})).sort((a,b)=>a.id.localeCompare(b.id))};}""")
                    report['contextEvents']=state['events']
                    state.update(ordinal=ordinal,substep=substep,pathSample=pose['pathSample'])
                    report['frames'].append(state)
                    check('Production route state '+str(ordinal)+'/'+str(substep),not state['testPause'] and not state['lost'] and not state['events'] and not report['errors'] and state['quality']==state['rendererQuality']=='balanced' and state['clock']==12.5 and len(state['targets'])==6)
                    if substep==len(samples)-1 and ordinal in key:
                        path=a.output/('route-'+str(ordinal).zfill(2)+'.png')
                        data=page.locator('#scene').screenshot(path=str(path))
                        report['images'].append(dict(ordinal=ordinal,file=path.name,sha256=hashlib.sha256(data).hexdigest()))
                        print(json.dumps(dict(ordinal=ordinal,levels=[r['level'] for r in state['targets']],calls=state['stats']['totalCalls'],triangles=state['stats']['totalTriangles'])),flush=True)
                previous=pose['eye']
            endpoints={i:next(f for f in reversed(report['frames']) if f['ordinal']==i) for i in key}
            for name,level in [('startNear',0),('allFar',1),('stillFarInbound',1),('allNearInbound',0),('endNear',0)]:
                check('Observed expected LOD at '+name,all(r['level']==level for r in endpoints[route['keyFrames'][name]]['targets']))
            check('No application errors or context events',not report['errors'] and not report['contextEvents'])
            report['passed']=True
        except BaseException as e:
            report['failure']=repr(e)
            raise
        finally:
            report['elapsedSeconds']=time.monotonic()-began
            save()
            browser.close()
finally:
    server.shutdown()
    server.server_close()
