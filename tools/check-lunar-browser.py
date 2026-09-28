"""Optional lunar-charts Playwright/WebGL regression; build first.

python -m pip install playwright
python -m playwright install chromium
python tools/check-lunar-browser.py

Use --content only where local HTTP navigation is unavailable: it loads the
identical built HTML into about:blank, retaining native Blob Workers. This is
reported separately from HTTP validation. Linux system Chromium may need Xvfb.
"""
from pathlib import Path
import argparse
import hashlib
import json
import threading
import time
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--content', action='store_true')
p.add_argument('--headed', action='store_true', help='Use a visible browser, e.g. under Linux Xvfb')
p.add_argument('--chromium', help='Optional installed Chromium executable')
p.add_argument('--output', type=Path, default=ROOT / 'dist/lunar-browser-check')
args = p.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
info = json.loads((ROOT / 'dist/release.json').read_text())
html = (ROOT / 'dist' / info['artifact']).read_bytes()
assert hashlib.sha256(html).hexdigest() == info['sha256']
report = {'artifact': info['artifact'], 'sha256': info['sha256'],
          'loadMode': 'about:blank content / native Blob Worker' if args.content else 'local HTTP',
          'viewport': [1280, 900], 'dpr': 1, 'quality': 'balanced',
          'checks': [], 'errors': [], 'externalResourceErrors': [],
          'hardwarePerformanceMeasured': False}
