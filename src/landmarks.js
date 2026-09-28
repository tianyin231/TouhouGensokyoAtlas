/* One resolver for directory, navigation and the generated audit. No coordinate fallback.
 * Binding an existing model is NOT claiming another newly authored landmark. */
(function(G){
'use strict';
const repaired={beast_path:'trail',mystia_stall:'mystiaCounter',hakurei_store:'shrineGarden',firetower:'villageFiretower',village_fields:'fields',scarlet_garden:'scarletGarden',scarlet_clock:'scarletClock',purple_cherry:'muenzukaSakura'};
G.PRESETS.villageFiretower={label:'人里 · 火警望楼',region:'village',space:'surface',eye:[-183,56,92],target:[-151,41,54]};
Object.assign(G.IMPLEMENTED,{hakurei:'hakurei',scarlet:'scarlet',village:'riverside',mist_lake:'scarletLake'},repaired);
const pending={wind_cave:'目前只有研究锚点；不再跳到守矢。',geyser_mountain:'尚无该地点的专用场景；不再跳到森林。',sanctuary:'锚点与山地不是圣域专景；不再跳到守矢。'};
const partial=new Set(['makai','pc98_makai','netherworld','doll_forest','kappa_base','sea_trees','needle_storm','kaian']);
function resolve(loc){
 const id=typeof loc==='string'?loc:loc?.id;if(!id||pending[id])return{view:null,status:'pending',note:pending[id]||'尚未绑定可浏览场景。'};
 const entry=G.IMPLEMENTED?.[id],view=typeof entry==='string'?entry:entry?.view;
 if(!view||!G.PRESETS[view])return{view:null,status:'pending',note:'已登记；未绑定可浏览场景。'};
 return{view,status:partial.has(id)?'selection':Object.hasOwn(repaired,id)?'component':'scene',note:partial.has(id)?'可浏览对应选景，不代表整个世界或全部室内已建成。':Object.hasOwn(repaired,id)?'既有模型补绑定，未重复建模。':'已接入三维选景；不等于最终美术或全套室内验收。'};
}
function audit(data){const items=data.locations.map(l=>({id:l.id,name:l.name,world:l.world,group:l.group,...resolve(l)}));return{version:'{{VERSION}}',meaning:'导航覆盖，不是竣工比例',total:items.length,navigable:items.filter(l=>l.view).length,pending:items.filter(l=>!l.view).length,repaired:Object.keys(repaired),removedMisleadingFallbacks:Object.keys(pending),items};}
Object.assign(G,{LANDMARKS:{repaired,pending,partial},resolveLocation:resolve,auditLandmarks:audit});
})(globalThis.GA);
