// CPU and DOM regression against the actual annotation code; no WebGL or network.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const countKeys=['project','point','owner','distance','terrain','elementVisits','associationSome','associationChecks','occurrenceFilter','occurrenceChecks','domWrites','characterUpdates'];
function harness(read,{catalog,atlas={locations:[{id:'fixture',name:'关联地点'},{id:'trail',name:'兽道'}],placements:[{id:'fixture',x:100,z:80},{id:'trail',x:100,z:80}]},base=false,state={}}={}){
 const h={counts:Object.fromEntries(countKeys.map(k=>[k,0])),images:[],requests:[],timers:[],views:[]};
 const nodes=new Map();
 class Element{
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.className='';this.textContent='';this.attributes={};this._hidden=false;
   this.style=new Proxy({setProperty:(key,value)=>{this.style[key]=value;}},{set:(target,key,value)=>{h.counts.domWrites++;target[key]=value;return true;}});
   this.classList={contains:c=>this.className.split(/\s+/).includes(c),add:(...cs)=>{this.className=[...new Set([...this.className.split(/\s+/).filter(Boolean),...cs])].join(' ');},remove:(...cs)=>{this.className=this.className.split(/\s+/).filter(c=>!cs.includes(c)).join(' ');},toggle:(c,force)=>{const add=force??!this.classList.contains(c);this.classList[add?'add':'remove'](c);return add;}};
  }
  get hidden(){return this._hidden;}
  set hidden(value){h.counts.domWrites++;this._hidden=value;}
  append(...children){this.children.push(...children);}
  replaceChildren(...children){this.children=[...children];}
  setAttribute(key,value){h.counts.domWrites++;this.attributes[key]=value;}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  querySelectorAll(selector){const result=[];for(const child of this.children){if(child.classList.contains(selector.slice(1)))result.push(child);result.push(...child.querySelectorAll(selector));}return result;}
 }
 const get=id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);};
 h.get=get;
 const document={getElementById:get,createElement:tag=>new Element(tag),querySelectorAll:selector=>[...new Set([...nodes.values()].flatMap(n=>[...(n.classList.contains(selector.slice(1))?[n]:[]),...n.querySelectorAll(selector)]))]};
 get('characters-panel').className=get('character-detail').className='hidden';get('character-portrait').className='portrait-slot';
 get('character-data').textContent=JSON.stringify(catalog||{characters:[]});get('atlas-data').textContent=JSON.stringify(atlas);
 const G={PRESETS:{},EXTRA_REGION_DEFAULTS:{},REGION_DEFAULTS:{fixture:'fixtureView'},
  length:p=>{h.counts.distance++;return Math.hypot(...p);},sub:(a,b)=>a.map((v,i)=>v-b[i]),
  DIORAMA:{blocks:[{id:'fixture',name:'地表',center:[100,20,80]},{id:'mountain',name:'山',center:[200,20,80]},{id:'mausoleum',name:'历史地下',space:'mausoleum',center:[300,-30,80]},{id:'senkai',name:'仙界',space:'senkai',center:[400,0,80]}],owner:()=>{h.counts.owner++;return 'fixture';},point:p=>{h.counts.point++;return p.slice();}},
  RAINBOW_MINE:{space:'rainbowmine'},CURRENT_HELL:{spaces:['hell','hell_avici']},KASEN:{space:'kasen'},BACKDOOR:{spaces:['backdoor']},HIGAN:{spaces:['shigan','higan']},ANIMAL:{spaces:['animal','primate_core']},HEAVEN:{spaces:['heaven','genkumoumi']},MAKAI:{spaces:['makai01','makai05','makai12']},LUNAR:{spaces:['lunar','lunarsea','dream']}
 };
 class Image{
  constructor(){h.images.push(this);}
  set src(value){this.url=value;h.requests.push(value);}
  get src(){return this.url;}
 }
 h.rig={eye:[110,40,90],project:p=>{h.counts.project++;return h.projection||{visible:true,x:.25+p[0]/10000,y:.65+p[2]/10000};},setView:()=>{}};
 h.state={characters:true,uiHidden:false,displayMode:'focus',space:'surface',focus:'fixture',view:'fixtureView',aligned:true,cutaway:false,...state};
 const world={data:atlas,placementMap:new Map(atlas.placements.map(p=>[p.id,p])),terrain:{height:()=>{h.counts.terrain++;return 0;}}};
 h.context=vm.createContext({GA:G,document,Image,innerWidth:1600,innerHeight:900,performance,setTimeout:fn=>{h.timers.push(fn);return h.timers.length;}});
 vm.runInContext(read('src/characters.js').toString(),h.context,{filename:'src/characters.js'});
 h.layer=new G[base?'CharacterLayer':'DisplayCharacters'](world,h.rig,h.state,(...view)=>h.views.push(view),()=>{});
 const elements=h.layer.elements,iterator=elements[Symbol.iterator].bind(elements),some=elements.some.bind(elements),filter=h.layer.occurrences.filter.bind(h.layer.occurrences);
 elements[Symbol.iterator]=function*(){for(const value of iterator()){h.counts.elementVisits++;yield value;}};
 elements.some=(fn,receiver)=>{h.counts.associationSome++;return some((...args)=>{h.counts.associationChecks++;return fn.call(receiver,...args);});};h.layer.occurrences.filter=(fn,receiver)=>{h.counts.occurrenceFilter++;return filter((...args)=>{h.counts.occurrenceChecks++;return fn.call(receiver,...args);});};
 h.reset=()=>{for(const key of countKeys)h.counts[key]=0;};
 h.measure=fn=>{h.reset();fn();return {...h.counts};};
 h.visible=()=>Array.from(h.layer.elements.filter(i=>!i.el.hidden),i=>`${i.cs[0].id}:${i.grouped?'group':i.cs[0].occurrence??'home'}`);
 h.snapshot=()=>JSON.parse(JSON.stringify({pins:h.layer.elements.map(i=>({id:i.cs[0].id,occurrence:i.cs[0].occurrence,grouped:i.grouped,hidden:i.el.hidden,style:i.el.style,slot:i.el.querySelector('.portrait-slot').dataset,portrait:i.el.querySelector('.portrait-slot').children.map(c=>({hidden:c.hidden,text:c.textContent,src:c.src}))})),status:[...h.layer.status],requests:h.requests,detailHidden:h.get('character-detail').classList.contains('hidden'),detailCharacter:h.get('character-detail').dataset.character}));
 return h;
}
const character=(id='fixture',extra={})=>({id,name:id,kind:'关联',locationId:'fixture',region:'fixture',space:'surface',position:[100,20,80],view:'fixtureView',note:'原位置',positionBasis:'本作标注',locationSources:[],art:{work:'原作',credit:'原作作者',filePage:'https://example.invalid/source',urls:['https://example.invalid/one','https://example.invalid/two']},...extra});

