const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync('/tmp/post-cast-');
try{
fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
for(const name of fs.readdirSync(path.join(root,'lib/game'))){const from=path.join(root,'lib/game',name);if(name.endsWith('.json'))fs.copyFileSync(from,path.join(dir,name));else if(name.endsWith('.ts'))fs.writeFileSync(path.join(dir,name.replace(/\.ts$/,'.js')),ts.transpileModule(fs.readFileSync(from,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText);}
const game=name=>require(path.join(dir,name+'.js'));
const {pushCue,advanceMotion,durationFor}=game('animation-clock');
const {playerCues}=game('animation-cues');
const {enqueueCombatReplay,drainCombatPresentation}=game('combat-presentation');
const duration=k=>durationFor(k,12,1.2,1.4);
// Reproduce the long cast pose covering a normal attack which already landed.
let state={kind:'skill',at:0,duration:1400,pending:[]};
state=pushCue(state,{seq:2,kind:'attack',at:200},200,duration,false,true);
assert.equal(state.kind,'attack');assert.equal(state.at,200);assert.equal(state.pending.length,0);
assert.equal(advanceMotion(state,700,duration).kind,'attack');
// Incoming damage cannot reset a player's cast; a real new cast can replace flinch.
state={kind:'skill',at:0,duration:1400,pending:[]};
assert.deepEqual(pushCue(state,{seq:3,kind:'hurt',at:100},100,duration,false,true),state);
state=pushCue({kind:'hurt',at:0,duration:1500,pending:[]},{seq:4,kind:'skill',at:100},100,duration,false,true);assert.equal(state.kind,'skill');assert.equal(state.at,100);
// Monster skill and spawn/death priority remain distinct from the player policy.
state=pushCue({kind:'skill',at:0,duration:1400,pending:[]},{seq:5,kind:'attack',at:200},200,duration);assert.equal(state.kind,'skill');assert.equal(state.pending[0].seq,5);
state=pushCue({kind:'spawn',at:0,duration:1000,pending:[]},{seq:6,kind:'attack',at:200},200,duration,false,true);assert.equal(state.kind,'spawn');
state=pushCue({kind:'death',at:0,duration:1000,pending:[]},{seq:7,kind:'attack',at:200,immediate:true},200,duration,false,true);assert.equal(state.kind,'death');
const base={hp:100,mp:100,slot:0,uid:'mob',mob:'ant'};
let replay=enqueueCombatReplay([],[{...base,seq:1,at:1000,kind:'magic',skill:'sk_heal1',manual:true}],5000,null,true);
const clock=replay.offset;assert.equal(clock,4000);assert.equal(drainCombatPresentation(replay.queue,[],5000).length,1);
for(const [seq,at,arrived] of [[2,1200,5300],[3,2400,6600],[4,3600,7900],[5,4800,9300]]){
 replay=enqueueCombatReplay(replay.queue,[{...base,seq,at,kind:'attack',source:'physical',damage:10}],arrived,replay.offset,true);
 assert.equal(replay.offset,clock,'post-cast packets do not rebuild the 650ms buffer');
 const shown=drainCombatPresentation(replay.queue,[],arrived);assert.equal(shown.length,1);assert.equal(shown[0].seq,seq);
 const cue=playerCues(shown)[0];state=pushCue({kind:'skill',at:arrived-100,duration:1400,pending:[]},cue,arrived,duration,false,true);assert.equal(state.kind,'attack');assert.equal(state.at,arrived);
}
// Confirmed bow attacks retain their actual flight deadline and late lethal ordering.
const pending=[];replay=enqueueCombatReplay([],[{...base,seq:6,at:5000,kind:'attack',damage:100,source:'physical',mobHp:0},{...base,seq:7,at:5000,kind:'loot',item:'test'}],9400,clock,true);
let shown=drainCombatPresentation(replay.queue,pending,9400,true);assert.deepEqual(shown.map(x=>x.visualPhase),['launch']);assert.equal(pending[0].due,9600);
assert.equal(drainCombatPresentation(replay.queue,pending,9599,true).length,0);shown=drainCombatPresentation(replay.queue,pending,9600,true);assert.deepEqual(shown.map(x=>x.kind),['attack','loot']);assert.equal(shown[0].visualPhase,'impact');
// Triple bursts still release three distinct arrows instead of accumulating animation poses.
state={kind:'attack',at:0,duration:1200,pending:[]};
for(const [i,now]of [0,70,140].entries()){state=pushCue(state,{seq:10+i,kind:'attack',at:now,immediate:true,durationMs:70},now,duration,false,true);assert.ok(state.at+state.duration<=now+70);}
// The authoritative attack clock continues through automatic attack/heal casts.
const e=game('engine'),auto=game('auto-config'),monsters=game('monster-config'),start=1000000;
const allocation={};let left=e.BASES.mage.pts;for(const key of ['str','dex','con','int','wis','cha']){allocation[key]=Math.min(left,20-e.BASES.mage[key]);left-=allocation[key];}
const c=e.createCharacter('銜接測試','mage','m',allocation,start),save=e.emptySave(start);save.characters=[c];save.active=c.id;c.lv=99;c.attrs.con=100000;c.attrs.wis=60;c.autoPotion=false;c.skills=['sk_blaze','sk_heal1'];c.autoConfig={...auto.autoConfig(c),attack:'sk_blaze',opener:'',heal:'sk_heal1',healBelow:100,convert:'',mpAbove:0,aux:{},buffs:[]};c.running=true;e.ensureArena(c,()=>.5,start);for(const target of c.arena){target.definition={...monsters.defaultMonster(target.id),hp:100000000,hpRegen:0,damageMin:0,damageMax:0,spells:[]};target.hp=target.maxHp=100000000;}const stats=e.stats(c,start);c.hp=Math.floor(stats.maxHp/2);c.mp=stats.maxMp;for(let t=1000;t<=10000;t+=1000)e.advance(save,start+t,()=>.5);const hits=c.events.filter(x=>x.kind==='attack'&&!x.skill&&x.source==='physical');assert.ok(hits.length>=Math.floor(10/stats.attackInterval));for(let i=1;i<hits.length;i++)assert.ok(Math.abs(hits[i].at-hits[i-1].at-stats.attackInterval*1000)<=1);assert.ok(c.events.filter(x=>x.kind==='magic'&&x.skill==='sk_blaze').length>=5);assert.ok(c.events.some(x=>x.kind==='magic'&&x.skill==='sk_heal1'));
console.log('PASS: cast-to-normal handoff has no visual lock; hit reaction cannot stall casting; live replay remains on the confirmed post-cast clock; bow impact/loot order and triple cadence retained; monster/spawn/death priority unchanged.');

}finally{fs.rmSync(dir,{recursive:true,force:true});}
