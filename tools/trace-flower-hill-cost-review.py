"""Bounded Reverse submission trace; no screenshots, new native source build,
or product edits. Replays the frozen capture protocol through Reverse only.
"""
import hashlib
from pathlib import Path

PARENT = Path('/workspace/flower-hill-evidence/capture-views.py')
PARENT_SHA = '5f2f4171c07fd2be5e38967a6f41a3948c51ba2d408c532548efb8f1b431e221'
SPEC_SHA = '626215c470b84fd629153eb6df1c03d9a847d9798bfa2dff70edd8b0fe1a68d6'

INSTALL_TRACE_JS = r"""() => {
 const A=ATLAS,R=A.renderer,E=R.engine;
 const sphere=s=>s?{center:s.center.toArray(),radius:s.radius}:null;
 const records=new Map(R.records.filter(r=>r.item).map(r=>[r.item.mesh,r]));
 const trace=globalThis.__reverseTrace={frames:[],frame:null,source:[]};
 const describe=o=>{
  const r=records.get(o)||R.recordMap.get(o.name),m=r?.data,g=o.geometry;
  return {id:m?.id||o.name||null,pack:r?.pack||null,level:r?.level??null,
   group:m?.group||null,material:m?.material||null,flowerKind:m?.flowerKind||null,
   center:m?.center?.slice()||null,metadataRadius:m?.radius??null,distance:r?.distance??null,
   wanted:r?!!r.wanted:null,meshUUID:o.uuid,geometryID:g?.id??null,
   indexCount:g?.index?.count??null,vertexCount:g?.getAttribute('position')?.count??null,
   instanceCount:o.isInstancedMesh?o.count:1,drawRange:g?{start:g.drawRange.start,
    count:Number.isFinite(g.drawRange.count)?g.drawRange.count:null,
    unbounded:!Number.isFinite(g.drawRange.count)}:null,
   cachedObjectSphere:sphere(o.boundingSphere),geometrySphere:sphere(g?.boundingSphere),
   matrixWorld:o.matrixWorld?.toArray()||null};
 };
 const wrapped=new WeakSet(),wrap=mesh=>{
  if(!mesh.isMesh||wrapped.has(mesh))return;wrapped.add(mesh);
  const old=mesh.onBeforeRender;
  mesh.onBeforeRender=function(renderer,scene,camera,geometry,material,group){
   if(trace.frame)trace.frame.onBeforeRender.push({...describe(this),cameraUUID:camera.uuid,
    cameraType:camera.type,materialID:material.id,geometryGroup:group?{...group}:null});
   return old.apply(this,arguments);
  };
 };
 for(const [mesh] of records)wrap(mesh);
 const render=E.render;
 E.render=function(scene,camera){scene.traverse(wrap);return render.apply(this,arguments);};
 const direct=E.renderBufferDirect;
 E.renderBufferDirect=function(camera,scene,geometry,material,object,group){
  const old={calls:E.info.render.calls,triangles:E.info.render.triangles,
   points:E.info.render.points,lines:E.info.render.lines};
  const result=direct.apply(this,arguments);
  if(trace.frame){
   const delta={calls:E.info.render.calls-old.calls,triangles:E.info.render.triangles-old.triangles,
    points:E.info.render.points-old.points,lines:E.info.render.lines-old.lines};
   trace.frame.direct.push({...describe(object),sceneRole:scene===R.scene?'main':scene===R.postScene?'post':'other',
    cameraUUID:camera.uuid,cameraType:camera.type,
    materialID:material.id,geometryGroup:group?{...group}:null,delta});
  }
  return result;
 };
 return {records:records.size,renderBufferDirectWrapped:true,onBeforeRenderWrapped:true};
}"""

INVENTORY_JS = r"""async () => {
 const R=ATLAS.renderer,T=R.T,limit=2048,records=R.records.filter(r=>r.wanted&&r.item?.mesh.visible);
 if(records.length>limit)throw Error('Bounded Reverse inventory overflow');
 const sphere=s=>s?{center:s.center.toArray(),radius:s.radius}:null;
 const sha=async a=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',
  new Uint8Array(a.buffer,a.byteOffset,a.byteLength)))).map(x=>x.toString(16).padStart(2,'0')).join('');
 const arrayCache=new Map(),arrayInfo=async a=>{
  if(!arrayCache.has(a))arrayCache.set(a,{type:a.constructor.name,length:a.length,bytes:a.byteLength,sha256:await sha(a)});
  return arrayCache.get(a);
 };
 const inventory=[];
 for(const r of records){
  const m=r.data,o=r.item.mesh,g=o.geometry,metadata={},arrays={};
  for(const [k,v] of Object.entries(m)){
   if(ArrayBuffer.isView(v)){arrays[k]=await arrayInfo(v);continue;}
   if(k!=='vertices'&&k!=='farVertices')metadata[k]=v;
  }
  let fresh=null,complete=null;
  // Read the selected geometry sphere and instance matrices without changing
  // the production object's cached sphere, geometry or instance arrays.
  if(o.isInstancedMesh&&g.boundingSphere&&o.count<=20000){
   const total=new T.Sphere(),part=new T.Sphere(),matrix=new T.Matrix4();
   total.makeEmpty();
   for(let i=0;i<o.count;i++){o.getMatrixAt(i,matrix);part.copy(g.boundingSphere).applyMatrix4(matrix);total.union(part);}
   fresh=sphere(total);complete=true;
  }else if(o.isInstancedMesh)complete=false;
  inventory.push({id:m.id,pack:r.pack,level:r.level,distance:r.distance,metadata,arrays,
   meshUUID:o.uuid,geometryID:g.id,instanceCount:o.isInstancedMesh?o.count:1,
   cachedObjectSphere:sphere(o.boundingSphere),geometrySphere:sphere(g.boundingSphere),
   freshSelectedObjectSphere:fresh,freshSphereComplete:complete,matrixWorld:o.matrixWorld.toArray()});
 }
 return {limit,complete:records.length<=limit,count:records.length,entries:inventory,
  assertion:'Fresh sphere computation is diagnostic only; cached production spheres and product data were not modified.'};
}"""

