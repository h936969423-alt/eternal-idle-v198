import {lineageWEffectDefinition} from './lineagew-equipment-effects';
import {mythicProcDefinition} from './lineagew-mythic-procs';
import type {CombatEvent,Encounter,PetSnapshot} from './engine';
import type {SummonEntity} from './summon-system';
import raw from './gamedata.json';
import {isFlyingMagic,magicFlightMs,magicEffectLifetime} from './magic-visuals';
import {TRIPLE_FLIGHT_MS,ARROW_FLIGHT_MS} from './player-sprite-layout';
import {manualReplayOffset,replayOffset,tripleReplayOffset,REPLAY_MAX_AHEAD_MS} from './replay-timing';
export type PresentationEvent=CombatEvent&{visualHpDelta?:number;visualOnly?:boolean};
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
 const key=(e:CombatEvent)=>e.kind==='attack'?`slot:${e.slot}`:'player';
 const used=new Set(active.filter(f=>key(f)===key(event)).map(f=>f.lane));
 let lane=0;while(used.has(lane))lane++;
 return [...active,{...event,shownAt:now,lane}];
}
/** Pace overdue history within the same 1500ms horizon as the network buffer.
 * This schedules launches only; already flying arrows retain their impact clock.
 */
export function scheduleReplay<T extends CombatEvent&{due:number}>(events:T[],now:number):T[]{
 if(!events.length)return events;
 const first=events[0].due,last=events.at(-1)!.due,span=last-first;
 if(first>=now&&last<=now+REPLAY_MAX_AHEAD_MS)return events;
 const start=Math.min(now+REPLAY_MAX_AHEAD_MS,Math.max(now,first));
 const window=Math.min(Math.max(0,now+REPLAY_MAX_AHEAD_MS-start),span);
 return events.map(e=>({...e,due:start+(span>0?(e.due-first)/span*window:0)}));
}

/** Keep the ordinary buffered clock across urgent casts. Only the confirmed
 * urgent history bypasses the buffer; it must not put all future combat into
 * arrival-time playback. Already queued launches retain their deadlines.
 */
export function enqueueCombatReplay<T extends CombatEvent>(queued:(T&{due:number})[],fresh:T[],now:number,previous:number|null,_live=false){
 const manual=fresh.some(e=>e.manual),triple=tripleReplayOffset(fresh,now);
 const urgentOffset=manual?manualReplayOffset(fresh,now):triple;
 const urgentSeq=urgentOffset!==null?Math.max(...fresh.filter(e=>manual?e.manual:e.skill==='sk_elf_triple').map(e=>e.seq)):-Infinity;
 const normal=fresh.filter(e=>e.seq>urgentSeq);
 const offset=normal.length?replayOffset(normal,now,previous):previous??replayOffset(fresh,now,null);
 if(offset===null)return {queue:queued,offset};
 const known=new Set(queued.map(e=>e.seq));
 const unique=fresh.filter(e=>{if(known.has(e.seq))return false;known.add(e.seq);return true;});
 // Historical state before an urgent cast must be applied first. Never shift
 // another arrow's deadline when a subsequent state/poll response arrives.
 const carried=queued.map(e=>urgentOffset!==null&&e.seq<urgentSeq?{...e,due:Math.min(now,e.due)}:e);
 const added=unique.map(e=>({...e,due:e.at+(urgentOffset!==null&&e.seq<=urgentSeq?urgentOffset:offset)}));
 return {queue:[...carried,...(urgentOffset===null?scheduleReplay(added,now):added)].sort((a,b)=>a.due-b.due||a.seq-b.seq),offset};
}

