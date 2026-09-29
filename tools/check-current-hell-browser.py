"""Current Hell WebGL regression; default is real HTTP, --content is an explicit fallback.
Playwright/Chromium are optional test dependencies, not build dependencies.
"""
from pathlib import Path
import argparse, hashlib, json, threading
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--content',action='store_true');p.add_argument('--headed',action='store_true');p.add_argument('--chromium');p.add_argument('--output',type=Path,default=ROOT/'dist/current-hell-browser-check')
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
   return page.evaluate("m=>{ATLAS.state.motion=false;ATLAS.state.characters=m;ATLAS.state.labels=false;ATLAS.renderOnce();return ATLAS.renderer.records.filter(r=>r.wanted).map(r=>({owner:r.data.owner,space:r.data.space,far:r.data.overview,part:r.data.jigokuPart,material:r.data.material}));}",markers)
  def visit(view,region=None):
   page.evaluate('v=>ATLAS.setView(v,false)',view)
   if region:page.wait_for_function('id=>ATLAS.stream.cache.has(id)',arg=region,polling=250)
   return draw()
  assert page.evaluate('ATLAS.stream.cache.size')==0
  assert not page.evaluate("ATLAS.renderer.records.some(r=>r.wanted&&GA.CURRENT_HELL.regions.includes(r.data.owner))||ATLAS.renderer.jigokuSky.visible")
  assert page.evaluate("GA.CURRENT_HELL.regions.every(id=>ATLAS.world.meshes.some(m=>m.owner===id&&m.overview))")
  passed('Cold surface retains cheap proxies without constructing new detail')
  result=page.evaluate("()=>{ATLAS.setView('jigokuOverview',false);ATLAS.renderOnce();return {native:ATLAS.stream.pending?.worker instanceof Worker,far:ATLAS.renderer.records.filter(r=>r.wanted&&r.data.owner==='currenthell'&&r.data.overview).length};}")
  assert result['native'] and result['far']>0
  page.wait_for_function("ATLAS.stream.cache.has('currenthell')",polling=250);rows=draw();assert rows and all(r['owner']=='currenthell' and not r['far'] for r in rows)
  passed('Native Worker replaces the synchronous proxy without overlapping detail',result)
  views=page.evaluate('Object.entries(GA.CURRENT_HELL.views).map(([id,p])=>({id,region:p.region,space:p.space,storm:!!p.jigokuStorm}))')
  for v in views:
   rows=visit(v['id'],v['region']);assert rows and all(r['owner']==v['region'] and not r['far'] for r in rows)
   assert page.evaluate('ATLAS.renderer.jigokuSky.visible') and not page.evaluate('ATLAS.renderer.sky.visible||ATLAS.renderer.rain.visible')
   assert any(r['part']=='storm' for r in rows)==v['storm']
   if v['region']=='avici':assert all(r['part'] not in ['wind','storm'] for r in rows) and not page.evaluate('ATLAS.renderer.hasVisibleAnimation')
   if v['id'] in ['jigokuOverview','jigokuBonefield','jigokuSkull','jigokuRidge','jigokuStorm','aviciOverview','aviciRemains']:
    page.screenshot(path=str(a.output/(v['id']+'.png')))
   passed('Preset '+v['id'],{'visibleMeshes':len(rows),'space':v['space']})
  visit('jigokuStorm','currenthell');page.evaluate('ATLAS.state.clock=31.25;ATLAS.renderOnce()');pixels=page.locator('#scene').screenshot();page.evaluate('ATLAS.renderOnce()');assert pixels==page.locator('#scene').screenshot()
  page.evaluate('ATLAS.state.clock=46.5;ATLAS.renderOnce()');assert pixels!=page.locator('#scene').screenshot();assert page.evaluate('ATLAS.renderer.timeUniform.value')==46.5
  passed('Scarlet wind pixels animate; pause retains a nonzero shared clock')
  visit('aviciOverview','avici');page.evaluate('ATLAS.state.clock=13;ATLAS.renderOnce()');pixels=page.locator('#scene').screenshot();page.evaluate('ATLAS.state.clock=58;ATLAS.renderOnce()');assert pixels==page.locator('#scene').screenshot()
  passed('Avici remains visually motionless despite a different global clock')
  visit('jigokuOverview','currenthell');assert not page.evaluate('ATLAS.state.jigokuStorm');assert page.evaluate('ATLAS.renderer.jigokuStrength.value')==1;assert page.evaluate('ATLAS.renderer.jigokuEmpty.value')==0
  passed('Ordinary view restores the sky and removes event-only storm geometry')
  page.locator('#btn-search').click();page.locator('#search').fill('Jigoku');assert page.locator('#results [data-id="hell"]').count()==1
  page.locator('#results [data-id="hell"]').click();assert 'P' in page.locator('#detail-design').inner_text();assert page.locator('#detail-sources a').count()>=5
  page.locator('#close-detail').click();page.locator('#close-drawer').click()
  for cid,view in [('hecatia','jigokuOverview'),('zanmu','jigokuAudience'),('hisami','jigokuGuide')]:
   page.evaluate('id=>ATLAS.characters.select(id,false)',cid);draw(True);assert page.evaluate('ATLAS.state.view')==view
   assert '原作图待核' in page.locator('#character-portrait').inner_text()
   assert page.evaluate("id=>{const c=ATLAS.characters.data.find(c=>c.id===id);return JSON.stringify(c.position)===JSON.stringify(c.runtimePosition)}",cid)
   page.locator('#close-character-detail').click()
  passed('Hell aliases, sources and three non-origin character annotations')
  for v,r in [('jigokuOverview','currenthell'),('aviciRemains','avici')]:
   visit(v,r);draw(True);assert page.evaluate("ATLAS.characters.elements.filter(e=>e.cs.some(c=>c.jigokuEra==='th19')).every(e=>e.el.hidden)")
  assert page.evaluate("ATLAS.characters.elements.every(e=>!e.cs.some(c=>c.jigokuEra==='th19')||e.cs.every(c=>c.jigokuEra==='th19'))")
  passed('TH19 annotations cannot leak through a mixed-era grouped pin')
  visit('jigokuArrival','currenthell');before=page.evaluate('ATLAS.rig.eye.slice()');page.mouse.move(986,320);page.mouse.down();page.mouse.move(1098,395,steps=6);page.mouse.up();page.evaluate('ATLAS.rig.update(0);ATLAS.renderOnce()');assert page.evaluate('ATLAS.rig.eye.slice()')!=before
  assert page.locator('[data-camera-mode="ground"]').is_disabled();page.locator('[data-camera-mode="fly"]').click();assert page.evaluate('ATLAS.rig.mode')=='fly';page.locator('[data-camera-mode="orbit"]').click()
  passed('Real pointer orbit and free flight; no fabricated Hell ground collision')
  samples=page.evaluate("()=>{const ps=GA.buildCurrentHell(true).meta.path;return ps.filter((p,i)=>i%Math.ceil(ps.length/12)===0)}")
  for x,y,z in samples:
   assert page.evaluate("p=>{ATLAS.rig.setView({space:'hell_present',eye:[p[0]+12,p[1]+22,p[2]+28],target:[p[0],p[1]+6,p[2]-18]},false);ATLAS.renderOnce();return ATLAS.renderer.records.filter(r=>r.wanted&&r.data.owner==='currenthell').length}",[x,y,z])>0
  passed('Continuous wind-scoured route camera samples',{'samples':len(samples),'collisionTest':False})
  for v,r in [('kasenStudy','kasen'),('backdoorSpring','backdoor'),('primateCore','primate_core'),('heavenPavilion','heaven'),('hakugyokuHall','netherworld'),('liminalMarket','shigan'),('moonTeaRoom','lunar'),('dreamWithin','kaian'),('pandemoniumHall','makai05'),('hellHall','oldhell'),('forest','forest')]:
   rows=visit(v,r);assert not any(m['owner'] in ['currenthell','avici'] for m in rows);assert not page.evaluate('ATLAS.renderer.jigokuSky.visible');passed('Cross-chart return '+v)
  visit('shrineDiorama','hakurei');page.locator('[data-weather="rain"]').click();page.locator('#light-dusk').click();draw();visit('jigokuOverview','currenthell');assert not page.evaluate('ATLAS.renderer.rain.visible')
  visit('shrineDiorama','hakurei');assert page.evaluate('ATLAS.state.weather')=='rain' and page.evaluate('ATLAS.state.lighting')=='dusk'
  assert page.evaluate('ATLAS.renderer.sun.shadow.normalBias===ATLAS.renderer.lunarShadowDefaults.normalBias');passed('Surface climate and shadow parameters restore after Hell')
  # Production scheduler: no renderOnce/gl.finish between the following real clicks.
  page.evaluate('globalThis.ATLAS_TEST_PAUSE=false;ATLAS.state.motion=true;ATLAS.wake()')
  for selector in ['#btn-currenthell','#btn-overview','#btn-backdoor','#btn-currenthell','#btn-overview']:
   frames=page.evaluate('ATLAS.state.drawnFrames');page.locator(selector).click();page.wait_for_function('n=>ATLAS.state.drawnFrames>n+1',arg=frames,polling=250)
  page.evaluate('globalThis.ATLAS_TEST_PAUSE=true;ATLAS.state.motion=false');page.wait_for_timeout(500)
  report['checks'].append({'name':'Production animated toolbar switching without explicit synchronization','result':'failed' if report['errors'] else 'passed','errorsSoFar':len(report['errors'])})
  visit('diorama');page.evaluate('ATLAS.stream.trim(true);ATLAS.renderOnce()')
  cancel=page.evaluate("()=>{const s=ATLAS.stream,b=s.metrics.cancelled;ATLAS.setView('jigokuOverview',false);ATLAS.setView('diorama',false);s.trim(true);return s.metrics.cancelled-b}");assert cancel>=1;passed('Native Worker cancellation discards an unneeded result')
  cycles=[]
  for _ in range(3):
   visit('jigokuSkull','currenthell');visit('aviciRemains','avici');visit('diorama');page.evaluate('ATLAS.stream.trim(true);ATLAS.renderOnce();ATLAS.renderer.trim(true)')
   snap=page.evaluate("()=>({cache:ATLAS.stream.cache.size,detail:ATLAS.renderer.records.filter(r=>GA.CURRENT_HELL.regions.includes(r.data.owner)&&!r.data.overview).length,...ATLAS.renderer.engine.info.memory})")
   assert snap['cache']==0 and snap['detail']==0;cycles.append(snap)
  assert max(s['textures'] for s in cycles)-min(s['textures'] for s in cycles)<=2 and max(s['geometries'] for s in cycles)-min(s['geometries'] for s in cycles)<=2;passed('Three rebuild/eviction cycles retain bounded resource counts',cycles)
  visit('jigokuOverview','currenthell');page.locator('#btn-settings').click();page.locator('#quality').select_option('low');page.locator('#opt-ao').uncheck();page.locator('#opt-bloom').uncheck();draw();page.locator('#close-settings').click()
  page.set_viewport_size({'width':390,'height':844});draw();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1');page.screenshot(path=str(a.output/'narrow-currenthell.png'));passed('Low quality without AO/bloom and 390px controls')
  e=page.evaluate('ATLAS.exportState()');assert e['currentHellModule']=='0.27.0';assert e['landmarks']['navigable']==90 and e['landmarks']['pending']==89
  for region in ['currenthell','avici']:assert e['displayTransforms'][region]=={'scale':1,'offset':[0,0,0]}
  passed('Export and shared resolver agree on 90/89 navigation')
  assert not report['errors'],'\n'.join(report['errors'])[:4000];report['passed']=True;browser.close()
except Exception as e:
 report['passed']=False;report['failure']=str(e);raise
finally:
 if server:server.shutdown()
 (a.output/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
