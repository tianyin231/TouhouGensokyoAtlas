"""Kourindou visual-pilot WebGL regression. Build first; HTTP is the default.
--content explicitly loads the complete artifact where local HTTP is blocked.
Fixed inspections synchronize the software GPU. The real UI and road traversal
use the normal frame scheduler, without renderOnce or gl.finish in that section.
Context loss is a failure, even if the inherited recovery code restores it.
"""
import argparse, hashlib, json, threading, traceback
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parents[1]
p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--content', action='store_true'); p.add_argument('--headed', action='store_true'); p.add_argument('--chromium')
p.add_argument('--output', type=Path, default=ROOT/'dist/kourindou-browser-check')
a = p.parse_args(); a.output.mkdir(parents=True, exist_ok=True)
release = json.loads((ROOT/'dist/release.json').read_text()); data = (ROOT/'dist'/release['artifact']).read_bytes()
assert hashlib.sha256(data).hexdigest() == release['sha256']
r = dict(sha256=release['sha256'], viewport=[1280,720], dpr=1, weather='clear', lighting='neutral', clock=0,
         quality='balanced', ao=True, bloom=False, reflections=False, fixedInspectionGPUSync=True,
         loadMode='complete memory document / native Blob Worker' if a.content else 'local HTTP',
         hardwareFPSMeasured=False, checks=[], errors=[], externalErrors=[], contextEvents=[])
server = None; page = None

def save(): (a.output/'report.json').write_text(json.dumps(r, ensure_ascii=False, indent=2)+'\n')
def passed(name, details=None):
    r['checks'].append(dict(name=name, details=details)); save(); print('PASS', name, flush=True)
