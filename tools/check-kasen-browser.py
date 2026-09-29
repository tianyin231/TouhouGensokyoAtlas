"""Optional Playwright/WebGL regression. Default: real local HTTP.
Use --content only when HTTP navigation is unavailable; the report records it.
Build first. Playwright/Chromium are test dependencies, not build dependencies.
"""
from pathlib import Path
import argparse, hashlib, json, threading
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--content',action='store_true');p.add_argument('--headed',action='store_true');p.add_argument('--chromium');p.add_argument('--output',type=Path,default=ROOT/'dist/kasen-browser-check')
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
  page.evaluate("()=>{for(const name of ['webglcontextlost','webglcontextrestored'])document.getElementById('scene').addEventListener(name,()=>console.warn('KASEN_CONTEXT_EVENT:'+name+':'+ATLAS.state.view));}")
  report['browser']=browser.version
  report['webgl']=page.evaluate("()=>{const g=ATLAS.renderer.engine.getContext(),e=g.getExtension('WEBGL_debug_renderer_info');return {version:g.getParameter(g.VERSION),renderer:e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):g.getParameter(g.RENDERER)}}")
  def passed(name,data=None):
   report['checks'].append({'name':name,'result':'passed','data':data});print(name,data or '',flush=True)
  def draw():
   return page.evaluate("()=>{ATLAS.state.motion=false;ATLAS.state.characters=false;ATLAS.state.labels=false;ATLAS.renderOnce();return ATLAS.renderer.records.filter(r=>r.wanted).map(r=>({owner:r.data.owner,far:r.data.overview,part:r.data.kasenPart,edition:r.data.kasenEdition}));}")
  def visit(view,region=None):
   page.evaluate('v=>ATLAS.setView(v,false)',view)
   if region:page.wait_for_function('id=>ATLAS.stream.cache.has(id)',arg=region,polling=250)
   return draw()
  assert page.evaluate('ATLAS.stream.cache.size')==0
  assert not page.evaluate("ATLAS.renderer.records.some(r=>r.wanted&&r.data.owner==='kasen')||ATLAS.renderer.kasenSky.visible")
  assert page.evaluate("ATLAS.world.meshes.some(m=>m.owner==='kasen'&&m.overview)")
  passed('Cold surface keeps only the independent low-detail proxy')
  result=page.evaluate("()=>{ATLAS.setView('kasenOverview',false);ATLAS.renderOnce();return {native:ATLAS.stream.pending?.worker instanceof Worker,far:ATLAS.renderer.records.filter(r=>r.wanted&&r.data.owner==='kasen'&&r.data.overview).length};}")
  assert result['native'] and result['far']>0
  page.wait_for_function("ATLAS.stream.cache.has('kasen')",polling=250);rows=draw();assert rows and all(r['owner']=='kasen' and not r['far'] for r in rows)
  passed('Native Worker and synchronous proxy-to-detail replacement',result)
  views=page.evaluate('Object.keys(GA.KASEN.views)')
  for v in views:
   rows=visit(v,'kasen');assert rows and all(r['owner']=='kasen' and not r['far'] for r in rows)
   assert page.evaluate('ATLAS.renderer.kasenSky.visible') and not page.evaluate('ATLAS.renderer.sky.visible||ATLAS.renderer.rain.visible')
   if v=='kasenInk':
    assert all(r['edition']=='both' for r in rows);assert not page.evaluate('ATLAS.renderer.kasenFill.visible')
   if v=='kasenSection':assert not any(r['part'] in ['roof0','roof1','roof2','upper','front'] for r in rows)
   assert any(r['part']=='ritual' for r in rows)==(v=='kasenRitual')
   if v in ['kasenOverview','kasenManor','kasenStudy','kasenWindow','kasenStream','kasenInk','kasenNight','kasenSection','kasenRitual']:
    page.screenshot(path=str(a.output/(v+'.png')))
   passed('Preset '+v,{'visibleMeshes':len(rows)})
  rows=visit('kasenManor','kasen');assert any(r['part']=='roof2' for r in rows);assert page.evaluate('ATLAS.renderer.kasenNight.value')==0 and page.evaluate('ATLAS.renderer.kasenInk.value')==0
  passed('Normal view restores roofs and clears ink/night/ritual flags')
  visit('kasenStream','kasen');page.evaluate('ATLAS.state.clock=31.25;ATLAS.renderOnce()');pixels=page.locator('#scene').screenshot();page.evaluate('ATLAS.renderOnce()');assert pixels==page.locator('#scene').screenshot()
  page.evaluate('ATLAS.state.clock=46.5;ATLAS.renderOnce()');assert pixels!=page.locator('#scene').screenshot();assert page.evaluate('ATLAS.renderer.timeUniform.value')==46.5
  passed('Water and mist pixels animate; pause preserves a nonzero shared clock')
  page.locator('#btn-search').click();page.locator('#search').fill('Kasen')
  assert page.locator('#results [data-id="kasen_senkai"]').count()==1 and page.locator('#results [data-id="kasen_home"]').count()==1
  page.locator('#results [data-id="kasen_home"]').click();assert 'P' in page.locator('#detail-design').inner_text();assert page.locator('#detail-sources a').count()>=4
  page.locator('#close-detail').click();page.locator('#close-drawer').click()
  page.evaluate("ATLAS.characters.select('kasen',false)");draw();assert page.evaluate('ATLAS.state.space')=='senkai_kasen'
  assert '原作图待核' in page.locator('#character-portrait').inner_text()
  assert page.evaluate("()=>{const c=ATLAS.characters.data.find(c=>c.id==='kasen');return JSON.stringify(c.position)===JSON.stringify(c.runtimePosition)}")
  page.locator('#close-character-detail').click();passed('Aliases, source panel and exact independent-space character annotation')
  for v in ['kasenInk','kasenRitual']:
   visit(v,'kasen');page.evaluate('ATLAS.state.characters=true;ATLAS.renderOnce()');assert page.evaluate("ATLAS.characters.elements.filter(e=>e.cs[0].id==='kasen').every(e=>e.el.hidden)")
  passed('Manga household annotation is excluded from ink and absent-owner event views')
  visit('kasenCourtyard','kasen');before=page.evaluate('ATLAS.rig.eye.slice()');page.mouse.move(986,320);page.mouse.down();page.mouse.move(1098,395,steps=6);page.mouse.up();page.evaluate('ATLAS.rig.update(0);ATLAS.renderOnce()');assert page.evaluate('ATLAS.rig.eye.slice()')!=before
  assert page.locator('[data-camera-mode="ground"]').is_disabled();page.locator('[data-camera-mode="fly"]').click();assert page.evaluate('ATLAS.rig.mode')=='fly';page.locator('[data-camera-mode="orbit"]').click()
  passed('Real pointer orbit/free flight; ground walking stays surface-only')
  visit('kasenPath','kasen');samples=page.evaluate("()=>{const ps=GA.buildKasenOverview().meta.path;return ps.filter((p,i)=>i%Math.ceil(ps.length/12)===0)}")
  for x,y,z in samples:
   rows=page.evaluate("p=>{ATLAS.rig.setView({space:'senkai_kasen',eye:[p[0]+12,p[1]+17,p[2]+25],target:[p[0],p[1]+5,p[2]-18]},false);ATLAS.renderOnce();return ATLAS.renderer.records.filter(r=>r.wanted&&r.data.owner==='kasen').length}",[x,y,z]);assert rows>0
  passed('Continuous garden path camera samples without chart changes',{'samples':len(samples),'collisionTest':False})
  for v,r in [('backdoorSpring','backdoor'),('primateCore','primate_core'),('heavenPavilion','heaven'),('hakugyokuHall','netherworld'),('liminalMarket','shigan'),('moonTeaRoom','lunar'),('dreamWithin','kaian'),('pandemoniumHall','makai05'),('hellHall','oldhell'),('forest','forest')]:
   rows=visit(v,r);assert not any(m['owner']=='kasen' for m in rows);assert not page.evaluate('ATLAS.renderer.kasenSky.visible||ATLAS.renderer.kasenFill.visible');passed('Cross-chart return '+v)
  visit('shrineDiorama','hakurei');page.locator('[data-weather="rain"]').click();page.locator('#light-dusk').click();draw();visit('kasenNight','kasen');assert not page.evaluate('ATLAS.renderer.rain.visible')
  visit('shrineDiorama','hakurei');assert page.evaluate('ATLAS.state.weather')=='rain' and page.evaluate('ATLAS.state.lighting')=='dusk'
  assert page.evaluate('ATLAS.renderer.sun.shadow.normalBias===ATLAS.renderer.lunarShadowDefaults.normalBias');passed('Ground climate and shadow settings restore after the hermit world')
  # Use the production scheduler, without manual renderOnce or gl.finish in this section.
  page.evaluate('globalThis.ATLAS_TEST_PAUSE=false;ATLAS.state.motion=true;ATLAS.wake()')
  for selector in ['#btn-kasen','#btn-overview','#btn-backdoor','#btn-kasen','#btn-overview']:
   frames=page.evaluate('ATLAS.state.drawnFrames');page.locator(selector).click();page.wait_for_function('n=>ATLAS.state.drawnFrames>n+1',arg=frames,polling=250)
  page.evaluate('globalThis.ATLAS_TEST_PAUSE=true;ATLAS.state.motion=false');page.wait_for_timeout(500)
  if report['errors']:
   report['checks'].append({'name':'Production animated toolbar switching without synchronized rendering','result':'failed','errorCount':len(report['errors'])});print('Production toolbar shader errors retained:',len(report['errors']),flush=True)
  else:passed('Production animated toolbar switching without synchronized rendering')
  visit('diorama');page.evaluate('ATLAS.stream.trim(true);ATLAS.renderOnce()')
  cancel=page.evaluate("()=>{const s=ATLAS.stream,b=s.metrics.cancelled;ATLAS.setView('kasenOverview',false);ATLAS.setView('diorama',false);s.trim(true);return s.metrics.cancelled-b}");assert cancel>=1
  passed('Cancellation rejects an unneeded native Worker result')
  cycles=[]
  for _ in range(3):
   visit('kasenStudy','kasen');visit('diorama');page.evaluate('ATLAS.stream.trim(true);ATLAS.renderOnce();ATLAS.renderer.trim(true)')
   snap=page.evaluate("()=>({cache:ATLAS.stream.cache.size,detail:ATLAS.renderer.records.filter(r=>r.data.owner==='kasen'&&!r.data.overview).length,fill:ATLAS.renderer.kasenFill.visible,...ATLAS.renderer.engine.info.memory})")
   assert snap['cache']==0 and snap['detail']==0 and not snap['fill'];cycles.append(snap)
  assert max(s['textures'] for s in cycles)-min(s['textures'] for s in cycles)<=2 and max(s['geometries'] for s in cycles)-min(s['geometries'] for s in cycles)<=2
  passed('Three rebuild/release cycles keep resource counts bounded',cycles)
  visit('kasenOverview','kasen');page.locator('#btn-settings').click();page.locator('#quality').select_option('low');page.locator('#opt-ao').uncheck();page.locator('#opt-bloom').uncheck();draw();page.locator('#close-settings').click()
  page.set_viewport_size({'width':390,'height':844});draw();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1');page.screenshot(path=str(a.output/'narrow-kasen.png'))
  passed('Low quality without AO/bloom and 390px controls')
  export=page.evaluate('ATLAS.exportState()');assert export['kasenModule']=='0.26.0';assert export['landmarks']['navigable']==89 and export['landmarks']['pending']==90
  assert export['displayTransforms']['kasen']=={'scale':1,'offset':[0,0,0]};passed('Export and shared resolver agree on 89/90 navigation coverage')
  assert not report['errors'],'\n'.join(report['errors'])[:4000];report['passed']=True;browser.close()
except Exception as e:
 report['passed']=False;report['failure']=str(e);raise
finally:
 if server:server.shutdown()
 (a.output/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
