import argparse, hashlib, json, threading, time
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright

p=argparse.ArgumentParser()
p.add_argument('--dist',type=Path,required=True)
p.add_argument('--output',type=Path,required=True)
p.add_argument('--views',default='myouren,front')
a=p.parse_args();a.output.mkdir(parents=True,exist_ok=True)
release=json.loads((a.dist/'release.json').read_text())
assert hashlib.sha256((a.dist/release['artifact']).read_bytes()).hexdigest()==release['sha256']
report={'artifactSHA':release['sha256'],'viewport':[1280,720],'dpr':1,'clock':12.5,'hardwareFPSMeasured':False,'frames':[],'errors':[],'externalErrors':[],'contextEvents':[],'httpFailures':[]}
report['protocolSHA256']=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
report['buildInputCount']=len(release['inputs'])
began=time.monotonic()
def save(): (a.output/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
    def send_error(self,code,message=None,explain=None):
        report['httpFailures'].append({'path':self.path,'status':code,'source':'local HTTP server'})
        super().send_error(code,message,explain)
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(a.dist)))
threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':1280,'height':720},device_scale_factor=1)
    page.set_default_timeout(120000)
    page.on('pageerror',lambda e:report['errors'].append(str(e)))
    page.on('response',lambda r:report['httpFailures'].append({'url':r.url,'status':r.status}) if r.status>=400 else None)
    page.on('console',lambda m:report['externalErrors' if 'Failed to load resource' in m.text else 'errors'].append(m.text) if m.type=='error' else None)
    page.add_init_script("globalThis.ATLAS_TEST_PAUSE=true")
    try:
        page.goto(f'http://127.0.0.1:{server.server_port}/{release["artifact"]}',wait_until='load',timeout=180000)
        page.wait_for_function('globalThis.ATLAS||globalThis.ATLAS_BOOT_ERROR',timeout=180000)
        assert not page.evaluate('globalThis.ATLAS_BOOT_ERROR||null')
        page.evaluate("""()=>{const A=ATLAS;Object.assign(A.state,{motion:false,clock:12.5,labels:false,characters:false,quality:'balanced',weather:'clear',lighting:'neutral',ao:true,bloom:false,reflections:false,uiHidden:true});document.body.classList.add('ui-hidden');globalThis.__events=[];for(const e of ['webglcontextlost','webglcontextrestored'])document.querySelector('#scene').addEventListener(e,()=>__events.push(e));}""")
        report['browser']=browser.version
        report['driver']=page.evaluate('ATLAS.renderer.info().driver')
        for view in a.views.split(','):
            preset={'front':'templeAscent','low':'myouren','night':'myouren','noao':'myouren','rear':'cemetery','foot':'templeAscent','overview':'diorama','section':'templeSection'}.get(view,view)
            page.evaluate("v=>{ATLAS.setView(v,false);ATLAS.renderOnce()}",preset)
            page.wait_for_function('!ATLAS.stream.pending&&[...ATLAS.stream.required].every(id=>ATLAS.stream.cache.has(id))',polling=250,timeout=180000)
            page.evaluate("v=>{Object.assign(ATLAS.state,{quality:v==='low'?'low':'balanced',lighting:v==='night'?'night':'neutral',ao:v!=='noao'});if(v==='front')ATLAS.rig.setView({space:'surface',eye:[352,151,295],target:[301,103,390]},false);if(v==='foot')ATLAS.rig.setView({space:'surface',eye:[304,92,348],target:[302,107,386]},false)}",view)
            page.evaluate("()=>{if(ATLAS.renderer.quality!==ATLAS.state.quality){const q=document.querySelector('#quality');q.value=ATLAS.state.quality;q.dispatchEvent(new Event('change',{bubbles:true}));}}")
            samples=[]
            for i in range(3):
                samples.append(page.evaluate("""()=>{const A=ATLAS,R=A.renderer;A.renderOnce();R.engine.getContext().finish();return {stats:R.info().stats,memory:{...R.engine.info.memory},residentAttributeBytes:R.residentBytes,programs:R.engine.info.programs.length,lost:R.engine.getContext().isContextLost(),eye:A.rig.eye.slice(),target:A.rig.target.slice(),fov:A.rig.fov,quality:A.state.quality,rendererQuality:R.quality,attributeBudget:R.attributeBudget,lighting:A.state.lighting,ao:A.state.ao,view:A.state.view,stream:A.stream.info()};}"""))
            assert not samples[-1]['lost']
            assert page.evaluate('ATLAS.renderer.quality===ATLAS.state.quality'), 'Quality control did not take effect'
            assert samples[-1]['attributeBudget']==({'low':80,'balanced':160,'high':256}[samples[-1]['quality']])*1048576, 'Actual native quality budget mismatch'
            page.locator('#scene').screenshot(path=str(a.output/(view+'.png')),timeout=120000)
            report['frames'].append({'name':view,'samples':samples,'pngSHA256':hashlib.sha256((a.output/(view+'.png')).read_bytes()).hexdigest()})
            report['contextEvents']=page.evaluate('__events.slice()');save()
            assert not report['errors'], 'JavaScript or shader error'
            assert not report['contextEvents'], 'Unexpected WebGL context event'
            print(json.dumps({'view':view,'stats':samples[-1]['stats'],'memory':samples[-1]['memory'],'residentAttributeBytes':samples[-1]['residentAttributeBytes']},ensure_ascii=False),flush=True)
    except BaseException as e:
        report['failure']=repr(e);save();raise
    finally:
        report['elapsedSeconds']=time.monotonic()-began;save();browser.close();server.shutdown()
