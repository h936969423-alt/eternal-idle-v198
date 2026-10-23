const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const {enqueueCombatReplay,drainCombatPresentation,applyCombatViewEvent}=require('../lib/game/combat-presentation.ts');
const {playerCues,monsterCues}=require('../lib/game/animation-cues.ts');
const {combatArrowFlight,TRIPLE_FLIGHT_MS}=require('../lib/game/player-sprite-layout.ts');
function fixture(manual=false,miss=false){
 const events=[0,70,140].map((at,i)=>({seq:i+1,at,kind:'attack',skill:'sk_elf_triple',source:'physical',slot:0,uid:'mob',mob:'test',damage:miss?0:10,mobHp:miss?30:20-i*10,hp:100,mp:85,manual,miss}));events.push({seq:4,at:0,kind:'magic',skill:'sk_elf_triple',hp:100,mp:85,manual});
 return {queue:enqueueCombatReplay([],events,1000,null).queue,pending:[],view:{hp:100,mp:100,arena:[{uid:'mob',id:'test',hp:30,clock:0}],floats:[]},events};
}
function tick(s,at){const out=drainCombatPresentation(s.queue,s.pending,at);for(const e of out)s.view=applyCombatViewEvent(s.view,e,at);return out;}
for(const manual of [false,true]){
 const s=fixture(manual);const launched=tick(s,1000);assert.equal(s.view.arena[0].hp,30);assert.equal(s.view.floats.length,0);assert.equal(s.view.mp,85,'MP cost is visible on launch');assert.equal(playerCues(launched).length,1);assert.equal(playerCues(launched)[0].immediate,true);assert.equal(monsterCues(launched,'mob').length,0);
 assert.equal(s.pending[0].due,1200);tick(s,1070);tick(s,1140);tick(s,1199);assert.equal(s.view.arena[0].hp,30);assert.equal(s.view.floats.length,0);
 const first=tick(s,1200);assert.equal(s.view.arena[0].hp,20);assert.equal(s.view.floats.length,1);assert.equal(playerCues(first).length,0,'impact does not fire another arrow');assert.equal(monsterCues(first,'mob').length,1);assert.equal(monsterCues(first,'mob')[0].immediate,true);
 s.view=applyCombatViewEvent(s.view,{seq:9,at:220,kind:'heal',damage:15,hp:115,mp:99},1220);
 tick(s,1270);assert.equal(s.view.arena[0].hp,10);assert.equal(s.view.hp,115);assert.equal(s.view.mp,99);
 tick(s,1339);assert.equal(s.view.arena[0].hp,10);tick(s,1340);assert.equal(s.view.arena[0].hp,0);assert.equal(s.view.floats.filter(e=>e.kind==='attack').length,3);
 assert.deepEqual(s.view.actions.filter(e=>e.visualPhase==='launch').map(e=>e.visualAt),[1000,1070,1140]);assert.deepEqual(s.view.actions.filter(e=>e.visualPhase==='impact').map(e=>e.shownAt),[1200,1270,1340]);
 assert.ok(!s.pending.length&&!s.queue.length);
}
const missed=fixture(false,true);tick(missed,1000);assert.equal(missed.view.floats.length,0);tick(missed,1200);assert.equal(missed.view.floats[0].miss,true);assert.equal(missed.view.arena[0].hp,30);assert.equal(monsterCues(missed.view.actions,'mob').length,0);
const killed=fixture();killed.queue=killed.queue.filter(e=>e.seq===1);killed.queue[0].mobHp=0;killed.queue[0].damage=30;killed.queue.push({seq:10,at:0,due:1000,kind:'loot',slot:0,uid:'mob',hp:100,mp:85});const before=tick(killed,1000);assert.ok(!before.some(e=>e.kind==='loot'));assert.equal(killed.view.arena[0].hp,30);const after=tick(killed,1200);assert.equal(killed.view.arena[0].hp,0);assert.equal(after.filter(e=>e.kind==='loot').length,1);
const replaced=fixture();tick(replaced,1000);replaced.view.arena[0]={uid:'new',id:'test',hp:99,clock:0};tick(replaced,1200);assert.equal(replaced.view.arena[0].hp,99);assert.equal(replaced.view.floats.length,0,'old flight cannot damage a replacement');
const delayed=fixture();tick(delayed,2000);assert.equal(delayed.view.arena[0].hp,30);tick(delayed,2199);assert.equal(delayed.view.floats.length,0);tick(delayed,2200);assert.equal(delayed.view.arena[0].hp,0,'a stalled frame lands flights once, without duplicate damage');
const s=fixture();tick(s,1000);const due=s.pending[0].due;s.queue=enqueueCombatReplay(s.queue,[{seq:8,at:40,kind:'state',hp:100,mp:85}],1040,1000).queue;assert.equal(s.pending[0].due,due,'a network update never moves an in-flight impact');
const flight=combatArrowFlight({x:0,y:0},{x:999,y:400},1,'sk_elf_triple');assert.equal(flight.delay+flight.duration,TRIPLE_FLIGHT_MS);
console.log('PASS: manual/auto triple launches at 0/70/140ms; HP, numbers, hurt/death and loot wait until impact at 200/270/340ms; misses, recovery, replacement, slow frames and network updates are safe.');

