"""Mountain geyser WebGL regression. HTTP default; explicit --content fallback.
Fixed inspection frames are manually drawn, normal controls and the continuous
camera traversal use the production scheduler. Any context loss fails this run.
This script does not measure hardware FPS or a physical fluid/collision model.
"""
import argparse, hashlib, json, threading, traceback
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
COVERAGE=json.loads((ROOT/'tools/current-coverage.json').read_text())
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--content',action='store_true');p.add_argument('--headed',action='store_true');p.add_argument('--chromium')
p.add_argument('--output',type=Path,default=ROOT/'dist/geyser-browser-check')
a=p.parse_args();a.output.mkdir(parents=True,exist_ok=True)
release=json.loads((ROOT/'dist/release.json').read_text());html=(ROOT/'dist'/release['artifact']).read_bytes()
assert hashlib.sha256(html).hexdigest()==release['sha256']
r={'sha256':release['sha256'],'loadMode':'complete memory document / native Blob Worker' if a.content else 'local HTTP','viewport':[1280,720],'dpr':1,'quality':'balanced','lighting':'neutral','weather':'clear','clock':0,'ao':True,'bloom':False,'reflections':False,'hardwareFPSMeasured':False,'checks':[],'views':{},'errors':[],'externalErrors':[],'contextEvents':[]}
page=None;server=None

