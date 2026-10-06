/* Complete near/far/wind bounds for the remaining original Muenzuka crowns.
 * Reuse the accepted local envelope implementation and its weak caches.
 */
(function(G){'use strict';
const Base=G.DioramaRenderer,U=G.MUENZUKA_WOODLAND,C=G.MUENZUKA_EDGE_CULLING;
if(!U||!C)throw Error('Muenzuka woodland renderer requires its accepted predecessors');
const ids=new Set([...U.nativeTargets,...U.coldTargets].map(q=>q.id));
const eligible=m=>m.material==='forestLeaf'&&m.instances&&ids.has(m.id);
G.MUENZUKA_WOODLAND_CULLING=Object.freeze({eligible,source:C,meaning:'Only the remaining ten native leaf records and two independent retained cold leaf records'});
G.DioramaRenderer=class extends Base{
 ensure(r,level){const mesh=super.ensure(r,level);if(!eligible(r.data))return mesh;
  const sphere=C.envelope(this.T,r.data);if(mesh.boundingSphere!==sphere)mesh.boundingSphere=sphere;return mesh;
 }
};
})(globalThis.GA);
