"""Cross-region WebGL lifecycle regression using the production frame scheduler.

Build first. HTTP is the default; --content is an explicitly reported fallback.
Full lifecycle starts at native #view=backdoorSpring to deterministically warm
the overview window's untextured shader, then clears detail at the overview.
One complete warm-up route precedes three measured routes by default. For a
longer reproduction, use --cycles 3 --soak-seconds 1200 (or 1800). The soak starts
after warm-up and finishes the current route before stopping; it is a minimum
duration, not a hardware FPS or physical-VRAM measurement.

Every ordinary context loss/restoration fails the check. Only the final, labelled
WEBGL_lose_context pair is intentional. Its success proves recovery of this
session and does not establish the cause or prevention of historical resets.
No renderOnce, direct renderer.render, gl.finish or readPixels advances a route.
Program inventories are bounded, informational captures at comparable anchors;
the resource comparisons remain strict. --recovery-only retains the default entry.
"""

import argparse
import hashlib
import json
import struct
import subprocess
import threading
import time
import traceback
import zlib
from functools import partial
from contextlib import contextmanager
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# Install before the first WebGL context is created, including startup failures.
# The prototype hook also survives document.open() in the --content fallback.
INIT_JS = r"""(() => {
  globalThis.ATLAS_TEST_PAUSE = false;
  if (globalThis.__atlasLifecycleProbe) return;
  const P = globalThis.__atlasLifecycleProbe = {
    phase: 'startup', step: 'load', events: [], forced: null,
    shadowHandles: {}, environmentBindings: []
  };
  const seen = new WeakSet(), getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function(...args) {
    if (this.id === 'scene' && /^webgl/.test(args[0]) && !seen.has(this)) {
      seen.add(this);
      for (const type of ['webglcontextlost', 'webglcontextrestored']) {
        this.addEventListener(type, () => {
          const A = globalThis.ATLAS, f = P.forced;
          let intentional = false;
          if (f && type === 'webglcontextlost' && !f.lost && !f.restored) {
            f.lost = true; intentional = true;
          } else if (f && type === 'webglcontextrestored' && f.lost && !f.restored) {
            f.restored = true; intentional = true;
          }
          const event = {index: P.events.length, type, intentional, at: performance.now(),
            phase: P.phase, step: P.step, view: A?.state.view,
            quality: A?.state.quality, lighting: A?.state.lighting,
            weather: A?.state.weather, frames: A?.state.drawnFrames};
          P.events.push(event);
          if (globalThis.__atlasLifecycleEvent)
            globalThis.__atlasLifecycleEvent(event).catch(() => {});
        });
      }
    }
    return getContext.apply(this, args);
  };
})();"""

SNAPSHOT_JS = r"""label => {
  const A = ATLAS, R = A.renderer, P = __atlasLifecycleProbe;
  if (typeof R.captureDiagnostics !== 'function')
    throw Error('Build the current renderer with lifecycle diagnostics version 1');
  const snapshot = R.captureDiagnostics(label), diagnostics = R.info().diagnostics;
  const caches = {};
  for (const [name, value] of Object.entries(R)) {
    if (value instanceof Map && [...value.values()].some(v => v?.isMaterial))
      caches[name] = value.size;
  }
  return {snapshot, diagnostics, events: P.events.slice(),
    extra: {view: A.state.view, quality: A.state.quality, rendererQuality: R.quality,
      lighting: A.state.lighting, weather: A.state.weather, space: A.state.space,
      motion: A.state.motion, clock: A.state.clock, testPause: !!globalThis.ATLAS_TEST_PAUSE,
      rig: {eye: A.rig.eye.slice(), target: A.rig.target.slice(), fov: A.rig.fov,
        mode: A.rig.mode, transition: !!A.rig.transition},
      viewport: [innerWidth, innerHeight, devicePixelRatio],
      contextLost: R.engine.getContext().isContextLost(),
      cacheIds: [...A.stream.cache.keys()].sort(), packIds: [...R.packs.keys()].sort(),
      records: R.records.length, recordMap: R.recordMap.size,
      indexByArray: R.indexByArray.size, materialCaches: caches,
      wanted: R.records.filter(r => r.wanted && r.item?.mesh.visible).map(r => ({
        id: r.data.id, owner: r.data.owner, pack: r.pack, overview: !!r.data.overview, level: r.level
      })).sort((a,b) => a.id.localeCompare(b.id)),
      detailRecords: R.records.filter(r => r.pack !== 'overview').length,
      backdoor: {targets: R.backdoorWindowTargets.length,
        buildPasses: R.backdoorWindowBuildPasses,
        framePasses: R.backdoorWindowPassesThisFrame},
      samples: R.sceneTarget.samples, nightActive: !!R.nightActive,
      rainVisible: R.rain.visible, skyVisible: R.sky.visible,
      submittedTriangles: R.info().stats.totalTriangles,
      kourindou: R.kourindouMaterials.map(m => ({name: m.name,
        intensity: m.envMapIntensity, currentEnvironment: m.envMap === R.studioEnv.texture})),
      surfaceIntensity: R.mats.matte.envMapIntensity,
      recessIntensity: R.mats.hakureiRecess.envMapIntensity}
  };
}"""

