import datetime,hashlib,json,subprocess,time
from pathlib import Path
ROOT=Path('/workspace/muenzuka-woodland-integration'); EV=Path('/workspace/muenzuka-woodland-evidence')
OUT=EV/'integrated-regression-01.json'; LOG=EV/'integrated-regression-01.log'; DIST=ROOT/'dist'
assert not OUT.exists() and not LOG.exists(), 'Preserve original runs'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
release=json.loads((DIST/'release.json').read_text()); before={p:sha(ROOT/p) for p in release['inputs']}
assert before==release['inputs'] and len(before)==211
assert release['sha256']=='e2956858b9b588ee787ead21eec4cfd79ef63a5c0fbe6d472621a44823a92d45'
assert sha(DIST/release['artifact'])==release['sha256']
argv=['/workspace/toolchains/node-v22.23.3-linux-x64/bin/node','tools/check.mjs',str(DIST)]
d={'schema':1,'kind':'Actual complete integrated Muenzuka woodland Node regression','startedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'command':argv,'cwd':str(ROOT),'protocolSHA256':sha(Path(__file__)),'sourceHEAD':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'artifactSHA256':release['sha256'],'releaseSHA256':sha(DIST/'release.json'),'inputsBefore':before,'state':'running','exitCode':None,'hardwareFPSMeasured':False,'timingUse':'Traceability only. Independent browser lifecycle may overlap; no CPU or FPS improvement inferred.'}
OUT.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n'); start=time.monotonic()
with LOG.open('wb') as log:
 try:
  p=subprocess.run(argv,cwd=ROOT,stdout=log,stderr=subprocess.STDOUT,timeout=1800); code=p.returncode
 except subprocess.TimeoutExpired:
  code=124; d['timeoutSeconds']=1800
lines=LOG.read_text(errors='replace').splitlines()
d.update(endedUTC=datetime.datetime.now(datetime.timezone.utc).isoformat(),elapsedSeconds=time.monotonic()-start,exitCode=code,logSHA256=sha(LOG),passedGroups=[s.split('：',1)[0] for s in lines if '通过：' in s],inputsAfter={p:sha(ROOT/p) for p in before})
d['inputsUnchanged']=d['inputsAfter']==before
d['artifactUnchanged']=sha(DIST/release['artifact'])==d['artifactSHA256']
d['releaseUnchanged']=sha(DIST/'release.json')==d['releaseSHA256']
d['passed']=code==0 and d['inputsUnchanged'] and d['artifactUnchanged'] and d['releaseUnchanged']; d['state']='completed'
OUT.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:d[k] for k in ['passed','exitCode','elapsedSeconds','inputsUnchanged','artifactUnchanged','releaseUnchanged']},ensure_ascii=False)); print('passedGroups',len(d['passedGroups']))
raise SystemExit(0 if d['passed'] else code or 1)
