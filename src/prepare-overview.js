/* 主页面与离线森林预建共用同一总览准备顺序；同时补齐详情依赖的接地数据。 */
(function(G){'use strict';
G.prepareOverview=function(data,decoded){
 const castleOverview=G.buildKishinjouOverview();decoded.meshes.push(...castleOverview.meshes);
 for(const p of G.buildLunarOverviews())decoded.meshes.push(...p.meshes);
 for(const p of G.buildMakaiOverviews())decoded.meshes.push(...p.meshes);
 decoded.meshes.push(...G.buildNetherworldOverview().meshes);
 for(const p of G.buildHeavenOverviews())decoded.meshes.push(...p.meshes);
 for(const p of G.buildHiganOverviews())decoded.meshes.push(...p.meshes);
 for(const p of G.buildAnimalOverviews())decoded.meshes.push(...p.meshes);
 decoded.meshes.push(...G.buildBackdoorOverview().meshes);decoded.meshes.push(...G.buildKasenOverview().meshes);
 for(const p of G.buildCurrentHellOverviews())decoded.meshes.push(...p.meshes);
 decoded.meshes.push(...G.buildRainbowMineOverview().meshes);
 G.LANDSCAPE.apply(decoded,new G.Terrain(data));
 const ht=new G.Terrain(data);G.applyHighlandGround(decoded,ht);decoded.meshes.push(...G.highlandGround(ht,decoded),...G.buildHighland(ht,true).meshes);
 for(const build of G.extraOverviewBuilders||[])decoded.meshes.push(...build(data,decoded));
 return decoded;
};
})(globalThis.GA);