BACKDOOR_STARTUP_PROGRAMS_JS = r"""() => {
  const A=ATLAS, R=A.renderer, E=R.engine, gl=E.getContext();
  return {view:A.state.view, hash:location.hash, frames:A.state.drawnFrames,
    evidence:'held programs after native first frame; no draw observer',
    windows:['spring','summer'].map(season=>{
      const key='backdoorWindow'+season, material=R.mats[key];
      const programs=[];
      if(material && E.properties.has(material)) {
        const properties=E.properties.get(material);
        for(const program of properties.programs?.values()||[]) {
          const source=program.fragmentShader ? gl.getShaderSource(program.fragmentShader) : null;
          programs.push({cacheKey:program.cacheKey, id:program.id, name:program.name,
            type:program.type, usedTimes:program.usedTimes,
            sourceAvailable:typeof source==='string',
            actualUSE_MAP:typeof source==='string' ? /^\s*#define\s+USE_MAP\b/m.test(source) : null});
        }
      }
      return {key, hasMap:!!material?.map, programs};
    })};
}"""

ANCHOR_PROGRAM_INVENTORY_JS = r"""() => {
  const R=ATLAS.renderer, E=R.engine, programs=E.info.programs, limit=1024;
  const entries=[], byKey=new Map();
  for(let i=0;i<Math.min(programs.length,limit);i++) {
    const p=programs[i], entry={cacheKey:p.cacheKey, id:p.id, type:p.type,
      name:p.name, usedTimes:p.usedTimes, materialKeys:[]};
    entries.push(entry); byKey.set(p.cacheKey,entry);
  }
  for(const [key,material] of Object.entries(R.mats)) {
    if(!material?.isMaterial || !E.properties.has(material)) continue;
    for(const cacheKey of E.properties.get(material).programs?.keys()||[]) {
      const entry=byKey.get(cacheKey);
      if(entry) entry.materialKeys.push(key);
    }
  }
  return {scope:'comparable anchors only; informational', count:programs.length,
    limit, complete:programs.length<=limit, overflow:Math.max(0,programs.length-limit), entries};
}"""

