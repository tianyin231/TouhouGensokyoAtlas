/* 角色标记使用原作立绘，来源与权利说明见 data/characters.json。
   当前构建不下载头像；地图内嵌资源与角色外链分别管理。 */
(function(G){'use strict';
class CharacterLayer{
 constructor(world,rig,state,onView,toast){
  this.world=world;this.rig=rig;this.state=state;this.onView=onView;this.toast=toast;
  this.catalog=JSON.parse(document.getElementById('character-data').textContent);this.data=this.catalog.characters.map(c=>{const added=(this.catalog.additionalVisits||[]).filter(v=>v.characterId===c.id).map(({characterId,...v})=>v);return added.length?{...c,visits:[...(c.visits||[]),...added]}:c;});
  this.assets=new Map();this.status=new Map();this.elements=[];this.selected=null;this.filter='';this.group=null;
  this.parent=document.getElementById('character-pins');this.panel=document.getElementById('characters-panel');this.list=document.getElementById('character-list');this.detail=document.getElementById('character-detail');
  const locs=new Map(world.data.locations.map(l=>[l.id,l]));this.locs=locs;
  for(const c of this.data){c.runtimePosition=this.position(c);this.status.set(c.id,'pending');}
  const groups=new Map();this.occurrences=this.data.flatMap(c=>[c,...(c.visits||[]).map((v,i)=>({...c,...v,occurrence:i,runtimePosition:this.position(v)}))]);for(const c of this.occurrences){if(!c.runtimePosition)continue;const key=(c.space||'surface')+'|'+c.locationId+(c.period?'|'+c.period:'')+(c.jigokuEra?'|'+c.jigokuEra:'')+(c.mineEdition?'|'+c.mineEdition:'');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(c);}
  for(const[key,cs]of groups){const id=cs[0].locationId;const el=this.makePin(cs,id,true);this.elements.push({cs,el,grouped:true,id});if(cs.length>1&&cs.some(c=>c.position))for(const c of cs)this.elements.push({cs:[c],el:this.makePin([c],id,false),grouped:false,id});}
  document.getElementById('btn-characters').onclick=()=>this.toggle();
  document.getElementById('close-characters').onclick=()=>this.panel.classList.add('hidden');
  document.getElementById('close-character-detail').onclick=()=>this.detail.classList.add('hidden');
  document.getElementById('character-search').oninput=e=>{this.filter=e.target.value.trim().toLowerCase();this.group=null;this.renderList();};
  document.getElementById('characters-all').onclick=()=>{this.filter='';this.group=null;document.getElementById('character-search').value='';this.renderList();};
  document.getElementById('opt-characters').onchange=e=>{state.characters=e.target.checked;this.update();};
  document.getElementById('characters-retry').onclick=()=>{for(const c of this.data)if(this.status.get(c.id)==='failed'){this.assets.delete(c.id);this.status.set(c.id,'pending');}this.update(true);this.renderList();};
  this.renderList();
 }
 position(c){if(!c.locationId)return null;if(G.RAINBOW_MINE?.space===c.space||G.CURRENT_HELL?.spaces.includes(c.space)||G.KASEN?.space===c.space||G.BACKDOOR?.spaces.includes(c.space)||G.HIGAN?.spaces.includes(c.space)||G.ANIMAL?.spaces.includes(c.space)||G.HEAVEN?.spaces.includes(c.space)||c.space==='netherworld')return c.position?.every(Number.isFinite)?c.position.slice():null;if(G.MAKAI?.spaces.includes(c.space))return c.position?.every(Number.isFinite)?c.position.slice():null;if(G.LUNAR?.spaces.includes(c.space))return c.position?.every(Number.isFinite)?c.position.slice():null;if(c.position){const p=c.position.slice();p[1]=Math.max(p[1],(c.space==='mausoleum'?-44:c.space==='senkai'?0:this.world.terrain.height(p[0],p[2]))+1.2);return p;}
 const p=this.world.placementMap.get(c.locationId);return p?[p.x,this.world.terrain.height(p.x,p.z)+4,p.z]:null;}
 makePin(cs,locationId,grouped){const b=document.createElement('button');b.className='character-pin';b.dataset.character=cs[0].id;b.dataset.group=locationId;b.hidden=true;
 b.setAttribute('aria-label',cs.length>1?`${this.locs.get(locationId)?.name||locationId}：${new Set(cs.map(c=>c.id)).size}位关联角色`:`${cs[0].name}，${cs[0].kind}`);
 const portrait=document.createElement('span');portrait.className='portrait-slot';b.append(portrait);
 const label=document.createElement('span');label.className='character-pin-label';label.textContent=cs.length>1?`${this.locs.get(locationId)?.name||'相关地点'} · ${new Set(cs.map(c=>c.id)).size}人`:cs[0].name;b.append(label);
 if(cs.length>1){const count=document.createElement('b');count.className='character-count';count.textContent=new Set(cs.map(c=>c.id)).size;b.append(count);}
 b.onclick=()=>{if(cs.length>1){this.group=locationId;this.filter='';document.getElementById('character-search').value='';this.panel.classList.remove('hidden');this.renderList();}else this.select(cs[0].id,true,cs[0].occurrence);};
 this.parent.append(b);return b;}
 imageFor(c,slot){
  if(!c.art.embedded&&!c.art.urls?.length){slot.dataset.loadedFor='unavailable:'+c.id+':'+c.art.work;slot.replaceChildren();const t=document.createElement('span');t.className='portrait-error';t.textContent='原作图待核';slot.append(t);slot.classList.add('portrait-unavailable');this.status.set(c.id,'unavailable');return;}
  if(slot.dataset.loadedFor===c.id)return;slot.dataset.loadedFor=c.id;slot.replaceChildren();
  const img=document.createElement('img');img.alt=c.name+' · '+c.art.work+(c.art.kind||'原作立绘');img.decoding='async';img.referrerPolicy='no-referrer';img.hidden=true;
  const text=document.createElement('span');text.className='portrait-error';text.textContent='原图加载中';slot.append(img,text);
  let record=this.assets.get(c.id);if(!record){record={listeners:[],ready:false,failed:false};this.assets.set(c.id,record);const load=new Image();load.referrerPolicy='no-referrer';let i=0;const urls=c.art.embedded?[c.art.embedded]:c.art.urls;record.urls=urls;
    load.onload=()=>{if(this.assets.get(c.id)!==record)return;record.ready=true;record.failed=false;record.url=urls[i];this.status.set(c.id,'loaded');for(const fn of record.listeners.splice(0))fn(record);for(const slot of document.querySelectorAll('.portrait-slot'))if(slot.dataset.loadedFor===c.id&&!slot.classList.contains('portrait-ready')){slot.dataset.loadedFor='';this.imageFor(c,slot);}this.updateStatus();};
    load.onerror=()=>{if(this.assets.get(c.id)!==record)return;i++;if(i<urls.length)load.src=urls[i];else{record.failed=true;this.status.set(c.id,'failed');for(const fn of record.listeners.splice(0))fn(record);this.updateStatus();}};
    // Remote portraits are lazy-loaded only when shown in the viewport / opened in the directory.
    load.src=urls[i];record.loader=load;setTimeout(()=>{if(this.assets.get(c.id)===record&&!record.ready&&!record.failed){record.failed=true;this.status.set(c.id,'failed');for(const fn of record.listeners.splice(0))fn(record);this.updateStatus();}},10000);
  }
  const apply=r=>{if(slot.dataset.loadedFor!==c.id)return;if(r.ready){img.src=r.url;img.hidden=false;text.hidden=true;slot.classList.remove('portrait-unavailable');slot.classList.add('portrait-ready');}else if(r.failed){img.hidden=true;text.textContent=c.art.kind==='原作像素绘'?'原图未载入':'立绘未载入';slot.classList.add('portrait-unavailable');}};
  if(!record.ready&&!record.failed)record.listeners.push(apply);apply(record);
 }
 updateStatus(){const loaded=[...this.status.values()].filter(x=>x==='loaded').length,failed=[...this.status.values()].filter(x=>x==='failed').length,embedded=this.data.filter(c=>!!c.art.embedded).length;
 document.getElementById('portrait-status').textContent=`原作立绘 ${loaded}/${this.data.length} 已载入${failed?' · '+failed+' 张未载入':''} · ${embedded===this.data.length?'全部内嵌':'在线原图；断网不影响三维场景'}`;}
 renderList(){this.list.replaceChildren();const list=this.data.filter(c=>(!this.group||c.locationId===this.group||(c.visits||[]).some(v=>v.locationId===this.group))&&(!this.filter||[c.name,c.id,c.kind,...(c.aliases||[]),this.locs.get(c.locationId)?.name||'',...(c.visits||[]).map(v=>(this.locs.get(v.locationId)?.name||'')+' '+v.kind)].join('|').toLowerCase().includes(this.filter)));
 document.getElementById('character-result-count').textContent=`${list.length} / ${this.data.length} 位 · 关联位置，不是实时行踪`;
 for(const c of list){const b=document.createElement('button');b.className='character-row';b.dataset.characterId=c.id;const im=document.createElement('span');im.className='portrait-slot';const content=document.createElement('span');const name=document.createElement('strong');name.textContent=c.name;const small=document.createElement('small');small.textContent=(this.locs.get(c.locationId)?.name||'未定位')+' · '+c.kind;content.append(name,small);b.append(im,content);b.onclick=()=>this.select(c.id,true,this.group&&c.locationId!==this.group?(c.visits||[]).findIndex(v=>v.locationId===this.group):undefined);this.list.append(b);
 // Do not fetch portraits for the closed directory on startup.
 if(!this.panel.classList.contains('hidden'))this.imageFor(c,im);
 }
 this.updateStatus();}
 toggle(){this.panel.classList.toggle('hidden');if(!this.panel.classList.contains('hidden'))this.renderList();}
 select(id,animate=true,occurrence){const base=this.data.find(x=>x.id===id);if(!base)return;const visit=Number.isInteger(occurrence)?base.visits?.[occurrence]:null;const c=visit?{...base,...visit,runtimePosition:this.position(visit)}:base;this.selected=id;this.detail.classList.remove('hidden');this.detail.dataset.character=id;
 document.getElementById('character-name').textContent=c.name;document.getElementById('character-kind').textContent=c.kind;
 document.getElementById('character-location').textContent=this.locs.get(c.locationId)?.name||'位置未定';document.getElementById('character-note').textContent=c.note;
 document.getElementById('character-position-note').textContent=c.runtimePosition?c.positionBasis:'没有工程坐标，不移动相机，不映射到原点。';
 document.getElementById('character-credit').textContent=c.art.work+' · '+(c.art.kind||'原作立绘')+' / '+c.art.credit;
 const src=document.getElementById('character-sources');src.replaceChildren();for(const [text,url]of[['图像出处与原图',c.art.filePage],...c.locationSources.map((url,i)=>['地点关联资料 '+(i+1),url])]){const a=document.createElement('a');a.textContent='↗ '+text;a.href=url;a.target='_blank';a.rel='noopener noreferrer';src.append(a);}
 const vs=document.getElementById('character-visits');vs.replaceChildren();if(base.visits?.length){const homes=document.createElement('button');homes.className='relation';homes.textContent='↗ '+(this.locs.get(base.locationId)?.name||'主要关联');homes.onclick=()=>this.select(id,true);vs.append(homes);base.visits.forEach((v,i)=>{const b=document.createElement('button');b.className='relation';b.textContent='↗ '+v.kind;b.onclick=()=>this.select(id,true,i);vs.append(b);});}this.imageFor(c,document.getElementById('character-portrait'));document.getElementById('detail').classList.add('hidden');
 if(c.runtimePosition){if(c.view)this.onView(c.view,animate);else{this.onView('overview',false);const p=this.world.placementMap.get(c.locationId),[x,y,z]=c.runtimePosition,d=Math.min(380,Math.max(100,(p?.width_x||150)*.6));this.rig.setView({eye:[x+d*.64,y+d*.55,z+d*.92],target:[x,y+5,z]},animate);document.getElementById('scene-title').textContent=this.locs.get(c.locationId)?.name||c.name;document.getElementById('scene-index').textContent='CHARACTER ATLAS · 角色关联';document.getElementById('scene-subtitle').textContent=c.kind+' · 代表位置为本作标注';}}
 if(innerWidth<800)this.panel.classList.add('hidden');this.update();}
 update(retry=false){if(!this.rig)return;const boxes=[];const active=this.state.characters!==false;
 for(const item of this.elements){const{cs,el,grouped,id}=item;let pos=cs[0].runtimePosition,dist=G.length(G.sub(this.rig.eye,pos));const groupHasSingles=this.elements.some(e=>!e.grouped&&e.id===id);
 const anchor=this.world.placementMap.get(id),groupPos=anchor?[anchor.x,this.world.terrain.height(anchor.x,anchor.z),anchor.z]:pos;
 const regionMembers=this.occurrences.filter(c=>c.locationId===id&&(c.space||'surface')===(this.state.space||'surface'));const nearGroup=groupHasSingles&&regionMembers.some(c=>G.length(G.sub(this.rig.eye,c.runtimePosition))<(id==='scarlet'?185:110));
 let show=active&&(cs[0].space||'surface')===(this.state.space||'surface')&&(!groupHasSingles||(grouped?!nearGroup:nearGroup));if(!grouped&&cs[0].id==='mystia'){const stage=this.state.view==='mystiaStage';if(stage!==Number.isInteger(cs[0].occurrence))show=false;}
 if(!show){el.hidden=true;continue;}const p=this.rig.project([pos[0],pos[1]+(dist>350?18:1.0),pos[2]]);if(!p.visible){el.hidden=true;continue;}
 let x=p.x*innerWidth,y=p.y*innerHeight;
 if(y<105||y>innerHeight-115||x<45||x>innerWidth-45){el.hidden=true;continue;}
 const w=grouped?110:90,h=this.status.get(cs[0].id)==='failed'?40:94;let shift=0;for(let k=0;k<4&&boxes.some(b=>Math.abs(b.x-x)<(b.w+w)/2+5&&Math.abs(b.y-(y+shift))<h);k++)shift-=h+5;
 if(y+shift<110){el.hidden=true;continue;}el.hidden=false;el.style.left=x+'px';el.style.top=(y+shift)+'px';el.style.setProperty('--leader',(8-shift)+'px');el.style.zIndex=String(Math.round(100000/(dist+1)));boxes.push({x,y:y+shift,w});
 const slot=el.querySelector('.portrait-slot');if(retry){slot.dataset.loadedFor='';slot.classList.remove('portrait-unavailable');}this.imageFor(cs[0],slot);
 }
 }
 stats(){return{characters:this.data.length,placed:this.data.filter(c=>c.runtimePosition).length,loaded:[...this.status.values()].filter(x=>x==='loaded').length,failed:[...this.status.values()].filter(x=>x==='failed').length,embedded:this.data.filter(c=>!!c.art.embedded).length};}
}
G.CharacterLayer=CharacterLayer;
})(globalThis.GA);

