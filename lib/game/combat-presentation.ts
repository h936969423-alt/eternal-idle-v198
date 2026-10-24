import {lineageWEffectDefinition} from './lineagew-equipment-effects';
import {mythicProcDefinition} from './lineagew-mythic-procs';
import type {CombatEvent,Encounter,PetSnapshot} from './engine';
import type {SummonEntity} from './summon-system';
import raw from './gamedata.json';
import {TRIPLE_FLIGHT_MS,ARROW_FLIGHT_MS} from './player-sprite-layout';
import {manualReplayOffset,replayOffset,tripleReplayOffset} from './replay-timing';
export type PresentationEvent=CombatEvent&{visualHpDelta?:number};
/** Convert canonical snapshots in server sequence order before sorting by flight time. */
export function prepareCombatHealth(events:CombatEvent[],health:Map<string,number>):PresentationEvent[]{
 return [...events].sort((a,b)=>a.seq-b.seq).map(event=>{
  const e:PresentationEvent={...event};
  if(e.kind==='spawn'&&e.spawn){health.set(e.spawn.uid,e.spawn.hp);return e;}
  if(e.uid&&e.mobHp!==undefined){
   const before=health.get(e.uid);
   e.visualHpDelta=before===undefined?(e.kind==='attack'?-(e.miss?0:e.damage||0):undefined):e.mobHp-before;
   health.set(e.uid,e.mobHp);
  }
  return e;
 });
}
export type CombatFloat=CombatEvent&{shownAt:number;lane:number};
/** Assign a free vertical lane per actor; consecutive hits never reuse a live lane. */
export function addCombatFloat(floats:CombatFloat[],event:CombatEvent,now:number):CombatFloat[]{
 const active=floats.filter(f=>now-f.shownAt<800);
 const key=(e:CombatEvent)=>e.kind==='attack'?`${e.slot}:${e.uid}`:'player';
 const used=new Set(active.filter(f=>key(f)===key(event)).map(f=>f.lane));
 let lane=0;while(used.has(lane))lane++;
 return [...active,{...event,shownAt:now,lane}];
}
/** Preserve normal hit spacing; only compress a substantial backlog, never below its real span by default. */
export function scheduleReplay<T extends CombatEvent&{due:number}>(events:T[],now:number):T[]{
 if(!events.length||events[0].due>=now)return events;
 const first=events[0].due,last=events.at(-1)!.due,span=last-first;
 // Preserve the actual timing between swings across the ~3.5s network poll.
 // Compress only exceptionally large backlogs to avoid burst-then-pause combat.
 const window=Math.min(4000,span);
 return events.map(e=>({...e,due:now+(span>0?(e.due-first)/span*window:0)}));
}

/** Use one clock for animation, HP and damage. After an urgent cast, keep that
 * confirmed live clock instead of rebuilding a buffer in the middle of combat. */
export function enqueueCombatReplay<T extends CombatEvent>(queued:(T&{due:number})[],fresh:T[],now:number,previous:number|null,live=false){
 const manual=fresh.some(e=>e.manual),triple=tripleReplayOffset(fresh,now);
 const pendingTriple=queued.some(e=>e.kind==='attack'&&e.skill==='sk_elf_triple');
 const immediate=manual||triple!==null||pendingTriple||live;
 const offset=manual?manualReplayOffset(fresh,now):triple??((pendingTriple||live)&&previous!==null?previous:replayOffset(fresh,now,previous));
 if(offset===null)return {queue:queued,offset};
 const shifted=queued.map(e=>({...e,due:previous===null?e.due:e.due+offset-previous}));
 const combined=[...shifted,...fresh.map(e=>({...e,due:e.at+offset}))].sort((a,b)=>a.due-b.due||a.seq-b.seq);
 // Re-pacing overdue history here would put the urgent burst at the back again.
 return {queue:immediate?combined:scheduleReplay(combined,now),offset};
}

