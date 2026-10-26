const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const feedback=require('../lib/game/cast-feedback.ts'),{playerCues}=require('../lib/game/animation-cues.ts'),{pushCue,durationFor}=require('../lib/game/animation-clock.ts'),{enqueueCombatReplay,drainCombatPresentation}=require('../lib/game/combat-presentation.ts');
const intent={id:1,characterId:'mage',skill:'sk_meteor',at:100,afterSeq:10},duration=k=>durationFor(k,5,1.2,1);
const base={kind:'attack',hp:100,mp:100,damage:50,skill:'sk_meteor',source:'magic',manual:true,slot:0,uid:'mob',at:100000};
const save={active:'mage',characters:[{id:'mage',hp:100,mp:100,bag:{coin:17},events:[{...base,seq:9},{...base,seq:11},{...base,seq:12,slot:1},{...base,seq:13,kind:'magic'},{...base,seq:14,skill:'sk_blaze'},{...base,seq:15,manual:false}]},{id:'other',events:[{...base,seq:30}]}]};
const original=JSON.stringify(save),confirmed=feedback.attachCastFeedback(save,intent);
assert.equal(JSON.stringify(save),original,'response annotation does not mutate source saves');
for(const seq of [11,12,13])assert.equal(confirmed.characters[0].events.find(e=>e.seq===seq).visualCastAt,100);
for(const seq of [9,14,15])assert.equal(confirmed.characters[0].events.find(e=>e.seq===seq).visualCastAt,undefined);
assert.equal(confirmed.characters[1].events[0].visualCastAt,undefined);assert.equal(confirmed.characters[0].mp,100);assert.equal(confirmed.characters[0].bag.coin,17);
const ready=confirmed.characters[0].events.filter(e=>[11,12,13].includes(e.seq));
let state={kind:'attack',at:0,duration:1200,pending:[]};
const cue=playerCues(ready)[0];assert.equal(cue.displayAt,100);assert.equal(cue.immediate,true);
state=pushCue(state,cue,300,duration,false,true);assert.equal(state.at,100,'fast confirmation continues the original windup');
const normal={kind:'attack',at:1000,duration:1200,pending:[]};assert.equal(pushCue(normal,cue,1300,duration,false,true),normal,'1.2s confirmation cannot replay an expired cast or stop a current swing');
assert.equal(pushCue({...normal,kind:'death'},cue,300,duration,false,true).kind,'death');
const packet=enqueueCombatReplay([],ready,1300,1650);assert.equal(packet.queue[0].due,1300,'confirmed spell release stays immediate on arrival');assert.equal(drainCombatPresentation(packet.queue,[],1299).length,0,'click feedback cannot release real hits early');assert.equal(drainCombatPresentation(packet.queue,[],1300).filter(e=>e.kind==='attack').length,2,'AoE confirmed hits remain exactly once');
// Execute the actual React feedback hook with a stalled 1.2s network response.
let hooks=[],deps=[],cleanups=[],effects=[],cursor=0,clock=100,next=0,raf=new Map(),updates=0;
const react={useState:v=>{const i=cursor++;if(!(i in hooks))hooks[i]=v;return [hooks[i],v=>{hooks[i]=v;updates++;}];},useEffect:(f,d)=>{const i=cursor++;if(!deps[i]||d.some((v,j)=>v!==deps[i][j])){effects.push(()=>{cleanups[i]?.();cleanups[i]=f();});deps[i]=d;}}};
const mod={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/use-cast-feedback.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:mod.exports,require:id=>id==='react'?react:feedback,requestAnimationFrame:f=>{raf.set(++next,f);return next;},cancelAnimationFrame:id=>raf.delete(id)});
const render=(i=intent,owner='mage',dead=false)=>{cursor=0;const pose=mod.exports.useCastFeedback(i,owner,5,1,dead);for(const effect of effects.splice(0))effect();return pose;};
assert.equal(render().frame,0,'first click render starts casting before any response');
let max=0;
for(clock=116;clock<=1300;clock+=16){const jobs=[...raf.values()];raf.clear();for(const f of jobs)f(clock);const pose=render();if(pose)max=Math.max(max,pose.frame);}
assert.equal(max,4);assert.equal(render(),undefined,'long network delay does not loop or freeze the windup');assert.equal(raf.size,0);assert.ok(updates<=6,'five source frames do not trigger 60 React updates');
assert.equal(render(undefined),undefined,'rejection/cancellation immediately restores ordinary motion');assert.equal(render(intent,'other'),undefined);assert.equal(render(intent,'mage',true),undefined);
const triple={...intent,skill:'sk_elf_triple',at:1500};assert.equal(feedback.castFeedbackPose(triple,'mage',1500,5,1),undefined,'triple still waits for confirmed launch and 70ms release timing');assert.equal(feedback.attachCastFeedback(save,triple),save);
for(const f of cleanups)f?.();assert.equal(raf.size,0);
console.log('PASS: actual hook casts on first click render during a simulated 1.2s response wait; confirmed poses hand off without replay, expired previews cannot stop normal swings; failed/other/dead actors and triple are isolated; no predicted MP, damage, projectiles or loot.');


// One visual owner across preview and confirmed AoE/status packets.
const predicted={...intent,effectPreviewed:true},annotated=feedback.attachCastFeedback(save,predicted);
let visual={hp:100,mp:100,arena:[{uid:'mob',id:'test',hp:100,clock:0},{uid:'other',id:'test',hp:100,clock:0}],floats:[]};
for(const event of annotated.characters[0].events.filter(e=>[11,12,13].includes(e.seq)))visual=require('../lib/game/combat-presentation.ts').applyCombatViewEvent(visual,event,1300);
assert.equal((visual.casts||[]).length,0,'confirmation cannot replay an already previewed graphic');
assert.equal(visual.floats.filter(x=>x.kind==='attack').length,2,'all authoritative damage numbers still render');
assert.ok(feedback.canPreviewSpellEffect('sk_meteor'));
for(const skill of ['sk_shock_stun','sk_elf_triple','sk_lightarrow','sk_shield'])assert.equal(feedback.canPreviewSpellEffect(skill),false,skill+' retains confirmed-only effect');
const arena=fs.readFileSync('app/battle-arena.tsx','utf8');assert.ok(arena.includes('pendingCast?.effectPreviewed'));assert.ok(!arena.includes('!((view.casts||[]).some'),'confirmation must not unmount the preview and replace it with a second effect');
console.log('PASS: one click / one effect; fast and late AoE confirmations do not create extra graphics; damage, poses, projectiles, buffs and stun success remain authoritative.');
