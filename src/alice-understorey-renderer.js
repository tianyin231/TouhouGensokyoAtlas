/* P: Alice's public understorey follows its rendered terrain precision. */
(function(G){'use strict';
const Base=G.DioramaRenderer;
class AliceUnderstoreyRenderer extends Base{
 wanted(record,rig,opts,distance){
  if(record.data.component!=='alice-understorey')return super.wanted(record,rig,opts,distance);
  if(!super.wanted(record,rig,opts,distance))return false;
  const source=this.recordMap.get(record.data.terrainSource);
  if(!source||source.data.component!=='island-terrain')
   throw Error('Alice understorey requires its rendered terrain source: '+record.data.terrainSource);
  // The stored source.wanted flag can belong to the previous frame.
  return super.wanted(source,rig,opts,distance);
 }
}
G.DioramaRenderer=AliceUnderstoreyRenderer;
})(globalThis.GA);
