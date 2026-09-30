"""Waterfall-back cave serial WebGL regression. Local HTTP by default.
--content is an explicit complete-document fallback, not an HTTP pass.
Captures every post-boot context event; no claim about real GPU FPS.
Fixed inspections wait for GPU completion; production UI segment never does.
"""
import argparse, hashlib, json, threading, traceback
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--content',action='store_true');p.add_argument('--headed',action='store_true');p.add_argument('--chromium')
p.add_argument('--output',type=Path,default=ROOT/'dist/waterfall-cave-browser-check')
a=p.parse_args();a.output.mkdir(parents=True,exist_ok=True)
i=json.loads((ROOT/'dist/release.json').read_text());html=(ROOT/'dist'/i['artifact']).read_bytes();assert hashlib.sha256(html).hexdigest()==i['sha256']
r={'sha256':i['sha256'],'loadMode':'about:blank content / native Blob Worker' if a.content else 'local HTTP','viewport':[1280,720],'dpr':1,'weather':'clear','quality':'balanced','clock':0,'ao':True,'bloom':False,'reflections':False,'hardwareFPSMeasured':False,'checks':[],'views':{},'errors':[],'externalErrors':[],'contextEvents':[]};server=None;page=None

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
  page.evaluate("()=>{globalThis.fallsEvents=[];for(const k of ['webglcontextlost','webglcontextrestored'])document.querySelector('#scene').addEventListener(k,()=>fallsEvents.push({event:k,view:ATLAS.state.view,time:performance.now()}));}")
  r['browser']=browser.version;r['webgl']=page.evaluate("()=>{const g=ATLAS.renderer.engine.getContext(),e=g.getExtension('WEBGL_debug_renderer_info');return {version:g.getParameter(g.VERSION),renderer:e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):g.getParameter(g.RENDERER)}}")
  page.evaluate("Object.assign(ATLAS.state,{motion:false,clock:0,labels:false,characters:false,quality:'balanced',weather:'clear',lighting:'neutral',ao:true,bloom:false,reflections:false})")
  assert page.evaluate('ATLAS.stream.cache.size')==0
  assert page.evaluate("ATLAS.world.meshes.some(m=>m.owner==='waterfall_cave'&&m.overview)&&!ATLAS.world.meshes.some(m=>m.owner==='waterfall_cave'&&!m.overview)")
  passed('Cold world only creates cave proxies and permanent public stairs')
  def draw():return page.evaluate("()=>{ATLAS.state.labels=false;ATLAS.state.characters=false;ATLAS.renderOnce();ATLAS.renderer.engine.getContext().finish();return ATLAS.renderer.records.filter(r=>r.wanted&&r.data.owner==='waterfall_cave').map(r=>({far:r.data.overview,part:r.data.fallsPart,space:r.data.space}));}")
  def visit(v):
   assert page.evaluate('v=>!!GA.PRESETS[v]',v),v
   page.evaluate('v=>ATLAS.setView(v,false)',v)
   assert page.evaluate('ATLAS.state.view')==v
   page.wait_for_function('[...ATLAS.stream.required].every(id=>ATLAS.stream.cache.has(id))',polling=200)
   return draw()
  cold=page.evaluate("()=>{ATLAS.setView('fallsEntry',false);ATLAS.renderOnce();return {native:ATLAS.stream.pending?.worker instanceof Worker,far:ATLAS.renderer.records.some(r=>r.wanted&&r.data.owner==='waterfall_cave'&&r.data.overview)}}")
  assert cold['native'] and cold['far'];page.wait_for_function("ATLAS.stream.cache.has('waterfall_cave')");rows=draw();assert any(not d['far'] for d in rows);assert not any(d['far'] for d in rows)
  passed('Native Worker replaces underground proxy',cold)
  page.evaluate("document.body.classList.add('ui-hidden');ATLAS.state.uiHidden=true")
  for v in page.evaluate('Object.keys(GA.FALLS_CAVE.views)'):
   rows=visit(v);assert rows;assert not page.evaluate('ATLAS.renderer.engine.getContext().isContextLost()')
   underground=page.evaluate("ATLAS.state.space==='falls_cave'")
   if underground:assert not page.evaluate('ATLAS.renderer.sky.visible');assert page.evaluate("ATLAS.renderer.records.filter(r=>r.wanted).every(r=>r.data.owner==='waterfall_cave')")
   else:assert page.evaluate("ATLAS.stream.cache.has('mountain')&&ATLAS.renderer.sky.visible")
   page.locator('#scene').screenshot(path=str(a.output/(v+'.png')))
   r['views'][v]=page.evaluate('({camera:{eye:ATLAS.rig.eye,target:ATLAS.rig.target,fov:ATLAS.rig.fov},stats:ATLAS.renderer.info().stats,stream:ATLAS.stream.info()})')
   passed('Fixed camera '+v,{'visibleRecords':len(rows)})
  rows=visit('fallsSection');assert not any(x['part'] in ['roof','outer','curtain'] for x in rows)
  rows=visit('fallsEntry');assert any(x['part']=='roof' for x in rows)
  passed('Cutaway restores the roof and retains supported floors')
  visit('fallsContext');assert page.evaluate("ATLAS.renderer.records.some(r=>r.wanted&&r.data.id==='waterfall:falling-sheet')")
  assert page.evaluate("GA.resolveLocation('waterfall').view==='mountainFalls'&&GA.resolveLocation('cucumber_farm').view==='cucumberOverview'")
  passed('Original waterfall remains visible; farm binding is distinct from this tunnel')
  route=page.evaluate('GA.FALLS_CAVE.publicApproach(ATLAS.data).meta.path.filter((p,i,a)=>i%Math.ceil(a.length/12)===0||i===a.length-1)')
  for q in route:
   assert page.evaluate("p=>{ATLAS.rig.setView({space:'surface',eye:[p[0]+7,p[1]+10,p[2]+8],target:[p[0],p[1]+1,p[2]]},false);ATLAS.renderOnce();ATLAS.renderer.engine.getContext().finish();return ATLAS.renderer.records.some(r=>r.wanted&&r.data.fallsPart==='approach')}",q)
  passed('Public stair route camera samples',{'samples':len(route),'collisionSystem':False})
  page.evaluate("document.body.classList.remove('ui-hidden');ATLAS.state.uiHidden=false")
  page.locator('#btn-search').click();page.locator('#search').fill('瀑后轨道洞穴');row=page.locator('#results [data-id="waterfall_cave"]');assert row.count()==1;row.click()
  assert 'P' in page.locator('#detail-design').inner_text();assert page.locator('#detail-sources a').count()>=3
  page.locator('#close-detail').click();page.locator('#close-drawer').click();passed('Alias lookup, source links, and authored-scope note')
  visit('fallsEntry');before=page.evaluate('ATLAS.rig.eye.slice()');page.mouse.move(940,330);page.mouse.down();page.mouse.move(1020,367,steps=8);page.mouse.up();page.evaluate('ATLAS.rig.update(0)');draw();assert before!=page.evaluate('ATLAS.rig.eye.slice()');passed('Real mouse orbit')
  visit('fallsEntry');page.locator('[data-camera-mode="fly"]').click();assert page.evaluate("ATLAS.rig.mode==='fly'");assert page.locator('[data-camera-mode="ground"]').is_disabled();page.locator('[data-camera-mode="orbit"]').click();passed('Underground free flight; ground-walk mode not misapplied')
  for v in ['mountainFalls','shrineFront','hitenFront','peonyOverview']:
   visit(v);assert not page.evaluate('ATLAS.renderer.fallsWasActive');passed('Inherited region return '+v)
  visit('fallsThreshold');page.locator('#light-night').click();page.locator('[data-weather="rain"]').click();draw();visit('fallsTrack')
  assert not page.evaluate('ATLAS.renderer.rain.visible');assert page.evaluate('ATLAS.renderer.focusLamps.filter(l=>l.visible).length')==4
  visit('shrineFront');assert page.evaluate("ATLAS.state.weather==='rain'&&ATLAS.state.lighting==='night'&&!ATLAS.renderer.fallsWasActive")
  page.locator('#light-neutral').click();page.locator('[data-weather="clear"]').click();draw();assert not page.evaluate('ATLAS.renderer.focusLamps.some(l=>l.visible)')
  passed('Existing four lights restored on exit; night/rain selections retained')
  # Normal scheduling, not a sequence advanced with renderOnce or gl.finish.
  page.evaluate('globalThis.ATLAS_TEST_PAUSE=false;ATLAS.state.motion=false;ATLAS.wake()')
  for region in ['world','waterfall_cave','mountain','waterfall_cave']:
   n=page.evaluate('ATLAS.state.drawnFrames');page.locator('#region-select').select_option(region);page.wait_for_function('n=>ATLAS.state.drawnFrames>n',arg=n)
   page.wait_for_function('!ATLAS.rig.transition&&[...ATLAS.stream.required].every(id=>ATLAS.stream.cache.has(id))')
  assert page.evaluate("ATLAS.stream.cache.has('mountain')&&ATLAS.stream.cache.has('waterfall_cave')")
  page.locator('#view-buttons [data-view="fallsTrack"]').click();page.wait_for_function("!ATLAS.rig.transition&&ATLAS.state.view==='fallsTrack'")
  page.wait_for_timeout(500);n=page.evaluate('ATLAS.state.drawnFrames');page.wait_for_timeout(1000);idle=page.evaluate('ATLAS.state.drawnFrames')-n;assert idle<=2
  passed('Production selector/dock and idle drawing',{'idleFrames':idle})
  page.evaluate('globalThis.ATLAS_TEST_PAUSE=true');visit('diorama');page.evaluate('ATLAS.stream.trim(true)')
  cancel=page.evaluate("()=>{const n=ATLAS.stream.metrics.cancelled;ATLAS.setView('fallsEntry',false);ATLAS.setView('diorama',false);ATLAS.stream.trim(true);return ATLAS.stream.metrics.cancelled-n}");assert cancel>=1;passed('Obsolete native Worker cancelled',cancel)
  cycles=[]
  for _ in range(3):
   visit('fallsTrack');visit('fallsThreshold');visit('diorama');page.evaluate('ATLAS.stream.trim(true);ATLAS.renderOnce();ATLAS.renderer.engine.getContext().finish();ATLAS.renderer.trim(true)')
   x=page.evaluate("()=>({cache:ATLAS.stream.cache.size,detail:ATLAS.renderer.records.filter(r=>r.data.owner==='waterfall_cave'&&!r.data.overview).length,public:ATLAS.world.meshes.filter(m=>m.owner==='waterfall_cave'&&m.globalSurface).length,...ATLAS.renderer.engine.info.memory})");assert x['cache']==0 and x['detail']==0 and x['public']==2;cycles.append(x)
  assert max(x['textures'] for x in cycles)-min(x['textures'] for x in cycles)<=2;passed('Three eviction cycles retain stairs and bounded texture counts',cycles)
  visit('fallsTrack');page.evaluate('globalThis.ATLAS_TEST_PAUSE=false;ATLAS.wake()');page.locator('#btn-settings').click();page.locator('#quality').select_option('low');page.locator('#opt-ao').uncheck();page.locator('#opt-bloom').uncheck();page.locator('#close-settings').click()
  page.wait_for_timeout(1000);assert page.evaluate('ATLAS.renderer.info().stats.triangles')>0;assert not page.evaluate('ATLAS.renderer.info().stats.contactOcclusion');page.locator('#scene').screenshot(path=str(a.output/'falls-low-no-post.png'));passed('Production low-quality switch without AO or bloom')
  page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(700);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+2');page.screenshot(path=str(a.output/'falls-mobile.png'));passed('390px layout and live resize')
  e=page.evaluate('ATLAS.exportState()');assert e['landmarks']['navigable']==107 and e['landmarks']['pending']==72;assert page.evaluate('JSON.parse(document.querySelector("#character-data").textContent).characters.length')==85;passed('107 navigable / 72 pending; 85 characters preserved')
  r['contextEvents']=page.evaluate('fallsEvents');r['contextLost']=page.evaluate('ATLAS.renderer.engine.getContext().isContextLost()');r['recovery']=page.evaluate('ATLAS.renderer.info().contextRecovery')
  assert not r['errors'],r['errors'];assert not r['contextEvents'],r['contextEvents'];assert not r['contextLost'];passed('No post-boot context loss/restoration or JS/shader errors')
  r['passed']=True;browser.close()
except Exception as e:
 r['passed']=False;r['failure']=repr(e);traceback.print_exc()
 try:r['contextEvents']=page.evaluate('globalThis.fallsEvents||[]') if page else []
 except Exception:pass
finally:
 save()
 if server:server.shutdown()
if not r.get('passed'):raise SystemExit(1)