export type BattleView={healthCredits?:Record<string,number>;actions?:(CombatEvent&{shownAt:number})[];petHurt?:CombatEvent;petEntities?:PetSnapshot[];summonEntities?:SummonEntity[];hp:number;mp:number;arena:Encounter[];target?:number;attack?:CombatEvent;magic?:CombatEvent;hurt?:CombatEvent;casts?:(CombatEvent&{shownAt:number})[];floats:CombatFloat[]};
export type TimedCombatEvent=PresentationEvent&{due:number};
/** Flight deadlines use the display clock and never move with a later network packet. */
export function drainCombatPresentation(queue:TimedCombatEvent[],pending:TimedCombatEvent[],now:number,bow=false,spellFlight?:(event:CombatEvent)=>number,allowPhysical?:(event:CombatEvent)=>boolean){
 const visible:PresentationEvent[]=[];
 const flightFor=(event:CombatEvent)=>isFlyingMagic(event)?Math.max(140,Math.min(380,spellFlight?.(event)??magicFlightMs(320))):event.skill==='sk_elf_triple'?TRIPLE_FLIGHT_MS:ARROW_FLIGHT_MS;
 while((queue[0]?.due??Infinity)<=now||(pending[0]?.due??Infinity)<=now){
  const impactFirst=!!pending.length&&(!queue.length||pending[0].due<=queue[0].due);
  const next=(impactFirst?pending:queue).shift()!;
  const normal=next.kind==='attack'&&!next.skill&&!next.weaponProc&&(!next.source||next.source==='physical');
  if(!impactFirst&&normal&&allowPhysical){
   const earlier=queue.find(e=>e.seq<next.seq&&e.uid===next.uid&&e.kind==='attack'&&!e.skill&&!e.weaponProc&&(!e.source||e.source==='physical'));
   if(earlier){queue.push({...next,due:Math.max(now+16,earlier.due)});queue.sort((a,b)=>a.due-b.due||a.seq-b.seq);continue;}
   if(!allowPhysical(next)){queue.push({...next,due:now+16});queue.sort((a,b)=>a.due-b.due||a.seq-b.seq);continue;}
   next.visualAt=now;
  }
  // A weapon proc cannot overtake the normal hit waiting for its visible contact.
  if(!impactFirst&&next.weaponProc&&allowPhysical){
   const parent=queue.find(e=>e.kind==='attack'&&!e.skill&&!e.weaponProc&&e.uid===next.uid&&e.at===next.at);
   if(parent){queue.push({...next,due:Math.max(now+16,parent.due)});queue.sort((a,b)=>a.due-b.due||a.seq-b.seq);continue;}
  }
  if(!impactFirst&&next.kind==='attack'&&(isFlyingMagic(next)||next.skill==='sk_elf_triple'||next.magicProjectile||bow&&!next.skill&&!next.weaponProc&&(!next.source||next.source==='physical'))){
   const flight=flightFor(next);
   pending.push({...next,visualPhase:'impact',visualAt:now+flight,visualFlightMs:flight,due:now+flight});
   pending.sort((a,b)=>a.due-b.due||a.seq-b.seq);
   visible.push({...next,visualPhase:'launch',visualAt:now,visualFlightMs:flight});continue;
  }
  // A W weapon proc belongs to its landed arrow, including each individual triple shot.
  if(!impactFirst&&next.weaponProc&&(mythicProcDefinition(next.skill)||lineageWEffectDefinition(next.skill))){
   const parent=pending.find(e=>e.kind==='attack'&&e.visualPhase==='impact'&&!e.weaponProc&&e.uid===next.uid&&e.slot===next.slot&&e.at===next.at);
   if(parent){pending.push({...next,visualAt:parent.due,due:parent.due});pending.sort((a,b)=>a.due-b.due||a.seq-b.seq);continue;}
  }
  if(next.kind==='loot'||next.kind==='spawn'){
   const waiting=[...pending,...queue].filter(e=>e.kind==='attack'&&e.seq<next.seq&&(next.kind==='spawn'?e.slot===next.slot:e.uid===next.uid));
   if(waiting.length){
    const due=Math.max(...waiting.map(e=>e.due+(e.visualPhase==='impact'?0:isFlyingMagic(e)||e.skill==='sk_elf_triple'||bow?flightFor(e):0)),now+1);
    queue.push({...next,due});queue.sort((a,b)=>a.due-b.due||a.seq-b.seq);continue;
   }
  }
  visible.push(next);
 }
 return visible;
}
/** Damage and status events from one spell share a visual, per target.
 * Keep independent actors, weapon procs, AoE targets and triple releases separate.
 */
