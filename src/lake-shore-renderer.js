/* P: lake-shore planting follows its actual rendered terrain precision. */
(function(G){'use strict';
const Base=G.DioramaRenderer;
class LakeShoreRenderer extends Base{
 wanted(record,rig,opts,distance){
  if(record.data.component!=='lake-shore-understorey')return super.wanted(record,rig,opts,distance);
  if(!super.wanted(record,rig,opts,distance))return false;
  const source=this.recordMap.get(record.data.terrainSource);
  if(!source||source.data.component!=='island-terrain')
   throw Error('Lake shore requires its rendered terrain source: '+record.data.terrainSource);
  // Its stored wanted flag can belong to the previous frame. Preserve the
  // original source tile predicate, including near/far selection and culling.
  return super.wanted(source,rig,opts,distance);
 }
}
G.DioramaRenderer=LakeShoreRenderer;
})(globalThis.GA);
