import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
const require=createRequire(import.meta.url);
const ts=require('typescript');

test('arrow impact does not repeat launch audio and backgrounding stops active voices',async()=>{
 const listeners=new Map();let started=0,stopped=0;
 const gain=()=>({gain:{value:1},connect(){},disconnect(){}});
 class Context{
  destination={};
  createGain(){return gain();}
  resume(){return Promise.resolve();}
  decodeAudioData(){return Promise.resolve({});}
  createBufferSource(){return {connect(){},disconnect(){},start(){started++;},stop(){stopped++;}};}
 }
 const document={visibilityState:'visible',hidden:false,addEventListener:(name,fn)=>listeners.set(name,fn)};
 const module={exports:{}};
 const sounds={SPELL_SFX:{光箭:1},MOB_HURT_SFX:{怪物:2},MOB_KILL_SFX:{},MOB_ATTACK_SFX:{},WPN_CAT_SFX:{},WPN_SFX:{},HURT_SFX:{}};
 const dependencies={'@/lib/game/sounds.json':sounds,'@/lib/game/gamedata.json':{items:{},mobs:{mob:{n:'怪物'}},skills:{spell:{n:'光箭'}}},'@/lib/game/gear':{baseItem:id=>id}};
 const source=ts.transpileModule(readFileSync(new URL('../app/combat-audio.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 vm.runInNewContext(source,{module,exports:module.exports,require:name=>{assert.ok(name in dependencies,name);return dependencies[name];},window:{AudioContext:Context},document,performance,fetch:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(0)})});
 const audio=module.exports;
 audio.unlockCombatAudio(true);
 const c={id:'player',equipment:{},cls:'mage'};
 const event={seq:1,at:100,kind:'attack',mob:'mob',skill:'spell',damage:10,mobHp:20};
 audio.combatSound(c,{...event,visualPhase:'launch'});
 await new Promise(resolve=>setImmediate(resolve));assert.equal(started,1);
 audio.combatSound(c,{...event,visualPhase:'impact'});
 await new Promise(resolve=>setImmediate(resolve));assert.equal(started,2,'impact adds a hurt sound, not a second spell launch');
 document.hidden=true;document.visibilityState='hidden';
 assert.doesNotThrow(()=>listeners.get('visibilitychange')());
 assert.equal(stopped,2);
 audio.combatSound(c,{...event,at:200,visualPhase:'launch'});
 await new Promise(resolve=>setImmediate(resolve));assert.equal(started,2,'no voices start while backgrounded');
});
