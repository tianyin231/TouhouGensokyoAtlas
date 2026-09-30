"""Cucumber field WebGL regression. HTTP by default; --content is explicit.
Fixed inspection frames are manually drawn. The production selector, idle,
quality and resize segments use normal scheduling, without renderOnce/gl.finish.
Strict context-event assertions keep failed runs distinguishable from passes.
"""
import argparse, hashlib, json, threading, traceback
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parents[1]
COVERAGE=json.loads((ROOT/'tools/current-coverage.json').read_text())
p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--content', action='store_true'); p.add_argument('--headed', action='store_true'); p.add_argument('--chromium')
p.add_argument('--output', type=Path, default=ROOT/'dist/cucumber-farm-browser-check')
a = p.parse_args(); a.output.mkdir(parents=True, exist_ok=True)
i = json.loads((ROOT/'dist/release.json').read_text()); html = (ROOT/'dist'/i['artifact']).read_bytes()
assert hashlib.sha256(html).hexdigest() == i['sha256']
r = {'sha256':i['sha256'], 'loadMode':'about:blank full content / native Blob Worker' if a.content else 'local HTTP',
     'viewport':[1280,720], 'dpr':1, 'quality':'balanced', 'weather':'clear', 'clock':0, 'ao':True, 'bloom':False,
     'reflections':False, 'hardwareFPSMeasured':False, 'checks':[], 'views':{}, 'errors':[], 'externalErrors':[], 'contextEvents':[]}
server = None; page = None

def save(): (a.output/'report.json').write_text(json.dumps(r, ensure_ascii=False, indent=2)+'\n')
def passed(name, data=None):
    r['checks'].append({'name':name, 'data':data}); save(); print('PASS', name, flush=True)
