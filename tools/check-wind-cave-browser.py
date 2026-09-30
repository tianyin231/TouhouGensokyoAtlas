"""Wind Cave: real WebGL/Worker regression, HTTP by default.
--content explicitly tests a complete memory document when HTTP is restricted.
Fixed screenshots manually draw; the real-UI/idle/quality/resize section does not.
Every recorded context loss is a failure even if it subsequently recovers.
"""
import argparse, hashlib, json, threading, traceback
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--content',action='store_true');p.add_argument('--headed',action='store_true');p.add_argument('--chromium')
p.add_argument('--output',type=Path,default=ROOT/'dist/wind-cave-browser-check')
a=p.parse_args();a.output.mkdir(parents=True,exist_ok=True)
i=json.loads((ROOT/'dist/release.json').read_text());html=(ROOT/'dist'/i['artifact']).read_bytes();assert hashlib.sha256(html).hexdigest()==i['sha256']
r={'sha256':i['sha256'],'loadMode':'complete memory document / native Blob Worker' if a.content else 'local HTTP','viewport':[1280,720],'dpr':1,'weather':'clear','quality':'balanced','clock':0,'ao':True,'bloom':False,'reflections':False,'hardwareFPSMeasured':False,'checks':[],'views':{},'errors':[],'externalErrors':[],'contextEvents':[]}
server=None;page=None

