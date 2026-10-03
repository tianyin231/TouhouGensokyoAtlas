"""Kourindou visual-pilot WebGL regression. Build first; HTTP is the default.
--content explicitly loads the complete artifact where local HTTP is blocked.
Fixed inspections synchronize the software GPU. The real UI and road traversal
use the normal frame scheduler, without renderOnce or gl.finish in that section.
Context loss is a failure, even if the inherited recovery code restores it.
"""
import argparse, hashlib, json, threading, traceback
from contextlib import contextmanager
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
for source,digest in release['inputs'].items():
    assert hashlib.sha256((ROOT/source).read_bytes()).hexdigest()==digest, 'Stale build input: '+source
release_digest=hashlib.sha256((ROOT/'dist/release.json').read_bytes()).hexdigest()
r = dict(sha256=release['sha256'], viewport=[1280,720], dpr=1, weather='clear', lighting='neutral', clock=0,
         quality='balanced', ao=True, bloom=False, reflections=False, fixedInspectionGPUSync=True,
         loadMode='complete memory document / native Blob Worker' if a.content else 'local HTTP',
         hardwareFPSMeasured=False, checks=[], errors=[], externalErrors=[], contextEvents=[])
server = None; page = None; browser = None

def save():
    temporary=a.output/'report.json.tmp'
    temporary.write_text(json.dumps(r, ensure_ascii=False, indent=2)+'\n')
    temporary.replace(a.output/'report.json')
def passed(name, details=None):
    r['checks'].append(dict(name=name, details=details)); save(); print('PASS', name, flush=True)
def event(e): r['contextEvents'].append(e); save()
def error(message, external=False):
    r['externalErrors' if external else 'errors'].append(str(message)); save()

@contextmanager
def capture_live_failure():
    try:
        yield
    except BaseException:
        if page and not page.is_closed():
            try:
                r['failureState']=page.evaluate("()=>({view:globalThis.ATLAS?.state.view,renderer:globalThis.ATLAS?.renderer.info(),streaming:globalThis.ATLAS?.stream.info(),events:globalThis.__kourindouContextEvents||[]})")
                page.screenshot(path=str(a.output/'failure.png'),timeout=5000)
            except Exception as capture_error:
                r['failureCaptureError']=repr(capture_error)
        save()
        raise
    finally:
        if browser and browser.is_connected(): browser.close()