/* Keep original portrait provenance and catalogue behavior; apply display transforms
   only when projecting annotations. Source coordinates are never rewritten. */
(function(G){'use strict';const Base=G.CharacterLayer;
class DisplayCharacters extends Base{
 select(id,animate=true,occurrence){const base=this.data.find(c=>c.id===id);if(!base)return;const c=Number.isInteger(occurrence)?base.visits?.[occurrence]:base;if(c&&!c.view&&c.locationId){const p=this.position(c);if(p){const owner=c.region||(c.space==='mausoleum'?'mausoleum':c.space==='senkai'?'senkai':G.DIORAMA.owner(p[0],p[2]));c.view=G.REGION_DEFAULTS?.[owner];}}super.select(id,animate,occurrence);this.state.changed?.();}
 update(retry=false){if(!this.rig)return;const atlas=this.state.displayMode==='atlas',active=this.state.characters!==false&&!this.state.uiHidden,boxes=[];
 for(const item of this.elements){const c=item.cs[0],el=item.el;let pos=c.runtimePosition,owner=c.region||(c.space==='mausoleum'?'mausoleum':c.space==='senkai'?'senkai':G.DIORAMA.owner(pos[0],pos[2]));let space=c.space||'surface';const matching=(atlas&&(space==='surface'||this.state.cutaway&&space==='mausoleum'))||(!atlas&&(this.state.space==='section'?['myouren','mausoleum'].includes(owner):space===this.state.space&&(this.state.displayMode==='continuous'||owner===this.state.focus)));let show=active&&matching;if(c.highlandSession&&this.state.highlandClosed)show=false;if(c.mineEdition&&c.mineEdition!==this.state.mineEdition)show=false;if(c.jigokuEra&&c.jigokuEra!=='any'&&c.jigokuEra!==this.state.jigokuEra)show=false;if(c.period==='daily'&&this.state.lunarSealed||c.period==='sealed'&&!this.state.lunarSealed)show=false;if(c.makaiPhase==='released'&&this.state.makaiSeal)show=false;if(c.animalEra&&c.animalEra!==this.state.animalEra)show=false;if(c.heavenEdition&&c.heavenEdition!==this.state.heavenEdition)show=false;if(c.period==='backdoor_dancer'&&this.state.backdoorEdition==='six')show=false;if(c.kasenEdition&&(c.kasenEdition!==this.state.kasenEdition||this.state.kasenRitual))show=false;
 if(atlas){if(!item.grouped||Number.isInteger(c.occurrence))show=false;}else{let singles=this.elements.some(e=>!e.grouped&&e.id===item.id&&e.cs[0].period===c.period&&e.cs[0].jigokuEra===c.jigokuEra&&e.cs[0].mineEdition===c.mineEdition);let near=G.length(G.sub(this.rig.eye,pos))<(item.id==='scarlet'?200:140);if(singles)show=show&&(item.grouped?!near:near);if(!item.grouped&&c.id==='mystia'&&((this.state.view==='mystiaStage')!==Number.isInteger(c.occurrence)))show=false;}
 if(!show){el.hidden=true;continue;}if(atlas)pos=G.DIORAMA.point(pos,owner,'atlas',this.state.aligned);let d=G.length(G.sub(this.rig.eye,pos)),p=this.rig.project([pos[0],pos[1]+(atlas?28:2),pos[2]]);if(!p.visible){el.hidden=true;continue;}let x=p.x*innerWidth,y=p.y*innerHeight,h=80,w=100,shift=0;if(x<40||x>innerWidth-40||y<95||y>innerHeight-96){el.hidden=true;continue;}for(let k=0;k<3&&boxes.some(b=>Math.abs(b.x-x)<105&&Math.abs(b.y-y-shift)<h);k++)shift-=85;if(y+shift<90){el.hidden=true;continue;}el.hidden=false;el.style.left=x+'px';el.style.top=(y+shift)+'px';el.style.setProperty('--leader',(8-shift)+'px');el.style.zIndex=String(Math.round(10000/(d+1)));boxes.push({x,y:y+shift});const slot=el.querySelector('.portrait-slot');if(retry)slot.dataset.loadedFor='';this.imageFor(c,slot);
 }
 }
}
G.DisplayCharacters=DisplayCharacters;
})(globalThis.GA);
