import datetime, hashlib, json, pathlib, subprocess, time

root=pathlib.Path('/workspace/genbu-entry-refinement')
ev=pathlib.Path('/workspace/genbu-entry-evidence')
script=ev/'check-independent-v2-source-02.mjs'
output=ev/'independent-v2-source-02-execution.json'
report=ev/'independent-v2-source-02.json'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert not output.exists() and not report.exists()
capture=json.loads((ev/'v2-capture/report.json').read_text())
names=list(capture['inputsBefore'])
before={p:sha(root/p) for p in names}
assert len(before)==209 and before==capture['inputsBefore']
assert before['src/genbu-entry.js']=='dd991fadfa7ef3339ec0afe26fa10e9dd6ddcc09fcd41536f3501e4e874d3544'
assert before['project.json']=='1e816ddf9d81b8508c210982170442b11f9eaab56b7558a5d0482fb62bec2148'
command=['/tmp/node-v22.23.3-linux-x64/bin/node',str(script)]
record={'schema':1,'command':command,'cwd':str(root),'startUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),
 'protocolSHA256':sha(script),'wrapperSHA256':sha(pathlib.Path(__file__)),'candidateCaptureReportSHA256':sha(ev/'v2-capture/report.json'),
 'candidateHTML':capture['artifactSHA256'],'releaseInputCount':len(before),'inputsBefore':before,
 'authorizedNativeGenerators':1,'authorizedApplyDetail':1,'outerBuildRegionWrapperInvocations':0,
 'actualCompleteProductionPrefix':True,'baselineBuilds':0,'GPUFrames':0,'fullNodeSuites':0,
 'concurrency':'Astra GPU stage may overlap; elapsed is not a comparative CPU or FPS measurement.'}
output.write_text(json.dumps(record,indent=2)+'\n')
start=time.monotonic()
with (ev/'independent-v2-source-02.stdout.log').open('x') as stdout, (ev/'independent-v2-source-02.stderr.log').open('x') as stderr:
    result=subprocess.run(command,cwd=root,stdout=stdout,stderr=stderr)
after={p:sha(root/p) for p in names}
record.update({'exitCode':result.returncode,'endUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),
 'elapsedWallSeconds':time.monotonic()-start,'inputsAfter':after,'inputsUnchanged':after==before,
 'protocolUnchanged':sha(script)==record['protocolSHA256'],
 'stdoutSHA256':sha(ev/'independent-v2-source-02.stdout.log'),'stderrSHA256':sha(ev/'independent-v2-source-02.stderr.log')})
if report.exists():record['reportSHA256']=sha(report)
output.write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps({k:record[k] for k in ['exitCode','startUTC','endUTC','elapsedWallSeconds','inputsUnchanged','protocolUnchanged']},indent=2))
raise SystemExit(result.returncode)
