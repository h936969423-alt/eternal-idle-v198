import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import {setLocalHitActive,clearLocalHits,recordLocalContact,allowLocalHit,localContactFrame,beginLocalSwing} from '../lib/game/local-hit-sync.ts';
// Execute the real presentation functions with unrelated catalogue lookups stubbed.
const source=stripTypeScriptTypes(fs.readFileSync(new URL('../lib/game/combat-presentation.ts',import.meta.url),'utf8')).replace(/^import .*;\s*$/gm,'').replaceAll('export ','');
const ctx={lineageWEffectDefinition:()=>({}),mythicProcDefinition:()=>({}),raw:{skills:{}},isFlyingMagic:()=>false,magicFlightMs:()=>200,magicEffectLifetime:()=>800,TRIPLE_FLIGHT_MS:200,ARROW_FLIGHT_MS:200,isTripleArrow:s=>s==='sk_elf_triple'||s==='lw_skill_450',REPLAY_MAX_AHEAD_MS:1500};
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
test('buffered results can consume one retained contact, never duplicate it',()=>{
 begin();recordLocalContact(owner,'mob',100);
 assert.equal(allowLocalHit(owner,'mob',1,300),true);
 assert.equal(allowLocalHit(owner,'mob',2,300),false);
 recordLocalContact(owner,'mob',500);assert.equal(allowLocalHit(owner,'mob',2,500),true);assert.equal(allowLocalHit(owner,'mob',3,500),false);
 recordLocalContact(owner,'other',625);assert.equal(allowLocalHit(owner,'mob',3,625),false);
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
test('stop/reset releases confirmed state; time alone cannot replace a contact',()=>{
 begin();beginLocalSwing(owner,{uid:'mob',slot:0});assert.equal(allowLocalHit(owner,'mob',1,0),false);assert.equal(allowLocalHit(owner,'mob',1,1999),false);assert.equal(allowLocalHit(owner,'mob',1,2000),false);
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
test('overdue results for the current victim cannot all bypass a missing contact',()=>{
 begin();beginLocalSwing(owner,{uid:'mob',slot:0});
 for(let seq=1;seq<=5;seq++)assert.equal(allowLocalHit(owner,'mob',seq,0),false);
 for(let seq=1;seq<=5;seq++)assert.equal(allowLocalHit(owner,'mob',seq,5000),false);
 recordLocalContact(owner,'mob',5125);
 assert.equal(allowLocalHit(owner,'mob',1,5125),true);
 for(let seq=2;seq<=5;seq++)assert.equal(allowLocalHit(owner,'mob',seq,5125),false);
});
test('repeated contact callbacks within one swing cannot grant a second target damage',()=>{
 begin();recordLocalContact(owner,'mob',125,1,100);
 assert.equal(allowLocalHit(owner,'mob',1,125),true);
 for(const at of [150,175,200]){
  recordLocalContact(owner,'other',at,2,100);
  assert.equal(allowLocalHit(owner,'other',2,at),false);
 }
 recordLocalContact(owner,'other',525,2,500);
 assert.equal(allowLocalHit(owner,'other',2,525),true);
});
test('a retransmitted normal result does not spend the next swing permit',()=>{
 begin();recordLocalContact(owner,'mob',125,1,100);
 assert.equal(allowLocalHit(owner,'mob',1,125),true);
 recordLocalContact(owner,'mob',525,2,500);
 assert.equal(allowLocalHit(owner,'mob',1,525),true,'duplicate drains without another contact');
 assert.equal(allowLocalHit(owner,'mob',2,525),true,'next real attack retains its contact');
});
test('one normal attack ID applies HP and one number once across repeated frames/targets',()=>{
 begin();let view={hp:100,mp:100,arena:Array.from({length:5},(_,slot)=>({uid:`mob${slot}`,id:'ant',hp:100,maxHp:100})),floats:[]};
 const event={...hit(),attackId:'player:swing1',uid:'mob0'};
 view=ctx.applyCombatViewEvent(view,event,125);
 for(let slot=0;slot<5;slot++)view=ctx.applyCombatViewEvent(view,{...event,slot,uid:`mob${slot}`,seq:slot+2},150+slot*25);
 assert.deepEqual(Array.from(view.arena,m=>m.hp),[90,100,100,100,100]);assert.equal(view.floats.length,1);
 view=ctx.applyCombatViewEvent(view,{...event,attackId:'player:swing2',seq:10},525);
 assert.equal(view.arena[0].hp,80);assert.equal(view.floats.length,2);
});
test('legacy events deduplicate by sequence and bow launch does not consume its impact receipt',()=>{
 let view={hp:100,mp:100,arena:[{uid:'mob',id:'ant',hp:100,maxHp:100}],floats:[]};
 const launch={...hit(),attackId:'bow:one',visualPhase:'launch'};
 view=ctx.applyCombatViewEvent(view,launch,125);const once=view;
 assert.equal(view.arena[0].hp,100);assert.equal(ctx.applyCombatViewEvent(view,launch,150),once);
 view=ctx.applyCombatViewEvent(view,{...launch,visualPhase:'impact'},325);const impact=view;
 assert.equal(view.arena[0].hp,90);assert.equal(view.floats.length,1);assert.equal(ctx.applyCombatViewEvent(view,{...launch,visualPhase:'impact'},350),impact);
 view=ctx.applyCombatViewEvent(view,hit(2),525);const legacy=view;
 assert.equal(view.arena[0].hp,80);assert.equal(ctx.applyCombatViewEvent(view,hit(2),550),legacy);
});

test('a target dropped from the replay queue no longer blocks later hits',async()=>{
 const {syncLocalHitTargets,queueLocalHitTargets}=await import('../lib/game/local-hit-sync.ts');
 begin();const hit=(seq,uid='wolf')=>({seq,kind:'attack',source:'physical',uid,slot:0});
 queueLocalHitTargets(owner,[hit(1),hit(2)]);
 // Replay restore dropped seq 1; only seq 2 is still queued.
 syncLocalHitTargets(owner,[hit(2)]);
 const s=beginLocalSwing(owner,{uid:'wolf',slot:0},['wolf']);assert.equal(s.seq,2);
 recordLocalContact(owner,s.uid,100,s.seq,1);assert.equal(allowLocalHit(owner,'wolf',2,100),true);
 // Completed hits are not re-added by a later sync.
 syncLocalHitTargets(owner,[hit(2),hit(3)]);assert.equal(beginLocalSwing(owner,{uid:'wolf',slot:0},['wolf']).seq,3);
});