export type BattleView={healthCredits?:Record<string,number>;actions?:(CombatEvent&{shownAt:number})[];petHurt?:CombatEvent;petEntities?:PetSnapshot[];summonEntities?:SummonEntity[];hp:number;mp:number;arena:Encounter[];target?:number;attack?:CombatEvent;magic?:CombatEvent;hurt?:CombatEvent;casts?:(CombatEvent&{shownAt:number})[];floats:CombatFloat[]};
export type TimedCombatEvent=PresentationEvent&{due:number};
/** Flight deadlines use the display clock and never move with a later network packet. */
export function drainCombatPresentation(queue:TimedCombatEvent[],pending:TimedCombatEvent[],now:number,bow=false){
 const visible:PresentationEvent[]=[];
 while((queue[0]?.due??Infinity)<=now||(pending[0]?.due??Infinity)<=now){
  const impactFirst=!!pending.length&&(!queue.length||pending[0].due<=queue[0].due);
  const next=(impactFirst?pending:queue).shift()!;
  if(!impactFirst&&next.kind==='attack'&&(next.skill==='sk_elf_triple'||next.magicProjectile||bow&&!next.skill&&!next.weaponProc&&(!next.source||next.source==='physical'))){
   const flight=next.skill==='sk_elf_triple'?TRIPLE_FLIGHT_MS:ARROW_FLIGHT_MS;
   pending.push({...next,visualPhase:'impact',visualAt:now+flight,due:now+flight});
   pending.sort((a,b)=>a.due-b.due||a.seq-b.seq);
   visible.push({...next,visualPhase:'launch',visualAt:now});continue;
  }
  // A W weapon proc belongs to its landed arrow, including each individual triple shot.
  if(!impactFirst&&next.weaponProc&&(mythicProcDefinition(next.skill)||lineageWEffectDefinition(next.skill))){
   const parent=pending.find(e=>e.kind==='attack'&&e.visualPhase==='impact'&&!e.weaponProc&&e.uid===next.uid&&e.slot===next.slot&&e.at===next.at);
   if(parent){pending.push({...next,visualAt:parent.due,due:parent.due});pending.sort((a,b)=>a.due-b.due||a.seq-b.seq);continue;}
  }
  if(next.kind==='loot'||next.kind==='spawn'){
   const waiting=[...pending,...queue].filter(e=>e.kind==='attack'&&e.seq<next.seq&&(next.kind==='spawn'?e.slot===next.slot:e.uid===next.uid));
   if(waiting.length){
    const due=Math.max(...waiting.map(e=>e.due+(e.visualPhase==='impact'?0:e.skill==='sk_elf_triple'?TRIPLE_FLIGHT_MS:bow?ARROW_FLIGHT_MS:0)),now+1);
    queue.push({...next,due});queue.sort((a,b)=>a.due-b.due||a.seq-b.seq);continue;
   }
  }
  visible.push(next);
 }
 return visible;
}
export function applyCombatViewEvent(v:BattleView,next:PresentationEvent,now:number):BattleView{
 const staged=!!next.visualPhase;
 if(staged&&(next.slot===undefined||v.arena[next.slot]?.uid!==next.uid))return v;
 const actions=[...(v.actions||[]).filter(e=>now-e.shownAt<5000),{...next,shownAt:now}];
 if(next.visualPhase==='launch')return {...v,actions,hp:next.skill==='sk_elf_triple'?v.hp:next.hp,mp:next.skill==='sk_elf_triple'?v.mp:next.mp,attack:next,target:next.target??v.target};
 const arena=v.arena.map(m=>({...m})),healthCredits={...v.healthCredits};
 const updateHp=(slot:number)=>{const m=arena[slot];if(!m||m.uid!==next.uid||next.mobHp===undefined)return;
  const delta=next.visualHpDelta??(next.kind==='attack'?-(next.miss?0:next.damage||0):undefined);
  const hp=delta===undefined?next.mobHp:m.hp+(healthCredits[m.uid]||0)+delta;
  // Recovery can arrive before an older arrow. Retain its capped credit until impact.
  const overflow=Math.max(0,hp-(m.maxHp??Infinity));
  if(overflow)healthCredits[m.uid]=overflow;else delete healthCredits[m.uid];
  m.hp=Math.max(0,Math.min(m.maxHp??Infinity,hp));
 };
 if(next.casterSlot!==undefined&&arena[next.casterSlot]?.uid===next.uid){updateHp(next.casterSlot);if(next.monsterMp!==undefined)arena[next.casterSlot].mp=next.monsterMp;}
 if(next.kind==='spawn'&&next.slot!==undefined&&next.spawn){if(arena[next.slot])delete healthCredits[arena[next.slot].uid];arena[next.slot]={...next.spawn};}
 if(next.kind==='attack'&&next.slot!==undefined&&next.slot!==next.casterSlot)updateHp(next.slot);
 if(next.slot!==undefined&&arena[next.slot]?.uid===next.uid&&next.targetEffects)arena[next.slot].effects=next.targetEffects;
 return {healthCredits,actions,petHurt:next.petUid&&next.source==='monster'?next:v.petHurt,petEntities:next.petEntities||v.petEntities,summonEntities:next.summonEntities||v.summonEntities,hp:staged?v.hp:next.hp,mp:staged?v.mp:next.mp,arena,target:next.target??v.target,attack:next.kind==='attack'&&next.visualPhase!=='impact'?next:v.attack,magic:next.kind==='magic'?next:v.magic,hurt:next.kind==='hurt'?next:v.hurt,casts:[...(v.casts||[]).filter(f=>now-f.shownAt<2000),...(!staged&&((next.weaponProc&&!!lineageWEffectDefinition(next.skill))||(next.kind==='magic'&&(next.source==='monster'||next.slot!==undefined||!next.skill||(raw.skills as any)[next.skill]?.type!=='atk'))||(next.kind==='attack'&&next.skill&&!next.miss&&next.source!=='poison'&&next.source!=='summon'))?[{...next,shownAt:now}]:[])],floats:['attack','hurt','heal'].includes(next.kind)?addCombatFloat(v.floats,next,now):v.floats.filter(f=>now-f.shownAt<800)};
}