// Ordinary bow hits use the same presentation clock at 200ms, including lethal drops.
const bow={queue:[{seq:1,at:0,due:1000,kind:'attack',source:'physical',slot:0,uid:'old',damage:30,mobHp:0,hp:100,mp:80},{seq:2,at:0,due:1000,kind:'loot',uid:'old',slot:0,hp:100,mp:80},{seq:3,at:0,due:1000,kind:'spawn',slot:0,uid:'new',spawn:{uid:'new',id:'test',hp:99,clock:0},hp:100,mp:80}],pending:[],view:{hp:100,mp:100,arena:[{uid:'old',id:'test',hp:30,clock:0}],floats:[]}};
function bowTick(at){const out=drainCombatPresentation(bow.queue,bow.pending,at,true);for(const e of out)bow.view=applyCombatViewEvent(bow.view,e,at);return out;}
const launch=bowTick(1000);assert.deepEqual(launch.map(e=>e.visualPhase),['launch']);assert.equal(bow.view.arena[0].hp,30);assert.equal(bow.view.mp,80);assert.equal(bow.view.floats.length,0);
bowTick(1199);assert.equal(bow.view.arena[0].uid,'old');const impact=bowTick(1200);assert.deepEqual(impact.map(e=>e.kind),['attack','loot','spawn']);assert.equal(bow.view.arena[0].uid,'new');assert.equal(bow.view.arena[0].hp,99);assert.equal(bow.view.floats.length,1);assert.equal(bowTick(1400).length,0);
assert.equal(combatArrowFlight({x:0,y:0},{x:1000,y:0},2).duration,200);assert.equal(combatArrowFlight({x:0,y:0},{x:10,y:0},.2).delay,0);
for(const source of ['magic','pet','summon','poison','doll']){const q=[{seq:1,at:0,due:0,kind:'attack',source,slot:0,uid:'m',damage:1,hp:10,mp:0}];assert.equal(drainCombatPresentation(q,[],0,true)[0].visualPhase,undefined);}
const {damageDisplay}=require('../lib/game/damage-display.ts');
assert.deepEqual(damageDisplay({damage:123,source:'physical',critical:true}),{kind:'physical-damage',text:'-123!'});
assert.deepEqual(damageDisplay({damage:45,source:'magic'}),{kind:'magic-damage',text:'✦ -45'});
assert.deepEqual(damageDisplay({miss:true,critical:true}),{kind:'miss',text:'MISS'});
console.log('PASS: normal bow impact at 200ms, MP on launch, lethal loot/spawn ordering, one-time impact, other damage sources immediate, critical/magic/MISS formatting.');

// Mixed attacks retain their independent 200ms impacts and delay lethal drops.
const {prepareCombatHealth}=require('../lib/game/combat-presentation.ts');
const {pushCue}=require('../lib/game/animation-clock.ts');
const make=(seq,at,damage,mobHp,skill)=>({seq,at,due:at,kind:'attack',source:'physical',slot:0,uid:'mixed',damage,mobHp,hp:100,mp:90,...(skill?{skill}:{})});
const mixedEvents=[make(1,0,20,10),make(2,50,10,0,'sk_elf_triple'),{seq:3,at:50,due:50,kind:'loot',uid:'mixed',slot:0,hp:100,mp:90},{seq:4,at:60,due:60,kind:'spawn',uid:'replacement',slot:0,spawn:{uid:'replacement',id:'test',hp:99,maxHp:99,clock:0},hp:100,mp:90}];
const mixed={queue:prepareCombatHealth(mixedEvents,new Map([['mixed',30]])),pending:[],view:{hp:100,mp:100,arena:[{uid:'mixed',id:'test',hp:30,maxHp:30,clock:0}],floats:[]}};
function mixedTick(at){const out=drainCombatPresentation(mixed.queue,mixed.pending,at,true);for(const e of out)mixed.view=applyCombatViewEvent(mixed.view,e,at);return out;}
mixedTick(0);mixedTick(50);mixedTick(60);mixedTick(199);assert.equal(mixed.view.arena[0].hp,30);const normal=mixedTick(200);assert.equal(mixed.view.arena[0].hp,10);assert.ok(!normal.some(e=>e.kind==='loot'));assert.equal(mixed.view.floats.length,1);const slow=mixedTick(250);assert.deepEqual(slow.map(e=>e.kind),['attack','loot','spawn']);assert.equal(mixed.view.arena[0].hp,99);assert.equal(mixed.view.floats.length,2);assert.equal(mixedTick(300).length,0);
// Healing snapshots carry only their own recovery, even with an arrow in flight.
const health=new Map([['mixed',100]]);const healing=prepareCombatHealth([make(1,0,10,90),{seq:2,at:20,kind:'state',casterSlot:0,uid:'mixed',mobHp:95,hp:100,mp:90}],health);
assert.equal(healing[1].visualHpDelta,5);let hv={hp:100,mp:100,arena:[{uid:'mixed',id:'test',hp:100,maxHp:100,clock:0}],floats:[]};hv=applyCombatViewEvent(hv,healing[1],20);assert.equal(hv.arena[0].hp,100);assert.equal(hv.healthCredits.mixed,5);hv=applyCombatViewEvent(hv,{...healing[0],visualPhase:'impact'},200);assert.equal(hv.arena[0].hp,95);
let pose={kind:'attack',at:0,duration:1200,pending:[]};pose=pushCue(pose,{seq:2,kind:'attack',at:50,immediate:true,durationMs:70},50,()=>1200,false,true);assert.equal(pose.at,0,'triple preserves normal attack animation origin');assert.equal(pose.duration,120);pose=pushCue(pose,{seq:3,kind:'attack',at:60,immediate:true},60,()=>1200,false,true);assert.equal(pose.at,0);assert.equal(pose.duration,120);assert.equal(pushCue({...pose,kind:'death'},{seq:4,kind:'attack',immediate:true},70,()=>90,false,true).kind,'death');
console.log('PASS: mixed flight HP deltas, delayed lethal drops/replacement, regeneration during flight, no restart of active player swing, unchanged death priority.');
