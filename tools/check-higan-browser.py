"""Optional real WebGL/Worker verification. Build first; requires Playwright + Chromium.

python tools/check-higan-browser.py
--content explicitly tests identical HTML loaded into about:blank, NOT local HTTP.
--headed --chromium /usr/bin/chromium supports an installed browser under Xvfb.
"""
from pathlib import Path
import argparse
import hashlib
import json
import threading
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--content', action='store_true')
p.add_argument('--headed', action='store_true')
p.add_argument('--chromium')
p.add_argument('--output', type=Path, default=ROOT/'dist/higan-browser-check')
a = p.parse_args(); a.output.mkdir(parents=True, exist_ok=True)
info = json.loads((ROOT/'dist/release.json').read_text()); html=(ROOT/'dist'/info['artifact']).read_bytes()
assert hashlib.sha256(html).hexdigest()==info['sha256']
report={'artifact':info['artifact'],'sha256':info['sha256'],'loadMode':'about:blank content / native Blob Worker' if a.content else 'local HTTP','viewport':[1280,900],'dpr':1,'quality':'balanced','checks':[],'errors':[],'externalResourceErrors':[],'hardwarePerformanceMeasured':False}
server=None
try:
 if not a.content:
  server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(ROOT/'dist')))
  threading.Thread(target=server.serve_forever,daemon=True).start()
 with sync_playwright() as pw:
  args={'headless':not a.headed,'args':['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader','--disable-dev-shm-usage']}
  if a.chromium:args['executable_path']=a.chromium
  browser=pw.chromium.launch(**args)
  page=browser.new_page(viewport={'width':1280,'height':900},device_scale_factor=1);page.set_default_timeout(90000)
  page.on('pageerror',lambda e:report['errors'].append(str(e)))
  def console(m):
   if m.type=='error':report['externalResourceErrors' if 'Failed to load resource' in m.text else 'errors'].append(m.text)
  page.on('console',console);page.add_init_script('globalThis.ATLAS_TEST_PAUSE=true;')
  if a.content:
   page.goto('about:blank');page.evaluate('globalThis.ATLAS_TEST_PAUSE=true');page.set_content(html.decode(),wait_until='load',timeout=90000)
  else:page.goto(f'http://127.0.0.1:{server.server_port}/{info["artifact"]}',wait_until='load')
  page.wait_for_function('!!globalThis.ATLAS||!!globalThis.ATLAS_BOOT_ERROR',polling=300)
  assert page.evaluate('globalThis.ATLAS_BOOT_ERROR||null') is None
  report['browser']=browser.version
  report['webgl']=page.evaluate("""()=>{const g=ATLAS.renderer.engine.getContext(),e=g.getExtension('WEBGL_debug_renderer_info');return {version:g.getParameter(g.VERSION),renderer:e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):g.getParameter(g.RENDERER)}}""")
  def passed(name,data=None):
   report['checks'].append({'name':name,'data':data});print(name,data if data is not None else '',flush=True)
  def render(characters=False):
   return page.evaluate("""c=>{ATLAS.state.motion=false;ATLAS.state.labels=false;ATLAS.state.characters=c;ATLAS.renderOnce();return ATLAS.renderer.records.filter(r=>r.wanted).map(r=>({id:r.data.id,owner:r.data.owner,space:r.data.space,overview:r.data.overview,zone:r.data.higanZone,part:r.data.higanPart}));}""",characters)
  def visit(view,region=None):
   page.evaluate('v=>ATLAS.setView(v,false)',view)
   if region:page.wait_for_function('r=>ATLAS.stream.cache.has(r)',arg=region,polling=300)
   return render()
  def shot(name):page.screenshot(path=str(a.output/(name+'.png')))
  assert page.evaluate('ATLAS.stream.cache.size')==0
  assert not page.evaluate("ATLAS.renderer.higanSky.visible||ATLAS.renderer.records.some(r=>r.wanted&&GA.HIGAN.regions.includes(r.data.owner))")
  assert page.evaluate("ATLAS.world.meshes.filter(m=>GA.HIGAN.regions.includes(m.owner)).every(m=>m.overview)")
  passed('Cold surface contains only hidden proxies of new charts')
  page.locator('#btn-higan').click();page.wait_for_function("ATLAS.stream.cache.has('shigan')",polling=300)
  records=render();assert records and all(r['space']=='shigan' and not r['overview'] for r in records)
  passed('Real shore toolbar opens a native Worker detail scene')
  selected={'liminalMarket','liminalOverview','liminalStall','liminalRear','saiStones','sanzuBoat','sanzuMist','higanOverview','higanFlowers','higanGate','higanDesk','higanRear','higanBank'}
  views=page.evaluate("Object.entries(GA.HIGAN.views).map(([id,p])=>({id,space:p.space,contest:!!p.higanContest,inside:!!p.higanInterior}))")
  for v in views:
   records=visit(v['id'],v['space']);assert records
   assert all(r['space']==v['space'] and not r['overview'] for r in records)
   assert page.evaluate('ATLAS.renderer.higanSky.visible')
   assert not page.evaluate('ATLAS.renderer.sky.visible||ATLAS.renderer.rain.visible||ATLAS.renderer.heavenSky.visible||ATLAS.renderer.netherSky.visible||ATLAS.renderer.lunarSky.visible||ATLAS.renderer.makaiSky.visible')
   assert not any(r['part']=='contest' for r in records) or v['contest']
   assert page.evaluate('ATLAS.renderer.higanFill.visible')==v['inside']
   if v['id'] in selected:shot(v['id'])
   passed('Preset '+v['id'],{'meshes':len(records),'space':v['space']})
  visit('saiContest','shigan');assert any(r['part']=='contest' for r in render())
  visit('saiStones','shigan');assert not any(r['part']=='contest' for r in render());passed('Stone-stacking event embellishments restore on leaving')
  for view,region in [('sanzuBoat','shigan'),('higanFlowers','higan')]:
   visit(view,region);page.evaluate('ATLAS.state.clock=17.25;ATLAS.renderOnce()');first=page.locator('#scene').screenshot()
   page.evaluate('ATLAS.renderOnce()');assert first==page.locator('#scene').screenshot();assert page.evaluate('ATLAS.renderer.timeUniform.value')==17.25
   page.evaluate('ATLAS.state.clock=39.5;ATLAS.renderOnce()');assert first!=page.locator('#scene').screenshot()
   passed('Nonzero pause and changing real water/spirit pixels: '+view)
  page.locator('#btn-search').click()
  for query,id in [('Road of Liminality','liminal'),('Sai no Kawara','sai'),('Sanzu River','sanzu'),('Higan','higan')]:
   page.locator('#search').fill(query);assert page.locator(f'#results [data-id="{id}"]').count()==1
   page.locator(f'#results [data-id="{id}"]').click();assert 'P' in page.locator('#detail-design').inner_text();assert page.locator('#detail-sources a').count()>=2
   page.locator('#close-detail').click()
  page.locator('#close-drawer').click();passed('Four existing IDs: aliases, provenance and explicit navigation')
  for id,view,region in [('komachi','sanzuLanding','shigan'),('eika','saiStones','shigan'),('kutaka','higanGate','higan'),('eiki','higanFlowers','higan')]:
   page.evaluate('id=>ATLAS.characters.select(id,false)',id);page.wait_for_function('r=>ATLAS.stream.cache.has(r)',arg=region,polling=300);render(True)
   assert page.evaluate('ATLAS.state.view')==view
   assert '原作图待核' in page.locator('#character-portrait').inner_text()
   assert page.evaluate('id=>{const c=ATLAS.characters.data.find(c=>c.id===id);return JSON.stringify(c.position)===JSON.stringify(ATLAS.characters.position(c));}',id)
   if id=='kutaka':assert '工作' in page.locator('#character-note').inner_text() and '居所' in page.locator('#character-note').inner_text()
   page.locator('#close-character-detail').click()
  passed('Four character identities, missing portraits and independent positions')
  visit('sanzuBoat','shigan');before=page.evaluate('ATLAS.rig.eye.slice()')
  page.mouse.move(1030,400);page.mouse.down();page.mouse.move(1140,350,steps=6);page.mouse.up();page.evaluate('ATLAS.rig.update(0);ATLAS.renderOnce()')
  assert page.evaluate('ATLAS.rig.eye.slice()')!=before
  radius=page.evaluate('ATLAS.rig.radius');page.mouse.wheel(0,-60);page.evaluate('ATLAS.rig.update(0);ATLAS.renderOnce()');assert page.evaluate('ATLAS.rig.radius')<radius
  passed('Real mouse orbit and zoom at the hollow ferry')
  visit('liminalOverview','shigan');samples=[]
  points=page.evaluate('GA.HIGAN.road.filter((p,i)=>i%10===0)')
  for x,z in points:
   result=page.evaluate("""([x,z])=>{const y=GA.HIGAN.nearHeight(x,z);ATLAS.rig.setView({space:'shigan',eye:[x+14,y+17,z+26],target:[x,y+4,z-17]},false);ATLAS.renderOnce();return {x,z,space:ATLAS.state.space,visible:ATLAS.renderer.records.filter(r=>r.wanted&&r.data.owner==='shigan').length};}""",[x,z]);samples.append(result)
  assert all(v['visible'] and v['space']=='shigan' for v in samples);passed('Continuous road-to-river camera samples, not collision navigation',samples)
  visit('shrineDiorama','hakurei');page.locator('[data-weather="rain"]').click();page.locator('#light-dusk').click();render()
  for v,r in [('liminalMarket','shigan'),('higanDesk','higan'),('sanzuLanding','shigan')]:
   visit(v,r);assert page.evaluate('ATLAS.state.weather')=='rain';assert page.evaluate('ATLAS.state.lighting')=='dusk';assert not page.evaluate('ATLAS.renderer.rain.visible')
  visit('shrineDiorama','hakurei');assert page.evaluate('ATLAS.renderer.sky.visible');assert not page.evaluate('ATLAS.renderer.higanSky.visible||ATLAS.renderer.higanFill.visible')
  assert page.evaluate('ATLAS.state.weather')=='rain' and page.evaluate('ATLAS.state.lighting')=='dusk'
  assert page.evaluate('ATLAS.renderer.sun.shadow.normalBias===ATLAS.renderer.lunarShadowDefaults.normalBias')
  passed('Surface weather, light choice, sky and shadow defaults restored')
  for v,r in [('heavenVeranda','heaven'),('cloudScarlet','genkumoumi'),('hakugyokuHall','netherworld'),('moonOverview','lunar'),('moonSeaOuter','tranquility'),('dreamWithin','kaian'),('pandemoniumHall','makai05'),('hellHall','oldhell'),('senkai','senkai'),('forest','forest'),('needleExterior','kishinjou')]:
   visit(v,r);assert not page.evaluate('ATLAS.renderer.higanSky.visible||ATLAS.renderer.higanFill.visible')
   visit('higanDesk','higan');assert page.evaluate('ATLAS.renderer.higanFill.visible')
   assert not page.evaluate('ATLAS.renderer.heavenFill.visible||ATLAS.renderer.netherFill.visible||ATLAS.renderer.lunarFill.visible||ATLAS.renderer.makaiLights.some(l=>l.visible)||ATLAS.renderer.hellLights.some(l=>l.visible)||ATLAS.renderer.hellKey.visible')
   passed('Cross-region return '+v)
  visit('diorama');page.evaluate('ATLAS.stream.trim(true)')
  cancelled=page.evaluate("""()=>{const s=ATLAS.stream,b=s.metrics.cancelled;ATLAS.setView('liminalOverview',false);ATLAS.renderOnce();const native=s.pending?.worker instanceof Worker,far=ATLAS.renderer.records.filter(r=>r.wanted&&r.data.owner==='shigan'&&r.data.overview).length;ATLAS.setView('higanFlowers',false);ATLAS.setView('diorama',false);s.trim(true);ATLAS.renderOnce();return {native,far,cancelled:s.metrics.cancelled-b,details:ATLAS.renderer.records.filter(r=>GA.HIGAN.regions.includes(r.data.owner)&&!r.data.overview).length}}""")
  assert cancelled['native'] and cancelled['far']>0 and cancelled['cancelled']>=1 and not cancelled['details'];passed('Native Worker cancellation and far-proxy survival',cancelled)
  cycles=[]
  for n in range(3):
   visit('liminalOverview','shigan');visit('higanFlowers','higan');visit('diorama');page.evaluate('ATLAS.stream.trim(true);ATLAS.renderOnce();ATLAS.renderer.trim(true)')
   snap=page.evaluate("""()=>({cache:ATLAS.stream.cache.size,details:ATLAS.renderer.records.filter(r=>GA.HIGAN.regions.includes(r.data.owner)&&!r.data.overview).length,textures:ATLAS.renderer.engine.info.memory.textures,geometries:ATLAS.renderer.engine.info.memory.geometries})""")
   assert not snap['cache'] and not snap['details'];cycles.append(snap)
  assert max(s['textures']for s in cycles)-min(s['textures']for s in cycles)<=2
  assert max(s['geometries']for s in cycles)-min(s['geometries']for s in cycles)<=2
  passed('Three bounded cache and native rebuild cycles',cycles)
  visit('higanGate','higan');page.locator('#btn-settings').click();page.locator('#opt-ao').uncheck();page.locator('#opt-bloom').uncheck();page.locator('#quality').select_option('low');render();page.locator('#close-settings').click();shot('higan-low-effects-off');passed('Real low-quality controls with AO and bloom off')
  exported=page.evaluate('ATLAS.exportState()');assert exported['higanModule']=='0.23.0'
  for r in ['shigan','higan']:assert exported['displayTransforms'][r]=={'scale':1,'offset':[0,0,0]}
  audit=page.evaluate('GA.auditLandmarks(ATLAS.data)');assert (audit['total'],audit['navigable'],audit['pending'])==(179,84,95)
  passed('Export and unified directory audit: 84 navigable, 95 pending')
  page.set_viewport_size({'width':390,'height':844});render();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1');assert page.locator('#btn-higan').is_visible();shot('higan-narrow');passed('390px layout with scrollable region controls')
  report['portraits']=page.evaluate("()=>Object.fromEntries(['komachi','eika','kutaka','eiki'].map(id=>[id,ATLAS.characters.status.get(id)]))")
  assert not report['errors'],'\n'.join(report['errors'])[:4000];report['passed']=True;browser.close()
except Exception as e:
 report['passed']=False;report['failure']=str(e);raise
finally:
 if server:server.shutdown()
 (a.output/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
