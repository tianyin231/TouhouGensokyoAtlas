"""Optional Playwright/WebGL regression. Build first; no npm dependency.

python -m pip install playwright
python -m playwright install chromium
python tools/check-netherworld-browser.py

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
p.add_argument('--headed', action='store_true', help='Run under a display server such as Xvfb')
p.add_argument('--chromium', help='Optional installed Chromium executable')
p.add_argument('--output', type=Path, default=ROOT / 'dist/netherworld-browser-check')
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
            report['checks'].append({'name':name,'data':data})
            print(name, data if data is not None else '',flush=True)
        def render(characters=False):
            return page.evaluate("""c=>{ATLAS.state.labels=false;ATLAS.state.characters=c;ATLAS.state.motion=false;ATLAS.renderOnce();return ATLAS.renderer.records.filter(r=>r.wanted).map(r=>({id:r.data.id,owner:r.data.owner,overview:r.data.overview,part:r.data.netherPart,zone:r.data.netherZone}));}""",characters)
        def visit(view, region=None):
            page.evaluate('v=>ATLAS.setView(v,false)',view)
            if region:page.wait_for_function('id=>ATLAS.stream.cache.has(id)',arg=region,polling=250)
            return render()
        def screenshot(name):page.screenshot(path=str(args.output/f'{name}.png'))
        assert page.evaluate('ATLAS.stream.cache.size')==0
        initial=page.evaluate("""()=>({far:ATLAS.world.meshes.filter(m=>m.owner==='netherworld'&&m.overview).length,visible:ATLAS.renderer.records.filter(r=>r.wanted&&r.data.owner==='netherworld').length,sky:ATLAS.renderer.netherSky.visible})""")
        assert initial['far']==68 and not initial['visible'] and not initial['sky']
        passed('Cold surface does not build Netherworld detail',initial)
        page.locator('#btn-nether').click()
        page.wait_for_function("ATLAS.stream.cache.has('netherworld')",polling=250)
        records=render();assert records and all(m['owner']=='netherworld' and not m['overview'] for m in records)
        passed('Real toolbar and detail replacement',page.evaluate('ATLAS.stream.info()'))
        views=page.evaluate('Object.keys(GA.NETHERWORLD.views)')
        assert len(views)==13
        for v in views:
            records=visit(v,'netherworld');assert records
            assert all(m['owner']=='netherworld' and not m['overview'] for m in records)
            assert not page.evaluate('ATLAS.renderer.sky.visible||ATLAS.renderer.rain.visible||ATLAS.renderer.lunarSky.visible||ATLAS.renderer.makaiSky.visible')
            assert page.evaluate('ATLAS.renderer.netherSky.visible')
            if v=='saigyouBuds':assert any(m['part']=='buds' for m in records)
            else:assert not any(m['part']=='buds' for m in records)
            if v=='hakugyokuSnow':assert not any(m['part'] in ['flowers','petals','buds'] for m in records)
            if v=='hakugyokuSection':assert all(m['zone'] in ['hall','estateBase','dryGarden'] and m['part'] not in ['roof','shell'] for m in records)
            if v in ['netherOverview','netherBoundary','netherStairs','hakugyokuCourt','hakugyokuHall','hakugyokuRear','saigyouSealed','saigyouBuds','hakugyokuSnow','hakugyokuSection']:screenshot(v)
            passed('Preset '+v,{'visibleMeshes':len(records)})
        visit('saigyouBuds','netherworld');visit('hakugyokuSnow','netherworld');records=visit('saigyouSealed','netherworld')
        assert not page.evaluate('ATLAS.state.netherBuds||ATLAS.state.netherWinter||ATLAS.state.netherSection')
        assert not any(m['part']=='buds' for m in records)
        passed('Default sealed tree restored after bud/snow/section views')
        visit('netherBlossoms','netherworld')
        page.evaluate('ATLAS.state.clock=37.25;ATLAS.state.motion=false;ATLAS.renderOnce()')
        first=page.locator('#scene').screenshot();page.evaluate('ATLAS.renderOnce()')
        assert page.evaluate('ATLAS.renderer.timeUniform.value')==37.25
        assert first==page.locator('#scene').screenshot()
        page.evaluate('ATLAS.state.clock=59.25;ATLAS.renderOnce()');assert first!=page.locator('#scene').screenshot()
        passed('Shared non-zero clock: pause holds pixels, spirits/petals move when time changes')
        page.locator('#btn-search').click();page.locator('#search').fill('Hakugyokurou')
        page.locator('#results [data-id="hakugyokurou"]').click()
        assert 'P' in page.locator('#detail-design').inner_text()
        assert page.locator('#detail-sources a').count()>=3
        page.locator('#close-detail').click();page.locator('#close-drawer').click()
        passed('Alias search, provenance and explicit P construction note')
        # Bindings target existing mesh packs, not newly duplicated models.
        repaired=page.evaluate('Object.entries(GA.LANDMARKS.repaired).map(([id,view])=>({id,view,region:GA.DIORAMA.regionOf(view)}))')
        for entry in repaired:
            page.locator('#btn-search').click();page.locator('#search').fill(entry['id'])
            page.locator(f'#results [data-id="{entry["id"]}"]').click()
            assert page.evaluate('ATLAS.state.view')==entry['view']
            page.wait_for_function('id=>ATLAS.stream.cache.has(id)',arg=entry['region'],polling=250)
            # Fixed-frame mode pauses RAF: let the real UI transition elapse, then update the rig.
            page.wait_for_timeout(1450);page.evaluate('ATLAS.rig.update(0)')
            records=render();assert any(m['owner']==entry['region'] for m in records)
            assert '既有模型补绑定' in page.locator('#detail-state').inner_text()
            page.locator('#close-detail').click();page.locator('#close-drawer').click()
            passed('Existing landmark binding '+entry['id'],{'view':entry['view'],'region':entry['region']})
        visit('hakugyokuCourt','netherworld')
        for id in ['wind_cave','geyser_mountain','sanctuary']:
            before=page.evaluate('JSON.stringify({view:ATLAS.state.view,eye:ATLAS.rig.eye,space:ATLAS.state.space})')
            page.evaluate('id=>ATLAS.selectLocation(id)',id);render()
            assert page.evaluate('JSON.stringify({view:ATLAS.state.view,eye:ATLAS.rig.eye,space:ATLAS.state.space})')==before
            assert page.evaluate('id=>GA.resolveLocation(id).view',id) is None
            page.locator('#close-detail').click()
        passed('Three unbuilt anchors no longer move the camera to unrelated regions')
        for id,view in [('youmu','netherGate'),('yuyuko','hakugyokuHall')]:
            page.evaluate('id=>ATLAS.characters.select(id,false)',id);render(True)
            assert page.evaluate('ATLAS.state.view')==view
            assert '原作图待核' in page.locator('#character-portrait').inner_text()
            pos=page.evaluate('id=>{const c=ATLAS.characters.data.find(c=>c.id===id);return [c.position,ATLAS.characters.position(c)]}',id)
            assert pos[0]==pos[1]
            page.locator('#close-character-detail').click()
        passed('Two resident annotations use the real independent chart; no substituted portraits')
        visit('netherGate','netherworld')
        before=page.evaluate('ATLAS.rig.eye.slice()');page.mouse.move(1040,380);page.mouse.down();page.mouse.move(1160,445,steps=6);page.mouse.up()
        page.evaluate('ATLAS.rig.update(0);ATLAS.renderOnce()');assert page.evaluate('ATLAS.rig.eye.slice()')!=before
        passed('Real pointer orbit')
        trace=[]
        for z in [590,560,531,499,465,428,390,350,310,272,234,194,155,115,76,38]:
            trace.append(page.evaluate("""z=>{const y=GA.NETHERWORLD.height(0,z);ATLAS.rig.setView({space:'netherworld',eye:[9,y+17,z+26],target:[0,GA.NETHERWORLD.height(0,z-25)+8,z-25]},false);ATLAS.renderOnce();return {z,space:ATLAS.state.space,focus:ATLAS.state.focus,visible:ATLAS.renderer.records.filter(r=>r.wanted&&r.data.owner==='netherworld').length};}""",z))
        assert all(t['visible'] and t['space']=='netherworld' and t['focus']=='netherworld' for t in trace)
        passed('Sixteen continuous camera samples from boundary to garden, no region teleport',trace)
        visit('shrineDiorama','hakurei');page.locator('[data-weather="rain"]').click();page.locator('#light-dusk').click();render()
        visit('hakugyokuHall','netherworld')
        light=page.evaluate("""()=>({view:ATLAS.state.view,space:ATLAS.state.space,interior:ATLAS.state.netherInterior,required:[...ATLAS.stream.required],packs:[...ATLAS.renderer.packs.keys()],visible:ATLAS.renderer.netherFill.visible,contextLost:ATLAS.renderer.engine.getContext().isContextLost()})""")
        assert light['visible'] and not light['contextLost'],light
        assert not page.locator('[data-weather="rain"]').is_visible()
        assert page.evaluate('ATLAS.state.weather')=='rain'
        for v,r in [('moonOverview','lunar'),('moonSeaOuter','tranquility'),('dreamWithin','kaian'),('pandemoniumHall','makai05'),('makaiSeal','makai12'),('hellHall','oldhell'),('senkai','senkai'),('needleExterior','kishinjou')]:
            records=visit(v,r)
            assert not any(m['owner']=='netherworld' for m in records)
            assert not page.evaluate('ATLAS.renderer.netherSky.visible||ATLAS.renderer.netherFill.visible')
            passed('Return with Netherworld atmosphere hidden '+v)
        assert page.evaluate('ATLAS.renderer.sky.visible')
        assert page.evaluate('ATLAS.state.weather')=='rain' and page.evaluate('ATLAS.state.lighting')=='dusk'
        assert page.evaluate('ATLAS.renderer.sun.shadow.normalBias===ATLAS.renderer.lunarShadowDefaults.normalBias')
        passed('Original rain/dusk/shadow settings survive the return')
        # Verify fallback proxies synchronously before the genuine asynchronous Worker completes.
        visit('diorama');page.evaluate('ATLAS.stream.trim(true)')
        result=page.evaluate("""()=>{const s=ATLAS.stream,b=s.metrics.cancelled;ATLAS.setView('netherOverview',false);ATLAS.renderOnce();const far=ATLAS.renderer.records.filter(r=>r.wanted&&r.data.owner==='netherworld'&&r.data.overview).length,native=s.pending?.worker instanceof Worker;ATLAS.setView('forest',false);ATLAS.setView('diorama',false);s.trim(true);ATLAS.renderOnce();return {far,native,cancelled:s.metrics.cancelled-b,detail:ATLAS.renderer.records.filter(r=>r.data.owner==='netherworld'&&!r.data.overview).length};}""")
        assert result['far']>0 and result['native'] and result['cancelled']>=1 and not result['detail']
        passed('Native Worker cancellation and surviving overview',result)
        cycles=[]
        for n in range(3):
            visit('netherOverview','netherworld');visit('diorama');page.evaluate('ATLAS.stream.trim(true);ATLAS.renderOnce();ATLAS.renderer.trim(true)')
            result=page.evaluate("""()=>({cache:ATLAS.stream.cache.size,detail:ATLAS.renderer.records.filter(r=>r.data.owner==='netherworld'&&!r.data.overview).length,textures:ATLAS.renderer.engine.info.memory.textures,geometries:ATLAS.renderer.engine.info.memory.geometries})""")
            assert result['cache']==0 and result['detail']==0;cycles.append(result)
        assert max(x['textures'] for x in cycles)-min(x['textures'] for x in cycles)<=2
        assert max(x['geometries'] for x in cycles)-min(x['geometries'] for x in cycles)<=2
        passed('Three actual detail rebuild/eviction cycles have bounded resource counts',cycles)
        visit('hakugyokuCourt','netherworld');page.locator('#btn-settings').click()
        page.locator('#quality').select_option('low');page.locator('#opt-ao').uncheck();page.locator('#opt-bloom').uncheck();page.locator('#close-settings').click()
        records=render();assert any(m['zone']=='hall' for m in records)
        assert page.evaluate('ATLAS.renderer.quality')=='low';screenshot('nether-low-no-post')
        passed('Low quality without AO or bloom still renders actual architecture')
        audit=page.evaluate('ATLAS.exportState().landmarks')
        assert audit['total']==179 and audit['navigable']==77 and audit['pending']==102
        assert '导航覆盖' in audit['meaning']
        assert page.evaluate('ATLAS.exportState().displayTransforms.netherworld')=={'scale':1,'offset':[0,0,0]}
        passed('Shared resolver/export: 77 navigable, 102 pending, not a completion rate')
        page.set_viewport_size({'width':390,'height':844});render()
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
        page.locator('#btn-nether').click();render();assert page.evaluate('ATLAS.state.space')=='netherworld'
        screenshot('narrow-nether');passed('390px layout and reachable real Netherworld control')
        report['portraits']=page.evaluate("Object.fromEntries(['youmu','yuyuko'].map(id=>[id,ATLAS.characters.status.get(id)]))")
        assert not report['errors'],'\n'.join(report['errors'])[:4000]
        report['passed']=True;browser.close()
except Exception as e:
    report['passed']=False;report['failure']=str(e)
    raise
finally:
    if server:server.shutdown()
    (args.output/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
