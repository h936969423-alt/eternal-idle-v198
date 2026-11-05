'use client';
import {useEffect,useMemo,useState} from 'react';
import {monsterWalk} from '@/lib/game/field-walk';
import type {CombatEvent} from '@/lib/game/engine';
import {monsterCues} from '@/lib/game/animation-cues';
import {SequenceSprite} from './sequence-sprite';
export default function MonsterMotion({name,src,uid,hp,actions,direction=6}:{name:string;src:string;uid:string;hp:number;actions:CombatEvent[];direction?:number}){const cues=useMemo(()=>monsterCues(actions,uid),[actions,uid]),[walking,setWalking]=useState(false);useEffect(()=>{if(hp<=0){setWalking(false);return;}const timer=setInterval(()=>setWalking(monsterWalk(uid,Date.now()).moving),250);return()=>clearInterval(timer);},[uid,hp>0]);return <SequenceSprite key={uid} walking={walking} showShadow={false} name={name} identity={uid} cues={cues} dead={hp<=0} direction={direction} fallback={src} stationary/>;}