def save(): (a.output/'report.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
def passed(name,data=None):
 r['checks'].append({'name':name,'data':data});save();print('PASS',name,flush=True)
try:
 if not a.content:
  server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(ROOT/'dist')))
  threading.Thread(target=server.serve_forever,daemon=True).start()
 with sync_playwright() as pw:
  launch={'headless':not a.headed,'args':['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']}
  if a.chromium:launch['executable_path']=a.chromium
  browser=pw.chromium.launch(**launch);page=browser.new_page(viewport={'width':1280,'height':720},device_scale_factor=1);page.set_default_timeout(90000)
  page.on('pageerror',lambda e:r['errors'].append(str(e)))
  page.on('console',lambda m:(r['externalErrors'] if 'Failed to load resource' in m.text else r['errors']).append(m.text) if m.type=='error' else None)
  page.add_init_script('globalThis.ATLAS_TEST_PAUSE=true;')
  if a.content:
   page.evaluate('globalThis.ATLAS_TEST_PAUSE=true');page.set_content(html.decode(),wait_until='load')
  else:page.goto(f'http://127.0.0.1:{server.server_port}/{release["artifact"]}',wait_until='load')
  page.wait_for_function('globalThis.ATLAS||globalThis.ATLAS_BOOT_ERROR');assert not page.evaluate('globalThis.ATLAS_BOOT_ERROR||null')
  page.evaluate("()=>{globalThis.springEvents=[];for(const event of ['webglcontextlost','webglcontextrestored'])document.querySelector('#scene').addEventListener(event,()=>springEvents.push({event,view:ATLAS.state.view,quality:ATLAS.state.quality,time:performance.now()}));}")
  r['browser']=browser.version;r['webgl']=page.evaluate("()=>{const g=ATLAS.renderer.engine.getContext(),e=g.getExtension('WEBGL_debug_renderer_info');return e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):g.getParameter(g.RENDERER)}")
  page.evaluate("Object.assign(ATLAS.state,{motion:false,clock:0,labels:false,characters:false,quality:'balanced',lighting:'neutral',weather:'clear',ao:true,bloom:false,reflections:false})")
  assert page.evaluate('ATLAS.stream.cache.size')==0
  assert page.evaluate("ATLAS.world.meshes.some(m=>m.owner==='geyser_mountain'&&m.overview)&&!ATLAS.world.meshes.some(m=>m.owner==='geyser_mountain'&&!m.overview)")
  passed('Cold overview does not construct the new full-detail region')
  def draw():
   return page.evaluate("()=>{ATLAS.state.labels=false;ATLAS.state.characters=false;ATLAS.renderOnce();return ATLAS.renderer.records.filter(r=>r.wanted&&r.data.owner==='geyser_mountain').map(r=>({far:r.data.overview,part:r.data.geyserPart,public:r.data.globalSurface}));}")
  def visit(v):
   assert page.evaluate('v=>!!GA.PRESETS[v]',v),v
   page.evaluate('v=>ATLAS.setView(v,false)',v)
   page.wait_for_function('[...ATLAS.stream.required].every(id=>ATLAS.stream.cache.has(id))',polling=200)
   return draw()
  cold=page.evaluate("()=>{ATLAS.setView('geyserOverview',false);ATLAS.renderOnce();return {native:ATLAS.stream.pending?.worker instanceof Worker,far:ATLAS.renderer.records.some(r=>r.wanted&&r.data.owner==='geyser_mountain'&&r.data.overview&&!r.data.globalSurface)}}")
  assert cold['native'] and cold['far'];page.wait_for_function('[...ATLAS.stream.required].every(id=>ATLAS.stream.cache.has(id))');rows=draw()
  assert any(not q['far'] for q in rows) and not any(q['far'] and not q['public'] for q in rows)
  assert page.evaluate("ATLAS.stream.cache.has('forest')")
  passed('Native Worker detail replaces proxies while retaining neighbouring forest and public paths',cold)
  page.evaluate("document.body.classList.add('ui-hidden');ATLAS.state.uiHidden=true")
  for view in page.evaluate('Object.keys(GA.GEYSER.views)'):
   assert visit(view);assert not page.evaluate('ATLAS.renderer.engine.getContext().isContextLost()');assert page.evaluate('ATLAS.renderer.sky.visible')
   page.evaluate('ATLAS.renderOnce();ATLAS.renderOnce()')
   frames=[page.evaluate('()=>{ATLAS.renderer.engine.shadowMap.needsUpdate=true;ATLAS.renderOnce();return ATLAS.renderer.info().stats}') for _ in range(3)]
   assert len({(f['calls'],f['triangles']) for f in frames})==1
   page.locator('#scene').screenshot(path=str(a.output/(view+'.png')))
   r['views'][view]={'camera':page.evaluate('({eye:ATLAS.rig.eye,target:ATLAS.rig.target,fov:ATLAS.rig.fov})'),'frames':frames}
   passed('Fixed camera '+view)
  assert not any(q['part'] in ['steam','jet'] for q in draw())
  rows=visit('geyserRim');assert any(q['part']=='steam' for q in rows)
  passed('Structural inspection reversibly hides only steam and spray')
  visit('geyserOmen');assert page.evaluate('ATLAS.renderer.geyserOmen.value')==1
  visit('geyserOverview');assert page.evaluate('ATLAS.renderer.geyserOmen.value')==0
  passed('Red-light historical selection leaves normal daylight and water intact on return')
  visit('geyserRim');page.evaluate('ATLAS.state.clock=17.25');draw();draw();first=page.locator('#scene').screenshot();draw();assert first==page.locator('#scene').screenshot()
  page.evaluate('ATLAS.state.clock=22.75');draw();assert first!=page.locator('#scene').screenshot();page.evaluate('ATLAS.state.clock=0');draw()
  passed('Steam and spray pause at a nonzero shared-clock phase and change when time advances')
  route=page.evaluate('GA.GEYSER.approach.filter((p,i,a)=>i%Math.ceil(a.length/12)===0||i===a.length-1)')
  for q in route:
   assert page.evaluate("p=>{const y=GA.SurfaceContact.sampler(ATLAS.data,'geyser_mountain').height(...p);ATLAS.rig.setView({space:'surface',eye:[p[0]+6,y+9,p[1]+7],target:[p[0],y+.6,p[1]]},false);ATLAS.renderOnce();return ATLAS.renderer.records.some(r=>r.wanted&&r.data.owner==='geyser_mountain'&&r.data.geyserPart==='path')}",q)
  passed('Approach samples remain on continuous ground',{'samples':len(route),'physicsCollision':False})
  # Real requestAnimationFrame camera travel, without manual renderOnce/GPU waits.
  page.evaluate('globalThis.ATLAS_TEST_PAUSE=false')
  travel=page.evaluate("""async()=>{const path=GA.GEYSER.approach,t=GA.SurfaceContact.sampler(ATLAS.data,'geyser_mountain'),before=ATLAS.state.drawnFrames;
   for(let i=0;i<48;i++){const q=path[Math.round(i*(path.length-1)/47)],y=t.height(...q);ATLAS.rig.setView({space:'surface',eye:[q[0]+6,y+8,q[1]+7],target:[q[0],y+1,q[1]]},false);ATLAS.wake();await new Promise(requestAnimationFrame);}
   return {frames:ATLAS.state.drawnFrames-before,samples:48,space:ATLAS.state.space};}""")
  assert travel['frames']>10 and travel['space']=='surface';page.evaluate('globalThis.ATLAS_TEST_PAUSE=true');visit('geyserOverview')
  passed('Continuous 48-position camera traversal uses production frame scheduling',travel)
  page.evaluate("document.body.classList.remove('ui-hidden');ATLAS.state.uiHidden=false")
  page.locator('#btn-search').click();page.locator('#search').fill('地獄谷');entry=page.locator('#results [data-id="geyser_mountain"]');assert entry.count()==1;entry.click()
  assert 'P' in page.locator('#detail-design').inner_text() and page.locator('#detail-sources a').count()>=3
  assert '不是熔岩' in page.locator('#detail-fact').inner_text();page.locator('#close-detail').click();page.locator('#close-drawer').click()
  assert page.evaluate("GA.resolveLocation('geyser_shrine').view===null&&GA.resolveLocation('geyser_center').view===null")
  passed('Alias and sourced description distinguish the unbuilt shrine spring and underground centre')
  visit('geyserRim');before=page.evaluate('ATLAS.rig.eye.slice()');page.mouse.move(940,330);page.mouse.down();page.mouse.move(1010,370,steps=7);page.mouse.up();page.evaluate('ATLAS.rig.update(0)');draw();assert before!=page.evaluate('ATLAS.rig.eye.slice()');passed('Real pointer orbit')
  for view in ['forest','windEntry','fallsTrack','shrineFront']:
   visit(view);assert not page.evaluate('ATLAS.renderer.engine.getContext().isContextLost()');passed('Inherited region return '+view)
  visit('geyserOverview');page.locator('#light-night').click();page.locator('[data-weather="rain"]').click();draw();visit('windEntry');assert not page.evaluate('ATLAS.renderer.rain.visible')
  visit('geyserRim');assert page.evaluate("ATLAS.state.lighting==='night'&&ATLAS.state.weather==='rain'");page.locator('#light-neutral').click();page.locator('[data-weather="clear"]').click();draw()
  passed('Day/night/rain choices survive underground round trip without new point lights')
  page.evaluate('globalThis.ATLAS_TEST_PAUSE=false;ATLAS.state.motion=false;ATLAS.wake()')
  for region in ['world','geyser_mountain','forest','geyser_mountain']:
   n=page.evaluate('ATLAS.state.drawnFrames');page.locator('#region-select').select_option(region);page.wait_for_function('n=>ATLAS.state.drawnFrames>n',arg=n);page.wait_for_function('!ATLAS.rig.transition&&[...ATLAS.stream.required].every(id=>ATLAS.stream.cache.has(id))')
  page.locator('#view-buttons [data-view="geyserWater"]').click();page.wait_for_function("!ATLAS.rig.transition&&ATLAS.state.view==='geyserWater'");page.wait_for_timeout(600);n=page.evaluate('ATLAS.state.drawnFrames');page.wait_for_timeout(1000);idle=page.evaluate('ATLAS.state.drawnFrames')-n;assert idle<=2
  passed('Normal region/view selectors and idle scheduling',{'idleFrames':idle})
  page.evaluate('globalThis.ATLAS_TEST_PAUSE=true');visit('diorama');page.evaluate('ATLAS.stream.trim(true)')
  cancelled=page.evaluate("()=>{const n=ATLAS.stream.metrics.cancelled;ATLAS.setView('geyserOverview',false);ATLAS.setView('diorama',false);ATLAS.stream.trim(true);return ATLAS.stream.metrics.cancelled-n}");assert cancelled>=1;passed('Stale native Worker cancellation',cancelled)
  cycles=[]
  for _ in range(3):
   visit('geyserRim');visit('diorama');page.evaluate('ATLAS.stream.trim(true);ATLAS.renderOnce();ATLAS.renderer.trim(true)')
   d=page.evaluate("()=>({cache:ATLAS.stream.cache.size,detail:ATLAS.renderer.records.filter(r=>r.data.owner==='geyser_mountain'&&!r.data.overview).length,public:ATLAS.world.meshes.filter(m=>m.owner==='geyser_mountain'&&m.globalSurface).length,...ATLAS.renderer.engine.info.memory})");assert d['cache']==0 and d['detail']==0 and d['public']>0;cycles.append(d)
  assert len({d['public'] for d in cycles})==1;assert max(d['textures'] for d in cycles)-min(d['textures'] for d in cycles)<=2
  passed('Three eviction cycles retain public paths and bounded texture counts',cycles)
  visit('geyserRim');page.evaluate('globalThis.ATLAS_TEST_PAUSE=false;ATLAS.wake()');page.locator('#btn-settings').click();page.locator('#quality').select_option('low');page.locator('#opt-ao').uncheck();page.locator('#opt-bloom').uncheck();page.locator('#close-settings').click();page.wait_for_timeout(1000)
  assert page.evaluate('ATLAS.renderer.info().stats.triangles')>0;assert not page.evaluate('ATLAS.renderer.info().stats.contactOcclusion');page.locator('#scene').screenshot(path=str(a.output/'geyser-low-no-post.png'));passed('Low quality without AO/bloom still renders actual pool banks')
  page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(700);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+2');page.screenshot(path=str(a.output/'geyser-mobile.png'));passed('390px controls and live resize')
  audit=page.evaluate('ATLAS.exportState().landmarks');assert audit['navigable']==COVERAGE['navigable'] and audit['pending']==COVERAGE['pending'];assert page.evaluate('JSON.parse(document.querySelector("#character-data").textContent).characters.length')==85;passed(f'{COVERAGE["navigable"]} navigable / {COVERAGE["pending"]} pending; original 85 characters preserved')
  r['contextEvents']=page.evaluate('springEvents');r['contextLost']=page.evaluate('ATLAS.renderer.engine.getContext().isContextLost()');r['recovery']=page.evaluate('ATLAS.renderer.info().contextRecovery')
  assert not r['errors'],r['errors'];assert not r['contextEvents'],r['contextEvents'];assert not r['contextLost'];assert r['recovery']['lost']==0
  passed('No JS/shader error or context loss in this serial session');r['passed']=True;browser.close()
except Exception as e:
 r['passed']=False;r['failure']=repr(e);traceback.print_exc()
 try:r['contextEvents']=page.evaluate('globalThis.springEvents||[]') if page else []
 except Exception:pass
finally:
 save()
 if server:server.shutdown()
if not r.get('passed'):raise SystemExit(1)
