"""Exercise the built atlas and actual Chromium audio decoding. No listening verdict."""
from pathlib import Path
import argparse
import asyncio
import json
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[2]


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', default='http://127.0.0.1:8788')
    parser.add_argument('--browser', default='/usr/bin/chromium')
    args = parser.parse_args()
    release = json.loads((ROOT / 'dist/release.json').read_text())
    errors = []
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(executable_path=args.browser, headless=True,
            args=['--no-sandbox', '--enable-unsafe-swiftshader'])
        page = await browser.new_page(viewport={'width': 1440, 'height': 1000})
        # Keep the atlas's existing test pause enabled: this is an audio integration test,
        # not a software-GPU frame-rate test. Native Web Audio and actual UI handlers run.
        await page.add_init_script('globalThis.ATLAS_TEST_PAUSE=true')
        page.on('pageerror', lambda error: errors.append(str(error)))
        await page.goto(args.url + '/' + release['artifact'] + '#view=shrineDiorama', wait_until='domcontentloaded')
        await page.wait_for_function('globalThis.ATLAS?.state.ready && globalThis.ATLAS_MUSIC', timeout=90000)
        print('Atlas ready; map frame loop paused, native audio enabled', flush=True)
        assert await page.evaluate('ATLAS_MUSIC.info().contextState') == 'none'
        assert not await page.evaluate('ATLAS_MUSIC.enabled')
        await page.locator('#btn-settings').click()
        await page.locator('#music-toggle').click()

        async def cue(expected):
            await page.wait_for_function('(id)=>ATLAS_MUSIC.current===id && ATLAS_MUSIC.status==="playing"', arg=expected, timeout=30000)
            assert await page.evaluate('ATLAS_MUSIC.context.state') == 'running'
            print('Playing', expected, flush=True)

        await cue('hakurei-dusk')
        # Verify actual output energy through the native Web Audio graph, not just player state.
        energy = await page.evaluate('''async()=>{
          const a=ATLAS_MUSIC.context.createAnalyser();a.fftSize=2048;ATLAS_MUSIC.filter.connect(a);
          await new Promise(r=>setTimeout(r,2200));const d=new Float32Array(a.fftSize);a.getFloatTimeDomainData(d);
          a.disconnect();ATLAS_MUSIC.filter.disconnect(a);return Math.sqrt(d.reduce((s,x)=>s+x*x,0)/d.length);
        }''')
        assert energy > 0.00001, energy
        await page.locator('#light-night').click()
        await cue('hakurei-night')
        await page.locator('[data-weather="rain"]').click()
        await page.wait_for_timeout(900)
        assert await page.evaluate('ATLAS_MUSIC.filter.frequency.value') < 11000
        await page.locator('#music-volume').press('Home')
        for _ in range(31):
            await page.locator('#music-volume').press('ArrowRight')
        assert abs(await page.evaluate('ATLAS_MUSIC.volume') - .31) < 1e-9
        transitions = [('alice', 'forest-dolls'), ('bamboo', 'bamboo-moon'),
                       ('scarlet', 'scarlet-evening'), ('moriya', 'mountain-stream'),
                       ('sunflowerStage', 'flower-concert'), ('netherOverview', 'nether-sakura'),
                       ('saigyouBuds', 'nether-bloom'), ('hellOverview', 'hell-lullaby')]
        seen = ['hakurei-dusk', 'hakurei-night']
        for view, expected in transitions:
            assert await page.evaluate('(v)=>!!GA.PRESETS[v]', view), view
            await page.evaluate('(v)=>ATLAS.setView(v,false)', view)
            await cue(expected)
            assert await page.evaluate('ATLAS_MUSIC.cache.size') <= 2
            seen.append(expected)
        # An unscored independent world must not inherit the previous region's theme.
        await page.evaluate('ATLAS.setView("moonOverview",false)')
        await page.wait_for_function('ATLAS_MUSIC.status==="unscored" && !ATLAS_MUSIC.current')
        await page.wait_for_timeout(2000)
        assert await page.evaluate('ATLAS_MUSIC.voices.size') == 0
        await page.evaluate('ATLAS.setView("shrineDiorama",false)')
        await cue('hakurei-night')
        # Exercise the visibility handler against the native context (not a claim about browser background policy).
        await page.evaluate('ATLAS_MUSIC.visibility(true)')
        assert await page.evaluate('ATLAS_MUSIC.context.state') == 'suspended'
        await page.evaluate('ATLAS_MUSIC.visibility(false)')
        await cue('hakurei-night')
        await page.locator('#music-toggle').click()
        await page.wait_for_function('ATLAS_MUSIC.context.state==="suspended"')
        assert await page.evaluate('ATLAS_MUSIC.voices.size') == 0
        decoded = await page.evaluate('''async()=>{
          const out=[],ctx=new OfflineAudioContext(2,44100,44100);
          for(const cue of ATLAS_MUSIC_DATA.cues){
            const b=await ctx.decodeAudioData(Uint8Array.from(atob(cue.audio),c=>c.charCodeAt(0)).buffer);
            const n=Math.round(cue.seconds*b.sampleRate);let boundary=0,peak=0;
            for(let c=0;c<b.numberOfChannels;c++){const x=b.getChannelData(c);
              boundary=Math.max(boundary,Math.abs(x[0]-x[n-1]));
              for(let i=0;i<x.length;i++)peak=Math.max(peak,Math.abs(x[i]));}
            // Render across an actual looping BufferSource boundary.
            const loop=new OfflineAudioContext(2,44100,44100),s=loop.createBufferSource();
            s.buffer=b;s.loop=true;s.loopEnd=cue.seconds;s.connect(loop.destination);s.start(0,cue.seconds-.25);
            const rendered=await loop.startRendering(),x=rendered.getChannelData(0);
            out.push({id:cue.id,duration:b.duration,expected:cue.seconds,peak,boundaryStep:boundary,
              scheduledJoinStep:Math.abs(x[11025]-x[11024])});
          }return out;
        }''')
        for result in decoded:
            assert abs(result['duration'] - result['expected']) < .025, result
            assert .001 < result['peak'] < .95, result
            assert result['boundaryStep'] < .01, result
            assert result['scheduledJoinStep'] < .01, result
        assert not errors, errors
        report = dict(browser=browser.version, artifactSha256=release['sha256'],
                      defaultOff=True, mapFrameLoopPaused=True, outputGraphRms=energy, sceneCuesTested=seen,
                      unscoredStops=True, disableReleasesVoices=True, decodedCacheLimit=2,
                      nativeContextSuspendResume=True, decoded=decoded, runtimeErrors=errors,
                      listeningStatus='Human listening pending; decoding and output energy are not audition')
        (ROOT / 'dist/music-browser-check.json').write_text(json.dumps(report, indent=2) + '\n')
        print(json.dumps(report, indent=2))
        await browser.close()


asyncio.run(main())
