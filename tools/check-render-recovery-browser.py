"""Real WebGL tests for same-size MSAA changes and deliberate context restoration.
The forced-loss test verifies recovery, not prevention of unexpected driver resets.
"""
import argparse,hashlib,json,threading,traceback
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--content',action='store_true');p.add_argument('--headed',action='store_true');p.add_argument('--chromium');p.add_argument('--output',type=Path,default=ROOT/'dist/render-recovery-check');a=p.parse_args();a.output.mkdir(parents=True,exist_ok=True)
i=json.loads((ROOT/'dist/release.json').read_text());html=(ROOT/'dist'/i['artifact']).read_bytes();assert hashlib.sha256(html).hexdigest()==i['sha256']
r={'sha256':i['sha256'],'loadMode':'about:blank content / native Blob Worker' if a.content else 'HTTP','forcedLosses':3,'hardwareFPSMeasured':False,'checks':[],'errors':[]};server=None

def save(): (a.output/'report.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
def passed(name,data=None):r['checks'].append({'name':name,'data':data});save();print('PASS',name,data or '',flush=True)
try:
 if not a.content:
  server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(ROOT/'dist')));threading.Thread(target=server.serve_forever,daemon=True).start()
 with sync_playwright() as pw:
  args={'headless':not a.headed,'args':['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader','--disable-dev-shm-usage']}
  if a.chromium:args['executable_path']=a.chromium
  b=pw.chromium.launch(**args);page=b.new_page(viewport={'width':1280,'height':720},device_scale_factor=1);page.set_default_timeout(90000)
  page.on('pageerror',lambda e:r['errors'].append(str(e)));page.on('console',lambda m:r['errors'].append(m.text) if m.type=='error' and 'Failed to load resource' not in m.text else None)
  page.add_init_script('globalThis.ATLAS_TEST_PAUSE=true')
  if a.content:page.evaluate('globalThis.ATLAS_TEST_PAUSE=true');page.set_content(html.decode(),wait_until='load')
  else:page.goto(f'http://127.0.0.1:{server.server_port}/{i["artifact"]}',wait_until='load')
  page.wait_for_function('globalThis.ATLAS||globalThis.ATLAS_BOOT_ERROR');assert page.evaluate('globalThis.ATLAS_BOOT_ERROR||null') is None
  r['browser']=b.version
  page.evaluate("Object.assign(ATLAS.state,{motion:false,clock:0,labels:false,characters:false,bloom:false,reflections:false});document.body.classList.add('ui-hidden');ATLAS.state.uiHidden=true")
  def visit(v,id):
   page.evaluate('v=>ATLAS.setView(v,false)',v);page.wait_for_function('id=>ATLAS.stream.cache.has(id)',arg=id,polling=200);page.evaluate('ATLAS.state.labels=false;ATLAS.renderOnce()')
  visit('asamaShrine','asama')
  # Reallocate an already-used target without changing width, height or DPR.
  page.evaluate("globalThis.oldMSAA=ATLAS.renderer.engine.properties.get(ATLAS.renderer.sceneTarget).__webglMultisampledFramebuffer")
  assert page.evaluate('!!oldMSAA')
  d=page.evaluate("()=>{const R=ATLAS.renderer,w=R.sceneTarget.width,h=R.sceneTarget.height;ATLAS.state.quality='low';R.setQuality('low');ATLAS.renderOnce();return {samples:R.sceneTarget.samples,sameSize:w===R.sceneTarget.width&&h===R.sceneTarget.height,oldFramebufferAlive:R.engine.getContext().isFramebuffer(oldMSAA),newFramebuffer:!!R.engine.properties.get(R.sceneTarget).__webglMultisampledFramebuffer}}")
  assert d=={'samples':0,'sameSize':True,'oldFramebufferAlive':False,'newFramebuffer':False};passed('Same-size quality change releases obsolete MSAA framebuffer',d)
  for q in ['balanced','low','high','low','balanced']:
   page.evaluate("q=>{ATLAS.state.quality=q;ATLAS.renderer.setQuality(q);ATLAS.renderOnce()}",q)
   assert page.evaluate('ATLAS.renderer.sceneTarget.samples')==(0 if q=='low' else 2)
  passed('Five quality round trips with correct sample count')
  visit('shrineFront','hakurei');page.locator('#scene').screenshot(path=str(a.output/'shrine-before-loss.png'))
  page.evaluate("globalThis.recoveryLoss=ATLAS.renderer.engine.getContext().getExtension('WEBGL_lose_context')");assert page.evaluate('!!recoveryLoss')
  for cycle in range(3):
   if cycle==1:visit('backdoorSpring','backdoor');assert page.evaluate('ATLAS.renderer.backdoorWindowTargets.length')==4
   if cycle==2:
    visit('seikiConnection','seiki');page.evaluate('globalThis.ATLAS_TEST_PAUSE=false;ATLAS.state.motion=false;ATLAS.wake()');page.wait_for_timeout(300)
   count=page.evaluate('ATLAS.renderer.recovery.restored');drawn=page.evaluate('ATLAS.state.drawnFrames')
   page.evaluate('recoveryLoss.loseContext()');page.wait_for_function('ATLAS.renderer.contextLost');page.wait_for_timeout(200);page.evaluate('recoveryLoss.restoreContext()');page.wait_for_function('n=>ATLAS.renderer.recovery.restored===n+1',arg=count)
   if cycle<2:page.evaluate('ATLAS.renderOnce()')
   else:page.wait_for_function('n=>ATLAS.state.drawnFrames>n&&!ATLAS.renderer.recovery.pending',arg=drawn)
   d=page.evaluate('({recovery:ATLAS.renderer.info().contextRecovery,programs:ATLAS.renderer.engine.info.programs.length,view:ATLAS.state.view,clock:ATLAS.state.clock,windows:ATLAS.renderer.backdoorWindowTargets.length,windowBuildPasses:ATLAS.renderer.backdoorWindowBuildPasses})')
   assert d['recovery']['rebuilt']==cycle+1 and d['recovery']['lastError'] is None and d['programs']>0 and d['clock']==0
   if cycle==0:page.locator('#scene').screenshot(path=str(a.output/'shrine-after-loss.png'))
   if cycle==1:assert d['windows']==4 and d['windowBuildPasses']>=8
   page.locator('#scene').screenshot(path=str(a.output/f'restored-{cycle+1}.png'));passed('Forced restoration '+str(cycle+1),d)
  assert page.evaluate('ATLAS.renderer.recovery.lost')==3;assert not r['errors'],r['errors'];r['complete']=True;passed('Only three deliberate losses; native scene, caches and idle scheduling recovered');b.close()
except Exception as e:r['complete']=False;r['failure']=repr(e);traceback.print_exc()
finally:
 save()
 if server:server.shutdown()
if not r.get('complete'):raise SystemExit(1)