# Identical route/order/options make the terminal trimmed samples comparable.
# Switching between independent spaces is a view change, not a physical tunnel.
ROUTE = [
    ('kourindouFront', 'balanced', 'neutral', 'clear'),
    ('shrineFront', 'balanced', 'night', 'rain'),
    ('asamaShrine', 'low', None, None),
    ('peonyRows', 'low', None, None),
    ('backdoorSpring', 'high', None, None),
    ('hellHall', 'balanced', None, None),
    ('hellReactor', 'low', None, None),
    ('kourindouFront', 'high', 'night', 'rain'),
    ('shrineFront', 'high', 'neutral', 'clear'),
]


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def png_sample(data):
    """Read a small RGB grid from Chromium's PNG without an extra dependency."""
    require(data[:8] == b'\x89PNG\r\n\x1a\n', 'Screenshot is not a PNG')
    offset, compressed = 8, bytearray()
    while offset < len(data):
        length = struct.unpack_from('>I', data, offset)[0]
        kind, value = data[offset + 4:offset + 8], data[offset + 8:offset + 8 + length]
        if kind == b'IHDR':
            width, height, depth, color, _, _, interlace = struct.unpack('>IIBBBBB', value)
        elif kind == b'IDAT':
            compressed.extend(value)
        offset += length + 12
    require(depth == 8 and color in (2, 6) and interlace == 0,
            'Expected a non-interlaced RGB/RGBA Chromium screenshot')
    channels = 3 if color == 2 else 4
    stride, raw = width * channels, zlib.decompress(compressed)
    require(len(raw) == height * (stride + 1), 'Incomplete PNG scanlines')
    xs = {min(width - 1, width * i // 16) for i in range(16)}
    ys = {min(height - 1, height * i // 12) for i in range(12)}
    colors, previous = set(), bytearray(stride)
    for y in range(height):
        start = y * (stride + 1)
        mode, row = raw[start], bytearray(raw[start + 1:start + 1 + stride])
        require(mode <= 4, 'Unknown PNG row filter')
        if mode:
            for i in range(stride):
                left = row[i - channels] if i >= channels else 0
                above = previous[i]
                upper_left = previous[i - channels] if i >= channels else 0
                if mode == 1:
                    predictor = left
                elif mode == 2:
                    predictor = above
                elif mode == 3:
                    predictor = (left + above) // 2
                else:
                    p = left + above - upper_left
                    distances = [abs(p - left), abs(p - above), abs(p - upper_left)]
                    predictor = [left, above, upper_left][distances.index(min(distances))]
                row[i] = (row[i] + predictor) & 255
        if y in ys:
            colors.update(tuple(row[x * channels:x * channels + 3]) for x in xs)
        previous = row
    return {'width': width, 'height': height, 'sampledRGBColors': len(colors)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--content', action='store_true')
    parser.add_argument('--headed', action='store_true')
    parser.add_argument('--chromium')
    parser.add_argument('--output', type=Path, default=ROOT / 'dist/render-lifecycle-check')
    parser.add_argument('--cycles', type=int, default=3, help='Minimum measured route count, after warm-up')
    parser.add_argument('--recovery-only', action='store_true',
                        help='Exercise intentional recovery only; does not verify cross-region stress')
    parser.add_argument('--soak-seconds', type=float, default=0,
                        help='Minimum active route duration after warm-up; finish the current route')
    args = parser.parse_args()
    if args.cycles < 1 or args.soak_seconds < 0:
        parser.error('--cycles must be positive and --soak-seconds must be nonnegative')
    if args.recovery_only and args.soak_seconds:
        parser.error('--recovery-only cannot be combined with --soak-seconds')
    args.output.mkdir(parents=True, exist_ok=True)
    began = time.monotonic()
    report = {'passed': False, 'phase': 'startup', 'requestedCycles': args.cycles,
              'scope': 'intentional-recovery-only' if args.recovery_only else 'full-lifecycle',
              'requestedSoakSeconds': args.soak_seconds, 'completedCycles': 0,
              'viewport': [1280, 720], 'dpr': 1,
              'loadMode': 'complete memory document / native Blob Worker' if args.content else 'local HTTP',
              'productionScheduling': True, 'manualDraws': False, 'gpuFinishUsed': False,
              'hardwareFPSMeasured': False, 'physicalVRAMMeasured': False,
              'startupView': 'diorama' if args.recovery_only else 'backdoorSpring',
              'variantWarmup': {'enabled': not args.recovery_only,
                                'scope': 'native cold overview window shader; not remote failure attribution'},
              'rootCauseFixed': False, 'checks': [], 'samples': [], 'contextEvents': [],
              'errors': [], 'resourceErrors': [], 'comparisons': [], 'screenshots': [],
              'intentionalRecovery': {'plannedPairs': 1, 'completed': False}}
    server = None
    page = None

    def save():
        report['elapsedSeconds'] = round(time.monotonic() - began, 3)
        temporary = args.output / 'report.json.tmp'
        temporary.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        temporary.replace(args.output / 'report.json')

    def event(item):
        known = {value['index'] for value in report['contextEvents']}
        if item['index'] not in known:
            report['contextEvents'].append(item)
        save()

    def error(message, category='errors'):
        report[category].append({'message': str(message), 'phase': report['phase'],
                                 'elapsedSeconds': round(time.monotonic() - began, 3)})
        save()

    def passed(name, details=None):
        report['checks'].append({'name': name, 'details': details})
        save()
        print('PASS', name, flush=True)

    @contextmanager
    def capture_live_failure():
        # Exit before Playwright closes the page, so renderer incidents and the
        # final sample survive a timeout/assertion rather than only the last PASS.
        try:
            yield
        except Exception:
            if page and not page.is_closed():
                try:
                    value = page.evaluate("""() => {
                      const R=globalThis.ATLAS?.renderer;
                      return {events:globalThis.__atlasLifecycleProbe?.events||[],
                        snapshot:R?.captureDiagnostics?.('test failure')||null,
                        diagnostics:R?.info().diagnostics||null};
                    }""")
                    report['contextEvents'] = value['events']
                    report['lastDiagnostics'] = value['diagnostics']
                    report['failureSnapshot'] = value['snapshot']
                    page.screenshot(path=str(args.output / 'failure.png'), timeout=5000)
                except Exception as capture_error:
                    report['failureCaptureError'] = repr(capture_error)
            save()
            raise

    try:
        release = json.loads((ROOT / 'dist/release.json').read_text(encoding='utf-8'))
        html = (ROOT / 'dist' / release['artifact']).read_bytes()
        require(hashlib.sha256(html).hexdigest() == release['sha256'], 'Artifact SHA mismatch; rebuild first')
        for name, digest in release['inputs'].items():
            require(hashlib.sha256((ROOT / name).read_bytes()).hexdigest() == digest,
                    'Build input changed; rebuild first: ' + name)
        commit = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=ROOT, capture_output=True, text=True)
        report.update(artifact=release['artifact'], sha256=release['sha256'],
                      artifactBytes=len(html), sourceCommit=commit.stdout.strip(),
                      buildInputs=release['inputs'], route=ROUTE)
        save()
        if not args.content:
            server = ThreadingHTTPServer(('127.0.0.1', 0),
                                         partial(SimpleHTTPRequestHandler, directory=str(ROOT / 'dist')))
            threading.Thread(target=server.serve_forever, daemon=True).start()

        from playwright.sync_api import TimeoutError as BrowserTimeout
        from playwright.sync_api import sync_playwright

        with sync_playwright() as pw, capture_live_failure():
            launch = {'headless': not args.headed,
                      'args': ['--no-sandbox', '--enable-unsafe-swiftshader',
                               '--use-angle=swiftshader', '--disable-dev-shm-usage']}
            if args.chromium:
                launch['executable_path'] = args.chromium
            browser = pw.chromium.launch(**launch)
            page = browser.new_page(viewport={'width': 1280, 'height': 720}, device_scale_factor=1)
            page.set_default_timeout(90000)
            page.on('pageerror', lambda e: error(e))
            page.on('crash', lambda *_: error('Chromium page crashed'))
            page.on('console', lambda m: error(m.text, 'resourceErrors' if 'Failed to load resource' in m.text
                                               else 'errors') if m.type == 'error' else None)
            page.on('requestfailed', lambda req: error(req.url + ': ' + str(req.failure), 'resourceErrors'))
            page.expose_function('__atlasLifecycleEvent', event)
            page.add_init_script(INIT_JS)
            entry_hash = '' if args.recovery_only else '#view=backdoorSpring'
            if args.content:
                if entry_hash:
                    page.goto('about:blank' + entry_hash, wait_until='load')
                page.evaluate(INIT_JS)
                page.set_content(html.decode('utf-8'), wait_until='load')
            else:
                page.goto(f'http://127.0.0.1:{server.server_port}/{release["artifact"]}{entry_hash}', wait_until='load')
            page.wait_for_function('globalThis.ATLAS || globalThis.ATLAS_BOOT_ERROR')
            require(not page.evaluate('globalThis.ATLAS_BOOT_ERROR || null'), 'Atlas startup failed')
            if not args.recovery_only:
                evidence = page.evaluate(BACKDOOR_STARTUP_PROGRAMS_JS)
                report['variantWarmup']['evidence'] = evidence
                save()
                require(evidence['view'] == 'backdoorSpring' and evidence['hash'] == entry_hash and
                        all(any(p['type'] == 'MeshBasicMaterial' and p['actualUSE_MAP'] is False
                                for p in window['programs']) for window in evidence['windows']),
                        'Native cold entry did not retain both untextured window shader programs')
            report['browser'] = browser.version
            report['backend'] = page.evaluate('ATLAS.renderer.info().driver')
            report['webgl'] = page.evaluate('ATLAS.renderer.info().webgl')
            page.evaluate("""() => {
              Object.assign(ATLAS.state, {motion:false,clock:12.5,labels:false,characters:false,
                bloom:false,reflections:false,ao:true,vegetation:true});
              for (const [id, checked] of [['opt-motion',false],['opt-bloom',false],
                ['opt-reflections',false],['opt-ao',true],['opt-plants',true],['opt-labels',false]])
                document.getElementById(id).checked = checked;
              ATLAS.wake();
            }""")

            def phase(name, step):
                report['phase'] = name
                report['step'] = step
                page.evaluate("p => Object.assign(__atlasLifecycleProbe,p)", {'phase': name, 'step': step})
                save()
                print('STEP', name, step, flush=True)

            def guard():
                require(not report['errors'], 'JavaScript/shader/page failure; see errors')
                require(not [e for e in report['contextEvents'] if not e['intentional']],
                        'Unexpected context loss/restoration; see contextEvents')

            def sample(label, check=True):
                value = page.evaluate(SNAPSHOT_JS, label)
                diagnostics = value['diagnostics']
                require(diagnostics and diagnostics.get('version') == 1, 'Lifecycle diagnostics version 1 is required')
                require(diagnostics['limits'] == {'samples': 60, 'events': 80, 'incidents': 4},
                        'Diagnostics history limits changed')
                for key in ('samples', 'events', 'incidents'):
                    require(len(diagnostics[key]) <= diagnostics['limits'][key], 'Unbounded diagnostics history: ' + key)
                report['lastDiagnostics'] = diagnostics
                report['contextEvents'] = value.pop('events')
                value.pop('diagnostics')
                value.update(phase=report['phase'], cycle=report['completedCycles'], label=label,
                             elapsedSeconds=round(time.monotonic() - began, 3))
                report['samples'].append(value)
                save()
                if check:
                    guard()
                    require(not value['extra']['contextLost'], 'WebGL context is lost')
                    require(not diagnostics['counters']['renderErrors'] and not diagnostics['counters']['recoveryErrors'],
                            'Renderer diagnostic error counters are nonzero')
                    require(not value['extra']['testPause'], 'Production scheduling was paused by the test')
                return value

            def wait(expression, arg=None, seconds=90):
                deadline, sampled_at = time.monotonic() + seconds, time.monotonic()
                while True:
                    remaining = deadline - time.monotonic()
                    require(remaining > 0, 'Timed out waiting for production state: ' + expression)
                    try:
                        page.wait_for_function(expression, arg=arg, timeout=min(3000, remaining * 1000), polling=100)
                        return
                    except BrowserTimeout:
                        guard()
                        if time.monotonic() - sampled_at >= 9:
                            sample('waiting: ' + report.get('step', expression))
                            sampled_at = time.monotonic()

            def quality(value):
                if page.evaluate('ATLAS.state.quality') == value:
                    return
                before = page.evaluate('ATLAS.state.drawnFrames')
                page.locator('#btn-settings').click()
                page.locator('#quality').select_option(value)
                page.locator('#close-settings').click()
                wait('p => ATLAS.state.drawnFrames>p.frames && ATLAS.renderer.quality===p.quality && '
                     'ATLAS.renderer.currentOptions.quality===p.quality',
                     {'frames': before, 'quality': value})
                require(page.evaluate('ATLAS.renderer.sceneTarget.samples') == (0 if value == 'low' else 2),
                        'Quality switch left the wrong post-target MSAA sample count')

            def climate(lighting, weather):
                require(page.evaluate("ATLAS.state.space==='surface'"), 'Climate controls require the surface')
                before = page.evaluate('ATLAS.state.drawnFrames')
                page.locator('#light-' + lighting).click()
                page.locator('[data-weather="' + weather + '"]').click()
                wait('p => ATLAS.state.drawnFrames>p.frames && ATLAS.state.lighting===p.light && '
                     'ATLAS.state.weather===p.weather && ATLAS.renderer.currentOptions.lighting===p.light && '
                     'ATLAS.renderer.currentOptions.weather===p.weather',
                     {'light': lighting, 'weather': weather, 'frames': before})

            def visit(view):
                expected = page.evaluate('v => ({exists:!!GA.PRESETS[v],region:GA.DIORAMA.regionOf(v)})', view)
                require(expected['exists'], 'Missing required preset: ' + view)
                sample('before visit ' + view)
                before = page.evaluate('v => {const n=ATLAS.state.drawnFrames;ATLAS.setView(v,true);'
                                       'ATLAS.state.labels=false;return n;}', view)
                wait('p => ATLAS.state.view===p.view && ATLAS.state.drawnFrames>p.frames && '
                     '!ATLAS.rig.transition && !ATLAS.stream.pending && '
                     '[...ATLAS.stream.required].every(id=>ATLAS.stream.cache.has(id))',
                     {'view': view, 'frames': before})
                wait('v => ATLAS.renderer.currentOptions.view===v', view)
                if expected['region'] and view != 'diorama':
                    wait('id => ATLAS.renderer.records.some(r=>r.pack===id && r.wanted && r.item?.mesh.visible)',
                         expected['region'])
                value = sample('arrived ' + view)
                require(value['extra']['submittedTriangles'] > 0 and value['extra']['wanted'],
                        'No submitted/visible scene geometry at ' + view)
                if expected['region'] and view != 'diorama':
                    require(expected['region'] in value['extra']['cacheIds'], 'Required detail was not cached: ' + view)
                    require(any(m['pack'] == expected['region'] and not m['overview']
                                for m in value['extra']['wanted']), 'Detail is absent from the drawn view: ' + view)
                return value

            def screenshot(name):
                data = page.locator('#scene').screenshot(path=str(args.output / (name + '.png')))
                pixels = png_sample(data)
                report['screenshots'].append({'name': name, 'sha256': hashlib.sha256(data).hexdigest(), **pixels})
                save()
                require(pixels['sampledRGBColors'] > 1, 'Uniform/blank screenshot at ' + name)
                return pixels

            def shadow_round_trip(view, light):
                phase('shadow-resource-check', view + ' balanced/low/balanced')
                quality('balanced')
                visit(view)
                if page.evaluate("ATLAS.state.space==='surface'"):
                    climate('neutral', 'clear')
                wait('name => !!ATLAS.renderer[name].shadow.map', light)
                handles = page.evaluate(r"""name => {
                  const R=ATLAS.renderer, gl=R.engine.getContext(), target=R[name].shadow.map;
                  const p=R.engine.properties.get(target), texture=R.engine.properties.get(target.texture).__webglTexture;
                  const framebuffers=[p.__webglFramebuffer,p.__webglMultisampledFramebuffer].flat(Infinity).filter(Boolean);
                  __atlasLifecycleProbe.shadowHandles[name]={target,texture,framebuffers};
                  return {textureAlive:!!texture&&gl.isTexture(texture),framebuffers:framebuffers.length,
                    framebuffersAlive:framebuffers.every(f=>gl.isFramebuffer(f)),width:target.width,height:target.height};
                }""", light)
                require(handles['textureAlive'] and handles['framebuffers'] and handles['framebuffersAlive'],
                        'Shadow target did not have live GPU storage: ' + light)
                screenshot(light + '-balanced-before')
                quality('low')
                released = page.evaluate(r"""name => {
                  const R=ATLAS.renderer, old=__atlasLifecycleProbe.shadowHandles[name], gl=R.engine.getContext();
                  return {mapNull:R[name].shadow.map===null,mapPassNull:R[name].shadow.mapPass===null,
                    textureAlive:gl.isTexture(old.texture),framebuffersAlive:old.framebuffers.some(f=>gl.isFramebuffer(f))};
                }""", light)
                report.setdefault('shadowChecks', []).append({'light': light, 'before': handles, 'low': released})
                save()
                require(released == {'mapNull': True, 'mapPassNull': True, 'textureAlive': False, 'framebuffersAlive': False},
                        'Low quality retained obsolete shadow GPU resources: ' + light)
                screenshot(light + '-low')
                quality('balanced')
                wait('name => !!ATLAS.renderer[name].shadow.map', light)
                restored = page.evaluate(r"""name => {
                  const R=ATLAS.renderer, target=R[name].shadow.map, old=__atlasLifecycleProbe.shadowHandles[name];
                  return {newTarget:target!==old.target,width:target.width,height:target.height,
                    textureAlive:R.engine.getContext().isTexture(R.engine.properties.get(target.texture).__webglTexture)};
                }""", light)
                report['shadowChecks'][-1]['restored'] = restored
                save()
                require(restored['newTarget'] and restored['textureAlive'] and
                        restored['width'] == handles['width'] and restored['height'] == handles['height'],
                        'Balanced quality failed to rebuild equivalent shadow storage: ' + light)
                screenshot(light + '-balanced-restored')
                page.evaluate('name => delete __atlasLifecycleProbe.shadowHandles[name]', light)
                sample(light + ' shadow round trip complete')
                passed(light + ' GPU shadow storage released in low and rebuilt in balanced', report['shadowChecks'][-1])

            def road():
                phase(report['phase'], 'continuous forest road')
                visit('kourindouPath')
                points = page.evaluate("GA.FOREST.paths[0].samples.filter(p=>p[0]>-642&&p[0]<-541).filter((p,i)=>i%2===0)")
                require(len(points) == 14, 'The inherited approach must exercise all 14 road samples')
                frames = page.evaluate('ATLAS.state.drawnFrames')
                for point in points:
                    before = page.evaluate(r"""p => {
                      const n=ATLAS.state.drawnFrames, y=GA.SurfaceContact.sampler(ATLAS.data,'kourindou').height(...p);
                      ATLAS.rig.setView({space:'surface',eye:[p[0]-2,y+7,p[1]+6],target:[p[0]+8,y+1,p[1]-2]},true);
                      ATLAS.wake(); return n;
                    }""", point)
                    wait('n => ATLAS.state.drawnFrames>n && !ATLAS.rig.transition', before)
                value = sample('continuous forest road complete')
                require(value['snapshot']['frames'] - frames >= len(points), 'Road steps did not draw through production RAF')

            def windows():
                value = sample('backdoor window cache populated')
                require(value['extra']['backdoor']['targets'] == 4, 'Four backdoor tableaux were not created')
                before = value['extra']['backdoor']['buildPasses']
                frames = value['snapshot']['frames']
                page.evaluate('ATLAS.wake()')
                wait('n => ATLAS.state.drawnFrames>n', frames)
                value = sample('backdoor stable window cache')
                require(value['extra']['backdoor']['buildPasses'] == before and
                        value['extra']['backdoor']['framePasses'] == 0, 'Stable backdoor cache was rebuilt every frame')
                page.locator('#btn-settings').click()
                page.locator('#opt-motion').check()
                page.locator('#close-settings').click()
                clock = page.evaluate('ATLAS.state.clock')
                wait('p => ATLAS.state.drawnFrames>=p.frames+2 && ATLAS.state.clock>p.clock',
                     {'frames': value['snapshot']['frames'], 'clock': clock})
                page.locator('#btn-settings').click()
                page.locator('#opt-motion').uncheck()
                page.locator('#close-settings').click()
                wait('!ATLAS.state.motion && !ATLAS.rig.transition')
                sample('backdoor animation advanced using production scheduling')

            def run_route(name):
                for view, level, lighting, weather in ROUTE:
                    phase(name, view + ' / ' + level)
                    quality(level)
                    value = visit(view)
                    if lighting:
                        climate(lighting, weather)
                        value = sample('climate applied at ' + view)
                    require(value['extra']['quality'] == level and value['extra']['rendererQuality'] == level,
                            'State/renderer quality mismatch at ' + view)
                    if value['extra']['space'] != 'surface':
                        require(not value['extra']['rainVisible'], 'Surface rain leaked into ' + view)
                    if view == 'kourindouFront' and lighting == 'night':
                        require(value['extra']['nightActive'], 'Kourindou did not enter surface night lighting')
                        for material in value['extra']['kourindou']:
                            expected = value['extra']['recessIntensity' if material['name'] == 'kourindouRecess'
                                                       else 'surfaceIntensity']
                            require(material['intensity'] == expected and material['currentEnvironment'],
                                    'Kourindou night environment map/intensity mismatch: ' + material['name'])
                    if view == 'kourindouFront' and level == 'balanced':
                        road()
                    if view == 'backdoorSpring':
                        windows()

            def anchor(label):
                quality('balanced')
                visit('shrineFront')
                climate('neutral', 'clear')
                visit('diorama')
                frames = page.evaluate('ATLAS.state.drawnFrames')
                page.evaluate('ATLAS.stream.trim(true);ATLAS.state.clock=12.5;ATLAS.wake()')
                wait('n => ATLAS.state.drawnFrames>n && !ATLAS.stream.pending', frames)
                page.evaluate('ATLAS.renderer.trim(true)')
                page.wait_for_timeout(500)
                value = sample(label)
                require(value['snapshot']['streaming']['sourceBytes'] == 0 and
                        not value['extra']['cacheIds'] and not value['extra']['packIds'] and
                        value['extra']['detailRecords'] == 0 and value['extra']['backdoor']['targets'] == 0,
                        'Trim retained detail source/records/targets at the comparable overview anchor')
                value['programInventory'] = page.evaluate(ANCHOR_PROGRAM_INVENTORY_JS)
                save()
                return value

            def compare(reference, current):
                fields = ['geometries', 'textures', 'programs', 'attributeBytes', 'geometryEntries', 'residentObjects']
                before, after = reference['snapshot'], current['snapshot']
                differences = {key: [before['gpu'][key], after['gpu'][key]] for key in fields
                               if before['gpu'][key] != after['gpu'][key]}
                target_key = lambda target: (target['name'], target['width'], target['height'], target['samples'])
                if sorted(map(target_key, before['targets'])) != sorted(map(target_key, after['targets'])):
                    differences['targets'] = [before['targets'], after['targets']]
                for key in ['rig', 'viewport', 'wanted', 'records', 'recordMap', 'indexByArray', 'materialCaches']:
                    if reference['extra'][key] != current['extra'][key]:
                        differences[key] = [reference['extra'][key], current['extra'][key]]
                report['comparisons'].append({'cycle': report['completedCycles'] + 1,
                                               'reference': reference['label'], 'sample': current['label'],
                                               'differences': differences})
                save()
                require(not differences, 'Comparable trimmed resources changed after full warm-up; see comparisons')

            def cancel_worker():
                before = page.evaluate('ATLAS.stream.metrics.cancelled')
                frames = page.evaluate("""() => {
                  const n=ATLAS.state.drawnFrames;
                  ATLAS.setView('kourindouFront',false);ATLAS.setView('diorama',false);
                  ATLAS.state.labels=false;ATLAS.stream.trim(true);return n;
                }""")
                wait('n => ATLAS.state.drawnFrames>n && !ATLAS.stream.pending', frames)
                page.wait_for_timeout(300)
                value = sample('cancelled forest Worker and waited for obsolete work')
                require(value['snapshot']['streaming']['cancelled'] > before and
                        not value['extra']['cacheIds'] and not value['extra']['packIds'],
                        'Obsolete forest Worker was not cancelled or reinserted its pack')

            def idle():
                phase(report['phase'], 'production idle at trimmed overview')
                page.wait_for_timeout(500)
                before = page.evaluate('({frames:ATLAS.state.drawnFrames,clock:ATLAS.state.clock})')
                page.wait_for_timeout(1000)
                after = sample('production idle: no input or visible motion')
                require(after['snapshot']['frames'] == before['frames'] and
                        after['extra']['clock'] == before['clock'] and before['clock'] != 0,
                        'Static production view kept drawing or changed the paused nonzero clock')

            def recover_once():
                phase('intentional-recovery', 'one explicit loss/restoration; not reset prevention')
                quality('balanced')
                visit('kourindouFront')
                climate('night', 'clear')
                visit('backdoorSpring')
                windows()
                before = sample('before the one intentional context loss')
                require(before['snapshot']['recovery']['lost'] == 0 and
                        before['snapshot']['recovery']['restored'] == 0 and not report['contextEvents'],
                        'Ordinary route already had a context loss/restoration')
                bindings = page.evaluate(r"""() => {
                  const R=ATLAS.renderer,P=__atlasLifecycleProbe,old=R.studioEnv.texture,materials=new Set(Object.values(R.mats));
                  for (const r of R.records) for (const m of [r.item?.mesh.material].flat()) if(m)materials.add(m);
                  for (const value of Object.values(R)) if(value instanceof Map)
                    for(const m of value.values()) if(m?.isMaterial)materials.add(m);
                  P.environmentBindings=[...materials].filter(m=>m.envMap===old);
                  P.groundBindings=[...R.kourindouGroundVariants.values()];
                  P.oldEnvironment=old;P.loseExtension=R.engine.getContext().getExtension('WEBGL_lose_context');
                  return {available:!!P.loseExtension,oldEnvironment:old.uuid,
                    materials:P.environmentBindings.map(m=>m.name),windows:R.backdoorWindowTargets.length,
                    groundMaterials:P.groundBindings.map(m=>({name:m.name,
                      binding:m.envMap===null?'scene':m.envMap===old?'explicit':'unexpected'})),
                    windowBuildPasses:R.backdoorWindowBuildPasses};
                }""")
                report['intentionalRecovery']['before'] = bindings
                save()
                require(bindings['available'] and bindings['windows'] == 4, 'Intentional recovery preconditions were not exercised')
                require(any(name.startswith('kourindou') for name in bindings['materials']) and
                        any(name.startswith('backdoor') for name in bindings['materials']),
                        'New explicit environment-map materials were not included in recovery coverage')
                require(bindings['groundMaterials'] and
                        all(m['binding'] in ('scene', 'explicit') for m in bindings['groundMaterials']),
                        'Kourindou ground variants lack a valid scene/explicit environment binding')
                page.evaluate("__atlasLifecycleProbe.forced={lost:false,restored:false};__atlasLifecycleProbe.loseExtension.loseContext()")
                wait('__atlasLifecycleProbe.forced.lost && ATLAS.renderer.engine.getContext().isContextLost()')
                sample('the explicitly forced context is lost', check=False)
                page.wait_for_timeout(200)
                page.evaluate('__atlasLifecycleProbe.loseExtension.restoreContext()')
                wait('n => ATLAS.state.drawnFrames>n && ATLAS.renderer.recovery.restored===1 && '
                     'ATLAS.renderer.recovery.rebuilt===1 && !ATLAS.renderer.recovery.pending && '
                     '!ATLAS.renderer.engine.getContext().isContextLost()', before['snapshot']['frames'])
                rebound = page.evaluate(r"""() => {
                  const R=ATLAS.renderer,P=__atlasLifecycleProbe,current=R.studioEnv.texture;
                  return {newEnvironment:current!==P.oldEnvironment,sceneEnvironment:R.scene.environment===current,
                    stale:P.environmentBindings.filter(m=>m.envMap!==current).map(m=>m.name),
                    staleGround:P.groundBindings.filter(m=>m.envMap!==null&&m.envMap!==current).map(m=>m.name),
                    windows:R.backdoorWindowTargets.length,windowBuildPasses:R.backdoorWindowBuildPasses};
                }""")
                report['intentionalRecovery']['after'] = rebound
                save()
                require(rebound['newEnvironment'] and rebound['sceneEnvironment'] and not rebound['stale'] and
                        not rebound['staleGround'],
                        'Explicit environment maps were not rebound to the rebuilt PMREM target')
                require(rebound['windows'] == 4 and rebound['windowBuildPasses'] == bindings['windowBuildPasses'] + 4,
                        'Recovery did not rebuild exactly four backdoor tableaux')
                screenshot('backdoor-after-intentional-restoration')
                visit('kourindouFront')
                climate('night', 'clear')
                value = sample('Kourindou returned after intentional restoration')
                require(all(m['currentEnvironment'] for m in value['extra']['kourindou']),
                        'Kourindou retained an obsolete environment texture after restoration')
                screenshot('kourindou-after-intentional-restoration')
                events = report['contextEvents']
                require(len(events) == 2 and all(e['intentional'] for e in events) and
                        [e['type'] for e in events] == ['webglcontextlost', 'webglcontextrestored'],
                        'Observed context events differ from the one explicit pair')
                require(value['snapshot']['recovery']['lost'] == 1 and value['snapshot']['recovery']['restored'] == 1 and
                        value['snapshot']['recovery']['rebuilt'] == 1 and not value['snapshot']['recovery']['lastError'],
                        'Intentional recovery counters/error state did not settle')
                page.evaluate('__atlasLifecycleProbe.forced=null;__atlasLifecycleProbe.environmentBindings=[];'
                              '__atlasLifecycleProbe.groundBindings=[];'
                              'delete __atlasLifecycleProbe.oldEnvironment;delete __atlasLifecycleProbe.loseExtension')
                report['intentionalRecovery']['completed'] = True
                passed('One explicitly labelled context restoration rebuilt targets and rebound new materials', rebound)

            if not args.recovery_only:
                phase('startup-variant-warmup', 'return native cold entry to the original empty overview')
                visit('diorama')
                frames = page.evaluate('ATLAS.state.drawnFrames')
                page.evaluate('ATLAS.stream.trim(true);ATLAS.state.clock=12.5;ATLAS.wake()')
                wait('n => ATLAS.state.drawnFrames>n && !ATLAS.stream.pending', frames)
                page.evaluate('ATLAS.renderer.trim(true)')
                cleared = sample('native cold-variant startup cleared to overview')
                require(cleared['snapshot']['streaming']['sourceBytes'] == 0 and
                        not cleared['extra']['cacheIds'] and not cleared['extra']['packIds'] and
                        cleared['extra']['detailRecords'] == 0 and cleared['extra']['backdoor']['targets'] == 0 and
                        cleared['extra']['quality'] == 'balanced' and cleared['extra']['rendererQuality'] == 'balanced' and
                        cleared['extra']['space'] == 'surface' and cleared['extra']['lighting'] == 'neutral' and
                        cleared['extra']['weather'] == 'clear' and not cleared['extra']['motion'] and
                        cleared['extra']['clock'] == 12.5,
                        'Cold shader warm-up did not restore the original empty startup overview profile')
                report['variantWarmup']['cleanup'] = cleared['snapshot']
                passed('Native cold window shader retained; startup detail and targets cleared',
                       report['variantWarmup'])
            sample('startup diagnostics available')
            if not args.recovery_only:
                shadow_round_trip('shrineFront', 'sun')
                shadow_round_trip('hellHall', 'hellKey')
                run_route('warmup')
                phase('warmup', 'comparable terminal baseline')
                reference = anchor('warmup: balanced/day/clear/trimmed overview')
                idle()
                report['warmupCompleteSeconds'] = round(time.monotonic() - began, 3)
                passed('Complete route warm-up established comparable resources', reference['snapshot'])
                stress_began = time.monotonic()
                while report['completedCycles'] < args.cycles or time.monotonic() - stress_began < args.soak_seconds:
                    number = report['completedCycles'] + 1
                    phase('cycle-' + str(number), 'obsolete Worker cancellation')
                    cancel_worker()
                    run_route('cycle-' + str(number))
                    current = anchor('cycle-' + str(number) + ': balanced/day/clear/trimmed overview')
                    compare(reference, current)
                    idle()
                    report['completedCycles'] = number
                    report['stressSeconds'] = round(time.monotonic() - stress_began, 3)
                    passed('Comparable cross-region lifecycle route ' + str(number), current['snapshot'])
                sample('ordinary stress completed without context events')
                require(not report['contextEvents'], 'Ordinary stress session had a context loss/restoration')
                report['ordinaryStressPassed'] = True
            recover_once()
            phase('final', 'integrity and error verification')
            final = sample('final lifecycle diagnostics')
            counters = report['lastDiagnostics']['counters']
            require(counters == {'contextLost': 1, 'contextRestored': 1, 'renderErrors': 0, 'recoveryErrors': 0},
                    'Final diagnostic counters contain unplanned events/errors')
            require(not final['extra']['contextLost'], 'Final context remains lost')
            for name, digest in release['inputs'].items():
                require(hashlib.sha256((ROOT / name).read_bytes()).hexdigest() == digest,
                        'Build input changed while the test was running: ' + name)
            require(hashlib.sha256((ROOT / 'dist' / release['artifact']).read_bytes()).hexdigest() == release['sha256'],
                    'Artifact changed during lifecycle verification')
            guard()
            passed('All ordinary events absent; only one intentional recovery pair; build inputs remain unchanged')
            report['passed'] = True
            save()
            browser.close()
    except Exception as exc:
        report['passed'] = False
        report['failure'] = repr(exc)
        report['traceback'] = traceback.format_exc()
        traceback.print_exc()
    finally:
        if server:
            server.shutdown()
            server.server_close()
        save()
    return 0 if report['passed'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
