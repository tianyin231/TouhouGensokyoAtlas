"""Fixed Flower Hill views, source-bound and rendered with real native Workers.

Three explicit frames per view. This is visual/cost evidence, not a native
lifecycle check or hardware timing benchmark. First view must be cold overview.
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


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', type=Path, required=True)
    parser.add_argument('--dist', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--spec', type=Path, required=True)
    parser.add_argument('--compare-to', type=Path)
    args = parser.parse_args()
    repo, dist, out = args.repo.resolve(), args.dist.resolve(), args.output.resolve()
    out.mkdir(parents=True, exist_ok=True)
    assert not (out / 'report.json').exists(), 'Do not overwrite earlier evidence'
    spec = json.loads(args.spec.read_text())
    views = spec['views']
    assert views and views[0]['mode'] == 'coldOverview'
    assert len({v['name'] for v in views}) == len(views)
    assert all(v['mode'] in ('coldOverview', 'defaultEntry', 'warmBoth') for v in views)
    assert all(v['name'].isalnum() for v in views)
    assert all(v.get('quality', 'balanced') in ('balanced', 'low') for v in views)
    assert all(v.get('lighting', 'neutral') in ('neutral', 'night') for v in views)
    release = json.loads((dist / 'release.json').read_text())
    artifact = dist / release['artifact']
    assert sha(artifact) == release['sha256']
    source_hashes = lambda: {name: sha(repo / name) for name in release['inputs']}
    before = source_hashes()
    assert before == release['inputs'], 'Current source differs from the supplied build'
    inherited = repo / 'tools/check-sunflower-browser.py'
    module_spec = importlib.util.spec_from_file_location('flower_hill_common_capture', inherited)
    common = importlib.util.module_from_spec(module_spec)
    module_spec.loader.exec_module(common)
    assert common.FRAME_JS.count('cutaway:A.state.cutaway,') == 1
    frame_js = common.FRAME_JS.replace('cutaway:A.state.cutaway,',
        "cutaway:A.state.cutaway,detailNeighbors:A.state.detailNeighbors.slice(),"
        "visibleNativePacks:[...new Set(R.records.filter(r=>r.wanted&&r.item?.mesh.visible&&r.pack!=='overview').map(r=>r.pack))],")
    report = dict(schema=1, purpose='Actual supplemental Flower Hill views and bounded renderer cost',
        startedUTC=datetime.now(timezone.utc).isoformat(), sourceHEADBefore=subprocess.check_output(
            ['git', 'rev-parse', 'HEAD'], cwd=repo, text=True).strip(),
        artifactSHA256=release['sha256'], releaseSHA256=sha(dist / 'release.json'),
        invocation=dict(argv=sys.argv, cwd=str(Path.cwd())),
        protocolSHA256=sha(Path(__file__)), frameHelperSHA256=sha(inherited),
        specSHA256=sha(args.spec), spec=spec, inputsBefore=before,
        viewport=[1280, 720], dpr=1, fov=49, clock=12.5, ao=True,
        hardwareFPSMeasured=False, physicalVRAMMeasured=False,
        CPUComparison='Uncontrolled software-backend samples are retained; no CPU speed or load-time claim.',
        captureMode='Three explicit renderOnce frames with GPU finish, unchanged production functions',
        errors=[], httpFailures=[], contextEvents=[], frames=[], checks=[])
    started = time.monotonic()

    def save():
        (out / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')

    def check(name, passed, data=None):
        report['checks'].append(dict(name=name, passed=bool(passed), data=data))
        save()
        assert passed, name

    class Quiet(SimpleHTTPRequestHandler):
        def log_message(self, *_args):
            pass

        def send_error(self, code, message=None, explain=None):
            report['httpFailures'].append(dict(path=self.path, status=code))
            super().send_error(code, message, explain)

    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=str(dist)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                args=['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--disable-dev-shm-usage'])
            page = browser.new_page(viewport={'width': 1280, 'height': 720}, device_scale_factor=1)
            page.set_default_timeout(180000)
            page.on('pageerror', lambda e: report['errors'].append(str(e)))
            page.on('console', lambda m: report['errors'].append(m.text)
                if m.type == 'error' and 'Failed to load resource' not in m.text else None)
            page.add_init_script('globalThis.ATLAS_TEST_PAUSE=true')
            try:
                page.goto(f'http://127.0.0.1:{server.server_port}/{release["artifact"]}', wait_until='load', timeout=180000)
                page.wait_for_function('globalThis.ATLAS||globalThis.ATLAS_BOOT_ERROR')
                check('Actual native application booted', not page.evaluate('globalThis.ATLAS_BOOT_ERROR||null'))
                page.evaluate("""()=>{Object.assign(ATLAS.state,{motion:false,clock:12.5,labels:false,characters:false,
                  weather:'clear',lighting:'neutral',ao:true,bloom:false,reflections:false,uiHidden:true});
                  document.body.classList.add('ui-hidden');globalThis.__hillEvents=[];
                  for(const e of ['webglcontextlost','webglcontextrestored'])document.querySelector('#scene')
                    .addEventListener(e,()=>__hillEvents.push(e));}""")
                report['browser'] = browser.version
                report['driver'] = page.evaluate('ATLAS.renderer.info().driver')
                for view in views:
                    preset = 'diorama' if view['mode'] == 'coldOverview' else 'flowerLink'
                    page.evaluate('v=>{ATLAS.setView(v,false);ATLAS.renderOnce();}', preset)
                    page.wait_for_function('!ATLAS.stream.pending&&[...ATLAS.stream.required].every(id=>ATLAS.stream.cache.has(id))', polling=250)
                    if view['mode'] == 'warmBoth':
                        page.evaluate("()=>{ATLAS.state.detailNeighbors=['sunflower'];ATLAS.stream.focus(['nameless','sunflower']);}")
                        page.wait_for_function("!ATLAS.stream.pending&&['nameless','sunflower'].every(id=>ATLAS.stream.cache.has(id))", polling=250)
                    quality = view.get('quality', 'balanced')
                    page.evaluate("q=>{const e=document.querySelector('#quality');e.value=q;e.dispatchEvent(new Event('change',{bubbles:true}));}", quality)
                    page.evaluate("""s=>{Object.assign(ATLAS.state,{clock:12.5,lighting:s.lighting||'neutral',weather:'clear',ao:true,
                        labels:false,characters:false,motion:false,bloom:false,reflections:false});
                        if(s.pose)ATLAS.rig.setView(s.pose,false);ATLAS.rig.fov=49;ATLAS.rig.updateMatrices();}""", view)
                    samples = [page.evaluate(frame_js) for _ in range(3)]
                    report['contextEvents'] = page.evaluate('__hillEvents.slice()')
                    check('No application or context errors at ' + view['name'],
                        not report['errors'] and not report['contextEvents'] and not samples[-1]['lost'])
                    final = samples[-1]
                    check('Actual production quality control at ' + view['name'],
                        final['quality'] == final['rendererQuality'] == quality and
                        final['budgetBytes'] == {'balanced': 160, 'low': 80}[quality] * 1048576)
                    if view.get('pose'):
                        check('Exact fixed pose at ' + view['name'], final['eye'] == view['pose']['eye'] and
                            final['target'] == view['pose']['target'] and final['fov'] == 49)
                    if view['mode'] == 'coldOverview':
                        check('Cold overview starts with zero native requests and sources',
                            final['stream']['requests'] == 0 and final['stream']['cached'] == [] and
                            final['stream']['detailSourceMiB'] == 0 and not final['visibleNativePacks'], final['stream'])
                    elif view['mode'] == 'defaultEntry':
                        check('Default entry requests only its original Nameless bank',
                            final['stream']['required'] == ['nameless'] and final['stream']['cached'] == ['nameless'], final['stream'])
                    else:
                        check('Both native banks remain loaded at ' + view['name'],
                            set(final['stream']['cached']) == {'nameless', 'sunflower'} and
                            set(final['stream']['required']) == {'nameless', 'sunflower'} and
                            bool(final['visibleNativePacks']) and
                            set(view.get('expectVisible', [])).issubset(final['visibleNativePacks']),
                            dict(stream=final['stream'], visibleNativePacks=final['visibleNativePacks']))
                    png = out / (view['name'] + '.png')
                    page.locator('#scene').screenshot(path=str(png), timeout=120000)
                    report['frames'].append(dict(name=view['name'], samples=samples, file=png.name, pngSHA256=sha(png)))
                    save()
                    print(json.dumps(dict(view=view['name'], calls=final['stats']['totalCalls'],
                        triangles=final['stats']['totalTriangles'], attributeBytes=final['residentAttributeBytes'],
                        memory=final['memory'])), flush=True)
                if args.compare_to:
                    prior = json.loads(args.compare_to.read_text())
                    check('Same protocol, helper, spec, driver and browser', all(prior[k] == report[k] for k in
                        ('protocolSHA256','frameHelperSHA256','specSHA256','browser','driver','viewport','dpr')))
                    check('Same complete view order', [f['name'] for f in prior['frames']] == [f['name'] for f in report['frames']])
                    report['comparisons'] = []
                    for a, b in zip(prior['frames'], report['frames']):
                        old, new = a['samples'][-1], b['samples'][-1]
                        check('Same camera and options at ' + b['name'], all(old[k] == new[k] for k in
                            ('eye','target','fov','quality','rendererQuality','lighting','weather','ao','view','cutaway')))
                        check('Two settled counters at ' + b['name'], all(
                            sample['stats'][k] == frames['samples'][-1]['stats'][k]
                            for frames in (a,b) for sample in frames['samples'][-2:] for k in ('totalCalls','totalTriangles')))
                        delta = dict(calls=new['stats']['totalCalls']-old['stats']['totalCalls'],
                            triangles=new['stats']['totalTriangles']-old['stats']['totalTriangles'],
                            attributeBytes=new['residentAttributeBytes']-old['residentAttributeBytes'],
                            geometries=new['memory']['geometries']-old['memory']['geometries'],
                            textures=new['memory']['textures']-old['memory']['textures'])
                        report['comparisons'].append(dict(view=b['name'], delta=delta))
                        check('Prospective renderer cost budget at ' + b['name'], delta['calls'] <= 4 and
                            delta['triangles'] <= 4000 and delta['attributeBytes'] <= .6*1048576 and delta['textures'] == 0, delta)
                report['passed'] = True
                report['exitCode'] = 0
            finally:
                browser.close()
    except BaseException as error:
        report.update(passed=False, exitCode=1, failure=repr(error))
        raise
    finally:
        report['endedUTC'] = datetime.now(timezone.utc).isoformat()
        report['elapsedSeconds'] = time.monotonic()-started
        report['inputsAfter'] = source_hashes()
        report['inputsUnchanged'] = report['inputsAfter'] == before
        report['artifactUnchanged'] = sha(artifact) == release['sha256']
        report['protocolUnchanged'] = sha(Path(__file__)) == report['protocolSHA256']
        report['specUnchanged'] = sha(args.spec) == report['specSHA256']
        report['sourceHEADAfter'] = subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip()
        save()
        server.shutdown()
        assert all(report[k] for k in ('inputsUnchanged','artifactUnchanged','protocolUnchanged','specUnchanged'))


if __name__ == '__main__':
    main()
