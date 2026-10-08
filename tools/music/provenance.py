"""Verify and record only the real instrument samples used by the final renders."""
from pathlib import Path
import hashlib
import json
import sys

ROOT = Path(__file__).resolve().parents[2]
studio = Path(sys.argv[1]).resolve()
library = json.loads((studio / 'public/library.json').read_text())
exports = {'hakurei-dusk': 'hakurei-v2'}
for cue in json.loads((ROOT / 'music/catalog.json').read_text())['cues']:
    name = cue['id']
    exports.setdefault(name, name + ('-v2' if name in {
        'forest-dolls', 'flower-concert', 'mountain-stream', 'nether-sakura', 'nether-bloom'
    } else ''))
used = {}
for cue, export in exports.items():
    report = json.loads((studio / 'exports' / export / 'report.json').read_text())
    assert not report['runtimeErrors'], cue
    for response in report['sampleResponses']:
        assert response['status'] == 200, response
        used.setdefault(response['url'], set()).add(cue)
instruments = []
found = set()
for instrument in library:
    samples = []
    for sample in instrument.get('samples', []):
        if sample['url'] not in used:
            continue
        local = studio / 'data' / sample['url'].lstrip('/')
        digest = hashlib.sha256(local.read_bytes()).hexdigest()
        assert digest == sample['sha256'], str(local)
        assert local.stat().st_size == sample['bytes'], str(local)
        samples.append({**sample, 'usedBy': sorted(used[sample['url']])})
        found.add(sample['url'])
    if samples:
        instruments.append({**{key: instrument[key] for key in
                            ['id', 'name', 'englishName', 'license', 'sourceUrl', 'licenseUrl']},
                            'samples': samples})
assert found == set(used), sorted(set(used) - found)
result = dict(engine='XSXB-Band', engineCommit='ff39f88e6c28fefa2f7b1bebe2eee41a00b761ee',
              recordingType='Recorded instrument samples; no live ensemble session commissioned',
              filesVerifiedBySha256=len(found), instruments=instruments)
(ROOT / 'music/sample-provenance.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(len(instruments), 'instruments;', len(found), 'sample files verified')