def save(): (a.output/'report.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
def passed(name,data=None): r['checks'].append({'name':name,'data':data});save();print('PASS',name,flush=True)
try:
 if not a.content:
  server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(ROOT/'dist')));threading.Thread(target=server.serve_forever,daemon=True).start()
 with sync_playwright() as pw:
  launch={'headless':not a.headed,'args':['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader','--disable-dev-shm-usage']}
  if a.chromium: launch['executable_path']=a.chromium
  browser=pw.chromium.launch(**launch);page=browser.new_page(viewport={'width':1280,'height':720},device_scale_factor=1);page.set_default_timeout(90000)
  page.on('pageerror',lambda e:r['errors'].append(str(e)))
  page.on('console',lambda m:(r['externalErrors'] if 'Failed to load resource' in m.text else r['errors']).append(m.text) if m.type=='error' else None)
  page.add_init_script('globalThis.ATLAS_TEST_PAUSE=true;')
  if a.content:
   page.evaluate('globalThis.ATLAS_TEST_PAUSE=true');page.set_content(html.decode(),wait_until='load')
  else: page.goto(f'http://127.0.0.1:{server.server_port}/{i["artifact"]}',wait_until='load')
  page.wait_for_function('globalThis.ATLAS||globalThis.ATLAS_BOOT_ERROR');assert page.evaluate('globalThis.ATLAS_BOOT_ERROR||null') is None
  page.evaluate("()=>{globalThis.windEvents=[];for(const e of ['webglcontextlost','webglcontextrestored'])document.querySelector('#scene').addEventListener(e,()=>windEvents.push({event:e,view:ATLAS.state.view,quality:ATLAS.state.quality,time:performance.now()}));}")
  r['browser']=browser.version;r['webgl']=page.evaluate("()=>{const g=ATLAS.renderer.engine.getContext(),e=g.getExtension('WEBGL_debug_renderer_info');return e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):g.getParameter(g.RENDERER)}")
  page.evaluate("Object.assign(ATLAS.state,{motion:false,clock:0,labels:false,characters:false,quality:'balanced',weather:'clear',lighting:'neutral',ao:true,bloom:false,reflections:false})")
  assert page.evaluate('ATLAS.stream.cache.size')==0
  assert page.evaluate("ATLAS.world.meshes.some(m=>m.owner==='wind_cave'&&m.overview)&&!ATLAS.world.meshes.some(m=>m.owner==='wind_cave'&&!m.overview)")
  passed('Cold start has lightweight surface/cave proxies and permanent approach only')
  def draw():
   return page.evaluate("()=>{ATLAS.state.labels=false;ATLAS.state.characters=false;ATLAS.renderOnce();return ATLAS.renderer.records.filter(r=>r.wanted&&r.data.owner==='wind_cave').map(r=>({far:r.data.overview,part:r.data.windPart,space:r.data.space}));}")
  def visit(v):
   assert page.evaluate('v=>!!GA.PRESETS[v]',v),v
   page.evaluate('v=>ATLAS.setView(v,false)',v);assert page.evaluate('ATLAS.state.view')==v
   page.wait_for_function('[...ATLAS.stream.required].every(id=>ATLAS.stream.cache.has(id))',polling=200)
   return draw()
  cold=page.evaluate("()=>{ATLAS.setView('windEntry',false);ATLAS.renderOnce();return {native:ATLAS.stream.pending?.worker instanceof Worker,far:ATLAS.renderer.records.some(r=>r.wanted&&r.data.owner==='wind_cave'&&r.data.overview)}}")
  assert cold['native'] and cold['far'];page.wait_for_function("ATLAS.stream.cache.has('wind_cave')");rows=draw();assert rows and all(not q['far'] for q in rows)
  passed('Native Worker replaces underground proxy without a duplicate model',cold)
  page.evaluate("document.body.classList.add('ui-hidden');ATLAS.state.uiHidden=true")
  for v in page.evaluate('Object.keys(GA.WIND_CAVE.views)'):
   rows=visit(v);assert rows;assert not page.evaluate('ATLAS.renderer.engine.getContext().isContextLost()')
   if page.evaluate("ATLAS.state.space==='wind_grotto'"):
    assert not page.evaluate('ATLAS.renderer.sky.visible');assert page.evaluate("ATLAS.renderer.records.filter(r=>r.wanted).every(r=>r.data.owner==='wind_cave')")
   else: assert page.evaluate("ATLAS.stream.cache.has('mountain')&&ATLAS.renderer.sky.visible")
   page.locator('#scene').screenshot(path=str(a.output/(v+'.png')))
   r['views'][v]=page.evaluate('({camera:{eye:ATLAS.rig.eye,target:ATLAS.rig.target,fov:ATLAS.rig.fov},stats:ATLAS.renderer.info().stats,stream:ATLAS.stream.info()})')
   passed('Fixed camera '+v,{'visibleRecords':len(rows)})
  rows=visit('windSection');assert not any(q['part'] in ['roof','outer','extent'] for q in rows)
  rows=visit('windEntry');assert any(q['part']=='roof' for q in rows)
  passed('Cave cutaway restores roof; floor and formations remain')
  visit('windDescent');page.evaluate('ATLAS.state.clock=17.25');draw();draw();before=page.locator('#scene').screenshot();draw();assert before==page.locator('#scene').screenshot()
  page.evaluate('ATLAS.state.clock=21.75');draw();assert before!=page.locator('#scene').screenshot();page.evaluate('ATLAS.state.clock=0');draw()
  passed('Wind motes use the pausable shared clock and retain a nonzero phase')
  visit('windFoothill');route=page.evaluate('GA.WIND_CAVE.route.filter((p,i,a)=>i%Math.ceil(a.length/12)===0||i===a.length-1)')
  for q in route:
   assert page.evaluate("p=>{const y=GA.SurfaceContact.sampler(ATLAS.data,'wind_cave').height(...p);ATLAS.rig.setView({space:'surface',eye:[p[0]+6,y+12,p[1]+8],target:[p[0],y+1,p[1]]},false);ATLAS.renderOnce();return ATLAS.renderer.records.some(r=>r.wanted&&r.data.owner==='wind_cave'&&r.data.windPart==='path')}",q)
  passed('Approach camera samples show the path on the inherited mountain ground',{'samples':len(route),'collisionSystem':False})
  page.evaluate("document.body.classList.remove('ui-hidden');ATLAS.state.uiHidden=false")
  page.locator('#btn-search').click();page.locator('#search').fill('Fantastic Blowhole');entry=page.locator('#results [data-id="wind_cave"]');assert entry.count()==1;entry.click()
  assert 'P' in page.locator('#detail-design').inner_text();assert page.locator('#detail-sources a').count()>=3
  relation=page.locator('#detail-relations button').filter(has_text='深道');assert relation.count()==1;relation.click();assert page.evaluate("ATLAS.state.view==='hellBridge'")
  page.locator('#close-detail').click();page.locator('#close-drawer').click();passed('Source-backed catalogue entry links to existing deep road, not Moriya')
  visit('windEntry');before=page.evaluate('ATLAS.rig.eye.slice()');page.mouse.move(860,290);page.mouse.down();page.mouse.move(932,337,steps=7);page.mouse.up();page.evaluate('ATLAS.rig.update(0)');draw();assert before!=page.evaluate('ATLAS.rig.eye.slice()');passed('Real mouse orbit')
  page.locator('[data-camera-mode="fly"]').click();assert page.evaluate("ATLAS.rig.mode==='fly'");assert page.locator('[data-camera-mode="ground"]').is_disabled();page.locator('[data-camera-mode="orbit"]').click();passed('Underground free flight does not invoke surface-ground walking')
  for v in ['hellBridge','mountainFalls','cucumberOverview','shrineFront']:
   visit(v);assert not page.evaluate('ATLAS.renderer.engine.getContext().isContextLost()');passed('Inherited region return '+v)
  visit('windFoothill');page.locator('#light-night').click();page.locator('[data-weather="rain"]').click();draw();visit('windEntry');assert not page.evaluate('ATLAS.renderer.rain.visible');assert not page.evaluate('ATLAS.renderer.focusLamps.some(l=>l.visible)')
  visit('shrineFront');assert page.evaluate("ATLAS.state.lighting==='night'&&ATLAS.state.weather==='rain'");page.locator('#light-neutral').click();page.locator('[data-weather="clear"]').click();draw();passed('Rain/night choices restore after the cave; no extra local lights')
  # Production path: no manual camera updates, renderOnce or GPU synchronization.
  page.evaluate('globalThis.ATLAS_TEST_PAUSE=false;ATLAS.state.motion=false;ATLAS.wake()')
  for region in ['world','wind_cave','oldhell','wind_cave']:
   n=page.evaluate('ATLAS.state.drawnFrames');page.locator('#region-select').select_option(region);page.wait_for_function('n=>ATLAS.state.drawnFrames>n',arg=n);page.wait_for_function('!ATLAS.rig.transition&&[...ATLAS.stream.required].every(id=>ATLAS.stream.cache.has(id))')
  page.locator('#view-buttons [data-view="windDescent"]').click();page.wait_for_function("!ATLAS.rig.transition&&ATLAS.state.view==='windDescent'")
  page.wait_for_timeout(600);n=page.evaluate('ATLAS.state.drawnFrames');page.wait_for_timeout(1000);idle=page.evaluate('ATLAS.state.drawnFrames')-n;assert idle<=2;passed('Production region/view controls and idle drawing',{'idleFrames':idle})
  page.evaluate('globalThis.ATLAS_TEST_PAUSE=true');visit('diorama');page.evaluate('ATLAS.stream.trim(true)')
  cancelled=page.evaluate("()=>{const n=ATLAS.stream.metrics.cancelled;ATLAS.setView('windEntry',false);ATLAS.setView('diorama',false);ATLAS.stream.trim(true);return ATLAS.stream.metrics.cancelled-n}");assert cancelled>=1;passed('Obsolete native Worker cancellation',cancelled)
  cycles=[]
  for _ in range(3):
   visit('windEntry');visit('windMouth');visit('diorama');page.evaluate('ATLAS.stream.trim(true);ATLAS.renderOnce();ATLAS.renderer.trim(true)')
   d=page.evaluate("()=>({cache:ATLAS.stream.cache.size,detail:ATLAS.renderer.records.filter(r=>r.data.owner==='wind_cave'&&!r.data.overview).length,public:ATLAS.world.meshes.filter(m=>m.owner==='wind_cave'&&m.globalSurface).length,...ATLAS.renderer.engine.info.memory})");assert d['cache']==0 and d['detail']==0 and d['public']>0;cycles.append(d)
  assert max(d['textures'] for d in cycles)-min(d['textures'] for d in cycles)<=2;assert len({d['public'] for d in cycles})==1;passed('Three detail-eviction cycles retain public paths and bounded texture counts',cycles)
  visit('windEntry');page.evaluate('globalThis.ATLAS_TEST_PAUSE=false;ATLAS.wake()');page.locator('#btn-settings').click();page.locator('#quality').select_option('low');page.locator('#opt-ao').uncheck();page.locator('#opt-bloom').uncheck();page.locator('#close-settings').click();page.wait_for_timeout(1000)
  assert page.evaluate('ATLAS.renderer.info().stats.triangles')>0;assert not page.evaluate('ATLAS.renderer.info().stats.contactOcclusion');assert not page.evaluate("ATLAS.renderer.records.some(r=>r.wanted&&r.data.windPart==='dust')")
  page.locator('#scene').screenshot(path=str(a.output/'wind-low-no-post.png'));passed('Normal low-quality/no-post controls retain cave geometry and hide motes')
  page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(700);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+2');page.screenshot(path=str(a.output/'wind-mobile.png'));passed('390px live layout')
  e=page.evaluate('ATLAS.exportState()');assert e['landmarks']['navigable']==107 and e['landmarks']['pending']==72;assert page.evaluate('JSON.parse(document.querySelector("#character-data").textContent).characters.length')==85;passed('107 navigable / 72 pending; all 85 character records retained')
  r['contextEvents']=page.evaluate('windEvents');r['contextLost']=page.evaluate('ATLAS.renderer.engine.getContext().isContextLost()');r['recovery']=page.evaluate('ATLAS.renderer.info().contextRecovery')
  assert not r['contextEvents'],r['contextEvents'];assert not r['errors'],r['errors'];assert not r['contextLost'];assert r['recovery']['lost']==0
  passed('No observed JS/shader errors or context loss/restoration in this session');r['passed']=True;browser.close()
except Exception as e:
 r['passed']=False;r['failure']=repr(e);traceback.print_exc()
 try:r['contextEvents']=page.evaluate('globalThis.windEvents||[]') if page else []
 except Exception:pass
finally:
 save()
 if server:server.shutdown()
if not r.get('passed'):raise SystemExit(1)
