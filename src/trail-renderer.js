/* Only permanent bridge-head visibility follows the matching rendered tile.
 * All materials, attributes, light/environment and resource ownership inherit.
 */
(function(G){'use strict';
const Base=G.DioramaRenderer;
class TrailRenderer extends Base{
 ensure(record,level){
  // Keep the original board seams nearby, including low's otherwise forced far
  // choice. The inherited distance threshold and hysteresis still select far.
  if(this.quality==='low'&&record.data.component==='trail-bridge'&&Number.isFinite(record.distance))level=super.levelFor(record,record.distance);
  return super.ensure(record,level);
 }
 wanted(record,rig,opts,distance){const m=record.data;if(m.component!==G.TRAIL_UPGRADE.contactId)return super.wanted(record,rig,opts,distance);
  const source=this.recordMap.get(m.terrainSource);if(!source||source.data.component!=='island-terrain')return false;
  if(!super.wanted(source,rig,opts,distance))return false;
  record.distance=G.length(G.sub(rig.eye,m.center));record.displayCenter=m.center;record.xf=record.identityTransform||(record.identityTransform=Object.freeze({scale:1,offset:Object.freeze([0,0,0])}));return G.visibleSphere(rig.planes,m.center,m.radius+6);
 }
}
G.DioramaRenderer=TrailRenderer;G.TRAIL_RENDERER={revision:1,Base,TrailRenderer};
})(globalThis.GA);
