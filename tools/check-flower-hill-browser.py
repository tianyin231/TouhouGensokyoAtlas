"""One bounded Flower Hill native interaction/unload/reentry cycle.

Preparation only until explicitly executed. Production RAF, real pointer/wheel
and cache-clear UI; no manual rendering or GPU finish. Comparison anchors both
age past the existing public retention interval before taking strict snapshots.
"""
import argparse
import hashlib
import importlib.util
import json
import subprocess
import sys
import threading
import time
from datetime import datetime, timezone
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright

SOURCE_JS = r"""async () => {
 const R=ATLAS.renderer,cache=new WeakMap(),hex=b=>Array.from(new Uint8Array(b),v=>v.toString(16).padStart(2,'0')).join('');
 const hash=async a=>{if(!cache.has(a))cache.set(a,crypto.subtle.digest('SHA-256',new Uint8Array(a.buffer,a.byteOffset,a.byteLength)).then(hex));return await cache.get(a)};
 const records=[];
 for(const r of R.records){
   const p=r.data;
   const tile=p.component==='island-terrain'&&p.tile&&p.tile[0]<-928&&p.tile[0]+p.tile[2]>-1280&&p.tile[1]<1376&&p.tile[1]+p.tile[2]>960;
   const localPlants=p.globalSurface&&p.component==='transition-vegetation'&&p.instances&&Array.from({length:p.instances.length/16},(_,i)=>i*16).some(i=>p.instances[i+12]>=-1280&&p.instances[i+12]<=-928&&p.instances[i+14]>=960&&p.instances[i+14]<=1376);
   const cold=['sunflower','nameless'].includes(p.owner)&&p.overview;
   if(!['sunflower','nameless'].includes(r.pack)&&!(r.pack==='overview'&&(tile||localPlants||cold)))continue;
   const row={id:p.id,pack:r.pack,metadata:{},arrays:{}};
   for(const k of Object.keys(p).sort()){
     if(ArrayBuffer.isView(p[k])){const a=p[k];row.arrays[k]={type:a.constructor.name,length:a.length,bytes:a.byteLength,sha256:await hash(a)};}
     else if(p[k]!==undefined&&typeof p[k]!=='function')row.metadata[k]=JSON.parse(JSON.stringify(p[k]));
   }
   records.push(row);
 }
 const contacts=[];
 for(const [owner,key] of [['sunflowerEntry','contact'],['flowerHillEntry','contact'],['flowerHillEntry','originalContact']]){
   const a=ATLAS.data[owner]?.[key];if(a)contacts.push({id:owner+':'+key,kind:'persistent public CPU; not native GPU ownership',bytes:a.byteLength,sha256:await hash(a)});
 }
 return {records:records.sort((a,b)=>a.id.localeCompare(b.id)),contacts};
}"""


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', type=Path, required=True)
    parser.add_argument('--dist', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    repo, dist, out = args.repo.resolve(), args.dist.resolve(), args.output.resolve()
    out.mkdir(parents=True, exist_ok=True)
    assert not (out / 'report.json').exists(), 'Never overwrite an earlier run'
    release = json.loads((dist / 'release.json').read_text())
    artifact = dist / release['artifact']
    assert sha(artifact) == release['sha256']
    source_hashes = lambda: {p: sha(repo / p) for p in release['inputs']}
    inputs_before = source_hashes()
    assert inputs_before == release['inputs']
    helper = repo / 'tools/check-sunflower-browser.py'
    module_spec = importlib.util.spec_from_file_location('flower_hill_native_common', helper)
    common = importlib.util.module_from_spec(module_spec)
    module_spec.loader.exec_module(common)
    assert common.STATE_JS.count('quality:A.state.quality,') == 1
    state_js = common.STATE_JS.replace('quality:A.state.quality,',
        "detailNeighbors:A.state.detailNeighbors.slice(),rendererPackIds:[...R.packs.keys()].sort(),recordMapNativeIds:[...R.recordMap.values()].filter(r=>r.pack!=='overview').map(r=>r.data.id).sort(),visibleNativePacks:[...new Set(R.records.filter(r=>r.wanted&&r.item?.mesh.visible&&r.pack!=='overview').map(r=>r.pack))],quality:A.state.quality,")
    pose = dict(space='surface', eye=[-920,315,1520], target=[-1138,146,1190])
    report = dict(schema=1, kind='Bounded Flower Hill native lifecycle',
        startedUTC=datetime.now(timezone.utc).isoformat(),
        protocolSHA256=sha(Path(__file__)), stateHelperSHA256=sha(helper),
        invocation=dict(argv=sys.argv, cwd=str(Path.cwd())),
        sourceHEADBefore=subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip(),
        artifactSHA256=release['sha256'], releaseSHA256=sha(dist/'release.json'), inputsBefore=inputs_before,
        viewport=[1280,720], dpr=1, clock=12.5, fov=49, pose=pose,
        productionRAF=True, manualDraws=False, gpuFinish=False, cycles=1,
        hardwareFPSMeasured=False, physicalVRAMMeasured=False, longTermLeakTest=False,
        cameraFixture=dict(id='flowerHillNativeCheck',region='nameless',detailNeighbors=['sunflower'],requiredRegions=['nameless','sunflower'],pose=pose),
        cameraFixtureMeaning='A test-session-only camera preset uses the real ATLAS.setView path to initialize autoFocus origin and both required banks; production functions and repository presets are unchanged.',
        anchorProtocol='overview -> actual native-clear UI -> test camera via production setView -> three production wakes -> existing graceSeconds plus250ms -> three production wakes',
        anchorDesign='Both anchors use the same predeclared expiry wait. Strict resource/program assertions are retained; no tolerance or source/renderer change.',
        errors=[], httpFailures=[], contextEvents=[], states=[], checks=[])
    started = time.monotonic()

    def save():
        (out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')

    def check(name, passed, data=None):
        report['checks'].append(dict(name=name,passed=bool(passed),data=data))
        save()
        assert passed, name

    class Quiet(SimpleHTTPRequestHandler):
        def log_message(self,*_args):
            pass
        def send_error(self,code,message=None,explain=None):
            report['httpFailures'].append(dict(path=self.path,status=code))
            super().send_error(code,message,explain)

    server = ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(dist)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,
                args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader','--disable-dev-shm-usage'])
            page = browser.new_page(viewport={'width':1280,'height':720},device_scale_factor=1)
            page.set_default_timeout(180000)
            page.on('pageerror',lambda e:report['errors'].append(str(e)))
            page.on('console',lambda m:report['errors'].append(m.text) if m.type=='error' and 'Failed to load resource' not in m.text else None)
            page.add_init_script('globalThis.ATLAS_TEST_PAUSE=true')
            try:
                page.goto(f'http://127.0.0.1:{server.server_port}/{release["artifact"]}',wait_until='load')
                page.wait_for_function('globalThis.ATLAS||globalThis.ATLAS_BOOT_ERROR')
                check('Actual native application booted',not page.evaluate('globalThis.ATLAS_BOOT_ERROR||null'))
                page.evaluate("""()=>{Object.assign(ATLAS.state,{motion:false,clock:12.5,labels:false,characters:false,weather:'clear',lighting:'neutral',ao:true,bloom:false,reflections:false,uiHidden:true});
                  document.body.classList.add('ui-hidden');globalThis.__hillNativeEvents=[];
                  for(const e of ['webglcontextlost','webglcontextrestored'])document.querySelector('#scene').addEventListener(e,()=>__hillNativeEvents.push(e));
                  const q=document.querySelector('#quality');q.value='balanced';q.dispatchEvent(new Event('change',{bubbles:true}));
                  globalThis.ATLAS_TEST_PAUSE=false;ATLAS.wake();}""")
                report['browser']=browser.version
                report['driver']=page.evaluate('ATLAS.renderer.info().driver')
                page.evaluate("p=>{if(GA.PRESETS.flowerHillNativeCheck)throw Error('Camera fixture collision');GA.PRESETS.flowerHillNativeCheck={...p,label:'Flower Hill native check',region:'nameless',detailNeighbors:['sunflower'],requiredRegions:['nameless','sunflower'],fov:49};}",pose)
                check('Production balanced quality and both memory budgets',page.evaluate("ATLAS.state.quality==='balanced'&&ATLAS.renderer.quality==='balanced'&&ATLAS.renderer.attributeBudget===160*1048576&&ATLAS.stream.budget===220*1048576"))
                grace = page.evaluate('ATLAS.renderer.graceSeconds')
                check('Existing bounded public retention remains six seconds',grace==6,grace)
                report['retentionWaitMs']=int(grace*1000)+250

                def guard():
                    report['contextEvents']=page.evaluate('__hillNativeEvents.slice()')
                    assert not report['errors'] and not report['contextEvents'], 'Application/context error'
                    assert not page.evaluate('ATLAS.renderer.engine.getContext().isContextLost()')

                def settle():
                    for _ in range(3):
                        n=page.evaluate('()=>{const n=ATLAS.state.drawnFrames;ATLAS.wake();return n}')
                        page.wait_for_function('n=>ATLAS.state.drawnFrames>n',arg=n)
                    guard()

                def visit(view):
                    n=page.evaluate('v=>{const n=ATLAS.state.drawnFrames;ATLAS.setView(v,false);ATLAS.state.labels=false;ATLAS.state.characters=false;return n}',view)
                    page.wait_for_function('p=>ATLAS.state.drawnFrames>p.frames&&ATLAS.renderer.currentOptions.view===p.view&&!ATLAS.rig.transition&&!ATLAS.stream.pending&&[...ATLAS.stream.required].every(id=>ATLAS.stream.cache.has(id))',arg=dict(frames=n,view=view),polling=100)
                    guard()

                def both():
                    visit('flowerHillNativeCheck')
                    settle()

                def mature():
                    page.wait_for_timeout(report['retentionWaitMs'])
                    settle()

                def clear():
                    page.evaluate("()=>{ATLAS.state.uiHidden=false;document.body.classList.remove('ui-hidden');ATLAS.wake()}")
                    page.locator('#btn-settings').click()
                    n=page.evaluate('ATLAS.state.drawnFrames')
                    page.locator('#btn-clear-cache').click()
                    page.locator('#close-settings').click()
                    page.wait_for_function('n=>ATLAS.state.drawnFrames>n&&!ATLAS.stream.pending&&ATLAS.stream.cache.size===0&&ATLAS.renderer.packs.size===0',arg=n)
                    page.evaluate("()=>{ATLAS.state.uiHidden=true;document.body.classList.add('ui-hidden');ATLAS.wake()}")
                    settle()

                def state(label):
                    value=page.evaluate(state_js,label)
                    report['states'].append(value)
                    guard()
                    assert not value['testPause']
                    assert value['geometryInventory']['complete'] and value['programInventory']['complete']
                    assert not any(value['diagnosticCounters'].values())
                    save()
                    return value

                visit('diorama');clear();both();mature()
                input_before=state('before actual input')
                page.mouse.move(640,390);page.mouse.down();page.mouse.move(660,394,steps=4);page.mouse.up()
                page.wait_for_function('p=>ATLAS.state.drawnFrames>p.drawnFrames&&ATLAS.rig.eye.some((v,i)=>Math.abs(v-p.rig.eye[i])>1e-6)',arg=input_before)
                orbit=state('actual orbit completed')
                page.mouse.wheel(0,-80)
                page.wait_for_function('p=>ATLAS.state.drawnFrames>p.drawnFrames&&ATLAS.rig.eye.some((v,i)=>Math.abs(v-p.rig.eye[i])>1e-6)',arg=orbit)
                state('actual wheel completed')
                check('Actual mouse orbit and wheel wake production RAF',True,'Raw per-event CPU samples remain software-backend observations, not hardware speed claims.')

                visit('diorama');clear();both();mature()
                before=state('detail before native unload')
                check('Both native banks are required, cached and actually visible',set(before['stream']['required'])==set(before['stream']['cached'])==set(before['visibleNativePacks'])=={'nameless','sunflower'} and before['stream']['detailSourceMiB']>0)
                check('Exact comparison pose',before['rig']['eye']==pose['eye'] and before['rig']['target']==pose['target'] and before['rig']['fov']==49)
                source_before=page.evaluate(SOURCE_JS);report['sourceBefore']=source_before
                expected_contacts=['sunflowerEntry:contact']
                if 'src/flower-hill-entry.js' in release['inputs']:
                    expected_contacts+=['flowerHillEntry:contact','flowerHillEntry:originalContact']
                check('Required persistent CPU contacts are present and nonempty',
                    sorted(x['id'] for x in source_before['contacts'])==sorted(expected_contacts) and
                    all(x['bytes']>0 and len(x['sha256'])==64 for x in source_before['contacts']),
                    dict(expected=expected_contacts,actual=source_before['contacts']))
                source_counts={bank:sum(row['pack']==bank for row in source_before['records']) for bank in ('nameless','sunflower')}
                expected_counts=dict(nameless=414 if 'src/flower-hill-entry.js' in release['inputs'] else 411,sunflower=485)
                check('Both complete native bank source inventories match the actual reviewed builds',source_counts==expected_counts,dict(expected=expected_counts,actual=source_counts))
                before_png=page.locator('#scene').screenshot(path=str(out/'reentry-before.png'))
                owned={e['id'] for e in before['geometryInventory']['entries'] if e['owners'] and all(o['pack'] in ('nameless','sunflower') for o in e['owners'])}
                check('Nonempty GPU ownership in the two native banks',bool(owned),dict(count=len(owned)))
                visit('diorama');clear();mature()
                dropped=state('native cache cleared')
                check('All native CPU source and detail records removed',dropped['stream']['detailSourceMiB']==0 and not dropped['detailIds'])
                check('Native cache, pending task, required banks and renderer maps actually clear',
                    dropped['snapshot']['streaming']['sourceBytes']==0 and not dropped['stream']['cached'] and
                    not dropped['stream']['required'] and not dropped['stream']['building'] and
                    not dropped['rendererPackIds'] and not dropped['recordMapNativeIds'])
                check('All public records survive unload',before['publicIds']==dropped['publicIds'])
                retained=owned & {e['id'] for e in dropped['geometryInventory']['entries']}
                check('All exclusively native GPU geometries are released',not retained,dict(count=len(owned),retained=sorted(retained)))
                dropped_source=page.evaluate(SOURCE_JS);report['contactsWhileUnloaded']=dropped_source['contacts']
                check('Persistent public CPU contact arrays survive unchanged',source_before['contacts']==dropped_source['contacts'])
                both();mature()
                after=state('detail after native reentry')
                source_after=page.evaluate(SOURCE_JS);report['sourceAfter']=source_after
                check('Source metadata and exact array hashes restore',source_before==source_after)
                check('Camera, neighbors, wanted identities and LOD restore',before['rig']==after['rig'] and before['detailNeighbors']==after['detailNeighbors'] and before['wanted']==after['wanted'])
                delta={k:[before['snapshot']['gpu'][k],after['snapshot']['gpu'][k]] for k in ('geometries','textures','programs','attributeBytes','geometryEntries','residentObjects') if before['snapshot']['gpu'][k]!=after['snapshot']['gpu'][k]}
                check('Strict comparable resource counters restore',not delta,delta)
                program_key=lambda p:(p['cacheKey'],p['usedTimes'])
                check('Program keys and reference counts restore',sorted(map(program_key,before['programInventory']['entries']))==sorted(map(program_key,after['programInventory']['entries'])))
                after_png=page.locator('#scene').screenshot(path=str(out/'reentry-after.png'))
                report['imageRestoration']=dict(beforeSHA256=hashlib.sha256(before_png).hexdigest(),afterSHA256=hashlib.sha256(after_png).hexdigest(),byteExact=before_png==after_png)
                check('Exact native reentry image restores',before_png==after_png)
                page.wait_for_timeout(500)
                idle_before=page.evaluate('({frames:ATLAS.state.drawnFrames,clock:ATLAS.state.clock})')
                page.wait_for_timeout(1000)
                idle_after=state('one second idle')
                check('One second static view draws zero frames at paused clock',idle_before['frames']==idle_after['drawnFrames'] and idle_before['clock']==idle_after['clock']==12.5)
                guard();report.update(passed=True,exitCode=0)
            except BaseException as error:
                report.update(passed=False,exitCode=1,failure=repr(error))
                try:
                    report['failureState']=page.evaluate(state_js,'failure')
                    page.locator('#scene').screenshot(path=str(out/'failure.png'),timeout=5000)
                except Exception as diagnostic:
                    report['failureDiagnosticError']=repr(diagnostic)
                raise
            finally:
                browser.close()
    finally:
        report['endedUTC']=datetime.now(timezone.utc).isoformat()
        report['elapsedSeconds']=time.monotonic()-started
        report['inputsAfter']=source_hashes()
        report['inputsUnchanged']=report['inputsAfter']==inputs_before
        report['artifactUnchanged']=sha(artifact)==release['sha256']
        report['protocolUnchanged']=sha(Path(__file__))==report['protocolSHA256']
        report['helperUnchanged']=sha(helper)==report['stateHelperSHA256']
        report['sourceHEADAfter']=subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip()
        save();server.shutdown();server.server_close()
        assert all(report[k] for k in ('inputsUnchanged','artifactUnchanged','protocolUnchanged','helperUnchanged'))


if __name__=='__main__':
    main()
