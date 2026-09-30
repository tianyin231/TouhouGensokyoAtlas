"""Asama / Seiki WebGL regression: HTTP by default, explicit --content fallback.
Run one browser at a time on memory-limited software rendering machines.
"""
import argparse, hashlib, json, threading, traceback
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--content',action='store_true');p.add_argument('--headed',action='store_true');p.add_argument('--chromium')
p.add_argument('--output',type=Path,default=ROOT/'dist/asama-browser-check')
a=p.parse_args();a.output.mkdir(parents=True,exist_ok=True)
info=json.loads((ROOT/'dist/release.json').read_text());html=(ROOT/'dist'/info['artifact']).read_bytes()
assert hashlib.sha256(html).hexdigest()==info['sha256']
report={'sha256':info['sha256'],'loadMode':'about:blank content / native Blob Worker' if a.content else 'local HTTP','checks':[],'views':{},'errors':[],'externalErrors':[],'hardwareFPSMeasured':False,'viewport':[1280,720],'dpr':1}
server=None

def save(): (a.output/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
def passed(name,data=None):
 report['checks'].append({'name':name,'data':data,'errorCount':len(report['errors'])});save();print('PASS',name,data or '', 'errors='+str(len(report['errors'])),flush=True)
try:
 if not a.content:
  server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(ROOT/'dist')));threading.Thread(target=server.serve_forever,daemon=True).start()
 with sync_playwright() as pw:
  launch={'headless':not a.headed,'args':['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader','--disable-dev-shm-usage']}
  if a.chromium:launch['executable_path']=a.chromium
  browser=pw.chromium.launch(**launch);page=browser.new_page(viewport={'width':1280,'height':720},device_scale_factor=1);page.set_default_timeout(90000)
  page.on('pageerror',lambda e:report['errors'].append(str(e)))
  page.on('console',lambda m:(report['externalErrors'] if 'Failed to load resource' in m.text else report['errors']).append(m.text) if m.type=='error' else None)
  page.add_init_script('globalThis.ATLAS_TEST_PAUSE=true;')
  if a.content:
   page.evaluate('globalThis.ATLAS_TEST_PAUSE=true');page.set_content(html.decode(),wait_until='load',timeout=90000)
  else:page.goto(f'http://127.0.0.1:{server.server_port}/{info["artifact"]}',wait_until='load')
  page.wait_for_function('globalThis.ATLAS||globalThis.ATLAS_BOOT_ERROR');assert page.evaluate('globalThis.ATLAS_BOOT_ERROR||null') is None
  page.evaluate("""()=>{globalThis.asamaShaderErrors=[];ATLAS.renderer.engine.debug.onShaderError=(gl,p,v,f)=>{asamaShaderErrors.push({view:ATLAS.state.view,quality:ATLAS.state.quality,lost:gl.isContextLost(),valid:gl.isProgram(p),linked:gl.getProgramParameter(p,gl.LINK_STATUS),programLog:gl.getProgramInfoLog(p),vertexLog:gl.getShaderInfoLog(v),fragmentLog:gl.getShaderInfoLog(f),vertexCompiled:gl.getShaderParameter(v,gl.COMPILE_STATUS),fragmentCompiled:gl.getShaderParameter(f,gl.COMPILE_STATUS),glError:gl.getError()});console.error('Asama shader failure '+JSON.stringify(asamaShaderErrors.at(-1)));};}""")
  report['browser']=browser.version
  report['webgl']=page.evaluate("()=>{const g=ATLAS.renderer.engine.getContext(),e=g.getExtension('WEBGL_debug_renderer_info');return {version:g.getParameter(g.VERSION),renderer:e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):g.getParameter(g.RENDERER)}}")
  page.evaluate("Object.assign(ATLAS.state,{motion:false,clock:0,labels:false,characters:false,quality:'balanced',weather:'clear',lighting:'neutral'})")
  assert page.evaluate('ATLAS.stream.cache.size')==0
  assert page.evaluate("['seiki','asama'].every(id=>ATLAS.world.meshes.some(m=>m.owner===id&&m.overview))")
  passed('Cold world has lightweight overviews, no detail packs')
  def draw():
   return page.evaluate("()=>{ATLAS.state.labels=false;ATLAS.state.characters=false;ATLAS.renderOnce();return ATLAS.renderer.records.filter(r=>r.wanted&&['seiki','asama'].includes(r.data.owner)).map(r=>({owner:r.data.owner,far:r.data.overview,part:r.data.asamaPart,scene:r.data.asamaScene}));}")
  def visit(v,region=None):
   page.evaluate('v=>ATLAS.setView(v,false)',v)
   if region:page.wait_for_function('r=>ATLAS.stream.cache.has(r)',arg=region,polling=200)
   return draw()
  for region,view in [('seiki','seikiOverview'),('asama','asamaPyramid')]:
   x=page.evaluate("v=>{ATLAS.setView(v,false);ATLAS.renderOnce();return {native:ATLAS.stream.pending?.worker instanceof Worker,far:ATLAS.renderer.records.some(r=>r.wanted&&r.data.owner===ATLAS.state.focus&&r.data.overview)}}",view)
   assert x['native'] and x['far'];page.wait_for_function('r=>ATLAS.stream.cache.has(r)',arg=region,polling=200)
   rows=draw();assert any(not r['far'] for r in rows);assert not any(r['far'] and r['part']!='road' for r in rows)
   passed('Native Worker replaces '+region+' overview',x)
  page.evaluate("document.body.classList.add('ui-hidden');ATLAS.state.uiHidden=true")
  for v in page.evaluate('Object.keys(GA.ASAMA.views)'):
   region='seiki' if v.startswith('seiki') else 'asama';rows=visit(v,region);assert rows
   if region=='asama':assert not page.evaluate('ATLAS.renderer.sky.visible')
   assert not page.evaluate('ATLAS.renderer.engine.getContext().isContextLost()')
   page.locator('#scene').screenshot(path=str(a.output/(v+'.png')))
   report['views'][v]=page.evaluate("()=>({rig:{eye:ATLAS.rig.eye,target:ATLAS.rig.target,fov:ATLAS.rig.fov},stats:ATLAS.renderer.info().stats,stream:ATLAS.stream.info()})")
   passed('Fixed view '+v,{'records':len(rows)})
  for v,light in [('shrineFront','neutral'),('shrineNight','night')]:
   page.evaluate('x=>ATLAS.state.lighting=x',light);visit('shrineFront','hakurei')
   page.locator('#scene').screenshot(path=str(a.output/(v+'.png')))
   report['views'][v]=page.evaluate('ATLAS.renderer.info()')
  page.evaluate("ATLAS.state.lighting='neutral';document.body.classList.remove('ui-hidden');ATLAS.state.uiHidden=false")
  for id in page.evaluate('GA.ASAMA.locations'):
   page.locator('#btn-search').click();page.locator('#search').fill(id)
   # IDs are not always searchable aliases; use the actual catalogue name.
   name=page.evaluate('id=>ATLAS.data.locations.find(l=>l.id===id).name',id);page.locator('#search').fill(name)
   row=page.locator('#results [data-id="'+id+'"]');assert row.count()==1;row.click();draw()
   assert 'P' in page.locator('#detail-design').inner_text(),(id,page.locator('#detail-design').inner_text());assert page.locator('#detail-sources a').count()>=2,id
   page.locator('#close-detail').click();page.locator('#close-drawer').click()
  passed('All eight catalogue entries navigate with source links and P boundaries')
  visit('asamaMaze','asama')
  assert page.locator('#view-buttons [data-view="asamaMazeRed"]').count()==1
  for v in ['asamaMazeRed','asamaMazeGreen','asamaMazeYellow','asamaMaze']:
   page.locator('#view-buttons [data-view="'+v+'"]').click();page.evaluate('ATLAS.rig.update(5)');draw()
   assert page.evaluate('ATLAS.state.view')==v
  passed('Real dock switches all four mutually exclusive maze editions')
  visit('asamaSection','asama');rows=draw();assert not any(r['part'] in ['shell','roof','shrineRoof'] for r in rows)
  rows=visit('asamaShrine','asama');assert any(r['part']=='shrineRoof' for r in rows)
  passed('Cutaway reverses without removing ground or leaving roof hidden')
  before=page.evaluate('ATLAS.rig.eye.slice()');page.mouse.move(900,320);page.mouse.down();page.mouse.move(970,350,steps=6);page.mouse.up();page.evaluate('ATLAS.rig.update(0)');draw();assert before!=page.evaluate('ATLAS.rig.eye.slice()')
  passed('Real mouse orbit')
  visit('seikiPath','seiki');route=page.evaluate('GA.ASAMA.surfacePath.filter((p,i,a)=>i%Math.ceil(a.length/12)===0||i===a.length-1)')
  for q in route:
   assert page.evaluate("p=>{const y=ATLAS.world.terrain.height(...p);ATLAS.rig.setView({space:'surface',eye:[p[0]+5,y+14,p[1]+9],target:[p[0],y+1,p[1]]},false);ATLAS.renderOnce();return ATLAS.renderer.records.some(r=>r.wanted&&r.data.owner==='seiki'&&r.data.asamaPart==='road')}",q)
  passed('Connected road camera samples',{'samples':len(route),'physicsCollision':False})
  # Explicit state restoration, not a claim of validating every region/night preset.
  visit('shrineFront','hakurei');page.locator('#light-night').click();page.locator('[data-weather="rain"]').click();draw()
  visit('asamaShrine','asama');assert not page.evaluate('ATLAS.renderer.rain.visible');assert page.evaluate('ATLAS.renderer.asamaLamps.every(l=>l.visible)')
  visit('shrineFront','hakurei');assert page.evaluate("ATLAS.state.lighting==='night'&&ATLAS.state.weather==='rain'");assert not page.evaluate('ATLAS.renderer.asamaLamps.some(l=>l.visible)')
  page.locator('#light-neutral').click();page.locator('[data-weather="clear"]').click();draw()
  passed('Night/rain choices retained across underground; local lights leave cleanly')
  for v,r in [('forest','forest'),('hellHall','oldhell'),('denFront','highland'),('mineThreshold','rainbowmine'),('seikiOverview','seiki')]:
   visit(v,r);assert not page.evaluate('ATLAS.renderer.asamaLamps.some(l=>l.visible)');passed('Selected inherited region return '+v)
  # Production scheduling section: no renderOnce, gl.finish, or manual rig update.
  page.evaluate('globalThis.ATLAS_TEST_PAUSE=false;ATLAS.state.motion=true;ATLAS.wake()')
  for r in ['asama','seiki','asama','world']:
   n=page.evaluate('ATLAS.state.drawnFrames');page.locator('#region-select').select_option(r)
   # Static cache-hit views may correctly render once and become idle.
   page.wait_for_function('n=>ATLAS.state.drawnFrames>n',arg=n,polling=200)
   assert page.evaluate('ATLAS.state.view')=={'asama':'asamaPyramid','seiki':'seikiOverview','world':'diorama'}[r]
   passed('Production selector '+r,{'drawnFrames':page.evaluate('ATLAS.state.drawnFrames')-n})
  page.evaluate('globalThis.ATLAS_TEST_PAUSE=true;ATLAS.state.motion=false');page.wait_for_timeout(300)
  passed('Production frame scheduling and real region selector switching')
  visit('diorama');page.evaluate('ATLAS.stream.trim(true)')
  cancelled=page.evaluate("()=>{const n=ATLAS.stream.metrics.cancelled;ATLAS.setView('asamaPyramid',false);ATLAS.setView('diorama',false);ATLAS.stream.trim(true);return ATLAS.stream.metrics.cancelled-n}");assert cancelled>=1
  passed('Obsolete native Worker cancelled',cancelled)
  cycles=[]
  for _ in range(3):
   visit('asamaFossils','asama');visit('seikiPath','seiki');visit('diorama');page.evaluate('ATLAS.stream.trim(true);ATLAS.renderOnce();ATLAS.renderer.trim(true)')
   x=page.evaluate("()=>({cache:ATLAS.stream.cache.size,detail:ATLAS.renderer.records.filter(r=>['asama','seiki'].includes(r.data.owner)&&!r.data.overview).length,road:ATLAS.world.meshes.filter(m=>m.owner==='seiki'&&m.asamaPart==='road').length,...ATLAS.renderer.engine.info.memory})")
   assert x['cache']==0 and x['detail']==0 and x['road']>0;cycles.append(x)
  assert max(x['textures'] for x in cycles)-min(x['textures'] for x in cycles)<=2
  passed('Three eviction cycles preserve public road and bounded texture counts',cycles)
  visit('asamaShrine','asama');page.evaluate("Object.assign(ATLAS.state,{quality:'low',ao:false,bloom:false});ATLAS.renderer.setQuality('low');ATLAS.renderOnce()")
  page.locator('#scene').screenshot(path=str(a.output/'asama-low-no-post.png'))
  assert not page.evaluate('ATLAS.renderer.info().stats.contactOcclusion')
  page.set_viewport_size({'width':390,'height':844});draw();page.screenshot(path=str(a.output/'mobile.png'))
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+2')
  passed('Low quality without AO/Bloom and 390px layout')
  report['shaderDiagnostics']=page.evaluate('asamaShaderErrors');report['contextLost']=page.evaluate('ATLAS.renderer.engine.getContext().isContextLost()');report['programCount']=page.evaluate('ATLAS.renderer.engine.info.programs.length')
  assert not report['errors'],report['errors'];assert not report['contextLost']
  passed('No JavaScript/shader errors or context loss in this serial session')
  report['complete']=True;browser.close()
except Exception as e:
 report['complete']=False;report['failure']=repr(e);traceback.print_exc()
finally:
 save()
 if server:server.shutdown()
if not report.get('complete'):raise SystemExit(1)
