'use client';
import {useEffect,useRef,useState} from 'react';
import {emptySunriseClock,triggerSunriseMotion,advanceSunriseMotion,sunriseMotionPose,tickLocalPlayerAttack,SUNRISE_ATTACK_TICK_MS,SUNRISE_PLAYER_FRAME_MS,type LocalAttackInput,type LocalAttackClock,type SunriseTiming,type SunriseAction} from '@/lib/game/sunrise-player-motion';
import type {SunriseCue} from '@/lib/game/sunrise-player-cues';
import type {CastIntent} from '@/lib/game/cast-feedback';
import {setLocalHitActive,clearLocalHits,recordLocalContact,localContactFrame,beginLocalSwing,type SwingTarget} from '@/lib/game/local-hit-sync';
/** Browser-owned normal swings. Spell cues confirm auto-casts and deduplicate
 * manual previews. Neither path applies local HP, rewards or save mutations. */
export function useSunrisePlayerMotion(identity:string,cues:SunriseCue[],timing:SunriseTiming,hp:number,intent:CastIntent|undefined,local:LocalAttackInput){
 const state=useRef(emptySunriseClock()),attackClock=useRef<LocalAttackClock>({elapsed:0,period:timing.attackSeconds}),seen=useRef(new Set<number>()),click=useRef<number|null>(null),previewTimes=useRef(new Set<number>()),previousHp=useRef<number|null>(null),latest=useRef({timing,hp,local});
 const contact=useRef(-Infinity),swing=useRef<SwingTarget|undefined>(undefined);
 const [pose,setPose]=useState<{kind:SunriseAction;frame:number;targetUid?:string}>({kind:'idle',frame:0});latest.current={timing,hp,local};
 useEffect(()=>{state.current=emptySunriseClock();swing.current=undefined;contact.current=-Infinity;if(latest.current.local.ownerKey)clearLocalHits(latest.current.local.ownerKey);attackClock.current={elapsed:0,period:latest.current.timing.attackSeconds};seen.current.clear();click.current=null;previewTimes.current.clear();previousHp.current=null;setPose({kind:'idle',frame:0});},[identity]);
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
  if(local.ownerKey)setLocalHitActive(local.ownerKey,local.running&&local.hasTarget&&!local.blocked&&hp>0,timing.attackSeconds);
  if(!local.running||!local.hasTarget||local.blocked||hp<=0){
   attackClock.current={elapsed:0,period:latest.current.timing.attackSeconds};
   state.current={...state.current,pendAtk:false,...(state.current.act==='attack'?{act:null}:{})};
  }
 },[identity,local.running,local.hasTarget,local.blocked,hp<=0,timing.attackSeconds]);
 useEffect(()=>{
  const ownerKey=latest.current.local.ownerKey;
  const bindSwing=()=>{const local=latest.current.local;if(local.targetUid)swing.current=local.ownerKey?beginLocalSwing(local.ownerKey,{uid:local.targetUid,slot:local.targetSlot},local.liveTargetUids):{uid:local.targetUid,slot:local.targetSlot};};
  const playerAttack=(now:number)=>{const before=state.current;state.current=triggerSunriseMotion(before,'attack',now,latest.current.timing);if(state.current.act==='attack'&&(before.act!=='attack'||before.t!==state.current.t))bindSwing();};
  const attackTimer=setInterval(()=>{
   if(document.hidden)return;
   const current=latest.current,enabled=current.hp>0&&current.local.running&&current.local.hasTarget&&!current.local.blocked;
   const next=tickLocalPlayerAttack(attackClock.current,current.timing.attackSeconds,enabled);attackClock.current=next.clock;
   if(next.attack)playerAttack(performance.now());
  },SUNRISE_ATTACK_TICK_MS);
  const frameTimer=setInterval(()=>{
   if(document.hidden)return;
   const now=performance.now(),before=state.current;state.current=advanceSunriseMotion(before,now,latest.current.timing);
   if(state.current.act==='attack'&&(before.act!=='attack'||before.t!==state.current.t))bindSwing();
   const next={...sunriseMotionPose(state.current,now,latest.current.timing),targetUid:swing.current?.uid};
   const local=latest.current.local,count=latest.current.timing.counts.attack||1;
   if(local.ownerKey)setLocalHitActive(local.ownerKey,local.running&&local.hasTarget&&!local.blocked&&latest.current.hp>0,latest.current.timing.attackSeconds);
   if(local.ownerKey&&swing.current?.uid&&next.kind==='attack'&&next.frame>=localContactFrame(count,latest.current.timing.attackSeconds)&&contact.current!==state.current.t){
    contact.current=state.current.t;recordLocalContact(local.ownerKey,swing.current.uid,now,swing.current.seq);
   }
   setPose(p=>p.kind===next.kind&&p.frame===next.frame&&p.targetUid===next.targetUid?p:next);
  },SUNRISE_PLAYER_FRAME_MS);
  const visibility=()=>{
   if(ownerKey)clearLocalHits(ownerKey);swing.current=undefined;contact.current=-Infinity;
   if(!document.hidden&&ownerKey){const c=latest.current;setLocalHitActive(ownerKey,c.local.running&&c.local.hasTarget&&!c.local.blocked&&c.hp>0,c.timing.attackSeconds);}
   // Background time is server-settled; never burst-replay local swings.
   attackClock.current={elapsed:0,period:latest.current.timing.attackSeconds};
   if(state.current.act!=='death')state.current=emptySunriseClock();
  };
  document.addEventListener('visibilitychange',visibility);
  return()=>{if(ownerKey)clearLocalHits(ownerKey);clearInterval(attackTimer);clearInterval(frameTimer);document.removeEventListener('visibilitychange',visibility);};
 },[identity]);
 return pose;
}



