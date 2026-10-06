"""Run one already reviewed fixed lifecycle session and preserve its raw CLI."""
import argparse
import hashlib
import json
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

D = Path(__file__).resolve().parent
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
utc = lambda: datetime.now(timezone.utc).isoformat()
p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--variant', choices=['baseline', 'candidate'], required=True)
args = p.parse_args()
spec = json.loads((D/'native-lifecycle-spec.json').read_text())
profile = spec['profiles'][args.variant]
repo, dist, out = map(Path, (profile['repo'], profile['dist'], profile['output']))
out.mkdir(exist_ok=True)
assert not any((out/n).exists() for n in ['report.json', 'execution.json', 'stdout.log', 'stderr.log']), 'Never overwrite a run'
release = json.loads((dist/'release.json').read_text())
bound = [repo/n for n in release['inputs']]
bound += [dist/release['artifact'], dist/'release.json', Path(__file__)]
bound += [D/n for n in ['check-native-woodland.py', 'native-lifecycle-spec.json', 'woodland-native-source-probe.js', 'resident-source-inventory.js', 'lod-route-observer.js']]
before = {str(p):sha(p) for p in bound}
assert {n:sha(repo/n) for n in release['inputs']} == release['inputs']
assert sha(dist/'release.json') == profile['releaseSHA256']
cmd = [sys.executable, str(D/'check-native-woodland.py'), '--variant', args.variant, '--repo', str(repo), '--dist', str(dist), '--output', str(out)]
record = dict(kind='One fixed actual native lifecycle invocation', variant=args.variant, startedUTC=utc(), argv=cmd,
              inputs=release['inputs'], filesBefore=before, cpuOverlap=spec['cpuOverlap'], wrapperSHA256=sha(__file__), complete=False)
def save(): (out/'execution.json').write_text(json.dumps(record, ensure_ascii=False, indent=2)+'\n')
save(); print(json.dumps({'startedUTC':record['startedUTC'],'variant':args.variant,'execution':str(out/'execution.json')}, ensure_ascii=False), flush=True)
start = time.monotonic()
with (out/'stdout.log').open('w') as stdout, (out/'stderr.log').open('w') as stderr:
    try:
        r = subprocess.run(cmd, cwd=repo, stdin=subprocess.DEVNULL, stdout=stdout, stderr=stderr, timeout=900)
        code = r.returncode
    except subprocess.TimeoutExpired:
        code = 124; record['timeoutSeconds'] = 900
record.update(endedUTC=utc(), elapsedSeconds=time.monotonic()-start, cliExitCode=code, complete=True)
record['filesAfter']={str(p):sha(p) for p in bound}
record['filesUnchanged']=record['filesAfter']==before
record['stdoutSHA256']=sha(out/'stdout.log');record['stderrSHA256']=sha(out/'stderr.log')
if (out/'report.json').exists(): record['reportSHA256']=sha(out/'report.json')
save(); print(json.dumps({k:record[k] for k in ['variant','endedUTC','elapsedSeconds','cliExitCode','filesUnchanged']},ensure_ascii=False),flush=True)
sys.exit(code if code else (0 if record['filesUnchanged'] else 1))
