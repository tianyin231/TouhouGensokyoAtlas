"""Rainbow Dragon Cave regression. HTTP by default; --content explicitly records fallback.
Requires optional Playwright/Chromium, not dependencies of the offline source build.
"""
from pathlib import Path
import argparse, hashlib, json, threading
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--content',action='store_true');p.add_argument('--headed',action='store_true');p.add_argument('--chromium');p.add_argument('--output',type=Path,default=ROOT/'dist/rainbow-mine-browser-check')
a=p.parse_args();a.output.mkdir(parents=True,exist_ok=True)
info=json.loads((ROOT/'dist/release.json').read_text());html=(ROOT/'dist'/info['artifact']).read_bytes();assert hashlib.sha256(html).hexdigest()==info['sha256']
report={'artifact':info['artifact'],'sha256':info['sha256'],'loadMode':'about:blank content / native Blob Worker' if a.content else 'local HTTP','checks':[],'errors':[],'externalResourceErrors':[],'viewport':[1280,900],'dpr':1,'quality':'balanced','hardwarePerformanceMeasured':False}
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
   report['checks'].append({'name':name,'result':'passed','data':data});print(name,data or '',flush=True)
  def draw(markers=False):
   return page.evaluate("m=>{ATLAS.state.motion=false;ATLAS.state.characters=m;ATLAS.state.labels=false;ATLAS.renderOnce();return ATLAS.renderer.records.filter(r=>r.wanted).map(r=>({owner:r.data.owner,space:r.data.space,far:r.data.overview,part:r.data.minePart,material:r.data.material}));}",markers)
  def visit(view,region=None):
   page.evaluate('v=>ATLAS.setView(v,false)',view)
   if region:page.wait_for_function('id=>ATLAS.stream.cache.has(id)',arg=region,polling=250)
   return draw()
  assert page.evaluate('ATLAS.stream.cache.size')==0
  assert page.evaluate("ATLAS.world.meshes.some(m=>m.owner==='rainbowmine'&&m.overview)")
  assert not page.evaluate("ATLAS.renderer.records.some(r=>r.wanted&&r.data.owner==='rainbowmine')")
  passed('Cold surface has only the low-cost mine proxy, no mine detail')
  result=page.evaluate("()=>{ATLAS.setView('mineThreshold',false);ATLAS.renderOnce();return {native:ATLAS.stream.pending?.worker instanceof Worker,far:ATLAS.renderer.records.filter(r=>r.wanted&&r.data.owner==='rainbowmine'&&r.data.overview).length};}")
  assert result['native'] and result['far']>0
  page.wait_for_function("ATLAS.stream.cache.has('rainbowmine')",polling=250);rows=draw();assert rows and all(r['owner']=='rainbowmine' and not r['far'] for r in rows)
  passed('Native Worker replaces the immediate proxy without overlapping detail',result)
  views=page.evaluate('Object.entries(GA.RAINBOW_MINE.views).map(([id,p])=>({id,cut:!!p.mineCut,edition:p.mineEdition}))')
  for v in views:
   rows=visit(v['id'],'rainbowmine');assert rows and all(r['owner']=='rainbowmine' and not r['far'] for r in rows)
   assert not page.evaluate('ATLAS.renderer.sky.visible||ATLAS.renderer.rain.visible||ATLAS.renderer.jigokuSky.visible||ATLAS.renderer.kasenSky.visible')
   assert 0<page.evaluate('ATLAS.renderer.mineLights.filter(l=>l.visible).length')<=8
   assert any(r['part']=='roof' for r in rows)!=v['cut']
   if v['edition']=='th185':assert all(r['part']!='mist' for r in rows)
   if v['id'] in ['mineThreshold','mineRailYard','mineCart','mineBranch','mineDepth','minePortal','mineOverview','mineVein','mineDrain']:
    page.screenshot(path=str(a.output/(v['id']+'.png')))
   passed('Preset '+v['id'],{'visibleMeshes':len(rows),'edition':v['edition']})
  visit('mineRailYard','rainbowmine');page.locator('#mine-roof').click();rows=draw();assert not any(r['part']=='roof' for r in rows);assert '恢复' in page.locator('#mine-roof').inner_text()
  page.locator('#mine-roof').click();rows=draw();assert any(r['part']=='roof' for r in rows)
  visit('mineOverview','rainbowmine');visit('mineUpper','rainbowmine');assert not page.evaluate('ATLAS.state.mineCut')
  passed('Real roof toggle and ordinary-view restoration')
  visit('mineUpper','rainbowmine');page.evaluate('ATLAS.state.clock=27.25;ATLAS.renderOnce()');pixels=page.locator('#scene').screenshot();page.evaluate('ATLAS.renderOnce()');assert pixels==page.locator('#scene').screenshot()
  page.evaluate('ATLAS.state.clock=43.5;ATLAS.renderOnce()');assert pixels!=page.locator('#scene').screenshot();assert page.evaluate('ATLAS.renderer.mineTime.value')==43.5
  passed('Shared nonzero clock animates water/haze pixels and preserves pause phase')
  visit('mineBlackMarket','rainbowmine');draw(True);assert not page.evaluate("ATLAS.renderer.records.some(r=>r.wanted&&r.data.minePart==='mist')")
  assert page.evaluate("ATLAS.characters.elements.filter(e=>e.cs.some(c=>c.mineEdition)).every(e=>e.el.hidden)")
  assert 'TH18.5' in page.locator('#scene-index').inner_text()
  passed('TH18.5 atmosphere and TH18 character annotations are separate')
  page.locator('#btn-search').click();page.locator('#search').fill('Rainbow Dragon Cave');assert page.locator('#results [data-id="rainbow_mine"]').count()==1
  page.locator('#results [data-id="rainbow_mine"]').click();assert 'P' in page.locator('#detail-design').inner_text();assert page.locator('#detail-sources a').count()>=5
  page.locator('#close-detail').click();page.locator('#close-drawer').click()
  for cid,view,other in [('misumaru','mineInvestigation','momoyo'),('momoyo','mineDepth','misumaru')]:
   page.evaluate('id=>ATLAS.characters.select(id,false)',cid);draw(True);assert page.evaluate('ATLAS.state.view')==view
   assert '原作图待核' in page.locator('#character-portrait').inner_text()
   assert page.evaluate("id=>{const c=ATLAS.characters.data.find(c=>c.id===id);return JSON.stringify(c.position)===JSON.stringify(c.runtimePosition)}",cid)
   assert page.evaluate("id=>ATLAS.characters.elements.filter(e=>e.cs.some(c=>c.id===id)).every(e=>e.el.hidden)",other)
   page.locator('#close-character-detail').click()
  passed('Alias, source links and two scene-specific character positions')
  visit('mineRailYard','rainbowmine');before=page.evaluate('ATLAS.rig.eye.slice()');page.mouse.move(966,317);page.mouse.down();page.mouse.move(1078,381,steps=6);page.mouse.up();page.evaluate('ATLAS.rig.update(0);ATLAS.renderOnce()');assert page.evaluate('ATLAS.rig.eye.slice()')!=before
  assert page.locator('[data-camera-mode="ground"]').is_disabled();page.locator('[data-camera-mode="fly"]').click();assert page.evaluate('ATLAS.rig.mode')=='fly';page.locator('[data-camera-mode="orbit"]').click()
  passed('Pointer orbit and inherited free flight, without claiming mine collision')
  samples=page.evaluate('GA.RAINBOW_MINE.route.filter((p,i)=>i%18===0)')
  for x,y,z in samples:
   assert page.evaluate("p=>{ATLAS.rig.setView({space:'mountain_mine',eye:[p[0],p[1]+5,p[2]],target:[GA.RAINBOW_MINE.center(p[2]-9),p[1]+5,p[2]-9]},false);ATLAS.renderOnce();return ATLAS.renderer.records.some(r=>r.wanted&&r.data.owner==='rainbowmine');}",[x,y,z])
  passed('Continuous main mine route camera samples',{'samples':len(samples),'collisionTest':False})
  for v,r in [('jigokuOverview','currenthell'),('kasenStudy','kasen'),('backdoorSpring','backdoor'),('primateCore','primate_core'),('heavenPavilion','heaven'),('hakugyokuHall','netherworld'),('liminalMarket','shigan'),('moonTeaRoom','lunar'),('pandemoniumHall','makai05'),('hellHall','oldhell'),('forest','forest')]:
   rows=visit(v,r);assert all(m['owner']!='rainbowmine' for m in rows);assert not page.evaluate('ATLAS.renderer.mineLights.some(l=>l.visible)');passed('Cross-chart return '+v)
  visit('shrineDiorama','hakurei');page.locator('[data-weather="rain"]').click();page.locator('#light-dusk').click();draw();visit('mineThreshold','rainbowmine');assert not page.evaluate('ATLAS.renderer.rain.visible')
  visit('shrineDiorama','hakurei');assert page.evaluate('ATLAS.state.weather')=='rain' and page.evaluate('ATLAS.state.lighting')=='dusk'
  assert page.evaluate('ATLAS.renderer.sun.shadow.normalBias===ATLAS.renderer.lunarShadowDefaults.normalBias');passed('Surface climate and shadow parameters restore after the mine')
  # Production path: genuine toolbar events and scheduler; no renderOnce or gl.finish.
  page.evaluate('globalThis.ATLAS_TEST_PAUSE=false;ATLAS.state.motion=true;ATLAS.wake()')
  for selector in ['#btn-mine','#btn-overview','#btn-backdoor','#btn-mine','#btn-overview']:
   frames=page.evaluate('ATLAS.state.drawnFrames');page.locator(selector).click();page.wait_for_function('n=>ATLAS.state.drawnFrames>n+1',arg=frames,polling=250)
  page.evaluate('globalThis.ATLAS_TEST_PAUSE=true;ATLAS.state.motion=false');page.wait_for_timeout(500)
  report['checks'].append({'name':'Production toolbar switches without explicit frame/GPU synchronization','result':'failed' if report['errors'] else 'passed','errorsSoFar':len(report['errors'])})
  visit('diorama');page.evaluate('ATLAS.stream.trim(true);ATLAS.renderOnce()')
  cancel=page.evaluate("()=>{const s=ATLAS.stream,b=s.metrics.cancelled;ATLAS.setView('mineThreshold',false);ATLAS.setView('diorama',false);s.trim(true);return s.metrics.cancelled-b}");assert cancel>=1;passed('Native Worker cancellation discards obsolete mine results')
  cycles=[]
  for _ in range(3):
   visit('mineCart','rainbowmine');visit('diorama');page.evaluate('ATLAS.stream.trim(true);ATLAS.renderOnce();ATLAS.renderer.trim(true)')
   snap=page.evaluate("()=>({cache:ATLAS.stream.cache.size,detail:ATLAS.renderer.records.filter(r=>r.data.owner==='rainbowmine'&&!r.data.overview).length,lights:ATLAS.renderer.mineLights.filter(l=>l.visible).length,...ATLAS.renderer.engine.info.memory})")
   assert snap['cache']==0 and snap['detail']==0 and snap['lights']==0;cycles.append(snap)
  assert max(s['textures'] for s in cycles)-min(s['textures'] for s in cycles)<=2 and max(s['geometries'] for s in cycles)-min(s['geometries'] for s in cycles)<=2;passed('Three mine rebuild/eviction cycles have bounded resource counts',cycles)
  visit('mineThreshold','rainbowmine');page.locator('#btn-settings').click();page.locator('#quality').select_option('low');page.locator('#opt-ao').uncheck();page.locator('#opt-bloom').uncheck();draw();page.locator('#close-settings').click()
  page.set_viewport_size({'width':390,'height':844});draw();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1');page.screenshot(path=str(a.output/'narrow-mine.png'));passed('Low quality without AO/bloom and 390px controls')
  e=page.evaluate('ATLAS.exportState()');assert e['rainbowMineModule']=='0.28.0';assert e['landmarks']['navigable']==91 and e['landmarks']['pending']==88
  assert e['displayTransforms']['rainbowmine']=={'scale':1,'offset':[0,0,0]};assert page.evaluate("['false_ceiling','casino','hiten'].every(id=>GA.resolveLocation(id).view===null)")
  passed('Export agrees with 91/88; adjacent unbuilt highland/casino stay pending')
  assert not report['errors'],'\n'.join(report['errors'])[:4000];report['passed']=True;browser.close()
except Exception as e:
 report['passed']=False;report['failure']=str(e);raise
finally:
 if server:server.shutdown()
 (a.output/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