server = None
try:
    if not args.content:
        server = ThreadingHTTPServer(('127.0.0.1', 0), partial(SimpleHTTPRequestHandler, directory=str(ROOT/'dist')))
        threading.Thread(target=server.serve_forever, daemon=True).start()
    with sync_playwright() as pw:
        launch = {'headless': not args.headed, 'args': ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--disable-dev-shm-usage']}
        if args.chromium:
            launch['executable_path'] = args.chromium
        browser = pw.chromium.launch(**launch)
        page = browser.new_page(viewport={'width': 1280, 'height': 900}, device_scale_factor=1)
        page.set_default_timeout(90000)
        page.on('pageerror', lambda e: report['errors'].append(str(e)))
        def console(m):
            if m.type != 'error':
                return
            if 'Failed to load resource' in m.text:
                report['externalResourceErrors'].append(m.text)
            else:
                report['errors'].append(m.text)
        page.on('console', console)
        page.add_init_script('globalThis.ATLAS_TEST_PAUSE=true;')
        if args.content:
            page.goto('about:blank')
            page.evaluate('globalThis.ATLAS_TEST_PAUSE=true')
            page.set_content(html.decode('utf-8'), wait_until='load', timeout=90000)
        else:
            page.goto(f'http://127.0.0.1:{server.server_port}/{info["artifact"]}', wait_until='load')
        page.wait_for_function('!!globalThis.ATLAS || !!globalThis.ATLAS_BOOT_ERROR', polling=250)
        assert page.evaluate('globalThis.ATLAS_BOOT_ERROR || null') is None
        report['browser'] = browser.version
        report['webgl'] = page.evaluate('''()=>{const g=ATLAS.renderer.engine.getContext(),e=g.getExtension('WEBGL_debug_renderer_info');return {version:g.getParameter(g.VERSION),renderer:e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):g.getParameter(g.RENDERER)};}''')
        def passed(name, data=None):
            report['checks'].append({'name': name, 'data': data})
            print(name, data if data is not None else '', flush=True)
        def render(characters=False):
            return page.evaluate("""(characters)=>{ATLAS.state.labels=false;ATLAS.state.characters=characters;ATLAS.state.motion=false;ATLAS.renderOnce();return ATLAS.renderer.records.filter(r=>r.wanted).map(r=>({id:r.data.id,owner:r.data.owner,space:r.data.space,overview:r.data.overview,face:r.data.lunarFace,part:r.data.lunarPart}));}""", characters)
        def visit(view, region=None):
            page.evaluate('v=>ATLAS.setView(v,false)',view)
            if region:
                page.wait_for_function('(id)=>ATLAS.stream.cache.has(id)',arg=region,polling=250)
            return render()
        def screenshot(name):
            page.screenshot(path=str(args.output/f'{name}.png'))
        assert page.evaluate('ATLAS.stream.cache.size') == 0
        boot=page.evaluate("""()=>({overviews:GA.LUNAR.regions.map(id=>ATLAS.world.meshes.filter(m=>m.owner===id&&m.overview).length),visible:ATLAS.renderer.records.filter(r=>r.wanted&&GA.LUNAR.regions.includes(r.data.owner)).length,sky:ATLAS.renderer.lunarSky.visible})""")
        assert all(boot['overviews']) and not boot['visible'] and not boot['sky']
        passed('Cold surface retains low-cost lunar proxies without constructing detail',boot)
        page.locator('#btn-lunar').click()
        far=page.evaluate("""()=>{ATLAS.renderOnce();return {native:ATLAS.stream.pending?.worker instanceof Worker,far:ATLAS.renderer.records.filter(r=>r.wanted&&r.data.owner==='lunar'&&r.data.overview).length};}""")
        # Worker may finish before the Playwright round trip; separately test synchronous far frame below.
        page.wait_for_function("ATLAS.stream.cache.has('lunar')",polling=250)
        near=render();assert near and all(m['owner']=='lunar' and not m['overview'] for m in near)
        passed('Real lunar toolbar and native Worker replacement',far)
        views=page.evaluate('Object.entries(GA.LUNAR.views).map(([id,p])=>({id,region:p.region,space:p.space,face:p.lunarFace||"inner"}))')
        selected={'moonAvenue','moonOverview','moonResidence','moonTeaRoom','moonPeaches','moonSeaInner','moonSeaOuter','dreamWithin'}
        for v in views:
            records=visit(v['id'],v['region']);assert records
            assert all(m['space']==v['space'] and not m['overview'] for m in records)
            assert all(m['face'] in ['both',v['face']] for m in records)
            assert not page.evaluate('ATLAS.renderer.sky.visible||ATLAS.renderer.rain.visible||ATLAS.renderer.castleFill.visible')
            assert page.evaluate('ATLAS.renderer.lunarSky.visible')
            if v['id']=='moonSealed':
                assert not any(m['part']=='daily' for m in records)
                assert not page.evaluate('ATLAS.renderer.lunarFill.visible')
            if v['id'] in selected:screenshot(v['id'])
            passed('Preset '+v['id'],{'meshes':len(records),'space':v['space']})
        visit('moonSeaInner','tranquility')
        page.evaluate('ATLAS.state.clock=37.25;ATLAS.state.motion=false;ATLAS.renderOnce()')
        a=page.locator('#scene').screenshot()
        page.evaluate('ATLAS.renderOnce()');assert a==page.locator('#scene').screenshot()
        assert page.evaluate('ATLAS.renderer.lunarPhase.value')==37.25
        page.evaluate('ATLAS.state.clock=49.75;ATLAS.renderOnce()');assert a!=page.locator('#scene').screenshot()
        passed('Water pixels respond to shared time; pause retains a nonzero phase')
        visit('dreamWithin','kaian');page.evaluate('ATLAS.state.clock=18;ATLAS.renderOnce()');a=page.locator('#scene').screenshot()
        page.evaluate('ATLAS.state.clock=31;ATLAS.renderOnce()');assert a!=page.locator('#scene').screenshot()
        passed('Dream ribbon and crane pixels use the shared scene clock')
        visit('moonResidence','lunar');render(True)
        assert page.evaluate("ATLAS.characters.elements.filter(e=>e.cs[0].period==='sealed').every(e=>e.el.hidden)")
        visit('moonSealed','lunar');render(True)
        assert page.evaluate("ATLAS.characters.elements.filter(e=>e.cs[0].period==='daily').every(e=>e.el.hidden)")
        assert page.evaluate('ATLAS.renderer.lunarPhase.value')==0
        passed('Routine and TH15 sealed annotations are mutually exclusive')
        page.locator('#btn-search').click();page.locator('#search').fill('Lunar Capital')
        assert page.locator('#results [data-id="lunar_capital"]').count()==1
        page.locator('#results [data-id="lunar_capital"]').click();assert 'P' in page.locator('#detail-design').inner_text()
        assert page.locator('#detail-sources a').count()>=3
        page.locator('#close-detail').click();page.locator('#close-drawer').click()
        for id,view in [('toyohime','moonResidence'),('yorihime','moonResidenceRear'),('sagume','moonSealed'),('doremy','dreamWithin')]:
            page.evaluate('id=>ATLAS.characters.select(id,false)',id);render(True)
            assert page.evaluate('ATLAS.state.view')==view
            pos=page.evaluate('id=>{const c=ATLAS.characters.data.find(c=>c.id===id);return {given:c.position,actual:ATLAS.characters.position(c)}}',id)
            assert pos['given']==pos['actual'] and any(pos['actual'])
            if id in ['toyohime','yorihime']:assert '原作图待核' in page.locator('#character-portrait').inner_text()
            page.locator('#close-character-detail').click()
        passed('Aliases, source links and four independent-space character positions')
        visit('moonResidence','lunar')
        before=page.evaluate('ATLAS.rig.eye.slice()')
        page.mouse.move(1010,350);page.mouse.down();page.mouse.move(1130,405,steps=6);page.mouse.up()
        page.evaluate('ATLAS.rig.update(0);ATLAS.renderOnce()')
        assert page.evaluate('ATLAS.rig.eye.slice()')!=before
        assert page.evaluate('ATLAS.state.space')=='lunar'
        passed('Real pointer orbit in the lunar chart')
        # Continuous camera sampling follows the built ground path, not navigation teleports.
        trace=[]
        for x in range(240,443,17):
            trace.append(page.evaluate("""x=>{ATLAS.rig.setView({space:'lunar',eye:[x,49,-64],target:[x+15,15,-110]},false);ATLAS.renderOnce();return {x,space:ATLAS.state.space,visible:ATLAS.renderer.records.filter(r=>r.wanted&&r.data.owner==='lunar').length,cache:ATLAS.stream.cache.has('lunar')};}""",x))
        assert all(v['visible'] and v['cache'] and v['space']=='lunar' for v in trace)
        passed(f'{len(trace)} continuous orchard/shore camera samples without a chart transition',trace)
        visit('shrineDiorama','hakurei')
        page.locator('[data-weather="rain"]').click();page.locator('#light-dusk').click();render()
        assert page.evaluate('ATLAS.state.weather')=='rain'
        for v,region in [('moonOverview','lunar'),('moonSeaOuter','tranquility'),('dreamWithin','kaian')]:
            visit(v,region);assert page.evaluate('ATLAS.state.weather')=='rain'
            assert not page.evaluate('ATLAS.renderer.sky.visible||ATLAS.renderer.rain.visible')
            assert not page.locator('[data-weather="rain"]').is_visible()
        visit('needleExterior','kishinjou')
        assert page.evaluate('ATLAS.renderer.sky.visible')
        assert not page.evaluate('ATLAS.renderer.lunarSky.visible||ATLAS.renderer.lunarEarth.visible||ATLAS.renderer.lunarFill.visible')
        assert page.evaluate('ATLAS.state.weather')=='rain' and page.evaluate('ATLAS.state.lighting')=='dusk'
        assert page.evaluate('ATLAS.renderer.sun.shadow.normalBias===ATLAS.renderer.lunarShadowDefaults.normalBias')
        passed('Earth weather, sky and shadow settings restore after all lunar charts')
        visit('hellHall','oldhell');assert not page.evaluate('ATLAS.renderer.lunarSky.visible||ATLAS.renderer.lunarFill.visible')
        visit('moonOverview','lunar');assert not page.evaluate('ATLAS.renderer.hellLights.some(l=>l.visible)||ATLAS.renderer.hellKey.visible')
        passed('Old-hell hall and lunar space do not share atmospheric objects')
        visit('diorama');page.evaluate('ATLAS.stream.trim(true)')
        cancel=page.evaluate("""()=>{const s=ATLAS.stream,b=s.metrics.cancelled;ATLAS.setView('moonOverview',false);ATLAS.renderOnce();const far=ATLAS.renderer.records.filter(r=>r.wanted&&r.data.owner==='lunar'&&r.data.overview).length,native=s.pending?.worker instanceof Worker;ATLAS.setView('dreamWithin',false);ATLAS.setView('diorama',false);s.trim(true);ATLAS.renderOnce();return {far,native,cancelled:s.metrics.cancelled-b,remaining:ATLAS.renderer.records.filter(r=>GA.LUNAR.regions.includes(r.data.owner)&&!r.data.overview).length};}""")
        assert cancel['far']>0 and cancel['native'] and cancel['cancelled']>=1 and cancel['remaining']==0
        passed('Synchronous far frame, genuine Worker cancellation and buffer eviction',cancel)
        cycles=[]
        for n in range(3):
            for v,r in [('moonOverview','lunar'),('moonSeaOuter','tranquility'),('dreamWithin','kaian')]:visit(v,r)
            visit('diorama');page.evaluate('ATLAS.stream.trim(true);ATLAS.renderOnce();ATLAS.renderer.trim(true)')
            snap=page.evaluate("""()=>({cache:ATLAS.stream.cache.size,details:ATLAS.renderer.records.filter(r=>GA.LUNAR.regions.includes(r.data.owner)&&!r.data.overview).length,textures:ATLAS.renderer.engine.info.memory.textures,geometries:ATLAS.renderer.engine.info.memory.geometries})""")
            assert not snap['cache'] and not snap['details'];cycles.append(snap)
        assert max(s['textures'] for s in cycles)-min(s['textures'] for s in cycles)<=2
        assert max(s['geometries'] for s in cycles)-min(s['geometries'] for s in cycles)<=2
        passed('Three cache/revisit cycles release details with bounded resource counts',cycles)
        exported=page.evaluate('ATLAS.exportState()')
        assert exported['lunarModule']=='0.19.0'
        assert all(exported['displayTransforms'][id]=={'scale':1,'offset':[0,0,0]} for id in ['lunar','tranquility','kaian'])
        passed('Export retains independent identity transforms, not Senkai offsets')
        visit('moonOverview','lunar');page.set_viewport_size({'width':390,'height':844});render()
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
        assert page.locator('#btn-lunar').is_visible();screenshot('narrow-lunar')
        passed('390px lunar controls without horizontal page overflow')
        report['portraits']=page.evaluate("()=>Object.fromEntries(['toyohime','yorihime','sagume','doremy'].map(id=>[id,ATLAS.characters.status.get(id)]))")
        assert not report['errors'],'\n'.join(report['errors'])[:4000]
        report['passed']=True
        browser.close()
except Exception as e:
    report['passed'] = False
    report['failure'] = str(e)
    raise
finally:
    if server:
        server.shutdown()
    (args.output / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
