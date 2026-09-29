"""Optional Playwright/WebGL test. Default: real local HTTP; --content is explicitly separate.
Build first. Optional --headed --chromium /usr/bin/chromium for Xvfb environments.
"""
from pathlib import Path
import argparse, hashlib, json, threading
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--content',action='store_true');p.add_argument('--headed',action='store_true');p.add_argument('--chromium');p.add_argument('--output',type=Path,default=ROOT/'dist/backdoor-browser-check')
a=p.parse_args();a.output.mkdir(parents=True,exist_ok=True)
info=json.loads((ROOT/'dist/release.json').read_text());html=(ROOT/'dist'/info['artifact']).read_bytes();assert hashlib.sha256(html).hexdigest()==info['sha256']
report={'artifact':info['artifact'],'sha256':info['sha256'],'loadMode':'about:blank content / native Blob Worker' if a.content else 'local HTTP','checks':[],'errors':[],'externalResourceErrors':[],'viewport':[1280,900],'dpr':1,'hardwarePerformanceMeasured':False}
server=None
try:
 if not a.content:
  server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(ROOT/'dist')));threading.Thread(target=server.serve_forever,daemon=True).start()
 with sync_playwright() as pw:
  launch={'headless':not a.headed,'args':['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader','--disable-dev-shm-usage']}
  if a.chromium:launch['executable_path']=a.chromium
  browser=pw.chromium.launch(**launch);page=browser.new_page(viewport={'width':1280,'height':900},device_scale_factor=1);page.set_default_timeout(90000)
  page.on('pageerror',lambda e:report['errors'].append(str(e)))
  page.on('console',lambda m:(report['externalResourceErrors'] if 'Failed to load resource' in m.text else report['errors']).append(m.text) if m.type=='error' else None)
  page.add_init_script('globalThis.ATLAS_TEST_PAUSE=true;')
  if a.content:
   page.goto('about:blank');page.evaluate('globalThis.ATLAS_TEST_PAUSE=true');page.set_content(html.decode(),wait_until='load',timeout=90000)
  else:page.goto(f'http://127.0.0.1:{server.server_port}/{info["artifact"]}',wait_until='load')
  page.wait_for_function('!!globalThis.ATLAS||!!globalThis.ATLAS_BOOT_ERROR');assert page.evaluate('globalThis.ATLAS_BOOT_ERROR||null') is None
  report['browser']=browser.version
  report['webgl']=page.evaluate("()=>{const g=ATLAS.renderer.engine.getContext(),e=g.getExtension('WEBGL_debug_renderer_info');return {version:g.getParameter(g.VERSION),renderer:e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):g.getParameter(g.RENDERER)}}")
  def passed(name,data=None):
   report['checks'].append({'name':name,'data':data});print(name,data or '',flush=True)
  def draw():
   return page.evaluate("()=>{ATLAS.state.motion=false;ATLAS.state.characters=false;ATLAS.state.labels=false;ATLAS.renderOnce();return ATLAS.renderer.records.filter(r=>r.wanted).map(r=>({owner:r.data.owner,far:r.data.overview,part:r.data.backdoorPart,edition:r.data.backdoorEdition,state:r.data.backdoorState}));}")
  def visit(view,region=None):
   page.evaluate('v=>ATLAS.setView(v,false)',view)
   if region:page.wait_for_function('id=>ATLAS.stream.cache.has(id)',arg=region,polling=250)
   return draw()
  assert page.evaluate('ATLAS.stream.cache.size')==0
  assert page.evaluate('ATLAS.renderer.backdoorWindowTargets.length')==0
  assert not page.evaluate("ATLAS.renderer.records.some(r=>r.wanted&&r.data.owner==='backdoor')")
  passed('Cold surface has no backdoor detail or window render targets')
  proxy=page.evaluate("()=>{ATLAS.setView('backdoorOverview',false);ATLAS.renderOnce();return{native:ATLAS.stream.pending?.worker instanceof Worker,far:ATLAS.renderer.records.filter(r=>r.wanted&&r.data.owner==='backdoor'&&r.data.overview).length};}")
  assert proxy['native'] and proxy['far'];page.wait_for_function("ATLAS.stream.cache.has('backdoor')",polling=250)
  rows=draw();assert rows and all(x['owner']=='backdoor' and not x['far'] for x in rows)
  assert page.evaluate('ATLAS.renderer.backdoorWindowTargets.length')==4
  passed('Native Worker replaces proxy; four deferred 3D tableaux targets',proxy)
  for view in page.evaluate('Object.keys(GA.BACKDOOR.views)'):
   rows=visit(view,'backdoor');assert rows and all(x['owner']=='backdoor' for x in rows)
   six=view=='backdoorSix';assert all(x['edition'] in ['both','six' if six else 'hall'] for x in rows)
   if six:assert not any(x['part'] in ['floor','ceiling','window','dais','seat'] for x in rows)
   if view=='backdoorClosed':assert not any(x['part']=='window' for x in rows)
   if view in ['backdoorOverview','backdoorSpring','backdoorSix','backdoorSeat','backdoorWinter','backdoorHinges']:page.screenshot(path=str(a.output/(view+'.png')))
   passed('Preset '+view,{'visibleMeshes':len(rows)})
  visit('backdoorSpring','backdoor');page.locator('#backdoor-door').click();rows=draw();assert not any(x['part']=='window' for x in rows)
  page.locator('#backdoor-door').click();rows=draw();assert any(x['part']=='window' for x in rows)
  page.locator('#backdoor-ceiling').click();rows=draw();assert not any(x['part']=='ceiling' for x in rows)
  visit('backdoorOverview','backdoor');assert not page.evaluate('ATLAS.state.backdoorCutaway||ATLAS.state.backdoorClosed')
  passed('Real door and ceiling controls; ordinary preset restores both')
  before=page.evaluate('ATLAS.renderer.backdoorWindowBuildPasses');draw();draw();assert page.evaluate('ATLAS.renderer.backdoorWindowBuildPasses')==before
  assert page.evaluate('ATLAS.renderer.backdoorWindowPassesThisFrame')==0
  passed('Seasonal windows do not render extra passes each frame',{'targets':4,'steadyStateExtraPasses':0})
  visit('backdoorSix','backdoor');page.evaluate('ATLAS.state.clock=37.25;ATLAS.renderOnce()');im=page.locator('#scene').screenshot();page.evaluate('ATLAS.renderOnce()');assert im==page.locator('#scene').screenshot()
  page.evaluate('ATLAS.state.clock=51;ATLAS.renderOnce()');assert im!=page.locator('#scene').screenshot()
  passed('Nonzero shared clock pauses in place; haze and dust pixels change with time')
  page.locator('#btn-search').click();page.locator('#search').fill('Ushirodo');assert page.locator('#results [data-id="backdoor"]').count()==1
  page.locator('#results [data-id="backdoor"]').click();assert 'P' in page.locator('#detail-design').inner_text();assert page.locator('#detail-sources a').count()>=3
  page.locator('#close-detail').click();page.locator('#close-drawer').click()
  for id in ['okina','satono','mai_teireida']:
   page.evaluate('id=>ATLAS.characters.select(id,false)',id);draw();assert page.evaluate('ATLAS.state.space')=='backdoor';assert '原作图待核' in page.locator('#character-portrait').inner_text()
   assert page.evaluate('id=>{const c=ATLAS.characters.data.find(c=>c.id===id);return JSON.stringify(c.position)===JSON.stringify(c.runtimePosition)}',id)
   page.locator('#close-character-detail').click()
  passed('Alias, provenance and three exact independent-space character positions')
  visit('backdoorSix','backdoor');page.evaluate('ATLAS.state.characters=true;ATLAS.renderOnce()')
  assert page.evaluate("ATLAS.characters.elements.filter(e=>e.cs[0].period==='backdoor_dancer').every(e=>e.el.hidden)")
  passed('Dancer annotations are excluded from the stage-six selection')
  visit('backdoorSpring','backdoor');before=page.evaluate('ATLAS.rig.eye.slice()');page.mouse.move(995,340);page.mouse.down();page.mouse.move(1095,398,steps=6);page.mouse.up();page.evaluate('ATLAS.rig.update(0);ATLAS.renderOnce()');assert page.evaluate('ATLAS.rig.eye.slice()')!=before
  assert page.locator('[data-camera-mode="ground"]').is_disabled();page.locator('[data-camera-mode="fly"]').click();assert page.evaluate('ATLAS.rig.mode')=='fly';page.locator('[data-camera-mode="orbit"]').click()
  passed('Real orbit and inherited free flight; surface-only ground mode stays disabled')
  for view,region in [('shrineDiorama','hakurei'),('primateCore','primate_core'),('heavenPavilion','heaven'),('hakugyokuHall','netherworld'),('liminalMarket','shigan'),('moonTeaRoom','lunar'),('dreamWithin','kaian'),('pandemoniumHall','makai05'),('hellHall','oldhell'),('forest','forest')]:
   rows=visit(view,region);assert not any(x['owner']=='backdoor' for x in rows);assert not page.evaluate('ATLAS.renderer.backdoorSky.visible');passed('Cross-chart return '+view)
  visit('shrineDiorama','hakurei');page.locator('[data-weather="rain"]').click();page.locator('#light-dusk').click();draw();visit('backdoorOverview','backdoor');assert not page.evaluate('ATLAS.renderer.rain.visible||ATLAS.renderer.sky.visible')
  visit('shrineDiorama','hakurei');assert page.evaluate('ATLAS.state.weather')=='rain' and page.evaluate('ATLAS.state.lighting')=='dusk'
  passed('Surface climate selection survives independent-space visit')
  # The production scheduler runs here: no manual renderOnce or gl.finish in this section.
  page.evaluate('globalThis.ATLAS_TEST_PAUSE=false;ATLAS.state.motion=true;ATLAS.wake()')
  for selector in ['#btn-backdoor','#btn-overview','#btn-animal','#btn-backdoor','#btn-overview']:
   frames=page.evaluate('ATLAS.state.drawnFrames');page.locator(selector).click();page.wait_for_function('n=>ATLAS.state.drawnFrames>n+1',arg=frames,polling=250)
  page.evaluate('globalThis.ATLAS_TEST_PAUSE=true;ATLAS.state.motion=false');page.wait_for_timeout(500)
  assert not report['errors'],'\n'.join(report['errors'])[:3000]
  passed('Production animated toolbar switching without synchronized test rendering')
  visit('diorama');page.evaluate('ATLAS.stream.trim(true);ATLAS.renderOnce()');assert page.evaluate('ATLAS.renderer.backdoorWindowTargets.length')==0
  cancel=page.evaluate("()=>{const s=ATLAS.stream,b=s.metrics.cancelled;ATLAS.setView('backdoorOverview',false);ATLAS.setView('diorama',false);s.trim(true);return s.metrics.cancelled-b}")
  assert cancel>=1;passed('Real Worker cancellation; detail eviction releases four render targets')
  cycles=[]
  for n in range(3):
   visit('backdoorSpring','backdoor');assert page.evaluate('ATLAS.renderer.backdoorWindowTargets.length')==4
   visit('diorama');page.evaluate('ATLAS.stream.trim(true);ATLAS.renderOnce();ATLAS.renderer.trim(true)')
   snap=page.evaluate("()=>({cache:ATLAS.stream.cache.size,targets:ATLAS.renderer.backdoorWindowTargets.length,detail:ATLAS.renderer.records.filter(r=>r.data.owner==='backdoor'&&!r.data.overview).length,...ATLAS.renderer.engine.info.memory})")
   assert snap['cache']==0 and snap['targets']==0 and snap['detail']==0;cycles.append(snap)
  assert max(s['textures'] for s in cycles)-min(s['textures'] for s in cycles)<=2
  assert max(s['geometries'] for s in cycles)-min(s['geometries'] for s in cycles)<=2
  passed('Three unload/revisit cycles with bounded GPU resource counts',cycles)
  visit('backdoorOverview','backdoor');page.locator('#btn-settings').click();page.locator('#quality').select_option('low');page.locator('#opt-ao').uncheck();page.locator('#opt-bloom').uncheck();draw();page.locator('#close-settings').click()
  page.set_viewport_size({'width':390,'height':844});draw();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1');page.screenshot(path=str(a.output/'narrow-backdoor.png'))
  passed('Low quality with AO/bloom disabled and narrow viewport controls')
  export=page.evaluate('ATLAS.exportState()');assert export['backdoorModule']=='0.25.0';assert export['landmarks']['navigable']==87 and export['landmarks']['pending']==92
  assert export['displayTransforms']['backdoor']=={'scale':1,'offset':[0,0,0]};passed('Export and shared audit agree on 87/92 coverage')
  assert not report['errors'],'\n'.join(report['errors'])[:3000];report['passed']=True;browser.close()
except Exception as e:
 report['passed']=False;report['failure']=str(e);raise
finally:
 if server:server.shutdown()
 (a.output/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