try:
    if not a.content:
        server = ThreadingHTTPServer(('127.0.0.1', 0), partial(SimpleHTTPRequestHandler, directory=str(ROOT/'dist')))
        threading.Thread(target=server.serve_forever, daemon=True).start()
    with sync_playwright() as pw, capture_live_failure():
        launch = dict(headless=not a.headed, args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader','--disable-dev-shm-usage'])
        if a.chromium: launch['executable_path'] = a.chromium
        browser = pw.chromium.launch(**launch)
        page = browser.new_page(viewport=dict(width=1280,height=720), device_scale_factor=1); page.set_default_timeout(90000)
        page.on('pageerror', lambda e:error(e))
        page.on('crash', lambda *_:error('Chromium page crashed'))
        page.on('console', lambda m:error(m.text,'Failed to load resource' in m.text) if m.type=='error' else None)
        page.expose_function('__kourindouContextEvent', event)
        init=r"""(()=>{globalThis.ATLAS_TEST_PAUSE=true;globalThis.__kourindouContextEvents=[];
          const seen=new WeakSet(),original=HTMLCanvasElement.prototype.getContext;
          HTMLCanvasElement.prototype.getContext=function(...args){
            if(this.id==='scene'&&/^webgl/.test(args[0])&&!seen.has(this)){
              seen.add(this);for(const type of ['webglcontextlost','webglcontextrestored'])this.addEventListener(type,()=>{
                const entry={event:type,view:globalThis.ATLAS?.state.view,quality:globalThis.ATLAS?.state.quality,time:performance.now()};
                __kourindouContextEvents.push(entry);__kourindouContextEvent(entry);
              });
            }return original.apply(this,args);
          };})();"""
        page.add_init_script(init)
        if a.content:
            page.evaluate(init); page.set_content(data.decode(), wait_until='load')
        else: page.goto(f'http://127.0.0.1:{server.server_port}/{release["artifact"]}', wait_until='load')
        page.wait_for_function('globalThis.ATLAS||globalThis.ATLAS_BOOT_ERROR'); assert not page.evaluate('globalThis.ATLAS_BOOT_ERROR||null')
        r['browser'] = browser.version
        r['webgl'] = page.evaluate("()=>{const g=ATLAS.renderer.engine.getContext(),e=g.getExtension('WEBGL_debug_renderer_info');return e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):g.getParameter(g.RENDERER)}")
        page.evaluate("Object.assign(ATLAS.state,{motion:false,clock:0,labels:false,characters:false,quality:'balanced',weather:'clear',lighting:'neutral',ao:true,bloom:false,reflections:false})")
        def inspect():
            state = page.evaluate("""()=>{ATLAS.state.labels=false;ATLAS.state.characters=false;ATLAS.renderOnce();ATLAS.renderer.engine.getContext().finish();const R=ATLAS.renderer;return {view:R.currentOptions.view,lost:R.engine.getContext().isContextLost(),meshes:R.records.filter(r=>r.wanted&&r.item?.mesh.visible&&r.data.component==='kourindou').map(r=>({id:r.data.id,far:r.data.overview})),recovery:R.info().contextRecovery,stats:R.info().stats,gpu:{...R.engine.info.memory,residentAttributeBytes:R.residentBytes},events:__kourindouContextEvents.slice()};}""")
            r['lastRecovery'] = state['recovery']; r['lastFrame']=state
            assert not state['lost'] and not state['events'], 'Context event during fixed inspection'
            assert state['view']==page.evaluate('ATLAS.state.view'), 'Inspection read a different rendered view'
            return state['meshes']
        def visit(v):
            assert page.evaluate('v=>!!GA.PRESETS[v]', v), v
            page.evaluate('v=>ATLAS.setView(v,false)', v)
            page.wait_for_function('!ATLAS.stream.pending&&[...ATLAS.stream.required].every(id=>ATLAS.stream.cache.has(id))', polling=250)
            return inspect()
        assert page.evaluate('ATLAS.stream.cache.size') == 0
        assert page.evaluate("ATLAS.world.meshes.some(m=>m.id.startsWith('kourindou:upgrade:far:'))&&!ATLAS.world.meshes.some(m=>m.id.startsWith('kourindou:upgrade:near:'))")
        assert not page.evaluate("ATLAS.world.meshes.some(m=>m.id.startsWith('overview:forest:kourindou:'))")
        public=page.evaluate("""()=>ATLAS.world.meshes.filter(m=>m.id.startsWith('kourindou:landscape:')||m.id==='landscape:forest-road'||m.globalSurface&&m.component==='connection-road'&&m.pathOwner==='forest').map(m=>({id:m.id,vertices:m.vertices.length,farVertices:m.farVertices?.length||0,instances:m.instances?.length||0,index:m.index?.length||0})).sort((a,b)=>a.id.localeCompare(b.id))""")
        r['publicBefore']=public
        assert any(m['id']=='landscape:forest-road' for m in public)
        assert any(m['id'].startswith('island:routes:forest:') for m in public)
        assert any(m['id']=='kourindou:landscape:roots' and m['farVertices'] for m in public)
        assert any(m['id']=='kourindou:landscape:grasses' and m['farVertices'] for m in public)
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
        visit('kourindouFront'); page.locator('#light-night').click(); inspect()
        night = page.evaluate("""()=>{const R=ATLAS.renderer;return {active:R.nightActive,opaque:R.mats.matte.envMapIntensity,recess:R.mats.hakureiRecess.envMapIntensity,materials:R.kourindouMaterials.map(m=>({name:m.name,intensity:m.envMapIntensity}))};}""")
        assert night['active'] and night['opaque'] < .12 and night['recess'] < .03
        for material in night['materials']:
            assert material['intensity'] == night['recess' if material['name']=='kourindouRecess' else 'opaque'], material
        page.locator('#scene').screenshot(path=str(a.output/'kourindou-night.png'))
        passed('Explicit Kourindou environment maps inherit the surface night intensities', night)
        page.locator('[data-weather="rain"]').click(); inspect()
        assert page.evaluate("ATLAS.renderer.nightActive&&ATLAS.renderer.mats.kourindouWoodX.envMapIntensity===ATLAS.renderer.mats.matte.envMapIntensity")
        visit('windEntry'); assert not page.evaluate('ATLAS.renderer.rain.visible')
        visit('kourindouFront'); assert page.evaluate("ATLAS.state.weather==='rain'&&ATLAS.state.lighting==='night'")
        assert page.evaluate("ATLAS.renderer.mats.kourindouWoodX.envMapIntensity===ATLAS.renderer.mats.matte.envMapIntensity&&ATLAS.renderer.mats.kourindouRecess.envMapIntensity===ATLAS.renderer.mats.hakureiRecess.envMapIntensity")
        page.locator('#light-neutral').click(); page.locator('[data-weather="clear"]').click(); inspect()
        day = page.evaluate("""()=>{const R=ATLAS.renderer;return {active:R.nightActive,materials:R.kourindouMaterials.map(m=>({name:m.name,intensity:m.envMapIntensity}))};}""")
        assert not day['active']
        for material in day['materials']:
            assert material['intensity'] == (.03 if material['name']=='kourindouRecess' else .12), material
        passed('Returning to daylight restores Kourindou material finishes', day)
        passed('Day/night/rain restore through the independent cave; no new local lighting state')
        # Genuine production frame scheduling. Test stepping is NOT a hardware FPS benchmark.
        page.evaluate('globalThis.ATLAS_TEST_PAUSE=false;ATLAS.state.motion=false;ATLAS.wake()')
        for v in ['kourindouRear','kourindouFoot','kourindouPath','kourindouFront']:
            n=page.evaluate('ATLAS.state.drawnFrames'); page.locator('#view-buttons [data-view="'+v+'"]').click()
            page.wait_for_function('expected=>ATLAS.state.drawnFrames>expected.before&&ATLAS.renderer.currentOptions.view===expected.view&&!ATLAS.rig.transition',arg={'before':n,'view':v})
        passed('Real view dock uses the production camera transitions')
        route=page.evaluate("GA.FOREST.paths[0].samples.filter(p=>p[0]>-642&&p[0]<-541).filter((p,i)=>i%2===0)")
        assert len(route)==14, 'The inherited approach must exercise all 14 road samples'
        n=page.evaluate('ATLAS.state.drawnFrames'); road_frames=[]
        for q in route:
            before=page.evaluate('ATLAS.state.drawnFrames')
            requested=page.evaluate("p=>{const y=GA.SurfaceContact.sampler(ATLAS.data,'kourindou').height(...p),eye=[p[0]-2,y+7,p[1]+6],target=[p[0]+8,y+1,p[1]-2];ATLAS.rig.setView({space:'surface',eye,target},false);ATLAS.wake();return{eye,target};}",q)
            page.wait_for_function("expected=>ATLAS.state.drawnFrames>expected.before&&ATLAS.renderer.camera.position.toArray().every((v,i)=>Math.abs(v-expected.eye[i])<1e-7)",arg={**requested,'before':before},polling=200)
            frame=page.evaluate("""()=>{const R=ATLAS.renderer;return{view:R.currentOptions.view,eye:R.camera.position.toArray(),target:ATLAS.rig.target.slice(),frames:ATLAS.state.drawnFrames,stats:R.info().stats,lost:R.engine.getContext().isContextLost(),events:__kourindouContextEvents.slice(),visibleRoads:R.records.filter(r=>r.wanted&&r.item?.mesh.visible&&r.data.globalSurface&&r.data.component==='connection-road').map(r=>r.data.id).sort()};}""")
            assert not frame['lost'] and not frame['events'], frame
            assert frame['visibleRoads'], 'Public route absent at '+repr(q)
            assert frame['target']==requested['target'], 'Route camera was relocated'
            road_frames.append(dict(point=q,**frame))
        passed('Consecutive inherited-road positions drawn by production scheduling with public paths visible', dict(samples=len(route),frames=page.evaluate('ATLAS.state.drawnFrames')-n,positions=road_frames,physicsCollision=False))
        page.locator('#view-buttons [data-view="kourindouFront"]').click(); page.wait_for_function("!ATLAS.rig.transition&&ATLAS.renderer.currentOptions.view==='kourindouFront'&&!ATLAS.stream.pending&&[...ATLAS.stream.required].every(id=>ATLAS.stream.cache.has(id))")
        page.wait_for_timeout(600); n=page.evaluate('ATLAS.state.drawnFrames'); page.wait_for_timeout(1000); idle=page.evaluate('ATLAS.state.drawnFrames')-n
        assert idle<=2; passed('Static view sleeps instead of continuously redrawing',dict(idleFrames=idle))
        page.evaluate('globalThis.ATLAS_TEST_PAUSE=true'); visit('diorama'); page.evaluate('ATLAS.stream.trim(true)')
        cancelled=page.evaluate("()=>{const n=ATLAS.stream.metrics.cancelled;ATLAS.setView('kourindou',false);ATLAS.setView('diorama',false);ATLAS.stream.trim(true);return ATLAS.stream.metrics.cancelled-n}")
        assert cancelled>=1; passed('Obsolete forest worker cancellation',dict(cancelled=cancelled))
        cycles=[]
        for _ in range(3):
            visit('kourindouFront'); visit('diorama'); page.evaluate('ATLAS.stream.trim(true)'); inspect(); page.evaluate('ATLAS.renderer.trim(true)')
            counts=page.evaluate("""()=>({cache:ATLAS.stream.cache.size,shopDetail:ATLAS.renderer.records.filter(r=>r.data.component==='kourindou'&&!r.data.overview).length,public:ATLAS.world.meshes.filter(m=>m.id.startsWith('kourindou:landscape:')).length,publicGeometry:ATLAS.world.meshes.filter(m=>m.id.startsWith('kourindou:landscape:')||m.id==='landscape:forest-road'||m.globalSurface&&m.component==='connection-road'&&m.pathOwner==='forest').map(m=>({id:m.id,vertices:m.vertices.length,farVertices:m.farVertices?.length||0,instances:m.instances?.length||0,index:m.index?.length||0})).sort((a,b)=>a.id.localeCompare(b.id)),publicRecords:ATLAS.renderer.records.filter(r=>r.data.id.startsWith('kourindou:landscape:')||r.data.id==='landscape:forest-road'||r.data.globalSurface&&r.data.component==='connection-road'&&r.data.pathOwner==='forest').map(r=>r.data.id).sort(),contactBytes:ATLAS.data.surfaceContacts.kourindou.near.byteLength+ATLAS.data.surfaceContacts.kourindou.far.byteLength,...ATLAS.renderer.engine.info.memory})""")
            assert counts['cache']==0 and counts['shopDetail']==0 and counts['public']>0; cycles.append(counts)
            assert counts['publicGeometry']==public
            assert counts['publicRecords']==sorted(m['id'] for m in public)
        assert len({x['public'] for x in cycles})==1 and len({x['contactBytes'] for x in cycles})==1
        assert len({x['geometries'] for x in cycles})==1, cycles
        assert max(x['textures'] for x in cycles)-min(x['textures'] for x in cycles)<=2
        passed('Three rebuild/eviction cycles preserve public trees, understory, roots and roads with bounded counts', cycles)
        visit('kourindouFront'); page.evaluate('globalThis.ATLAS_TEST_PAUSE=false;ATLAS.wake()')
        page.locator('#btn-settings').click(); page.locator('#quality').select_option('low'); page.locator('#opt-ao').uncheck(); page.locator('#opt-bloom').uncheck(); page.locator('#close-settings').click(); page.wait_for_timeout(1000)
        page.wait_for_function("ATLAS.renderer.currentOptions.quality==='low'&&ATLAS.renderer.currentOptions.ao===false&&ATLAS.renderer.currentOptions.bloom===false")
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
        assert not page.evaluate('__kourindouContextEvents')
        assert hashlib.sha256((ROOT/'dist/release.json').read_bytes()).hexdigest()==release_digest
        assert hashlib.sha256((ROOT/'dist'/release['artifact']).read_bytes()).hexdigest()==release['sha256']
        for source,digest in release['inputs'].items():
            assert hashlib.sha256((ROOT/source).read_bytes()).hexdigest()==digest, 'Build input changed during browser checks: '+source
        passed('No observed JavaScript/shader errors or context loss in this full session')
        r['passed']=True; browser.close()
except Exception as e:
    r['passed']=False; r['failure']=repr(e); traceback.print_exc()
finally:
    save()
    if server: server.shutdown(); server.server_close()
if not r.get('passed'): raise SystemExit(1)
