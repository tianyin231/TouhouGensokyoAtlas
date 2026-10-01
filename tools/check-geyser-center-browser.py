"""Geyser Center regression with real WebGL and native Blob Workers.
HTTP is the default; --content is an explicitly reported memory-document fallback.
Fixed inspection pictures use renderOnce. Production controls, path traversal,
idle, quality and resize segments do not. Any recorded context loss fails the run.
No real-GPU FPS, physical elevator ride, fluid or player collision claim.
"""
import argparse
import hashlib
import json
import threading
import traceback
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
COVERAGE = json.loads((ROOT / 'tools/current-coverage.json').read_text())
p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--content', action='store_true')
p.add_argument('--headed', action='store_true')
p.add_argument('--chromium')
p.add_argument('--output', type=Path, default=ROOT / 'dist/geyser-center-browser-check')
a = p.parse_args()
a.output.mkdir(parents=True, exist_ok=True)
release = json.loads((ROOT / 'dist/release.json').read_text())
html = (ROOT / 'dist' / release['artifact']).read_bytes()
assert hashlib.sha256(html).hexdigest() == release['sha256']
r = {'sha256': release['sha256'], 'loadMode': 'complete memory document / native Blob Worker' if a.content else 'local HTTP',
     'viewport': [1280, 720], 'dpr': 1, 'quality': 'balanced', 'weather': 'clear', 'lighting': 'neutral',
     'clock': 0, 'ao': True, 'bloom': False, 'reflections': False, 'hardwareFPSMeasured': False,
     'checks': [], 'views': {}, 'errors': [], 'externalErrors': [], 'contextEvents': []}
server = None
page = None

def save():
    (a.output / 'report.json').write_text(json.dumps(r, ensure_ascii=False, indent=2) + '\n')

def passed(name, data=None):
    r['checks'].append({'name': name, 'data': data})
    save()
    print('PASS', name, flush=True)

