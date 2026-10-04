/* P: bounded public planting around Alice's accepted forest home.
 * Native trees, cold proxies and the region builder remain unchanged.
 */
(function(G){'use strict';
const REVISION=1,preparedPacks=new WeakSet();
function prepare(data,pack){
 if(preparedPacks.has(pack))return [];
 if(!G.ALICE_UNDERSTOREY_GROUND?.prepare)
  throw Error('Alice understorey rendered-ground helper must load before integration');
 const nextData={...data,surfaceContacts:{...(data.surfaceContacts||{})}},
       nextPack={...pack,meshes:pack.meshes.slice()},
       additions=G.ALICE_UNDERSTOREY_GROUND.prepare(nextData,nextPack);
 if(!Array.isArray(additions)||additions.length>4)
  throw Error('Alice understorey public additions require at most four records');
 // Production captures the old pack.meshes receiver before build runs.
 // Publish the additions together and return[] to that earlier receiver.
 nextPack.meshes=nextPack.meshes.concat(additions);
 data.surfaceContacts=nextData.surfaceContacts;
 data.aliceUnderstorey=nextData.aliceUnderstorey;
 pack.meshes=nextPack.meshes;preparedPacks.add(pack);
 return [];
}
G.ALICE_UNDERSTOREY={revision:REVISION,prepare};
G.extraOverviewBuilders=[...(G.extraOverviewBuilders||[]),prepare];
})(globalThis.GA);
