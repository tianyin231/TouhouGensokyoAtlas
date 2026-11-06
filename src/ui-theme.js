/* 界面（2026-11-06 用户定稿“映画”）。场景是主角：没有实色面板，控件是浮在画上的细字，
 * 只靠画面上下边缘很淡的渐暗托住，鼠标停下后控件也退下。第一轮实色主题被否决：喧宾夺主、与画风不搭。
 * index.html、styles.css、app.js 受基线保护，这里不改它们：所有节点保留 id 与事件，只搬动位置并覆盖样式。 */
(()=>{
const hasPage=typeof document!=='undefined'&&typeof document.getElementById==='function'&&document.getElementById('scene');
if(!hasPage)return;
const G=globalThis.GA,$=id=>document.getElementById(id);
const WORLDS=[['btn-overview','总览'],['btn-layers','剖切'],['btn-highland','伪天棚'],['btn-needle','辉针城'],null,['btn-hell','地底'],['btn-mine','虹龙洞'],null,['btn-heaven','天界'],['btn-nether','冥界'],['btn-lunar','月都'],['btn-higan','彼岸'],['btn-currenthell','地狱'],['btn-animal','畜生界'],['btn-makai','魔界'],['btn-kasen','仙界'],['btn-backdoor','后户']];
const CSS=`
body.ui2{--sans:"Microsoft YaHei UI","Microsoft YaHei","PingFang SC","Noto Sans CJK SC",sans-serif;--serif:"Source Han Serif SC","Noto Serif CJK SC","Songti SC",STSong,SimSun,serif;font-family:var(--sans);
 --fg:#fbfaf6;--fg2:#fbfaf6c4;--halo:0 1px 2px #0a101a80,0 0 9px #0a101a4d;--ac:#ffe3ae;--line:#ffffff33;--pane:#141a248c;--paneInk:#f7f6f1;--paneDim:#f7f6f1c2;--paneLine:#ffffff24}
/* 字浮在画上，只靠上下边缘很淡的渐暗托住，像影片的字幕区。 */
.ui-scrim{position:absolute;left:0;right:0;pointer-events:none;transition:opacity 1.1s ease}
.ui-scrim.top{top:0;height:92px;background:linear-gradient(#0a101a70,#0a101a2b 48%,#0a101a00)}
.ui-scrim.bottom{bottom:0;height:210px;background:linear-gradient(#0a101a00,#0a101a33 42%,#0a101a80)}
.ui-scrim.corner{left:0;right:auto;bottom:0;width:640px;max-width:100vw;height:230px;background:radial-gradient(ellipse at 0% 80%,#0a101a70,#0a101a00 70%)}
/* 强调色跟着空间走，选中态才用得到。 */
body.ui2.in-nether{--ac:#ffd5de}body.ui2.in-oldhell{--ac:#ffcf9c}body.ui2.in-lunar{--ac:#cfe0ff}body.ui2.in-makai{--ac:#ecd0ff}body.ui2.in-higan{--ac:#ffbcae}body.ui2.in-heaven{--ac:#c9f2e4}body.ui2.in-currenthell{--ac:#ffb892}

/* —— 去掉一切实色：按钮就是字 —— */
body.ui2 .ui{transition:opacity .9s ease}
body.ui2 .dock,body.ui2 .space-nav,body.ui2 .layer-bar,body.ui2 .camera-controls{background:none;border:0;box-shadow:none;backdrop-filter:none;border-radius:0}
body.ui2 button{color:var(--fg);background:none;border:0;border-radius:0;text-shadow:var(--halo)}
body.ui2 header button,body.ui2 .view-button,body.ui2 .space-nav button,body.ui2 .ui-cluster button{position:relative}
body.ui2 button:hover{background:none;color:var(--ac)}
body.ui2 button.active,body.ui2 [aria-pressed=true],body.ui2.in-nether #btn-nether.active{background:none;color:var(--ac);border:0;box-shadow:none}
body.ui2 header button.active:after,body.ui2 .view-button.active:after,body.ui2 .space-nav button.active:after,body.ui2 .ui-cluster button.active:after{content:'';position:absolute;left:22%;right:22%;bottom:0;height:1px;background:var(--ac)}
body.ui2 button:focus-visible,body.ui2 select:focus-visible,body.ui2 input:focus-visible{outline:1px solid var(--ac);outline-offset:2px}
body.ui2 button:disabled{opacity:.42}

/* —— 顶部一行 —— */
body.ui2 header{top:10px;left:18px;right:14px;gap:20px}
body.ui2 .brand{gap:8px;flex:none}
body.ui2 .brand:hover{background:none}
body.ui2 .brand .seal{display:none}
body.ui2 .brand strong{font:500 18px var(--serif);letter-spacing:6px;color:var(--fg);text-shadow:var(--halo)}
body.ui2 .brand small{display:none}
.ui-worlds{flex:1 1 auto;min-width:0;display:flex;justify-content:center;align-items:center;gap:0;overflow-x:auto;scrollbar-width:none;pointer-events:auto}
.ui-worlds i{flex:none;width:1px;height:10px;margin:0 7px;background:var(--line)}
body.ui2 .tools{gap:0;max-width:none;overflow:visible;flex:none}
body.ui2 .tool{padding:4px 7px;height:auto;font-size:13px;background:none;border:0;box-shadow:none;backdrop-filter:none;flex:none;color:var(--fg);letter-spacing:.5px}
body.ui2 .tool span{display:inline;margin:0;font-size:13px;letter-spacing:.5px;color:inherit}
body.ui2 .tool:hover{background:none;color:var(--ac)}

/* —— 地名：左下角一行，像片名字幕 —— */
body.ui2 .caption{left:20px;top:auto;bottom:62px;max-width:min(520px,calc(100vw - 40px));padding:0;background:none;box-shadow:none;border:0;color:var(--fg);text-shadow:var(--halo);transition:bottom .35s ease,opacity .9s ease}
body.ui2:has(.space-nav:not([hidden])) .caption,body.ui2:has(.layer-bar:not([hidden])) .caption{bottom:94px}
body.ui2 .caption #scene-index{font-size:11px;letter-spacing:1.5px;color:var(--fg2)}
body.ui2 .caption h1{font:500 25px/1.3 var(--serif);letter-spacing:3px;margin:1px 0 0;color:var(--fg)}
body.ui2 .caption p{font-size:12.5px;line-height:1.6;margin:2px 0 0;color:var(--fg2);max-width:none}
body.ui2 .caption-line{display:none}
body.ui2 #build-status,body.ui2 #mode-note{font-size:11px;line-height:1.55;color:var(--fg2);margin:0;text-shadow:var(--halo);opacity:.82}
body.ui2 #build-status:not(:empty):after{content:' · '}
body.ui2 #build-status:empty{display:none}
body.ui2 .bottom-note{display:none}
body.ui2 #engine-label{display:block;margin-top:8px;font-size:10px;color:var(--paneDim)}

/* —— 底部两行 —— */
body.ui2 .dock{left:14px;bottom:10px;transform:none;max-width:calc(100vw - 440px);padding:0;gap:8px}
body.ui2 .dock select{min-width:0;max-width:170px;padding:3px 2px;background:none;border:0;border-bottom:1px solid var(--line);border-radius:0;color:var(--fg);text-shadow:var(--halo);font-size:13px}
body.ui2 .dock select option{color:#232d36;background:#f4f2ec}
body.ui2 .view-buttons{max-width:none;min-width:0;gap:0;scrollbar-width:none;-webkit-mask-image:linear-gradient(90deg,#000 calc(100% - 26px),#0000)}
body.ui2 .view-button{min-height:30px;padding:3px 9px;font-size:12.5px}
body.ui2 .space-nav,body.ui2 .layer-bar{left:14px;bottom:44px;transform:none;padding:0;gap:0;max-width:calc(100vw - 440px)!important}
body.ui2 .space-nav button,body.ui2 .layer-bar button{padding:3px 9px;font-size:12.5px}
body.ui2 .layer-bar span{color:var(--fg2);text-shadow:var(--halo);padding:0 8px}
.ui-cluster{position:absolute;right:12px;bottom:10px;display:flex;flex-direction:column;align-items:flex-end;gap:0;z-index:10;pointer-events:none;transition:opacity .9s ease}
.ui-cluster>*{pointer-events:auto}
.ui-time{display:flex;align-items:center}
.ui-time>div{display:flex;gap:0;margin:0}
.ui-time>div+div{margin-left:7px;padding-left:7px;border-left:1px solid var(--line)}
body.ui2 .ui-time .weather-switch,body.ui2 .ui-time .lighting-switch{margin:0}
body.ui2 .ui-time button{padding:2px 8px;font-size:12.5px;border:0;background:none;color:var(--fg);text-shadow:var(--halo);min-height:26px}
body.ui2 .ui-time button.active{background:none;color:var(--ac)}
body.in-oldhell .ui-time{display:none}
body.ui2 .camera-controls{position:static;padding:0;max-width:none}
body.ui2 .camera-buttons{gap:0}
body.ui2 .camera-buttons button{min-height:28px;padding:2px 8px;font-size:12.5px}
body.ui2 .camera-zoom{border:0;border-left:1px solid var(--line);padding-left:4px;margin-left:5px}
body.ui2 .camera-zoom button{padding:0 7px;font-size:15px}
body.ui2 .camera-controls p{display:none;margin:0 8px 3px;max-width:300px;color:var(--fg2);text-shadow:var(--halo);font-size:11px;line-height:1.55;text-align:right}
body.ui2 .camera-controls:hover #camera-help{display:block}
body.ui2 .camera-controls:hover #camera-status:not(:empty),body.ui2 .camera-controls:has([data-camera-mode=orbit]:not(.active)) #camera-status:not(:empty){display:block}
body.ui2 .camera-controls #camera-tour{margin:2px 8px;font-size:12px}

/* —— 面板：打开时才出现，透出背后的画 —— */
body.ui2 .drawer,body.ui2 .popup,body.ui2 .detail,body.ui2 .diagnostic{background:var(--pane);backdrop-filter:blur(20px) saturate(1.25);border:1px solid var(--paneLine);border-radius:9px;box-shadow:0 10px 34px #0a101a2e;color:var(--paneInk)}
body.ui2 .drawer *,body.ui2 .popup *,body.ui2 .detail *{text-shadow:none}
body.ui2 .drawer button,body.ui2 .popup button,body.ui2 .detail button{color:var(--paneInk)}
body.ui2 .drawer button:hover,body.ui2 .popup button:hover,body.ui2 .detail button:hover{color:var(--ac)}
body.ui2 .drawer{top:44px;right:12px;bottom:80px;width:330px;padding:14px 15px}
body.ui2 .popup{top:44px;right:12px;bottom:auto;max-height:calc(100vh - 130px);width:292px;padding:14px 16px}
body.ui2 .detail{top:44px;right:352px;max-height:calc(100vh - 130px);width:300px;padding:15px 17px}
body.ui2 h2{font:500 20px var(--serif);letter-spacing:3px;color:var(--paneInk)}
body.ui2 select{color-scheme:light}
body.ui2 .popup select{background:none;border:0;border-bottom:1px solid var(--paneLine);color:var(--paneInk);border-radius:0}
body.ui2 .popup select option{color:#232d36;background:#f4f2ec}
body.ui2 input:not([type=checkbox]){background:#ffffff1f;border:0;border-bottom:1px solid var(--paneLine);border-radius:0;color:var(--paneInk)}
body.ui2 input::placeholder{color:var(--paneDim)}
body.ui2 input[type=checkbox]{accent-color:#8a7a5c;width:15px;height:15px;color-scheme:light}
body.ui2 .result,body.ui2 .character-row{border-bottom:1px solid var(--paneLine);border-radius:0;color:var(--paneInk)}
body.ui2 .result:hover,body.ui2 .character-row:hover{background:#ffffff14;color:var(--paneInk)}
body.ui2 .result small,body.ui2 .character-row small,body.ui2 .detail small,body.ui2 .muted,body.ui2 #result-count,body.ui2 #character-result-count,body.ui2 .portrait-status,body.ui2 .portrait-error{color:var(--paneDim)}
body.ui2 .result em,body.ui2 .tag{color:var(--paneDim)}
body.ui2 .detail p{color:var(--paneInk);font-size:13px;line-height:1.8}
body.ui2 .detail a{color:var(--paneInk);text-decoration:underline;text-decoration-color:var(--paneLine)}
body.ui2 .character-visits,body.ui2 .relation{color:var(--paneInk)}
body.ui2 .filters button{font-size:12px;padding:3px 8px}
body.ui2 .filters button.active{color:var(--paneInk);text-decoration:underline;text-underline-offset:4px}
body.ui2 .full-button{border-bottom:1px solid var(--paneLine);font-size:12.5px}
body.ui2 .popup label{font-size:13px;color:var(--paneInk)}
body.ui2 .close{color:var(--paneDim);font-size:21px}
body.ui2 .diagnostic{left:14px;bottom:150px}
body.ui2 .toast{bottom:64px;background:var(--pane);backdrop-filter:blur(14px);color:var(--paneInk);border:1px solid var(--paneLine);border-radius:7px;font-size:13px}

/* —— 场景内标注：一个字签，不要盒子 —— */
body.ui2 #labels,body.ui2 #character-pins{overflow:hidden}
body.ui2 .place-label{background:none;color:var(--fg);border:0;box-shadow:none;text-shadow:var(--halo);font:500 13px/1.25 var(--serif);padding:2px 5px 4px;letter-spacing:1px}
body.ui2 .place-label:after{background:var(--fg);opacity:.65;width:1px;height:8px}
body.ui2 .place-label:hover{color:var(--ac);background:none}
body.ui2 .place-label.independent{border:0;color:var(--fg)}
body.ui2 .place-label small{color:var(--fg2);font:10px var(--sans)}
body.ui2 .character-pin{background:var(--pane);backdrop-filter:blur(10px);border:0;border-radius:7px;color:var(--paneInk);box-shadow:none}
body.ui2 .character-pin:after{background:var(--fg);opacity:.65}
body.ui2 .character-count{background:#0a101a70;color:#fff}

/* —— 加载页：淡天色，和地表第一眼接上 —— */
body.ui2 .loader{background:linear-gradient(#b9d2e2,#e4e6e0 62%,#efe9dc);color:#2b3640}
body.ui2 .loader .seal{display:none}
body.ui2 .loader h2{font:500 25px var(--serif);letter-spacing:7px;color:#2b3640}
body.ui2 .loader p,body.ui2 .loader small{color:#2b3640b3}
body.ui2 .progress{height:1px;background:#2b364033}
body.ui2 .progress i{background:#2b3640}

/* —— 到站：片名式的细字，淡入淡出 —— */
.ui-stage{position:absolute;left:0;right:0;top:36%;padding:26px 0 30px;text-align:center;color:#fbfaf6;text-shadow:0 1px 3px #0a101a99,0 0 22px #0a101a73;background:radial-gradient(ellipse 46% 50% at 50% 50%,#0a101a57,#0a101a00);pointer-events:none;z-index:40;opacity:0}
.ui-stage small{display:block;font-size:12px;letter-spacing:.34em;opacity:.8;font-family:var(--sans)}
.ui-stage strong{display:block;font:500 38px/1.35 var(--serif);letter-spacing:.3em;margin:5px 0 7px .3em}
.ui-stage b{display:block;height:1px;width:0;margin:0 auto 9px;background:#fbfaf6a6;box-shadow:0 0 6px #0a101a55}
.ui-stage span{display:block;font-size:13px;letter-spacing:.14em;opacity:.86;font-family:var(--sans)}
.ui-stage.show{animation:uiStage 3s ease forwards}
.ui-stage.show strong{animation:uiStageType 3s cubic-bezier(.2,.7,.2,1) forwards}
.ui-stage.show b{animation:uiStageLine 3s cubic-bezier(.2,.7,.2,1) forwards}
@keyframes uiStage{0%{opacity:0}18%{opacity:1}72%{opacity:1}100%{opacity:0}}
@keyframes uiStageType{0%{letter-spacing:.46em}60%,100%{letter-spacing:.3em}}
@keyframes uiStageLine{0%{width:0}40%,100%{width:min(280px,46vw)}}

/* —— 静止时全部退下，只留画面 —— */
body.ui-idle .ui-fade,body.ui-idle .ui-scrim{opacity:0}

/* —— 窄屏 —— */
@media(max-width:1180px){.ui-worlds{justify-content:flex-start;-webkit-mask-image:linear-gradient(90deg,#000 calc(100% - 26px),#0000)}}
@media(max-width:1020px){body.ui2 .dock,body.ui2 .space-nav,body.ui2 .layer-bar{max-width:calc(100vw - 28px)!important}body.ui2 .dock{bottom:44px}body.ui2 .space-nav,body.ui2 .layer-bar{bottom:76px}.ui-cluster{flex-direction:row;left:14px;right:auto;bottom:8px;align-items:center;gap:10px}body.ui2 .caption{bottom:94px}body.ui2:has(.space-nav:not([hidden])) .caption,body.ui2:has(.layer-bar:not([hidden])) .caption{bottom:126px}.ui-scrim.bottom{height:230px}}
@media(max-width:760px){
 body.ui2 header{top:7px;left:12px;right:6px;gap:8px;flex-wrap:wrap}
 body.ui2 .brand strong{font-size:16px;letter-spacing:3px}
 .ui-worlds{order:3;flex:1 0 100%;margin:0 -6px}
 body.ui2 .tool{padding:4px 6px}
 body.ui2 .caption{left:14px;right:14px;max-width:none;top:auto;bottom:124px}
 body.ui2:has(.space-nav:not([hidden])) .caption,body.ui2:has(.layer-bar:not([hidden])) .caption{bottom:156px}
 body.ui2 .caption h1{font-size:20px;letter-spacing:2px}
 body.ui2 .dock{left:8px;right:8px;bottom:64px;max-width:none!important;width:auto}
 body.ui2 .dock select{max-width:104px;font-size:12px}
 body.ui2 .space-nav,body.ui2 .layer-bar{left:8px;right:8px;bottom:94px;max-width:none!important;width:auto;overflow-x:auto;scrollbar-width:none}
 .ui-cluster{left:8px;right:8px;bottom:6px;flex-direction:column;align-items:flex-start;gap:0}
 .ui-scrim.top{height:96px}.ui-scrim.bottom{height:320px}
 body.ui2 .drawer,body.ui2 .popup,body.ui2 .detail{top:76px;left:8px;right:8px;width:auto;bottom:auto;max-height:calc(100vh - 160px)}
 body.ui2 .drawer{bottom:80px;max-height:none}
 .ui-stage strong{font-size:27px;letter-spacing:.2em}
}
@media(prefers-reduced-motion:reduce){body.ui2 .ui,.ui-cluster,.ui-scrim{transition:none}}
`;
function mount(){
 const body=document.body,style=document.createElement('style');style.id='ui-theme';style.textContent=CSS;document.head.append(style);
 body.classList.add('ui2');
 const before=document.querySelector('header');
 for(const side of['top','bottom','corner']){const d=document.createElement('div');d.className='ui-scrim ui '+side;d.setAttribute('aria-hidden','true');body.insertBefore(d,before);}
 // 世界入口放在顶部一行，全是字；全名留给读屏和鼠标提示。
 const worlds=document.createElement('nav');worlds.className='ui-worlds';worlds.setAttribute('aria-label','世界');
 const words=(b,text)=>{const full=b.querySelector('span')?.textContent||b.title||text,s=document.createElement('span');s.textContent=text;b.replaceChildren(s);b.title=full;b.setAttribute('aria-label',full);};
 for(const row of WORLDS){if(!row){worlds.append(document.createElement('i'));continue;}const b=$(row[0]);if(!b)continue;words(b,row[1]);worlds.append(b);}
 before.querySelector('.tools').before(worlds);
 for(const[id,text]of[['btn-search','地点'],['btn-characters','角色'],['btn-settings','设置'],['btn-photo','留影']]){const b=$(id);if(b)words(b,text);}
 for(const b of document.querySelectorAll('[data-weather]'))b.textContent=b.textContent.replace(/^[^一-鿿]+/,'');
 // 时间、天气和相机收拢到右下角。
 const cluster=document.createElement('div');cluster.className='ui-cluster ui';const time=document.createElement('div');time.className='ui-time';
 const light=document.querySelector('.lighting-switch'),weather=document.querySelector('.weather-switch'),caption=document.querySelector('.caption'),camera=document.querySelector('.camera-controls'),tail=document.querySelector('.bottom-note');
 time.append(light,weather);cluster.append(time,camera);body.insertBefore(cluster,tail);
 const status=$('build-status');if(status)caption.append(status);const mode=$('mode-note');if(mode)caption.append(mode);
 const version=$('engine-label');if(version)$('settings')?.append(version);
 const stage=document.createElement('div');stage.className='ui-stage ui';stage.setAttribute('aria-hidden','true');stage.innerHTML='<small></small><strong></strong><b></b><span></span>';body.insertBefore(stage,tail);
 let stageTimer=0;
 addEventListener('atlas-gap-open',()=>{const[a,b,,c]=stage.children;a.textContent=$('scene-index')?.textContent||'';const full=$('scene-title')?.textContent||'',parts=full.split(/\s*[·・]\s*/);b.textContent=parts[0];c.textContent=parts.slice(1).join(' · ')||$('scene-subtitle')?.textContent||'';stage.classList.remove('show');void stage.offsetWidth;stage.classList.add('show');clearTimeout(stageTimer);stageTimer=setTimeout(()=>stage.classList.remove('show'),3100);});
 // 鼠标停下几秒后控件退下去，一动就回来；面板开着时不退。自动化测试要比对像素，不走这一段。
 for(const el of[before,cluster,caption,...document.querySelectorAll('.dock,.space-nav,.layer-bar')])el.classList.add('ui-fade');
 const panels='.drawer:not(.hidden),.popup:not(.hidden),.detail:not(.hidden)',still=globalThis.navigator?.webdriver===true;
 let idleTimer=0;
 const settle=()=>{if(document.querySelector(panels)){idleTimer=setTimeout(settle,4000);return;}body.classList.add('ui-idle');};
 const stir=()=>{body.classList.remove('ui-idle');clearTimeout(idleTimer);if(!still)idleTimer=setTimeout(settle,4000);};
 addEventListener('pointermove',e=>{if(!e.buttons)stir();},{passive:true});
 addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse')stir();},{passive:true});
 addEventListener('keydown',stir,{passive:true});
 stir();
 const widths=new WeakMap();
 // 地名牌互相压住时只留靠前的一块。app.js 写位置时不一定重绘，所以盯着节点变化；地名关闭时完全不动。
 function tidy(){
  const box=$('labels');if(!box)return;const kept=[];
  for(const el of box.children){
   if(el.hidden)continue;let w=widths.get(el);if(!w){w=[el.offsetWidth,el.offsetHeight];if(w[0])widths.set(el,w);}
   const x=parseFloat(el.style.left),y=parseFloat(el.style.top),hw=w[0]/2+3,top=y-w[1]-10,bottom=y+2;
   if(kept.some(k=>Math.abs(k[0]-x)<k[1]+hw&&top<k[3]&&bottom>k[2])){el.hidden=true;continue;}
   kept.push([x,hw,top,bottom]);
  }
 }
 const watch=new MutationObserver(()=>{tidy();watch.takeRecords();});
 watch.observe($('labels'),{subtree:true,attributes:true,attributeFilter:['style','hidden']});
 G.UI={stir};
}
mount();
})();
