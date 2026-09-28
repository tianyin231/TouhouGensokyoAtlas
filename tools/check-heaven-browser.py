"""Optional real WebGL/Worker verification. Build first; requires Playwright + Chromium.

python tools/check-heaven-browser.py
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
p.add_argument('--output', type=Path, default=ROOT/'dist/heaven-browser-check')
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
   return page.evaluate("""characters=>{ATLAS.state.motion=false;ATLAS.state.labels=false;ATLAS.state.characters=characters;ATLAS.renderOnce();return ATLAS.renderer.records.filter(r=>r.wanted).map(r=>({id:r.data.id,owner:r.data.owner,space:r.data.space,overview:r.data.overview,edition:r.data.heavenEdition,part:r.data.heavenPart,zone:r.data.heavenZone}));}""",characters)
  def visit(v,r=None):
   page.evaluate('v=>ATLAS.setView(v,false)',v)
   if r:page.wait_for_function('r=>ATLAS.stream.cache.has(r)',arg=r,polling=300)
   return render()
  def shot(name):page.screenshot(path=str(a.output/(name+'.png')))
  assert page.evaluate('ATLAS.stream.cache.size')==0
  assert page.evaluate("ATLAS.world.meshes.filter(m=>GA.HEAVEN.regions.includes(m.owner)).every(m=>m.overview)")
  assert not page.evaluate("ATLAS.renderer.records.some(r=>r.wanted&&GA.HEAVEN.regions.includes(r.data.owner))||ATLAS.renderer.heavenSky.visible")
  passed('Cold surface has only hidden heavenly proxies, not full detail')
  page.locator('#btn-heaven').click();page.wait_for_function("ATLAS.stream.cache.has('heaven')",polling=300)
  records=render();assert records and all(m['owner']=='heaven' and not m['overview'] for m in records)
  passed('Real Heaven toolbar, detail replacement and separate space')
  selected={'heavenOverview','heavenPeaches','heavenPavilion','heavenVeranda','heavenKeystone','heavenUnderside','cloudLedge','cloudScarlet','heavenAurora'}
  views=page.evaluate('Object.entries(GA.HEAVEN.views).map(([id,p])=>({id,region:p.region,edition:p.heavenEdition||"th105",banquet:!!p.heavenBanquet}))')
  for v in views:
   records=visit(v['id'],v['region']);assert records
   assert all(m['space']==v['region'] and not m['overview'] for m in records)
   assert all(m['edition'] in ['both',v['edition']] for m in records)
   assert page.evaluate('ATLAS.renderer.heavenSky.visible')
   assert not page.evaluate('ATLAS.renderer.sky.visible||ATLAS.renderer.rain.visible||ATLAS.renderer.netherSky.visible||ATLAS.renderer.netherFill.visible||ATLAS.renderer.lunarSky.visible||ATLAS.renderer.makaiSky.visible')
   if v['edition']=='th155':
    assert any(m['part']=='aurora' for m in records)
    assert not any(m['zone'] in ['pavilion','peaches','flowers','banquet'] for m in records)
   else:assert not any(m['part']=='aurora' for m in records)
   assert not any(m['part']=='banquet' for m in records) or v['banquet']
   if v['id'] in selected:shot(v['id'])
   passed('Preset '+v['id'],{'meshes':len(records),'region':v['region'],'edition':v['edition']})
  visit('heavenBanquet','heaven');assert any(m['part']=='banquet' for m in render())
  visit('bhavaMeadow','heaven');assert not any(m['part']=='banquet' for m in render())
  visit('cloudScarlet','genkumoumi');assert page.evaluate('ATLAS.renderer.heavenScarlet.value')==1
  visit('cloudOverview','genkumoumi');assert page.evaluate('ATLAS.renderer.heavenScarlet.value')==0
  passed('Banquet and scarlet-warning modes restore without persistent mutations')
  # Tests actual pixel output at a nonzero shared scene phase.
  for view,region in [('cloudOverview','genkumoumi'),('heavenAurora','heaven')]:
   visit(view,region);page.evaluate('ATLAS.state.clock=17.25;ATLAS.renderOnce()');first=page.locator('#scene').screenshot()
   page.evaluate('ATLAS.renderOnce()');assert first==page.locator('#scene').screenshot();assert page.evaluate('ATLAS.renderer.timeUniform.value')==17.25
   page.evaluate('ATLAS.state.clock=39.5;ATLAS.renderOnce()');assert first!=page.locator('#scene').screenshot()
   passed('Nonzero pause retains phase and time changes actual pixels: '+view)
  page.locator('#btn-search').click()
  for query,id in [('Bhavaagra','bhava'),('Genkumoumi','unkai'),('Heaven','heaven')]:
   page.locator('#search').fill(query);assert page.locator(f'#results [data-id="{id}"]').count()==1
   page.locator(f'#results [data-id="{id}"]').click();assert 'P' in page.locator('#detail-design').inner_text();assert page.locator('#detail-sources a').count()>=2
   page.locator('#close-detail').click()
  page.locator('#close-drawer').click()
  passed('Three existing catalogue IDs, English aliases and source links')
  for id,view in [('tenshi','heavenKeystone'),('iku','cloudLedge')]:
   page.evaluate('id=>ATLAS.characters.select(id,false)',id);render(True);assert page.evaluate('ATLAS.state.view')==view
   assert '原作图待核' in page.locator('#character-portrait').inner_text()
   assert page.evaluate('id=>{const c=ATLAS.characters.data.find(c=>c.id===id);return JSON.stringify(c.position)===JSON.stringify(ATLAS.characters.position(c));}',id)
   page.locator('#close-character-detail').click()
  visit('heavenAurora','heaven');render(True)
  assert page.evaluate("ATLAS.characters.elements.filter(e=>e.cs[0].heavenEdition==='th105').every(e=>e.el.hidden)")
  passed('Character sources and independent coordinates; TH105 pins hidden in TH155')
  visit('heavenUnderside','heaven');before=page.evaluate('ATLAS.rig.eye.slice()')
  page.mouse.move(1050,390);page.mouse.down();page.mouse.move(1130,305,steps=6);page.mouse.up();page.evaluate('ATLAS.rig.update(0);ATLAS.renderOnce()')
  assert page.evaluate('ATLAS.rig.phi')>1.57;assert page.evaluate('ATLAS.rig.eye.slice()')!=before
  radius=page.evaluate('ATLAS.rig.radius');page.mouse.wheel(0,-60);page.evaluate('ATLAS.rig.update(0);ATLAS.renderOnce()');assert page.evaluate('ATLAS.rig.radius')<radius
  passed('Real mouse orbit below sky-rocks and wheel zoom')
  # The route is in one P chart; these camera samples do not claim collision navigation.
  visit('heavenOverview','heaven');samples=[]
  for z in range(155,9,-13):
   result=page.evaluate("""z=>{const x=8;ATLAS.rig.setView({space:'heaven',eye:[x,GA.HEAVEN.height(x,z)+20,z+25],target:[x,GA.HEAVEN.height(x,z)+5,z-15]},false);ATLAS.renderOnce();return {z,space:ATLAS.state.space,visible:ATLAS.renderer.records.filter(r=>r.wanted&&r.data.owner==='heaven').length};}""",z);samples.append(result)
  assert all(v['visible'] and v['space']=='heaven' for v in samples);passed('Continuous meadow route camera samples',samples)
  visit('shrineDiorama','hakurei');page.locator('[data-weather="rain"]').click();page.locator('#light-dusk').click();render()
  for v,r in [('heavenVeranda','heaven'),('cloudScarlet','genkumoumi'),('heavenAurora','heaven')]:
   visit(v,r);assert page.evaluate('ATLAS.state.weather')=='rain';assert page.evaluate('ATLAS.state.lighting')=='dusk';assert not page.evaluate('ATLAS.renderer.rain.visible')
  visit('shrineDiorama','hakurei');assert page.evaluate('ATLAS.renderer.sky.visible')
  assert not page.evaluate('ATLAS.renderer.heavenSky.visible||ATLAS.renderer.heavenFill.visible')
  assert page.evaluate('ATLAS.state.weather')=='rain' and page.evaluate('ATLAS.state.lighting')=='dusk'
  assert page.evaluate('ATLAS.renderer.sun.shadow.normalBias===ATLAS.renderer.lunarShadowDefaults.normalBias')
  passed('Earth weather, sky and shadow defaults restore')
  for v,r in [('hakugyokuHall','netherworld'),('moonOverview','lunar'),('moonSeaInner','tranquility'),('dreamWithin','kaian'),('pandemoniumHall','makai05'),('hellHall','oldhell'),('senkai','senkai'),('forest','forest'),('needleExterior','kishinjou')]:
   visit(v,r);assert not page.evaluate('ATLAS.renderer.heavenSky.visible||ATLAS.renderer.heavenFill.visible')
   if r=='netherworld':assert page.evaluate('ATLAS.renderer.netherFill.visible')
   visit('heavenVeranda','heaven');assert page.evaluate('ATLAS.renderer.heavenFill.visible');assert not page.evaluate('ATLAS.renderer.netherFill.visible||ATLAS.renderer.lunarFill.visible||ATLAS.renderer.makaiLights.some(l=>l.visible)||ATLAS.renderer.hellLights.some(l=>l.visible)||ATLAS.renderer.hellKey.visible')
   passed('Cross-region return '+v)
  visit('diorama');page.evaluate('ATLAS.stream.trim(true)')
  cancelled=page.evaluate("""()=>{const s=ATLAS.stream,b=s.metrics.cancelled;ATLAS.setView('heavenOverview',false);ATLAS.renderOnce();const native=s.pending?.worker instanceof Worker,far=ATLAS.renderer.records.filter(r=>r.wanted&&r.data.owner==='heaven'&&r.data.overview).length;ATLAS.setView('cloudOverview',false);ATLAS.setView('diorama',false);s.trim(true);ATLAS.renderOnce();return {native,far,cancelled:s.metrics.cancelled-b,details:ATLAS.renderer.records.filter(r=>GA.HEAVEN.regions.includes(r.data.owner)&&!r.data.overview).length}}""")
  assert cancelled['native'] and cancelled['far']>0 and cancelled['cancelled']>=1 and not cancelled['details'];passed('Native Worker cancellation and proxy survival',cancelled)
  cycles=[]
  for n in range(3):
   visit('heavenPavilion','heaven');visit('cloudLedge','genkumoumi');visit('diorama');page.evaluate('ATLAS.stream.trim(true);ATLAS.renderOnce();ATLAS.renderer.trim(true)')
   stat=page.evaluate("""()=>({cache:ATLAS.stream.cache.size,details:ATLAS.renderer.records.filter(r=>GA.HEAVEN.regions.includes(r.data.owner)&&!r.data.overview).length,textures:ATLAS.renderer.engine.info.memory.textures,geometries:ATLAS.renderer.engine.info.memory.geometries})""")
   assert not stat['cache'] and not stat['details'];cycles.append(stat)
  assert max(s['textures']for s in cycles)-min(s['textures']for s in cycles)<=2
  assert max(s['geometries']for s in cycles)-min(s['geometries']for s in cycles)<=2
  passed('Three bounded cache/revisit cycles',cycles)
  visit('heavenPavilion','heaven');page.locator('#btn-settings').click();page.locator('#opt-ao').uncheck();page.locator('#opt-bloom').uncheck();page.locator('#quality').select_option('low');render();page.locator('#close-settings').click();shot('heaven-low-effects-off');passed('Real low-quality controls with AO and bloom disabled')
  export=page.evaluate('ATLAS.exportState()');assert export['heavenModule']=='0.22.0'
  for r in ['heaven','genkumoumi']:assert export['displayTransforms'][r]=={'scale':1,'offset':[0,0,0]}
  audit=page.evaluate('GA.auditLandmarks(ATLAS.data)');assert (audit['total'],audit['navigable'],audit['pending'])==(179,80,99);passed('Export and shared catalogue resolver: 80 navigable, 99 pending')
  page.set_viewport_size({'width':390,'height':844});render();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1');assert page.locator('#btn-heaven').is_visible();shot('heaven-narrow');passed('390px layout without horizontal page overflow')
  report['portraits']=page.evaluate("()=>Object.fromEntries(['tenshi','iku'].map(id=>[id,ATLAS.characters.status.get(id)]))")
  assert not report['errors'],'\n'.join(report['errors'])[:4000];report['passed']=True;browser.close()
except Exception as e:
 report['passed']=False;report['failure']=str(e);raise
finally:
 if server:server.shutdown()
 (a.output/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
