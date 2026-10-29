import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';

function harness(){
 const context={lineageWEffectDefinition:()=>undefined,mythicProcDefinition:()=>undefined,raw:{skills:{spell:{type:'atk'},arrow:{type:'atk'}}},magicVisual:e=>({config:e.skill==='spell'?{frames:['0','1','2','3'],fps:10}:e.skill==='arrow'?{proj:true}:undefined}),isFlyingMagic:e=>e.skill==='arrow',spellImpactMs:()=>300,magicEffectLifetime:()=>2000,magicFlightMs:()=>200,TRIPLE_FLIGHT_MS:200,ARROW_FLIGHT_MS:200};
 vm.createContext(context);
 for(const name of ['replay-timing','combat-presentation','sunrise-player-cues']){
  const source=stripTypeScriptTypes(fs.readFileSync(new URL(`../lib/game/${name}.ts`,import.meta.url),'utf8')).replace(/^import .*;\s*$/gm,'').replaceAll('export ','');
  vm.runInContext(source,context);
 }
 return context;
}
const hit=(seq,extra={})=>({seq,at:100,kind:'attack',source:'magic',skill:'spell',slot:0,uid:'A',damage:10,mobHp:90,hp:100,mp:90,...extra});
const cast={...hit(2),kind:'magic',slot:undefined,uid:undefined,damage:undefined,mobHp:undefined};
const initial=()=>({hp:100,mp:100,arena:[{uid:'A',hp:100,maxHp:100},{uid:'B',hp:100,maxHp:100}],floats:[]});

test('automatic target spell starts its effect with the cast pose, then HP and number land on the hit frame once',()=>{
 const h=harness(),pending=[];const {queue}=h.enqueueSunriseReplay([],[hit(1),cast],100,0);
 let view=initial();
 const start=h.drainCombatPresentation(queue,pending,100);
 for(const e of start)view=h.applyCombatViewEvent(view,e,100);
 assert.equal(view.casts.length,1,'effect must begin at release, before damage');
 assert.equal(view.casts[0].visualAt,100);assert.equal(view.arena[0].hp,100);assert.equal(view.floats.length,0);
 assert.equal(h.sunrisePlayerCues(view.actions)[0].displayAt,100);
 assert.equal(h.drainCombatPresentation(queue,pending,399).length,0);
 for(const e of h.drainCombatPresentation(queue,pending,400))view=h.applyCombatViewEvent(view,e,400);
 assert.equal(view.arena[0].hp,90);assert.equal(view.arena[1].hp,100);assert.equal(view.floats.length,1);
 assert.equal(view.casts.length,1,'the damage acknowledgement cannot replay the effect');
});
test('late automatic packets share a fresh release clock instead of squeezing the effect before damage',()=>{
 const h=harness(),pending=[],{queue}=h.enqueueSunriseReplay([],[hit(1),cast],350,0);
 let view=initial();for(const e of h.drainCombatPresentation(queue,pending,350))view=h.applyCombatViewEvent(view,e,350);
 assert.equal(view.casts.length,1);assert.equal(view.casts[0].visualAt,350);
 assert.equal(h.sunrisePlayerCues(view.actions)[0].displayAt,350);
 assert.equal(h.drainCombatPresentation(queue,pending,649).length,0);
 for(const e of h.drainCombatPresentation(queue,pending,650))view=h.applyCombatViewEvent(view,e,650);
 assert.equal(view.arena[0].hp,90);assert.equal(view.casts.length,1);
});
test('manual previews are not generated again; AoE targets keep separate visuals and one pose',()=>{
 const h=harness();
 const manual=h.enqueueSunriseReplay([],[hit(1,{manual:true,visualEffectPreviewed:true,visualCastAt:50}),{...cast,manual:true,visualEffectPreviewed:true,visualCastAt:50}],100,0);
 assert.ok(manual.queue.every(e=>!e.visualOnly));
 const {queue}=h.enqueueSunriseReplay([],[hit(1),hit(2,{slot:1,uid:'B'}),{...cast,seq:3}],100,0);
 let view=initial();for(const e of h.drainCombatPresentation(queue,[],100))view=h.applyCombatViewEvent(view,e,100);
 assert.equal(view.casts.length,2);assert.equal(h.sunrisePlayerCues(view.actions).length,1);
 for(const e of h.drainCombatPresentation(queue,[],400))view=h.applyCombatViewEvent(view,e,400);
 assert.deepEqual(Array.from(view.arena,m=>m.hp),[90,90]);assert.equal(view.casts.length,2);
});
test('a manual cast without a client effect preview starts pose and effect together before its hit',()=>{
 const h=harness(),{queue}=h.enqueueSunriseReplay([],[hit(1,{manual:true}),{...cast,manual:true}],100,null);
 let view=initial();for(const e of h.drainCombatPresentation(queue,[],100))view=h.applyCombatViewEvent(view,e,100);
 assert.equal(view.casts.length,1);assert.equal(view.casts[0].visualAt,100);assert.equal(view.arena[0].hp,100);
 assert.equal(h.sunrisePlayerCues(view.actions)[0].displayAt,100);
 for(const e of h.drainCombatPresentation(queue,[],400))view=h.applyCombatViewEvent(view,e,400);
 assert.equal(view.arena[0].hp,90);assert.equal(view.casts.length,1);
});
test('ordinary swings, weapon procs and flying magic retain their own release/contact clocks',()=>{
 const h=harness(),pending=[];
 for(const extra of [{skill:undefined,source:'physical'},{weaponProc:true},{source:'doll'},{source:'pet'},{source:'summon'}]){
  const {queue}=h.enqueueSunriseReplay([],[hit(1,extra)],100,0);assert.ok(queue.every(e=>!e.visualOnly));
 }
 const {queue}=h.enqueueSunriseReplay([],[hit(1,{skill:'arrow'})],100,0);
 const start=h.drainCombatPresentation(queue,pending,100);assert.equal(start[0].visualPhase,'launch');
 assert.equal(h.drainCombatPresentation(queue,pending,299).length,0);
 assert.equal(h.drainCombatPresentation(queue,pending,300)[0].visualPhase,'impact');
});
