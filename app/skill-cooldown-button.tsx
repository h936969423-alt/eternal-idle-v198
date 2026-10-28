'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {skillCooldownMs,skillReadyAt,cooldownSeconds,remainingCooldownSeconds} from '@/lib/game/skill-cooldown';
import type {Character} from '@/lib/game/engine';
import './skill-cooldown-button.css';
export default function SkillCooldownButton({c,stats,id,label,mp,icon,busy,pending,serverOffset,onCast,title}:{c:Character;stats:Record<string,number>;id:string;label:string;mp:number;icon:ReactNode;busy:boolean;pending:boolean;serverOffset:number;onCast:()=>Promise<unknown>;title:string}){
 const [clock,setClock]=useState(Date.now()),[attemptAt,setAttemptAt]=useState<number|null>(null),sending=useRef(false);
 useEffect(()=>{const timer=setInterval(()=>setClock(Date.now()),100);return()=>clearInterval(timer);},[]);
 const now=clock+serverOffset,duration=skillCooldownMs(c,id,stats,now),remaining=Math.max(0,skillReadyAt(c,id)-now,attemptAt===null?0:attemptAt+duration-now),locked=remaining>0;
 return <button className={`skill-cooldown-button ${locked?'skill-is-cooling':''}`} aria-busy={pending||attemptAt!==null} disabled={busy||locked||attemptAt!==null} title={title} onClick={async()=>{if(sending.current||skillReadyAt(c,id)>Date.now()+serverOffset)return;sending.current=true;setAttemptAt(Date.now()+serverOffset);setClock(Date.now());try{await onCast();}finally{sending.current=false;setAttemptAt(null);setClock(Date.now());}}}>{icon}<span>{label}<small>{pending||attemptAt!==null?'施放中…':`魔力 ${mp}`}</small><small className="skill-cooldown-seconds">{locked?`剩餘 ${remainingCooldownSeconds(remaining)} 秒`:`冷卻 ${cooldownSeconds(duration)} 秒`}</small></span></button>;
}
