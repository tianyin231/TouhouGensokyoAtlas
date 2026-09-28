"""Optional Playwright/WebGL regression. Build first; no npm dependency.

python -m pip install playwright
python -m playwright install chromium
python tools/check-browser.py

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
p.add_argument('--chromium', help='Optional installed Chromium executable')
p.add_argument('--output', type=Path, default=ROOT / 'dist/browser-check')
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
        launch = {'headless': True, 'args': ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--disable-dev-shm-usage']}
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
        def render():
            return page.evaluate('''()=>{ATLAS.state.labels=false;ATLAS.state.characters=false;ATLAS.state.motion=false;ATLAS.renderOnce();return ATLAS.renderer.records.filter(r=>r.wanted&&r.data.owner==='kishinjou').map(r=>({id:r.data.id,overview:r.data.overview,zone:r.data.castleZone,part:r.data.castlePart}));}''')
        def visit(view, region=None):
            page.evaluate('v=>ATLAS.setView(v,false)', view)
            if region:
                page.wait_for_function('(id)=>ATLAS.stream.cache.has(id)', arg=region, polling=250)
            return render()
        def screenshot(name):
            page.screenshot(path=str(args.output / f'{name}.png'))
        assert page.evaluate('ATLAS.stream.cache.size') == 0
        assert page.evaluate("ATLAS.world.meshes.some(m=>m.owner==='kishinjou'&&m.overview)")
        passed('Cold overview without detail construction')
        screenshot('world')
        far = page.evaluate('''()=>{ATLAS.setView('needleExterior',false);ATLAS.renderOnce();return {ready:ATLAS.stream.cache.has('kishinjou'),far:ATLAS.renderer.records.filter(r=>r.wanted&&r.data.owner==='kishinjou'&&r.data.overview).length};}''')
        assert not far['ready'] and far['far'] > 0
        page.wait_for_function("ATLAS.stream.cache.has('kishinjou')", polling=250)
        near = render()
        assert near and not any(m['overview'] for m in near)
        passed('Native Worker, overview-to-detail replacement', page.evaluate('ATLAS.stream.info()'))
        for v in ['needleExterior', 'needleApproach', 'needleRear', 'needleFoundation', 'needleEaves', 'needleHall', 'needleSection', 'needleStorm']:
            records = visit(v, 'kishinjou')
            assert records
            if v == 'needleSection':
                assert all(m['zone']=='hall' and m['part'] not in ['front', 'roof'] for m in records)
            if v == 'needleStorm':
                assert any(m['part']=='storm' for m in records)
            else:
                assert not any(m['part']=='storm' for m in records)
            if v in ['needleExterior', 'needleRear', 'needleHall', 'needleSection']:
                screenshot(v)
            passed('Preset '+v, {'castleMeshesVisible': len(records)})
        # The event uses the shared, non-zero clock; pausing must not reset it.
        page.evaluate('ATLAS.state.clock=37.25; ATLAS.state.motion=false; ATLAS.renderOnce()')
        a = page.locator('#scene').screenshot()
        page.evaluate('ATLAS.renderOnce()')
        assert page.evaluate('ATLAS.renderer.timeUniform.value') == 37.25
        assert a == page.locator('#scene').screenshot()
        page.evaluate('ATLAS.state.clock=48.25;ATLAS.renderOnce()')
        assert a != page.locator('#scene').screenshot()
        passed('Paused clock retains phase; event pixels respond to non-zero time')
        visit('needleHall', 'kishinjou')
        for weather in ['cloudy', 'rain', 'clear']:
            page.locator(f'[data-weather="{weather}"]').click()
            render()
            assert page.evaluate('ATLAS.state.weather') == weather
        page.locator('#light-dusk').click(); render()
        assert page.evaluate('ATLAS.state.lighting') == 'dusk'
        page.locator('#light-neutral').click(); render()
        passed('Real weather and lighting controls')
        # Search/aliases and character navigation use the real directory.
        page.locator('#btn-search').click()
        page.locator('#search').fill('Kishinjou')
        assert page.locator('#results [data-id="needle"]').count() == 1
        page.locator('#results [data-id="needle"]').click()
        assert 'P' in page.locator('#detail-design').inner_text()
        page.locator('#close-detail').click(); page.locator('#close-drawer').click()
        page.evaluate("ATLAS.characters.select('seija',false);ATLAS.renderOnce()")
        assert page.evaluate('ATLAS.state.view') == 'needleHall'
        assert page.locator('#character-detail').get_attribute('data-character') == 'seija'
        page.locator('#close-character-detail').click()
        passed('Alias search, source panel, historical character navigation')
        # Interior/section flags restore on ordinary views and on other spaces.
        for v, region, space in [
            ('forest','forest','surface'),('shrineDiorama','hakurei','surface'),
            ('hellStreet','oldhell','oldhell'),('hellHall','oldhell','oldhell'),
            ('hellGallery','oldhell','oldhell'),('hellBlood','oldhell','oldhell'),
            ('mausoleumCorridor','mausoleum','mausoleum'),('senkai','senkai','senkai'),
            ('needleExterior','kishinjou','surface')]:
            records = visit(v, region)
            assert page.evaluate('ATLAS.state.space') == space
            assert not page.evaluate('ATLAS.state.castleStorm || ATLAS.state.castleSection')
            if space != 'surface':
                assert not records
                assert not page.evaluate('ATLAS.renderer.castleFill.visible')
            if space == 'oldhell':
                assert not page.evaluate('ATLAS.renderer.sky.visible || ATLAS.renderer.rain.visible')
            passed('Region return '+v)
        assert page.evaluate('ATLAS.renderer.sky.visible')
        # Pointer input can inspect the underside, but ground cameras retain limits.
        page.mouse.move(1050, 380);page.mouse.down();page.mouse.move(1060, 260, steps=5);page.mouse.up()
        page.evaluate('ATLAS.rig.update(0);ATLAS.renderOnce()')
        assert page.evaluate('ATLAS.rig.phi') > 1.57
        passed('Real pointer orbit beneath the inverted roofs')
        # Cancel a native build, collect unneeded CPU/GPU buffers, revisit.
        visit('diorama')
        page.evaluate('ATLAS.stream.trim(true)')
        assert not page.evaluate("ATLAS.stream.cache.has('kishinjou') || ATLAS.renderer.packs.has('kishinjou')")
        result = page.evaluate('''()=>{const s=ATLAS.stream;const before=s.metrics.cancelled;ATLAS.setView('needleExterior',false);ATLAS.setView('forest',false);ATLAS.setView('diorama',false);s.trim(true);ATLAS.renderOnce();return {cancelled:s.metrics.cancelled-before,required:[...s.required],detail:ATLAS.renderer.records.filter(r=>r.data.owner==='kishinjou'&&!r.data.overview).length,far:ATLAS.world.meshes.filter(m=>m.owner==='kishinjou'&&m.overview).length};}''')
        assert result['cancelled'] >= 1 and not result['required'] and result['detail'] == 0 and result['far'] > 0
        passed('Native build cancellation and far-asset survival', result)
        visit('needleExterior','kishinjou')
        passed('Native rebuild after CPU/GPU eviction', page.evaluate('ATLAS.stream.info()'))
        # Viewport check is layout only, not a mobile GPU performance claim.
        page.set_viewport_size({'width':390,'height':844});render()
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
        assert page.locator('#btn-needle').is_visible()
        screenshot('narrow-layout')
        passed('390px layout without horizontal page overflow')
        assert not report['errors'], '\n'.join(report['errors'])[:4000]
        report['passed'] = True
        browser.close()
except Exception as e:
    report['passed'] = False
    report['failure'] = str(e)
    raise
finally:
    if server:
        server.shutdown()
    (args.output / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
