/* Sample-rendered soundtrack. Music never schedules map draws or changes scene state. */
(function(G){
 'use strict';
 function resolveCue(s){
  if(!s)return null;
  if(s.space==='netherworld')return s.netherBuds?'nether-bloom':'nether-sakura';
  if(s.space==='oldhell')return 'hell-lullaby';
  if(s.space!=='surface')return null;
  if(s.focus==='hakurei')return s.lighting==='night'?'hakurei-night':'hakurei-dusk';
  if(s.focus==='sunflower'&&s.flowerEvent)return 'flower-concert';
  if(s.focus==='forest')return /^marisa/.test(s.view||'')?null:'forest-dolls';
  if(s.focus==='bamboo')return 'bamboo-moon';
  if(s.focus==='scarlet')return 'scarlet-evening';
  if(!s.focus||['mountain','genbu','connections','sunflower'].includes(s.focus))return 'mountain-stream';
  return null;
 }
 class SceneMusicPlayer{
  constructor(catalog,{readState,createContext,onChange=()=>{},decodeAsset}={}){
   this.catalog=catalog;this.readState=readState;this.createContext=createContext||(()=>new AudioContext());
   this.onChange=onChange;this.decodeAsset=decodeAsset||((encoded)=>Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)).buffer);
   this.enabled=false;this.volume=.45;this.generation=0;this.cache=new Map();this.voices=new Set();
   this.current=null;this.desired=undefined;this.status='off';this.hidden=false;this.destroyed=false;
  }
  notify(){this.onChange(this.info());}
  info(){return{enabled:this.enabled,status:this.status,current:this.current,desired:this.desired,volume:this.volume,
   contextState:this.context?.state||'none',voices:this.voices.size,cached:[...this.cache.keys()],
   decodedBytes:[...this.cache.values()].reduce((n,b)=>n+b.length*b.numberOfChannels*4,0)};}
  async enable(){
   if(this.destroyed)return;
   this.enabled=true;this.status='loading';this.notify();
   try{
    if(!this.context){
     this.context=this.createContext();this.master=this.context.createGain();this.filter=this.context.createBiquadFilter();
     this.filter.type='lowpass';this.filter.frequency.value=18000;
     this.master.gain.value=this.volume;this.master.connect(this.filter);this.filter.connect(this.context.destination);
    }
    await this.context.resume();
    if(!this.enabled||this.destroyed){await this.context.suspend();return;}
    if(this.hidden)await this.context.suspend();
    await this.update();
   }catch(e){this.enabled=false;this.status='error';this.error=String(e.message||e);this.notify();}
  }
  disable(){
   this.enabled=false;this.generation++;this.desired=undefined;this.current=null;
   for(const voice of [...this.voices])this.stopVoice(voice,0);
   this.context?.suspend().catch(()=>{});this.status='off';this.notify();
  }
  setVolume(value){
   this.volume=Math.max(0,Math.min(1,Number(value)||0));
   if(this.master)this.master.gain.setTargetAtTime(this.volume,this.context.currentTime,.06);
   this.notify();
  }
  stopVoice(voice,fade){
   if(voice.stopping&&fade)return;
   voice.stopping=true;
   const now=this.context.currentTime;
   if(fade){
    voice.gain.gain.cancelAndHoldAtTime(now);
    voice.gain.gain.linearRampToValueAtTime(0,now+fade);
   }
   if(!fade){voice.gain.gain.cancelScheduledValues(now);voice.gain.gain.setValueAtTime(0,now);}
   try{voice.source.stop(now+(fade?fade+.02:0));}catch(_){/* already ended */}
   if(!fade){voice.source.disconnect();voice.gain.disconnect();this.voices.delete(voice);}
  }
  async buffer(cue){
   if(this.cache.has(cue.id)){
    const b=this.cache.get(cue.id);this.cache.delete(cue.id);this.cache.set(cue.id,b);return b;
   }
   const data=await this.decodeAsset(cue.audio,cue);
   const buffer=await this.context.decodeAudioData(data);
   // Compressed encoders may include a fractional frame of padding. Never loop that padding.
   if(buffer.duration+.025<cue.seconds)throw Error('音频长度不完整：'+cue.title);
   return buffer;
  }
  async update(){
   if(!this.enabled||!this.context||this.destroyed)return;
   const state=this.readState(),id=resolveCue(state);
   this.filter.frequency.setTargetAtTime(state?.weather==='rain'?6500:state?.lighting==='night'?11000:18000,this.context.currentTime,.8);
   if(id===this.desired)return;
   const generation=++this.generation;this.desired=id;
   const cue=this.catalog.cues.find(c=>c.id===id);
   if(!cue){
    for(const v of [...this.voices])this.stopVoice(v,1.6);
    this.current=null;this.status='unscored';this.notify();return;
   }
   this.status='loading';this.notify();
   try{
    const buffer=await this.buffer(cue);
    if(generation!==this.generation||!this.enabled||this.destroyed)return;
    this.cache.delete(id);this.cache.set(id,buffer);
    while(this.cache.size>2)this.cache.delete(this.cache.keys().next().value);
    const now=this.context.currentTime,source=this.context.createBufferSource(),gain=this.context.createGain();
    source.buffer=buffer;source.loop=true;source.loopStart=0;source.loopEnd=cue.seconds;
    gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(1,now+1.8);
    source.connect(gain);gain.connect(this.master);
    for(const v of [...this.voices])this.stopVoice(v,1.8);
    const voice={source,gain,id,stopping:false};this.voices.add(voice);
    source.onended=()=>{source.disconnect();gain.disconnect();this.voices.delete(voice);};
    source.start(now+.025);this.current=id;this.status='playing';this.notify();
   }catch(e){
    if(generation!==this.generation||this.destroyed)return;
    this.status='error';this.error=String(e.message||e);this.notify();
   }
  }
  async visibility(hidden){
   this.hidden=hidden;
   if(!this.context||!this.enabled)return;
   try{if(hidden)await this.context.suspend();else{await this.context.resume();await this.update();}}
   catch(e){this.status='error';this.error=String(e.message||e);}
   this.notify();
  }
  dispose(){
   this.disable();this.destroyed=true;this.cache.clear();this.context?.close().catch(()=>{});
  }
 }
 G.resolveMusicCue=resolveCue;G.SceneMusicPlayer=SceneMusicPlayer;
 if(typeof document==='undefined'||!globalThis.ATLAS_MUSIC_DATA)return;
 const host=document.getElementById('settings');if(!host)return;
 const catalog=globalThis.ATLAS_MUSIC_DATA,section=document.createElement('section');
 section.className='music-controls';section.setAttribute('aria-label','场景配乐');
 const heading=document.createElement('h3');heading.textContent='场景配乐';
 const toggle=document.createElement('button');toggle.id='music-toggle';toggle.className='full-button';toggle.type='button';toggle.setAttribute('aria-pressed','false');
 const label=document.createElement('label');label.textContent='配乐音量';
 const volume=document.createElement('input');volume.id='music-volume';volume.type='range';volume.min='0';volume.max='100';volume.step='1';volume.setAttribute('aria-label','配乐音量');label.append(volume);
 const status=document.createElement('p');status.id='music-status';status.className='muted';status.setAttribute('aria-live','polite');
 const credit=document.createElement('a');credit.id='music-credit';credit.target='_blank';credit.rel='noopener noreferrer';credit.hidden=true;
 section.append(heading,toggle,label,status,credit);host.append(section);
 const player=new SceneMusicPlayer(catalog,{readState:()=>globalThis.ATLAS?.state,onChange:info=>{
  toggle.textContent=info.enabled?'关闭配乐':'开启配乐';toggle.setAttribute('aria-pressed',String(info.enabled));
  volume.value=String(Math.round(info.volume*100));
  const cue=catalog.cues.find(c=>c.id===info.current);
  status.textContent=!info.enabled?'开启后随场景切换':info.status==='loading'?'正在准备配乐…':info.status==='unscored'?'此场景暂未配曲':info.status==='error'?'音频未能播放，请关闭后重试':cue?.title||'准备配乐';
  credit.hidden=!cue;credit.textContent=cue?'原曲：'+cue.original+' · ZUN':'';if(cue)credit.href=cue.sourceUrl;
 }});
 globalThis.ATLAS_MUSIC=player;
 try{const saved=localStorage.getItem('atlas-music-volume');if(saved!==null)player.setVolume(Number(saved));}catch(_){/* storage can be unavailable */}
 player.notify();let timer=0;
 toggle.addEventListener('click',()=>{
  if(player.enabled){clearInterval(timer);timer=0;player.disable();}
  else{player.enable();if(!timer)timer=setInterval(()=>{if(!player.enabled){clearInterval(timer);timer=0;}else if(!document.hidden)player.update();},500);}
 });
 volume.addEventListener('input',()=>{player.setVolume(Number(volume.value)/100);try{localStorage.setItem('atlas-music-volume',String(player.volume));}catch(_){}});
 const changed=()=>queueMicrotask(()=>player.update());
 document.addEventListener('click',changed);document.addEventListener('change',changed);
 document.addEventListener('visibilitychange',()=>player.visibility(document.hidden));
 window.addEventListener('pagehide',event=>{clearInterval(timer);timer=0;if(event.persisted)player.disable();else{player.dispose();document.removeEventListener('click',changed);document.removeEventListener('change',changed);}});
})(globalThis.GA=globalThis.GA||{});
