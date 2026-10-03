# Foliage A/B checkpoint

This branch preserves two rejected candidates. Production builders/renderers stay at commit `1f09b002b29ef56e5262633152fe527e086eb0c2`; neither experiment is registered in `project.json`.

Read [the decision and comparisons](../docs/foliage-texture-evaluation.md). The snapshot paths retain the exact candidate scripts used for those captures, including the Kourindou v1.2 atlas and the forest v1 coverage option. The current capture tool includes later source-manifest diagnostics; each historical report records its original tool SHA separately.

Rebuild the unchanged baseline with `python tools/build.py`, then use Node 22 for `node tools/check.mjs`. Browser captures need Python Playwright, Pillow and a Chromium binary (default `/usr/bin/chromium`). One browser must run at a time.

```sh
python tools/check-foliage-texture-browser.py --dist dist --output /tmp/forest-original --family forest --specs forestOverview,alice,marisa
python tools/check-foliage-texture-browser.py --dist dist --output /tmp/forest-texture --family forest --specs forestOverview,alice,marisa --experiment-root experiments/foliage/forest-v1 --modes texture --compare-to /tmp/forest-original
python tools/check-foliage-texture-browser.py --dist dist --output /tmp/kour-original --specs sunny,near,farCanopy
python tools/check-foliage-texture-browser.py --dist dist --output /tmp/kour-texture --specs sunny,near,farCanopy --experiment-root experiments/foliage/kourindou-v1.2 --modes texture --compare-to /tmp/kour-original
```

A technical capture pass means the fixed conditions and absence of rendering errors were checked. Both candidates failed visual acceptance. No hardware FPS claim is made; the incomplete production timer run is not an accepted performance result. The house, boardwalk and village drafts are not part of this checkpoint.
