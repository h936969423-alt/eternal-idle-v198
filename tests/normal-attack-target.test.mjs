import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import {damageSourceLabel,damageDisplay} from '../lib/game/damage-display.ts';
const source=fs.readFileSync(new URL('../lib/game/engine.ts',import.meta.url),'utf8');
const section=(name,next)=>source.slice(source.indexOf('function '+name+'('),source.indexOf(next,source.indexOf('function '+name+'(')));
const normal=section('normalWeaponAttack','export function cast');
const helpers=section('syncTarget','export function populationSummary')+section('applyWeaponMagic','function diceWeaponPoison')+section('applyDollAttack','function damageMonster')+section('damageMonster','function defeat');
function run({strike=3,doll=[{damage:100},{damage:100}],magic,magicDamage=20,broken=false,skill}={}){
 const c={id:'one',hp:100,mp:100,arenaTarget:0,buffs:{},equipment:{weapon:{id:'test',en:0}},arena:['A','B','C'].map(uid=>({uid,id:'mob',hp:10,maxHp:10})),events:[],eventSeq:0};
 const ctx={DATA:{items:{test:{}},skills:{}},stats:()=>({int:10,maxHp:100}),monsterData:()=>({n:'mob',e:'none'}),playerStrike:()=>({damage:strike,miss:false}),elementalWeaponDamage:()=>0,weaponElementMultiplier:()=>1,monsterBarrierDamage:(_target,n)=>n,recordBossDamage:()=>{},log:()=>{},mythicProcDefinition:()=>undefined,lineageWEffectDefinition:()=>undefined,applyLineageWAbsorption:()=>{},applyLineageWEquipmentProcs:()=>{},applyMythicWeaponProcs:()=>{},absorbMythicMana:()=>{},applySpellStatus:()=>{},justiceSpellError:()=>false,triggeredWeaponMagic:()=>magic?{skill:'test_magic',definition:magic}:undefined,weaponMagicDamage:()=>magicDamage,dollAttackEffects:()=>doll,event:(c,kind,at,e)=>{c.events.push({seq:++c.eventSeq,kind,at,hp:c.hp,mp:c.mp,...e});},award:(c)=>{ctx.syncTarget(c);}};
 vm.createContext(ctx);
 const n=broken?normal.replace(/applyWeaponMagic\(c,now,rng,target,skill==='sk_elf_triple'\)/g,"applyWeaponMagic(c,now,rng,skill==='sk_elf_triple'?target:undefined)").replace(/applyDollAttack\(c,now,rng,target\)/g,"applyDollAttack(c,now,rng,skill==='sk_elf_triple'?target:undefined)"):normal;
 vm.runInContext(stripTypeScriptTypes(helpers+n),ctx);ctx.normalWeaponAttack(c,c.arena[0],0,()=>0,undefined,skill);return {c,ctx,attacks:c.events.filter(e=>e.kind==='attack')};
}
test('reproduces kill-A then doll automatically attacking B/C inside the same old swing',()=>{
 const before=run({strike:100,broken:true});assert.ok(new Set(before.attacks.map(e=>e.uid)).size>1);
});
test('a lethal main swing cannot transfer its attached doll damage to the next monster',()=>{
 const after=run({strike:100});assert.deepEqual(after.attacks.map(e=>e.uid),['A']);assert.equal(after.c.arena[1].hp,10);assert.equal(after.c.arena[2].hp,10);
});
test('if the first attached doll hit kills A, the next attached hit cannot jump to B',()=>{
 const after=run();assert.deepEqual(after.attacks.map(e=>e.uid),['A','A']);assert.equal(after.c.arena[1].hp,10);
 // B may be attacked by a subsequent independent swing.
 after.ctx.normalWeaponAttack(after.c,after.c.arena[1],1000,()=>0);assert.equal(after.c.events.find(e=>e.kind==='attack'&&e.at===1000).uid,'B');
});
test('a single-target weapon proc that kills A does not redirect doll damage to B',()=>{
 const after=run({magic:{type:'atk',target:'one',n:'magic'}});assert.deepEqual(after.attacks.map(e=>e.uid),['A','A']);assert.equal(after.c.arena[1].hp,10);
});
test('explicit AoE weapon magic keeps its intended victims, while main physical attack stays single target',()=>{
 const after=run({magic:{type:'atk',target:'all',n:'AoE'}});
 assert.deepEqual(after.attacks.filter(e=>e.source==='physical').map(e=>e.uid),['A']);
 assert.deepEqual(after.attacks.filter(e=>e.weaponProc).map(e=>e.uid),['A','B','C']);
 assert.equal(after.attacks.filter(e=>e.source==='doll').length,0);
});
test('triple-arrow attached magic keeps the existing single-target restriction',()=>{
 const after=run({magic:{type:'atk',target:'all',n:'AoE'},skill:'sk_elf_triple'});assert.deepEqual(after.attacks.map(e=>e.uid),['A','A']);assert.equal(after.c.arena[1].hp,10);
});
test('visible secondary-source captions distinguish real extra damage without changing damage numbers',()=>{
 assert.equal(damageSourceLabel({source:'physical',kind:'attack'}),undefined);
 for(const [e,label] of [[{source:'doll'},'娃娃'],[{source:'pet'},'寵物'],[{source:'summon'},'召喚'],[{weaponProc:true,source:'magic'},'武器魔法']])assert.equal(damageSourceLabel(e),label);
 assert.equal(damageDisplay({damage:45,source:'magic'}).text,'✦ -45');
});
test('server normal attacks issue stable distinct IDs; proc and skill damage remain independent',()=>{
 const eventSource=section('event','function replacement');
 const ctx={observeHuntHealth:()=>{},offlineEventRecordingAfter:new WeakMap(),petNamesOut:()=>[],ensurePet:()=>{},petSnapshot:()=>[],POLYMORPH:{forms:[]}};
 vm.createContext(ctx);vm.runInContext(stripTypeScriptTypes(eventSource),ctx);
 const c={id:'player1',eventSeq:0,hp:100,mp:100};
 ctx.event(c,'attack',0,{uid:'A',source:'physical'});
 ctx.event(c,'attack',400,{uid:'A',source:'physical'});
 ctx.event(c,'attack',400,{uid:'A',source:'magic',skill:'proc',weaponProc:true});
 ctx.event(c,'attack',800,{uid:'B',source:'physical',skill:'sk_elf_triple'});
 assert.equal(c.events[0].attackId,'player1:1');assert.equal(c.events[1].attackId,'player1:2');
 assert.equal(c.events[2].attackId,undefined);assert.equal(c.events[3].attackId,undefined);
 assert.equal(structuredClone(c.events[0]).attackId,c.events[0].attackId);
});

