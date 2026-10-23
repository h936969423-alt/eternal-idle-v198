const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true,target:ts.ScriptTarget.ES2022}}).outputText,f);
const {replayOffset,replayHasGap}=require('../lib/game/replay-timing.ts');
const {durationFor,advanceMotion,pushCue}=require('../lib/game/animation-clock.ts');
const {persistedSave,responseSave,mergeGameSave}=require('../lib/game/state-sync.ts');
// Normal network jitter must retain one playout clock and the original hit spacing.
let offset=replayOffset([{at:0},{at:400}],700,null);assert.equal(offset,1350);
for(const [at,arrived] of [[800,1100],[1200,2300],[1600,2400],[2000,3000]])assert.equal(replayOffset([{at}],arrived,offset),offset);
const recovered=replayOffset([{at:2400}],4500,offset);assert.equal(2400+recovered,5150,'a real underrun rebuilds a bounded buffer');
const large=replayOffset([{at:0},{at:4000}],5000,null);assert.ok(4000+large<=6500);
assert.equal(replayOffset([],10,123),123);
// A short offline packet can omit a spawn without exceeding 160 events.
assert.equal(replayHasGap([{seq:101},{seq:102}],100),false);
assert.equal(replayHasGap([{seq:105},{seq:106}],100),true);
assert.equal(replayHasGap([],100),false);
// Real 8-frame clips fit the fastest 200ms attack. Priority poses stay bounded.
const duration=k=>durationFor(k,8,.2,1);
assert.equal(duration('attack'),200);
let state={kind:'idle',at:0,duration:Infinity,pending:[]};
for(let n=0;n<100;n++){const now=n*200;state=advanceMotion(state,now,duration);state=pushCue(state,{seq:n,at:now,kind:'attack'},now,duration);assert.equal(state.pending.length,0);}
state={kind:'skill',at:0,duration:1000,pending:[]};
for(let n=0;n<20;n++)state=pushCue(state,{seq:n,at:n*20,kind:'attack'},n*20,duration);
assert.equal(state.kind,'skill');assert.equal(state.pending.length,1);assert.equal(state.pending[0].seq,19);
state=advanceMotion(state,1000,duration);assert.equal(state.kind,'attack');assert.equal(state.pending.length,0);
state=pushCue(state,{seq:21,at:1010,kind:'death'},1010,duration);assert.equal(state.kind,'death');
assert.equal(pushCue(state,{seq:22,at:1020,kind:'attack'},1020,duration).kind,'death');
// Delta transport preserves canonical state, distinct characters and GM changes.
const defs={test:{name:'GM setting',abilities:[{key:'str',value:3}]}};
const character=(id,seq)=>({id,bag:{potion_heal:999},equipment:{weapon:{id:'wpn_01',en:7}},events:Array.from({length:160},(_,i)=>({seq:seq-159+i,at:(seq-159+i)*100,kind:'attack',hp:10,mp:20})),eventSeq:seq,dollDefinitions:defs,mapPools:{test:{count:3,respawnSeconds:5}},monsterDefinitions:{mob:{hp:777}},bossGeneration:{},bossDropDefinitions:{}});
const old={v:1,active:'a',at:1000,characters:[character('a',160),character('b',160)]};
const next=structuredClone(old);next.at=2000;next.characters[0]=character('a',163);next.characters[0].bag.potion_heal=998;
const original=JSON.stringify(next),full=responseSave(next,'1:2:3:4');
const delta=responseSave(next,'1:2:3:4',{character:'a',after:160,settingsKey:'1:2:3:4'});
assert.equal(delta.sync.deltaCharacter,'a');assert.equal(delta.save.characters[0].events.length,3);
assert.equal(delta.save.characters[0].dollDefinitions,undefined);
assert.deepEqual(mergeGameSave(old,delta.save,delta.sync),next);
assert.equal(JSON.stringify(next),original,'projection must never mutate combat state');
assert.equal(responseSave(next,'1:2:4:4',{character:'a',after:160,settingsKey:'1:2:3:4'}).sync.definitionsIncluded,true);
assert.equal(responseSave(next,'1:2:3:4',{character:'b',after:160,settingsKey:'1:2:3:4'}).sync.definitionsIncluded,true);
for(const after of [-1,999,0])assert.equal(responseSave(next,'1:2:3:4',{character:'a',after,settingsKey:'1:2:3:4'}).sync.deltaCharacter,null);
const stored=persistedSave(next);assert.equal(stored.characters[0].dollDefinitions,undefined);assert.deepEqual(stored.characters[0].bag,next.characters[0].bag);assert.deepEqual(stored.characters[0].events,next.characters[0].events);
// Reload the persisted form with fresh GM definitions, as both write routes do.
const reload=JSON.parse(JSON.stringify(stored));for(let i=0;i<reload.characters.length;i++)for(const key of ['dollDefinitions','mapPools','monsterDefinitions','bossGeneration','bossDropDefinitions'])reload.characters[i][key]=next.characters[i][key];assert.deepEqual(reload,next);
console.log(`PASS: lag recovery, fast clips, bounded poses, death priority, delta reconstruction, GM invalidation and save reload. Active event payload ${Buffer.byteLength(JSON.stringify(full.save.characters[0].events))} -> ${Buffer.byteLength(JSON.stringify(delta.save.characters[0].events))} bytes.`);