try:
    if not a.content:
        server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(ROOT/'dist')))
        threading.Thread(target=server.serve_forever,daemon=True).start()
    with sync_playwright() as pw:
        launch={'headless':not a.headed, 'args':['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader','--disable-dev-shm-usage']}
        if a.chromium: launch['executable_path']=a.chromium
        browser=pw.chromium.launch(**launch)
        page=browser.new_page(viewport={'width':1280,'height':720},device_scale_factor=1); page.set_default_timeout(90000)
        page.on('pageerror',lambda e:r['errors'].append(str(e)))
        page.on('console',lambda m:(r['externalErrors'] if 'Failed to load resource' in m.text else r['errors']).append(m.text) if m.type=='error' else None)
        page.add_init_script('globalThis.ATLAS_TEST_PAUSE=true;')
        if a.content:
            page.evaluate('globalThis.ATLAS_TEST_PAUSE=true'); page.set_content(html.decode(),wait_until='load')
        else: page.goto(f'http://127.0.0.1:{server.server_port}/{i["artifact"]}',wait_until='load')
        page.wait_for_function('globalThis.ATLAS||globalThis.ATLAS_BOOT_ERROR'); assert not page.evaluate('globalThis.ATLAS_BOOT_ERROR||null')
        page.evaluate("""()=>{globalThis.cucumberEvents=[];for(const e of ['webglcontextlost','webglcontextrestored'])document.querySelector('#scene').addEventListener(e,()=>cucumberEvents.push({event:e,view:ATLAS.state.view,quality:ATLAS.state.quality,time:performance.now()}));}""")
        r['browser']=browser.version
        r['webgl']=page.evaluate("()=>{const g=ATLAS.renderer.engine.getContext(),e=g.getExtension('WEBGL_debug_renderer_info');return {version:g.getParameter(g.VERSION),renderer:e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):g.getParameter(g.RENDERER)}}")
        page.evaluate("Object.assign(ATLAS.state,{motion:false,clock:0,labels:false,characters:false,quality:'balanced',weather:'clear',lighting:'neutral',ao:true,bloom:false,reflections:false})")
        assert page.evaluate('ATLAS.stream.cache.size')==0
        assert page.evaluate("ATLAS.world.meshes.some(m=>m.owner==='cucumber_farm'&&m.overview)&&!ATLAS.world.meshes.some(m=>m.owner==='cucumber_farm'&&!m.overview)")
        passed('Cold start uses crop proxies and permanent paths, not full-detail construction')
        def draw():
            return page.evaluate("()=>{ATLAS.state.labels=false;ATLAS.state.characters=false;ATLAS.renderOnce();return ATLAS.renderer.records.filter(r=>r.wanted&&r.data.owner==='cucumber_farm').map(r=>({far:r.data.overview,part:r.data.cucumberPart,public:r.data.globalSurface}));}")
        def visit(view):
            page.evaluate('v=>ATLAS.setView(v,false)',view)
            assert page.evaluate('ATLAS.state.view')==view
            page.wait_for_function('[...ATLAS.stream.required].every(id=>ATLAS.stream.cache.has(id))',polling=200)
            return draw()
        cold=page.evaluate("()=>{ATLAS.setView('cucumberOverview',false);ATLAS.renderOnce();return {native:ATLAS.stream.pending?.worker instanceof Worker,far:ATLAS.renderer.records.some(r=>r.wanted&&r.data.owner==='cucumber_farm'&&r.data.overview&&!r.data.globalSurface)}}")
        assert cold['native'] and cold['far']; page.wait_for_function("ATLAS.stream.cache.has('cucumber_farm')")
        rows=draw(); assert any(not x['far'] for x in rows); assert not any(x['far'] and not x['public'] for x in rows)
        passed('Native Worker and detail replacement retain the public path',cold)
        page.evaluate("document.body.classList.add('ui-hidden');ATLAS.state.uiHidden=true")
        for view in page.evaluate('Object.keys(GA.CUCUMBER.views)'):
            rows=visit(view); assert rows
            assert page.evaluate("ATLAS.state.space==='surface'&&ATLAS.renderer.sky.visible")
            assert not page.evaluate('ATLAS.renderer.engine.getContext().isContextLost()')
            page.locator('#scene').screenshot(path=str(a.output/(view+'.png')))
            r['views'][view]=page.evaluate('({camera:{eye:ATLAS.rig.eye,target:ATLAS.rig.target,fov:ATLAS.rig.fov},stats:ATLAS.renderer.info().stats,stream:ATLAS.stream.info()})')
            passed('Fixed view '+view,{'visibleRecords':len(rows)})
        rows=visit('cucumberSection'); assert not any(x['part']=='roof' for x in rows)
        rows=visit('cucumberWork'); assert any(x['part']=='roof' for x in rows)
        passed('Sorting-shelter roof restores after inspection without hiding its floor')
        visit('cucumberRows'); page.evaluate('ATLAS.state.vegetation=false'); rows=draw(); assert not any(x['part']=='vines' for x in rows)
        page.evaluate('ATLAS.state.vegetation=true'); rows=draw(); assert any(x['part']=='vines' for x in rows)
        passed('Vegetation toggle hides and restores instanced crops')
        route=page.evaluate('GA.CUCUMBER.paths[0].filter((p,i,a)=>i%Math.ceil(a.length/12)===0||i===a.length-1)')
        for q in route:
            assert page.evaluate("p=>{const y=GA.SurfaceContact.sampler(ATLAS.data,'cucumber_farm').height(...p);ATLAS.rig.setView({space:'surface',eye:[p[0]+6,y+12,p[1]+7],target:[p[0],y+1,p[1]]},false);ATLAS.renderOnce();return ATLAS.renderer.records.some(r=>r.wanted&&r.data.owner==='cucumber_farm'&&r.data.cucumberPart==='path')}",q)
        passed('Mountain approach follows displayed terrain',{'samples':len(route),'collisionSystem':False})
        page.evaluate("document.body.classList.remove('ui-hidden');ATLAS.state.uiHidden=false")
        visit('cucumberOverview'); page.locator('#btn-search').click(); page.locator('#search').fill('胡瓜畑')
        item=page.locator('#results [data-id="cucumber_farm"]'); assert item.count()==1; item.click()
        assert 'P' in page.locator('#detail-design').inner_text(); assert page.locator('#detail-sources a').count()>=2
        assert '工厂' in page.locator('#detail-fact').inner_text()
        relation=page.locator('#detail-relations button').filter(has_text='瀑'); assert relation.count()==1; relation.click()
        assert page.evaluate("ATLAS.state.view===GA.resolveLocation('waterfall_cave').view")
        page.locator('#close-detail').click(); page.locator('#close-drawer').click()
        passed('Alias, corrected evidence, P boundaries and existing cave relationship navigate separately')
        visit('cucumberWork'); before=page.evaluate('ATLAS.rig.eye.slice()')
        page.mouse.move(880,300); page.mouse.down(); page.mouse.move(960,345,steps=8); page.mouse.up(); page.evaluate('ATLAS.rig.update(0)'); draw()
        assert before!=page.evaluate('ATLAS.rig.eye.slice()'); passed('Real mouse orbit')
        visit('cucumberRows'); page.locator('[data-camera-mode="ground"]').click(); assert page.evaluate("ATLAS.rig.mode==='ground'")
        page.locator('[data-camera-mode="fly"]').click(); assert page.evaluate("ATLAS.rig.mode==='fly'")
        page.locator('[data-camera-mode="orbit"]').click(); passed('Ground-height and flight camera modes remain available, not building collision')
        for view in ['mayoOverview','shrineFront','hitenFront','fallsTrack']:
            visit(view); passed('Inherited region return '+view)
        visit('cucumberOverview'); page.locator('#light-night').click(); page.locator('[data-weather="rain"]').click(); draw()
        visit('fallsTrack'); assert not page.evaluate('ATLAS.renderer.rain.visible')
        visit('cucumberWork'); assert page.evaluate("ATLAS.state.weather==='rain'&&ATLAS.state.lighting==='night'&&!ATLAS.renderer.fallsWasActive")
        page.locator('#light-neutral').click(); page.locator('[data-weather="clear"]').click(); draw()
        assert not page.evaluate('ATLAS.renderer.focusLamps.some(l=>l.visible)'); passed('Night/rain retained and tunnel lights restored on returning to the farm')
        # Production scheduling: do not replace normal input with manual draw/GPU waits.
        page.evaluate('globalThis.ATLAS_TEST_PAUSE=false;ATLAS.state.motion=false;ATLAS.wake()')
        for region in ['world','cucumber_farm','mayohiga','cucumber_farm']:
            n=page.evaluate('ATLAS.state.drawnFrames'); page.locator('#region-select').select_option(region)
            page.wait_for_function('n=>ATLAS.state.drawnFrames>n',arg=n)
            page.wait_for_function('!ATLAS.rig.transition&&[...ATLAS.stream.required].every(id=>ATLAS.stream.cache.has(id))')
        page.locator('#view-buttons [data-view="cucumberRows"]').click(); page.wait_for_function("!ATLAS.rig.transition&&ATLAS.state.view==='cucumberRows'")
        page.wait_for_timeout(600); n=page.evaluate('ATLAS.state.drawnFrames'); page.wait_for_timeout(1000); idle=page.evaluate('ATLAS.state.drawnFrames')-n
        assert idle<=2; passed('Production selector, view dock and idle scheduling',{'idleFrames':idle})
        page.evaluate('globalThis.ATLAS_TEST_PAUSE=true'); visit('diorama'); page.evaluate('ATLAS.stream.trim(true)')
        cancel=page.evaluate("()=>{const n=ATLAS.stream.metrics.cancelled;ATLAS.setView('cucumberWork',false);ATLAS.setView('diorama',false);ATLAS.stream.trim(true);return ATLAS.stream.metrics.cancelled-n}")
        assert cancel>=1; passed('Stale native Worker cancelled',cancel)
        cycles=[]
        for _ in range(3):
            visit('cucumberRows'); visit('cucumberWork'); visit('diorama'); page.evaluate('ATLAS.stream.trim(true);ATLAS.renderOnce();ATLAS.renderer.trim(true)')
            x=page.evaluate("()=>({cache:ATLAS.stream.cache.size,detail:ATLAS.renderer.records.filter(r=>r.data.owner==='cucumber_farm'&&!r.data.overview).length,public:ATLAS.world.meshes.filter(m=>m.owner==='cucumber_farm'&&m.globalSurface).length,...ATLAS.renderer.engine.info.memory})")
            assert x['cache']==0 and x['detail']==0 and x['public']==6; cycles.append(x)
        assert max(x['textures'] for x in cycles)-min(x['textures'] for x in cycles)<=2
        passed('Three detail-eviction cycles preserve six public road records',cycles)
        visit('cucumberWork'); page.evaluate('globalThis.ATLAS_TEST_PAUSE=false;ATLAS.wake()')
        page.locator('#btn-settings').click(); page.locator('#quality').select_option('low'); page.locator('#opt-ao').uncheck(); page.locator('#opt-bloom').uncheck(); page.locator('#close-settings').click()
        page.wait_for_timeout(1000); assert page.evaluate('ATLAS.renderer.info().stats.triangles')>0
        assert not page.evaluate('ATLAS.renderer.info().stats.contactOcclusion')
        assert page.evaluate("!ATLAS.renderer.records.some(r=>r.wanted&&r.data.owner==='cucumber_farm'&&['props','produce','herbs'].includes(r.data.cucumberPart))")
        page.locator('#scene').screenshot(path=str(a.output/'cucumber-low-no-post.png')); passed('Production low-quality/no-post switch removes small workbench props')
        page.set_viewport_size({'width':390,'height':844}); page.wait_for_timeout(700)
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+2'); page.screenshot(path=str(a.output/'cucumber-mobile.png')); passed('390px controls and live resize')
        e=page.evaluate('ATLAS.exportState()'); assert e['landmarks']['navigable']==COVERAGE['navigable'] and e['landmarks']['pending']==COVERAGE['pending']
        assert page.evaluate('JSON.parse(document.querySelector("#character-data").textContent).characters.length')==85
        passed(f'{COVERAGE["navigable"]} navigable / {COVERAGE["pending"]} pending / original 85 characters')
        r['contextEvents']=page.evaluate('cucumberEvents'); r['contextLost']=page.evaluate('ATLAS.renderer.engine.getContext().isContextLost()'); r['recovery']=page.evaluate('ATLAS.renderer.info().contextRecovery')
        assert not r['errors'], r['errors']; assert not r['contextEvents'], r['contextEvents']; assert not r['contextLost']
        passed('No post-boot context loss/restoration or JS/shader errors in this session')
        r['passed']=True; browser.close()
except Exception as e:
    r['passed']=False; r['failure']=repr(e); traceback.print_exc()
    try: r['contextEvents']=page.evaluate('globalThis.cucumberEvents||[]') if page else []
    except Exception: pass
finally:
    save()
    if server: server.shutdown()
if not r.get('passed'): raise SystemExit(1)
