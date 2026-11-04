/* Submission-only forest pilot. Source records still own selection, LOD and meshes.
 * A/B: renderer.setForestBatchingEnabled(false); then request a normal frame.
 * Reflection uses the original meshes. Main/shadow membership is checked with
 * Three's real frustums before combining batches; no tree or material is rebuilt.
 */
(function(G){'use strict';
const Base=G.DioramaRenderer;
const nativeTree=/^forest:trees:-?\d+:-?\d+:[012]:(wood|leaf)$/;
const matrixBytes=19*Float32Array.BYTES_PER_ELEMENT;
const state=()=>({enabled:false,sourceDrawObjects:0,drawBuckets:0,mainDrawReduction:0,shadowDrawReduction:0,instances:0,bufferUpdates:0,attributeBytes:0,residentBuckets:0,prepareCPUms:0});

class ForestBatchRenderer extends Base{
 setForestBatchingEnabled(enabled){this.forestBatchingEnabled=!!enabled;if(!enabled)this.clearForestBatches();}
 ensure(record,level){
  const previous=record.item?.mesh.geometry,mesh=super.ensure(record,level);
  // InstancedMesh caches its own sphere independently of geometry. Refresh
  // native trees on LOD changes even when submission batching is disabled.
  if(previous&&previous!==mesh.geometry&&record.data.owner==='forest'&&nativeTree.test(record.data.id)&&mesh.isInstancedMesh)mesh.computeBoundingSphere();
  return mesh;
 }

 releaseForestBucket(bucket){
  this.scene.remove(bucket.mesh);bucket.mesh.dispose();this.release(bucket.array);
  this.residentBytes-=bucket.bytes;
  const index=this.objects.indexOf(bucket.item);if(index>=0)this.objects.splice(index,1);
 }
 clearForestBatches(){
  if(this.forestDrawBuckets){for(const bucket of this.forestDrawBuckets.values())this.releaseForestBucket(bucket);this.forestDrawBuckets.clear();}
  this.forestBatchingStats=state();
 }
 createForestBucket(key,group,count){
  const T=this.T,source=group.records[0],original=source.item.mesh,capacity=2**Math.ceil(Math.log2(Math.max(16,count)));
  const array=source.array,geometry=this.acquire(array);let mesh;
  try{
   mesh=new T.InstancedMesh(geometry,original.material,capacity);
   mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
   mesh.instanceColor=new T.InstancedBufferAttribute(new Float32Array(capacity*3),3).setUsage(T.DynamicDrawUsage);
   mesh.name='forest:draw-bucket:'+key;mesh.visible=false;
   // Each member passed the exact main and shadow tests. A larger aggregate
   // sphere must not silently submit members rejected by either source test.
   mesh.frustumCulled=false;mesh.castShadow=group.shadow;mesh.receiveShadow=original.receiveShadow;
   mesh.layers.mask=original.layers.mask;mesh.renderOrder=original.renderOrder;
   mesh.customDepthMaterial=original.customDepthMaterial;
   this.scene.add(mesh);
  }catch(error){if(mesh){this.scene.remove(mesh);mesh.dispose();}this.release(array);throw error;}
  const item={mesh,geos:[geometry],data:{id:mesh.name,owner:'forest',group:'vegetation',forestDrawBucket:true}};
  const bucket={mesh,item,array,capacity,bytes:capacity*matrixBytes,members:[]};
  this.objects.push(item);this.residentBytes+=bucket.bytes;this.uploads++;
  return bucket;
 }

 beforeSceneSubmit(camera,opts){
  const prior=super.beforeSceneSubmit?.(camera,opts),start=performance.now(),report=state();
  const enabled=this.forestBatchingEnabled!==false&&opts.forestBatching!==false&&(opts.space||'surface')==='surface'&&this.packs.has('forest');
  if(!enabled){this.clearForestBatches();return prior;}
  report.enabled=true;
  const T=this.T;
  this.forestBatchFrustum??=new T.Frustum();this.forestBatchProjection??=new T.Matrix4();this.forestBatchIdentity??=new T.Matrix4();
  const frustum=this.forestBatchFrustum.setFromProjectionMatrix(this.forestBatchProjection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse),camera.coordinateSystem,camera.reversedDepth);
  const shadows=this.engine.shadowMap.enabled&&this.sun.visible&&this.sun.castShadow&&this.sun.layers.test(camera.layers);
  // This pilot supports the existing single directional surface shadow. Other
  // shadow setups keep their source draws instead of approximating membership.
  let otherShadow=false;
  if(this.engine.shadowMap.enabled)this.scene.traverseVisible(o=>{if(o.isLight&&o.castShadow&&o!==this.sun&&o.layers.test(camera.layers))otherShadow=true;});
  if(otherShadow||shadows&&(!this.sun.isDirectionalLight||this.engine.shadowMap.type===T.VSMShadowMap)){
   this.clearForestBatches();this.forestBatchingStats={...report,reason:'unsupported shadow setup'};return prior;
  }
  let shadowFrustum;
  if(shadows){this.sun.updateWorldMatrix(true,false);this.sun.target.updateWorldMatrix(true,false);this.sun.shadow.updateMatrices(this.sun);shadowFrustum=this.sun.shadow.getFrustum();}
  this.scene.updateWorldMatrix(true,false);
  const groups=new Map();
  for(const record of this.records){
   const data=record.data,mesh=record.item?.mesh;
   if(!record.wanted||data.owner!=='forest'||!nativeTree.test(data.id)||!mesh?.visible||!mesh.isInstancedMesh)continue;
   if(Array.isArray(mesh.material)||!mesh.material.visible||mesh.material.transparent||!mesh.layers.test(camera.layers))continue;
   mesh.updateMatrixWorld();
   // World-space source matrices carry both planting and wind phase. Do not
   // rebase them or absorb a later renderer's display transform into instances.
   if(!mesh.matrixWorld.equals(this.forestBatchIdentity)||mesh.geometry!==this.geometryRefs.get(record.array)?.geo)continue;
   if(mesh.frustumCulled&&!frustum.intersectsObject(mesh))continue;
   const shadow=!!(shadows&&mesh.castShadow&&(!mesh.frustumCulled||shadowFrustum.intersectsObject(mesh)));
   const key=[mesh.geometry.id,mesh.material.id,record.level,shadow?1:0,mesh.receiveShadow?1:0,mesh.layers.mask,mesh.renderOrder,mesh.customDepthMaterial?.id??''].join(':');
   let group=groups.get(key);if(!group){group={shadow,records:[],count:0};groups.set(key,group);}
   group.records.push(record);group.count+=mesh.count;report.sourceDrawObjects++;
  }
  this.forestDrawBuckets??=new Map();
  const hidden=[],active=[];
  const restore=()=>{for(const mesh of hidden)mesh.visible=true;for(const bucket of active)bucket.mesh.visible=false;prior?.();};
  try{
   for(const [key,group]of groups){
    if(group.records.length<2)continue; // A singleton has no draw-call benefit.
    let bucket=this.forestDrawBuckets.get(key);
    if(bucket&&bucket.capacity<group.count){this.releaseForestBucket(bucket);this.forestDrawBuckets.delete(key);bucket=null;}
    if(!bucket){bucket=this.createForestBucket(key,group,group.count);this.forestDrawBuckets.set(key,bucket);}
    const changed=bucket.members.length!==group.records.length||group.records.some((record,i)=>{
     const old=bucket.members[i],mesh=record.item.mesh;
     return !old||old.record!==record||old.matrix!==mesh.instanceMatrix||old.color!==mesh.instanceColor||old.matrixVersion!==mesh.instanceMatrix.version||old.colorVersion!==mesh.instanceColor.version||old.count!==mesh.count;
    });
    if(changed){
     let offset=0;bucket.members=[];
     for(const record of group.records){
      const mesh=record.item.mesh,count=mesh.count;
      bucket.mesh.instanceMatrix.array.set(mesh.instanceMatrix.array.subarray(0,count*16),offset*16);
      bucket.mesh.instanceColor.array.set(mesh.instanceColor.array.subarray(0,count*3),offset*3);
      bucket.members.push({record,matrix:mesh.instanceMatrix,color:mesh.instanceColor,matrixVersion:mesh.instanceMatrix.version,colorVersion:mesh.instanceColor.version,count});offset+=count;
     }
     bucket.mesh.count=offset;bucket.mesh.instanceMatrix.needsUpdate=true;bucket.mesh.instanceColor.needsUpdate=true;
     bucket.mesh.computeBoundingSphere();report.bufferUpdates++;
    }
    bucket.mesh.visible=true;active.push(bucket);
    for(const record of group.records){const mesh=record.item.mesh;hidden.push(mesh);mesh.visible=false;}
    report.drawBuckets++;report.instances+=group.count;report.mainDrawReduction+=group.records.length-1;
    if(group.shadow)report.shadowDrawReduction+=group.records.length-1;
   }
   // Empty/obsolete keys cannot pin old LOD geometry after a camera or pack change.
   const keys=new Set(active);for(const [key,bucket]of this.forestDrawBuckets)if(!keys.has(bucket)){this.releaseForestBucket(bucket);this.forestDrawBuckets.delete(key);}
  }catch(error){restore();this.clearForestBatches();throw error;}
  report.attributeBytes=[...this.forestDrawBuckets.values()].reduce((sum,bucket)=>sum+bucket.bytes,0);
  report.residentBuckets=this.forestDrawBuckets.size;report.prepareCPUms=performance.now()-start;this.forestBatchingStats=report;
  return restore;
 }
 dropPack(id){if(id==='forest')this.clearForestBatches();return super.dropPack(id);}
 trim(force=false){if(force)this.clearForestBatches();return super.trim(force);}
 info(){const result=super.info();result.forestBatching={...(this.forestBatchingStats||state())};return result;}
 dispose(){this.clearForestBatches();super.dispose();}
}
G.DioramaRenderer=ForestBatchRenderer;
})(globalThis.GA);
