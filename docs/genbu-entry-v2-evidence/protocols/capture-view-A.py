"""Paired, declared two-view Genbu southern-mouth gate. No production edits.
Every artifact starts a separate browser session and follows the same preset,
LOD history, pose sequence and settings. Static captures are not lifecycle tests.
"""
import argparse, hashlib, json, subprocess, threading, time
from datetime import datetime, timezone
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser();p.add_argument('--mode',choices=['baseline','candidate'],required=True);p.add_argument('--output',type=Path,required=True);args=p.parse_args()
BASE=Path('/workspace/genbu-entry-evidence');SPEC=BASE/'view-A-spec.json';spec=json.loads(SPEC.read_text());config=spec[args.mode];REPO=Path(config['repository']);DIST=Path(config['dist']);OUT=args.output;OUT.mkdir(parents=True,exist_ok=True);assert not (OUT/'report.json').exists()
sha=lambda f:hashlib.sha256(f.read_bytes()).hexdigest();release=json.loads((DIST/'release.json').read_text());artifact=DIST/release['artifact'];expected=config['HTMLSHA'];assert sha(artifact)==release['sha256']==expected
inputs=lambda:{p:sha(REPO/p) for p in release['inputs']};before=inputs();assert before==release['inputs'];assert len(before)==config['inputCount'];started=time.monotonic()
r={'schema':1,'purpose':__doc__,'mode':args.mode,'startUTC':datetime.now(timezone.utc).isoformat(),'protocolSHA':sha(Path(__file__)),'specSHA':sha(SPEC),'spec':spec,'HTMLSHA':expected,'releaseSHA':sha(DIST/'release.json'),'inputsBefore':before,'headBefore':subprocess.check_output(['git','rev-parse','HEAD'],cwd=REPO,text=True).strip(),'cpuOverlap':'May overlap bounded offline independent source diagnosis. Timings are not compared as speed.','hardwareFPSMeasured':False,'errors':[],'httpFailures':[],'contextEvents':[],'views':[],'budgetFailures':[]}
def save(): (OUT/'report.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*_):pass
 def send_error(self,code,message=None,explain=None):r['httpFailures'].append({'path':self.path,'status':code});super().send_error(code,message,explain)
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(DIST)));threading.Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader','--disable-dev-shm-usage'])
  page=browser.new_page(viewport={'width':1280,'height':720},device_scale_factor=1);page.set_default_timeout(180000);page.add_init_script('globalThis.ATLAS_TEST_PAUSE=true')
  page.on('pageerror',lambda e:r['errors'].append(str(e)));page.on('console',lambda m:r['errors'].append(m.text) if m.type=='error' and 'Failed to load resource' not in m.text else None)
  try:
   page.goto(f'http://127.0.0.1:{server.server_port}/{release["artifact"]}',wait_until='load',timeout=180000);page.wait_for_function('globalThis.ATLAS||globalThis.ATLAS_BOOT_ERROR',timeout=180000);assert not page.evaluate('globalThis.ATLAS_BOOT_ERROR||null')
   page.evaluate("""()=>{Object.assign(ATLAS.state,{motion:false,clock:12.5,labels:false,characters:false,weather:'clear',lighting:'neutral',ao:true,bloom:false,reflections:false,uiHidden:true});document.body.classList.add('ui-hidden');globalThis.__viewAEvents=[];for(const e of ['webglcontextlost','webglcontextrestored'])document.querySelector('#scene').addEventListener(e,()=>__viewAEvents.push(e));ATLAS.setView('genbuOverview',false);ATLAS.state.detailNeighbors=[];ATLAS.stream.focus(['genbu']);ATLAS.renderOnce();}""")
   page.wait_for_function("!ATLAS.stream.pending&&ATLAS.stream.cache.has('genbu')",polling=250,timeout=180000)
   page.evaluate("""()=>{const q=document.querySelector('#quality');q.value='balanced';q.dispatchEvent(new Event('change',{bubbles:true}));ATLAS.rig.fov=49;for(let i=0;i<3;i++){ATLAS.renderOnce();ATLAS.renderer.engine.getContext().finish();}}""")
   r['browser']=browser.version;r['driver']=page.evaluate('ATLAS.renderer.info().driver');save()
   for view in spec['views']:
    page.evaluate("v=>{ATLAS.rig.setView({space:'surface',eye:v.eye,target:v.target},false);ATLAS.rig.fov=49;ATLAS.rig.updateMatrices();}",view)
    samples=[page.evaluate("""()=>{const A=ATLAS,R=A.renderer;A.renderOnce();R.engine.getContext().finish();return{stats:R.info().stats,memory:{...R.engine.info.memory},residentAttributeBytes:R.residentBytes,eye:A.rig.eye.slice(),target:A.rig.target.slice(),fov:A.rig.fov,quality:A.state.quality,rendererQuality:R.quality,lighting:A.state.lighting,clock:A.state.clock,weather:A.state.weather,ao:A.state.ao,stream:A.stream.info(),visibleNativePacks:[...new Set(R.records.filter(r=>r.wanted&&r.item?.mesh.visible&&r.pack!=='overview').map(r=>r.pack))]};}""") for _ in range(3)]
    final=samples[-1];assert final['eye']==view['eye'] and final['target']==view['target'] and final['fov']==49;assert final['quality']==final['rendererQuality']=='balanced';assert final['clock']==12.5 and final['lighting']=='neutral' and final['ao'];assert 'genbu' in final['visibleNativePacks'];assert all(samples[-2]['stats'][k]==final['stats'][k] for k in ['totalCalls','totalTriangles'])
    png=OUT/(view['name']+'.png');page.locator('#scene').screenshot(path=str(png),timeout=120000)
    row={'name':view['name'],'pose':view,'samples':samples,'pngSHA':sha(png),'lastTwoCostsStable':True}
    if args.mode=='candidate':
     old=json.loads((BASE/'baseline-view-A/report.json').read_text());assert old['specSHA']==r['specSHA'] and old['protocolSHA']==r['protocolSHA'];previous=next(v for v in old['views'] if v['name']==view['name'])['samples'][-1]
     row['baselineDelta']={k:final['stats'][k]-previous['stats'][k] for k in ['totalCalls','totalTriangles','geometries','textures']};row['baselineDelta']['residentAttributeBytes']=final['residentAttributeBytes']-previous['residentAttributeBytes']
     for k,limit in [('totalCalls',4),('totalTriangles',4000),('textures',0)]:
      if row['baselineDelta'][k]>limit:r['budgetFailures'].append({'view':view['name'],'metric':k,'delta':row['baselineDelta'][k],'limit':limit})
    r['views'].append(row);save();print(json.dumps({'view':view['name'],'PNG':str(png),'stats':final['stats'],'delta':row.get('baselineDelta')},ensure_ascii=False),flush=True)
   r['contextEvents']=page.evaluate('__viewAEvents.slice()');assert not r['errors'] and not r['contextEvents'];assert not page.evaluate('ATLAS.renderer.engine.getContext().isContextLost()');assert not r['budgetFailures'],r['budgetFailures'];r['passed']=True;r['exitCode']=0
  finally:browser.close()
except BaseException as e:r['passed']=False;r['exitCode']=1;r['failure']=repr(e);raise
finally:
 r['endUTC']=datetime.now(timezone.utc).isoformat();r['elapsedSeconds']=time.monotonic()-started;r['inputsAfter']=inputs();r['inputsUnchanged']=r['inputsAfter']==before;r['artifactUnchanged']=sha(artifact)==expected;r['protocolAfterSHA']=sha(Path(__file__));r['specAfterSHA']=sha(SPEC);r['headAfter']=subprocess.check_output(['git','rev-parse','HEAD'],cwd=REPO,text=True).strip();save();server.shutdown();assert r['inputsUnchanged'] and r['artifactUnchanged'] and r['protocolAfterSHA']==r['protocolSHA'] and r['specAfterSHA']==r['specSHA']
