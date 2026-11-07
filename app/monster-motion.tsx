'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import type {CombatEvent} from '@/lib/game/engine';
import {monsterCues} from '@/lib/game/animation-cues';
import {SequenceSprite} from './sequence-sprite';

export default function MonsterMotion({name,src,uid,hp,actions,direction=6}:{name:string;src:string;uid:string;hp:number;actions:CombatEvent[];direction?:number}){
 const host=useRef<HTMLSpanElement>(null);
 const cues=useMemo(()=>monsterCues(actions,uid),[actions,uid]);
 const [walk,setWalk]=useState({moving:false,distance:0,direction});
 useEffect(()=>{
  let frame=0;
  const tick=()=>{
   const actor=host.current?.closest<HTMLElement>('.four-monster');
   const moving=hp>0&&actor?.dataset.gridMoving==='true';
   const distance=Number(actor?.dataset.gridDistance)||0;
   const facing=actor?.dataset.gridDirection===undefined?direction:Number(actor.dataset.gridDirection);
   setWalk(old=>old.moving===moving&&old.distance===distance&&old.direction===facing?old:{moving,distance,direction:facing});
   frame=requestAnimationFrame(tick);
  };
  frame=requestAnimationFrame(tick);
  return()=>cancelAnimationFrame(frame);
 },[uid,hp>0,direction]);
 return <SequenceSprite motionRef={host} key={uid} walking={walk.moving} walkDistance={walk.distance} showShadow={false} name={name} identity={uid} cues={cues} dead={hp<=0} direction={walk.direction} fallback={src} stationary/>;
}
