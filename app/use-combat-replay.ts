'use client';
import { useEffect,useRef,useState } from 'react';
import type { Character,CombatEvent } from '@/lib/game/engine';
import raw from '@/lib/game/gamedata.json';
import {magicFlightMs,magicEffectLifetime} from '@/lib/game/magic-visuals';
import {baseItem} from '@/lib/game/gear';
import {petSnapshot} from '@/lib/game/engine';
import {replayHasGap,replayFrameExpired} from '@/lib/game/replay-timing';
import { combatSound } from './combat-audio';
import {localHitOwner,allowLocalHit,clearLocalHits,queueLocalHitTargets,syncLocalHitTargets,currentLocalSwing,settleLocalHit} from '@/lib/game/local-hit-sync';
import {applyCombatViewEvent,drainCombatPresentation,enqueueSunriseReplay,prepareCombatHealth,type BattleView,type TimedCombatEvent} from '@/lib/game/combat-presentation';
import {MONSTER_ANCHOR} from './monster-anchor';
export type {BattleView} from '@/lib/game/combat-presentation';
export function useCombatReplay(c:Character|null,sound:boolean){
 const [view,setView]=useState<BattleView>({hp:0,mp:0,arena:[],floats:[]});const latest=useRef(c),soundOn=useRef(sound),owner=useRef(''),zone=useRef(''),seen=useRef(0),queue=useRef<TimedCombatEvent[]>([]),offset=useRef<number|null>(null),impacts=useRef<TimedCombatEvent[]>([]),health=useRef(new Map<string,number>());
 latest.current=c;soundOn.current=sound;
 useEffect(()=>{if(!c)return;const fresh=(c.events||[]).filter(e=>e.seq>seen.current);const reset=owner.current!==c.id||zone.current!==c.zone||fresh.length&&(replayHasGap(fresh,seen.current)||(c.eventSeq||0)-seen.current>160||Date.now()-fresh[0].at>6000)||document.visibilityState==='hidden';
 if(reset){if(owner.current)clearLocalHits(localHitOwner(owner.current,zone.current));owner.current=c.id;zone.current=c.zone;seen.current=c.eventSeq||0;queue.current=[];impacts.current=[];offset.current=null;health.current=new Map((c.arena||[]).map(m=>[m.uid,m.hp]));setView({petEntities:petSnapshot(c,Date.now()),summonEntities:c.summonContract?.entities||[],hp:c.hp,mp:c.mp,target:c.arenaTarget||0,arena:(c.arena||[]).map(m=>({...m})),floats:[]});return;}
 if(fresh.length){queueLocalHitTargets(localHitOwner(c.id,c.zone),fresh);const prepared=enqueueSunriseReplay(queue.current,prepareCombatHealth(fresh,health.current),performance.now(),offset.current);queue.current=prepared.queue;offset.current=prepared.offset;seen.current=c.eventSeq||seen.current;}
 else if(!queue.current.length&&!impacts.current.length){if(!c.running){offset.current=null;}health.current=new Map((c.arena||[]).map(m=>[m.uid,m.hp]));setView(v=>({...v,petEntities:petSnapshot(c,Date.now()),summonEntities:c.summonContract?.entities||[],hp:c.hp,mp:c.mp,target:c.arenaTarget||0,arena:(c.arena||[]).map(m=>({...m}))}));}
 },[c]);
 useEffect(()=>{
  let animation=0;
  let lastCleanup=0;
  let lastFrame:number|null=null;
  let restore=false;
  const pause=()=>{if(document.visibilityState==='hidden'){restore=true;queue.current=[];impacts.current=[];}};
  document.addEventListener('visibilitychange',pause);
  const tick=()=>{
   const now=performance.now();
   if(restore||replayFrameExpired(lastFrame,now)){
    restore=false;queue.current=[];impacts.current=[];offset.current=null;
    const current=latest.current;
    // The dropped queue's swing targets must go too, or the next swing aims at a hit that no longer exists.
    if(current)clearLocalHits(localHitOwner(current.id,current.zone));
    if(current){seen.current=current.eventSeq||0;health.current=new Map((current.arena||[]).map(m=>[m.uid,m.hp]));setView({petEntities:petSnapshot(current,Date.now()),summonEntities:current.summonContract?.entities||[],hp:current.hp,mp:current.mp,target:current.arenaTarget||0,arena:(current.arena||[]).map(m=>({...m})),floats:[]});}
   }
   lastFrame=now;
   const character=latest.current;
   if(character)syncLocalHitTargets(localHitOwner(character.id,character.zone),queue.current);
   const ready=drainCombatPresentation(queue.current,impacts.current,now,!!(raw.items as any)[baseItem(latest.current?.equipment.weapon?.id||'')]?.isBow,event=>{
    const root=document.querySelector('.static-arena'),player=root?.querySelector(event.source==='doll'?'.doll-companion-art':'.character-sprite'),monster=root?.querySelector(`[data-monster-slot="${event.slot}"] ${MONSTER_ANCHOR}`);
    if(!player||!monster)return magicFlightMs(320);
    const p=player.getBoundingClientRect(),m=monster.getBoundingClientRect();
    return magicFlightMs(Math.hypot(m.left+m.width/2-p.left-p.width*.6,m.top+m.height*.55-p.top-p.height*.55));
   },event=>{const current=latest.current;return !current||allowLocalHit(localHitOwner(current.id,current.zone),event.uid,event.seq,now);},event=>{const current=latest.current;if(current)settleLocalHit(localHitOwner(current.id,current.zone),event.seq);});
   for(const next of ready)if(soundOn.current&&latest.current&&now-(next.visualAt??(next as TimedCombatEvent).due??now)<=250)combatSound(latest.current,next);
   // One React update per animation frame, rather than one per attack plus a
   // cleanup update on every 60 FPS frame. Animation still uses rAF.
   const cleanup=now-lastCleanup>=100;
   if(cleanup)lastCleanup=now;
   if(ready.length||cleanup)setView(previous=>{
    let result=previous;
    for(const next of ready)result=applyCombatViewEvent(result,next,now);
    if(cleanup&&(result.actions||[]).some(e=>now-e.shownAt>=5000)||cleanup&&result.floats.some(f=>now-f.shownAt>=800)||cleanup&&(result.casts||[]).some(f=>now-f.shownAt>=magicEffectLifetime(f))){
     result={...result,actions:(result.actions||[]).filter(e=>now-e.shownAt<5000),casts:(result.casts||[]).filter(f=>now-f.shownAt<magicEffectLifetime(f)),floats:result.floats.filter(f=>now-f.shownAt<800)};
    }
    const c=latest.current,swing=c&&currentLocalSwing(localHitOwner(c.id,c.zone)),slot=swing?result.arena.findIndex(m=>m.uid===swing.uid&&m.hp>0):-1;
    if(slot>=0&&result.target!==slot)result={...result,target:slot};
    return result;
   });
   animation=requestAnimationFrame(tick);
  };
  animation=requestAnimationFrame(tick);
  return()=>{cancelAnimationFrame(animation);document.removeEventListener('visibilitychange',pause);};
 },[]);

 return c&&owner.current!==c.id?{petEntities:petSnapshot(c,Date.now()),summonEntities:c.summonContract?.entities||[],hp:c.hp,mp:c.mp,arena:c.arena||[],target:c.arenaTarget||0,floats:[]}:view;
}





