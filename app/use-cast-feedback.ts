'use client';
import {useEffect,useState} from 'react';
import {castFeedbackPose,type CastIntent} from '@/lib/game/cast-feedback';
export function useCastFeedback(intent:CastIntent|undefined,characterId:string,count:number,castInterval:number,dead=false){
 const [clock,setClock]=useState(0);
 useEffect(()=>{
  if(!intent)return;
  let raf=0,last=-1;
  const tick=(now:number)=>{const pose=castFeedbackPose(intent,characterId,now,count,castInterval,dead),frame=pose?.frame??-1;if(frame!==last||!pose){last=frame;setClock(now);}if(pose)raf=requestAnimationFrame(tick);};
  raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf);
 },[intent,characterId,count,castInterval,dead]);
 return castFeedbackPose(intent,characterId,Math.max(clock,intent?.at??0),count,castInterval,dead);
}
