'use client';
import {useMemo} from 'react';
import type {CombatEvent} from '@/lib/game/engine';
import {monsterCues} from '@/lib/game/animation-cues';
import {SequenceSprite} from './sequence-sprite';
export default function MonsterMotion({name,src,uid,hp,actions,direction=6}:{name:string;src:string;uid:string;hp:number;actions:CombatEvent[];direction?:number}){const cues=useMemo(()=>monsterCues(actions,uid),[actions,uid]);return <SequenceSprite key={uid} showShadow={false} name={name} identity={uid} cues={cues} dead={hp<=0} direction={direction} fallback={src} stationary/>;}
