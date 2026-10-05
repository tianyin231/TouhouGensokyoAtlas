"""Paired, predeclared Muenzuka views. No source edits or timing/FPS claims."""
import argparse
import hashlib
import json
import subprocess
import threading
import time
from datetime import datetime, timezone
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--variant', choices=['baseline','candidate'], required=True)
parser.add_argument('--group', choices=['A','B'], required=True)
args = parser.parse_args()
BASE = Path('/workspace/muenzuka-evidence')
SPEC = BASE/'view-spec-v2.json'
spec = json.loads(SPEC.read_text())
is_candidate = args.variant == 'candidate'
REPO = Path('/workspace/muenzuka-refinement' if is_candidate else '/workspace/sunflower-entry-refinement')
DIST = BASE/'v2-dist' if is_candidate else Path('/workspace/sunflower-entry-evidence/final-dist')
OUT = BASE/(('v2-' if is_candidate else 'baseline-')+args.group)
EXPECTED = 'ec19fa9107f1f947cc0d1ec6aa9a1ecf158162147fd0cf99130ad2fa62ca23a3' if is_candidate else spec['baselineArtifactSHA256']
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
release = json.loads((DIST/'release.json').read_text())
artifact = DIST/release['artifact']
assert release['sha256'] == sha(artifact) == EXPECTED
inputs = lambda: {p:sha(REPO/p) for p in release['inputs']}
before = inputs()
assert before == release['inputs'] and len(before) == (203 if is_candidate else 202)
if is_candidate: assert before['src/muenzuka-edge.js'] == spec['candidateSourceSHA256']
flower = Path('/workspace/flower-hill-refinement')
frozen = {p:sha(flower/p) for p in ['src/flower-hill-entry.js','project.json']}
assert frozen['src/flower-hill-entry.js'] == '87096ff308a83880c2332b79a554ec9edc098bd0f534db52a1fc965934c7114b'
OUT.mkdir(exist_ok=True)
assert not (OUT/'report.json').exists(), 'Do not overwrite earlier execution'
report = {'schema':1,'variant':args.variant,'group':args.group,'startedUTC':datetime.now(timezone.utc).isoformat(),
 'sourceHEADBefore':subprocess.check_output(['git','rev-parse','HEAD'],cwd=REPO,text=True).strip(),
 'artifactSHA256':EXPECTED,'releaseSHA256':sha(DIST/'release.json'),'protocolSHA256':sha(Path(__file__)),
 'specSHA256':sha(SPEC),'inputsBefore':before,'flowerBefore':frozen,'views':[],'errors':[],'httpFailures':[],
 'cpuLoadOverlap':'May overlap separate bounded CPU work. Wall times and submittedCPUms are not comparable performance evidence.',
 'hardwareFPSMeasured':False,'settings':{k:v for k,v in spec.items() if k not in ['groups','captureOrderRule']}}
began = time.monotonic()
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*_): pass
 def send_error(self,code,message=None,explain=None):
  report['httpFailures'].append({'path':self.path,'status':code})
  super().send_error(code,message,explain)
server = ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(DIST)))
threading.Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as pw:
  browser = pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader','--disable-dev-shm-usage'])
  page = browser.new_page(viewport={'width':1280,'height':720},device_scale_factor=1)
  page.set_default_timeout(180000)
  page.on('pageerror',lambda e:report['errors'].append(str(e)))
  page.on('console',lambda m:report['errors'].append(m.text) if m.type=='error' and 'Failed to load resource' not in m.text else None)
  page.add_init_script('globalThis.ATLAS_TEST_PAUSE=true')
  try:
   page.goto(f'http://127.0.0.1:{server.server_port}/{release["artifact"]}',wait_until='load',timeout=180000)
   page.wait_for_function('globalThis.ATLAS||globalThis.ATLAS_BOOT_ERROR',timeout=180000)
   assert not page.evaluate('globalThis.ATLAS_BOOT_ERROR||null')
   page.evaluate("""()=>{Object.assign(ATLAS.state,{motion:false,clock:12.5,labels:false,characters:false,weather:'clear',
    lighting:'neutral',ao:true,bloom:false,reflections:false,uiHidden:true});document.body.classList.add('ui-hidden');
    globalThis.__viewEvents=[];for(const e of ['webglcontextlost','webglcontextrestored'])document.querySelector('#scene').addEventListener(e,()=>__viewEvents.push(e));}""")
   report['browser'] = browser.version
   report['driver'] = page.evaluate('ATLAS.renderer.info().driver')
   for view in spec['groups'][args.group]:
    if view['native']:
     page.evaluate("""()=>{ATLAS.setView('muenzukaOverview',false);ATLAS.state.detailNeighbors=[];ATLAS.stream.focus(['muenzuka']);}""")
     page.wait_for_function("!ATLAS.stream.pending&&ATLAS.stream.cache.has('muenzuka')",polling=250,timeout=180000)
    else:
     assert not page.evaluate('ATLAS.stream.cache.size||ATLAS.stream.pending'), 'Cold must precede any native region'
     page.evaluate("()=>{ATLAS.setView('diorama',false);ATLAS.state.detailNeighbors=[];ATLAS.stream.focus([]);}")
    page.evaluate("""v=>{const A=ATLAS,q=document.querySelector('#quality');q.value=v.quality;q.dispatchEvent(new Event('change',{bubbles:true}));
      Object.assign(A.state,{motion:false,clock:12.5,labels:false,characters:false,weather:'clear',lighting:v.lighting,
       ao:true,bloom:false,reflections:false,uiHidden:true});A.rig.setView({space:'surface',eye:v.eye,target:v.target},false);
      A.rig.fov=49;A.rig.updateMatrices();}""",view)
    samples=[]
    for _ in range(5):
     sample=page.evaluate("""()=>{const A=ATLAS,R=A.renderer;A.renderOnce();R.engine.getContext().finish();return{
       stats:R.info().stats,memory:{...R.engine.info.memory},residentAttributeBytes:R.residentBytes,
       pose:{eye:A.rig.eye.slice(),target:A.rig.target.slice(),fov:A.rig.fov},quality:A.state.quality,rendererQuality:R.quality,
       displayMode:A.state.displayMode,focus:A.state.focus,clock:A.state.clock,lighting:A.state.lighting,ao:A.state.ao,
       stream:A.stream.info(),visibleNativePacks:[...new Set(R.records.filter(r=>r.wanted&&r.item?.mesh.visible&&r.pack!=='overview').map(r=>r.pack))],
       targetLevels:R.records.filter(r=>r.pack==='muenzuka'&&/^muenzuka:trees:-23:[678]:[01]:leaf$/.test(r.data.id)).map(r=>({id:r.data.id,level:r.level,wanted:r.wanted,visible:r.item?.mesh.visible||false,instances:r.data.instances.length/16})),
       coldTargets:R.records.filter(r=>r.data.id.startsWith('overview016:muenzuka|forestLeaf|')).map(r=>({id:r.data.id,level:r.level,wanted:r.wanted,visible:r.item?.mesh.visible||false,instances:r.data.instances.length/16}))};}""")
     samples.append(sample)
     if len(samples)>=3 and len({(s['stats']['totalCalls'],s['stats']['totalTriangles'],s['residentAttributeBytes']) for s in samples[-3:]})==1:break
    assert len(samples)>=3 and len({(s['stats']['totalCalls'],s['stats']['totalTriangles'],s['residentAttributeBytes']) for s in samples[-3:]})==1,'Three final stable frames required'
    final=samples[-1]
    assert final['pose']=={'eye':view['eye'],'target':view['target'],'fov':49}
    assert final['quality']==final['rendererQuality']==view['quality']
    assert final['clock']==12.5 and final['lighting']==view['lighting']
    if view['native']:
     assert 'muenzuka' in final['visibleNativePacks'] and final['focus']=='muenzuka' and final['displayMode']=='focus'
     if view['id'] in ['near','back','night']:assert any(r['level']==0 and r['wanted'] and r['visible'] for r in final['targetLevels']), 'Close view must use an actual near sample'
     if view['id']=='low':assert all(r['level']==1 for r in final['targetLevels'] if r['wanted']), 'Low must use far'
    else:
     assert not final['visibleNativePacks'] and not final['stream']['cached'] and not final['stream']['building']
     assert final['displayMode']=='atlas' and final['focus'] is None
     assert any(r['wanted'] and r['visible'] for r in final['coldTargets'])
    png=OUT/(view['id']+'.png');page.locator('#scene').screenshot(path=str(png),timeout=120000)
    report['views'].append({'spec':view,'samples':samples,'final':final,'pngSHA256':sha(png),'threeFinalFramesStable':True})
    print(json.dumps({'view':view['id'],'png':str(png),'stats':final['stats'],'memory':final['memory'],'attributeBytes':final['residentAttributeBytes']},ensure_ascii=False),flush=True)
   report['contextEvents']=page.evaluate('__viewEvents.slice()')
   assert not report['errors'] and not report['contextEvents']
   assert not page.evaluate('ATLAS.renderer.engine.getContext().isContextLost()')
   if is_candidate:
    prior=json.loads((BASE/('baseline-'+args.group)/'report.json').read_text())
    assert prior['passed'] and prior['protocolSHA256']==report['protocolSHA256'] and prior['specSHA256']==report['specSHA256']
    comparisons=[]
    for a,b in zip(prior['views'],report['views'],strict=True):
     assert a['spec']==b['spec'];x,y=a['final'],b['final']
     delta={'calls':y['stats']['totalCalls']-x['stats']['totalCalls'],'triangles':y['stats']['totalTriangles']-x['stats']['totalTriangles'],
       'attributeBytes':y['residentAttributeBytes']-x['residentAttributeBytes'],'geometries':y['memory']['geometries']-x['memory']['geometries'],
       'textures':y['memory']['textures']-x['memory']['textures']}
     comparisons.append({'view':a['spec']['id'],'delta':delta,'budgetPassed':delta['calls']<=4 and delta['triangles']<=4000 and delta['textures']==0})
    report['comparisons']=comparisons
    assert all(c['budgetPassed'] for c in comparisons),'Original same-view budget exceeded'
   report['passed'],report['exitCode']=True,0
  finally:browser.close()
except BaseException as e:
 report.update({'passed':False,'exitCode':1,'failure':repr(e)})
 raise
finally:
 report['elapsedSeconds']=time.monotonic()-began;report['endedUTC']=datetime.now(timezone.utc).isoformat()
 report['inputsAfter']=inputs();report['inputsUnchanged']=report['inputsAfter']==before
 report['artifactUnchanged']=sha(artifact)==EXPECTED
 report['protocolAfterSHA256']=sha(Path(__file__));report['specAfterSHA256']=sha(SPEC)
 report['flowerAfter']={p:sha(flower/p) for p in frozen};report['flowerUnchanged']=report['flowerAfter']==frozen
 (OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 server.shutdown()
 assert report['inputsUnchanged'] and report['artifactUnchanged'] and report['flowerUnchanged']
 assert report['protocolAfterSHA256']==report['protocolSHA256'] and report['specAfterSHA256']==report['specSHA256']
