'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import type {CombatEvent} from '@/lib/game/engine';
import {monsterCues} from '@/lib/game/animation-cues';
import {SequenceSprite} from './sequence-sprite';
export default function MonsterMotion({name,src,uid,hp,actions,direction=6}:{name:string;src:string;uid:string;hp:number;actions:CombatEvent[];direction?:number}){const host=useRef<HTMLSpanElement>(null),cues=useMemo(()=>monsterCues(actions,uid),[actions,uid]),[walking,setWalking]=useState(false),[,setWalkTick]=useState(0);useEffect(()=>{if(hp<=0){setWalking(false);return;}const timer=setInterval(()=>setWalking(host.current?.closest<HTMLElement>('.four-monster')?.dataset.gridMoving==='true'),80);return()=>clearInterval(timer);},[uid,hp>0]);useEffect(()=>{if(!walking)return;const timer=setInterval(()=>setWalkTick(tick=>tick+1),125);return()=>clearInterval(timer);},[walking]);return <span ref={host} style={{display:"contents"}}><SequenceSprite key={uid} walking={walking} showShadow={false} name={name} identity={uid} cues={cues} dead={hp<=0} direction={direction} fallback={src} stationary/></span>;}