// Also usable by a temporary source-to-source comparison; no Git history is read here.
export function collectUIWork(read){
 const cases=[],idle=[],active=[],observations=[];
 const repeat=(fn,n=40)=>{for(let i=0;i<n;i++)fn();};
 for(const base of [true,false]){
  const h=harness(read,{base,catalog:{characters:[character('one'),character('two',{position:[130,20,80]})]},state:{characters:false}});
  idle.push({name:`${base?'base':'display'} initial disabled`,counts:h.measure(()=>repeat(()=>h.layer.update()))});
  h.state.characters=true;h.layer.update();assert.equal(h.visible().length,2,'Nearby grouped pins must expand to singles');
  h.state.characters=false;const first=h.measure(()=>h.layer.update());assert.equal(h.visible().length,0);assert.equal(first.domWrites,h.layer.elements.length,'Disabling must hide every pin once');
  idle.push({name:`${base?'base':'display'} repeated disabled`,counts:h.measure(()=>repeat(()=>h.layer.update(true)))});
  h.state.space='mausoleum';h.state.characters=true;h.layer.update();assert.equal(h.visible().length,0,'Reopening in another space must not restore old pins');
  h.state.space='surface';h.layer.update();assert.equal(h.visible().length,2);
  h.rig.eye=[900,40,90];active.push({name:`${base?'base':'display'} active`,counts:h.measure(()=>h.layer.update())});assert.deepEqual(h.visible(),['one:group']);
  if(!base){h.state.uiHidden=true;h.layer.update();assert.equal(h.visible().length,0);idle.push({name:'display repeated UI hidden',counts:h.measure(()=>repeat(()=>h.layer.update()))});h.state.uiHidden=false;h.layer.update();assert.deepEqual(h.visible(),['one:group']);}
 observations.push(h.snapshot());cases.push(`${base?'base':'display'} grouping, disable, space switch and restore`);
 }
 {
  const h=harness(read,{catalog:{characters:[character('missing'),character('null-one',{space:'mausoleum',period:null}),character('null-two',{space:'mausoleum',period:null,position:[130,20,80]})]}});
  h.layer.update();assert.deepEqual(h.visible(),['missing:group'],'Null and missing periods must retain strict membership semantics');
  h.state.space='mausoleum';h.layer.update();assert.deepEqual(h.visible(),['null-one:home','null-two:home']);observations.push(h.snapshot());cases.push('strict missing/null period membership across spaces');
 }
 {
  const h=harness(read,{catalog:{characters:[character('mystia',{locationId:'trail',visits:[{locationId:'trail',region:'fixture',space:'surface',position:[120,20,80],view:'mystiaStage'}]})]}});
  h.layer.update();assert.deepEqual(h.visible(),['mystia:home']);h.state.view='mystiaStage';h.layer.update();assert.deepEqual(h.visible(),['mystia:0']);
  h.state.displayMode='atlas';h.layer.update();assert.deepEqual(h.visible(),['mystia:group']);observations.push(h.snapshot());cases.push('Mystia home/stage occurrence and atlas grouping');
 }
 const phases=[
  ['highlandSession',true,{highlandClosed:false},{highlandClosed:true}],
  ['mineEdition','th185',{mineEdition:'th185'},{mineEdition:'th18'}],
  ['jigokuEra','th19',{jigokuEra:'th19'},{jigokuEra:'th17'}],
  ['period','daily',{lunarSealed:false},{lunarSealed:true}],
  ['period','sealed',{lunarSealed:true},{lunarSealed:false}],
  ['makaiPhase','released',{makaiSeal:false},{makaiSeal:true}],
  ['animalEra','before',{animalEra:'before'},{animalEra:'keiki'}],
  ['heavenEdition','th155',{heavenEdition:'th155'},{heavenEdition:'th105'}],
  ['period','backdoor_dancer',{backdoorEdition:'hall'},{backdoorEdition:'six'}],
  ['kasenEdition','th155',{kasenEdition:'th155',kasenRitual:false},{kasenEdition:'manga'}],
  ['kasenEdition','th155',{kasenEdition:'th155',kasenRitual:false},{kasenRitual:true}]
 ];
 for(const [key,value,shown,hidden] of phases){
  const h=harness(read,{catalog:{characters:[character('phase',{[key]:value})]},state:shown});h.layer.update();assert.equal(h.visible().length,1,`${key} matching selection missing`);
  Object.assign(h.state,hidden);h.layer.update();assert.equal(h.visible().length,0,`${key} mismatched selection remains visible`);
  Object.assign(h.state,shown);h.layer.update();assert.equal(h.visible().length,1,`${key} selection did not restore`);observations.push(h.snapshot());
 }cases.push('11 work/period selection conditions restore');
 {
  const h=harness(read,{catalog:{characters:[character('historical',{space:'mausoleum',region:'mausoleum'})]},state:{displayMode:'atlas'}});
  h.layer.update();assert.equal(h.visible().length,0);h.state.cutaway=true;h.layer.update();assert.equal(h.visible().length,1);
  Object.assign(h.state,{displayMode:'focus',space:'section'});h.layer.update();assert.equal(h.visible().length,1);h.state.space='surface';h.layer.update();assert.equal(h.visible().length,0);
  Object.assign(h.state,{displayMode:'continuous',space:'mausoleum'});h.layer.update();assert.equal(h.visible().length,1);
  h.projection={visible:false,x:.5,y:.5};h.layer.update();assert.equal(h.visible().length,0);h.projection={visible:true,x:0,y:.5};h.layer.update();assert.equal(h.visible().length,0);
  h.projection=null;h.layer.update();assert.equal(h.visible().length,1);observations.push(h.snapshot());cases.push('atlas cutaway, section, continuous and viewport conditions');
 }
 {
  const h=harness(read,{catalog:{characters:[character('async')]}});assert.equal(h.requests.length,0,'Closed directory must remain lazy');h.layer.update();assert.equal(h.images.length,1);
  const first=h.images[0];h.state.characters=false;h.layer.update();first.onerror();assert.equal(h.requests.length,2,'Fallback URL must still load');first.onload();
  assert.equal(h.layer.status.get('async'),'loaded');assert.equal(h.visible().length,0,'Async completion must not unhide pins');assert(h.layer.elements[0].el.querySelector('.portrait-slot').classList.contains('portrait-ready'));
  idle.push({name:'disabled after async load',counts:h.measure(()=>repeat(()=>h.layer.update()))});h.state.characters=true;h.layer.update();assert.equal(h.images.length,1,'Reopening must reuse loaded portrait');
  h.layer.toggle();assert.equal(h.get('character-list').children.length,1);assert.equal(h.images.length,1);h.layer.select('async',false);assert.equal(h.get('character-detail').classList.contains('hidden'),false);assert.equal(h.get('character-name').textContent,'async');
  h.state.uiHidden=true;h.layer.update();assert.equal(h.visible().length,0);h.layer.select('async',false);assert.equal(h.get('character-detail').classList.contains('hidden'),false);observations.push(h.snapshot());cases.push('lazy directory, fallback, async load and hidden-UI detail');
 }
 {
  const h=harness(read,{catalog:{characters:[character('retry')]}});h.layer.update();const old=h.images[0];old.onerror();old.onerror();assert.equal(h.layer.status.get('retry'),'failed');
  h.get('characters-retry').onclick();assert.equal(h.images.length,2);const current=h.images[1];old.onload();assert.equal(h.layer.assets.get('retry').ready,false,'Old callbacks must not complete a replacement');current.onload();assert.equal(h.layer.status.get('retry'),'loaded');
  h.layer.assets.delete('retry');h.layer.status.set('retry','failed');h.state.characters=false;h.layer.update();const requests=h.requests.length;h.get('characters-retry').onclick();assert.equal(h.requests.length,requests,'Retry must remain lazy while disabled');
  h.layer.select('retry',false);assert.equal(h.images.length,3,'Opening details may load portraits while pins are disabled');assert.equal(h.visible().length,0);observations.push(h.snapshot());cases.push('retry and stale callbacks preserve portrait lifecycle');
 }
 {
  const h=harness(read,{catalog:{characters:[character('unknown',{art:{work:'待核',credit:'待核',filePage:'https://example.invalid/source',urls:[]}})]}});h.layer.update();assert.equal(h.layer.status.get('unknown'),'unavailable');assert.equal(h.requests.length,0);assert.equal(h.layer.elements[0].el.querySelector('.portrait-slot').children[0].textContent,'原作图待核');observations.push(h.snapshot());cases.push('unavailable original artwork keeps explicit status');
 }
 {
  const h=harness(read),source=read('src/app.js').toString(),end='\nboot();\n';assert(source.includes(end),'Cannot isolate app boot for CPU regression');
  vm.runInContext(source.replace(end,'\nglobalThis.uiWork={state,initLabels,updateLabels,setRig:r=>{rig=r;},setCharacters:c=>{characters=c;}};\n'),h.context,{filename:'src/app.js'});
  const app=h.context.uiWork;app.setRig(h.rig);app.setCharacters({update:()=>{h.counts.characterUpdates++;}});app.initLabels();
  const labels=()=>h.get('labels').children,snapshot=()=>labels().map(el=>({text:el.textContent,hidden:el.hidden,left:el.style.left,top:el.style.top}));
  app.updateLabels();idle.push({name:'labels initial disabled',characters:40,counts:h.measure(()=>repeat(()=>app.updateLabels()))});
  app.state.labels=true;app.updateLabels();assert.equal(labels().filter(el=>!el.hidden).length,2);Object.assign(app.state,{displayMode:'focus',space:'oldhell',hellSection:true});app.updateLabels();assert.equal(labels().filter(el=>!el.hidden).length,4);
  app.state.labels=false;app.updateLabels();assert(labels().every(el=>el.hidden));idle.push({name:'labels repeated disabled',characters:40,counts:h.measure(()=>repeat(()=>app.updateLabels()))});
  Object.assign(app.state,{displayMode:'atlas',space:'surface',labels:true});app.updateLabels();assert.equal(labels().filter(el=>!el.hidden).length,2);
  app.state.uiHidden=true;app.updateLabels();assert(labels().every(el=>el.hidden));idle.push({name:'labels repeated UI hidden',characters:40,counts:h.measure(()=>repeat(()=>app.updateLabels()))});
  Object.assign(app.state,{uiHidden:false,space:'oldhell',displayMode:'focus'});app.updateLabels();assert.equal(labels().filter(el=>!el.hidden).length,4);
  Object.assign(app.state,{space:'surface',displayMode:'atlas',hellSection:false,cutaway:true});app.updateLabels();assert.equal(labels().filter(el=>!el.hidden).length,3);
  assert.equal(h.get('layer-lines').style.display,'none');assert.equal(h.get('layer-line').attributes.d,'');observations.push(snapshot());cases.push('labels independent character updates, old hell, UI hide and cutaway restore');
 }
 const project=JSON.parse(read('project.json')),catalog=JSON.parse(read('data/characters.json')),atlas=JSON.parse(read('data/atlas.json'));
 for(const name of ['lunar','makai','netherworld','heaven','higan','animal','backdoor','kasen','current-hell','rainbow-mine','highland'].map(n=>`data/${n}.json`).concat(project.extensionData||[])){
  const module=JSON.parse(read(name));catalog.characters.push(...(module.characters||[]));(catalog.additionalVisits||=[]).push(...(module.characterVisits||[]));
 }
 const real=harness(read,{catalog,atlas}),elements=Array.from(real.layer.elements);
 const indexMatches=elements.every(item=>{const c=item.cs[0];return item.hasSingles===elements.some(e=>!e.grouped&&e.id===item.id)&&item.hasDisplaySingles===elements.some(e=>!e.grouped&&e.id===item.id&&e.cs[0].period===c.period&&e.cs[0].jigokuEra===c.jigokuEra&&e.cs[0].mineEdition===c.mineEdition);});
 real.layer.update();active.push({name:'actual catalogue focus',counts:real.measure(()=>real.layer.update())});observations.push(real.snapshot());
 real.state.characters=false;const first=real.measure(()=>real.layer.update());idle.push({name:'actual catalogue repeated disabled',counts:real.measure(()=>repeat(()=>real.layer.update()))});
 cases.push('actual merged catalogue constructs and skips disabled frame work');
 return {cases,idle,active,observations,indexMatches,catalogue:{characters:real.layer.data.length,occurrences:real.layer.occurrences.length,pins:real.layer.elements.length,firstDisableWrites:first.domWrites}};
}

export function checkUIWork(read){
 const result=collectUIWork(read);
 assert(result.indexMatches,'Cached singles must match exact catalogue relations');
 for(const sample of result.idle){for(const key of countKeys)assert.equal(sample.counts[key],key==='characterUpdates'?sample.characters||0:0,`${sample.name}: ${key} continued while hidden`);}
 for(const sample of result.active){assert.equal(sample.counts.associationSome,0,`${sample.name}: per-frame element membership scan`);assert.equal(sample.counts.occurrenceFilter,0,`${sample.name}: per-frame occurrence filter`);}
 return {checks:result.cases.length,cases:result.cases,catalogue:result.catalogue,idleFramesPerCase:40,idleCases:result.idle.length,node:process.version,webgl:false};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const root=fileURLToPath(new URL('../',import.meta.url));
 console.log('UI work checks passed: '+JSON.stringify(checkUIWork(name=>fs.readFileSync(path.join(root,name)))));
}
