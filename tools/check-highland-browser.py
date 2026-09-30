"""Highland integration regression. HTTP by default; optional explicit --content fallback.
Requires Playwright/Chromium only for this test, not for the offline build.
"""
import argparse, hashlib, json, threading
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--content',action='store_true');p.add_argument('--headed',action='store_true');p.add_argument('--chromium');p.add_argument('--output',type=Path,default=ROOT/'dist/highland-browser-check');a=p.parse_args();a.output.mkdir(parents=True,exist_ok=True)
info=json.loads((ROOT/'dist/release.json').read_text());html=(ROOT/'dist'/info['artifact']).read_bytes();assert hashlib.sha256(html).hexdigest()==info['sha256']
report={'artifact':info['artifact'],'sha256':info['sha256'],'loadMode':'about:blank content / native Blob Worker' if a.content else 'local HTTP','checks':[],'errors':[],'externalResourceErrors':[],'hardwarePerformanceMeasured':False,'viewport':[1280,900],'dpr':1};server=None
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
  def draw(markers=False):
   return page.evaluate("m=>{ATLAS.state.motion=false;ATLAS.state.labels=false;ATLAS.state.characters=m;ATLAS.renderOnce();return ATLAS.renderer.records.filter(r=>r.wanted&&r.data.owner==='highland').map(r=>({far:r.data.overview,part:r.data.highlandPart,public:r.data.highlandPublic}));}",markers)
  def visit(v,region=None):
   page.evaluate('v=>ATLAS.setView(v,false)',v)
   if region:page.wait_for_function('id=>ATLAS.stream.cache.has(id)',arg=region,polling=200)
   return draw()
  assert page.evaluate('ATLAS.stream.cache.size')==0
  assert page.evaluate("ATLAS.world.meshes.some(m=>m.owner==='highland'&&m.overview)")
  passed('Cold island contains public highland ground and lightweight houses, no detail build')
  x=page.evaluate("()=>{ATLAS.setView('denFront',false);ATLAS.renderOnce();return {native:ATLAS.stream.pending?.worker instanceof Worker,far:ATLAS.renderer.records.some(r=>r.wanted&&r.data.owner==='highland'&&r.data.overview&&!r.data.highlandPublic)};}")
  assert x['native'] and x['far'];page.wait_for_function("ATLAS.stream.cache.has('highland')",polling=200)
  rows=draw();assert any(not r['far'] for r in rows);assert not any(r['far'] and not r['public'] for r in rows)
  passed('Real Worker detail replaces house proxies without removing public terrain',x)
  for v in page.evaluate('Object.keys(GA.HIGHLAND.views)'):
   rows=visit(v,'highland');assert rows
   assert page.evaluate('ATLAS.state.space')=='surface' and page.evaluate('ATLAS.renderer.sky.visible')
   if v=='denClosed':assert all(r['part']!='session' for r in rows)
   if v=='denSection':assert all(r['part']!='roof' for r in rows)
   if v in ['shelfOverview','denFront','denHall','denRear','denSection','denClosed','shelfSnow','denPipe','shelfFlowers']:
    page.screenshot(path=str(a.output/(v+'.png')))
   passed('View '+v,{'visibleRecords':len(rows)})
  visit('denHall','highland');assert page.evaluate('ATLAS.renderer.shelfFill.visible')
  page.evaluate('ATLAS.state.clock=17.25;ATLAS.renderOnce()');before=page.locator('#scene').screenshot();page.evaluate('ATLAS.renderOnce()');assert before==page.locator('#scene').screenshot()
  page.evaluate('ATLAS.state.clock=49.25;ATLAS.renderOnce()');assert before!=page.locator('#scene').screenshot();passed('Local smoke uses nonzero shared time and pauses without a phase reset')
  visit('denClosed','highland');draw(True)
  assert page.evaluate("ATLAS.characters.elements.filter(e=>e.cs.some(c=>c.id==='sannyo')).every(e=>e.el.hidden)")
  assert not page.evaluate('ATLAS.renderer.shelfFill.visible')
  page.evaluate("ATLAS.characters.select('sannyo',false)");draw(True);assert page.evaluate('ATLAS.state.view')=='denHall';assert '原作图待核' in page.locator('#character-portrait').inner_text();page.locator('#close-character-detail').click();passed('Closed house hides session props and host; character navigation restores open interior')
  page.locator('#btn-search').click();page.locator('#search').fill('Komakusa');assert page.locator('#results [data-id="casino"]').count()==1;page.locator('#results [data-id="casino"]').click();assert 'P' in page.locator('#detail-design').inner_text();page.locator('#close-detail').click();page.locator('#close-drawer').click();passed('Alias and source-backed directory navigate to the authored house')
  visit('denFront','highland');draw();before=page.evaluate('ATLAS.rig.eye.slice()');page.mouse.move(950,340);page.mouse.down();page.mouse.move(1030,390,steps=6);page.mouse.up();page.evaluate('ATLAS.rig.update(0);ATLAS.renderOnce()');assert before!=page.evaluate('ATLAS.rig.eye.slice()');passed('Real mouse orbit')
  visit('shelfFlowers','highland');page.locator('[data-camera-mode="ground"]').click();assert page.evaluate('ATLAS.rig.mode')=='ground';assert page.evaluate('Math.abs(ATLAS.rig.eye[1]-ATLAS.world.terrain.height(ATLAS.rig.eye[0],ATLAS.rig.eye[2])-1.82)<.001');page.locator('[data-camera-mode="fly"]').click();assert page.evaluate('ATLAS.rig.mode')=='fly';page.locator('[data-camera-mode="orbit"]').click();passed('Inherited ground-height and flight modes remain usable, not building collision')
  pts=page.evaluate('GA.HIGHLAND.paths[0].filter((p,i)=>i%38===0)')
  for q in pts:
   assert page.evaluate("p=>{const y=ATLAS.world.terrain.height(...p);ATLAS.rig.setView({space:'surface',eye:[p[0]+7,y+16,p[1]+9],target:[p[0],y+1,p[1]]},false);ATLAS.renderOnce();return ATLAS.renderer.records.some(r=>r.wanted&&r.data.highlandPublic)}",q)
  passed('Continuous terrain-path camera samples',{'count':len(pts),'collisionTest':False})
  for v,r in [('mineThreshold','rainbowmine'),('mineDepth','rainbowmine'),('kasenStudy','kasen'),('backdoorSpring','backdoor'),('jigokuOverview','currenthell'),('denFront','highland'),('hellHall','oldhell'),('moonTeaRoom','lunar'),('shrineDiorama','hakurei'),('forest','forest')]:
   visit(v,r)
   if r!='highland':assert not page.evaluate('ATLAS.renderer.shelfFill.visible')
   if r=='rainbowmine':assert 0<page.evaluate('ATLAS.renderer.mineLights.filter(l=>l.visible).length')<=8
   else:assert not page.evaluate('ATLAS.renderer.mineLights.some(l=>l.visible)')
   passed('Lighting and geometry return '+v)
  page.locator('[data-weather="rain"]').click();page.locator('#light-dusk').click();visit('denFront','highland');assert page.evaluate('ATLAS.state.weather')=='rain';visit('mineThreshold','rainbowmine');assert not page.evaluate('ATLAS.renderer.rain.visible');visit('denFront','highland');assert page.evaluate('ATLAS.state.lighting')=='dusk';passed('Surface weather is retained across mine and highland')
  # Production animation path: no renderOnce/gl.finish calls inside this section.
  page.evaluate('globalThis.ATLAS_TEST_PAUSE=false;ATLAS.state.motion=true;ATLAS.wake()')
  for sel in ['#btn-mine','#btn-highland','#btn-overview','#btn-highland','#btn-mine','#btn-overview']:
   n=page.evaluate('ATLAS.state.drawnFrames');page.locator(sel).click();page.wait_for_function('n=>ATLAS.state.drawnFrames>n+1',arg=n,polling=200)
  page.evaluate('globalThis.ATLAS_TEST_PAUSE=true;ATLAS.state.motion=false');page.wait_for_timeout(500);passed('Production toolbar switching without manual draw/GPU synchronization',{'errorsSoFar':len(report['errors'])})
  visit('diorama');page.evaluate('ATLAS.stream.trim(true)');c=page.evaluate("()=>{const n=ATLAS.stream.metrics.cancelled;ATLAS.setView('denFront',false);ATLAS.setView('diorama',false);ATLAS.stream.trim(true);return ATLAS.stream.metrics.cancelled-n}");assert c>=1;passed('Native build cancellation')
  cycles=[]
  for _ in range(3):
   visit('denHall','highland');visit('diorama');page.evaluate('ATLAS.stream.trim(true);ATLAS.renderOnce();ATLAS.renderer.trim(true)')
   x=page.evaluate("()=>({cache:ATLAS.stream.cache.size,detail:ATLAS.renderer.records.filter(r=>r.data.owner==='highland'&&!r.data.overview).length,public:ATLAS.world.meshes.filter(m=>m.highlandPublic).length,...ATLAS.renderer.engine.info.memory})");assert x['cache']==0 and x['detail']==0 and x['public']>0;cycles.append(x)
  assert max(x['textures'] for x in cycles)-min(x['textures'] for x in cycles)<=2;passed('Three rebuild/eviction cycles keep public ground and bounded texture counts',cycles)
  visit('denFront','highland');page.locator('#btn-settings').click();page.locator('#quality').select_option('low');page.locator('#opt-ao').uncheck();page.locator('#opt-bloom').uncheck();page.locator('#close-settings').click();draw();page.set_viewport_size({'width':390,'height':844});draw();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1');page.screenshot(path=str(a.output/'narrow-highland.png'));passed('390px controls and low quality without AO/bloom')
  e=page.evaluate('ATLAS.exportState()');assert e['landmarks']['navigable']==102 and e['landmarks']['pending']==77;assert page.evaluate("GA.resolveLocation('hiten').view==='hitenOverview'");passed('Directory export is 102/77, not a full-world completion claim')
  assert not report['errors'],'\n'.join(report['errors'])[:4000];report['passed']=True;browser.close()
except Exception as e:
 report['passed']=False;report['failure']=str(e);raise
finally:
 if server:server.shutdown()
 (a.output/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
