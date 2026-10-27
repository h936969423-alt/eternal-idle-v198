import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';

function harness(withSession=true){
 const trace={contexts:[],tones:[],buffers:[],fetches:[],warnings:[],modes:[],listeners:new Map()};
 const navigator=withSession?{audioSession:{type:'auto'}}:{};
 const document={visibilityState:'visible',hidden:false,addEventListener:(name,fn)=>trace.listeners.set(name,fn)};
 class Context{
  state='suspended';currentTime=0;destination={};
  constructor(){trace.modes.push(navigator.audioSession?.type);trace.contexts.push(this);}
  resume(){this.state='running';return Promise.resolve();}
  suspend(){this.state='suspended';return Promise.resolve();}
  createGain(){return {gain:{value:0,setValueAtTime(v){this.value=v;},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}
  createOscillator(){const node={type:'',frequency:{value:0},connect(){},disconnect(){},start(at){node.started=at;},stop(at){node.stopped=at;},onended:null};trace.tones.push(node);return node;}
  decodeAudioData(){return Promise.resolve({});}
  createBufferSource(){const node={connect(){},disconnect(){},start(){node.started=true;},stop(){node.stopped=true;},onended:null};trace.buffers.push(node);return node;}
 }
 const ctx={navigator,document,window:{AudioContext:Context},console:{warn:(...args)=>trace.warnings.push(args)},performance:{now:()=>0},sounds:{SPELL_SFX:{},WPN_CAT_SFX:{},WPN_SFX:{sword2:'attack_sword2'},MOB_ATTACK_SFX:{},MOB_HURT_SFX:{},MOB_KILL_SFX:{},HURT_SFX:{}},raw:{items:{sword:{wcat:'tohandsword'}},mobs:{},skills:{}},baseItem:id=>id,fetch:async path=>{trace.fetches.push(path);return {ok:true,arrayBuffer:async()=>new ArrayBuffer(8)};}};
 const source=stripTypeScriptTypes(fs.readFileSync(new URL('../app/combat-audio.ts',import.meta.url),'utf8')).replace(/^import .*;\s*$/gm,'').replaceAll('export ','');
 vm.createContext(ctx);vm.runInContext(source,ctx);return {ctx,trace,document,navigator};
}
test('enabling audio selects playback before creating/resuming the browser context',async()=>{
 const {ctx,trace,navigator}=harness();ctx.setCombatVolume(.35);ctx.unlockCombatAudio(true);
 assert.equal(navigator.audioSession.type,'playback');assert.deepEqual(trace.modes,['playback']);
 assert.equal(await ctx.previewCombatAudio(),true);assert.equal(trace.tones.length,2);assert.ok(trace.tones.every(t=>t.started!==undefined));
 ctx.unlockCombatAudio(false);assert.equal(navigator.audioSession.type,'auto');assert.equal(trace.contexts[0].state,'suspended');assert.equal(await ctx.previewCombatAudio(),false);
});
test('browsers without AudioSession retain ordinary Web Audio playback',async()=>{
 const {ctx,trace}=harness(false);ctx.unlockCombatAudio(true);assert.equal(await ctx.previewCombatAudio(),true);assert.equal(trace.contexts.length,1);
});
test('hidden pages do not chirp and returning to the page resumes an interrupted context',async()=>{
 const {ctx,trace,document}=harness();ctx.unlockCombatAudio(true);document.visibilityState='hidden';document.hidden=true;
 trace.listeners.get('visibilitychange')();assert.equal(await ctx.previewCombatAudio(),false);assert.equal(trace.tones.length,0);
 trace.contexts[0].state='interrupted';document.visibilityState='visible';document.hidden=false;trace.listeners.get('visibilitychange')();
 assert.equal(trace.contexts[0].state,'running');assert.equal(await ctx.previewCombatAudio(),true);
});
test('switching off while resume is pending prevents a late confirmation tone',async()=>{
 const {ctx,trace}=harness();ctx.unlockCombatAudio(true);let release;
 trace.contexts[0].resume=()=>new Promise(resolve=>{release=resolve;});
 const pending=ctx.previewCombatAudio();ctx.unlockCombatAudio(false);release();assert.equal(await pending,false);assert.equal(trace.tones.length,0);
});
test('weapon sound still uses its mapped original asset after unlocking',async()=>{
 const {ctx,trace}=harness();ctx.unlockCombatAudio(true);
 ctx.combatSound({id:'p',cls:'knight',equipment:{weapon:{id:'sword'}}},{kind:'attack',source:'physical',damage:0,at:0});
 await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(trace.fetches,['/assets/sfx/attack_sword2.ogg']);assert.equal(trace.buffers.length,1);assert.equal(trace.buffers[0].started,true);
});
test('blocked context creation or resume reports an unsuccessful preview without crashing UI',async()=>{
 const first=harness();first.ctx.window.AudioContext=class{constructor(){throw Error('not allowed');}};
 assert.doesNotThrow(()=>first.ctx.unlockCombatAudio(true));assert.equal(await first.ctx.previewCombatAudio(),false);
 const second=harness();second.ctx.unlockCombatAudio(true);second.trace.contexts[0].resume=()=>Promise.reject(Error('interrupted'));
 assert.equal(await second.ctx.previewCombatAudio(),false);assert.equal(second.trace.tones.length,0);
});