source = PARENT.read_text()
assert hashlib.sha256(PARENT.read_bytes()).hexdigest() == PARENT_SHA, 'Frozen parent protocol changed'


def replace_once(old, new):
    global source
    assert source.count(old) == 1, f'Audited trace insertion no longer unique: {old[:80]}'
    source = source.replace(old, new)


replace_once("    parser.add_argument('--compare-to', type=Path)",
             "    parser.add_argument('--compare-to', type=Path)\n"
             "    parser.add_argument('--reference-report', type=Path, required=True)")
replace_once("    views = spec['views']",
             "    assert sha(args.spec) == SPEC_SHA, 'Frozen full camera spec changed'\n"
             "    full_views = spec['views']\n"
             "    reverse_index = next(i for i,v in enumerate(full_views) if v['name']=='flowerHillReverse')\n"
             "    views = full_views[:reverse_index+1]\n"
             "    reference = json.loads(args.reference_report.read_text())\n"
             "    assert reference['protocolSHA256']==PARENT_SHA and reference['specSHA256']==SPEC_SHA\n"
             "    assert args.compare_to is None, 'This diagnostic preserves the original cost failure separately'")
replace_once("        protocolSHA256=sha(Path(__file__)), frameHelperSHA256=sha(inherited),",
             "        protocolSHA256=sha(Path(__file__)), frameHelperSHA256=sha(inherited),\n"
             "        frozenParentProtocolSHA256=PARENT_SHA, referenceReportSHA256=sha(args.reference_report),\n"
             "        derivedExecutedSourceSHA256=DERIVED_SOURCE_SHA,\n"
             "        frozenParentProtocol=str(PARENT), referenceReport=str(args.reference_report),\n"
             "        traceHistory=[v['name'] for v in views], screenshotsTaken=False,\n"
             "        productBudgetRetested=False, nativeLifecycleRetested=False,")
replace_once("                    samples = [page.evaluate(frame_js) for _ in range(3)]",
             "                    if view['name']=='flowerHillReverse':\n"
             "                        report['traceSetup']=page.evaluate(INSTALL_TRACE_JS)\n"
             "                        wrapped='() => {const t=__reverseTrace; t.frame={onBeforeRender:[],direct:[]}; const sample=('+frame_js+')();t.frames.push(t.frame);t.frame=null;return sample;}'\n"
             "                        samples = [page.evaluate(wrapped) for _ in range(3)]\n"
             "                        report['actualDrawTrace']=page.evaluate('__reverseTrace.frames')\n"
             "                        report['wantedSourceInventory']=page.evaluate(INVENTORY_JS)\n"
             "                    else:\n"
             "                        samples = [page.evaluate(frame_js) for _ in range(3)]")
replace_once("                    png = out / (view['name'] + '.png')\n"
             "                    page.locator('#scene').screenshot(path=str(png), timeout=120000)\n"
             "                    report['frames'].append(dict(name=view['name'], samples=samples, file=png.name, pngSHA256=sha(png)))",
             "                    report['frames'].append(dict(name=view['name'], samples=samples, file=None, pngSHA256=None))\n"
             "                    expected=next(f for f in reference['frames'] if f['name']==view['name'])\n"
             "                    check('Exact original camera, wanted and submission history at '+view['name'],\n"
             "                        all(a[k]==b[k] for a,b in zip(samples,expected['samples']) for k in ('eye','target','fov','quality','rendererQuality','wanted'))\n"
             "                        and all(a['stats'][k]==b['stats'][k] for a,b in zip(samples,expected['samples']) for k in ('totalCalls','totalTriangles')),\n"
             "                        dict(reference=[{k:s['stats'][k] for k in ('totalCalls','totalTriangles')} for s in expected['samples']],\n"
             "                             actual=[{k:s['stats'][k] for k in ('totalCalls','totalTriangles')} for s in samples]))")
replace_once("                report['passed'] = True",
             "                for i,trace in enumerate(report['actualDrawTrace']):\n"
             "                    actual=report['frames'][-1]['samples'][i]['stats']\n"
             "                    totals={k:sum(v['delta'][k] for v in trace['direct']) for k in ('calls','triangles')}\n"
             "                    check('Exact engine submission totals in Reverse trace frame '+str(i),\n"
             "                        totals==dict(calls=actual['totalCalls'],triangles=actual['totalTriangles']),totals)\n"
             "                report['passed'] = True")

DERIVED_SOURCE_SHA = hashlib.sha256(source.encode()).hexdigest()
exec(compile(source, str(Path(__file__).resolve()), 'exec'), globals())
