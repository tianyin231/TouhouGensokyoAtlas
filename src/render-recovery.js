/* Rebuild GPU-generated caches after an actual context restoration.
 * This recovers the view; it does not claim to prevent driver/context loss.
 */
(function(G){'use strict';const Base=G.DioramaRenderer;
class RecoveryRenderer extends Base{
 constructor(T,canvas,world){super(T,canvas,world);this.recovery={lost:0,restored:0,rebuilt:0,pending:false,lastError:null};this.recoveryDisposed=false;
  this.onAtlasContextLost=e=>{e.preventDefault();this.recovery.lost++;this.recovery.pending=false;};
  this.onAtlasContextRestored=()=>{this.recovery.restored++;this.recovery.pending=true;this.mirrorLast=null;this.engine.shadowMap.needsUpdate=true;
   // The normal renderer may be idle when a paused/static view is restored.
   if(globalThis.ATLAS?.renderer===this)globalThis.ATLAS.wake();
  };
  canvas.addEventListener('webglcontextlost',this.onAtlasContextLost);
  canvas.addEventListener('webglcontextrestored',this.onAtlasContextRestored);this.recoveryCanvas=canvas;
 }
 setQuality(q){
  const samples=q==='low'?0:2,target=this.sceneTarget;
  // At DPR=1, balanced -> low can keep identical dimensions. setSize() then
  // does nothing, so explicitly release old multisample framebuffer storage.
  if(target&&target.samples!==samples){this.engine.setRenderTarget(null);target.dispose();target.samples=samples;}
  super.setQuality(q);
 }
 rebuildContextCaches(){
  const old=this.studioEnv,texture=old?.texture;
  this.makeStudioEnvironment();
  for(const m of Object.values(this.mats))if(m.envMap===texture){m.envMap=this.studioEnv.texture;m.needsUpdate=true;}
  old?.dispose();
  // These four scene tableaux contain rendered pixels, not restorable CPU images.
  this.releaseWindowTargets?.();this.mirrorLast=null;this.lastRainAnchor=null;
  this.engine.shadowMap.needsUpdate=true;this.recovery.pending=false;this.recovery.rebuilt++;this.recovery.lastError=null;
 }
 render(rig,opts={}){
  if(this.contextLost||this.engine.getContext().isContextLost())return;
  if(this.recovery?.pending){try{this.rebuildContextCaches();}catch(e){this.recovery.lastError=e.message;console.error('Atlas context cache recovery failed:',e);return;}}
  super.render(rig,opts);
 }
 info(){const result=super.info();result.contextRecovery={...this.recovery};return result;}
 dispose(){this.recoveryDisposed=true;this.recoveryCanvas.removeEventListener('webglcontextlost',this.onAtlasContextLost);this.recoveryCanvas.removeEventListener('webglcontextrestored',this.onAtlasContextRestored);super.dispose();}
}
G.DioramaRenderer=RecoveryRenderer;
})(globalThis.GA);
