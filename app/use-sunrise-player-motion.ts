'use client';
import {useEffect,useRef,useState} from 'react';
import {emptySunriseClock,triggerSunriseMotion,advanceSunriseMotion,sunriseMotionPose,type SunriseTiming,type SunriseAction} from '@/lib/game/sunrise-player-motion';
import type {SunriseCue} from '@/lib/game/sunrise-player-cues';
import type {CastIntent} from '@/lib/game/cast-feedback';
/** A single player animation owner: clicks and confirmed actions never race
 * through two independent hooks. No local action awards damage or rewards.
 */
export function useSunrisePlayerMotion(identity:string,cues:SunriseCue[],timing:SunriseTiming,hp:number,intent?:CastIntent){
 const state=useRef(emptySunriseClock()),seen=useRef(new Set<number>()),click=useRef<number|null>(null),previewTimes=useRef(new Set<number>()),previousHp=useRef<number|null>(null),latest=useRef(timing);
 const [pose,setPose]=useState<{kind:SunriseAction;frame:number}>({kind:'idle',frame:0});latest.current=timing;
 useEffect(()=>{state.current=emptySunriseClock();seen.current.clear();click.current=null;previewTimes.current.clear();previousHp.current=null;setPose({kind:'idle',frame:0});},[identity]);
 useEffect(()=>{
  if(!intent||click.current===intent.id||hp<=0)return;
  click.current=intent.id;previewTimes.current.add(intent.at);
  if(previewTimes.current.size>32)previewTimes.current.delete(previewTimes.current.values().next().value!);
  state.current=triggerSunriseMotion(state.current,'skill',performance.now(),latest.current);
 },[identity,intent?.id]);
 useEffect(()=>{
  const now=performance.now();
  for(const cue of cues){if(seen.current.has(cue.seq))continue;seen.current.add(cue.seq);
   if(cue.previewAt!==undefined&&previewTimes.current.has(cue.previewAt))continue;
   state.current=triggerSunriseMotion(state.current,cue.kind,now,latest.current);
  }
  if(seen.current.size>640)seen.current=new Set(cues.map(c=>c.seq));
 },[cues,identity]);
 useEffect(()=>{
  const now=performance.now();
  if(hp<=0&&state.current.act!=='death')state.current={act:'death',t:now,pendAtk:false};
  else if(hp>0&&state.current.act==='death')state.current=emptySunriseClock();
  else if(previousHp.current!==null&&hp<previousHp.current&&hp>0)state.current=triggerSunriseMotion(state.current,'hurt',now,latest.current);
  previousHp.current=hp;
 },[hp,identity]);
 useEffect(()=>{let raf=0;const tick=(now:number)=>{state.current=advanceSunriseMotion(state.current,now,latest.current);const next=sunriseMotionPose(state.current,now,latest.current);setPose(p=>p.kind===next.kind&&p.frame===next.frame?p:next);raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf);},[identity]);
 return pose;
}