const {addCombatFloat,scheduleReplay}=require('../lib/game/combat-presentation.ts');
let floats=[];for(let seq=1;seq<=8;seq++)floats=addCombatFloat(floats,{seq,at:seq,kind:'attack',slot:0,uid:'one',hp:10,mp:0,damage:25},100);
assert.equal(new Set(floats.map(f=>f.lane)).size,8);
assert.equal(addCombatFloat(floats,{seq:9,kind:'attack',slot:1,uid:'two',hp:10,mp:0},110).at(-1).lane,0);
assert.equal(addCombatFloat(floats,{seq:10,kind:'attack',slot:0,uid:'one',hp:10,mp:0},1000).at(-1).lane,0);
const scheduled=scheduleReplay([0,200,400,600].map((due,seq)=>({due,at:due,seq,kind:'attack',hp:10,mp:0})),1000);
assert.ok(scheduled.every(e=>e.due>=1000&&e.due<=1600));assert.equal(new Set(scheduled.map(e=>e.due)).size,4);assert.deepEqual(scheduled.map(e=>e.seq),[0,1,2,3]);assert.deepEqual(scheduled.map(e=>e.due),[1000,1200,1400,1600],'late packets preserve 200ms hit gaps');const future=[{due:1500,at:0,seq:1}];assert.equal(scheduleReplay(future,1000),future);const long=scheduleReplay([0,2000,4000].map((due,seq)=>({due,at:due,seq})),5000);assert.equal(long.at(-1).due,6500,'long backlogs remain bounded');
state={kind:'attack',at:0,duration:200,pending:[]};
state=pushCue(state,{seq:100,at:50,kind:'hurt'},50,duration,false,true);assert.equal(state.kind,'attack');
state={kind:'hurt',at:0,duration:1000,pending:[]};state=pushCue(state,{seq:101,at:100,kind:'attack'},100,duration,false,true);assert.equal(state.kind,'attack');
console.log('PASS: separate floating lanes, paced late deliveries, incoming hits cannot stall player attack; death priority preserved.');

// Slow attacks must not finish their pose before the next scheduled swing.
assert.equal(durationFor('attack',4,1.6,1),1600);
const slow=k=>durationFor(k,4,1.6,1);
let slowState=pushCue({kind:'idle',at:0,duration:Infinity,pending:[]},{seq:1,kind:'attack',at:0},0,slow,false,true);
assert.equal(advanceMotion(slowState,1599,slow).kind,'attack');
assert.equal(pushCue(slowState,{seq:2,kind:'hurt',at:800},800,slow,false,true).kind,'attack');
assert.equal(durationFor('attack',4,0),500,'monster default timing unchanged');