try:
    if not a.content:
        server = ThreadingHTTPServer(('127.0.0.1', 0), partial(SimpleHTTPRequestHandler, directory=str(ROOT / 'dist')))
        threading.Thread(target=server.serve_forever, daemon=True).start()
    with sync_playwright() as pw:
        launch = {'headless': not a.headed, 'args': ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage']}
        if a.chromium:
            launch['executable_path'] = a.chromium
        browser = pw.chromium.launch(**launch)
        page = browser.new_page(viewport={'width': 1280, 'height': 720}, device_scale_factor=1)
        page.set_default_timeout(90000)
        page.on('pageerror', lambda e: r['errors'].append(str(e)))
        page.on('console', lambda m: (r['externalErrors'] if 'Failed to load resource' in m.text else r['errors']).append(m.text) if m.type == 'error' else None)
        page.add_init_script('globalThis.ATLAS_TEST_PAUSE=true;')
        if a.content:
            page.evaluate('globalThis.ATLAS_TEST_PAUSE=true')
            page.set_content(html.decode(), wait_until='load')
        else:
            page.goto(f'http://127.0.0.1:{server.server_port}/{release["artifact"]}', wait_until='load')
        page.wait_for_function('globalThis.ATLAS||globalThis.ATLAS_BOOT_ERROR')
        assert not page.evaluate('globalThis.ATLAS_BOOT_ERROR||null')
        page.evaluate("""()=>{globalThis.centerEvents=[];
          for(const event of ['webglcontextlost','webglcontextrestored'])document.querySelector('#scene').addEventListener(event,
            ()=>centerEvents.push({event,view:ATLAS.state.view,quality:ATLAS.state.quality,time:performance.now()}));} """)
        r['browser'] = browser.version
        r['webgl'] = page.evaluate("()=>{const g=ATLAS.renderer.engine.getContext(),e=g.getExtension('WEBGL_debug_renderer_info');return e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):g.getParameter(g.RENDERER)}")
        page.evaluate("Object.assign(ATLAS.state,{motion:false,clock:0,labels:false,characters:false,quality:'balanced',weather:'clear',lighting:'neutral',ao:true,bloom:false,reflections:false})")
        assert page.evaluate('ATLAS.stream.cache.size') == 0
        assert page.evaluate("ATLAS.world.meshes.some(m=>m.owner==='geyser_center'&&m.overview)&&!ATLAS.world.meshes.some(m=>m.owner==='geyser_center'&&!m.overview)")
        passed('Cold start has only lightweight center proxies and permanent approach')

        def draw():
            return page.evaluate("()=>{ATLAS.state.labels=false;ATLAS.state.characters=false;ATLAS.renderOnce();return ATLAS.renderer.records.filter(r=>r.wanted&&r.data.owner==='geyser_center').map(r=>({far:r.data.overview,part:r.data.centerPart,public:r.data.globalSurface,offset:r.xf?.offset}));}")

        def visit(view):
            assert page.evaluate('v=>!!GA.PRESETS[v]', view), view
            page.evaluate('v=>ATLAS.setView(v,false)', view)
            page.wait_for_function('[...ATLAS.stream.required].every(id=>ATLAS.stream.cache.has(id))', polling=200)
            assert page.evaluate('ATLAS.state.view') == view
            return draw()

        cold = page.evaluate("()=>{ATLAS.setView('centerLobby',false);ATLAS.renderOnce();return {native:ATLAS.stream.pending?.worker instanceof Worker,far:ATLAS.renderer.records.some(r=>r.wanted&&r.data.owner==='geyser_center'&&r.data.overview)}}")
        assert cold['native'] and cold['far']
        page.wait_for_function("ATLAS.stream.cache.has('geyser_center')")
        rows = draw()
        assert rows and all(not q['far'] for q in rows)
        passed('Native Worker replaces the interior proxy without duplicate geometry', cold)
        page.evaluate("document.body.classList.add('ui-hidden');ATLAS.state.uiHidden=true")
        for view in page.evaluate('Object.keys(GA.GEYSER_CENTER.views)'):
            rows = visit(view)
            assert rows and not page.evaluate('ATLAS.renderer.engine.getContext().isContextLost()')
            if page.evaluate("ATLAS.state.space==='geyser_center_inside'"):
                assert not page.evaluate('ATLAS.renderer.sky.visible||ATLAS.renderer.rain.visible')
                assert page.evaluate("ATLAS.renderer.records.filter(r=>r.wanted).every(r=>r.data.owner==='geyser_center')")
            else:
                assert page.evaluate("ATLAS.stream.cache.has('forest')&&ATLAS.stream.cache.has('geyser_mountain')&&ATLAS.renderer.sky.visible")
            page.locator('#scene').screenshot(path=str(a.output / (view + '.png')))
            r['views'][view] = page.evaluate('({camera:{eye:ATLAS.rig.eye,target:ATLAS.rig.target,fov:ATLAS.rig.fov},stats:ATLAS.renderer.info().stats,stream:ATLAS.stream.info()})')
            passed('Fixed inspection ' + view, {'visibleCenterRecords': len(rows)})
        rows = visit('centerClosed')
        assert any(q['part'] == 'lid' for q in rows) and not any(q['part'] == 'car' for q in rows)
        rows = visit('centerShaft')
        assert not any(q['part'] == 'lid' for q in rows) and any(q['part'] == 'car' for q in rows)
        passed('Closed lid and open upper car states restore without deleting the collar')
        rows = visit('centerLower')
        assert any(q['part'] == 'car' and q['offset'] == [0, -28, 0] for q in rows)
        assert any(q['part'] == 'hoistLow' for q in rows) and not any(q['part'] == 'hoistHigh' for q in rows)
        rows = visit('centerShaft')
        assert any(q['part'] == 'car' and q['offset'] == [0, 0, 0] for q in rows)
        assert any(q['part'] == 'hoistHigh' for q in rows) and not any(q['part'] == 'hoistLow' for q in rows)
        passed('Lower/upper inspection states use matched hoists; this is not an elevator ride')
        rows = visit('centerSection')
        assert not any(q['part'] in ['roof', 'outer'] for q in rows)
        assert any(q['part'] == 'floor' for q in rows)
        rows = visit('centerLobby')
        assert any(q['part'] == 'roof' for q in rows)
        passed('Cutaway is reversible and retains supported floors')
        visit('centerOverview')
        route = page.evaluate('GA.GEYSER_CENTER.approach.filter((p,i,a)=>i%Math.ceil(a.length/12)===0||i===a.length-1)')
        for i, q in enumerate(route):
            assert page.evaluate("p=>{const y=GA.SurfaceContact.sampler(ATLAS.data,'geyser_center').height(...p);ATLAS.rig.setView({space:'surface',eye:[p[0]+5,y+7,p[1]+7],target:[p[0],y+.8,p[1]]},false);ATLAS.renderOnce();return ATLAS.renderer.records.some(r=>r.wanted&&r.data.owner==='geyser_center'&&r.data.centerPart==='path')}", q)
            if i in [0, len(route)//2, len(route)-1]:
                page.locator('#scene').screenshot(path=str(a.output / f'path-{i:02d}.png'))
        passed('Public approach and old spring junction sampled on rendered terrain', {'samples': len(route), 'playerCollision': False})
        # Real frame scheduling, no manual drawing or GPU synchronization in this segment.
        page.evaluate('globalThis.ATLAS_TEST_PAUSE=false')
        travel = page.evaluate("""async()=>{const path=GA.GEYSER_CENTER.approach,t=GA.SurfaceContact.sampler(ATLAS.data,'geyser_center'),start=ATLAS.state.drawnFrames;
          for(let i=0;i<48;i++){const p=path[Math.round(i*(path.length-1)/47)],y=t.height(...p);ATLAS.rig.setView({space:'surface',eye:[p[0]+5,y+7,p[1]+7],target:[p[0],y+.8,p[1]]},false);ATLAS.wake();await new Promise(requestAnimationFrame);}
          return {positions:48,drawnFrames:ATLAS.state.drawnFrames-start,space:ATLAS.state.space};}""")
        assert travel['drawnFrames'] > 10 and travel['space'] == 'surface'
        page.evaluate('globalThis.ATLAS_TEST_PAUSE=true')
        passed('Continuous 48-position approach uses the production scheduler', travel)
        page.evaluate("document.body.classList.remove('ui-hidden');ATLAS.state.uiHidden=false")
        visit('centerOverview')
        page.locator('#btn-search').click()
        page.locator('#search').fill('Underground Geyser Center')
        entry = page.locator('#results [data-id="geyser_center"]')
        assert entry.count() == 1
        entry.click()
        assert 'P' in page.locator('#detail-design').inner_text()
        assert page.locator('#detail-sources a').count() >= 3
        relation = page.locator('#detail-relations button').filter(has_text='核聚变')
        assert relation.count() == 1
        relation.click()
        assert page.evaluate("ATLAS.state.view==='hellReactor'")
        page.locator('#close-detail').click()
        page.locator('#close-drawer').click()
        passed('Alias/source/P panel links to the original reactor rather than a duplicate')
        visit('centerShaft')
        before = page.evaluate('ATLAS.rig.eye.slice()')
        page.mouse.move(900, 285)
        page.mouse.down()
        page.mouse.move(962, 328, steps=7)
        page.mouse.up()
        page.evaluate('ATLAS.rig.update(0)')
        draw()
        assert before != page.evaluate('ATLAS.rig.eye.slice()')
        page.locator('[data-camera-mode="fly"]').click()
        assert page.evaluate("ATLAS.rig.mode==='fly'")
        assert page.locator('[data-camera-mode="ground"]').is_disabled()
        page.locator('[data-camera-mode="orbit"]').click()
        passed('Real pointer orbit and underground flight preserve surface-mode boundaries')
        for view in ['geyserOverview', 'hellReactor', 'windEntry', 'shrineFront']:
            visit(view)
            assert not page.evaluate('ATLAS.renderer.centerWasActive')
            assert not page.evaluate('ATLAS.renderer.engine.getContext().isContextLost()')
            passed('Return to inherited scene ' + view)
        visit('centerOverview')
        page.locator('#light-night').click()
        page.locator('[data-weather="rain"]').click()
        draw()
        visit('centerLobby')
        assert not page.evaluate('ATLAS.renderer.rain.visible')
        assert page.evaluate('ATLAS.renderer.focusLamps.filter(l=>l.visible).length') == 4
        visit('shrineFront')
        assert page.evaluate("ATLAS.state.lighting==='night'&&ATLAS.state.weather==='rain'&&!ATLAS.renderer.centerWasActive")
        page.locator('#light-neutral').click()
        page.locator('[data-weather="clear"]').click()
        draw()
        assert not page.evaluate('ATLAS.renderer.focusLamps.some(l=>l.visible)')
        passed('Green shaft lighting exits cleanly; surface night/rain selections persist')
        # Normal UI scheduling only from here until the next explicit inspection section.
        page.evaluate('globalThis.ATLAS_TEST_PAUSE=false;ATLAS.state.motion=false;ATLAS.wake()')
        for region in ['world', 'geyser_center', 'geyser_mountain', 'geyser_center']:
            n = page.evaluate('ATLAS.state.drawnFrames')
            page.locator('#region-select').select_option(region)
            page.wait_for_function('n=>ATLAS.state.drawnFrames>n', arg=n)
            page.wait_for_function('!ATLAS.rig.transition&&[...ATLAS.stream.required].every(id=>ATLAS.stream.cache.has(id))')
        page.locator('#view-buttons [data-view="centerLobby"]').click()
        page.wait_for_function("!ATLAS.rig.transition&&ATLAS.state.view==='centerLobby'")
        page.wait_for_timeout(600)
        n = page.evaluate('ATLAS.state.drawnFrames')
        page.wait_for_timeout(1000)
        idle = page.evaluate('ATLAS.state.drawnFrames') - n
        assert idle <= 2
        passed('Normal region/view selectors and idle drawing', {'idleFrames': idle})
        page.evaluate('globalThis.ATLAS_TEST_PAUSE=true')
        visit('diorama')
        page.evaluate('ATLAS.stream.trim(true)')
        cancelled = page.evaluate("()=>{const n=ATLAS.stream.metrics.cancelled;ATLAS.setView('centerLobby',false);ATLAS.setView('diorama',false);ATLAS.stream.trim(true);return ATLAS.stream.metrics.cancelled-n}")
        assert cancelled >= 1
        passed('Obsolete native Worker cancellation', cancelled)
        cycles = []
        for _ in range(3):
            visit('centerShaft')
            visit('centerOverview')
            visit('diorama')
            page.evaluate('ATLAS.stream.trim(true);ATLAS.renderOnce();ATLAS.renderer.trim(true)')
            d = page.evaluate("()=>({cache:ATLAS.stream.cache.size,detail:ATLAS.renderer.records.filter(r=>r.data.owner==='geyser_center'&&!r.data.overview).length,public:ATLAS.world.meshes.filter(m=>m.owner==='geyser_center'&&m.globalSurface).length,...ATLAS.renderer.engine.info.memory})")
            assert d['cache'] == 0 and d['detail'] == 0 and d['public'] > 0
            cycles.append(d)
        assert len({d['public'] for d in cycles}) == 1
        assert max(d['textures'] for d in cycles) - min(d['textures'] for d in cycles) <= 2
        passed('Three eviction cycles release details while retaining public roads', cycles)
        visit('centerLobby')
        page.evaluate('globalThis.ATLAS_TEST_PAUSE=false;ATLAS.wake()')
        page.locator('#btn-settings').click()
        page.locator('#quality').select_option('low')
        page.locator('#opt-ao').uncheck()
        page.locator('#opt-bloom').uncheck()
        page.locator('#close-settings').click()
        page.wait_for_timeout(1000)
        assert page.evaluate('ATLAS.renderer.info().stats.triangles') > 0
        assert not page.evaluate('ATLAS.renderer.info().stats.contactOcclusion')
        page.locator('#scene').screenshot(path=str(a.output / 'center-low-no-post.png'))
        passed('Normal low-quality/no-post controls keep the room and shaft visible')
        page.set_viewport_size({'width': 390, 'height': 844})
        page.wait_for_timeout(700)
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+2')
        page.screenshot(path=str(a.output / 'center-mobile.png'))
        passed('390px controls and live resize')
        audit = page.evaluate('ATLAS.exportState().landmarks')
        assert audit['navigable'] == COVERAGE['navigable'] and audit['pending'] == COVERAGE['pending']
        assert page.evaluate('JSON.parse(document.querySelector("#character-data").textContent).characters.length') == 85
        passed('Current catalogue and all 85 character records retained', {'navigable': audit['navigable'], 'pending': audit['pending']})
        r['contextEvents'] = page.evaluate('centerEvents')
        r['contextLost'] = page.evaluate('ATLAS.renderer.engine.getContext().isContextLost()')
        r['recovery'] = page.evaluate('ATLAS.renderer.info().contextRecovery')
        assert not r['errors'], r['errors']
        assert not r['contextEvents'], r['contextEvents']
        assert not r['contextLost'] and r['recovery']['lost'] == 0
        passed('No JS/shader errors or context loss/restoration in this session')
        r['passed'] = True
        browser.close()
except Exception as e:
    r['passed'] = False
    r['failure'] = repr(e)
    traceback.print_exc()
    try:
        r['contextEvents'] = page.evaluate('globalThis.centerEvents||[]') if page else []
    except Exception:
        pass
finally:
    save()
    if server:
        server.shutdown()
if not r.get('passed'):
    raise SystemExit(1)
