"""Optional Makai Playwright/WebGL regression. Build first; no npm dependency.

python -m pip install playwright
python -m playwright install chromium
python tools/check-makai-browser.py

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
p.add_argument('--output', type=Path, default=ROOT / 'dist/makai-browser-check')
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
            return page.evaluate("""c=>{ATLAS.state.labels=false;ATLAS.state.characters=c;ATLAS.state.motion=false;ATLAS.renderOnce();return ATLAS.renderer.records.filter(r=>r.wanted).map(r=>({owner:r.data.owner,space:r.data.space,overview:r.data.overview,zone:r.data.makaiZone,part:r.data.makaiPart}));}""",characters)
        def visit(view,region=None):
            page.evaluate('v=>ATLAS.setView(v,false)',view)
            if region:page.wait_for_function('r=>ATLAS.stream.cache.has(r)',arg=region,polling=250)
            return render()
        def screenshot(name):page.screenshot(path=str(args.output/f'{name}.png'))
        assert page.evaluate('ATLAS.stream.cache.size')==0
        assert not any(m['owner'] in ['makai12','makai05','makai01'] for m in render())
        assert page.evaluate('GA.MAKAI.regions.every(id=>ATLAS.world.meshes.some(m=>m.owner===id&&m.overview))')
        passed('Cold surface has Makai proxies and no detailed construction')
        page.locator('#btn-makai').click()
        page.wait_for_function("ATLAS.stream.cache.has('makai12')",polling=250)
        near=render();assert near and all(m['owner']=='makai12' and not m['overview'] for m in near)
        passed('Real toolbar and Worker proxy replacement')
        views=page.evaluate('Object.entries(GA.MAKAI.views).map(([id,p])=>({id,region:p.region}))')
        for v in views:
            records=visit(v['id'],v['region']);assert records
            assert all(m['space']==v['region'] and not m['overview'] for m in records)
            assert not page.evaluate('ATLAS.renderer.sky.visible||ATLAS.renderer.rain.visible||ATLAS.renderer.lunarSky.visible||ATLAS.renderer.lunarEarth.visible||ATLAS.renderer.castleFill.visible')
            assert page.evaluate('ATLAS.renderer.makaiSky.visible')
            if v['id'] in ['makaiSeal','makaiSealClose']:
                assert any(m['part']=='seal' for m in records) and not any(m['part']=='spectrum' for m in records)
                assert not page.evaluate('ATLAS.renderer.hokkaiLuminary.visible')
            elif v['region']=='makai12':
                assert not any(m['part']=='seal' for m in records) and any(m['part']=='spectrum' for m in records)
                assert page.evaluate('ATLAS.renderer.hokkaiLuminary.visible')
            if v['id']=='pandemoniumSection':
                assert not any(m['part'] in ['roof','vault','front','right'] for m in records)
                assert all(m['zone'] in ['hall','gallery','stairs','palaceBase'] for m in records)
            screenshot(v['id'])
            passed('Preset '+v['id'],{'visibleMeshes':len(records),'space':v['region']})
        visit('makaiSeal','makai12')
        page.evaluate('ATLAS.state.clock=37.25;ATLAS.renderOnce()');a=page.locator('#scene').screenshot()
        page.evaluate('ATLAS.renderOnce()');assert a==page.locator('#scene').screenshot()
        assert page.evaluate('ATLAS.renderer.timeUniform.value')==37.25
        page.evaluate('ATLAS.state.clock=55;ATLAS.renderOnce()');assert a!=page.locator('#scene').screenshot()
        passed('Shared time changes seal pixels; pausing retains nonzero phase')
        for name,region in [('makai05Overview','makai05'),('vinaRuins','makai01'),('makaiSeal','makai12')]:
            page.locator(f'[data-makai-view="{name}"]').click();page.wait_for_function('r=>ATLAS.stream.cache.has(r)',arg=region,polling=250);render();assert page.evaluate('ATLAS.state.space')==region
        passed('Three version navigation buttons')
        page.locator('#btn-search').click();page.locator('#search').fill('Pandemonium')
        assert page.locator('#results [data-id="pc98_panda"]').count()==1
        page.locator('#results [data-id="pc98_panda"]').click();assert 'P' in page.locator('#detail-design').inner_text()
        assert page.locator('#detail-sources a').count()>=2
        page.locator('#close-detail').click();page.locator('#close-drawer').click()
        passed('Catalogue alias and palace source panel')
        for id,view in [('shinki','pandemonium'),('yumeko','pandemoniumHall'),('sara','makaiGate'),('sariel','fallenSanctuary')]:
            page.evaluate('id=>ATLAS.characters.select(id,false)',id);render(True)
            assert page.evaluate('ATLAS.state.view')==view
            pos=page.evaluate('id=>{const c=ATLAS.characters.data.find(c=>c.id===id);return {source:c.position,actual:ATLAS.characters.position(c)}}',id)
            assert pos['source']==pos['actual'];assert '原作图待核' in page.locator('#character-portrait').inner_text()
            page.locator('#close-character-detail').click()
        for id,space in [('byakuren','makai12'),('alice','makai05')]:
            page.evaluate("""id=>{const c=ATLAS.characters.data.find(c=>c.id===id);const i=c.visits.findIndex(v=>GA.MAKAI.spaces.includes(v.space));ATLAS.characters.select(id,false,i)}""",id)
            render(True);assert page.evaluate('ATLAS.state.space')==space
            if id=='alice':assert '原作图待核' in page.locator('#character-portrait').inner_text()
            page.locator('#close-character-detail').click()
        visit('makaiSeal','makai12');render(True)
        assert page.evaluate("ATLAS.characters.elements.filter(e=>e.cs[0].makaiPhase==='released').every(e=>e.el.hidden)")
        passed('Old characters, historical visits, edition-specific art and sealed-era visibility')
        visit('pandemonium','makai05');before=page.evaluate('ATLAS.rig.eye.slice()')
        page.mouse.move(1090,400);page.mouse.down();page.mouse.move(1170,461,steps=7);page.mouse.up();page.evaluate('ATLAS.rig.update(0);ATLAS.renderOnce()')
        assert page.evaluate('ATLAS.rig.eye.slice()')!=before and page.evaluate('ATLAS.state.space')=='makai05'
        passed('Real pointer orbit around the palace')
        trace=[]
        for z in range(584,306,-23):
            trace.append(page.evaluate("""z=>{ATLAS.rig.setView({space:'makai05',eye:[0,35,z],target:[0,34,z-45]},false);ATLAS.renderOnce();return {z,space:ATLAS.state.space,detail:ATLAS.renderer.records.filter(r=>r.wanted&&r.data.owner==='makai05'&&!r.data.overview).length};}""",z))
        assert all(v['space']=='makai05' and v['detail'] for v in trace)
        passed('Continuous cave-to-street camera samples; no land unload',trace)
        visit('shrineDiorama','hakurei');page.locator('[data-weather="rain"]').click();page.locator('#light-dusk').click();render()
        for view,region in [('pandemoniumHall','makai05'),('hokkai','makai12'),('fallenSanctuary','makai01')]:
            visit(view,region);assert page.evaluate('ATLAS.state.weather')=='rain';assert not page.evaluate('ATLAS.renderer.rain.visible');assert not page.locator('[data-weather="rain"]').is_visible()
        for view,region,space in [('moonOverview','lunar','lunar'),('moonSeaOuter','tranquility','lunarsea'),('dreamWithin','kaian','dream'),('hellHall','oldhell','oldhell'),('hellGallery','oldhell','oldhell'),('hellBlood','oldhell','oldhell'),('mausoleumCorridor','mausoleum','mausoleum'),('senkai','senkai','senkai'),('forest','forest','surface'),('needleSection','kishinjou','surface'),('needleExterior','kishinjou','surface')]:
            visit(view,region)
            assert page.evaluate('ATLAS.state.space')==space
            assert not page.evaluate('ATLAS.renderer.makaiSky.visible||ATLAS.renderer.hokkaiLuminary.visible||ATLAS.renderer.makaiLights.some(l=>l.visible)')
            assert not page.evaluate('ATLAS.state.makaiSeal||ATLAS.state.makaiSection||ATLAS.state.makaiInterior')
            if space=='surface':assert page.evaluate('ATLAS.renderer.sky.visible')
            passed('Inherited return '+view)
        assert page.evaluate('ATLAS.state.weather')=='rain' and page.evaluate('ATLAS.state.lighting')=='dusk'
        assert page.evaluate('ATLAS.renderer.sun.shadow.normalBias===ATLAS.renderer.lunarShadowDefaults.normalBias')
        passed('Surface weather and shadow parameters restore')
        visit('diorama');page.evaluate('ATLAS.stream.trim(true)')
        result=page.evaluate("""()=>{const s=ATLAS.stream,n=s.metrics.cancelled;ATLAS.setView('pandemonium',false);ATLAS.renderOnce();const far=ATLAS.renderer.records.filter(r=>r.wanted&&r.data.owner==='makai05'&&r.data.overview).length,native=s.pending?.worker instanceof Worker;ATLAS.setView('hokkai',false);ATLAS.setView('diorama',false);s.trim(true);ATLAS.renderOnce();return {far,native,cancelled:s.metrics.cancelled-n,detail:ATLAS.renderer.records.filter(r=>GA.MAKAI.regions.includes(r.data.owner)&&!r.data.overview).length};}""")
        assert result['far']>0 and result['native'] and result['cancelled']>=1 and result['detail']==0
        passed('Native Worker cancellation, proxy survival and no stale details',result)
        cycles=[]
        for n in range(3):
            for view,region in [('pandemonium','makai05'),('hokkai','makai12'),('vinaRuins','makai01')]:visit(view,region)
            visit('diorama');page.evaluate('ATLAS.stream.trim(true);ATLAS.renderOnce();ATLAS.renderer.trim(true)')
            snap=page.evaluate("""()=>({cache:ATLAS.stream.cache.size,detail:ATLAS.renderer.records.filter(r=>GA.MAKAI.regions.includes(r.data.owner)&&!r.data.overview).length,geometries:ATLAS.renderer.engine.info.memory.geometries,textures:ATLAS.renderer.engine.info.memory.textures})""")
            assert snap['cache']==0 and snap['detail']==0;cycles.append(snap)
        assert max(v['textures'] for v in cycles)-min(v['textures'] for v in cycles)<=2
        assert max(v['geometries'] for v in cycles)-min(v['geometries'] for v in cycles)<=2
        passed('Three rebuild/eviction cycles; bounded texture and geometry counts',cycles)
        ex=page.evaluate('ATLAS.exportState()');assert ex['makaiModule']=='0.20.0'
        assert all(ex['displayTransforms'][r]=={'scale':1,'offset':[0,0,0]} for r in ['makai12','makai05','makai01'])
        passed('Export records edition and identity transforms')
        visit('pandemoniumHall','makai05');page.locator('#btn-settings').click()
        page.locator('#opt-bloom').uncheck();page.locator('#opt-ao').uncheck();render()
        assert not page.evaluate('ATLAS.state.bloom||ATLAS.state.ao');screenshot('hall-no-post-effects')
        page.locator('#quality').select_option('low');render();assert page.evaluate('ATLAS.renderer.quality')=='low'
        page.locator('#close-settings').click();passed('Real effects and lightweight-quality controls')
        page.set_viewport_size({'width':390,'height':844});render()
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
        assert page.locator('#btn-makai').is_visible();screenshot('narrow-makai');passed('390px layout without page overflow')
        report['portraits']=page.evaluate("()=>Object.fromEntries(['shinki','yumeko','sara','sariel'].map(id=>[id,ATLAS.characters.status.get(id)]))")
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
