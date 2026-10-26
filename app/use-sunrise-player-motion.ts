'use client';
import {useEffect,useRef,useState} from 'react';
import {emptySunriseClock,triggerSunriseMotion,advanceSunriseMotion,sunriseMotionPose,tickLocalPlayerAttack,SUNRISE_ATTACK_TICK_MS,SUNRISE_PLAYER_FRAME_MS,type LocalAttackInput,type LocalAttackClock,type SunriseTiming,type SunriseAction} from '@/lib/game/sunrise-player-motion';
import type {SunriseCue} from '@/lib/game/sunrise-player-cues';
import type {CastIntent} from '@/lib/game/cast-feedback';
/** Browser-owned normal swings. Spell cues confirm auto-casts and deduplicate
 * manual previews. Neither path applies local HP, rewards or save mutations. */
export function useSunrisePlayerMotion(identity:string,cues:SunriseCue[],timing:SunriseTiming,hp:number,intent:CastIntent|undefined,local:LocalAttackInput){
 const state=useRef(emptySunriseClock()),attackClock=useRef<LocalAttackClock>({elapsed:0,period:timing.attackSeconds}),seen=useRef(new Set<number>()),click=useRef<number|null>(null),previewTimes=useRef(new Set<number>()),previousHp=useRef<number|null>(null),latest=useRef({timing,hp,local});
 const [pose,setPose]=useState<{kind:SunriseAction;frame:number}>({kind:'idle',frame:0});latest.current={timing,hp,local};
 useEffect(()=>{state.current=emptySunriseClock();attackClock.current={elapsed:0,period:latest.current.timing.attackSeconds};seen.current.clear();click.current=null;previewTimes.current.clear();previousHp.current=null;setPose({kind:'idle',frame:0});},[identity]);
 useEffect(()=>{
  if(!intent||click.current===intent.id||hp<=0||document.hidden)return;
  click.current=intent.id;previewTimes.current.add(intent.at);
  if(previewTimes.current.size>32)previewTimes.current.delete(previewTimes.current.values().next().value!);
  state.current=triggerSunriseMotion(state.current,'skill',performance.now(),latest.current.timing);
 },[identity,intent?.id]);
 useEffect(()=>{
  const now=performance.now();
  for(const cue of cues){if(seen.current.has(cue.seq))continue;seen.current.add(cue.seq);
   // Server acknowledgements must never restart a locally triggered swing.
   if(cue.kind==='attack'||document.hidden||hp<=0)continue;
   if(cue.previewAt!==undefined&&previewTimes.current.has(cue.previewAt))continue;
   state.current=triggerSunriseMotion(state.current,cue.kind,now,latest.current.timing);
  }
  if(seen.current.size>640)seen.current=new Set(cues.map(c=>c.seq));
 },[cues,identity]);
 useEffect(()=>{
  const now=performance.now();
  if(hp<=0&&state.current.act!=='death')state.current={act:'death',t:now,pendAtk:false};
  else if(hp>0&&state.current.act==='death')state.current=emptySunriseClock();
  else if(previousHp.current!==null&&hp<previousHp.current&&hp>0)state.current=triggerSunriseMotion(state.current,'hurt',now,latest.current.timing);
  previousHp.current=hp;
 },[hp,identity]);
 useEffect(()=>{
  if(!local.running||!local.hasTarget||local.blocked||hp<=0){
   attackClock.current={elapsed:0,period:latest.current.timing.attackSeconds};
   state.current={...state.current,pendAtk:false,...(state.current.act==='attack'?{act:null}:{})};
  }
 },[identity,local.running,local.hasTarget,local.blocked,hp<=0]);
 useEffect(()=>{
  const playerAttack=(now:number)=>{state.current=triggerSunriseMotion(state.current,'attack',now,latest.current.timing);};
  const attackTimer=setInterval(()=>{
   if(document.hidden)return;
   const current=latest.current,enabled=current.hp>0&&current.local.running&&current.local.hasTarget&&!current.local.blocked;
   const next=tickLocalPlayerAttack(attackClock.current,current.timing.attackSeconds,enabled);attackClock.current=next.clock;
   if(next.attack)playerAttack(performance.now());
  },SUNRISE_ATTACK_TICK_MS);
  const frameTimer=setInterval(()=>{
   if(document.hidden)return;
   const now=performance.now();state.current=advanceSunriseMotion(state.current,now,latest.current.timing);
   const next=sunriseMotionPose(state.current,now,latest.current.timing);setPose(p=>p.kind===next.kind&&p.frame===next.frame?p:next);
  },SUNRISE_PLAYER_FRAME_MS);
  const visibility=()=>{
   // Background time is server-settled; never burst-replay local swings.
   attackClock.current={elapsed:0,period:latest.current.timing.attackSeconds};
   if(state.current.act!=='death')state.current=emptySunriseClock();
  };
  document.addEventListener('visibilitychange',visibility);
  return()=>{clearInterval(attackTimer);clearInterval(frameTimer);document.removeEventListener('visibilitychange',visibility);};
 },[identity]);
 return pose;
}

