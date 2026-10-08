"""Check review-package bytes and actual offline HTML media playback, without audition claims."""
from pathlib import Path
import asyncio
import argparse
import hashlib
import json
import zipfile
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[2]


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', default='http://127.0.0.1:8788/music-listening.html')
    parser.add_argument('--browser', default='/usr/bin/chromium')
    args = parser.parse_args()
    catalog = json.loads((ROOT / 'music/catalog.json').read_text())
    archive = ROOT / 'dist/touhou-music-review.zip'
    with zipfile.ZipFile(archive) as package:
        assert package.testzip() is None
        for cue in catalog['cues']:
            assert hashlib.sha256(package.read(cue['file'])).hexdigest() == cue['sha256']
            assert package.read(cue['midi']).startswith(b'MThd')
            assert json.loads(package.read(cue['score']))['id'] == 'atlas-' + cue['id']
        files = len(package.namelist())
    errors = []
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(executable_path=args.browser, headless=True, args=['--no-sandbox'])
        page = await browser.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        # Managed Chromium blocks file: URLs. Use the allowed local HTTP service,
        # then disconnect networking before playing the embedded media.
        await page.goto(args.url)
        await page.context.set_offline(True)
        audios = page.locator('audio')
        assert await audios.count() == 10
        assert await page.evaluate('[...document.querySelectorAll("audio")].every(a=>a.paused&&a.loop)')
        await audios.nth(0).click(position={'x': 25, 'y': 27})
        await page.wait_for_function('document.querySelectorAll("audio")[0].currentTime>.5')
        await audios.nth(1).click(position={'x': 25, 'y': 27})
        await page.wait_for_function('document.querySelectorAll("audio")[1].currentTime>.5')
        assert await audios.nth(0).evaluate('(a)=>a.paused')
        assert not errors, errors
        await browser.close()
    report = dict(zipFiles=files, zipSha256=hashlib.sha256(archive.read_bytes()).hexdigest(),
                  cueHashesMatch=True, embeddedMediaPlaysWithNetworkDisabled=True, onlyOnePreviewPlays=True,
                  pageLoadedVia='Local HTTP; file URL launch untested because managed browser policy blocks it',
                  runtimeErrors=errors, listeningStatus='Human audition pending')
    (ROOT / 'dist/music-review-check.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))


asyncio.run(main())
