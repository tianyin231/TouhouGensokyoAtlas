/* Native forest understorey and the bounded road repair follow the actual
 * rendered terrain precision, retaining their own readiness and bounds culling.
 */
(function(G){'use strict';
const Base=G.DioramaRenderer;
class ForestCanopyRenderer extends Base{
 wanted(record,rig,opts,distance){
  const m=record.data;
  const roadPatch=m.forestCanopyRoad===true&&m.forestCanopyRoadLod!=='base';
  if(m.component!=='forest-canopy-understorey'&&!roadPatch)return super.wanted(record,rig,opts,distance);
  if(!super.wanted(record,rig,opts,distance))return false;
  const source=this.recordMap.get(record.data.terrainSource);
  if(!source||source.data.component!=='island-terrain')
   throw Error('Forest canopy requires its rendered terrain source: '+m.terrainSource);
  // Query source selection now; its stored wanted flag may be from last frame.
  return super.wanted(source,rig,opts,distance);
 }
}
G.DioramaRenderer=ForestCanopyRenderer;
})(globalThis.GA);
