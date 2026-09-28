"""Optional real WebGL/Worker verification. Build first; requires Playwright + Chromium.

python tools/check-animal-browser.py
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
p.add_argument('--output', type=Path, default=ROOT/'dist/animal-browser-check')
a = p.parse_args(); a.output.mkdir(parents=True, exist_ok=True)
info = json.loads((ROOT/'dist/release.json').read_text()); html=(ROOT/'dist'/info['artifact']).read_bytes()
assert hashlib.sha256(html).hexdigest()==info['sha256']
report={'artifact':info['artifact'],'sha256':info['sha256'],'loadMode':'about:blank content / native Blob Worker' if a.content else 'local HTTP','viewport':[1280,900],'dpr':1,'quality':'balanced','checks':[],'errors':[],'externalResourceErrors':[],'hardwarePerformanceMeasured':False,'manualFrameCompletion':'gl.finish; pending production animation frames drained before fixed-frame assertions'}
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
  phase={'name':'boot'}
  page.on('pageerror',lambda e:report['errors'].append(str(e)))
  def console(m):
   if m.type=='error':
    report['externalResourceErrors' if 'Failed to load resource' in m.text else 'errors'].append(m.text)
    report.setdefault('errorContexts',[]).append({'stageAtReception':phase['name'],'message':m.text})
  page.on('console',console);page.add_init_script('globalThis.ATLAS_TEST_PAUSE=true;')
  if a.content:
   page.goto('about:blank');page.evaluate('globalThis.ATLAS_TEST_PAUSE=true');page.set_content(html.decode(),wait_until='load',timeout=90000)
  else:page.goto(f'http://127.0.0.1:{server.server_port}/{info["artifact"]}',wait_until='load')
  page.wait_for_function('!!globalThis.ATLAS||!!globalThis.ATLAS_BOOT_ERROR',polling=300)
  assert page.evaluate('globalThis.ATLAS_BOOT_ERROR||null') is None
  report['browser']=browser.version
  report['webgl']=page.evaluate("""()=>{const g=ATLAS.renderer.engine.getContext(),e=g.getExtension('WEBGL_debug_renderer_info');return {version:g.getParameter(g.VERSION),renderer:e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):g.getParameter(g.RENDERER)}}""")
  def passed(name,data=None):
   phase['name']=name
   report['checks'].append({'name':name,'data':data});print(name,data if data is not None else '',flush=True)
  def render(characters=False):
   return page.evaluate("""c=>{ATLAS.state.motion=false;ATLAS.state.labels=false;ATLAS.state.characters=c;ATLAS.renderOnce();ATLAS.renderer.engine.getContext().finish();return ATLAS.renderer.records.filter(r=>r.wanted).map(r=>({id:r.data.id,owner:r.data.owner,space:r.data.space,overview:r.data.overview,zone:r.data.animalZone,part:r.data.animalPart,era:r.data.animalEra}));}""",characters)
  def visit(view,region=None):
   phase['name']='visit '+view
   page.evaluate('v=>ATLAS.setView(v,false)',view)
   if region:page.wait_for_function('r=>ATLAS.stream.cache.has(r)',arg=region,polling=300)
   return render()
  def shot(name):page.screenshot(path=str(a.output/(name+'.png')))
  assert page.evaluate('ATLAS.stream.cache.size')==0
  assert not page.evaluate("ATLAS.renderer.animalSky.visible||ATLAS.renderer.records.some(r=>r.wanted&&GA.ANIMAL.regions.includes(r.data.owner))")
  assert page.evaluate("GA.ANIMAL.regions.every(id=>ATLAS.world.meshes.some(m=>m.owner===id&&m.overview))")
  passed('Cold surface has hidden low-cost proxies, not complete new detail')
  page.locator('#btn-animal').click();page.wait_for_function("ATLAS.stream.cache.has('animal')",polling=300)
  records=render();assert records and all(r['space']=='animal' and not r['overview'] for r in records)
  passed('Real Animal Realm toolbar and on-demand detail replacement')
  views=page.evaluate("Object.entries(GA.ANIMAL.views).map(([id,p])=>({id,space:p.space,era:p.animalEra,section:!!p.animalSection}))")
  for v in views:
   records=visit(v['id'],v['space']);assert records
   assert all(r['space']==v['space'] and not r['overview'] for r in records)
   assert all(r['era'] in ['both',v['era']] for r in records)
   assert page.evaluate('ATLAS.renderer.animalSky.visible')
   assert not page.evaluate('ATLAS.renderer.sky.visible||ATLAS.renderer.rain.visible||ATLAS.renderer.higanSky.visible||ATLAS.renderer.heavenSky.visible||ATLAS.renderer.netherSky.visible||ATLAS.renderer.lunarSky.visible||ATLAS.renderer.makaiSky.visible')
   assert page.evaluate('ATLAS.renderer.animalLights.filter(l=>l.visible).length')==(3 if v['space']=='primate_core' else 0)
   if v['section']:assert not any(r['part'] in ['front','right','roof'] for r in records)
   if v['era']=='before':assert not any(r['part'] in ['figures','tech','spirits'] for r in records)
   shot(v['id']);passed('Preset '+v['id'],{'meshes':len(records),'space':v['space'],'era':v['era']})
  visit('primateCore','primate_core');assert any(r['part']=='roof' for r in render())
  visit('primateGate','animal');assert any(r['part']=='figures' for r in render())
  assert not page.evaluate('ATLAS.state.animalSection');passed('Section and historical states restore on ordinary views')
  # Check that the custom moat actually uses its own shader, not generic surface water.
  assert page.evaluate("ATLAS.renderer.records.filter(r=>r.wanted&&r.data.animalZone==='moat').every(r=>r.item.mesh.material===ATLAS.renderer.mats.animalWater)")
  page.evaluate('ATLAS.state.clock=37.25;ATLAS.renderOnce()');pixels=page.locator('#scene').screenshot()
  page.evaluate('ATLAS.renderOnce()');assert pixels==page.locator('#scene').screenshot()
  page.evaluate('ATLAS.state.clock=61.75;ATLAS.renderOnce()');assert pixels!=page.locator('#scene').screenshot()
  passed('Custom moat shader responds to shared time; pause retains its nonzero phase')
  visit('primateVault','primate_core');assert page.evaluate('ATLAS.renderer.mats.animalCircuit.polygonOffset');page.evaluate('ATLAS.state.clock=18;ATLAS.renderOnce()');pixels=page.locator('#scene').screenshot()
  page.evaluate('ATLAS.state.clock=29;ATLAS.renderOnce()');assert pixels!=page.locator('#scene').screenshot()
  passed('Circuit and display pixels respond to the same clock')
  # Exercise real scheduling too; do not replace the native Worker or production tick.
  page.evaluate('globalThis.__clockBefore=ATLAS.state.clock;globalThis.__framesBefore=ATLAS.state.drawnFrames;ATLAS.state.motion=true;globalThis.ATLAS_TEST_PAUSE=false;ATLAS.wake()')
  page.wait_for_function('ATLAS.state.clock>__clockBefore&&ATLAS.state.drawnFrames>__framesBefore',polling=300)
  actual=page.evaluate('({clock:ATLAS.state.clock,frames:ATLAS.state.drawnFrames})')
  # Quiesce the previously scheduled production frame before resuming manual renders.
  # This does not change production code or hide diagnostics; GLSL errors still fail.
  page.evaluate('''async()=>{globalThis.ATLAS_TEST_PAUSE=true;ATLAS.state.motion=false;
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    ATLAS.renderer.engine.getContext().finish();}''');render()
  passed('Production animation scheduler advances visible time and frames',actual)
  page.locator('#btn-search').click()
  for q,id,view in [('Animal Realm','animal','beastOverview'),('Primate Spirit Garden','primate','primateExterior')]:
   page.locator('#search').fill(q);assert page.locator(f'#results [data-id="{id}"]').count()==1
   page.locator(f'#results [data-id="{id}"]').click();assert page.evaluate('ATLAS.state.view')==view
   assert 'P' in page.locator('#detail-design').inner_text();assert page.locator('#detail-sources a').count()>=3
   page.locator('#close-detail').click()
  page.locator('#close-drawer').click()
  still=page.evaluate("()=>{const before=ATLAS.rig.eye.slice();ATLAS.selectLocation('animal_hq');return {same:JSON.stringify(before)===JSON.stringify(ATLAS.rig.eye),view:GA.resolveLocation('animal_hq').view,text:document.getElementById('detail-state').textContent}}")
  assert still['same'] and still['view'] is None;page.locator('#close-detail').click()
  passed('Real alias search and source panels; unknown headquarters does not relocate the camera')
  for id,view in [('mayumi','primateHaniwa'),('keiki','primateWorkshop')]:
   page.evaluate('id=>ATLAS.characters.select(id,false)',id);page.wait_for_function('ATLAS.stream.cache.has(ATLAS.state.focus)',polling=300);render(True)
   assert page.evaluate('ATLAS.state.view')==view
   assert '原作图待核' in page.locator('#character-portrait').inner_text()
   assert page.evaluate('id=>{const c=ATLAS.characters.data.find(c=>c.id===id);return JSON.stringify(ATLAS.characters.position(c))===JSON.stringify(c.position)}',id)
   page.locator('#close-character-detail').click()
  visit('primateBefore','animal');render(True)
  assert page.evaluate("ATLAS.characters.elements.filter(e=>['mayumi','keiki'].includes(e.cs[0].id)).every(e=>e.el.hidden)")
  passed('Two character coordinates and unverified portraits; historical exterior hides their annotations')
  visit('primateExterior','animal');before=page.evaluate('ATLAS.rig.eye.slice()')
  page.mouse.move(980,450);page.mouse.down();page.mouse.move(1070,486,steps=6);page.mouse.up();page.evaluate('ATLAS.rig.update(0);ATLAS.renderOnce()')
  assert before!=page.evaluate('ATLAS.rig.eye.slice()')
  radius=page.evaluate('ATLAS.rig.radius');page.mouse.wheel(0,-85);page.evaluate('ATLAS.rig.update(0);ATLAS.renderOnce()');assert page.evaluate('ATLAS.rig.radius')<radius
  assert page.evaluate('ATLAS.state.space')=='animal';passed('Real pointer orbit and wheel zoom remain in the same chart')
  trace=[]
  for z in range(230,-131,-24):
   trace.append(page.evaluate("""z=>{const y=GA.ANIMAL.parkHeight(0,z);ATLAS.rig.setView({space:'animal',eye:[0,y+14,z+17],target:[0,GA.ANIMAL.parkHeight(0,z-22)+8,z-22]},false);ATLAS.renderOnce();ATLAS.renderer.engine.getContext().finish();return {z,y,space:ATLAS.state.space,gpuError:ATLAS.renderer.engine.getContext().getError(),visible:ATLAS.renderer.records.filter(r=>r.wanted&&r.data.owner==='animal').length};}""",z))
  assert all(v['space']=='animal' and v['visible'] and v['gpuError']==0 for v in trace)
  passed(f'{len(trace)} continuous garden-path camera samples without changing charts',trace)
  visit('shrineDiorama','hakurei');page.locator('[data-weather="rain"]').click();page.locator('#light-dusk').click();render()
  oldBias=page.evaluate('({bias:ATLAS.renderer.sun.shadow.bias,normal:ATLAS.renderer.sun.shadow.normalBias})')
  visit('primateCore','primate_core');assert not page.locator('[data-weather="rain"]').is_visible()
  assert page.evaluate('ATLAS.state.weather')=='rain' and page.evaluate('ATLAS.state.lighting')=='dusk'
  for view,region in [('liminalMarket','shigan'),('higanDesk','higan'),('heavenVeranda','heaven'),('cloudLedge','genkumoumi'),('hakugyokuHall','netherworld'),('moonResidence','lunar'),('moonSeaInner','tranquility'),('dreamWithin','kaian'),('pandemoniumHall','makai05'),('hellHall','oldhell'),('senkai','senkai'),('forest','forest'),('needleExterior','kishinjou')]:
   visit(view,region);assert not page.evaluate('ATLAS.renderer.animalSky.visible||ATLAS.renderer.animalLights.some(l=>l.visible)')
   passed('Cross-chart return '+view)
  assert page.evaluate('ATLAS.state.weather')=='rain' and page.evaluate('ATLAS.state.lighting')=='dusk'
  assert page.evaluate('({bias:ATLAS.renderer.sun.shadow.bias,normal:ATLAS.renderer.sun.shadow.normalBias})')==oldBias
  assert page.evaluate('ATLAS.renderer.sky.visible');passed('Original sky, rain choice and shadow settings restored')
  visit('diorama');page.evaluate('ATLAS.stream.trim(true)')
  cancel=page.evaluate("""()=>{const s=ATLAS.stream,n=s.metrics.cancelled;ATLAS.setView('beastOverview',false);ATLAS.renderOnce();const far=ATLAS.renderer.records.filter(r=>r.wanted&&r.data.owner==='animal'&&r.data.overview).length,native=s.pending?.worker instanceof Worker;ATLAS.setView('primateCore',false);ATLAS.setView('diorama',false);s.trim(true);ATLAS.renderOnce();return {far,native,cancelled:s.metrics.cancelled-n,details:ATLAS.renderer.records.filter(r=>GA.ANIMAL.regions.includes(r.data.owner)&&!r.data.overview).length};}""")
  assert cancel['far']>0 and cancel['native'] and cancel['cancelled']>=1 and cancel['details']==0
  passed('Far proxy frame, actual Blob Worker cancellation and detail eviction',cancel)
  cycles=[]
  for _ in range(3):
   visit('beastOverview','animal');visit('primateCore','primate_core');visit('diorama');page.evaluate('ATLAS.stream.trim(true);ATLAS.renderOnce();ATLAS.renderer.trim(true)')
   snap=page.evaluate("""()=>({cache:ATLAS.stream.cache.size,details:ATLAS.renderer.records.filter(r=>GA.ANIMAL.regions.includes(r.data.owner)&&!r.data.overview).length,textures:ATLAS.renderer.engine.info.memory.textures,geometries:ATLAS.renderer.engine.info.memory.geometries})""")
   assert snap['cache']==0 and snap['details']==0;cycles.append(snap)
  assert max(v['textures'] for v in cycles)-min(v['textures'] for v in cycles)<=2
  assert max(v['geometries'] for v in cycles)-min(v['geometries'] for v in cycles)<=2
  passed('Three native rebuild/cache cycles with bounded resource counts',cycles)
  # 保持生产动画运行，通过真实控件切区；此段不手动绘制或调用 gl.finish。
  phase['name']='Production animated cross-chart switching'
  page.evaluate('ATLAS.state.motion=true;globalThis.ATLAS_TEST_PAUSE=false;ATLAS.wake()')
  live=[]
  for weather,lighting in [('clear','neutral'),('rain','dusk')]:
   page.locator('#region-select').select_option('hakurei')
   page.locator(f'[data-weather="{weather}"]').click();page.locator(f'#light-{lighting}').click()
   for region in ['animal','primate_core','hakurei']:
    before=page.evaluate('ATLAS.state.drawnFrames')
    page.locator('#region-select').select_option(region)
    page.wait_for_function('a=>ATLAS.stream.cache.has(a.region)&&ATLAS.state.drawnFrames>=a.before+3&&!ATLAS.rig.transition',arg={'region':region,'before':before},polling=300)
   for _ in range(3):
    page.locator('#btn-animal').click()
    page.locator('[data-animal-view="primateCore"]').click()
    page.locator('#region-select').select_option('hakurei')
   before=page.evaluate('ATLAS.state.drawnFrames')
   page.wait_for_function('n=>ATLAS.state.drawnFrames>=n+3&&!ATLAS.rig.transition',arg=before,polling=300)
   snap=page.evaluate('({view:ATLAS.state.view,weather:ATLAS.state.weather,lighting:ATLAS.state.lighting,motion:ATLAS.state.motion,paused:!!globalThis.ATLAS_TEST_PAUSE,gpuError:ATLAS.renderer.engine.getContext().getError(),animalLights:ATLAS.renderer.animalLights.some(l=>l.visible),surfaceSky:ATLAS.renderer.sky.visible})')
   assert snap=={'view':'shrineDiorama','weather':weather,'lighting':lighting,'motion':True,'paused':False,'gpuError':0,'animalLights':False,'surfaceSky':True},snap
   live.append(snap)
  assert not report['errors'],'\n'.join(report['errors'])[:4000]
  passed('Production animation: six rapid city/interior/shrine round trips in clear/day and rain/dusk',live)
  page.evaluate('''async()=>{globalThis.ATLAS_TEST_PAUSE=true;ATLAS.state.motion=false;
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    ATLAS.renderer.engine.getContext().finish();}''');render()
  visit('primateCore','primate_core');page.locator('#btn-settings').click()
  page.locator('#opt-ao').uncheck();page.locator('#opt-bloom').uncheck();page.locator('#quality').select_option('low');render()
  assert page.evaluate('ATLAS.renderer.stats.detailDrawObjects')>0 and not page.evaluate('ATLAS.state.ao||ATLAS.state.bloom')
  page.locator('#close-settings').click();shot('low-quality-core');passed('Real low-quality and AO/bloom controls')
  page.set_viewport_size({'width':390,'height':844});render()
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1');assert page.locator('#btn-animal').is_visible();shot('narrow-animal')
  passed('390px controls without horizontal page overflow')
  out=page.evaluate('ATLAS.exportState()');assert out['animalModule']=='0.24.0'
  assert [out['landmarks']['total'],out['landmarks']['navigable'],out['landmarks']['pending']]==[179,86,93]
  for id in ['animal','primate_core']:assert out['displayTransforms'][id]=={'scale':1,'offset':[0,0,0]}
  passed('Export and shared catalogue audit: 86 navigable, 93 pending')
  report['portraits']=page.evaluate("Object.fromEntries(['mayumi','keiki'].map(id=>[id,ATLAS.characters.status.get(id)]))")
  assert not report['errors'],'\n'.join(report['errors'])[:4000]
  report['passed']=True;browser.close()
except Exception as e:
 report['passed']=False;report['failure']=str(e);raise
finally:
 if server:server.shutdown()
 (a.output/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
