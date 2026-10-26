import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import {setLocalHitActive,clearLocalHits,recordLocalContact,allowLocalHit,localContactFrame,beginLocalSwing} from '../lib/game/local-hit-sync.ts';
// Execute the real presentation functions with unrelated catalogue lookups stubbed.
const source=stripTypeScriptTypes(fs.readFileSync(new URL('../lib/game/combat-presentation.ts',import.meta.url),'utf8')).replace(/^import .*;\s*$/gm,'').replaceAll('export ','');
const ctx={lineageWEffectDefinition:()=>({}),mythicProcDefinition:()=>({}),raw:{skills:{}},isFlyingMagic:()=>false,magicFlightMs:()=>200,magicEffectLifetime:()=>800,TRIPLE_FLIGHT_MS:200,ARROW_FLIGHT_MS:200,REPLAY_MAX_AHEAD_MS:1500};
vm.createContext(ctx);vm.runInContext(source,ctx);
const hit=(seq=1)=>({seq,at:0,due:0,kind:'attack',source:'physical',uid:'mob',slot:0,damage:10,mobHp:90,visualHpDelta:-10,hp:100,mp:100});
const owner='test:zone';
function begin(){clearLocalHits(owner);setLocalHitActive(owner,true,.4);}
const gate=now=>e=>allowLocalHit(owner,e.uid,e.seq,now);
test('early confirmed HP waits for visible contact; HP and float update together exactly once',()=>{
 begin();const queue=[hit()],pending=[];
 let view={hp:100,mp:100,arena:[{uid:'mob',id:'ant',hp:100,maxHp:100}],floats:[]};
 assert.equal(ctx.drainCombatPresentation(queue,pending,0,false,undefined,gate(0)).length,0);
 assert.equal(view.arena[0].hp,100);assert.equal(view.floats.length,0);
 recordLocalContact(owner,'mob',125);
 const ready=ctx.drainCombatPresentation(queue,pending,125,false,undefined,gate(125));assert.equal(ready.length,1);
 view=ctx.applyCombatViewEvent(view,ready[0],125);assert.equal(view.arena[0].hp,90);assert.equal(view.floats.length,1);assert.equal(view.floats[0].shownAt,125);
 assert.equal(ctx.drainCombatPresentation(queue,pending,250,false,undefined,gate(250)).length,0);
});
test('late results wait for the next contact rather than using an old swing',()=>{
 begin();recordLocalContact(owner,'mob',100);
 assert.equal(allowLocalHit(owner,'mob',1,300),false);
 recordLocalContact(owner,'mob',500);assert.equal(allowLocalHit(owner,'mob',1,500),true);assert.equal(allowLocalHit(owner,'mob',2,500),false);
 recordLocalContact(owner,'other',625);assert.equal(allowLocalHit(owner,'mob',2,625),false);
});
test('lethal loot and replacement cannot overtake the waiting hit',()=>{
 begin();const queue=[{...hit(),damage:100,mobHp:0}, {seq:2,at:0,due:0,kind:'loot',uid:'mob',slot:0}, {seq:3,at:0,due:0,kind:'spawn',uid:'new',slot:0,spawn:{uid:'new',id:'ant',hp:100}}],pending=[];
 assert.equal(ctx.drainCombatPresentation(queue,pending,0,false,undefined,gate(0)).length,0);
 recordLocalContact(owner,'mob',125);
 const ready=ctx.drainCombatPresentation(queue,pending,125,false,undefined,gate(125));assert.deepEqual(Array.from(ready,e=>e.kind),['attack','loot','spawn']);
});
test('weapon proc waits for its normal hit; bow HP still waits another 200ms for impact',()=>{
 begin();let queue=[hit(),{...hit(2),weaponProc:true,skill:'weapon_fx'}],pending=[];
 assert.equal(ctx.drainCombatPresentation(queue,pending,0,false,undefined,gate(0)).length,0);
 recordLocalContact(owner,'mob',125);assert.deepEqual(Array.from(ctx.drainCombatPresentation(queue,pending,125,false,undefined,gate(125)),e=>e.seq),[1,2]);
 begin();queue=[hit()];pending=[];ctx.drainCombatPresentation(queue,pending,0,true,undefined,gate(0));recordLocalContact(owner,'mob',125);
 const launch=ctx.drainCombatPresentation(queue,pending,125,true,undefined,gate(125));assert.equal(launch[0].visualPhase,'launch');assert.equal(pending[0].due,325);
 assert.equal(ctx.drainCombatPresentation(queue,pending,324,true,undefined,gate(324)).length,0);
 assert.equal(ctx.drainCombatPresentation(queue,pending,325,true,undefined,gate(325))[0].visualPhase,'impact');
});
test('stop/reset releases confirmed state and removes stale contacts; missing frames have a bounded fallback',()=>{
 begin();beginLocalSwing(owner,{uid:'mob',slot:0});assert.equal(allowLocalHit(owner,'mob',1,0),false);assert.equal(allowLocalHit(owner,'mob',1,1999),false);assert.equal(allowLocalHit(owner,'mob',1,2000),true);
 recordLocalContact(owner,'mob',2100);clearLocalHits(owner);assert.equal(allowLocalHit(owner,'mob',2,2100),true);
 begin();assert.equal(allowLocalHit(owner,'mob',3,2100),false);setLocalHitActive(owner,false,.4);assert.equal(allowLocalHit(owner,'mob',3,2101),true);
});
test('contact frame stays reachable at fast speeds and remains mid-swing for ordinary speeds',()=>{
 assert.equal(localContactFrame(4,.4),2);assert.equal(localContactFrame(8,.19),0);
 for(const seconds of [.1,.19,.4489,.8,1.3,2.5])for(const count of [1,4,8,16]){const f=localContactFrame(count,seconds);assert.ok(f>=0&&f<count);}
});
test('a timeout before any real swing cannot flush damage across multiple monsters',()=>{
 begin();assert.equal(allowLocalHit(owner,'left',1,0),false);assert.equal(allowLocalHit(owner,'right',2,0),false);
 assert.equal(allowLocalHit(owner,'left',1,5000),false);assert.equal(allowLocalHit(owner,'right',2,5000),false);
});

