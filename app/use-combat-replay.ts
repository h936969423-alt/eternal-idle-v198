'use client';
import { useEffect,useRef,useState } from 'react';
import type { Character,CombatEvent } from '@/lib/game/engine';
import raw from '@/lib/game/gamedata.json';
import {baseItem} from '@/lib/game/gear';
import {petSnapshot} from '@/lib/game/engine';
import {replayHasGap} from '@/lib/game/replay-timing';
import { combatSound } from './combat-audio';
import {applyCombatViewEvent,drainCombatPresentation,enqueueCombatReplay,prepareCombatHealth,type BattleView,type TimedCombatEvent} from '@/lib/game/combat-presentation';
export type {BattleView} from '@/lib/game/combat-presentation';
export function useCombatReplay(c:Character|null,sound:boolean){
 const [view,setView]=useState<BattleView>({hp:0,mp:0,arena:[],floats:[]});const latest=useRef(c),soundOn=useRef(sound),owner=useRef(''),zone=useRef(''),seen=useRef(0),queue=useRef<TimedCombatEvent[]>([]),offset=useRef<number|null>(null),impacts=useRef<TimedCombatEvent[]>([]),health=useRef(new Map<string,number>()),live=useRef(false);
 latest.current=c;soundOn.current=sound;
 useEffect(()=>{if(!c)return;const fresh=(c.events||[]).filter(e=>e.seq>seen.current);const reset=owner.current!==c.id||zone.current!==c.zone||fresh.length&&(replayHasGap(fresh,seen.current)||(c.eventSeq||0)-seen.current>160||Date.now()-fresh[0].at>6000)||document.visibilityState==='hidden';
 if(reset){owner.current=c.id;zone.current=c.zone;seen.current=c.eventSeq||0;queue.current=[];impacts.current=[];offset.current=null;live.current=false;health.current=new Map((c.arena||[]).map(m=>[m.uid,m.hp]));setView({petEntities:petSnapshot(c,Date.now()),summonEntities:c.summonContract?.entities||[],hp:c.hp,mp:c.mp,target:c.arenaTarget||0,arena:(c.arena||[]).map(m=>({...m})),floats:[]});return;}
 if(fresh.length){if(fresh.some(e=>e.manual||e.kind==='attack'&&e.skill==='sk_elf_triple'))live.current=true;const prepared=enqueueCombatReplay(queue.current,prepareCombatHealth(fresh,health.current),performance.now(),offset.current,live.current);queue.current=prepared.queue;offset.current=prepared.offset;seen.current=c.eventSeq||seen.current;}
 else if(!queue.current.length&&!impacts.current.length){if(!c.running){live.current=false;offset.current=null;}health.current=new Map((c.arena||[]).map(m=>[m.uid,m.hp]));setView(v=>({...v,petEntities:petSnapshot(c,Date.now()),summonEntities:c.summonContract?.entities||[],hp:c.hp,mp:c.mp,target:c.arenaTarget||0,arena:(c.arena||[]).map(m=>({...m}))}));}
 },[c]);
 useEffect(()=>{let animation=0;const tick=()=>{const now=performance.now();for(const next of drainCombatPresentation(queue.current,impacts.current,now,!!(raw.items as any)[baseItem(latest.current?.equipment.weapon?.id||'')]?.ranged)){if(soundOn.current&&latest.current&&now-(next.visualAt??(next as TimedCombatEvent).due??now)<=250)combatSound(latest.current,next);setView(v=>applyCombatViewEvent(v,next,now));}setView(v=>(v.actions||[]).some(e=>now-e.shownAt>=5000)||v.floats.some(f=>now-f.shownAt>=800)||(v.casts||[]).some(f=>now-f.shownAt>=2000)?{...v,actions:(v.actions||[]).filter(e=>now-e.shownAt<5000),casts:(v.casts||[]).filter(f=>now-f.shownAt<2000),floats:v.floats.filter(f=>now-f.shownAt<800)}:v);animation=requestAnimationFrame(tick);};animation=requestAnimationFrame(tick);return()=>cancelAnimationFrame(animation);},[]);
 return c&&owner.current!==c.id?{petEntities:petSnapshot(c,Date.now()),summonEntities:c.summonContract?.entities||[],hp:c.hp,mp:c.mp,arena:c.arena||[],target:c.arenaTarget||0,floats:[]}:view;
}
