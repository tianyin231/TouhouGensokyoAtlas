from pathlib import Path
import json, hashlib, difflib, py_compile
BASE=Path('/workspace/muenzuka-woodland-evidence')
old=BASE/'capture-paired-views.py'; new=BASE/'capture-view-B.py'
assert not new.exists()
s=old.read_text()
assert hashlib.sha256(old.read_bytes()).hexdigest()=='fceec6e201633ea69a1da0cbe02371913a6c586b09d16f2990c503e7f77fc5e8'
def change(a,b):
 global s
 assert a in s,a[:100]
 s=s.replace(a,b)
change('New Muenzuka woodland views: overview warm-up, south-east, north reverse.','Muenzuka woodland cold overview, low south-east and night north reverse.')
change("'purpose':'Newly selected paired woodland views; no historical near-image reuse'","'purpose':'Cold, low and night woodland views; fresh paired current artifacts'")
change("'sessionOrder':['muenzukaOverview','southEast','northReverse']","'sessionOrder':['cold','low','night']")
change("'warmupSamples':[], ","'coldBeforeNative':True, ")
change("r.pack==='muenzuka'&&targets.includes(r.data.id)","targets.includes(r.data.id)")
change("draws.push({id:r.data.id,level:r.level,instances:r.data.instances.length/16})","draws.push({id:r.data.id,pack:r.pack,level:r.level,instances:r.data.instances.length/16,vertexTriangles:r.data.vertices.length/27})")
change("map(r=>({id:r.data.id,level:r.level,wanted:r.wanted,","map(r=>({id:r.data.id,pack:r.pack,level:r.level,wanted:r.wanted,")
change("assert sample['quality'] == sample['rendererQuality'] == 'balanced'","assert sample['quality'] == sample['rendererQuality'] == pose['quality']")
change("sample['lighting'] == 'neutral'","sample['lighting'] == pose['lighting']")
change("    assert 'muenzuka' in sample['visibleNativePacks'] and sample['focus'] == 'muenzuka'\n    assert sample['displayMode'] == 'focus' and not sample['detailNeighbors']","    assert not sample['detailNeighbors']\n    if pose['native']:\n        assert 'muenzuka' in sample['visibleNativePacks'] and sample['focus'] == 'muenzuka' and sample['displayMode'] == 'focus'\n    else:\n        assert not sample['visibleNativePacks'] and not sample['stream']['cached'] and not sample['stream']['building']\n        assert sample['displayMode'] == 'atlas' and sample['focus'] is None")
change("              ATLAS.setView('muenzukaOverview',false);ATLAS.state.detailNeighbors=[];ATLAS.stream.focus(['muenzuka']);ATLAS.renderOnce();}","              ATLAS.state.detailNeighbors=[];}")
change('            page.wait_for_function("!ATLAS.stream.pending&&ATLAS.stream.cache.has(\'muenzuka\')",polling=250,timeout=180000)\n','')
start=s.index('            set_pose = ');end=s.index("            report['browser']",start)
s=s[:start]+'''            set_pose = """p=>{const A=ATLAS,q=document.querySelector('#quality');q.value=p.quality;q.dispatchEvent(new Event('change',{bubbles:true}));
              Object.assign(A.state,{motion:false,clock:12.5,labels:false,characters:false,weather:'clear',lighting:p.lighting,
               ao:true,bloom:false,reflections:false,uiHidden:true});A.rig.setView(p,false);A.rig.fov=49;A.rig.updateMatrices();}"""
'''+s[end:]
start=s.index("            report['warmupSamples'] = ");end=s.index("            report['contextEvents']",start)
s=s[:start]+'''            targets = spec['targetIDs'] + spec['coldTargetIDs']
            for view in spec['views']:
                if view['native']:
                    page.evaluate("()=>{ATLAS.setView('muenzukaOverview',false);ATLAS.state.detailNeighbors=[];ATLAS.stream.focus(['muenzuka']);}")
                    page.wait_for_function("!ATLAS.stream.pending&&ATLAS.stream.cache.has('muenzuka')",polling=250,timeout=180000)
                else:
                    assert not page.evaluate('ATLAS.stream.cache.size||ATLAS.stream.pending'), 'Cold before any native region'
                    page.evaluate("()=>{ATLAS.setView('diorama',false);ATLAS.state.detailNeighbors=[];ATLAS.stream.focus([]);}")
                page.evaluate(set_pose,view)
                samples = [page.evaluate(sample_js,targets) for _ in range(3)]
                final = samples[-1]
                verify(final,view)
                assert stable(samples), 'Original steady capture cost assertion'
                if view['native']:
                    rows=[r for r in final['targetLevels'] if r['id'] in spec['targetIDs']]
                    draws=[r for r in final['actualTargetDraws'] if r['id'] in spec['targetIDs']]
                    assert len(rows)==10 and sum(r['instances'] for r in rows)==37
                    assert draws, 'Requested native target actually submitted'
                    if view['id']=='low':
                        assert all(r['level']==1 for r in draws), 'Low uses actual far geometry'
                    else:
                        assert any(r['level']==0 for r in draws), 'Night actually submits newly upgraded near crowns'
                else:
                    draws={r['id']:r for r in final['actualTargetDraws'] if r['id'] in spec['coldTargetIDs']}
                    assert set(draws)==set(spec['coldTargetIDs']) and sum(r['instances'] for r in draws.values())==21
                    assert all(r['vertexTriangles']==(180 if args.variant=='candidate' else 216) for r in draws.values())
                png=OUT/(view['id']+'.png')
                page.locator('#scene').screenshot(path=str(png),timeout=120000)
                report['views'].append({'spec':view,'samples':samples,'final':final,'pngSHA256':sha(png),'lastTwoCostsStable':True})
                print(json.dumps({'view':view['id'],'png':str(png),'stats':final['stats'],'memory':final['memory'],
                  'attributeBytes':final['residentAttributeBytes'],'actualTargetDraws':final['actualTargetDraws']},ensure_ascii=False),flush=True)
'''+s[end:]
new.write_text(s)
spec=json.loads((BASE/'paired-views-spec.json').read_text())
spec['firstSelection']=True;spec['settings']['captureOrder']=['cold','low','night'];spec['settings']['quality']='per-view';spec['settings']['lighting']='per-view'
spec['coldTargetIDs']=['overview016:muenzuka|forestLeaf|vegetation|I7','overview016:muenzuka|forestLeaf|vegetation|I9']
spec['views']=[dict(spec['warmupPose'],id='cold',native=False,quality='balanced',lighting='neutral'),dict(spec['views'][0],id='low',native=True,quality='low',lighting='neutral'),dict(spec['views'][1],id='night',native=True,quality='balanced',lighting='night')]
spec.pop('warmupPose');spec['stageAProtocolSHA256']=hashlib.sha256(old.read_bytes()).hexdigest();spec['oldBFlow']='Cold atlas with zero native cache, then low native, then near native night. Current artifacts and newly selected cameras require fresh paired captures.'
(BASE/'view-spec-B.json').write_text(json.dumps(spec,indent=2)+'\n')
(BASE/'view-B-protocol.diff').write_text(''.join(difflib.unified_diff(old.read_text().splitlines(True),s.splitlines(True),fromfile=str(old),tofile=str(new))))
py_compile.compile(str(new),doraise=True)
print(json.dumps({'protocol':str(new),'sha256':hashlib.sha256(new.read_bytes()).hexdigest(),'specSHA256':hashlib.sha256((BASE/'view-spec-B.json').read_bytes()).hexdigest(),'executed':False}))