def event(e): r['contextEvents'].append(e); save()
try:
    if not a.content:
        server = ThreadingHTTPServer(('127.0.0.1', 0), partial(SimpleHTTPRequestHandler, directory=str(ROOT/'dist')))
        threading.Thread(target=server.serve_forever, daemon=True).start()
    with sync_playwright() as pw:
        launch = dict(headless=not a.headed, args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader','--disable-dev-shm-usage'])
        if a.chromium: launch['executable_path'] = a.chromium
        browser = pw.chromium.launch(**launch)
        page = browser.new_page(viewport=dict(width=1280,height=720), device_scale_factor=1); page.set_default_timeout(90000)
        page.on('pageerror', lambda e:r['errors'].append(str(e)))
        page.on('console', lambda m:(r['externalErrors'] if 'Failed to load resource' in m.text else r['errors']).append(m.text) if m.type=='error' else None)
        page.expose_function('__kourindouContextEvent', event)
        page.add_init_script('globalThis.ATLAS_TEST_PAUSE=true;')
        if a.content:
            page.evaluate('globalThis.ATLAS_TEST_PAUSE=true'); page.set_content(data.decode(), wait_until='load')
        else: page.goto(f'http://127.0.0.1:{server.server_port}/{release["artifact"]}', wait_until='load')
        page.wait_for_function('globalThis.ATLAS||globalThis.ATLAS_BOOT_ERROR'); assert not page.evaluate('globalThis.ATLAS_BOOT_ERROR||null')
        page.evaluate("""()=>{for(const event of ['webglcontextlost','webglcontextrestored'])document.querySelector('#scene').addEventListener(event,()=>__kourindouContextEvent({event,view:ATLAS.state.view,quality:ATLAS.state.quality,time:performance.now()}));}""")
        r['browser'] = browser.version
        r['webgl'] = page.evaluate("()=>{const g=ATLAS.renderer.engine.getContext(),e=g.getExtension('WEBGL_debug_renderer_info');return e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):g.getParameter(g.RENDERER)}")
        page.evaluate("Object.assign(ATLAS.state,{motion:false,clock:0,labels:false,characters:false,quality:'balanced',weather:'clear',lighting:'neutral',ao:true,bloom:false,reflections:false})")
        def inspect():
            state = page.evaluate("""()=>{ATLAS.state.labels=false;ATLAS.state.characters=false;ATLAS.renderOnce();ATLAS.renderer.engine.getContext().finish();return {lost:ATLAS.renderer.engine.getContext().isContextLost(),meshes:ATLAS.renderer.records.filter(r=>r.wanted&&r.data.component==='kourindou').map(r=>({id:r.data.id,far:r.data.overview})),recovery:ATLAS.renderer.info().contextRecovery};}""")
            r['lastRecovery'] = state['recovery']; assert not state['lost'], 'Context lost during fixed inspection'; return state['meshes']
        def visit(v):
            assert page.evaluate('v=>!!GA.PRESETS[v]', v), v
            page.evaluate('v=>ATLAS.setView(v,false)', v)
            page.wait_for_function('[...ATLAS.stream.required].every(id=>ATLAS.stream.cache.has(id))', polling=250)
            return inspect()
        assert page.evaluate('ATLAS.stream.cache.size') == 0
        assert page.evaluate("ATLAS.world.meshes.some(m=>m.id.startsWith('kourindou:upgrade:far:'))&&!ATLAS.world.meshes.some(m=>m.id.startsWith('kourindou:upgrade:near:'))")
        assert not page.evaluate("ATLAS.world.meshes.some(m=>m.id.startsWith('overview:forest:kourindou:'))")
        passed('Cold start replaces only the old shop proxy, not the entire forest')
        cold = page.evaluate("""()=>{ATLAS.setView('kourindou',false);ATLAS.renderOnce();return {native:ATLAS.stream.pending?.worker instanceof Worker,far:ATLAS.renderer.records.some(r=>r.wanted&&r.data.id.startsWith('kourindou:upgrade:far:'))};}""")
        assert cold['native'] and cold['far']; page.wait_for_function("ATLAS.stream.cache.has('forest')")
        rows = inspect(); assert rows and all(not q['far'] for q in rows)
        assert not page.evaluate("ATLAS.renderer.records.some(r=>r.data.id.startsWith('forest:kourindou:'))")
        passed('Native forest Worker replaces the near shop without overlapping legacy walls', cold)
        leaf = page.evaluate("""()=>{const rs=ATLAS.renderer.records.filter(r=>r.wanted&&r.data.material==='kourindouLeaf');return {visible:rs.length,uv:rs.every(r=>r.item.mesh.geometry.getAttribute('uv')),depth:rs.every(r=>r.item.mesh.customDepthMaterial===ATLAS.renderer.kourindouLeafDepth),mask:rs.every(r=>r.item.mesh.material.alphaMap===ATLAS.renderer.hakureiCardMaterials.hakureiLeaf.alphaMap),replaced:ATLAS.data.kourindouUpgrade.oldMatrices.length,added:ATLAS.data.kourindouUpgrade.newSites.length};}""")
        assert leaf['visible'] and leaf['uv'] and leaf['depth'] and leaf['mask']
        assert page.evaluate('ATLAS.renderer.mats.kourindouLeaf!==ATLAS.renderer.hakureiCardMaterials.hakureiLeaf&&!ATLAS.renderer.mats.kourindouLeaf.alphaToCoverage&&ATLAS.renderer.hakureiCardMaterials.hakureiLeaf.alphaToCoverage')
        assert page.evaluate('ATLAS.renderer.kourindouLeafDepth!==ATLAS.renderer.hakureiCardDepth.hakureiLeaf&&ATLAS.renderer.kourindouLeafDepth.alphaTest===ATLAS.renderer.mats.kourindouLeaf.alphaTest')
        passed('Leaf UV, inherited mask, isolated hard-cutout depth/color state; shrine material unchanged', leaf)
        page.evaluate("document.body.classList.add('ui-hidden');ATLAS.state.uiHidden=true")
        for v in ['kourindou','kourindouFront','kourindouRear','kourindouFoot','kourindouPath']:
            rows=visit(v); assert rows and all(not q['far'] for q in rows)
            page.locator('#scene').screenshot(path=str(a.output/(v+'.png')))
            passed('Actual camera '+v, dict(records=len(rows)))
        page.evaluate("document.body.classList.remove('ui-hidden');ATLAS.state.uiHidden=false")
        visit('kourindou'); page.evaluate('ATLAS.state.vegetation=false'); inspect()
        assert not page.evaluate("ATLAS.renderer.records.some(r=>r.wanted&&r.data.material==='kourindouLeaf')")
        assert page.evaluate("ATLAS.renderer.records.some(r=>r.wanted&&r.data.component==='kourindou')")
        page.evaluate('ATLAS.state.vegetation=true'); inspect(); passed('Vegetation controls leave the actual building and paths intact')
        page.locator('#btn-search').click(); page.locator('#search').fill('香霖堂'); page.locator('#results [data-id="kourindou"]').click()
        assert page.evaluate("ATLAS.state.view==='kourindou'")
        page.locator('#close-detail').click(); page.locator('#close-drawer').click(); passed('Existing catalogue ID still reaches the existing shop location')
        visit('kourindouFront'); before=page.evaluate('ATLAS.rig.eye.slice()')
        page.mouse.move(990,300); page.mouse.down(); page.mouse.move(1055,342,steps=7); page.mouse.up(); page.evaluate('ATLAS.rig.update(0)'); inspect()
        assert before != page.evaluate('ATLAS.rig.eye.slice()'); passed('Actual pointer orbit')
        visit('diorama'); rows=inspect(); assert all(q['far'] for q in rows)
        visit('kourindou'); assert all(not q['far'] for q in inspect()); passed('Overview/detail transition never displays both shop versions')
        for v in ['alice','marisa','shrineFront','geyserOverview','geyserCenterOverview','windEntry']:
            # The centre's exact preset is resolved from the directory, not guessed.
            if v=='geyserCenterOverview': v=page.evaluate("GA.resolveLocation('geyser_center').view")
            visit(v); assert not page.evaluate('ATLAS.renderer.engine.getContext().isContextLost()')
            if v=='geyserOverview': assert page.evaluate("ATLAS.renderer.geyserGround.size>0&&ATLAS.renderer.groundVariant.toString().includes('geyser-ash-v1')")
            passed('Inherited region return '+v)
        visit('kourindouFront'); page.locator('#light-night').click(); page.locator('[data-weather="rain"]').click(); inspect()
        visit('windEntry'); assert not page.evaluate('ATLAS.renderer.rain.visible')
        visit('kourindouFront'); assert page.evaluate("ATLAS.state.weather==='rain'&&ATLAS.state.lighting==='night'")
        page.locator('#light-neutral').click(); page.locator('[data-weather="clear"]').click(); inspect()
        passed('Day/night/rain restore through the independent cave; no new local lighting state')
        # Genuine production frame scheduling. Test stepping is NOT a hardware FPS benchmark.
        page.evaluate('globalThis.ATLAS_TEST_PAUSE=false;ATLAS.state.motion=false;ATLAS.wake()')
        for v in ['kourindouRear','kourindouFoot','kourindouPath','kourindouFront']:
            n=page.evaluate('ATLAS.state.drawnFrames'); page.locator('#view-buttons [data-view="'+v+'"]').click()
            page.wait_for_function('n=>ATLAS.state.drawnFrames>n',arg=n); page.wait_for_function('!ATLAS.rig.transition')
        passed('Real view dock uses the production camera transitions')
        route=page.evaluate("GA.FOREST.paths[0].samples.filter(p=>p[0]>-642&&p[0]<-541).filter((p,i)=>i%2===0)")
        n=page.evaluate('ATLAS.state.drawnFrames')
        for q in route:
            before=page.evaluate('ATLAS.state.drawnFrames')
            page.evaluate("p=>{const y=GA.SurfaceContact.sampler(ATLAS.data,'kourindou').height(...p);ATLAS.rig.setView({space:'surface',eye:[p[0]-2,y+7,p[1]+6],target:[p[0]+8,y+1,p[1]-2]},false);ATLAS.wake();}",q)
            page.wait_for_function('n=>ATLAS.state.drawnFrames>n',arg=before,polling=200)
        passed('Consecutive inherited-road positions drawn by production scheduling', dict(samples=len(route),frames=page.evaluate('ATLAS.state.drawnFrames')-n,physicsCollision=False))
        page.locator('#view-buttons [data-view="kourindouFront"]').click(); page.wait_for_function('!ATLAS.rig.transition&&[...ATLAS.stream.required].every(id=>ATLAS.stream.cache.has(id))')
        page.wait_for_timeout(600); n=page.evaluate('ATLAS.state.drawnFrames'); page.wait_for_timeout(1000); idle=page.evaluate('ATLAS.state.drawnFrames')-n
        assert idle<=2; passed('Static view sleeps instead of continuously redrawing',dict(idleFrames=idle))
        page.evaluate('globalThis.ATLAS_TEST_PAUSE=true'); visit('diorama'); page.evaluate('ATLAS.stream.trim(true)')
        cancelled=page.evaluate("()=>{const n=ATLAS.stream.metrics.cancelled;ATLAS.setView('kourindou',false);ATLAS.setView('diorama',false);ATLAS.stream.trim(true);return ATLAS.stream.metrics.cancelled-n}")
        assert cancelled>=1; passed('Obsolete forest worker cancellation',dict(cancelled=cancelled))
        cycles=[]
        for _ in range(3):
            visit('kourindouFront'); visit('diorama'); page.evaluate('ATLAS.stream.trim(true)'); inspect(); page.evaluate('ATLAS.renderer.trim(true)')
            counts=page.evaluate("""()=>({cache:ATLAS.stream.cache.size,shopDetail:ATLAS.renderer.records.filter(r=>r.data.component==='kourindou'&&!r.data.overview).length,public:ATLAS.world.meshes.filter(m=>m.id.startsWith('kourindou:landscape:')).length,contactBytes:ATLAS.data.surfaceContacts.kourindou.near.byteLength+ATLAS.data.surfaceContacts.kourindou.far.byteLength,...ATLAS.renderer.engine.info.memory})""")
            assert counts['cache']==0 and counts['shopDetail']==0 and counts['public']>0; cycles.append(counts)
        assert len({x['public'] for x in cycles})==1 and len({x['contactBytes'] for x in cycles})==1
        assert max(x['textures'] for x in cycles)-min(x['textures'] for x in cycles)<=2
        passed('Three rebuild/eviction cycles preserve the public trees and bounded counts', cycles)
        visit('kourindouFront'); page.evaluate('globalThis.ATLAS_TEST_PAUSE=false;ATLAS.wake()')
        page.locator('#btn-settings').click(); page.locator('#quality').select_option('low'); page.locator('#opt-ao').uncheck(); page.locator('#opt-bloom').uncheck(); page.locator('#close-settings').click(); page.wait_for_timeout(1000)
        assert not page.evaluate('ATLAS.renderer.info().stats.contactOcclusion')
        assert page.evaluate("ATLAS.renderer.records.some(r=>r.wanted&&r.data.component==='kourindou')")
        levels=page.evaluate("ATLAS.renderer.records.filter(r=>r.wanted&&r.data.material==='kourindouLeaf').map(r=>r.level)")
        assert levels and all(v==1 for v in levels)
        page.locator('#scene').screenshot(path=str(a.output/'kourindou-low-no-post.png')); passed('Real low-quality controls use lower-detail leaf geometry, without AO/bloom')
        page.set_viewport_size(dict(width=390,height=844)); page.wait_for_timeout(750)
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+2')
        page.screenshot(path=str(a.output/'kourindou-mobile.png')); passed('390px layout and normal resize scheduling')
        audit=page.evaluate('ATLAS.exportState().landmarks'); assert audit['navigable']==109 and audit['pending']==70
        assert page.evaluate('JSON.parse(document.querySelector("#character-data").textContent).characters.length')==85
        passed('109/70 coverage and original 85 character records unchanged')
        r['recovery']=page.evaluate('ATLAS.renderer.info().contextRecovery'); r['contextLost']=page.evaluate('ATLAS.renderer.engine.getContext().isContextLost()')
        assert not r['errors'],r['errors']; assert not r['contextEvents'],r['contextEvents']; assert not r['contextLost']; assert r['recovery']['lost']==0
        passed('No observed JavaScript/shader errors or context loss in this full session')
        r['passed']=True; browser.close()
except Exception as e:
    r['passed']=False; r['failure']=repr(e); traceback.print_exc()
finally:
    save()
    if server: server.shutdown()
if not r.get('passed'): raise SystemExit(1)
