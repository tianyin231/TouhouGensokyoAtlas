import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {test} from 'node:test';

const sandbox={};vm.runInNewContext(fs.readFileSync(new URL('../../src/music.js',import.meta.url),'utf8'),sandbox);
const {resolveMusicCue,SceneMusicPlayer}=sandbox.GA;
const cueIds=['hakurei-dusk','hakurei-night','nether-sakura','nether-bloom','mountain-stream','forest-dolls','flower-concert','hell-lullaby'];
const catalog={cues:cueIds.map(id=>({id,title:id,seconds:96,audio:id}))};
const parameter=()=>({value:0,setTargetAtTime(v){this.value=v;},setValueAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;},cancelAndHoldAtTime(){},cancelScheduledValues(){}});
class Context{
 constructor(){this.currentTime=10;this.state='suspended';this.sources=[];this.destination={};}
 createGain(){return {gain:parameter(),connect(){},disconnect(){}};}
 createBiquadFilter(){return {frequency:parameter(),connect(){},disconnect(){}};}
 createBufferSource(){const s={connect(){},disconnect(){},start(t){this.started=t;},stop(t){this.stopped=t;}};this.sources.push(s);return s;}
 async decodeAudioData(){return {duration:96,length:96*44100,numberOfChannels:2};}
 async resume(){this.state='running';}
 async suspend(){this.state='suspended';}
 async close(){this.state='closed';}
}
function setup(extra={}){let state={space:'surface',focus:'hakurei',lighting:'dusk'};const context=new Context();
 const player=new SceneMusicPlayer(catalog,{readState:()=>state,createContext:()=>context,decodeAsset:async x=>x,...extra});
 return {player,context,set:s=>state={...state,...s}};}
test('scene and event scope prevents unrelated music from leaking into other worlds',()=>{
 assert.equal(resolveMusicCue({space:'surface',focus:'hakurei',lighting:'night'}),'hakurei-night');
 assert.equal(resolveMusicCue({space:'surface',focus:'forest',flowerEvent:true}),'forest-dolls');
 assert.equal(resolveMusicCue({space:'surface',focus:'forest',view:'marisa'}),null);
 assert.equal(resolveMusicCue({space:'surface',focus:'sunflower',flowerEvent:true}),'flower-concert');
 assert.equal(resolveMusicCue({space:'netherworld',netherBuds:true}),'nether-bloom');
 assert.equal(resolveMusicCue({space:'lunar',focus:'hakurei',lighting:'night'}),null);
});
test('opt-in, volume, exact loop boundaries and disable release active voices',async()=>{
 const {player:p,context:c}=setup();assert.equal(p.context,undefined);await p.update();assert.equal(c.sources.length,0);
 p.setVolume(.25);await p.enable();assert.equal(c.sources.length,1);assert.equal(c.sources[0].loop,true);
 assert.equal(c.sources[0].loopEnd,96);assert.equal(p.master.gain.value,.25);assert.equal(p.current,'hakurei-dusk');
 p.disable();assert.equal(p.voices.size,0);assert.equal(c.state,'suspended');assert.equal(p.current,null);
});
test('late decoder completion cannot overwrite the newest scene or restart disabled music',async()=>{
 const pending=[];const {player:p,set}=setup({decodeAsset:x=>new Promise(resolve=>pending.push({x,resolve}))});
 const first=p.enable();await new Promise(r=>setImmediate(r));set({lighting:'night'});const second=p.update();
 pending[1].resolve('night');await second;pending[0].resolve('old');await first;assert.equal(p.current,'hakurei-night');
 set({lighting:'dusk'});const third=p.update();p.disable();pending[2].resolve('old');await third;assert.equal(p.current,null);assert.equal(p.voices.size,0);
});
test('cache is bounded, crossfade is scheduled, hidden audio suspends, dispose closes',async()=>{
 const {player:p,context:c,set}=setup();await p.enable();set({lighting:'night'});await p.update();
 assert.ok(c.sources[0].stopped>c.currentTime);set({focus:'forest'});await p.update();assert.equal(p.cache.size,2);
 await p.visibility(true);assert.equal(c.state,'suspended');await p.visibility(false);assert.equal(c.state,'running');
 p.dispose();assert.equal(c.state,'closed');assert.equal(p.cache.size,0);assert.equal(p.voices.size,0);
});
test('unscored entry and bad decode report their real status',async()=>{
 const {player:p,set}=setup();set({space:'lunar'});await p.enable();assert.equal(p.status,'unscored');
 const {player:bad}=setup({decodeAsset:async()=>{throw Error('decode failed');}});await bad.enable();assert.equal(bad.status,'error');assert.equal(bad.current,null);
});
