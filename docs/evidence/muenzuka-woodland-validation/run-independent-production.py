"""One 120-second, exact-input source check; no GPU or full Node regression."""
from pathlib import Path
import hashlib
import json
import subprocess
import time
from datetime import datetime, timezone

base = Path('/workspace/muenzuka-woodland-evidence')
repo = Path('/workspace/muenzuka-canopy-refinement')
checker = base/'check-production-source.mjs'
output = base/'independent-production-execution.json'
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
release = base/'v1-dist/release.json'
info = json.loads(release.read_text())
artifact = release.parent/info['artifact']
assert info['sha256'] == sha(artifact) == 'e2956858b9b588ee787ead21eec4cfd79ef63a5c0fbe6d472621a44823a92d45'
assert len(info['inputs']) == 210
assert not output.exists()
before = {p:sha(repo/p) for p in info['inputs']}
assert before == info['inputs']
record = {'schema':1, 'startedUTC':datetime.now(timezone.utc).isoformat(),
          'checker':str(checker), 'checkerSHA256':sha(checker), 'runnerSHA256':sha(Path(__file__)),
          'releaseSHA256':sha(release), 'artifactSHA256':sha(artifact), 'inputCount':210,
          'inputsBefore':before, 'timeoutSeconds':120,
          'cpuMayOverlapAuthorGPU':True, 'CPUorLoadSpeedComparison':False,
          'command':['/workspace/toolchains/node-v22.23.3-linux-x64/bin/node',str(checker)],
          'executionState':'running', 'exitCode':None}
output.write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'startedUTC':record['startedUTC'],'checkerSHA256':record['checkerSHA256'],
                  'timeoutSeconds':120,'execution':str(output)}),flush=True)
began = time.monotonic()
with (base/'independent-production.stdout.log').open('x') as out, (base/'independent-production.stderr.log').open('x') as err:
    try:
        child = subprocess.run(record['command'],cwd=repo,stdout=out,stderr=err,timeout=120)
        record['exitCode'] = child.returncode
        record['executionState'] = 'completed'
    except subprocess.TimeoutExpired:
        record['exitCode'] = 124
        record['executionState'] = 'timeout'
record['endedUTC'] = datetime.now(timezone.utc).isoformat()
record['elapsedSeconds'] = time.monotonic()-began
record['inputsAfter'] = {p:sha(repo/p) for p in info['inputs']}
record['inputsUnchanged'] = before == record['inputsAfter']
record['artifactUnchanged'] = record['artifactSHA256'] == sha(artifact)
record['releaseUnchanged'] = record['releaseSHA256'] == sha(release)
record['checkerUnchanged'] = record['checkerSHA256'] == sha(checker)
for key,name in [('stdoutSHA256','independent-production.stdout.log'),('stderrSHA256','independent-production.stderr.log')]:
    record[key] = sha(base/name)
report = base/'independent-production-source.json'
record['reportSHA256'] = sha(report) if report.exists() else None
record['passed'] = record['exitCode'] == 0 and all(record[k] for k in ['inputsUnchanged','artifactUnchanged','releaseUnchanged','checkerUnchanged'])
output.write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'execution':str(output),'exitCode':record['exitCode'],'passed':record['passed'],
                  'elapsedSeconds':record['elapsedSeconds'],'reportSHA256':record['reportSHA256']}),flush=True)
raise SystemExit(record['exitCode'] if not record['passed'] else 0)
