const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const {applyCombatViewEvent}=require('../lib/game/combat-presentation.ts');
const {playerCues}=require('../lib/game/animation-cues.ts');
const {pushCue}=require('../lib/game/animation-clock.ts');
const initial=()=>({hp:100,mp:100,arena:[{uid:'a',hp:1000,maxHp:1000},{uid:'b',hp:1000,maxHp:1000}],floats:[]});
const hit={seq:1,at:1000,kind:'attack',skill:'sk_frost_spike',source:'magic',uid:'a',slot:0,hp:100,mp:90,mobHp:980,damage:20};
let v=applyCombatViewEvent(initial(),hit,2000);
v=applyCombatViewEvent(v,{...hit,seq:2,kind:'magic',targetEffects:{burn:{until:9000,value:1}}},2000);
assert.equal(v.casts.length,1,'damage and status share exactly one graphic');
assert.equal(v.arena[0].hp,980);assert.ok(v.arena[0].effects.burn,'status still applies');assert.equal(v.floats.length,1);
v=applyCombatViewEvent(v,{...hit,seq:3,slot:1,uid:'b'},2000);assert.equal(v.casts.length,2,'AoE preserves separate targets');
v=applyCombatViewEvent(v,{...hit,seq:4,at:1001},2001);assert.equal(v.casts.length,3,'a distinct cast is never suppressed');
v=applyCombatViewEvent(v,{...hit,seq:5,source:'doll',dollId:'one'},2001);assert.equal(v.casts.length,4,'another actor retains its own graphic');
v=applyCombatViewEvent(v,{...hit,seq:6,weaponProc:true},2001);assert.equal(v.casts.length,5,'weapon proc is independent of a player spell');
// The old-id stun's success-only ring (狀態命中/衝暈失敗) was retired with sk_shock_stun; 衝擊之暈 is lw_skill_400.
// Triple Arrow (either id) shows only its three arrows and plain numbers (afei style): no per-shot ring.
for(const skill of ['sk_elf_triple','lw_skill_450']){let triple=initial();for(let i=0;i<3;i++)triple=applyCombatViewEvent(triple,{...hit,seq:i+1,skill,at:1000+i*70},2000+i*70);assert.equal(triple.casts.length,0,skill+': triple-shot releases add no skill ring');}
const cue=playerCues([{...hit,skill:undefined,source:'physical',shownAt:2000}])[0];
const motion=pushCue({kind:'skill',at:1800,duration:1400,pending:[]},cue,2000,()=>1200,false,true);
assert.equal(motion.kind,'attack','confirmed melee attack cannot wait behind a cosmetic cast');assert.equal(motion.at,2000);assert.equal(motion.pending.length,0);
const arrow=pushCue({kind:'skill',at:1800,duration:1400,pending:[]},{...cue,immediate:true},2000,()=>1200,false,true);assert.equal(arrow.kind,'attack','confirmed projectile launch also takes over without waiting');
console.log('PASS: damage/status use one visual while keeping authoritative HP/status, AoE, actors, weapon procs, and triple arrows; confirmed melee/projectile attacks immediately replace cosmetic casting.');