function hasSpellVisual(view:BattleView,event:CombatEvent){
 const actor=(e:CombatEvent)=>['monster','pet','summon','doll'].includes(e.source||'')?e.source:'player';
 return !!event.skill&&(view.casts||[]).some(e=>e.skill===event.skill&&e.at===event.at&&e.uid===event.uid&&e.slot===event.slot&&!!e.weaponProc===!!event.weaponProc&&actor(e)===actor(event)&&e.petUid===event.petUid&&e.summonUid===event.summonUid&&e.dollId===event.dollId);
}
export function applyCombatViewEvent(v:BattleView,next:PresentationEvent,now:number):BattleView{
 if(next.visualOnly){
  const result=applyCombatViewEvent(v,{...next,visualOnly:false,hp:v.hp,mp:v.mp,visualHpDelta:undefined,mobHp:undefined,targetEffects:undefined},now);
  return {...v,actions:result.actions,casts:result.casts,floats:result.floats};
 }
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
 return {healthCredits,actions,petHurt:next.petUid&&next.source==='monster'?next:v.petHurt,petEntities:next.petEntities||v.petEntities,summonEntities:next.summonEntities||v.summonEntities,hp:staged?v.hp:next.hp,mp:staged?v.mp:next.mp,arena,target:next.target??v.target,attack:next.kind==='attack'&&next.visualPhase!=='impact'?next:v.attack,magic:next.kind==='magic'?next:v.magic,hurt:next.kind==='hurt'?next:v.hurt,casts:[...(v.casts||[]).filter(f=>now-f.shownAt<magicEffectLifetime(f)),...(!staged&&!next.visualEffectPreviewed&&!next.miss&&!hasSpellVisual(v,next)&&(next.skill!=='sk_shock_stun'||next.kind==='magic'&&next.effect==='狀態命中')&&((next.weaponProc&&!!lineageWEffectDefinition(next.skill))||(next.kind==='magic'&&(next.source==='monster'||next.slot!==undefined||!next.skill||(raw.skills as any)[next.skill]?.type!=='atk'))||(next.kind==='attack'&&next.skill&&!next.miss&&next.source!=='poison'&&next.source!=='summon'))?[{...next,shownAt:now}]:[])],floats:(['attack','hurt','heal'].includes(next.kind)||(next.kind==='state'&&next.skill==='sk_shock_stun'&&next.effect==='衝暈失敗'&&!next.visualEffectPreviewed))?addCombatFloat(v.floats,next,now):v.floats.filter(f=>now-f.shownAt<800)};
}






/** A network-fed game needs one stable server-to-display clock. Never rebase
 * each packet or flush queued swings when a manual spell is acknowledged.
 * Confirmed manual control feedback can display immediately without advancing
 * HP, damage, drops or the ordinary attack timeline.
 */
export function enqueueSunriseReplay<T extends PresentationEvent>(queued:(T&{due:number})[],fresh:T[],now:number,previous:number|null){
 if(!fresh.length)return {queue:queued,offset:previous};
 const known=new Set(queued.map(e=>e.seq));
 const unique=fresh.filter(e=>{if(known.has(e.seq))return false;known.add(e.seq);return true;});
 if(!unique.length)return {queue:queued,offset:previous};
 const offset=previous??replayOffset(unique,now,null)!;
 const early=unique.filter(e=>e.manual&&!e.visualEffectPreviewed&&(
  e.kind==='magic'&&e.skill&&(e.skill!=='sk_shock_stun'||e.effect==='狀態命中')||
  e.kind==='state'&&e.skill==='sk_shock_stun'&&e.effect==='衝暈失敗'));
 const earlySeq=new Set(early.map(e=>e.seq));
 return {queue:[...queued,...early.map(e=>({...e,visualOnly:true,due:now})),...unique.map(e=>({...e,...(earlySeq.has(e.seq)?{visualEffectPreviewed:true}:{}),due:e.at+offset}))].sort((a,b)=>a.due-b.due||a.seq-b.seq),offset};
}

