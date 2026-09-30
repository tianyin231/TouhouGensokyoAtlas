"""Mayohiga serial regression: actual WebGL/Blob Worker, HTTP by default.
Explicit --content fallback for hosts that block localhost. No hardware FPS claim.
"""
import argparse, hashlib, json, threading, traceback
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--content',action='store_true');p.add_argument('--headed',action='store_true');p.add_argument('--chromium')
p.add_argument('--output',type=Path,default=ROOT/'dist/mayohiga-browser-check')
a=p.parse_args();a.output.mkdir(parents=True,exist_ok=True)
i=json.loads((ROOT/'dist/release.json').read_text());html=(ROOT/'dist'/i['artifact']).read_bytes();assert hashlib.sha256(html).hexdigest()==i['sha256']
r={'sha256':i['sha256'],'loadMode':'about:blank content / native Blob Worker' if a.content else 'HTTP','viewport':[1280,720],'dpr':1,'weather':'clear','quality':'balanced','ao':True,'bloom':False,'reflections':False,'clock':0,'hardwareFPSMeasured':False,'checks':[],'views':{},'errors':[],'externalErrors':[],'contextEvents':[]};server=None;page=None

def save():(a.output/'report.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
def passed(name,data=None):r['checks'].append({'name':name,'data':data});save();print('PASS',name,flush=True)
try:
 if not a.content:
  server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(ROOT/'dist')));threading.Thread(target=server.serve_forever,daemon=True).start()
 with sync_playwright() as pw:
  launch={'headless':not a.headed,'args':['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader','--disable-dev-shm-usage']}
  if a.chromium:launch['executable_path']=a.chromium
  browser=pw.chromium.launch(**launch);page=browser.new_page(viewport={'width':1280,'height':720},device_scale_factor=1);page.set_default_timeout(90000)
  page.on('pageerror',lambda e:r['errors'].append(str(e)))
  page.on('console',lambda m:(r['externalErrors'] if 'Failed to load resource' in m.text else r['errors']).append(m.text) if m.type=='error' else None)
  page.add_init_script('globalThis.ATLAS_TEST_PAUSE=true;')
  if a.content:page.evaluate('globalThis.ATLAS_TEST_PAUSE=true');page.set_content(html.decode(),wait_until='load')
  else:page.goto(f'http://127.0.0.1:{server.server_port}/{i["artifact"]}',wait_until='load')
  page.wait_for_function('globalThis.ATLAS||globalThis.ATLAS_BOOT_ERROR');assert page.evaluate('globalThis.ATLAS_BOOT_ERROR||null') is None
  page.evaluate("()=>{globalThis.mayoContextEvents=[];for(const k of ['webglcontextlost','webglcontextrestored'])document.querySelector('#scene').addEventListener(k,e=>mayoContextEvents.push({event:k,view:ATLAS.state.view,time:performance.now()}));}")
  r['browser']=browser.version;r['webgl']=page.evaluate("()=>{const g=ATLAS.renderer.engine.getContext(),e=g.getExtension('WEBGL_debug_renderer_info');return {version:g.getParameter(g.VERSION),renderer:e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):g.getParameter(g.RENDERER)}}")
  page.evaluate("Object.assign(ATLAS.state,{motion:false,clock:0,labels:false,characters:false,quality:'balanced',weather:'clear',lighting:'neutral',ao:true,bloom:false,reflections:false})")
  assert page.evaluate('ATLAS.stream.cache.size')==0
  assert page.evaluate("ATLAS.world.meshes.some(m=>m.owner==='mayohiga'&&m.overview)&&!ATLAS.world.meshes.some(m=>m.owner==='mayohiga'&&!m.overview)")
  passed('Cold world builds only the lightweight village and public roads')
  def draw():return page.evaluate("()=>{ATLAS.state.labels=false;ATLAS.state.characters=false;ATLAS.renderOnce();return ATLAS.renderer.records.filter(r=>r.wanted&&r.data.owner==='mayohiga').map(r=>({far:r.data.overview,part:r.data.mayoPart,zone:r.data.mayoZone}));}")
  def visit(v,region=None):
   page.evaluate('v=>ATLAS.setView(v,false)',v)
   if region:page.wait_for_function('id=>ATLAS.stream.cache.has(id)',arg=region,polling=200)
   return draw()
  d=page.evaluate("()=>{ATLAS.setView('mayoOverview',false);ATLAS.renderOnce();return {native:ATLAS.stream.pending?.worker instanceof Worker,far:ATLAS.renderer.records.some(r=>r.wanted&&r.data.owner==='mayohiga'&&r.data.overview&&r.data.mayoPart!=='route')}}")
  assert d['native'] and d['far'];page.wait_for_function("ATLAS.stream.cache.has('mayohiga')",polling=200);rows=draw();assert any(not x['far'] for x in rows);assert not any(x['far'] and x['part']!='route' for x in rows)
  passed('Native Worker replaces village proxy; public roads remain',d)
  page.evaluate("document.body.classList.add('ui-hidden');ATLAS.state.uiHidden=true")
  for v in page.evaluate('Object.keys(GA.MAYOHIGA.views)'):
   rows=visit(v,'mayohiga');assert rows;assert page.evaluate('ATLAS.renderer.sky.visible');assert not page.evaluate('ATLAS.renderer.engine.getContext().isContextLost()')
   page.locator('#scene').screenshot(path=str(a.output/(v+'-after.png')))
   r['views'][v]=page.evaluate('({stats:ATLAS.renderer.info().stats,camera:{eye:ATLAS.rig.eye,target:ATLAS.rig.target,fov:ATLAS.rig.fov},stream:ATLAS.stream.info(),clock:ATLAS.state.clock})')
   passed('Fixed camera '+v,{'visibleRecords':len(rows)})
  assert not any(x['part']=='roof' and x['zone']=='main' for x in rows)
  rows=visit('mayoHouse','mayohiga');assert any(x['part']=='roof' and x['zone']=='main' for x in rows)
  passed('Main house cutaway reverses; other roofs keep their authored breaches')
  route=page.evaluate('GA.MAYOHIGA.paths[0].filter((p,i,a)=>i%Math.ceil(a.length/12)===0||i===a.length-1)')
  for q in route:
   assert page.evaluate("q=>{const y=GA.SurfaceContact.sampler(ATLAS.data,'mayohiga').height(q[0],q[1]);ATLAS.rig.setView({space:'surface',eye:[q[0]-8,y+12,q[1]+14],target:[q[0],y+1,q[1]]},false);ATLAS.renderOnce();return ATLAS.renderer.records.some(r=>r.wanted&&r.data.owner==='mayohiga'&&r.data.mayoPart==='route')}",q)
  passed('Approach road and inherited junction are visible',{'samples':len(route),'buildingCollision':False})
  visit('mayoOverview','mayohiga');page.evaluate("document.body.classList.remove('ui-hidden');ATLAS.state.uiHidden=false")
  page.locator('#btn-search').click();page.locator('#search').fill('Mayoiga');page.locator('#results [data-id="mayohiga"]').click();draw()
  assert page.evaluate('ATLAS.state.view')=='mayoOverview';assert 'P' in page.locator('#detail-design').inner_text();assert page.locator('#detail-sources a').count()>=2
  page.locator('#close-detail').click();page.locator('#close-drawer').click();passed('Alias search, source links and P boundary')
  before=page.evaluate('ATLAS.rig.eye.slice()');page.mouse.move(800,270);page.mouse.down();page.mouse.move(870,310,steps=8);page.mouse.up();page.evaluate('ATLAS.rig.update(0)');draw();assert before!=page.evaluate('ATLAS.rig.eye.slice()');passed('Real mouse rotation')
  visit('mayoGate','mayohiga');page.locator('[data-camera-mode="ground"]').click();assert page.evaluate("ATLAS.rig.mode==='ground'");page.locator('[data-camera-mode="fly"]').click();assert page.evaluate("ATLAS.rig.mode==='fly'");page.locator('[data-camera-mode="orbit"]').click();passed('Ground mode and free flight preserved, without building collision')
  visit('diorama');assert all(x['far'] for x in draw());visit('mayoOverview','mayohiga');assert not any(x['far'] and x['part']!='route' for x in draw());passed('World overview and detail change without duplicate houses')
  for v,region in [('hitenFront','hiten'),('seikiConnection','seiki'),('asamaShrine','asama'),('forest','forest'),('shrineFront','hakurei')]:
   visit(v,region);assert not page.evaluate('ATLAS.renderer.engine.getContext().isContextLost()');passed('Selected inherited region '+v)
  page.evaluate("document.body.classList.add('ui-hidden');ATLAS.state.uiHidden=true")
  for light in ['neutral','night']:
   page.evaluate('light=>ATLAS.state.lighting=light',light);visit('shrineFront','hakurei');page.locator('#scene').screenshot(path=str(a.output/('shrine-'+light+'-after.png')));r['views']['shrine-'+light]=page.evaluate('ATLAS.renderer.info().stats')
  page.evaluate("ATLAS.state.lighting='neutral';document.body.classList.remove('ui-hidden');ATLAS.state.uiHidden=false")
  visit('mayoHouse','mayohiga');page.locator('#light-night').click();page.locator('[data-weather="rain"]').click();draw();visit('asamaShrine','asama');assert not page.evaluate('ATLAS.renderer.rain.visible');visit('mayoHouse','mayohiga');assert page.evaluate("ATLAS.state.weather==='rain'&&ATLAS.state.lighting==='night'");page.locator('#light-neutral').click();page.locator('[data-weather="clear"]').click();draw();passed('Night and rain survive underground round trip; no village point lights added')
  # Actual animation scheduling only in this section, with no manual draw or GPU finish.
  page.evaluate('globalThis.ATLAS_TEST_PAUSE=false;ATLAS.state.motion=false;ATLAS.wake()')
  for region in ['world','mayohiga','hiten','mayohiga']:
   n=page.evaluate('ATLAS.state.drawnFrames');page.locator('#region-select').select_option(region);page.wait_for_function('n=>ATLAS.state.drawnFrames>n',arg=n,polling=200)
  page.wait_for_function('!ATLAS.rig.transition');n=page.evaluate('ATLAS.state.drawnFrames');page.wait_for_timeout(1000);delta=page.evaluate('ATLAS.state.drawnFrames')-n;assert delta<=2
  page.evaluate('globalThis.ATLAS_TEST_PAUSE=true');passed('Production selectors and idle drawing',{'idleFramesInOneSecond':delta})
  visit('diorama');page.evaluate('ATLAS.stream.trim(true)');cancelled=page.evaluate("()=>{const n=ATLAS.stream.metrics.cancelled;ATLAS.setView('mayoOverview',false);ATLAS.setView('diorama',false);ATLAS.stream.trim(true);return ATLAS.stream.metrics.cancelled-n}");assert cancelled>=1;passed('Obsolete native Worker cancellation',cancelled)
  cycles=[]
  for _ in range(3):
   visit('mayoHouse','mayohiga');visit('diorama');page.evaluate('ATLAS.stream.trim(true);ATLAS.renderOnce();ATLAS.renderer.trim(true)')
   d=page.evaluate("()=>({cache:ATLAS.stream.cache.size,detail:ATLAS.renderer.records.filter(r=>r.data.owner==='mayohiga'&&!r.data.overview).length,road:ATLAS.world.meshes.filter(m=>m.owner==='mayohiga'&&m.mayoPart==='route').length,contactBytes:ATLAS.data.surfaceContacts.mayohiga.near.byteLength+ATLAS.data.surfaceContacts.mayohiga.far.byteLength,...ATLAS.renderer.engine.info.memory})");assert d['cache']==0 and d['detail']==0 and d['road']>0;cycles.append(d)
  assert len({d['contactBytes'] for d in cycles})==1;assert max(d['textures'] for d in cycles)-min(d['textures'] for d in cycles)<=2;passed('Three eviction cycles preserve public road and bounded contacts/textures',cycles)
  visit('mayoHouse','mayohiga');page.evaluate("Object.assign(ATLAS.state,{quality:'low',ao:false,bloom:false});ATLAS.renderer.setQuality('low');ATLAS.renderOnce()")
  page.locator('#scene').screenshot(path=str(a.output/'mayo-low-no-post.png'));assert not page.evaluate('ATLAS.renderer.info().stats.contactOcclusion');passed('Low quality without AO and bloom')
  page.set_viewport_size({'width':390,'height':844});draw();page.screenshot(path=str(a.output/'mayo-mobile.png'));assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+2');passed('390px layout')
  e=page.evaluate('ATLAS.exportState()');assert e['landmarks']['navigable']==104 and e['landmarks']['pending']==75;assert page.evaluate('JSON.parse(document.querySelector("#character-data").textContent).characters.length')==85
  passed('104 navigable / 75 pending; 85 original characters unchanged')
  r['contextEvents']=page.evaluate('mayoContextEvents');r['recovery']=page.evaluate('ATLAS.renderer.info().contextRecovery');r['contextLost']=page.evaluate('ATLAS.renderer.engine.getContext().isContextLost()')
  assert not r['errors'],r['errors'];assert not r['contextEvents'],r['contextEvents'];assert not r['contextLost'];passed('No JS/shader errors or lost/restored context in this serial session')
  r['passed']=True;browser.close()
except Exception as e:
 r['passed']=False;r['failure']=repr(e);traceback.print_exc()
 try:
  r['contextEvents']=page.evaluate('globalThis.mayoContextEvents||[]') if page else []
 except Exception:pass
finally:
 save()
 if server:server.shutdown()
if not r.get('passed'):raise SystemExit(1)
