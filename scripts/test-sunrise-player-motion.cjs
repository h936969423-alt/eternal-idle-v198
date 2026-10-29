const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),path=require('node:path');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const motion=require('../lib/game/sunrise-player-motion.ts'),{sunrisePlayerCues}=require('../lib/game/sunrise-player-cues.ts'),{enqueueSunriseReplay,drainCombatPresentation}=require('../lib/game/combat-presentation.ts');
const source=fs.readFileSync(path.join(__dirname,'../tests/fixtures/sunrise-player-motion-source.js'),'utf8');
function oracle(timing,afeiCadence=true){
 const frames=Object.fromEntries(Object.entries(timing.counts).filter(([,n])=>n>0).map(([k,n])=>[k,Array.from({length:n},(_,i)=>({src:`${k}:${i}`,naturalWidth:100}))]));frames.shadow={};frames.weapon={};
 const bv={classList:{contains:k=>k==='area-fit'},appendChild:()=>{}},img=()=>({src:'',style:{}}),el={style:{},parentElement:bv};
 const context={now:0,Date:{now:()=>context.now},MOB_ANIM_FPS:8,PLAYER_BATTLE_WALK:false,_teleportFxUntil:0,CLASS_ANIM_8DIR:new Set(),MORPH_ANIM_3DIR:new Set(),_PM_PRIO:{death:5,hurt:4,skill:3,attack:2,idle:1},_morphBattleCache:{test:frames},_pmState:{act:null,t:0,pendAtk:false,name:'test',el,imgs:{bd:img(),sh:img(),wp:img(),cr:img()}},player:{hp:100,dead:false,avatar:'knight',d:{aspd:timing.attackSeconds,castLock:timing.castSeconds*10}},document:{getElementById:()=>bv},_playerBattleForm:()=>({key:'test',domKey:'test'}),_partySpritePos:()=>({P:{x:'45%',b:2}}),_playerMorphYOffset:()=>0,_playerBattleCrownApply:()=>{},_playerMorphName:()=>null};
 vm.createContext(context);vm.runInContext(source,context);
 // Keep the pinned Sunrise fixture intact. Afei uses a different frame clock:
 // max(20ms, interval / frame count), without Sunrise's 125ms upper clamp.
 // Adapt only this timing boundary; priority and pose transitions still run
 // through the independently pinned original functions.
 if(afeiCadence)vm.runInContext('_atkFrameMs = function(seconds, count) { return Number.isFinite(seconds) && seconds > 0 && count > 0 ? Math.max(20, seconds * 1000 / count) : 125; };',context);
 return context;
}
// Explicit source differences: fast frames and long complete animations.
{
 const t={counts:{idle:2,attack:10,skill:7},attackSeconds:.19,castSeconds:2.8};
 const old=oracle(t,false),afei=oracle(t);
 assert.equal(old._atkFrameMs(.19,10),45);
 assert.equal(afei._atkFrameMs(.19,10),20);
 assert.equal(old._atkFrameMs(2.8,7),125);
 assert.equal(afei._skillFrameMs(7),400);
 assert.equal(motion.sunriseFrameMs(.19,10),20);
 assert.equal(motion.sunriseMotionDuration('skill',t),2800);
}
let comparisons=0;
for(const cls of ['royal','knight','elf','mage','dark'])for(const speed of [.19,.4489,.8,1.3,2.5]){
 const bases={royal:'royal_m',knight:'knight_2hsword',elf:'elf_m_melee',mage:'mage_m',dark:'darkelf'},frames=require('../lib/game/asset-map.json').frames,clips=require('../lib/game/player-animation.ts').playerAnimationClips(bases[cls],frames,2),counts=Object.fromEntries(Object.entries(clips).map(([k,v])=>[k,v.length])),timing={counts,attackSeconds:speed,castSeconds:speed},ref=oracle(timing);let state=motion.emptySunriseClock();
 // Hurt arbitration intentionally differs from the source in a network-fed
 // multi-monster arena. Its starvation reproduction is checked separately below.
 const events=new Map([[0,'attack'],[130,'skill'],[200,'attack'],[350,'skill'],[500,'attack'],[1000,'skill'],[1200,'attack'],[1250,'attack'],[2000,'attack'],[2500,'skill'],[2600,'attack'],[4000,'death']]);
 for(let now=0;now<=4800;now+=10){ref.now=now;if(events.has(now)){const kind=events.get(now);if(kind==='death')ref.player.dead=true;ref._playerMorphTrigger(kind,'sk_test');state=motion.triggerSunriseMotion(state,kind,now,timing);}
  ref._playerMorphApply();state=motion.advanceSunriseMotion(state,now,timing);const p=motion.sunriseMotionPose(state,now,timing),expected=ref._pmState.imgs.bd.src;
  assert.equal(`${p.kind}:${p.frame}`,expected,`${cls} interval=${speed} time=${now}`);assert.equal(state.act,ref._pmState.act);assert.equal(state.pendAtk,!!ref._pmState.pendAtk);comparisons++;
 }
}
{
 const timing={counts:{idle:2,attack:4,skill:4,hurt:2,death:4},attackSeconds:.4,castSeconds:.4},ref=oracle(timing);let state=motion.emptySunriseClock(),oldContacts=0,newContacts=0,oldStart=-1,newStart=-1;
 for(let now=0;now<=3000;now+=25){
  ref.now=now;
  if(now&&now%400===0){ref._playerMorphTrigger('attack');state=motion.triggerSunriseMotion(state,'attack',now,timing);}
  if(now&&now%100===0){ref._playerMorphTrigger('hurt');state=motion.triggerSunriseMotion(state,'hurt',now,timing);}
  ref._playerMorphApply();state=motion.advanceSunriseMotion(state,now,timing);
  if(now%125===0){const pose=motion.sunriseMotionPose(state,now,timing);if(ref._pmState.act==='attack'&&now-ref._pmState.t>=200&&oldStart!==ref._pmState.t){oldContacts++;oldStart=ref._pmState.t;}if(pose.kind==='attack'&&pose.frame>=2&&newStart!==state.t){newContacts++;newStart=state.t;}}
 }
 assert.equal(oldContacts,0,'original hurt priority reproduces contact starvation');assert.ok(newContacts>=5,'network adapter preserves contacts under sustained incoming damage');
}
const b={at:1000,hp:100,mp:90,slot:0,uid:'mob'};
let cues=sunrisePlayerCues([{...b,seq:1,kind:'attack',skill:'sk_meteor'},{...b,seq:2,kind:'attack',skill:'sk_meteor',slot:1},{...b,seq:3,kind:'magic',skill:'sk_meteor'},{...b,seq:4,kind:'magic',skill:'sk_meteor'}]);assert.equal(cues.length,1,'AoE and closing status are one source cast trigger');assert.equal(cues[0].kind,'skill');
assert.equal(sunrisePlayerCues([{...b,seq:5,kind:'attack',visualPhase:'impact'},{...b,seq:6,kind:'magic',source:'monster',skill:'fire'},{...b,seq:7,kind:'magic',weaponProc:true,skill:'fire'}]).length,0);
assert.equal(sunrisePlayerCues([{...b,seq:8,kind:'attack',miss:true}])[0].kind,'attack','source swings even on MISS');
assert.equal(sunrisePlayerCues([{...b,seq:9,kind:'magic',skill:'sk_shock_stun'}])[0].kind,'skill','source cast hook also owns shock-stun pose');
let live=enqueueSunriseReplay([], [{...b,seq:1,kind:'attack'}],5000,null);assert.equal(live.queue[0].due,5650,'network-fed actions share one stable display clock');
const triple=[0,70,140].map((dt,i)=>({...b,seq:10+i,at:1000+dt,kind:'attack',skill:'sk_elf_triple',damage:1}));live=enqueueSunriseReplay([],triple,5000,null);assert.deepEqual(live.queue.map(x=>x.due),[5650,5720,5790]);const impacts=[];assert.equal(drainCombatPresentation(live.queue,impacts,5650,true)[0].visualPhase,'launch');assert.equal(impacts[0].due,5850);
const replay=fs.readFileSync(path.join(__dirname,'../app/use-combat-replay.ts'),'utf8'),sprite=fs.readFileSync(path.join(__dirname,'../app/combat-sprite.tsx'),'utf8');assert.ok(replay.includes('enqueueSunriseReplay(queue.current'));assert.ok(sprite.includes('useSunrisePlayerMotion('));assert.ok(!sprite.includes('useCastFeedback('));assert.ok(!sprite.includes('useActorMotion('));
console.log(`PASS Afei cadence with pinned Sunrise state-machine differential: ${comparisons} non-hurt action/frame comparisons across five classes and five speeds; reproduced original hurt starvation and verified intentional hurt arbitration; one cast per AoE, MISS, proc exclusion, stable network replay and 70ms/200ms triple timing.`);

